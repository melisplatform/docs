# MelisMessenger

> Sistema interno de mensajería entre usuarios dentro del back-office de Melis, presentado en el back-office React como un icono de notificación en la barra superior y una pestaña «Melis Messenger» en Mi cuenta. Paquete `melisplatform/melis-messenger`.

## Propósito

MelisMessenger añade un sistema ligero de mensajería privada para que los colaboradores del back-office
puedan comunicarse entre sí. Un usuario inicia una conversación con uno o varios usuarios, los mensajes
se intercambian y se actualizan en un intervalo de sondeo, y una insignia de mensajes no leídos muestra
los mensajes nuevos desde cualquier pantalla. Es una herramienta exclusiva del back-office: no tiene
componente de front-office.

En el back-office React (`/melis-react`) es un **brick nativo de React especial, no una herramienta del
menú lateral**. **No tiene entrada en la barra lateral ni ruta** (`route`, `forwardKey`, `melisKey` son
todos `null`) y en su lugar conecta **dos widgets** a los puntos de extensión del host:

1. un **icono de mensajería en la barra superior** con una insignia de recuento de no leídos (`MessengerHeader.tsx`), y
2. una **pestaña «Melis Messenger» dentro de Mi cuenta** (`MessengerTab.tsx`), un panel de chat nativo de React.

Los componentes React no incluyen **ni `react-api` ni capacidades**: reutilizan los endpoints JSON legacy
existentes del módulo. La lógica de negocio permanece en el lado del servidor en `MelisMessengerService`.

## Activarlo

Añade a `config/melis.module.load.php`:

```php
return [
    'MelisMessenger',
];
```

Requiere `melisplatform/melis-core`. La categoría del módulo es `core` con `dbdeploy` habilitado, por lo
que sus tablas se instalan mediante el mecanismo dbdeploy. Ambas superficies React aparecen **solo cuando
el módulo está activo**: la pestaña de cuenta está protegida por `window.__melisIsModuleActive('MelisMessenger')`,
y el widget de cabecera se registra a través del brick, que el host carga únicamente para los módulos activos.

## En el back-office React

**No hay entrada en la barra lateral** para Messenger. Puedes acceder de dos formas:

- **El icono de la barra superior**: una burbuja de chat en la cabecera del back-office, junto al selector
  de idioma. Una insignia roja muestra tu recuento de no leídos (`99+` por encima de 99). Al hacer clic se
  abre **Mi cuenta** con la pestaña **Melis Messenger** preseleccionada.

![El icono de mensajería de la barra superior (resaltado) situado junto al selector de idioma y los demás widgets de cabecera; aparece una insignia roja sobre él cuando tienes mensajes no leídos.](/screenshots/react/melis-messenger/melismessenger-platformheader-iconmessenger.png)

- **La pestaña Melis Messenger**: dentro de Mi cuenta (icono de burbuja de chat, junto a Perfil). Un panel
  nativo de React que muestra tus **Contactos** (conversaciones, las más recientes primero) junto al hilo de
  la **conversación** seleccionada (tus burbujas a la derecha). Un botón **+** abre una búsqueda de usuarios
  para iniciar una nueva conversación, y un compositor en la parte inferior te permite escribir y **Enviar**.
  Al abrir una conversación se marca como leída, por lo que la insignia de la cabecera disminuye de inmediato.

![La pestaña React «Melis Messenger» dentro de Mi cuenta: la lista de Contactos (con «+» para iniciar una nueva conversación), el hilo de burbujas de mensajes de la conversación seleccionada y el compositor «Write a message… / Send». El interruptor New/Old (arriba a la derecha) puede recurrir al perfil legacy.](/screenshots/react/melis-messenger/melismessenger-tool-profile-tab-messenger.png)

La insignia y el hilo abierto se actualizan mediante un temporizador, cuando la pestaña del navegador
recupera el foco y en cuanto abres una conversación. En una pantalla estrecha (~por debajo de 560px) la
pestaña se contrae a una sola columna a la vez (Contactos *o* conversación) con un botón de retroceso, como
una aplicación de chat móvil. Un interruptor **New / Old** en la página de la cuenta recurre al perfil legacy
en un iframe; en ese caso, el icono de la cabecera controla el DOM del iframe para abrir la pestaña legacy de
Messenger en su lugar.

## El brick

La interfaz de React reside en `ui-react/` y se compila (Vite IIFE, con React/ReactRouter externalizados a
los globals del host) en `public/ui-react/brick.js` junto a `brick.manifest.json`. El manifiesto declara
que esto no es una herramienta: obsérvense los valores nulos:

```json
{ "id": "messenger", "route": null, "label": "Messenger",
  "forwardKey": null, "melisKey": null, "entry": "brick.js" }
```

`ui-react/src/brick.tsx` registra **dos superficies del host** para el id `messenger`, ambas condicionadas
a la activación del módulo:

```tsx
// 1) My-Account tab — modular extension point
window.__melisAccountTabs.push({
  id: 'messenger', label: 'Melis Messenger', icon: <ChatIcon />, order: 10,
  render: () => <MessengerTab />,
})
window.dispatchEvent(new CustomEvent('melis-account-tabs-changed'))

// 2) Topbar icon — the brick's Header widget
window.__melisRegisterBrick?.({ id: 'messenger', Header: MessengerHeader })
```

| Componente | Función |
| --- | --- |
| `brick.tsx` | Punto de entrada. Registra el widget Header e inserta la pestaña de Mi cuenta. |
| `MessengerHeader.tsx` | Icono de la barra superior + insignia de no leídos. Sondea `getNewMessage` para obtener el recuento, almacena en caché el último recuento en `sessionStorage` para un pintado instantáneo, recuenta al recuperar el foco/visibilidad y ante el evento `melis-messenger-unread-changed`. Al hacer clic abre Mi cuenta y preselecciona la pestaña Messenger. |
| `MessengerTab.tsx` | El panel de chat nativo de React: lista de Contactos, hilo de conversación, compositor y búsqueda de usuarios para «nueva conversación». Lee/escribe en los endpoints JSON legacy; es responsive; emite `melis-messenger-unread-changed` cuando marca una conversación como leída. |

Dado que el bundle externaliza únicamente `react` / `react-dom` / `react-router-dom` a los globals del host
(no puede importar Tailwind/shadcn/lucide/i18n), los componentes usan estilos en línea con variables CSS del
host y un diccionario `{fr,en}` en el propio archivo indexado por `document.documentElement.lang`.

## Endpoints reutilizados

El módulo no incluye **ningún `config/react-api.php`**. Ambos componentes React llaman a los endpoints JSON
legacy existentes de `MelisMessenger\Controller\MelisMessengerController` bajo
`/melis/MelisMessenger/MelisMessenger/…`, enviando `X-Requested-With: XMLHttpRequest` y
`credentials: 'include'`.

**Header (`MessengerHeader.tsx`): el sondeador de la insignia:**

| Método y URL | Propósito |
| --- | --- |
| `GET …/getNewMessage` | Mensajes no leídos → `{ messages: [...] }`; recuento de la insignia = `messages.length`. |
| `GET …/getMsgTimeInterval` | Intervalo de sondeo de la plataforma `{ interval }` (por defecto 60 000 ms). |

La cabecera limita el sondeo a `min(interval, 10 000 ms)` para que la insignia, siempre visible, se mantenga reactiva.

**Pestaña de Mi cuenta (`MessengerTab.tsx`): el panel de chat:**

| Método y URL | Propósito |
| --- | --- |
| `GET …/getContactListByDate` | Conversaciones ordenadas por fecha del último mensaje → `{ data: ContactRow[] }`. |
| `GET …/getConversation/:id?limit=&offset=` | Mensajes de una conversación → `{ data: Message[], user_id }`. |
| `GET …/getUserListForConversation?search=` | Búsqueda de usuarios para «nueva conversación» → `{ data: UserRow[] }`. |
| `POST …/createConversation` | Iniciar una conversación (`mbrids=<userId>`) → `{ conversationId }`. |
| `POST …/saveMessage` | Enviar un mensaje (`msgr_msg_id`, `msgr_msg_cont_message`) → `{ success }`. |
| `POST …/updateMessageStatus` | Marcar la conversación abierta como leída (`id=<convoId>`), se dispara al abrir/responder. |
| `GET …/getMsgTimeInterval` | Intervalo de sondeo para la actualización del hilo. |

`getContactListByDate` y `getUserListForConversation` son usados específicamente por la pestaña React (lista
ordenada por fecha + búsqueda de usuarios en el servidor); las acciones más antiguas `getContactList` /
`renderMessenger*` siguen impulsando la herramienta legacy y se dejan sin cambios.

## Servicios clave

