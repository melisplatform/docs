# MelisCmsUserAccount

> Sistema de cuentas para visitantes del sitio (front-office): registro, inicio de sesión y perfiles por sitio para los miembros del sitio web, administrado desde una herramienta de back-office nativa en React. Paquete `melisplatform/melis-cms-user-account`.

## Propósito

MelisCmsUserAccount gestiona las cuentas de **visitantes del sitio** (front-office): las personas que se
registran e inician sesión en sus sitios CMS. Estas cuentas son distintas de las cuentas del personal de
back-office gestionadas por MelisCore. Las cuentas tienen un alcance **por sitio** (una misma persona puede
tener cuentas en varios sitios). El módulo incluye dos plugins de página arrastrables (formulario de inicio
de sesión y formulario de registro), una herramienta de administración de back-office y un flujo RGPD
completo que cubre la información de datos, la exportación de datos, la eliminación anonimizada y un flujo
automático de purga de cuentas inactivas. Durante el arranque también añade columnas de clave foránea a las
tablas de blog/noticias/comentarios para que una única pasada RGPD pueda mostrar, exportar o borrar todo lo
que un usuario posee en esos módulos.

En la v6, la herramienta de administración de back-office (**Users FO**) es un **brick nativo totalmente en
React** — una interfaz CRUD real en React que llama a una capa `react-api` en JSON — con un conmutador
**New / Old** que recurre a la herramienta heredada en un iframe. El framework, los servicios, las tablas, la
maquinaria RGPD y los plugins de front-office no han cambiado; solo la interfaz de administración se ha
migrado a React.

## Activarlo

Añádalo a `config/melis.module.load.php`:

```php
return [
    'MelisCmsUserAccount',
];
```

Dependencias de Composer: `melisplatform/melis-core` (framework RGPD, sesiones, herramientas BO) y
`melisplatform/melis-cms` (host de páginas/plugins). `melis-engine` y `melis-front` se incorporan de forma
transitiva para el renderizado del front-office. La herramienta React se detecta automáticamente en cuanto el
módulo está activo (incluye un `brick.manifest.json`); al eliminar el módulo de `melis.module.load.php` la
herramienta desaparece del back-office React.

## Servicios clave

| Alias de servicio | Rol |
| --- | --- |
| `MelisCmsUserAccountService` | Servicio principal — también con alias **`FrontUserAccountService`**. CRUD de usuarios del sitio y autenticación. |
| `MelisCmsUserAccountGdprAutoDeleteService` | Lógica del flujo de autoeliminación de cuentas inactivas (avisos + anonimización). |
| `FrontUserAccountTable` | Table gateway de `melis_cms_user_account`. |
| `MelisCmsUserSitesTable` | Table gateway de `melis_cms_user_account_sites`. |
| `MelisPasswordValidator` | Validador de política de contraseñas (mín. 8 caracteres, una minúscula, un dígito) aplicado en el registro y al guardar el perfil. |

Métodos clave de `MelisCmsUserAccountService` (con alias `FrontUserAccountService`):

```php
$svc = $sm->get('FrontUserAccountService');

// Authenticate a site visitor
$result = $svc->siteUserAuthenticate($login, $password, $siteId);

// Create a new account
$id = $svc->createUser($data);

// Fetch by various keys
$user = $svc->getUserById($id);
$user = $svc->getUserByLogin($login);
$user = $svc->getUserByEmailAndPassword($email, $password);

// Persist profile changes
$svc->saveUserAccountData($id, $data);

// Site memberships for a user
$sites = $svc->getUsersSitesByUserId($id);

// Record a login timestamp (used by the auto-delete pipeline)
$svc->updateUserConnectionDate($id);
```

Como alternativa, dispare el evento `site_user_account_authentication` y deje que
`MelisCmsUserAccountSiteUserAuthenticationListener` invoque a `siteUserAuthenticate()`; el usuario autenticado
se almacena entonces en un `Laminas\Session\Container` indexado por sitio.

## Back-office (React) — Users FO

