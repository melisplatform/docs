# MelisCore

> The platform core: backoffice shell, config tree, auth, rights, users, logs, events and the
> service layer every other module builds on. Package `melisplatform/melis-core`.

## Purpose

`MelisCore` is the foundation module of Melis Platform. It provides the backoffice application
shell, the `MelisCoreConfig` configuration tree that aggregates every module's `app.*.php` files,
authentication and per-tool rights, user management, the logging subsystem, the dashboard
(widgets), platform/environment handling, GDPR auto-delete, a micro-service auth endpoint, and the
shared service/view-helper layer that the rest of the modules consume. Almost every other
`melisplatform/*` module depends on it.

## Enable it

`MelisCore` is a standard Laminas module. It is loaded by the skeleton's
`config/melis.module.load.php`:

```php
return [
    'MelisCore',
    // … other modules …
];
```

It must load early — most modules call its services. Its own composer requirements pull in
[`melis-asset-manager`](/reference/modules), `melis-composerdeploy` and `melis-dbdeploy`, and it
auto-loads the Laminas components it needs (`Laminas\I18n`, `Laminas\Router`, `Laminas\Form`,
`Laminas\Db`, `Laminas\Cache`, …) via its `config/module.load.php`.

## Key services

Registered as `service_manager` aliases in
`vendor/melisplatform/melis-core/config/module.config.php`:

| Service alias | Role |
| --- | --- |
| `MelisCoreConfig` | The config tree. Reads any aggregated `app.*` config by path with `getItem('meliscore/datas/…')`; `getMelisKeys()` / `getMelisKeyData()` resolve `melisKey`s; `getItemPerPlatform()`, `getFormMergedAndOrdered()`. |
| `MelisCoreAuth` | Backoffice authentication. `getAuthRights()` returns the logged-in user's rights XML. |
| `MelisCoreRights` | Per-tool access control. `isAccessible($xmlRights, $sectionId, $itemId)`, `getRightsValues($userId)`, `createXmlRightsValues($userId, $datas)`. |
| `MelisCoreUser` | User helpers: `getUserXmlRights()`, `isItemRightChecked()`, `getUserConnectionData()`, `getUserLastLoggedInDate()`. |
| `MelisCoreDispatch` | Front/back plugin dispatch glue: `dispatchPluginAction($e, $nameContainer, $nameVarSession, $controller, $vars)`. |
| `MelisCoreTool` | The backoffice tool helper used by tool controllers (columns, forms, modals, DataTable config, CSV export). See [Create a tool](/guide/create-a-tool). |
| `MelisCoreLogService` | Activity log: `logAction()`, `saveLog()`, `getLogList()`, `getLogType()`, log-type translations. |
| `MelisCoreDashboardService` | Builds the backoffice dashboard from its registered plugins. |
| `MelisCoreTranslation` | Loads/merges module translations. |
| `MelisCoreFlashMessenger` | Cross-request flash messages. |
| `MelisCoreImage` | Image manipulation helper. |
| `MelisCoreLostPassword` / `MelisCoreCreatePassword` / `MelisPasswordSettingsService` | Lost-password flow, account creation links and password policy/history. |
| `MelisCoreEmailSendingService` / `MelisCoreBOEmailService` | Backoffice email templates and sending. |
| `ModulesService` (`MelisCoreModulesService`) | Lists/activates/deactivates platform modules. |
| `MelisCorePlatformSchemeService` | Platform (environment) scheme handling. |
| `MelisCoreGdprService` / `MelisCoreGdprAutoDeleteService` | GDPR data handling and scheduled auto-delete. |
| `MelisCorePluginsService` / `MelisCoreDashboardPluginsService` | Plugin and dashboard-plugin registration & rights. |
| `MelisCoreCacheSystemService` | Cache read/write helpers. |
| `MelisCoreAnnouncementService` | Backoffice announcements: `getLists()`, `saveAnnouncement()`, `deleteAnnouncement()`. |
| `MelisGeneralService` / `MelisCoreFormService` | General utilities and form building/merging. |

An abstract factory (`MelisCore\Factory\MelisAbstractFactory`) and per-table aliases
(`MelisCoreTableUser`, `MelisCoreTableLog`, …) are also registered.

## Backoffice

`MelisCore` injects the top **System** section of the backoffice tool tree
(`config/app.toolstree.php`, section `melisKey` `meliscore_toolstree_section`), including:

| Tool (melisKey) | Controller | Purpose |
| --- | --- | --- |
| `meliscore_tool_system_config` | `MelisCore\Controller\MelisCoreOtherConfig` | System configuration. |
| `meliscore_tool_user_module_management` | `MelisCore\Controller\Modules` | Activate/deactivate & reorder modules. |
| `meliscore_tool_platform` | `MelisCore\Controller\Platforms` | Declare platforms/environments (local, pre-prod, prod). |
| `meliscore_tool_emails_mngt` | `MelisCore\Controller\EmailsManagement` | Backoffice email template management. |
| `meliscore_tool_phpunit` | `MelisCore\Controller\MelisPhpUnitTool` | Run module test suites. |

