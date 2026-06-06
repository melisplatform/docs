# MelisCmsNews

> News / blog posts for Melis sites, plus the front-office templating plugins that display them.
> Package `melisplatform/melis-cms-news`.

## Purpose

MelisCmsNews adds a **News** tool to the backoffice where editors create and manage news/blog
posts (title, texts, paragraphs, images, documents, categories, tags, sites, SEO and a publish /
unpublish window). Posts are surfaced on the front office through three drag-and-drop templating
plugins (latest news, news list, single news). It also ships SEO routing so each post gets its own
URL, a publication workflow (validation comments), and a GDPR auto-delete hook.

## Enable it

It is a standard Laminas module listed in `config/melis.module.load.php` (it ships enabled in the
skeleton). To toggle it, ensure `'MelisCmsNews'` is present in that array. It depends on
`melis-core`, `melis-engine`, `melis-front` and `melis-cms` (see `composer.json`), and integrates
optionally with `melis-cms-slider`, `melis-cms-category2` and `melis-cms-comments` when those are
installed. See [Module reference](/reference/modules) and [Build a site](/guide/build-a-site).

## Key services

Registered as `service_manager` aliases in `config/module.config.php`.

| Service alias | Role |
| --- | --- |
| `MelisCmsNewsService` | Main CRUD/query service for posts. Methods: `getNewsList(...)` (filter by status, lang, date window, site, search; supports paging + `count`), `getNewsById($newsId, $langId)`, `getNewsByIdArray(array $ids, $langId, $where)`, `saveNews($news, $newsId)`, `deleteNewsById($newsId)`, `getPostText($newsId)`, `getNewsDetailsPagesBySite($siteId)`. |
| `MelisCmsNewsSeoService` | Per-post SEO + URL building. Methods: `getPageLink($idPage, $newsId, $absolute)`, `getSeoData($newsId, $idPage)`, `updateTitleAndDescription($newsId, $idPage, $contentGenerated)`. |

Table gateways are also aliased: `MelisCmsNewsTable`, `MelisCmsNewsTextsTable`,
`MelisCmsNewsSeoTable`, `MelisCmsNewsCategoryTable`, `MelisCmsNewsTagsTable`.

## Backoffice

The tool is mounted under the CMS tools tree (`app.interface.php`) as section
`meliscms_news_tool_section` (icon `fa-newspaper-o`), with the list interface `meliscmsnews_list`
and the post editor `meliscmsnews`. Controllers (in `config/module.config.php`):

| Controller | Role |
| --- | --- |
| `MelisCmsNews\Controller\MelisCmsNewsList` | The list / table tool (`renderNewsListData` AJAX feed, filters, action buttons). |
| `MelisCmsNews\Controller\MelisCmsNews` | The post editor: properties, categories, tags, sites, media, texts, SEO and preview tabs. |
| `MelisCmsNews\Controller\MelisCmsNewsWorkflowComments` | Workflow validation comments / timeline for a post. |

The list table (`app.tools.php`, tool key `meliscmsnews_list_table`) shows columns `cnews_id`,
`cnews_status`, `cnews_title`, `cnews_creation_date`, `cnews_publish_date`, `cnews_unpublish_date`
and the site label, with info / delete / workflow row actions. A **DashboardLatestComments**
controller plugin extends the MelisCmsComments dashboard widget. See
[Create a tool](/guide/create-a-tool).

## Front office

Three templating plugins (controller plugins extending `MelisTemplatingPlugin`) — see
[Plugins](/guide/plugins). Each has a matching view helper alias for direct use in `.phtml`.

| Plugin (controller plugin) | XML key (`pluginXmlDbKey`) | View helper | Front template | Role |
| --- | --- | --- | --- | --- |
| `MelisCmsNewsLatestNewsPlugin` | `MelisCmsNewsLatestNews` | `MelisCmsNewsLatestPlugin` | `MelisCmsNews/latestnews` | The latest N posts for a site/page. |
| `MelisCmsNewsListNewsPlugin` | `MelisCmsNewsListNews` | `MelisCmsNewsListPlugin` | `MelisCmsNews/listnews` | Paginated/filtered list of posts. |
| `MelisCmsNewsShowNewsPlugin` | `MelisCmsNewsShowNews` | `MelisCmsNewsShowNewsPlugin` | `MelisCmsNews/shownews` | A single post (detail page). |

All three share `configPluginKey = 'meliscmsnews'`. SEO-friendly URLs and per-post meta are wired
through listeners (`MelisCmsNewsSEORouteListener`, `MelisCmsNewsRenderPageListener`,
`MelisCmsNewsMetaPageListener`, `MelisCmsNewsSeoRedirectUrlListener`), all attached in
`src/Module.php`.

## Database tables

Created by the dbdeploy deltas under `install/dbdeploy/`.

| Table | Role |
| --- | --- |
| `melis_cms_news` | Core post row (status, dates, site, relations). |
| `melis_cms_news_texts` | Per-language texts/paragraphs for a post. |
| `melis_cms_news_seo` | Per-post SEO data (title, description, URL). |
| `melis_cms_news_category` | News categories. |

## Example

Render the 3 most recent published posts of the current language directly from a view, via the
list service:

```php
// In a controller / service that has the service manager
$newsService = $sm->get('MelisCmsNewsService');
$latest = $newsService->getNewsList(
    'published',   // status
    $langId,       // langId
    null, null, null, null, // date filters
    false,         // unpublishFilter
    0, 3,          // start, limit
    'cnews_publish_date', 'DESC'
);
```

For pages, prefer dropping the **Latest news** / **News list** / **Show news** templating plugins
into a `MelisDragDropZone` rather than calling the service by hand — see [Plugins](/guide/plugins).

## Key files

| Concern | Path |
| --- | --- |
| Module config (services, controllers, plugins, view helpers) | `vendor/melisplatform/melis-cms-news/config/module.config.php` |
| Backoffice tool tree | `vendor/melisplatform/melis-cms-news/config/app.interface.php` |
| List table config | `vendor/melisplatform/melis-cms-news/config/app.tools.php` |
| Main service | `vendor/melisplatform/melis-cms-news/src/Service/MelisCmsNewsService.php` |
| SEO service | `vendor/melisplatform/melis-cms-news/src/Service/MelisCmsNewsSeoService.php` |
| Templating plugins | `vendor/melisplatform/melis-cms-news/src/Controller/Plugin/` |
| Plugin configs | `vendor/melisplatform/melis-cms-news/config/plugins/` |
| Listeners (SEO routing, GDPR, workflow) | `vendor/melisplatform/melis-cms-news/src/Listener/` |
| Install deltas | `vendor/melisplatform/melis-cms-news/install/dbdeploy/` |
