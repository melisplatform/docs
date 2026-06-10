# MelisPlatformSkeleton

> Point de départ `composer create-project` qui constitue la racine de toute installation Melis Platform. Package `melisplatform/melis-platform-skeleton`.

## Présentation

MelisPlatformSkeleton n'est pas un module — c'est le projet lui-même. Il fournit le bootstrap Laminas MVC, le dossier `config/` configuré pour les environnements multiples, des emplacements `module/` vides pour la configuration du projet et les modules de site, le pipeline de compilation d'assets webpack/laravel-mix pour le bundle du back-office, ainsi que le `composer.json` qui intègre les six packages fondamentaux MelisCore. Chaque site Melis débute comme une copie de ce squelette.

## Création d'un projet

```bash
composer create-project melisplatform/melis-platform-skeleton .
git submodule init && git submodule update   # pulls melis-docker
```

Pointez un vhost sur `public/`, définissez les deux variables d'environnement requises (voir ci-dessous), créez une base de données vide en `utf8_general_ci`, puis accédez à l'URL du site pour lancer l'assistant d'installation MelisInstaller.

## Variables d'environnement

Définissez-les dans le vhost. Elles pilotent le support multi-environnement et multi-site à partir d'un seul code source.

| Variable | Signification |
| --- | --- |
| `MELIS_PLATFORM` | L'environnement actif (`development`, `preprod`, `prod`, …). Sélectionne le fichier de config correspondant à la plateforme. |
| `MELIS_MODULE` | Le module de site servant de front-office pour ce domaine (ex. `MelisDemoCms`). |

```apache
SetEnv MELIS_PLATFORM "development"
SetEnv MELIS_MODULE   "MelisDemoCms"
```

## Dépendances

| Prérequis | Version |
| --- | --- |
| PHP | `^8.1\|^8.3` |
| `melis-asset-manager` | `^5.3` |
| `melis-composerdeploy` | `^5.3` |
| `melis-core` | `^5.3` |
| `melis-dbdeploy` | `^5.3` |
| `melis-installer` | `^5.3` |
| `melis-marketplace` | `^5.3` |

Sous-module Git : `melis-docker`.

## Hooks du cycle de vie Composer

Après chaque `composer update`, deux scripts s'exécutent automatiquement via `post-update-cmd` :

```php
"MelisCore\\ModuleComposerScript::executeScripts",        // per-module post-install/update scripts
"MelisDbDeploy\\DbDeployOnComposerUpdate::postUpdate"     // apply pending DB deltas automatically
```

Cela signifie qu'installer ou mettre à jour un module via Composer (ou le MarketPlace) configure également son fichier de config et migre la base de données sans intervention manuelle.

## Liste des modules actifs

`config/melis.module.load.php` contient la liste ordonnée des modules actifs lue par `MelisModuleManager::getModules()`. Contenu par défaut après la création du squelette :

```php
return [
    'MelisAssetManager',
    'MelisDbDeploy',
    'MelisComposerDeploy',
    'MelisMarketPlace',
    'MelisInstaller',
    'MelisModuleConfig',
];
```

Ce fichier est réécrit par MelisAssetManager / MelisMarketPlace lors de l'ajout, du retrait, de l'installation ou de la suppression de modules. Ne pas le modifier manuellement sur une plateforme en production.

## Système de configuration (`config/`)

### `config/application.config.php`

Définit le gestionnaire de modules Laminas et la chaîne de fusion `config_glob_paths` :

```php
'modules' => array_merge(
    MelisCore\MelisModuleManager::getModuleComponents(),  // framework/lib components
    MelisCore\MelisModuleManager::getModules()            // active Melis modules
),
'module_listener_options' => [
    'module_paths' => ['./module', './module/MelisSites'],
    'config_glob_paths' => [
        realpath(__DIR__).'/autoload/{{,*.}global,{,*.}local}.php',
        realpath(__DIR__).'/autoload/platforms/'.getenv('MELIS_PLATFORM').'.php',
    ],
    'cache_dir' => 'cache/config/',
],
```

La dernière entrée de `config_glob_paths` charge `autoload/platforms/<MELIS_PLATFORM>.php`, fournissant des surcharges par environnement à partir d'un seul code source.

### Fichiers `config/autoload/`

| Fichier | Rôle | Versionné ? |
| --- | --- | --- |
| `global.php` | Surcharges non sensibles, indépendantes de l'environnement | Oui |
| `local.php` (copie de `local.php.dist`) | Valeurs sensibles : identifiants DB, etc. | Non (gitignored) |
| `platforms/<MELIS_PLATFORM>.php` | Surcharges par environnement choisies via la variable d'env | Selon le projet |
| `development.local.php` (depuis `.dist`) | Mode dev : `display_exceptions`, raisons 404 | Non (gitignored) |

### Mode développement

```bash
composer development-enable    # copies .dist files into place
composer development-status
composer development-disable
```

Active `Laminas\DeveloperTools` et l'affichage des exceptions via `config/development.config.php` et `autoload/development.local.php`.

## Module projet — `module/MelisModuleConfig`

Un vrai module Laminas livré dans le squelette pour la configuration au niveau projet, qui surcharge les modules vendeur. Sa méthode `Module::getConfig()` fusionne trois fichiers :

```php
$configFiles = [
    include __DIR__.'/config/module.config.php',   // routes / services / controllers
    include __DIR__.'/config/app.interface.php',   // back-office interface overrides
    include __DIR__.'/config/app.forms.php',       // form overrides
];
// merged with Laminas\Stdlib\ArrayUtils::merge
```

Utilisez ce module pour surcharger un formulaire core, ajuster l'arborescence de l'interface back-office, ou enregistrer des services spécifiques au projet sans modifier un package vendeur.

## Compilation des assets

Le squelette pilote laravel-mix/webpack pour compiler les assets du back-office en bundles uniques :

- `vendor/melisplatform/melis-core/public/build/css/bundle.css`
- `vendor/melisplatform/melis-core/public/build/js/bundle.js`

```bash
npm install
npm run dev    # laravel-mix "development"
npm run prod   # "production" (minified)
```

`webpack.mix.static.js` est chargé en premier pour les assets statiques. C'est la contrepartie côté projet de la configuration `build`/`disable_bundle` de MelisAssetManager.

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Racine web / bootstrap Laminas | `public/index.php`, `public/.htaccess`, `public/web.config` |
| Gestionnaire de modules + fusion de config | `config/application.config.php` |
| Liste ordonnée des modules actifs | `config/melis.module.load.php` |
| Modèle de config app en mode dev | `config/development.config.php.dist` |
| Surcharges globales non sensibles | `config/autoload/global.php` |
| Modèle de surcharges locales sensibles | `config/autoload/local.php.dist` |
| Surcharges par environnement | `config/autoload/platforms/<env>.php` |
| Module de config au niveau projet | `module/MelisModuleConfig/` |
| Modules de site (front-office) | `module/MelisSites/` |
| Config de compilation des assets | `webpack.mix.js`, `webpack.mix.static.js`, `package.json` |
| Exemple de vhost | `install/vhost.txt` |
| Configuration Docker (sous-module) | `melis-docker/` |

Voir aussi : [MelisCore](/reference/modules/melis-core) · [MelisAssetManager](/reference/modules/melis-asset-manager) · [MelisDbDeploy](/reference/modules/melis-dbdeploy) · [MelisInstaller](/reference/modules/melis-installer) · [MelisMarketPlace](/reference/modules/melis-marketplace) · [MelisComposerDeploy](/reference/modules/melis-composerdeploy)
