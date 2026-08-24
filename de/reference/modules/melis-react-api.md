# MelisReactApi

> JSON-API-Rückgrat des React-Backoffice (`/melis-react`): startet die Shell, liefert Menü-, Benutzer-, Asset-, Discovery- und Dashboard-Daten und beherbergt den Capability-Resolver. Paket `melisplatform/melis-react-api`.

## Zweck

MelisReactApi ist **Infrastruktur, kein Werkzeug**. Es zeichnet keine Oberfläche, liefert keinen Brick und fügt keinen
Sidebar-Eintrag hinzu. Es stellt die generischen JSON-Endpunkte `/melis/react-api/…` bereit, die die React-Shell
(bereitgestellt von MelisReactOverride unter `/melis-react`) beim Start und bei der Navigation aufruft, und es
beherbergt den **Capability-Resolver** (`Capabilities` + `CapabilityGuardTrait`), den die werkzeugspezifischen
Controller der einzelnen Module wiederverwenden, um ihre „erweiterten Rechte“ abzusichern.

Alles, was die Shell anzeigt und das nicht der eigene Bildschirm eines bestimmten Werkzeugs ist, stammt von hier: das
linke Menü (rechtsgefiltert), der Benutzer-/Avatar-Bereich der Kopfzeile und der Sprachumschalter, die Dashboard-
Kacheln und KPIs, die modulare Brick-Discovery sowie die Matrix der erweiterten Rechte unter Benutzer → Rechte. Die
eigenen Endpunkte, Routen und Capability-Deklarationen der einzelnen Werkzeuge liegen in **ihren eigenen**
Modulen (z. B. `/users`, `/roles` werden in MelisCore / MelisSmallBusiness deklariert), nicht hier.

Für dieses Modul gibt es **keine React-Bildschirme und keine Screenshots** — die folgenden Abschnitte
beschreiben den API-Vertrag, der bei der Kommunikation mit dem React-Backoffice zu verwenden ist.

## Aktivierung

MelisReactApi ist ein Kernmodul des React-Backoffice. Es wird **nicht** per Composer in das Docker-Vendor-Volume
installiert; es wird über `config/application.config.php` `module_paths` geladen (Branch
`melis-react`), und `src/Module.php` lädt seine Klassen automatisch über den `StandardAutoloader`.
Es arbeitet zusammen mit **MelisReactOverride** (dem Iframe-/Werkzeug-Mechanismus + SPA-Shell-Route) und mit
**melis-core/ui-react** (der React-App, die diese API konsumiert — siehe ihre `src/lib/*-api.ts`-Clients).

Es deklariert seine Routen direkt in `config/module.config.php` (keine `config/react-api.php`)
und deklariert keine eigenen Capabilities (es ist die Engine, die die Deklarationen *anderer* Module *liest*).

## React-Präsenz auf einen Blick

| Eigenschaft | Wert |
| --- | --- |
| Brick / Manifest | **keine** — liefert keine `public/ui-react/brick.manifest.json` |
| `ui-react/`-Quelle | **keine** — kein Vite-Projekt, keine React-Komponenten |
| Controller | `MelisReactApi\Controller\MelisReactApiController` (aufrufbarer Alias `MelisReactApi\Controller\MelisReactApi`) |
| Basisroute | `melis-backoffice` → `react-api` (d. h. `/melis/react-api/…`) |
| Authentifizierung | `isAuthenticated()` (MelisCoreAuth) pro Aktion, **außer** `/langs` (öffentlich, wird auf dem Anmeldebildschirm geladen) |
| Antwortvertrag | `{ success: bool, data: T, error?: string }` (reines JSON, kein Layout) |

Jede Aktion gibt über das geerbte `jsonResponse()` eine reine JSON-`Response` zurück, sodass Laminas
niemals ein Layout darum legt. Nur-Lese-Aktionen rufen `releaseSessionLock()` frühzeitig auf, damit
gleichzeitige Startanfragen, die sich das Session-Cookie teilen, nicht serialisiert werden.

