# MelisMarketPlace

> In-backoffice module store to discover, download, update, remove and install Melis Platform modules.
> Package `melisplatform/melis-marketplace`.

## Purpose

MelisMarketPlace is the back-office module store: it lists every package published on the Melis
Packagist server, compares each installed version against the latest published version, and lets an
administrator download, update or remove modules — and install full site products — without leaving
the back-office. It calls `MelisComposerService` (melis-composerdeploy) for the actual Composer
work and reads/toggles module state through `MelisAssetManagerModulesService` (melis-asset-manager).

Six foundation modules — **MelisCore, MelisEngine, MelisFront, MelisAssetManager,
MelisComposerDeploy, MelisDbDeploy** — are listed as exceptions and are never offered for
download, update or removal from the store.

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisMarketPlace',
];
```

Requires `melisplatform/melis-core: ^5.1` and PHP `^8.1|^8.3`. The module registers a
`dbdeploy: true` flag so any DB delta it ships is applied on first load.

The remote Packagist endpoint is configured in `config/app.interface.php` under
`melismarketplace_toolstree_section/datas/melis_packagist_server`
(default `http://marketplace.melisplatform.com/melis-packagist`).

## Key services

| Service alias | Role |
| --- | --- |
| `MelisMarketPlaceService` | Version comparison, plug/unplug, and per-module post-setup form dispatch. |
| `MelisMarketPlaceSiteService` | Scaffolds a full website from a `melisplatform-site` package. |

### `MelisMarketPlaceService`

Extends `MelisGeneralService`.

```php
$mp = $serviceManager->get('MelisMarketPlaceService');

// Compare installed vs latest — returns one of the constants below.
$status = $mp->compareLocalVersionFromRepo('MelisCmsSlider', 'v5.1.3');
// MelisMarketPlaceService::NEED_UPDATE  (-1)
// MelisMarketPlaceService::UP_TO_DATE   (1)
// MelisMarketPlaceService::IN_ADVANCE   (2)  — running a dev-… build

// Toggle a module on/off (rewrites the active-module loader via asset-manager).
$mp->plugModule('MelisCmsSlider');
$mp->unplugModule('MelisCmsSlider');

// Check whether a module ships a post-setup form for a given action.
$needsForm = $mp->hasPostSetup('MyModule', MelisMarketPlaceService::ACTION_DOWNLOAD);
```

`compareLocalVersionFromRepo()` fires the event pair
`melismarketplace_compare_local_version_from_repo_start` / `…_end` so listeners can override the
computed status.

