# Architecture & concepts

Melis Platform est une **application MVC Laminas** (lignée ZF2). Par-dessus Laminas standard, elle
ajoute quelques conventions qui font fonctionner le backoffice. Comprendre ces cinq concepts
suffit pour lire — et étendre — quasiment n'importe quelle partie de la plateforme.

## 1. Les modules

Tout, dans Melis, est un **module** (un module Laminas standard). La liste des modules backoffice
chargés par l'application se trouve dans :

```
config/melis.module.load.php
```

```php
return [
  'MelisAssetManager',
  'MelisDbDeploy',
  'MelisCore',
  'MelisCms',
  'MelisFront',
  // … vos propres modules ici
];
```

Au bootstrap, `config/application.config.php` assemble la liste finale des modules via
`MelisCore\MelisModuleManager` (qui fusionne ces modules avec les modules « composants » et le
module de site sélectionné par `MELIS_MODULE`).

Un module embarque ses contrôleurs, services, vues, traductions **et** un jeu de fichiers de
config spécifiques à Melis (voir ci-dessous). Son `Module::getConfig()` les fusionne.

## 2. L'arbre de config & les « melis keys »

Au-delà du `module.config.php` habituel, chaque module backoffice publie des **fichiers de config
applicatifs** fusionnés en un seul arbre interrogeable, sous une racine `plugins` :

| Fichier               | Déclare                                                    |
| --------------------- | --------------------------------------------------------- |
| `app.interface.php`   | Les zones/sections d'UI et leurs **forwards** (cf. §3)    |
| `app.tools.php`       | Les tools : tables de données, colonnes, filtres, boutons |
| `app.toolstree.php`   | L'emplacement d'un tool dans le **menu de gauche**        |
| `app.forms.php`       | Les définitions de formulaires                            |

On interroge cet arbre via le service **`MelisCoreConfig`**
(`vendor/melisplatform/melis-core/src/Service/MelisCoreConfigService.php`) :

```php
$config = $sm->get('MelisCoreConfig');

// Récupérer un nœud par son chemin :
$node = $config->getItem('meliscore_leftmenu');

// Résoudre toutes les « melis keys » → chemins de config complets :
$keys = $config->getMelisKeys();
```

Une **melis key** est un alias stable et lisible pour un chemin de config profondément imbriqué,
déclaré sur un nœud via `'conf' => ['melisKey' => 'ma_cle']`. Elle permet à un module de
référencer l'UI d'un autre sans couplage fort au chemin.

## 3. Zones & forwards (comment le backoffice s'affiche)

L'UI du backoffice est **pilotée par la config**. Une page est un arbre de **zones** ; chaque
zone peut déclarer un **forward** — un triplet `module / controller / action` qui rend cette zone :

```php
'forward' => [
  'module'     => 'MelisCms',
  'controller' => 'PageTree',
  'action'     => 'render-page-tree',
],
```

`MelisCore\Controller\PluginViewController` parcourt l'arbre de config, dispatche chaque forward
et assemble le HTML produit. C'est pourquoi le menu de gauche, les en-têtes et les tools sont
**déclarés en config** plutôt que codés en dur — et pourquoi ajouter un tool revient surtout à
**déclarer la bonne config** et fournir un contrôleur + une vue.

## 4. Services & factories

Melis s'appuie sur le **service manager Laminas**. Les services sont enregistrés dans le
`module.config.php` de chaque module (`service_manager` → `aliases` / `factories`) et résolus par
nom :

```php
$svc = $this->getServiceManager()->get('MelisCoreConfig');
```

Les services cœur courants : `MelisCoreConfig`, `MelisCoreAuth`, `MelisCoreRights`,
`MelisCoreUser`, `MelisCoreTool`. Les services métier étendent généralement `MelisGeneralService`
(qui ajoute le dispatch d'événements) ; l'accès base passe par des wrappers `TableGateway`.

## 5. Les événements

Les modules se branchent sur le cycle de vie de la requête dans `Module::onBootstrap()` et via des
listeners sur le **shared event manager**. Le comportement cœur (authentification, vérification
des droits, messages flash, cache…) est câblé ainsi, et vous pouvez publier/souscrire à des
événements Melis personnalisés — p. ex. `melis_core_auth_login_ok` après une connexion réussie.

## Bonus : changements de base (dbdeploy & flyway)

Les changements de schéma et de données sont versionnés :

- **dbdeploy** (`MelisDbDeploy`) : chaque module fournit des deltas SQL numérotés ; les deltas
  appliqués sont tracés dans une table `changelog` pour ne s'exécuter qu'une fois. Les deltas des
  modules sont publiés dans `dbdeploy/`.
- **flyway** (`flyway/sql/`) : migrations au niveau projet (p. ex. `V3__add_melisai_rights.sql`),
  appliquées avec `flyway migrate`.

## Où regarder dans le code

| Sujet                | Chemin |
| -------------------- | ------ |
| Liste des modules    | `config/melis.module.load.php` |
| Bootstrap de l'app   | `config/application.config.php` |
| Config DB plateforme | `config/autoload/platforms/<MELIS_PLATFORM>.php` |
| Service de config    | `vendor/melisplatform/melis-core/src/Service/MelisCoreConfigService.php` |
| Rendu zone/forward   | `vendor/melisplatform/melis-core/src/Controller/PluginViewController.php` |
| Gestionnaire modules | `vendor/melisplatform/melis-core/src/MelisModuleManager.php` |

Suite : assemblez le tout en [créant votre premier tool](./create-a-tool).
