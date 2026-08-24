# MelisDocumentUpload

> Gestión de carga de documentos en el backoffice como herramienta React nativa: define tipos de
> documento, recopila, almacena y sirve los archivos subidos, y adjúntalos a las respuestas de
> MelisFormCreator. Paquete `melisplatform/melis-document-upload`.

## Propósito

`MelisDocumentUpload` es una herramienta reutilizable de recopilación de documentos. Defines los
**tipos de documento** que quieres recopilar (un pasaporte, un justificante de domicilio…), y luego
exploras los **archivos subidos** reales — almacenados en el **sistema de archivos** (bajo `data/`) o
en la **base de datos** como un BLOB, y servidos de vuelta a través de una **URL con token** estable
que no requiere inicio de sesión en el backoffice. Su consumidor principal es **MelisFormCreator**,
que puede exigir un documento y vincular una subida a una respuesta de formulario concreta.

En la v6, la herramienta se distribuye como un **ladrillo React nativo completo** en el back-office
`/melis-react`. La capa React posee toda la interfaz y su API JSON; toda la lógica de negocio
(validación, almacenamiento, token, relaciones) permanece en los servicios Laminas del módulo, sin
cambios respecto a la v5.

## Activarlo

Módulo Laminas estándar, ya listado en `config/melis.module.load.php` como `'MelisDocumentUpload'`.
Si lo añades manualmente:

```php
// config/melis.module.load.php
return [
    // …
    'MelisDocumentUpload',
];
```

Después `composer require melisplatform/melis-document-upload`. Depende de
`melisplatform/melis-core`; la integración con MelisFormCreator (columnas Form Type / Status, el
requisito de formulario "document") solo aparece cuando MelisFormCreator está activo. El ladrillo se
descubre mediante `GET /melis/react-api/react-modules` y solo se muestra cuando el módulo está activo.

## El back-office React

El ladrillo registra una única página enrutada (`DocumentUploadPage`) bajo el id de ladrillo
**`melis-document-upload`**. Aparece en la barra lateral bajo **MelisMarketing → Document Upload** y
se abre en la pestaña **Uploaded documents**. Un banco de trabajo de dos pestañas:

- **Uploaded documents** — explora los archivos subidos reales (ID, Document name, Owner, Size, Type,
  File/Form name, Form Answer ID, Upload date). Sube uno nuevo, reasigna su propietario, míralo a
  través de su URL con token, o elimínalo.
- **Document List (types)** — gestiona las definiciones de documento (ID, Name, Model DEFAULT/CUSTOM,
  Type de almacenamiento FILESYSTEM/DB, Max size, Path; además de Form Type / Status cuando
  MelisFormCreator está activo). Añadir / editar / eliminar.

Ambas pestañas incluyen **tarjetas KPI** (Total / En base de datos / Sistema de archivos), búsqueda en
vivo, un **gestor de columnas** persistente (arrastrar para reordenar / ocultar) y **exportación**
(xlsx/CSV). Al abrir una fila o pulsar **Add** se abre su formulario como una **sub-pestaña** nativa en
la SubTabBar del host (URL `/melis-document-upload/:sub`, p. ej. `type-new`, `type-5`, `uploaded-new`,
`uploaded-12`).

Un conmutador **New / Old** en la parte superior derecha (`ViewToggle.tsx`) muestra la herramienta
clásica heredada en un iframe en `/melis/react-tool-page?key=melis_document_upload_tool` para
comparar.

![La pestaña Uploaded documents (React): lista de archivos subidos con tarjetas KPI, búsqueda, gestor de columnas y el conmutador New/Old.](/screenshots/react/melis-document-upload/melisdocumentupload-tool-docupload-list.png)

### Pestaña Uploaded documents

Acciones de fila **edit** (reasignar propietario / ver archivo) y **delete** (modal de confirmación).
**Upload Document** abre el formulario de subida como una sub-pestaña: el **Owner** es un typeahead
respaldado por el servidor, **Document name** es un desplegable de tus definiciones. Guardar con un
archivo ejecuta el mismo `processUpload` del servidor (validación, movimiento al sistema de archivos o
blob en BD, token). Editar sin un archivo nuevo solo reasigna el propietario. **View file** resuelve la
URL con token pública del archivo.

