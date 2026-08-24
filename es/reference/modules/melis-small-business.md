# MelisSmallBusiness

> Complemento para equipos editoriales del CMS — **roles de usuario**, un **flujo de trabajo** de validación, **versionado** de páginas, **comentarios** y **bloqueo de páginas**, además de una **biblioteca multimedia** TinyMCE, todo expuesto a través del back-office en React. Paquete `melisplatform/melis-small-business`.

## Propósito

`MelisSmallBusiness` añade herramientas de colaboración para equipos pequeños sobre el editor de páginas del CMS. Conserva
**versiones** de las páginas publicadas (restaura o previsualiza un estado anterior), impulsa un **flujo de trabajo** de contenido
en el que un editor solicita la validación y un revisor la valida o la rechaza, adjunta **comentarios** a las
páginas, impide que dos usuarios editen la misma página a la vez mediante un **bloqueo de página**, gestiona una
herramienta personalizada de **roles de usuario** y ofrece una **biblioteca multimedia** basada en TinyMCE (MoxieManager). La lógica de negocio
permanece en el servidor (servicios Laminas, eventos del editor del CMS); en la v6 toda la superficie orientada al usuario es un conjunto
de bricks de React y contribuciones modulares.

## Activarlo

Es un módulo estándar de Laminas. Añádelo a `config/melis.module.load.php`:

```php
return [
    // …
    'MelisSmallBusiness',
];
```

Depende de `melis-core`, `melis-engine`, `melis-front` y `melis-cms`, y sus tablas se crean
mediante dbdeploy (`extra.dbdeploy = true`). Cada superficie React que se describe a continuación aparece **solo cuando el módulo está
activo** (descubrimiento de bricks vía `GET /melis/react-api/react-modules`).

## Superficies React

En el back-office en React (`/melis-react`) el módulo aporta **dos bricks** y **dos contribuciones
modulares** que no tienen ruta propia.

| Superficie | Tipo | Ruta / host |
| --- | --- | --- |
| **User Roles** (`smallbusiness`) | React nativo completo (conmutador New/Old) | `/melis-core/user-roles` |
| **Media library** (`smallbusiness-medialib`) | brick iframe (MoxieManager) | `/melis-cms/media-library` |
| **Modal de flujo de trabajo** | modal compartido (`window.__melisWorkflowModal`) | renderizado por el editor de páginas de News / Blog / CMS / Newsletter + widget del panel |
| **Versionado / Comentarios / Bloqueo** | pestañas + banner en el editor de páginas del CMS | contribuido al nodo de capacidad `meliscms_page` |
| **Rol en Usuarios** | columna/filtro/selector de Rol | herramienta de Usuarios host, condicionada por `useModuleActive('MelisSmallBusiness')` |

`public/ui-react/brick.manifest.json` declara ambos bricks; `ui-react/src/brick.tsx` los registra
y publica el modal de flujo de trabajo como una variable global de window para que otros bricks puedan renderizar una única implementación compartida.

## Herramienta de roles de usuario

**Dónde:** barra lateral → **MelisCore → User Roles** (`/melis-core/user-roles`).

Un **rol** es un perfil de derechos con nombre almacenado una sola vez (`melis_core_user_role`) y asignado a muchos usuarios.
La lista muestra todos los roles con tarjetas KPI (Roles / Asignados), búsqueda, un gestor de columnas, exportación y un
conmutador **New / Old** (Old = la herramienta clásica en un iframe). Cada fila (ID, Nombre, Creado, Número de usuarios)
dispone de acciones de edición/eliminación; un rol asignado a usuarios **no puede eliminarse**.

![Lista de roles en el back-office React](/screenshots/react/melis-small-business/melissmallbusiness-tool-roles-list.png)

Al editar un rol se abre una subpestaña con un campo **Role name** y un árbol de **Access rights** que refleja
el árbol de derechos de Usuarios (TOOLS agrupados por sección, con List/Create/Edit/Delete/Export por herramienta, además de las
secciones Pages y Dashboard-plugins). **Save** persiste el nombre y el XML de `urole_rights`.

![Editor de roles y su árbol de derechos](/screenshots/react/melis-small-business/melissmallbusiness-tool-roles-edit-and-rights.png)

::: warning
Escribir el XML de **derechos** de un rol requiere un administrador de la plataforma (`usr_admin`); un usuario no administrador que edite
un rol recibe un 403 al escribir los derechos. Esto bloquea una vía de escalada de privilegios (crear un rol con todos los derechos
y luego autoasignárselo). El **nombre** del rol puede cambiarlo cualquiera que tenga el derecho `edit` de la herramienta.
:::

