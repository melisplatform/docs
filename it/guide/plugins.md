# Plugin: templating e dashboard

Melis ha due tipi di plugin, e sono cose diverse:

- **Plugin di templating** — **blocchi di contenuto** riutilizzabili inseriti in una `MelisDragDropZone` di una pagina
  nel **front office** (uno slider, un elenco di prodotti, un form di contatto).
- **Plugin di dashboard** — **widget** mostrati nella dashboard del **back office**.

Entrambi dispongono di uno scaffolder con interfaccia grafica (`melis-templating-plugin-creator`, `melis-dashboard-plugin-creator`)
— usalo per generare il codice di base, poi prosegui con la lettura per comprenderlo e personalizzarlo. In Melis v6
questi scaffolder sono **wizard React nativi** nel back office `/melis-react` (ognuno conserva ancora
un interruttore **New / Old** verso lo strumento classico in un iframe). Il framework, l'insieme dei moduli e il
PHP generato restano invariati — è solo l'interfaccia con cui li usi a essere ora in React.

## Plugin di templating (front office)

Un plugin di templating estende
`MelisEngine\Controller\Plugin\MelisTemplatingPlugin` e implementa:

| Metodo | Ruolo |
| --- | --- |
| `front()` *(obbligatorio)* | Restituisce l'**array di variabili** passate al file `.phtml` front del plugin. |
| `back()` | Renderizza l'anteprima + editor del back office (viene fornito un valore predefinito ragionevole). |
| `createOptionsForms()` | Costruisce le **schede** del form del back office a partire dalla configurazione del plugin. |
| `loadDbXmlToPluginConfig()` / `savePluginConfigToXml($params)` | Decodifica/codifica i parametri salvati del plugin (memorizzati come XML all'interno del contenuto della pagina). |

Il costruttore collega il plugin alla sua configurazione:

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

### Il file di configurazione del plugin

Ogni plugin include un `config/plugins/<Name>.config.php` con una sezione **`front`** (configurazione di
rendering: `template_path`, un `id`, parametri personalizzati, css/js) e una sezione **`melis`** (interfaccia
del back office: nome, thumbnail e le schede/campi del `modal_form`). Riferimento:
`vendor/melisplatform/melis-cms-slider/config/plugins/MelisCmsSliderShowSliderPlugin.config.php`.

Registra il plugin come controller plugin in `module.config.php`:

```php
'controller_plugins' => ['invokables' => [
    'MyBlockPlugin' => \MyModule\Controller\Plugin\MyBlockPlugin::class,
]],
```

### Come raggiunge una pagina

Un editor trascina il plugin in una `MelisDragDropZone` (vedi [Costruire un sito](./build-a-site)). I
parametri configurati vengono serializzati come XML nel contenuto della pagina; al rendering, il front engine
chiama il metodo `front()` del plugin e ne renderizza il file `.phtml`. `MelisCmsSlider` e `MelisCmsNews` sono gli
esempi canonici.

### Struttura minima

```
MyModule/
├── config/plugins/MyBlockPlugin.config.php
├── src/Controller/Plugin/MyBlockPlugin.php
└── view/my-module/my-block.phtml             # front template
    view/my-module/my-block/melis/form.phtml  # back-office form
```

### Crearlo con lo scaffolder in /melis-react

Apri **Templating Plugin Creator** dalla sua voce nel menu di sinistra — si apre come scheda superiore con una **barra
a 6 passi** e l'interruttore **New / Old** in alto a destra (accanto a **Restart**). La vista New è un vero wizard
React; l'intero elemento è `persistent`, quindi puoi lasciare la scheda e tornarci senza perdere il
passo o i tuoi input. (Tutto il lavoro reale resta lato server — la validazione riutilizza i form Laminas
classici e la generazione chiama `MelisTemplatingPluginCreatorService`, che scrive gli stessi file PHP/view/
config/lingua di prima.)

![Templating Plugin Creator — Passo 1 (nome del plugin + destinazione)](/screenshots/react/melis-templating-plugin-creator/melistemplatingplugincreator-tool-step1.png)

I sei passi:

1. **Plugin** — nome del plugin + destinazione (**New module**, oppure un **Existing site module** che scegli
   da un menu a discesa). Il server calcola da questo il `template_path` imposto.
2. **Menu Texts & Display** — titolo/descrizione per lingua mostrati nell'elenco dei plugin dell'editor di pagina,
   più la thumbnail obbligatoria (GIF/JPG/PNG, ~190×100, ≤500 kB).
3. **Main Properties** — i campi modificabili del plugin (1–25, `template_path` incluso). Il campo 1 è
   il `template_path` bloccato; i campi 2..N ricevono ciascuno un nome tecnico, un tipo di visualizzazione (text, Dropdown,
   DatePicker, NumericInput, Switch, Textarea, testo formattato…), un flag di obbligatorietà e un valore predefinito.
4. **Properties' Translation** — un'etichetta + tooltip per proprietà, per lingua (più un'etichetta per ogni
   opzione Dropdown).
5. **Summary** — un riepilogo in sola lettura di tutto quanto sopra; qui non viene scritto nulla.
6. **Finalization** — scegli un **Site** su cui attivare (facoltativo), lascia attivato **Activate plugin after
   creation**, poi **Finish and create the plugin**. L'attivazione avvia un ricaricamento della piattaforma
   (il wizard esegue un conto alla rovescia e ricarica).

![Templating Plugin Creator — Passo 6 (Finalizzazione)](/screenshots/react/melis-templating-plugin-creator/melistemplatingplugincreator-tool-step6.png)

> **Interruttore New / Old.** *New* è il wizard React (predefinito); *Old* renderizza lo strumento jQuery
> classico in un iframe. Passare a *Old* reimposta la bozza di sessione condivisa, quindi il wizard ti avvisa prima.

## Plugin di dashboard (back office)

Un widget di dashboard estende
`MelisCore\Controller\DashboardPlugins\MelisCoreDashboardTemplatingPlugin`. Imposta il proprio modulo nel
costruttore ed espone un metodo di azione che restituisce un `ViewModel` con `setTemplate()`:

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

Il widget è dichiarato sotto l'interfaccia `melis_dashboardplugin` (nome, icona, thumbnail, `width`/`height`
della griglia e un `forward` verso `module` / `plugin` / `function`), e registrato in
`module.config.php` sotto `controller_plugins`. Riferimento:
`vendor/melisplatform/melis-core/src/Controller/DashboardPlugins/MelisCoreDashboardBubbleNewsMelisPlugin.php`.

