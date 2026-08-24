# MelisEngine

> الأساس المشترك لبيانات نظام إدارة المحتوى — نموذج الصفحات والمواقع واللغات والفئة الأساسية لإضافات القوالب وذاكرة التخزين المؤقت للعرض. الحزمة `melisplatform/melis-engine`.

## الغرض

يمتلك MelisEngine نموذج قاعدة بيانات نظام إدارة المحتوى بالكامل (الصفحات، شجرة الصفحات، المواقع، القوالب، اللغات،
النطاقات، تحسين محركات البحث، الأنماط) ويعرضه عبر بوابات الجداول والخدمات وذاكرة تخزين مؤقت متعددة المستويات.
يقرأ ويكتب كلٌّ من [MelisFront](/ar/reference/modules/melis-front) (عرض الواجهة الأمامية) و
[MelisCms](/ar/reference/modules/melis-cms) (تحرير الواجهة الخلفية) حصريًا
عبر MelisEngine — فلا يمتلك أيٌّ من الوحدتين الشقيقتين أي جداول. كما يُعرِّف
`MelisTemplatingPlugin`، الفئة المجردة الأساسية التي تمتد منها كل إضافة محتوى في المنصة.

## الدور في الواجهة الخلفية القائمة على React

لا يمتلك MelisEngine **أي أداة واجهة خلفية بلغة React ولا واجهة مستخدم خاصة به** — لا لبنة (brick)، ولا
`config/react-api.php`، ولا صلاحيات، ولا مدخل في الشريط الجانبي داخل `/melis-react`. وهو **غير مُرحَّل
إلى React ولا يُقصد أن يكون كذلك**: فهو بنية تحتية للمنصة، وليس أداة واجهة خلفية. علاقته
بواجهة React تتم بالكامل خلف الكواليس، عبر مسارين:

- **مسار البيانات** — تقرأ وتكتب متحكمات نظام إدارة المحتوى في React (`MelisReactApi*`، والتي تعيش في وحدات نظام إدارة المحتوى،
  وليس هنا) الصفحات والمواقع واللغات والقوالب وتحسين محركات البحث **فقط** عبر
  بوابات `MelisEngineTable*` وخدمات MelisEngine (`MelisEnginePage`، `MelisEngineTree`،
  `MelisEngineLang`، …). لا تتعامل طبقة React أبدًا مع مخطط نظام إدارة المحتوى مباشرة.
- **مسار العرض** — يُعرَض محتوى نظام إدارة المحتوى الظاهر في محرر الصفحات القائم على React وفي أدوات
  iframe القديمة **على جانب الخادم** (الصفحات ← القوالب ← المناطق ← الإضافات). يحلّ المحرك
  نموذج الصفحة ويُعرِّف الفئة الأساسية للإضافات؛ ويُنفِّذ MelisFront عملية العرض الفعلية. تُضمِّن React
  الناتج المُعرَض على الخادم بدلًا من إعادة عرض محتوى نظام إدارة المحتوى على جانب العميل.

ولأنه غير مرئي لكنه حامل للأثقال، تظهر مشكلات المحرك *داخل أدوات نظام إدارة المحتوى في React* —
شجرة صفحات فارغة، قائمة منسدلة للغات تبقى فارغة، محرر صفحات يُخطئ عند التحميل —
وعادةً ما يكون السبب جدول نظام إدارة محتوى مفقودًا أو متأخرًا، أو خدمة محرك مُخفِقة، ولا يكون أبدًا بسبب شاشة محرك
(إذ لا توجد أي شاشة).

## تفعيله

يُحمَّل MelisEngine تلقائيًا كتبعية. ترتيب التحميل في
`config/melis.module.load.php` هو:

```php
// config/melis.module.load.php
return [
    'MelisCore',
    'MelisFront',
    'MelisEngine',   // requires melis-core + melis-front
    'MelisCms',
];
```

تبعيات Composer: `melisplatform/melis-core` `^6.0`، `melisplatform/melis-front` `^6.0`،
`laminas/laminas-cache` (محوِّلات نظام الملفات + الذاكرة). يعمل على PHP `^8.3 | ^8.5`.

## الخدمات الرئيسية

مُسجَّلة كأسماء بديلة (aliases) في `service_manager` ضمن `config/module.config.php`:

| اسم الخدمة البديل | الدور |
| --- | --- |
| `MelisEnginePage` / `MelisPageService` | حلّ صفحة حسب المعرِّف والوضع (`published` / `saved`): `getDatasPage($idPage, $mode)` — يُرجِع شجرة الصفحة المُرطَّبة، وبيانات الصفحة، وتحسين محركات البحث، وكائنات القالب والنمط |
| `MelisEngineTree` / `MelisTreeService` | التنقل في شجرة الصفحات: `getPageChildren()`، `getPageFather()`، `getPageBreadcrumb()`، `getPageLink()`، البحث |
| `MelisEngineTemplateService` | البحث عن القوالب: `getTemplate($tplId)` |
| `MelisEngineSiteService` | كتالوج المواقع |
| `MelisEngineSiteDomainService` | حلّ النطاق ← الموقع: `getSiteByDomain()` |
| `MelisEngineLang` / `MelisEngineLangService` | اللغات: اللغات المتاحة، الإعداد المحلي ↔ المعرِّف، لغة الموقع |
| `MelisEngineSEOService` | بيانات تحسين محركات البحث لكل صفحة: `getSEOById()` |
| `MelisEnginePageDefaultUrlsService` | عمليات البحث عن عناوين URL المحسوبة مسبقًا / الأساسية للصفحات |
| `MelisEngineStyle` / `MelisEngineStyleService` | أنماط الموقع وأنماط CSS لكل صفحة |
| `MelisEngineCacheSystem` | مُنظِّم ذاكرة التخزين المؤقت: `getCacheByKey()`، `setCacheByKey()`، `deleteCacheByPrefix()` |
| `MelisSearch` | فهرس صفحات النص الكامل (بنمط Lucene) يستخدمه البحث في الواجهة الأمامية |
| `MelisEngineSendMail` | أداة البريد الإلكتروني |
| `MelisGdprService` / `MelisGdprAutoDeleteService` | نصوص لافتة GDPR وإطار عمل الحذف التلقائي |
| `MelisEngineComposer` | عمليات Composer / التبعيات |

كل الخدمات التي تمتد من `MelisGeneralService` تُطلِق أحداث `*_start` / `*_end` (مثل
`melisengine_service_get_available_languages_start` / `_end`) يمكن للوحدات الأخرى الربط بها.

### مستهلكو React (مُتحقَّق منهم)

هذه هي نقاط الدخول المُصرَّح بها في مسار البيانات التي تستدعي أدوات نظام إدارة المحتوى في React من خلالها المحرك:

| خدمة / بوابة المحرك (الاسم البديل) | مُستخدَمة من قِبل (الواجهة الخلفية في React) |
| --- | --- |
| `MelisEnginePage` (`MelisPageService`) | melis-cms `MelisReactApiPageController` — بيانات الصفحة لمحرر الصفحات القائم على React |
| `MelisEngineTree` (`MelisTreeService`) | melis-cms `MelisReactApiPageController` — التنقل في شجرة الصفحات |
| `MelisEngineLang` (`MelisEngineLangService`) | melis-cms `MelisReactApiCmsSitesController`، `MelisReactApiCmsMenuManagerController` — لغات نظام إدارة المحتوى المتاحة |
| `MelisEngineTableCmsLang` (`MelisCmsLangTable`) | melis-cms-tags، melis-cms-user-account، melis-core (GDPR) — قوائم منسدلة للغات في React |

الاسم البديل `MelisEngineTableCmsLang => MelisCmsLangTable::class` مُسجَّل في
`config/module.config.php`.

## الواجهة الخلفية

لا يمتلك MelisEngine أداة خاصة به موجَّهة للمستخدم النهائي، لا في الواجهة الخلفية القديمة ولا في `/melis-react`. وهو
يُسجِّل مصنعَيْن لعناصر النماذج يُستخدمان عبر الواجهة الخلفية:

| المصنع | الغرض |
| --- | --- |
| `MelisEnginePluginTemplateSelect` | عنصر تحديد القالب في نماذج الإضافات |
| `MelisEngineSiteSelect` | عنصر تحديد الموقع في نماذج الإضافات |

كما توجد متحكمات الإعداد والصيانة (`MelisSetup*`)، لكنها تُستدعى من قِبل
المُثبِّت، وليس من قِبل المحررين.

## الواجهة الأمامية

توجد هنا الفئة الأساسية لكل إضافة محتوى:

