# MelisDashboardPluginCreator

> Un assistant pas à pas qui génère un nouveau **plugin de dashboard** (widget) du back-office dans un module nouveau ou existant, désormais livré comme une brique React native. Package `melisplatform/melis-dashboard-plugin-creator`.

## Objectif

MelisDashboardPluginCreator est un **assistant de génération de code** : un assistant en 5 étapes qui génère un widget de dashboard prêt à l'emploi — son contrôleur, sa vue, sa configuration, ses assets et ses traductions — et le raccorde au module cible. Vous choisissez un widget **à un onglet** ou **à plusieurs onglets**, une destination (créer un module entièrement nouveau ou étendre un module existant), des titres/descriptions par langue, une icône et une vignette ; l'outil écrit alors les fichiers et (en option) active le plugin.

Le widget généré étend `MelisCore\Controller\DashboardPlugins\MelisCoreDashboardTemplatingPlugin` et est déclaré sous l'interface `melis_dashboardplugin`, de sorte qu'il apparaît sur le dashboard du back-office. Le module dépend de `melis-core` et de `melis-tool-creator` (ce dernier est réutilisé pour générer le nouveau module). Pour les concepts derrière les plugins de dashboard, voir [Plugins](/fr/legacy/guide/plugins) ; pour les outils de back-office en général, voir [Créer un outil](/fr/legacy/guide/create-a-tool).

## Activation

C'est un module Laminas standard. Ajoutez-le à `config/melis.module.load.php` :

```php
return [
    // …
    'MelisDashboardPluginCreator',
];
```

Installez via Composer (`composer require melisplatform/melis-dashboard-plugin-creator`) ; `melis-core` et `melis-tool-creator` sont tirés automatiquement. Aucune base de données n'est nécessaire.

L'outil écrit des fichiers sur le disque ; les emplacements suivants doivent donc être **accessibles en écriture** par le serveur web (vérifié à l'exécution, remonté à l'assistant sous `context.blocking[]`) : `config/melis.module.load.php`, le répertoire `module/` et le chemin des vignettes temporaires `<DOCUMENT_ROOT>/dpc/temp-thumbnail/` (configuré dans `config/app.tools.php` sous `melisdashboardplugincreator/datas/plugin_thumbnail/path`).

## Back-office React

Dans le back-office React (`/melis-react`), l'outil est livré comme une **brique full-React native** — un véritable assistant React appelant une `react-api` JSON, avec une bascule **Nouveau / Ancien** qui se rabat sur l'outil jQuery historique dans une iframe. Tout le travail réel reste côté serveur : la validation réutilise les formulaires Laminas historiques et la génération appelle `MelisDashboardPluginCreatorService`. React se limite à la présentation et aux appels d'API.

| Élément | Valeur |
| --- | --- |
| Type de brique | Full-React native (assistant en 5 étapes, avec repli iframe historique Nouveau/Ancien) |
| Id de brique | `dashboard-plugin-creator` |
| `route` du manifeste | `/melis-core/dashboard-plugin-creator` (montage de repli) |
| `label` | `Dashboard Plugin Creator` |
| `forwardKey` | `MelisDashboardPluginCreator/DashboardPluginCreator` |
| `melisKey` | `melisdashboardplugincreator_tool` |
| `subTabs` / `persistent` | `false` / `true` |
| Base d'API | `/melis/react-api/dpc` |

La brique est découverte par `GET /melis/react-api/react-modules` et n'apparaît **que si le module est actif** dans `config/melis.module.load.php`. Elle est `persistent` : l'assistant est monté une seule fois et ses 5 étapes sont des panneaux affichés/masqués en CSS, si bien que quitter l'onglet de l'outil puis y revenir ne perd ni le brouillon ni l'étape en cours. Un bouton **Redémarrer** (barre d'outils supérieure) efface le brouillon de session et la vignette temporaire. Basculer la bascule **Nouveau / Ancien** sur *Ancien* affiche le contrôleur historique dans une iframe (`/melis/react-tool-page?key=melisdashboardplugincreator_tool`) et réinitialise le brouillon de session partagé ; l'assistant avertit d'abord si un brouillon existe.

## L'assistant en 5 étapes

