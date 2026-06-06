# MelisCommerce

> Le module e-commerce : catalogue (produits, variantes, attributs, catégories), clients, paniers,
> commandes, checkout, coupons et livraison. Paquet `melisplatform/melis-commerce`.

## Objectif

MelisCommerce transforme un site Melis en boutique en ligne. Dans le backoffice, il ajoute
l'ensemble des outils commerce (produits, variantes, attributs, catégories, clients, commandes,
coupons, devises, livraison…) ; sur le front office, il fournit des plugins de templating pour les
pages produit, les paniers, la connexion et le checkout. Il repose sur une couche de services
`MelisCom*` adossée aux tables de base de données `melis_ecom_*`. Pour un parcours de bout en bout,
voir [Commerce](/fr/guide/commerce).

## L'activer

MelisCommerce est un module Laminas standard listé dans `config/melis.module.load.php` :

```php
'MelisCommerce',
```

Il requiert `melisplatform/melis-core` (ainsi que la pile plateforme : `melis-engine` /
`melis-front` pour afficher les plugins front-office). Le module compagnon
`MelisCommerceOrderInvoice` ajoute la facturation des commandes. Les tables sont créées via dbdeploy
(`extra.dbdeploy: true` dans `composer.json`, deltas sous `install/dbdeploy/`).

## Services clés

Déclarés comme alias `service_manager` dans `config/module.config.php`. La plupart exposent des
méthodes `getXxxList`, `getXxxById` et `saveXxx` / `deleteXxx` renvoyant des entités commerce Melis.

| Alias de service | Rôle |
| --- | --- |
| `MelisComProductService` | Produits : `getProductList`, `getProductById`, `getProductVariants`, `getProductPricesById`, `saveProduct`, `deleteProductById`, `formatPrice`. |
| `MelisComVariantService` | Variantes de produit (articles vendables porteurs de stock) et leurs valeurs d'attribut. |
| `MelisComAttributeService` | Attributs, types d'attribut et valeurs traduites. |
| `MelisComCategoryService` | Catégories du catalogue (traduites, par pays). |
| `MelisComProductSearchService` | Recherche de produits côté front-office. |
| `MelisComPriceService` | Calcul des prix (par pays / groupe de clients). |
| `MelisComClientService` | Clients/comptes : `getClientList`, `getClientById`, `getClientMainPersonByClientId`, adresses. |
| `MelisComClientGroupsService` | Groupes de clients (utilisés pour des prix par groupe). |
| `MelisComContactService` | Contacts de compte. |
| `MelisComAuthenticationService` | Authentification client front : `login`, `getClientId`, `getPersonId`, `getClientKey`, `getClientGroup`. |
| `MelisComBasketService` | Panier : `getBasket`, `addVariantToBasket`, `removeVariantFromBasket`, `emptyBasket` ; paniers anonymes (`clientKey`) et persistants. |
| `MelisComOrderService` | Commandes : `getOrderList`, `getOrderById`, adresses/livraison/paiement/messages, `exportOrderList`. |
| `MelisComOrderCheckoutService` | Flux de checkout (transforme un panier en commande). |
| `MelisComOrderProductReturnService` | Retours de produits / RMA. |
| `MelisComPostPaymentService` | Traitement post-paiement. |
| `MelisComCouponService` | Coupons de réduction (par client / commande / produit). |
| `MelisComShipmentCostService` | Calcul des frais de livraison. |
| `MelisComCurrencyService` | Devises. |
| `MelisComStockEmailAlertService` | Alertes e-mail de retour en stock. |
| `MelisComSeoService` | SEO commerce (URLs / meta pour produits & catégories). |
| `MelisComLinksService` | Construit les liens commerce front-office (aussi via le view helper `MelisCommerceLink`). |
| `MelisComDocumentService` | Documents produit/commande (médias). |
| `MelisComDuplicationService` | Duplication de produits / variantes. |
| `MelisComCacheService` | Couche de cache commerce. |
| `MelisComHead` | Données générales/head commerce. |

## Backoffice

Les outils sont déclarés par domaine sous `config/tools/app.tools.*.php` et
`config/interface/app.interface.*.php`, tous sous la clé de plugin `meliscommerce` — par ex.
`meliscommerce_products`, `meliscommerce_variants`, `meliscommerce_attributes`,
`meliscommerce_categories`, `meliscommerce_clients`, `meliscommerce_clients_group`,
`meliscommerce_orders`, `meliscommerce_coupons`, `meliscommerce_currency`,
`meliscommerce_country`, `meliscommerce_language`, `meliscommerce_documents`,
`meliscommerce_checkout`, `meliscommerce_contact`. Chacun pointe vers un contrôleur comme
`MelisCommerce\Controller\MelisComProductList`, `…MelisComVariantList`, `…MelisComOrderList`,
`…MelisComClientList`. Voir [Créer un outil](/fr/guide/create-a-tool).

Widgets de tableau de bord (dans `config/dashboard-plugins/`) :
`MelisCommerceDashboardPluginOrdersNumber`, `MelisCommerceDashboardPluginSalesRevenue`,
`MelisCommerceDashboardPluginOrderMessages`.

## Front office

