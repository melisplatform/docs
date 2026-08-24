# Plugins: Templating und Dashboard

Melis kennt zwei Arten von Plugins, und das sind grundverschiedene Dinge:

- **Templating-Plugins** — wiederverwendbare **Inhaltsblöcke**, die im **Front Office** in die
  `MelisDragDropZone` einer Seite eingefügt werden (ein Slider, eine Produktliste, ein Kontaktformular).
- **Dashboard-Plugins** — **Widgets**, die auf dem Dashboard des **Back Office** angezeigt werden.

Für beide gibt es einen grafischen Scaffolder (`melis-templating-plugin-creator`, `melis-dashboard-plugin-creator`)
— nutzen Sie ihn, um das Grundgerüst zu generieren, und lesen Sie dann weiter, um es zu verstehen und anzupassen. In Melis v6
sind diese Scaffolder **native React-Assistenten** im Back Office `/melis-react` (jeder trägt weiterhin
einen **New / Old**-Umschalter zum klassischen Tool in einem iframe). Das Framework, der Modulsatz und der
generierte PHP-Code sind unverändert — nur die Oberfläche, mit der Sie sie bedienen, ist nun React.

## Templating-Plugins (Front Office)

Ein Templating-Plugin erweitert
`MelisEngine\Controller\Plugin\MelisTemplatingPlugin` und implementiert:

| Methode | Rolle |
| --- | --- |
| `front()` *(erforderlich)* | Liefert das **Array der Variablen** zurück, das an das Front-`.phtml` des Plugins übergeben wird. |
| `back()` | Rendert die Back-Office-Vorschau + den Editor (ein sinnvoller Standard ist bereits vorhanden). |
| `createOptionsForms()` | Erstellt die **Reiter** des Back-Office-Formulars aus der Plugin-Konfiguration. |
| `loadDbXmlToPluginConfig()` / `savePluginConfigToXml($params)` | Decodiert/codiert die gespeicherten Parameter des Plugins (als XML im Seiteninhalt abgelegt). |

Der Konstruktor verbindet das Plugin mit seiner Konfiguration:

```php
use MelisEngine\Controller\Plugin\MelisTemplatingPlugin;

class MyBlockPlugin extends MelisTemplatingPlugin
{
    public function __construct($updatesPluginConfig = [])
    {
        $this->configPluginKey = 'mymodule';      // key in the plugin config file
        $this->pluginXmlDbKey  = 'myBlock';       // XML element name saved in the page
        parent::__construct($updatesPluginConfig);
    }

    public function front()
    {
        $id = $this->pluginFrontConfig['someParam'] ?? null;
        // … fetch data via a service …
        return ['pluginId' => $this->pluginFrontConfig['id'], 'items' => $items];
    }
}
```

### Die Plugin-Konfigurationsdatei

Jedes Plugin bringt eine `config/plugins/<Name>.config.php` mit, die einen **`front`**-Abschnitt (Rendering-
Konfiguration: `template_path`, eine `id`, benutzerdefinierte Parameter, css/js) und einen **`melis`**-Abschnitt (Back-Office-
Oberfläche: Name, Thumbnail und die `modal_form`-Reiter/-Felder) enthält. Referenz:
`vendor/melisplatform/melis-cms-slider/config/plugins/MelisCmsSliderShowSliderPlugin.config.php`.

Registrieren Sie das Plugin als Controller-Plugin in `module.config.php`:

```php
'controller_plugins' => ['invokables' => [
    'MyBlockPlugin' => \MyModule\Controller\Plugin\MyBlockPlugin::class,
]],
```

### Wie es auf eine Seite gelangt

Ein Redakteur zieht das Plugin in eine `MelisDragDropZone` (siehe [Eine Website erstellen](./build-a-site)). Die
konfigurierten Parameter werden als XML in den Inhalt der Seite serialisiert; beim Rendern ruft die Front-Engine
die Methode `front()` des Plugins auf und rendert dessen `.phtml`. `MelisCmsSlider` und `MelisCmsNews` sind die
kanonischen Beispiele.

### Minimalstruktur