| Étape | Composant React | Ce que vous faites |
| --- | --- | --- |
| 1 — Plugin | `Step1Plugin` | **Nom du plugin**, **Type de vue** (Un / Plusieurs onglets, 2–25 onglets), **Destination du plugin** (Nouveau module + nom, ou liste déroulante de module existant). |
| 2 — Textes du menu & affichage | `Step2Menu` | **Titre du plugin** + **Description** par langue (barre d'onglets de langue, au moins une requise) ; upload de la **vignette du plugin** requise (GIF/JPG/PNG, ~190×100, ≤500 ko). |
| 3 — Textes du dashboard & affichage | `Step3Dashboard` | **Titre de la carte** par langue, choix de l'**icône du plugin** dans une grille ; les plugins à plusieurs onglets choisissent **une icône par onglet**. |
| 4 — Récapitulatif | `Step4Summary` | Récapitulatif en lecture seule des étapes 1→3 + module cible (récupéré depuis `/dpc/summary`) ; rien n'est écrit. |
| 5 — Finalisation | `Step5Finalize` | Bascule **Activer le plugin après création** (activée par défaut) + **Terminer et créer le plugin** → génération ; à l'activation, un compte à rebours recharge la plateforme. |

L'étape 5 est la **seule opération mutante**. Les règles métier (mot-clé PHP réservé, module déjà existant, nom/titre de plugin déjà pris) sont validées côté serveur à l'aide des formulaires Laminas historiques ; les composants React se contentent d'afficher les messages par champ retournés.

![Étape 1 — Plugin : nom, Type de vue (Un / Plusieurs onglets) et Destination du plugin (module Nouveau / Existant)](/screenshots/react/melis-dashboard-plugin-creator/melisdashboardcreator-tool-step1.png)

![Étape 2 — Textes du menu & affichage : titre/description par langue (English / Français) ainsi que la vignette du plugin requise avec aperçu et Supprimer](/screenshots/react/melis-dashboard-plugin-creator/melisdashboardcreator-tool-step2.png)

![Étape 3 — Textes du dashboard & affichage : titre de la carte par langue et la grille d'icônes du plugin (Calendrier sélectionné) ; les plugins à plusieurs onglets ajoutent une grille d'icônes par onglet](/screenshots/react/melis-dashboard-plugin-creator/melisdashboardcreator-tool-step3.png)

![Étape 4 — Récapitulatif : récapitulatif en lecture seule Plugin / Module cible / Type, la vignette, les textes du menu, les titres du dashboard et l'icône avant génération](/screenshots/react/melis-dashboard-plugin-creator/melisdashboardcreator-tool-step4.png)

![Étape 5 — Finalisation : la bascule « Activer le plugin après création » et le bouton « Terminer et créer le plugin » qui lance la génération](/screenshots/react/melis-dashboard-plugin-creator/melisdashboardcreator-tool-step5.png)

## API React

Les routes vivent dans `config/react-api.php`, servies par `MelisReactApiDashboardPluginCreatorController`. Toutes sous `/melis/react-api/dpc`, contrat `{ success, data, error }`. Un échec de validation n'est **pas** une erreur HTTP — `POST /dpc/step/:step` retourne `{ success:true, data:{ valid:false, errors:{…} } }` pour que l'UI puisse afficher les messages par champ.

| Méthode & URL | Rôle |
| --- | --- |
| `GET /dpc/context` | Préambule (FS accessible en écriture → `blocking[]`), méta des étapes, langues, modules existants, icônes, min/max d'onglets, limites de vignette |
| `GET /dpc/state` | État courant de l'assistant depuis la session partagée (restaure l'UI) |
| `POST /dpc/reset` | Redémarrer : efface le brouillon de session + la vignette temporaire |
| `POST /dpc/step/:step` (`1`–`3`) | Valider + persister une étape → `{ valid, errors }` |
| `POST /dpc/thumbnail` | Upload multipart de la vignette du plugin |
| `POST /dpc/thumbnail/remove` | Supprimer la vignette |
| `GET /dpc/summary` | Récapitulatif en lecture seule des étapes 1→3 + module cible |
| `POST /dpc/generate` | **Générer le plugin** → `{ generated, module, plugin, restartRequired, notices }` |

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

Le contrôleur ne réimplémente pas la logique de l'outil : la validation reconstruit les formulaires Laminas historiques depuis `config/app.tools.php` (`getFormMergedAndOrdered`), et l'état est écrit dans le **même conteneur de session** que l'outil historique (`dashboardplugincreator`), que le service lit dans son constructeur.

## Capacités

Déclarées dans `config/react.capabilities.php` sous le nœud porteur de droits `melisdashboardplugincreator_tool`. La sémantique est **permissive par défaut** (une capacité non déclarée est autorisée, de sorte que les rôles historiques continuent de fonctionner). Chaînes de capacités aplaties :

| Onglet | Actions | Contrôles |
| --- | --- | --- |
| `wizard` | `edit` | Configurer/enregistrer les étapes 1→3 (sans `wizard.edit`, tout l'assistant est en lecture seule) |
| `thumbnail` | `create`, `delete` | Uploader / supprimer la vignette (étape 2) |
| `summary` | `list` | Lire le récapitulatif (étape 4) |
| `finalization` | `create` | **Générer** le plugin (étape 5) — la capacité sensible |

Chaque action de contrôleur est contrôlée deux fois — l'accès d'abord (`denyUnlessAccess`), puis la capacité concernée (`denyUnlessCan('finalization.create')`). Masquer des contrôles dans React relève de l'UX uniquement ; le serveur refuse quoi qu'il arrive.

## Services clés

Enregistré dans `config/module.config.php` et aliasé :

| Alias de service | Rôle |
| --- | --- |
| `MelisDashboardPluginCreatorService` | Génère le plugin de dashboard à partir des données enregistrées dans la session de l'assistant. |

`MelisDashboardPluginCreatorService` étend `MelisCore\Service\MelisGeneralService`. Méthodes notables :

- `generateDashboardPlugin()` — le point d'entrée : lit les étapes en session, résout le nom du module/plugin cible, puis exécute `performGeneration()`, avec rollback en cas d'échec (`rollbackPluginGeneration()`). Déclenche les évènements `melisdashboard_plugin_creator_service_generate_dashboard_plugin_start/end`.
- Étapes de génération internes : `generateDashboardPluginConfig()` (écrit `config/dashboard-plugins/<Plugin>Plugin.config.php`), `generateDashboardPluginController()`, `generateDashboardPluginView()` (template à un ou plusieurs onglets), `generateDashboardPluginAssets()` (CSS/JS + copie de la vignette), `setTranslations()` (clés de menu/titre par langue), `updateModuleConfig()` (injecte les entrées `template_map` + `controller_plugins`) et `updateModuleFile()` (ajoute l'`include` de config au `Module.php`).
- Utilitaires : `getModuleExistingPlugins()` / `getExistingTranslatedPluginTitle()` (vérification des noms en double), `getTempThumbnail()`, `generateFile()`, `generateModuleNameCase()`, `removeDir()`.

Lorsque la destination est un **nouveau module**, la génération délègue la création du module à `melis-tool-creator` (`MelisToolCreatorService::createTool()` avec un outil `blank`), puis l'active (`ModulesService::activateModule()`) et invalide les caches des chemins de modules et du menu du dashboard. L'activation nécessite un rechargement de la plateforme.

## Front-office

Ce module n'a pas de plugins de templating ni de view helpers front-office — c'est un outil exclusivement back-office. (Les widgets qu'il *génère*, en revanche, sont des plugins de dashboard back-office.)

## Tables de base de données

MelisDashboardPluginCreator ne définit **aucune table propre** — aucun SQL d'installation ni delta dbdeploy n'est livré avec lui. Tout l'état est conservé dans la session de l'assistant ; la sortie est écrite directement dans les fichiers du module cible.

## Exemple

Déclencher la génération à partir des données déjà stockées dans la session de l'assistant (c'est ce que fait l'étape 5 / `POST /dpc/generate` en coulisses) :

```php
/** @var \MelisDashboardPluginCreator\Service\MelisDashboardPluginCreatorService $dpc */
$dpc = $serviceManager->get('MelisDashboardPluginCreatorService');

$success = $dpc->generateDashboardPlugin(); // true on success, false (and rolled back) on failure
```

Le widget généré suit le template `template/DashboardPluginController.php` — une classe étendant `MelisCoreDashboardTemplatingPlugin` avec une action qui retourne un `ViewModel` :

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
| Routes de l'API React | `vendor/melisplatform/melis-dashboard-plugin-creator/config/react-api.php` |
| Capacités React | `vendor/melisplatform/melis-dashboard-plugin-creator/config/react.capabilities.php` |
| Étapes de l'assistant, formulaires, icônes, config vignette | `vendor/melisplatform/melis-dashboard-plugin-creator/config/app.tools.php` |
| Service de génération | `vendor/melisplatform/melis-dashboard-plugin-creator/src/Service/MelisDashboardPluginCreatorService.php` |
| Contrôleur de l'API React | `vendor/melisplatform/melis-dashboard-plugin-creator/src/Controller/MelisReactApiDashboardPluginCreatorController.php` |
| Contrôleur de l'assistant historique (vue Ancien) | `vendor/melisplatform/melis-dashboard-plugin-creator/src/Controller/DashboardPluginCreatorController.php` |
| Source de la brique React | `vendor/melisplatform/melis-dashboard-plugin-creator/ui-react/src/` |
| Brique compilée + manifeste | `vendor/melisplatform/melis-dashboard-plugin-creator/public/ui-react/` |
| Templates du plugin généré | `vendor/melisplatform/melis-dashboard-plugin-creator/template/` |

::: tip À voir aussi
C'est le pendant pour le dashboard de `melis-templating-plugin-creator` (plugins de templating front-office). Pour comprendre les artefacts qu'il génère, lisez [Plugins](/fr/legacy/guide/plugins).
:::
