# MelisDemoCommerce

> A ready-made demo e-commerce storefront built on MelisCommerce — a reference implementation for
> catalog, cart, checkout, payment and shipping integration. Package `melisplatform/melis-demo-commerce`.

## Purpose

`MelisDemoCommerce` is a complete, installable front-office shop (`melis-site: true`) that demonstrates
MelisCommerce working as a real storefront. It provides two things at once: a working demo shop
(catalog, cart, checkout, orders, account, returns), and a **copy-from reference** showing exactly
how to wire payment methods into checkout, compute shipping costs, and customise MelisCommerce's
front-office plugins per-site. It depends on MelisCommerce already being installed on the platform
(its `melis_ecom_*` tables and reference data must be present before the wizard runs).

## Enable it

`MelisDemoCommerce` is a site module. Do **not** add it to the back-office module list
(`config/melis.module.load.php`) — that would route every `/MelisDemoCommerce/*` URL through the
back office and make the setup wizard unreachable. Instead register it in the **path map**
(`config/melis.modules.path.php`) and activate it for a domain via the vhost variable
`MELIS_MODULE "MelisDemoCommerce"`.

Required Composer dependencies (`^5.2`): `melis-commerce`, `melis-cms`, `melis-cms-slider`,
`melis-cms-prospects`, `melis-cms-news`, `melis-cms-page-script-editor`.

## Setup wizard

Open **`/MelisDemoCommerce/setup`** on a domain not yet bound to another site. Supply a **Protocol**,
a **Site Domain** and a **Site Label**, then press **Start setup**. The wizard runs approximately
15 steps handled by `SetupController::executeSetupAction`, each step `include`-ing a
`MelisDemoCommerce.<step>.setup.php` seed-data file from the `install/` directory. The steps create
the site tree, pages, templates, sliders, news, then the full commerce catalog (attributes → products
→ categories → variants → prices → stock), a coupon, and sample clients and orders. All database
IDs resolved at runtime are written back into the generated site config (the `[:token]` placeholders
in `config/*.dist` files), so the wizard installs cleanly alongside other sites.

## Key services

| Service alias | Role |
| --- | --- |
| `DemoCommerceService` | Site helpers used by the wizard and front controllers. |
| `SiteShipmentCostService` | Computes shipping costs; implement carrier/zone/weight rules here. |

## Front office

The shop pages are assembled entirely from MelisCommerce's front-office templating plugins. This
module supplies its own `template_path` (and accompanying JS/CSS) for each plugin via
`config/melis.plugins.config.php.dist` — there is no bespoke commerce logic in the views. Examples
of plugins given site-specific templates:

| Plugin | Example template |
| --- | --- |
| `MelisCommerceCategoryProductListPlugin` | `MelisDemoCommerce/plugin/category-product-list-slider` |
| `MelisCommerceProductSearchPlugin` | site template |
| `MelisCommerceCategoryTreePlugin` | site template |
| `MelisCommerceProductPriceRangePlugin` | site template |
| `MelisCommerceProductListPlugin` | site template |
| `MelisCommerceRelatedProductsPlugin` | site template |
| Cart and checkout chain | site templates including `plugin/checkout-fake-payment` |

### Front controllers

| Controller | Responsibility |
| --- | --- |
| `Home` | Storefront homepage |
| `ComCatalogue` | Category / catalog listing |
| `ComProduct` | Product and variant detail |
| `ComCheckout` | Checkout flow (addresses → shipping → payment → confirmation) |
| `ComMyAccount` | Customer account dashboard |
| `ComOrder` | Order history and returns |
| `ComLogin` / `ComLogout` / `ComLostPassword` | Authentication |
| `Contact` / `News` / `Search` / `About` / `Testimonial` | Content pages |
| `Page404` | 404 handler |
| `FakeServerPaymentController` | Demo payment gateway endpoint (do not use in production) |
| `Setup` | Setup wizard (`/MelisDemoCommerce/setup`) |

### Plugin customisation listeners

Where a template override is not enough, `Site*PluginListener` classes (all extending
`SiteGeneralListener`) intercept a plugin's parameters or results before rendering. They follow the
MelisCommerce event convention: mutate `$params` or `$params['results']` and return.

