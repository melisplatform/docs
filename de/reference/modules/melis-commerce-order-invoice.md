# MelisCommerceOrderInvoice

> Ergänzt MelisCommerce um die Generierung von PDF-Bestellrechnungen, die im React-Werkzeug „Orders“ bereitgestellt werden. Paket `melisplatform/melis-commerce-order-invoice`.

## Zweck

`MelisCommerceOrderInvoice` erweitert [MelisCommerce](/de/guide/commerce) um die Rechnungsstellung für Bestellungen. Wird eine
Bestellung validiert, generiert das Modul automatisch eine PDF-Rechnung (über `spipu/html2pdf`) und speichert sie in der
Datenbank. Es liefert **kein eigenes Werkzeug**: Im React-Backoffice (`/melis-react`) fügt es zwei
Bestandteile in das Werkzeug **MelisCommerce → Orders** ein — einen Reiter **Invoices** im Bestell-Editor (Liste,
Neu generieren, Herunterladen) sowie eine kleine Schaltfläche **Download** in jeder Zeile der Bestellliste. Die Rechnungsvorlage ist
eine `.phtml`-View, die pro Sprache vollständig überschreibbar ist.

## Aktivierung

Es handelt sich um ein Standard-Laminas-Modul. Fügen Sie es in `config/melis.module.load.php` hinzu (nach `MelisCommerce`,
von dem es abhängt):

```php
'MelisCommerce',
'MelisCommerceOrderInvoice',
```

Abhängigkeiten (aus `composer.json`): `melisplatform/melis-commerce` und `spipu/html2pdf`. Das Modul
ist `dbdeploy`-fähig, sodass seine Tabelle bei der Installation über das dbdeploy-Delta erstellt wird.

## React-Backoffice

Der Brick dieses Moduls ist ein **Erweiterungs-/Host-Injektions-Brick**: Er zeichnet keine Seite, keine Route und keinen
Sidebar-Eintrag. Seine `brick.manifest.json` setzt `route`, `label`, `forwardKey` und `melisKey` allesamt auf
`null` (nur `entry: "brick.js"` ist real; Brick-ID `commerce-order-invoice`). Beim Laden veröffentlicht `brick.tsx`
zwei React-Komponenten auf einer `window`-Globalvariablen, statt `__melisRegisterBrick` aufzurufen:

```ts
window.MelisCommerceOrderInvoiceBrick = { OrderRowButton, InvoicesTab }
```

Das MelisCommerce-Werkzeug „Orders“ konsumiert sie **nur, wenn dieses Modul aktiv ist** — es fragt
`window.MelisCommerceOrderInvoiceBrick` über seinen Hook `useExternalBrickComponent(globalName, key)` ab und
rendert nichts, wenn die Globalvariable nie gesetzt wird. Beide Komponenten erhalten eine einzelne `{ orderId: number }`-Prop
und lesen `document.documentElement.lang` für FR/EN-Beschriftungen.

| Komponente (`ui-react/src/`) | Wo sie erscheint | Verhalten |
| --- | --- | --- |
| `OrderRowButton` | Bestellliste — pro Bestellzeile | Ruft die ID der neuesten Rechnung der Bestellung ab; lädt deren PDF herunter oder meldet *„No invoice available“*, falls keine vorhanden ist. |
| `InvoicesTab` | Bestell-Editor — Reiter **Invoices** (nur bei bestehender Bestellung) | Listet Rechnungen (**ID**, **Date**), bietet **Regenerate Invoice** sowie einen **Download** pro Zeile. |

Der Brick ist ein Vite-IIFE-Bundle (`ui-react/vite.config.ts`, Name `MelisCommerceOrderInvoiceBrickBundle`),
das nach `public/ui-react/brick.js` gebaut wird; React und react-router werden zu den Host-Globalvariablen externalisiert, sodass der
Brick die React-Instanz des Hosts wiederverwendet.

## Endpunkte, die der Brick aufruft

Der Brick besitzt **keine `config/react-api.php`** — sein Client (`invoiceApi.ts`) wiederholt die
**Legacy-MVC**-Aktionen des Moduls mit `credentials: 'same-origin'`, allesamt unter einer gemeinsamen Basis:

```ts
export const INVOICE_BASE = '/melis/MelisCommerceOrderInvoice/MelisCommerceOrderInvoice'
```

| Aufruf | Controller-Aktion | Rückgabe |
| --- | --- | --- |
| `POST {INVOICE_BASE}/getOrderLatestInvoiceId` (`orderId`) | `getOrderLatestInvoiceIdAction` | JSON `{ latestInvoiceId }` (0, falls keine) |
| `POST {INVOICE_BASE}/getOrderInvoice` (`invoiceId`) | `getOrderInvoiceAction` | PDF-Bytes + ein `fileName`-Response-Header |
| `POST {INVOICE_BASE}/getOrderInvoiceList` (`draw,start,length,orderId`) | `getOrderInvoiceListAction` | DataTables-JSON `{ data: [{ ordin_id, ordin_date_generated }] }` |
| `POST {INVOICE_BASE}/generateOrderInvoice` (`orderId`) | `generateOrderInvoiceAction` | JSON `{ id }` (die ID der neuen Rechnung) |

Diese geben rohes Legacy-JSON/-Binärdaten zurück, **nicht** den react-api-Umschlag `{ success, data, error }`, sodass der
Client sie normalisiert (`fetchOrderInvoiceList` mappt `ordin_id`/`ordin_date_generated`;
`downloadInvoiceFile` liest den `fileName`-Header). Serverseitig delegieren die Aktionen an
`MelisCommerceOrderInvoiceService` und rufen für ein erneutes Generieren `generateOrderInvoice($orderId, 'orderinvoicetemplate/default')`
auf. Das Modul deklariert außerdem zwei zusätzliche literale Routen
(`/CommerceOrderInvoice/getOrderLatestInvoiceId`, `/CommerceOrderInvoice/getInvoice`), der React-Brick
verwendet jedoch die obige Segment-Route.

## Berechtigungen & Absicherung

Dieses Modul enthält **keine `config/react.capabilities.php`**. Die Absicherung erfolgt zweischichtig:

- **UI-Sichtbarkeit** — der Host rendert die Zeilen-Schaltfläche und den Reiter nur, wenn der Brick geladen ist; der
  Reiter **Invoices** wird zusätzlich durch die eigene `invoices`-Berechtigung von MelisCommerce unterhalb seines
  Berechtigungsbaums `meliscommerce_order_list_page` gefiltert.
- **API-Zugriff** — nur die PDF-Download-Aktion erzwingt serverseitig ein Recht:
  `getOrderInvoiceAction` prüft `canAccess('meliscommerce_orders_content_tab_order_invoice')` und
  gibt andernfalls 403 zurück. Die Aktionen list/latest/generate erfordern lediglich eine BO-Sitzung; behandeln Sie die
  Sichtbarkeit von Reiter/Schaltfläche daher als UI-Hinweis und nicht als harte Autorisierungsgrenze.

## Zentrale Dienste

Registriert als `service_manager`-Aliasse in `config/module.config.php`:

| Dienst-Alias | Rolle |
| --- | --- |
| `MelisCommerceOrderInvoiceService` | Der Rechnungsdienst (erweitert `MelisComGeneralService`). Generiert, ruft ab und listet Rechnungen. |
| `MelisCommerceOrderInvoiceTable` | Table-Gateway über `melis_ecom_order_invoice` (erweitert `MelisEcomGenericTable`). |

Nennenswerte Methoden von `MelisCommerceOrderInvoiceService`:

| Methode | Rolle |
| --- | --- |
| `generateOrderInvoice($orderId, $template)` | Erstellt das PDF für eine Bestellung und speichert es; gibt die ID der neuen Rechnung zurück. |
| `getOrderInvoiceList($orderId, $start, $limit, $order)` | Listet die Rechnungen einer Bestellung. |
| `getOrderLatestInvoiceId($orderId)` | ID der neuesten Rechnung einer Bestellung oder `0`, falls keine vorhanden ist. |
| `getInvoice($invoiceId)` | Die Rechnungszeile anhand der ID. |
| `getOrderInvoice($invoiceId)` | Der rohe PDF-Blob (`ordin_invoice_pdf`) einer Rechnung. |
| `generateFileName($dateGenerated, $orderId, $invoiceId)` | Erzeugt den Download-Dateinamen (`Y/m/d-order-invoice[-suffix].pdf`). |

