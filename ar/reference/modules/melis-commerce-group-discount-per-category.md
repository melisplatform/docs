# MelisCommerceGroupDiscountPerCategory

> يضيف خصماً سعرياً على مستوى الفئة، محدَّداً حسب الدولة ومجموعة العملاء، على هيئة تبويب "Price Discount" يُحقَن داخل أداة Catalogs في MelisCommerce ضمن الواجهة الخلفية المبنية على React. الحزمة `melisplatform/melis-commerce-group-discount-per-category`.

## الغرض

يتيح لك MelisCommerceGroupDiscountPerCategory تحديد **خصم بنسبة مئوية على منتجات فئة معيّنة، لكل دولة ولكل مجموعة عملاء**. يكون نطاق الخصم محدَّداً بـ *(الفئة × الدولة × مجموعة العملاء)*، بحيث يمكن لعميلين يشتريان المنتج نفسه أن يريا سعرين مختلفين تبعاً للمجموعة التي ينتميان إليها، ويمكن أن يتفاوت الخصم من دولة إلى أخرى (مع دولة زائفة باسم **General**، معرّفها `-1`، تنطبق على جميع المناطق).

لا تملك هذه الوحدة **أداةً خاصة بها**. فهي **لبنة امتداد / حقن في المضيف**: لا ترسم أي صفحة ولا تضيف أي مدخل قائمة. بل تنشر مكوّن React على `window`، حيث تلتقطه صفحة Catalogs في MelisCommerce — عندما تكون الوحدة مُفعَّلة — لإضافة تبويب **Price Discount** إلى محرِّر الفئة. أما الحفظ الفعلي فيبقى في خدمة Laminas الخاصة بالوحدة، دون تغيير عن الأداة القديمة.

## تفعيلها

أضِف إلى `config/melis.module.load.php`:

```php
return [
    'MelisCommerceGroupDiscountPerCategory',
];
```

بما أنها لبنة امتداد، فإن التبويب يظهر **فقط عند تحقُّق كلا** الشرطين التاليين:

- **أن تكون الوحدة مُفعَّلة** — فاللبنة المفعَّلة وحدها هي التي تنشر متغيّرها العام على `window` ليلتقطه المضيف.
- **أن يمتلك المستخدم صلاحية `price_discount`** على أداة Catalogs.

لا يوجد **`config/react.capabilities.php`** في هذه الوحدة: فقدرة `price_discount` مُعلَنة في **MelisCommerce**، تحت الـ melisKey الحامل للصلاحيات لأداة Catalogs وهو `meliscommerce_categories_page`.

## أين تقع في الواجهة الخلفية المبنية على React

لا توجد شاشة مخصَّصة. فالميزة عبارة عن تبويب داخل أداة Catalogs:

- الشريط الجانبي ← **Commerce ← Catalogs**.
- افتح/عدِّل **فئة** موجودة.
- انقر على تبويب **Price Discount** (المعنون *"Discount Per Client's Group"* / *"Réduction par groupe de client"*).

هذا التبويب مخصَّص **للتعديل فقط**: فهو يرتبط بفئة موجودة، ولذا يكون معطَّلاً أثناء *إنشاء* فئة — احفظ الفئة أولاً. كما أنه **لا يملك زر حفظ خاصاً به**؛ إذ تُكتَب الخصومات بواسطة زر **"Save category"** التابع لنموذج المضيف.

يحتوي التبويب على منطقتين:

- قائمة **Country** على اليسار (**General** أولاً، ثم كل دولة مع علمها)؛ ويُظهر شارة عدد الخصومات المُدخَلة لتلك الدولة؛
- مجموعة من **تبويبات مجموعات العملاء** على اليمين — اختر مجموعة، ثم أدخِل **نسبة الخصم** المئوية لها في الدولة المحدَّدة. وتُعلَّم بنقطة تبويبةُ المجموعة التي تحمل قيمة بالفعل (حمراء إذا كانت القيمة غير صالحة).

