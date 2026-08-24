# MelisCmsProspects

> Lead-/Kontaktverwaltung: Ein Kontaktformular im Front-Office erfasst Besuchernachrichten als Interessenten (Prospects), und ein React-Back-Office ermöglicht das Durchsuchen, Filtern, Bearbeiten, Exportieren und Löschen sowie die Klassifizierung von Anfragen nach Themen. Paket `melisplatform/melis-cms-prospects`.

## Zweck

`MelisCmsProspects` erfasst Kontaktformular-Einsendungen von Besuchern als **Prospects** (Interessenten/Leads) und speichert sie in
der Datenbank. Back-Office-Benutzer durchsuchen, filtern, bearbeiten, exportieren (CSV/Excel) und löschen diese Leads
und klassifizieren sie nach **Themen**. Das Modul liefert ein Dashboard-Statistik-Widget und bindet sich in
die DSGVO-Werkzeuge der Plattform ein (Benutzerinformationen / Extrahieren / Löschen + automatischer Löschzyklus).

In Melis v6 sind die beiden Back-Office-Werkzeuge — **Prospects** und **Themes** — **native, vollständig in React
umgesetzte Oberflächen**, die unter `/melis-react` bereitgestellt werden und jeweils mit einer JSON-`react-api`-Schicht kommunizieren. Das zugrunde liegende Daten-
modell, die Services, das Show-Form-Plugin im Front-Office und die DSGVO-Verdrahtung sind gegenüber v5 unverändert.

## Aktivierung

In `config/melis.module.load.php` hinzufügen:

```php
return [
    'MelisCmsProspects',
];
```

Abhängigkeiten: `melis-core`, `melis-engine`, `melis-front`, `melis-cms` und
`laminas/laminas-mvc-plugin-flashmessenger`. Das Modul ist `dbdeploy: true` — seine Tabellen werden
über den dbdeploy-Mechanismus erstellt/aktualisiert. Beide React-Werkzeuge erscheinen im Back-Office nur,
solange das Modul aktiv ist (sie werden aus dessen `brick.manifest.json` ermittelt).

## React-Back-Office

**Wo:** Linke Seitenleiste → **MelisMarketing** → **Prospects** → **Prospects** / **Themes**. Jedes
öffnet sich als eigener oberster Tab. Jedes Werkzeug behält einen **New / Old**-Umschalter: *New* ist die React-Oberfläche
(Standard), *Old* rendert das Legacy-Werkzeug in einem iframe (`/melis/react-tool-page?key=<melisKey>`).

Zwei Bricks werden in einem Bundle ausgeliefert (`public/ui-react/brick.manifest.json`):

| Element | Prospects | Themes |
| --- | --- | --- |
| Brick-ID / Route | `prospects` — `/prospects` | `prospect-themes` — `/prospect-themes` |
| `forwardKey` (Menü → Route) | `MelisCmsProspects/ToolProspects` | `MelisCmsProspects/ProspectThemes` |
| iframe-`melisKey` der Old-Ansicht (Zone) | `MelisCmsProspects_tool_prospects` | `MelisCmsProspects_tool_themes` |
| melisKey für Rechte / Berechtigung | `melisprospects_tool_prospects_section` | `melisprospects_tool_themes_section` |
| API-Basis | `/melis/react-api/prospects` | `/melis/react-api/prospect-themes` |
| Controller | `MelisReactApiProspectController` | `MelisReactApiProspectThemeController` |

> Hinweis: Der `melisKey` im Manifest ist der renderbare **Zonen**-Schlüssel, der für den iframe der Old-Ansicht verwendet wird —
> die Rechte hängen **nicht** daran. Zugriffssschutz und Berechtigungen basieren auf dem Menüknoten
> `melisprospects_tool_..._section` (deklariert in `config/app.interface.php`).

### Prospects-Werkzeug

![Das React-Prospects-Werkzeug: KPI-Karten (Total / This month / Average per month / Anonymized), Suche, All-sites- und All-types-Filter, ein Datumsbereich-Auswähler, Reset filters, ein Spaltenmanager, Export, der New/Old-Umschalter und eine Aktualisieren-Schaltfläche — jede Zeile hat Bearbeiten- und Löschen-Aktionen](/screenshots/react/melis-cms-prospects/meliscmsprospects-tool-prospects-list.png)

