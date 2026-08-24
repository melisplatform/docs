# MelisCmsBlog

> Système de blog pour les sites Melis, avec gestion des articles en back-office et trois plugins
> d'affichage front office. Package `melisplatform/melis-cms-blog`.

## Présentation

MelisCmsBlog fournit un outil **Blog** dans le back-office permettant aux éditeurs de créer et
gérer des articles multilingues (titres, sous-titre, paragraphes en texte riche, images, documents,
planification de publication/dépublication, un slider optionnel, ainsi qu'une URL SEO et des méta).
Les articles sont exposés en front office via trois plugins de templating prêts à l'emploi : un
teaser des derniers articles, une liste d'articles paginée et filtrable, et une vue de détail d'un
article unique. Les URLs SEO-friendly, les balises méta par article et les redirections 301
automatiques vers l'URL canonique sont gérées par des écouteurs d'événements dédiés.

## Activation

Ajouter dans `config/melis.module.load.php` :

```php
return [
    'MelisCmsBlog',
];
```

Nécessite `melis-core` et `melis-cms` (`^5.2`), PHP `^8.1|^8.3`. Les intégrations optionnelles
s'activent lorsque `MelisCmsComments`, `MelisCmsSlider`, `MelisSmallBusiness` ou
`MelisCmsUserAccount` sont également installés.

## Services principaux

Enregistrés comme alias `service_manager` dans `config/module.config.php`.

| Alias de service | Rôle |
| --- | --- |
| `MelisCmsBlogService` | Service principal CRUD/requêtes. Lecture, création, mise à jour et suppression d'articles ; requêtes par site, langue, plage de dates, statut, auteur, catégorie. Chaque méthode déclenche des événements `*_start` / `*_end` via `MelisEngineGeneralService`. |

Alias des passerelles de tables : `MelisCmsBlogTable`, `MelisCmsBlogTextsTable`, `MelisCmsBlogCategoryTable`.

## Back-office

L'outil **Blog** est accessible depuis le menu gauche sous **MelisCms** (icône `fa-rss`, melisKey
`meliscmsblog_left_menu`). Il s'ouvre sur un DataTable filtrable des articles (ID, Statut, Titre,
Créé, Publié, Dépublié, Site) avec des actions d'information, suppression et workflow par ligne.
L'éditeur d'article est organisé en onglets :

| Onglet | Contenu |
| --- | --- |
| Propriétés | Dates de publication / dépublication, affectation de site, bascule de statut ; optionnellement : Slider, auteur via User Account, validation des commentaires, bouton Workflow |
| Médias | Jusqu'à 3 images et 3 pièces jointes |
| Textes | Titre, sous-titre et paragraphes en texte riche par langue ; champs URL SEO et méta |
| Aperçu | Prévisualisation en iframe de l'article sauvegardé |
| Commentaires | Injecté par `MelisCmsComments` lorsqu'installé — liste des commentaires et validation |

L'onglet **Commentaires** et le commutateur **valider les commentaires** sont injectés via
`config/comments.config.php` lorsque MelisCmsComments est présent. Les actions Workflow
(MelisSmallBusiness) apparaissent dans la ligne de liste et l'en-tête de l'éditeur lorsque ce
module est installé.

## Front office

Trois plugins de templating étendent `MelisTemplatingPlugin`, chacun disposant d'un plugin
contrôleur et d'un fichier de configuration sous `config/plugins/`. Tous lisent l'identifiant
de l'article actif depuis le paramètre de requête `?blogId`.

| Classe du plugin | Clé de config | Vue | Onglets de config |
| --- | --- | --- | --- |
| `MelisCmsBlogLatestBlogPlugin` | `MelisCmsBlogLatestBlog` | `MelisCmsBlog/latest-blog` | Propriétés, Filtres |
| `MelisCmsBlogListBlogPlugin` | `MelisCmsBlogListBlog` | `MelisCmsBlog/blog-list` | Propriétés, Pagination, Filtres |
| `MelisCmsBlogShowBlogPlugin` | `MelisCmsBlogShowBlog` | `MelisCmsBlog/blog-details` | Propriétés |

