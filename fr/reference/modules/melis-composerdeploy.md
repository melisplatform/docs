# MelisComposerDeploy

> Déploiement des modules Melis piloté par Composer : exécute les commandes `composer` en mémoire
> et lit la liste des paquets installés. Paquet `melisplatform/melis-composerdeploy`.

## Objectif

`MelisComposerDeploy` est le pont de la plateforme vers Composer. Il embarque son propre runtime
Composer (`composer/composer`) et expose deux choses : un service qui exécute `require` / `update` /
`remove` / `dump-autoload` depuis PHP (pour que la [Marketplace](/fr/reference/modules) puisse
installer ou supprimer un module sans passer par un shell), et un lecteur léger qui liste les
paquets Melis installés en analysant `vendor/composer/installed.json`. Il ne possède ni écran
backoffice, ni plugin front-office, ni table de base de données propre — c'est de la plomberie
consommée par d'autres modules.

## Activation

C'est un module Laminas standard, déclaré dans `config/melis.module.load.php` :

```php
return [
    // …
    'MelisComposerDeploy',
    // …
];
```

Il dépend de `melis-core` (`MelisComposerService` étend `MelisCore\Service\MelisServiceManager`) et
de la bibliothèque `composer/composer` déclarée dans son `composer.json`. Le module porte
`extra.dbdeploy: true`, il participe donc au versionnement [dbdeploy](/fr/reference/modules), mais
ne définit aucun delta. Il est chargé tôt — il fait partie des modules cœur par défaut
(`MelisAssetManager`, `MelisComposerDeploy`, `MelisDbDeploy`, `MelisCore`).

## Services clés

| Service / classe | Rôle |
| --- | --- |
| `MelisComposerService` *(alias de service)* | Exécute les commandes Composer en mémoire via le runtime embarqué. Méthodes : `download($package, $version = null, $noInstall = false)` (`composer require`), `update($package = null, $version = null, $dryRun = false)`, `remove($package)`, `dumpAutoload()`. `setDryRun()` / `setDocumentRoot()` pilotent l'exécution. |
| `MelisComposerDeploy\MelisComposer` *(classe simple, instanciée via `new`)* | Lit `vendor/composer/installed.json`. `getInstalledPackages()` renvoie tous les paquets ; `getMelisPackages()` filtre sur les paquets `type === 'melisplatform-module'` déclarant `extra.module-name` ; `getComposerModulePath($moduleName, $returnFullPath = true)` résout un nom de module vers son chemin vendor. |

Précisions issues du code :

- `MelisComposerService` restreint les commandes exécutables — seules `install`, `update`,
  `require`, `remove` et `dump-autoload` sont acceptées (voir `availableCommands()`) ; toute autre
  commande renvoie un message "tr_market_place_unknown_command".
- Les commandes s'exécutent avec `--no-interaction`, `--ignore-platform-reqs`, `--no-scripts`,
  `--prefer-dist`, `--no-progress` et `--working-dir` pointant sur la racine de la plateforme. La
  sortie est diffusée vers `php://output` puis décorée en HTML par `ComposerOutputFormatterStyle`
  (les couleurs ANSI de Composer deviennent des `<span style="color:…">` dans le navigateur, au
  lieu de codes VT100 bruts).
- Le service est créé par `MelisComposerServiceFactory`, qui injecte le service manager.

## Backoffice

Aucun. Le module n'ajoute ni outil, ni plugin de tableau de bord, ni contrôleur, ni entrée
`melisKey`. Son consommateur backoffice est `melis-marketplace`, dont le contrôleur appelle
`MelisComposerService->download()` / `remove()` / `dumpAutoload()` pour installer et désinstaller
des modules.

## Front office

Aucun. Pas de plugin de templating, de view helper ni de controller plugin.

## Tables de base de données

Aucune. Le module déclare `dbdeploy: true` mais ne fournit aucun delta SQL et ne crée aucune table
`melis_*`.

## Exemple

Résoudre le chemin d'un module et lister les modules Melis installés (le motif utilisé par
`melis-engine`, `melis-asset-manager` et `melis-dbdeploy`) :

```php
$melisComposer = new \MelisComposerDeploy\MelisComposer();

// Chemin absolu d'un module sur le disque, par son nom de module Laminas
$path = $melisComposer->getComposerModulePath('MelisCmsNews'); // …/vendor/melisplatform/melis-cms-news

// Tous les melisplatform-module installés qui déclarent extra.module-name
$melisPackages = $melisComposer->getMelisPackages();
```

Installer un paquet en mémoire (le motif de la Marketplace) :

```php
$composerSvc = $sm->get('MelisComposerService');
$composerSvc->download('melisplatform/melis-cms-news'); // composer require
$composerSvc->dumpAutoload();                           // composer dump-autoload
```

## Fichiers clés

| Sujet | Chemin |
| --- | --- |
| Bootstrap du module | `vendor/melisplatform/melis-composerdeploy/src/Module.php` |
| Config de l'alias de service | `vendor/melisplatform/melis-composerdeploy/config/module.config.php` |
| Service de commandes Composer | `vendor/melisplatform/melis-composerdeploy/src/Service/MelisComposerService.php` |
| Factory du service | `vendor/melisplatform/melis-composerdeploy/src/Service/Factory/MelisComposerServiceFactory.php` |
| Formateur HTML de sortie | `vendor/melisplatform/melis-composerdeploy/src/Service/ComposerOutputFormatterStyle.php` |
| Lecteur des paquets installés | `vendor/melisplatform/melis-composerdeploy/src/MelisComposer.php` |
| Runtime Composer embarqué | `vendor/melisplatform/melis-composerdeploy/bin/` |
