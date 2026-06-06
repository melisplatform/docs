# MelisDashboardPluginCreator

> Un assistant graphique qui génère un nouveau **plugin de dashboard** (widget) du back-office dans
> un module nouveau ou existant. Package : `melisplatform/melis-dashboard-plugin-creator`.

## Objectif

MelisDashboardPluginCreator ajoute au back-office un **outil** pas à pas qui génère un widget de
dashboard prêt à l'emploi — son contrôleur, sa vue, sa configuration, ses assets et ses traductions
— et le raccorde au module cible. Vous choisissez un widget **à un onglet** ou **à plusieurs
onglets**, une destination (créer un module entièrement nouveau ou étendre un module existant), des
titres/descriptions par langue, une icône et une vignette ; l'outil écrit alors les fichiers et (en
option) active le plugin. Le widget généré étend
`MelisCore\Controller\DashboardPlugins\MelisCoreDashboardTemplatingPlugin` et est déclaré sous
l'interface `melis_dashboardplugin`, de sorte qu'il apparaît sur le dashboard du back-office. Il
dépend de `melis-core` et de `melis-tool-creator` (ce dernier est réutilisé pour générer le nouveau
module). Pour les concepts derrière les plugins de dashboard, voir [Plugins](/fr/guide/plugins) ;
pour les outils de back-office en général, voir [Créer un outil](/fr/guide/create-a-tool).

## Activation

C'est un module Laminas standard. Ajoutez-le à `config/melis.module.load.php` :

```php
return [
    // …
    'MelisDashboardPluginCreator',
];
```

Installez via Composer (`composer require melisplatform/melis-dashboard-plugin-creator`) ;
`melis-core` et `melis-tool-creator` sont tirés automatiquement. Aucune base de données n'est
nécessaire.

L'outil écrit des fichiers sur le disque ; les emplacements suivants doivent donc être
**accessibles en écriture** par le serveur web (vérifié à l'exécution dans
`renderToolContentAction()`) : `config/melis.module.load.php`, le répertoire `module/` et le chemin
des vignettes temporaires `<DOCUMENT_ROOT>/dpc/temp-thumbnail/` (configuré dans
`config/app.tools.php` sous `melisdashboardplugincreator/datas/plugin_thumbnail/path`).

## Services clés

Enregistré dans `config/module.config.php` et aliasé :

| Alias de service | Rôle |
| --- | --- |
| `MelisDashboardPluginCreatorService` | Génère le plugin de dashboard à partir des données enregistrées dans la session de l'assistant. |

`MelisDashboardPluginCreatorService` étend `MelisCore\Service\MelisGeneralService`. Méthodes
notables :

- `generateDashboardPlugin()` — le point d'entrée : lit les étapes en session, résout le nom du
  module/plugin cible, puis exécute `performGeneration()`, avec rollback en cas d'échec
  (`rollbackPluginGeneration()`). Déclenche les évènements
  `melisdashboard_plugin_creator_service_generate_dashboard_plugin_start/end`.
- Étapes de génération internes : `generateDashboardPluginConfig()` (écrit
  `config/dashboard-plugins/<Plugin>Plugin.config.php`), `generateDashboardPluginController()`,
  `generateDashboardPluginView()` (template à un ou plusieurs onglets),
  `generateDashboardPluginAssets()` (CSS/JS + copie de la vignette), `setTranslations()` (clés de
  menu/titre par langue), `updateModuleConfig()` (injecte les entrées `template_map` +
  `controller_plugins`) et `updateModuleFile()` (ajoute l'`include` de config au `Module.php` du
  module).
- Utilitaires : `getModuleExistingPlugins()` / `getExistingTranslatedPluginTitle()` (vérification
  des noms en double), `getTempThumbnail()`, `generateFile()`, `generateModuleNameCase()`,
  `removeDir()`.

## Back-office

