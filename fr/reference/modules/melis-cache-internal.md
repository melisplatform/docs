# MelisCacheInternal

> Cache HTTP pleine-page pour le front-office du CMS, avec mise en cache partielle (par zone) et exclusions par page.
> Package `melisplatform/melis-cache-internal`.

## Présentation

`MelisCacheInternal` est une couche de performance qui s'intercale devant le pipeline de rendu de MelisFront. Il
stocke le HTML entièrement rendu (sous forme de réponse HTTP sérialisée) d'une page publiée et le sert lors des
visites suivantes, court-circuitant ainsi l'intégralité du rendu. Les plugins individuels d'une page peuvent être
configurés pour se rafraîchir selon un TTL plus court (mise en cache partielle/par zone) tandis que le reste de la
page demeure en cache. Les pages sont automatiquement invalidées lors d'une publication, dépublication ou
suppression, et un journal d'audit des vidages manuels du cache est conservé pendant trois mois. Ce module est
distinct du cache objet clé/valeur général de MelisEngine — il s'agit spécifiquement d'un cache HTTP pleine-page.

## Activation

Ajouter dans `config/melis.module.load.php` :

```php
return [
    'MelisCacheInternal',
];
```

Nécessite `melisplatform/melis-cms`. Le module inclut des migrations de base de données (`dbdeploy: true`) qui
doivent être appliquées lors de la première installation. Dans le back-office v6, l'outil n'apparaît que lorsque
le module est activé — le hôte React le découvre via son `brick.manifest.json` (voir [Back-office React](#back-office-react)).

## Services principaux

Enregistrés sous `service_manager` dans `config/module.config.php`. À résoudre via `$sm->get('<alias>')`.

| Alias de service | Rôle |
| --- | --- |
| `MelisCacheInternalService` | Opérations de cache pleine-page : `getCacheConfig()`, `getPageCacheByPageIdAndType($pageId, $uri, $methodType)`, `getPageCacheByUrl()`, `saveItem()`, `deleteCacheByPageId()`, `deleteCacheByUrl()`, `deleteCacheByPageIdOrByUrl()`, `deleteAllCache()`, `getMelisCacheSize()`, `hasCache()`. Déclenche les événements `melis_cache_internal_*_start`/`_end`. |
| `PartialCachingService` | Gestion du cache partiel/par zone : `getLists()`, `savePartialCaching()`, `deletePartialCaching()`, `getPartialCachingByCode()`, `searchPartialCachingByCode()`, et `processedZoneCaching($uri, $response, $pageId, $type)` — le moteur de rafraîchissement de zone qui re-rend uniquement les zones expirées lors d'un hit de cache. |

Le back-office React réutilise ces mêmes services et tables, de sorte que le chemin React reproduit exactement
le comportement historique (la configuration est un upsert singleton, les exclusions sont remplacées en masse,
`deleteCacheByUrl` gère le joker/REGEXP `*`).

## Mécanisme du cycle de requête

Les listeners sont attachés par mode de rendu dans `Module.php` :

| Listener | Événement | Rôle |
| --- | --- | --- |
| `MelisCacheInternalPageGetCacheListener` | `MvcEvent::EVENT_DISPATCH` (priorité 10) | **Servir** — lors d'un hit de cache, retourne la réponse stockée et court-circuite le rendu (ajoute l'en-tête `Melis-Cache: Hit`). |
| `MelisCacheInternalPageSaveCacheListener` | `MvcEvent::EVENT_FINISH` (priorité -1001) | **Stocker** — après le rendu, sauvegarde une réponse 200 en cache. |
| `MelisCacheInternalViewResultListener` | `melisengine_melistemplating_view_result_plugin_end` | Encapsule la sortie de chaque plugin avec les métadonnées de cache partiel (`data-pcache-code`, `data-pcache-gendate`, nom/id/dbkey du plugin). |
| `MelisCacheInternalCmsPageListener` | `meliscms_page_publish_end` / `…_unpublish_end` / `…_delete_end` | **Invalider** le cache de la page et persister la configuration des plugins partiels dans la page. |
| `MelisCacheInternalDeleteCacheListener` | `melis_cache_delete_cache` | Invalider à la demande par `pageId` ou `pageUrl`. |
| `MelisCacheInternalSaveEditionSessionListener` | `meliscms_page_savesession_plugin_start` | Stocker la configuration de cache partiel d'un plugin en session pour la publication. |
| `MelisCacheInternalGetPluginParametersListener` | `melistemplating_plugin_update_parameters` | Injecter les paramètres de cache partiel dans le formulaire d'édition back-office d'un plugin. |
| `MelisCacheInternalPartialCachingFormConfigListener` | `ModuleEvent::EVENT_LOAD_MODULES_POST` | Ajouter l'onglet de formulaire de cache partiel à la modale de chaque plugin front. |
| `MelisCacheInternalFlashMessengerListener` | `meliscacheinternal_save_cache_end` | Flash-messenger et journalisation d'activité. |

**Clé de cache** = `id de page + URL normalisée + méthode de requête` (1 = GET, 2 = POST). L'URL normalisée signifie
que les paramètres d'URL listés dans `melis_cache_url_parameters` sont supprimés avant la construction de la clé,
de sorte que les paramètres de suivi tels que `utm_source` ne fragmentent pas le cache. La valeur mise en cache
(`mc_cache_content`) est une réponse HTTP sérialisée (corps + en-têtes), et non un simple blob HTML brut. Tous les
appareils partagent la même réponse mise en cache (une mise en page responsive est supposée).

## Cache partiel (par zone)

Une page entièrement mise en cache peut maintenir des plugins individuels à jour selon un TTL plus court :

- `MelisCacheInternalViewResultListener` encapsule la sortie de chaque plugin avec les métadonnées `data-pcache-*`
  (code de cache et date de génération) au moment du rendu.
- Lors d'un **hit** de cache, `PartialCachingService::processedZoneCaching()` analyse ces marqueurs et, pour
  chaque zone dont le TTL a expiré, re-rend uniquement cette zone. Le type `PLUGIN` re-rend le plugin de
  templating ; le type `MANUAL` transfère vers un `module/controller/action` configuré.
- Un **code de cache partiel** (`melis_cache_partial_codes`) définit le type de zone, le code, le TTL
  (`mcpc_time`) et la cible MANUAL.
- Une configuration de **plugin principal** (`melis_cache_partial_general_site_plugins`) constitue une base
  applicable à l'ensemble du site qui se propage à toutes les pages ; les lignes `_exclusion` excluent un plugin
  du cache sur une page donnée.

## Back-office React

En v6, l'outil est livré sous forme de **brick full-React native** — un unique outil du menu gauche (**Melis
Cache**) dont les écrans sont des **onglets internes à l'outil**, et non des sous-onglets de l'hôte. On le trouve
sous **Menu latéral → MelisCms → Melis Cache** (`fa fa-bookmark`), monté à `/melis-cms/cache-internal`. L'en-tête
porte le sous-titre *« Platform cache management »*, un bouton de **rafraîchissement** qui suit l'onglet actif, un
bouton **Save** global, et une bascule **New / Old** : *New* correspond à l'interface React (par défaut) ; *Old*
affiche l'outil classique dans une iframe persistante (`/melis/react-tool-page?key=MelisCacheInternal_tool`).

