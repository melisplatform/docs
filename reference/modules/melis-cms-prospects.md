# MelisCmsProspects

> Prospect / lead capture for Melis sites — a front-office contact form, a backoffice
> management tool and GDPR integration. Package `melisplatform/melis-cms-prospects`.

## Purpose

`MelisCmsProspects` turns front-office form submissions (typically a "contact us" form) into
**prospects** stored in the database. Editors drop the `MelisCmsProspectsShowFormPlugin`
templating plugin into a page; visitors fill it in; submissions are saved and then browsed,
edited, filtered, exported (CSV) and deleted from a backoffice tool. The module also ships a
dashboard statistics widget, configurable **themes** (subject lists) for the form's subject
field, and full GDPR plumbing (user info / extract / delete listeners plus auto-delete
participation).

## Enable it

A standard Laminas module. It is listed in `config/melis.module.load.php` between `MelisCmsNews`
and `MelisCmsSlider`:

```php
return [
    // …
    'MelisCmsProspects',
    // …
];
```

Dependencies (from `composer.json`): `melis-core`, `melis-engine`, `melis-front`, `melis-cms`
(plus `laminas/laminas-mvc-plugin-flashmessenger`). It is `dbdeploy: true`, so its tables are
created/updated through [melis-dbdeploy](/reference/modules).

## Key services

Registered as `service_manager` aliases in `config/module.config.php`:

| Alias | Role |
| --- | --- |
| `MelisCmsProspectsService` / `MelisProspectsService` | Main service (`MelisCmsProspectsService`). `saveProspectsDatas($datas, $prosId = null)` saves/updates a prospect; `getProspectsDataForWidgets($widgetId)`, `getProspectsDataByDate($type, $date)` and `getWidgetProspects($identifier)` compute the dashboard/tool statistics (totals, current month, monthly average). |
| `MelisProspectsGdprAutoDeleteService` | `MelisCmsProspectsGdprAutoDeleteService` — implements `MelisCoreGdprAutoDeleteInterface` (tags list, warning/second-warning user lists, delete action) for the core GDPR auto-delete cron. |

Table gateways (also aliased): `MelisProspects` (`MelisProspectTable`),
`MelisCmsProspectsThemeTable`, `MelisCmsProspectsThemeItemTable`,
`MelisCmsProspectsThemeItemTransTable`. `MelisProspectTable` exposes notable queries such as
`getData(...)` (the datatable feed), `getDataForGdpr(...)`, `getProspectsOrderByDate($order)`,
`getCurrentMonth()`, `getAvgMonth($months)` and `getNumberProspectsPerDay($maxDays)`.

## Backoffice

Declared in `config/app.interface.php` and `config/app.tools.php`, under the Marketing tools
section (`melisprospects_tools_section`, icon `fa-user-plus`). Controllers live under
`MelisCmsProspects\Controller`:

| Tool (melisKey) | Controller / action | Purpose |
| --- | --- | --- |
| `MelisCmsProspects_tool_prospects` | `ToolProspects` → `render-prospects` | The prospects list: datatable with limit/date/site/type filters, search, CSV export, edit & delete modals, plus three header widgets (total, this month, monthly average). |
| `MelisCmsProspects_tool_themes` | `ProspectThemes` → `tool-container` | Manage prospect **themes** (subject groups). |
| `MelisCmsProspects_tool_theme_items` | `ProspectThemeItems` → `tool-container` | Manage translatable **theme items** (the subject options offered in the front form). |

The prospects datatable is fed by `/melis/MelisCmsProspects/ToolProspects/getToolProspectData`.
Custom form-element factories are registered: `MelisCmsProspectThemeSelect`,
`MelisCmsProspectThemeItemSelect` and `MelisCmsProspectName`.

A **dashboard plugin**, `MelisCmsProspectsStatisticsPlugin`
(`config/dashboard-plugins/MelisCmsProspectsStatisticsPlugin.config.php`), adds a "Prospects
Statistics" widget (Flot line/bar charts) — see [Plugins](/guide/plugins).

### GDPR & listeners

`src/Module.php` attaches a set of listeners on bootstrap: backoffice GDPR (user info / extract /
delete: `MelisCmsProspectsGdprUserInfoListener`, `…GdprUserExtractListener`,
`…GdprUserDeleteListener`), a datatable column-display listener, a tool-creator edition-type
listener, a flash-messenger listener, and the GDPR **auto-delete** listeners (module list, tags
list, warning / second-warning user lists, delete action). GDPR field mappings are configured in
`config/app.gdpr.php` and `config/app.interface.php` (`gdpr.tags`).

