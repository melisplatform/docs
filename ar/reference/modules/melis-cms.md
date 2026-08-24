# MelisCms

> الواجهة الخلفية لنظام إدارة المحتوى — المواقع، وشجرة الصفحات، ومحرر الصفحات، والقوالب، والأنماط، وتحسين محركات البحث، مقدَّمة كواجهة خلفية بتقنية React. الحزمة `melisplatform/melis-cms`.

## الغرض

‏`MelisCms` هو الواجهة الخلفية التي تبني وتشغّل من خلالها مواقعك على منصة Melis. فهو
يوفّر شجرة صفحات الموقع، ومحرر الصفحات (تبويبات التحرير Edition والخصائص Properties وتحسين محركات البحث SEO واللغات Languages)، ومناطق الإضافات بالسحب والإفلات لتأليف المحتوى، وأدوات الإدارة الخاصة بالمواقع
والقوالب والأنماط واللغات ومعرّفات المنصة والنطاقات وعمليات إعادة التوجيه. وهو **لا يملك أي جداول قاعدة بيانات** —
فهو يقرأ ويكتب كل شيء عبر [melis-engine](/legacy/reference/modules/melis-engine)، ويتولّى
[melis-front](/legacy/reference/modules/melis-front) عرض الصفحات (بما في ذلك معاينة التحرير الحيّة).

في الإصدار v6 من Melis يبقى منطق الأعمال دون تغيير؛ أما **طبقة العرض** فهي **واجهة خلفية بتقنية React**
‏(`/melis-react`). يوفّر MelisCms **حزمة واحدة متعددة اللبنات (bricks)** تكشف عن **تسع أدوات**: محرر الصفحات
(مضيف شريط جانبي: شجرة الصفحات + محرر مبوّب) و**ثماني أدوات جانبية أصيلة بتقنية React**. الجزء الوحيد
الذي ما زال يستخدم الواجهة الكلاسيكية هو تبويب **Edition** في محرر الصفحات، والذي يُحمَّل داخل إطار iframe.

## ثلاثي MelisCms / MelisFront / MelisEngine

تشكّل هذه الوحدات الثلاث نظامًا واحدًا مترابطًا بإحكام؛ وعادةً ما يتضمّن أي سؤال حول إحداها الوحدتين الأُخريين.

- **MelisEngine** — يملك نموذج قاعدة بيانات نظام إدارة المحتوى بأكمله (الصفحات، والشجرة، والمواقع، والقوالب، واللغات،
  وتحسين محركات البحث، والأنماط) ويكشفه عبر بوّابات الجداول والخدمات. ويعرّف `MelisTemplatingPlugin`،
  الفئة الأساسية التي ترث منها كل كتلة محتوى.
- **MelisFront** — خط أنابيب عرض الواجهة الأمامية؛ يحوّل عنوان URL إلى صفحة مكتملة ويشغّل
  معاينة التحرير الحيّة داخل الواجهة الخلفية (`renderMode/melis`).
- **MelisCms** *(هذه الوحدة)* — طبقة واجهة المستخدم الخلفية؛ تقود دورة حياة الصفحة عبر إطلاق أحداث
  تعالجها مستمعات المحرّك (engine) والواجهة الأمامية (front).

**ترتيب التحميل:** `melis-core` ← `melis-front` ← `melis-engine` ← `melis-cms`.

## تفعيلها

أضِف إلى `config/melis.module.load.php`:

```php
return [
    'MelisCms',
];
```

تتطلّب `melisplatform/melis-core` و`melisplatform/melis-engine` و`melisplatform/melis-front`.
وليس لها أي ملف SQL للتثبيت خاص بها؛ فمخطط نظام إدارة المحتوى جزء من melis-engine. ولا تظهر اللبنات (bricks) في الواجهة الخلفية بتقنية React
إلا عندما يكون MelisCms مفعّلًا (الاكتشاف عبر `GET /melis/react-api/react-modules`).

## الواجهة الخلفية بتقنية React — حزمة واحدة، تسع لبنات (bricks)

تعلن الحزمة (`public/ui-react/brick.js` + `brick.manifest.json`) عن تسع لبنات
تسجّل نفسها ذاتيًا في `brick.tsx`. وجميعها أصيلة بالكامل بتقنية React باستثناء تبويب Edition في محرر الصفحات.

