# البنية والمفاهيم

منصة Melis هي **تطبيق MVC مبني على Laminas (المنحدر من ZF2)**. فوق Laminas القياسي، تضيف
مجموعة من الاصطلاحات التي تشغّل الواجهة الخلفية (backoffice). إن فهم هذه المفاهيم الخمسة يكفي
لقراءة — وتوسعة — أي جزء تقريبًا من المنصة.

في **الإصدار السادس (v6)**، يبقى الإطار والوحدات دون تغيير: نفس وحدات Laminas، ونفس شجرة
الإعدادات، ونفس الخدمات والأحداث. ما تغيّر هو **واجهة الاستخدام الخاصة بالواجهة الخلفية**: يأتي v6
بواجهة خلفية جديدة مبنية على **React على المسار `/melis-react`** فوق ذلك الأساس الثابت (انظر §6). لا تزال المفاهيم
الخمسة أدناه تصف كيفية عمل كل شيء في العمق.

## 1. الوحدات (Modules)

كل شيء في Melis هو **وحدة (module)** (وحدة Laminas قياسية). قائمة وحدات الواجهة الخلفية
التي يحمّلها التطبيق موجودة في:

```
config/melis.module.load.php
```

```php
return [
  'MelisAssetManager',
  'MelisDbDeploy',
  'MelisCore',
  'MelisCms',
  'MelisFront',
  // … your own modules go here
];
```

عند الإقلاع (bootstrap)، يقوم `config/application.config.php` بتجميع قائمة الوحدات النهائية عبر
`MelisCore\MelisModuleManager` (الذي يدمج هذه الوحدات مع وحدات المكوّنات (component modules)
ووحدة الموقع المحدّدة بواسطة `MELIS_MODULE`).

تجمع كل وحدة متحكماتها (controllers) وخدماتها وواجهات العرض (views) وترجماتها **إضافةً إلى**
مجموعة من ملفات الإعداد الخاصة بـ Melis (انظر أدناه). وتقوم دالتها `Module::getConfig()` بدمجها معًا. في v6،
قد تشحن الوحدة **أيضًا** "لبنة (brick)" من React (واجهة React صغيرة) ونقاط النهاية `react-api` الخاصة بها —
وتبقى هذه مجرد إعدادات ومصدر إضافي داخل الوحدة نفسها (انظر §6).

## 2. شجرة الإعدادات و"مفاتيح melis"

إلى جانب `module.config.php` المعتاد، تنشر كل وحدة من وحدات الواجهة الخلفية **ملفات إعداد التطبيق**
التي تُدمج في شجرة واحدة قابلة للاستعلام تحت الجذر `plugins`:

| الملف                  | يعلن عن                                              |
| --------------------- | ---------------------------------------------------- |
| `app.interface.php`   | مناطق/أقسام الواجهة و**التحويلات (forwards)** الخاصة بها (انظر §3)    |
| `app.tools.php`       | الأدوات: جداول البيانات، الأعمدة، المرشّحات، أزرار الإجراءات |
| `app.toolstree.php`   | مكان ارتباط الأداة في **القائمة اليسرى**           |
| `app.forms.php`       | تعريفات النماذج                                     |

تستعلم عن هذه الشجرة من خلال خدمة **`MelisCoreConfig`**
(`vendor/melisplatform/melis-core/src/Service/MelisCoreConfigService.php`):

```php
$config = $sm->get('MelisCoreConfig');

// Fetch a node by path:
$node = $config->getItem('meliscore_leftmenu');

// Resolve all the "melis keys" → full config paths:
$keys = $config->getMelisKeys();
```

**مفتاح melis (melis key)** هو اسم مستعار ثابت وسهل الاستخدام لمسار إعداد متداخل بعمق، يُعلَن عنه على
عقدة عبر `'conf' => ['melisKey' => 'my_key']`. وهو يتيح للوحدات أن تشير إلى واجهة بعضها البعض دون
اقتران صارم بمسار محدّد. وهذا **melisKey** نفسه هو ما تستخدمه واجهة React الخلفية لتحديد الأداة —
سواء للتوجيه إليها أو للتحكم في الوصول إليها بناءً على الصلاحيات (انظر §6).

## 3. المناطق والتحويلات (Zones & forwards) — كيف تُعرض الواجهة الخلفية

واجهة الاستخدام الخاصة بالواجهة الخلفية **مدفوعة بالإعدادات**. الصفحة هي شجرة من **المناطق (zones)**؛ يمكن لكل
منطقة أن تعلن عن **تحويل (forward)** — ثلاثية `module / controller / action` تقوم بعرض تلك المنطقة:

```php
'forward' => [
  'module'     => 'MelisCms',
  'controller' => 'PageTree',
  'action'     => 'render-page-tree',
],
```

