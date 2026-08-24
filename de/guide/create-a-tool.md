# Erstellen Sie Ihr erstes Tool

Ein **Tool** ist ein Backoffice-Bildschirm (eine Liste, ein Formular, ein Dashboard …), der in einem
Modul verpackt und an das linke Menü angebunden ist. Diese Seite zeigt, wie Sie eines in **Melis v6**
erstellen, und erläutert den Aufbau eines Tools, damit Sie es souverän erweitern können.

::: tip Lesen Sie dies zuerst
Stellen Sie sicher, dass Sie [Architektur & Konzepte](./concepts) überflogen haben — Tools basieren
auf **Modulen**, dem **Konfigurationsbaum**, **Forwards** und **Rechten**. Diese Grundlagen sind in
v6 unverändert.
:::

::: info v6 hat das Framework beibehalten und die Oberfläche ersetzt
Melis v6 nutzt **dasselbe** Laminas-Framework, dieselben Module und denselben Konfigurationsbaum wie
v5. Was sich geändert hat, ist das Backoffice: Die klassische `/melis`-Oberfläche wurde durch eine
**React-Shell unter `/melis-react`** abgelöst. Tools erscheinen dort nun als native React-„Bricks",
und jedes Tool, das noch nicht in React neu geschrieben wurde, läuft weiterhin unverändert innerhalb
eines Iframes. Die Art und Weise, wie Sie ein Tool nachfolgend *erstellen*, ist also dieselbe; neu
ist nur, wie Sie es im Backoffice *verwenden*. Siehe
[MelisReactApi](/de/reference/modules/melis-react-api) und
[MelisReactOverride](/de/reference/modules/melis-react-override) für die technischen Details.
:::

## Der schnelle Weg: die Assistenten zur Codegenerierung

Melis liefert GUI-Generatoren mit, die ein vollständiges, funktionierendes Tool für Sie erstellen. In
v6 sind die beiden am häufigsten verwendeten **native React-Assistenten** in der `/melis-react`-Shell:

- **[Dashboard Plugin Creator](/de/reference/modules/melis-dashboard-plugin-creator)** — erstellt ein
  Widget, das auf dem Backoffice-Startdashboard erscheint.
- **[Templating Plugin Creator](/de/reference/modules/melis-templating-plugin-creator)** — erstellt
  einen Frontend-CMS-Block, den Sie im Seiteneditor auf Seiten ablegen.

Beide öffnen sich über ihren Eintrag im linken Menü als oberster Reiter mit einer **Schrittleiste**
oben und einem **New / Old**-Umschalter (oben rechts, neben **Restart**): *New* ist der
React-Assistent (Standard), *Old* öffnet das klassische Tool in einem Iframe. Jeder Schritt wird
**serverseitig** validiert (unter Wiederverwendung der bisherigen Laminas-Formulare), sodass die
Geschäftsregeln — reservierte PHP-Schlüsselwörter, doppelte Modul-/Plugin-Namen — exakt dieselben
sind wie zuvor.

![Dashboard Plugin Creator — Schritt 1 (Plugin)](/screenshots/react/melis-dashboard-plugin-creator/melisdashboardcreator-tool-step1.png)
*Schritt 1 des Dashboard Plugin Creator: **Plugin name**, **View type** (Single / Multi-tabs) und
**Plugin destination** (New module / Existing module), mit **Next** am unteren Rand.*

Durchlaufen Sie den Assistenten: Benennen Sie Ihr Plugin, wählen Sie ein **neues** oder
**bestehendes** Modul, lokalisieren Sie seine Titel je Sprache, laden Sie ein Vorschaubild hoch,
wählen Sie Symbole und prüfen Sie anschließend eine schreibgeschützte **Summary**. Der Schritt
**Finalization** ist die einzige verändernde Aktion — er schreibt die PHP-/View-/Konfigurations-/
Sprachdateien auf die Festplatte, und für den Zweig *new module* erstellt er das Modulgerüst (über
den zugrunde liegenden Dienst [MelisToolCreator](/de/reference/modules/melis-tool-creator)),
registriert es, **aktiviert** es und lädt die Plattform neu.

![Templating Plugin Creator — Schritt 6 (Finalization)](/screenshots/react/melis-templating-plugin-creator/melistemplatingplugincreator-tool-step6.png)
*Der Schritt **Finalization** des Templating Plugin Creator: Wählen Sie eine **Site**, auf der
aktiviert werden soll, lassen Sie **Activate plugin after creation** aktiviert und klicken Sie dann
auf **Finish and create the plugin** — der Assistent zählt herunter und lädt die Plattform neu.*

