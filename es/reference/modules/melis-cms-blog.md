# MelisCmsBlog

> Sistema de blog para sitios Melis, con un back-office nativo en React para la gestión de
> publicaciones y tres plugins de visualización en el front-office. Paquete `melisplatform/melis-cms-blog`.

## Propósito

MelisCmsBlog proporciona una herramienta **Blog** en el back-office donde los editores crean y gestionan
publicaciones de blog multilingües (títulos, subtítulo, hasta cuatro párrafos de texto enriquecido,
imágenes, documentos, programación de publicación/despublicación, un slider opcional, y URL SEO + meta).
Las publicaciones se exponen en el front-office a través de tres plugins de plantilla listos para usar:
un teaser de últimas publicaciones, una lista de publicaciones paginada y filtrable, y una vista de
detalle de una sola publicación. Las URLs amigables para SEO, las meta etiquetas por publicación y las
redirecciones 301 automáticas hacia la URL canónica se gestionan mediante escuchadores de eventos dedicados.

En el back-office React de la v6 (`/melis-react`), el módulo incluye un **brick nativo full-React** — una
interfaz React real para listar y editar publicaciones, respaldada por una capa JSON `react-api` — con un
conmutador **New / Old** que puede recurrir a la herramienta heredada en un iframe. Es el gemelo
arquitectónico de MelisCmsNews. El framework, los servicios, el modelo de datos, el enrutamiento SEO y los
plugins de front no han cambiado respecto a la v5; solo la capa de visualización del back-office es nueva.

## Activarlo

Añadir a `config/melis.module.load.php`:

```php
return [
    'MelisCmsBlog',
];
```

Requiere `melis-core` y `melis-cms`, PHP `^8.1|^8.3|^8.4`. Las integraciones opcionales se activan cuando
`MelisCmsComments`, `MelisCmsSlider`, `MelisSmallBusiness` o `MelisCmsUserAccount` también están
instalados. El brick aparece en la barra lateral de React únicamente si el módulo está presente
(descubrimiento modular de bricks mediante `GET /melis/react-api/react-modules`).

## Servicios clave

Registrados como alias del `service_manager` en `config/module.config.php`. El controlador React reutiliza
estas mismas reglas de negocio del lado del servidor, manteniendo la paridad con la herramienta heredada.

| Alias de servicio | Rol |
| --- | --- |
| `MelisCmsBlogService` | Servicio principal de CRUD/consulta. Lee, crea, actualiza y elimina publicaciones; consulta por sitio, idioma, rango de fechas, estado, autor. Cada método dispara eventos `*_start` / `*_end` a través de `MelisEngineGeneralService`. |

Alias de table gateway: `MelisCmsBlogTable`, `MelisCmsBlogTextsTable`.

## Tablas de base de datos

Estructura base en `install/sql/setup_structure.sql`; migraciones en `install/dbdeploy/`.

| Tabla | Contiene |
| --- | --- |
| `melis_cms_blog` | Fila principal de la publicación: estado, fechas de publicación/despublicación, id de sitio, image1-3, documents1-3, id de slider |
| `melis_cms_blog_texts` | Textos por idioma: título, subtítulo, párrafos 1-4, id de idioma, URL SEO, meta título/descripción SEO, cuenta del autor |

> A diferencia de MelisCmsNews, el blog **no tiene categorías ni etiquetas** — no hay tabla de enlace ni
> soporte de `melis_cms_tag*`.

## Back-office React

Barra lateral → grupo **MelisCms** → **Blog** (`fa-rss`). El brick se abre como una pestaña superior
llamada **Blog** y dibuja su propia barra de sub-pestañas dentro de la herramienta: una sub-pestaña por
cada publicación abierta, más un Volver a la lista. Cada publicación abierta permanece montada, por lo que
alternar entre publicaciones es instantáneo.

### La lista de publicaciones

La lista React muestra todas las publicaciones de la plataforma, con **tarjetas KPI** (Total de
publicaciones, Publicadas, Despublicadas), un cuadro de **búsqueda** con filtros **All / Active /
Inactive**, un gestor de **Columns** (ocultar/reordenar), un botón **Export** (xlsx/csv), paginación por
keyset y **edición** / **eliminación** por fila. Haga clic en el encabezado de una columna para ordenar.
**+ New post** inicia un editor en blanco.

