# Architecture deep-dive

This page traces a request **end to end** and names the real classes, events and services
involved. It complements [Concepts](./concepts): read that first for the vocabulary, read this to
understand the *mechanics*. It's also the page to read if you (or an AI assistant) need a complete
mental model of how Melis works.

Melis **v6** keeps the same framework, modules and request lifecycle as v5 — what changed is the
**back-office UI**. The classic server-rendered tools at `/melis` are still there, but the default
experience is now a **React single-page app at `/melis-react`** that loads native-React tools
("bricks") and falls back to the classic tools inside an iframe. The sections below keep all the
unchanged mechanics and add the React shell where it belongs.

## Bootstrap

`public/index.php` loads Composer's autoloader, merges
`config/application.config.php` with `config/development.config.php` (when present), then runs the
Laminas MVC application.

`config/application.config.php` builds the module list dynamically:

```php
'modules' => array_merge(
    MelisCore\MelisModuleManager::getModuleComponents(), // framework components first
    MelisCore\MelisModuleManager::getModules()           // then Melis modules
),
'module_listener_options' => [
    'module_paths'      => ['./module', './module/MelisSites'],
    'config_glob_paths' => [
        realpath(__DIR__) . '/autoload/{{,*.}global,{,*.}local}.php',
        realpath(__DIR__) . '/autoload/platforms/' . getenv('MELIS_PLATFORM') . '.php',
    ],
],
```

`MelisCore\MelisModuleManager` (`vendor/melisplatform/melis-core/src/MelisModuleManager.php`)
assembles three kinds of modules depending on the request:

- **Components** — framework dependencies, declared per module in `config/module.load.php`.
- **Modules** — the backoffice modules from `config/melis.module.load.php`.
- **Site modules** — for a front-office URL, the site selected by `MELIS_MODULE`
  (from `module/MelisSites/<name>` or a vendor site like `MelisDemoCms`).

The React back-office adds two **infrastructure modules** to this list —
[`melis-react-api`](/reference/modules/melis-react-api) (the JSON API backbone) and
[`melis-react-override`](/reference/modules/melis-react-override) (the SPA route + legacy-tool
iframe mechanism). Both are loaded through `application.config.php` `module_paths` (they are not
composer-autoloaded) and register themselves via `StandardAutoloader`.

Finally the platform file `config/autoload/platforms/<MELIS_PLATFORM>.php` injects the **database
connection** and platform settings into the merged config.

## Backoffice request lifecycle

There are now **two ways in** to the back-office, both driven by MelisCore's routing and identity
check:

- **`/melis-react…`** — the React shell (the default UI). A regex route serves a single HTML
  document; everything else is JSON fetched over `/melis/react-api/…` and tools rendered as bricks
  or iframes (see below).
- **`/melis…`** — the classic server-rendered back-office, still fully functional and used as the
  iframe target for legacy tools.

For a **`/melis…`** URL, MelisCore drives the classic flow. Key hooks are attached in
`MelisCore\Module::onBootstrap()`:

1. **Routing** — the `melis-backoffice` route (and its children: `login`, `authenticate`,
   `logout`, `zoneview`, `react-tool-page`, …) matches.
2. **`MvcEvent::EVENT_ROUTE` → identity check** — `Module::checkIdentity()` runs. If the matched
   route isn't in the excluded list (`login`, `authenticate`, `change-language`, the React SPA and
   its boot endpoints…) and the user isn't authenticated, it **redirects to `/melis/login`** (or
   returns 404 for non-GET).
3. **Session & language** — the session container `meliscore` is initialised; the locale
   (`melis-lang-locale`) drives `Module::createTranslations()` which loads
   `language/<locale>.{interface,forms,…}.php`.
4. **`EVENT_DISPATCH`** — the layout is set to `layout/layoutCore`, and core listeners run:
   `MelisCoreCheckUserRightsListener` (re-reads rights periodically), `MelisCoreFlashMessengerListener`,
   `MelisCorePhpWarningListener`, and others.
