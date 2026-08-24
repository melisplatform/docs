# MelisCmsNews

> News / blog system for Melis sites, with backoffice authoring and three front-office display
> plugins. Package `melisplatform/melis-cms-news`.

## Purpose

MelisCmsNews provides a **News** tool in the backoffice where editors write and manage multilingual
news articles (titles, rich-text paragraphs, images, documents, publish/unpublish scheduling and
SEO). Articles are shown on the front office through three ready-to-use templating plugins: a
latest-news teaser, a paginated news list, and a single-article detail page. SEO-friendly URLs and
per-article meta tags are handled automatically through dedicated listeners.

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisCmsNews',
];
```

Requires `melis-core`, `melis-engine`, `melis-front`, and `melis-cms` (`^5.2`), plus
`laminas/laminas-paginator`. Optional integrations activate when `MelisCmsSlider`, the Melis
category module, `MelisCmsTag`, or `MelisCmsComments` are also installed.

## Key services

Registered as `service_manager` aliases in `config/module.config.php`.

| Service alias | Role |
| --- | --- |
| `MelisCmsNewsService` | Main CRUD/query service. Read, create, update and delete articles; query by site, language, date range, status. Every method fires `*_start` / `*_end` events via `MelisGeneralService`. |

Table gateway aliases: `MelisCmsNewsTable`, `MelisCmsNewsTextsTable`, `MelisCmsNewsSeoTable`,
`MelisCmsNewsCategoryTable`, `MelisCmsNewsTagsTable`.

## Backoffice

The **News** tool is accessible from the left menu under **CMS tools** (newspaper icon). It opens
on a filterable list of all articles (filter by site, search text, display limit), with per-row
info and delete actions. The post editor is organised into tabs:

| Tab | Content |
| --- | --- |
| Properties | Publish / unpublish dates and site assignment |
| Texts | Per-language title, subtitle and up to 10 rich-text paragraphs |
| Medias | Up to 3 images and 3 documents (stored under `/media/news/`) |
| SEO | Friendly URL, meta title/description, redirect and canonical |
| Preview | In-iframe preview of the saved article (available after first save) |

The **Medias** and **Preview** tabs are only available after the article has been saved for the
first time.

## Front office

Three templating plugins extend `MelisTemplatingPlugin`; each has a controller plugin, a view
helper and a config file under `config/plugins/`.

| Plugin | Controller plugin | View helper | Config tabs |
| --- | --- | --- | --- |
| Latest News | `MelisCmsNewsLatestNewsPlugin` | `MelisCmsNewsLatestPlugin` | Properties, Filters |
| News List | `MelisCmsNewsListNewsPlugin` | `MelisCmsNewsListPlugin` | Properties, Pagination, Filters |
| News Detail | `MelisCmsNewsShowNewsPlugin` | `MelisCmsNewsShowNewsPlugin` | Properties |

Plugin config params: `template_path`, `site_id`, `pageIdNews` (detail page link), `column`,
`order`, `limit`, `date_min`, `date_max`, `search`, plus `nbPerPage` / `nbPageBeforeAfter` (News
List only). Config is persisted in the page XML via `loadDbXmlToPluginConfig()` /
`savePluginConfigToXml()`.

SEO routing and per-article meta tags are wired in `src/Module.php` via:
`MelisCmsNewsSEORouteListener`, `MelisCmsNewsRenderPageListener`, `MelisCmsNewsMetaPageListener`,
`MelisCmsNewsSeoRedirectUrlListener`.

## Database tables

Base structure in `install/sql/setup_structure.sql`; migrations in `install/dbdeploy/`.

| Table | Holds |
| --- | --- |
| `melis_cms_news` | Core article row: status, publish/unpublish dates, site, image1-3, documents1-3, slider id |
| `melis_cms_news_texts` | Per-language texts: title, subtitle, paragraphs 1-10, paragraph order, lang |
| `melis_cms_news_seo` | Per-language SEO: URL, redirect, 301 flag, meta title/description, canonical |
| `melis_cms_news_category` | Article ↔ category link (optional category feature) |

## Example

```php
$news = $this->getServiceManager()->get('MelisCmsNewsService');

// Latest 10 published articles for site 1, French, newest first:
$list = $news->getNewsList(
    status: 1, langId: 1, start: 0, limit: 10,
    orderColumn: 'cnews_publish_date', order: 'DESC', siteId: 1
);

// Fetch one article (all languages, or one language):
$all = $news->getNewsById(42);
$fr  = $news->getNewsById(42, 1);

// Create / update / delete:
$id = $news->saveNews($data, $newsId);   // $newsId null → create
$ok = $news->deleteNewsById(42);         // also removes texts + SEO rows

// Utility:
$txt  = $news->getPostText(42);
$pages = $news->getNewsDetailsPagesBySite(1);  // NEWS_DETAIL-type pages for a site
```

Hook into a service event to extend behaviour (e.g. ping a search index after save):

```php
$sharedEvents->attach('MelisCmsNews', 'melis_cms_news_save_news_end', function ($e) {
    $params = $e->getParams(); // includes 'news', 'newsId', 'results'
}, 50);
```

Other event identifiers follow the same `melis_cms_news_[method]_start/end` pattern:
`melis_cms_news_get_news_list_*`, `melis_cms_news_get_news_by_id_*`,
`melis_cms_news_get_news_by_id_array_*`, `melis_cms_news__delete_news_by_id_*` (double
underscore), `melis_cms_news_get_post_text_*`, `melis_cms_news_get_news_details_pages_*`.

## Micro-services

`config/app.microservice.php` exposes `getNewsList` and `getNewsById` over the Melis
micro-service bus with auto-generated forms and input filters. Form factories `MelisCmsNewsSelect`
and `MelisCmsNewsBOSelect` are in `src/Form/Factory/`.

## Key files

| Concern | Path |
| --- | --- |
| Module config (services, gateways, plugins, view helpers) | `vendor/melisplatform/melis-cms-news/config/module.config.php` |
| Backoffice tool tree | `vendor/melisplatform/melis-cms-news/config/app.interface.php` |
| List table config | `vendor/melisplatform/melis-cms-news/config/app.tools.php` |
| Micro-service config | `vendor/melisplatform/melis-cms-news/config/app.microservice.php` |
| Plugin configs | `vendor/melisplatform/melis-cms-news/config/plugins/` |
| Main service | `vendor/melisplatform/melis-cms-news/src/Service/MelisCmsNewsService.php` |
| Front plugins | `vendor/melisplatform/melis-cms-news/src/Controller/Plugin/` |
| View helpers | `vendor/melisplatform/melis-cms-news/src/View/Helper/` |
| Listeners (SEO, GDPR, slider cleanup) | `vendor/melisplatform/melis-cms-news/src/Listener/` |
| Table gateways | `vendor/melisplatform/melis-cms-news/src/Model/Tables/` |
| Install SQL | `vendor/melisplatform/melis-cms-news/install/sql/setup_structure.sql` |
| DB migrations | `vendor/melisplatform/melis-cms-news/install/dbdeploy/` |

See also: [melis-cms](/legacy/reference/modules/melis-cms), [melis-front](/legacy/reference/modules/melis-front),
[melis-engine](/legacy/reference/modules/melis-engine), [melis-core](/legacy/reference/modules/melis-core)
