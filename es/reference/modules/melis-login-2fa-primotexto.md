# MelisLogin2faPrimotexto

> Canal de entrega de SMS para el sistema 2FA de Melis a través de la pasarela Primotexto. Paquete `melisplatform/melis-login-2fa-primotexto`.

## Propósito

MelisLogin2faPrimotexto es un canal 2FA opcional que envía el código de inicio de sesión de un solo uso por mensaje de texto mediante la API de SMS de **Primotexto**. Se conecta al contrato de eventos del núcleo `MelisLogin2fa` (`canSend` / `sendUserCode`). Cuando se ordena en primer lugar entre los canales activos y el usuario tiene un número de teléfono válido, entrega el código por SMS; si no se encuentra un teléfono válido pero también hay un canal de correo electrónico activo, recurre al correo electrónico y notifica al usuario en consecuencia.

## Activarlo

Añádalo a `config/melis.module.load.php`:

```php
return [
    'MelisLogin2faPrimotexto',
];
```

Requiere `melisplatform/melis-login-2fa` (`^5.3`) y PHP `^8.1|^8.3`. El módulo del núcleo `MelisLogin2fa` debe cargarse primero.

Una vez cargado, active **SMS (Primotexto)** en la **configuración 2FA** compartida (System config → 2FA) y ordénelo en primer lugar para convertirlo en el canal principal. Proporcione las credenciales de la API de Primotexto bajo la clave de configuración `melis_login_2fa_primotexto` (consulte [Configuración](#configuration)).

## En el back-office React

Este módulo es un **plugin de método 2FA del lado del servidor**, no una herramienta del back-office. En el back-office React (`/melis-react`) **no tiene página, ni ruta, ni entrada de menú**. Toda su huella en React es un **brick de descubrimiento únicamente con id**: un `public/ui-react/brick.manifest.json` mínimo (con `route`, `forwardKey` y `melisKey` todos en `null`) y un `brick.tsx` que registra únicamente su id.

```tsx
// ui-react/src/brick.tsx — the entire React contribution (id only, no UI).
window.__melisRegisterBrick?.({ id: 'melis-login-2fa-primotexto' })
```

El registro de ese id es lo que hace que el módulo aparezca en `GET /melis/react-api/react-modules`, la lista de descubrimiento de módulos activos que incluyen un brick. El `useModuleActive('MelisLogin2faPrimotexto')` de MelisCore se basa en esa lista para **mostrar el campo `usr_phone` en el formulario nativo de Usuarios**: los usuarios necesitan un número de teléfono para el 2FA por SMS. El módulo no aporta **ningún endpoint `react-api` ni capacidades** propias; los ajustes de la API de Primotexto (`url`, `api_key`, `sender`) los renderiza la sección de configuración 2FA compartida, propiedad del núcleo 2FA, no este módulo.

## Configuración

```php
// config/autoload/primotexto.local.php  (do NOT commit real keys)
return [
    'melis_login_2fa_primotexto' => [
        'url'     => 'https://api.primotexto.com/v2/notification/messages/send',
        'api_key' => 'YOUR_API_KEY',   // override per environment
        'sender'  => 'Melis',
    ],
];
```

> **Advertencia.** El archivo `config/module.config.php` incluido en el repositorio contiene un valor de marcador literal para `api_key`. Sobrescríbalo siempre en un archivo de configuración local o específico del entorno, y rote cualquier clave real que pueda haberse subido al repositorio.

## Servicios clave

| Alias del servicio | Función |
| --- | --- |
| `SmsService` | Llama a la API HTTP de Primotexto para entregar el SMS con el OTP; normaliza los números franceses `0…` a `+33…`; registra los fallos de curl/HTTP en `CmaErrorLogsTable` |
| `MelisLogin2faPrimotextoControllerPlugin` | Plugin de controlador que expone `canSend($userData)` y `sendUserCode($user, $code)`; gobierna `SmsService` |

## Escuchadores de eventos

| Escuchador | Evento | Comportamiento |
| --- | --- | --- |
| `MelisCoreCanSendListener` | `canSend` | Devuelve `['melis-login-2fa-primotexto' => bool]`; si no puede enviar pero el correo electrónico es el siguiente en el orden, almacena un `twofa_fallback_message` en la sesión `melis_login_2fa` |
| `MelisCoreSendUserCodeListener` | `sendUserCode` | Actúa solo cuando aún no se ha enviado y este canal es `orderedModules[0]`; reutiliza/crea la fila `melis_core_login_2fa_codes`, envía a través de `SmsService`, establece `sent=true`, llama a `stopPropagation` |

## Tablas de la base de datos

| Tabla | Contiene |
| --- | --- |
| `melis_core_user` | Obtiene una columna `usr_phone` que admite valores nulos (añadida por el `dbdeploy` de este módulo): el número de teléfono al que se envían los códigos OTP |
| `melis_core_login_2fa_codes` | Códigos OTP (propiedad del núcleo `MelisLogin2fa`; este canal reutiliza/crea filas mediante `MelisLogin2faService` + `MelisLogin2faCodesTable`) |

## Ejemplo

```php
// Primotexto API call assembled by SmsService::sendSms()
$url = $config['url'] . '?' . http_build_query([
    'apiKey'     => $config['api_key'],
    'identifier' => $number,           // normalised to +33… for French numbers
    'sender'     => trim($config['sender']),
    'message'    => $message,
]);
// Sent via curl (GET). HTTP >= 400 or curl failure → logged + returns false.
```

## Advertencias

- **Dependencia de `CmaErrorLogsTable`.** `SmsService` registra los fallos en `CmaErrorLogsTable` de un módulo cliente CMA. Si esa tabla/servicio no está registrada en una instalación genérica, la ruta de registro de errores fallará. Haga que esta dependencia sea opcional si va a desplegar fuera del contexto de cliente original.
- **Recurso al correo electrónico.** Si Primotexto va primero pero el usuario no tiene un teléfono válido, y hay un canal de correo electrónico activo y ordenado después, el código se entrega por correo electrónico con un mensaje explicativo.
- **Teléfono enmascarado en la interfaz.** La pantalla de introducción del código muestra solo una versión enmascarada del teléfono (p. ej. `+3…**…07`).

## Archivos clave

| Aspecto | Ruta |
| --- | --- |
| Arranque del módulo | `vendor/melisplatform/melis-login-2fa-primotexto/src/Module.php` |
| Escuchador `canSend` | `vendor/melisplatform/melis-login-2fa-primotexto/src/Listener/MelisCoreCanSendListener.php` |
| Escuchador `sendUserCode` | `vendor/melisplatform/melis-login-2fa-primotexto/src/Listener/MelisCoreSendUserCodeListener.php` |
| Servicio de la API de SMS | `vendor/melisplatform/melis-login-2fa-primotexto/src/Service/SmsService.php` |
| Plugin de controlador | `vendor/melisplatform/melis-login-2fa-primotexto/src/Controller/Plugin/MelisLogin2faPrimotextoControllerPlugin.php` |
| Brick de React | `vendor/melisplatform/melis-login-2fa-primotexto/ui-react/src/brick.tsx` |
| Manifiesto de React | `vendor/melisplatform/melis-login-2fa-primotexto/public/ui-react/brick.manifest.json` |
| Configuración del módulo | `vendor/melisplatform/melis-login-2fa-primotexto/config/module.config.php` |
| Migración de BD | `vendor/melisplatform/melis-login-2fa-primotexto/install/dbdeploy/` |

Véase también: [MelisLogin2fa](/es/reference/modules/melis-login-2fa) · [MelisLogin2faEmail](/es/reference/modules/melis-login-2fa-email) · [MelisCore](/es/reference/modules/melis-core)
