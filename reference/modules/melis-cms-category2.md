# MelisCmsCategory2

> Multi-site, multilingual content categories for the CMS — package `melisplatform/melis-cms-category2`.

## Purpose

MelisCmsCategory2 adds a hierarchical category system to the Melis backoffice. Categories form a
tree (each row points to a parent), carry per-language translations (name + description), can be
scoped to one or more sites, have a validity window and a status, and can hold media files. The
module also ships a front-office templating plugin to render a category tree on a page, and a
listener that feeds categories into the MelisCmsNews list plugin. It is the basis for tagging
content (notably news) by category across sites and languages.

## Enable it

It is a standard Laminas module, registered in `config/melis.module.load.php` (entry
`'MelisCmsCategory2'`). It depends on `melis-core` and `melis-cms` (per `composer.json`), and in
practice on `melis-engine` for front rendering. The module is `dbdeploy`-enabled, so its tables are
created on deploy. See [Module reference](/reference/modules) and [Build a site](/guide/build-a-site).

## Key services

Registered as service-manager aliases in `config/module.config.php`:

| Service alias | Role |
| --- | --- |
| `MelisCmsCategory2Service` | Main category service (`Service\MelisCmsCategoryService`): create/read categories, the tree and translations. |
| `MelisCmsCategory2MediaService` | Media service (`Service\MelisCmsCategoryMediaService`): per-category file storage on disk + DB. |

Notable methods on `MelisCmsCategory2Service`:

- `saveCategory($parentId, $status, $currentUserId, $validDateStart, $validDateEnd, $categoryId, $postValues)` — create/update a category (fires `melis_cms_category_save_category2_start` events).
- `saveCategoryTexts($categoryId, $catLangId, $postData, $id = null)` — save a translation row.
- `saveCategorySites($categoryId, $siteId, $id = null, $tobeDeleted = false)` — link/unlink a category to a site.
- `getCategoryById($categoryId, $langId = null, $onlyValid = false)`, `getCategoryDataById($categoryId)`, `getCategoryNameById(...)`, `getCategoryTranslationById(...)`.
- `getCategoryTreeview($fatherId = null, $langId = null, $onlyValid = false, $siteId = null)` — the recursive tree.
- `getFirstLevelCategoriesPerSite($siteId, $langId = 1)`, `getCategoriesPerSite($siteId, $langId = 1)`, `returnCategoryBasedFromSiteId(...)`.
- `reOrderCategories($parentId, $currentOrder)`, `validateDates($dateStart, $dateEnd)`.
- `getCategoryNewsList(...)` — used by the news-list integration.

`MelisCmsCategory2MediaService` handles the filesystem side: `getMediaFilesByCategoryId($categoryId, $fileType = 'file')`, `uploadFile(...)`, `deleteFile(...)`, `removeCategoryDir($categoryId)`, plus directory helpers.

## Backoffice

The tool is mounted under the CMS tools tree (`config/app.interface.php`). Top entry melisKey
`melis_cms_category_v2` opens the tool `melis_cms_categories_v2`, which forwards to module
`MelisCmsCategory2`, controller `MelisCmsCategoryList`, action `render-categories-page`. Controllers:

| Controller | Used for |
| --- | --- |
| `MelisCmsCategoryListController` | Category list, tree view, site filter, search. |
| `MelisCmsCategoryController` | The category edit form (status, translations, validity dates, sites). |
| `MelisCmsCategoryMediaController` | The Media tab and the mini media library. |
| `MelisCmsCategorySelectController` | The "select a category in a tree" modal (reused by plugins). |

The list/edit UI is built from the nested `interface` melisKeys (e.g. `melis_cms_categories_v2_list`,
`meliscategory_categories_category`, `meliscategory_category_tab_media`), and the
`MelisCmsCategorySelect` form element (`form_elements` factory `MelisCmsCategorySelectFactory`) is
used by other modules to pick a category. The tree UI uses jsTree assets shipped under `public/`.
See [Create a tool](/guide/create-a-tool).

## Front office

- **Templating plugin** `MelisCmsCategoryDisplayCategoriesPlugin` (`controller_plugins` invokable;
  config in `config/plugins/MelisCmsCategoryDisplayCategoriesPlugin.config.php`, config key
  `meliscmscategory2`). It renders a category tree on a page. Its `front()` reads `category_start`,
  `site_id` and the current plugin language, then calls `getCategoryTreeview()` /
  `returnCategoryBasedFromSiteId()` and passes `cmsCategoryTreeData` to the view. The backoffice
  edit form exposes a template select, a category-start picker (`MelisCmsCategorySelect`) and a site
  select. See [Plugins](/guide/plugins).
- **View helper** `renderTreeRec` (`View\Helper\RenderRecTreeHelper`) — recursively renders a
  category tree array in a view.
- **Listener** `MelisCmsCategoryNewsListListener` — attaches to the shared `meliscmsnews_list`
  event; when a news-list plugin carries a `categoryIdNews`, it injects the matching news into
  `newsList` via `getCategoryNewsList()`. A second listener,
  `MelisCmsCategory2FlashMessengerListener`, runs on backoffice rendering only.

## Database tables

| Table | Holds |
| --- | --- |
| `melis_cms_category2` | The category node: `cat2_id`, `cat2_father_cat_id`, `cat2_order`, `cat2_status`, `cat2_reference`, `cat2_date_valid_start/end`, creation/edit audit. |
| `melis_cms_category2_trans` | Per-language translation: `catt2_category_id`, `catt2_lang_id`, `catt2_name`, `catt2_description`. |
| `melis_cms_category2_sites` | Category-to-site link: `cats2_cat2_id`, `cats2_site_id`. |
| `melis_cms_category2_media` | Media attached to a category: `catm2_cat_id`, `catm2_type`, `catm2_path`. |

## Example

Fetch the category tree for a site and language from any controller/service:

```php
$catSvc = $this->getServiceManager()->get('MelisCmsCategory2Service');

// Recursive tree, valid categories only, scoped to a site
$tree = $catSvc->getCategoryTreeview(null, $langId, true, $siteId);

// Render it recursively in a view
echo $this->renderTreeRec($tree);
```

## Key files

| Concern | Path |
| --- | --- |
| Module config (services, controllers, plugin, view helper) | `vendor/melisplatform/melis-cms-category2/config/module.config.php` |
| Backoffice tools tree / interfaces | `vendor/melisplatform/melis-cms-category2/config/app.interface.php` |
| Main service | `vendor/melisplatform/melis-cms-category2/src/Service/MelisCmsCategoryService.php` |
| Media service | `vendor/melisplatform/melis-cms-category2/src/Service/MelisCmsCategoryMediaService.php` |
| Templating plugin | `vendor/melisplatform/melis-cms-category2/src/Controller/Plugin/MelisCmsCategoryDisplayCategoriesPlugin.php` |
| Plugin config | `vendor/melisplatform/melis-cms-category2/config/plugins/MelisCmsCategoryDisplayCategoriesPlugin.config.php` |
| View helper | `vendor/melisplatform/melis-cms-category2/src/View/Helper/RenderRecTreeHelper.php` |
| News-list listener | `vendor/melisplatform/melis-cms-category2/src/Listener/MelisCmsCategoryNewsListListener.php` |
| Module bootstrap | `vendor/melisplatform/melis-cms-category2/src/Module.php` |
| Install SQL | `vendor/melisplatform/melis-cms-category2/install/sql/setup_structure.sql` |
