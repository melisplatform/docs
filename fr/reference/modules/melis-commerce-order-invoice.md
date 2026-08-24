# MelisCommerceOrderInvoice

> Ajoute la génération de factures PDF de commandes à MelisCommerce, exposée dans l'outil Commandes React. Paquet `melisplatform/melis-commerce-order-invoice`.

## Objectif

`MelisCommerceOrderInvoice` étend [MelisCommerce](/fr/guide/commerce) avec la facturation des
commandes. Lorsqu'une commande est validée, il génère automatiquement une facture PDF (via
`spipu/html2pdf`) et la stocke en base de données. Il ne fournit **aucun outil propre** : dans le
back-office React (`/melis-react`), il injecte deux éléments dans l'outil **MelisCommerce →
Commandes** — un onglet **Factures** dans l'éditeur de commande (liste, régénération,
téléchargement) et un petit bouton de **téléchargement** sur chaque ligne de la liste des commandes.
Le modèle de facture est une vue `.phtml`, entièrement surchargeable par locale.

## Activation

C'est un module Laminas standard. Ajoutez-le dans `config/melis.module.load.php` (après
`MelisCommerce`, dont il dépend) :

```php
'MelisCommerce',
'MelisCommerceOrderInvoice',
```

Dépendances (depuis `composer.json`) : `melisplatform/melis-commerce` et `spipu/html2pdf`. Le module
est compatible `dbdeploy` : sa table est donc créée via le delta dbdeploy à l'installation.

## Back-office React

La brique de ce module est une **brique d'extension / d'injection dans l'hôte** : elle ne dessine ni
page, ni route, ni entrée de menu latéral. Son `brick.manifest.json` fixe `route`, `label`,
`forwardKey` et `melisKey` tous à `null` (seul `entry: "brick.js"` est réel ; id de brique
`commerce-order-invoice`). Au chargement, `brick.tsx` publie deux composants React sur un global
`window` au lieu d'appeler `__melisRegisterBrick` :

```ts
window.MelisCommerceOrderInvoiceBrick = { OrderRowButton, InvoicesTab }
```

L'outil Commandes de MelisCommerce les consomme **uniquement si ce module est actif** — il interroge
`window.MelisCommerceOrderInvoiceBrick` via son hook `useExternalBrickComponent(globalName, key)` et
n'affiche rien si le global n'est jamais défini. Les deux composants prennent une unique prop
`{ orderId: number }` et lisent `document.documentElement.lang` pour les libellés FR/EN.

| Composant (`ui-react/src/`) | Où il apparaît | Comportement |
| --- | --- | --- |
| `OrderRowButton` | Liste des commandes — par ligne de commande | Récupère l'id de la dernière facture de la commande ; télécharge son PDF, ou affiche une alerte *« No invoice available »* si aucune. |
| `InvoicesTab` | Éditeur de commande — onglet **Factures** (commande existante uniquement) | Liste les factures (**ID**, **Date**), propose **Regenerate Invoice** et un **téléchargement** par ligne. |

La brique est un bundle Vite IIFE (`ui-react/vite.config.ts`, nom `MelisCommerceOrderInvoiceBrickBundle`)
construit dans `public/ui-react/brick.js` ; React et react-router sont externalisés vers les globals
de l'hôte, si bien que la brique réutilise l'instance React de l'hôte.

## Points d'accès appelés par la brique

La brique n'a **pas de `config/react-api.php`** — son client (`invoiceApi.ts`) rejoue les actions
**MVC historiques** du module lui-même avec `credentials: 'same-origin'`, toutes sous une même base :

```ts
export const INVOICE_BASE = '/melis/MelisCommerceOrderInvoice/MelisCommerceOrderInvoice'
```

