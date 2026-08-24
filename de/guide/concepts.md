# Architektur & Konzepte

Melis Platform ist eine **Laminas-basierte MVC-Anwendung (in der ZF2-Tradition)**. Auf dem
Laminas-Standard aufbauend fügt sie eine Handvoll Konventionen hinzu, die das Backoffice antreiben.
Das Verständnis dieser fünf Konzepte genügt, um nahezu jeden Teil der Plattform zu lesen – und zu
erweitern.

In **v6** bleiben das Framework und die Module unverändert: dieselben Laminas-Module, derselbe
Konfigurationsbaum, dieselben Services und Events. Geändert hat sich die **Backoffice-Oberfläche**:
v6 bringt ein neues **React-Backoffice unter `/melis-react`** auf diesem unveränderten Fundament mit
(siehe §6). Die fünf nachfolgenden Konzepte beschreiben nach wie vor, wie darunter alles
funktioniert.

## 1. Module

Alles in Melis ist ein **Modul** (ein standardmäßiges Laminas-Modul). Die Liste der vom Programm
geladenen Backoffice-Module befindet sich in:

```
config/melis.module.load.php
```

```php
return [
  'MelisAssetManager',
  'MelisDbDeploy',
  'MelisCore',
  'MelisCms',
  'MelisFront',
  // … Ihre eigenen Module kommen hierhin
];
```

Beim Bootstrap stellt `config/application.config.php` die endgültige Modulliste über
`MelisCore\MelisModuleManager` zusammen (der diese Module mit den Komponentenmodulen und dem über
`MELIS_MODULE` ausgewählten Site-Modul zusammenführt).

Ein Modul bündelt seine eigenen Controller, Services, Views, Übersetzungen **und** eine Reihe
Melis-spezifischer Konfigurationsdateien (siehe unten). Seine Methode `Module::getConfig()` führt
sie zusammen. In v6 kann ein Modul **zusätzlich** einen React-„Brick" (eine kleine React-Oberfläche)
sowie eigene `react-api`-Endpunkte mitbringen – auch dies ist lediglich zusätzliche Konfiguration
und Quellcode innerhalb desselben Moduls (siehe §6).

## 2. Der Konfigurationsbaum & die „Melis-Keys"

Über die üblichen `module.config.php` hinaus veröffentlicht jedes Backoffice-Modul
**App-Konfigurationsdateien**, die zu einem einzigen, abfragbaren Baum unter einem
`plugins`-Wurzelknoten zusammengeführt werden:

| Datei                 | Deklariert                                                    |
| --------------------- | ------------------------------------------------------------ |
| `app.interface.php`   | UI-Zonen/-Bereiche und ihre **Forwards** (siehe §3)          |
| `app.tools.php`       | Tools: Datentabellen, Spalten, Filter, Aktionsschaltflächen  |
| `app.toolstree.php`   | Wo ein Tool im **linken Menü** eingehängt wird               |
| `app.forms.php`       | Formulardefinitionen                                         |

Diesen Baum fragen Sie über den Service **`MelisCoreConfig`** ab
(`vendor/melisplatform/melis-core/src/Service/MelisCoreConfigService.php`):

```php
$config = $sm->get('MelisCoreConfig');

// Einen Knoten über seinen Pfad abrufen:
$node = $config->getItem('meliscore_leftmenu');

// Alle „Melis-Keys" → vollständige Konfigurationspfade auflösen:
$keys = $config->getMelisKeys();
```

Ein **Melis-Key** ist ein stabiler, gut lesbarer Alias für einen tief verschachtelten
Konfigurationspfad, der an einem Knoten über `'conf' => ['melisKey' => 'my_key']` deklariert wird.
Er erlaubt es Modulen, die Oberfläche anderer Module zu referenzieren, ohne fest an einen Pfad
gekoppelt zu sein. Genau dieser **melisKey** ist es, den das React-Backoffice verwendet, um ein Tool
zu identifizieren – sowohl um dorthin zu navigieren als auch um es über Rechte abzusichern
(siehe §6).

## 3. Zonen & Forwards (wie das Backoffice rendert)

Die Backoffice-Oberfläche ist **konfigurationsgesteuert**. Eine Seite ist ein Baum aus **Zonen**;
jede Zone kann einen **Forward** deklarieren – ein Tripel aus `module / controller / action`, das
diese Zone rendert:

```php
'forward' => [
  'module'     => 'MelisCms',
  'controller' => 'PageTree',
  'action'     => 'render-page-tree',
],
```

