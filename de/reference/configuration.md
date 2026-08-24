# Konfigurationsreferenz

Alles, was Sie in Melis konfigurieren können, an einem Ort: Umgebungsvariablen, die Plattform-Datei, die
`app.*.php`-Konfigurationsfamilie, Melis-Keys, Übersetzungen, Assets und Caches.

## Umgebungsvariablen

Zwei Variablen steuern jede Installation (festgelegt in `docker-compose.yml` oder über Apache `SetEnv`):

| Variable | Zweck |
| --- | --- |
| **`MELIS_PLATFORM`** | Wählt die Plattform-Konfiguration `config/autoload/platforms/<MELIS_PLATFORM>.php` (die DB-Verbindung). Z. B. `local`, `dev1`. |
| **`MELIS_MODULE`** | Das **Site-Modul**, das als Frontoffice für diese Domain ausgeliefert wird (z. B. `MelisDemoCms`). |
| `MYSQL_HOSTNAME` / `MYSQL_DATABASE` / `MYSQL_USER` / `MYSQL_PASSWORD` | DB-Verbindung, üblicherweise von der Plattform-Datei über `getenv()` gelesen. |

## Die Plattform-Datei

`config/autoload/platforms/<MELIS_PLATFORM>.php` enthält die **Datenbankverbindung** (und einige Host-Einstellungen).
Sie wird zuletzt zusammengeführt und überschreibt daher die Standardwerte je Umgebung:

```php
return [
    'db' => [
        'driver'   => 'Mysqli',
        'hostname' => getenv('MYSQL_HOSTNAME') ?: 'localhost',
        'database' => getenv('MYSQL_DATABASE'),
        'username' => getenv('MYSQL_USER'),
        'password' => getenv('MYSQL_PASSWORD'),
        'port'     => '3306',
        'charset'  => 'utf8mb4',
    ],
    'melis_platform'       => getenv('MELIS_PLATFORM'),
    'melis_http_host'      => 'localhost',
    'melis_request_scheme' => 'http',
];
```

Welche Datei geladen wird, wird in `config/application.config.php` (`config_glob_paths`) anhand von
`getenv('MELIS_PLATFORM')` bestimmt.

## Projektkonfigurationsdateien

| Datei | Rolle |
| --- | --- |
| `config/melis.module.load.php` | Die geordnete Liste der zu ladenden **Backoffice-Module**. |
| `config/melis.modules.path.php` | Generierte Zuordnung: Modulname → Dateisystempfad (erstellt von `MelisAssetManager`). |
| `config/application.config.php` | App-Einstiegspunkt: Modulzusammenstellung, Glob-Pfade, Cache-Flags. |
| `config/autoload/{global,local}.php` | Standard-Laminas-Autoload-Konfiguration. |
| `config/autoload/platforms/<env>.php` | Umgebungsspezifische DB-/Plattform-Konfiguration (siehe oben). |
| `config/development.config.php` | Entwicklungs-Overrides (erstellt durch `laminas-development-mode enable`). |

## Die `app.*.php`-Konfigurationsfamilie

