# MelisCmsPageHistoric

> Audit-Protokoll für die Bearbeitung von CMS-Seiten — erfasst, wer wann welche Aktion an einer Seite durchgeführt hat, dargestellt als Historic-Tab im React-Seiteneditor und als Dashboard-Widget. Paket `melisplatform/melis-cms-page-historic`.

## Zweck

`MelisCmsPageHistoric` erfasst automatisch jede Seitenaktion (Speichern, Veröffentlichen, Veröffentlichung zurücknehmen, Löschen)
zusammen mit der Identität des Autors und einem Zeitstempel. Die Historie wird über Event-Listener geschrieben, die in den
Lebenszyklus der CMS-Seite eingehängt sind — es muss nichts pro Seite eingerichtet werden. Das Protokoll wird **schreibgeschützt** angezeigt: in einem
**Historic-Tab** innerhalb des Seiteneditors und in einem **Recent page activity**-Dashboard-Widget. Es dient
der Nachvollziehbarkeit, nicht dem Wiederherstellen von Seiten.

## Aktivierung

In `config/melis.module.load.php` hinzufügen:

```php
return [
    'MelisCmsPageHistoric',
];
```

Führen Sie die mitgelieferten `install/dbdeploy/`-Deltas aus, um die Historien-Tabelle zu erstellen (`extra.dbdeploy: true`).
Erfordert `melis-core`, `melis-engine`, `melis-front` und `melis-cms`.

## Ein Modul ohne Brick

Dies ist ein ungewöhnliches React-Modul: Es liefert **keinen eigenen Brick** aus (kein `ui-react/`, keine
`public/ui-react/brick.manifest.json`, kein Vite-Bundle). Sein React-Footprint besteht aus drei PHP-Konfigurationsdateien,
die von `Module::getConfig()` zusammengeführt werden, plus einem Controller und einem Legacy-Dashboard-Plugin. Beide React-Oberflächen
erscheinen **nur, solange das Modul aktiv ist**.

| Konfigurationsdatei | Beitrag |
| --- | --- |
| `config/react-api.php` | Der Endpunkt `GET /melis/react-api/cms-page/historic` + aufrufbarer Controller |
| `config/react.capabilities.php` | Die Berechtigung für den Historic-Tab unter dem gemeinsamen Knoten `meliscms_page` |
| `config/app.interface.php` | Der **Button** des Historic-Tabs im CMS-Seiteneditor (Symbol `history`) |

Die React-Komponente, die innerhalb des Historic-Tabs gerendert wird, wird **nicht von diesem Modul ausgeliefert** — sie wird
host-seitig von der melis-core-Shell bereitgestellt und über die Page-Tab-Registry eingebunden
(`window.__melisRegisterPageTab('melispagehistoric_historic', Component)`). Dieses Modul steuert
lediglich den Daten-Endpunkt, die Berechtigung und die Deklaration des Tab-Buttons bei; der CMS-Seiteneditor
(MelisCms) hostet den Tab.

## Historic-Tab (React-Seiteneditor)

Linke Seitenleiste → **MelisCms** → eine **Seite** öffnen → der **Historic**-Tab in der Tab-Zeile des Editors. Er
zeigt eine schreibgeschützte Tabelle der Aktionen **dieser Seite**, die neuesten zuerst, mit den Spalten **Date**, **Action**
(farbige Badges Publish / Save / Unpublish) und **User**. Ein Dropdown **Filter (All actions)**
schränkt auf einen einzelnen Aktionstyp ein. Die Liste ist **serverseitig paginiert** — sie lädt niemals die gesamte
Historie auf einmal.

![Historic-Tab im React-CMS-Seiteneditor mit der Seitenhistorie-Tabelle mit den Spalten Date, Action-Badges und User sowie einem Aktionsfilter](/screenshots/react/melis-cms-page-historic/meliscmspagehistoric-page-tab-historic.png)

Der Tab zeigt ausschließlich die Historie der aktuellen Seite. Für Aktivitäten über *alle* Seiten hinweg verwenden Sie das
Dashboard-Widget weiter unten.

## Dashboard-Widget „Recent page activity“

Auf dem Back-Office-**Dashboard** listet das Widget **Recent page activity** die neuesten Seitenaktionen
aller Benutzer auf (Zeitstempel · Statuspunkt · Seitenname + ID · Aktion · Benutzer). Es wird
über das Panel „Add a widget“ hinzugefügt bzw. entfernt wie jedes andere Dashboard-Widget, unter der Gruppe **MELIS CMS
PAGE HISTORIC**.

![Dashboard-Widget Recent page activity mit den neuesten Seitenaktionen, daneben das Panel Add a widget, das es unter Melis Cms Page Historic anzeigt](/screenshots/react/melis-cms-page-historic/meliscmspagehistoric-dashboard-plugin-recentactivity.png)

Dieses Widget ist nach wie vor ein **Legacy-PHP-Dashboard-Plugin**
(`MelisCmsPageHistoricRecentUserActivityPlugin`, Aktion `recentActivityPages`), das innerhalb des
Widget-Hosts des React-Dashboards gerendert wird — es gibt keine React-Neufassung. Es liest über
`MelisPageHistoricTable->getPagesHistoricForDashboard()` und ist daran gebunden, dass MelisCms aktiv ist sowie an das
Zugriffsrecht für Dashboard-Plugins.

## React-API — der Historic-Endpunkt

Deklariert in `config/react-api.php`, Controller
`MelisCmsPageHistoric\Controller\MelisReactApiPageHistoricController` (aufrufbarer Alias
`MelisReactApiPageHistoric`). Eine Aktion, Contract `{ success, data, error }`.