L'outil s'enregistre sous **Outils › Designs** dans le menu de gauche via
`config/app.toolstree.php` (il s'imbrique sous la section core `meliscore_tool_tools` et pointe vers
l'interface `melisdashboardplugincreator_tool`). Son interface est définie dans
`config/app.interface.php` (melisKey `melisdashboardplugincreator_tool`, icône `fa fa-puzzle-piece`).

Toutes les actions sont sur
`MelisDashboardPluginCreator\Controller\DashboardPluginCreatorController` (clé de contrôleur
`MelisDashboardPluginCreator\Controller\DashboardPluginCreator`) :

| melisKey / action | Rôle |
| --- | --- |
| `melisdashboardplugincreator_tool` → `render-tool` | Coquille de l'outil ; initialise la session de l'assistant et un nouvel identifiant de session. |
| `melisdashboardplugincreator_header` → `render-tool-header` | En-tête de l'outil. |
| `melisdashboardplugincreator_content` → `render-tool-content` | Corps de l'outil ; vérifie les permissions de fichiers et charge la configuration des étapes. |
| `melisdashboardplugincreator_steps` → `render-dashboard-plugin-creator-steps` | Pilote l'assistant en 5 étapes (`processStep1`…`processStep5`), validant et persistant chaque étape en session. |

Les cinq étapes de l'assistant (depuis `config/app.tools.php`) : **Plugin** (nom, un/plusieurs
onglets, nombre d'onglets, module nouveau/existant), **Textes du menu** (titre + description par
langue, upload de vignette), **Textes du dashboard** (titre + icône par langue, plus icônes par
onglet en mode multi-onglets), **Récapitulatif**, et **Finalisation** (générer, activer en option).
Les formulaires d'étape sont dans `config/app.tools.php` ; la liste déroulante de sélection de module
est construite par `MelisDashboardPluginCreatorModuleSelect` (fabrique de formulaire). Points
d'entrée AJAX supplémentaires : `process-upload`, `remove-plugin-thumbnail`,
`remove-temp-thumbnail-dir`.

Lorsque la destination est un **nouveau module**, l'outil délègue la création du module à
`melis-tool-creator` (`MelisToolCreatorService::createTool()` avec un outil `blank`), puis l'active
(`ModulesService::activateModule()`) et vide le cache du menu du dashboard.

## Front-office

Ce module n'a pas de plugins de templating ni de view helpers front-office — c'est un outil
exclusivement back-office. (Les widgets qu'il *génère*, en revanche, sont des plugins de dashboard
back-office.)

## Tables de base de données

MelisDashboardPluginCreator ne définit **aucune table propre** — aucun SQL d'installation ni delta
dbdeploy n'est livré avec lui. Tout l'état est conservé dans la session de l'assistant ; la sortie
est écrite directement dans les fichiers du module cible.

## Exemple

Déclencher la génération à partir des données déjà stockées dans la session de l'assistant (c'est ce
que fait l'étape 5) :

```php
/** @var \MelisDashboardPluginCreator\Service\MelisDashboardPluginCreatorService $dpc */
$dpc = $serviceManager->get('MelisDashboardPluginCreatorService');

$success = $dpc->generateDashboardPlugin(); // true en cas de succès, false (avec rollback) en cas d'échec
```

Le widget généré suit le template `template/DashboardPluginController.php` — une classe étendant
`MelisCoreDashboardTemplatingPlugin` avec une action qui retourne un `ViewModel` :

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

## Fichiers clés

| Sujet | Chemin |
| --- | --- |
| Manifeste du module | `vendor/melisplatform/melis-dashboard-plugin-creator/composer.json` |
| Routes / service / contrôleur / formulaire | `vendor/melisplatform/melis-dashboard-plugin-creator/config/module.config.php` |
| Arborescence d'outil du menu de gauche | `vendor/melisplatform/melis-dashboard-plugin-creator/config/app.toolstree.php` |
| Interface de l'outil (melisKeys, forwards) | `vendor/melisplatform/melis-dashboard-plugin-creator/config/app.interface.php` |
| Étapes de l'assistant, formulaires, icônes, config vignette | `vendor/melisplatform/melis-dashboard-plugin-creator/config/app.tools.php` |
| Service de génération | `vendor/melisplatform/melis-dashboard-plugin-creator/src/Service/MelisDashboardPluginCreatorService.php` |
| Contrôleur de l'assistant | `vendor/melisplatform/melis-dashboard-plugin-creator/src/Controller/DashboardPluginCreatorController.php` |
| Fabrique du formulaire de sélection de module | `vendor/melisplatform/melis-dashboard-plugin-creator/src/Form/Factory/MelisDashboardPluginCreatorModuleSelectFactory.php` |
| Templates du plugin généré | `vendor/melisplatform/melis-dashboard-plugin-creator/template/` |
| Vues de l'assistant | `vendor/melisplatform/melis-dashboard-plugin-creator/view/` |
| Assets | `vendor/melisplatform/melis-dashboard-plugin-creator/public/` |

::: tip À voir aussi
C'est le pendant pour le dashboard de `melis-templating-plugin-creator` (plugins de templating
front-office). Pour comprendre les artefacts qu'il génère, lisez [Plugins](/fr/guide/plugins).
:::
