# MelisReactApi

> JSON API backbone of the React back-office (`/melis-react`): boots the shell, serves menu/user/assets/discovery/dashboard data, and hosts the capability resolver. Package `melisplatform/melis-react-api`.

## Purpose

MelisReactApi is **infrastructure, not a tool**. It draws no UI, ships no brick and adds no
sidebar entry. It exposes the generic `/melis/react-api/…` JSON endpoints the React shell
(served by MelisReactOverride at `/melis-react`) calls at boot and on navigation, and it
hosts the **capability resolver** (`Capabilities` + `CapabilityGuardTrait`) that per-module
tool controllers reuse to gate their "advanced rights".

Everything the shell shows that isn't a specific tool's own screen comes from here: the
left menu (rights-filtered), the header user/avatar and language switcher, the dashboard
tiles and KPIs, the modular brick discovery, and the Users → Rights advanced-rights matrix.
Individual tools' own endpoints, routes and capability declarations live in **their own**
modules (e.g. `/users`, `/roles` are declared in MelisCore / MelisSmallBusiness), not here.

There are **no React screens and no screenshots** for this module — the sections below
describe the API contract to use when talking to the React back-office.

## Enable it

MelisReactApi is a core module of the React back-office. It is **not** composer-installed in
the Docker vendor volume; it is loaded via `config/application.config.php` `module_paths`
(branch `melis-react`), and `src/Module.php` autoloads its classes via `StandardAutoloader`.
It pairs with **MelisReactOverride** (the iframe/tool mechanism + SPA shell route) and with
**melis-core/ui-react** (the React app that consumes this API — see its `src/lib/*-api.ts`
clients).

It declares its routes directly in `config/module.config.php` (no `config/react-api.php`)
and declares no capabilities of its own (it is the engine that *reads* other modules'
declarations).

## React presence at a glance

| Property | Value |
| --- | --- |
| Brick / manifest | **none** — ships no `public/ui-react/brick.manifest.json` |
| `ui-react/` source | **none** — no Vite project, no React components |
| Controller | `MelisReactApi\Controller\MelisReactApiController` (invokable alias `MelisReactApi\Controller\MelisReactApi`) |
| Base route | `melis-backoffice` → `react-api` (i.e. `/melis/react-api/…`) |
| Auth | `isAuthenticated()` (MelisCoreAuth) per action, **except** `/langs` (public, loaded on the login screen) |
| Response contract | `{ success: bool, data: T, error?: string }` (raw JSON, no layout) |

Each action returns a raw JSON `Response` via the inherited `jsonResponse()`, so Laminas
never wraps a layout around it. Read-only actions call `releaseSessionLock()` early so
concurrent boot requests sharing the session cookie don't serialise.

## Generic endpoints

All under `/melis/react-api/…`. Twelve generic endpoints, all mapping to
`MelisReactApiController`. Every response is `{ success, data, error? }` (401 when the
`isAuthenticated()` guard fails, except `/langs`).

| Method + path | Action | `data` shape |
| --- | --- | --- |
| `GET /me` | `meAction` | `{ id, name, login, email, picture, isAdmin, capabilities }` — `capabilities` = map `melisKey → string[]` of allowed caps (admin ⇒ everything). |
| `GET /menu` | `menuAction` | `NavNode[]` — the rights-filtered nav tree. `?full=1` returns the **unfiltered** tree (rights editor only; requires `canAccess('meliscore_tool_user')`). |
| `GET /langs` | `langsAction` | `{ current: { id, locale }, langs: [{ id, locale, short, label }] }` — **public**. |
| `GET /assets` | `assetsAction` | CSS/JS URLs + inline JS globals for bootstrapping tool iframes (delegates to `MelisReactOverride\Service\PlatformAssetsService::build()`). |
| `GET /react-modules` | `reactModulesAction` | `{ data: BrickDef[], bundle: { url } }` — active modules' bricks; `bundle.url` = the concatenated JS. |
| `GET /bricks-bundle.js` | `bricksBundleAction` | **not JSON** — every active brick's IIFE concatenated into one immutable-cached JavaScript response. |
| `GET /dashboard/bubbles` | `dashboardBubblesAction` | `{ news, updates, notifications:{count,items}, messages }` counts (degrade to 0, never 404). |
| `GET /dashboard/stats` | `dashboardStatsAction` | `{ kpis:{ users, sites, pages, languages }, activity:[{ id, name, loginDate }] }`. |
| `GET /dashboard/legacy-plugins` | `legacyDashboardPluginsAction` | `[{ pluginName, title, icon, section, w, h }]` — legacy dashboard plugins as iframe widgets. |
| `GET \| POST /dashboard/layout` | `dashboardLayoutAction` | GET → saved tiles `[{ pluginName, pluginId, x, y, w, h }]`; POST → same JSON, saved to `melis_core_dashboards`. |
| `GET /rights/dashboard-plugins` | `rightsDashboardPluginsAction` | `[{ key, title, module }]` — authoritative dashboard-plugin list for the rights editor (`?userId=`). |
| `GET /rights/capabilities` | `rightsCapabilitiesAction` | map `melisKey → capability tree` **declared** by modules, `tr_*` labels translated to the session locale. |

