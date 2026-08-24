# MelisDemoCms

> موقع المرجع/العرض التوضيحي الرسمي لمنصة Melis Platform — وحدة **موقع (site module)** جاهزة للتثبيت
> تُعلّم المطورين كيفية تركيب موقع واجهة أمامية (front-office) في Melis. الحزمة `melisplatform/melis-demo-cms`.

## الغرض

إن `MelisDemoCms` هو موقع واجهة أمامية (front-office) كامل وقابل للتثبيت (`melis-site: true`،
`type: melisplatform-module`، الفئة `cms`). وهو **ليس أداة إدارة خلفية (back-office)**: فصفحاته
ووحدات التحكم (controllers) وقوالب المكوّنات الإضافية (plugins) تُوضّح تقنيات تركيب المحتوى الثلاث — **الوضع اليدوي
للمكوّنات الإضافية**، **مناطق السحب والإفلات (drag-and-drop)** و**الوسوم القابلة للتحرير المُضمّنة (inline editable tags)** — باستخدام MelisFront
وMelisEngine ووحدات محتوى CMS (slider وnews وprospects). استخدمه بوصفه التنفيذ المرجعي
عند [بناء موقع](/ar/guide/build-a-site).

![الصفحة الرئيسية الحيّة للواجهة الأمامية في MelisDemoCms — شريط التنقل العلوي (News / Team / Our Services / Our Process / FAQ / Contact)، وقسم البطل (hero) "Melis Demo Cms" مع دعوة لاتخاذ إجراء "Try to Free" فوق رسم بطل يمثّل لوحة تحكم. هذا هو موقع العرض التوضيحي المُصيَّر على الخادم (server-rendered)، وليس شاشة إدارة خلفية بـ React.](/screenshots/react/melis-demo-cms/melisdemocms-site.png)

## لا توجد له إدارة خلفية بـ React

قدّمت Melis v6 إدارة خلفية بـ React، لكن `MelisDemoCms` هو **موقع واجهة أمامية (front-office)**، وليس أداة
إدارة خلفية، ولذلك فهو **غير مُرحَّل إلى React** عن قصد:

- لا يوجد مشروع لبنة `ui-react/`، ولا `public/ui-react/brick.manifest.json`؛
- لا توجد نقاط نهاية `config/react-api.php` ولا قدرات `config/react.capabilities.php`؛
- لا يوجد مدخل في الشريط الجانبي ولا عقدة قائمة في `/melis-react`.

لن تبحث أبدًا عن أداة "MelisDemoCms" في واجهة React. فموقع العرض التوضيحي هو **محتوى تعمل عليه
أدوات CMS العامة في React**، والموقع الحيّ **مُصيَّر على الخادم (server-rendered)** بواسطة
MelisFront/MelisEngine كلما تصفّح زائرٌ النطاق.

### كيف تعمل عليه في `/melis-react`

بما أن الوحدة لا تملك أداة خاصة بها، فإنك تحرّرها باستخدام أدوات CMS العامة في React:

| أداة React | ما تفعله بها هنا |
| --- | --- |
| **CMS page editor** | افتح أي صفحة عرض توضيحي (Home، News، Team، FAQ، Contact…) من شجرة **CMS Pages** وحرّر كتلها المُضمّنة ومناطق السحب والإفلات ومكوّناتها الإضافية. سطح التحرير الأساسي. |
| **Media** | إدارة الصور/الملفات التي تشير إليها الصفحات. |
| **Sites** | إعدادات النطاق/اللغة الخاصة بموقع العرض التوضيحي. |
| **Templates** | قوالب الصفحات التي تستخدمها صفحات CMS. |

> **أين:** الشريط الجانبي ← **CMS Pages** ← افتح صفحة من موقع العرض التوضيحي في المحرّر. لا يوجد مدخل
> "MelisDemoCms" في الشريط الجانبي — فالوحدة هي *المحتوى*، وليست أداة.

## تفعيله

إن `MelisDemoCms` وحدة موقع Laminas تُثبَّت ضمن `module/MelisSites/MelisDemoCms/` بواسطة
`installer-paths` الخاص بـ Composer. ويُصرّح ملفه `config/module.load.php` بالوحدات التي يتوقّع
تحميلها إلى جانبه:

```php
// vendor/melisplatform/melis-demo-cms/config/module.load.php
'MelisAssetManager', 'MelisEngine', 'MelisFront',
'MelisCmsNews', 'MelisCmsSlider', 'MelisCmsProspects',
'MelisDemoCms', 'MelisCmsPageScriptEditor'
```

