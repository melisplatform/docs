# MelisPlatformSkeleton

> The `composer create-project` starting point that becomes the root of every Melis Platform install. Package `melisplatform/melis-platform-skeleton`.

## Purpose

MelisPlatformSkeleton is not a module — it is the project itself. It provides the Laminas MVC bootstrap, the `config/` folder wired for multi-environment setups, empty `module/` slots for project config and site modules, the webpack/laravel-mix asset-build pipeline for the back-office bundle, and the `composer.json` that pulls in the six MelisCore foundation packages. Every Melis site begins as a copy of this skeleton.

## Creating a project

```bash
composer create-project melisplatform/melis-platform-skeleton .
git submodule init && git submodule update   # pulls melis-docker
```

Point a vhost at `public/`, set the two required environment variables (see below), create an empty `utf8_general_ci` database, then browse to the site URL to run the MelisInstaller first-time wizard.

## Environment variables

Set these in the vhost. They drive multi-environment and multi-site support from a single codebase.

| Variable | Meaning |
| --- | --- |
| `MELIS_PLATFORM` | Which environment is active (`development`, `preprod`, `prod`, …). Selects the matching per-platform config file. |
| `MELIS_MODULE` | Which site module is the front-office for this domain (e.g. `MelisDemoCms`). |

```apache
SetEnv MELIS_PLATFORM "development"
SetEnv MELIS_MODULE   "MelisDemoCms"
```

## Dependencies

| Requirement | Version |
| --- | --- |
| PHP | `^8.1\|^8.3` |
| `melis-asset-manager` | `^5.3` |
| `melis-composerdeploy` | `^5.3` |
| `melis-core` | `^5.3` |
| `melis-dbdeploy` | `^5.3` |
| `melis-installer` | `^5.3` |
| `melis-marketplace` | `^5.3` |

Git submodule: `melis-docker`.

## Composer lifecycle hooks

After every `composer update` two scripts run automatically via `post-update-cmd`:

```php
"MelisCore\\ModuleComposerScript::executeScripts",        // per-module post-install/update scripts
"MelisDbDeploy\\DbDeployOnComposerUpdate::postUpdate"     // apply pending DB deltas automatically
```

This means installing or updating a module through Composer (or the MarketPlace) also wires its config and migrates the database without a manual step.

## Active-module list

`config/melis.module.load.php` holds the ordered list of active modules read by `MelisModuleManager::getModules()`. Default contents after skeleton creation:

```php
return [
    'MelisAssetManager',
    'MelisDbDeploy',
    'MelisComposerDeploy',
    'MelisMarketPlace',
    'MelisInstaller',
    'MelisModuleConfig',
];
```

This file is rewritten by MelisAssetManager / MelisMarketPlace when modules are plugged, unplugged, installed, or removed. Do not hand-edit it on a live platform.

## Config system (`config/`)

### `config/application.config.php`

Defines the Laminas module manager and the `config_glob_paths` merge chain:

```php
'modules' => array_merge(
    MelisCore\MelisModuleManager::getModuleComponents(),  // framework/lib components
    MelisCore\MelisModuleManager::getModules()            // active Melis modules
),
'module_listener_options' => [
    'module_paths' => ['./module', './module/MelisSites'],
    'config_glob_paths' => [
        realpath(__DIR__).'/autoload/{{,*.}global,{,*.}local}.php',
        realpath(__DIR__).'/autoload/platforms/'.getenv('MELIS_PLATFORM').'.php',
    ],
    'cache_dir' => 'cache/config/',
],
```

The last `config_glob_paths` entry loads `autoload/platforms/<MELIS_PLATFORM>.php`, providing per-environment overrides from a single codebase.

### `config/autoload/` files

| File | Role | Committed? |
| --- | --- | --- |
| `global.php` | Environment-agnostic, non-sensitive overrides | Yes |
| `local.php` (copy of `local.php.dist`) | Sensitive values: DB credentials, etc. | No (gitignored) |
| `platforms/<MELIS_PLATFORM>.php` | Per-environment overrides chosen by env var | Per project |
| `development.local.php` (from `.dist`) | Dev mode: `display_exceptions`, 404 reasons | No (gitignored) |

### Development mode

```bash
composer development-enable    # copies .dist files into place
composer development-status
composer development-disable
```

Enables `Laminas\DeveloperTools` and exception display via `config/development.config.php` and `autoload/development.local.php`.

## Project module — `module/MelisModuleConfig`

A real Laminas module shipped inside the skeleton for project-level configuration that overrides vendor modules. Its `Module::getConfig()` merges three files:

```php
$configFiles = [
    include __DIR__.'/config/module.config.php',   // routes / services / controllers
    include __DIR__.'/config/app.interface.php',   // back-office interface overrides
    include __DIR__.'/config/app.forms.php',       // form overrides
];
// merged with Laminas\Stdlib\ArrayUtils::merge
```

Use this module to override a core form, tweak the back-office interface tree, or register project-specific services without modifying a vendor package.

## Asset bundling

The skeleton drives laravel-mix/webpack to compile back-office assets into single bundles:

- `vendor/melisplatform/melis-core/public/build/css/bundle.css`
- `vendor/melisplatform/melis-core/public/build/js/bundle.js`

```bash
npm install
npm run dev    # laravel-mix "development"
npm run prod   # "production" (minified)
```

`webpack.mix.static.js` is required first for static assets. This is the project-side counterpart to MelisAssetManager's `build`/`disable_bundle` config.

## Key files

| Concern | Path |
| --- | --- |
| Web root / Laminas bootstrap | `public/index.php`, `public/.htaccess`, `public/web.config` |
| Module manager + config merge | `config/application.config.php` |
| Ordered active-module list | `config/melis.module.load.php` |
| Dev-mode app config template | `config/development.config.php.dist` |
| Non-sensitive global overrides | `config/autoload/global.php` |
| Sensitive local overrides template | `config/autoload/local.php.dist` |
| Per-environment overrides | `config/autoload/platforms/<env>.php` |
| Project-level config module | `module/MelisModuleConfig/` |
| Site (front-office) modules | `module/MelisSites/` |
| Asset bundling config | `webpack.mix.js`, `webpack.mix.static.js`, `package.json` |
| Sample vhost | `install/vhost.txt` |
| Docker setup (submodule) | `melis-docker/` |

See also: [MelisCore](/legacy/reference/modules/melis-core) · [MelisAssetManager](/legacy/reference/modules/melis-asset-manager) · [MelisDbDeploy](/legacy/reference/modules/melis-dbdeploy) · [MelisInstaller](/legacy/reference/modules/melis-installer) · [MelisMarketPlace](/legacy/reference/modules/melis-marketplace) · [MelisComposerDeploy](/legacy/reference/modules/melis-composerdeploy)
