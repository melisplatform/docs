# MelisDashboardPluginCreator

> A GUI wizard that scaffolds a new backoffice **dashboard plugin** (widget) into a new or
> existing module. Package: `melisplatform/melis-dashboard-plugin-creator`.

## Purpose

MelisDashboardPluginCreator adds a step-by-step **tool** to the backoffice that generates a
ready-to-use dashboard widget — its controller, view, config, assets and translations — and wires
it into the target module. You choose a **single-tab** or **multi-tab** widget, a destination
(create a brand-new module or extend an existing one), per-language titles/descriptions, an icon
and a thumbnail; the tool then writes the files and (optionally) activates the plugin. The generated
widget extends `MelisCore\Controller\DashboardPlugins\MelisCoreDashboardTemplatingPlugin` and is
declared under the `melis_dashboardplugin` interface, so it appears on the backoffice dashboard.
It depends on `melis-core` and `melis-tool-creator` (the latter is reused to scaffold the new
module). For the concepts behind dashboard plugins, see [Plugins](/legacy/guide/plugins); for backoffice
tools in general, see [Create a tool](/legacy/guide/create-a-tool).

## Enable it

It is a standard Laminas module. Add it to `config/melis.module.load.php`:

```php
return [
    // …
    'MelisDashboardPluginCreator',
];
```

Install via Composer (`composer require melisplatform/melis-dashboard-plugin-creator`); `melis-core`
and `melis-tool-creator` are pulled in automatically. No database is required.

The tool writes files on disk, so the following must be **writable** by the web server (checked at
runtime in `renderToolContentAction()`): `config/melis.module.load.php`, the `module/` directory,
and the temp-thumbnail path `<DOCUMENT_ROOT>/dpc/temp-thumbnail/` (configured in
`config/app.tools.php` under `melisdashboardplugincreator/datas/plugin_thumbnail/path`).

## Key services

Registered in `config/module.config.php` and aliased:

| Service alias | Role |
| --- | --- |
| `MelisDashboardPluginCreatorService` | Generates the dashboard plugin from the data saved in the wizard session. |

`MelisDashboardPluginCreatorService` extends `MelisCore\Service\MelisGeneralService`. Notable
methods:

- `generateDashboardPlugin()` — the entry point: reads the session steps, resolves the target
  module/plugin name, then runs `performGeneration()`, rolling back on failure
  (`rollbackPluginGeneration()`). Fires `melisdashboard_plugin_creator_service_generate_dashboard_plugin_start/end` events.
