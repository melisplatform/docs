# MelisCmsComments

> Système de commentaires pour les articles News et Blog, avec modération, workflow d'approbation optionnel et widget de tableau de bord.
> Package `melisplatform/melis-cms-comments`.

## Présentation

MelisCmsComments associe un système de commentaires aux articles **MelisCmsNews** et **MelisCmsBlog**. Il fournit un plugin de gabarit front office (liste de commentaires + formulaire "laisser un commentaire"), un onglet de modération **Comments** intégré dans l'éditeur d'articles News/Blog (création, édition, suppression, approbation, refus), et un workflow de **validation** optionnel par article où les commentaires soumis depuis le front office restent en attente jusqu'à l'approbation d'un administrateur. Un widget de tableau de bord **Latest Comments** et la suppression automatique RGPD sont également inclus. Combiné avec **MelisCmsUserAccount**, les commentaires peuvent être réservés aux comptes connectés du site.

## Activation

Ajouter dans `config/melis.module.load.php` :

```php
return [
    'MelisCmsComments',
];
```

Dépendances Composer : `melis-core` et `melis-cms` (`^5.2`), PHP `^8.1|^8.3`. Nécessite fonctionnellement au moins un module d'articles — **MelisCmsNews** ou **MelisCmsBlog** — pour être utile. **MelisCmsUserAccount** est une intégration optionnelle pour les commentaires réservés aux comptes.

## Services principaux

| Alias de service | Rôle |
| --- | --- |
| `MelisCmsCommentsService` | Service principal CRUD/modération (étend `MelisEngineGeneralService`). Déclenche des paires d'événements `*_start`/`*_end` sur chaque méthode. |

Méthodes clés de `MelisCmsCommentsService` :