La herramienta **Users FO** reside en el back-office React (`/melis-react`), en el grupo de la barra lateral
**MelisCms** → **Utilisateurs FO** ("FO Users"). Es un **brick nativo totalmente en React** (no un iframe)
montado en la ruta del árbol `/melis-cms/user-account`; la clave de menú `melis_cms_user_account_tool_display`
controla el acceso, las capacidades y el iframe de la vista Old. La herramienta administra únicamente
**usuarios del sitio**, nunca al personal de back-office (esos corresponden a la herramienta **Users** de
MelisCore).

Es un desglose en dos niveles presentado mediante las **sub-pestañas nativas** del host (`subTabs: true`): una
**lista** plana de usuarios del sitio y un único formulario **User** abierto por sub-pestaña.

![Lista Users FO en React — tarjetas KPI (Total / Active / Inactive / Admins), búsqueda, filtros de estado/admin/sitio, Reset filters, gestor de Columns, Export, el conmutador New / Old y + New user; cada fila expone las acciones View sites, Edit y Delete](/screenshots/react/melis-cms-user-account/meliscmsuseraccount-tool-usersfo-list.png)

**Lista (nivel 1)** — una tabla con búsqueda, ordenación y filtros de todas las cuentas de front-office de la
plataforma, con **tarjetas KPI** (Total / Active / Inactive / Admins). Controles:

- **Search** (coincide con login, email, nombre y apellido)
- Filtro de **Status** (All / Active / Inactive) y filtro de **Admin** (All / Admin / Non-admin)
- Selector de **Site** (All sites) y **Reset filters**
- Gestor de **Columns** (ocultar / reordenar columnas mediante arrastrar y soltar)
- **Export** a Excel o CSV (se ejecuta del lado del cliente en el brick mediante SheetJS)
- Conmutador **New / Old** (arriba a la derecha) y botón **+ New user**

Columnas: **Id · Status · Admin · Picture · Email · Login · Full Name · Creation date · Action** (la columna
Picture es solo de presentación; haga clic en cualquier otro encabezado para ordenar). Cada fila expone tres
acciones:

| Acción | Descripción |
| --- | --- |
| View sites (🔍) | Modal que lista, por cada sitio al que pertenece el usuario, la fecha de registro, la hora del último inicio de sesión, si la pertenencia está **anonimizada** (RGPD) y los dominios del sitio. |
| Edit (✏️) | Abre el usuario en una sub-pestaña (véase abajo). |
| Delete (🗑) | Elimina la cuenta (irreversible). |

**Formulario de usuario (nivel 2)** — al abrir una fila o **+ New user** se añade una sub-pestaña con un único
formulario **User**: **Login** (solo lectura al editar), **Email**, **First name**, **Last name**, **Birthday**
(un calendario en el idioma de la sesión), **Language**, una **Creation date** de solo lectura, un panel
**Picture** (vista previa + Choose an image / Remove picture) y **Password** / **Confirm password**. A la
derecha, los conmutadores **Active** y **Administrator** y la lista de casillas **Sites** (obligatoria).
**Save** persiste la cuenta.

![El formulario React de edición de usuario — Login (solo lectura al editar), Email, First/Last name, Birthday, Language, Creation date de solo lectura, panel Picture, Password / Confirm password, además de los conmutadores Active y Administrator y la lista de casillas Sites obligatoria](/screenshots/react/melis-cms-user-account/meliscmsuseraccount-tool-usersfo-edit-tab-user.png)

> Los campos de contraseña muestran la indicación *"Leave empty to keep unchanged"* — editar un perfil nunca
> obliga a cambiar la contraseña. Cuando **sí** se escribe una contraseña, debe cumplir con
> `MelisPasswordValidator` (mín. 8 caracteres, una minúscula, un dígito). **Se requiere al menos un sitio**; un
> sitio ya **anonimizado** (RGPD) para ese usuario se descarta silenciosamente del envío.

**Conmutador New / Old** — toda la herramienta alterna entre la interfaz React (**New**, por defecto) y la
herramienta clásica renderizada en un iframe (**Old**,
`/melis/react-tool-page?key=melis_cms_user_account_tool_display`). La herramienta BO heredada sigue siendo
servida por **`MelisCmsUserAccountToolController`**, sin cambios.

## Endpoints de la API React

Las rutas residen en `config/react-api.php`, servidas por el controlador
`MelisReactApiUserAccountController` (alias invocable
`MelisCmsUserAccount\Controller\MelisReactApiUserAccount`). Todas bajo `/melis/react-api/user-account`,
devolviendo el contrato `{ success, data, error }`.

