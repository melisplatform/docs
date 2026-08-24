# MelisCmsComments

> Système de commentaires pour les articles News et Blog — modération, workflow d'approbation optionnel par article, plugin front office "Post comments" et widget de tableau de bord. En v6, l'interface de modération devient un onglet **Comments** dans l'éditeur React News/Blog. Package `melisplatform/melis-cms-comments`.

## Présentation

MelisCmsComments associe un système de commentaires aux articles **MelisCmsNews** et **MelisCmsBlog**. Il fournit
le backend des commentaires (table `melis_cms_comments` + `MelisCmsCommentsService`), un plugin de gabarit
front office (liste de commentaires + formulaire "laisser un commentaire"), un workflow de **validation**
par article qui maintient les commentaires du front office en attente jusqu'à leur approbation par un
administrateur, et un widget de tableau de bord **Latest comments**. Combiné avec **MelisCmsUserAccount**,
les commentaires peuvent être réservés aux comptes connectés du site.

Dans le back-office React (`/melis-react`), ce module ne fournit **aucune brique qui lui soit propre** — pas de `ui-react/`,
pas de `react-api.php`, pas de `react.capabilities.php`. C'est un module **backend + contribution** avec trois
surfaces détenues par les modules hôtes :

1. un **onglet de modération Comments** à l'intérieur de l'éditeur News/Blog — l'interface React de l'onglet et ses
   endpoints `/comments…` sont **détenus par les briques News et Blog**, qui délèguent au service de ce module ;
2. un **plugin de page front office "Post comments"** déposé et configuré dans l'éditeur de page CMS React ;
3. un **widget de tableau de bord "Latest comments"** — un plugin de tableau de bord **PHP/phtml legacy** rendu à l'intérieur
   de l'hôte de widgets du tableau de bord React (aucune réécriture React).

## Activation

Ajouter dans `config/melis.module.load.php` :

```php
return [
    'MelisCmsComments',
];
```

Dépendances Composer : `melis-core ^6.0` et `melis-cms ^6.0`. Nécessite fonctionnellement au moins un module
d'articles — **MelisCmsNews** ou **MelisCmsBlog** — pour être utile. **MelisCmsUserAccount** est une intégration
optionnelle pour les commentaires réservés aux comptes. Toutes les surfaces sont conditionnées à l'activation : lorsque le module est absent,
les endpoints de commentaires News/Blog renvoient **404** et le panneau de modération se masque lui-même.

## Services principaux

| Alias de service | Rôle |
| --- | --- |
| `MelisCmsCommentsService` | Service principal CRUD/modération (étend `MelisEngineGeneralService`). Déclenche des paires d'événements `*_start`/`*_end` sur chaque méthode. Appelé par les contrôleurs react-api News/Blog. |

Méthodes clés de `MelisCmsCommentsService` :

```php
$svc = $sm->get('MelisCmsCommentsService');

// Create or update a comment (BO comments are approved immediately)
$id = $svc->saveComment($text, $postId, $commentId, 'NEWS', $name, $authorId, 'front');

// Fetch a single comment
$comment = $svc->getCommentById($id);

// Front-office list for a post (ordered)
$list = $svc->getCommentsByPostId($postId, 'BLOG', 'mccom_date_creation', 'DESC');

// Back-office query — omit 'validated' to return pending + approved + refused
$rows = $svc->getComments([
    'postType'     => 'NEWS',
    'postId'       => $postId,
    'withUserInfo' => true,
    'limit'        => 10,
]);

// Moderation
$svc->approveComment($id);          // mccom_validated=1, status=1 (shown)
$svc->refuseComment($id);           // mccom_validated=2, status=0 (hidden)
$svc->deleteCommentById($id);

// Cascade-delete when a post is removed
$svc->deletePostComments('NEWS', $postId);
```

`saveComment()` lit le flag `c{type}_validate_comments` de l'article : lorsqu'il est activé et que le commentaire provient
du front office, il est enregistré en attente (`validated=0`) ; les commentaires back-office sont immédiatement enregistrés
comme approuvés. Tout le texte enregistré passe par **HTMLPurifier 4.12** pour la protection XSS.

## Onglet de modération des commentaires (React, détenu par News/Blog)