| معرّف اللبنة (Brick id) | المسار (Route) | melisKey | النوع |
| --- | --- | --- | --- |
| `cms` | `/melis-cms/page` | `meliscms_page` | محرر الصفحات (مضيف شريط جانبي: الشجرة + المحرر المبوّب) |
| `cms-sites` | `/melis-cms/sites` | `meliscms_tool_sites` | React أصيل (قائمة + محرر + معالج من 5 خطوات) |
| `cms-templates` | `/melis-cms/templates` | `meliscms_tool_templates` | React أصيل (قائمة + نموذج) |
| `cms-styles` | `/melis-cms/styles` | `meliscms_tool_styles` | React أصيل |
| `cms-languages` | `/melis-cms/languages` | `meliscms_tool_language` | React أصيل |
| `cms-platform-ids` | `/melis-cms/platform-ids` | `meliscms_tool_platform_ids` | React أصيل |
| `cms-site-301` | `/melis-cms/site-301` | `meliscms_tool_site_301` | React أصيل |
| `cms-mini-templates` | `/melis-cms/mini-templates` | `meliscms_mini_template_manager_tool` | React أصيل |
| `cms-menu-manager` | `/melis-cms/menu-manager` | `meliscms_mini_template_menu_manager_tool` | React أصيل |

اللبنة `cms` مميّزة: فهي تسجّل **كلًّا** من `Component` مرتبط بمسار (المحرر المبوّب) **و**
‏`Sidebar` (شجرة الصفحات)، بحيث تبقى الشجرة مرئية في الشريط الجانبي الأيسر أثناء عملك. وتحمل كل أداة جانبية
مفتاح تبديل **جديد / قديم (New / Old)** — *New* هي واجهة React، و*Old* هي الأداة الكلاسيكية داخل إطار iframe
‏(`/melis/react-tool-page?key=<melisKey>`).

![قسم MelisCms في الشريط الجانبي بتقنية React — لوحة شجرة الصفحات (PAGE TREE) ومجموعة أدوات الموقع (Site Tools)](/screenshots/react/melis-cms/meliscms-menu-entry.png)

## شجرة الصفحات (الشريط الجانبي الأيسر)

شجرة الصفحات هي خريطة مواقعك وكل صفحة داخلها. انقر على صفحة لفتحها كتبويب علوي
في المحرر؛ ويعثر البحث على الصفحات التي لم تُحمَّل بعد ويوسّع الشجرة للوصول إليها؛ وتتيح قائمة النقر بالزر الأيمن على العقدة
إضافة صفحة فرعية، أو عرض التفاصيل، أو تكرار صفحة أو فرع كامل، أو الحذف.
حرّك صفحة بالسحب والإفلات (تحدّد الصلاحيات على جانب الخادم ما يمكنك تحريكه).

![شجرة الصفحات بتقنية React — المواقع والصفحات، مع مؤشّرات المسودة والقفل وجذر الموقع](/screenshots/react/melis-cms/meliscms-menu-site-treeview.png)

تعيد الشجرة استخدام نقاط نهاية نظام إدارة المحتوى القديمة (دون أي تغيير في الواجهة الخلفية) عبر `cms-tree-api.ts`:

| الغرض | نقطة النهاية |
| --- | --- |
| العناصر الفرعية لعقدة (تحميل كسول) | `GET /melis/MelisCms/TreeSites/get-tree-pages-by-page-id?nodeId=<id>` (`-1` = جذور المواقع) |
| البحث عن الصفحات بالاسم | `POST /melis/MelisCms/Page/searchTreePages` |
| النقل / إعادة تحديد الأصل | `GET /melis/MelisCms/Page/movePage` |
| تكرار شجرة | `POST /melis/MelisCms/TreeSites/duplicateTreePage` |
| حذف صفحة | `GET /melis/MelisCms/Page/deletePage?idPage=<id>` |

تستمع الشجرة للحدث `melis:cms-tree-refresh` لتحديثها وإظهار صفحة بعد
الحفظ/النشر/الحذف.

## محرر الصفحات