### Rol en la herramienta de Usuarios

Cuando el módulo está activo, la herramienta **Users** de MelisCore obtiene una columna + filtro **Role** en la lista
y un selector **Role** en el formulario de usuario (junto a Status y Rights). El desplegable se alimenta de
`GET /melis/react-api/roles` (la lista de selección de MelisCore); al guardar, un listener reinyecta las
capacidades del rol para que no se pierdan.

![Formulario de usuario con el selector de Rol](/screenshots/react/melis-small-business/melissmallbusiness-tooloverride-users-edit-withrole.png)

## Biblioteca multimedia

**Dónde:** barra lateral → **MelisCms → Media library** (`/melis-cms/media-library`).

El navegador de archivos avanzado de TinyMCE / **MoxieManager**: carpetas a la izquierda, archivos a la derecha
(nombre, tamaño, tipo, fecha), con Create, Upload, vista de lista/cuadrícula, Sort, Filter y accesos directos Favorites/History/
Uploaded. La página React es un envoltorio ligero que renderiza un iframe a pantalla completa hacia el moxiemanager heredado
(`/melis/MelisSmallBusiness/js/tinyMCE/moxiemanager/index.php?lang=xx`), por lo que su comportamiento es
idéntico al de la herramienta clásica — sin react-api propio.

![Biblioteca multimedia — navegador MoxieManager en una pestaña React](/screenshots/react/melis-small-business/melissmallbusiness-tool-medialibrary.png)

## Flujo de trabajo (validación de páginas)

El flujo de trabajo permite que un editor **solicite** la validación y que un validador **responda**. El **mismo modal**
se abre desde el editor de páginas del CMS (botón **Workflow**), los editores de News y Blog, y el widget del panel.
Es genérico respecto al tipo de elemento — `PAGE`, `NEWS`, `BLOG`.

En **Ask for validation**, elige un **Role** para notificar a todos los que tengan ese rol, o **"1 person
only"** para mostrar un desplegable **User** y dirigirte a una única persona, y luego **Send request**.

![Modal de flujo de trabajo — solicitar a una sola persona](/screenshots/react/melis-small-business/melissmallbusiness-pageoverride-workflow-demand-1person.png)

El **History** del modal enumera cada solicitud y respuesta (Date, Status, To/Role, From, Action). Un
destinatario de una solicitud abierta obtiene los botones **Validate** / **Refuse** y puede adjuntar una nota.

![Modal de flujo de trabajo — historial con Validate/Refuse](/screenshots/react/melis-small-business/melissmallbusiness-pageoverride-workflow-demand-to-validated.png)

El **panel** del back-office muestra un widget **Workflow** que enumera las solicitudes, dividido en *Users' demands*
/ *My demands* con subpestañas PAGE / NEWS; cada fila muestra una etiqueta de estado (VALIDATED / REFUSED / Demand)
y ofrece acciones en línea de validar (✓) / rechazar (✗) y previsualizar sobre las solicitudes dirigidas a ti.

![Widget Workflow del panel](/screenshots/react/melis-small-business/melissmallbusiness-dashboardplugins-workflow.png)

## Versionado y comentarios (editor de páginas del CMS)

Al abrir una página en el editor del CMS se añaden dos pestañas de SmallBusiness tras las nativas:

- **Versioning** — una lista paginada de las instantáneas de la página (No., Name, Modified on, By) con
  View / Restore / Rename por fila. Se toma una instantánea en cada publicación.

  ![Editor de páginas — pestaña Versioning](/screenshots/react/melis-small-business/melissmallbusiness-pageoverride-edit-tab-versionning.png)

- **Comments** — la línea de tiempo de actividad de la página que combina comentarios de usuarios y eventos del flujo de trabajo (los más recientes
  primero), con un cuadro "Add a comment".

  ![Editor de páginas — pestaña Comments](/screenshots/react/melis-small-business/melissmallbusiness-pageoverride-tab-comments.png)

Aparecen un banner de **bloqueo de página** + un botón **Unlock** cuando otro usuario mantiene el bloqueo sobre la página.

## Endpoints react-api

Todos bajo `/melis/react-api/…`, contrato `{ success, data, error }`. Los controladores residen en este
módulo (`config/react-api.php` + `src/Controller/MelisReactApi*Controller.php`).