يتنقّل `MelisCore\Controller\PluginViewController` عبر شجرة الإعدادات، ويُرسل كل تحويل،
ويجمّع الـ HTML الناتج. لهذا السبب تُعلَن القائمة اليسرى والترويسات والأدوات كلها في الإعدادات بدلًا من
كتابتها بشكل ثابت — ولهذا فإن إضافة أداة هي في الأساس مسألة **إعلان الإعداد الصحيح**
وتوفير متحكم (controller) وواجهة عرض (view).

في v6، لا تزال آلية المناطق/التحويلات هذه هي مصدر الحقيقة، وهي تشغّل غلاف React (React shell)
بطريقتين: أي أداة كلاسيكية لا تملك شاشة React أصلية تُعرض بوصفها **منطقة مستقلة (standalone zone)**
وتُظهر داخل الغلاف عبر iframe، والقائمة اليسرى التي يعرضها الغلاف مبنية من نفس إعداد الواجهة،
مُرشَّحة بناءً على الصلاحيات (انظر §6).

## 4. الخدمات والمصانع (Services & factories)

تعتمد Melis على **مدير خدمات Laminas (service manager)**. تُسجَّل الخدمات في
`module.config.php` الخاص بكل وحدة (`service_manager` → `aliases` / `factories`) وتُحلّ بالاسم:

```php
$svc = $this->getServiceManager()->get('MelisCoreConfig');
```

تشمل خدمات النواة الشائعة `MelisCoreConfig` و`MelisCoreAuth` و`MelisCoreRights`
و`MelisCoreUser` و`MelisCoreTool`. عادةً ما ترث خدمات الأعمال من `MelisGeneralService`
(الذي يضيف إرسال الأحداث)؛ ويمر الوصول إلى قاعدة البيانات عبر أغلفة `TableGateway` من Laminas.
لا تغيّر شاشات React في v6 هذا الأمر: فاللبنة (brick) من React هي مجرد طبقة عرض — كل إجراء تقوم به
يستدعي مجددًا **نفس الخدمات الموجودة على الخادم** عبر نقاط النهاية `react-api` (انظر §6).

## 5. الأحداث (Events)

تربط الوحدات نفسها بدورة حياة الطلب في `Module::onBootstrap()` وعبر مستمعين على
**مدير الأحداث المشترك (shared event manager)**. يُوصَل سلوك النواة (المصادقة، فحوص الصلاحيات، رسائل flash،
التخزين المؤقت…) بهذه الطريقة، ويمكنك النشر/الاشتراك في أحداث Melis مخصصة — مثلًا،
`melis_core_auth_login_ok` يُطلَق بعد تسجيل دخول ناجح.

## 6. الواجهة الخلفية المبنية على React (v6)

يُبقي v6 على الإطار والوحدات لكنه **يستبدل واجهة الاستخدام الخاصة بالواجهة الخلفية** بتطبيق React أحادي
الصفحة (single-page app) يُقدَّم على المسار **`/melis-react`** (لا تزال واجهة `/melis` الكلاسيكية موجودة في الأسفل).
تكفي فكرتان لتصوّره:

- **اللبنات (Bricks)** — أداة أصلية مبنية على React. تشحن الوحدة ملف
  `public/ui-react/brick.manifest.json` وحزمة (bundle) مبنية؛ ويقوم الغلاف بـ**اكتشاف** لبنات كل وحدة
  نشطة وتركيبها. تظهر اللبنة **إذا وفقط إذا** كانت وحدتها مُفعَّلة — وهي نفس قاعدة النمطية (modularity)
  الموجودة في كل مكان.
- **مبدّل جديد/قديم (New / Old toggle)** — تحمل معظم الأدوات مفتاحًا في الزاوية العلوية اليمنى: **New** = شاشة
  React الأصلية، **Old** = الأداة الكلاسيكية المعروضة داخل iframe. وبذلك لا يُفقد شيء بينما تُعاد كتابة الوحدات
  تدريجيًا باستخدام React.

كل ما يعرضه الغلاف حول أدواتك — من أنت، و**القائمة اليسرى** (المُرشّحة مسبقًا بناءً على صلاحياتك)،
ومبدّل اللغة، وبلاطات **لوحة التحكم (dashboard)**، واكتشاف الأدوات — يُجمَّع عند الإقلاع من مجموعة صغيرة من
**نقاط نهاية JSON** العامة تحت `/melis/react-api/…`، ويعيد كل منها حمولة `{ success, data, error? }`.
كما تتوفر طبقة تراكب عائمة عامة لـ**مساعد الذكاء الاصطناعي (AI Assistant)** على كل شاشة.

![طبقة تراكب مساعد الذكاء الاصطناعي في React](/screenshots/react/melis-ai/melisai-footer-icon-generalassistant-deployed.png)
*مساعد الذكاء الاصطناعي العائم متاح من كل شاشة في الواجهة الخلفية المبنية على React.*

