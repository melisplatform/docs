# MelisDocumentUpload

> 作为原生 React 工具的后台文档上传管理：定义文档类型，收集、
> 存储并提供已上传文件，并将其附加到 MelisFormCreator 的答案上。软件包
> `melisplatform/melis-document-upload`。

## 用途

`MelisDocumentUpload` 是一个可复用的文档收集工具。你先定义要收集的**文档类型**
（护照、地址证明……），然后浏览实际的**已上传文件**——它们存储在
**文件系统**（位于 `data/` 下）或**数据库**中（作为 BLOB），并通过一个
稳定的**令牌 URL** 提供访问，无需后台登录。它的主要消费方是 **MelisFormCreator**，
它可以要求提供某个文档，并将一次上传绑定到特定的表单答案。

在 v6 中，该工具作为一个**原生的完整 React 组件（brick）**随 `/melis-react` 后台一同发布。React
层负责整个 UI 及其 JSON API；所有业务逻辑（校验、存储、令牌、关系）
仍保留在该模块的 Laminas 服务中，与 v5 相比未作改动。

## 启用它

这是一个标准的 Laminas 模块，已在 `config/melis.module.load.php` 中以 `'MelisDocumentUpload'` 列出。
如果你要手动添加：

```php
// config/melis.module.load.php
return [
    // …
    'MelisDocumentUpload',
];
```

然后执行 `composer require melisplatform/melis-document-upload`。它依赖于
`melisplatform/melis-core`；MelisFormCreator 集成（Form Type / Status 列、
"document" 表单要求）仅在 MelisFormCreator 处于激活状态时出现。该组件通过
`GET /melis/react-api/react-modules` 被发现，并且仅在模块激活时显示。

## React 后台

该组件注册了一个路由页面（`DocumentUploadPage`），其组件 id 为
**`melis-document-upload`**。它出现在侧边栏的 **MelisMarketing → Document Upload** 下，
并在 **Uploaded documents**（已上传文档）标签页中打开。这是一个双标签的工作台：

- **Uploaded documents**（已上传文档）——浏览实际的已上传文件（ID、Document name、Owner、Size、Type、
  File/Form name、Form Answer ID、Upload date）。上传新文件、重新分配其归属者、通过其
  令牌 URL 查看它，或删除它。
- **Document List (types)**（文档列表（类型））——管理文档定义（ID、Name、Model DEFAULT/CUSTOM、存储
  Type FILESYSTEM/DB、Max size、Path；当 MelisFormCreator 激活时还包括 Form Type / Status）。新增 /
  编辑 / 删除。

两个标签页都带有 **KPI 卡片**（Total / In database / Filesystem）、实时搜索、一个持久化的**列
管理器**（拖动以重新排序 / 隐藏）以及**导出**（xlsx/CSV）。打开某一行或点击 **Add** 会将其表单
作为原生**子标签**打开在宿主的 SubTabBar 中（URL `/melis-document-upload/:sub`，例如 `type-new`、
`type-5`、`uploaded-new`、`uploaded-12`）。

右上角的 **New / Old** 切换（`ViewToggle.tsx`）会在 iframe 中显示经典的旧版工具，地址为
`/melis/react-tool-page?key=melis_document_upload_tool`，以便对比。

![Uploaded documents 标签页（React）：已上传文件列表，带 KPI 卡片、搜索、列管理器以及 New/Old 切换。](/screenshots/react/melis-document-upload/melisdocumentupload-tool-docupload-list.png)

### Uploaded documents 标签页

行操作包括 **edit**（重新分配归属者 / 查看文件）和 **delete**（确认弹窗）。**Upload Document**
会将上传表单作为子标签打开：**Owner** 是一个由服务器支持的自动补全输入框，**Document name** 是
你所定义类型的下拉列表。在有文件的情况下保存会运行相同的服务器端 `processUpload`（校验、
文件系统移动或数据库 BLOB、令牌）。在没有新文件的情况下编辑则仅重新分配归属者。**View file**
会解析该文件的公开令牌 URL。

![已上传文档表单（React 子标签）：选择归属者、Document name、文件，然后 Save。](/screenshots/react/melis-document-upload/melisdocumentupload-tool-docupload-list-edit-modal.png)

### Document List (types) 标签页

![Document List 标签页（React）：文档类型定义，带 KPI 卡片、列管理器和导出。](/screenshots/react/melis-document-upload/melisdocumentupload-tool-docupload-typedoclist.png)

类型表单包含按语言区分的 **Name**、一个富文本 **Description**、一个 **Class name for
custom rendering documents**（填写它可将类型设为 CUSTOM）、一个 **Max Size (Mb)**、存储
**Type**（Filesystem + 一个从 DOCROOT 起算的路径，或 Database）、一个 **Is the document mandatory?**
开关，以及——当 MelisFormCreator 激活时——**Display**（ALL / MANUAL）和 **Form status**。对于
Filesystem 类型，保存路径会在服务器端针对路径穿越进行校验（`..`、反斜杠以及
非 `[A-Za-z0-9_-/]` 字符会被拒绝）。