### Struttura minima

```
MyModule/
├── config/module.config.php                 # declares the dashboard plugin + registers it
├── src/Controller/DashboardPlugins/MyWidgetPlugin.php
└── view/my-module/dashboard-plugin/my-widget.phtml
```

### Crearlo con lo scaffolder in /melis-react

Apri **Dashboard Plugin Creator** dalla sua voce nel menu di sinistra — una scheda superiore con una **barra a 5 passi** e lo
stesso interruttore **New / Old**. Come il fratello di templating, è un wizard React `persistent` supportato da
`MelisDashboardPluginCreatorService`, quindi il PHP generato è identico all'output dello strumento classico.

![Dashboard Plugin Creator — Passo 1 (nome, tipo di vista, destinazione)](/screenshots/react/melis-dashboard-plugin-creator/melisdashboardcreator-tool-step1.png)

I cinque passi:

1. **Plugin** — nome, **View type** (card **Single** oppure **Multi-tabs**, 2–25 schede) e destinazione
   (**New module** oppure un menu a discesa **Existing module**).
2. **Menu Texts & Display** — titolo/descrizione del menu per lingua + la thumbnail obbligatoria.
3. **Dashboard Texts & Display** — il titolo della card per lingua e l'**icona del plugin** (e, per i
   plugin multi-scheda, un'icona per scheda).
4. **Summary** — riepilogo in sola lettura.
5. **Finalization** — lascia attivato **Activate plugin after creation**, poi **Finish and create the
   plugin**; l'attivazione ricarica la piattaforma.

![Dashboard Plugin Creator — Passo 3 (titolo della card + icone)](/screenshots/react/melis-dashboard-plugin-creator/melisdashboardcreator-tool-step3.png)

## Templating vs dashboard — a colpo d'occhio

| | Plugin di templating | Plugin di dashboard |
| --- | --- | --- |
| Classe base | `MelisTemplatingPlugin` | `MelisCoreDashboardTemplatingPlugin` |
| Risiede in | `src/Controller/Plugin/` | `src/Controller/DashboardPlugins/` |
| Metodo principale | `front()` → array di variabili | un'azione → `ViewModel` |
| Mostrato su | pagine del front office (zone drag-and-drop) | dashboard del back office |
| Configurazione salvata | XML nel contenuto della pagina | configurazione dell'interfaccia dashboard |
| Wizard scaffolder | 6 passi (`melis-templating-plugin-creator`) | 5 passi (`melis-dashboard-plugin-creator`) |

## File chiave

| Ambito | Percorso |
| --- | --- |
| Classe base templating | `vendor/melisplatform/melis-engine/src/Controller/Plugin/MelisTemplatingPlugin.php` |
| Esempio templating | `vendor/melisplatform/melis-cms-slider/src/Controller/Plugin/MelisCmsSliderShowSliderPlugin.php` |
| Classe base dashboard | `vendor/melisplatform/melis-core/src/Controller/DashboardPlugins/MelisCoreDashboardTemplatingPlugin.php` |
| Esempio dashboard | `vendor/melisplatform/melis-core/src/Controller/DashboardPlugins/MelisCoreDashboardBubbleNewsMelisPlugin.php` |
| Scaffolder | `vendor/melisplatform/melis-templating-plugin-creator/`, `vendor/melisplatform/melis-dashboard-plugin-creator/` |

Per le pagine di riferimento dei moduli, vedi
[melis-templating-plugin-creator](/it/reference/modules/melis-templating-plugin-creator) e
[melis-dashboard-plugin-creator](/it/reference/modules/melis-dashboard-plugin-creator).
