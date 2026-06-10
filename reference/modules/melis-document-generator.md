# MelisDocumentGenerator

> PDF document builder that assembles versioned sections and fills `$VARIABLE$` placeholders from MelisFormCreator answers. Package `melisplatform/melis-document-generator`.

## Purpose

MelisDocumentGenerator builds PDF documents from reusable, versioned **sections** whose rich-text content contains `$VARIABLE$` placeholders. At generation time those placeholders are filled from a linked **MelisFormCreator form answer** and/or from external fields provided by the companion `melis-document-generator-variables` package. The assembled HTML is converted to a PDF with **Dompdf**. Design a document once (sections + variables), then generate a filled-in PDF per form submission.

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisDocumentGenerator',
];
```

Required dependencies: `melisplatform/melis-core` (`^5.3`), `melisplatform/melis-document-generator-variables` (`^5.3`), `dompdf/dompdf` (`^3.1`), `spipu/html2pdf` (`^5.2`). PHP `^8.1|^8.3`.

## Key services

| Service alias | Role |
| --- | --- |
| `MelisDocumentGeneratorDocumentAssemblerService` | Assemble a document version, substitute variables, and render to PDF. |
| `MelisDocumentsService` | Documents CRUD/list; retrieve associated form. |
| `MelisDocumentsVersionsService` | Document versions CRUD and date-overlap validation. |
| `MelisDocumentsVersionsSectionsService` | Links between a document version and its ordered sections. |
| `MelisSectionsService` | Sections CRUD/list and usage lookups. |
| `MelisSectionsVersionsService` | Section versions CRUD; `getSectionsWithinDate` / `checkSectionHasVersion`. |
| `MelisDocumentTypesService` | Document type classifications (CRUD + uniqueness checks). |
| `MelisSectionTypesService` | Section type classifications (CRUD + code checks). |
| `MelisDocumentGeneratorExternalFieldsService` | Load external/available variables for the **Available variables** tab. |
| `MelisDocumentGeneratorFormService` | Language-ordered form utilities. |

All services extend MelisCore's general service and fire `melisdocumentgenerator_*_start` / `_end` events.

## Backoffice

Accessible via **Left menu → MelisMarketing → Document Generator** (`fa-file-text-o`).

| Tab / Page | Description |
| --- | --- |
| Documents | List, add, edit, preview and duplicate documents. Each document has a linked form (`mdd_form_id`) and one or more versions. |
| Sections | List, add, edit, preview and duplicate sections. Sections are typed `generic` or `dynamic` and hold `$VARIABLE$` placeholders in their rich-text. |
| Document Types | Manage document type classifications. |
| Section Types | Manage section type classifications (each carries a `mdst_code`). |
| Edition page | Per document or section: **Texts**, **Version properties** (start/end dates, status), **Available variables** tab. |

DataTables for documents and sections support filtering by document type, section type, and linked form. The **Duplicate** action (`DocumentGeneratorDuplicateController`) clones a document or section. A **preview modal** is available for both.

**Listener:** `MelisDocumentGeneratorGenerateDocumentListener` hooks `melisformcreator_delete_form_end` and nulls `mdd_form_id` on any document that referenced the deleted form (FK cleanup).

## Variables & placeholder substitution

Section text uses the format `$VARIABLE_NAME$`. At generation the assembler matches placeholders with `/\$(\w+(?:-\w+)*)\$/` and replaces each one from:

- **Form answer** — reads `mfa_form_config` (field definitions) and `mfa_form_answers` (values) from the linked FormCreator answer. Handles text/textarea, file upload, datepicker (locale-formatted `en_EN`/`fr_FR`), radiocell, checkbox, and select (radio/checkbox support solo / horizontal / vertical display variants).
- **External fields** — extra values merged via the `melisdocument_get_external_values_start` event (provided by `melis-document-generator-variables`); types `file`, `partnerfile`, `specialfile`.

## Example

```php
// Generate a filled PDF for a given form answer
$assembler = $serviceLocator->get('MelisDocumentGeneratorDocumentAssemblerService');
$result = $assembler->generateDocument(
    $contents,          // array of section content (text)
    $path,              // optional output path
    $documentVersionId,
    $formId,
    $formAnswerId,      // drives $VARIABLE$ substitution
    $language
);
// Returns a JsonModel with a base64-encoded PDF (or an error)
```

PDF output: A4 portrait, DejaVu Sans, Dompdf HTML5 parser enabled, remote resources disabled. `<img>` elements are inlined as base64 data-URIs via `imageTrait::convertImagesToBase64`.

## Database tables

| Table | Holds |
| --- | --- |
| `melis_docgen_documents` / `_trans` | A document: status, document type, linked form (`mdd_form_id`). |
| `melis_docgen_documents_versions` / `_trans` | A document version: status, `mddv_start_date`, `mddv_end_date`. |
| `melis_docgen_documents_versions_sections` | Link table — which sections a document version contains (`mddvs_mddv_id`, `mddvs_mds_id`, `mddvs_position`). |
| `melis_docgen_sections` / `_trans` | A section: type ENUM(`generic`, `dynamic`), status, doc type, section type, linked form (`mds_form_id`). |
| `melis_docgen_sections_versions` / `_trans` | A section version: status, `mdsv_start_date`, `mdsv_end_date`, version text. |
| `melis_docgen_documents_types` / `_trans` | Document type classifications. |
| `melis_docgen_sections_types` / `_trans` | Section type classifications (with `mdst_code`). |

## Key files

| Concern | Path |
| --- | --- |
| Assembler (PDF generation) | `vendor/melisplatform/melis-document-generator/src/Service/MelisDocumentGeneratorDocumentAssemblerService.php` |
| External fields service | `vendor/melisplatform/melis-document-generator/src/Service/MelisDocumentGeneratorExternalFieldsService.php` |
| FK cleanup listener | `vendor/melisplatform/melis-document-generator/src/Listener/MelisDocumentGeneratorGenerateDocumentListener.php` |
| Image-to-base64 trait | `vendor/melisplatform/melis-document-generator/src/Trait/imageTrait.php` |
| Service / table config | `vendor/melisplatform/melis-document-generator/config/module.config.php` |
| Back-office tree | `vendor/melisplatform/melis-document-generator/config/app.toolstree.php` |
| DataTable config | `vendor/melisplatform/melis-document-generator/config/app.tools.php` |
| DB migrations | `vendor/melisplatform/melis-document-generator/install/dbdeploy/` |
| PDF view | `vendor/melisplatform/melis-document-generator/view/melis-document-generator/documents-versions/document-version-pdf.phtml` |

See also: [melis-core](/reference/modules/melis-core)
