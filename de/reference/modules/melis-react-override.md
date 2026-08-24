# MelisReactOverride

> React-Backoffice-Infrastruktur: Rendert Legacy-Tools innerhalb der `/melis-react`-Shell und liefert die React-SPA aus. Paket `melisplatform/melis-react-override`.

## Zweck

MelisReactOverride ist ein **React-Backoffice-Infrastrukturmodul** — kein Tool. Es liefert keinen
Brick, keine React-Seite, keine `react-api`-Endpunkte und keine eigene Ansicht. Es stellt die beiden
Verbindungsmechanismen bereit, die es dem React-Backoffice (`/melis-react`) ermöglichen, parallel zum
Legacy-`/melis` zu laufen:

1. **Legacy-Tool-iframe-Mechanismus** — jedes Legacy-jQuery/AJAX-Tool, das über keine dedizierte
   React-Seite verfügt, wird als eigenständige HTML-Seite (`/melis/react-tool-page?key=<melisKey>`)
   gerendert und innerhalb der React-Shell in einem `<iframe>` angezeigt. Das Tool innerhalb des
   Frames sieht aus und verhält sich genau wie beim direkten `/melis`-Zugriff — mit seinen eigenen
   DataTables, Formularen, Modalen, Tabs, Speichern-Schaltflächen und nativen Benachrichtigungen
   (Gritter-Toasts, Validierungsmodalen pro Feld).
2. **SPA-Fallback-Route** — sie liefert die React-Shell `index.html` für `/melis-react` und jeden
   clientseitigen Deep-Link darunter aus und macht diese Route (samt einiger schreibgeschützter
   Boot-Endpunkte) öffentlich.

Sie navigieren niemals *zu* diesem Modul. Faustregel: Wenn Sie sich innerhalb von `/melis-react`
befinden und eine Tool-Ansicht im alten Stil (klassisches Bootstrap) betrachten, sehen Sie eine von
MelisReactOverride erzeugte Seite.

## Aktivierung

Es handelt sich um ein reines serverseitiges Laminas-MVC-Modul, das über `application.config.php`
(`module_paths` + `modules`) geladen wird — `src/Module.php` lädt `MelisReactOverride\*` per
Autoloading aus `src/` über den `StandardAutoloader`. Kategorie `core`.

Es **überschreibt den `PluginView`-Controller von MelisCore** durch eine React-fähige Version über
einen `controllers.invokables`-Alias. Da dieses Modul *nach* melis-core geladen wird, gewinnt der
Alias das Laminas-Konfigurations-Merge:

```php
'controllers' => [
    'invokables' => [
        'MelisCore\Controller\PluginView'   => \MelisReactOverride\Controller\PluginViewController::class,
        'MelisReactOverride\Controller\Spa' => \MelisReactOverride\Controller\SpaController::class,
    ],
],
```

## Auf einen Blick

| Eigenschaft | Wert |
| --- | --- |
| Modulname | `MelisReactOverride` |
| Paket | `melisplatform/melis-react-override` |
| Kategorie | `core` |
| Brick / `ui-react/` / `react-api.php` | **keine** (nur Infrastruktur) |
| Controller | `PluginViewController` (als Alias über `MelisCore\Controller\PluginView`), `SpaController` |
| Services | `PlatformAssetsService`, `LegacyWidgetCssService` |
| Erweiterungspunkt | `PluginViewToolPageExtensionInterface` (`toolpage_extensions`-Hook) |

## Routen

Alle Tool-/iframe-Routen sind Unterrouten von `melis-backoffice`, liegen also unter `/melis`. Die
SPA-Route ist eine Regex-Route auf oberster Ebene.

