# MelisFront

> El sistema de renderizado de front-office que convierte una URL en una página pública terminada y entrega los bloques de contenido (plugins de página) que los autores colocan en las páginas desde el back-office React. Paquete `melisplatform/melis-front`.

## Propósito

MelisFront es el runtime que resuelve una dirección web hacia una página de Melis, ejecuta el pipeline de renderizado (enrutamiento, SEO, plugins de plantillas, layout, caché, minificación de assets) y entrega la respuesta HTML al visitante. También impulsa la **vista previa editable en vivo** volviendo a renderizar cualquier página en modo `melis`. MelisFront no posee ninguna tabla de base de datos: todos los datos de página/sitio/plantilla/SEO se leen desde [melis-engine](/es/reference/modules/melis-engine), la única fuente de verdad.

MelisFront forma parte de un trío fuertemente acoplado: [melis-engine](/es/reference/modules/melis-engine) (capa de datos), **melis-front** (renderizado de front) y [melis-cms](/es/reference/modules/melis-cms) (editor del back-office). Los cambios en cualquiera de ellos suelen implicar a los otros dos.

## En el back-office React

MelisFront **no tiene una herramienta React independiente**: no hay brick `ui-react/`, ni `brick.manifest.json`, ni `react-api.php`; nunca aparece en la barra lateral izquierda de `/melis-react`. Toda su superficie de back-office es el conjunto de **plugins de página (bloques de contenido)** que configuras dentro del **editor de páginas de MelisCms**.

Te encuentras con MelisFront cuando editas una página: **MelisCms → abrir una página → pestaña Edition**. Esa pestaña Edition es el clásico editor de páginas de arrastrar y soltar **renderizado en un iframe dentro del shell React** (`/melis/react-tool-page?key=meliscms_page`). Dentro de él arrastras los bloques de MelisFront a las zonas y abres su modal de **Properties**. React únicamente *aloja* ese editor heredado; MelisFront no aporta ningún componente React propio.

Hay dos tipos de bloque:

- **Bloques de tipo tag** editados **in situ** en la página: **HTML** (texto enriquecido) y **Media** (imagen/archivo). Sin modal.
- **Bloques de configuración** configurados a través de un modal de **Properties**: **Menu**, **Breadcrumb**, **List-from-folder**, **GDPR banner**. Generan contenido a partir del árbol de páginas / configuración del sitio.

## Habilitarlo

Añade a `config/melis.module.load.php`:

```php
return [
    'MelisFront',
];
```

Dependencia declarada de Melis: `melisplatform/melis-core`. En tiempo de ejecución también consume servicios de MelisEngine. Orden de carga: `melis-core` → **melis-front** → `melis-engine` → `melis-cms`.

## Bloques de tipo tag — edición in situ

### HTML (Texto)

El bloque de referencia: un **área de texto enriquecido** (TinyMCE) para títulos, párrafos, enlaces y contenido con formato. Se edita **directamente en la página**, sin modal de Properties. Clase de plugin `MelisFrontTagHtmlPlugin`.

![Bloque HTML/Texto en el editor de páginas con la barra de herramientas completa de TinyMCE](/screenshots/react/melis-front/melisfront-page-plugin-html-tag.png)

### Media

Coloca una **imagen o un archivo** de la biblioteca multimedia. También se edita in situ mediante una barra de herramientas compacta con un marcador de posición "Add media content here". Clase de plugin `MelisFrontTagMediaPlugin`.

![Bloque Media in situ con el marcador de posición Add media content here](/screenshots/react/melis-front/melisfront-page-plugin-media-tag.png)

## Bloques de configuración — modal de Properties

Los bloques de configuración se configuran mediante un pequeño modal de **Properties** renderizado por la plataforma. Los dos campos recurrentes son el desplegable **Template** (`MelisEnginePluginTemplateSelect`, campo `template_path`) que selecciona la vista `.phtml`, y un **selector de página** (`MelisText` con un botón `fa fa-sitemap`) que define la página inicial/padre en el árbol. Cada bloque de configuración declara su modal como un `melis.modal_form` (especificación de formulario Laminas) en `config/plugins/<Plugin>.config.php`; no existe un componente React por plugin.

