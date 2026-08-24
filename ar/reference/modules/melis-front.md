# MelisFront

> نظام عرض الواجهة الأمامية الذي يحوّل عنوان URL إلى صفحة عامة مكتملة ويقدّم كتل المحتوى (إضافات الصفحة) التي يسحبها المحرّرون ويُفلتونها على الصفحات في الواجهة الخلفية المبنية على React. الحزمة `melisplatform/melis-front`.

## الغرض

MelisFront هو زمن التشغيل الذي يحلّ عنوان ويب إلى صفحة Melis، ويُشغّل مسار العرض (التوجيه، تحسين محركات البحث، إضافات القوالب، التخطيط، التخزين المؤقت، تصغير الأصول) ويُسلّم استجابة HTML إلى الزائر. كما يُشغّل **المعاينة الحيّة القابلة للتحرير** عبر إعادة عرض أي صفحة في وضع `melis`. لا يملك MelisFront أي جداول قاعدة بيانات — فكل بيانات الصفحة/الموقع/القالب/تحسين محركات البحث تُقرأ من [melis-engine](/ar/reference/modules/melis-engine)، وهو المصدر الوحيد للحقيقة.

يُعدّ MelisFront أحد ثلاثيّ وثيق الترابط: [melis-engine](/ar/reference/modules/melis-engine) (طبقة البيانات)، و**melis-front** (عرض الواجهة الأمامية)، و[melis-cms](/ar/reference/modules/melis-cms) (محرّر الواجهة الخلفية). التغييرات على أيٍّ منها تتضمّن عادةً الاثنين الآخرين.

## في الواجهة الخلفية المبنية على React

لا يملك MelisFront **أي أداة React مستقلة**: لا لبنة `ui-react/`، ولا ملف `brick.manifest.json`، ولا ملف `react-api.php` — فهو لا يظهر أبداً في الشريط الجانبي الأيسر لـ `/melis-react`. فسطح تعامله الكامل في الواجهة الخلفية هو مجموعة **إضافات الصفحة (كتل المحتوى)** التي تُهيّئها داخل **محرّر صفحات MelisCms**.

تلتقي بـ MelisFront عند تحرير صفحة: **MelisCms ← افتح صفحة ← تبويب Edition**. تبويب Edition هذا هو محرّر الصفحات الكلاسيكي بالسحب والإفلات **المعروض داخل إطار iframe داخل قشرة React** (`/melis/react-tool-page?key=meliscms_page`). داخله تسحب كتل MelisFront إلى المناطق وتفتح نافذة **Properties** الخاصة بها. لا يقوم React سوى *باستضافة* ذلك المحرّر القديم؛ ولا يُسهم MelisFront بأي مكوّن React خاص به.

هناك نوعان من الكتل:

- **كتل الوسوم (Tag blocks)** تُحرّر **في مكانها** على الصفحة — **HTML** (نص منسّق) و**Media** (صورة/ملف). بدون نافذة منبثقة.
- **كتل التهيئة (Config blocks)** تُعدّ عبر نافذة **Properties** منبثقة — **Menu** و**Breadcrumb** و**List-from-folder** و**GDPR banner**. وهي تولّد المحتوى من شجرة الصفحات / تهيئة الموقع.

## تفعيله

أضِف إلى `config/melis.module.load.php`:

```php
return [
    'MelisFront',
];
```

التبعية المُعلَنة لـ Melis: `melisplatform/melis-core`. وفي زمن التشغيل يستهلك أيضاً خدمات MelisEngine. ترتيب التحميل: `melis-core` ← **melis-front** ← `melis-engine` ← `melis-cms`.

## كتل الوسوم — التحرير في المكان

### HTML (نص)

الكتلة الأساسية: **منطقة نص منسّق** (TinyMCE) للعناوين والفقرات والروابط والمحتوى المنسّق. تُحرّر **مباشرةً على الصفحة**، بدون نافذة Properties. صنف الإضافة `MelisFrontTagHtmlPlugin`.

![كتلة HTML/Text في محرّر الصفحات مع شريط أدوات TinyMCE الكامل](/screenshots/react/melis-front/melisfront-page-plugin-html-tag.png)

### Media

تضع **صورة أو ملفاً** من مكتبة الوسائط. تُحرّر أيضاً في مكانها عبر شريط أدوات مُدمج مع عنصر نائب "Add media content here". صنف الإضافة `MelisFrontTagMediaPlugin`.

![كتلة Media في مكانها مع العنصر النائب Add media content here](/screenshots/react/melis-front/melisfront-page-plugin-media-tag.png)

## كتل التهيئة — نافذة Properties

