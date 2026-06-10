# MelisAssetManager

> Serves every module's public assets (CSS, JS, images) over clean URLs and bundles them for
> production; also the canonical source of active module discovery. Package
> `melisplatform/melis-asset-manager`.

## Purpose

MelisAssetManager intercepts requests to `/<ModuleName>/{css,js,images}/…` at load time and
streams the matching file from that module's `public/` directory, with no controller logic in the
hot path. On first boot it writes a module-to-path map at `config/melis.modules.path.php`
(requiring the `config/` folder to be writable). It also provides the platform-wide services for
querying which modules are installed or active, and for compiling all modules' CSS/JS into
production bundles via webpack.

It is part of the **MelisCore platform foundation** and is required by virtually every other
module.

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisAssetManager',
];
```

Dependency: `melisplatform/melis-core` (`^5.2`). The `config/` folder must be writable so the
module can persist `melis.modules.path.php` on boot.

## Key services

Registered in `config/module.config.php` under `service_manager`.

| Service alias | Role |
| --- | --- |
| `ModulesService` | Discover and query installed/active modules (`MelisModulesService`). |
| `MelisWebPackService` | Build webpack bundles and resolve module asset lists. |
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
`bundle.css` / `bundle.js` that this service produces and serves.

### `MelisConfigService`

A config-merge and translation helper for asset-manager's own needs. Key methods: `getItem`,
`getMelisKeys`, `getFormMergedAndOrdered`, `translateAppConfig`.

## Asset URLs

Assets from any module are reachable at:

```
/<ModuleName>/css/<file>.css
/<ModuleName>/js/<file>.js
/<ModuleName>/images/<file>.jpg
```

These map to each module's `public/` folder. The fallback is the project's main `public/`.

## Database tables

None. The module is stateless — its only persisted state is the generated file
`config/melis.modules.path.php`.

## Key files

| Concern | Path |
| --- | --- |
| Service aliases and asset-serving wiring | `vendor/melisplatform/melis-asset-manager/config/module.config.php` |
| Module discovery service | `vendor/melisplatform/melis-asset-manager/src/Service/MelisModulesService.php` |
| Webpack/bundle service | `vendor/melisplatform/melis-asset-manager/src/Service/MelisWebPackService.php` |
| App-config reader | `vendor/melisplatform/melis-asset-manager/src/Service/MelisConfigService.php` |
| Asset/webpack controllers | `vendor/melisplatform/melis-asset-manager/src/Controller/` |
| Module path map (generated) | `config/melis.modules.path.php` |

See also: [MelisCore](/reference/modules/melis-core) · [MelisDbDeploy](/reference/modules/melis-dbdeploy) · [MelisComposerDeploy](/reference/modules/melis-composerdeploy) · [MelisInstaller](/reference/modules/melis-installer) · [Module reference](/reference/modules)
