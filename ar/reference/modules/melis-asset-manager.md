# MelisAssetManager

> يقدّم الأصول العامة لكل وحدة (CSS وJS والصور) عبر روابط نظيفة، ويوصّل حزمة الواجهة الخلفية
> React المُصرّفة، وهو المصدر المرجعي لاكتشاف الوحدات النشطة. الحزمة
> `melisplatform/melis-asset-manager`.

## الغرض

يعترض MelisAssetManager الطلبات الموجّهة إلى `/<ModuleName>/…` وقت التحميل ويبثّ الملف المطابق
من مجلد `public/` الخاص بتلك الوحدة، دون أي منطق تحكّم في المسار الساخن. عند الإقلاع الأول
يكتب خريطة تربط بين الوحدة ومسارها في `config/melis.modules.path.php` (ما يتطلّب أن يكون مجلد `config/`
قابلاً للكتابة). كما يوفّر الخدمات على مستوى المنصّة للاستعلام عن الوحدات المثبّتة أو
النشطة، ولتصريف كل ملفات CSS/JS الخاصة بالوحدات إلى حزم إنتاج قديمة عبر
webpack.

يُعدّ جزءاً من **أساس منصّة MelisCore**، وتعتمد عليه فعلياً كل وحدة أخرى.

## الدور في الواجهة الخلفية React

لا تملك الوحدة **أي أداة React ولا واجهة مستخدم خاصة بها** — فلا يوجد لبنة (brick)، ولا ملف `config/react-api.php`
ولا `config/react.capabilities.php`، ولا تظهر أبداً كأداة في `/melis-react`. وأهميتها
في الإصدار v6 هي بنية تحتية بحتة: فهي طبقة التوصيل عبر HTTP التي تقدّم
**حزمة تطبيق الصفحة الواحدة (SPA) React المُصرّفة** إلى المتصفّح.

الواجهة الخلفية React هي تطبيق صفحة واحدة مبني على Vite، ويُودَع ناتج بنائه (JS، CSS، الخطوط، الأيقونات،
`index.html`) ضمن `melis-core/public/ui-react/`. تصل الطلبات الخاصة بتلك الملفات إلى
روابط تبدأ بـ **`/MelisCore/ui-react/`** — وهو تماماً قيمة `base` التي تُصرّف عليها بنية Vite —
وتُقدَّم عبر المحلّل العام نفسه `/<Module>/…` → `<module>/public/…` المستخدَم
مع أصول كل وحدة. والتقسيم هو:

| الطبقة | يقدّمها | الرابط |
| --- | --- | --- |
| قالب HTML الخاص بـ React | MelisReactOverride | `/melis-react` |
| حزمة JS/CSS المُهشّرة الخاصة بـ React | **MelisAssetManager** | `/MelisCore/ui-react/…` |