Jede Methode löst die Events `meliscommerce_order_invoice_*_start` / `_end` aus. Die PDF-Erstellung löst zudem
`meliscommerceorderinvoice_pdf_view` aus, wodurch Sie das `ViewModel` vor dem Rendern überschreiben können. Der
Dateinamen-Suffix stammt aus `plugins.meliscommerceorderinvoice.data.custom-pdf-file-name` (Standardwert
`invoice`) in `config/app.interface.php`.

## Listener (Integration)

Das Modul bindet sich über drei Listener ein (angehängt in `src/Module.php`) statt über eigene
Front-Templating-Plugins:

| Listener | Lauscht auf | Wirkung |
| --- | --- | --- |
| `MelisCommerceOrderInvoiceGenerateInvoiceListener` | `meliscommerce_service_checkout_step2_postpayment_proccess_end` | Bei einer erfolgreichen Bestellung mit Status `1` wird die Rechnung automatisch aus `orderinvoicetemplate/default` generiert. |
| `MelisCommerceOrderDetailsInvoiceDataListener` | `MelisCommerceOrderPlugin_melistemplating_plugin_generate_view` | Fügt die neueste Rechnung (+ Download-URL) in die View des Bestelldetails-Plugins ein. |
| `MelisCommerceOrderHistoryInvoiceDataListener` | `MelisCommerceOrderHistoryPlugin_melistemplating_plugin_generate_view` | Fügt jeder Zeile des Bestellhistorie-Plugins eine `invoiceId` hinzu. |

Auf diese Weise speist das Modul die Front-Plugins für Konto/Bestellungen von MelisCommerce; es liefert kein
eigenes `MelisTemplatingPlugin` (siehe [Plugins](/de/guide/plugins)).

## Datenbanktabellen

| Tabelle | Rolle |
| --- | --- |
| `melis_ecom_order_invoice` | Eine Zeile pro generierter Rechnung. Spalten: `ordin_id` (PK), `ordin_user_id`, `ordin_order_id`, `ordin_date_generated`, `ordin_invoice_pdf` (das als `longblob` gespeicherte PDF). |

## Beispiel

Die neueste Rechnung einer Bestellung aus einem Controller/Service generieren (oder neu generieren) und herunterladen:

```php
$invoiceSvc = $serviceManager->get('MelisCommerceOrderInvoiceService');

// Generate a fresh invoice from the default template
$invoiceId = $invoiceSvc->generateOrderInvoice($orderId, 'orderinvoicetemplate/default');

// Fetch the latest invoice and its raw PDF
$latestId = $invoiceSvc->getOrderLatestInvoiceId($orderId);
$pdf      = $invoiceSvc->getOrderInvoice($latestId);   // binary PDF contents
```

## Zentrale Dateien

| Bereich | Pfad |
| --- | --- |
| React-Brick-Quellcode | `ui-react/src/{brick.tsx, OrderRowButton.tsx, InvoicesTab.tsx, invoiceApi.ts}` |
| Brick-Build + Manifest | `public/ui-react/{brick.js, brick.manifest.json}` |
| Rechnungsdienst | `src/Service/MelisCommerceOrderInvoiceService.php` |
| Table-Gateway | `src/Model/Tables/MelisCommerceOrderInvoiceTable.php` |
| Controller | `src/Controller/MelisCommerceOrderInvoiceController.php` |
| Listener | `src/Listener/` |
| Modul / Konfiguration | `src/Module.php`, `config/module.config.php`, `config/app.interface.php`, `config/app.tools.php` |
| Rechnungsvorlage | `view/melis-commerce-order-invoice/melis-commerce-order-invoice/default-order-invoice-template.phtml` |
| DB-Struktur | `install/dbdeploy/021419_melis_commerce_order_invoice_structure.sql` |
