# MelisCmsPageAnalytics

> Grundlegende Analyse der Seitenaufrufe für CMS-Sites — erfasst Seitenaufrufe und ermöglicht es einer
> Site, einen externen Analytics-Anbieter (z. B. Google Analytics) einzubinden, jetzt gesteuert über
> ein natives React-Backoffice.
> Paket `melisplatform/melis-cms-page-analytics`.

## Zweck

`MelisCmsPageAnalytics` ist der integrierte Seitenaufruf-Tracker der Plattform. Bei jedem Seitenrendering
im Frontoffice erfasst er einen entdeduplizierten Besuch (einmal pro Sitzung, pro Seite, pro Tag) in
`melis_cms_page_analytics` und stellt die Daten im Backoffice als Site-Werkzeug **Page Analytics** sowie
als Registerkarte **Page Analytics** auf jeder CMS-Seite bereit. Pro Site können Sie außerdem einen
Analytics-Anbieterschlüssel und ein JavaScript-Snippet speichern, das das Modul beim Rendern in den
`<head>` der Seite einfügt — der Hook, den Zusatz-Anbieter wie Google Analytics nutzen.

In v6 ist das Backoffice ein **natives Voll-React-Modul (Brick)**: eine schreibgeschützte Besuchstabelle
sowie ein Einstellungsbereich, die eine `react-api`-JSON-Schicht aufrufen. Tracking, der Anbieter-Vertrag
und die Persistenz der Einstellungen bleiben unverändert — v6 ersetzt lediglich die Darstellungsschicht.

## Aktivierung

Fügen Sie Folgendes zu `config/melis.module.load.php` hinzu:

```php
return [
    'MelisCmsPageAnalytics',
];
```

Erforderliche Composer-Abhängigkeiten: `melisplatform/melis-core` und `melisplatform/melis-cms`. Das Modul
ist zur Laufzeit außerdem auf die Dienste `melis-engine` und `melis-front` angewiesen (Baum, Seitentabellen,
Front-Dispatch-Ereignisse). Die Datenbanktabellen werden über `MelisSetupController` aus `install/sql/`
installiert. Das React-Modul (Brick) erscheint nur dann im Menü, wenn das Modul in `melis.module.load.php`
aufgeführt ist (modulare Brick-Erkennung).

## Zentrale Dienste

Als `service_manager`-Aliase in `config/module.config.php` registriert:

| Dienst-Alias | Rolle |
| --- | --- |
| `MelisCmsPageAnalyticsService` | Hauptdienst, der den Anbieter-Vertrag implementiert. `getAnalytics($siteId)` liest den aktiven Anbieterschlüssel aus `melis_cms_page_analytics_data` und die passende Einstellungszeile aus `melis_cms_page_analytics_data_settings`. |
| `MelisCmsDefaultPageAnalyticsService` | Integrierter Rekorder. `saveAnalyticsData($pageId)` ermittelt die Site, bestätigt, dass die Seite aktiv/veröffentlicht ist, und fügt eine entdeduplizierte Zeile in `melis_cms_page_analytics` ein — es sei denn, eine Google-Analytics-View-ID und ein Token sind konfiguriert; in diesem Fall tritt der integrierte Zähler zurück. |
| `MelisCmsPageAnalyticsTable` | Table-Gateway für das Besuchsprotokoll. |
| `MelisCmsPageAnalyticsDataTable` | Table-Gateway für die Anbieterauswahl je Site. |
| `MelisCmsPageAnalyticsDataSettingsTable` | Table-Gateway für Einstellungen je (Site, Anbieter). |

Beide Hauptdienste lösen Start-/Ende-Ereignisse aus: `melis_cms_default_page_analytics_save_start` /
`melis_cms_default_page_analytics_save_end`.

## Frontoffice

Es gibt weder einen View-Helper noch ein Templating-Plugin. Tracking und Skript-Injektion werden von
`MelisCmsPageAnalyticsListener` (in `Module.php` angebunden) übernommen, der zwei Ereignisse in der
Front-Render-Pipeline abfängt:

| Ereignis | Priorität | Aktion |
| --- | --- | --- |
| `melisfront_site_dispatch_ready` | `-10000` | Nur Front-Renderings — ruft `MelisCmsDefaultPageAnalyticsService::saveAnalyticsData($pageId)` auf, um den entdeduplizierten Besuch zu erfassen. |
| `melis_front_layout` | Standard | Liest das für die Site konfigurierte `pads_js_analytics`-Snippet und fügt es vor `</head>` des gerenderten HTML ein. |

## Datenbanktabellen