::: tip Restart / New vs Old
**Restart** (obere Werkzeugleiste) verwirft den Entwurf und kehrt zu Schritt 1 zurück. Der Wechsel zu
**Old** öffnet das klassische Tool in einem Iframe und **setzt den gemeinsamen Entwurf zurück** — der
Assistent warnt Sie zuvor.
:::

Für ein einfaches Backoffice-Tool (ein Listen-/Formularbildschirm, kein Dashboard oder CMS-Block)
erstellt der zugrunde liegende **MelisToolCreator** weiterhin ein vollständiges Modulgerüst
(Konfiguration, Controller, Service, Tabellenmodell und Views). Der Rest dieser Seite erklärt, **was
diese Generatoren erzeugen** — damit Sie Tools auch lesen, anpassen und von Hand schreiben können.

## Aufbau eines Tools (was generiert wird)

Dieser Teil ist gegenüber v5 unverändert: Ein Tool ist nach wie vor ein Laminas-Modul. Ein typisches
sieht so aus:

```
module/MyTool/
├── src/Module.php                 # merges the config files below
├── config/
│   ├── module.config.php          # routes, services, controllers, view paths
│   ├── app.interface.php          # the tool's internal UI zones + forwards
│   ├── app.tools.php              # table columns, filters, action buttons
│   └── app.toolstree.php          # where the tool sits in the left menu
├── src/MyTool/
│   ├── Controller/                # *Controller.php (extend MelisAbstractActionController)
│   ├── Service/                   # *Service.php   (extend MelisGeneralService)
│   └── Model/Tables/              # *Table.php      (Laminas TableGateway wrappers)
├── view/melis-my-tool/            # .phtml templates
└── language/{en_EN,fr_FR}.interface.php
```

> 📎 Die besten Referenzimplementierungen zum Abkupfern sind die realen Module
> `vendor/melisplatform/melis-cms-news/` und `vendor/melisplatform/melis-cms-prospects/`.
> Öffnen Sie sie beim Erstellen nebeneinander.

### 1. Modul registrieren

`config/melis.module.load.php`:

```php
return [
  // … core modules …
  'MyTool',
];
```

### 2. `Module.php` — die Konfiguration zusammensetzen

```php
namespace MyTool;

use Laminas\ModuleManager\Feature\ConfigProviderInterface;
use Laminas\Stdlib\ArrayUtils;

class Module implements ConfigProviderInterface
{
    public function getConfig()
    {
        $config = [];
        foreach ([
            __DIR__ . '/../config/module.config.php',
            __DIR__ . '/../config/app.interface.php',
            __DIR__ . '/../config/app.tools.php',
            __DIR__ . '/../config/app.toolstree.php',
        ] as $file) {
            $config = ArrayUtils::merge($config, include $file);
        }
        return $config;
    }
}
```

### 3. `app.toolstree.php` — im linken Menü anzeigen

Dies bindet Ihr Tool unter einen Abschnitt des linken Menüs ein und leitet an seinen Controller
weiter. Der `melisKey` ist die stabile Kennung; der `forward` verweist auf die Aktion, die das Tool
rendert. Die React-Shell liest denselben Baum (über `GET /melis/react-api/menu`),
**rechtegefiltert**, um ihre Seitenleiste aufzubauen — Ihr Tool hier zu deklarieren, ist also das,
was dafür sorgt, dass es in `/melis-react` erscheint.

```php
return ['plugins' => ['meliscore' => ['interface' => ['meliscore_leftmenu' => ['interface' => [
  'meliscustom_toolstree_section' => ['interface' => [
    'mytool_tool' => [
      'conf' => [
        'id'       => 'id_mytool_tool',
        'melisKey' => 'mytool_tool',
        'name'     => 'tr_mytool_title',   // translation key
        'icon'     => 'fa fa-puzzle-piece',
      ],
      'forward' => [
        'module'     => 'MyTool',
        'controller' => 'MyTool',
        'action'     => 'render-mytool',
      ],
    ],
  ]],
]]]]]];
```

### 4. Controller + Service

