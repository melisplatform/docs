# MelisMarketPlace

> متجر وحدات داخل الواجهة الخلفية لاكتشاف وحدات Melis Platform وتنزيلها وتحديثها وإزالتها،
> ويُقدَّم الآن كفهرس React أصلي. الحزمة `melisplatform/melis-marketplace`.

## الغرض

MelisMarketPlace هو متجر الوحدات في الواجهة الخلفية: فهو يسرد كل حزمة منشورة على خادم Melis
Packagist، ويقارن كل إصدار مُثبَّت بأحدث إصدار منشور، ويتيح للمسؤول تنزيل الوحدات أو تحديثها أو
إزالتها — وتثبيت منتجات المواقع الكاملة — دون مغادرة الواجهة الخلفية. وهو يستدعي `MelisComposerService`
(melis-composerdeploy) للقيام بعمل Composer الفعلي، ويقرأ حالة الوحدة ويبدّلها عبر
`MelisAssetManagerModulesService` (melis-asset-manager).

هناك ست وحدات أساسية — **MelisCore, MelisEngine, MelisFront, MelisAssetManager,
MelisComposerDeploy, MelisDbDeploy** — مُدرجة كاستثناءات (مُعفاة) ولا تُعرَض أبدًا للتنزيل أو التحديث
أو الإزالة من المتجر.

في الواجهة الخلفية بنسخة v6 المبنية على React (`/melis-react`) تُوفِّر الأداة **لبِنة React كاملة أصلية**:
تُكتَب قائمة الفهرس وتفاصيل كل حزمة بلغة React وتقرأ من `react-api` بصيغة JSON مملوكة للوحدة.
أما آلية التثبيت / التحديث / الإزالة (Composer وdbdeploy والربط/فك الربط) فتظل دون تغيير ولا تزال تعمل
على جانب الخادم عبر المتحكّم القديم.

## تفعيلها

أضِف إلى `config/melis.module.load.php`:

```php
return [
    'MelisMarketPlace',
];
```

تتطلّب `melisplatform/melis-core: ^5.1` وPHP `^8.1|^8.3`. تُسجِّل الوحدة راية `dbdeploy: true`
بحيث تُطبَّق أي تعديلات على قاعدة البيانات تشحنها الوحدة عند أول تحميل. لا تظهر لبِنة React إلا عندما
تكون `MelisMarketPlace` موجودة في `config/melis.module.load.php`.

تُهيَّأ نقطة نهاية Packagist البعيدة في `config/app.interface.php` ضمن
`melismarketplace_toolstree_section/datas/melis_packagist_server`
(الافتراضي `http://marketplace.melisplatform.com/melis-packagist`).

## الواجهة الخلفية بـ React

**الموقع.** الشريط الجانبي الأيسر ← **Market Place** (أيقونة عربة التسوّق)؛ يُفتَح كعلامة تبويب علوية
باسم *Market Place*. قيمة `route` في البيان هي `/melis-marketplace`، و`forwardKey`
`MelisMarketPlace/MelisMarketPlace` يربط عقدة القائمة القديمة بها.

**الفهرس (القائمة).** شبكة قابلة للبحث من بطاقات الوحدات (صورة الغلاف، شعار المجموعة، العنوان،
شارة الإصدار، عدد التنزيلات، وشارات Installed / Update-available أو زر Download). أعلى الشبكة توجد
ثلاث **بطاقات مؤشرات أداء رئيسية (KPI)** (Packages / Installed / Updates available)، وصندوق بحث،
ومُحدِّد ترتيب (Downloads / Date added / Name)، وزر *Reset filters*، و**مُرشِّح المجموعة**
(All groups · Core · Cms · Marketing · Commerce · Sites)، ومُبدِّل **Bundles**، وزر تحديث (↻)،
ومُبدِّل **New / Old**. تُحمِّل الشبكة المزيد أثناء التمرير (تمرير لا نهائي). يعرض شريط جانبي أيمن
"Want your module listed?" و"Most downloaded packages".

![فهرس Market Place بـ React: بطاقات مؤشرات الأداء الرئيسية، والبحث، والترتيب، ومُرشِّحات المجموعة، وشبكة بطاقات الوحدات مع شريط جانبي "Most downloaded packages"](/screenshots/react/melis-marketplace/melismarketplace-tool-list.png)

