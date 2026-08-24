# MelisCommerce

> إطار عمل تجارة إلكترونية متكامل لـ MelisPlatform — كتالوج، وعملاء، وسلة/دفع/طلبات، وقسائم، وشحن، وتحسين محركات البحث (SEO) — مع لوحة تحكم خلفية مبنية على React. الحزمة `melisplatform/melis-commerce`.

## الغرض

يضيف MelisCommerce طبقة تجارة كاملة إلى موقع Melis: كتالوج (منتجات، متغيّرات،
سمات، تصنيفات، أسعار، مخزون)، ونموذج عملاء B2B (حسابات + جهات اتصال)، ومسار
السلة/الدفع/الطلبات، وقسائم، وعملات، وشحن، ومرتجعات، ومستندات، وتحسين محركات البحث. يأتي مع مجموعة
إدارة خلفية ومتجر أمامي مبني من إضافات قوالب قابلة للإفلات. تستخدم طبقة
البيانات **59 جدولاً من نوع `melis_ecom_*`**، و**26 خدمة**، و**10 كيانات غنية** و**33
مستمعاً (listener)**؛ يعتمد الوصول إلى البيانات على Eloquent (المضمَّن `illuminate/database`)، مغلَّفاً بخدمات مدفوعة بالأحداث على طراز Melis.

في الإصدار Melis v6 يبقى منطق الأعمال دون تغيير؛ أما **طبقة العرض** فهي **لوحة تحكم خلفية بـ React**
(`/melis-react`). يأتي MelisCommerce مع **حزمة واحدة متعددة القوالب (multi-brick)** تعرض **13 أداة React أصلية**،
كلٌّ منها مدعومة بنقاط نهاية JSON تحت `/melis/react-api/…`. تحتفظ كل أداة بمفتاح تبديل **New / Old** خاص بها حتى تتمكن من العودة إلى الشاشة القديمة الكلاسيكية داخل iframe.

## تفعيله

أضِف إلى `config/melis.module.load.php`:

```php
return [
    'MelisCommerce',
];
```

يتطلّب `melisplatform/melis-core`. تُهيَّأ جداول قاعدة البيانات تلقائياً بواسطة MelisDbDeploy
(الفروق (deltas) تحت `install/dbdeploy/`)؛ ويُعرَض هذا الوحدة (module) بواسطة مثبِّت Melis كمكوّن اختياري. لا تظهر أدوات React في اللوحة الخلفية إلا عندما يكون MelisCommerce نشطاً (الاكتشاف عبر
`GET /melis/react-api/react-modules`).

## اللوحة الخلفية بـ React — حزمة واحدة، ثلاث عشرة أداة

تُعلن الحزمة (`public/ui-react/brick.js` + `brick.manifest.json`) عن 13 أداة تسجّل نفسها ذاتياً
في `brick.tsx`. جميعها React أصلية بالكامل؛ وكلٌّ منها يعرض `ViewModeToggle` مشتركاً + `LegacyFrame`، بحيث
يُحمِّل وضع *Old* الأداة الكلاسيكية داخل iframe (`/melis/react-tool-page?key=<melisKey>`). أدوات "الكيانات" السبع
تضبط `subTabs: true` (فتح سجل يضيف علامة تبويب فرعية)؛ وجميع الأدوات الـ13 من نوع `persistent`.

![قسم MelisCommerce في الشريط الجانبي لـ React — أدوات التجارة الثلاث عشرة](/screenshots/react/melis-commerce/meliscommerce-menu-tools-selector.png)

| Brick id | Route | Label | melisKey |
| --- | --- | --- | --- |
| `commerce-accounts` | `/melis-commerce/clients-list` | Accounts | `meliscommerce_clients_list_page` |
| `commerce-contacts` | `/melis-commerce/contact-list` | Contacts | `meliscommerce_contact_list_page` |
| `commerce-catalog` | `/melis-commerce/categories` | Catalogs | `meliscommerce_categories_page` |
| `commerce-products` | `/melis-commerce/product-list` | Products | `meliscommerce_product_list_container` |
| `commerce-orders` | `/melis-commerce/order-list` | Orders | `meliscommerce_order_list_page` |
| `commerce-coupons` | `/melis-commerce/coupon-list` | Coupons | `meliscommerce_coupon_list_page` |
| `commerce-attributes` | `/melis-commerce/attribute-list` | Attributes | `meliscommerce_attribute_list_page` |
| `commerce-countries` | `/melis-commerce/country-list` | Countries | `meliscommerce_country_list_container` |
| `commerce-languages` | `/melis-commerce/language-list` | Commerce languages | `meliscommerce_language_list_container` |
| `commerce-currencies` | `/melis-commerce/currency-lists` | Currencies | `meliscommerce_currency_conf` |
| `commerce-order-status` | `/melis-commerce/order-status-lists` | Order status | `meliscommerce_order_status_tool_page` |
| `commerce-clients-groups` | `/melis-commerce/clients-group-list` | Client's groups | `meliscommerce_clients_group_tool_container` |
| `commerce-settings` | `/melis-commerce/settings` | Commerce settings | `meliscommerce_settings_page` |