![Formulario de documento subido (sub-pestaña React): elige el propietario, el Document name, el archivo y luego Save.](/screenshots/react/melis-document-upload/melisdocumentupload-tool-docupload-list-edit-modal.png)

### Pestaña Document List (types)

![La pestaña Document List (React): definiciones de tipos de documento con tarjetas KPI, gestor de columnas y exportación.](/screenshots/react/melis-document-upload/melisdocumentupload-tool-docupload-typedoclist.png)

El formulario de tipo incluye el **Name** por idioma, una **Description** con texto enriquecido, un
**Class name for custom rendering documents** (rellénalo para convertir el tipo en CUSTOM), un
**Max Size (Mb)**, el **Type** de almacenamiento (Filesystem + una ruta desde DOCROOT, o Database), un
conmutador **Is the document mandatory?**, y — cuando MelisFormCreator está activo — **Display**
(ALL / MANUAL) y **Form status**. Para un tipo Filesystem, la ruta de guardado se valida en el servidor
contra la travesía de rutas (se rechazan `..`, las barras invertidas y los caracteres no
`[A-Za-z0-9_-/]`).

![Formulario de tipo de documento (sub-pestaña React): Name por idioma, clase personalizada, Max Size, Type de almacenamiento + ruta, conmutador de obligatoriedad.](/screenshots/react/melis-document-upload/melisdocumentupload-tool-docupload-typedoclist-edit-modal.png)

## API JSON React

**No hay `config/react-api.php`**. Los endpoints React son acciones de
`MelisDocumentUpload\Controller\DocumentUploadReactApiController` (que extiende
`DocumentUploadListController` y reutiliza los servicios del módulo), alcanzadas a través de la ruta MVC
catch-all existente del módulo. Cada URL tiene la forma
`/melis/MelisDocumentUpload/DocumentUploadReactApi/<action>`. Como el catch-all rechaza un tercer
segmento de ruta, **los ids se pasan como parámetros de consulta `?id=`** y las eliminaciones son
`POST …?id=`.

Cada acción llama primero a `denyUnlessAccess()` (autenticación vía `MelisCoreAuth->hasIdentity()` +
`MelisCoreRights->canAccess('melis_document_upload_tool')`, devuelve 401 / 403). Contrato de respuesta
en todas partes: `{ success: bool, data: T, error?: string, errors?: {...} }` (17 endpoints en total).

| Método · URL (`…/DocumentUploadReactApi/…`) | Propósito · servicio |
| --- | --- |
| `GET /meta` | qué módulos opcionales están activos (`formCreator`, `formEngine`) |
| `GET /languages` | idiomas de la plataforma ordenados |
| `GET /typesList?search=` | listar definiciones (`MelisDocumentService::getList`) |
| `GET /typesStats` | tarjetas KPI (total / bd / sistema de archivos) |
| `GET /formOptions` | estados de FormCreator + modos de visualización (cuando está activo) |
| `GET /typesGet?id=` | registro completo + nombres por idioma |
| `POST /typesSave` | crear/actualizar (`saveDocumentItem`; valida la ruta FS) |
| `POST /typesDelete?id=` | eliminación lógica (`deleteDocumentItem`) |
| `GET /uploadedList?search=` | listar archivos subidos (`MelisDocumentUploadService::getList`) |
| `GET /uploadedStats` | tarjetas KPI |
| `GET /uploadedGet?id=` | un solo documento subido |
| `POST /uploadedSave` (multipart) | subir un archivo (`processUpload`) |
| `POST /uploadedUserSave` | reasignar solo el propietario de una fila existente |
| `POST /uploadedDelete?id=` | eliminar (`deleteDocumentUpload`) |
| `GET /uploadedFileUrl?id=` | URL con token pública (`getDocumentUrl`) |
| `GET /documentOptions` | opciones de tipo de documento para el desplegable de subida |
| `GET /boUsers?phrase=` | typeahead de usuarios BO para el campo de propietario |