تُعدّ كتل التهيئة عبر نافذة **Properties** منبثقة صغيرة تعرضها المنصّة. الحقلان المتكرّران هما القائمة المنسدلة **Template** (`MelisEnginePluginTemplateSelect`، الحقل `template_path`) التي تختار عرض `.phtml`، و**مُنتقي الصفحة** (`MelisText` مع زرّ `fa fa-sitemap`) الذي يحدّد الصفحة الأولى/الأصل في الشجرة. تُعلن كل كتلة تهيئة نافذتها بوصفها `melis.modal_form` (مواصفة نموذج Laminas) في `config/plugins/<Plugin>.config.php`؛ وليس هناك مكوّن React خاص بكل إضافة.

### Menu

يبني **قائمة تنقّل تلقائياً من شجرة الصفحات**. حقول النافذة: **Template** و**Starting page**. الإضافة `MelisFrontMenuPlugin` (الحقل `pageIdRootMenu`).

![نافذة Properties لكتلة Menu مع حقلَي Template وStarting page](/screenshots/react/melis-front/melisfront-page-plugin-menu-config-properties.png)

### Breadcrumb

يعرض مسار "أنت هنا" (Home › Section › Page). حقول النافذة: **Template** (الافتراضي `MelisFront/breadcrumb`) و**Starting page**. الإضافة `MelisFrontBreadcrumbPlugin` (الحقل `pageIdRootBreadcrumb`).

![نافذة Properties لكتلة Breadcrumb مع حقلَي Template وStarting page](/screenshots/react/melis-front/melisfront-page-plugin-breadcrumb-config-properties.png)

### List-from-folder

يأخذ **مجلداً في شجرة الصفحات ويسرد صفحاته الفرعية** تلقائياً. حقول النافذة: **Template** (كيفية عرض كل عنصر) و**Parent page** (المجلد المصدر). الإضافة `MelisFrontShowListFromFolderPlugin` (الحقل `pageIdFolder`).

![نافذة Properties لـ List-from-folder مع حقلَي Template وParent page](/screenshots/react/melis-front/melisfront-page-plugin-folderlisting-config-properties.png)

### GDPR banner

**شريط ملفات تعريف الارتباط/الموافقة** المعروض على الموقع العام. لا تحتاج نافذته سوى إلى **Template**؛ أما الصياغة فتأتي من نصوص GDPR الخاصة بالموقع. الإضافة `MelisFrontGdprBannerPlugin`.

![نافذة Properties لشريط GDPR مع حقل Template وحيد](/screenshots/react/melis-front/melisfront-page-plugin-gdprbanner-config-properties.png)

### حقول نافذة التهيئة

| الإضافة | حقول النافذة (الاسم / النوع) | القالب الافتراضي |
| --- | --- | --- |
| Breadcrumb | `template_path` (`MelisEnginePluginTemplateSelect`) · `pageIdRootBreadcrumb` (`MelisText`، sitemap) | `MelisFront/breadcrumb` |
| Menu | `template_path` · `pageIdRootMenu` (`MelisText`، sitemap) | `MelisFront/menu` |
| List-from-folder | `template_path` · `pageIdFolder` (`MelisText`، sitemap) | `MelisFront/show-list-from-folder` |
| GDPR banner | `template_path` فقط | `MelisFront/gdpr-banner` |

يقوم **Apply** بإرسال القيم رجوعاً عبر طبقة السحب والإفلات، التي تحفظها في XML الجلسة الخاص بالصفحة. لا يشارك React في هذه الدورة؛ فواجهة الإضافة قائمة بالكامل على PHP/JS القديم داخل إطار Edition.

## الخدمات الرئيسية

| اسم الخدمة المستعار | الدور |
| --- | --- |
| `MelisFrontHead` | يدير `<title>` الصفحة، ووصف meta، والرابط القانوني (canonical)، ويحقن أصول CSS/JS الخاصة بالإضافات. |
| `MelisSiteConfigService` | يقرأ التهيئة لكل موقع حسب المفتاح أو الصفحة أو اللغة — دمج ملف + قاعدة بيانات. |
| `MelisSiteTranslationService` | البحث عن مفتاح/نص الترجمة لكل موقع وعمليات CRUD، مع تخزين مؤقت لكل موقع. |
| `MelisTranslationService` | ترجمات الوحدة/اللغة المحلية (نصوص الواجهة الخلفية)، مع تخزين مؤقت. |
| `MinifyAssets` | يبني `bundle.css` / `bundle.js` لكل موقع باستخدام `matthiasmullie/minify`. |
| `MelisFrontNavigation` | مصنع تنقّل يبني شجرة `Laminas\Navigation` من شجرة صفحات المحرّك. |