Paramètres de configuration des plugins : `template_path`, `site_id`, `pageIdBlog` (lien vers la
page de détail), `column`, `order`, `limit`, `date_min`, `date_max`, `search` ; plus
`nbPerPage` / `nbPageBeforeAfter` (liste Blog uniquement). Le plugin liste Blog filtre également
par `?category` et `?authorId`. Le plugin détail Blog retombe sur l'article publié le plus récent
lorsqu'aucun `blogId` n'est présent dans la requête, et supporte le mode prévisualisation
(`renderMode === 'previewtab'`).

Colonnes de tri disponibles : `cblog_id`, `cblog_title`, `cblog_publish_date`, `cblog_creation_date`.

### Routage SEO

Les articles sont servis via une page de type **`BLOG_DETAIL`** portant le plugin détail Blog, à
l'`cblog_seo_url` de l'article. Quatre écouteurs implémentent le pipeline SEO complet :

| Écouteur | Événement | Rôle |
| --- | --- | --- |
| `MelisCmsBlogSEOReformatToRoutePageUrlListener` | `EVENT_ROUTE` | Correspond à l'URL SEO et construit une route vers la page BLOG_DETAIL |
| `MelisBlogSEODispatchRouterRegularUrlListener` | `EVENT_DISPATCH` | Redirige en 301 une URL non canonique vers l'`cblog_seo_url` de l'article |
| `MelisCmsBlogRedirect301Listener` | `meliscmsblog_redirect_page` | Définit les méta SEO de la page à partir des champs méta de l'article |
| `MelisCmsBlogSEOMetaPageListener` | `EVENT_FINISH` | Réécrit le `<title>` / `<meta description>` rendu avec les méta SEO de l'article |

`MelisCmsBlogPreviewTypeListener` enregistre le type de page **BLOG_DETAIL** dans le formulaire
de propriétés de page (événement `modify_page_properties_form_config`).

## Tables de base de données

Structure de base dans `install/sql/setup_structure.sql` ; migrations dans `install/dbdeploy/`.

| Table | Contenu |
| --- | --- |
| `melis_cms_blog` | Ligne principale de l'article : statut, dates de publication/dépublication, id du site, image1-3, documents1-3, id du slider, catégorie |
| `melis_cms_blog_texts` | Textes par langue : titre, sous-titre, paragraphes 1-4, id de langue, URL SEO, titre/description méta SEO, compte auteur |

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
$id = $blog->saveBlog(['cblog_site_id' => 1, 'cblog_status' => 1, ...], $blogId); // $blogId null → create
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
| Configuration du module (services, passerelles, plugins, `MelisCmsBlogSelect`) | `vendor/melisplatform/melis-cms-blog/config/module.config.php` |
| Arbre de l'outil back-office et onglets de l'éditeur | `vendor/melisplatform/melis-cms-blog/config/app.interface.php` |
| Configuration du DataTable de la liste | `vendor/melisplatform/melis-cms-blog/config/app.tools.php` |
| Injection de l'onglet commentaires | `vendor/melisplatform/melis-cms-blog/config/comments.config.php` |
| Configurations des plugins | `vendor/melisplatform/melis-cms-blog/config/plugins/` |
| Service principal | `vendor/melisplatform/melis-cms-blog/src/Service/MelisCmsBlogService.php` |
| Contrôleurs (liste, éditeur, front) | `vendor/melisplatform/melis-cms-blog/src/Controller/` |
| Plugins front | `vendor/melisplatform/melis-cms-blog/src/Controller/Plugin/` |
| Écouteurs (SEO, RGPD, slider, menu, flash) | `vendor/melisplatform/melis-cms-blog/src/Listener/` |
| Passerelles de tables | `vendor/melisplatform/melis-cms-blog/src/Model/Tables/` |
| SQL d'installation | `vendor/melisplatform/melis-cms-blog/install/sql/setup_structure.sql` |
| Migrations BDD | `vendor/melisplatform/melis-cms-blog/install/dbdeploy/` |

Voir aussi : [melis-cms](/fr/legacy/reference/modules/melis-cms), [melis-front](/fr/legacy/reference/modules/melis-front),
[melis-engine](/fr/legacy/reference/modules/melis-engine), [melis-core](/fr/legacy/reference/modules/melis-core),
[melis-cms-slider](/fr/legacy/reference/modules/melis-cms-slider),
[melis-small-business](/fr/legacy/reference/modules/melis-small-business)
