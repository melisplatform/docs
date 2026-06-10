# MelisSmallBusiness

> Backoffice collaboration features for the CMS — page versioning, a validation **workflow**,
> page **comments**, **page locking**, **user roles** and a TinyMCE **media library**.
> Package `melisplatform/melis-small-business`.

## Purpose

`MelisSmallBusiness` layers small-team / small-business collaboration tooling on top of the CMS
page editor. It keeps **versions** of published pages (so a page can be restored or previewed at an
earlier state), drives a content **workflow** where an editor asks for validation and a reviewer
validates or refuses it, attaches **comments** to pages, prevents two users from editing the same
page at once through a **page lock**, manages a custom **user role** tool, and ships a TinyMCE-based
**media library** (MoxieManager) for browsing and uploading files. Most of its behaviour is wired
through CMS editor **events** (see [Modules](/reference/modules)).

## Enable it

This is a standard Laminas module. Add it to `config/melis.module.load.php`:

```php
return [
    // …
    'MelisSmallBusiness',
];
```

It depends on `melis-core`, `melis-engine`, `melis-front` and `melis-cms` (see `composer.json`),
and its tables are created via dbdeploy (`extra.dbdeploy = true`). The module's `Module::init()`
attaches `MelisSBAddModuleConfigListener` and, on backoffice routes, a set of CMS-editor listeners
(versioning save, page-lock, workflow, rights tree, TinyMCE config…).

## Key services

| Service alias | Role |
| --- | --- |
| `MelisEnginePage` | The module **overrides** the engine's page service with `MelisSBPageService`. When the route is the version-preview route (`…/id/{idpage}/preview/idversion/{idversion}`), it returns the versioned page tree from `melis_sb_page_versioning`; otherwise it behaves exactly like the parent. |
| `MelisSBPageCommentService` | Page comments: `getPageComments()` (enriches with user + formatted date), `setPageComments()` (saves with the current user as author). |

Table gateways are also registered as services: `MelisPageComment`, `MelisPageCommentType`,
`MelisPageLockTable`, `MelisPageVersioningTable`, `MelisUserRole`, `MelisWorkflowTable`,
`MelisWorkflowEventsTable`.

::: warning
By aliasing `MelisEnginePage` to its own class, this module replaces the core page service for the
whole application while it is enabled. Keep that in mind when ordering modules.
:::

## Backoffice

Tools and interfaces are declared in `config/app.tools.php` and `config/app.interface.php`
(controllers are plain invokables under `MelisSmallBusiness\Controller\…`).

| Tool / tab (melisKey) | Controller / action | Role |
| --- | --- | --- |
| `melissb_tool_userrole` | `ToolUserRole::render-tool-user-role` (data: `getRolesData`) | Custom **user role** tool under *Admin* in the tools tree; CRUD over roles, plus a `MelisUserRoleSelect` field injected into the core user form. |
| `melissb_page_versioning` | `PageVersioning::render-page-versioning` | **Versioning** tab on the page editor — list of archived versions with edit / save / view (preview) actions. |
| `melissb_page_comments` | `PageComments::render-page-comments` | **Comments** tab on the page editor (add + timeline). |
| `melissb_medialib` | `MediaLibrary::renderPageMediaLibrary` | **Media library** tool (TinyMCE MoxieManager) for browsing/uploading files. |
| `melissb_workflow_modal_content` | `MelisWorkflow::render-workflow-modal-content` | **Workflow** modal: ask for validation, validate, refuse, and view the historic. |

The workflow feature sends three backoffice emails (defined in `app.emails.php`) through MelisCore's
BO email service:

| Email code | Trigger | Tags available |
| --- | --- | --- |
| `WF_DEMAND` | A validation request is raised | `USER_TO`, `USER_FROM`, `TYPE`, `DETAILS` |
| `WF_VALIDATED` | An approver validates a demand | same |
| `WF_REFUSED` | An approver refuses a demand | same |

The module also adds a `MelisMediaUpload` (`melis-media-upload`) form element with its factory,
view helper and `MelisMediaUploadValidator`.

Page locking has no dedicated tool: it is enforced by listeners (`MelisSBPageLockListener`,
`…TreeListener`, `…InfoListener`, `…PageActionButtonsAndTabsListener`, `…LogoutListener`) that mark
a page as locked in `melis_sb_page_locked` while a user edits it.

## Front office

| Type | Name | Role |
| --- | --- | --- |
| Dashboard plugin | `MelisSBWorkflowPlugin` | Backoffice dashboard widget (`workflow` action) listing pending workflow demands / recent activity. Declared under `meliscore_dashboard` (`melissb_dashboard_workflow`); see [Plugins](/guide/plugins). |

There is also a small front-office asset (`front.pagelock.js`) registered under `melisfront`, but
the module has **no front-office templating plugin** — its surface is the backoffice.

## Database tables

Created by `install/dbdeploy/126618_melis_sb_install.sql` (mirrored in `install/sql/setup_structure.sql`).

| Table | Role |
| --- | --- |
| `melis_sb_page_versioning` | Archived copies of published pages (`page_v_version_number`, `page_v_version_name`, `page_content`, `page_edit_date`, …). |
| `melis_sb_workflow` | Workflow records per page. |
| `melis_sb_workflow_events` | Workflow events (ask / validate / refuse). |
| `melis_sb_page_comment` | Comments attached to a page. |
| `melis_sb_page_comment_type` | Comment types (`PAGE`, `WORKFLOW`). |
| `melis_sb_page_locked` | Active page locks (which user is editing which page). |
| `melis_core_user_role` | Named roles (`urole_id`, `urole_name`, `urole_creation_date`, `urole_rights`) — rights stored as XML, like a user's own rights record. |

## Example

Read and add a page comment via the public service:

```php
$commentService = $serviceManager->get('MelisSBPageCommentService');

// list comments on page 42
$comments = $commentService->getPageComments(42);

// add a PAGE-type comment (commentType 1 = PAGE, 2 = WORKFLOW)
$commentService->setPageComments(
    ['pcom_page_id' => 42, 'pcom_comment' => 'Looks good to publish.'],
    1
);
```

## Key files

| Concern | Path |
| --- | --- |
| Module bootstrap & listeners | `vendor/melisplatform/melis-small-business/src/Module.php` |
| Routing, services, controllers | `vendor/melisplatform/melis-small-business/config/module.config.php` |
| Tools (userrole, versioning) | `vendor/melisplatform/melis-small-business/config/app.tools.php` |
| Backoffice interface tree | `vendor/melisplatform/melis-small-business/config/app.interface.php` |
| Workflow email definitions | `vendor/melisplatform/melis-small-business/config/app.emails.php` |
| Page service (engine override) | `vendor/melisplatform/melis-small-business/src/Service/MelisSBPageService.php` |
| Comment service | `vendor/melisplatform/melis-small-business/src/Service/MelisSBPageCommentService.php` |
| Workflow / versioning / lock controllers | `vendor/melisplatform/melis-small-business/src/Controller/` |
| Dashboard plugin | `vendor/melisplatform/melis-small-business/src/Controller/DashboardPlugins/MelisSBWorkflowPlugin.php` |
| CMS-editor listeners | `vendor/melisplatform/melis-small-business/src/Listener/` |
| Install SQL | `vendor/melisplatform/melis-small-business/install/dbdeploy/126618_melis_sb_install.sql` |
