# MelisCmsNews

> Sistema de noticias / blog para sitios Melis, con una herramienta de redacción React en el back-office y tres plugins de visualización para el front-office. Paquete `melisplatform/melis-cms-news`.

## Propósito

MelisCmsNews proporciona una herramienta **News** en el back-office donde los redactores escriben y gestionan artículos de noticias multilingües (títulos, párrafos de texto enriquecido, imágenes, documentos, programación de publicación/despublicación y SEO). Los artículos se muestran en el front-office mediante tres plugins de plantillas listos para usar: un adelanto de las últimas noticias, una lista de noticias paginada y una página de detalle de un único artículo. Las URL amigables para SEO y las metaetiquetas por artículo se gestionan automáticamente mediante listeners dedicados.

En Melis v6 la herramienta se distribuye como un **brick full-React nativo** en el nuevo back-office (`/melis-react`): una interfaz React real para listar y editar artículos, que invoca una capa JSON `react-api`, con un conmutador **New / Old** que puede recurrir a la herramienta clásica en un iframe. El framework, los servicios, los eventos, las tablas y los plugins de front no han cambiado respecto a la v5: solo la capa de presentación es nueva.

## Activarlo

Añade a `config/melis.module.load.php`:

```php
return [
    'MelisCmsNews',
];
```

Requiere `melis-core`, `melis-engine`, `melis-front` y `melis-cms` (`^5.2`), además de `laminas/laminas-paginator`. Las integraciones opcionales se activan cuando también están instalados `MelisCmsSlider`, el módulo de categorías de Melis, `MelisCmsTags`, `MelisCmsUserAccount` (autores) o `MelisCmsComments`. El brick React aparece solo mientras el módulo esté en `melis.module.load.php` (descubrimiento modular de bricks mediante `GET /melis/react-api/react-modules`).

## Back-office React

Barra lateral izquierda → **Site Tools** → **News** (`Actualités`). Se abre como una pestaña superior llamada **News** que aloja todo mediante **sub-pestañas** internas: la lista de artículos y una sub-pestaña por cada artículo abierto/nuevo con el editor completo. Cada sub-pestaña permanece montada, de modo que cambiar entre artículos es instantáneo. La ruta del árbol es `/melis-cms/news` (con `/melis-cms/news/:id` para enlaces directos, p. ej. el ojo de Workflow).

### La lista de artículos

![La lista de noticias React — tarjetas KPI (Total artículos / Publicados / No publicados), un cuadro de búsqueda con filtros All / Active / Inactive, un gestor de Columnas, un botón Export, el conmutador New/Old y el botón "+ New article", con acciones de edición y eliminación por fila](/screenshots/react/melis-cms-news/meliscmsnews-tool-news-list.png)

La lista muestra todos los artículos de la plataforma, con:

- **Tarjetas KPI** — Total de artículos, Publicados, No publicados.
- **Búsqueda** con filtros de estado **All / Active / Inactive**, columnas ordenables, un gestor de **Columnas** (ocultar/reordenar), una **Exportación** (xlsx) y **Reset filters**.
- **Edición** por fila (abre el artículo como sub-pestaña) y **eliminación**; **+ New article** abre un editor en blanco.
- Un conmutador **New / Old** (arriba a la derecha) que alterna la lista entre la interfaz React y la herramienta clásica en un iframe (`/melis/react-tool-page?key=meliscmsnews_left_menu`).

### El editor de artículos

Un único formulario con desplazamiento: una amplia columna de contenido a la izquierda, una barra lateral de ajustes a la derecha y un **selector de idioma** (English / Français) en la parte superior — cada traducción se conserva simultáneamente y se guarda junta en una sola llamada.

![El editor de nuevo artículo — un selector de idioma, los campos Title y Subtitle, el BODY con un editor de párrafos WYSIWYG y "Generate with AI", un área MEDIA bloqueada y la barra lateral de ajustes (Status, Publication, Site, Author, SEO, Categories, Tags, Slider)](/screenshots/react/melis-cms-news/meliscmsnews-tool-news-new.png)

