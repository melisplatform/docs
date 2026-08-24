# MelisDocumentUpload

> Gestão do carregamento de documentos no backoffice como ferramenta React nativa: definir tipos de
> documento, recolher, armazenar e servir ficheiros carregados, e associá-los às respostas do
> MelisFormCreator. Pacote `melisplatform/melis-document-upload`.

## Objetivo

O `MelisDocumentUpload` é uma ferramenta reutilizável de recolha de documentos. Define os **tipos de
documento** que pretende recolher (um passaporte, um comprovativo de morada…) e, em seguida, consulta
os **ficheiros carregados** reais — armazenados no **sistema de ficheiros** (em `data/`) ou na **base
de dados** como BLOB, e servidos de volta através de um **URL com token** estável que não requer
autenticação no backoffice. O seu principal consumidor é o **MelisFormCreator**, que pode exigir um
documento e associar um carregamento a uma resposta de formulário específica.

Na v6, a ferramenta é fornecida como um **brick totalmente React nativo** no back-office
`/melis-react`. A camada React detém toda a interface e a sua API JSON; toda a lógica de negócio
(validação, armazenamento, token, relações) permanece nos serviços Laminas do módulo, inalterada
relativamente à v5.

## Ativá-lo

Módulo Laminas padrão, já listado em `config/melis.module.load.php` como `'MelisDocumentUpload'`.
Se o adicionar manualmente:

```php
// config/melis.module.load.php
return [
    // …
    'MelisDocumentUpload',
];
```

Depois `composer require melisplatform/melis-document-upload`. Depende do
`melisplatform/melis-core`; a integração com o MelisFormCreator (colunas Form Type / Status, o
requisito de formulário "document") só aparece quando o MelisFormCreator está ativo. O brick é
descoberto através de `GET /melis/react-api/react-modules` e só é apresentado quando o módulo está
ativo.

## O back-office React

O brick regista uma única página com rota (`DocumentUploadPage`) sob o id de brick
**`melis-document-upload`**. Aparece na barra lateral em **MelisMarketing → Document Upload** e abre
no separador **Uploaded documents**. Uma bancada de trabalho com dois separadores:

- **Uploaded documents** — consulte os ficheiros carregados reais (ID, Document name, Owner, Size,
  Type, File/Form name, Form Answer ID, Upload date). Carregue um novo, reatribua o proprietário,
  visualize-o através do seu URL com token ou elimine-o.
- **Document List (types)** — faça a gestão das definições de documento (ID, Name, Model
  DEFAULT/CUSTOM, Type de armazenamento FILESYSTEM/DB, Max size, Path; além de Form Type / Status
  quando o MelisFormCreator está ativo). Adicionar / editar / eliminar.

Ambos os separadores incluem **cartões de KPI** (Total / Na base de dados / Sistema de ficheiros),
pesquisa em tempo real, um **gestor de colunas** persistido (arraste para reordenar / ocultar) e
**exportação** (xlsx/CSV). Abrir uma linha ou **Add** abre o respetivo formulário como um **sub-separador**
nativo na SubTabBar do anfitrião (URL `/melis-document-upload/:sub`, por exemplo `type-new`, `type-5`,
`uploaded-new`, `uploaded-12`).

Um alternador **New / Old** no canto superior direito (`ViewToggle.tsx`) apresenta a ferramenta
clássica legada num iframe em `/melis/react-tool-page?key=melis_document_upload_tool` para comparação.

![O separador Uploaded documents (React): lista de ficheiros carregados com cartões de KPI, pesquisa, gestor de colunas e o alternador New/Old.](/screenshots/react/melis-document-upload/melisdocumentupload-tool-docupload-list.png)

### Separador Uploaded documents

