# MelisCmsGoogleAnalytics

> Proveedor de Google Analytics 4 (GA4) que convierte la propiedad GA4 configurada de un sitio en curvas de sesiones, totales de KPI y datos demográficos dentro del back-office React de Melis. Paquete `melisplatform/melis-cms-google-analytics`.

## Propósito

MelisCmsGoogleAnalytics lee la propiedad GA4 de un sitio del lado del servidor (mediante `google/apiclient` +
`google/analytics-data`) y la representa como gráficos en el back-office React. Es un proveedor
**únicamente de visualización**: activar GA para un sitio — elegir el proveedor, introducir el **Property ID** y
cargar el **JSON de clave privada** de la cuenta de servicio — se hace en la herramienta **Site analytics**, propiedad de
`melis-cms-page-analytics`, no en este módulo.

El módulo incluye **dos superficies respaldadas por un único componente de panel**:

- Una **pestaña Google Analytics** en el editor de páginas del CMS React, que muestra las estadísticas de GA **para la página abierta**
  (filtradas por la ruta de la página).
- Una **visualización nativa React a nivel de sitio** inyectada en la herramienta **Site analytics**, que muestra las estadísticas de GA
  **para todo el sitio** cuando el *módulo de Analytics* de ese sitio está configurado como Google Analytics.

![Pestaña Google Analytics en el editor de páginas del CMS React — curva de sesiones, tarjetas de KPI y datos demográficos de Idioma/País/Ciudad para la página abierta](/screenshots/react/melis-cms-google-analytics/meliscmsgoogleanalytics-pageedition-tab-googleanalytics.png)

![Visualización de Google Analytics a nivel de sitio en la herramienta Site analytics — el mismo panel de GA4 aplicado a todo el sitio](/screenshots/react/melis-cms-google-analytics/meliscmsgoogleanalytics-tool-tab-analytics.png)

## Activarlo

El módulo es detectado por el host React en el arranque mediante `GET /melis/react-api/react-modules`, que
lista los módulos activos que incluyen un `brick.manifest.json`. Desactivar el módulo elimina ambas superficies.

Dependencias de Composer: `google/apiclient ^2.15`, `google/analytics-data ^0.16.0`, `melis-core`,
`melis-cms`, `melis-cms-page-analytics`.

## El brick React

Es un **brick de PESTAÑA del editor de páginas** (solo widget): **no tiene herramienta en el menú lateral**, **no tiene ruta** y
**no tiene `react-api.php`**. El manifiesto adopta la forma multi-brick con una única entrada que solo contiene el id, de modo que el
host carga el bundle en el arranque y el brick se autorregistra pronto.

```json
{ "entry": "brick.js", "bricks": [ { "id": "cms-google-analytics" } ] }
```

`brick.tsx` no llama a `__melisRegisterBrick`; en su lugar realiza dos registros en
el momento de evaluación del módulo:

```tsx
// 1) Contribute a tab to the CMS page editor (owned by the CmsPage brick).
registerPageTab('melis_cms_google_analytics_page_tab', GoogleAnalyticsPageTab)

// 2) Register the native site-level display for the PageAnalytics host to mount by key.
;(window.__melisAnalyticsSiteDisplays ||= {})['melis_cms_google_analytics'] = GoogleAnalyticsSiteDisplay
window.dispatchEvent(new CustomEvent('melis:analytics-site-display-registered'))
```

| Componente | Rol |
| --- | --- |
| `brick.tsx` | Solo registro — añade la pestaña de página y la visualización de sitio; sin brick enrutado. |
| `GoogleAnalyticsPage.tsx` (`GoogleAnalyticsPageTab`) | Pestaña del editor de páginas. Recibe `{ idPage }`, resuelve el sitio + la ruta de la página mediante `getPageContext` y luego monta el panel con `siteId` + `pagePath`. |
| `GoogleAnalyticsSiteDisplay.tsx` | El panel: selector de rango de fechas, gráfico de sesiones SVG en línea, tarjetas de KPI, tres tablas de datos demográficos. Reutilizado por ambas superficies (`pagePath` presente ⇒ ámbito de página, ausente ⇒ todo el sitio). |

