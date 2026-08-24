# MelisAssetManager

> Serves every module's public assets (CSS, JS, images) over clean URLs, delivers the compiled
> React back-office bundle, and is the canonical source of active module discovery. Package
> `melisplatform/melis-asset-manager`.

## Purpose

MelisAssetManager intercepts requests to `/<ModuleName>/…` at load time and streams the matching
file from that module's `public/` directory, with no controller logic in the hot path. On first
boot it writes a module-to-path map at `config/melis.modules.path.php` (requiring the `config/`
folder to be writable). It also provides the platform-wide services for querying which modules are
installed or active, and for compiling all modules' CSS/JS into legacy production bundles via
webpack.

It is part of the **MelisCore platform foundation** and is required by virtually every other
module.

## Role in the React back-office

The module has **no React tool and no UI of its own** — there is no brick, no `config/react-api.php`
and no `config/react.capabilities.php`, and it never appears as a tool in `/melis-react`. Its
relevance to v6 is purely as infrastructure: it is the HTTP delivery layer that serves the
**compiled React SPA bundle** to the browser.

The React back-office is a Vite single-page app whose build output (JS, CSS, fonts, icons,
`index.html`) is committed under `melis-core/public/ui-react/`. Requests for those files arrive at
URLs beginning with **`/MelisCore/ui-react/`** — the exact `base` the Vite build is compiled
against — and are served by the same generic `/<Module>/…` → `<module>/public/…` resolver used for
every module's assets. The split is:

| Layer | Served by | URL |
| --- | --- | --- |
| React HTML shell | MelisReactOverride | `/melis-react` |
| React hashed JS/CSS bundle | **MelisAssetManager** | `/MelisCore/ui-react/…` |

> If this module (or its writable cache) fails, the shell HTML may still load but the hashed
> JS/CSS return **404** or the wrong **MIME type**, so the browser refuses to execute the script —
> the classic symptom is a **blank `/melis-react`**. The usual root cause is that the `config/`
> folder (and its generated `melis.modules.path.php`) is not writable by the web user
> (e.g. `www-data`). Activating a new module forces a rebuild of that cache; a permission failure
> there degrades asset serving. See [Enable it](#enable-it).

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisAssetManager',
];
```

Dependency: `melisplatform/melis-core` (`^6.0`), PHP `^8.3 | ^8.5`. The `config/` folder must be
writable so the module can persist `melis.modules.path.php` on boot.

## Serving mechanism

There is **no controller** for the common asset path — serving is a load-time resolver wired in
`src/Module.php`:

- **`onBootstrap()`** calls **`displayFile($sm)`** on every request.
- **`displayFile()`** resolves the request URI to a file: first it tries the project main public
  folder (`$_SERVER['DOCUMENT_ROOT'] . $uri`); otherwise it treats the first URI segment as a
  module name, looks it up in the cache map, and builds `<modulePath>/public/<rest-of-URI>`.
- **`sendDocument()`** sets the correct `Content-Type` (via `getMimeType()` +
  `config/mime.config.php`), adds a 24h cache header for static files, prints the bytes and dies.
  A guard (`isRequestAuthenticated()`) requires a valid session before ever `eval`-ing a served
  `.php` file; static assets stay public.
- **`checkFileInFolder()`** enforces that the resolved path stays inside the module's `public/`
  directory (path-traversal guard).

A request for `/MelisCore/ui-react/assets/index-<hash>.js` therefore resolves module `MelisCore`
and streams `melis-core/public/ui-react/assets/index-<hash>.js` — no React-specific code involved.

## Module-path cache

The `<ModuleName> → path` map used by `displayFile()` is a generated PHP file at
`config/melis.modules.path.php`. It is (re)built by the module-load listener in `src/Module.php`:

- **`init()`** attaches **`onLoadModulesPost()`** to `ModuleEvent::EVENT_LOAD_MODULES_POST`.
- **`onLoadModulesPost()`** writes the file when it is missing or a newly-activated module is not
  yet in it, using `MelisModulesService` to compute each module's path, then `chmod`s it `0777`.

The module is otherwise **stateless** — this generated file is its only persisted state.

## Key services

Registered in `config/module.config.php` under `service_manager`.

| Service alias | Role |
| --- | --- |
| `ModulesService` | Discover and query installed/active modules (`MelisModulesService`). |
| `MelisWebPackService` | Build legacy webpack bundles and resolve module asset lists. |
| `MelisConfig` | Merge and read the platform app-config tree (`MelisConfigService`). |

### `MelisModulesService`

The canonical "what modules exist / are active" service. Used by the Modules tool, the
marketplace, site module loading and the installer.

```php
$modules = $sm->get('ModulesService'); // MelisAssetManager\Service\MelisModulesService

