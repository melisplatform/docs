# MelisAssetManager

> Sert les assets publics (CSS, JS, images) de chaque module via des URLs propres et les regroupe pour
> la production ; fournit également la source canonique de découverte des modules actifs. Paquet
> `melisplatform/melis-asset-manager`.

## Présentation

MelisAssetManager intercepte les requêtes vers `/<NomDuModule>/{css,js,images}/…` au chargement et
diffuse le fichier correspondant depuis le dossier `public/` de ce module, sans logique de contrôleur
dans le chemin critique. Au premier démarrage, il écrit une carte module-vers-chemin dans
`config/melis.modules.path.php` (le dossier `config/` doit être accessible en écriture). Il fournit
également les services à l'échelle de la plateforme pour interroger les modules installés ou actifs,
et pour compiler le CSS/JS de tous les modules en bundles de production via webpack.

Il fait partie des **fondations de la plateforme MelisCore** et est requis par pratiquement tous les
autres modules.

## Activation

Ajouter dans `config/melis.module.load.php` :

```php
return [
    'MelisAssetManager',
];
```

Dépendance : `melisplatform/melis-core` (`^5.2`). Le dossier `config/` doit être accessible en
écriture pour que le module puisse persister `melis.modules.path.php` au démarrage.

## Services principaux

Enregistrés dans `config/module.config.php` sous `service_manager`.

| Alias de service | Rôle |
| --- | --- |
| `ModulesService` | Découvrir et interroger les modules installés/actifs (`MelisModulesService`). |
| `MelisWebPackService` | Construire les bundles webpack et résoudre les listes d'assets des modules. |
| `MelisConfig` | Fusionner et lire l'arbre de config applicative de la plateforme (`MelisConfigService`). |

### `MelisModulesService`

Le service canonique « quels modules existent / sont actifs ». Utilisé par l'outil Modules, la
marketplace, le chargement des modules de site et l'installateur.

```php
$modules = $sm->get('ModulesService'); // MelisAssetManager\Service\MelisModulesService

$active   = $modules->getMelisActiveModules();        // modules actuellement activés
$all      = $modules->getAllModules();                // tous les modules découvrables
$vendor   = $modules->getVendorModules();             // modules sous vendor/
$versions = $modules->getModulesAndVersions();        // module => version
$deps     = $modules->getChildDependencies($moduleName);
$sites    = $modules->getSitesModules();              // modules de template/site
```

Liste complète des méthodes : `getMelisActiveModules`, `getModulesAndVersions`, `getComposer`/`setComposer`,
`getUserModules`, `getSitesModules`, `getMelisModules`, `getAllModules`, `getVendorModules`,
`getChildDependencies`.

### `MelisWebPackService`

```php
$webpack = $sm->get('MelisWebPackService');

$assets  = $webpack->getAssets($moduleName);           // assets déclarés d'un module
$merged  = $webpack->getMergedAssets();                // ensemble fusionné à l'échelle de la plateforme
$webpack->buildWebPack();                               // compiler les bundles
$file    = $webpack->getWebPackMixStaticFile($asset);  // résoudre un asset haché/mixé
```

Liste complète des méthodes : `getAssets`, `getWebPackMixStaticFile`, `getMergedAssets`, `buildWebPack`,
`setCachedFile`, `getCachedFiles`.

La clé de config `ressources.build` par module (dans le `app.interface.php` d'un module) déclare le
`bundle.css` / `bundle.js` que ce service produit et sert.

### `MelisConfigService`

Un helper de fusion de config et de traduction pour les besoins propres d'asset-manager. Méthodes
principales : `getItem`, `getMelisKeys`, `getFormMergedAndOrdered`, `translateAppConfig`.

## URLs des assets

Les assets de n'importe quel module sont accessibles à :

```
/<NomDuModule>/css/<fichier>.css
/<NomDuModule>/js/<fichier>.js
/<NomDuModule>/images/<fichier>.jpg
```

Ces URLs correspondent au dossier `public/` de chaque module. Le repli est le `public/` principal du
projet.

## Tables de base de données

Aucune. Le module est sans état — son seul état persisté est le fichier généré
`config/melis.modules.path.php`.

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Aliases de services et câblage de la livraison des assets | `vendor/melisplatform/melis-asset-manager/config/module.config.php` |
| Service de découverte des modules | `vendor/melisplatform/melis-asset-manager/src/Service/MelisModulesService.php` |
| Service webpack/bundle | `vendor/melisplatform/melis-asset-manager/src/Service/MelisWebPackService.php` |
| Lecteur de config applicative | `vendor/melisplatform/melis-asset-manager/src/Service/MelisConfigService.php` |
| Contrôleurs assets/webpack | `vendor/melisplatform/melis-asset-manager/src/Controller/` |
| Carte des chemins de modules (générée) | `config/melis.modules.path.php` |

Voir aussi : [MelisCore](/fr/legacy/reference/modules/melis-core) · [MelisDbDeploy](/fr/legacy/reference/modules/melis-dbdeploy) · [MelisComposerDeploy](/fr/legacy/reference/modules/melis-composerdeploy) · [MelisInstaller](/fr/legacy/reference/modules/melis-installer) · [Référence des modules](/fr/legacy/reference/modules)
