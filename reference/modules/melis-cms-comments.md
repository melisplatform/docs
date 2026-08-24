# MelisCmsComments

> Comment system for News and Blog posts — moderation, an optional per-post approval workflow, a front-office "Post comments" plugin, and a dashboard widget. In v6 the moderation UI is a **Comments** tab in the React News/Blog editor. Package `melisplatform/melis-cms-comments`.

## Purpose

MelisCmsComments attaches a comment system to **MelisCmsNews** and **MelisCmsBlog** posts. It ships
the comments backend (`melis_cms_comments` table + `MelisCmsCommentsService`), a front-office
templating plugin (comment list + "leave a comment" form), a per-post **validation** workflow that
holds front-office comments pending until an admin approves them, and a **Latest comments** dashboard
widget. Combined with **MelisCmsUserAccount**, comments can require a logged-in site account.

In the React back-office (`/melis-react`) this module ships **no brick of its own** — no `ui-react/`,
no `react-api.php`, no `react.capabilities.php`. It is a **backend + contribution** module with three
host-owned surfaces:

1. a **Comments moderation tab** inside the News/Blog editor — the React tab UI and its `/comments…`
   endpoints are **owned by the News and Blog bricks**, which delegate to this module's service;
2. a **"Post comments" front page-plugin** dropped and configured in the React CMS page editor;
3. a **"Latest comments" dashboard widget** — a **legacy PHP/phtml** dashboard plugin rendered inside
   the React dashboard's widget host (no React rewrite).

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisCmsComments',
];
```

Composer dependencies: `melis-core ^6.0` and `melis-cms ^6.0`. Functionally requires at least one post
module — **MelisCmsNews** or **MelisCmsBlog** — to be useful. **MelisCmsUserAccount** is an optional
integration for account-gated comments. All surfaces are activation-gated: when the module is absent,
the News/Blog comment endpoints return **404** and the moderation panel hides itself.

## Key services

| Service alias | Role |
| --- | --- |
| `MelisCmsCommentsService` | Main CRUD/moderation service (extends `MelisEngineGeneralService`). Fires `*_start`/`*_end` event pairs on every method. Called by the News/Blog react-api controllers. |

Key methods on `MelisCmsCommentsService`:

```php
$svc = $sm->get('MelisCmsCommentsService');

// Create or update a comment (BO comments are approved immediately)
$id = $svc->saveComment($text, $postId, $commentId, 'NEWS', $name, $authorId, 'front');

// Fetch a single comment
$comment = $svc->getCommentById($id);

// Front-office list for a post (ordered)
$list = $svc->getCommentsByPostId($postId, 'BLOG', 'mccom_date_creation', 'DESC');

// Back-office query — omit 'validated' to return pending + approved + refused
$rows = $svc->getComments([
    'postType'     => 'NEWS',
    'postId'       => $postId,
    'withUserInfo' => true,
    'limit'        => 10,
]);

// Moderation
$svc->approveComment($id);          // mccom_validated=1, status=1 (shown)
$svc->refuseComment($id);           // mccom_validated=2, status=0 (hidden)
$svc->deleteCommentById($id);

