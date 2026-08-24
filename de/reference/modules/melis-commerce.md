# MelisCommerce

> Vollständiges E-Commerce-Framework für MelisPlatform — Katalog, Kunden, Warenkorb/Checkout/Bestellungen, Gutscheine, Versand und SEO — mit einem React-Backoffice. Paket `melisplatform/melis-commerce`.

## Zweck

MelisCommerce fügt einer Melis-Website eine vollständige Commerce-Schicht hinzu: einen Katalog (Produkte, Varianten,
Attribute, Kategorien, Preise, Lagerbestand), ein B2B-Kundenmodell (Konten + Kontakte), die
Warenkorb-/Checkout-/Bestell-Pipeline, Gutscheine, Währungen, Versand, Retouren, Dokumente und SEO. Es liefert eine
Backoffice-Verwaltungssuite und einen Frontoffice-Shop, der aus per Drag-and-drop einsetzbaren Templating-Plugins aufgebaut ist. Die
Datenschicht nutzt **59 `melis_ecom_*`-Tabellen**, **26 Services**, **10 umfangreiche Entities** und **33
Listener**; der Datenzugriff erfolgt über Eloquent (mitgeliefertes `illuminate/database`), gekapselt durch ereignisgesteuerte Services im Melis-Stil.

In Melis v6 ist die Geschäftslogik unverändert; die **Darstellungsschicht** ist ein **React-Backoffice**
(`/melis-react`). MelisCommerce liefert **ein Multi-Brick-Bundle**, das **13 native React-Tools** bereitstellt,
die jeweils durch JSON-Endpunkte unter `/melis/react-api/…` gestützt werden. Jedes Tool behält einen tool-spezifischen **New / Old**-Umschalter, sodass Sie auf den klassischen Legacy-Bildschirm in einem iframe zurückgreifen können.

## Aktivierung

Fügen Sie in `config/melis.module.load.php` hinzu:

```php
return [
    'MelisCommerce',
];
```

Erfordert `melisplatform/melis-core`. Die Datenbanktabellen werden automatisch von MelisDbDeploy
bereitgestellt (Deltas unter `install/dbdeploy/`); das Modul wird vom Melis-Installer als optionale
Komponente angeboten. Die React-Tools erscheinen im Backoffice nur, wenn MelisCommerce aktiv ist (Discovery über
`GET /melis/react-api/react-modules`).

## Das React-Backoffice — ein Bundle, dreizehn Tools

Das Bundle (`public/ui-react/brick.js` + `brick.manifest.json`) deklariert 13 Tools, die sich in `brick.tsx` selbst registrieren.
Alle sind nativ voll in React umgesetzt; jedes rendert ein gemeinsames `ViewModeToggle` + `LegacyFrame`, sodass
*Old* das klassische Tool in einem iframe einbindet (`/melis/react-tool-page?key=<melisKey>`). Die sieben
„Entity"-Tools setzen `subTabs: true` (das Öffnen eines Datensatzes fügt einen Untertab hinzu); alle 13 sind `persistent`.

![Der MelisCommerce-Bereich in der React-Seitenleiste — die 13 Commerce-Tools](/screenshots/react/melis-commerce/meliscommerce-menu-tools-selector.png)

| Brick-ID | Route | Label | melisKey |
| --- | --- | --- | --- |
| `commerce-accounts` | `/melis-commerce/clients-list` | Accounts | `meliscommerce_clients_list_page` |
| `commerce-contacts` | `/melis-commerce/contact-list` | Contacts | `meliscommerce_contact_list_page` |
| `commerce-catalog` | `/melis-commerce/categories` | Catalogs | `meliscommerce_categories_page` |
| `commerce-products` | `/melis-commerce/product-list` | Products | `meliscommerce_product_list_container` |
| `commerce-orders` | `/melis-commerce/order-list` | Orders | `meliscommerce_order_list_page` |
| `commerce-coupons` | `/melis-commerce/coupon-list` | Coupons | `meliscommerce_coupon_list_page` |
| `commerce-attributes` | `/melis-commerce/attribute-list` | Attributes | `meliscommerce_attribute_list_page` |
| `commerce-countries` | `/melis-commerce/country-list` | Countries | `meliscommerce_country_list_container` |
| `commerce-languages` | `/melis-commerce/language-list` | Commerce languages | `meliscommerce_language_list_container` |
| `commerce-currencies` | `/melis-commerce/currency-lists` | Currencies | `meliscommerce_currency_conf` |
| `commerce-order-status` | `/melis-commerce/order-status-lists` | Order status | `meliscommerce_order_status_tool_page` |
| `commerce-clients-groups` | `/melis-commerce/clients-group-list` | Client's groups | `meliscommerce_clients_group_tool_container` |
| `commerce-settings` | `/melis-commerce/settings` | Commerce settings | `meliscommerce_settings_page` |

