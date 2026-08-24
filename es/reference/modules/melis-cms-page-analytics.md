# MelisCmsPageAnalytics

> Analítica básica de visitas de páginas para sitios CMS — registra las vistas de página y permite a
> un sitio conectar un proveedor de analítica externo (por ejemplo, Google Analytics), ahora
> gestionado desde un back-office React nativo.
> Paquete `melisplatform/melis-cms-page-analytics`.

## Propósito

`MelisCmsPageAnalytics` es el rastreador de vistas de página integrado en la plataforma. En cada
renderizado de página del front-office registra una visita deduplicada (una vez por sesión, por
página y por día) en `melis_cms_page_analytics`, y expone los datos en el back-office como una
herramienta de sitio **Page Analytics** y una pestaña **Page Analytics** en cada página CMS. Por
sitio también puedes almacenar una clave de proveedor de analítica y un fragmento de JavaScript que
el módulo inyecta en el `<head>` de la página en el momento del renderizado — el hook utilizado por
proveedores complementarios como Google Analytics.

En v6 el back-office es un **brick full-React nativo**: una tabla de visitas de solo lectura más un
panel de configuración, que invoca una capa JSON `react-api`. El rastreo, el contrato del proveedor y
la persistencia de la configuración no han cambiado — v6 solo reemplaza la capa de visualización.

## Activarlo

Añade a `config/melis.module.load.php`:

```php
return [
    'MelisCmsPageAnalytics',
];
```

Dependencias de Composer requeridas: `melisplatform/melis-core` y `melisplatform/melis-cms`. El
módulo también depende de los servicios `melis-engine` y `melis-front` en tiempo de ejecución (árbol,
tablas de páginas, eventos de despacho del front). Las tablas de la base de datos se instalan mediante
`MelisSetupController` desde `install/sql/`. El brick React aparece en el menú solo mientras el módulo
figure en `melis.module.load.php` (descubrimiento modular de bricks).

## Servicios clave

Registrados como alias de `service_manager` en `config/module.config.php`:

| Alias de servicio | Rol |
| --- | --- |
| `MelisCmsPageAnalyticsService` | Servicio principal que implementa el contrato del proveedor. `getAnalytics($siteId)` lee la clave del proveedor activo desde `melis_cms_page_analytics_data` y la fila de configuración correspondiente desde `melis_cms_page_analytics_data_settings`. |
| `MelisCmsDefaultPageAnalyticsService` | Registrador integrado. `saveAnalyticsData($pageId)` resuelve el sitio, confirma que la página está activa/publicada e inserta una fila deduplicada en `melis_cms_page_analytics` — salvo que haya configurados un view id y un token de Google Analytics, en cuyo caso el contador integrado se aparta. |
| `MelisCmsPageAnalyticsTable` | Table gateway para el registro de visitas. |
| `MelisCmsPageAnalyticsDataTable` | Table gateway para la selección de proveedor por sitio. |
| `MelisCmsPageAnalyticsDataSettingsTable` | Table gateway para la configuración por (sitio, proveedor). |

Ambos servicios principales disparan eventos de inicio/fin: `melis_cms_default_page_analytics_save_start` /
`melis_cms_default_page_analytics_save_end`.

## Front office

No hay view helper ni plugin de plantillas. El rastreo y la inyección de script los gestiona
`MelisCmsPageAnalyticsListener` (adjuntado en `Module.php`), que se engancha a dos eventos en el
pipeline de renderizado del front:

| Evento | Prioridad | Acción |
| --- | --- | --- |
| `melisfront_site_dispatch_ready` | `-10000` | Solo renderizados del front — invoca `MelisCmsDefaultPageAnalyticsService::saveAnalyticsData($pageId)` para registrar la visita deduplicada. |
| `melis_front_layout` | por defecto | Lee el fragmento `pads_js_analytics` configurado del sitio y lo inyecta antes de `</head>` en el HTML renderizado. |

## Tablas de la base de datos

| Tabla | PK | Contiene |
| --- | --- | --- |
| `melis_cms_page_analytics` | `ph_id` | Registro de visitas (hits deduplicados): `ph_page_id`, `ph_session_id`, `ph_date_visit`, `ph_site_id`. No se almacena ninguna dirección IP. |
| `melis_cms_page_analytics_data` | `pad_id` | Selección de proveedor por sitio: `pad_site_id`, `pad_analytics_key`. |
| `melis_cms_page_analytics_data_settings` | `pads_id` | Configuración por (sitio, proveedor): `pads_site_id`, `pads_analytics_key`, `pads_js_analytics`, `pads_settings` (por ejemplo, `google_analytics_view_id`). |

