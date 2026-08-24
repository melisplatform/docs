# التجارة

يضيف `melis-commerce` نطاق **تجارة إلكترونية** كاملاً إلى Melis: الكتالوج والعملاء والسلة وإتمام الشراء
والطلبات — معروضاً في آنٍ واحد كـ **أدوات في الواجهة الخلفية** وكـ **إضافات في الواجهة الأمامية**. هذه الصفحة بمثابة خريطة
لتوجيهك؛ اقرأ مجلد `src/Service/` الخاص بالوحدة للاطلاع على واجهة البرمجة الدقيقة والحالية.

في **Melis v6** يبقى إطار العمل والوحدة وخدماتها دون تغيير — ما تغيّر هو
**واجهة الواجهة الخلفية**: أصبحت أدوات التجارة الآن تعمل كـ **"لبنات" (bricks) React أصلية** داخل `/melis-react`
(راجع [إنشاء أداة](/ar/guide/create-a-tool)). تحتفظ كل أداة بمفتاح تبديل **جديد / قديم** خاص بها بحيث يمكنك
العودة إلى الشاشة الكلاسيكية داخل إطار iframe، ويتوفر [المساعد الذكي](/ar/guide/ai) العائم الشامل فوق كل أداة.

## نموذج النطاق

المفاهيم الرئيسية (كيانات ضمن `melis-commerce/src/Entity/`، جداول ببادئة `melis_ecom_*`):

| المجال | المفاهيم | الجداول (أمثلة) |
| --- | --- | --- |
| **الكتالوج** | المنتج، المتغيّر (Variant، وحدة SKU قابلة للبيع)، الفئة، السمة وقيمها | `melis_ecom_product`, `melis_ecom_variant`, `melis_ecom_category`, `melis_ecom_attribute` |
| **التسعير** | السعر حسب المتغيّر/المنتج × البلد × العملة × مجموعة العملاء | `melis_ecom_price`, `melis_ecom_client_groups` |
| **العملاء** | العميل (الحساب)، الشخص العميل، العناوين | `melis_ecom_client`, `melis_ecom_client_person` |
| **السلة** | السلال المجهولة والدائمة | `melis_ecom_basket_anonymous`, `melis_ecom_basket_persistent` |
| **الطلبات** | الطلب + العناوين، الدفع، الشحن؛ الإرجاعات | `melis_ecom_order`, `melis_ecom_order_address`, `melis_ecom_order_payment` |
| **العروض الترويجية** | القسائم (مقيّدة بالمنتج/العميل) | `melis_ecom_coupon`, `melis_ecom_coupon_product` |
| **التوطين** | البلد، العملة | `melis_ecom_country`, `melis_ecom_currency` |
| **الوسائط** | المستندات (صور/PDF) | `melis_ecom_document` |

## الخدمات التي ستستخدمها

جميعها مسجَّلة في `melis-commerce/config/module.config.php` (`service_manager.aliases`). أبرزها:

- **الكتالوج**: `MelisComProductService`, `MelisComVariantService`, `MelisComCategoryService`,
  `MelisComAttributeService`, `MelisComPriceService`, `MelisComProductSearchService`,
  `MelisComDocumentService`.
- **السلة وإتمام الشراء**: `MelisComBasketService`, `MelisComOrderCheckoutService`,
  `MelisComOrderService`, `MelisComShipmentCostService`, `MelisComPostPaymentService`,
  `MelisComOrderProductReturnService`.
- **العملاء**: `MelisComClientService`, `MelisComAuthenticationService`, `MelisComContactService`,
  `MelisComClientGroupsService`.
- **الإعدادات**: `MelisComCouponService`, `MelisComCurrencyService`, `MelisComSeoService`.

```php
$products = $sm->get('MelisComProductService');
$orders   = $sm->get('MelisComOrderService');
```

تعتمد كل خدمة على طبقة بيانات `MelisEcom*Table` (على سبيل المثال `MelisEcomProductTable` →
`melis_ecom_product`). لا تعيد الواجهة الخلفية القائمة على React تنفيذ أيٍّ من هذا: فنقاط النهاية
`/melis/react-api/…` الخاصة بها تتحقق فقط من صحة المدخلات وتُشكّل استجابة JSON، ثم تستدعي هذه الخدمات نفسها.

