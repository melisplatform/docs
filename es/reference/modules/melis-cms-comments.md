# MelisCmsComments

> Sistema de comentarios para publicaciones de News y Blog — moderación, un flujo de aprobación opcional por publicación, un plugin de front-office «Post comments» y un widget de panel. En v6, la interfaz de moderación es una pestaña **Comments** en el editor React de News/Blog. Paquete `melisplatform/melis-cms-comments`.

## Propósito

MelisCmsComments añade un sistema de comentarios a las publicaciones de **MelisCmsNews** y **MelisCmsBlog**. Incluye
el backend de comentarios (tabla `melis_cms_comments` + `MelisCmsCommentsService`), un plugin de
plantillas de front-office (lista de comentarios + formulario «leave a comment»), un flujo de **validación**
por publicación que mantiene los comentarios del front-office pendientes hasta que un administrador los aprueba, y un widget de panel
**Latest comments**. Combinado con **MelisCmsUserAccount**, los comentarios pueden requerir una cuenta de sitio con sesión iniciada.

En el back-office React (`/melis-react`) este módulo **no incluye ningún brick propio** — sin `ui-react/`,
sin `react-api.php`, sin `react.capabilities.php`. Es un módulo de **backend + contribución** con tres
superficies pertenecientes al host:

1. una **pestaña de moderación de comentarios** dentro del editor de News/Blog — la interfaz de la pestaña React y sus endpoints `/comments…`
   **pertenecen a los bricks de News y Blog**, que delegan en el servicio de este módulo;
2. un **plugin de página de front «Post comments»** colocado y configurado en el editor de páginas CMS React;
3. un **widget de panel «Latest comments»** — un plugin de panel **PHP/phtml heredado (legacy)** renderizado dentro
   del host de widgets del panel React (sin reescritura en React).

## Activarlo

Añádelo a `config/melis.module.load.php`:

```php
return [
    'MelisCmsComments',
];
```

Dependencias de Composer: `melis-core ^6.0` y `melis-cms ^6.0`. Funcionalmente requiere al menos un módulo
de publicaciones — **MelisCmsNews** o **MelisCmsBlog** — para ser útil. **MelisCmsUserAccount** es una integración
opcional para comentarios restringidos a cuentas. Todas las superficies están condicionadas a la activación: cuando el módulo está ausente,
los endpoints de comentarios de News/Blog devuelven **404** y el panel de moderación se oculta.

## Servicios clave

| Alias de servicio | Rol |
| --- | --- |
| `MelisCmsCommentsService` | Servicio principal de CRUD/moderación (extiende `MelisEngineGeneralService`). Dispara pares de eventos `*_start`/`*_end` en cada método. Llamado por los controladores react-api de News/Blog. |

Métodos clave de `MelisCmsCommentsService`:

```php
$svc = $sm->get('MelisCmsCommentsService');

// Create or update a comment (BO comments are approved immediately)
$id = $svc->saveComment($text, $postId, $commentId, 'NEWS', $name, $authorId, 'front');

// Fetch a single comment
$comment = $svc->getCommentById($id);

// Front-office list for a post (ordered)
$list = $svc->getCommentsByPostId($postId, 'BLOG', 'mccom_date_creation', 'DESC');

// Back-office query — omit 'validated' to return pending + approved + refused
$rows = $svc->getComments([
    'postType'     => 'NEWS',
    'postId'       => $postId,
    'withUserInfo' => true,
    'limit'        => 10,
]);

// Moderation
$svc->approveComment($id);          // mccom_validated=1, status=1 (shown)
$svc->refuseComment($id);           // mccom_validated=2, status=0 (hidden)
$svc->deleteCommentById($id);

// Cascade-delete when a post is removed
$svc->deletePostComments('NEWS', $postId);
```

`saveComment()` lee el indicador `c{type}_validate_comments` de la publicación: cuando está activado y el comentario proviene
del front-office, se almacena como pendiente (`validated=0`); los comentarios del back-office se almacenan como
aprobados de inmediato. Todo el texto guardado pasa por **HTMLPurifier 4.12** para su sanitización contra XSS.

## Pestaña de moderación de comentarios (React, propiedad de News/Blog)

Abre un artículo de News o una publicación de Blog en el editor y cambia a la pestaña **Comments**. Muestra los
comentarios de esta publicación con un **punto de estado** por fila (azul = pendiente, verde = mostrado, rojo = rechazado), el
autor, el texto del comentario y la hora, un cuadro en línea **Name + write-a-comment + Add a comment** para
publicar uno directamente, y acciones por fila de **aprobar / rechazar / eliminar** (aprobar/rechazar solo aparecen cuando
la publicación tiene la validación activada).

![La pestaña Comments del editor de News React: un panel COMMENTS con un campo Name en línea, un cuadro «Write a comment…» y un botón rojo + Add a comment, seguido de una fila de comentario con un punto de estado, el texto del comentario y las acciones de icono de rechazar/eliminar](/screenshots/react/melis-cms-comments/meliscmscomments-tooloverride-news-edit-tab-comments.png)