| Controlador | Rutas base | Guarda |
| --- | --- | --- |
| `MelisReactApiRoleController` | `GET /user-roles`, `/user-roles/stats`, `/user-roles/:id`; `POST /user-roles/save`; `DELETE /user-roles/delete/:id` | acceso a `melissb_tool_userrole` + capacidad (escritura del XML de derechos = solo administrador) |
| `MelisReactApiWorkflowController` | `GET /workflow/roles`, `/workflow/users`, `/workflow/history`; `POST /workflow/ask` | solo autenticación |
| `MelisReactApiPageVersioningController` | `GET /cms-page/versioning` | solo autenticación |
| `MelisReactApiPageCommentsController` | `GET /cms-page/comments`, `/cms-page/timeline`; `POST /cms-page/comments/save` | solo autenticación |
| `MelisReactApiPageLockController` | `GET /cms-page/lock`; `POST /cms-page/unlock` | solo autenticación |

Las **mutaciones** del flujo de trabajo reutilizan los endpoints heredados ya probados en lugar de react-api:
`GET /melis/MelisSmallBusiness/MelisWorkflow/saveWorkflowActions` (validar / rechazar) y
`POST /melis/MelisSmallBusiness/MelisWorkflow/addWorkflowComments` (añadir una nota). El texto del comentario se
sanea con HTMLPurifier al guardar.

## Capacidades

`config/react.capabilities.php` **contribuye** el botón + las pestañas del editor de páginas bajo la clave compartida
`meliscms_page` propiedad de MelisCms (fusionada, de modo que MelisCms no necesita conocer SB):

| Tipo | Clave | Etiqueta |
| --- | --- | --- |
| action | `workflow` | Botón Workflow |
| action | `unlock` | Botón Unlock |
| tab | `melissb_page_versioning` | Pestaña Versioning |
| tab | `melissb_page_comments` | Pestaña Comments |

`CmsPage.tsx` filtra esas pestañas / oculta esos botones mediante `useCaps('meliscms_page').can(cap)`. La
propia herramienta de Roles se identifica con `melissb_tool_userrole` y la biblioteca multimedia con
`melissb_medialib`.

## Tablas de la base de datos

Creadas por `install/dbdeploy/126618_melis_sb_install.sql`.

| Tabla | Función |
| --- | --- |
| `melis_sb_page_versioning` | Copias archivadas de las páginas publicadas (respalda la pestaña Versioning). |
| `melis_sb_workflow` | Registros del flujo de trabajo por elemento. |
| `melis_sb_workflow_events` | Eventos del flujo de trabajo (solicitar / validar / rechazar). |
| `melis_sb_page_comment` | Comentarios adjuntos a una página (tipo de comentario 1 = PAGE, 2 = WORKFLOW). |
| `melis_sb_page_comment_type` | Tipos de comentario. |
| `melis_sb_page_locked` | Bloqueos de página activos (qué usuario edita qué página). |
| `melis_core_user_role` | Roles con nombre (`urole_id`, `urole_name`, `urole_creation_date`, XML de `urole_rights`). |

## Servicios clave

| Alias del servicio | Función |
| --- | --- |
| `MelisEnginePage` | El módulo **sobrescribe** el servicio de páginas del motor con `MelisSBPageService`; en la ruta de previsualización de versiones devuelve el árbol versionado de `melis_sb_page_versioning`, en caso contrario se comporta como el padre. |
| `MelisSBPageCommentService` | Comentarios de página: `getPageComments()` / `setPageComments()`. |

::: warning
Al asignar el alias `MelisEnginePage` a su propia clase, este módulo reemplaza el servicio de páginas del núcleo para toda
la aplicación mientras está activado. Tenlo en cuenta al ordenar los módulos.
:::

El flujo de trabajo envía tres correos electrónicos del back-office (`app.emails.php`): `WF_DEMAND`, `WF_VALIDATED`,
`WF_REFUSED` (etiquetas `USER_TO`, `USER_FROM`, `TYPE`, `DETAILS`).

## Archivos clave

| Aspecto | Ruta |
| --- | --- |
| Arranque del módulo y listeners | `src/Module.php`, `src/Listener/` |
| Rutas react-api + invokables | `config/react-api.php` |
| Controladores react-api | `src/Controller/MelisReactApi{Role,Workflow,PageVersioning,PageComments,PageLock}Controller.php` |
| Contribución de capacidades | `config/react.capabilities.php` |
| Servicio de páginas (sobrescritura del motor) | `src/Service/MelisSBPageService.php` |
| Servicio de comentarios | `src/Service/MelisSBPageCommentService.php` |
| Bricks React (fuente) | `ui-react/src/` (`brick.tsx`, `UserRolePage.tsx`, `MediaLibraryPage.tsx`, `WorkflowModal.tsx`, `RolesRightsTree.tsx`) |
| Bundle compilado | `public/ui-react/brick.js` + `brick.manifest.json` |
| SQL de instalación | `install/dbdeploy/126618_melis_sb_install.sql` |
