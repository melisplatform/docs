# MelisCore

> La base del back-office sobre la que se construyen todos los demás módulos: inicio de sesión,
> usuarios/roles/permisos, el framework de menús y herramientas, el panel, la configuración, el correo,
> el RGPD y la capa base de servicios y eventos, ahora renderizada por el back-office **React** en
> `/melis-react`. Paquete `melisplatform/melis-core`.

## Propósito

`MelisCore` es el corazón del back-office de Melis Platform. Proporciona el shell de la aplicación
(cabecera, menú izquierdo, árbol de herramientas, panel, pie de página), el árbol de configuración
`MelisCoreConfig` que agrega los ficheros `app.*.php` de cada módulo, la autenticación y los permisos
por herramienta, la gestión de usuarios, el manejo de plataformas/entornos, los correos transaccionales,
las herramientas de RGPD, un endpoint de autenticación de microservicios y la capa compartida de
servicios/eventos que amplían todos los demás módulos. Cada módulo `melisplatform/*` depende de él.

En v6, MelisCore **es además la aplicación de back-office React**. El mismo shell se sirve como una
aplicación de página única React 19 + TypeScript + Tailwind en `/melis-react`, ejecutándose en paralelo
con el back-office heredado `.phtml` en `/melis`. MelisCore incluye el shell (layout, enrutado, el cliente
genérico `react-api`, el cargador de módulos/bricks, el resolvedor de capacidades, el conmutador
Nuevo/Antiguo) **y** sus propias herramientas React nativas (Usuarios, Panel, Anuncios, Correos, RGPD,
Idiomas, Registros, Módulos, Otra configuración, Plataformas, Tema de plataforma, Mi cuenta, inicio de
sesión/2FA). Todos los demás módulos se conectan **a** este shell.

## Cómo activarlo

Añádelo a `config/modules.config.php` — MelisCore debe cargarse pronto porque casi todos los demás
módulos llaman a sus servicios:

```php
return [
    'MelisCore',
    // … other modules …
];
```

El back-office React lo entregan tres módulos que cooperan entre sí:

| Módulo | Rol |
| --- | --- |
| `MelisCore` | El código fuente/compilado de la app React + las rutas y controladores `react-api` de las herramientas nativas. |
| [`MelisReactApi`](/es/reference/modules/melis-react-api) | El puente `react-api` genérico (`me`, `menu`, `assets`, `langs`, `react-modules`, `rights`, `i18n`, `dashboard`). |
| [`MelisReactOverride`](/es/reference/modules/melis-react-override) | Sirve el shell de la SPA en `/melis-react` y el mecanismo de iframe heredado (`/melis/react-tool-page`). |

Sus módulos de infraestructura complementarios siguen siendo [MelisAssetManager](/es/reference/modules)
(que sirve los assets React con hash desde `/MelisCore/ui-react/`), [MelisDbDeploy](/es/reference/modules),
[MelisComposerDeploy](/es/reference/modules) y [MelisInstaller](/es/reference/modules).

## La arquitectura del back-office React

El código fuente de la app Vite + React reside en `vendor/melisplatform/melis-core/ui-react/` y se
compila en el directorio versionado `vendor/melisplatform/melis-core/public/ui-react/`. En tiempo de
ejecución:

- El **shell (SPA)** se sirve en **`/melis-react`** mediante `MelisReactOverride`; el back-office heredado
  en `/melis` no se toca.
- Los **assets con hash** se cargan desde **`/MelisCore/ui-react/`** (el `base` de Vite, servido por
  MelisAssetManager).
- La **API JSON** se encuentra en **`/melis/react-api/…`** con el contrato `{ success, data, error }`.

Cada herramienta que ve el usuario llega a la pantalla a través de **uno de tres mecanismos**:

1. **Herramienta React nativa** — una página React real respaldada por un `MelisReactApi*Controller` en
   MelisCore (Usuarios, Idiomas, Correos, RGPD…). Listada en el registro de módulos
   (`ui-react/src/lib/module-registry.ts`).
