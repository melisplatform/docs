# MelisDashboardPluginCreator

> Ein schrittweiser Assistent, der ein neues Backoffice-**Dashboard-Plugin** (Widget) in ein neues oder bestehendes Modul einbindet, nun als nativer React-Baustein ausgeliefert. Paket `melisplatform/melis-dashboard-plugin-creator`.

## Zweck

MelisDashboardPluginCreator ist ein **Assistent zur Codegenerierung**: ein 5-stufiger Assistent, der ein einsatzbereites Dashboard-Widget erzeugt — dessen Controller, View, Konfiguration, Assets und Übersetzungen — und es in das Zielmodul einbindet. Sie wählen ein Widget mit **einem Tab** oder **mehreren Tabs**, ein Ziel (ein völlig neues Modul erstellen oder ein bestehendes erweitern), Titel/Beschreibungen je Sprache, ein Icon und ein Vorschaubild; das Werkzeug schreibt anschließend die Dateien und aktiviert (optional) das Plugin.

Das erzeugte Widget erweitert `MelisCore\Controller\DashboardPlugins\MelisCoreDashboardTemplatingPlugin` und wird unter der Schnittstelle `melis_dashboardplugin` deklariert, sodass es auf dem Backoffice-Dashboard erscheint. Das Modul hängt von `melis-core` und `melis-tool-creator` ab (Letzteres wird wiederverwendet, um das neue Modul einzubinden). Zu den Konzepten hinter Dashboard-Plugins siehe [Plugins](/legacy/guide/plugins); zu Backoffice-Werkzeugen im Allgemeinen siehe [Ein Werkzeug erstellen](/legacy/guide/create-a-tool).

## Aktivierung

Es handelt sich um ein Standard-Laminas-Modul. Fügen Sie es in `config/melis.module.load.php` hinzu:

```php
return [
    // …
    'MelisDashboardPluginCreator',
];
```

Installieren Sie es über Composer (`composer require melisplatform/melis-dashboard-plugin-creator`); `melis-core` und `melis-tool-creator` werden automatisch mit eingebunden. Es ist keine Datenbank erforderlich.

Das Werkzeug schreibt Dateien auf die Festplatte, daher müssen die folgenden Elemente für den Webserver **beschreibbar** sein (wird zur Laufzeit geprüft und dem Assistenten als `context.blocking[]` angezeigt): `config/melis.module.load.php`, das Verzeichnis `module/` sowie der Pfad für das temporäre Vorschaubild `<DOCUMENT_ROOT>/dpc/temp-thumbnail/` (konfiguriert in `config/app.tools.php` unter `melisdashboardplugincreator/datas/plugin_thumbnail/path`).

## React-Backoffice

Im React-Backoffice (`/melis-react`) wird das Werkzeug als **nativer Voll-React-Baustein** ausgeliefert — ein echter React-Assistent, der eine JSON-`react-api` aufruft, mit einem **New / Old**-Umschalter, der auf das Legacy-jQuery-Werkzeug in einem iframe zurückfällt. Die eigentliche Arbeit bleibt serverseitig: Die Validierung verwendet die Legacy-Laminas-Formulare wieder und die Generierung ruft `MelisDashboardPluginCreatorService` auf. React ist Darstellung plus API-Aufrufe.

| Element | Wert |
| --- | --- |
| Bausteinart | Nativ Voll-React (5-stufiger Assistent, mit einem New/Old-Legacy-iframe-Fallback) |
| Baustein-ID | `dashboard-plugin-creator` |
| Manifest-`route` | `/melis-core/dashboard-plugin-creator` (Fallback-Einhängepunkt) |
| `label` | `Dashboard Plugin Creator` |
| `forwardKey` | `MelisDashboardPluginCreator/DashboardPluginCreator` |
| `melisKey` | `melisdashboardplugincreator_tool` |
| `subTabs` / `persistent` | `false` / `true` |
| API-Basis | `/melis/react-api/dpc` |

Der Baustein wird über `GET /melis/react-api/react-modules` erkannt und erscheint **nur, wenn das Modul aktiv ist** in `config/melis.module.load.php`. Er ist `persistent`: Der Assistent wird einmal eingehängt und seine 5 Schritte sind per CSS ein-/ausgeblendete Bereiche, sodass beim Verlassen des Werkzeug-Tabs und der Rückkehr weder der Entwurf noch der aktuelle Schritt verloren gehen. Eine Schaltfläche **Restart** (obere Werkzeugleiste) löscht den Sitzungsentwurf und das temporäre Vorschaubild. Das Umschalten des **New / Old**-Umschalters auf *Old* rendert den Legacy-Controller in einem iframe (`/melis/react-tool-page?key=melisdashboardplugincreator_tool`) und setzt den geteilten Sitzungsentwurf zurück; der Assistent warnt zuvor, falls ein Entwurf vorhanden ist.

