# Plugins: templating & dashboard

Melis has two kinds of plugins, and they're different things:

- **Templating plugins** — reusable **content blocks** dropped into a page's `MelisDragDropZone`
  on the **front office** (a slider, a product list, a contact form).
- **Dashboard plugins** — **widgets** shown on the **backoffice** dashboard.

Both have a GUI scaffolder (`melis-templating-plugin-creator`, `melis-dashboard-plugin-creator`)
— use it to generate the boilerplate, then read on to understand and customise it.

## Templating plugins (front office)

A templating plugin extends
`MelisEngine\Controller\Plugin\MelisTemplatingPlugin` and implements:

| Method | Role |
| --- | --- |
| `front()` *(required)* | Returns the **array of variables** passed to the plugin's front `.phtml`. |
| `back()` | Renders the backoffice preview + editor (a sensible default is provided). |
| `createOptionsForms()` | Builds the backoffice form **tabs** from the plugin config. |
| `loadDbXmlToPluginConfig()` / `savePluginConfigToXml($params)` | Decode/encode the plugin's saved parameters (stored as XML inside the page content). |

The constructor wires the plugin to its config:

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

### The plugin config file

Each plugin ships a `config/plugins/<Name>.config.php` with a **`front`** section (rendering
config: `template_path`, an `id`, custom params, css/js) and a **`melis`** section (backoffice
UI: name, thumbnail, and the `modal_form` tabs/fields). Reference:
`vendor/melisplatform/melis-cms-slider/config/plugins/MelisCmsSliderShowSliderPlugin.config.php`.

Register the plugin as a controller plugin in `module.config.php`:

```php
'controller_plugins' => ['invokables' => [
    'MyBlockPlugin' => \MyModule\Controller\Plugin\MyBlockPlugin::class,
]],
```

### How it reaches a page

An editor drags the plugin into a `MelisDragDropZone` (see [Build a site](./build-a-site)). The
configured parameters are serialised as XML into the page's content; on render, the front engine
calls the plugin's `front()` and renders its `.phtml`. `MelisCmsSlider` and `MelisCmsNews` are the
canonical examples.

### Minimal structure

```
MyModule/
├── config/plugins/MyBlockPlugin.config.php
├── src/Controller/Plugin/MyBlockPlugin.php
└── view/my-module/my-block.phtml             # front template
    view/my-module/my-block/melis/form.phtml  # backoffice form
```

## Dashboard plugins (backoffice)

A dashboard widget extends
`MelisCore\Controller\DashboardPlugins\MelisCoreDashboardTemplatingPlugin`. It sets its module in
the constructor and exposes an action method that returns a `ViewModel` with `setTemplate()`:

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

The widget is declared under the `melis_dashboardplugin` interface (name, icon, thumbnail, grid
`width`/`height`, and a `forward` to `module` / `plugin` / `function`), and registered in
`module.config.php` under `controller_plugins`. Reference:
`vendor/melisplatform/melis-core/src/Controller/DashboardPlugins/MelisCoreDashboardBubbleNewsMelisPlugin.php`.

### Minimal structure

```
MyModule/
├── config/module.config.php                 # declares the dashboard plugin + registers it
├── src/Controller/DashboardPlugins/MyWidgetPlugin.php
└── view/my-module/dashboard-plugin/my-widget.phtml
```

## Templating vs dashboard — at a glance

| | Templating plugin | Dashboard plugin |
| --- | --- | --- |
| Base class | `MelisTemplatingPlugin` | `MelisCoreDashboardTemplatingPlugin` |
| Lives in | `src/Controller/Plugin/` | `src/Controller/DashboardPlugins/` |
| Core method | `front()` → variables array | an action → `ViewModel` |
| Shown on | front-office pages (drag-drop zones) | backoffice dashboard |
| Saved config | XML in the page content | dashboard interface config |

## Key files

| Concern | Path |
| --- | --- |
| Templating base class | `vendor/melisplatform/melis-engine/src/Controller/Plugin/MelisTemplatingPlugin.php` |
| Templating example | `vendor/melisplatform/melis-cms-slider/src/Controller/Plugin/MelisCmsSliderShowSliderPlugin.php` |
| Dashboard base class | `vendor/melisplatform/melis-core/src/Controller/DashboardPlugins/MelisCoreDashboardTemplatingPlugin.php` |
| Dashboard example | `vendor/melisplatform/melis-core/src/Controller/DashboardPlugins/MelisCoreDashboardBubbleNewsMelisPlugin.php` |
| Scaffolders | `vendor/melisplatform/melis-templating-plugin-creator/`, `vendor/melisplatform/melis-dashboard-plugin-creator/` |
