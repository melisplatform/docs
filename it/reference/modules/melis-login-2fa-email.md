# MelisLogin2faEmail

> Canale di consegna via email per il sistema 2FA di Melis — invia il codice di accesso monouso tramite email. Pacchetto `melisplatform/melis-login-2fa-email`.

## Scopo

MelisLogin2faEmail è il canale email **predefinito e integrato** di [MelisLogin2fa](/it/reference/modules/melis-login-2fa). Gestisce gli eventi `canSend` e `sendUserCode` emessi dal core 2FA, decidendo se un utente può essere raggiunto via email e inviando poi per posta il codice a 6 cifre. Poiché il core richiede questo modulo e questo modulo richiede il core, vengono installati come coppia — l'email è sempre il canale di riserva disponibile.

## Presenza nel back-office React

Questo modulo è un **plugin di metodo 2FA**, non uno strumento: **non ha alcun brick React, nessuna rotta `react-api`, nessuna capacità e nessuna interfaccia propria**. Non compare mai come voce nella barra laterale o nel menu di `/melis-react`. Il canale email emerge invece solo *all'interno* delle schermate di proprietà di MelisLogin2fa / MelisCore:

- **Come metodo 2FA selezionabile e ordinabile** nella **sezione impostazioni 2FA** che il core contribuisce allo strumento *Other config*. Gli amministratori lo abilitano e ne impostano l'ordine lì; l'ordine determina quale canale attivo viene provato per primo.
- **Come passaggio email + inserimento codice al login** — quando la 2FA è attiva e l'email è il canale scelto, il flusso di login invia via email il codice a 6 cifre e mostra la schermata di inserimento del codice. La conferma visualizza un indirizzo **mascherato** (ad es. `jo****@…`).

Per questo modulo **non esistono screenshot React**, perché non dispone di una schermata propria.

## Come abilitarlo

Questo modulo è richiesto da `melis-login-2fa` e si installa automaticamente insieme ad esso. Non è necessaria alcuna voce separata nel file di caricamento dei moduli oltre al caricamento di `MelisLogin2fa`.

Per attivare il canale email, apri le impostazioni 2FA presenti nel back-office React:

**System config → Other config → 2FA** — abilita **Email** come metodo di consegna e imposta il suo ordine tra i canali attivi.

Deve inoltre essere attiva l'email BO della piattaforma (configurata tramite le impostazioni email di MelisCore).

## Servizi principali

| Alias del servizio | Ruolo |
| --- | --- |
| `Melis2faBOEmailService` | Estende `MelisCoreBOEmailService`; sovrascrive `sendBoEmailByCode()` / `sendEmail()` per impostare il mittente di envelope corretto (`email_from` invece dell'indirizzo del destinatario). Carica il template email tramite codename, sostituisce i segnaposto `[TAG]`, lo racchiude nel layout e lo invia tramite `Laminas\Mail`. |
| `MelisLogin2faEmailControllerPlugin` | Controller plugin — punto di ingresso richiamato da entrambi i listener; espone `canSend($userData)` e `sendUserCode($user, $code)`. |

## Listener

| Listener | Evento | Comportamento |
| --- | --- | --- |
| `MelisCoreCanSendListener` | `canSend` | Restituisce `['melis-login-2fa-email' => <bool>]` — `true` quando l'utente ha una `usr_email` utilizzabile (non vuota e che supera `Laminas\Validator\EmailAddress`). |
| `MelisCoreSendUserCodeListener` | `sendUserCode` | Agisce solo quando non è già stato inviato **e** questo canale è il primo in `orderedModules` (`orderedModules[0] === 'melis-login-2fa-email'`). Riutilizza o crea una riga `melis_core_login_2fa_codes`, risolve la locale, invia il codice, quindi imposta `sent=true`, chiama `stopPropagation` e restituisce `['sent'=>true, 'hash'=>…, 'message'=>'<sent-to> '.maskEmail($email)]`. |

L'identificatore usato in tutta la selezione e l'ordinamento dei metodi è la stringa `melis-login-2fa-email`.

## Locale e link di recupero

`sendUserCode()` risolve la **locale** del destinatario (il proprio `usr_lang_id` del destinatario nel contesto BO, con fallback sulla locale di sessione; la lingua della pagina principale del sito nel contesto FO) affinché l'oggetto e il corpo dell'email siano nella lingua del destinatario.

Il link *forgot-password* dell'email si adatta al back-office da cui proviene l'utente: un utente BO che ha richiesto il proprio codice **dalla shell React** ottiene il link puntato a **`/melis-react/forgot-password`** invece del legacy `/melis/lost-password`. Questo è condizionato da `($user['ui_origin'] ?? null) === 'react'`, dove `ui_origin` è derivato (basato su Referer, con valore predefinito `'legacy'`) dal metodo `Login2faController::request2faCodeAction()` del core. Nulla altro nel flusso è specifico di React.

## Configurazione

Dichiarata sotto la chiave di configurazione `melis_login_2fa_email`:

| Chiave | Predefinito | Descrizione |
| --- | --- | --- |
| `email_from` | `noreply@melistechnology.com` | Indirizzo mittente di envelope |
| `from_name` | `Melis Platform` | Nome visualizzato del mittente |
| `reply_to` | — | Indirizzo di risposta (reply-to) |

## Tabelle del database

| Tabella | Contiene |
| --- | --- |
| `melis_core_login_2fa_codes` | Codici monouso (condivisi con il core 2FA); le righe vengono riutilizzate finché sono ancora valide oppure create ex novo da `MelisLogin2faService::generate2faCode()`. |

## File principali

| Ambito | Percorso |
| --- | --- |
| Bootstrap del modulo | `vendor/melisplatform/melis-login-2fa-email/src/Module.php` |
| Configurazione del modulo | `vendor/melisplatform/melis-login-2fa-email/config/module.config.php` |
| Listener `canSend` | `vendor/melisplatform/melis-login-2fa-email/src/Listener/MelisCoreCanSendListener.php` |
| Listener `sendUserCode` | `vendor/melisplatform/melis-login-2fa-email/src/Listener/MelisCoreSendUserCodeListener.php` |
| Controller plugin | `vendor/melisplatform/melis-login-2fa-email/src/Controller/Plugin/MelisLogin2faEmailControllerPlugin.php` |
| Servizio email | `vendor/melisplatform/melis-login-2fa-email/src/Service/Melis2faBOEmailService.php` |

## Metadati

| Elemento | Valore |
| --- | --- |
| Pacchetto | `melisplatform/melis-login-2fa-email` |
| Tipo | `melisplatform-module` · categoria `core` · `dbdeploy: true` |
| Namespace | `MelisLogin2faEmail\` (PSR-4 → `src/`) |
| Richiede | `melisplatform/melis-login-2fa` `^5.3` · PHP `^8.1\|^8.3` |
| Presenza React | Nessuna — nessun brick, nessuna `react-api`, nessuna capacità, nessuna UI |

Vedi anche: [MelisLogin2fa](/it/reference/modules/melis-login-2fa) · [MelisCore](/it/reference/modules/melis-core)
