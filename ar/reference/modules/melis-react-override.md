# MelisReactOverride

> بنية تحتية للمكتب الخلفي بلغة React: تعرض الأدوات القديمة داخل غلاف `/melis-react` وتقدّم تطبيق React أحادي الصفحة (SPA). الحزمة `melisplatform/melis-react-override`.

## الغرض

إنّ MelisReactOverride هو **وحدة بنية تحتية للمكتب الخلفي بلغة React** — وليس أداة. فهو لا يقدّم أي
brick، ولا صفحة React، ولا نقاط نهاية `react-api`، ولا شاشة خاصة به. وهو يوفّر آليتَي
الربط اللتين تتيحان تشغيل المكتب الخلفي بلغة React (`/melis-react`) جنبًا إلى جنب مع النظام القديم
`/melis`:

1. **آلية iframe للأداة القديمة** — أي أداة قديمة تعتمد jQuery/AJAX ولا تملك صفحة React
   مخصّصة تُعرَض كصفحة HTML مستقلّة (`/melis/react-tool-page?key=<melisKey>`) وتُظهَر
   داخل غلاف React ضمن `<iframe>`. تبدو الأداة داخل الإطار وتتصرّف تمامًا
   كما لو جرى الوصول إليها مباشرةً عبر `/melis` — بجداول DataTables الخاصة بها، ونماذجها، ونوافذها المنبثقة، وعلاماتها التبويبية، وأزرار الحفظ، والإشعارات الأصلية
   (رسائل gritter المنبثقة، ونوافذ التحقّق من صحّة الحقول فردًا فردًا).
2. **مسار احتياطي لتطبيق SPA** — يقدّم غلاف React عبر `index.html` من أجل `/melis-react` وكل
   رابط عميق (deep link) من جانب العميل تحته، ويجعل ذلك المسار (بالإضافة إلى بضع نقاط نهاية إقلاع للقراءة فقط)
   عامًّا.

أنت لا تنتقل *إلى* هذه الوحدة أبدًا. القاعدة العملية: إذا كنت داخل `/melis-react` وتنظر إلى
شاشة أداة بالطراز القديم (Bootstrap الكلاسيكي)، فأنت تنظر إلى صفحة أنتجها
MelisReactOverride.

## تفعيلها

هي وحدة Laminas MVC خالصة من جانب الخادم تُحمَّل عبر `application.config.php` (`module_paths` +
`modules`) — يقوم `src/Module.php` بالتحميل التلقائي لـ `MelisReactOverride\*` من `src/` عبر
`StandardAutoloader`. الفئة `core`.

وهو **يتجاوز وحدة تحكّم `PluginView` الخاصة بـ MelisCore** بنسخة مدركة لـ React عبر
اسم مستعار `controllers.invokables`. ولأنّ هذه الوحدة تُحمَّل *بعد* melis-core، فإنّ الاسم المستعار يفوز في
دمج إعدادات Laminas:

```php
'controllers' => [
    'invokables' => [
        'MelisCore\Controller\PluginView'   => \MelisReactOverride\Controller\PluginViewController::class,
        'MelisReactOverride\Controller\Spa' => \MelisReactOverride\Controller\SpaController::class,
    ],
],
```

## لمحة سريعة

| الخاصية | القيمة |
| --- | --- |
| اسم الوحدة | `MelisReactOverride` |
| الحزمة | `melisplatform/melis-react-override` |
| الفئة | `core` |
| Brick / `ui-react/` / `react-api.php` | **لا شيء** (بنية تحتية فقط) |
| وحدات التحكّم | `PluginViewController` (باسم مستعار فوق `MelisCore\Controller\PluginView`)، `SpaController` |
| الخدمات | `PlatformAssetsService`، `LegacyWidgetCssService` |
| نقطة الامتداد | `PluginViewToolPageExtensionInterface` (خطّاف `toolpage_extensions`) |

## المسارات

جميع مسارات الأداة/iframe هي مسارات فرعية لـ `melis-backoffice`، لذا فهي تقع تحت `/melis`. أمّا
مسار SPA فهو مسار regex من المستوى الأعلى.

