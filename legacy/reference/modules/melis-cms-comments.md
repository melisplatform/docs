# MelisCmsComments

> Comment system for News and Blog posts, with moderation, optional approval workflow, and a dashboard widget.
> Package `melisplatform/melis-cms-comments`.

## Purpose

MelisCmsComments attaches a comment system to **MelisCmsNews** and **MelisCmsBlog** posts. It ships
a front-office templating plugin (comment list + "leave a comment" form), a **Comments** moderation
tab inside the News/Blog post editor (create, edit, delete, approve, refuse), and an optional
per-post **validation** workflow where front-office comments are held pending until an admin approves
them. A **Latest Comments** dashboard widget and GDPR auto-delete support are also included.
Combined with **MelisCmsUserAccount**, comments can require a logged-in site account.

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisCmsComments',
];
```

Composer dependencies: `melis-core` and `melis-cms` (`^5.2`), PHP `^8.1|^8.3`. Functionally
requires at least one post module — **MelisCmsNews** or **MelisCmsBlog** — to be useful.
**MelisCmsUserAccount** is an optional integration for account-gated comments.

## Key services

| Service alias | Role |
| --- | --- |
| `MelisCmsCommentsService` | Main CRUD/moderation service (extends `MelisEngineGeneralService`). Fires `*_start`/`*_end` event pairs on every method. |

Key methods on `MelisCmsCommentsService`:

```php
$svc = $sm->get('MelisCmsCommentsService');

// Create or update a comment
$id = $svc->saveComment($text, $postId, $commentId, 'NEWS', $name, $authorId, 'front');

// Fetch a single comment
$comment = $svc->getCommentById($id);

// Front-office list for a post (ordered)
$list = $svc->getCommentsByPostId($postId, 'BLOG', 'mccom_date_creation', 'DESC');

// Back-office table query (with optional user info)
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

`saveComment()` reads the post's `c{type}_validate_comments` flag: when enabled and the comment
originates from the front office, it is stored as pending (`validated=0`); back-office comments are
stored as approved immediately.

## Backoffice

### Comments moderation tab

`MelisCmsCommentsTabController` renders the **Comments** tab injected into the News/Blog post
editor. It maps the calling module to its post type via `setPostType()` / `setService()`.

| Action | Role |
| --- | --- |
| `commentsTable` | Renders the tab container. |
| `getComments` | AJAX JSON feed for the DataTable (`ajaxUrl: /melis/MelisCmsComments/MelisCmsCommentsTab/getComments`); builds status dots (blue/green/red), human-readable elapsed time, and author cell (triggers `melis_cms_user_account_add_user_picture` for avatars). |
| `commentsModalContent` | Add / edit comment form. |
| `saveComment` | Persists a comment; runs the text through **HTMLPurifier 4.12** before saving (XSS protection). |
| `deleteComment` | Deletes a comment. |
| `approveComment` | Sets `mccom_validated=1`, `status=1`. |
| `refuseComment` | Sets `mccom_validated=2`, `status=0`. |
| `commentsValidateComments` | Toggles the per-post "Validate comments" switch (stored in `cnews_validate_comments` / `cblog_validate_comments`). |

The DataTable tool is registered as `meliscmscomments_tool` in `config/app.tools.php` with columns
**status / author / comment** and action buttons **validate-refuse / edit / delete**. The
validate/refuse buttons are injected at runtime (`setCommentValidationBtns`) and only appear for
posts that have validation enabled.

Save and delete actions fire `melis_cms_comments_flash_messenger` (log type codes
`CMS_COMMENT_ADD / UPDATE / DELETE`), consumed by `MelisCmsCommentsFlashMessengerListener`.

### Dashboard widget

`MelisCmsCommentsLatestCommentsPlugin` (registered as a controller plugin; config in
`config/dashboard-plugins/dashboard.config.php`) renders the **Latest Comments** widget. It lists
the most recent comments per site, with author, status badge, post title, and date. The
`dashboard_latest_comments_list` interface zone provides `zoneReload` support.

## Front office

`MelisCmsCommentsPlugin` is a `MelisTemplatingPlugin` (config key `meliscmscomments`, section
**MelisCms**, config in `config/plugins/MelisCmsCommentsPlugin.config.php`). Drop it onto a
News/Blog page template from the page editor's **PLUGINS** panel under **Melis Cms Comments**.

