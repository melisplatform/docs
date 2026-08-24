# MelisReactOverride

> Infraestructura de back-office React: renderiza las herramientas heredadas dentro del contenedor `/melis-react` y sirve la SPA de React. Paquete `melisplatform/melis-react-override`.

## Propósito

MelisReactOverride es un **módulo de infraestructura del back-office React** — no una herramienta. No incluye
ningún brick, ninguna página React, ningún endpoint `react-api` ni pantalla propia. Proporciona los dos
mecanismos de fontanería que permiten que el back-office React (`/melis-react`) funcione junto al
`/melis` heredado:

1. **Mecanismo de iframe para herramientas heredadas** — cualquier herramienta heredada jQuery/AJAX que no tenga una página React
   dedicada se renderiza como una página HTML independiente (`/melis/react-tool-page?key=<melisKey>`) y se muestra
   dentro del contenedor React en un `<iframe>`. La herramienta dentro del marco tiene el mismo aspecto y comportamiento
   que un acceso directo a `/melis`: sus propios DataTables, formularios, modales, pestañas, botones de guardado y notificaciones nativas
   (avisos gritter, modales de validación por campo).
2. **Ruta de reserva de la SPA** — sirve el `index.html` del contenedor React para `/melis-react` y cada
   enlace profundo del lado del cliente bajo él, y hace pública esa ruta (más algunos endpoints de arranque de solo lectura).

Nunca navegas *hacia* este módulo. Regla general: si estás dentro de `/melis-react` mirando una
pantalla de herramienta de estilo antiguo (Bootstrap clásico), estás viendo una página producida por
MelisReactOverride.

## Cómo activarlo

Es un módulo Laminas MVC puramente del lado del servidor, cargado mediante `application.config.php` (`module_paths` +
`modules`) — `src/Module.php` autocarga `MelisReactOverride\*` desde `src/` a través de
`StandardAutoloader`. Categoría `core`.

**Sobrescribe el controlador `PluginView` de MelisCore** con una versión compatible con React mediante un
alias `controllers.invokables`. Como este módulo se carga *después* de melis-core, el alias gana la
fusión de configuración de Laminas:

```php
'controllers' => [
    'invokables' => [
        'MelisCore\Controller\PluginView'   => \MelisReactOverride\Controller\PluginViewController::class,
        'MelisReactOverride\Controller\Spa' => \MelisReactOverride\Controller\SpaController::class,
    ],
],
```

## De un vistazo

| Propiedad | Valor |
| --- | --- |
| Nombre del módulo | `MelisReactOverride` |
| Paquete | `melisplatform/melis-react-override` |
| Categoría | `core` |
| Brick / `ui-react/` / `react-api.php` | **ninguno** (solo infraestructura) |
| Controladores | `PluginViewController` (con alias sobre `MelisCore\Controller\PluginView`), `SpaController` |
| Servicios | `PlatformAssetsService`, `LegacyWidgetCssService` |
| Punto de extensión | `PluginViewToolPageExtensionInterface` (hook `toolpage_extensions`) |

## Rutas

Todas las rutas de herramienta/iframe son rutas hijas de `melis-backoffice`, por lo que residen bajo `/melis`. La
ruta de la SPA es una ruta regex de nivel superior.

| Nombre de ruta | URL | Acción | Propósito |
| --- | --- | --- | --- |
| `melis-backoffice/react-tool-page` | `/melis/react-tool-page` | `toolPage` | **Mecanismo central.** Renderiza una zona de herramienta heredada como una página HTML independiente para un iframe. Recibe `?key=<melisKey>` (y `?idPage=<id>` para el editor de páginas del CMS). |
| `melis-backoffice/react-dashboard-plugin` | `/melis/react-dashboard-plugin` | `dashboardPluginPage` | Un único plugin de dashboard heredado como página independiente mínima. |
| `melis-backoffice/react-dashboard-plugin-config` | `/melis/react-dashboard-plugin-config` | `dashboardPluginConfigPage` | El formulario de configuración de un plugin de dashboard (botón de engranaje) como HTML independiente. |
| `melis-backoffice/react-dashboard-plugin-config-data` | `/melis/react-dashboard-plugin-config-data` | `dashboardPluginConfigData` | JSON: el formulario de configuración como datos (pestañas + campos tipados + valores) para que React lo renderice de forma nativa. |
| `melis-backoffice/react-dashboard-plugin-config-save` | `/melis/react-dashboard-plugin-config-save` | `dashboardPluginConfigSave` | POST: valida + persiste la configuración de un plugin de dashboard. |
| `melis-backoffice/react-dashboard-plugin-content` | `/melis/react-dashboard-plugin-content` | `dashboardPluginContent` | JSON: HTML + scripts + jsCallbacks para inyección directa en el DOM (sin iframe). |
| `melis-backoffice/react-platform-bundle` | `/melis/react-platform-bundle` | `platformBundle` | Sirve el bundle de recursos concatenado con el tipo MIME correcto (reemplaza a `/melis/get-{css,js}-bundles` de MelisCore, que responden con un `text/html` vacío cuando falta el bundle). |
| `melis-backoffice/react-legacy-widget-css` | `/melis/react-legacy-widget-css` | `legacyWidgetCss` | Hojas de estilo del back-office heredado, con cada regla acotada bajo `.melis-legacy-widget`. |
| `meliscore-melis-react-spa` | `/melis-react`, `/melis-react/*` | `spa` | **Reserva de la SPA.** Sirve el `index.html` del contenedor React. Ruta regex, `priority => 1000`. |