## في الواجهة الخلفية

تسجّل MelisCommerce قسم **MelisCommerce** في الشريط الجانبي لـ `/melis-react` يضم **13 أداة React**
تغطي النطاق بأكمله: **Accounts**، **Contacts**، **Catalogs**، **Products**،
**Orders**، **Coupons**، **Attributes**، **Countries**، **Commerce languages**، **Currencies**،
**Order status**، **Client's groups** و**Commerce settings**. كل واحدة منها صفحة React حقيقية (لا يوجد
iframe في العرض الافتراضي "New") تُفتح على مسارها الخاص؛ أما أدوات "الكيانات" فتفتح السجل كـ
**تبويب فرعي** دائم بحيث يمكنك العودة إلى القائمة دون فقدان موضعك. تحمل كل أداة
مفتاح تبديل **New / Old** — يعرض "Old" الأداة الكلاسيكية داخل إطار iframe لتتمكن من المقارنة.

![قسم MelisCommerce في الشريط الجانبي لـ /melis-react — محدّد الأدوات.](/screenshots/react/melis-commerce/meliscommerce-menu-tools-selector.png)

سير عمل نموذجي: ابنِ **الكتالوج** (Attributes ← Catalogs ← Products/Variants)، وأدِر
**العملاء** (Accounts + Contacts)، ثم شغّل خط أنابيب **الطلبات** (Orders + القسائم)، وكل ذلك مدعوم
بقوائم مرجعية للتجارة (Countries، Currencies، Order status، Client's groups، Settings).

- **الكتالوج** — أداة **Catalogs** عبارة عن **شجرة** فئات (اسحب لإعادة الترتيب؛ Properties / SEO /
  Products لكل عقدة). تعرض **Products** قائمة المنتجات (بحث، تكرار، تصدير)؛ ويتضمن المحرّر تبويبات
  **Properties** و**Text** و**Variants** و**SEO** و**Prices**، مع محرّر ثري لكل متغيّر
  (الأسعار، المخزون، SEO، الارتباطات، الوسائط). تُدير **Attributes** الخصائص المُصنَّفة
  (Properties / Labels / Values).

  ![قائمة المنتجات (React).](/screenshots/react/melis-commerce/meliscommerce-tools-products-list.png)

  ![محرّر المنتج — تبويب Variants.](/screenshots/react/melis-commerce/meliscommerce-tools-products-edit-tab-variants.png)

- **العملاء** — **Accounts** هم عملاء B2B (Properties، Company، Contacts، Addresses، Orders،
  Files)، مع بحث وعوامل تصفية ومدير أعمدة وتصدير و**استيراد** بصيغة CSV. أما **Contacts** فهم
  الأشخاص الأفراد (Information / Address / Association)، المرتبطون بحساب واحد أو أكثر.

  ![قائمة الحسابات (React).](/screenshots/react/melis-commerce/meliscommerce-tools-accounts-list.png)

- **الطلبات** — تعرض أداة **Orders** قائمة الطلبات (عوامل تصفية، تصفية حسب الحالة، تصدير). ويتضمن محرّر
  الطلب الواحد تبويبات **Properties** و**Basket** و**Addresses** و**Payment** و**Shipping** و**Messages** و
  **Returns** (بالإضافة إلى **Invoices** عند تفعيل الفوترة — راجع أدناه). يفتح **New Order** معالج
  **إتمام شراء موجَّه من 7 خطوات** (contact ← account ← products ← addresses ← summary ← payment ←
  confirmation) مدعوماً بجلسة على جانب الخادم تستأنف من حيث توقفت.

  ![قائمة الطلبات (React).](/screenshots/react/melis-commerce/meliscommerce-tools-order-list.png)

  ![معالج إتمام الشراء لطلب جديد.](/screenshots/react/melis-commerce/meliscommerce-tools-order-newordertunnel-1.png)

- **المرجع والإعدادات** — **Coupons** (Properties، Assign account، Assign product، الطلبات المستخدِمة)،
  **Countries**، **Commerce languages**، **Currencies** (مع إجراء *تعيين افتراضي*)، **Order
  status** (الحالة + اللون + التسميات لكل لغة)، **Client's groups**، وصفحة **Commerce
  settings** واحدة (Properties + Accounts).

للاطلاع على المرجع الكامل تبويباً بتبويب لكل أداة (المسارات، القدرات، نقاط نهاية `react-api`) راجع
[مرجع وحدة melis-commerce](/ar/reference/modules/melis-commerce).

## في الواجهة الأمامية

توفّر التجارة مجموعة كبيرة من **إضافات القوالب** (ضعها داخل الصفحات — راجع
[الإضافات](/ar/guide/plugins)) تغطي واجهة المتجر بأكملها:

- **الكتالوج**: `MelisCommerceProductShowPlugin`, `MelisCommerceProductListPlugin`,
  `MelisCommerceProductSearchPlugin`, `MelisCommerceCategoryProductListPlugin`,
  `MelisCommerceRelatedProductsPlugin`.
- **الحساب**: `MelisCommerceLoginPlugin`, `MelisCommerceRegisterPlugin`,
  `MelisCommerceAccountPlugin`, `MelisCommerceProfilePlugin`، وإضافات عناوين التسليم/الفوترة.
- **السلة وإتمام الشراء**: `MelisCommerceAddToCartPlugin`, `MelisCommerceCartPlugin`,
  `MelisCommerceCheckoutPlugin` (+ خطوات السلة / القسيمة / العناوين / الملخص / التأكيد).
- **الطلبات**: `MelisCommerceOrderHistoryPlugin`, `MelisCommerceOrderPlugin`,
  `MelisCommerceOrderReturnProductPlugin`.

…بالإضافة إلى عناصر واجهة (widgets) للوحة التحكم (عدد الطلبات، إيرادات المبيعات، رسائل الطلبات).

وبذلك تُجمَّع واجهة المتجر في معظمها من خلال **وضع هذه الإضافات** على صفحات نظام إدارة المحتوى وتنسيقها
في طرق العرض الخاصة بوحدة موقعك. لا يؤثر تغيير الواجهة الخلفية القائمة على React على الواجهة الأمامية:
فإضافات واجهة المتجر وطرق عرضها تبقى دون تغيير.

## الفوترة

يوسّع `melis-commerce-order-invoice` التجارة بميزة **توليد فواتير PDF** (عبر
Spipu/Html2Pdf): خدمة فوترة + جدول (`melis_ecom_order_invoice`) ومستمِعات تولّد
الفواتير من بيانات الطلب. في الواجهة الخلفية القائمة على React لا تمتلك **أداة خاصة بها** — بل هي
**لبنة امتداد** (extension brick) تحقن قطعتين في أداة **Orders** عندما تكون الوحدة نشطة:

- تبويب **Invoices** في محرّر الطلب — لعرض الفواتير و**إعادة توليد الفاتورة (Regenerate Invoice)** وتنزيل أي
  فاتورة مدرجة؛
- زر **تنزيل** لكل صف في قائمة Orders يجلب أحدث فاتورة PDF للطلب.

إن لم تظهر لك، فتحقق من أن `melis-commerce-order-invoice` نشط وأن دورك يملك صلاحية
**Invoices** ضمن Orders. راجع
[مرجع وحدة melis-commerce-order-invoice](/ar/reference/modules/melis-commerce-order-invoice).

## الملفات الرئيسية

| المجال | المسار |
| --- | --- |
| الخدمات | `vendor/melisplatform/melis-commerce/src/Service/` |
| الكيانات | `vendor/melisplatform/melis-commerce/src/Entity/` |
| المخطط | `vendor/melisplatform/melis-commerce/install/sql/setup_structure.sql` |
| إضافات الواجهة الأمامية | `vendor/melisplatform/melis-commerce/src/Controller/Plugin/` |
| لبنات React وواجهة البرمجة | `vendor/melisplatform/melis-commerce/ui-react/`, `config/react-api.php`, `src/Controller/ReactApi/` |
| الفوترة | `vendor/melisplatform/melis-commerce-order-invoice/` |
