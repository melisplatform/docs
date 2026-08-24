# MelisDocumentUpload

> Backoffice-Verwaltung des Dokument-Uploads als natives React-Werkzeug: Dokumenttypen definieren,
> hochgeladene Dateien sammeln, speichern und ausliefern sowie sie an MelisFormCreator-Antworten
> anhängen. Paket `melisplatform/melis-document-upload`.

## Zweck

`MelisDocumentUpload` ist ein wiederverwendbares Werkzeug zur Dokumenterfassung. Sie definieren die
**Dokumenttypen**, die Sie erfassen möchten (einen Reisepass, einen Adressnachweis …), und
durchsuchen anschließend die tatsächlich **hochgeladenen Dateien** — gespeichert im **Dateisystem**
(unter `data/`) oder in der **Datenbank** als BLOB und über eine stabile **Token-URL** ausgeliefert,
die keine Backoffice-Anmeldung erfordert. Der wichtigste Abnehmer ist **MelisFormCreator**, der ein
Dokument verlangen und einen Upload an eine bestimmte Formularantwort binden kann.

In v6 wird das Werkzeug als **native, vollständig React-basierte Brick** im `/melis-react`-Backoffice
ausgeliefert. Die React-Schicht besitzt die gesamte Oberfläche und ihre JSON-API; die gesamte
Geschäftslogik (Validierung, Speicherung, Token, Beziehungen) verbleibt unverändert in den
Laminas-Services des Moduls, so wie in v5.

## Aktivierung

Standard-Laminas-Modul, bereits in `config/melis.module.load.php` als `'MelisDocumentUpload'`
aufgeführt. Falls Sie es manuell hinzufügen:

```php
// config/melis.module.load.php
return [
    // …
    'MelisDocumentUpload',
];
```

Anschließend `composer require melisplatform/melis-document-upload`. Es hängt von
`melisplatform/melis-core` ab; die MelisFormCreator-Integration (Spalten Form Type / Status, die
Dokument-Anforderung im Formular) erscheint nur, wenn MelisFormCreator aktiv ist. Die Brick wird über
`GET /melis/react-api/react-modules` erkannt und nur angezeigt, wenn das Modul aktiv ist.

## Das React-Backoffice

Die Brick registriert eine einzelne geroutete Seite (`DocumentUploadPage`) unter der Brick-ID
**`melis-document-upload`**. Sie erscheint in der Seitenleiste unter **MelisMarketing → Document
Upload** und öffnet sich auf dem Tab **Uploaded documents**. Ein Arbeitsbereich mit zwei Tabs:

- **Uploaded documents** — durchsuchen Sie die tatsächlich hochgeladenen Dateien (ID, Document name,
  Owner, Size, Type, File/Form name, Form Answer ID, Upload date). Laden Sie eine neue hoch, weisen
  Sie ihren Eigentümer neu zu, betrachten Sie sie über ihre Token-URL oder löschen Sie sie.
- **Document List (types)** — verwalten Sie die Dokumentdefinitionen (ID, Name, Model DEFAULT/CUSTOM,
  Speicher-Type FILESYSTEM/DB, Max size, Path; zusätzlich Form Type / Status, wenn MelisFormCreator
  aktiv ist). Hinzufügen / Bearbeiten / Löschen.

Beide Tabs verfügen über **KPI-Karten** (Gesamt / In Datenbank / Dateisystem), Live-Suche, einen
persistierten **Spaltenmanager** (zum Neuordnen / Ausblenden ziehen) und **Export** (xlsx/CSV). Das
Öffnen einer Zeile oder **Add** öffnet ihr Formular als natives **Unter-Tab** in der SubTabBar des
Hosts (URL `/melis-document-upload/:sub`, z. B. `type-new`, `type-5`, `uploaded-new`, `uploaded-12`).

Ein Umschalter **New / Old** oben rechts (`ViewToggle.tsx`) zeigt zum Vergleich das klassische
Legacy-Werkzeug in einem iframe unter
`/melis/react-tool-page?key=melis_document_upload_tool`.

![Der Tab „Uploaded documents“ (React): Liste der hochgeladenen Dateien mit KPI-Karten, Suche, Spaltenmanager und dem New/Old-Umschalter.](/screenshots/react/melis-document-upload/melisdocumentupload-tool-docupload-list.png)

### Tab „Uploaded documents“

