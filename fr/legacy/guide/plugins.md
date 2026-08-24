# Plugins : templating & dashboard

Melis a deux types de plugins, et ce sont deux choses différentes :

- **Plugins de templating** — des **blocs de contenu** réutilisables déposés dans une zone
  `MelisDragDropZone` d'une page, sur le **front office** (un slider, une liste de produits, un
  formulaire de contact).
- **Plugins de dashboard** — des **widgets** affichés sur le dashboard du **backoffice**.

Les deux disposent d'un scaffolder GUI (`melis-templating-plugin-creator`,
`melis-dashboard-plugin-creator`) — utilisez-le pour générer le boilerplate, puis lisez la suite
pour comprendre et personnaliser.

## Plugins de templating (front office)

Un plugin de templating étend
`MelisEngine\Controller\Plugin\MelisTemplatingPlugin` et implémente :

| Méthode | Rôle |
| --- | --- |
| `front()` *(requis)* | Renvoie le **tableau de variables** passé au `.phtml` front du plugin. |
| `back()` | Rend l'aperçu + l'éditeur backoffice (un défaut raisonnable est fourni). |
| `createOptionsForms()` | Construit les **onglets** de formulaire backoffice depuis la config. |
| `loadDbXmlToPluginConfig()` / `savePluginConfigToXml($params)` | Décode/encode les paramètres enregistrés du plugin (stockés en XML dans le contenu de la page). |

Le constructeur relie le plugin à sa config :

```php
use MelisEngine\Controller\Plugin\MelisTemplatingPlugin;

class MonBlocPlugin extends MelisTemplatingPlugin
{
    public function __construct($updatesPluginConfig = [])
    {
        $this->configPluginKey = 'mymodule';      // clé dans le fichier de config du plugin
        $this->pluginXmlDbKey  = 'monBloc';       // nom de l'élément XML enregistré dans la page
        parent::__construct($updatesPluginConfig);
    }

    public function front()
    {
        $id = $this->pluginFrontConfig['someParam'] ?? null;
        // … récupérer des données via un service …
        return ['pluginId' => $this->pluginFrontConfig['id'], 'items' => $items];
    }
}
```

### Le fichier de config du plugin

Chaque plugin fournit un `config/plugins/<Name>.config.php` avec une section **`front`** (config de
rendu : `template_path`, un `id`, des params custom, css/js) et une section **`melis`** (UI
backoffice : nom, thumbnail, et les onglets/champs `modal_form`). Référence :
`vendor/melisplatform/melis-cms-slider/config/plugins/MelisCmsSliderShowSliderPlugin.config.php`.

Enregistrez le plugin comme controller plugin dans `module.config.php` :

```php
'controller_plugins' => ['invokables' => [
    'MonBlocPlugin' => \MyModule\Controller\Plugin\MonBlocPlugin::class,
]],
```

### Comment il arrive sur une page

Un éditeur glisse le plugin dans une `MelisDragDropZone` (voir [Construire un
site](./build-a-site)). Les paramètres configurés sont sérialisés en XML dans le contenu de la
page ; au rendu, le moteur front appelle le `front()` du plugin et rend son `.phtml`.
`MelisCmsSlider` et `MelisCmsNews` sont les exemples canoniques.

### Structure minimale

```
MyModule/
├── config/plugins/MonBlocPlugin.config.php
├── src/Controller/Plugin/MonBlocPlugin.php
└── view/my-module/mon-bloc.phtml             # template front
    view/my-module/mon-bloc/melis/form.phtml  # formulaire backoffice
```

## Plugins de dashboard (backoffice)

Un widget de dashboard étend
`MelisCore\Controller\DashboardPlugins\MelisCoreDashboardTemplatingPlugin`. Il définit son module
dans le constructeur et expose une méthode d'action qui renvoie un `ViewModel` avec
`setTemplate()` :

```php
use MelisCore\Controller\DashboardPlugins\MelisCoreDashboardTemplatingPlugin;
use Laminas\View\Model\ViewModel;

class MonWidgetPlugin extends MelisCoreDashboardTemplatingPlugin
{
    public function __construct()
    {
        $this->pluginModule = 'mymodule';
        parent::__construct();
    }

    public function monwidget()   // l'action référencée par la config du plugin
    {
        $view = new ViewModel();
        $view->setTemplate('my-module/dashboard-plugin/mon-widget');
        return $view;
    }
}
```

Le widget est déclaré sous l'interface `melis_dashboardplugin` (nom, icône, thumbnail, grille
`width`/`height`, et un `forward` vers `module` / `plugin` / `function`), et enregistré dans
`module.config.php` sous `controller_plugins`. Référence :
`vendor/melisplatform/melis-core/src/Controller/DashboardPlugins/MelisCoreDashboardBubbleNewsMelisPlugin.php`.

### Structure minimale

```
MyModule/
├── config/module.config.php                 # déclare le plugin dashboard + l'enregistre
├── src/Controller/DashboardPlugins/MonWidgetPlugin.php
└── view/my-module/dashboard-plugin/mon-widget.phtml
```

## Templating vs dashboard — en un coup d'œil

| | Plugin de templating | Plugin de dashboard |
| --- | --- | --- |
| Classe de base | `MelisTemplatingPlugin` | `MelisCoreDashboardTemplatingPlugin` |
| Se trouve dans | `src/Controller/Plugin/` | `src/Controller/DashboardPlugins/` |
| Méthode cœur | `front()` → tableau de variables | une action → `ViewModel` |
| Affiché sur | les pages front (zones drag-drop) | le dashboard backoffice |
| Config enregistrée | XML dans le contenu de page | config d'interface du dashboard |

## Fichiers clés

| Sujet | Chemin |
| --- | --- |
| Classe de base templating | `vendor/melisplatform/melis-engine/src/Controller/Plugin/MelisTemplatingPlugin.php` |
| Exemple templating | `vendor/melisplatform/melis-cms-slider/src/Controller/Plugin/MelisCmsSliderShowSliderPlugin.php` |
| Classe de base dashboard | `vendor/melisplatform/melis-core/src/Controller/DashboardPlugins/MelisCoreDashboardTemplatingPlugin.php` |
| Exemple dashboard | `vendor/melisplatform/melis-core/src/Controller/DashboardPlugins/MelisCoreDashboardBubbleNewsMelisPlugin.php` |
| Scaffolders | `vendor/melisplatform/melis-templating-plugin-creator/`, `vendor/melisplatform/melis-dashboard-plugin-creator/` |
