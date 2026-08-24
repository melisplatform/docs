# MelisDashboardPluginCreator

> معالج تفصيلي خطوة بخطوة يُنشئ هيكل **إضافة لوحة تحكم** جديدة (widget) للمكتب الخلفي داخل وحدة جديدة أو قائمة، ويُقدَّم الآن بوصفه لبنة React أصلية. الحزمة `melisplatform/melis-dashboard-plugin-creator`.

## الغرض

MelisDashboardPluginCreator هو **مساعد لتوليد الشيفرة**: معالج من 5 خطوات يُنشئ عنصر لوحة تحكم جاهزًا للاستخدام — مع المتحكّم الخاص به وطريقة العرض والإعدادات والأصول والترجمات — ويربطه بالوحدة المستهدفة. أنت تختار عنصرًا **بعلامة تبويب واحدة** أو **بعلامات تبويب متعددة**، ووجهةً (إنشاء وحدة جديدة تمامًا أو توسيع وحدة قائمة)، وعناوين/أوصافًا لكل لغة، وأيقونة وصورة مصغّرة؛ ثم تكتب الأداة الملفات و(اختياريًا) تُفعّل الإضافة.

يمتدّ العنصر المُولَّد من `MelisCore\Controller\DashboardPlugins\MelisCoreDashboardTemplatingPlugin` ويُصرَّح عنه ضمن الواجهة `melis_dashboardplugin`، فيظهر على لوحة تحكم المكتب الخلفي. تعتمد الوحدة على `melis-core` و`melis-tool-creator` (يُعاد استخدام الأخيرة لإنشاء هيكل الوحدة الجديدة). لمعرفة المفاهيم الكامنة وراء إضافات لوحة التحكم، راجع [الإضافات](/legacy/guide/plugins)؛ ولأدوات المكتب الخلفي عمومًا، راجع [إنشاء أداة](/legacy/guide/create-a-tool).

## تفعيلها

هي وحدة Laminas قياسية. أضِفها إلى `config/melis.module.load.php`:

```php
return [
    // …
    'MelisDashboardPluginCreator',
];
```

ثبّتها عبر Composer (`composer require melisplatform/melis-dashboard-plugin-creator`)؛ ويُجلب كلٌّ من `melis-core` و`melis-tool-creator` تلقائيًا. لا حاجة إلى قاعدة بيانات.

تكتب الأداة ملفات على القرص، لذا يجب أن تكون العناصر التالية **قابلة للكتابة** من قِبل خادم الويب (يُتحقق منها أثناء التشغيل وتُعرض للمعالج بوصفها `context.blocking[]`): `config/melis.module.load.php`، ودليل `module/`، ومسار الصورة المصغّرة المؤقتة `<DOCUMENT_ROOT>/dpc/temp-thumbnail/` (المُعدّ في `config/app.tools.php` تحت `melisdashboardplugincreator/datas/plugin_thumbnail/path`).

## مكتب خلفي بـ React

في المكتب الخلفي بـ React (`/melis-react`) تُقدَّم الأداة بوصفها **لبنة React كاملة أصلية** — معالج React حقيقي يستدعي `react-api` بصيغة JSON، مع مفتاح تبديل **New / Old** يعود إلى الأداة القديمة المبنية على jQuery داخل iframe. يبقى كل العمل الفعلي في جانب الخادم: يُعيد التحقق استخدام نماذج Laminas القديمة، ويستدعي التوليد `MelisDashboardPluginCreatorService`. أما React فهو للعرض واستدعاءات الـ API.

| العنصر | القيمة |
| --- | --- |
| نوع اللبنة | React كاملة أصلية (معالج من 5 خطوات، مع احتياطي iframe قديم عبر New/Old) |
| معرّف اللبنة | `dashboard-plugin-creator` |
| `route` في البيان | `/melis-core/dashboard-plugin-creator` (نقطة تركيب احتياطية) |
| `label` | `Dashboard Plugin Creator` |
| `forwardKey` | `MelisDashboardPluginCreator/DashboardPluginCreator` |
| `melisKey` | `melisdashboardplugincreator_tool` |
| `subTabs` / `persistent` | `false` / `true` |
| أساس الـ API | `/melis/react-api/dpc` |