2. **Brick de módulo** — otro módulo activo incluye su propia interfaz React como un *brick*, cargado en
   tiempo de ejecución (presente solo si el módulo está activo). Se descubre mediante
   `GET /melis/react-api/react-modules`.
3. **Pool de iframes** — cualquier herramienta heredada sin una ruta React dedicada se renderiza dentro
   del shell en un iframe agrupado mediante `/melis/react-tool-page?key=<melisKey>`.

El **menú es dinámico** (`GET /melis/react-api/menu` devuelve el árbol de herramientas filtrado por
permisos), las rutas de las herramientas se **derivan de ese árbol** (`/[section]/[tool]`, p. ej.
`/melis-core/user`), y nada está codificado de forma fija por módulo. Una herramienta nativa también puede
incluir un conmutador **Nuevo (React) / Antiguo (iframe)** para comparar su vista React con la herramienta
clásica.

## Shell del back-office

El shell (`ui-react/src/components/layout/Shell.tsx`) compone la barra lateral, la barra superior, las
subpestañas, la barra de pestañas de herramientas heredadas y el área de contenido. Cada montaje de
herramienta se envuelve en un `ToolErrorBoundary` por herramienta, de modo que el fallo de renderizado de
una herramienta nunca deja en blanco todo el back-office.

### Barra superior

El lado derecho de la barra superior contiene un conmutador de **tema** (claro/oscuro), el selector de
**idioma**, un icono de **Messenger** (cuando ese módulo está activo), una campana de **notificaciones** y
tu **avatar de usuario** (abre *Mi cuenta* y contiene *Cerrar sesión*). Un botón para ocultar la barra
lateral se sitúa en el extremo izquierdo.

![Los iconos del lado derecho de la barra superior — conmutador de tema, idioma, messenger, notificaciones, avatar](/screenshots/react/melis-core/meliscore-header-righticons.png)

### Barra lateral izquierda y pie de página

La barra lateral muestra el enlace del **Panel** más el **árbol de herramientas**, agrupado por sección
(MelisCore, MelisCms, MelisMarketing, MelisCommerce, Marketplace, Melis AI…). **Lo que ves depende de tus
permisos** — solo aparecen las herramientas que puedes usar. El pie de página muestra la **versión** de la
plataforma / MelisCore.

![El pie de página — versión de MelisCore / plataforma](/screenshots/react/melis-core/meliscore-footer-version-meliscore.png)

### Panel

La página de inicio tras el inicio de sesión. Muestra las **burbujas** superiores (recuentos de Melis News /
Actualizaciones / Notificaciones / Mensajes) y una cuadrícula de **widgets** (plugins del panel). Los
widgets se añaden desde la paleta **"Add a widget"** y se organizan mediante arrastrar y soltar; la
disponibilidad depende de tus permisos.

![El Panel React — burbujas superiores, una cuadrícula de widgets vacía y la paleta "Add a widget"](/screenshots/react/melis-core/meliscore-dashboard-empty.png)

![La paleta "Add a widget" — elige un widget (agrupado por módulo) para soltarlo en el panel](/screenshots/react/melis-core/meliscore-dashboardplugins-menu.png)

## Autenticación

El inicio de sesión se encuentra en `/melis-react/login` (React) — nombre de usuario + contraseña,
**Remember me** opcional y un selector de idioma. Si tiene éxito, aterrizas en el Panel. Las cuentas con
**2FA** se redirigen a `/verify-2fa` (se puede volver a solicitar un nuevo código cuando llega por correo).
El enlace **Lost password** (`/forgot-password`) envía por correo un enlace de restablecimiento que abre
`/reset-password/:hash`. La imagen de marca del panel de inicio de sesión es configurable mediante la
herramienta **Tema de plataforma**.

Por debajo, la capa PHP no cambia: el inicio de sesión hace POST al `POST /melis/authenticate` heredado, el
sondeo de sesión usa `GET /melis/islogin`, y los permisos provienen de `MelisCoreAuth` / `MelisCoreRights`.

## Usuarios, roles y permisos

