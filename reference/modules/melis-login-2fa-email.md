# MelisLogin2faEmail

> Email delivery channel for the Melis 2FA system — sends the one-time login code by email. Package `melisplatform/melis-login-2fa-email`.

## Purpose

MelisLogin2faEmail is the **default, bundled** email channel for [MelisLogin2fa](/reference/modules/melis-login-2fa). It handles the `canSend` and `sendUserCode` events fired by the 2FA core, deciding whether a user can be reached by email and then mailing the 6-digit code. Because the core requires this module and this module requires the core, they install as a pair — email is always the available fallback channel.

## React back-office presence

This module is a **2FA method plugin**, not a tool: it has **no React brick, no `react-api` route, no capabilities and no UI of its own**. It never appears as an entry in the `/melis-react` sidebar or menu. Instead, the email channel surfaces only *inside* screens owned by MelisLogin2fa / MelisCore:

- **As a selectable, orderable 2FA method** in the **2FA settings section** the core contributes to the *Other config* tool. Admins enable it and set its order there; the order decides which active channel is tried first.
- **As the email + code-entry step at login** — when 2FA is on and email is the chosen channel, the login flow emails the 6-digit code and shows the code-entry screen. The confirmation displays a **masked** address (e.g. `jo****@…`).

There are **no React screenshots** for this module, because it has no screen of its own.

## Enable it

This module is required by `melis-login-2fa` and installs automatically alongside it. No separate entry in the module load file is needed beyond loading `MelisLogin2fa`.

To activate the email channel, open the 2FA settings surfaced in the React back-office:

**System config → Other config → 2FA** — enable **Email** as a delivery method and set its order among the active channels.

The platform's BO email must also be active (configured via MelisCore email settings).

## Key services

| Service alias | Role |
| --- | --- |
| `Melis2faBOEmailService` | Extends `MelisCoreBOEmailService`; overrides `sendBoEmailByCode()` / `sendEmail()` to set the correct envelope sender (`email_from` instead of the recipient address). Loads the email template by codename, substitutes `[TAG]` placeholders, wraps it in the layout, and sends via `Laminas\Mail`. |
| `MelisLogin2faEmailControllerPlugin` | Controller plugin — entry point called by both listeners; exposes `canSend($userData)` and `sendUserCode($user, $code)`. |

## Listeners

| Listener | Event | Behaviour |
| --- | --- | --- |
| `MelisCoreCanSendListener` | `canSend` | Returns `['melis-login-2fa-email' => <bool>]` — `true` when the user has a usable `usr_email` (non-empty and passing `Laminas\Validator\EmailAddress`). |
| `MelisCoreSendUserCodeListener` | `sendUserCode` | Acts only when not already sent **and** this channel is first in `orderedModules` (`orderedModules[0] === 'melis-login-2fa-email'`). Reuses or creates a `melis_core_login_2fa_codes` row, resolves the locale, sends the code, then sets `sent=true`, calls `stopPropagation`, and returns `['sent'=>true, 'hash'=>…, 'message'=>'<sent-to> '.maskEmail($email)]`. |

The identifier used throughout method selection and ordering is the string `melis-login-2fa-email`.

## Locale and recovery link

`sendUserCode()` resolves the recipient's **locale** (the recipient's own `usr_lang_id` in BO context, with session-locale fallback; the site main-page language in FO context) so the email subject and body are in the recipient's language.

The email's *forgot-password* link adapts to the back-office the user came from: a BO user who requested their code **from the React shell** gets the link pointed at **`/melis-react/forgot-password`** instead of the legacy `/melis/lost-password`. This is gated by `($user['ui_origin'] ?? null) === 'react'`, where `ui_origin` is derived (Referer-based, defaulting to `'legacy'`) by the core's `Login2faController::request2faCodeAction()`. Nothing else in the flow is React-specific.

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
| React presence | None — no brick, no `react-api`, no capabilities, no UI |

See also: [MelisLogin2fa](/reference/modules/melis-login-2fa) · [MelisCore](/reference/modules/melis-core)
