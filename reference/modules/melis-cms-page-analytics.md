# MelisCmsPageAnalytics

> Basic page-visit analytics for CMS sites — records page views and lets a site plug in an
> external analytics provider (e.g. Google Analytics), now driven from a native React back-office.
> Package `melisplatform/melis-cms-page-analytics`.

## Purpose

`MelisCmsPageAnalytics` is the platform's built-in page-view tracker. On every front-office page
render it records a deduped visit (once per session, per page, per day) into
`melis_cms_page_analytics`, and surfaces the data in the back-office as a **Page Analytics** site
tool and a **Page Analytics** tab on each CMS page. Per site you can also store an analytics
provider key and a JavaScript snippet that the module injects into the page `<head>` at render
time — the hook used by add-on providers such as Google Analytics.

In v6 the back-office is a **native full-React brick**: a read-only visits table plus a settings
panel, calling a `react-api` JSON layer. Tracking, the provider contract and settings persistence
are unchanged — v6 only replaces the display layer.

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisCmsPageAnalytics',
];
```

Required Composer dependencies: `melisplatform/melis-core` and `melisplatform/melis-cms`. The module
also relies on `melis-engine` and `melis-front` services at runtime (tree, page tables, front
dispatch events). Database tables are installed via `MelisSetupController` from `install/sql/`. The
React brick appears in the menu only while the module is listed in `melis.module.load.php` (modular
brick discovery).

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

## React back-office

The tool is a **native full-React brick** with a **New / Old** toggle that can fall back to the
legacy tool in an iframe. It lives in the sidebar under **Marketing / Site Tools → Page Analytics**
and opens with two internal tabs, **Analytics** and **Settings**.

| Brick property | Value |
| --- | --- |
| Brick id | `pageanalytics` |
| Manifest `route` | `/melis-marketing/meliscms-page-analytics` |
| `forwardKey` | `MelisCmsPageAnalytics/MelisCmsPageAnalyticsTool` |
| `melisKey` (Old-view iframe target) | `meliscms_page_analytics_display` |
| Access-guard node (controller) | `meliscms_page_analytics_tools_section` |
| API base | `/melis/react-api/page-analytics` |

- **Analytics tab** — a read-only table of visits **aggregated per page** (page id, page name,
  visit count, last visit) with KPI cards (hits / pages / sites / last visit), a site filter,
  search, a column manager, infinite scroll, server-side sort and **Export**. Deleted pages show an
  italic *(deleted)* label. If the selected site is assigned a third-party provider that ships its
  own React display, the tab hosts **that module's dashboard** instead of the built-in table.
- **Settings tab** — pick a **Site** then an **Analytics module** (the built-in "no analytics"
  option plus every active provider). The chosen module's own fields are rendered data-driven
  (text / textarea / select / password / file, e.g. a Google Analytics private key). Platform
  admins can also edit the custom `<head>` JS snippet; non-admins see it read-only.

> React screenshots of these screens are not available yet.

## React API

Routes are defined in `config/react-api.php` and merged into the module config. The contract is
`{ success, data, error }`; every request sends `X-Requested-With: XMLHttpRequest` and
`credentials: 'include'`. Two controllers back the UI: `MelisReactApiPageAnalyticsController` (the
tool) and `MelisReactApiPageAnalyticsTabController` (the CMS page editor tab).

| Method & URL | Purpose |
| --- | --- |
| `GET /melis/react-api/page-analytics` | Visits aggregated per page (keyset: `limit`, `search`, `site`, `sort`, `dir`, `after`) → `{items,total,nextCursor}`, each item `{pageId,pageName,count,lastVisit}`. |
| `GET /melis/react-api/page-analytics/stats` | KPI `{hits, pages, sites, lastVisit}` (honours `search`/`site`). |
| `GET /melis/react-api/page-analytics/sites` | Site options `{sites:[{id,name}]}` for the selector. |
| `GET /melis/react-api/page-analytics/settings` | Settings-tab state (module list + data-driven form schema + current values). |
| `GET /melis/react-api/cms-page/analytics` | One page's visits (`idPage`, `page`, `perPage`) → `{visits, sessions, lastVisit, recent, page, perPage, recentTotal}`. |

The tool controller reads the tables directly via parameterised SQL (`melis_cms_page_analytics`
joined to `melis_cms_page_published` for names and `melis_cms_site` for the selector, opaque keyset
cursor). It guards access on the rights-bearing node `meliscms_page_analytics_tools_section` — **not**
on the manifest `melisKey` (`meliscms_page_analytics_display`), which is only the Old-view iframe
zone key.

**Writing settings is not a react-api route** — the Settings panel POSTs a `FormData` payload to the
legacy tool action so all server-side logic (Laminas validation, GA key upload, `pads_settings`
serialization, admin guard on the raw JS, flash messenger) is reused verbatim:

```ts
const LEGACY_SAVE_URL = '/melis/MelisCmsPageAnalytics/MelisCmsPageAnalyticsTool/save'
await fetch(LEGACY_SAVE_URL, {
  method: 'POST',
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
  credentials: 'include',
  body: formData,
}) // → { success, textTitle, textMessage, errors }
```

## CMS page tab and capabilities

The module contributes a **Page Analytics** tab to the CMS page editor, backed by
`GET /melis/react-api/cms-page/analytics` (total visits, distinct sessions, last visit and a
paginated list of recent visit dates for that page). The tab is declared in
`config/react.capabilities.php` under the shared `meliscms_page` node, and the key
`meliscms_page_analytics_tab` **is** the capability string used to gate it in Users → Rights:

```php
'melisReactToolCapabilities' => [
  'meliscms_page' => [
    'tabs' => [
      ['key' => 'meliscms_page_analytics_tab', 'label' => 'tr_melis_cms_page_analytics_title'],
    ],
  ],
],
```

## Modular site-level display

When a site is assigned a third-party analytics module that declares a React display (e.g.
**MelisCmsGoogleAnalytics** via `react_display_key`), the Analytics tab hosts that module's own
React display instead of the native visits table. The brick consumes a global registry,
`window.__melisAnalyticsSiteDisplays[<analyticsKey>]`; it re-checks on the
`melis:analytics-site-display-registered` window event (bundles load asynchronously) and, if nothing
is registered, falls back to an iframe `/melis/react-tool-page?key=<displayKey>&siteId=<site>`.

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
| React API routes | `vendor/melisplatform/melis-cms-page-analytics/config/react-api.php` |
| React tab capability | `vendor/melisplatform/melis-cms-page-analytics/config/react.capabilities.php` |
| React brick + manifest | `vendor/melisplatform/melis-cms-page-analytics/public/ui-react/` |
| React sources | `vendor/melisplatform/melis-cms-page-analytics/ui-react/src/` |
| React API controllers | `vendor/melisplatform/melis-cms-page-analytics/src/Controller/MelisReactApiPageAnalyticsController.php`, `MelisReactApiPageAnalyticsTabController.php` |
| Provider contract | `vendor/melisplatform/melis-cms-page-analytics/src/Service/MelisCmsPageAnalyticsServiceInterface.php` |
| Main analytics service | `vendor/melisplatform/melis-cms-page-analytics/src/Service/MelisCmsPageAnalyticsService.php` |
| Built-in recorder | `vendor/melisplatform/melis-cms-page-analytics/src/Service/MelisCmsDefaultPageAnalyticsService.php` |
| Front listener (track + inject) | `vendor/melisplatform/melis-cms-page-analytics/src/Listener/MelisCmsPageAnalyticsListener.php` |
| Table gateways | `vendor/melisplatform/melis-cms-page-analytics/src/Model/Tables/` |
| DB install SQL | `vendor/melisplatform/melis-cms-page-analytics/install/sql/` |

See also: [melis-cms](/reference/modules/melis-cms), [melis-core](/reference/modules/melis-core)
