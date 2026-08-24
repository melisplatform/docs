# MelisTemplatingPluginCreator

> Un assistant GUI du back-office qui génère un **plugin de templating** front-office complet —
> config, contrôleur, vue, formulaire modal, assets et traductions — dans un module nouveau ou
> existant. Paquet Composer `melisplatform/melis-templating-plugin-creator`.

## Objectif

MelisTemplatingPluginCreator est un générateur de code, pas une fonctionnalité d'exécution. Il
ajoute un outil back-office pas à pas qui demande un nom de plugin, un module de destination, des
propriétés (champs), une vignette et des traductions, puis écrit un plugin de templating prêt à
l'emploi dans le module cible. Le plugin généré étend
`MelisEngine\Controller\Plugin\MelisTemplatingPlugin` : une fois créé, il se comporte donc comme
n'importe quel plugin de templating écrit à la main — voir [Plugins](/fr/legacy/guide/plugins) pour
comprendre et personnaliser le résultat.

## Activation

C'est un module Laminas standard. Ajoutez-le à `config/melis.module.load.php` :

```php
return [
    // …
    'MelisTemplatingPluginCreator',
];
```

Dépendances Composer (`composer.json`) : `melis-core`, `melis-tool-creator`, `melis-cms` (PHP
`^8.1|^8.3`). Lorsque la destination est un **nouveau** module, l'outil délègue à
`MelisToolCreatorService::createTool()` pour générer d'abord le module. Aucune base de données n'est
requise, mais le répertoire `module/` et un dossier `tpc/temp-thumbnail/` sous la racine publique
doivent être accessibles en écriture (l'extension GD est également nécessaire pour la validation des
vignettes).

## Services clés

Enregistré comme alias `service_manager` dans `config/module.config.php`.

| Alias | Rôle |
| --- | --- |
| `MelisTemplatingPluginCreatorService` | Génère (et annule) le plugin de templating à partir des données de l'assistant stockées en session. |

`MelisTemplatingPluginCreatorService` (étend `MelisCore\Service\MelisGeneralService`) expose
notamment :

| Méthode | Rôle |
| --- | --- |
| `generateTemplatingPlugin()` | Point d'entrée : lit les étapes de la session et écrit tous les fichiers du plugin ; effectue un rollback en cas d'échec. Renvoie un booléen. |
| `getSiteTemplatingPluginNames($siteModule)` | Liste les noms de plugins de templating existants d'un module de site (utilisé pour rejeter les noms de plugin en doublon). |
| `generateModuleNameCase($str)` / `convertToViewName($string)` | Normalise un nom en nom de module / nom de répertoire de vue valide. |
| `getTempThumbnail()` | Résout le chemin temporaire de la vignette de plugin téléversée pour la session courante. |

En interne, `generateTemplatingPlugin()` exécute `performGeneration()`, qui écrit la config du
plugin (`config/plugins/<Module><Plugin>Plugin.config.php`), met à jour le `module.config.php` cible
(`template_map` + `controller_plugins`), ajoute les traductions par langue, génère les assets
(css/js + vignette), le contrôleur (`src/<Module>/Controller/Plugin/<Module><Plugin>Plugin.php`), la
vue front et le formulaire modal, et inclut la nouvelle config depuis le `Module.php` du module.

## Back-office

Le module ajoute un outil — le **Templating Plugin Creator** — dans l'arbre des outils du
back-office (`config/app.toolstree.php` / `config/app.interface.php`) :

- Chemin dans l'arbre : *Outils & Designs* → *Outils* → Templating Plugin Creator, monté via la
  référence de type `/melistemplatingplugincreator/interface/melistemplatingplugincreator_tool`.
- melisKey de l'outil `melistemplatingplugincreator_tool`, redirigeant vers le contrôleur
  `MelisTemplatingPluginCreator\Controller\TemplatingPluginCreator` (action `render-tool`), avec les
  sous-interfaces `header`, `content` et `steps`.

L'outil est un assistant en 6 étapes géré par `TemplatingPluginCreatorController`
(`renderTemplatingPluginCreatorStepsAction` dispatche `processStep1`…`processStep6`) :

