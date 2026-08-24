# MelisCmsSiteRobot

> Domainbezogene Bearbeitung und dynamische Auslieferung der `robots.txt`, mit einem nativen Full-React-Backoffice. Paket `melisplatform/melis-cms-site-robot`.

## Zweck

Mit `MelisCmsSiteRobot` verwalten Sie die `robots.txt` jeder Site-Domain aus dem Backoffice heraus und
liefern sie dynamisch unter `https://<domain>/robots.txt` aus — direkt aus der Datenbank, ohne dass
eine statische Datei gepflegt werden muss. Änderungen werden unmittelbar nach dem Speichern wirksam. Der
robots-Text wird mit einer Zeile pro Domain in einer eigenen Tabelle gespeichert; es gibt keine
Variante pro Seite oder pro Sprache.

Im v6-React-Backoffice (`/melis-react`) wird das Werkzeug als **native Full-React-Brick** ausgeliefert — eine
echte React-Liste + ein React-Editor, die eine `react-api`-JSON-Schicht aufrufen — mit einem
**New / Old**-Umschalter, der auf das Legacy-Werkzeug in einem iframe zurückfällt. Das zugrunde liegende
Datenmodell, die Engine-Table-Gateways und die dynamische `/robots.txt`-Frontroute sind gegenüber v5
unverändert.

## Aktivierung

Fügen Sie Folgendes in `config/melis.module.load.php` hinzu:

```php
return [
    'MelisCmsSiteRobot',
];
```

Abhängigkeiten: `melis-core` und `melis-cms`. Das Modul ist `dbdeploy: true`, sodass seine Tabelle
automatisch erstellt wird, und es verwendet zur Laufzeit die von `melis-engine` bereitgestellten
Table-Gateways erneut. Die React-Brick erscheint **nur, wenn das Modul aktiviert ist** — der Host
erkennt sie über `brick.manifest.json` (`GET /melis/react-api/react-modules`); wird das Modul aus
`melis.module.load.php` entfernt, verschwindet es aus dem Menü.

## Backoffice (React)

**Ort:** linke Seitenleiste → Gruppe **MelisCms** → **Robots.txt** (Baumroute `/melis-cms/site-robot`).
Es öffnet sich als oberer Reiter namens **Robots.txt**, mit zwei Ebenen, die als native Host-Unterreiter
dargestellt werden: **Liste der Site-Domains → der robots.txt-Editor einer Domain**.

![React-Robots.txt-Liste — KPI-Karten (Domains / With robots.txt / Without robots.txt), ein Feld "Search a domain…", ein Filter "All sites", Reset filters / Columns / Export, der New/Old-Umschalter und eine Aktualisierung, mit Domain / Site / Env. pro Zeile sowie ein Set/None-Badge und eine Bearbeiten-Aktion](/screenshots/react/melis-cms-site-robot/meliscmssiterobot-tool-robots-list.png)

### Ebene 1 — die Domainliste

Die Liste zeigt **jede Site-Domain der Plattform** (eine Zeile pro Domain, gespeist aus dem
**Sites**-Werkzeug). Sie bietet **KPI-Karten** (Domains / With robots.txt / Without robots.txt), ein
**Suchfeld** (findet Domain- oder Site-Namen), einen Filter **All sites**, einen **Columns**-Manager,
eine Schaltfläche **Export** und **Reset filters**. Die Liste scrollt unendlich (Keyset) mit
serverseitiger Sortierung. Spalten: **ID**, **Domain**, **Site**, **Env.**, **robots.txt** (ein
**Set / None**-Badge pro Zeile). Jede Zeile verfügt über eine **Bearbeiten**-Aktion (Stift) und, sofern
Inhalt vorhanden ist, über eine **Löschen**-Aktion (Leeren).

Es gibt **kein "+ New" und kein Löschen von Domains** — die Domains stammen aus dem Sites-Werkzeug; Sie
bearbeiten oder leeren lediglich die robots.txt jeder Domain.

