# MelisCommerceGroupDiscountPerCategory

> Fügt einen Preisnachlass pro Kategorie hinzu, abgegrenzt nach Land und Kundengruppe, in Form eines Tabs "Price Discount", der im React-Backoffice in das Catalogs-Tool von MelisCommerce eingebettet wird. Paket `melisplatform/melis-commerce-group-discount-per-category`.

## Zweck

MelisCommerceGroupDiscountPerCategory ermöglicht es Ihnen, einen **prozentualen Nachlass auf die Produkte einer Kategorie, pro Land und pro Kundengruppe** festzulegen. Der Nachlass ist auf *(Kategorie × Land × Kundengruppe)* abgegrenzt, sodass zwei Kunden, die dasselbe Produkt kaufen, je nach der Gruppe, zu der sie gehören, zwei unterschiedliche Preise sehen können, und der Nachlass kann von Land zu Land variieren (mit einem **General**-Pseudoland, ID `-1`, das für alle Zonen gilt).

Das Modul verfügt über **kein eigenes Tool**. Es ist ein **Erweiterungs-/Host-Injection-Baustein**: Es zeichnet keine Seite und fügt keinen Menüeintrag hinzu. Stattdessen veröffentlicht es eine React-Komponente auf `window`, die von der Catalogs-Seite von MelisCommerce aufgegriffen wird — wenn das Modul aktiv ist —, um dem Kategorie-Editor einen **Price Discount**-Tab hinzuzufügen. Die eigentliche Persistenz bleibt im Laminas-Service des Moduls, unverändert gegenüber dem Legacy-Tool.

## Aktivierung

Fügen Sie zu `config/melis.module.load.php` hinzu:

```php
return [
    'MelisCommerceGroupDiscountPerCategory',
];
```

Da es sich um einen Erweiterungsbaustein handelt, erscheint der Tab **nur, wenn beide** der folgenden Bedingungen erfüllt sind:

- **Das Modul ist aktiv** — nur ein aktiver Baustein veröffentlicht sein Global auf `window`, damit der Host es aufgreifen kann.
- **Der Benutzer besitzt das Recht `price_discount`** auf dem Catalogs-Tool.

Es gibt in diesem Modul **keine `config/react.capabilities.php`**: Die Capability `price_discount` wird in **MelisCommerce** deklariert, unter dem rechtetragenden melisKey `meliscommerce_categories_page` des Catalogs-Tools.

## Wo es sich im React-Backoffice befindet

Es gibt keinen eigenen Bildschirm. Die Funktion ist ein Tab innerhalb des Catalogs-Tools:

- Seitenleiste → **Commerce → Catalogs**.
- Eine bestehende **Kategorie** öffnen/bearbeiten.
- Auf den **Price Discount**-Tab klicken (beschriftet mit *"Discount Per Client's Group"* / *"Réduction par groupe de client"*).

Der Tab ist **nur zum Bearbeiten** gedacht: Er hängt an einer bestehenden Kategorie und ist daher während des *Erstellens* einer Kategorie deaktiviert — speichern Sie die Kategorie zuerst. Er hat außerdem **keine eigene Speichern-Schaltfläche**; Nachlässe werden über die Schaltfläche **"Save category"** des Host-Formulars geschrieben.

Der Tab besteht aus zwei Bereichen:

- eine **Country**-Liste auf der linken Seite (**General** zuerst, dann jedes Land mit seiner Flagge); ein Badge zeigt an, wie viele Nachlässe für dieses Land ausgefüllt sind;
- eine Reihe von **Kundengruppen-Tabs** auf der rechten Seite — wählen Sie eine Gruppe aus und geben Sie dann deren **Rabattprozentsatz** für das ausgewählte Land ein. Ein Punkt kennzeichnet einen Gruppen-Tab, der bereits einen Wert enthält (rot, wenn ungültig).

## Nachlassregeln

- **Prozentsatz** — `0 < value ≤ 100`, höchstens **2 Dezimalstellen**. Wird ein Feld **leer** gelassen, wird diese Nachlasszeile entfernt (gelöscht).
- Es werden nur **aktive** Kundengruppen angeboten.
- Das Feld wird während der Eingabe validiert; ein ungültiger Wert wird unter dem jeweiligen Feld angezeigt und markiert den Gruppen-Tab rot. Beim **Save category** **blockiert** ein ungültiger Prozentsatz das Speichern und wechselt den Tab zum ersten fehlerhaften Land + Gruppe. Andernfalls wird die Kategorie zuerst gespeichert, dann werden die Nachlässe mit ihr gespeichert.

## Aufbau des Bausteins

Die Quelle des Bausteins ist eine Vite-**IIFE**-Bibliothek unter `ui-react/`, die nach `public/ui-react/brick.js` (+ `brick.manifest.json`) gebaut wird. React wird an die Host-Globals ausgelagert, damit die Komponente innerhalb der Catalogs-Seite gerendert wird. Das Manifest deklariert **keine route, kein label, keinen forwardKey oder melisKey** (alle `null`), und der Einstiegspunkt ruft `__melisRegisterBrick` **nicht** auf — beim Laden veröffentlicht er lediglich ein Global:

```ts
window.MelisCommerceGroupDiscountPerCategoryBrick = {
  CategoryDiscountTab,
  tabLabel: { fr: 'Réduction par groupe de client', en: "Discount Per Client's Group" },
}
```

