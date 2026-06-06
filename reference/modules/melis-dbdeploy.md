# MelisDbDeploy

> Versioned database deltas (the `changelog` mechanism) for Melis Platform —
> Composer package `melisplatform/melis-dbdeploy`.

## Purpose

`MelisDbDeploy` keeps every module's database schema in sync. Each Melis module ships its schema
changes as small, ordered SQL files (**deltas**) under `install/dbdeploy/`. After a Composer update
or a Marketplace install, MelisDbDeploy collects those deltas from all `melisplatform/*` packages,
applies the ones not yet run, and records each one in a single `changelog` table so it never runs
twice. Under the hood it drives the [Phing](https://www.phing.info/) `DbDeployTask`.

## Enable it

`MelisDbDeploy` is a standard Laminas module. It is listed in `config/melis.module.load.php`:

```php
return [
    // …
    'MelisDbDeploy',
    // …
];
```

It depends on `melis-core` (it extends `MelisCore\Service\MelisServiceManager` and reads
`config/autoload/platforms/*.php` for the DB credentials), on `melis-composerdeploy`
(`MelisComposerDeploy\MelisComposer` lists the Melis packages), on `melis-asset-manager`
(`MelisAssetManagerModulesService` provides the Composer instance), and on the Composer requirement
`phing/phing` (declared in the module's `composer.json`).

The deploy step is wired into the project's `composer.json` `post-update-cmd`:

```json
"post-update-cmd": [
    "MelisCore\\ModuleComposerScript::executeScripts",
    "MelisDbDeploy\\DbDeployOnComposerUpdate::postUpdate"
]
```

so deltas are applied automatically at the end of every `composer update`. See
[Module reference](/reference/modules) and [Marketplace](/reference/modules).

## How a delta is written

A delta is a plain `.sql` file in a module's `install/dbdeploy/` folder. The **numeric prefix** of
the filename is the delta's `change_number` (its order key); the rest is a human description. Real
examples from the shipped modules:

```
melis-core/install/dbdeploy/24051501_core_update_platform_table.sql
melis-document-upload/install/dbdeploy/24012603_document_upload_add_isactive_document.sql
```

```sql
-- 24051501_core_update_platform_table.sql
ALTER TABLE `melis_core_platform`
  ADD `plf_activate_cache` INT NOT NULL DEFAULT '1' AFTER `plf_update_marketplace`;
```

Higher-numbered deltas run after lower-numbered ones, and only if their `change_number` is not
already present in `changelog`.

## Key services

Registered as `service_manager` aliases in `config/module.config.php`:

| Service alias | Role |
| --- | --- |
| `MelisDbDeployDiscoveryService` | Scans all `melisplatform/*` Composer packages, copies their `install/dbdeploy/*.sql` deltas into the runtime `dbdeploy/data/` cache, then delegates to the deploy service. Entry point: `processing($module = null)` (pass a module name to limit it to one package). |
| `MelisDbDeployDeployService` | Connects to the DB (PDO/MySQL), ensures the `changelog` table exists, and applies pending deltas via Phing's `DbDeployTask`. Key methods: `isInstalled()`, `install()`, `changeLogCount()`, `applyDeltaPath($deltaPath)`. |
| `ChangelogTable` | `TableGateway` over the `changelog` table (`MelisGenericTable`, primary key `change_number`). |

`MelisDbDeployDeployService` constants worth knowing: `TABLE_NAME = 'changelog'`,
`OUTPUT_FILENAME = 'melisplatform-dbdeploy.sql'`,
`OUTPUT_FILENAME_UNDO = 'melisplatform-dbdeploy-reverse.sql'`. It applies deltas as
`applied_by = 'MelisDbDeploy'`.

## How it runs

Two entry points trigger the same pipeline:

- **Composer** — `DbDeployOnComposerUpdate::postUpdate()` runs on `post-update-cmd`. It copies every
  Melis package's deltas into `dbdeploy/data/`, then loops `MelisDbDeployDeployService` until
  `changeLogCount()` equals the number of cached delta files.
- **Marketplace** — when a module is installed/updated from the backoffice,
  `MelisMarketPlaceController` calls
  `MelisDbDeployDiscoveryService->processing($module)` for that package.

`Module::run()` exposes the discovery pipeline as a static helper as well. Both paths create the
runtime `dbdeploy/` folder if missing, create the `changelog` table on first run, and skip any
delta already recorded.

## Backoffice

None. MelisDbDeploy ships **no** backoffice tool, view, controller plugin, dashboard plugin or
templating plugin — it is platform plumbing invoked by Composer and by the
[Marketplace](/reference/modules). It does declare a `diagnostic` entry in `config/diagnostic.config.php`
(used by the platform self-diagnostic).

## Database tables

| Table | Role |
| --- | --- |
| `changelog` | Ledger of applied deltas. Columns: `change_number`, `delta_set`, `start_dt`, `complete_dt`, `applied_by`, `description`; primary key `(change_number, delta_set)`. Created from `data/changelog.sql`. |

Note: unlike most modules, the bookkeeping table is named `changelog` (not `melis_*`) — the name is
fixed because it is a Phing `DbDeployTask` dependency.

## Key files

| Concern | Path |
| --- | --- |
| Module bootstrap / `run()` | `vendor/melisplatform/melis-dbdeploy/src/Module.php` |
| Composer post-update hook | `vendor/melisplatform/melis-dbdeploy/src/DbDeployOnComposerUpdate.php` |
| Discovery service | `vendor/melisplatform/melis-dbdeploy/src/Service/MelisDbDeployDiscoveryService.php` |
| Deploy service (Phing) | `vendor/melisplatform/melis-dbdeploy/src/Service/MelisDbDeployDeployService.php` |
| `changelog` table model | `vendor/melisplatform/melis-dbdeploy/src/Model/Table/ChangelogTable.php` |
| `changelog` create SQL | `vendor/melisplatform/melis-dbdeploy/data/changelog.sql` |
| Service aliases | `vendor/melisplatform/melis-dbdeploy/config/module.config.php` |
| Example deltas (any module) | `vendor/melisplatform/<module>/install/dbdeploy/*.sql` |
