# MelisCmsUserAccount

> Front-office site-visitor account system — registration, login and per-site profiles for website members, administered from a native React back-office tool. Package `melisplatform/melis-cms-user-account`.

## Purpose

MelisCmsUserAccount manages **site visitor** (front-office) accounts — the people who register and log
in on your CMS sites. These are distinct from back-office staff accounts managed by MelisCore. Accounts
are scoped **per-site** (one person can hold accounts on multiple sites). The module ships two droppable
page plugins (login form and registration form), a back-office administration tool, and a full GDPR
pipeline covering data-info, data-export, anonymized deletion, and an automatic inactive-account
purge workflow. At bootstrap it also adds foreign-key columns to the blog/news/comments tables so a
single GDPR pass can surface, export, or erase everything a user owns across those modules.

In v6 the back-office administration tool (**Users FO**) is a **native full-React brick** — a real
React CRUD UI calling a JSON `react-api` layer — with a **New / Old** toggle that falls back to the
legacy tool in an iframe. The framework, services, tables, GDPR machinery and front-office plugins are
unchanged; only the administration UI moved to React.

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisCmsUserAccount',
];
```

Composer dependencies: `melisplatform/melis-core` (GDPR framework, sessions, BO tools) and
`melisplatform/melis-cms` (page/plugin host). `melis-engine` and `melis-front` are pulled in
transitively for front-office rendering. The React tool is discovered automatically once the module is
active (it ships a `brick.manifest.json`); removing the module from `melis.module.load.php` makes the
tool disappear from the React back-office.

## Key services

| Service alias | Role |
| --- | --- |
| `MelisCmsUserAccountService` | Main service — also aliased **`FrontUserAccountService`**. CRUD for site users plus authentication. |
| `MelisCmsUserAccountGdprAutoDeleteService` | Inactive-account auto-delete pipeline logic (warnings + anonymization). |
| `FrontUserAccountTable` | Table gateway for `melis_cms_user_account`. |
| `MelisCmsUserSitesTable` | Table gateway for `melis_cms_user_account_sites`. |
| `MelisPasswordValidator` | Password-policy validator (min 8 chars, one lowercase, one digit) applied on registration and profile save. |

Key methods on `MelisCmsUserAccountService` (aliased `FrontUserAccountService`):

```php
$svc = $sm->get('FrontUserAccountService');

// Authenticate a site visitor
$result = $svc->siteUserAuthenticate($login, $password, $siteId);

// Create a new account
$id = $svc->createUser($data);

// Fetch by various keys
$user = $svc->getUserById($id);
$user = $svc->getUserByLogin($login);
$user = $svc->getUserByEmailAndPassword($email, $password);

// Persist profile changes
$svc->saveUserAccountData($id, $data);

// Site memberships for a user
$sites = $svc->getUsersSitesByUserId($id);

