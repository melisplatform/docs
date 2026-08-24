# MelisDbDeploy

> Headless database-migration runner for the Melis platform — applies each module's SQL deltas in order. Package `melisplatform/melis-dbdeploy`.

## Purpose

`MelisDbDeploy` keeps every module's database schema in sync with the installed code. Each module
that opts in ships its schema changes as ordered SQL files (**deltas**) under
`install/dbdeploy/`. MelisDbDeploy discovers those deltas across all modules, applies the ones
not yet executed, and records each in a changelog table so it is applied exactly once — built on
top of [Phing](https://www.phing.info/)'s `DbDeployTask`.

It has **no user-facing interface**.

## Relationship to the React back-office

MelisDbDeploy has **no React tool, no page, no menu entry, no route**. It never appears anywhere in
`/melis-react`. There is no `ui-react/` brick, no `config/react-api.php`, no
`config/react.capabilities.php` and no `src/Controller/` — it is a headless, service-only module.

Its link to the React back-office is entirely **indirect**, via two facts:

- **It creates the tables and columns the React tools read and write.** Every React tool (Users,
  Pages CMS, Sites, Media, …) queries database tables. Those tables — and the columns newer React
  features add — are created by the owning module's `install/dbdeploy/*.sql` deltas, which
  MelisDbDeploy applies. If a React tool errors with "table/column not found" right after an
  install or update, an un-run migration is the usual cause.
- **It runs in the deploy pipeline that ships the React build.** The committed React build
  (`melis-core/public/ui-react/`, app at `/melis-react`) is shipped by the same deployment that
  runs schema migrations. MelisDbDeploy handles the **module-shipped** SQL deltas; **Flyway**
  handles the versioned platform migrations (`V*.sql`). They are complementary mechanisms in the
  same deploy step.

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisDbDeploy',
];
```

`MelisDbDeploy` depends only on `phing/phing`. It has **no** `melis-core` dependency — it is a
standalone tool invoked by MelisInstaller and by the module install/update flows, never called
from React.

## Opting a module in

A module participates in the migration system by declaring the following in its `composer.json`:

```json
"extra": {
    "dbdeploy": true
}
```

Its SQL deltas are placed in `install/dbdeploy/*.sql`. Each filename starts with a numeric prefix
that defines the execution order (e.g. `23051701_create_my_table.sql`).

## Key services

| Service alias | Role |
| --- | --- |
| `MelisDbDeployDiscoveryService` | Finds every opted-in `melisplatform/*` package's deltas and copies them to the working cache (`dbdeploy/data/`), then delegates to the deploy service. |
| `MelisDbDeployDeployService` | Connects to the database, ensures the changelog table exists, and applies pending deltas via Phing's `DbDeployTask` + `PDOSQLExecTask`. |

## The changelog table

Every applied delta is recorded in a fixed `changelog` table (the name is required by the Phing
task), which acts as the "applied-once" ledger:

```sql
CREATE TABLE IF NOT EXISTS changelog (
  `change_number` BIGINT NOT NULL,
  `delta_set`     VARCHAR(10) NOT NULL,
  `start_dt`      TIMESTAMP NOT NULL,
  `complete_dt`   TIMESTAMP NULL,
  `applied_by`    VARCHAR(100) NOT NULL,
  `description`   VARCHAR(500) NOT NULL,
  PRIMARY KEY `Pkchangelog` (`change_number`, `delta_set`)
);
```

Model access is via `MelisDbDeploy\Model\Table\ChangelogTable` (aliased `ChangelogTable`).

## Example

```php
// Discovery — gather deltas from all dbdeploy modules
$discovery = $sm->get(\MelisDbDeploy\Service\MelisDbDeployDiscoveryService::class);
$discovery->setComposer($composer);
$discovery->processing();   // discovers modules and copies their *.sql deltas

// Deploy — apply pending deltas
$deploy = new \MelisDbDeploy\Service\MelisDbDeployDeployService(/* db params */);
if (!$deploy->isInstalled()) {
    $deploy->install();                  // creates the changelog table on first run
}
$count = $deploy->changeLogCount();      // number of deltas applied so far
$deploy->applyDeltaPath($pathToDeltas);  // run any not-yet-applied deltas
```

## When it runs

MelisDbDeploy is invoked automatically in two scenarios, neither of which involves the React UI:

- **First install** — by **MelisInstaller** during the platform setup wizard.
- **Module install / update** — through the back-office Modules tool / marketplace and the Composer
  post-update hook (`DbDeployOnComposerUpdate::postUpdate()`), which copies each module's deltas and
  re-applies until the changelog count matches the number of delta files (idempotent convergence).

It exposes no controllers.

## Troubleshooting

If a React tool shows empty data or a 500 / "table doesn't exist" right after a module install,
update or deploy, the typical root cause is an **un-run dbdeploy delta** (or a missing Flyway
migration) — not the React code. Re-running the migration flow fixes it.

## Key files

| Concern | Path |
| --- | --- |
| Discovery service | `vendor/melisplatform/melis-dbdeploy/src/Service/MelisDbDeployDiscoveryService.php` |
| Deploy service | `vendor/melisplatform/melis-dbdeploy/src/Service/MelisDbDeployDeployService.php` |
| Composer post-update hook | `vendor/melisplatform/melis-dbdeploy/src/DbDeployOnComposerUpdate.php` |
| Changelog DDL | `vendor/melisplatform/melis-dbdeploy/data/changelog.sql` |
| Models | `vendor/melisplatform/melis-dbdeploy/src/Model/` |
| Module deltas (any module) | `vendor/melisplatform/<module>/install/dbdeploy/*.sql` |

See also: [MelisCore](/reference/modules/melis-core) · [MelisInstaller](/reference/modules/melis-installer) · [MelisComposerDeploy](/reference/modules/melis-composerdeploy) · [Platform concepts](/guide/concepts)
