# MelisCmsLinkCheck

> Link-Tester, der eine Seite (und optional ihre Unterseiten oder internen Links) durchsucht und jeden
> defekten Link sowie jedes defekte Bild aufzeichnet, wobei pro Seite ein Scan-Protokoll geführt wird. Paket `melisplatform/melis-cms-link-check`.

## Zweck

MelisCmsLinkCheck ist der Link-Tester von Melis. Er durchsucht eine Seite — optional folgt er dabei ihren Unterseiten oder
ihren internen Links — und zeichnet jeden defekten Link und jedes defekte Bild auf, das er findet, wobei pro gescannter Seite
ein Scan-Protokoll gespeichert wird. Der Crawl selbst (curl, Validierung, Protokolleintrag, Übersetzungen) findet serverseitig
im Laminas-Service `MelisCmsLinkCheckService::executeTest()` statt; das React-Backoffice ist eine
Präsentationsschicht, die Scans über die react-api-Endpunkte des Moduls liest und startet.

Im v6-React-Backoffice (`/melis-react`) liefert das Modul einen nativen Full-React-Brick mit zwei
Oberflächen:

- Ein Werkzeug **Link tester** im linken Menü — ein schreibgeschützter Betrachter vergangener Scan-Ergebnisse, ein Modal **Launch a scan**
  und ein Fehlerbericht pro Zeile, mit einem Umschalter **New / Old**, der auf das klassische Werkzeug
  in einem iframe zurückgreift.
- Ein Tab **Link Checker** im React-CMS-Seiteneditor, der einen Scan startet und darüber berichtet, beschränkt auf die
  eine gerade bearbeitete Seite.

## Aktivierung

Zu `config/melis.module.load.php` hinzufügen:

```php
return [
    'MelisCmsLinkCheck',
];
```

Beide Oberflächen sind aktivierungsgesteuert: Sie erscheinen nur, wenn das Modul aktiv ist und vom Host
über `GET /melis/react-api/react-modules` erkannt wird (das aktive Module auflistet, die eine `brick.manifest.json` mitliefern).
Das Deaktivieren des Moduls entfernt sowohl das Menüwerkzeug als auch den Tab im Seiteneditor.

## React-Backoffice im Überblick

| Element | Wert |
| --- | --- |
| Brick-Art | Nativ Full-React (mit New/Old-Legacy-iframe-Fallback) + ein Tab im Seiteneditor |
| Brick-ID | `cms-link-check` |
| Manifest-`route` | `/melis-cms-link-check/results` |
| `label` | `Testeur de liens` (Link tester) |
| `forwardKey` | `MelisCmsLinkCheck/MelisCmsLinkCheckList` |
| `melisKey` (Menü / Old-Ansicht-iframe / Rechte-Knoten) | `meliscmslinkcheck_tool` |
| Seiten-Tab-Schlüssel (= seine Berechtigung) | `meliscmslinkcheck_page_link_check_tab` |
| API-Basis | `/melis/react-api/cms-link-check` |
| React-api-Controller | `MelisReactApiLinkCheckController` (invokable `MelisReactApiLinkCheck`) |
| Tabelle (eigen) | `melis_cms_link_check_logs` |
| Scan-Service | `MelisCmsLinkCheckService::executeTest(...)` |

## Das Werkzeug Link tester

Linke Seitenleiste → der Knoten **Link tester** (*Testeur de liens*) öffnet das Werkzeug als oberen Tab. Die New-
Ansicht listet jedes Scan-Protokoll auf der Plattform auf, eine Zeile pro gescannter Seite.

![React-Werkzeug Link tester mit KPI-Karten, Filtern und der Ergebnisliste](/screenshots/react/melis-cms-link-check/meliscmslinkcheck-tool-linkchecker-list.png)

Die Liste verfügt über KPI-Karten (Gescannte Seiten, Gesamtfehler, Sites), ein Suchfeld (durchsucht Seiten-URL, Seiten-
ID, Site-Name/-Label), einen Site-Filter (nur Sites mit Protokollen), Filter zurücksetzen, einen Spaltenmanager
(Spalten ein-/ausblenden/umsortieren, lokal gespeichert) und einen Export. Klicken Sie auf einen Spaltenkopf, um zu sortieren (Standard:
neuester Scan zuerst). Fehleranzahlen werden als Badges angezeigt — grün bei 0, ansonsten rot (Fehler = gesamt,
Links, Bilder).

Jede Zeile hat vier Aktionen:

