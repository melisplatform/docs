# MelisCommerce

> Framework e-commerce complet pour MelisPlatform — catalogue, clients, panier/checkout/commandes, coupons,
> livraison et SEO. Paquet `melisplatform/melis-commerce`.

## Présentation

MelisCommerce ajoute une couche commerce complète à un site Melis : un catalogue (produits, variantes,
attributs, catégories, prix, stock), un modèle client B2B (comptes + contacts), le pipeline
panier/checkout/commande, des coupons, des devises, la livraison, les retours, les documents et le SEO. Il
embarque une suite de gestion en back-office et une boutique front office construite entièrement à
partir de plugins de templating déposables. La couche de données utilise **59 tables `melis_ecom_*`**,
**26 services**, **10 entités riches** et **33 listeners** ; l'accès aux données passe par Eloquent
(bundled `illuminate/database`), encapsulé par des services événementiels à la façon Melis.

## Activation

Ajouter dans `config/melis.module.load.php` :

```php
return [
    'MelisCommerce',
];
```

Requiert `melisplatform/melis-core ^5.2`. Les tables de base de données sont provisionnées
automatiquement par MelisDbDeploy (deltas sous `install/dbdeploy/`). Le module est proposé par
l'installeur Melis en tant que composant optionnel.

## Modèle objet

