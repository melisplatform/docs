# MelisMarketPlace

> In-backoffice marketplace to discover, download, update and install Melis Platform modules.
> Package: `melisplatform/melis-marketplace`.

## Purpose

MelisMarketPlace adds a **Market Place** tool to the backoffice that lists every Melis Platform
package published on Packagist with `"type": "melisplatform-module"`. From there an administrator
can download a new module, update an installed one (it compares the local version against the
repository), delete it, and run any post-install setup the module ships. A header icon signals when
updates are available. It is a **core** module and depends only on `melis-core`.

## Enable it

It is a standard Laminas module. Add it to `config/melis.module.load.php`:

```php
return [
    // …
    'MelisMarketPlace',
];
```

Install via Composer (`composer require melisplatform/melis-marketplace`); `melis-core` is pulled in
automatically. See [Module reference](/reference/modules).

The marketplace talks to a remote Packagist mirror; the endpoint is configured in
`config/app.interface.php` under `melismarketplace_toolstree_section/datas/melis_packagist_server`
(default `http://marketplace.melisplatform.com/melis-packagist`). The same `datas` block holds an
`exceptions` list (`MelisCore`, `MelisEngine`, `MelisFront`, `MelisAssetManager`,
`MelisComposerDeploy`, `MelisDbDeploy`) — core modules that are never offered for delete/update.

## Key services

Both services are registered in `config/module.config.php` via `AbstractFactory` and aliased.

| Service alias | Role |
| --- | --- |
| `MelisMarketPlaceService` | Drives module install/update: loads/activates a module (`plugModule()` / `unplugModule()` wrap `MelisAssetManagerModulesService`), compares versions (`compareLocalVersionFromRepo()` → up to date / needs update / in advance / dev), and dispatches a module's optional setup form (`getForm()`, `validateForm()`, `submitForm()`, `hasPostSetup()`). |
| `MelisMarketPlaceSiteService` | Handles installing a full **site** module from the marketplace (`installSite()`, `marketplaceInstallSite()`, `invokeSetup()`, `getModule()` / `setModule()`). |

Version status constants live in `MelisMarketPlace\Support\MelisMarketPlace`
(`UP_TO_DATE`, `NEED_UPDATE`, `IN_ADVANCE`, `DEV`, plus `DOWNLOAD` / `UPDATE` / `FORM` action keys).

## Backoffice

The tool registers under the left-menu section `melismarketplace_toolstree_section`
(`config/app.interface.php`) with a shopping-cart icon, plus a header icon
(`market_place_header_icon`) that surfaces available updates.

All actions are on `MelisMarketPlace\Controller\MelisMarketPlaceController`
(controller key `MelisMarketPlace\Controller\MelisMarketPlace`):

| melisKey / action | Role |
| --- | --- |
| `melis_market_place_tool_display` → `tool-container` | Main tool; lists packages (`fetchPackages()`). |
| `melis_market_place_tool_package_display` → `tool-container-product-view` | Single-package detail view. |
| `tool-product-modal-container` / `tool-product-modal-content` | Download/update confirmation modal. |
| `tool-module-form-setup-content` | Renders a module's post-install setup form. |
| `market-place-module-header` | Header dropdown listing modules needing an update. |

Notable controller actions: `moduleListAction()`, `bundleListAction()`,
`melisMarketPlaceProductDoAction()` (performs the download/update),
`activateModuleAction()` / `plugModuleAction()` / `unplugModuleAction()`,
`execDbDeployAction()`, `executeComposerScriptsAction()`, `reDumpAutoloadAction()`,
`getModuleTablesAction()` / `exportTablesAction()`, and `isMarketplaceAccessibleAction()`.
A standalone setup flow lives on `MelisSetupController` (route `/MelisMarketPlace/setup`).

## Front office

This module has no front-office templating plugins or view helpers — it is a backoffice-only tool.

## Database tables

MelisMarketPlace defines **no tables of its own** (no install SQL / dbdeploy delta ships with it).
It operates on the platform's existing module config and the Composer install. When a module it
installs ships database deltas, those are applied through `melis-dbdeploy`
(`execDbDeployAction()`); site installs reuse the platform's CMS tables.

## Example

Check whether an installed module is up to date against the marketplace repository:

```php
/** @var \MelisMarketPlace\Service\MelisMarketPlaceService $mp */
$mp = $serviceManager->get('MelisMarketPlaceService');

// $latestVersion comes from the marketplace listing for the package
$status = $mp->compareLocalVersionFromRepo('MelisCmsNews', $latestVersion);
// $status is one of the MelisMarketPlace\Support\MelisMarketPlace constants:
// UP_TO_DATE, NEED_UPDATE, IN_ADVANCE
```

## Key files

| Concern | Path |
| --- | --- |
| Module manifest | `vendor/melisplatform/melis-marketplace/composer.json` |
| Routes / services / controllers | `vendor/melisplatform/melis-marketplace/config/module.config.php` |
| Tool tree & header icon | `vendor/melisplatform/melis-marketplace/config/app.interface.php` |
| Install/update service | `vendor/melisplatform/melis-marketplace/src/Service/MelisMarketPlaceService.php` |
| Site install service | `vendor/melisplatform/melis-marketplace/src/Service/MelisMarketPlaceSiteService.php` |
| Main controller | `vendor/melisplatform/melis-marketplace/src/Controller/MelisMarketPlaceController.php` |
| Standalone setup controller | `vendor/melisplatform/melis-marketplace/src/Controller/MelisSetupController.php` |
| Constants | `vendor/melisplatform/melis-marketplace/src/Support/MelisMarketPlace.php` |
| Views | `vendor/melisplatform/melis-marketplace/view/melis-market-place/` |
| Assets | `vendor/melisplatform/melis-marketplace/public/` |

::: tip Related
For the underlying Composer-driven deployment, see `melis-composerdeploy`
(`MelisComposerService`) and the versioned-delta mechanism in `melis-dbdeploy`.
:::
