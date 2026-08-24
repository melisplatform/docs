# MelisCommerce

> Framework e-commerce complet pour MelisPlatform — catalogue, clients, panier/checkout/commandes, coupons, livraison et SEO — avec un back-office React. Paquet `melisplatform/melis-commerce`.

## Présentation

MelisCommerce ajoute une couche commerce complète à un site Melis : un catalogue (produits, variantes,
attributs, catégories, prix, stock), un modèle client B2B (comptes + contacts), le pipeline
panier/checkout/commande, des coupons, des devises, la livraison, les retours, les documents et le SEO. Il
embarque une suite de gestion en back-office et une boutique front office construite à partir de plugins de
templating déposables. La couche de données utilise **59 tables `melis_ecom_*`**, **26 services**,
**10 entités riches** et **33 listeners** ; l'accès aux données passe par Eloquent (bundled
`illuminate/database`), encapsulé par des services événementiels à la façon Melis.

En Melis v6, la logique métier est inchangée ; la **couche d'affichage** est un **back-office React**
(`/melis-react`). MelisCommerce embarque **un unique bundle multi-brick** exposant **13 outils React natifs**,
chacun adossé à des endpoints JSON sous `/melis/react-api/…`. Chaque outil conserve un basculement **Nouveau / Ancien**
qui lui est propre, pour vous permettre de revenir à l'écran legacy classique dans une iframe.

## Activation

Ajouter dans `config/melis.module.load.php` :

```php
return [
    'MelisCommerce',
];
```

Requiert `melisplatform/melis-core`. Les tables de base de données sont provisionnées automatiquement par
MelisDbDeploy (deltas sous `install/dbdeploy/`) ; le module est proposé par l'installeur Melis en tant que
composant optionnel. Les outils React n'apparaissent dans le back-office que lorsque MelisCommerce est actif
(découverte via `GET /melis/react-api/react-modules`).

## Le back-office React — un bundle, treize outils

Le bundle (`public/ui-react/brick.js` + `brick.manifest.json`) déclare 13 outils qui s'auto-enregistrent dans
`brick.tsx`. Tous sont nativement full-React ; chacun affiche un `ViewModeToggle` + `LegacyFrame` partagés,
de sorte que *Ancien* monte l'outil classique dans une iframe (`/melis/react-tool-page?key=<melisKey>`). Les
sept outils « entité » définissent `subTabs: true` (l'ouverture d'un enregistrement ajoute un sous-onglet) ;
les 13 sont `persistent`.

![La section MelisCommerce dans la barre latérale React — les 13 outils commerce](/screenshots/react/melis-commerce/meliscommerce-menu-tools-selector.png)

| Id du brick | Route | Libellé | melisKey |
| --- | --- | --- | --- |
| `commerce-accounts` | `/melis-commerce/clients-list` | Comptes | `meliscommerce_clients_list_page` |
| `commerce-contacts` | `/melis-commerce/contact-list` | Contacts | `meliscommerce_contact_list_page` |
| `commerce-catalog` | `/melis-commerce/categories` | Catalogues | `meliscommerce_categories_page` |
| `commerce-products` | `/melis-commerce/product-list` | Produits | `meliscommerce_product_list_container` |
| `commerce-orders` | `/melis-commerce/order-list` | Commandes | `meliscommerce_order_list_page` |
| `commerce-coupons` | `/melis-commerce/coupon-list` | Coupons | `meliscommerce_coupon_list_page` |
| `commerce-attributes` | `/melis-commerce/attribute-list` | Attributs | `meliscommerce_attribute_list_page` |
| `commerce-countries` | `/melis-commerce/country-list` | Pays | `meliscommerce_country_list_container` |
| `commerce-languages` | `/melis-commerce/language-list` | Langues commerce | `meliscommerce_language_list_container` |
| `commerce-currencies` | `/melis-commerce/currency-lists` | Devises | `meliscommerce_currency_conf` |
| `commerce-order-status` | `/melis-commerce/order-status-lists` | Statuts de commande | `meliscommerce_order_status_tool_page` |
| `commerce-clients-groups` | `/melis-commerce/clients-group-list` | Groupes clients | `meliscommerce_clients_group_tool_container` |
| `commerce-settings` | `/melis-commerce/settings` | Paramètres commerce | `meliscommerce_settings_page` |

> **Règle générale :** construisez le **catalogue** (attributs → catalogues → produits/variantes), gérez les
> **clients** (comptes + contacts), puis faites tourner le pipeline de **commande** (commandes + assistant de
> checkout + coupons), le tout adossé aux listes de référence commerce.

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

## Comptes & contacts

