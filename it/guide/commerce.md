# Commerce

`melis-commerce` aggiunge a Melis un dominio **e-commerce** completo: catalogo, clienti, carrello,
checkout e ordini — esposto sia come **strumenti di backoffice** sia come **plugin di front-office**.
Questa pagina è una mappa per orientarsi; leggi la cartella `src/Service/` del modulo per conoscere
l'API esatta e attuale.

In **Melis v6** il framework, il modulo e i suoi servizi sono invariati — ciò che è cambiato è la
**UI di back-office**: gli strumenti commerce ora funzionano come **"bricks" React** nativi all'interno
di `/melis-react` (vedi [Creare uno strumento](./create-a-tool)). Ogni strumento mantiene un
interruttore **New / Old** per strumento, così da poter tornare alla schermata classica in un iframe,
e l'[Assistente AI](./ai) flottante globale è disponibile su ogni strumento.

## Modello di dominio

I concetti principali (entità in `melis-commerce/src/Entity/`, tabelle con prefisso `melis_ecom_*`):

| Area | Concetti | Tabelle (esempi) |
| --- | --- | --- |
| **Catalogo** | Prodotto, Variante (SKU vendibile), Categoria, Attributo e valori | `melis_ecom_product`, `melis_ecom_variant`, `melis_ecom_category`, `melis_ecom_attribute` |
| **Prezzi** | Prezzo per variante/prodotto × paese × valuta × gruppo cliente | `melis_ecom_price`, `melis_ecom_client_groups` |
| **Clienti** | Cliente (account), Persona cliente, indirizzi | `melis_ecom_client`, `melis_ecom_client_person` |
| **Carrello** | Carrelli anonimi e persistenti | `melis_ecom_basket_anonymous`, `melis_ecom_basket_persistent` |
| **Ordini** | Ordine + indirizzi, pagamento, spedizione; resi | `melis_ecom_order`, `melis_ecom_order_address`, `melis_ecom_order_payment` |
| **Promozioni** | Coupon (limitati a prodotto/cliente) | `melis_ecom_coupon`, `melis_ecom_coupon_product` |
| **Localizzazione** | Paese, Valuta | `melis_ecom_country`, `melis_ecom_currency` |
| **Media** | Documenti (immagini/PDF) | `melis_ecom_document` |

## Servizi che utilizzerai

Tutti registrati in `melis-commerce/config/module.config.php` (`service_manager.aliases`). I
principali:

- **Catalogo**: `MelisComProductService`, `MelisComVariantService`, `MelisComCategoryService`,
  `MelisComAttributeService`, `MelisComPriceService`, `MelisComProductSearchService`,
  `MelisComDocumentService`.
- **Carrello e checkout**: `MelisComBasketService`, `MelisComOrderCheckoutService`,
  `MelisComOrderService`, `MelisComShipmentCostService`, `MelisComPostPaymentService`,
  `MelisComOrderProductReturnService`.
- **Clienti**: `MelisComClientService`, `MelisComAuthenticationService`, `MelisComContactService`,
  `MelisComClientGroupsService`.
- **Configurazione**: `MelisComCouponService`, `MelisComCurrencyService`, `MelisComSeoService`.

```php
$products = $sm->get('MelisComProductService');
$orders   = $sm->get('MelisComOrderService');
```

Ogni servizio poggia su un livello dati `MelisEcom*Table` (ad es. `MelisEcomProductTable` →
`melis_ecom_product`). Il back-office React **non** re-implementa nulla di tutto questo: i suoi
endpoint `/melis/react-api/…` si limitano a validare l'input e a formattare il JSON, per poi
richiamare questi stessi servizi.

## Nel backoffice

MelisCommerce registra una sezione **MelisCommerce** nella sidebar di `/melis-react` con **13
strumenti React** che coprono l'intero dominio: **Accounts**, **Contacts**, **Catalogs**,
**Products**, **Orders**, **Coupons**, **Attributes**, **Countries**, **Commerce languages**,
**Currencies**, **Order status**, **Client's groups** e **Commerce settings**. Ognuno è una vera
pagina React (nessun iframe nella vista "New" predefinita) che si apre sul proprio percorso; gli
strumenti "entità" aprono un record come **sotto-scheda** persistente, così puoi tornare all'elenco
senza perdere il segno. Ogni strumento porta con sé un interruttore **New / Old** — "Old" mostra lo
strumento classico in un iframe, così da poter confrontare.

![La sezione MelisCommerce nella sidebar /melis-react — il selettore degli strumenti.](/screenshots/react/melis-commerce/meliscommerce-menu-tools-selector.png)