**عرض المنتج (التفاصيل).** يفتح النقر على بطاقة عرض تفاصيل بـ React كاملة (دون إعادة تحميل الصفحة):
لافتة بارزة (شعار المجموعة، العنوان، شارات الحالة، أزرار الإجراءات)، ومعرض صور (شريط تمرير + عرض
مكبَّر بملء الشاشة)، والوصف، ولوحة *Additional information* (أحدث إصدار، والإصدار الحالي إن كان مُثبَّتًا،
وGitHub، وPackagist، واسم الحزمة، والتنزيلات). يُعيد زر **← back** إلى القائمة، التي تظل مركَّبة بحيث
يُحفَظ البحث / المُرشِّحات / موضع التمرير. **لا توجد علامات تبويب فرعية مضيفة** — إذ يكون الانتقال بين
القائمة والتفاصيل ⇄ حالةً داخلية، فتستخدم اللبِنة الواحدة علامة تبويب مضيفة واحدة بالضبط.

![عرض المنتج بـ React لوحدة: لافتة بارزة مع شارات الحالة وأزرار الإجراءات، ومعرض صور، والوصف، ولوحة Additional information](/screenshots/react/melis-marketplace/melismarketplace-tool-module-detail.png)

**مُبدِّل New / Old.** يمكن للقائمة التبديل بين واجهة React (*New*، الافتراضية) والأداة الكلاسيكية
المعروضة داخل إطار iframe (*Old*، `/melis/react-tool-page?key=melis_market_place_tool_display`). على
نوافذ العرض الضيّقة يصبح المُبدِّل مقتصرًا على الأيقونة.

**تعتمد أزرار الإجراءات** على حالة الحزمة وعلى صلاحيات المُستدعي:

| الزر | يُعرَض عندما | التأثير |
| --- | --- | --- |
| Download | الوحدة غير مُثبَّتة | جلب عبر Composer ← dbdeploy ← تفعيل |
| Update | مُثبَّتة و`need_update` | نفس عملية Composer على إصدار متأخّر |
| Remove | مُثبَّتة وغير مُعفاة | إلغاء التثبيت (مُعطَّل إذا اعتمدت عليها وحدات أخرى) |
| Private | حزمة خاصة/مقفلة | لوحة اتصال؛ يجب شراؤها |

يفتح كل إجراء نافذة **Manage** منبثقة بها وحدة تحكّم تقدُّم حيّة تبثّ مُخرَجات Composer / dbdeploy،
ثم تعرض *Activate module* / *Reload*. إذا تعذَّر الوصول إلى خادم Packagist
(`marketAccessible = false`) فإن واجهة React تُعطِّل التصفّح لكنها تُبقي الهيكل قائمًا.

## لبِنة React

لبِنة React كاملة أصلية مبنية باستخدام Vite (IIFE؛ مع تصدير React / ReactDOM / react-router-dom
إلى المتغيّرات العامة للمضيف). المصادر في `ui-react/src/`، وتُبنى إلى `public/ui-react/brick.js`
بجوار `brick.manifest.json`.

| حقل البيان | القيمة |
| --- | --- |
| `id` | `marketplace` (يجب أن يطابق المُعرِّف المُسجَّل في `brick.tsx`) |
| `route` | `/melis-marketplace` |
| `label` | `Market Place` |
| `forwardKey` | `MelisMarketPlace/MelisMarketPlace` |
| `melisKey` | `melis_market_place_tool_display` |
| `entry` | `brick.js` |
| `persistent` | `true` |
| `subTabs` | *غائب* — الانتقال بين القائمة والتفاصيل ⇄ حالة `openId` داخلية |

بما أن قسم قائمة Market Place عقدة قابلة للنقر مباشرةً / `is_parent_tool`، فإن المفتاح الحامل للصلاحيات
ومفتاح منطقة البيان هما **نفسه** (`melis_market_place_tool_display`). لا يمكن للبِنة استيراد وحدات
المضيف، لذا فهي تستخدم أنماطًا مضمّنة + متغيّرات CSS للسمة وقاموسًا `{fr,en}` داخل الملف مدفوعًا بلغة
المضيف (`melis-ui-lang` / `melis-ui-locale` في `localStorage`). تطلب البطاقات والمعرض لقطات شاشة
React أولًا مع وضع عنوان URL للصورة القديمة في `data-legacy`، مع الرجوع إليها عند الخطأ.