| Método y URL | Propósito |
| --- | --- |
| `GET /user-account` | Lista usuarios (keyset: `limit`, `search`, `siteId`, `admin`, `status`, `sort`, `dir`, `after`) → `{items,total,nextCursor}`; cada elemento incluye `hasPicture` |
| `GET /user-account/stats` | KPI `{total, active, inactive, admins}` |
| `GET /user-account/sites` | Lista de sitios de la plataforma (filtro + casillas del formulario) → `[{id,label}]` |
| `GET /user-account/langs` | Lista de idiomas (selector del formulario) → `[{id,label}]` |
| `GET /user-account/:id` | Un usuario (añade `siteIds[]` + `pictureDataUrl`) — para editar |
| `GET /user-account/:id/picture` | Imagen de la fila como `image/jpeg` (recurre al avatar por defecto) |
| `GET /user-account/:id/sites` | Detalle "View sites" por sitio: label, fechas de registro/último inicio de sesión, `anonymized`, dominios |
| `POST /user-account/save` | Crea / actualiza la cuenta |
| `DELETE /user-account/delete/:id` | Elimina la cuenta |

`list`/`stats` consultan `melis_cms_user_account` directamente con SQL parametrizado; `get`/`save`/`delete`/
`userSites` **delegan en los servicios heredados** (`FrontUserAccountTable`, `FrontUserAccountService`) — los
mismos servicios que utiliza la herramienta heredada, de modo que se conservan todas las reglas de negocio
(login/email únicos, hash de contraseña, enlaces de sitio, protección RGPD de sitios anonimizados) y los
eventos del registro de actividad (`meliscms_user_account_tooluser_save` / `_delete`).

## Capacidades

Declaradas en `config/react.capabilities.php` bajo el nodo de derechos
`melis_cms_user_account_tool_display`. La herramienta es un CRUD plano, por lo que la declaración es una lista
plana:

```php
return [
  'melisReactToolCapabilities' => [
    'melis_cms_user_account_tool_display' => ['list', 'create', 'edit', 'delete', 'export'],
  ],
];
```

Cada acción de la API llama primero a `denyUnlessAccess()` (auth +
`MelisCoreRights::canAccess('melis_cms_user_account_tool_display')` → 401/403) y luego a una comprobación de
capacidad:

| Capacidad | Aplicada en |
| --- | --- |
| `list` | `list`, `stats`, `picture` |
| `edit` | `get`, `userSites` y `save` cuando hay un `id` presente (actualización) |
| `create` | `save` cuando no hay `id` (creación) |
| `delete` | `delete` |
| `export` | solo declarativa — la exportación se ejecuta del lado del cliente en el brick |

## Front office

Se registran dos plugins de plantilla bajo `config/plugins/` (sin cambios en la v6 — servidos por el
renderizador de front-office, no por la herramienta React):

| Plugin | Renderiza | Opciones clave |
| --- | --- | --- |
| `MelisCmsUserAccountLoginPlugin` | Formulario de inicio de sesión (y control de cierre de sesión cuando ya está autenticado). | `template_path`, `page_id_registration_page` |
| `MelisCmsUserAccountUserRegisterPlugin` | Formulario de registro (usuario, email, contraseña ×2, nombre/apellido, imagen, idioma). | `template_path`, `page_id_login_page`, `force_joint_accounts` |

`force_joint_accounts` en el plugin de registro reutiliza una cuenta multisitio existente; la pertenencia al
sitio se almacena en `melis_cms_user_account_sites`.

Ambos plugins son servidos por **`MelisCmsUserAccountPluginController`**:

| Acción | Rol |
| --- | --- |
| `authenticateUserAction()` | Autentica `login`/`password`/`siteId` y abre la sesión. |
| `logoutUserAction()` | Cierra la sesión del usuario del sitio. |
| `createUserAction()` | Valida y crea un usuario (incluye la subida de la imagen). |
| `getRegistrationFormAction()` | Devuelve el formulario de registro (para alternar entre inicio de sesión y registro). |
| `getTranslationsAction()` | Cadenas de traducción del lado del front. |

> No existe una acción integrada de recuperación/restablecimiento de contraseña ni de activación por email en el
> controlador de plugins. Constrúyalas sobre `FrontUserAccountService` si las necesita.

