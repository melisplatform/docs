# MelisReactApi

> العمود الفقري لواجهة JSON البرمجية الخاصة بالمكتب الخلفي المبني على React (`/melis-react`): يُقلع الغلاف (shell)، ويقدّم بيانات القائمة/المستخدم/الأصول/الاكتشاف/لوحة المعلومات، ويستضيف محلّل القدرات. الحزمة `melisplatform/melis-react-api`.

## الغرض

يُعدّ MelisReactApi **بنية تحتية، وليس أداة**. فهو لا يرسم أي واجهة مستخدم، ولا يشحن أي لَبِنة (brick)، ولا يضيف أي مدخل في الشريط الجانبي. وهو يكشف نقاط النهاية العامة `/melis/react-api/…` من نوع JSON التي يستدعيها غلاف React (الذي يقدّمه MelisReactOverride على المسار `/melis-react`) عند الإقلاع وعند التنقّل، كما يستضيف **محلّل القدرات** (`Capabilities` + `CapabilityGuardTrait`) الذي تعيد وحدات التحكّم في الأدوات الخاصة بكل وحدة استخدامه للتحكّم في "حقوقها المتقدّمة".

كل ما يعرضه الغلاف ولا يكون شاشة خاصة بأداة بعينها يأتي من هنا: القائمة اليسرى (المُرشّحة حسب الحقوق)، ومستخدم/صورة رمزية الترويسة ومبدّل اللغة، وبلاطات لوحة المعلومات ومؤشرات الأداء الرئيسية (KPIs)، واكتشاف اللبنات المعياري، ومصفوفة الحقوق المتقدّمة في المستخدمون ← الحقوق. أما نقاط النهاية الخاصة بكل أداة ومساراتها وتصريحات قدراتها فتوجد في **وحداتها الخاصة** (مثل `/users` و`/roles` المُصرّح بها في MelisCore / MelisSmallBusiness)، وليس هنا.

**لا توجد شاشات React ولا لقطات شاشة** لهذه الوحدة — تصف الأقسام أدناه عقد الواجهة البرمجية (API contract) الذي يُستخدم عند التخاطب مع المكتب الخلفي المبني على React.

## تفعيلها

يُعدّ MelisReactApi وحدة أساسية من وحدات المكتب الخلفي المبني على React. وهي **ليست** مُثبَّتة عبر composer في وحدة تخزين vendor الخاصة بـ Docker؛ بل يجري تحميلها عبر `config/application.config.php` `module_paths` (الفرع `melis-react`)، ويقوم `src/Module.php` بالتحميل التلقائي لأصنافها عبر `StandardAutoloader`. وهي تعمل جنبًا إلى جنب مع **MelisReactOverride** (آلية الإطار المضمّن/الأداة + مسار غلاف التطبيق أحادي الصفحة SPA) ومع **melis-core/ui-react** (تطبيق React الذي يستهلك هذه الواجهة البرمجية — راجع عملاءه في `src/lib/*-api.ts`).

وهي تُصرّح بمساراتها مباشرة في `config/module.config.php` (لا يوجد `config/react-api.php`) ولا تُصرّح بأي قدرات خاصة بها (فهي المحرّك الذي *يقرأ* تصريحات الوحدات الأخرى).

## حضور React لمحةً

| الخاصية | القيمة |
| --- | --- |
| اللبنة / البيان (manifest) | **لا شيء** — لا يشحن أي `public/ui-react/brick.manifest.json` |
| مصدر `ui-react/` | **لا شيء** — لا يوجد مشروع Vite، ولا مكوّنات React |
| وحدة التحكّم | `MelisReactApi\Controller\MelisReactApiController` (الاسم البديل القابل للاستدعاء `MelisReactApi\Controller\MelisReactApi`) |
| المسار الأساسي | `melis-backoffice` ← `react-api` (أي `/melis/react-api/…`) |
| المصادقة | `isAuthenticated()` (MelisCoreAuth) لكل إجراء، **باستثناء** `/langs` (عمومية، تُحمَّل في شاشة تسجيل الدخول) |
| عقد الاستجابة | `{ success: bool, data: T, error?: string }` (JSON خام، بلا تخطيط) |

