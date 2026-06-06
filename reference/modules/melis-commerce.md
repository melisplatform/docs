# MelisCommerce

> The e-commerce module: catalog (products, variants, attributes, categories), customers, baskets,
> orders, checkout, coupons and shipping. Package `melisplatform/melis-commerce`.

## Purpose

MelisCommerce turns a Melis site into an online shop. In the backoffice it adds the full set of
commerce tools (products, variants, attributes, categories, clients, orders, coupons, currencies,
shipping…); on the front office it ships templating plugins for product pages, baskets, login and
checkout. It is built on a layer of `MelisCom*` services backed by `melis_ecom_*` database tables.
For an end-to-end walkthrough, see [Commerce](/guide/commerce).

## Enable it

MelisCommerce is a standard Laminas module listed in `config/melis.module.load.php`:

```php
'MelisCommerce',
```

It requires `melisplatform/melis-core` (and the platform stack: `melis-engine` / `melis-front`
to render the front-office plugins). The companion module `MelisCommerceOrderInvoice` adds order
invoicing. Database tables are created via dbdeploy (`extra.dbdeploy: true` in `composer.json`,
deltas under `install/dbdeploy/`).

## Key services

Registered as `service_manager` aliases in `config/module.config.php`. Most expose `getXxxList`,
`getXxxById` and `saveXxx` / `deleteXxx` methods returning Melis commerce entities.

| Service alias | Role |
| --- | --- |
| `MelisComProductService` | Products: `getProductList`, `getProductById`, `getProductVariants`, `getProductPricesById`, `saveProduct`, `deleteProductById`, `formatPrice`. |
| `MelisComVariantService` | Product variants (stock-bearing sellable items) and their attribute values. |
| `MelisComAttributeService` | Attributes, attribute types and translated values. |
| `MelisComCategoryService` | Catalog categories (translated, per-country). |
| `MelisComProductSearchService` | Front-office product search. |
| `MelisComPriceService` | Price computation (per country / client group). |
| `MelisComClientService` | Customers/accounts: `getClientList`, `getClientById`, `getClientMainPersonByClientId`, addresses. |
| `MelisComClientGroupsService` | Client groups (used for group-specific pricing). |
| `MelisComContactService` | Account contacts. |
| `MelisComAuthenticationService` | Front client auth: `login`, `getClientId`, `getPersonId`, `getClientKey`, `getClientGroup`. |
| `MelisComBasketService` | Cart: `getBasket`, `addVariantToBasket`, `removeVariantFromBasket`, `emptyBasket`; anonymous (`clientKey`) and persistent baskets. |
| `MelisComOrderService` | Orders: `getOrderList`, `getOrderById`, addresses/shipping/payment/messages, `exportOrderList`. |
| `MelisComOrderCheckoutService` | Checkout flow (turns a basket into an order). |
| `MelisComOrderProductReturnService` | Product returns / RMA. |
| `MelisComPostPaymentService` | Post-payment handling. |
| `MelisComCouponService` | Discount coupons (per client / order / product). |
| `MelisComShipmentCostService` | Shipping cost computation. |
| `MelisComCurrencyService` | Currencies. |
| `MelisComStockEmailAlertService` | Back-in-stock email alerts. |
| `MelisComSeoService` | Commerce SEO (URLs / meta for products & categories). |
| `MelisComLinksService` | Builds front-office commerce links (also via the `MelisCommerceLink` view helper). |
| `MelisComDocumentService` | Product/order documents (media). |
| `MelisComDuplicationService` | Duplicate products / variants. |
| `MelisComCacheService` | Commerce cache layer. |
| `MelisComHead` | Commerce general/head data. |

## Backoffice

Tools are declared per area under `config/tools/app.tools.*.php` and `config/interface/app.interface.*.php`,
all under the `meliscommerce` plugin key — e.g. `meliscommerce_products`, `meliscommerce_variants`,
`meliscommerce_attributes`, `meliscommerce_categories`, `meliscommerce_clients`,
`meliscommerce_clients_group`, `meliscommerce_orders`, `meliscommerce_coupons`,
`meliscommerce_currency`, `meliscommerce_country`, `meliscommerce_language`,
`meliscommerce_documents`, `meliscommerce_checkout`, `meliscommerce_contact`. Each maps to a
controller such as `MelisCommerce\Controller\MelisComProductList`, `…MelisComVariantList`,
`…MelisComOrderList`, `…MelisComClientList`. See [Create a tool](/guide/create-a-tool).

Dashboard widgets (in `config/dashboard-plugins/`): `MelisCommerceDashboardPluginOrdersNumber`,
`MelisCommerceDashboardPluginSalesRevenue`, `MelisCommerceDashboardPluginOrderMessages`.

## Front office

Templating plugins live under `config/plugins/{products,categories,clients,orders}/` and are
registered as `controller_plugins` in `module.config.php`. Drop them into a page's
`MelisDragDropZone` (see [Plugins](/guide/plugins)). Notable ones:

| Area | Plugins |
| --- | --- |
| Products | `MelisCommerceProductShowPlugin`, `MelisCommerceProductListPlugin`, `MelisCommerceProductSearchPlugin`, `MelisCommerceRelatedProductsPlugin`, `MelisCommerceProductPriceRangePlugin`, `MelisCommerceAttributesShowPlugin`, `MelisCommerceProductAttributePlugin` |
| Categories | `MelisCommerceCategoryTreePlugin`, `MelisCommerceCategoryProductListPlugin` |
| Clients | `MelisCommerceLoginPlugin`, `MelisCommerceRegisterPlugin`, `MelisCommerceProfilePlugin`, `MelisCommerceAccountPlugin`, `MelisCommerceBillingAddressPlugin`, `MelisCommerceDeliveryAddressPlugin`, `MelisCommerceLostPasswordGetEmailPlugin`, `MelisCommerceLostPasswordResetPlugin` |
| Orders / cart / checkout | `MelisCommerceAddToCartPlugin`, `MelisCommerceCartPlugin`, `MelisCommerceCheckoutCartPlugin`, `MelisCommerceCheckoutAddressesPlugin`, `MelisCommerceCheckoutCouponPlugin`, `MelisCommerceCheckoutSummaryPlugin`, `MelisCommerceCheckoutConfirmPlugin`, `MelisCommerceOrderHistoryPlugin`, `MelisCommerceOrderReturnProductPlugin` |

View helpers: `MelisCommerceLink` (alias of `MelisCommerceLinksHelper`) and `ToolTipTable`.

## Database tables

All tables use the `melis_ecom_*` prefix (created by `install/dbdeploy/`). Main ones:

- Catalog: `melis_ecom_product`, `melis_ecom_product_text`, `melis_ecom_product_attribute`,
  `melis_ecom_product_category`, `melis_ecom_product_links`, `melis_ecom_variant`,
  `melis_ecom_variant_attribute_value`, `melis_ecom_variant_stock`,
  `melis_ecom_attribute` (+ `_trans`, `_type`, `_value`, `_value_trans`),
  `melis_ecom_category` (+ `_trans`), `melis_ecom_price`.
- Customers: `melis_ecom_client`, `melis_ecom_client_company`, `melis_ecom_client_person`
  (+ `_emails`, `_rel`), `melis_ecom_client_address`, `melis_ecom_client_groups`,
  `melis_ecom_client_account_rel`, `melis_ecom_civility`.
- Baskets & orders: `melis_ecom_basket_anonymous`, `melis_ecom_basket_persistent`,
  `melis_ecom_order`, `melis_ecom_order_basket`, `melis_ecom_order_address`,
  `melis_ecom_order_shipping`, `melis_ecom_order_payment` (+ `_type`),
  `melis_ecom_order_status` (+ `_trans`), `melis_ecom_order_message`,
  `melis_ecom_order_product_return` (+ `_details`).
- Coupons & misc: `melis_ecom_coupon` (+ `_client`, `_order`, `_product`),
  `melis_ecom_currency`, `melis_ecom_country`, `melis_ecom_lang`, `melis_ecom_seo`,
  `melis_ecom_document` (+ `_doc_type`, `_doc_relations`), `melis_ecom_stock_email_alert`,
  `melis_ecom_settings_account`.

## Example

Read a product and add one of its variants to the current customer's basket:

```php
$products = $serviceManager->get('MelisComProductService');
$baskets  = $serviceManager->get('MelisComBasketService');

$product  = $products->getProductById($productId, $langId, $countryId);
$variants = $products->getProductVariants($productId, true); // only valid

// add the first variant, qty 1, for the logged-in client
$baskets->addVariantToBasket($variants[0]->getId(), 1, $clientId);
$basket = $baskets->getBasket($clientId);
```

## Key files

| Concern | Path |
| --- | --- |
| Module config (services, controllers, plugins) | `vendor/melisplatform/melis-commerce/config/module.config.php` |
| Backoffice tools | `vendor/melisplatform/melis-commerce/config/tools/app.tools.*.php` |
| Backoffice interfaces | `vendor/melisplatform/melis-commerce/config/interface/app.interface.*.php` |
| Front templating plugins | `vendor/melisplatform/melis-commerce/config/plugins/{products,categories,clients,orders}/` |
| Dashboard plugins | `vendor/melisplatform/melis-commerce/config/dashboard-plugins/` |
| Services | `vendor/melisplatform/melis-commerce/src/Service/` |
| Controllers | `vendor/melisplatform/melis-commerce/src/Controller/` |
| Table models | `vendor/melisplatform/melis-commerce/src/Model/Tables/` |
| Listeners | `vendor/melisplatform/melis-commerce/src/Listener/` |
| DB deltas | `vendor/melisplatform/melis-commerce/install/dbdeploy/` |

See also: [Commerce guide](/guide/commerce) · [Module reference](/reference/modules) · [Plugins](/guide/plugins).