- Internal generation steps: `generateDashboardPluginConfig()` (writes
  `config/dashboard-plugins/<Plugin>Plugin.config.php`), `generateDashboardPluginController()`,
  `generateDashboardPluginView()` (single- or multi-tab template), `generateDashboardPluginAssets()`
  (CSS/JS + copies the thumbnail), `setTranslations()` (per-language menu/title keys),
  `updateModuleConfig()` (injects `template_map` + `controller_plugins` entries) and
  `updateModuleFile()` (adds the config `include` to the module's `Module.php`).
- Helpers: `getModuleExistingPlugins()` / `getExistingTranslatedPluginTitle()` (duplicate-name
  checks), `getTempThumbnail()`, `generateFile()`, `generateModuleNameCase()`, `removeDir()`.

## Backoffice

The tool registers under **Tools › Designs** in the left menu via `config/app.toolstree.php`
(it nests under the core `meliscore_tool_tools` section, pointing at the
`melisdashboardplugincreator_tool` interface). Its UI is defined in `config/app.interface.php`
(melisKey `melisdashboardplugincreator_tool`, icon `fa fa-puzzle-piece`).

All actions are on `MelisDashboardPluginCreator\Controller\DashboardPluginCreatorController`
(controller key `MelisDashboardPluginCreator\Controller\DashboardPluginCreator`):

| melisKey / action | Role |
| --- | --- |
| `melisdashboardplugincreator_tool` → `render-tool` | Tool shell; initialises the wizard session and a fresh session id. |
| `melisdashboardplugincreator_header` → `render-tool-header` | Tool header. |
| `melisdashboardplugincreator_content` → `render-tool-content` | Tool body; checks file permissions and loads the step config. |
| `melisdashboardplugincreator_steps` → `render-dashboard-plugin-creator-steps` | Drives the 5-step wizard (`processStep1`…`processStep5`), validating and persisting each step to the session. |

The five wizard steps (from `config/app.tools.php`): **Plugin** (name, single/multi tab, tab count,
new/existing module), **Menu texts** (per-language title + description, thumbnail upload),
**Dashboard texts** (per-language title + icon, plus per-tab icons for multi-tab), **Summary**, and
**Finalization** (generate, optionally activate). Step forms live in `config/app.tools.php`; the
module-select dropdown is built by `MelisDashboardPluginCreatorModuleSelect` (form factory).
Additional AJAX endpoints: `process-upload`, `remove-plugin-thumbnail`, `remove-temp-thumbnail-dir`.

When the destination is a **new module**, the tool delegates module creation to
`melis-tool-creator` (`MelisToolCreatorService::createTool()` with a `blank` tool), then activates
it (`ModulesService::activateModule()`) and clears the dashboard-menu cache.

## Front office

This module has no front-office templating plugins or view helpers — it is a backoffice-only tool.
(The widgets it *generates*, however, are backoffice dashboard plugins.)

## Database tables

MelisDashboardPluginCreator defines **no tables of its own** — no install SQL or dbdeploy delta
ships with it. All state is held in the wizard session; output is written directly to the target
module's files.

## Example

Trigger generation from the data already stored in the wizard session (this is what step 5 does):

```php
/** @var \MelisDashboardPluginCreator\Service\MelisDashboardPluginCreatorService $dpc */
$dpc = $serviceManager->get('MelisDashboardPluginCreatorService');

$success = $dpc->generateDashboardPlugin(); // true on success, false (and rolled back) on failure
```

The generated widget follows the template in `template/DashboardPluginController.php` — a class
extending `MelisCoreDashboardTemplatingPlugin` with an action that returns a `ViewModel`:

```php
class MyModuleMyWidgetPlugin extends MelisCoreDashboardTemplatingPlugin
{
    public function __construct()
    {
        $this->pluginModule = 'mymodule';
        parent::__construct();
    }

    public function myWidget()
    {
        $view = new ViewModel();
        $view->setTemplate('my-module/dashboard-plugins/my-widget');
        return $view;
    }
}
```

## Key files

| Concern | Path |
| --- | --- |
| Module manifest | `vendor/melisplatform/melis-dashboard-plugin-creator/composer.json` |
| Routes / service / controller / form | `vendor/melisplatform/melis-dashboard-plugin-creator/config/module.config.php` |
| Left-menu tool tree | `vendor/melisplatform/melis-dashboard-plugin-creator/config/app.toolstree.php` |
| Tool interface (melisKeys, forwards) | `vendor/melisplatform/melis-dashboard-plugin-creator/config/app.interface.php` |
| Wizard steps, forms, icons, thumbnail config | `vendor/melisplatform/melis-dashboard-plugin-creator/config/app.tools.php` |
| Generation service | `vendor/melisplatform/melis-dashboard-plugin-creator/src/Service/MelisDashboardPluginCreatorService.php` |
| Wizard controller | `vendor/melisplatform/melis-dashboard-plugin-creator/src/Controller/DashboardPluginCreatorController.php` |
| Module-select form factory | `vendor/melisplatform/melis-dashboard-plugin-creator/src/Form/Factory/MelisDashboardPluginCreatorModuleSelectFactory.php` |
| Generated-plugin templates | `vendor/melisplatform/melis-dashboard-plugin-creator/template/` |
| Wizard views | `vendor/melisplatform/melis-dashboard-plugin-creator/view/` |
| Assets | `vendor/melisplatform/melis-dashboard-plugin-creator/public/` |

::: tip Related
This is the dashboard counterpart of `melis-templating-plugin-creator` (front-office templating
plugins). To understand the artefacts it generates, read [Plugins](/legacy/guide/plugins).
:::