## Back-office React

La herramienta es un **brick full-React nativo** con un conmutador **New / Old** que puede recurrir a
la herramienta heredada en un iframe. Se ubica en la barra lateral bajo **Marketing / Site Tools →
Page Analytics** y se abre con dos pestañas internas, **Analytics** y **Settings**.

| Propiedad del brick | Valor |
| --- | --- |
| Brick id | `pageanalytics` |
| `route` del manifiesto | `/melis-marketing/meliscms-page-analytics` |
| `forwardKey` | `MelisCmsPageAnalytics/MelisCmsPageAnalyticsTool` |
| `melisKey` (destino del iframe de la vista Old) | `meliscms_page_analytics_display` |
| Nodo de control de acceso (controlador) | `meliscms_page_analytics_tools_section` |
| Base de la API | `/melis/react-api/page-analytics` |

- **Pestaña Analytics** — una tabla de solo lectura de visitas **agregadas por página** (id de
  página, nombre de página, número de visitas, última visita) con tarjetas KPI (hits / páginas /
  sitios / última visita), un filtro por sitio, búsqueda, un gestor de columnas, scroll infinito,
  ordenación del lado del servidor y **Export**. Las páginas eliminadas muestran una etiqueta en
  cursiva *(deleted)*. Si al sitio seleccionado se le ha asignado un proveedor externo que incluye su
  propia visualización React, la pestaña aloja **el dashboard de ese módulo** en lugar de la tabla
  integrada.
- **Pestaña Settings** — selecciona un **Site** y luego un **Analytics module** (la opción integrada
  "no analytics" más cada proveedor activo). Los campos propios del módulo elegido se renderizan de
  forma orientada a datos (text / textarea / select / password / file, por ejemplo una clave privada
  de Google Analytics). Los administradores de la plataforma también pueden editar el fragmento JS
  personalizado del `<head>`; los no administradores lo ven en solo lectura.

> Las capturas de pantalla React de estas pantallas aún no están disponibles.

## API React

Las rutas se definen en `config/react-api.php` y se fusionan en la configuración del módulo. El
contrato es `{ success, data, error }`; cada petición envía `X-Requested-With: XMLHttpRequest` y
`credentials: 'include'`. Dos controladores respaldan la UI: `MelisReactApiPageAnalyticsController` (la
herramienta) y `MelisReactApiPageAnalyticsTabController` (la pestaña del editor de páginas CMS).

| Método y URL | Propósito |
| --- | --- |
| `GET /melis/react-api/page-analytics` | Visitas agregadas por página (keyset: `limit`, `search`, `site`, `sort`, `dir`, `after`) → `{items,total,nextCursor}`, cada elemento `{pageId,pageName,count,lastVisit}`. |
| `GET /melis/react-api/page-analytics/stats` | KPI `{hits, pages, sites, lastVisit}` (respeta `search`/`site`). |
| `GET /melis/react-api/page-analytics/sites` | Opciones de sitio `{sites:[{id,name}]}` para el selector. |
| `GET /melis/react-api/page-analytics/settings` | Estado de la pestaña Settings (lista de módulos + esquema de formulario orientado a datos + valores actuales). |
| `GET /melis/react-api/cms-page/analytics` | Visitas de una única página (`idPage`, `page`, `perPage`) → `{visits, sessions, lastVisit, recent, page, perPage, recentTotal}`. |

El controlador de la herramienta lee las tablas directamente mediante SQL parametrizado
(`melis_cms_page_analytics` unida a `melis_cms_page_published` para los nombres y `melis_cms_site`
para el selector, cursor keyset opaco). Protege el acceso en el nodo con derechos
`meliscms_page_analytics_tools_section` — **no** en el `melisKey` del manifiesto
(`meliscms_page_analytics_display`), que es únicamente la clave de zona del iframe de la vista Old.

**Escribir la configuración no es una ruta react-api** — el panel Settings envía por POST una carga
`FormData` a la acción de la herramienta heredada, de modo que toda la lógica del lado del servidor
(validación Laminas, subida de clave GA, serialización de `pads_settings`, guarda de administrador
sobre el JS en bruto, flash messenger) se reutiliza literalmente:

```ts
const LEGACY_SAVE_URL = '/melis/MelisCmsPageAnalytics/MelisCmsPageAnalyticsTool/save'
await fetch(LEGACY_SAVE_URL, {
  method: 'POST',
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
  credentials: 'include',
  body: formData,
}) // → { success, textTitle, textMessage, errors }
```

## Pestaña y capacidades de la página CMS

El módulo aporta una pestaña **Page Analytics** al editor de páginas CMS, respaldada por
`GET /melis/react-api/cms-page/analytics` (total de visitas, sesiones distintas, última visita y una
lista paginada de fechas de visitas recientes de esa página). La pestaña se declara en
`config/react.capabilities.php` bajo el nodo compartido `meliscms_page`, y la clave
`meliscms_page_analytics_tab` **es** la cadena de capacidad utilizada para controlarla en Users →
Rights:

```php
'melisReactToolCapabilities' => [
  'meliscms_page' => [
    'tabs' => [
      ['key' => 'meliscms_page_analytics_tab', 'label' => 'tr_melis_cms_page_analytics_title'],
    ],
  ],
],
```

## Visualización modular a nivel de sitio

Cuando a un sitio se le asigna un módulo de analítica externo que declara una visualización React (por
ejemplo, **MelisCmsGoogleAnalytics** mediante `react_display_key`), la pestaña Analytics aloja la
visualización React propia de ese módulo en lugar de la tabla de visitas nativa. El brick consume un
registro global, `window.__melisAnalyticsSiteDisplays[<analyticsKey>]`; vuelve a comprobarlo en el
evento de ventana `melis:analytics-site-display-registered` (los bundles se cargan de forma asíncrona)
y, si no hay nada registrado, recurre a un iframe
`/melis/react-tool-page?key=<displayKey>&siteId=<site>`.

## Ejemplo

```php
// Read the active analytics provider config for a site
$analytics = $serviceManager->get('MelisCmsPageAnalyticsService')->getAnalytics($siteId);

// Read recorded visits for a specific page (used by the Page Analytics tab)
$visits = $serviceManager->get('MelisCmsPageAnalyticsTable')->getDataByPageId($pageId);
```

El registro de visitas ocurre automáticamente en el renderizado del front a través del listener;
normalmente no es necesario invocar `saveAnalyticsData()` directamente.

## Archivos clave

| Aspecto | Ruta |
| --- | --- |
| Bootstrap del módulo / registro del listener | `vendor/melisplatform/melis-cms-page-analytics/src/Module.php` |
| Rutas, servicios, alias de tablas, controladores | `vendor/melisplatform/melis-cms-page-analytics/config/module.config.php` |
| Rutas de la API React | `vendor/melisplatform/melis-cms-page-analytics/config/react-api.php` |
| Capacidad de la pestaña React | `vendor/melisplatform/melis-cms-page-analytics/config/react.capabilities.php` |
| Brick React + manifiesto | `vendor/melisplatform/melis-cms-page-analytics/public/ui-react/` |
| Fuentes React | `vendor/melisplatform/melis-cms-page-analytics/ui-react/src/` |
| Controladores de la API React | `vendor/melisplatform/melis-cms-page-analytics/src/Controller/MelisReactApiPageAnalyticsController.php`, `MelisReactApiPageAnalyticsTabController.php` |
| Contrato del proveedor | `vendor/melisplatform/melis-cms-page-analytics/src/Service/MelisCmsPageAnalyticsServiceInterface.php` |
| Servicio principal de analítica | `vendor/melisplatform/melis-cms-page-analytics/src/Service/MelisCmsPageAnalyticsService.php` |
| Registrador integrado | `vendor/melisplatform/melis-cms-page-analytics/src/Service/MelisCmsDefaultPageAnalyticsService.php` |
| Listener del front (rastreo + inyección) | `vendor/melisplatform/melis-cms-page-analytics/src/Listener/MelisCmsPageAnalyticsListener.php` |
| Table gateways | `vendor/melisplatform/melis-cms-page-analytics/src/Model/Tables/` |
| SQL de instalación de la BD | `vendor/melisplatform/melis-cms-page-analytics/install/sql/` |

Consulta también: [melis-cms](/es/reference/modules/melis-cms), [melis-core](/es/reference/modules/melis-core)
