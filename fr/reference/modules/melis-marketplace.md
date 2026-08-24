# MelisMarketPlace

> Boutique de modules intégrée au back-office pour découvrir, télécharger, mettre à jour et
> supprimer des modules Melis Platform, désormais servie sous forme de catalogue React natif.
> Paquet `melisplatform/melis-marketplace`.

## Présentation

MelisMarketPlace est la boutique de modules du back-office : elle liste tous les paquets publiés sur
le serveur Melis Packagist, compare chaque version installée à la dernière version publiée, et permet
à un administrateur de télécharger, mettre à jour ou supprimer des modules — et d'installer des
produits sites complets — sans quitter le back-office. Elle appelle `MelisComposerService`
(melis-composerdeploy) pour les opérations Composer réelles et lit/bascule l'état des modules via
`MelisAssetManagerModulesService` (melis-asset-manager).

Six modules fondamentaux — **MelisCore, MelisEngine, MelisFront, MelisAssetManager,
MelisComposerDeploy, MelisDbDeploy** — sont listés comme exceptions (exemptés) et ne sont jamais
proposés au téléchargement, à la mise à jour ou à la suppression depuis la boutique.

Dans le back-office React v6 (`/melis-react`), l'outil est livré sous forme de **brique full-React
native** : la liste du catalogue et le détail par paquet sont écrits en React et lisent une
`react-api` JSON propre au module. La mécanique d'installation / mise à jour / suppression (Composer,
dbdeploy, activation/désactivation) est inchangée et s'exécute toujours côté serveur via le
contrôleur legacy.

## Activation

Ajoutez à `config/melis.module.load.php` :

```php
return [
    'MelisMarketPlace',
];
```

Nécessite `melisplatform/melis-core: ^5.1` et PHP `^8.1|^8.3`. Le module enregistre un flag
`dbdeploy: true` afin que tout delta de base de données livré soit appliqué au premier chargement. La
brique React n'apparaît que lorsque `MelisMarketPlace` est présent dans
`config/melis.module.load.php`.

L'endpoint Packagist distant est configuré dans `config/app.interface.php` sous
`melismarketplace_toolstree_section/datas/melis_packagist_server`
(par défaut `http://marketplace.melisplatform.com/melis-packagist`).

## Back-office React

**Où.** Barre latérale gauche → **Market Place** (icône de panier) ; s'ouvre dans un onglet supérieur
nommé *Market Place*. Le `route` du manifeste est `/melis-marketplace` et le `forwardKey`
`MelisMarketPlace/MelisMarketPlace` associe le nœud de menu legacy à celui-ci.

**Catalogue (liste).** Une grille de cartes de modules avec recherche (image de couverture, logo du
groupe, titre, puce de version, nombre de téléchargements, et badges Installé / Mise à jour disponible
ou un bouton Télécharger). Au-dessus de la grille se trouvent trois **cartes KPI** (Paquets / Installés
/ Mises à jour disponibles), une zone de recherche, un sélecteur de tri (Téléchargements / Date d'ajout
/ Nom), un bouton *Réinitialiser les filtres*, le **filtre par groupe** (Tous les groupes · Core · Cms
· Marketing · Commerce · Sites), une bascule **Bundles**, un bouton de rafraîchissement (↻) et la
bascule **Nouveau / Ancien**. La grille se charge au fur et à mesure du défilement (défilement infini).
Une barre latérale droite affiche « Vous voulez référencer votre module ? » et « Paquets les plus
téléchargés ».

![Catalogue React Market Place : cartes KPI, recherche, tri, filtres par groupe et grille de cartes de modules avec une barre latérale « Paquets les plus téléchargés »](/screenshots/react/melis-marketplace/melismarketplace-tool-list.png)

