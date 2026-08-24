# استكشاف الأخطاء وإصلاحها والتشغيل

دليل ميداني للمشكلات التي ستواجهها فعليًا، مع السبب والحل. عندما "لا يظهر شيء ما"، يكون الجواب في الغالب هو **الوحدات / الصلاحيات / ذاكرة التخزين المؤقت (cache)**.

في الإصدار v6 تكون واجهة الإدارة الخلفية هي **قشرة React على `/melis-react`**، لكن إطار العمل والوحدات والإعدادات الكامنة تحتها لم تتغير — لذا فإن معظم الحلول هنا لا تزال من جانب الخادم. وحيثما لا تتوفر أداة بصفحة React أصلية، تعرض القشرة الأداة الكلاسيكية داخل إطار مضمَّن (iframe)‏
(`/melis/react-tool-page?key=<melisKey>`)، وتحمل أدوات "brick" الأصلية في React مفتاح تبديل **New (React) /
Old (iframe)** يؤدي إلى الشاشة الكلاسيكية نفسها. معرفة الطبقة التي تنظر إليها غالبًا ما تكون الخطوة التشخيصية الأولى.

## فعِّل الأخطاء أولًا

بشكل افتراضي يلتزم Melis الصمت بشأن الأخطاء. فعِّل **وضع التطوير** لرؤيتها:

```bash
vendor/bin/laminas-development-mode enable     # status | enable | disable
```

يؤدي هذا إلى تحميل `config/development.config.php`، وتعطيل ذاكرة التخزين المؤقت للإعدادات/الوحدات، وضبط
`error_reporting(E_ALL)`. كما يتم إظهار تحذيرات PHP بواسطة
`MelisCorePhpWarningListener`. ويمكن إضافةً إلى ذلك التحكم في الإبلاغ عن الأخطاء/عرضها عبر إعدادات Melis
تحت `/meliscore/datas/errors`.

لاحظ أن نقاط نهاية React API تُجيب بصيغة JSON وليس HTML: فاستدعاء إقلاع فاشل يُرجع
`{ success: false, error: … }` (مثلًا `{ success:false, error:'Unauthenticated' }` مع HTTP 401)،
لذا اقرأ تبويب الشبكة (network tab)، وليس الصفحة فقط. أما الأداة القديمة داخل الإطار المضمَّن فلا تزال تُظهر أخطاءها
الأصلية (رسائل gritter المنبثقة، ونوافذ التحقق المنبثقة لكل حقل) تمامًا كما هو الحال تحت `/melis`.

::: warning صفحة فارغة، وHTTP 200، وبلا أي خطأ؟
يستخدم Melis تخزين الإخراج المؤقت (output buffering)؛ وقد يؤدي خطأ فادح أثناء الإقلاع/العرض إلى **صفحة 200 فارغة**. لرؤية
الاستثناء المبتلَع، أرفِق مؤقتًا مستمعًا (listener) بـ `MvcEvent::EVENT_DISPATCH_ERROR` /
`EVENT_RENDER_ERROR` في `public/index.php` (لُفّ `Application::init()` داخل try/catch واطبع معامِل
`exception`)، أو فعِّل وضع التطوير.
:::

## ذاكرة التخزين المؤقت (Cache)

ذاكرة التخزين المؤقت القديمة هي السبب الأول لـ "غيّرت الإعدادات لكن لم يتغير شيء". تقع ذاكرة التخزين المؤقت تحت `cache/`:

```
cache/meliscore_platform_cache-*   # backoffice zones / platform config
cache/meliscms_page-*              # rendered CMS pages
cache/config/                      # merged Laminas config (if enabled)
```

امسحها بحذف المجلدات المعنية، أو عبر واجهة برمجة التطبيقات (API)
`MelisCoreCacheSystemService::deleteCacheByPrefix('*', 'meliscore_platform_cache')`. كما يمسح Melis
ذاكرة التخزين المؤقت تلقائيًا عند إدارة الوحدات وتغيير الصلاحيات. وبعد تعديل
`config/melis.module.load.php` أو أي `app.*.php`، **امسح `cache/melis*` وأعد التحميل**.

من واجهة الإدارة الخلفية يمكنك مسح ذاكرة التخزين المؤقت من أداة **Cache** (تحمل شاشة React الخاصة بها التبويبات نفسها
الموجودة في الأداة الكلاسيكية). راجع [MelisCacheInternal](/ar/reference/modules/melis-cache-internal).

تمتلك قشرة React طبقة تخزين مؤقت خاصة بها ينبغي الانتباه إليها عندما تبدو الأمور قديمة:

- تُقدَّم **حزمة الـ bricks** المدمجة (`/melis/react-api/bricks-bundle.js?v=<sig>`)
  على أنها غير قابلة للتغيير (immutable) لمدة سنة؛ وتتغير توقيعة `?v=` الخاصة بها (الاسم + وقت التعديل + حجم كل brick) تلقائيًا
  عند تغيّر ملفات أحد الـ bricks، لذا يلتقط **التحديث القسري (hard refresh)** الحزمة الجديدة.
- تُقدَّم **قشرة SPA** (`index.html`) بـ `no-cache`، لكن أصول JS/CSS المُجزّأة (hashed) التي
  تشير إليها مبنية على محتوى مُجزّأ ومخزَّنة مؤقتًا — والعلاج مجددًا هو التحديث القسري.
- إذا حُمِّل إطار أداة مضمَّن بتنسيق معطوب أو بجدول بيانات (DataTable) فارغ بعد تغيير في **Modules**،
  فقد تكون حزم أصول المنصة تحت `etc/bundles/` قد مُسحت؛ وهي تُصلح نفسها ذاتيًا
  (يُعاد توليدها عند العرض التالي لصفحة الأداة)، لكن يمكنك فرض ذلك بإعادة تحميل الأداة.

## المزالق الشائعة

### وحدة لا تظهر
| السبب | الحل |
| --- | --- |
| ليست في قائمة التحميل | أضِفها إلى `config/melis.module.load.php`. |
| ذاكرة تخزين مؤقت قديمة | امسح `cache/melis*` وأعد التحميل. |
| المسار غير مُعيَّن | تأكد من وجودها في `config/melis.modules.path.php` المُولَّد (يُعاد توليده بواسطة `MelisAssetManager`). |

### الأداة موجودة لكنها ليست في القائمة اليسرى / "ليس لديك صلاحية الوصول إلى هذه الأداة"
قائمة React اليسرى (`GET /melis/react-api/menu`) هي شجرة تنقّل **مُرشَّحة بحسب الصلاحيات** — بنفس قائمة السماح
بصيغة XML في `melis_core_user.usr_rights` كما كان سابقًا، لكن تستهلكها القشرة فقط.

| السبب | الحل |
| --- | --- |
| المستخدم يفتقر إلى الصلاحيات | امنح `*_toolstree_section` الخاص بالأداة في **Users → Rights**، أو عبر ترحيل (راجع `flyway/sql/V3__add_melisai_rights.sql`). |
| صلاحيات مخزَّنة في الجلسة | تُحمَّل الصلاحيات عند تسجيل الدخول وتُحدَّث دوريًا بواسطة `MelisCoreCheckUserRightsListener` — **سجِّل خروجًا ثم دخولًا مجددًا** بعد تغييرها. |
| المستخدم غير نشط | يجب أن تكون قيمة `usr_status` هي `1`. |
| وحدة الـ brick غير نشطة | تظهر أداة React أصلية (brick) **إذا وفقط إذا** كانت وحدتها نشطة — تكتشف القشرة الـ bricks عبر `GET /melis/react-api/react-modules`. فعِّل الوحدة. |

> قيمة `usr_rights` **الفارغة** تعني وصولًا كاملًا (تُرجع `isAccessible()` القيمة true عند الفراغ) — لكن بالنسبة
> لمستخدم عادي لديه قائمة سماح صريحة، يكون أي قسم مفقود مخفيًا.

### زر/تبويب أداة ممنوع رغم أنني أستطيع فتح الأداة (HTTP 403)
يضيف الإصدار v6 **صلاحيات متقدمة** ("capabilities") *داخل* أداة مُصرَّح بها بالفعل — خانات الاختيار الدقيقة
List / Create / Edit / Delete / لكل تبويب في **Users → Rights**.

| السبب | الحل |
| --- | --- |
| قدرة (capability) مرفوضة | استدعى مُتحكِّم (controller) الأداة `denyUnlessCan(<cap>)` وقائمة XML الخاصة بصلاحياتك ترفض تلك القدرة. ألغِ رفضها في **Users → Rights** (مصفوفة الصلاحيات المتقدمة). |
| مخزَّنة في الجلسة | تصل القدرات في استدعاء الإقلاع `GET /melis/react-api/me` (`data.capabilities`) — **سجِّل خروجًا ثم دخولًا مجددًا** بعد تعديل الصلاحيات. |

> القدرات هي **مسموحة افتراضيًا (default-allow)**: تبقى أداة بلا أي تصريح، أو قدرة غير مرفوضة،
> قابلة للاستخدام بالكامل؛ و**المشرفون (admins) يتجاوزونها** تمامًا. تعيش حالات الرفض في قسم مخصَّص
> `<meliscore_tool_capabilities>` من XML الصلاحيات، لذا لا تؤثر على واجهة الإدارة الخلفية الكلاسيكية.