تُكتشَف اللبنة عبر `GET /melis/react-api/react-modules` ولا تظهر **إلا إذا كانت الوحدة مُفعّلة** في `config/melis.module.load.php`. وهي `persistent`: يُركَّب المعالج مرة واحدة وخطواته الخمس عبارة عن لوحات تُظهَر/تُخفى عبر CSS، فمغادرة علامة تبويب الأداة والعودة إليها لا يُفقدان المسودّة ولا الخطوة الحالية. يمسح زر **Restart** (شريط الأدوات العلوي) مسودّة الجلسة والصورة المصغّرة المؤقتة. تبديل مفتاح **New / Old** إلى *Old* يعرض المتحكّم القديم داخل iframe (`/melis/react-tool-page?key=melisdashboardplugincreator_tool`) ويُعيد ضبط مسودّة الجلسة المشتركة؛ وينبّهك المعالج أولًا إذا كانت هناك مسودّة موجودة.

## المعالج ذو الخطوات الخمس

| الخطوة | مكوّن React | ما تفعله |
| --- | --- | --- |
| 1 — Plugin | `Step1Plugin` | **اسم الإضافة**، **نوع العرض** (بعلامة تبويب واحدة / بعلامات تبويب متعددة، من 2 إلى 25 علامة)، **وجهة الإضافة** (وحدة جديدة + اسمها، أو قائمة منسدلة بوحدة قائمة). |
| 2 — Menu Texts & Display | `Step2Menu` | **عنوان الإضافة** + **الوصف** لكل لغة (شريط علامات تبويب اللغات، واحدة على الأقل مطلوبة)؛ رفع **الصورة المصغّرة للإضافة** المطلوبة (GIF/JPG/PNG، نحو 190×100، ≤500 ك.ب). |
| 3 — Dashboard Texts & Display | `Step3Dashboard` | **عنوان البطاقة** لكل لغة، واختيار **أيقونة الإضافة** من شبكة؛ والإضافات متعددة العلامات تختار **أيقونة واحدة لكل علامة تبويب**. |
| 4 — Summary | `Step4Summary` | مراجعة للقراءة فقط للخطوات 1→3 + الوحدة المستهدفة (تُجلب من `/dpc/summary`)؛ لا يُكتب شيء. |
| 5 — Finalization | `Step5Finalize` | مفتاح **Activate plugin after creation** (مُفعّل افتراضيًا) + **Finish and create the plugin** ← التوليد؛ وعند التفعيل يُعيد عدّاد تنازلي تحميل المنصّة. |

الخطوة 5 هي **العملية المُعدِّلة الوحيدة**. تُتحقَّق قواعد العمل (كلمة PHP محجوزة، وحدة موجودة مسبقًا، اسم/عنوان إضافة مُستخدَم من قبل) في جانب الخادم مقابل نماذج Laminas القديمة؛ ولا تُصيّر مكوّنات React سوى الرسائل المُرجَعة لكل حقل.

![الخطوة 1 — Plugin: الاسم، ونوع العرض (بعلامة تبويب واحدة / بعلامات تبويب متعددة) ووجهة الإضافة (وحدة جديدة / قائمة)](/screenshots/react/melis-dashboard-plugin-creator/melisdashboardcreator-tool-step1.png)

![الخطوة 2 — Menu Texts & Display: العنوان/الوصف لكل لغة (English / Français) إضافةً إلى الصورة المصغّرة للإضافة المطلوبة مع المعاينة وزر Remove](/screenshots/react/melis-dashboard-plugin-creator/melisdashboardcreator-tool-step2.png)

![الخطوة 3 — Dashboard Texts & Display: عنوان البطاقة لكل لغة وشبكة أيقونات الإضافة (Calendar محدَّدة)؛ والإضافات متعددة العلامات تُضيف شبكة أيقونات لكل علامة تبويب](/screenshots/react/melis-dashboard-plugin-creator/melisdashboardcreator-tool-step3.png)

![الخطوة 4 — Summary: مراجعة للقراءة فقط للإضافة / الوحدة المستهدفة / النوع، والصورة المصغّرة، ونصوص القائمة، وعناوين لوحة التحكم والأيقونة قبل التوليد](/screenshots/react/melis-dashboard-plugin-creator/melisdashboardcreator-tool-step4.png)

![الخطوة 5 — Finalization: مفتاح "Activate plugin after creation" وزر "Finish and create the plugin" الذي يُشغّل التوليد](/screenshots/react/melis-dashboard-plugin-creator/melisdashboardcreator-tool-step5.png)

## واجهة React البرمجية

تقع المسارات في `config/react-api.php`، ويخدمها `MelisReactApiDashboardPluginCreatorController`. كلها تحت `/melis/react-api/dpc`، بعقد `{ success, data, error }`. فشل التحقق **ليس** خطأ HTTP — إذ يُرجع `POST /dpc/step/:step` القيمة `{ success:true, data:{ valid:false, errors:{…} } }` كي تتمكن الواجهة من عرض الرسائل لكل حقل.

