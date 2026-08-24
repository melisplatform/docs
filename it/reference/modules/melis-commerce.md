# MelisCommerce

> Framework e-commerce completo per MelisPlatform — catalogo, clienti, carrello/checkout/ordini, coupon, spedizioni e SEO — con un back-office React. Pacchetto `melisplatform/melis-commerce`.

## Scopo

MelisCommerce aggiunge un livello commerce completo a un sito Melis: un catalogo (prodotti, varianti,
attributi, categorie, prezzi, giacenze), un modello cliente B2B (account + contatti), la pipeline
carrello/checkout/ordine, coupon, valute, spedizioni, resi, documenti e SEO. Include una suite di
gestione back-office e uno shop front-office costruito con plugin di templating trascinabili. Il
livello dati utilizza **59 tabelle `melis_ecom_*`**, **26 servizi**, **10 entità ricche** e **33
listener**; l'accesso ai dati usa Eloquent (`illuminate/database` incluso), incapsulato da servizi
event-driven in stile Melis.

In Melis v6 la logica di business è invariata; il **livello di visualizzazione** è un **back-office
React** (`/melis-react`). MelisCommerce include **un unico bundle multi-brick** che espone **13
strumenti React nativi**, ciascuno supportato da endpoint JSON sotto `/melis/react-api/…`. Ogni
strumento mantiene un toggle **New / Old** per strumento, così puoi tornare alla classica schermata
legacy in un iframe.

## Attivazione

Aggiungi a `config/melis.module.load.php`:

```php
return [
    'MelisCommerce',
];
```

Richiede `melisplatform/melis-core`. Le tabelle del database vengono predisposte automaticamente da
MelisDbDeploy (delta sotto `install/dbdeploy/`); il modulo è proposto dall'installer di Melis come
componente opzionale. Gli strumenti React compaiono nel back-office solo quando MelisCommerce è
attivo (discovery tramite `GET /melis/react-api/react-modules`).

## Il back-office React — un bundle, tredici strumenti

