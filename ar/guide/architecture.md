# تعمّق في البنية المعمارية

تتتبّع هذه الصفحة مسار طلب **من البداية إلى النهاية** وتُسمّي الأصناف والأحداث والخدمات الحقيقية
المُشارِكة فيه. وهي مكمّلة لصفحة [المفاهيم](./concepts): اقرأ تلك أولًا لاكتساب المصطلحات، ثم اقرأ هذه
لفهم *الآليات*. كما أنها الصفحة التي ينبغي قراءتها إذا كنت (أنت أو مساعد ذكاء اصطناعي) بحاجة إلى نموذج
ذهني كامل عن كيفية عمل Melis.

يحتفظ الإصدار **v6** من Melis بنفس إطار العمل والوحدات ودورة حياة الطلب الموجودة في v5 — التغيير طرأ على
**واجهة المكتب الخلفي**. لا تزال الأدوات الكلاسيكية المُصيَّرة على الخادم عند `/melis` موجودة، لكن التجربة
الافتراضية أصبحت الآن **تطبيق صفحة واحدة (SPA) بلغة React عند `/melis-react`** يُحمّل أدوات React الأصيلة
("bricks") ويرتدّ إلى الأدوات الكلاسيكية داخل iframe. تحافظ الأقسام أدناه على جميع الآليات دون تغيير
وتضيف غلاف React في موضعه المناسب.

## الإقلاع (Bootstrap)

يُحمّل `public/index.php` مُحمّل التحميل التلقائي الخاص بـ Composer، ويدمج
`config/application.config.php` مع `config/development.config.php` (عند وجوده)، ثم يُشغّل
تطبيق Laminas MVC.

يبني `config/application.config.php` قائمة الوحدات ديناميكيًا:

```php
'modules' => array_merge(
    MelisCore\MelisModuleManager::getModuleComponents(), // framework components first
    MelisCore\MelisModuleManager::getModules()           // then Melis modules
),
'module_listener_options' => [
    'module_paths'      => ['./module', './module/MelisSites'],
    'config_glob_paths' => [
        realpath(__DIR__) . '/autoload/{{,*.}global,{,*.}local}.php',
        realpath(__DIR__) . '/autoload/platforms/' . getenv('MELIS_PLATFORM') . '.php',
    ],
],
```

يجمّع `MelisCore\MelisModuleManager` (`vendor/melisplatform/melis-core/src/MelisModuleManager.php`)
ثلاثة أنواع من الوحدات بحسب الطلب:

- **المكوّنات (Components)** — تبعيات إطار العمل، مُعلَنة لكل وحدة في `config/module.load.php`.
- **الوحدات (Modules)** — وحدات المكتب الخلفي من `config/melis.module.load.php`.
- **وحدات الموقع (Site modules)** — لعنوان URL في المكتب الأمامي، الموقع المُختار بواسطة `MELIS_MODULE`
  (من `module/MelisSites/<name>` أو موقع من مزوّد مثل `MelisDemoCms`).

يضيف المكتب الخلفي بلغة React **وحدتَي بنية تحتية** إلى هذه القائمة —
[`melis-react-api`](/ar/reference/modules/melis-react-api) (العمود الفقري لواجهة JSON) و
[`melis-react-override`](/ar/reference/modules/melis-react-override) (مسار الـ SPA + آلية iframe
للأداة القديمة). تُحمَّل كلتاهما عبر `module_paths` في `application.config.php` (فهي ليست محمّلة تلقائيًا
عبر composer) وتسجّلان نفسيهما عبر `StandardAutoloader`.

أخيرًا، يحقن ملف المنصّة `config/autoload/platforms/<MELIS_PLATFORM>.php` **اتصال قاعدة البيانات**
وإعدادات المنصّة في الإعدادات المدمجة.

## دورة حياة طلب المكتب الخلفي

يوجد الآن **مدخلان** إلى المكتب الخلفي، وكلاهما مدفوع بتوجيه MelisCore والتحقق من الهوية:

- **`/melis-react…`** — غلاف React (الواجهة الافتراضية). يخدم مسار قائم على تعبير نمطي (regex) مستند
  HTML واحدًا؛ وكل شيء آخر عبارة عن JSON يُجلَب عبر `/melis/react-api/…` وأدوات تُصيَّر كـ bricks
  أو iframes (انظر أدناه).
- **`/melis…`** — المكتب الخلفي الكلاسيكي المُصيَّر على الخادم، لا يزال يعمل بكامل وظائفه ويُستخدَم
  هدفًا لـ iframe الخاص بالأدوات القديمة.

بالنسبة لعنوان URL من نوع **`/melis…`**، يقود MelisCore التدفق الكلاسيكي. تُربَط الخطّافات (hooks)
الرئيسية في `MelisCore\Module::onBootstrap()`:

1. **التوجيه (Routing)** — يتطابق مسار `melis-backoffice` (وأبناؤه: `login`، `authenticate`،
   `logout`، `zoneview`، `react-tool-page`، …).
2. **`MvcEvent::EVENT_ROUTE` ← التحقق من الهوية** — يُشغَّل `Module::checkIdentity()`. إذا لم يكن
   المسار المتطابق ضمن القائمة المستثناة (`login`، `authenticate`، `change-language`، الـ SPA بلغة React
   ونقاط إقلاعها…) ولم يكن المستخدم موثّقًا، فإنه **يُعيد التوجيه إلى `/melis/login`** (أو يُرجِع 404
   للطلبات غير GET).
3. **الجلسة واللغة** — تُهيّأ حاوية الجلسة `meliscore`؛ وتقود اللغة المحلية (`melis-lang-locale`)
   الدالة `Module::createTranslations()` التي تُحمّل
   `language/<locale>.{interface,forms,…}.php`.
4. **`EVENT_DISPATCH`** — يُضبَط المخطّط (layout) على `layout/layoutCore`، وتعمل المستمعات الأساسية:
   `MelisCoreCheckUserRightsListener` (يُعيد قراءة الصلاحيات دوريًا)، `MelisCoreFlashMessengerListener`،
   `MelisCorePhpWarningListener`، وغيرها.