![La lista React de Blog: tarjetas KPI (Total posts / Published / Unpublished), un cuadro de búsqueda con filtros All / Active / Inactive, un gestor de Columns, un botón Export, el conmutador New/Old y el botón "+ New post", con acciones de edición y eliminación por fila](/screenshots/react/melis-cms-blog/meliscmsblog-tool-blog-list.png)

Un conmutador **New / Old** (arriba a la derecha) cambia la lista — y solo la lista — entre la interfaz
React y la herramienta heredada renderizada en un iframe
(`/melis/react-tool-page?key=meliscmsblog_left_menu`), de modo que las dos interfaces se puedan comparar
lado a lado.

### El editor de publicaciones

Donde la herramienta heredada usaba pestañas superiores separadas (Properties / Texts / Medias), el editor
React es una única página desplazable: una amplia **columna de contenido** a la izquierda y una **barra
lateral de ajustes** plegable a la derecha. Un **selector de idioma** en la parte superior alberga todas
las traducciones a la vez — todos los idiomas se guardan juntos en una sola llamada.

**Columna de contenido**

- **Title / Subtitle** — texto plano, por idioma.

![El selector de idioma del editor de publicaciones (English / Français / Español), los campos Title y Subtitle, y el BODY con hasta 4 párrafos de texto enriquecido (TinyMCE) — cada uno en su propia tarjeta reordenable por arrastre con un contador de párrafos](/screenshots/react/melis-cms-blog/meliscmsblog-tool-blog-edit-tab-texts.png)

- **Body** — hasta **4 párrafos de texto enriquecido (TinyMCE)** (`cblog_paragraph1..4`), reordenables por
  arrastre, con **+ Add paragraph (max. 4)**.
- **Media** — hasta **3 imágenes** (Replace / Remove por ranura) y hasta **3 archivos adjuntos**. Aparece
  únicamente **tras el primer guardado**, ya que las subidas necesitan que la publicación exista primero.

![El área Media — Images (máx. 3, con Replace/Remove por ranura) y File attachments (máx. 3, "Click to attach a file")](/screenshots/react/melis-cms-blog/meliscmsblog-tool-blog-edit-tab-medias.png)

- **Comments** — un panel de moderación nativo (añadir/editar, aprobar/rechazar/eliminar, paginado), que se
  muestra únicamente cuando **MelisCmsComments** está instalado.

**Barra lateral de ajustes** (secciones plegables)

- **Status** — un conmutador Published / Unpublished, más un botón **Workflow** (validación) cuando
  **MelisSmallBusiness** está activo.

![La parte superior de la barra lateral de ajustes — el conmutador Published con un botón Workflow, los selectores de fecha y hora Publish on / Unpublish on y el selector de Site](/screenshots/react/melis-cms-blog/meliscmsblog-tool-blog-edit-tab-properties.png)
- **Publication** — selectores de fecha y hora **Publish on** / **Unpublish on**.
- **Site** — el sitio al que pertenece la publicación (obligatorio).
- **Author** — un selector de autor, que se muestra únicamente cuando **MelisCmsUserAccount** proporciona la
  columna `cblog_author_account`.
- **Comments validation** — un conmutador "los comentarios del front-office permanecen ocultos hasta ser
  aprobados" más un interruptor exclusivo del blog "Account required to comment", que se muestra cuando
  **MelisCmsComments** está activo.
- **SEO** — Meta título, Meta descripción y **URL** amigable, por idioma (almacenados en la tabla de
  textos, no en una tabla SEO dedicada).
- **Slider** — un slider para mostrar con la publicación, que se muestra únicamente cuando
  **MelisCmsSlider** está activo.

Las secciones opcionales se detectan en tiempo de ejecución mediante detección de características (los
endpoints complementarios devuelven 404 de forma controlada; el estado del módulo se lee de
`/melis/react-api/react-modules`), por lo que un módulo complementario ausente nunca rompe un guardado.
**Save** (arriba a la derecha) persiste todas las traducciones, SEO, fechas, enlaces multimedia, slider y
autor en una sola llamada. Un área de **Preview** renderiza entonces la publicación guardada en su página
de detalle dentro de un iframe.