// Cascade-delete when a post is removed
$svc->deletePostComments('NEWS', $postId);
```

`saveComment()` reads the post's `c{type}_validate_comments` flag: when enabled and the comment comes
from the front office, it is stored as pending (`validated=0`); back-office comments are stored as
approved immediately. All saved text is run through **HTMLPurifier 4.12** for XSS sanitisation.

## Comments moderation tab (React, owned by News/Blog)

Open a News article or Blog post in the editor and switch to the **Comments** tab. It lists this
post's comments with a per-row **status dot** (blue = pending, green = shown, red = refused), the
author, the comment text and the time, an inline **Name + write-a-comment + Add a comment** box to
post one directly, and per-row **approve / refuse / delete** actions (approve/refuse appear only when
the post has validation on).

![The React News editor's Comments tab: a COMMENTS panel with an inline Name field, a "Write a comment…" box and a red + Add a comment button, then a comment row with a status dot, the comment text and refuse/delete icon actions](/screenshots/react/melis-cms-comments/meliscmscomments-tooloverride-news-edit-tab-comments.png)

The React tab component belongs to the **News/Blog bricks**, not to this module. There is **no
`react-api.php` in MelisCmsComments** — the comments are exposed through the News and Blog modules'
own react-api, which delegates every operation to `MelisCmsCommentsService`:

| Method & URL | Owner controller / action | Purpose |
| --- | --- | --- |
| `GET /melis/react-api/news/:id/comments` | `MelisCmsNewsReactApiController::commentsAction` | All comments (all statuses) of a news article |
| `POST /melis/react-api/news/comments/save` | `commentSaveAction` | Create/edit a comment (BO → approved) |
| `POST /melis/react-api/news/comments/approve/:cid` | `commentApproveAction` | Approve (`mccom_validated=1`, status=1) |
| `POST /melis/react-api/news/comments/refuse/:cid` | `commentRefuseAction` | Refuse (`mccom_validated=2`, status=0) |
| `POST /melis/react-api/news/comments/delete/:cid` | `commentDeleteAction` | Delete the comment |
| `GET /melis/react-api/blog/:id/comments` | `MelisCmsBlog…ReactApiController::commentsAction` | All comments of a blog post |
| `POST /melis/react-api/blog/comments/{save,approve,refuse,delete}[/:cid]` | Blog comment actions | Same operations for Blog |

The `commentsAction` builds a `getComments(['postId' => …, 'postType' => 'NEWS'])` query with no
`validated` key, so it returns **pending + approved + refused** comments. Every action returns **404
when the module is not available**; the contract is `{ success, data|error }`.

```ts
// list a post's comments (all statuses)
const res = await fetch(`/melis/react-api/news/${idNews}/comments`, {
  credentials: 'include',
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
}).then(r => r.json());          // → { success: true, data: [ { …comment… } ] }

