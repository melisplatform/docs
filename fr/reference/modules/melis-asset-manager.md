# MelisAssetManager

> Sert les assets du dossier `public/` de chaque module via HTTP et gère la carte des chemins de modules.
> Paquet : `melisplatform/melis-asset-manager`.

## Objectif

MelisAssetManager fait partie de la plomberie de la plateforme. Plutôt que de copier le dossier
`public/` de chaque module dans la racine web, il intercepte les requêtes d'assets au démarrage et
diffuse le fichier correspondant directement depuis le module qui le possède. Il tient également à
jour une carte du chemin de chaque module (`config/melis.modules.path.php`), expose des services
pour interroger les modules installés/actifs et leurs dépendances, génère un fichier Laravel-Mix
`webpack.mix.js` pour regrouper le CSS/JS des modules, et fournit les view helpers d'icônes SVG
utilisés dans tout le back-office. C'est l'un des quatre modules de base, requis par presque tout
le reste.

## Activation

Module Laminas standard, listé dans `config/melis.module.load.php`. C'est un module **core**
(`extra.melis-module-category: core`), chargé en haut de la liste, avant le reste de la plateforme :

```php
return [
    'MelisAssetManager',   // ← ici
    'MelisDbDeploy',
    'MelisComposerDeploy',
    'MelisCore',
    // …
    'MelisModuleConfig',
];
```

Dépendance : `melisplatform/melis-core` (`^5.2`). Le `Module.php` écrit
`config/melis.modules.path.php` au premier démarrage (et quand de nouveaux modules apparaissent), le
dossier `config/` doit donc être accessible en écriture. Voir la
[Référence des modules](/fr/reference/modules).

## Services principaux

Déclarés dans `config/module.config.php` sous `service_manager.aliases`.

| Alias de service | Classe | Rôle |
| --- | --- | --- |
| `MelisAssetManagerModulesService` | `MelisModulesService` | Découvrir les modules, leurs chemins et leurs dépendances. |
| `MelisAssetManagerWebPack` | `MelisWebPackService` | Générer le bundle `webpack.mix.js` et lister les assets de page. |
| `MelisConfig` | `MelisConfigService` | Lire l'arbre de config applicative fusionné (la config `plugins` / melisKey). |

**`MelisModulesService`** (étend `MelisCore\Service\MelisServiceManager`) — le plus réutilisé.
Méthodes notables :

- `getAllModules()`, `getVendorModules()`, `getUserModules()`, `getAIModules()`,
  `getSitesModules()`, `getMelisModules()` — lister les modules par origine.
- `getActiveModules()` — modules réellement chargés par le `ModuleManager` Laminas.
- `getModulePath($moduleName, $returnFullPath = true)` — chemin absolu (ou relatif) d'un module,
  qu'il soit dans `vendor/`, `module/` ou `module/AIModules/`.
- `getDependencies($moduleName)` / `getChildDependencies($moduleName)` — lire les `require` du
  `composer.json` d'un module, ou trouver qui en dépend.
- `getModulesAndVersions($moduleName = null)` — nom de paquet + version par module.
- `getCoreModules()` — les quatre modules de base protégés (`MelisAssetManager`, `MelisDbDeploy`,
  `MelisComposerDeploy`, `MelisCore`).
- `activateModule()`, `loadModule()`, `unloadModule()`, `isModuleLoaded()`,
  `createModuleLoader()` — lire/écrire `config/melis.module.load.php`.

**`MelisWebPackService`** — `getAssets($returnBundle = true)` renvoie le CSS/JS effectif de la page
(en substituant `bundle-all.css` / `bundle-all.js` quand un build existe) ; `getMergedAssets()`
collecte les `ressources` déclarées par chaque config applicative chargée ; `buildWebPack()` écrit
un `webpack.mix.js` à la racine du projet pour `npm run development|production`.

**`MelisConfigService`** (implémente `MelisConfigServiceInterface`) — le lecteur de config
applicative de la plateforme : `getItem($pathString, $prefix)` résout une melisKey/un chemin vers
son sous-arbre de config (avec traduction des clés `tr_*`), `getMelisKeys()` associe chaque
`melisKey` à son chemin, plus les helpers de formulaire `getFormMergedAndOrdered()`,
`setFormFieldDisabled()`, `setFormFieldRequired()`.

## Back-office

Deux routes utilitaires sous `melis-backoffice` (contrôleur `MelisAssetManager\Controller\WebPack`) :

| Route | Action | Rôle |
| --- | --- | --- |
| `build-webpack` | `buildWebpackAction` | Générer `webpack.mix.js` à partir des assets des modules actifs. |
| `view-assets` | `viewAssetsAction` | Afficher le CSS/JS que la plateforme chargerait (débogage). |

Le module fournit aussi les view helpers d'**icônes** du back-office (`view_helpers`), chacun
rendant un badge SVG « M » inline dans une couleur de section :

`melisCoreIcon`, `melisCmsIcon`, `melisMarketingIcon`, `melisCommerceIcon`, `melisOthersIcon`,
`melisCustomIcon` — tous étendant `AbstractMelisIconsHelper::createIcon()`.

```php
// dans une vue back-office .phtml
echo $this->melisCoreIcon(24, 24);
```

## Front-office

Aucun plugin de templating ni de dashboard. La contribution au front-office est la livraison des
assets elle-même : à chaque requête, le listener de bootstrap (`Module::displayFile`) vérifie
d'abord la racine web publique, puis le dossier `public/` du module propriétaire, et diffuse le
fichier avec un type MIME correct (depuis `config/mime.config.php`) et un en-tête de cache de 24 h.
Les assets sont donc accessibles via :

```
/MelisCore/css/melis.css
/<NomDuModule>/js/<fichier>.js
/<NomDuModule>/images/<fichier>.jpg
```

`MelisHeadPluginHelper` (utilisé en interne par `MelisWebPackService`) est ce qui rassemble les
`ressources/css` et `ressources/js` de chaque config applicative ; ajoutez
`'disable_bundle' => true` sous le `ressources/build` d'un module pour l'exclure du bundling.

## Tables de base de données

Aucune. Le module est sans état — son « état » réside dans les fichiers générés
`config/melis.modules.path.php` et `webpack.mix.js` (à la racine du projet).

## Fichiers clés

| Concern | Chemin |
| --- | --- |
| Bootstrap & livraison des assets | `vendor/melisplatform/melis-asset-manager/src/Module.php` |
| Config du module (routes, services, helpers) | `vendor/melisplatform/melis-asset-manager/config/module.config.php` |
| Service de découverte des modules | `vendor/melisplatform/melis-asset-manager/src/Service/MelisModulesService.php` |
| Service webpack/bundle | `vendor/melisplatform/melis-asset-manager/src/Service/MelisWebPackService.php` |
| Lecteur de config applicative | `vendor/melisplatform/melis-asset-manager/src/Service/MelisConfigService.php` |
| Contrôleur webpack | `vendor/melisplatform/melis-asset-manager/src/Controller/WebPackController.php` |
| Helper head/assets | `vendor/melisplatform/melis-asset-manager/src/View/Helper/MelisHeadPluginHelper.php` |
| Helpers d'icônes | `vendor/melisplatform/melis-asset-manager/src/View/Helper/*IconHelper.php` |
| Carte MIME | `vendor/melisplatform/melis-asset-manager/config/mime.config.php` |
