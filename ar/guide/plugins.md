# الإضافات: القوالب ولوحة التحكم

يمتلك Melis نوعين من الإضافات، وهما شيئان مختلفان:

- **إضافات القوالب** — **كتل محتوى** قابلة لإعادة الاستخدام تُدرَج في `MelisDragDropZone` الخاص بصفحة
  في **الواجهة الأمامية** (شريط تمرير، قائمة منتجات، نموذج تواصل).
- **إضافات لوحة التحكم** — **عناصر واجهة (widgets)** تُعرَض في لوحة تحكم **الواجهة الخلفية**.

لكل منهما مُولِّد هيكلي برسومي (`melis-templating-plugin-creator`، `melis-dashboard-plugin-creator`)
— استخدمه لتوليد الشيفرة النمطية، ثم تابع القراءة لفهمها وتخصيصها. في Melis v6،
هذه المولِّدات الهيكلية عبارة عن **معالِجات React أصلية** في الواجهة الخلفية `/melis-react` (لا يزال كلٌّ منها يحمل
مبدِّل **New / Old** إلى الأداة الكلاسيكية داخل iframe). أما إطار العمل ومجموعة الوحدات وشيفرة PHP
المولَّدة فلم تتغير — الشيء الوحيد الذي أصبح بلغة React الآن هو واجهة المستخدم التي تتحكم بها.

## إضافات القوالب (الواجهة الأمامية)

تمتد إضافة القالب من
`MelisEngine\Controller\Plugin\MelisTemplatingPlugin` وتنفِّذ:

| الطريقة | الدور |
| --- | --- |
| `front()` *(مطلوبة)* | تُرجِع **مصفوفة المتغيرات** المُمرَّرة إلى ملف `.phtml` الأمامي للإضافة. |
| `back()` | تعرض معاينة الواجهة الخلفية والمحرِّر (يُوفَّر إعداد افتراضي منطقي). |
| `createOptionsForms()` | تبني **تبويبات** نموذج الواجهة الخلفية انطلاقًا من إعداد الإضافة. |
| `loadDbXmlToPluginConfig()` / `savePluginConfigToXml($params)` | فكّ/ترميز المعاملات المحفوظة للإضافة (المخزَّنة بصيغة XML داخل محتوى الصفحة). |

يربط المُنشِئ (constructor) الإضافة بإعدادها:

```php
use MelisEngine\Controller\Plugin\MelisTemplatingPlugin;

class MyBlockPlugin extends MelisTemplatingPlugin
{
    public function __construct($updatesPluginConfig = [])
    {
        $this->configPluginKey = 'mymodule';      // key in the plugin config file
        $this->pluginXmlDbKey  = 'myBlock';       // XML element name saved in the page
        parent::__construct($updatesPluginConfig);
    }

    public function front()
    {
        $id = $this->pluginFrontConfig['someParam'] ?? null;
        // … fetch data via a service …
        return ['pluginId' => $this->pluginFrontConfig['id'], 'items' => $items];
    }
}
```

### ملف إعداد الإضافة

تأتي كل إضافة بملف `config/plugins/<Name>.config.php` يتضمن قسم **`front`** (إعداد
العرض: `template_path`، و`id`، ومعاملات مخصصة، وملفات css/js) وقسم **`melis`** (واجهة
مستخدم الواجهة الخلفية: الاسم، والصورة المصغّرة، وتبويبات/حقول `modal_form`). المرجع:
`vendor/melisplatform/melis-cms-slider/config/plugins/MelisCmsSliderShowSliderPlugin.config.php`.

سجِّل الإضافة كإضافة مُتحكِّم (controller plugin) في `module.config.php`:

```php
'controller_plugins' => ['invokables' => [
    'MyBlockPlugin' => \MyModule\Controller\Plugin\MyBlockPlugin::class,
]],
```

### كيف تصل إلى صفحة

يسحب المحرِّر الإضافة ويُفلِتها داخل `MelisDragDropZone` (انظر [إنشاء موقع](./build-a-site)). تُسلسَل
المعاملات المُعدَّة بصيغة XML داخل محتوى الصفحة؛ وعند العرض، يستدعي المحرِّك الأمامي
طريقة `front()` الخاصة بالإضافة ويعرض ملف `.phtml` الخاص بها. تُعدّ `MelisCmsSlider` و`MelisCmsNews`
المثالين النموذجيين.

### البنية الدنيا

