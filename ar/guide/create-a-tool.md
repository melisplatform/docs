# إنشاء أداتك الأولى

**الأداة** هي شاشة في الواجهة الخلفية (قائمة، أو نموذج، أو لوحة تحكم…) مُجمّعة داخل وحدة (module)
ومربوطة بالقائمة الجانبية اليسرى. توضّح هذه الصفحة كيفية إنشاء واحدة في **Melis v6** وتشرح
بنية الأداة حتى تتمكّن من توسيعها بثقة.

::: tip اقرأ هذا أولاً
تأكّد من أنك اطّلعت على [البنية والمفاهيم](./concepts) — فالأدوات مبنية على **الوحدات (modules)**،
و**شجرة الإعدادات (config tree)**، و**التوجيهات (forwards)** و**الصلاحيات (rights)**. تبقى هذه الأسس
دون تغيير في v6.
:::

::: info احتفظت v6 بإطار العمل واستبدلت الواجهة
تعمل Melis v6 على **نفس** إطار عمل Laminas والوحدات وشجرة الإعدادات كما في v5. ما تغيّر هو
الواجهة الخلفية: فقد حلّت **واجهة React في `/melis-react`** محلّ الواجهة الكلاسيكية `/melis`.
تظهر الأدوات الآن هناك بوصفها "لبنات" (bricks) أصيلة في React، وأي أداة لم يُعَد كتابتها بلغة React
لا تزال تعمل، دون تغيير، داخل iframe. لذا فإن طريقة *بناء* أداة أدناه هي نفسها؛ وحده أسلوب
*استخدامها* في الواجهة الخلفية هو الجديد. راجع
[MelisReactApi](/ar/reference/modules/melis-react-api) و
[MelisReactOverride](/ar/reference/modules/melis-react-override) للاطّلاع على التفاصيل التقنية.
:::

## المسار السريع: معالجات توليد الشيفرة

تأتي Melis مع مولّدات ذات واجهة رسومية تُنشئ لك أداة كاملة وجاهزة للعمل. في v6 يُعدّ الأكثر
استخدامًا اثنان منها، وهما **معالجات React أصيلة** في واجهة `/melis-react`:

- **[Dashboard Plugin Creator](/ar/reference/modules/melis-dashboard-plugin-creator)** — يُنشئ
  عنصر واجهة (widget) يظهر على لوحة تحكم الصفحة الرئيسية للواجهة الخلفية.
- **[Templating Plugin Creator](/ar/reference/modules/melis-templating-plugin-creator)** — يُنشئ
  لبنة CMS في الواجهة الأمامية تُسقطها على الصفحات داخل محرّر الصفحات.

يفتح كلاهما من مدخله في القائمة اليسرى كعلامة تبويب علوية مع **شريط خطوات** في الأعلى ومفتاح تبديل
**New / Old** (أعلى اليمين، بجانب **Restart**): *New* هو معالج React (الافتراضي)، و*Old* يفتح
الأداة الكلاسيكية داخل iframe. يُتحقَّق من كل خطوة **على جهة الخادم** (بإعادة استخدام نماذج
Laminas القديمة) بحيث تكون قواعد العمل — كلمات PHP المحجوزة، وأسماء الوحدات/الإضافات المكرّرة —
مطابقة تمامًا لما كانت عليه سابقًا.

![Dashboard Plugin Creator — Step 1 (Plugin)](/screenshots/react/melis-dashboard-plugin-creator/melisdashboardcreator-tool-step1.png)
*الخطوة 1 من Dashboard Plugin Creator: **Plugin name**، و**View type** (Single / Multi-tabs)
و**Plugin destination** (New module / Existing module)، مع زر **Next** في الأسفل.*

تنقّل عبر المعالج: سمِّ إضافتك، واختر وحدة **جديدة** أو **موجودة**، وترجم عناوينها لكل لغة،
وارفع صورة مصغّرة، واختر أيقونات، ثم راجع **Summary** للقراءة فقط. خطوة **Finalization** هي الفعل
الوحيد الذي يُجري تعديلًا — إذ يكتب ملفات PHP/العروض/الإعدادات/اللغة على القرص، وفي مسار *الوحدة
الجديدة* يُنشئ الوحدة (عبر خدمة
[MelisToolCreator](/ar/reference/modules/melis-tool-creator) الأساسية)، ويسجّلها، و**يفعّلها**
ويعيد تحميل المنصّة.