> إذا فشلت هذه الوحدة (أو ذاكرة التخزين المؤقت القابلة للكتابة الخاصة بها)، فقد يظل قالب HTML يُحمَّل لكن
> ملفات JS/CSS المُهشّرة تُعيد **404** أو **نوع MIME** خاطئاً، فيرفض المتصفّح تنفيذ السكربت —
> والعَرَض الكلاسيكي هو **صفحة `/melis-react` فارغة**. والسبب الجذري المعتاد هو أن مجلد `config/`
> (وملف `melis.modules.path.php` المولَّد داخله) غير قابل للكتابة من قِبل مستخدم الويب
> (مثل `www-data`). ويفرض تفعيل وحدة جديدة إعادة بناء تلك الذاكرة المؤقتة؛ وأي فشل في الصلاحيات
> هناك يُضعف تقديم الأصول. راجع [تفعيلها](#enable-it).

## تفعيلها

أضِف إلى `config/melis.module.load.php`:

```php
return [
    'MelisAssetManager',
];
```

الاعتمادية: `melisplatform/melis-core` (`^6.0`)، وPHP `^8.3 | ^8.5`. يجب أن يكون مجلد `config/`
قابلاً للكتابة كي تتمكّن الوحدة من حفظ `melis.modules.path.php` عند الإقلاع.

## آلية التقديم

لا يوجد **أي وحدة تحكّم** لمسار الأصول الشائع — فالتقديم هو محلّل يُنفَّذ وقت التحميل، مربوط في
`src/Module.php`:

- تستدعي **`onBootstrap()`** الدالة **`displayFile($sm)`** عند كل طلب.
- تحلّ **`displayFile()`** رابط الطلب (URI) إلى ملف: تجرّب أولاً مجلد public الرئيسي للمشروع
  (`$_SERVER['DOCUMENT_ROOT'] . $uri`)؛ وإلا فإنها تعامل أول مقطع من الرابط كاسم
  وحدة، وتبحث عنه في خريطة الذاكرة المؤقتة، وتبني `<modulePath>/public/<rest-of-URI>`.
- تضبط **`sendDocument()`** الترويسة `Content-Type` الصحيحة (عبر `getMimeType()` +
  `config/mime.config.php`)، وتضيف ترويسة تخزين مؤقت لمدة 24 ساعة للملفات الثابتة، ثم تطبع البايتات وتُنهي التنفيذ.
  ويشترط حارس (`isRequestAuthenticated()`) وجود جلسة صالحة قبل أي عملية `eval` لملف `.php` مُقدَّم؛
  أما الأصول الثابتة فتبقى عامة.
- تفرض **`checkFileInFolder()`** بقاء المسار المحلول داخل مجلد `public/` الخاص بالوحدة
  (حارس ضد اجتياز المسار).

لذا فإن طلباً لـ `/MelisCore/ui-react/assets/index-<hash>.js` يحلّ الوحدة `MelisCore`
ويبثّ `melis-core/public/ui-react/assets/index-<hash>.js` — دون أي شيفرة خاصة بـ React.

## ذاكرة مسار الوحدات المؤقتة

الخريطة `<ModuleName> → path` التي تستخدمها `displayFile()` هي ملف PHP مولَّد في
`config/melis.modules.path.php`. ويعيد بناءه مستمعُ تحميل الوحدات في `src/Module.php`:

- تربط **`init()`** الدالة **`onLoadModulesPost()`** بـ `ModuleEvent::EVENT_LOAD_MODULES_POST`.
- تكتب **`onLoadModulesPost()`** الملف عندما يكون مفقوداً أو عندما لا تكون وحدة مُفعّلة حديثاً
  موجودة فيه بعد، مستخدِمةً `MelisModulesService` لحساب مسار كل وحدة، ثم تضبط صلاحياته إلى `0777` عبر `chmod`.

الوحدة عدا ذلك **بلا حالة** — وهذا الملف المولَّد هو حالتها المحفوظة الوحيدة.

## الخدمات الأساسية

مُسجَّلة في `config/module.config.php` تحت `service_manager`.

| اسم الخدمة المستعار | الدور |
| --- | --- |
| `ModulesService` | اكتشاف الوحدات المثبّتة/النشطة والاستعلام عنها (`MelisModulesService`). |
| `MelisWebPackService` | بناء حزم webpack القديمة وحلّ قوائم أصول الوحدات. |
| `MelisConfig` | دمج وقراءة شجرة إعدادات تطبيق المنصّة (`MelisConfigService`). |

### `MelisModulesService`

الخدمة المرجعية للإجابة عن "ما الوحدات الموجودة / النشطة". تستخدمها أداة الوحدات،
ومتجر التطبيقات، وتحميل وحدات المواقع، والمثبِّت.

```php
$modules = $sm->get('ModulesService'); // MelisAssetManager\Service\MelisModulesService

$active   = $modules->getMelisActiveModules();        // modules currently enabled
$all      = $modules->getAllModules();                // every discoverable module
$vendor   = $modules->getVendorModules();             // modules under vendor/
$versions = $modules->getModulesAndVersions();        // module => version
$deps     = $modules->getChildDependencies($moduleName);
$sites    = $modules->getSitesModules();              // template/site modules
```

قائمة الدوال الكاملة: `getMelisActiveModules`، `getModulesAndVersions`، `getComposer`/`setComposer`،
`getUserModules`، `getSitesModules`، `getMelisModules`، `getAllModules`، `getVendorModules`،
`getChildDependencies`.

### `MelisWebPackService`

```php
$webpack = $sm->get('MelisWebPackService');

$assets  = $webpack->getAssets($moduleName);           // a module's declared assets
$merged  = $webpack->getMergedAssets();                // platform-wide merged set
$webpack->buildWebPack();                               // compile bundles
$file    = $webpack->getWebPackMixStaticFile($asset);  // resolve a hashed/mixed asset
```

قائمة الدوال الكاملة: `getAssets`، `getWebPackMixStaticFile`، `getMergedAssets`، `buildWebPack`،
`setCachedFile`، `getCachedFiles`.

يعلن مفتاح الإعداد `ressources.build` الخاص بكل وحدة (في ملف `app.interface.php` الخاص بالوحدة) عن
`bundle.css` / `bundle.js` اللذين تنتجهما هذه الخدمة وتقدّمهما. وتقود ذلك وحدة التحكّم `WebPackController`
(المساران `melis-backoffice/build-webpack` و`melis-backoffice/view-assets`).

> يبني خط أنابيب webpack هذا حزمة الواجهة الخلفية **القديمة** فقط — ولا علاقة له
> ببناء React. فتطبيق SPA الخاص بـ React يُصرَّف عبر **Vite** داخل `melis-core/ui-react/`
> (`npm run build`) ويُودَع في `melis-core/public/ui-react/`؛ وMelisAssetManager يقتصر على *تقديم*
> تلك الملفات المبنية مسبقاً، ولا يصرّفها.

### `MelisConfigService`

مساعد لدمج الإعدادات والترجمة يخدم احتياجات asset-manager الخاصة. الدوال الأساسية: `getItem`،
`getMelisKeys`، `getFormMergedAndOrdered`، `translateAppConfig`.

## روابط الأصول

يمكن الوصول إلى أصول أي وحدة عبر:

```
/<ModuleName>/css/<file>.css
/<ModuleName>/js/<file>.js
/<ModuleName>/images/<file>.jpg
/MelisCore/ui-react/assets/<file>          # the committed React bundle
```

تُربط هذه بمجلد `public/` الخاص بكل وحدة. والاحتياطي هو مجلد `public/` الرئيسي للمشروع.

## جداول قاعدة البيانات

لا يوجد. الوحدة بلا حالة — وحالتها المحفوظة الوحيدة هي الملف المولَّد
`config/melis.modules.path.php`.

## الملفات الأساسية

| المعنيّ | المسار |
| --- | --- |
| أسماء الخدمات المستعارة وربط تقديم الأصول | `vendor/melisplatform/melis-asset-manager/config/module.config.php` |
| خريطة الامتداد → MIME الخاصة بـ `sendDocument()` | `vendor/melisplatform/melis-asset-manager/config/mime.config.php` |
| تقديم الأصول + ذاكرة مسار الوحدات المؤقتة | `vendor/melisplatform/melis-asset-manager/src/Module.php` |
| خدمة اكتشاف الوحدات | `vendor/melisplatform/melis-asset-manager/src/Service/MelisModulesService.php` |
| خدمة webpack/الحزم (قديمة) | `vendor/melisplatform/melis-asset-manager/src/Service/MelisWebPackService.php` |
| قارئ إعدادات التطبيق | `vendor/melisplatform/melis-asset-manager/src/Service/MelisConfigService.php` |
| وحدات تحكّم الأصول/webpack | `vendor/melisplatform/melis-asset-manager/src/Controller/` |
| خريطة مسار الوحدات (مولَّدة) | `config/melis.modules.path.php` |
| بناء React المُودَع (يُقدَّم هنا ولا يُبنى) | `vendor/melisplatform/melis-core/public/ui-react/` |

اطّلع أيضاً على: [MelisCore](/ar/reference/modules/melis-core) · [MelisReactApi](/ar/reference/modules/melis-react-api) · [MelisDbDeploy](/ar/reference/modules/melis-dbdeploy) · [MelisComposerDeploy](/ar/reference/modules/melis-composerdeploy) · [MelisInstaller](/ar/reference/modules/melis-installer) · [مرجع الوحدات](/ar/reference/modules)
