# MelisCmsLinkCheck

> أداة اختبار الروابط تقوم بزحف صفحة (واختيارياً صفحاتها الفرعية أو روابطها الداخلية) وتسجّل كل رابط
> معطّل وكل صورة معطّلة، مع الاحتفاظ بسجل فحص واحد لكل صفحة. الحزمة `melisplatform/melis-cms-link-check`.

## الغرض

MelisCmsLinkCheck هي أداة اختبار الروابط في Melis. تقوم بزحف صفحة — مع إمكانية اتّباع صفحاتها الفرعية أو
روابطها الداخلية — وتسجّل كل رابط معطّل وكل صورة معطّلة تعثر عليها، وتحفظ سجل فحص واحداً لكل صفحة تُفحص.
عملية الزحف نفسها (curl، والتحقق، وإدراج السجلات، والترجمات) تجري من جهة الخادم في خدمة Laminas
`MelisCmsLinkCheckService::executeTest()`؛ أما الواجهة الخلفية بلغة React فهي طبقة عرض تقرأ عمليات الفحص
وتطلقها عبر نقاط نهاية react-api الخاصة بالوحدة.

في الواجهة الخلفية v6 بلغة React (`/melis-react`) تقدّم الوحدة كتلة (brick) أصلية بالكامل بلغة React
ذات واجهتين:

- أداة **Link tester** في القائمة اليسرى — عارض للقراءة فقط لنتائج عمليات الفحص السابقة، ونافذة منبثقة
  **Launch a scan**، وتقرير أخطاء لكل صف، مع مبدّل **New / Old** يتراجع إلى الأداة الكلاسيكية داخل
  iframe.
- علامة تبويب **Link Checker** في محرّر صفحات CMS بلغة React، تطلق وتقدّم تقريراً عن فحص محصور بالصفحة
  الواحدة الجاري تحريرها.

## تفعيلها

أضِف إلى `config/melis.module.load.php`:

```php
return [
    'MelisCmsLinkCheck',
];
```

كلتا الواجهتين محكومتان بالتفعيل: لا تظهران إلا إذا كانت الوحدة نشطة، ويكتشفهما المضيف عبر
`GET /melis/react-api/react-modules` (الذي يسرد الوحدات النشطة التي تقدّم ملف `brick.manifest.json`).
إلغاء تفعيل الوحدة يزيل أداة القائمة وعلامة تبويب محرّر الصفحة معاً.

## الواجهة الخلفية بلغة React في لمحة

| العنصر | القيمة |
| --- | --- |
| نوع الكتلة | أصلية بالكامل بلغة React (مع تراجع New/Old عبر iframe الكلاسيكي) + علامة تبويب في محرّر الصفحة |
| معرّف الكتلة | `cms-link-check` |
| `route` في الـ manifest | `/melis-cms-link-check/results` |
| `label` | `Testeur de liens` (Link tester) |
| `forwardKey` | `MelisCmsLinkCheck/MelisCmsLinkCheckList` |
| `melisKey` (القائمة / iframe للعرض Old / عقدة الصلاحيات) | `meliscmslinkcheck_tool` |
| مفتاح علامة تبويب الصفحة (= صلاحيّتها) | `meliscmslinkcheck_page_link_check_tab` |
| قاعدة الـ API | `/melis/react-api/cms-link-check` |
| متحكّم react-api | `MelisReactApiLinkCheckController` (القابل للاستدعاء `MelisReactApiLinkCheck`) |
| الجدول (المملوك) | `melis_cms_link_check_logs` |
| خدمة الفحص | `MelisCmsLinkCheckService::executeTest(...)` |

## أداة Link tester

الشريط الجانبي الأيسر ← تفتح عقدة **Link tester** (*Testeur de liens*) الأداة كعلامة تبويب علوية. يسرد
العرض New كل سجل فحص على المنصّة، بصف واحد لكل صفحة مفحوصة.

![أداة Link tester بلغة React تعرض بطاقات KPI والمرشّحات وقائمة النتائج](/screenshots/react/melis-cms-link-check/meliscmslinkcheck-tool-linkchecker-list.png)

تتضمّن القائمة بطاقات KPI (الصفحات المفحوصة، وإجمالي الأخطاء، والمواقع)، ومربّع بحث (يطابق عنوان URL
للصفحة، ومعرّف الصفحة، واسم/تسمية الموقع)، ومرشّح مواقع (المواقع التي لها سجلات فقط)، وزر إعادة تعيين
المرشّحات، ومدير أعمدة (إظهار/إخفاء/إعادة ترتيب الأعمدة، محفوظ محلياً)، وأداة تصدير. انقر رأس عمود
للفرز (الافتراضي: أحدث فحص أولاً). تُعرض أعداد الأخطاء كشارات — خضراء عند 0، وحمراء فيما عدا ذلك
(الأخطاء = الإجمالي، الروابط، الصور).

لكل صف أربعة إجراءات:

| الإجراء | الأيقونة | الغرض |
| --- | --- | --- |
| View front | عين | يفتح عنوان URL للصفحة المفحوصة في علامة تبويب جديدة. |
| Edit page | قلم رصاص | يفتح الصفحة في محرّر صفحات CMS بلغة React وينتقل إليها. |
| Report | مستند | يفتح النافذة المنبثقة لتقرير أخطاء الصفحة. |
| Delete | سلة مهملات | يزيل سجل الفحص ذاك (يتطلّب صلاحية `delete`). |

يبدّل مبدّل **New / Old** في أعلى اليمين الأداة بالكامل بين عارض React (الافتراضي) والأداة الكلاسيكية
المعروضة داخل iframe (`/melis/react-tool-page?key=meliscmslinkcheck_tool`)، والتي يمكن أيضاً استخدامها
لإطلاق عمليات الفحص بالطريقة القديمة.

## إطلاق فحص

يفتح زر **Launch a scan** الأحمر (يظهر إذا كانت لديك صلاحية `launch`) نافذة منبثقة.

![النافذة المنبثقة Launch a scan مع منتقي الصفحة وأزرار نطاق الاختيار ومربّعات تحديد الفحص](/screenshots/react/melis-cms-link-check/meliscmslinkcheck-tool-linkchecker-launchscan.png)

اختَر صفحة البداية من شجرة صفحات CMS ذات التحميل الكسول، وحدّد **النطاق (scope)** وما الذي **يُفحص**، ثم
اضغط **Run**. يزحف الفحص الصفحة (الصفحات)، ويسجّل النتائج، ويحدّث القائمة، وينشر إشعاراً.

- **النطاق (Scope)** — هذه الصفحة فقط / هذه الصفحة وصفحاتها الفرعية / هذه الصفحة وروابطها الداخلية
  (يُرسل بصيغة `follow: '1' | '2' | '3'`).
- **الفحص (Check)** — الروابط و/أو الصور (يُرسل بصيغة `options: ['LINK', 'IMG']`).

## قراءة تقرير الصفحة

يفتح إجراء **Report** على صف ما تفاصيل الأخطاء لسجل الفحص ذاك.

![النافذة المنبثقة لتقرير أخطاء الصفحة في حالتها النظيفة](/screenshots/react/melis-cms-link-check/meliscmslinkcheck-tool-linkchecker-report.png)

تعرض الصفحة النظيفة "✓ No error recorded for this page." أما الصفحة التي بها أخطاء فتعرض جدولاً:
**Type** (شارة LINK / IMG) · **URL** · **Details** (سبب الفشل). تأتي التفاصيل من عمود `lcl_errors`
المحلّل بصيغة XML، والمفكوك ترميزه إلى `errorList` من `{ url, type, details }`.

## فحص صفحة واحدة من محرّرها

افتح صفحة في محرّر صفحات CMS بلغة React وانقر علامة التبويب **Link Checker**. تعرض آخر فحص لتلك الصفحة
(التاريخ، وشارات Errors / Links / Images، وجدول الأخطاء التفصيلي أو رسالة نظافة) مع زر **Re-scan** — أو
**Launch a scan** إذا لم تُفحص الصفحة من قبل — يُشغّل فحصاً لتلك الصفحة فقط.

![علامة التبويب Link Checker في محرّر صفحات CMS بلغة React تعرض فحصاً محصوراً بالصفحة](/screenshots/react/melis-cms-link-check/meliscmslinkcheck-pageedition-tab-linkchecker-launchandreport.png)

تُضاف علامة التبويب إلى محرّر صفحات CMS عبر جسر المضيف `window.__melisRegisterPageTab` (المملوك لكتلة
CmsPage)، بالمفتاح `meliscmslinkcheck_page_link_check_tab`؛ وتعرضها CmsPage مع `{ idPage }`.

## واجهة React API — نقاط النهاية

تقع المسارات في `config/react-api.php`، ويخدمها
`MelisCmsLinkCheck\Controller\MelisReactApiLinkCheckController`. جميعها تحت
`/melis/react-api/cms-link-check`، بالعقد `{ success, data, error }`. يرسل كل طلب جلب
`X-Requested-With: XMLHttpRequest` و`credentials: 'include'`.

| الأسلوب وعنوان URL | الإجراء | الغرض |
| --- | --- | --- |
| `GET /cms-link-check` | `list` | سجلات الفحص (keyset: `limit`, `search`, `site`, `sort`, `dir`, `after`) → `{items,total,nextCursor}` |
| `GET /cms-link-check/stats` | `stats` | مؤشرات KPI `{total, errors, sites}` |
| `GET /cms-link-check/sites` | `sites` | خيارات مرشّح المواقع (المواقع الموجودة في السجلات فقط) |
| `POST /cms-link-check/launch` | `launch` | تشغيل فحص (`{pageId, follow, options}`) → `{status,message,logIds,pagesVisited}` |
| `GET /cms-link-check/by-page/:idPage` | `byPage` | آخر فحص لصفحة واحدة (علامة تبويب محرّر الصفحة)؛ `data: null` إذا لم تُفحص قط |
| `DELETE /cms-link-check/delete/:id` | `delete` | حذف سجل فحص |
| `GET /cms-link-check/:id` | `get` | سجل واحد + `errorList:[{url,type,details}]` المحلّل الخاص به |