Zeilenaktionen **edit** (Eigentümer neu zuweisen / Datei betrachten) und **delete** (Bestätigungsdialog).
**Upload Document** öffnet das Upload-Formular als Unter-Tab: der **Owner** ist ein serverseitig
gestützter Typeahead, **Document name** ist ein Dropdown Ihrer Definitionen. Das Speichern mit einer
Datei führt denselben serverseitigen `processUpload` aus (Validierung, Verschieben ins Dateisystem
oder DB-BLOB, Token). Das Bearbeiten ohne neue Datei weist lediglich den Eigentümer neu zu. **View
file** ermittelt die öffentliche Token-URL der Datei.

![Formular für ein hochgeladenes Dokument (React-Unter-Tab): Eigentümer, Document name und Datei auswählen, dann Save.](/screenshots/react/melis-document-upload/melisdocumentupload-tool-docupload-list-edit-modal.png)

### Tab „Document List (types)“

![Der Tab „Document List“ (React): Definitionen der Dokumenttypen mit KPI-Karten, Spaltenmanager und Export.](/screenshots/react/melis-document-upload/melisdocumentupload-tool-docupload-typedoclist.png)

Das Typ-Formular enthält den sprachspezifischen **Name**, eine Rich-Text-**Description**, einen
**Class name for custom rendering documents** (das Ausfüllen macht den Typ zu CUSTOM), eine **Max Size
(Mb)**, den Speicher-**Type** (Filesystem + ein Pfad ab DOCROOT oder Database), einen Umschalter **Is
the document mandatory?** und — wenn MelisFormCreator aktiv ist — **Display** (ALL / MANUAL) und **Form
status**. Bei einem Filesystem-Typ wird der Speicherpfad serverseitig gegen Path-Traversal validiert
(`..`, Backslashes und Zeichen außerhalb von `[A-Za-z0-9_-/]` werden abgewiesen).

![Formular für einen Dokumenttyp (React-Unter-Tab): Name pro Sprache, Custom-Klasse, Max Size, Speicher-Type + Pfad, Pflicht-Umschalter.](/screenshots/react/melis-document-upload/melisdocumentupload-tool-docupload-typedoclist-edit-modal.png)

## React-JSON-API

Es gibt **keine `config/react-api.php`**. Die React-Endpunkte sind Aktionen von
`MelisDocumentUpload\Controller\DocumentUploadReactApiController` (das
`DocumentUploadListController` erweitert und die Services des Moduls wiederverwendet), erreichbar über
die bestehende Catch-all-MVC-Route des Moduls. Jede URL hat die Form
`/melis/MelisDocumentUpload/DocumentUploadReactApi/<action>`. Da die Catch-all-Route ein drittes
Pfadsegment ablehnt, werden **IDs als `?id=`-**Query-Parameter übergeben und Löschungen sind `POST …?id=`.

Jede Aktion ruft zuerst `denyUnlessAccess()` auf (Authentifizierung über
`MelisCoreAuth->hasIdentity()` + `MelisCoreRights->canAccess('melis_document_upload_tool')`, gibt
401 / 403 zurück). Response-Vertrag überall:
`{ success: bool, data: T, error?: string, errors?: {...} }` (insgesamt 17 Endpunkte).

| Methode · URL (`…/DocumentUploadReactApi/…`) | Zweck · Service |
| --- | --- |
| `GET /meta` | welche optionalen Module aktiv sind (`formCreator`, `formEngine`) |
| `GET /languages` | geordnete Plattformsprachen |
| `GET /typesList?search=` | Definitionen auflisten (`MelisDocumentService::getList`) |
| `GET /typesStats` | KPI-Karten (Gesamt / DB / Dateisystem) |
| `GET /formOptions` | FormCreator-Status + Anzeigemodi (wenn aktiv) |
| `GET /typesGet?id=` | vollständiger Datensatz + sprachspezifische Namen |
| `POST /typesSave` | erstellen/aktualisieren (`saveDocumentItem`; validiert FS-Pfad) |
| `POST /typesDelete?id=` | Soft-Delete (`deleteDocumentItem`) |
| `GET /uploadedList?search=` | hochgeladene Dateien auflisten (`MelisDocumentUploadService::getList`) |
| `GET /uploadedStats` | KPI-Karten |
| `GET /uploadedGet?id=` | einzelnes hochgeladenes Dokument |
| `POST /uploadedSave` (multipart) | eine Datei hochladen (`processUpload`) |
| `POST /uploadedUserSave` | nur den Eigentümer einer bestehenden Zeile neu zuweisen |
| `POST /uploadedDelete?id=` | löschen (`deleteDocumentUpload`) |
| `GET /uploadedFileUrl?id=` | öffentliche Token-URL (`getDocumentUrl`) |
| `GET /documentOptions` | Dokumenttyp-Optionen für das Upload-Dropdown |
| `GET /boUsers?phrase=` | BO-Benutzer-Typeahead für das Feld „Owner“ |