| Concept | Description |
| --- | --- |
| **Product** | Un conteneur pour les variantes — pas lui-même une unité vendable. |
| **Variant** | L'unité vendable : possède son propre SKU, stock et prix. Un produit sans option réelle possède tout de même une variante principale. |
| **Attribute** | Une propriété filtrable/définissant les variantes (ex. Couleur, Taille) avec des valeurs typées et traduisibles. Les produits déclarent les attributs qu'ils utilisent ; chaque variante choisit une valeur par attribut. |
| **Price** | Résolu pour une paire `(countryId, groupId)` avec TVA ; dégradation gracieuse (voir [Résolution des prix](#résolution-des-prix--du-stock)). |
| **Account** | Une organisation B2B (`melis_ecom_client`) ; possède un enregistrement entreprise, un groupe et des adresses. |
| **Contact / Person** | Un individu (`melis_ecom_client_person`) qui se connecte ; peut appartenir à plusieurs comptes. |
| **Basket** | Anonyme (identifié par `clientKey`) ou persistant (lié à un compte) ; fusion à la connexion. |
| **Order** | Créée au statut `-1` (temporaire) lors du checkout ; passe à `1` (Nouvelle commande) après paiement. |

## Services principaux

Tous les services étendent `MelisComGeneralService` et sont enregistrés dans `config/module.config.php`.
Chaque méthode publique est encadrée par des événements `meliscommerce_service_*_start` / `*_end` (voir
[Événements & listeners](#événements--listeners)).

| Alias de service | Rôle |
| --- | --- |
| `MelisComProductService` | `getProductById`, `getProductList` → entité `MelisProduct` |
| `MelisComVariantService` | `getVariantById`, `getVariantListByProductId`, `getVariantBySKU`, `getMainVariantByProductId` → `MelisVariant` |
| `MelisComCategoryService` | `getCategoryById`, `getCategoryListById(Recursive)` → `MelisCategory` |
| `MelisComAttributeService` | `getAttributeById`, `getAttributes` → `MelisAttribute` |
| `MelisComPriceService` | `getItemPrice($itemId, $countryId, $groupId, $type)` — prix avec hiérarchie de dégradation |
| `MelisComProductSearchService` | Recherche de produits côté front office |
| `MelisComSeoService` | SEO commerce (URLs / meta pour produits et catégories) |
| `MelisComClientService` | `getClientById`, `getClientList`, `getClientByIdAndClientPerson` → `MelisClient` |
| `MelisComContactService` | Gestion des contacts (personnes) |
| `MelisComClientGroupsService` | Groupes de clients (utilisés pour des prix spécifiques au groupe) |
| `MelisComAuthenticationService` | Connexion front office : `login`, `getClientId`, `getPersonId`, `getClientGroup`, `setClientId`, `logout`, `hasIdentity` |
| `MelisComBasketService` | `getBasket`, `getPersistentBasket`, `getAnonymousBasket`, `addVariantToBasket`, `transferAnonymousBasketToPersistentBasket` → `MelisBasket` |
| `MelisComOrderService` | `getOrderById`, `getOrderList` → `MelisOrder` |
| `MelisComOrderCheckoutService` | Checkout en deux phases : `checkoutStep1_prePayment`, `checkoutStep2_postPayment` |
| `MelisComPostPaymentService` | Enregistrement de la transaction post-paiement |
| `MelisComOrderProductReturnService` | Retours produits / RMA |
| `MelisComCouponService` | `getCouponById`, `getCouponList` → `MelisCoupon` |
| `MelisComCurrencyService` | Devises |
| `MelisComShipmentCostService` | Calcul des frais de livraison |
| `MelisComStockEmailAlertService` | Alertes e-mail de stock faible (`VARIANTSLOWSTOCK`) |
| `MelisComDocumentService` | `getDocumentById`, `getDocumentsByRelation` → `MelisDocument` |
| `MelisComDuplicationService` | Duplication de produits / variantes |
| `MelisComLinksService` | Constructeur de liens commerce front office |
| `MelisComCacheService` | Cache commerce (`commerce_big_services` ; préfixes de clés `product-/category-/variant-/document-/attribute-`) |
| `MelisComHead` | Aide SEO head (`updateTitleAndDescription`) |
| `MelisComGeneralService` | Classe de base ; helpers : `getTableColumns`, `getEcomLang`, `getFrontPluginLangId` |

## Résolution des prix & du stock

`MelisComPriceService::getItemPrice($itemId, $countryId, $groupId, $type)` parcourt une chaîne de dégradation :

1. pays spécifique + groupe spécifique
2. pays spécifique + groupe général
3. pays général (`price_country_id = 0`) + groupe spécifique
4. pays général + groupe général
5. (pour une variante) dégradation vers le prix du **produit**

Le stock est par **variante par pays** (`melis_ecom_variant_stock`). Lorsqu'une commande fait descendre
le stock sous le seuil, l'e-mail `VARIANTSLOWSTOCK` est envoyé aux destinataires configurés.

## Pipeline de checkout

Deux phases dans `MelisComOrderCheckoutService` :

**Phase 1 — `checkoutStep1_prePayment($clientId)`**
Valide le panier et les adresses, calcule tous les coûts et la livraison, génère la référence de
commande, puis appelle `MelisComOrderService::saveOrder()`. La commande est sauvegardée avec
`ord_status = -1` (temporaire). Déclenche `meliscommerce_service_checkout_step1_prepayment_start/_end` et
`…_save_success` (porte le nouvel `orderId`).

**Phase 2 — `checkoutStep2_postPayment()`**
Appelée après le retour de la passerelle de paiement. `MelisComPostPaymentService::processPostPayment()`
enregistre la transaction dans `melis_ecom_order_payment` et fait passer la commande du statut `-1`
vers un statut réel (ex. `1` = Nouvelle commande). Déclenche `meliscommerce_service_checkout_step2_postpayment_start/_end`.

**Statuts de commande :** `-1` temporaire · `1` Nouvelle commande · `2` En attente · `3` Expédiée · `4` Livrée ·
`5` Annulée · `6` Erreur de paiement.

## Événements & listeners

Chaque méthode de service émet des événements `meliscommerce_service_*_start` et `*_end`. Les arguments
nommés (construits par `makeArrayFromParameters` via réflexion) et la clé `results` voyagent avec l'événement.

- listener `_start` : modifie les entrées avant l'exécution du traitement.
- listener `_end` : modifie `$params['results']` avant que l'appelant ne le reçoive.

C'est le mécanisme d'extension principal — aucun sous-classement nécessaire. La remise de coupon intégrée
est elle-même un listener sur `meliscommerce_service_get_item_price_end`.

Les 33 listeners intégrés se répartissent en quatre familles :

| Famille | Exemples |
| --- | --- |
| Sauvegarde / validation | `…SaveProductListener`, `…SaveOrderListener`, `…SaveClientListener`, `…ValidateVariantListener` |
| Nettoyage en cascade (pays/langue supprimé) | `…ProductPriceCountryDeletedListener`, `…CategoryCountryLink…`, `…SEOLanguageDeletedListener` |
| Checkout / tarification / stock | `…CheckoutCouponListener`, `…CouponProductPriceListener`, `…ShipmentCostListener`, `…PostPaymentListener`, `…VariantCheckLowStockListener` |
| Routage SEO front office | `…SEOReformatToRoutePageUrlListener`, `…SEODispatchRouterCommerceUrlListener`, `…SEOMetaPageListener` |

## Back-office

Le back-office commerce complet se trouve sous la section de menu de gauche **MelisCommerce**.

| Entrée de menu | Contrôleur | Gère |
| --- | --- | --- |
| Catalogues | `MelisComCategory(List)` | Arbre glisser-déposer catalogue / catégorie ; traductions, disponibilité par pays, SEO |
| Produits | `MelisComProduct(List)` | Produits → variantes, prix, textes, SEO, images |
| Comptes | `MelisComClient(List)` | Comptes B2B (entreprise, groupe, adresses, contacts, commandes, fichiers) |
| Contacts | `MelisComContact` | Personnes ; import/export CSV ; liables à plusieurs comptes |
| Commandes | `MelisComOrder(List)` + `MelisComOrderCheckout` | Commandes + tunnel de création BO en 7 étapes ; statuts ; retours |
| Coupons | `MelisComCoupon(List)` | Coupons de réduction (% ou montant ; par compte / produit) |
| Attributs | `MelisComAttribute(List)` | Attributs + valeurs typées et traduisibles |
| Pays / Langues commerce / Devises / Statuts de commande / Groupes clients | `MelisComCountry` / `MelisComLanguage` / `MelisComCurrency` / `MelisComOrderStatus` / `MelisComClientsGroup` | Données de référence (liste + modal d'édition) |
| Paramètres commerce | `MelisComSettings` | Seuil global d'alerte stock ; stratégie de nom de compte (`sa_type`) |

Widgets du tableau de bord : `OrdersNumber`, `OrderMessages`, `SalesRevenue`.

## Front office

Les plugins de templating sont enregistrés sous `config/plugins/{products,categories,clients,orders}/` et
comme `controller_plugins` dans `module.config.php`. Déposez-les dans une zone de dépôt d'une page CMS.

| Domaine | Plugins |
| --- | --- |
| Catalogue | `ProductShowPlugin`, `ProductListPlugin`, `ProductSearchPlugin`, `CategoryTreePlugin`, `CategoryProductListPlugin`, `RelatedProductsPlugin`, `AttributesShowPlugin`, `ProductAttributePlugin`, `ProductPriceRangePlugin` |
| Panier & checkout | `AddToCartPlugin`, `CartPlugin`, `CheckoutPlugin`, `CheckoutCartPlugin`, `CheckoutAddressesPlugin`, `CheckoutCouponPlugin`, `CheckoutSummaryPlugin`, `CheckoutConfirmSummaryPlugin`, `CheckoutConfirmPlugin` |
| Compte | `LoginPlugin`, `RegisterPlugin`, `AccountPlugin`, `ProfilePlugin`, `BillingAddressPlugin`, `DeliveryAddressPlugin`, `LostPasswordGetEmailPlugin`, `LostPasswordResetPlugin` |
| Commandes (client) | `OrderPlugin`, `OrderHistoryPlugin`, `OrderMessagesPlugin`, `OrderShippingDetailsPlugin`, `OrderReturnProductPlugin`, `OrderAddressPlugin` |

## Tables de base de données

59 tables avec le préfixe `melis_ecom_*`, regroupées par sous-système :

| Groupe | Tables principales |
| --- | --- |
| Produits & variantes | `melis_ecom_product`, `melis_ecom_product_text` + `_text_type`, `melis_ecom_product_attribute`, `melis_ecom_product_category`, `melis_ecom_variant`, `melis_ecom_variant_attribute_value`, `melis_ecom_variant_stock`, `melis_ecom_assoc_variant` + `_type` |
| Attributs | `melis_ecom_attribute` + `_trans`, `melis_ecom_attribute_type`, `melis_ecom_attribute_value` + `_value_trans` |
| Catégories & géo | `melis_ecom_category` + `_trans`, `melis_ecom_country_category`, `melis_ecom_country`, `melis_ecom_lang` |
| Tarification & devises | `melis_ecom_price`, `melis_ecom_currency` |
| Clients (B2B) | `melis_ecom_client`, `melis_ecom_client_person` + `_person_emails`, `melis_ecom_client_company`, `melis_ecom_client_account_rel`, `melis_ecom_client_person_rel`, `melis_ecom_client_address` + `_address_type`, `melis_ecom_client_groups`, `melis_ecom_civility`, `melis_ecom_settings_account` |
| Paniers & commandes | `melis_ecom_basket_anonymous`, `melis_ecom_basket_persistent`, `melis_ecom_order`, `melis_ecom_order_basket`, `melis_ecom_order_address`, `melis_ecom_order_payment` + `_type`, `melis_ecom_order_shipping`, `melis_ecom_order_message`, `melis_ecom_order_status` + `_trans`, `melis_ecom_order_product_return` + `_details` |
| Coupons | `melis_ecom_coupon` + `_coupon_client` / `_coupon_order` / `_coupon_product` |
| Documents & SEO | `melis_ecom_document` + `_doc_type` + `_doc_relations`, `melis_ecom_seo`, `melis_ecom_stock_email_alert` |

## Exemples

**Lire un produit, sa variante principale et un prix résolu**

```php
$prdSrv   = $sm->get('MelisComProductService');
$varSrv   = $sm->get('MelisComVariantService');
$priceSrv = $sm->get('MelisComPriceService');

// getProductById($productId, $langId = null, $countryId = null, $groupId = -1, $docType = null, $docSubType = [])
$product = $prdSrv->getProductById($prdId, $langId, $countryId);  // → MelisProduct
$texts   = $product->getTexts();       // textes typés (TITLE, …) par langue
$cats    = $product->getCategories();  // catégories auxquelles le produit appartient

// getMainVariantByProductId($productId, $langId = null, $countryId = null, $groupId = 1)
$variant = $varSrv->getMainVariantByProductId($prdId, $langId, $countryId);  // → MelisVariant

// getItemPrice($itemId, $countryId, $groupId, $type = 'variant', array $data = [])
$price = $priceSrv->getItemPrice($variant->getId(), $countryId, $groupId, 'variant');
// $price['price'] (net), $price['price_currency'], $price['price_details']
```

**Ajouter au panier et exécuter le checkout en deux phases**

```php
$basketSrv   = $sm->get('MelisComBasketService');
$checkoutSrv = $sm->get('MelisComOrderCheckoutService');

// addVariantToBasket($variantId, $quantity, $clientId, $clientKey = null)
$basketSrv->addVariantToBasket($variantId, 1, $clientId);

// Fusionner un panier anonyme après connexion
$basketSrv->transferAnonymousBasketToPersistentBasket($clientKey, $clientId);

// Phase 1 — crée la commande au statut -1 (temporaire)
$step1 = $checkoutSrv->checkoutStep1_prePayment($clientId);
// $step1['orderId'] — à transmettre à la passerelle de paiement

// Phase 2 — après le retour de la passerelle ; enregistre le paiement, fait sortir la commande du -1
$step2 = $checkoutSrv->checkoutStep2_postPayment();
```

**Authentifier un client front office**

```php
$auth = $sm->get('MelisComAuthenticationService');
$res  = $auth->login($email, $password, $rememberMe);  // login($email, $password, $rememberMe = false)
if ($res['success']) {
    $personId = $auth->getPersonId();   // contact connecté (cper_id)
    $clientId = $auth->getClientId();   // compte sélectionné (cli_id)
    $group    = $auth->getClientGroup(); // groupe de tarification → alimente getItemPrice()
}
```

**Hooker la boutique sans sous-classement**

```php
// Attacher un listener à n'importe quel événement meliscommerce_service_*_start ou *_end.
// _start → modifier les entrées ; _end → modifier $params['results'].
$this->attachEventListener(
    $events, '*', 'meliscommerce_service_get_item_price_end',
    function ($e) {
        $params = $e->getParams();
        $price  = $params['results'];
        // modifier $price, puis :
        $params['results'] = $price;
        return $params;
    }
);
```

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Config du module (services, contrôleurs, plugins) | `vendor/melisplatform/melis-commerce/config/module.config.php` |
| Config de l'interface back-office | `vendor/melisplatform/melis-commerce/config/interface/` |
| Config des plugins front office | `vendor/melisplatform/melis-commerce/config/plugins/` |
| Config des modèles d'e-mail | `vendor/melisplatform/melis-commerce/config/app.emails.php` |
| Services | `vendor/melisplatform/melis-commerce/src/Service/` |
| Entités (10) | `vendor/melisplatform/melis-commerce/src/Entity/` |
| Table gateways (59) | `vendor/melisplatform/melis-commerce/src/Model/Tables/` |
| Contrôleurs (BO + plugins FO) | `vendor/melisplatform/melis-commerce/src/Controller/` |
| Listeners (33) | `vendor/melisplatform/melis-commerce/src/Listener/` |
| Deltas BDD | `vendor/melisplatform/melis-commerce/install/dbdeploy/` |

Voir aussi : [Référence des modules](/fr/legacy/reference/modules) · [melis-core](/fr/legacy/reference/modules/melis-core) · [melis-cms](/fr/legacy/reference/modules/melis-cms) · [melis-dbdeploy](/fr/legacy/reference/modules/melis-dbdeploy).