**Comptes** (`/melis-commerce/clients-list`) gère les clients B2B : la liste dispose de la recherche, de
filtres par statut/groupe, d'un gestionnaire de colonnes, de l'export et de l'**import** CSV. L'ouverture
d'un compte se fait dans un sous-onglet avec les onglets **Propriétés**, **Entreprise**, **Contacts**
(lier/délier, définir par défaut), **Adresses**, **Commandes** (historique) et **Fichiers**.

![La liste des comptes — filtres, gestionnaire de colonnes et import CSV](/screenshots/react/melis-commerce/meliscommerce-tools-accounts-list.png)

![Éditeur de compte — onglet Propriétés (statut, stratégie de nom, groupe, pays, tags)](/screenshots/react/melis-commerce/meliscommerce-tools-accounts-new-tab-properties.png)

![Éditeur de compte — onglet Contacts (lier / délier / par défaut)](/screenshots/react/melis-commerce/meliscommerce-tools-accounts-new-tab-contacts.png)

**Contacts** (`/melis-commerce/contact-list`) gère les personnes individuelles. L'éditeur comporte les
onglets **Information**, **Adresse** et **Association** (lier/délier un contact à des comptes, définir celui
par défaut). Les contacts sont adossés à `MelisComContactService` ; les comptes à `MelisComClientService`.

![Éditeur de contact — onglet Association (lier / délier des comptes)](/screenshots/react/melis-commerce/meliscommerce-tools-contacts-edit-tab-association.png)

## Catalogues, produits & variantes

**Catalogues** (`/melis-commerce/categories`) est un **arbre** de catégories réorganisable par glisser-déposer ;
une catégorie possède les onglets **Propriétés**, **SEO** et **Produits** (réorganisables).

