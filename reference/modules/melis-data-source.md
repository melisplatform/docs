# MelisDataSource

> Generic data-source builder: select a set of data from CSV, a custom paste, or a database
> query, then expose the result in a uniform way for tools and plugins to consume. Package
> `melisplatform/melis-data-source`.

## Purpose

`MelisDataSource` lets a tool or plugin define one or more **data sets** and pull their rows from
three kinds of sources — an uploaded **CSV**, a **custom** (pasted/delimited) source, or a
**database table** (assisted join builder or a custom SQL `SELECT`). The selection (columns,
mapping, ordering, limit, default filters and override filters) is serialised to an XML config;
at read time the service resolves the right source class and returns a normalised array of rows.
It also provides a backoffice form helper to build that config and a filter helper to expose
user-facing filters.

## Enable it

Standard Laminas module. It is listed in `config/melis.module.load.php`:

```php
'MelisDataSource',
```

It declares `dbdeploy: true` and requires **`melisplatform/melis-core`** (`^5.3`); PHP `^8.1|^8.3`.
The module ships **no tables of its own** — it reads from whatever tables already exist in the
platform database. See the [Module reference](/reference/modules) and
[Create a tool](/guide/create-a-tool).

## Key services

Registered in `config/module.config.php` under `service_manager`:

| Service alias | Role |
| --- | --- |
| `MelisDataSourceService` | Main service. Builds the source XML, validates and builds the filter XML, runs the query and returns the data. |
| `MelisDataSourceCacheSystemService` | Filesystem cache wrapper (used to cache the list of DB tables; see the `datasource_database` cache config). |

`MelisDataSourceService` (extends `MelisCore\Service\MelisGeneralService`) — main methods:

| Method | Role |
| --- | --- |
| `generateSourceConfigXml(?array $data, ?array $mappingKeys): array` | Validates the data sets (min/max columns, mandatory mapping keys) and returns `['errors', 'sourceConfigXml']`. |
| `generateFiltersConfigXml(string $sourceConfigXml, $filterData): array` | Validates user filter values against the override filters' validators and returns `['errors', 'filterConfigXml']`. |
| `getData(string $sourceConfigXml, ?string $filtersConfigXml, ?array $mappingKeys): array` | Resolves each data set's source, applies override filter test values, returns `['data_source_config', 'results', 'errors']`. |
| `getDataSourceObject(string $source, ?string $queryType): MelisDataSource` | Returns the source class for `csv` / `custom` / `table` (`assisted` vs custom query). |
| `getAvailableColumns(...)`, `getDataExample(...)` | Inspect a source to list its columns / sample row. |
| `describeTable($table)`, `getTablePK($table)` | `DESCRIBE` a table and find its primary key. |

The source classes share the abstract base `MelisDataSource\DataSource\MelisDataSource`
(`generateDataSetXml()`, `getData()`, `getAvailableColumns()`, `getDataExample()`), implemented by
`MelisDataSourceCsv`, `MelisDataSourceCustom`, `MelisDataSourceQueryAssisted` and
`MelisDataSourceQueryCustom`. They are built by `DataSourceFactory` (each gets the service
container and a `Laminas\Db\Adapter\Adapter`).

## Backoffice

Routes live under `melis-backoffice/MelisDataSource/<controller>/<action>`. Controllers:

| Controller (alias) | Concern |
| --- | --- |
| `MelisDataSource\Controller\DataSource` | Source building: CSV upload, run query/run test, available & order columns, table/column browsing, `generateSourceConfigXml`. |
| `MelisDataSource\Controller\DefaultFilter` | Default (fixed) filters CRUD modal. |
| `MelisDataSource\Controller\OverrideFilter` | Override (user-editable) filters CRUD modal. |

Tool table configs are declared in `config/app.tools.php` under the `melisdatasource` plugin key:
`melisdatasource_available_columns`, `melisdatasource_order_columns`,
`melisdatasource_default_filters`, `melisdatasource_override_filters`. Backoffice modals are
declared in `config/app.interface.php` (melisKeys `melisdatasource_default_filter_modal`,
`melisdatasource_override_filter_modal`, `melisdatasource_run_test_modal`).

These tools and modals are not a standalone backoffice section; they are meant to be embedded by
other tools/plugins through the view helpers below.

## Front office

View helpers (registered under `view_helpers` aliases):

| Helper alias | Role |
| --- | --- |
| `DataSourceHelper` → `MelisDataSourceViewHelper` | Renders the data-source parameter form (per data set), wiring the available-columns / order / default / override filter tables. |
| `DataSourceFilterHelper` → `MelisDataFiltersViewHelper` | Renders the filter form for end-user override filters, optionally with a "generate XML" button. |

This module exposes **no front-office templating plugin and no dashboard plugin** — it is a
building block consumed by tools and other modules. See [Plugins](/guide/plugins).

## Database tables

None of its own. The module operates on the **existing platform tables** (it lists tables that
have a primary key via Laminas DB metadata, and `DESCRIBE`s a chosen table to read its columns).
The list of usable tables is cached on the filesystem under the `datasource_database` cache
(namespace `datasource`).

## Example

Build a source config, then read the data (typical use inside a tool/service):

```php
$ds = $this->getServiceManager()->get('MelisDataSourceService');

$build = $ds->generateSourceConfigXml([
    [
        'dataset_num'        => 1,
        'dataset_is_mandatory' => true,
        'dataset_min_column' => 1,
        'dataset_max_column' => 4,
        'dataset_source'     => 'table',          // 'csv' | 'custom' | 'table'
        'dataset_query_type' => 'custom',         // 'assisted' | 'custom' (table source)
        'dataset_query_sql'  => 'SELECT * FROM melis_cms_news',
        'dataset_columns'    => [['column_name' => 'cnews_id', 'column_mapping' => 'id']],
    ],
]);

if (empty($build['errors'])) {
    $result = $ds->getData($build['sourceConfigXml']);
    $rows   = $result['results'];   // normalised rows per data set
}
```

## Key files

| Concern | Path |
| --- | --- |
| Main service | `vendor/melisplatform/melis-data-source/src/Service/MelisDataSourceService.php` |
| Cache service | `vendor/melisplatform/melis-data-source/src/Service/MelisDataSourceCacheSystemService.php` |
| Source base class | `vendor/melisplatform/melis-data-source/src/DataSource/MelisDataSource.php` |
| Source classes | `vendor/melisplatform/melis-data-source/src/DataSource/MelisDataSource{Csv,Custom,QueryAssisted,QueryCustom}.php` |
| Source factory | `vendor/melisplatform/melis-data-source/src/Factory/DataSourceFactory.php` |
| Form view helper | `vendor/melisplatform/melis-data-source/src/View/Helper/MelisDataSourceViewHelper.php` |
| Filter view helper | `vendor/melisplatform/melis-data-source/src/View/Helper/MelisDataFiltersViewHelper.php` |
| Controllers | `vendor/melisplatform/melis-data-source/src/Controller/{DataSource,DefaultFilter,OverrideFilter}Controller.php` |
| Config | `vendor/melisplatform/melis-data-source/config/{module.config,app.tools,app.interface,app.forms,validator.config}.php` |