| Routenname | URL | Action | Zweck |
| --- | --- | --- | --- |
| `melis-backoffice/react-tool-page` | `/melis/react-tool-page` | `toolPage` | **Kernmechanismus.** Rendert eine Legacy-Tool-Zone als eigenständige HTML-Seite für einen iframe. Erwartet `?key=<melisKey>` (und `?idPage=<id>` für den CMS-Seiteneditor). |
| `melis-backoffice/react-dashboard-plugin` | `/melis/react-dashboard-plugin` | `dashboardPluginPage` | Ein einzelnes Legacy-Dashboard-Plugin als minimale eigenständige Seite. |
| `melis-backoffice/react-dashboard-plugin-config` | `/melis/react-dashboard-plugin-config` | `dashboardPluginConfigPage` | Das Konfigurationsformular eines Dashboard-Plugins (Zahnrad-Schaltfläche) als eigenständiges HTML. |
| `melis-backoffice/react-dashboard-plugin-config-data` | `/melis/react-dashboard-plugin-config-data` | `dashboardPluginConfigData` | JSON: das Konfigurationsformular als Daten (Tabs + typisierte Felder + Werte), damit React es nativ rendert. |
| `melis-backoffice/react-dashboard-plugin-config-save` | `/melis/react-dashboard-plugin-config-save` | `dashboardPluginConfigSave` | POST: Validieren und Persistieren der Konfiguration eines Dashboard-Plugins. |
| `melis-backoffice/react-dashboard-plugin-content` | `/melis/react-dashboard-plugin-content` | `dashboardPluginContent` | JSON: HTML + Skripte + jsCallbacks zur direkten DOM-Injektion (kein iframe). |
| `melis-backoffice/react-platform-bundle` | `/melis/react-platform-bundle` | `platformBundle` | Liefert das verkettete Asset-Bundle mit dem korrekten MIME-Typ aus (ersetzt MelisCores `/melis/get-{css,js}-bundles`, die ein leeres `text/html` zurückgeben, wenn das Bundle fehlt). |
| `melis-backoffice/react-legacy-widget-css` | `/melis/react-legacy-widget-css` | `legacyWidgetCss` | Legacy-Backoffice-Stylesheets, jede Regel unter `.melis-legacy-widget` gekapselt. |
| `meliscore-melis-react-spa` | `/melis-react`, `/melis-react/*` | `spa` | **SPA-Fallback.** Liefert die React-Shell `index.html` aus. Regex-Route, `priority => 1000`. |

### Öffentliche Routen (`excluded_routes`)

Das Modul hängt an MelisCores `plugins.meliscore.datas.excluded_routes` an (numerische Arrays werden
durch Anhängen zusammengeführt), sodass `MelisCore\Module::checkIdentity()` diese durchlässt, ohne
zu `/melis/login` umzuleiten:

- `meliscore-melis-react-spa` — die Shell ist öffentlich, da die React-App ihre eigene
  Authentifizierung übernimmt (eigener Login-Bildschirm).
- `melis-backoffice/react-platform-bundle` — damit eine abgelaufene Sitzung ein Stylesheet nicht
  auf eine HTML-Login-Seite umleitet (genau der MIME-Fehler, den diese Route behebt).
- `melis-backoffice/melis-react-api/platformscheme-react-get` — Branding des Login-Panels, das vor
  der Authentifizierung gelesen wird (nur GET).
- `melis-backoffice/melis-react-api/langs` — die Backoffice-Sprachliste, die die SPA beim Start
  lädt, auch auf dem Login-Bildschirm (schreibgeschützt).

> Die letzten beiden sind `melis-react-api`-Routen (im Besitz von **MelisReactApi**);
> MelisReactOverride macht sie lediglich öffentlich, definiert sie aber nicht.

## Der iframe-Mechanismus — `toolPageAction()` → `buildToolPage()`

`PluginViewController::toolPageAction()` löst einen melisKey auf, rendert dessen Zone und übergibt
das HTML an `buildToolPage()`, um ein eigenständiges Dokument zusammenzustellen. Ablauf:

1. **Auth-Guard** — `denyIfUnauthenticated()` läuft zuerst (diese Seite ist *nicht* öffentlich).
2. **melisKey → appConfig-Pfad auflösen** — `MelisCoreConfig->getMelisKeys()` bildet `?key=` auf
   einen App-Config-Pfad ab; das letzte Segment ist der View-Key.