![La barra lateral de ajustes ampliada — un conmutador Comments validation, el conmutador exclusivo del blog "Account required to comment", y luego las secciones plegables SEO y Slider](/screenshots/react/melis-cms-blog/meliscmsblog-tool-blog-edit-tab-properties-with-overrides.png)

## API React

Las rutas viven en `config/react-api.php` (fusionadas mediante `MelisCmsBlog\Module::getConfig()`),
montadas bajo `/melis/react-api/…`. Controlador: `MelisCmsBlog\Controller\MelisCmsBlogReactApiController`.
Contrato `{ success, data, error }`; cada fetch envía `X-Requested-With: XMLHttpRequest` y
`credentials:'include'`.

| Método y URL | Propósito |
| --- | --- |
| `GET /blog` | Lista publicaciones (keyset: `limit`, `search`, `status`, `siteId`, `sort`, `dir`, `after`) → `{items,total,nextCursor}` |
| `GET /blog/stats` | KPI `{total, published, draft}` |
| `GET /blog/:id` | Una publicación (`?langId=` → esa traducción; campos base + párrafos + multimedia + SEO + slider/autor) |
| `POST /blog/save` | Crear / actualizar (todas las traducciones, estado, siteId, fechas, sliderId, authorId, flags de comentarios, seo) |
| `DELETE /blog/delete/:id` | Elimina una publicación y sus textos |
| `GET /blog/preview/:id` | URL de vista previa + lista de páginas BLOG_DETAIL para el sitio de la publicación |
| `GET /blog/users` | Usuarios del front-office como autores (`MelisCmsUserAccount`) |
| `GET /blog/:id/comments` | Comentarios de una publicación (404 si `MelisCmsComments` está desactivado) |
| `POST /blog/comments/save` | Añadir/editar un comentario |
| `POST /blog/comments/approve/:cid` · `/refuse/:cid` | Moderar un comentario |
| `DELETE /blog/comments/delete/:cid` | Eliminar un comentario |
| `GET /blog-sites` | Lista de sitios |
| `GET /blog-languages` | Idiomas del CMS (`melis_cms_lang`) |

**No existen rutas `/blog/categories` ni `/blog/tags`**. Los sliders provienen del propio
`GET /melis/react-api/sliders` del brick MelisCmsSlider. La subida/eliminación de multimedia y la búsqueda
de autor de comentarios reutilizan los endpoints **heredados** (sin cambios en el backend):

- `POST /melis/MelisCmsBlog/MelisCmsBlog/saveFileForm` — subida multipart de imagen/archivo
- `POST /melis/MelisCmsBlog/MelisCmsBlog/removeAttachFile` — vacía la columna y elimina el archivo

### Capacidades

Declaradas en `config/react.capabilities.php` bajo el nodo portador de derechos `meliscmsblog_left_menu`:

```
meliscmsblog_left_menu
└─ actions: list · create · edit · delete · export
```

React controla el acceso a la interfaz mediante `window.__melisUseCaps('meliscmsblog_left_menu').can(cap)`
(New post → `create`, Export → `export`, acciones de fila → `edit`/`delete`, cuerpo de la lista → `list`).
Del lado del servidor, cada acción del controlador está protegida por `denyUnlessAccess()`
(autenticación + `canAccess`) y luego `denyUnlessCan(cap)`.

## Manifiesto del brick

`public/ui-react/brick.manifest.json` (bundle IIFE de Vite, React/ReactDOM externalizados a globales del host):

```json
{ "id": "blog", "route": "/melis-cms/blog", "label": "Blog",
  "forwardKey": "MelisCmsBlog/MelisCmsBlogList", "melisKey": "meliscmsblog_left_menu",
  "entry": "brick.js", "persistent": true, "subTabs": true }
```

