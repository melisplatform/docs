# MelisDocumentUpload

> إدارة رفع المستندات في الواجهة الخلفية بوصفها أداة React أصلية: تعريف أنواع المستندات، وجمع
> الملفات المرفوعة وتخزينها وتقديمها، وربطها بإجابات MelisFormCreator. الحزمة
> `melisplatform/melis-document-upload`.

## الغرض

`MelisDocumentUpload` أداة قابلة لإعادة الاستخدام لجمع المستندات. تُعرّف **أنواع المستندات** التي
ترغب في جمعها (جواز سفر، إثبات عنوان…)، ثم تتصفّح **الملفات المرفوعة** الفعلية — المُخزّنة
على **نظام الملفات** (ضمن `data/`) أو في **قاعدة البيانات** بوصفها BLOB، والمُقدَّمة مرة أخرى عبر
**عنوان URL بالرمز المميّز** ثابت لا يحتاج إلى تسجيل دخول في الواجهة الخلفية. أبرز مستهلكيها هو **MelisFormCreator**،
الذي يمكنه اشتراط مستند وربط عملية رفع بإجابة نموذج محدّدة.

في الإصدار v6 تُشحن الأداة بوصفها **لبنة React كاملة أصلية** في الواجهة الخلفية `/melis-react`. تمتلك طبقة
React واجهة المستخدم بأكملها وواجهة JSON API الخاصة بها؛ أما كل منطق الأعمال (التحقق، والتخزين، والرمز المميّز، والعلاقات)
فيبقى في خدمات Laminas الخاصة بالوحدة، دون تغيير عن الإصدار v5.

## تفعيلها

وحدة Laminas قياسية، مُدرَجة مسبقًا في `config/melis.module.load.php` باسم `'MelisDocumentUpload'`.
إذا أضفتها يدويًا:

```php
// config/melis.module.load.php
return [
    // …
    'MelisDocumentUpload',
];
```

ثم `composer require melisplatform/melis-document-upload`. تعتمد على
`melisplatform/melis-core`؛ ولا يظهر تكامل MelisFormCreator (أعمدة Form Type / Status، واشتراط
"document" في النموذج) إلا عندما يكون MelisFormCreator مُفعّلًا. تُكتشَف اللبنة عبر
`GET /melis/react-api/react-modules` ولا تظهر إلا عندما تكون الوحدة مُفعّلة.

## الواجهة الخلفية بلغة React

تُسجّل اللبنة صفحة موجَّهة واحدة (`DocumentUploadPage`) تحت معرّف اللبنة
**`melis-document-upload`**. تظهر في الشريط الجانبي ضمن **MelisMarketing → Document Upload**
وتُفتح على تبويب **Uploaded documents**. مساحة عمل ذات تبويبَين:

- **Uploaded documents** — تصفّح الملفات المرفوعة الفعلية (ID، Document name، Owner، Size، Type،
  File/Form name، Form Answer ID، Upload date). ارفع ملفًا جديدًا، أو أعِد تعيين مالكه، أو اعرضه عبر
  عنوان URL بالرمز المميّز، أو احذفه.
- **Document List (types)** — إدارة تعريفات المستندات (ID، Name، Model DEFAULT/CUSTOM، Type للتخزين
  FILESYSTEM/DB، Max size، Path؛ إضافةً إلى Form Type / Status عندما يكون MelisFormCreator مُفعّلًا). إضافة /
  تعديل / حذف.

يحمل كلا التبويبَين **بطاقات KPI** (Total / In database / Filesystem)، وبحثًا حيًّا، و**مدير أعمدة** محفوظًا
(اسحب لإعادة الترتيب / الإخفاء) و**تصديرًا** (xlsx/CSV). فتحُ صفٍّ أو **Add** يفتح نموذجه
بوصفه **تبويبًا فرعيًا** أصليًا في SubTabBar الخاص بالمضيف (عنوان URL `/melis-document-upload/:sub`، مثل `type-new`،
`type-5`، `uploaded-new`، `uploaded-12`).

مبدّل **New / Old** في أعلى اليمين (`ViewToggle.tsx`) يعرض الأداة القديمة الكلاسيكية في إطار iframe عند
`/melis/react-tool-page?key=melis_document_upload_tool` للمقارنة.

![تبويب Uploaded documents (React): قائمة الملفات المرفوعة مع بطاقات KPI والبحث ومدير الأعمدة ومبدّل New/Old.](/screenshots/react/melis-document-upload/melisdocumentupload-tool-docupload-list.png)

### تبويب Uploaded documents