| Área | Contenido |
| --- | --- |
| Title / Subtitle | Texto sin formato, por idioma |
| Body | Hasta **10 párrafos de texto enriquecido (WYSIWYG)**, reordenables mediante arrastre, cada uno con un asistente **Generate with AI** |
| Media | Hasta **3 imágenes** y **3 archivos de documento** — bloqueado hasta el primer guardado del artículo |
| Status | Conmutador **Published / Unpublished**, más un botón **Workflow** cuando MelisSmallBusiness está activo |
| Publication | Selectores de fecha y hora **Publish on** / **Unpublish on** |
| Site | El sitio al que pertenece el artículo |
| Author | Selector de autor — solo cuando `MelisCmsUserAccount` proporciona la columna `cnews_author_account` |
| SEO | **URL** amigable, **URL redirect**, **URL 301**, **Meta title**, **Meta description**, **Canonical URL** (por idioma) |
| Categories / Tags / Slider | Secciones opcionales que se muestran solo cuando el módulo correspondiente está activo |
| Comments | Panel de moderación nativo (añadir / aprobar / rechazar / eliminar) que se muestra solo cuando `MelisCmsComments` está activo |

![Edición de los textos de un artículo — título, subtítulo y un editor de párrafos de texto enriquecido (estilo TinyMCE); los párrafos se pueden añadir y reordenar](/screenshots/react/melis-cms-news/meliscmsnews-tool-news-edit-texts.png)

![La parte superior de la barra lateral de ajustes — el conmutador Published con Workflow, las fechas Publish on / Unpublish on y el selector de Site](/screenshots/react/melis-cms-news/meliscmsnews-tool-news-edit-properties.png)

![El área Media — Images (máx. 3, con Replace/Remove) y File attachments (máx. 3), más el panel nativo de moderación de Comments cuando MelisCmsComments está activo](/screenshots/react/melis-cms-news/meliscmsnews-tool-news-edit-medias.png)

![La sección SEO — Meta title, Meta description, URL, URL redirect, URL 301 y Canonical URL, por idioma](/screenshots/react/melis-cms-news/meliscmsnews-tool-news-edit-seo.png)

Una vez guardado, un área de **Preview** renderiza el artículo dentro de su página NEWS_DETAIL en un iframe, con una opción **Display in new tab** y un selector de página cuando el sitio tiene varias páginas de detalle.

![El área Preview — el artículo guardado renderizado dentro de su página NEWS_DETAIL, con un botón "Display in new tab"](/screenshots/react/melis-cms-news/meliscmsnews-tool-news-edit-preview.png)

### Mostrar noticias en una página

