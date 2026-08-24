# MelisCmsPageHistoric

> سجل تدقيق لتحرير صفحات نظام إدارة المحتوى (CMS) — يسجّل مَن قام بأي إجراء على صفحة ومتى، ويظهر كتبويب "السجل التاريخي" في محرّر الصفحات المبني على React وكعنصر (widget) في لوحة التحكم. الحزمة `melisplatform/melis-cms-page-historic`.

## الغرض

يلتقط `MelisCmsPageHistoric` تلقائيًا كل إجراء يُنفَّذ على الصفحة (حفظ، نشر، إلغاء نشر، حذف)
مع هوية المؤلف والطابع الزمني. يُكتَب السجل عبر مستمعي الأحداث (event listeners) المرتبطين بدورة حياة
صفحة نظام إدارة المحتوى — دون الحاجة إلى أي إعداد لكل صفحة على حدة. ويُعرَض السجل **للقراءة فقط**: في
**تبويب السجل التاريخي** داخل محرّر الصفحات، وفي عنصر لوحة التحكم **النشاط الأخير للصفحات**. الغرض منه
هو المساءلة، وليس استعادة الصفحات.

## تفعيله

أضِف إلى `config/melis.module.load.php`:

```php
return [
    'MelisCmsPageHistoric',
];
```

شغّل ملفات الترحيل المرفقة في `install/dbdeploy/` لإنشاء جدول السجل التاريخي (`extra.dbdeploy: true`).
يتطلّب `melis-core` و`melis-engine` و`melis-front` و`melis-cms`.

## وحدة من دون "brick"

هذه وحدة React غير معتادة: فهي لا تشحن **أي brick خاص بها** (لا `ui-react/`، ولا
`public/ui-react/brick.manifest.json`، ولا حزمة Vite). يقتصر أثرها البرمجي في React على ثلاثة ملفات إعداد
PHP تدمجها `Module::getConfig()`، بالإضافة إلى متحكّم (controller) وإضافة قديمة (legacy) للوحة التحكم. ويظهر
سطحا React كلاهما **فقط أثناء تفعيل الوحدة**.

| ملف الإعداد | المساهمة |
| --- | --- |
| `config/react-api.php` | نقطة النهاية `GET /melis/react-api/cms-page/historic` + المتحكّم القابل للاستدعاء (invokable) |
| `config/react.capabilities.php` | صلاحية تبويب السجل التاريخي ضمن العقدة المشتركة `meliscms_page` |
| `config/app.interface.php` | **زر** تبويب السجل التاريخي في محرّر صفحات نظام إدارة المحتوى (الأيقونة `history`) |

مكوّن React الذي يُعرَض داخل تبويب السجل التاريخي **لا تشحنه هذه الوحدة** — بل يوفّره
جانب المضيف عبر غلاف (shell) melis-core ويُربَط من خلال سجلّ تبويبات الصفحة (page-tab registry)
(`window.__melisRegisterPageTab('melispagehistoric_historic', Component)`). تساهم هذه الوحدة
فقط بنقطة نهاية البيانات، والصلاحية، وإعلان زر التبويب؛ أما محرّر صفحات نظام إدارة المحتوى
(MelisCms) فهو الذي يستضيف التبويب.

## تبويب السجل التاريخي (محرّر الصفحات في React)

الشريط الجانبي الأيسر ← **MelisCms** ← افتح **صفحة** ← تبويب **Historic** في صف تبويبات المحرّر. يعرض
جدولًا للقراءة فقط بإجراءات **هذه الصفحة**، الأحدث أولًا، بأعمدة **Date** و**Action**
(شارات ملوّنة Publish / Save / Unpublish) و**User**. وتُتيح قائمة منسدلة **Filter (All actions)**
تضييق العرض إلى نوع إجراء واحد. والقائمة **مُقسَّمة إلى صفحات من جانب الخادم** — فهي لا تُحمّل السجل
بالكامل دفعة واحدة.

