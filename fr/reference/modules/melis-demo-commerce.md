# MelisDemoCommerce

> Une vitrine e-commerce de démonstration clé en main construite sur MelisCommerce — une implémentation
> de référence pour le catalogue, le panier, le paiement et l'intégration des transporteurs. Package `melisplatform/melis-demo-commerce`.

## Présentation

`MelisDemoCommerce` est une boutique front-office complète et installable (`melis-site: true`) qui
illustre MelisCommerce fonctionnant comme une vraie boutique en ligne. Il remplit deux fonctions à la
fois : une boutique de démonstration opérationnelle (catalogue, panier, commandes, compte, retours), et
une **référence à copier** montrant précisément comment connecter des moyens de paiement au checkout,
calculer les frais de port, et personnaliser les plugins front-office de MelisCommerce par site. Il
nécessite que MelisCommerce soit déjà installé sur la plateforme (ses tables `melis_ecom_*` et les
données de référence doivent être présentes avant l'exécution de l'assistant).

## Activation

`MelisDemoCommerce` est un module de site. N'ajoutez **pas** ce module à la liste des modules
back-office (`config/melis.module.load.php`) — cela ferait passer toutes les URL
`/MelisDemoCommerce/*` par le back-office et rendrait l'assistant de configuration inaccessible.
Enregistrez-le plutôt dans la **table des chemins** (`config/melis.modules.path.php`) et activez-le
pour un domaine via la variable vhost `MELIS_MODULE "MelisDemoCommerce"`.

Dépendances Composer requises (`^5.2`) : `melis-commerce`, `melis-cms`, `melis-cms-slider`,
`melis-cms-prospects`, `melis-cms-news`, `melis-cms-page-script-editor`.

## Assistant de configuration

Ouvrez **`/MelisDemoCommerce/setup`** sur un domaine non encore lié à un autre site. Renseignez un
**Protocole**, un **Domaine du site** et un **Libellé du site**, puis cliquez sur **Démarrer la
configuration**. L'assistant exécute environ 15 étapes gérées par
`SetupController::executeSetupAction`, chaque étape `include`-ant un fichier de données d'amorçage
`MelisDemoCommerce.<step>.setup.php` depuis le répertoire `install/`. Les étapes créent l'arborescence
du site, les pages, les templates, les sliders, les actualités, puis le catalogue commerce complet
(attributs → produits → catégories → variantes → prix → stock), un coupon, ainsi que des clients et
commandes d'exemple. Tous les IDs de base de données résolus à l'exécution sont réécrits dans la
configuration du site générée (les espaces réservés `[:token]` dans les fichiers `config/*.dist`),
de sorte que l'assistant s'installe proprement aux côtés d'autres sites.

## Services principaux

| Alias du service | Rôle |
| --- | --- |
| `DemoCommerceService` | Assistants du site utilisés par l'assistant de configuration et les contrôleurs front. |
| `SiteShipmentCostService` | Calcule les frais de port ; implémentez ici les règles transporteur/zone/poids. |

## Front office

Les pages de la boutique sont entièrement assemblées à partir des plugins de templating front-office de
MelisCommerce. Ce module fournit son propre `template_path` (ainsi que les JS/CSS associés) pour chaque
plugin via `config/melis.plugins.config.php.dist` — il n'y a pas de logique commerce spécifique dans
les vues. Exemples de plugins avec des templates spécifiques au site :

| Plugin | Exemple de template |
| --- | --- |
| `MelisCommerceCategoryProductListPlugin` | `MelisDemoCommerce/plugin/category-product-list-slider` |
| `MelisCommerceProductSearchPlugin` | template du site |
| `MelisCommerceCategoryTreePlugin` | template du site |
| `MelisCommerceProductPriceRangePlugin` | template du site |
| `MelisCommerceProductListPlugin` | template du site |
| `MelisCommerceRelatedProductsPlugin` | template du site |
| Chaîne panier et checkout | templates du site dont `plugin/checkout-fake-payment` |

### Contrôleurs front

| Contrôleur | Responsabilité |
| --- | --- |
| `Home` | Page d'accueil de la boutique |
| `ComCatalogue` | Liste des catégories / catalogue |
| `ComProduct` | Détail produit et variante |
| `ComCheckout` | Tunnel de commande (adresses → livraison → paiement → confirmation) |
| `ComMyAccount` | Tableau de bord du compte client |
| `ComOrder` | Historique des commandes et retours |
| `ComLogin` / `ComLogout` / `ComLostPassword` | Authentification |
| `Contact` / `News` / `Search` / `About` / `Testimonial` | Pages de contenu |
| `Page404` | Gestionnaire 404 |
| `FakeServerPaymentController` | Point d'entrée de la passerelle de paiement de démonstration (ne pas utiliser en production) |
| `Setup` | Assistant de configuration (`/MelisDemoCommerce/setup`) |

