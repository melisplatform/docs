# MelisCommerce

> Full e-commerce framework for MelisPlatform — catalog, customers, cart/checkout/orders, coupons,
> shipping and SEO. Package `melisplatform/melis-commerce`.

## Purpose

MelisCommerce adds a complete commerce layer to a Melis site: a catalog (products, variants,
attributes, categories, prices, stock), a B2B customer model (accounts + contacts), the
cart/checkout/order pipeline, coupons, currencies, shipping, returns, documents and SEO. It ships a
back-office management suite and a front-office shop built entirely from droppable templating
plugins. The data layer uses **59 `melis_ecom_*` tables**, **26 services**, **10 rich entities** and
**33 listeners**; data access uses Eloquent (bundled `illuminate/database`), wrapped by Melis-style
event-driven services.

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisCommerce',
];
```

Requires `melisplatform/melis-core ^5.2`. Database tables are provisioned automatically by
MelisDbDeploy (deltas under `install/dbdeploy/`). The module is offered by the Melis installer as
an optional component.

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

## Key services

All services extend `MelisComGeneralService` and are registered in `config/module.config.php`.
Every public method is wrapped in `meliscommerce_service_*_start` / `*_end` events (see
[Events & listeners](#events--listeners)).

| Service alias | Role |
| --- | --- |
| `MelisComProductService` | `getProductById`, `getProductList` → `MelisProduct` entity |
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
| `MelisComCacheService` | Commerce cache (`commerce_big_services`; key prefixes `product-/category-/variant-/document-/attribute-`) |
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

Two phases in `MelisComOrderCheckoutService`:

**Phase 1 — `checkoutStep1_prePayment($clientId)`**
Validates basket and addresses, computes all costs and shipping, generates the order reference, then
calls `MelisComOrderService::saveOrder()`. The order is saved with `ord_status = -1` (temporary).
Fires `meliscommerce_service_checkout_step1_prepayment_start/_end` and
`…_save_success` (carries the new `orderId`).

**Phase 2 — `checkoutStep2_postPayment()`**
Called after the payment gateway returns. `MelisComPostPaymentService::processPostPayment()` records
the transaction in `melis_ecom_order_payment` and moves the order off status `-1` to a real status
(e.g. `1` = New order). Fires `meliscommerce_service_checkout_step2_postpayment_start/_end`.

**Order statuses:** `-1` temporary · `1` New order · `2` On hold · `3` Shipped · `4` Delivered ·
`5` Cancelled · `6` Payment error.

## Events & listeners

Every service method emits `meliscommerce_service_*_start` and `*_end` events. The named arguments
(built by `makeArrayFromParameters` via reflection) and the `results` key travel with the event.

- `_start` listener: mutate inputs before the work runs.
- `_end` listener: mutate `$params['results']` before the caller sees it.

This is the primary extension mechanism — no subclassing needed. The built-in coupon discount is
itself a listener on `meliscommerce_service_get_item_price_end`.

The 33 bundled listeners fall into four families:

| Family | Examples |
| --- | --- |
| Save / validate | `…SaveProductListener`, `…SaveOrderListener`, `…SaveClientListener`, `…ValidateVariantListener` |
| Cascade cleanup (country/language removed) | `…ProductPriceCountryDeletedListener`, `…CategoryCountryLink…`, `…SEOLanguageDeletedListener` |
| Checkout / pricing / stock | `…CheckoutCouponListener`, `…CouponProductPriceListener`, `…ShipmentCostListener`, `…PostPaymentListener`, `…VariantCheckLowStockListener` |
| Front-office SEO routing | `…SEOReformatToRoutePageUrlListener`, `…SEODispatchRouterCommerceUrlListener`, `…SEOMetaPageListener` |

## Backoffice

The full commerce back office lives under the **MelisCommerce** left-menu section.

| Menu entry | Controller | Manages |
| --- | --- | --- |
| Catalogs | `MelisComCategory(List)` | Catalog / category drag-and-drop tree; translations, per-country availability, SEO |
| Products | `MelisComProduct(List)` | Products → variants, prices, texts, SEO, images |
| Accounts | `MelisComClient(List)` | B2B accounts (company, group, addresses, contacts, orders, files) |
| Contacts | `MelisComContact` | People; CSV import/export; linkable to multiple accounts |
| Orders | `MelisComOrder(List)` + `MelisComOrderCheckout` | Orders + 7-step BO creation tunnel; statuses; returns |
| Coupons | `MelisComCoupon(List)` | Discount coupons (% or amount; per account / product) |
| Attributes | `MelisComAttribute(List)` | Attributes + typed, translatable values |
| Countries / Commerce languages / Currencies / Order status / Client's groups | `MelisComCountry` / `MelisComLanguage` / `MelisComCurrency` / `MelisComOrderStatus` / `MelisComClientsGroup` | Reference data (list + edit modal) |
| Commerce settings | `MelisComSettings` | Global stock-alert threshold; account-name strategy (`sa_type`) |

Dashboard widgets: `OrdersNumber`, `OrderMessages`, `SalesRevenue`.

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

// getProductById($productId, $langId = null, $countryId = null, $groupId = -1, $docType = null, $docSubType = [])
$product = $prdSrv->getProductById($prdId, $langId, $countryId);  // → MelisProduct
$texts   = $product->getTexts();       // typed texts (TITLE, …) per language
$cats    = $product->getCategories();  // categories the product belongs to

// getMainVariantByProductId($productId, $langId = null, $countryId = null, $groupId = 1)
$variant = $varSrv->getMainVariantByProductId($prdId, $langId, $countryId);  // → MelisVariant

// getItemPrice($itemId, $countryId, $groupId, $type = 'variant', array $data = [])
$price = $priceSrv->getItemPrice($variant->getId(), $countryId, $groupId, 'variant');
// $price['price'] (net), $price['price_currency'], $price['price_details']
```