افتح صفحة من الشجرة، أو استخدم الرابط المباشر `/melis-cms/page/:idPage`. يمتلك المحرر **إطارًا (chrome) أصيلًا بتقنية React**
(العنوان + الحالة، وأزرار الإجراءات، وشريط التبويبات) حول محتوى التبويب. ويُجمَّع هذا الإطار
من بنية مدموجة على الخادم (`GET /melis/react-api/cms-page/structure?idPage=<id>` ←
‏`{ header, tabs[], buttons[] }`)، بحيث **يمكن للوحدات الأخرى إضافة تبويبات وأزرار عبر دمج الإعدادات
على جانب الخادم**.

التبويبات الأصيلة أولًا، ثم أي تبويبات تساهم بها وحدات أخرى: **Edition · Properties · SEO · Languages ·
Historic · Page Analytics · Scripts · Open Graph · Link Checker · Google Analytics · Versioning ·
Comments**. أزرار الإجراءات: **New page · Duplicate · Erase draft · Delete page · See · Display ·
Save · Publish** (بالإضافة إلى مفتاح تبديل حالة النشر/الاتصال Publish/Online وأزرار معيارية مثل Workflow).

### تبويب الخصائص Properties (React أصيل)

اضبط **اسم** الصفحة، و**النوع** (صفحة Page / مجلد Folder / موقع Site…)، و**القالب** (التخطيط)، و**اللغة** (تُقفَل
بعد الإنشاء)، و**عرض القائمة**، و**النمط**، وكلمات التصنيف المفتاحية.

![تبويب الخصائص Properties بتقنية React — الاسم والنوع والقالب واللغة وعرض القائمة والنمط والتصنيف](/screenshots/react/melis-cms/meliscms-page-tab-properties.png)

### تبويب التحرير Edition (السحب والإفلات الكلاسيكي داخل إطار iframe)

يملأ تبويب Edition الصفحة: فهو يعرضها بشكل حيّ وتقوم أنت **بسحب كتل المحتوى (الإضافات)** إلى
مناطق القالب. وهو **المحرر الكلاسيكي المحمَّل داخل إطار iframe** داخل إطار React
(`/melis/react-tool-page?key=meliscms_page&idPage=<id>`)؛ والسحب والإفلات، وقائمة الإضافات، ومدير القوالب المصغّرة (mini-template)،
ومحرّرات النص الغني هي نفسها الموجودة في الواجهة الخلفية الكلاسيكية. ويُحفَظ محتواها
تلقائيًا في جلسة PHP ويُكتَب عند الحفظ Save أو النشر Publish.

![تبويب Edition — الصفحة الحيّة مع طبقة السحب والإفلات، داخل إطار محرر React](/screenshots/react/melis-cms/meliscms-page-tab-edition.png)

![لوحة الإضافات — كتل المحتوى التي يمكنك إفلاتها على الصفحة؛ تعتمد القائمة على الوحدات المفعّلة في الموقع](/screenshots/react/melis-cms/meliscms-page-tab-edition-menu-templating-plugins.png)

![تخطيطات مناطق السحب والإفلات — اختر كيفية تقسيم منطقة لوضع كتلك](/screenshots/react/melis-cms/meliscms-page-tab-edition-dragdropzone-layouts.png)

### تبويبا SEO وLanguages (React أصيل)

يحتوي تبويب **SEO** على عنوان URL الودّي، وعنوان/وصف الميتا، وعنوان URL القانوني وعناوين إعادة التوجيه. ويدير تبويب
**Languages** إصدارات اللغة للصفحة (لكلٍّ منها محتواه وتحسين محركات البحث الخاص به).

![تبويب SEO بتقنية React — حقول عنوان URL، وعنوان/وصف الميتا، وإعادة التوجيه](/screenshots/react/melis-cms/meliscms-page-tab-seo.png)

### الحفظ مقابل النشر

- **Save** يكتب المسودة (الخصائص Properties + تحسين محركات البحث SEO + ‏XML الخاص بـ Edition معًا، في إجراء واحد).
- **See ← Preview / See online** يعرض المسودة أو الصفحة الحيّة.
- **Publish** يجعل المسودة الحالية حيّة؛ ويقوم مفتاح تبديل الحالة بالنشر / إلغاء النشر.
- **Erase draft** يتجاهل المسودة ويعود إلى النسخة المنشورة.