| Aktion | Symbol | Zweck |
| --- | --- | --- |
| Front ansehen | Auge | Öffnet die gescannte Seiten-URL in einem neuen Tab. |
| Seite bearbeiten | Stift | Öffnet die Seite im React-CMS-Seiteneditor und wechselt zu ihr. |
| Bericht | Dokument | Öffnet das Modal mit dem Fehlerbericht pro Seite. |
| Löschen | Papierkorb | Entfernt dieses Scan-Protokoll (benötigt die Berechtigung `delete`). |

Der Umschalter **New / Old** oben rechts wechselt das gesamte Werkzeug zwischen dem React-Betrachter (Standard) und dem
klassischen Werkzeug, das in einem iframe gerendert wird (`/melis/react-tool-page?key=meliscmslinkcheck_tool`), das
auch verwendet werden kann, um Scans auf die klassische Weise zu starten.

## Einen Scan starten

Die rote Schaltfläche **Launch a scan** (angezeigt, wenn Sie die Berechtigung `launch` haben) öffnet ein Modal.

![Modal Launch a scan mit Seitenauswahl, Bereichs-Radiobuttons und Prüf-Checkboxen](/screenshots/react/melis-cms-link-check/meliscmslinkcheck-tool-linkchecker-launchscan.png)

Wählen Sie die Startseite aus dem lazy geladenen CMS-Seitenbaum, wählen Sie einen **Bereich** und was **geprüft** werden soll, und klicken Sie dann auf
**Run**. Der Scan durchsucht die Seite(n), zeichnet die Ergebnisse auf, aktualisiert die Liste und sendet eine
Benachrichtigung.

- **Bereich** — Nur diese Seite / Diese Seite und ihre Unterseiten / Diese Seite und ihre internen Links
  (gesendet als `follow: '1' | '2' | '3'`).
- **Prüfen** — Links und/oder Bilder (gesendet als `options: ['LINK', 'IMG']`).

## Den Bericht einer Seite lesen

Die Aktion **Bericht** in einer Zeile öffnet die detaillierten Fehler für dieses Scan-Protokoll.

![Modal mit Fehlerbericht pro Seite in seinem sauberen Zustand](/screenshots/react/melis-cms-link-check/meliscmslinkcheck-tool-linkchecker-report.png)

Eine saubere Seite zeigt „✓ No error recorded for this page." Eine Seite mit Fehlern zeigt eine Tabelle: **Type**
(LINK-/IMG-Badge) · **URL** · **Details** (der Fehler). Das Detail stammt aus der geparsten XML-
Spalte `lcl_errors`, dekodiert in eine `errorList` aus `{ url, type, details }`.

## Eine Seite aus ihrem Editor prüfen

Öffnen Sie eine Seite im React-CMS-Seiteneditor und klicken Sie auf den Tab **Link Checker**. Er zeigt den letzten Scan
dieser Seite (Datum, Badges Fehler / Links / Bilder und die detaillierte Fehlertabelle oder eine saubere Meldung)
mit einer Schaltfläche **Re-scan** — oder **Launch a scan**, wenn die Seite nie gescannt wurde — die einen Scan
nur für diese Seite ausführt.

![Tab Link Checker im React-CMS-Seiteneditor mit einem seitenbezogenen Scan](/screenshots/react/melis-cms-link-check/meliscmslinkcheck-pageedition-tab-linkchecker-launchandreport.png)

Der Tab wird dem CMS-Seiteneditor über die Host-Bridge `window.__melisRegisterPageTab` beigesteuert
(im Besitz des CmsPage-Bricks), mit dem Schlüssel `meliscmslinkcheck_page_link_check_tab`; CmsPage rendert ihn mit
`{ idPage }`.

## React-API — Endpunkte

Die Routen befinden sich in `config/react-api.php`, bereitgestellt von
`MelisCmsLinkCheck\Controller\MelisReactApiLinkCheckController`. Alle unter
`/melis/react-api/cms-link-check`, mit dem Vertrag `{ success, data, error }`. Jeder Fetch sendet
`X-Requested-With: XMLHttpRequest` und `credentials: 'include'`.

| Methode & URL | Aktion | Zweck |
| --- | --- | --- |
| `GET /cms-link-check` | `list` | Scan-Protokolle (Keyset: `limit`, `search`, `site`, `sort`, `dir`, `after`) → `{items,total,nextCursor}` |
| `GET /cms-link-check/stats` | `stats` | KPI `{total, errors, sites}` |
| `GET /cms-link-check/sites` | `sites` | Site-Filteroptionen (nur in Protokollen vorhandene Sites) |
| `POST /cms-link-check/launch` | `launch` | Einen Scan ausführen (`{pageId, follow, options}`) → `{status,message,logIds,pagesVisited}` |
| `GET /cms-link-check/by-page/:idPage` | `byPage` | Letzter Scan EINER Seite (Seiteneditor-Tab); `data: null`, falls nie gescannt |
| `DELETE /cms-link-check/delete/:id` | `delete` | Ein Scan-Protokoll löschen |
| `GET /cms-link-check/:id` | `get` | Ein Protokoll + seine geparste `errorList:[{url,type,details}]` |

