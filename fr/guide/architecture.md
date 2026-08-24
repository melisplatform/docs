# Architecture en profondeur

Cette page suit une requête **de bout en bout** et nomme les vraies classes, événements et services
impliqués. Elle complète [Concepts](./concepts) : lisez celui-ci d'abord pour le vocabulaire, lisez
celle-ci pour comprendre la *mécanique*. C'est aussi la page à lire si vous (ou une IA) avez besoin
d'un modèle mental complet du fonctionnement de Melis.

Melis **v6** conserve le même framework, les mêmes modules et le même cycle de requête que la v5 —
ce qui a changé, c'est l'**UI du backoffice**. Les tools classiques rendus côté serveur à `/melis`
sont toujours là, mais l'expérience par défaut est désormais une **application single-page React à
`/melis-react`** qui charge des tools React natifs (« bricks ») et retombe sur les tools classiques
dans une iframe. Les sections ci-dessous conservent toute la mécanique inchangée et ajoutent le shell
React là où il se place.

## Bootstrap

`public/index.php` charge l'autoloader Composer, fusionne `config/application.config.php` avec
`config/development.config.php` (si présent), puis exécute l'application MVC Laminas.

`config/application.config.php` construit dynamiquement la liste des modules :

```php
'modules' => array_merge(
    MelisCore\MelisModuleManager::getModuleComponents(), // composants framework d'abord
    MelisCore\MelisModuleManager::getModules()           // puis les modules Melis
),
'module_listener_options' => [
    'module_paths'      => ['./module', './module/MelisSites'],
    'config_glob_paths' => [
        realpath(__DIR__) . '/autoload/{{,*.}global,{,*.}local}.php',
        realpath(__DIR__) . '/autoload/platforms/' . getenv('MELIS_PLATFORM') . '.php',
    ],
],
```

`MelisCore\MelisModuleManager` (`vendor/melisplatform/melis-core/src/MelisModuleManager.php`)
assemble trois types de modules selon la requête :

- **Composants** — dépendances framework, déclarées par module dans `config/module.load.php`.
- **Modules** — les modules backoffice depuis `config/melis.module.load.php`.
- **Modules de site** — pour une URL front, le site sélectionné par `MELIS_MODULE`
  (depuis `module/MelisSites/<nom>` ou un site vendor comme `MelisDemoCms`).

