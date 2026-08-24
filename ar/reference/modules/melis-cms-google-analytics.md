# MelisCmsGoogleAnalytics

> مزوّد Google Analytics 4 (GA4) الذي يحوّل خاصية GA4 المُهيّأة لموقع ما إلى منحنيات جلسات، وإجماليات مؤشرات أداء رئيسية (KPI)، وبيانات ديموغرافية داخل الواجهة الخلفية React في Melis. الحزمة `melisplatform/melis-cms-google-analytics`.

## الغرض

يقرأ MelisCmsGoogleAnalytics خاصية GA4 الخاصة بالموقع من جهة الخادم (عبر `google/apiclient` +
`google/analytics-data`) ويعرضها على شكل مخططات في الواجهة الخلفية React. وهو مزوّد **للعرض فقط**:
فتشغيل GA لموقع ما — أي اختيار المزوّد، وإدخال **Property ID**، ورفع ملف **private key JSON** الخاص
بحساب الخدمة — يتم في أداة **Site analytics** التي يمتلكها `melis-cms-page-analytics`، لا هذه الوحدة.

تقدّم الوحدة **واجهتين مدعومتين بمكوّن لوحة معلومات واحد**:

- **علامة تبويب Google Analytics** في محرر صفحات CMS بواجهة React، تعرض إحصائيات GA **للصفحة المفتوحة**
  (مُرشَّحة حسب مسار الصفحة).
- **عرض React أصلي على مستوى الموقع** يُحقن في أداة **Site analytics**، ويعرض إحصائيات GA
  **للموقع بأكمله** عندما تكون *وحدة التحليلات (Analytics module)* الخاصة بذلك الموقع مضبوطة على Google Analytics.

![علامة تبويب Google Analytics في محرر صفحات CMS بواجهة React — منحنى الجلسات، وبطاقات مؤشرات الأداء الرئيسية، والبيانات الديموغرافية للغة/الدولة/المدينة للصفحة المفتوحة](/screenshots/react/melis-cms-google-analytics/meliscmsgoogleanalytics-pageedition-tab-googleanalytics.png)

![عرض Google Analytics على مستوى الموقع في أداة Site analytics — لوحة معلومات GA4 نفسها مُطبّقة على الموقع بأكمله](/screenshots/react/melis-cms-google-analytics/meliscmsgoogleanalytics-tool-tab-analytics.png)

## تفعيلها

تُكتشَف الوحدة من قِبَل مضيف React عند الإقلاع عبر `GET /melis/react-api/react-modules`، الذي
يسرد الوحدات النشطة التي تقدّم ملف `brick.manifest.json`. يؤدي إلغاء تفعيل الوحدة إلى إزالة كلتا الواجهتين.

اعتماديات Composer: `google/apiclient ^2.15`, `google/analytics-data ^0.16.0`, `melis-core`,
`melis-cms`, `melis-cms-page-analytics`.

## الـ brick الخاص بـ React

هذا **brick بنمط علامة تبويب في محرر الصفحات** (widget فقط): ليس له **أداة في القائمة اليسرى**، ولا **مسار (route)**، ولا
**`react-api.php`**. الـ manifest بالشكل متعدّد الـ bricks مع مدخل وحيد يحتوي المُعرّف فقط، لذا
يحمّل المضيف الحزمة عند الإقلاع ويسجّل الـ brick نفسه مبكرًا.

```json
{ "entry": "brick.js", "bricks": [ { "id": "cms-google-analytics" } ] }
```

لا يستدعي `brick.tsx` الدالة `__melisRegisterBrick`؛ بل ينفّذ تسجيلَين عند
وقت تقييم الوحدة (module-eval):

```tsx
// 1) Contribute a tab to the CMS page editor (owned by the CmsPage brick).
registerPageTab('melis_cms_google_analytics_page_tab', GoogleAnalyticsPageTab)

// 2) Register the native site-level display for the PageAnalytics host to mount by key.
;(window.__melisAnalyticsSiteDisplays ||= {})['melis_cms_google_analytics'] = GoogleAnalyticsSiteDisplay
window.dispatchEvent(new CustomEvent('melis:analytics-site-display-registered'))
```

| المكوّن | الدور |
| --- | --- |
| `brick.tsx` | التسجيل فقط — يضيف علامة تبويب الصفحة وعرض الموقع؛ لا يوجد brick ذو مسار. |
| `GoogleAnalyticsPage.tsx` (`GoogleAnalyticsPageTab`) | علامة تبويب في محرر الصفحات. تستقبل `{ idPage }`، وتحلّ موقع الصفحة + مسارها عبر `getPageContext`، ثم تُركّب لوحة المعلومات باستخدام `siteId` + `pagePath`. |
| `GoogleAnalyticsSiteDisplay.tsx` | لوحة المعلومات: مبدّل النطاق الزمني، ومخطط جلسات SVG مضمّن، وبطاقات مؤشرات الأداء الرئيسية، وثلاثة جداول ديموغرافية. يُعاد استخدامها في كلتا الواجهتين (`pagePath` موجود ⇐ ضمن نطاق الصفحة، غائب ⇐ الموقع بأكمله). |