| Tabelle | PK | Enthält |
| --- | --- | --- |
| `melis_cms_page_analytics` | `ph_id` | Besuchsprotokoll (entdeduplizierte Treffer): `ph_page_id`, `ph_session_id`, `ph_date_visit`, `ph_site_id`. Es wird keine IP-Adresse gespeichert. |
| `melis_cms_page_analytics_data` | `pad_id` | Anbieterauswahl je Site: `pad_site_id`, `pad_analytics_key`. |
| `melis_cms_page_analytics_data_settings` | `pads_id` | Einstellungen je (Site, Anbieter): `pads_site_id`, `pads_analytics_key`, `pads_js_analytics`, `pads_settings` (z. B. `google_analytics_view_id`). |

## React-Backoffice

Das Werkzeug ist ein **natives Voll-React-Modul (Brick)** mit einem Umschalter **New / Old**, der auf das
Legacy-Werkzeug in einem iframe zurückgreifen kann. Es befindet sich in der Seitenleiste unter
**Marketing / Site Tools → Page Analytics** und öffnet sich mit zwei internen Registerkarten,
**Analytics** und **Settings**.

| Brick-Eigenschaft | Wert |
| --- | --- |
| Brick-ID | `pageanalytics` |
| Manifest-`route` | `/melis-marketing/meliscms-page-analytics` |
| `forwardKey` | `MelisCmsPageAnalytics/MelisCmsPageAnalyticsTool` |
| `melisKey` (iframe-Ziel der Old-Ansicht) | `meliscms_page_analytics_display` |
| Zugriffsschutz-Knoten (Controller) | `meliscms_page_analytics_tools_section` |
| API-Basis | `/melis/react-api/page-analytics` |

- **Registerkarte Analytics** — eine schreibgeschützte Besuchstabelle, **pro Seite aggregiert** (Seiten-ID,
  Seitenname, Besuchsanzahl, letzter Besuch), mit KPI-Karten (Treffer / Seiten / Sites / letzter Besuch),
  einem Site-Filter, Suche, einem Spaltenmanager, unendlichem Scrollen, serverseitiger Sortierung und
  **Export**. Gelöschte Seiten zeigen ein kursives Label *(deleted)*. Wenn der ausgewählten Site ein
  Drittanbieter zugewiesen ist, der eine eigene React-Darstellung mitbringt, hostet die Registerkarte
  **das Dashboard dieses Moduls** anstelle der integrierten Tabelle.
- **Registerkarte Settings** — wählen Sie eine **Site** und dann ein **Analytics module** (die integrierte
  Option „no analytics“ sowie jeden aktiven Anbieter). Die eigenen Felder des gewählten Moduls werden
  datengesteuert gerendert (Text / Textarea / Auswahl / Passwort / Datei, z. B. ein privater
  Google-Analytics-Schlüssel). Plattformadministratoren können außerdem das benutzerdefinierte
  `<head>`-JS-Snippet bearbeiten; Nicht-Administratoren sehen es schreibgeschützt.

> React-Screenshots dieser Ansichten sind noch nicht verfügbar.

## React-API

Die Routen sind in `config/react-api.php` definiert und werden in die Modulkonfiguration eingebunden. Der
Vertrag lautet `{ success, data, error }`; jede Anfrage sendet `X-Requested-With: XMLHttpRequest` und
`credentials: 'include'`. Zwei Controller stützen die Benutzeroberfläche: `MelisReactApiPageAnalyticsController`
(das Werkzeug) und `MelisReactApiPageAnalyticsTabController` (die Registerkarte im CMS-Seiteneditor).

| Methode & URL | Zweck |
| --- | --- |
| `GET /melis/react-api/page-analytics` | Besuche pro Seite aggregiert (Keyset: `limit`, `search`, `site`, `sort`, `dir`, `after`) → `{items,total,nextCursor}`, jedes Element `{pageId,pageName,count,lastVisit}`. |
| `GET /melis/react-api/page-analytics/stats` | KPI `{hits, pages, sites, lastVisit}` (berücksichtigt `search`/`site`). |
| `GET /melis/react-api/page-analytics/sites` | Site-Optionen `{sites:[{id,name}]}` für die Auswahl. |
| `GET /melis/react-api/page-analytics/settings` | Zustand der Settings-Registerkarte (Modulliste + datengesteuertes Formularschema + aktuelle Werte). |
| `GET /melis/react-api/cms-page/analytics` | Besuche einer einzelnen Seite (`idPage`, `page`, `perPage`) → `{visits, sessions, lastVisit, recent, page, perPage, recentTotal}`. |

Der Werkzeug-Controller liest die Tabellen direkt über parametrisiertes SQL (`melis_cms_page_analytics`
verknüpft mit `melis_cms_page_published` für die Namen und `melis_cms_site` für die Auswahl, opaker
Keyset-Cursor). Er schützt den Zugriff über den rechteführenden Knoten
`meliscms_page_analytics_tools_section` — **nicht** über den Manifest-`melisKey`
(`meliscms_page_analytics_display`), der lediglich der iframe-Zonenschlüssel der Old-Ansicht ist.

