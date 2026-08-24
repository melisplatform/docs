# مرجع الإعدادات

كل ما يمكنك إعداده في Melis، في مكان واحد: متغيرات البيئة، وملف المنصة، وعائلة إعدادات
`app.*.php`، ومفاتيح melis، والترجمات، والأصول، والذاكرات المؤقتة.

## متغيرات البيئة

يوجّه متغيّران كلَّ عملية تثبيت (يُضبطان في `docker-compose.yml`، أو عبر `SetEnv` في Apache):

| المتغيّر | الغرض |
| --- | --- |
| **`MELIS_PLATFORM`** | يحدّد إعداد المنصة `config/autoload/platforms/<MELIS_PLATFORM>.php` (اتصال قاعدة البيانات). مثل `local`، `dev1`. |
| **`MELIS_MODULE`** | **الوحدة الخاصة بالموقع** التي تُقدَّم كواجهة أمامية لهذا النطاق (مثل `MelisDemoCms`). |
| `MYSQL_HOSTNAME` / `MYSQL_DATABASE` / `MYSQL_USER` / `MYSQL_PASSWORD` | اتصال قاعدة البيانات، وعادةً ما يقرؤه ملف المنصة عبر `getenv()`. |

## ملف المنصة

يحتوي `config/autoload/platforms/<MELIS_PLATFORM>.php` على **اتصال قاعدة البيانات** (وبعض
إعدادات المضيف). ويُدمَج أخيرًا، لذا فهو يتجاوز القيم الافتراضية لكل بيئة:

```php
return [
    'db' => [
        'driver'   => 'Mysqli',
        'hostname' => getenv('MYSQL_HOSTNAME') ?: 'localhost',
        'database' => getenv('MYSQL_DATABASE'),
        'username' => getenv('MYSQL_USER'),
        'password' => getenv('MYSQL_PASSWORD'),
        'port'     => '3306',
        'charset'  => 'utf8mb4',
    ],
    'melis_platform'       => getenv('MELIS_PLATFORM'),
    'melis_http_host'      => 'localhost',
    'melis_request_scheme' => 'http',
];
```

يُختار الملف الذي يُحمَّل في `config/application.config.php` (`config_glob_paths`) بناءً على
`getenv('MELIS_PLATFORM')`.

## ملفات إعدادات المشروع

| الملف | الدور |
| --- | --- |
| `config/melis.module.load.php` | القائمة المرتّبة **لوحدات الواجهة الخلفية** المراد تحميلها. |
| `config/melis.modules.path.php` | خريطة مُولَّدة: اسم الوحدة ← مسار نظام الملفات (يبنيها `MelisAssetManager`). |
| `config/application.config.php` | نقطة دخول التطبيق: تجميع الوحدات، ومسارات glob، وأعلام الذاكرة المؤقتة. |
| `config/autoload/{global,local}.php` | إعداد التحميل التلقائي القياسي في Laminas. |
| `config/autoload/platforms/<env>.php` | إعداد قاعدة البيانات/المنصة لكل بيئة (أعلاه). |
| `config/development.config.php` | تجاوزات التطوير (يُنشأ بواسطة `laminas-development-mode enable`). |

## عائلة إعدادات `app.*.php`