### Ebene 2 — die robots.txt einer Domain bearbeiten

Beim Öffnen einer Domain wird ein **Unterreiter** (mit einer Schaltfläche **← Back**) hinzugefügt. Der
Editor zeigt **Domain** und **Site** schreibgeschützt an, dazu ein großes, dicktengleiches
Textfeld **robots.txt content** für den Textkörper. **Save** (oben rechts) speichert ihn, und er wird
live unter der `/robots.txt` dieser Domain ausgeliefert. Bleibt er leer, wird nichts ausgeliefert.

![React-robots.txt-Editor — schreibgeschützte Felder Domain und Site, ein dicktengleiches Textfeld "robots.txt content", der Unterreiter ← Back und eine Schaltfläche Save oben rechts](/screenshots/react/melis-cms-site-robot/meliscmssiterobot-tool-robots-edit.png)

### New / Old-Umschalter

Der **New / Old**-Umschalter oben rechts schaltet das gesamte Werkzeug zwischen der React-Oberfläche
(**New**, Standard) und dem klassischen Werkzeug, das in einem iframe gerendert wird (**Old**, unter
`/melis/react-tool-page?key=site_robot_tool_display`), um.

## React-Brick

| Element | Wert |
| --- | --- |
| Brick-Art | Native Full-React (mit einem New/Old-Legacy-iframe-Fallback) |
| Brick-ID | `siterobot` (`brick.tsx` ⇄ `brick.manifest.json`) |
| Manifest-`route` | `/melis-cms/site-robot` |
| `label` | `Robots.txt` |
| `forwardKey` | `MelisCmsSiteRobot/ToolSiteRobot` |
| `melisKey` (iframe / renderable zone) | `site_robot_tool_display` |
| `subTabs` / `persistent` | `true` / `true` |
| Capabilities-melisKey | `meliscms_site_robot_tools_section` |
| API-Basis | `/melis/react-api/site-robots` |

Die Brick ist ein Vite-IIFE-Bundle (React ist auf Host-Globals ausgelagert). `SiteRobotPage.tsx` ist der
Container: Er parst `/[section]/site-robot[/:id]` und wechselt zwischen `DomainList` (keine id) und
`RobotForm` (id vorhanden), hält den New/Old-`mode`, die KPI-Karten, die Filter, den Spaltenmanager,
Export und das Modal zur Löschbestätigung. Die Unterreiter werden über die Window-Bridge gesteuert
(`window.__melisOpenSubTab` / `__melisUpdateSubTabLabel`).

## React-API

Die Routen befinden sich in `config/react-api.php`; Controller
`MelisCmsSiteRobot\Controller\MelisReactApiSiteRobotController`. Alle liegen unter
`/melis/react-api/site-robots`, JSON-Kontrakt `{ success, data, error }`. Der Controller kommuniziert mit
den Tabellen **direkt über parametrisiertes SQL** (kein Modul-Service — passend zum Legacy-Werkzeug).

| Methode & URL | Aktion | Zweck |
| --- | --- | --- |
| `GET /site-robots` | `list` | Site-Domains auflisten (Keyset: `limit`, `search`, `site`, `sort`, `dir`, `after`); jedes Element trägt `hasRobots` |
| `GET /site-robots/stats` | `stats` | KPI `{ total, withRobots, withoutRobots }` |
| `GET /site-robots/sites` | `sites` | Site-Optionen für den Filter |
| `GET /site-robots/:id` | `get` | Eine Domain (`sdom_id`) + ihr `robotText` |
| `POST /site-robots/save` | `save` | Die robots.txt einer Domain upserten (`{ id, robotText }`) |
| `DELETE /site-robots/delete/:id` | `delete` | Die robots.txt einer Domain leeren (die Domain bleibt bestehen) |

