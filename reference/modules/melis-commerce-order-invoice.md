# MelisCommerceOrderInvoice

> Adds PDF order-invoice generation to MelisCommerce, surfaced inside the React Orders tool. Package `melisplatform/melis-commerce-order-invoice`.

## Purpose

`MelisCommerceOrderInvoice` extends [MelisCommerce](/guide/commerce) with order invoicing. When an
order is validated it auto-generates a PDF invoice (via `spipu/html2pdf`) and stores it in the
database. It ships **no tool of its own**: in the React back-office (`/melis-react`) it injects two
pieces into the **MelisCommerce → Orders** tool — an **Invoices** tab in the order editor (list,
regenerate, download) and a small **download** button on each order-list row. The invoice template is
a `.phtml` view, fully overridable per locale.

## Enable it

It is a standard Laminas module. Add it to `config/melis.module.load.php` (after `MelisCommerce`,
which it depends on):

```php
'MelisCommerce',
'MelisCommerceOrderInvoice',
```

Dependencies (from `composer.json`): `melisplatform/melis-commerce` and `spipu/html2pdf`. The module
is `dbdeploy`-enabled, so its table is created through the dbdeploy delta on install.

## React back-office

This module's brick is an **extension / host-injection brick**: it draws no page, no route and no
sidebar entry. Its `brick.manifest.json` sets `route`, `label`, `forwardKey` and `melisKey` all to
`null` (only `entry: "brick.js"` is real; brick id `commerce-order-invoice`). On load, `brick.tsx`
publishes two React components on a `window` global instead of calling `__melisRegisterBrick`:

```ts
window.MelisCommerceOrderInvoiceBrick = { OrderRowButton, InvoicesTab }
```

The MelisCommerce Orders tool consumes them **only if this module is active** — it polls
`window.MelisCommerceOrderInvoiceBrick` via its `useExternalBrickComponent(globalName, key)` hook and
renders nothing if the global is never set. Both components take a single `{ orderId: number }` prop
and read `document.documentElement.lang` for FR/EN labels.

| Component (`ui-react/src/`) | Where it appears | Behaviour |
| --- | --- | --- |
| `OrderRowButton` | Orders list — per order row | Fetches the order's latest invoice id; downloads its PDF, or alerts *"No invoice available"* if none. |
| `InvoicesTab` | Order editor — **Invoices** tab (existing order only) | Lists invoices (**ID**, **Date**), offers **Regenerate Invoice**, and a per-row **download**. |

The brick is a Vite IIFE bundle (`ui-react/vite.config.ts`, name `MelisCommerceOrderInvoiceBrickBundle`)
built to `public/ui-react/brick.js`; React and react-router are externalised to the host globals, so the
brick reuses the host's React instance.

## Endpoints the brick calls

The brick has **no `config/react-api.php`** — its client (`invoiceApi.ts`) re-plays the module's own
**legacy MVC** actions with `credentials: 'same-origin'`, all under one base:

```ts
export const INVOICE_BASE = '/melis/MelisCommerceOrderInvoice/MelisCommerceOrderInvoice'
```

| Call | Controller action | Returns |
| --- | --- | --- |
| `POST {INVOICE_BASE}/getOrderLatestInvoiceId` (`orderId`) | `getOrderLatestInvoiceIdAction` | JSON `{ latestInvoiceId }` (0 if none) |
| `POST {INVOICE_BASE}/getOrderInvoice` (`invoiceId`) | `getOrderInvoiceAction` | PDF bytes + a `fileName` response header |
| `POST {INVOICE_BASE}/getOrderInvoiceList` (`draw,start,length,orderId`) | `getOrderInvoiceListAction` | DataTables JSON `{ data: [{ ordin_id, ordin_date_generated }] }` |
| `POST {INVOICE_BASE}/generateOrderInvoice` (`orderId`) | `generateOrderInvoiceAction` | JSON `{ id }` (the new invoice id) |

These return raw legacy JSON/binary, **not** the `{ success, data, error }` react-api envelope, so the
client normalises them (`fetchOrderInvoiceList` maps `ordin_id`/`ordin_date_generated`;
`downloadInvoiceFile` reads the `fileName` header). Server-side, the actions delegate to
`MelisCommerceOrderInvoiceService`, calling `generateOrderInvoice($orderId, 'orderinvoicetemplate/default')`
for a regenerate. The module also declares two extra literal routes
(`/CommerceOrderInvoice/getOrderLatestInvoiceId`, `/CommerceOrderInvoice/getInvoice`), but the React
brick uses the segment route above.

## Capabilities & gating

There is **no `config/react.capabilities.php`** in this module. Gating is two-layered:

- **UI visibility** — the host renders the row button and the tab only if the brick is loaded; the
  **Invoices** tab is additionally filtered by MelisCommerce's own `invoices` capability under its
  `meliscommerce_order_list_page` caps tree.
- **API access** — only the PDF-download action enforces a right server-side:
  `getOrderInvoiceAction` checks `canAccess('meliscommerce_orders_content_tab_order_invoice')` and
  returns 403 otherwise. The list/latest/generate actions only require a BO session, so treat the
  tab/button visibility as UI hints rather than a hard authorization boundary.

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
| `getOrderInvoiceList($orderId, $start, $limit, $order)` | Lists an order's invoices. |
| `getOrderLatestInvoiceId($orderId)` | Latest invoice id for an order, or `0` if none. |
| `getInvoice($invoiceId)` | The invoice row by id. |
| `getOrderInvoice($invoiceId)` | The raw PDF blob (`ordin_invoice_pdf`) of an invoice. |
| `generateFileName($dateGenerated, $orderId, $invoiceId)` | Builds the download filename (`Y/m/d-order-invoice[-suffix].pdf`). |

Each method fires `meliscommerce_order_invoice_*_start` / `_end` events. PDF building also fires
`meliscommerceorderinvoice_pdf_view`, letting you override the `ViewModel` before rendering. The
filename suffix comes from `plugins.meliscommerceorderinvoice.data.custom-pdf-file-name` (default
`invoice`) in `config/app.interface.php`.

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
| React brick source | `ui-react/src/{brick.tsx, OrderRowButton.tsx, InvoicesTab.tsx, invoiceApi.ts}` |
| Brick build + manifest | `public/ui-react/{brick.js, brick.manifest.json}` |
| Invoice service | `src/Service/MelisCommerceOrderInvoiceService.php` |
| Table gateway | `src/Model/Tables/MelisCommerceOrderInvoiceTable.php` |
| Controller | `src/Controller/MelisCommerceOrderInvoiceController.php` |
| Listeners | `src/Listener/` |
| Module / config | `src/Module.php`, `config/module.config.php`, `config/app.interface.php`, `config/app.tools.php` |
| Invoice template | `view/melis-commerce-order-invoice/melis-commerce-order-invoice/default-order-invoice-template.phtml` |
| DB structure | `install/dbdeploy/021419_melis_commerce_order_invoice_structure.sql` |
