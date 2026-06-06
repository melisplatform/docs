# MelisCmsPageScriptEditor

> Inject custom scripts/markup into the `<head>` and end of `<body>` of front-office pages, per
> page and per site. Composer package `melisplatform/melis-cms-page-script-editor`.

## Purpose

MelisCmsPageScriptEditor lets editors paste raw markup (analytics tags, meta tags, third-party
JS/CSS…) that gets injected into a page when it is rendered on the front office. Scripts are stored
at two levels — **per site** and **per page** — and merged at render time. A page can also be flagged
as an **exception** so it ignores the site-level scripts and uses only its own. Injection is fully
automatic: an MVC listener rewrites the response HTML on the front route, so no templating change is
needed.

## Enable it

It's a standard Laminas module. Add it to `config/melis.module.load.php` (already present in this
skeleton):

```php
return [
    // …
    'MelisCmsPageScriptEditor',
];
```

Composer dependencies (`composer.json`): `melis-core`, `melis-cms`. The module ships
`dbdeploy: true`, so its tables are created/updated through
[melis-dbdeploy](/reference/modules). Scripts are edited from the CMS page editor and the Sites tool
— see [Build a site](/guide/build-a-site).

## Key services

Registered as `service_manager` aliases in `config/module.config.php`.

| Alias | Role |
| --- | --- |
| `MelisCmsPageScriptEditorService` | The script business logic (save, read, merge, inject). Fires `meliscmspagescripteditor_*` events. |
| `MelisCmsScriptTable` | Table gateway for `melis_cms_scripts` (site & page scripts). |
| `MelisCmsScriptExceptionTable` | Table gateway for `melis_cms_scripts_exceptions` (pages excluding site scripts). |

`MelisCmsPageScriptEditorService` (extends `MelisCore\Service\MelisGeneralService`) exposes:

| Method | Role |
| --- | --- |
| `addScript($siteId, $pageId, $headTopScript, $headBottomScript, $bodyBottomScript, $mcs_id)` | Insert/update a script row (only saves when at least one of the three script fields is non-empty). |
| `addScriptException($siteId, $pageId)` | Mark a page as excluding the site scripts (no-op if already present). |
| `getScriptsPerSite($siteId)` | Script row(s) for a site id. |
| `getScriptsPerPage($pageId)` | Script row(s) for a page id. |
| `getScriptsExceptionPerPage($pageId)` | Exception row(s) for a page id. |
| `getScriptExceptions($siteId, $sortColumn, $sortOrder)` | List of pages that exclude the site scripts (used by the Sites tool table). |
| `getMixedScriptsPerPage($pageId)` | Resolves the final `headTopScript` / `headBottomScript` / `bodyBottomScript` for a page — site + page merged, or page-only when the page is an exception. |
| `updatePageScripts($idPage, $contentGenerated)` | Takes the rendered HTML and injects the merged scripts after `<head>`, before `</head>` and before `</body>`. |
| `getSiteId($pageId)` | Resolves a page's site id (checks the published then the saved page). |

`MelisCmsScriptExceptionTable::getScriptExceptions($siteId, $orderColumn, $order)` returns the
exception list joined with page names for the Sites tool grid.

## Backoffice

Two editing surfaces are declared in `config/app.toolstree.php` / `config/app.tools.php`, hooked
into the existing CMS interface:

- **Page editor tab** — a **Scripts** tab inside the page edition (melisKey
  `meliscms_page_script_editor`, controller
  `MelisCmsPageScriptEditor\Controller\MelisCmsPageScriptEditorPageEdition`, action
  `render-page-script-editor`). It hosts the `meliscmspagescripteditor_script_form` form
  (`mcs_head_top`, `mcs_head_bottom`, `mcs_body_bottom`) plus the
  `meliscmspagescripteditor_script_exception_form` checkbox (`mcse_exclude_site_scripts`) to exclude
  the site scripts for that page.
- **Sites tool tab** — a **Scripts** tab in the Sites tool's *Edit site* (melisKey
  `meliscms_tool_sites_scripts`, controller `MelisCmsPageScriptEditorToolSiteEdition`, action
  `render-tool-site-scripts`). It edits the site-wide scripts (same three fields) and lists the
  pages that opted out via the `meliscmspagescripteditor_site_script_exceptions` table
  (ajax `…/MelisCmsPageScriptEditorToolSiteEdition/getScriptExceptions`), with a delete-exception
  action.

Backoffice routing is the standard `/melis/MelisCmsPageScriptEditor/<Controller>/<action>` segment.
Saving is event-driven rather than form-posted directly: `onBootstrap` (in `src/Module.php`)
attaches listeners that dispatch the save actions when the page or site is saved/published.