Jedes Backoffice-Modul führt diese Melis-spezifischen Dateien in `Module::getConfig()` zusammen. Sie bilden gemeinsam
einen einzigen Baum unter einer `plugins`-Wurzel, abfragbar über [`MelisCoreConfig`](/de/guide/concepts#_2-the-config-tree-melis-keys):

| Datei | Deklariert |
| --- | --- |
| `app.interface.php` | UI-**Zonen** und deren `forward` (Modul/Controller/Action). Jeder Knoten: `conf` (id, name, icon, `melisKey`, `rightsDisplay`), `forward`, verschachteltes `interface`. |
| `app.toolstree.php` | Wo sich ein Tool im **linken Menü** anhängt (`*_toolstree_section`). |
| `app.tools.php` | **Tools**: Datentabellen (Spalten, Filter, Aktionsschaltflächen), Formulare. |
| `app.forms.php` | Wiederverwendbare **Formular**definitionen (Laminas-Formularspezifikation + `input_filter`). |
| `app.emails.php` | Konfigurationen für E-Mail-Vorlagen. |
| `app.microservice.php` | Aufrufbare Service-Methoden-APIs (Ein-/Ausgabeformulare). |
| `excluded.routes.php` | Routen, die die Authentifizierungsprüfung umgehen. |

### Konventionen

- **Übersetzungsschlüssel**: `tr_<module>_<section>_<item>` (z. B. `tr_meliscore_tool_users`).
- **Konfigurations-IDs**: `id_<module>_<item>`.
- **Melis-Keys**: kurze Aliasnamen, deklariert als `'conf' => ['melisKey' => '…']` → von
  `MelisCoreConfig::getMelisKeys()` zu vollständigen Konfigurationspfaden aufgelöst.
- **Tabellen**: `melis_<area>_<entity>` (z. B. `melis_core_user`, `melis_cms_page_published`,
  `melis_ecom_product`).
- **Routen**: `<module-slug>/<name>` (z. B. `melis-backoffice/login`).

## Übersetzungen

Locale-spezifische PHP-Arrays unter dem Verzeichnis `language/` jedes Moduls:

```
language/en_EN.interface.php
language/fr_FR.interface.php   // 'tr_key' => 'Texte'
```

Werden von `Module::createTranslations()` für die aktive Locale geladen (Session `melis-lang-locale`), mit
`en_EN` als Fallback. Zu den Typen gehören `interface`, `forms`, `install`, `setup`.

## Assets

`MelisAssetManager` liefert den Ordner `public/` jedes Moduls unter `/<ModuleName>/…` aus und generiert
`config/melis.modules.path.php`. Ein **Site-Modul** listet sein Frontoffice-CSS/-JS in
`config/assets.config.php` auf. Webpack-Bundling ist verfügbar (Build-Tool / Backoffice-Aktion).

## Caches

Das Cache-Verhalten wird in der `module.config.php` von `melis-core` konfiguriert (Abschnitt `caches`) und
über `MelisCoreCacheSystemService` verwendet. Jeder Cache hat ein `active`-Flag, ein `cache_dir` unter `cache/`
und TTLs je Schlüssel. Der Laminas-**Konfigurations-Cache** wird durch `config_cache_enabled` in
`application.config.php` gesteuert (in diesem Grundgerüst standardmäßig deaktiviert). Siehe
[Fehlerbehebung](/de/guide/troubleshooting#cache) zum Leeren der Caches.

## Konfiguration des React-Backoffice

Das v6-React-Backoffice (`/melis-react`) läuft auf **demselben Framework und demselben Konfigurationsbaum**
wie das klassische Backoffice (`/melis`) — alles oben Genannte gilt weiterhin. Zwei zusätzliche
Infrastrukturmodule verbinden es. Beide werden über `config/application.config.php`
(`module_paths` / `modules`, nicht über Composer-Autoload) geladen, und keines von beiden hat eine
projektspezifische Konfiguration zum Bearbeiten: Das Aktivieren des React-BO ist lediglich eine Frage des
Ladens dieser Module.

| Modul | Rolle |
| --- | --- |
| `MelisReactApi` | Das Rückgrat der JSON-API. Deklariert die generischen `/melis/react-api/…`-Endpunkte (in seiner eigenen `config/module.config.php`) und beherbergt den Capability-Resolver. Zeichnet keine UI. |
| `MelisReactOverride` | Liefert die React-Shell aus und rendert Legacy-Tools als iframes. Überschreibt den `PluginView`-Controller von MelisCore und deklariert die Shell-/Tool-Routen. |

### Ausliefern der Shell

Die React-SPA wird vom `SpaController` von `MelisReactOverride` unter **`/melis-react`** ausgeliefert,
ebenso jeder Deep-Link darunter (Regex-Route `meliscore-melis-react-spa`, `priority => 1000`). Die
`index.html` der Shell wird aus der `public/ui-react/index.html` von **melis-core** gelesen und unter
`/MelisCore/ui-react/` ausgeliefert — der React-Build liegt also bei `melis-core`, nicht in diesen Modulen.

Da die React-App ihre eigene Authentifizierung übernimmt, hängt `MelisReactOverride` einige
Routen an `plugins.meliscore.datas.excluded_routes` von MelisCore an (öffentlich, keine Login-Weiterleitung):
die SPA-Route selbst, `melis-backoffice/react-platform-bundle` sowie die beiden schreibgeschützten
Boot-Endpunkte `melis-backoffice/melis-react-api/platformscheme-react-get` und
`melis-backoffice/melis-react-api/langs`.

### Brick-/Modul-Erkennung

Die Shell erkennt Tools beim Booten über **`GET /melis/react-api/react-modules`**, das
**aktive** Module nach einer `public/ui-react/brick.manifest.json` durchsucht (ein einzelnes Objekt oder ein
`bricks: [...]`-Array) und die Brick-Definitionen sowie eine einzige zusammengeführte Bundle-URL
(`GET /melis/react-api/bricks-bundle.js`) zurückgibt. Ein Brick erscheint daher **genau dann, wenn sein
Modul aktiv ist** — das ist die Modularitätsregel; es gibt keine separate Registry zu pflegen.
Ein Modul, das ein React-Tool ausliefert, stellt es als Brick unter seinem eigenen `public/ui-react/` bereit.

### React-Konfigurationsschlüssel je Modul

Einzelne Tool-Module (nicht diese beiden Infrastrukturmodule) können React-Konfiguration deklarieren,
die über ihr `Module::getConfig()` in den Konfigurationsbaum zusammengeführt wird:

| Datei / Schlüssel | Deklariert |
| --- | --- |
| `config/react-api.php` | Die eigenen `/melis/react-api/…`-Datenrouten eines Tool-Moduls (z. B. `users`, `roles` liegen in MelisCore / MelisSmallBusiness — **nicht** in MelisReactApi). |
| `config/react.capabilities.php` (`melisReactToolCapabilities`) | Die feingranularen „erweiterten Rechte" (`list` / `create` / `edit` / `delete` oder ein verschachtelter `{ actions, tabs }`-Baum), die je Tool-`melisKey` existieren. Der Standard ist **erlauben**; Verweigerungen werden in einem dedizierten `<meliscore_tool_capabilities>`-Abschnitt des Benutzer-/Rollen-Rechte-XML gespeichert. |
| `melis_react_override.toolpage_extensions[]` | Servicenamen, die `PluginViewToolPageExtensionInterface` implementieren — die tool-spezifischen Eigenheiten eines Moduls (HTML-/Asset-Anpassungen) für Legacy-Tools, die in der React-Shell angezeigt werden. Beiträge sammeln sich unabhängig von der Ladereihenfolge an. |

Die Infrastrukturmodule selbst deklarieren **keinen** dieser Schlüssel: `MelisReactApi` ist die
Engine, die die Capability-Deklarationen anderer Module *liest*, und `MelisReactOverride` liefert keinen
Brick, keine `react-api.php` und keine `react.capabilities.php` aus.

## Wo nachschauen

| Anliegen | Pfad |
| --- | --- |
| Modulliste | `config/melis.module.load.php` |
| Plattform-DB | `config/autoload/platforms/<MELIS_PLATFORM>.php` |
| Konfigurationsservice | `vendor/melisplatform/melis-core/src/Service/MelisCoreConfigService.php` |
| Cache-Konfiguration | `vendor/melisplatform/melis-core/config/module.config.php` (`caches`) |
| Asset-Manager | `vendor/melisplatform/melis-asset-manager/` |
| React-API-Routen / Capability-Resolver | `vendor/melisplatform/melis-react-api/` |
| React-Shell + Legacy-Tool-iframe / SPA-Route | `vendor/melisplatform/melis-react-override/` |
| React-Shell-Build (`index.html`, Bricks) | `vendor/melisplatform/melis-core/public/ui-react/` |