User management is delivered through `MelisCore\Controller\User` / `ToolUser` (the Users tool),
and GDPR auto-delete through `MelisCore\Controller\MelisCoreGdprAutoDelete*`. The dashboard is
served by `MelisCore\Controller\Dashboard` / `DashboardPlugins`.

### Dashboard plugins

`MelisCore` ships the dashboard (backoffice widget) framework and several built-in widgets, each
with a config file under `config/dashboard-plugins/`:

`MelisCoreDashboardAnnouncementPlugin`, `MelisCoreDashboardBubbleNewsMelisPlugin`,
`MelisCoreDashboardBubbleUpdatesPlugin`, `MelisCoreDashboardBubbleNotificationsPlugin`,
`MelisCoreDashboardBubbleChatPlugin`, `MelisCoreDashboardRecentUserActivityPlugin`.

`MelisCoreDashboardTemplatingPlugin` is the base class every backoffice widget extends — see
[Plugins: templating & dashboard](/guide/plugins).

## Front office

`MelisCore` is a backoffice/platform module, but it registers shared **view helpers** (in
`config/module.config.php` under `view_helpers`) used across both offices:

| View helper | Role |
| --- | --- |
| `MelisGenericTable` | Renders a generic data table. |
| `MelisDataTable` | DataTables integration helper. |
| `MelisModal` / `MelisModalInvoker` | Backoffice modal rendering/invocation. |
| `MelisTextHelper` | Text formatting/escaping helper. |
| `MelisCoreHeadPlugin` | Head-scripts/styles aggregation for the shell. |
| `MelisDashboardDragDropZone` / `MelisCoreDashboardBubblePlugin` | Dashboard zone rendering. |
| `getMelisSectionIcons` | Resolves tool-tree section icons. |
| `MelisFieldCollection` / `MelisFieldRow` | Form rendering helpers. |

It also exposes a micro-service auth endpoint (routes `microservice` / `microservice_list`,
controller `MelisCore\Controller\MelisCoreMicroService`) backed by `melis_core_microservice_auth`.

## Database tables

Created by `install/sql/setup_structure.sql` and the deltas in `install/dbdeploy/`:

| Table | Holds |
| --- | --- |
| `melis_core_user` | Backoffice users. |
| `melis_core_user_role` | User roles / rights XML. |
| `melis_core_user_connection_date` | Login history. |
| `melis_core_user_password_history` | Password reuse history (policy). |
| `melis_core_lost_password` / `melis_core_create_password` | Password reset & account-creation tokens. |
| `melis_core_lang` | Backoffice languages. |
| `melis_core_log` / `melis_core_log_type` / `melis_core_log_type_trans` | Activity log + types & translations. |
| `melis_core_platform` / `melis_core_platform_scheme` | Platforms (environments) and their schemes. |
| `melis_core_dashboards` | Per-user dashboard layout. |
| `melis_plugins` | Registered plugins. |
| `melis_core_announcement` | Backoffice announcements. |
| `melis_core_bo_emails` / `melis_core_bo_emails_details` | Backoffice email templates. |
| `melis_core_microservice_auth` / `melis_core_microservice_logs` | Micro-service auth & call logs. |
| `melis_core_gdpr_delete_config` / `…_emails` / `…_emails_sent` / `…_emails_logs` / `…_emails_smtp` | GDPR auto-delete configuration & mail tracking. |

## Example

Read a config value, check a right and write a log entry from a controller:

```php
$config  = $this->getServiceManager()->get('MelisCoreConfig');
$rights  = $this->getServiceManager()->get('MelisCoreRights');
$auth    = $this->getServiceManager()->get('MelisCoreAuth');
$logs    = $this->getServiceManager()->get('MelisCoreLogService');

$xmlRights = $auth->getAuthRights();
if ($rights->isAccessible($xmlRights, 'meliscore_toolstree_section', 'meliscore_tool_platform')) {
    $logs->logAction(/* … */);
}
```

## Key files

| Concern | Path |
| --- | --- |
| Module bootstrap | `vendor/melisplatform/melis-core/src/Module.php` |
| Main config (services, controllers, view helpers, routes) | `vendor/melisplatform/melis-core/config/module.config.php` |
| Backoffice tool tree | `vendor/melisplatform/melis-core/config/app.toolstree.php` |
| Interface / forms / emails config | `vendor/melisplatform/melis-core/config/app.interface.php`, `app.forms.php`, `app.emails.php` |
| Dashboard plugin configs | `vendor/melisplatform/melis-core/config/dashboard-plugins/` |
| Laminas components to load | `vendor/melisplatform/melis-core/config/module.load.php` |
| Services | `vendor/melisplatform/melis-core/src/Service/` |
| Controllers | `vendor/melisplatform/melis-core/src/Controller/` |
| Dashboard plugins | `vendor/melisplatform/melis-core/src/Controller/DashboardPlugins/` |
| Table gateways | `vendor/melisplatform/melis-core/src/Model/Tables/` |
| View helpers | `vendor/melisplatform/melis-core/src/View/Helper/` |
| Install SQL & deltas | `vendor/melisplatform/melis-core/install/sql/`, `install/dbdeploy/` |
| Translations | `vendor/melisplatform/melis-core/language/` |

See also the [Module reference](/reference/modules), [Create a tool](/guide/create-a-tool) and
[Plugins](/guide/plugins).