![文档类型表单（React 子标签）：按语言的 Name、自定义类名、Max Size、存储 Type + 路径、mandatory 开关。](/screenshots/react/melis-document-upload/melisdocumentupload-tool-docupload-typedoclist-edit-modal.png)

## React JSON API

**没有 `config/react-api.php`**。React 端点是
`MelisDocumentUpload\Controller\DocumentUploadReactApiController`（它继承自
`DocumentUploadListController` 并复用该模块的服务）的各个 action，通过该模块现有的
通配 MVC 路由访问。每个 URL 的形式均为
`/melis/MelisDocumentUpload/DocumentUploadReactApi/<action>`。由于该通配路由会拒绝第三个
路径段，**id 通过 `?id=`** 查询参数传递，删除操作则为 `POST …?id=`。

每个 action 首先调用 `denyUnlessAccess()`（通过 `MelisCoreAuth->hasIdentity()` +
`MelisCoreRights->canAccess('melis_document_upload_tool')` 进行鉴权，返回 401 / 403）。所有地方的响应
契约一致：`{ success: bool, data: T, error?: string, errors?: {...} }`（共 17 个端点）。

| 方法 · URL（`…/DocumentUploadReactApi/…`） | 用途 · 服务 |
| --- | --- |
| `GET /meta` | 哪些可选模块处于激活状态（`formCreator`、`formEngine`） |
| `GET /languages` | 已排序的平台语言 |
| `GET /typesList?search=` | 列出定义（`MelisDocumentService::getList`） |
| `GET /typesStats` | KPI 卡片（total / db / filesystem） |
| `GET /formOptions` | FormCreator 状态 + 显示模式（激活时） |
| `GET /typesGet?id=` | 完整记录 + 按语言的名称 |
| `POST /typesSave` | 创建/更新（`saveDocumentItem`；校验 FS 路径） |
| `POST /typesDelete?id=` | 软删除（`deleteDocumentItem`） |
| `GET /uploadedList?search=` | 列出已上传文件（`MelisDocumentUploadService::getList`） |
| `GET /uploadedStats` | KPI 卡片 |
| `GET /uploadedGet?id=` | 单个已上传文档 |
| `POST /uploadedSave`（multipart） | 上传文件（`processUpload`） |
| `POST /uploadedUserSave` | 仅重新分配某一现有行的归属者 |
| `POST /uploadedDelete?id=` | 删除（`deleteDocumentUpload`） |
| `GET /uploadedFileUrl?id=` | 公开令牌 URL（`getDocumentUrl`） |
| `GET /documentOptions` | 用于上传下拉列表的文档类型选项 |
| `GET /boUsers?phrase=` | 用于归属者字段的后台用户自动补全 |

```ts
// document-upload-api.ts — BASE = '/melis/MelisDocumentUpload/DocumentUploadReactApi'
const res = await fetch(`${BASE}/uploadedList?search=`, {
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
  credentials: 'include',
})
const { success, data } = await res.json()  // data: { items: UploadedItem[], total }
```

## 能力（Capabilities）

`config/react.capabilities.php`（合并进 `getConfig()`，由
`MelisReactApi\Service\Capabilities` 读取）以承载权限的菜单节点
`melis_document_upload_tool` 为键——它与控制器所保护、并由 `DocumentUploadPage` 传给
`useCaps()` 的 melisKey 相同。它声明了 **2 个标签**，每个标签具有相同的五种操作：

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

React 的 `can()` 检查（`uploaded.create`、`types.export`……）出于使用便利而屏蔽按钮；真正的
服务器端强制是由每个 action 运行的工具级访问守卫（`canAccess('melis_document_upload_tool')`）。

## 关键服务

在 `config/module.config.php` 中注册为 `service_manager` 别名。它们全部继承自
`MelisCore\Service\MelisGeneralService`（每个方法都会触发 `*_start` / `*_end` 事件）。

| 服务别名 | 作用 |
| --- | --- |
| `MelisDocumentService` | 管理**文档定义**（表 `melis_docupl_documents`）：`getList()`、`getItemById()`、`saveDocumentItem()`、`deleteDocumentItem()`（通过 `isactive` 软删除）、`getDocumentByDocumentId()`，以及通过 `saveFormDocumentTranslation()` / `getDocumentTranslation()` 处理的多语言名称。 |
| `MelisDocumentUploadService` | 处理**已上传文件**。`processUpload($docId, $file, $postValues)` 进行校验、存储（FILESYSTEM 或 DB）、记录该行并分配令牌；`uploadFile()`、`saveDocumentUploaded()`、`deleteDocumentUpload()`、`getDocumentUploadByToken()`、`getDocumentUrl($docUploadId)`（返回 `?token=…` URL）、`getLatestDocumentUploadByDocId()`。 |
| `MelisDocumentUploadRelationsService` | 读取上传→答案的关系：`getLatestDocumentUploadedDataByIdAndObjectId()`、`getDocUplRelationData()`。 |
| `MelisDocumentUploadListRelService` | 管理定义→表单对象的关系（`melis_docupl_documents_lists_rel`）：`saveDocumentUploadForm()`、`saveFormDocument()`、`getDocumentsByFormAnswerId()`、`getDocumentsDoneByFormAnswerId()`、`deleteDocumentListFormDelete()`。 |