![Templating Plugin Creator — Step 6 (Finalization)](/screenshots/react/melis-templating-plugin-creator/melistemplatingplugincreator-tool-step6.png)
*خطوة **Finalization** في Templating Plugin Creator: اختر **Site** لتفعيلها عليه، وأبقِ
**Activate plugin after creation** مفعّلًا، ثم اضغط **Finish and create the plugin** — يبدأ المعالج
العدّ التنازلي ويعيد تحميل المنصّة.*

::: tip Restart / New مقابل Old
يمسح **Restart** (شريط الأدوات العلوي) المسودّة ويعود إلى الخطوة 1. أما التبديل إلى **Old** فيفتح
الأداة الكلاسيكية داخل iframe و**يُعيد ضبط المسودّة المشتركة** — ويحذّرك المعالج أولًا.
:::

بالنسبة لأداة عادية في الواجهة الخلفية (شاشة قائمة/نموذج، لا لوحة تحكم أو لبنة CMS)، لا يزال
**MelisToolCreator** الأساسي يُنشئ هيكلًا كاملًا للوحدة (الإعدادات، ووحدات التحكم، والخدمة، ونموذج
الجدول، والعروض). يشرح بقيّة هذه الصفحة **ما تُنتجه هذه المولّدات** — حتى تتمكّن من قراءة الأدوات
وتعديلها وكتابتها يدويًا أيضًا.

## بنية الأداة (ما الذي يُولَّد)

هذا الجزء لم يتغيّر عن v5: لا تزال الأداة وحدة Laminas. تبدو الأداة النموذجية على النحو التالي:

```
module/MyTool/
├── src/Module.php                 # merges the config files below
├── config/
│   ├── module.config.php          # routes, services, controllers, view paths
│   ├── app.interface.php          # the tool's internal UI zones + forwards
│   ├── app.tools.php              # table columns, filters, action buttons
│   └── app.toolstree.php          # where the tool sits in the left menu
├── src/MyTool/
│   ├── Controller/                # *Controller.php (extend MelisAbstractActionController)
│   ├── Service/                   # *Service.php   (extend MelisGeneralService)
│   └── Model/Tables/              # *Table.php      (Laminas TableGateway wrappers)
├── view/melis-my-tool/            # .phtml templates
└── language/{en_EN,fr_FR}.interface.php
```

> 📎 أفضل التطبيقات المرجعية للنسخ منها هي الوحدات الحقيقية
> `vendor/melisplatform/melis-cms-news/` و `vendor/melisplatform/melis-cms-prospects/`.
> افتحهما جنبًا إلى جنب أثناء البناء.

### 1. تسجيل الوحدة

`config/melis.module.load.php`:

```php
return [
  // … core modules …
  'MyTool',
];
```

### 2. `Module.php` — تجميع الإعدادات

```php
namespace MyTool;

use Laminas\ModuleManager\Feature\ConfigProviderInterface;
use Laminas\Stdlib\ArrayUtils;

class Module implements ConfigProviderInterface
{
    public function getConfig()
    {
        $config = [];
        foreach ([
            __DIR__ . '/../config/module.config.php',
            __DIR__ . '/../config/app.interface.php',
            __DIR__ . '/../config/app.tools.php',
            __DIR__ . '/../config/app.toolstree.php',
        ] as $file) {
            $config = ArrayUtils::merge($config, include $file);
        }
        return $config;
    }
}
```

### 3. `app.toolstree.php` — إظهارها في القائمة اليسرى

يربط هذا أداتك ضمن قسم في القائمة اليسرى ويوجّه إلى وحدة التحكم الخاصة بها. القيمة `melisKey`
هي المُعرّف الثابت؛ ويشير `forward` إلى الإجراء الذي يعرض الأداة. تقرأ واجهة React هذه الشجرة نفسها
(عبر `GET /melis/react-api/menu`)، **مُرشَّحة وفق الصلاحيات**، لبناء شريطها الجانبي — لذا فإن
تصريحك عن أداتك هنا هو ما يجعلها تظهر في `/melis-react`.

```php
return ['plugins' => ['meliscore' => ['interface' => ['meliscore_leftmenu' => ['interface' => [
  'meliscustom_toolstree_section' => ['interface' => [
    'mytool_tool' => [
      'conf' => [
        'id'       => 'id_mytool_tool',
        'melisKey' => 'mytool_tool',
        'name'     => 'tr_mytool_title',   // translation key
        'icon'     => 'fa fa-puzzle-piece',
      ],
      'forward' => [
        'module'     => 'MyTool',
        'controller' => 'MyTool',
        'action'     => 'render-mytool',
      ],
    ],
  ]],
]]]]]];
```

### 4. وحدة التحكم + الخدمة

