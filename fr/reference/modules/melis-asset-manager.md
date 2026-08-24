# MelisAssetManager

> Sert les assets publics (CSS, JS, images) de chaque module via des URLs propres, livre le bundle
> React compilé du back-office et constitue la source canonique de découverte des modules actifs. Paquet
> `melisplatform/melis-asset-manager`.

## Présentation

MelisAssetManager intercepte les requêtes vers `/<NomDuModule>/…` au chargement et diffuse le fichier
correspondant depuis le dossier `public/` de ce module, sans logique de contrôleur dans le chemin
critique. Au premier démarrage, il écrit une carte module-vers-chemin dans
`config/melis.modules.path.php` (le dossier `config/` doit être accessible en écriture). Il fournit
également les services à l'échelle de la plateforme pour interroger les modules installés ou actifs,
et pour compiler le CSS/JS de tous les modules en bundles de production legacy via webpack.

Il fait partie des **fondations de la plateforme MelisCore** et est requis par pratiquement tous les
autres modules.

## Rôle dans le back-office React

Le module **ne possède aucun outil React ni interface propre** — il n'y a ni brique, ni
`config/react-api.php`, ni `config/react.capabilities.php`, et il n'apparaît jamais comme outil dans
`/melis-react`. Sa pertinence pour la v6 est purement infrastructurelle : c'est la couche de livraison
HTTP qui sert le **bundle de la SPA React compilée** au navigateur.

Le back-office React est une single-page app Vite dont la sortie de build (JS, CSS, polices, icônes,
`index.html`) est committée sous `melis-core/public/ui-react/`. Les requêtes vers ces fichiers arrivent
sur des URLs commençant par **`/MelisCore/ui-react/`** — la `base` exacte contre laquelle le build Vite
est compilé — et sont servies par le même résolveur générique `/<Module>/…` → `<module>/public/…`
utilisé pour les assets de chaque module. La répartition est la suivante :

| Couche | Servie par | URL |
| --- | --- | --- |
| Shell HTML React | MelisReactOverride | `/melis-react` |
| Bundle JS/CSS React haché | **MelisAssetManager** | `/MelisCore/ui-react/…` |