| اسم المسار | عنوان URL | الإجراء | الغرض |
| --- | --- | --- | --- |
| `melis-backoffice/react-tool-page` | `/melis/react-tool-page` | `toolPage` | **الآلية الأساسية.** تعرض منطقة أداة قديمة كصفحة HTML مستقلّة لإطار iframe. تأخذ `?key=<melisKey>` (و`?idPage=<id>` لمحرّر صفحات CMS). |
| `melis-backoffice/react-dashboard-plugin` | `/melis/react-dashboard-plugin` | `dashboardPluginPage` | إضافة (plugin) لوحة معلومات قديمة واحدة كصفحة مستقلّة بسيطة. |
| `melis-backoffice/react-dashboard-plugin-config` | `/melis/react-dashboard-plugin-config` | `dashboardPluginConfigPage` | نموذج إعدادات إضافة لوحة معلومات (زر الترس) كصفحة HTML مستقلّة. |
| `melis-backoffice/react-dashboard-plugin-config-data` | `/melis/react-dashboard-plugin-config-data` | `dashboardPluginConfigData` | JSON: نموذج الإعدادات كبيانات (علامات تبويب + حقول مصنّفة نوعيًّا + قيم) بحيث يعرضه React أصليًّا. |
| `melis-backoffice/react-dashboard-plugin-config-save` | `/melis/react-dashboard-plugin-config-save` | `dashboardPluginConfigSave` | POST: التحقّق من صحّة إعدادات إضافة لوحة المعلومات وحفظها. |
| `melis-backoffice/react-dashboard-plugin-content` | `/melis/react-dashboard-plugin-content` | `dashboardPluginContent` | JSON: HTML + سكربتات + jsCallbacks للحقن المباشر في DOM (بلا iframe). |
| `melis-backoffice/react-platform-bundle` | `/melis/react-platform-bundle` | `platformBundle` | يقدّم حزمة الأصول المدمَجة بنوع MIME الصحيح (يحلّ محلّ `/melis/get-{css,js}-bundles` الخاصّة بـ MelisCore، التي تعيد `text/html` فارغًا عند غياب الحزمة). |
| `melis-backoffice/react-legacy-widget-css` | `/melis/react-legacy-widget-css` | `legacyWidgetCss` | أوراق أنماط المكتب الخلفي القديمة، حيث تُحدَّد نطاق كلّ قاعدة تحت `.melis-legacy-widget`. |
| `meliscore-melis-react-spa` | `/melis-react`، `/melis-react/*` | `spa` | **المسار الاحتياطي لـ SPA.** يقدّم غلاف React عبر `index.html`. مسار regex، `priority => 1000`. |

### المسارات العامّة (`excluded_routes`)

تُلحِق الوحدة عناصر بـ `plugins.meliscore.datas.excluded_routes` الخاصّة بـ MelisCore (تُدمَج المصفوفات الرقمية
بالإلحاق) بحيث يسمح لها `MelisCore\Module::checkIdentity()` بالمرور دون إعادة توجيه إلى
`/melis/login`:

- `meliscore-melis-react-spa` — الغلاف عامّ لأنّ تطبيق React يتولّى المصادقة الخاصة به
  (شاشة تسجيل دخول خاصّة به).
- `melis-backoffice/react-platform-bundle` — كي لا تعيد جلسة منتهية الصلاحية توجيه ورقة أنماط
  إلى صفحة تسجيل دخول بصيغة HTML (وهو بالضبط خطأ MIME الذي يعالجه هذا المسار).
- `melis-backoffice/melis-react-api/platformscheme-react-get` — العلامة التجارية للوحة تسجيل الدخول، تُقرأ قبل
  المصادقة (GET فقط).
- `melis-backoffice/melis-react-api/langs` — قائمة لغات المكتب الخلفي التي يحمّلها تطبيق SPA عند الإقلاع،
  بما في ذلك على شاشة تسجيل الدخول (للقراءة فقط).

> المساران الأخيران هما مسارا `melis-react-api` (يملكهما **MelisReactApi**)؛ ولا يفعل MelisReactOverride
> سوى جعلهما عامّين، فهو لا يعرّفهما.

## آلية iframe — ‏`toolPageAction()` ← ‏`buildToolPage()`

يقوم `PluginViewController::toolPageAction()` بتحليل melisKey، وعرض منطقته، وتسليم HTML
إلى `buildToolPage()` لتجميع مستند مستقلّ. سير العمل:

1. **حارس المصادقة** — يُشغَّل `denyIfUnauthenticated()` أوّلًا (هذه الصفحة *ليست* عامّة).
2. **تحليل melisKey ← مسار appConfig** — يربط `MelisCoreConfig->getMelisKeys()` القيمة `?key=` بمسار
   إعدادات التطبيق؛ والمقطع الأخير هو مفتاح العرض (view key).
