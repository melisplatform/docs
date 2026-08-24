# MelisLogin2fa

> Two-factor authentication core for Melis logins — orchestrates the 2FA flow and gates access until a one-time code is verified. Package `melisplatform/melis-login-2fa`.

## Purpose

MelisLogin2fa is the **2FA orchestrator** for Melis. After a user passes username/password, it intercepts the login (via `melis_core_auth_pre_success`), checks whether 2FA is active for the current platform and site/module, picks a delivery channel, and holds the session un-finalised until a valid 6-digit code is entered. It does **not** send the code itself — delivery is delegated to pluggable channel modules (email, SMS) via the `canSend` / `sendUserCode` event contract. The bundled email channel (`melis-login-2fa-email`) is a required dependency and is always available as a fallback.

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisLogin2fa',
];
```

`melisplatform/melis-login-2fa-email` is a required dependency and must also be loaded (it installs as a pair with this module). PHP `^8.1|^8.3`.

## Key services

| Service alias | Role |
| --- | --- |
| `MelisLogin2faService` | Generates the 6-digit code (`generate2faCode()`), a 64-hex tracking hash (`generateHash()`), and validity timestamps (`getValidityDate($minutes)`). |
| `MelisLogin2faConfigService` | Reads and writes per-BO / per-site 2FA config. Key methods: `getModuleConfig()`, `getAllModuleConfigs()`, `getAllSiteConfigs()`, `getAvailable2faModules()` (fires `melis_login_2fa.collect_available_modules`), `mergeAvailableModulesWithConfig()`, `filterOnlyInstalledModules()`, `saveItem()`. |
| `MelisLogin2faTranslationService` | Locale-aware translation helpers (`translateByLocale`, `boTranslate`, …) used so code delivery messages match the user's language. |
| `MelisLogin2faControllerPlugin` | Exposes `verifyUserCode($userId, $code)` — purges expired codes, enforces the try limit, locks the account on too many failures, and clears the record on success. |
| `MelisLogin2faVerifierPlugin` (alias `melisLogin2faVerifier`) | Gate plugin — keeps the session un-finalised until a valid code has been submitted. |

## Backoffice

2FA is configured under **System configuration → Other Config → 2fa tab** (lock icon). The tab has two sections:

| Section | What it controls |
| --- | --- |
| **2fa for Melis, Sites, and Other Modules** | Per-BO / per-site toggle (`mcl2cf_activate_2fa`) and the ordered delivery-channel list (`mcl2cf_module_list`). Drag to reorder; a ✓ method is active, ✗ is off. Order defines priority and fallback. |
| **2fa activation per environment** | Per-platform (local, preprod, prod …) toggle that writes `plf_2fa_active`. 2FA only runs when the environment flag is active. |

Saving the form flows through `MelisLogin2faListener` on `meliscore_save_other_config` → `MelisLogin2faConfigService::saveItem()`.

## Database tables

| Table | Holds |
| --- | --- |
| `melis_core_login_2fa_codes` | One-time codes: user id, email, type (`melis-backoffice` or site id), the 6-digit code, session hash, expiry date, and failed-attempt counter with timestamps (`mcl2c_try`, `mcl2c_try1/2/3_date`). |
| `melis_core_login_2fa_config` | Per-BO / per-site config rows: `mcl2cf_module_name` or `mcl2cf_site_id`, `mcl2cf_activate_2fa`, `mcl2cf_module_list` (JSON ordered channel list). |

`melis_core_platform` gains a `plf_2fa_active` column (added by the module's dbdeploy).

## Configuration tunables

Declared under the `melis_login_2fa` config key:

| Key | Default | Description |
| --- | --- | --- |
| `max_tries` | `3` | Failed code attempts before the account is locked (`usr_status = 0`). |
| `code_validity_minutes` | `10` | Minutes until a code expires. |
| `request_code_cooldown_seconds` | `60` | Minimum seconds between resend requests. |

## The channel event contract

The core never calls a channel directly — it fires events that channels answer. To add a delivery method, implement listeners for:

| Event | Direction | Purpose |
| --- | --- | --- |
| `melis_login_2fa.collect_available_modules` | core → channels | Channels append `['module'=>'…', 'label'=>'…']` so they appear in the admin list. |
| `canSend` | core → channels | Each channel returns `['<module-name>' => bool]` indicating whether it can reach the user. |
| `sendUserCode` | core → channels | The first channel in `orderedModules` that can send creates/reuses the code and delivers it, then sets `sent=true` and calls `stopPropagation`. |

## Example

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

## Key files

| Concern | Path |
| --- | --- |
| Module bootstrap | `vendor/melisplatform/melis-login-2fa/src/Module.php` |
| Module config (services, routes, tunables) | `vendor/melisplatform/melis-login-2fa/config/module.config.php` |
| Gate-bypass route list | `vendor/melisplatform/melis-login-2fa/config/excluded.routes.php` |
| Main login listener (`melis_core_auth_pre_success`) | `vendor/melisplatform/melis-login-2fa/src/Listener/MelisLogin2faMainListener.php` |
| Config-save listener | `vendor/melisplatform/melis-login-2fa/src/Listener/MelisLogin2faListener.php` |
| Resend listener | `vendor/melisplatform/melis-login-2fa/src/Listener/MelisLogin2faRequestCodeListener.php` |
| Controller (verify routes) | `vendor/melisplatform/melis-login-2fa/src/Controller/Login2faController.php` |
| Verify plugin | `vendor/melisplatform/melis-login-2fa/src/Controller/Plugin/MelisLogin2faControllerPlugin.php` |
| Gate (verifier) plugin | `vendor/melisplatform/melis-login-2fa/src/Controller/Plugin/MelisLogin2faVerifierPlugin.php` |
| Core service | `vendor/melisplatform/melis-login-2fa/src/Service/MelisLogin2faService.php` |
| Config service | `vendor/melisplatform/melis-login-2fa/src/Service/MelisLogin2faConfigService.php` |
| Codes table | `vendor/melisplatform/melis-login-2fa/src/Model/Tables/MelisLogin2faCodesTable.php` |
| Config table | `vendor/melisplatform/melis-login-2fa/src/Model/Tables/MelisLogin2faConfigTable.php` |
| DB deploy | `vendor/melisplatform/melis-login-2fa/install/dbdeploy/` |

## Metadata

| Item | Value |
| --- | --- |
| Package | `melisplatform/melis-login-2fa` |
| Type | `melisplatform-module` · category `core` · `dbdeploy: true` |
| Namespace | `MelisLogin2fa\` (PSR-4 → `src/`) · module name `MelisLogin2fa` |
| Requires | `melisplatform/melis-login-2fa-email` `^5.3` · PHP `^8.1\|^8.3` |

See also: [MelisLogin2faEmail](/legacy/reference/modules/melis-login-2fa-email) · [MelisCore](/legacy/reference/modules/melis-core)
