# MelisCmsPageScriptEditor

> Inject custom `<script>`/`<style>`/HTML (analytics, tracking pixels, third-party widgets) into the
> `<head>` and `<body>` of front-office pages, per page and per site, without editing templates.
> Package `melisplatform/melis-cms-page-script-editor`.

## Purpose

MelisCmsPageScriptEditor lets you add raw markup and have it injected automatically into the
rendered HTML of your pages. Three injection slots are available: **head top** (right after
`<head>`), **head bottom** (just before `</head>`), and **body bottom** (just before `</body>`).
Scripts can be scoped to a whole site or to a single page; a page can be marked as an **exception**
to opt out of the site-wide scripts.

In the v6 React back-office the module ships as a **contribution-only brick** — it has no left-menu
tool of its own. Instead it adds a **Scripts tab in two places**: the **CMS page editor** (per-page
scripts) and the **Sites tool edition** (site-wide scripts + exceptions). The data model, service
and injection listeners are unchanged from v5; only the back-office UI moved to React.

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisCmsPageScriptEditor',
];
```

Requires `melis-core ^6.0` and `melis-cms ^6.0` (PHP `^8.3|^8.5`). The module is tagged
`dbdeploy: true`, so its tables are created automatically by melis-dbdeploy.

> **Per-site activation:** injection only takes effect on a site once the module is loaded for that
> site in MelisCms → Sites → Module loading. Scripts can be edited in the back-office before that,
> but nothing is injected on the front until the module is enabled on the site.

## Back-office in React

There is **no dedicated left-menu tool** — the Scripts tab lives inside two existing tools, both
native React. Both tabs appear only when the module is active (discovered via
`GET /melis/react-api/react-modules`, then the brick bundle is prefetched at boot).

| Surface | Where | Content | Save |
| --- | --- | --- | --- |
| **Page editor → Scripts tab** | MelisCms → open a **page** → *Scripts* | Three per-page code editors (Head top / Head bottom / Body bottom) for **this page only**. | Own **Save scripts** button. |
| **Sites tool → Scripts tab** | MelisCms → **Sites** → open a site → *Scripts* | Three site-wide editors + **Current Exceptions** list + **Add an exception** (page-id input or page-tree picker). | Saved by the site editor's global **Save** button; add/remove exceptions persist immediately. |

![React CMS page editor, Scripts tab: the three per-page code editors (Head top / Head bottom / Body bottom) with a Save scripts button](/screenshots/react/melis-cms-page-script-editor/meliscmspagescripteditor-page-tab-scripts.png)

![React Sites edition, Scripts tab: the three site-wide editors, the Current Exceptions list and the Add an exception block, saved by the site editor's global Save button](/screenshots/react/melis-cms-page-script-editor/meliscmspagescripteditor-tooloverride-sites-edit-tab-scripts.png)

On a served page, each slot gets **site scripts first, then the page's own scripts** — unless the
page is an exception, in which case only its own page scripts are injected.

The **page-editor tab component** lives in MelisCms (`PageTabs.tsx`, key
`meliscms_page_script_editor`); the **site-tab component** (`ScriptsTab.tsx`) lives in this module
and self-registers via the generic `window.__melisSiteTabs` registry (order `55`). This module owns
the endpoints and the capability behind both tabs.

## Capabilities (advanced rights)

The page tab is a **capability of the CMS page tool**, declared in `config/react.capabilities.php`
under the shared `meliscms_page` node:

```php
return [
  'melisReactToolCapabilities' => [
    'meliscms_page' => [
      'tabs' => [
        ['key' => 'meliscms_page_script_editor', 'label' => 'tr_meliscmspagescripteditor_title'],
      ],
    ],
  ],
];
```

Without this declaration the CMS-page caps whitelist hides the **Scripts** tab button in the page
editor, even for an admin. The **Sites-tool** Scripts tab has no capability of its own: it is gated
by access to the Sites tool (`meliscms_tool_sites`).

## React API

Two controllers owned by this module, both delegating to `MelisCmsPageScriptEditorService`. Contract
`{ success, data, error }`, with `X-Requested-With: XMLHttpRequest` and `credentials: 'include'`.

**Page-tab** — `MelisReactApiPageScriptEditorController`, routes in `config/react-api.php`. Guarded
by auth + `MelisCoreRights::canAccess('meliscms_page_script_editor')`:

| Method & URL | Purpose |
| --- | --- |
| `GET /melis/react-api/cms-page/scripts?idPage=<id>` | Read a page's scripts → `{ idPage, headTop, headBottom, bodyBottom, editDate }`. |
| `POST /melis/react-api/cms-page/scripts/save` | Save a page's scripts (`{ idPage, headTop, headBottom, bodyBottom }`). |

**Site-tab** — `MelisCmsPageScriptEditorReactController`, generic route
`/melis/MelisCmsPageScriptEditor/:controller/:action` in `config/module.config.php`. Guarded by auth
+ `MelisCoreRights::canAccess('meliscms_tool_sites')`:

| Method & URL (relative to `.../MelisCmsPageScriptEditorReact`) | Purpose |
| --- | --- |
| `GET /site-script?siteId=<id>` | Site scripts + exception count → `{ siteId, script, exceptionCount }`. |
| `POST /save-site-script` | Save site scripts (all-empty ⇒ deletes the entry). |
| `GET /exceptions?siteId=<id>` | The site's exceptions → `{ items:[{id,pageId,pageName}], total }`. |
| `POST /add-exception` | Add an exception (`{ siteId, pageId }`; enforces same-site + no duplicate). |
| `POST /delete-exception` | Remove an exception (`{ id }`). |

> **Security note.** The page endpoints inject custom `<script>`/HTML into the **public** rendering
> of a page, so both `get` and `save` require the page-script-editor tool right (not merely a
> session), preventing a zero-rights BO user from planting persistent XSS. Writes use parameterised
> SQL directly on `melis_cms_scripts`.

## Key services

| Alias | Role |
| --- | --- |
| `MelisCmsPageScriptEditorService` | All script business logic: save, read, merge and inject scripts. Reused by both React controllers. |
| `MelisCmsScriptTable` | Table gateway for `melis_cms_scripts`. |
| `MelisCmsScriptExceptionTable` | Table gateway for `melis_cms_scripts_exceptions`. |

`MelisCmsPageScriptEditorService` exposes:

| Method | Role |
| --- | --- |
| `addScript($siteId, $pageId, $headTop, $headBottom, $bodyBottom, $mcsId)` | Insert or update a script row for a site or page. |
| `addScriptException($siteId, $pageId)` | Mark a page as excluding the site-wide scripts. |
| `getScriptExceptions($siteId, $sortCol, $sortOrder)` | List pages that opt out of the site scripts. |
| `getScriptsPerSite($siteId)` / `getScriptsPerPage($pageId)` | Retrieve the script row(s) for a site / page. |
| `getScriptsExceptionPerPage($pageId)` | Retrieve the exception row(s) for a page. |
| `getMixedScriptsPerPage($pageId)` | Resolve the final scripts for a page — site + page merged, or page-only when the page is an exception. Used by the front render listener. |
| `updatePageScripts($pageId, $html)` | Injects the merged scripts into rendered HTML (after `<head>`, before `</head>`, before `</body>`). |
| `getSiteId($pageId)` | Resolve the site id for a given page. |

## Front office

Injection happens through an MVC listener, not a template plugin:

| Listener | Trigger | Role |
| --- | --- | --- |
| `MelisCmsPageScriptEditorScriptTagListener` | Page render (front) | Calls `getMixedScriptsPerPage()` and injects the resolved scripts: head-top after `<head>`, head-bottom before `</head>`, body-bottom before `</body>`. |

Save and duplicate remain event-driven (`Module.php::onBootstrap`): the save-page, save-site-script
and duplicate-page listeners persist scripts and the exclude-site exception when pages/sites are
saved or duplicated in the back-office. The view helper `melisCmsPageScriptEditorAddScript`
(`src/View/Helper/MelisCmsPageScriptEditorAddScriptHelper.php`) provides programmatic access to save
a script row via the service.

## Database tables

| Table | Holds |
| --- | --- |
| `melis_cms_scripts` | One script set per site or per page: `mcs_id`, `mcs_site_id`, `mcs_page_id`, `mcs_head_top`, `mcs_head_bottom`, `mcs_body_bottom`, `mcs_date_edition`, `mcs_user_id`. |
| `melis_cms_scripts_exceptions` | Pages that ignore the site scripts: `mcse_id`, `mcse_site_id`, `mcse_page_id`, `mcse_date_creation`, `mcse_user_id`. |

## Example

```php
$scripts = $this->getServiceManager()->get('MelisCmsPageScriptEditorService');

