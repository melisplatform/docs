# Architektur im Detail

Diese Seite verfolgt eine Anfrage **von Anfang bis Ende** und benennt die tatsächlich beteiligten
Klassen, Events und Dienste. Sie ergänzt [Konzepte](./concepts): Lesen Sie zuerst jene Seite für das
Vokabular, und lesen Sie diese Seite, um die *Mechanik* zu verstehen. Es ist außerdem die Seite, die
Sie lesen sollten, wenn Sie (oder ein KI-Assistent) ein vollständiges mentales Modell davon benötigen,
wie Melis funktioniert.

Melis **v6** behält dasselbe Framework, dieselben Module und denselben Anfrage-Lebenszyklus wie v5 —
was sich geändert hat, ist die **Backoffice-Oberfläche**. Die klassischen, serverseitig gerenderten
Werkzeuge unter `/melis` sind weiterhin vorhanden, aber die Standard-Erfahrung ist nun eine
**React-Single-Page-Anwendung unter `/melis-react`**, die native React-Werkzeuge („Bricks") lädt und
für die klassischen Werkzeuge auf ein Iframe zurückgreift. Die folgenden Abschnitte behalten die
gesamte unveränderte Mechanik bei und fügen die React-Shell dort ein, wo sie hingehört.

## Bootstrap

`public/index.php` lädt den Autoloader von Composer, führt
`config/application.config.php` mit `config/development.config.php` zusammen (sofern vorhanden) und
startet dann die Laminas-MVC-Anwendung.

`config/application.config.php` erstellt die Modulliste dynamisch:

```php
'modules' => array_merge(
    MelisCore\MelisModuleManager::getModuleComponents(), // framework components first
    MelisCore\MelisModuleManager::getModules()           // then Melis modules
),
'module_listener_options' => [
    'module_paths'      => ['./module', './module/MelisSites'],
    'config_glob_paths' => [
        realpath(__DIR__) . '/autoload/{{,*.}global,{,*.}local}.php',
        realpath(__DIR__) . '/autoload/platforms/' . getenv('MELIS_PLATFORM') . '.php',
    ],
],
```

`MelisCore\MelisModuleManager` (`vendor/melisplatform/melis-core/src/MelisModuleManager.php`)
stellt je nach Anfrage drei Arten von Modulen zusammen:

- **Components** — Framework-Abhängigkeiten, pro Modul deklariert in `config/module.load.php`.
- **Modules** — die Backoffice-Module aus `config/melis.module.load.php`.
- **Site modules** — für eine Front-Office-URL die Site, die durch `MELIS_MODULE` ausgewählt wird
  (aus `module/MelisSites/<name>` oder einer Vendor-Site wie `MelisDemoCms`).

Das React-Backoffice fügt dieser Liste zwei **Infrastruktur-Module** hinzu —
[`melis-react-api`](/de/reference/modules/melis-react-api) (das JSON-API-Rückgrat) und
[`melis-react-override`](/de/reference/modules/melis-react-override) (die SPA-Route + der
Iframe-Mechanismus für Legacy-Werkzeuge). Beide werden über die `module_paths` in
`application.config.php` geladen (sie werden nicht von Composer autoloadet) und registrieren sich
selbst über den `StandardAutoloader`.

Schließlich fügt die Plattformdatei `config/autoload/platforms/<MELIS_PLATFORM>.php` die
**Datenbankverbindung** und die Plattformeinstellungen in die zusammengeführte Konfiguration ein.

## Lebenszyklus einer Backoffice-Anfrage

Es gibt nun **zwei Zugänge** zum Backoffice, die beide durch das Routing und die
Identitätsprüfung von MelisCore gesteuert werden:

- **`/melis-react…`** — die React-Shell (die Standard-Oberfläche). Eine Regex-Route liefert ein
  einzelnes HTML-Dokument aus; alles Übrige wird als JSON über `/melis/react-api/…` abgerufen und die
  Werkzeuge werden als Bricks oder Iframes gerendert (siehe unten).
- **`/melis…`** — das klassische, serverseitig gerenderte Backoffice, weiterhin voll funktionsfähig
  und als Iframe-Ziel für Legacy-Werkzeuge verwendet.

Für eine **`/melis…`**-URL steuert MelisCore den klassischen Ablauf. Die zentralen Hooks werden in
`MelisCore\Module::onBootstrap()` angehängt:

1. **Routing** — die Route `melis-backoffice` (und ihre Kind-Routen: `login`, `authenticate`,
   `logout`, `zoneview`, `react-tool-page`, …) greift.
2. **`MvcEvent::EVENT_ROUTE` → Identitätsprüfung** — `Module::checkIdentity()` wird ausgeführt. Wenn
   die getroffene Route nicht in der Ausschlussliste steht (`login`, `authenticate`,
   `change-language`, die React-SPA und ihre Boot-Endpunkte …) und der Benutzer nicht authentifiziert
   ist, **leitet sie auf `/melis/login` um** (oder gibt für Nicht-GET-Anfragen 404 zurück).
3. **Sitzung & Sprache** — der Sitzungscontainer `meliscore` wird initialisiert; das Gebietsschema
   (`melis-lang-locale`) steuert `Module::createTranslations()`, das
   `language/<locale>.{interface,forms,…}.php` lädt.
4. **`EVENT_DISPATCH`** — das Layout wird auf `layout/layoutCore` gesetzt, und die Kern-Listener
   laufen: `MelisCoreCheckUserRightsListener` (liest die Rechte periodisch neu ein),
   `MelisCoreFlashMessengerListener`, `MelisCorePhpWarningListener` und andere.
5. **Zonen-Rendering** — die Backoffice-Oberfläche ist ein Baum aus **Zonen**;
   `PluginViewController` löst den `forward` jeder Zone auf (Modul/Controller/Action) und rendert ihn,
   wobei das endgültige HTML zusammengesetzt wird
   (siehe [Konzepte → Zonen & Forwards](./concepts#_3-zones-forwards-how-the-backoffice-renders)).

```
GET /melis
  → route: melis-backoffice
  → EVENT_ROUTE: checkIdentity() → redirect to /melis/login if not logged in
  → EVENT_DISPATCH: layout = layout/layoutCore; rights/flash/warning listeners
  → PluginViewController renders zones (header, left menu, center, footer) via forwards
  → response
```

## Lebenszyklus des React-Backoffice

Für eine **`/melis-react…`**-URL teilt sich der Ablauf zwischen einem einmaligen Laden der Shell und
den nachfolgenden JSON-Aufrufen auf:

1. **SPA-Route** — `MelisReactOverride\Controller\SpaController` liefert die React-Shell `index.html`
   aus (gebaut nach `melis-core/public/ui-react/`), sowohl für `/melis-react` als auch für jeden
   Deep-Link darunter (`/melis-react/news/5`, …). Die Route ist **öffentlich** — die React-Anwendung
   führt ihren **eigenen Login-Bildschirm** aus — und setzt sich über eine hochpriorisierte
   Regex-Route gegenüber der Catch-all-Route von MelisFront durch.
2. **Boot-Abrufe** — die Shell ruft die generischen Endpunkte von
   [`melis-react-api`](/de/reference/modules/melis-react-api) auf:
   `GET /me` (aktueller Benutzer + Fähigkeiten), `GET /menu` (der nach Rechten gefilterte
   Navigationsbaum), `GET /langs` (Backoffice-Sprachen), `GET /assets` (CSS/JS für Werkzeug-Iframes)
   sowie `GET /react-modules` + `/bricks-bundle.js` (Brick-Erkennung). Jede Antwort folgt dem Vertrag
   `{ success, data, error? }`.
3. **Werkzeug-Rendering** — ein Klick auf einen Menüeintrag öffnet einen **Brick** (ein natives
   React-Werkzeug), sofern sein Modul einen mitliefert, andernfalls ein **Legacy-Werkzeug in einem
   Iframe**, das über `/melis/react-tool-page?key=<melisKey>` ausgeliefert wird
   (siehe [Bricks & der Iframe-Mechanismus](#bricks-the-iframe-mechanism)).
4. **KI-Assistent-Overlay** — eine schwebende Chat-Schaltfläche, die einmal an der Wurzel der Shell
   gerendert wird (aus [`melis-ai`](/de/reference/modules/melis-ai)), übersteht die Navigation und
   kann das Backoffice aus der Konversation heraus steuern (ein Werkzeug öffnen, eine Seite öffnen).
   Siehe den [KI-Leitfaden](./ai).

```
GET /melis-react
  → SpaController serves ui-react/index.html (public route)
  → shell boot: GET /me, /menu, /langs, /assets, /react-modules (+ /bricks-bundle.js)
  → click a tool → React brick, or iframe → /melis/react-tool-page?key=<melisKey>
  → AI Assistant overlay mounted at the shell root
```

## Bricks & der Iframe-Mechanismus

Die React-Shell ist **modular**: ein Werkzeug erscheint **genau dann**, wenn sein Modul aktiv ist.

- **Brick-Erkennung** — `GET /melis/react-api/react-modules` durchsucht die aktiven Module nach
  `public/ui-react/brick.manifest.json` und gibt deren `BrickDef`s zurück (`{ id, module, route,
  label, forwardKey, melisKey, subTabs, … }`) sowie ein einziges verkettetes `/bricks-bundle.js`.
  Jeder Brick ist ein IIFE, das sich selbst auf `window.__MELIS_BRICK_COMPONENTS__` registriert; die
  Signatur `?v=<sig>` macht das Bundle für ein Jahr sicher cachebar.
- **Umschalter Neu / Alt** — die meisten Bricks tragen einen Umschalter **Neu (React) / Alt
  (Iframe)**. *Neu* ist der native React-Bildschirm; *Alt* lädt das klassische Werkzeug über den
  Iframe-Mechanismus weiter unten, sodass während der Migration nie etwas verloren geht.
- **Legacy-Iframe** — `PluginViewController::toolPageAction()` von
  [`melis-react-override`](/de/reference/modules/melis-react-override) rendert genau eine Zone
  (aufgelöst aus `?key=<melisKey>`) als **eigenständige HTML-Seite** und gibt sie mit
  `X-Frame-Options: SAMEORIGIN` zurück. Es erzwingt `X-Requested-With: XMLHttpRequest`, damit Zonen
  mit `follow_regular_rendering:false` auf die AJAX-Weise gerendert werden, hält die PHP-Session-ID
  über das Rendering hinweg fest, injiziert die modul-eigenen JS/CSS-`ressources` des Werkzeugs (das
  Kern-`bundle.js` trägt nur die Werkzeuge von MelisCore) und umgeht eine lange Liste von
  Legacy-Eigenheiten, sodass das Werkzeug innerhalb des Frames genauso aussieht und sich genauso
  verhält wie beim direkten Zugriff über `/melis` (mit seinen eigenen DataTables, Modals,
  Gritter-Toasts und feldweiser Validierung).

Die Shell liefert Plattform-Assets an diese Iframes über
`MelisReactOverride\Service\PlatformAssetsService::build()` — dasselbe CSS/JS, das die klassische
`layoutCore.phtml` lädt — sodass ein Legacy-Werkzeug innerhalb der React-Shell identisch startet.

## Authentifizierung & Rechte

**Login** wird von `MelisCoreAuth` (`MelisCoreAuthService`) abgewickelt, einem
Laminas-Authentifizierungsdienst über die Tabelle `melis_core_user` (`usr_login` / `usr_password`,
bcrypt über `password_hash`). Die authentifizierte Identität — einschließlich der `usr_rights` des
Benutzers — wird in der Sitzung gespeichert. Die React-Shell steuert **dieselbe** Authentifizierung
(sie rendert ihren eigenen Login-Bildschirm, sendet aber an denselben Dienst); `GET /me` gibt die
Identität nach der Authentifizierung zurück, `GET /langs` und der Branding-Abruf des Login-Panels sind
die einzigen Endpunkte, die vor dem Login öffentlich sind.

**Rechte** kontrollieren den Zugang zum Backoffice. `MelisCoreRights` (`MelisCoreRightsService`) liest
die `usr_rights` des Benutzers — eine **XML-Erlaubnisliste** — um zu entscheiden, was sichtbar und
aufrufbar ist:

- Die **Abschnitte des linken Menüs**, die ein Benutzer sieht, sind die
  `*_toolstree_section`-Knoten, die in seinen Rechten aufgeführt sind (`isAccessible()`); ein **leeres
  Rechte-XML bedeutet vollen Zugriff**. In der React-Shell erfolgt dieselbe Filterung serverseitig in
  `GET /menu`, das nur die Knoten ausgibt, auf die der Benutzer per `canAccess` zugreifen darf.
- Ein Werkzeug, für das dem Benutzer die Rechte fehlen, ergibt *„You don't have access to this
  tool"*.
- Die Rechte liegen in `melis_core_user.usr_rights`; bei rollenbasierten Benutzern können sie aus der
  Rolle stammen (`melis_core_user_role`). `MelisCoreCheckUserRightsListener` aktualisiert sie
  periodisch und meldet den Benutzer ab, wenn `usr_status` inaktiv wird.

**Erweiterte Rechte (Capabilities).** Das React-Backoffice fügt eine feinere Ebene hinzu, die *der*
Zugriffsprüfung des Werkzeugs *untergeordnet* ist: **Capabilities** pro Werkzeug (`list` / `create` /
`edit` / `delete` oder verschachtelte Tabs). Module deklarieren über `config/react.capabilities.php`,
welche Capabilities existieren; der Resolver `MelisReactApi\Service\Capabilities` arbeitet nach dem
Prinzip **Standard erlauben** — eine Capability wird nur dann verweigert, wenn sie sowohl deklariert
ist als auch in einem dedizierten Abschnitt `<meliscore_tool_capabilities>` des Rechte-XML vorhanden
ist. Werkzeug-Controller kontrollieren ihre Aktionen mit
`CapabilityGuardTrait::denyUnlessCan($cap)` (Administratoren umgehen dies), und dieselbe Erlaubnis-Map
gelangt clientseitig über `GET /me` an, um die Oberfläche auszublenden. Dies befindet sich in
[`melis-react-api`](/de/reference/modules/melis-react-api); die Verweigerungsliste wird unter
**Users → Rights** bearbeitet.

::: tip Ein neues Werkzeug freischalten
Nachdem Sie ein Werkzeug hinzugefügt haben, gewähren Sie den Zugriff über **Users → Rights** im
React-Backoffice (dessen Matrix für erweiterte Rechte wird über `GET /rights/capabilities` gespeist),
oder fügen Sie den Abschnitt mit einer Migration in das Rechte-XML ein — siehe
`flyway/sql/V3__add_melisai_rights.sql`.
:::

## Lebenszyklus einer Front-Office-Anfrage

Für eine öffentliche URL rendern **MelisFront** + **MelisEngine** eine CMS-Seite (in v6 unverändert):

1. **Routing** — `melis-front` greift bei `…/id/{idpage}`. SEO-URLs (`/about-us`) werden von
   `MelisFrontSEORouteListener` zu einer Seiten-ID aufgelöst (er fragt die Seiten-SEO-Tabelle ab und
   registriert zur Modul-Ladezeit eine dynamische Route).
2. **Dispatch** — die Front-Listener wählen das Front-Layout aus und ziehen den Seiten-Cache zu Rate.
3. **Seitenladen** — `MelisEngine\Service\MelisPageService::getDatasPage($idPage, $type)` gibt eine
   `MelisPage` zurück (Seitenbaum-Daten + Template), zwischengespeichert unter
   `getDatasPage_{id}_{type}`.
4. **Template-Rendering** — der `ZF2`-Controller/die Action des Templates rendert die `.phtml` des
   Site-Moduls; `MelisTag`-Zonen und `MelisDragDropZone`-Plugins werden aus dem **veröffentlichten**
   Inhalt befüllt.

```
GET /about-us
  → MelisFrontSEORouteListener maps /about-us → idpage=5
  → MelisFront\Controller\Index::index(idpage=5)
  → MelisPageService::getDatasPage(5, 'published')  (cached)
  → template ZF2 controller/action → site .phtml → MelisTag / MelisDragDropZone
  → response
```

> Die hochpriorisierte Regex-Route `/melis-react` setzt sich absichtlich gegenüber dieser
> Catch-all-Route durch, sodass ein vollständiges Neuladen der Seite bei einem React-Deep-Link zur SPA
> aufgelöst wird und nicht zu einer „404 page not found".

## Caching

Melis nutzt aggressives Caching über Dateisystem-Caches unter `cache/`:

| Cache | Inhalt |
| --- | --- |
| `meliscore_platform_cache-*` | gerenderte Backoffice-Zonen / Plattformkonfiguration |
| `meliscms_page-*`, `melisfront_pages_file_cache-*` | gerenderte CMS-Seiten |
| `cache/config/` | zusammengeführte Laminas-Konfiguration (nur bei `config_cache_enabled`) |
| `datasource-*`, `melistoolcreator-*` | modulspezifische Caches |

`MelisCoreCacheSystemService` ist die Cache-API (`getCacheByKey`/`setCacheByKey`/
`deleteCacheByPrefix`). Caches werden bei zentralen Events invalidiert (Moduländerungen,
Seitenveröffentlichung, Rechte-Aktualisierungen) und können manuell durch Löschen der jeweiligen
`cache/*`-Ordner geleert werden — siehe [Fehlerbehebung](./troubleshooting). Die React-Ebene fügt ihre
eigenen kostengünstigen Caches hinzu: das Erkennungs-Bundle wird unveränderlich mit einer
Inhaltssignatur ausgeliefert, und `PlatformAssetsService` merkt sich das verkettete Modul-CSS/-JS
(und regeneriert `etc/bundles/`, falls das Modul-Werkzeug es geleert hat).

## Events

Melis ist stark **event-gesteuert**. Module hängen Listener in `Module::onBootstrap()` an (und über
den gemeinsamen Event-Manager) — sowohl an den MVC-Lebenszyklus (`EVENT_ROUTE`, `EVENT_DISPATCH`,
`EVENT_RENDER`, `EVENT_FINISH`) als auch an **Melis-Domänen-Events** (z. B.
`melis_core_auth_login_ok`, Seiten-Speicher-Events). Domänen-Dienste erweitern
`MelisGeneralService`, der `sendEvent()` hinzufügt, sodass jeder Dienst Events veröffentlichen kann,
die andere Module abonnieren. Dies ist der primäre, entkoppelte Erweiterungsmechanismus — bevorzugen
Sie einen Listener gegenüber dem Patchen eines anderen Moduls.

Die React-Ebene folgt derselben Philosophie „akkumulieren, nicht überschreiben": Anstatt Eigenheiten
pro Werkzeug fest zu verdrahten, stellt `melis-react-override` einen `toolpage_extensions`-Hook
bereit, den jedes Modul implementieren kann, um das HTML oder die Assets eines Legacy-Werkzeugs
innerhalb des Frames anzupassen (verwendet zum Beispiel von
[`melis-ai-community-extensions`](/de/reference/modules/melis-ai-community-extensions)).

## Die Anfrage in einem Bild

```
public/index.php
  → application.config.php  (MelisModuleManager assembles modules + platform DB config)
  → Laminas MVC run
     ├── /melis-react → SpaController serves the React shell (public)
     │                    → boot JSON: /me /menu /langs /assets /react-modules
     │                    → brick, or iframe → /melis/react-tool-page?key=<melisKey>
     ├── /melis…      → auth (checkIdentity) → rights → PluginViewController zones (forwards)
     └── public URL   → MelisFront route (id/SEO) → MelisEngine page load → site template
  → caching at every expensive step (MelisCoreCacheSystemService)
  → response
```

## Zentrale Dateien

| Bereich | Pfad |
| --- | --- |
| App-Konfiguration / Bootstrap | `config/application.config.php` |
| Modul-Zusammenstellung | `vendor/melisplatform/melis-core/src/MelisModuleManager.php` |
| Kern-Bootstrap / Listener | `vendor/melisplatform/melis-core/src/Module.php` |
| Authentifizierung | `vendor/melisplatform/melis-core/src/Service/MelisCoreAuthService.php` |
| Rechte | `vendor/melisplatform/melis-core/src/Service/MelisCoreRightsService.php` |
| Konfigurationsbaum | `vendor/melisplatform/melis-core/src/Service/MelisCoreConfigService.php` |
| Zonen-Rendering | `vendor/melisplatform/melis-core/src/Controller/PluginViewController.php` |
| Cache-API | `vendor/melisplatform/melis-core/src/Service/MelisCoreCacheSystemService.php` |
| Front-Routing/SEO | `vendor/melisplatform/melis-front/src/Listener/MelisFrontSEORouteListener.php` |
| Seiten-Dienst | `vendor/melisplatform/melis-engine/src/Service/MelisPageService.php` |
| React-JSON-API | `vendor/melisplatform/melis-react-api/src/Controller/MelisReactApiController.php` |
| Capability-Resolver | `vendor/melisplatform/melis-react-api/src/Service/Capabilities.php` |
| SPA + Legacy-Iframe | `vendor/melisplatform/melis-react-override/src/Controller/` |
| React-Shell (SPA-Quelle) | `vendor/melisplatform/melis-core/ui-react/` |