### Rutas públicas (`excluded_routes`)

El módulo añade a `plugins.meliscore.datas.excluded_routes` de MelisCore (los arrays numéricos se fusionan
por adición) para que `MelisCore\Module::checkIdentity()` deje pasar estas rutas sin redirigir a
`/melis/login`:

- `meliscore-melis-react-spa` — el contenedor es público porque la aplicación React gestiona su propia
  autenticación (pantalla de inicio de sesión propia).
- `melis-backoffice/react-platform-bundle` — para que una sesión expirada no redirija una hoja de estilo
  a una página HTML de inicio de sesión (el error MIME exacto que corrige esta ruta).
- `melis-backoffice/melis-react-api/platformscheme-react-get` — la marca del panel de inicio de sesión, leída antes
  de la autenticación (solo GET).
- `melis-backoffice/melis-react-api/langs` — la lista de idiomas del back-office que la SPA carga al arrancar,
  incluso en la pantalla de inicio de sesión (solo lectura).

> Las dos últimas son rutas `melis-react-api` (propiedad de **MelisReactApi**); MelisReactOverride solo
> las hace públicas, no las define.

## El mecanismo de iframe — `toolPageAction()` → `buildToolPage()`

`PluginViewController::toolPageAction()` resuelve un melisKey, renderiza su zona y pasa el HTML
a `buildToolPage()` para ensamblar un documento independiente. Flujo:

1. **Guardián de autenticación** — `denyIfUnauthenticated()` se ejecuta primero (esta página *no* es pública).
2. **Resolver melisKey → ruta appConfig** — `MelisCoreConfig->getMelisKeys()` mapea `?key=` a una
   ruta de configuración de app; el último segmento es la clave de vista.
3. **Forzar el modo XHR** — añade `X-Requested-With: XMLHttpRequest` para que `generateRec()` renderice las zonas
   con `follow_regular_rendering:false`, igual que hace la ruta AJAX clásica (de lo contrario esas
   herramientas caen al front y renderizan un "404 MelisDemoCms").
4. **Fijar el id de sesión de PHP** — captura antes de renderizar, restaura después (algunas herramientas heredadas rotan
   el id de sesión durante el renderizado — inofensivo en `/melis`, fatal aquí).
5. **Renderizar la zona** con `generateRec()` + `renderViewRec()`, capturando cualquier salida perdida que una
   zona emita con `echo` al flujo (mantenida fuera del marcado como un comentario HTML para diagnóstico).
6. **Ejecutar las extensiones `adjustToolHtml()`** (`toolpage_extensions`) sobre el HTML renderizado.
7. **Construir los recursos de plataforma** mediante `PlatformAssetsService::build()` e inyectar los
   `ressources` JS/CSS propios del módulo.
8. **Ejecutar las extensiones `adjustToolAssets()`** (pueden mover algún JS del módulo al bucket del `<head>` y
   devolver `skipJsRoots` para que el bucle genérico no lo cargue por duplicado).
9. **Ensamblar** `buildToolPage($html, $jsCallBacks, $assets, $zoneId, $key)` y devolver como
   `text/html` con `X-Frame-Options: SAMEORIGIN`.

### Problemas que `buildToolPage()` resuelve

- **Neutralizar la protección "Remove Envato Frame" de bundle.js** — dentro de un iframe con sandbox, la protección
  lanza un `SecurityError` que mata a bundle.js. La página captura el padre real
  (`window.__melisRealParent`) y luego redefine `window.parent`/`window.top` para que devuelvan `window`.