```php
// src/MyTool/Controller/MyToolController.php
namespace MyTool\Controller;

use Laminas\View\Model\ViewModel;
use Laminas\View\Model\JsonModel;
use MelisCore\Controller\MelisAbstractActionController;

class MyToolController extends MelisAbstractActionController
{
    public function renderMytoolAction()
    {
        $view = new ViewModel();
        $view->melisKey = $this->params()->fromRoute('melisKey', '');
        return $view; // renders view/melis-my-tool/my-tool/render-mytool.phtml
    }

    public function getListAction()
    {
        $items = $this->getServiceManager()->get('MyToolService')->getList();
        return new JsonModel(['data' => $items]);
    }
}
```

تُوسِّع الخدمات `MelisGeneralService` وتصل إلى قاعدة البيانات عبر غلاف `TableGateway`
مُسجَّل في `module.config.php`.

::: info كيف تُعرَض أداتك في /melis-react
لا تحتاج أداةٌ مُصرَّح بها بهذه الطريقة إلى **أي شيفرة React** لتظهر في v6. تعرض واجهة React ببساطة
واجهة `.phtml` الموجودة لديك داخل iframe يُقدَّم على `/melis/react-tool-page?key=<melisKey>` — مع
جداول DataTables والنماذج والنوافذ المنبثقة وأزرار الحفظ الخاصة بها وهي تتصرّف تمامًا كما في الواجهة
الكلاسيكية `/melis`. يتكفّل بهذا بالكامل [MelisReactOverride](/ar/reference/modules/melis-react-override)؛
ولا تلمسه أنت. أما إعادة كتابة الأداة بوصفها **لبنة React أصيلة** (مع `brick.manifest.json` ونقاط
نهاية `/melis/react-api/…`) فهي ترقية اختيارية — ومعالجا الإنشاء المذكوران أعلاه مثالان عليها —
وليست شرطًا.
:::

### 5. اجعلها مرئية — الصلاحيات

حتى عندما تكون الأداة مُصرَّحة بشكل صحيح، فإن قسم القائمة اليسرى يظهر فقط للمستخدمين الذين تتضمّن
**صلاحياتهم** إياه. تُخزَّن الصلاحيات كقائمة سماح بصيغة XML في `melis_core_user.usr_rights`:
يظهر القسم عندما يكون `*_toolstree_section` الخاص به مُدرجًا هناك. تُرشَّح قائمة `/melis-react`
وفق هذه الصلاحيات بالضبط، لذا فإن أي قسم غير مُدرَج يكون مخفيًا في واجهة React أيضًا.

امنح الوصول من محرّر **Users → Rights** في الواجهة الخلفية (حدِّد أداتك للدور/المستخدم واحفظ).
وللأتمتة، يمكنك أيضًا حقن القسم في XML الصلاحيات عبر عملية ترحيل (migration) — انظر كيف تفعل المنصّة
ذلك لقائمة الذكاء الاصطناعي في `flyway/sql/V3__add_melisai_rights.sql`.

::: tip تحتوي v6 أيضًا على "صلاحيات متقدّمة" (القدرات)
إضافةً إلى *الوصول* إلى الأداة، تُضيف v6 **قدرات** (capabilities) دقيقة (`list` / `create` / `edit` /
`delete`، أو علامات تبويب متداخلة) تتحكّم في الأجزاء الداخلية لأداة سبق التصريح بها. وهي **مسموحة
افتراضيًا** — فالأداة التي لا تُصرِّح بأيٍّ منها تحتفظ بعمليات CRUD الكاملة، لذا فهذا اختياري. إن أردته،
صرِّح عن `config/react.capabilities.php` في وحدتك واحمِ إجراءات React-API لديك بـ
`denyUnlessCan('edit')`. يوجد العقد الكامل في
[MelisReactApi](/ar/reference/modules/melis-react-api).
:::

## خلاصة

1. ولِّد باستخدام **معالج** (Dashboard / Templating Plugin Creator) أو انسخ `melis-cms-news`.
2. **سجِّل** الوحدة في `config/melis.module.load.php`.
3. صرِّح عنها في **`app.toolstree.php`** (القائمة) و**`app.interface.php`** (المناطق الداخلية).
4. نفِّذ **وحدة التحكم + الخدمة + العرض**.
5. امنح **الصلاحيات** حتى تظهر في القائمة.

أصبح لديك الآن أداة عاملة تظهر في الواجهة الخلفية `/melis-react` — بوصفها iframe لأداة `.phtml`
كلاسيكية، أو لبنة أصيلة إن أعدت كتابتها بلغة React. من هنا، استكشف `app.tools.php` لتوصيل جدول
بيانات كامل (الأعمدة، والمرشّحات، وأزرار الإجراءات) كما تفعل وحدات CMS.