| الطريقة والعنوان | الغرض |
| --- | --- |
| `GET /dpc/context` | فحص مسبق (قابلية الكتابة على نظام الملفات ← `blocking[]`)، وبيانات وصفية للخطوات، واللغات، والوحدات القائمة، والأيقونات، والحد الأدنى/الأقصى للعلامات، وحدود الصورة المصغّرة |
| `GET /dpc/state` | حالة المعالج الحالية من الجلسة المشتركة (تستعيد الواجهة) |
| `POST /dpc/reset` | إعادة التشغيل: مسح مسودّة الجلسة + الصورة المصغّرة المؤقتة |
| `POST /dpc/step/:step` (`1`–`3`) | التحقق + حفظ خطوة ← `{ valid, errors }` |
| `POST /dpc/thumbnail` | رفع متعدد الأجزاء لصورة الإضافة المصغّرة |
| `POST /dpc/thumbnail/remove` | إزالة الصورة المصغّرة |
| `GET /dpc/summary` | مراجعة للقراءة فقط للخطوات 1→3 + الوحدة المستهدفة |
| `POST /dpc/generate` | **توليد الإضافة** ← `{ generated, module, plugin, restartRequired, notices }` |

```ts
const BASE = '/melis/react-api/dpc'

// validate + save step 1
await postJson('/step/1', {
  dpc_plugin_name: 'SalesOverview', dpc_plugin_type: 'single',
  dpc_plugin_destination: 'new_module', dpc_new_module_name: 'MyDashboards',
}) // → { valid: true, errors: {} }

// generate (step 5) — the ONLY mutating call
await postJson('/generate', { dpc_activate_plugin: true })
// → { generated:true, module:'MyDashboards', plugin:'SalesOverview', restartRequired:true }
```

لا يُعيد المتحكّم تنفيذ منطق الأداة: فالتحقق يُعيد بناء نماذج Laminas القديمة من `config/app.tools.php` (`getFormMergedAndOrdered`)، وتُكتب الحالة في **حاوية الجلسة نفسها** المستخدَمة في الأداة القديمة (`dashboardplugincreator`)، والتي تقرؤها الخدمة في مُنشئها.

## القدرات

مُصرَّحٌ عنها في `config/react.capabilities.php` تحت العقدة الحاملة للصلاحيات `melisdashboardplugincreator_tool`. الدلالات هي **السماح افتراضيًا** (تُسمح أي قدرة غير مُصرَّح عنها، فتظل الأدوار القديمة تعمل). سلاسل القدرات المُسطّحة:

| علامة التبويب | الإجراءات | الحُرّاس |
| --- | --- | --- |
| `wizard` | `edit` | إعداد/حفظ الخطوات 1→3 (بدون `wizard.edit` يصبح المعالج كله للقراءة فقط) |
| `thumbnail` | `create`، `delete` | رفع / إزالة الصورة المصغّرة (الخطوة 2) |
| `summary` | `list` | قراءة الملخّص (الخطوة 4) |
| `finalization` | `create` | **توليد** الإضافة (الخطوة 5) — القدرة الحسّاسة |

يُحرَس كل إجراء في المتحكّم مرتين — الوصول أولًا (`denyUnlessAccess`)، ثم القدرة المعنية (`denyUnlessCan('finalization.create')`). إخفاء عناصر التحكم في React هو تحسين لتجربة الاستخدام فحسب؛ فالخادم يرفض على أي حال.

## الخدمات الأساسية

مُسجَّلة في `config/module.config.php` وذات أسماء بديلة:

| الاسم البديل للخدمة | الدور |
| --- | --- |
| `MelisDashboardPluginCreatorService` | يُولّد إضافة لوحة التحكم من البيانات المحفوظة في جلسة المعالج. |

يمتدّ `MelisDashboardPluginCreatorService` من `MelisCore\Service\MelisGeneralService`. من أبرز طرقه:

- `generateDashboardPlugin()` — نقطة الدخول: يقرأ خطوات الجلسة، ويحدّد الوحدة/اسم الإضافة المستهدفَين، ثم يُشغّل `performGeneration()`، مع التراجع عند الفشل (`rollbackPluginGeneration()`). يُطلق الحدثين `melisdashboard_plugin_creator_service_generate_dashboard_plugin_start/end`.
- خطوات التوليد الداخلية: `generateDashboardPluginConfig()` (يكتب `config/dashboard-plugins/<Plugin>Plugin.config.php`)، و`generateDashboardPluginController()`، و`generateDashboardPluginView()` (قالب بعلامة واحدة أو بعلامات متعددة)، و`generateDashboardPluginAssets()` (CSS/JS + نسخ الصورة المصغّرة)، و`setTranslations()` (مفاتيح القائمة/العنوان لكل لغة)، و`updateModuleConfig()` (يحقن `template_map` + `controller_plugins`) و`updateModuleFile()` (يُضيف `include` الإعداد إلى `Module.php`).
- مساعِدات: `getModuleExistingPlugins()` / `getExistingTranslatedPluginTitle()` (فحوص الأسماء المكرَّرة)، و`getTempThumbnail()`، و`generateFile()`، و`generateModuleNameCase()`، و`removeDir()`.

