# MelisFormEngine

> Shared storage and runtime layer for the whole form system — owns every `melis_form*` table,
> all per-entity services, the field view-helpers (form → HTML) and the server-side validators.
> Package `melisplatform/melis-form-engine`.

## Purpose

`MelisFormEngine` is the load-bearing infrastructure module of the form family. It owns every
database table (form definitions, workflow entities, visitor answers), exposes one service per
entity, renders form fields to HTML through a set of view-helpers, runs server-side validation on
submitted answers, and persists submissions. It has almost no UI of its own — the builder
(`MelisFormCreator`) and the answer reviewer (`MelisFormTool`) are thin layers that call these
services and write into these tables.

**Form family at a glance:**

| Module | Role |
| --- | --- |
| **MelisFormEngine** *(this module)* | Storage + runtime: tables, services, field renderers, validators, answer persistence. |
| `MelisFormCreator` | Builder UI — calls these services to write form definitions into these tables. |
| `MelisFormTool` | Answer reviewer — lists/shows answers and drives the instruction workflow. |
| `MelisSmallBusiness` | Workflow framework behind the instruction/validation process. |

Downstream, `MelisDocumentGenerator` reads `melis_forms_answers` to produce documents.

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    // …
    'MelisFormEngine',
];
```

Requires `melisplatform/melis-core ^5.3` (events, mailer, BO chrome) and
`melisplatform/melis-engine ^5.3` (front-office rendering engine, so forms can be submitted on
the public site using the same services/tables). `melis-site: false` — no demo-site content is
bundled.

## Key services

All aliases are registered in `config/module.config.php`. Note: alias names keep the
`MelisFormCreatorForm*` prefix; the actual classes live in `MelisFormEngine\Service\`.

| Service alias | Role |
| --- | --- |
| `MelisFormCreatorFormService` | Central form CRUD + the form→HTML builder. Key methods: `saveForm()`, `setFormConfigXML()`, `getFormByFormId()`, `generateForm($xml, $renderMode = 'melis', …)` (parses form config XML into a Laminas form), and `updateFormXmlBy{Updated,Deleted}{Field,Status,Validator,Process}()` sync helpers. |
| `MelisFormCreatorFormFieldService` | Field CRUD: `getFieldList()`, `saveFormField()`, `saveFormFieldRules()`, `saveFormFieldGroups()`, `deleteFormField()`, `getSavedFieldXml()`. |
| `MelisFormCreatorFormGroupsService` | Field-group CRUD. |
| `MelisFormCreatorFormRulesService` | Conditional-rule CRUD. |
| `MelisFormCreatorFormStatusService` | Answer-status CRUD. |
| `MelisFormCreatorFormTypeService` | Form-type CRUD. |
| `MelisFormCreatorFormProcessesService` | Workflow process-stage CRUD. |
| `MelisFormCreatorFormValidatorsService` | Workflow validator CRUD. |
| `MelisFormCreatorFormReasonsService` | Rejection/action reason CRUD. |
| `MelisFormCreatorFormCommentsService` | Comment-template CRUD. |
| `MelisFormCreatorFormVersioningService` | Form version snapshot/read. |
| `MelisFormAnswersService` | Visitor answers: `generateAnswersXml($data, $postDatas, $fieldsArr)`, `saveFormAnswers($data, $id)`, `validateAnswer($formId, $formAnswersId, $fieldId, $fieldValue, $file)`, `saveFormAnswersDocument(…)`, answer listing/reading. |
| `MelisFormValidationService` | Instruction server-side validation pipeline: `generateFormProcessesNode(…)`, validator/role resolution, answer event/audit XML. |
| `MelisFormEngineOtherConfigService` | Persists the DB-vs-filesystem document-storage choice (triggered by `meliscore_save_other_config`). |

## Backoffice

The only back-office surface is a settings panel under **System → Configuration → Form Engine
settings** (`OtherConfigController`). It lets an admin choose whether uploaded form documents are
stored in the **database** or on the **filesystem**, and toggles the validation-UI options
(whether validate/comment buttons appear on answers). Settings are persisted by
`MelisFormEngineOtherConfigService` via the `meliscore_save_other_config` event.

## Front office

### Field view-helpers

Registered in `view_helpers` (`config/module.config.php`). `BaseFieldHelper` is the orchestrator;
it dispatches to a concrete helper per field type and wraps the control in its div + label/tooltip.

| Helper (view-helper name) | Renders |
| --- | --- |
| `BaseFieldHelper` | Orchestrator — routes to the right helper below. |
| `InputFieldHelper` | `<input>` (text / email / number). |
| `TextareaFieldHelper` | `<textarea>`. |
| `SelectFieldHelper` | `<select>` (key\|label options). |
| `CheckboxFieldHelper` / `RadioButtonFieldHelper` | Checkbox group / radio group. |
| `DateFieldHelper` / `DateTimeFieldHelper` | Date / date-time picker. |
| `FileUploadFieldHelper` | File upload control. |
| `LabelFieldHelper` / `TextDisplayZoneHelper` | Read-only label / display zone (with conditional visibility). |
| `MelisSwitchHelper` (`MelisSwitch`, `MelisSwitchOnOff`) | Toggle switch. |
| `MelisTinyMCEHelper` (`MelisTinyMCE`) | Rich-text editor. |
| `MelisBOUsersHelper` (`MelisBOUsersSelect`) | Back-office-user select. |
| `CustomInputModelHelper` | Custom input model. |
| `ValidationCommentHelper` | Per-field approve/reject icons + comment button + history (review UI). |

### Rendering pipeline

1. `MelisFormCreatorFormService::generateForm($xml, $renderMode='melis', …)` parses `melis_forms.mf_config` and produces a Laminas form.
2. `BaseFieldHelper` dispatches per field type to the concrete `*FieldHelper`.
3. On submit, `StepByStepController::validateAnswerAction` (route `/MelisFormEngine/validate-answer`) validates a single field via `MelisFormAnswersService::validateAnswer()` — this powers the step-by-step AJAX validation.
4. `MelisFormAnswersService::generateAnswersXml()` + `saveFormAnswers()` persist the submission into `melis_forms_answers`.

### Server-side validators

Registered in the `validators` plugin manager (`config/module.config.php`), resolved per field
from the form XML and run by `MelisFormAnswersService::validateAnswer()`. All extend `BaseHelper`.

`NotEmptyHelper` · `ValidEmailHelper` · `IsIntegerHelper` · `IsFloatHelper` · `IsDateHelper` ·
`DigitsHelper` · `AlphaNumericHelper` · `UriHelper` · `FileExtensionPdfHelper` ·
`FileSizeMax500KbHelper` · `CompareNumberHelper` · `CompareTextHelper`

## Database tables

All tables are owned by this module (`src/Model/Tables/`). Most entities have a base table and a
`_trans` companion holding per-language labels.

### Form definition

| Table | Holds |
| --- | --- |
| `melis_forms` / `melis_forms_trans` | The form itself; `mf_config` XML = complete form structure (steps, fields, rules, statuses…). |
| `melis_form_fields` / `melis_form_fields_trans` | Reusable field definitions. |
| `melis_form_field_groups` / `_trans` | Field groups/sections. |
| `melis_form_fields_group_rel` | Field ↔ group link. |
| `melis_form_field_rules` / `_trans` | Conditional rules (show/hide). |
| `melis_form_fields_rules_rel` | Field ↔ rule link. |
| `melis_form_status` / `_trans` | Statuses an answer can take. |
| `melis_form_forms_status` | Form ↔ status link. |
| `melis_form_types` | Form layout types (e.g. accordion/tab). |
| `melis_forms_versioning` | Form version snapshots (major.minor.maintenance). |

### Instruction / validation workflow

| Table | Holds |
| --- | --- |
| `melis_form_processes` / `_trans` | Workflow process stages. |
| `melis_form_validators` / `_trans` | Who may approve/reject. |
| `melis_form_reasons` / `_trans` | Rejection/action reasons. |
| `melis_form_comments` / `_trans` | Comment templates. |
| `melis_form_comments_reasons` | Comment ↔ reason link. |

### Answers

| Table | Holds |
| --- | --- |
| `melis_forms_answers` | One submission per row; answer content is XML. |
| `melis_forms_answers_documents` | Uploaded files attached to an answer (when "store in DB" is on). |
| `melis_forms_field_custom_base` | Base rows for custom-input field models. |

## Example

Validate a single field, then save a complete form submission:

```php
$answersService = $serviceManager->get('MelisFormAnswersService');