| العنصر | الوصف |
| --- | --- |
| `MelisEngine\Controller\Plugin\MelisTemplatingPlugin` | الفئة الأساسية المجردة لكل إضافات المحتوى. تُعرِّف `front()` (العرض المباشر، مجردة)، و`back()` (حاوية / عرض التحرير في الواجهة الخلفية)، واستمرارية تكوين XML (`loadDbXmlToPluginConfig()` / `savePluginConfigToXml()`)، وتحميل GET/POST، ووضع المعاينة، والعرض المتجاوب. |

كل إضافة محتوى في المنصة (News، Slider، Menu، Breadcrumb، …) تُنشئ فئة فرعية من هذه. نفِّذ
`front()` للإخراج المباشر؛ وتتولى الفئة الأساسية `back()` تلقائيًا. ويُغذِّي خط أنابيب الإضافات نفسه
محرر الصفحات القائم على React: يعرض MelisFront إضافات كل منطقة على جانب الخادم، وتعرض React
النتيجة.

يربط مستمعان للخدمات المصغرة (micro-service) الحدثَ `melis_core_microservice_amend_data` لكشف طرق
الشجرة والصفحة (`getPageChildren`، `getPageFather`، `getDomainByPageId`، `getDatasPage`) عبر
طبقة الخدمات المصغرة للمنصة.

## جداول قاعدة البيانات

يُعدّ MelisEngine المصدر الوحيد للحقيقة لمخطط نظام إدارة المحتوى
(`install/sql/setup_structure.sql` + فروقات `install/dbdeploy/`):

| الجدول | يحتوي على |
| --- | --- |
| `melis_cms_page_tree` | التسلسل الهرمي للصفحات (`tree_father_page_id`، الترتيب) |
| `melis_cms_page_published` | النسخة المنشورة (المباشرة) من كل صفحة |
| `melis_cms_page_saved` | النسخة المحفوظة / المسودة (المحرَّرة في الواجهة الخلفية) |
| `melis_cms_page_lang` | روابط الصفحة ↔ اللغة |
| `melis_cms_lang` | لغات / إعدادات نظام إدارة المحتوى المحلية |
| `melis_cms_site` | المواقع (جذر شجرة الصفحات) |
| `melis_cms_template` | القوالب (التخطيط / المتحكم / الإجراء أو مسار PHP) |
| `melis_cms_page_seo` | تحسين محركات البحث لكل صفحة (URL، إعادة توجيه 301، عنوان/وصف meta، الأساسي) |
| `melis_cms_site_domain` | نطاقات الموقع لكل بيئة |
| `melis_cms_site_301` / `melis_cms_site_404` | عمليات إعادة التوجيه 301 على مستوى الموقع / تعيين 404 |
| `melis_cms_page_default_urls` | عناوين URL المحسوبة مسبقًا للصفحات (جدول ذاكرة تخزين مؤقت) |
| `melis_cms_style` / `melis_cms_page_style` | أنماط CSS وروابط الصفحة ↔ النمط |
| `melis_cms_platform_ids` | نطاقات تخصيص معرِّفات الصفحات لكل بيئة |
| `melis_cms_site_config` / `_home` / `_langs` | تكوين الموقع، الصفحة الرئيسية لكل لغة، اللغات النشطة |
| `melis_cms_site_robot` | ملف robots.txt لكل نطاق |
| `melis_cms_mini_tpl_*` | فئات القوالب المصغرة والقوالب والأعلام (flags) |
| `melis_cms_gdpr_texts` | نصوص لافتة GDPR لكل موقع / لغة |
| `melis_site_translation` / `_text` | سلاسل الترجمة على مستوى الموقع |

### بوابات الجداول

يُغلَّف كل جدول ببوابة `MelisEngineTable*` مُسجَّلة في مدير الخدمات
(مثل `MelisEngineTablePageTree`، `MelisEngineTablePagePublished`، `MelisEngineTablePageSeo`).
يجب على الوحدات الأخرى — القديمة أو React — أن تستخدم هذه البوابات دائمًا، لا SQL خامًا أبدًا. توفّر البوابة
الأساسية الطرق `getEntryById()`، `getEntryByField()`، `save()`، `deleteById()`، `fetchAll()`.

## مثال

**قراءة صفحة والتنقل في الشجرة:**

```php
$pageSvc = $sm->get('MelisEnginePage');
$page    = $pageSvc->getDatasPage($idPage);            // 'published' (live) by default
$draft   = $pageSvc->getDatasPage($idPage, 'saved');   // draft shown in the React page editor

$tree       = $sm->get('MelisEngineTree');
$children   = $tree->getPageChildren($idPage, 1);       // 1 = published only
$breadcrumb = $tree->getPageBreadcrumb($idPage);
$url        = $tree->getPageLink($idPage, true);        // true = absolute URL
```

