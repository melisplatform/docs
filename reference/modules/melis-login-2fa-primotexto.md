# MelisLogin2faPrimotexto

> SMS delivery channel for the Melis 2FA system via the Primotexto gateway. Package `melisplatform/melis-login-2fa-primotexto`.

## Purpose

MelisLogin2faPrimotexto is an optional 2FA channel that sends the one-time login code by text message through the **Primotexto** SMS API. It plugs into the core `MelisLogin2fa` event contract (`canSend` / `sendUserCode`). When ordered first among active channels and the user has a valid phone number, it delivers the code by SMS; if no valid phone is found but an email channel is also active, it falls back to email and notifies the user accordingly.

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisLogin2faPrimotexto',
];
```

Requires `melisplatform/melis-login-2fa` (`^5.3`) and PHP `^8.1|^8.3`. The core module `MelisLogin2fa` must be loaded first.

Once loaded, enable **SMS (Primotexto)** in **System config → Other config → 2FA → Sites & modules** and order it first to make it the primary channel. Supply the Primotexto API credentials under the `melis_login_2fa_primotexto` config key (see [Configuration](#configuration)).

## Configuration

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

> **Warning.** The committed `config/module.config.php` ships a literal `api_key` placeholder. Always override it in a local/environment-specific config file and rotate any real key that may have been committed.

## Key services

| Service alias | Role |
| --- | --- |
| `SmsService` | Calls the Primotexto HTTP API to deliver the OTP SMS; normalises French `0…` numbers to `+33…`; logs curl/HTTP failures to `CmaErrorLogsTable` |
| `MelisLogin2faPrimotextoControllerPlugin` | Controller plugin exposing `canSend($userData)` and `sendUserCode($user, $code)`; drives `SmsService` |

## Event listeners

| Listener | Event | Behaviour |
| --- | --- | --- |
| `MelisCoreCanSendListener` | `canSend` | Returns `['melis-login-2fa-primotexto' => bool]`; if unable to send but email is next in order, stashes a `twofa_fallback_message` in the `melis_login_2fa` session |
| `MelisCoreSendUserCodeListener` | `sendUserCode` | Acts only when not already sent and this channel is `orderedModules[0]`; reuses/creates the `melis_core_login_2fa_codes` row, sends via `SmsService`, sets `sent=true`, calls `stopPropagation` |

## Database tables

| Table | Holds |
| --- | --- |
| `melis_core_user` | Gains a nullable `usr_phone` column (added by this module's `dbdeploy`) — the phone number OTP codes are sent to |
| `melis_core_login_2fa_codes` | OTP codes (owned by `MelisLogin2fa` core; this channel reuses/creates rows via `MelisLogin2faService` + `MelisLogin2faCodesTable`) |

## Example

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

## Caveats

- **`CmaErrorLogsTable` dependency.** `SmsService` logs failures to `CmaErrorLogsTable` from a CMA client module. If that table/service is not registered in a generic install, the error-logging path will fail. Make this dependency optional if deploying outside the original client context.
- **Fallback to email.** If Primotexto is first but the user has no valid phone, and an email channel is active and ordered after, the code is delivered by email with an explanatory message.
- **Masked phone in UI.** The code-entry screen shows only a masked version of the phone (e.g. `+3…**…07`).

## Key files

| Concern | Path |
| --- | --- |
| Module bootstrap | `vendor/melisplatform/melis-login-2fa-primotexto/src/Module.php` |
| `canSend` listener | `vendor/melisplatform/melis-login-2fa-primotexto/src/Listener/MelisCoreCanSendListener.php` |
| `sendUserCode` listener | `vendor/melisplatform/melis-login-2fa-primotexto/src/Listener/MelisCoreSendUserCodeListener.php` |
| SMS API service | `vendor/melisplatform/melis-login-2fa-primotexto/src/Service/SmsService.php` |
| Controller plugin | `vendor/melisplatform/melis-login-2fa-primotexto/src/Controller/Plugin/MelisLogin2faPrimotextoControllerPlugin.php` |
| Module config | `vendor/melisplatform/melis-login-2fa-primotexto/config/module.config.php` |
| DB migration | `vendor/melisplatform/melis-login-2fa-primotexto/install/dbdeploy/` |

See also: [MelisLogin2fa](/reference/modules/melis-login-2fa) · [MelisLogin2faEmail](/reference/modules/melis-login-2fa-email) · [MelisCore](/reference/modules/melis-core)