### أداة قديمة تُحمَّل فارغة / أزرارها لا تفعل شيئًا داخل قشرة React
عندما لا تتوفر لأداة صفحة React أصلية فإنها تُعرض في إطار مضمَّن عبر
`/melis/react-tool-page?key=<melisKey>`. وجود جدول بيانات فارغ أو زر معطَّل هناك يكون في الغالب
**موردًا مفقودًا للوحدة** (لم يُحقَن ملف `*.tool.js`/CSS الخاص بها).

| السبب | الحل |
| --- | --- |
| مورد الوحدة غير محمَّل | تحقن صفحة الأداة موارد `ressources` لكل وحدة؛ فأي تبويب/زر جديد يُضاف ويأتي بـ JS لا تعرفه الصفحة يحتاج إلى تسجيل جذر الإضافة (plugin root) الخاص به (أو خطاف `toolpage_extensions` — راجع [إنشاء أداة](/ar/guide/create-a-tool)). |
| قارِن مع `/melis` | افتح الأداة نفسها مباشرةً على `/melis` (أو عبر مفتاح **Old** الخاص بالأداة). إن كانت معطوبة هناك أيضًا، فالمشكلة في الأداة نفسها وليست في إطار React. |

### أخطاء اتصال قاعدة البيانات
| السبب | الحل |
| --- | --- |
| ملف المنصة مفقود | يجب أن يكون `config/autoload/platforms/<MELIS_PLATFORM>.php` موجودًا ومطابقًا لمتغير البيئة `MELIS_PLATFORM`. |
| بيانات اعتماد خاطئة | تحقق من متغيرات البيئة `MYSQL_*` التي يستهلكها ملف المنصة. |

### الأصول (CSS/JS) بحالة 404
| السبب | الحل |
| --- | --- |
| الوحدة غير مُعيَّنة | تحقق من `config/melis.modules.path.php`. |
| الحزم غير مبنية | أعِد بناء الأصول (بناء Webpack / `vendor/bin/phing`). |
| ورقة الأنماط تُجاب بصيغة HTML | كانت جلسة منتهية الصلاحية توجِّه طلب حزمة إلى صفحة تسجيل الدخول بصيغة HTML (يرفض المتصفح نوع MIME)؛ يقدِّم الإصدار v6 حزمة المنصة على `/melis/react-platform-bundle` بالنوع الصحيح ويُبقيها عامة — والتحديث القسري يزيل الرفض القديم. |

### الترجمات تُظهر مفتاح `tr_…` الخام
| السبب | الحل |
| --- | --- |
| اللغة (locale) غير مضبوطة | تأتي اللغة النشطة من الجلسة (`melis-lang-locale`)؛ ويكتبها مبدِّل اللغة في ترويسة React (`GET /melis/react-api/langs`). |
| الملف مفقود | أضِف `language/<locale>.interface.php`؛ و`en_EN` هو البديل الاحتياطي (fallback). |

## مخطط قاعدة البيانات (dbdeploy وflyway)

- تعمل **dbdeploy** ([MelisDbDeploy](/ar/reference/modules/melis-dbdeploy)) عند `composer update`
  (خطاف post-update) لتطبيق دلتا SQL المرقّمة لكل وحدة، والمُتتبَّعة في جدول `changelog`.
- تطبِّق **flyway** ([MelisFlyway](/ar/reference/modules/melis-flyway)) عمليات ترحيل المشروع في
  `flyway/sql/` (`flyway -configFiles=flyway/conf/flyway.conf migrate`).

## أدوات سطر الأوامر (CLI) والبناء

```bash
vendor/bin/laminas-development-mode {status|enable|disable}   # dev mode
flyway -configFiles=flyway/conf/flyway.conf {migrate|info|repair}   # DB migrations
vendor/bin/phing                                             # build assets/bundles
```

يُطلِق `composer update` خطافات Melis (نشر الوحدات + dbdeploy) عبر `post-update-cmd` في `composer.json`.

## أين تبحث

| الموضوع | المسار |
| --- | --- |
| قالب وضع التطوير | `config/development.config.php.dist` |
| واجهة برمجة تطبيقات الـ Cache | `vendor/melisplatform/melis-core/src/Service/MelisCoreCacheSystemService.php` |
| تحديث الصلاحيات | `vendor/melisplatform/melis-core/src/Listener/MelisCoreCheckUserRightsListener.php` |
| تحذيرات PHP | `vendor/melisplatform/melis-core/src/Listener/MelisCorePhpWarningListener.php` |
| تجميع الوحدات | `vendor/melisplatform/melis-core/src/MelisModuleManager.php` |
| React API (menu / me / capabilities) | `vendor/melisplatform/melis-react-api/src/Controller/MelisReactApiController.php` |
| قشرة React / صفحات الأدوات في الإطار المضمَّن | `vendor/melisplatform/melis-react-override/src/Controller/PluginViewController.php` |
| إعدادات Flyway | `flyway/conf/flyway.conf`، وعمليات الترحيل في `flyway/sql/` |
