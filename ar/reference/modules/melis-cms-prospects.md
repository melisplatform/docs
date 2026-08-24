# MelisCmsProspects

> إدارة العملاء المحتملين / جهات الاتصال: نموذج اتصال في الواجهة الأمامية يلتقط رسائل الزوّار كعملاء محتملين، وواجهة React في المكتب الخلفي تتيح لك تصفّحهم وتصفيتهم وتحريرهم وتصديرهم وحذفهم، إضافةً إلى تصنيف الطلبات حسب السمات. الحزمة `melisplatform/melis-cms-prospects`.

## الغرض

يلتقط `MelisCmsProspects` عمليات إرسال نموذج الاتصال من الزوّار بوصفها **عملاء محتملين** (leads) تُخزَّن في
قاعدة البيانات. يتصفّح مستخدمو المكتب الخلفي هؤلاء العملاء المحتملين ويصفّونهم ويحرّرونهم ويصدّرونهم (CSV/Excel) ويحذفونهم،
ويصنّفونهم حسب **السمات**. توفّر الوحدة أداة إحصائيات في لوحة المعلومات وتتكامل مع
أدوات GDPR في المنصّة (معلومات المستخدم / الاستخراج / الحذف + دورة الحذف التلقائي).

في Melis v6، تكون أداتا المكتب الخلفي — **Prospects** و**Themes** — **واجهتين كاملتين بالكامل بلغة React
أصليّتين** تُقدَّمان تحت `/melis-react`، وتتخاطب كلٌّ منهما مع طبقة JSON من نوع `react-api`. أمّا نموذج
البيانات الأساسي والخدمات وإضافة Show Form في الواجهة الأمامية وربط GDPR فتبقى دون تغيير عن v5.

## تفعيلها

أضِف إلى `config/melis.module.load.php`:

```php
return [
    'MelisCmsProspects',
];
```

التبعيات: `melis-core` و`melis-engine` و`melis-front` و`melis-cms` و
`laminas/laminas-mvc-plugin-flashmessenger`. الوحدة من نوع `dbdeploy: true` — تُنشأ جداولها
وتُحدَّث عبر آلية dbdeploy. تظهر أداتا React في المكتب الخلفي فقط
عندما تكون الوحدة نشطة (يجري اكتشافهما من ملف `brick.manifest.json` الخاص بها).

## المكتب الخلفي بلغة React

**الموضع:** الشريط الجانبي الأيسر ← **MelisMarketing** ← **Prospects** ← **Prospects** / **Themes**. تفتح كلّ
واحدة كعلامة تبويب علوية خاصة بها. تحتفظ كل أداة بمفتاح تبديل **New / Old**: يمثّل *New* واجهة React
(الافتراضية)، ويعرض *Old* الأداة القديمة داخل إطار iframe (`/melis/react-tool-page?key=<melisKey>`).

تُشحن قطعتا brick في حزمة واحدة (`public/ui-react/brick.manifest.json`):

| العنصر | Prospects | Themes |
| --- | --- | --- |
| معرّف brick / المسار | `prospects` — `/prospects` | `prospect-themes` — `/prospect-themes` |
| `forwardKey` (القائمة ← المسار) | `MelisCmsProspects/ToolProspects` | `MelisCmsProspects/ProspectThemes` |
| `melisKey` لإطار العرض القديم (المنطقة) | `MelisCmsProspects_tool_prospects` | `MelisCmsProspects_tool_themes` |
| melisKey للصلاحيات / القدرة | `melisprospects_tool_prospects_section` | `melisprospects_tool_themes_section` |
| أساس واجهة API | `/melis/react-api/prospects` | `/melis/react-api/prospect-themes` |
| المتحكّم | `MelisReactApiProspectController` | `MelisReactApiProspectThemeController` |

> ملاحظة: إنّ `melisKey` في البيان هو مفتاح **المنطقة** القابلة للعرض المستخدَم لإطار العرض القديم —
> ولا تتعلّق الصلاحيات به. يعتمد حارس الوصول والقدرات على عقدة القائمة
> `melisprospects_tool_..._section` (المُصرَّح عنها في `config/app.interface.php`).

### أداة Prospects

![أداة Prospects بلغة React: بطاقات KPI (الإجمالي / هذا الشهر / المتوسط الشهري / المُجهَّل)، البحث، مرشّح All-sites ومرشّح All-types، منتقي نطاق تاريخ Date، إعادة تعيين المرشّحات، مدير الأعمدة، التصدير، مفتاح تبديل New/Old وزر تحديث — لكل صف إجراءا تحرير وحذف](/screenshots/react/melis-cms-prospects/meliscmsprospects-tool-prospects-list.png)