5. **Zone rendering** — the backoffice UI is a tree of **zones**; `PluginViewController` resolves
   each zone's `forward` (module/controller/action) and renders it, assembling the final HTML
   (see [Concepts → zones & forwards](./concepts#_3-zones-forwards-how-the-backoffice-renders)).

```
GET /melis
  → route: melis-backoffice
  → EVENT_ROUTE: checkIdentity() → redirect to /melis/login if not logged in
  → EVENT_DISPATCH: layout = layout/layoutCore; rights/flash/warning listeners
  → PluginViewController renders zones (header, left menu, center, footer) via forwards
  → response
```

## React back-office lifecycle

For a **`/melis-react…`** URL, the flow is split between a one-time shell load and subsequent JSON
calls:

1. **SPA route** — `MelisReactOverride\Controller\SpaController` serves the React shell
   `index.html` (built into `melis-core/public/ui-react/`) for `/melis-react` and every deep link
   under it (`/melis-react/news/5`, …). The route is **public** — the React app runs its **own
   login screen** — and wins over MelisFront's catch-all via a high-priority regex route.
2. **Boot fetches** — the shell calls the generic
   [`melis-react-api`](/reference/modules/melis-react-api) endpoints:
   `GET /me` (current user + capabilities), `GET /menu` (the rights-filtered nav tree),
   `GET /langs` (back-office languages), `GET /assets` (CSS/JS for tool iframes), and
   `GET /react-modules` + `/bricks-bundle.js` (brick discovery). Every response is the
   `{ success, data, error? }` contract.
3. **Tool rendering** — clicking a menu entry opens a **brick** (a native-React tool) if its module
   ships one, otherwise a **legacy tool in an iframe** served by
   `/melis/react-tool-page?key=<melisKey>` (see [Bricks & the iframe mechanism](#bricks-the-iframe-mechanism)).
4. **AI Assistant overlay** — a floating chat button rendered once at the shell root (from
   [`melis-ai`](/reference/modules/melis-ai)) survives navigation and can drive the back-office
   (open a tool, open a page) from the conversation. See the [AI guide](./ai).

```
GET /melis-react
  → SpaController serves ui-react/index.html (public route)
  → shell boot: GET /me, /menu, /langs, /assets, /react-modules (+ /bricks-bundle.js)
  → click a tool → React brick, or iframe → /melis/react-tool-page?key=<melisKey>
  → AI Assistant overlay mounted at the shell root
```

## Bricks & the iframe mechanism

The React shell is **modular**: a tool appears **if and only if** its module is active.

- **Brick discovery** — `GET /melis/react-api/react-modules` scans active modules for
  `public/ui-react/brick.manifest.json` and returns their `BrickDef`s (`{ id, module, route, label,
  forwardKey, melisKey, subTabs, … }`) plus a single concatenated `/bricks-bundle.js`. Each brick is
  an IIFE that self-registers on `window.__MELIS_BRICK_COMPONENTS__`; the `?v=<sig>` signature makes
  the bundle safely cacheable for a year.
- **New / Old toggle** — most bricks carry a **New (React) / Old (iframe)** toggle. *New* is the
  native React screen; *Old* loads the classic tool through the iframe mechanism below, so nothing
  is ever lost during the migration.
- **Legacy iframe** — [`melis-react-override`](/reference/modules/melis-react-override)'s
  `PluginViewController::toolPageAction()` renders exactly one zone (resolved from `?key=<melisKey>`)
  as a **standalone HTML page** and hands it back with `X-Frame-Options: SAMEORIGIN`. It forces
  `X-Requested-With: XMLHttpRequest` so `follow_regular_rendering:false` zones render the AJAX way,
  pins the PHP session id across render, injects the tool's own module JS/CSS `ressources`
  (the core `bundle.js` only carries MelisCore's tools), and works around a long list of legacy
  quirks so the tool inside the frame looks and behaves exactly like direct `/melis` access
  (its own DataTables, modals, gritter toasts and per-field validation).

The shell serves platform assets to those iframes via
`MelisReactOverride\Service\PlatformAssetsService::build()` — the same CSS/JS the classic
`layoutCore.phtml` loads — so a legacy tool bootstraps identically inside the React shell.

## Authentication & rights

**Login** is handled by `MelisCoreAuth` (`MelisCoreAuthService`), a Laminas authentication
service over the `melis_core_user` table (`usr_login` / `usr_password`, bcrypt via
`password_hash`). The authenticated identity — including the user's `usr_rights` — is stored in the
session. The React shell drives the **same** auth (it renders its own login screen but posts to the
same service); `GET /me` returns the identity once authenticated, `GET /langs` and the login-panel
branding read are the only endpoints public before login.

**Rights** gate the backoffice. `MelisCoreRights` (`MelisCoreRightsService`) reads the user's
`usr_rights` — an **XML allow-list** — to decide what's visible and dispatchable:

- The **left-menu sections** a user sees are the `*_toolstree_section` nodes listed in their
  rights (`isAccessible()`); an **empty rights XML means full access**. In the React shell the same
  filtering happens server-side in `GET /menu`, which emits only the nodes the user may `canAccess`.
- A tool the user lacks rights for yields *"You don't have access to this tool"*.
- Rights live on `melis_core_user.usr_rights`; for role-based users they can come from the role
  (`melis_core_user_role`). `MelisCoreCheckUserRightsListener` refreshes them periodically and
  logs the user out if `usr_status` becomes inactive.

**Advanced rights (capabilities).** The React back-office adds a finer layer *subordinate to* the
tool-access check: per-tool **capabilities** (`list` / `create` / `edit` / `delete`, or nested
tabs). Modules declare which capabilities exist via `config/react.capabilities.php`; the resolver
`MelisReactApi\Service\Capabilities` is **default-allow** — a capability is denied only if it is
both declared and present in a dedicated `<meliscore_tool_capabilities>` section of the rights XML.
Tool controllers gate their actions with `CapabilityGuardTrait::denyUnlessCan($cap)` (admins bypass),
and the same allow-map arrives client-side in `GET /me` to hide UI. This lives in
[`melis-react-api`](/reference/modules/melis-react-api); the deny-list is edited in **Users → Rights**.

::: tip Grant a new tool
After adding a tool, grant access via **Users → Rights** in the React back-office (its advanced-rights
matrix is fed by `GET /rights/capabilities`), or inject the section into the rights XML with a
migration — see `flyway/sql/V3__add_melisai_rights.sql`.
:::

## Front-office request lifecycle

For a public URL, **MelisFront** + **MelisEngine** render a CMS page (unchanged in v6):

1. **Routing** — `melis-front` matches `…/id/{idpage}`. SEO URLs (`/about-us`) are resolved to a
   page id by `MelisFrontSEORouteListener` (it queries the page-SEO table and registers a dynamic
   route at module-load time).
2. **Dispatch** — front listeners select the front layout and consult the page cache.
3. **Page load** — `MelisEngine\Service\MelisPageService::getDatasPage($idPage, $type)` returns a
   `MelisPage` (page-tree data + template), cached under `getDatasPage_{id}_{type}`.
4. **Template render** — the template's `ZF2` controller/action renders the site module's `.phtml`;
   `MelisTag` zones and `MelisDragDropZone` plugins are filled from the **published** content.

```
GET /about-us
  → MelisFrontSEORouteListener maps /about-us → idpage=5
  → MelisFront\Controller\Index::index(idpage=5)
  → MelisPageService::getDatasPage(5, 'published')  (cached)
  → template ZF2 controller/action → site .phtml → MelisTag / MelisDragDropZone
  → response
```

> The high-priority `/melis-react` regex route deliberately wins over this catch-all, so a full-page
> reload on a React deep link resolves to the SPA rather than a "404 page not found".

## Caching

Melis caches aggressively through filesystem caches under `cache/`:

| Cache | Holds |
| --- | --- |
| `meliscore_platform_cache-*` | rendered backoffice zones / platform config |
| `meliscms_page-*`, `melisfront_pages_file_cache-*` | rendered CMS pages |
| `cache/config/` | merged Laminas config (only if `config_cache_enabled`) |
| `datasource-*`, `melistoolcreator-*` | module-specific caches |

`MelisCoreCacheSystemService` is the cache API (`getCacheByKey`/`setCacheByKey`/
`deleteCacheByPrefix`). Caches are invalidated on key events (module changes, page publish, rights
updates) and can be cleared manually by deleting the relevant `cache/*` folders — see
[Troubleshooting](./troubleshooting). The React layer adds its own cheap caches: the discovery
bundle is served immutable with a content signature, and `PlatformAssetsService` memoises the
concatenated module CSS/JS (regenerating `etc/bundles/` if the Modules tool wiped it).

## Events

Melis is heavily **event-driven**. Modules attach listeners in `Module::onBootstrap()` (and via the
shared event manager) to the MVC lifecycle (`EVENT_ROUTE`, `EVENT_DISPATCH`, `EVENT_RENDER`,
`EVENT_FINISH`) and to **Melis domain events** (e.g. `melis_core_auth_login_ok`, page save events).
Domain services extend `MelisGeneralService`, which adds `sendEvent()` so any service can publish
events other modules subscribe to. This is the primary, decoupled extension mechanism — prefer a
listener over patching another module.

The React layer follows the same "accumulate, don't override" philosophy: instead of hardcoding
per-tool quirks, `melis-react-override` exposes a `toolpage_extensions` hook that any module can
implement to adjust a legacy tool's HTML or assets inside the frame (used, for example, by
[`melis-ai-community-extensions`](/reference/modules/melis-ai-community-extensions)).

## The request, in one picture

```
public/index.php
  → application.config.php  (MelisModuleManager assembles modules + platform DB config)
  → Laminas MVC run
     ├── /melis-react → SpaController serves the React shell (public)
     │                    → boot JSON: /me /menu /langs /assets /react-modules
     │                    → brick, or iframe → /melis/react-tool-page?key=<melisKey>
     ├── /melis…      → auth (checkIdentity) → rights → PluginViewController zones (forwards)
     └── public URL   → MelisFront route (id/SEO) → MelisEngine page load → site template
  → caching at every expensive step (MelisCoreCacheSystemService)
  → response
```

## Key files

| Concern | Path |
| --- | --- |
| App config / bootstrap | `config/application.config.php` |
| Module assembly | `vendor/melisplatform/melis-core/src/MelisModuleManager.php` |
| Core bootstrap / listeners | `vendor/melisplatform/melis-core/src/Module.php` |
| Auth | `vendor/melisplatform/melis-core/src/Service/MelisCoreAuthService.php` |
| Rights | `vendor/melisplatform/melis-core/src/Service/MelisCoreRightsService.php` |
| Config tree | `vendor/melisplatform/melis-core/src/Service/MelisCoreConfigService.php` |
| Zone rendering | `vendor/melisplatform/melis-core/src/Controller/PluginViewController.php` |
| Cache API | `vendor/melisplatform/melis-core/src/Service/MelisCoreCacheSystemService.php` |
| Front routing/SEO | `vendor/melisplatform/melis-front/src/Listener/MelisFrontSEORouteListener.php` |
| Page service | `vendor/melisplatform/melis-engine/src/Service/MelisPageService.php` |
| React JSON API | `vendor/melisplatform/melis-react-api/src/Controller/MelisReactApiController.php` |
| Capability resolver | `vendor/melisplatform/melis-react-api/src/Service/Capabilities.php` |
| SPA + legacy iframe | `vendor/melisplatform/melis-react-override/src/Controller/` |
| React shell (SPA source) | `vendor/melisplatform/melis-core/ui-react/` |