## Front office

The templating plugin `MelisCmsProspectsShowFormPlugin`
(`src/Controller/Plugin/MelisCmsProspectsShowFormPlugin.php`, config
`config/plugins/MelisCmsProspectsShowFormPlugin.config.php`) renders the prospect/contact form.
It extends `MelisEngine\Controller\Plugin\MelisTemplatingPlugin` with
`configPluginKey = 'meliscmsprospects'` and `pluginXmlDbKey = 'melisCmsProspects'`. Its `front()`:

- builds the form from the selected/required `fields` (`pros_name`, `pros_company`,
  `pros_country`, `pros_telephone`, `pros_email`, `pros_theme`, `pros_message`);
- on valid POST, resolves the site id (from config or page tree) and calls
  `MelisProspectsService::saveProspectsDatas()`;
- fires the `meliscms_prospects_plugin_save` event and shows a flash success message.

The backoffice editor exposes three config tabs (`config/plugins/…`): template & site
(`MelisCmsPluginSiteSelect`), the fields to show / make mandatory, and the subject **theme**
(`MelisCmsProspectThemeSelect`). The plugin is registered in `module.config.php` under
`controller_plugins`, in the `MelisMarketing` plugin section. See [Plugins](/guide/plugins) and
[Build a site](/guide/build-a-site).

## Database tables

Created from `install/sql/setup_structure.sql` (and dbdeploy deltas under `install/dbdeploy/`):

| Table | Role |
| --- | --- |
| `melis_cms_prospects` | The captured prospects (`pros_id`, `pros_site_id`, `pros_type`, `pros_theme`, `pros_name`, `pros_email`, `pros_telephone`, `pros_message`, `pros_company`, `pros_country`, `pros_contact_date`, `pros_gdpr_lastdate`). |
| `melis_cms_prospects_themes` | Subject themes (`pros_theme_id`, `pros_theme_name`, `pros_theme_code`). |
| `melis_cms_prospects_theme_items` | Theme items linked to a theme (`pros_theme_item_id`, `pros_theme_id`). |
| `melis_cms_prospects_theme_items_trans` | Per-language translations of theme items (`item_trans_id`, `item_trans_text`, `item_trans_lang_id`, `item_trans_theme_item_id`). |

## Example

Render the prospect form plugin from a controller / view (per the plugin's own docblock):

```php
$plugin     = $this->MelisCmsProspectsShowFormPlugin();
$pluginView = $plugin->render([
    'template_path' => 'MySiteTest/contactus/prospectsForm',
]);
$view->addChild($pluginView, 'prospectsForm');
// in the view: echo $this->prospectsForm;
```

In practice the plugin is normally added by dragging it into a page's `MelisDragDropZone`, where
its template, site, fields and theme are configured through the editor.

## Key files

| Concern | Path (under `vendor/melisplatform/melis-cms-prospects/`) |
| --- | --- |
| Module config / routes / services | `config/module.config.php` |
| Backoffice tools tree | `config/app.interface.php` |
| Tool tables & forms | `config/app.tools.php` |
| Templating plugin config | `config/plugins/MelisCmsProspectsShowFormPlugin.config.php` |
| Dashboard widget config | `config/dashboard-plugins/MelisCmsProspectsStatisticsPlugin.config.php` |
| GDPR field mapping | `config/app.gdpr.php` |
| Main service | `src/Service/MelisCmsProspectsService.php` |
| GDPR auto-delete service | `src/Service/MelisCmsProspectsGdprAutoDeleteService.php` |
| Front form plugin | `src/Controller/Plugin/MelisCmsProspectsShowFormPlugin.php` |
| Dashboard widget | `src/Controller/DashboardPlugins/MelisCmsProspectsStatisticsPlugin.php` |
| Backoffice controllers | `src/Controller/ToolProspectsController.php`, `MelisCmsProspectsThemesController.php`, `MelisCmsProspectsThemeItemsController.php` |
| Prospects table gateway | `src/Model/Tables/MelisProspectTable.php` |
| Listeners (bootstrap) | `src/Module.php`, `src/Listener/` |
| Install SQL | `install/sql/setup_structure.sql`, `install/dbdeploy/` |

See the [Module reference](/reference/modules) for the full module map.