**Dónde:** MelisCore → Administración → **Gestión de usuarios** (`/melis-core/user`). Gestiona cada cuenta
del back-office. La lista tiene tarjetas KPI (Total / Activos / Inactivos / Administradores), búsqueda,
filtros de estado y rol, un gestor de Columnas, Exportar, el conmutador Nuevo/Antiguo y **+ Nuevo usuario**.

![La herramienta Usuarios — tarjetas KPI, filtros, gestor de columnas, Exportar, conmutador Nuevo/Antiguo, "+ Nuevo usuario"](/screenshots/react/melis-core/meliscore-tool-users-list.png)

Al abrir un usuario se muestran cuatro pestañas:

- **Perfil** — identidad, etiquetas, conmutador de estado, rol, un indicador de **Administrador** y una
  sección de contraseña con retroalimentación de complejidad en tiempo real.

  ![La pestaña Perfil — identidad, etiquetas, tarjetas de Estado/Rol/Permisos y un campo de contraseña con requisitos en tiempo real](/screenshots/react/melis-core/meliscore-tool-users-edit-tab-profile.png)

- **Permisos** — el **árbol de acceso** (marca qué herramientas/secciones puede usar el usuario), más un
  panel de **Plugins del panel** y un panel de **Páginas**. Todo lo que no se conceda queda oculto del menú
  del usuario. Las herramientas que declaran **capacidades** exponen subcasillas (Listar / Crear / Editar /
  Eliminar / Exportar).

  ![El árbol de permisos — recuentos por sección y casillas de capacidad por herramienta](/screenshots/react/melis-core/meliscore-tool-users-edit-tab-rights-1.png)

  ![Más abajo en la pestaña Permisos — el panel de Plugins del panel y el panel de Páginas](/screenshots/react/melis-core/meliscore-tool-users-edit-tab-rights-2.png)

- **Conexiones** — el historial de inicios de sesión del usuario (fecha, hora de entrada/salida, duración).
- **Microservicios** — genera una **clave API** para que terceros puedan autenticarse como este usuario
  contra los endpoints de microservicios.

  ![Una clave API generada — conmutador de activar/desactivar, clave enmascarada con mostrar/copiar/regenerar y la URL del microservicio](/screenshots/react/melis-core/meliscore-tool-users-edit-tab-microservices-generated.png)

**Los roles** definen un conjunto de permisos una sola vez y los asignan a muchos usuarios; la herramienta
de Roles la aporta **MelisSmallBusiness**, por lo que el selector de *Rol* de la pestaña Perfil aparece solo
cuando ese módulo está activo.

> Regla general: si alguien "no ve una herramienta", su árbol de **Permisos** no se la concede — edita el
> usuario (o su rol) → Permisos → marca la herramienta.

## Mi cuenta

**Dónde:** avatar de la barra superior → **Mi cuenta** (`/melis-core/account`). Edita tu propio correo,
cambia tu contraseña, establece el idioma de tu interfaz y sube una foto de perfil. Los módulos pueden
añadir pestañas aquí (p. ej. Melis Messenger). Esta es la única herramienta nativa sin protección de
capacidad — está abierta a cualquier usuario autenticado.

![La página "Mi cuenta" — avatar, resumen de identidad y una pestaña Perfil (correo / contraseña / idioma)](/screenshots/react/melis-core/meliscore-tool-profile-tab-profile.png)

## Anuncios

**Dónde:** MelisCore → Administración → **Anuncio** (`/melis-core/announcement`). Anuncios de la plataforma
mostrados en el panel, con tarjetas KPI, búsqueda, un filtro de estado y **+ Nuevo anuncio**. El editor
consta de un título + un cuerpo de **texto enriquecido (TinyMCE)**, un conmutador **Activo** y una **Fecha**.

![La lista de Anuncios — tarjetas KPI, filtro Activo/Inactivo, editar/eliminar por fila](/screenshots/react/melis-core/meliscore-tool-announcement-list.png)

![El editor de anuncios — Título, texto HTML (TinyMCE), conmutador Activo y Fecha](/screenshots/react/melis-core/meliscore-tool-announcement-edit.png)

