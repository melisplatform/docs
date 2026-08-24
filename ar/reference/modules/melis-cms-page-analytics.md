# MelisCmsPageAnalytics

> تحليلات أساسية لزيارات الصفحات لمواقع CMS — تسجّل مشاهدات الصفحات وتتيح للموقع توصيل
> مزوّد تحليلات خارجي (مثل Google Analytics)، وتُدار الآن من مكتب خلفي بتقنية React أصلية.
> الحزمة `melisplatform/melis-cms-page-analytics`.

## الغرض

`MelisCmsPageAnalytics` هو أداة تتبّع مشاهدات الصفحات المدمجة في المنصّة. عند كل عملية عرض
لصفحة في المكتب الأمامي، تسجّل زيارة مُزالة التكرار (مرة واحدة لكل جلسة، لكل صفحة، لكل يوم) في
جدول `melis_cms_page_analytics`، وتُظهر البيانات في المكتب الخلفي كأداة موقع **Page Analytics**
وكتبويب **Page Analytics** في كل صفحة CMS. لكل موقع يمكنك أيضًا تخزين مفتاح مزوّد تحليلات
ومقتطف JavaScript يحقنه الموديول في `<head>` الصفحة وقت العرض — وهو الخطّاف الذي تستخدمه
المزوّدات الإضافية مثل Google Analytics.

في الإصدار v6 أصبح المكتب الخلفي **لبنة React كاملة أصلية**: جدول زيارات للقراءة فقط بالإضافة
إلى لوحة إعدادات، تستدعي طبقة JSON عبر `react-api`. أما التتبّع وعقد المزوّد واستمرارية الإعدادات
فتبقى دون تغيير — إذ يستبدل v6 طبقة العرض فقط.

## تفعيله

أضِف إلى `config/melis.module.load.php`:

```php
return [
    'MelisCmsPageAnalytics',
];
```

تبعيات Composer المطلوبة: `melisplatform/melis-core` و`melisplatform/melis-cms`. كما يعتمد الموديول
على خدمتَي `melis-engine` و`melis-front` وقت التشغيل (الشجرة، وجداول الصفحات، وأحداث توزيع
المكتب الأمامي). تُثبَّت جداول قاعدة البيانات عبر `MelisSetupController` من `install/sql/`. تظهر لبنة
React في القائمة فقط عندما يكون الموديول مُدرجًا في `melis.module.load.php` (اكتشاف اللبنات المعياري).

## الخدمات الرئيسية

مُسجَّلة كأسماء مستعارة في `service_manager` ضمن `config/module.config.php`:

| الاسم المستعار للخدمة | الدور |
| --- | --- |
| `MelisCmsPageAnalyticsService` | الخدمة الرئيسية المنفّذة لعقد المزوّد. تقرأ الدالة `getAnalytics($siteId)` مفتاح المزوّد النشط من `melis_cms_page_analytics_data` وصفّ الإعدادات المطابق من `melis_cms_page_analytics_data_settings`. |
| `MelisCmsDefaultPageAnalyticsService` | المُسجِّل المدمج. تحلّ الدالة `saveAnalyticsData($pageId)` الموقع، وتتحقّق من أن الصفحة نشطة/منشورة، وتُدرج صفًّا مُزال التكرار في `melis_cms_page_analytics` — ما لم يُهيّأ معرّف عرض Google Analytics ورمز مميّز، وفي هذه الحالة يتنحّى العدّاد المدمج جانبًا. |
| `MelisCmsPageAnalyticsTable` | بوابة الجدول لسجلّ الزيارات. |
| `MelisCmsPageAnalyticsDataTable` | بوابة الجدول لاختيار المزوّد لكل موقع. |
| `MelisCmsPageAnalyticsDataSettingsTable` | بوابة الجدول لإعدادات كل (موقع، مزوّد). |

تُطلق كلتا الخدمتين الرئيسيتين حدثَي البداية/النهاية: `melis_cms_default_page_analytics_save_start` /
`melis_cms_default_page_analytics_save_end`.

## المكتب الأمامي

لا يوجد مساعد عرض ولا إضافة قوالب. يتولّى التتبّع وحقن السكربت
`MelisCmsPageAnalyticsListener` (المُرفَق في `Module.php`)، والذي يربط حدثين في مسار العرض
في المكتب الأمامي:

| الحدث | الأولوية | الإجراء |
| --- | --- | --- |
| `melisfront_site_dispatch_ready` | `-10000` | عمليات عرض المكتب الأمامي فقط — تستدعي `MelisCmsDefaultPageAnalyticsService::saveAnalyticsData($pageId)` لتسجيل الزيارة المُزالة التكرار. |
| `melis_front_layout` | افتراضية | تقرأ مقتطف `pads_js_analytics` المُهيّأ للموقع وتحقنه قبل `</head>` في الـ HTML المعروض. |

## جداول قاعدة البيانات