## قواعد الخصم

- **النسبة المئوية** — `0 < value ≤ 100`، بحدٍّ أقصى **رقمين عشريين**. وترك الحقل **فارغاً** يزيل (يحذف) صف الخصم ذاك.
- تُعرَض مجموعات العملاء **النشطة** فقط.
- يُتحقَّق من صحة الحقل أثناء الكتابة؛ وتُعرَض القيمة غير الصالحة أسفل حقلها الخاص وتُعلَّم تبويبة المجموعة باللون الأحمر. وعند الضغط على **Save category**، تؤدي النسبة المئوية غير الصالحة إلى **منع** الحفظ وتحويل التبويب إلى أول دولة + مجموعة تحمل الخطأ. وإلا فإن الفئة تُحفَظ أولاً، ثم تُحفَظ الخصومات معها.

## تشريح اللبنة

مصدر اللبنة عبارة عن مكتبة Vite بصيغة **IIFE** ضمن `ui-react/`، تُبنى إلى `public/ui-react/brick.js` (‏+ `brick.manifest.json`). وتُخرَّج React إلى المتغيّرات العامة للمضيف بحيث يُصيَّر المكوّن داخل صفحة Catalogs. ويُصرِّح الـ manifest بأنه **لا route ولا label ولا forwardKey ولا melisKey** (كلها `null`)، ولا يستدعي المدخل `__melisRegisterBrick` — بل يكتفي عند التحميل بنشر متغيّر عام:

```ts
window.MelisCommerceGroupDiscountPerCategoryBrick = {
  CategoryDiscountTab,
  tabLabel: { fr: 'Réduction par groupe de client', en: "Discount Per Client's Group" },
}
```

| الملف | الدور |
| --- | --- |
| `src/brick.tsx` | ينشر المتغيّر العام `window.MelisCommerceGroupDiscountPerCategoryBrick`. لا route ولا تسجيل. |
| `src/CategoryDiscountTab.tsx` | واجهة التبويب (الخصائص `{ categoryId }`): قائمة الدول + تبويبات مجموعات العملاء + حقل النسبة المئوية، مع قاموس fr/en مكتفٍ بذاته، وتحقُّق من الصحة على جانب العميل، ومستمعات حدث الحفظ-مع-النموذج. |
| `src/discountApi.ts` | عميل JSON لنقاط نهاية `react-api` الخاصة بالوحدة، باستخدام العقد `{ success, data, error }`. |

يأتي عنوان التبويب مع **هذه** الوحدة (على المتغيّر العام)، لا مع قاموس MelisCommerce. ويقرأ التبويب اللغة النشطة من `document.documentElement.lang`.

## واجهة React API

تُعرَّف المسارات في `config/react-api.php` وتُدمَج ضمن `child_routes` الخاصة بـ `melis-react-api`. المتحكِّم: `MelisReactApiCategoryDiscountController` (‏`optionsAction` / `getAction` / `saveAction`). شكل الاستجابة `{ success, data, error? }`.

| الطريقة + العنوان | الإجراء | المُعاد (`data`) |
| --- | --- | --- |
| `GET /melis/react-api/category-discounts/options` | `optionsAction` | `{ countries, groups }` — الدول مع **General** (المعرّف `-1`) أولاً + أعلام بترميز base64؛ ومجموعات العملاء **النشطة**. |
| `GET /melis/react-api/category-discounts/:id` | `getAction` | `{ items }` — الخصومات المخزَّنة للفئة `:id`. |
| `POST /melis/react-api/category-discounts/save` | `saveAction` | `{ items }` — الخصومات المُعاد قراءتها بعد الحفظ (معرّفات جديدة). |

أشكال TS (‏`discountApi.ts`):

```ts
interface CountryOpt  { id: number; name: string; flag: string | null; general: boolean }
interface GroupOpt    { id: number; name: string }
interface DiscountRow { id: number; countryId: number; groupId: number; percentage: number }
```

