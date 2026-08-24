# MelisSql

> Schreibgeschützter SQL-Abfrage-Runner in den Dev Tools des React-Backoffice, ausgeliefert als native Full-React-Brick. Paket `melisplatform/melis-sql`.

## Zweck

MelisSql ist ein kleines Entwicklerwerkzeug: ein **schreibgeschützter SQL-Abfrage-Runner**. Sie geben eine einzelne `SELECT`-Anweisung ein, drücken **Run**, und die passenden Zeilen werden in einer dynamischen Tabelle zurückgeliefert — ohne das Backoffice zu verlassen oder einen externen Datenbank-Client zu öffnen. Er verbindet sich über die in der Plattform konfigurierten Zugangsdaten aus `config['db']`, sodass keine Verbindungsdetails eingegeben werden müssen.

In Melis v6 wird das Werkzeug als **native Full-React-Brick** in `/melis-react` ausgeliefert: eine echte React-Seite, die einen einzigen `react-api`-JSON-Endpunkt aufruft, mit einem **New / Old**-Umschalter, der auf das Legacy-Werkzeug in einem iframe zurückfallen kann. Es handelt sich um ein reines Administrator-Werkzeug zur Diagnose und Inspektion, nicht um eine Funktion für Endbenutzer.

## Aktivierung

Fügen Sie in `config/melis.module.load.php` hinzu:

```php
return [
    'MelisSql',
];
```

Das Werkzeug erscheint im React-Backoffice **nur, wenn das Modul aktiviert ist** (modulare Brick-Erkennung). Es erfordert `melisplatform/melis-core` und PHP `^8.1|^8.3|^8.4`.

## Wo es sich in /melis-react befindet

Linke Seitenleiste → Gruppe **Dev Tools** → **SQL**. Es öffnet sich als oberer Tab mit dem Namen **SQL**. Das Brick-Manifest deklariert die Route `/melis-core/sql` und ordnet ihr den Menü-`forwardKey` `MelisSql/List` zu.

Es ist ein **Ein-Bildschirm-Werkzeug**: eine Seite mit einem Abfragefeld, einer Schaltfläche **Run** und einer dynamischen Ergebnistabelle. Keine Unter-Tabs, kein Drill-down.