| Listener | Adjusts |
| --- | --- |
| `SiteCommerceProductListPluginListener` | Product list plugin params/results |
| `SiteCommerceCategoryProductListPluginListener` | Category product list |
| `SiteCommerceProductPriceRangePluginListener` | Price range plugin |
| `SiteCommerceRelatedProductsPluginListener` | Related products |
| `SiteProductShowPluginListener` | Product detail display |
| `SiteCheckoutCartPluginListener` | Cart in checkout |
| `SiteCheckoutConfirmPluginListener` | Checkout confirmation |
| `SiteCartPluginListener` | Cart plugin |
| `SiteOrderPluginListener` | Order listing |
| `SiteOrderReturnProductPluginListener` | Return product flow |
| `SiteMenuCustomizationListener` | Front menu |
| `SiteBreadcrumbCustomizationListener` | Breadcrumb |

## Payment integration pattern

A payment method registers by listening on the checkout's payment event and rendering its own form
into the checkout step:

```php
// SiteFakePaymentListener — attach a payment method to checkout
$this->attachEventListener(
    $events, '…', 'meliscommerce_checkout_plugin_payment',
    function ($e) {
        $params    = $e->getParams();
        $viewModel = /* … */;
        $viewModel->setTemplate('MelisDemoCommerce/plugin/checkout-fake-payment');
        $paymentForm = /* createForm('MelisDemoCommerce_checkout_fake_payment_form') */;
        $paymentForm->setData([
            'payment-transaction-total-cost' => $params['orderDetails']['totalCost'],
            // …
        ]);
        $viewModel->setVariable('fakePaymentForm', $paymentForm);
        // return the view so checkout renders this payment option
    }
);
```

The module ships two demo implementations to show the pattern is pluggable:

| Pair | Style |
| --- | --- |
| `SiteFakePaymentListener` + `SiteFakePaymentProcesstListener` | Server-gateway style (backed by `FakeServerPaymentController`) |
| `SiteFakePaypalStyleListener` + `SiteFakePaypalStyleProcesstListener` | PayPal-style redirect |

The `…Processt` listeners handle the gateway return and feed results into
`checkoutStep2_postPayment`; the engine then records the transaction and moves the order off
status `-1`. **Do not ship either fake gateway to production.**

To integrate a real gateway: copy a fake listener pair, point the payment template at the provider's
form or redirect URL, and in the process listener pass the provider's transaction values into the
engine's post-payment step.

## Custom shipping pattern

Shipping costs are computed by listening on the engine's shipment-computation events and delegating
to `SiteShipmentCostService`:

```php
// SiteShipmentCostListener
$this->attachEventListener(
    $events, '…',
    [
        'meliscommerce_service_checkout_shipment_computation_end',
        'meliscommerce_service_checkout_post_shipment_computation_end',
    ],
    function ($e) use ($sm) {
        $params  = $e->getParams();
        $service = $sm->get('SiteShipmentCostService');
        $params['results'] = $service->computeShipmentCost($params['results']);
        return $params;
    }
);
```

`SiteShipmentCostService::computeShipmentCost($shipment)` is where a real shop places its
carrier/zone/weight logic. This is the canonical example of the MelisCommerce
**"extend by `_end` listener, rewrite `$params['results']`"** model.

## Key files

| Concern | Path (under `vendor/melisplatform/melis-demo-commerce/`) |
| --- | --- |
| Runtime config templates (wizard fills `[:token]` placeholders) | `config/*.dist` |
| Per-site plugin template wiring | `config/melis.plugins.config.php.dist` |
| Payment form definition | `config/app.forms.php` |
| Front controllers | `src/MelisDemoCommerce/Controller/` |
| Plugin and page listeners | `src/MelisDemoCommerce/Listener/` |
| Site helpers and shipping calculator | `src/MelisDemoCommerce/Service/` |
| Storefront views (85 templates) | `view/` |
| Wizard seed-data files (catalog, coupon, clients, orders) | `install/MelisDemoCommerce.*.setup.php` |

See also: [MelisCommerce](/legacy/reference/modules/melis-commerce),
[MelisDemoCms](/legacy/reference/modules/melis-demo-cms),
[Module reference](/legacy/reference/modules).
