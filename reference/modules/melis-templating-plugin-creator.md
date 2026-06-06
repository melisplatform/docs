# MelisTemplatingPluginCreator

> A backoffice GUI wizard that scaffolds a complete front-office **templating plugin** — config,
> controller, view, modal form, assets and translations — into a new or existing module.
> Composer package `melisplatform/melis-templating-plugin-creator`.

## Purpose

MelisTemplatingPluginCreator is a code generator, not a runtime feature. It adds a step-by-step
backoffice tool that asks for a plugin name, destination module, properties (fields), thumbnail and
translations, then writes a ready-to-use templating plugin into the target module. The generated
plugin extends `MelisEngine\Controller\Plugin\MelisTemplatingPlugin`, so once created it behaves
like any hand-written templating plugin — read [Plugins](/guide/plugins) to understand and customise
the output.

## Enable it

It's a standard Laminas module. Add it to `config/melis.module.load.php`:

```php
return [
    // …
    'MelisTemplatingPluginCreator',
];
```

Composer dependencies (`composer.json`): `melis-core`, `melis-tool-creator`, `melis-cms` (PHP
`^8.1|^8.3`). When the destination is a **new** module, the tool delegates to
`MelisToolCreatorService::createTool()` to scaffold the module first. No database is required, but
the `module/` directory and a `tpc/temp-thumbnail/` folder under the public document root must be
writable (the GD extension is also needed for thumbnail validation).

## Key services

Registered as a `service_manager` alias in `config/module.config.php`.

| Alias | Role |
| --- | --- |
| `MelisTemplatingPluginCreatorService` | Generates (and rolls back) the templating plugin from the wizard data saved in the session. |

`MelisTemplatingPluginCreatorService` (extends `MelisCore\Service\MelisGeneralService`) notably
exposes:

| Method | Role |
| --- | --- |
| `generateTemplatingPlugin()` | Entry point: reads the session steps and writes all plugin files; rolls back on any failure. Returns a boolean. |
| `getSiteTemplatingPluginNames($siteModule)` | Lists existing templating-plugin names of a site module (used to reject duplicate plugin names). |
| `generateModuleNameCase($str)` / `convertToViewName($string)` | Normalise a name to a valid module name / view directory name. |
| `getTempThumbnail()` | Resolves the temp path of the uploaded plugin thumbnail for the current session. |

Internally `generateTemplatingPlugin()` runs `performGeneration()`, which writes the plugin config
(`config/plugins/<Module><Plugin>Plugin.config.php`), updates the target `module.config.php`
(`template_map` + `controller_plugins`), appends translations per language, generates assets
(css/js + thumbnail), the controller (`src/<Module>/Controller/Plugin/<Module><Plugin>Plugin.php`),
the front view and the modal form, and includes the new config from the module's `Module.php`.

## Backoffice

The module adds one tool — the **Templating Plugin Creator** — under the backoffice tools tree
(`config/app.toolstree.php` / `config/app.interface.php`):

- Tools-tree path: *Tools & Designs* → *Tools* → Templating Plugin Creator, mounted via the type
  reference `/melistemplatingplugincreator/interface/melistemplatingplugincreator_tool`.
- Tool melisKey `melistemplatingplugincreator_tool`, forwarding to controller
  `MelisTemplatingPluginCreator\Controller\TemplatingPluginCreator` (action `render-tool`), with
  `header`, `content` and `steps` sub-interfaces.

The tool is a 6-step wizard handled by `TemplatingPluginCreatorController`
(`renderTemplatingPluginCreatorStepsAction` dispatches `processStep1`…`processStep6`):

1. Plugin name + destination (new module or existing site module).
2. Title/description per language + thumbnail upload (`processUploadAction`).
3. Properties: number of fields and, per field, name, display type, required flag, default
   options/value. Available display types include `MelisText`, `Dropdown`, `DatePicker`,
   `DateTimePicker`, `PageInput`, `NumericInput`, `Switch`, `Textarea`, `MelisCoreTinyMCE`.
4. Per-language labels/tooltips for each field.
5. Summary.
6. Finalisation: generates the plugin (and optionally activates it on a chosen site).

Two form elements feed the wizard selects: `MelisTemplatingPluginCreatorModuleSelect` and
`MelisTemplatingPluginCreatorSiteSelect` (factories in `src/Form/Factory/`). To build a tool like
this one yourself, see [Create a tool](/guide/create-a-tool).

## Front office

This module adds **no** runtime front-office plugin or view helper of its own. Instead, it
**generates** a templating plugin into the destination module: a controller-plugin class extending
`MelisEngine\Controller\Plugin\MelisTemplatingPlugin` with `loadDbXmlToPluginConfig()` /
`savePluginConfigToXml()` wired to the configured fields, a `config/plugins/*.config.php`
(`front` + `melis` sections, one **Properties** tab), a front `.phtml`, a modal-form `.phtml`, and
css/js assets. The generated plugin then appears in the CMS page editor's plugin menu and is dropped
into a `MelisDragDropZone` like any other templating plugin — see [Plugins](/guide/plugins) and
[Build a site](/guide/build-a-site).

## Database tables

None. This tool generates source files only and stores its in-progress wizard state in a Laminas
session container (`templatingplugincreator`); no `melis_*` tables are installed.

## Example

The generated plugin is consumed like any templating plugin. From the service side, the wizard's
final step calls:

```php
$tpcService = $serviceManager->get('MelisTemplatingPluginCreatorService');
$result = $tpcService->generateTemplatingPlugin(); // true on success, files written to the target module
```

## Key files

| Concern | Path |
| --- | --- |
| Module / config loading | `vendor/melisplatform/melis-templating-plugin-creator/src/Module.php` |
| Wiring (service, routes, form elements, views) | `vendor/melisplatform/melis-templating-plugin-creator/config/module.config.php` |
| Tools tree | `vendor/melisplatform/melis-templating-plugin-creator/config/app.toolstree.php` |
| Tool interface | `vendor/melisplatform/melis-templating-plugin-creator/config/app.interface.php` |
| Wizard forms + steps config | `vendor/melisplatform/melis-templating-plugin-creator/config/app.tools.php` |
| Wizard controller | `vendor/melisplatform/melis-templating-plugin-creator/src/Controller/TemplatingPluginCreatorController.php` |
| Generator service | `vendor/melisplatform/melis-templating-plugin-creator/src/Service/MelisTemplatingPluginCreatorService.php` |
| Form element factories | `vendor/melisplatform/melis-templating-plugin-creator/src/Form/Factory/` |
| Code templates (scaffolded output) | `vendor/melisplatform/melis-templating-plugin-creator/template/` |

See also: [Module reference](/reference/modules) · [Plugins](/guide/plugins) ·
[Create a tool](/guide/create-a-tool) · [Build a site](/guide/build-a-site).