```ts
// document-upload-api.ts — BASE = '/melis/MelisDocumentUpload/DocumentUploadReactApi'
const res = await fetch(`${BASE}/uploadedList?search=`, {
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
  credentials: 'include',
})
const { success, data } = await res.json()  // data: { items: UploadedItem[], total }
```

## Capacidades

`config/react.capabilities.php` (fusionado en `getConfig()`, leído por
`MelisReactApi\Service\Capabilities`) está indexado bajo el nodo de menú portador de derechos
`melis_document_upload_tool` — la misma melisKey que el controlador protege y que `DocumentUploadPage`
pasa a `useCaps()`. Declara **2 pestañas**, cada una con las mismas cinco acciones:

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

Las comprobaciones `can()` de React (`uploaded.create`, `types.export`, …) ocultan botones por
comodidad; la aplicación real en el servidor es el guard de acceso a nivel de herramienta
(`canAccess('melis_document_upload_tool')`) que ejecuta cada acción.

## Servicios clave

Registrados como alias de `service_manager` en `config/module.config.php`. Todos extienden
`MelisCore\Service\MelisGeneralService` (cada método dispara eventos `*_start` / `*_end`).

| Alias de servicio | Rol |
| --- | --- |
| `MelisDocumentService` | Gestiona las **definiciones de documento** (tabla `melis_docupl_documents`): `getList()`, `getItemById()`, `saveDocumentItem()`, `deleteDocumentItem()` (eliminación lógica vía `isactive`), `getDocumentByDocumentId()`, nombres multilingües vía `saveFormDocumentTranslation()` / `getDocumentTranslation()`. |
| `MelisDocumentUploadService` | Maneja los **archivos subidos**. `processUpload($docId, $file, $postValues)` valida, almacena (FILESYSTEM o DB), registra la fila y asigna un token; `uploadFile()`, `saveDocumentUploaded()`, `deleteDocumentUpload()`, `getDocumentUploadByToken()`, `getDocumentUrl($docUploadId)` (devuelve la URL `?token=…`), `getLatestDocumentUploadByDocId()`. |
| `MelisDocumentUploadRelationsService` | Lee las relaciones subida→respuesta: `getLatestDocumentUploadedDataByIdAndObjectId()`, `getDocUplRelationData()`. |
| `MelisDocumentUploadListRelService` | Gestiona las relaciones definición→objeto-de-formulario (`melis_docupl_documents_lists_rel`): `saveDocumentUploadForm()`, `saveFormDocument()`, `getDocumentsByFormAnswerId()`, `getDocumentsDoneByFormAnswerId()`, `deleteDocumentListFormDelete()`. |

Los table gateways también tienen alias: `MelisDocumentTable`, `MelisDocumentTransTable`,
`MelisDocumentUploadTable`, `MelisDocumentUploadRelationsTable`, `MelisDocumentListRelTable`,
`MelisDocumentUserTable`.

## Front office

El módulo no es un plugin de plantillas. Los archivos subidos se exponen a través de una **URL con
token** y un view helper:

- **Ruta de vista pública** — `melis-backoffice/melisdocument` (`/melis/melisdocument?token=<token>`),
  gestionada por `DocumentUploadController::viewAction`. El token se resuelve a una fila en
  `melis_docupl_documents_uploaded` y el archivo se transmite con su tipo MIME almacenado. La ruta está
  declarada en los `excluded_routes` de `meliscore` (sin autenticación de backoffice).
- **View helper `DocumentUploadHelper`** (alias `DocumentUploadHelper`) —
  `$this->DocumentUploadHelper($documentTypeId, $template, $objectId, $docUplRelationId)` renderiza el
  HTML del widget de subida para una definición de documento, eligiendo la plantilla DEFAULT o CUSTOM.

