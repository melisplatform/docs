# MelisCmsShare

> Inyecta las meta etiquetas de compartición en redes sociales / Open Graph en el `<head>` del front-office de una página CMS, gestionadas desde un back-office React nativo. Paquete `melisplatform/melis-cms-share`.

## Propósito

`MelisCmsShare` permite a un editor definir cinco valores por página — **título, descripción, imagen, tipo y URL** —
y los escribe en el `<head>` de la página renderizada como tres familias de meta etiquetas: **Twitter Card**
(`twitter:title/description/image/card`), **schema.org / Google** (atributos `itemprop`) y
**Facebook / Open Graph** (`og:title/description/image/type/url`). Se almacena una fila de datos por
página; una etiqueta ya presente en la plantilla se reemplaza, en caso contrario se inserta justo después de
`<head>`. Las páginas sin una fila de compartición se dejan intactas.

En v6 el módulo incorpora un **brick React nativo completo** (no un brick de iframe) que expone estos datos en dos
superficies — una herramienta **Open Graph** independiente y una **pestaña Open Graph dentro del editor de páginas CMS** —
ambas leyendo y escribiendo a través de una capa JSON `/melis/react-api/cms-share…`. El inyector del
`<head>` del front-office, el modelo de datos y los servicios permanecen sin cambios respecto a v5.

## Activarlo

Añádelo a `config/melis.module.load.php`:

```php
return [
    'MelisCmsShare',
];
```

Dependencias: `melisplatform/melis-core`, `melisplatform/melis-engine`, `melisplatform/melis-front`
y `melisplatform/melis-cms`. El módulo necesita el editor de páginas CMS (para la pestaña Open Graph y los eventos
del ciclo de vida de la página) y el pipeline de renderizado del front (para el hook `MvcEvent::EVENT_FINISH`). Ambas
superficies React aparecen **solo mientras el módulo esté listado aquí** (descubrimiento modular de bricks vía
`GET /melis/react-api/react-modules`).

## El back-office React

El brick es una interfaz **React nativa completa** con un **conmutador New / Old**: *New* es la interfaz React
(por defecto), *Old* renderiza la herramienta heredada en un iframe
(`/melis/react-tool-page?key=melis_cms_share_tool_display`).

| Elemento | Valor |
| --- | --- |
| ID del brick | `cms-share` (ruta `/melis-cms-share/share`, etiqueta `Partage`) |
| `forwardKey` | `MelisCmsShare/MelisCmsShareTool` |
| `melisKey` (permisos / iframe de la vista Old) | `melis_cms_share_tool_display` |
| Clave de la pestaña del editor de páginas | `melis_cms_share_page_edition_tab` (registrada bajo `meliscms_page`) |
| Base de la API | `/melis/react-api/cms-share` |

**Herramienta Open Graph** — Barra lateral → **Site Tools** → **Open Graph**. Lista la fila de compartición de cada página con
**tarjetas KPI** (Total de comparticiones, Páginas cubiertas, Tipos distintos), un cuadro de **búsqueda** (título, URL, tipo,
descripción, id de página), un filtro **All types**, **Reset filters**, un gestor de **Columns**,
**Export**, un refresco y el conmutador New/Old. Haz clic en el encabezado de una columna (Page / Title / Type / URL /
Added on) para ordenar; cada fila tiene editar (lápiz) y eliminar (papelera).

![La herramienta React Open Graph: tarjetas KPI (Total / Páginas cubiertas / Tipos distintos), búsqueda, un filtro de tipo, Reset filters, gestor de Columns, Export, el conmutador New/Old y un refresco — cada fila muestra Page, Title, Type, URL, Added on con acciones de editar y eliminar por fila](/screenshots/react/melis-cms-share/meliscmsshare-tool-opengraph-list.png)

**Formulario de edición** — Page ID (obligatorio), Type (`article`, `website`…), Title (`og:title`), URL
(`og:url`), un panel de Image (previsualización + Replace / Remove; JPG, PNG, GIF, WEBP — máx. 15 MB) y una
Description (`og:description`). La imagen se sube primero (multipart) a
`/media/melisCmsShare/<pageId>/…`, y luego su ruta se almacena al pulsar **Save**.

![El formulario de compartición React — Page ID, Type, Title, URL, un panel de imagen con la ruta almacenada (`/media/melisCmsShare/<pageId>/…`) más Replace/Remove, y un área de texto Description](/screenshots/react/melis-cms-share/meliscmsshare-tool-opengraph-edit.png)

