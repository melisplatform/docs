# MelisCmsBlog

> Blog system for Melis sites, with backoffice post management and three front-office display
> plugins. Package `melisplatform/melis-cms-blog`.

## Purpose

MelisCmsBlog provides a **Blog** tool in the backoffice where editors create and manage multilingual
blog posts (titles, subtitle, rich-text paragraphs, images, documents, publish/unpublish scheduling,
an optional slider, and SEO url + meta). Posts are surfaced on the front office through three
ready-to-use templating plugins: a latest-posts teaser, a paginated and filterable post list, and a
single-post detail view. SEO-friendly URLs, per-post meta tags and automatic 301 redirects to the
canonical URL are handled through dedicated event listeners.

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisCmsBlog',
];
```

Requires `melis-core` and `melis-cms` (`^5.2`), PHP `^8.1|^8.3`. Optional integrations activate
when `MelisCmsComments`, `MelisCmsSlider`, `MelisSmallBusiness`, or `MelisCmsUserAccount` are also
installed.

## Key services

Registered as `service_manager` aliases in `config/module.config.php`.

| Service alias | Role |
| --- | --- |
| `MelisCmsBlogService` | Main CRUD/query service. Read, create, update and delete posts; query by site, language, date range, status, author, category. Every method fires `*_start` / `*_end` events via `MelisEngineGeneralService`. |

Table gateway aliases: `MelisCmsBlogTable`, `MelisCmsBlogTextsTable`, `MelisCmsBlogCategoryTable`.

## Backoffice

The **Blog** tool is accessible from the left menu under **MelisCms** (`fa-rss` icon, melisKey
`meliscmsblog_left_menu`). It opens on a filterable DataTable of posts (ID, Status, Title, Created,
Published, Unpublish, Site) with per-row info, delete, and workflow actions. The post editor is
organised into tabs:

| Tab | Content |
| --- | --- |
| Properties | Publish / unpublish dates, site assignment, status toggle; optionally: Slider, User Account author, Comments validation, Workflow button |
| Medias | Up to 3 images and 3 file attachments |
| Texts | Per-language title, subtitle and rich-text paragraphs; SEO url and meta fields |
| Preview | In-iframe preview of the saved post |
| Comments | Injected by `MelisCmsComments` when installed — comment list and validation |

The **Comments** tab and the **validate comments** switch are injected via `config/comments.config.php`
when MelisCmsComments is present. Workflow actions (MelisSmallBusiness) appear in the list row and
the editor header when that module is installed.

## Front office

Three templating plugins extend `MelisTemplatingPlugin`, each with a controller plugin and a config
file under `config/plugins/`. All read the active post id from the `?blogId` query parameter.

| Plugin class | Config key | View | Config tabs |
| --- | --- | --- | --- |
| `MelisCmsBlogLatestBlogPlugin` | `MelisCmsBlogLatestBlog` | `MelisCmsBlog/latest-blog` | Properties, Filters |
| `MelisCmsBlogListBlogPlugin` | `MelisCmsBlogListBlog` | `MelisCmsBlog/blog-list` | Properties, Pagination, Filters |
| `MelisCmsBlogShowBlogPlugin` | `MelisCmsBlogShowBlog` | `MelisCmsBlog/blog-details` | Properties |

Plugin config params: `template_path`, `site_id`, `pageIdBlog` (detail page link), `column`,
`order`, `limit`, `date_min`, `date_max`, `search`; plus `nbPerPage` / `nbPageBeforeAfter`
(Blog list only). The Blog list plugin also filters by `?category` and `?authorId`. The Blog
details plugin falls back to the most recent published post when no `blogId` is in the request, and
supports preview mode (`renderMode === 'previewtab'`).

Available sort columns: `cblog_id`, `cblog_title`, `cblog_publish_date`, `cblog_creation_date`.

### SEO routing

Posts are served through a page of type **`BLOG_DETAIL`** carrying the Blog details plugin, at the
post's `cblog_seo_url`. Four listeners implement the full SEO pipeline:

| Listener | Event | Role |
| --- | --- | --- |
| `MelisCmsBlogSEOReformatToRoutePageUrlListener` | `EVENT_ROUTE` | Matches the SEO URL and builds a route to the BLOG_DETAIL page |
| `MelisBlogSEODispatchRouterRegularUrlListener` | `EVENT_DISPATCH` | 301-redirects a non-canonical URL to the post's `cblog_seo_url` |
| `MelisCmsBlogRedirect301Listener` | `meliscmsblog_redirect_page` | Sets the page's SEO meta from the post's meta fields |
| `MelisCmsBlogSEOMetaPageListener` | `EVENT_FINISH` | Rewrites the rendered `<title>` / `<meta description>` with the post's SEO meta |

`MelisCmsBlogPreviewTypeListener` registers the **BLOG_DETAIL** page type in the page-properties
form (event `modify_page_properties_form_config`).

## Database tables

Base structure in `install/sql/setup_structure.sql`; migrations in `install/dbdeploy/`.

| Table | Holds |
| --- | --- |
| `melis_cms_blog` | Core post row: status, publish/unpublish dates, site id, image1-3, documents1-3, slider id, category |
| `melis_cms_blog_texts` | Per-language texts: title, subtitle, paragraphs 1-4, lang id, SEO url, SEO meta title/description, author account |

## Example

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

## Other listeners

| Listener | Event | Purpose |
| --- | --- | --- |
| `MelisCmsBlogSliderDeletedListener` | `meliscmsslider_delete_slider_end` | Clears a deleted slider from posts (`cblog_slider_id`) |
| `MelisCmsBlogGdprAutoDeleteActionDeleteListener` | `melis_cms_user_account_gdpr_auto_delete_action_delete` | GDPR: nulls `cblog_author_account` for a deleted user account |
| `MelisCmsBlogServiceMicroServiceListener` | `melis_core_microservice_amend_data` | Turns image paths into absolute URLs in `getBlogList` results for API/microservice output |
| `SiteMenuBlogDataListener` | `MelisFrontMenuPlugin_melistemplating_plugin_end` | Feeds posts (grouped by month/year) into the front menu plugin |
| `MelisCmsBlogFlashMessengerListener` | `meliscmsblog_delete_blog_end`, `meliscmsblog_save_blog_*_end` | Flash-messenger feedback for blog actions |

## Key files

| Concern | Path |
| --- | --- |
| Module config (services, gateways, plugins, `MelisCmsBlogSelect`) | `vendor/melisplatform/melis-cms-blog/config/module.config.php` |
| Backoffice tool tree and editor tabs | `vendor/melisplatform/melis-cms-blog/config/app.interface.php` |
| List DataTable config | `vendor/melisplatform/melis-cms-blog/config/app.tools.php` |
| Comments tab injection | `vendor/melisplatform/melis-cms-blog/config/comments.config.php` |
| Plugin configs | `vendor/melisplatform/melis-cms-blog/config/plugins/` |
| Main service | `vendor/melisplatform/melis-cms-blog/src/Service/MelisCmsBlogService.php` |
| Controllers (list, editor, front) | `vendor/melisplatform/melis-cms-blog/src/Controller/` |
| Front plugins | `vendor/melisplatform/melis-cms-blog/src/Controller/Plugin/` |
| Listeners (SEO, GDPR, slider, menu, flash) | `vendor/melisplatform/melis-cms-blog/src/Listener/` |
| Table gateways | `vendor/melisplatform/melis-cms-blog/src/Model/Tables/` |
| Install SQL | `vendor/melisplatform/melis-cms-blog/install/sql/setup_structure.sql` |
| DB migrations | `vendor/melisplatform/melis-cms-blog/install/dbdeploy/` |

See also: [melis-cms](/reference/modules/melis-cms), [melis-front](/reference/modules/melis-front),
[melis-engine](/reference/modules/melis-engine), [melis-core](/reference/modules/melis-core),
[melis-cms-slider](/reference/modules/melis-cms-slider),
[melis-small-business](/reference/modules/melis-small-business)