> **Faustregel:** Bauen Sie den **Katalog** auf (Attribute → Kataloge → Produkte/Varianten), verwalten Sie
> **Kunden** (Konten + Kontakte) und betreiben Sie dann die **Bestell**-Pipeline (Bestellungen + Checkout-Assistent +
> Gutscheine), alles gestützt auf die Commerce-Referenzlisten.

## Objektmodell

| Konzept | Was es ist |
| --- | --- |
| **Product** | Ein Container für Varianten — selbst keine verkäufliche Einheit. |
| **Variant** | Die verkäufliche Einheit: hat eine eigene SKU, einen eigenen Lagerbestand und Preis. Ein Produkt ohne echte Optionen hat dennoch eine Hauptvariante. |
| **Attribute** | Eine filterbare/variantendefinierende Eigenschaft (z. B. Farbe, Größe) mit typisierten, übersetzbaren Werten. Produkte deklarieren, welche Attribute sie verwenden; jede Variante wählt einen Wert pro Attribut. |
| **Price** | Aufgelöst für ein Paar `(countryId, groupId)` mit Mehrwertsteuer; greift stufenweise zurück (siehe [Preis-Auflösung](#preis--und-bestandsauflosung)). |
| **Account** | Eine B2B-Organisation (`melis_ecom_client`); besitzt einen Firmendatensatz, eine Gruppe und Adressen. |
| **Contact / Person** | Eine Einzelperson (`melis_ecom_client_person`), die sich anmeldet; kann mehreren Konten angehören. |
| **Basket** | Anonym (per `clientKey` verschlüsselt) oder persistent (an ein Konto gebunden); wird beim Anmelden zusammengeführt. |
| **Order** | Wird während des Checkouts mit Status `-1` (temporär) angelegt; wechselt nach der Zahlung zu `1` (Neue Bestellung). |

## Konten & Kontakte

**Accounts** (`/melis-commerce/clients-list`) verwaltet B2B-Kunden: Die Liste bietet Suche,
Status-/Gruppenfilter, einen Spaltenmanager, Export und CSV-**Import**. Das Öffnen eines Kontos ist ein Untertab
mit den Tabs **Properties**, **Company**, **Contacts** (verknüpfen/trennen, Standard festlegen), **Addresses**, **Orders**
(Verlauf) und **Files**.

![Die Accounts-Liste — Filter, Spaltenmanager und CSV-Import](/screenshots/react/melis-commerce/meliscommerce-tools-accounts-list.png)

![Konto-Editor — Tab „Properties" (Status, Namensstrategie, Gruppe, Land, Tags)](/screenshots/react/melis-commerce/meliscommerce-tools-accounts-new-tab-properties.png)

![Konto-Editor — Tab „Contacts" (verknüpfen / trennen / Standard)](/screenshots/react/melis-commerce/meliscommerce-tools-accounts-new-tab-contacts.png)

**Contacts** (`/melis-commerce/contact-list`) verwaltet einzelne Personen. Der Editor hat die Tabs
**Information**, **Address** und **Association** (einen Kontakt mit Konten verknüpfen/trennen, den
Standard festlegen). Kontakte werden durch `MelisComContactService` gestützt; Konten durch `MelisComClientService`.

![Kontakt-Editor — Tab „Association" (Konten verknüpfen / trennen)](/screenshots/react/melis-commerce/meliscommerce-tools-contacts-edit-tab-association.png)

## Kataloge, Produkte & Varianten

**Catalogs** (`/melis-commerce/categories`) ist ein per Drag-and-drop umsortierbarer **Baum** von Kategorien; eine Kategorie
hat die Tabs **Properties**, **SEO** und **Products** (umsortierbar).

![Der Katalog-Kategoriebaum (React)](/screenshots/react/melis-commerce/meliscommerce-tools-catalogs-treeview.png)

**Products** (`/melis-commerce/product-list`) listet Produkte mit Filtern, Duplizieren und Export auf. Der
Produkt-Editor hat die Tabs **Properties**, **Text** (pro Sprache), **Variants**, **SEO** und **Prices**.
Der Tab **Variants** ist der umfangreichste: Jede Variante hat ihre eigenen Properties, SEO, Prices, Stocks
und Associations sowie Medien.

![Die Products-Liste (React)](/screenshots/react/melis-commerce/meliscommerce-tools-products-list.png)

![Produkt-Editor — Tab „Variants" (Preise, Bestände, SEO, Associations pro Variante)](/screenshots/react/melis-commerce/meliscommerce-tools-products-edit-tab-variants.png)

![Produkt-Editor — Tab „Prices"](/screenshots/react/melis-commerce/meliscommerce-tools-products-edit-tab-prices.png)

**Attributes** (`/melis-commerce/attribute-list`) verwaltet typisierte Produkteigenschaften: Editor-Tabs
**Properties** (Referenz, Typ, Status, sichtbar, durchsuchbar), **Labels** (pro Sprache) und
**Values** (Werte mit typisierten Übersetzungen).

![Attribut-Editor — Tab „Values" (Werte mit typisierten Übersetzungen)](/screenshots/react/melis-commerce/meliscommerce-tools-attributes-edit-tab-values.png)

## Bestellungen & der Checkout-Assistent

**Orders** (`/melis-commerce/order-list`) verfügt über Statusfilter und Export. Die Editor-Tabs pro Bestellung
sind **Properties**, **Basket** (schreibgeschützt), **Addresses**, **Payment** (schreibgeschützt), **Shipping**,
**Messages** und **Returns** — sowie **Invoices**, wenn
[MelisCommerceOrderInvoice](/de/reference/modules/melis-commerce-order-invoice) aktiv ist.

![Die Orders-Liste (React)](/screenshots/react/melis-commerce/meliscommerce-tools-order-list.png)

![Bestell-Editor — Tab „Properties"](/screenshots/react/melis-commerce/meliscommerce-tools-order-edit-tab-properties.png)

**New Order** öffnet einen geführten **7-Schritte-Checkout-Assistenten**
(`contact → account → products → addresses → summary → payment → confirmation`), gestützt auf eine
serverseitige Checkout-Session (Endpunkte unter `/orders/checkout/*`), die dort fortsetzt, wo Sie aufgehört haben.

![Der New-Order-Checkout-Assistent — Schritte contact / account / products](/screenshots/react/melis-commerce/meliscommerce-tools-order-newordertunnel-1.png)

![Der Checkout-Assistent — Schritt addresses / summary](/screenshots/react/melis-commerce/meliscommerce-tools-order-newordertunnel-2.png)

## Gutscheine

**Coupons** (`/melis-commerce/coupon-list`) verwaltet Rabattcodes (% oder Betrag). Editor-Tabs:
**Properties**, **Assign account** (Kunden), **Assign product** und **Orders** (Nutzungsverlauf).
Gestützt durch `MelisComCouponService`; der eingebaute Rabatt ist selbst ein Listener auf
`meliscommerce_service_get_item_price_end`.

![Gutschein-Editor — Tab „Assign account"](/screenshots/react/melis-commerce/meliscommerce-tools-coupons-edit-tab-assignedclients.png)

## Commerce-Referenztools

Kleine „einstellungsartige" Tools — einseitige Listen mit Hinzufügen-/Bearbeiten-Modalen oder einem einzelnen Formular:

| Tool | Route | Verwaltet |
| --- | --- | --- |
| Countries | `/melis-commerce/country-list` | Commerce-Länderliste (hinzufügen/bearbeiten) |
| Commerce languages | `/melis-commerce/language-list` | Commerce-Sprachen (Liste + Modal) |
| Currencies | `/melis-commerce/currency-lists` | Währungen (Liste + Modal, **Standard festlegen**) |
| Order status | `/melis-commerce/order-status-lists` | Status; Editor hat Properties (Farbe) + Labels |
| Client's groups | `/melis-commerce/clients-group-list` | Kundengruppen (Liste + Modal) |
| Commerce settings | `/melis-commerce/settings` | Einzelne Konfigurationsseite — Tabs Properties + Accounts |

![Die Order-status-Liste (React)](/screenshots/react/melis-commerce/meliscommerce-tools-orderstatus-list.png)

![Commerce settings — Tab „Properties" (Schwellenwert für Bestandswarnung, Strategie für Kontonamen)](/screenshots/react/melis-commerce/meliscommerce-tools-settings-tab-properties.png)

Die Commerce settings enthalten den globalen Schwellenwert für Bestandswarnungen und die Strategie für Kontonamen (`sa_type`).

## Wichtige Services

Alle Services erweitern `MelisComGeneralService` und werden in `config/module.config.php` registriert. Jede
öffentliche Methode ist in `meliscommerce_service_*_start` / `*_end`-Events gekapselt (siehe
[Events & Listener](#events--listener)). Die React-Controller validieren nur die Eingabe und formen JSON — die
eigentliche Arbeit verbleibt in diesen Services.

| Service-Alias | Rolle |
| --- | --- |
| `MelisComProductService` | `getProductById`, `getProductList` → `MelisProduct` |
| `MelisComVariantService` | `getVariantById`, `getVariantListByProductId`, `getVariantBySKU`, `getMainVariantByProductId` → `MelisVariant` |
| `MelisComCategoryService` | `getCategoryById`, `getCategoryListById(Recursive)` → `MelisCategory` |
| `MelisComAttributeService` | `getAttributeById`, `getAttributes` → `MelisAttribute` |
| `MelisComPriceService` | `getItemPrice($itemId, $countryId, $groupId, $type)` — Preis mit Fallback-Hierarchie |
| `MelisComProductSearchService` | Frontoffice-Produktsuche |
| `MelisComSeoService` | Commerce-SEO (URLs / Meta für Produkte und Kategorien) |
| `MelisComClientService` | `getClientById`, `getClientList`, `getClientByIdAndClientPerson` → `MelisClient` |
| `MelisComContactService` | Verwaltung von Kontakten (Personen) |
| `MelisComClientGroupsService` | Kundengruppen (für gruppenspezifische Preisgestaltung) |
| `MelisComAuthenticationService` | Frontoffice-Login: `login`, `getClientId`, `getPersonId`, `getClientGroup`, `setClientId`, `logout`, `hasIdentity` |
| `MelisComBasketService` | `getBasket`, `getPersistentBasket`, `getAnonymousBasket`, `addVariantToBasket`, `transferAnonymousBasketToPersistentBasket` → `MelisBasket` |
| `MelisComOrderService` | `getOrderById`, `getOrderList` → `MelisOrder` |
| `MelisComOrderCheckoutService` | Zweiphasiger Checkout: `checkoutStep1_prePayment`, `checkoutStep2_postPayment` |
| `MelisComPostPaymentService` | Erfassung der Transaktion nach der Zahlung |
| `MelisComOrderProductReturnService` | Produktretouren / RMA |
| `MelisComCouponService` | `getCouponById`, `getCouponList` → `MelisCoupon` |
| `MelisComCurrencyService` | Währungen |
| `MelisComShipmentCostService` | Berechnung der Versandkosten |
| `MelisComStockEmailAlertService` | E-Mail-Warnungen bei niedrigem Bestand (`VARIANTSLOWSTOCK`) |
| `MelisComDocumentService` | `getDocumentById`, `getDocumentsByRelation` → `MelisDocument` |
| `MelisComDuplicationService` | Produkte / Varianten duplizieren |
| `MelisComLinksService` | Frontoffice-Commerce-Link-Builder |
| `MelisComCacheService` | Commerce-Cache (`commerce_big_services`) |
| `MelisComHead` | SEO-Head-Helper (`updateTitleAndDescription`) |
| `MelisComGeneralService` | Basisklasse; Helper: `getTableColumns`, `getEcomLang`, `getFrontPluginLangId` |

## Preis- und Bestandsauflösung

`MelisComPriceService::getItemPrice($itemId, $countryId, $groupId, $type)` durchläuft eine Fallback-Kette:

1. spezifisches Land + spezifische Gruppe
2. spezifisches Land + allgemeine Gruppe
3. allgemeines Land (`price_country_id = 0`) + spezifische Gruppe
4. allgemeines Land + allgemeine Gruppe
5. (bei einer Variante) Rückgriff auf den **Produkt**-Preis

Der Bestand wird pro **Variante pro Land** geführt (`melis_ecom_variant_stock`). Wenn eine Bestellung den Bestand unter
den Schwellenwert senkt, wird die E-Mail `VARIANTSLOWSTOCK` an die konfigurierten Empfänger gesendet.

## Checkout-Pipeline

Zwei Phasen in `MelisComOrderCheckoutService` (der React-Assistent steuert dieselbe Serverlogik):

**Phase 1 — `checkoutStep1_prePayment($clientId)`** validiert Warenkorb und Adressen, berechnet alle
Kosten und den Versand, erzeugt die Bestellreferenz und ruft dann `MelisComOrderService::saveOrder()` auf.
Die Bestellung wird mit `ord_status = -1` (temporär) gespeichert. Löst
`meliscommerce_service_checkout_step1_prepayment_start/_end` und `…_save_success` aus (trägt die neue
`orderId`).

**Phase 2 — `checkoutStep2_postPayment()`** wird aufgerufen, nachdem das Gateway zurückgekehrt ist.
`MelisComPostPaymentService::processPostPayment()` erfasst die Transaktion in
`melis_ecom_order_payment` und bewegt die Bestellung von Status `-1` auf einen echten Status. Löst
`meliscommerce_service_checkout_step2_postpayment_start/_end` aus.

**Bestellstatus:** `-1` temporär · `1` Neue Bestellung · `2` In Warteschleife · `3` Versendet · `4` Zugestellt ·
`5` Storniert · `6` Zahlungsfehler.

## Events & Listener

Jede Service-Methode löst `meliscommerce_service_*_start`- und `*_end`-Events aus. Die benannten Argumente
(erzeugt durch `makeArrayFromParameters` per Reflection) und der Schlüssel `results` reisen mit dem Event mit.

- `_start`-Listener: Eingaben ändern, bevor die Arbeit ausgeführt wird.
- `_end`-Listener: `$params['results']` ändern, bevor der Aufrufer sie sieht.

Dies ist der primäre Erweiterungsmechanismus — kein Subclassing nötig. Die 33 mitgelieferten Listener lassen sich in
vier Familien einteilen:

| Familie | Beispiele |
| --- | --- |
| Speichern / validieren | `…SaveProductListener`, `…SaveOrderListener`, `…SaveClientListener`, `…ValidateVariantListener` |
| Kaskadierende Bereinigung (Land/Sprache entfernt) | `…ProductPriceCountryDeletedListener`, `…CategoryCountryLink…`, `…SEOLanguageDeletedListener` |
| Checkout / Preisgestaltung / Bestand | `…CheckoutCouponListener`, `…CouponProductPriceListener`, `…ShipmentCostListener`, `…PostPaymentListener`, `…VariantCheckLowStockListener` |
| Frontoffice-SEO-Routing | `…SEOReformatToRoutePageUrlListener`, `…SEODispatchRouterCommerceUrlListener`, `…SEOMetaPageListener` |

## React-API & Capabilities

Alle Routen sind Child-Routen von `melis-react-api` (zusammengeführt aus `config/react-api.php`): **13
aufrufbare Controller** in `src/Controller/ReactApi/`, **184 Routen** unter `/melis/react-api/…`.
Der Antwortvertrag ist überall `{ success, data, error? }`; jede Aktion ruft zuerst
`denyUnlessAccess()` auf (Auth + `MelisCoreRights::canAccess(<melisKey>)`, 401/403). Jedes Entity-
Tool stellt in etwa `GET /<tool>` (Keyset-Liste), `/<tool>/stats`, `/<tool>/options`,
`POST /<tool>/save`, `DELETE /<tool>/delete/:id`, `GET /<tool>/:id` bereit sowie tool-spezifische
Unterressourcen (z. B. fügt Orders den vollständigen `/orders/checkout/*`-Assistenten hinzu).

> ⚠ Commerce-Sprachen sind unter `/commerce-languages` (nicht `/languages`) mit einem Namespace versehen, weil das Core-
> Languages-Tool bereits `/languages` unter dem gemeinsamen `melis-react-api`-Elternteil besitzt.

`config/react.capabilities.php` deklariert einen `melisReactToolCapabilities`-Eintrag pro Tool, verschlüsselt unter
seinem melisKey. Dies sind **deklarative Default-Allow**-UI-Hinweise — sie steuern den Rechte-Checkbox-Baum unter Users → Rights
und erlauben es React, Tabs/Schaltflächen über `useCaps(...)` auszublenden — aber es gibt **noch kein serverseitiges
`denyUnlessCan()`**; nur `denyUnlessAccess()` auf dem melisKey des Tools reguliert die API. Behandeln Sie
Capabilities als UI-Hinweise, nicht als Sicherheit.

## Frontoffice

Templating-Plugins werden unter `config/plugins/{products,categories,clients,orders}/` und
als `controller_plugins` in `module.config.php` registriert. Ziehen Sie sie in eine Drag-and-drop-Zone einer CMS-Seite.

| Bereich | Plugins |
| --- | --- |
| Katalog | `ProductShowPlugin`, `ProductListPlugin`, `ProductSearchPlugin`, `CategoryTreePlugin`, `CategoryProductListPlugin`, `RelatedProductsPlugin`, `AttributesShowPlugin`, `ProductAttributePlugin`, `ProductPriceRangePlugin` |
| Warenkorb & Checkout | `AddToCartPlugin`, `CartPlugin`, `CheckoutPlugin`, `CheckoutCartPlugin`, `CheckoutAddressesPlugin`, `CheckoutCouponPlugin`, `CheckoutSummaryPlugin`, `CheckoutConfirmSummaryPlugin`, `CheckoutConfirmPlugin` |
| Konto | `LoginPlugin`, `RegisterPlugin`, `AccountPlugin`, `ProfilePlugin`, `BillingAddressPlugin`, `DeliveryAddressPlugin`, `LostPasswordGetEmailPlugin`, `LostPasswordResetPlugin` |
| Bestellungen (Kunde) | `OrderPlugin`, `OrderHistoryPlugin`, `OrderMessagesPlugin`, `OrderShippingDetailsPlugin`, `OrderReturnProductPlugin`, `OrderAddressPlugin` |

## Datenbanktabellen

59 Tabellen mit dem Präfix `melis_ecom_*`, gruppiert nach Subsystem:

| Gruppe | Wichtige Tabellen |
| --- | --- |
| Produkte & Varianten | `melis_ecom_product`, `melis_ecom_product_text` + `_text_type`, `melis_ecom_product_attribute`, `melis_ecom_product_category`, `melis_ecom_variant`, `melis_ecom_variant_attribute_value`, `melis_ecom_variant_stock`, `melis_ecom_assoc_variant` + `_type` |
| Attribute | `melis_ecom_attribute` + `_trans`, `melis_ecom_attribute_type`, `melis_ecom_attribute_value` + `_value_trans` |
| Kategorien & Geo | `melis_ecom_category` + `_trans`, `melis_ecom_country_category`, `melis_ecom_country`, `melis_ecom_lang` |
| Preisgestaltung & Währung | `melis_ecom_price`, `melis_ecom_currency` |
| Kunden (B2B) | `melis_ecom_client`, `melis_ecom_client_person` + `_person_emails`, `melis_ecom_client_company`, `melis_ecom_client_account_rel`, `melis_ecom_client_person_rel`, `melis_ecom_client_address` + `_address_type`, `melis_ecom_client_groups`, `melis_ecom_civility`, `melis_ecom_settings_account` |
| Warenkörbe & Bestellungen | `melis_ecom_basket_anonymous`, `melis_ecom_basket_persistent`, `melis_ecom_order`, `melis_ecom_order_basket`, `melis_ecom_order_address`, `melis_ecom_order_payment` + `_type`, `melis_ecom_order_shipping`, `melis_ecom_order_message`, `melis_ecom_order_status` + `_trans`, `melis_ecom_order_product_return` + `_details` |
| Gutscheine | `melis_ecom_coupon` + `_coupon_client` / `_coupon_order` / `_coupon_product` |
| Dokumente & SEO | `melis_ecom_document` + `_doc_type` + `_doc_relations`, `melis_ecom_seo`, `melis_ecom_stock_email_alert` |

## Beispiele

**Ein Produkt, seine Hauptvariante und einen aufgelösten Preis auslesen**

```php
$prdSrv   = $sm->get('MelisComProductService');
$varSrv   = $sm->get('MelisComVariantService');
$priceSrv = $sm->get('MelisComPriceService');

$product = $prdSrv->getProductById($prdId, $langId, $countryId);  // → MelisProduct
$variant = $varSrv->getMainVariantByProductId($prdId, $langId, $countryId);  // → MelisVariant
$price   = $priceSrv->getItemPrice($variant->getId(), $countryId, $groupId, 'variant');
// $price['price'] (netto), $price['price_currency'], $price['price_details']
```

**Zum Warenkorb hinzufügen und den zweiphasigen Checkout ausführen**

```php
$basketSrv   = $sm->get('MelisComBasketService');
$checkoutSrv = $sm->get('MelisComOrderCheckoutService');

$basketSrv->addVariantToBasket($variantId, 1, $clientId);
$basketSrv->transferAnonymousBasketToPersistentBasket($clientKey, $clientId);

$step1 = $checkoutSrv->checkoutStep1_prePayment($clientId);  // Bestellung mit Status -1
// $step1['orderId'] — an das Payment-Gateway übergeben
$step2 = $checkoutSrv->checkoutStep2_postPayment();          // erfasst Zahlung, bewegt von -1 weg
```

**Den Shop ohne Subclassing anbinden**

```php
// _start → Eingaben ändern; _end → $params['results'] ändern.
$this->attachEventListener(
    $events, '*', 'meliscommerce_service_get_item_price_end',
    function ($e) {
        $params = $e->getParams();
        $price  = $params['results'];
        // $price ändern, dann:
        $params['results'] = $price;
        return $params;
    }
);
```

## Wichtige Dateien

| Aspekt | Pfad |
| --- | --- |
| Modulkonfiguration (Services, Controller, Plugins) | `vendor/melisplatform/melis-commerce/config/module.config.php` |
| React-API-Routen / Capabilities | `vendor/melisplatform/melis-commerce/config/react-api.php`, `config/react.capabilities.php` |
| React-Brick (Quelle / Build) | `vendor/melisplatform/melis-commerce/ui-react/src/`, `public/ui-react/{brick.js, brick.manifest.json}` |
| React-API-Controller (13) | `vendor/melisplatform/melis-commerce/src/Controller/ReactApi/` |
| Frontoffice-Plugin-Konfiguration | `vendor/melisplatform/melis-commerce/config/plugins/` |
| Services / Entities (10) / Table-Gateways (59) | `vendor/melisplatform/melis-commerce/src/Service/`, `src/Entity/`, `src/Model/Tables/` |
| Listener (33) | `vendor/melisplatform/melis-commerce/src/Listener/` |
| DB-Deltas | `vendor/melisplatform/melis-commerce/install/dbdeploy/` |

Siehe auch: [Modulreferenz](/de/reference/modules) · [melis-react-api](/de/reference/modules/melis-react-api) · [melis-commerce-order-invoice](/de/reference/modules/melis-commerce-order-invoice) · [melis-core](/legacy/reference/modules/melis-core) · [melis-cms](/de/reference/modules/melis-cms).