> Die Routenreihenfolge ist wichtig: `/stats`, `/sites`, `/launch`, `/by-page/:idPage` und `/delete/:id` werden
> vor der Catch-all-Route `/:id` deklariert.

Die Aktionen `list`, `stats`, `sites`, `get`, `by-page` und `delete` lesen `melis_cms_link_check_logs`
direkt über parametrisiertes SQL (`Laminas\Db\Adapter\AdapterInterface`). Nur `launch` delegiert an
`MelisCmsLinkCheckService::executeTest([...])` — den eigentlichen Crawl — umschlossen von `ob_start()` /
`ob_end_clean()`, damit Legacy-Warnungen das JSON nicht beschädigen. Die Seitenauswahl von Launch a scan verwendet einen
bestehenden Legacy-Endpunkt wieder (kein neues Backend):
`GET /melis/MelisCms/TreeSites/get-tree-pages-by-page-id?nodeId=<id>` (`nodeId=-1` → Root-Sites).

## Berechtigungen

Deklariert in `config/react.capabilities.php` unter zwei rechtetragenden Knoten:

```php
return [
  'melisReactToolCapabilities' => [
    'meliscmslinkcheck_tool' => ['list', 'launch', 'delete', 'export'],
    'meliscms_page' => [
      'tabs' => [
        ['key' => 'meliscmslinkcheck_page_link_check_tab', 'label' => 'tr_meliscmslinkcheck_page_link_check_tab'],
      ],
    ],
  ],
];
```

- **Werkzeug-Berechtigungen** — `list` (der gesamte schreibgeschützte Betrachter: list/stats/sites/report), `launch` (einen
  Scan ausführen), `delete` (ein Protokoll löschen), `export` (die Schaltfläche Export; der Export verwendet den `list`-Endpunkt wieder). In
  React steuern sie die UI über `MelisCan('meliscmslinkcheck_tool', cap)`; serverseitig ist jede Aktion
  durch `denyUnlessAccess()` und anschließend `denyUnlessCan('list'|'launch'|'delete')` geschützt.
- **Seiten-Tab-Berechtigung** — der `key` `meliscmslinkcheck_page_link_check_tab` muss dem Schlüssel entsprechen, der an
  `window.__melisRegisterPageTab` übergeben wird; er *ist* die Berechtigung des Tabs. Ohne diese Deklaration blendet die
  CMS-Seiten-Berechtigungs-Whitelist die Tab-Schaltfläche selbst für einen Administrator aus. Der `by-page`-Endpunkt des Tabs
  ist nur durch die Session-Authentifizierung geschützt (er ist eine Unterfunktion des Seiteneditors); die Schaltfläche durch diese Berechtigung.

## Datenbanktabellen

| Tabelle | Rolle |
| --- | --- |
| `melis_cms_link_check_logs` | Ein Scan-Protokoll pro gescannter Seite: Anzahl defekter Links / defekter Bilder sowie die detaillierte Fehlerliste, gespeichert als XML in der Spalte `lcl_errors`. |

## Legacy-Controller (Old-Ansicht)

Verwendet vom New/Old-iframe-Fallback und dem klassischen Werkzeug, nicht vom React-Betrachter:

| Controller | Rolle |
| --- | --- |
| `MelisCmsLinkCheckListController` | Klassische Werkzeugseite + ihre Ergebnis-DataTables. |
| `MelisCmsLinkCheckLaunchController` | Klassisches Launch-Modal / -Formular (Seite + Bereich + Prüfung). |
| `MelisCmsLinkCheckPageLinkCheckController` | Klassischer Link-Check-Tab in der Seitenbearbeitung (`renderPageLinkCheckAction`, `{ idPage }`). |

## Wichtige Dateien

| Aspekt | Pfad |
| --- | --- |
| React-api-Routen + invokable | `config/react-api.php` |
| Berechtigungen | `config/react.capabilities.php` |
| Legacy-Werkzeugkonfiguration | `config/app.*.php` |
| React-api-Controller | `src/Controller/MelisReactApiLinkCheckController.php` |
| Scan-Service | `src/Service/MelisCmsLinkCheckService.php` |
| React-Brick-Quelle | `ui-react/src/` (`brick.tsx`, `LinkCheckPage.tsx`, `linkcheck-api.ts`, …) |
| Gebauter Brick + Manifest | `public/ui-react/brick.js`, `public/ui-react/brick.manifest.json` |
