# MelisInstaller

> The platform's first-run setup wizard — orchestrates system checks, database setup, module download and activation. Package `melisplatform/melis-installer`.

## Purpose

MelisInstaller is a web wizard that runs on a fresh Melis skeleton before the platform is fully set up. It walks through server checks (PHP extensions, Apache modules, vhost environment variables, directory permissions), database connection testing, setup-type selection, module download via Composer, database-table import via DbDeploy, per-module configuration, and final installation. Once setup completes it is no longer active; day-to-day module management is handled from the back-office Modules tool (MelisComposerDeploy).

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisInstaller',
];
```

MelisInstaller requires `melisplatform/melis-core` and `melisplatform/melis-engine` (`^5.2`) as Composer dependencies. During the install flow it drives **MelisComposerDeploy** (package download) and **MelisDbDeploy** (table imports), and once modules are activated **MelisAssetManager** serves their assets.

## Key services

| Service alias | Role |
| --- | --- |
| `InstallHelperService` | System and DB checks: required-extension verification, writable-path checks, `checkMysqlConnection()`, DB adapter + raw-SQL bootstrap, and `isDbTableExists()` (detects a partial install). Powers Steps 1 and 2 of the wizard. |
| `MelisInstallerModulesService` | Module discovery and selection: all / vendor / user / site / core modules, versions, Composer paths. Powers the Step 3.1 module checklist. |
| `MelisInstallerConfigService` | Reads and merges the installer's own config tree before MelisCore is fully available: `getItem()`, `getFormMergedAndOrdered()`. |
| `MelisInstallerTranslationService` | Supplies the wizard's UI translation messages: `getTranslationMessages()`. Works before MelisCore is available. |

The module also registers form-element factories (`MelisSelect`, `MelisText`, `MelisInstallerLanguageSelect`, `MelisInstallerWebOptionSelect`) and a `MelisPasswordValidator` that enforces the admin-password policy on the Configuration step.

## Backoffice

MelisInstaller does not add a back-office tool. It runs before the back-office exists. Its UI is served by two controllers:

| Controller | Role |
| --- | --- |
| `InstallerController` | Drives every wizard step: system checks, DB test, setup-type selection, Composer download, DbDeploy import, module activation, per-module configuration, and final install. Also exposes the `rollBackAction`. |
| `TranslationController` | Serves the wizard's own translation strings (the wizard runs before MelisCore translations are available). |

Two listeners hook into the install process:

| Listener | Role |
| --- | --- |
| `MelisInstallModuleConfigListener` | Handles module-config writing during installation. |
| `MelisInstallerNewPlatformListener` | Handles new-platform / environment setup. |

## Database tables

MelisInstaller defines no tables of its own. During setup it bootstraps the platform's database by importing SQL and running versioned deltas through MelisDbDeploy. The tables created belong to the modules being installed (MelisCore, MelisCms, etc.).

## Example

```php
// Retrieve installable modules and test the DB connection from inside a controller
$helper = $serviceManager->get('InstallHelperService');
$connected = $helper->checkMysqlConnection($host, $dbName, $user, $password);

$modulesSvc = $serviceManager->get('MelisInstallerModulesService');
$allModules  = $modulesSvc->getAllModules();          // full discoverable module list
$versions    = $modulesSvc->getModulesAndVersions();  // name → installed version map
```

## Key files

| Concern | Path |
| --- | --- |
| Module config, routes, service manager | `vendor/melisplatform/melis-installer/config/module.config.php` |
| App forms config | `vendor/melisplatform/melis-installer/config/app.forms.php` |
| Minimal wizard module loader | `vendor/melisplatform/melis-installer/config/module.load.php` |
| Wizard controller | `vendor/melisplatform/melis-installer/src/Controller/InstallerController.php` |
| Translation controller | `vendor/melisplatform/melis-installer/src/Controller/TranslationController.php` |
| System / DB / file-rights helpers | `vendor/melisplatform/melis-installer/src/Service/InstallHelperService.php` |
| Module discovery service | `vendor/melisplatform/melis-installer/src/Service/MelisInstallerModulesService.php` |
| Config merge service | `vendor/melisplatform/melis-installer/src/Service/MelisInstallerConfigService.php` |
| Translation service | `vendor/melisplatform/melis-installer/src/Service/MelisInstallerTranslationService.php` |
| Admin-password validator | `vendor/melisplatform/melis-installer/src/Validator/MelisPasswordValidator.php` |
| Wizard form view helpers | `vendor/melisplatform/melis-installer/src/Form/View/Helper/` |
| Install listeners | `vendor/melisplatform/melis-installer/src/Listener/` |
| Wizard views | `vendor/melisplatform/melis-installer/view/` |
| Language files | `vendor/melisplatform/melis-installer/language/` |

See also: [MelisCore](/reference/modules/melis-core) · [MelisDbDeploy](/reference/modules/melis-dbdeploy) · [MelisComposerDeploy](/reference/modules/melis-composerdeploy) · [MelisAssetManager](/reference/modules/melis-asset-manager)