ترى **كل عميل محتمل على المنصّة**. تحتوي القائمة على **أربع بطاقات KPI** (الإجمالي، هذا الشهر،
المتوسط الشهري، المُجهَّل)، ومربّع **بحث** (الاسم / البريد الإلكتروني / الهاتف / الشركة)، ومرشّح **موقع**،
ومرشّح **نوع**، ومنتقي نطاق تاريخ **Date** (اليوم / الأمس / آخر 7 / آخر 30 / هذا
الشهر / الشهر الماضي / مخصّص)، و**إعادة تعيين المرشّحات**، ومدير **أعمدة** محفوظ، و**التصدير**،
وزر تحديث. انقر على ترويسة لـ**الفرز** (جميع الأعمدة عدا *Message*). لكل صف **تحرير**
و**حذف**.

العملاء المحتملون **لا يُنشأون** هنا — إنّهم يصلون فقط من نموذج الاتصال في الواجهة الأمامية. يؤدّي النقر على
**تحرير** إلى فتح العميل المحتمل كـ**علامة تبويب فرعية** مضيفة (← Back) تعرض نموذج React: بطاقة **معلومات
الاتصال** (الاسم، البريد الإلكتروني، الهاتف، الشركة، البلد)، وبطاقة **Message**، وبطاقة **التفاصيل**
الجانبية (منتقي **Site**، منتقي **Theme**، وتاريخ **Contact date** للقراءة فقط). لا يوجد حقل إلزامي
(يُتحقَّق من صيغة البريد الإلكتروني فقط إذا كان مملوءًا)؛ ويكون **Contact date** و**type** غير قابلين للتغيير — إذ يُعيَّنان
عند وقت الالتقاط بواسطة نموذج الواجهة الأمامية.

![نموذج تحرير العميل المحتمل بلغة React — بطاقة معلومات الاتصال (الاسم، البريد الإلكتروني، الهاتف، الشركة، البلد)، ومربّع Message، وبطاقة التفاصيل الجانبية (Site، Theme، وتاريخ Contact date للقراءة فقط)؛ يعرض شريط علامة التبويب الفرعية التنقّل التفصيلي (← Back · Paul Martin)](/screenshots/react/melis-cms-prospects/meliscmsprospects-tool-prospects-edit.png)

### أداة Themes

تعرض قائمة Themes **بطاقتَي KPI** (إجمالي السمات، إجمالي العناصر)، ومربّع **بحث**، و**إعادة تعيين
المرشّحات**، ومدير **أعمدة**، و**التصدير**، ومفتاح تبديل **New/Old** و**+ New theme**. يعرض كل صف
**اسم** السمة و**عدد عناصرها**، مع ثلاثة إجراءات: **إعادة تسمية** (نافذة منبثقة بحقل واحد)،
و**تحرير** (يفتح علامة التبويب الفرعية **Items** للسمة)، و**حذف**.

![أداة Themes بلغة React: بطاقتا KPI للإجمالي / العناصر، البحث، إعادة تعيين المرشّحات، الأعمدة، التصدير، مفتاح تبديل New/Old و"+ New theme" — يكشف كل صف عن إعادة التسمية والتحرير (فتح العناصر) والحذف](/screenshots/react/melis-cms-prospects/meliscmsprospects-tool-themes-list.png)

![النافذة المنبثقة "New theme" — حقل Name واحد (يحافظ الطرف الخلفي على الرمز، ولا يُدخَل هنا)](/screenshots/react/melis-cms-prospects/meliscmsprospects-tool-themes-new-modal.png)

يؤدّي تحرير سمة إلى فتح لوحة **Items** الخاصة بها كعلامة تبويب فرعية (← Back + اسم السمة): قائمة عناصر قابلة
للبحث (المعرّف + الاسم) مع تحرير/حذف لكل صف و**+ New item**. تؤدّي إضافة عنصر أو تحريره إلى فتح
نافذة منبثقة تلتقط **اسمًا لكل لغة من لغات CMS** — صفّ من علامات تبويب اللغات (العلَم + نقطة خضراء "مملوء")
إضافةً إلى حقل **Name** للّغة النشطة. يجب ملء لغة واحدة على الأقل.

![لوحة Items الخاصة بسمة (علامة تبويب فرعية) لـ "My Billing" — قائمة عناصر قابلة للبحث مع تحرير/حذف لكل صف وزر "+ New item"، معروضة كعلامة تبويب فرعية للتنقّل التفصيلي](/screenshots/react/melis-cms-prospects/meliscmsprospects-tool-themes-edit-themecategorylist.png)

