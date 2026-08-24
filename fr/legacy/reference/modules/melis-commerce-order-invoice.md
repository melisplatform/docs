# MelisCommerceOrderInvoice

> Ajoute la génération de factures PDF de commandes à MelisCommerce.
> Paquet : `melisplatform/melis-commerce-order-invoice`.

## Objectif

`MelisCommerceOrderInvoice` étend [MelisCommerce](/fr/legacy/guide/commerce) avec la facturation des
commandes. Lorsqu'une commande est validée, il génère automatiquement une facture PDF (via
`spipu/html2pdf`) et la stocke en base de données. Dans le backoffice, il ajoute un onglet
**Factures** à l'intérieur de l'outil *Commandes* de MelisCommerce : les factures de chaque
commande y sont listées, régénérables et téléchargeables ; la liste des commandes reçoit également
une action *export PDF*. Le modèle de facture est une vue `.phtml`, entièrement surchargeable par
locale.

## Activation

C'est un module Laminas standard. Ajoutez-le dans `config/melis.module.load.php` (après
`MelisCommerce`, dont il dépend) :

```php
'MelisCommerce',
'MelisCommerceOrderInvoice',
```

Dépendances (depuis `composer.json`) : `melisplatform/melis-commerce` (`^5.2`) et
`spipu/html2pdf` (`^5.2`) ; PHP `^8.1|^8.3`. Le module est compatible `dbdeploy` : sa table est donc
créée via le delta dbdeploy à l'installation.

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
| `getOrderInvoiceList($orderId, $start, $limit, $order)` | Liste les factures d'une commande (une seule en front, toutes en back). |
| `getOrderLatestInvoiceId($orderId)` | Id de la dernière facture d'une commande, ou `0` si aucune. |
| `getInvoice($invoiceId)` | La ligne de facture par id. |
| `getOrderInvoice($invoiceId)` | Le blob PDF brut (`ordin_invoice_pdf`) d'une facture. |
| `generateFileName($dateGenerated, $orderId, $invoiceId)` | Construit le nom de fichier de téléchargement (`Y/m/d-order-invoice[-suffixe].pdf`). |

Chaque méthode émet des événements `meliscommerce_order_invoice_*_start` / `_end`. La construction du
PDF émet aussi `meliscommerceorderinvoice_pdf_view`, ce qui permet de surcharger le `ViewModel` avant
le rendu. Le suffixe du nom de fichier provient de
`plugins.meliscommerceorderinvoice.data.custom-pdf-file-name` (défaut `invoice`) dans
`config/app.interface.php`.

## Backoffice

Le module ne déclare pas d'outil de premier niveau propre ; il se greffe sur l'outil *Commandes* de
MelisCommerce via `config/app.interface.php` et `config/app.tools.php` :

- **Onglet Factures** sur une commande — clé d'interface
  `meliscommerce_orders_content_tab_order_invoice` et clé de contenu
  `meliscommerce_orders_content_tabs_content_order_invoice`. L'onglet contient une action
  *Regenerate Invoice* et la table de liste des factures.
- **Table de liste des factures** (clé `meliscommerce_order_invoice_list`), alimentée par
  `MelisCommerceOrderInvoice/MelisCommerceOrderInvoice/getOrderInvoiceList`, avec les colonnes
  `ordin_id` et `ordin_date_generated` et un bouton d'action `export-pdf`.
- **Export PDF** : bouton d'action ajouté à la table standard `meliscommerce_order_list`.

Contrôleur : `MelisCommerceOrderInvoice\Controller\MelisCommerceOrderInvoiceController`
(id invokable `MelisCommerceOrderInvoice\Controller\MelisCommerceOrderInvoice`). Actions clés :
`generateOrderInvoiceAction`, `getOrderInvoiceListAction`, `getOrderInvoiceAction` (téléchargement),
`getOrderLatestInvoiceIdAction`, et les actions de fragments d'interface `render-*` référencées par
la config d'interface. Voir [Référence des modules](/fr/legacy/reference/modules) et
[Créer un outil](/fr/legacy/guide/create-a-tool).

Deux routes hors backoffice exposent les factures au téléchargement :

| Route | Action |
| --- | --- |
| `/CommerceOrderInvoice/getOrderLatestInvoiceId` | `getOrderLatestInvoiceId` |
| `/CommerceOrderInvoice/getInvoice` | `getOrderInvoice` |

## Écouteurs (intégration)

Le module se branche via trois écouteurs (attachés dans `src/Module.php`) plutôt que par des plugins
de templating front propres :

| Écouteur | Écoute | Effet |
| --- | --- | --- |
| `MelisCommerceOrderInvoiceGenerateInvoiceListener` | `meliscommerce_service_checkout_step2_postpayment_proccess_end` | Sur une commande réussie au statut `1`, génère automatiquement la facture depuis `orderinvoicetemplate/default`. |
| `MelisCommerceOrderDetailsInvoiceDataListener` | `MelisCommerceOrderPlugin_melistemplating_plugin_generate_view` | Injecte la dernière facture (+ URL de téléchargement) dans la vue du plugin de détails de commande. |
| `MelisCommerceOrderHistoryInvoiceDataListener` | `MelisCommerceOrderHistoryPlugin_melistemplating_plugin_generate_view` | Ajoute `invoiceId` à chaque ligne du plugin d'historique des commandes. |

C'est ainsi que le module alimente les plugins front compte/commande de MelisCommerce ; il ne fournit
pas de `MelisTemplatingPlugin` propre (voir [Plugins](/fr/legacy/guide/plugins)).

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
| Service de facturation | `vendor/melisplatform/melis-commerce-order-invoice/src/Service/MelisCommerceOrderInvoiceService.php` |
| Passerelle de table | `vendor/melisplatform/melis-commerce-order-invoice/src/Model/Tables/MelisCommerceOrderInvoiceTable.php` |
| Contrôleur | `vendor/melisplatform/melis-commerce-order-invoice/src/Controller/MelisCommerceOrderInvoiceController.php` |
| Écouteurs | `vendor/melisplatform/melis-commerce-order-invoice/src/Listener/` |
| Module / config | `vendor/melisplatform/melis-commerce-order-invoice/src/Module.php`, `config/module.config.php`, `config/app.interface.php`, `config/app.tools.php` |
| Modèle de facture | `vendor/melisplatform/melis-commerce-order-invoice/view/melis-commerce-order-invoice/melis-commerce-order-invoice/default-order-invoice-template.phtml` |
| Structure BDD | `vendor/melisplatform/melis-commerce-order-invoice/install/dbdeploy/021419_melis_commerce_order_invoice_structure.sql` |