`forwardKey` mapea el nodo del menú izquierdo heredado a la ruta del árbol `/melis-cms/blog`
(enlazable en profundidad como `/melis-cms/blog/:id`, usada por el ojo de Workflow). `subTabs: true`
significa que el brick dibuja su propia barra de sub-pestañas dentro de la herramienta. Cuando
MelisSmallBusiness está activo, la sección Status renderiza el `window.__melisWorkflowModal` mutualizado
con `ctx.wfType = 'BLOG'`. Un módulo opcional puede añadir acciones por párrafo mediante
`window.__melisBlogExtensions.renderParagraphActions(...)`.

## Front-office

Tres plugins de plantilla extienden `MelisTemplatingPlugin`, cada uno con un plugin de controlador y un
archivo de configuración bajo `config/plugins/`. Todos leen el id de la publicación activa del parámetro de
consulta `?blogId`. En el editor de páginas React se sueltan desde el grupo **Melis Cms Blog** del panel de
plugins, y cada uno abre el clásico modal de configuración con pestañas.

![El editor de páginas React con el panel de plugins abierto — el grupo "Melis Cms Blog": Latest blog posts, Blog post list, Blog post details](/screenshots/react/melis-cms-blog/meliscmsblog-page-plugins-menu.png)

| Clase de plugin | Clave de config | Vista | Pestañas de config |
| --- | --- | --- | --- |
| `MelisCmsBlogLatestBlogPlugin` | `MelisCmsBlogLatestBlog` | `MelisCmsBlog/latest-blog` | Properties, Filters |
| `MelisCmsBlogListBlogPlugin` | `MelisCmsBlogListBlog` | `MelisCmsBlog/blog-list` | Properties, Pagination, Filters |
| `MelisCmsBlogShowBlogPlugin` | `MelisCmsBlogShowBlog` | `MelisCmsBlog/blog-details` | Properties |

Parámetros de configuración de los plugins: `template_path`, `site_id`, `pageIdBlog` (enlace a la página de
detalle), `column`, `order`, `limit`, `date_min`, `date_max`, `search`; más `nbPerPage` /
`nbPageBeforeAfter` (solo Blog list). El plugin Blog list también filtra por `?authorId`. El plugin Blog
details recurre a la publicación publicada más reciente cuando no hay `blogId` en la solicitud, y admite el
modo de vista previa (`renderMode === 'previewtab'`).

Columnas de ordenación disponibles: `cblog_id`, `cblog_title`, `cblog_publish_date`, `cblog_creation_date`.

![Plugin Blog list → Properties — Template MelisCmsBlog/blog-list, Site y Blog detail page](/screenshots/react/melis-cms-blog/meliscmsblog-page-plugin-bloglist-config-properties.png)

![Plugin Latest blog → Filters — Sort (Blog publish date), Order, Limit, fecha From/To y Default search](/screenshots/react/melis-cms-blog/meliscmsblog-page-plugin-latestblog-config-filters.png)

![Plugin Blog details → Properties — Template MelisCmsBlog/blog-details y un selector Default post](/screenshots/react/melis-cms-blog/meliscmsblog-page-plugin-blogdetails-config-properties.png)

### Enrutamiento SEO

Las publicaciones se sirven a través de una página de tipo **`BLOG_DETAIL`** que porta el plugin Blog
details, en la `cblog_seo_url` de la publicación. Cuatro escuchadores implementan la canalización SEO
completa:

| Escuchador | Evento | Rol |
| --- | --- | --- |
| `MelisCmsBlogSEOReformatToRoutePageUrlListener` | `EVENT_ROUTE` | Coincide con la URL SEO y construye una ruta a la página BLOG_DETAIL |
| `MelisBlogSEODispatchRouterRegularUrlListener` | `EVENT_DISPATCH` | Redirige con 301 una URL no canónica a la `cblog_seo_url` de la publicación |
| `MelisCmsBlogRedirect301Listener` | `meliscmsblog_redirect_page` | Establece la meta SEO de la página a partir de los campos meta de la publicación |
| `MelisCmsBlogSEOMetaPageListener` | `EVENT_FINISH` | Reescribe el `<title>` / `<meta description>` renderizado con la meta SEO de la publicación |

`MelisCmsBlogPreviewTypeListener` registra el tipo de página **BLOG_DETAIL** en el formulario de
propiedades de página (evento `modify_page_properties_form_config`).

## Ejemplo