![النافذة المنبثقة "New item" — علامات تبويب "Content per language" (English / Français) وحقل Name للّغة النشطة](/screenshots/react/melis-cms-prospects/meliscmsprospects-tool-themes-edit-themecategorylist-new-modal.png)

## واجهة React API

تقع المسارات في `config/react-api.php` (مدموجةً عبر `Module::getConfig()`). جميعها تحت
`/melis/react-api/`، بعقد `{ success, data, error }`؛ يُرسِل كل طلب جلب
`X-Requested-With: XMLHttpRequest` و`credentials: 'include'`.

**Prospects** — `MelisReactApiProspectController`:

| الطريقة وعنوان URL | الغرض |
| --- | --- |
| `GET /prospects` | قائمة keyset (`limit,search,site,type,dateFrom,dateTo,sort,dir,after`) ← `{items,total,nextCursor}` |
| `GET /prospects/stats` | مؤشرات KPI `{total, thisMonth, avgPerMonth, anonymized}` |
| `GET /prospects/sites` | خيارات مرشّح الموقع |
| `GET /prospects/types` | قيم `pros_type` المميّزة |
| `GET /prospects/themes` | خيارات عناصر السمة لمنتقي Theme في النموذج |
| `GET /prospects/:id` | عميل محتمل واحد (منسَّق) |
| `POST /prospects/save` | **تحديث فقط** (لا إنشاء)؛ تاريخ الاتصال والنوع غير قابلين للتغيير من جانب الخادم |
| `DELETE /prospects/delete/:id` | حذف عميل محتمل |

**Themes وitems** — `MelisReactApiProspectThemeController`:

| الطريقة وعنوان URL | الغرض |
| --- | --- |
| `GET /prospect-themes` | قائمة keyset للسمات ← `{items,total,nextCursor}` مع `itemCount` |
| `GET /prospect-themes/stats` | مؤشرات KPI `{total, withCode, items}` |
| `GET /prospect-themes/:id` | سمة واحدة `{id,name,code,itemCount}` |
| `POST /prospect-themes/save` | إنشاء (id=0) / تحديث (الاسم مطلوب ≤45، فريد؛ يُحافَظ على الرمز إن غاب) |
| `DELETE /prospect-themes/delete/:id` | حذف سمة + العناصر + الترجمات (تعاقبيًّا) |
| `GET /prospect-themes/languages` | لغات CMS `{languages:[{id,name,locale}]}` |
| `GET /prospect-themes/items?themeId=X` | عناصر سمة (الاسم بلغة الجلسة) |
| `GET /prospect-themes/items/:id` | عنصر واحد `{id,themeId,translations:{langId:text}}` |
| `POST /prospect-themes/items/save` | إنشاء/تحديث عنصر (ترجمة واحدة غير فارغة على الأقل؛ إدراج/تحديث أو حذف لكل لغة) |
| `DELETE /prospect-themes/items/delete/:id` | حذف عنصر + ترجماته |

```ts
// update a prospect (no create)
await apiFetch<{id:number}>('/melis/react-api/prospects/save', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: 3, siteId: 1, name: 'Paul Martin',
    email: 'paul.martin@example.com', message: '…', theme: null }),
})
// save a theme item (name per language)
await apiFetch<{id:number}>('/melis/react-api/prospect-themes/items/save', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: 0, themeId: 2, translations: { '1': 'My invoices', '2': 'Mes factures' } }),
})
```

> يتخاطب المتحكّمان مع الجداول مباشرةً عبر SQL ذي معلمات (`AdapterInterface`، وقوائم keyset
> عبر `MelisReactKeysetListTrait`)، مُعيدَين إنتاج قواعد العمل القديمة. ومع ذلك، لا يزالان يطلقان
> أحداث السجلّ القديمة (`meliscmsprospects_toolprospects_save_end` / `_delete_end`،
> `meliscmsprospects_theme_save_end` / `_delete_end`، `meliscmsprospects_theme_item_save_end`) لكي
> يستمرّ مستمعو الرسائل الوامضة/السجلّ في الوحدة في العمل.

## القدرات

مُصرَّح عنها في `config/react.capabilities.php` (`melisReactToolCapabilities`)، مُفهرَسة حسب
melisKey لعقدة القائمة الحاملة للصلاحيات. يُنتِج `Capabilities::flatten()` سلاسل منقّطة تُمرَّر إلى
`MelisCan(melisKey, cap)` في React وإلى `denyUnlessCan(cap)` من جانب الخادم (سماح افتراضي لقدرة
غير مُصرَّح عنها).