El componente de la pestaña React pertenece a los **bricks de News/Blog**, no a este módulo. **No hay
`react-api.php` en MelisCmsComments** — los comentarios se exponen a través del react-api propio de los módulos
News y Blog, que delega cada operación en `MelisCmsCommentsService`:

| Método y URL | Controlador / acción propietaria | Propósito |
| --- | --- | --- |
| `GET /melis/react-api/news/:id/comments` | `MelisCmsNewsReactApiController::commentsAction` | Todos los comentarios (todos los estados) de un artículo de news |
| `POST /melis/react-api/news/comments/save` | `commentSaveAction` | Crear/editar un comentario (BO → aprobado) |
| `POST /melis/react-api/news/comments/approve/:cid` | `commentApproveAction` | Aprobar (`mccom_validated=1`, status=1) |
| `POST /melis/react-api/news/comments/refuse/:cid` | `commentRefuseAction` | Rechazar (`mccom_validated=2`, status=0) |
| `POST /melis/react-api/news/comments/delete/:cid` | `commentDeleteAction` | Eliminar el comentario |
| `GET /melis/react-api/blog/:id/comments` | `MelisCmsBlog…ReactApiController::commentsAction` | Todos los comentarios de una publicación de blog |
| `POST /melis/react-api/blog/comments/{save,approve,refuse,delete}[/:cid]` | Acciones de comentario de Blog | Las mismas operaciones para Blog |

El `commentsAction` construye una consulta `getComments(['postId' => …, 'postType' => 'NEWS'])` sin
clave `validated`, por lo que devuelve comentarios **pendientes + aprobados + rechazados**. Cada acción devuelve **404
cuando el módulo no está disponible**; el contrato es `{ success, data|error }`.

```ts
// list a post's comments (all statuses)
const res = await fetch(`/melis/react-api/news/${idNews}/comments`, {
  credentials: 'include',
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
}).then(r => r.json());          // → { success: true, data: [ { …comment… } ] }

// approve one
await fetch(`/melis/react-api/news/comments/approve/${commentId}`, {
  method: 'POST', credentials: 'include',
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
});
```

El `MelisCmsCommentsTabController` heredado (getComments / save / approve / refuse / delete, protegido por
`hasAccess('meliscms_page')`) todavía se usa en la ruta clásica/iframe — consulta la
[documentación heredada](/legacy/reference/modules/melis-cms-comments).

## Plugin de página de front «Post comments»

`Controller\Plugin\MelisCmsCommentsPlugin` es un `MelisTemplatingPlugin` (clave de configuración `meliscmscomments`,
sección **MelisCms**, configuración en `config/plugins/MelisCmsCommentsPlugin.config.php`). En el panel **PLUGINS**
del editor de páginas CMS React, bajo **Melis Cms Comments**, arrastra **Post comments** a una zona de destino
en una plantilla de página de News/Blog.

![El editor de páginas CMS con el panel PLUGINS: el grupo Melis Cms Comments expandido para mostrar el plugin Post comments arrastrado a una DRAG & DROP ZONE; el formulario de front renderizado muestra un campo Name, un cuadro «Add a comment:» y un botón rojo Submit](/screenshots/react/melis-cms-comments/meliscmscomments-page-plugin-postcomments-menu-selector.png)

- La **ventana modal de configuración** elige la **Template** (por defecto `MelisCmsComments/comments`) y el **Post Type**
  (NEWS / BLOG), que se persisten en el XML del plugin de la página como `template_path`, `mccplugin_post_type` y
  `registration_page_page_id` (para comentarios restringidos a cuentas mediante MelisCmsUserAccount).

![La ventana modal de configuración del plugin Post comments: un selector Template (MelisCmsComments/comments) y un selector Post Type (News / Blog), con botones Cancel / Apply; estos ajustes se persisten en el XML del plugin de la página](/screenshots/react/melis-cms-comments/meliscmscomments-page-plugin-postcomments-config-settings.png)

- El **renderizado de front** (`front()`) resuelve la publicación a partir del parámetro de consulta `newsId` / `blogId`, carga
  los comentarios mediante `getCommentsByPostId()` y construye el formulario para añadir comentarios (Name + comentario + Submit).
  Cuando la publicación requiere una cuenta, dispara `melis_cms_user_account_login_form` para incrustar un plugin
  de inicio de sesión.
- Vista por defecto `MelisCmsComments/comments`; recursos `plugins/css/commentsPlugin.css`,
  `plugins/js/commentsPlugin.js`.

## Widget de panel «Latest comments» (legacy)

`Controller\DashboardPlugins\MelisCmsCommentsLatestCommentsPlugin` extiende
`MelisCoreDashboardTemplatingPlugin`; su `latestCommentsAction()` devuelve un `ViewModel` de Laminas
(plantilla `melis-cms-comments/dashboard/latest-comments`, un `.phtml`), registrado en
`config/dashboard-plugins/dashboard.config.php` (id de plugin `MelisCmsCommentsLatest`). El **host de widgets**
del panel React renderiza este plugin heredado tal cual — **no hay reescritura en React**. Muestra
los comentarios más recientes por tipo de publicación (pestañas Blog / News) con filtros **All sites / All users / límite**,
y por cada comentario muestra el autor, una insignia de estado, el título de la publicación y la fecha. Los filtros de sitio/usuario
y la recarga de zona los sirve `MelisCmsCommentsViewHelperController::listAction`
(`melis-cms-comments/dashboard/list`, zona `dashboard_latest_comments_list`).