تدمج كل وحدة من وحدات الواجهة الخلفية هذه الملفات الخاصة بـ Melis في `Module::getConfig()`. وكلها تبني
شجرة واحدة تحت جذر `plugins`، يمكن الاستعلام عنها عبر [`MelisCoreConfig`](/ar/guide/concepts#_2-the-config-tree-melis-keys):

| الملف | يُعلِن عن |
| --- | --- |
| `app.interface.php` | **مناطق** واجهة المستخدم و`forward` الخاص بها (module/controller/action). كل عقدة: `conf` (id، name، icon، `melisKey`، `rightsDisplay`)، و`forward`، و`interface` متداخلة. |
| `app.toolstree.php` | المكان الذي ترتبط فيه أداة ما في **القائمة اليسرى** (`*_toolstree_section`). |
| `app.tools.php` | **الأدوات**: جداول البيانات (الأعمدة، والمرشّحات، وأزرار الإجراءات)، والنماذج. |
| `app.forms.php` | تعريفات **النماذج** القابلة لإعادة الاستخدام (مواصفات نموذج Laminas + `input_filter`). |
| `app.emails.php` | إعدادات قوالب البريد الإلكتروني. |
| `app.microservice.php` | واجهات برمجية لأساليب خدمة قابلة للاستدعاء (نماذج الإدخال/الإخراج). |
| `excluded.routes.php` | المسارات التي تتجاوز فحص المصادقة. |

### الأعراف

- **مفاتيح الترجمة**: `tr_<module>_<section>_<item>` (مثل `tr_meliscore_tool_users`).
- **معرّفات الإعداد**: `id_<module>_<item>`.
- **مفاتيح Melis**: أسماء مستعارة قصيرة تُعلَن على هيئة `'conf' => ['melisKey' => '…']` ← تُحوَّل إلى مسارات
  إعداد كاملة بواسطة `MelisCoreConfig::getMelisKeys()`.
- **الجداول**: `melis_<area>_<entity>` (مثل `melis_core_user`، و`melis_cms_page_published`،
  و`melis_ecom_product`).
- **المسارات**: `<module-slug>/<name>` (مثل `melis-backoffice/login`).

## الترجمات

مصفوفات PHP لكل لغة تحت مجلد `language/` الخاص بكل وحدة:

```
language/en_EN.interface.php
language/fr_FR.interface.php   // 'tr_key' => 'Texte'
```

تُحمَّل بواسطة `Module::createTranslations()` للغة النشطة (الجلسة `melis-lang-locale`)، مع
`en_EN` كلغة احتياطية. تشمل الأنواع `interface`، و`forms`، و`install`، و`setup`.

## الأصول

يقدّم `MelisAssetManager` مجلد `public/` الخاص بكل وحدة عند `/<ModuleName>/…` ويولّد
`config/melis.modules.path.php`. تُدرِج **الوحدة الخاصة بالموقع** ملفات CSS/JS الخاصة بواجهتها الأمامية في
`config/assets.config.php`. تجميع Webpack متاح (أداة البناء / إجراء الواجهة الخلفية).

## الذاكرات المؤقتة

يُضبَط سلوك الذاكرة المؤقتة في `module.config.php` الخاص بـ `melis-core` (قسم `caches`) ويُستخدَم
عبر `MelisCoreCacheSystemService`. لكل ذاكرة مؤقتة عَلَم `active`، ومجلد `cache_dir` تحت `cache/`،
ومُدد صلاحية (TTL) لكل مفتاح. تُحكَم **الذاكرة المؤقتة لإعدادات** Laminas بواسطة `config_cache_enabled` في
`application.config.php` (معطّلة افتراضيًا في هذا الهيكل). راجع
[استكشاف الأخطاء وإصلاحها](/ar/guide/troubleshooting#cache) لمسح الذاكرات المؤقتة.

## إعداد واجهة React الخلفية

تعمل واجهة React الخلفية الإصدار v6 (`/melis-react`) على **إطار العمل نفسه وشجرة الإعداد
نفسها** التي تعمل عليها الواجهة الخلفية الكلاسيكية (`/melis`) — فكل ما سبق لا يزال ساريًا. تربطها معًا وحدتان
إضافيتان للبنية التحتية. وتُحمَّل كلتاهما عبر `config/application.config.php`
(`module_paths` / `modules`، وليس عبر التحميل التلقائي لـ composer)، وليس لأيٍّ منهما أي إعداد على مستوى المشروع
يحتاج إلى تحرير: فتفعيل واجهة React الخلفية هو مجرد تحميل هاتين الوحدتين.

| الوحدة | الدور |
| --- | --- |
| `MelisReactApi` | العمود الفقري لواجهة JSON البرمجية. يُعلِن عن نقاط النهاية العامة `/melis/react-api/…` (في `config/module.config.php` الخاص به) ويستضيف مُحلِّل القدرات. لا يرسم أي واجهة مستخدم. |
| `MelisReactOverride` | يقدّم غلاف React ويعرض الأدوات القديمة على هيئة إطارات iframe. يتجاوز وحدة تحكّم `PluginView` الخاصة بـ MelisCore ويُعلِن عن مسارات الغلاف/الأدوات. |

### تقديم الغلاف

يُقدَّم تطبيق React أحادي الصفحة (SPA) بواسطة `SpaController` الخاص بـ `MelisReactOverride` عند **`/melis-react`**
وكل رابط عميق تحته (مسار regex المسمّى `meliscore-melis-react-spa`، `priority => 1000`). ويُقرأ
ملف `index.html` الخاص بالغلاف من **melis-core** عند `public/ui-react/index.html`، ويُقدَّم عند
`/MelisCore/ui-react/` — لذا فإن بناء React يقيم مع `melis-core`، لا في هاتين الوحدتين.

ولأن تطبيق React يتولّى مصادقته الخاصة، يُلحِق `MelisReactOverride` بضعة
مسارات بـ `plugins.meliscore.datas.excluded_routes` الخاص بـ MelisCore (عامة، دون إعادة توجيه لتسجيل الدخول):
مسار الـ SPA نفسه، و`melis-backoffice/react-platform-bundle`، ونقطتا التمهيد للقراءة فقط
`melis-backoffice/melis-react-api/platformscheme-react-get` و
`melis-backoffice/melis-react-api/langs`.

### اكتشاف اللبنات / الوحدات

يكتشف الغلاف الأدوات عند التمهيد عبر **`GET /melis/react-api/react-modules`**، الذي يفحص
الوحدات **النشطة** بحثًا عن `public/ui-react/brick.manifest.json` (كائن مفرد أو
مصفوفة `bricks: [...]`) ويعيد تعريفات اللبنات إضافةً إلى عنوان URL لحُزمة مُدمَجة واحدة
(`GET /melis/react-api/bricks-bundle.js`). ومن ثمّ تظهر اللبنة **إذا وفقط إذا كانت
وحدتها نشطة** — تلك هي قاعدة النمذجة (المعيارية)؛ ولا يوجد سجلّ منفصل يجب صيانته.
والوحدة التي تشحن أداة React تقدّمها كلبنة تحت مجلد `public/ui-react/` الخاص بها.

### مفاتيح إعداد React لكل وحدة

قد تُعلِن وحدات الأدوات الفردية (لا هاتان الوحدتان للبنية التحتية) عن إعداد React،
مُدمَجًا في شجرة الإعداد عبر `Module::getConfig()` الخاص بها:

| الملف / المفتاح | يُعلِن عن |
| --- | --- |
| `config/react-api.php` | مسارات بيانات `/melis/react-api/…` الخاصة بوحدة أداة ما (مثل `users`، و`roles` الموجودة في MelisCore / MelisSmallBusiness — **لا** في MelisReactApi). |
| `config/react.capabilities.php` (`melisReactToolCapabilities`) | "الحقوق المتقدمة" الدقيقة (`list` / `create` / `edit` / `delete`، أو شجرة متداخلة `{ actions, tabs }`) الموجودة لكل `melisKey` أداة. الافتراضي هو **السماح**؛ وتُخزَّن حالات المنع في قسم مخصّص `<meliscore_tool_capabilities>` من XML حقوق المستخدم/الدور. |
| `melis_react_override.toolpage_extensions[]` | أسماء الخدمات التي تُنفِّذ `PluginViewToolPageExtensionInterface` — خصوصيات وحدة ما لكل أداة (تعديلات HTML/الأصول) للأدوات القديمة المعروضة في غلاف React. تتراكم المساهمات بصرف النظر عن ترتيب التحميل. |

ولا تُعلِن وحدتا البنية التحتية نفساهما عن **أيٍّ** من هذه المفاتيح: فـ `MelisReactApi` هو
المحرّك الذي *يقرأ* إعلانات القدرات الخاصة بالوحدات الأخرى، و`MelisReactOverride` لا يشحن أي
لبنة، ولا `react-api.php`، ولا `react.capabilities.php`.

## أين تبحث

| الموضوع | المسار |
| --- | --- |
| قائمة الوحدات | `config/melis.module.load.php` |
| قاعدة بيانات المنصة | `config/autoload/platforms/<MELIS_PLATFORM>.php` |
| خدمة الإعداد | `vendor/melisplatform/melis-core/src/Service/MelisCoreConfigService.php` |
| إعداد الذاكرة المؤقتة | `vendor/melisplatform/melis-core/config/module.config.php` (`caches`) |
| مدير الأصول | `vendor/melisplatform/melis-asset-manager/` |
| مسارات واجهة React البرمجية / مُحلِّل القدرات | `vendor/melisplatform/melis-react-api/` |
| غلاف React + إطار iframe للأدوات القديمة / مسار SPA | `vendor/melisplatform/melis-react-override/` |
| بناء غلاف React (`index.html`، اللبنات) | `vendor/melisplatform/melis-core/public/ui-react/` |
