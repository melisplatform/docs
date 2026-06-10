# MelisFormTool

> Back-office manager for form answers: fill, browse, inspect, validate with comments and timeline. Package `melisplatform/melis-form-tool`.

## Purpose

MelisFormTool is the back-office review and validation layer that sits on top of MelisFormEngine. Staff can fill a form on a client's behalf, browse every submitted answer, open one to inspect filled fields and its event timeline, and validate it by setting a status and adding comments. It also adds a per-form validation configuration tab to each form's **Other config** settings panel.

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisFormTool',
];
```

Requires `melisplatform/melis-form-engine` (`^5.3`) and `laminas/laminas-paginator`. PHP `^8.1|^8.3`.

## Key services

| Service alias | Role |
| --- | --- |
| `FormToolService` | Persists per-form validation configuration; fires start/end events around saves |

### `FormToolService` usage

```php
$svc = $sm->get('FormToolService');
$svc->saveFormValidationConfig($settings);
// fires melisformtool_save_form_validation_config_start / _end
```

> **Note — config persistence:** `saveFormValidationConfig()` writes a PHP config file at runtime to
> `vendor/melisplatform/melis-form-tool/config/formvalidation.config.php` under
> `plugins.melisformtool.datas.MelisFormsValidationConfig`, then resets OPcache. `Module::getConfig()`
> conditionally includes that file if it exists. The per-form validation configuration is persisted as
> generated module config rather than in a database table, and it mutates the vendor directory on each save.

## Backoffice

**Location:** Left menu → MelisMarketing → Form Tool (`fa-file-text-o`).

The main screen is a DataTable of form answers. The per-form validation config lives inside each form's **Other config** (Form Tool tab).

### Answers DataTable (`#tableToolFormTool`)

| Column | Source field |
| --- | --- |
| Id | `mfa_id` |
| Form | `mft_name` |
| Status | `mfst_name` |
| Version | `version` |
| Creation date | `mfa_date_creation` |
| User | `user_name` |

Filters: **form / date / status / limit**. Actions: **edit / delete**.

Ajax endpoint: `/melis/MelisFormTool/FormTool/getFormsAnswersLists`

### Controllers

| Controller | Responsibilities |
| --- | --- |
| `FormToolController` | Tool rendering, answers DataTable JSON, table filters, fill-form modal, answer tab (fields + validation + timeline), validation & comments modal, save/delete answer, `getFormById` |
| `ToolValidationController` | Server-side `validateField`, Other config validation-config tab rendering |

### Listener

`MelisFormToolOtherConfigListener` attaches to the `meliscore_save_other_config` event (MelisCore). When a form's Other config is saved, it reads the `melisformtool_form_validation_config_form` elements, maps them to settings, and calls `FormToolService::saveFormValidationConfig()`.

## Database tables

MelisFormTool has **no tables of its own**. All data is owned by MelisFormEngine.

| Table prefix | Owned by | Holds |
| --- | --- | --- |
| `mfa_*` | MelisFormEngine | Form answers |
| `mft_*` | MelisFormEngine | Forms |
| `mfst_*` | MelisFormEngine | Answer statuses |

## Key files

| Concern | Path |
| --- | --- |
| Module bootstrap | `vendor/melisplatform/melis-form-tool/src/Module.php` |
| Routes + service alias | `vendor/melisplatform/melis-form-tool/config/module.config.php` |
| Left menu + Other-config tab wiring | `vendor/melisplatform/melis-form-tool/config/app.toolstree.php` |
| Answers DataTable definition | `vendor/melisplatform/melis-form-tool/config/app.tools.php` |
| Forms config | `vendor/melisplatform/melis-form-tool/config/app.forms.php` |
| Answers controller | `vendor/melisplatform/melis-form-tool/src/Controller/FormToolController.php` |
| Validation-config controller | `vendor/melisplatform/melis-form-tool/src/Controller/ToolValidationController.php` |
| Validation service | `vendor/melisplatform/melis-form-tool/src/Service/FormToolService.php` |
| Other-config listener | `vendor/melisplatform/melis-form-tool/src/Listener/MelisFormToolOtherConfigListener.php` |
| Generated validation config (runtime) | `vendor/melisplatform/melis-form-tool/config/formvalidation.config.php` |

See also: [MelisFormEngine](/reference/modules/melis-form-engine), [MelisFormCreator](/reference/modules/melis-form-creator), [MelisCore](/reference/modules/melis-core)