**Add to basket and run the two-phase checkout**

```php
$basketSrv   = $sm->get('MelisComBasketService');
$checkoutSrv = $sm->get('MelisComOrderCheckoutService');

// addVariantToBasket($variantId, $quantity, $clientId, $clientKey = null)
$basketSrv->addVariantToBasket($variantId, 1, $clientId);

// Merge an anonymous cart after login
$basketSrv->transferAnonymousBasketToPersistentBasket($clientKey, $clientId);

// Phase 1 — creates order at status -1 (temporary)
$step1 = $checkoutSrv->checkoutStep1_prePayment($clientId);
// $step1['orderId'] — hand to payment gateway

// Phase 2 — after gateway returns; records payment, moves order off -1
$step2 = $checkoutSrv->checkoutStep2_postPayment();
```

**Authenticate a front-office customer**

```php
$auth = $sm->get('MelisComAuthenticationService');
$res  = $auth->login($email, $password, $rememberMe);  // login($email, $password, $rememberMe = false)
if ($res['success']) {
    $personId = $auth->getPersonId();   // logged-in contact (cper_id)
    $clientId = $auth->getClientId();   // currently-selected account (cli_id)
    $group    = $auth->getClientGroup(); // pricing group → feeds getItemPrice()
}
```

**Hook the shop without subclassing**

```php
// Attach a listener to any meliscommerce_service_*_start or *_end event.
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
| Back-office interface config | `vendor/melisplatform/melis-commerce/config/interface/` |
| Front-office plugin config | `vendor/melisplatform/melis-commerce/config/plugins/` |
| Email templates config | `vendor/melisplatform/melis-commerce/config/app.emails.php` |
| Services | `vendor/melisplatform/melis-commerce/src/Service/` |
| Entities (10) | `vendor/melisplatform/melis-commerce/src/Entity/` |
| Table gateways (59) | `vendor/melisplatform/melis-commerce/src/Model/Tables/` |
| Controllers (BO + FO plugins) | `vendor/melisplatform/melis-commerce/src/Controller/` |
| Listeners (33) | `vendor/melisplatform/melis-commerce/src/Listener/` |
| DB deltas | `vendor/melisplatform/melis-commerce/install/dbdeploy/` |

See also: [Module reference](/legacy/reference/modules) · [melis-core](/legacy/reference/modules/melis-core) · [melis-cms](/legacy/reference/modules/melis-cms) · [melis-dbdeploy](/legacy/reference/modules/melis-dbdeploy).
