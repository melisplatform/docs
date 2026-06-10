# MelisLogin2faEmail

> Email delivery channel for the Melis 2FA system — sends the one-time login code by email. Package `melisplatform/melis-login-2fa-email`.

## Purpose

MelisLogin2faEmail is the **default, bundled** email channel for [MelisLogin2fa](/reference/modules/melis-login-2fa). It handles the `canSend` and `sendUserCode` events fired by the 2FA core, deciding whether a user can be reached by email and then mailing the 6-digit code. Because the core requires this module and this module requires the core, they install as a pair — email is always the available fallback channel.

## Enable it

This module is required by `melis-login-2fa` and installs automatically alongside it. No separate entry in the module load file is needed beyond loading `MelisLogin2fa`.

To activate the email channel, configure it in the BO:

**System config → Other config → 2FA → Sites & modules** — select **email** as the delivery channel.

The platform's BO email must also be active (configured via MelisCore email settings).

## Key services

| Service alias | Role |
| --- | --- |
| `Melis2faBOEmailService` | Extends `MelisCoreBOEmailService`; overrides `sendBoEmailByCode()` / `sendEmail()` to set the correct envelope sender (`email_from` instead of the recipient address). Loads the email template by codename, substitutes `[TAG]` placeholders, wraps it in the layout, and sends via `Laminas\Mail`. |
| `MelisLogin2faEmailControllerPlugin` | Controller plugin — entry point called by both listeners; exposes `canSend($userData)` and `sendUserCode($user, $code)`. |

## Listeners

| Listener | Event | Behaviour |
| --- | --- | --- |
| `MelisCoreCanSendListener` | `canSend` | Returns `['melis-login-2fa-email' => <bool>]` — `true` when the user has a usable `usr_email`. |
| `MelisCoreSendUserCodeListener` | `sendUserCode` | Acts only when not already sent **and** this channel is first in `orderedModules`. Reuses or creates a `melis_core_login_2fa_codes` row, resolves the locale, sends the code, then sets `sent=true`, calls `stopPropagation`, and returns `['sent'=>true, 'hash'=>…, 'message'=>'<sent-to> '.maskEmail($email)]`. |

## Configuration

Declared under the `melis_login_2fa_email` config key:

| Key | Default | Description |
| --- | --- | --- |
| `email_from` | `noreply@melistechnology.com` | Envelope sender address |
| `from_name` | `Melis Platform` | Sender display name |
| `reply_to` | — | Reply-to address |

## Database tables

| Table | Holds |
| --- | --- |
| `melis_core_login_2fa_codes` | One-time codes (shared with the 2FA core); rows are reused while still valid or created fresh by `MelisLogin2faService::generate2faCode()`. |

## Key files

| Concern | Path |
| --- | --- |
| Module bootstrap | `vendor/melisplatform/melis-login-2fa-email/src/Module.php` |
| Module config | `vendor/melisplatform/melis-login-2fa-email/config/module.config.php` |
| `canSend` listener | `vendor/melisplatform/melis-login-2fa-email/src/Listener/MelisCoreCanSendListener.php` |
| `sendUserCode` listener | `vendor/melisplatform/melis-login-2fa-email/src/Listener/MelisCoreSendUserCodeListener.php` |
| Controller plugin | `vendor/melisplatform/melis-login-2fa-email/src/Controller/Plugin/MelisLogin2faEmailControllerPlugin.php` |
| Email service | `vendor/melisplatform/melis-login-2fa-email/src/Service/Melis2faBOEmailService.php` |

## Metadata

| Item | Value |
| --- | --- |
| Package | `melisplatform/melis-login-2fa-email` |
| Type | `melisplatform-module` · category `core` · `dbdeploy: true` |
| Namespace | `MelisLogin2faEmail\` (PSR-4 → `src/`) |
| Requires | `melisplatform/melis-login-2fa` `^5.3` · PHP `^8.1\|^8.3` |

See also: [MelisLogin2fa](/reference/modules/melis-login-2fa) · [MelisCore](/reference/modules/melis-core)
