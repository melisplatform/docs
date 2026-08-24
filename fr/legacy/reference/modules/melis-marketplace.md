# MelisMarketPlace

> Place de marché intégrée au back-office pour découvrir, télécharger, mettre à jour, supprimer et installer des modules Melis Platform.
> Paquet `melisplatform/melis-marketplace`.

## Présentation

MelisMarketPlace est la boutique de modules du back-office : elle liste tous les paquets publiés sur le
serveur Melis Packagist, compare chaque version installée à la dernière version publiée, et permet à un
administrateur de télécharger, mettre à jour ou supprimer des modules — et d'installer des produits sites
complets — sans quitter le back-office. Elle appelle `MelisComposerService` (melis-composerdeploy) pour
les opérations Composer et lit/bascule l'état des modules via `MelisAssetManagerModulesService`
(melis-asset-manager).

Six modules fondamentaux — **MelisCore, MelisEngine, MelisFront, MelisAssetManager,
MelisComposerDeploy, MelisDbDeploy** — sont listés comme exceptions et ne sont jamais proposés au
téléchargement, à la mise à jour ou à la suppression depuis la boutique.

## Activation

Ajoutez à `config/melis.module.load.php` :

```php
return [
    'MelisMarketPlace',
];
```

Nécessite `melisplatform/melis-core: ^5.1` et PHP `^8.1|^8.3`. Le module enregistre un flag
`dbdeploy: true` afin que tout delta de base de données livré soit appliqué au premier chargement.

L'endpoint Packagist distant est configuré dans `config/app.interface.php` sous
`melismarketplace_toolstree_section/datas/melis_packagist_server`
(par défaut `http://marketplace.melisplatform.com/melis-packagist`).

## Services principaux

| Alias de service | Rôle |
| --- | --- |
| `MelisMarketPlaceService` | Comparaison de versions, activation/désactivation de modules, et dispatch du formulaire de configuration post-installation par module. |
| `MelisMarketPlaceSiteService` | Crée un site web complet à partir d'un paquet `melisplatform-site`. |

### `MelisMarketPlaceService`

Étend `MelisGeneralService`.

```php
$mp = $serviceManager->get('MelisMarketPlaceService');

// Compare la version installée à la dernière — retourne l'une des constantes ci-dessous.
$status = $mp->compareLocalVersionFromRepo('MelisCmsSlider', 'v5.1.3');
// MelisMarketPlaceService::NEED_UPDATE  (-1)
// MelisMarketPlaceService::UP_TO_DATE   (1)
// MelisMarketPlaceService::IN_ADVANCE   (2)  — exécute un build dev-…

// Active/désactive un module (réécrit le chargeur de modules actifs via asset-manager).
$mp->plugModule('MelisCmsSlider');
$mp->unplugModule('MelisCmsSlider');

// Vérifie si un module embarque un formulaire de configuration post-installation pour une action donnée.
$needsForm = $mp->hasPostSetup('MyModule', MelisMarketPlaceService::ACTION_DOWNLOAD);
```

`compareLocalVersionFromRepo()` déclenche la paire d'événements
`melismarketplace_compare_local_version_from_repo_start` / `…_end` afin que des listeners puissent
remplacer le statut calculé.