### Menu

Construye un **menú de navegación automáticamente a partir del árbol de páginas**. Campos del modal: **Template** y **Starting page**. Plugin `MelisFrontMenuPlugin` (campo `pageIdRootMenu`).

![Modal de Properties del bloque Menu con los campos Template y Starting page](/screenshots/react/melis-front/melisfront-page-plugin-menu-config-properties.png)

### Breadcrumb

Renderiza la ruta "usted está aquí" (Home › Sección › Página). Campos del modal: **Template** (por defecto `MelisFront/breadcrumb`) y **Starting page**. Plugin `MelisFrontBreadcrumbPlugin` (campo `pageIdRootBreadcrumb`).

![Modal de Properties del bloque Breadcrumb con los campos Template y Starting page](/screenshots/react/melis-front/melisfront-page-plugin-breadcrumb-config-properties.png)

### List-from-folder

Toma una **carpeta del árbol de páginas y lista sus páginas hijas** automáticamente. Campos del modal: **Template** (cómo se renderiza cada elemento) y **Parent page** (la carpeta de origen). Plugin `MelisFrontShowListFromFolderPlugin` (campo `pageIdFolder`).

![Modal de Properties de List-from-folder con los campos Template y Parent page](/screenshots/react/melis-front/melisfront-page-plugin-folderlisting-config-properties.png)

### GDPR banner

El **banner de cookies/consentimiento** que se muestra en el sitio público. Su modal solo necesita el **Template**; el texto proviene de los textos GDPR del sitio. Plugin `MelisFrontGdprBannerPlugin`.

![Modal de Properties del GDPR banner con un único campo Template](/screenshots/react/melis-front/melisfront-page-plugin-gdprbanner-config-properties.png)

### Campos del modal de configuración

| Plugin | Campos del modal (nombre / tipo) | Plantilla por defecto |
| --- | --- | --- |
| Breadcrumb | `template_path` (`MelisEnginePluginTemplateSelect`) · `pageIdRootBreadcrumb` (`MelisText`, sitemap) | `MelisFront/breadcrumb` |
| Menu | `template_path` · `pageIdRootMenu` (`MelisText`, sitemap) | `MelisFront/menu` |
| List-from-folder | `template_path` · `pageIdFolder` (`MelisText`, sitemap) | `MelisFront/show-list-from-folder` |
| GDPR banner | solo `template_path` | `MelisFront/gdpr-banner` |

**Apply** envía los valores de vuelta a través de la capa de arrastrar y soltar, que los persiste en el XML de sesión de la página. React no interviene en ese ida y vuelta; la interfaz del plugin es enteramente PHP/JS heredado dentro del iframe de Edition.

## Servicios clave

| Alias del servicio | Función |
| --- | --- |
| `MelisFrontHead` | Gestiona el `<title>` de la página, la meta description, el canonical e inyecta los assets CSS/JS de los plugins. |
| `MelisSiteConfigService` | Lee la configuración por sitio según clave, página o idioma — fusión de archivo + BD. |
| `MelisSiteTranslationService` | Búsqueda y CRUD de clave/texto de traducción por sitio, con caché por sitio. |
| `MelisTranslationService` | Traducciones de módulo/locale (cadenas del back-office), con caché. |
| `MinifyAssets` | Genera `bundle.css` / `bundle.js` por sitio usando `matthiasmullie/minify`. |
| `MelisFrontNavigation` | Factory de navegación que construye un árbol `Laminas\Navigation` a partir del árbol de páginas del engine. |

## Renderizado de front

### Enrutamiento

