# MelisCacheInternal

> Cache HTTP a pagina intera per il front-office del CMS, con caching parziale (per zone) ed esclusioni per pagina.
> Pacchetto `melisplatform/melis-cache-internal`.

## Scopo

`MelisCacheInternal` è uno strato di prestazioni che si colloca davanti alla pipeline di rendering di MelisFront. Memorizza
l'HTML completamente renderizzato (come Response HTTP serializzata) di una pagina pubblicata e lo serve nelle
visite successive, saltando l'intero rendering. I singoli plugin di una pagina possono essere configurati per
aggiornarsi con un TTL più breve (caching parziale/per zone) mentre il resto della pagina rimane in cache. Le pagine vengono
invalidate automaticamente alla pubblicazione, alla rimozione della pubblicazione o all'eliminazione, e viene mantenuto per tre mesi un registro di
controllo delle pulizie manuali della cache. Questo modulo è distinto dalla cache generale di oggetti chiave/valore di MelisEngine —
è specificamente una cache HTTP a pagina intera.

## Come abilitarlo

Aggiungere a `config/melis.module.load.php`:

```php
return [
    'MelisCacheInternal',
];
```

Richiede `melisplatform/melis-cms`. Il modulo include migrazioni del database (`dbdeploy: true`) che devono
essere applicate alla prima installazione. Nel back-office v6 lo strumento appare solo quando il modulo è
attivato — l'host React lo rileva tramite il relativo `brick.manifest.json` (vedi [Back-office React](#back-office-react)).

## Servizi principali

Registrati sotto `service_manager` in `config/module.config.php`. Da risolvere con `$sm->get('<alias>')`.

| Alias del servizio | Ruolo |
| --- | --- |
| `MelisCacheInternalService` | Operazioni di cache a pagina intera: `getCacheConfig()`, `getPageCacheByPageIdAndType($pageId, $uri, $methodType)`, `getPageCacheByUrl()`, `saveItem()`, `deleteCacheByPageId()`, `deleteCacheByUrl()`, `deleteCacheByPageIdOrByUrl()`, `deleteAllCache()`, `getMelisCacheSize()`, `hasCache()`. Emette eventi `melis_cache_internal_*_start`/`_end`. |
| `PartialCachingService` | Gestione della cache parziale/per zone: `getLists()`, `savePartialCaching()`, `deletePartialCaching()`, `getPartialCachingByCode()`, `searchPartialCachingByCode()` e `processedZoneCaching($uri, $response, $pageId, $type)` — il motore di aggiornamento delle zone che ri-renderizza solo le zone scadute in caso di cache hit. |

Il back-office React riutilizza gli stessi servizi e le stesse tabelle, quindi il percorso React riproduce esattamente
il comportamento legacy (la configurazione è un upsert singleton, le esclusioni vengono sostituite in blocco, `deleteCacheByUrl`
gestisce il carattere jolly `*`/REGEXP).

## Meccanismo del ciclo di richiesta

I listener vengono collegati in base alla modalità di rendering in `Module.php`:

| Listener | Evento | Ruolo |
| --- | --- | --- |
| `MelisCacheInternalPageGetCacheListener` | `MvcEvent::EVENT_DISPATCH` (priorità 10) | **Servire** — in caso di cache hit, restituisce la response memorizzata e cortocircuita il rendering (aggiunge l'header `Melis-Cache: Hit`). |
| `MelisCacheInternalPageSaveCacheListener` | `MvcEvent::EVENT_FINISH` (priorità -1001) | **Memorizzare** — dopo il rendering, salva in cache una response 200. |
| `MelisCacheInternalViewResultListener` | `melisengine_melistemplating_view_result_plugin_end` | Racchiude l'output di ogni plugin con i metadati della cache parziale (`data-pcache-code`, `data-pcache-gendate`, nome/id/dbkey del plugin). |
| `MelisCacheInternalCmsPageListener` | `meliscms_page_publish_end` / `…_unpublish_end` / `…_delete_end` | **Invalidare** la cache della pagina e persistere la configurazione dei plugin parziali nella pagina. |
| `MelisCacheInternalDeleteCacheListener` | `melis_cache_delete_cache` | Invalidare su richiesta tramite `pageId` o `pageUrl`. |
| `MelisCacheInternalSaveEditionSessionListener` | `meliscms_page_savesession_plugin_start` | Salva in sessione la configurazione di cache parziale di un plugin per la pubblicazione. |
| `MelisCacheInternalGetPluginParametersListener` | `melistemplating_plugin_update_parameters` | Inietta le impostazioni di cache parziale nel form di modifica del plugin nel back-office. |
| `MelisCacheInternalPartialCachingFormConfigListener` | `ModuleEvent::EVENT_LOAD_MODULES_POST` | Aggiunge la scheda del form di caching parziale alla modale di ogni plugin front. |
| `MelisCacheInternalFlashMessengerListener` | `meliscacheinternal_save_cache_end` | Flash-messenger e registrazione delle attività. |

**Chiave di cache** = `id pagina + URL normalizzato + metodo di richiesta` (1 = GET, 2 = POST). URL normalizzato significa
che i parametri URL elencati in `melis_cache_url_parameters` vengono rimossi prima della generazione della chiave, così i parametri di
tracciamento come `utm_source` non frammentano la cache. Il valore memorizzato (`mc_cache_content`) è una
Response HTTP serializzata (corpo + header), non un blob HTML grezzo. Tutti i dispositivi condividono la stessa response
memorizzata (si presuppone un layout responsive).

## Caching parziale (per zone)

Una pagina completamente in cache può mantenere aggiornati i singoli plugin con un TTL più breve:

- `MelisCacheInternalViewResultListener` racchiude l'output di ogni plugin con i metadati `data-pcache-*`
  (codice della cache e data di generazione) al momento del rendering.
- In caso di cache **hit**, `PartialCachingService::processedZoneCaching()` analizza quei marcatori e, per
  ogni zona il cui TTL è trascorso, ri-renderizza solo quella zona. Il tipo `PLUGIN` ri-renderizza il plugin di
  templating; il tipo `MANUAL` inoltra a un `module/controller/action` configurato.
- Un **codice di cache parziale** (`melis_cache_partial_codes`) definisce il tipo, il codice, il TTL
  (`mcpc_time`) e il target MANUAL della zona.
- La configurazione di un **plugin principale** (`melis_cache_partial_general_site_plugins`) è una base a livello di sito che
  si propaga a tutte le pagine; le righe `_exclusion` escludono un plugin dal caching su una determinata pagina.

## Back-office React

In v6 lo strumento è fornito come **brick nativo full-React** — un singolo strumento nel menu di sinistra (**Melis Cache**)
le cui schermate sono **schede interne allo strumento**, non sotto-schede dell'host. Si trova in **Sidebar → MelisCms → Melis
Cache** (`fa fa-bookmark`), montato su `/melis-cms/cache-internal`. L'intestazione riporta il sottotitolo *"Platform
cache management"*, un pulsante di **refresh** che segue la scheda attiva, un pulsante globale **Save**
e un interruttore **New / Old**: *New* è l'interfaccia React (predefinita); *Old* renderizza lo strumento classico
in un iframe persistente (`/melis/react-tool-page?key=MelisCacheInternal_tool`).

Le quattro schede:

| Scheda | Contenuto |
| --- | --- |
| **Properties** | Dimensione totale della cache nel DB, l'interruttore *Activate the cache system*, il *cache time in seconds* (TTL), le caselle di controllo del tipo di richiesta GET/POST e l'albero di esclusione delle pagine (attiva/disattiva GET/POST per pagina). Persistito dal **Save** globale dell'intestazione. |
| **Partial Caching** | Elenco CRUD dei codici di cache parziale con schede KPI (Total / Manual / Plugin), ricerca, gestore delle colonne, Export e **+ Add**. Colonne: Id, Partial Caching Code, Type, Module, Controller, Action, Cache lifetime in seconds, Methods. |
| **URL Parameters** | Elenco CRUD dei nomi dei parametri di query ignorati nella generazione della chiave di cache (KPI Total, ricerca, Export, **+ Add**). Aggiungi ad esempio `utm_source` in modo che le varianti dei link condividano una sola voce di cache. |
| **Cache Clearing** | Form di pulizia per URL (URL che inizia con `/`, `*` come carattere jolly) più la tabella di controllo dei log di pulizia (schede KPI Total / Today / Users; colonne Id, URL Cleared, Date, User; paginazione con offset). Mantenuti 3 mesi. |

![Scheda Properties — dimensione totale della cache nel DB, l'interruttore Activate the cache system, cache time in seconds, le caselle di controllo del tipo di richiesta GET/POST e l'albero di esclusione per pagina con i pill GET/POST](/screenshots/react/melis-cache-internal/meliscacheinternal-tool-cache-tab-properties.png)

![Scheda Partial Caching — schede KPI (Total / Manual / Plugin), ricerca, gestore Columns, Export e + Add sopra la tabella dei codici (Id, Partial Caching Code, Type, Module, Controller, Action, Cache lifetime in seconds, Methods)](/screenshots/react/melis-cache-internal/meliscacheinternal-tool-cache-tab-partialcaching.png)

![Scheda URL Parameters — il KPI Total, ricerca, Export e + Add sopra la tabella dei parametri di query ignorati (Id, Parameter), usata per evitare che i parametri di tracciamento frammentino la cache](/screenshots/react/melis-cache-internal/meliscacheinternal-tool-cache-tab-urlparameters.png)

![Scheda Cache Clearing — il form di pulizia per URL (URL che inizia con /, * come carattere jolly) con schede KPI (Total / Today / Users) e la tabella di controllo dei log di pulizia (Id, URL Cleared, Date, User) con paginazione](/screenshots/react/melis-cache-internal/meliscacheinternal-tool-cache-tab-cacheclearing.png)

Attività comuni: attivare il caching / impostare il TTL → *Properties → Activate → cache time → spuntare GET/POST →
Save*; impedire la messa in cache di una pagina → *Properties → spuntare GET/POST per quella pagina nell'albero → Save*; aggiungere
una regola parziale → *Partial Caching → + Add*; ignorare un parametro di tracciamento → *URL Parameters → + Add*; svuotare
un URL adesso → *Cache Clearing → digitare l'URL → Clear cache*.

## API React

L'interfaccia React comunica con un'API JSON servita dai **controller propri di questo modulo** (sotto-namespace
`MelisCacheInternal\Controller\React`, registrato in `config/module.config.php`) — **non**
`melis-react-api`. Percorso base `/melis/MelisCacheInternal/react-api`. Ogni azione estende
`MelisAbstractActionController`, è associata a `MELIS_KEY = 'MelisCacheInternal_tool'`, protegge l'accesso
tramite `denyUnlessAccess()` + `denyUnlessCan()` e restituisce `{ success, data, error }`.

| Metodo e URL (relativo alla base) | Scopo |
| --- | --- |
| `GET /config` | Impostazioni + dimensione della cache + esclusioni delle pagine |
| `POST /config/save` | Salva le impostazioni (upsert singleton) + sostituisce in blocco le esclusioni delle pagine |
| `POST /config/empty-cache` | Svuota l'intera cache |
| `POST /config/clear-cache` | Pulizia per pattern URL (senza log) |
| `GET /page-tree?nodeId=` | Albero delle pagine lazy per le esclusioni (`nodeId=-1` = radice) |
| `GET /partial-caching` · `/stats` · `/:id` | Elenco keyset · KPI · un codice |
| `POST /partial-caching/save` · `/delete/:id` | Crea / aggiorna · elimina un codice |
| `GET /url-parameters` · `/stats` · `/:id` | Elenco keyset · KPI · un parametro |
| `POST /url-parameters/save` · `/delete/:id` | Crea / aggiorna · elimina |
| `GET /clearing-logs` · `/stats` | Log paginati con offset · KPI (total / today / users) |
| `POST /clearing-logs/clear-cache` | Pulizia per URL **e registrazione nel log** |

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

Ogni fetch invia `X-Requested-With: XMLHttpRequest`; le POST con corpo aggiungono
`Content-Type: application/json`. I controller React riutilizzano i servizi Laminas e le tabelle del modulo;
i controller legacy alimentano ancora la vista *Old*.

## Capacità

I diritti avanzati sono dichiarati in `config/react.capabilities.php` sotto il nodo portatore di diritti
`MelisCacheInternal_tool` (lo stesso `melisKey` del manifest, dell'iframe della vista *Old* e della guardia di
accesso). È un albero per scheda; `Capabilities::flatten()` lo trasforma in stringhe con notazione a punti che React legge
tramite `useCaps('MelisCacheInternal_tool').can('…')`:

```
MelisCacheInternal_tool
├─ tab "config"   actions: edit                                  (Properties — save settings)
├─ tab "partial"  actions: list · create · edit · delete · export   (Partial Caching CRUD)
├─ tab "params"   actions: list · create · edit · delete · export   (URL Parameters CRUD)
└─ tab "logs"     actions: list · clear · export                 (Cache Clearing — logs + clear by URL)
```

La visibilità delle schede è filtrata da `can('config'|'partial'|'params'|'logs')`; le azioni sono controllate per foglia
(ad esempio il pulsante Save della configurazione tramite `can('config.edit')`). Ogni azione lato server è protetta due volte —
`denyUnlessAccess()` (autenticazione + `MelisCoreRights::canAccess`) poi `denyUnlessCan('<leaf>')` — e
`Capabilities` è default-allow per uno strumento/capacità non dichiarato.

## Tabelle del database

| Tabella | Contiene |
| --- | --- |
| `melis_cache` | Voci di cache: `mc_page_id`, `mc_cache_url` (normalizzato), `mc_cache_content` (Response serializzata), `mc_cache_date`, `mc_cache_method_type` (1 GET / 2 POST). |
| `melis_cache_config` | Configurazione globale: `mcc_active`, `mcc_time` (TTL in secondi), `mcc_request_type` (GET, POST). |
| `melis_cache_exclusions` | Esclusioni per pagina: `mce_page_id`, `mce_request_get`, `mce_request_post`. |
| `melis_cache_partial_codes` | Regole delle zone di cache parziale: `mcpc_type` (MANUAL/PLUGIN), `mcpc_code`, `mcpc_time` (TTL), `mcpc_module/controller/action`. |
| `melis_cache_partial_general_site_plugins` | Configurazioni dei plugin principali a livello di sito: `mcpg_site_id`, `mcpg_page_id`, `mcpg_plugin_*`, `mcpg_cache_code`. |
| `melis_cache_partial_general_site_plugins_exclusion` | Esclusioni per pagina dei plugin dal caching. |
| `melis_cache_url_parameters` | Nomi dei parametri di query ignorati (`mcup_name`). |
| `melis_cache_clearing_logs` | Registro di controllo: `mccl_cache_url`, `mccl_user_id`, `mccl_clearing_date`. |

## Esempio

Eliminare la cache di una pagina specifica in modo programmatico:

```php
// In a controller or service with the service manager available
$cacheSrv = $sm->get('MelisCacheInternalService');

// Invalidate by page ID
$cacheSrv->deleteCacheByPageId($pageId);

// Invalidate by URL
$cacheSrv->deleteCacheByUrl('/my-page');

// Check whether a cached entry exists
$hasCache = $cacheSrv->hasCache($pageId, $normalisedUrl, $methodType); // 1=GET, 2=POST
```

## File principali

| Ambito | Percorso |
| --- | --- |
| Bootstrap del modulo (collegamento dei listener) | `vendor/melisplatform/melis-cache-internal/src/Module.php` |
| Configurazione del modulo (servizi, controller, alias delle tabelle, route React) | `vendor/melisplatform/melis-cache-internal/config/module.config.php` |
| Albero delle capacità React | `vendor/melisplatform/melis-cache-internal/config/react.capabilities.php` |
| Controller dell'API React | `vendor/melisplatform/melis-cache-internal/src/Controller/React/` |
| Sorgente / build del brick React | `vendor/melisplatform/melis-cache-internal/ui-react/` → `public/ui-react/brick.js` + `brick.manifest.json` |
| Servizio di cache a pagina intera | `vendor/melisplatform/melis-cache-internal/src/Service/MelisCacheInternalService.php` |
| Servizio di cache parziale/per zone | `vendor/melisplatform/melis-cache-internal/src/Service/PartialCachingService.php` |
| Listener di servizio (cache hit) | `vendor/melisplatform/melis-cache-internal/src/Listener/MelisCacheInternalPageGetCacheListener.php` |
| Listener di memorizzazione (salvataggio in cache) | `vendor/melisplatform/melis-cache-internal/src/Listener/MelisCacheInternalPageSaveCacheListener.php` |
| Listener di invalidazione della pagina CMS | `vendor/melisplatform/melis-cache-internal/src/Listener/MelisCacheInternalCmsPageListener.php` |
| Migrazioni del database | `vendor/melisplatform/melis-cache-internal/install/dbdeploy/` |

## Vedi anche

- [melis-cms](/it/reference/modules/melis-cms) — il CMS i cui eventi di pubblicazione attivano l'invalidazione della cache.
- [melis-front](/it/reference/modules/melis-front) — la pipeline di rendering che MelisCacheInternal avvolge.
- [melis-engine](/it/reference/modules/melis-engine) — la cache generale di oggetti della piattaforma (distinta da questo modulo).
- [Riferimento dei moduli](/it/reference/modules) — tutti i moduli della piattaforma.