`list` führt einen LEFT JOIN von `melis_cms_site_domain` auf `melis_cms_site` und
`melis_cms_domain_robots` durch (verbunden über den Domainnamen, `robot_site_domain = sdom_domain`).
`save` upsertet die robots-Zeile mit dem Domainnamen als Schlüssel und begrenzt den gespeicherten
Textkörper auf **65535 Zeichen**. Die Routenreihenfolge ist entscheidend: `/stats`, `/sites`, `/save`,
`/delete/:id` werden **vor** dem Catch-all `/:id` deklariert (eingeschränkt auf `[0-9]+`).

### Capabilities

Deklariert in `config/react.capabilities.php` unter dem rechtetragenden Knoten
`meliscms_site_robot_tools_section`:

```php
return [
    'melisReactToolCapabilities' => [
        'meliscms_site_robot_tools_section' => ['list', 'edit', 'delete', 'export'],
    ],
];
```

- **`list`** — die Domainliste ansehen (schützt auch `stats` + `sites`).
- **`edit`** — die robots.txt einer Domain öffnen (`get`) und speichern (`save`).
- **`delete`** — die robots.txt einer Domain leeren.
- **`export`** — die Schaltfläche Export (UI-Schranke, verwendet die Liste erneut).

Es gibt **keine `create`**-Capability — Sie können aus diesem Werkzeug heraus keine Domain hinzufügen.
Jede Controller-Aktion ist doppelt abgesichert: `denyUnlessAccess()` (Auth + `MelisCoreRights::canAccess`),
dann `denyUnlessCan(cap)` (Default-Allow; der Server bleibt der Durchsetzungspunkt).

## Zentrale Services

Das Modul registriert keinen eigenen Service. Das Legacy-Werkzeug und die React-API teilen sich dasselbe
Datenmodell; die Engine-Gateways bleiben verfügbar:

| Service-Alias | Rolle |
| --- | --- |
| `MelisEngineTableRobot` | Table-Gateway über `melis_cms_domain_robots` — liest und schreibt `robot_text` je Domain. |
| `MelisEngineTableSiteDomain` | Speist die Liste der Site-Domains (`sdom_id`, `site_label`, `sdom_domain`). |

## Frontoffice

Eine öffentliche Route in `config/module.config.php` (`melis-cms-site-robot-special-urls`) bildet
`/robots.txt` auf `ToolSiteRobotController::toolRobotsTxtAction` ab. Die Aktion schlägt
`melis_cms_domain_robots` anhand des anfragenden Hosts nach und gibt den gespeicherten `robot_text` aus.
In v6 unverändert.

| Route | Handler | Ergebnis |
| --- | --- | --- |
| `/robots.txt` | `ToolSiteRobotController::toolRobotsTxtAction` | Liefert den für die anfragende Domain gespeicherten `robot_text` aus. |

## Datenbanktabellen

| Tabelle | Enthält |
| --- | --- |
| `melis_cms_domain_robots` | Ein robots.txt-Eintrag pro Domain: `robot_id` (PK), `robot_site_domain`, `robot_text`. |

## Zentrale Dateien

| Bereich | Pfad |
| --- | --- |
| React-API-Routen | `vendor/melisplatform/melis-cms-site-robot/config/react-api.php` |
| React-Capabilities | `vendor/melisplatform/melis-cms-site-robot/config/react.capabilities.php` |
| React-Brick-Manifest | `vendor/melisplatform/melis-cms-site-robot/public/ui-react/brick.manifest.json` |
| React-API-Controller | `vendor/melisplatform/melis-cms-site-robot/src/Controller/MelisReactApiSiteRobotController.php` |
| Legacy-Werkzeug + `/robots.txt`-Route | `vendor/melisplatform/melis-cms-site-robot/src/Controller/ToolSiteRobotController.php` |
| Routen (Backoffice + `/robots.txt`) | `vendor/melisplatform/melis-cms-site-robot/config/module.config.php` |
| Installations-SQL | `vendor/melisplatform/melis-cms-site-robot/install/` |

Siehe auch: [Modulreferenz](/de/reference/modules), [melis-cms](/de/reference/modules/melis-cms), [melis-core](/de/reference/modules/melis-core)