نظرًا لأن React مُخرَج إلى متغيرات المضيف العامة (host globals)، لا يمكن للحزمة استيراد وحدات المضيف، ومن ثمّ تُستخدم
**التنسيقات المضمّنة (inline styles)**، والترجمة **`{fr,en}` داخل الملف (i18n)** (المأخوذة من `document.documentElement.lang`)، و
**مخطط SVG مرسوم يدويًا** (بلا مكتبة مخططات). ولا تُستخدم Google SDK أبدًا من جهة العميل.

## لوحة المعلومات

تعرض كلتا الواجهتين لوحة المعلومات نفسها:

- **عنصر التحكم بالنطاق الزمني** — **7 أيام** / **30 يومًا** / **مخصّص** (منتقيا تاريخ البداية والنهاية +
  **تطبيق**) وزر **تحديث**. يكون تاريخ النهاية افتراضيًا هو اليوم (مع تضمين بيانات GA4 خلال اليوم).
- **الجلسات على مدى الفترة** — مخطط خطّي/مساحي للجلسات في اليوم.
- **بطاقات مؤشرات الأداء الرئيسية** — الجلسات، المستخدمون، مشاهدات الصفحة، الصفحات/الجلسة، متوسط مدة الجلسة، معدّل الارتداد.
- **البيانات الديموغرافية** — ثلاثة جداول (اللغة، الدولة، المدينة)، مرتّب كل منها حسب الجلسات مع نسبة مئوية للحصة.

إذا لم يكن GA مُهيّأً للموقع أو فشل الـ API، يظهر مربّع خطأ أحمر يعرض رسالة الواجهة الخلفية
(مثلًا "GA settings incomplete") بدلًا من المخططات.

**كيفية العثور عليها:** لكل صفحة ← **MelisCms** ← افتح صفحة ← علامة تبويب **Google Analytics**. لكل موقع ←
**MelisMarketing** ← **Site analytics** ← اختر الموقع ← علامة التبويب الفرعية **Analytics**. يُفعَّل GA
لموقع ما في **Site analytics → Settings** (وحدة التحليلات = Google Analytics، وProperty ID، ورفع ملف private
key JSON، وسكربت تحليلات مخصّص اختياري).

![علامة التبويب الفرعية Settings في Site analytics — وحدة التحليلات مضبوطة على Google Analytics، وProperty ID، ورفع ملف private key JSON، وسكربت تحليلات مخصّص](/screenshots/react/melis-cms-google-analytics/meliscmsgoogleanalytics-tool-tab-settings.png)

## نقاط نهاية البيانات

ليس للوحدة ملف **`config/react-api.php`**. تستدعي واجهة React المستخدم الموجود مسبقًا
`GoogleAnalyticsController` (المسار `application-MelisCmsGoogleAnalytics/default`, `ViewJsonStrategy`).

| الأسلوب وعنوان URL | الإجراء | الغرض |
| --- | --- | --- |
| `GET /melis/MelisCmsGoogleAnalytics/GoogleAnalytics/getPageContext?idPage=<id>` | `getPageContextAction` | حلّ الموقع المالك للصفحة + مسارها ← `{ success, siteId, pagePath, pageURL }`. |
| `POST /melis/MelisCmsGoogleAnalytics/GoogleAnalytics/getChartData` | `getChartDataAction` | جلب بيانات GA4 لموقع (واختياريًا مسار صفحة) ← `{ success, chartData, errors }`. |

جسم طلب `getChartData` مُرمّز على شكل نموذج (form-encoded):

```ts
const body = new URLSearchParams()
body.set('siteId', String(siteId))
body.set('dateRange[option]', option)          // '7days' | '30days' | 'custom'
body.set('dateRange[startDate]', startDate)    // '7daysAgo' | '30daysAgo' | 'YYYY-MM-DD'
body.set('dateRange[endDate]', endDate)        // 'today' | 'YYYY-MM-DD'
body.set('dateRange[clientTimestamp]', String(Date.now()))
if (pagePath) body.set('pagePath', pagePath)   // page tab only → GA4 dimensionFilter on pagePath
```

شكل `chartData` الذي تستهلكه الواجهة:

- `chartData.date.totals{}` ← قيم مؤشرات الأداء الرئيسية (`sessions`, `activeUsers`, `screenPageViews`,
  `screenPageViewsPerSession`, `averageSessionDuration`, `bounceRate`).