```php
'melisprospects_tool_prospects_section' => ['list', 'edit', 'delete', 'export'], // NO create
'melisprospects_tool_themes_section' => [
    'actions' => ['create', 'list', 'edit', 'delete', 'export'],
    'tabs' => [
        ['key' => 'items', 'label' => 'tr_melis_cms_prospects_theme_items',
         'actions' => ['list', 'create', 'edit', 'delete']],
    ],
],
```

- **Prospects**: `list` و`edit` و`delete` و`export` (بدون `create` — إذ لا يولد العميل المحتمل إلّا من
  نموذج الاتصال العام).
- **Themes**: `create` و`list` و`edit` و`delete` و`export`، إضافةً إلى علامة التبويب الفرعية `items`
  (`items` و`items.list` و`items.create` و`items.edit` و`items.delete`).

يحرس كل إجراء متحكّم مرتين: `denyUnlessAccess()` (المصادقة + `MelisCoreRights::canAccess`)
ثم `denyUnlessCan('list')` وما شابه. يختار `save` بين `edit` و`create` حسب المعرّف.

## الخدمات الرئيسية

| اسم الخدمة المستعار | الدور |
| --- | --- |
| `MelisCmsProspectsService` / `MelisProspectsService` | الخدمة الرئيسية. ينشئ `saveProspectsDatas($datas, $prosId = null)` عميلًا محتملًا أو يحدّثه؛ ويعيد `getProspectsDataForWidgets($widgetId = '')` أعداد الإجمالي / هذا الشهر / المتوسط؛ ويحسب `getProspectsDataByDate($type, $date)` التسجيلات حسب التاريخ؛ ويسترجع `getWidgetProspects($identifier)` بيانات أداة. |
| `MelisProspectsGdprAutoDeleteService` | يتولّى دورة الحذف التلقائي وفق GDPR (قائمة الوحدات، قائمة الوسوم، قائمتا مستخدمي التحذير / التحذير الثاني، حذف الحساب). |

بوّابات الجداول: `MelisProspects` و`MelisCmsProspectsThemeTable` و
`MelisCmsProspectsThemeItemTable` و`MelisCmsProspectsThemeItemTransTable`.

> إنّ متحكّمات React **لا** تستخدم `MelisCmsProspectsService` (فهي تستعلم عن الجداول
> مباشرةً)؛ أمّا الأدوات الكلاسيكية (العرض القديم) وإضافة Show Form وأداة لوحة المعلومات
> ومستمعو GDPR فلا يزالون يعتمدون عليها.

## الواجهة الأمامية

يعرض ملحق المتحكّم `MelisCmsProspectsShowFormPlugin` نموذج الاتصال في الواجهة
الأمامية. أفلِت كتلة **Show Form** على صفحة من لوحة الإضافات في محرّر صفحات React (تحت
**Melis Cms Prospects**). تحتفظ نافذته المنبثقة للإعدادات بثلاث علامات تبويب:

![محرّر صفحات React ولوحة الإضافات مفتوحة — تقع كتلة "Contact Form" تحت مجموعة "Melis Cms Prospects"، جاهزةً للإفلات على الصفحة](/screenshots/react/melis-cms-prospects/meliscmsprospects-page-menu-plugins-selector.png)

![Show Form — علامة تبويب Field list: منشئ الحقول — لكل حقل مفتاح تبديل Show/Hide وخانة اختيار Mandatory؛ الصفوف قابلة للترتيب بالسحب بحيث يكون ترتيبها هو ترتيب النموذج](/screenshots/react/melis-cms-prospects/meliscmsprospects-page-plugins-showform-config-tab-fieldlist.png)

| علامة التبويب | عناصر التحكّم |
| --- | --- |
| Properties | قالب العرض (`template_path`) والموقع المصدر (`pros_site_id`). |
| Field list | منشئ الحقول — لكل حقل مفتاح تبديل Show/Hide وخانة اختيار Mandatory (مُفعَّلة فقط عندما يكون Show مُشغَّلًا)؛ اسحب الصفوف لتحديد ترتيب النموذج. الحقول: `pros_name` و`pros_company` و`pros_country` و`pros_email` و`pros_telephone` و`pros_message`. |
| Themes | السمة التي تملأ قائمة الموضوع المنسدلة في النموذج. |