## Der 5-stufige Assistent

| Schritt | React-Komponente | Was Sie tun |
| --- | --- | --- |
| 1 — Plugin | `Step1Plugin` | **Plugin-Name**, **Ansichtstyp** (Single / Multi-Tabs, 2–25 Tabs), **Plugin-Ziel** (Neues Modul + Name, oder Dropdown für bestehendes Modul). |
| 2 — Menü-Texte & Anzeige | `Step2Menu` | **Plugin-Titel** + **Beschreibung** je Sprache (Sprach-Tableiste, mindestens eine erforderlich); laden Sie das erforderliche **Plugin-Vorschaubild** hoch (GIF/JPG/PNG, ~190×100, ≤500 kB). |
| 3 — Dashboard-Texte & Anzeige | `Step3Dashboard` | **Kartentitel** je Sprache, wählen Sie das **Plugin-Icon** aus einem Raster; Plugins mit mehreren Tabs wählen **ein Icon pro Tab**. |
| 4 — Zusammenfassung | `Step4Summary` | Schreibgeschützte Übersicht der Schritte 1→3 + Zielmodul (abgerufen von `/dpc/summary`); es wird nichts geschrieben. |
| 5 — Fertigstellung | `Step5Finalize` | Umschalter **Plugin nach der Erstellung aktivieren** (standardmäßig aktiviert) + **Fertigstellen und das Plugin erstellen** → Generierung; bei Aktivierung lädt ein Countdown die Plattform neu. |

Schritt 5 ist der **einzige verändernde Vorgang**. Geschäftsregeln (reserviertes PHP-Schlüsselwort, Modul existiert bereits, Plugin-Name/-Titel bereits vergeben) werden serverseitig gegen die Legacy-Laminas-Formulare validiert; die React-Komponenten rendern lediglich die zurückgegebenen Meldungen je Feld.

![Schritt 1 — Plugin: Name, Ansichtstyp (Single / Multi-Tabs) und Plugin-Ziel (Neues / Bestehendes Modul)](/screenshots/react/melis-dashboard-plugin-creator/melisdashboardcreator-tool-step1.png)

![Schritt 2 — Menü-Texte & Anzeige: Titel/Beschreibung je Sprache (English / Français) sowie das erforderliche Plugin-Vorschaubild mit Vorschau und Remove](/screenshots/react/melis-dashboard-plugin-creator/melisdashboardcreator-tool-step2.png)

![Schritt 3 — Dashboard-Texte & Anzeige: Kartentitel je Sprache und das Plugin-Icon-Raster (Calendar ausgewählt); Plugins mit mehreren Tabs ergänzen ein Icon-Raster pro Tab](/screenshots/react/melis-dashboard-plugin-creator/melisdashboardcreator-tool-step3.png)

![Schritt 4 — Zusammenfassung: schreibgeschützte Übersicht von Plugin / Zielmodul / Typ, dem Vorschaubild, den Menütexten, Dashboard-Titeln und dem Icon vor der Generierung](/screenshots/react/melis-dashboard-plugin-creator/melisdashboardcreator-tool-step4.png)

![Schritt 5 — Fertigstellung: der Umschalter „Activate plugin after creation" und die Schaltfläche „Finish and create the plugin", die die Generierung ausführt](/screenshots/react/melis-dashboard-plugin-creator/melisdashboardcreator-tool-step5.png)

## React-API

Die Routen befinden sich in `config/react-api.php` und werden von `MelisReactApiDashboardPluginCreatorController` bereitgestellt. Alle unter `/melis/react-api/dpc`, Vertrag `{ success, data, error }`. Ein Validierungsfehler ist **kein** HTTP-Fehler — `POST /dpc/step/:step` gibt `{ success:true, data:{ valid:false, errors:{…} } }` zurück, sodass die Benutzeroberfläche Meldungen je Feld anzeigen kann.