**Boot set:** `/me`, `/menu`, `/langs`, `/assets`, `/react-modules` (+ `/bricks-bundle.js`).
The `/dashboard/*` and `/rights/*` endpoints back the dashboard and the Users → Rights editor.

A tool's own data endpoints are **not** here: `/melis/react-api/users…`, `/users/stats`,
`/roles` are declared in **MelisCore**; `/roles-list`, `/roles/save|stats|:id`,
`/workflow/roles` in **MelisSmallBusiness**; AI routes in **MelisAI**. The clients calling
this generic set live in `melis-core/ui-react/src/lib/melis-api.ts`.

Real fetch example — the shell's `/me` boot call:

```ts
// mirrors melis-core/ui-react/src/lib/melis-api.ts
const res = await fetch('/melis/react-api/me', {
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
  credentials: 'include',
})
const json = await res.json()                    // { success, data, error? }
if (!json.success) throw new Error(json.error)   // 401 → { success:false, error:'Unauthenticated' }
const { name, isAdmin, capabilities } = json.data
// capabilities: Record<melisKey, string[]>
// e.g. { melis_core_announcement_tool: ['list','create','edit'] }
```

## Capabilities — the resolver

This is the substance MelisReactApi provides to *other* modules: the "advanced rights"
system that gates the **internal components** of an already-authorised tool (list / create /
edit / delete / nested tabs), *subordinate to* the tool-access check
(`MelisCoreRights::canAccess`, unchanged).

**Declaration (in each module, not here).** A module declares, per tool `melisKey`, the
capabilities that exist via the merged config key `melisReactToolCapabilities`
(`config/react.capabilities.php`, merged in its `Module::getConfig()`):

```php
// <module>/config/react.capabilities.php  (declared BY the tool's module)
return [
  'melisReactToolCapabilities' => [
    'melis_core_announcement_tool' => ['list', 'create', 'edit', 'delete'],
    // or a TREE for nested tabs with their own actions:
    // 'some_tool' => ['actions' => ['list'], 'tabs' => [['key' => 'variants', 'actions' => ['list','create']]]],
  ],
];
```

**Resolver — `MelisReactApi\Service\Capabilities`** (all static; `const CONFIG_KEY =
'melisReactToolCapabilities'`, `const SECTION = 'meliscore_tool_capabilities'`):

| Method | Role |
| --- | --- |
| `declared($appConfig)` | The raw declared map (the rights editor renders it). |
| `flatten($node)` | Flatten a flat list OR `{ actions, tabs }` tree into dotted strings (e.g. `variants.list`). |
| `deniedFor($rightsXml, $toolKey)` | The deny-list read from the user/role rights XML. |
| `isAllowed($appConfig, $rightsXml, $toolKey, $cap)` | **Default-allow** — allowed unless the cap is both declared *and* in the deny-list. |
| `allowedForUser($appConfig, $rightsXml)` | The `melisKey → allowedCaps[]` map returned in `/me` (`$rightsXml = null`, e.g. admin ⇒ everything). |

