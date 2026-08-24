# MelisLogin2fa

> Core / orchestratore dell'autenticazione a due fattori per i login Melis — dopo nome utente + password richiede un codice monouso e delega la consegna a moduli di canale collegabili. Pacchetto `melisplatform/melis-login-2fa`.

## Scopo

MelisLogin2fa è l'**orchestratore 2FA** di Melis. Dopo che un utente ha superato nome utente/password, intercetta il login (tramite `melis_core_auth_pre_success`), verifica se il 2FA è attivo per la piattaforma corrente e per il sito/modulo, sceglie un canale di consegna e mantiene la sessione non finalizzata finché non viene inserito un codice valido a 6 cifre. **Non** invia il codice da sé — la consegna è delegata a moduli di canale collegabili (email, SMS) tramite il contratto di eventi `canSend` / `sendUserCode`. Il canale email incluso (`melis-login-2fa-email`) è una dipendenza obbligatoria ed è sempre disponibile come fallback bloccato.

## Come abilitarlo

Aggiungi a `config/melis.module.load.php`:

```php
return [
    'MelisLogin2fa',
];
```

`melisplatform/melis-login-2fa-email` è una dipendenza obbligatoria e deve essere caricato anch'esso (si installa in coppia con questo modulo). PHP `^8.1|^8.3`.

## Nel back-office React