- **Cargar `melisDataTable.js` por separado** — declarado en `app.interface.php` pero ausente de
  `bundle.js`; añadido a la cola JS (expone `window.melisDataTable`).
- **Shim global `Proxy`** — para objetos definidos solo dentro del `$(function(){…})` de bundle.js y que aún
  no están disponibles cuando se parsean los scripts síncronos del cuerpo de una herramienta, un `Proxy` sin efecto
  evita errores tempranos.
- **Envolver los jsCallbacks en try/catch** — un callback cuya dependencia no se carga de forma independiente no
  romperá la página.
- **Inyectar los `ressources` JS/CSS del módulo** — el `bundle.js` central solo contiene herramientas de MelisCore;
  las herramientas de los módulos incluyen sus propios ficheros (p. ej. `news.tool.js` → `window.initNewsList`). El
  controlador recopila cada raíz que la herramienta necesita — su propia raíz de plugin, las raíces alcanzadas por enlaces
  `type` (recorridas recursivamente, con protección contra ciclos) y los nodos de módulo `forward`, además de algunas raíces
  adicionales para editores compuestos conocidos (p. ej. `meliscms_page`), todo restringido para que los módulos inactivos no carguen nada.
- **Orden del JS de cabecera vs. final del cuerpo** — el JS de plataforma se carga en el `<head>`; los `ressources` del módulo se cargan
  dentro del `<body>` después de la barra de pestañas pero antes del HTML de la herramienta, reflejando el BO clásico.
- **Contenedor de pestañas del editor** — incluye los anclajes de pestañas clásicos (`#melis-id-nav-bar-tabs` oculto,
  `#melis-id-body-content-load`, `activeTabId` global) para que los flujos de edición clásicos funcionen.
- **`<base href="/">`** para que las URLs AJAX relativas de la herramienta se resuelvan desde la raíz del sitio.
- **Punto de montaje de modales `#melis-modals-container`** más un observador de autorreparación para fondos de modal perdidos.
- **Corrección de exportación** — revincula `melisCoreTool.exportData()` a un clic de anclaje dentro del marco (el
  popup `window.open` heredado nunca completa la descarga en un iframe con sandbox).
- **Puente de pestañas de herramienta y postMessage de resultado** — la barra de pestañas oculta se refleja al host mediante
  `postMessage({ __melisToolTabs, … })`; se publica un mensaje `{ __melisToolResult, url, data }`
  tras un guardado JSON para que el host pueda reaccionar estructuralmente. No se transmite ninguna notificación visible — las herramientas
  heredadas conservan su propia retroalimentación nativa.

## Recursos de plataforma — `PlatformAssetsService`

`PlatformAssetsService::build($sm)` devuelve `['css' => …, 'js' => …, 'inline' => …]`, la lista de
recursos de plataforma con la que arranca cada iframe de herramienta:

- **CSS** — todos los ficheros `bundle.css` de los módulos (cargados en paralelo), precedidos por Google Fonts y
  `/assets/css/schemes.css`, filtrados a los ficheros que existen en disco.
- **Cola JS** (el orden importa) — `get-translations?locale=…`, `MelisCore/build/js/bundle.js`, luego
  los extras no incluidos en el bundle: `melisDataTable.js`, `loader.js`, `findpage.tool.js`,
  `bootstrap-tagsinput.js`, `typeahead.bundle.js`, `moment/fr.js`, `melis_tinymce.js`.
- **Globales inline** — `basePath`, `primaryColor`, … leídos del esquema de plataforma activo
  (`MelisCorePlatformSchemeService`), con los colores predeterminados de Melis como reserva.
- **Caché del bundle / autorreparación** — la costosa llamada `MelisAssetManagerWebPack->getAssets(true)`
  se almacena en caché (fichero temporal, TTL de 600 s + memo en proceso); si la herramienta Modules eliminó
  `etc/bundles/`, se regenera bajo un bloqueo de escritor único, o la ruta concatenada se sustituye
  por `/melis/react-platform-bundle`.
- **`bust($url)`** añade `?v=<mtime>` a las URLs de recursos locales.

`LegacyWidgetCssService` respalda la ruta `react-legacy-widget-css` — CSS del BO heredado acotado bajo
`.melis-legacy-widget` para que no pueda filtrarse al contenedor React (usado por widgets heredados sin iframe
inyectados directamente en el DOM de React, p. ej. el contenido de plugins de dashboard).