ملف الإعداد: `config/plugins/MelisCmsProspectsShowFormPlugin.config.php`. قالب الواجهة الأمامية:
`view/.../plugins/prospects-form.phtml`. في لوحة معلومات المكتب الخلفي، ترسم أداة **Prospects
Statistics** (`MelisCmsProspectsStatisticsPlugin`، القسم `MelisMarketing`) رسمًا بيانيًّا
للتسجيلات عبر الزمن.

![أداة لوحة المعلومات "Prospects statistics" — رسم بياني للتسجيلات اليومية/الشهرية/السنوية إضافةً إلى جدول بأحدث العملاء المحتملين](/screenshots/react/melis-cms-prospects/meliscmsprospects-dashboard-plugin-prospectsstatistics.png)

## جداول قاعدة البيانات

| الجدول | يحتوي |
| --- | --- |
| `melis_cms_prospects` | عميل محتمل مُلتقَط: الموقع، النوع، السمة، الاسم، البريد الإلكتروني، الهاتف، الرسالة، الشركة، البلد، تاريخ الاتصال، تاريخ GDPR الأخير. المفتاح الأساسي: `pros_id`. |
| `melis_cms_prospects_themes` | سمات الموضوع (`pros_theme_name` و`pros_theme_code`). المفتاح الأساسي: `pros_theme_id`. |
| `melis_cms_prospects_theme_items` | عناصر تنتمي إلى سمة. المفتاح الأساسي: `pros_theme_item_id`. |
| `melis_cms_prospects_theme_items_trans` | ترجمات عناصر السمة لكل لغة. المفتاح الأساسي: `item_trans_id`. |

## خطّافات الأحداث

اربط باستخدام `MelisCmsProspects` كمعرّف الهدف:

| اسم الحدث | يُطلَق بواسطة |
| --- | --- |
| `meliscmsprospects_toolprospects_save_start` / `_end` | أداة Prospects (الكلاسيكية + متحكّم React) |
| `meliscmsprospects_toolprospects_delete_start` / `_end` | أداة Prospects (الكلاسيكية + متحكّم React) |
| `meliscmsprospects_theme_save_end` / `_delete_end` | أداة Themes (الكلاسيكية + متحكّم React) |
| `meliscmsprospects_theme_item_save_end` | عناصر السمة (الكلاسيكية + متحكّم React) |

```php
$sharedEvents->attach(
    'MelisCmsProspects',
    'meliscmsprospects_toolprospects_save_end',
    $fn,
    50
);
```

يُربط مستمعو GDPR (معلومات المستخدم، الاستخراج، الحذف، الحذف التلقائي) في `src/Module.php`. وتقع
تعيينات حقول GDPR في `config/app.gdpr.php`.

## الملفات الرئيسية

| الموضوع | المسار (تحت `vendor/melisplatform/melis-cms-prospects/`) |
| --- | --- |
| إعداد الوحدة / المسارات / الخدمات | `config/module.config.php` |
| مسارات react-api + العناصر القابلة للاستدعاء | `config/react-api.php` |
| قدرات React | `config/react.capabilities.php` |
| شجرة واجهة المكتب الخلفي | `config/app.interface.php` |
| جداول ونماذج الأداة الكلاسيكية | `config/app.tools.php` |
| إعداد ملحق القوالب | `config/plugins/MelisCmsProspectsShowFormPlugin.config.php` |
| إعداد أداة لوحة المعلومات | `config/dashboard-plugins/` |
| تعيين حقول GDPR | `config/app.gdpr.php` |
| متحكّمات React API | `src/Controller/MelisReactApiProspectController.php`، `MelisReactApiProspectThemeController.php` |
| المتحكّمات الكلاسيكية | `src/Controller/ToolProspectsController.php`، `MelisCmsProspectsThemesController.php`، `MelisCmsProspectsThemeItemsController.php` |
| الخدمة الرئيسية | `src/Service/MelisCmsProspectsService.php` |
| خدمة الحذف التلقائي وفق GDPR | `src/Service/` |
| ملحق نموذج الواجهة الأمامية | `src/Controller/Plugin/MelisCmsProspectsShowFormPlugin.php` |
| أداة لوحة المعلومات | `src/Controller/DashboardPlugins/MelisCmsProspectsStatisticsPlugin.php` |
| قطع React (المصدر / البناء) | `ui-react/src/` ← `public/ui-react/brick.js` + `brick.manifest.json` |
| بوّابات الجداول | `src/Model/Tables/` |
| مستمعو GDPR والتمهيد | `src/Module.php`، `src/Listener/` |

انظر أيضًا: [مرجع الوحدات](/ar/reference/modules) · [melis-cms](/ar/reference/modules/melis-cms) · [melis-core](/ar/reference/modules/melis-core)
