# MelisCmsBlog

> Système de blog pour les sites Melis, avec un back-office React natif pour la gestion des articles
> et trois plugins d'affichage front office. Package `melisplatform/melis-cms-blog`.

## Présentation

MelisCmsBlog fournit un outil **Blog** dans le back-office permettant aux éditeurs de créer et gérer
des articles de blog multilingues (titres, sous-titre, jusqu'à quatre paragraphes en texte riche,
images, documents, planification de publication/dépublication, un slider optionnel, ainsi qu'une URL
SEO et des méta). Les articles sont exposés en front office via trois plugins de templating prêts à
l'emploi : un teaser des derniers articles, une liste d'articles paginée et filtrable, et une vue de
détail d'un article unique. Les URLs SEO-friendly, les balises méta par article et les redirections
301 automatiques vers l'URL canonique sont gérées par des écouteurs d'événements dédiés.

Dans le back-office React v6 (`/melis-react`), le module embarque une **brique full-React native** —
une véritable interface React pour lister et éditer les articles, adossée à une couche JSON
`react-api` — avec une bascule **New / Old** permettant de retomber sur l'outil legacy dans une
iframe. C'est le jumeau architectural de MelisCmsNews. Le framework, les services, le modèle de
données, le routage SEO et les plugins front sont inchangés par rapport à la v5 ; seule la couche
d'affichage du back-office est nouvelle.

## Activation

Ajouter dans `config/melis.module.load.php` :

```php
return [
    'MelisCmsBlog',
];
```

Nécessite `melis-core` et `melis-cms`, PHP `^8.1|^8.3|^8.4`. Les intégrations optionnelles s'activent
lorsque `MelisCmsComments`, `MelisCmsSlider`, `MelisSmallBusiness` ou `MelisCmsUserAccount` sont
également installés. La brique n'apparaît dans la barre latérale React que si le module est présent
(découverte modulaire des briques via `GET /melis/react-api/react-modules`).

## Services principaux

Enregistrés comme alias `service_manager` dans `config/module.config.php`. Le contrôleur React
réutilise ces mêmes règles métier côté serveur, garantissant la parité avec l'outil legacy.

| Alias de service | Rôle |
| --- | --- |
| `MelisCmsBlogService` | Service principal CRUD/requêtes. Lecture, création, mise à jour et suppression d'articles ; requêtes par site, langue, plage de dates, statut, auteur. Chaque méthode déclenche des événements `*_start` / `*_end` via `MelisEngineGeneralService`. |

Alias des passerelles de tables : `MelisCmsBlogTable`, `MelisCmsBlogTextsTable`.

## Tables de base de données

Structure de base dans `install/sql/setup_structure.sql` ; migrations dans `install/dbdeploy/`.

| Table | Contenu |
| --- | --- |
| `melis_cms_blog` | Ligne principale de l'article : statut, dates de publication/dépublication, id du site, image1-3, documents1-3, id du slider |
| `melis_cms_blog_texts` | Textes par langue : titre, sous-titre, paragraphes 1-4, id de langue, URL SEO, titre/description méta SEO, compte auteur |

> Contrairement à MelisCmsNews, le blog n'a **ni catégories ni tags** — pas de table de liaison ni de
> support `melis_cms_tag*`.

## Back-office React

Barre latérale → groupe **MelisCms** → **Blog** (`fa-rss`). La brique s'ouvre dans un onglet
principal nommé **Blog** et dessine sa propre barre de sous-onglets interne : un sous-onglet par
article ouvert, plus un Retour à la liste. Chaque article ouvert reste monté, de sorte que le passage
d'un article à l'autre est instantané.

### La liste des articles

La liste React affiche tous les articles de la plateforme, avec des **cartes KPI** (Total des
articles, Publiés, Dépubliés), un champ de **recherche** doté de filtres **All / Active / Inactive**,
un gestionnaire de **colonnes** (masquer/réordonner), un bouton **Export** (xlsx/csv), une pagination
par keyset et des actions **éditer** / **supprimer** par ligne. Cliquer sur un en-tête de colonne
pour trier. **+ New post** démarre un éditeur vierge.

