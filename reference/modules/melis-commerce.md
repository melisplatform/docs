# MelisCommerce

> Full e-commerce framework for MelisPlatform — catalog, customers, cart/checkout/orders, coupons, shipping and SEO — with a React back-office. Package `melisplatform/melis-commerce`.

## Purpose

MelisCommerce adds a complete commerce layer to a Melis site: a catalog (products, variants,
attributes, categories, prices, stock), a B2B customer model (accounts + contacts), the
cart/checkout/order pipeline, coupons, currencies, shipping, returns, documents and SEO. It ships a
back-office management suite and a front-office shop built from droppable templating plugins. The
data layer uses **59 `melis_ecom_*` tables**, **26 services**, **10 rich entities** and **33
listeners**; data access uses Eloquent (bundled `illuminate/database`), wrapped by Melis-style
event-driven services.

In Melis v6 the business logic is unchanged; the **display layer** is a **React back-office**
(`/melis-react`). MelisCommerce ships **one multi-brick bundle** exposing **13 native React tools**,
each backed by JSON endpoints under `/melis/react-api/…`. Every tool keeps a per-tool **New / Old**
toggle so you can fall back to the classic legacy screen in an iframe.

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisCommerce',
];
```

Requires `melisplatform/melis-core`. Database tables are provisioned automatically by MelisDbDeploy
(deltas under `install/dbdeploy/`); the module is offered by the Melis installer as an optional
component. The React tools appear in the back-office only when MelisCommerce is active (discovery via
`GET /melis/react-api/react-modules`).

## The React back-office — one bundle, thirteen tools

The bundle (`public/ui-react/brick.js` + `brick.manifest.json`) declares 13 tools that self-register
in `brick.tsx`. All are native full-React; each renders a shared `ViewModeToggle` + `LegacyFrame`, so
*Old* mounts the classic tool in an iframe (`/melis/react-tool-page?key=<melisKey>`). The seven
"entity" tools set `subTabs: true` (opening a record adds a sub-tab); all 13 are `persistent`.

![The MelisCommerce section in the React sidebar — the 13 commerce tools](/screenshots/react/melis-commerce/meliscommerce-menu-tools-selector.png)

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

> **Rule of thumb:** build the **catalog** (attributes → catalogs → products/variants), manage
> **customers** (accounts + contacts), then run the **order** pipeline (orders + checkout wizard +
> coupons), all backed by the commerce reference lists.

## Object model

| Concept | What it is |
| --- | --- |
| **Product** | A container for variants — not itself a sellable unit. |
| **Variant** | The sellable unit: has its own SKU, stock and price. A product with no real options still has one main variant. |
| **Attribute** | A filterable/variant-defining property (e.g. Color, Size) with typed, translatable values. Products declare which attributes they use; each variant picks one value per attribute. |
| **Price** | Resolved for a `(countryId, groupId)` pair with VAT; falls back gracefully (see [Pricing resolution](#pricing--stock-resolution)). |
| **Account** | A B2B organisation (`melis_ecom_client`); has a company record, group and addresses. |
| **Contact / Person** | An individual (`melis_ecom_client_person`) who logs in; can belong to multiple accounts. |
| **Basket** | Anonymous (keyed by `clientKey`) or persistent (tied to an account); merges on login. |
| **Order** | Created at status `-1` (temporary) during checkout; moves to `1` (New order) after payment. |

## Accounts & contacts

**Accounts** (`/melis-commerce/clients-list`) manages B2B customers: the list has search,
status/group filters, a column manager, export and CSV **import**. Opening an account is a sub-tab
with **Properties**, **Company**, **Contacts** (link/unlink, set default), **Addresses**, **Orders**
(history) and **Files** tabs.

![The Accounts list — filters, column manager and CSV import](/screenshots/react/melis-commerce/meliscommerce-tools-accounts-list.png)

![Account editor — Properties tab (status, name strategy, group, country, tags)](/screenshots/react/melis-commerce/meliscommerce-tools-accounts-new-tab-properties.png)

![Account editor — Contacts tab (link / unlink / default)](/screenshots/react/melis-commerce/meliscommerce-tools-accounts-new-tab-contacts.png)

**Contacts** (`/melis-commerce/contact-list`) manages individual people. The editor has
**Information**, **Address** and **Association** tabs (link/unlink a contact to accounts, set the
default). Contacts are backed by `MelisComContactService`; accounts by `MelisComClientService`.

![Contact editor — Association tab (link / unlink accounts)](/screenshots/react/melis-commerce/meliscommerce-tools-contacts-edit-tab-association.png)

## Catalogs, products & variants

**Catalogs** (`/melis-commerce/categories`) is a drag-to-reorder **tree** of categories; a category
has **Properties**, **SEO** and **Products** (reorderable) tabs.

![The Catalog category tree (React)](/screenshots/react/melis-commerce/meliscommerce-tools-catalogs-treeview.png)

**Products** (`/melis-commerce/product-list`) lists products with filters, duplicate and export. The
product editor has **Properties**, **Text** (per-language), **Variants**, **SEO** and **Prices**
tabs. The **Variants** tab is the richest: each variant has its own Properties, SEO, Prices, Stocks
and Associations, plus media.

![The Products list (React)](/screenshots/react/melis-commerce/meliscommerce-tools-products-list.png)

![Product editor — Variants tab (per-variant prices, stocks, SEO, associations)](/screenshots/react/melis-commerce/meliscommerce-tools-products-edit-tab-variants.png)

![Product editor — Prices tab](/screenshots/react/melis-commerce/meliscommerce-tools-products-edit-tab-prices.png)

**Attributes** (`/melis-commerce/attribute-list`) manages typed product characteristics: editor tabs
**Properties** (reference, type, status, visible, searchable), **Labels** (per-language) and
**Values** (values with typed translations).

![Attribute editor — Values tab (values with typed translations)](/screenshots/react/melis-commerce/meliscommerce-tools-attributes-edit-tab-values.png)

## Orders & the checkout wizard

**Orders** (`/melis-commerce/order-list`) has status filters and export. The per-order editor tabs
are **Properties**, **Basket** (read-only), **Addresses**, **Payment** (read-only), **Shipping**,
**Messages** and **Returns** — plus **Invoices** when
[MelisCommerceOrderInvoice](/reference/modules/melis-commerce-order-invoice) is active.

![The Orders list (React)](/screenshots/react/melis-commerce/meliscommerce-tools-order-list.png)

![Order editor — Properties tab](/screenshots/react/melis-commerce/meliscommerce-tools-order-edit-tab-properties.png)

**New Order** opens a guided **7-step checkout wizard**
(`contact → account → products → addresses → summary → payment → confirmation`), backed by a
server-side checkout session (endpoints under `/orders/checkout/*`) that resumes where you left off.

![The New Order checkout wizard — contact / account / products steps](/screenshots/react/melis-commerce/meliscommerce-tools-order-newordertunnel-1.png)

![The checkout wizard — addresses / summary step](/screenshots/react/melis-commerce/meliscommerce-tools-order-newordertunnel-2.png)

## Coupons

**Coupons** (`/melis-commerce/coupon-list`) manages discount codes (% or amount). Editor tabs:
**Properties**, **Assign account** (clients), **Assign product**, and **Orders** (usage history).
Backed by `MelisComCouponService`; the built-in discount is itself a listener on
`meliscommerce_service_get_item_price_end`.

![Coupon editor — Assign account tab](/screenshots/react/melis-commerce/meliscommerce-tools-coupons-edit-tab-assignedclients.png)

## Commerce reference tools

Small "settings-style" tools — single-page lists with add/edit modals or a single form:

| Tool | Route | Manages |
| --- | --- | --- |
| Countries | `/melis-commerce/country-list` | Commerce country list (add/edit) |
| Commerce languages | `/melis-commerce/language-list` | Commerce languages (list + modal) |
| Currencies | `/melis-commerce/currency-lists` | Currencies (list + modal, **set default**) |
| Order status | `/melis-commerce/order-status-lists` | Statuses; editor has Properties (colour) + Labels |
| Client's groups | `/melis-commerce/clients-group-list` | Customer groups (list + modal) |
| Commerce settings | `/melis-commerce/settings` | Single config page — Properties + Accounts tabs |

![The Order status list (React)](/screenshots/react/melis-commerce/meliscommerce-tools-orderstatus-list.png)

![Commerce settings — Properties tab (stock-alert threshold, account-name strategy)](/screenshots/react/melis-commerce/meliscommerce-tools-settings-tab-properties.png)

Commerce settings hold the global stock-alert threshold and the account-name strategy (`sa_type`).

## Key services

All services extend `MelisComGeneralService` and are registered in `config/module.config.php`. Every
public method is wrapped in `meliscommerce_service_*_start` / `*_end` events (see
[Events & listeners](#events--listeners)). React controllers only validate input and shape JSON — the
real work stays in these services.

| Service alias | Role |
| --- | --- |
| `MelisComProductService` | `getProductById`, `getProductList` → `MelisProduct` |
| `MelisComVariantService` | `getVariantById`, `getVariantListByProductId`, `getVariantBySKU`, `getMainVariantByProductId` → `MelisVariant` |
| `MelisComCategoryService` | `getCategoryById`, `getCategoryListById(Recursive)` → `MelisCategory` |
| `MelisComAttributeService` | `getAttributeById`, `getAttributes` → `MelisAttribute` |
| `MelisComPriceService` | `getItemPrice($itemId, $countryId, $groupId, $type)` — price with fallback hierarchy |
| `MelisComProductSearchService` | Front-office product search |
| `MelisComSeoService` | Commerce SEO (URLs / meta for products and categories) |
| `MelisComClientService` | `getClientById`, `getClientList`, `getClientByIdAndClientPerson` → `MelisClient` |
| `MelisComContactService` | Contact (person) management |
| `MelisComClientGroupsService` | Client groups (used for group-specific pricing) |
| `MelisComAuthenticationService` | Front-office login: `login`, `getClientId`, `getPersonId`, `getClientGroup`, `setClientId`, `logout`, `hasIdentity` |
| `MelisComBasketService` | `getBasket`, `getPersistentBasket`, `getAnonymousBasket`, `addVariantToBasket`, `transferAnonymousBasketToPersistentBasket` → `MelisBasket` |
| `MelisComOrderService` | `getOrderById`, `getOrderList` → `MelisOrder` |
| `MelisComOrderCheckoutService` | Two-phase checkout: `checkoutStep1_prePayment`, `checkoutStep2_postPayment` |
| `MelisComPostPaymentService` | Post-payment transaction recording |
| `MelisComOrderProductReturnService` | Product returns / RMA |
| `MelisComCouponService` | `getCouponById`, `getCouponList` → `MelisCoupon` |
| `MelisComCurrencyService` | Currencies |
| `MelisComShipmentCostService` | Shipping cost computation |
| `MelisComStockEmailAlertService` | Low-stock email alerts (`VARIANTSLOWSTOCK`) |
| `MelisComDocumentService` | `getDocumentById`, `getDocumentsByRelation` → `MelisDocument` |
| `MelisComDuplicationService` | Duplicate products / variants |
| `MelisComLinksService` | Front-office commerce link builder |
| `MelisComCacheService` | Commerce cache (`commerce_big_services`) |
| `MelisComHead` | SEO head helper (`updateTitleAndDescription`) |
| `MelisComGeneralService` | Base class; helpers: `getTableColumns`, `getEcomLang`, `getFrontPluginLangId` |

## Pricing & stock resolution

`MelisComPriceService::getItemPrice($itemId, $countryId, $groupId, $type)` walks a fallback chain:

1. specific country + specific group
2. specific country + general group
3. general country (`price_country_id = 0`) + specific group
4. general country + general group
5. (for a variant) fall back to the **product** price

Stock is per **variant per country** (`melis_ecom_variant_stock`). When an order drops stock below
the threshold, the `VARIANTSLOWSTOCK` email is sent to the configured recipients.

## Checkout pipeline

Two phases in `MelisComOrderCheckoutService` (the React wizard drives the same server logic):

**Phase 1 — `checkoutStep1_prePayment($clientId)`** validates basket and addresses, computes all
costs and shipping, generates the order reference, then calls `MelisComOrderService::saveOrder()`.
The order is saved with `ord_status = -1` (temporary). Fires
`meliscommerce_service_checkout_step1_prepayment_start/_end` and `…_save_success` (carries the new
`orderId`).

**Phase 2 — `checkoutStep2_postPayment()`** is called after the gateway returns.
`MelisComPostPaymentService::processPostPayment()` records the transaction in
`melis_ecom_order_payment` and moves the order off status `-1` to a real status. Fires
`meliscommerce_service_checkout_step2_postpayment_start/_end`.

**Order statuses:** `-1` temporary · `1` New order · `2` On hold · `3` Shipped · `4` Delivered ·
`5` Cancelled · `6` Payment error.

## Events & listeners

Every service method emits `meliscommerce_service_*_start` and `*_end` events. The named arguments
(built by `makeArrayFromParameters` via reflection) and the `results` key travel with the event.

- `_start` listener: mutate inputs before the work runs.
- `_end` listener: mutate `$params['results']` before the caller sees it.

This is the primary extension mechanism — no subclassing needed. The 33 bundled listeners fall into
four families:

| Family | Examples |
| --- | --- |
| Save / validate | `…SaveProductListener`, `…SaveOrderListener`, `…SaveClientListener`, `…ValidateVariantListener` |
| Cascade cleanup (country/language removed) | `…ProductPriceCountryDeletedListener`, `…CategoryCountryLink…`, `…SEOLanguageDeletedListener` |
| Checkout / pricing / stock | `…CheckoutCouponListener`, `…CouponProductPriceListener`, `…ShipmentCostListener`, `…PostPaymentListener`, `…VariantCheckLowStockListener` |
| Front-office SEO routing | `…SEOReformatToRoutePageUrlListener`, `…SEODispatchRouterCommerceUrlListener`, `…SEOMetaPageListener` |

## React API & capabilities

All routes are child routes of `melis-react-api` (merged from `config/react-api.php`): **13
invokable controllers** in `src/Controller/ReactApi/`, **184 routes** under `/melis/react-api/…`.
The response contract everywhere is `{ success, data, error? }`; every action calls
`denyUnlessAccess()` first (auth + `MelisCoreRights::canAccess(<melisKey>)`, 401/403). Each entity
tool exposes roughly `GET /<tool>` (keyset list), `/<tool>/stats`, `/<tool>/options`,
`POST /<tool>/save`, `DELETE /<tool>/delete/:id`, `GET /<tool>/:id`, plus tool-specific
sub-resources (e.g. Orders adds the full `/orders/checkout/*` wizard).

> ⚠ Commerce languages are namespaced `/commerce-languages` (not `/languages`) because the core
> Languages tool already owns `/languages` under the shared `melis-react-api` parent.

`config/react.capabilities.php` declares one `melisReactToolCapabilities` entry per tool, keyed under
its melisKey. These are **declarative default-allow** UI hints — they drive the Users → Rights
checkbox tree and let React mask tabs/buttons via `useCaps(...)` — but there is **no server-side
`denyUnlessCan()` yet**; only `denyUnlessAccess()` on the tool's melisKey gates the API. Treat
capabilities as UI hints, not security.

## Front office

Templating plugins are registered under `config/plugins/{products,categories,clients,orders}/` and
as `controller_plugins` in `module.config.php`. Drop them into a CMS page drag-drop zone.

| Area | Plugins |
| --- | --- |
| Catalog | `ProductShowPlugin`, `ProductListPlugin`, `ProductSearchPlugin`, `CategoryTreePlugin`, `CategoryProductListPlugin`, `RelatedProductsPlugin`, `AttributesShowPlugin`, `ProductAttributePlugin`, `ProductPriceRangePlugin` |
| Cart & checkout | `AddToCartPlugin`, `CartPlugin`, `CheckoutPlugin`, `CheckoutCartPlugin`, `CheckoutAddressesPlugin`, `CheckoutCouponPlugin`, `CheckoutSummaryPlugin`, `CheckoutConfirmSummaryPlugin`, `CheckoutConfirmPlugin` |
| Account | `LoginPlugin`, `RegisterPlugin`, `AccountPlugin`, `ProfilePlugin`, `BillingAddressPlugin`, `DeliveryAddressPlugin`, `LostPasswordGetEmailPlugin`, `LostPasswordResetPlugin` |
| Orders (customer) | `OrderPlugin`, `OrderHistoryPlugin`, `OrderMessagesPlugin`, `OrderShippingDetailsPlugin`, `OrderReturnProductPlugin`, `OrderAddressPlugin` |

## Database tables

59 tables with the `melis_ecom_*` prefix, grouped by subsystem:

| Group | Key tables |
| --- | --- |
| Products & variants | `melis_ecom_product`, `melis_ecom_product_text` + `_text_type`, `melis_ecom_product_attribute`, `melis_ecom_product_category`, `melis_ecom_variant`, `melis_ecom_variant_attribute_value`, `melis_ecom_variant_stock`, `melis_ecom_assoc_variant` + `_type` |
| Attributes | `melis_ecom_attribute` + `_trans`, `melis_ecom_attribute_type`, `melis_ecom_attribute_value` + `_value_trans` |
| Categories & geo | `melis_ecom_category` + `_trans`, `melis_ecom_country_category`, `melis_ecom_country`, `melis_ecom_lang` |
| Pricing & currency | `melis_ecom_price`, `melis_ecom_currency` |
| Clients (B2B) | `melis_ecom_client`, `melis_ecom_client_person` + `_person_emails`, `melis_ecom_client_company`, `melis_ecom_client_account_rel`, `melis_ecom_client_person_rel`, `melis_ecom_client_address` + `_address_type`, `melis_ecom_client_groups`, `melis_ecom_civility`, `melis_ecom_settings_account` |
| Baskets & orders | `melis_ecom_basket_anonymous`, `melis_ecom_basket_persistent`, `melis_ecom_order`, `melis_ecom_order_basket`, `melis_ecom_order_address`, `melis_ecom_order_payment` + `_type`, `melis_ecom_order_shipping`, `melis_ecom_order_message`, `melis_ecom_order_status` + `_trans`, `melis_ecom_order_product_return` + `_details` |
| Coupons | `melis_ecom_coupon` + `_coupon_client` / `_coupon_order` / `_coupon_product` |
| Documents & SEO | `melis_ecom_document` + `_doc_type` + `_doc_relations`, `melis_ecom_seo`, `melis_ecom_stock_email_alert` |

## Examples

**Read a product, its main variant and a resolved price**

```php
$prdSrv   = $sm->get('MelisComProductService');
$varSrv   = $sm->get('MelisComVariantService');
$priceSrv = $sm->get('MelisComPriceService');

$product = $prdSrv->getProductById($prdId, $langId, $countryId);  // → MelisProduct
$variant = $varSrv->getMainVariantByProductId($prdId, $langId, $countryId);  // → MelisVariant
$price   = $priceSrv->getItemPrice($variant->getId(), $countryId, $groupId, 'variant');
// $price['price'] (net), $price['price_currency'], $price['price_details']
```

**Add to basket and run the two-phase checkout**

```php
$basketSrv   = $sm->get('MelisComBasketService');
$checkoutSrv = $sm->get('MelisComOrderCheckoutService');

$basketSrv->addVariantToBasket($variantId, 1, $clientId);
$basketSrv->transferAnonymousBasketToPersistentBasket($clientKey, $clientId);

$step1 = $checkoutSrv->checkoutStep1_prePayment($clientId);  // order at status -1
// $step1['orderId'] — hand to payment gateway
$step2 = $checkoutSrv->checkoutStep2_postPayment();          // records payment, moves off -1
```

**Hook the shop without subclassing**

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

## Key files

| Concern | Path |
| --- | --- |
| Module config (services, controllers, plugins) | `vendor/melisplatform/melis-commerce/config/module.config.php` |
| React API routes / capabilities | `vendor/melisplatform/melis-commerce/config/react-api.php`, `config/react.capabilities.php` |
| React brick (source / build) | `vendor/melisplatform/melis-commerce/ui-react/src/`, `public/ui-react/{brick.js, brick.manifest.json}` |
| React API controllers (13) | `vendor/melisplatform/melis-commerce/src/Controller/ReactApi/` |
| Front-office plugin config | `vendor/melisplatform/melis-commerce/config/plugins/` |
| Services / Entities (10) / Table gateways (59) | `vendor/melisplatform/melis-commerce/src/Service/`, `src/Entity/`, `src/Model/Tables/` |
| Listeners (33) | `vendor/melisplatform/melis-commerce/src/Listener/` |
| DB deltas | `vendor/melisplatform/melis-commerce/install/dbdeploy/` |

See also: [Module reference](/reference/modules) · [melis-react-api](/reference/modules/melis-react-api) · [melis-commerce-order-invoice](/reference/modules/melis-commerce-order-invoice) · [melis-core](/legacy/reference/modules/melis-core) · [melis-cms](/reference/modules/melis-cms).