3. **XHR-Modus erzwingen** — fügt `X-Requested-With: XMLHttpRequest` hinzu, damit `generateRec()`
   die Zonen mit `follow_regular_rendering:false` genauso rendert wie der klassische AJAX-Pfad
   (andernfalls fallen diese Tools ans Frontend zurück und rendern ein „404 MelisDemoCms“).
4. **PHP-Session-ID fixieren** — vor dem Render einen Snapshot erstellen, danach wiederherstellen
   (einige Legacy-Tools rotieren die Session-ID während des Renderns — harmlos in `/melis`, hier
   fatal).
5. **Zone rendern** mit `generateRec()` + `renderViewRec()`, wobei jegliche versprengte Ausgabe,
   die eine Zone in den Stream `echo`t, abgefangen wird (als HTML-Kommentar aus dem Markup
   herausgehalten, zur Diagnose).
6. **`adjustToolHtml()`-Erweiterungen ausführen** (`toolpage_extensions`) auf dem gerenderten HTML.
7. **Plattform-Assets erstellen** über `PlatformAssetsService::build()` und die eigenen JS/CSS
   `ressources` des Moduls injizieren.
8. **`adjustToolAssets()`-Erweiterungen ausführen** (können einiges Modul-JS in den `<head>`-Bucket
   verschieben und `skipJsRoots` zurückgeben, damit die generische Schleife es nicht doppelt lädt).
9. **Zusammenstellen** von `buildToolPage($html, $jsCallBacks, $assets, $zoneId, $key)` und
   Rückgabe als `text/html` mit `X-Frame-Options: SAMEORIGIN`.

### Von `buildToolPage()` gelöste Fallstricke

- **Den „Remove Envato Frame“-Guard von bundle.js neutralisieren** — innerhalb eines gesandboxten
  iframes wirft der Guard einen `SecurityError`, der bundle.js abbricht. Die Seite erfasst den
  echten Parent (`window.__melisRealParent`) und definiert dann `window.parent`/`window.top` neu,
  sodass sie `window` zurückgeben.
- **`melisDataTable.js` separat laden** — in `app.interface.php` deklariert, aber in `bundle.js`
  nicht enthalten; wird der JS-Queue hinzugefügt (stellt `window.melisDataTable` bereit).
- **Globaler `Proxy`-Shim** — für Objekte, die nur innerhalb des `$(function(){…})` von bundle.js
  definiert sind und noch nicht verfügbar sind, wenn die synchronen Body-Skripte eines Tools
  geparst werden, vermeidet ein No-op-`Proxy` frühzeitige Fehler.
- **jsCallbacks in try/catch einbetten** — ein Callback, dessen Abhängigkeit im eigenständigen
  Modus nicht geladen ist, bricht die Seite nicht ab.
- **Die JS/CSS `ressources` des Moduls injizieren** — das Kern-`bundle.js` enthält nur
  MelisCore-Tools; Modul-Tools liefern ihre eigenen Dateien mit (z. B. `news.tool.js` →
  `window.initNewsList`). Der Controller sammelt jeden Root, den das Tool benötigt — seinen eigenen
  Plugin-Root, über `type`-Links erreichte Roots (rekursiv durchlaufen, zyklusgeschützt) und
  `forward`-Modulknoten, plus einige zusätzliche Roots für bekannte zusammengesetzte Editoren
  (z. B. `meliscms_page`), alle so abgesichert, dass inaktive Module nichts laden.
- **JS-Reihenfolge Head vs. Ende des Body** — Plattform-JS lädt im `<head>`; Modul-`ressources`
  laden innerhalb des `<body>` nach der Tab-Leiste, aber vor dem Tool-HTML, was das klassische BO
  widerspiegelt.
- **Editor-Tab-Shell** — enthält die klassischen Tab-Anker (`#melis-id-nav-bar-tabs` ausgeblendet,
  `#melis-id-body-content-load`, globales `activeTabId`), damit klassische Bearbeitungsabläufe
  funktionieren.
