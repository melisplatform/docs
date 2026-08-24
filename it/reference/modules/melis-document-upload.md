# MelisDocumentUpload

> Gestione del caricamento documenti nel backoffice come strumento React nativo: definisci i tipi di
> documento, raccogli, archivia e distribuisci i file caricati, e collegali alle risposte di
> MelisFormCreator. Pacchetto `melisplatform/melis-document-upload`.

## Scopo

`MelisDocumentUpload` è uno strumento riutilizzabile per la raccolta di documenti. Definisci i **tipi
di documento** che vuoi raccogliere (un passaporto, un giustificativo di domicilio…), quindi esplori i
**file effettivamente caricati** — archiviati sul **filesystem** (sotto `data/`) o nel **database**
come BLOB, e restituiti tramite un **URL con token** stabile che non richiede il login al backoffice.
Il suo principale consumatore è **MelisFormCreator**, che può richiedere un documento e associare un
caricamento a una specifica risposta di un modulo.

In v6 lo strumento è distribuito come **brick React nativo** nel backoffice `/melis-react`. Il livello
React possiede l'intera interfaccia e la sua API JSON; tutta la logica di business (validazione,
archiviazione, token, relazioni) rimane nei servizi Laminas del modulo, invariata rispetto a v5.

## Come attivarlo

Modulo Laminas standard, già elencato in `config/melis.module.load.php` come `'MelisDocumentUpload'`.
Se lo aggiungi manualmente:

```php
// config/melis.module.load.php
return [
    // …
    'MelisDocumentUpload',
];
```

Poi `composer require melisplatform/melis-document-upload`. Dipende da `melisplatform/melis-core`;
l'integrazione con MelisFormCreator (colonne Form Type / Status, il requisito "document" del modulo)
compare solo quando MelisFormCreator è attivo. Il brick viene rilevato tramite
`GET /melis/react-api/react-modules` e appare solo quando il modulo è attivo.

## Il backoffice React

Il brick registra una singola pagina con routing (`DocumentUploadPage`) sotto l'id del brick
**`melis-document-upload`**. Compare nella barra laterale sotto **MelisMarketing → Document Upload** e
si apre sulla scheda **Uploaded documents**. Un banco di lavoro a due schede:

- **Uploaded documents** — esplora i file effettivamente caricati (ID, Document name, Owner, Size,
  Type, File/Form name, Form Answer ID, Upload date). Caricane uno nuovo, riassegna il proprietario,
  visualizzalo tramite il suo URL con token, oppure eliminalo.
- **Document List (types)** — gestisci le definizioni dei documenti (ID, Name, Model DEFAULT/CUSTOM,
  Type di archiviazione FILESYSTEM/DB, Max size, Path; oltre a Form Type / Status quando
  MelisFormCreator è attivo). Aggiungi / modifica / elimina.

Entrambe le schede presentano **schede KPI** (Total / In database / Filesystem), ricerca in tempo
reale, un **gestore delle colonne** persistente (trascina per riordinare / nascondere) ed **esporta**
(xlsx/CSV). Aprendo una riga o **Add** si apre il relativo modulo come **sotto-scheda** nativa nella
SubTabBar dell'host (URL `/melis-document-upload/:sub`, ad es. `type-new`, `type-5`, `uploaded-new`,
`uploaded-12`).

Un interruttore **New / Old** in alto a destra (`ViewToggle.tsx`) mostra il classico strumento legacy
in un iframe all'indirizzo `/melis/react-tool-page?key=melis_document_upload_tool` per confronto.

