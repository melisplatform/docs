# Architecture en profondeur

Cette page suit une requête **de bout en bout** et nomme les vraies classes, événements et services
impliqués. Elle complète [Concepts](./concepts) : lisez celui-ci pour le vocabulaire, lisez
celui-là pour comprendre la *mécanique*. C'est aussi la page à lire si vous (ou une IA) avez besoin
d'un modèle mental complet du fonctionnement de Melis.

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

Enfin, le fichier plateforme `config/autoload/platforms/<MELIS_PLATFORM>.php` injecte la
**connexion base de données** et les réglages plateforme dans la config fusionnée.

## Cycle de requête backoffice

Pour une URL `/melis…`, MelisCore pilote le flux. Les hooks clés sont attachés dans
`MelisCore\Module::onBootstrap()` :

1. **Routing** — la route `melis-backoffice` (et ses enfants : `login`, `authenticate`, `logout`,
   `zoneview`…) matche.
2. **`MvcEvent::EVENT_ROUTE` → contrôle d'identité** — `Module::checkIdentity()` s'exécute. Si la
   route matchée n'est pas exclue (`login`, `authenticate`, `change-language`…) et que l'utilisateur
   n'est pas authentifié, il **redirige vers `/melis/login`** (ou renvoie 404 pour du non-GET).
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

## Authentification & droits

La **connexion** est gérée par `MelisCoreAuth` (`MelisCoreAuthService`), un service d'authentification
Laminas sur la table `melis_core_user` (`usr_login` / `usr_password`, bcrypt via `password_hash`).
L'identité authentifiée — incluant les `usr_rights` de l'utilisateur — est stockée en session.

Les **droits** gardent le backoffice. `MelisCoreRights` (`MelisCoreRightsService`) lit les
`usr_rights` — une **liste blanche XML** — pour décider ce qui est visible et dispatchable :

- Les **sections du menu gauche** qu'un utilisateur voit sont les nœuds `*_toolstree_section`
  listés dans ses droits (`isAccessible()`) ; un **XML de droits vide = accès total**.
- Un tool dont l'utilisateur n'a pas les droits affiche *« You don't have access to this tool »*.
- Les droits vivent sur `melis_core_user.usr_rights` ; pour les utilisateurs à rôle, ils peuvent
  venir du rôle (`melis_core_user_role`). `MelisCoreCheckUserRightsListener` les rafraîchit
  périodiquement et déconnecte l'utilisateur si `usr_status` devient inactif.

::: tip Accorder un nouveau tool
Après avoir ajouté un tool, accordez l'accès via la **Gestion des accès** du backoffice, ou injectez
la section dans le XML des droits via une migration — voir `flyway/sql/V3__add_melisai_rights.sql`.
:::

## Cycle de requête front office

Pour une URL publique, **MelisFront** + **MelisEngine** rendent une page CMS :

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
dossiers `cache/*` concernés — voir [Dépannage](./troubleshooting).

## Événements

Melis est fortement **événementiel**. Les modules attachent des listeners dans
`Module::onBootstrap()` (et via le shared event manager) au cycle MVC (`EVENT_ROUTE`,
`EVENT_DISPATCH`, `EVENT_RENDER`, `EVENT_FINISH`) et à des **événements métier Melis** (p. ex.
`melis_core_auth_login_ok`, événements de sauvegarde de page). Les services métier étendent
`MelisGeneralService`, qui ajoute `sendEvent()` pour que n'importe quel service publie des
événements auxquels d'autres modules souscrivent. C'est le mécanisme d'extension principal et
découplé — préférez un listener plutôt que patcher un autre module.

## La requête, en une image

```
public/index.php
  → application.config.php  (MelisModuleManager assemble modules + config DB plateforme)
  → exécution MVC Laminas
     ├── /melis…   → auth (checkIdentity) → droits → zones PluginViewController (forwards)
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