**حارس الوصول (الإجراءات الثلاثة جميعها):** يتطلب `denyUnlessAccess()` هويةً مُصادَقاً عليها (‏`MelisCoreAuth`، وإلا 401) و‏`MelisCoreRights->canAccess('meliscommerce_categories_page')` — أي melisKey أداة Catalogs **المضيفة** (وإلا 403). ولا يمكن للتبويب أبداً أن يكون أكثر تساهلاً من الأداة التي يقيم فيها.

**عقد الحفظ.** يرسل العميل **كل** خلية (بما فيها الفارغة — إذ يحذف `percentage` الفارغ ذلك الصف). ويعيد `saveAction` التحقُّق من الصحة (عددي، ≤ رقمين عشريين، ≤ 100، > 0)، ويعيد بناء البنية القديمة `[countryId][groupId] => ['gdc_id' => …, 'gdc_discount_percent' => …]`، ثم يفوّض العمل إلى الخدمة — دون أي منطق أعمال في المتحكِّم:

```php
$this->getServiceManager()
     ->get('MelisCommerceGroupDiscountPerCategoryService')
     ->saveCategoryGroupDiscount($categoryId, $datas);   // same service + events as the legacy tool
```

يقرأ `options`/`get` من `MelisCommerceGroupDiscountPerCategoryService->getCategoryDiscountsByCategoryId()` و‏`MelisEcomCountryTable->getCountries()` و‏`MelisComClientGroupsService->getClientsGroupList()`.

## التكامل مع المضيف

- **الاكتشاف / التحميل:** تدفُّق اللبنة القياسي — يُدرِجها `GET /melis/react-api/react-modules`، ويحمِّل المضيف `brick.js` في الخلفية، ثم ينشر `brick.tsx` المتغيّر العام.
- **التقاط المكوّن:** يحلّ `CatalogPage.tsx` في MelisCommerce المكوّنَ والعنوانَ عبر المساعِدات العامة، ويضيف التبويب **بشرط أن يُحلّ كلاهما** وفي وضع **التعديل** فقط:

  ```ts
  const DiscountTabComp  = useExternalBrickComponent<{ categoryId: number }>(
    'MelisCommerceGroupDiscountPerCategoryBrick', 'CategoryDiscountTab')
  const DiscountTabLabel = useExternalBrickValue<{ fr: string; en: string }>(
    'MelisCommerceGroupDiscountPerCategoryBrick', 'tabLabel')
  ```

  يُركَّب محتوى التبويب **بشكل دائم** (يُخفى بـ `display:none` عند عدم النشاط) لكي يحتفظ بمُدخَلاته ومستمعاته.

- **جسر الحفظ-مع-النموذج** (حدثان من نوع `CustomEvent` على `window`):
  - `melis:commerce-category-validate` — يُطلَق قبل الحفظ؛ يتحقَّق التبويب من الصحة، وعند أول قيمة غير صالحة يضبط `detail.blocked = true` و‏`detail.tab = 'price_discount'`، مُجهِضاً حفظ الفئة.
  - `melis:commerce-category-saved` — يُطلَق بعد حفظ الفئة؛ يدفع التبويب وعده `submit({ silent: true })` إلى `detail.pending`، الذي ينتظره `CatalogPage` قبل الإنهاء.

## الملفات الرئيسية

| الجانب | المسار |
| --- | --- |
| مصدر اللبنة (المكوّن، عميل الـ api) | `ui-react/src/{brick.tsx, CategoryDiscountTab.tsx, discountApi.ts}` |
| اللبنة المبنية + الـ manifest | `public/ui-react/{brick.js, brick.manifest.json}` (المعرّف `commerce-group-discount-per-category`) |
| مسارات React API | `config/react-api.php` |
| ربط الوحدة | `config/module.config.php` |
| متحكِّم React API | `src/Controller/ReactApi/MelisReactApiCategoryDiscountController.php` |

انظر أيضاً: [melis-commerce](/legacy/reference/modules/melis-commerce)