La ruta principal de front es un patrón Regex que coincide con `.../id/{idpage}`, despachado a `MelisFront\Controller\Index::index`. Rutas hijas: `/renderMode/melis` (modo de edición del back-office usado por MelisCms) y `/preview` (vista previa de la versión guardada). Rutas especiales: `sitemap(.xml)`, `/css/plugin-width.css`, `/melissearchindex/…`, `/melispluginrenderer` (renderizado AJAX de un único plugin), `/minify-assets`.

### Pipeline de renderizado (listeners)

Conectados en `src/Module.php` entre `EVENT_DISPATCH` y `EVENT_FINISH` (~19 listeners en total):

| Fase | Listeners |
| --- | --- |
| `EVENT_LOAD_MODULES_POST` | `MelisFrontSEORouteListener`, `MelisFrontSiteConfigListener`, `MelisFrontMiniTemplateConfigListener` |
| `EVENT_DISPATCH` | `MelisFrontXSSParameterListener`, `MelisFrontHomePageRoutingListener` / `…HomePageIdOverrideListener`, `MelisFrontSEODispatchRouterRegularUrlListener` (validación de página, 404/301, dispara `melisfront_site_dispatch_ready`), `MelisFront404To301Listener`, `MelisFront404CatcherListener` |
| `EVENT_FINISH` | `MelisFrontPluginsToLayoutListener` (CSS/JS de plugins), `MelisFrontSEOMetaPageListener` (title/description/canonical), `MelisFrontAttachCssListener` (CSS de página), `MelisFrontLayoutListener` (layout de front o layout de BO + TinyMCE en modo `melis`), `MelisFrontPageCacheListener`, `MelisFrontMinifiedAssetsCheckerListener` |

### Plugins de plantillas (controller plugins)

Todos extienden `MelisEngine\Controller\Plugin\MelisTemplatingPlugin`, registrados bajo `controller_plugins`. Los bloques que aparecen en el editor React son un subconjunto de estos:

| Alias del plugin | Bloque |
| --- | --- |
| `MelisFrontTagHtmlPlugin` | Zona HTML / de texto enriquecido editable en línea. |
| `MelisFrontTagTextareaPlugin` | Zona de texto plano. |
| `MelisFrontTagMediaPlugin` | Imagen / archivo de la biblioteca multimedia. |
| `MelisFrontMenuPlugin` | Menú de navegación construido a partir del árbol de páginas. |
| `MelisFrontBreadcrumbPlugin` | Ruta de breadcrumb (Home › … › Página actual). |
| `MelisFrontShowListFromFolderPlugin` | Lista automáticamente las subpáginas de una carpeta elegida. |
| `MelisFrontDragDropZonePlugin` | Contenedor de layout (zona de destino para otros plugins). |
| `MelisFrontBlockSectionPlugin` | Contenedor de bloque/sección reutilizable. |
| `MelisFrontGenericContentPlugin` | Bloque de contenido de uso general. |
| `MelisFrontGdprBannerPlugin` | Banner de cookies / consentimiento GDPR. |
| `MelisFrontGdprRevalidationPlugin` | Vuelve a solicitar el consentimiento cuando cambia la política GDPR. |
| `MelisFrontSearchResultsPlugin` | Renderiza los resultados de la búsqueda interna del sitio. |
| `MiniTemplatePlugin` | Inserta una mini-plantilla predefinida con un clic. |

### El controlador de renderizado de plugins

`MelisFront\Controller\MelisPluginRendererController` vuelve a renderizar un único plugin bajo demanda: esto es lo que llama el iframe de Edition cuando sueltas o editas un bloque:

- `getPluginAction()` (ruta `/melispluginrenderer`) — renderizado AJAX de un plugin.
- `editPluginAction`, `dndLayoutAction`, `dndUpdateOrderAction`, `dndRemoveAction` — los flujos de arrastrar y soltar y de edición de plugins.

### View helpers

Usados dentro de las plantillas `.phtml` de un sitio (registrados bajo `view_helpers`):