![L'arbre de catégories du catalogue (React)](/screenshots/react/melis-commerce/meliscommerce-tools-catalogs-treeview.png)

**Produits** (`/melis-commerce/product-list`) liste les produits avec filtres, duplication et export.
L'éditeur de produit comporte les onglets **Propriétés**, **Texte** (par langue), **Variantes**, **SEO** et
**Prix**. L'onglet **Variantes** est le plus riche : chaque variante possède ses propres Propriétés, SEO,
Prix, Stocks et Associations, ainsi que des médias.

![La liste des produits (React)](/screenshots/react/melis-commerce/meliscommerce-tools-products-list.png)

![Éditeur de produit — onglet Variantes (prix, stocks, SEO, associations par variante)](/screenshots/react/melis-commerce/meliscommerce-tools-products-edit-tab-variants.png)

![Éditeur de produit — onglet Prix](/screenshots/react/melis-commerce/meliscommerce-tools-products-edit-tab-prices.png)

**Attributs** (`/melis-commerce/attribute-list`) gère les caractéristiques typées des produits : les onglets
de l'éditeur sont **Propriétés** (référence, type, statut, visible, recherchable), **Libellés** (par langue)
et **Valeurs** (valeurs avec traductions typées).

![Éditeur d'attribut — onglet Valeurs (valeurs avec traductions typées)](/screenshots/react/melis-commerce/meliscommerce-tools-attributes-edit-tab-values.png)

## Commandes & assistant de checkout

**Commandes** (`/melis-commerce/order-list`) dispose de filtres par statut et de l'export. Les onglets de
l'éditeur par commande sont **Propriétés**, **Panier** (lecture seule), **Adresses**, **Paiement** (lecture
seule), **Livraison**, **Messages** et **Retours** — auxquels s'ajoute **Factures** lorsque
[MelisCommerceOrderInvoice](/reference/modules/melis-commerce-order-invoice) est actif.

![La liste des commandes (React)](/screenshots/react/melis-commerce/meliscommerce-tools-order-list.png)

![Éditeur de commande — onglet Propriétés](/screenshots/react/melis-commerce/meliscommerce-tools-order-edit-tab-properties.png)

**Nouvelle commande** ouvre un **assistant de checkout guidé en 7 étapes**
(`contact → compte → produits → adresses → récapitulatif → paiement → confirmation`), adossé à une session
de checkout côté serveur (endpoints sous `/orders/checkout/*`) qui reprend là où vous vous étiez arrêté.

![L'assistant de checkout Nouvelle commande — étapes contact / compte / produits](/screenshots/react/melis-commerce/meliscommerce-tools-order-newordertunnel-1.png)

![L'assistant de checkout — étape adresses / récapitulatif](/screenshots/react/melis-commerce/meliscommerce-tools-order-newordertunnel-2.png)

## Coupons

**Coupons** (`/melis-commerce/coupon-list`) gère les codes de réduction (% ou montant). Onglets de l'éditeur :
**Propriétés**, **Assigner un compte** (clients), **Assigner un produit** et **Commandes** (historique
d'utilisation). Adossé à `MelisComCouponService` ; la remise intégrée est elle-même un listener sur
`meliscommerce_service_get_item_price_end`.

![Éditeur de coupon — onglet Assigner un compte](/screenshots/react/melis-commerce/meliscommerce-tools-coupons-edit-tab-assignedclients.png)

## Outils de référence commerce

Petits outils « à la façon paramètres » — listes sur une seule page avec modales d'ajout/édition ou un
formulaire unique :

| Outil | Route | Gère |
| --- | --- | --- |
| Pays | `/melis-commerce/country-list` | Liste des pays commerce (ajout/édition) |
| Langues commerce | `/melis-commerce/language-list` | Langues commerce (liste + modale) |
| Devises | `/melis-commerce/currency-lists` | Devises (liste + modale, **définir par défaut**) |
| Statuts de commande | `/melis-commerce/order-status-lists` | Statuts ; l'éditeur comporte Propriétés (couleur) + Libellés |
| Groupes clients | `/melis-commerce/clients-group-list` | Groupes de clients (liste + modale) |
| Paramètres commerce | `/melis-commerce/settings` | Page de config unique — onglets Propriétés + Comptes |

![La liste des statuts de commande (React)](/screenshots/react/melis-commerce/meliscommerce-tools-orderstatus-list.png)

![Paramètres commerce — onglet Propriétés (seuil d'alerte stock, stratégie de nom de compte)](/screenshots/react/melis-commerce/meliscommerce-tools-settings-tab-properties.png)

Les paramètres commerce contiennent le seuil global d'alerte stock et la stratégie de nom de compte (`sa_type`).

## Services principaux

Tous les services étendent `MelisComGeneralService` et sont enregistrés dans `config/module.config.php`.
Chaque méthode publique est encadrée par des événements `meliscommerce_service_*_start` / `*_end` (voir
[Événements & listeners](#événements--listeners)). Les contrôleurs React ne font que valider les entrées et
mettre en forme le JSON — le vrai travail reste dans ces services.

| Alias de service | Rôle |
| --- | --- |
| `MelisComProductService` | `getProductById`, `getProductList` → `MelisProduct` |
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
| `MelisComCacheService` | Cache commerce (`commerce_big_services`) |
| `MelisComHead` | Aide SEO head (`updateTitleAndDescription`) |
| `MelisComGeneralService` | Classe de base ; helpers : `getTableColumns`, `getEcomLang`, `getFrontPluginLangId` |

## Résolution des prix & du stock

`MelisComPriceService::getItemPrice($itemId, $countryId, $groupId, $type)` parcourt une chaîne de dégradation :

1. pays spécifique + groupe spécifique
2. pays spécifique + groupe général
3. pays général (`price_country_id = 0`) + groupe spécifique
4. pays général + groupe général
5. (pour une variante) dégradation vers le prix du **produit**

Le stock est par **variante par pays** (`melis_ecom_variant_stock`). Lorsqu'une commande fait descendre le
stock sous le seuil, l'e-mail `VARIANTSLOWSTOCK` est envoyé aux destinataires configurés.

## Pipeline de checkout

Deux phases dans `MelisComOrderCheckoutService` (l'assistant React pilote la même logique serveur) :

**Phase 1 — `checkoutStep1_prePayment($clientId)`** valide le panier et les adresses, calcule tous les coûts
et la livraison, génère la référence de commande, puis appelle `MelisComOrderService::saveOrder()`. La
commande est sauvegardée avec `ord_status = -1` (temporaire). Déclenche
`meliscommerce_service_checkout_step1_prepayment_start/_end` et `…_save_success` (porte le nouvel `orderId`).

**Phase 2 — `checkoutStep2_postPayment()`** est appelée après le retour de la passerelle.
`MelisComPostPaymentService::processPostPayment()` enregistre la transaction dans `melis_ecom_order_payment`
et fait sortir la commande du statut `-1` vers un statut réel. Déclenche
`meliscommerce_service_checkout_step2_postpayment_start/_end`.

**Statuts de commande :** `-1` temporaire · `1` Nouvelle commande · `2` En attente · `3` Expédiée · `4` Livrée ·
`5` Annulée · `6` Erreur de paiement.

## Événements & listeners

Chaque méthode de service émet des événements `meliscommerce_service_*_start` et `*_end`. Les arguments
nommés (construits par `makeArrayFromParameters` via réflexion) et la clé `results` voyagent avec l'événement.

- listener `_start` : modifie les entrées avant l'exécution du traitement.
- listener `_end` : modifie `$params['results']` avant que l'appelant ne le reçoive.

C'est le mécanisme d'extension principal — aucun sous-classement nécessaire. Les 33 listeners intégrés se
répartissent en quatre familles :

| Famille | Exemples |
| --- | --- |
| Sauvegarde / validation | `…SaveProductListener`, `…SaveOrderListener`, `…SaveClientListener`, `…ValidateVariantListener` |
| Nettoyage en cascade (pays/langue supprimé) | `…ProductPriceCountryDeletedListener`, `…CategoryCountryLink…`, `…SEOLanguageDeletedListener` |
| Checkout / tarification / stock | `…CheckoutCouponListener`, `…CouponProductPriceListener`, `…ShipmentCostListener`, `…PostPaymentListener`, `…VariantCheckLowStockListener` |
| Routage SEO front office | `…SEOReformatToRoutePageUrlListener`, `…SEODispatchRouterCommerceUrlListener`, `…SEOMetaPageListener` |

## API React & capacités

Toutes les routes sont des routes enfants de `melis-react-api` (fusionnées depuis `config/react-api.php`) :
**13 contrôleurs invokables** dans `src/Controller/ReactApi/`, **184 routes** sous `/melis/react-api/…`. Le
contrat de réponse est partout `{ success, data, error? }` ; chaque action appelle d'abord
`denyUnlessAccess()` (auth + `MelisCoreRights::canAccess(<melisKey>)`, 401/403). Chaque outil entité expose
grosso modo `GET /<tool>` (liste keyset), `/<tool>/stats`, `/<tool>/options`, `POST /<tool>/save`,
`DELETE /<tool>/delete/:id`, `GET /<tool>/:id`, plus des sous-ressources propres à l'outil (ex. Commandes
ajoute l'assistant complet `/orders/checkout/*`).

> ⚠ Les langues commerce sont dans l'espace de noms `/commerce-languages` (et non `/languages`) car l'outil
> Langues du cœur possède déjà `/languages` sous le parent partagé `melis-react-api`.

`config/react.capabilities.php` déclare une entrée `melisReactToolCapabilities` par outil, clée sous son
melisKey. Ce sont des **indications d'UI déclaratives en autorisation-par-défaut** — elles pilotent l'arbre
de cases à cocher Utilisateurs → Droits et permettent à React de masquer onglets/boutons via `useCaps(...)`
— mais il n'existe **pas encore de `denyUnlessCan()` côté serveur** ; seul `denyUnlessAccess()` sur le
melisKey de l'outil protège l'API. Traitez les capacités comme des indications d'UI, pas comme de la sécurité.

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

$product = $prdSrv->getProductById($prdId, $langId, $countryId);  // → MelisProduct
$variant = $varSrv->getMainVariantByProductId($prdId, $langId, $countryId);  // → MelisVariant
$price   = $priceSrv->getItemPrice($variant->getId(), $countryId, $groupId, 'variant');
// $price['price'] (net), $price['price_currency'], $price['price_details']
```

**Ajouter au panier et exécuter le checkout en deux phases**

```php
$basketSrv   = $sm->get('MelisComBasketService');
$checkoutSrv = $sm->get('MelisComOrderCheckoutService');

$basketSrv->addVariantToBasket($variantId, 1, $clientId);
$basketSrv->transferAnonymousBasketToPersistentBasket($clientKey, $clientId);

$step1 = $checkoutSrv->checkoutStep1_prePayment($clientId);  // commande au statut -1
// $step1['orderId'] — à transmettre à la passerelle de paiement
$step2 = $checkoutSrv->checkoutStep2_postPayment();          // enregistre le paiement, fait sortir du -1
```

**Hooker la boutique sans sous-classement**

```php
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
| Routes / capacités de l'API React | `vendor/melisplatform/melis-commerce/config/react-api.php`, `config/react.capabilities.php` |
| Brick React (source / build) | `vendor/melisplatform/melis-commerce/ui-react/src/`, `public/ui-react/{brick.js, brick.manifest.json}` |
| Contrôleurs de l'API React (13) | `vendor/melisplatform/melis-commerce/src/Controller/ReactApi/` |
| Config des plugins front office | `vendor/melisplatform/melis-commerce/config/plugins/` |
| Services / Entités (10) / Table gateways (59) | `vendor/melisplatform/melis-commerce/src/Service/`, `src/Entity/`, `src/Model/Tables/` |
| Listeners (33) | `vendor/melisplatform/melis-commerce/src/Listener/` |
| Deltas BDD | `vendor/melisplatform/melis-commerce/install/dbdeploy/` |

Voir aussi : [Référence des modules](/reference/modules) · [melis-react-api](/reference/modules/melis-react-api) · [melis-commerce-order-invoice](/reference/modules/melis-commerce-order-invoice) · [melis-core](/legacy/reference/modules/melis-core) · [melis-cms](/reference/modules/melis-cms).