// Record a login timestamp (used by the auto-delete pipeline)
$svc->updateUserConnectionDate($id);
```

Alternatively, fire the `site_user_account_authentication` event and let
`MelisCmsUserAccountSiteUserAuthenticationListener` call through to `siteUserAuthenticate()`; the
authenticated user is then stored in a `Laminas\Session\Container` keyed by site.

## Back-office (React) — Users FO

The **Users FO** tool lives in the React back-office (`/melis-react`) under the sidebar **MelisCms**
group → **Utilisateurs FO** ("FO Users"). It is a **native full-React brick** (not an iframe) mounted
at the tree route `/melis-cms/user-account`; the menu key `melis_cms_user_account_tool_display` gates
access, capabilities and the Old-view iframe. The tool administers **site users** only — never
back-office staff (those are the MelisCore **Users** tool).

It is a two-level drill-down surfaced through the host's **native sub-tabs** (`subTabs: true`): a flat
**list** of site users, and a single **User** form opened per sub-tab.

![React Users FO list — KPI cards (Total / Active / Inactive / Admins), search, status/admin/site filters, Reset filters, Columns manager, Export, the New / Old toggle and + New user; each row exposes View sites, Edit and Delete actions](/screenshots/react/melis-cms-user-account/meliscmsuseraccount-tool-usersfo-list.png)

**List (level 1)** — a searchable, sortable, filterable table of every front-office account on the
platform, with **KPI cards** (Total / Active / Inactive / Admins). Controls:

- **Search** (matches login, email, first name, last name)
- **Status** filter (All / Active / Inactive) and **Admin** filter (All / Admin / Non-admin)
- **Site** selector (All sites) and **Reset filters**
- **Columns** manager (hide / reorder columns by drag-and-drop)
- **Export** to Excel or CSV (runs client-side in the brick via SheetJS)
- **New / Old** toggle (top-right) and **+ New user** button

Columns: **Id · Status · Admin · Picture · Email · Login · Full Name · Creation date · Action** (the
Picture column is presentation-only; click any other header to sort). Each row exposes three actions:

| Action | Description |
| --- | --- |
| View sites (🔍) | Modal listing, per site the user belongs to, the registration date, last-logged-in time, whether the membership is **anonymized** (GDPR), and the site's domains. |
| Edit (✏️) | Opens the user in a sub-tab (see below). |
| Delete (🗑) | Removes the account (irreversible). |

**User form (level 2)** — opening a row or **+ New user** adds a sub-tab with a single **User** form:
**Login** (read-only when editing), **Email**, **First name**, **Last name**, **Birthday** (a
session-language calendar), **Language**, a read-only **Creation date**, a **Picture** panel
(preview + Choose an image / Remove picture), and **Password** / **Confirm password**. On the right,
the **Active** and **Administrator** toggles and the required **Sites** checkbox list. **Save** persists
the account.

![The React Edit-user form — Login (read-only when editing), Email, First/Last name, Birthday, Language, read-only Creation date, Picture panel, Password / Confirm password, plus the Active and Administrator toggles and the required Sites checkbox list](/screenshots/react/melis-cms-user-account/meliscmsuseraccount-tool-usersfo-edit-tab-user.png)

> Password fields carry the hint *"Leave empty to keep unchanged"* — editing a profile never forces a
> password change. When a password **is** typed it must satisfy `MelisPasswordValidator` (min 8 chars,
> one lowercase, one digit). **At least one site is required**; a site already **anonymized** (GDPR)
> for that user is silently dropped from the submission.

**New / Old toggle** — the whole tool switches between the React UI (**New**, default) and the classic
tool rendered in an iframe (**Old**, `/melis/react-tool-page?key=melis_cms_user_account_tool_display`).
The legacy BO tool is still served by **`MelisCmsUserAccountToolController`**, unchanged.

## React API endpoints

Routes live in `config/react-api.php`, served by controller
`MelisReactApiUserAccountController` (invokable alias
`MelisCmsUserAccount\Controller\MelisReactApiUserAccount`). All under `/melis/react-api/user-account`,
returning the `{ success, data, error }` contract.

| Method & URL | Purpose |
| --- | --- |
| `GET /user-account` | List users (keyset: `limit`, `search`, `siteId`, `admin`, `status`, `sort`, `dir`, `after`) → `{items,total,nextCursor}`; each item carries `hasPicture` |
| `GET /user-account/stats` | KPI `{total, active, inactive, admins}` |
| `GET /user-account/sites` | Platform site list (filter + form checkboxes) → `[{id,label}]` |
| `GET /user-account/langs` | Language list (form select) → `[{id,label}]` |
| `GET /user-account/:id` | One user (adds `siteIds[]` + `pictureDataUrl`) — for editing |
| `GET /user-account/:id/picture` | Row picture as `image/jpeg` (falls back to default avatar) |
| `GET /user-account/:id/sites` | "View sites" detail per site: label, registration/last-login dates, `anonymized`, domains |
| `POST /user-account/save` | Create / update the account |
| `DELETE /user-account/delete/:id` | Delete the account |

`list`/`stats` query `melis_cms_user_account` directly with parameterised SQL; `get`/`save`/`delete`/
`userSites` **delegate to the legacy services** (`FrontUserAccountTable`, `FrontUserAccountService`) —
the same services the legacy tool uses, so all business rules (unique login/email, password hash, site
links, GDPR anonymized-site guard) and activity-log events
(`meliscms_user_account_tooluser_save` / `_delete`) are preserved.

## Capabilities

Declared in `config/react.capabilities.php` under the rights node
`melis_cms_user_account_tool_display`. The tool is a flat CRUD, so the declaration is a flat list:

```php
return [
  'melisReactToolCapabilities' => [
    'melis_cms_user_account_tool_display' => ['list', 'create', 'edit', 'delete', 'export'],
  ],
];
```

Every API action first calls `denyUnlessAccess()` (auth +
`MelisCoreRights::canAccess('melis_cms_user_account_tool_display')` → 401/403), then a capability check:

| Capability | Enforced on |
| --- | --- |
| `list` | `list`, `stats`, `picture` |
| `edit` | `get`, `userSites`, and `save` when an `id` is present (update) |
| `create` | `save` when no `id` (create) |
| `delete` | `delete` |
| `export` | declarative only — export runs client-side in the brick |

## Front office

Two templating plugins are registered under `config/plugins/` (unchanged in v6 — served by the
front-office renderer, not the React tool):

| Plugin | Renders | Key options |
| --- | --- | --- |
| `MelisCmsUserAccountLoginPlugin` | Login form (and logout control when already authenticated). | `template_path`, `page_id_registration_page` |
| `MelisCmsUserAccountUserRegisterPlugin` | Registration form (username, email, password ×2, first/last name, picture, language). | `template_path`, `page_id_login_page`, `force_joint_accounts` |

`force_joint_accounts` on the register plugin re-uses an existing cross-site account; site membership
is stored in `melis_cms_user_account_sites`.

Both plugins are served by **`MelisCmsUserAccountPluginController`**:

| Action | Role |
| --- | --- |
| `authenticateUserAction()` | Authenticate `login`/`password`/`siteId` and open the session. |
| `logoutUserAction()` | Close the site-user session. |
| `createUserAction()` | Validate and create a user (includes picture upload). |
| `getRegistrationFormAction()` | Return the registration form (for login↔register switching). |
| `getTranslationsAction()` | Front-side translation strings. |

> There is no built-in forgot/reset-password or email-activation action in the plugin controller.
> Build those on top of `FrontUserAccountService` if needed.

## Database tables

| Table | PK | Holds |
| --- | --- | --- |
| `melis_cms_user_account` | `uac_id` | Site user: `uac_login`, `uac_email`, `uac_password`, `uac_firstname`, `uac_lastname`, `uac_picture`, `uac_status`, `uac_admin`, `uac_birthday`, `uac_lang_id`, `uac_date_creation`. |
| `melis_cms_user_account_sites` | `uacs_id` | User ↔ site junction: `uacs_uac_id`, site id, `uacs_anonymized` (per-site GDPR flag). |

`MelisCmsUserAccountAddCustomFieldsTableListener` (fired at bootstrap) adds `*_author_account` FK
columns to the blog/news/comments tables, creates `melis_cms_user_account_sites`, and migrates the
legacy `uac_site_id` column. The operation is idempotent (guards on column existence).

## GDPR

### Manual info / extract / delete (set 1+2)

Nine listeners answer three MelisCore events:

| Event | Account listener | Blog listener | Comments listener |
| --- | --- | --- | --- |
| `melis_core_gdpr_user_info_event` | `…GdprUserInfoListener` | `…BlogGdprUserInfoListener` | `…CommentsGdprUserInfoListener` |
| `melis_core_gdpr_user_extract_event` | `…GdprUserExtractListener` | `…BlogGdprUserExtractListener` | `…CommentsGdprUserExtractListener` |
| `melis_core_gdpr_user_delete_event` | `…GdprUserDeleteListener` | `…BlogGdprUserDeleteListener` | `…CommentsGdprUserDeleteListener` |

Blog and Comments listeners are active only when `MelisCmsBlog` / `MelisCmsComments` are installed.
Delete anonymizes the account row and sets `uacs_anonymized`. Field mappings and retention thresholds
live in `config/app.gdpr.php`.

### Automatic inactive-account pipeline (set 3)

Six listeners plug into MelisCore's auto-delete scheduler:

| Step | Listener | Event | Effect |
| --- | --- | --- | --- |
| 1. Register | `…GdprAutoDeleteModuleListListener` | `melis_core_gdpr_auto_delete_modules_list` | Declare the module to the scheduler. |
| 2. Tags | `…GdprAutoDeleteTagsListListener` | `MelisCoreGdprAutoDeleteService::TAGS_EVENT` | Register inactivity tags/categories. |
| 3. First warning | `…GdprAutoDeleteWarningListUsersListener` | `MelisCoreGdprAutoDeleteService::WARNING_EVENT` | Send first warning email to dormant users. |
| 4. Second warning | `…GdprAutoDeleteSecondWarningListUsersListener` | `MelisCoreGdprAutoDeleteService::SECOND_WARNING_EVENT` | Send second warning email to still-dormant users. |
| 5. Delete | `…GdprAutoDeleteActionDeleteUserListener` | `MelisCoreGdprAutoDeleteService::DELETE_ACTION_EVENT` | Anonymize accounts with no response. |
| (log) | `…GdprAutoDeleteGetEmailListener` | `melis_core_gdpr_auto_delete_log_get_user_email` | Resolve email for the audit log (skips already-anonymized). |

"Last activity" is tracked by `updateUserConnectionDate()`.

## Cross-module listeners

Registered in `Module.php` on bootstrap:

| Listener | Event | Purpose |
| --- | --- | --- |
| `MelisCmsUserAccountSiteUserAuthenticationListener` | `site_user_account_authentication` | FO auth entry point → `siteUserAuthenticate()`; stores user in a `Laminas\Session\Container` keyed by site. (priority `-1001`) |
| `MelisCmsUserAccountLoginFormListener` | `melis_cms_user_account_login_form` | Inject the logged-in member into the comment form (hidden `mccom_user_acct`/`mccom_site_id`, logout button, name from account); strip name/email fields for anonymous users. |
| `MelisCmsUserAccountCommentsFormModificationListener` | `meliscmsuseraccount_comments_form_modification_listener` | Reorder comment-form elements to a requested order. |
| `MelisCmsUserAccountAddAuthorPicture` | `melis_cms_user_account_add_user_picture` | Render the member's `uac_picture` beside their comment (base64 data URI). |
| `MelisCmsUserAccountSaveUserAccountListenter` | `meliscmsnews_get_postvalues` | Persist `cnews_author_account` / `cnews_comments_require_account` when saving news. |
| `MelisCmsUserAccountAddCustomFieldsTableListener` | `meliscms_user_account_add_custom_fields_table` | Bootstrap migration: add FK columns to blog/news/comments tables, create the sites junction table, migrate legacy data. |
| `MelisCmsUserAccountFlashMessengerListener` | `meliscms_user_account_tooluser_save`, `meliscms_user_account_tooluser_delete` | BO flash messages on save/delete (legacy tool). |

## Key files

| Concern | Path |
| --- | --- |
| React brick manifest | `vendor/melisplatform/melis-cms-user-account/public/ui-react/brick.manifest.json` |
| React API routes + invokable | `vendor/melisplatform/melis-cms-user-account/config/react-api.php` |
| React capabilities | `vendor/melisplatform/melis-cms-user-account/config/react.capabilities.php` |
| React API controller | `vendor/melisplatform/melis-cms-user-account/src/Controller/MelisReactApiUserAccountController.php` |
| Legacy BO tool controller (Old view) | `vendor/melisplatform/melis-cms-user-account/src/Controller/MelisCmsUserAccountToolController.php` |
| FO plugin controller | `vendor/melisplatform/melis-cms-user-account/src/Controller/MelisCmsUserAccountPluginController.php` |
| BO menu entry | `vendor/melisplatform/melis-cms-user-account/config/app.interface.php` |
| Legacy BO datatable (columns, filters, modals) | `vendor/melisplatform/melis-cms-user-account/config/app.tools.php` |
| All forms (FO + legacy BO) | `vendor/melisplatform/melis-cms-user-account/config/app.forms.php` |
| GDPR field mappings + retention thresholds | `vendor/melisplatform/melis-cms-user-account/config/app.gdpr.php` |
| Comments integration points | `vendor/melisplatform/melis-cms-user-account/config/comments.php` |
| Routes, service aliases, plugins, validators | `vendor/melisplatform/melis-cms-user-account/config/module.config.php` |
| Login plugin config | `vendor/melisplatform/melis-cms-user-account/config/plugins/MelisCmsUserAccountLoginPlugin.config.php` |
| Register plugin config | `vendor/melisplatform/melis-cms-user-account/config/plugins/MelisCmsUserAccountUserRegisterPlugin.config.php` |
| Main service | `vendor/melisplatform/melis-cms-user-account/src/Service/MelisCmsUserAccountService.php` |
| Auto-delete service | `vendor/melisplatform/melis-cms-user-account/src/Service/MelisCmsUserAccountGdprAutoDeleteService.php` |
| Password validator | `vendor/melisplatform/melis-cms-user-account/src/Validator/MelisPasswordValidator.php` |
| DB table gateways | `vendor/melisplatform/melis-cms-user-account/src/Model/Tables/` |
| Listeners | `vendor/melisplatform/melis-cms-user-account/src/Listener/` |
| Bootstrap / column injection | `vendor/melisplatform/melis-cms-user-account/src/Module.php` |

See also: [MelisCore](/reference/modules/melis-core) · [MelisCms](/reference/modules/melis-cms) · [MelisCmsComments](/reference/modules/melis-cms-comments) · [MelisCmsBlog](/reference/modules/melis-cms-blog) · [MelisCmsNews](/reference/modules/melis-cms-news)
