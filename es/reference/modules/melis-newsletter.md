# MelisNewsletter

> Convierte una página CMS en un boletín de correo electrónico personalizado y lo entrega a grupos de suscriptores, ahora gestionado desde un back-office React nativo. Paquete `melisplatform/melis-newsletter`.

## Propósito

MelisNewsletter reutiliza el sistema de páginas del CMS como plantilla del boletín: una página marcada como tipo
**NEWSLETTER** se renderiza como HTML, se personaliza por destinatario mediante códigos BB (`[NAME]`,
`[FIRSTNAME]`, `[EMAIL]`, `[UNSUBSCRIBELINK]`) y se envía a los suscriptores o grupos seleccionados
a través de un transporte de correo configurable. Los suscriptores se organizan en una lista por sitio y pueden
segmentarse en grupos. Cada envío se archiva con una instantánea HTML completa y un registro por destinatario;
se incluyen de serie un plugin de front para darse de baja y una integración RGPD completa.

En la v6, la herramienta se distribuye como un **brick React nativo** en el back-office `/melis-react`. La lógica
de negocio (servicios, mecanismo de envío, RGPD, tablas) permanece intacta; solo la capa de presentación se ha migrado a React,
servida a través de una capa JSON `react-api` expuesta por el módulo.

## Activarlo

Añádelo a `config/melis.module.load.php`:

```php
return [
    'MelisNewsletter',
];
```

Requiere `melis-core` y `melis-cms`; funcionalmente también depende de `melis-engine` y `melis-front`
para el renderizado de páginas y el plugin de baja. La herramienta React aparece en el menú **solo cuando el
módulo está activado** (descubrimiento modular de bricks mediante `GET /melis/react-api/react-modules`). Eliminar
`MelisNewsletter` de `melis.module.load.php` hace que el brick desaparezca.

## Back-office (React)

Barra lateral izquierda → **MelisMarketing → Newsletter** (`fa fa-newspaper-o`), ruta de montaje
`/melis-marketing/melis-newsletter-tool-config`. Se abre como una única herramienta cuyo encabezado incluye el
título *Newsletters*, el subtítulo *"Subscribers, groups, history and send configuration"* y un
conmutador **New / Old** (arriba a la derecha). *New* es la interfaz React (por defecto); *Old* muestra la herramienta heredada en
un iframe (`/melis/react-tool-page?key=melis_newsletter_tool_display`).

A diferencia de una herramienta con sub-pestañas de host, Newsletter renderiza sus cuatro pantallas como **sus propias pestañas React**:

| Pestaña | Contenido |
| --- | --- |
| Subscribers | Tarjetas KPI (Total / Activos / Inactivos), búsqueda, filtros de estado + sitio, gestor de columnas, **Importar** CSV, **Exportar**, **Añadir selección a grupo(s)**, **+ Nuevo suscriptor**. Tabla: Estado / Email / Nombre / Apellidos / Sitio / Grupos con edición/eliminación por fila |
| Groups | Tarjetas KPI, búsqueda, filtro de estado, Exportar, **+ Nuevo grupo**. Tabla: Estado / Nombre / Creado / Miembros (recuento) con edición/eliminación |
| History | Archivo de solo lectura. Tarjetas KPI (Envíos / Sitios / Hoy), búsqueda, filtro de sitio, Exportar. Tabla: Página / Sitio / Versión / Enviado el con un **ojo** por fila para ver el HTML archivado exacto |
| Configuration | La única **configuración de transporte** SMTP global: Host / Usuario / Contraseña (+ confirmar). Vacío = el transporte por defecto de Melis |

![La pestaña Subscribers en la herramienta React de Newsletter](/screenshots/react/melis-newsletter/melisnewsletter-tool-newsletter-tab-subscribers.png)