| Methode & URL | Aktion | Zweck |
| --- | --- | --- |
| `GET /melis/react-api/cms-page/historic?idPage=<id>&page=<n>&perPage=<25>&action=<type>` | `listAction` | Die Audit-Zeilen der aktuellen Seite, serverseitig paginiert, plus die eindeutigen Aktionstypen für das Filter-Dropdown |

Struktur von `data` in der Antwort:

```jsonc
{ "success": true, "data": {
  "idPage": 1,
  "items": [ { "id": 123, "date": "2026-08-18 10:10:25", "action": "Publish",
               "user": "John Doe", "userId": 1 } ],   // newest first (ORDER BY hist_id DESC)
  "page": 1, "perPage": 25, "total": 87,               // total = indexed COUNT → drives paging
  "action": "",                                        // active action filter ('' = all)
  "actionTypes": ["Publish", "Save", "Unpublish"]      // DISTINCT hist_action for the filter select
} }
```

Hinweise zur Implementierung:

- **Guard:** Die Aktion prüft ausschließlich `MelisCoreAuth->hasIdentity()` (gibt `401` zurück, wenn
  nicht authentifiziert). Sie erzwingt **keine** serverseitige Berechtigung — behandeln Sie die untenstehende Berechtigung als
  Signal zur **UI-Steuerung**, nicht als Backend-Autorisierungsprüfung.
- **Daten:** direktes parametrisiertes SQL auf `melis_hist_page_historic` (LEFT JOIN `melis_core_user` für
  den Benutzernamen; ein gelöschter Benutzer wird als `"Utilisateur supprimé (<id>)"` gekennzeichnet).
- **Pagination:** `perPage` auf `1..200` begrenzt (Standard 25); `total` ist ein separates indiziertes
  `COUNT(*)`, das dieselbe `WHERE`-Klausel berücksichtigt. Der optionale `action`-Filter wirkt sich sowohl auf die Zählung
  als auch auf die Seite aus.

## Berechtigungen

Da das Modul einen Tab zum CMS-Seitenwerkzeug beisteuert, wird seine Berechtigung unter dem
**gemeinsamen** Rechteknoten `meliscms_page` deklariert (ein `ArrayUtils::merge` hängt sie in das `tabs[]` dieses Werkzeugs an):

```php
return [
  'melisReactToolCapabilities' => [
    'meliscms_page' => [
      'tabs' => [
        ['key' => 'melispagehistoric_historic', 'label' => 'tr_melispagehistoric_page_tab_historic_Historic'],
      ],
    ],
  ],
];
```

- Der `key` (`melispagehistoric_historic`) ist die Berechtigung des Tabs; er entspricht dem Schlüssel, den der Host zur
  Registrierung der Tab-Komponente verwendet, sowie dem `melisKey` der Oberfläche in `app.interface.php`.
- Er ist unter `meliscms_page` („Edition de page“ unter Users → Rights) eingeordnet, **nicht** unter dem Wrapper
  `meliscms` und **nicht** unter dem Tab-Button-Knoten.
- Ohne diese Deklaration blendet die Berechtigungs-Whitelist der CMS-Seite den Tab-Button aus — sogar für einen Administrator.

## Wie die Historie geschrieben wird (Listener-Muster)

Zwei in `src/Module.php` eingebundene Listener (nur beim Back-Office-Bootstrap) erfassen die Zeilen; React
liest sie nur.

| Listener | Event(s) | Was erfasst wird |
| --- | --- | --- |
| `MelisPageHistoricPageEventListener` | `meliscms_page_save_end`, `meliscms_page_publish_end`, `meliscms_page_unpublish_end`, … | Speichern / Veröffentlichen / Veröffentlichung zurücknehmen |
| `MelisPageHistoricDeletePageListener` | `meliscms_page_delete_end` | Löschen (bereinigt außerdem) |

Sie schreiben die Historien-Zeilen nicht selbst — das Speichern, Veröffentlichen oder Löschen einer Seite über das CMS
löst die Listener automatisch aus.

## Datenbanktabelle

| Tabelle | Enthält |
| --- | --- |
| `melis_hist_page_historic` | Eine Zeile pro erfasster Aktion: `hist_id` (PK), `hist_page_id`, `hist_action`, `hist_date`, `hist_user_id`, `hist_description`. |

## Wichtige Dateien

| Aspekt | Pfad |
| --- | --- |
| React-API-Controller | `vendor/melisplatform/melis-cms-page-historic/src/Controller/MelisReactApiPageHistoricController.php` |
| React-API-Route | `vendor/melisplatform/melis-cms-page-historic/config/react-api.php` |
| Berechtigung Historic-Tab | `vendor/melisplatform/melis-cms-page-historic/config/react.capabilities.php` |
| Historic-Tab-Button / Oberfläche | `vendor/melisplatform/melis-cms-page-historic/config/app.interface.php` |
| Modul-Bootstrap (Listener) | `vendor/melisplatform/melis-cms-page-historic/src/Module.php` |
| Table-Gateway | `vendor/melisplatform/melis-cms-page-historic/src/Model/Tables/MelisPageHistoricTable.php` |
| Dashboard-Plugin (Legacy) | `vendor/melisplatform/melis-cms-page-historic/src/Controller/DashboardPlugins/MelisCmsPageHistoricRecentUserActivityPlugin.php` |
| Install-SQL / dbdeploy | `vendor/melisplatform/melis-cms-page-historic/install/` |

Siehe auch: [MelisCms](/de/reference/modules/melis-cms), [Modulreferenz](/de/reference/modules)