Como React está externalizado a variables globales del host, el bundle no puede importar módulos del host, de ahí los
**estilos en línea**, la **i18n `{fr,en}` incluida en el propio archivo** (a partir de `document.documentElement.lang`) y un
**gráfico SVG dibujado a mano** (sin librería de gráficos). El SDK de Google nunca se usa del lado del cliente.

## El panel

Ambas superficies representan el mismo panel:

- **Control de rango de fechas** — **7 días** / **30 días** / **Personalizado** (selectores de fecha de inicio y fin +
  **Aplicar**) y un botón de **actualizar**. La fecha de fin es hoy por defecto (incluye el mismo día de GA4).
- **Sesiones durante el periodo** — un gráfico de líneas/áreas de las sesiones por día.
- **Tarjetas de KPI** — Sesiones, Usuarios, Vistas de página, Páginas/Sesión, Duración media de la sesión, Tasa de rebote.
- **Datos demográficos** — tres tablas (Idioma, País, Ciudad), cada una ordenada por sesiones con un porcentaje de participación.

Si GA no está configurado para el sitio o la API falla, se muestra un cuadro de error rojo con el mensaje del backend
(p. ej. "GA settings incomplete") en lugar de los gráficos.

**Cómo encontrarlo:** por página → **MelisCms** → abrir una página → pestaña **Google Analytics**. Por sitio →
**MelisMarketing** → **Site analytics** → seleccionar el sitio → subpestaña **Analytics**. GA se activa para
un sitio en **Site analytics → Settings** (módulo de Analytics = Google Analytics, Property ID, carga del JSON de
clave privada, script de analítica personalizado opcional).

![Subpestaña Settings de Site analytics — módulo de Analytics configurado como Google Analytics, Property ID, carga del JSON de clave privada y script de analítica personalizado](/screenshots/react/melis-cms-google-analytics/meliscmsgoogleanalytics-tool-tab-settings.png)

## Endpoints de datos

El módulo **no tiene `config/react-api.php`**. La interfaz React llama al ya existente
`GoogleAnalyticsController` (ruta `application-MelisCmsGoogleAnalytics/default`, `ViewJsonStrategy`).

| Método y URL | Acción | Propósito |
| --- | --- | --- |
| `GET /melis/MelisCmsGoogleAnalytics/GoogleAnalytics/getPageContext?idPage=<id>` | `getPageContextAction` | Resuelve el sitio y la ruta a los que pertenece una página → `{ success, siteId, pagePath, pageURL }`. |
| `POST /melis/MelisCmsGoogleAnalytics/GoogleAnalytics/getChartData` | `getChartDataAction` | Obtiene los datos de GA4 de un sitio (opcionalmente una ruta de página) → `{ success, chartData, errors }`. |

El cuerpo de `getChartData` está codificado como formulario:

```ts
const body = new URLSearchParams()
body.set('siteId', String(siteId))
body.set('dateRange[option]', option)          // '7days' | '30days' | 'custom'
body.set('dateRange[startDate]', startDate)    // '7daysAgo' | '30daysAgo' | 'YYYY-MM-DD'
body.set('dateRange[endDate]', endDate)        // 'today' | 'YYYY-MM-DD'
body.set('dateRange[clientTimestamp]', String(Date.now()))
if (pagePath) body.set('pagePath', pagePath)   // page tab only → GA4 dimensionFilter on pagePath
```

Forma de `chartData` que consume la interfaz:

- `chartData.date.totals{}` → valores de KPI (`sessions`, `activeUsers`, `screenPageViews`,
  `screenPageViewsPerSession`, `averageSessionDuration`, `bounceRate`).
