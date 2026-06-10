# MelisCmsPageScriptEditor

> Inject custom scripts and styles into `<head>` and `<body>` of front-office pages, per page and
> per site, without editing templates. Package `melisplatform/melis-cms-page-script-editor`.

## Purpose

MelisCmsPageScriptEditor lets you add raw markup — analytics tags, tracking pixels, third-party
widgets, custom `<script>`/`<style>` blocks — to your pages and sites, and have them injected
automatically into the rendered HTML. Three injection slots are available: **head top** (right after
`<head>`), **head bottom** (just before `</head>`), and **body bottom** (just before `</body>`).
Scripts can be scoped to the whole site or to a single page; a page can also be marked as an
exception to opt out of the site-wide scripts.

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisCmsPageScriptEditor',
];
```

Requires `melis-core` and `melis-cms` (`^5.2`). The module is tagged `dbdeploy: true`, so its
tables are created automatically by melis-dbdeploy.

> **Per-site activation:** injection only takes effect on a site once the module is loaded for that
> site in MelisCms → Sites → Module loading. The scripts can be edited in the back-office before
> that, but nothing is injected on the front until the module is enabled on the site.

## Key services

| Alias | Role |
| --- | --- |
| `MelisCmsPageScriptEditorService` | All script business logic: save, read, merge, and inject scripts. |
| `MelisCmsScriptTable` | Table gateway for `melis_cms_scripts`. |
| `MelisCmsScriptExceptionTable` | Table gateway for `melis_cms_scripts_exceptions`. |

`MelisCmsPageScriptEditorService` exposes the following methods:

| Method | Role |
| --- | --- |
| `addScript($siteId, $pageId, $headTop, $headBottom, $bodyBottom, $mcsId)` | Insert or update a script row for a site or page. |
| `addScriptException($siteId, $pageId)` | Mark a page as excluding the site-wide scripts. |
| `getScriptExceptions($siteId, $sortCol, $sortOrder)` | List pages that opt out of the site scripts (used by the Sites tool table). |
| `getScriptsPerSite($siteId)` | Retrieve the script row(s) for a site. |
| `getScriptsPerPage($pageId)` | Retrieve the script row(s) for a page. |
| `getScriptsExceptionPerPage($pageId)` | Retrieve the exception row(s) for a page. |
| `getMixedScriptsPerPage($pageId)` | Resolve the final scripts for a page — site + page merged, or page-only when the page is an exception. Used by the front render listener. |
| `updatePageScripts($pageId, $html)` | Injects the merged scripts into rendered HTML (after `<head>`, before `</head>`, before `</body>`). |
| `getSiteId($pageId)` | Resolve the site id for a given page. |

## Backoffice

Two **Scripts** tabs are injected into the existing CMS interface via `config/app.toolstree.php`:

| Surface | melisKey | Controller | Content |
| --- | --- | --- | --- |
| Page editor → Scripts tab | `meliscmspagescripteditor_page_edition` | `MelisCmsPageScriptEditorPageEditionController` | Three textarea slots (`mcs_head_top`, `mcs_head_bottom`, `mcs_body_bottom`) plus an *exclude site scripts* checkbox (`mcse_exclude_site_scripts`). |
| Sites tool → Scripts tab | `meliscms_tool_sites_scripts` | `MelisCmsPageScriptEditorToolSiteEditionController` | Same three slots for site-wide scripts, plus an exceptions DataTable (`meliscmspagescripteditor_site_script_exceptions`) listing every page that opted out, with a delete-exception action and an add-exception form. |

Saving is event-driven. `Module.php::onBootstrap` registers these listeners:

| Listener | Trigger | Role |
| --- | --- | --- |
| `MelisCmsPageScriptEditorSavePageListener` | Page save / publish (BO) | Persists the page's scripts and its exclude-site exception. |
| `MelisCmsPageScriptEditorSaveSiteScriptListener` | Site save (BO) | Persists the site-wide scripts. |
| `MelisCmsPageScriptEditorDuplicatePageListener` | Page duplicate (BO) | Copies scripts and exception flag to the new page. |

## Front office

Injection happens through an MVC listener, not a template plugin:

| Listener | Trigger | Role |
| --- | --- | --- |
| `MelisCmsPageScriptEditorScriptTagListener` | Page render (front) | Calls `getMixedScriptsPerPage()` and injects the resolved scripts: head-top after `<head>`, head-bottom before `</head>`, body-bottom before `</body>`. |

The view helper `melisCmsPageScriptEditorAddScript`
(`src/View/Helper/MelisCmsPageScriptEditorAddScriptHelper.php`) provides programmatic access to
save a script row via the service.

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
| Service wiring (services, routes, helpers) | `vendor/melisplatform/melis-cms-page-script-editor/config/module.config.php` |
| Backoffice tabs (interface tree) | `vendor/melisplatform/melis-cms-page-script-editor/config/app.toolstree.php` |
| Backoffice forms & exceptions table | `vendor/melisplatform/melis-cms-page-script-editor/config/app.tools.php` |
| Service | `vendor/melisplatform/melis-cms-page-script-editor/src/Service/MelisCmsPageScriptEditorService.php` |
| Front injection listener | `vendor/melisplatform/melis-cms-page-script-editor/src/Listener/MelisCmsPageScriptEditorScriptTagListener.php` |
| Save / duplicate listeners | `vendor/melisplatform/melis-cms-page-script-editor/src/Listener/` |
| View helper | `vendor/melisplatform/melis-cms-page-script-editor/src/View/Helper/MelisCmsPageScriptEditorAddScriptHelper.php` |
| Table gateways | `vendor/melisplatform/melis-cms-page-script-editor/src/Model/Tables/` |
| Install SQL | `vendor/melisplatform/melis-cms-page-script-editor/install/dbdeploy/` |

See also: [Module reference](/reference/modules) · [melis-cms](/reference/modules/melis-cms) ·
[melis-core](/reference/modules/melis-core)
