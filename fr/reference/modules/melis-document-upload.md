# MelisDocumentUpload

> Gestion des téléversements de documents en back-office : définir des configurations d'upload,
> stocker et servir les fichiers téléversés, et les rattacher aux réponses de MelisFormCreator.
> Paquet `melisplatform/melis-document-upload`.

## Objectif

`MelisDocumentUpload` permet de définir des **configurations de téléversement de documents** (un nom,
une taille maximale autorisée, une stratégie de stockage et un type), puis de collecter, stocker et
servir les fichiers correspondants. Les fichiers peuvent être enregistrés sur le **système de
fichiers** (sous `data/melis_document_upload/`) ou en **base de données** sous forme de BLOB. Chaque
fichier téléversé reçoit un **token** unique permettant de le consulter/télécharger via une URL
publique stable, sans authentification back-office. Le module s'intègre à `MelisFormCreator` : un
formulaire peut exiger un document et les téléversements sont liés à une réponse de formulaire
précise.

## Activation

C'est un module Laminas standard, déjà listé dans `config/melis.module.load.php` sous
`'MelisDocumentUpload'`. Pour l'ajouter manuellement, `composer require
melisplatform/melis-document-upload` puis ajoutez le nom du module à ce fichier. Il dépend de
`melisplatform/melis-core` (`^5.3`) ; l'intégration MelisFormCreator (onglets back-office
supplémentaires et l'exigence de document dans le formulaire) n'apparaît que si MelisFormCreator est
installé. Voir [Référence des modules](/fr/reference/modules).

## Services principaux

Déclarés comme alias `service_manager` dans `config/module.config.php`. Tous étendent
`MelisCore\Service\MelisGeneralService` (chaque méthode émet des événements `*_start` / `*_end`).

| Alias de service | Rôle |
| --- | --- |
| `MelisDocumentService` | Gère les **définitions de documents** (table `melis_docupl_documents`) : `getList()`, `getItemById()`, `saveDocumentItem()`, `deleteDocumentItem()` (suppression logique via `isactive`), `getDocumentByDocumentId()`, noms multilingues via `saveFormDocumentTranslation()` / `getDocumentTranslation()`. |
| `MelisDocumentUploadService` | Gère les **fichiers téléversés**. `processUpload($docId, $file, $postValues)` valide, stocke (FILESYSTEM ou DB), crée l'enregistrement et assigne un token ; `uploadFile()`, `saveDocumentUploaded()`, `deleteDocumentUpload()`, `getDocumentUploadByToken()`, `getDocumentUrl($docUploadId)` (renvoie l'URL `?token=…`), `getLatestDocumentUploadByDocId()`. |
| `MelisDocumentUploadRelationsService` | Lit les relations téléversement→réponse : `getLatestDocumentUploadedDataByIdAndObjectId()`, `getDocUplRelationData()`. |
| `MelisDocumentUploadListRelService` | Gère les relations définition→objet de formulaire (`melis_docupl_documents_lists_rel`) : `saveDocumentUploadForm()`, `saveFormDocument()`, `getDocumentsByFormAnswerId()`, `getDocumentsDoneByFormAnswerId()`, `deleteDocumentListFormDelete()`. |

Les passerelles de tables sont aussi aliasées : `MelisDocumentTable`, `MelisDocumentTransTable`,
`MelisDocumentUploadTable`, `MelisDocumentUploadRelationsTable`, `MelisDocumentListRelTable`,
`MelisDocumentUserTable`.

## Back-office

Le module ajoute un outil dans l'arbre des outils marketing (`app.toolstree.php`,
`app.interface.php`), melisKey `melis_document_upload_tool` (nom `tr_melisdocumentupload_title`),
servi par `MelisDocumentUpload\Controller\DocumentUpload::render-tool`. Il expose deux onglets de
type datatable :

- **Téléversés** (`melis_document_upload_content_tabs_uploaded`) — les fichiers téléversés, via le
  contrôleur `DocumentUpload`.
- **Liste** (`melis_document_upload_content_tabs_list`) — les définitions de documents, via le
  contrôleur `DocumentUploadList`.

L'édition se fait dans des modales (`melis_document_uploaded_modal`,
`melis_document_upload_item_modal`). Les datatables sont alimentées par des actions AJAX `getList`
(p. ex. `/melis/MelisDocumentUpload/DocumentUpload/getList`). Contrôleurs :
`DocumentUploadController`, `DocumentUploadListController`, `DocumentUploadedFormCreatorController`.

**Intégration MelisFormCreator** — sous l'interface `melisformcreator`, le module injecte un onglet
**Document** dans la page d'édition de formulaire
(`melisformcreator_form_edition_page_content_tabs_document`), servi par
`DocumentUploadedFormCreatorController`, afin qu'un formulaire puisse exiger un document configuré.
Trois listeners (enregistrés dans `src/Module.php` sur la route `melis-backoffice`) assurent cette
liaison : `DeleteListener`, `DocumentFormCreatorListener`, `DocumentFormCreatorInstructionListener`.

## Front-office

Le module n'est pas un plugin de templating. Les fichiers téléversés sont exposés via une **URL à
token** et un view helper :

- **Route de consultation publique** — `melis-backoffice/melisdocument`
  (`/melis/melisdocument?token=<token>`), gérée par `DocumentUploadController::viewAction`. Le token
  résout une ligne de `melis_docupl_documents_uploaded` et le fichier est servi avec son type MIME
  stocké. La route est déclarée dans les `excluded_routes` de `meliscore` (pas d'authentification
  back-office).
- **View helper `DocumentUploadHelper`** (alias `DocumentUploadHelper`) —
  `$this->DocumentUploadHelper($documentTypeId, $template, $objectId, $docUplRelationId)` rend le HTML
  du widget d'upload pour une définition de document, en choisissant le template DEFAULT ou CUSTOM.

**Plugins de contrôleur** pour le rendu et la (dé)sérialisation du formulaire d'upload :
`MelisDocumentUploadTemplatePlugin` (base abstraite, méthodes `render()`, `validateForm()`,
`encodeCustomDatas()`/`decodeCustomDatas()`), `MelisDocumentUploadTemplateDefaultPlugin` (type
DEFAULT) et `MelisDocumentUploadTemplateCustomPlugin` (type CUSTOM, champs supplémentaires). Une
définition CUSTOM indique sa propre classe de plugin dans `mdud_doc_class`.

## Tables de base de données

Créées par `install/dbdeploy/` (dbdeploy est activé dans `composer.json`).

| Table | Rôle |
| --- | --- |
| `melis_docupl_documents` | **Définitions** d'upload : `mdud_type` (`DEFAULT`/`CUSTOM`), `mdud_file_saving_type` (`DB`/`FILESYSTEM`), `mdud_file_saving_path_from_root`, `mdud_max_size_mb`, `mdud_doc_class`, `mdud_is_mandatory`, `isactive`. |
| `melis_docupl_documents_trans` | **Noms** par langue pour une définition (`mdudtr_lang_id`, `mdudtr_name`). |
| `melis_docupl_documents_uploaded` | **Fichiers téléversés** : nom, taille, MIME (`mdud_file_mimetype`), extension, `mdudu_saving_type`, `mdudu_file_object` (BLOB), `mdudu_token`, auteur, `mdudu_upload_date`, `isactive`. |
| `melis_docupl_docs_relations` | Lie un fichier téléversé à un objet (`mdudr_type`, p. ex. `Form_answer`, + `mdudr_object_id`). |
| `melis_docupl_documents_lists_rel` | Lie une définition à un objet de formulaire (`mdudlr_object_type` = `FORM`). |

## Exemple

Valider, stocker un fichier téléversé pour une définition de document, puis construire son URL
publique :

```php
$uploadService = $this->getServiceManager()->get('MelisDocumentUploadService');

