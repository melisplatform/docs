# MelisCacheInternal

> ذاكرة تخزين مؤقت (cache) لصفحات HTTP كاملة للواجهة الأمامية (front-office) الخاصة بنظام إدارة المحتوى، مع تخزين مؤقت جزئي (على مستوى المناطق) واستثناءات لكل صفحة.
> الحزمة `melisplatform/melis-cache-internal`.

## الغرض

يُعدّ `MelisCacheInternal` طبقة أداء تقع أمام مسار العرض (render pipeline) في MelisFront. فهو يخزّن محتوى HTML المعروض بالكامل (بصيغة استجابة HTTP مُسلسلة) لصفحة منشورة ويقدّمه في الزيارات اللاحقة، متجاوزًا عملية العرض بأكملها. يمكن إعداد المكوّنات الإضافية (plugins) الفردية على صفحة ما لتحديث نفسها بمدة صلاحية (TTL) أقصر (تخزين مؤقت جزئي/على مستوى المناطق) بينما تبقى بقية الصفحة مخزّنة. تُبطَل صلاحية الصفحات تلقائيًا عند النشر أو إلغاء النشر أو الحذف، ويُحفَظ سجل تدقيق (audit log) لعمليات مسح الذاكرة المؤقتة اليدوية لمدة ثلاثة أشهر. يختلف هذا الوحدة عن ذاكرة الكائنات العامة بصيغة مفتاح/قيمة (key/value) في MelisEngine — فهو تحديدًا ذاكرة تخزين مؤقت لصفحات HTTP كاملة.

## تفعيله

أضِف إلى `config/melis.module.load.php`:

```php
return [
    'MelisCacheInternal',
];
```