![La scheda Uploaded documents (React): elenco dei file caricati con schede KPI, ricerca, gestore delle colonne e l'interruttore New/Old.](/screenshots/react/melis-document-upload/melisdocumentupload-tool-docupload-list.png)

### Scheda Uploaded documents

Azioni di riga **edit** (riassegna il proprietario / visualizza il file) e **delete** (modale di
conferma). **Upload Document** apre il modulo di caricamento come sotto-scheda: **Owner** è un
typeahead servito dal server, **Document name** è un menu a discesa delle tue definizioni. Salvando con
un file viene eseguito lo stesso `processUpload` lato server (validazione, spostamento su filesystem o
blob nel DB, token). Modificando senza un nuovo file si riassegna solo il proprietario. **View file**
risolve l'URL pubblico con token del file.

![Modulo del documento caricato (sotto-scheda React): scegli il proprietario, il Document name, il file, poi Save.](/screenshots/react/melis-document-upload/melisdocumentupload-tool-docupload-list-edit-modal.png)

### Scheda Document List (types)

![La scheda Document List (React): definizioni dei tipi di documento con schede KPI, gestore delle colonne ed esportazione.](/screenshots/react/melis-document-upload/melisdocumentupload-tool-docupload-typedoclist.png)

Il modulo del tipo presenta il **Name** per lingua, una **Description** in rich-text, un **Class name
for custom rendering documents** (compilalo per rendere il tipo CUSTOM), un **Max Size (Mb)**, il
**Type** di archiviazione (Filesystem + un percorso da DOCROOT, oppure Database), un interruttore **Is
the document mandatory?**, e — quando MelisFormCreator è attivo — **Display** (ALL / MANUAL) e **Form
status**. Per un tipo Filesystem, il percorso di salvataggio è validato lato server contro il path
traversal (`..`, i backslash e i caratteri non appartenenti a `[A-Za-z0-9_-/]` vengono rifiutati).

![Modulo del tipo di documento (sotto-scheda React): Name per lingua, classe custom, Max Size, Type di archiviazione + percorso, interruttore obbligatorietà.](/screenshots/react/melis-document-upload/melisdocumentupload-tool-docupload-typedoclist-edit-modal.png)

## API JSON React

Non esiste alcun **`config/react-api.php`**. Gli endpoint React sono azioni di
`MelisDocumentUpload\Controller\DocumentUploadReactApiController` (che estende
`DocumentUploadListController` e riutilizza i servizi del modulo), raggiunti tramite la rotta MVC
catch-all esistente del modulo. Ogni URL ha la forma
`/melis/MelisDocumentUpload/DocumentUploadReactApi/<action>`. Poiché la catch-all rifiuta un terzo
segmento di percorso, **gli id vengono passati come parametri query `?id=`** e le eliminazioni sono
`POST …?id=`.

Ogni azione chiama per prima cosa `denyUnlessAccess()` (autenticazione tramite
`MelisCoreAuth->hasIdentity()` + `MelisCoreRights->canAccess('melis_document_upload_tool')`, restituisce
401 / 403). Contratto di risposta ovunque: `{ success: bool, data: T, error?: string, errors?: {...} }`
(17 endpoint in totale).

| Metodo · URL (`…/DocumentUploadReactApi/…`) | Scopo · servizio |
| --- | --- |
| `GET /meta` | quali moduli opzionali sono attivi (`formCreator`, `formEngine`) |
| `GET /languages` | lingue della piattaforma ordinate |
| `GET /typesList?search=` | elenca le definizioni (`MelisDocumentService::getList`) |
| `GET /typesStats` | schede KPI (total / db / filesystem) |
| `GET /formOptions` | stati FormCreator + modalità di visualizzazione (quando attivo) |
| `GET /typesGet?id=` | record completo + nomi per lingua |
| `POST /typesSave` | crea/aggiorna (`saveDocumentItem`; valida il percorso FS) |
| `POST /typesDelete?id=` | eliminazione soft (`deleteDocumentItem`) |
| `GET /uploadedList?search=` | elenca i file caricati (`MelisDocumentUploadService::getList`) |
| `GET /uploadedStats` | schede KPI |
| `GET /uploadedGet?id=` | singolo documento caricato |
| `POST /uploadedSave` (multipart) | carica un file (`processUpload`) |
| `POST /uploadedUserSave` | riassegna solo il proprietario di una riga esistente |
| `POST /uploadedDelete?id=` | elimina (`deleteDocumentUpload`) |
| `GET /uploadedFileUrl?id=` | URL pubblico con token (`getDocumentUrl`) |
| `GET /documentOptions` | opzioni del tipo di documento per il menu a discesa di caricamento |
| `GET /boUsers?phrase=` | typeahead degli utenti BO per il campo proprietario |

```ts
// document-upload-api.ts — BASE = '/melis/MelisDocumentUpload/DocumentUploadReactApi'
const res = await fetch(`${BASE}/uploadedList?search=`, {
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
  credentials: 'include',
})
const { success, data } = await res.json()  // data: { items: UploadedItem[], total }
```

## Capacità

`config/react.capabilities.php` (unito in `getConfig()`, letto da
`MelisReactApi\Service\Capabilities`) è indicizzato sotto il nodo di menu titolare dei diritti
`melis_document_upload_tool` — la stessa melisKey che il controller protegge e che `DocumentUploadPage`
passa a `useCaps()`. Dichiara **2 schede**, ciascuna con le stesse cinque azioni:

```php
'melisReactToolCapabilities' => [
  'melis_document_upload_tool' => [
    'tabs' => [
      ['key' => 'uploaded', 'label' => 'tr_melisdocumentupload_content_tabs_uploaded',
        'actions' => ['list', 'create', 'edit', 'delete', 'export']],
      ['key' => 'types', 'label' => 'tr_melisdocumentupload_content_tabs_list',
        'actions' => ['list', 'create', 'edit', 'delete', 'export']],
    ],
  ],
],
```

I controlli `can()` di React (`uploaded.create`, `types.export`, …) mascherano i pulsanti per comodità;
l'applicazione reale lato server è la protezione di accesso a livello di strumento
(`canAccess('melis_document_upload_tool')`) eseguita da ogni azione.

## Servizi principali

Registrati come alias `service_manager` in `config/module.config.php`. Tutti estendono
`MelisCore\Service\MelisGeneralService` (ogni metodo scatena gli eventi `*_start` / `*_end`).

| Alias del servizio | Ruolo |
| --- | --- |
| `MelisDocumentService` | Gestisce le **definizioni dei documenti** (tabella `melis_docupl_documents`): `getList()`, `getItemById()`, `saveDocumentItem()`, `deleteDocumentItem()` (eliminazione soft tramite `isactive`), `getDocumentByDocumentId()`, nomi multilingua tramite `saveFormDocumentTranslation()` / `getDocumentTranslation()`. |
| `MelisDocumentUploadService` | Gestisce i **file caricati**. `processUpload($docId, $file, $postValues)` valida, archivia (FILESYSTEM o DB), registra la riga e assegna un token; `uploadFile()`, `saveDocumentUploaded()`, `deleteDocumentUpload()`, `getDocumentUploadByToken()`, `getDocumentUrl($docUploadId)` (restituisce l'URL `?token=…`), `getLatestDocumentUploadByDocId()`. |
| `MelisDocumentUploadRelationsService` | Legge le relazioni caricamento→risposta: `getLatestDocumentUploadedDataByIdAndObjectId()`, `getDocUplRelationData()`. |
| `MelisDocumentUploadListRelService` | Gestisce le relazioni definizione→oggetto-modulo (`melis_docupl_documents_lists_rel`): `saveDocumentUploadForm()`, `saveFormDocument()`, `getDocumentsByFormAnswerId()`, `getDocumentsDoneByFormAnswerId()`, `deleteDocumentListFormDelete()`. |

Anche i table gateway hanno un alias: `MelisDocumentTable`, `MelisDocumentTransTable`,
`MelisDocumentUploadTable`, `MelisDocumentUploadRelationsTable`, `MelisDocumentListRelTable`,
`MelisDocumentUserTable`.

## Front office

Il modulo non è un plugin di templating. I file caricati sono esposti tramite un **URL con token** e un
view helper:

- **Rotta di visualizzazione pubblica** — `melis-backoffice/melisdocument`
  (`/melis/melisdocument?token=<token>`), gestita da `DocumentUploadController::viewAction`. Il token si
  risolve in una riga di `melis_docupl_documents_uploaded` e il file viene trasmesso in streaming con il
  suo MIME type archiviato. La rotta è dichiarata negli `excluded_routes` di `meliscore` (nessuna
  autenticazione backoffice).
- **View helper `DocumentUploadHelper`** (alias `DocumentUploadHelper`) —
  `$this->DocumentUploadHelper($documentTypeId, $template, $objectId, $docUplRelationId)` esegue il
  rendering dell'HTML del widget di caricamento per una definizione di documento, scegliendo il template
  DEFAULT o CUSTOM.

**I plugin del controller** eseguono il rendering e la (de)serializzazione del modulo di caricamento:
`MelisDocumentUploadTemplatePlugin` (base astratta, metodi `render()`, `validateForm()`,
`encodeCustomDatas()`/`decodeCustomDatas()`), `MelisDocumentUploadTemplateDefaultPlugin` (tipo DEFAULT)
e `MelisDocumentUploadTemplateCustomPlugin` (tipo CUSTOM, campi extra). Una definizione CUSTOM indica la
propria classe di plugin in `mdud_doc_class`.

## Integrazione con MelisFormCreator

Sotto l'interfaccia `melisformcreator` il modulo inietta una scheda **Document** nella pagina di
edizione del modulo (`melisformcreator_form_edition_page_content_tabs_document`), servita da
`DocumentUploadedFormCreatorController`, così che un modulo possa richiedere un documento configurato.
Tre listener registrati in `src/Module.php` sulla rotta `melis-backoffice` collegano il tutto:
`DeleteListener`, `DocumentFormCreatorListener`, `DocumentFormCreatorInstructionListener`. Una volta che
un modulo raccoglie documenti, i file delle risposte compaiono nella scheda **Uploaded documents**.

## Tabelle del database

Create da `install/dbdeploy/` (dbdeploy è abilitato in `composer.json`).

| Tabella | Ruolo |
| --- | --- |
| `melis_docupl_documents` | **Definizioni** di caricamento: `mdud_type` (`DEFAULT`/`CUSTOM`), `mdud_file_saving_type` (`DB`/`FILESYSTEM`), `mdud_file_saving_path_from_root`, `mdud_max_size_mb`, `mdud_doc_class`, `mdud_is_mandatory`, `isactive`. |
| `melis_docupl_documents_trans` | **Nomi** per lingua di una definizione (`mdudtr_lang_id`, `mdudtr_name`). |
| `melis_docupl_documents_uploaded` | **File caricati**: nome, dimensione, MIME (`mdud_file_mimetype`), estensione, `mdudu_saving_type`, `mdudu_file_object` (BLOB), `mdudu_token`, autore del caricamento, `mdudu_upload_date`, `isactive`. |
| `melis_docupl_docs_relations` | Collega un file caricato a un oggetto (`mdudr_type`, ad es. `Form_answer`, + `mdudr_object_id`). |
| `melis_docupl_documents_lists_rel` | Collega una definizione a un oggetto modulo (`mdudlr_object_type` = `FORM`). |

## Esempio

Valida, archivia un file caricato per una definizione di documento, quindi costruisci il suo URL
pubblico:

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

## File chiave

| Ambito | Percorso |
| --- | --- |
| Config / rotte / servizi del modulo | `config/module.config.php` |
| Capacità React (2 schede, nessun `react-api.php`) | `config/react.capabilities.php` |
| Sorgente del brick React | `ui-react/src/` (`brick.tsx`, `DocumentUploadPage.tsx`, `document-upload-api.ts`) |
| Brick compilato | `public/ui-react/brick.js`, `public/ui-react/brick.manifest.json` |
| Controller dell'API React (17 azioni) | `src/Controller/DocumentUploadReactApiController.php` |
| Servizio di caricamento | `src/Service/MelisDocumentUploadService.php` |
| Servizio delle definizioni | `src/Service/MelisDocumentService.php` |
| Vista pubblica + controller dello strumento | `src/Controller/DocumentUploadController.php` |
| Controller FormCreator | `src/Controller/DocumentUploadedFormCreatorController.php` |
| View helper | `src/View/Helper/DocumentUploadHelper.php` |
| Plugin di rendering | `src/Controller/Plugin/` |
| Listener | `src/Listener/` |
| Schema | `install/dbdeploy/` |