### Écouteurs de personnalisation des plugins

Lorsqu'un remplacement de template ne suffit pas, les classes `Site*PluginListener` (toutes héritant de
`SiteGeneralListener`) interceptent les paramètres ou les résultats d'un plugin avant le rendu. Elles
suivent la convention d'événement MelisCommerce : modifier `$params` ou `$params['results']` et
retourner.

| Écouteur | Ajuste |
| --- | --- |
| `SiteCommerceProductListPluginListener` | Paramètres/résultats du plugin liste de produits |
| `SiteCommerceCategoryProductListPluginListener` | Liste de produits par catégorie |
| `SiteCommerceProductPriceRangePluginListener` | Plugin plage de prix |
| `SiteCommerceRelatedProductsPluginListener` | Produits associés |
| `SiteProductShowPluginListener` | Affichage du détail produit |
| `SiteCheckoutCartPluginListener` | Panier dans le checkout |
| `SiteCheckoutConfirmPluginListener` | Confirmation de commande |
| `SiteCartPluginListener` | Plugin panier |
| `SiteOrderPluginListener` | Liste des commandes |
| `SiteOrderReturnProductPluginListener` | Processus de retour produit |
| `SiteMenuCustomizationListener` | Menu front |
| `SiteBreadcrumbCustomizationListener` | Fil d'Ariane |

## Modèle d'intégration paiement

Un moyen de paiement s'enregistre en écoutant l'événement de paiement du checkout et en injectant son
propre formulaire dans l'étape checkout :

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

Le module embarque deux implémentations de démonstration pour montrer que le modèle est extensible :

| Paire | Style |
| --- | --- |
| `SiteFakePaymentListener` + `SiteFakePaymentProcesstListener` | Style passerelle serveur (s'appuie sur `FakeServerPaymentController`) |
| `SiteFakePaypalStyleListener` + `SiteFakePaypalStyleProcesstListener` | Style redirection PayPal |

Les écouteurs `…Processt` gèrent le retour de la passerelle et injectent les résultats dans
`checkoutStep2_postPayment` ; le moteur enregistre ensuite la transaction et fait passer la commande
hors du statut `-1`. **Ne livrez aucune des deux fausses passerelles en production.**

Pour intégrer une vraie passerelle : copiez une paire d'écouteurs fictifs, pointez le template de
paiement vers le formulaire ou l'URL de redirection du prestataire, et dans l'écouteur de traitement
transmettez les valeurs de transaction du prestataire à l'étape post-paiement du moteur.

## Modèle d'expédition personnalisé

Les frais de port sont calculés en écoutant les événements de calcul d'expédition du moteur et en
déléguant à `SiteShipmentCostService` :

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

`SiteShipmentCostService::computeShipmentCost($shipment)` est l'endroit où une vraie boutique place
sa logique transporteur/zone/poids. C'est l'exemple canonique du modèle MelisCommerce
**"étendre via un écouteur `_end`, réécrire `$params['results']`"**.

## Fichiers clés

| Élément | Chemin (sous `vendor/melisplatform/melis-demo-commerce/`) |
| --- | --- |
| Templates de configuration à l'exécution (l'assistant remplace les espaces réservés `[:token]`) | `config/*.dist` |
| Câblage des templates de plugins par site | `config/melis.plugins.config.php.dist` |
| Définition du formulaire de paiement | `config/app.forms.php` |
| Contrôleurs front | `src/MelisDemoCommerce/Controller/` |
| Écouteurs de plugins et de pages | `src/MelisDemoCommerce/Listener/` |
| Assistants du site et calculateur de frais de port | `src/MelisDemoCommerce/Service/` |
| Vues de la boutique (85 templates) | `view/` |
| Fichiers de données d'amorçage de l'assistant (catalogue, coupon, clients, commandes) | `install/MelisDemoCommerce.*.setup.php` |

Voir aussi : [MelisCommerce](/fr/reference/modules/melis-commerce),
[MelisDemoCms](/fr/reference/modules/melis-demo-cms),
[Référence des modules](/fr/reference/modules).