عندما تكون الوجهة **وحدة جديدة**، يُفوّض التوليد إنشاء الوحدة إلى `melis-tool-creator` (`MelisToolCreatorService::createTool()` بأداة `blank`)، ثم يُفعّلها (`ModulesService::activateModule()`) ويُبطل ذاكرتَي التخزين المؤقت لمسارات الوحدات وقائمة لوحة التحكم. يتطلّب التفعيل إعادة تحميل المنصّة.

## المكتب الأمامي

لا تحتوي هذه الوحدة على أي إضافات قوالب أو مساعِدات عرض للمكتب الأمامي — فهي أداة للمكتب الخلفي حصرًا. (أما العناصر التي *تُولّدها* فهي إضافات لوحة تحكم للمكتب الخلفي.)

## جداول قاعدة البيانات

لا يُعرّف MelisDashboardPluginCreator **أي جداول خاصة به** — فلا يُشحن معه SQL تثبيت ولا دلتا dbdeploy. تُحفظ كل الحالة في جلسة المعالج؛ ويُكتب الناتج مباشرةً في ملفات الوحدة المستهدفة.

## مثال

شغّل التوليد من البيانات المخزّنة أصلًا في جلسة المعالج (هذا ما تفعله الخطوة 5 / `POST /dpc/generate` خلف الكواليس):

```php
/** @var \MelisDashboardPluginCreator\Service\MelisDashboardPluginCreatorService $dpc */
$dpc = $serviceManager->get('MelisDashboardPluginCreatorService');

$success = $dpc->generateDashboardPlugin(); // true on success, false (and rolled back) on failure
```

يتبع العنصر المُولَّد القالب الموجود في `template/DashboardPluginController.php` — صنف يمتدّ من `MelisCoreDashboardTemplatingPlugin` بإجراء يُرجع `ViewModel`:

```php
class MyModuleMyWidgetPlugin extends MelisCoreDashboardTemplatingPlugin
{
    public function __construct()
    {
        $this->pluginModule = 'mymodule';
        parent::__construct();
    }

    public function myWidget()
    {
        $view = new ViewModel();
        $view->setTemplate('my-module/dashboard-plugins/my-widget');
        return $view;
    }
}
```

## الملفات الأساسية

| الشأن | المسار |
| --- | --- |
| بيان الوحدة | `vendor/melisplatform/melis-dashboard-plugin-creator/composer.json` |
| المسارات / الخدمة / المتحكّم / النموذج | `vendor/melisplatform/melis-dashboard-plugin-creator/config/module.config.php` |
| مسارات واجهة React البرمجية | `vendor/melisplatform/melis-dashboard-plugin-creator/config/react-api.php` |
| قدرات React | `vendor/melisplatform/melis-dashboard-plugin-creator/config/react.capabilities.php` |
| خطوات المعالج والنماذج والأيقونات وإعداد الصورة المصغّرة | `vendor/melisplatform/melis-dashboard-plugin-creator/config/app.tools.php` |
| خدمة التوليد | `vendor/melisplatform/melis-dashboard-plugin-creator/src/Service/MelisDashboardPluginCreatorService.php` |
| متحكّم واجهة React البرمجية | `vendor/melisplatform/melis-dashboard-plugin-creator/src/Controller/MelisReactApiDashboardPluginCreatorController.php` |
| متحكّم المعالج القديم (عرض Old) | `vendor/melisplatform/melis-dashboard-plugin-creator/src/Controller/DashboardPluginCreatorController.php` |
| مصدر لبنة React | `vendor/melisplatform/melis-dashboard-plugin-creator/ui-react/src/` |
| اللبنة المبنية + البيان | `vendor/melisplatform/melis-dashboard-plugin-creator/public/ui-react/` |
| قوالب الإضافة المُولَّدة | `vendor/melisplatform/melis-dashboard-plugin-creator/template/` |

::: tip ذات صلة
هذه هي النظيرة الخاصة بلوحة التحكم للأداة `melis-templating-plugin-creator` (إضافات قوالب المكتب الأمامي). ولفهم المنتَجات التي تُولّدها، اقرأ [الإضافات](/legacy/guide/plugins).
:::
