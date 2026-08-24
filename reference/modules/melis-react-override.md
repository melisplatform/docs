# MelisReactOverride

> React back-office infrastructure: renders legacy tools inside the `/melis-react` shell and serves the React SPA. Package `melisplatform/melis-react-override`.

## Purpose

MelisReactOverride is a **React back-office infrastructure module** — not a tool. It ships no
brick, no React page, no `react-api` endpoints and no screen of its own. It provides the two
plumbing mechanisms that let the React back-office (`/melis-react`) run alongside the legacy
`/melis`:

1. **Legacy-tool iframe mechanism** — any legacy jQuery/AJAX tool that has no dedicated React
   page is rendered as a standalone HTML page (`/melis/react-tool-page?key=<melisKey>`) and shown
   inside the React shell in an `<iframe>`. The tool inside the frame looks and behaves exactly
   like direct `/melis` access — its own DataTables, forms, modals, tabs, save buttons and native
   notifications (gritter toasts, per-field validation modals).
2. **SPA fallback route** — it serves the React shell `index.html` for `/melis-react` and every
   client-side deep link under it, and makes that route (plus a few read-only boot endpoints)
   public.

You never navigate *to* this module. Rule of thumb: if you are inside `/melis-react` looking at
an old-style (classic Bootstrap) tool screen, you are looking at a page produced by
MelisReactOverride.

## Enable it

It is a pure server-side Laminas MVC module loaded via `application.config.php` (`module_paths` +
`modules`) — `src/Module.php` autoloads `MelisReactOverride\*` from `src/` through
`StandardAutoloader`. Category `core`.

It **overrides MelisCore's `PluginView` controller** with a React-aware version via a
`controllers.invokables` alias. Because this module loads *after* melis-core, the alias wins the
Laminas config merge:

```php
'controllers' => [
    'invokables' => [
        'MelisCore\Controller\PluginView'   => \MelisReactOverride\Controller\PluginViewController::class,
        'MelisReactOverride\Controller\Spa' => \MelisReactOverride\Controller\SpaController::class,
    ],
],
```

## At a glance

| Property | Value |
| --- | --- |
| Module name | `MelisReactOverride` |
| Package | `melisplatform/melis-react-override` |
| Category | `core` |
| Brick / `ui-react/` / `react-api.php` | **none** (infrastructure only) |
| Controllers | `PluginViewController` (aliased over `MelisCore\Controller\PluginView`), `SpaController` |
| Services | `PlatformAssetsService`, `LegacyWidgetCssService` |
| Extension point | `PluginViewToolPageExtensionInterface` (`toolpage_extensions` hook) |

## Routes

All tool/iframe routes are child routes of `melis-backoffice`, so they live under `/melis`. The
SPA route is a top-level regex route.

| Route name | URL | Action | Purpose |
| --- | --- | --- | --- |
| `melis-backoffice/react-tool-page` | `/melis/react-tool-page` | `toolPage` | **Core mechanism.** Renders a legacy tool zone as a standalone HTML page for an iframe. Takes `?key=<melisKey>` (and `?idPage=<id>` for the CMS page editor). |
| `melis-backoffice/react-dashboard-plugin` | `/melis/react-dashboard-plugin` | `dashboardPluginPage` | A single legacy dashboard plugin as a minimal standalone page. |
| `melis-backoffice/react-dashboard-plugin-config` | `/melis/react-dashboard-plugin-config` | `dashboardPluginConfigPage` | A dashboard plugin's config form (cog button) as standalone HTML. |
| `melis-backoffice/react-dashboard-plugin-config-data` | `/melis/react-dashboard-plugin-config-data` | `dashboardPluginConfigData` | JSON: the config form as data (tabs + typed fields + values) so React renders it natively. |
| `melis-backoffice/react-dashboard-plugin-config-save` | `/melis/react-dashboard-plugin-config-save` | `dashboardPluginConfigSave` | POST: validate + persist a dashboard plugin's config. |
| `melis-backoffice/react-dashboard-plugin-content` | `/melis/react-dashboard-plugin-content` | `dashboardPluginContent` | JSON: HTML + scripts + jsCallbacks for direct DOM injection (no iframe). |
| `melis-backoffice/react-platform-bundle` | `/melis/react-platform-bundle` | `platformBundle` | Serves the concatenated asset bundle with the correct MIME type (replaces MelisCore's `/melis/get-{css,js}-bundles`, which answer empty `text/html` when the bundle is missing). |
| `melis-backoffice/react-legacy-widget-css` | `/melis/react-legacy-widget-css` | `legacyWidgetCss` | Legacy back-office stylesheets, every rule scoped under `.melis-legacy-widget`. |
| `meliscore-melis-react-spa` | `/melis-react`, `/melis-react/*` | `spa` | **SPA fallback.** Serves the React shell `index.html`. Regex route, `priority => 1000`. |

### Public routes (`excluded_routes`)

The module appends to MelisCore's `plugins.meliscore.datas.excluded_routes` (numeric arrays merge
by appending) so `MelisCore\Module::checkIdentity()` lets these through without redirecting to
`/melis/login`:

- `meliscore-melis-react-spa` — the shell is public because the React app handles its own
  authentication (own login screen).
- `melis-backoffice/react-platform-bundle` — so an expired session doesn't redirect a stylesheet
  to an HTML login page (the exact MIME error this route fixes).
- `melis-backoffice/melis-react-api/platformscheme-react-get` — login-panel branding, read before
  authentication (GET only).
- `melis-backoffice/melis-react-api/langs` — the back-office language list the SPA loads at boot,
  including on the login screen (read only).

> The last two are `melis-react-api` routes (owned by **MelisReactApi**); MelisReactOverride only
> makes them public, it does not define them.

## The iframe mechanism — `toolPageAction()` → `buildToolPage()`

`PluginViewController::toolPageAction()` resolves a melisKey, renders its zone, and hands the HTML
to `buildToolPage()` to assemble a standalone document. Flow:

1. **Auth guard** — `denyIfUnauthenticated()` runs first (this page is *not* public).
2. **Resolve melisKey → appConfig path** — `MelisCoreConfig->getMelisKeys()` maps `?key=` to an
   app-config path; the last segment is the view key.
3. **Force XHR mode** — adds `X-Requested-With: XMLHttpRequest` so `generateRec()` renders zones
   with `follow_regular_rendering:false` the same way the classic AJAX path does (otherwise those
   tools fall through to the front and render a "404 MelisDemoCms").
4. **Pin the PHP session id** — snapshot before render, restore after (some legacy tools rotate
   the session id while rendering — harmless in `/melis`, fatal here).
5. **Render the zone** with `generateRec()` + `renderViewRec()`, capturing any stray output a
   zone `echo`s to the stream (kept out of markup as an HTML comment for diagnosis).
6. **Run `adjustToolHtml()` extensions** (`toolpage_extensions`) on the rendered HTML.
7. **Build platform assets** via `PlatformAssetsService::build()` and inject the module's own
   JS/CSS `ressources`.
8. **Run `adjustToolAssets()` extensions** (may move some module JS into the `<head>` bucket and
   return `skipJsRoots` so the generic loop doesn't double-load it).
9. **Assemble** `buildToolPage($html, $jsCallBacks, $assets, $zoneId, $key)` and return as
   `text/html` with `X-Frame-Options: SAMEORIGIN`.

### Pitfalls `buildToolPage()` solves

- **Neutralise bundle.js's "Remove Envato Frame" guard** — inside a sandboxed iframe the guard
  throws a `SecurityError` that kills bundle.js. The page captures the real parent
  (`window.__melisRealParent`) then redefines `window.parent`/`window.top` to return `window`.
- **Load `melisDataTable.js` separately** — declared in `app.interface.php` but absent from
  `bundle.js`; added to the JS queue (exposes `window.melisDataTable`).
- **Global `Proxy` shim** — for objects defined only inside bundle.js's `$(function(){…})` and not
  yet available when a tool's synchronous body scripts parse, a no-op `Proxy` avoids early throws.
- **Wrap jsCallbacks in try/catch** — a callback whose dependency isn't loaded standalone won't
  break the page.
- **Inject the module's JS/CSS `ressources`** — the core `bundle.js` only contains MelisCore
  tools; module tools ship their own files (e.g. `news.tool.js` → `window.initNewsList`). The
  controller collects every root the tool needs — its own plugin root, roots reached via `type`
  links (walked recursively, cycle-guarded) and `forward` module nodes, plus a few extra roots for
  known composite editors (e.g. `meliscms_page`), all gated so inactive modules load nothing.
- **Head vs end-of-body JS ordering** — platform JS loads in `<head>`; module `ressources` load
  inside `<body>` after the tab strip but before the tool HTML, mirroring the classic BO.
- **Editor tab shell** — includes the classic tab anchors (`#melis-id-nav-bar-tabs` hidden,
  `#melis-id-body-content-load`, global `activeTabId`) so classic edit flows work.
- **`<base href="/">`** so relative tool AJAX URLs resolve from site root.
- **Modal mount point `#melis-modals-container`** plus a self-heal watcher for stray backdrops.
- **Export fix** — rebinds `melisCoreTool.exportData()` to an in-frame anchor click (the legacy
  `window.open` popup never lands the download in a sandboxed iframe).
- **Tool-tab bridge & tool-result postMessage** — the hidden tab strip is mirrored to the host via
  `postMessage({ __melisToolTabs, … })`; a `{ __melisToolResult, url, data }` message is posted
  after a JSON save so the host can react structurally. No visible notification is bridged — legacy
  tools keep their own native feedback.

## Platform assets — `PlatformAssetsService`

`PlatformAssetsService::build($sm)` returns `['css' => …, 'js' => …, 'inline' => …]`, the platform
asset list every tool iframe bootstraps with:

- **CSS** — all module `bundle.css` files (loaded in parallel), prepended with Google Fonts and
  `/assets/css/schemes.css`, filtered to files that exist on disk.
- **JS queue** (order matters) — `get-translations?locale=…`, `MelisCore/build/js/bundle.js`, then
  the non-bundled extras: `melisDataTable.js`, `loader.js`, `findpage.tool.js`,
  `bootstrap-tagsinput.js`, `typeahead.bundle.js`, `moment/fr.js`, `melis_tinymce.js`.
- **Inline globals** — `basePath`, `primaryColor`, … read from the active platform scheme
  (`MelisCorePlatformSchemeService`), with Melis-default colours as fallback.
- **Bundle caching / self-healing** — the expensive `MelisAssetManagerWebPack->getAssets(true)`
  call is cached (temp file, 600s TTL + in-process memo); if `etc/bundles/` was wiped by the
  Modules tool it is regenerated under a single-writer lock, or the concatenated route is swapped
  for `/melis/react-platform-bundle`.
- **`bust($url)`** appends `?v=<mtime>` to local asset URLs.

`LegacyWidgetCssService` backs the `react-legacy-widget-css` route — legacy BO CSS scoped under
`.melis-legacy-widget` so it can't leak onto the React shell (used by non-iframe legacy widgets
injected directly into the React DOM, e.g. dashboard plugin content).