الملفات الرئيسية (`ui-react/src/`): `brick.tsx` (يُسجِّل `id: 'marketplace'`)، و`MarketPlacePage.tsx`
(القائمة + التفاصيل + نافذة الإدارة المنبثقة)، و`ViewToggle.tsx` (مُبدِّل New/Old)،
و`marketplace-api.ts` (عميل API للقراءة فقط)، و`shared/useCaps.ts` / `shared/useDebounce.ts` /
`shared/useIsNarrow.ts`.

## واجهة React البرمجية (React API)

تُعلَن مسارات الفهرس **للقراءة فقط** في `config/module.config.php`، مُتداخلةً تحت مسار
`application-MelisMarketPlace` (الأساس `/melis/MelisMarketPlace/react-api`) — **مملوكة للوحدة**،
لا تحت عقدة `melis-react-api` المشتركة. المتحكّم:
`MelisMarketPlace\Controller\MelisMarketPlaceReactApiController` (الاسم المستعار القابل للاستدعاء
`MelisMarketPlace\Controller\MelisMarketPlaceReactApi`). العقد `{ success, data, error }`؛ وكل
عملية جلب ترسل `X-Requested-With: XMLHttpRequest` و`credentials: 'include'`.

| الطريقة والعنوان | الإجراء | الغرض |
| --- | --- | --- |
| `GET …/react-api/packages` | `packages` | القائمة (`page`, `limit`, `search`, `group`, `orderBy`, `order`, `bundle`) ← `{items, page, pageCount, limit, marketAccessible}` |
| `GET …/react-api/packages/:id` | `get` | تفاصيل حزمة واحدة (`images`, `currentVersion`, `isExempted`, versionStatus…) |
| `GET …/react-api/groups` | `groups` | مجموعات الحزم ← `{groups, marketAccessible}` |
| `GET …/react-api/stats` | `stats` | مؤشرات الأداء الرئيسية `{total, installed, needUpdate, marketAccessible}` |
| `GET …/react-api/status` | `status` | حالة إصدار كل وحدة (`need_update` / `up_to_date` / `in_advance`) |

كل إجراء قراءة محميّ بواسطة `denyUnlessAccess()` — المصادقة (`MelisCoreAuth::hasIdentity`) **و**
`MelisCoreRights::canAccess('melis_market_place_tool_display')`، مع إرجاع **401 / 403** — فلا تُعدّ
واجهة JSON البرمجية بابًا خلفيًا. يُعيد المتحكّم استخدام `MelisMarketPlaceService`
(`compareLocalVersionFromRepo`، وتهيئة أحدث إصدار مسبقًا) و`MelisAssetManagerModulesService`
(الإصدارات المُثبَّتة / قائمة الوحدات) ويقرأ نقاط نهاية Packagist بصيغة JSON، تمامًا كالأداة القديمة.

> **الإجراءات المُعدِّلة ليس لها مسار في react-api.** يُنفَّذ التنزيل / التحديث / الإزالة أصليًا
> بواسطة `ManageModal`، الذي يُعيد تشغيل تنسيق JavaScript القديم باستدعاء المتحكّم **القديم** للوحدة
> مباشرةً (`/melis/MelisMarketPlace/MelisMarketPlace/…`): `melisMarketPlaceProductDo`
> (وحدة تحكّم مبثوثة)، و`reDumpAutoload`، و`execDbDeploy`، و`plugModule` / `unplugModule`،
> و`executeComposerScripts`، و`getSetupModuleForm`، و`activateModule`، و`isPackageDirectoryRemovable`،
> و`changePackageDirectoryPermission`، و`getModuleTables`، و`exportTables`، إضافةً إلى
> `/melis/MelisCore/Modules/getDependents` لأجل فحص تبعيّات الإزالة.

## الصلاحيات