`MelisCore\Controller\PluginViewController` durchläuft den Konfigurationsbaum, dispatcht jeden
Forward und setzt das resultierende HTML zusammen. Aus diesem Grund werden das linke Menü, die
Kopfzeilen und die Tools allesamt in der Konfiguration deklariert statt fest im Code verankert – und
deshalb ist das Hinzufügen eines Tools im Wesentlichen eine Sache des **Deklarierens der richtigen
Konfiguration** samt Bereitstellung eines Controllers und einer View.

In v6 ist dieser Zonen-/Forward-Mechanismus nach wie vor die Quelle der Wahrheit, und er treibt die
React-Shell auf zweierlei Weise an: Jedes klassische Tool, das über keinen nativen React-Bildschirm
verfügt, wird als **eigenständige Zone** gerendert und innerhalb der Shell in einem iframe
angezeigt; und das linke Menü, das die Shell darstellt, wird aus derselben Interface-Konfiguration
aufgebaut, gefiltert nach Rechten (siehe §6).

## 4. Services & Factories

Melis stützt sich auf den **Laminas Service Manager**. Services werden in der
`module.config.php` jedes Moduls registriert (`service_manager` → `aliases` / `factories`) und über
ihren Namen aufgelöst:

```php
$svc = $this->getServiceManager()->get('MelisCoreConfig');
```

Zu den gängigen Kern-Services gehören `MelisCoreConfig`, `MelisCoreAuth`, `MelisCoreRights`,
`MelisCoreUser`, `MelisCoreTool`. Fachliche Services erweitern in der Regel `MelisGeneralService`
(der das Auslösen von Events ergänzt); der Datenbankzugriff erfolgt über Laminas-`TableGateway`-Wrapper.
Die React-Bildschirme von v6 ändern daran nichts: Ein React-Brick ist reine Darstellung – jede
Aktion, die er ausführt, ruft über `react-api`-Endpunkte auf **dieselben serverseitigen Services**
zurück (siehe §6).

## 5. Events

Module klinken sich in `Module::onBootstrap()` und über Listener am **gemeinsamen Event Manager**
(shared event manager) in den Lebenszyklus einer Anfrage ein. Das Kernverhalten (Authentifizierung,
Rechteprüfungen, Flash-Meldungen, Caching …) ist auf diese Weise verdrahtet, und Sie können eigene
Melis-Events veröffentlichen bzw. abonnieren – z. B. wird `melis_core_auth_login_ok` nach einer
erfolgreichen Anmeldung ausgelöst.

## 6. Das React-Backoffice (v6)

v6 behält das Framework und die Module bei, **ersetzt jedoch die Backoffice-Oberfläche** durch eine
React-Single-Page-Anwendung, die unter **`/melis-react`** ausgeliefert wird (die klassische
`/melis`-Oberfläche liegt weiterhin darunter). Zwei Ideen genügen, um sich das vorzustellen:

- **Bricks** – ein nativ in React umgesetztes Tool. Ein Modul liefert eine
  `public/ui-react/brick.manifest.json` und ein gebautes Bundle; die Shell **entdeckt** die Bricks
  jedes aktiven Moduls und bindet sie ein. Ein Brick erscheint **genau dann**, wenn sein Modul
  aktiviert ist – dieselbe Modularitätsregel wie überall sonst.
- **Umschalter Neu / Alt** – die meisten Tools tragen oben rechts einen Schalter: **Neu** = der
  native React-Bildschirm, **Alt** = das klassische, in einem iframe gerenderte Tool. So geht nichts
  verloren, während die Module schrittweise in React neu geschrieben werden.

Alles, was die Shell rund um Ihre Tools anzeigt – wer Sie sind, das **linke Menü** (bereits nach
Ihren Rechten gefiltert), der Sprachumschalter, die **Dashboard**-Kacheln, die Tool-Erkennung –,
wird beim Start aus einer kleinen Menge generischer **JSON-Endpunkte** unter `/melis/react-api/…`
zusammengesetzt, die jeweils eine Nutzlast im Format `{ success, data, error? }` zurückgeben. Ein
globales, schwebendes **KI-Assistent**-Overlay steht auf jedem Bildschirm zur Verfügung.

![Das Overlay des React-KI-Assistenten](/screenshots/react/melis-ai/melisai-footer-icon-generalassistant-deployed.png)
*Der schwebende KI-Assistent ist von jedem Bildschirm des React-Backoffice aus verfügbar.*