**Storage.** Denials live in a dedicated section of the user/role rights XML, separate from
the legacy deny-list so the classic BO ignores it:

```xml
<meliscore_tool_capabilities>
  <tool key="melis_core_announcement_tool"><deny>delete</deny></tool>
</meliscore_tool_capabilities>
```

Preserving this section on a **legacy** save is done by the concerned modules (MelisCore for
USER, MelisSmallBusiness for ROLE).

**Guard — `MelisReactApi\Controller\CapabilityGuardTrait`.** A per-module tool controller
`use`s this trait, defines `const MELIS_KEY = '<the tool's melisKey>'`, and calls
`denyUnlessCan($cap)` **after** its tool-access check:

```php
use MelisReactApi\Controller\CapabilityGuardTrait;

class MelisReactApiFooController extends MelisAbstractActionController
{
    use CapabilityGuardTrait;
    const MELIS_KEY = 'melis_core_announcement_tool'; // the rights-bearing tool node

    public function saveAction()
    {
        if ($resp = $this->denyUnlessCan('edit')) return $resp;   // 403 JSON if denied
        // …call the module's Laminas service…
    }
}
```

`denyUnlessCan` reads the **effective** rights (`MelisCoreAuth::getAuthRights()` → user OR
role), **admins bypass**, and it is **default-allow** — a tool with no declaration keeps full
CRUD. Client-side, the same allow-map arrives in `/me` `data.capabilities` and gates the UI
(`melis-core/ui-react/src/lib/caps.ts`).

## Host integration

- **Discovery / bricks** — `GET /react-modules` scans **active** modules for
  `public/ui-react/brick.manifest.json` (a single object or a `bricks: [...]` array) and
  returns `BrickDef = { id, module, route, label, forwardKey, melisKey, subTabs, persistent,
  bundleUrl }`, plus `bundle.url = /melis/react-api/bricks-bundle.js?v=<sig>`. The shell loads
  the single concatenated bundle (each brick is an IIFE self-registering by id on
  `window.__MELIS_BRICK_COMPONENTS__` via `window.__melisRegisterBrick`, wrapped in
  try/catch). The `?v=` signature (name+mtime+size of every bundle) makes a 1-year immutable
  cache safe. A brick exists **iff** its module is active — the modularity rule.
- **Menu builder (`GET /menu`)** — walks the leftmenu interface, applies section/tool
  ordering, and emits `NavNode[]` where each node is `{ key, name, icon, melisKey, isTool,
  forward, hasNavChild, configChildCount, children }`. A top **section** is a container
  (pruned only if empty); a clickable `is_parent_tool` section is gated by
  `canAccess(target)`; unknown newly-installed sections use permissive rights so they stay
  visible. Two hooks extend it: `melisReactSidebarHostSections` (keep an empty section as a
  bare sidebar-host container carrying `sidebarModule`) and `melisReactRightsTools` (inject
  rights-only synthetic tool nodes, `?full=1` only).
- **Auth / assets bridge** — `/assets` returns the same CSS/JS the legacy `layoutCore.phtml`
  loads (delegated to `MelisReactOverride\Service\PlatformAssetsService`), so tool iframes
  bootstrap identically inside the React shell.
- **i18n** — `tr_*` labels (menu section names, capability tab labels) are translated to the
  current session locale (`meliscore` container `melis-lang-locale`) via
  `MelisCoreTranslation`; modules declare **keys**, never hard-coded text.

## Key files

| Concern | Path |
| --- | --- |
| Module manifest / autoloader | `melis-react-api/src/Module.php` |
| Routes + invokable controller | `melis-react-api/config/module.config.php` |
| Generic actions (12) | `melis-react-api/src/Controller/MelisReactApiController.php` |
| Capability guard trait | `melis-react-api/src/Controller/CapabilityGuardTrait.php` |
| Capability resolver | `melis-react-api/src/Service/Capabilities.php` |

See also: [melis-core](/reference/modules/melis-core) ·
[melis-small-business](/reference/modules/melis-small-business) ·
[melis-ai](/reference/modules/melis-ai)
