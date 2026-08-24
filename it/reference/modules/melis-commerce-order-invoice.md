# MelisCommerceOrderInvoice

> Aggiunge la generazione di fatture d'ordine in PDF a MelisCommerce, esposta all'interno dello strumento Orders in React. Pacchetto `melisplatform/melis-commerce-order-invoice`.

## Scopo

`MelisCommerceOrderInvoice` estende [MelisCommerce](/it/guide/commerce) con la fatturazione degli ordini. Quando un
ordine viene validato, genera automaticamente una fattura PDF (tramite `spipu/html2pdf`) e la memorizza nel
database. Non fornisce **alcuno strumento proprio**: nel back-office React (`/melis-react`) inietta due
componenti nello strumento **MelisCommerce → Orders** — una scheda **Invoices** nell'editor dell'ordine (elenco,
rigenerazione, download) e un piccolo pulsante di **download** su ogni riga dell'elenco ordini. Il modello di fattura è
una vista `.phtml`, completamente sovrascrivibile per ciascuna lingua.

## Attivazione

È un modulo Laminas standard. Aggiungilo a `config/melis.module.load.php` (dopo `MelisCommerce`,
da cui dipende):

```php
'MelisCommerce',
'MelisCommerceOrderInvoice',
```

Dipendenze (da `composer.json`): `melisplatform/melis-commerce` e `spipu/html2pdf`. Il modulo
è abilitato a `dbdeploy`, quindi la sua tabella viene creata tramite il delta dbdeploy all'installazione.

## Back-office React

Il brick di questo modulo è un **brick di estensione / injection nell'host**: non disegna alcuna pagina, alcuna rotta né alcuna
voce nella barra laterale. Il suo `brick.manifest.json` imposta `route`, `label`, `forwardKey` e `melisKey` tutti a
`null` (solo `entry: "brick.js"` è reale; id del brick `commerce-order-invoice`). Al caricamento, `brick.tsx`
pubblica due componenti React su una variabile globale `window` anziché chiamare `__melisRegisterBrick`:

```ts
window.MelisCommerceOrderInvoiceBrick = { OrderRowButton, InvoicesTab }
```

Lo strumento Orders di MelisCommerce li consuma **solo se questo modulo è attivo** — interroga
`window.MelisCommerceOrderInvoiceBrick` tramite il suo hook `useExternalBrickComponent(globalName, key)` e
non renderizza nulla se la variabile globale non viene mai impostata. Entrambi i componenti ricevono un'unica prop `{ orderId: number }`
e leggono `document.documentElement.lang` per le etichette FR/EN.

| Componente (`ui-react/src/`) | Dove appare | Comportamento |
| --- | --- | --- |
| `OrderRowButton` | Elenco ordini — per ogni riga d'ordine | Recupera l'id dell'ultima fattura dell'ordine; ne scarica il PDF, oppure avvisa *"No invoice available"* se non ce ne sono. |
| `InvoicesTab` | Editor dell'ordine — scheda **Invoices** (solo per ordini esistenti) | Elenca le fatture (**ID**, **Date**), offre **Regenerate Invoice** e un **download** per ogni riga. |

Il brick è un bundle Vite IIFE (`ui-react/vite.config.ts`, nome `MelisCommerceOrderInvoiceBrickBundle`)
compilato in `public/ui-react/brick.js`; React e react-router sono esternalizzati verso le variabili globali dell'host, così il
brick riutilizza l'istanza di React dell'host.

## Endpoint chiamati dal brick

Il brick **non ha un `config/react-api.php`** — il suo client (`invoiceApi.ts`) rieffettua le azioni
**MVC legacy** proprie del modulo con `credentials: 'same-origin'`, tutte sotto un'unica base:

```ts
export const INVOICE_BASE = '/melis/MelisCommerceOrderInvoice/MelisCommerceOrderInvoice'
```

