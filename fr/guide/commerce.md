# Commerce

`melis-commerce` ajoute un domaine **e-commerce** complet à Melis : catalogue, clients, panier,
checkout et commandes — exposés à la fois comme **tools backoffice** et **plugins front-office**.
Cette page est une carte pour s'orienter ; lisez le `src/Service/` du module pour l'API exacte et à
jour.

## Modèle du domaine

Les concepts principaux (entités sous `melis-commerce/src/Entity/`, tables préfixées
`melis_ecom_*`) :

| Domaine | Concepts | Tables (exemples) |
| --- | --- | --- |
| **Catalogue** | Produit, Variante (SKU vendable), Catégorie, Attribut & valeurs | `melis_ecom_product`, `melis_ecom_variant`, `melis_ecom_category`, `melis_ecom_attribute` |
| **Tarifs** | Prix par variante/produit × pays × devise × groupe client | `melis_ecom_price`, `melis_ecom_client_groups` |
| **Clients** | Client (compte), personne du client, adresses | `melis_ecom_client`, `melis_ecom_client_person` |
| **Panier** | Paniers anonyme & persistant | `melis_ecom_basket_anonymous`, `melis_ecom_basket_persistent` |
| **Commandes** | Commande + adresses, paiement, livraison ; retours | `melis_ecom_order`, `melis_ecom_order_address`, `melis_ecom_order_payment` |
| **Promotions** | Coupons (restreints produit/client) | `melis_ecom_coupon`, `melis_ecom_coupon_product` |
| **Localisation** | Pays, Devise | `melis_ecom_country`, `melis_ecom_currency` |
| **Médias** | Documents (images/PDF) | `melis_ecom_document` |

## Les services à utiliser

Tous enregistrés dans `melis-commerce/config/module.config.php` (`service_manager.aliases`). Les
principaux :

- **Catalogue** : `MelisComProductService`, `MelisComVariantService`, `MelisComCategoryService`,
  `MelisComAttributeService`, `MelisComPriceService`, `MelisComProductSearchService`,
  `MelisComDocumentService`.
- **Panier & checkout** : `MelisComBasketService`, `MelisComOrderCheckoutService`,
  `MelisComOrderService`, `MelisComShipmentCostService`, `MelisComPostPaymentService`,
  `MelisComOrderProductReturnService`.
- **Clients** : `MelisComClientService`, `MelisComAuthenticationService`, `MelisComContactService`,
  `MelisComClientGroupsService`.
- **Config** : `MelisComCouponService`, `MelisComCurrencyService`, `MelisComSeoService`.

```php
$products = $sm->get('MelisComProductService');
$orders   = $sm->get('MelisComOrderService');
```

Chaque service repose sur une couche de données `MelisEcom*Table` (p. ex. `MelisEcomProductTable` →
`melis_ecom_product`).

## Dans le backoffice

MelisCommerce enregistre un ensemble de tools **Commerce** : produits & variantes, catégories,
attributs, commandes, clients, coupons, devises/pays, documents et réglages — construits comme
n'importe quel [tool backoffice](./create-a-tool).

## Sur le front office

Commerce fournit un large jeu de **plugins de templating** (à déposer dans les pages — voir
[Plugins](./plugins)) couvrant toute la boutique :

- **Catalogue** : `MelisCommerceProductShowPlugin`, `MelisCommerceProductListPlugin`,
  `MelisCommerceProductSearchPlugin`, `MelisCommerceCategoryProductListPlugin`,
  `MelisCommerceRelatedProductsPlugin`.
- **Compte** : `MelisCommerceLoginPlugin`, `MelisCommerceRegisterPlugin`,
  `MelisCommerceAccountPlugin`, `MelisCommerceProfilePlugin`, plugins d'adresses livraison/facturation.
- **Panier & checkout** : `MelisCommerceAddToCartPlugin`, `MelisCommerceCartPlugin`,
  `MelisCommerceCheckoutPlugin` (+ étapes cart / coupon / addresses / summary / confirm).
- **Commandes** : `MelisCommerceOrderHistoryPlugin`, `MelisCommerceOrderPlugin`,
  `MelisCommerceOrderReturnProductPlugin`.

…plus des widgets de dashboard (nombre de commandes, chiffre d'affaires, messages de commande).

Une boutique s'assemble donc surtout en **plaçant ces plugins** sur des pages CMS et en les
stylant dans les vues de votre module de site.

## Facturation

`melis-commerce-order-invoice` étend commerce avec la **génération de factures PDF** (via
Spipu/Html2Pdf) : un service de facture + table (`melis_ecom_order_invoice`), le téléchargement
backoffice, et des listeners qui injectent l'UI de facture dans les vues de commande.

## Fichiers clés

| Sujet | Chemin |
| --- | --- |
| Services | `vendor/melisplatform/melis-commerce/src/Service/` |
| Entités | `vendor/melisplatform/melis-commerce/src/Entity/` |
| Schéma | `vendor/melisplatform/melis-commerce/install/sql/setup_structure.sql` |
| Plugins front | `vendor/melisplatform/melis-commerce/src/Controller/Plugin/` |
| Facturation | `vendor/melisplatform/melis-commerce-order-invoice/` |