```php
// src/MyTool/Controller/MyToolController.php
namespace MyTool\Controller;

use Laminas\View\Model\ViewModel;
use Laminas\View\Model\JsonModel;
use MelisCore\Controller\MelisAbstractActionController;

class MyToolController extends MelisAbstractActionController
{
    public function renderMytoolAction()
    {
        $view = new ViewModel();
        $view->melisKey = $this->params()->fromRoute('melisKey', '');
        return $view; // renders view/melis-my-tool/my-tool/render-mytool.phtml
    }

    public function getListAction()
    {
        $items = $this->getServiceManager()->get('MyToolService')->getList();
        return new JsonModel(['data' => $items]);
    }
}
```

Services erweitern `MelisGeneralService` und greifen über einen in `module.config.php` registrierten
`TableGateway`-Wrapper auf die Datenbank zu.

::: info Wie Ihr Tool in /melis-react gerendert wird
Ein auf diese Weise deklariertes Tool benötigt **keinen React-Code**, um in v6 zu erscheinen. Die
React-Shell zeigt Ihre bestehende `.phtml`-Oberfläche einfach innerhalb eines Iframes an, der unter
`/melis/react-tool-page?key=<melisKey>` ausgeliefert wird — mit ihren eigenen DataTables,
Formularen, Modalen und Speichern-Schaltflächen, die sich genau wie im klassischen `/melis`
verhalten. Dies wird vollständig von
[MelisReactOverride](/de/reference/modules/melis-react-override) übernommen; Sie fassen es nicht an.
Das Neuschreiben eines Tools als **native React-Brick** (mit einer `brick.manifest.json` und
`/melis/react-api/…`-Endpunkten) ist ein optionales Upgrade — die beiden oben genannten
Assistenten sind Beispiele dafür — keine Voraussetzung.
:::

### 5. Sichtbar machen — Rechte

Selbst wenn ein Tool korrekt deklariert ist, erscheint der Abschnitt im linken Menü nur für Benutzer,
deren **Rechte** ihn einschließen. Rechte werden als XML-Allow-Liste in
`melis_core_user.usr_rights` gespeichert: Ein Abschnitt ist sichtbar, wenn sein
`*_toolstree_section` dort aufgeführt ist. Das `/melis-react`-Menü wird durch genau diese Rechte
gefiltert, sodass ein nicht aufgeführter Abschnitt auch in der React-Shell verborgen bleibt.

Gewähren Sie den Zugriff über den Editor **Users → Rights** im Backoffice (haken Sie Ihr Tool für
die Rolle/den Benutzer an und speichern Sie). Für die Automatisierung können Sie den Abschnitt auch
mit einer Migration in das Rechte-XML einfügen — sehen Sie sich an, wie die Plattform dies für das
KI-Menü in `flyway/sql/V3__add_melisai_rights.sql` tut.

::: tip v6 verfügt auch über „erweiterte Rechte" (Capabilities)
Zusätzlich zum *Zugriff* auf ein Tool fügt v6 feingranulare **Capabilities** hinzu (`list` /
`create` / `edit` / `delete` oder verschachtelte Reiter), die die internen Teile eines bereits
autorisierten Tools steuern. Sie sind **standardmäßig erlaubt** — ein Tool, das keine deklariert,
behält den vollständigen CRUD-Zugriff, dies ist also optional. Wenn Sie es wünschen, deklarieren Sie
eine `config/react.capabilities.php` in Ihrem Modul und schützen Sie Ihre React-API-Aktionen mit
`denyUnlessCan('edit')`. Der vollständige Vertrag findet sich in
[MelisReactApi](/de/reference/modules/melis-react-api).
:::

## Zusammenfassung

1. Mit einem **Assistenten** generieren (Dashboard / Templating Plugin Creator) oder
   `melis-cms-news` kopieren.
2. Das Modul in `config/melis.module.load.php` **registrieren**.
3. Es in **`app.toolstree.php`** (Menü) und **`app.interface.php`** (interne Zonen) deklarieren.
4. **Controller + Service + View** implementieren.
5. **Rechte** gewähren, damit es im Menü erscheint.

Sie verfügen nun über ein funktionierendes Tool, das im `/melis-react`-Backoffice erscheint — als
Iframe für ein klassisches `.phtml`-Tool oder als nativer Brick, falls Sie es in React neu
geschrieben haben. Erkunden Sie von hier aus `app.tools.php`, um eine vollständige Datentabelle
(Spalten, Filter, Aktionsschaltflächen) zu verdrahten, so wie es die CMS-Module tun.
