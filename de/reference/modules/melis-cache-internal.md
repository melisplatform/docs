# MelisCacheInternal

> Vollseiten-HTTP-Cache für das CMS-Front-Office, mit partiellem (zonenbasiertem) Caching und seitenspezifischen Ausschlüssen.
> Paket `melisplatform/melis-cache-internal`.

## Zweck

`MelisCacheInternal` ist eine Performance-Schicht, die der Render-Pipeline von MelisFront vorgelagert ist. Sie
speichert das vollständig gerenderte HTML (als serialisierte HTTP-Response) einer veröffentlichten Seite und liefert es bei
nachfolgenden Aufrufen aus, wobei das gesamte Rendering übersprungen wird. Einzelne Plugins auf einer Seite können so konfiguriert werden, dass sie
mit einer kürzeren TTL aktualisiert werden (partielles/zonenbasiertes Caching), während der Rest der Seite im Cache verbleibt. Seiten werden
bei Veröffentlichung, Zurückziehen oder Löschen automatisch invalidiert, und ein Prüfprotokoll manueller Cache-Leerungen wird
drei Monate lang aufbewahrt. Dieses Modul unterscheidet sich vom allgemeinen Schlüssel/Wert-Objekt-Cache von MelisEngine —
es handelt sich speziell um einen HTTP-Vollseiten-Cache.

## Aktivierung

In `config/melis.module.load.php` hinzufügen:

```php
return [
    'MelisCacheInternal',
];
```