Les plugins de templating se trouvent sous `config/plugins/{products,categories,clients,orders}/`
et sont enregistrés comme `controller_plugins` dans `module.config.php`. Déposez-les dans une
`MelisDragDropZone` de page (voir [Plugins](/fr/guide/plugins)). Les principaux :

| Domaine | Plugins |
| --- | --- |
| Produits | `MelisCommerceProductShowPlugin`, `MelisCommerceProductListPlugin`, `MelisCommerceProductSearchPlugin`, `MelisCommerceRelatedProductsPlugin`, `MelisCommerceProductPriceRangePlugin`, `MelisCommerceAttributesShowPlugin`, `MelisCommerceProductAttributePlugin` |
| Catégories | `MelisCommerceCategoryTreePlugin`, `MelisCommerceCategoryProductListPlugin` |
| Clients | `MelisCommerceLoginPlugin`, `MelisCommerceRegisterPlugin`, `MelisCommerceProfilePlugin`, `MelisCommerceAccountPlugin`, `MelisCommerceBillingAddressPlugin`, `MelisCommerceDeliveryAddressPlugin`, `MelisCommerceLostPasswordGetEmailPlugin`, `MelisCommerceLostPasswordResetPlugin` |
| Commandes / panier / checkout | `MelisCommerceAddToCartPlugin`, `MelisCommerceCartPlugin`, `MelisCommerceCheckoutCartPlugin`, `MelisCommerceCheckoutAddressesPlugin`, `MelisCommerceCheckoutCouponPlugin`, `MelisCommerceCheckoutSummaryPlugin`, `MelisCommerceCheckoutConfirmPlugin`, `MelisCommerceOrderHistoryPlugin`, `MelisCommerceOrderReturnProductPlugin` |

View helpers : `MelisCommerceLink` (alias de `MelisCommerceLinksHelper`) et `ToolTipTable`.

## Tables de base de données

Toutes les tables utilisent le préfixe `melis_ecom_*` (créées par `install/dbdeploy/`).
Principales :

- Catalogue : `melis_ecom_product`, `melis_ecom_product_text`, `melis_ecom_product_attribute`,
  `melis_ecom_product_category`, `melis_ecom_product_links`, `melis_ecom_variant`,
  `melis_ecom_variant_attribute_value`, `melis_ecom_variant_stock`,
  `melis_ecom_attribute` (+ `_trans`, `_type`, `_value`, `_value_trans`),
  `melis_ecom_category` (+ `_trans`), `melis_ecom_price`.
- Clients : `melis_ecom_client`, `melis_ecom_client_company`, `melis_ecom_client_person`
  (+ `_emails`, `_rel`), `melis_ecom_client_address`, `melis_ecom_client_groups`,
  `melis_ecom_client_account_rel`, `melis_ecom_civility`.
- Paniers & commandes : `melis_ecom_basket_anonymous`, `melis_ecom_basket_persistent`,
  `melis_ecom_order`, `melis_ecom_order_basket`, `melis_ecom_order_address`,
  `melis_ecom_order_shipping`, `melis_ecom_order_payment` (+ `_type`),
  `melis_ecom_order_status` (+ `_trans`), `melis_ecom_order_message`,
  `melis_ecom_order_product_return` (+ `_details`).
- Coupons & divers : `melis_ecom_coupon` (+ `_client`, `_order`, `_product`),
  `melis_ecom_currency`, `melis_ecom_country`, `melis_ecom_lang`, `melis_ecom_seo`,
  `melis_ecom_document` (+ `_doc_type`, `_doc_relations`), `melis_ecom_stock_email_alert`,
  `melis_ecom_settings_account`.

## Exemple

Lire un produit et ajouter une de ses variantes au panier du client courant :

```php
$products = $serviceManager->get('MelisComProductService');
$baskets  = $serviceManager->get('MelisComBasketService');

$product  = $products->getProductById($productId, $langId, $countryId);
$variants = $products->getProductVariants($productId, true); // uniquement valides

// ajoute la première variante, qté 1, pour le client connecté
$baskets->addVariantToBasket($variants[0]->getId(), 1, $clientId);
$basket = $baskets->getBasket($clientId);
```

## Fichiers clés

| Sujet | Chemin |
| --- | --- |
| Config du module (services, contrôleurs, plugins) | `vendor/melisplatform/melis-commerce/config/module.config.php` |
| Outils backoffice | `vendor/melisplatform/melis-commerce/config/tools/app.tools.*.php` |
| Interfaces backoffice | `vendor/melisplatform/melis-commerce/config/interface/app.interface.*.php` |
| Plugins de templating front | `vendor/melisplatform/melis-commerce/config/plugins/{products,categories,clients,orders}/` |
| Plugins de tableau de bord | `vendor/melisplatform/melis-commerce/config/dashboard-plugins/` |
| Services | `vendor/melisplatform/melis-commerce/src/Service/` |
| Contrôleurs | `vendor/melisplatform/melis-commerce/src/Controller/` |
| Modèles de tables | `vendor/melisplatform/melis-commerce/src/Model/Tables/` |
| Listeners | `vendor/melisplatform/melis-commerce/src/Listener/` |
| Deltas BDD | `vendor/melisplatform/melis-commerce/install/dbdeploy/` |

Voir aussi : [Guide Commerce](/fr/guide/commerce) · [Référence des modules](/fr/reference/modules) · [Plugins](/fr/guide/plugins).