![El widget Latest comments del panel React: una pestaña «Blog comments» con selectores All sites, All users y límite, seguido de una lista de comentarios recientes (autor + insignia de id de usuario + insignia verde de ojo «shown», el título de la publicación entre corchetes, el texto del comentario y «on: fecha»)](/screenshots/react/melis-cms-comments/meliscmscomments-dashboardplugins-latestcomments.png)

## Tablas de la base de datos

| Tabla | Contiene |
| --- | --- |
| `melis_cms_comments` | Todos los comentarios: `mccom_id`, `mccom_post_id`, `mccom_type` (NEWS/BLOG), `mccom_comment_text`, `mccom_name`, `mccom_validated`, `mccom_status`, `mccom_date_creation`, `mccom_author_account`. |

Se añaden automáticamente dos columnas a las tablas de los módulos de publicaciones durante el arranque (sin necesidad de cambios de esquema allí):

| Columna | Tabla | Propósito |
| --- | --- | --- |
| `cnews_validate_comments` | `melis_cms_news` | Indicador «Validate comments» por publicación para News. |
| `cblog_validate_comments` | `melis_cms_blog` | Indicador «Validate comments» por publicación para Blog. |

**Modelo de estados.** `mccom_validated`: `0` = nuevo/pendiente (azul), `1` = aprobado/mostrado (verde),
`2` = rechazado/oculto (rojo). `mccom_status` refleja la visibilidad en el sitio (`1` mostrado / `0` oculto).

## Listeners y cableado entre módulos

Enlazados en `Module.php` durante el arranque:

| Listener | Evento | Propósito |
| --- | --- | --- |
| `MelisCmsCommentsFlashMessengerListener` | `melis_cms_comments_flash_messenger` | Retroalimentación de flash-messenger y registro de actividad (`CMS_COMMENT_ADD / UPDATE / DELETE`). |
| `MelisCmsCommentsSaveValidateCommentListener` | `meliscmsnews_get_postvalues` | Persiste `cnews_validate_comments` cuando se guarda una publicación de news. |
| `MelisCmsCommentsGdprAutoDeleteActionDeleteListener` | `melis_cms_user_account_gdpr_auto_delete_action_delete` | RGPD: pone a null `mccom_author_account` para una cuenta eliminada y luego vuelve a disparar el evento RGPD del módulo. |

`Module::addValidateCommentsField()` (arranque del back-office) comprueba qué módulos de publicaciones están activos y
añade la columna `c{news,blog}_validate_comments` a sus tablas si falta.

## Archivos clave

| Aspecto | Ruta |
| --- | --- |
| Configuración del módulo (servicios, controladores, plugins) | `vendor/melisplatform/melis-cms-comments/config/module.config.php` |
| Configuración del plugin de front | `vendor/melisplatform/melis-cms-comments/config/plugins/MelisCmsCommentsPlugin.config.php` |
| Configuración del plugin de panel | `vendor/melisplatform/melis-cms-comments/config/dashboard-plugins/dashboard.config.php` |
| Servicio principal | `vendor/melisplatform/melis-cms-comments/src/Service/MelisCmsCommentsService.php` |
| Controlador de pestaña heredado | `vendor/melisplatform/melis-cms-comments/src/Controller/MelisCmsCommentsTabController.php` |
| Plugin de plantillas de front | `vendor/melisplatform/melis-cms-comments/src/Controller/Plugin/MelisCmsCommentsPlugin.php` |
| Widget de panel | `vendor/melisplatform/melis-cms-comments/src/Controller/DashboardPlugins/MelisCmsCommentsLatestCommentsPlugin.php` |
| Listeners | `vendor/melisplatform/melis-cms-comments/src/Listener/` |
| Modelo de BD / table gateway | `vendor/melisplatform/melis-cms-comments/src/Model/Tables/MelisCmsCommentsTable.php` |
| Arranque / inyección de columnas | `vendor/melisplatform/melis-cms-comments/src/Module.php` |
| HTMLPurifier (incluido) | `vendor/melisplatform/melis-cms-comments/library/htmlpurifier-4.12.0/` |

> La interfaz de la pestaña Comments de React y sus endpoints `/comments…` residen en los bricks de News/Blog
> (`MelisCmsNewsReactApiController`, `MelisCmsBlog…ReactApiController`); ambos delegan en
> `MelisCmsCommentsService`. Modelo de datos, servicio y la herramienta clásica:
> [documentación heredada](/legacy/reference/modules/melis-cms-comments).

Consulta también: [MelisCmsNews](/es/reference/modules/melis-cms-news) · [MelisCmsBlog](/es/reference/modules/melis-cms-blog) · [MelisCms](/es/reference/modules/melis-cms) · [MelisEngine](/es/reference/modules/melis-engine) · [MelisCore](/es/reference/modules/melis-core)