3. **فرض وضع XHR** — يضيف `X-Requested-With: XMLHttpRequest` كي يعرض `generateRec()` المناطق
   بـ `follow_regular_rendering:false` بالطريقة نفسها التي يتّبعها مسار AJAX الكلاسيكي (وإلّا فإنّ تلك
   الأدوات تنزلق إلى الواجهة الأمامية وتعرض "404 MelisDemoCms").
4. **تثبيت معرّف جلسة PHP** — التقاط لقطة قبل العرض واستعادتها بعده (تُدوّر بعض الأدوات القديمة
   معرّف الجلسة أثناء العرض — وهو غير ضارّ في `/melis`، لكنّه قاتل هنا).
5. **عرض المنطقة** بـ `generateRec()` + `renderViewRec()`، مع التقاط أي مخرجات شاردة تكتبها
   منطقة عبر `echo` إلى التدفّق (تُبقى خارج الترميز على شكل تعليق HTML للتشخيص).
6. **تشغيل امتدادات `adjustToolHtml()`** (`toolpage_extensions`) على HTML المعروض.
7. **بناء أصول المنصّة** عبر `PlatformAssetsService::build()` وحقن `ressources` الـ
   JS/CSS الخاصة بالوحدة.
8. **تشغيل امتدادات `adjustToolAssets()`** (قد تنقل بعض JS الوحدة إلى مجموعة `<head>` وتعيد
   `skipJsRoots` كي لا تُحمِّله الحلقة العامّة مرّتين).
9. **التجميع** ‏`buildToolPage($html, $jsCallBacks, $assets, $zoneId, $key)` والإرجاع بصيغة
   `text/html` مع `X-Frame-Options: SAMEORIGIN`.

### المزالق التي يحلّها `buildToolPage()`

- **تحييد حارس "Remove Envato Frame" في bundle.js** — داخل iframe معزول (sandboxed) يُطلق الحارس
  ‏`SecurityError` يقتل bundle.js. تلتقط الصفحة الأصل الحقيقي
  (`window.__melisRealParent`) ثمّ تعيد تعريف `window.parent`/`window.top` كي يعيدا `window`.
- **تحميل `melisDataTable.js` بشكل منفصل** — مُصرَّح عنه في `app.interface.php` لكنّه غائب عن
  `bundle.js`؛ يُضاف إلى طابور JS (يُتيح `window.melisDataTable`).
- **حاجب `Proxy` عام** — للكائنات المعرَّفة فقط داخل `$(function(){…})` في bundle.js وغير
  المتاحة بعدُ حين تُحلَّل سكربتات جسم الأداة المتزامنة، يتفادى `Proxy` عديم المفعول الأخطاء المبكّرة.
- **تغليف jsCallbacks بـ try/catch** — لن يعطّل ردّ نداء (callback) تعتمد تبعيّته على تحميل غير متوفّر بشكل مستقلّ
  الصفحةَ.
- **حقن `ressources` الـ JS/CSS الخاصة بالوحدة** — لا يحتوي `bundle.js` الأساسي إلّا على أدوات
  MelisCore؛ أمّا أدوات الوحدات فتأتي بملفّاتها الخاصة (مثل `news.tool.js` ← `window.initNewsList`). تجمع
  وحدة التحكّم كلّ جذر تحتاجه الأداة — جذرها الخاصّ بالإضافة، والجذور المُتاحة عبر روابط `type`
  (تُجتاز تكراريًّا، مع حماية من الدورات)، وعُقَد الوحدات عبر `forward`، بالإضافة إلى بضعة جذور إضافية لبعض
  المحرّرات المركّبة المعروفة (مثل `meliscms_page`)، وكلّها مقيّدة بحيث لا تحمّل الوحدات غير النشطة شيئًا.
- **ترتيب JS في الرأس مقابل نهاية الجسم** — يُحمَّل JS المنصّة في `<head>`؛ وتُحمَّل `ressources` الوحدة
  داخل `<body>` بعد شريط علامات التبويب لكن قبل HTML الأداة، مماثلةً للمكتب الخلفي الكلاسيكي.
- **غلاف علامات تبويب المحرّر** — يتضمّن مراسي علامات التبويب الكلاسيكية (`#melis-id-nav-bar-tabs` المخفية،
  و`#melis-id-body-content-load`، و`activeTabId` العام) كي تعمل تدفّقات التحرير الكلاسيكية.