اعتماديات Composer المطلوبة: `melis-cms`، `melis-cms-slider`، `melis-cms-prospects`،
`melis-cms-news`، `melis-cms-page-script-editor` (`^6.0`). أما `melis-engine` و`melis-front` فمُقترحان
(ومطلوبان في وقت التشغيل). ويُفعَّل الموقع لنطاق معيّن بضبط متغيّر بيئة الـ vhost
`MELIS_MODULE "MelisDemoCms"`.

## الخدمات الأساسية

| اسم الخدمة المستعار | الدور |
| --- | --- |
| `DemoCmsService` | مساعِدات خاصة بالموقع تستخدمها وحدات التحكم الأمامية ومستمِعو الإعداد (setup listeners). |
| `MelisPlatformTable` | بوابة جدول عامة فوق جدول المنصة الأساسي (`MelisEngine\Model\Tables\MelisGenericTable`، المفتاح الأساسي `plf_id`). |

## إعداد الموقع (المُثبِّت، وليس React)

لا تضيف هذه الوحدة أي مداخل في شجرة أدوات الإدارة الخلفية. وسطحها الوحيد في الإدارة الخلفية هو **معالج إعداد
الموقع (site setup wizard)** المستخدَم من قِبل السوق/المُثبِّت: وحدات التحكم
`MelisDemoCms\Controller\MelisSetupController` (المسار `/MelisDemoCms/setup`)،
و`MelisSetupPostDownloadController` و`MelisSetupPostUpdateController`. وتوجد إعدادات الإعداد
في `config/setup/download.config.php` و`config/setup/update.config.php`. وهذا شأن يخصّ الخلفية / سطر الأوامر (CLI)
دون أي سطح في React.

## الواجهة الأمامية

يُدار الموقع بواسطة وحدات تحكم موقع MelisFront اعتيادية، واحدة لكل نوع صفحة:

| وحدة التحكم | الصفحة |
| --- | --- |
| `MelisDemoCms\Controller\Home` | الرئيسية (carousel + slider ثانوي، شهادات العملاء، لافتة GDPR) |
| `MelisDemoCms\Controller\News` | قائمة الأخبار / تفاصيل الخبر |
| `MelisDemoCms\Controller\Team` | الفريق |
| `MelisDemoCms\Controller\Services` | قائمة الخدمات / التفاصيل |
| `MelisDemoCms\Controller\Faq` | صفحة الأسئلة الشائعة وكتل الفئات |
| `MelisDemoCms\Controller\Contact` | التواصل / نموذج العملاء المحتملين (prospects) |
| `MelisDemoCms\Controller\Testimonial` | شهادة عميل |
| `MelisDemoCms\Controller\Template` / `DragDrop` | عروض القوالب التوضيحية (ثابتة / سحب وإفلات / مختلطة) |
| `MelisDemoCms\Controller\Search` | نتائج البحث داخل الموقع (Lucene؛ مُعطَّل في العرض التوضيحي) |
| `MelisDemoCms\Controller\Page404` | صفحة الخطأ 404 |

بدلًا من أن يشحن `MelisDemoCms` مكوّناته الإضافية الخاصة، فإنه يوفّر **تجاوزات لقوالب المكوّنات الإضافية**
(`view/plugins/*.phtml`) مربوطة في `config/melis.plugins.config.php`:

| مكوّن القوالب الإضافي (الوحدة المالكة) | القوالب التي يوفّرها هذا الموقع |
| --- | --- |
| `MelisFrontMenuPlugin` (MelisFront) | `menu`، `white-menu`، `footer-menu` |
| `MelisFrontShowListFromFolderPlugin` (MelisFront) | `faq-listing`، `faq-values`، `home-testimonial-slider` |
| `MelisFrontGdprBannerPlugin` (MelisFront) | `gdpr-banner` |
| `MelisCmsSliderShowSliderPlugin` (MelisCmsSlider) | `home-carousel-slider`، `home-slider2`، `team-slider` |
| `MelisCmsNewsListNewsPlugin` / `…ShowNewsPlugin` / `…LatestNewsPlugin` (MelisCmsNews) | `news-list`، `news-details`، `latest-news-vertical`، `latest-news-horizontal` |
| `MelisCmsProspectsShowFormPlugin` (MelisCmsProspects) | `prospect-form` |

### تقنيات التركيب الثلاث