Erfordert `melisplatform/melis-cms`. Das Modul liefert Datenbankmigrationen (`dbdeploy: true`) mit, die
bei der Erstinstallation angewendet werden müssen. Im v6-Back-Office erscheint das Werkzeug nur, wenn das Modul
aktiviert ist — der React-Host erkennt es über dessen `brick.manifest.json` (siehe [React-Back-Office](#react-back-office)).

## Zentrale Services

Registriert unter `service_manager` in `config/module.config.php`. Auflösen mit `$sm->get('<alias>')`.

| Service-Alias | Rolle |
| --- | --- |
| `MelisCacheInternalService` | Vollseiten-Cache-Operationen: `getCacheConfig()`, `getPageCacheByPageIdAndType($pageId, $uri, $methodType)`, `getPageCacheByUrl()`, `saveItem()`, `deleteCacheByPageId()`, `deleteCacheByUrl()`, `deleteCacheByPageIdOrByUrl()`, `deleteAllCache()`, `getMelisCacheSize()`, `hasCache()`. Löst `melis_cache_internal_*_start`/`_end`-Events aus. |
| `PartialCachingService` | Verwaltung des partiellen/zonenbasierten Caches: `getLists()`, `savePartialCaching()`, `deletePartialCaching()`, `getPartialCachingByCode()`, `searchPartialCachingByCode()` und `processedZoneCaching($uri, $response, $pageId, $type)` — die Zonen-Aktualisierungs-Engine, die bei einem Cache-Treffer nur die abgelaufenen Zonen neu rendert. |

Das React-Back-Office verwendet dieselben Services und Tabellen wieder, sodass der React-Pfad das exakte
Legacy-Verhalten reproduziert (Konfiguration ist ein Singleton-Upsert, Ausschlüsse werden in Bulk ersetzt, `deleteCacheByUrl`
behandelt den `*`-Platzhalter/REGEXP).

## Mechanismus des Request-Zyklus

Listener werden je nach Rendermodus in `Module.php` angebunden:

| Listener | Event | Rolle |
| --- | --- | --- |
| `MelisCacheInternalPageGetCacheListener` | `MvcEvent::EVENT_DISPATCH` (Priorität 10) | **Ausliefern** — bei einem Cache-Treffer gibt die gespeicherte Response aus und bricht das Rendering ab (fügt den Header `Melis-Cache: Hit` hinzu). |
| `MelisCacheInternalPageSaveCacheListener` | `MvcEvent::EVENT_FINISH` (Priorität -1001) | **Speichern** — speichert nach dem Rendering eine 200-Response im Cache. |
| `MelisCacheInternalViewResultListener` | `melisengine_melistemplating_view_result_plugin_end` | Umschließt die Ausgabe jedes Plugins mit Partial-Cache-Metadaten (`data-pcache-code`, `data-pcache-gendate`, Plugin-Name/-Id/-dbkey). |
| `MelisCacheInternalCmsPageListener` | `meliscms_page_publish_end` / `…_unpublish_end` / `…_delete_end` | **Invalidiert** den Cache der Seite und persistiert die Partial-Plugin-Konfiguration in die Seite. |
| `MelisCacheInternalDeleteCacheListener` | `melis_cache_delete_cache` | Invalidierung auf Anforderung per `pageId` oder `pageUrl`. |
| `MelisCacheInternalSaveEditionSessionListener` | `meliscms_page_savesession_plugin_start` | Legt die Partial-Cache-Konfiguration eines Plugins für die Veröffentlichung in der Session ab. |
| `MelisCacheInternalGetPluginParametersListener` | `melistemplating_plugin_update_parameters` | Fügt die Partial-Cache-Einstellungen in das Back-Office-Bearbeitungsformular eines Plugins ein. |
| `MelisCacheInternalPartialCachingFormConfigListener` | `ModuleEvent::EVENT_LOAD_MODULES_POST` | Fügt den Partial-Caching-Formulartab zum Modal jedes Front-Plugins hinzu. |
| `MelisCacheInternalFlashMessengerListener` | `meliscacheinternal_save_cache_end` | Flash-Messenger und Aktivitätsprotokollierung. |

**Cache-Schlüssel** = `Seiten-ID + normalisierte URL + Request-Methode` (1 = GET, 2 = POST). Normalisierte URL bedeutet,
dass die in `melis_cache_url_parameters` aufgeführten URL-Parameter vor der Schlüsselbildung entfernt werden, sodass Tracking-
Parameter wie `utm_source` den Cache nicht fragmentieren. Der zwischengespeicherte Wert (`mc_cache_content`) ist eine
serialisierte HTTP-Response (Body + Header), kein reiner HTML-Blob. Alle Geräte teilen sich dieselbe zwischengespeicherte
Response (ein responsives Layout wird vorausgesetzt).

## Partielles (zonenbasiertes) Caching

Eine vollständig zwischengespeicherte Seite kann einzelne Plugins mit einer kürzeren TTL aktuell halten:

- `MelisCacheInternalViewResultListener` umschließt die Ausgabe jedes Plugins zur Render-Zeit mit `data-pcache-*`-Metadaten
  (Cache-Code und Erzeugungsdatum).
- Bei einem Cache-**Treffer** analysiert `PartialCachingService::processedZoneCaching()` diese Marker und rendert für
  jede Zone, deren TTL abgelaufen ist, nur diese Zone neu. Typ `PLUGIN` rendert das Templating-
  Plugin neu; Typ `MANUAL` leitet an ein konfiguriertes `module/controller/action` weiter.
- Ein **Partial-Cache-Code** (`melis_cache_partial_codes`) definiert den Typ, den Code, die TTL
  (`mcpc_time`) und das MANUAL-Ziel der Zone.
- Eine **Hauptplugin**-Konfiguration (`melis_cache_partial_general_site_plugins`) ist eine seitenweite Basis, die
  sich auf alle Seiten überträgt; `_exclusion`-Zeilen schließen ein Plugin auf einer bestimmten Seite vom Caching aus.

## React-Back-Office

In v6 wird das Werkzeug als **native Full-React-Brick** ausgeliefert — ein einzelnes Werkzeug im linken Menü (**Melis Cache**),
dessen Bildschirme **in-Tool-Tabs** sind, keine Host-Untertabs. Zu finden unter **Sidebar → MelisCms → Melis
Cache** (`fa fa-bookmark`), eingebunden unter `/melis-cms/cache-internal`. Die Kopfzeile trägt den Untertitel
*"Platform cache management"*, einen **Aktualisieren**-Button, der dem aktiven Tab folgt, einen globalen **Save**-
Button sowie einen **New / Old**-Umschalter: *New* ist die React-Oberfläche (Standard); *Old* rendert das klassische Werkzeug
in einem persistenten iframe (`/melis/react-tool-page?key=MelisCacheInternal_tool`).

Die vier Tabs:

| Tab | Inhalt |
| --- | --- |
| **Properties** | Vollständige Cache-Größe in der DB, der Umschalter *Activate the cache system*, *cache time in seconds* (TTL), die GET/POST-Request-Typ-Checkboxen und der Seitenausschluss-Baum (GET/POST pro Seite umschalten). Wird über den globalen Kopfzeilen-**Save** gespeichert. |
| **Partial Caching** | CRUD-Liste der Partial-Cache-Codes mit KPI-Karten (Total / Manual / Plugin), Suche, Spaltenverwaltung, Export und **+ Add**. Spalten: Id, Partial Caching Code, Type, Module, Controller, Action, Cache lifetime in seconds, Methods. |
| **URL Parameters** | CRUD-Liste der Query-Parameter-Namen, die bei der Cache-Schlüsselbildung ignoriert werden (Total-KPI, Suche, Export, **+ Add**). Fügen Sie z. B. `utm_source` hinzu, damit Link-Varianten sich einen Cache-Eintrag teilen. |
| **Cache Clearing** | Formular zum Leeren per URL (URL, die mit `/` beginnt, `*` als Platzhalter) sowie die Prüftabelle der Clearing-Logs (KPI-Karten Total / Today / Users; Spalten Id, URL Cleared, Date, User; Offset-Paginierung). Wird 3 Monate aufbewahrt. |

![Tab „Properties“ — vollständige Cache-Größe in der DB, der Umschalter Activate the cache system, cache time in seconds, GET/POST-Request-Typ-Checkboxen und der seitenweise Ausschluss-Baum mit GET/POST-Pills](/screenshots/react/melis-cache-internal/meliscacheinternal-tool-cache-tab-properties.png)

![Tab „Partial Caching“ — KPI-Karten (Total / Manual / Plugin), Suche, Spaltenverwaltung, Export und + Add über der Codes-Tabelle (Id, Partial Caching Code, Type, Module, Controller, Action, Cache lifetime in seconds, Methods)](/screenshots/react/melis-cache-internal/meliscacheinternal-tool-cache-tab-partialcaching.png)

![Tab „URL Parameters“ — das Total-KPI, Suche, Export und + Add über der Tabelle ignorierter Query-Parameter (Id, Parameter), verwendet, um zu verhindern, dass Tracking-Parameter den Cache fragmentieren](/screenshots/react/melis-cache-internal/meliscacheinternal-tool-cache-tab-urlparameters.png)

![Tab „Cache Clearing“ — das Formular zum Leeren per URL (URL, die mit / beginnt, * als Platzhalter) mit KPI-Karten (Total / Today / Users) und die Prüftabelle der Clearing-Logs (Id, URL Cleared, Date, User) mit Paginierung](/screenshots/react/melis-cache-internal/meliscacheinternal-tool-cache-tab-cacheclearing.png)

Häufige Aufgaben: Caching einschalten / TTL festlegen → *Properties → Activate → cache time → GET/POST anhaken →
Save*; verhindern, dass eine Seite zwischengespeichert wird → *Properties → GET/POST für diese Seite im Baum anhaken → Save*; eine
Partial-Regel hinzufügen → *Partial Caching → + Add*; einen Tracking-Parameter ignorieren → *URL Parameters → + Add*; eine
URL sofort leeren → *Cache Clearing → URL eingeben → Clear cache*.

## React-API

Die React-Oberfläche kommuniziert mit einer JSON-API, die von **den eigenen Controllern dieses Moduls** bereitgestellt wird (Unter-Namespace
`MelisCacheInternal\Controller\React`, registriert in `config/module.config.php`) — **nicht**
`melis-react-api`. Basispfad `/melis/MelisCacheInternal/react-api`. Jede Action erweitert
`MelisAbstractActionController`, ist auf `MELIS_KEY = 'MelisCacheInternal_tool'` verschlüsselt, sichert den Zugriff
über `denyUnlessAccess()` + `denyUnlessCan()` ab und gibt `{ success, data, error }` zurück.

| Methode & URL (relativ zur Basis) | Zweck |
| --- | --- |
| `GET /config` | Einstellungen + Cache-Größe + Seitenausschlüsse |
| `POST /config/save` | Einstellungen speichern (Singleton-Upsert) + Seitenausschlüsse in Bulk ersetzen |
| `POST /config/empty-cache` | Gesamten Cache leeren |
| `POST /config/clear-cache` | Nach URL-Muster leeren (kein Log) |
| `GET /page-tree?nodeId=` | Lazy-Seitenbaum für Ausschlüsse (`nodeId=-1` = Wurzel) |
| `GET /partial-caching` · `/stats` · `/:id` | Keyset-Liste · KPI · ein Code |
| `POST /partial-caching/save` · `/delete/:id` | Erstellen / Aktualisieren · einen Code löschen |
| `GET /url-parameters` · `/stats` · `/:id` | Keyset-Liste · KPI · ein Parameter |
| `POST /url-parameters/save` · `/delete/:id` | Erstellen / Aktualisieren · löschen |
| `GET /clearing-logs` · `/stats` | Offset-paginierte Logs · KPI (total / today / users) |
| `POST /clearing-logs/clear-cache` | Nach URL leeren **und protokollieren** |

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

Jeder Fetch sendet `X-Requested-With: XMLHttpRequest`; POSTs mit Body fügen
`Content-Type: application/json` hinzu. Die React-Controller verwenden die Laminas-Services und -Tabellen des Moduls wieder;
die Legacy-Controller betreiben weiterhin die *Old*-Ansicht.

## Berechtigungen

Erweiterte Rechte werden in `config/react.capabilities.php` unter dem rechtetragenden Knoten
`MelisCacheInternal_tool` deklariert (derselbe `melisKey` wie das Manifest, der *Old*-Ansichts-iframe und der Zugriffs-
Guard). Es handelt sich um einen Baum je Tab; `Capabilities::flatten()` wandelt ihn in punktgetrennte Strings um, die React
über `useCaps('MelisCacheInternal_tool').can('…')` liest:

```
MelisCacheInternal_tool
├─ tab "config"   actions: edit                                  (Properties — save settings)
├─ tab "partial"  actions: list · create · edit · delete · export   (Partial Caching CRUD)
├─ tab "params"   actions: list · create · edit · delete · export   (URL Parameters CRUD)
└─ tab "logs"     actions: list · clear · export                 (Cache Clearing — logs + clear by URL)
```

Die Sichtbarkeit der Tabs wird durch `can('config'|'partial'|'params'|'logs')` gefiltert; Aktionen werden je Blatt abgesichert
(z. B. der Save-Button der Konfiguration durch `can('config.edit')`). Jede Server-Aktion ist doppelt abgesichert —
`denyUnlessAccess()` (Authentifizierung + `MelisCoreRights::canAccess`), dann `denyUnlessCan('<leaf>')` — und
`Capabilities` ist bei einem nicht deklarierten Tool/Capability standardmäßig freigebend (default-allow).

## Datenbanktabellen

| Tabelle | Enthält |
| --- | --- |
| `melis_cache` | Cache-Einträge: `mc_page_id`, `mc_cache_url` (normalisiert), `mc_cache_content` (serialisierte Response), `mc_cache_date`, `mc_cache_method_type` (1 GET / 2 POST). |
| `melis_cache_config` | Globale Konfiguration: `mcc_active`, `mcc_time` (TTL in Sekunden), `mcc_request_type` (GET, POST). |
| `melis_cache_exclusions` | Seitenspezifische Ausschlüsse: `mce_page_id`, `mce_request_get`, `mce_request_post`. |
| `melis_cache_partial_codes` | Regeln für Partial-Cache-Zonen: `mcpc_type` (MANUAL/PLUGIN), `mcpc_code`, `mcpc_time` (TTL), `mcpc_module/controller/action`. |
| `melis_cache_partial_general_site_plugins` | Seitenweite Hauptplugin-Konfigurationen: `mcpg_site_id`, `mcpg_page_id`, `mcpg_plugin_*`, `mcpg_cache_code`. |
| `melis_cache_partial_general_site_plugins_exclusion` | Seitenspezifische Plugin-Ausschlüsse vom Caching. |
| `melis_cache_url_parameters` | Ignorierte Query-Parameter-Namen (`mcup_name`). |
| `melis_cache_clearing_logs` | Prüfprotokoll: `mccl_cache_url`, `mccl_user_id`, `mccl_clearing_date`. |

## Beispiel

Den Cache für eine bestimmte Seite programmatisch löschen:

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

## Zentrale Dateien

| Bereich | Pfad |
| --- | --- |
| Modul-Bootstrap (Listener-Verdrahtung) | `vendor/melisplatform/melis-cache-internal/src/Module.php` |
| Modulkonfiguration (Services, Controller, Tabellen-Aliase, React-Routen) | `vendor/melisplatform/melis-cache-internal/config/module.config.php` |
| React-Berechtigungsbaum | `vendor/melisplatform/melis-cache-internal/config/react.capabilities.php` |
| React-API-Controller | `vendor/melisplatform/melis-cache-internal/src/Controller/React/` |
| React-Brick-Quelle / -Build | `vendor/melisplatform/melis-cache-internal/ui-react/` → `public/ui-react/brick.js` + `brick.manifest.json` |
| Vollseiten-Cache-Service | `vendor/melisplatform/melis-cache-internal/src/Service/MelisCacheInternalService.php` |
| Partial-/Zonen-Cache-Service | `vendor/melisplatform/melis-cache-internal/src/Service/PartialCachingService.php` |
| Ausliefer-Listener (Cache-Treffer) | `vendor/melisplatform/melis-cache-internal/src/Listener/MelisCacheInternalPageGetCacheListener.php` |
| Speicher-Listener (Cache-Speicherung) | `vendor/melisplatform/melis-cache-internal/src/Listener/MelisCacheInternalPageSaveCacheListener.php` |
| CMS-Seiten-Invalidierungs-Listener | `vendor/melisplatform/melis-cache-internal/src/Listener/MelisCacheInternalCmsPageListener.php` |
| Datenbankmigrationen | `vendor/melisplatform/melis-cache-internal/install/dbdeploy/` |

## Siehe auch

- [melis-cms](/de/reference/modules/melis-cms) — das CMS, dessen Publish-Events die Cache-Invalidierung auslösen.
- [melis-front](/de/reference/modules/melis-front) — die Render-Pipeline, die MelisCacheInternal umschließt.
- [melis-engine](/de/reference/modules/melis-engine) — der allgemeine Objekt-Cache der Plattform (von diesem Modul verschieden).
- [Modulreferenz](/de/reference/modules) — alle Plattformmodule.