```ts
// document-upload-api.ts — BASE = '/melis/MelisDocumentUpload/DocumentUploadReactApi'
const res = await fetch(`${BASE}/uploadedList?search=`, {
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
  credentials: 'include',
})
const { success, data } = await res.json()  // data: { items: UploadedItem[], total }
```

## Fähigkeiten (Capabilities)

`config/react.capabilities.php` (in `getConfig()` eingebunden, gelesen von
`MelisReactApi\Service\Capabilities`) ist unter dem rechtetragenden Menüknoten
`melis_document_upload_tool` verschlüsselt — demselben melisKey, den der Controller absichert und den
`DocumentUploadPage` an `useCaps()` übergibt. Er deklariert **2 Tabs**, jeder mit denselben fünf
Aktionen:

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

Die React-`can()`-Prüfungen (`uploaded.create`, `types.export`, …) blenden Schaltflächen zum Komfort
aus; die tatsächliche serverseitige Durchsetzung ist der Zugriffsschutz auf Werkzeugebene
(`canAccess('melis_document_upload_tool')`), der von jeder Aktion ausgeführt wird.

## Zentrale Services

Registriert als `service_manager`-Aliase in `config/module.config.php`. Alle erweitern
`MelisCore\Service\MelisGeneralService` (jede Methode löst `*_start` / `*_end`-Events aus).

| Service-Alias | Rolle |
| --- | --- |
| `MelisDocumentService` | Verwaltet **Dokumentdefinitionen** (Tabelle `melis_docupl_documents`): `getList()`, `getItemById()`, `saveDocumentItem()`, `deleteDocumentItem()` (Soft-Delete über `isactive`), `getDocumentByDocumentId()`, mehrsprachige Namen über `saveFormDocumentTranslation()` / `getDocumentTranslation()`. |
| `MelisDocumentUploadService` | Verarbeitet **hochgeladene Dateien**. `processUpload($docId, $file, $postValues)` validiert, speichert (FILESYSTEM oder DB), erfasst die Zeile und weist ein Token zu; `uploadFile()`, `saveDocumentUploaded()`, `deleteDocumentUpload()`, `getDocumentUploadByToken()`, `getDocumentUrl($docUploadId)` (gibt die `?token=…`-URL zurück), `getLatestDocumentUploadByDocId()`. |
| `MelisDocumentUploadRelationsService` | Liest Upload→Antwort-Beziehungen: `getLatestDocumentUploadedDataByIdAndObjectId()`, `getDocUplRelationData()`. |
| `MelisDocumentUploadListRelService` | Verwaltet Definition→Formularobjekt-Beziehungen (`melis_docupl_documents_lists_rel`): `saveDocumentUploadForm()`, `saveFormDocument()`, `getDocumentsByFormAnswerId()`, `getDocumentsDoneByFormAnswerId()`, `deleteDocumentListFormDelete()`. |

Auch die Table-Gateways sind als Aliase hinterlegt: `MelisDocumentTable`, `MelisDocumentTransTable`,
`MelisDocumentUploadTable`, `MelisDocumentUploadRelationsTable`, `MelisDocumentListRelTable`,
`MelisDocumentUserTable`.

## Front Office

Das Modul ist kein Templating-Plugin. Hochgeladene Dateien werden über eine **Token-URL** und einen
View-Helper bereitgestellt:

- **Öffentliche Anzeige-Route** — `melis-backoffice/melisdocument`
  (`/melis/melisdocument?token=<token>`), abgewickelt von `DocumentUploadController::viewAction`. Das
  Token wird zu einer Zeile in `melis_docupl_documents_uploaded` aufgelöst und die Datei wird mit
  ihrem gespeicherten MIME-Typ gestreamt. Die Route ist in `meliscore` unter `excluded_routes`
  deklariert (keine Backoffice-Authentifizierung).