| التقنية | كيف تعمل | صفحات مثال |
| --- | --- | --- |
| **الوضع اليدوي** | يُنشَأ المكوّن الإضافي داخل وحدة التحكم، ويُصيَّر مع الوسائط (params)، ويُضاف بوصفه عنصرًا فرعيًا للعرض — ثم يعرضه العرض (view echoes it). | الرئيسية، الفريق (slider)، الأخبار، الأسئلة الشائعة، التواصل |
| **منطقة السحب والإفلات** | يُصرّح ملف `.phtml` بمنطقة مُسمّاة؛ ويُفلِت محرّر صفحات CMS في React أي مكوّن إضافي فيها؛ دون أي شيفرة في وحدة التحكم. | DragDrop، عروض القوالب |
| **الوسوم القابلة للتحرير المُضمّنة** | يغلّف `MelisTag` قيمة افتراضية داخل العرض؛ ويحرّر المؤلّف النصّ/الصور في مكانها من محرّر صفحات React. | الخدمات، شهادة العميل، 404 |

### المستمِعون (Listeners)

يقود `SetupDemoCmsListener` عملية تثبيت الموقع.
ويكتب `MelisDemoCmsCreateConfigListener` ملف `MelisDemoCms.config.php` من `.config.stub` بعد
التثبيت من السوق. ويخصّص `SiteMenuCustomizationListener` قائمة الواجهة الأمامية.
ويعدّل `LatestNewsHorizontalListener` مخرجات مكوّن أحدث الأخبار الإضافي.

## قاعدة البيانات

لا يعرّف `MelisDemoCms` أي جداول `melis_*` خاصة به. ويقرأ `MelisPlatformTable` جدول
`melis_core_platform` الأساسي. ويُنشَأ كل محتوى العرض التوضيحي (الصفحات، القوالب، أشرطة التمرير، الأخبار، مفاتيح الإعداد)
وقت التثبيت بواسطة مستمِعي الإعداد، اعتمادًا على قيم `config/MelisDemoCms.config.php`
مثل `home_page_id` و`news_page_id` و`home_page_slider_1_id`.

## مثال

تُصيّر وحدة تحكم أمامية مكوّنًا إضافيًا للقوالب بحقن مسار قالب خاص بالموقع ومعرّف
مدفوع بالإعداد — وهو النمط المستخدَم في الموقع بأكمله (`HomeController`):

```php
$cfg = $this->getServiceManager()->get('MelisSiteConfigService');

$slider = $this->MelisCmsSliderShowSliderPlugin();
$homeSlider1 = $slider->render([
    'template_path' => 'MelisDemoCms/plugins/home-carousel-slider',
    'id'            => 'homeSlider1',
    'pageId'        => $this->idPage,
    'sliderId'      => $cfg->getSiteConfigByKey('home_page_slider_1_id', $this->idPage),
]);
$this->view->addChild($homeSlider1, 'homeSlider1');
// view: <?= $this->homeSlider1 ?>
```

تتطلّب منطقة السحب والإفلات استدعاءً واحدًا في العرض — دون أي شيفرة في وحدة التحكم (تُملأ الكتلة
من محرّر صفحات CMS في React):

```php
<?= $this->MelisDragDropZone($this->idPage, 'dragdropzone_home_1') ?>
```

وسم قابل للتحرير مُضمّن مع قيمة افتراضية (يُحرَّر في مكانه من محرّر صفحات React):

```php
<?= $this->MelisTag($this->idPage, 'static-html-1', 'html', '<h1>Accessible…</h1>') ?>
```

## الملفات الأساسية

| الشأن | المسار (ضمن `vendor/melisplatform/melis-demo-cms/`) |
| --- | --- |
| المسارات، وحدات التحكم، خريطة القوالب | `config/module.config.php` |
| الوحدات المُحمّلة مع الموقع | `config/module.load.php` |
| ربط تجاوزات قوالب المكوّنات الإضافية | `config/melis.plugins.config.php` |
| مفاتيح الإعداد لكل موقع (معرّفات الصفحة / الـ slider / المجلد) | `config/MelisDemoCms.config.php`، `…config.stub` |
| تدفّق إعداد الموقع | `config/setup/download.config.php`، `config/setup/update.config.php` |
| التمهيد (Bootstrap) وتسجيل المستمِعين | `src/Module.php` |
| خدمة مساعِد الموقع | `src/Service/DemoCmsService.php` |
| وحدات تحكم الإعداد وما بعد التثبيت | `src/Controller/MelisSetupController.php`، `…PostDownloadController.php`، `…PostUpdateController.php` |
| مستمِعو التثبيت / القائمة / الأخبار | `src/Listener/` |
| قوالب المكوّنات الإضافية | `view/plugins/*.phtml` |
| عروض الصفحات | `view/melis-demo-cms/*/*.phtml` |
| عروض القوالب التوضيحية | `view/melis-demo-cms/template/` |

انظر أيضًا: [مرجع الوحدات](/ar/reference/modules)، [بناء موقع](/ar/guide/build-a-site)،
[المكوّنات الإضافية](/ar/guide/plugins).