Un flusso di lavoro tipico: costruire il **catalogo** (Attributes → Catalogs → Products/Variants),
gestire i **clienti** (Accounts + Contacts), quindi eseguire la pipeline degli **ordini** (Orders +
coupon), il tutto supportato dagli elenchi di riferimento commerce (Countries, Currencies, Order
status, Client's groups, Settings).

- **Catalogo** — lo strumento **Catalogs** è un **albero** di categorie (trascina per riordinare;
  Properties / SEO / Products per nodo). **Products** elenca i prodotti (ricerca, duplicazione,
  esportazione); l'editor ha le schede **Properties**, **Text**, **Variants**, **SEO** e **Prices**,
  con un ricco editor per variante (prezzi, giacenze, SEO, associazioni, media). **Attributes**
  gestisce le caratteristiche tipizzate (Properties / Labels / Values).

  ![L'elenco dei prodotti (React).](/screenshots/react/melis-commerce/meliscommerce-tools-products-list.png)

  ![Editor prodotto — scheda Variants.](/screenshots/react/melis-commerce/meliscommerce-tools-products-edit-tab-variants.png)

- **Clienti** — gli **Accounts** sono clienti B2B (Properties, Company, Contacts, Addresses, Orders,
  Files), con ricerca, filtri, un gestore delle colonne, esportazione e **importazione** CSV. I
  **Contacts** sono le persone fisiche (Information / Address / Association), collegate a uno o più
  account.

  ![L'elenco degli account (React).](/screenshots/react/melis-commerce/meliscommerce-tools-accounts-list.png)

- **Ordini** — lo strumento **Orders** elenca gli ordini (filtri, filtri per stato, esportazione).
  L'editor per ordine ha le schede **Properties**, **Basket**, **Addresses**, **Payment**,
  **Shipping**, **Messages** e **Returns** (più **Invoices** quando la fatturazione è attiva — vedi
  sotto). **New Order** apre una **procedura guidata di checkout in 7 passaggi** (contatto → account →
  prodotti → indirizzi → riepilogo → pagamento → conferma) supportata da una sessione lato server che
  riprende da dove ti eri fermato.

  ![L'elenco degli ordini (React).](/screenshots/react/melis-commerce/meliscommerce-tools-order-list.png)

  ![Procedura guidata di checkout New Order.](/screenshots/react/melis-commerce/meliscommerce-tools-order-newordertunnel-1.png)

- **Riferimento e configurazione** — **Coupons** (Properties, Assign account, Assign product, Orders
  di utilizzo), **Countries**, **Commerce languages**, **Currencies** (con un'azione *set default*),
  **Order status** (stato + colore + etichette per lingua), **Client's groups**, e una singola pagina
  **Commerce settings** (Properties + Accounts).

Per il riferimento completo scheda per scheda di ogni strumento (percorsi, funzionalità, endpoint
`react-api`) vedi il [riferimento del modulo melis-commerce](/it/reference/modules/melis-commerce).

## Nel front office

Commerce include un ampio set di **plugin di templating** (inseriscili nelle pagine — vedi
[Plugin](./plugins)) che coprono l'intera vetrina:

- **Catalogo**: `MelisCommerceProductShowPlugin`, `MelisCommerceProductListPlugin`,
  `MelisCommerceProductSearchPlugin`, `MelisCommerceCategoryProductListPlugin`,
  `MelisCommerceRelatedProductsPlugin`.
- **Account**: `MelisCommerceLoginPlugin`, `MelisCommerceRegisterPlugin`,
  `MelisCommerceAccountPlugin`, `MelisCommerceProfilePlugin`, plugin per indirizzo di
  consegna/fatturazione.
- **Carrello e checkout**: `MelisCommerceAddToCartPlugin`, `MelisCommerceCartPlugin`,
  `MelisCommerceCheckoutPlugin` (+ passaggi carrello / coupon / indirizzi / riepilogo / conferma).
- **Ordini**: `MelisCommerceOrderHistoryPlugin`, `MelisCommerceOrderPlugin`,
  `MelisCommerceOrderReturnProductPlugin`.

…più i widget della dashboard (conteggio ordini, fatturato di vendita, messaggi degli ordini).

Una vetrina viene quindi assemblata perlopiù **posizionando questi plugin** nelle pagine CMS e
applicandovi uno stile nelle viste del tuo modulo di sito. Il cambiamento del back-office React
**non** influisce sul front office: i plugin della vetrina e le loro viste sono invariati.

## Fatturazione

`melis-commerce-order-invoice` estende commerce con la **generazione di fatture PDF** (tramite
Spipu/Html2Pdf): un servizio fattura + tabella (`melis_ecom_order_invoice`) e listener che generano
fatture dai dati dell'ordine. Nel back-office React **non ha uno strumento proprio** — è un **brick di
estensione** che inietta due elementi nello strumento **Orders** quando il modulo è attivo:

- una scheda **Invoices** nell'editor dell'ordine — elenca le fatture, **Regenerate Invoice** e scarica
  qualsiasi fattura elencata;
- un pulsante di **download** per riga nell'elenco Orders che recupera l'ultimo PDF di fattura
  dell'ordine.

Se non li vedi, verifica che `melis-commerce-order-invoice` sia attivo e che il tuo ruolo abbia il
diritto **Invoices** di Orders. Vedi il
[riferimento del modulo melis-commerce-order-invoice](/it/reference/modules/melis-commerce-order-invoice).

## File chiave

| Ambito | Percorso |
| --- | --- |
| Servizi | `vendor/melisplatform/melis-commerce/src/Service/` |
| Entità | `vendor/melisplatform/melis-commerce/src/Entity/` |
| Schema | `vendor/melisplatform/melis-commerce/install/sql/setup_structure.sql` |
| Plugin front | `vendor/melisplatform/melis-commerce/src/Controller/Plugin/` |
| Bricks e API React | `vendor/melisplatform/melis-commerce/ui-react/`, `config/react-api.php`, `src/Controller/ReactApi/` |
| Fatturazione | `vendor/melisplatform/melis-commerce-order-invoice/` |
