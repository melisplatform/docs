# MelisComposerDeploy

> Intègre les fonctionnalités de Composer au sein de la plateforme pour gérer les paquets par programmation. Paquet `melisplatform/melis-composerdeploy`.

## Présentation

MelisComposerDeploy permet la gestion programmatique des paquets en intégrant les fonctionnalités de Composer au sein de la plateforme Melis, éliminant ainsi le besoin d'un accès terminal pour installer, mettre à jour ou supprimer des modules. Le module opère de manière transparente via l'outil Modules du back-office, gérant l'installation, les mises à jour et la suppression des paquets de la marketplace. Il dépend uniquement de `composer/composer` (v2.5.8) et fonctionne comme un outil autonome sans couplage à MelisCore.

## Activation

Ajouter dans `config/melis.module.load.php` :

```php
return [
    'MelisComposerDeploy',
];
```

Ce module se situe dans la couche fondationnelle de MelisCore aux côtés de MelisAssetManager, MelisDbDeploy et MelisInstaller.

## Services principaux

| Alias de service | Rôle |
| --- | --- |
| `MelisComposerService` | Interface principale pour l'exécution des opérations Composer en mémoire. Fournit les méthodes `download()`, `update()`, `remove()` et `dumpAutoload()`. Construit via un pattern factory avec une gestion appropriée des entrées/sorties Composer. |

## Back-office

MelisComposerDeploy ne possède pas d'écrans back-office dédiés. Il sert de moteur sous-jacent pour l'outil Modules du back-office et MelisInstaller, qui font appel à `MelisComposerService` pour effectuer les opérations sur les paquets.

## Exemple

Un flux de travail typique installe un paquet et applique immédiatement les migrations de base de données :

```php
// Install a package via the Modules tool integration
$composerSvc = $sm->get('MelisComposerService');
$composerSvc->download('melisplatform/melis-cms-news'); // composer require
$composerSvc->dumpAutoload();                           // composer dump-autoload
// MelisDbDeploy then applies any database migrations for the new module
```

Voir aussi : [MelisDbDeploy](/fr/reference/modules/melis-dbdeploy), [MelisInstaller](/fr/reference/modules/melis-installer), [MelisAssetManager](/fr/reference/modules/melis-asset-manager)