- `chartData.date.plot{ <tsSeconds>: { sessions } }` ← منحنى الجلسات (المفاتيح بالثواني).
- `chartData.language / .country / .city` ← الجداول الديموغرافية (`{ value: { sessions } }`).

من جهة الخادم، يستدعي `getChartDataAction` خدمات GA4 (`GoogleAnalytics4APIService` /
`MelisCmsGoogleAnalyticsService`، بأسماء بديلة في `module.config.php`)، التي تستخدم Property ID الخاص بالموقع
وملف private-key JSON، وتُطبّع صفوف GA4 إلى `chartData`. وعند فشل الـ API يعيد الإجراء
كائن `{ success:false, errors }` نظيفًا بدلًا من الخطأ 500.

## القدرات

مُعلَنة في `config/react.capabilities.php` ومدموجة عبر `Module::getConfig()`. ولأن الوحدة
تسهم بعلامة تبويب في أداة صفحات CMS، فإنها تُعلن قدرتها تحت العقدة المشتركة الحاملة للصلاحيات
**`meliscms_page`** (تدمج `ArrayUtils::merge` مصفوفة `tabs[]` ضمن قدرات أداة صفحات CMS):

```php
return [
  'melisReactToolCapabilities' => [
    'meliscms_page' => [
      'tabs' => [
        ['key' => 'melis_cms_google_analytics_page_tab', 'label' => 'tr_melis_cms_google_analytics'],
      ],
    ],
  ],
];
```

- **يجب أن يساوي** المفتاح `key` المفتاحَ المُمرَّر إلى `window.__melisRegisterPageTab` في `brick.tsx` — فهو *ذاته*
  قدرة علامة التبويب. وبدونه، تُخفي القائمة البيضاء لقدرات صفحة CMS زرَّ علامة التبويب حتى بالنسبة للمسؤول.
- **لا توجد قدرة خلفية** يجب إعلانها: لا تعرض الوحدة أي إجراء `react-api`. يُضبَط الوصول
  عبر الوصول إلى محرر صفحات CMS (علامة تبويب الصفحة) وإلى أداة Site analytics (عرض الموقع).

## التكامل مع المضيف

- **جسر علامة تبويب الصفحة (`__melisRegisterPageTab`)** — يوفّره الـ brick الخاص بـ CmsPage. يتشارك كلا الـ brick
  حارسًا متكافئًا (idempotent): أيّهما يُحمَّل أولًا يُنشئ `window.__melisPageTabRegistry` ويُعرّف
  المُسجِّل. يقرأ CmsPage القيمة `tabs['melis_cms_google_analytics_page_tab']` ويعرض المكوّن
  مع `{ idPage }`؛ ولا يظهر الزر إلا إذا كانت القدرة ممنوحة.
- **جسر عرض الموقع (`__melisAnalyticsSiteDisplays`)** — يوفّره/يستهلكه أداة *Site analytics* في
  `melis-cms-page-analytics`. يسجّل الـ brick مكوّنه تحت المفتاح
  `melis_cms_google_analytics` (المطابق للقيمة المخزّنة `pad_analytics_key` الخاصة بالموقع) ويطلق
  الحدث `melis:analytics-site-display-registered`. ويركّبه المضيف (مع `{ siteId }`) في علامة التبويب الفرعية Analytics
  عندما تكون *وحدة التحليلات* الخاصة بالموقع = Google Analytics — مستبدلًا إطار iframe القديم بواجهة
  React أصلية.
- **الأجزاء العامة تبقى في المضيف.** إن هيكل علامة تبويب محرر الصفحات، وأداة Site analytics، ومُنتقي
  الموقع، ونموذج Settings تعود ملكيتها إلى MelisCms / MelisCmsPageAnalytics؛ وهذه الوحدة تملأ فقط
  عرض *Google Analytics*.

## الملفات الرئيسية

| الشأن | المسار |
| --- | --- |
| المسارات / الأسماء البديلة لخدمات GA | `config/module.config.php` |
| قدرات React (`meliscms_page.tabs[]`) | `config/react.capabilities.php` |
| المتحكّم (`getPageContextAction`, `getChartDataAction`) | `src/Controller/GoogleAnalyticsController.php` |
| مصدر الـ brick الخاص بـ React (Vite IIFE) | `ui-react/src/brick.tsx`, `GoogleAnalyticsPage.tsx`, `GoogleAnalyticsSiteDisplay.tsx` |
| الـ brick المبنيّ + الـ manifest | `public/ui-react/brick.js`, `public/ui-react/brick.manifest.json` |

انظر أيضًا: [melis-cms-page-analytics](/ar/reference/modules/melis-cms-page-analytics) ·
[melis-cms](/legacy/reference/modules/melis-cms) ·
[melis-core](/legacy/reference/modules/melis-core)