Abrir o crear un **suscriptor** o un **grupo** no abre una nueva pestaña principal, sino que abre el
editor de registros (SubscriberForm / GroupForm) en una **sub-pestaña de host** nativa (desglose, con clave `s-<id>` /
`g-<id>`). El formulario de suscriptor contiene el nombre y los apellidos, el email, el sitio, un conmutador Activo y las
pertenencias a grupos; el formulario de grupo contiene el nombre, un conmutador Activo y los miembros del grupo (añadir/quitar +
selector de suscriptores).

![La pestaña Groups en la herramienta React de Newsletter](/screenshots/react/melis-newsletter/melisnewsletter-tool-newsletter-tab-groups.png)

![La pestaña History en la herramienta React de Newsletter](/screenshots/react/melis-newsletter/melisnewsletter-tool-newsletter-tab-history.png)

![La pestaña Configuration en la herramienta React de Newsletter](/screenshots/react/melis-newsletter/melisnewsletter-tool-newsletter-tab-config.png)

Por seguridad, la contraseña SMTP almacenada **nunca se devuelve al navegador**: los campos muestran un
marcador de posición enmascarado, y dejarlos vacíos al guardar conserva la contraseña actual.

### Enviar un boletín

La acción **Send** no es una pestaña. Es una ventana modal (`NewsletterSendModal`) expuesta mediante
`window.__melisNewsletterSendModal`, que **el editor de páginas React renderiza** para las páginas de tipo
**NEWSLETTER**. Define un asunto, elige grupos o suscriptores, primero **Test** hacia un suscriptor elegido o una
dirección de correo libre, y luego **Send**. Si tiene éxito, dispara un evento `melis:newsletter-sent` para que
la pestaña persistente History se actualice. Variables de personalización en el contenido: `[NAME]`, `[FIRSTNAME]`,
`[EMAIL]`, `[UNSUBSCRIBELINK]`. Publica la página antes de enviar.

## API React

Las rutas residen en `config/react-api.php` (fusionadas mediante `MelisNewsletter\Module::getConfig()`), servidas como
rutas hijas del puente genérico `melis-react-api` bajo `/melis/react-api/newsletter`. Controlador
`MelisNewsletter\Controller\MelisReactApiNewsletterController`; contrato JSON `{ success, data, error }`;
cada petición lleva `X-Requested-With: XMLHttpRequest` + credenciales. Endpoints seleccionados:

| Método y URL (relativa a `/melis/react-api/newsletter`) | Propósito |
| --- | --- |
| `GET /subscribers` · `/subscribers/stats` · `/subscribers/:id` | Lista con keyset (`search`, `active`, `site`, `group`, `sort`, `dir`, `after`), KPI, un registro |
| `POST /subscribers/save` · `/subscribers/import` | Crear/actualizar; importación masiva CSV → `{imported,skipped,errors}` |
| `DELETE /subscribers/delete/:id` | Eliminar |
| `GET /groups` · `/groups/stats` · `/groups/:id` · `/groups/:id/members` | Lista de grupos, KPI, registro, miembros |
| `POST /groups/save` · `/groups/:id/members/add` · `/groups/members/bulk-add` | Guardar; añadir miembro; asignar en masa `subscriberIds[]` a `groupIds[]` |
| `DELETE /groups/delete/:id` · `/groups/members/remove/:mid` | Eliminar grupo; quitar pertenencia (`mid` = `nlgu_id`) |
| `GET /history` · `/history/stats` · `/history/:id` | Lista del archivo de envíos, KPI, HTML archivado de un envío |
| `GET /config` · `POST /config/save` | Configuración SMTP (la contraseña no se devuelve; solo `hasPassword`) / guardar |
| `GET /send-options` · `POST /send` · `POST /test` | Opciones de la modal de envío; enviar; envío de prueba |

El controlador React **reutiliza el servicio Laminas del módulo** (`MelisNewsletterService`) para el trabajo
pesado: el envío/prueba pasa por `sendNewsletter()` / `testNewsletter()` / `testNewsletterCustomMail()`,
y las validaciones replican `saveSubscriber` / `importFileValidator` / `saveConfig`, de modo que la ruta React
reproduce las reglas de negocio heredadas exactas.

