# MelisSql

> Read-only SQL console in the back-office Dev Tools panel. Package `melisplatform/melis-sql`.

## Purpose

MelisSql is a back-office developer tool that lets you run a single `SELECT` query against the
platform's own database and view the results as a table — without leaving the back-office or opening
an external database client. It connects using the platform's configured `config['db']` credentials,
so no connection details need to be entered. It is a diagnostic and inspection tool for developers
and integrators, not an end-user feature.

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisSql',
];
```

Requires `melisplatform/melis-core: ^5.1|^5.2` and PHP `^8.1|^8.3`.

## Key services

| Service alias | Role |
| --- | --- |
| `MelisSqlToolToolService` | DataTable builder for the results grid; inherits CSV export helpers from `MelisServiceManager`. |

## Backoffice

The tool is registered under **Dev Tools** (`fa fa-code`) → **SQL Tool** (`fa fa-database`) in the
left menu. It provides a query text area and a **Run** button; results are rendered in a jQuery
DataTables grid sourced from the `getList` AJAX endpoint.

**Query rules — rejection messages:**

| Situation | Message |
| --- | --- |
| Statement does not start with `SELECT` | *Only SELECT queries are allowed.* |
| No semicolon at the end | *A query should end with ';'.* |
| More than one statement (multiple `;`) | *Only one query is allowed.* |
| Query cannot be prepared or fails | *Error preparing the query…* / *Error executing the query…* |
| Database unreachable | *Connection failed: …* |

**Controller actions (`ListController`):**

| Action | Role |
| --- | --- |
| `renderToolAction` | Renders the tool shell view. |
| `renderToolHeaderAction` | Renders the header zone. |
| `renderToolContentAction` | Builds the DataTable and query textarea. |
| `getListAction` | POST endpoint — runs the query, returns `{ data, customerror }` JSON. |

## Example

```php
// getListAction: reads platform DB config and executes the guarded query
$configDB = $this->getServiceManager()->get('config')['db'];
$conn = new \mysqli(
    $configDB['hostname'], $configDB['username'],
    $configDB['password'], $configDB['database'], $configDB['port']
);
$output = $this->runQuery($conn, $formData['query']);
return new JsonModel(['data' => $output['result'], 'customerror' => $output['errors']]);
```

The `runQuery()` helper enforces the three guards before preparing the statement:

```php
// Exactly one ';', at the end, and the query must begin with SELECT
if (substr_count($sql, ';') == 0)  → 'tr_melis_sql_query_end_missing';
if (substr_count($sql, ';') !== 1) → 'tr_melis_sql_only_one_query_allowed';
if (stripos(strtolower($sql), 'select') !== 0) → 'tr_melis_sql_only_select_allowed';
$statement = $conn->prepare(trim($sql));
$statement->execute();
```

## Key files

| Concern | Path |
| --- | --- |
| Route, controller alias, service alias | `vendor/melisplatform/melis-sql/config/module.config.php` |
| Left-menu placement (Dev Tools → SQL Tool) | `vendor/melisplatform/melis-sql/config/app.toolstree.php` |
| DataTable config (`melissql_tools`) | `vendor/melisplatform/melis-sql/config/app.tools.php` |
| Plugin assets registration | `vendor/melisplatform/melis-sql/config/app.interface.php` |
| Controller (render actions + `runQuery` guard) | `vendor/melisplatform/melis-sql/src/Controller/ListController.php` |
| DataTable builder + CSV export | `vendor/melisplatform/melis-sql/src/Service/MelisSqlToolToolService.php` |
| Tool views | `vendor/melisplatform/melis-sql/view/melis-sql/list/` |
| Front-end (posts query, paints rows) | `vendor/melisplatform/melis-sql/public/js/tool.js` |

## Security notes

- **Read-only by construction** — the `SELECT`-only, single-statement, and prepared-statement
  guards block writes and stacked-query injection. Any change to `runQuery()` should be treated as
  security-sensitive.
- The tool connects with the platform's own `config['db']` credentials and should be gated by
  back-office rights (MelisCore `melisKey`-based access control) like any other Dev Tool.
- Avoid unbounded `SELECT *` on very large tables: there is no server-side pagination beyond the
  DataTable defaults.

See also: [MelisCore](/legacy/reference/modules/melis-core)
