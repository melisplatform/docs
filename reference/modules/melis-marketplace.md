# MelisMarketPlace

> In-backoffice module store to discover, download, update and remove Melis Platform modules,
> now served as a native React catalogue. Package `melisplatform/melis-marketplace`.

## Purpose

MelisMarketPlace is the back-office module store: it lists every package published on the Melis
Packagist server, compares each installed version against the latest published version, and lets an
administrator download, update or remove modules — and install full site products — without leaving
the back-office. It calls `MelisComposerService` (melis-composerdeploy) for the actual Composer
work and reads/toggles module state through `MelisAssetManagerModulesService` (melis-asset-manager).

Six foundation modules — **MelisCore, MelisEngine, MelisFront, MelisAssetManager,
MelisComposerDeploy, MelisDbDeploy** — are listed as exceptions (exempted) and are never offered for
download, update or removal from the store.

In the v6 React back-office (`/melis-react`) the tool ships a **native full-React brick**: the
catalogue list and the per-package detail are authored in React and read a module-owned JSON
`react-api`. The install / update / remove machinery (Composer, dbdeploy, plug/unplug) is unchanged
and still runs server-side through the legacy controller.

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisMarketPlace',
];
```

Requires `melisplatform/melis-core: ^5.1` and PHP `^8.1|^8.3`. The module registers a
`dbdeploy: true` flag so any DB delta it ships is applied on first load. The React brick only
appears while `MelisMarketPlace` is present in `config/melis.module.load.php`.

The remote Packagist endpoint is configured in `config/app.interface.php` under
`melismarketplace_toolstree_section/datas/melis_packagist_server`
(default `http://marketplace.melisplatform.com/melis-packagist`).

## React back-office

**Where.** Left sidebar → **Market Place** (shopping-cart icon); opens as a top tab named
*Market Place*. The manifest `route` is `/melis-marketplace` and `forwardKey`
`MelisMarketPlace/MelisMarketPlace` maps the legacy menu node to it.

**Catalogue (list).** A searchable grid of module cards (cover image, group logo, title, version
chip, download count, and Installed / Update-available badges or a Download button). Above the grid
sit three **KPI cards** (Packages / Installed / Updates available), a search box, a sort selector
(Downloads / Date added / Name), a *Reset filters* button, the **group filter** (All groups · Core ·
Cms · Marketing · Commerce · Sites), a **Bundles** toggle, a refresh (↻) button and the **New / Old**
toggle. The grid loads more as you scroll (infinite scroll). A right sidebar shows "Want your module
listed?" and "Most downloaded packages".

![React Market Place catalogue: KPI cards, search, sort, group filters and the grid of module cards with a "Most downloaded packages" sidebar](/screenshots/react/melis-marketplace/melismarketplace-tool-list.png)

**Product view (detail).** Clicking a card opens a full-React detail (no page reload): a hero banner
(group logo, title, status badges, action buttons), an image gallery (slider + full-screen
lightbox), the description, and an *Additional information* panel (latest version, current version if
installed, GitHub, Packagist, package name, downloads). A **← back** button returns to the list,
which stays mounted so search / filters / scroll are preserved. There are **no host sub-tabs** — the
list ⇄ detail transition is internal state, so one brick uses exactly one host tab.

![React product view for a module: hero with status badges and action buttons, an image gallery, description and the Additional information panel](/screenshots/react/melis-marketplace/melismarketplace-tool-module-detail.png)

**New / Old toggle.** The list can switch between the React UI (*New*, default) and the classic tool
rendered in an iframe (*Old*, `/melis/react-tool-page?key=melis_market_place_tool_display`). On
narrow viewports the toggle becomes icon-only.

**Action buttons** depend on package state and on the caller's capabilities:

| Button | Shown when | Effect |
| --- | --- | --- |
| Download | module not installed | Composer fetch → dbdeploy → activate |
| Update | installed and `need_update` | same Composer gesture on a behind version |
| Remove | installed, non-exempted | uninstall (blocked if other modules depend on it) |
| Private | private/locked package | contact panel; must be purchased |