> **قاعدة عامة:** ابنِ **الكتالوج** (السمات ← الكتالوجات ← المنتجات/المتغيّرات)، وأدِر
> **العملاء** (الحسابات + جهات الاتصال)، ثم شغِّل مسار **الطلبات** (الطلبات + معالج الدفع +
> القسائم)، وكل ذلك مدعوم بقوائم مرجعية للتجارة.

## نموذج الكائنات

| المفهوم | ما هو |
| --- | --- |
| **Product** | حاوية للمتغيّرات — وليس بحد ذاته وحدة قابلة للبيع. |
| **Variant** | الوحدة القابلة للبيع: لها رمز SKU خاص بها، ومخزون، وسعر. المنتج الذي لا يملك خيارات فعلية يظل لديه متغيّر رئيسي واحد. |
| **Attribute** | خاصية قابلة للتصفية/تُعرّف المتغيّرات (مثل اللون، المقاس) بقيم مصنّفة (typed) وقابلة للترجمة. تُعلن المنتجات عن السمات التي تستخدمها؛ ويختار كل متغيّر قيمة واحدة لكل سمة. |
| **Price** | يُحلّ لزوج `(countryId, groupId)` مع ضريبة القيمة المضافة (VAT)؛ ويعود بأمان إلى بدائل (راجع [حلّ التسعير](#pricing--stock-resolution)). |
| **Account** | مؤسسة B2B (`melis_ecom_client`)؛ لها سجل شركة، ومجموعة، وعناوين. |
| **Contact / Person** | فرد (`melis_ecom_client_person`) يسجّل الدخول؛ ويمكن أن ينتمي إلى عدة حسابات. |
| **Basket** | مجهولة الهوية (مفتاحها `clientKey`) أو دائمة (مرتبطة بحساب)؛ وتندمج عند تسجيل الدخول. |
| **Order** | يُنشأ بالحالة `-1` (مؤقتة) أثناء الدفع؛ وينتقل إلى `1` (طلب جديد) بعد الدفع. |

## الحسابات وجهات الاتصال

تدير **الحسابات (Accounts)** (`/melis-commerce/clients-list`) عملاء B2B: تتضمن القائمة بحثاً،
ومرشّحات للحالة/المجموعة، ومدير أعمدة، وتصدير، و**استيراد** CSV. فتح حساب يفتح علامة تبويب فرعية
تحتوي على علامات التبويب **Properties**، و**Company**، و**Contacts** (ربط/فك ربط، تعيين افتراضي)، و**Addresses**، و**Orders**
(السجل)، و**Files**.

![قائمة الحسابات — المرشّحات، مدير الأعمدة واستيراد CSV](/screenshots/react/melis-commerce/meliscommerce-tools-accounts-list.png)

![محرِّر الحساب — علامة تبويب Properties (الحالة، استراتيجية الاسم، المجموعة، البلد، الوسوم)](/screenshots/react/melis-commerce/meliscommerce-tools-accounts-new-tab-properties.png)

![محرِّر الحساب — علامة تبويب Contacts (ربط / فك ربط / افتراضي)](/screenshots/react/melis-commerce/meliscommerce-tools-accounts-new-tab-contacts.png)

تدير **جهات الاتصال (Contacts)** (`/melis-commerce/contact-list`) الأفراد. يحتوي المحرِّر على
علامات التبويب **Information**، و**Address**، و**Association** (ربط/فك ربط جهة اتصال بالحسابات، وتعيين
الافتراضي). جهات الاتصال مدعومة بـ `MelisComContactService`؛ والحسابات بـ `MelisComClientService`.

![محرِّر جهة الاتصال — علامة تبويب Association (ربط / فك ربط الحسابات)](/screenshots/react/melis-commerce/meliscommerce-tools-contacts-edit-tab-association.png)

## الكتالوجات والمنتجات والمتغيّرات

**الكتالوجات (Catalogs)** (`/melis-commerce/categories`) هي **شجرة** تصنيفات قابلة لإعادة الترتيب بالسحب؛ ولكل تصنيف
علامات التبويب **Properties**، و**SEO**، و**Products** (قابلة لإعادة الترتيب).

![شجرة تصنيفات الكتالوج (React)](/screenshots/react/melis-commerce/meliscommerce-tools-catalogs-treeview.png)

تسرد **المنتجات (Products)** (`/melis-commerce/product-list`) المنتجات مع مرشّحات، وتكرار (duplicate)، وتصدير.
يحتوي محرِّر المنتج على علامات التبويب **Properties**، و**Text** (لكل لغة)، و**Variants**، و**SEO**، و**Prices**.
علامة التبويب **Variants** هي الأغنى: لكل متغيّر خصائصه الخاصة (Properties)، وSEO، وPrices، وStocks
وAssociations، بالإضافة إلى الوسائط (media).

![قائمة المنتجات (React)](/screenshots/react/melis-commerce/meliscommerce-tools-products-list.png)

![محرِّر المنتج — علامة تبويب Variants (أسعار، مخزون، SEO، ارتباطات لكل متغيّر)](/screenshots/react/melis-commerce/meliscommerce-tools-products-edit-tab-variants.png)

![محرِّر المنتج — علامة تبويب Prices](/screenshots/react/melis-commerce/meliscommerce-tools-products-edit-tab-prices.png)

تدير **السمات (Attributes)** (`/melis-commerce/attribute-list`) خصائص المنتجات المصنّفة (typed): علامات تبويب المحرِّر
**Properties** (المرجع، النوع، الحالة، مرئي، قابل للبحث)، و**Labels** (لكل لغة)، و
**Values** (قيم بترجمات مصنّفة).

![محرِّر السمة — علامة تبويب Values (قيم بترجمات مصنّفة)](/screenshots/react/melis-commerce/meliscommerce-tools-attributes-edit-tab-values.png)

## الطلبات ومعالج الدفع

تحتوي **الطلبات (Orders)** (`/melis-commerce/order-list`) على مرشّحات للحالة وتصدير. علامات تبويب محرِّر الطلب الواحد
هي **Properties**، و**Basket** (للقراءة فقط)، و**Addresses**، و**Payment** (للقراءة فقط)، و**Shipping**،
و**Messages**، و**Returns** — بالإضافة إلى **Invoices** عندما يكون
[MelisCommerceOrderInvoice](/ar/reference/modules/melis-commerce-order-invoice) نشطاً.

![قائمة الطلبات (React)](/screenshots/react/melis-commerce/meliscommerce-tools-order-list.png)

![محرِّر الطلب — علامة تبويب Properties](/screenshots/react/melis-commerce/meliscommerce-tools-order-edit-tab-properties.png)

يفتح **New Order** **معالج دفع موجَّه من 7 خطوات**
(`contact → account → products → addresses → summary → payment → confirmation`)، مدعوماً بجلسة دفع
من جانب الخادم (نقاط النهاية تحت `/orders/checkout/*`) تستأنف من حيث توقفت.

![معالج دفع الطلب الجديد — خطوات جهة الاتصال / الحساب / المنتجات](/screenshots/react/melis-commerce/meliscommerce-tools-order-newordertunnel-1.png)

![معالج الدفع — خطوة العناوين / الملخّص](/screenshots/react/melis-commerce/meliscommerce-tools-order-newordertunnel-2.png)

## القسائم

تدير **القسائم (Coupons)** (`/melis-commerce/coupon-list`) رموز الخصم (نسبة مئوية أو مبلغ). علامات تبويب المحرِّر:
**Properties**، و**Assign account** (العملاء)، و**Assign product**، و**Orders** (سجل الاستخدام).
مدعومة بـ `MelisComCouponService`؛ والخصم المدمج هو نفسه مستمع (listener) على
`meliscommerce_service_get_item_price_end`.

![محرِّر القسيمة — علامة تبويب Assign account](/screenshots/react/melis-commerce/meliscommerce-tools-coupons-edit-tab-assignedclients.png)

## أدوات التجارة المرجعية

أدوات صغيرة على طراز "الإعدادات" — قوائم بصفحة واحدة مع نوافذ إضافة/تحرير منبثقة أو نموذج واحد:

| الأداة | Route | تُدير |
| --- | --- | --- |
| Countries | `/melis-commerce/country-list` | قائمة بلدان التجارة (إضافة/تحرير) |
| Commerce languages | `/melis-commerce/language-list` | لغات التجارة (قائمة + نافذة منبثقة) |
| Currencies | `/melis-commerce/currency-lists` | العملات (قائمة + نافذة منبثقة، **تعيين الافتراضي**) |
| Order status | `/melis-commerce/order-status-lists` | الحالات؛ يحتوي المحرِّر على Properties (اللون) + Labels |
| Client's groups | `/melis-commerce/clients-group-list` | مجموعات العملاء (قائمة + نافذة منبثقة) |
| Commerce settings | `/melis-commerce/settings` | صفحة إعدادات واحدة — علامتا تبويب Properties + Accounts |

![قائمة حالات الطلب (React)](/screenshots/react/melis-commerce/meliscommerce-tools-orderstatus-list.png)

![إعدادات التجارة — علامة تبويب Properties (عتبة تنبيه المخزون، استراتيجية اسم الحساب)](/screenshots/react/melis-commerce/meliscommerce-tools-settings-tab-properties.png)

تحتفظ إعدادات التجارة بعتبة تنبيه المخزون العامة واستراتيجية اسم الحساب (`sa_type`).

## الخدمات الأساسية

جميع الخدمات تُوسّع `MelisComGeneralService` ومسجَّلة في `config/module.config.php`. كل
دالة عامة (public) مغلَّفة بأحداث `meliscommerce_service_*_start` / `*_end` (راجع
[الأحداث والمستمعون](#events--listeners)). لا تقوم متحكمات React سوى بالتحقق من المدخلات وتشكيل JSON — أما
العمل الفعلي فيبقى في هذه الخدمات.

| اسم الخدمة المستعار | الدور |
| --- | --- |
| `MelisComProductService` | `getProductById`، `getProductList` → `MelisProduct` |
| `MelisComVariantService` | `getVariantById`، `getVariantListByProductId`، `getVariantBySKU`، `getMainVariantByProductId` → `MelisVariant` |
| `MelisComCategoryService` | `getCategoryById`، `getCategoryListById(Recursive)` → `MelisCategory` |
| `MelisComAttributeService` | `getAttributeById`، `getAttributes` → `MelisAttribute` |
| `MelisComPriceService` | `getItemPrice($itemId, $countryId, $groupId, $type)` — سعر مع تسلسل بدائل هرمي |
| `MelisComProductSearchService` | بحث المنتجات في الواجهة الأمامية |
| `MelisComSeoService` | تحسين محركات البحث للتجارة (عناوين URL / بيانات وصفية للمنتجات والتصنيفات) |
| `MelisComClientService` | `getClientById`، `getClientList`، `getClientByIdAndClientPerson` → `MelisClient` |
| `MelisComContactService` | إدارة جهات الاتصال (الأشخاص) |
| `MelisComClientGroupsService` | مجموعات العملاء (تُستخدم للتسعير الخاص بالمجموعات) |
| `MelisComAuthenticationService` | تسجيل الدخول في الواجهة الأمامية: `login`، `getClientId`، `getPersonId`، `getClientGroup`، `setClientId`، `logout`، `hasIdentity` |
| `MelisComBasketService` | `getBasket`، `getPersistentBasket`، `getAnonymousBasket`، `addVariantToBasket`، `transferAnonymousBasketToPersistentBasket` → `MelisBasket` |
| `MelisComOrderService` | `getOrderById`، `getOrderList` → `MelisOrder` |
| `MelisComOrderCheckoutService` | دفع من مرحلتين: `checkoutStep1_prePayment`، `checkoutStep2_postPayment` |
| `MelisComPostPaymentService` | تسجيل معاملة ما بعد الدفع |
| `MelisComOrderProductReturnService` | مرتجعات المنتجات / RMA |
| `MelisComCouponService` | `getCouponById`، `getCouponList` → `MelisCoupon` |
| `MelisComCurrencyService` | العملات |
| `MelisComShipmentCostService` | حساب تكلفة الشحن |
| `MelisComStockEmailAlertService` | تنبيهات بريدية لانخفاض المخزون (`VARIANTSLOWSTOCK`) |
| `MelisComDocumentService` | `getDocumentById`، `getDocumentsByRelation` → `MelisDocument` |
| `MelisComDuplicationService` | تكرار المنتجات / المتغيّرات |
| `MelisComLinksService` | باني روابط التجارة في الواجهة الأمامية |
| `MelisComCacheService` | ذاكرة التخزين المؤقت للتجارة (`commerce_big_services`) |
| `MelisComHead` | مساعد رأس SEO (`updateTitleAndDescription`) |
| `MelisComGeneralService` | الفئة الأساسية؛ المساعدات: `getTableColumns`، `getEcomLang`، `getFrontPluginLangId` |

## حلّ التسعير والمخزون

يسلك `MelisComPriceService::getItemPrice($itemId, $countryId, $groupId, $type)` سلسلة بدائل:

1. بلد محدَّد + مجموعة محدَّدة
2. بلد محدَّد + مجموعة عامة
3. بلد عام (`price_country_id = 0`) + مجموعة محدَّدة
4. بلد عام + مجموعة عامة
5. (لمتغيّر) العودة إلى سعر **المنتج**

المخزون لكل **متغيّر لكل بلد** (`melis_ecom_variant_stock`). عندما يُخفض طلبٌ المخزون دون
العتبة، يُرسَل البريد الإلكتروني `VARIANTSLOWSTOCK` إلى المستلمين المهيَّئين.

## مسار الدفع (Checkout pipeline)

مرحلتان في `MelisComOrderCheckoutService` (يقود معالج React منطق الخادم نفسه):

**المرحلة 1 — `checkoutStep1_prePayment($clientId)`** تتحقق من السلة والعناوين، وتحسب جميع
التكاليف والشحن، وتولّد مرجع الطلب، ثم تستدعي `MelisComOrderService::saveOrder()`.
يُحفَظ الطلب بالقيمة `ord_status = -1` (مؤقتة). تُطلِق
`meliscommerce_service_checkout_step1_prepayment_start/_end` و`…_save_success` (يحمل `orderId` الجديد).

**المرحلة 2 — `checkoutStep2_postPayment()`** تُستدعى بعد أن تُرجع بوابة الدفع نتيجتها.
`MelisComPostPaymentService::processPostPayment()` تسجّل المعاملة في
`melis_ecom_order_payment` وتنقل الطلب من الحالة `-1` إلى حالة فعلية. تُطلِق
`meliscommerce_service_checkout_step2_postpayment_start/_end`.

**حالات الطلب:** `-1` مؤقت · `1` طلب جديد · `2` معلّق · `3` تم الشحن · `4` تم التسليم ·
`5` ملغى · `6` خطأ في الدفع.

## الأحداث والمستمعون

تُصدر كل دالة خدمة الحدثين `meliscommerce_service_*_start` و`*_end`. المعاملات المسمّاة
(المبنية بواسطة `makeArrayFromParameters` عبر الانعكاس (reflection)) والمفتاح `results` تنتقل مع الحدث.

- مستمع `_start`: عدِّل المدخلات قبل تشغيل العمل.
- مستمع `_end`: عدِّل `$params['results']` قبل أن يراها المستدعي.

هذه هي آلية التوسعة الأساسية — لا حاجة إلى الوراثة (subclassing). تنقسم المستمعات الـ33 المضمَّنة إلى
أربع عائلات:

| العائلة | أمثلة |
| --- | --- |
| الحفظ / التحقق | `…SaveProductListener`، `…SaveOrderListener`، `…SaveClientListener`، `…ValidateVariantListener` |
| تنظيف متسلسل (عند إزالة بلد/لغة) | `…ProductPriceCountryDeletedListener`، `…CategoryCountryLink…`، `…SEOLanguageDeletedListener` |
| الدفع / التسعير / المخزون | `…CheckoutCouponListener`، `…CouponProductPriceListener`، `…ShipmentCostListener`، `…PostPaymentListener`، `…VariantCheckLowStockListener` |
| توجيه SEO في الواجهة الأمامية | `…SEOReformatToRoutePageUrlListener`، `…SEODispatchRouterCommerceUrlListener`، `…SEOMetaPageListener` |

## واجهة React البرمجية والقدرات

جميع المسارات هي مسارات فرعية لـ `melis-react-api` (مدمَجة من `config/react-api.php`): **13
متحكماً قابلاً للاستدعاء (invokable)** في `src/Controller/ReactApi/`، و**184 مساراً** تحت `/melis/react-api/…`.
عقد الاستجابة في كل مكان هو `{ success, data, error? }`؛ وكل إجراء يستدعي
`denyUnlessAccess()` أولاً (المصادقة + `MelisCoreRights::canAccess(<melisKey>)`، 401/403). تعرض كل أداة كيان
تقريباً `GET /<tool>` (قائمة keyset)، و`/<tool>/stats`، و`/<tool>/options`،
و`POST /<tool>/save`، و`DELETE /<tool>/delete/:id`، و`GET /<tool>/:id`، بالإضافة إلى موارد فرعية خاصة
بكل أداة (مثلاً تضيف Orders معالج `/orders/checkout/*` الكامل).

> ⚠ لغات التجارة موضوعة في مساحة أسماء `/commerce-languages` (وليس `/languages`) لأن أداة
> Languages الأساسية تملك بالفعل `/languages` تحت العنصر الأب المشترك `melis-react-api`.

يُعلن `config/react.capabilities.php` عن إدخال `melisReactToolCapabilities` واحد لكل أداة، مفهرَساً تحت
melisKey الخاص بها. هذه **تلميحات واجهة تصريحية بالسماح الافتراضي** — تُشغّل شجرة صناديق اختيار
Users → Rights وتتيح لـ React إخفاء علامات التبويب/الأزرار عبر `useCaps(...)` — لكن **لا يوجد بعد
`denyUnlessCan()` من جانب الخادم**؛ فقط `denyUnlessAccess()` على melisKey الخاص بالأداة يحرس الواجهة البرمجية. عامِل
القدرات كتلميحات للواجهة، وليس كأمان.

## الواجهة الأمامية

تُسجَّل إضافات القوالب تحت `config/plugins/{products,categories,clients,orders}/`
وكـ `controller_plugins` في `module.config.php`. أفلِتها في منطقة سحب وإفلات ضمن صفحة CMS.

| المجال | الإضافات |
| --- | --- |
| Catalog | `ProductShowPlugin`، `ProductListPlugin`، `ProductSearchPlugin`، `CategoryTreePlugin`، `CategoryProductListPlugin`، `RelatedProductsPlugin`، `AttributesShowPlugin`، `ProductAttributePlugin`، `ProductPriceRangePlugin` |
| Cart & checkout | `AddToCartPlugin`، `CartPlugin`، `CheckoutPlugin`، `CheckoutCartPlugin`، `CheckoutAddressesPlugin`، `CheckoutCouponPlugin`، `CheckoutSummaryPlugin`، `CheckoutConfirmSummaryPlugin`، `CheckoutConfirmPlugin` |
| Account | `LoginPlugin`، `RegisterPlugin`، `AccountPlugin`، `ProfilePlugin`، `BillingAddressPlugin`، `DeliveryAddressPlugin`، `LostPasswordGetEmailPlugin`، `LostPasswordResetPlugin` |
| Orders (customer) | `OrderPlugin`، `OrderHistoryPlugin`، `OrderMessagesPlugin`، `OrderShippingDetailsPlugin`، `OrderReturnProductPlugin`، `OrderAddressPlugin` |

## جداول قاعدة البيانات

59 جدولاً بالبادئة `melis_ecom_*`، مجمَّعة حسب النظام الفرعي:

| المجموعة | الجداول الأساسية |
| --- | --- |
| المنتجات والمتغيّرات | `melis_ecom_product`، `melis_ecom_product_text` + `_text_type`، `melis_ecom_product_attribute`، `melis_ecom_product_category`، `melis_ecom_variant`، `melis_ecom_variant_attribute_value`، `melis_ecom_variant_stock`، `melis_ecom_assoc_variant` + `_type` |
| السمات | `melis_ecom_attribute` + `_trans`، `melis_ecom_attribute_type`، `melis_ecom_attribute_value` + `_value_trans` |
| التصنيفات والجغرافيا | `melis_ecom_category` + `_trans`، `melis_ecom_country_category`، `melis_ecom_country`، `melis_ecom_lang` |
| التسعير والعملة | `melis_ecom_price`، `melis_ecom_currency` |
| العملاء (B2B) | `melis_ecom_client`، `melis_ecom_client_person` + `_person_emails`، `melis_ecom_client_company`، `melis_ecom_client_account_rel`، `melis_ecom_client_person_rel`، `melis_ecom_client_address` + `_address_type`، `melis_ecom_client_groups`، `melis_ecom_civility`، `melis_ecom_settings_account` |
| السلال والطلبات | `melis_ecom_basket_anonymous`، `melis_ecom_basket_persistent`، `melis_ecom_order`، `melis_ecom_order_basket`، `melis_ecom_order_address`، `melis_ecom_order_payment` + `_type`، `melis_ecom_order_shipping`، `melis_ecom_order_message`، `melis_ecom_order_status` + `_trans`، `melis_ecom_order_product_return` + `_details` |
| القسائم | `melis_ecom_coupon` + `_coupon_client` / `_coupon_order` / `_coupon_product` |
| المستندات وSEO | `melis_ecom_document` + `_doc_type` + `_doc_relations`، `melis_ecom_seo`، `melis_ecom_stock_email_alert` |

## أمثلة

**قراءة منتج، ومتغيّره الرئيسي، وسعر محلول**

```php
$prdSrv   = $sm->get('MelisComProductService');
$varSrv   = $sm->get('MelisComVariantService');
$priceSrv = $sm->get('MelisComPriceService');

$product = $prdSrv->getProductById($prdId, $langId, $countryId);  // → MelisProduct
$variant = $varSrv->getMainVariantByProductId($prdId, $langId, $countryId);  // → MelisVariant
$price   = $priceSrv->getItemPrice($variant->getId(), $countryId, $groupId, 'variant');
// $price['price'] (net), $price['price_currency'], $price['price_details']
```

**الإضافة إلى السلة وتشغيل الدفع من مرحلتين**

```php
$basketSrv   = $sm->get('MelisComBasketService');
$checkoutSrv = $sm->get('MelisComOrderCheckoutService');

$basketSrv->addVariantToBasket($variantId, 1, $clientId);
$basketSrv->transferAnonymousBasketToPersistentBasket($clientKey, $clientId);

$step1 = $checkoutSrv->checkoutStep1_prePayment($clientId);  // order at status -1
// $step1['orderId'] — hand to payment gateway
$step2 = $checkoutSrv->checkoutStep2_postPayment();          // records payment, moves off -1
```

**ربط المتجر دون وراثة (subclassing)**

```php
// _start → mutate inputs; _end → mutate $params['results'].
$this->attachEventListener(
    $events, '*', 'meliscommerce_service_get_item_price_end',
    function ($e) {
        $params = $e->getParams();
        $price  = $params['results'];
        // modify $price, then:
        $params['results'] = $price;
        return $params;
    }
);
```

## الملفات الأساسية

| الموضوع | المسار |
| --- | --- |
| إعدادات الوحدة (الخدمات، المتحكمات، الإضافات) | `vendor/melisplatform/melis-commerce/config/module.config.php` |
| مسارات واجهة React البرمجية / القدرات | `vendor/melisplatform/melis-commerce/config/react-api.php`، `config/react.capabilities.php` |
| قالب React (المصدر / البناء) | `vendor/melisplatform/melis-commerce/ui-react/src/`، `public/ui-react/{brick.js, brick.manifest.json}` |
| متحكمات واجهة React البرمجية (13) | `vendor/melisplatform/melis-commerce/src/Controller/ReactApi/` |
| إعدادات إضافات الواجهة الأمامية | `vendor/melisplatform/melis-commerce/config/plugins/` |
| الخدمات / الكيانات (10) / بوابات الجداول (59) | `vendor/melisplatform/melis-commerce/src/Service/`، `src/Entity/`، `src/Model/Tables/` |
| المستمعون (33) | `vendor/melisplatform/melis-commerce/src/Listener/` |
| فروق قاعدة البيانات (DB deltas) | `vendor/melisplatform/melis-commerce/install/dbdeploy/` |

انظر أيضاً: [مرجع الوحدات](/ar/reference/modules) · [melis-react-api](/ar/reference/modules/melis-react-api) · [melis-commerce-order-invoice](/ar/reference/modules/melis-commerce-order-invoice) · [melis-core](/legacy/reference/modules/melis-core) · [melis-cms](/ar/reference/modules/melis-cms).