Drei Module ermöglichen dies, und keines davon ist ein Tool, das Sie ansteuern:

- **MelisReactApi** – das Rückgrat der JSON-API. Es zeichnet keine Oberfläche; es liefert das
  Boot-Set (`/me`, `/menu`, `/langs`, `/assets`, `/react-modules`) sowie die Dashboard- und
  Rechte-Endpunkte und beherbergt die **Capability**-Engine (siehe unten). Die *eigenen*
  Daten-Endpunkte eines Tools liegen im Modul dieses Tools, nicht hier.
- **MelisReactOverride** – die Infrastruktur, die (a) die React-Shell für `/melis-react` und deren
  Deep-Links ausliefert und (b) jedes klassische Tool als eigenständige Seite rendert
  (`/melis/react-tool-page?key=<melisKey>`), damit der Umschalter **Alt** und jedes noch nicht neu
  geschriebene Tool weiterhin innerhalb der Shell funktionieren.
- Jedes **Feature-Modul** (z. B. `MelisCms`) liefert seine eigenen Bricks, `react-api`-Routen und
  Capabilities.

**Capabilities** sind die feingranularen „erweiterten Rechte" von v6: *innerhalb* eines bereits
autorisierten Tools können einzelne Aktionen (`list`, `create`, `edit`, `delete` oder ein
verschachtelter Reiter) pro Benutzer/Rolle verweigert werden. Sie sind **standardmäßig erlaubt**
(default-allow) und der klassischen Tool-Zugriffsprüfung **untergeordnet**
(`MelisCoreRights::canAccess`, unverändert) – ein Tool ohne Capability-Deklaration behält den vollen
CRUD-Zugriff. Ein Modul deklariert die für seinen Tool-`melisKey` bestehenden Capabilities in
`config/react.capabilities.php`; seine Controller sichern jede Aktion mit `denyUnlessCan($cap)` ab.

> Faustregel: Wenn die React-Shell etwas anzeigt (Menü, Kopfzeile, Dashboard, Tool-Liste,
> Rechtematrix), es aber nicht der eigene Bildschirm eines bestimmten Tools ist, stammt es von einem
> MelisReactApi-Endpunkt. Wenn Sie ein klassisches Tool im Bootstrap-Stil innerhalb von
> `/melis-react` sehen, sehen Sie, wie MelisReactOverride dieses Tool in einem iframe rendert.

Den vollständigen Vertrag und die internen Abläufe finden Sie in den Modul-Referenzen:
[MelisReactApi](/de/reference/modules/melis-react-api) und
[MelisReactOverride](/de/reference/modules/melis-react-override); für ein ausgearbeitetes Beispiel
eines Moduls mit mehreren Bricks siehe [MelisCms](/de/reference/modules/melis-cms).

## Bonus: Datenbankänderungen (dbdeploy & flyway)

Schema- und Seed-Änderungen werden versioniert:

- **dbdeploy** (`MelisDbDeploy`): Jedes Modul liefert nummerierte SQL-Deltas; angewandte Deltas
  werden in einer `changelog`-Tabelle nachgehalten, damit sie nur einmal ausgeführt werden.
  Modul-Deltas werden nach `dbdeploy/` veröffentlicht.
- **flyway** (`flyway/sql/`): Migrationen auf Projektebene (z. B. `V3__add_melisai_rights.sql`), die
  mit `flyway migrate` angewandt werden.

## Wo Sie im Code nachschauen

| Anliegen            | Pfad |
| ------------------- | ---- |
| Modulliste          | `config/melis.module.load.php` |
| App-Bootstrap       | `config/application.config.php` |
| Plattform-DB-Konfiguration | `config/autoload/platforms/<MELIS_PLATFORM>.php` |
| Konfigurations-Service | `vendor/melisplatform/melis-core/src/Service/MelisCoreConfigService.php` |
| Zonen-/Forward-Rendering | `vendor/melisplatform/melis-core/src/Controller/PluginViewController.php` |
| Modul-Manager       | `vendor/melisplatform/melis-core/src/MelisModuleManager.php` |
| React-Shell (SPA)   | `vendor/melisplatform/melis-core/public/ui-react/` |
| React-API + Capabilities | `vendor/melisplatform/melis-react-api/` |
| React-Shell- & iframe-Infrastruktur | `vendor/melisplatform/melis-react-override/` |

Weiter: Fügen Sie alles zusammen, indem Sie [Ihr erstes Tool erstellen](./create-a-tool).
