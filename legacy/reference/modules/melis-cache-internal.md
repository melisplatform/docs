# MelisCacheInternal

> Full-page HTTP cache for the CMS front-office, with partial (zone) caching and per-page exclusions.
> Package `melisplatform/melis-cache-internal`.

## Purpose

`MelisCacheInternal` is a performance layer that sits in front of MelisFront's render pipeline. It
stores the fully-rendered HTML (as a serialised HTTP Response) of a published page and serves it on
subsequent visits, skipping the entire render. Individual plugins on a page can be configured to
refresh on a shorter TTL (partial/zone caching) while the rest of the page remains cached. Pages are
automatically invalidated on publish, unpublish or delete, and an audit log of manual cache clears is
kept for three months. This module is distinct from MelisEngine's general key/value object cache —
it is specifically an HTTP full-page cache.

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisCacheInternal',
];
```

Requires `melisplatform/melis-cms` (`^5.2`) and PHP `^8.1|^8.3`. The module ships database
migrations (`dbdeploy: true`) that must be applied on first install.

## Key services

Registered under `service_manager` in `config/module.config.php`. Resolve with `$sm->get('<alias>')`.

| Service alias | Role |
| --- | --- |
| `MelisCacheInternalService` | Full-page cache operations: `getCacheConfig()`, `getPageCacheByPageIdAndType($pageId, $uri, $methodType)`, `getPageCacheByUrl()`, `saveItem()`, `deleteCacheByPageId()`, `deleteCacheByUrl()`, `deleteCacheByPageIdOrByUrl()`, `deleteAllCache()`, `getMelisCacheSize()`, `hasCache()`. Fires `melis_cache_internal_*_start`/`_end` events. |
| `PartialCachingService` | Partial/zone cache management: `getLists()`, `savePartialCaching()`, `deletePartialCaching()`, `getPartialCachingByCode()`, `searchPartialCachingByCode()`, and `processedZoneCaching($uri, $response, $pageId, $type)` — the zone-refresh engine that re-renders only expired zones on a cache hit. |

## Request cycle mechanism

Listeners are attached by render mode in `Module.php`:

| Listener | Event | Role |
| --- | --- | --- |
| `MelisCacheInternalPageGetCacheListener` | `MvcEvent::EVENT_DISPATCH` (priority 10) | **Serve** — on a cache hit, outputs the stored response and short-circuits the render (adds `Melis-Cache: Hit` header). |
| `MelisCacheInternalPageSaveCacheListener` | `MvcEvent::EVENT_FINISH` (priority -1001) | **Store** — after render, saves a 200 response into cache. |
| `MelisCacheInternalViewResultListener` | `melisengine_melistemplating_view_result_plugin_end` | Wraps each plugin's output with partial-cache metadata (`data-pcache-code`, `data-pcache-gendate`, plugin name/id/dbkey). |
| `MelisCacheInternalCmsPageListener` | `meliscms_page_publish_end` / `…_unpublish_end` / `…_delete_end` | **Invalidate** the page's cache and persist partial-plugin config into the page. |
| `MelisCacheInternalDeleteCacheListener` | `melis_cache_delete_cache` | Invalidate on demand by `pageId` or `pageUrl`. |
| `MelisCacheInternalSaveEditionSessionListener` | `meliscms_page_savesession_plugin_start` | Stash a plugin's partial-cache config in session for publish. |
| `MelisCacheInternalGetPluginParametersListener` | `melistemplating_plugin_update_parameters` | Inject partial-cache settings into a plugin's backoffice edit form. |
| `MelisCacheInternalPartialCachingFormConfigListener` | `ModuleEvent::EVENT_LOAD_MODULES_POST` | Add the partial-caching form tab to every front plugin's modal. |
| `MelisCacheInternalFlashMessengerListener` | `meliscacheinternal_save_cache_end` | Flash-messenger and activity logging. |

**Cache key** = `page id + normalised URL + request method` (1 = GET, 2 = POST). Normalised URL means
URL parameters listed in `melis_cache_url_parameters` are stripped before keying, so tracking
parameters such as `utm_source` do not fragment the cache. The cached value (`mc_cache_content`) is a
serialised HTTP Response (body + headers), not a raw HTML blob. All devices share the same cached
response (responsive layout is assumed).

## Partial (zone) caching

A fully-cached page can keep individual plugins fresh at a shorter TTL:

- `MelisCacheInternalViewResultListener` wraps each plugin's output with `data-pcache-*` metadata
  (cache code and generation date) at render time.
- On a cache **hit**, `PartialCachingService::processedZoneCaching()` parses those markers and, for
  each zone whose TTL has elapsed, re-renders only that zone. Type `PLUGIN` re-renders the templating
  plugin; type `MANUAL` forwards to a configured `module/controller/action`.
- A **partial cache code** (`melis_cache_partial_codes`) defines the zone's type, code, TTL
  (`mcpc_time`), and the MANUAL target.
- A **main plugin** config (`melis_cache_partial_general_site_plugins`) is a site-wide base that
  propagates to all pages; `_exclusion` rows exclude a plugin from caching on a given page.

## Backoffice

Located under **Left menu → MelisCms → Melis Cache** (`fa fa-bookmark`). The tool has four tabs:

| Tab | melisKey | Content |
| --- | --- | --- |
| Properties | `MelisCacheInternal_content_main_tab` | Global config (activate toggle, TTL, GET/POST request types), current cache size, and the per-page exclusion tree. |
| Partial Caching | `…_partial_caching_tab` | Manage partial cache codes (code, type, module/controller/action, lifetime). DataTable: `meliscacheinternal_partial_caching`. |
| URL Parameters | `…_cache_url_parameters_tab` | Manage ignored query parameters. DataTable: `meliscacheinternal_cache_url_parameters`. |
| Cache Clearing | `…_cache_clearing_tab` | Manual clear by URL and the clearing-logs audit table (kept 3 months). DataTable: `meliscacheinternal_cache_clearing_logs`. |

Controllers: `MelisCacheInternalController`, `PartialCachingController`, `UrlParametersController`,
`ClearingLogsController`, `MelisCachePageExclusionController`.

## Database tables

| Table | Holds |
| --- | --- |
| `melis_cache` | Cache entries: `mc_page_id`, `mc_cache_url` (normalised), `mc_cache_content` (serialised Response), `mc_cache_date`, `mc_cache_method_type` (1 GET / 2 POST). |
| `melis_cache_config` | Global config: `mcc_active`, `mcc_time` (TTL seconds), `mcc_request_type` (GET, POST). |
| `melis_cache_exclusions` | Per-page exclusions: `mce_page_id`, `mce_request_get`, `mce_request_post`. |
| `melis_cache_partial_codes` | Partial cache zone rules: `mcpc_type` (MANUAL/PLUGIN), `mcpc_code`, `mcpc_time` (TTL), `mcpc_module/controller/action`. |
| `melis_cache_partial_general_site_plugins` | Site-wide main-plugin configs: `mcpg_site_id`, `mcpg_page_id`, `mcpg_plugin_*`, `mcpg_cache_code`. |
| `melis_cache_partial_general_site_plugins_exclusion` | Per-page plugin exclusions from caching. |
| `melis_cache_url_parameters` | Ignored query-parameter names (`mcup_name`). |
| `melis_cache_clearing_logs` | Audit log: `mccl_cache_url`, `mccl_user_id`, `mccl_clearing_date`. |

## Example

Delete the cache for a specific page programmatically:

```php
// In a controller or service with the service manager available
$cacheSrv = $sm->get('MelisCacheInternalService');

