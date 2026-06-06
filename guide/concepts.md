# Architecture & concepts

Melis Platform is a **Laminas (ZF2-lineage) MVC application**. On top of standard Laminas it adds
a handful of conventions that power the backoffice. Understanding these five concepts is enough to
read — and extend — almost any part of the platform.

## 1. Modules

Everything in Melis is a **module** (a standard Laminas module). The list of backoffice modules
loaded by the application lives in:

```
config/melis.module.load.php
```

```php
return [
  'MelisAssetManager',
  'MelisDbDeploy',
  'MelisCore',
  'MelisCms',
  'MelisFront',
  // … your own modules go here
];
```

At bootstrap, `config/application.config.php` assembles the final module list via
`MelisCore\MelisModuleManager` (which merges these modules with component modules and the
site module selected by `MELIS_MODULE`).

A module bundles its own controllers, services, views, translations **and** a set of
Melis-specific config files (see below). Its `Module::getConfig()` merges them together.

## 2. The config tree & "melis keys"

Beyond the usual `module.config.php`, each backoffice module publishes **app config files** that
are merged into a single, queryable tree under a `plugins` root:

| File                  | Declares                                              |
| --------------------- | ---------------------------------------------------- |
| `app.interface.php`   | UI zones/sections and their **forwards** (see §3)    |
| `app.tools.php`       | Tools: data tables, columns, filters, action buttons |
| `app.toolstree.php`   | Where a tool attaches in the **left menu**           |
| `app.forms.php`       | Form definitions                                     |

You query this tree through the **`MelisCoreConfig`** service
(`vendor/melisplatform/melis-core/src/Service/MelisCoreConfigService.php`):

```php
$config = $sm->get('MelisCoreConfig');

// Fetch a node by path:
$node = $config->getItem('meliscore_leftmenu');

// Resolve all the "melis keys" → full config paths:
$keys = $config->getMelisKeys();
```

A **melis key** is a stable, human-friendly alias for a deeply nested config path, declared on a
node via `'conf' => ['melisKey' => 'my_key']`. It lets modules reference each other's UI without
hard-coupling to a path.

## 3. Zones & forwards (how the backoffice renders)

The backoffice UI is **config-driven**. A page is a tree of **zones**; each zone can declare a
**forward** — a `module / controller / action` triplet that renders that zone:

```php
'forward' => [
  'module'     => 'MelisCms',
  'controller' => 'PageTree',
  'action'     => 'render-page-tree',
],
```

`MelisCore\Controller\PluginViewController` walks the config tree, dispatches each forward, and
assembles the resulting HTML. This is why the left menu, headers and tools are all declared in
config rather than hard-coded — and why adding a tool is mostly a matter of **declaring the right
config** and providing a controller + view.

## 4. Services & factories

Melis relies on the **Laminas service manager**. Services are registered in each module's
`module.config.php` (`service_manager` → `aliases` / `factories`) and resolved by name:

```php
$svc = $this->getServiceManager()->get('MelisCoreConfig');
```

Common core services include `MelisCoreConfig`, `MelisCoreAuth`, `MelisCoreRights`,
`MelisCoreUser`, `MelisCoreTool`. Business services typically extend `MelisGeneralService`
(which adds event dispatching); database access goes through Laminas `TableGateway` wrappers.

## 5. Events

Modules hook into the request lifecycle in `Module::onBootstrap()` and via listeners on the
**shared event manager**. Core behaviour (authentication, rights checks, flash messages,
caching…) is wired this way, and you can publish/subscribe to custom Melis events — e.g.
`melis_core_auth_login_ok` fires after a successful login.

## Bonus: database changes (dbdeploy & flyway)

Schema and seed changes are versioned:

- **dbdeploy** (`MelisDbDeploy`): each module ships numbered SQL deltas; applied deltas are
  tracked in a `changelog` table so they run once. Module deltas are published into `dbdeploy/`.
- **flyway** (`flyway/sql/`): project-level migrations (e.g. `V3__add_melisai_rights.sql`),
  applied with `flyway migrate`.

## Where to look in the code

| Concern             | Path |
| ------------------- | ---- |
| Module list         | `config/melis.module.load.php` |
| App bootstrap       | `config/application.config.php` |
| Platform DB config  | `config/autoload/platforms/<MELIS_PLATFORM>.php` |
| Config service      | `vendor/melisplatform/melis-core/src/Service/MelisCoreConfigService.php` |
| Zone/forward render | `vendor/melisplatform/melis-core/src/Controller/PluginViewController.php` |
| Module manager      | `vendor/melisplatform/melis-core/src/MelisModuleManager.php` |

Next: put it together by [creating your first tool](./create-a-tool).