## Tablas de base de datos

| Tabla | PK | Contiene |
| --- | --- | --- |
| `melis_cms_user_account` | `uac_id` | Usuario del sitio: `uac_login`, `uac_email`, `uac_password`, `uac_firstname`, `uac_lastname`, `uac_picture`, `uac_status`, `uac_admin`, `uac_birthday`, `uac_lang_id`, `uac_date_creation`. |
| `melis_cms_user_account_sites` | `uacs_id` | Junción usuario ↔ sitio: `uacs_uac_id`, id del sitio, `uacs_anonymized` (indicador RGPD por sitio). |

`MelisCmsUserAccountAddCustomFieldsTableListener` (disparado en el arranque) añade columnas FK
`*_author_account` a las tablas de blog/noticias/comentarios, crea `melis_cms_user_account_sites` y migra la
columna heredada `uac_site_id`. La operación es idempotente (comprueba la existencia de la columna).

## RGPD

### Información / extracción / eliminación manual (conjuntos 1+2)

Nueve listeners responden a tres eventos de MelisCore:

| Evento | Listener de cuenta | Listener de blog | Listener de comentarios |
| --- | --- | --- | --- |
| `melis_core_gdpr_user_info_event` | `…GdprUserInfoListener` | `…BlogGdprUserInfoListener` | `…CommentsGdprUserInfoListener` |
| `melis_core_gdpr_user_extract_event` | `…GdprUserExtractListener` | `…BlogGdprUserExtractListener` | `…CommentsGdprUserExtractListener` |
| `melis_core_gdpr_user_delete_event` | `…GdprUserDeleteListener` | `…BlogGdprUserDeleteListener` | `…CommentsGdprUserDeleteListener` |

Los listeners de blog y comentarios solo están activos cuando `MelisCmsBlog` / `MelisCmsComments` están
instalados. La eliminación anonimiza la fila de la cuenta y establece `uacs_anonymized`. Las asignaciones de
campos y los umbrales de retención residen en `config/app.gdpr.php`.

### Flujo automático de cuentas inactivas (conjunto 3)

Seis listeners se conectan al planificador de autoeliminación de MelisCore:

| Paso | Listener | Evento | Efecto |
| --- | --- | --- | --- |
| 1. Registro | `…GdprAutoDeleteModuleListListener` | `melis_core_gdpr_auto_delete_modules_list` | Declara el módulo al planificador. |
| 2. Etiquetas | `…GdprAutoDeleteTagsListListener` | `MelisCoreGdprAutoDeleteService::TAGS_EVENT` | Registra las etiquetas/categorías de inactividad. |
| 3. Primer aviso | `…GdprAutoDeleteWarningListUsersListener` | `MelisCoreGdprAutoDeleteService::WARNING_EVENT` | Envía el primer email de aviso a los usuarios inactivos. |
| 4. Segundo aviso | `…GdprAutoDeleteSecondWarningListUsersListener` | `MelisCoreGdprAutoDeleteService::SECOND_WARNING_EVENT` | Envía el segundo email de aviso a los usuarios que siguen inactivos. |
| 5. Eliminación | `…GdprAutoDeleteActionDeleteUserListener` | `MelisCoreGdprAutoDeleteService::DELETE_ACTION_EVENT` | Anonimiza las cuentas sin respuesta. |
| (registro) | `…GdprAutoDeleteGetEmailListener` | `melis_core_gdpr_auto_delete_log_get_user_email` | Resuelve el email para el registro de auditoría (omite las ya anonimizadas). |

La "última actividad" se registra mediante `updateUserConnectionDate()`.

## Listeners entre módulos

Registrados en `Module.php` durante el arranque:

| Listener | Evento | Propósito |
| --- | --- | --- |
| `MelisCmsUserAccountSiteUserAuthenticationListener` | `site_user_account_authentication` | Punto de entrada de autenticación FO → `siteUserAuthenticate()`; almacena el usuario en un `Laminas\Session\Container` indexado por sitio. (prioridad `-1001`) |
| `MelisCmsUserAccountLoginFormListener` | `melis_cms_user_account_login_form` | Inyecta al miembro autenticado en el formulario de comentarios (campos ocultos `mccom_user_acct`/`mccom_site_id`, botón de cierre de sesión, nombre desde la cuenta); elimina los campos de nombre/email para usuarios anónimos. |
| `MelisCmsUserAccountCommentsFormModificationListener` | `meliscmsuseraccount_comments_form_modification_listener` | Reordena los elementos del formulario de comentarios según un orden solicitado. |
| `MelisCmsUserAccountAddAuthorPicture` | `melis_cms_user_account_add_user_picture` | Renderiza la `uac_picture` del miembro junto a su comentario (URI de datos base64). |
| `MelisCmsUserAccountSaveUserAccountListenter` | `meliscmsnews_get_postvalues` | Persiste `cnews_author_account` / `cnews_comments_require_account` al guardar noticias. |
| `MelisCmsUserAccountAddCustomFieldsTableListener` | `meliscms_user_account_add_custom_fields_table` | Migración de arranque: añade columnas FK a las tablas de blog/noticias/comentarios, crea la tabla de junción de sitios y migra los datos heredados. |
| `MelisCmsUserAccountFlashMessengerListener` | `meliscms_user_account_tooluser_save`, `meliscms_user_account_tooluser_delete` | Mensajes flash de BO al guardar/eliminar (herramienta heredada). |

## Archivos clave

| Aspecto | Ruta |
| --- | --- |
| Manifiesto del brick React | `vendor/melisplatform/melis-cms-user-account/public/ui-react/brick.manifest.json` |
| Rutas de la API React + invocable | `vendor/melisplatform/melis-cms-user-account/config/react-api.php` |
| Capacidades React | `vendor/melisplatform/melis-cms-user-account/config/react.capabilities.php` |
| Controlador de la API React | `vendor/melisplatform/melis-cms-user-account/src/Controller/MelisReactApiUserAccountController.php` |
| Controlador de la herramienta BO heredada (vista Old) | `vendor/melisplatform/melis-cms-user-account/src/Controller/MelisCmsUserAccountToolController.php` |
| Controlador del plugin FO | `vendor/melisplatform/melis-cms-user-account/src/Controller/MelisCmsUserAccountPluginController.php` |
| Entrada de menú BO | `vendor/melisplatform/melis-cms-user-account/config/app.interface.php` |
| Datatable BO heredada (columnas, filtros, modales) | `vendor/melisplatform/melis-cms-user-account/config/app.tools.php` |
| Todos los formularios (FO + BO heredado) | `vendor/melisplatform/melis-cms-user-account/config/app.forms.php` |
| Asignaciones de campos RGPD + umbrales de retención | `vendor/melisplatform/melis-cms-user-account/config/app.gdpr.php` |
| Puntos de integración de comentarios | `vendor/melisplatform/melis-cms-user-account/config/comments.php` |
| Rutas, alias de servicio, plugins, validadores | `vendor/melisplatform/melis-cms-user-account/config/module.config.php` |
| Config del plugin de inicio de sesión | `vendor/melisplatform/melis-cms-user-account/config/plugins/MelisCmsUserAccountLoginPlugin.config.php` |
| Config del plugin de registro | `vendor/melisplatform/melis-cms-user-account/config/plugins/MelisCmsUserAccountUserRegisterPlugin.config.php` |
| Servicio principal | `vendor/melisplatform/melis-cms-user-account/src/Service/MelisCmsUserAccountService.php` |
| Servicio de autoeliminación | `vendor/melisplatform/melis-cms-user-account/src/Service/MelisCmsUserAccountGdprAutoDeleteService.php` |
| Validador de contraseñas | `vendor/melisplatform/melis-cms-user-account/src/Validator/MelisPasswordValidator.php` |
| Table gateways de BD | `vendor/melisplatform/melis-cms-user-account/src/Model/Tables/` |
| Listeners | `vendor/melisplatform/melis-cms-user-account/src/Listener/` |
| Arranque / inyección de columnas | `vendor/melisplatform/melis-cms-user-account/src/Module.php` |

Véase también: [MelisCore](/es/reference/modules/melis-core) · [MelisCms](/es/reference/modules/melis-cms) · [MelisCmsComments](/es/reference/modules/melis-cms-comments) · [MelisCmsBlog](/es/reference/modules/melis-cms-blog) · [MelisCmsNews](/es/reference/modules/melis-cms-news)