// Invalidate by page ID
$cacheSrv->deleteCacheByPageId($pageId);

// Invalidate by URL
$cacheSrv->deleteCacheByUrl('/my-page');

// Check whether a cached entry exists
$hasCache = $cacheSrv->hasCache($pageId, $normalisedUrl, $methodType); // 1=GET, 2=POST
```

## Key files

| Concern | Path |
| --- | --- |
| Module bootstrap (listener wiring) | `vendor/melisplatform/melis-cache-internal/src/Module.php` |
| Module config (services, controllers, table aliases) | `vendor/melisplatform/melis-cache-internal/config/module.config.php` |
| Backoffice tool tree | `vendor/melisplatform/melis-cache-internal/config/app.toolstree.php` |
| DataTable definitions | `vendor/melisplatform/melis-cache-internal/config/app.tools.php` |
| Full-page cache service | `vendor/melisplatform/melis-cache-internal/src/Service/MelisCacheInternalService.php` |
| Partial/zone cache service | `vendor/melisplatform/melis-cache-internal/src/Service/PartialCachingService.php` |
| Serve listener (cache hit) | `vendor/melisplatform/melis-cache-internal/src/Listener/MelisCacheInternalPageGetCacheListener.php` |
| Store listener (cache save) | `vendor/melisplatform/melis-cache-internal/src/Listener/MelisCacheInternalPageSaveCacheListener.php` |
| CMS page invalidation listener | `vendor/melisplatform/melis-cache-internal/src/Listener/MelisCacheInternalCmsPageListener.php` |
| Database migrations | `vendor/melisplatform/melis-cache-internal/install/dbdeploy/` |

## See also

- [melis-cms](/legacy/reference/modules/melis-cms) — the CMS whose publish events trigger cache invalidation.
- [melis-front](/legacy/reference/modules/melis-front) — the render pipeline that MelisCacheInternal wraps.
- [melis-engine](/legacy/reference/modules/melis-engine) — the platform's general object cache (distinct from this module).
- [Module reference](/legacy/reference/modules) — all platform modules.