// approve one
await fetch(`/melis/react-api/news/comments/approve/${commentId}`, {
  method: 'POST', credentials: 'include',
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
});
```

The legacy `MelisCmsCommentsTabController` (getComments / save / approve / refuse / delete, guarded by
`hasAccess('meliscms_page')`) is still used by the classic/iframe path — see the
[legacy doc](/legacy/reference/modules/melis-cms-comments).

## "Post comments" front page-plugin

`Controller\Plugin\MelisCmsCommentsPlugin` is a `MelisTemplatingPlugin` (config key `meliscmscomments`,
section **MelisCms**, config in `config/plugins/MelisCmsCommentsPlugin.config.php`). In the React CMS
page editor's **PLUGINS** panel, under **Melis Cms Comments**, drag **Post comments** into a drop zone
on a News/Blog page template.

![The CMS page editor with the PLUGINS panel: the Melis Cms Comments group expanded to show the Post comments plugin dragged into a DRAG & DROP ZONE; the rendered front form shows a Name field, an "Add a comment:" box and a red Submit button](/screenshots/react/melis-cms-comments/meliscmscomments-page-plugin-postcomments-menu-selector.png)

- **Settings modal** picks the **Template** (default `MelisCmsComments/comments`) and the **Post Type**
  (NEWS / BLOG), persisted into the page's plugin XML as `template_path`, `mccplugin_post_type`, and
  `registration_page_page_id` (for account-gated comments via MelisCmsUserAccount).

![The Post comments plugin Settings modal: a Template select (MelisCmsComments/comments) and a Post Type select (News / Blog), with Cancel / Apply buttons; these settings are persisted into the page's plugin XML](/screenshots/react/melis-cms-comments/meliscmscomments-page-plugin-postcomments-config-settings.png)

- **Front render** (`front()`) resolves the post from the `newsId` / `blogId` query parameter, loads
  comments via `getCommentsByPostId()`, and builds the add-comment form (Name + comment + Submit).
  When the post requires an account it triggers `melis_cms_user_account_login_form` to embed a login
  plugin.
- Default view `MelisCmsComments/comments`; assets `plugins/css/commentsPlugin.css`,
  `plugins/js/commentsPlugin.js`.

## "Latest comments" dashboard widget (legacy)

`Controller\DashboardPlugins\MelisCmsCommentsLatestCommentsPlugin` extends
`MelisCoreDashboardTemplatingPlugin`; its `latestCommentsAction()` returns a Laminas `ViewModel`
(template `melis-cms-comments/dashboard/latest-comments`, a `.phtml`), registered in
`config/dashboard-plugins/dashboard.config.php` (plugin id `MelisCmsCommentsLatest`). The React
dashboard's **widget host** renders this legacy plugin as-is — **there is no React rewrite**. It lists
the most recent comments per post type (Blog / News tabs) with **All sites / All users / limit**
filters, and per comment shows the author, a status badge, the post title and the date. The site/user
filters and zone reload are served by `MelisCmsCommentsViewHelperController::listAction`
(`melis-cms-comments/dashboard/list`, zone `dashboard_latest_comments_list`).

![The React Dashboard Latest comments widget: a "Blog comments" tab with All sites, All users and limit selectors, then a list of recent comments (author + user id badge + green "shown" eye badge, the post title in brackets, the comment text, and "on: date")](/screenshots/react/melis-cms-comments/meliscmscomments-dashboardplugins-latestcomments.png)

## Database tables

| Table | Holds |
| --- | --- |
| `melis_cms_comments` | All comments: `mccom_id`, `mccom_post_id`, `mccom_type` (NEWS/BLOG), `mccom_comment_text`, `mccom_name`, `mccom_validated`, `mccom_status`, `mccom_date_creation`, `mccom_author_account`. |

Two columns are auto-added to the post modules' tables at bootstrap (no schema change required there):

| Column | Table | Purpose |
| --- | --- | --- |
| `cnews_validate_comments` | `melis_cms_news` | Per-post "Validate comments" flag for News. |
| `cblog_validate_comments` | `melis_cms_blog` | Per-post "Validate comments" flag for Blog. |

**Status model.** `mccom_validated`: `0` = new/pending (blue), `1` = approved/shown (green),
`2` = refused/hidden (red). `mccom_status` mirrors site visibility (`1` shown / `0` hidden).

## Listeners & cross-module wiring

Attached in `Module.php` on bootstrap:

| Listener | Event | Purpose |
| --- | --- | --- |
| `MelisCmsCommentsFlashMessengerListener` | `melis_cms_comments_flash_messenger` | Flash-messenger feedback and activity log (`CMS_COMMENT_ADD / UPDATE / DELETE`). |
| `MelisCmsCommentsSaveValidateCommentListener` | `meliscmsnews_get_postvalues` | Persists `cnews_validate_comments` when a news post is saved. |
| `MelisCmsCommentsGdprAutoDeleteActionDeleteListener` | `melis_cms_user_account_gdpr_auto_delete_action_delete` | GDPR: nulls `mccom_author_account` for a deleted account, then re-fires the module's GDPR event. |

`Module::addValidateCommentsField()` (back-office bootstrap) checks which post modules are active and
adds the `c{news,blog}_validate_comments` column to their tables if missing.

## Key files

| Concern | Path |
| --- | --- |
| Module config (services, controllers, plugins) | `vendor/melisplatform/melis-cms-comments/config/module.config.php` |
| Front plugin config | `vendor/melisplatform/melis-cms-comments/config/plugins/MelisCmsCommentsPlugin.config.php` |
| Dashboard plugin config | `vendor/melisplatform/melis-cms-comments/config/dashboard-plugins/dashboard.config.php` |
| Main service | `vendor/melisplatform/melis-cms-comments/src/Service/MelisCmsCommentsService.php` |
| Legacy tab controller | `vendor/melisplatform/melis-cms-comments/src/Controller/MelisCmsCommentsTabController.php` |
| Front templating plugin | `vendor/melisplatform/melis-cms-comments/src/Controller/Plugin/MelisCmsCommentsPlugin.php` |
| Dashboard widget | `vendor/melisplatform/melis-cms-comments/src/Controller/DashboardPlugins/MelisCmsCommentsLatestCommentsPlugin.php` |
| Listeners | `vendor/melisplatform/melis-cms-comments/src/Listener/` |
| DB model / table gateway | `vendor/melisplatform/melis-cms-comments/src/Model/Tables/MelisCmsCommentsTable.php` |
| Bootstrap / column injection | `vendor/melisplatform/melis-cms-comments/src/Module.php` |
| HTMLPurifier (bundled) | `vendor/melisplatform/melis-cms-comments/library/htmlpurifier-4.12.0/` |

> The React Comments tab UI and its `/comments…` endpoints live in the News/Blog bricks
> (`MelisCmsNewsReactApiController`, `MelisCmsBlog…ReactApiController`); both delegate to
> `MelisCmsCommentsService`. Data model, service and the classic tool:
> [legacy doc](/legacy/reference/modules/melis-cms-comments).

See also: [MelisCmsNews](/reference/modules/melis-cms-news) · [MelisCmsBlog](/reference/modules/melis-cms-blog) · [MelisCms](/reference/modules/melis-cms) · [MelisEngine](/reference/modules/melis-engine) · [MelisCore](/reference/modules/melis-core)