| Methode & URL | Zweck |
| --- | --- |
| `GET /dpc/context` | Vorabprüfung (FS-beschreibbar → `blocking[]`), Schritt-Metadaten, Sprachen, bestehende Module, Icons, Tab-Min/Max, Vorschaubild-Grenzwerte |
| `GET /dpc/state` | Aktueller Assistentenzustand aus der geteilten Sitzung (stellt die Benutzeroberfläche wieder her) |
| `POST /dpc/reset` | Restart: löscht Sitzungsentwurf + temporäres Vorschaubild |
| `POST /dpc/step/:step` (`1`–`3`) | Einen Schritt validieren + speichern → `{ valid, errors }` |
| `POST /dpc/thumbnail` | Multipart-Upload des Plugin-Vorschaubilds |
| `POST /dpc/thumbnail/remove` | Das Vorschaubild entfernen |
| `GET /dpc/summary` | Schreibgeschützte Übersicht der Schritte 1→3 + Zielmodul |
| `POST /dpc/generate` | **Das Plugin generieren** → `{ generated, module, plugin, restartRequired, notices }` |

```ts
const BASE = '/melis/react-api/dpc'

// validate + save step 1
await postJson('/step/1', {
  dpc_plugin_name: 'SalesOverview', dpc_plugin_type: 'single',
  dpc_plugin_destination: 'new_module', dpc_new_module_name: 'MyDashboards',
}) // → { valid: true, errors: {} }

// generate (step 5) — the ONLY mutating call
await postJson('/generate', { dpc_activate_plugin: true })
// → { generated:true, module:'MyDashboards', plugin:'SalesOverview', restartRequired:true }
```

Der Controller implementiert die Logik des Werkzeugs nicht neu: Die Validierung baut die Legacy-Laminas-Formulare aus `config/app.tools.php` (`getFormMergedAndOrdered`) neu auf, und der Zustand wird in denselben **Sitzungscontainer** wie beim Legacy-Werkzeug geschrieben (`dashboardplugincreator`), den der Service in seinem Konstruktor liest.

## Fähigkeiten

Deklariert in `config/react.capabilities.php` unter dem rechtetragenden Knoten `melisdashboardplugincreator_tool`. Die Semantik ist **standardmäßig erlaubend** (eine nicht deklarierte Fähigkeit ist zulässig, sodass Legacy-Rollen weiterhin funktionieren). Abgeflachte Fähigkeits-Zeichenketten:

| Tab | Aktionen | Absicherungen |
| --- | --- | --- |
| `wizard` | `edit` | Schritte 1→3 konfigurieren/speichern (ohne `wizard.edit` ist der gesamte Assistent schreibgeschützt) |
| `thumbnail` | `create`, `delete` | Das Vorschaubild hochladen / entfernen (Schritt 2) |
| `summary` | `list` | Die Zusammenfassung lesen (Schritt 4) |
| `finalization` | `create` | Das Plugin **generieren** (Schritt 5) — die sensible Fähigkeit |

Jede Controller-Aktion wird zweifach abgesichert — zuerst der Zugriff (`denyUnlessAccess`), dann die betreffende Fähigkeit (`denyUnlessCan('finalization.create')`). Das Ausblenden von Steuerelementen in React dient nur der Benutzerführung; der Server verweigert den Vorgang in jedem Fall.

## Wichtige Services

Registriert in `config/module.config.php` und mit Alias versehen:

| Service-Alias | Rolle |
| --- | --- |
| `MelisDashboardPluginCreatorService` | Generiert das Dashboard-Plugin aus den in der Assistenten-Sitzung gespeicherten Daten. |

`MelisDashboardPluginCreatorService` erweitert `MelisCore\Service\MelisGeneralService`. Bemerkenswerte Methoden:

- `generateDashboardPlugin()` — der Einstiegspunkt: liest die Sitzungsschritte, ermittelt das Zielmodul/den Plugin-Namen und führt dann `performGeneration()` aus, wobei bei Fehlern ein Rollback erfolgt (`rollbackPluginGeneration()`). Löst die Ereignisse `melisdashboard_plugin_creator_service_generate_dashboard_plugin_start/end` aus.
- Interne Generierungsschritte: `generateDashboardPluginConfig()` (schreibt `config/dashboard-plugins/<Plugin>Plugin.config.php`), `generateDashboardPluginController()`, `generateDashboardPluginView()` (Vorlage mit einem oder mehreren Tabs), `generateDashboardPluginAssets()` (CSS/JS + kopiert das Vorschaubild), `setTranslations()` (Menü-/Titelschlüssel je Sprache), `updateModuleConfig()` (fügt `template_map` + `controller_plugins` ein) und `updateModuleFile()` (fügt das Konfigurations-`include` zur `Module.php` hinzu).
- Hilfsmethoden: `getModuleExistingPlugins()` / `getExistingTranslatedPluginTitle()` (Prüfungen auf doppelte Namen), `getTempThumbnail()`, `generateFile()`, `generateModuleNameCase()`, `removeDir()`.