Ações de linha **edit** (reatribuir proprietário / visualizar ficheiro) e **delete** (modal de
confirmação). **Upload Document** abre o formulário de carregamento como sub-separador: o **Owner** é
um campo de sugestão automática suportado pelo servidor, e **Document name** é uma lista pendente das
suas definições. Guardar com um ficheiro executa o mesmo `processUpload` do servidor (validação,
movimentação para o sistema de ficheiros ou blob na BD, token). Editar sem um novo ficheiro apenas
reatribui o proprietário. **View file** resolve o URL público com token do ficheiro.

![Formulário de documento carregado (sub-separador React): escolha o proprietário, o Document name, o ficheiro e, depois, Save.](/screenshots/react/melis-document-upload/melisdocumentupload-tool-docupload-list-edit-modal.png)

### Separador Document List (types)

![O separador Document List (React): definições de tipos de documento com cartões de KPI, gestor de colunas e exportação.](/screenshots/react/melis-document-upload/melisdocumentupload-tool-docupload-typedoclist.png)

O formulário de tipo inclui o **Name** por idioma, uma **Description** em texto formatado, um **Class
name for custom rendering documents** (preenchê-lo torna o tipo CUSTOM), um **Max Size (Mb)**, o
**Type** de armazenamento (Filesystem + um caminho a partir de DOCROOT, ou Database), um alternador
**Is the document mandatory?** e — quando o MelisFormCreator está ativo — **Display** (ALL / MANUAL) e
**Form status**. Para um tipo Filesystem, o caminho de gravação é validado no servidor contra
travessia de caminhos (path-traversal) (`..`, barras invertidas e caracteres não pertencentes a
`[A-Za-z0-9_-/]` são rejeitados).

![Formulário de tipo de documento (sub-separador React): Name por idioma, classe personalizada, Max Size, Type de armazenamento + caminho, alternador de obrigatoriedade.](/screenshots/react/melis-document-upload/melisdocumentupload-tool-docupload-typedoclist-edit-modal.png)

## API JSON React

**Não existe `config/react-api.php`**. Os endpoints React são ações do
`MelisDocumentUpload\Controller\DocumentUploadReactApiController` (que estende o
`DocumentUploadListController` e reutiliza os serviços do módulo), acedidos através da rota MVC
catch-all existente do módulo. Cada URL tem a forma
`/melis/MelisDocumentUpload/DocumentUploadReactApi/<action>`. Como o catch-all rejeita um terceiro
segmento de caminho, os **ids são passados como parâmetros de query `?id=`** e as eliminações são
`POST …?id=`.

Cada ação chama primeiro `denyUnlessAccess()` (autenticação via `MelisCoreAuth->hasIdentity()` +
`MelisCoreRights->canAccess('melis_document_upload_tool')`, devolve 401 / 403). Contrato de resposta
em todos os casos: `{ success: bool, data: T, error?: string, errors?: {...} }` (17 endpoints no
total).

| Método · URL (`…/DocumentUploadReactApi/…`) | Objetivo · serviço |
| --- | --- |
| `GET /meta` | quais os módulos opcionais ativos (`formCreator`, `formEngine`) |
| `GET /languages` | idiomas da plataforma ordenados |
| `GET /typesList?search=` | listar definições (`MelisDocumentService::getList`) |
| `GET /typesStats` | cartões de KPI (total / bd / sistema de ficheiros) |
| `GET /formOptions` | estados do FormCreator + modos de apresentação (quando ativo) |
| `GET /typesGet?id=` | registo completo + nomes por idioma |
| `POST /typesSave` | criar/atualizar (`saveDocumentItem`; valida o caminho do FS) |
| `POST /typesDelete?id=` | eliminação lógica (`deleteDocumentItem`) |
| `GET /uploadedList?search=` | listar ficheiros carregados (`MelisDocumentUploadService::getList`) |
| `GET /uploadedStats` | cartões de KPI |
| `GET /uploadedGet?id=` | documento carregado individual |
| `POST /uploadedSave` (multipart) | carregar um ficheiro (`processUpload`) |
| `POST /uploadedUserSave` | reatribuir apenas o proprietário de uma linha existente |
| `POST /uploadedDelete?id=` | eliminar (`deleteDocumentUpload`) |
| `GET /uploadedFileUrl?id=` | URL público com token (`getDocumentUrl`) |
| `GET /documentOptions` | opções de tipo de documento para a lista pendente de carregamento |
| `GET /boUsers?phrase=` | sugestão automática de utilizadores do BO para o campo de proprietário |

