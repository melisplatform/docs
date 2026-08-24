# MelisAssetManager

> Liefert die öffentlichen Assets jedes Moduls (CSS, JS, Bilder) über saubere URLs aus, stellt das
> kompilierte React-Backoffice-Bundle bereit und ist die maßgebliche Quelle für die Erkennung
> aktiver Module. Paket `melisplatform/melis-asset-manager`.

## Zweck

MelisAssetManager fängt Anfragen an `/<ModuleName>/…` zur Ladezeit ab und streamt die passende
Datei aus dem Verzeichnis `public/` des jeweiligen Moduls, ohne Controller-Logik im heißen Pfad. Beim
ersten Start schreibt es eine Zuordnung von Modul zu Pfad unter `config/melis.modules.path.php`
(wofür der Ordner `config/` beschreibbar sein muss). Es stellt außerdem die plattformweiten Dienste
bereit, um abzufragen, welche Module installiert oder aktiv sind, und um die CSS-/JS-Dateien aller
Module über webpack zu klassischen Produktions-Bundles zu kompilieren.

Es ist Teil des **MelisCore-Plattformfundaments** und wird praktisch von jedem anderen Modul
benötigt.

## Rolle im React-Backoffice

Das Modul besitzt **kein React-Tool und keine eigene Benutzeroberfläche** — es gibt keinen Brick,
keine `config/react-api.php` und keine `config/react.capabilities.php`, und es erscheint niemals als
Tool in `/melis-react`. Seine Relevanz für v6 ist rein infrastruktureller Natur: Es ist die
HTTP-Auslieferungsschicht, die das **kompilierte React-SPA-Bundle** an den Browser ausliefert.

Das React-Backoffice ist eine Vite-Single-Page-App, deren Build-Ausgabe (JS, CSS, Schriften,
Icons, `index.html`) unter `melis-core/public/ui-react/` eingecheckt ist. Anfragen für diese Dateien
treffen an URLs ein, die mit **`/MelisCore/ui-react/`** beginnen — exakt der `base`, gegen den der
Vite-Build kompiliert wird — und werden vom selben generischen Resolver `/<Module>/…` →
`<module>/public/…` bedient, der für die Assets jedes Moduls verwendet wird. Die Aufteilung ist:

| Schicht | Ausgeliefert von | URL |
| --- | --- | --- |
| React-HTML-Shell | MelisReactOverride | `/melis-react` |
| React-Bundle mit gehashten JS/CSS | **MelisAssetManager** | `/MelisCore/ui-react/…` |