$active   = $modules->getMelisActiveModules();        // modules currently enabled
$all      = $modules->getAllModules();                // every discoverable module
$vendor   = $modules->getVendorModules();             // modules under vendor/
$versions = $modules->getModulesAndVersions();        // module => version
$deps     = $modules->getChildDependencies($moduleName);
$sites    = $modules->getSitesModules();              // template/site modules
```

Full method list: `getMelisActiveModules`, `getModulesAndVersions`, `getComposer`/`setComposer`,
`getUserModules`, `getSitesModules`, `getMelisModules`, `getAllModules`, `getVendorModules`,
`getChildDependencies`.

### `MelisWebPackService`

```php
$webpack = $sm->get('MelisWebPackService');

$assets  = $webpack->getAssets($moduleName);           // a module's declared assets
$merged  = $webpack->getMergedAssets();                // platform-wide merged set
$webpack->buildWebPack();                               // compile bundles
$file    = $webpack->getWebPackMixStaticFile($asset);  // resolve a hashed/mixed asset
```

Full method list: `getAssets`, `getWebPackMixStaticFile`, `getMergedAssets`, `buildWebPack`,
`setCachedFile`, `getCachedFiles`.

The per-module `ressources.build` config key (in a module's `app.interface.php`) declares the
`bundle.css` / `bundle.js` that this service produces and serves. The `WebPackController`
(routes `melis-backoffice/build-webpack` and `melis-backoffice/view-assets`) drives it.

> This webpack pipeline builds the **legacy** back-office bundle only — it has nothing to do with
> the React build. The React SPA is compiled by **Vite** inside `melis-core/ui-react/`
> (`npm run build`) and committed to `melis-core/public/ui-react/`; MelisAssetManager only *serves*
> those already-built files, it does not compile them.

### `MelisConfigService`

A config-merge and translation helper for asset-manager's own needs. Key methods: `getItem`,
`getMelisKeys`, `getFormMergedAndOrdered`, `translateAppConfig`.

## Asset URLs

Assets from any module are reachable at:

```
/<ModuleName>/css/<file>.css
/<ModuleName>/js/<file>.js
/<ModuleName>/images/<file>.jpg
/MelisCore/ui-react/assets/<file>          # the committed React bundle
```

These map to each module's `public/` folder. The fallback is the project's main `public/`.

## Database tables

None. The module is stateless — its only persisted state is the generated file
`config/melis.modules.path.php`.

## Key files

| Concern | Path |
| --- | --- |
| Service aliases and asset-serving wiring | `vendor/melisplatform/melis-asset-manager/config/module.config.php` |
| Extension → MIME map for `sendDocument()` | `vendor/melisplatform/melis-asset-manager/config/mime.config.php` |
| Asset-serving + module-path cache | `vendor/melisplatform/melis-asset-manager/src/Module.php` |
| Module discovery service | `vendor/melisplatform/melis-asset-manager/src/Service/MelisModulesService.php` |
| Webpack/bundle service (legacy) | `vendor/melisplatform/melis-asset-manager/src/Service/MelisWebPackService.php` |
| App-config reader | `vendor/melisplatform/melis-asset-manager/src/Service/MelisConfigService.php` |
| Asset/webpack controllers | `vendor/melisplatform/melis-asset-manager/src/Controller/` |
| Module path map (generated) | `config/melis.modules.path.php` |
| Committed React build (served, not built here) | `vendor/melisplatform/melis-core/public/ui-react/` |

See also: [MelisCore](/reference/modules/melis-core) · [MelisReactApi](/reference/modules/melis-react-api) · [MelisDbDeploy](/reference/modules/melis-dbdeploy) · [MelisComposerDeploy](/reference/modules/melis-composerdeploy) · [MelisInstaller](/reference/modules/melis-installer) · [Module reference](/reference/modules)