```
MyModule/
├── config/plugins/MyBlockPlugin.config.php
├── src/Controller/Plugin/MyBlockPlugin.php
└── view/my-module/my-block.phtml             # front template
    view/my-module/my-block/melis/form.phtml  # back-office form
```

### توليد الهيكل في /melis-react

افتح **Templating Plugin Creator** من مدخله في القائمة اليسرى — يُفتح كتبويب علوي مع **شريط
من 6 خطوات** ومبدِّل **New / Old** أعلى اليمين (بجانب **Restart**). العرض New هو معالِج React حقيقي؛
والأداة بأكملها `persistent`، لذا يمكنك مغادرة التبويب والعودة إليه دون فقدان
خطوتك أو مُدخلاتك. (يبقى كل العمل الفعلي على جانب الخادم — إذ يعيد التحقق استخدام نماذج
Laminas القديمة، ويستدعي التوليد `MelisTemplatingPluginCreatorService`، الذي يكتب نفس ملفات
PHP/العرض/الإعداد/اللغة كما في السابق.)

![Templating Plugin Creator — Step 1 (Plugin name + destination)](/screenshots/react/melis-templating-plugin-creator/melistemplatingplugincreator-tool-step1.png)

الخطوات الست:

1. **Plugin** — اسم الإضافة والوجهة (**New module**، أو **Existing site module** تختاره
   من قائمة منسدلة). يحسب الخادم `template_path` المفروض انطلاقًا من هذا.
2. **Menu Texts & Display** — العنوان/الوصف لكل لغة المعروض في قائمة الإضافات ضمن محرِّر الصفحة،
   بالإضافة إلى الصورة المصغّرة المطلوبة (GIF/JPG/PNG، بأبعاد ~190×100، بحجم ≤500 kB).
3. **Main Properties** — الحقول القابلة للتحرير في الإضافة (1–25، بما في ذلك `template_path`). الحقل 1 هو
   `template_path` المُقفَل؛ أما الحقول 2..N فيحصل كل منها على اسم تقني، ونوع عرض (text، Dropdown،
   DatePicker، NumericInput، Switch، Textarea، نص منسَّق…)، وعلامة "مطلوب" وقيمة افتراضية.
4. **Properties' Translation** — تسمية + تلميح لكل خاصية، لكل لغة (بالإضافة إلى تسمية لكل خيار
   Dropdown).
5. **Summary** — تلخيص للقراءة فقط لكل ما سبق؛ لا يُكتَب شيء هنا.
6. **Finalization** — اختر **Site** لتفعيلها عليه (اختياري)، واترك **Activate plugin after
   creation** مفعَّلًا، ثم **Finish and create the plugin**. يؤدي التفعيل إلى إعادة تحميل المنصّة
   (يعدّ المعالِج تنازليًا ثم يعيد التحميل).

![Templating Plugin Creator — Step 6 (Finalization)](/screenshots/react/melis-templating-plugin-creator/melistemplatingplugincreator-tool-step6.png)

> **مبدِّل New / Old.** *New* هو معالِج React (الافتراضي)؛ أما *Old* فيعرض أداة jQuery الكلاسيكية
> داخل iframe. يؤدي التبديل إلى *Old* إلى إعادة تعيين مسودة الجلسة المشتركة، لذا ينبِّهك المعالِج أولًا.

## إضافات لوحة التحكم (الواجهة الخلفية)

يمتد عنصر واجهة لوحة التحكم من
`MelisCore\Controller\DashboardPlugins\MelisCoreDashboardTemplatingPlugin`. يعيّن وحدته في
المُنشِئ ويكشف طريقة إجراء (action) تُرجِع `ViewModel` مع `setTemplate()`:

```php
use MelisCore\Controller\DashboardPlugins\MelisCoreDashboardTemplatingPlugin;
use Laminas\View\Model\ViewModel;

class MyWidgetPlugin extends MelisCoreDashboardTemplatingPlugin
{
    public function __construct()
    {
        $this->pluginModule = 'mymodule';
        parent::__construct();
    }

    public function mywidget()   // the action referenced by the plugin config
    {
        $view = new ViewModel();
        $view->setTemplate('my-module/dashboard-plugin/my-widget');
        return $view;
    }
}
```