Les quatre onglets :

| Onglet | Contenu |
| --- | --- |
| **Properties** | Taille totale du cache en base, la bascule *Activate the cache system*, le *cache time in seconds* (TTL), les cases de type de requête GET/POST, et l'arborescence d'exclusion des pages (bascule GET/POST par page). Persisté par le **Save** global de l'en-tête. |
| **Partial Caching** | Liste CRUD des codes de cache partiel avec cartes KPI (Total / Manual / Plugin), recherche, gestionnaire de colonnes, Export et **+ Add**. Colonnes : Id, Partial Caching Code, Type, Module, Controller, Action, Cache lifetime in seconds, Methods. |
| **URL Parameters** | Liste CRUD des noms de paramètres de requête ignorés lors de la construction de la clé de cache (KPI Total, recherche, Export, **+ Add**). Ajouter p. ex. `utm_source` pour que les variantes de lien partagent une seule entrée de cache. |
| **Cache Clearing** | Formulaire de vidage par URL (URL commençant par `/`, `*` comme joker) plus le tableau d'audit des journaux de vidage (cartes KPI Total / Today / Users ; colonnes Id, URL Cleared, Date, User ; pagination par offset). Conservé 3 mois. |

![Onglet Properties — taille totale du cache en base, la bascule Activate the cache system, le cache time in seconds, les cases de type de requête GET/POST et l'arborescence d'exclusion par page avec les pastilles GET/POST](/screenshots/react/melis-cache-internal/meliscacheinternal-tool-cache-tab-properties.png)

![Onglet Partial Caching — cartes KPI (Total / Manual / Plugin), recherche, gestionnaire de colonnes, Export et + Add au-dessus du tableau des codes (Id, Partial Caching Code, Type, Module, Controller, Action, Cache lifetime in seconds, Methods)](/screenshots/react/melis-cache-internal/meliscacheinternal-tool-cache-tab-partialcaching.png)