يُعيد كل إجراء استجابة `Response` من نوع JSON خام عبر الدالة الموروثة `jsonResponse()`، بحيث لا يلفّ Laminas أي تخطيط حولها. تستدعي الإجراءات المخصّصة للقراءة فقط `releaseSessionLock()` مبكرًا كي لا تتسلسل طلبات الإقلاع المتزامنة التي تتشارك ملف تعريف الارتباط الخاص بالجلسة.

## نقاط النهاية العامة

جميعها تحت `/melis/react-api/…`. اثنتا عشرة نقطة نهاية عامة، كلها تربط إلى `MelisReactApiController`. كل استجابة هي `{ success, data, error? }` (رمز 401 عند فشل حارس `isAuthenticated()`، باستثناء `/langs`).

| الطريقة + المسار | الإجراء | شكل `data` |
| --- | --- | --- |
| `GET /me` | `meAction` | `{ id, name, login, email, picture, isAdmin, capabilities }` — `capabilities` = خريطة `melisKey → string[]` للقدرات المسموح بها (المسؤول ⇐ كل شيء). |
| `GET /menu` | `menuAction` | `NavNode[]` — شجرة التنقّل المُرشّحة حسب الحقوق. تُعيد `?full=1` الشجرة **غير المُرشّحة** (لمحرّر الحقوق فقط؛ تتطلّب `canAccess('meliscore_tool_user')`). |
| `GET /langs` | `langsAction` | `{ current: { id, locale }, langs: [{ id, locale, short, label }] }` — **عمومية**. |
| `GET /assets` | `assetsAction` | روابط CSS/JS + متغيّرات JS العامة المضمّنة لإقلاع أُطُر الأدوات المضمّنة (تفوّض إلى `MelisReactOverride\Service\PlatformAssetsService::build()`). |
| `GET /react-modules` | `reactModulesAction` | `{ data: BrickDef[], bundle: { url } }` — لبنات الوحدات النشطة؛ `bundle.url` = ملف JS المُدمَج. |
| `GET /bricks-bundle.js` | `bricksBundleAction` | **ليست JSON** — دالة IIFE الخاصة بكل لبنة نشطة مُدمَجة في استجابة JavaScript واحدة مخزّنة تخزينًا غير قابل للتغيير. |
| `GET /dashboard/bubbles` | `dashboardBubblesAction` | عدّادات `{ news, updates, notifications:{count,items}, messages }` (تتراجع إلى 0، ولا تُرجع 404 أبدًا). |
| `GET /dashboard/stats` | `dashboardStatsAction` | `{ kpis:{ users, sites, pages, languages }, activity:[{ id, name, loginDate }] }`. |
| `GET /dashboard/legacy-plugins` | `legacyDashboardPluginsAction` | `[{ pluginName, title, icon, section, w, h }]` — إضافات لوحة المعلومات القديمة كعناصر واجهة (widgets) ضمن إطارات مضمّنة. |
| `GET \| POST /dashboard/layout` | `dashboardLayoutAction` | GET ← البلاطات المحفوظة `[{ pluginName, pluginId, x, y, w, h }]`؛ POST ← نفس JSON، يُحفَظ في `melis_core_dashboards`. |
| `GET /rights/dashboard-plugins` | `rightsDashboardPluginsAction` | `[{ key, title, module }]` — قائمة إضافات لوحة المعلومات المرجعية لمحرّر الحقوق (`?userId=`). |
| `GET /rights/capabilities` | `rightsCapabilitiesAction` | خريطة `melisKey → شجرة القدرات` **المُصرَّح بها** من قِبَل الوحدات، مع ترجمة تسميات `tr_*` إلى لغة الجلسة. |

**مجموعة الإقلاع:** `/me` و`/menu` و`/langs` و`/assets` و`/react-modules` (+ `/bricks-bundle.js`). تدعم نقاط النهاية `/dashboard/*` و`/rights/*` لوحة المعلومات ومحرّر المستخدمون ← الحقوق.

نقاط بيانات الأداة الخاصة **ليست** هنا: `/melis/react-api/users…` و`/users/stats` و`/roles` مُصرَّح بها في **MelisCore**؛ و`/roles-list` و`/roles/save|stats|:id` و`/workflow/roles` في **MelisSmallBusiness**؛ ومسارات الذكاء الاصطناعي في **MelisAI**. أما العملاء الذين يستدعون هذه المجموعة العامة فيوجدون في `melis-core/ui-react/src/lib/melis-api.ts`.