表网关（table gateway）也带有别名：`MelisDocumentTable`、`MelisDocumentTransTable`、
`MelisDocumentUploadTable`、`MelisDocumentUploadRelationsTable`、`MelisDocumentListRelTable`、
`MelisDocumentUserTable`。

## 前台

该模块不是一个模板插件。已上传文件通过一个**令牌 URL** 和一个
视图助手（view helper）对外暴露：

- **公开视图路由**——`melis-backoffice/melisdocument`（`/melis/melisdocument?token=<token>`），
  由 `DocumentUploadController::viewAction` 处理。令牌解析到
  `melis_docupl_documents_uploaded` 中的一行，文件会以其存储的 MIME 类型流式传输。该路由在
  `meliscore` 的 `excluded_routes` 中声明（无需后台鉴权）。
- **`DocumentUploadHelper`** 视图助手（别名 `DocumentUploadHelper`）——
  `$this->DocumentUploadHelper($documentTypeId, $template, $objectId, $docUplRelationId)` 为某个文档定义
  渲染上传控件的 HTML，并选取 DEFAULT 或 CUSTOM 模板。

**控制器插件**负责渲染以及对上传表单进行（反）序列化：
`MelisDocumentUploadTemplatePlugin`（抽象基类，方法有 `render()`、`validateForm()`、
`encodeCustomDatas()`/`decodeCustomDatas()`）、`MelisDocumentUploadTemplateDefaultPlugin`（DEFAULT
类型）和 `MelisDocumentUploadTemplateCustomPlugin`（CUSTOM 类型，含额外字段）。一个 CUSTOM 定义
会在 `mdud_doc_class` 中指明它自己的插件类。

## MelisFormCreator 集成

在 `melisformcreator` 接口下，该模块会向表单编辑页面注入一个 **Document** 标签
（`melisformcreator_form_edition_page_content_tabs_document`），由
`DocumentUploadedFormCreatorController` 提供服务，使得一个表单可以要求提供某个已配置的文档。在
`src/Module.php` 中于 `melis-backoffice` 路由上注册的三个监听器将这一切串联起来：`DeleteListener`、
`DocumentFormCreatorListener`、`DocumentFormCreatorInstructionListener`。一旦某个表单收集了
文档，这些答案的文件就会出现在 **Uploaded documents** 标签页中。

## 数据库表

由 `install/dbdeploy/` 创建（dbdeploy 已在 `composer.json` 中启用）。

| 表 | 作用 |
| --- | --- |
| `melis_docupl_documents` | 上传**定义**：`mdud_type`（`DEFAULT`/`CUSTOM`）、`mdud_file_saving_type`（`DB`/`FILESYSTEM`）、`mdud_file_saving_path_from_root`、`mdud_max_size_mb`、`mdud_doc_class`、`mdud_is_mandatory`、`isactive`。 |
| `melis_docupl_documents_trans` | 一个定义的按语言**名称**（`mdudtr_lang_id`、`mdudtr_name`）。 |
| `melis_docupl_documents_uploaded` | **已上传文件**：名称、大小、MIME（`mdud_file_mimetype`）、扩展名、`mdudu_saving_type`、`mdudu_file_object`（BLOB）、`mdudu_token`、上传者、`mdudu_upload_date`、`isactive`。 |
| `melis_docupl_docs_relations` | 将一个已上传文件链接到某个对象（`mdudr_type`，例如 `Form_answer`，+ `mdudr_object_id`）。 |
| `melis_docupl_documents_lists_rel` | 将一个定义链接到某个表单对象（`mdudlr_object_type` = `FORM`）。 |

## 示例

为某个文档定义校验并存储一个已上传文件，然后构建其公开 URL：

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

## 关键文件

| 关注点 | 路径 |
| --- | --- |
| 模块配置 / 路由 / 服务 | `config/module.config.php` |
| React 能力（2 个标签，无 `react-api.php`） | `config/react.capabilities.php` |
| React 组件源码 | `ui-react/src/`（`brick.tsx`、`DocumentUploadPage.tsx`、`document-upload-api.ts`） |
| 已构建的组件 | `public/ui-react/brick.js`、`public/ui-react/brick.manifest.json` |
| React API 控制器（17 个 action） | `src/Controller/DocumentUploadReactApiController.php` |
| 上传服务 | `src/Service/MelisDocumentUploadService.php` |
| 定义服务 | `src/Service/MelisDocumentService.php` |
| 公开视图 + 工具控制器 | `src/Controller/DocumentUploadController.php` |
| FormCreator 控制器 | `src/Controller/DocumentUploadedFormCreatorController.php` |
| 视图助手 | `src/View/Helper/DocumentUploadHelper.php` |
| 渲染插件 | `src/Controller/Plugin/` |
| 监听器 | `src/Listener/` |
| 数据库架构 | `install/dbdeploy/` |