![La liste Blog React : cartes KPI (Total des articles / Publiés / Dépubliés), un champ de recherche avec les filtres All / Active / Inactive, un gestionnaire de colonnes, un bouton Export, la bascule New/Old et le bouton « + New post », avec les actions éditer et supprimer par ligne](/screenshots/react/melis-cms-blog/meliscmsblog-tool-blog-list.png)

Une bascule **New / Old** (en haut à droite) fait basculer la liste — et seulement la liste — entre
l'interface React et l'outil legacy rendu dans une iframe
(`/melis/react-tool-page?key=meliscmsblog_left_menu`), afin de pouvoir comparer les deux interfaces
côte à côte.

### L'éditeur d'article

Là où l'outil legacy utilisait des onglets principaux distincts (Propriétés / Textes / Médias),
l'éditeur React est une page unique défilable : une large **colonne de contenu** à gauche et une
**barre latérale de réglages** repliable à droite. Un **sélecteur de langue** en haut conserve toutes
les traductions à la fois — toutes les langues sont enregistrées ensemble en un seul appel.

**Colonne de contenu**

- **Titre / Sous-titre** — texte simple, par langue.

![Le sélecteur de langue de l'éditeur d'article (English / Français / Español), les champs Titre et Sous-titre, et le CORPS avec jusqu'à 4 paragraphes en texte riche (TinyMCE) — chacun dans sa propre carte réordonnable par glisser-déposer avec un compteur de paragraphes](/screenshots/react/melis-cms-blog/meliscmsblog-tool-blog-edit-tab-texts.png)

- **Corps** — jusqu'à **4 paragraphes en texte riche (TinyMCE)** (`cblog_paragraph1..4`),
  réordonnables par glisser-déposer, avec **+ Add paragraph (max. 4)**.
- **Médias** — jusqu'à **3 images** (Remplacer / Retirer par emplacement) et jusqu'à **3 pièces
  jointes**. N'apparaît qu'**après le premier enregistrement**, car les téléversements nécessitent
  que l'article existe d'abord.

![La zone Médias — Images (max. 3, avec Remplacer/Retirer par emplacement) et Pièces jointes (max. 3, « Click to attach a file »)](/screenshots/react/melis-cms-blog/meliscmsblog-tool-blog-edit-tab-medias.png)

- **Commentaires** — un panneau de modération natif (ajouter/éditer, approuver/refuser/supprimer,
  paginé), affiché uniquement lorsque **MelisCmsComments** est installé.

**Barre latérale de réglages** (sections repliables)

- **Statut** — une bascule Publié / Dépublié, plus un bouton **Workflow** (validation) lorsque
  **MelisSmallBusiness** est actif.

![Le haut de la barre latérale de réglages — la bascule Publié avec un bouton Workflow, les sélecteurs de date-heure Publier le / Dépublier le et le sélecteur de Site](/screenshots/react/melis-cms-blog/meliscmsblog-tool-blog-edit-tab-properties.png)

- **Publication** — sélecteurs de date-heure **Publier le** / **Dépublier le**.
- **Site** — le site auquel appartient l'article (obligatoire).
- **Auteur** — un sélecteur d'auteur, affiché uniquement lorsque **MelisCmsUserAccount** fournit la
  colonne `cblog_author_account`.
- **Validation des commentaires** — une bascule « les commentaires du front office restent masqués
  jusqu'à approbation » plus un interrupteur propre au blog « Compte requis pour commenter », affichés
  lorsque **MelisCmsComments** est actif.
- **SEO** — Titre méta, Description méta et **URL** conviviale, par langue (stockés dans la table des
  textes, pas dans une table SEO dédiée).
- **Slider** — un slider à afficher avec l'article, affiché uniquement lorsque **MelisCmsSlider** est
  actif.

Les sections optionnelles sont détectées à l'exécution (les endpoints compagnons renvoient un 404
proprement ; l'état des modules est lu depuis `/melis/react-api/react-modules`), de sorte qu'un
module compagnon absent ne casse jamais un enregistrement. **Save** (en haut à droite) persiste
chaque traduction, le SEO, les dates, les liens médias, le slider et l'auteur en un seul appel. Une
zone **Preview** rend ensuite l'article enregistré sur sa page de détail dans une iframe.

![La barre latérale de réglages enrichie — une bascule Validation des commentaires, la bascule propre au blog « Compte requis pour commenter », puis les sections repliables SEO et Slider](/screenshots/react/melis-cms-blog/meliscmsblog-tool-blog-edit-tab-properties-with-overrides.png)

## API React

Les routes se trouvent dans `config/react-api.php` (fusionnées via `MelisCmsBlog\Module::getConfig()`),
montées sous `/melis/react-api/…`. Contrôleur : `MelisCmsBlog\Controller\MelisCmsBlogReactApiController`.
Contrat `{ success, data, error }` ; chaque fetch envoie `X-Requested-With: XMLHttpRequest` et
`credentials:'include'`.

| Méthode & URL | Rôle |
| --- | --- |
| `GET /blog` | Liste des articles (keyset : `limit`, `search`, `status`, `siteId`, `sort`, `dir`, `after`) → `{items,total,nextCursor}` |
| `GET /blog/stats` | KPI `{total, published, draft}` |
| `GET /blog/:id` | Un article (`?langId=` → cette traduction ; champs de base + paragraphes + médias + SEO + slider/auteur) |
| `POST /blog/save` | Créer / mettre à jour (toutes les traductions, statut, siteId, dates, sliderId, authorId, flags de commentaire, seo) |
| `DELETE /blog/delete/:id` | Supprimer un article et ses textes |
| `GET /blog/preview/:id` | URL de prévisualisation + liste des pages BLOG_DETAIL pour le site de l'article |
| `GET /blog/users` | Utilisateurs du front office comme auteurs (`MelisCmsUserAccount`) |
| `GET /blog/:id/comments` | Commentaires d'un article (404 si `MelisCmsComments` désactivé) |
| `POST /blog/comments/save` | Ajouter/éditer un commentaire |
| `POST /blog/comments/approve/:cid` · `/refuse/:cid` | Modérer un commentaire |
| `DELETE /blog/comments/delete/:cid` | Supprimer un commentaire |
| `GET /blog-sites` | Liste des sites |
| `GET /blog-languages` | Langues CMS (`melis_cms_lang`) |

Il n'y a **aucune route `/blog/categories` ou `/blog/tags`**. Les sliders proviennent de la propre
route `GET /melis/react-api/sliders` de la brique MelisCmsSlider. Le téléversement/retrait de médias
et la recherche d'auteur de commentaire réutilisent les endpoints **legacy** (aucun changement
backend) :

