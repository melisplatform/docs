# MelisLogin2fa

> Núcleo / orquestador de autenticación de doble factor para los inicios de sesión de Melis — tras el nombre de usuario y la contraseña, exige un código de un solo uso y delega su envío a módulos de canal conectables. Paquete `melisplatform/melis-login-2fa`.

## Propósito

MelisLogin2fa es el **orquestador de 2FA** de Melis. Después de que un usuario supere el nombre de usuario/contraseña, intercepta el inicio de sesión (mediante `melis_core_auth_pre_success`), comprueba si la 2FA está activa para la plataforma y el sitio/módulo actuales, elige un canal de envío y mantiene la sesión sin finalizar hasta que se introduce un código válido de 6 dígitos. **No** envía el código por sí mismo — el envío se delega a módulos de canal conectables (correo electrónico, SMS) mediante el contrato de eventos `canSend` / `sendUserCode`. El canal de correo electrónico incluido (`melis-login-2fa-email`) es una dependencia obligatoria y siempre está disponible como método de reserva bloqueado.

## Activarlo

Añade a `config/melis.module.load.php`:

```php
return [
    'MelisLogin2fa',
];
```

`melisplatform/melis-login-2fa-email` es una dependencia obligatoria y también debe cargarse (se instala como pareja de este módulo). PHP `^8.1|^8.3`.

## En el back-office React

Este módulo incorpora un **brick de solo contribución** — **no tiene herramienta en el menú izquierdo ni ruta propia**. En su lugar, registra una `OtherConfigSection` que la página nativa **Other config** de MelisCore renderiza después de sus propias tarjetas. Encontrarás la 2FA en **System configuration → Other config**, como una tarjeta **"Two-factor authentication (2FA)"** al final. La tarjeta solo aparece cuando el módulo está activo (se detecta mediante `GET /melis/react-api/react-modules`, tras lo cual el bundle se precarga y se evalúa durante el arranque).

![La tarjeta "Two-factor authentication (2FA)" dentro de la herramienta React Other config: el bloque "Melis, sites & other modules" con pestañas de destino, un interruptor Activate 2FA y la lista de orden de envío, más el bloque "Per environment" con un interruptor Activate 2FA por plataforma](/screenshots/react/melis-login-2fa/melislogin2fa-tooloverride-otherconfig-tab-2fa.png)

La tarjeta tiene dos bloques:

| Bloque | Qué controla |
| --- | --- |
| **Melis, sites & other modules** | Una columna de pestañas a la izquierda con los destinos (**Melis Platform BO**, más cada **sitio** cuando MelisCms está activo). Para el destino seleccionado: un interruptor **Activate 2FA** y una lista **"Delivery order (drag to reorder)"**. **Default BO Email** está fijado (etiqueta Default + icono de correo, siempre activo, no se puede desactivar). Los demás métodos (p. ej. **Primotexto**/SMS) tienen un interruptor de encendido/apagado. Arrastra las filas para establecer la cadena de prioridad/reserva. |
| **Per environment** | Una columna de pestañas con las plataformas (**local**, **prod** …), cada una con su propio interruptor **Activate 2FA** que escribe `plf_2fa_active`. |

Cada interruptor, conmutador y reordenación **se guarda de inmediato**. La 2FA solo se ejecuta cuando tanto un destino como el entorno actual están activos. La sección React no declara derechos avanzados (capacidades) — llegar a ella ya requiere acceso a la herramienta Other config.

![La lista de métodos "Delivery order (drag to reorder)": Default BO Email (etiqueta Default + icono de correo, bloqueado y siempre activo) por encima de Primotexto (interruptor de encendido/apagado); arrastra el asa para establecer la cadena de prioridad/reserva](/screenshots/react/melis-login-2fa/melislogin2fa-tooloverride-otherconfig-tab-2fa-order.png)

El **propio desafío de inicio de sesión no es un brick React**: cuando se aplica la 2FA, el inicio de sesión queda condicionado por una página autónoma de introducción de código servida por `Login2faController` (la misma página para `/melis` y `/melis-react`). El usuario ve el destino enmascarado (p. ej. `jo****@…`), introduce el código de 6 dígitos y puede **Resend** tras un período de espera. Los códigos incorrectos están limitados, demasiados fallos bloquean la cuenta y los códigos caducan a los 10 minutos.

## Servicios clave