```ts
// document-upload-api.ts — BASE = '/melis/MelisDocumentUpload/DocumentUploadReactApi'
const res = await fetch(`${BASE}/uploadedList?search=`, {
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
  credentials: 'include',
})
const { success, data } = await res.json()  // data: { items: UploadedItem[], total }
```

## Capacidades

O `config/react.capabilities.php` (integrado em `getConfig()`, lido por
`MelisReactApi\Service\Capabilities`) está indexado sob o nó de menu portador de direitos
`melis_document_upload_tool` — a mesma melisKey que o controlador protege e que a `DocumentUploadPage`
passa a `useCaps()`. Declara **2 separadores**, cada um com as mesmas cinco ações:

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

As verificações `can()` do React (`uploaded.create`, `types.export`, …) mascaram botões por
conforto; a aplicação real do lado do servidor é a proteção de acesso ao nível da ferramenta
(`canAccess('melis_document_upload_tool')`) executada por cada ação.

## Serviços principais

Registados como aliases de `service_manager` em `config/module.config.php`. Todos estendem o
`MelisCore\Service\MelisGeneralService` (cada método dispara eventos `*_start` / `*_end`).

| Alias de serviço | Função |
| --- | --- |
| `MelisDocumentService` | Faz a gestão das **definições de documento** (tabela `melis_docupl_documents`): `getList()`, `getItemById()`, `saveDocumentItem()`, `deleteDocumentItem()` (eliminação lógica via `isactive`), `getDocumentByDocumentId()`, nomes multilingues via `saveFormDocumentTranslation()` / `getDocumentTranslation()`. |
| `MelisDocumentUploadService` | Trata dos **ficheiros carregados**. `processUpload($docId, $file, $postValues)` valida, armazena (FILESYSTEM ou DB), regista a linha e atribui um token; `uploadFile()`, `saveDocumentUploaded()`, `deleteDocumentUpload()`, `getDocumentUploadByToken()`, `getDocumentUrl($docUploadId)` (devolve o URL `?token=…`), `getLatestDocumentUploadByDocId()`. |
| `MelisDocumentUploadRelationsService` | Lê as relações carregamento→resposta: `getLatestDocumentUploadedDataByIdAndObjectId()`, `getDocUplRelationData()`. |
| `MelisDocumentUploadListRelService` | Faz a gestão das relações definição→objeto-de-formulário (`melis_docupl_documents_lists_rel`): `saveDocumentUploadForm()`, `saveFormDocument()`, `getDocumentsByFormAnswerId()`, `getDocumentsDoneByFormAnswerId()`, `deleteDocumentListFormDelete()`. |

Os table gateways também têm alias: `MelisDocumentTable`, `MelisDocumentTransTable`,
`MelisDocumentUploadTable`, `MelisDocumentUploadRelationsTable`, `MelisDocumentListRelTable`,
`MelisDocumentUserTable`.

## Front office

O módulo não é um plugin de templating. Os ficheiros carregados são expostos através de um **URL com
token** e de um view helper:

- **Rota de visualização pública** — `melis-backoffice/melisdocument`
  (`/melis/melisdocument?token=<token>`), tratada por `DocumentUploadController::viewAction`. O token
  resolve para uma linha em `melis_docupl_documents_uploaded` e o ficheiro é transmitido em stream
  com o seu tipo MIME armazenado. A rota é declarada em `meliscore` `excluded_routes` (sem
  autenticação no backoffice).
