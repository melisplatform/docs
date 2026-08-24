# MelisComposerDeploy

> Embeds Composer functionality within the platform to manage packages programmatically. Package `melisplatform/melis-composerdeploy`.

## Purpose

MelisComposerDeploy enables programmatic package management by embedding Composer functionality within the Melis platform, eliminating the need for terminal access to install, update, or remove modules. The module operates invisibly through the back-office Modules tool, handling installation, updates, and removal of marketplace packages. It depends only on `composer/composer` (v2.5.8) and operates as a standalone tool without coupling to MelisCore.

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisComposerDeploy',
];
```

This module sits in the MelisCore foundation layer alongside MelisAssetManager, MelisDbDeploy, and MelisInstaller.

## Key services

| Service alias | Role |
| --- | --- |
| `MelisComposerService` | Main interface for running Composer operations in-process. Provides `download()`, `update()`, `remove()`, and `dumpAutoload()` methods. Constructed via a factory pattern with appropriate Composer I/O handling. |

## Backoffice

MelisComposerDeploy has no dedicated back-office screens of its own. It serves as the underlying engine for the back-office Modules tool and MelisInstaller, which call into `MelisComposerService` to perform package operations.

## Example

A typical workflow installs a package and immediately applies database migrations:

```php
// Install a package via the Modules tool integration
$composerSvc = $sm->get('MelisComposerService');
$composerSvc->download('melisplatform/melis-cms-news'); // composer require
$composerSvc->dumpAutoload();                           // composer dump-autoload
// MelisDbDeploy then applies any database migrations for the new module
```

See also: [MelisDbDeploy](/legacy/reference/modules/melis-dbdeploy), [MelisInstaller](/legacy/reference/modules/melis-installer), [MelisAssetManager](/legacy/reference/modules/melis-asset-manager)
