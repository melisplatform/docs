# MelisDocumentUpload

> Backoffice document-upload management: define upload configurations, store and serve uploaded
> files, and attach them to MelisFormCreator answers. Package `melisplatform/melis-document-upload`.

## Purpose

`MelisDocumentUpload` lets you define **document upload configurations** (a name, an allowed max
size, a storage strategy and a type) and then collect, store and serve the matching uploaded files.
Files can be saved on the **filesystem** (under `data/melis_document_upload/`) or in the **database**
as a BLOB. Each uploaded file gets a unique **token** so it can be viewed/downloaded through a stable
public URL without a backoffice login. The module integrates with `MelisFormCreator`, letting forms
require a document and binding uploads to a specific form answer.

## Enable it

It is a standard Laminas module, already listed in `config/melis.module.load.php` as
`'MelisDocumentUpload'`. If you add it manually, `composer require melisplatform/melis-document-upload`
and add the module name to that file. It depends on `melisplatform/melis-core` (`^5.3`); the
MelisFormCreator integration (extra backoffice tabs and the "document" form requirement) only
appears when MelisFormCreator is installed. See [Module reference](/legacy/reference/modules).

## Key services

Registered as `service_manager` aliases in `config/module.config.php`. All extend
`MelisCore\Service\MelisGeneralService` (every method fires `*_start` / `*_end` events).

| Service alias | Role |
| --- | --- |
| `MelisDocumentService` | Manages **document definitions** (table `melis_docupl_documents`): `getList()`, `getItemById()`, `saveDocumentItem()`, `deleteDocumentItem()` (soft-delete via `isactive`), `getDocumentByDocumentId()`, multilingual names via `saveFormDocumentTranslation()` / `getDocumentTranslation()`. |
| `MelisDocumentUploadService` | Handles **uploaded files**. `processUpload($docId, $file, $postValues)` validates, stores (FILESYSTEM or DB), records the row and assigns a token; `uploadFile()`, `saveDocumentUploaded()`, `deleteDocumentUpload()`, `getDocumentUploadByToken()`, `getDocumentUrl($docUploadId)` (returns the `?token=…` URL), `getLatestDocumentUploadByDocId()`. |
| `MelisDocumentUploadRelationsService` | Reads upload→answer relations: `getLatestDocumentUploadedDataByIdAndObjectId()`, `getDocUplRelationData()`. |
| `MelisDocumentUploadListRelService` | Manages definition→form-object relations (`melis_docupl_documents_lists_rel`): `saveDocumentUploadForm()`, `saveFormDocument()`, `getDocumentsByFormAnswerId()`, `getDocumentsDoneByFormAnswerId()`, `deleteDocumentListFormDelete()`. |

Table gateways are also aliased: `MelisDocumentTable`, `MelisDocumentTransTable`,
`MelisDocumentUploadTable`, `MelisDocumentUploadRelationsTable`, `MelisDocumentListRelTable`,
`MelisDocumentUserTable`.

## Backoffice

The module adds a tool under the marketing tools tree (`app.toolstree.php`,
`app.interface.php`), melisKey `melis_document_upload_tool` (name `tr_melisdocumentupload_title`),
served by `MelisDocumentUpload\Controller\DocumentUpload::render-tool`. It exposes two datatable
tabs:

- **Uploaded** (`melis_document_upload_content_tabs_uploaded`) — uploaded files, via the
  `DocumentUpload` controller.
- **List** (`melis_document_upload_content_tabs_list`) — document definitions, via the
  `DocumentUploadList` controller.

Editing happens in modals (`melis_document_uploaded_modal`, `melis_document_upload_item_modal`).
The list datatables are fed by AJAX `getList` actions (e.g.
`/melis/MelisDocumentUpload/DocumentUpload/getList`). Controllers:
`DocumentUploadController`, `DocumentUploadListController`, `DocumentUploadedFormCreatorController`.

**MelisFormCreator integration** — under the `melisformcreator` interface the module injects a
**Document** tab into the form edition page
(`melisformcreator_form_edition_page_content_tabs_document`), served by
`DocumentUploadedFormCreatorController`, so a form can require a configured document. Three
listeners (registered in `src/Module.php` on the `melis-backoffice` route) wire this together:
`DeleteListener`, `DocumentFormCreatorListener`, `DocumentFormCreatorInstructionListener`.

