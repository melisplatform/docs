# MelisToolCreator

> GUI generator that scaffolds new backoffice **tools** as standalone Laminas modules.
> Package: `melisplatform/melis-tool-creator`.

## Purpose

MelisToolCreator is the in-backoffice wizard behind **Create a tool**. It walks you through a
multi-step form (module name, texts, database table, columns, add/update form, translations,
summary, finalization) and then **writes a complete, working Laminas module to disk** under
`module/<ModuleName>/` — controller, service, model tables, listeners, config, language files,
views and JS. It does not store tools in the database; the generated code is plain files you own
and can edit afterwards. See the full walkthrough in [Create a tool](/guide/create-a-tool).

## Enable it

Standard Laminas module. Add it to `config/melis.module.load.php`:

```php
return [
    // …
    'MelisToolCreator',
];
```

Dependencies (from `composer.json`): `melisplatform/melis-core` and `melisplatform/melis-cms`
(PHP `^8.1|^8.3`). The module merges `module.config.php`, `app.interface.php`, `app.toolstree.php`
and `app.tools.php` in `src/Module.php::getConfig()`.

## Key services

Registered as `service_manager` aliases in `config/module.config.php`:

| Service alias | Role |
| --- | --- |
| `MelisToolCreatorService` | Drives generation. `createTool()` fires `melis_tool_creator_generate_tool_start`, builds the module tree and files from the `template/` skeletons, then fires `melis_tool_creator_generate_tool_end`. Helpers: `moduleName()`, `getTableColumns($table)`, `getTablePK($table)`, `describeTable($table)`, `hasPrimaryKey()`, `isFrameworkTool()`, `generateModuleNameCase($str)`, `cleanString($str)`. |
| `MelisToolCreatorCacheSystemService` | Filesystem cache helper (`getCacheByKey`, `setCacheByKey`, `deleteCacheByPrefix`, `getTtlByKey`) for the wizard. |

`MelisToolCreatorService` extends `MelisCore\Service\MelisGeneralService` and reads the live DB
schema (Laminas `Metadata`) so a generated **db** tool maps onto an existing table.

## Tool types

The step-1 form (`tcf-tool-type`) offers three kinds of tool, plus an optional framework variant:

| Type | What it scaffolds |
| --- | --- |
| `db` | A full CRUD tool over an existing database table (list + add/update form, with optional language tables). |
| `iframe` | A tool that embeds an external URL (`tcf-tool-iframe-url`) in an iframe. |
| `blank` | An empty tool skeleton you fill in yourself. |

Framework tools (`config/frameworks.php`: `laravel`, `symfony`, `lumen`, `silex`) generate a
micro-service style controller instead of the standard ZF/Laminas one.

## Backoffice

The wizard is reached from the left menu under **Tools → Tools creation → Designs**, declared in
`config/app.toolstree.php`. Its melisKeys: `melistoolcreator_tool` (and children
`melistoolcreator_header`, `melistoolcreator_content`, `melistoolcreator_steps`).

| Concern | Value |
| --- | --- |
| Controller | `MelisToolCreator\Controller\ToolCreator` (`ToolCreatorController`) |
| Entry action | `render-tool-creator` (`renderToolCreatorAction`) |
| Steps action | `render-tool-creator-steps` (`renderToolCreatorStepsAction`) |
| Validate / navigate | route `tool-creator-validate-cur-step` |
| Load table columns | route `tool-creator-get-tbl-cols` → `renderStep3TableColumns` |

Step forms live in `config/app.tools.php` (`tool-creator-step-1`, `tool-creator-step-2`, …).

## Database tables

None. MelisToolCreator declares no `melis_*` tables of its own (no install SQL / dbdeploy delta).
The `melis_tool_creator_generate_tool_start` / `_end` strings in the service are **event names**,
not tables. For **db** tools it instead introspects whatever existing table you point the wizard at.

## Key files

| Concern | Path |
| --- | --- |
| Module bootstrap / config merge | `vendor/melisplatform/melis-tool-creator/src/Module.php` |
| Wizard controller | `vendor/melisplatform/melis-tool-creator/src/Controller/ToolCreatorController.php` |
| Generation service | `vendor/melisplatform/melis-tool-creator/src/Service/MelisToolCreatorService.php` |
| Cache service | `vendor/melisplatform/melis-tool-creator/src/Service/MelisToolCreatorCacheSystemService.php` |
| Backoffice menu entry | `vendor/melisplatform/melis-tool-creator/config/app.toolstree.php` |
| Wizard step forms | `vendor/melisplatform/melis-tool-creator/config/app.tools.php` |
| Framework list / form | `vendor/melisplatform/melis-tool-creator/config/frameworks.php` |
| Generated-code skeletons | `vendor/melisplatform/melis-tool-creator/template/` |
| Wizard views (step 1–8) | `vendor/melisplatform/melis-tool-creator/view/melis-tool-creator/tool-creator/` |

## See also

- [Create a tool](/guide/create-a-tool) — the end-to-end guide.
- [Module reference](/reference/modules) — all platform modules.
- [Plugins](/guide/plugins) — the sibling scaffolders for templating & dashboard plugins.