// Resolve the final scripts for a page (site + page merged, or page-only if exception)
$resolved = $scripts->getMixedScriptsPerPage($pageId);
// $resolved contains headTopScript, headBottomScript, bodyBottomScript

// Save scripts for a site or page
$scripts->addScript($siteId, $pageId, $headTop, $headBottom, $bodyBottom, $mcsId);

// Mark a page as an exception (it will no longer receive site-wide scripts)
$scripts->addScriptException($siteId, $pageId);

// List all pages that opted out of the site scripts
$exceptions = $scripts->getScriptExceptions($siteId, $sortCol, $sortOrder);
```

## Key files

| Concern | Path |
| --- | --- |
| Module bootstrap & listener wiring | `vendor/melisplatform/melis-cms-page-script-editor/src/Module.php` |
| Service & route wiring | `vendor/melisplatform/melis-cms-page-script-editor/config/module.config.php` |
| Page-tab React API routes | `vendor/melisplatform/melis-cms-page-script-editor/config/react-api.php` |
| Page-tab capability declaration | `vendor/melisplatform/melis-cms-page-script-editor/config/react.capabilities.php` |
| React controllers (page / site) | `vendor/melisplatform/melis-cms-page-script-editor/src/Controller/` |
| Site-tab brick (Vite IIFE) | `vendor/melisplatform/melis-cms-page-script-editor/ui-react/src/` (`brick.tsx`, `ScriptsTab.tsx`, `site-scripts-api.ts`) |
| Service | `vendor/melisplatform/melis-cms-page-script-editor/src/Service/MelisCmsPageScriptEditorService.php` |
| Front injection listener | `vendor/melisplatform/melis-cms-page-script-editor/src/Listener/MelisCmsPageScriptEditorScriptTagListener.php` |
| View helper | `vendor/melisplatform/melis-cms-page-script-editor/src/View/Helper/MelisCmsPageScriptEditorAddScriptHelper.php` |
| Table gateways | `vendor/melisplatform/melis-cms-page-script-editor/src/Model/Tables/` |
| Install SQL | `vendor/melisplatform/melis-cms-page-script-editor/install/dbdeploy/` |

See also: [Module reference](/reference/modules) · [melis-cms](/reference/modules/melis-cms) ·
[melis-core](/reference/modules/melis-core)