**Los plugins de controlador** renderizan y (de)serializan el formulario de subida:
`MelisDocumentUploadTemplatePlugin` (base abstracta, métodos `render()`, `validateForm()`,
`encodeCustomDatas()`/`decodeCustomDatas()`), `MelisDocumentUploadTemplateDefaultPlugin` (tipo DEFAULT)
y `MelisDocumentUploadTemplateCustomPlugin` (tipo CUSTOM, campos adicionales). Una definición CUSTOM
nombra su propia clase de plugin en `mdud_doc_class`.

## Integración con MelisFormCreator

Bajo la interfaz `melisformcreator`, el módulo inyecta una pestaña **Document** en la página de edición
de formularios (`melisformcreator_form_edition_page_content_tabs_document`), servida por
`DocumentUploadedFormCreatorController`, de modo que un formulario puede exigir un documento
configurado. Tres listeners registrados en `src/Module.php` sobre la ruta `melis-backoffice` conectan
todo esto: `DeleteListener`, `DocumentFormCreatorListener`, `DocumentFormCreatorInstructionListener`.
Una vez que un formulario recopila documentos, los archivos de las respuestas aparecen en la pestaña
**Uploaded documents**.

## Tablas de base de datos

Creadas por `install/dbdeploy/` (dbdeploy está habilitado en `composer.json`).

| Tabla | Rol |
| --- | --- |
| `melis_docupl_documents` | **Definiciones** de subida: `mdud_type` (`DEFAULT`/`CUSTOM`), `mdud_file_saving_type` (`DB`/`FILESYSTEM`), `mdud_file_saving_path_from_root`, `mdud_max_size_mb`, `mdud_doc_class`, `mdud_is_mandatory`, `isactive`. |
| `melis_docupl_documents_trans` | **Nombres** por idioma para una definición (`mdudtr_lang_id`, `mdudtr_name`). |
| `melis_docupl_documents_uploaded` | **Archivos subidos**: nombre, tamaño, MIME (`mdud_file_mimetype`), extensión, `mdudu_saving_type`, `mdudu_file_object` (BLOB), `mdudu_token`, quien lo subió, `mdudu_upload_date`, `isactive`. |
| `melis_docupl_docs_relations` | Enlaza un archivo subido a un objeto (`mdudr_type`, p. ej. `Form_answer`, + `mdudr_object_id`). |
| `melis_docupl_documents_lists_rel` | Enlaza una definición a un objeto de formulario (`mdudlr_object_type` = `FORM`). |

## Ejemplo

Validar, almacenar un archivo subido para una definición de documento y luego construir su URL
pública:

```php
$uploadService = $this->getServiceManager()->get('MelisDocumentUploadService');

// $docId = un melis_docupl_documents.mdud_id ; $_FILES['my_field'] = el archivo subido
$res = $uploadService->processUpload($docId, $_FILES['my_field'], [
    'mdudr_type'      => 'Form_answer',
    'mdudr_object_id' => $formAnswerId,
]);

if ($res['success']) {
    $url = $res['fileUrl']; // p. ej. https://mysite.local/melis/melisdocument?token=...
}
```

## Archivos clave

| Aspecto | Ruta |
| --- | --- |
| Configuración / rutas / servicios del módulo | `config/module.config.php` |
| Capacidades React (2 pestañas, sin `react-api.php`) | `config/react.capabilities.php` |
| Fuente del ladrillo React | `ui-react/src/` (`brick.tsx`, `DocumentUploadPage.tsx`, `document-upload-api.ts`) |
| Ladrillo compilado | `public/ui-react/brick.js`, `public/ui-react/brick.manifest.json` |
| Controlador de API React (17 acciones) | `src/Controller/DocumentUploadReactApiController.php` |
| Servicio de subida | `src/Service/MelisDocumentUploadService.php` |
| Servicio de definición | `src/Service/MelisDocumentService.php` |
| Vista pública + controlador de herramienta | `src/Controller/DocumentUploadController.php` |
| Controlador de FormCreator | `src/Controller/DocumentUploadedFormCreatorController.php` |
| View helper | `src/View/Helper/DocumentUploadHelper.php` |
| Plugins de renderizado | `src/Controller/Plugin/` |
| Listeners | `src/Listener/` |
| Esquema | `install/dbdeploy/` |
