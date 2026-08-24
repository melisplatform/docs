# MelisCmsCategory2

> Multi-site, multilingual content categories for the CMS — package `melisplatform/melis-cms-category2`.

## Purpose

MelisCmsCategory2 provides a hierarchical category system in the Melis backoffice. Categories form
a tree (each node points to a parent), carry per-language translations (name and description), can
be scoped to one or more sites, have a validity window and a status, and can hold media files. The
module ships a front-office templating plugin to render a category tree on a page and a reusable
category picker embedded by other modules (e.g. News, Commerce) to classify their records.

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisCmsCategory2',
];
```

Requires `melis-core` and `melis-cms` (`^5.2`). The module is `dbdeploy`-enabled so its tables are
created on deploy. `melis-engine` is also needed for front rendering.

## Key services

| Service alias | Role |
| --- | --- |
| `MelisCmsCategory2Service` | Main category service: create/read category nodes, tree retrieval, translations and site links. |
| `MelisCmsCategory2MediaService` | Per-category file storage on disk and in the database. |

Notable methods on `MelisCmsCategory2Service`:

- `getCategoryTreeview($fatherId, $langId, $onlyValid, $siteId)` — recursive tree.
- `getCategoryById($categoryId, $langId, $onlyValid)` — full category node.
- `getCategoryNameById($categoryId, $langId)` — name lookup.
- `getCategoryListByIdRecursive(...)` — flat recursive list.
- `getCategoryTranslationById(...)` — single translation row.
- `getFirstLevelCategoriesPerSite($siteId, $langId)`, `getCategoriesPerSite($siteId, $langId)`.
- `getCategoryMediaById(...)` — media rows for a node.
- `saveCategory(...)` — create or update a node.
- `saveCategoryTexts($categoryId, $catLangId, $postData, $id)` — save a translation row.
- `saveCategorySites($categoryId, $siteId, $id, $toDelete)` — link or unlink a site.
- `reOrderCategories($parentId, $currentOrder)` — persist drag-reorder.
- `validateDates($dateStart, $dateEnd)`.

`MelisCmsCategory2MediaService` handles the filesystem side: `uploadFile`, `deleteFile`,
`getMediaFilesByCategoryId`, `getFilesInDir`, `removeCategoryDir`.

## Backoffice

The Category manager is accessible from the CMS tools section of the backoffice left menu
(`fa-th-list` icon). It shows catalogs as an accordion, each holding its jsTree of categories,
with a search box and a site filter. Controllers:

| Controller | Used for |
| --- | --- |
| `MelisCmsCategoryListController` | Category list, tree view, site filter, search, add catalog/category. |
| `MelisCmsCategoryController` | The category edit form (translations, status, validity dates, sites). |
| `MelisCmsCategoryMediaController` | The Media tab — browse, upload, delete category media. |
| `MelisCmsCategorySelectController` | The "select a category" picker modal, reused by other modules. |

The `MelisCmsCategorySelect` form element (factory `MelisCmsCategorySelectFactory`) lets any
module embed a category picker in its own forms.

## Front office

- **Templating plugin** `MelisCmsCategoryDisplayCategoriesPlugin` — renders a category tree on a
  page. Configuration (`config/plugins/MelisCmsCategoryDisplayCategoriesPlugin.config.php`) exposes
  one Properties tab with three fields: `template_path`, `site_id`, `category_start`. Default
  template: `MelisCmsCategory2/default` (`view/.../plugins/default.phtml`).
- **View helper** `renderTreeRec` — recursively renders a category tree array inside a view.

Hardcoded usage:

```php
$display = $this->MelisCmsCategoryDisplayCategoriesPlugin();
echo $display->render([
    'template_path' => ['MelisCmsCategory2/default'],
    'site_id'        => 1,
    'category_start' => 1,
]);
```

## Database tables

| Table | Holds |
| --- | --- |
| `melis_cms_category2` | Category node: `cat2_id`, `cat2_father_cat_id`, order, status, reference, validity dates, audit. |
| `melis_cms_category2_trans` | Per-language translation: name and description, keyed by `catt2_id`. |
| `melis_cms_category2_sites` | Category-to-site link, keyed by `cats2_id`. |
| `melis_cms_category2_media` | Media attached to a category: `catm2_type`, `catm2_path`, `catm2_cat_id`. |

A seed root node (`cat2_id = 1`, "My catalog" / "Mon catalogue") is inserted on install.

## Example

Fetch and render the category tree from any controller or service:

```php
$cat = $this->getServiceManager()->get('MelisCmsCategory2Service');

// Recursive tree — valid categories only, scoped to a site
$tree = $cat->getCategoryTreeview($fatherId, $langId, true, $siteId);

// Single node with translations
$node = $cat->getCategoryById($categoryId, $langId, false);

// Name lookup
$name = $cat->getCategoryNameById($categoryId, $langId);

// All categories for a site
$site = $cat->getCategoriesPerSite($siteId, $langId);
```

## Key files

| Concern | Path |
| --- | --- |
| Module config (services, controllers, plugin, view helper) | `vendor/melisplatform/melis-cms-category2/config/module.config.php` |
| Backoffice tools tree / interfaces | `vendor/melisplatform/melis-cms-category2/config/app.interface.php` |
| Main service | `vendor/melisplatform/melis-cms-category2/src/Service/MelisCmsCategoryService.php` |
| Media service | `vendor/melisplatform/melis-cms-category2/src/Service/MelisCmsCategoryMediaService.php` |
| Category picker form element factory | `vendor/melisplatform/melis-cms-category2/src/Form/Factory/MelisCmsCategorySelectFactory.php` |
| Templating plugin | `vendor/melisplatform/melis-cms-category2/src/Controller/Plugin/MelisCmsCategoryDisplayCategoriesPlugin.php` |
| Plugin config | `vendor/melisplatform/melis-cms-category2/config/plugins/MelisCmsCategoryDisplayCategoriesPlugin.config.php` |
| Install SQL | `vendor/melisplatform/melis-cms-category2/install/sql/` |

See also: [melis-cms](/legacy/reference/modules/melis-cms), [melis-core](/legacy/reference/modules/melis-core), [melis-cms-news](/legacy/reference/modules/melis-cms-news)