Sie sehen **jeden Prospect auf der Plattform**. Die Liste hat **vier KPI-Karten** (Total, This month,
Average per month, Anonymized), ein **Suchfeld** (Name / E-Mail / Telefon / Firma), einen **Site**-
Filter, einen **Type**-Filter, einen **Date**-Bereichsauswähler (Today / Yesterday / Last 7 / Last 30 / This
month / Last month / Custom), **Reset filters**, einen dauerhaft gespeicherten **Columns**-Manager, **Export** und
eine Aktualisieren-Schaltfläche. Klicken Sie auf eine Spaltenüberschrift, um zu **sortieren** (alle Spalten außer *Message*). Jede Zeile hat **Bearbeiten**
und **Löschen**.

Prospects werden hier **nicht angelegt** — sie entstehen ausschließlich über das Kontaktformular im Front-Office. Ein Klick auf
**Bearbeiten** öffnet den Prospect als **Unter-Tab** des Hosts (← Back) mit einem React-Formular: eine **Contact
information**-Karte (Name, Email, Phone, Company, Country), eine **Message**-Karte und eine **Details**-
Seitenkarte (**Site**-Auswähler, **Theme**-Auswähler, schreibgeschütztes **Contact date**). Kein Feld ist Pflicht
(die E-Mail wird nur bei Eingabe auf das Format geprüft); **Contact date** und **type** sind unveränderlich — sie werden
zum Erfassungszeitpunkt vom Front-Formular gesetzt.

![Das React-Bearbeitungsformular für einen Prospect — eine Contact-information-Karte (Name, Email, Phone, Company, Country), ein Message-Feld und eine Details-Seitenkarte (Site, Theme, schreibgeschütztes Contact date); die Unter-Tab-Leiste zeigt die Detailansicht (← Back · Paul Martin)](/screenshots/react/melis-cms-prospects/meliscmsprospects-tool-prospects-edit.png)

### Themes-Werkzeug

Die Themes-Liste zeigt **zwei KPI-Karten** (Total themes, total Items), ein **Suchfeld**, **Reset
filters**, einen **Columns**-Manager, **Export**, den **New/Old**-Umschalter und **+ New theme**. Jede Zeile
zeigt den **Namen** des Themas und dessen **Anzahl an Items**, mit drei Aktionen: **Umbenennen** (Modal mit einem Feld),
**Bearbeiten** (öffnet den **Items**-Unter-Tab des Themas) und **Löschen**.