```
MyModule/
├── config/plugins/MyBlockPlugin.config.php
├── src/Controller/Plugin/MyBlockPlugin.php
└── view/my-module/my-block.phtml             # front template
    view/my-module/my-block/melis/form.phtml  # back-office form
```

### Scaffolding in /melis-react

Öffnen Sie den **Templating Plugin Creator** über seinen Eintrag im linken Menü — er öffnet sich als oberer Reiter mit einer
**6-Schritt-Leiste** und dem **New / Old**-Umschalter oben rechts (neben **Restart**). Die New-Ansicht ist ein echter React-
Assistent; das Ganze ist `persistent`, sodass Sie den Reiter verlassen und zurückkehren können, ohne Ihren
Schritt oder Ihre Eingaben zu verlieren. (Die gesamte eigentliche Arbeit bleibt serverseitig — die Validierung nutzt weiterhin die
klassischen Laminas-Formulare, und die Generierung ruft `MelisTemplatingPluginCreatorService` auf, der dieselben PHP-/View-/
Konfigurations-/Sprachdateien wie zuvor schreibt.)

![Templating Plugin Creator — Schritt 1 (Plugin-Name + Zielort)](/screenshots/react/melis-templating-plugin-creator/melistemplatingplugincreator-tool-step1.png)

Die sechs Schritte:

1. **Plugin** — Plugin-Name + Zielort (**New module** oder ein **Existing site module**, das Sie
   aus einem Dropdown auswählen). Der Server berechnet daraus den erzwungenen `template_path`.
2. **Menu Texts & Display** — Titel/Beschreibung pro Sprache, die in der Plugin-Liste des Seiteneditors angezeigt werden,
   sowie das erforderliche Thumbnail (GIF/JPG/PNG, ~190×100, ≤500 kB).
3. **Main Properties** — die bearbeitbaren Felder des Plugins (1–25, `template_path` inbegriffen). Feld 1 ist
   der gesperrte `template_path`; die Felder 2..N erhalten jeweils einen technischen Namen, einen Anzeigetyp (text, Dropdown,
   DatePicker, NumericInput, Switch, Textarea, Rich-Text …), ein Erforderlich-Kennzeichen und einen Standardwert.
4. **Properties' Translation** — ein Label + Tooltip pro Property und pro Sprache (plus ein Label pro
   Dropdown-Option).
5. **Summary** — eine schreibgeschützte Zusammenfassung von allem oben Genannten; hier wird nichts geschrieben.
6. **Finalization** — wählen Sie eine **Site** zur Aktivierung (optional), lassen Sie **Activate plugin after
   creation** aktiviert und klicken Sie dann auf **Finish and create the plugin**. Die Aktivierung löst einen Neustart der Plattform aus
   (der Assistent zählt herunter und lädt neu).

![Templating Plugin Creator — Schritt 6 (Finalization)](/screenshots/react/melis-templating-plugin-creator/melistemplatingplugincreator-tool-step6.png)

> **New / Old-Umschalter.** *New* ist der React-Assistent (Standard); *Old* rendert das klassische jQuery-Tool
> in einem iframe. Der Wechsel zu *Old* setzt den gemeinsamen Sitzungsentwurf zurück, weshalb der Assistent Sie vorher warnt.

## Dashboard-Plugins (Back Office)

Ein Dashboard-Widget erweitert
`MelisCore\Controller\DashboardPlugins\MelisCoreDashboardTemplatingPlugin`. Es legt sein Modul im
Konstruktor fest und stellt eine Action-Methode bereit, die ein `ViewModel` mit `setTemplate()` zurückgibt:

```php
use MelisCore\Controller\DashboardPlugins\MelisCoreDashboardTemplatingPlugin;
use Laminas\View\Model\ViewModel;

class MyWidgetPlugin extends MelisCoreDashboardTemplatingPlugin
{
    public function __construct()
    {
        $this->pluginModule = 'mymodule';
        parent::__construct();
    }

    public function mywidget()   // the action referenced by the plugin config
    {
        $view = new ViewModel();
        $view->setTemplate('my-module/dashboard-plugin/my-widget');
        return $view;
    }
}
```

