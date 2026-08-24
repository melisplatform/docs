# MelisTemplatingPluginCreator

> Un assistant back-office qui génère un **plugin de templating** front-office complet — config,
> contrôleur, vue, formulaire modal, assets et traductions — dans un module nouveau ou existant. En
> v6, il est livré comme une brique React native appelant une `react-api` JSON, avec un bascule
> New/Old vers l'outil historique. Paquet `melisplatform/melis-templating-plugin-creator`.

## Objectif

MelisTemplatingPluginCreator est un générateur de code, pas une fonctionnalité d'exécution. Il vous
guide à travers un **assistant en 6 étapes** — nom du plugin, module de destination, textes de menu
localisés, propriétés (champs), traductions — puis écrit un plugin de templating prêt à l'emploi
dans le module cible. Le plugin généré étend
`MelisEngine\Controller\Plugin\MelisTemplatingPlugin` : une fois créé, il se comporte donc comme
n'importe quel plugin de templating écrit à la main — voir [Plugins](/fr/guide/plugins) pour
comprendre et personnaliser le résultat.

## Activation

C'est un module Laminas standard. Ajoutez-le à `config/melis.module.load.php` :

```php
return [
    // …
    'MelisTemplatingPluginCreator',
];
```

Dépendances Composer (`composer.json`) : `melis-core`, `melis-tool-creator`, `melis-cms`. Lorsque la
destination est un **nouveau** module, l'outil délègue à `MelisToolCreatorService::createTool()` pour
générer d'abord le module. Aucune base de données n'est requise, mais le répertoire `module/` et un
dossier `tpc/temp-thumbnail/` sous la racine publique doivent être accessibles en écriture
(l'extension GD est également nécessaire pour la validation des vignettes). La brique React fait
remonter ces conditions comme des notices de préchecks **bloquantes** lorsque le système de fichiers
n'est pas accessible en écriture ou que GD est absent.

## Le back-office React

L'assistant est une **brique full-React native** (et non une iframe) montée dans `/melis-react`. Il
s'ouvre comme un onglet supérieur nommé **Templating Plugin Creator** avec une barre de 6 étapes et
un bascule **New / Old** (en haut à droite, à côté de **Restart**). *Old* revient à l'outil jQuery
historique dans une iframe ; *New* (par défaut) est l'assistant React. La brique est `persistent` :
quitter l'onglet de l'outil puis y revenir ne perd ni le brouillon ni l'étape courante. Les 6 étapes
sont des panneaux affichés/masqués en CSS sur une seule page montée.

![Étape 1 (Plugin) de l'assistant React : nom du plugin, destination du plugin (Nouveau module / Module de site existant) avec un champ de nom de nouveau module, la barre de 6 étapes et le bouton Next](/screenshots/react/melis-templating-plugin-creator/melistemplatingplugincreator-tool-step1.png)

Toute la logique métier reste côté serveur : la validation reconstruit les formulaires Laminas
historiques (mêmes validateurs, messages et règles) et la génération appelle
`MelisTemplatingPluginCreatorService`. React se limite à la présentation et aux appels d'API.

### Les 6 étapes

| Étape | Nom | Ce que vous faites |
| --- | --- | --- |
| 1 | Plugin | Nom du plugin + destination : **Nouveau module** (révèle un champ de nom de nouveau module) ou **Module de site existant** (liste déroulante de modules). |
| 2 | Menu Texts & Display | Titre/description par langue affichés dans la liste des plugins de l'éditeur de pages (≥1 langue) + téléversement de vignette obligatoire (GIF/JPG/PNG, ~190×100, ≤500 ko). |
| 3 | Main Properties | Nombre de propriétés (1–25, `template_path` inclus) ; par champ, un nom technique, un type d'affichage, un indicateur requis et une valeur par défaut. La propriété 1 est le `template_path` imposé et en lecture seule. |
| 4 | Properties' Translation | Libellé + infobulle par langue pour chaque champ (plus un libellé par option de Dropdown) ; une langue complète suffit. |
| 5 | Summary | Récapitulatif en lecture seule des étapes 1→4, module cible et chemin de template calculé. Rien n'est écrit ici. |
| 6 | Finalization | Choisissez éventuellement un **Site** sur lequel activer et cochez **Activate plugin after creation**, puis **Finish and create the plugin**. |

`template_path` est toujours la première propriété imposée, calculée côté serveur comme
`<Module>/plugins/<plugin-view-name>` et jamais envoyée par le client. **L'étape 6 est la seule
opération mutante** : elle écrit les fichiers du plugin et — pour la branche nouveau module — génère
le module, l'enregistre éventuellement dans le `module.load.php` du site choisi, l'active et invalide
le cache des chemins de modules (l'activation nécessite un rechargement de la plateforme, présenté
comme un compte à rebours). Les types d'affichage disponibles incluent `MelisText`, `Dropdown`,
`DatePicker`, `DateTimePicker`, `PageInput`, `NumericInput`, `Switch`, `Textarea`,
`MelisCoreTinyMCE`.

![Étape 2 (Menu Texts & Display) : titre et description par langue (English / Français) plus la carte de vignette de plugin obligatoire avec aperçu et Remove thumbnail](/screenshots/react/melis-templating-plugin-creator/melistemplatingplugincreator-tool-step2.png)

![Étape 3 (Main Properties) : Nombre de propriétés (1–25) et Propriété 1, le template_path imposé en lecture seule avec sa valeur par défaut calculée côté serveur](/screenshots/react/melis-templating-plugin-creator/melistemplatingplugincreator-tool-step3.png)

![Étape 6 (Finalization) : la liste déroulante Site, le bascule Activate plugin after creation et le bouton Finish and create the plugin](/screenshots/react/melis-templating-plugin-creator/melistemplatingplugincreator-tool-step6.png)

## API React

Les routes vivent dans `config/react-api.php`, servies par
`MelisReactApiTemplatingPluginCreatorController`, toutes sous `/melis/react-api/tpc`, contrat
`{ success, data, error }`. Un échec de validation n'est **pas** une erreur HTTP :
`POST /tpc/step/:step` renvoie `{ valid:false, errors:{…} }` afin que l'UI puisse afficher les
messages par champ.

| Méthode & URL | Objectif |
| --- | --- |
| `GET /tpc/context` | Préchecks (accessibilité en écriture du FS + vérifications GD → `blocking[]`), méta des étapes, langues, modules de site, sites, types d'affichage, `maxFields` (25), limites de vignette. |
| `GET /tpc/state` | Restaure l'assistant depuis la session partagée. |
| `POST /tpc/reset` | Redémarre : efface le brouillon de session + la vignette temporaire. |
| `POST /tpc/step/:step` (`1–4`) | Valide + persiste une étape → `{ valid, errors }`. |
| `POST /tpc/thumbnail` · `POST /tpc/thumbnail/remove` | Téléverse / supprime la vignette du plugin. |
| `GET /tpc/translation-fields` | Champs à traduire (dérivés de l'étape 3). |
| `GET /tpc/summary` | Récapitulatif en lecture seule des étapes 1→4 + module cible + chemin de template. |
| `POST /tpc/generate` | **Génère le plugin** (écrit les fichiers, génère et active éventuellement un module). |

## Capacités (droits avancés)

Déclarées dans `config/react.capabilities.php` sous la melisKey porteuse de droits
`melistemplatingplugincreator_tool` (la même clé qu'utilisent le manifeste et la garde d'accès du
contrôleur). La sémantique est **default-allow**. Chaînes de capacités aplaties :

| Capacité | Contrôle |
| --- | --- |
| `wizard` · `wizard.edit` | Configurer/valider les étapes 1→4 (sans `wizard.edit`, tout l'assistant est en lecture seule). |
| `thumbnail` · `thumbnail.create` · `thumbnail.delete` | Téléverser / supprimer la vignette (étape 2). |
| `summary` · `summary.list` | Lire le récapitulatif (étape 5). |
| `finalization` · `finalization.create` | **Générer le plugin** (étape 6) — la capacité sensible. |

Chaque action de contrôleur est gardée deux fois — `denyUnlessAccess()` (auth + `canAccess`) puis
`denyUnlessCan(cap)`. Masquer les contrôles dans l'UI n'est que de l'UX ; le serveur refuse quoi
qu'il arrive.

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

En interne, `generateTemplatingPlugin()` exécute `performGeneration()`, qui écrit la config du plugin
(`config/plugins/<Module><Plugin>Plugin.config.php`), met à jour le `module.config.php` cible
(`template_map` + `controller_plugins`), ajoute les traductions par langue, génère les assets
(css/js + vignette), le contrôleur (`src/<Module>/Controller/Plugin/<Module><Plugin>Plugin.php`), la
vue front et le formulaire modal, et inclut la nouvelle config depuis le `Module.php` du module. Le
contrôleur React écrit son état d'assistant dans le **même conteneur de session** que l'outil
historique (`templatingplugincreator`), car le service en prend un instantané dans son constructeur.

## Front-office

Ce module n'ajoute **aucun** plugin front-office ni view helper d'exécution propre. Il **génère** au
contraire un plugin de templating dans le module de destination : une classe controller-plugin
étendant `MelisEngine\Controller\Plugin\MelisTemplatingPlugin` avec `loadDbXmlToPluginConfig()` /
`savePluginConfigToXml()` câblés sur les champs configurés, un `config/plugins/*.config.php`
(sections `front` + `melis`, un onglet **Properties**), un `.phtml` front, un `.phtml` de formulaire
modal et des assets css/js. Le plugin généré apparaît alors dans le menu des plugins de l'éditeur de
pages CMS et se dépose dans une `MelisDragDropZone` comme tout autre plugin de templating — voir
[Plugins](/fr/guide/plugins) et [Construire un site](/fr/guide/build-a-site).

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
| Câblage (service, éléments de formulaire, vues) | `vendor/melisplatform/melis-templating-plugin-creator/config/module.config.php` |
| Routes API React + invokable | `vendor/melisplatform/melis-templating-plugin-creator/config/react-api.php` |
| Capacités React | `vendor/melisplatform/melis-templating-plugin-creator/config/react.capabilities.php` |
| Formulaires de l'assistant + config des étapes (réutilisés pour la validation) | `vendor/melisplatform/melis-templating-plugin-creator/config/app.tools.php` |
| Contrôleur de l'API React | `vendor/melisplatform/melis-templating-plugin-creator/src/Controller/MelisReactApiTemplatingPluginCreatorController.php` |
| Contrôleur historique de l'assistant (iframe vue Old) | `vendor/melisplatform/melis-templating-plugin-creator/src/Controller/TemplatingPluginCreatorController.php` |
| Service générateur | `vendor/melisplatform/melis-templating-plugin-creator/src/Service/MelisTemplatingPluginCreatorService.php` |
| Brique React (source + build) | `vendor/melisplatform/melis-templating-plugin-creator/ui-react/` · `public/ui-react/` |

Voir aussi : [Référence des modules](/fr/reference/modules) · [Plugins](/fr/guide/plugins) ·
[Créer un outil](/fr/guide/create-a-tool) · [Construire un site](/fr/guide/build-a-site).
