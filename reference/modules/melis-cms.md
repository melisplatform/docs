# MelisCms

> The CMS backoffice — sites, page tree, page editor, templates, styles and SEO.
> Package `melisplatform/melis-cms`.

## Purpose

`MelisCms` is the backoffice orchestration layer for building and running websites on the Melis
platform. It provides the site tree, the page editor (Edition, Properties, SEO, Languages tabs),
drag-and-drop plugin zones for composing page content, and administration tools for sites,
templates, styles, languages, platform IDs, domains and site redirects. It **owns no database
tables** — it reads and writes everything through [melis-engine](/reference/modules/melis-engine),
and page rendering (including the live editing preview) is handled by
[melis-front](/reference/modules/melis-front).

## The MelisCms / MelisFront / MelisEngine trio

These three modules form one tightly coupled system. A change or question about any one of them
routinely involves the others.

- **MelisEngine** — owns the entire CMS database model (pages, tree, sites, templates, languages,
  SEO, styles) and exposes it via table gateways, services and a filesystem cache. Also defines
  `MelisTemplatingPlugin`, the base class every content block extends.
- **MelisFront** — front-office rendering pipeline; turns a URL into a finished page and also
  powers the live editable preview inside the backoffice (`renderMode/melis`).
- **MelisCms** *(this module)* — the backoffice UI layer; drives the page lifecycle by firing events
  that engine and front listeners handle.

**Load order:** `melis-core` → `melis-front` → `melis-engine` → `melis-cms`.

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisCms',
];
```

Requires `melisplatform/melis-core`, `melisplatform/melis-engine` and `melisplatform/melis-front`
(declared in its `composer.json`). It has no install SQL of its own; the CMS schema is part of
melis-engine.

## Key services

Resolve with `$sm->get('<alias>')`.

| Service alias | Role |
| --- | --- |
| `MelisCmsPageService` | Write the page model: `savePage()`, `savePagePublished()`, `savePageSaved()`, `savePageSeo()`, `savePageLang()`, `savePageStyle()`, `savePageTree()`, `saveProperties()`. |
| `MelisCmsSiteService` | Site CRUD and page-per-site queries. |
| `MelisCmsPageGetterService` | `getPageContent($pageId)` — returns cached rendered HTML of a page. |
| `MelisCmsRights` | Back-office permission checks: `isAccessible()`, `isActionButtonActive()`. |
| `MelisCmsSitesDomainsService` | Per-environment domain management. |
| `MelisCmsSitesPropertiesService` | Site-wide key/value settings (Site config tab). |
| `MelisCmsSiteModuleLoadService` | Per-site module loading (Module loading tab). |
| `MelisCmsMiniTemplateService` / `MelisCmsMiniTemplateGetterService` | Mini-template library and category management. |
| `MelisCmsPageExportService` / `MelisCmsPageImportService` | Export/import a page tree as a file. |

## Backoffice

`MelisCms` registers the full CMS section of the backoffice. Interface tree in
`config/app.interface.php` / `config/app.tools.php`. Main tool entries:

| melisKey | Tool |
| --- | --- |
| `meliscms_sitetree` | Site tree explorer + page editor. |
| `meliscms_tool_sites` | Sites (create/edit, domains, languages, module loading, config, translations). |
| `meliscms_tool_templates` | Templates manager. |
| `meliscms_tool_styles` | Styles manager. |
| `meliscms_tool_language` | Languages (master list). |
| `meliscms_tool_platform_ids` | Platform IDs (per-environment ID ranges). |
| `meliscms_tool_site_301` | Site redirects. |
| `meliscms_mini_template_manager` | Mini-template library + category menu manager. |

Page editor controllers: `PageController`, `PageEditionController`, `PagePropertiesController`,
`PageSeoController`, `PageLanguagesController`, `PageDuplicationController`,
`PageExportController`, `PageImportController`. Plugin menu and drag-and-drop modals:
`FrontPluginsController`, `FrontPluginsModalController`.

### Dashboard widget

`MelisCmsPagesIndicatorsPlugin` — shows site and page counts (published vs not) on the
backoffice dashboard.

## Database tables

`MelisCms` owns no tables. The CMS schema is defined in melis-engine and accessed via its
gateways and services. Never query the CMS tables directly — use the engine
gateways/services so caching and the rest of the ecosystem stay consistent.

## Page lifecycle events

The page lifecycle is implemented through 19 listeners wired in `Module.php::onBootstrap`. These
events are the primary extension point — hook them instead of calling `MelisCmsPageService`
directly so history, caches and other modules stay in sync.

| Action | Events |
| --- | --- |
| Save draft | `meliscms_page_save_start` / `_end` (+ `…savetree_*`, `…saveproperties_*`, `…saveedition_*`, `…saveseo_*`) |
| Publish | `meliscms_page_publish_start` / `_end` |
| Unpublish | `meliscms_page_unpublish_start` / `_end` |
| Delete | `meliscms_page_delete_start` / `_end` (+ `…deleteseo_*`, `…delete_page_*`) |
| Move | `meliscms_page_move_start` / `_end` |
| Duplicate | `meliscms_page_duplicate_start` / `_end` |
| Plugin session | `meliscms_page_savesession_plugin_*`, `meliscms_page_removesession_plugin_*` |

Two additional hooks extend the page editor itself:

- **`melis_cms_page_tabs_alter`** — add or remove tabs in the page editor (used by the Historic
  and Script Editor modules).
- **`modify_page_properties_form_config`** — alter the Properties form to add custom fields.

## Example

### React to a page being published

```php
// In your Module.php::onBootstrap (or a listener's attach())
$sharedEvents = $eventManager->getSharedManager();
$sharedEvents->attach(
    'MelisCms',                       // identifier MelisCms fires under
    'meliscms_page_publish_end',
    function (\Laminas\EventManager\EventInterface $e) {
        $params = $e->getParams();
        $idPage = $params['idPage'] ?? null;
        // log, sync, clear a custom cache, notify…
    },
    50                                 // priority
);
```

### Read page data (via engine services)

```php
$sm = $this->getServiceManager();