// $docId = un melis_docupl_documents.mdud_id ; $_FILES['my_field'] = le fichier téléversé
$res = $uploadService->processUpload($docId, $_FILES['my_field'], [
    'mdudr_type'      => 'Form_answer',
    'mdudr_object_id' => $formAnswerId,
]);

if ($res['success']) {
    $url = $res['fileUrl']; // ex. https://mysite.local/melis/melisdocument?token=...
}
```

## Fichiers clés

| Sujet | Chemin |
| --- | --- |
| Config module / routes / services | `vendor/melisplatform/melis-document-upload/config/module.config.php` |
| Arbre d'outils & interface back-office | `vendor/melisplatform/melis-document-upload/config/app.toolstree.php`, `config/app.interface.php` |
| Config des datatables | `vendor/melisplatform/melis-document-upload/config/app.tools.php` |
| Service d'upload | `vendor/melisplatform/melis-document-upload/src/Service/MelisDocumentUploadService.php` |
| Service de définition | `vendor/melisplatform/melis-document-upload/src/Service/MelisDocumentService.php` |
| Contrôleur vue publique + outil | `vendor/melisplatform/melis-document-upload/src/Controller/DocumentUploadController.php` |
| Contrôleur FormCreator | `vendor/melisplatform/melis-document-upload/src/Controller/DocumentUploadedFormCreatorController.php` |
| View helper | `vendor/melisplatform/melis-document-upload/src/View/Helper/DocumentUploadHelper.php` |
| Plugins de rendu | `vendor/melisplatform/melis-document-upload/src/Controller/Plugin/` |
| Listeners | `vendor/melisplatform/melis-document-upload/src/Listener/` |
| Schéma | `vendor/melisplatform/melis-document-upload/install/dbdeploy/` |
