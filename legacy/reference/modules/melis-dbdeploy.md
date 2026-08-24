# MelisDbDeploy

> Database-migration runner for the Melis platform — applies each module's SQL deltas in order.
> Package `melisplatform/melis-dbdeploy`.

## Purpose

`MelisDbDeploy` keeps every module's database schema in sync with the installed code. Each module
that opts in ships its schema changes as ordered SQL files (**deltas**) under
`install/dbdeploy/`. MelisDbDeploy discovers those deltas across all modules, applies the ones
not yet executed, and records each in a changelog table so it is applied exactly once — built on
top of [Phing](https://www.phing.info/)'s `DbDeployTask`.

It is part of the [MelisCore platform foundation](/legacy/reference/modules/melis-core) and has no
user-facing interface.

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisDbDeploy',
];
```

`MelisDbDeploy` depends only on `phing/phing` (`2.17.4`). It has **no** `melis-core` dependency —
it is a standalone tool invoked by MelisInstaller and by the module install/update flows.

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
| `MelisDbDeployDiscoveryService` | Finds every opted-in module's deltas and copies them to the working location, then delegates to the deploy service. |
| `MelisDbDeployDeployService` | Connects to the database, ensures the changelog table exists, and applies pending deltas via Phing. |

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

MelisDbDeploy is invoked automatically in two scenarios:

- **First install** — by **MelisInstaller** during the platform setup wizard.
- **Module install / update** — triggered through the back-office Modules tool / marketplace and
  Composer hooks.

It is not a user-facing tool and exposes no controllers.

## Key files

| Concern | Path |
| --- | --- |
| Discovery service | `vendor/melisplatform/melis-dbdeploy/src/Service/MelisDbDeployDiscoveryService.php` |
| Deploy service | `vendor/melisplatform/melis-dbdeploy/src/Service/MelisDbDeployDeployService.php` |
| Models | `vendor/melisplatform/melis-dbdeploy/src/Model/` |
| Module config / service aliases | `vendor/melisplatform/melis-dbdeploy/etc/` |
| Module deltas (any module) | `vendor/melisplatform/<module>/install/dbdeploy/*.sql` |

See also: [MelisCore](/legacy/reference/modules/melis-core) · [MelisInstaller](/legacy/reference/modules/melis-installer) · [MelisComposerDeploy](/legacy/reference/modules/melis-composerdeploy) · [Platform concepts](/legacy/guide/concepts)