Le backoffice React ajoute deux **modules d'infrastructure** à cette liste —
[`melis-react-api`](/fr/reference/modules/melis-react-api) (l'ossature de l'API JSON) et
[`melis-react-override`](/fr/reference/modules/melis-react-override) (la route SPA + le mécanisme
d'iframe pour les tools legacy). Les deux sont chargés via les `module_paths` de
`application.config.php` (ils ne sont pas autoloadés par Composer) et s'enregistrent eux-mêmes via
`StandardAutoloader`.

Enfin, le fichier plateforme `config/autoload/platforms/<MELIS_PLATFORM>.php` injecte la
**connexion base de données** et les réglages plateforme dans la config fusionnée.

## Cycle de requête backoffice

Il y a désormais **deux points d'entrée** vers le backoffice, tous deux pilotés par le routing et le
contrôle d'identité de MelisCore :

- **`/melis-react…`** — le shell React (l'UI par défaut). Une route regex sert un unique document
  HTML ; tout le reste est du JSON récupéré via `/melis/react-api/…` et des tools rendus sous forme
  de bricks ou d'iframes (voir plus bas).
- **`/melis…`** — le backoffice classique rendu côté serveur, toujours pleinement fonctionnel et
  utilisé comme cible d'iframe pour les tools legacy.

Pour une URL `/melis…`, MelisCore pilote le flux classique. Les hooks clés sont attachés dans
`MelisCore\Module::onBootstrap()` :

1. **Routing** — la route `melis-backoffice` (et ses enfants : `login`, `authenticate`, `logout`,
   `zoneview`, `react-tool-page`…) matche.
2. **`MvcEvent::EVENT_ROUTE` → contrôle d'identité** — `Module::checkIdentity()` s'exécute. Si la
   route matchée n'est pas dans la liste des exclusions (`login`, `authenticate`, `change-language`,
   la SPA React et ses endpoints de démarrage…) et que l'utilisateur n'est pas authentifié, il
   **redirige vers `/melis/login`** (ou renvoie 404 pour du non-GET).
3. **Session & langue** — le container de session `meliscore` est initialisé ; la locale
   (`melis-lang-locale`) pilote `Module::createTranslations()` qui charge
   `language/<locale>.{interface,forms,…}.php`.
4. **`EVENT_DISPATCH`** — le layout est fixé à `layout/layoutCore`, et les listeners cœur
   s'exécutent : `MelisCoreCheckUserRightsListener` (relit les droits périodiquement),
   `MelisCoreFlashMessengerListener`, `MelisCorePhpWarningListener`, etc.
5. **Rendu des zones** — l'UI backoffice est un arbre de **zones** ; `PluginViewController` résout
   le `forward` de chaque zone (module/controller/action) et la rend, assemblant le HTML final
   (voir [Concepts → zones & forwards](./concepts#_3-zones-forwards-comment-le-backoffice-s-affiche)).

```
GET /melis
  → route : melis-backoffice
  → EVENT_ROUTE : checkIdentity() → redirige vers /melis/login si non connecté
  → EVENT_DISPATCH : layout = layout/layoutCore ; listeners droits/flash/warning
  → PluginViewController rend les zones (header, menu gauche, centre, footer) via forwards
  → réponse
```

## Cycle de requête backoffice React

Pour une URL `/melis-react…`, le flux se répartit entre un chargement unique du shell et les appels
JSON qui suivent :

1. **Route SPA** — `MelisReactOverride\Controller\SpaController` sert le shell React `index.html`
   (buildé dans `melis-core/public/ui-react/`) pour `/melis-react` et chaque deep link en dessous
   (`/melis-react/news/5`, …). La route est **publique** — l'application React exécute son **propre
   écran de connexion** — et l'emporte sur le catch-all de MelisFront grâce à une route regex
   prioritaire.
2. **Fetches de démarrage** — le shell appelle les endpoints génériques de
   [`melis-react-api`](/fr/reference/modules/melis-react-api) :
   `GET /me` (utilisateur courant + capabilities), `GET /menu` (l'arbre de navigation filtré par les
   droits), `GET /langs` (langues du backoffice), `GET /assets` (CSS/JS pour les iframes de tools) et
   `GET /react-modules` + `/bricks-bundle.js` (découverte des bricks). Chaque réponse respecte le
   contrat `{ success, data, error? }`.
3. **Rendu des tools** — cliquer sur une entrée de menu ouvre une **brick** (un tool React natif) si
   son module en fournit une, sinon un **tool legacy dans une iframe** servi par
   `/melis/react-tool-page?key=<melisKey>` (voir [Bricks & le mécanisme d'iframe](#bricks-le-mecanisme-d-iframe)).
4. **Overlay Assistant IA** — un bouton de chat flottant rendu une seule fois à la racine du shell
   (depuis [`melis-ai`](/fr/reference/modules/melis-ai)) survit à la navigation et peut piloter le
   backoffice (ouvrir un tool, ouvrir une page) depuis la conversation. Voir le [guide IA](./ai).

```
GET /melis-react
  → SpaController sert ui-react/index.html (route publique)
  → démarrage du shell : GET /me, /menu, /langs, /assets, /react-modules (+ /bricks-bundle.js)
  → clic sur un tool → brick React, ou iframe → /melis/react-tool-page?key=<melisKey>
  → overlay Assistant IA monté à la racine du shell
```

## Bricks & le mécanisme d'iframe

Le shell React est **modulaire** : un tool apparaît **si et seulement si** son module est actif.

- **Découverte des bricks** — `GET /melis/react-api/react-modules` scanne les modules actifs à la
  recherche de `public/ui-react/brick.manifest.json` et renvoie leurs `BrickDef`s (`{ id, module,
  route, label, forwardKey, melisKey, subTabs, … }`) plus un unique `/bricks-bundle.js` concaténé.
  Chaque brick est une IIFE qui s'auto-enregistre sur `window.__MELIS_BRICK_COMPONENTS__` ; la
  signature `?v=<sig>` rend le bundle cacheable en toute sécurité pendant un an.
- **Bascule New / Old** — la plupart des bricks portent une bascule **New (React) / Old (iframe)**.
  *New* est l'écran React natif ; *Old* charge le tool classique via le mécanisme d'iframe ci-dessous,
  si bien que rien n'est jamais perdu durant la migration.
- **Iframe legacy** — le `PluginViewController::toolPageAction()` de
  [`melis-react-override`](/fr/reference/modules/melis-react-override) rend exactement une zone
  (résolue depuis `?key=<melisKey>`) comme **page HTML autonome** et la renvoie avec
  `X-Frame-Options: SAMEORIGIN`. Il force `X-Requested-With: XMLHttpRequest` pour que les zones
  `follow_regular_rendering:false` se rendent en mode AJAX, épingle l'id de session PHP tout au long
  du rendu, injecte les JS/CSS `ressources` propres au module du tool (le `bundle.js` du cœur ne
  transporte que les tools de MelisCore), et contourne une longue liste de bizarreries legacy afin
  que le tool à l'intérieur du frame ait exactement la même apparence et le même comportement qu'un
  accès direct à `/melis` (ses propres DataTables, modales, toasts gritter et validation par champ).

Le shell sert les assets plateforme à ces iframes via
`MelisReactOverride\Service\PlatformAssetsService::build()` — les mêmes CSS/JS que ceux chargés par
le `layoutCore.phtml` classique — de sorte qu'un tool legacy démarre à l'identique à l'intérieur du
shell React.

## Authentification & droits

La **connexion** est gérée par `MelisCoreAuth` (`MelisCoreAuthService`), un service d'authentification
Laminas sur la table `melis_core_user` (`usr_login` / `usr_password`, bcrypt via `password_hash`).
L'identité authentifiée — incluant les `usr_rights` de l'utilisateur — est stockée en session. Le
shell React pilote la **même** authentification (il rend son propre écran de connexion mais poste au
même service) ; `GET /me` renvoie l'identité une fois authentifié, `GET /langs` et la lecture du
branding du panneau de connexion sont les seuls endpoints publics avant connexion.

Les **droits** gardent le backoffice. `MelisCoreRights` (`MelisCoreRightsService`) lit les
`usr_rights` de l'utilisateur — une **liste blanche XML** — pour décider ce qui est visible et
dispatchable :

- Les **sections du menu gauche** qu'un utilisateur voit sont les nœuds `*_toolstree_section`
  listés dans ses droits (`isAccessible()`) ; un **XML de droits vide = accès total**. Dans le shell
  React, le même filtrage a lieu côté serveur dans `GET /menu`, qui n'émet que les nœuds auxquels
  l'utilisateur peut `canAccess`.
- Un tool dont l'utilisateur n'a pas les droits affiche *« You don't have access to this tool »*.
- Les droits vivent sur `melis_core_user.usr_rights` ; pour les utilisateurs à rôle, ils peuvent
  venir du rôle (`melis_core_user_role`). `MelisCoreCheckUserRightsListener` les rafraîchit
  périodiquement et déconnecte l'utilisateur si `usr_status` devient inactif.

**Droits avancés (capabilities).** Le backoffice React ajoute une couche plus fine *subordonnée au*
contrôle d'accès au tool : des **capabilities** par tool (`list` / `create` / `edit` / `delete`, ou
des onglets imbriqués). Les modules déclarent quelles capabilities existent via
`config/react.capabilities.php` ; le résolveur `MelisReactApi\Service\Capabilities` est en
**autorisation par défaut** — une capability n'est refusée que si elle est à la fois déclarée et
présente dans une section dédiée `<meliscore_tool_capabilities>` du XML des droits. Les contrôleurs
de tool gardent leurs actions avec `CapabilityGuardTrait::denyUnlessCan($cap)` (les admins passent
outre), et la même map d'autorisations arrive côté client dans `GET /me` pour masquer l'UI. Ceci vit
dans [`melis-react-api`](/fr/reference/modules/melis-react-api) ; la liste des refus s'édite dans
**Utilisateurs → Droits**.

::: tip Accorder un nouveau tool
Après avoir ajouté un tool, accordez l'accès via **Utilisateurs → Droits** dans le backoffice React
(sa matrice de droits avancés est alimentée par `GET /rights/capabilities`), ou injectez la section
dans le XML des droits via une migration — voir `flyway/sql/V3__add_melisai_rights.sql`.
:::

## Cycle de requête front office

Pour une URL publique, **MelisFront** + **MelisEngine** rendent une page CMS (inchangé en v6) :

1. **Routing** — `melis-front` matche `…/id/{idpage}`. Les URLs SEO (`/about-us`) sont résolues en
   id de page par `MelisFrontSEORouteListener` (il interroge la table page-SEO et enregistre une
   route dynamique au chargement des modules).
2. **Dispatch** — les listeners front sélectionnent le layout front et consultent le cache de page.
3. **Chargement de page** — `MelisEngine\Service\MelisPageService::getDatasPage($idPage, $type)`
   renvoie un `MelisPage` (données de l'arbre + template), caché sous `getDatasPage_{id}_{type}`.
4. **Rendu du template** — le contrôleur/action `ZF2` du template rend le `.phtml` du module de
   site ; les zones `MelisTag` et plugins `MelisDragDropZone` sont remplis depuis le contenu
   **publié**.

```
GET /about-us
  → MelisFrontSEORouteListener mappe /about-us → idpage=5
  → MelisFront\Controller\Index::index(idpage=5)
  → MelisPageService::getDatasPage(5, 'published')  (caché)
  → contrôleur/action ZF2 du template → .phtml du site → MelisTag / MelisDragDropZone
  → réponse
```

> La route regex prioritaire `/melis-react` l'emporte délibérément sur ce catch-all, si bien qu'un
> rechargement complet de page sur un deep link React résout vers la SPA plutôt que vers une
> « 404 page not found ».

## Cache

Melis cache agressivement via des caches filesystem sous `cache/` :

| Cache | Contient |
| --- | --- |
| `meliscore_platform_cache-*` | zones backoffice rendues / config plateforme |
| `meliscms_page-*`, `melisfront_pages_file_cache-*` | pages CMS rendues |
| `cache/config/` | config Laminas fusionnée (seulement si `config_cache_enabled`) |
| `datasource-*`, `melistoolcreator-*` | caches spécifiques aux modules |

`MelisCoreCacheSystemService` est l'API de cache (`getCacheByKey`/`setCacheByKey`/
`deleteCacheByPrefix`). Les caches sont invalidés sur des événements clés (changements de modules,
publication de page, mises à jour de droits) et peuvent être vidés manuellement en supprimant les
dossiers `cache/*` concernés — voir [Dépannage](./troubleshooting). La couche React ajoute ses
propres caches peu coûteux : le bundle de découverte est servi immutable avec une signature de
contenu, et `PlatformAssetsService` mémoïse les CSS/JS de modules concaténés (en régénérant
`etc/bundles/` si le tool Modules l'a effacé).

## Événements

Melis est fortement **événementiel**. Les modules attachent des listeners dans
`Module::onBootstrap()` (et via le shared event manager) au cycle MVC (`EVENT_ROUTE`,
`EVENT_DISPATCH`, `EVENT_RENDER`, `EVENT_FINISH`) et à des **événements métier Melis** (p. ex.
`melis_core_auth_login_ok`, événements de sauvegarde de page). Les services métier étendent
`MelisGeneralService`, qui ajoute `sendEvent()` pour que n'importe quel service publie des
événements auxquels d'autres modules souscrivent. C'est le mécanisme d'extension principal et
découplé — préférez un listener plutôt que patcher un autre module.

La couche React suit la même philosophie « accumuler, ne pas surcharger » : au lieu de coder en dur
les bizarreries propres à chaque tool, `melis-react-override` expose un hook `toolpage_extensions`
que n'importe quel module peut implémenter pour ajuster le HTML ou les assets d'un tool legacy à
l'intérieur du frame (utilisé, par exemple, par
[`melis-ai-community-extensions`](/fr/reference/modules/melis-ai-community-extensions)).

## La requête, en une image

```
public/index.php
  → application.config.php  (MelisModuleManager assemble modules + config DB plateforme)
  → exécution MVC Laminas
     ├── /melis-react → SpaController sert le shell React (public)
     │                    → JSON de démarrage : /me /menu /langs /assets /react-modules
     │                    → brick, ou iframe → /melis/react-tool-page?key=<melisKey>
     ├── /melis…      → auth (checkIdentity) → droits → zones PluginViewController (forwards)
     └── URL publique → route MelisFront (id/SEO) → chargement page MelisEngine → template site
  → cache à chaque étape coûteuse (MelisCoreCacheSystemService)
  → réponse
```

## Fichiers clés

| Sujet | Chemin |
| --- | --- |
| Config app / bootstrap | `config/application.config.php` |
| Assemblage des modules | `vendor/melisplatform/melis-core/src/MelisModuleManager.php` |
| Bootstrap / listeners cœur | `vendor/melisplatform/melis-core/src/Module.php` |
| Auth | `vendor/melisplatform/melis-core/src/Service/MelisCoreAuthService.php` |
| Droits | `vendor/melisplatform/melis-core/src/Service/MelisCoreRightsService.php` |
| Arbre de config | `vendor/melisplatform/melis-core/src/Service/MelisCoreConfigService.php` |
| Rendu des zones | `vendor/melisplatform/melis-core/src/Controller/PluginViewController.php` |
| API de cache | `vendor/melisplatform/melis-core/src/Service/MelisCoreCacheSystemService.php` |
| Routing/SEO front | `vendor/melisplatform/melis-front/src/Listener/MelisFrontSEORouteListener.php` |
| Service de page | `vendor/melisplatform/melis-engine/src/Service/MelisPageService.php` |
| API JSON React | `vendor/melisplatform/melis-react-api/src/Controller/MelisReactApiController.php` |
| Résolveur de capabilities | `vendor/melisplatform/melis-react-api/src/Service/Capabilities.php` |
| SPA + iframe legacy | `vendor/melisplatform/melis-react-override/src/Controller/` |
| Shell React (source SPA) | `vendor/melisplatform/melis-core/ui-react/` |