```php
$blog = $this->getServiceManager()->get('MelisCmsBlogService');

// Latest 10 published posts for site 1, newest first:
$list = $blog->getBlogList([
    'siteId'   => 1,
    'langId'   => 1,
    'limit'    => 10,
    'orderBy'  => 'cblog_publish_date',
    'orderDir' => 'DESC',
]);

// Fetch one post (with its texts for a given language):
$post = $blog->getBlogById($blogId, $langId);
$txt  = $blog->getPostText($blogId);

// Create / update / delete:
$id = $blog->saveBlog(['cblog_site_id' => 1, 'cblog_status' => 1, ...], $blogId); // null → create
$blog->deleteBlogById($blogId);  // also removes its texts

// Utility:
$pages  = $blog->getBlogDetailsPagesBySite($siteId);       // BLOG_DETAIL-type pages for a site
$isDupe = $blog->checkSeoUrlDuplication($seoUrl, $blogId); // SEO URL uniqueness check
$slug   = $blog->cleanURL($title);                         // slugify (handles accents)

// Posts by a front-account author:
$posts  = $blog->getBlogListByAuthorId($authorId);
```

## Otros escuchadores

| Escuchador | Evento | Propósito |
| --- | --- | --- |
| `MelisCmsBlogSliderDeletedListener` | `meliscmsslider_delete_slider_end` | Elimina un slider borrado de las publicaciones (`cblog_slider_id`) |
| `MelisCmsBlogGdprAutoDeleteActionDeleteListener` | `melis_cms_user_account_gdpr_auto_delete_action_delete` | RGPD: pone a null `cblog_author_account` para una cuenta de usuario eliminada |
| `MelisCmsBlogServiceMicroServiceListener` | `melis_core_microservice_amend_data` | Convierte las rutas de imagen en URLs absolutas en los resultados de `getBlogList` para la salida de API/microservicio |
| `SiteMenuBlogDataListener` | `MelisFrontMenuPlugin_melistemplating_plugin_end` | Alimenta las publicaciones (agrupadas por mes/año) en el plugin del menú de front |
| `MelisCmsBlogFlashMessengerListener` | `meliscmsblog_delete_blog_end`, `meliscmsblog_save_blog_*_end` | Retroalimentación de flash-messenger para las acciones del blog |

## Archivos clave

| Ámbito | Ruta |
| --- | --- |
| Configuración del módulo (servicios, gateways, plugins) | `vendor/melisplatform/melis-cms-blog/config/module.config.php` |
| Rutas de la API React | `vendor/melisplatform/melis-cms-blog/config/react-api.php` |
| Capacidades React | `vendor/melisplatform/melis-cms-blog/config/react.capabilities.php` |
| Árbol de la herramienta de back-office (vista heredada / Old) | `vendor/melisplatform/melis-cms-blog/config/app.interface.php` |
| Inyección de la pestaña de comentarios | `vendor/melisplatform/melis-cms-blog/config/comments.config.php` |
| Configuraciones de plugins | `vendor/melisplatform/melis-cms-blog/config/plugins/` |
| Servicio principal | `vendor/melisplatform/melis-cms-blog/src/Service/MelisCmsBlogService.php` |
| Controlador de la API React | `vendor/melisplatform/melis-cms-blog/src/Controller/MelisCmsBlogReactApiController.php` |
| Plugins de front | `vendor/melisplatform/melis-cms-blog/src/Controller/Plugin/` |
| Escuchadores (SEO, RGPD, slider, menú, flash) | `vendor/melisplatform/melis-cms-blog/src/Listener/` |
| Fuente del brick React | `vendor/melisplatform/melis-cms-blog/ui-react/src/` |
| Brick compilado + manifiesto | `vendor/melisplatform/melis-cms-blog/public/ui-react/` |
| SQL de instalación | `vendor/melisplatform/melis-cms-blog/install/sql/setup_structure.sql` |

Véase también: [melis-cms](/es/reference/modules/melis-cms), [melis-front](/es/reference/modules/melis-front),
[melis-engine](/es/reference/modules/melis-engine), [melis-core](/es/reference/modules/melis-core),
[melis-cms-slider](/es/reference/modules/melis-cms-slider),
[melis-small-business](/es/reference/modules/melis-small-business)