| Datei | Rolle |
| --- | --- |
| `src/brick.tsx` | Veröffentlicht das Global `window.MelisCommerceGroupDiscountPerCategoryBrick`. Keine Route, keine Registrierung. |
| `src/CategoryDiscountTab.tsx` | Die Tab-Oberfläche (Props `{ categoryId }`): Länderliste + Kundengruppen-Tabs + Prozentsatz-Feld, eigenständiges fr/en-Wörterbuch, clientseitige Validierung und die Event-Listener für das Speichern-mit-Formular. |
| `src/discountApi.ts` | JSON-Client für die `react-api`-Endpunkte des Moduls, unter Verwendung des Vertrags `{ success, data, error }`. |

Das Tab-Label wird mit **diesem** Modul (auf dem Global) ausgeliefert, nicht mit dem Wörterbuch von MelisCommerce. Der Tab liest die aktive Sprache aus `document.documentElement.lang`.

## React-API

Die Routen sind in `config/react-api.php` definiert und werden in die `child_routes` von `melis-react-api` eingebunden. Controller: `MelisReactApiCategoryDiscountController` (`optionsAction` / `getAction` / `saveAction`). Antwortform `{ success, data, error? }`.

| Methode + URL | Action | Rückgabe (`data`) |
| --- | --- | --- |
| `GET /melis/react-api/category-discounts/options` | `optionsAction` | `{ countries, groups }` — Länder mit **General** (ID `-1`) zuerst + base64-Flaggen; **aktive** Kundengruppen. |
| `GET /melis/react-api/category-discounts/:id` | `getAction` | `{ items }` — für Kategorie `:id` gespeicherte Nachlässe. |
| `POST /melis/react-api/category-discounts/save` | `saveAction` | `{ items }` — nach dem Speichern erneut gelesene Nachlässe (frische IDs). |

TS-Strukturen (`discountApi.ts`):

```ts
interface CountryOpt  { id: number; name: string; flag: string | null; general: boolean }
interface GroupOpt    { id: number; name: string }
interface DiscountRow { id: number; countryId: number; groupId: number; percentage: number }
```

**Zugriffsschutz (alle drei Aktionen):** `denyUnlessAccess()` erfordert eine authentifizierte Identität (`MelisCoreAuth`, andernfalls 401) und `MelisCoreRights->canAccess('meliscommerce_categories_page')` — den melisKey des **Host**-Catalogs-Tools (andernfalls 403). Der Tab kann niemals freizügiger sein als das Tool, in dem er sich befindet.

**Speichervertrag.** Der Client sendet **jede** Zelle (einschließlich leerer — ein leerer `percentage` löscht diese Zeile). `saveAction` validiert erneut (numerisch, ≤ 2 Dezimalstellen, ≤ 100, > 0), baut die Legacy-Struktur `[countryId][groupId] => ['gdc_id' => …, 'gdc_discount_percent' => …]` neu auf und delegiert an den Service — keine Geschäftslogik im Controller:

```php
$this->getServiceManager()
     ->get('MelisCommerceGroupDiscountPerCategoryService')
     ->saveCategoryGroupDiscount($categoryId, $datas);   // same service + events as the legacy tool
```

`options`/`get` lesen aus `MelisCommerceGroupDiscountPerCategoryService->getCategoryDiscountsByCategoryId()`, `MelisEcomCountryTable->getCountries()` und `MelisComClientGroupsService->getClientsGroupList()`.

## Host-Integration

- **Erkennung / Laden:** Standard-Baustein-Ablauf — `GET /melis/react-api/react-modules` listet ihn auf, der Host lädt `brick.js` im Hintergrund, und `brick.tsx` veröffentlicht das Global.
- **Aufgreifen der Komponente:** Die `CatalogPage.tsx` von MelisCommerce löst die Komponente und das Label über die generischen Helfer auf und fügt den Tab **nur dann** hinzu, **wenn beide aufgelöst werden**, und nur im **Bearbeiten**-Modus:

  ```ts
  const DiscountTabComp  = useExternalBrickComponent<{ categoryId: number }>(
    'MelisCommerceGroupDiscountPerCategoryBrick', 'CategoryDiscountTab')
  const DiscountTabLabel = useExternalBrickValue<{ fr: string; en: string }>(
    'MelisCommerceGroupDiscountPerCategoryBrick', 'tabLabel')
  ```

  Der Tab-Inhalt wird **dauerhaft eingehängt** (bei Inaktivität mit `display:none` ausgeblendet), damit er seine Eingaben und Listener behält.

- **Brücke zum Speichern-mit-dem-Formular** (zwei `CustomEvent`s auf `window`):
  - `melis:commerce-category-validate` — wird vor dem Speichern ausgelöst; der Tab validiert und setzt beim ersten ungültigen Wert `detail.blocked = true` und `detail.tab = 'price_discount'`, wodurch das Speichern der Kategorie abgebrochen wird.
  - `melis:commerce-category-saved` — wird ausgelöst, nachdem die Kategorie gespeichert wurde; der Tab schiebt sein `submit({ silent: true })`-Promise in `detail.pending`, das `CatalogPage` vor dem Abschluss abwartet.

## Wichtige Dateien

| Aspekt | Pfad |
| --- | --- |
| Baustein-Quelle (Komponente, API-Client) | `ui-react/src/{brick.tsx, CategoryDiscountTab.tsx, discountApi.ts}` |
| Gebauter Baustein + Manifest | `public/ui-react/{brick.js, brick.manifest.json}` (ID `commerce-group-discount-per-category`) |
| React-API-Routen | `config/react-api.php` |
| Modul-Verdrahtung | `config/module.config.php` |
| React-API-Controller | `src/Controller/ReactApi/MelisReactApiCategoryDiscountController.php` |

Siehe auch: [melis-commerce](/legacy/reference/modules/melis-commerce)
