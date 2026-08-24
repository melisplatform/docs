# MelisLogin2faEmail

> E-Mail-Zustellkanal für das Melis-2FA-System — versendet den einmaligen Anmeldecode per E-Mail. Paket `melisplatform/melis-login-2fa-email`.

## Zweck

MelisLogin2faEmail ist der **standardmäßig mitgelieferte** E-Mail-Kanal für [MelisLogin2fa](/de/reference/modules/melis-login-2fa). Er verarbeitet die vom 2FA-Kern ausgelösten Ereignisse `canSend` und `sendUserCode`, entscheidet, ob ein Benutzer per E-Mail erreicht werden kann, und versendet anschließend den 6-stelligen Code. Da der Kern dieses Modul benötigt und dieses Modul den Kern benötigt, werden sie als Paar installiert — E-Mail ist stets der verfügbare Ausweichkanal.

## Präsenz im React-Backoffice

Dieses Modul ist ein **2FA-Methoden-Plugin**, kein Werkzeug: Es besitzt **keinen React-Brick, keine `react-api`-Route, keine Capabilities und keine eigene Oberfläche**. Es erscheint niemals als Eintrag in der `/melis-react`-Seitenleiste oder im Menü. Stattdessen tritt der E-Mail-Kanal ausschließlich *innerhalb* von Bildschirmen in Erscheinung, die MelisLogin2fa / MelisCore gehören:

- **Als auswählbare, sortierbare 2FA-Methode** im **2FA-Einstellungsbereich**, den der Kern zum Werkzeug *Other config* beisteuert. Administratoren aktivieren ihn dort und legen seine Reihenfolge fest; die Reihenfolge entscheidet, welcher aktive Kanal zuerst versucht wird.
- **Als E-Mail- und Code-Eingabeschritt bei der Anmeldung** — wenn 2FA aktiviert ist und E-Mail der gewählte Kanal ist, versendet der Anmeldevorgang den 6-stelligen Code per E-Mail und zeigt den Bildschirm zur Code-Eingabe an. Die Bestätigung zeigt eine **maskierte** Adresse an (z. B. `jo****@…`).

Für dieses Modul gibt es **keine React-Screenshots**, da es keinen eigenen Bildschirm besitzt.

## Aktivierung

Dieses Modul wird von `melis-login-2fa` benötigt und wird automatisch zusammen mit ihm installiert. Über das Laden von `MelisLogin2fa` hinaus ist kein separater Eintrag in der Modul-Ladedatei erforderlich.

Um den E-Mail-Kanal zu aktivieren, öffnen Sie die 2FA-Einstellungen, die im React-Backoffice bereitgestellt werden:

**System config → Other config → 2FA** — aktivieren Sie **Email** als Zustellmethode und legen Sie ihre Reihenfolge unter den aktiven Kanälen fest.

Außerdem muss die BO-E-Mail der Plattform aktiv sein (konfiguriert über die E-Mail-Einstellungen von MelisCore).

## Wichtige Dienste

| Dienst-Alias | Rolle |
| --- | --- |
| `Melis2faBOEmailService` | Erweitert `MelisCoreBOEmailService`; überschreibt `sendBoEmailByCode()` / `sendEmail()`, um den korrekten Envelope-Absender zu setzen (`email_from` anstelle der Empfängeradresse). Lädt die E-Mail-Vorlage anhand des Codenamens, ersetzt die `[TAG]`-Platzhalter, bettet sie in das Layout ein und versendet sie über `Laminas\Mail`. |
| `MelisLogin2faEmailControllerPlugin` | Controller-Plugin — Einstiegspunkt, der von beiden Listenern aufgerufen wird; stellt `canSend($userData)` und `sendUserCode($user, $code)` bereit. |

## Listener

