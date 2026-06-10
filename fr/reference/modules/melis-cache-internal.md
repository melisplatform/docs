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

Nécessite `melisplatform/melis-cms` (`^5.2`) et PHP `^8.1|^8.3`. Le module inclut des migrations de base de
données (`dbdeploy: true`) qui doivent être appliquées lors de la première installation.

## Services principaux

Enregistrés sous `service_manager` dans `config/module.config.php`. À résoudre via `$sm->get('<alias>')`.

| Alias de service | Rôle |
| --- | --- |
| `MelisCacheInternalService` | Opérations de cache pleine-page : `getCacheConfig()`, `getPageCacheByPageIdAndType($pageId, $uri, $methodType)`, `getPageCacheByUrl()`, `saveItem()`, `deleteCacheByPageId()`, `deleteCacheByUrl()`, `deleteCacheByPageIdOrByUrl()`, `deleteAllCache()`, `getMelisCacheSize()`, `hasCache()`. Déclenche les événements `melis_cache_internal_*_start`/`_end`. |
| `PartialCachingService` | Gestion du cache partiel/par zone : `getLists()`, `savePartialCaching()`, `deletePartialCaching()`, `getPartialCachingByCode()`, `searchPartialCachingByCode()`, et `processedZoneCaching($uri, $response, $pageId, $type)` — le moteur de rafraîchissement de zone qui re-rend uniquement les zones expirées lors d'un hit de cache. |

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

## Back-office

Accessible via **Menu gauche → MelisCms → Melis Cache** (`fa fa-bookmark`). L'outil comporte quatre onglets :

| Onglet | melisKey | Contenu |
| --- | --- | --- |
| Properties | `MelisCacheInternal_content_main_tab` | Configuration globale (bascule d'activation, TTL, types de requêtes GET/POST), taille actuelle du cache et arborescence d'exclusions par page. |
| Partial Caching | `…_partial_caching_tab` | Gestion des codes de cache partiel (code, type, module/controller/action, durée de vie). DataTable : `meliscacheinternal_partial_caching`. |
| URL Parameters | `…_cache_url_parameters_tab` | Gestion des paramètres de requête ignorés. DataTable : `meliscacheinternal_cache_url_parameters`. |
| Cache Clearing | `…_cache_clearing_tab` | Vidage manuel par URL et tableau d'audit des journaux de vidage (conservé 3 mois). DataTable : `meliscacheinternal_cache_clearing_logs`. |

Contrôleurs : `MelisCacheInternalController`, `PartialCachingController`, `UrlParametersController`,
`ClearingLogsController`, `MelisCachePageExclusionController`.

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
| Configuration du module (services, contrôleurs, alias de tables) | `vendor/melisplatform/melis-cache-internal/config/module.config.php` |
| Arborescence des outils back-office | `vendor/melisplatform/melis-cache-internal/config/app.toolstree.php` |
| Définitions des DataTables | `vendor/melisplatform/melis-cache-internal/config/app.tools.php` |
| Service de cache pleine-page | `vendor/melisplatform/melis-cache-internal/src/Service/MelisCacheInternalService.php` |
| Service de cache partiel/par zone | `vendor/melisplatform/melis-cache-internal/src/Service/PartialCachingService.php` |
| Listener de service (hit de cache) | `vendor/melisplatform/melis-cache-internal/src/Listener/MelisCacheInternalPageGetCacheListener.php` |
| Listener de stockage (sauvegarde du cache) | `vendor/melisplatform/melis-cache-internal/src/Listener/MelisCacheInternalPageSaveCacheListener.php` |
| Listener d'invalidation de page CMS | `vendor/melisplatform/melis-cache-internal/src/Listener/MelisCacheInternalCmsPageListener.php` |
| Migrations de base de données | `vendor/melisplatform/melis-cache-internal/install/dbdeploy/` |

## Voir aussi

- [melis-cms](/reference/modules/melis-cms) — le CMS dont les événements de publication déclenchent l'invalidation du cache.
- [melis-front](/reference/modules/melis-front) — le pipeline de rendu encapsulé par MelisCacheInternal.
- [melis-engine](/reference/modules/melis-engine) — le cache objet général de la plateforme (distinct de ce module).
- [Référence des modules](/reference/modules) — tous les modules de la plateforme.
