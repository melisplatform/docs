# MelisTemplatingPluginCreator

> معالج في الواجهة الخلفية يقوم بتوليد **إضافة قوالب (templating plugin)** كاملة للواجهة الأمامية — التهيئة
> والمتحكّم والعرض ونموذج النافذة المنبثقة والأصول والترجمات — داخل وحدة جديدة أو قائمة. في الإصدار v6 يأتي
> كوحدة React أصلية (native React brick) تستدعي واجهة `react-api` بصيغة JSON، مع مفتاح تبديل New/Old إلى الأداة القديمة.
> الحزمة `melisplatform/melis-templating-plugin-creator`.

## الغرض

إن MelisTemplatingPluginCreator هو مولّد شيفرة، لا ميزة تعمل وقت التشغيل. يرشدك عبر **معالج من 6 خطوات** —
اسم الإضافة، الوحدة الوجهة، نصوص القائمة المترجمة، الخصائص (الحقول)، الترجمات — ثم يكتب إضافة قوالب جاهزة
للاستخدام داخل الوحدة الهدف. تَرِث الإضافة المولّدة من `MelisEngine\Controller\Plugin\MelisTemplatingPlugin`،
لذا فبمجرد إنشائها تتصرّف مثل أي إضافة قوالب مكتوبة يدويًا — اقرأ [الإضافات](/ar/guide/plugins) لفهم المخرجات
وتخصيصها.

## تفعيلها

إنها وحدة Laminas قياسية. أضِفها إلى `config/melis.module.load.php`:

```php
return [
    // …
    'MelisTemplatingPluginCreator',
];
```

تبعيات Composer (`composer.json`): `melis-core` و`melis-tool-creator` و`melis-cms`. عندما تكون الوجهة
وحدة **جديدة**، تفوّض الأداة إلى `MelisToolCreatorService::createTool()` لتوليد بنية الوحدة أولًا. لا حاجة إلى
قاعدة بيانات، لكن يجب أن يكون دليل `module/` والمجلّد `tpc/temp-thumbnail/` الواقع تحت الجذر العام للمستندات
قابلين للكتابة (وامتداد GD مطلوب أيضًا للتحقق من الصور المصغّرة). تُظهر وحدة React هذه القيود بوصفها إشعارات
فحص مسبق **حاجبة (blocking)** عندما يكون نظام الملفات غير قابل للكتابة أو عند غياب GD.

## الواجهة الخلفية بتقنية React

المعالج عبارة عن **وحدة React كاملة أصلية (native full-React brick)** (وليست iframe) مُركّبة داخل `/melis-react`.
تُفتح كتبويب علوي باسم **Templating Plugin Creator** مع شريط من 6 خطوات ومفتاح تبديل **New / Old** (أعلى اليمين،
بجوار **Restart**). يعود *Old* إلى أداة jQuery القديمة داخل iframe؛ أما *New* (الافتراضي) فهو معالج React.
الوحدة `persistent`: مغادرة تبويب الأداة والعودة إليه لا يُفقدان المسودّة ولا الخطوة الحالية. الخطوات الستّ عبارة
عن ألواح (panes) تُعرض وتُخفى عبر CSS ضمن صفحة واحدة مُركّبة.

![الخطوة 1 (Plugin) من معالج React: اسم الإضافة، وجهة الإضافة (New module / Existing site module) مع حقل اسم الوحدة الجديدة، وشريط الخطوات الستّ وزر Next](/screenshots/react/melis-templating-plugin-creator/melistemplatingplugincreator-tool-step1.png)

تبقى كل منطق العمل من جهة الخادم: يعيد التحقق بناء نماذج Laminas القديمة (بالمتحقّقات والرسائل والقواعد نفسها)،
ويستدعي التوليدُ `MelisTemplatingPluginCreatorService`. أما React فهو للعرض واستدعاءات الواجهة البرمجية.

### الخطوات الستّ