- `POST /melis/MelisCmsBlog/MelisCmsBlog/saveFileForm` — téléversement multipart d'image/fichier
- `POST /melis/MelisCmsBlog/MelisCmsBlog/removeAttachFile` — vide la colonne et supprime le fichier

### Capacités

Déclarées dans `config/react.capabilities.php` sous le nœud porteur de droits
`meliscmsblog_left_menu` :

```
meliscmsblog_left_menu
└─ actions: list · create · edit · delete · export
```

React contrôle l'interface via `window.__melisUseCaps('meliscmsblog_left_menu').can(cap)` (New post →
`create`, Export → `export`, actions de ligne → `edit`/`delete`, corps de la liste → `list`). Côté
serveur, chaque action de contrôleur est protégée par `denyUnlessAccess()` (auth + `canAccess`) puis
`denyUnlessCan(cap)`.

## Manifeste de la brique

`public/ui-react/brick.manifest.json` (bundle Vite IIFE, React/ReactDOM externalisés vers les globales
de l'hôte) :

```json
{ "id": "blog", "route": "/melis-cms/blog", "label": "Blog",
  "forwardKey": "MelisCmsBlog/MelisCmsBlogList", "melisKey": "meliscmsblog_left_menu",
  "entry": "brick.js", "persistent": true, "subTabs": true }
```

`forwardKey` mappe le nœud legacy du menu gauche vers la route d'arbre `/melis-cms/blog`
(deep-linkable en `/melis-cms/blog/:id`, utilisée par l'œil Workflow). `subTabs: true` signifie que la
brique dessine sa propre barre de sous-onglets interne. Lorsque MelisSmallBusiness est actif, la
section Statut rend le `window.__melisWorkflowModal` mutualisé avec `ctx.wfType = 'BLOG'`. Un module
optionnel peut ajouter des actions par paragraphe via
`window.__melisBlogExtensions.renderParagraphActions(...)`.

## Front office

Trois plugins de templating étendent `MelisTemplatingPlugin`, chacun disposant d'un plugin contrôleur
et d'un fichier de configuration sous `config/plugins/`. Tous lisent l'identifiant de l'article actif
depuis le paramètre de requête `?blogId`. Dans l'éditeur de page React, ils sont déposés depuis le
groupe **Melis Cms Blog** du panneau des plugins, et chacun ouvre la modale de configuration classique
à onglets.

![L'éditeur de page React avec le panneau des plugins ouvert — le groupe « Melis Cms Blog » : Latest blog posts, Blog post list, Blog post details](/screenshots/react/melis-cms-blog/meliscmsblog-page-plugins-menu.png)

| Classe du plugin | Clé de config | Vue | Onglets de config |
| --- | --- | --- | --- |
| `MelisCmsBlogLatestBlogPlugin` | `MelisCmsBlogLatestBlog` | `MelisCmsBlog/latest-blog` | Propriétés, Filtres |
| `MelisCmsBlogListBlogPlugin` | `MelisCmsBlogListBlog` | `MelisCmsBlog/blog-list` | Propriétés, Pagination, Filtres |
| `MelisCmsBlogShowBlogPlugin` | `MelisCmsBlogShowBlog` | `MelisCmsBlog/blog-details` | Propriétés |

Paramètres de configuration des plugins : `template_path`, `site_id`, `pageIdBlog` (lien vers la page
de détail), `column`, `order`, `limit`, `date_min`, `date_max`, `search` ; plus `nbPerPage` /
`nbPageBeforeAfter` (liste Blog uniquement). Le plugin liste Blog filtre également par `?authorId`. Le
plugin détail Blog retombe sur l'article publié le plus récent lorsqu'aucun `blogId` n'est présent
dans la requête, et supporte le mode prévisualisation (`renderMode === 'previewtab'`).

Colonnes de tri disponibles : `cblog_id`, `cblog_title`, `cblog_publish_date`, `cblog_creation_date`.

![Plugin liste Blog → Propriétés — Template MelisCmsBlog/blog-list, Site et page de détail Blog](/screenshots/react/melis-cms-blog/meliscmsblog-page-plugin-bloglist-config-properties.png)

![Plugin derniers articles → Filtres — Sort (Blog publish date), Order, Limit, dates From/To et Default search](/screenshots/react/melis-cms-blog/meliscmsblog-page-plugin-latestblog-config-filters.png)

![Plugin détail Blog → Propriétés — Template MelisCmsBlog/blog-details et un sélecteur d'article par défaut](/screenshots/react/melis-cms-blog/meliscmsblog-page-plugin-blogdetails-config-properties.png)

### Routage SEO

Les articles sont servis via une page de type **`BLOG_DETAIL`** portant le plugin détail Blog, à
l'`cblog_seo_url` de l'article. Quatre écouteurs implémentent le pipeline SEO complet :

| Écouteur | Événement | Rôle |
| --- | --- | --- |
| `MelisCmsBlogSEOReformatToRoutePageUrlListener` | `EVENT_ROUTE` | Correspond à l'URL SEO et construit une route vers la page BLOG_DETAIL |
| `MelisBlogSEODispatchRouterRegularUrlListener` | `EVENT_DISPATCH` | Redirige en 301 une URL non canonique vers l'`cblog_seo_url` de l'article |
| `MelisCmsBlogRedirect301Listener` | `meliscmsblog_redirect_page` | Définit les méta SEO de la page à partir des champs méta de l'article |
| `MelisCmsBlogSEOMetaPageListener` | `EVENT_FINISH` | Réécrit le `<title>` / `<meta description>` rendu avec les méta SEO de l'article |

`MelisCmsBlogPreviewTypeListener` enregistre le type de page **BLOG_DETAIL** dans le formulaire de
propriétés de page (événement `modify_page_properties_form_config`).

## Exemple

```php
$blog = $this->getServiceManager()->get('MelisCmsBlogService');

// Latest 10 published posts for site 1, newest first:
$list = $blog->getBlogList([
    'siteId'   => 1,
    'langId'   => 1,
    'limit'    => 10,
    'orderBy'  => 'cblog_publish_date',
    'orderDir' => 'DESC',
]);

// Fetch one post (with its texts for a given language):
$post = $blog->getBlogById($blogId, $langId);
$txt  = $blog->getPostText($blogId);

// Create / update / delete:
$id = $blog->saveBlog(['cblog_site_id' => 1, 'cblog_status' => 1, ...], $blogId); // null → create
$blog->deleteBlogById($blogId);  // also removes its texts

// Utility:
$pages  = $blog->getBlogDetailsPagesBySite($siteId);       // BLOG_DETAIL-type pages for a site
$isDupe = $blog->checkSeoUrlDuplication($seoUrl, $blogId); // SEO URL uniqueness check
$slug   = $blog->cleanURL($title);                         // slugify (handles accents)

// Posts by a front-account author:
$posts  = $blog->getBlogListByAuthorId($authorId);
```

## Autres écouteurs

| Écouteur | Événement | Rôle |
| --- | --- | --- |
| `MelisCmsBlogSliderDeletedListener` | `meliscmsslider_delete_slider_end` | Efface un slider supprimé des articles (`cblog_slider_id`) |
| `MelisCmsBlogGdprAutoDeleteActionDeleteListener` | `melis_cms_user_account_gdpr_auto_delete_action_delete` | RGPD : met à null `cblog_author_account` pour un compte utilisateur supprimé |
| `MelisCmsBlogServiceMicroServiceListener` | `melis_core_microservice_amend_data` | Convertit les chemins d'images en URLs absolues dans les résultats de `getBlogList` pour la sortie API/microservice |
| `SiteMenuBlogDataListener` | `MelisFrontMenuPlugin_melistemplating_plugin_end` | Injecte les articles (regroupés par mois/année) dans le plugin de menu front |
| `MelisCmsBlogFlashMessengerListener` | `meliscmsblog_delete_blog_end`, `meliscmsblog_save_blog_*_end` | Retours flash-messenger pour les actions du blog |

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Configuration du module (services, passerelles, plugins) | `vendor/melisplatform/melis-cms-blog/config/module.config.php` |
| Routes de l'API React | `vendor/melisplatform/melis-cms-blog/config/react-api.php` |
| Capacités React | `vendor/melisplatform/melis-cms-blog/config/react.capabilities.php` |
| Arbre de l'outil back-office (legacy / vue Old) | `vendor/melisplatform/melis-cms-blog/config/app.interface.php` |
| Injection de l'onglet commentaires | `vendor/melisplatform/melis-cms-blog/config/comments.config.php` |
| Configurations des plugins | `vendor/melisplatform/melis-cms-blog/config/plugins/` |
| Service principal | `vendor/melisplatform/melis-cms-blog/src/Service/MelisCmsBlogService.php` |
| Contrôleur de l'API React | `vendor/melisplatform/melis-cms-blog/src/Controller/MelisCmsBlogReactApiController.php` |
| Plugins front | `vendor/melisplatform/melis-cms-blog/src/Controller/Plugin/` |
| Écouteurs (SEO, RGPD, slider, menu, flash) | `vendor/melisplatform/melis-cms-blog/src/Listener/` |
| Source de la brique React | `vendor/melisplatform/melis-cms-blog/ui-react/src/` |
| Brique compilée + manifeste | `vendor/melisplatform/melis-cms-blog/public/ui-react/` |
| SQL d'installation | `vendor/melisplatform/melis-cms-blog/install/sql/setup_structure.sql` |

Voir aussi : [melis-cms](/fr/reference/modules/melis-cms), [melis-front](/fr/reference/modules/melis-front),
[melis-engine](/fr/reference/modules/melis-engine), [melis-core](/fr/reference/modules/melis-core),
[melis-cms-slider](/fr/reference/modules/melis-cms-slider),
[melis-small-business](/fr/reference/modules/melis-small-business)
