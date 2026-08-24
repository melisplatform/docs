# MelisCacheInternal

> Caché HTTP de página completa para el front-office del CMS, con caché parcial (por zonas) y exclusiones por página.
> Paquete `melisplatform/melis-cache-internal`.

## Propósito

`MelisCacheInternal` es una capa de rendimiento que se sitúa delante del pipeline de renderizado de MelisFront. Almacena el HTML completamente renderizado (como una respuesta HTTP serializada) de una página publicada y lo sirve en las visitas posteriores, omitiendo por completo el renderizado. Los plugins individuales de una página pueden configurarse para refrescarse con un TTL más corto (caché parcial/por zonas) mientras el resto de la página permanece en caché. Las páginas se invalidan automáticamente al publicar, despublicar o eliminar, y se conserva durante tres meses un registro de auditoría de las purgas manuales de caché. Este módulo es distinto del caché general de objetos clave/valor de MelisEngine: se trata específicamente de un caché HTTP de página completa.

## Activarlo

Añádelo a `config/melis.module.load.php`:

```php
return [
    'MelisCacheInternal',
];
```

Requiere `melisplatform/melis-cms`. El módulo incluye migraciones de base de datos (`dbdeploy: true`) que deben aplicarse en la primera instalación. En el back-office de la v6, la herramienta aparece únicamente cuando el módulo está activado: el host React la descubre a través de su `brick.manifest.json` (consulta [Back-office React](#back-office-react)).

## Servicios clave

Registrados bajo `service_manager` en `config/module.config.php`. Se resuelven con `$sm->get('<alias>')`.

| Alias del servicio | Función |
| --- | --- |
| `MelisCacheInternalService` | Operaciones de caché de página completa: `getCacheConfig()`, `getPageCacheByPageIdAndType($pageId, $uri, $methodType)`, `getPageCacheByUrl()`, `saveItem()`, `deleteCacheByPageId()`, `deleteCacheByUrl()`, `deleteCacheByPageIdOrByUrl()`, `deleteAllCache()`, `getMelisCacheSize()`, `hasCache()`. Dispara los eventos `melis_cache_internal_*_start`/`_end`. |
| `PartialCachingService` | Gestión de caché parcial/por zonas: `getLists()`, `savePartialCaching()`, `deletePartialCaching()`, `getPartialCachingByCode()`, `searchPartialCachingByCode()` y `processedZoneCaching($uri, $response, $pageId, $type)`, el motor de refresco de zonas que vuelve a renderizar únicamente las zonas expiradas al producirse un acierto de caché. |

El back-office React reutiliza estos mismos servicios y tablas, por lo que la ruta React reproduce el comportamiento heredado exacto (la configuración es un upsert singleton, las exclusiones se reemplazan en bloque y `deleteCacheByUrl` gestiona el comodín/REGEXP `*`).

## Mecanismo del ciclo de petición

Los listeners se adjuntan según el modo de renderizado en `Module.php`:

| Listener | Evento | Función |
| --- | --- | --- |
| `MelisCacheInternalPageGetCacheListener` | `MvcEvent::EVENT_DISPATCH` (prioridad 10) | **Servir** — ante un acierto de caché, emite la respuesta almacenada y corta en corto el renderizado (añade la cabecera `Melis-Cache: Hit`). |
| `MelisCacheInternalPageSaveCacheListener` | `MvcEvent::EVENT_FINISH` (prioridad -1001) | **Almacenar** — tras el renderizado, guarda en caché una respuesta 200. |
| `MelisCacheInternalViewResultListener` | `melisengine_melistemplating_view_result_plugin_end` | Envuelve la salida de cada plugin con metadatos de caché parcial (`data-pcache-code`, `data-pcache-gendate`, nombre/id/dbkey del plugin). |
| `MelisCacheInternalCmsPageListener` | `meliscms_page_publish_end` / `…_unpublish_end` / `…_delete_end` | **Invalida** la caché de la página y persiste la configuración de plugins parciales en la página. |
| `MelisCacheInternalDeleteCacheListener` | `melis_cache_delete_cache` | Invalida bajo demanda por `pageId` o `pageUrl`. |
| `MelisCacheInternalSaveEditionSessionListener` | `meliscms_page_savesession_plugin_start` | Guarda en sesión la configuración de caché parcial de un plugin para su publicación. |
| `MelisCacheInternalGetPluginParametersListener` | `melistemplating_plugin_update_parameters` | Inyecta los ajustes de caché parcial en el formulario de edición del plugin en el back-office. |
| `MelisCacheInternalPartialCachingFormConfigListener` | `ModuleEvent::EVENT_LOAD_MODULES_POST` | Añade la pestaña del formulario de caché parcial al modal de cada plugin del front. |
| `MelisCacheInternalFlashMessengerListener` | `meliscacheinternal_save_cache_end` | Flash-messenger y registro de actividad. |

**Clave de caché** = `id de página + URL normalizada + método de la petición` (1 = GET, 2 = POST). URL normalizada significa que los parámetros de URL listados en `melis_cache_url_parameters` se eliminan antes de generar la clave, de modo que los parámetros de seguimiento como `utm_source` no fragmentan la caché. El valor almacenado (`mc_cache_content`) es una respuesta HTTP serializada (cuerpo + cabeceras), no un bloque HTML en bruto. Todos los dispositivos comparten la misma respuesta almacenada (se asume un diseño responsivo).

## Caché parcial (por zonas)

Una página completamente cacheada puede mantener plugins individuales actualizados con un TTL más corto:

- `MelisCacheInternalViewResultListener` envuelve la salida de cada plugin con metadatos `data-pcache-*` (código de caché y fecha de generación) en el momento del renderizado.
- Ante un **acierto** de caché, `PartialCachingService::processedZoneCaching()` analiza esos marcadores y, por cada zona cuyo TTL haya expirado, vuelve a renderizar únicamente esa zona. El tipo `PLUGIN` vuelve a renderizar el plugin de plantilla; el tipo `MANUAL` reenvía a un `module/controller/action` configurado.
- Un **código de caché parcial** (`melis_cache_partial_codes`) define el tipo de la zona, el código, el TTL (`mcpc_time`) y el destino MANUAL.
- La configuración de un **plugin principal** (`melis_cache_partial_general_site_plugins`) es una base a nivel de sitio que se propaga a todas las páginas; las filas `_exclusion` excluyen un plugin de la caché en una página determinada.

## Back-office React

En la v6, la herramienta se distribuye como un **brick nativo íntegramente en React**: una única herramienta del menú izquierdo (**Melis Cache**) cuyas pantallas son **pestañas internas de la herramienta**, no sub-pestañas del host. Se encuentra en **Sidebar → MelisCms → Melis Cache** (`fa fa-bookmark`), montada en `/melis-cms/cache-internal`. La cabecera muestra el subtítulo *"Platform cache management"*, un botón de **refresco** que sigue a la pestaña activa, un botón global **Save** y un conmutador **New / Old**: *New* es la interfaz React (por defecto); *Old* renderiza la herramienta clásica en un iframe persistente (`/melis/react-tool-page?key=MelisCacheInternal_tool`).

Las cuatro pestañas:

| Pestaña | Contenido |
| --- | --- |
| **Properties** | Tamaño total de la caché en la BD, el conmutador *Activate the cache system*, el *cache time in seconds* (TTL), las casillas de tipo de petición GET/POST y el árbol de exclusión de páginas (conmutar GET/POST por página). Se persiste con el botón global **Save** de la cabecera. |
| **Partial Caching** | Lista CRUD de códigos de caché parcial con tarjetas KPI (Total / Manual / Plugin), búsqueda, gestor de columnas, Export y **+ Add**. Columnas: Id, Partial Caching Code, Type, Module, Controller, Action, Cache lifetime in seconds, Methods. |
| **URL Parameters** | Lista CRUD de nombres de parámetros de consulta que se ignoran al generar la clave de caché (KPI Total, búsqueda, Export, **+ Add**). Añade por ejemplo `utm_source` para que las variantes de un enlace compartan una única entrada de caché. |
| **Cache Clearing** | Formulario de purga por URL (URL que empieza por `/`, `*` como comodín) más la tabla de auditoría de registros de purga (tarjetas KPI Total / Today / Users; columnas Id, URL Cleared, Date, User; paginación por offset). Se conserva 3 meses. |

![Pestaña Properties — tamaño total de la caché en la BD, el conmutador Activate the cache system, cache time in seconds, las casillas de tipo de petición GET/POST y el árbol de exclusión por página con las pastillas GET/POST](/screenshots/react/melis-cache-internal/meliscacheinternal-tool-cache-tab-properties.png)

![Pestaña Partial Caching — tarjetas KPI (Total / Manual / Plugin), búsqueda, gestor de columnas, Export y + Add sobre la tabla de códigos (Id, Partial Caching Code, Type, Module, Controller, Action, Cache lifetime in seconds, Methods)](/screenshots/react/melis-cache-internal/meliscacheinternal-tool-cache-tab-partialcaching.png)

![Pestaña URL Parameters — el KPI Total, búsqueda, Export y + Add sobre la tabla de parámetros de consulta ignorados (Id, Parameter), usada para evitar que los parámetros de seguimiento fragmenten la caché](/screenshots/react/melis-cache-internal/meliscacheinternal-tool-cache-tab-urlparameters.png)

![Pestaña Cache Clearing — el formulario de purga por URL (URL que empieza por /, * como comodín) con tarjetas KPI (Total / Today / Users) y la tabla de auditoría de registros de purga (Id, URL Cleared, Date, User) con paginación](/screenshots/react/melis-cache-internal/meliscacheinternal-tool-cache-tab-cacheclearing.png)

Tareas habituales: activar la caché / fijar el TTL → *Properties → Activate → cache time → marcar GET/POST → Save*; impedir que una página se cachee → *Properties → marcar GET/POST para esa página en el árbol → Save*; añadir una regla parcial → *Partial Caching → + Add*; ignorar un parámetro de seguimiento → *URL Parameters → + Add*; purgar una URL ahora → *Cache Clearing → escribir la URL → Clear cache*.

## API React

La interfaz React se comunica con una API JSON servida por **los propios controladores de este módulo** (sub-espacio de nombres `MelisCacheInternal\Controller\React`, registrado en `config/module.config.php`), **no** por `melis-react-api`. Ruta base `/melis/MelisCacheInternal/react-api`. Cada acción extiende `MelisAbstractActionController`, se identifica con la clave `MELIS_KEY = 'MelisCacheInternal_tool'`, protege el acceso mediante `denyUnlessAccess()` + `denyUnlessCan()` y devuelve `{ success, data, error }`.

| Método y URL (relativa a la base) | Propósito |
| --- | --- |
| `GET /config` | Ajustes + tamaño de caché + exclusiones de página |
| `POST /config/save` | Guardar ajustes (upsert singleton) + reemplazar en bloque las exclusiones de página |
| `POST /config/empty-cache` | Vaciar toda la caché |
| `POST /config/clear-cache` | Purgar por patrón de URL (sin registro) |
| `GET /page-tree?nodeId=` | Árbol de páginas perezoso para exclusiones (`nodeId=-1` = raíz) |
| `GET /partial-caching` · `/stats` · `/:id` | Lista por keyset · KPI · un código |
| `POST /partial-caching/save` · `/delete/:id` | Crear / actualizar · eliminar un código |
| `GET /url-parameters` · `/stats` · `/:id` | Lista por keyset · KPI · un parámetro |
| `POST /url-parameters/save` · `/delete/:id` | Crear / actualizar · eliminar |
| `GET /clearing-logs` · `/stats` | Registros paginados por offset · KPI (total / hoy / usuarios) |
| `POST /clearing-logs/clear-cache` | Purgar por URL **y registrarlo** |

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

Cada petición envía `X-Requested-With: XMLHttpRequest`; los POST con cuerpo añaden `Content-Type: application/json`. Los controladores React reutilizan los servicios y tablas Laminas del módulo; los controladores heredados siguen dando servicio a la vista *Old*.

## Capacidades

Los permisos avanzados se declaran en `config/react.capabilities.php` bajo el nodo portador de derechos `MelisCacheInternal_tool` (la misma `melisKey` que el manifiesto, el iframe de la vista *Old* y el guardián de acceso). Es un árbol por pestaña; `Capabilities::flatten()` lo convierte en cadenas con notación de puntos que React lee mediante `useCaps('MelisCacheInternal_tool').can('…')`:

```
MelisCacheInternal_tool
├─ tab "config"   actions: edit                                  (Properties — save settings)
├─ tab "partial"  actions: list · create · edit · delete · export   (Partial Caching CRUD)
├─ tab "params"   actions: list · create · edit · delete · export   (URL Parameters CRUD)
└─ tab "logs"     actions: list · clear · export                 (Cache Clearing — logs + clear by URL)
```

La visibilidad de las pestañas se filtra mediante `can('config'|'partial'|'params'|'logs')`; las acciones se controlan por hoja (por ejemplo, el botón Save de config con `can('config.edit')`). Cada acción del servidor se protege dos veces — `denyUnlessAccess()` (auth + `MelisCoreRights::canAccess`) y luego `denyUnlessCan('<leaf>')` — y `Capabilities` es de permiso por defecto para una herramienta/capacidad no declarada.

## Tablas de base de datos

| Tabla | Contiene |
| --- | --- |
| `melis_cache` | Entradas de caché: `mc_page_id`, `mc_cache_url` (normalizada), `mc_cache_content` (respuesta serializada), `mc_cache_date`, `mc_cache_method_type` (1 GET / 2 POST). |
| `melis_cache_config` | Configuración global: `mcc_active`, `mcc_time` (TTL en segundos), `mcc_request_type` (GET, POST). |
| `melis_cache_exclusions` | Exclusiones por página: `mce_page_id`, `mce_request_get`, `mce_request_post`. |
| `melis_cache_partial_codes` | Reglas de zona de caché parcial: `mcpc_type` (MANUAL/PLUGIN), `mcpc_code`, `mcpc_time` (TTL), `mcpc_module/controller/action`. |
| `melis_cache_partial_general_site_plugins` | Configuraciones de plugin principal a nivel de sitio: `mcpg_site_id`, `mcpg_page_id`, `mcpg_plugin_*`, `mcpg_cache_code`. |
| `melis_cache_partial_general_site_plugins_exclusion` | Exclusiones de plugins de la caché por página. |
| `melis_cache_url_parameters` | Nombres de parámetros de consulta ignorados (`mcup_name`). |
| `melis_cache_clearing_logs` | Registro de auditoría: `mccl_cache_url`, `mccl_user_id`, `mccl_clearing_date`. |

## Ejemplo

Eliminar la caché de una página concreta mediante código:

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

## Archivos clave

| Aspecto | Ruta |
| --- | --- |
| Arranque del módulo (cableado de listeners) | `vendor/melisplatform/melis-cache-internal/src/Module.php` |
| Configuración del módulo (servicios, controladores, alias de tablas, rutas React) | `vendor/melisplatform/melis-cache-internal/config/module.config.php` |
| Árbol de capacidades React | `vendor/melisplatform/melis-cache-internal/config/react.capabilities.php` |
| Controladores de la API React | `vendor/melisplatform/melis-cache-internal/src/Controller/React/` |
| Fuente / build del brick React | `vendor/melisplatform/melis-cache-internal/ui-react/` → `public/ui-react/brick.js` + `brick.manifest.json` |
| Servicio de caché de página completa | `vendor/melisplatform/melis-cache-internal/src/Service/MelisCacheInternalService.php` |
| Servicio de caché parcial/por zonas | `vendor/melisplatform/melis-cache-internal/src/Service/PartialCachingService.php` |
| Listener de servicio (acierto de caché) | `vendor/melisplatform/melis-cache-internal/src/Listener/MelisCacheInternalPageGetCacheListener.php` |
| Listener de almacenamiento (guardado de caché) | `vendor/melisplatform/melis-cache-internal/src/Listener/MelisCacheInternalPageSaveCacheListener.php` |
| Listener de invalidación de página del CMS | `vendor/melisplatform/melis-cache-internal/src/Listener/MelisCacheInternalCmsPageListener.php` |
| Migraciones de base de datos | `vendor/melisplatform/melis-cache-internal/install/dbdeploy/` |

## Véase también

- [melis-cms](/es/reference/modules/melis-cms) — el CMS cuyos eventos de publicación disparan la invalidación de caché.
- [melis-front](/es/reference/modules/melis-front) — el pipeline de renderizado que MelisCacheInternal envuelve.
- [melis-engine](/es/reference/modules/melis-engine) — el caché general de objetos de la plataforma (distinto de este módulo).
- [Referencia de módulos](/es/reference/modules) — todos los módulos de la plataforma.
