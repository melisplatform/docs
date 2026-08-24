# MelisCommerceOrderInvoice

> يضيف توليد فواتير الطلبات بصيغة PDF إلى MelisCommerce، ويظهر داخل أداة الطلبات (Orders) في React. الحزمة `melisplatform/melis-commerce-order-invoice`.

## الغرض

يوسّع `MelisCommerceOrderInvoice` وحدة [MelisCommerce](/ar/guide/commerce) بإضافة فوترة الطلبات. عند
التحقق من طلب ما، يقوم تلقائيًا بتوليد فاتورة PDF (عبر `spipu/html2pdf`) ويخزّنها في قاعدة
البيانات. لا تأتي هذه الوحدة **بأداة خاصة بها**: ففي الواجهة الخلفية بتقنية React (`/melis-react`) تحقن جزأين
داخل أداة **MelisCommerce ← Orders** — تبويب **Invoices** في محرّر الطلب (عرض القائمة، إعادة التوليد،
التنزيل)، وزرّ **download** صغير في كل صف من صفوف قائمة الطلبات. قالب الفاتورة هو
واجهة عرض `.phtml`، قابلة للتجاوز بالكامل لكل لغة (locale).

## تفعيلها

هي وحدة Laminas قياسية. أضفها إلى `config/melis.module.load.php` (بعد `MelisCommerce`،
الذي تعتمد عليه):

```php
'MelisCommerce',
'MelisCommerceOrderInvoice',
```

التبعيات (من `composer.json`): `melisplatform/melis-commerce` و `spipu/html2pdf`. الوحدة
مفعّلة لـ `dbdeploy`، لذا يُنشأ جدولها عبر دلتا dbdeploy عند التثبيت.

## الواجهة الخلفية بتقنية React

قالب (brick) هذه الوحدة هو **قالب توسيع / حقن في المضيف**: فهو لا يرسم أي صفحة، ولا مسارًا، ولا
عنصرًا في الشريط الجانبي. يضبط ملفه `brick.manifest.json` كلًّا من `route` و `label` و `forwardKey` و `melisKey`
على القيمة `null` (فقط `entry: "brick.js"` قيمة حقيقية؛ معرّف القالب `commerce-order-invoice`). عند التحميل، ينشر `brick.tsx`
مكوّنَي React على متغيّر `window` عام بدلًا من استدعاء `__melisRegisterBrick`:

```ts
window.MelisCommerceOrderInvoiceBrick = { OrderRowButton, InvoicesTab }
```

تستهلك أداة الطلبات (Orders) في MelisCommerce هذين المكوّنين **فقط إذا كانت هذه الوحدة مفعّلة** — إذ تستطلع
`window.MelisCommerceOrderInvoiceBrick` عبر خطّافها `useExternalBrickComponent(globalName, key)`، ولا
تعرض شيئًا إذا لم يُضبط المتغيّر العام إطلاقًا. يأخذ كلا المكوّنين خاصية واحدة `{ orderId: number }`
ويقرآن `document.documentElement.lang` لتحديد تسميات FR/EN.

| المكوّن (`ui-react/src/`) | مكان ظهوره | السلوك |
| --- | --- | --- |
| `OrderRowButton` | قائمة الطلبات — لكل صف طلب | يجلب معرّف أحدث فاتورة للطلب؛ وينزّل ملفها PDF، أو ينبّه بـ *"No invoice available"* إن لم تكن هناك فاتورة. |
| `InvoicesTab` | محرّر الطلب — تبويب **Invoices** (للطلب الموجود فقط) | يسرد الفواتير (**ID**، **Date**)، ويوفّر **Regenerate Invoice**، وزرّ **download** لكل صف. |

القالب هو حزمة Vite IIFE (`ui-react/vite.config.ts`، بالاسم `MelisCommerceOrderInvoiceBrickBundle`)
مبنية إلى `public/ui-react/brick.js`؛ ويُخرَج React و react-router كتبعيات خارجية إلى المتغيّرات العامة للمضيف، فيعيد
القالب استخدام نسخة React الخاصة بالمضيف.

## نقاط النهاية التي يستدعيها القالب

لا يملك القالب **أي ملف `config/react-api.php`** — فعميله (`invoiceApi.ts`) يعيد تشغيل إجراءات
**MVC القديمة (legacy)** الخاصة بالوحدة نفسها مع `credentials: 'same-origin'`، وكلّها تحت مسار أساسي واحد:

```ts
export const INVOICE_BASE = '/melis/MelisCommerceOrderInvoice/MelisCommerceOrderInvoice'
```

| الاستدعاء | إجراء المتحكّم (Controller) | القيمة المُعادة |
| --- | --- | --- |
| `POST {INVOICE_BASE}/getOrderLatestInvoiceId` (`orderId`) | `getOrderLatestInvoiceIdAction` | JSON `{ latestInvoiceId }` (0 إن لم توجد) |
| `POST {INVOICE_BASE}/getOrderInvoice` (`invoiceId`) | `getOrderInvoiceAction` | بايتات PDF + ترويسة استجابة `fileName` |
| `POST {INVOICE_BASE}/getOrderInvoiceList` (`draw,start,length,orderId`) | `getOrderInvoiceListAction` | JSON بصيغة DataTables `{ data: [{ ordin_id, ordin_date_generated }] }` |
| `POST {INVOICE_BASE}/generateOrderInvoice` (`orderId`) | `generateOrderInvoiceAction` | JSON `{ id }` (معرّف الفاتورة الجديدة) |

تُعيد هذه النقاط JSON/بيانات ثنائية قديمة خامًا، **وليس** غلاف react-api `{ success, data, error }`، لذا
يقوم العميل بتوحيدها (يربط `fetchOrderInvoiceList` بين `ordin_id`/`ordin_date_generated`؛
ويقرأ `downloadInvoiceFile` ترويسة `fileName`). أما على جانب الخادم، فتفوّض الإجراءات إلى
`MelisCommerceOrderInvoiceService`، مستدعيةً `generateOrderInvoice($orderId, 'orderinvoicetemplate/default')`
عند إعادة التوليد. تعلن الوحدة أيضًا عن مسارين نصّيين إضافيين
(`/CommerceOrderInvoice/getOrderLatestInvoiceId`, `/CommerceOrderInvoice/getInvoice`)، لكن قالب
React يستخدم المسار المُجزَّأ (segment route) الوارد أعلاه.

## القدرات والتحكّم في الوصول

لا يوجد **أي ملف `config/react.capabilities.php`** في هذه الوحدة. يتألّف التحكّم في الوصول من طبقتين:

- **ظهور الواجهة** — لا يعرض المضيف زرّ الصف والتبويب إلا إذا كان القالب محمّلًا؛ كما يُرشَّح
  تبويب **Invoices** إضافيًا بقدرة MelisCommerce الخاصة `invoices` ضمن شجرة القدرات
  `meliscommerce_order_list_page` الخاصة بها.
- **الوصول عبر الـ API** — إجراء تنزيل PDF وحده هو ما يفرض صلاحية على جانب الخادم:
  إذ يتحقّق `getOrderInvoiceAction` من `canAccess('meliscommerce_orders_content_tab_order_invoice')`
  ويُعيد 403 خلاف ذلك. أما إجراءات القائمة/الأحدث/التوليد فلا تتطلّب سوى جلسة في الواجهة الخلفية، لذا عامِل
  ظهور التبويب/الزرّ باعتباره تلميحات واجهة لا حدًّا صارمًا للتفويض.

## الخدمات الأساسية

مُسجَّلة كأسماء مستعارة (aliases) لـ `service_manager` في `config/module.config.php`:

| الاسم المستعار للخدمة | الدور |
| --- | --- |
| `MelisCommerceOrderInvoiceService` | خدمة الفواتير (توسّع `MelisComGeneralService`). تولّد الفواتير وتجلبها وتسردها. |
| `MelisCommerceOrderInvoiceTable` | بوّابة جدول (Table gateway) فوق `melis_ecom_order_invoice` (توسّع `MelisEcomGenericTable`). |

طرق (methods) بارزة في `MelisCommerceOrderInvoiceService`:

| الطريقة | الدور |
| --- | --- |
| `generateOrderInvoice($orderId, $template)` | تبني ملف PDF لطلب وتحفظه؛ وتُعيد معرّف الفاتورة الجديدة. |
| `getOrderInvoiceList($orderId, $start, $limit, $order)` | تسرد فواتير طلب ما. |
| `getOrderLatestInvoiceId($orderId)` | معرّف أحدث فاتورة لطلب، أو `0` إن لم توجد. |
| `getInvoice($invoiceId)` | صفّ الفاتورة حسب المعرّف. |
| `getOrderInvoice($invoiceId)` | كتلة PDF الخام (`ordin_invoice_pdf`) لفاتورة. |
| `generateFileName($dateGenerated, $orderId, $invoiceId)` | تبني اسم ملف التنزيل (`Y/m/d-order-invoice[-suffix].pdf`). |