مثال جلب حقيقي — استدعاء الإقلاع `/me` الذي يقوم به الغلاف:

```ts
// mirrors melis-core/ui-react/src/lib/melis-api.ts
const res = await fetch('/melis/react-api/me', {
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
  credentials: 'include',
})
const json = await res.json()                    // { success, data, error? }
if (!json.success) throw new Error(json.error)   // 401 → { success:false, error:'Unauthenticated' }
const { name, isAdmin, capabilities } = json.data
// capabilities: Record<melisKey, string[]>
// e.g. { melis_core_announcement_tool: ['list','create','edit'] }
```

## القدرات — المحلّل

هذا هو الجوهر الذي يقدّمه MelisReactApi إلى الوحدات *الأخرى*: نظام "الحقوق المتقدّمة" الذي يتحكّم في **المكوّنات الداخلية** لأداة سبق التصريح بالوصول إليها (قائمة / إنشاء / تعديل / حذف / علامات تبويب متداخلة)، *على نحو تابع لـ* فحص الوصول إلى الأداة (`MelisCoreRights::canAccess`، دون تغيير).

**التصريح (في كل وحدة، وليس هنا).** تُصرّح الوحدة، لكل أداة `melisKey`، بالقدرات الموجودة عبر مفتاح الإعداد المُدمَج `melisReactToolCapabilities` (`config/react.capabilities.php`، المُدمَج في `Module::getConfig()` الخاص بها):

```php
// <module>/config/react.capabilities.php  (declared BY the tool's module)
return [
  'melisReactToolCapabilities' => [
    'melis_core_announcement_tool' => ['list', 'create', 'edit', 'delete'],
    // or a TREE for nested tabs with their own actions:
    // 'some_tool' => ['actions' => ['list'], 'tabs' => [['key' => 'variants', 'actions' => ['list','create']]]],
  ],
];
```

**المحلّل — `MelisReactApi\Service\Capabilities`** (كله ثابت static؛ `const CONFIG_KEY = 'melisReactToolCapabilities'`، `const SECTION = 'meliscore_tool_capabilities'`):

| الدالة | الدور |
| --- | --- |
| `declared($appConfig)` | الخريطة الخام المُصرَّح بها (يعرضها محرّر الحقوق). |
| `flatten($node)` | تسطيح قائمة مسطّحة أو شجرة `{ actions, tabs }` إلى سلاسل نصية منقّطة (مثل `variants.list`). |
| `deniedFor($rightsXml, $toolKey)` | قائمة المنع المقروءة من ملف XML الخاص بحقوق المستخدم/الدور. |
| `isAllowed($appConfig, $rightsXml, $toolKey, $cap)` | **السماح افتراضيًا** — مسموح ما لم تكن القدرة مُصرَّحًا بها *و* مدرجة في قائمة المنع في آنٍ واحد. |
| `allowedForUser($appConfig, $rightsXml)` | خريطة `melisKey → allowedCaps[]` المُعادة في `/me` (`$rightsXml = null`، مثلًا المسؤول ⇐ كل شيء). |

**التخزين.** تُخزَّن حالات المنع في قسم مخصّص من ملف XML الخاص بحقوق المستخدم/الدور، منفصل عن قائمة المنع القديمة كي يتجاهله المكتب الخلفي الكلاسيكي:

```xml
<meliscore_tool_capabilities>
  <tool key="melis_core_announcement_tool"><deny>delete</deny></tool>
</meliscore_tool_capabilities>
```

يتولّى الحفاظ على هذا القسم عند الحفظ **القديم** الوحداتُ المعنية (MelisCore بالنسبة إلى المستخدم USER، وMelisSmallBusiness بالنسبة إلى الدور ROLE).

**الحارس — `MelisReactApi\Controller\CapabilityGuardTrait`.** تقوم وحدة التحكّم في أداة خاصة بكل وحدة باستخدام (`use`) هذا الـ trait، وتعرّف `const MELIS_KEY = '<the tool's melisKey>'`، وتستدعي `denyUnlessCan($cap)` **بعد** فحص الوصول إلى أداتها:

```php
use MelisReactApi\Controller\CapabilityGuardTrait;

class MelisReactApiFooController extends MelisAbstractActionController
{
    use CapabilityGuardTrait;
    const MELIS_KEY = 'melis_core_announcement_tool'; // the rights-bearing tool node

    public function saveAction()
    {
        if ($resp = $this->denyUnlessCan('edit')) return $resp;   // 403 JSON if denied
        // …call the module's Laminas service…
    }
}
```