مُعلَنة في `config/react.capabilities.php`، ومدموجة تحت `melisReactToolCapabilities` بواسطة
`MelisMarketPlace\Module::getConfig()`. مفتاحها هو نفس melisKey المستخدم في البيان وحارس الوصول
(`melis_market_place_tool_display`)، بما أن القسم قابل للنقر مباشرةً:

```
melis_market_place_tool_display
└─ actions: list · download · remove
```

`list` = تصفّح الشبكة؛ `download` = جلب Composer الذي يُثبِّت (Download) ويُحدِّث (Update) معًا؛
`remove` = إلغاء التثبيت. هذه **بوّابات خاصة بـ React فقط** (السماح افتراضيًا، تصريحية): يفرض المتحكّم
**الوصول** فقط (`denyUnlessAccess`)، ولا يستدعي `denyUnlessCan`. في React تقرأها اللبِنة عبر
`useCaps('melis_market_place_tool_display')` — يُبوِّب `can('list')` الشبكة، و`can('download')` أزرار
Download / Update، و`can('remove')` زر Remove (المخفيّ أيضًا للوحدات المُعفاة).

## الخدمات الرئيسية

| الاسم المستعار للخدمة | الدور |
| --- | --- |
| `MelisMarketPlaceService` | مقارنة الإصدارات، والربط/فك الربط، وإرسال نموذج ما بعد الإعداد لكل وحدة. |
| `MelisMarketPlaceSiteService` | إنشاء موقع ويب كامل من حزمة `melisplatform-site`. |

### `MelisMarketPlaceService`

يمتدّ من `MelisGeneralService`.

```php
$mp = $serviceManager->get('MelisMarketPlaceService');

// Compare installed vs latest — returns one of the constants below.
$status = $mp->compareLocalVersionFromRepo('MelisCmsSlider', 'v5.1.3');
// MelisMarketPlaceService::NEED_UPDATE  (-1)
// MelisMarketPlaceService::UP_TO_DATE   (1)
// MelisMarketPlaceService::IN_ADVANCE   (2)  — running a dev-… build

// Toggle a module on/off (rewrites the active-module loader via asset-manager).
$mp->plugModule('MelisCmsSlider');
$mp->unplugModule('MelisCmsSlider');
```

يُطلِق `compareLocalVersionFromRepo()` زوج الأحداث
`melismarketplace_compare_local_version_from_repo_start` / `…_end` بحيث يمكن للمستمِعين تجاوز الحالة
المحسوبة.