| Alias | Función |
| --- | --- |
| `MelisMessengerService` | Servicio público de mensajería: enviar y leer mensajes/conversaciones. |
| `MelisMessengerMsgTable` | Table gateway para `melis_messenger_msg`. |
| `MelisMessengerMsgContentTable` | Table gateway para `melis_messenger_msg_content`. |
| `MelisMessengerMsgMembersTable` | Table gateway para `melis_messenger_msg_members`. |

Los métodos de `MelisMessengerService` disparan eventos `melismessenger_*_start` / `*_end` por cada llamada
de lectura/listado (p. ej. `melismessenger_get_conversation_start` / `_end`):

| Método | Función |
| --- | --- |
| `saveMsg($data)` | Crear/actualizar una conversación; devuelve el id de la conversación. |
| `saveMsgMembers($data)` | Vincular un usuario a una conversación. |
| `saveMsgContent($data)` | Guardar un mensaje dentro de una conversación. |
| `getConversation($id)` | Obtener una conversación completa por id. |
| `getConversationWithLimit($id, $limit, $offset)` | Obtención paginada de una conversación. |
| `getNewMessage($id)` | Obtener los mensajes nuevos/no leídos desde el último sondeo. |
| `updateMessageStatus($data, $msg_id, $user_id)` | Marcar los mensajes como leídos para un usuario. |
| `getContactList($convo_id, $user_id)` | Resolver los contactos de una conversación. |
| `prepareConversationId($userId)` | Listar los ids de conversación a los que pertenece un usuario. |
| `getUserRightsForMessenger()` | Comprobar los derechos de acceso del usuario actual al módulo. |

## Tablas de la base de datos

| Tabla | Contiene |
| --- | --- |
| `melis_messenger_msg` | Una fila por conversación (`msgr_msg_id`, `msgr_msg_creator_id`, `msgr_msg_date_created`). |
| `melis_messenger_msg_members` | Usuarios que participan en una conversación (`msgr_msg_mbr_id`, `msgr_msg_id`, `msgr_msg_mbr_usr_id`). |
| `melis_messenger_msg_content` | Mensajes individuales (`msgr_msg_cont_id`, remitente, texto del mensaje, fecha, estado). |

## Capacidades

**Ninguna.** El módulo no tiene `config/react.capabilities.php` ni ningún nodo de menú con derechos: no es
una herramienta de menú. El acceso está protegido por los endpoints legacy, que exigen una sesión autenticada
del back-office, y las superficies están condicionadas a la activación del módulo. No hay cadenas de capacidad
`MelisCan(...)` que declarar ni comprobar para Messenger.

## Ejemplo

```php
$messenger = $this->getServiceManager()->get('MelisMessengerService');

// Create a conversation, add a member, then post a message
$convoId = $messenger->saveMsg($data);
$messenger->saveMsgMembers(['msgr_msg_id' => $convoId, 'msgr_msg_mbr_usr_id' => $userId]);
$messenger->saveMsgContent(['msgr_msg_id' => $convoId, 'msgr_msg_cont_message' => 'Hi']);

// Read messages
$thread = $messenger->getConversation($convoId);
$page   = $messenger->getConversationWithLimit($convoId, 10, 0);
$new    = $messenger->getNewMessage($convoId);

// Mark read
$messenger->updateMessageStatus($data, $msgId, $userId);
```

## Archivos clave

| Aspecto | Ruta |
| --- | --- |
| Configuración del módulo (rutas, servicios, controladores) | `vendor/melisplatform/melis-messenger/config/module.config.php` |
| Declaración de interfaz (pestaña Profile legacy + icono de cabecera) | `vendor/melisplatform/melis-messenger/config/app.interface.php` |
| Configuración de formularios | `vendor/melisplatform/melis-messenger/config/app.forms.php` |
| Configuración de herramientas | `vendor/melisplatform/melis-messenger/config/app.tools.php` |
| Servicio público | `vendor/melisplatform/melis-messenger/src/Service/MelisMessengerService.php` |
| Controlador principal (endpoints JSON reutilizados por React) | `vendor/melisplatform/melis-messenger/src/Controller/MelisMessengerController.php` |
| Table gateways | `vendor/melisplatform/melis-messenger/src/Model/Tables/` |
| Brick React (widget Header + pestaña de Mi cuenta) | `vendor/melisplatform/melis-messenger/ui-react/src/` |
| Brick compilado + manifiesto | `vendor/melisplatform/melis-messenger/public/ui-react/brick.js`, `brick.manifest.json` |
| Delta de instalación de BD | `vendor/melisplatform/melis-messenger/install/` |

Véase también: [melis-core](/es/reference/modules/melis-core)