## Front office

The module is not a templating plugin. Uploaded files are exposed through a **token URL** and a
view helper:

- **Public view route** — `melis-backoffice/melisdocument` (`/melis/melisdocument?token=<token>`),
  handled by `DocumentUploadController::viewAction`. The token resolves to a row in
  `melis_docupl_documents_uploaded` and the file is streamed with its stored MIME type. The route is
  declared in `meliscore` `excluded_routes` (no backoffice auth).
- **`DocumentUploadHelper`** view helper (alias `DocumentUploadHelper`) —
  `$this->DocumentUploadHelper($documentTypeId, $template, $objectId, $docUplRelationId)` renders the
  upload widget HTML for a document definition, picking the DEFAULT or CUSTOM template.

**Controller plugins** render and (de)serialise the upload form:
`MelisDocumentUploadTemplatePlugin` (abstract base, methods `render()`, `validateForm()`,
`encodeCustomDatas()`/`decodeCustomDatas()`), `MelisDocumentUploadTemplateDefaultPlugin` (DEFAULT
type) and `MelisDocumentUploadTemplateCustomPlugin` (CUSTOM type, extra fields). A CUSTOM definition
names its own plugin class in `mdud_doc_class`.

## Database tables

Created by `install/dbdeploy/` (dbdeploy is enabled in `composer.json`).

| Table | Role |
| --- | --- |
| `melis_docupl_documents` | Upload **definitions**: `mdud_type` (`DEFAULT`/`CUSTOM`), `mdud_file_saving_type` (`DB`/`FILESYSTEM`), `mdud_file_saving_path_from_root`, `mdud_max_size_mb`, `mdud_doc_class`, `mdud_is_mandatory`, `isactive`. |
| `melis_docupl_documents_trans` | Per-language **names** for a definition (`mdudtr_lang_id`, `mdudtr_name`). |
| `melis_docupl_documents_uploaded` | **Uploaded files**: name, size, MIME (`mdud_file_mimetype`), extension, `mdudu_saving_type`, `mdudu_file_object` (BLOB), `mdudu_token`, uploader, `mdudu_upload_date`, `isactive`. |
| `melis_docupl_docs_relations` | Links an uploaded file to an object (`mdudr_type`, e.g. `Form_answer`, + `mdudr_object_id`). |
| `melis_docupl_documents_lists_rel` | Links a definition to a form object (`mdudlr_object_type` = `FORM`). |

## Example

Validate, store an uploaded file for a document definition, then build its public URL:

```php
$uploadService = $this->getServiceManager()->get('MelisDocumentUploadService');

// $docId = a melis_docupl_documents.mdud_id ; $_FILES['my_field'] = the uploaded file
$res = $uploadService->processUpload($docId, $_FILES['my_field'], [
    'mdudr_type'      => 'Form_answer',
    'mdudr_object_id' => $formAnswerId,
]);

if ($res['success']) {
    $url = $res['fileUrl']; // e.g. https://mysite.local/melis/melisdocument?token=...
}
```

## Key files

| Concern | Path |
| --- | --- |
| Module config / routes / services | `vendor/melisplatform/melis-document-upload/config/module.config.php` |
| Backoffice tool tree & interface | `vendor/melisplatform/melis-document-upload/config/app.toolstree.php`, `config/app.interface.php` |
| Datatables config | `vendor/melisplatform/melis-document-upload/config/app.tools.php` |
| Upload service | `vendor/melisplatform/melis-document-upload/src/Service/MelisDocumentUploadService.php` |
| Definition service | `vendor/melisplatform/melis-document-upload/src/Service/MelisDocumentService.php` |
| Public view + tool controller | `vendor/melisplatform/melis-document-upload/src/Controller/DocumentUploadController.php` |
| FormCreator controller | `vendor/melisplatform/melis-document-upload/src/Controller/DocumentUploadedFormCreatorController.php` |
| View helper | `vendor/melisplatform/melis-document-upload/src/View/Helper/DocumentUploadHelper.php` |
| Render plugins | `vendor/melisplatform/melis-document-upload/src/Controller/Plugin/` |
| Listeners | `vendor/melisplatform/melis-document-upload/src/Listener/` |
| Schema | `vendor/melisplatform/melis-document-upload/install/dbdeploy/` |