![Onglet URL Parameters — le KPI Total, recherche, Export et + Add au-dessus du tableau des paramètres de requête ignorés (Id, Parameter), utilisé pour empêcher les paramètres de suivi de fragmenter le cache](/screenshots/react/melis-cache-internal/meliscacheinternal-tool-cache-tab-urlparameters.png)

![Onglet Cache Clearing — le formulaire de vidage par URL (URL commençant par /, * comme joker) avec les cartes KPI (Total / Today / Users) et le tableau d'audit des journaux de vidage (Id, URL Cleared, Date, User) avec pagination](/screenshots/react/melis-cache-internal/meliscacheinternal-tool-cache-tab-cacheclearing.png)

Tâches courantes : activer le cache / définir le TTL → *Properties → Activate → cache time → cocher GET/POST →
Save* ; empêcher la mise en cache d'une page → *Properties → cocher GET/POST pour cette page dans l'arborescence
→ Save* ; ajouter une règle partielle → *Partial Caching → + Add* ; ignorer un paramètre de suivi → *URL
Parameters → + Add* ; vider une URL maintenant → *Cache Clearing → saisir l'URL → Clear cache*.

## API React

L'interface React communique avec une API JSON servie par **les contrôleurs propres à ce module** (sous-espace de
noms `MelisCacheInternal\Controller\React`, enregistrés dans `config/module.config.php`) — et **non** par
`melis-react-api`. Chemin de base `/melis/MelisCacheInternal/react-api`. Chaque action étend
`MelisAbstractActionController`, est indexée sur `MELIS_KEY = 'MelisCacheInternal_tool'`, protège l'accès via
`denyUnlessAccess()` + `denyUnlessCan()`, et retourne `{ success, data, error }`.

| Méthode et URL (relatives à la base) | Objet |
| --- | --- |
| `GET /config` | Paramètres + taille du cache + exclusions de pages |
| `POST /config/save` | Enregistrer les paramètres (upsert singleton) + remplacer en masse les exclusions de pages |
| `POST /config/empty-cache` | Vider tout le cache |
| `POST /config/clear-cache` | Vider par motif d'URL (sans journal) |
| `GET /page-tree?nodeId=` | Arborescence de pages en chargement paresseux pour les exclusions (`nodeId=-1` = racine) |
| `GET /partial-caching` · `/stats` · `/:id` | Liste keyset · KPI · un code |
| `POST /partial-caching/save` · `/delete/:id` | Créer / mettre à jour · supprimer un code |
| `GET /url-parameters` · `/stats` · `/:id` | Liste keyset · KPI · un paramètre |
| `POST /url-parameters/save` · `/delete/:id` | Créer / mettre à jour · supprimer |
| `GET /clearing-logs` · `/stats` | Journaux paginés par offset · KPI (total / today / users) |
| `POST /clearing-logs/clear-cache` | Vider par URL **et le journaliser** |

```ts
const BASE = '/melis/MelisCacheInternal/react-api'
// save config + page exclusions (bulk replace)
await apiFetch<null>('/config/save', {
  method: 'POST',
  body: JSON.stringify({ active: true, time: 3600, requestType: ['GET'],
    pageExclusions: [{ pageId: 42, excludeGet: true, excludePost: false }] }),
})
// create a partial-caching code
await apiFetch<{ id: number }>('/partial-caching/save', {
  method: 'POST',
  body: JSON.stringify({ type: 'PLUGIN', code: 'NEWS_LATEST', time: 60,
    module: '', controller: '', action: '', requestGet: true, requestPost: false }),
})
```

Chaque fetch envoie `X-Requested-With: XMLHttpRequest` ; les POST comportant un corps ajoutent
`Content-Type: application/json`. Les contrôleurs React réutilisent les services et tables Laminas du module ; les
contrôleurs historiques alimentent toujours la vue *Old*.

## Capacités

Les droits avancés sont déclarés dans `config/react.capabilities.php` sous le nœud porteur de droits
`MelisCacheInternal_tool` (le même `melisKey` que le manifeste, l'iframe de la vue *Old* et le garde-fou d'accès).
Il s'agit d'un arbre par onglet ; `Capabilities::flatten()` le transforme en chaînes à points que React lit via
`useCaps('MelisCacheInternal_tool').can('…')` :

```
MelisCacheInternal_tool
├─ tab "config"   actions: edit                                  (Properties — save settings)
├─ tab "partial"  actions: list · create · edit · delete · export   (Partial Caching CRUD)
├─ tab "params"   actions: list · create · edit · delete · export   (URL Parameters CRUD)
└─ tab "logs"     actions: list · clear · export                 (Cache Clearing — logs + clear by URL)
```