يرسل الحفظ/النشر (Save/Publish) طلبات POST إلى نقاط النهاية **القديمة (legacy)** بأسماء الحقول القديمة:
‏`POST /melis/MelisCms/Page/savePage?idPage=` و`.../publishPage?idPage=` (بالإضافة إلى `unpublishPage`
و`clearSavedPage` و`deletePage`)؛ ويُقرأ XML الخاص بـ Edition من جلسة PHP.

## الأدوات الجانبية

### المواقع Sites — إنشاء المواقع وإدارتها

‏`/melis-cms/sites`. كل صف هو موقع كامل (المعرّف، الاسم، الوحدة، اللغات). يشغّل **+ New site**
**معالجًا من 5 خطوات**: متعدد اللغات Multilingual ← اللغات Languages ← النطاقات Domains ← الوحدة Module ← الملخّص Summary. وتُدار المواقع القائمة
عبر تبويبات React أصيلة: **Properties · Module Loading · Domains · Languages · Site Config ·
Translations · Scripts**.

![أداة المواقع Sites بتقنية React — البحث، والأعمدة Columns، والتصدير Export، ومفتاح التبديل New/Old، و+ New site](/screenshots/react/melis-cms/meliscms-tool-sites-list.png)

![تحرير الموقع — تبويب Module Loading: مفاتيح تبديل لكل وحدة مع ترتيب التحميل بالسحب لإعادة الترتيب](/screenshots/react/melis-cms/meliscms-tool-sites-edit-tab-moduleloading.png)

![تحرير الموقع — تبويب Site Config: إعدادات عامة بالإضافة إلى إعدادات مفتاح/قيمة لكل لغة](/screenshots/react/melis-cms/meliscms-tool-sites-edit-tab-siteconfig.png)

### القوالب Templates — تخطيطات الصفحات

‏`/melis-cms/templates`. قائمة أصيلة ونموذج أصيل: الاسم Name / النوع Type / الموقع Site، والتخطيط Layout / المتحكّم Controller /
الإجراء Action (تخطيط `.phtml` الذي يرتبط به القالب).

![قائمة القوالب Templates بتقنية React — بطاقات مؤشّرات الأداء (KPI)، والمتحكّم/الإجراء، والتخطيط والموقع لكل صف](/screenshots/react/melis-cms/meliscms-tool-templatemanager-list.png)

### الأنماط Styles — ‏CSS المطبَّق على الصفحات

‏`/melis-cms/styles`. أدِر أوراق أنماط CSS (الاسم، مسار/مصدر CSS، الموقع)؛ وأرفق نمطًا بصفحة
من تبويب الخصائص Properties في الصفحة.

![قائمة الأنماط Styles بتقنية React — الحالة، والاسم، ومسار CSS والموقع لكل صف](/screenshots/react/melis-cms/meliscms-tool-stylemanager-list.png)

### لغات الواجهة الأمامية Front-office Languages

‏`/melis-cms/languages`. القائمة الرئيسية للإعدادات المحلية (locales) التي تعرفها المنصة (الإعداد المحلي + الاسم مع العلَم).

### معرّفات المنصات Platforms IDs — نطاقات معرّفات الصفحات لكل بيئة

‏`/melis-cms/platform-ids`. يحجز نطاقًا مميّزًا من معرّفات الصفحات والقوالب لكل بيئة بحيث لا تتعارض المعرّفات
أبدًا عند نقل المحتوى بين بيئات التطوير dev / الاختبار staging / الإنتاج production.

![قائمة معرّفات المنصات Platforms IDs بتقنية React — نطاقات معرّفات الصفحات والقوالب لكل منصة](/screenshots/react/melis-cms/meliscms-tool-platformids-list.png)

### عمليات إعادة التوجيه 301 Redirects — إبقاء الروابط القديمة تعمل

‏`/melis-cms/site-301`. عندما يتغيّر عنوان URL عام، أضِف إعادة توجيه (العنوان القديم ← العنوان الجديد، فريد لكل
موقع) بحيث يظل العنوان القديم قابلًا للتحليل.

![قائمة عمليات إعادة التوجيه 301 Redirects بتقنية React — من العنوان القديم إلى العنوان الجديد لكل موقع](/screenshots/react/melis-cms/meliscms-tool-siteredirect-list.png)

### القوالب المصغّرة Mini-Templates ومدير القوائم Menu manager