- **View helper `DocumentUploadHelper`** (alias `DocumentUploadHelper`) —
  `$this->DocumentUploadHelper($documentTypeId, $template, $objectId, $docUplRelationId)` renderiza o
  HTML do widget de carregamento para uma definição de documento, escolhendo o template DEFAULT ou
  CUSTOM.

**Plugins de controlador** renderizam e (des)serializam o formulário de carregamento:
`MelisDocumentUploadTemplatePlugin` (base abstrata, métodos `render()`, `validateForm()`,
`encodeCustomDatas()`/`decodeCustomDatas()`), `MelisDocumentUploadTemplateDefaultPlugin` (tipo
DEFAULT) e `MelisDocumentUploadTemplateCustomPlugin` (tipo CUSTOM, campos adicionais). Uma definição
CUSTOM indica a sua própria classe de plugin em `mdud_doc_class`.

## Integração com o MelisFormCreator

Sob a interface `melisformcreator`, o módulo injeta um separador **Document** na página de edição de
formulário (`melisformcreator_form_edition_page_content_tabs_document`), servido por
`DocumentUploadedFormCreatorController`, para que um formulário possa exigir um documento configurado.
Três listeners registados em `src/Module.php` na rota `melis-backoffice` interligam tudo isto:
`DeleteListener`, `DocumentFormCreatorListener`, `DocumentFormCreatorInstructionListener`. Assim que
um formulário recolhe documentos, os ficheiros das respostas aparecem no separador **Uploaded
documents**.

## Tabelas da base de dados

Criadas por `install/dbdeploy/` (o dbdeploy está ativado no `composer.json`).

| Tabela | Função |
| --- | --- |
| `melis_docupl_documents` | **Definições** de carregamento: `mdud_type` (`DEFAULT`/`CUSTOM`), `mdud_file_saving_type` (`DB`/`FILESYSTEM`), `mdud_file_saving_path_from_root`, `mdud_max_size_mb`, `mdud_doc_class`, `mdud_is_mandatory`, `isactive`. |
| `melis_docupl_documents_trans` | **Nomes** por idioma para uma definição (`mdudtr_lang_id`, `mdudtr_name`). |
| `melis_docupl_documents_uploaded` | **Ficheiros carregados**: nome, tamanho, MIME (`mdud_file_mimetype`), extensão, `mdudu_saving_type`, `mdudu_file_object` (BLOB), `mdudu_token`, quem carregou, `mdudu_upload_date`, `isactive`. |
| `melis_docupl_docs_relations` | Associa um ficheiro carregado a um objeto (`mdudr_type`, por exemplo `Form_answer`, + `mdudr_object_id`). |
| `melis_docupl_documents_lists_rel` | Associa uma definição a um objeto de formulário (`mdudlr_object_type` = `FORM`). |

## Exemplo

Validar, armazenar um ficheiro carregado para uma definição de documento e, depois, construir o seu
URL público:

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

## Ficheiros principais

| Aspeto | Caminho |
| --- | --- |
| Configuração / rotas / serviços do módulo | `config/module.config.php` |
| Capacidades React (2 separadores, sem `react-api.php`) | `config/react.capabilities.php` |
| Fonte do brick React | `ui-react/src/` (`brick.tsx`, `DocumentUploadPage.tsx`, `document-upload-api.ts`) |
| Brick compilado | `public/ui-react/brick.js`, `public/ui-react/brick.manifest.json` |
| Controlador da API React (17 ações) | `src/Controller/DocumentUploadReactApiController.php` |
| Serviço de carregamento | `src/Service/MelisDocumentUploadService.php` |
| Serviço de definições | `src/Service/MelisDocumentService.php` |
| Visualização pública + controlador da ferramenta | `src/Controller/DocumentUploadController.php` |
| Controlador do FormCreator | `src/Controller/DocumentUploadedFormCreatorController.php` |
| View helper | `src/View/Helper/DocumentUploadHelper.php` |
| Plugins de renderização | `src/Controller/Plugin/` |
| Listeners | `src/Listener/` |
| Esquema | `install/dbdeploy/` |
