# MelisCmsPageAnalytics

> Default per-page analytics for Melis CMS sites — records page views and lets a site plug in an
> external analytics provider (e.g. Google Analytics). Package `melisplatform/melis-cms-page-analytics`.

## Purpose

`MelisCmsPageAnalytics` is the platform's built-in page-view tracker. On every **front-office**
page render it records a visit (one per session, per page, per day) into `melis_cms_page_analytics`,
and surfaces the data in the backoffice as a **Site Analytics** tool and a **Page Analytics** tab on
each page. It is also extensible: per site you can store an analytics provider key, settings and a
JavaScript snippet that the module injects into the page `<head>` at render time — the hook used by
add-on providers such as Google Analytics.

## Enable it

It's a standard Laminas module, already listed in `config/melis.module.load.php`:

```php
'MelisCmsPageAnalytics',
```

Dependencies (from `composer.json`): `melisplatform/melis-core` and `melisplatform/melis-cms`. The
module also relies on `melis-engine` / `melis-front` services at runtime (tree, page tables, front
dispatch events). It ships dbdeploy deltas (`"dbdeploy": true`), so its tables are created/updated
through the [database delta mechanism](/reference/modules). See [Module reference](/reference/modules)
and [Build a site](/guide/build-a-site).

## Key services

Registered as `service_manager` aliases in `config/module.config.php`:

| Service alias | Role |
| --- | --- |
| `MelisCmsPageAnalyticsService` | Returns the current analytics configuration for a site. `getAnalytics($siteId)` reads the active provider key from `melis_cms_page_analytics_data`, then the matching row in `melis_cms_page_analytics_data_settings` (unserialising `pads_settings`). |
| `MelisCmsDefaultPageAnalyticsService` | Records a page view. `saveAnalyticsData($pageId)` resolves the site, checks the page is active, and inserts a row into `melis_cms_page_analytics` — once per session per day — unless an external provider (Google Analytics view id + token) is configured. |

Both services extend `MelisEngineGeneralService` and fire start/end events
(`melis_cms_page_analytics_get_current_analytics_*`, `melis_cms_default_page_analytics_save_*`).

The model tables are also aliased: `MelisCmsPageAnalyticsTable` (with `getData(...)`,
`getDataByPageId(...)`, `getDataBySessionAndPageId($pageId, $sessionCookie)`),
`MelisCmsPageAnalyticsDataTable` (`getAnalytics($siteId, $analyticsKey = null)`) and
`MelisCmsPageAnalyticsDataSettingsTable`.

## Backoffice

The module adds a **Site Analytics** tool and a per-page **Page Analytics** tab (config in
`config/app.interface.php` / `config/app.tools.php`):

| Element (melisKey) | Forward |
| --- | --- |
| `meliscms_page_analytics_tool_display` (Site Analytics tool, under the site tools menu) | `MelisCmsPageAnalyticsTool::tool-container` |
| `meliscms_page_analytics_site_analytics_tab_content` (per-site views table) | `MelisCmsPageAnalyticsTool::tool-content-container-analytics-tab-content` |
| `meliscms_page_analytics_site_analytics_tab_settings_content` (provider settings form) | `MelisCmsPageAnalyticsTool::tool-content-container-analytics-settings-tab-content` |
| `meliscms_page_analytics_tab` / `meliscms_page_analytics_tab_display` (page editor tab) | `MelisCmsPageAnalyticsPageDetailsTool::tool-container` |

The two DataTable tools (`MelisCmsPageAnalytics_tool`, `MelisCmsPageAnalytics_page_details`) load
their rows by AJAX from `MelisCmsPageAnalyticsToolController::getMelisCmsPageAnalyticsDataAction`
and `MelisCmsPageAnalyticsPageDetailsToolController::getMelisCmsPageAnalyticsPageDetailsDataAction`.
The settings form (`getSettingsFormAction`, `saveAction`) persists the per-site provider key,
settings and JS snippet. See [Create a tool](/guide/create-a-tool).

A standalone install route (`MelisSetupController::setup-form`) is also provided.

## Front office

There is no templating plugin or view helper. Tracking and script injection are done by an
event listener, `MelisCmsPageAnalytics\Listener\MelisCmsPageAnalyticsListener` (attached in
`Module::onBootstrap`), which hooks two front events:

- `melisfront_site_dispatch_ready` — for front renders only, calls
  `MelisCmsDefaultPageAnalyticsService::saveAnalyticsData($pageId)` to record the visit.
- `melis_front_layout` — reads the site's configured `pads_js_analytics` snippet and injects it
  before `</head>` of the rendered page.

For event-based front rendering in general, see [Plugins](/guide/plugins) and
[Build a site](/guide/build-a-site).

## Database tables

Created/updated by `install/dbdeploy/*.sql`:

| Table | Role |
| --- | --- |
| `melis_cms_page_analytics` | Recorded page views: `ph_id`, `ph_page_id`, `ph_session_id`, `ph_date_visit`, `ph_site_id`. |
| `melis_cms_page_analytics_data` | The active analytics provider per site: `pad_id`, `pad_site_id`, `pad_analytics_key`. |
| `melis_cms_page_analytics_data_settings` | Per-site provider configuration: `pads_id`, `pads_site_id`, `pads_analytics_key`, `pads_settings` (serialised), `pads_js_analytics`. |

## Example

Read a page's view count, or the active analytics config, from a service or controller:

```php
// Active analytics provider/config for a site (null if none configured)
$analytics = $sm->get('MelisCmsPageAnalyticsService')->getAnalytics($siteId);

// Recorded views for one page (used by the Page Analytics tab)
$views = $sm->get('MelisCmsPageAnalyticsTable')->getDataByPageId($pageId);
```

Recording a view happens automatically on front render via the listener; you normally never call
`saveAnalyticsData()` yourself.

## Key files

| Concern | Path |
| --- | --- |
| Module / bootstrap | `vendor/melisplatform/melis-cms-page-analytics/src/Module.php` |
| Routes, services, controllers | `vendor/melisplatform/melis-cms-page-analytics/config/module.config.php` |
| Backoffice tool/tab interface | `vendor/melisplatform/melis-cms-page-analytics/config/app.interface.php` |
| DataTable tool config | `vendor/melisplatform/melis-cms-page-analytics/config/app.tools.php` |
| Current-config service | `vendor/melisplatform/melis-cms-page-analytics/src/Service/MelisCmsPageAnalyticsService.php` |
| View-recording service | `vendor/melisplatform/melis-cms-page-analytics/src/Service/MelisCmsDefaultPageAnalyticsService.php` |
| Front listener (track + inject) | `vendor/melisplatform/melis-cms-page-analytics/src/Listener/MelisCmsPageAnalyticsListener.php` |
| Tool controller | `vendor/melisplatform/melis-cms-page-analytics/src/Controller/MelisCmsPageAnalyticsToolController.php` |
| Page-details controller | `vendor/melisplatform/melis-cms-page-analytics/src/Controller/MelisCmsPageAnalyticsPageDetailsToolController.php` |
| Tables | `vendor/melisplatform/melis-cms-page-analytics/src/Model/Tables/` |
| Install / dbdeploy | `vendor/melisplatform/melis-cms-page-analytics/install/dbdeploy/` |