**تعبئة قائمة منسدلة للغات في React من متحكم نظام إدارة محتوى (على جانب الخادم، بالتفويض إلى المحرك):**

```php
// Inside a MelisReactApi* controller of a CMS module — the React JSON layer
// delegates to the engine; MelisEngine exposes no react-api of its own.
$langTable = $sm->get('MelisEngineTableCmsLang');
$langs     = $langTable->fetchAll()->toArray();   // fills a React language dropdown
```

**القراءة/الكتابة عبر بوابة جدول (لا SQL خام أبدًا):**

```php
$seoTable = $sm->get('MelisEngineTablePageSeo');
$seo      = $seoTable->getEntryByField('plang_page_id', $idPage)->current();
$seoTable->save(['seo_meta_title' => 'New title'], $existingSeoId);  // upsert
```

**تخزين نتيجة محسوبة في ذاكرة التخزين المؤقت:**

```php
$cache = $sm->get('MelisEngineCacheSystem');
$cache->setCacheByKey('mykey', 'my_cache_config', $value);
$value = $cache->getCacheByKey('mykey', 'my_cache_config');
$cache->deleteCacheByPrefix('page_' . $idPage, 'meliscms_page');   // invalidate a page
```

**الاستماع إلى حدث خدمة:**

```php
$sharedEvents->attach('MelisEngine', 'melisengine_page_getdatas_end', function ($e) {
    $p = $e->getParams();   // includes page id and 'results'
    // alter $p['results'] before it is returned
}, 50);
```

**بناء إضافة محتوى:**

```php
// Subclass MelisTemplatingPlugin, implement front() for live render.
// The base class handles back() (BO container), config XML persistence and preview.
class MyPlugin extends MelisEngine\Controller\Plugin\MelisTemplatingPlugin
{
    public function front(): string
    {
        return $this->getView()->render('my-module/plugin/my-plugin', $this->pluginConfig);
    }
}
```

## الثلاثي Core / Engine / Front

لا تُغيِّر الواجهة الخلفية القائمة على React الثلاثيَّ؛ بل تجلس فوقه:

- **MelisEngine** *(هذه الوحدة)* — يمتلك نموذج قاعدة بيانات نظام إدارة المحتوى بالكامل ويعرضه عبر بوابات الجداول
  + الخدمات + ذاكرة التخزين المؤقت؛ ويُعرِّف `MelisTemplatingPlugin`.
- **MelisFront** — يعرض الصفحات من بيانات المحرك (يُشغِّل إضافات المحتوى) ويُشغِّل
  المعاينة القابلة للتحرير المستخدمة داخل الواجهة الخلفية (القديمة *و* محرر الصفحات القائم على React / أدوات
  iframe).
- **MelisCms** — الواجهة الخلفية لنظام إدارة المحتوى؛ لا يمتلك **أي جداول** ويُحرِّر كل شيء عبر
  المحرك. أدوات نظام إدارة المحتوى في React الخاصة به (`MelisReactApiPage`، `MelisReactApiCmsSites`،
  `MelisReactApiCmsMenuManager`، …) هي مستهلكو React المذكورون أعلاه.

## الملفات الرئيسية

| المجال | المسار |
| --- | --- |
| أسماء الخدمات والبوابات البديلة، وذاكرات التخزين المؤقت | `vendor/melisplatform/melis-engine/config/module.config.php` |
| خدمة بيانات الصفحة | `vendor/melisplatform/melis-engine/src/Service/MelisPageService.php` |
| خدمة الشجرة / الروابط | `vendor/melisplatform/melis-engine/src/Service/MelisTreeService.php` |
| مُنظِّم ذاكرة التخزين المؤقت | `vendor/melisplatform/melis-engine/src/Service/` (`MelisEngineCacheSystem*`) |
| الفئة الأساسية لإضافات القوالب | `vendor/melisplatform/melis-engine/src/Controller/Plugin/MelisTemplatingPlugin.php` |
| بوابات الجداول | `vendor/melisplatform/melis-engine/src/Model/Tables/` |
| المخطط + ترحيلات الفروقات | `vendor/melisplatform/melis-engine/install/sql/` |

انظر أيضًا: [MelisFront](/ar/reference/modules/melis-front) · [MelisCms](/ar/reference/modules/melis-cms) · [MelisCore](/ar/reference/modules/melis-core)