- **`DocumentUploadHelper`** View-Helper (Alias `DocumentUploadHelper`) —
  `$this->DocumentUploadHelper($documentTypeId, $template, $objectId, $docUplRelationId)` rendert das
  HTML des Upload-Widgets für eine Dokumentdefinition und wählt dabei das DEFAULT- oder
  CUSTOM-Template.

**Controller-Plugins** rendern und (de)serialisieren das Upload-Formular:
`MelisDocumentUploadTemplatePlugin` (abstrakte Basis, Methoden `render()`, `validateForm()`,
`encodeCustomDatas()`/`decodeCustomDatas()`), `MelisDocumentUploadTemplateDefaultPlugin`
(DEFAULT-Typ) und `MelisDocumentUploadTemplateCustomPlugin` (CUSTOM-Typ, zusätzliche Felder). Eine
CUSTOM-Definition benennt ihre eigene Plugin-Klasse in `mdud_doc_class`.

## MelisFormCreator-Integration

Unter dem Interface `melisformcreator` fügt das Modul einen **Document**-Tab in die
Formularbearbeitungsseite ein (`melisformcreator_form_edition_page_content_tabs_document`),
bereitgestellt von `DocumentUploadedFormCreatorController`, sodass ein Formular ein konfiguriertes
Dokument verlangen kann. Drei in `src/Module.php` auf der `melis-backoffice`-Route registrierte
Listener verbinden dies miteinander: `DeleteListener`, `DocumentFormCreatorListener`,
`DocumentFormCreatorInstructionListener`. Sobald ein Formular Dokumente sammelt, erscheinen die Dateien
der Antworten im Tab **Uploaded documents**.

## Datenbanktabellen

Erstellt von `install/dbdeploy/` (dbdeploy ist in `composer.json` aktiviert).

| Tabelle | Rolle |
| --- | --- |
| `melis_docupl_documents` | Upload-**Definitionen**: `mdud_type` (`DEFAULT`/`CUSTOM`), `mdud_file_saving_type` (`DB`/`FILESYSTEM`), `mdud_file_saving_path_from_root`, `mdud_max_size_mb`, `mdud_doc_class`, `mdud_is_mandatory`, `isactive`. |
| `melis_docupl_documents_trans` | Sprachspezifische **Namen** für eine Definition (`mdudtr_lang_id`, `mdudtr_name`). |
| `melis_docupl_documents_uploaded` | **Hochgeladene Dateien**: Name, Größe, MIME (`mdud_file_mimetype`), Erweiterung, `mdudu_saving_type`, `mdudu_file_object` (BLOB), `mdudu_token`, Uploader, `mdudu_upload_date`, `isactive`. |
| `melis_docupl_docs_relations` | Verknüpft eine hochgeladene Datei mit einem Objekt (`mdudr_type`, z. B. `Form_answer`, + `mdudr_object_id`). |
| `melis_docupl_documents_lists_rel` | Verknüpft eine Definition mit einem Formularobjekt (`mdudlr_object_type` = `FORM`). |

## Beispiel

Validieren, eine hochgeladene Datei für eine Dokumentdefinition speichern und dann ihre öffentliche
URL erstellen:

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

## Zentrale Dateien

| Aspekt | Pfad |
| --- | --- |
| Modulkonfiguration / Routen / Services | `config/module.config.php` |
| React-Capabilities (2 Tabs, keine `react-api.php`) | `config/react.capabilities.php` |
| Quellcode der React-Brick | `ui-react/src/` (`brick.tsx`, `DocumentUploadPage.tsx`, `document-upload-api.ts`) |
| Gebaute Brick | `public/ui-react/brick.js`, `public/ui-react/brick.manifest.json` |
| React-API-Controller (17 Aktionen) | `src/Controller/DocumentUploadReactApiController.php` |
| Upload-Service | `src/Service/MelisDocumentUploadService.php` |
| Definition-Service | `src/Service/MelisDocumentService.php` |
| Öffentliche Anzeige + Werkzeug-Controller | `src/Controller/DocumentUploadController.php` |
| FormCreator-Controller | `src/Controller/DocumentUploadedFormCreatorController.php` |
| View-Helper | `src/View/Helper/DocumentUploadHelper.php` |
| Render-Plugins | `src/Controller/Plugin/` |
| Listener | `src/Listener/` |
| Schema | `install/dbdeploy/` |