Each action opens a **Manage** modal with a live progress console streaming the Composer / dbdeploy
output, then offers *Activate module* / *Reload*. If the Packagist server is unreachable
(`marketAccessible = false`) the React UI disables browsing but keeps the shell up.

## React brick

Native full-React brick built with Vite (IIFE; React / ReactDOM / react-router-dom externalised to
the host globals). Sources in `ui-react/src/`, built to `public/ui-react/brick.js` next to
`brick.manifest.json`.

| Manifest field | Value |
| --- | --- |
| `id` | `marketplace` (must match the id registered in `brick.tsx`) |
| `route` | `/melis-marketplace` |
| `label` | `Market Place` |
| `forwardKey` | `MelisMarketPlace/MelisMarketPlace` |
| `melisKey` | `melis_market_place_tool_display` |
| `entry` | `brick.js` |
| `persistent` | `true` |
| `subTabs` | *absent* — list ⇄ detail is internal `openId` state |

Because the Market Place menu section is a directly-clickable / `is_parent_tool` node, the
rights-bearing key and the manifest zone key are the **same** (`melis_market_place_tool_display`).
The brick cannot import host modules, so it uses inline styles + theme CSS variables and an in-file
`{fr,en}` dictionary driven by the host language (`melis-ui-lang` / `melis-ui-locale` in
`localStorage`). Cards and gallery request the React screenshots first with the legacy image URL in
`data-legacy`, falling back on error.

Key files (`ui-react/src/`): `brick.tsx` (registers `id: 'marketplace'`), `MarketPlacePage.tsx`
(list + detail + manage modal), `ViewToggle.tsx` (New/Old toggle), `marketplace-api.ts` (read-only
API client), and `shared/useCaps.ts` / `shared/useDebounce.ts` / `shared/useIsNarrow.ts`.

## React API

The catalogue's **read-only** routes are declared in `config/module.config.php`, nested under the
`application-MelisMarketPlace` route (base `/melis/MelisMarketPlace/react-api`) — **module-owned**,
not under the shared `melis-react-api` node. Controller:
`MelisMarketPlace\Controller\MelisMarketPlaceReactApiController` (invokable alias
`MelisMarketPlace\Controller\MelisMarketPlaceReactApi`). Contract `{ success, data, error }`; every
fetch sends `X-Requested-With: XMLHttpRequest` and `credentials: 'include'`.

| Method & URL | Action | Purpose |
| --- | --- | --- |
| `GET …/react-api/packages` | `packages` | List (`page`, `limit`, `search`, `group`, `orderBy`, `order`, `bundle`) → `{items, page, pageCount, limit, marketAccessible}` |
| `GET …/react-api/packages/:id` | `get` | One package detail (`images`, `currentVersion`, `isExempted`, versionStatus…) |
| `GET …/react-api/groups` | `groups` | Package groups → `{groups, marketAccessible}` |
| `GET …/react-api/stats` | `stats` | KPI `{total, installed, needUpdate, marketAccessible}` |
| `GET …/react-api/status` | `status` | Per-module version status (`need_update` / `up_to_date` / `in_advance`) |

Every read action is guarded by `denyUnlessAccess()` — auth (`MelisCoreAuth::hasIdentity`) **and**
`MelisCoreRights::canAccess('melis_market_place_tool_display')`, returning **401 / 403** — so the
JSON API is not a back-door. The controller reuses `MelisMarketPlaceService`
(`compareLocalVersionFromRepo`, latest-version priming) and `MelisAssetManagerModulesService`
(installed versions / module list) and reads the Packagist JSON endpoints, exactly like the legacy
tool.

> **Mutating actions have no react-api route.** Download / Update / Remove are performed natively by
> the `ManageModal`, which replays the legacy JS orchestration by calling the module's **legacy**
> controller directly (`/melis/MelisMarketPlace/MelisMarketPlace/…`): `melisMarketPlaceProductDo`
> (streamed console), `reDumpAutoload`, `execDbDeploy`, `plugModule` / `unplugModule`,
> `executeComposerScripts`, `getSetupModuleForm`, `activateModule`, `isPackageDirectoryRemovable`,
> `changePackageDirectoryPermission`, `getModuleTables`, `exportTables`, plus
> `/melis/MelisCore/Modules/getDependents` for the remove dependency check.

