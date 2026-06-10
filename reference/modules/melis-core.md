# MelisCore

> The backoffice foundation every other module builds on: login, users/roles/rights, the menu &
> tool (DataTable) framework, dashboard, config, email, GDPR, and the base service + event system.
> Package `melisplatform/melis-core`.

## Purpose

`MelisCore` is the backoffice heart of Melis Platform. It provides the application shell (header,
left menu, tools tree, dashboard, footer), the `MelisCoreConfig` configuration tree that
aggregates every module's `app.*.php` files, authentication and per-tool rights, user management,
platform/environment handling, transactional emails, GDPR tooling, a micro-service auth endpoint,
and the shared service/event layer that every other module extends. Every `melisplatform/*` module
depends on it.

## Enable it

Add to `config/modules.config.php`:

```php
return [
    'MelisCore',
    // … other modules …
];
```

It must load early — most other modules call its services. Its companion infrastructure modules are
[MelisAssetManager](/reference/modules), [MelisDbDeploy](/reference/modules),
[MelisComposerDeploy](/reference/modules) and [MelisInstaller](/reference/modules).

## Key services

Registered as `service_manager` aliases in
`vendor/melisplatform/melis-core/config/module.config.php`:

| Service alias | Role |
| --- | --- |
| `MelisCoreConfig` | Runtime config tree. Reads any aggregated `app.*` config by path: `getItem('/meliscore/interface/…')`, `getItemPerPlatform('/meliscore/datas/')`, `getFormMergedAndOrdered(…)`, `setFormFieldRequired(…)`. |
| `MelisCoreAuth` | Backoffice authentication (extends Laminas auth). `hasIdentity()`, `getIdentity()` (the `melis_core_user` row), `getAuthRights()` (rights XML), `encryptPassword()`, `isPasswordCorrect()`. |
| `MelisCoreRights` | Per-tool access control. `canAccess($melisKey)`, `isAccessible($xmlRights, $sectionId, $itemId)`, `getRightsValues($id, $isRole)`, `createXmlRightsValues(…)`, `getToolSectionMap()`. |
| `MelisCoreTool` | Backoffice tool helper for controllers. `setMelisToolKey($plugin, $toolKey)`, `getColumns()`, `getForm($formKey)`, `getDataTableConfiguration(…)`, `getSearchableColumns()`. |
| `MelisCoreDispatch` | Chains controller dispatches, accumulating `[success, errors, datas]` for multi-step saves. |
| `MelisCoreTranslation` | Loads and merges `tr_*` interface/form translations per locale. |
| `MelisCoreBOEmailService` | Backoffice email templates: `sendBoEmailByCode($code, $tags, $toEmail, $toName, $langId)`, `getBoEmailByCode()`, `saveBoEmailByCode()`, `deleteEmail()`. |
| `MelisCoreEmailSendingService` | Low-level email sender: `sendEmail($fromEmail, $fromName, $toEmail, $toName, $replyTo, $subject, $htmlBody, $textBody, $transportConfig)`. |
| `MelisCoreGdprService` | GDPR subject access/erasure (broadcasts events): `getUserInfo()`, `extractSelected()`, `deleteSelected()`. |
| `MelisCoreGdprAutoDeleteService` | Scheduled data-retention engine: `run()`, `getFirstAlertUsers()`, `getSecondAlertUsers()`, `getSmtpConfigData()`. |
| `MelisGeneralService` | Base class most platform services extend — provides `makeArrayFromParameters()`, `sendEvent()`, `getServiceManager()`. |

## Backoffice

`MelisCore` delivers the entire backoffice shell and the *System Configuration* section of the
tools tree, plus:

| Tool (melisKey prefix) | Purpose |
| --- | --- |
| Users (`meliscore_tool_user`) | Create and edit backoffice users; assign roles and per-tool rights; view login history; generate API keys. |
| Platforms | Declare environments (dev / staging / production) and set per-platform colour scheme. |
| Languages | Manage backoffice locales. |
| Emails management | Create/edit transactional email templates with per-language body and `[TAG]` placeholders. |
| Logs | Searchable action log, filterable by type, user and date. |
| Other config | Password/security policy: expiry, lock threshold, password history. |
| GDPR | Search a person, view held data, anonymise, configure SMTP for GDPR notifications; separate cron-driven auto-delete engine. |
| Modules / Marketplace | Install, update or remove modules and manage the production asset bundle. |
| Announcements | Create backoffice announcements shown on the dashboard. |

### Interface tree (app.interface.php) — the backoffice backbone

The entire backoffice — every tool, tab, modal, menu entry — is described as a single nested tree
of **interface nodes**, deep-merged from every module's `config/app.interface.php`. Each node has:

- **`conf`** — `melisKey` (unique, module-prefixed), DOM `id`, translation `name`, `icon`,
  `rightsDisplay`.
- **`forward`** — the controller action that renders the zone (`module`, `controller`, `action`,
  optional `jscallback`).