Questo modulo fornisce un **brick solo di contributo** — **non ha uno strumento nel menu di sinistra né una route propria**. Al suo posto registra una `OtherConfigSection` che la pagina nativa **Other config** di MelisCore visualizza dopo le proprie schede. Trovi il 2FA in **System configuration → Other config**, come scheda **"Two-factor authentication (2FA)"** in fondo. La scheda compare solo quando il modulo è attivo (individuato tramite `GET /melis/react-api/react-modules`, poi il bundle viene precaricato e valutato all'avvio).

![La scheda "Two-factor authentication (2FA)" all'interno dello strumento React Other config: il blocco "Melis, sites & other modules" con le schede dei target, un interruttore Activate 2FA e la lista dell'ordine di consegna, più il blocco "Per environment" con un interruttore Activate 2FA per piattaforma](/screenshots/react/melis-login-2fa/melislogin2fa-tooloverride-otherconfig-tab-2fa.png)

La scheda ha due blocchi:

| Blocco | Cosa controlla |
| --- | --- |
| **Melis, sites & other modules** | Una colonna di schede a sinistra con i target (**Melis Platform BO**, più ogni **sito** quando MelisCms è attivo). Per il target selezionato: un interruttore **Activate 2FA** e una lista **"Delivery order (drag to reorder)"**. **Default BO Email** è fissato in cima (tag Default + icona mail, sempre attivo, non disattivabile). Gli altri metodi (ad es. **Primotexto**/SMS) hanno un interruttore on/off. Trascina le righe per impostare la catena di priorità/fallback. |
| **Per environment** | Una colonna di schede con le piattaforme (**local**, **prod** …), ciascuna con il proprio interruttore **Activate 2FA** che scrive `plf_2fa_active`. |

Ogni interruttore, toggle e riordino **salva immediatamente**. Il 2FA viene eseguito solo quando sia un target sia l'ambiente corrente sono attivi. La sezione React non contiene alcuna dichiarazione di diritti avanzati (capability) — per raggiungerla è già richiesto l'accesso allo strumento Other config.

![La lista dei metodi "Delivery order (drag to reorder)": Default BO Email (tag Default + icona mail, bloccato e sempre attivo) sopra Primotexto (interruttore on/off); trascina la maniglia per impostare la catena di priorità/fallback](/screenshots/react/melis-login-2fa/melislogin2fa-tooloverride-otherconfig-tab-2fa-order.png)

La **challenge di login stessa non è un brick React**: quando il 2FA si applica, il login è bloccato su una pagina autonoma di inserimento del codice servita da `Login2faController` (la stessa pagina per `/melis` e `/melis-react`). L'utente vede il target mascherato (ad es. `jo****@…`), inserisce il codice a 6 cifre e può usare **Resend** dopo un periodo di attesa. I codici errati sono limitati, troppi errori bloccano l'account e i codici scadono dopo 10 minuti.

## Servizi principali

| Alias del servizio | Ruolo |
| --- | --- |
| `MelisLogin2faService` | Genera il codice a 6 cifre (`generate2faCode()`), un hash di tracciamento a 64 cifre esadecimali (`generateHash()`) e i timestamp di validità (`getValidityDate($minutes)`). |
| `MelisLogin2faConfigService` | Legge e scrive la configurazione 2FA per-BO / per-sito. Metodi chiave: `getModuleConfig()`, `getAllModuleConfigs()`, `getAllSiteConfigs()`, `getAvailable2faModules()` (scatena `melis_login_2fa.collect_available_modules`), `mergeAvailableModulesWithConfig()`, `filterOnlyInstalledModules()`, `saveItem()`. |
| `MelisLogin2faTranslationService` | Helper di traduzione sensibili al locale (`translateByLocale`, `boTranslate`, …) affinché i messaggi di consegna del codice corrispondano alla lingua dell'utente. |
| `MelisLogin2faControllerPlugin` | Espone `verifyUserCode($userId, $code)` — elimina i codici scaduti, applica il limite di tentativi, blocca l'account dopo troppi errori, azzera il record in caso di successo. |
| `MelisLogin2faVerifierPlugin` (alias `melisLogin2faVerifier`) | Plugin di gate — mantiene la sessione non finalizzata finché non viene inviato un codice valido. |

## API React

Le route risiedono in **`config/react-api.php`** (unite tramite `Module::getConfig()` sotto la route `melis-react-api` di MelisReactApi). Controller **`MelisLogin2faReactApiSettingsController`** (alias invocabile `MelisLogin2faReactApiSettings`), tutte sotto `/melis/react-api/login2fa-settings`, contratto `{ success, data, error }`.

| Metodo e URL | Scopo |
| --- | --- |
| `GET /melis/react-api/login2fa-settings` | Tutte le impostazioni → `{ moduleConfigs[], sites[], siteConfigs[], platforms[] }`. Il `module_list` di ogni riga passa attraverso `mergeAvailableModulesWithConfig()`, così una riga mai salvata elenca comunque ogni metodo installato. Le righe dei siti solo se MelisCms è attivo. |
| `POST /melis/react-api/login2fa-settings/save-config` | Salva una riga `melis_core_login_2fa_config`: `{ mcl2cf_id?, mcl2cf_module_name, mcl2cf_site_id, mcl2cf_activate_2fa, module_list[] }` → delega a `MelisLogin2faConfigService::saveItem()`. |
| `POST /melis/react-api/login2fa-settings/save-platform` | Salva il flag di una piattaforma: `{ plf_id, plf_2fa_active }`. Scrive `MelisCoreTablePlatform`; `422` se `plf_id` manca. |

Questa react-api è un sottile mirror JSON delle tab legacy di Other-config — stesse righe, stesso `saveItem`, JSON invece di phtml renderizzato. Le azioni sono protette dalla **sola autenticazione** (`denyUnlessAuthenticated()`, altrimenti `401`); il modulo **non fornisce alcun `config/react.capabilities.php`** e non dichiara diritti avanzati, quindi non inventare stringhe di capability per esso.

## Tabelle del database

| Tabella | Contiene |
| --- | --- |
| `melis_core_login_2fa_codes` | Codici monouso: id utente, email, tipo (`melis-backoffice` o id sito), il codice a 6 cifre, hash di sessione, data di scadenza e contatore dei tentativi falliti con timestamp (`mcl2c_try`, `mcl2c_try1/2/3_date`). |
| `melis_core_login_2fa_config` | Righe di configurazione per-BO / per-sito: `mcl2cf_module_name` o `mcl2cf_site_id`, `mcl2cf_activate_2fa`, `mcl2cf_module_list` (lista JSON ordinata dei canali). |

`melis_core_platform` acquisisce una colonna `plf_2fa_active` (aggiunta dal dbdeploy del modulo).

## Parametri di configurazione regolabili

Dichiarati sotto la chiave di configurazione `melis_login_2fa`:

| Chiave | Predefinito | Descrizione |
| --- | --- | --- |
| `max_tries` | `3` | Tentativi di codice falliti prima che l'account venga bloccato (`usr_status = 0`). |
| `code_validity_minutes` | `10` | Minuti prima che un codice scada. |
| `request_code_cooldown_seconds` | `60` | Secondi minimi tra le richieste di reinvio. |

## Il contratto di eventi dei canali

Il core non chiama mai un canale direttamente — scatena eventi a cui i canali rispondono. Per aggiungere un metodo di consegna, implementa i listener per:

| Evento | Direzione | Scopo |
| --- | --- | --- |
| `melis_login_2fa.collect_available_modules` | core → canali | I canali aggiungono `['module'=>'…', 'label'=>'…']` così da comparire nella lista dei metodi dell'admin. |
| `canSend` | core → canali | Ogni canale restituisce `['<module-name>' => bool]` per indicare se può raggiungere l'utente. |
| `sendUserCode` | core → canali | Il primo canale in `orderedModules` che può inviare crea/riutilizza il codice e lo consegna, poi imposta `sent=true` e chiama `stopPropagation`. |

## Esempio

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

## File principali

| Ambito | Percorso |
| --- | --- |
| Bootstrap del modulo | `vendor/melisplatform/melis-login-2fa/src/Module.php` (`getConfig()` unisce `react-api.php`) |
| Configurazione del modulo (servizi, route, parametri regolabili) | `vendor/melisplatform/melis-login-2fa/config/module.config.php` |
| Route react-api | `vendor/melisplatform/melis-login-2fa/config/react-api.php` |
| Lista route di bypass del gate | `vendor/melisplatform/melis-login-2fa/config/excluded.routes.php` |
| Listener principale di login (`melis_core_auth_pre_success`) | `vendor/melisplatform/melis-login-2fa/src/Listener/MelisLogin2faMainListener.php` |
| Listener di salvataggio configurazione | `vendor/melisplatform/melis-login-2fa/src/Listener/MelisLogin2faListener.php` |
| Listener di reinvio | `vendor/melisplatform/melis-login-2fa/src/Listener/MelisLogin2faRequestCodeListener.php` |
| Controller react-api | `vendor/melisplatform/melis-login-2fa/src/Controller/ReactApi/MelisLogin2faReactApiSettingsController.php` |
| Controller (route di verifica) | `vendor/melisplatform/melis-login-2fa/src/Controller/Login2faController.php` |
| Plugin di verifica | `vendor/melisplatform/melis-login-2fa/src/Controller/Plugin/MelisLogin2faControllerPlugin.php` |
| Plugin di gate (verifier) | `vendor/melisplatform/melis-login-2fa/src/Controller/Plugin/MelisLogin2faVerifierPlugin.php` |
| Servizio core | `vendor/melisplatform/melis-login-2fa/src/Service/MelisLogin2faService.php` |
| Servizio di configurazione | `vendor/melisplatform/melis-login-2fa/src/Service/MelisLogin2faConfigService.php` |
| Tabella dei codici | `vendor/melisplatform/melis-login-2fa/src/Model/Tables/MelisLogin2faCodesTable.php` |
| Tabella di configurazione | `vendor/melisplatform/melis-login-2fa/src/Model/Tables/MelisLogin2faConfigTable.php` |
| Sorgente del brick React | `vendor/melisplatform/melis-login-2fa/ui-react/src/` (`brick.tsx`, `Login2faOtherConfigSection.tsx`) |
| Brick compilato + manifest | `vendor/melisplatform/melis-login-2fa/public/ui-react/brick.js` · `brick.manifest.json` |
| DB deploy | `vendor/melisplatform/melis-login-2fa/install/dbdeploy/` |

## Metadati

| Voce | Valore |
| --- | --- |
| Pacchetto | `melisplatform/melis-login-2fa` |
| Tipo | `melisplatform-module` · categoria `core` · `dbdeploy: true` |
| Namespace | `MelisLogin2fa\` (PSR-4 → `src/`) · nome del modulo `MelisLogin2fa` |
| Brick React | Solo di contributo (id `melis-login-2fa`, `route`/`forwardKey`/`melisKey` = `null`); registra una `OtherConfigSection` |
| Richiede | `melisplatform/melis-login-2fa-email` `^5.3` · PHP `^8.1\|^8.3` |

Vedi anche: [MelisLogin2faEmail](/it/reference/modules/melis-login-2fa-email) · [MelisCore](/it/reference/modules/melis-core)
