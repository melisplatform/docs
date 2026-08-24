# Commerce

`melis-commerce` adds a full **e-commerce** domain to Melis: catalog, customers, cart, checkout and
orders — exposed both as **backoffice tools** and **front-office plugins**. This page is a map to
get oriented; read the module's `src/Service/` for the exact, current API.

## Domain model

The main concepts (entities under `melis-commerce/src/Entity/`, tables prefixed `melis_ecom_*`):

| Area | Concepts | Tables (examples) |
| --- | --- | --- |
| **Catalog** | Product, Variant (sellable SKU), Category, Attribute & values | `melis_ecom_product`, `melis_ecom_variant`, `melis_ecom_category`, `melis_ecom_attribute` |
| **Pricing** | Price by variant/product × country × currency × client group | `melis_ecom_price`, `melis_ecom_client_groups` |
| **Customers** | Client (account), Client person, addresses | `melis_ecom_client`, `melis_ecom_client_person` |
| **Cart** | Anonymous & persistent baskets | `melis_ecom_basket_anonymous`, `melis_ecom_basket_persistent` |
| **Orders** | Order + addresses, payment, shipping; returns | `melis_ecom_order`, `melis_ecom_order_address`, `melis_ecom_order_payment` |
| **Promotions** | Coupons (product/client restricted) | `melis_ecom_coupon`, `melis_ecom_coupon_product` |
| **Localization** | Country, Currency | `melis_ecom_country`, `melis_ecom_currency` |
| **Media** | Documents (images/PDF) | `melis_ecom_document` |

## Services you'll use

All registered in `melis-commerce/config/module.config.php` (`service_manager.aliases`). The main
ones:

- **Catalog**: `MelisComProductService`, `MelisComVariantService`, `MelisComCategoryService`,
  `MelisComAttributeService`, `MelisComPriceService`, `MelisComProductSearchService`,
  `MelisComDocumentService`.
- **Cart & checkout**: `MelisComBasketService`, `MelisComOrderCheckoutService`,
  `MelisComOrderService`, `MelisComShipmentCostService`, `MelisComPostPaymentService`,
  `MelisComOrderProductReturnService`.
- **Customers**: `MelisComClientService`, `MelisComAuthenticationService`, `MelisComContactService`,
  `MelisComClientGroupsService`.
- **Config**: `MelisComCouponService`, `MelisComCurrencyService`, `MelisComSeoService`.

```php
$products = $sm->get('MelisComProductService');
$orders   = $sm->get('MelisComOrderService');
```

Each service sits on a `MelisEcom*Table` data layer (e.g. `MelisEcomProductTable` →
`melis_ecom_product`).

## In the backoffice

MelisCommerce registers a **Commerce** toolset with tools for: products & variants, categories,
attributes, orders, clients, coupons, currencies/countries, documents and settings — built like any
other [backoffice tool](./create-a-tool).

## On the front office

Commerce ships a large set of **templating plugins** (drop them into pages — see
[Plugins](./plugins)) covering the whole storefront:

- **Catalog**: `MelisCommerceProductShowPlugin`, `MelisCommerceProductListPlugin`,
  `MelisCommerceProductSearchPlugin`, `MelisCommerceCategoryProductListPlugin`,
  `MelisCommerceRelatedProductsPlugin`.
- **Account**: `MelisCommerceLoginPlugin`, `MelisCommerceRegisterPlugin`,
  `MelisCommerceAccountPlugin`, `MelisCommerceProfilePlugin`, delivery/billing address plugins.
- **Cart & checkout**: `MelisCommerceAddToCartPlugin`, `MelisCommerceCartPlugin`,
  `MelisCommerceCheckoutPlugin` (+ cart / coupon / addresses / summary / confirm steps).
- **Orders**: `MelisCommerceOrderHistoryPlugin`, `MelisCommerceOrderPlugin`,
  `MelisCommerceOrderReturnProductPlugin`.

…plus dashboard widgets (orders count, sales revenue, order messages).

A storefront is therefore assembled mostly by **placing these plugins** on CMS pages and styling
them in your site module's views.

## Invoicing

`melis-commerce-order-invoice` extends commerce with **PDF invoice generation** (via
Spipu/Html2Pdf): an invoice service + table (`melis_ecom_order_invoice`), backoffice download, and
listeners that inject invoice UI into the order views.

## Key files

| Concern | Path |
| --- | --- |
| Services | `vendor/melisplatform/melis-commerce/src/Service/` |
| Entities | `vendor/melisplatform/melis-commerce/src/Entity/` |
| Schema | `vendor/melisplatform/melis-commerce/install/sql/setup_structure.sql` |
| Front plugins | `vendor/melisplatform/melis-commerce/src/Controller/Plugin/` |
| Invoicing | `vendor/melisplatform/melis-commerce-order-invoice/` |