- **`<base href="/">`**, damit relative Tool-AJAX-URLs vom Site-Root aufgelöst werden.
- **Modal-Einhängepunkt `#melis-modals-container`** plus einem Self-Heal-Watcher für verirrte
  Backdrops.
- **Export-Fix** — bindet `melisCoreTool.exportData()` an einen In-Frame-Anker-Klick neu (das
  Legacy-`window.open`-Popup landet den Download in einem gesandboxten iframe nie).
- **Tool-Tab-Bridge & Tool-Ergebnis-postMessage** — die ausgeblendete Tab-Leiste wird über
  `postMessage({ __melisToolTabs, … })` zum Host gespiegelt; eine `{ __melisToolResult, url, data }`-
  Nachricht wird nach einem JSON-Speichervorgang gepostet, damit der Host strukturell reagieren
  kann. Es wird keine sichtbare Benachrichtigung überbrückt — Legacy-Tools behalten ihr eigenes
  natives Feedback.

## Plattform-Assets — `PlatformAssetsService`

`PlatformAssetsService::build($sm)` gibt `['css' => …, 'js' => …, 'inline' => …]` zurück, die
Plattform-Asset-Liste, mit der jeder Tool-iframe bootstrappt:

- **CSS** — alle `bundle.css`-Dateien der Module (parallel geladen), vorangestellt mit Google Fonts
  und `/assets/css/schemes.css`, gefiltert auf Dateien, die auf der Festplatte existieren.
- **JS-Queue** (Reihenfolge ist wichtig) — `get-translations?locale=…`,
  `MelisCore/build/js/bundle.js`, dann die nicht gebündelten Extras: `melisDataTable.js`,
  `loader.js`, `findpage.tool.js`, `bootstrap-tagsinput.js`, `typeahead.bundle.js`, `moment/fr.js`,
  `melis_tinymce.js`.
- **Inline-Globals** — `basePath`, `primaryColor`, … gelesen aus dem aktiven Plattform-Schema
  (`MelisCorePlatformSchemeService`), mit den Melis-Standardfarben als Fallback.
- **Bundle-Caching / Self-Healing** — der aufwendige Aufruf
  `MelisAssetManagerWebPack->getAssets(true)` wird zwischengespeichert (temporäre Datei, 600s TTL +
  In-Process-Memoisierung); wenn `etc/bundles/` durch das Modules-Tool geleert wurde, wird es unter
  einem Single-Writer-Lock neu erzeugt, oder die verkettete Route wird gegen
  `/melis/react-platform-bundle` ausgetauscht.
- **`bust($url)`** hängt `?v=<mtime>` an lokale Asset-URLs an.

`LegacyWidgetCssService` versorgt die `react-legacy-widget-css`-Route — Legacy-BO-CSS, gekapselt
unter `.melis-legacy-widget`, damit es nicht auf die React-Shell durchsickern kann (verwendet von
Nicht-iframe-Legacy-Widgets, die direkt in das React-DOM injiziert werden, z. B.
Dashboard-Plugin-Inhalte).

## SPA-Fallback — `SpaController`

`SpaController::spaAction()` liefert die React-Shell für `/melis-react` und jeden clientseitigen
Deep-Link aus:

- Löst `index.html` über `$_SERVER['DOCUMENT_ROOT']` auf und liest
  `…/vendor/melisplatform/melis-core/public/ui-react/index.html` (der React-Build liegt in
  melis-cores `public/`, ausgeliefert unter `/MelisCore/ui-react/`). Funktioniert unabhängig davon,
  wo dieses Modul auf der Festplatte liegt.
- Gibt `404` zurück, wenn die Shell fehlt; andernfalls gibt es die Datei als
  `text/html; charset=utf-8` mit `Cache-Control: no-cache, no-store, must-revalidate` zurück (die
  Shell wird nie zwischengespeichert; referenzierte Assets sind inhalts-gehasht).
