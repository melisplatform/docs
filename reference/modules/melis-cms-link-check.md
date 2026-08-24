# MelisCmsLinkCheck

> Link tester that crawls a page (and optionally its sub-pages or internal links) and records every
> broken link and broken image, keeping one scan log per page. Package `melisplatform/melis-cms-link-check`.

## Purpose

MelisCmsLinkCheck is the Melis link tester. It crawls a page — optionally following its sub-pages or
its internal links — and records every broken link and broken image it finds, saving one scan log
per scanned page. The crawl itself (curl, validation, log insertion, translations) lives server-side
in the Laminas service `MelisCmsLinkCheckService::executeTest()`; the React back-office is a
presentation layer that reads and launches scans through the module's react-api endpoints.

In the v6 React back-office (`/melis-react`) the module ships a native full-React brick with two
surfaces:

- A left-menu **Link tester** tool — a read-only viewer of past scan results, a **Launch a scan**
  modal and a per-row error report, with a **New / Old** toggle that falls back to the classic tool
  in an iframe.
- A **Link Checker** tab in the React CMS page editor that launches and reports a scan scoped to the
  one page being edited.

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisCmsLinkCheck',
];
```

Both surfaces are activation-gated: they appear only if the module is active, discovered by the host
via `GET /melis/react-api/react-modules` (which lists active modules shipping a `brick.manifest.json`).
Deactivating the module removes both the menu tool and the page-editor tab.

## React back-office at a glance

| Item | Value |
| --- | --- |
| Brick kind | Native full-React (with a New/Old legacy-iframe fallback) + a page-editor tab |
| Brick id | `cms-link-check` |
| Manifest `route` | `/melis-cms-link-check/results` |
| `label` | `Testeur de liens` (Link tester) |
| `forwardKey` | `MelisCmsLinkCheck/MelisCmsLinkCheckList` |
| `melisKey` (menu / Old-view iframe / rights node) | `meliscmslinkcheck_tool` |
| Page-tab key (= its capability) | `meliscmslinkcheck_page_link_check_tab` |
| API base | `/melis/react-api/cms-link-check` |
| React-api controller | `MelisReactApiLinkCheckController` (invokable `MelisReactApiLinkCheck`) |
| Table (owned) | `melis_cms_link_check_logs` |
| Scan service | `MelisCmsLinkCheckService::executeTest(...)` |

## The Link tester tool

Left sidebar → the **Link tester** (*Testeur de liens*) node opens the tool as a top tab. The New
view lists every scan log on the platform, one row per scanned page.

![React Link tester tool showing KPI cards, filters and the results list](/screenshots/react/melis-cms-link-check/meliscmslinkcheck-tool-linkchecker-list.png)

The list has KPI cards (Pages scanned, Total errors, Sites), a search box (matches page URL, page
id, site name/label), a site filter (only sites that have logs), Reset filters, a Columns manager
(show/hide/reorder columns, saved locally) and an Export. Click a column header to sort (default:
newest scan first). Error counts are shown as badges — green when 0, red otherwise (Errors = total,
Links, Images).

Each row has four actions:

| Action | Icon | Purpose |
| --- | --- | --- |
| View front | eye | Opens the scanned page URL in a new tab. |
| Edit page | pencil | Opens the page in the React CMS page editor and switches to it. |
| Report | document | Opens the per-page error report modal. |
| Delete | trash | Removes that scan log (needs the `delete` capability). |

The top-right **New / Old** toggle switches the whole tool between the React viewer (default) and the
classic tool rendered in an iframe (`/melis/react-tool-page?key=meliscmslinkcheck_tool`), which can
also be used to launch scans the legacy way.

## Launching a scan

The red **Launch a scan** button (shown if you have the `launch` capability) opens a modal.

![Launch a scan modal with page picker, scope radios and check checkboxes](/screenshots/react/melis-cms-link-check/meliscmslinkcheck-tool-linkchecker-launchscan.png)

Pick the starting page from the lazy CMS page tree, choose a **scope** and what to **check**, then
**Run**. The scan crawls the page(s), records the results, refreshes the list and posts a
notification.

- **Scope** — This page only / This page and its sub-pages / This page and its internal links
  (sent as `follow: '1' | '2' | '3'`).
- **Check** — Links and/or Images (sent as `options: ['LINK', 'IMG']`).

## Reading a page's report

The **Report** action on a row opens the detailed errors for that scan log.

![Per-page error report modal in its clean state](/screenshots/react/melis-cms-link-check/meliscmslinkcheck-tool-linkchecker-report.png)

A clean page shows "✓ No error recorded for this page." A page with errors shows a table: **Type**
(LINK / IMG badge) · **URL** · **Details** (the failure). The detail comes from the parsed XML
`lcl_errors` column, decoded into an `errorList` of `{ url, type, details }`.

## Checking one page from its editor

Open a page in the React CMS page editor and click the **Link Checker** tab. It shows the last scan
of that page (date, Errors / Links / Images badges and the detailed error table or a clean message)
with a **Re-scan** button — or **Launch a scan** if the page was never scanned — that runs a scan
for that page only.

![Link Checker tab in the React CMS page editor showing a page-scoped scan](/screenshots/react/melis-cms-link-check/meliscmslinkcheck-pageedition-tab-linkchecker-launchandreport.png)

The tab is contributed to the CMS page editor via the host bridge `window.__melisRegisterPageTab`
(owned by the CmsPage brick), keyed `meliscmslinkcheck_page_link_check_tab`; CmsPage renders it with
`{ idPage }`.

## React API — endpoints

Routes live in `config/react-api.php`, served by
`MelisCmsLinkCheck\Controller\MelisReactApiLinkCheckController`. All under
`/melis/react-api/cms-link-check`, with the contract `{ success, data, error }`. Every fetch sends
`X-Requested-With: XMLHttpRequest` and `credentials: 'include'`.

| Method & URL | Action | Purpose |
| --- | --- | --- |
| `GET /cms-link-check` | `list` | Scan logs (keyset: `limit`, `search`, `site`, `sort`, `dir`, `after`) → `{items,total,nextCursor}` |
| `GET /cms-link-check/stats` | `stats` | KPI `{total, errors, sites}` |
| `GET /cms-link-check/sites` | `sites` | Site filter options (only sites present in logs) |
| `POST /cms-link-check/launch` | `launch` | Run a scan (`{pageId, follow, options}`) → `{status,message,logIds,pagesVisited}` |
| `GET /cms-link-check/by-page/:idPage` | `byPage` | Last scan of ONE page (page-editor tab); `data: null` if never scanned |
| `DELETE /cms-link-check/delete/:id` | `delete` | Delete a scan log |
| `GET /cms-link-check/:id` | `get` | One log + its parsed `errorList:[{url,type,details}]` |

> Route order matters: `/stats`, `/sites`, `/launch`, `/by-page/:idPage` and `/delete/:id` are
> declared before the catch-all `/:id`.

The `list`, `stats`, `sites`, `get`, `by-page` and `delete` actions read `melis_cms_link_check_logs`
directly via parameterised SQL (`Laminas\Db\Adapter\AdapterInterface`). Only `launch` delegates to
`MelisCmsLinkCheckService::executeTest([...])` — the real crawl — wrapped in `ob_start()` /
`ob_end_clean()` so legacy warnings do not corrupt the JSON. The Launch-a-scan page picker reuses an
existing legacy endpoint (no new backend):
`GET /melis/MelisCms/TreeSites/get-tree-pages-by-page-id?nodeId=<id>` (`nodeId=-1` → root sites).

## Capabilities

Declared in `config/react.capabilities.php` under two rights-bearing nodes:

```php
return [
  'melisReactToolCapabilities' => [
    'meliscmslinkcheck_tool' => ['list', 'launch', 'delete', 'export'],
    'meliscms_page' => [
      'tabs' => [
        ['key' => 'meliscmslinkcheck_page_link_check_tab', 'label' => 'tr_meliscmslinkcheck_page_link_check_tab'],
      ],
    ],
  ],
];
```

- **Tool caps** — `list` (the whole read-only viewer: list/stats/sites/report), `launch` (run a
  scan), `delete` (delete a log), `export` (the Export button; export reuses the `list` endpoint). In
  React they gate the UI via `MelisCan('meliscmslinkcheck_tool', cap)`; server-side each action is
  guarded by `denyUnlessAccess()` then `denyUnlessCan('list'|'launch'|'delete')`.
- **Page-tab cap** — the `key` `meliscmslinkcheck_page_link_check_tab` must equal the key passed to
  `window.__melisRegisterPageTab`; it *is* the tab's capability. Without this declaration the
  CMS-page caps whitelist hides the tab button even for an admin. The tab's `by-page` endpoint is
  gated by session auth only (it is a sub-feature of the page editor); the button by this cap.

## Database tables

| Table | Role |
| --- | --- |
| `melis_cms_link_check_logs` | One scan log per scanned page: broken-link / broken-image counts plus the detailed error list stored as XML in the `lcl_errors` column. |

## Legacy controllers (Old view)

Used by the New/Old iframe fallback and the classic tool, not by the React viewer:

| Controller | Role |
| --- | --- |
| `MelisCmsLinkCheckListController` | Classic tool page + its results DataTables. |
| `MelisCmsLinkCheckLaunchController` | Classic launch modal / form (page + scope + check). |
| `MelisCmsLinkCheckPageLinkCheckController` | Classic page-edition Link Check tab (`renderPageLinkCheckAction`, `{ idPage }`). |

## Key files

| Concern | Path |
| --- | --- |
| React-api routes + invokable | `config/react-api.php` |
| Capabilities | `config/react.capabilities.php` |
| Legacy tool config | `config/app.*.php` |
| React-api controller | `src/Controller/MelisReactApiLinkCheckController.php` |
| Scan service | `src/Service/MelisCmsLinkCheckService.php` |
| React brick source | `ui-react/src/` (`brick.tsx`, `LinkCheckPage.tsx`, `linkcheck-api.ts`, …) |
| Built brick + manifest | `public/ui-react/brick.js`, `public/ui-react/brick.manifest.json` |