// Full page data (published or draft)
$pageSvc   = $sm->get('MelisEnginePage');
$published = $pageSvc->getDatasPage($idPage);              // live
$draft     = $pageSvc->getDatasPage($idPage, 'saved');    // working draft

// Tree helpers
$tree      = $sm->get('MelisEngineTree');
$children  = $tree->getPageChildren($idPage, 1);           // 1 = published only
$url       = $tree->getPageLink($idPage, true);            // absolute URL
```

### Invalidate the page cache after an out-of-band mutation

```php
$cache = $sm->get('MelisEngineCacheSystem');
$cache->deleteCacheByPrefix('page_' . $idPage, 'meliscms_page');
```

## Adding a new content block

Every content block extends `MelisTemplatingPlugin` (defined in melis-engine). Implement
`front()` to render on the live site and `back()` to render the edit container, then register
the plugin. The News, Slider and Category2 modules are reference implementations — see their
docs for full examples.

## Key files

| Concern | Path |
| --- | --- |
| Module bootstrap + listener wiring | `vendor/melisplatform/melis-cms/src/Module.php` |
| Services, controllers, form factories | `vendor/melisplatform/melis-cms/config/module.config.php` |
| Backoffice interface tree | `vendor/melisplatform/melis-cms/config/app.interface.php` |
| Tool configs (DataTable, forms) | `vendor/melisplatform/melis-cms/config/app.tools.php` |
| Page service | `vendor/melisplatform/melis-cms/src/Service/MelisCmsPageService.php` |
| Site service | `vendor/melisplatform/melis-cms/src/Service/MelisCmsSiteService.php` |
| Rights service | `vendor/melisplatform/melis-cms/src/Service/MelisCmsRightsService.php` |
| Page getter (cache) | `vendor/melisplatform/melis-cms/src/Service/MelisCmsPageGetterService.php` |
| All listeners (19) | `vendor/melisplatform/melis-cms/src/Listener/` |
| Plugin menu controller | `vendor/melisplatform/melis-cms/src/Controller/FrontPluginsController.php` |
| Dashboard widget | `vendor/melisplatform/melis-cms/src/Controller/DashboardPlugins/MelisCmsPagesIndicatorsPlugin.php` |

## See also

- [melis-engine](/reference/modules/melis-engine) — owns the CMS data model and all table gateways.
- [melis-front](/reference/modules/melis-front) — front-office rendering and live preview.
- [melis-core](/reference/modules/melis-core) — auth, rights, events and base config.