**Pestaña Open Graph en el editor de páginas CMS** — abre una página CMS y elige la pestaña **Open Graph** para editar
los metadatos de compartición de esa página en línea (Title, Type, URL, Image, Description); el Page ID es
implícito. La pestaña **no tiene su propio botón Save** — los valores se persisten mediante
Save / Publish del editor de páginas a través de un hook de guardado, exactamente como la pestaña Share heredada.

![El editor de páginas CMS con la pestaña Open Graph activa (junto a Edition, Properties, SEO, Languages, Historic, Page Analytics y más) — Title, Type, URL, panel de imagen y Description, guardados mediante los botones superiores Save/Publish de la página](/screenshots/react/melis-cms-share/meliscmsshare-pageedition-tab-opengraph.png)

## API React

Las rutas residen en `config/react-api.php` (fusionadas vía `MelisCmsShare\Module::getConfig()`); controlador
`MelisCmsShare\Controller\MelisReactApiShareController`. Todas bajo `/melis/react-api/cms-share` con
el contrato `{ success, data, error }`.

| Método y URL | Guard | Propósito |
| --- | --- | --- |
| `GET /cms-share` | access + `list` | Lista por keyset (`limit`, `search`, `type`, `page`, `sort`, `dir`, `after`) → `{items,total,nextCursor}` |
| `GET /cms-share/stats` | access + `list` | KPI `{total, pages, types}` |
| `GET /cms-share/types` | access + `list` | Valores distintos de `mcs_type` (opciones de filtro) |
| `GET /cms-share/:id` | access + `edit` | Una fila de compartición |
| `GET /cms-share/by-page/:idPage` | solo auth | La compartición de la página (para la pestaña del editor de páginas); `data:null` si no hay ninguna |
| `POST /cms-share/save` | access + `create`/`edit` | Crear / actualizar (`{id?, pageId, title, type, url, img, description}`); autor forzado en el servidor; caché de página invalidada |
| `POST /cms-share/upload-image` | access + `edit` | Subida multipart (`pageId`, `image`) → `{path}` bajo `/media/melisCmsShare/<pageId>/…` |
| `DELETE /cms-share/delete/:id` | access + `delete` | Elimina una fila; caché de página invalidada |

El controlador se comunica con `melis_cms_share` **directamente mediante SQL parametrizado**, reproduciendo las
reglas de negocio heredadas (id de página obligatorio, autor forzado al usuario actual al crear, lista blanca de imágenes
jpg/jpeg/png/gif/webp/ico/bmp ≤ 15 MB conservada como el único archivo bajo `/media/melisCmsShare/<pageId>/`,
invalidación de la caché de página del front para que las etiquetas del `<head>` se actualicen). El servicio de más alto nivel `MelisCmsShareService`
no lo utiliza este controlador. Cada fetch envía `X-Requested-With: XMLHttpRequest` y
`credentials:'include'`.

## Capacidades

Declaradas en `config/react.capabilities.php` bajo el nodo portador de permisos
`melis_cms_share_tool_display` (el mismo nodo usado por el guard de acceso del controlador):

```
melis_cms_share_tool_display → list · create · edit · delete · export
```

`MelisCan('melis_cms_share_tool_display', cap)` controla los botones de la interfaz; en el servidor cada acción llama a
`denyUnlessAccess()` (auth + `MelisCoreRights::canAccess(...)` → 401/403) y luego a `denyUnlessCan(cap)`.
La pestaña del editor de páginas es una contribución **modular** aparte: el mismo archivo fusiona una entrada `tabs`
bajo `meliscms_page` (clave `melis_cms_share_page_edition_tab`, coincidiendo con la llamada `registerPageTab(...)`
en el brick), de modo que MelisCms muestra el botón de la pestaña.

## Servicios clave

| Alias del servicio | Función |
| --- | --- |
| `MelisCmsShareService` | CRUD completo para registros de compartición: `saveShare($data)`, `deleteShare()`, `getShareById()`, `getShareByPageId($idPage)`, `getAllShare()`, `searchShare()`, `countAllShare()`, `countFilteredShare()`. |
| `melisCmsShareTable` | Table gateway para `melis_cms_share` (`MelisCmsShareTable`). Busca la fila de una página con `getEntryByField('mcs_page_id', $idPage)`. |

## Front office

No se expone ningún view helper ni plugin de plantillas. Las etiquetas de compartición son inyectadas por
`MelisCmsShare\Listener\MelisCmsShareMetaPageListener`, adjuntado en `src/Module.php` y disparándose en
**`MvcEvent::EVENT_FINISH`** con prioridad **110**:

1. Omite las peticiones que no son PHP/assets (regex sobre la URI) y las peticiones sin un `idpage`.
2. Carga la fila de compartición de la página vía `melisCmsShareTable->getEntryByField('mcs_page_id', $idPage)`.
3. Para cada campo no vacío, aplica `preg_replace` a la etiqueta existente o la inserta después de `<head>` —
   en las tres familias (Twitter Card, `itemprop`, `og:`).
4. Escapa los valores con `addslashes`, antepone `scheme://host` a las URL de imagen, y reescribe vía
   `$response->setContent()`.

Como opera sobre la cadena HTML ya renderizada al final del ciclo de vida MVC, puede
reemplazar etiquetas que una plantilla ya haya emitido.

> **Advertencia sobre el tipo:** el único campo `mcs_type` alimenta tanto a `twitter:card` como a `og:type`, que esperan
> vocabularios diferentes (`summary`/`summary_large_image` frente a `website`/`article`). Usa un valor
> aceptable para ambos, o acepta que uno sea no canónico.

## Listeners del ciclo de vida de la página

| Listener | Evento(s) | Propósito |
| --- | --- | --- |
| `MelisCmsSavePageListener` | `meliscms_page_save_start`, `meliscms_page_publish_start` | Mantiene el registro de compartición coherente cuando se guarda o publica una página CMS. |
| `MelisCmsShareDeletePageListener` | `meliscms_page_delete_end` | Elimina la fila de `melis_cms_share` cuando se elimina su página (sin datos de compartición huérfanos). |
| `MelisCmsShareFlashMessengerListener` | Eventos BO de guardado/eliminación | Retroalimentación flash del back-office tras guardar o eliminar. |

## Tablas de base de datos

| Tabla | Contiene |
| --- | --- |
| `melis_cms_share` | Una configuración de compartición por página. PK `mcs_id`. Columnas: `mcs_page_id`, `mcs_title`, `mcs_description`, `mcs_img`, `mcs_type`, `mcs_url`, `mcs_add_user_id`, `mcs_date_added`. La tabla une el usuario BO para exponer `mcs_share_added_by` (nombre completo). |

## Ejemplo

```php
// Read the share config for a given page
$share = $serviceManager->get('MelisCmsShareService')->getShareByPageId($pageId);

// Persist a share config for a page (create or update)
$serviceManager->get('MelisCmsShareService')->saveShare([
    'mcs_page_id'      => $pageId,
    'mcs_title'        => 'My page title for social',
    'mcs_description'  => 'A short description shown in link previews.',
    'mcs_img'          => '/path/to/preview-image.jpg',
    'mcs_type'         => 'summary_large_image',
    'mcs_url'          => 'https://example.com/my-page',
    'mcs_add_user_id'  => $currentUserId,
]);
```

## Archivos clave

| Aspecto | Ruta |
| --- | --- |
| Módulo / bootstrap | `vendor/melisplatform/melis-cms-share/src/Module.php` |
| Rutas de la API React + invokable | `vendor/melisplatform/melis-cms-share/config/react-api.php` |
| Capacidades React + pestaña de página | `vendor/melisplatform/melis-cms-share/config/react.capabilities.php` |
| Controlador de la API React | `vendor/melisplatform/melis-cms-share/src/Controller/MelisReactApiShareController.php` |
| Controlador BO heredado (vista Old) | `vendor/melisplatform/melis-cms-share/src/Controller/MelisCmsShareToolController.php` |
| Fuente del brick React | `vendor/melisplatform/melis-cms-share/ui-react/src/` (`brick.tsx`, `SharePage.tsx`, …) |
| Brick compilado + manifiesto | `vendor/melisplatform/melis-cms-share/public/ui-react/` (`brick.js`, `brick.manifest.json`) |
| Inyector del `<head>` del front | `vendor/melisplatform/melis-cms-share/src/Listener/MelisCmsShareMetaPageListener.php` |
| Servicio | `vendor/melisplatform/melis-cms-share/src/Service/MelisCmsShareService.php` |
| Tabla | `vendor/melisplatform/melis-cms-share/src/Model/Tables/MelisCmsShareTable.php` |

Ver también: [MelisCms](/es/reference/modules/melis-cms) · [MelisCmsPageAnalytics](/es/reference/modules/melis-cms-page-analytics) · [Referencia de módulos](/es/reference/modules)