## Idiomas del back-office

**Dónde:** MelisCore → Configuración del sistema → **Idiomas del back-office** (`/melis-core/language`). Los
locales (locale + nombre) disponibles para los usuarios del back-office. `en_EN` es el **predeterminado
protegido** (no se puede renombrar ni eliminar). Al guardar se regeneran los ficheros de traducción mediante
`MelisCoreTranslation`.

![La lista de Idiomas — locale + nombre, el predeterminado (en_EN) marcado, edición por fila](/screenshots/react/melis-core/meliscore-tool-bolanguages-list.png)

## Gestión de correos

**Dónde:** MelisCore → Configuración del sistema → **Gestión de correos** (`/melis-core/emails`). Los
**correos transaccionales** de la plataforma (creación de cuenta, contraseña perdida, flujo de trabajo…). La
lista muestra el nombre, el código, el remitente/correo del remitente y un distintivo de **Origen**
(Predeterminado vs Personalizado).

![La lista de Gestión de correos — plantillas transaccionales con código, remitente y origen Predeterminado/Personalizado](/screenshots/react/melis-core/meliscore-tool-emailsmanagement-list.png)

El editor tiene **Propiedades generales** (nombre, código, remitente, responder-a, etiquetas de reemplazo,
ruta del layout) y una sección de **Contenido por idioma** (asunto + cuerpo HTML/texto por idioma) con
etiquetas reemplazables como `[NAME]`, `[EMAIL]`, `[LOGIN]`. El guardado delega en
`MelisCoreBOEmailService::saveBoEmailByCode`.

![Las propiedades del correo — nombre, código, remitente, responder-a, etiquetas de reemplazo y ruta del layout](/screenshots/react/melis-core/meliscore-tool-emailsmanagement-edit-properties.png)

![El contenido por idioma — asunto, un cuerpo HTML en TinyMCE con etiquetas `[NAME]`/`[EMAIL]`/`[LOGIN]`, y una versión de texto plano](/screenshots/react/melis-core/meliscore-tool-emailsmanagement-edit-language.png)

## RGPD

**Dónde:** MelisCore → Administración → **RGPD** (`/melis-core/gdpr`). Cuatro pestañas:

- **Datos** — busca a una persona por nombre/correo; a través de todos los módulos, consulta los datos que
  se conservan sobre ella y luego **extrae** (exporta XML) o **elimina** los registros seleccionados.

  ![La pestaña Datos de RGPD — busca a una persona; los módulos devuelven datos coincidentes para extraer o eliminar](/screenshots/react/melis-core/meliscore-tool-gdpr-tab-data.png)

- **Banners** — configura los textos del banner de cookies/consentimiento RGPD por sitio + idioma.
- **Anonimización** — las configuraciones programadas de **eliminación automática / retención de datos**
  (una por sitio + módulo), con **Ejecutar** y **Registros**.

  ![La pestaña Anonimización — configuraciones de eliminación automática, con Registros, Ejecutar y "+ Nueva configuración"](/screenshots/react/melis-core/meliscore-tool-gdpr-tab-anonymization.png)

- **SMTP** — el servidor de correo utilizado para enviar los correos de alerta de anonimización.

  ![La pestaña SMTP — host / nombre de usuario / contraseña para los correos de alerta de anonimización](/screenshots/react/melis-core/meliscore-tool-gdpr-tab-smtp.png)

## Registros

**Dónde:** MelisCore → Configuración del sistema → **Registros** (`/melis-core/logs`). Un **registro de
actividad** de solo lectura y buscable — filtra por tipo, título, usuario y rango de fechas, con tarjetas KPI
(Total / Hoy / Tipos). Los no administradores solo ven sus propias acciones.

![El visor de Registros — tarjetas KPI, filtros de tipo/título/usuario/fecha y filas de actividad](/screenshots/react/melis-core/meliscore-tool-logs-list.png)

## Módulos