- `chartData.date.plot{ <tsSeconds>: { sessions } }` → la curva de sesiones (las claves son segundos).
- `chartData.language / .country / .city` → las tablas de datos demográficos (`{ value: { sessions } }`).

Del lado del servidor, `getChartDataAction` llama a los servicios de GA4 (`GoogleAnalytics4APIService` /
`MelisCmsGoogleAnalyticsService`, con alias en `module.config.php`), que usan el Property ID del sitio
y el JSON de clave privada y normalizan las filas de GA4 en `chartData`. Ante un fallo de la API, la acción devuelve un
limpio `{ success:false, errors }` en lugar de un 500.

## Capacidades

Declaradas en `config/react.capabilities.php` y fusionadas por `Module::getConfig()`. Como el módulo
aporta una pestaña a la herramienta de página del CMS, declara su capacidad bajo el nodo compartido portador de derechos
**`meliscms_page`** (un `ArrayUtils::merge` integra los `tabs[]` en las capacidades de la herramienta de página del CMS):

```php
return [
  'melisReactToolCapabilities' => [
    'meliscms_page' => [
      'tabs' => [
        ['key' => 'melis_cms_google_analytics_page_tab', 'label' => 'tr_melis_cms_google_analytics'],
      ],
    ],
  ],
];
```

- La `key` **debe ser igual** a la clave que se pasa a `window.__melisRegisterPageTab` en `brick.tsx` — *es*
  la capacidad de la pestaña. Sin ella, la lista blanca de capacidades de la página del CMS oculta el botón de la pestaña incluso para un administrador.
- **No hay ninguna capacidad de backend** que declarar: el módulo no expone ninguna acción de `react-api`. El acceso está
  controlado por el acceso al editor de páginas del CMS (pestaña de página) y a la herramienta Site analytics (visualización de sitio).

## Integración con el host

- **Puente de pestaña de página (`__melisRegisterPageTab`)** — proporcionado por el brick CmsPage. Ambos bricks comparten
  una protección idempotente: quien cargue primero crea `window.__melisPageTabRegistry` y define el
  registrador. CmsPage lee `tabs['melis_cms_google_analytics_page_tab']` y representa el componente
  con `{ idPage }`; el botón aparece solo si la capacidad está concedida.
- **Puente de visualización de sitio (`__melisAnalyticsSiteDisplays`)** — proporcionado/consumido por la herramienta
  *Site analytics* de `melis-cms-page-analytics`. El brick registra su componente bajo la clave
  `melis_cms_google_analytics` (coincidiendo con el `pad_analytics_key` almacenado del sitio) y dispara
  `melis:analytics-site-display-registered`. El host lo monta (con `{ siteId }`) en la subpestaña Analytics
  cuando el *módulo de Analytics* del sitio = Google Analytics — sustituyendo el antiguo iframe por
  React nativo.
- **Las partes genéricas permanecen en el host.** El armazón de la pestaña del editor de páginas, la herramienta Site analytics, el selector
  de sitios y el formulario de Settings pertenecen a MelisCms / MelisCmsPageAnalytics; este módulo solo rellena
  la visualización de *Google Analytics*.

## Archivos clave

| Aspecto | Ruta |
| --- | --- |
| Rutas / alias de servicios de GA | `config/module.config.php` |
| Capacidades React (`meliscms_page.tabs[]`) | `config/react.capabilities.php` |
| Controlador (`getPageContextAction`, `getChartDataAction`) | `src/Controller/GoogleAnalyticsController.php` |
| Fuente del brick React (Vite IIFE) | `ui-react/src/brick.tsx`, `GoogleAnalyticsPage.tsx`, `GoogleAnalyticsSiteDisplay.tsx` |
| Brick compilado + manifiesto | `public/ui-react/brick.js`, `public/ui-react/brick.manifest.json` |

Véase también: [melis-cms-page-analytics](/es/reference/modules/melis-cms-page-analytics) ·
[melis-cms](/legacy/reference/modules/melis-cms) ·
[melis-core](/legacy/reference/modules/melis-core)