**اصطلاح ما بعد الإعداد لكل وحدة.** يمكن للوحدة أن تشحن `MelisSetupPostDownloadController`
و/أو `MelisSetupPostUpdateController` في مساحة الأسماء `Controller\` الخاصة بها، مع كشف
`$showOnMarketplacePostSetup = true` والإجراءات `getFormAction` و`validateFormAction` و`submitAction`.
يُحوِّل MarketPlace إليها لعرض نموذج الإعداد ومعالجته.

### `MelisMarketPlaceSiteService`

يمتدّ من `MelisGeneralService`. يُنشئ موقع ويب كاملًا من حزمة `melisplatform-site`:
يُنشئ صفوف `melis_cms_site` / الصفحة الرئيسية / اللغات، ويُخصِّص نطاقات جديدة من page-id وplatform-id
وtemplate-id، ويُنشئ جداول CMS الخاصة بالوحدة عبر `Support\MelisMarketPlaceCmsTables` /
`Support\MelisMarketPlaceSiteInstall`.

```php
$site = $serviceManager->get('MelisMarketPlaceSiteService');
$site->marketplaceInstallSite($request);   // reads POST: name, scheme, domain, module, action
```

استثناءات مُصنَّفة (في `src/Exception/`): `EmptySiteException`،
و`PlatformIdMaxRangeReachedException`، و`TemplateIdMaxRangeReachedException`،
و`ArrayKeyNotFoundException`، و`FileNotFoundException`.

## الأداة القديمة (عرض Old)

تظل الأداة الكلاسيكية متاحة خلف مُبدِّل New/Old ولا تزال تملك التدفّق المُعدِّل.
`melisMarketPlaceProductDoAction()` هي نقطة النهاية الوحيدة لإجراءات الفهرس: فهي تُطلِق
`melis_marketplace_product_do_start`، وتُبدِّل بحسب الإجراء
(`MelisComposerService::DOWNLOAD / UPDATE / REMOVE`)، ثم تُطلِق `melis_marketplace_product_do_finish`
لتوجيه ملاحظات flash-messenger. قبل الإزالة، تمرّ على تبعيّات الوحدة المستهدفة، وتبعيّات كل الوحدات
الأخرى النشطة، وكتلة `require` في `composer.json` الخاص بجذر المشروع، لمنع إزالة تبعيّة مشتركة.

يتحكّم فحصان في قابلية استخدام المتجر (كلاهما في `MelisMarketPlaceController`):

- `isMarketplaceAccessible()` — ما إذا كان خادم Packagist قابلًا للوصول وكانت الميزة مُفعَّلة.
- `allowUpdate()` — يقرأ `melis_core_platform.plf_update_marketplace` للمنصّة الحالية
  (متغيّر البيئة `MELIS_PLATFORM`)؛ يمكن للمنصّة التي فيها `plf_update_marketplace = 0` التصفّح
  لكن ليس التنزيل أو التحديث.

يتولّى `MelisSetupController` معالجة مسار `/MelisMarketPlace/setup` المستقل (إعداد كل وحدة خارج
شجرة واجهة الواجهة الخلفية).

## الأحداث

| الحدث | يُطلِقه | الغرض |
| --- | --- | --- |
| `melismarketplace_compare_local_version_from_repo_start` / `_end` | `compareLocalVersionFromRepo` | ربط نتيجة حالة الإصدار المحسوبة أو تجاوزها. |
| `melis_marketplace_product_do_start` | `melisMarketPlaceProductDo` | قبل إجراء تنزيل أو تحديث أو إزالة. |
| `melis_marketplace_product_do_finish` | `melisMarketPlaceProductDo` | بعد الإجراء — يوجّه ملاحظات flash-messenger. |

## جداول قاعدة البيانات

لا تُعرِّف MelisMarketPlace أي جداول خاصة بها. عندما تشحن وحدة مُنزَّلة تعديلات على قاعدة البيانات،
تُطبَّق عبر `execDbDeployAction()` (melis-dbdeploy). أما عمليات تثبيت منتجات المواقع فتكتب في جداول
CMS الموجودة أصلًا للمنصّة (المُخصَّصة عبر `MelisMarketPlaceSiteService`).

## الملفات الرئيسية

| الموضوع | المسار |
| --- | --- |
| بيان الوحدة | `vendor/melisplatform/melis-marketplace/composer.json` |
| المسارات / الخدمات / react-api / المتحكّمات | `vendor/melisplatform/melis-marketplace/config/module.config.php` |
| صلاحيات React | `vendor/melisplatform/melis-marketplace/config/react.capabilities.php` |
| شجرة الأدوات، وأيقونة الرأس، وتهيئة Packagist | `vendor/melisplatform/melis-marketplace/config/app.interface.php` |
| متحكّم واجهة React البرمجية | `vendor/melisplatform/melis-marketplace/src/Controller/MelisMarketPlaceReactApiController.php` |
| المتحكّم الرئيسي (القديم) | `vendor/melisplatform/melis-marketplace/src/Controller/MelisMarketPlaceController.php` |
| خدمة التثبيت/التحديث/الربط | `vendor/melisplatform/melis-marketplace/src/Service/MelisMarketPlaceService.php` |
| خدمة تثبيت المواقع | `vendor/melisplatform/melis-marketplace/src/Service/MelisMarketPlaceSiteService.php` |
| مصادر لبِنة React | `vendor/melisplatform/melis-marketplace/ui-react/src/` |
| اللبِنة المبنيّة + البيان | `vendor/melisplatform/melis-marketplace/public/ui-react/` |
| الاستثناءات | `vendor/melisplatform/melis-marketplace/src/Exception/` |

انظر أيضًا: [melis-composerdeploy](/ar/reference/modules/melis-composerdeploy) ·
[melis-asset-manager](/ar/reference/modules/melis-asset-manager) ·
[melis-dbdeploy](/ar/reference/modules/melis-dbdeploy) ·
[melis-core](/ar/reference/modules/melis-core)