![تبويب السجل التاريخي في محرّر صفحات نظام إدارة المحتوى المبني على React يعرض جدول سجل الصفحة بأعمدة Date وشارات Action وUser بالإضافة إلى مرشّح الإجراءات](/screenshots/react/melis-cms-page-historic/meliscmspagehistoric-page-tab-historic.png)

يعرض التبويب سجل الصفحة الحالية فقط. أما للاطّلاع على النشاط عبر *جميع* الصفحات، فاستخدم عنصر لوحة التحكم
أدناه.

## عنصر لوحة التحكم "النشاط الأخير للصفحات"

في **لوحة التحكم** بالواجهة الخلفية، يسرد عنصر **النشاط الأخير للصفحات** أحدث إجراءات
الصفحات عبر جميع المستخدمين (الطابع الزمني · نقطة الحالة · اسم الصفحة + المُعرّف · الإجراء · المستخدم). ويُضاف
أو يُزال من لوحة "Add a widget" مثل أي عنصر آخر في لوحة التحكم، ضمن مجموعة **MELIS CMS
PAGE HISTORIC**.

![عنصر لوحة التحكم "النشاط الأخير للصفحات" يسرد إجراءات الصفحات الأخيرة، مع ظهور لوحة Add a widget معروضًا ضمن Melis Cms Page Historic](/screenshots/react/melis-cms-page-historic/meliscmspagehistoric-dashboard-plugin-recentactivity.png)

لا يزال هذا العنصر **إضافة PHP قديمة (legacy) للوحة التحكم**
(`MelisCmsPageHistoricRecentUserActivityPlugin`، الإجراء `recentActivityPages`) تُعرَض داخل مضيف
عناصر لوحة التحكم في React — ولا توجد إعادة كتابة بـ React. يقرأ عبر
`MelisPageHistoricTable->getPagesHistoricForDashboard()`، ويشترط تفعيل MelisCms إضافةً إلى
حق الوصول إلى إضافة لوحة التحكم.

## واجهة React API — نقطة نهاية السجل التاريخي

مُعلَنة في `config/react-api.php`، المتحكّم
`MelisCmsPageHistoric\Controller\MelisReactApiPageHistoricController` (الاسم المستعار القابل للاستدعاء
`MelisReactApiPageHistoric`). إجراء واحد، وفق العقد `{ success, data, error }`.

| الطريقة والعنوان | الإجراء | الغرض |
| --- | --- | --- |
| `GET /melis/react-api/cms-page/historic?idPage=<id>&page=<n>&perPage=<25>&action=<type>` | `listAction` | صفوف تدقيق الصفحة الحالية، مُقسَّمة إلى صفحات من جانب الخادم، بالإضافة إلى أنواع الإجراءات المميّزة لقائمة المرشّح المنسدلة |

بنية `data` في الاستجابة:

```jsonc
{ "success": true, "data": {
  "idPage": 1,
  "items": [ { "id": 123, "date": "2026-08-18 10:10:25", "action": "Publish",
               "user": "John Doe", "userId": 1 } ],   // newest first (ORDER BY hist_id DESC)
  "page": 1, "perPage": 25, "total": 87,               // total = indexed COUNT → drives paging
  "action": "",                                        // active action filter ('' = all)
  "actionTypes": ["Publish", "Save", "Unpublish"]      // DISTINCT hist_action for the filter select
} }
```

ملاحظات التنفيذ:

- **الحماية:** يتحقّق الإجراء من `MelisCoreAuth->hasIdentity()` فقط (يعيد `401` في حال عدم
  المصادقة). وهو **لا** يفرض أي صلاحية من جانب الخادم — فاعتبر الصلاحية أدناه إشارةً
  **لضبط الواجهة (UI-gating)**، وليست تحقّقًا من التفويض في الواجهة الخلفية.
- **البيانات:** استعلام SQL مُعامَل مباشر على `melis_hist_page_historic` (مع LEFT JOIN لـ `melis_core_user`
  لجلب اسم المستخدم؛ ويُسمّى المستخدم المحذوف `"Utilisateur supprimé (<id>)"`).