- Echte Dateien (Root-`index.html`, gehashte Assets) werden bereits früher von MelisAssetManager
  beim Bootstrap gestreamt, sodass hier nur virtuelle clientseitige Routen (z. B.
  `/melis-react/news/5`) durchfallen.

Die Regex-Route `meliscore-melis-react-spa` (`priority => 1000`) gewinnt gegen die Catch-all-
Front-Route von MelisFront. Ihre Regex `'/melis-react(?<spa>/[a-zA-Z0-9_\-/~.]*)?'` enthält `~`
(Trennzeichen für zusammengesetzte IDs) und `.`, sodass diese Deep-Links bei einem vollständigen
Seiten-Reload zur SPA aufgelöst werden.

## Erweiterungspunkt — der `toolpage_extensions`-Hook

Tool-spezifische Eigenheiten leben im **besitzenden** Modul, nicht hier fest verdrahtet. Ein Modul
registriert einen Servicenamen unter `config('melis_react_override')['toolpage_extensions'][]` und
implementiert `MelisReactOverride\Controller\PluginViewToolPageExtensionInterface`:

```php
interface PluginViewToolPageExtensionInterface
{
    // Adjust the rendered zone HTML for a melisKey before assembly (return $html unchanged
    // for keys the extension doesn't care about).
    public function adjustToolHtml(string $key, string $html, array $jsCallBacks, PluginViewController $controller): string;

    // Adjust the platform asset bundle. Return ['assets' => array, 'skipJsRoots' => array<string, true>];
    // 'skipJsRoots' lists roots the extension already injected so the generic loop must NOT re-add them.
    public function adjustToolAssets(string $key, string $html, array $assets, PluginViewController $controller): array;
}
```

`PluginViewController::toolPageExtensions()` löst die registrierten Namen auf, **überspringt
stillschweigend** Namen, die keine registrierten Services sind oder das Interface nicht
implementieren (sodass eine Erweiterung vollständig optional ist — Modul nicht installiert →
No-op), cacht die Liste und ruft `adjustToolHtml()` (Schritt 6) und `adjustToolAssets()` (Schritt 8)
für jede auf.

> **Warum ein Konfigurations-Array statt eines Controller-Overrides:** Beiträge verschiedener
> Module akkumulieren sich einfach, unabhängig von der Ladereihenfolge (anders als bei einem
> Controller-Alias, bei dem nur das zuletzt gemergte Modul gewinnt).

**Beispiel-Konsument.** MelisAICommunityExtensions registriert
`MelisAICommunityExtensions\Controller\React\PluginViewToolPageExtension` unter
`melis_react_override.toolpage_extensions`, um seine `tool.js` / `style.css` in Legacy-Tool-Seiten
zu injizieren, die in der React-Ansicht „Old“ ausgeliefert werden.

## Wichtige Dateien

| Belang | Pfad |
| --- | --- |
| Routen, Controller-Override, `excluded_routes` | `config/module.config.php` |
| Modul-Bootstrap + Autoloader | `src/Module.php` |
| iframe-Mechanismus, Dashboard-Actions, Erweiterungen | `src/Controller/PluginViewController.php` |
| Auslieferung der SPA-Shell | `src/Controller/SpaController.php` |
| `toolpage_extensions`-Vertrag | `src/Controller/PluginViewToolPageExtensionInterface.php` |
| Plattform-Asset-Build + Bundle-Cache | `src/Service/PlatformAssetsService.php` |
| Gekapseltes Legacy-BO-CSS | `src/Service/LegacyWidgetCssService.php` |

Siehe auch: [melis-core](/legacy/reference/modules/melis-core)

> **Keine UI, keine Screenshots.** MelisReactOverride ist Infrastruktur ohne eigene Oberfläche —
> was auf dem Bildschirm erscheint, ist das *Legacy-Tool*, das es rendert, oder die *React-Shell*,
> die es ausliefert, beide in ihren eigenen Modulen dokumentiert.
