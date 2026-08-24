# Commerce

`melis-commerce` ajoute un domaine **e-commerce** complet à Melis : catalogue, clients, panier,
checkout et commandes — exposés à la fois comme **tools backoffice** et **plugins front-office**.
Cette page est une carte pour s'orienter ; lisez le `src/Service/` du module pour l'API exacte et à
jour.

Dans **Melis v6**, le framework, le module et ses services sont inchangés — ce qui a changé, c'est
l'**interface du back-office** : les tools commerce s'exécutent désormais comme des **« bricks »**
React natives dans `/melis-react` (voir [Créer un tool](./create-a-tool)). Chaque tool conserve un
sélecteur **New / Old** par tool afin de revenir à l'écran classique dans une iframe, et
l'[Assistant IA](./ai) flottant global est disponible sur chaque tool.

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
`melis_ecom_product`). Le back-office React ne réimplémente **rien** de tout cela : ses endpoints
`/melis/react-api/…` se contentent de valider les entrées et de mettre en forme le JSON, puis
appellent ces mêmes services.

## Dans le backoffice

MelisCommerce enregistre une section **MelisCommerce** dans la barre latérale de `/melis-react` avec
**13 tools React** couvrant tout le domaine : **Accounts**, **Contacts**, **Catalogs**,
**Products**, **Orders**, **Coupons**, **Attributes**, **Countries**, **Commerce languages**,
**Currencies**, **Order status**, **Client's groups** et **Commerce settings**. Chacun est une
véritable page React (pas d'iframe dans la vue « New » par défaut) qui s'ouvre sur sa propre route ;
les tools « entité » ouvrent un enregistrement comme **sous-onglet** persistant, pour pouvoir revenir
à la liste sans perdre sa place. Chaque tool porte un sélecteur **New / Old** — « Old » affiche le
tool classique dans une iframe pour comparer.

![La section MelisCommerce dans la barre latérale de /melis-react — le sélecteur de tools.](/screenshots/react/melis-commerce/meliscommerce-menu-tools-selector.png)

Un workflow typique : construire le **catalogue** (Attributes → Catalogs → Products/Variants), gérer
les **clients** (Accounts + Contacts), puis dérouler le pipeline des **commandes** (Orders +
coupons), le tout appuyé sur les listes de référence commerce (Countries, Currencies, Order status,
Client's groups, Settings).

- **Catalogue** — le tool **Catalogs** est un **arbre** de catégories (glisser pour réordonner ;
  Properties / SEO / Products par nœud). **Products** liste les produits (recherche, duplication,
  export) ; l'éditeur comporte les onglets **Properties**, **Text**, **Variants**, **SEO** et
  **Prices**, avec un éditeur riche par variante (prix, stocks, SEO, associations, médias).
  **Attributes** gère les caractéristiques typées (Properties / Labels / Values).

  ![La liste Products (React).](/screenshots/react/melis-commerce/meliscommerce-tools-products-list.png)

  ![Éditeur de produit — onglet Variants.](/screenshots/react/melis-commerce/meliscommerce-tools-products-edit-tab-variants.png)

- **Clients** — les **Accounts** sont les clients B2B (Properties, Company, Contacts, Addresses,
  Orders, Files), avec recherche, filtres, gestionnaire de colonnes, export et **import** CSV. Les
  **Contacts** sont les personnes physiques (Information / Address / Association), rattachées à un ou
  plusieurs comptes.

  ![La liste Accounts (React).](/screenshots/react/melis-commerce/meliscommerce-tools-accounts-list.png)

- **Commandes** — le tool **Orders** liste les commandes (filtres, filtres de statut, export).
  L'éditeur par commande comporte les onglets **Properties**, **Basket**, **Addresses**, **Payment**,
  **Shipping**, **Messages** et **Returns** (plus **Invoices** quand la facturation est active — voir
  ci-dessous). **New Order** ouvre un **assistant de checkout guidé en 7 étapes** (contact → compte →
  produits → adresses → récapitulatif → paiement → confirmation), appuyé sur une session côté serveur
  qui reprend là où vous vous étiez arrêté.

  ![La liste Orders (React).](/screenshots/react/melis-commerce/meliscommerce-tools-order-list.png)

  ![Assistant de checkout New Order.](/screenshots/react/melis-commerce/meliscommerce-tools-order-newordertunnel-1.png)

- **Référence & config** — **Coupons** (Properties, Assign account, Assign product, Orders
  d'utilisation), **Countries**, **Commerce languages**, **Currencies** (avec une action *set
  default*), **Order status** (statut + couleur + libellés par langue), **Client's groups**, et une
  unique page **Commerce settings** (Properties + Accounts).

Pour la référence complète onglet par onglet de chaque tool (routes, capacités, endpoints
`react-api`), voir la [référence du module melis-commerce](/fr/reference/modules/melis-commerce).

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

Une boutique s'assemble donc surtout en **plaçant ces plugins** sur des pages CMS et en les stylant
dans les vues de votre module de site. Le changement de back-office React n'affecte **pas** le front
office : les plugins de la boutique et leurs vues sont inchangés.

## Facturation

`melis-commerce-order-invoice` étend commerce avec la **génération de factures PDF** (via
Spipu/Html2Pdf) : un service de facture + table (`melis_ecom_order_invoice`) et des listeners qui
génèrent les factures à partir des données de commande. Dans le back-office React, il n'a **pas de
tool propre** — c'est une **brick d'extension** qui injecte deux éléments dans le tool **Orders**
quand le module est actif :

- un onglet **Invoices** dans l'éditeur de commande — lister les factures, **Regenerate Invoice**, et
  télécharger n'importe quelle facture listée ;
- un bouton de **téléchargement** par ligne dans la liste Orders, qui récupère le dernier PDF de
  facture de la commande.

Si vous ne les voyez pas, vérifiez que `melis-commerce-order-invoice` est actif et que votre rôle
dispose du droit **Invoices** des Orders. Voir la
[référence du module melis-commerce-order-invoice](/fr/reference/modules/melis-commerce-order-invoice).

## Fichiers clés

| Sujet | Chemin |
| --- | --- |
| Services | `vendor/melisplatform/melis-commerce/src/Service/` |
| Entités | `vendor/melisplatform/melis-commerce/src/Entity/` |
| Schéma | `vendor/melisplatform/melis-commerce/install/sql/setup_structure.sql` |
| Plugins front | `vendor/melisplatform/melis-commerce/src/Controller/Plugin/` |
| Bricks React & API | `vendor/melisplatform/melis-commerce/ui-react/`, `config/react-api.php`, `src/Controller/ReactApi/` |
| Facturation | `vendor/melisplatform/melis-commerce-order-invoice/` |