**Das Schreiben der Einstellungen ist keine react-api-Route** — der Settings-Bereich sendet per POST eine
`FormData`-Payload an die Legacy-Werkzeugaktion, sodass die gesamte serverseitige Logik
(Laminas-Validierung, GA-Schlüssel-Upload, `pads_settings`-Serialisierung, Admin-Schutz für das rohe JS,
Flash Messenger) wortwörtlich wiederverwendet wird:

```ts
const LEGACY_SAVE_URL = '/melis/MelisCmsPageAnalytics/MelisCmsPageAnalyticsTool/save'
await fetch(LEGACY_SAVE_URL, {
  method: 'POST',
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
  credentials: 'include',
  body: formData,
}) // → { success, textTitle, textMessage, errors }
```

## CMS-Seitenregisterkarte und Fähigkeiten

Das Modul steuert eine Registerkarte **Page Analytics** zum CMS-Seiteneditor bei, gestützt auf
`GET /melis/react-api/cms-page/analytics` (Gesamtbesuche, eindeutige Sitzungen, letzter Besuch und eine
seitenweise Liste der letzten Besuchsdaten für diese Seite). Die Registerkarte wird in
`config/react.capabilities.php` unter dem gemeinsamen Knoten `meliscms_page` deklariert, und der Schlüssel
`meliscms_page_analytics_tab` **ist** die Capability-Zeichenkette, mit der der Zugriff in Users → Rights
gesteuert wird:

```php
'melisReactToolCapabilities' => [
  'meliscms_page' => [
    'tabs' => [
      ['key' => 'meliscms_page_analytics_tab', 'label' => 'tr_melis_cms_page_analytics_title'],
    ],
  ],
],
```

## Modulare Darstellung auf Site-Ebene

Wenn einer Site ein Drittanbieter-Analytics-Modul zugewiesen ist, das eine React-Darstellung deklariert
(z. B. **MelisCmsGoogleAnalytics** über `react_display_key`), hostet die Registerkarte Analytics die
eigene React-Darstellung dieses Moduls anstelle der nativen Besuchstabelle. Der Brick nutzt eine globale
Registry, `window.__melisAnalyticsSiteDisplays[<analyticsKey>]`; er prüft beim Fenster-Ereignis
`melis:analytics-site-display-registered` erneut (Bundles werden asynchron geladen) und greift, falls
nichts registriert ist, auf ein iframe `/melis/react-tool-page?key=<displayKey>&siteId=<site>` zurück.

## Beispiel

```php
// Read the active analytics provider config for a site
$analytics = $serviceManager->get('MelisCmsPageAnalyticsService')->getAnalytics($siteId);

// Read recorded visits for a specific page (used by the Page Analytics tab)
$visits = $serviceManager->get('MelisCmsPageAnalyticsTable')->getDataByPageId($pageId);
```

Die Erfassung der Besuche erfolgt beim Front-Rendering automatisch über den Listener; der direkte Aufruf
von `saveAnalyticsData()` ist normalerweise nicht erforderlich.

## Zentrale Dateien

| Themenbereich | Pfad |
| --- | --- |
| Modul-Bootstrap / Listener-Registrierung | `vendor/melisplatform/melis-cms-page-analytics/src/Module.php` |
| Routen, Dienste, Table-Aliase, Controller | `vendor/melisplatform/melis-cms-page-analytics/config/module.config.php` |
| React-API-Routen | `vendor/melisplatform/melis-cms-page-analytics/config/react-api.php` |
| React-Registerkarten-Capability | `vendor/melisplatform/melis-cms-page-analytics/config/react.capabilities.php` |
| React-Brick + Manifest | `vendor/melisplatform/melis-cms-page-analytics/public/ui-react/` |
| React-Quellen | `vendor/melisplatform/melis-cms-page-analytics/ui-react/src/` |
| React-API-Controller | `vendor/melisplatform/melis-cms-page-analytics/src/Controller/MelisReactApiPageAnalyticsController.php`, `MelisReactApiPageAnalyticsTabController.php` |
| Anbieter-Vertrag | `vendor/melisplatform/melis-cms-page-analytics/src/Service/MelisCmsPageAnalyticsServiceInterface.php` |
| Haupt-Analytics-Dienst | `vendor/melisplatform/melis-cms-page-analytics/src/Service/MelisCmsPageAnalyticsService.php` |
| Integrierter Rekorder | `vendor/melisplatform/melis-cms-page-analytics/src/Service/MelisCmsDefaultPageAnalyticsService.php` |
| Front-Listener (Tracking + Injektion) | `vendor/melisplatform/melis-cms-page-analytics/src/Listener/MelisCmsPageAnalyticsListener.php` |
| Table-Gateways | `vendor/melisplatform/melis-cms-page-analytics/src/Model/Tables/` |
| DB-Installations-SQL | `vendor/melisplatform/melis-cms-page-analytics/install/sql/` |

Siehe auch: [melis-cms](/de/reference/modules/melis-cms), [melis-core](/de/reference/modules/melis-core)