| Appel | Action du contrôleur | Renvoie |
| --- | --- | --- |
| `POST {INVOICE_BASE}/getOrderLatestInvoiceId` (`orderId`) | `getOrderLatestInvoiceIdAction` | JSON `{ latestInvoiceId }` (0 si aucune) |
| `POST {INVOICE_BASE}/getOrderInvoice` (`invoiceId`) | `getOrderInvoiceAction` | Octets du PDF + un en-tête de réponse `fileName` |
| `POST {INVOICE_BASE}/getOrderInvoiceList` (`draw,start,length,orderId`) | `getOrderInvoiceListAction` | JSON DataTables `{ data: [{ ordin_id, ordin_date_generated }] }` |
| `POST {INVOICE_BASE}/generateOrderInvoice` (`orderId`) | `generateOrderInvoiceAction` | JSON `{ id }` (l'id de la nouvelle facture) |

Ces actions renvoient du JSON/binaire historique brut, et **non** l'enveloppe react-api
`{ success, data, error }` : le client les normalise donc (`fetchOrderInvoiceList` mappe
`ordin_id`/`ordin_date_generated` ; `downloadInvoiceFile` lit l'en-tête `fileName`). Côté serveur,
les actions délèguent à `MelisCommerceOrderInvoiceService`, en appelant
`generateOrderInvoice($orderId, 'orderinvoicetemplate/default')` pour une régénération. Le module
déclare aussi deux routes littérales supplémentaires
(`/CommerceOrderInvoice/getOrderLatestInvoiceId`, `/CommerceOrderInvoice/getInvoice`), mais la brique
React utilise la route à segments ci-dessus.

## Capacités et contrôle d'accès

Ce module ne comporte **pas de `config/react.capabilities.php`**. Le contrôle d'accès est à deux
niveaux :

- **Visibilité de l'interface** — l'hôte n'affiche le bouton de ligne et l'onglet que si la brique
  est chargée ; l'onglet **Factures** est en outre filtré par la propre capacité `invoices` de
  MelisCommerce dans son arbre de capacités `meliscommerce_order_list_page`.
- **Accès à l'API** — seule l'action de téléchargement du PDF impose un droit côté serveur :
  `getOrderInvoiceAction` vérifie `canAccess('meliscommerce_orders_content_tab_order_invoice')` et
  renvoie un 403 sinon. Les actions liste/dernière/génération ne requièrent qu'une session BO :
  considérez donc la visibilité de l'onglet/du bouton comme une indication d'interface plutôt que
  comme une véritable frontière d'autorisation.

## Services clés

Déclarés comme alias `service_manager` dans `config/module.config.php` :

| Alias de service | Rôle |
| --- | --- |
| `MelisCommerceOrderInvoiceService` | Le service de facturation (étend `MelisComGeneralService`). Génère, récupère et liste les factures. |
| `MelisCommerceOrderInvoiceTable` | Passerelle de table sur `melis_ecom_order_invoice` (étend `MelisEcomGenericTable`). |

Méthodes notables de `MelisCommerceOrderInvoiceService` :

| Méthode | Rôle |
| --- | --- |
| `generateOrderInvoice($orderId, $template)` | Construit le PDF d'une commande et l'enregistre ; renvoie le nouvel id de facture. |
| `getOrderInvoiceList($orderId, $start, $limit, $order)` | Liste les factures d'une commande. |
| `getOrderLatestInvoiceId($orderId)` | Id de la dernière facture d'une commande, ou `0` si aucune. |
| `getInvoice($invoiceId)` | La ligne de facture par id. |
| `getOrderInvoice($invoiceId)` | Le blob PDF brut (`ordin_invoice_pdf`) d'une facture. |
| `generateFileName($dateGenerated, $orderId, $invoiceId)` | Construit le nom de fichier de téléchargement (`Y/m/d-order-invoice[-suffixe].pdf`). |

Chaque méthode émet des événements `meliscommerce_order_invoice_*_start` / `_end`. La construction du
PDF émet aussi `meliscommerceorderinvoice_pdf_view`, ce qui permet de surcharger le `ViewModel` avant
le rendu. Le suffixe du nom de fichier provient de
`plugins.meliscommerceorderinvoice.data.custom-pdf-file-name` (défaut `invoice`) dans
`config/app.interface.php`.

## Écouteurs (intégration)

Le module se branche via trois écouteurs (attachés dans `src/Module.php`) plutôt que par des plugins
de templating front propres :

| Écouteur | Écoute | Effet |
| --- | --- | --- |
| `MelisCommerceOrderInvoiceGenerateInvoiceListener` | `meliscommerce_service_checkout_step2_postpayment_proccess_end` | Sur une commande réussie au statut `1`, génère automatiquement la facture depuis `orderinvoicetemplate/default`. |
| `MelisCommerceOrderDetailsInvoiceDataListener` | `MelisCommerceOrderPlugin_melistemplating_plugin_generate_view` | Injecte la dernière facture (+ URL de téléchargement) dans la vue du plugin de détails de commande. |
| `MelisCommerceOrderHistoryInvoiceDataListener` | `MelisCommerceOrderHistoryPlugin_melistemplating_plugin_generate_view` | Ajoute `invoiceId` à chaque ligne du plugin d'historique des commandes. |

C'est ainsi que le module alimente les plugins front compte/commande de MelisCommerce ; il ne fournit
pas de `MelisTemplatingPlugin` propre (voir [Plugins](/fr/guide/plugins)).

## Tables de base de données

| Table | Rôle |
| --- | --- |
| `melis_ecom_order_invoice` | Une ligne par facture générée. Colonnes : `ordin_id` (PK), `ordin_user_id`, `ordin_order_id`, `ordin_date_generated`, `ordin_invoice_pdf` (le PDF stocké en `longblob`). |

## Exemple

Générer (ou régénérer) et télécharger la dernière facture d'une commande depuis un
contrôleur/service :

```php
$invoiceSvc = $serviceManager->get('MelisCommerceOrderInvoiceService');

// Générer une nouvelle facture depuis le modèle par défaut
$invoiceId = $invoiceSvc->generateOrderInvoice($orderId, 'orderinvoicetemplate/default');

// Récupérer la dernière facture et son PDF brut
$latestId = $invoiceSvc->getOrderLatestInvoiceId($orderId);
$pdf      = $invoiceSvc->getOrderInvoice($latestId);   // contenu binaire du PDF
```

## Fichiers clés

| Sujet | Chemin |
| --- | --- |
| Source de la brique React | `ui-react/src/{brick.tsx, OrderRowButton.tsx, InvoicesTab.tsx, invoiceApi.ts}` |
| Build + manifeste de la brique | `public/ui-react/{brick.js, brick.manifest.json}` |
| Service de facturation | `src/Service/MelisCommerceOrderInvoiceService.php` |
| Passerelle de table | `src/Model/Tables/MelisCommerceOrderInvoiceTable.php` |
| Contrôleur | `src/Controller/MelisCommerceOrderInvoiceController.php` |
| Écouteurs | `src/Listener/` |
| Module / config | `src/Module.php`, `config/module.config.php`, `config/app.interface.php`, `config/app.tools.php` |
| Modèle de facture | `view/melis-commerce-order-invoice/melis-commerce-order-invoice/default-order-invoice-template.phtml` |
| Structure BDD | `install/dbdeploy/021419_melis_commerce_order_invoice_structure.sql` |