القوالب المصغّرة Mini-Templates (`/melis-cms/mini-templates`) هي كتل محتوى جاهزة يمكن للمحرّرين إفلاتها على
صفحة بنقرة واحدة؛ ومدير القوائم Menu manager (`/melis-cms/menu-manager`) ينظّمها في فئات بحيث
يسهل العثور عليها في مدير القوالب المصغّرة داخل محرر الصفحات.

![مدير القوائم Menu manager بتقنية React — شجرة قابلة لإعادة الترتيب بالسحب من الفئات وقوالبها المصغّرة](/screenshots/react/melis-cms/meliscms-tool-minitemplate-menu-manager.png)

## نقاط نهاية React API

تُعلَن المسارات في `config/react-api.php` تحت `/melis/react-api/…`؛ والمتحكّمات في
‏`src/Controller/MelisReactApi*Controller.php`. وكل إجراء محميّ بـ `CapabilityGuardTrait`
(`denyUnlessAccess()` لـ `MelisCoreRights::canAccess(MELIS_KEY)`، ثم `denyUnlessCan('<action>')`).
والعقد في كل مكان هو `{ success, data }` عند النجاح و`{ success:false, error }` عند الفشل؛
ويرسل كل طلب جلب (fetch) الترويسة `X-Requested-With: XMLHttpRequest` مع بيانات الاعتماد.

| المتحكّم (Controller) | الحارس (melisKey) | الأساس (Base) | الإجراءات (Actions) |
| --- | --- | --- | --- |
| `MelisReactApiPageController` | `meliscms_page` | `/cms-page` | `structure`, `properties`, `seo`, `refs`, `languages`, `ancestors`, `save-properties`, `save-seo` |
| `MelisReactApiCmsSitesController` | `meliscms_tool_sites` | `/cms-sites` | `list`, `meta`, `get`, `config`, `modules`, `create` |
| `MelisReactApiSiteRedirectController` | `meliscms_tool_site_301` | `/site-redirects` | `list`, `stats`, `sites`, `get`, `save`, `delete` |
| `MelisReactApiTemplateController` | `meliscms_tool_templates` | `/templates` | `list`, `stats`, `sites`, `get`, `save`, `delete` |
| `MelisReactApiCmsLanguageController` | `meliscms_tool_language` | `/cms-languages` | `list`, `stats`, `get`, `save`, `delete` |
| `MelisReactApiCmsPlatformIdController` | `meliscms_tool_platform_ids` | `/cms-platform-ids` | `list`, `stats`, `get`, `save`, `delete` |
| `MelisReactApiCmsStyleController` | `meliscms_tool_styles` | `/cms-styles` | `list`, `stats`, `sites`, `get`, `save`, `delete` |
| `MelisReactApiCmsMiniTemplateController` | `meliscms_mini_template_manager_tool` | `/cms-mini-templates` | `list`, `stats`, `sites`, `item`, `save`, `delete` |
| `MelisReactApiCmsMenuManagerController` | `meliscms_mini_template_menu_manager_tool` | `/menu-manager` | `sites`, `languages`, `tree`, `saveTree`, `category`, `saveCategory`, `deleteCategory` |

```ts
// GET the styles list (keyset), then POST a 301 redirect
const r = await fetch('/melis/react-api/cms-styles?limit=25', {
  headers: { 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'include',
})
const { success, data } = await r.json()   // { success, data: { items, total, nextCursor } }

await fetch('/melis/react-api/site-redirects/save', {
  method: 'POST',
  headers: { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ id: null, siteId: 1, oldUrl: 'old', newUrl: 'new' }),
})
```

## القدرات (Capabilities)

مُعلَنة في `config/react.capabilities.php` تحت `melisReactToolCapabilities`، مُفهرَسة بـ `melisKey`
الحامل للصلاحيات لكل أداة (`export` فقط حيث يكون للأداة زر تصدير Export):

```php
'meliscms_tool_site_301'                    => ['list','create','edit','delete','export','test'],
'meliscms_tool_templates'                   => ['list','create','edit','delete','export'],
'meliscms_tool_styles'                      => ['list','create','edit','delete','export'],
'meliscms_tool_language'                    => ['list','create','edit','delete'],
'meliscms_tool_platform_ids'                => ['list','create','edit','delete','export'],
'meliscms_tool_sites'                       => ['list','create','edit','delete','export'],
'meliscms_mini_template_manager_tool'       => ['list','create','edit','delete','export'],
'meliscms_mini_template_menu_manager_tool'  => ['list','create','edit','delete'],
```