**Dónde:** MelisCore → Configuración del sistema → **Módulos** (`/melis-core/modules`). Activa/desactiva y
**reordena** (arrastrar y soltar) los módulos de la plataforma; cada fila muestra el módulo, su paquete, su
versión y sus dependencias. **Guardar** reescribe `config/melis.module.load.php` y dispara
`meliscore_module_management_save_end`.

![La herramienta Módulos — búsqueda, recuento de activos, arrastrar para reordenar el orden de carga, conmutador por módulo, distintivos de requisitos/versión](/screenshots/react/melis-core/meliscore-tool-modules-list.png)

## Otra configuración (política de inicio de sesión y contraseñas)

**Dónde:** MelisCore → Configuración del sistema → **Otra configuración** (`/melis-core/other-config`). La
política de seguridad: **bloqueo de cuenta tras fallos**, **duración de validez de la contraseña**,
**reutilización de contraseñas** y **complejidad de la contraseña** (longitud mínima + requisitos de
minúscula/mayúscula/dígito/carácter especial). Se escribe en `app.login.php` mediante
`MelisPasswordSettingsService`.

![La página Otras configuraciones — bloqueo, validez de contraseña, reutilización y conmutadores de complejidad](/screenshots/react/melis-core/meliscore-tool-other-config.png)

## Plataformas

**Dónde:** MelisCore → Configuración del sistema → **Plataformas** (`/melis-core/platforms`). Gestiona los
**entornos** (dev/staging/prod), con tarjetas KPI, búsqueda y **+ Nueva plataforma**. La plataforma
**actual** está marcada y su nombre no se puede cambiar.

![La lista de Plataformas — la plataforma "actual" marcada, columnas Marketplace/Caché, editar/eliminar por fila](/screenshots/react/melis-core/meliscore-tool-platforms-list.png)

![El editor de plataforma — nombre (bloqueado para la plataforma actual), conmutadores de actualizaciones de Marketplace y Caché](/screenshots/react/melis-core/meliscore-tool-platforms-edit.png)

## Tema de plataforma

**Dónde:** MelisCore → Configuración del sistema → **Esquema de plataforma** (`/melis-core/platform-scheme`).
Configura la **imagen de marca** del back-office: el logo de la cabecera, el **panel izquierdo de inicio de
sesión** (logo, fondo, título/subtítulo por idioma) y el favicon. **Restore to Default** lo restablece.

![La página Tema de plataforma — logo de la cabecera del back-office y la imagen de marca del panel izquierdo de inicio de sesión](/screenshots/react/melis-core/meliscore-tool-platformscheme.png)

> En React hay dos controladores de tema bajo el mismo nodo de permisos
> `meliscore_tool_platform_scheme`: esta página de **Tema de plataforma** (imagen de marca React — logos,
> inicio de sesión, favicon) y el **esquema de colores** heredado (colores del back-office, regenera
> `schemes.css`).

## Herramientas nativas → controladores y capacidades

Cada herramienta React nativa se corresponde con un `MelisReactApi*Controller` (en `src/Controller/`)
declarado en `config/react-api.php`, protegido por un `melisKey` portador de permisos. Las **capacidades**
avanzadas por acción se declaran en `config/react.capabilities.php` y se aplican en el lado del servidor
(permitir por defecto en la interfaz).

| Herramienta (ruta) | Controlador | melisKey / protección | Capacidades |
| --- | --- | --- | --- |
| Usuarios (`/melis-core/user`) | `MelisReactApiUserController` | `meliscore_tool_user` | list, create, edit, delete, export |
| Mi cuenta (`/melis-core/account`) | `MelisReactApiUserProfileController` | `meliscore_user_profile` (solo autenticación) | — |
| Anuncio | `MelisReactApiAnnouncementController` | `melis_core_announcement_tool` | list, create, edit, delete, export |
| Correos | `MelisReactApiEmailsController` | `meliscore_tool_emails_mngt` | list, create, edit, delete |
| RGPD | `MelisReactApiGdprController` | `melis_core_gdpr` | aplicado, no declarado → permitir por defecto |
| Idiomas | `MelisReactApiLanguageController` | `meliscore_tool_language` | list, create, edit, delete |
| Registros | `MelisReactApiLogController` | `meliscore_logs_tool` (solo lectura) | list |
| Módulos | `MelisReactApiModulesController` | `meliscore_tool_user_module_management` | list, edit |
| Otra configuración | `MelisReactApiOtherConfigController` | `meliscore_tool_other_config` | list, edit |
| Plataformas | `MelisReactApiPlatformController` | `meliscore_tool_platform` | list, create, edit, delete |
| Tema de plataforma | `MelisReactApiPlatformScheme(React)Controller` | `meliscore_tool_platform_scheme` | list, edit |
| Autenticación (pública) | `MelisReactApiAuthController` | ninguna (forgot/reset/i18n) | — |