![Das React-SQL-Tool: Kopfzeile mit Titel/Untertitel, der New/Old-Umschalter (oben rechts), ein Abfrage-Textbereich mit dem Platzhalter `SELECT * FROM my_table LIMIT 10;`, der Hinweis „One SELECT statement only, ending with « ; »", eine rote Run-Schaltfläche und eine leere Ergebniskarte.](/screenshots/react/melis-sql/melissql-tool-sql.png)

## Verwendung des React-Werkzeugs

1. Geben Sie **eine** `SELECT`-Anweisung in den Abfrage-Textbereich ein.
2. Beenden Sie sie mit einem Semikolon `;`.
3. Klicken Sie auf **Run** (oder drücken Sie **Strg/Cmd + Enter**).

Sobald eine Abfrage Ergebnisse liefert, erscheint eine Ergebniskarte mit:

- Einer **Zeilenanzahl** (z. B. `12 row(s)`; bei einer Suche `matches / total`).
- Einem **Suchfeld**, das die zurückgelieferten Zeilen über **alle** Spalten hinweg filtert (auch ausgeblendete).
- Einer Schaltfläche **Columns**, die einen Spaltenmanager öffnet: zwei Listen (**Visible** / **Hidden**), per Drag-and-drop ausblenden/umordnen, **Reset** zeigt wieder alle an. Das Layout wird pro Browser gespeichert (`localStorage`, Schlüssel `melis-sql-cols-v1`).
- Der **Tabelle** selbst: Klicken Sie auf einen Spaltenkopf, um zu **sortieren** (aufsteigend → absteigend); erkannte Bild-Blobs (z. B. ein Benutzer-Avatar) werden inline als Miniaturansichten dargestellt.

### New / Old-Umschalter

Ein **New / Old**-Umschalter oben rechts wechselt das gesamte Werkzeug zwischen den Ansichten. **New** (Standard) ist die React-Oberfläche; **Old** stellt das Legacy-Werkzeug in einem Singleton-iframe dar (`/melis/react-tool-page?key=melissql_tool`), das über einen `ResizeObserver` an einem Anker positioniert wird.

## Abfrageregeln

Das Werkzeug verweigert alles, was keine einzelne schreibgeschützte Anweisung ist, und zeigt den Grund in einem roten Banner an:

| Situation | Was passiert |
| --- | --- |
| Anweisung beginnt nicht mit `SELECT` | Abgelehnt — *only SELECT queries are allowed*. |
| Kein Semikolon am Ende | Abgelehnt — *a query should end with ';'*. |
| Mehr als eine Anweisung (mehrere `;`) | Abgelehnt — *only one query is allowed*. |
| Sie sind **kein** Plattform-Administrator | Abgelehnt — **403 Forbidden** (nur für Administratoren). |
| Die Abfrage kann nicht vorbereitet werden / schlägt fehl | Der Datenbankfehler wird im Banner angezeigt. |

## React-API-Endpunkt

Es gibt **keine** `config/react-api.php` für dieses Modul. Der einzige Endpunkt wird über die Catch-all-Backoffice-Route des Moduls erreicht (`config/module.config.php`, `/melis/MelisSql[/:controller[/:action]]`), die den Alias `MelisSql\Controller\MelisSqlReactApi` → `MelisSqlReactApiController` auflöst (deklariert unter `controllers.invokables`). Vertrag: `{ success, data, error }`.

| Methode & URL | Controller-Aktion | Zweck |
| --- | --- | --- |
| `POST /melis/MelisSql/MelisSqlReactApi/run` | `runAction` | Validieren + Ausführen einer schreibgeschützten `SELECT`-Abfrage, gibt `{ columns, rows, rowCount }` zurück |

Request-Body: `{ "query": "SELECT … ;" }`.

```ts
// runSqlQuery(query) — the only call the brick makes (ui-react/src/sql-api.ts)
const res = await fetch('/melis/MelisSql/MelisSqlReactApi/run', {
  method: 'POST',
  headers: { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: 'SELECT * FROM melis_cms_page_tree;' }),
})
// → { success: true, data: { columns: string[], rows: Record<string,unknown>[], rowCount: number } }
```

`MelisSqlReactApiController` **erweitert den Legacy-`ListController`**, um dessen `runQuery()`-Schutz unverändert wiederzuverwenden (dieselbe `mysqli`-Verbindung aus `config['db']`, dieselbe Validierung auf Einzelanweisung / nur `SELECT`, dieselben übersetzten Fehlermeldungen). Er ergänzt lediglich die JSON-Umformung sowie die untenstehenden Schutzmaßnahmen. Validierungs-/DB-Fehler geben HTTP **200** mit `{ success:false, error }` zurück; Authentifizierungsfehler geben 401/403 zurück; Nicht-`POST`-Anfragen geben 405 zurück.

## Fähigkeiten (Capabilities)

Deklariert in `config/react.capabilities.php` (zusammengeführt über `MelisSql\Module::getConfig()`), zugeordnet unter dem melisKey `melissql_tool` des Werkzeugs:

```php
return ['melisReactToolCapabilities' => [
    'melissql_tool' => ['run'],   // one internal cap: the Run (execute-query) action
]];
```

- **`run`** ist eine benutzerdefinierte Fähigkeit (keine der Standard-Fähigkeiten `list/create/edit/delete/export`). Sie erlaubt einem Administrator, das Werkzeug *anzusehen/einzusehen*, ohne notwendigerweise berechtigt zu sein, Abfragen **auszuführen**.
- **Front-Gating.** `SqlPage` ruft `useCaps('melissql_tool')` → `can('run')` auf und rendert nur dann die Schaltfläche **Run** und aktiviert das Tastenkürzel Strg/Cmd + Enter.
- Diese Datei ist **rein deklarativ** (steuert die Kontrollkästchen unter Users → Rights); die **eigentliche Durchsetzung** erfolgt über den Zugriffsschutz + das `usr_admin`-Gate im Controller.

## Sicherheitshinweise

- **Nur für Administratoren.** Der Controller führt `denyUnlessAccess()` aus (401 bei fehlender Authentifizierung, 403, wenn `MelisCoreRights::canAccess('melissql_tool')` fehlschlägt) und verlangt zusätzlich `usr_admin`. Das Recht `melissql_tool` ist delegierbar, daher **reichen Rechte allein nicht aus** — ein Nicht-Administrator erhält **403 Forbidden**.
- **Schreibgeschützt per Konstruktion.** `runQuery()` lehnt alles ab, was nicht exakt eine mit `;` endende und mit `SELECT` beginnende Anweisung ist — kein Weg zu `INSERT`/`UPDATE`/`DELETE`/DDL. Behandeln Sie jede Änderung an `runAction`/`runQuery` als sicherheitskritisch.
- **Maskierung sensibler Spalten.** `maskSensitiveColumns()` maskiert die *Werte* von Spalten, deren Name auf `password|passwd|pwd|mot_de_passe|secret|token|api_key` passt, serverseitig mit `••••••••`, sodass ein Hash bei einem `SELECT *` niemals den Browser erreicht. Dies ist eine Schutzmaßnahme, keine Sicherheitsgrenze.
- **Binärsicheres JSON.** `sanitizeForJson()` kodiert nicht-UTF-8-Binärdaten in Base64 und gibt erkannte Bild-Blobs (z. B. `melis_core_user.usr_image`) als `data:<mime>;base64,…`-URIs für die Inline-Darstellung aus.
- Vermeiden Sie unbegrenzte `SELECT *`-Abfragen auf sehr großen Tabellen: Es gibt keine serverseitige Paginierung.

## Wichtige Dateien

| Aspekt | Pfad |
| --- | --- |
| Catch-all-Route, Controller-Invokable, Toolpage-Erweiterung für die Old-Ansicht | `config/module.config.php` |
| Fähigkeiten (`melisReactToolCapabilities` → `melissql_tool` → `run`) | `config/react.capabilities.php` |
| Legacy-Werkzeug + `runQuery()`-Schutz (vom API-Controller wiederverwendet) | `src/Controller/ListController.php` |
| React-API-Controller (Administrator-Gate + Wiederverwendung von `runQuery` + Maskierung + JSON-sicher) | `src/Controller/MelisSqlReactApiController.php` |
| Eigenheit von `toolPageAction()` im Old-Ansicht-iframe | `src/Controller/React/PluginViewToolPageExtension.php` |
| React-Brick-Quellcode (Vite IIFE) | `ui-react/src/` — `brick.tsx`, `SqlPage.tsx`, `ViewToggle.tsx`, `sql-api.ts` |
| Gebaute Brick + Manifest | `public/ui-react/brick.js`, `public/ui-react/brick.manifest.json` |

Siehe auch: [MelisCore](/de/reference/modules/melis-core)