يتطلّب `melisplatform/melis-cms`. تأتي الوحدة مع عمليات ترحيل قاعدة البيانات (`dbdeploy: true`) التي يجب تطبيقها عند التثبيت الأول. في الواجهة الخلفية (back-office) للإصدار v6 تظهر الأداة فقط عند تفعيل الوحدة — إذ يكتشفها مضيف React عبر ملف `brick.manifest.json` الخاص بها (راجع [الواجهة الخلفية بـ React](#react-back-office)).

## الخدمات الرئيسية

مُسجَّلة ضمن `service_manager` في `config/module.config.php`. يمكن استدعاؤها عبر `$sm->get('<alias>')`.

| اسم الخدمة (alias) | الدور |
| --- | --- |
| `MelisCacheInternalService` | عمليات التخزين المؤقت للصفحة الكاملة: `getCacheConfig()`، `getPageCacheByPageIdAndType($pageId, $uri, $methodType)`، `getPageCacheByUrl()`، `saveItem()`، `deleteCacheByPageId()`، `deleteCacheByUrl()`، `deleteCacheByPageIdOrByUrl()`، `deleteAllCache()`، `getMelisCacheSize()`، `hasCache()`. يطلق أحداث `melis_cache_internal_*_start`/`_end`. |
| `PartialCachingService` | إدارة التخزين المؤقت الجزئي/على مستوى المناطق: `getLists()`، `savePartialCaching()`، `deletePartialCaching()`، `getPartialCachingByCode()`، `searchPartialCachingByCode()`، و`processedZoneCaching($uri, $response, $pageId, $type)` — محرّك تحديث المناطق الذي يعيد عرض المناطق منتهية الصلاحية فقط عند إصابة (hit) الذاكرة المؤقتة. |

تعيد الواجهة الخلفية بـ React استخدام هذه الخدمات والجداول نفسها، لذا فإن مسار React يعيد إنتاج السلوك القديم (legacy) بدقّة (الإعداد هو upsert فردي (singleton)، وتُستبدل الاستثناءات دفعةً واحدة، ويتعامل `deleteCacheByUrl` مع الرمز البديل `*`/REGEXP).

## آلية دورة الطلب

تُرفَق المستمِعات (listeners) حسب وضع العرض في `Module.php`:

| المستمِع (Listener) | الحدث (Event) | الدور |
| --- | --- | --- |
| `MelisCacheInternalPageGetCacheListener` | `MvcEvent::EVENT_DISPATCH` (الأولوية 10) | **التقديم** — عند إصابة الذاكرة المؤقتة (cache hit)، يُخرج الاستجابة المخزّنة ويوقف عملية العرض (يضيف الترويسة `Melis-Cache: Hit`). |
| `MelisCacheInternalPageSaveCacheListener` | `MvcEvent::EVENT_FINISH` (الأولوية -1001) | **التخزين** — بعد العرض، يحفظ استجابة 200 في الذاكرة المؤقتة. |
| `MelisCacheInternalViewResultListener` | `melisengine_melistemplating_view_result_plugin_end` | يُغلّف مخرجات كل مكوّن إضافي ببيانات وصفية للتخزين المؤقت الجزئي (`data-pcache-code`، `data-pcache-gendate`، اسم/معرّف/dbkey المكوّن). |
| `MelisCacheInternalCmsPageListener` | `meliscms_page_publish_end` / `…_unpublish_end` / `…_delete_end` | **إبطال** الذاكرة المؤقتة للصفحة وحفظ إعداد المكوّن الجزئي داخل الصفحة. |
| `MelisCacheInternalDeleteCacheListener` | `melis_cache_delete_cache` | الإبطال عند الطلب عبر `pageId` أو `pageUrl`. |
| `MelisCacheInternalSaveEditionSessionListener` | `meliscms_page_savesession_plugin_start` | تخزين إعداد التخزين المؤقت الجزئي لمكوّن ما في الجلسة (session) استعدادًا للنشر. |
| `MelisCacheInternalGetPluginParametersListener` | `melistemplating_plugin_update_parameters` | إدراج إعدادات التخزين المؤقت الجزئي في نموذج تحرير المكوّن في الواجهة الخلفية. |
| `MelisCacheInternalPartialCachingFormConfigListener` | `ModuleEvent::EVENT_LOAD_MODULES_POST` | إضافة تبويب نموذج التخزين المؤقت الجزئي إلى النافذة المنبثقة (modal) لكل مكوّن إضافي في الواجهة الأمامية. |
| `MelisCacheInternalFlashMessengerListener` | `meliscacheinternal_save_cache_end` | رسائل الإشعار السريع (flash-messenger) وتسجيل النشاط. |

**مفتاح الذاكرة المؤقتة** = `معرّف الصفحة + عنوان URL المُوحَّد (normalised) + طريقة الطلب` (1 = GET، 2 = POST). يعني عنوان URL المُوحَّد أن معاملات (parameters) عنوان URL المدرجة في `melis_cache_url_parameters` تُزال قبل توليد المفتاح، بحيث لا تؤدّي معاملات التتبّع مثل `utm_source` إلى تجزئة الذاكرة المؤقتة. القيمة المخزّنة (`mc_cache_content`) هي استجابة HTTP مُسلسلة (المحتوى + الترويسات)، وليست كتلة HTML خام. تتشارك جميع الأجهزة الاستجابة المخزّنة نفسها (يُفترض تصميم متجاوب responsive).

## التخزين المؤقت الجزئي (على مستوى المناطق)

يمكن لصفحة مخزّنة بالكامل أن تُبقي مكوّنات إضافية فردية محدّثة بمدة صلاحية (TTL) أقصر:

- يُغلّف `MelisCacheInternalViewResultListener` مخرجات كل مكوّن إضافي ببيانات وصفية `data-pcache-*` (رمز الذاكرة المؤقتة وتاريخ التوليد) وقت العرض.
- عند **إصابة** الذاكرة المؤقتة، يحلّل `PartialCachingService::processedZoneCaching()` تلك العلامات، ولكل منطقة انقضت مدة صلاحيتها، يعيد عرض تلك المنطقة فقط. النوع `PLUGIN` يعيد عرض مكوّن القوالب (templating plugin)؛ والنوع `MANUAL` يوجّه إلى `module/controller/action` مُعدّ.
- يحدّد **رمز التخزين المؤقت الجزئي** (`melis_cache_partial_codes`) نوع المنطقة، والرمز، ومدة الصلاحية (`mcpc_time`)، والهدف من نوع MANUAL.
- إعداد **المكوّن الرئيسي** (`melis_cache_partial_general_site_plugins`) هو أساس على مستوى الموقع بأكمله ينتشر إلى كل الصفحات؛ وصفوف `_exclusion` تستثني مكوّنًا من التخزين المؤقت على صفحة معيّنة.

## الواجهة الخلفية بـ React

في الإصدار v6 تأتي الأداة على هيئة **لَبِنة (brick) أصلية بالكامل بـ React** — أداة واحدة في القائمة اليسرى (**Melis Cache**) تكون شاشاتها **تبويبات داخل الأداة**، وليست تبويبات فرعية للمضيف. تجدها ضمن **Sidebar → MelisCms → Melis Cache** (`fa fa-bookmark`)، مثبَّتة على المسار `/melis-cms/cache-internal`. تحمل الترويسة العنوان الفرعي *"Platform cache management"*، وزر **تحديث (refresh)** يتبع التبويب النشط، وزر **حفظ (Save)** عام، ومفتاح تبديل **New / Old**: خيار *New* هو واجهة React (الافتراضي)؛ وخيار *Old* يعرض الأداة الكلاسيكية داخل إطار مضمَّن (iframe) دائم (`/melis/react-tool-page?key=MelisCacheInternal_tool`).

التبويبات الأربعة:

| التبويب | المحتوى |
| --- | --- |
| **Properties** | حجم الذاكرة المؤقتة الكامل في قاعدة البيانات، ومفتاح التبديل *Activate the cache system*، و*cache time in seconds* (مدة الصلاحية TTL)، ومربّعات اختيار نوع الطلب GET/POST، وشجرة استثناءات الصفحات (تبديل GET/POST لكل صفحة). يُحفَظ عبر زر **Save** في الترويسة العامة. |
| **Partial Caching** | قائمة CRUD لرموز التخزين المؤقت الجزئي مع بطاقات مؤشرات الأداء (KPI) (Total / Manual / Plugin)، وبحث، ومدير أعمدة، وتصدير (Export) و**+ Add**. الأعمدة: Id، Partial Caching Code، Type، Module، Controller، Action، Cache lifetime in seconds، Methods. |
| **URL Parameters** | قائمة CRUD لأسماء معاملات الاستعلام (query-parameter) التي تُتجاهل عند توليد مفتاح الذاكرة المؤقتة (مؤشر Total، وبحث، وتصدير، و**+ Add**). أضِف مثلًا `utm_source` بحيث تتشارك متغيّرات الرابط مدخلًا واحدًا في الذاكرة المؤقتة. |
| **Cache Clearing** | نموذج المسح حسب عنوان URL (عنوان URL يبدأ بـ `/`، و`*` كرمز بديل) بالإضافة إلى جدول تدقيق سجلات المسح (بطاقات KPI هي Total / Today / Users؛ والأعمدة Id، URL Cleared، Date، User؛ مع ترقيم صفحات بالإزاحة offset). يُحتفظ به لمدة 3 أشهر. |

![تبويب Properties — حجم الذاكرة المؤقتة الكامل في قاعدة البيانات، ومفتاح التبديل Activate the cache system، وcache time in seconds، ومربّعات اختيار نوع الطلب GET/POST وشجرة الاستثناءات لكل صفحة مع أزرار GET/POST](/screenshots/react/melis-cache-internal/meliscacheinternal-tool-cache-tab-properties.png)

![تبويب Partial Caching — بطاقات KPI (Total / Manual / Plugin)، وبحث، ومدير الأعمدة، وتصدير و+ Add فوق جدول الرموز (Id، Partial Caching Code، Type، Module، Controller، Action، Cache lifetime in seconds، Methods)](/screenshots/react/melis-cache-internal/meliscacheinternal-tool-cache-tab-partialcaching.png)

![تبويب URL Parameters — مؤشر Total، وبحث، وتصدير و+ Add فوق جدول معاملات الاستعلام المُتجاهَلة (Id، Parameter)، يُستخدم لمنع معاملات التتبّع من تجزئة الذاكرة المؤقتة](/screenshots/react/melis-cache-internal/meliscacheinternal-tool-cache-tab-urlparameters.png)

![تبويب Cache Clearing — نموذج المسح حسب عنوان URL (عنوان URL يبدأ بـ /، و* كرمز بديل) مع بطاقات KPI (Total / Today / Users) وجدول تدقيق سجلات المسح (Id، URL Cleared، Date، User) مع ترقيم الصفحات](/screenshots/react/melis-cache-internal/meliscacheinternal-tool-cache-tab-cacheclearing.png)

المهام الشائعة: تشغيل التخزين المؤقت / ضبط مدة الصلاحية ← *Properties → Activate → cache time → تحديد GET/POST → Save*؛ منع تخزين صفحة مؤقتًا ← *Properties → تحديد GET/POST لتلك الصفحة في الشجرة → Save*؛ إضافة قاعدة جزئية ← *Partial Caching → + Add*؛ تجاهل معامل تتبّع ← *URL Parameters → + Add*؛ مسح عنوان URL الآن ← *Cache Clearing → اكتب عنوان URL → Clear cache*.

## واجهة برمجة التطبيقات (API) بـ React

تتواصل واجهة React مع واجهة برمجة تطبيقات (API) بصيغة JSON تقدّمها **متحكّمات (controllers) هذه الوحدة نفسها** (المجال الفرعي `MelisCacheInternal\Controller\React`، المسجَّل في `config/module.config.php`) — **وليس** `melis-react-api`. المسار الأساسي `/melis/MelisCacheInternal/react-api`. كل إجراء يمتدّ من `MelisAbstractActionController`، ومفتاحه `MELIS_KEY = 'MelisCacheInternal_tool'`، ويحمي الوصول عبر `denyUnlessAccess()` + `denyUnlessCan()`، ويعيد `{ success, data, error }`.

| الطريقة والعنوان (نسبةً إلى المسار الأساسي) | الغرض |
| --- | --- |
| `GET /config` | الإعدادات + حجم الذاكرة المؤقتة + استثناءات الصفحات |
| `POST /config/save` | حفظ الإعدادات (upsert فردي) + الاستبدال الجماعي لاستثناءات الصفحات |
| `POST /config/empty-cache` | إفراغ الذاكرة المؤقتة بأكملها |
| `POST /config/clear-cache` | المسح حسب نمط عنوان URL (بدون تسجيل) |
| `GET /page-tree?nodeId=` | شجرة صفحات كسولة (lazy) للاستثناءات (`nodeId=-1` = الجذر) |
| `GET /partial-caching` · `/stats` · `/:id` | قائمة keyset · مؤشر KPI · رمز واحد |
| `POST /partial-caching/save` · `/delete/:id` | إنشاء / تحديث · حذف رمز |
| `GET /url-parameters` · `/stats` · `/:id` | قائمة keyset · مؤشر KPI · معامل واحد |
| `POST /url-parameters/save` · `/delete/:id` | إنشاء / تحديث · حذف |
| `GET /clearing-logs` · `/stats` | سجلات بترقيم بالإزاحة · مؤشر KPI (total / today / users) |
| `POST /clearing-logs/clear-cache` | المسح حسب عنوان URL **وتسجيله** |

```ts
const BASE = '/melis/MelisCacheInternal/react-api'
// save config + page exclusions (bulk replace)
await apiFetch<null>('/config/save', {
  method: 'POST',
  body: JSON.stringify({ active: true, time: 3600, requestType: ['GET'],
    pageExclusions: [{ pageId: 42, excludeGet: true, excludePost: false }] }),
})
// create a partial-caching code
await apiFetch<{ id: number }>('/partial-caching/save', {
  method: 'POST',
  body: JSON.stringify({ type: 'PLUGIN', code: 'NEWS_LATEST', time: 60,
    module: '', controller: '', action: '', requestGet: true, requestPost: false }),
})
```

يرسل كل طلب استجلاب (fetch) الترويسة `X-Requested-With: XMLHttpRequest`؛ وطلبات POST التي تحمل محتوى تضيف `Content-Type: application/json`. تعيد متحكّمات React استخدام خدمات وجداول Laminas الخاصة بالوحدة؛ ولا تزال المتحكّمات القديمة (legacy) تشغّل عرض *Old*.

## الصلاحيات (Capabilities)

تُعلَن الحقوق المتقدّمة في `config/react.capabilities.php` تحت العقدة الحاملة للحقوق `MelisCacheInternal_tool` (نفس `melisKey` الخاص بالملف manifest وإطار iframe لعرض *Old* وحارس الوصول). إنها شجرة لكل تبويب؛ يحوّلها `Capabilities::flatten()` إلى سلاسل نصية منقّطة يقرأها React عبر `useCaps('MelisCacheInternal_tool').can('…')`:

```
MelisCacheInternal_tool
├─ tab "config"   actions: edit                                  (Properties — save settings)
├─ tab "partial"  actions: list · create · edit · delete · export   (Partial Caching CRUD)
├─ tab "params"   actions: list · create · edit · delete · export   (URL Parameters CRUD)
└─ tab "logs"     actions: list · clear · export                 (Cache Clearing — logs + clear by URL)
```

تُرشَّح رؤية التبويبات عبر `can('config'|'partial'|'params'|'logs')`؛ وتُحكَم الإجراءات لكل ورقة (leaf) (مثل زر Save في config عبر `can('config.edit')`). كل إجراء على الخادم محمي مرتين — `denyUnlessAccess()` (المصادقة + `MelisCoreRights::canAccess`) ثم `denyUnlessCan('<leaf>')` — و`Capabilities` تسمح افتراضيًا لأي أداة/صلاحية غير مُعلَنة.

## جداول قاعدة البيانات

| الجدول | يحتوي على |
| --- | --- |
| `melis_cache` | مدخلات الذاكرة المؤقتة: `mc_page_id`، `mc_cache_url` (مُوحَّد)، `mc_cache_content` (استجابة مُسلسلة)، `mc_cache_date`، `mc_cache_method_type` (1 GET / 2 POST). |
| `melis_cache_config` | الإعداد العام: `mcc_active`، `mcc_time` (مدة الصلاحية بالثواني)، `mcc_request_type` (GET, POST). |
| `melis_cache_exclusions` | استثناءات لكل صفحة: `mce_page_id`، `mce_request_get`، `mce_request_post`. |
| `melis_cache_partial_codes` | قواعد مناطق التخزين المؤقت الجزئي: `mcpc_type` (MANUAL/PLUGIN)، `mcpc_code`، `mcpc_time` (مدة الصلاحية)، `mcpc_module/controller/action`. |
| `melis_cache_partial_general_site_plugins` | إعدادات المكوّن الرئيسي على مستوى الموقع: `mcpg_site_id`، `mcpg_page_id`، `mcpg_plugin_*`، `mcpg_cache_code`. |
| `melis_cache_partial_general_site_plugins_exclusion` | استثناءات المكوّنات من التخزين المؤقت لكل صفحة. |
| `melis_cache_url_parameters` | أسماء معاملات الاستعلام المُتجاهَلة (`mcup_name`). |
| `melis_cache_clearing_logs` | سجل التدقيق: `mccl_cache_url`، `mccl_user_id`، `mccl_clearing_date`. |

## مثال

حذف الذاكرة المؤقتة لصفحة معيّنة برمجيًا:

```php
// In a controller or service with the service manager available
$cacheSrv = $sm->get('MelisCacheInternalService');

// Invalidate by page ID
$cacheSrv->deleteCacheByPageId($pageId);

// Invalidate by URL
$cacheSrv->deleteCacheByUrl('/my-page');

// Check whether a cached entry exists
$hasCache = $cacheSrv->hasCache($pageId, $normalisedUrl, $methodType); // 1=GET, 2=POST
```

## الملفات الرئيسية

| الشأن | المسار |
| --- | --- |
| تهيئة الوحدة (ربط المستمِعات) | `vendor/melisplatform/melis-cache-internal/src/Module.php` |
| إعداد الوحدة (الخدمات، المتحكّمات، أسماء الجداول المستعارة، مسارات React) | `vendor/melisplatform/melis-cache-internal/config/module.config.php` |
| شجرة صلاحيات React | `vendor/melisplatform/melis-cache-internal/config/react.capabilities.php` |
| متحكّمات واجهة برمجة التطبيقات بـ React | `vendor/melisplatform/melis-cache-internal/src/Controller/React/` |
| مصدر/بناء لَبِنة React | `vendor/melisplatform/melis-cache-internal/ui-react/` → `public/ui-react/brick.js` + `brick.manifest.json` |
| خدمة التخزين المؤقت للصفحة الكاملة | `vendor/melisplatform/melis-cache-internal/src/Service/MelisCacheInternalService.php` |
| خدمة التخزين المؤقت الجزئي/على مستوى المناطق | `vendor/melisplatform/melis-cache-internal/src/Service/PartialCachingService.php` |
| مستمِع التقديم (إصابة الذاكرة المؤقتة) | `vendor/melisplatform/melis-cache-internal/src/Listener/MelisCacheInternalPageGetCacheListener.php` |
| مستمِع التخزين (حفظ الذاكرة المؤقتة) | `vendor/melisplatform/melis-cache-internal/src/Listener/MelisCacheInternalPageSaveCacheListener.php` |
| مستمِع إبطال صفحة نظام إدارة المحتوى | `vendor/melisplatform/melis-cache-internal/src/Listener/MelisCacheInternalCmsPageListener.php` |
| عمليات ترحيل قاعدة البيانات | `vendor/melisplatform/melis-cache-internal/install/dbdeploy/` |

## انظر أيضًا

- [melis-cms](/ar/reference/modules/melis-cms) — نظام إدارة المحتوى الذي تؤدّي أحداث النشر فيه إلى إبطال الذاكرة المؤقتة.
- [melis-front](/ar/reference/modules/melis-front) — مسار العرض الذي يغلّفه MelisCacheInternal.
- [melis-engine](/ar/reference/modules/melis-engine) — ذاكرة الكائنات العامة للمنصّة (مختلفة عن هذه الوحدة).
- [مرجع الوحدات](/ar/reference/modules) — جميع وحدات المنصّة.