Ouvrez un article News ou un article Blog dans l'éditeur et basculez sur l'onglet **Comments**. Il liste les
commentaires de cet article avec, par ligne, un **indicateur de statut** (bleu = en attente, vert = affiché, rouge = refusé),
l'auteur, le texte du commentaire et l'heure, une boîte en ligne **Name + write-a-comment + Add a comment** pour
en publier un directement, et par ligne les actions **approuver / refuser / supprimer** (approuver/refuser n'apparaissent que
lorsque la validation est activée pour l'article).

![L'onglet Comments de l'éditeur News React : un panneau COMMENTS avec un champ Name en ligne, une boîte « Write a comment… » et un bouton rouge + Add a comment, puis une ligne de commentaire avec un indicateur de statut, le texte du commentaire et les icônes d'action refuser/supprimer](/screenshots/react/melis-cms-comments/meliscmscomments-tooloverride-news-edit-tab-comments.png)

Le composant React de l'onglet appartient aux **briques News/Blog**, et non à ce module. Il n'y a **pas de
`react-api.php` dans MelisCmsComments** — les commentaires sont exposés via la react-api propre aux modules News et Blog,
qui délègue chaque opération à `MelisCmsCommentsService` :

| Méthode et URL | Contrôleur / action propriétaire | Rôle |
| --- | --- | --- |
| `GET /melis/react-api/news/:id/comments` | `MelisCmsNewsReactApiController::commentsAction` | Tous les commentaires (tous statuts) d'un article news |
| `POST /melis/react-api/news/comments/save` | `commentSaveAction` | Créer/modifier un commentaire (BO → approuvé) |
| `POST /melis/react-api/news/comments/approve/:cid` | `commentApproveAction` | Approuver (`mccom_validated=1`, status=1) |
| `POST /melis/react-api/news/comments/refuse/:cid` | `commentRefuseAction` | Refuser (`mccom_validated=2`, status=0) |
| `POST /melis/react-api/news/comments/delete/:cid` | `commentDeleteAction` | Supprimer le commentaire |
| `GET /melis/react-api/blog/:id/comments` | `MelisCmsBlog…ReactApiController::commentsAction` | Tous les commentaires d'un article blog |
| `POST /melis/react-api/blog/comments/{save,approve,refuse,delete}[/:cid]` | Actions de commentaires Blog | Mêmes opérations pour Blog |

`commentsAction` construit une requête `getComments(['postId' => …, 'postType' => 'NEWS'])` sans clé
`validated`, elle renvoie donc les commentaires **en attente + approuvés + refusés**. Chaque action renvoie **404
lorsque le module n'est pas disponible** ; le contrat est `{ success, data|error }`.

```ts
// list a post's comments (all statuses)
const res = await fetch(`/melis/react-api/news/${idNews}/comments`, {
  credentials: 'include',
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
}).then(r => r.json());          // → { success: true, data: [ { …comment… } ] }

// approve one
await fetch(`/melis/react-api/news/comments/approve/${commentId}`, {
  method: 'POST', credentials: 'include',
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
});
```

Le `MelisCmsCommentsTabController` legacy (getComments / save / approve / refuse / delete, protégé par
`hasAccess('meliscms_page')`) est toujours utilisé par le chemin classique/iframe — voir la
[doc legacy](/fr/legacy/reference/modules/melis-cms-comments).

## Plugin de page front office "Post comments"

`Controller\Plugin\MelisCmsCommentsPlugin` est un `MelisTemplatingPlugin` (clé de config `meliscmscomments`,
section **MelisCms**, config dans `config/plugins/MelisCmsCommentsPlugin.config.php`). Dans le panneau **PLUGINS**
de l'éditeur de page CMS React, sous **Melis Cms Comments**, glissez **Post comments** dans une zone de dépôt
d'un gabarit de page News/Blog.

![L'éditeur de page CMS avec le panneau PLUGINS : le groupe Melis Cms Comments déplié pour montrer le plugin Post comments glissé dans une DRAG & DROP ZONE ; le formulaire front rendu affiche un champ Name, une boîte « Add a comment: » et un bouton rouge Submit](/screenshots/react/melis-cms-comments/meliscmscomments-page-plugin-postcomments-menu-selector.png)

- La **modal de paramètres** choisit le **Template** (par défaut `MelisCmsComments/comments`) et le **Post Type**
  (NEWS / BLOG), persistés dans le XML du plugin de la page sous `template_path`, `mccplugin_post_type` et
  `registration_page_page_id` (pour les commentaires réservés aux comptes via MelisCmsUserAccount).

![La modal de paramètres du plugin Post comments : un select Template (MelisCmsComments/comments) et un select Post Type (News / Blog), avec les boutons Cancel / Apply ; ces paramètres sont persistés dans le XML du plugin de la page](/screenshots/react/melis-cms-comments/meliscmscomments-page-plugin-postcomments-config-settings.png)

- Le **rendu front** (`front()`) résout l'article à partir du paramètre de requête `newsId` / `blogId`, charge les
  commentaires via `getCommentsByPostId()`, et construit le formulaire d'ajout de commentaire (Name + comment + Submit).
  Lorsque l'article requiert un compte, il déclenche `melis_cms_user_account_login_form` pour intégrer un plugin
  de connexion.
- Vue par défaut `MelisCmsComments/comments` ; assets `plugins/css/commentsPlugin.css`,
  `plugins/js/commentsPlugin.js`.

## Widget de tableau de bord "Latest comments" (legacy)

`Controller\DashboardPlugins\MelisCmsCommentsLatestCommentsPlugin` étend
`MelisCoreDashboardTemplatingPlugin` ; sa méthode `latestCommentsAction()` renvoie un `ViewModel` Laminas
(gabarit `melis-cms-comments/dashboard/latest-comments`, un `.phtml`), enregistré dans
`config/dashboard-plugins/dashboard.config.php` (id de plugin `MelisCmsCommentsLatest`). L'**hôte de widgets** du
tableau de bord React rend ce plugin legacy tel quel — **il n'y a pas de réécriture React**. Il liste
les commentaires les plus récents par type d'article (onglets Blog / News) avec des filtres **All sites / All users / limit**,
et par commentaire affiche l'auteur, un badge de statut, le titre de l'article et la date. Les filtres site/utilisateur
et le rechargement de zone sont servis par `MelisCmsCommentsViewHelperController::listAction`
(`melis-cms-comments/dashboard/list`, zone `dashboard_latest_comments_list`).

![Le widget Latest comments du tableau de bord React : un onglet « Blog comments » avec les sélecteurs All sites, All users et limit, puis une liste de commentaires récents (auteur + badge d'identifiant utilisateur + badge œil vert « shown », le titre de l'article entre crochets, le texte du commentaire et « on: date »)](/screenshots/react/melis-cms-comments/meliscmscomments-dashboardplugins-latestcomments.png)

## Tables de base de données

| Table | Contenu |
| --- | --- |
| `melis_cms_comments` | Tous les commentaires : `mccom_id`, `mccom_post_id`, `mccom_type` (NEWS/BLOG), `mccom_comment_text`, `mccom_name`, `mccom_validated`, `mccom_status`, `mccom_date_creation`, `mccom_author_account`. |

Deux colonnes sont ajoutées automatiquement aux tables des modules d'articles au démarrage (aucune modification de schéma requise dans ces modules) :

| Colonne | Table | Objectif |
| --- | --- | --- |
| `cnews_validate_comments` | `melis_cms_news` | Flag "Validate comments" par article pour News. |
| `cblog_validate_comments` | `melis_cms_blog` | Flag "Validate comments" par article pour Blog. |

**Modèle de statut.** `mccom_validated` : `0` = nouveau/en attente (bleu), `1` = approuvé/affiché (vert),
`2` = refusé/masqué (rouge). `mccom_status` reflète la visibilité sur le site (`1` affiché / `0` masqué).

## Listeners et câblage inter-modules

Attachés dans `Module.php` au démarrage :

| Listener | Événement | Objectif |
| --- | --- | --- |
| `MelisCmsCommentsFlashMessengerListener` | `melis_cms_comments_flash_messenger` | Retour flash-messenger et journal d'activité (`CMS_COMMENT_ADD / UPDATE / DELETE`). |
| `MelisCmsCommentsSaveValidateCommentListener` | `meliscmsnews_get_postvalues` | Persiste `cnews_validate_comments` lors de l'enregistrement d'un article news. |
| `MelisCmsCommentsGdprAutoDeleteActionDeleteListener` | `melis_cms_user_account_gdpr_auto_delete_action_delete` | RGPD : met à null `mccom_author_account` pour un compte supprimé, puis redéclenche l'événement RGPD du module. |

`Module::addValidateCommentsField()` (démarrage back-office) vérifie quels modules d'articles sont actifs et
ajoute la colonne `c{news,blog}_validate_comments` à leurs tables si elle est absente.

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Config du module (services, contrôleurs, plugins) | `vendor/melisplatform/melis-cms-comments/config/module.config.php` |
| Config du plugin front | `vendor/melisplatform/melis-cms-comments/config/plugins/MelisCmsCommentsPlugin.config.php` |
| Config du plugin tableau de bord | `vendor/melisplatform/melis-cms-comments/config/dashboard-plugins/dashboard.config.php` |
| Service principal | `vendor/melisplatform/melis-cms-comments/src/Service/MelisCmsCommentsService.php` |
| Contrôleur d'onglet legacy | `vendor/melisplatform/melis-cms-comments/src/Controller/MelisCmsCommentsTabController.php` |
| Plugin de gabarit front | `vendor/melisplatform/melis-cms-comments/src/Controller/Plugin/MelisCmsCommentsPlugin.php` |
| Widget tableau de bord | `vendor/melisplatform/melis-cms-comments/src/Controller/DashboardPlugins/MelisCmsCommentsLatestCommentsPlugin.php` |
| Listeners | `vendor/melisplatform/melis-cms-comments/src/Listener/` |
| Modèle DB / table gateway | `vendor/melisplatform/melis-cms-comments/src/Model/Tables/MelisCmsCommentsTable.php` |
| Bootstrap / injection de colonnes | `vendor/melisplatform/melis-cms-comments/src/Module.php` |
| HTMLPurifier (inclus) | `vendor/melisplatform/melis-cms-comments/library/htmlpurifier-4.12.0/` |

> L'interface React de l'onglet Comments et ses endpoints `/comments…` résident dans les briques News/Blog
> (`MelisCmsNewsReactApiController`, `MelisCmsBlog…ReactApiController`) ; toutes deux délèguent à
> `MelisCmsCommentsService`. Modèle de données, service et outil classique :
> [doc legacy](/fr/legacy/reference/modules/melis-cms-comments).

Voir aussi : [MelisCmsNews](/fr/reference/modules/melis-cms-news) · [MelisCmsBlog](/fr/reference/modules/melis-cms-blog) · [MelisCms](/fr/reference/modules/melis-cms) · [MelisEngine](/fr/reference/modules/melis-engine) · [MelisCore](/fr/reference/modules/melis-core)