يُعلَن عن عنصر الواجهة ضمن واجهة `melis_dashboardplugin` (الاسم، والأيقونة، والصورة المصغّرة، وعرض/ارتفاع
الشبكة `width`/`height`، و`forward` إلى `module` / `plugin` / `function`)، ويُسجَّل في
`module.config.php` ضمن `controller_plugins`. المرجع:
`vendor/melisplatform/melis-core/src/Controller/DashboardPlugins/MelisCoreDashboardBubbleNewsMelisPlugin.php`.

### البنية الدنيا

```
MyModule/
├── config/module.config.php                 # declares the dashboard plugin + registers it
├── src/Controller/DashboardPlugins/MyWidgetPlugin.php
└── view/my-module/dashboard-plugin/my-widget.phtml
```

### توليد الهيكل في /melis-react

افتح **Dashboard Plugin Creator** من مدخله في القائمة اليسرى — تبويب علوي مع **شريط من 5 خطوات** ونفس
مبدِّل **New / Old**. مثل شقيقه الخاص بالقوالب، هو معالِج React بصفة `persistent` مدعوم بـ
`MelisDashboardPluginCreatorService`، لذا فإن شيفرة PHP المولَّدة مطابقة لمُخرَجات الأداة الكلاسيكية.

![Dashboard Plugin Creator — Step 1 (name, view type, destination)](/screenshots/react/melis-dashboard-plugin-creator/melisdashboardcreator-tool-step1.png)

الخطوات الخمس:

1. **Plugin** — الاسم، و**View type** (بطاقة **Single** أو **Multi-tabs**، من 2 إلى 25 تبويبًا)، والوجهة
   (**New module** أو قائمة منسدلة **Existing module**).
2. **Menu Texts & Display** — عنوان/وصف القائمة لكل لغة + الصورة المصغّرة المطلوبة.
3. **Dashboard Texts & Display** — عنوان البطاقة لكل لغة و**أيقونة الإضافة** (وبالنسبة للإضافات
   متعددة التبويبات، أيقونة واحدة لكل تبويب).
4. **Summary** — تلخيص للقراءة فقط.
5. **Finalization** — اترك **Activate plugin after creation** مفعَّلًا، ثم **Finish and create the
   plugin**؛ يعيد التفعيل تحميل المنصّة.

![Dashboard Plugin Creator — Step 3 (card title + icons)](/screenshots/react/melis-dashboard-plugin-creator/melisdashboardcreator-tool-step3.png)

## القوالب مقابل لوحة التحكم — لمحة سريعة

| | إضافة القوالب | إضافة لوحة التحكم |
| --- | --- | --- |
| الصنف الأساسي | `MelisTemplatingPlugin` | `MelisCoreDashboardTemplatingPlugin` |
| مكانها | `src/Controller/Plugin/` | `src/Controller/DashboardPlugins/` |
| الطريقة الجوهرية | `front()` ← مصفوفة متغيرات | إجراء ← `ViewModel` |
| تُعرَض في | صفحات الواجهة الأمامية (مناطق السحب والإفلات) | لوحة تحكم الواجهة الخلفية |
| الإعداد المحفوظ | XML في محتوى الصفحة | إعداد واجهة لوحة التحكم |
| معالِج التوليد الهيكلي | 6 خطوات (`melis-templating-plugin-creator`) | 5 خطوات (`melis-dashboard-plugin-creator`) |

## الملفات الأساسية

| الموضوع | المسار |
| --- | --- |
| الصنف الأساسي للقوالب | `vendor/melisplatform/melis-engine/src/Controller/Plugin/MelisTemplatingPlugin.php` |
| مثال القوالب | `vendor/melisplatform/melis-cms-slider/src/Controller/Plugin/MelisCmsSliderShowSliderPlugin.php` |
| الصنف الأساسي للوحة التحكم | `vendor/melisplatform/melis-core/src/Controller/DashboardPlugins/MelisCoreDashboardTemplatingPlugin.php` |
| مثال لوحة التحكم | `vendor/melisplatform/melis-core/src/Controller/DashboardPlugins/MelisCoreDashboardBubbleNewsMelisPlugin.php` |
| المولِّدات الهيكلية | `vendor/melisplatform/melis-templating-plugin-creator/`، `vendor/melisplatform/melis-dashboard-plugin-creator/` |

للاطلاع على صفحات مرجع الوحدات، انظر
[melis-templating-plugin-creator](/ar/reference/modules/melis-templating-plugin-creator) و
[melis-dashboard-plugin-creator](/ar/reference/modules/melis-dashboard-plugin-creator).