> Si ce module (ou son cache accessible en écriture) échoue, le shell HTML peut tout de même se charger
> mais le JS/CSS haché renvoie une **404** ou un mauvais **type MIME**, si bien que le navigateur refuse
> d'exécuter le script — le symptôme classique est un **`/melis-react` blanc**. La cause racine
> habituelle est que le dossier `config/` (et son `melis.modules.path.php` généré) n'est pas accessible
> en écriture par l'utilisateur web (par exemple `www-data`). Activer un nouveau module force une
> reconstruction de ce cache ; un échec de permission à ce moment-là dégrade la livraison des assets.
> Voir [Activation](#activation).

## Activation

Ajouter dans `config/melis.module.load.php` :

```php
return [
    'MelisAssetManager',
];
```

Dépendance : `melisplatform/melis-core` (`^6.0`), PHP `^8.3 | ^8.5`. Le dossier `config/` doit être
accessible en écriture pour que le module puisse persister `melis.modules.path.php` au démarrage.

## Mécanisme de livraison

Il n'y a **aucun contrôleur** pour le chemin d'asset courant — la livraison est un résolveur au
chargement câblé dans `src/Module.php` :

- **`onBootstrap()`** appelle **`displayFile($sm)`** à chaque requête.
- **`displayFile()`** résout l'URI de la requête vers un fichier : il essaie d'abord le dossier public
  principal du projet (`$_SERVER['DOCUMENT_ROOT'] . $uri`) ; sinon, il traite le premier segment d'URI
  comme un nom de module, le recherche dans la carte du cache et construit
  `<cheminDuModule>/public/<reste-de-l-URI>`.
- **`sendDocument()`** définit le bon `Content-Type` (via `getMimeType()` + `config/mime.config.php`),
  ajoute un en-tête de cache de 24h pour les fichiers statiques, affiche les octets et termine
  l'exécution. Un garde-fou (`isRequestAuthenticated()`) exige une session valide avant tout `eval`
  d'un fichier `.php` servi ; les assets statiques restent publics.
- **`checkFileInFolder()`** garantit que le chemin résolu reste à l'intérieur du dossier `public/` du
  module (garde-fou contre le path-traversal).

Une requête vers `/MelisCore/ui-react/assets/index-<hash>.js` résout donc le module `MelisCore` et
diffuse `melis-core/public/ui-react/assets/index-<hash>.js` — aucun code spécifique à React n'est
impliqué.

## Cache des chemins de modules

La carte `<NomDuModule> → chemin` utilisée par `displayFile()` est un fichier PHP généré à
`config/melis.modules.path.php`. Elle est (re)construite par le listener de chargement des modules dans
`src/Module.php` :

- **`init()`** attache **`onLoadModulesPost()`** à `ModuleEvent::EVENT_LOAD_MODULES_POST`.
- **`onLoadModulesPost()`** écrit le fichier lorsqu'il est absent ou qu'un module nouvellement activé
  n'y figure pas encore, en utilisant `MelisModulesService` pour calculer le chemin de chaque module,
  puis lui applique un `chmod` `0777`.

Le module est par ailleurs **sans état** — ce fichier généré est son seul état persisté.

## Services principaux

Enregistrés dans `config/module.config.php` sous `service_manager`.

| Alias de service | Rôle |
| --- | --- |
| `ModulesService` | Découvrir et interroger les modules installés/actifs (`MelisModulesService`). |
| `MelisWebPackService` | Construire les bundles webpack legacy et résoudre les listes d'assets des modules. |
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
`bundle.css` / `bundle.js` que ce service produit et sert. Le `WebPackController` (routes
`melis-backoffice/build-webpack` et `melis-backoffice/view-assets`) le pilote.

> Ce pipeline webpack construit uniquement le bundle **legacy** du back-office — il n'a rien à voir
> avec le build React. La SPA React est compilée par **Vite** à l'intérieur de `melis-core/ui-react/`
> (`npm run build`) et committée dans `melis-core/public/ui-react/` ; MelisAssetManager ne fait que
> *servir* ces fichiers déjà construits, il ne les compile pas.

### `MelisConfigService`

Un helper de fusion de config et de traduction pour les besoins propres d'asset-manager. Méthodes
principales : `getItem`, `getMelisKeys`, `getFormMergedAndOrdered`, `translateAppConfig`.

## URLs des assets

Les assets de n'importe quel module sont accessibles à :

```
/<ModuleName>/css/<file>.css
/<ModuleName>/js/<file>.js
/<ModuleName>/images/<file>.jpg
/MelisCore/ui-react/assets/<file>          # le bundle React committé
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
| Carte extension → MIME pour `sendDocument()` | `vendor/melisplatform/melis-asset-manager/config/mime.config.php` |
| Livraison des assets + cache des chemins de modules | `vendor/melisplatform/melis-asset-manager/src/Module.php` |
| Service de découverte des modules | `vendor/melisplatform/melis-asset-manager/src/Service/MelisModulesService.php` |
| Service webpack/bundle (legacy) | `vendor/melisplatform/melis-asset-manager/src/Service/MelisWebPackService.php` |
| Lecteur de config applicative | `vendor/melisplatform/melis-asset-manager/src/Service/MelisConfigService.php` |
| Contrôleurs assets/webpack | `vendor/melisplatform/melis-asset-manager/src/Controller/` |
| Carte des chemins de modules (générée) | `config/melis.modules.path.php` |
| Build React committé (servi, non construit ici) | `vendor/melisplatform/melis-core/public/ui-react/` |

Voir aussi : [MelisCore](/fr/reference/modules/melis-core) · [MelisReactApi](/fr/reference/modules/melis-react-api) · [MelisDbDeploy](/fr/reference/modules/melis-dbdeploy) · [MelisComposerDeploy](/fr/reference/modules/melis-composerdeploy) · [MelisInstaller](/fr/reference/modules/melis-installer) · [Référence des modules](/fr/reference/modules)
