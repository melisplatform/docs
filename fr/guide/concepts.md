# Architecture & concepts

Melis Platform est une **application MVC Laminas** (lignée ZF2). Par-dessus Laminas standard, elle
ajoute quelques conventions qui font fonctionner le backoffice. Comprendre ces cinq concepts
suffit pour lire — et étendre — quasiment n'importe quelle partie de la plateforme.

En **v6**, le framework et les modules sont inchangés : les mêmes modules Laminas, le même arbre
de config, les mêmes services et événements. Ce qui a changé, c'est l'**UI du backoffice** : la v6
livre un nouveau **backoffice React à `/melis-react`** par-dessus ces fondations inchangées
(cf. §6). Les cinq concepts ci-dessous décrivent toujours comment tout fonctionne en dessous.

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
config spécifiques à Melis (voir ci-dessous). Son `Module::getConfig()` les fusionne. En v6, un
module peut **aussi** livrer une « brick » React (une petite UI React) et ses propres endpoints
`react-api` — il s'agit toujours simplement de config et de sources supplémentaires au sein du
même module (cf. §6).

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
référencer l'UI d'un autre sans couplage fort au chemin. Cette même **melisKey** est ce que le
backoffice React utilise pour identifier un tool — à la fois pour y router et pour le filtrer par
droits (cf. §6).

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

En v6, cette mécanique zone/forward reste la source de vérité, et elle alimente le shell React de
deux manières : tout tool classique dépourvu d'écran React natif est rendu comme une **zone
autonome** et affiché dans le shell via une iframe, et le menu de gauche affiché par le shell est
construit à partir de cette même config d'interface, filtrée par droits (cf. §6).

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
Les écrans React de la v6 n'y changent rien : une brick React n'est que de la présentation — chaque
action qu'elle déclenche rappelle ces **mêmes services côté serveur** via des endpoints
`react-api` (cf. §6).

## 5. Les événements

Les modules se branchent sur le cycle de vie de la requête dans `Module::onBootstrap()` et via des
listeners sur le **shared event manager**. Le comportement cœur (authentification, vérification
des droits, messages flash, cache…) est câblé ainsi, et vous pouvez publier/souscrire à des
événements Melis personnalisés — p. ex. `melis_core_auth_login_ok` après une connexion réussie.

## 6. Le backoffice React (v6)

La v6 conserve le framework et les modules mais **remplace l'UI du backoffice** par une
application React monopage (SPA) servie à **`/melis-react`** (l'UI classique `/melis` est toujours
là en dessous). Deux idées suffisent à se la représenter :

- **Bricks** — un tool React natif. Un module livre un `public/ui-react/brick.manifest.json` et un
  bundle compilé ; le shell **découvre** les bricks de chaque module actif et les monte. Une brick
  apparaît **si et seulement si** son module est activé — la même règle de modularité que partout
  ailleurs.
- **Bascule New / Old** — la plupart des tools portent un interrupteur en haut à droite :
  **New** = l'écran React natif, **Old** = le tool classique rendu dans une iframe. Ainsi rien
  n'est perdu pendant que les modules sont progressivement réécrits en React.

Tout ce que le shell affiche autour de vos tools — qui vous êtes, le **menu de gauche** (déjà
filtré par vos droits), le sélecteur de langue, les tuiles du **dashboard**, la découverte des
tools — est assemblé au démarrage à partir d'un petit jeu d'**endpoints JSON** génériques sous
`/melis/react-api/…`, chacun renvoyant une charge utile `{ success, data, error? }`. Une
surcouche **Assistant IA** flottante et globale est disponible sur chaque écran.

![La surcouche Assistant IA React](/screenshots/react/melis-ai/melisai-footer-icon-generalassistant-deployed.png)
*L'Assistant IA flottant est disponible depuis chaque écran du backoffice React.*

Trois modules rendent cela possible, et aucun n'est un tool vers lequel on navigue :

- **MelisReactApi** — la colonne vertébrale de l'API JSON. Il ne dessine aucune UI ; il sert le
  jeu de démarrage (`/me`, `/menu`, `/langs`, `/assets`, `/react-modules`) plus les endpoints du
  dashboard et des droits, et héberge le moteur de **capabilities** (voir ci-dessous). Les
  endpoints de données *propres* à un tool vivent dans le module de ce tool, pas ici.
- **MelisReactOverride** — la plomberie qui (a) sert le shell React pour `/melis-react` et ses
  liens profonds, et (b) rend tout tool classique comme une page autonome
  (`/melis/react-tool-page?key=<melisKey>`) pour que la bascule **Old** et tout tool pas encore
  réécrit fonctionnent toujours dans le shell.
- Chaque **module fonctionnel** (p. ex. `MelisCms`) livre ses propres bricks, routes `react-api`
  et capabilities.

Les **capabilities** sont les « droits avancés » à granularité fine de la v6 : *à l'intérieur*
d'un tool déjà autorisé, des actions individuelles (`list`, `create`, `edit`, `delete`, ou un
onglet imbriqué) peuvent être refusées par utilisateur/rôle. Elles sont en **autorisation par
défaut** et **subordonnées** au contrôle d'accès classique au tool (`MelisCoreRights::canAccess`,
inchangé) — un tool sans déclaration de capability conserve le CRUD complet. Un module déclare les
capabilities existant pour la `melisKey` de son tool dans `config/react.capabilities.php` ; ses
contrôleurs verrouillent chaque action avec `denyUnlessCan($cap)`.

> Règle empirique : si le shell React l'affiche (menu, en-tête, dashboard, liste des tools,
> matrice des droits) mais que ce n'est pas l'écran propre d'un tool spécifique, cela provient d'un
> endpoint MelisReactApi. Si vous regardez un tool classique de style Bootstrap dans
> `/melis-react`, vous voyez MelisReactOverride rendre ce tool dans une iframe.

Pour le contrat complet et les rouages internes, voir les références des modules :
[MelisReactApi](/fr/reference/modules/melis-react-api) et
[MelisReactOverride](/fr/reference/modules/melis-react-override) ; pour un exemple concret de
module multi-bricks, [MelisCms](/fr/reference/modules/melis-cms).

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
| Shell React (SPA)    | `vendor/melisplatform/melis-core/public/ui-react/` |
| API React + capabilities | `vendor/melisplatform/melis-react-api/` |
| Plomberie shell & iframe React | `vendor/melisplatform/melis-react-override/` |

Suite : assemblez le tout en [créant votre premier tool](./create-a-tool).