- **`<base href="/">`** كي تُحلّ عناوين URL النسبية لطلبات AJAX الخاصة بالأداة انطلاقًا من جذر الموقع.
- **نقطة تركيب النافذة المنبثقة `#melis-modals-container`** بالإضافة إلى مراقب ذاتي الإصلاح للخلفيّات الشاردة.
- **إصلاح التصدير** — يعيد ربط `melisCoreTool.exportData()` بنقرة على مرساة داخل الإطار (نافذة
  `window.open` المنبثقة القديمة لا تُنزِل الملفّ أبدًا داخل iframe معزول).
- **جسر علامات تبويب الأداة ورسائل postMessage لنتائج الأداة** — يُنعكس شريط علامات التبويب المخفي إلى المضيف عبر
  `postMessage({ __melisToolTabs, … })`؛ وتُرسَل رسالة `{ __melisToolResult, url, data }`
  بعد حفظ JSON كي يستطيع المضيف التفاعل بنيويًّا. ولا يُجسَّر أي إشعار مرئي — إذ تحتفظ الأدوات القديمة
  بتغذيتها الراجعة الأصلية الخاصة بها.

## أصول المنصّة — ‏`PlatformAssetsService`

يعيد `PlatformAssetsService::build($sm)` القيمة `['css' => …, 'js' => …, 'inline' => …]`، وهي قائمة
أصول المنصّة التي يُقلع بها كلّ iframe أداة:

- **CSS** — جميع ملفّات `bundle.css` الخاصة بالوحدات (تُحمَّل بالتوازي)، مسبوقةً بـ Google Fonts و
  `/assets/css/schemes.css`، مُرشَّحةً بحسب الملفّات الموجودة فعليًّا على القرص.
- **طابور JS** (الترتيب مهمّ) — ‏`get-translations?locale=…`، ثمّ `MelisCore/build/js/bundle.js`، ثمّ
  الإضافات غير المدمَجة: `melisDataTable.js`، و`loader.js`، و`findpage.tool.js`، و
  `bootstrap-tagsinput.js`، و`typeahead.bundle.js`، و`moment/fr.js`، و`melis_tinymce.js`.
- **المتغيّرات العامّة المضمّنة (Inline)** — ‏`basePath`، و`primaryColor`، … تُقرأ من مخطّط المنصّة النشط
  (`MelisCorePlatformSchemeService`)، مع ألوان Melis الافتراضية كخيار احتياطي.
- **تخزين الحزمة مؤقتًا / الإصلاح الذاتي** — يُخزَّن استدعاء `MelisAssetManagerWebPack->getAssets(true)` المُكلِّف
  مؤقتًا (ملفّ مؤقت، مدة صلاحية 600 ثانية + حفظ في الذاكرة داخل العملية)؛ فإن مُسح `etc/bundles/` بواسطة
  أداة الوحدات (Modules) أُعيد توليده تحت قفل كاتب-واحد، أو يُستبدَل المسار المدمَج
  بـ `/melis/react-platform-bundle`.
- **`bust($url)`** يُلحِق `?v=<mtime>` بعناوين URL للأصول المحلّية.

يدعم `LegacyWidgetCssService` مسار `react-legacy-widget-css` — إذ يُحدَّد نطاق CSS المكتب الخلفي القديم تحت
`.melis-legacy-widget` كي لا يتسرّب إلى غلاف React (تستخدمه الودجات القديمة غير المعتمدة على iframe
والمحقونة مباشرةً في DOM الخاص بـ React، مثل محتوى إضافة لوحة المعلومات).

## المسار الاحتياطي لـ SPA — ‏`SpaController`

يقدّم `SpaController::spaAction()` غلاف React من أجل `/melis-react` وكلّ رابط عميق من جانب
العميل:

- يحلّ `index.html` عبر `$_SERVER['DOCUMENT_ROOT']`، قارئًا
  `…/vendor/melisplatform/melis-core/public/ui-react/index.html` (يقيم بناء React في مجلّد
  `public/` الخاص بـ melis-core، ويُقدَّم على `/MelisCore/ui-react/`). يعمل بغضّ النظر عن موضع هذه الوحدة
  على القرص.
- يعيد `404` إن كان الغلاف مفقودًا؛ وإلّا فيعيد الملفّ بصيغة
  `text/html; charset=utf-8` مع `Cache-Control: no-cache, no-store, must-revalidate` (لا يُخزَّن الغلاف
  مؤقتًا أبدًا؛ أمّا الأصول المُشار إليها فتُبصَم بمحتواها (content-hashed)).