```php
$svc = $sm->get('MelisCmsCommentsService');

// Create or update a comment
$id = $svc->saveComment($text, $postId, $commentId, 'NEWS', $name, $authorId, 'front');

// Fetch a single comment
$comment = $svc->getCommentById($id);

// Front-office list for a post (ordered)
$list = $svc->getCommentsByPostId($postId, 'BLOG', 'mccom_date_creation', 'DESC');

// Back-office table query (with optional user info)
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

`saveComment()` lit le flag `c{type}_validate_comments` de l'article : lorsqu'il est activé et que le commentaire provient du front office, il est enregistré en attente (`validated=0`) ; les commentaires back-office sont immédiatement enregistrés comme approuvés.

## Back-office

### Onglet de modération des commentaires

`MelisCmsCommentsTabController` affiche l'onglet **Comments** injecté dans l'éditeur d'articles News/Blog. Il associe le module appelant à son type d'article via `setPostType()` / `setService()`.

| Action | Rôle |
| --- | --- |
| `commentsTable` | Affiche le conteneur de l'onglet. |
| `getComments` | Flux JSON AJAX pour le DataTable (`ajaxUrl: /melis/MelisCmsComments/MelisCmsCommentsTab/getComments`) ; construit les indicateurs de statut (bleu/vert/rouge), le temps écoulé lisible, et la cellule auteur (déclenche `melis_cms_user_account_add_user_picture` pour les avatars). |
| `commentsModalContent` | Formulaire d'ajout / modification de commentaire. |
| `saveComment` | Persiste un commentaire ; passe le texte dans **HTMLPurifier 4.12** avant l'enregistrement (protection XSS). |
| `deleteComment` | Supprime un commentaire. |
| `approveComment` | Définit `mccom_validated=1`, `status=1`. |
| `refuseComment` | Définit `mccom_validated=2`, `status=0`. |
| `commentsValidateComments` | Bascule l'interrupteur "Validate comments" par article (stocké dans `cnews_validate_comments` / `cblog_validate_comments`). |

L'outil DataTable est enregistré sous `meliscmscomments_tool` dans `config/app.tools.php` avec les colonnes **status / author / comment** et les boutons d'action **validate-refuse / edit / delete**. Les boutons valider/refuser sont injectés à l'exécution (`setCommentValidationBtns`) et n'apparaissent que pour les articles ayant la validation activée.

Les actions de sauvegarde et de suppression déclenchent `melis_cms_comments_flash_messenger` (codes de type de log `CMS_COMMENT_ADD / UPDATE / DELETE`), consommés par `MelisCmsCommentsFlashMessengerListener`.

### Widget de tableau de bord

`MelisCmsCommentsLatestCommentsPlugin` (enregistré en tant que plugin de contrôleur ; config dans `config/dashboard-plugins/dashboard.config.php`) affiche le widget **Latest Comments**. Il liste les commentaires les plus récents par site, avec l'auteur, le badge de statut, le titre de l'article et la date. La zone d'interface `dashboard_latest_comments_list` fournit le support `zoneReload`.

## Front office

`MelisCmsCommentsPlugin` est un `MelisTemplatingPlugin` (clé de config `meliscmscomments`, section **MelisCms**, config dans `config/plugins/MelisCmsCommentsPlugin.config.php`). À déposer sur un gabarit de page News/Blog depuis le panneau **PLUGINS** de l'éditeur de page, sous **Melis Cms Comments**.

- `front()` résout l'article à partir du paramètre de requête `newsId` / `blogId`, charge les commentaires via `getCommentsByPostId()`, et construit le formulaire d'ajout de commentaire. Lorsque l'article requiert un compte, il déclenche `melis_cms_user_account_login_form` pour intégrer un plugin de connexion et associer les commentaires au compte (`uac_firstname` / `uac_lastname`).
- **Modal de paramètres** (`createOptionsForms`) : un sélecteur **Template** et un sélecteur **Post type** (`NEWS` / `BLOG`). Persistés dans le XML du plugin de la page sous `template_path`, `mccplugin_post_type`, `registration_page_page_id`.
- Vue par défaut : `MelisCmsComments/comments` (`view/.../plugins/comments.phtml`).
- Assets : `plugins/css/commentsPlugin.css`, `plugins/js/commentsPlugin.js`.

## Tables de base de données

| Table | Contenu |
| --- | --- |
| `melis_cms_comments` | Tous les commentaires : `mccom_id`, `mccom_post_id`, `mccom_type` (NEWS/BLOG), `mccom_comment_text`, `mccom_name`, `mccom_validated`, `mccom_status`, `mccom_date_creation`, `mccom_author_account`. |

Deux colonnes sont ajoutées automatiquement aux tables des modules d'articles au démarrage (aucune modification de schéma requise dans ces modules) :

| Colonne | Table | Objectif |
| --- | --- | --- |
| `cnews_validate_comments` | `melis_cms_news` | Flag "Validate comments" par article pour News. |
| `cblog_validate_comments` | `melis_cms_blog` | Flag "Validate comments" par article pour Blog. |

**Modèle de statut.** `mccom_validated` : `0` = nouveau/en attente (bleu), `1` = approuvé/affiché (vert), `2` = refusé/masqué (rouge). `mccom_status` reflète la visibilité sur le site (`1` affiché / `0` masqué).

## Listeners et câblage inter-modules

Attachés dans `Module.php` au démarrage :

| Listener | Événement | Objectif |
| --- | --- | --- |
| `MelisCmsCommentsFlashMessengerListener` | `melis_cms_comments_flash_messenger` | Retour flash-messenger et journal d'activité. |
| `MelisCmsCommentsSaveValidateCommentListener` | `meliscmsnews_get_postvalues` (MelisCmsNews) | Persiste `cnews_validate_comments` lors de l'enregistrement d'un article news. |
| `MelisCmsCommentsGdprAutoDeleteActionDeleteListener` | `melis_cms_user_account_gdpr_auto_delete_action_delete` | RGPD : met à null `mccom_author_account` pour un compte supprimé, puis redéclenche `melis_cms_comments_gdpr_auto_delete_action_delete`. |

`Module::addValidateCommentsField()` (démarrage back-office) vérifie quels modules d'articles sont actifs et ajoute la colonne `c{news,blog}_validate_comments` à leurs tables si elle est absente.

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Config du module (services, contrôleurs, plugins) | `vendor/melisplatform/melis-cms-comments/config/module.config.php` |
| Outil back-office (DataTable) | `vendor/melisplatform/melis-cms-comments/config/app.tools.php` |
| Zones d'interface | `vendor/melisplatform/melis-cms-comments/config/app.interface.php` |
| Formulaires de commentaires | `vendor/melisplatform/melis-cms-comments/config/app.forms.php` |
| Config du plugin front | `vendor/melisplatform/melis-cms-comments/config/plugins/MelisCmsCommentsPlugin.config.php` |
| Config du plugin tableau de bord | `vendor/melisplatform/melis-cms-comments/config/dashboard-plugins/dashboard.config.php` |
| Service principal | `vendor/melisplatform/melis-cms-comments/src/Service/MelisCmsCommentsService.php` |
| Contrôleur de l'onglet back-office | `vendor/melisplatform/melis-cms-comments/src/Controller/MelisCmsCommentsTabController.php` |
| Plugin de gabarit front | `vendor/melisplatform/melis-cms-comments/src/Controller/Plugin/MelisCmsCommentsPlugin.php` |
| Widget tableau de bord | `vendor/melisplatform/melis-cms-comments/src/Controller/DashboardPlugins/MelisCmsCommentsLatestCommentsPlugin.php` |
| Listeners | `vendor/melisplatform/melis-cms-comments/src/Listener/` |
| Modèle DB / table gateway | `vendor/melisplatform/melis-cms-comments/src/Model/Tables/MelisCmsCommentsTable.php` |
| Bootstrap / injection de colonnes | `vendor/melisplatform/melis-cms-comments/src/Module.php` |
| Delta d'installation | `vendor/melisplatform/melis-cms-comments/install/dbdeploy/16618_cms_comments_install.sql` |
| HTMLPurifier (inclus) | `vendor/melisplatform/melis-cms-comments/library/htmlpurifier-4.12.0/` |

Voir aussi : [MelisCmsNews](/fr/reference/modules/melis-cms-news) · [MelisCms](/fr/reference/modules/melis-cms) · [MelisEngine](/fr/reference/modules/melis-engine) · [MelisCore](/fr/reference/modules/melis-core)