1. Nom du plugin + destination (nouveau module ou module de site existant).
2. Titre/description par langue + téléversement de la vignette (`processUploadAction`).
3. Propriétés : nombre de champs et, par champ, nom, type d'affichage, indicateur requis, options/
   valeur par défaut. Les types d'affichage disponibles incluent `MelisText`, `Dropdown`,
   `DatePicker`, `DateTimePicker`, `PageInput`, `NumericInput`, `Switch`, `Textarea`,
   `MelisCoreTinyMCE`.
4. Libellés/infobulles par langue pour chaque champ.
5. Récapitulatif.
6. Finalisation : génère le plugin (et l'active éventuellement sur un site choisi).

Deux éléments de formulaire alimentent les sélecteurs de l'assistant :
`MelisTemplatingPluginCreatorModuleSelect` et `MelisTemplatingPluginCreatorSiteSelect` (factories
dans `src/Form/Factory/`). Pour construire vous-même un outil comme celui-ci, voir
[Créer un outil](/fr/legacy/guide/create-a-tool).

## Front-office

Ce module n'ajoute **aucun** plugin front-office ni view helper d'exécution propre. Il **génère** au
contraire un plugin de templating dans le module de destination : une classe controller-plugin
étendant `MelisEngine\Controller\Plugin\MelisTemplatingPlugin` avec `loadDbXmlToPluginConfig()` /
`savePluginConfigToXml()` câblés sur les champs configurés, un `config/plugins/*.config.php`
(sections `front` + `melis`, un onglet **Properties**), un `.phtml` front, un `.phtml` de formulaire
modal et des assets css/js. Le plugin généré apparaît alors dans le menu des plugins de l'éditeur de
pages CMS et se dépose dans une `MelisDragDropZone` comme tout autre plugin de templating — voir
[Plugins](/fr/legacy/guide/plugins) et [Construire un site](/fr/legacy/guide/build-a-site).

## Tables de base de données

Aucune. Cet outil génère uniquement des fichiers source et stocke l'état en cours de l'assistant
dans un conteneur de session Laminas (`templatingplugincreator`) ; aucune table `melis_*` n'est
installée.

## Exemple

Le plugin généré se consomme comme tout plugin de templating. Côté service, l'étape finale de
l'assistant appelle :

```php
$tpcService = $serviceManager->get('MelisTemplatingPluginCreatorService');
$result = $tpcService->generateTemplatingPlugin(); // true en cas de succès, fichiers écrits dans le module cible
```

## Fichiers clés

| Sujet | Chemin |
| --- | --- |
| Module / chargement de la config | `vendor/melisplatform/melis-templating-plugin-creator/src/Module.php` |
| Câblage (service, routes, éléments de formulaire, vues) | `vendor/melisplatform/melis-templating-plugin-creator/config/module.config.php` |
| Arbre des outils | `vendor/melisplatform/melis-templating-plugin-creator/config/app.toolstree.php` |
| Interface de l'outil | `vendor/melisplatform/melis-templating-plugin-creator/config/app.interface.php` |
| Formulaires de l'assistant + config des étapes | `vendor/melisplatform/melis-templating-plugin-creator/config/app.tools.php` |
| Contrôleur de l'assistant | `vendor/melisplatform/melis-templating-plugin-creator/src/Controller/TemplatingPluginCreatorController.php` |
| Service générateur | `vendor/melisplatform/melis-templating-plugin-creator/src/Service/MelisTemplatingPluginCreatorService.php` |
| Factories d'éléments de formulaire | `vendor/melisplatform/melis-templating-plugin-creator/src/Form/Factory/` |
| Templates de code (sortie générée) | `vendor/melisplatform/melis-templating-plugin-creator/template/` |

Voir aussi : [Référence des modules](/fr/legacy/reference/modules) · [Plugins](/fr/legacy/guide/plugins) ·
[Créer un outil](/fr/legacy/guide/create-a-tool) · [Construire un site](/fr/legacy/guide/build-a-site).
