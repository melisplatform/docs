# MelisInstaller

> The first-run setup wizard that turns a fresh skeleton into a running Melis
> Platform. Package: `melisplatform/melis-installer`.

## Purpose

`MelisInstaller` is the web installer Melis serves **before** the platform is set up. On a fresh
checkout it intercepts every request and redirects to `/melis/setup`, where it walks the user
through a step wizard: checking the system (PHP extensions, directory rights, Apache/vhost),
configuring database credentials and environments, selecting and downloading modules, running the
database deploy, and finally choosing the kind of install — an **empty** ready-to-use platform, a
generated **site module**, or the **MelisCmsDemo** learning site. Once setup completes the module
unloads itself and redirects to `/melis/login`, so it is only active during installation.

## Enable it

`MelisInstaller` is a standard Laminas module declared in `config/melis.module.load.php`. On a
fresh skeleton the module's own bootstrap (`src/Module.php`) writes a minimal loader containing
only the modules needed to run the wizard:

```php
['MelisAssetManager', 'MelisDbDeploy', 'MelisComposerDeploy', 'MelisInstaller', 'MelisModuleConfig']
```

It depends on `melisplatform/melis-core` (composer) and, at runtime, on `MelisComposerDeploy`
(to read installed Composer packages) and `MelisDbDeploy` (to apply database deltas). It is gated
by the `config/melis.install` flag file: while that flag is unset the installer forces the
`/melis/setup` route; once installation finishes the module removes itself from the loader (and,
for a site install, leaves the generated site module loaded). See
[Module reference](/reference/modules) and [Build a site](/guide/build-a-site).

## Key services

Registered in `config/module.config.php` under `service_manager` `aliases`:

| Service alias | Role |
| --- | --- |
| `InstallerHelper` (`InstallHelperService`) | System & install helpers: `checkMysqlConnection()`, `isExtensionsExists()`, `checkEnvironmentVariables()`, `importSql()` / `getSqlFileTables()`, `isDbTableExists()` / `dropDbTable()`, `filePermission()` / `isDirWritable()`, `xcopy()` / `deleteDirectory()`, `getAvailableModules()`, `getPackagistMelisModules()` / `getPackagistMelisSites()`. |
| `MelisInstallerModulesService` | Module discovery & the module loader: `getAllModules()`, `getVendorModules()`, `getUserModules()`, `getModulesAndVersions()`, `getModulePath()`, `getDependencies()` / `getChildDependencies()`, and `createModuleLoader()` which (re)writes `config/melis.module.load.php`. |
| `MelisInstallerConfig` (`MelisInstallerConfigService`) | Reads the merged app config tree (the `plugins` array) by melisKey / path: `getItem()`, `getItemPerPlatform()`, `getMelisKeys()`, plus form-merging helpers (`getFormMergedAndOrdered()`). |
| `MelisInstallerTranslation` (`MelisInstallerTranslationService`) | Supplies the installer's translation messages to the JS UI: `getTranslationMessages()`, `getTranslationsLocale()`, `getDateFormat()`. |

The module also registers form-element factories (`MelisSelect`, `MelisText`,
`MelisInstallerLanguageSelect`, `MelisInstallerWebOptionSelect`) and a `MelisPasswordValidator`.

## Backoffice

`MelisInstaller` does **not** add a backoffice tool — it runs before the backoffice exists. Its
routes live under `/melis/` and target two controllers:

| Route | Controller / action |
| --- | --- |
| `/` and `/melis/setup` | `MelisInstaller\Controller\Installer` → `indexAction` (the wizard UI) |
| `/melis/get-translations` | `MelisInstaller\Controller\Translation` → `getTranslation` (UI strings as JSON) |

`InstallerController` exposes the AJAX actions the wizard calls, e.g. `checkSysConfigAction`,
`checkApacheSetupAction`, `checkFileSystemRightsAction`, `testDatabaseConnectionAction`,
`newEnvironmentAction`, `addModulesToComposerAction`, `downloadModulesAction`,
`activateModulesAction`, `execDbDeployAction`, `installSiteModuleAction`, `finalizeSetupAction`
and `rollBackAction`.

## Front office

`MelisInstaller` ships no templating plugins or dashboard plugins. Its only view helpers are
internal form renderers used by the wizard's `.phtml` (`MelisFieldCollection` / `melisFieldCollection`,
`MelisFieldRow`).

## Events

The module attaches two listeners (in `src/Module.php`) that finalise the install:

| Listener | Event | Role |
| --- | --- | --- |
| `MelisInstallerNewPlatformListener` | `melis_install_new_platform_start` | Builds the environment / site-domain configuration in the `melisinstaller` session container. |
| `MelisInstallModuleConfigListener` | `melis_installer_last_process_start` | Renders the env config templates from `etc/MelisModuleConfig/` into the generated `MelisModuleConfig` module. |

## Database tables

`MelisInstaller` defines **no** `melis_*` tables of its own. During setup it *bootstraps* the
platform's database: it imports the skeleton SQL (via `InstallerHelper::importSql()`) and runs the
versioned deltas through `MelisDbDeploy` (`execDbDeployAction`). The tables created belong to the
modules being installed (`melis-core`, `melis-cms`, …), not to the installer.

## Example

Discovering installable modules and the module loader from the installer services:

```php
$modulesSvc = $sm->get('MelisInstallerModulesService');

$all = $modulesSvc->getAllModules();                 // user modules + composer melisplatform-modules
$deps = $modulesSvc->getDependencies('MelisCms');    // ['MelisCore', 'MelisEngine', ...]

// (re)write config/melis.module.load.php with a chosen set of modules
$modulesSvc->createModuleLoader('config/', ['MelisCore', 'MelisEngine', 'MelisFront']);
```

## Key files

| Concern | Path |
| --- | --- |
| Bootstrap (route gating, self-unload) | `vendor/melisplatform/melis-installer/src/Module.php` |
| Module + service/route config | `vendor/melisplatform/melis-installer/config/module.config.php` |
| Minimal loader for the wizard | `vendor/melisplatform/melis-installer/config/module.load.php` |
| Installer assets/interface | `vendor/melisplatform/melis-installer/config/app.interface.php` |
| Wizard controller | `vendor/melisplatform/melis-installer/src/Controller/InstallerController.php` |
| Translation controller | `vendor/melisplatform/melis-installer/src/Controller/TranslationController.php` |
| System / install helpers | `vendor/melisplatform/melis-installer/src/Service/InstallHelperService.php` |
| Module discovery & loader writer | `vendor/melisplatform/melis-installer/src/Service/MelisInstallerModulesService.php` |
| Config tree reader | `vendor/melisplatform/melis-installer/src/Service/MelisInstallerConfigService.php` |
| Install finalisation listeners | `vendor/melisplatform/melis-installer/src/Listener/` |
| Env config templates | `vendor/melisplatform/melis-installer/etc/MelisModuleConfig/` |
| Wizard views | `vendor/melisplatform/melis-installer/view/melis-installer/installer/` |
