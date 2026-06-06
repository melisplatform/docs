# MelisCmsPageHistoric

> Per-page version history for the CMS — adds a **Historic** tab to the page editor and a dashboard
> widget of recent page activity. Package `melisplatform/melis-cms-page-historic`.

## Purpose

`MelisCmsPageHistoric` records an audit trail of page edits. Whenever a page is **saved**,
**published**, **unpublished** or **deleted** in the CMS, the module captures who did it, when, and
which action — and exposes that history in a **Historic** tab inside the page editor plus a
**Recent user activity** dashboard widget. It works automatically by listening to the CMS page
events; there is nothing to wire up per page.

## Enable it

A standard Laminas module. Add it to the load list (`config/melis.module.load.php`):

```php
return [
    // …
    'MelisCmsPageHistoric',
];
```

Run the module's `install/dbdeploy/` deltas (the package sets `extra.dbdeploy: true`) to create its
table. It requires `melis-core`, `melis-engine`, `melis-front` and `melis-cms` — see the
[Module reference](/reference/modules) and the [Build a site](/guide/build-a-site) guide for the
surrounding CMS stack.

## Key services

| Service alias | Role |
| --- | --- |
| `MelisPageHistoricTable` | Table gateway over `melis_hist_page_historic` (extends `MelisGenericTable`). Reads and writes history rows. |

Notable methods on `MelisPageHistoricTable`:

| Method | Role |
| --- | --- |
| `getPageHistoricData($options, $fixedCriteria, $user, $action)` | Paginated/filtered history feed (joins `melis_core_user` for the author name); powers the Historic tool table. |
| `getDescendingHistoric($histIdPage, $max)` | History rows for one page, newest first. |
| `getHistoricById($histId, $max)` | A single history entry by `hist_id`. |
| `getPagesHistoricForDashboard($max)` | Distinct most-recent pages for the dashboard widget. |
| `getPageHistoricListOfActions($order)` | Distinct action values (Save / Publish / Unpublish / Delete) for the action filter. |
| `getUsers()` / `getBOUsers($where)` | Distinct authors / Select2-friendly user search for the user filter. |

## Backoffice

The module plugs into the CMS page editor and the dashboard:

- **Historic tab** — declared under the `meliscms_page` → `meliscms_tabs` interface as
  `melispagehistoric_page_historic` (melisKey `melispagehistoric_historic`, icon `history`).
  It forwards to `MelisCmsPageHistoric\Controller\PageHistoric::renderPageHistoric`.
- **Historic table** (`melispagehistoric_table`) — a Melis tool (`tool_meliscmspagehistoric`,
  see [Create a tool](/guide/create-a-tool)) listing the columns `hist_user_id`, `hist_action`,
  `hist_date`, `hist_description`, with left/center/right filters (limit, user search, date range,
  action). Its data endpoint is `PageHistoric::getPageHistoricData`.
- **History is written automatically** by two listeners attached on backoffice bootstrap:
  - `MelisPageHistoricPageEventListener` — on `meliscms_page_save_end`,
    `meliscms_page_publish_end`, `meliscms_page_unpublish_end`, forwards to
    `PageHistoric::savePageHistoric` (action labelled `Save` / `Publish` / `Unpublish`).
  - `MelisPageHistoricDeletePageListener` — on `meliscms_page_delete_end`, forwards to
    `PageHistoric::deletePageHistoric`.

### Dashboard plugin

`MelisCmsPageHistoricRecentUserActivityPlugin` (a backoffice
[dashboard plugin](/guide/plugins)) renders the **Recent user activity** widget — the most recently
touched pages with author, action icon and date. Action `recentActivityPages`, template
`melis-cms-page-historic/dashboard-plugin/recent-user-activity`, section `MelisCms`.

## Database tables

| Table | Role |
| --- | --- |
| `melis_hist_page_historic` | One row per recorded action: `hist_id` (PK), `hist_page_id`, `hist_action`, `hist_date`, `hist_user_id`, `hist_description`. |

## Example

Read a page's history (newest first) via the table service:

```php
/** @var \MelisCmsPageHistoric\Model\Tables\MelisPageHistoricTable $histTable */
$histTable = $serviceManager->get('MelisPageHistoricTable');

$rows = $histTable->getDescendingHistoric($pageId, 10)->toArray();
foreach ($rows as $row) {
    // $row['hist_action'], $row['hist_date'], $row['hist_user_id'], $row['hist_description']
}
```

You normally never write history yourself — saving/publishing/deleting a page through the CMS does
it automatically via the listeners above.

## Key files

| Concern | Path |
| --- | --- |
| Module bootstrap (attaches listeners, layout) | `vendor/melisplatform/melis-cms-page-historic/src/Module.php` |
| Controller | `vendor/melisplatform/melis-cms-page-historic/src/Controller/PageHistoricController.php` |
| Table gateway | `vendor/melisplatform/melis-cms-page-historic/src/Model/Tables/MelisPageHistoricTable.php` |
| Save listener | `vendor/melisplatform/melis-cms-page-historic/src/Listener/MelisPageHistoricPageEventListener.php` |
| Delete listener | `vendor/melisplatform/melis-cms-page-historic/src/Listener/MelisPageHistoricDeletePageListener.php` |
| Dashboard plugin | `vendor/melisplatform/melis-cms-page-historic/src/Controller/DashboardPlugins/MelisCmsPageHistoricRecentUserActivityPlugin.php` |
| Historic tab / table interface | `vendor/melisplatform/melis-cms-page-historic/config/app.interface.php` |
| Historic tool config | `vendor/melisplatform/melis-cms-page-historic/config/app.tools.php` |
| Routes & service alias | `vendor/melisplatform/melis-cms-page-historic/config/module.config.php` |
| Install SQL / dbdeploy | `vendor/melisplatform/melis-cms-page-historic/install/sql/setup_structure.sql`, `vendor/melisplatform/melis-cms-page-historic/install/dbdeploy/` |
