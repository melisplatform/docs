# MelisFormCreator

> The back-office **form builder** of MelisPlatform — design fields, groups, rules, statuses,
> validation workflows, computed formulas and versions.
> Package `melisplatform/melis-form-creator`.

## Purpose

`MelisFormCreator` is the admin tool where a developer or content manager **designs** a form: it
drags fields into steps, configures field types, groups, conditional rules, answer statuses, a
multi-step approval workflow ("Instruction"), and computed formulas. It writes the resulting
definition into **MelisFormEngine's** tables (`melis_forms*`) — the engine is responsible for
rendering the form to visitors and storing answers. This module owns only two small catalog tables:
field-type definitions and formula definitions.

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    // …
    'MelisFormCreator',
];
```

Required dependencies (declared in `composer.json`):

- `melisplatform/melis-core` `^5.3` — event manager, service manager, BO tool chrome, translations.
- `melisplatform/melis-form-engine` `^5.3` — owns the form/field/answer tables and the renderer; this module writes into them.
- `melisplatform/melis-small-business` `^5.3` — the workflow engine behind the Instruction approval process.
- `mossadal/math-parser` `^1.3` — evaluates formula math expressions.
- `jms/serializer` + `doctrine/instantiator` — (de)serialize the formula entity graph.

## Key services

| Service alias | Role |
| --- | --- |
| `FormCreatorFormulaService` | Resolves a formula's registered view helper (from `mff_helper_file`) and renders the formula tree; handles JSON ↔ XML conversion and parameter extraction. |
| `FormCreatorFieldTypeTable` | Gateway for the `mfft_*` field-type catalog table. |
| `FormCreatorFormulaTable` | Gateway for the `mff_*` formula definitions table. |

## Backoffice

Accessed via **Marketing → Form Creator** (menu key `melisformcreator_tool`, icon `fa fa-th-large`).
All controllers are reachable under the generic route `/MelisFormCreator/[:controller[/:action]]`.

### Catalog tabs

| Tab | Controller | Role |
| --- | --- | --- |
| **Form** | `FormCreatorFormController` | List, create, clone (`FormCreatorCloneFormController`), open and delete forms. |
| **Fields** | `FormCreatorFieldController` | Reusable fields defined once and shared across all forms. |
| **Field Types** | `FormCreatorFieldTypesController` | System catalog of field types (text, select, checkbox, computation…) — read-mostly. |
| **Groups** | `FormCreatorGroupsController` | Sections that group fields together on a form. |
| **Rules** | `FormCreatorRulesController` | Conditional logic — show/hide a field depending on another field's value, using *rule helpers* (compare-number, compare-text). |
| **Status** | `FormCreatorStatusController` | Answer statuses a submission can move through (e.g. New, Validated, Rejected). |
| **Instruction** | `FormCreatorInstruction*Controller` (×4) | The validation workflow: **Process** (stages), **Validators** (approvers), **Reasons** (rejection/action reasons), **Comments** (note templates). |
| **Formulas** | `FormCreatorFormulasController` | Computed expressions derived from other fields; attached to a field of type `computation`. |

### Form-edition page tabs (per form)

| Tab | Role |
| --- | --- |
| **Form** | Visual builder — drag fields into steps, order them, set labels/translations. |
| **Properties** | Form-level settings. |
| **Status Rules** | Rules that move an answer between statuses. |
| **Versions** | Version timeline (major.minor.maintenance) — every structural change adds a maintenance version automatically. |
| **Instruction** | Attach a validation Process to the form. |
| **Entry Parameters** | Pre-fill answers from entry parameters. |

## Database tables

This module owns only two tables. All forms, fields, groups, rules, statuses, versions and answers
are stored by **MelisFormEngine** (`melis_forms*` tables).

| Table model | PK | Holds |
| --- | --- | --- |
| `MelisFormCreatorFieldTypeTable` | `mfft_id` | The **field-type** catalog (text, select, checkbox, computation…). |
| `MelisFormCreatorFormulaTable` | `mff_id` | **Formula** definitions — `mff_helper_file`, `mff_name`, `mff_description`, `mff_xml` (serialized formula tree). |

## Events & listeners

Because a form's structure is XML in the engine but its parts (fields, statuses, validators…) are
edited separately, `Module.php` attaches listeners that re-sync every form when a shared part changes.

| Listener | Event(s) | Effect |
| --- | --- | --- |
| `MelisFormCreatorFormVersioningListener` | `melisformcreator_form_update_start` / `…_update_end` | Snapshots form XML; on change writes a new maintenance version and bumps `mf_current_version_maintenance`. |
| `MelisFormCreatorUpdateFieldListener` | `melisformcreator_save_field_end` | Rewrites the field's XML inside every form that uses it (including as a secondary field). |
| `MelisFormCreatorDeleteFieldListener` | `melisformcreator_delete_field_end` | Removes the field from every form's XML. |
| `MelisFormCreatorUpdateValidatorListener` / `…DeleteValidatorListener` | `melisformcreator_save_validator_end` / `melisformcreator_delete_validator_end` | Sync or remove the validator across form XML. |
| `MelisFormCreatorUpdateProcessListener` / `…DeleteProcessListener` | `melisformcreator_save_process_end` / `melisformcreator_delete_process_end` | Sync or remove the process across form XML. |
| `MelisFormCreatorDeleteStatusListener` | `melisformcreator_delete_status_end` | Strip the status from form XML. |
| `MelisFormCreatorDeleteReasonListener` | `melisformcreator_delete_reason_end` | Update affected answer XML via the engine's answers service. |
| `MelisFormCreatorFormulaUpdateFieldListener` | `melisformcreator_form_field_set_field_config_xml_end`, `melisformcreator_validate_form_field`, `melisformcreator_format_post_values` | Inject `<formula>` + parameters into a computation field, validate it, and convert formula JSON→XML on save. |
| `MelisFormFormulaParametersListener` | `melisformcreator_formula_parameters` | Fill formula parameter values from the current answer context. |
| `MelisFormCreatorFlashMessengerListener` | `…_save_*_end` / `…_delete_*_end` | Back-office flash feedback. |

::: tip Extending the builder
Listen on the `melisformcreator_save_*_end` / `melisformcreator_delete_*_end` events — you receive
the saved/deleted entity after the core logic ran, exactly as the built-in sync listeners do.
:::

## View helpers

| Helper | Use |
| --- | --- |
| `FormulaHelper` | Render the formula tree UI; convert XML ↔ JSON; extract parameters. |
| `FormulaTextLanguageHelper` | Multilingual labels for formula nodes. |
| `SecondaryFieldHelper` | Pick a "secondary" (referencing) field. **Reused by MelisFormTool and MelisDocumentGenerator.** |
| `ToolTipTable` | Build configurable tooltip tables (groups/validators/reasons). **Reused by MelisFormTool and MelisDocumentGenerator.** |
| `ValidatorBtnHelper` | Validator action buttons in the Instruction UI. |

## Example

Listen to a post-save event to run custom logic after a field is updated:

```php
// In your module's Module::onBootstrap()
$eventManager = $e->getApplication()->getEventManager();
$eventManager->attach(
    'melisformcreator_save_field_end',
    function ($event) {
        $savedField = $event->getParam('savedField');
        // your custom sync or notification logic here
    }
);
```

## Key files

| Concern | Path |
| --- | --- |
| Module bootstrap & listeners | `vendor/melisplatform/melis-form-creator/src/Module.php` |
| Routing, services, controllers, view helpers | `vendor/melisplatform/melis-form-creator/config/module.config.php` |
| Left-menu entry | `vendor/melisplatform/melis-form-creator/config/app.interface.php` |
| Catalog tabs + form-edition tabs | `vendor/melisplatform/melis-form-creator/config/app.tools.php` |
| Rule helpers (compare-number / compare-text) | `vendor/melisplatform/melis-form-creator/config/rulehelper.config.php` |
| Formula / field-type / instruction form schemas | `vendor/melisplatform/melis-form-creator/config/app.formula.forms.php` |
| Formula service | `vendor/melisplatform/melis-form-creator/src/Service/MelisFormCreatorFormulaService.php` |
| Formula entity graph | `vendor/melisplatform/melis-form-creator/src/Entity/` |
| Form-XML sync listeners | `vendor/melisplatform/melis-form-creator/src/Listener/` |
| View helpers | `vendor/melisplatform/melis-form-creator/src/View/Helper/` |
| Table gateways (field-types, formulas) | `vendor/melisplatform/melis-form-creator/src/Model/Tables/` |

See also: [MelisFormEngine](/legacy/reference/modules/melis-engine), [MelisSmallBusiness](/legacy/reference/modules/melis-small-business)
