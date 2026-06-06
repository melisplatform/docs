# MelisMarketPlace

> Place de marché intégrée au backoffice pour découvrir, télécharger, mettre à jour et installer des
> modules Melis Platform.
> Paquet : `melisplatform/melis-marketplace`.

## Objectif

MelisMarketPlace ajoute un outil **Market Place** dans le backoffice qui liste tous les paquets
Melis Platform publiés sur Packagist avec `"type": "melisplatform-module"`. Depuis cet outil, un
administrateur peut télécharger un nouveau module, mettre à jour un module installé (la version
locale est comparée à celle du dépôt), le supprimer, et exécuter l'éventuelle configuration
post-installation fournie par le module. Une icône d'en-tête signale les mises à jour disponibles.
C'est un module **core** qui ne dépend que de `melis-core`.

## Activation

C'est un module Laminas standard. Ajoutez-le à `config/melis.module.load.php` :

```php
return [
    // …
    'MelisMarketPlace',
];
```

Installation via Composer (`composer require melisplatform/melis-marketplace`) ; `melis-core` est
récupéré automatiquement. Voir [Référence des modules](/fr/reference/modules).

La place de marché dialogue avec un miroir Packagist distant ; l'URL est configurée dans
`config/app.interface.php` sous `melismarketplace_toolstree_section/datas/melis_packagist_server`
(par défaut `http://marketplace.melisplatform.com/melis-packagist`). Le même bloc `datas` contient
une liste `exceptions` (`MelisCore`, `MelisEngine`, `MelisFront`, `MelisAssetManager`,
`MelisComposerDeploy`, `MelisDbDeploy`) — les modules core qui ne sont jamais proposés à la
suppression ou à la mise à jour.

## Services clés

Les deux services sont enregistrés dans `config/module.config.php` via `AbstractFactory` et aliasés.

| Alias de service | Rôle |
| --- | --- |
| `MelisMarketPlaceService` | Pilote l'installation et la mise à jour des modules : charge/active un module (`plugModule()` / `unplugModule()` encapsulent `MelisAssetManagerModulesService`), compare les versions (`compareLocalVersionFromRepo()` → à jour / à mettre à jour / en avance / dev) et dispatche le formulaire de configuration optionnel d'un module (`getForm()`, `validateForm()`, `submitForm()`, `hasPostSetup()`). |
| `MelisMarketPlaceSiteService` | Gère l'installation d'un module **site** complet depuis la place de marché (`installSite()`, `marketplaceInstallSite()`, `invokeSetup()`, `getModule()` / `setModule()`). |

Les constantes de statut de version sont définies dans `MelisMarketPlace\Support\MelisMarketPlace`
(`UP_TO_DATE`, `NEED_UPDATE`, `IN_ADVANCE`, `DEV`, ainsi que les clés d'action `DOWNLOAD` /
`UPDATE` / `FORM`).

## Backoffice

L'outil est enregistré sous la section du menu de gauche `melismarketplace_toolstree_section`
(`config/app.interface.php`) avec une icône de panier, ainsi qu'une icône d'en-tête
(`market_place_header_icon`) qui fait remonter les mises à jour disponibles.

Toutes les actions se trouvent sur `MelisMarketPlace\Controller\MelisMarketPlaceController`
(clé de contrôleur `MelisMarketPlace\Controller\MelisMarketPlace`) :

| melisKey / action | Rôle |
| --- | --- |
| `melis_market_place_tool_display` → `tool-container` | Outil principal ; liste les paquets (`fetchPackages()`). |
| `melis_market_place_tool_package_display` → `tool-container-product-view` | Vue détaillée d'un paquet. |
| `tool-product-modal-container` / `tool-product-modal-content` | Modale de confirmation de téléchargement/mise à jour. |
| `tool-module-form-setup-content` | Affiche le formulaire de configuration post-installation d'un module. |
| `market-place-module-header` | Liste déroulante d'en-tête des modules à mettre à jour. |

Actions notables du contrôleur : `moduleListAction()`, `bundleListAction()`,
`melisMarketPlaceProductDoAction()` (effectue le téléchargement/la mise à jour),
`activateModuleAction()` / `plugModuleAction()` / `unplugModuleAction()`,
`execDbDeployAction()`, `executeComposerScriptsAction()`, `reDumpAutoloadAction()`,
`getModuleTablesAction()` / `exportTablesAction()`, et `isMarketplaceAccessibleAction()`.
Un flux de configuration autonome se trouve sur `MelisSetupController`
(route `/MelisMarketPlace/setup`).

## Front office

Ce module ne fournit aucun plugin de templating ni view helper front-office — c'est un outil
exclusivement backoffice.

## Tables de base de données

MelisMarketPlace ne définit **aucune table propre** (aucun SQL d'installation ni delta dbdeploy
n'est livré avec lui). Il opère sur la configuration des modules existante de la plateforme et sur
l'installation Composer. Lorsqu'un module qu'il installe fournit des deltas de base de données,
ceux-ci sont appliqués via `melis-dbdeploy` (`execDbDeployAction()`) ; les installations de site
réutilisent les tables CMS de la plateforme.

## Exemple

Vérifier si un module installé est à jour par rapport au dépôt de la place de marché :

```php
/** @var \MelisMarketPlace\Service\MelisMarketPlaceService $mp */
$mp = $serviceManager->get('MelisMarketPlaceService');

// $latestVersion provient de la liste de la place de marché pour le paquet
$status = $mp->compareLocalVersionFromRepo('MelisCmsNews', $latestVersion);
// $status est l'une des constantes MelisMarketPlace\Support\MelisMarketPlace :
// UP_TO_DATE, NEED_UPDATE, IN_ADVANCE
```

## Fichiers clés

| Sujet | Chemin |
| --- | --- |
| Manifeste du module | `vendor/melisplatform/melis-marketplace/composer.json` |
| Routes / services / contrôleurs | `vendor/melisplatform/melis-marketplace/config/module.config.php` |
| Arbre d'outils & icône d'en-tête | `vendor/melisplatform/melis-marketplace/config/app.interface.php` |
| Service d'installation/mise à jour | `vendor/melisplatform/melis-marketplace/src/Service/MelisMarketPlaceService.php` |
| Service d'installation de site | `vendor/melisplatform/melis-marketplace/src/Service/MelisMarketPlaceSiteService.php` |
| Contrôleur principal | `vendor/melisplatform/melis-marketplace/src/Controller/MelisMarketPlaceController.php` |
| Contrôleur de configuration autonome | `vendor/melisplatform/melis-marketplace/src/Controller/MelisSetupController.php` |
| Constantes | `vendor/melisplatform/melis-marketplace/src/Support/MelisMarketPlace.php` |
| Vues | `vendor/melisplatform/melis-marketplace/view/melis-market-place/` |
| Assets | `vendor/melisplatform/melis-marketplace/public/` |

::: tip Voir aussi
Pour le déploiement piloté par Composer sous-jacent, voir `melis-composerdeploy`
(`MelisComposerService`) et le mécanisme de deltas versionnés de `melis-dbdeploy`.
:::
