# MelisCmsProspects

> Leads / contact management system: front-office contact form, backoffice prospect management and GDPR integration. Package `melisplatform/melis-cms-prospects`.

## Purpose

`MelisCmsProspects` captures visitor contact-form submissions as **prospects** (leads) stored in
the database. Backoffice users browse, filter, edit, export (CSV) and delete those leads, and
classify them by **themes**. The module ships a dashboard statistics widget and plugs into the
platform's GDPR tooling (user info / extract / delete + auto-delete cycle).

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisCmsProspects',
];
```

Dependencies: `melis-core`, `melis-engine`, `melis-front`, `melis-cms` (`^5.2`) and
`laminas/laminas-mvc-plugin-flashmessenger`. The module is `dbdeploy: true` — its tables are
created/updated through the dbdeploy mechanism.

## Key services

| Service alias | Role |
| --- | --- |
| `MelisCmsProspectsService` / `MelisProspectsService` | Main service. `saveProspectsDatas($datas, $prosId = null)` creates or updates a prospect; `getProspectsDataForWidgets($widgetId = '')` returns total / this-month / average counts; `getProspectsDataByDate($type, $date)` counts registrations by date; `getWidgetProspects($identifier)` retrieves data for a widget. |
| `MelisProspectsGdprAutoDeleteService` | Handles the GDPR auto-delete cycle (module list, tags list, warning / second-warning user lists, account deletion). |

Table gateways: `MelisProspects`, `MelisCmsProspectsThemeTable`,
`MelisCmsProspectsThemeItemTable`, `MelisCmsProspectsThemeItemTransTable`.

## Backoffice

Two main tools registered under the Marketing tools section:

| Tool | Controller | Purpose |
| --- | --- | --- |
| Prospects | `ToolProspectsController` | Lists all leads with limit / date range / site / type filters, search, CSV export (`exportToCsvAction`), edit modal and delete. Three header stat widgets: total, this month, monthly average. |
| Themes | `MelisCmsProspectsThemesController` / `MelisCmsProspectsThemeItemsController` | Manage subject **themes** and their translatable **items** (the subject dropdown options shown in the front form). |

A **dashboard plugin** (`MelisCmsProspectsStatisticsPlugin`, section `MelisMarketing`) adds a
"Prospects Statistics" chart (Flot) to the backoffice dashboard.

### GDPR & event hooks

Controller-level events (attach with `MelisCmsProspects` as the target identifier):

| Event name | Fired by |
| --- | --- |
| `meliscmsprospects_toolprospects_save_start` / `_end` | `ToolProspectsController` |
| `meliscmsprospects_toolprospects_delete_start` / `_end` | `ToolProspectsController` |
| `meliscmsprospects_theme_save_end` / `…_delete_end` | `ProspectThemesController` |
| `meliscmsprospects_theme_item_save_end` | `ProspectThemeItemsController` |

```php
$sharedEvents->attach(
    'MelisCmsProspects',
    'meliscmsprospects_toolprospects_save_end',
    $fn,
    50
);
```

GDPR listeners (user info, extract, delete, auto-delete) are wired in `src/Module.php`. GDPR
field mappings live in `config/app.gdpr.php`.

## Front office

The `MelisCmsProspectsShowFormPlugin` controller plugin renders the contact form on the front
end. Drop the **Show Form** block onto a page from the page editor's plugin selector; the
editor exposes three config tabs:

| Tab | Controls |
| --- | --- |
| Properties | Rendering template (`template_path`) and source site (`pros_site_id`). |
| Fields | Field-builder table — toggle Show / Mandatory per field, drag rows to reorder. Available fields: `pros_name`, `pros_company`, `pros_country`, `pros_email`, `pros_telephone`, `pros_message`. The Mandatory checkbox is only enabled when a field's Show switch is on. |
| Theme | The theme that populates the form's subject dropdown. |

Config file: `config/plugins/MelisCmsProspectsShowFormPlugin.config.php`. Front template:
`view/.../plugins/prospects-form.phtml`.

## Database tables

| Table | Holds |
| --- | --- |
| `melis_cms_prospects` | A captured lead: site, type, theme, name, email, telephone, message, company, country, contact date, GDPR last date. PK: `pros_id`. |
| `melis_cms_prospects_themes` | Subject themes (`pros_theme_name`, `pros_theme_code`). PK: `pros_theme_id`. |
| `melis_cms_prospects_theme_items` | Items belonging to a theme. PK: `pros_theme_item_id`. |
| `melis_cms_prospects_theme_items_trans` | Per-language translations of theme items. PK: `item_trans_id`. |

## Example

```php
$prospects = $this->getServiceManager()->get('MelisProspectsService');

// Create or update a prospect
$id = $prospects->saveProspectsDatas($datas, $prosId);

// Get registration count by date
$nb = $prospects->getProspectsDataByDate('monthly', '2017-10-04 12:00:00');

// Get stats for backoffice widgets (total / this month / average)
$w  = $prospects->getProspectsDataForWidgets();
```

## Key files

| Concern | Path (under `vendor/melisplatform/melis-cms-prospects/`) |
| --- | --- |
| Module config / routes / services | `config/module.config.php` |
| Backoffice interface tree | `config/app.interface.php` |
| Tool tables & forms | `config/app.tools.php` |
| Templating plugin config | `config/plugins/MelisCmsProspectsShowFormPlugin.config.php` |
| Dashboard widget config | `config/dashboard-plugins/` |
| GDPR field mapping | `config/app.gdpr.php` |
| Main service | `src/Service/MelisCmsProspectsService.php` |
| GDPR auto-delete service | `src/Service/` |
| Front form plugin | `src/Controller/Plugin/MelisCmsProspectsShowFormPlugin.php` |
| Dashboard widget | `src/Controller/DashboardPlugins/MelisCmsProspectsStatisticsPlugin.php` |
| Backoffice controllers | `src/Controller/ToolProspectsController.php`, `MelisCmsProspectsThemesController.php`, `MelisCmsProspectsThemeItemsController.php` |
| Table gateways | `src/Model/Tables/` |
| GDPR listeners & bootstrap | `src/Module.php`, `src/Listener/` |

See also: [Module reference](/legacy/reference/modules) · [melis-cms](/legacy/reference/modules/melis-cms) · [melis-core](/legacy/reference/modules/melis-core)