| الخطوة | الاسم | ما تفعله |
| --- | --- | --- |
| 1 | Plugin | اسم الإضافة + الوجهة: **New module** (يُظهر حقل اسم وحدة جديدة) أو **Existing site module** (قائمة منسدلة بالوحدات). |
| 2 | Menu Texts & Display | عنوان/وصف لكل لغة يظهران في قائمة الإضافات بمحرّر الصفحة (لغة واحدة على الأقل) + رفع صورة مصغّرة مطلوب (GIF/JPG/PNG، بأبعاد ~190×100، ≤500 kB). |
| 3 | Main Properties | عدد الخصائص (1–25، بما فيها `template_path`)؛ لكل حقل اسم تقني ونوع عرض وعلَم "مطلوب" وقيمة افتراضية. الخاصية 1 هي `template_path` المفروضة للقراءة فقط. |
| 4 | Properties' Translation | تسمية + تلميح لكل حقل بحسب اللغة (إضافة إلى تسمية لكل خيار من خيارات القائمة المنسدلة)؛ تكفي لغة واحدة مكتملة. |
| 5 | Summary | ملخّص للقراءة فقط للخطوات 1→4، والوحدة الهدف ومسار القالب المحسوب. لا يُكتب شيء هنا. |
| 6 | Finalization | اختياريًا اختر **Site** لتفعيلها عليه وبدِّل **Activate plugin after creation**، ثم **Finish and create the plugin**. |

يكون `template_path` دائمًا الخاصية الأولى المفروضة، ويُحسب من جهة الخادم بصيغة
`<Module>/plugins/<plugin-view-name>` ولا يرسله العميل أبدًا. **الخطوة 6 هي العملية المُعدِّلة الوحيدة**: فهي
تكتب ملفات الإضافة، وفي فرع الوحدة الجديدة تولّد بنية الوحدة، وتسجّلها اختياريًا في `module.load.php` الخاص
بالموقع المختار، وتفعّلها وتُبطِل ذاكرة مسارات الوحدات المؤقتة (يتطلّب التفعيل إعادة تحميل المنصّة، تُعرض كعدّ
تنازلي). تشمل أنواع العرض المتاحة `MelisText` و`Dropdown` و`DatePicker` و`DateTimePicker` و`PageInput`
و`NumericInput` و`Switch` و`Textarea` و`MelisCoreTinyMCE`.

![الخطوة 2 (Menu Texts & Display): عنوان ووصف لكل لغة (English / Français) إضافة إلى بطاقة الصورة المصغّرة المطلوبة للإضافة مع المعاينة وRemove thumbnail](/screenshots/react/melis-templating-plugin-creator/melistemplatingplugincreator-tool-step2.png)

![الخطوة 3 (Main Properties): عدد الخصائص (1–25) والخاصية 1، وهي template_path المفروضة للقراءة فقط مع قيمتها الافتراضية المحسوبة من جهة الخادم](/screenshots/react/melis-templating-plugin-creator/melistemplatingplugincreator-tool-step3.png)

![الخطوة 6 (Finalization): القائمة المنسدلة Site، ومفتاح التبديل Activate plugin after creation، وزر Finish and create the plugin](/screenshots/react/melis-templating-plugin-creator/melistemplatingplugincreator-tool-step6.png)

## واجهة React البرمجية

توجد المسارات في `config/react-api.php`، ويخدمها `MelisReactApiTemplatingPluginCreatorController`، وكلها
تحت `/melis/react-api/tpc`، بعقد `{ success, data, error }`. فشل التحقق **ليس** خطأ HTTP: يُعيد
`POST /tpc/step/:step` القيمة `{ valid:false, errors:{…} }` كي تتمكّن الواجهة من عرض رسائل لكل حقل.