## SPA fallback — `SpaController`

`SpaController::spaAction()` serves the React shell for `/melis-react` and every client-side deep
link:

- Resolves `index.html` via `$_SERVER['DOCUMENT_ROOT']`, reading
  `…/vendor/melisplatform/melis-core/public/ui-react/index.html` (the React build lives in
  melis-core's `public/`, served at `/MelisCore/ui-react/`). Works regardless of where this module
  sits on disk.
- Returns `404` if the shell is missing; otherwise returns the file as
  `text/html; charset=utf-8` with `Cache-Control: no-cache, no-store, must-revalidate` (the shell
  is never cached; referenced assets are content-hashed).
- Real files (root `index.html`, hashed assets) are streamed earlier by MelisAssetManager at
  bootstrap, so only virtual client-side routes (e.g. `/melis-react/news/5`) fall through here.

The `meliscore-melis-react-spa` regex route (`priority => 1000`) wins over MelisFront's catch-all
front route. Its regex `'/melis-react(?<spa>/[a-zA-Z0-9_\-/~.]*)?'` includes `~` (composite id
separator) and `.` so those deep links resolve to the SPA on a full-page reload.

## Extension point — the `toolpage_extensions` hook

Tool-specific quirks live in the **owning** module, not hardcoded here. A module registers a
service name under `config('melis_react_override')['toolpage_extensions'][]` and implements
`MelisReactOverride\Controller\PluginViewToolPageExtensionInterface`:

```php
interface PluginViewToolPageExtensionInterface
{
    // Adjust the rendered zone HTML for a melisKey before assembly (return $html unchanged
    // for keys the extension doesn't care about).
    public function adjustToolHtml(string $key, string $html, array $jsCallBacks, PluginViewController $controller): string;

    // Adjust the platform asset bundle. Return ['assets' => array, 'skipJsRoots' => array<string, true>];
    // 'skipJsRoots' lists roots the extension already injected so the generic loop must NOT re-add them.
    public function adjustToolAssets(string $key, string $html, array $assets, PluginViewController $controller): array;
}
```

`PluginViewController::toolPageExtensions()` resolves the registered names, **silently skips**
names that aren't registered services or don't implement the interface (so an extension is fully
optional — module not installed → no-op), caches the list, and calls `adjustToolHtml()` (step 6)
and `adjustToolAssets()` (step 8) for each.

> **Why a config array, not a controller override:** contributions from different modules simply
> accumulate regardless of load order (unlike a controller alias, where only the last-merged
> module wins).

**Example consumer.** MelisAICommunityExtensions registers
`MelisAICommunityExtensions\Controller\React\PluginViewToolPageExtension` under
`melis_react_override.toolpage_extensions` to inject its `tool.js` / `style.css` into legacy tool
pages served in the React "Old" view.

## Key files

| Concern | Path |
| --- | --- |
| Routes, controller override, `excluded_routes` | `config/module.config.php` |
| Module bootstrap + autoloader | `src/Module.php` |
| Iframe mechanism, dashboard actions, extensions | `src/Controller/PluginViewController.php` |
| SPA shell serving | `src/Controller/SpaController.php` |
| `toolpage_extensions` contract | `src/Controller/PluginViewToolPageExtensionInterface.php` |
| Platform asset build + bundle cache | `src/Service/PlatformAssetsService.php` |
| Scoped legacy BO CSS | `src/Service/LegacyWidgetCssService.php` |

See also: [melis-core](/legacy/reference/modules/melis-core)

> **No UI, no screenshots.** MelisReactOverride is infrastructure with no interface of its own —
> what appears on screen is the *legacy tool* it renders or the *React shell* it serves, both
> documented in their own modules.
