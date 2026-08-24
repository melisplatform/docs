# Plugins : templating & dashboard

Melis a deux types de plugins, et ce sont deux choses différentes :

- **Plugins de templating** — des **blocs de contenu** réutilisables déposés dans une zone
  `MelisDragDropZone` d'une page, sur le **front office** (un slider, une liste de produits, un
  formulaire de contact).
- **Plugins de dashboard** — des **widgets** affichés sur le dashboard du **backoffice**.

Les deux disposent d'un scaffolder GUI (`melis-templating-plugin-creator`,
`melis-dashboard-plugin-creator`) — utilisez-le pour générer le boilerplate, puis lisez la suite
pour comprendre et personnaliser. Dans Melis v6, ces scaffolders sont des **assistants nativement
React** dans le backoffice `/melis-react` (chacun conserve un bascule **New / Old** vers l'outil
classique en iframe). Le framework, l'ensemble de modules et le PHP généré sont inchangés — seule
l'UI que vous pilotez est désormais en React.

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

### Le scaffolder dans /melis-react

Ouvrez **Templating Plugin Creator** depuis son entrée dans le menu de gauche — il s'ouvre en onglet
supérieur avec une **barre à 6 étapes** et le bascule **New / Old** en haut à droite (à côté de
**Restart**). La vue New est un véritable assistant React ; l'ensemble est `persistent`, vous pouvez
donc quitter l'onglet et y revenir sans perdre votre étape ni vos saisies. (Tout le vrai travail
reste côté serveur — la validation réutilise les formulaires Laminas existants et la génération
appelle `MelisTemplatingPluginCreatorService`, qui écrit les mêmes fichiers PHP/vue/config/langue
qu'auparavant.)

![Templating Plugin Creator — Étape 1 (Nom du plugin + destination)](/screenshots/react/melis-templating-plugin-creator/melistemplatingplugincreator-tool-step1.png)

Les six étapes :

1. **Plugin** — nom du plugin + destination (**New module**, ou un **Existing site module** que vous
   choisissez dans une liste déroulante). Le serveur calcule le `template_path` imposé à partir de
   ce choix.
2. **Menu Texts & Display** — titre/description par langue affichés dans la liste des plugins de
   l'éditeur de page, plus le thumbnail requis (GIF/JPG/PNG, ~190×100, ≤500 ko).
3. **Main Properties** — les champs éditables du plugin (1–25, `template_path` inclus). Le champ 1
   est le `template_path` verrouillé ; les champs 2..N reçoivent chacun un nom technique, un type
   d'affichage (text, Dropdown, DatePicker, NumericInput, Switch, Textarea, texte enrichi…), un
   indicateur « requis » et une valeur par défaut.
4. **Properties' Translation** — un label + une infobulle par propriété, par langue (plus un label
   par option de Dropdown).
5. **Summary** — un récapitulatif en lecture seule de tout ce qui précède ; rien n'est écrit ici.
6. **Finalization** — choisissez un **Site** sur lequel activer (optionnel), laissez **Activate
   plugin after creation** activé, puis **Finish and create the plugin**. L'activation déclenche un
   rechargement de la plateforme (l'assistant compte à rebours et recharge).

![Templating Plugin Creator — Étape 6 (Finalisation)](/screenshots/react/melis-templating-plugin-creator/melistemplatingplugincreator-tool-step6.png)

> **Bascule New / Old.** *New* est l'assistant React (par défaut) ; *Old* rend l'outil jQuery
> classique en iframe. Passer sur *Old* réinitialise le brouillon de session partagé, l'assistant
> vous avertit donc au préalable.

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

### Le scaffolder dans /melis-react

Ouvrez **Dashboard Plugin Creator** depuis son entrée dans le menu de gauche — un onglet supérieur
avec une **barre à 5 étapes** et le même bascule **New / Old**. Comme son homologue templating,
c'est un assistant React `persistent` adossé à `MelisDashboardPluginCreatorService`, si bien que le
PHP généré est identique à la sortie de l'outil classique.

![Dashboard Plugin Creator — Étape 1 (nom, type de vue, destination)](/screenshots/react/melis-dashboard-plugin-creator/melisdashboardcreator-tool-step1.png)

Les cinq étapes :

1. **Plugin** — nom, **View type** (carte **Single** ou **Multi-tabs**, 2–25 onglets) et destination
   (**New module** ou une liste déroulante **Existing module**).
2. **Menu Texts & Display** — titre/description de menu par langue + le thumbnail requis.
3. **Dashboard Texts & Display** — le titre de carte par langue et l'**icône du plugin** (et, pour
   les plugins multi-onglets, une icône par onglet).
4. **Summary** — récapitulatif en lecture seule.
5. **Finalization** — laissez **Activate plugin after creation** activé, puis **Finish and create
   the plugin** ; l'activation recharge la plateforme.

![Dashboard Plugin Creator — Étape 3 (titre de carte + icônes)](/screenshots/react/melis-dashboard-plugin-creator/melisdashboardcreator-tool-step3.png)

## Templating vs dashboard — en un coup d'œil

| | Plugin de templating | Plugin de dashboard |
| --- | --- | --- |
| Classe de base | `MelisTemplatingPlugin` | `MelisCoreDashboardTemplatingPlugin` |
| Se trouve dans | `src/Controller/Plugin/` | `src/Controller/DashboardPlugins/` |
| Méthode cœur | `front()` → tableau de variables | une action → `ViewModel` |
| Affiché sur | les pages front (zones drag-drop) | le dashboard backoffice |
| Config enregistrée | XML dans le contenu de page | config d'interface du dashboard |
| Assistant scaffolder | 6 étapes (`melis-templating-plugin-creator`) | 5 étapes (`melis-dashboard-plugin-creator`) |

## Fichiers clés

| Sujet | Chemin |
| --- | --- |
| Classe de base templating | `vendor/melisplatform/melis-engine/src/Controller/Plugin/MelisTemplatingPlugin.php` |
| Exemple templating | `vendor/melisplatform/melis-cms-slider/src/Controller/Plugin/MelisCmsSliderShowSliderPlugin.php` |
| Classe de base dashboard | `vendor/melisplatform/melis-core/src/Controller/DashboardPlugins/MelisCoreDashboardTemplatingPlugin.php` |
| Exemple dashboard | `vendor/melisplatform/melis-core/src/Controller/DashboardPlugins/MelisCoreDashboardBubbleNewsMelisPlugin.php` |
| Scaffolders | `vendor/melisplatform/melis-templating-plugin-creator/`, `vendor/melisplatform/melis-dashboard-plugin-creator/` |

Pour les pages de référence des modules, voir
[melis-templating-plugin-creator](/fr/reference/modules/melis-templating-plugin-creator) et
[melis-dashboard-plugin-creator](/fr/reference/modules/melis-dashboard-plugin-creator).