يُفهرَس محرر الصفحات تحت `meliscms_page` كشجرة مهيكلة بحيث يصبح كل زر وكل تبويب فيه
قدرة (capability):

```php
'meliscms_page' => [
  'actions' => ['create','save','clear','publish','status','delete','duplicate','view','display'],
  'tabs'    => ['edition','properties','seo','languages'],
],
```

تضيف كل وحدة مساهِمة تبويبات/أزرار صفحتها **الخاصة** تحت مفتاح `meliscms_page` نفسه (دمج Laminas)،
ويقوم `CmsPage.tsx` بتصفيتها عبر `useCaps('meliscms_page').can(cap)`. ويكشف مفتاحان مرتبطان في
الملف نفسه عن صلاحيات المحرر: يحقن `melisReactRightsTools` عقدة `meliscms_page` خاصة بالصلاحيات فقط
("Page edition") في Users ← Rights، بينما يُبقي `melisReactSidebarHostSections`
قسم MelisCms مرئيًا بحيث تظل شجرة الصفحات قابلة للوصول حتى للمستخدم الذي يملك صلاحيات الصفحة فقط.

## مواضع التوسّع المعياري

تساهم وحدات أخرى بتبويبات لمحرر الصفحات وعمليات حفظ عبر التبويبات دون المساس بـ MelisCms:

```ts
// Register a page-edit tab (link-check, Open Graph, GA, historic, script-editor…)
window.__melisRegisterPageTab(key, ({ idPage }) => <MyTab idPage={idPage} />)
// Register a cross-cutting save hook, run by the global Save/Publish
window.__melisRegisterPageSaveHook(key, async (idPage) => { /* persist my tab */ })
```

على جانب الخادم، تبقى نقاط التوسّع نفسها متاحة:

- **`melis_cms_page_tabs_alter`** — إضافة أو إزالة تبويبات في محرر الصفحات.
- **`modify_page_properties_form_config`** — تعديل نموذج الخصائص Properties لإضافة حقول مخصّصة.

## الخدمات الرئيسية

استرجعها بـ `$sm->get('<alias>')`. يبقى منطق الأعمال على جانب الخادم (خدمات Laminas)؛ فـ React هو
العرض بالإضافة إلى استدعاءات API.

| اسم الخدمة (alias) | الدور |
| --- | --- |
| `MelisCmsPageService` | كتابة نموذج الصفحة: `savePage()`، `savePagePublished()`، `savePageSaved()`، `savePageSeo()`، `savePageLang()`، `savePageStyle()`، `savePageTree()`، `saveProperties()`. |
| `MelisCmsSiteService` | عمليات CRUD للموقع والاستعلامات لكل صفحة في الموقع. |
| `MelisCmsPageGetterService` | `getPageContent($pageId)` — يُرجع HTML المعروض المخزَّن مؤقتًا لصفحة. |
| `MelisCmsRights` | فحوص صلاحيات الواجهة الخلفية: `isAccessible()`، `isActionButtonActive()`. |
| `MelisCmsSitesDomainsService` | إدارة النطاقات لكل بيئة. |
| `MelisCmsSitesPropertiesService` | إعدادات مفتاح/قيمة على مستوى الموقع (تبويب Site Config). |
| `MelisCmsSiteModuleLoadService` | تحميل الوحدات لكل موقع (تبويب Module Loading). |
| `MelisCmsMiniTemplateService` / `MelisCmsMiniTemplateGetterService` | إدارة مكتبة القوالب المصغّرة وفئاتها. |
| `MelisCmsPageExportService` / `MelisCmsPageImportService` | تصدير/استيراد شجرة صفحات كملف. |

## جداول قاعدة البيانات

‏`MelisCms` لا يملك أي جداول. فمخطط نظام إدارة المحتوى معرَّف في melis-engine ويُصَل إليه عبر بوّاباته
وخدماته. لا تستعلم أبدًا عن جداول نظام إدارة المحتوى مباشرةً — استخدم بوّابات/خدمات المحرّك بحيث يبقى التخزين المؤقت وبقية
النظام البيئي متسقين.