5. **تصيير المناطق (Zone rendering)** — واجهة المكتب الخلفي عبارة عن شجرة من **المناطق (zones)**؛
   يحلّ `PluginViewController` قيمة `forward` لكل منطقة (module/controller/action) ويُصيّرها، مجمّعًا
   الـ HTML النهائي
   (انظر [المفاهيم ← المناطق والتحويلات](./concepts#_3-zones-forwards-how-the-backoffice-renders)).

```
GET /melis
  → route: melis-backoffice
  → EVENT_ROUTE: checkIdentity() → redirect to /melis/login if not logged in
  → EVENT_DISPATCH: layout = layout/layoutCore; rights/flash/warning listeners
  → PluginViewController renders zones (header, left menu, center, footer) via forwards
  → response
```

## دورة حياة المكتب الخلفي بلغة React

بالنسبة لعنوان URL من نوع **`/melis-react…`**، يُقسَّم التدفق بين تحميل غلاف يحدث مرة واحدة واستدعاءات
JSON لاحقة:

1. **مسار الـ SPA** — يخدم `MelisReactOverride\Controller\SpaController` غلاف React
   `index.html` (المبنيّ داخل `melis-core/public/ui-react/`) لـ `/melis-react` وكل رابط عميق
   تحته (`/melis-react/news/5`، …). المسار **عام (public)** — إذ يُشغّل تطبيق React **شاشة تسجيل
   الدخول الخاصة به** — ويتغلّب على المسار الشامل (catch-all) الخاص بـ MelisFront عبر مسار regex
   عالي الأولوية.
2. **جلبات الإقلاع (Boot fetches)** — يستدعي الغلاف نقاط النهاية العامة لـ
   [`melis-react-api`](/ar/reference/modules/melis-react-api):
   `GET /me` (المستخدم الحالي + قدراته)، `GET /menu` (شجرة التنقّل المُرشَّحة بالصلاحيات)،
   `GET /langs` (لغات المكتب الخلفي)، `GET /assets` (CSS/JS لأدوات iframe)، و
   `GET /react-modules` + `/bricks-bundle.js` (اكتشاف الـ bricks). كل استجابة تلتزم بعقد
   `{ success, data, error? }`.
3. **تصيير الأداة** — يؤدّي النقر على مدخل قائمة إلى فتح **brick** (أداة React أصيلة) إذا كانت وحدته
   تشحن واحدة، وإلا فتح **أداة قديمة داخل iframe** يخدمها
   `/melis/react-tool-page?key=<melisKey>` (انظر [الـ Bricks وآلية iframe](#bricks-the-iframe-mechanism)).
4. **طبقة مساعد الذكاء الاصطناعي (AI Assistant overlay)** — زرّ دردشة عائم يُصيَّر مرة واحدة عند جذر
   الغلاف (من [`melis-ai`](/ar/reference/modules/melis-ai)) يبقى عبر التنقّل ويمكنه قيادة المكتب الخلفي
   (فتح أداة، فتح صفحة) انطلاقًا من المحادثة. انظر [دليل الذكاء الاصطناعي](./ai).

```
GET /melis-react
  → SpaController serves ui-react/index.html (public route)
  → shell boot: GET /me, /menu, /langs, /assets, /react-modules (+ /bricks-bundle.js)
  → click a tool → React brick, or iframe → /melis/react-tool-page?key=<melisKey>
  → AI Assistant overlay mounted at the shell root
```

## الـ Bricks وآلية iframe

غلاف React **معياريّ (modular)**: تظهر الأداة **إذا وفقط إذا** كانت وحدتها مُفعّلة.

- **اكتشاف الـ Bricks** — يفحص `GET /melis/react-api/react-modules` الوحدات المُفعّلة بحثًا عن
  `public/ui-react/brick.manifest.json` ويُرجِع تعريفاتها `BrickDef` (`{ id, module, route, label,
  forwardKey, melisKey, subTabs, … }`) إضافةً إلى ملف `/bricks-bundle.js` واحد مُدمَج. كل brick هو
  دالة IIFE تسجّل نفسها على `window.__MELIS_BRICK_COMPONENTS__`؛ وتوقيع `?v=<sig>` يجعل الحزمة قابلة
  للتخزين المؤقت بأمان لمدة عام.
- **مبدّل الجديد/القديم (New / Old toggle)** — تحمل معظم الـ bricks مبدّلًا **جديد (React) / قديم
  (iframe)**. *الجديد* هو شاشة React الأصيلة؛ و*القديم* يُحمّل الأداة الكلاسيكية عبر آلية iframe أدناه،
  بحيث لا يُفقَد شيء أبدًا أثناء الترحيل.
- **iframe القديمة** — تُصيّر الدالة `PluginViewController::toolPageAction()` في
  [`melis-react-override`](/ar/reference/modules/melis-react-override) منطقة واحدة بالضبط (تُحلّ من
  `?key=<melisKey>`) بوصفها **صفحة HTML مستقلّة** وتُعيدها مع `X-Frame-Options: SAMEORIGIN`. وتفرض
  `X-Requested-With: XMLHttpRequest` بحيث تُصيَّر المناطق التي لها `follow_regular_rendering:false`
  بطريقة AJAX، وتثبّت معرّف جلسة PHP عبر التصيير، وتحقن ملفات JS/CSS `ressources` الخاصة بوحدة الأداة
  (يحمل `bundle.js` الأساسي أدوات MelisCore فقط)، وتتحايل على قائمة طويلة من غرائب النظام القديم بحيث
  تبدو الأداة داخل الإطار وتتصرّف تمامًا كما لو كان الوصول مباشرًا عبر `/melis`
  (بجداول DataTables الخاصة بها والنوافذ المنبثقة وتنبيهات gritter والتحقق لكل حقل).

يخدم الغلاف أصول المنصّة لتلك الـ iframes عبر
`MelisReactOverride\Service\PlatformAssetsService::build()` — نفس CSS/JS الذي يُحمّله
`layoutCore.phtml` الكلاسيكي — بحيث تُقلِع أداة قديمة بطريقة مطابقة داخل غلاف React.

## المصادقة والصلاحيات

تُدار **عملية تسجيل الدخول (Login)** بواسطة `MelisCoreAuth` (`MelisCoreAuthService`)، وهي خدمة مصادقة
من Laminas تعمل فوق جدول `melis_core_user` (`usr_login` / `usr_password`، تشفير bcrypt عبر
`password_hash`). تُخزَّن الهوية الموثّقة — بما فيها `usr_rights` للمستخدم — في الجلسة. يقود غلاف React
**نفس** المصادقة (يُصيّر شاشة تسجيل الدخول الخاصة به لكنه يُرسل إلى نفس الخدمة)؛ ويُرجِع `GET /me` الهوية
بمجرد المصادقة، ونقطتا `GET /langs` وقراءة هوية لوحة تسجيل الدخول هما نقطتا النهاية العامتان الوحيدتان
قبل تسجيل الدخول.

تُبوِّب **الصلاحيات (Rights)** المكتب الخلفي. يقرأ `MelisCoreRights` (`MelisCoreRightsService`) قيمة
`usr_rights` للمستخدم — وهي **قائمة سماح (allow-list) بصيغة XML** — ليقرّر ما هو مرئيّ وقابل للإرسال:

- **أقسام القائمة اليسرى** التي يراها المستخدم هي عُقَد `*_toolstree_section` المُدرَجة في صلاحياته
  (`isAccessible()`)؛ و**XML صلاحيات فارغ يعني وصولًا كاملًا**. في غلاف React يحدث نفس الترشيح على
  جانب الخادم في `GET /menu`، الذي يُصدِر فقط العُقَد التي يجوز للمستخدم الوصول إليها (`canAccess`).
- الأداة التي يفتقر المستخدم إلى صلاحياتها تُنتِج *"You don't have access to this tool"*.
- تُقيم الصلاحيات على `melis_core_user.usr_rights`؛ وبالنسبة للمستخدمين المستندين إلى أدوار يمكن أن
  تأتي من الدور (`melis_core_user_role`). يُحدّث `MelisCoreCheckUserRightsListener` هذه الصلاحيات
  دوريًا ويُسجّل خروج المستخدم إذا أصبحت قيمة `usr_status` غير نشطة.

**الصلاحيات المتقدّمة (القدرات).** يضيف المكتب الخلفي بلغة React طبقة أدقّ *تابعة لـ* التحقق من الوصول
إلى الأداة: **قدرات (capabilities)** لكل أداة (`list` / `create` / `edit` / `delete`، أو تبويبات
متداخلة). تُعلِن الوحدات عن القدرات الموجودة عبر `config/react.capabilities.php`؛ والمُحلّل
`MelisReactApi\Service\Capabilities` هو **السماح افتراضيًا (default-allow)** — لا تُرفَض قدرة إلا إذا
كانت مُعلَنة وموجودة معًا في قسم مخصّص `<meliscore_tool_capabilities>` من XML الصلاحيات.
تُبوِّب متحكّمات الأدوات إجراءاتها عبر `CapabilityGuardTrait::denyUnlessCan($cap)` (يتجاوزها المسؤولون
admins)، وتصل خريطة السماح نفسها إلى جانب العميل في `GET /me` لإخفاء عناصر الواجهة. يقع هذا في
[`melis-react-api`](/ar/reference/modules/melis-react-api)؛ وتُحرَّر قائمة المنع (deny-list) في
**Users → Rights**.

::: tip منح الوصول إلى أداة جديدة
بعد إضافة أداة، امنح الوصول عبر **Users → Rights** في المكتب الخلفي بلغة React (مصفوفة صلاحياتها
المتقدّمة تُغذَّى بواسطة `GET /rights/capabilities`)، أو احقن القسم في XML الصلاحيات عبر عملية ترحيل
(migration) — انظر `flyway/sql/V3__add_melisai_rights.sql`.
:::

## دورة حياة طلب المكتب الأمامي

بالنسبة لعنوان URL عام، يُصيّر **MelisFront** + **MelisEngine** صفحة CMS (دون تغيير في v6):

1. **التوجيه (Routing)** — يتطابق `melis-front` مع `…/id/{idpage}`. تُحلّ عناوين URL الصديقة لمحركات
   البحث (`/about-us`) إلى معرّف صفحة بواسطة `MelisFrontSEORouteListener` (يستعلم جدول SEO الخاص
   بالصفحات ويسجّل مسارًا ديناميكيًا وقت تحميل الوحدة).
2. **الإرسال (Dispatch)** — تختار المستمعات الأمامية المخطّط الأمامي وتستشير التخزين المؤقت للصفحة.
3. **تحميل الصفحة** — يُرجِع `MelisEngine\Service\MelisPageService::getDatasPage($idPage, $type)`
   كائن `MelisPage` (بيانات شجرة الصفحة + القالب)، مُخزَّنًا مؤقتًا تحت `getDatasPage_{id}_{type}`.
4. **تصيير القالب** — يُصيّر متحكّم/إجراء `ZF2` الخاص بالقالب ملف `.phtml` الخاص بوحدة الموقع؛ وتُملأ
   مناطق `MelisTag` وإضافات `MelisDragDropZone` من المحتوى **المنشور**.

```
GET /about-us
  → MelisFrontSEORouteListener maps /about-us → idpage=5
  → MelisFront\Controller\Index::index(idpage=5)
  → MelisPageService::getDatasPage(5, 'published')  (cached)
  → template ZF2 controller/action → site .phtml → MelisTag / MelisDragDropZone
  → response
```

> يتغلّب مسار regex عالي الأولوية `/melis-react` عمدًا على هذا المسار الشامل (catch-all)، بحيث يُحلّ
> إعادة تحميل صفحة كاملة على رابط عميق لـ React إلى الـ SPA بدلًا من "404 page not found".

## التخزين المؤقت (Caching)

يخزّن Melis مؤقتًا بشكل مكثّف عبر عمليات تخزين مؤقت على نظام الملفات تحت `cache/`:

| التخزين المؤقت | ما يحتويه |
| --- | --- |
| `meliscore_platform_cache-*` | مناطق المكتب الخلفي المُصيَّرة / إعدادات المنصّة |
| `meliscms_page-*`، `melisfront_pages_file_cache-*` | صفحات CMS المُصيَّرة |
| `cache/config/` | إعدادات Laminas المدمجة (فقط إذا كان `config_cache_enabled`) |
| `datasource-*`، `melistoolcreator-*` | عمليات تخزين مؤقت خاصة بالوحدات |

`MelisCoreCacheSystemService` هو واجهة برمجة التخزين المؤقت (`getCacheByKey`/`setCacheByKey`/
`deleteCacheByPrefix`). تُبطَل عمليات التخزين المؤقت عند الأحداث الرئيسية (تغييرات الوحدات، نشر الصفحة،
تحديثات الصلاحيات) ويمكن مسحها يدويًا بحذف مجلدات `cache/*` المعنية — انظر
[استكشاف الأخطاء وإصلاحها](./troubleshooting). تضيف طبقة React عمليات تخزين مؤقت رخيصة خاصة بها: تُخدَم
حزمة الاكتشاف بصفتها غير قابلة للتغيير (immutable) بتوقيع محتوى، ويحفظ `PlatformAssetsService` ذاكرة
CSS/JS المدمجة للوحدات (مُعيدًا توليد `etc/bundles/` إذا مسحتها أداة الوحدات).

## الأحداث (Events)

Melis مدفوع بالأحداث بشكل كبير. تربط الوحدات المستمعات في `Module::onBootstrap()` (وعبر مدير الأحداث
المشترَك) بدورة حياة MVC (`EVENT_ROUTE`، `EVENT_DISPATCH`، `EVENT_RENDER`،
`EVENT_FINISH`) وبـ **أحداث نطاق Melis** (مثل `melis_core_auth_login_ok`، أحداث حفظ الصفحة).
تُوسّع خدمات النطاق الصنف `MelisGeneralService`، الذي يضيف `sendEvent()` بحيث يمكن لأي خدمة أن تنشر
أحداثًا تشترك فيها وحدات أخرى. هذه هي آلية التوسيع الأساسية المفكوكة الارتباط — فضّل مستمعًا على تعديل
وحدة أخرى.

تتّبع طبقة React الفلسفة نفسها "راكِم، لا تتجاوز": فبدلًا من ترميز غرائب كل أداة بشكل صلب، يكشف
`melis-react-override` خطّاف `toolpage_extensions` الذي يمكن لأي وحدة تنفيذه لتعديل HTML أداة قديمة
أو أصولها داخل الإطار (يستخدمه مثلًا
[`melis-ai-community-extensions`](/ar/reference/modules/melis-ai-community-extensions)).

## الطلب، في صورة واحدة

```
public/index.php
  → application.config.php  (MelisModuleManager assembles modules + platform DB config)
  → Laminas MVC run
     ├── /melis-react → SpaController serves the React shell (public)
     │                    → boot JSON: /me /menu /langs /assets /react-modules
     │                    → brick, or iframe → /melis/react-tool-page?key=<melisKey>
     ├── /melis…      → auth (checkIdentity) → rights → PluginViewController zones (forwards)
     └── public URL   → MelisFront route (id/SEO) → MelisEngine page load → site template
  → caching at every expensive step (MelisCoreCacheSystemService)
  → response
```

## الملفات الرئيسية

| الشأن | المسار |
| --- | --- |
| إعدادات التطبيق / الإقلاع | `config/application.config.php` |
| تجميع الوحدات | `vendor/melisplatform/melis-core/src/MelisModuleManager.php` |
| إقلاع / مستمعات النواة | `vendor/melisplatform/melis-core/src/Module.php` |
| المصادقة | `vendor/melisplatform/melis-core/src/Service/MelisCoreAuthService.php` |
| الصلاحيات | `vendor/melisplatform/melis-core/src/Service/MelisCoreRightsService.php` |
| شجرة الإعدادات | `vendor/melisplatform/melis-core/src/Service/MelisCoreConfigService.php` |
| تصيير المناطق | `vendor/melisplatform/melis-core/src/Controller/PluginViewController.php` |
| واجهة برمجة التخزين المؤقت | `vendor/melisplatform/melis-core/src/Service/MelisCoreCacheSystemService.php` |
| توجيه المكتب الأمامي / SEO | `vendor/melisplatform/melis-front/src/Listener/MelisFrontSEORouteListener.php` |
| خدمة الصفحة | `vendor/melisplatform/melis-engine/src/Service/MelisPageService.php` |
| واجهة JSON لـ React | `vendor/melisplatform/melis-react-api/src/Controller/MelisReactApiController.php` |
| مُحلّل القدرات | `vendor/melisplatform/melis-react-api/src/Service/Capabilities.php` |
| الـ SPA + iframe القديمة | `vendor/melisplatform/melis-react-override/src/Controller/` |
| غلاف React (مصدر الـ SPA) | `vendor/melisplatform/melis-core/ui-react/` |