إجراءات الصف **edit** (إعادة تعيين المالك / عرض الملف) و**delete** (نافذة تأكيد منبثقة). **Upload Document**
يفتح نموذج الرفع بوصفه تبويبًا فرعيًا: حقل **Owner** هو حقل اقتراح تلقائي مدعوم من الخادم، وحقل **Document name**
قائمة منسدلة بتعريفاتك. الحفظ مع ملف يُشغّل الإجراء نفسه على الخادم `processUpload` (تحقق،
ونقل إلى نظام الملفات أو تخزين BLOB في قاعدة البيانات، ورمز مميّز). التعديل دون ملف جديد يعيد تعيين المالك فقط. **View file**
يحلّ عنوان URL العام بالرمز المميّز للملف.

![نموذج المستند المرفوع (تبويب React الفرعي): اختر المالك، واسم المستند Document name، والملف، ثم Save.](/screenshots/react/melis-document-upload/melisdocumentupload-tool-docupload-list-edit-modal.png)

### تبويب Document List (types)

![تبويب Document List (React): تعريفات أنواع المستندات مع بطاقات KPI ومدير الأعمدة والتصدير.](/screenshots/react/melis-document-upload/melisdocumentupload-tool-docupload-typedoclist.png)

يحمل نموذج النوع حقل **Name** لكل لغة، ووصفًا نصيًا غنيًا **Description**، و**Class name for
custom rendering documents** (يجعل تعبئتُه النوعَ CUSTOM)، و**Max Size (Mb)**، ونوع التخزين
**Type** (Filesystem مع مسار انطلاقًا من DOCROOT، أو Database)، ومبدّل **Is the document mandatory?**،
و — عندما يكون MelisFormCreator مُفعّلًا — **Display** (ALL / MANUAL) و**Form status**. بالنسبة إلى
نوع Filesystem، يُتحقَّق من مسار الحفظ على جانب الخادم للحماية من اجتياز المسار (تُرفض `..` والشرطات المائلة الخلفية
والأحرف غير `[A-Za-z0-9_-/]`).

![نموذج نوع المستند (تبويب React الفرعي): Name لكل لغة، وصنف مخصّص، Max Size، نوع التخزين Type + المسار، مبدّل الإلزام.](/screenshots/react/melis-document-upload/melisdocumentupload-tool-docupload-typedoclist-edit-modal.png)

## واجهة React JSON API

لا يوجد **`config/react-api.php`**. نقاط نهاية React هي إجراءات
`MelisDocumentUpload\Controller\DocumentUploadReactApiController` (الذي يمدّ
`DocumentUploadListController` ويعيد استخدام خدمات الوحدة)، ويُوصَل إليها عبر مسار MVC الشامل
(catch-all) الموجود في الوحدة. كل عنوان URL على الصيغة
`/melis/MelisDocumentUpload/DocumentUploadReactApi/<action>`. ولأن المسار الشامل يرفض مقطع مسار
ثالثًا، **تُمرَّر المعرّفات على هيئة `?id=`** ضمن معطيات الاستعلام وتكون عمليات الحذف `POST …?id=`.

يستدعي كل إجراء أولًا `denyUnlessAccess()` (المصادقة عبر `MelisCoreAuth->hasIdentity()` +
`MelisCoreRights->canAccess('melis_document_upload_tool')`، ويُعيد 401 / 403). عقد الاستجابة
في كل مكان: `{ success: bool, data: T, error?: string, errors?: {...} }` (17 نقطة نهاية إجمالًا).

| الطريقة · عنوان URL (`…/DocumentUploadReactApi/…`) | الغرض · الخدمة |
| --- | --- |
| `GET /meta` | أيّ الوحدات الاختيارية مُفعّلة (`formCreator`، `formEngine`) |
| `GET /languages` | لغات المنصّة مرتّبة |
| `GET /typesList?search=` | سرد التعريفات (`MelisDocumentService::getList`) |
| `GET /typesStats` | بطاقات KPI (total / db / filesystem) |
| `GET /formOptions` | حالات FormCreator + أوضاع العرض (عند التفعيل) |
| `GET /typesGet?id=` | السجل الكامل + الأسماء لكل لغة |
| `POST /typesSave` | إنشاء/تحديث (`saveDocumentItem`؛ يتحقق من مسار FS) |
| `POST /typesDelete?id=` | حذف ناعم (`deleteDocumentItem`) |
| `GET /uploadedList?search=` | سرد الملفات المرفوعة (`MelisDocumentUploadService::getList`) |
| `GET /uploadedStats` | بطاقات KPI |
| `GET /uploadedGet?id=` | مستند مرفوع واحد |
| `POST /uploadedSave` (multipart) | رفع ملف (`processUpload`) |
| `POST /uploadedUserSave` | إعادة تعيين مالك صفٍّ موجود فقط |
| `POST /uploadedDelete?id=` | حذف (`deleteDocumentUpload`) |
| `GET /uploadedFileUrl?id=` | عنوان URL العام بالرمز المميّز (`getDocumentUrl`) |
| `GET /documentOptions` | خيارات أنواع المستندات للقائمة المنسدلة الخاصة بالرفع |
| `GET /boUsers?phrase=` | اقتراح تلقائي لمستخدمي BO في حقل المالك |

