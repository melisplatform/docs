# MelisCommerceOrderInvoice

> Adds PDF order-invoice generation to MelisCommerce.
> Package: `melisplatform/melis-commerce-order-invoice`.

## Purpose

`MelisCommerceOrderInvoice` extends [MelisCommerce](/guide/commerce) with order invoicing. When an
order is validated it auto-generates a PDF invoice (via `spipu/html2pdf`) and stores it in the
database. In the backoffice it adds an **Invoices** tab inside the MelisCommerce *Orders* tool where
each order's invoices are listed, can be regenerated and downloaded; the order list also gets an
*export PDF* action. The invoice template is a `.phtml` view, fully overridable per locale.

## Enable it

It is a standard Laminas module. Add it to `config/melis.module.load.php` (after `MelisCommerce`,
which it depends on):

```php
'MelisCommerce',
'MelisCommerceOrderInvoice',
```

Dependencies (from `composer.json`): `melisplatform/melis-commerce` (`^5.2`) and
`spipu/html2pdf` (`^5.2`); PHP `^8.1|^8.3`. The module is `dbdeploy`-enabled, so its table is created
through the dbdeploy delta on install.

## Key services

Registered as `service_manager` aliases in `config/module.config.php`:

| Service alias | Role |
| --- | --- |
| `MelisCommerceOrderInvoiceService` | The invoice service (extends `MelisComGeneralService`). Generates, retrieves and lists invoices. |
| `MelisCommerceOrderInvoiceTable` | Table gateway over `melis_ecom_order_invoice` (extends `MelisEcomGenericTable`). |

Notable methods on `MelisCommerceOrderInvoiceService`:

| Method | Role |
| --- | --- |
| `generateOrderInvoice($orderId, $template)` | Builds the PDF for an order and saves it; returns the new invoice id. |
| `getOrderInvoiceList($orderId, $start, $limit, $order)` | Lists an order's invoices (one in front, all in back). |
| `getOrderLatestInvoiceId($orderId)` | Latest invoice id for an order, or `0` if none. |
| `getInvoice($invoiceId)` | The invoice row by id. |
| `getOrderInvoice($invoiceId)` | The raw PDF blob (`ordin_invoice_pdf`) of an invoice. |
| `generateFileName($dateGenerated, $orderId, $invoiceId)` | Builds the download filename (`Y/m/d-order-invoice[-suffix].pdf`). |

Each method fires `meliscommerce_order_invoice_*_start` / `_end` events. PDF building also fires
`meliscommerceorderinvoice_pdf_view`, letting you override the `ViewModel` before rendering. The
filename suffix comes from `plugins.meliscommerceorderinvoice.data.custom-pdf-file-name` (default
`invoice`) in `config/app.interface.php`.

## Backoffice

The module declares no top-level tool of its own; it grafts onto the MelisCommerce *Orders* tool
through `config/app.interface.php` and `config/app.tools.php`:

- **Invoices tab** on an order — interface key `meliscommerce_orders_content_tab_order_invoice`
  and content key `meliscommerce_orders_content_tabs_content_order_invoice`. The tab holds a
  *Regenerate Invoice* action and the invoice list table.
- **Order invoice list** table (key `meliscommerce_order_invoice_list`), filled by
  `MelisCommerceOrderInvoice/MelisCommerceOrderInvoice/getOrderInvoiceList`, with columns
  `ordin_id` and `ordin_date_generated` and an `export-pdf` action button.
- **Export PDF** action button added to the standard `meliscommerce_order_list` table.

Controller: `MelisCommerceOrderInvoice\Controller\MelisCommerceOrderInvoiceController`
(invokable id `MelisCommerceOrderInvoice\Controller\MelisCommerceOrderInvoice`). Key actions:
`generateOrderInvoiceAction`, `getOrderInvoiceListAction`, `getOrderInvoiceAction` (download),
`getOrderLatestInvoiceIdAction`, and the `render-*` UI fragment actions referenced by the interface
config. See [Module reference](/reference/modules) and [Create a tool](/guide/create-a-tool).

Two non-backoffice routes expose invoices for download:

| Route | Action |
| --- | --- |
| `/CommerceOrderInvoice/getOrderLatestInvoiceId` | `getOrderLatestInvoiceId` |
| `/CommerceOrderInvoice/getInvoice` | `getOrderInvoice` |

## Listeners (integration)

The module wires itself in via three listeners (attached in `src/Module.php`) rather than front
templating plugins of its own:

| Listener | Listens to | Effect |
| --- | --- | --- |
| `MelisCommerceOrderInvoiceGenerateInvoiceListener` | `meliscommerce_service_checkout_step2_postpayment_proccess_end` | On a successful order with status `1`, auto-generates the invoice from `orderinvoicetemplate/default`. |
| `MelisCommerceOrderDetailsInvoiceDataListener` | `MelisCommerceOrderPlugin_melistemplating_plugin_generate_view` | Injects the latest invoice (+ download URL) into the order-details plugin view. |
| `MelisCommerceOrderHistoryInvoiceDataListener` | `MelisCommerceOrderHistoryPlugin_melistemplating_plugin_generate_view` | Adds `invoiceId` to each row of the order-history plugin. |

This is how the module feeds the MelisCommerce account/order front plugins; it ships no
`MelisTemplatingPlugin` of its own (see [Plugins](/guide/plugins)).

## Database tables

| Table | Role |
| --- | --- |
| `melis_ecom_order_invoice` | One row per generated invoice. Columns: `ordin_id` (PK), `ordin_user_id`, `ordin_order_id`, `ordin_date_generated`, `ordin_invoice_pdf` (the PDF stored as `longblob`). |

## Example

Generate (or regenerate) and download the latest invoice for an order from a controller/service:

```php
$invoiceSvc = $serviceManager->get('MelisCommerceOrderInvoiceService');

// Generate a fresh invoice from the default template
$invoiceId = $invoiceSvc->generateOrderInvoice($orderId, 'orderinvoicetemplate/default');

// Fetch the latest invoice and its raw PDF
$latestId = $invoiceSvc->getOrderLatestInvoiceId($orderId);
$pdf      = $invoiceSvc->getOrderInvoice($latestId);   // binary PDF contents
```

## Key files

| Concern | Path |
| --- | --- |
| Invoice service | `vendor/melisplatform/melis-commerce-order-invoice/src/Service/MelisCommerceOrderInvoiceService.php` |
| Table gateway | `vendor/melisplatform/melis-commerce-order-invoice/src/Model/Tables/MelisCommerceOrderInvoiceTable.php` |
| Controller | `vendor/melisplatform/melis-commerce-order-invoice/src/Controller/MelisCommerceOrderInvoiceController.php` |
| Listeners | `vendor/melisplatform/melis-commerce-order-invoice/src/Listener/` |
| Module / config | `vendor/melisplatform/melis-commerce-order-invoice/src/Module.php`, `config/module.config.php`, `config/app.interface.php`, `config/app.tools.php` |
| Invoice template | `vendor/melisplatform/melis-commerce-order-invoice/view/melis-commerce-order-invoice/melis-commerce-order-invoice/default-order-invoice-template.phtml` |
| DB structure | `vendor/melisplatform/melis-commerce-order-invoice/install/dbdeploy/021419_melis_commerce_order_invoice_structure.sql` |