## عرض الواجهة الأمامية

### التوجيه

المسار الأمامي الرئيسي هو نمط Regex يطابق `.../id/{idpage}`، ويُوجَّه إلى `MelisFront\Controller\Index::index`. المسارات الفرعية: `/renderMode/melis` (وضع تحرير الواجهة الخلفية الذي يستخدمه MelisCms) و`/preview` (معاينة النسخة المحفوظة). المسارات الخاصة: `sitemap(.xml)` و`/css/plugin-width.css` و`/melissearchindex/…` و`/melispluginrenderer` (عرض إضافة واحدة عبر AJAX) و`/minify-assets`.

### مسار العرض (المستمعون)

مربوطة في `src/Module.php` عبر `EVENT_DISPATCH` و`EVENT_FINISH` (~19 مستمعاً في المجموع):

| المرحلة | المستمعون |
| --- | --- |
| `EVENT_LOAD_MODULES_POST` | `MelisFrontSEORouteListener`، `MelisFrontSiteConfigListener`، `MelisFrontMiniTemplateConfigListener` |
| `EVENT_DISPATCH` | `MelisFrontXSSParameterListener`، `MelisFrontHomePageRoutingListener` / `…HomePageIdOverrideListener`، `MelisFrontSEODispatchRouterRegularUrlListener` (التحقق من الصفحة، 404/301، يُطلق `melisfront_site_dispatch_ready`)، `MelisFront404To301Listener`، `MelisFront404CatcherListener` |
| `EVENT_FINISH` | `MelisFrontPluginsToLayoutListener` (CSS/JS الخاص بالإضافات)، `MelisFrontSEOMetaPageListener` (العنوان/الوصف/canonical)، `MelisFrontAttachCssListener` (CSS الخاص بالصفحة)، `MelisFrontLayoutListener` (تخطيط الواجهة الأمامية أو تخطيط الواجهة الخلفية + TinyMCE في وضع `melis`)، `MelisFrontPageCacheListener`، `MelisFrontMinifiedAssetsCheckerListener` |

### إضافات القوالب (إضافات المتحكّم)

تُوسّع جميعها `MelisEngine\Controller\Plugin\MelisTemplatingPlugin`، ومُسجّلة تحت `controller_plugins`. الكتل الظاهرة في محرّر React هي مجموعة فرعية منها:

| اسم الإضافة المستعار | الكتلة |
| --- | --- |
| `MelisFrontTagHtmlPlugin` | منطقة HTML / نص منسّق قابلة للتحرير في المكان. |
| `MelisFrontTagTextareaPlugin` | منطقة نص عادي. |
| `MelisFrontTagMediaPlugin` | صورة / ملف من مكتبة الوسائط. |
| `MelisFrontMenuPlugin` | قائمة تنقّل مبنية من شجرة الصفحات. |
| `MelisFrontBreadcrumbPlugin` | مسار Breadcrumb (Home › … › الصفحة الحالية). |
| `MelisFrontShowListFromFolderPlugin` | يسرد الصفحات الفرعية من مجلد مختار تلقائياً. |
| `MelisFrontDragDropZonePlugin` | حاوية تخطيط (منطقة إفلات للإضافات الأخرى). |
| `MelisFrontBlockSectionPlugin` | حاوية كتلة/قسم قابلة لإعادة الاستخدام. |
| `MelisFrontGenericContentPlugin` | كتلة محتوى عامة الأغراض. |
| `MelisFrontGdprBannerPlugin` | شريط موافقة ملفات تعريف الارتباط / GDPR. |
| `MelisFrontGdprRevalidationPlugin` | يعيد طلب الموافقة عند تغيّر سياسة GDPR. |
| `MelisFrontSearchResultsPlugin` | يعرض نتائج البحث الداخلي في الموقع. |
| `MiniTemplatePlugin` | يُدرج قالباً مصغّراً جاهزاً بنقرة واحدة. |

### متحكّم عارض الإضافات

يُعيد `MelisFront\Controller\MelisPluginRendererController` عرض إضافة واحدة عند الطلب — وهذا ما يستدعيه إطار Edition عندما تُفلت أو تُحرّر كتلة:

- `getPluginAction()` (المسار `/melispluginrenderer`) — عرض إضافة واحدة عبر AJAX.
- `editPluginAction`، `dndLayoutAction`، `dndUpdateOrderAction`، `dndRemoveAction` — تدفّقات السحب والإفلات وتحرير الإضافات.

### مساعدو العرض (View helpers)

تُستخدم داخل قوالب `.phtml` الخاصة بالموقع (مُسجّلة تحت `view_helpers`):