// Validate one field (called from AJAX step-by-step)
$result = $answersService->validateAnswer(
    $formId,
    $formAnswersId,
    $fieldId,
    $fieldValue,
    $uploadedFile  // null if not a file field
);

// Build the answers XML and persist the full submission
$xml  = $answersService->generateAnswersXml($formData, $postDatas, $fieldsArr);
$id   = $answersService->saveFormAnswers(['mfa_form_id' => $formId, 'mfa_answer' => $xml], null);
```

## Key files

| Concern | Path |
| --- | --- |
| Service + table aliases, view_helpers, validators, routes | `vendor/melisplatform/melis-form-engine/config/module.config.php` |
| Workflow email templates | `vendor/melisplatform/melis-form-engine/config/app.emails.php` |
| BO settings panel declaration | `vendor/melisplatform/melis-form-engine/config/app.interface.php` |
| Laminas forms (review + config) | `vendor/melisplatform/melis-form-engine/config/app.forms.php` |
| Database table gateways | `vendor/melisplatform/melis-form-engine/src/Model/Tables/` |
| Per-entity services | `vendor/melisplatform/melis-form-engine/src/Service/` |
| Field view-helpers | `vendor/melisplatform/melis-form-engine/src/View/Helper/Field/` |
| Server-side validators | `vendor/melisplatform/melis-form-engine/src/Validator/` |
| Builder dropdown factories | `vendor/melisplatform/melis-form-engine/src/Form/Factory/` |
| StepByStep (validate-answer) + OtherConfig controllers | `vendor/melisplatform/melis-form-engine/src/Controller/` |
| OtherConfig event listener | `vendor/melisplatform/melis-form-engine/src/Listener/MelisFormEngineOtherConfigListener.php` |

See also: [MelisCore](/legacy/reference/modules/melis-core) · [MelisSmallBusiness](/legacy/reference/modules/melis-small-business)
