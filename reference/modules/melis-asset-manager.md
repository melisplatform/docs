# MelisAssetManager

> Serves every module's `public/` assets over HTTP and manages the module path map.
> Package: `melisplatform/melis-asset-manager`.

## Purpose

MelisAssetManager is platform plumbing. Instead of copying each module's `public/` folder into
the web root, it intercepts asset requests at bootstrap and streams the matching file straight
from the module that owns it. It also keeps an up-to-date map of every module's path
(`config/melis.modules.path.php`), exposes services to query the installed/active modules and
their dependencies, builds a Laravel-Mix `webpack.mix.js` to bundle module CSS/JS, and ships the
SVG icon view helpers used across the backoffice. It is one of the four core modules and is
required by virtually everything else.

## Enable it

A standard Laminas module, listed in `config/melis.module.load.php`. It is a **core** module
(`extra.melis-module-category: core`) and is loaded near the top of the list, before the rest of
the platform:

```php
return [
    'MelisAssetManager',   // ← here
    'MelisDbDeploy',
    'MelisComposerDeploy',
    'MelisCore',
    // …
    'MelisModuleConfig',
];
```

Dependency: `melisplatform/melis-core` (`^5.2`). The module's `Module.php` writes
`config/melis.modules.path.php` on first boot (and when new modules appear), so the `config/`
folder must be writable. See the [Module reference](/reference/modules).

## Key services

Registered in `config/module.config.php` under `service_manager.aliases`.

| Service alias | Class | Role |
| --- | --- | --- |
| `MelisAssetManagerModulesService` | `MelisModulesService` | Discover modules and their paths/dependencies. |
| `MelisAssetManagerWebPack` | `MelisWebPackService` | Build the `webpack.mix.js` bundle and list page assets. |
| `MelisConfig` | `MelisConfigService` | Read the merged app config tree (the `plugins` / melisKey config). |

**`MelisModulesService`** (extends `MelisCore\Service\MelisServiceManager`) — the most reused.
Notable methods:

- `getAllModules()`, `getVendorModules()`, `getUserModules()`, `getAIModules()`,
  `getSitesModules()`, `getMelisModules()` — list modules by origin.
- `getActiveModules()` — modules actually loaded by the Laminas `ModuleManager`.
- `getModulePath($moduleName, $returnFullPath = true)` — absolute (or relative) path of a module,
  whether it lives in `vendor/`, `module/`, or `module/AIModules/`.
- `getDependencies($moduleName)` / `getChildDependencies($moduleName)` — read a module's
  `composer.json` requires, or find who depends on it.
- `getModulesAndVersions($moduleName = null)` — package name + version per module.
- `getCoreModules()` — the four protected core modules (`MelisAssetManager`, `MelisDbDeploy`,
  `MelisComposerDeploy`, `MelisCore`).
- `activateModule()`, `loadModule()`, `unloadModule()`, `isModuleLoaded()`,
  `createModuleLoader()` — read/write `config/melis.module.load.php`.

**`MelisWebPackService`** — `getAssets($returnBundle = true)` returns the page's effective CSS/JS
(swapping in `bundle-all.css` / `bundle-all.js` when a build exists); `getMergedAssets()` collects
the `ressources` declared by every loaded app config; `buildWebPack()` writes a `webpack.mix.js`
at the project root for `npm run development|production`.

**`MelisConfigService`** (implements `MelisConfigServiceInterface`) — the platform's app-config
reader: `getItem($pathString, $prefix)` resolves a melisKey/path into its config sub-tree (with
translation of `tr_*` keys), `getMelisKeys()` maps every `melisKey` to its path, plus form helpers
`getFormMergedAndOrdered()`, `setFormFieldDisabled()`, `setFormFieldRequired()`.

## Backoffice

Two utility routes under `melis-backoffice` (controller `MelisAssetManager\Controller\WebPack`):

| Route | Action | Purpose |
| --- | --- | --- |
| `build-webpack` | `buildWebpackAction` | Generate `webpack.mix.js` from the active modules' assets. |
| `view-assets` | `viewAssetsAction` | Dump the CSS/JS the platform would load (debug). |

The module also provides the backoffice **icon** view helpers (`view_helpers`), each rendering an
inline SVG "M" badge in a section colour:

`melisCoreIcon`, `melisCmsIcon`, `melisMarketingIcon`, `melisCommerceIcon`, `melisOthersIcon`,
`melisCustomIcon` — all extending `AbstractMelisIconsHelper::createIcon()`.

```php
// in a .phtml backoffice view
echo $this->melisCoreIcon(24, 24);
```

## Front office

No templating or dashboard plugins. The front-office contribution is the asset delivery itself:
on every request the bootstrap listener (`Module::displayFile`) checks the public web root first,
then the owning module's `public/` folder, and streams the file with a proper MIME type (from
`config/mime.config.php`) and a 24h cache header. Assets are therefore reachable as:

```
/MelisCore/css/melis.css
/<ModuleName>/js/<file>.js
/<ModuleName>/images/<file>.jpg
```

`MelisHeadPluginHelper` (used internally by `MelisWebPackService`) is what gathers each app
config's `ressources/css` and `ressources/js`; add `'disable_bundle' => true` under a module's
`ressources/build` to opt that module out of bundling.

## Database tables

None. The module is stateless — its "state" is the generated files `config/melis.modules.path.php`
and the project-root `webpack.mix.js`.

## Key files

| Concern | Path |
| --- | --- |
| Bootstrap & asset delivery | `vendor/melisplatform/melis-asset-manager/src/Module.php` |
| Module config (routes, services, helpers) | `vendor/melisplatform/melis-asset-manager/config/module.config.php` |
| Module discovery service | `vendor/melisplatform/melis-asset-manager/src/Service/MelisModulesService.php` |
| Webpack/bundle service | `vendor/melisplatform/melis-asset-manager/src/Service/MelisWebPackService.php` |
| App-config reader | `vendor/melisplatform/melis-asset-manager/src/Service/MelisConfigService.php` |
| Webpack controller | `vendor/melisplatform/melis-asset-manager/src/Controller/WebPackController.php` |
| Head/assets helper | `vendor/melisplatform/melis-asset-manager/src/View/Helper/MelisHeadPluginHelper.php` |
| Icon helpers | `vendor/melisplatform/melis-asset-manager/src/View/Helper/*IconHelper.php` |
| MIME map | `vendor/melisplatform/melis-asset-manager/config/mime.config.php` |