| اسم المساعد المستعار | الاستخدام |
| --- | --- |
| `MelisTag` | يُعلن منطقة قابلة للتحرير (HTML أو وسائط) يملؤها المحرّرون في مكانها. |
| `MelisLink` | يُخرج عنوان URL للصفحة المُحسَّن لمحركات البحث (يبقى صحيحاً إذا نُقلت الصفحة). |
| `MelisMenu` | يعرض قائمة تنقّل من شجرة الصفحات. |
| `MelisDragDropZone` | يعرض منطقة سحب وإفلات تستضيف إضافات أخرى. |
| `siteTranslate` | يُخرج نص ترجمة موقع حسب المفتاح. |
| `SiteConfig` | يقرأ قيمة تهيئة موقع. |

يتوفّر أيضاً مساعدو اللغة/الصفحة الرئيسية لروابط نسخ اللغة ورابط الصفحة الرئيسية.

### التنقّل

يُوسّع `MelisFrontNavigation` (`src/Navigation/Factory/`) مصنع تنقّل Laminas لبناء كائن `Laminas\Navigation` من شجرة صفحات المحرّك (`MelisEnginePage` / `MelisEngineTree`)، الذي يعرضه مساعدا Menu وBreadcrumb.

### تصغير الأصول

يبني `MinifyAssetsService` (المدعوم بـ `matthiasmullie/minify`) ملفَّي `bundle.css` / `bundle.js` لكل موقع. ويحقنهما `MelisFrontMinifiedAssetsCheckerListener` (مع كسر التخزين المؤقت) عند وجودهما. أطلِق عملية بناء عبر المسار `/minify-assets`.

## جداول قاعدة البيانات

لا يملك MelisFront **أي جداول قاعدة بيانات**. فكل بيانات الصفحة والموقع واللغة وتحسين محركات البحث والترجمة يملكها [melis-engine](/ar/reference/modules/melis-engine) و[melis-cms](/ar/reference/modules/melis-cms).

## مثال

الاستخدام النموذجي في قالب `.phtml` الخاص بموقع واستدعاءات خدمة PHP:

```php
// Inside a site page template (.phtml)
<?= $this->MelisMenu($idPage); ?>                         // navigation menu from the page tree
<a href="<?= $this->MelisLink($targetPageId); ?>">…</a>  // SEO-friendly page link
<?= $this->MelisTag($idPage, 'zone_main', 'html'); ?>    // editable HTML zone
<?= $this->siteTranslate('btn_send'); ?>                  // site translation string
<?= $this->SiteConfig('contact_email'); ?>               // site config value
```

```php
// Reading site config and translations in PHP
$siteConfig = $serviceManager->get('MelisSiteConfigService');
$email = $siteConfig->getSiteConfigByKey('contact_email', $siteId);

$tr = $serviceManager->get('MelisSiteTranslationService')
        ->getEntryByTextAndSiteId('btn_send', $siteId, $langId);
```

```php
// Hooking the render pipeline (after page validation, before render)
$sharedEvents->attach('MelisFront', 'melisfront_site_dispatch_ready', function ($e) {
    $params = $e->getParams(); // page id, site, renderMode…
    // e.g. force a redirect, add data to the layout, A/B-test…
}, 50);
```

## الملفات الرئيسية

| الشأن | المسار |
| --- | --- |
| تمهيد الوحدة + ربط المستمعين | `vendor/melisplatform/melis-front/src/Module.php` |
| المسارات والخدمات والإضافات والمساعدون والتخزين المؤقت | `vendor/melisplatform/melis-front/config/module.config.php` |
| تهيئة الإضافات (الإعدادات الافتراضية للواجهة الأمامية + `melis.modal_form`) | `vendor/melisplatform/melis-front/config/plugins/` |
| مستمعو مسار العرض | `vendor/melisplatform/melis-front/src/Listener/` |
| الخدمات (Head، SiteConfig، Translations، Minify) | `vendor/melisplatform/melis-front/src/Service/` |
| إضافات القوالب (كتل المحتوى) | `vendor/melisplatform/melis-front/src/Controller/Plugin/` |
| متحكّم عارض الإضافات | `vendor/melisplatform/melis-front/src/Controller/MelisPluginRendererController.php` |
| مساعدو العرض | `vendor/melisplatform/melis-front/src/View/Helper/` |
| مصنع التنقّل | `vendor/melisplatform/melis-front/src/Navigation/Factory/` |

اطّلع أيضاً على: [melis-engine](/ar/reference/modules/melis-engine)، [melis-cms](/ar/reference/modules/melis-cms)، [melis-core](/ar/reference/modules/melis-core)
