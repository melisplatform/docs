# MelisLogin2faPrimotexto

> SMS-Zustellkanal für das Melis-2FA-System über das Primotexto-Gateway. Paket `melisplatform/melis-login-2fa-primotexto`.

## Zweck

MelisLogin2faPrimotexto ist ein optionaler 2FA-Kanal, der den einmaligen Anmeldecode per Textnachricht über die **Primotexto**-SMS-API versendet. Er greift in den Event-Vertrag des Kernmoduls `MelisLogin2fa` ein (`canSend` / `sendUserCode`). Wenn er unter den aktiven Kanälen an erster Stelle steht und der Benutzer über eine gültige Telefonnummer verfügt, stellt er den Code per SMS zu; wird keine gültige Telefonnummer gefunden, ist aber zusätzlich ein E-Mail-Kanal aktiv, greift er auf E-Mail zurück und benachrichtigt den Benutzer entsprechend.

## Aktivierung

Fügen Sie Folgendes zu `config/melis.module.load.php` hinzu:

```php
return [
    'MelisLogin2faPrimotexto',
];
```

Erfordert `melisplatform/melis-login-2fa` (`^5.3`) und PHP `^8.1|^8.3`. Das Kernmodul `MelisLogin2fa` muss zuerst geladen werden.

Nach dem Laden aktivieren Sie **SMS (Primotexto)** in der gemeinsam genutzten **2FA-Konfiguration** (Systemkonfiguration → 2FA) und ordnen ihn an erster Stelle an, um ihn zum primären Kanal zu machen. Hinterlegen Sie die Primotexto-API-Zugangsdaten unter dem Konfigurationsschlüssel `melis_login_2fa_primotexto` (siehe [Konfiguration](#konfiguration)).

## Im React-Backoffice

Dieses Modul ist ein **serverseitiges 2FA-Methoden-Plugin**, kein Backoffice-Werkzeug. Im React-Backoffice (`/melis-react`) besitzt es **keine Seite, keine Route und keinen Menüeintrag**. Sein gesamter React-Fußabdruck ist ein **reiner ID-Discovery-Brick**: eine minimale `public/ui-react/brick.manifest.json` (mit `route`, `forwardKey` und `melisKey` allesamt `null`) und eine `brick.tsx`, die lediglich ihre ID registriert.

```tsx
// ui-react/src/brick.tsx — the entire React contribution (id only, no UI).
window.__melisRegisterBrick?.({ id: 'melis-login-2fa-primotexto' })
```

Erst durch das Registrieren dieser ID erscheint das Modul in `GET /melis/react-api/react-modules`, der Discovery-Liste aktiver Module, die einen Brick ausliefern. MelisCores `useModuleActive('MelisLogin2faPrimotexto')` stützt sich auf diese Liste, um **das Feld `usr_phone` im nativen Benutzerformular einzublenden** — Benutzer benötigen eine Telefonnummer für die SMS-2FA. Das Modul steuert **keine eigenen `react-api`-Endpunkte und keine eigenen Fähigkeiten** bei; die Primotexto-API-Einstellungen (`url`, `api_key`, `sender`) werden vom gemeinsam genutzten 2FA-Konfigurationsabschnitt gerendert, der dem 2FA-Kern gehört, nicht von diesem Modul.

## Konfiguration

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

> **Warnung.** Die eingecheckte `config/module.config.php` liefert einen literalen `api_key`-Platzhalter aus. Überschreiben Sie ihn stets in einer lokalen bzw. umgebungsspezifischen Konfigurationsdatei und rotieren Sie jeden echten Schlüssel, der möglicherweise eingecheckt wurde.

## Wichtige Dienste

| Dienst-Alias | Rolle |
| --- | --- |
| `SmsService` | Ruft die Primotexto-HTTP-API zur Zustellung der OTP-SMS auf; normalisiert französische `0…`-Nummern zu `+33…`; protokolliert curl-/HTTP-Fehler in `CmaErrorLogsTable` |
| `MelisLogin2faPrimotextoControllerPlugin` | Controller-Plugin, das `canSend($userData)` und `sendUserCode($user, $code)` bereitstellt; steuert `SmsService` |

## Event-Listener

| Listener | Event | Verhalten |
| --- | --- | --- |
| `MelisCoreCanSendListener` | `canSend` | Gibt `['melis-login-2fa-primotexto' => bool]` zurück; kann nicht gesendet werden, steht aber E-Mail als Nächstes in der Reihenfolge, wird eine `twofa_fallback_message` in der Session `melis_login_2fa` abgelegt |
| `MelisCoreSendUserCodeListener` | `sendUserCode` | Wird nur aktiv, wenn noch nicht gesendet wurde und dieser Kanal `orderedModules[0]` ist; verwendet die Zeile `melis_core_login_2fa_codes` wieder bzw. erstellt sie, sendet über `SmsService`, setzt `sent=true` und ruft `stopPropagation` auf |

## Datenbanktabellen

| Tabelle | Enthält |
| --- | --- |
| `melis_core_user` | Erhält eine nullbare Spalte `usr_phone` (durch das `dbdeploy` dieses Moduls hinzugefügt) — die Telefonnummer, an die OTP-Codes gesendet werden |
| `melis_core_login_2fa_codes` | OTP-Codes (gehört zum Kern `MelisLogin2fa`; dieser Kanal verwendet Zeilen über `MelisLogin2faService` + `MelisLogin2faCodesTable` wieder bzw. erstellt sie) |

## Beispiel

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

## Einschränkungen

- **Abhängigkeit von `CmaErrorLogsTable`.** `SmsService` protokolliert Fehler in `CmaErrorLogsTable` aus einem CMA-Client-Modul. Ist diese Tabelle bzw. dieser Dienst in einer generischen Installation nicht registriert, schlägt der Fehlerprotokollierungspfad fehl. Machen Sie diese Abhängigkeit optional, wenn Sie außerhalb des ursprünglichen Client-Kontexts bereitstellen.
- **Rückfall auf E-Mail.** Steht Primotexto an erster Stelle, hat der Benutzer aber keine gültige Telefonnummer, und ist ein E-Mail-Kanal aktiv und danach angeordnet, wird der Code per E-Mail mit einer erläuternden Nachricht zugestellt.
- **Maskierte Telefonnummer in der Oberfläche.** Der Bildschirm zur Code-Eingabe zeigt nur eine maskierte Version der Telefonnummer an (z. B. `+3…**…07`).

## Wichtige Dateien

| Anliegen | Pfad |
| --- | --- |
| Modul-Bootstrap | `vendor/melisplatform/melis-login-2fa-primotexto/src/Module.php` |
| `canSend`-Listener | `vendor/melisplatform/melis-login-2fa-primotexto/src/Listener/MelisCoreCanSendListener.php` |
| `sendUserCode`-Listener | `vendor/melisplatform/melis-login-2fa-primotexto/src/Listener/MelisCoreSendUserCodeListener.php` |
| SMS-API-Dienst | `vendor/melisplatform/melis-login-2fa-primotexto/src/Service/SmsService.php` |
| Controller-Plugin | `vendor/melisplatform/melis-login-2fa-primotexto/src/Controller/Plugin/MelisLogin2faPrimotextoControllerPlugin.php` |
| React-Brick | `vendor/melisplatform/melis-login-2fa-primotexto/ui-react/src/brick.tsx` |
| React-Manifest | `vendor/melisplatform/melis-login-2fa-primotexto/public/ui-react/brick.manifest.json` |
| Modulkonfiguration | `vendor/melisplatform/melis-login-2fa-primotexto/config/module.config.php` |
| DB-Migration | `vendor/melisplatform/melis-login-2fa-primotexto/install/dbdeploy/` |

Siehe auch: [MelisLogin2fa](/de/reference/modules/melis-login-2fa) · [MelisLogin2faEmail](/de/reference/modules/melis-login-2fa-email) · [MelisCore](/de/reference/modules/melis-core)