- **`interface`** — child nodes (recursive).

`melisKey` is the stable identifier used for rights checks, zone reloads and DOM addressing.
Rights are stored as an XML tree in `melis_core_user.usr_rights`; anything not granted is hidden.

Top-level shell branches: `meliscore_header`, `meliscore_leftmenu`, `meliscore_center`,
`meliscore_footer`, and `meliscore_toolstree_section` (the grouped tools tree).

### Tool (DataTable) framework (app.tools.php)

Every list tool is declared in a module's `config/app.tools.php` and rendered through
`MelisCoreTool` + the `MelisDataTable` view helper. The declaration covers columns, filters,
searchable fields, action buttons, modals and forms.

### Event system

`MelisGeneralService` fires `*_start` / `*_end` events around each service method, enabling any
module to intercept. Hook via the shared event manager:

```php
$sm->get('SharedEventManager')->attach(
    'MelisCore',
    'meliscore_tooluser_savenew_end',
    function ($e) { $p = $e->getParams(); /* react */ },
    100
);
```

Common core events: `meliscore_tooluser_savenew_start/end`, `…delete_start/end`, `…save_start/end`,
`melis_core_check_user_rights`, `meliscore_install_create_new_user`, `melis_core_new_platform`, and
the GDPR events (`melis_core_gdpr_user_info_event`, `…_extract_event`, `…_delete_event`,
`melis_core_gdpr_auto_delete*`).

### JS helpers

Available globally as `melisHelper` (`public/js/core/melisHelper.js`):

`zoneReload(melisKey, params)`, `createModal(zoneId, modalKey, …)`,
`melisOkNotification(title, msg)` / `melisKoNotification(…)`,
`tabOpen()` / `tabClose()` / `tabSwitch()`,
`loadingZone(sel)` / `removeLoadingZone(sel)`,
`melisTinyMCE.createTinyMCE('tool', sel, {})`.

## Database tables

| Table | Holds |
| --- | --- |
| `melis_core_user` | Backoffice users (login, password hash, `usr_rights` XML, admin flag, lang, role). |
| `melis_core_user_role` | Roles and their `urole_rights` XML. |
| `melis_core_user_connection_date` | Login history. |
| `melis_core_lang` | Backoffice languages. |
| `melis_core_platform` | Environments/platforms. |
| `melis_core_bo_emails` / `_details` | Transactional email templates and per-language bodies. |
| `melis_core_log` / `_log_type` / `_log_type_trans` | Action log, types and translations. |
| `melis_core_lost_password` | Password reset tokens. |
| `melis_core_user_connection_date` | Per-user login history. |
| `melis_core_microservice_auth` | API keys for micro-service endpoints. |
| `melis_core_dashboards` / `_dashboard_schema` | Per-user dashboard layout. |
| `melis_core_plugins` | Registered plugins. |
| `melis_core_gdpr_delete_config` / `_delete_emails_logs` | GDPR auto-delete rules and audit trail. |
| `melis_user_password_history` | Password history (reuse prevention). |
| `melis_announcement` | Backoffice announcements. |

## Example

Send a backoffice email using the template system, check a right, and call a service method with
the event pattern:

```php
// Send a templated email (B7)
$boEmail = $sm->get('MelisCoreBOEmailService');
$boEmail->sendBoEmailByCode(
    'MYMODULE_WELCOME',
    ['USER_NAME' => 'John', 'SITE_NAME' => 'Acme'],
    'john@doe.com',
    'John Doe',
    $langId
);

// Check a right before acting (B0f)
$rights = $sm->get('MelisCoreRights');
if (! $rights->canAccess('melismymodule_tool')) {
    // not allowed
}

// Read a per-platform config value (B0i)
$config  = $sm->get('MelisCoreConfig');
$merged  = $config->getItemPerPlatform('/meliscore/datas/');
```

## Key files

| Concern | Path |
| --- | --- |
| Module bootstrap | `vendor/melisplatform/melis-core/src/Module.php` |
| Routes, services, controllers, view helpers | `vendor/melisplatform/melis-core/config/module.config.php` |
| Backoffice shell & tools tree (interface) | `vendor/melisplatform/melis-core/config/app.interface.php` |
| DataTable tool declarations | `vendor/melisplatform/melis-core/config/app.tools.php` |
| Micro-service endpoints | `vendor/melisplatform/melis-core/config/app.microservice.php` |
| Services | `vendor/melisplatform/melis-core/src/Service/` |
| Controllers | `vendor/melisplatform/melis-core/src/Controller/` |
| Table gateways | `vendor/melisplatform/melis-core/src/Model/Tables/` |
| Listeners | `vendor/melisplatform/melis-core/src/Listener/` |
| Install SQL & migrations | `vendor/melisplatform/melis-core/install/` |
| Translations | `vendor/melisplatform/melis-core/language/` |

See also: [Module reference](/reference/modules), [Create a tool](/guide/create-a-tool),
[Plugins](/guide/plugins)
