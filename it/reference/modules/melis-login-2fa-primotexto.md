# MelisLogin2faPrimotexto

> Canale di invio SMS per il sistema 2FA di Melis tramite il gateway Primotexto. Pacchetto `melisplatform/melis-login-2fa-primotexto`.

## Scopo

MelisLogin2faPrimotexto è un canale 2FA opzionale che invia il codice di accesso monouso tramite messaggio di testo attraverso l'API SMS **Primotexto**. Si integra con il contratto di eventi del core `MelisLogin2fa` (`canSend` / `sendUserCode`). Quando è ordinato per primo tra i canali attivi e l'utente ha un numero di telefono valido, invia il codice via SMS; se non viene trovato alcun telefono valido ma è attivo anche un canale email, ricorre all'email e ne dà notifica all'utente.

## Come abilitarlo

Aggiungere a `config/melis.module.load.php`:

```php
return [
    'MelisLogin2faPrimotexto',
];
```

Richiede `melisplatform/melis-login-2fa` (`^5.3`) e PHP `^8.1|^8.3`. Il modulo core `MelisLogin2fa` deve essere caricato per primo.

Una volta caricato, abilitare **SMS (Primotexto)** nella **configurazione 2FA** condivisa (System config → 2FA) e ordinarlo per primo per renderlo il canale principale. Fornire le credenziali dell'API Primotexto sotto la chiave di configurazione `melis_login_2fa_primotexto` (vedere [Configurazione](#configuration)).

## Nel back-office React

Questo modulo è un **plugin di metodo 2FA lato server**, non uno strumento di back-office. Nel back-office React (`/melis-react`) non ha **alcuna pagina, alcuna route né alcuna voce di menu**. La sua intera presenza in React è un **brick di discovery con solo id**: un `public/ui-react/brick.manifest.json` minimo (con `route`, `forwardKey` e `melisKey` tutti impostati a `null`) e un `brick.tsx` che registra solamente il proprio id.

```tsx
// ui-react/src/brick.tsx — l'intero contributo React (solo id, nessuna UI).
window.__melisRegisterBrick?.({ id: 'melis-login-2fa-primotexto' })
```

La registrazione di quell'id è ciò che fa comparire il modulo in `GET /melis/react-api/react-modules`, l'elenco di discovery dei moduli attivi che forniscono un brick. Il metodo `useModuleActive('MelisLogin2faPrimotexto')` di MelisCore si basa su quell'elenco per **mostrare il campo `usr_phone` nel form nativo degli Utenti** — gli utenti hanno bisogno di un numero di telefono per la 2FA via SMS. Il modulo non contribuisce **alcun endpoint `react-api` né alcuna capability** propria; le impostazioni dell'API Primotexto (`url`, `api_key`, `sender`) vengono renderizzate dalla sezione di configurazione 2FA condivisa, di proprietà del core 2FA e non di questo modulo.

## Configurazione

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

> **Warning.** Il file `config/module.config.php` versionato include un segnaposto letterale `api_key`. Sovrascriverlo sempre in un file di configurazione locale/specifico dell'ambiente e ruotare qualsiasi chiave reale che possa essere stata versionata.

## Servizi principali

| Alias del servizio | Ruolo |
| --- | --- |
| `SmsService` | Chiama l'API HTTP di Primotexto per inviare l'SMS con l'OTP; normalizza i numeri francesi `0…` in `+33…`; registra gli errori curl/HTTP in `CmaErrorLogsTable` |
| `MelisLogin2faPrimotextoControllerPlugin` | Plugin del controller che espone `canSend($userData)` e `sendUserCode($user, $code)`; pilota `SmsService` |

## Listener degli eventi

| Listener | Evento | Comportamento |
| --- | --- | --- |
| `MelisCoreCanSendListener` | `canSend` | Restituisce `['melis-login-2fa-primotexto' => bool]`; se non è in grado di inviare ma l'email è la successiva nell'ordine, memorizza un `twofa_fallback_message` nella sessione `melis_login_2fa` |
| `MelisCoreSendUserCodeListener` | `sendUserCode` | Agisce solo quando non è già stato inviato e questo canale è `orderedModules[0]`; riutilizza/crea la riga `melis_core_login_2fa_codes`, invia tramite `SmsService`, imposta `sent=true`, chiama `stopPropagation` |

## Tabelle del database

| Tabella | Contiene |
| --- | --- |
| `melis_core_user` | Acquisisce una colonna `usr_phone` nullable (aggiunta dal `dbdeploy` di questo modulo) — il numero di telefono a cui vengono inviati i codici OTP |
| `melis_core_login_2fa_codes` | Codici OTP (di proprietà del core `MelisLogin2fa`; questo canale riutilizza/crea le righe tramite `MelisLogin2faService` + `MelisLogin2faCodesTable`) |

## Esempio

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

## Avvertenze

- **Dipendenza da `CmaErrorLogsTable`.** `SmsService` registra gli errori in `CmaErrorLogsTable` di un modulo client CMA. Se quella tabella/servizio non è registrata in un'installazione generica, il percorso di logging degli errori fallirà. Rendere questa dipendenza opzionale se si effettua il deploy al di fuori del contesto client originale.
- **Ricorso all'email.** Se Primotexto è il primo ma l'utente non ha un numero di telefono valido, e un canale email è attivo e ordinato successivamente, il codice viene inviato via email con un messaggio esplicativo.
- **Numero di telefono mascherato nell'interfaccia.** La schermata di inserimento del codice mostra solo una versione mascherata del numero di telefono (ad es. `+3…**…07`).

## File principali

| Ambito | Percorso |
| --- | --- |
| Bootstrap del modulo | `vendor/melisplatform/melis-login-2fa-primotexto/src/Module.php` |
| Listener `canSend` | `vendor/melisplatform/melis-login-2fa-primotexto/src/Listener/MelisCoreCanSendListener.php` |
| Listener `sendUserCode` | `vendor/melisplatform/melis-login-2fa-primotexto/src/Listener/MelisCoreSendUserCodeListener.php` |
| Servizio API SMS | `vendor/melisplatform/melis-login-2fa-primotexto/src/Service/SmsService.php` |
| Plugin del controller | `vendor/melisplatform/melis-login-2fa-primotexto/src/Controller/Plugin/MelisLogin2faPrimotextoControllerPlugin.php` |
| Brick React | `vendor/melisplatform/melis-login-2fa-primotexto/ui-react/src/brick.tsx` |
| Manifest React | `vendor/melisplatform/melis-login-2fa-primotexto/public/ui-react/brick.manifest.json` |
| Configurazione del modulo | `vendor/melisplatform/melis-login-2fa-primotexto/config/module.config.php` |
| Migrazione DB | `vendor/melisplatform/melis-login-2fa-primotexto/install/dbdeploy/` |

Vedere anche: [MelisLogin2fa](/it/reference/modules/melis-login-2fa) · [MelisLogin2faEmail](/it/reference/modules/melis-login-2fa-email) · [MelisCore](/it/reference/modules/melis-core)