تُطلق كل طريقة أحداث `meliscommerce_order_invoice_*_start` / `_end`. كما يُطلق بناء الـ PDF
حدث `meliscommerceorderinvoice_pdf_view`، ما يتيح لك تجاوز `ViewModel` قبل التصيير (rendering). تأتي
لاحقة اسم الملف (suffix) من `plugins.meliscommerceorderinvoice.data.custom-pdf-file-name` (القيمة الافتراضية
`invoice`) في `config/app.interface.php`.

## المستمعون (التكامل)

تربط الوحدة نفسها عبر ثلاثة مستمعين (listeners) (مرتبطين في `src/Module.php`) بدلًا من إضافات القوالب الأمامية (front
templating plugins) الخاصة بها:

| المستمع | يستمع إلى | الأثر |
| --- | --- | --- |
| `MelisCommerceOrderInvoiceGenerateInvoiceListener` | `meliscommerce_service_checkout_step2_postpayment_proccess_end` | عند نجاح طلب بحالة `1`، يولّد الفاتورة تلقائيًا من `orderinvoicetemplate/default`. |
| `MelisCommerceOrderDetailsInvoiceDataListener` | `MelisCommerceOrderPlugin_melistemplating_plugin_generate_view` | يحقن أحدث فاتورة (+ رابط التنزيل) في واجهة عرض إضافة تفاصيل الطلب. |
| `MelisCommerceOrderHistoryInvoiceDataListener` | `MelisCommerceOrderHistoryPlugin_melistemplating_plugin_generate_view` | يضيف `invoiceId` إلى كل صف من صفوف إضافة سجلّ الطلبات. |

هكذا تغذّي الوحدة إضافات الحساب/الطلب الأمامية في MelisCommerce؛ وهي لا تأتي بأي
`MelisTemplatingPlugin` خاص بها (انظر [الإضافات](/ar/guide/plugins)).

## جداول قاعدة البيانات

| الجدول | الدور |
| --- | --- |
| `melis_ecom_order_invoice` | صفّ واحد لكل فاتورة مولَّدة. الأعمدة: `ordin_id` (المفتاح الأساسي)، `ordin_user_id`، `ordin_order_id`، `ordin_date_generated`، `ordin_invoice_pdf` (ملف PDF مخزَّن كـ `longblob`). |

## مثال

توليد (أو إعادة توليد) أحدث فاتورة لطلب وتنزيلها من متحكّم/خدمة:

```php
$invoiceSvc = $serviceManager->get('MelisCommerceOrderInvoiceService');

// Generate a fresh invoice from the default template
$invoiceId = $invoiceSvc->generateOrderInvoice($orderId, 'orderinvoicetemplate/default');

// Fetch the latest invoice and its raw PDF
$latestId = $invoiceSvc->getOrderLatestInvoiceId($orderId);
$pdf      = $invoiceSvc->getOrderInvoice($latestId);   // binary PDF contents
```

## الملفات الأساسية

| الموضوع | المسار |
| --- | --- |
| مصدر قالب React | `ui-react/src/{brick.tsx, OrderRowButton.tsx, InvoicesTab.tsx, invoiceApi.ts}` |
| بناء القالب + البيان (manifest) | `public/ui-react/{brick.js, brick.manifest.json}` |
| خدمة الفواتير | `src/Service/MelisCommerceOrderInvoiceService.php` |
| بوّابة الجدول | `src/Model/Tables/MelisCommerceOrderInvoiceTable.php` |
| المتحكّم | `src/Controller/MelisCommerceOrderInvoiceController.php` |
| المستمعون | `src/Listener/` |
| الوحدة / الإعداد | `src/Module.php`, `config/module.config.php`, `config/app.interface.php`, `config/app.tools.php` |
| قالب الفاتورة | `view/melis-commerce-order-invoice/melis-commerce-order-invoice/default-order-invoice-template.phtml` |
| بنية قاعدة البيانات | `install/dbdeploy/021419_melis_commerce_order_invoice_structure.sql` |
