# Commerce

`melis-commerce` fügt Melis eine vollständige **E-Commerce**-Domäne hinzu: Katalog, Kunden, Warenkorb, Checkout und
Bestellungen — bereitgestellt sowohl als **Backoffice-Tools** als auch als **Frontoffice-Plugins**. Diese Seite ist ein Wegweiser zur
Orientierung; lesen Sie das `src/Service/`-Verzeichnis des Moduls für die exakte, aktuelle API.

In **Melis v6** bleiben das Framework, das Modul und seine Dienste unverändert — geändert hat sich die
**Backoffice-Oberfläche**: Die Commerce-Tools laufen jetzt als native **React-„Bricks"** innerhalb von `/melis-react`
(siehe [Ein Tool erstellen](./create-a-tool)). Jedes Tool behält einen eigenen **Neu / Alt**-Umschalter, sodass Sie auf
die klassische Ansicht in einem iframe zurückgreifen können, und der global schwebende [KI-Assistent](./ai) ist
über jedem Tool verfügbar.

## Domänenmodell

Die wichtigsten Konzepte (Entitäten unter `melis-commerce/src/Entity/`, Tabellen mit dem Präfix `melis_ecom_*`):

| Bereich | Konzepte | Tabellen (Beispiele) |
| --- | --- | --- |
| **Katalog** | Produkt, Variante (verkaufsfähige SKU), Kategorie, Attribut & Werte | `melis_ecom_product`, `melis_ecom_variant`, `melis_ecom_category`, `melis_ecom_attribute` |
| **Preisgestaltung** | Preis nach Variante/Produkt × Land × Währung × Kundengruppe | `melis_ecom_price`, `melis_ecom_client_groups` |
| **Kunden** | Kunde (Konto), Kundenperson, Adressen | `melis_ecom_client`, `melis_ecom_client_person` |
| **Warenkorb** | Anonyme & dauerhafte Warenkörbe | `melis_ecom_basket_anonymous`, `melis_ecom_basket_persistent` |
| **Bestellungen** | Bestellung + Adressen, Zahlung, Versand; Rücksendungen | `melis_ecom_order`, `melis_ecom_order_address`, `melis_ecom_order_payment` |
| **Aktionen** | Gutscheine (produkt-/kundengebunden) | `melis_ecom_coupon`, `melis_ecom_coupon_product` |
| **Lokalisierung** | Land, Währung | `melis_ecom_country`, `melis_ecom_currency` |
| **Medien** | Dokumente (Bilder/PDF) | `melis_ecom_document` |

## Dienste, die Sie verwenden werden

Alle registriert in `melis-commerce/config/module.config.php` (`service_manager.aliases`). Die wichtigsten:

- **Katalog**: `MelisComProductService`, `MelisComVariantService`, `MelisComCategoryService`,
  `MelisComAttributeService`, `MelisComPriceService`, `MelisComProductSearchService`,
  `MelisComDocumentService`.
- **Warenkorb & Checkout**: `MelisComBasketService`, `MelisComOrderCheckoutService`,
  `MelisComOrderService`, `MelisComShipmentCostService`, `MelisComPostPaymentService`,
  `MelisComOrderProductReturnService`.
- **Kunden**: `MelisComClientService`, `MelisComAuthenticationService`, `MelisComContactService`,
  `MelisComClientGroupsService`.
- **Konfiguration**: `MelisComCouponService`, `MelisComCurrencyService`, `MelisComSeoService`.

```php
$products = $sm->get('MelisComProductService');
$orders   = $sm->get('MelisComOrderService');
```

Jeder Dienst sitzt auf einer `MelisEcom*Table`-Datenschicht (z. B. `MelisEcomProductTable` →
`melis_ecom_product`). Das React-Backoffice implementiert nichts davon neu: Seine
`/melis/react-api/…`-Endpunkte validieren lediglich die Eingaben und formen JSON, um dann dieselben Dienste aufzurufen.