Wenn das Ziel ein **neues Modul** ist, delegiert die Generierung die Modulerstellung an `melis-tool-creator` (`MelisToolCreatorService::createTool()` mit einem `blank`-Werkzeug), aktiviert es anschließend (`ModulesService::activateModule()`) und macht die Caches der Modulpfade und des Dashboard-Menüs ungültig. Die Aktivierung erfordert einen Neustart der Plattform.

## Frontoffice

Dieses Modul verfügt über keine Frontoffice-Templating-Plugins oder View-Helper — es ist ein reines Backoffice-Werkzeug. (Die von ihm *generierten* Widgets sind hingegen Backoffice-Dashboard-Plugins.)

## Datenbanktabellen

MelisDashboardPluginCreator definiert **keine eigenen Tabellen** — es wird kein Installations-SQL oder dbdeploy-Delta mitgeliefert. Der gesamte Zustand wird in der Assistenten-Sitzung gehalten; die Ausgabe wird direkt in die Dateien des Zielmoduls geschrieben.

## Beispiel

Lösen Sie die Generierung aus den bereits in der Assistenten-Sitzung gespeicherten Daten aus (dies ist es, was Schritt 5 / `POST /dpc/generate` im Hintergrund tut):

```php
/** @var \MelisDashboardPluginCreator\Service\MelisDashboardPluginCreatorService $dpc */
$dpc = $serviceManager->get('MelisDashboardPluginCreatorService');

$success = $dpc->generateDashboardPlugin(); // true on success, false (and rolled back) on failure
```

Das generierte Widget folgt der Vorlage in `template/DashboardPluginController.php` — eine Klasse, die `MelisCoreDashboardTemplatingPlugin` erweitert, mit einer Aktion, die ein `ViewModel` zurückgibt:

```php
class MyModuleMyWidgetPlugin extends MelisCoreDashboardTemplatingPlugin
{
    public function __construct()
    {
        $this->pluginModule = 'mymodule';
        parent::__construct();
    }

    public function myWidget()
    {
        $view = new ViewModel();
        $view->setTemplate('my-module/dashboard-plugins/my-widget');
        return $view;
    }
}
```

## Wichtige Dateien

| Anliegen | Pfad |
| --- | --- |
| Modul-Manifest | `vendor/melisplatform/melis-dashboard-plugin-creator/composer.json` |
| Routen / Service / Controller / Formular | `vendor/melisplatform/melis-dashboard-plugin-creator/config/module.config.php` |
| React-API-Routen | `vendor/melisplatform/melis-dashboard-plugin-creator/config/react-api.php` |
| React-Fähigkeiten | `vendor/melisplatform/melis-dashboard-plugin-creator/config/react.capabilities.php` |
| Assistentenschritte, Formulare, Icons, Vorschaubild-Konfiguration | `vendor/melisplatform/melis-dashboard-plugin-creator/config/app.tools.php` |
| Generierungsservice | `vendor/melisplatform/melis-dashboard-plugin-creator/src/Service/MelisDashboardPluginCreatorService.php` |
| React-API-Controller | `vendor/melisplatform/melis-dashboard-plugin-creator/src/Controller/MelisReactApiDashboardPluginCreatorController.php` |
| Legacy-Assistenten-Controller (Old-Ansicht) | `vendor/melisplatform/melis-dashboard-plugin-creator/src/Controller/DashboardPluginCreatorController.php` |
| React-Baustein-Quellcode | `vendor/melisplatform/melis-dashboard-plugin-creator/ui-react/src/` |
| Gebauter Baustein + Manifest | `vendor/melisplatform/melis-dashboard-plugin-creator/public/ui-react/` |
| Vorlagen für das generierte Plugin | `vendor/melisplatform/melis-dashboard-plugin-creator/template/` |

::: tip Verwandtes
Dies ist das Dashboard-Pendant zu `melis-templating-plugin-creator` (Frontoffice-Templating-Plugins). Um die von ihm erzeugten Artefakte zu verstehen, lesen Sie [Plugins](/legacy/guide/plugins).
:::
