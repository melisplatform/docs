# Configuration reference

Everything you can configure in Melis, in one place: environment variables, the platform file, the
`app.*.php` config family, melis keys, translations, assets and caches.

## Environment variables

Two variables drive every install (set in `docker-compose.yml`, or via Apache `SetEnv`):

| Variable | Purpose |
| --- | --- |
| **`MELIS_PLATFORM`** | Selects the platform config `config/autoload/platforms/<MELIS_PLATFORM>.php` (the DB connection). E.g. `local`, `dev1`. |
| **`MELIS_MODULE`** | The **site module** served as front office for this domain (e.g. `MelisDemoCms`). |
| `MYSQL_HOSTNAME` / `MYSQL_DATABASE` / `MYSQL_USER` / `MYSQL_PASSWORD` | DB connection, usually read by the platform file via `getenv()`. |

## The platform file

`config/autoload/platforms/<MELIS_PLATFORM>.php` holds the **database connection** (and a few host
settings). It's merged last, so it overrides defaults per environment:

```php
return [
    'db' => [
        'driver'   => 'Mysqli',
        'hostname' => getenv('MYSQL_HOSTNAME') ?: 'localhost',
        'database' => getenv('MYSQL_DATABASE'),
        'username' => getenv('MYSQL_USER'),
        'password' => getenv('MYSQL_PASSWORD'),
        'port'     => '3306',
        'charset'  => 'utf8mb4',
    ],
    'melis_platform'       => getenv('MELIS_PLATFORM'),
    'melis_http_host'      => 'localhost',
    'melis_request_scheme' => 'http',
];
```

The file loaded is chosen at `config/application.config.php` (`config_glob_paths`) from
`getenv('MELIS_PLATFORM')`.

## Project config files

| File | Role |
| --- | --- |
| `config/melis.module.load.php` | The ordered list of **backoffice modules** to load. |
| `config/melis.modules.path.php` | Generated map: module name → filesystem path (built by `MelisAssetManager`). |
| `config/application.config.php` | App entry: module assembly, glob paths, cache flags. |
| `config/autoload/{global,local}.php` | Standard Laminas autoload config. |
| `config/autoload/platforms/<env>.php` | Per-environment DB/platform config (above). |
| `config/development.config.php` | Dev overrides (created by `laminas-development-mode enable`). |

## The `app.*.php` config family

Each backoffice module merges these Melis-specific files in `Module::getConfig()`. They all build a
single tree under a `plugins` root, queryable via [`MelisCoreConfig`](../guide/concepts#_2-the-config-tree-melis-keys):

| File | Declares |
| --- | --- |
| `app.interface.php` | UI **zones** and their `forward` (module/controller/action). Each node: `conf` (id, name, icon, `melisKey`, `rightsDisplay`), `forward`, nested `interface`. |
| `app.toolstree.php` | Where a tool attaches in the **left menu** (`*_toolstree_section`). |
| `app.tools.php` | **Tools**: data tables (columns, filters, action buttons), forms. |
| `app.forms.php` | Reusable **form** definitions (Laminas form spec + `input_filter`). |
| `app.emails.php` | Email template configs. |
| `app.microservice.php` | Callable service-method APIs (input/output forms). |
| `excluded.routes.php` | Routes that bypass the auth check. |

### Conventions

- **Translation keys**: `tr_<module>_<section>_<item>` (e.g. `tr_meliscore_tool_users`).
- **Config ids**: `id_<module>_<item>`.
- **Melis keys**: short aliases declared as `'conf' => ['melisKey' => '…']` → resolved to full
  config paths by `MelisCoreConfig::getMelisKeys()`.
- **Tables**: `melis_<area>_<entity>` (e.g. `melis_core_user`, `melis_cms_page_published`,
  `melis_ecom_product`).
- **Routes**: `<module-slug>/<name>` (e.g. `melis-backoffice/login`).

## Translations

Per-locale PHP arrays under each module's `language/`:

```
language/en_EN.interface.php
language/fr_FR.interface.php   // 'tr_key' => 'Texte'
```

Loaded by `Module::createTranslations()` for the active locale (session `melis-lang-locale`), with
`en_EN` as fallback. Types include `interface`, `forms`, `install`, `setup`.

## Assets

`MelisAssetManager` serves each module's `public/` folder at `/<ModuleName>/…` and generates
`config/melis.modules.path.php`. A **site module** lists its front-office CSS/JS in
`config/assets.config.php`. Webpack bundling is available (build tool / backoffice action).

## Caches

Cache behaviour is configured in `melis-core`'s `module.config.php` (the `caches` section) and used
via `MelisCoreCacheSystemService`. Each cache has an `active` flag, a `cache_dir` under `cache/`,
and per-key TTLs. The Laminas **config cache** is governed by `config_cache_enabled` in
`application.config.php` (off by default in this skeleton). See
[Troubleshooting](../guide/troubleshooting#cache) for clearing caches.

## Where to look

| Concern | Path |
| --- | --- |
| Module list | `config/melis.module.load.php` |
| Platform DB | `config/autoload/platforms/<MELIS_PLATFORM>.php` |
| Config service | `vendor/melisplatform/melis-core/src/Service/MelisCoreConfigService.php` |
| Cache config | `vendor/melisplatform/melis-core/config/module.config.php` (`caches`) |
| Asset manager | `vendor/melisplatform/melis-asset-manager/` |