| Listener | Hooks (`MelisCms` events) | Role |
| --- | --- | --- |
| `MelisCmsPageScriptEditorSavePageListener` | `meliscms_page_save_start`, `meliscms_page_publish_start` | Dispatches `MelisCmsPageScriptEditorPageEdition::saveScript` to persist the page's Scripts tab. |
| `MelisCmsPageScriptEditorSaveSiteScriptListener` | `meliscms_site_save_end` | Dispatches `MelisCmsPageScriptEditorToolSiteEdition::saveSiteScript` to persist the site's Scripts tab. |
| `MelisCmsPageScriptEditorDuplicatePageListener` | `meliscms_page_duplicate_*`, `melis_cms_duplicate_page_*` | Copies the source page's scripts and exception flag onto the duplicated page. |

To build your own tool, see [Create a tool](/guide/create-a-tool).

## Front office

Injection is **not** a templating plugin — it happens through an MVC listener:

| Listener | Hook | Role |
| --- | --- | --- |
| `MelisCmsPageScriptEditorScriptTagListener` | `MvcEvent::EVENT_FINISH` (front route only, priority 70) | On a front render, calls `MelisCmsPageScriptEditorService::updatePageScripts($idpage, $content)` and replaces the response body with the script-injected HTML. Skips non-PHP/asset URIs. |

A view helper is also registered for programmatic saving:

| Item | Name | Role |
| --- | --- | --- |
| View helper | `melisCmsPageScriptEditorAddScript` (`src/View/Helper/MelisCmsPageScriptEditorAddScriptHelper.php`) | `addScriptData($serviceManager, $scriptData, $siteId, $pageId)` saves a script row via the service, or deletes the row when all script fields are emptied. |

## Database tables

Created by `install/dbdeploy/` (managed by melis-dbdeploy):

| Table | Role |
| --- | --- |
| `melis_cms_scripts` | One script set per site **or** per page: `mcs_id`, `mcs_site_id`, `mcs_page_id`, `mcs_head_top`, `mcs_head_bottom`, `mcs_body_bottom`, `mcs_date_edition`, `mcs_user_id`. |
| `melis_cms_scripts_exceptions` | Pages that ignore the site scripts: `mcse_id`, `mcse_site_id`, `mcse_page_id`, `mcse_date_creation`, `mcse_user_id`. |

## Example

Resolve and read the final scripts that would be injected into a page, then inspect what the front
listener does at render time:

```php
$scriptSrv = $serviceManager->get('MelisCmsPageScriptEditorService');

// Merged site + page scripts (page-only when the page is an exception)
$scripts = $scriptSrv->getMixedScriptsPerPage($pageId);
// $scripts['headTopScript'], $scripts['headBottomScript'], $scripts['bodyBottomScript']

// Same merge applied to rendered HTML (what the front EVENT_FINISH listener calls)
$html = $scriptSrv->updatePageScripts($pageId, $renderedHtml);
```

## Key files

| Concern | Path |
| --- | --- |
| Module / config loading | `vendor/melisplatform/melis-cms-page-script-editor/src/Module.php` |
| Wiring (services, routes, helpers) | `vendor/melisplatform/melis-cms-page-script-editor/config/module.config.php` |
| Backoffice tabs (interface tree) | `vendor/melisplatform/melis-cms-page-script-editor/config/app.toolstree.php` |
| Backoffice forms & table config | `vendor/melisplatform/melis-cms-page-script-editor/config/app.tools.php` |
| Service | `vendor/melisplatform/melis-cms-page-script-editor/src/Service/MelisCmsPageScriptEditorService.php` |
| Front injection listener | `vendor/melisplatform/melis-cms-page-script-editor/src/Listener/MelisCmsPageScriptEditorScriptTagListener.php` |
| Save / duplicate listeners | `vendor/melisplatform/melis-cms-page-script-editor/src/Listener/` |
| View helper | `vendor/melisplatform/melis-cms-page-script-editor/src/View/Helper/MelisCmsPageScriptEditorAddScriptHelper.php` |
| Tables | `vendor/melisplatform/melis-cms-page-script-editor/src/Model/Tables/MelisCmsScriptTable.php`, `MelisCmsScriptExceptionTable.php` |
| Install SQL | `vendor/melisplatform/melis-cms-page-script-editor/install/dbdeploy/22020801_melis_cms_page_script_editor_install.sql` |

See also: [Module reference](/reference/modules) · [Build a site](/guide/build-a-site) ·
[Plugins](/guide/plugins).