## Capacidades (permisos avanzados)

Declaradas en `config/react.capabilities.php` bajo el nodo portador de permisos
**`melis_newsletter_tools_section`** (no la clave de manifiesto/zona `melis_newsletter_tool_display`). Un
árbol por pestaña más una acción `send` transversal, aplanados a cadenas con puntos:

```
melis_newsletter_tools_section
├─ action: send                              (Send / Test — la modal del editor de páginas)
├─ tab subscribers: list · create · edit · delete · export
├─ tab groups:      list · create · edit · delete · export
├─ tab history:     list                     (solo lectura)
└─ tab config:      edit                     (transporte SMTP)
```

React las lee mediante `useCaps('melis_newsletter_tools_section').can('…')` y controla sus botones
de acción; en el lado servidor, cada acción de mutación está protegida (`denyUnlessAccess()` y luego `denyUnlessCan()`).
`react.capabilities.php` también fusiona una acción `newsletter` bajo el nodo compartido `meliscms_page`, de modo
que el botón Send del editor de páginas se pueda controlar en Users → Rights.

## Servicios clave

| Alias del servicio | Rol |
| --- | --- |
| `MelisNewsletterService` | Servicio central para suscriptores, grupos, envío/prueba, archivo y configuración. Dispara eventos `*_start` / `*_end`. |
| `MelisNewsletterGdprAutoDeleteService` | Implementa `MelisCoreGdprAutoDeleteInterface`; gestiona el flujo programado de aviso/eliminación RGPD para suscriptores inactivos. |

Alias de table gateway: `MelisNewsletterSubscribersTable`, `MelisNewsletterGroupsTable`,
`MelisNewsletterGroupsPeopleTable`, `MelisNewsletterArchiveTable`,
`MelisNewsletterRecipientsTable`, `MelisNewsletterConfigTable`.

## Mecanismo de envío

`MelisNewsletterService::sendNewsletter($pageId, $subscribers, $groups, $mailSubject)`:

1. **Resolver destinatarios** — suscriptores explícitos + miembros de grupo mediante `getSubscribersInGroup()`,
   filtrados solo a los activos y deduplicados.
2. **Renderizar contenido** — la página CMS se obtiene como HTML; los `href`/`src` relativos se reescriben a URL absolutas.
3. **Personalizar** — códigos BB sustituidos por destinatario; `[UNSUBSCRIBELINK]` lleva el token con hash.
4. **Enviar** — mediante el transporte SMTP configurado o el predeterminado de la plataforma.
5. **Archivar** — una fila `nlan_*` por envío (sitio, página, versión, HTML completo, fecha de envío) y una
   fila `nlus_*` por destinatario.

**Envío de prueba** (`testNewsletter()` / `testNewsletterCustomMail()`) entrega a un suscriptor o a un
correo arbitrario sin archivar, y es obligatorio antes de que se desbloquee un envío real.

## Front office

| Plugin | Clave de configuración | Descripción |
| --- | --- | --- |
| `MelisNewsletterUnsubscribePlugin` | `melisnewsletter` / `MelisNewsletterUnsubscribePlugin` | Colócalo en una página `unsubscribe`. Lee el token `?s={hashed_id}` incrustado en `[UNSUBSCRIBELINK]`, llama a `deactivateSubscriberById()` y muestra un mensaje de éxito/error. Expone un ajuste `unsubscribe_data_salt` usado en el hash del token. |

Vistas: `plugins/unsubscribe.phtml` + `unsubscribe-modal-form.phtml`.

## Integración RGPD

Se engancha al framework RGPD de MelisCore tanto para flujos bajo demanda como programados:

- **Bajo demanda:** `MelisNewsletterGdprUserInfoListener`, `…UserExtractListener`, `…UserDeleteListener`
  encuentran, exportan y eliminan los datos de suscriptor de una persona a petición. Columnas: `nlu_firstname`, `nlu_name`,
  `nlu_email`, `nlu_date_creation` (declaradas en `config/app.gdpr.php`).
- **Auto-eliminación programada:** `MelisNewsletterGdprAutoDeleteService` con nueve listeners que cubren el registro
  del módulo, la declaración de etiquetas RGPD, la construcción de la lista de avisos, los correos de aviso y la eliminación final de
  suscriptores inactivos que no responden.

## Tablas de la base de datos

| Tabla (alias → prefijo de columnas) | Contiene |
| --- | --- |
| `MelisNewsletterSubscribersTable` (`nlu_*`) | Filas de suscriptores por sitio: email, nombre/apellidos, estado, fecha de creación |
| `MelisNewsletterGroupsTable` (`nlg_*`) | Definiciones de grupos: nombre, estado, fecha de creación |
| `MelisNewsletterGroupsPeopleTable` (`nlgu_*`) | Enlace de pertenencia suscriptor ↔ grupo |
| `MelisNewsletterArchiveTable` (`nlan_*`) | Archivo por envío: sitio, página, versión, cuerpo HTML completo, fecha de envío |
| `MelisNewsletterRecipientsTable` (`nlus_*`) | Registro de envío por destinatario: instantánea de nombre/nombre/email, FK del archivo |
| `MelisNewsletterConfigTable` (`nlc_*`) | Configuración de transporte SMTP por sitio: host, usuario, contraseña |

## Ejemplo

```php
$nl = $serviceManager->get('MelisNewsletterService');

// Subscriber / group management (same service the react-api reuses)
$nl->saveSubscriber($data, $id);           // $id null → create
$nl->deactivateSubscriberById($id);
$nl->saveGroup($data, $id);
$nl->getSubscribersInGroup($grpId);

// Send flow
$nl->testNewsletter($pageId, $subId, $subject);
$nl->sendNewsletter($pageId, $subscribers, $groups, $subject);

// History & config
$nl->getNewsletterRecipients($archiveId);
$nl->saveNewsletterConfig($cfg);
```

## Archivos clave

| Aspecto | Ruta |
| --- | --- |
| Rutas de la API React + controlador invocable | `vendor/melisplatform/melis-newsletter/config/react-api.php` |
| Capacidades React (con clave `melis_newsletter_tools_section`) | `vendor/melisplatform/melis-newsletter/config/react.capabilities.php` |
| Controlador de la API React (reutiliza `MelisNewsletterService`) | `vendor/melisplatform/melis-newsletter/src/Controller/MelisReactApiNewsletterController.php` |
| Brick React (build de Vite) + manifiesto | `vendor/melisplatform/melis-newsletter/public/ui-react/brick.js` · `brick.manifest.json` |
| Configuración del módulo (servicios, table gateways, controladores, plugin) | `vendor/melisplatform/melis-newsletter/config/module.config.php` |
| Servicio principal | `vendor/melisplatform/melis-newsletter/src/Service/MelisNewsletterService.php` |
| Servicio de auto-eliminación RGPD | `vendor/melisplatform/melis-newsletter/src/Service/MelisNewsletterGdprAutoDeleteService.php` |
| Plugin de front para darse de baja | `vendor/melisplatform/melis-newsletter/src/Controller/Plugin/MelisNewsletterUnsubscribePlugin.php` |
| Table gateways | `vendor/melisplatform/melis-newsletter/src/Model/Tables/` |
| Instalación de BD + migraciones | `vendor/melisplatform/melis-newsletter/install/dbdeploy/` |

Véase también: [melis-core](/legacy/reference/modules/melis-core), [melis-cms](/legacy/reference/modules/melis-cms),
[melis-front](/legacy/reference/modules/melis-front), [melis-engine](/legacy/reference/modules/melis-engine)