- `front()` resolves the post from the `newsId` / `blogId` query parameter, loads comments via
  `getCommentsByPostId()`, and builds the add-comment form. When the post requires an account it
  triggers `melis_cms_user_account_login_form` to embed a login plugin and tie comments to the
  account (`uac_firstname` / `uac_lastname`).
- **Settings modal** (`createOptionsForms`): a **Template** select and a **Post type** select
  (`NEWS` / `BLOG`). Persisted into the page's plugin XML as `template_path`,
  `mccplugin_post_type`, `registration_page_page_id`.
- Default view: `MelisCmsComments/comments` (`view/.../plugins/comments.phtml`).
- Assets: `plugins/css/commentsPlugin.css`, `plugins/js/commentsPlugin.js`.

## Database tables

| Table | Holds |
| --- | --- |
| `melis_cms_comments` | All comments: `mccom_id`, `mccom_post_id`, `mccom_type` (NEWS/BLOG), `mccom_comment_text`, `mccom_name`, `mccom_validated`, `mccom_status`, `mccom_date_creation`, `mccom_author_account`. |

Two columns are auto-added to the post modules' tables at bootstrap (no schema change required in
those modules):

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
| `MelisCmsCommentsFlashMessengerListener` | `melis_cms_comments_flash_messenger` | Flash-messenger feedback and activity log. |
| `MelisCmsCommentsSaveValidateCommentListener` | `meliscmsnews_get_postvalues` (MelisCmsNews) | Persists `cnews_validate_comments` when a news post is saved. |
| `MelisCmsCommentsGdprAutoDeleteActionDeleteListener` | `melis_cms_user_account_gdpr_auto_delete_action_delete` | GDPR: nulls `mccom_author_account` for a deleted account, then re-fires `melis_cms_comments_gdpr_auto_delete_action_delete`. |

`Module::addValidateCommentsField()` (back-office bootstrap) checks which post modules are active
and adds the `c{news,blog}_validate_comments` column to their tables if missing.

## Key files

| Concern | Path |
| --- | --- |
| Module config (services, controllers, plugins) | `vendor/melisplatform/melis-cms-comments/config/module.config.php` |
| Backoffice tool (DataTable) | `vendor/melisplatform/melis-cms-comments/config/app.tools.php` |
| Interface zones | `vendor/melisplatform/melis-cms-comments/config/app.interface.php` |
| Comment forms | `vendor/melisplatform/melis-cms-comments/config/app.forms.php` |
| Front plugin config | `vendor/melisplatform/melis-cms-comments/config/plugins/MelisCmsCommentsPlugin.config.php` |
| Dashboard plugin config | `vendor/melisplatform/melis-cms-comments/config/dashboard-plugins/dashboard.config.php` |
| Main service | `vendor/melisplatform/melis-cms-comments/src/Service/MelisCmsCommentsService.php` |
| Backoffice tab controller | `vendor/melisplatform/melis-cms-comments/src/Controller/MelisCmsCommentsTabController.php` |
| Front templating plugin | `vendor/melisplatform/melis-cms-comments/src/Controller/Plugin/MelisCmsCommentsPlugin.php` |
| Dashboard widget | `vendor/melisplatform/melis-cms-comments/src/Controller/DashboardPlugins/MelisCmsCommentsLatestCommentsPlugin.php` |
| Listeners | `vendor/melisplatform/melis-cms-comments/src/Listener/` |
| DB model / table gateway | `vendor/melisplatform/melis-cms-comments/src/Model/Tables/MelisCmsCommentsTable.php` |
| Bootstrap / column injection | `vendor/melisplatform/melis-cms-comments/src/Module.php` |
| Install delta | `vendor/melisplatform/melis-cms-comments/install/dbdeploy/16618_cms_comments_install.sql` |
| HTMLPurifier (bundled) | `vendor/melisplatform/melis-cms-comments/library/htmlpurifier-4.12.0/` |

See also: [MelisCmsNews](/legacy/reference/modules/melis-cms-news) · [MelisCms](/legacy/reference/modules/melis-cms) · [MelisEngine](/legacy/reference/modules/melis-engine) · [MelisCore](/legacy/reference/modules/melis-core)