> Wenn dieses Modul (oder sein beschreibbarer Cache) versagt, wird die Shell-HTML möglicherweise
> trotzdem geladen, aber die gehashten JS-/CSS-Dateien liefern **404** oder den falschen
> **MIME-Typ** zurück, sodass der Browser sich weigert, das Skript auszuführen — das klassische
> Symptom ist ein **leeres `/melis-react`**. Die übliche Ursache ist, dass der Ordner `config/`
> (und die darin generierte `melis.modules.path.php`) für den Webserver-Benutzer (z. B.
> `www-data`) nicht beschreibbar ist. Das Aktivieren eines neuen Moduls erzwingt einen Neuaufbau
> dieses Caches; ein Berechtigungsfehler an dieser Stelle beeinträchtigt die Asset-Auslieferung.
> Siehe [Aktivierung](#enable-it).

## Aktivierung

Zu `config/melis.module.load.php` hinzufügen:

```php
return [
    'MelisAssetManager',
];
```

Abhängigkeit: `melisplatform/melis-core` (`^6.0`), PHP `^8.3 | ^8.5`. Der Ordner `config/` muss
beschreibbar sein, damit das Modul `melis.modules.path.php` beim Start persistieren kann.

## Auslieferungsmechanismus

Für den gängigen Asset-Pfad gibt es **keinen Controller** — die Auslieferung erfolgt über einen zur
Ladezeit verdrahteten Resolver in `src/Module.php`:

- **`onBootstrap()`** ruft bei jeder Anfrage **`displayFile($sm)`** auf.
- **`displayFile()`** löst die Anfrage-URI zu einer Datei auf: Zuerst versucht es den öffentlichen
  Hauptordner des Projekts (`$_SERVER['DOCUMENT_ROOT'] . $uri`); andernfalls behandelt es das erste
  URI-Segment als Modulnamen, schlägt ihn in der Cache-Zuordnung nach und baut
  `<modulePath>/public/<rest-of-URI>` zusammen.
- **`sendDocument()`** setzt den korrekten `Content-Type` (über `getMimeType()` +
  `config/mime.config.php`), fügt für statische Dateien einen 24-Stunden-Cache-Header hinzu, gibt
  die Bytes aus und beendet die Ausführung. Ein Schutz (`isRequestAuthenticated()`) verlangt eine
  gültige Sitzung, bevor eine ausgelieferte `.php`-Datei überhaupt mit `eval` ausgewertet wird;
  statische Assets bleiben öffentlich.
- **`checkFileInFolder()`** stellt sicher, dass der aufgelöste Pfad innerhalb des Verzeichnisses
  `public/` des Moduls bleibt (Schutz vor Path Traversal).

Eine Anfrage für `/MelisCore/ui-react/assets/index-<hash>.js` löst daher das Modul `MelisCore` auf
und streamt `melis-core/public/ui-react/assets/index-<hash>.js` — ohne dass React-spezifischer Code
beteiligt ist.

## Modulpfad-Cache

Die von `displayFile()` verwendete Zuordnung `<ModuleName> → path` ist eine generierte PHP-Datei
unter `config/melis.modules.path.php`. Sie wird vom Modul-Lade-Listener in `src/Module.php`
(neu) erstellt:

- **`init()`** hängt **`onLoadModulesPost()`** an `ModuleEvent::EVENT_LOAD_MODULES_POST` an.
- **`onLoadModulesPost()`** schreibt die Datei, wenn sie fehlt oder ein neu aktiviertes Modul noch
  nicht darin enthalten ist, wobei es `MelisModulesService` verwendet, um den Pfad jedes Moduls zu
  berechnen, und ihr anschließend per `chmod` die Rechte `0777` zuweist.

Ansonsten ist das Modul **zustandslos** — diese generierte Datei ist sein einziger persistierter
Zustand.

## Wichtige Dienste

Registriert in `config/module.config.php` unter `service_manager`.

| Dienst-Alias | Rolle |
| --- | --- |
| `ModulesService` | Installierte/aktive Module erkennen und abfragen (`MelisModulesService`). |
| `MelisWebPackService` | Klassische webpack-Bundles erstellen und Modul-Asset-Listen auflösen. |
| `MelisConfig` | Den App-Konfigurationsbaum der Plattform zusammenführen und lesen (`MelisConfigService`). |

### `MelisModulesService`

Der maßgebliche Dienst für die Frage „welche Module existieren / sind aktiv". Wird vom Modules-Tool,
vom Marketplace, vom Laden der Site-Module und vom Installer verwendet.

```php
$modules = $sm->get('ModulesService'); // MelisAssetManager\Service\MelisModulesService

$active   = $modules->getMelisActiveModules();        // modules currently enabled
$all      = $modules->getAllModules();                // every discoverable module
$vendor   = $modules->getVendorModules();             // modules under vendor/
$versions = $modules->getModulesAndVersions();        // module => version
$deps     = $modules->getChildDependencies($moduleName);
$sites    = $modules->getSitesModules();              // template/site modules
```

Vollständige Methodenliste: `getMelisActiveModules`, `getModulesAndVersions`,
`getComposer`/`setComposer`, `getUserModules`, `getSitesModules`, `getMelisModules`,
`getAllModules`, `getVendorModules`, `getChildDependencies`.

### `MelisWebPackService`

```php
$webpack = $sm->get('MelisWebPackService');

$assets  = $webpack->getAssets($moduleName);           // a module's declared assets
$merged  = $webpack->getMergedAssets();                // platform-wide merged set
$webpack->buildWebPack();                               // compile bundles
$file    = $webpack->getWebPackMixStaticFile($asset);  // resolve a hashed/mixed asset
```

Vollständige Methodenliste: `getAssets`, `getWebPackMixStaticFile`, `getMergedAssets`,
`buildWebPack`, `setCachedFile`, `getCachedFiles`.

Der modulspezifische Konfigurationsschlüssel `ressources.build` (in der `app.interface.php` eines
Moduls) deklariert die `bundle.css` / `bundle.js`, die dieser Dienst erzeugt und ausliefert. Der
`WebPackController` (Routen `melis-backoffice/build-webpack` und `melis-backoffice/view-assets`)
steuert ihn.

> Diese webpack-Pipeline erstellt ausschließlich das **klassische** Backoffice-Bundle — sie hat
> nichts mit dem React-Build zu tun. Die React-SPA wird von **Vite** innerhalb von
> `melis-core/ui-react/` (`npm run build`) kompiliert und in `melis-core/public/ui-react/`
> eingecheckt; MelisAssetManager *liefert* diese bereits erstellten Dateien nur aus, es kompiliert
> sie nicht.

### `MelisConfigService`

Ein Helfer zum Zusammenführen von Konfigurationen und zur Übersetzung für die eigenen Bedürfnisse
des Asset-Managers. Wichtige Methoden: `getItem`, `getMelisKeys`, `getFormMergedAndOrdered`,
`translateAppConfig`.

## Asset-URLs

Assets eines beliebigen Moduls sind erreichbar unter:

```
/<ModuleName>/css/<file>.css
/<ModuleName>/js/<file>.js
/<ModuleName>/images/<file>.jpg
/MelisCore/ui-react/assets/<file>          # the committed React bundle
```

Diese werden dem Ordner `public/` jedes Moduls zugeordnet. Der Fallback ist der Haupt-`public/`-Ordner
des Projekts.

## Datenbanktabellen

Keine. Das Modul ist zustandslos — sein einziger persistierter Zustand ist die generierte Datei
`config/melis.modules.path.php`.

## Wichtige Dateien

| Aspekt | Pfad |
| --- | --- |
| Dienst-Aliase und Asset-Auslieferungs-Verdrahtung | `vendor/melisplatform/melis-asset-manager/config/module.config.php` |
| Zuordnung Erweiterung → MIME für `sendDocument()` | `vendor/melisplatform/melis-asset-manager/config/mime.config.php` |
| Asset-Auslieferung + Modulpfad-Cache | `vendor/melisplatform/melis-asset-manager/src/Module.php` |
| Dienst zur Modulerkennung | `vendor/melisplatform/melis-asset-manager/src/Service/MelisModulesService.php` |
| Webpack-/Bundle-Dienst (klassisch) | `vendor/melisplatform/melis-asset-manager/src/Service/MelisWebPackService.php` |
| App-Konfigurations-Reader | `vendor/melisplatform/melis-asset-manager/src/Service/MelisConfigService.php` |
| Asset-/Webpack-Controller | `vendor/melisplatform/melis-asset-manager/src/Controller/` |
| Modulpfad-Zuordnung (generiert) | `config/melis.modules.path.php` |
| Eingecheckter React-Build (ausgeliefert, nicht hier erstellt) | `vendor/melisplatform/melis-core/public/ui-react/` |

Siehe auch: [MelisCore](/de/reference/modules/melis-core) · [MelisReactApi](/de/reference/modules/melis-react-api) · [MelisDbDeploy](/de/reference/modules/melis-dbdeploy) · [MelisComposerDeploy](/de/reference/modules/melis-composerdeploy) · [MelisInstaller](/de/reference/modules/melis-installer) · [Modulreferenz](/de/reference/modules)