## Generische Endpunkte

Alle unter `/melis/react-api/…`. Zwölf generische Endpunkte, alle abgebildet auf
`MelisReactApiController`. Jede Antwort ist `{ success, data, error? }` (401, wenn der
`isAuthenticated()`-Guard fehlschlägt, außer bei `/langs`).

| Methode + Pfad | Aktion | Struktur von `data` |
| --- | --- | --- |
| `GET /me` | `meAction` | `{ id, name, login, email, picture, isAdmin, capabilities }` — `capabilities` = Zuordnung `melisKey → string[]` der erlaubten Caps (Administrator ⇒ alles). |
| `GET /menu` | `menuAction` | `NavNode[]` — der rechtsgefilterte Navigationsbaum. `?full=1` gibt den **ungefilterten** Baum zurück (nur Rechte-Editor; erfordert `canAccess('meliscore_tool_user')`). |
| `GET /langs` | `langsAction` | `{ current: { id, locale }, langs: [{ id, locale, short, label }] }` — **öffentlich**. |
| `GET /assets` | `assetsAction` | CSS-/JS-URLs + Inline-JS-Globals zum Bootstrapping von Werkzeug-Iframes (delegiert an `MelisReactOverride\Service\PlatformAssetsService::build()`). |
| `GET /react-modules` | `reactModulesAction` | `{ data: BrickDef[], bundle: { url } }` — Bricks der aktiven Module; `bundle.url` = das zusammengefügte JS. |
| `GET /bricks-bundle.js` | `bricksBundleAction` | **kein JSON** — die IIFE jedes aktiven Bricks, zu einer unveränderlich zwischengespeicherten JavaScript-Antwort zusammengefügt. |
| `GET /dashboard/bubbles` | `dashboardBubblesAction` | Zähler `{ news, updates, notifications:{count,items}, messages }` (fallen auf 0 zurück, niemals 404). |
| `GET /dashboard/stats` | `dashboardStatsAction` | `{ kpis:{ users, sites, pages, languages }, activity:[{ id, name, loginDate }] }`. |
| `GET /dashboard/legacy-plugins` | `legacyDashboardPluginsAction` | `[{ pluginName, title, icon, section, w, h }]` — Legacy-Dashboard-Plugins als Iframe-Widgets. |
| `GET \| POST /dashboard/layout` | `dashboardLayoutAction` | GET → gespeicherte Kacheln `[{ pluginName, pluginId, x, y, w, h }]`; POST → dasselbe JSON, gespeichert in `melis_core_dashboards`. |
| `GET /rights/dashboard-plugins` | `rightsDashboardPluginsAction` | `[{ key, title, module }]` — maßgebliche Liste der Dashboard-Plugins für den Rechte-Editor (`?userId=`). |
| `GET /rights/capabilities` | `rightsCapabilitiesAction` | Zuordnung `melisKey → Capability-Baum`, **deklariert** von den Modulen, `tr_*`-Bezeichnungen in die Sitzungs-Locale übersetzt. |

**Startsatz:** `/me`, `/menu`, `/langs`, `/assets`, `/react-modules` (+ `/bricks-bundle.js`).
Die Endpunkte `/dashboard/*` und `/rights/*` versorgen das Dashboard und den Editor unter Benutzer → Rechte.

Die eigenen Datenendpunkte eines Werkzeugs liegen **nicht** hier: `/melis/react-api/users…`, `/users/stats`,
`/roles` werden in **MelisCore** deklariert; `/roles-list`, `/roles/save|stats|:id`,
`/workflow/roles` in **MelisSmallBusiness**; KI-Routen in **MelisAI**. Die Clients, die diesen generischen
Satz aufrufen, liegen in `melis-core/ui-react/src/lib/melis-api.ts`.

Echtes Fetch-Beispiel — der `/me`-Startaufruf der Shell:

```ts
// mirrors melis-core/ui-react/src/lib/melis-api.ts
const res = await fetch('/melis/react-api/me', {
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
  credentials: 'include',
})
const json = await res.json()                    // { success, data, error? }
if (!json.success) throw new Error(json.error)   // 401 → { success:false, error:'Unauthenticated' }
const { name, isAdmin, capabilities } = json.data
// capabilities: Record<melisKey, string[]>
// e.g. { melis_core_announcement_tool: ['list','create','edit'] }
```

## Capabilities — der Resolver

Dies ist die Substanz, die MelisReactApi *anderen* Modulen bereitstellt: das System der „erweiterten Rechte“,
das die **internen Komponenten** eines bereits autorisierten Werkzeugs absichert (Auflisten / Erstellen /
Bearbeiten / Löschen / verschachtelte Registerkarten), *untergeordnet* der Prüfung des Werkzeugzugriffs
(`MelisCoreRights::canAccess`, unverändert).

**Deklaration (in jedem Modul, nicht hier).** Ein Modul deklariert pro Werkzeug-`melisKey` die
vorhandenen Capabilities über den zusammengeführten Konfigurationsschlüssel `melisReactToolCapabilities`
(`config/react.capabilities.php`, zusammengeführt in seiner `Module::getConfig()`):

```php
// <module>/config/react.capabilities.php  (declared BY the tool's module)
return [
  'melisReactToolCapabilities' => [
    'melis_core_announcement_tool' => ['list', 'create', 'edit', 'delete'],
    // or a TREE for nested tabs with their own actions:
    // 'some_tool' => ['actions' => ['list'], 'tabs' => [['key' => 'variants', 'actions' => ['list','create']]]],
  ],
];
```

**Resolver — `MelisReactApi\Service\Capabilities`** (alle statisch; `const CONFIG_KEY =
'melisReactToolCapabilities'`, `const SECTION = 'meliscore_tool_capabilities'`):

| Methode | Rolle |
| --- | --- |
| `declared($appConfig)` | Die rohe deklarierte Zuordnung (der Rechte-Editor rendert sie). |
| `flatten($node)` | Flacht eine flache Liste ODER einen Baum `{ actions, tabs }` zu punktgetrennten Strings ab (z. B. `variants.list`). |
| `deniedFor($rightsXml, $toolKey)` | Die aus dem Rechte-XML des Benutzers/der Rolle gelesene Sperrliste. |
| `isAllowed($appConfig, $rightsXml, $toolKey, $cap)` | **Standardmäßig erlaubt** — erlaubt, sofern die Cap nicht sowohl deklariert *als auch* in der Sperrliste enthalten ist. |
| `allowedForUser($appConfig, $rightsXml)` | Die in `/me` zurückgegebene Zuordnung `melisKey → allowedCaps[]` (`$rightsXml = null`, z. B. Administrator ⇒ alles). |

**Speicherung.** Sperrungen liegen in einem eigenen Abschnitt des Rechte-XML des Benutzers/der Rolle, getrennt von
der Legacy-Sperrliste, sodass das klassische Backoffice sie ignoriert:

```xml
<meliscore_tool_capabilities>
  <tool key="melis_core_announcement_tool"><deny>delete</deny></tool>
</meliscore_tool_capabilities>
```

Das Bewahren dieses Abschnitts bei einem **Legacy**-Speichervorgang übernehmen die betroffenen Module (MelisCore für
BENUTZER, MelisSmallBusiness für ROLLE).

**Guard — `MelisReactApi\Controller\CapabilityGuardTrait`.** Ein werkzeugspezifischer Modul-Controller
`use`t dieses Trait, definiert `const MELIS_KEY = '<the tool's melisKey>'` und ruft
`denyUnlessCan($cap)` **nach** seiner Werkzeugzugriffsprüfung auf:

```php
use MelisReactApi\Controller\CapabilityGuardTrait;

class MelisReactApiFooController extends MelisAbstractActionController
{
    use CapabilityGuardTrait;
    const MELIS_KEY = 'melis_core_announcement_tool'; // the rights-bearing tool node

    public function saveAction()
    {
        if ($resp = $this->denyUnlessCan('edit')) return $resp;   // 403 JSON if denied
        // …call the module's Laminas service…
    }
}
```