| Chiamata | Azione del controller | Restituisce |
| --- | --- | --- |
| `POST {INVOICE_BASE}/getOrderLatestInvoiceId` (`orderId`) | `getOrderLatestInvoiceIdAction` | JSON `{ latestInvoiceId }` (0 se nessuna) |
| `POST {INVOICE_BASE}/getOrderInvoice` (`invoiceId`) | `getOrderInvoiceAction` | Byte del PDF + un header di risposta `fileName` |
| `POST {INVOICE_BASE}/getOrderInvoiceList` (`draw,start,length,orderId`) | `getOrderInvoiceListAction` | JSON DataTables `{ data: [{ ordin_id, ordin_date_generated }] }` |
| `POST {INVOICE_BASE}/generateOrderInvoice` (`orderId`) | `generateOrderInvoiceAction` | JSON `{ id }` (l'id della nuova fattura) |

Queste restituiscono JSON/binario legacy grezzo, **non** l'envelope react-api `{ success, data, error }`, quindi il
client le normalizza (`fetchOrderInvoiceList` mappa `ordin_id`/`ordin_date_generated`;
`downloadInvoiceFile` legge l'header `fileName`). Lato server, le azioni delegano a
`MelisCommerceOrderInvoiceService`, chiamando `generateOrderInvoice($orderId, 'orderinvoicetemplate/default')`
per una rigenerazione. Il modulo dichiara inoltre due rotte letterali aggiuntive
(`/CommerceOrderInvoice/getOrderLatestInvoiceId`, `/CommerceOrderInvoice/getInvoice`), ma il brick React
usa la rotta a segmenti indicata sopra.

## Capability e controllo degli accessi

In questo modulo **non è presente un `config/react.capabilities.php`**. Il controllo è a due livelli:

- **Visibilità nell'interfaccia** — l'host renderizza il pulsante di riga e la scheda solo se il brick è caricato; la
  scheda **Invoices** è inoltre filtrata dalla capability `invoices` propria di MelisCommerce all'interno del suo
  albero di capability `meliscommerce_order_list_page`.
- **Accesso alle API** — solo l'azione di download del PDF applica un controllo lato server:
  `getOrderInvoiceAction` verifica `canAccess('meliscommerce_orders_content_tab_order_invoice')` e
  restituisce 403 in caso contrario. Le azioni list/latest/generate richiedono solo una sessione BO, quindi considera la
  visibilità della scheda/pulsante come suggerimento dell'interfaccia piuttosto che come un vero limite di autorizzazione.

## Servizi principali

Registrati come alias del `service_manager` in `config/module.config.php`:

| Alias del servizio | Ruolo |
| --- | --- |
| `MelisCommerceOrderInvoiceService` | Il servizio di fatturazione (estende `MelisComGeneralService`). Genera, recupera ed elenca le fatture. |
| `MelisCommerceOrderInvoiceTable` | Table gateway sulla tabella `melis_ecom_order_invoice` (estende `MelisEcomGenericTable`). |

Metodi rilevanti di `MelisCommerceOrderInvoiceService`:

| Metodo | Ruolo |
| --- | --- |
| `generateOrderInvoice($orderId, $template)` | Costruisce il PDF di un ordine e lo salva; restituisce l'id della nuova fattura. |
| `getOrderInvoiceList($orderId, $start, $limit, $order)` | Elenca le fatture di un ordine. |
| `getOrderLatestInvoiceId($orderId)` | Id dell'ultima fattura di un ordine, o `0` se nessuna. |
| `getInvoice($invoiceId)` | La riga della fattura in base all'id. |
| `getOrderInvoice($invoiceId)` | Il blob PDF grezzo (`ordin_invoice_pdf`) di una fattura. |
| `generateFileName($dateGenerated, $orderId, $invoiceId)` | Costruisce il nome del file di download (`Y/m/d-order-invoice[-suffix].pdf`). |

Ogni metodo lancia gli eventi `meliscommerce_order_invoice_*_start` / `_end`. La costruzione del PDF lancia inoltre
`meliscommerceorderinvoice_pdf_view`, permettendoti di sovrascrivere il `ViewModel` prima del rendering. Il
suffisso del nome file proviene da `plugins.meliscommerceorderinvoice.data.custom-pdf-file-name` (predefinito
`invoice`) in `config/app.interface.php`.

## Listener (integrazione)

Il modulo si integra tramite tre listener (collegati in `src/Module.php`) anziché tramite plugin di
front templating propri:

| Listener | In ascolto su | Effetto |
| --- | --- | --- |
| `MelisCommerceOrderInvoiceGenerateInvoiceListener` | `meliscommerce_service_checkout_step2_postpayment_proccess_end` | In caso di ordine andato a buon fine con stato `1`, genera automaticamente la fattura da `orderinvoicetemplate/default`. |
| `MelisCommerceOrderDetailsInvoiceDataListener` | `MelisCommerceOrderPlugin_melistemplating_plugin_generate_view` | Inietta l'ultima fattura (+ URL di download) nella vista del plugin dei dettagli dell'ordine. |
| `MelisCommerceOrderHistoryInvoiceDataListener` | `MelisCommerceOrderHistoryPlugin_melistemplating_plugin_generate_view` | Aggiunge `invoiceId` a ogni riga del plugin dello storico ordini. |

È così che il modulo alimenta i front plugin account/ordine di MelisCommerce; non fornisce alcun
`MelisTemplatingPlugin` proprio (vedi [Plugins](/it/guide/plugins)).

## Tabelle del database

| Tabella | Ruolo |
| --- | --- |
| `melis_ecom_order_invoice` | Una riga per ogni fattura generata. Colonne: `ordin_id` (PK), `ordin_user_id`, `ordin_order_id`, `ordin_date_generated`, `ordin_invoice_pdf` (il PDF memorizzato come `longblob`). |

## Esempio

Generare (o rigenerare) e scaricare l'ultima fattura di un ordine da un controller/servizio:

```php
$invoiceSvc = $serviceManager->get('MelisCommerceOrderInvoiceService');

// Genera una nuova fattura dal template predefinito
$invoiceId = $invoiceSvc->generateOrderInvoice($orderId, 'orderinvoicetemplate/default');

// Recupera l'ultima fattura e il suo PDF grezzo
$latestId = $invoiceSvc->getOrderLatestInvoiceId($orderId);
$pdf      = $invoiceSvc->getOrderInvoice($latestId);   // contenuto binario del PDF
```

## File chiave

| Ambito | Percorso |
| --- | --- |
| Sorgente del brick React | `ui-react/src/{brick.tsx, OrderRowButton.tsx, InvoicesTab.tsx, invoiceApi.ts}` |
| Build del brick + manifest | `public/ui-react/{brick.js, brick.manifest.json}` |
| Servizio di fatturazione | `src/Service/MelisCommerceOrderInvoiceService.php` |
| Table gateway | `src/Model/Tables/MelisCommerceOrderInvoiceTable.php` |
| Controller | `src/Controller/MelisCommerceOrderInvoiceController.php` |
| Listener | `src/Listener/` |
| Modulo / config | `src/Module.php`, `config/module.config.php`, `config/app.interface.php`, `config/app.tools.php` |
| Template di fattura | `view/melis-commerce-order-invoice/melis-commerce-order-invoice/default-order-invoice-template.phtml` |
| Struttura DB | `install/dbdeploy/021419_melis_commerce_order_invoice_structure.sql` |