**Vue produit (détail).** Cliquer sur une carte ouvre un détail full-React (sans rechargement de page)
: une bannière hero (logo du groupe, titre, badges de statut, boutons d'action), une galerie d'images
(carrousel + lightbox plein écran), la description, et un panneau *Informations complémentaires*
(dernière version, version actuelle si installée, GitHub, Packagist, nom du paquet, téléchargements).
Un bouton **← retour** ramène à la liste, qui reste montée afin que la recherche / les filtres / le
défilement soient préservés. Il n'y a **pas de sous-onglets hôte** — la transition liste ⇄ détail est
un état interne, donc une brique n'utilise qu'un seul onglet hôte.

![Vue produit React d'un module : bannière hero avec badges de statut et boutons d'action, galerie d'images, description et panneau Informations complémentaires](/screenshots/react/melis-marketplace/melismarketplace-tool-module-detail.png)

**Bascule Nouveau / Ancien.** La liste peut basculer entre l'interface React (*Nouveau*, par défaut) et
l'outil classique rendu dans une iframe (*Ancien*,
`/melis/react-tool-page?key=melis_market_place_tool_display`). Sur les fenêtres étroites, la bascule
devient uniquement iconographique.

**Boutons d'action** dépendant de l'état du paquet et des capacités de l'appelant :

| Bouton | Affiché quand | Effet |
| --- | --- | --- |
| Télécharger | module non installé | récupération Composer → dbdeploy → activation |
| Mettre à jour | installé et `need_update` | même geste Composer sur une version en retard |
| Supprimer | installé, non exempté | désinstallation (bloquée si d'autres modules en dépendent) |
| Privé | paquet privé/verrouillé | panneau de contact ; doit être acheté |

Chaque action ouvre une modale **Gérer** avec une console de progression en direct diffusant la sortie
Composer / dbdeploy, puis propose *Activer le module* / *Recharger*. Si le serveur Packagist est
injoignable (`marketAccessible = false`), l'interface React désactive la navigation mais conserve la
coquille active.

## Brique React

Brique full-React native construite avec Vite (IIFE ; React / ReactDOM / react-router-dom externalisés
vers les globales de l'hôte). Sources dans `ui-react/src/`, compilées vers `public/ui-react/brick.js`
à côté de `brick.manifest.json`.

| Champ du manifeste | Valeur |
| --- | --- |
| `id` | `marketplace` (doit correspondre à l'id enregistré dans `brick.tsx`) |
| `route` | `/melis-marketplace` |
| `label` | `Market Place` |
| `forwardKey` | `MelisMarketPlace/MelisMarketPlace` |
| `melisKey` | `melis_market_place_tool_display` |
| `entry` | `brick.js` |
| `persistent` | `true` |
| `subTabs` | *absent* — liste ⇄ détail est un état interne `openId` |

Comme la section de menu Market Place est un nœud directement cliquable / `is_parent_tool`, la clé
porteuse de droits et la clé de zone du manifeste sont **identiques**
(`melis_market_place_tool_display`). La brique ne peut pas importer de modules hôtes ; elle utilise donc
des styles inline + des variables CSS de thème et un dictionnaire `{fr,en}` intégré au fichier, piloté
par la langue de l'hôte (`melis-ui-lang` / `melis-ui-locale` dans `localStorage`). Les cartes et la
galerie demandent d'abord les captures d'écran React avec l'URL d'image legacy dans `data-legacy`, en
repli en cas d'erreur.

Fichiers clés (`ui-react/src/`) : `brick.tsx` (enregistre `id: 'marketplace'`), `MarketPlacePage.tsx`
(liste + détail + modale de gestion), `ViewToggle.tsx` (bascule Nouveau/Ancien), `marketplace-api.ts`
(client d'API en lecture seule), et `shared/useCaps.ts` / `shared/useDebounce.ts` /
`shared/useIsNarrow.ts`.

## API React

Les routes en **lecture seule** du catalogue sont déclarées dans `config/module.config.php`, imbriquées
sous la route `application-MelisMarketPlace` (base `/melis/MelisMarketPlace/react-api`) — **propres au
module**, et non sous le nœud partagé `melis-react-api`. Contrôleur :
`MelisMarketPlace\Controller\MelisMarketPlaceReactApiController` (alias invokable
`MelisMarketPlace\Controller\MelisMarketPlaceReactApi`). Contrat `{ success, data, error }` ; chaque
requête envoie `X-Requested-With: XMLHttpRequest` et `credentials: 'include'`.

| Méthode & URL | Action | Objectif |
| --- | --- | --- |
| `GET …/react-api/packages` | `packages` | Liste (`page`, `limit`, `search`, `group`, `orderBy`, `order`, `bundle`) → `{items, page, pageCount, limit, marketAccessible}` |
| `GET …/react-api/packages/:id` | `get` | Détail d'un paquet (`images`, `currentVersion`, `isExempted`, versionStatus…) |
| `GET …/react-api/groups` | `groups` | Groupes de paquets → `{groups, marketAccessible}` |
| `GET …/react-api/stats` | `stats` | KPI `{total, installed, needUpdate, marketAccessible}` |
| `GET …/react-api/status` | `status` | Statut de version par module (`need_update` / `up_to_date` / `in_advance`) |

Chaque action de lecture est protégée par `denyUnlessAccess()` — authentification
(`MelisCoreAuth::hasIdentity`) **et** `MelisCoreRights::canAccess('melis_market_place_tool_display')`,
renvoyant **401 / 403** — de sorte que l'API JSON n'est pas une porte dérobée. Le contrôleur réutilise
`MelisMarketPlaceService` (`compareLocalVersionFromRepo`, préchargement de la dernière version) et
`MelisAssetManagerModulesService` (versions installées / liste de modules) et lit les endpoints JSON de
Packagist, exactement comme l'outil legacy.

> **Les actions mutatrices n'ont pas de route react-api.** Télécharger / Mettre à jour / Supprimer sont
> exécutées nativement par la `ManageModal`, qui rejoue l'orchestration JS legacy en appelant
> directement le contrôleur **legacy** du module (`/melis/MelisMarketPlace/MelisMarketPlace/…`) :
> `melisMarketPlaceProductDo` (console diffusée en continu), `reDumpAutoload`, `execDbDeploy`,
> `plugModule` / `unplugModule`, `executeComposerScripts`, `getSetupModuleForm`, `activateModule`,
> `isPackageDirectoryRemovable`, `changePackageDirectoryPermission`, `getModuleTables`, `exportTables`,
> plus `/melis/MelisCore/Modules/getDependents` pour la vérification des dépendances à la suppression.

## Capacités

Déclarées dans `config/react.capabilities.php`, fusionnées sous `melisReactToolCapabilities` par
`MelisMarketPlace\Module::getConfig()`. Indexées sur la même melisKey utilisée par le manifeste et la
garde d'accès (`melis_market_place_tool_display`), puisque la section est directement cliquable :

```
melis_market_place_tool_display
└─ actions: list · download · remove
```

`list` = parcourir la grille ; `download` = la récupération Composer qui à la fois installe
(Télécharger) et met à jour (Mettre à jour) ; `remove` = désinstaller. Il s'agit d'un **contrôle
réservé à React** (autorisé par défaut, déclaratif) : le contrôleur applique uniquement l'**accès**
(`denyUnlessAccess`), il n'appelle pas `denyUnlessCan`. Dans React, la brique les lit via
`useCaps('melis_market_place_tool_display')` — `can('list')` conditionne la grille, `can('download')`
les boutons Télécharger / Mettre à jour, `can('remove')` le bouton Supprimer (également masqué pour les
modules exemptés).

## Services principaux

| Alias de service | Rôle |
| --- | --- |
| `MelisMarketPlaceService` | Comparaison de versions, activation/désactivation, et dispatch du formulaire de configuration post-installation par module. |
| `MelisMarketPlaceSiteService` | Crée un site web complet à partir d'un paquet `melisplatform-site`. |

### `MelisMarketPlaceService`

Étend `MelisGeneralService`.

```php
$mp = $serviceManager->get('MelisMarketPlaceService');

// Compare installed vs latest — returns one of the constants below.
$status = $mp->compareLocalVersionFromRepo('MelisCmsSlider', 'v5.1.3');
// MelisMarketPlaceService::NEED_UPDATE  (-1)
// MelisMarketPlaceService::UP_TO_DATE   (1)
// MelisMarketPlaceService::IN_ADVANCE   (2)  — running a dev-… build

// Toggle a module on/off (rewrites the active-module loader via asset-manager).
$mp->plugModule('MelisCmsSlider');
$mp->unplugModule('MelisCmsSlider');
```

`compareLocalVersionFromRepo()` déclenche la paire d'événements
`melismarketplace_compare_local_version_from_repo_start` / `…_end` afin que des listeners puissent
remplacer le statut calculé.

**Convention de configuration post-installation par module.** Un module peut embarquer un
`MelisSetupPostDownloadController` et/ou un `MelisSetupPostUpdateController` dans son propre espace de
noms `Controller\`, exposant `$showOnMarketplacePostSetup = true` et les actions `getFormAction`,
`validateFormAction`, `submitAction`. MarketPlace y délègue pour afficher et traiter le formulaire de
configuration.

### `MelisMarketPlaceSiteService`

Étend `MelisGeneralService`. Crée un site web complet à partir d'un paquet `melisplatform-site` : crée
les lignes `melis_cms_site` / accueil / langues, alloue de nouveaux intervalles d'identifiants de page,
de plateforme et de template, et crée les tables CMS du module via `Support\MelisMarketPlaceCmsTables` /
`Support\MelisMarketPlaceSiteInstall`.

```php
$site = $serviceManager->get('MelisMarketPlaceSiteService');
$site->marketplaceInstallSite($request);   // reads POST: name, scheme, domain, module, action
```

Exceptions typées (dans `src/Exception/`) : `EmptySiteException`,
`PlatformIdMaxRangeReachedException`, `TemplateIdMaxRangeReachedException`,
`ArrayKeyNotFoundException`, `FileNotFoundException`.

## Outil legacy (vue Ancien)

L'outil classique reste disponible derrière la bascule Nouveau/Ancien et détient toujours le flux
mutateur. `melisMarketPlaceProductDoAction()` est le point d'entrée unique pour les actions du
catalogue : il déclenche `melis_marketplace_product_do_start`, bascule sur l'action
(`MelisComposerService::DOWNLOAD / UPDATE / REMOVE`), puis déclenche `melis_marketplace_product_do_finish`
pour piloter les retours flash-messenger. Avant une suppression, il parcourt les dépendances du module
cible, celles de tous les autres modules actifs, ainsi que le bloc `require` du `composer.json` racine
du projet, afin d'éviter la suppression d'une dépendance partagée.

Deux vérifications conditionnent l'utilisation de la boutique (toutes deux dans
`MelisMarketPlaceController`) :

- `isMarketplaceAccessible()` — indique si le serveur Packagist est joignable et si la fonctionnalité
  est activée.
- `allowUpdate()` — lit `melis_core_platform.plf_update_marketplace` pour la plateforme courante
  (variable d'environnement `MELIS_PLATFORM`) ; une plateforme avec `plf_update_marketplace = 0` peut
  consulter la boutique mais pas télécharger ni mettre à jour.

`MelisSetupController` gère la route autonome `/MelisMarketPlace/setup` (configuration par module en
dehors de l'arborescence d'interface du back-office).

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
| Routes / services / react-api / contrôleurs | `vendor/melisplatform/melis-marketplace/config/module.config.php` |
| Capacités React | `vendor/melisplatform/melis-marketplace/config/react.capabilities.php` |
| Arbre d'outils, icône d'en-tête, config Packagist | `vendor/melisplatform/melis-marketplace/config/app.interface.php` |
| Contrôleur d'API React | `vendor/melisplatform/melis-marketplace/src/Controller/MelisMarketPlaceReactApiController.php` |
| Contrôleur principal (legacy) | `vendor/melisplatform/melis-marketplace/src/Controller/MelisMarketPlaceController.php` |
| Service d'installation/mise à jour/activation | `vendor/melisplatform/melis-marketplace/src/Service/MelisMarketPlaceService.php` |
| Service d'installation de site | `vendor/melisplatform/melis-marketplace/src/Service/MelisMarketPlaceSiteService.php` |
| Sources de la brique React | `vendor/melisplatform/melis-marketplace/ui-react/src/` |
| Brique compilée + manifeste | `vendor/melisplatform/melis-marketplace/public/ui-react/` |
| Exceptions | `vendor/melisplatform/melis-marketplace/src/Exception/` |

Voir aussi : [melis-composerdeploy](/fr/reference/modules/melis-composerdeploy) ·
[melis-asset-manager](/fr/reference/modules/melis-asset-manager) ·
[melis-dbdeploy](/fr/reference/modules/melis-dbdeploy) ·
[melis-core](/fr/reference/modules/melis-core)