- **التقسيم إلى صفحات:** يُقيَّد `perPage` ضمن النطاق `1..200` (القيمة الافتراضية 25)؛ و`total` هو
  `COUNT(*)` مفهرس منفصل يراعي نفس شرط `WHERE`. ويُطبَّق مرشّح `action` الاختياري على العدّ
  والصفحة معًا.

## الصلاحيات

لأن الوحدة تساهم بتبويب في أداة صفحات نظام إدارة المحتوى، تُعلَن صلاحيتها ضمن عقدة الحقوق
**المشتركة** `meliscms_page` (يُلحق `ArrayUtils::merge` بها داخل `tabs[]` الخاصة بتلك الأداة):

```php
return [
  'melisReactToolCapabilities' => [
    'meliscms_page' => [
      'tabs' => [
        ['key' => 'melispagehistoric_historic', 'label' => 'tr_melispagehistoric_page_tab_historic_Historic'],
      ],
    ],
  ],
];
```

- المفتاح `key` (`melispagehistoric_historic`) هو صلاحية التبويب؛ وهو يطابق المفتاح الذي يستخدمه المضيف
  لتسجيل مكوّن التبويب، ويطابق `melisKey` في واجهة `app.interface.php`.
- يُفهرَس ضمن `meliscms_page` ("Edition de page" في Users ← Rights)، **وليس** ضمن الغلاف
  `meliscms` و**ليس** ضمن عقدة زر التبويب.
- من دون هذا الإعلان، تُخفي القائمة البيضاء لصلاحيات صفحة نظام إدارة المحتوى زرَّ التبويب — حتى للمسؤول (admin).

## كيف يُكتَب السجل التاريخي (نمط المستمِع)

يسجّل الصفوفَ مستمِعان مرتبطان في `src/Module.php` (تهيئة الواجهة الخلفية فقط)؛ أما React فيقرأها فحسب.

| المستمِع | الحدث/الأحداث | ما يسجّله |
| --- | --- | --- |
| `MelisPageHistoricPageEventListener` | `meliscms_page_save_end`، `meliscms_page_publish_end`، `meliscms_page_unpublish_end`، … | حفظ / نشر / إلغاء نشر |
| `MelisPageHistoricDeletePageListener` | `meliscms_page_delete_end` | حذف (مع تنظيف السجل أيضًا) |

لست بحاجة إلى كتابة صفوف السجل بنفسك — فحفظ صفحة أو نشرها أو حذفها عبر نظام إدارة المحتوى
يُطلِق المستمِعَين تلقائيًا.

## جدول قاعدة البيانات

| الجدول | ما يحتويه |
| --- | --- |
| `melis_hist_page_historic` | صف واحد لكل إجراء مُسجَّل: `hist_id` (PK) و`hist_page_id` و`hist_action` و`hist_date` و`hist_user_id` و`hist_description`. |

## الملفات الأساسية

| الموضوع | المسار |
| --- | --- |
| متحكّم React-api | `vendor/melisplatform/melis-cms-page-historic/src/Controller/MelisReactApiPageHistoricController.php` |
| مسار React-api | `vendor/melisplatform/melis-cms-page-historic/config/react-api.php` |
| صلاحية تبويب السجل التاريخي | `vendor/melisplatform/melis-cms-page-historic/config/react.capabilities.php` |
| زر تبويب السجل التاريخي / الواجهة | `vendor/melisplatform/melis-cms-page-historic/config/app.interface.php` |
| تهيئة الوحدة (المستمِعون) | `vendor/melisplatform/melis-cms-page-historic/src/Module.php` |
| بوّابة الجدول (Table gateway) | `vendor/melisplatform/melis-cms-page-historic/src/Model/Tables/MelisPageHistoricTable.php` |
| إضافة لوحة التحكم (قديمة) | `vendor/melisplatform/melis-cms-page-historic/src/Controller/DashboardPlugins/MelisCmsPageHistoricRecentUserActivityPlugin.php` |
| SQL التثبيت / dbdeploy | `vendor/melisplatform/melis-cms-page-historic/install/` |

انظر أيضًا: [MelisCms](/ar/reference/modules/melis-cms)، [مرجع الوحدات](/ar/reference/modules)
