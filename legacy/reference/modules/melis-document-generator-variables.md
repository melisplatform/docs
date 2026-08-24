# MelisDocumentGeneratorVariables

> Backoffice tool to define static `$CODE$` placeholder variables (with a value per language) for
> the MelisDocumentGenerator. Package `melisplatform/melis-document-generator-variables`.

## Purpose

`MelisDocumentGeneratorVariables` lets back-office users create **static variables** consumed by
`MelisDocumentGenerator` when it fills `$VARIABLE$` placeholders in a document's section text.
Each variable has a unique **code** and a **value per language**, so the generated document
renders the correct text for its target language. This covers content that is the same for every
recipient — company name, legal footer, standard addresses, etc. — as opposed to values that come
from a form answer or an external-fields XML declaration.

`MelisDocumentGenerator` **requires** this module and treats it as one of three placeholder
sources (form answer fields, external fields, static variables). Codes are kept globally unique
across all three sources via `isCodeExisting()`.

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisDocumentGeneratorVariables',
];
```

Requires `melisplatform/melis-core` (`^5.3`) and PHP `^8.1|^8.3`. The module is consumed by
`MelisDocumentGenerator`; install that module to use the variables in generated documents.

## Key services

Registered as service-manager aliases in `config/module.config.php`. The service extends
`MelisGeneralService` — every method fires `*_start` / `*_end` events.

| Service alias | Role |
| --- | --- |
| `DocumentgeneratorvariablesService` | Full CRUD for variables and their per-language values, plus the `isCodeExisting()` uniqueness check and `getVariable()` resolver used by the generator. |

**Method reference:**

```php
$svc = $sm->get('DocumentgeneratorvariablesService');

$svc->getList($start, $limit, $searchKeys, $searchValue, $orderKey, $order, $langId, $count);
$svc->getItemById($id);
$svc->saveItem($data, $id);      // save the variable (code)
$svc->saveLang($data, $id);      // save the per-language value
$svc->deleteItem($id);
$svc->deleteLang($id);
$svc->getVariable($where);       // resolve a variable for the generator
$svc->deleteVariable($id);       // delete variable + all its translations
$svc->isCodeExisting($code, $id); // global uniqueness check — see below
```

### Global code uniqueness

`isCodeExisting($code, $id)` prevents placeholder collisions across the whole document-generator
stack. It returns `true` if the code already exists in **either**:

- this module's `melis_static_variables` table, **or**
- any external-fields XML declared under
  `config['plugins']['melisformcreator']['datas']['external_fields']` (each file is
  `simplexml_load_file`d and `<field><code>` values are compared case-insensitively).

Table gateways are also aliased: `DocumentgeneratorvariablesTable` (`melis_static_variables`) and
`DocumentgeneratorvariablesLangTable` (`melis_static_variables_trans`).

## Backoffice

The module registers a tool under **MelisMarketing → Document Generator Variables**
(`fa fa-puzzle-piece`), melisKey `documentgeneratorvariables_tool`, forwarding to
`StaticVariables/render-tool`.

| Component | Description |
| --- | --- |
| Variables DataTable (`app.tools.php`) | Lists all variables with search, limit, refresh, edit and delete actions. |
| Add / edit modal (`render-modal-form`) | Opens a form for the variable code plus a per-language value form (`Variables/render-language-form`). |
| `StaticVariablesController` | Handles the tool view, the modal and all CRUD actions. |
| `VariablesController` | Renders and processes the per-language value form. |
| `SavePropertiesListener` | Attached on back-office routes; handles save events. |
| `DeleteListener` | Attached on back-office routes; handles delete events. |

**Microservice** (`app.microservice.php`): exposes `getItemById` and `getList` of
`DocumentgeneratorvariablesService` through the Melis microservice so external systems can read
the variables.

## Database tables

Created by `install/dbdeploy/`.

| Table | Holds |
| --- | --- |
| `melis_static_variables` | Variable definitions: `msv_id`, `msv_code` (UNIQUE), `msv_creation_date`. |
| `melis_static_variables_trans` | Per-language values, FK → `msv_id`. |

## Example

Resolve a static variable's value for use in a document:

```php
$svc = $this->getServiceManager()->get('DocumentgeneratorvariablesService');

// Check uniqueness before saving a new variable
if (!$svc->isCodeExisting('COMPANY_NAME', null)) {
    $svc->saveItem(['msv_code' => 'COMPANY_NAME'], null);
    // Then save the value for each language
    $svc->saveLang(['lang_id' => 1, 'value' => 'Acme Corp'], $variableId);
}

// Resolve a variable (used internally by MelisDocumentGenerator)
$variable = $svc->getVariable(['msv_code' => 'COMPANY_NAME']);
```

In a document-generator section text, write `$COMPANY_NAME$` — the generator replaces it with the
admin-defined value for the document's language.

## Key files

| Concern | Path |
| --- | --- |
| Module config / routes / services | `vendor/melisplatform/melis-document-generator-variables/config/module.config.php` |
| Backoffice tool tree | `vendor/melisplatform/melis-document-generator-variables/config/app.toolstree.php` |
| DataTable config | `vendor/melisplatform/melis-document-generator-variables/config/app.tools.php` |
| Microservice config | `vendor/melisplatform/melis-document-generator-variables/config/app.microservice.php` |
| Main service | `vendor/melisplatform/melis-document-generator-variables/src/Service/DocumentgeneratorvariablesService.php` |
| Tool + CRUD controller | `vendor/melisplatform/melis-document-generator-variables/src/Controller/StaticVariablesController.php` |
| Language form controller | `vendor/melisplatform/melis-document-generator-variables/src/Controller/VariablesController.php` |
| Table gateways | `vendor/melisplatform/melis-document-generator-variables/src/Model/Tables/` |
| Listeners | `vendor/melisplatform/melis-document-generator-variables/src/Listener/` |
| DB schema | `vendor/melisplatform/melis-document-generator-variables/install/dbdeploy/` |

See also: [melis-core](/legacy/reference/modules/melis-core) · [melis-document-upload](/legacy/reference/modules/melis-document-upload)