| الجدول | المفتاح الأساسي | يحتوي على |
| --- | --- | --- |
| `melis_cms_page_analytics` | `ph_id` | سجلّ الزيارات (النقرات المُزالة التكرار): `ph_page_id`، `ph_session_id`، `ph_date_visit`، `ph_site_id`. لا يُخزَّن أي عنوان IP. |
| `melis_cms_page_analytics_data` | `pad_id` | اختيار المزوّد لكل موقع: `pad_site_id`، `pad_analytics_key`. |
| `melis_cms_page_analytics_data_settings` | `pads_id` | إعدادات كل (موقع، مزوّد): `pads_site_id`، `pads_analytics_key`، `pads_js_analytics`، `pads_settings` (مثل `google_analytics_view_id`). |

## المكتب الخلفي بتقنية React

الأداة هي **لبنة React كاملة أصلية** مع مبدّل **New / Old** يمكنه الرجوع إلى الأداة القديمة داخل
إطار iframe. تقع في الشريط الجانبي ضمن **Marketing / Site Tools → Page Analytics**
وتُفتح على تبويبين داخليين، **Analytics** و**Settings**.

| خاصية اللبنة | القيمة |
| --- | --- |
| معرّف اللبنة | `pageanalytics` |
| `route` في البيان | `/melis-marketing/meliscms-page-analytics` |
| `forwardKey` | `MelisCmsPageAnalytics/MelisCmsPageAnalyticsTool` |
| `melisKey` (هدف إطار iframe في العرض القديم) | `meliscms_page_analytics_display` |
| عقدة حارس الوصول (المتحكّم) | `meliscms_page_analytics_tools_section` |
| قاعدة الـ API | `/melis/react-api/page-analytics` |

- **تبويب Analytics** — جدول للقراءة فقط للزيارات **مُجمّعة لكل صفحة** (معرّف الصفحة، اسم الصفحة،
  عدد الزيارات، آخر زيارة) مع بطاقات مؤشرات أداء رئيسية (النقرات / الصفحات / المواقع / آخر زيارة)،
  ومرشّح مواقع، وبحث، ومدير أعمدة، وتمرير لا نهائي، وترتيب من جهة الخادم، و**Export**. تُظهر
  الصفحات المحذوفة تسمية مائلة *(deleted)*. إذا كان الموقع المُختار مُسنَدًا إلى مزوّد خارجي يأتي
  بعرض React خاص به، فإن التبويب يستضيف **لوحة تحكّم ذلك الموديول** بدلًا من الجدول المدمج.
- **تبويب Settings** — اختر **Site** ثم **Analytics module** (خيار "no analytics" المدمج بالإضافة
  إلى كل مزوّد نشط). تُعرض حقول الموديول المُختار مدفوعةً بالبيانات
  (نص / منطقة نص / قائمة اختيار / كلمة مرور / ملف، مثل مفتاح Google Analytics الخاص). يمكن كذلك
  لمشرفي المنصّة تحرير مقتطف JS المخصّص في `<head>`؛ أما غير المشرفين فيرونه للقراءة فقط.

> لقطات شاشة React لهذه الشاشات غير متوفّرة بعد.

## واجهة React API

تُعرَّف المسارات في `config/react-api.php` وتُدمج في تهيئة الموديول. العقد هو
`{ success, data, error }`؛ يرسل كل طلب الترويسة `X-Requested-With: XMLHttpRequest` و
`credentials: 'include'`. يدعم الواجهةَ متحكّمان: `MelisReactApiPageAnalyticsController` (الأداة)
و`MelisReactApiPageAnalyticsTabController` (تبويب محرّر صفحة CMS).

| الطريقة والعنوان | الغرض |
| --- | --- |
| `GET /melis/react-api/page-analytics` | الزيارات مُجمّعة لكل صفحة (keyset: `limit`، `search`، `site`، `sort`، `dir`، `after`) ← `{items,total,nextCursor}`، كل عنصر `{pageId,pageName,count,lastVisit}`. |
| `GET /melis/react-api/page-analytics/stats` | مؤشرات الأداء الرئيسية `{hits, pages, sites, lastVisit}` (تراعي `search`/`site`). |
| `GET /melis/react-api/page-analytics/sites` | خيارات المواقع `{sites:[{id,name}]}` للمُحدِّد. |
| `GET /melis/react-api/page-analytics/settings` | حالة تبويب الإعدادات (قائمة الموديولات + مخطّط النموذج المدفوع بالبيانات + القيم الحالية). |
| `GET /melis/react-api/cms-page/analytics` | زيارات صفحة واحدة (`idPage`، `page`، `perPage`) ← `{visits, sessions, lastVisit, recent, page, perPage, recentTotal}`. |

يقرأ متحكّم الأداة الجداول مباشرةً عبر SQL معلَّم (`melis_cms_page_analytics`
مربوطًا بـ `melis_cms_page_published` للأسماء و`melis_cms_site` للمُحدِّد، مع مؤشر keyset مبهم).
ويحرس الوصول على العقدة الحاملة للصلاحيات `meliscms_page_analytics_tools_section` — **وليس**
على `melisKey` الخاص بالبيان (`meliscms_page_analytics_display`)، الذي هو مجرّد مفتاح منطقة إطار
iframe للعرض القديم.