`denyUnlessCan` liest die **effektiven** Rechte (`MelisCoreAuth::getAuthRights()` → Benutzer ODER
Rolle), **Administratoren umgehen dies** und es ist **standardmäßig erlaubt** — ein Werkzeug ohne Deklaration behält
volles CRUD. Clientseitig kommt dieselbe Erlaubniszuordnung in `/me` `data.capabilities` an und steuert die Oberfläche
(`melis-core/ui-react/src/lib/caps.ts`).

## Host-Integration

- **Discovery / Bricks** — `GET /react-modules` durchsucht **aktive** Module nach
  `public/ui-react/brick.manifest.json` (ein einzelnes Objekt oder ein `bricks: [...]`-Array) und
  gibt `BrickDef = { id, module, route, label, forwardKey, melisKey, subTabs, persistent,
  bundleUrl }` zurück, plus `bundle.url = /melis/react-api/bricks-bundle.js?v=<sig>`. Die Shell lädt
  das einzelne zusammengefügte Bundle (jeder Brick ist eine IIFE, die sich per id selbst auf
  `window.__MELIS_BRICK_COMPONENTS__` über `window.__melisRegisterBrick` registriert, umschlossen von
  try/catch). Die Signatur `?v=` (Name + mtime + Größe jedes Bundles) macht einen unveränderlichen
  1-Jahres-Cache sicher. Ein Brick existiert **genau dann**, wenn sein Modul aktiv ist — die Modularitätsregel.
- **Menü-Builder (`GET /menu`)** — durchläuft die Leftmenu-Schnittstelle, wendet die Reihenfolge von
  Abschnitten/Werkzeugen an und gibt `NavNode[]` aus, wobei jeder Knoten `{ key, name, icon, melisKey, isTool,
  forward, hasNavChild, configChildCount, children }` ist. Ein oberster **Abschnitt** ist ein Container
  (nur entfernt, wenn er leer ist); ein anklickbarer `is_parent_tool`-Abschnitt wird durch
  `canAccess(target)` abgesichert; unbekannte, neu installierte Abschnitte verwenden großzügige Rechte, damit sie
  sichtbar bleiben. Zwei Hooks erweitern ihn: `melisReactSidebarHostSections` (behält einen leeren Abschnitt als
  reinen Sidebar-Host-Container, der `sidebarModule` trägt) und `melisReactRightsTools` (fügt
  rechtsspezifische synthetische Werkzeugknoten ein, nur `?full=1`).
- **Auth-/Asset-Brücke** — `/assets` gibt dieselben CSS-/JS-Dateien zurück, die die Legacy-`layoutCore.phtml`
  lädt (delegiert an `MelisReactOverride\Service\PlatformAssetsService`), sodass Werkzeug-Iframes
  innerhalb der React-Shell identisch bootstrappen.
- **i18n** — `tr_*`-Bezeichnungen (Namen der Menüabschnitte, Bezeichnungen der Capability-Registerkarten) werden in die
  aktuelle Sitzungs-Locale übersetzt (`meliscore`-Container `melis-lang-locale`) über
  `MelisCoreTranslation`; Module deklarieren **Schlüssel**, niemals fest kodierten Text.

## Wichtige Dateien

| Aspekt | Pfad |
| --- | --- |
| Modul-Manifest / Autoloader | `melis-react-api/src/Module.php` |
| Routen + aufrufbarer Controller | `melis-react-api/config/module.config.php` |
| Generische Aktionen (12) | `melis-react-api/src/Controller/MelisReactApiController.php` |
| Capability-Guard-Trait | `melis-react-api/src/Controller/CapabilityGuardTrait.php` |
| Capability-Resolver | `melis-react-api/src/Service/Capabilities.php` |

Siehe auch: [melis-core](/de/reference/modules/melis-core) ·
[melis-small-business](/de/reference/modules/melis-small-business) ·
[melis-ai](/de/reference/modules/melis-ai)
