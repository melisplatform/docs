# MelisComposerDeploy

> Composer-driven deployment of Melis modules: runs `composer` commands in-process and reads the
> list of installed packages. Package `melisplatform/melis-composerdeploy`.

## Purpose

`MelisComposerDeploy` is the platform's bridge to Composer. It bundles its own Composer runtime
(`composer/composer`) and exposes two things: a service that runs `require` / `update` / `remove` /
`dump-autoload` from inside PHP (so the [Marketplace](/reference/modules) can install or remove a
module without shelling out), and a lightweight reader that lists the installed Melis packages by
parsing `vendor/composer/installed.json`. It has no backoffice screens, front-office plugins or
database tables of its own — it is plumbing that other modules consume.

## Enable it

It is a standard Laminas module, listed in `config/melis.module.load.php`:

```php
return [
    // …
    'MelisComposerDeploy',
    // …
];
```

It depends on `melis-core` (`MelisComposerService` extends `MelisCore\Service\MelisServiceManager`)
and on the `composer/composer` library declared in its `composer.json`. The module ships
`extra.dbdeploy: true`, so it participates in [dbdeploy](/reference/modules) versioning, but it
defines no deltas. It is loaded early — it sits among the default core modules
(`MelisAssetManager`, `MelisComposerDeploy`, `MelisDbDeploy`, `MelisCore`).

## Key services

| Service / class | Role |
| --- | --- |
| `MelisComposerService` *(service alias)* | Runs Composer commands in-process via the bundled runtime. Methods: `download($package, $version = null, $noInstall = false)` (`composer require`), `update($package = null, $version = null, $dryRun = false)`, `remove($package)`, `dumpAutoload()`. `setDryRun()` / `setDocumentRoot()` control the run. |
| `MelisComposerDeploy\MelisComposer` *(plain class, `new`-ed directly)* | Reads `vendor/composer/installed.json`. `getInstalledPackages()` returns every package; `getMelisPackages()` filters to `type === 'melisplatform-module'` packages that declare `extra.module-name`; `getComposerModulePath($moduleName, $returnFullPath = true)` resolves a module name to its vendor path. |

Notes grounded in the code:

- `MelisComposerService` whitelists the commands it will run — only `install`, `update`,
  `require`, `remove` and `dump-autoload` are accepted (see `availableCommands()`); anything else
  returns a "tr_market_place_unknown_command" message.
- Commands run with `--no-interaction`, `--ignore-platform-reqs`, `--no-scripts`,
  `--prefer-dist`, `--no-progress` and `--working-dir` pointing at the platform root. Output is
  streamed to `php://output` and HTML-decorated by `ComposerOutputFormatterStyle` (so Composer's
  ANSI colours render as `<span style="color:…">` in the browser instead of raw VT100 codes).
- The service is created by `MelisComposerServiceFactory`, which injects the service manager.

## Backoffice

None. The module adds no tools, dashboard plugins, controllers or `melisKey` entries. The
backoffice consumer is `melis-marketplace`, whose controller calls
`MelisComposerService->download()` / `remove()` / `dumpAutoload()` to install and uninstall modules.

## Front office

None. No templating plugins, view helpers or controller plugins.

## Database tables

None. The module declares `dbdeploy: true` but ships no SQL deltas and creates no `melis_*` tables.

## Example

Resolve a module's path and list the installed Melis modules (the pattern used by `melis-engine`,
`melis-asset-manager` and `melis-dbdeploy`):

```php
$melisComposer = new \MelisComposerDeploy\MelisComposer();

// Absolute path to a module on disk, by its Laminas module name
$path = $melisComposer->getComposerModulePath('MelisCmsNews'); // …/vendor/melisplatform/melis-cms-news

// Every installed melisplatform-module that declares extra.module-name
$melisPackages = $melisComposer->getMelisPackages();
```

Install a package in-process (the Marketplace pattern):

```php
$composerSvc = $sm->get('MelisComposerService');
$composerSvc->download('melisplatform/melis-cms-news'); // composer require
$composerSvc->dumpAutoload();                           // composer dump-autoload
```

## Key files

| Concern | Path |
| --- | --- |
| Module bootstrap | `vendor/melisplatform/melis-composerdeploy/src/Module.php` |
| Service alias config | `vendor/melisplatform/melis-composerdeploy/config/module.config.php` |
| Composer command service | `vendor/melisplatform/melis-composerdeploy/src/Service/MelisComposerService.php` |
| Service factory | `vendor/melisplatform/melis-composerdeploy/src/Service/Factory/MelisComposerServiceFactory.php` |
| Output HTML formatter | `vendor/melisplatform/melis-composerdeploy/src/Service/ComposerOutputFormatterStyle.php` |
| Installed-packages reader | `vendor/melisplatform/melis-composerdeploy/src/MelisComposer.php` |
| Bundled Composer runtime | `vendor/melisplatform/melis-composerdeploy/bin/` |