ثلاث وحدات تجعل هذا ممكنًا، وليست أيٌّ منها أداةً تنتقل إليها:

- **MelisReactApi** — العمود الفقري لواجهة برمجة تطبيقات JSON. لا يرسم أي واجهة؛ فهو يخدم مجموعة الإقلاع
  (`/me`، `/menu`، `/langs`، `/assets`، `/react-modules`) إضافةً إلى نقاط نهاية لوحة التحكم والصلاحيات،
  ويستضيف محرّك **القدرات (capability)** (انظر أدناه). أما نقاط نهاية البيانات *الخاصة* بأداة ما فتوجد في
  وحدة تلك الأداة، لا هنا.
- **MelisReactOverride** — السباكة التي (أ) تخدم غلاف React للمسار `/melis-react` وروابطه العميقة،
  و(ب) تعرض أي أداة كلاسيكية بوصفها صفحة مستقلة
  (`/melis/react-tool-page?key=<melisKey>`) بحيث يظل مبدّل **Old** وأي أداة لم يُعَد كتابتها بعد
  يعملان داخل الغلاف.
- كل **وحدة ميزة (feature module)** (مثل `MelisCms`) تشحن لبناتها (bricks) الخاصة، ومسارات `react-api`،
  والقدرات (capabilities).

**القدرات (Capabilities)** هي "الصلاحيات المتقدمة" الدقيقة في v6: *داخل* أداة مُصرَّح بها مسبقًا،
يمكن رفض إجراءات فردية (`list`، `create`، `edit`، `delete`، أو تبويب متداخل) لكل مستخدم/دور.
وهي **مسموحة افتراضيًا (default-allow)** و**تابعة (subordinate)** لفحص الوصول الكلاسيكي إلى الأداة
(`MelisCoreRights::canAccess`، دون تغيير) — فالأداة التي لا تحمل أي إعلان قدرات تحتفظ بكامل عمليات CRUD.
تعلن الوحدة عن القدرات الموجودة لأداتها ذات `melisKey` في
`config/react.capabilities.php`؛ وتتحكم متحكماتها في كل إجراء عبر `denyUnlessCan($cap)`.

> قاعدة عامة: إذا كان غلاف React يعرضه (القائمة، الترويسة، لوحة التحكم، قائمة الأدوات، مصفوفة الصلاحيات)
> لكنه ليس شاشة خاصة بأداة معيّنة، فهو آتٍ من نقطة نهاية في MelisReactApi. أما إذا كنت تنظر إلى أداة
> كلاسيكية بنمط Bootstrap داخل `/melis-react`، فأنت ترى MelisReactOverride
> يعرض تلك الأداة داخل iframe.

للاطّلاع على العقد الكامل والتفاصيل الداخلية، انظر مراجع الوحدات:
[MelisReactApi](/ar/reference/modules/melis-react-api) و
[MelisReactOverride](/ar/reference/modules/melis-react-override)؛ وللحصول على مثال عملي على وحدة
متعددة اللبنات، [MelisCms](/ar/reference/modules/melis-cms).

## إضافة: تغييرات قاعدة البيانات (dbdeploy وflyway)

تُدار تغييرات المخطط (schema) والبيانات الأولية (seed) بنظام إصدارات:

- **dbdeploy** (`MelisDbDeploy`): تشحن كل وحدة دلتاءات SQL مرقّمة؛ وتُتتبَّع الدلتاءات المطبَّقة في
  جدول `changelog` بحيث تُنفَّذ مرة واحدة. تُنشر دلتاءات الوحدات في `dbdeploy/`.
- **flyway** (`flyway/sql/`): عمليات ترحيل (migrations) على مستوى المشروع (مثل `V3__add_melisai_rights.sql`)،
  تُطبَّق باستخدام `flyway migrate`.

## أين تبحث في الشيفرة

| الشأن             | المسار |
| ------------------- | ---- |
| قائمة الوحدات         | `config/melis.module.load.php` |
| إقلاع التطبيق       | `config/application.config.php` |
| إعداد قاعدة بيانات المنصة  | `config/autoload/platforms/<MELIS_PLATFORM>.php` |
| خدمة الإعداد      | `vendor/melisplatform/melis-core/src/Service/MelisCoreConfigService.php` |
| عرض المناطق/التحويلات | `vendor/melisplatform/melis-core/src/Controller/PluginViewController.php` |
| مدير الوحدات      | `vendor/melisplatform/melis-core/src/MelisModuleManager.php` |
| غلاف React (SPA)   | `vendor/melisplatform/melis-core/public/ui-react/` |
| واجهة React API والقدرات | `vendor/melisplatform/melis-react-api/` |
| سباكة غلاف React وiframe | `vendor/melisplatform/melis-react-override/` |

التالي: اجمع كل ذلك معًا عبر [إنشاء أداتك الأولى](./create-a-tool).