## Reserva de la SPA — `SpaController`

`SpaController::spaAction()` sirve el contenedor React para `/melis-react` y cada enlace profundo
del lado del cliente:

- Resuelve `index.html` mediante `$_SERVER['DOCUMENT_ROOT']`, leyendo
  `…/vendor/melisplatform/melis-core/public/ui-react/index.html` (el build de React reside en el
  `public/` de melis-core, servido en `/MelisCore/ui-react/`). Funciona independientemente de dónde se sitúe este módulo
  en disco.
- Devuelve `404` si falta el contenedor; en caso contrario devuelve el fichero como
  `text/html; charset=utf-8` con `Cache-Control: no-cache, no-store, must-revalidate` (el contenedor
  nunca se cachea; los recursos referenciados llevan hash de contenido).
- Los ficheros reales (`index.html` raíz, recursos con hash) los transmite antes MelisAssetManager en
  el arranque, por lo que solo las rutas virtuales del lado del cliente (p. ej. `/melis-react/news/5`) caen aquí.

La ruta regex `meliscore-melis-react-spa` (`priority => 1000`) gana sobre la ruta front comodín de MelisFront.
Su regex `'/melis-react(?<spa>/[a-zA-Z0-9_\-/~.]*)?'` incluye `~` (separador de id compuesto)
y `.` para que esos enlaces profundos se resuelvan a la SPA en una recarga de página completa.

## Punto de extensión — el hook `toolpage_extensions`

Las particularidades específicas de cada herramienta residen en el módulo **propietario**, no codificadas aquí. Un módulo registra un
nombre de servicio bajo `config('melis_react_override')['toolpage_extensions'][]` e implementa
`MelisReactOverride\Controller\PluginViewToolPageExtensionInterface`:

```php
interface PluginViewToolPageExtensionInterface
{
    // Adjust the rendered zone HTML for a melisKey before assembly (return $html unchanged
    // for keys the extension doesn't care about).
    public function adjustToolHtml(string $key, string $html, array $jsCallBacks, PluginViewController $controller): string;

    // Adjust the platform asset bundle. Return ['assets' => array, 'skipJsRoots' => array<string, true>];
    // 'skipJsRoots' lists roots the extension already injected so the generic loop must NOT re-add them.
    public function adjustToolAssets(string $key, string $html, array $assets, PluginViewController $controller): array;
}
```

`PluginViewController::toolPageExtensions()` resuelve los nombres registrados, **omite silenciosamente**
los nombres que no son servicios registrados o que no implementan la interfaz (de modo que una extensión es totalmente
opcional — módulo no instalado → sin efecto), cachea la lista y llama a `adjustToolHtml()` (paso 6)
y `adjustToolAssets()` (paso 8) para cada uno.

> **Por qué un array de configuración y no una sobrescritura de controlador:** las contribuciones de distintos módulos simplemente
> se acumulan independientemente del orden de carga (a diferencia de un alias de controlador, donde solo gana el
> último módulo fusionado).

**Ejemplo de consumidor.** MelisAICommunityExtensions registra
`MelisAICommunityExtensions\Controller\React\PluginViewToolPageExtension` bajo
`melis_react_override.toolpage_extensions` para inyectar su `tool.js` / `style.css` en las páginas de herramientas
heredadas servidas en la vista "Old" de React.

## Ficheros clave

| Aspecto | Ruta |
| --- | --- |
| Rutas, sobrescritura de controlador, `excluded_routes` | `config/module.config.php` |
| Arranque del módulo + autoloader | `src/Module.php` |
| Mecanismo de iframe, acciones de dashboard, extensiones | `src/Controller/PluginViewController.php` |
| Servicio del contenedor SPA | `src/Controller/SpaController.php` |
| Contrato `toolpage_extensions` | `src/Controller/PluginViewToolPageExtensionInterface.php` |
| Construcción de recursos de plataforma + caché del bundle | `src/Service/PlatformAssetsService.php` |
| CSS acotado del BO heredado | `src/Service/LegacyWidgetCssService.php` |

Véase también: [melis-core](/legacy/reference/modules/melis-core)

> **Sin UI, sin capturas de pantalla.** MelisReactOverride es infraestructura sin interfaz propia —
> lo que aparece en pantalla es la *herramienta heredada* que renderiza o el *contenedor React* que sirve, ambos
> documentados en sus propios módulos.
