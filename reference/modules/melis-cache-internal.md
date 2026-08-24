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

Requires `melisplatform/melis-cms`. The module ships database migrations (`dbdeploy: true`) that must
be applied on first install. In the v6 back-office the tool appears only when the module is
activated — the React host discovers it through its `brick.manifest.json` (see [React back-office](#react-back-office)).

## Key services

Registered under `service_manager` in `config/module.config.php`. Resolve with `$sm->get('<alias>')`.

| Service alias | Role |
| --- | --- |
| `MelisCacheInternalService` | Full-page cache operations: `getCacheConfig()`, `getPageCacheByPageIdAndType($pageId, $uri, $methodType)`, `getPageCacheByUrl()`, `saveItem()`, `deleteCacheByPageId()`, `deleteCacheByUrl()`, `deleteCacheByPageIdOrByUrl()`, `deleteAllCache()`, `getMelisCacheSize()`, `hasCache()`. Fires `melis_cache_internal_*_start`/`_end` events. |
| `PartialCachingService` | Partial/zone cache management: `getLists()`, `savePartialCaching()`, `deletePartialCaching()`, `getPartialCachingByCode()`, `searchPartialCachingByCode()`, and `processedZoneCaching($uri, $response, $pageId, $type)` — the zone-refresh engine that re-renders only expired zones on a cache hit. |

The React back-office reuses these same services and tables, so the React path reproduces the exact
legacy behaviour (config is a singleton upsert, exclusions are replaced in bulk, `deleteCacheByUrl`
handles the `*` wildcard/REGEXP).

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

## React back-office

In v6 the tool ships as a **native full-React brick** — a single left-menu tool (**Melis Cache**)
whose screens are **in-tool tabs**, not host sub-tabs. Find it under **Sidebar → MelisCms → Melis
Cache** (`fa fa-bookmark`), mounted at `/melis-cms/cache-internal`. The header carries the *"Platform
cache management"* subtitle, a **refresh** button that follows the active tab, a global **Save**
button, and a **New / Old** toggle: *New* is the React UI (default); *Old* renders the classic tool
in a persistent iframe (`/melis/react-tool-page?key=MelisCacheInternal_tool`).

The four tabs:

| Tab | Content |
| --- | --- |
| **Properties** | Full cache size in DB, the *Activate the cache system* toggle, *cache time in seconds* (TTL), the GET/POST request-type checkboxes, and the page-exclusion tree (toggle GET/POST per page). Persisted by the global header **Save**. |
| **Partial Caching** | CRUD list of partial-cache codes with KPI cards (Total / Manual / Plugin), search, column manager, Export and **+ Add**. Columns: Id, Partial Caching Code, Type, Module, Controller, Action, Cache lifetime in seconds, Methods. |
| **URL Parameters** | CRUD list of query-parameter names ignored when keying the cache (Total KPI, search, Export, **+ Add**). Add e.g. `utm_source` so link variants share one cache entry. |
| **Cache Clearing** | Clear-by-URL form (URL starting with `/`, `*` as a wildcard) plus the clearing-logs audit table (KPI cards Total / Today / Users; columns Id, URL Cleared, Date, User; offset pagination). Kept 3 months. |

![Properties tab — full cache size in DB, the Activate the cache system toggle, cache time in seconds, GET/POST request-type checkboxes and the per-page exclusion tree with GET/POST pills](/screenshots/react/melis-cache-internal/meliscacheinternal-tool-cache-tab-properties.png)

![Partial Caching tab — KPI cards (Total / Manual / Plugin), search, Columns manager, Export and + Add above the codes table (Id, Partial Caching Code, Type, Module, Controller, Action, Cache lifetime in seconds, Methods)](/screenshots/react/melis-cache-internal/meliscacheinternal-tool-cache-tab-partialcaching.png)

![URL Parameters tab — the Total KPI, search, Export and + Add above the ignored query-parameter table (Id, Parameter), used to keep tracking params from fragmenting the cache](/screenshots/react/melis-cache-internal/meliscacheinternal-tool-cache-tab-urlparameters.png)

![Cache Clearing tab — the clear-by-URL form (URL starting with /, * as a wildcard) with KPI cards (Total / Today / Users) and the clearing-logs audit table (Id, URL Cleared, Date, User) with pagination](/screenshots/react/melis-cache-internal/meliscacheinternal-tool-cache-tab-cacheclearing.png)

Common tasks: turn caching on / set TTL → *Properties → Activate → cache time → tick GET/POST →
Save*; stop a page being cached → *Properties → tick GET/POST for that page in the tree → Save*; add
a partial rule → *Partial Caching → + Add*; ignore a tracking param → *URL Parameters → + Add*; clear
a URL now → *Cache Clearing → type URL → Clear cache*.

## React API

The React UI talks to a JSON API served by **this module's own controllers** (sub-namespace
`MelisCacheInternal\Controller\React`, registered in `config/module.config.php`) — **not**
`melis-react-api`. Base path `/melis/MelisCacheInternal/react-api`. Every action extends
`MelisAbstractActionController`, is keyed on `MELIS_KEY = 'MelisCacheInternal_tool'`, guards access
via `denyUnlessAccess()` + `denyUnlessCan()`, and returns `{ success, data, error }`.

| Method & URL (relative to base) | Purpose |
| --- | --- |
| `GET /config` | Settings + cache size + page exclusions |
| `POST /config/save` | Save settings (singleton upsert) + bulk-replace page exclusions |
| `POST /config/empty-cache` | Empty the whole cache |
| `POST /config/clear-cache` | Clear by URL pattern (no log) |
| `GET /page-tree?nodeId=` | Lazy page tree for exclusions (`nodeId=-1` = root) |
| `GET /partial-caching` · `/stats` · `/:id` | Keyset list · KPI · one code |
| `POST /partial-caching/save` · `/delete/:id` | Create / update · delete a code |
| `GET /url-parameters` · `/stats` · `/:id` | Keyset list · KPI · one parameter |
| `POST /url-parameters/save` · `/delete/:id` | Create / update · delete |
| `GET /clearing-logs` · `/stats` | Offset-paginated logs · KPI (total / today / users) |
| `POST /clearing-logs/clear-cache` | Clear by URL **and log it** |

```ts
const BASE = '/melis/MelisCacheInternal/react-api'
// save config + page exclusions (bulk replace)
await apiFetch<null>('/config/save', {
  method: 'POST',
  body: JSON.stringify({ active: true, time: 3600, requestType: ['GET'],
    pageExclusions: [{ pageId: 42, excludeGet: true, excludePost: false }] }),
})
// create a partial-caching code
await apiFetch<{ id: number }>('/partial-caching/save', {
  method: 'POST',
  body: JSON.stringify({ type: 'PLUGIN', code: 'NEWS_LATEST', time: 60,
    module: '', controller: '', action: '', requestGet: true, requestPost: false }),
})
```

Every fetch sends `X-Requested-With: XMLHttpRequest`; POSTs with a body add
`Content-Type: application/json`. The React controllers reuse the module's Laminas services and
tables; the legacy controllers still power the *Old* view.

## Capabilities

Advanced rights are declared in `config/react.capabilities.php` under the rights-bearing node
`MelisCacheInternal_tool` (the same `melisKey` as the manifest, the *Old*-view iframe and the access
guard). It is a per-tab tree; `Capabilities::flatten()` turns it into dotted strings that React reads
via `useCaps('MelisCacheInternal_tool').can('…')`:

```
MelisCacheInternal_tool
├─ tab "config"   actions: edit                                  (Properties — save settings)
├─ tab "partial"  actions: list · create · edit · delete · export   (Partial Caching CRUD)
├─ tab "params"   actions: list · create · edit · delete · export   (URL Parameters CRUD)
└─ tab "logs"     actions: list · clear · export                 (Cache Clearing — logs + clear by URL)
```

Tab visibility is filtered by `can('config'|'partial'|'params'|'logs')`; actions are gated per leaf
(e.g. the config Save button by `can('config.edit')`). Every server action is guarded twice —
`denyUnlessAccess()` (auth + `MelisCoreRights::canAccess`) then `denyUnlessCan('<leaf>')` — and
`Capabilities` is default-allow for an undeclared tool/cap.

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
| Module config (services, controllers, table aliases, React routes) | `vendor/melisplatform/melis-cache-internal/config/module.config.php` |
| React capabilities tree | `vendor/melisplatform/melis-cache-internal/config/react.capabilities.php` |
| React API controllers | `vendor/melisplatform/melis-cache-internal/src/Controller/React/` |
| React brick source / build | `vendor/melisplatform/melis-cache-internal/ui-react/` → `public/ui-react/brick.js` + `brick.manifest.json` |
| Full-page cache service | `vendor/melisplatform/melis-cache-internal/src/Service/MelisCacheInternalService.php` |
| Partial/zone cache service | `vendor/melisplatform/melis-cache-internal/src/Service/PartialCachingService.php` |
| Serve listener (cache hit) | `vendor/melisplatform/melis-cache-internal/src/Listener/MelisCacheInternalPageGetCacheListener.php` |
| Store listener (cache save) | `vendor/melisplatform/melis-cache-internal/src/Listener/MelisCacheInternalPageSaveCacheListener.php` |
| CMS page invalidation listener | `vendor/melisplatform/melis-cache-internal/src/Listener/MelisCacheInternalCmsPageListener.php` |
| Database migrations | `vendor/melisplatform/melis-cache-internal/install/dbdeploy/` |

## See also

- [melis-cms](/reference/modules/melis-cms) — the CMS whose publish events trigger cache invalidation.
- [melis-front](/reference/modules/melis-front) — the render pipeline that MelisCacheInternal wraps.
- [melis-engine](/reference/modules/melis-engine) — the platform's general object cache (distinct from this module).
- [Module reference](/reference/modules) — all platform modules.