**Convention de configuration post-installation par module.** Un module peut embarquer un
`MelisSetupPostDownloadController` et/ou un `MelisSetupPostUpdateController` dans son propre espace de
noms `Controller\`, exposant `$showOnMarketplacePostSetup = true` et les actions `getFormAction`,
`validateFormAction`, `submitAction`. MarketPlace y délègue pour afficher et traiter le formulaire de
configuration dans une modale :

```php
$mp->getForm('MyModule');               // affiche MyModule\Controller\MelisSetupPostDownload::getFormAction
$mp->validateForm('MyModule', $post);   // → validateFormAction, retourne les variables du JsonModel
$mp->submitForm('MyModule', $post);     // → submitAction
```

### `MelisMarketPlaceSiteService`

Étend `MelisGeneralService`. Crée un site web complet à partir d'un paquet `melisplatform-site` :
crée les lignes `melis_cms_site` / accueil / langues, alloue de nouveaux intervalles d'identifiants de
page, de plateforme et de template, et crée les tables CMS du module via
`Support\MelisMarketPlaceCmsTables` / `Support\MelisMarketPlaceSiteInstall`.

```php
$site = $serviceManager->get('MelisMarketPlaceSiteService');
$site->marketplaceInstallSite($request);   // lit le POST : name, scheme, domain, module, action
```

Exceptions typées (dans `src/Exception/`) : `EmptySiteException`,
`PlatformIdMaxRangeReachedException`, `TemplateIdMaxRangeReachedException`,
`ArrayKeyNotFoundException`, `FileNotFoundException`.

## Back-office

Enregistré sous la section du menu de gauche `melismarketplace_toolstree_section` (icône de panier,
label `tr_market_place`) et une icône d'en-tête `market_place_header_icon` affichant le nombre de
modules nécessitant une mise à jour.

| melisKey / action | Rôle |
| --- | --- |
| `melis_market_place_tool_display` → `tool-container` | Page d'accueil de la boutique ; le JS appelle `fetchPackages()` à l'ouverture. |
| `melis_market_place_tool_package_display` → `tool-container-product-view` | Vue détaillée d'un paquet. |
| `melis_market_place_tool_package_modal_container` | Modale de confirmation de téléchargement/mise à jour/suppression. |
| `melis_market_place_module_setup_form_content` | Formulaire de configuration post-téléchargement/mise à jour par module dans une modale. |
| `market_place_header_conf` → `market-place-module-header` | Liste déroulante d'en-tête des modules nécessitant une mise à jour. |

L'interface du catalogue est pilotée par axios et le carrousel slick ; `app.tools.php` est
intentionnellement vide — MarketPlace n'est pas un outil DataTable.

**Contrôle d'accès.** Deux vérifications conditionnent l'utilisation de la boutique
(toutes deux dans `MelisMarketPlaceController`) :

- `isMarketplaceAccessible()` — indique si le serveur Packagist est joignable et si la fonctionnalité
  est activée.
- `allowUpdate()` — lit `melis_core_platform.plf_update_marketplace` pour la plateforme courante
  (variable d'environnement `MELIS_PLATFORM`) ; une plateforme avec `plf_update_marketplace = 0` peut
  consulter la boutique mais pas télécharger ni mettre à jour.

**Flux téléchargement / mise à jour / suppression.** `melisMarketPlaceProductDoAction()` est le point
d'entrée unique pour les actions du catalogue. Il déclenche `melis_marketplace_product_do_start`,
bascule sur l'action (`MelisComposerService::DOWNLOAD / UPDATE / REMOVE`), puis déclenche
`melis_marketplace_product_do_finish` pour piloter les retours flash-messenger. Avant une suppression,
le contrôleur parcourt les dépendances du module cible, celles de tous les autres modules actifs, ainsi
que le bloc `require` du `composer.json` racine du projet, afin d'éviter la suppression d'une
dépendance partagée.

Référence complète des actions du contrôleur :

```
toolContainer / toolContainerProductView      → vues d'accueil & de produit unique
moduleList / bundleList                        → listes des modules et bundles installés
marketPlaceModuleHeader                        → badge de mises à jour dans l'en-tête
melisMarketPlaceProductDo                      → point d'entrée DOWNLOAD / UPDATE / REMOVE
execDbDeploy / reDumpAutoload / executeComposerScripts → étapes de déploiement post-téléchargement
plugModule / unplugModule / isModuleActive / activateModule → activer/désactiver les modules installés
getSetupModuleForm / validateSetupForm / submitSetupForm   → formulaire de configuration post-installation
getModuleTables / exportTables                 → inspecter/exporter les tables CMS d'un module
isPackageDirectoryRemovable / changePackageDirectoryPermission → vérifications système avant suppression
isModuleExists / isMarketplaceAccessible       → gardes AJAX
siteInstall                                    → installer un produit site
```

`MelisSetupController` gère la route autonome `/MelisMarketPlace/setup` (configuration par module
en dehors de l'arborescence d'interface du back-office).

## Événements

| Événement | Déclenché par | Objectif |
| --- | --- | --- |
| `melismarketplace_compare_local_version_from_repo_start` / `_end` | `compareLocalVersionFromRepo` | Intercepter ou remplacer le résultat du statut de version calculé. |
| `melis_marketplace_product_do_start` | `melisMarketPlaceProductDo` | Avant une action de téléchargement, mise à jour ou suppression. |
| `melis_marketplace_product_do_finish` | `melisMarketPlaceProductDo` | Après l'action — pilote les retours flash-messenger. |

## Tables de base de données

MelisMarketPlace ne définit aucune table propre. Lorsqu'un module téléchargé embarque des deltas de
base de données, ceux-ci sont appliqués via `execDbDeployAction()` (melis-dbdeploy). Les installations
de produits sites écrivent dans les tables CMS existantes de la plateforme (allouées via
`MelisMarketPlaceSiteService`).

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Manifeste du module | `vendor/melisplatform/melis-marketplace/composer.json` |
| Routes / services / contrôleurs | `vendor/melisplatform/melis-marketplace/config/module.config.php` |
| Arbre d'outils, icône d'en-tête, config Packagist | `vendor/melisplatform/melis-marketplace/config/app.interface.php` |
| Service d'installation/mise à jour/activation | `vendor/melisplatform/melis-marketplace/src/Service/MelisMarketPlaceService.php` |
| Service d'installation de site | `vendor/melisplatform/melis-marketplace/src/Service/MelisMarketPlaceSiteService.php` |
| Contrôleur principal | `vendor/melisplatform/melis-marketplace/src/Controller/MelisMarketPlaceController.php` |
| Contrôleur de configuration autonome | `vendor/melisplatform/melis-marketplace/src/Controller/MelisSetupController.php` |
| Support tables CMS | `vendor/melisplatform/melis-marketplace/src/Support/MelisMarketPlaceCmsTables.php` |
| Support installation site | `vendor/melisplatform/melis-marketplace/src/Support/MelisMarketPlaceSiteInstall.php` |
| Exceptions | `vendor/melisplatform/melis-marketplace/src/Exception/` |
| Vues | `vendor/melisplatform/melis-marketplace/view/` |
| Assets (slick, axios, bundle JS) | `vendor/melisplatform/melis-marketplace/public/` |

Voir aussi : [melis-composerdeploy](/fr/legacy/reference/modules/melis-composerdeploy) ·
[melis-asset-manager](/fr/legacy/reference/modules/melis-asset-manager) ·
[melis-dbdeploy](/fr/legacy/reference/modules/melis-dbdeploy) ·
[melis-core](/fr/legacy/reference/modules/melis-core)