| Alias del helper | Uso |
| --- | --- |
| `MelisTag` | Declara una zona editable (HTML o media) que los editores rellenan in situ. |
| `MelisLink` | Genera la URL amigable para SEO de una página (sigue siendo correcta si la página se mueve). |
| `MelisMenu` | Renderiza un menú de navegación a partir del árbol de páginas. |
| `MelisDragDropZone` | Renderiza una zona de arrastrar y soltar que aloja otros plugins. |
| `siteTranslate` | Genera una cadena de traducción del sitio por clave. |
| `SiteConfig` | Lee un valor de configuración del sitio. |

También están disponibles helpers de idioma/home para los enlaces de versiones de idioma y el enlace a la página de inicio.

### Navegación

`MelisFrontNavigation` (`src/Navigation/Factory/`) extiende la factory de navegación de Laminas para construir un objeto `Laminas\Navigation` a partir del árbol de páginas del engine (`MelisEnginePage` / `MelisEngineTree`), que los helpers Menu y Breadcrumb renderizan.

### Minificación de assets

`MinifyAssetsService` (basado en `matthiasmullie/minify`) genera `bundle.css` / `bundle.js` por sitio. `MelisFrontMinifiedAssetsCheckerListener` los inyecta (con cache-busting) cuando están presentes. Lanza una generación mediante la ruta `/minify-assets`.

## Tablas de base de datos

MelisFront **no posee ninguna tabla de base de datos**. Todos los datos de página, sitio, idioma, SEO y traducción pertenecen a [melis-engine](/es/reference/modules/melis-engine) y [melis-cms](/es/reference/modules/melis-cms).

## Ejemplo

Uso típico en una plantilla `.phtml` de sitio y llamadas a servicios PHP:

```php
// Inside a site page template (.phtml)
<?= $this->MelisMenu($idPage); ?>                         // navigation menu from the page tree
<a href="<?= $this->MelisLink($targetPageId); ?>">…</a>  // SEO-friendly page link
<?= $this->MelisTag($idPage, 'zone_main', 'html'); ?>    // editable HTML zone
<?= $this->siteTranslate('btn_send'); ?>                  // site translation string
<?= $this->SiteConfig('contact_email'); ?>               // site config value
```

```php
// Reading site config and translations in PHP
$siteConfig = $serviceManager->get('MelisSiteConfigService');
$email = $siteConfig->getSiteConfigByKey('contact_email', $siteId);

$tr = $serviceManager->get('MelisSiteTranslationService')
        ->getEntryByTextAndSiteId('btn_send', $siteId, $langId);
```

```php
// Hooking the render pipeline (after page validation, before render)
$sharedEvents->attach('MelisFront', 'melisfront_site_dispatch_ready', function ($e) {
    $params = $e->getParams(); // page id, site, renderMode…
    // e.g. force a redirect, add data to the layout, A/B-test…
}, 50);
```

## Archivos clave

| Ámbito | Ruta |
| --- | --- |
| Bootstrap del módulo + conexión de listeners | `vendor/melisplatform/melis-front/src/Module.php` |
| Rutas, servicios, plugins, helpers, cachés | `vendor/melisplatform/melis-front/config/module.config.php` |
| Configuración de plugins (valores por defecto de front + `melis.modal_form`) | `vendor/melisplatform/melis-front/config/plugins/` |
| Listeners del pipeline de renderizado | `vendor/melisplatform/melis-front/src/Listener/` |
| Servicios (Head, SiteConfig, Translations, Minify) | `vendor/melisplatform/melis-front/src/Service/` |
| Plugins de plantillas (bloques de contenido) | `vendor/melisplatform/melis-front/src/Controller/Plugin/` |
| Controlador de renderizado de plugins | `vendor/melisplatform/melis-front/src/Controller/MelisPluginRendererController.php` |
| View helpers | `vendor/melisplatform/melis-front/src/View/Helper/` |
| Factory de navegación | `vendor/melisplatform/melis-front/src/Navigation/Factory/` |

Ver también: [melis-engine](/es/reference/modules/melis-engine), [melis-cms](/es/reference/modules/melis-cms), [melis-core](/es/reference/modules/melis-core)
