# MelisCmsGoogleAnalytics

> Google-Analytics-4-(GA4-)Provider, der die konfigurierte GA4-Property einer Website in Sitzungskurven, KPI-Summen und demografische Daten innerhalb des Melis-React-Backoffice überführt. Paket `melisplatform/melis-cms-google-analytics`.

## Zweck

MelisCmsGoogleAnalytics liest die GA4-Property einer Website serverseitig aus (über `google/apiclient` +
`google/analytics-data`) und stellt sie als Diagramme im React-Backoffice dar. Es handelt sich um einen
**reinen Anzeige-Provider**: Das Aktivieren von GA für eine Website — Auswahl des Providers, Eingabe der **Property ID** und
Hochladen des **Private-Key-JSON** des Dienstkontos — erfolgt im Werkzeug **Site analytics**, das zu
`melis-cms-page-analytics` gehört, nicht in diesem Modul.

Das Modul liefert **zwei Oberflächen auf Basis einer einzigen Dashboard-Komponente**:

- Ein **Google-Analytics-Tab** im React-CMS-Seiteneditor, der GA-Statistiken **für die geöffnete Seite** anzeigt
  (gefiltert nach Seitenpfad).
- Eine **native React-Anzeige auf Website-Ebene**, die in das Werkzeug **Site analytics** eingebettet wird und GA-Statistiken
  **für die gesamte Website** anzeigt, sofern das *Analytics-Modul* dieser Website auf Google Analytics gesetzt ist.

![Google-Analytics-Tab im React-CMS-Seiteneditor — Sitzungskurve, KPI-Karten und demografische Daten Sprache/Land/Stadt für die geöffnete Seite](/screenshots/react/melis-cms-google-analytics/meliscmsgoogleanalytics-pageedition-tab-googleanalytics.png)

![Google-Analytics-Anzeige auf Website-Ebene im Werkzeug Site analytics — dasselbe GA4-Dashboard, bezogen auf die gesamte Website](/screenshots/react/melis-cms-google-analytics/meliscmsgoogleanalytics-tool-tab-analytics.png)

## Aktivieren

Das Modul wird vom React-Host beim Start über `GET /melis/react-api/react-modules` erkannt, das
die aktiven Module auflistet, die eine `brick.manifest.json` mitbringen. Beim Deaktivieren des Moduls werden beide Oberflächen entfernt.

Composer-Abhängigkeiten: `google/apiclient ^2.15`, `google/analytics-data ^0.16.0`, `melis-core`,
`melis-cms`, `melis-cms-page-analytics`.

## Der React-Brick

Dies ist ein **Seiteneditor-TAB-Brick** (nur Widget): Er hat **kein Werkzeug im linken Menü**, **keine Route** und
**keine `react-api.php`**. Das Manifest hat die Multi-Brick-Form mit einem einzigen Eintrag, der nur eine ID enthält, sodass der
Host das Bundle beim Start lädt und der Brick sich frühzeitig selbst registriert.

```json
{ "entry": "brick.js", "bricks": [ { "id": "cms-google-analytics" } ] }
```

`brick.tsx` ruft `__melisRegisterBrick` nicht auf; stattdessen führt es zur Zeitpunkt der
Modulauswertung zwei Registrierungen durch:

```tsx
// 1) Contribute a tab to the CMS page editor (owned by the CmsPage brick).
registerPageTab('melis_cms_google_analytics_page_tab', GoogleAnalyticsPageTab)

// 2) Register the native site-level display for the PageAnalytics host to mount by key.
;(window.__melisAnalyticsSiteDisplays ||= {})['melis_cms_google_analytics'] = GoogleAnalyticsSiteDisplay
window.dispatchEvent(new CustomEvent('melis:analytics-site-display-registered'))
```

| Komponente | Rolle |
| --- | --- |
| `brick.tsx` | Nur Registrierung — fügt den Seiten-Tab und die Website-Anzeige hinzu; kein gerouteter Brick. |
| `GoogleAnalyticsPage.tsx` (`GoogleAnalyticsPageTab`) | Seiteneditor-Tab. Empfängt `{ idPage }`, ermittelt Website + Pfad der Seite über `getPageContext` und mountet dann das Dashboard mit `siteId` + `pagePath`. |
| `GoogleAnalyticsSiteDisplay.tsx` | Das Dashboard: Umschalter für den Zeitraum, inline eingebettetes SVG-Sitzungsdiagramm, KPI-Karten, drei Tabellen mit demografischen Daten. Von beiden Oberflächen wiederverwendet (`pagePath` vorhanden ⇒ seitenbezogen, nicht vorhanden ⇒ gesamte Website). |

