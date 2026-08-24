# MelisCmsUserAccount

> Front-office site-visitor account system — registration, login and per-site profiles for website members.
> Package `melisplatform/melis-cms-user-account`.

## Purpose

MelisCmsUserAccount manages **site visitor** (front-office) accounts — the people who register and log
in on your CMS sites. These are distinct from back-office staff accounts managed by MelisCore. Accounts
are scoped **per-site** (one person can hold accounts on multiple sites). The module ships two droppable
page plugins (login form and registration form), a back-office administration tool, and a full GDPR
pipeline covering data-info, data-export, anonymized deletion, and an automatic inactive-account
purge workflow. At bootstrap it also adds foreign-key columns to the blog/news/comments tables so a
single GDPR pass can surface, export, or erase everything a user owns across those modules.

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisCmsUserAccount',
];
```

Composer dependencies: `melisplatform/melis-core ^5.2` (GDPR framework, sessions, BO tools) and
`melisplatform/melis-cms ^5.2` (page/plugin host). `melis-engine` and `melis-front` are pulled in
transitively for front-office rendering.

## Key services

| Service alias | Role |
| --- | --- |
| `MelisCmsUserAccountService` | Main service — also aliased **`FrontUserAccountService`**. CRUD for site users plus authentication. |
| `MelisCmsUserAccountGdprAutoDeleteService` | Inactive-account auto-delete pipeline logic (warnings + anonymization). |
| `FrontUserAccountTable` | Table gateway for `melis_cms_user_account`. |
| `MelisCmsUserSitesTable` | Table gateway for `melis_cms_user_account_sites`. |
| `MelisPasswordValidator` | Password-policy validator applied on registration and profile save. |

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

## Backoffice

The **Users FO** tool is accessible under **MelisCms → Users FO** (menu key
`melis_cms_user_account_tool_display`, icon `fa-user`). It provides a searchable, filterable list of
all site users across sites.

Columns: **Id · Status · Admin · Picture · Email · Login · Full Name · Creation date · Action**.  
Filters: Show (page size) · Site · Admin · Search — plus a **+ New user** button.

Each row exposes three actions:

| Action | Description |
| --- | --- |
| View sites | Modal showing, per site, the associated module, registration date, last-logged-in time and site domains. |
| Edit | Opens the **User** tab with all profile fields (Status, Admin, Email, Language, Firstname, Lastname, Birthday, Picture, Sites). `ID` and `Login` are read-only. Password fields are optional — leave blank to keep the current password. |
| Delete | Removes the user. |

**Controller:** `MelisCmsUserAccountToolController`.

## Front office

Two templating plugins are registered under `config/plugins/`:

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
| `MelisCmsUserAccountFlashMessengerListener` | `meliscms_user_account_tooluser_save`, `meliscms_user_account_tooluser_delete` | BO flash messages on save/delete. |

## Key files

| Concern | Path |
| --- | --- |
| BO menu entry | `vendor/melisplatform/melis-cms-user-account/config/app.interface.php` |
| BO datatable (columns, filters, modals) | `vendor/melisplatform/melis-cms-user-account/config/app.tools.php` |
| All forms (FO + BO) | `vendor/melisplatform/melis-cms-user-account/config/app.forms.php` |
| GDPR field mappings + retention thresholds | `vendor/melisplatform/melis-cms-user-account/config/app.gdpr.php` |
| Comments integration points | `vendor/melisplatform/melis-cms-user-account/config/comments.php` |
| REST-style microservice endpoints | `vendor/melisplatform/melis-cms-user-account/config/app.microservice.php` |
| Routes, service aliases, plugins, validators | `vendor/melisplatform/melis-cms-user-account/config/module.config.php` |
| Login plugin config | `vendor/melisplatform/melis-cms-user-account/config/plugins/MelisCmsUserAccountLoginPlugin.config.php` |
| Register plugin config | `vendor/melisplatform/melis-cms-user-account/config/plugins/MelisCmsUserAccountUserRegisterPlugin.config.php` |
| BO tool controller | `vendor/melisplatform/melis-cms-user-account/src/Controller/MelisCmsUserAccountToolController.php` |
| FO plugin controller | `vendor/melisplatform/melis-cms-user-account/src/Controller/MelisCmsUserAccountPluginController.php` |
| Main service | `vendor/melisplatform/melis-cms-user-account/src/Service/MelisCmsUserAccountService.php` |
| Auto-delete service | `vendor/melisplatform/melis-cms-user-account/src/Service/MelisCmsUserAccountGdprAutoDeleteService.php` |
| Password validator | `vendor/melisplatform/melis-cms-user-account/src/Validator/MelisPasswordValidator.php` |
| DB table gateways | `vendor/melisplatform/melis-cms-user-account/src/Model/Tables/` |
| Listeners | `vendor/melisplatform/melis-cms-user-account/src/Listener/` |
| Bootstrap / column injection | `vendor/melisplatform/melis-cms-user-account/src/Module.php` |

See also: [MelisCore](/legacy/reference/modules/melis-core) · [MelisCms](/legacy/reference/modules/melis-cms) · [MelisCmsComments](/legacy/reference/modules/melis-cms-comments) · [MelisCmsBlog](/legacy/reference/modules/melis-cms-blog) · [MelisCmsNews](/legacy/reference/modules/melis-cms-news)