| الطريقة والعنوان | الغرض |
| --- | --- |
| `GET /tpc/context` | فحص مسبق (قابلية كتابة FS + فحوص GD → `blocking[]`)، بيانات وصفية للخطوات، اللغات، وحدات الموقع، المواقع، أنواع العرض، `maxFields` (25)، حدود الصورة المصغّرة. |
| `GET /tpc/state` | استعادة المعالج من الجلسة المشتركة. |
| `POST /tpc/reset` | إعادة التشغيل: مسح مسودّة الجلسة + الصورة المصغّرة المؤقتة. |
| `POST /tpc/step/:step` (`1–4`) | التحقق من خطوة وحفظها → `{ valid, errors }`. |
| `POST /tpc/thumbnail` · `POST /tpc/thumbnail/remove` | رفع/إزالة الصورة المصغّرة للإضافة. |
| `GET /tpc/translation-fields` | الحقول المطلوب ترجمتها (مشتقّة من الخطوة 3). |
| `GET /tpc/summary` | ملخّص للقراءة فقط للخطوات 1→4 + الوحدة الهدف + مسار القالب. |
| `POST /tpc/generate` | **توليد الإضافة** (يكتب الملفات، ويولّد بنية وحدة ويفعّلها اختياريًا). |

## القدرات (الصلاحيات المتقدّمة)

مُصرَّح بها في `config/react.capabilities.php` تحت المفتاح melisKey الحامل للصلاحيات
`melistemplatingplugincreator_tool` (المفتاح نفسه المستخدم في الـ manifest وحارس وصول المتحكّم). الدلالة هي
**السماح افتراضيًا (default-allow)**. سلاسل القدرات المسطّحة:

| القدرة | ما تحرسه |
| --- | --- |
| `wizard` · `wizard.edit` | تهيئة/التحقق من الخطوات 1→4 (بدون `wizard.edit` يصبح المعالج بأكمله للقراءة فقط). |
| `thumbnail` · `thumbnail.create` · `thumbnail.delete` | رفع/إزالة الصورة المصغّرة (الخطوة 2). |
| `summary` · `summary.list` | قراءة الملخّص (الخطوة 5). |
| `finalization` · `finalization.create` | **توليد الإضافة** (الخطوة 6) — القدرة الحسّاسة. |

كل إجراء في المتحكّم محروس مرّتين — `denyUnlessAccess()` (المصادقة + `canAccess`) ثم `denyUnlessCan(cap)`.
إخفاء عناصر التحكم في الواجهة أمر يخصّ تجربة المستخدم فقط؛ فالخادم يرفض في كل الأحوال.

## الخدمات الأساسية

مُسجَّلة كاسم مستعار (alias) في `service_manager` ضمن `config/module.config.php`.

| الاسم المستعار | الدور |
| --- | --- |
| `MelisTemplatingPluginCreatorService` | يولّد (ويتراجع عن) إضافة القوالب انطلاقًا من بيانات المعالج المحفوظة في الجلسة. |

يُتيح `MelisTemplatingPluginCreatorService` (الذي يَرِث من `MelisCore\Service\MelisGeneralService`) على وجه
الخصوص ما يلي:

| الطريقة | الدور |
| --- | --- |
| `generateTemplatingPlugin()` | نقطة الدخول: يقرأ خطوات الجلسة ويكتب كل ملفات الإضافة؛ ويتراجع عند أي فشل. يُعيد قيمة منطقية. |
| `getSiteTemplatingPluginNames($siteModule)` | يسرد أسماء إضافات القوالب القائمة لوحدة موقع (يُستخدم لرفض أسماء الإضافات المكرّرة). |
| `generateModuleNameCase($str)` / `convertToViewName($string)` | يطبّع اسمًا ليصبح اسم وحدة صالحًا / اسم دليل عرض صالحًا. |
| `getTempThumbnail()` | يحلّ المسار المؤقت للصورة المصغّرة المرفوعة للإضافة في الجلسة الحالية. |