**كتابة الإعدادات ليست مسار react-api** — إذ ترسل لوحة الإعدادات حمولة `FormData` عبر POST إلى
إجراء الأداة القديمة بحيث يُعاد استخدام كل منطق جهة الخادم حرفيًا (تحقّق Laminas، ورفع مفتاح GA،
وتسلسل `pads_settings`، وحارس المشرف على الـ JS الخام، ومرسال الرسائل الوامضة):

```ts
const LEGACY_SAVE_URL = '/melis/MelisCmsPageAnalytics/MelisCmsPageAnalyticsTool/save'
await fetch(LEGACY_SAVE_URL, {
  method: 'POST',
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
  credentials: 'include',
  body: formData,
}) // → { success, textTitle, textMessage, errors }
```

## تبويب صفحة CMS والقدرات

يُسهم الموديول بتبويب **Page Analytics** في محرّر صفحة CMS، مدعومًا بـ
`GET /melis/react-api/cms-page/analytics` (إجمالي الزيارات، والجلسات المتمايزة، وآخر زيارة، وقائمة
مُصفّحة بتواريخ الزيارات الأخيرة لتلك الصفحة). يُعلَن عن التبويب في
`config/react.capabilities.php` ضمن العقدة المشتركة `meliscms_page`، والمفتاح
`meliscms_page_analytics_tab` **هو** سلسلة القدرة المستخدمة للتحكّم فيه في Users → Rights:

```php
'melisReactToolCapabilities' => [
  'meliscms_page' => [
    'tabs' => [
      ['key' => 'meliscms_page_analytics_tab', 'label' => 'tr_melis_cms_page_analytics_title'],
    ],
  ],
],
```

## العرض المعياري على مستوى الموقع

عندما يُسنَد إلى موقع موديول تحليلات خارجي يُعلن عن عرض React (مثل
**MelisCmsGoogleAnalytics** عبر `react_display_key`)، يستضيف تبويب Analytics عرض React الخاص بذلك
الموديول بدلًا من جدول الزيارات الأصلي. تستهلك اللبنة سجلًّا عامًّا،
`window.__melisAnalyticsSiteDisplays[<analyticsKey>]`؛ وتعيد الفحص عند حدث النافذة
`melis:analytics-site-display-registered` (تُحمَّل الحزم بشكل غير متزامن)، وإذا لم يكن هناك أي شيء
مُسجَّل، ترجع إلى إطار iframe `/melis/react-tool-page?key=<displayKey>&siteId=<site>`.

## مثال

```php
// Read the active analytics provider config for a site
$analytics = $serviceManager->get('MelisCmsPageAnalyticsService')->getAnalytics($siteId);

// Read recorded visits for a specific page (used by the Page Analytics tab)
$visits = $serviceManager->get('MelisCmsPageAnalyticsTable')->getDataByPageId($pageId);
```

يحدث تسجيل الزيارات تلقائيًا عند العرض في المكتب الأمامي عبر المستمع؛ ولا يُحتاج عادةً إلى
استدعاء `saveAnalyticsData()` مباشرةً.

## الملفات الرئيسية

| الجانب | المسار |
| --- | --- |
| إقلاع الموديول / تسجيل المستمع | `vendor/melisplatform/melis-cms-page-analytics/src/Module.php` |
| المسارات والخدمات وأسماء الجداول المستعارة والمتحكّمات | `vendor/melisplatform/melis-cms-page-analytics/config/module.config.php` |
| مسارات React API | `vendor/melisplatform/melis-cms-page-analytics/config/react-api.php` |
| قدرة تبويب React | `vendor/melisplatform/melis-cms-page-analytics/config/react.capabilities.php` |
| لبنة React + البيان | `vendor/melisplatform/melis-cms-page-analytics/public/ui-react/` |
| مصادر React | `vendor/melisplatform/melis-cms-page-analytics/ui-react/src/` |
| متحكّمات React API | `vendor/melisplatform/melis-cms-page-analytics/src/Controller/MelisReactApiPageAnalyticsController.php`، `MelisReactApiPageAnalyticsTabController.php` |
| عقد المزوّد | `vendor/melisplatform/melis-cms-page-analytics/src/Service/MelisCmsPageAnalyticsServiceInterface.php` |
| خدمة التحليلات الرئيسية | `vendor/melisplatform/melis-cms-page-analytics/src/Service/MelisCmsPageAnalyticsService.php` |
| المُسجِّل المدمج | `vendor/melisplatform/melis-cms-page-analytics/src/Service/MelisCmsDefaultPageAnalyticsService.php` |
| مستمع المكتب الأمامي (تتبّع + حقن) | `vendor/melisplatform/melis-cms-page-analytics/src/Listener/MelisCmsPageAnalyticsListener.php` |
| بوابات الجداول | `vendor/melisplatform/melis-cms-page-analytics/src/Model/Tables/` |
| SQL تثبيت قاعدة البيانات | `vendor/melisplatform/melis-cms-page-analytics/install/sql/` |

انظر أيضًا: [melis-cms](/ar/reference/modules/melis-cms)، [melis-core](/ar/reference/modules/melis-core)