```ts
// document-upload-api.ts — BASE = '/melis/MelisDocumentUpload/DocumentUploadReactApi'
const res = await fetch(`${BASE}/uploadedList?search=`, {
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
  credentials: 'include',
})
const { success, data } = await res.json()  // data: { items: UploadedItem[], total }
```

## القدرات

الملف `config/react.capabilities.php` (المدمج في `getConfig()`، والمقروء بواسطة
`MelisReactApi\Service\Capabilities`) مُفهرَس تحت عقدة القائمة الحاملة للصلاحيات
`melis_document_upload_tool` — وهي نفس melisKey التي يحرسها المتحكّم ويمرّرها `DocumentUploadPage`
إلى `useCaps()`. يُعلن عن **تبويبَين**، لكلٍّ منهما الإجراءات الخمسة نفسها:

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

فحوصات `can()` في React (`uploaded.create`، `types.export`، …) تُخفي الأزرار للراحة؛ أما الفرض
الحقيقي على الخادم فهو حارس الوصول على مستوى الأداة (`canAccess('melis_document_upload_tool')`) الذي
يُشغّله كل إجراء.

## الخدمات الرئيسية

مُسجّلة بوصفها أسماءً مستعارة في `service_manager` ضمن `config/module.config.php`. تمدّ جميعها
`MelisCore\Service\MelisGeneralService` (كل طريقة تُطلق أحداث `*_start` / `*_end`).

| الاسم المستعار للخدمة | الدور |
| --- | --- |
| `MelisDocumentService` | يدير **تعريفات المستندات** (الجدول `melis_docupl_documents`): `getList()`، `getItemById()`، `saveDocumentItem()`، `deleteDocumentItem()` (حذف ناعم عبر `isactive`)، `getDocumentByDocumentId()`، والأسماء متعددة اللغات عبر `saveFormDocumentTranslation()` / `getDocumentTranslation()`. |
| `MelisDocumentUploadService` | يتعامل مع **الملفات المرفوعة**. `processUpload($docId, $file, $postValues)` يتحقق، ويخزّن (FILESYSTEM أو DB)، ويسجّل الصف ويُسنِد رمزًا مميّزًا؛ `uploadFile()`، `saveDocumentUploaded()`، `deleteDocumentUpload()`، `getDocumentUploadByToken()`، `getDocumentUrl($docUploadId)` (يُعيد عنوان URL بالصيغة `?token=…`)، `getLatestDocumentUploadByDocId()`. |
| `MelisDocumentUploadRelationsService` | يقرأ علاقات الرفع←الإجابة: `getLatestDocumentUploadedDataByIdAndObjectId()`، `getDocUplRelationData()`. |
| `MelisDocumentUploadListRelService` | يدير علاقات التعريف←كائن النموذج (`melis_docupl_documents_lists_rel`): `saveDocumentUploadForm()`، `saveFormDocument()`، `getDocumentsByFormAnswerId()`، `getDocumentsDoneByFormAnswerId()`، `deleteDocumentListFormDelete()`. |

كما تُعرَّف بوابات الجداول (table gateways) بأسماء مستعارة: `MelisDocumentTable`، `MelisDocumentTransTable`،
`MelisDocumentUploadTable`، `MelisDocumentUploadRelationsTable`، `MelisDocumentListRelTable`،
`MelisDocumentUserTable`.

## الواجهة الأمامية

الوحدة ليست إضافة قوالب. تُعرَض الملفات المرفوعة عبر **عنوان URL بالرمز المميّز** ومُساعد
عرض (view helper):

- **مسار العرض العام** — `melis-backoffice/melisdocument` (`/melis/melisdocument?token=<token>`)،
  يعالجه `DocumentUploadController::viewAction`. يُحلّ الرمز المميّز إلى صفٍّ في
  `melis_docupl_documents_uploaded`، ويُبثّ الملف بنوع MIME المخزَّن له. المسار
  مُعلَن في `meliscore` ضمن `excluded_routes` (دون مصادقة الواجهة الخلفية).