داخليًا، يُشغّل `generateTemplatingPlugin()` الدالةَ `performGeneration()` التي تكتب تهيئة الإضافة
(`config/plugins/<Module><Plugin>Plugin.config.php`)، وتحدّث `module.config.php` الهدف
(`template_map` + `controller_plugins`)، وتُلحِق الترجمات لكل لغة، وتولّد الأصول (css/js + الصورة المصغّرة)،
والمتحكّم (`src/<Module>/Controller/Plugin/<Module><Plugin>Plugin.php`)، وعرض الواجهة الأمامية ونموذج النافذة
المنبثقة، وتُضمّن التهيئة الجديدة من ملف `Module.php` الخاص بالوحدة. يكتب متحكّم React حالة معالجه في **حاوية
الجلسة نفسها** التي تستخدمها الأداة القديمة (`templatingplugincreator`)، لأن الخدمة تلتقط لقطة منها في مُنشئها.

## الواجهة الأمامية

لا تضيف هذه الوحدة **أي** إضافة واجهة أمامية تعمل وقت التشغيل ولا مساعد عرض خاصًّا بها. بل إنها **تولّد** إضافة
قوالب داخل الوحدة الوجهة: صنف إضافة-متحكّم يَرِث من
`MelisEngine\Controller\Plugin\MelisTemplatingPlugin` مع `loadDbXmlToPluginConfig()` /
`savePluginConfigToXml()` موصولتين بالحقول المهيّأة، وملف `config/plugins/*.config.php` (قسما `front` و`melis`،
مع تبويب **Properties** واحد)، وملف واجهة أمامية `.phtml`، وملف نموذج نافذة منبثقة `.phtml`، وأصول css/js. عندها
تظهر الإضافة المولّدة في قائمة الإضافات بمحرّر الصفحات في CMS وتُسقَط داخل `MelisDragDropZone` مثل أي إضافة
قوالب أخرى — انظر [الإضافات](/ar/guide/plugins) و[بناء موقع](/ar/guide/build-a-site).

## جداول قاعدة البيانات

لا شيء. تولّد هذه الأداة ملفات مصدرية فقط وتخزّن حالة معالجها الجارية في حاوية جلسة Laminas
(`templatingplugincreator`)؛ ولا تُثبَّت أي جداول `melis_*`.

## مثال

تُستهلك الإضافة المولّدة مثل أي إضافة قوالب. من جهة الخدمة، تستدعي الخطوة الأخيرة من المعالج ما يلي:

```php
$tpcService = $serviceManager->get('MelisTemplatingPluginCreatorService');
$result = $tpcService->generateTemplatingPlugin(); // true on success, files written to the target module
```

## الملفات الأساسية

| الشأن | المسار |
| --- | --- |
| تحميل الوحدة / التهيئة | `vendor/melisplatform/melis-templating-plugin-creator/src/Module.php` |
| الربط (الخدمة، عناصر النماذج، العروض) | `vendor/melisplatform/melis-templating-plugin-creator/config/module.config.php` |
| مسارات واجهة React البرمجية + القابل للاستدعاء | `vendor/melisplatform/melis-templating-plugin-creator/config/react-api.php` |
| قدرات React | `vendor/melisplatform/melis-templating-plugin-creator/config/react.capabilities.php` |
| نماذج المعالج + تهيئة الخطوات (يُعاد استخدامها للتحقق) | `vendor/melisplatform/melis-templating-plugin-creator/config/app.tools.php` |
| متحكّم واجهة React البرمجية | `vendor/melisplatform/melis-templating-plugin-creator/src/Controller/MelisReactApiTemplatingPluginCreatorController.php` |
| متحكّم المعالج القديم (iframe لعرض Old) | `vendor/melisplatform/melis-templating-plugin-creator/src/Controller/TemplatingPluginCreatorController.php` |
| خدمة المولّد | `vendor/melisplatform/melis-templating-plugin-creator/src/Service/MelisTemplatingPluginCreatorService.php` |
| وحدة React (المصدر + المبنيّة) | `vendor/melisplatform/melis-templating-plugin-creator/ui-react/` · `public/ui-react/` |

انظر أيضًا: [مرجع الوحدات](/ar/reference/modules) · [الإضافات](/ar/guide/plugins) ·
[إنشاء أداة](/ar/guide/create-a-tool) · [بناء موقع](/ar/guide/build-a-site).
