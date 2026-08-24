# MelisEngine

> Shared CMS data foundation — page model, sites, languages, templating-plugin base class and the render cache. Package `melisplatform/melis-engine`.

## Purpose

MelisEngine owns the entire CMS database model (pages, page tree, sites, templates, languages,
domains, SEO, styles) and exposes it through table gateways, services and a multi-tier cache.
Both [MelisFront](/legacy/reference/modules/melis-front) (front-end rendering) and
[MelisCms](/legacy/reference/modules/melis-cms) (back-office editing) read and write exclusively
through MelisEngine — neither sibling owns tables. It also defines
`MelisTemplatingPlugin`, the abstract base class every content plugin in the platform extends.

## Enable it

MelisEngine is loaded automatically as a dependency. Load order in
`config/melis.module.load.php` is:

```php
// config/melis.module.load.php
return [
    'MelisCore',
    'MelisFront',
    'MelisEngine',   // requires melis-core + melis-front
    'MelisCms',
];
```

Composer dependencies: `melisplatform/melis-core`, `melisplatform/melis-front`,
`laminas/laminas-cache` (filesystem + memory adapters).

## Key services

Registered as `service_manager` aliases in `config/module.config.php`:

| Service alias | Role |
| --- | --- |
| `MelisEnginePage` / `MelisPageService` | Resolve a page by id and mode (`published` / `saved`): `getDatasPage($idPage, $mode)` — returns hydrated page tree, page data, SEO, template and style objects |
| `MelisEngineTree` / `MelisTreeService` | Page tree navigation: `getPageChildren()`, `getPageFather()`, `getPageBreadcrumb()`, `getPageLink()`, search |
| `MelisEngineTemplateService` | Template lookup: `getTemplate($tplId)` |
| `MelisEngineSiteService` | Site catalogue |
| `MelisEngineSiteDomainService` | Domain → site resolution: `getSiteByDomain()` |
| `MelisEngineLang` / `MelisEngineLangService` | Languages: available languages, locale ↔ id, site language |
| `MelisEngineSEOService` | Per-page SEO data: `getSEOById()` |
| `MelisEnginePageDefaultUrlsService` | Pre-computed / canonical page URL lookups |
| `MelisEngineStyle` / `MelisEngineStyleService` | Site styles and per-page CSS |
| `MelisEngineCacheSystem` | Cache orchestrator: `getCacheByKey()`, `setCacheByKey()`, `deleteCacheByPrefix()` |
| `MelisSearch` | Full-text (Lucene-style) page index used by front-end search |
| `MelisEngineSendMail` | Email utility |
| `MelisGdprService` / `MelisGdprAutoDeleteService` | GDPR banner texts and auto-delete framework |
| `MelisEngineComposer` | Composer / dependency operations |

All services that extend `MelisGeneralService` fire `*_start` / `*_end` events (e.g.
`melisengine_service_get_available_languages_start` / `_end`) that other modules can hook.

## Backoffice

MelisEngine has no end-user tool of its own. It registers two form-element factories used
across the back-office:

| Factory | Purpose |
| --- | --- |
| `MelisEnginePluginTemplateSelect` | Template select element for plugin forms |
| `MelisEngineSiteSelect` | Site select element for plugin forms |

Setup and maintenance controllers (`MelisSetup*`) are also present but are invoked by the
installer, not by editors.

## Front office

The base class for every content plugin lives here:

| Item | Description |
| --- | --- |
| `MelisEngine\Controller\Plugin\MelisTemplatingPlugin` | Abstract base for all content plugins. Defines `front()` (live render, abstract), `back()` (back-office container/edit view), config XML persistence (`loadDbXmlToPluginConfig()` / `savePluginConfigToXml()`), GET/POST loading, preview mode and responsive width. |

Every platform content plugin (News, Slider, Menu, Breadcrumb, …) subclasses this. Implement
`front()` for live output; the base handles `back()` automatically.

Two micro-service listeners hook `melis_core_microservice_amend_data` to expose tree and page
methods (`getPageChildren`, `getPageFather`, `getDomainByPageId`, `getDatasPage`) over the
platform micro-service layer.

## Database tables

MelisEngine is the single source of truth for the CMS schema
(`install/sql/setup_structure.sql` + `install/dbdeploy/` deltas):