## أحداث دورة حياة الصفحة

تُنفَّذ دورة حياة الصفحة من خلال 19 مستمعًا مربوطًا في `Module.php::onBootstrap`. وهذه
الأحداث هي نقطة التوسّع الأساسية — استخدمها (hook) بدلًا من استدعاء `MelisCmsPageService`
مباشرةً بحيث يبقى السجل التاريخي، والتخزين المؤقت، والوحدات الأخرى متزامنة.

| الإجراء | الأحداث |
| --- | --- |
| حفظ المسودة | `meliscms_page_save_start` / `_end` (+ `…savetree_*`, `…saveproperties_*`, `…saveedition_*`, `…saveseo_*`) |
| النشر | `meliscms_page_publish_start` / `_end` |
| إلغاء النشر | `meliscms_page_unpublish_start` / `_end` |
| الحذف | `meliscms_page_delete_start` / `_end` (+ `…deleteseo_*`, `…delete_page_*`) |
| النقل | `meliscms_page_move_start` / `_end` |
| التكرار | `meliscms_page_duplicate_start` / `_end` |
| جلسة الإضافة | `meliscms_page_savesession_plugin_*`, `meliscms_page_removesession_plugin_*` |

```php
// React to a page being published — in Module.php::onBootstrap or a listener's attach()
$eventManager->getSharedManager()->attach(
    'MelisCms',
    'meliscms_page_publish_end',
    function (\Laminas\EventManager\EventInterface $e) {
        $idPage = $e->getParams()['idPage'] ?? null;
        // log, sync, clear a custom cache, notify…
    },
    50
);
```

## إضافة كتلة محتوى جديدة

ترث كل كتلة محتوى من `MelisTemplatingPlugin` (المعرَّفة في melis-engine). نفّذ `front()`
للعرض على الموقع الحيّ و`back()` لعرض حاوية التحرير، ثم سجّل الإضافة. وتُعدّ وحدات
News وSlider وCategory2 تطبيقات مرجعية.

## أداة لوحة التحكّم (Dashboard widget)

يعرض `MelisCmsPagesIndicatorsPlugin` عدد المواقع والصفحات (المنشورة مقابل غير المنشورة) على لوحة التحكّم Dashboard
في الواجهة الخلفية.

![أداة المؤشّرات Indicators في لوحة التحكّم — المواقع والصفحات والصفحات المنشورة مقابل غير المنشورة](/screenshots/react/melis-cms/meliscms-dashboardplugins-indicators.png)

## الملفات الرئيسية

| المجال | المسار |
| --- | --- |
| تمهيد الوحدة (bootstrap) + ربط المستمعات | `vendor/melisplatform/melis-cms/src/Module.php` |
| مسارات React API + المتحكّمات | `vendor/melisplatform/melis-cms/config/react-api.php` |
| قدرات React | `vendor/melisplatform/melis-cms/config/react.capabilities.php` |
| مصدر اللبنة (كل الأدوات التسع) | `vendor/melisplatform/melis-cms/ui-react/src/` |
| الحزمة المبنيّة (مُودعة) | `vendor/melisplatform/melis-cms/public/ui-react/brick.js` + `brick.manifest.json` |
| خدمة الصفحة | `vendor/melisplatform/melis-cms/src/Service/MelisCmsPageService.php` |
| خدمة الموقع | `vendor/melisplatform/melis-cms/src/Service/MelisCmsSiteService.php` |
| خدمة الصلاحيات | `vendor/melisplatform/melis-cms/src/Service/MelisCmsRightsService.php` |
| كل المستمعات (19) | `vendor/melisplatform/melis-cms/src/Listener/` |
| أداة لوحة التحكّم | `vendor/melisplatform/melis-cms/src/Controller/DashboardPlugins/MelisCmsPagesIndicatorsPlugin.php` |

## انظر أيضًا

- [melis-engine](/legacy/reference/modules/melis-engine) — يملك نموذج بيانات نظام إدارة المحتوى وكل بوّابات الجداول.
- [melis-front](/legacy/reference/modules/melis-front) — عرض الواجهة الأمامية والمعاينة الحيّة.
- [melis-core](/legacy/reference/modules/melis-core) — المصادقة، والصلاحيات، والأحداث، والإعدادات الأساسية.
