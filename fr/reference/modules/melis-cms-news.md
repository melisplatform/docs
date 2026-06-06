# MelisCmsNews

> Articles d'actualité / de blog pour les sites Melis, ainsi que les plugins de templating front-office qui les affichent.
> Paquet `melisplatform/melis-cms-news`.

## Objectif

MelisCmsNews ajoute un outil **News** dans le backoffice où les rédacteurs créent et gèrent des
articles d'actualité / de blog (titre, textes, paragraphes, images, documents, catégories, tags,
sites, SEO et une fenêtre de publication / dépublication). Les articles sont diffusés sur le front
office via trois plugins de templating en glisser-déposer (dernières actualités, liste
d'actualités, article unique). Le module fournit aussi un routage SEO pour donner sa propre URL à
chaque article, un workflow de publication (commentaires de validation) et un mécanisme de
suppression automatique RGPD.

## Activation

C'est un module Laminas standard listé dans `config/melis.module.load.php` (il est livré activé
dans le skeleton). Pour l'activer/désactiver, vérifiez que `'MelisCmsNews'` est présent dans ce
tableau. Il dépend de `melis-core`, `melis-engine`, `melis-front` et `melis-cms` (voir
`composer.json`), et s'intègre en option avec `melis-cms-slider`, `melis-cms-category2` et
`melis-cms-comments` lorsqu'ils sont installés. Voir
[Référence des modules](/fr/reference/modules) et [Construire un site](/fr/guide/build-a-site).

## Services principaux

Déclarés en tant qu'alias `service_manager` dans `config/module.config.php`.

| Alias de service | Rôle |
| --- | --- |
| `MelisCmsNewsService` | Service principal de CRUD/requête des articles. Méthodes : `getNewsList(...)` (filtre par statut, langue, fenêtre de dates, site, recherche ; pagination + `count`), `getNewsById($newsId, $langId)`, `getNewsByIdArray(array $ids, $langId, $where)`, `saveNews($news, $newsId)`, `deleteNewsById($newsId)`, `getPostText($newsId)`, `getNewsDetailsPagesBySite($siteId)`. |
| `MelisCmsNewsSeoService` | SEO et construction d'URL par article. Méthodes : `getPageLink($idPage, $newsId, $absolute)`, `getSeoData($newsId, $idPage)`, `updateTitleAndDescription($newsId, $idPage, $contentGenerated)`. |

Les passerelles de tables sont également aliasées : `MelisCmsNewsTable`, `MelisCmsNewsTextsTable`,
`MelisCmsNewsSeoTable`, `MelisCmsNewsCategoryTable`, `MelisCmsNewsTagsTable`.

## Backoffice

L'outil est monté dans l'arbre des outils du CMS (`app.interface.php`) sous la section
`meliscms_news_tool_section` (icône `fa-newspaper-o`), avec l'interface de liste `meliscmsnews_list`
et l'éditeur d'article `meliscmsnews`. Contrôleurs (dans `config/module.config.php`) :

| Contrôleur | Rôle |
| --- | --- |
| `MelisCmsNews\Controller\MelisCmsNewsList` | L'outil liste / tableau (flux AJAX `renderNewsListData`, filtres, boutons d'action). |
| `MelisCmsNews\Controller\MelisCmsNews` | L'éditeur d'article : onglets propriétés, catégories, tags, sites, médias, textes, SEO et aperçu. |
| `MelisCmsNews\Controller\MelisCmsNewsWorkflowComments` | Commentaires / timeline de validation du workflow pour un article. |

Le tableau de liste (`app.tools.php`, clé d'outil `meliscmsnews_list_table`) affiche les colonnes
`cnews_id`, `cnews_status`, `cnews_title`, `cnews_creation_date`, `cnews_publish_date`,
`cnews_unpublish_date` et le libellé du site, avec les actions de ligne info / suppression /
workflow. Un controller plugin **DashboardLatestComments** étend le widget de dashboard de
MelisCmsComments. Voir [Créer un outil](/fr/guide/create-a-tool).

## Front office

Trois plugins de templating (controller plugins étendant `MelisTemplatingPlugin`) — voir
[Plugins](/fr/guide/plugins). Chacun dispose d'un alias de view helper pour un usage direct dans un
`.phtml`.

| Plugin (controller plugin) | Clé XML (`pluginXmlDbKey`) | View helper | Template front | Rôle |
| --- | --- | --- | --- | --- |
| `MelisCmsNewsLatestNewsPlugin` | `MelisCmsNewsLatestNews` | `MelisCmsNewsLatestPlugin` | `MelisCmsNews/latestnews` | Les N derniers articles d'un site/page. |
| `MelisCmsNewsListNewsPlugin` | `MelisCmsNewsListNews` | `MelisCmsNewsListPlugin` | `MelisCmsNews/listnews` | Liste paginée/filtrée des articles. |
| `MelisCmsNewsShowNewsPlugin` | `MelisCmsNewsShowNews` | `MelisCmsNewsShowNewsPlugin` | `MelisCmsNews/shownews` | Un article unique (page de détail). |

Les trois partagent `configPluginKey = 'meliscmsnews'`. Les URLs SEO et les méta par article sont
câblées via des listeners (`MelisCmsNewsSEORouteListener`, `MelisCmsNewsRenderPageListener`,
`MelisCmsNewsMetaPageListener`, `MelisCmsNewsSeoRedirectUrlListener`), tous attachés dans
`src/Module.php`.

## Tables de base de données

Créées par les deltas dbdeploy sous `install/dbdeploy/`.

| Table | Rôle |
| --- | --- |
| `melis_cms_news` | Ligne principale de l'article (statut, dates, site, relations). |
| `melis_cms_news_texts` | Textes/paragraphes par langue d'un article. |
| `melis_cms_news_seo` | Données SEO par article (titre, description, URL). |
| `melis_cms_news_category` | Catégories d'actualités. |

## Exemple

Afficher les 3 articles publiés les plus récents de la langue courante directement depuis une vue,
via le service de liste :

```php
// Dans un contrôleur / service disposant du service manager
$newsService = $sm->get('MelisCmsNewsService');
$latest = $newsService->getNewsList(
    'published',   // status
    $langId,       // langId
    null, null, null, null, // filtres de dates
    false,         // unpublishFilter
    0, 3,          // start, limit
    'cnews_publish_date', 'DESC'
);
```

Pour les pages, préférez déposer les plugins de templating **Latest news** / **News list** /
**Show news** dans une `MelisDragDropZone` plutôt que d'appeler le service à la main — voir
[Plugins](/fr/guide/plugins).

## Fichiers clés

| Sujet | Chemin |
| --- | --- |
| Config du module (services, contrôleurs, plugins, view helpers) | `vendor/melisplatform/melis-cms-news/config/module.config.php` |
| Arbre des outils backoffice | `vendor/melisplatform/melis-cms-news/config/app.interface.php` |
| Config du tableau de liste | `vendor/melisplatform/melis-cms-news/config/app.tools.php` |
| Service principal | `vendor/melisplatform/melis-cms-news/src/Service/MelisCmsNewsService.php` |
| Service SEO | `vendor/melisplatform/melis-cms-news/src/Service/MelisCmsNewsSeoService.php` |
| Plugins de templating | `vendor/melisplatform/melis-cms-news/src/Controller/Plugin/` |
| Configs des plugins | `vendor/melisplatform/melis-cms-news/config/plugins/` |
| Listeners (routage SEO, RGPD, workflow) | `vendor/melisplatform/melis-cms-news/src/Listener/` |
| Deltas d'installation | `vendor/melisplatform/melis-cms-news/install/dbdeploy/` |