Das Widget wird unter der Schnittstelle `melis_dashboardplugin` deklariert (Name, Icon, Thumbnail, Raster-
`width`/`height` und ein `forward` an `module` / `plugin` / `function`) und in
`module.config.php` unter `controller_plugins` registriert. Referenz:
`vendor/melisplatform/melis-core/src/Controller/DashboardPlugins/MelisCoreDashboardBubbleNewsMelisPlugin.php`.

### Minimalstruktur

```
MyModule/
├── config/module.config.php                 # declares the dashboard plugin + registers it
├── src/Controller/DashboardPlugins/MyWidgetPlugin.php
└── view/my-module/dashboard-plugin/my-widget.phtml
```

### Scaffolding in /melis-react

Öffnen Sie den **Dashboard Plugin Creator** über seinen Eintrag im linken Menü — einen oberen Reiter mit einer **5-Schritt-Leiste** und demselben
**New / Old**-Umschalter. Wie sein Templating-Pendant ist er ein `persistent` React-Assistent, der auf
`MelisDashboardPluginCreatorService` aufsetzt, sodass der generierte PHP-Code identisch mit der Ausgabe des klassischen Tools ist.

![Dashboard Plugin Creator — Schritt 1 (Name, View-Typ, Zielort)](/screenshots/react/melis-dashboard-plugin-creator/melisdashboardcreator-tool-step1.png)

Die fünf Schritte:

1. **Plugin** — Name, **View type** (**Single**-Karte oder **Multi-tabs**, 2–25 Reiter) und Zielort
   (**New module** oder ein **Existing module**-Dropdown).
2. **Menu Texts & Display** — Menütitel/-beschreibung pro Sprache + das erforderliche Thumbnail.
3. **Dashboard Texts & Display** — der Kartentitel pro Sprache und das **Plugin-Icon** (und, bei
   Multi-Tab-Plugins, ein Icon pro Reiter).
4. **Summary** — schreibgeschützte Zusammenfassung.
5. **Finalization** — lassen Sie **Activate plugin after creation** aktiviert und klicken Sie dann auf **Finish and create the
   plugin**; die Aktivierung lädt die Plattform neu.

![Dashboard Plugin Creator — Schritt 3 (Kartentitel + Icons)](/screenshots/react/melis-dashboard-plugin-creator/melisdashboardcreator-tool-step3.png)

## Templating vs. Dashboard — auf einen Blick

| | Templating-Plugin | Dashboard-Plugin |
| --- | --- | --- |
| Basisklasse | `MelisTemplatingPlugin` | `MelisCoreDashboardTemplatingPlugin` |
| Liegt in | `src/Controller/Plugin/` | `src/Controller/DashboardPlugins/` |
| Kernmethode | `front()` → Variablen-Array | eine Action → `ViewModel` |
| Angezeigt auf | Front-Office-Seiten (Drag-and-drop-Zonen) | Back-Office-Dashboard |
| Gespeicherte Konfiguration | XML im Seiteninhalt | Dashboard-Schnittstellenkonfiguration |
| Scaffolder-Assistent | 6 Schritte (`melis-templating-plugin-creator`) | 5 Schritte (`melis-dashboard-plugin-creator`) |

## Wichtige Dateien

| Aspekt | Pfad |
| --- | --- |
| Templating-Basisklasse | `vendor/melisplatform/melis-engine/src/Controller/Plugin/MelisTemplatingPlugin.php` |
| Templating-Beispiel | `vendor/melisplatform/melis-cms-slider/src/Controller/Plugin/MelisCmsSliderShowSliderPlugin.php` |
| Dashboard-Basisklasse | `vendor/melisplatform/melis-core/src/Controller/DashboardPlugins/MelisCoreDashboardTemplatingPlugin.php` |
| Dashboard-Beispiel | `vendor/melisplatform/melis-core/src/Controller/DashboardPlugins/MelisCoreDashboardBubbleNewsMelisPlugin.php` |
| Scaffolder | `vendor/melisplatform/melis-templating-plugin-creator/`, `vendor/melisplatform/melis-dashboard-plugin-creator/` |

Die Modulreferenzseiten finden Sie unter
[melis-templating-plugin-creator](/de/reference/modules/melis-templating-plugin-creator) und
[melis-dashboard-plugin-creator](/de/reference/modules/melis-dashboard-plugin-creator).