Cada acción protegida ejecuta la misma comprobación de dos líneas:

```php
private const MELIS_KEY = 'meliscore_tool_user';
if ($deny    = $this->denyUnlessAccess())    { return $deny; }    // 401 unauth / 403 canAccess(MELIS_KEY)
if ($denyCap = $this->denyUnlessCan('list')) { return $denyCap; } // capability (CapabilityGuardTrait)
```

## La react-api

El shell consume una `react-api` **genérica** (del módulo `MelisReactApi`) más las rutas de las
herramientas **nativas** (de MelisCore). Base `/melis/react-api`, contrato `{ success, data, error }`; cada
llamada envía `X-Requested-With: XMLHttpRequest` y `credentials: 'include'`.

| Método y URL | Propósito |
| --- | --- |
| `GET /melis/react-api/me` | Usuario actual (id, name, login, email, picture, isAdmin, capabilities). |
| `GET /melis/react-api/menu[?full=1]` | Árbol de herramientas filtrado por permisos (`full=1` = sin filtrar, solo editor de permisos). |
| `GET /melis/react-api/react-modules` | Módulos activos que incluyen un brick + la URL del bundle concatenado. |
| `GET /melis/react-api/langs` · `/assets` · `/i18n?locale=…` | Idiomas del BO, assets de la plataforma, traducciones públicas. |
| `GET /melis/react-api/dashboard/{bubbles,stats,layout}` · `POST …/layout` | Datos del panel + layout compartido. |
| `GET/POST /melis/react-api/{users\|languages\|platforms\|emails\|…}` | CRUD de las herramientas nativas (por controlador arriba). |

Ejemplo — una lista por keyset nativa y un guardado:

```ts
// GET a keyset page of platforms
const r = await fetch('/melis/react-api/platforms?limit=25&sort=plf_id&dir=desc', {
  headers: { 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'include',
})
const { success, data } = await r.json()   // { success, data: { items, total, nextCursor } }

// POST save a language
await fetch('/melis/react-api/languages/save', {
  method: 'POST',
  headers: { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ id: null, locale: 'de_DE', name: 'Deutsch' }),
})
```

## Servicios clave (sin cambios)

Registrados como alias de `service_manager` en `config/module.config.php` — la columna vertebral PHP a
través de la cual llaman las herramientas React:

| Alias de servicio | Rol |
| --- | --- |
| `MelisCoreConfig` | Árbol de configuración en tiempo de ejecución sobre los ficheros `app.*` agregados: `getItem('/meliscore/interface/…')`, `getItemPerPlatform('/meliscore/datas/')`, `getFormMergedAndOrdered(…)`. |
| `MelisCoreAuth` | Autenticación del back-office: `hasIdentity()`, `getIdentity()`, `getAuthRights()`, `encryptPassword()`, `isPasswordCorrect()`. |
| `MelisCoreRights` | Control de acceso por herramienta: `canAccess($melisKey)`, `getRightsValues($id, $isRole)`, `createXmlRightsValues(…)`. |
| `MelisCoreTool` | Ayudante de herramientas del back-office (columnas, formularios, configuración de DataTable) para herramientas heredadas/iframe. |
| `MelisCoreBOEmailService` | Plantillas transaccionales: `sendBoEmailByCode()`, `getBoEmailByCode()`, `saveBoEmailByCode()`, `deleteEmail()`. |
| `MelisCoreGdprService` / `MelisCoreGdprAutoDeleteService` | Acceso/borrado de datos del interesado RGPD y el motor de retención programado. |
| `MelisCoreTranslation` | Carga y fusiona las traducciones `tr_*` por locale (regeneradas al guardar un idioma). |
| `MelisGeneralService` | Clase base que amplían la mayoría de los servicios — `sendEvent()`, `makeArrayFromParameters()`, `getServiceManager()`. |