> ترتيب المسارات مهم: تُصرَّح `/stats` و`/sites` و`/launch` و`/by-page/:idPage` و`/delete/:id`
> قبل المسار الشامل `/:id`.

تقرأ إجراءات `list` و`stats` و`sites` و`get` و`by-page` و`delete` جدول `melis_cms_link_check_logs`
مباشرةً عبر SQL ذي معاملات (`Laminas\Db\Adapter\AdapterInterface`). ووحده `launch` يفوّض إلى
`MelisCmsLinkCheckService::executeTest([...])` — الزحف الفعلي — ملفوفاً في `ob_start()` /
`ob_end_clean()` حتى لا تُفسد التحذيرات القديمة استجابة JSON. يعيد منتقي صفحة Launch-a-scan استخدام
نقطة نهاية قديمة موجودة (دون خلفية جديدة):
`GET /melis/MelisCms/TreeSites/get-tree-pages-by-page-id?nodeId=<id>` (`nodeId=-1` ← مواقع الجذر).

## الصلاحيات

مُصرَّح بها في `config/react.capabilities.php` تحت عقدتين حاملتين للحقوق:

```php
return [
  'melisReactToolCapabilities' => [
    'meliscmslinkcheck_tool' => ['list', 'launch', 'delete', 'export'],
    'meliscms_page' => [
      'tabs' => [
        ['key' => 'meliscmslinkcheck_page_link_check_tab', 'label' => 'tr_meliscmslinkcheck_page_link_check_tab'],
      ],
    ],
  ],
];
```

- **صلاحيات الأداة** — `list` (العارض للقراءة فقط بالكامل: list/stats/sites/report)، و`launch`
  (تشغيل فحص)، و`delete` (حذف سجل)، و`export` (زر التصدير؛ يعيد التصدير استخدام نقطة نهاية `list`). في
  React تحكم هذه الصلاحيات الواجهة عبر `MelisCan('meliscmslinkcheck_tool', cap)`؛ ومن جهة الخادم يُحرَس
  كل إجراء بـ `denyUnlessAccess()` ثم `denyUnlessCan('list'|'launch'|'delete')`.
- **صلاحية علامة تبويب الصفحة** — يجب أن يساوي المفتاح `key` وهو `meliscmslinkcheck_page_link_check_tab`
  المفتاح المُمرَّر إلى `window.__melisRegisterPageTab`؛ فهو *ذاته* صلاحية علامة التبويب. بدون هذا
  التصريح تُخفي قائمة صلاحيات صفحات CMS المسموح بها زر علامة التبويب حتى بالنسبة للمسؤول. نقطة نهاية
  `by-page` الخاصة بعلامة التبويب محكومة بمصادقة الجلسة فقط (فهي ميزة فرعية من محرّر الصفحة)؛ أما الزر
  فبهذه الصلاحية.

## جداول قاعدة البيانات

| الجدول | الدور |
| --- | --- |
| `melis_cms_link_check_logs` | سجل فحص واحد لكل صفحة مفحوصة: أعداد الروابط المعطّلة / الصور المعطّلة إضافةً إلى قائمة الأخطاء التفصيلية المخزّنة بصيغة XML في عمود `lcl_errors`. |

## المتحكّمات القديمة (العرض Old)

يستخدمها تراجع New/Old عبر iframe والأداة الكلاسيكية، لا عارض React:

| المتحكّم | الدور |
| --- | --- |
| `MelisCmsLinkCheckListController` | صفحة الأداة الكلاسيكية + جداول DataTables لنتائجها. |
| `MelisCmsLinkCheckLaunchController` | النافذة المنبثقة / النموذج الكلاسيكي للإطلاق (الصفحة + النطاق + الفحص). |
| `MelisCmsLinkCheckPageLinkCheckController` | علامة تبويب Link Check الكلاسيكية في تحرير الصفحة (`renderPageLinkCheckAction`, `{ idPage }`). |

## الملفات الأساسية

| الشأن | المسار |
| --- | --- |
| مسارات react-api + القابل للاستدعاء | `config/react-api.php` |
| الصلاحيات | `config/react.capabilities.php` |
| إعداد الأداة القديمة | `config/app.*.php` |
| متحكّم react-api | `src/Controller/MelisReactApiLinkCheckController.php` |
| خدمة الفحص | `src/Service/MelisCmsLinkCheckService.php` |
| مصدر كتلة React | `ui-react/src/` (`brick.tsx`, `LinkCheckPage.tsx`, `linkcheck-api.ts`, …) |
| الكتلة المبنية + الـ manifest | `public/ui-react/brick.js`, `public/ui-react/brick.manifest.json` |