Il bundle (`public/ui-react/brick.js` + `brick.manifest.json`) dichiara 13 strumenti che si
auto-registrano in `brick.tsx`. Tutti sono full-React nativi; ciascuno renderizza un `ViewModeToggle`
condiviso + `LegacyFrame`, così *Old* monta lo strumento classico in un iframe
(`/melis/react-tool-page?key=<melisKey>`). I sette strumenti "entità" impostano `subTabs: true`
(l'apertura di un record aggiunge una sotto-scheda); tutti e 13 sono `persistent`.

![La sezione MelisCommerce nella sidebar React — i 13 strumenti commerce](/screenshots/react/melis-commerce/meliscommerce-menu-tools-selector.png)

| Brick id | Rotta | Etichetta | melisKey |
| --- | --- | --- | --- |
| `commerce-accounts` | `/melis-commerce/clients-list` | Account | `meliscommerce_clients_list_page` |
| `commerce-contacts` | `/melis-commerce/contact-list` | Contatti | `meliscommerce_contact_list_page` |
| `commerce-catalog` | `/melis-commerce/categories` | Cataloghi | `meliscommerce_categories_page` |
| `commerce-products` | `/melis-commerce/product-list` | Prodotti | `meliscommerce_product_list_container` |
| `commerce-orders` | `/melis-commerce/order-list` | Ordini | `meliscommerce_order_list_page` |
| `commerce-coupons` | `/melis-commerce/coupon-list` | Coupon | `meliscommerce_coupon_list_page` |
| `commerce-attributes` | `/melis-commerce/attribute-list` | Attributi | `meliscommerce_attribute_list_page` |
| `commerce-countries` | `/melis-commerce/country-list` | Paesi | `meliscommerce_country_list_container` |
| `commerce-languages` | `/melis-commerce/language-list` | Lingue commerce | `meliscommerce_language_list_container` |
| `commerce-currencies` | `/melis-commerce/currency-lists` | Valute | `meliscommerce_currency_conf` |
| `commerce-order-status` | `/melis-commerce/order-status-lists` | Stato ordine | `meliscommerce_order_status_tool_page` |
| `commerce-clients-groups` | `/melis-commerce/clients-group-list` | Gruppi clienti | `meliscommerce_clients_group_tool_container` |
| `commerce-settings` | `/melis-commerce/settings` | Impostazioni commerce | `meliscommerce_settings_page` |

> **Regola pratica:** costruisci il **catalogo** (attributi → cataloghi → prodotti/varianti),
> gestisci i **clienti** (account + contatti), poi esegui la pipeline **ordini** (ordini + wizard di
> checkout + coupon), il tutto supportato dalle liste di riferimento commerce.

## Modello a oggetti

| Concetto | Cos'è |
| --- | --- |
| **Prodotto** | Un contenitore di varianti — non è di per sé un'unità vendibile. |
| **Variante** | L'unità vendibile: ha il proprio SKU, giacenza e prezzo. Un prodotto senza opzioni reali ha comunque una variante principale. |
| **Attributo** | Una proprietà filtrabile/definente la variante (es. Colore, Taglia) con valori tipizzati e traducibili. I prodotti dichiarano quali attributi usano; ogni variante sceglie un valore per attributo. |
| **Prezzo** | Risolto per una coppia `(countryId, groupId)` con IVA; ripiega in modo graduale (vedi [Risoluzione dei prezzi](#risoluzione-di-prezzi-e-giacenze)). |
| **Account** | Un'organizzazione B2B (`melis_ecom_client`); ha un record azienda, un gruppo e indirizzi. |
| **Contatto / Persona** | Un individuo (`melis_ecom_client_person`) che effettua il login; può appartenere a più account. |
| **Carrello (Basket)** | Anonimo (identificato da `clientKey`) o persistente (legato a un account); si fondono al login. |
| **Ordine** | Creato allo stato `-1` (temporaneo) durante il checkout; passa a `1` (Nuovo ordine) dopo il pagamento. |

## Account e contatti

**Account** (`/melis-commerce/clients-list`) gestisce i clienti B2B: la lista offre ricerca, filtri
per stato/gruppo, un gestore delle colonne, esportazione e **importazione** CSV. L'apertura di un
account è una sotto-scheda con le schede **Properties**, **Company**, **Contacts** (collega/scollega,
imposta predefinito), **Addresses**, **Orders** (storico) e **Files**.

![La lista Account — filtri, gestore delle colonne e importazione CSV](/screenshots/react/melis-commerce/meliscommerce-tools-accounts-list.png)

![Editor account — scheda Properties (stato, strategia del nome, gruppo, paese, tag)](/screenshots/react/melis-commerce/meliscommerce-tools-accounts-new-tab-properties.png)

![Editor account — scheda Contacts (collega / scollega / predefinito)](/screenshots/react/melis-commerce/meliscommerce-tools-accounts-new-tab-contacts.png)

**Contatti** (`/melis-commerce/contact-list`) gestisce le persone individuali. L'editor ha le schede
**Information**, **Address** e **Association** (collega/scollega un contatto agli account, imposta il
predefinito). I contatti sono supportati da `MelisComContactService`; gli account da
`MelisComClientService`.

![Editor contatto — scheda Association (collega / scollega account)](/screenshots/react/melis-commerce/meliscommerce-tools-contacts-edit-tab-association.png)

## Cataloghi, prodotti e varianti

**Cataloghi** (`/melis-commerce/categories`) è un **albero** di categorie riordinabile tramite
trascinamento; una categoria ha le schede **Properties**, **SEO** e **Products** (riordinabile).

![L'albero delle categorie del catalogo (React)](/screenshots/react/melis-commerce/meliscommerce-tools-catalogs-treeview.png)

**Prodotti** (`/melis-commerce/product-list`) elenca i prodotti con filtri, duplicazione ed
esportazione. L'editor prodotto ha le schede **Properties**, **Text** (per lingua), **Variants**,
**SEO** e **Prices**. La scheda **Variants** è la più ricca: ogni variante ha le proprie Properties,
SEO, Prices, Stocks e Associations, oltre ai media.

![La lista Prodotti (React)](/screenshots/react/melis-commerce/meliscommerce-tools-products-list.png)

![Editor prodotto — scheda Variants (prezzi, giacenze, SEO, associazioni per variante)](/screenshots/react/melis-commerce/meliscommerce-tools-products-edit-tab-variants.png)

![Editor prodotto — scheda Prices](/screenshots/react/melis-commerce/meliscommerce-tools-products-edit-tab-prices.png)

**Attributi** (`/melis-commerce/attribute-list`) gestisce le caratteristiche tipizzate dei prodotti:
schede dell'editor **Properties** (riferimento, tipo, stato, visibile, ricercabile), **Labels** (per
lingua) e **Values** (valori con traduzioni tipizzate).

![Editor attributo — scheda Values (valori con traduzioni tipizzate)](/screenshots/react/melis-commerce/meliscommerce-tools-attributes-edit-tab-values.png)

## Ordini e il wizard di checkout

**Ordini** (`/melis-commerce/order-list`) ha filtri per stato ed esportazione. Le schede dell'editor
per ordine sono **Properties**, **Basket** (sola lettura), **Addresses**, **Payment** (sola lettura),
**Shipping**, **Messages** e **Returns** — più **Invoices** quando
[MelisCommerceOrderInvoice](/it/reference/modules/melis-commerce-order-invoice) è attivo.

![La lista Ordini (React)](/screenshots/react/melis-commerce/meliscommerce-tools-order-list.png)

![Editor ordine — scheda Properties](/screenshots/react/melis-commerce/meliscommerce-tools-order-edit-tab-properties.png)

**New Order** apre un **wizard di checkout guidato in 7 passaggi**
(`contact → account → products → addresses → summary → payment → confirmation`), supportato da una
sessione di checkout lato server (endpoint sotto `/orders/checkout/*`) che riprende da dove avevi
interrotto.

![Il wizard di checkout New Order — passaggi contact / account / products](/screenshots/react/melis-commerce/meliscommerce-tools-order-newordertunnel-1.png)

![Il wizard di checkout — passaggio addresses / summary](/screenshots/react/melis-commerce/meliscommerce-tools-order-newordertunnel-2.png)

## Coupon

**Coupon** (`/melis-commerce/coupon-list`) gestisce i codici sconto (% o importo). Schede dell'editor:
**Properties**, **Assign account** (clienti), **Assign product** e **Orders** (storico di utilizzo).
Supportato da `MelisComCouponService`; lo sconto integrato è a sua volta un listener su
`meliscommerce_service_get_item_price_end`.

![Editor coupon — scheda Assign account](/screenshots/react/melis-commerce/meliscommerce-tools-coupons-edit-tab-assignedclients.png)

## Strumenti di riferimento commerce

Piccoli strumenti in "stile impostazioni" — liste su singola pagina con modali di aggiunta/modifica o
un unico form:

| Strumento | Rotta | Gestisce |
| --- | --- | --- |
| Countries | `/melis-commerce/country-list` | Lista dei paesi commerce (aggiungi/modifica) |
| Commerce languages | `/melis-commerce/language-list` | Lingue commerce (lista + modale) |
| Currencies | `/melis-commerce/currency-lists` | Valute (lista + modale, **imposta predefinita**) |
| Order status | `/melis-commerce/order-status-lists` | Stati; l'editor ha Properties (colore) + Labels |
| Client's groups | `/melis-commerce/clients-group-list` | Gruppi clienti (lista + modale) |
| Commerce settings | `/melis-commerce/settings` | Pagina di configurazione unica — schede Properties + Accounts |

![La lista Order status (React)](/screenshots/react/melis-commerce/meliscommerce-tools-orderstatus-list.png)

![Impostazioni commerce — scheda Properties (soglia di allerta giacenze, strategia del nome account)](/screenshots/react/melis-commerce/meliscommerce-tools-settings-tab-properties.png)

Le impostazioni commerce contengono la soglia globale di allerta giacenze e la strategia del nome
account (`sa_type`).

## Servizi principali

Tutti i servizi estendono `MelisComGeneralService` e sono registrati in `config/module.config.php`.
Ogni metodo pubblico è incapsulato in eventi `meliscommerce_service_*_start` / `*_end` (vedi
[Eventi e listener](#eventi-e-listener)). I controller React validano solo l'input e formattano il
JSON — il lavoro vero resta in questi servizi.

| Alias del servizio | Ruolo |
| --- | --- |
| `MelisComProductService` | `getProductById`, `getProductList` → `MelisProduct` |
| `MelisComVariantService` | `getVariantById`, `getVariantListByProductId`, `getVariantBySKU`, `getMainVariantByProductId` → `MelisVariant` |
| `MelisComCategoryService` | `getCategoryById`, `getCategoryListById(Recursive)` → `MelisCategory` |
| `MelisComAttributeService` | `getAttributeById`, `getAttributes` → `MelisAttribute` |
| `MelisComPriceService` | `getItemPrice($itemId, $countryId, $groupId, $type)` — prezzo con gerarchia di fallback |
| `MelisComProductSearchService` | Ricerca prodotti front-office |
| `MelisComSeoService` | SEO commerce (URL / meta per prodotti e categorie) |
| `MelisComClientService` | `getClientById`, `getClientList`, `getClientByIdAndClientPerson` → `MelisClient` |
| `MelisComContactService` | Gestione contatti (persone) |
| `MelisComClientGroupsService` | Gruppi clienti (usati per il pricing specifico per gruppo) |
| `MelisComAuthenticationService` | Login front-office: `login`, `getClientId`, `getPersonId`, `getClientGroup`, `setClientId`, `logout`, `hasIdentity` |
| `MelisComBasketService` | `getBasket`, `getPersistentBasket`, `getAnonymousBasket`, `addVariantToBasket`, `transferAnonymousBasketToPersistentBasket` → `MelisBasket` |
| `MelisComOrderService` | `getOrderById`, `getOrderList` → `MelisOrder` |
| `MelisComOrderCheckoutService` | Checkout in due fasi: `checkoutStep1_prePayment`, `checkoutStep2_postPayment` |
| `MelisComPostPaymentService` | Registrazione delle transazioni post-pagamento |
| `MelisComOrderProductReturnService` | Resi prodotti / RMA |
| `MelisComCouponService` | `getCouponById`, `getCouponList` → `MelisCoupon` |
| `MelisComCurrencyService` | Valute |
| `MelisComShipmentCostService` | Calcolo del costo di spedizione |
| `MelisComStockEmailAlertService` | Avvisi email per giacenze basse (`VARIANTSLOWSTOCK`) |
| `MelisComDocumentService` | `getDocumentById`, `getDocumentsByRelation` → `MelisDocument` |
| `MelisComDuplicationService` | Duplica prodotti / varianti |
| `MelisComLinksService` | Costruttore di link commerce front-office |
| `MelisComCacheService` | Cache commerce (`commerce_big_services`) |
| `MelisComHead` | Helper per l'head SEO (`updateTitleAndDescription`) |
| `MelisComGeneralService` | Classe base; helper: `getTableColumns`, `getEcomLang`, `getFrontPluginLangId` |

## Risoluzione di prezzi e giacenze

`MelisComPriceService::getItemPrice($itemId, $countryId, $groupId, $type)` percorre una catena di
fallback:

1. paese specifico + gruppo specifico
2. paese specifico + gruppo generale
3. paese generale (`price_country_id = 0`) + gruppo specifico
4. paese generale + gruppo generale
5. (per una variante) ripiega sul prezzo del **prodotto**

La giacenza è per **variante per paese** (`melis_ecom_variant_stock`). Quando un ordine porta la
giacenza sotto la soglia, l'email `VARIANTSLOWSTOCK` viene inviata ai destinatari configurati.

## Pipeline di checkout

Due fasi in `MelisComOrderCheckoutService` (il wizard React esegue la stessa logica lato server):

**Fase 1 — `checkoutStep1_prePayment($clientId)`** valida carrello e indirizzi, calcola tutti i
costi e la spedizione, genera il riferimento dell'ordine, poi chiama
`MelisComOrderService::saveOrder()`. L'ordine viene salvato con `ord_status = -1` (temporaneo). Emette
`meliscommerce_service_checkout_step1_prepayment_start/_end` e `…_save_success` (che trasporta il
nuovo `orderId`).

**Fase 2 — `checkoutStep2_postPayment()`** viene chiamata dopo il ritorno dal gateway.
`MelisComPostPaymentService::processPostPayment()` registra la transazione in
`melis_ecom_order_payment` e sposta l'ordine dallo stato `-1` a uno stato reale. Emette
`meliscommerce_service_checkout_step2_postpayment_start/_end`.

**Stati dell'ordine:** `-1` temporaneo · `1` Nuovo ordine · `2` In attesa · `3` Spedito ·
`4` Consegnato · `5` Annullato · `6` Errore di pagamento.

## Eventi e listener

Ogni metodo di servizio emette eventi `meliscommerce_service_*_start` e `*_end`. Gli argomenti nominati
(costruiti da `makeArrayFromParameters` tramite reflection) e la chiave `results` viaggiano con
l'evento.

- Listener `_start`: modifica gli input prima che il lavoro venga eseguito.
- Listener `_end`: modifica `$params['results']` prima che il chiamante lo veda.

Questo è il principale meccanismo di estensione — nessuna sottoclasse necessaria. I 33 listener inclusi
si dividono in quattro famiglie:

| Famiglia | Esempi |
| --- | --- |
| Salvataggio / validazione | `…SaveProductListener`, `…SaveOrderListener`, `…SaveClientListener`, `…ValidateVariantListener` |
| Pulizia a cascata (paese/lingua rimossi) | `…ProductPriceCountryDeletedListener`, `…CategoryCountryLink…`, `…SEOLanguageDeletedListener` |
| Checkout / pricing / giacenze | `…CheckoutCouponListener`, `…CouponProductPriceListener`, `…ShipmentCostListener`, `…PostPaymentListener`, `…VariantCheckLowStockListener` |
| Routing SEO front-office | `…SEOReformatToRoutePageUrlListener`, `…SEODispatchRouterCommerceUrlListener`, `…SEOMetaPageListener` |

## API React e capability

Tutte le rotte sono rotte figlie di `melis-react-api` (unite da `config/react-api.php`): **13
controller invocabili** in `src/Controller/ReactApi/`, **184 rotte** sotto `/melis/react-api/…`.
Il contratto di risposta è ovunque `{ success, data, error? }`; ogni azione chiama prima
`denyUnlessAccess()` (auth + `MelisCoreRights::canAccess(<melisKey>)`, 401/403). Ogni strumento
entità espone all'incirca `GET /<tool>` (lista keyset), `/<tool>/stats`, `/<tool>/options`,
`POST /<tool>/save`, `DELETE /<tool>/delete/:id`, `GET /<tool>/:id`, oltre a sotto-risorse
specifiche dello strumento (es. Orders aggiunge il wizard completo `/orders/checkout/*`).

> ⚠ Le lingue commerce sono nel namespace `/commerce-languages` (non `/languages`) perché lo
> strumento Languages del core possiede già `/languages` sotto il genitore condiviso `melis-react-api`.

`config/react.capabilities.php` dichiara una voce `melisReactToolCapabilities` per strumento,
indicizzata sotto la sua melisKey. Sono **suggerimenti UI dichiarativi con default-allow** — pilotano
l'albero di checkbox in Users → Rights e permettono a React di mascherare schede/pulsanti tramite
`useCaps(...)` — ma **non esiste ancora un `denyUnlessCan()` lato server**; solo `denyUnlessAccess()`
sulla melisKey dello strumento protegge l'API. Tratta le capability come suggerimenti UI, non come
sicurezza.

## Front office

I plugin di templating sono registrati sotto `config/plugins/{products,categories,clients,orders}/` e
come `controller_plugins` in `module.config.php`. Trascinali in una zona drag-drop di una pagina CMS.

| Area | Plugin |
| --- | --- |
| Catalogo | `ProductShowPlugin`, `ProductListPlugin`, `ProductSearchPlugin`, `CategoryTreePlugin`, `CategoryProductListPlugin`, `RelatedProductsPlugin`, `AttributesShowPlugin`, `ProductAttributePlugin`, `ProductPriceRangePlugin` |
| Carrello e checkout | `AddToCartPlugin`, `CartPlugin`, `CheckoutPlugin`, `CheckoutCartPlugin`, `CheckoutAddressesPlugin`, `CheckoutCouponPlugin`, `CheckoutSummaryPlugin`, `CheckoutConfirmSummaryPlugin`, `CheckoutConfirmPlugin` |
| Account | `LoginPlugin`, `RegisterPlugin`, `AccountPlugin`, `ProfilePlugin`, `BillingAddressPlugin`, `DeliveryAddressPlugin`, `LostPasswordGetEmailPlugin`, `LostPasswordResetPlugin` |
| Ordini (cliente) | `OrderPlugin`, `OrderHistoryPlugin`, `OrderMessagesPlugin`, `OrderShippingDetailsPlugin`, `OrderReturnProductPlugin`, `OrderAddressPlugin` |

## Tabelle del database

59 tabelle con il prefisso `melis_ecom_*`, raggruppate per sottosistema:

| Gruppo | Tabelle principali |
| --- | --- |
| Prodotti e varianti | `melis_ecom_product`, `melis_ecom_product_text` + `_text_type`, `melis_ecom_product_attribute`, `melis_ecom_product_category`, `melis_ecom_variant`, `melis_ecom_variant_attribute_value`, `melis_ecom_variant_stock`, `melis_ecom_assoc_variant` + `_type` |
| Attributi | `melis_ecom_attribute` + `_trans`, `melis_ecom_attribute_type`, `melis_ecom_attribute_value` + `_value_trans` |
| Categorie e geo | `melis_ecom_category` + `_trans`, `melis_ecom_country_category`, `melis_ecom_country`, `melis_ecom_lang` |
| Prezzi e valuta | `melis_ecom_price`, `melis_ecom_currency` |
| Clienti (B2B) | `melis_ecom_client`, `melis_ecom_client_person` + `_person_emails`, `melis_ecom_client_company`, `melis_ecom_client_account_rel`, `melis_ecom_client_person_rel`, `melis_ecom_client_address` + `_address_type`, `melis_ecom_client_groups`, `melis_ecom_civility`, `melis_ecom_settings_account` |
| Carrelli e ordini | `melis_ecom_basket_anonymous`, `melis_ecom_basket_persistent`, `melis_ecom_order`, `melis_ecom_order_basket`, `melis_ecom_order_address`, `melis_ecom_order_payment` + `_type`, `melis_ecom_order_shipping`, `melis_ecom_order_message`, `melis_ecom_order_status` + `_trans`, `melis_ecom_order_product_return` + `_details` |
| Coupon | `melis_ecom_coupon` + `_coupon_client` / `_coupon_order` / `_coupon_product` |
| Documenti e SEO | `melis_ecom_document` + `_doc_type` + `_doc_relations`, `melis_ecom_seo`, `melis_ecom_stock_email_alert` |

## Esempi

**Leggere un prodotto, la sua variante principale e un prezzo risolto**

```php
$prdSrv   = $sm->get('MelisComProductService');
$varSrv   = $sm->get('MelisComVariantService');
$priceSrv = $sm->get('MelisComPriceService');

$product = $prdSrv->getProductById($prdId, $langId, $countryId);  // → MelisProduct
$variant = $varSrv->getMainVariantByProductId($prdId, $langId, $countryId);  // → MelisVariant
$price   = $priceSrv->getItemPrice($variant->getId(), $countryId, $groupId, 'variant');
// $price['price'] (net), $price['price_currency'], $price['price_details']
```

**Aggiungere al carrello ed eseguire il checkout in due fasi**

```php
$basketSrv   = $sm->get('MelisComBasketService');
$checkoutSrv = $sm->get('MelisComOrderCheckoutService');

$basketSrv->addVariantToBasket($variantId, 1, $clientId);
$basketSrv->transferAnonymousBasketToPersistentBasket($clientKey, $clientId);

$step1 = $checkoutSrv->checkoutStep1_prePayment($clientId);  // order at status -1
// $step1['orderId'] — hand to payment gateway
$step2 = $checkoutSrv->checkoutStep2_postPayment();          // records payment, moves off -1
```

**Agganciare lo shop senza creare sottoclassi**

```php
// _start → mutate inputs; _end → mutate $params['results'].
$this->attachEventListener(
    $events, '*', 'meliscommerce_service_get_item_price_end',
    function ($e) {
        $params = $e->getParams();
        $price  = $params['results'];
        // modify $price, then:
        $params['results'] = $price;
        return $params;
    }
);
```

## File principali

| Ambito | Percorso |
| --- | --- |
| Configurazione del modulo (servizi, controller, plugin) | `vendor/melisplatform/melis-commerce/config/module.config.php` |
| Rotte / capability API React | `vendor/melisplatform/melis-commerce/config/react-api.php`, `config/react.capabilities.php` |
| Brick React (sorgente / build) | `vendor/melisplatform/melis-commerce/ui-react/src/`, `public/ui-react/{brick.js, brick.manifest.json}` |
| Controller API React (13) | `vendor/melisplatform/melis-commerce/src/Controller/ReactApi/` |
| Configurazione plugin front-office | `vendor/melisplatform/melis-commerce/config/plugins/` |
| Servizi / Entità (10) / Table gateway (59) | `vendor/melisplatform/melis-commerce/src/Service/`, `src/Entity/`, `src/Model/Tables/` |
| Listener (33) | `vendor/melisplatform/melis-commerce/src/Listener/` |
| Delta DB | `vendor/melisplatform/melis-commerce/install/dbdeploy/` |

Vedi anche: [Riferimento moduli](/it/reference/modules) · [melis-react-api](/it/reference/modules/melis-react-api) · [melis-commerce-order-invoice](/it/reference/modules/melis-commerce-order-invoice) · [melis-core](/legacy/reference/modules/melis-core) · [melis-cms](/it/reference/modules/melis-cms).