تقرأ `denyUnlessCan` الحقوق **الفعّالة** (`MelisCoreAuth::getAuthRights()` ← المستخدم أو الدور)، و**يتجاوزها المسؤولون**، وهي **تسمح افتراضيًا** — فالأداة التي لا تصريح لها تحتفظ بكامل عمليات CRUD. وعلى جانب العميل، تصل خريطة السماح نفسها في `/me` عبر `data.capabilities` وتتحكّم في واجهة المستخدم (`melis-core/ui-react/src/lib/caps.ts`).

## التكامل مع المضيف

- **الاكتشاف / اللبنات** — يفحص `GET /react-modules` الوحدات **النشطة** بحثًا عن `public/ui-react/brick.manifest.json` (كائن واحد أو مصفوفة `bricks: [...]`) ويُعيد `BrickDef = { id, module, route, label, forwardKey, melisKey, subTabs, persistent, bundleUrl }`، إضافةً إلى `bundle.url = /melis/react-api/bricks-bundle.js?v=<sig>`. يحمّل الغلاف الحزمة المُدمَجة الواحدة (كل لبنة هي دالة IIFE تسجّل نفسها بمعرّفها id على `window.__MELIS_BRICK_COMPONENTS__` عبر `window.__melisRegisterBrick`، ملفوفةً في try/catch). ويجعل توقيع `?v=` (الاسم + وقت التعديل + الحجم لكل حزمة) التخزين المؤقت غير القابل للتغيير لمدة عام واحد آمنًا. توجد اللبنة **إذا وفقط إذا** كانت وحدتها نشطة — وهي قاعدة المعيارية.
- **باني القائمة (`GET /menu`)** — يجول عبر واجهة القائمة اليسرى، ويطبّق ترتيب الأقسام/الأدوات، ويُصدر `NavNode[]` حيث تكون كل عقدة `{ key, name, icon, melisKey, isTool, forward, hasNavChild, configChildCount, children }`. **القسم** العلوي حاويةٌ (يُقلَّم فقط إن كان فارغًا)؛ ويخضع القسم القابل للنقر `is_parent_tool` للتحكّم عبر `canAccess(target)`؛ وتستخدم الأقسام المُثبَّتة حديثًا وغير المعروفة حقوقًا متساهلة كي تبقى مرئية. يوسّعها خطّافان (hooks): `melisReactSidebarHostSections` (يُبقي قسمًا فارغًا كحاوية مضيفة مجرّدة للشريط الجانبي تحمل `sidebarModule`) و`melisReactRightsTools` (يحقن عقد أدوات اصطناعية للحقوق فقط، `?full=1` حصرًا).
- **جسر المصادقة / الأصول** — يُعيد `/assets` نفس CSS/JS الذي يحمّله ملف `layoutCore.phtml` القديم (مُفوَّضًا إلى `MelisReactOverride\Service\PlatformAssetsService`)، بحيث تُقلع أُطُر الأدوات المضمّنة بالطريقة نفسها داخل غلاف React.
- **التعريب (i18n)** — تُترجَم تسميات `tr_*` (أسماء أقسام القائمة، تسميات علامات تبويب القدرات) إلى لغة الجلسة الحالية (حاوية `meliscore` عبر `melis-lang-locale`) بواسطة `MelisCoreTranslation`؛ وتُصرّح الوحدات بـ**المفاتيح**، لا بنص مكتوب مباشرةً.

## الملفات الرئيسية

| الشأن | المسار |
| --- | --- |
| بيان الوحدة / أداة التحميل التلقائي | `melis-react-api/src/Module.php` |
| المسارات + وحدة التحكّم القابلة للاستدعاء | `melis-react-api/config/module.config.php` |
| الإجراءات العامة (12) | `melis-react-api/src/Controller/MelisReactApiController.php` |
| الـ trait الخاص بحارس القدرات | `melis-react-api/src/Controller/CapabilityGuardTrait.php` |
| محلّل القدرات | `melis-react-api/src/Service/Capabilities.php` |

اطّلع أيضًا على: [melis-core](/ar/reference/modules/melis-core) ·
[melis-small-business](/ar/reference/modules/melis-small-business) ·
[melis-ai](/ar/reference/modules/melis-ai)