Da React auf Host-Globals ausgelagert ist, kann das Bundle keine Host-Module importieren, daher die
**Inline-Styles**, die **In-Datei-i18n `{fr,en}`** (aus `document.documentElement.lang`) und ein
**handgezeichnetes SVG-Diagramm** (keine Diagramm-Bibliothek). Das Google-SDK wird niemals clientseitig verwendet.

## Das Dashboard

Beide Oberflächen rendern dasselbe Dashboard:

- **Zeitraum-Steuerung** — **7 Tage** / **30 Tage** / **Benutzerdefiniert** (Datumsauswahl für Start & Ende +
  **Anwenden**) und eine Schaltfläche zum **Aktualisieren**. Das Enddatum ist standardmäßig heute (GA4-Intraday eingeschlossen).
- **Sitzungen über den Zeitraum** — ein Linien-/Flächendiagramm der Sitzungen pro Tag.
- **KPI-Karten** — Sitzungen, Nutzer, Seitenaufrufe, Seiten/Sitzung, durchschnittliche Sitzungsdauer, Absprungrate.
- **Demografische Daten** — drei Tabellen (Sprache, Land, Stadt), jeweils nach Sitzungen sortiert mit einem Anteil in %.

Ist GA für die Website nicht konfiguriert oder schlägt die API fehl, zeigt ein rotes Fehlerfeld die Backend-Meldung
(z. B. „GA settings incomplete") anstelle der Diagramme an.

**So finden Sie es:** pro Seite → **MelisCms** → eine Seite öffnen → Tab **Google Analytics**. Pro Website →
**MelisMarketing** → **Site analytics** → Website auswählen → Unter-Tab **Analytics**. GA wird für
eine Website unter **Site analytics → Settings** aktiviert (Analytics-Modul = Google Analytics, Property ID, Upload des Private-Key-JSON, optionales benutzerdefiniertes Analytics-Skript).

![Unter-Tab Settings von Site analytics — Analytics-Modul auf Google Analytics gesetzt, Property ID, Upload des Private-Key-JSON und benutzerdefiniertes Analytics-Skript](/screenshots/react/melis-cms-google-analytics/meliscmsgoogleanalytics-tool-tab-settings.png)

## Daten-Endpunkte

Das Modul hat **keine `config/react-api.php`**. Die React-Oberfläche ruft den bereits vorhandenen
`GoogleAnalyticsController` auf (Route `application-MelisCmsGoogleAnalytics/default`, `ViewJsonStrategy`).

| Methode & URL | Aktion | Zweck |
| --- | --- | --- |
| `GET /melis/MelisCmsGoogleAnalytics/GoogleAnalytics/getPageContext?idPage=<id>` | `getPageContextAction` | Ermittelt die zugehörige Website + den Pfad einer Seite → `{ success, siteId, pagePath, pageURL }`. |
| `POST /melis/MelisCmsGoogleAnalytics/GoogleAnalytics/getChartData` | `getChartDataAction` | Ruft GA4-Daten für eine Website ab (optional einen Seitenpfad) → `{ success, chartData, errors }`. |

Der Body von `getChartData` ist form-kodiert:

```ts
const body = new URLSearchParams()
body.set('siteId', String(siteId))
body.set('dateRange[option]', option)          // '7days' | '30days' | 'custom'
body.set('dateRange[startDate]', startDate)    // '7daysAgo' | '30daysAgo' | 'YYYY-MM-DD'
body.set('dateRange[endDate]', endDate)        // 'today' | 'YYYY-MM-DD'
body.set('dateRange[clientTimestamp]', String(Date.now()))
if (pagePath) body.set('pagePath', pagePath)   // page tab only → GA4 dimensionFilter on pagePath
```

Struktur von `chartData`, die von der Oberfläche verarbeitet wird:

- `chartData.date.totals{}` → KPI-Werte (`sessions`, `activeUsers`, `screenPageViews`,
  `screenPageViewsPerSession`, `averageSessionDuration`, `bounceRate`).
- `chartData.date.plot{ <tsSeconds>: { sessions } }` → die Sitzungskurve (Schlüssel sind Sekunden).
- `chartData.language / .country / .city` → die Tabellen mit demografischen Daten (`{ value: { sessions } }`).

Serverseitig ruft `getChartDataAction` die GA4-Dienste auf (`GoogleAnalytics4APIService` /
`MelisCmsGoogleAnalyticsService`, aliasiert in `module.config.php`), die die Property ID und
das Private-Key-JSON der Website verwenden und GA4-Zeilen in `chartData` normalisieren. Bei einem API-Fehler gibt die Aktion ein
sauberes `{ success:false, errors }` anstelle eines 500 zurück.

## Berechtigungen

Deklariert in `config/react.capabilities.php` und zusammengeführt durch `Module::getConfig()`. Da das Modul
einen Tab zum CMS-Seitenwerkzeug beisteuert, deklariert es seine Berechtigung unter dem gemeinsam genutzten,
rechtetragenden Knoten **`meliscms_page`** (ein `ArrayUtils::merge` führt die `tabs[]` in die Berechtigungen des CMS-Seitenwerkzeugs zusammen):

```php
return [
  'melisReactToolCapabilities' => [
    'meliscms_page' => [
      'tabs' => [
        ['key' => 'melis_cms_google_analytics_page_tab', 'label' => 'tr_melis_cms_google_analytics'],
      ],
    ],
  ],
];
```

- Der `key` **muss dem** Schlüssel entsprechen, der an `window.__melisRegisterPageTab` in `brick.tsx` übergeben wird — er *ist*
  die Berechtigung des Tabs. Ohne ihn verbirgt die Berechtigungs-Whitelist der CMS-Seite die Tab-Schaltfläche selbst für einen Administrator.
- Es gibt **keine Backend-Berechtigung** zu deklarieren: Das Modul stellt keine `react-api`-Aktion bereit. Der Zugriff wird
  über den Zugang zum CMS-Seiteneditor (Seiten-Tab) und zum Werkzeug Site analytics (Website-Anzeige) gesteuert.

## Host-Integration

- **Seiten-Tab-Brücke (`__melisRegisterPageTab`)** — bereitgestellt vom CmsPage-Brick. Beide Bricks teilen sich
  eine idempotente Schutzvorrichtung: Wer zuerst lädt, erstellt `window.__melisPageTabRegistry` und definiert den
  Registrar. CmsPage liest `tabs['melis_cms_google_analytics_page_tab']` und rendert die Komponente
  mit `{ idPage }`; die Schaltfläche erscheint nur, wenn die Berechtigung erteilt wurde.
- **Website-Anzeige-Brücke (`__melisAnalyticsSiteDisplays`)** — bereitgestellt/genutzt vom Werkzeug
  *Site analytics* aus `melis-cms-page-analytics`. Der Brick registriert seine Komponente unter dem Schlüssel
  `melis_cms_google_analytics` (passend zum gespeicherten `pad_analytics_key` der Website) und löst
  `melis:analytics-site-display-registered` aus. Der Host mountet sie (mit `{ siteId }`) im Unter-Tab Analytics,
  wenn das *Analytics-Modul* der Website = Google Analytics ist — und ersetzt so den alten iframe durch
  natives React.
- **Generische Bestandteile verbleiben im Host.** Die Hülle des Seiteneditor-Tabs, das Werkzeug Site analytics, der
  Website-Selektor und das Settings-Formular gehören zu MelisCms / MelisCmsPageAnalytics; dieses Modul füllt nur
  die *Google-Analytics*-Anzeige.

## Wichtige Dateien

| Belang | Pfad |
| --- | --- |
| Routen / GA-Dienst-Aliasse | `config/module.config.php` |
| React-Berechtigungen (`meliscms_page.tabs[]`) | `config/react.capabilities.php` |
| Controller (`getPageContextAction`, `getChartDataAction`) | `src/Controller/GoogleAnalyticsController.php` |
| React-Brick-Quelle (Vite IIFE) | `ui-react/src/brick.tsx`, `GoogleAnalyticsPage.tsx`, `GoogleAnalyticsSiteDisplay.tsx` |
| Gebauter Brick + Manifest | `public/ui-react/brick.js`, `public/ui-react/brick.manifest.json` |

Siehe auch: [melis-cms-page-analytics](/de/reference/modules/melis-cms-page-analytics) ·
[melis-cms](/legacy/reference/modules/melis-cms) ·
[melis-core](/legacy/reference/modules/melis-core)