## Sistema de eventos

`MelisGeneralService` sigue disparando eventos `*_start` / `*_end` alrededor de cada método de servicio, de
modo que cualquier módulo puede interceptarlos. Engánchate mediante el gestor de eventos compartido:

```php
$sm->get('SharedEventManager')->attach(
    'MelisCore',
    'meliscore_tooluser_savenew_end',
    function ($e) { $p = $e->getParams(); /* react */ },
    100
);
```

Eventos habituales del núcleo: `meliscore_tooluser_savenew_start/end`, `…delete_start/end`,
`…save_start/end`, `melis_core_check_user_rights`, `meliscore_install_create_new_user`,
`melis_core_new_platform`, `meliscore_module_management_save_end`, y los eventos de RGPD
(`melis_core_gdpr_user_info_event`, `…_extract_event`, `…_delete_event`, `melis_core_gdpr_auto_delete*`).

## Tablas de base de datos

| Tabla | Contiene |
| --- | --- |
| `melis_core_user` | Usuarios del back-office (login, hash de contraseña, XML `usr_rights`, indicador de admin, idioma, rol). |
| `melis_core_user_role` | Roles y su XML `urole_rights`. |
| `melis_core_user_connection_date` | Historial de inicios de sesión. |
| `melis_core_lang` | Idiomas del back-office. |
| `melis_core_platform` | Entornos/plataformas. |
| `melis_core_bo_emails` / `_details` | Plantillas de correo transaccional y cuerpos por idioma. |
| `melis_core_log` / `_log_type` / `_log_type_trans` | Registro de acciones, tipos y traducciones. |
| `melis_core_lost_password` | Tokens de restablecimiento de contraseña. |
| `melis_core_microservice_auth` | Claves API para los endpoints de microservicios. |
| `melis_core_dashboards` / `_dashboard_schema` | Layout del panel por usuario. |
| `melis_core_plugins` | Plugins registrados. |
| `melis_core_gdpr_delete_config` / `_delete_emails_logs` | Reglas de eliminación automática RGPD y rastro de auditoría. |
| `melis_user_password_history` | Historial de contraseñas (prevención de reutilización). |
| `melis_announcement` | Anuncios del back-office. |

## Ficheros clave

| Aspecto | Ruta |
| --- | --- |
| Arranque del módulo | `vendor/melisplatform/melis-core/src/Module.php` |
| Rutas, servicios, controladores, view helpers | `vendor/melisplatform/melis-core/config/module.config.php` |
| Shell del back-office heredado y árbol de herramientas (interfaz) | `vendor/melisplatform/melis-core/config/app.interface.php` |
| Declaraciones de herramientas DataTable | `vendor/melisplatform/melis-core/config/app.tools.php` |
| Endpoints de microservicios | `vendor/melisplatform/melis-core/config/app.microservice.php` |
| Rutas react-api nativas + controladores | `config/react-api.php` + `src/Controller/MelisReactApi*Controller.php` |
| Capacidades de las herramientas nativas | `config/react.capabilities.php` |
| Código fuente de la app React | `vendor/melisplatform/melis-core/ui-react/src/` |
| App React compilada (versionada) | `vendor/melisplatform/melis-core/public/ui-react/` |
| Servicios · Controladores · Table gateways | `src/Service/` · `src/Controller/` · `src/Model/Tables/` |
| SQL de instalación y migraciones · Traducciones | `install/` · `language/` |

Consulta también: [Referencia de módulos](/es/reference/modules), [Crear una herramienta](/es/guide/create-a-tool),
[Plugins](/es/guide/plugins)