Desde el editor de páginas React (abre una página → Edition), abre el panel de plugins y arrastra **Latest News**, **News List** o **News Detail** a la página; cada uno abre el modal clásico de configuración del plugin de Melis (renderizado dentro del editor React) con las mismas pestañas que en la v5 — consulta [Front office](#front-office).

![El editor de páginas React con el panel de plugins abierto — los bloques de contenido News listos para arrastrar a la página](/screenshots/react/melis-cms-news/meliscmsnews-page-menu-plugins-selector.png)

![Plugin Latest News → Properties — Template, Site y News detail page (con un selector de árbol de páginas)](/screenshots/react/melis-cms-news/meliscmsnews-page-plugin-latestnews-config-tab-properties.png)

![Plugin News List → Pagination — News per page y el número de enlaces de página a mostrar](/screenshots/react/melis-cms-news/meliscmsnews-page-plugin-newslist-tab-pagination.png)

![Plugin News Detail → Properties — Template (news-details) y un selector Default news con un acceso directo a la herramienta News](/screenshots/react/melis-cms-news/meliscmsnews-page-plugin-newsdetail-config-tab-properties.png)

## API React

No hay **`config/react-api.php`**: las rutas se declaran **inline en `config/module.config.php`**, anidadas bajo el nodo compartido `melis-react-api` de modo que se montan bajo `/melis/react-api/…`. Controlador: `MelisCmsNews\Controller\MelisCmsNewsReactApiController` (alias invocable `MelisCmsNews\Controller\MelisCmsNewsReactApi`). Contrato `{ success, data, error }`.

| Método y URL | Propósito |
| --- | --- |
| `GET /news` | Lista de artículos (keyset: `limit`, `search`, `status`, `siteId`, `sort`, `dir`, `after`, `langId`) |
| `GET /news/stats` | KPI `{total, published, draft}` |
| `GET /news/:id` | Un artículo (`?langId=` → esa traducción; base + párrafos + media + SEO + ids de categoría/etiqueta) |
| `POST /news/save` | Crear / actualizar (todas las traducciones, SEO, categorías, etiquetas en una sola llamada) |
| `DELETE /news/delete/:id` | Eliminar un artículo (+ sus textos + SEO) |
| `GET /news/categories` | Categorías disponibles (`?langId=&siteId=`) |
| `GET /news/tags` | Etiquetas disponibles (`MelisCmsTags`; vacío si ausente) |
| `GET /news/users` | Usuarios del front-office como autores (`MelisCmsUserAccount`; vacío si ausente) |
| `GET /news/preview/:id` | URL de vista previa + páginas NEWS_DETAIL del sitio del artículo |
| `GET /news/:id/comments` | Comentarios de un artículo (404 si `MelisCmsComments` está desactivado) |
| `POST /news/comments/save` | Añadir / editar un comentario (BO → aprobado) |
| `POST /news/comments/approve/:cid` · `/refuse/:cid` | Moderar un comentario |
| `DELETE /news/comments/delete/:cid` | Eliminar un comentario |
| `GET /news-sites` · `GET /news-languages` | Lista de sitios · Idiomas del CMS |

La subida/eliminación de medios reutiliza los endpoints **legacy** (sin cambios en el backend): `POST /melis/MelisCmsNews/MelisCmsNews/saveFileForm` y `.../removeAttachFile`.

El controlador combina el `MelisCmsNewsService` del módulo (`getNewsById`, `saveNews`, `deleteNewsById`, `getNewsDetailsPagesBySite`) con SQL parametrizado directo (keyset de la lista, estadísticas, SEO, tablas de enlace de categoría/etiqueta) y el `MelisCmsCategory2Service` compartido; las columnas/tablas opcionales se detectan por características, de modo que un módulo opcional ausente nunca rompe un guardado.

### Capacidades

Declaradas en `config/react.capabilities.php` bajo el nodo portador de derechos `meliscmsnews_tools_section` (no la clave de manifiesto/zona `meliscmsnews_left_menu` usada por el iframe de la vista Old):

```
meliscmsnews_tools_section
└─ actions: list · create · edit · delete · export
```

Cada acción del controlador está protegida dos veces — `denyUnlessAccess()` (auth + `MelisCoreRights::canAccess`) y luego `denyUnlessCan(<cap>)`. `saveAction` elige entre `create` y `edit` según la presencia de un id. React condiciona el botón **+ New article** a `create` y la lista a `list` mediante `window.__melisUseCaps(melisKey)`.

## Servicios clave

Registrados como alias de `service_manager` en `config/module.config.php`.

| Alias de servicio | Rol |
| --- | --- |
| `MelisCmsNewsService` | Servicio principal de CRUD/consulta. Leer, crear, actualizar y eliminar artículos; consultar por sitio, idioma, rango de fechas, estado. Cada método dispara eventos `*_start` / `*_end` mediante `MelisGeneralService`. |

Alias de table gateway: `MelisCmsNewsTable`, `MelisCmsNewsTextsTable`, `MelisCmsNewsSeoTable`, `MelisCmsNewsCategoryTable`, `MelisCmsNewsTagsTable`.

## Front office

Tres plugins de plantillas extienden `MelisTemplatingPlugin`; cada uno tiene un controller plugin, un view helper y un archivo de configuración en `config/plugins/`.

| Plugin | Controller plugin | View helper | Pestañas de configuración |
| --- | --- | --- | --- |
| Latest News | `MelisCmsNewsLatestNewsPlugin` | `MelisCmsNewsLatestPlugin` | Properties, Filters |
| News List | `MelisCmsNewsListNewsPlugin` | `MelisCmsNewsListPlugin` | Properties, Pagination, Filters |
| News Detail | `MelisCmsNewsShowNewsPlugin` | `MelisCmsNewsShowNewsPlugin` | Properties |

Parámetros de configuración de los plugins: `template_path`, `site_id`, `pageIdNews` (enlace a la página de detalle), `column`, `order`, `limit`, `date_min`, `date_max`, `search`, más `nbPerPage` / `nbPageBeforeAfter` (solo News List). La configuración se persiste en el XML de la página mediante `loadDbXmlToPluginConfig()` / `savePluginConfigToXml()`.

El enrutamiento SEO y las metaetiquetas por artículo se conectan en `src/Module.php` mediante: `MelisCmsNewsSEORouteListener`, `MelisCmsNewsRenderPageListener`, `MelisCmsNewsMetaPageListener`, `MelisCmsNewsSeoRedirectUrlListener`.

## Tablas de la base de datos

Estructura base en `install/sql/setup_structure.sql`; migraciones en `install/dbdeploy/`.

| Tabla | Contiene |
| --- | --- |
| `melis_cms_news` | Fila principal del artículo: estado, fechas de publicación/despublicación, sitio, image1-3, documents1-3, id de slider |
| `melis_cms_news_texts` | Textos por idioma: título, subtítulo, párrafos 1-10, orden de párrafos, idioma |
| `melis_cms_news_seo` | SEO por idioma: URL, redirección, flag 301, meta título/descripción, canonical |
| `melis_cms_news_category` | Enlace artículo ↔ categoría (funcionalidad de categoría opcional) |

## Ejemplo

```php
$news = $this->getServiceManager()->get('MelisCmsNewsService');

// Latest 10 published articles for site 1, French, newest first:
$list = $news->getNewsList(
    status: 1, langId: 1, start: 0, limit: 10,
    orderColumn: 'cnews_publish_date', order: 'DESC', siteId: 1
);

// Fetch one article (all languages, or one language):
$all = $news->getNewsById(42);
$fr  = $news->getNewsById(42, 1);

// Create / update / delete:
$id = $news->saveNews($data, $newsId);   // $newsId null → create
$ok = $news->deleteNewsById(42);         // also removes texts + SEO rows

// Utility:
$txt  = $news->getPostText(42);
$pages = $news->getNewsDetailsPagesBySite(1);  // NEWS_DETAIL-type pages for a site
```

Engánchate a un evento de servicio para extender el comportamiento (p. ej. hacer ping a un índice de búsqueda tras guardar):

```php
$sharedEvents->attach('MelisCmsNews', 'melis_cms_news_save_news_end', function ($e) {
    $params = $e->getParams(); // includes 'news', 'newsId', 'results'
}, 50);
```

Otros identificadores de eventos siguen el mismo patrón `melis_cms_news_[method]_start/end`: `melis_cms_news_get_news_list_*`, `melis_cms_news_get_news_by_id_*`, `melis_cms_news_get_news_by_id_array_*`, `melis_cms_news__delete_news_by_id_*` (doble guion bajo), `melis_cms_news_get_post_text_*`, `melis_cms_news_get_news_details_pages_*`.

## Microservicios

`config/app.microservice.php` expone `getNewsList` y `getNewsById` a través del bus de microservicios de Melis con formularios e input filters generados automáticamente. Las factorías de formularios `MelisCmsNewsSelect` y `MelisCmsNewsBOSelect` se encuentran en `src/Form/Factory/`.

## Archivos clave

| Aspecto | Ruta |
| --- | --- |
| Configuración del módulo + rutas react-api inline | `vendor/melisplatform/melis-cms-news/config/module.config.php` |
| Capacidades React | `vendor/melisplatform/melis-cms-news/config/react.capabilities.php` |
| Árbol de la herramienta de back-office | `vendor/melisplatform/melis-cms-news/config/app.interface.php` |
| Configuración de la tabla de la lista | `vendor/melisplatform/melis-cms-news/config/app.tools.php` |
| Configuración de microservicios | `vendor/melisplatform/melis-cms-news/config/app.microservice.php` |
| Controlador de la API React | `vendor/melisplatform/melis-cms-news/src/Controller/MelisCmsNewsReactApiController.php` |
| Brick React (fuente Vite IIFE) | `vendor/melisplatform/melis-cms-news/ui-react/src/` |
| Brick compilado + manifiesto | `vendor/melisplatform/melis-cms-news/public/ui-react/brick.js` · `brick.manifest.json` |
| Servicio principal | `vendor/melisplatform/melis-cms-news/src/Service/MelisCmsNewsService.php` |
| Plugins de front | `vendor/melisplatform/melis-cms-news/src/Controller/Plugin/` |
| View helpers | `vendor/melisplatform/melis-cms-news/src/View/Helper/` |
| Listeners (SEO, GDPR, limpieza de slider) | `vendor/melisplatform/melis-cms-news/src/Listener/` |
| Table gateways | `vendor/melisplatform/melis-cms-news/src/Model/Tables/` |
| SQL de instalación | `vendor/melisplatform/melis-cms-news/install/sql/setup_structure.sql` |
| Migraciones de BD | `vendor/melisplatform/melis-cms-news/install/dbdeploy/` |

Consulta también: [melis-cms](/es/reference/modules/melis-cms), [melis-front](/es/reference/modules/melis-front), [melis-engine](/es/reference/modules/melis-engine), [melis-core](/es/reference/modules/melis-core)