| Table | Holds |
| --- | --- |
| `melis_cms_page_tree` | Page hierarchy (`tree_father_page_id`, order) |
| `melis_cms_page_published` | Published (live) version of each page |
| `melis_cms_page_saved` | Saved / draft version (edited in the back-office) |
| `melis_cms_page_lang` | Page ↔ language links |
| `melis_cms_lang` | CMS languages / locales |
| `melis_cms_site` | Sites (root of the page tree) |
| `melis_cms_template` | Templates (layout / controller / action or PHP path) |
| `melis_cms_page_seo` | Per-page SEO (URL, 301 redirect, meta title/description, canonical) |
| `melis_cms_site_domain` | Site domains per environment |
| `melis_cms_site_301` / `melis_cms_site_404` | Site-wide 301 redirects / 404 mapping |
| `melis_cms_page_default_urls` | Pre-computed page URLs (cache table) |
| `melis_cms_style` / `melis_cms_page_style` | CSS styles and page ↔ style links |
| `melis_cms_platform_ids` | Page-id allocation ranges per environment |
| `melis_cms_site_config` / `_home` / `_langs` | Site config, home page per language, active languages |
| `melis_cms_site_robot` | robots.txt per domain |
| `melis_cms_mini_tpl_*` | Mini-template categories, templates and flags |
| `melis_cms_gdpr_texts` | GDPR banner texts per site / language |
| `melis_site_translation` / `_text` | Site-wide translation strings |

### Table gateways

Every table is wrapped by a `MelisEngineTable*` gateway registered in the service manager
(e.g. `MelisEngineTablePageTree`, `MelisEngineTablePagePublished`, `MelisEngineTablePageSeo`).
Other modules must always use these gateways — never raw SQL. The base gateway provides
`getEntryById()`, `getEntryByField()`, `save()`, `deleteById()`, `fetchAll()`.

## Example

**Read a page and navigate the tree:**

```php
$pageSvc = $sm->get('MelisEnginePage');
$page    = $pageSvc->getDatasPage($idPage);            // 'published' (live) by default
$draft   = $pageSvc->getDatasPage($idPage, 'saved');   // working draft

$tree       = $sm->get('MelisEngineTree');
$children   = $tree->getPageChildren($idPage, 1);       // 1 = published only
$breadcrumb = $tree->getPageBreadcrumb($idPage);
$url        = $tree->getPageLink($idPage, true);        // true = absolute URL
```

**Read/write through a table gateway (never raw SQL):**

```php
$seoTable = $sm->get('MelisEngineTablePageSeo');
$seo      = $seoTable->getEntryByField('plang_page_id', $idPage)->current();
$seoTable->save(['seo_meta_title' => 'New title'], $existingSeoId);  // upsert
```

**Cache a computed result:**

```php
$cache = $sm->get('MelisEngineCacheSystem');
$cache->setCacheByKey('mykey', 'my_cache_config', $value);
$value = $cache->getCacheByKey('mykey', 'my_cache_config');
$cache->deleteCacheByPrefix('page_' . $idPage, 'meliscms_page');   // invalidate a page
```

**Listen to a service event:**

```php
$sharedEvents->attach('MelisEngine', 'melisengine_page_getdatas_end', function ($e) {
    $p = $e->getParams();   // includes page id and 'results'
    // alter $p['results'] before it is returned
}, 50);
```

**Build a content plugin:**

```php
// Subclass MelisTemplatingPlugin, implement front() for live render.
// The base class handles back() (BO container), config XML persistence and preview.
class MyPlugin extends MelisEngine\Controller\Plugin\MelisTemplatingPlugin
{
    public function front(): string
    {
        return $this->getView()->render('my-module/plugin/my-plugin', $this->pluginConfig);
    }
}
```

## Key files

| Concern | Path |
| --- | --- |
| Service & gateway aliases, caches | `vendor/melisplatform/melis-engine/config/module.config.php` |
| Page data service | `vendor/melisplatform/melis-engine/src/Service/MelisPageService.php` |
| Tree / links service | `vendor/melisplatform/melis-engine/src/Service/MelisTreeService.php` |
| Cache orchestrator | `vendor/melisplatform/melis-engine/src/Service/` (`MelisEngineCacheSystem*`) |
| Templating-plugin base class | `vendor/melisplatform/melis-engine/src/Controller/Plugin/MelisTemplatingPlugin.php` |
| Table gateways | `vendor/melisplatform/melis-engine/src/Model/Tables/` |
| Schema + delta migrations | `vendor/melisplatform/melis-engine/install/sql/` |

See also: [MelisFront](/legacy/reference/modules/melis-front) · [MelisCms](/legacy/reference/modules/melis-cms) · [MelisCore](/legacy/reference/modules/melis-core)