La visibilité des onglets est filtrée par `can('config'|'partial'|'params'|'logs')` ; les actions sont contrôlées
par feuille (p. ex. le bouton Save de config par `can('config.edit')`). Chaque action serveur est protégée deux
fois — `denyUnlessAccess()` (authentification + `MelisCoreRights::canAccess`) puis `denyUnlessCan('<feuille>')` —
et `Capabilities` est permissif par défaut pour un outil/une capacité non déclarés.

## Tables de base de données

| Table | Contenu |
| --- | --- |
| `melis_cache` | Entrées de cache : `mc_page_id`, `mc_cache_url` (normalisée), `mc_cache_content` (réponse sérialisée), `mc_cache_date`, `mc_cache_method_type` (1 GET / 2 POST). |
| `melis_cache_config` | Configuration globale : `mcc_active`, `mcc_time` (TTL en secondes), `mcc_request_type` (GET, POST). |
| `melis_cache_exclusions` | Exclusions par page : `mce_page_id`, `mce_request_get`, `mce_request_post`. |
| `melis_cache_partial_codes` | Règles de zone de cache partiel : `mcpc_type` (MANUAL/PLUGIN), `mcpc_code`, `mcpc_time` (TTL), `mcpc_module/controller/action`. |
| `melis_cache_partial_general_site_plugins` | Configurations de plugin principal applicables à l'ensemble du site : `mcpg_site_id`, `mcpg_page_id`, `mcpg_plugin_*`, `mcpg_cache_code`. |
| `melis_cache_partial_general_site_plugins_exclusion` | Exclusions de plugins du cache par page. |
| `melis_cache_url_parameters` | Noms de paramètres de requête ignorés (`mcup_name`). |
| `melis_cache_clearing_logs` | Journal d'audit : `mccl_cache_url`, `mccl_user_id`, `mccl_clearing_date`. |

## Exemple

Supprimer le cache d'une page spécifique par programmation :

```php
// Dans un contrôleur ou un service avec le service manager disponible
$cacheSrv = $sm->get('MelisCacheInternalService');

// Invalider par ID de page
$cacheSrv->deleteCacheByPageId($pageId);

// Invalider par URL
$cacheSrv->deleteCacheByUrl('/my-page');

// Vérifier si une entrée en cache existe
$hasCache = $cacheSrv->hasCache($pageId, $normalisedUrl, $methodType); // 1=GET, 2=POST
```

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Amorçage du module (câblage des listeners) | `vendor/melisplatform/melis-cache-internal/src/Module.php` |
| Configuration du module (services, contrôleurs, alias de tables, routes React) | `vendor/melisplatform/melis-cache-internal/config/module.config.php` |
| Arborescence des capacités React | `vendor/melisplatform/melis-cache-internal/config/react.capabilities.php` |
| Contrôleurs de l'API React | `vendor/melisplatform/melis-cache-internal/src/Controller/React/` |
| Source / build de la brick React | `vendor/melisplatform/melis-cache-internal/ui-react/` → `public/ui-react/brick.js` + `brick.manifest.json` |
| Service de cache pleine-page | `vendor/melisplatform/melis-cache-internal/src/Service/MelisCacheInternalService.php` |
| Service de cache partiel/par zone | `vendor/melisplatform/melis-cache-internal/src/Service/PartialCachingService.php` |
| Listener de service (hit de cache) | `vendor/melisplatform/melis-cache-internal/src/Listener/MelisCacheInternalPageGetCacheListener.php` |
| Listener de stockage (sauvegarde du cache) | `vendor/melisplatform/melis-cache-internal/src/Listener/MelisCacheInternalPageSaveCacheListener.php` |
| Listener d'invalidation de page CMS | `vendor/melisplatform/melis-cache-internal/src/Listener/MelisCacheInternalCmsPageListener.php` |
| Migrations de base de données | `vendor/melisplatform/melis-cache-internal/install/dbdeploy/` |

## Voir aussi

- [melis-cms](/fr/reference/modules/melis-cms) — le CMS dont les événements de publication déclenchent l'invalidation du cache.
- [melis-front](/fr/reference/modules/melis-front) — le pipeline de rendu encapsulé par MelisCacheInternal.
- [melis-engine](/fr/reference/modules/melis-engine) — le cache objet général de la plateforme (distinct de ce module).
- [Référence des modules](/fr/reference/modules) — tous les modules de la plateforme.
