# MelisCmsPageAnalytics

> Basic page-visit analytics for CMS sites — records page views and lets a site plug in an
> external analytics provider (e.g. Google Analytics). Package `melisplatform/melis-cms-page-analytics`.

## Purpose

`MelisCmsPageAnalytics` is the platform's built-in page-view tracker. On every front-office page
render it records a deduped visit (once per session, per page, per day) into
`melis_cms_page_analytics`, and surfaces the data in the backoffice as a **Page Analytics** site
tool and a **Page Analytics** tab on each CMS page. Per site you can also store an analytics
provider key and a JavaScript snippet that the module injects into the page `<head>` at render
time — the hook used by add-on providers such as Google Analytics.

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisCmsPageAnalytics',
];
```

Required Composer dependencies: `melisplatform/melis-core ^5.2` and `melisplatform/melis-cms ^5.2`.
The module also relies on `melis-engine` and `melis-front` services at runtime (tree, page tables,
front dispatch events). Database tables are installed via `MelisSetupController` from
`install/sql/`.

## Key services

Registered as `service_manager` aliases in `config/module.config.php`:

| Service alias | Role |
| --- | --- |
| `MelisCmsPageAnalyticsService` | Main service implementing the provider contract. `getAnalytics($siteId)` reads the active provider key from `melis_cms_page_analytics_data` and the matching settings row from `melis_cms_page_analytics_data_settings`. |
| `MelisCmsDefaultPageAnalyticsService` | Built-in recorder. `saveAnalyticsData($pageId)` resolves the site, confirms the page is active/published, and inserts a deduped row into `melis_cms_page_analytics` — unless a Google Analytics view id and token are configured, in which case the built-in counter steps aside. |
| `MelisCmsPageAnalyticsTable` | Table gateway for the visit log. |
| `MelisCmsPageAnalyticsDataTable` | Table gateway for the per-site provider selection. |
| `MelisCmsPageAnalyticsDataSettingsTable` | Table gateway for per-(site, provider) settings. |

Both main services fire start/end events: `melis_cms_default_page_analytics_save_start` /
`melis_cms_default_page_analytics_save_end`.

## Backoffice

Configured in `config/app.interface.php` and `config/app.tools.php`. The module adds two UI
elements:

| Element | Location | Content |
| --- | --- | --- |
| **Page Analytics** site tool (`meliscms_page_analytics_tool_display`) | Site Tools menu under `meliscms_site_tools_parent_menu` (icon `fa-bar-chart`) | Two tabs: **Site analytics** (visit table: Id, Page id, Page name, Date visited) and **Settings** (provider selection + JS snippet). |
| **Page Analytics** page tab (`meliscms_page_analytics_tab`) | CMS page editor → Tabs (icon *stats*) | Visits recorded for the current page, by date. |

The **Settings** tab form (`PageAnalyticsSelect` / `PageAnalyticsSiteSelect`) stores the active
provider key, per-site settings and the `pads_js_analytics` snippet in
`melis_cms_page_analytics_data` / `melis_cms_page_analytics_data_settings`.

## Front office

There is no view helper or templating plugin. Tracking and script injection are handled by
`MelisCmsPageAnalyticsListener` (attached in `Module.php`), which hooks two events in the front
render pipeline:

| Event | Priority | Action |
| --- | --- | --- |
| `melisfront_site_dispatch_ready` | `-10000` | Front renders only — calls `MelisCmsDefaultPageAnalyticsService::saveAnalyticsData($pageId)` to record the deduped visit. |
| `melis_front_layout` | default | Reads the site's configured `pads_js_analytics` snippet and injects it before `</head>` of the rendered HTML. |

## Database tables

| Table | PK | Holds |
| --- | --- | --- |
| `melis_cms_page_analytics` | `ph_id` | Visit log (deduped hits): `ph_page_id`, `ph_session_id`, `ph_date_visit`, `ph_site_id`. No IP address is stored. |
| `melis_cms_page_analytics_data` | `pad_id` | Per-site provider selection: `pad_site_id`, `pad_analytics_key`. |
| `melis_cms_page_analytics_data_settings` | `pads_id` | Per-(site, provider) settings: `pads_site_id`, `pads_analytics_key`, `pads_js_analytics`, `pads_settings` (e.g. `google_analytics_view_id`). |

## Example

```php
// Read the active analytics provider config for a site
$analytics = $serviceManager->get('MelisCmsPageAnalyticsService')->getAnalytics($siteId);

// Read recorded visits for a specific page (used by the Page Analytics tab)
$visits = $serviceManager->get('MelisCmsPageAnalyticsTable')->getDataByPageId($pageId);
```

Visit recording happens automatically on front render via the listener; calling
`saveAnalyticsData()` directly is not normally needed.

## Key files

| Concern | Path |
| --- | --- |
| Module bootstrap / listener registration | `vendor/melisplatform/melis-cms-page-analytics/src/Module.php` |
| Routes, services, table aliases, controllers | `vendor/melisplatform/melis-cms-page-analytics/config/module.config.php` |
| Backoffice tool + page tab interface | `vendor/melisplatform/melis-cms-page-analytics/config/app.interface.php` |
| DataTable tool config | `vendor/melisplatform/melis-cms-page-analytics/config/app.tools.php` |
| Settings form config | `vendor/melisplatform/melis-cms-page-analytics/config/app.forms.php` |
| Provider contract | `vendor/melisplatform/melis-cms-page-analytics/src/Service/MelisCmsPageAnalyticsServiceInterface.php` |
| Main analytics service | `vendor/melisplatform/melis-cms-page-analytics/src/Service/MelisCmsPageAnalyticsService.php` |
| Built-in recorder | `vendor/melisplatform/melis-cms-page-analytics/src/Service/MelisCmsDefaultPageAnalyticsService.php` |
| Front listener (track + inject) | `vendor/melisplatform/melis-cms-page-analytics/src/Listener/MelisCmsPageAnalyticsListener.php` |
| Site-wide tool controller | `vendor/melisplatform/melis-cms-page-analytics/src/Controller/MelisCmsPageAnalyticsToolController.php` |
| Per-page tab controller | `vendor/melisplatform/melis-cms-page-analytics/src/Controller/MelisCmsPageAnalyticsPageDetailsToolController.php` |
| Table gateways | `vendor/melisplatform/melis-cms-page-analytics/src/Model/Tables/` |
| DB install SQL | `vendor/melisplatform/melis-cms-page-analytics/install/sql/` |

See also: [melis-cms](/reference/modules/melis-cms), [melis-core](/reference/modules/melis-core)