## Capabilities

Declared in `config/react.capabilities.php`, merged under `melisReactToolCapabilities` by
`MelisMarketPlace\Module::getConfig()`. Keyed on the same melisKey used by the manifest and the
access-guard (`melis_market_place_tool_display`), since the section is directly clickable:

```
melis_market_place_tool_display
└─ actions: list · download · remove
```

`list` = browse the grid; `download` = the Composer fetch that both installs (Download) and updates
(Update); `remove` = uninstall. These are **React-only gating** (default-allow, declarative): the
controller enforces **access** only (`denyUnlessAccess`), it does not call `denyUnlessCan`. In React
the brick reads them via `useCaps('melis_market_place_tool_display')` — `can('list')` gates the grid,
`can('download')` the Download / Update buttons, `can('remove')` the Remove button (also hidden for
exempted modules).

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
```

`compareLocalVersionFromRepo()` fires the event pair
`melismarketplace_compare_local_version_from_repo_start` / `…_end` so listeners can override the
computed status.

**Per-module post-setup convention.** A module can ship a `MelisSetupPostDownloadController`
and/or `MelisSetupPostUpdateController` in its own `Controller\` namespace, exposing
`$showOnMarketplacePostSetup = true` and the actions `getFormAction`, `validateFormAction`,
`submitAction`. MarketPlace forwards into them to render and process the setup form.

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

## Legacy tool (Old view)

The classic tool remains available behind the New/Old toggle and still owns the mutating flow.
`melisMarketPlaceProductDoAction()` is the single endpoint for catalogue actions: it fires
`melis_marketplace_product_do_start`, switches on the action
(`MelisComposerService::DOWNLOAD / UPDATE / REMOVE`), then fires `melis_marketplace_product_do_finish`
to drive flash-messenger feedback. Before removing, it walks the target module's dependencies, those
of all other active modules, and the project root `composer.json` `require` block, to prevent
removing a shared dependency.

Two checks control store usability (both in `MelisMarketPlaceController`):

- `isMarketplaceAccessible()` — whether the Packagist server is reachable and the feature is on.
- `allowUpdate()` — reads `melis_core_platform.plf_update_marketplace` for the current platform
  (`MELIS_PLATFORM` env var); a platform with `plf_update_marketplace = 0` can browse but not
  download or update.

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
| Routes / services / react-api / controllers | `vendor/melisplatform/melis-marketplace/config/module.config.php` |
| React capabilities | `vendor/melisplatform/melis-marketplace/config/react.capabilities.php` |
| Tool tree, header icon, Packagist config | `vendor/melisplatform/melis-marketplace/config/app.interface.php` |
| React API controller | `vendor/melisplatform/melis-marketplace/src/Controller/MelisMarketPlaceReactApiController.php` |
| Main (legacy) controller | `vendor/melisplatform/melis-marketplace/src/Controller/MelisMarketPlaceController.php` |
| Install/update/plug service | `vendor/melisplatform/melis-marketplace/src/Service/MelisMarketPlaceService.php` |
| Site install service | `vendor/melisplatform/melis-marketplace/src/Service/MelisMarketPlaceSiteService.php` |
| React brick sources | `vendor/melisplatform/melis-marketplace/ui-react/src/` |
| Built brick + manifest | `vendor/melisplatform/melis-marketplace/public/ui-react/` |
| Exceptions | `vendor/melisplatform/melis-marketplace/src/Exception/` |

See also: [melis-composerdeploy](/reference/modules/melis-composerdeploy) ·
[melis-asset-manager](/reference/modules/melis-asset-manager) ·
[melis-dbdeploy](/reference/modules/melis-dbdeploy) ·
[melis-core](/reference/modules/melis-core)