| Listener | Ereignis | Verhalten |
| --- | --- | --- |
| `MelisCoreCanSendListener` | `canSend` | Gibt `['melis-login-2fa-email' => <bool>]` zurück — `true`, wenn der Benutzer eine verwendbare `usr_email` besitzt (nicht leer und den `Laminas\Validator\EmailAddress` bestehend). |
| `MelisCoreSendUserCodeListener` | `sendUserCode` | Wird nur aktiv, wenn noch nicht gesendet wurde **und** dieser Kanal in `orderedModules` an erster Stelle steht (`orderedModules[0] === 'melis-login-2fa-email'`). Verwendet eine bestehende Zeile in `melis_core_login_2fa_codes` erneut oder erstellt eine neue, ermittelt die Locale, versendet den Code, setzt dann `sent=true`, ruft `stopPropagation` auf und gibt `['sent'=>true, 'hash'=>…, 'message'=>'<sent-to> '.maskEmail($email)]` zurück. |

Der in der gesamten Methodenauswahl und -sortierung verwendete Bezeichner ist die Zeichenkette `melis-login-2fa-email`.

## Locale und Wiederherstellungslink

`sendUserCode()` ermittelt die **Locale** des Empfängers (die eigene `usr_lang_id` des Empfängers im BO-Kontext, mit Rückgriff auf die Session-Locale; die Sprache der Hauptseite der Website im FO-Kontext), damit Betreff und Text der E-Mail in der Sprache des Empfängers verfasst sind.

Der *Passwort-vergessen*-Link der E-Mail passt sich an das Backoffice an, aus dem der Benutzer stammt: Ein BO-Benutzer, der seinen Code **aus der React-Shell** angefordert hat, erhält den Link auf **`/melis-react/forgot-password`** anstelle des veralteten `/melis/lost-password`. Dies wird über `($user['ui_origin'] ?? null) === 'react'` gesteuert, wobei `ui_origin` (Referer-basiert, standardmäßig `'legacy'`) durch die Methode `Login2faController::request2faCodeAction()` des Kerns abgeleitet wird. Nichts anderes im Ablauf ist React-spezifisch.

## Konfiguration

Deklariert unter dem Konfigurationsschlüssel `melis_login_2fa_email`:

| Schlüssel | Standard | Beschreibung |
| --- | --- | --- |
| `email_from` | `noreply@melistechnology.com` | Envelope-Absenderadresse |
| `from_name` | `Melis Platform` | Anzeigename des Absenders |
| `reply_to` | — | Antwortadresse |

## Datenbanktabellen

| Tabelle | Enthält |
| --- | --- |
| `melis_core_login_2fa_codes` | Einmalcodes (gemeinsam mit dem 2FA-Kern genutzt); Zeilen werden wiederverwendet, solange sie noch gültig sind, oder von `MelisLogin2faService::generate2faCode()` neu erstellt. |

## Wichtige Dateien

| Bereich | Pfad |
| --- | --- |
| Modul-Bootstrap | `vendor/melisplatform/melis-login-2fa-email/src/Module.php` |
| Modulkonfiguration | `vendor/melisplatform/melis-login-2fa-email/config/module.config.php` |
| `canSend`-Listener | `vendor/melisplatform/melis-login-2fa-email/src/Listener/MelisCoreCanSendListener.php` |
| `sendUserCode`-Listener | `vendor/melisplatform/melis-login-2fa-email/src/Listener/MelisCoreSendUserCodeListener.php` |
| Controller-Plugin | `vendor/melisplatform/melis-login-2fa-email/src/Controller/Plugin/MelisLogin2faEmailControllerPlugin.php` |
| E-Mail-Dienst | `vendor/melisplatform/melis-login-2fa-email/src/Service/Melis2faBOEmailService.php` |

## Metadaten

| Element | Wert |
| --- | --- |
| Paket | `melisplatform/melis-login-2fa-email` |
| Typ | `melisplatform-module` · Kategorie `core` · `dbdeploy: true` |
| Namespace | `MelisLogin2faEmail\` (PSR-4 → `src/`) |
| Benötigt | `melisplatform/melis-login-2fa` `^5.3` · PHP `^8.1\|^8.3` |
| React-Präsenz | Keine — kein Brick, keine `react-api`, keine Capabilities, keine Oberfläche |

Siehe auch: [MelisLogin2fa](/de/reference/modules/melis-login-2fa) · [MelisCore](/de/reference/modules/melis-core)