![Das React-Themes-Werkzeug: Total- / Items-KPI-Karten, Suche, Reset filters, Columns, Export, New/Old-Umschalter und „+ New theme" — jede Zeile bietet Umbenennen, Bearbeiten (Items öffnen) und Löschen](/screenshots/react/melis-cms-prospects/meliscmsprospects-tool-themes-list.png)

![Das Modal „New theme" — ein einzelnes Name-Feld (der Code wird vom Back-End erhalten und nicht hier eingegeben)](/screenshots/react/melis-cms-prospects/meliscmsprospects-tool-themes-new-modal.png)

Das Bearbeiten eines Themas öffnet dessen **Items**-Panel als Unter-Tab (← Back + Themenname): eine durchsuchbare Liste von
Items (ID + Name) mit Bearbeiten/Löschen je Zeile und **+ New item**. Das Hinzufügen oder Bearbeiten eines Items öffnet ein
Modal, das einen **Namen je CMS-Sprache** erfasst — eine Reihe von Sprach-Tabs (Flagge + grüner „Ausgefüllt"-Punkt)
sowie das **Name**-Feld für die aktive Sprache. Mindestens eine Sprache muss ausgefüllt sein.

![Das Items-Panel eines Themas (Unter-Tab) für „My Billing" — eine durchsuchbare Liste von Items mit Bearbeiten/Löschen je Zeile und einer „+ New item"-Schaltfläche, dargestellt als Detail-Unter-Tab](/screenshots/react/melis-cms-prospects/meliscmsprospects-tool-themes-edit-themecategorylist.png)

![Das Modal „New item" — „Content per language"-Tabs (English / Français) und das Name-Feld für die aktive Sprache](/screenshots/react/melis-cms-prospects/meliscmsprospects-tool-themes-edit-themecategorylist-new-modal.png)

## React-API

Die Routen befinden sich in `config/react-api.php` (zusammengeführt über `Module::getConfig()`). Alle unter
`/melis/react-api/`, Vertrag `{ success, data, error }`; jeder Fetch sendet
`X-Requested-With: XMLHttpRequest` und `credentials: 'include'`.

**Prospects** — `MelisReactApiProspectController`:

| Methode & URL | Zweck |
| --- | --- |
| `GET /prospects` | Keyset-Liste (`limit,search,site,type,dateFrom,dateTo,sort,dir,after`) → `{items,total,nextCursor}` |
| `GET /prospects/stats` | KPIs `{total, thisMonth, avgPerMonth, anonymized}` |
| `GET /prospects/sites` | Optionen für den Site-Filter |
| `GET /prospects/types` | Eindeutige `pros_type`-Werte |
| `GET /prospects/themes` | Theme-Item-Optionen für den Theme-Auswähler des Formulars |
| `GET /prospects/:id` | Ein Prospect (formatiert) |
| `POST /prospects/save` | **Nur Aktualisierung** (kein Anlegen); Kontaktdatum & Typ serverseitig unveränderlich |
| `DELETE /prospects/delete/:id` | Einen Prospect löschen |

**Themes & Items** — `MelisReactApiProspectThemeController`:

| Methode & URL | Zweck |
| --- | --- |
| `GET /prospect-themes` | Keyset-Liste der Themen → `{items,total,nextCursor}` mit `itemCount` |
| `GET /prospect-themes/stats` | KPIs `{total, withCode, items}` |
| `GET /prospect-themes/:id` | Ein Thema `{id,name,code,itemCount}` |
| `POST /prospect-themes/save` | Anlegen (id=0) / Aktualisieren (Name erforderlich ≤45, eindeutig; Code bleibt erhalten, wenn nicht angegeben) |
| `DELETE /prospect-themes/delete/:id` | Ein Thema + Items + Übersetzungen löschen (Kaskade) |
| `GET /prospect-themes/languages` | CMS-Sprachen `{languages:[{id,name,locale}]}` |
| `GET /prospect-themes/items?themeId=X` | Items eines Themas (Name in Session-Sprache) |
| `GET /prospect-themes/items/:id` | Ein Item `{id,themeId,translations:{langId:text}}` |
| `POST /prospect-themes/items/save` | Ein Item anlegen/aktualisieren (≥1 nicht leere Übersetzung; Upsert/Löschen je Sprache) |
| `DELETE /prospect-themes/items/delete/:id` | Ein Item + dessen Übersetzungen löschen |

```ts
// update a prospect (no create)
await apiFetch<{id:number}>('/melis/react-api/prospects/save', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: 3, siteId: 1, name: 'Paul Martin',
    email: 'paul.martin@example.com', message: '…', theme: null }),
})
// save a theme item (name per language)
await apiFetch<{id:number}>('/melis/react-api/prospect-themes/items/save', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: 0, themeId: 2, translations: { '1': 'My invoices', '2': 'Mes factures' } }),
})
```

> Beide Controller kommunizieren direkt mit den Tabellen über parametrisiertes SQL (`AdapterInterface`, Keyset-
> Listen über `MelisReactKeysetListTrait`) und bilden die Geschäftsregeln der Legacy-Version nach. Sie lösen weiterhin
> die Legacy-Log-Events aus (`meliscmsprospects_toolprospects_save_end` / `_delete_end`,
> `meliscmsprospects_theme_save_end` / `_delete_end`, `meliscmsprospects_theme_item_save_end`), sodass
> die Flash-/Log-Listener des Moduls weiterhin funktionieren.

## Berechtigungen

Deklariert in `config/react.capabilities.php` (`melisReactToolCapabilities`), indiziert nach dem
rechteführenden melisKey des Menüknotens. `Capabilities::flatten()` erzeugt punktierte Strings, die an
`MelisCan(melisKey, cap)` in React und serverseitig an `denyUnlessCan(cap)` übergeben werden (Standard-Erlaubnis für eine
nicht deklarierte Capability).

```php
'melisprospects_tool_prospects_section' => ['list', 'edit', 'delete', 'export'], // NO create
'melisprospects_tool_themes_section' => [
    'actions' => ['create', 'list', 'edit', 'delete', 'export'],
    'tabs' => [
        ['key' => 'items', 'label' => 'tr_melis_cms_prospects_theme_items',
         'actions' => ['list', 'create', 'edit', 'delete']],
    ],
],
```

- **Prospects**: `list`, `edit`, `delete`, `export` (kein `create` — ein Prospect entsteht nur über das
  öffentliche Kontaktformular).
- **Themes**: `create`, `list`, `edit`, `delete`, `export`, plus der `items`-Unter-Tab
  (`items`, `items.list`, `items.create`, `items.edit`, `items.delete`).

Jede Controller-Aktion prüft zweifach: `denyUnlessAccess()` (Authentifizierung + `MelisCoreRights::canAccess`)
dann `denyUnlessCan('list')` usw. `save` wählt anhand der ID zwischen `edit` und `create`.

## Wichtige Services

| Service-Alias | Rolle |
| --- | --- |
| `MelisCmsProspectsService` / `MelisProspectsService` | Hauptservice. `saveProspectsDatas($datas, $prosId = null)` legt einen Prospect an oder aktualisiert ihn; `getProspectsDataForWidgets($widgetId = '')` liefert die Anzahl Total / This month / Average zurück; `getProspectsDataByDate($type, $date)` zählt Registrierungen nach Datum; `getWidgetProspects($identifier)` ruft Daten für ein Widget ab. |
| `MelisProspectsGdprAutoDeleteService` | Verwaltet den automatischen DSGVO-Löschzyklus (Modulliste, Tag-Liste, Benutzerlisten für Warnung / Zweitwarnung, Kontolöschung). |

Tabellen-Gateways: `MelisProspects`, `MelisCmsProspectsThemeTable`,
`MelisCmsProspectsThemeItemTable`, `MelisCmsProspectsThemeItemTransTable`.

> Die React-Controller verwenden `MelisCmsProspectsService` **nicht** (sie fragen die Tabellen
> direkt ab); die klassischen Werkzeuge (Old-Ansicht), das Show-Form-Plugin, das Dashboard-Widget und die
> DSGVO-Listener setzen weiterhin darauf.

## Front-Office

Das Controller-Plugin `MelisCmsProspectsShowFormPlugin` rendert das Kontaktformular im Front-
End. Ziehen Sie den **Show Form**-Block aus dem Plugins-Panel des React-Seiteneditors auf eine Seite (unter
**Melis Cms Prospects**). Sein Einstellungs-Modal behält drei Tabs:

![Der React-Seiteneditor mit geöffnetem Plugins-Panel — der „Contact Form"-Block befindet sich unter der Gruppe „Melis Cms Prospects" und ist bereit, auf die Seite gezogen zu werden](/screenshots/react/melis-cms-prospects/meliscmsprospects-page-menu-plugins-selector.png)

![Show Form — Tab „Field list": der Feldbaukasten — je Feld ein Show/Hide-Schalter und ein Mandatory-Kontrollkästchen; die Zeilen sind per Drag-and-drop sortierbar, sodass ihre Reihenfolge die Formularreihenfolge ist](/screenshots/react/melis-cms-prospects/meliscmsprospects-page-plugins-showform-config-tab-fieldlist.png)

| Tab | Steuerelemente |
| --- | --- |
| Properties | Rendering-Template (`template_path`) und Quell-Site (`pros_site_id`). |
| Field list | Feldbaukasten — je Feld ein Show/Hide-Schalter und ein Mandatory-Kontrollkästchen (nur aktiv, wenn Show eingeschaltet ist); ziehen Sie die Zeilen, um die Formularreihenfolge festzulegen. Felder: `pros_name`, `pros_company`, `pros_country`, `pros_email`, `pros_telephone`, `pros_message`. |
| Themes | Das Thema, das die Betreff-Dropdown-Liste des Formulars befüllt. |

Konfigurationsdatei: `config/plugins/MelisCmsProspectsShowFormPlugin.config.php`. Front-Template:
`view/.../plugins/prospects-form.phtml`. Auf dem Back-Office-Dashboard stellt das Widget **Prospects
Statistics** (`MelisCmsProspectsStatisticsPlugin`, Bereich `MelisMarketing`) Registrierungen im Zeitverlauf grafisch dar.

![Das Dashboard-Widget „Prospects statistics" — ein Diagramm der Registrierungen nach Tag/Monat/Jahr sowie eine Tabelle der neuesten Prospects](/screenshots/react/melis-cms-prospects/meliscmsprospects-dashboard-plugin-prospectsstatistics.png)

## Datenbanktabellen

| Tabelle | Inhalt |
| --- | --- |
| `melis_cms_prospects` | Ein erfasster Lead: Site, Typ, Thema, Name, E-Mail, Telefon, Nachricht, Firma, Land, Kontaktdatum, DSGVO-Letztdatum. PK: `pros_id`. |
| `melis_cms_prospects_themes` | Betreff-Themen (`pros_theme_name`, `pros_theme_code`). PK: `pros_theme_id`. |
| `melis_cms_prospects_theme_items` | Items, die zu einem Thema gehören. PK: `pros_theme_item_id`. |
| `melis_cms_prospects_theme_items_trans` | Sprachspezifische Übersetzungen der Theme-Items. PK: `item_trans_id`. |

## Event-Hooks

Mit `MelisCmsProspects` als Ziel-Identifikator anhängen:

| Event-Name | Ausgelöst von |
| --- | --- |
| `meliscmsprospects_toolprospects_save_start` / `_end` | Prospects-Werkzeug (klassisch + React-Controller) |
| `meliscmsprospects_toolprospects_delete_start` / `_end` | Prospects-Werkzeug (klassisch + React-Controller) |
| `meliscmsprospects_theme_save_end` / `_delete_end` | Themes-Werkzeug (klassisch + React-Controller) |
| `meliscmsprospects_theme_item_save_end` | Theme-Items (klassisch + React-Controller) |

```php
$sharedEvents->attach(
    'MelisCmsProspects',
    'meliscmsprospects_toolprospects_save_end',
    $fn,
    50
);
```

DSGVO-Listener (Benutzerinformationen, Extrahieren, Löschen, automatisches Löschen) sind in `src/Module.php` verdrahtet. Die DSGVO-
Feldzuordnungen befinden sich in `config/app.gdpr.php`.

## Wichtige Dateien

| Bereich | Pfad (unter `vendor/melisplatform/melis-cms-prospects/`) |
| --- | --- |
| Modulkonfiguration / Routen / Services | `config/module.config.php` |
| React-api-Routen + Invokables | `config/react-api.php` |
| React-Berechtigungen | `config/react.capabilities.php` |
| Back-Office-Interface-Baum | `config/app.interface.php` |
| Klassische Werkzeug-Tabellen & -Formulare | `config/app.tools.php` |
| Konfiguration des Templating-Plugins | `config/plugins/MelisCmsProspectsShowFormPlugin.config.php` |
| Konfiguration des Dashboard-Widgets | `config/dashboard-plugins/` |
| DSGVO-Feldzuordnung | `config/app.gdpr.php` |
| React-API-Controller | `src/Controller/MelisReactApiProspectController.php`, `MelisReactApiProspectThemeController.php` |
| Klassische Controller | `src/Controller/ToolProspectsController.php`, `MelisCmsProspectsThemesController.php`, `MelisCmsProspectsThemeItemsController.php` |
| Hauptservice | `src/Service/MelisCmsProspectsService.php` |
| DSGVO-Auto-Delete-Service | `src/Service/` |
| Front-Formular-Plugin | `src/Controller/Plugin/MelisCmsProspectsShowFormPlugin.php` |
| Dashboard-Widget | `src/Controller/DashboardPlugins/MelisCmsProspectsStatisticsPlugin.php` |
| React-Bricks (Quelle / Build) | `ui-react/src/` → `public/ui-react/brick.js` + `brick.manifest.json` |
| Tabellen-Gateways | `src/Model/Tables/` |
| DSGVO-Listener & Bootstrap | `src/Module.php`, `src/Listener/` |

Siehe auch: [Modulreferenz](/de/reference/modules) · [melis-cms](/de/reference/modules/melis-cms) · [melis-core](/de/reference/modules/melis-core)
