# Architecture deep-dive

This page traces a request **end to end** and names the real classes, events and services
involved. It complements [Concepts](./concepts): read that first for the vocabulary, read this to
understand the *mechanics*. It's also the page to read if you (or an AI assistant) need a complete
mental model of how Melis works.

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

Finally the platform file `config/autoload/platforms/<MELIS_PLATFORM>.php` injects the **database
connection** and platform settings into the merged config.

## Backoffice request lifecycle

For a `/melis…` URL, MelisCore drives the flow. Key hooks are attached in
`MelisCore\Module::onBootstrap()`:

1. **Routing** — the `melis-backoffice` route (and its children: `login`, `authenticate`,
   `logout`, `zoneview`, …) matches.
2. **`MvcEvent::EVENT_ROUTE` → identity check** — `Module::checkIdentity()` runs. If the matched
   route isn't in the excluded list (`login`, `authenticate`, `change-language`…) and the user
   isn't authenticated, it **redirects to `/melis/login`** (or returns 404 for non-GET).
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

## Authentication & rights

**Login** is handled by `MelisCoreAuth` (`MelisCoreAuthService`), a Laminas authentication
service over the `melis_core_user` table (`usr_login` / `usr_password`, bcrypt via
`password_hash`). The authenticated identity — including the user's `usr_rights` — is stored in the
session.

**Rights** gate the backoffice. `MelisCoreRights` (`MelisCoreRightsService`) reads the user's
`usr_rights` — an **XML allow-list** — to decide what's visible and dispatchable:

- The **left-menu sections** a user sees are the `*_toolstree_section` nodes listed in their
  rights (`isAccessible()`); an **empty rights XML means full access**.
- A tool the user lacks rights for yields *"You don't have access to this tool"*.
- Rights live on `melis_core_user.usr_rights`; for role-based users they can come from the role
  (`melis_core_user_role`). `MelisCoreCheckUserRightsListener` refreshes them periodically and
  logs the user out if `usr_status` becomes inactive.

::: tip Grant a new tool
After adding a tool, grant access via the backoffice **Access management**, or inject the
section into the rights XML with a migration — see `flyway/sql/V3__add_melisai_rights.sql`.
:::

## Front-office request lifecycle

For a public URL, **MelisFront** + **MelisEngine** render a CMS page:

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
[Troubleshooting](./troubleshooting).

## Events

Melis is heavily **event-driven**. Modules attach listeners in `Module::onBootstrap()` (and via the
shared event manager) to the MVC lifecycle (`EVENT_ROUTE`, `EVENT_DISPATCH`, `EVENT_RENDER`,
`EVENT_FINISH`) and to **Melis domain events** (e.g. `melis_core_auth_login_ok`, page save events).
Domain services extend `MelisGeneralService`, which adds `sendEvent()` so any service can publish
events other modules subscribe to. This is the primary, decoupled extension mechanism — prefer a
listener over patching another module.

## The request, in one picture

```
public/index.php
  → application.config.php  (MelisModuleManager assembles modules + platform DB config)
  → Laminas MVC run
     ├── /melis…   → auth (checkIdentity) → rights → PluginViewController zones (forwards)
     └── public URL → MelisFront route (id/SEO) → MelisEngine page load → site template
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