## Im Backoffice

MelisCommerce registriert einen Abschnitt **MelisCommerce** in der Seitenleiste von `/melis-react` mit **13 React-Tools**,
die die gesamte Domäne abdecken: **Accounts**, **Contacts**, **Catalogs**, **Products**,
**Orders**, **Coupons**, **Attributes**, **Countries**, **Commerce languages**, **Currencies**,
**Order status**, **Client's groups** und **Commerce settings**. Jedes davon ist eine echte React-Seite (kein
iframe in der Standardansicht „Neu"), die sich unter ihrer eigenen Route öffnet; die „Entitäts"-Tools öffnen einen Datensatz als
dauerhaften **Unter-Tab**, sodass Sie zur Liste zurückspringen können, ohne Ihren Platz zu verlieren. Jedes Tool trägt
einen **Neu / Alt**-Schalter — „Alt" zeigt das klassische Tool in einem iframe, sodass Sie vergleichen können.

![Der Abschnitt MelisCommerce in der Seitenleiste von /melis-react — die Tool-Auswahl.](/screenshots/react/melis-commerce/meliscommerce-menu-tools-selector.png)

Ein typischer Arbeitsablauf: Aufbau des **Katalogs** (Attributes → Catalogs → Products/Variants), Verwaltung der
**Kunden** (Accounts + Contacts), anschließend Durchlaufen der **Bestell**-Pipeline (Orders + Gutscheine), alles gestützt
auf die Commerce-Referenzlisten (Countries, Currencies, Order status, Client's groups, Settings).

- **Katalog** — das Tool **Catalogs** ist ein Kategorie-**Baum** (per Drag & Drop umsortieren; Properties / SEO /
  Products pro Knoten). **Products** listet Produkte auf (Suche, Duplizieren, Export); der Editor verfügt über die Tabs
  **Properties**, **Text**, **Variants**, **SEO** und **Prices**, mit einem umfangreichen Editor pro Variante
  (Preise, Bestände, SEO, Zuordnungen, Medien). **Attributes** verwaltet typisierte Merkmale
  (Properties / Labels / Values).

  ![Die Produktliste (React).](/screenshots/react/melis-commerce/meliscommerce-tools-products-list.png)

  ![Produkteditor — Tab Variants.](/screenshots/react/melis-commerce/meliscommerce-tools-products-edit-tab-variants.png)

- **Kunden** — **Accounts** sind B2B-Kunden (Properties, Company, Contacts, Addresses, Orders,
  Files), mit Suche, Filtern, einem Spaltenmanager, Export und CSV-**Import**. **Contacts** sind die
  einzelnen Personen (Information / Address / Association), die mit einem oder mehreren Konten verknüpft sind.

  ![Die Accounts-Liste (React).](/screenshots/react/melis-commerce/meliscommerce-tools-accounts-list.png)

- **Bestellungen** — das Tool **Orders** listet Bestellungen auf (Filter, Statusfilter, Export). Der Editor pro Bestellung
  verfügt über die Tabs **Properties**, **Basket**, **Addresses**, **Payment**, **Shipping**, **Messages** und
  **Returns** (plus **Invoices**, wenn die Rechnungsstellung aktiv ist — siehe unten). **New Order** öffnet einen
  geführten **7-stufigen Checkout-Assistenten** (contact → account → products → addresses → summary → payment →
  confirmation), gestützt auf eine serverseitige Sitzung, die dort fortsetzt, wo Sie aufgehört haben.

  ![Die Orders-Liste (React).](/screenshots/react/melis-commerce/meliscommerce-tools-order-list.png)

  ![Checkout-Assistent für neue Bestellungen.](/screenshots/react/melis-commerce/meliscommerce-tools-order-newordertunnel-1.png)

- **Referenz & Konfiguration** — **Coupons** (Properties, Assign account, Assign product, Verwendung Orders),
  **Countries**, **Commerce languages**, **Currencies** (mit einer Aktion *set default*), **Order
  status** (Status + Farbe + Bezeichnungen pro Sprache), **Client's groups** und eine einzelne Seite **Commerce
  settings** (Properties + Accounts).

Für die vollständige Tab-für-Tab-Referenz pro Tool (Routen, Funktionen, `react-api`-Endpunkte) siehe die
[Referenz zum Modul melis-commerce](/de/reference/modules/melis-commerce).

## Im Frontoffice

Commerce liefert eine große Menge an **Templating-Plugins** (fügen Sie sie in Seiten ein — siehe
[Plugins](./plugins)), die das gesamte Storefront abdecken:

- **Katalog**: `MelisCommerceProductShowPlugin`, `MelisCommerceProductListPlugin`,
  `MelisCommerceProductSearchPlugin`, `MelisCommerceCategoryProductListPlugin`,
  `MelisCommerceRelatedProductsPlugin`.
- **Konto**: `MelisCommerceLoginPlugin`, `MelisCommerceRegisterPlugin`,
  `MelisCommerceAccountPlugin`, `MelisCommerceProfilePlugin`, Plugins für Liefer-/Rechnungsadressen.
- **Warenkorb & Checkout**: `MelisCommerceAddToCartPlugin`, `MelisCommerceCartPlugin`,
  `MelisCommerceCheckoutPlugin` (+ Schritte Warenkorb / Gutschein / Adressen / Zusammenfassung / Bestätigung).
- **Bestellungen**: `MelisCommerceOrderHistoryPlugin`, `MelisCommerceOrderPlugin`,
  `MelisCommerceOrderReturnProductPlugin`.

…plus Dashboard-Widgets (Anzahl der Bestellungen, Umsatzerlöse, Bestellnachrichten).

Ein Storefront wird daher hauptsächlich durch das **Platzieren dieser Plugins** auf CMS-Seiten zusammengestellt und in
den Views Ihres Site-Moduls gestylt. Die Änderung des React-Backoffice betrifft das Frontoffice **nicht**:
Die Storefront-Plugins und ihre Views bleiben unverändert.

## Rechnungsstellung

`melis-commerce-order-invoice` erweitert Commerce um die **Erzeugung von PDF-Rechnungen** (via
Spipu/Html2Pdf): einen Rechnungsdienst + Tabelle (`melis_ecom_order_invoice`) und Listener, die Rechnungen
aus den Bestelldaten generieren. Im React-Backoffice hat es **kein eigenes Tool** — es ist ein
**Erweiterungs-Brick**, der zwei Elemente in das Tool **Orders** einfügt, wenn das Modul aktiv ist:

- einen Tab **Invoices** im Bestelleditor — Rechnungen auflisten, **Regenerate Invoice** und jede
  aufgelistete Rechnung herunterladen;
- eine **Download**-Schaltfläche pro Zeile in der Orders-Liste, die das neueste Rechnungs-PDF der Bestellung abruft.

Falls Sie sie nicht sehen, prüfen Sie, ob `melis-commerce-order-invoice` aktiv ist und ob Ihre Rolle das
Recht **Invoices** in Orders besitzt. Siehe die
[Referenz zum Modul melis-commerce-order-invoice](/de/reference/modules/melis-commerce-order-invoice).

## Wichtige Dateien

| Aspekt | Pfad |
| --- | --- |
| Dienste | `vendor/melisplatform/melis-commerce/src/Service/` |
| Entitäten | `vendor/melisplatform/melis-commerce/src/Entity/` |
| Schema | `vendor/melisplatform/melis-commerce/install/sql/setup_structure.sql` |
| Front-Plugins | `vendor/melisplatform/melis-commerce/src/Controller/Plugin/` |
| React-Bricks & API | `vendor/melisplatform/melis-commerce/ui-react/`, `config/react-api.php`, `src/Controller/ReactApi/` |
| Rechnungsstellung | `vendor/melisplatform/melis-commerce-order-invoice/` |