**Per-module post-setup convention.** A module can ship a `MelisSetupPostDownloadController`
and/or `MelisSetupPostUpdateController` in its own `Controller\` namespace, exposing
`$showOnMarketplacePostSetup = true` and the actions `getFormAction`, `validateFormAction`,
`submitAction`. MarketPlace forwards into them to render and process the setup form in a modal:

```php
$mp->getForm('MyModule');               // renders MyModule\Controller\MelisSetupPostDownload::getFormAction
$mp->validateForm('MyModule', $post);   // → validateFormAction, returns JsonModel vars
$mp->submitForm('MyModule', $post);     // → submitAction
```

### `MelisMarketPlaceSiteService`

Extends `MelisGeneralService`. Scaffolds an entire website from a `melisplatform-site` package:
creates `melis_cms_site` / home / langs rows, allocates fresh page-id, platform-id and template-id
ranges, and creates the module's CMS tables via `Support\MelisMarketPlaceCmsTables` /
`Support\MelisMarketPlaceSiteInstall`.

```php
$site = $serviceManager->get('MelisMarketPlaceSiteService');
$site->marketplaceInstallSite($request);   // reads POST: name, scheme, domain, module, action
```

Typed exceptions (in `src/Exception/`): `EmptySiteException`,
`PlatformIdMaxRangeReachedException`, `TemplateIdMaxRangeReachedException`,
`ArrayKeyNotFoundException`, `FileNotFoundException`.

## Backoffice

Registered under the left-menu section `melismarketplace_toolstree_section` (shopping-cart icon,
label `tr_market_place`) and a header icon `market_place_header_icon` that displays a badge count
of modules needing an update.

| melisKey / action | Role |
| --- | --- |
| `melis_market_place_tool_display` → `tool-container` | Store landing page; JS calls `fetchPackages()` on open. |
| `melis_market_place_tool_package_display` → `tool-container-product-view` | Single-package detail view. |
| `melis_market_place_tool_package_modal_container` | Download/update/remove confirmation modal. |
| `melis_market_place_module_setup_form_content` | Per-module post-download/update setup form in a modal. |
| `market_place_header_conf` → `market-place-module-header` | Header dropdown listing modules needing an update. |

The catalogue UI is driven by axios + slick carousel; `app.tools.php` is intentionally empty —
MarketPlace is not a DataTable tool.

**Access gating.** Two checks control store usability (both in `MelisMarketPlaceController`):

- `isMarketplaceAccessible()` — whether the Packagist server is reachable and the feature is on.
- `allowUpdate()` — reads `melis_core_platform.plf_update_marketplace` for the current platform
  (`MELIS_PLATFORM` env var); a platform with `plf_update_marketplace = 0` can browse but not
  download or update.

**Download / update / remove flow.** `melisMarketPlaceProductDoAction()` is the single endpoint
for catalogue actions. It fires `melis_marketplace_product_do_start`, switches on the action
(`MelisComposerService::DOWNLOAD / UPDATE / REMOVE`), then fires
`melis_marketplace_product_do_finish` to drive flash-messenger feedback. Before removing, the
controller walks the target module's dependencies and those of all other active modules, plus the
project root `composer.json` `require` block, to prevent removing a shared dependency.

Full controller action reference:

```
toolContainer / toolContainerProductView      → store landing & single-product views
moduleList / bundleList                        → installed-module & bundle listings
marketPlaceModuleHeader                        → header update-badge
melisMarketPlaceProductDo                      → DOWNLOAD / UPDATE / REMOVE entry point
execDbDeploy / reDumpAutoload / executeComposerScripts → post-download deploy steps
plugModule / unplugModule / isModuleActive / activateModule → enable/disable installed modules
getSetupModuleForm / validateSetupForm / submitSetupForm   → per-module post-setup form
getModuleTables / exportTables                 → inspect/export a module's CMS tables
isPackageDirectoryRemovable / changePackageDirectoryPermission → filesystem pre-checks for remove
isModuleExists / isMarketplaceAccessible       → AJAX guards
siteInstall                                    → install a site product
```

`MelisSetupController` handles the standalone `/MelisMarketPlace/setup` route (per-module setup
outside the back-office interface tree).

## Events

| Event | Fired by | Purpose |
| --- | --- | --- |
| `melismarketplace_compare_local_version_from_repo_start` / `_end` | `compareLocalVersionFromRepo` | Hook or override the computed version-status result. |
| `melis_marketplace_product_do_start` | `melisMarketPlaceProductDo` | Before a download, update or remove action. |
| `melis_marketplace_product_do_finish` | `melisMarketPlaceProductDo` | After the action — drives flash-messenger feedback. |

## Database tables

MelisMarketPlace defines no tables of its own. When a downloaded module ships database deltas,
they are applied via `execDbDeployAction()` (melis-dbdeploy). Site-product installs write into the
platform's existing CMS tables (allocated through `MelisMarketPlaceSiteService`).

## Key files

| Concern | Path |
| --- | --- |
| Module manifest | `vendor/melisplatform/melis-marketplace/composer.json` |
| Routes / services / controllers | `vendor/melisplatform/melis-marketplace/config/module.config.php` |
| Tool tree, header icon, Packagist config | `vendor/melisplatform/melis-marketplace/config/app.interface.php` |
| Install/update/plug service | `vendor/melisplatform/melis-marketplace/src/Service/MelisMarketPlaceService.php` |
| Site install service | `vendor/melisplatform/melis-marketplace/src/Service/MelisMarketPlaceSiteService.php` |
| Main controller | `vendor/melisplatform/melis-marketplace/src/Controller/MelisMarketPlaceController.php` |
| Standalone setup controller | `vendor/melisplatform/melis-marketplace/src/Controller/MelisSetupController.php` |
| CMS-tables support | `vendor/melisplatform/melis-marketplace/src/Support/MelisMarketPlaceCmsTables.php` |
| Site-install support | `vendor/melisplatform/melis-marketplace/src/Support/MelisMarketPlaceSiteInstall.php` |
| Exceptions | `vendor/melisplatform/melis-marketplace/src/Exception/` |
| Views | `vendor/melisplatform/melis-marketplace/view/` |
| Assets (slick, axios, JS bundle) | `vendor/melisplatform/melis-marketplace/public/` |

See also: [melis-composerdeploy](/legacy/reference/modules/melis-composerdeploy) ·
[melis-asset-manager](/legacy/reference/modules/melis-asset-manager) ·
[melis-dbdeploy](/legacy/reference/modules/melis-dbdeploy) ·
[melis-core](/legacy/reference/modules/melis-core)
