# MelisLogin2fa

> Two-factor authentication core / orchestrator for Melis logins — after username + password it requires a one-time code and delegates delivery to pluggable channel modules. Package `melisplatform/melis-login-2fa`.

## Purpose

MelisLogin2fa is the **2FA orchestrator** for Melis. After a user passes username/password, it intercepts the login (via `melis_core_auth_pre_success`), checks whether 2FA is active for the current platform and site/module, picks a delivery channel, and holds the session un-finalised until a valid 6-digit code is entered. It does **not** send the code itself — delivery is delegated to pluggable channel modules (email, SMS) via the `canSend` / `sendUserCode` event contract. The bundled email channel (`melis-login-2fa-email`) is a required dependency and is always available as a locked fallback.

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisLogin2fa',
];
```

`melisplatform/melis-login-2fa-email` is a required dependency and must also be loaded (it installs as a pair with this module). PHP `^8.1|^8.3`.

## In the React back-office

This module ships a **contribution-only brick** — it has **no left-menu tool and no route of its own**. Instead it registers an `OtherConfigSection` that MelisCore's native **Other config** page renders after its own cards. You find 2FA at **System configuration → Other config**, as a **"Two-factor authentication (2FA)"** card at the bottom. The card appears only when the module is active (discovered via `GET /melis/react-api/react-modules`, then the bundle is prefetched and evaluated at boot).

![The "Two-factor authentication (2FA)" card inside the React Other config tool: the "Melis, sites & other modules" block with target tabs, an Activate 2FA switch and the delivery-order list, plus the "Per environment" block with a per-platform Activate 2FA switch](/screenshots/react/melis-login-2fa/melislogin2fa-tooloverride-otherconfig-tab-2fa.png)

The card has two blocks:

| Block | What it controls |
| --- | --- |
| **Melis, sites & other modules** | A left tab column of targets (**Melis Platform BO**, plus each **site** when MelisCms is active). For the selected target: an **Activate 2FA** switch and a **"Delivery order (drag to reorder)"** list. **Default BO Email** is pinned (Default tag + mail icon, always active, can't be toggled off). Other methods (e.g. **Primotexto**/SMS) have an on/off switch. Drag rows to set the priority/fallback chain. |
| **Per environment** | A tab column of platforms (**local**, **prod** …), each with its own **Activate 2FA** switch that writes `plf_2fa_active`. |

Every switch, toggle and reorder **saves immediately**. 2FA only runs when both a target and the current environment are active. The React section carries no advanced-rights (capability) declaration — reaching it already requires access to the Other config tool.

![The "Delivery order (drag to reorder)" method list: Default BO Email (Default tag + mail icon, locked and always active) above Primotexto (on/off switch); drag the grip handle to set the priority/fallback chain](/screenshots/react/melis-login-2fa/melislogin2fa-tooloverride-otherconfig-tab-2fa-order.png)

The **login challenge itself is not a React brick**: when 2FA applies, the login is gated on a standalone code-entry page served by `Login2faController` (the same page for `/melis` and `/melis-react`). The user sees the masked target (e.g. `jo****@…`), enters the 6-digit code, and can **Resend** after a cooldown. Wrong codes are limited, too many failures lock the account, and codes expire after 10 minutes.

## Key services

| Service alias | Role |
| --- | --- |
| `MelisLogin2faService` | Generates the 6-digit code (`generate2faCode()`), a 64-hex tracking hash (`generateHash()`), and validity timestamps (`getValidityDate($minutes)`). |
| `MelisLogin2faConfigService` | Reads and writes per-BO / per-site 2FA config. Key methods: `getModuleConfig()`, `getAllModuleConfigs()`, `getAllSiteConfigs()`, `getAvailable2faModules()` (fires `melis_login_2fa.collect_available_modules`), `mergeAvailableModulesWithConfig()`, `filterOnlyInstalledModules()`, `saveItem()`. |
| `MelisLogin2faTranslationService` | Locale-aware translation helpers (`translateByLocale`, `boTranslate`, …) so code-delivery messages match the user's language. |
| `MelisLogin2faControllerPlugin` | Exposes `verifyUserCode($userId, $code)` — purges expired codes, enforces the try limit, locks the account on too many failures, clears the record on success. |
| `MelisLogin2faVerifierPlugin` (alias `melisLogin2faVerifier`) | Gate plugin — keeps the session un-finalised until a valid code is submitted. |

## React API

Routes live in **`config/react-api.php`** (merged via `Module::getConfig()` under MelisReactApi's `melis-react-api` route). Controller **`MelisLogin2faReactApiSettingsController`** (invokable alias `MelisLogin2faReactApiSettings`), all under `/melis/react-api/login2fa-settings`, contract `{ success, data, error }`.

| Method & URL | Purpose |
| --- | --- |
| `GET /melis/react-api/login2fa-settings` | All settings → `{ moduleConfigs[], sites[], siteConfigs[], platforms[] }`. Each row's `module_list` is passed through `mergeAvailableModulesWithConfig()` so a never-saved row still lists every installed method. Site rows only if MelisCms is active. |
| `POST /melis/react-api/login2fa-settings/save-config` | Save one `melis_core_login_2fa_config` row: `{ mcl2cf_id?, mcl2cf_module_name, mcl2cf_site_id, mcl2cf_activate_2fa, module_list[] }` → delegates to `MelisLogin2faConfigService::saveItem()`. |
| `POST /melis/react-api/login2fa-settings/save-platform` | Save one platform's flag: `{ plf_id, plf_2fa_active }`. Writes `MelisCoreTablePlatform`; `422` if `plf_id` missing. |

This react-api is a thin JSON mirror of the legacy Other-config tabs — same rows, same `saveItem`, JSON instead of rendered phtml. Actions are gated by **authentication only** (`denyUnlessAuthenticated()`, `401` otherwise); the module ships **no `config/react.capabilities.php`** and declares no advanced rights, so do not invent capability strings for it.

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
| `melis_login_2fa.collect_available_modules` | core → channels | Channels append `['module'=>'…', 'label'=>'…']` so they appear in the admin method list. |
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
| Module bootstrap | `vendor/melisplatform/melis-login-2fa/src/Module.php` (`getConfig()` merges `react-api.php`) |
| Module config (services, routes, tunables) | `vendor/melisplatform/melis-login-2fa/config/module.config.php` |
| React-api routes | `vendor/melisplatform/melis-login-2fa/config/react-api.php` |
| Gate-bypass route list | `vendor/melisplatform/melis-login-2fa/config/excluded.routes.php` |
| Main login listener (`melis_core_auth_pre_success`) | `vendor/melisplatform/melis-login-2fa/src/Listener/MelisLogin2faMainListener.php` |
| Config-save listener | `vendor/melisplatform/melis-login-2fa/src/Listener/MelisLogin2faListener.php` |
| Resend listener | `vendor/melisplatform/melis-login-2fa/src/Listener/MelisLogin2faRequestCodeListener.php` |
| React-api controller | `vendor/melisplatform/melis-login-2fa/src/Controller/ReactApi/MelisLogin2faReactApiSettingsController.php` |
| Controller (verify routes) | `vendor/melisplatform/melis-login-2fa/src/Controller/Login2faController.php` |
| Verify plugin | `vendor/melisplatform/melis-login-2fa/src/Controller/Plugin/MelisLogin2faControllerPlugin.php` |
| Gate (verifier) plugin | `vendor/melisplatform/melis-login-2fa/src/Controller/Plugin/MelisLogin2faVerifierPlugin.php` |
| Core service | `vendor/melisplatform/melis-login-2fa/src/Service/MelisLogin2faService.php` |
| Config service | `vendor/melisplatform/melis-login-2fa/src/Service/MelisLogin2faConfigService.php` |
| Codes table | `vendor/melisplatform/melis-login-2fa/src/Model/Tables/MelisLogin2faCodesTable.php` |
| Config table | `vendor/melisplatform/melis-login-2fa/src/Model/Tables/MelisLogin2faConfigTable.php` |
| React brick source | `vendor/melisplatform/melis-login-2fa/ui-react/src/` (`brick.tsx`, `Login2faOtherConfigSection.tsx`) |
| Built brick + manifest | `vendor/melisplatform/melis-login-2fa/public/ui-react/brick.js` · `brick.manifest.json` |
| DB deploy | `vendor/melisplatform/melis-login-2fa/install/dbdeploy/` |

## Metadata

| Item | Value |
| --- | --- |
| Package | `melisplatform/melis-login-2fa` |
| Type | `melisplatform-module` · category `core` · `dbdeploy: true` |
| Namespace | `MelisLogin2fa\` (PSR-4 → `src/`) · module name `MelisLogin2fa` |
| React brick | Contribution-only (id `melis-login-2fa`, `route`/`forwardKey`/`melisKey` = `null`); registers an `OtherConfigSection` |
| Requires | `melisplatform/melis-login-2fa-email` `^5.3` · PHP `^8.1\|^8.3` |

See also: [MelisLogin2faEmail](/reference/modules/melis-login-2fa-email) · [MelisCore](/reference/modules/melis-core)