- تُدفَّق الملفّات الحقيقية (‏`index.html` الجذر، والأصول المبصومة) في وقت أبكر عبر MelisAssetManager عند
  الإقلاع، لذا لا تنزلق إلى هنا سوى مسارات العميل الافتراضية (مثل `/melis-react/news/5`).

يفوز مسار `meliscore-melis-react-spa` من نوع regex (`priority => 1000`) على مسار الواجهة الأمامية
الشامل (catch-all) الخاص بـ MelisFront. ويتضمّن الـ regex الخاص به `'/melis-react(?<spa>/[a-zA-Z0-9_\-/~.]*)?'`
المحرفَ `~` (فاصل المعرّف المركّب) والمحرفَ `.` كي تُحلّ تلك الروابط العميقة إلى SPA عند إعادة تحميل الصفحة كاملةً.

## نقطة الامتداد — خطّاف `toolpage_extensions`

تعيش خصوصيّات الأدوات في الوحدة **المالكة**، لا مُشفّرةً بشكل ثابت هنا. تسجّل الوحدة اسم
خدمة تحت `config('melis_react_override')['toolpage_extensions'][]` وتنفّذ
`MelisReactOverride\Controller\PluginViewToolPageExtensionInterface`:

```php
interface PluginViewToolPageExtensionInterface
{
    // Adjust the rendered zone HTML for a melisKey before assembly (return $html unchanged
    // for keys the extension doesn't care about).
    public function adjustToolHtml(string $key, string $html, array $jsCallBacks, PluginViewController $controller): string;

    // Adjust the platform asset bundle. Return ['assets' => array, 'skipJsRoots' => array<string, true>];
    // 'skipJsRoots' lists roots the extension already injected so the generic loop must NOT re-add them.
    public function adjustToolAssets(string $key, string $html, array $assets, PluginViewController $controller): array;
}
```

يحلّ `PluginViewController::toolPageExtensions()` الأسماء المسجَّلة، ويتخطّى **بصمت**
الأسماء التي ليست خدمات مسجَّلة أو لا تنفّذ الواجهة (بحيث يكون الامتداد
اختياريًّا تمامًا — الوحدة غير مثبَّتة ← لا عمل)، ويخزّن القائمة مؤقتًا، ويستدعي `adjustToolHtml()` (الخطوة 6)
و`adjustToolAssets()` (الخطوة 8) لكلّ منها.

> **لماذا مصفوفة إعدادات، لا تجاوز لوحدة التحكّم:** لأنّ الإسهامات من وحدات مختلفة تتراكم ببساطة
> بغضّ النظر عن ترتيب التحميل (على خلاف الاسم المستعار لوحدة التحكّم، حيث لا تفوز سوى الوحدة
> المدموجة أخيرًا).

**مثال مستهلِك.** تسجّل MelisAICommunityExtensions الخدمة
`MelisAICommunityExtensions\Controller\React\PluginViewToolPageExtension` تحت
`melis_react_override.toolpage_extensions` لحقن ملفّيها `tool.js` / `style.css` في صفحات الأدوات
القديمة المقدَّمة في عرض React "Old".

## الملفّات الأساسية

| الجانب | المسار |
| --- | --- |
| المسارات، وتجاوز وحدة التحكّم، و`excluded_routes` | `config/module.config.php` |
| إقلاع الوحدة + المحمِّل التلقائي | `src/Module.php` |
| آلية iframe، وإجراءات لوحة المعلومات، والامتدادات | `src/Controller/PluginViewController.php` |
| تقديم غلاف SPA | `src/Controller/SpaController.php` |
| عقد `toolpage_extensions` | `src/Controller/PluginViewToolPageExtensionInterface.php` |
| بناء أصول المنصّة + تخزين الحزمة مؤقتًا | `src/Service/PlatformAssetsService.php` |
| CSS المكتب الخلفي القديم المُحدَّد النطاق | `src/Service/LegacyWidgetCssService.php` |

انظر أيضًا: [melis-core](/legacy/reference/modules/melis-core)

> **لا واجهة، ولا لقطات شاشة.** إنّ MelisReactOverride بنية تحتية بلا واجهة خاصة به —
> فما يظهر على الشاشة هو *الأداة القديمة* التي يعرضها أو *غلاف React* الذي يقدّمه، وكلاهما
> موثّق في وحدته الخاصة.