| Alias del servicio | Función |
| --- | --- |
| `MelisLogin2faService` | Genera el código de 6 dígitos (`generate2faCode()`), un hash de seguimiento de 64 hexadecimales (`generateHash()`) y las marcas de tiempo de validez (`getValidityDate($minutes)`). |
| `MelisLogin2faConfigService` | Lee y escribe la configuración de 2FA por BO / por sitio. Métodos clave: `getModuleConfig()`, `getAllModuleConfigs()`, `getAllSiteConfigs()`, `getAvailable2faModules()` (dispara `melis_login_2fa.collect_available_modules`), `mergeAvailableModulesWithConfig()`, `filterOnlyInstalledModules()`, `saveItem()`. |
| `MelisLogin2faTranslationService` | Ayudantes de traducción según la configuración regional (`translateByLocale`, `boTranslate`, …) para que los mensajes de envío de códigos coincidan con el idioma del usuario. |
| `MelisLogin2faControllerPlugin` | Expone `verifyUserCode($userId, $code)` — purga los códigos caducados, aplica el límite de intentos, bloquea la cuenta tras demasiados fallos y borra el registro cuando tiene éxito. |
| `MelisLogin2faVerifierPlugin` (alias `melisLogin2faVerifier`) | Plugin de control — mantiene la sesión sin finalizar hasta que se envía un código válido. |

## API React

Las rutas residen en **`config/react-api.php`** (fusionadas mediante `Module::getConfig()` bajo la ruta `melis-react-api` de MelisReactApi). Controlador **`MelisLogin2faReactApiSettingsController`** (alias invocable `MelisLogin2faReactApiSettings`), todo bajo `/melis/react-api/login2fa-settings`, contrato `{ success, data, error }`.

| Método y URL | Propósito |
| --- | --- |
| `GET /melis/react-api/login2fa-settings` | Toda la configuración → `{ moduleConfigs[], sites[], siteConfigs[], platforms[] }`. El `module_list` de cada fila pasa por `mergeAvailableModulesWithConfig()`, de modo que una fila nunca guardada sigue listando todos los métodos instalados. Las filas de sitio solo si MelisCms está activo. |
| `POST /melis/react-api/login2fa-settings/save-config` | Guarda una fila `melis_core_login_2fa_config`: `{ mcl2cf_id?, mcl2cf_module_name, mcl2cf_site_id, mcl2cf_activate_2fa, module_list[] }` → delega en `MelisLogin2faConfigService::saveItem()`. |
| `POST /melis/react-api/login2fa-settings/save-platform` | Guarda el indicador de una plataforma: `{ plf_id, plf_2fa_active }`. Escribe `MelisCoreTablePlatform`; `422` si falta `plf_id`. |

Esta react-api es un fino espejo JSON de las pestañas heredadas de Other config — mismas filas, mismo `saveItem`, JSON en lugar de phtml renderizado. Las acciones están protegidas **solo por autenticación** (`denyUnlessAuthenticated()`, `401` en caso contrario); el módulo **no incluye ningún `config/react.capabilities.php`** ni declara derechos avanzados, así que no inventes cadenas de capacidad para él.

## Tablas de la base de datos

| Tabla | Contiene |
| --- | --- |
| `melis_core_login_2fa_codes` | Códigos de un solo uso: id de usuario, correo electrónico, tipo (`melis-backoffice` o id de sitio), el código de 6 dígitos, el hash de sesión, la fecha de caducidad y el contador de intentos fallidos con marcas de tiempo (`mcl2c_try`, `mcl2c_try1/2/3_date`). |
| `melis_core_login_2fa_config` | Filas de configuración por BO / por sitio: `mcl2cf_module_name` o `mcl2cf_site_id`, `mcl2cf_activate_2fa`, `mcl2cf_module_list` (lista JSON ordenada de canales). |

`melis_core_platform` gana una columna `plf_2fa_active` (añadida por el dbdeploy del módulo).

## Parámetros de configuración ajustables

Declarados bajo la clave de configuración `melis_login_2fa`:

| Clave | Valor por defecto | Descripción |
| --- | --- | --- |
| `max_tries` | `3` | Intentos de código fallidos antes de bloquear la cuenta (`usr_status = 0`). |
| `code_validity_minutes` | `10` | Minutos hasta que caduca un código. |
| `request_code_cooldown_seconds` | `60` | Segundos mínimos entre solicitudes de reenvío. |

## El contrato de eventos de canal

El núcleo nunca llama a un canal directamente — dispara eventos que los canales responden. Para añadir un método de envío, implementa listeners para:

| Evento | Dirección | Propósito |
| --- | --- | --- |
| `melis_login_2fa.collect_available_modules` | núcleo → canales | Los canales añaden `['module'=>'…', 'label'=>'…']` para aparecer en la lista de métodos del administrador. |
| `canSend` | núcleo → canales | Cada canal devuelve `['<module-name>' => bool]` indicando si puede alcanzar al usuario. |
| `sendUserCode` | núcleo → canales | El primer canal de `orderedModules` que puede enviar crea/reutiliza el código y lo entrega, luego establece `sent=true` y llama a `stopPropagation`. |

## Ejemplo

```php
// Building a custom delivery channel — attach these two listeners in your module:

'canSend' => fn($e) => ['my-channel' => $canIReach($e->getParam('user'))],

'sendUserCode' => function ($e) {
    if (!empty($e->getParam('sent'))) return;                              // already sent
    if (($e->getParam('orderedModules')[0] ?? null) !== 'my-channel') return; // not my turn

    // Create/reuse the code via the core's service + table:
    // MelisLogin2faService::generate2faCode() + MelisLogin2faCodesTable

    // Deliver via your transport, then signal completion:
    $e->setParam('sent', true);
    $e->stopPropagation(true);
    return ['sent' => true, 'hash' => $hash, 'message' => 'sent to ' . $maskedTarget];
},

// Also respond to collect_available_modules so the admin can enable/order your channel.
```

## Archivos clave

| Aspecto | Ruta |
| --- | --- |
| Arranque del módulo | `vendor/melisplatform/melis-login-2fa/src/Module.php` (`getConfig()` fusiona `react-api.php`) |
| Configuración del módulo (servicios, rutas, ajustables) | `vendor/melisplatform/melis-login-2fa/config/module.config.php` |
| Rutas react-api | `vendor/melisplatform/melis-login-2fa/config/react-api.php` |
| Lista de rutas que omiten el control | `vendor/melisplatform/melis-login-2fa/config/excluded.routes.php` |
| Listener principal de inicio de sesión (`melis_core_auth_pre_success`) | `vendor/melisplatform/melis-login-2fa/src/Listener/MelisLogin2faMainListener.php` |
| Listener de guardado de configuración | `vendor/melisplatform/melis-login-2fa/src/Listener/MelisLogin2faListener.php` |
| Listener de reenvío | `vendor/melisplatform/melis-login-2fa/src/Listener/MelisLogin2faRequestCodeListener.php` |
| Controlador react-api | `vendor/melisplatform/melis-login-2fa/src/Controller/ReactApi/MelisLogin2faReactApiSettingsController.php` |
| Controlador (rutas de verificación) | `vendor/melisplatform/melis-login-2fa/src/Controller/Login2faController.php` |
| Plugin de verificación | `vendor/melisplatform/melis-login-2fa/src/Controller/Plugin/MelisLogin2faControllerPlugin.php` |
| Plugin de control (verifier) | `vendor/melisplatform/melis-login-2fa/src/Controller/Plugin/MelisLogin2faVerifierPlugin.php` |
| Servicio del núcleo | `vendor/melisplatform/melis-login-2fa/src/Service/MelisLogin2faService.php` |
| Servicio de configuración | `vendor/melisplatform/melis-login-2fa/src/Service/MelisLogin2faConfigService.php` |
| Tabla de códigos | `vendor/melisplatform/melis-login-2fa/src/Model/Tables/MelisLogin2faCodesTable.php` |
| Tabla de configuración | `vendor/melisplatform/melis-login-2fa/src/Model/Tables/MelisLogin2faConfigTable.php` |
| Fuente del brick React | `vendor/melisplatform/melis-login-2fa/ui-react/src/` (`brick.tsx`, `Login2faOtherConfigSection.tsx`) |
| Brick compilado + manifiesto | `vendor/melisplatform/melis-login-2fa/public/ui-react/brick.js` · `brick.manifest.json` |
| Despliegue de BD | `vendor/melisplatform/melis-login-2fa/install/dbdeploy/` |

## Metadatos

| Elemento | Valor |
| --- | --- |
| Paquete | `melisplatform/melis-login-2fa` |
| Tipo | `melisplatform-module` · categoría `core` · `dbdeploy: true` |
| Espacio de nombres | `MelisLogin2fa\` (PSR-4 → `src/`) · nombre del módulo `MelisLogin2fa` |
| Brick React | Solo contribución (id `melis-login-2fa`, `route`/`forwardKey`/`melisKey` = `null`); registra una `OtherConfigSection` |
| Requiere | `melisplatform/melis-login-2fa-email` `^5.3` · PHP `^8.1\|^8.3` |

Consulta también: [MelisLogin2faEmail](/es/reference/modules/melis-login-2fa-email) · [MelisCore](/es/reference/modules/melis-core)
