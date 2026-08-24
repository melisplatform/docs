# MelisCmsPageHistoric

> Audit log for CMS page editing — records who did what to a page and when, surfaced in a Historic
> tab and a dashboard widget. Package `melisplatform/melis-cms-page-historic`.

## Purpose

`MelisCmsPageHistoric` automatically captures every page action (create, edit, publish, unpublish,
delete) with the author identity and timestamp. History is written via event listeners that hook the
CMS page lifecycle — nothing needs to be wired up per page. The log is exposed read-only in a
**Historic tab** inside the page editor and in a **Recent User Activity** dashboard widget.

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisCmsPageHistoric',
];
```

Run the bundled `install/dbdeploy/` deltas to create the history table (`extra.dbdeploy: true`).
Requires `melis-core`, `melis-engine`, `melis-front` and `melis-cms` (`^5.2`).

## Key services

| Service alias | Role |
| --- | --- |
| `MelisPageHistoricTable` | Table gateway over `melis_hist_page_historic`. Handles all reads and writes for history rows. |

No dedicated service class is provided — reads and writes go through `MelisPageHistoricTable` plus
the controller's save/delete actions.

## Backoffice

### Historic tab (page editor)

Injected via `config/app.interface.php` (key `melispagehistoric_historic`, icon `history`) into the
CMS page-editor tabs. The tab renders a read-only DataTable scoped to the current page
(`hist_page_id`). Available filters: limit, user, date range, action type. The user list for the
filter is served by `getBackOfficeUsersAction`. Tool config is declared in `config/app.tools.php`
(`tool_meliscmspagehistoric`).

Controller: `PageHistoricController` — action `getPageHistoricDataAction` feeds the DataTable.

### Dashboard plugin

`MelisCmsPageHistoricRecentUserActivityPlugin` (`recentActivityPages`) renders the **Recent User
Activity** widget on the back-office dashboard. Configuration lives under
`config/dashboard-plugins/`, section `MelisCms`.

### How history is written (listener pattern)

Two listeners are wired in `src/Module.php` (back-office bootstrap only):

| Listener | Event | What it records |
| --- | --- | --- |
| `MelisPageHistoricPageEventListener` | `meliscms_page_save_end`, `meliscms_page_publish_end`, `meliscms_page_unpublish_end`, … | Save / Publish / Unpublish actions |
| `MelisPageHistoricDeletePageListener` | `meliscms_page_delete_end` | Delete action (also cleans up) |

## Database tables

| Table | Holds |
| --- | --- |
| `melis_hist_page_historic` | One row per recorded action: `hist_id` (PK), `hist_page_id`, `hist_action`, `hist_date`, `hist_user_id`, `hist_description`. |

## Example

Attaching to a CMS page event (the same pattern the listeners use — reusable by any module):

```php
// In Module.php onBootstrap:
$sharedEvents = $eventManager->getSharedManager();
$sharedEvents->attach('MelisCms', 'meliscms_page_publish_end', function ($e) {
    $params = $e->getParams(); // page id, page data…
    // record: who/what/when -> melis_hist_page_historic
}, 50);
```

You do not need to write history rows yourself — saving, publishing or deleting a page through the
CMS triggers the listeners automatically.

## Key files

| Concern | Path |
| --- | --- |
| Module bootstrap (listeners) | `vendor/melisplatform/melis-cms-page-historic/src/Module.php` |
| Historic tab controller | `vendor/melisplatform/melis-cms-page-historic/src/Controller/PageHistoricController.php` |
| Table gateway | `vendor/melisplatform/melis-cms-page-historic/src/Model/Tables/MelisPageHistoricTable.php` |
| Page event listener | `vendor/melisplatform/melis-cms-page-historic/src/Listener/MelisPageHistoricPageEventListener.php` |
| Delete listener | `vendor/melisplatform/melis-cms-page-historic/src/Listener/MelisPageHistoricDeletePageListener.php` |
| Dashboard plugin | `vendor/melisplatform/melis-cms-page-historic/src/Controller/DashboardPlugins/MelisCmsPageHistoricRecentUserActivityPlugin.php` |
| Historic tab interface config | `vendor/melisplatform/melis-cms-page-historic/config/app.interface.php` |
| Tool config | `vendor/melisplatform/melis-cms-page-historic/config/app.tools.php` |
| Install SQL / dbdeploy | `vendor/melisplatform/melis-cms-page-historic/install/` |

See also: [MelisCms](/legacy/reference/modules/melis-cms), [Module reference](/legacy/reference/modules)
