# MelisLogin2faEmail

> Canal de entrega por correo electrónico del sistema 2FA de Melis: envía el código de inicio de sesión de un solo uso por email. Paquete `melisplatform/melis-login-2fa-email`.

## Propósito

MelisLogin2faEmail es el canal de correo electrónico **por defecto e incluido** de [MelisLogin2fa](/es/reference/modules/melis-login-2fa). Gestiona los eventos `canSend` y `sendUserCode` disparados por el núcleo 2FA, decidiendo si se puede contactar a un usuario por email y luego enviando el código de 6 dígitos por correo. Dado que el núcleo requiere este módulo y este módulo requiere el núcleo, se instalan como pareja: el email siempre es el canal de reserva disponible.

## Presencia en el back-office React

Este módulo es un **plugin de método 2FA**, no una herramienta: **no tiene brick React, ni ruta `react-api`, ni capacidades, ni interfaz propia**. Nunca aparece como una entrada en la barra lateral ni en el menú de `/melis-react`. En su lugar, el canal de email solo se manifiesta *dentro* de pantallas propiedad de MelisLogin2fa / MelisCore:

- **Como método 2FA seleccionable y ordenable** en la **sección de ajustes 2FA** que el núcleo aporta a la herramienta *Other config*. Los administradores lo habilitan y establecen su orden ahí; el orden decide qué canal activo se prueba primero.
- **Como el paso de email y de introducción del código en el inicio de sesión**: cuando 2FA está activado y el email es el canal elegido, el flujo de inicio de sesión envía por correo el código de 6 dígitos y muestra la pantalla de introducción del código. La confirmación muestra una dirección **enmascarada** (por ejemplo, `jo****@…`).

**No hay capturas de pantalla React** para este módulo, porque no tiene pantalla propia.

## Habilitarlo

Este módulo es requerido por `melis-login-2fa` y se instala automáticamente junto a él. No se necesita ninguna entrada separada en el archivo de carga de módulos más allá de cargar `MelisLogin2fa`.

Para activar el canal de correo electrónico, abre los ajustes 2FA que se muestran en el back-office React:

**System config → Other config → 2FA**: habilita **Email** como método de entrega y establece su orden entre los canales activos.

El email del BO de la plataforma también debe estar activo (configurado a través de los ajustes de correo de MelisCore).

## Servicios clave

| Alias del servicio | Rol |
| --- | --- |
| `Melis2faBOEmailService` | Extiende `MelisCoreBOEmailService`; sobrescribe `sendBoEmailByCode()` / `sendEmail()` para establecer el remitente de sobre correcto (`email_from` en lugar de la dirección del destinatario). Carga la plantilla de email por nombre en clave, sustituye los marcadores `[TAG]`, la envuelve en el layout y la envía mediante `Laminas\Mail`. |
| `MelisLogin2faEmailControllerPlugin` | Plugin de controlador: punto de entrada llamado por ambos listeners; expone `canSend($userData)` y `sendUserCode($user, $code)`. |

## Listeners

| Listener | Evento | Comportamiento |
| --- | --- | --- |
| `MelisCoreCanSendListener` | `canSend` | Devuelve `['melis-login-2fa-email' => <bool>]`: `true` cuando el usuario tiene un `usr_email` utilizable (no vacío y que pasa `Laminas\Validator\EmailAddress`). |
| `MelisCoreSendUserCodeListener` | `sendUserCode` | Actúa solo cuando aún no se ha enviado **y** este canal es el primero en `orderedModules` (`orderedModules[0] === 'melis-login-2fa-email'`). Reutiliza o crea una fila `melis_core_login_2fa_codes`, resuelve el locale, envía el código, luego establece `sent=true`, llama a `stopPropagation` y devuelve `['sent'=>true, 'hash'=>…, 'message'=>'<sent-to> '.maskEmail($email)]`. |

El identificador utilizado en toda la selección y ordenación de métodos es la cadena `melis-login-2fa-email`.

## Locale y enlace de recuperación

`sendUserCode()` resuelve el **locale** del destinatario (el propio `usr_lang_id` del destinatario en contexto BO, con reserva al locale de sesión; el idioma de la página principal del sitio en contexto FO) para que el asunto y el cuerpo del email estén en el idioma del destinatario.

El enlace de *forgot-password* del email se adapta al back-office desde el que llegó el usuario: un usuario BO que solicitó su código **desde el shell React** obtiene el enlace apuntando a **`/melis-react/forgot-password`** en lugar del legacy `/melis/lost-password`. Esto está condicionado por `($user['ui_origin'] ?? null) === 'react'`, donde `ui_origin` se deriva (basado en el Referer, con `'legacy'` por defecto) por el `Login2faController::request2faCodeAction()` del núcleo. Nada más en el flujo es específico de React.

## Configuración

Declarado bajo la clave de configuración `melis_login_2fa_email`:

| Clave | Por defecto | Descripción |
| --- | --- | --- |
| `email_from` | `noreply@melistechnology.com` | Dirección del remitente de sobre |
| `from_name` | `Melis Platform` | Nombre visible del remitente |
| `reply_to` | — | Dirección de respuesta (reply-to) |

## Tablas de base de datos

| Tabla | Contiene |
| --- | --- |
| `melis_core_login_2fa_codes` | Códigos de un solo uso (compartida con el núcleo 2FA); las filas se reutilizan mientras siguen siendo válidas o se crean nuevas mediante `MelisLogin2faService::generate2faCode()`. |

## Archivos clave

| Aspecto | Ruta |
| --- | --- |
| Bootstrap del módulo | `vendor/melisplatform/melis-login-2fa-email/src/Module.php` |
| Configuración del módulo | `vendor/melisplatform/melis-login-2fa-email/config/module.config.php` |
| Listener `canSend` | `vendor/melisplatform/melis-login-2fa-email/src/Listener/MelisCoreCanSendListener.php` |
| Listener `sendUserCode` | `vendor/melisplatform/melis-login-2fa-email/src/Listener/MelisCoreSendUserCodeListener.php` |
| Plugin de controlador | `vendor/melisplatform/melis-login-2fa-email/src/Controller/Plugin/MelisLogin2faEmailControllerPlugin.php` |
| Servicio de email | `vendor/melisplatform/melis-login-2fa-email/src/Service/Melis2faBOEmailService.php` |

## Metadatos

| Elemento | Valor |
| --- | --- |
| Paquete | `melisplatform/melis-login-2fa-email` |
| Tipo | `melisplatform-module` · categoría `core` · `dbdeploy: true` |
| Namespace | `MelisLogin2faEmail\` (PSR-4 → `src/`) |
| Requiere | `melisplatform/melis-login-2fa` `^5.3` · PHP `^8.1\|^8.3` |
| Presencia React | Ninguna: sin brick, sin `react-api`, sin capacidades, sin interfaz |

Consulta también: [MelisLogin2fa](/es/reference/modules/melis-login-2fa) · [MelisCore](/es/reference/modules/melis-core)