- **مُساعد العرض `DocumentUploadHelper`** (الاسم المستعار `DocumentUploadHelper`) —
  `$this->DocumentUploadHelper($documentTypeId, $template, $objectId, $docUplRelationId)` يعرض
  شيفرة HTML الخاصة بأداة الرفع لتعريف مستند، ويختار القالب DEFAULT أو CUSTOM.

**إضافات المتحكّم (Controller plugins)** تعرض نموذج الرفع وتقوم بتسلسله وفكّ تسلسله:
`MelisDocumentUploadTemplatePlugin` (قاعدة مجرّدة، الطرق `render()`، `validateForm()`،
`encodeCustomDatas()`/`decodeCustomDatas()`)، و`MelisDocumentUploadTemplateDefaultPlugin` (النوع DEFAULT)
و`MelisDocumentUploadTemplateCustomPlugin` (النوع CUSTOM، حقول إضافية). يسمّي التعريف CUSTOM صنف
الإضافة الخاص به في `mdud_doc_class`.

## تكامل MelisFormCreator

ضمن واجهة `melisformcreator` تحقن الوحدة تبويب **Document** في صفحة تحرير النموذج
(`melisformcreator_form_edition_page_content_tabs_document`)، يخدمه
`DocumentUploadedFormCreatorController`، بحيث يمكن للنموذج اشتراط مستند مُهيّأ. تربط ثلاثة مُنصِتات
(listeners) مُسجّلة في `src/Module.php` على مسار `melis-backoffice` هذا معًا: `DeleteListener`،
`DocumentFormCreatorListener`، `DocumentFormCreatorInstructionListener`. بمجرد أن يجمع نموذج
مستندات، تظهر ملفات الإجابات في تبويب **Uploaded documents**.

## جداول قاعدة البيانات

يُنشئها `install/dbdeploy/` (dbdeploy مُفعّل في `composer.json`).

| الجدول | الدور |
| --- | --- |
| `melis_docupl_documents` | **تعريفات** الرفع: `mdud_type` (`DEFAULT`/`CUSTOM`)، `mdud_file_saving_type` (`DB`/`FILESYSTEM`)، `mdud_file_saving_path_from_root`، `mdud_max_size_mb`، `mdud_doc_class`، `mdud_is_mandatory`، `isactive`. |
| `melis_docupl_documents_trans` | **الأسماء** لكل لغة لتعريف ما (`mdudtr_lang_id`، `mdudtr_name`). |
| `melis_docupl_documents_uploaded` | **الملفات المرفوعة**: الاسم، الحجم، MIME (`mdud_file_mimetype`)، الامتداد، `mdudu_saving_type`، `mdudu_file_object` (BLOB)، `mdudu_token`، رافع الملف، `mdudu_upload_date`، `isactive`. |
| `melis_docupl_docs_relations` | يربط ملفًا مرفوعًا بكائن (`mdudr_type`، مثل `Form_answer`، + `mdudr_object_id`). |
| `melis_docupl_documents_lists_rel` | يربط تعريفًا بكائن نموذج (`mdudlr_object_type` = `FORM`). |

## مثال

تحقّق من ملف مرفوع لتعريف مستند وخزّنه، ثم ابنِ عنوان URL العام الخاص به:

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

## الملفات الرئيسية

| الشأن | المسار |
| --- | --- |
| تهيئة الوحدة / المسارات / الخدمات | `config/module.config.php` |
| قدرات React (تبويبان، دون `react-api.php`) | `config/react.capabilities.php` |
| مصدر لبنة React | `ui-react/src/` (`brick.tsx`، `DocumentUploadPage.tsx`، `document-upload-api.ts`) |
| اللبنة المبنيّة | `public/ui-react/brick.js`، `public/ui-react/brick.manifest.json` |
| متحكّم React API (17 إجراءً) | `src/Controller/DocumentUploadReactApiController.php` |
| خدمة الرفع | `src/Service/MelisDocumentUploadService.php` |
| خدمة التعريف | `src/Service/MelisDocumentService.php` |
| العرض العام + متحكّم الأداة | `src/Controller/DocumentUploadController.php` |
| متحكّم FormCreator | `src/Controller/DocumentUploadedFormCreatorController.php` |
| مُساعد العرض | `src/View/Helper/DocumentUploadHelper.php` |
| إضافات العرض | `src/Controller/Plugin/` |
| المُنصِتات | `src/Listener/` |
| المخطّط | `install/dbdeploy/` |
