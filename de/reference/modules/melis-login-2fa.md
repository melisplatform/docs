# MelisLogin2fa

> Kern-/Orchestrator-Modul für die Zwei-Faktor-Authentifizierung bei Melis-Anmeldungen — nach Benutzername + Passwort verlangt es einen Einmalcode und delegiert die Zustellung an modulare Kanal-Module. Paket `melisplatform/melis-login-2fa`.

## Zweck

MelisLogin2fa ist der **2FA-Orchestrator** für Melis. Nachdem ein Benutzer Benutzername/Passwort übermittelt hat, fängt das Modul die Anmeldung ab (über `melis_core_auth_pre_success`), prüft, ob 2FA für die aktuelle Plattform und Site/das aktuelle Modul aktiv ist, wählt einen Zustellkanal und hält die Sitzung so lange nicht abgeschlossen, bis ein gültiger 6-stelliger Code eingegeben wurde. Es **versendet den Code nicht selbst** — die Zustellung wird über den Ereignisvertrag `canSend` / `sendUserCode` an modulare Kanal-Module (E-Mail, SMS) delegiert. Der mitgelieferte E-Mail-Kanal (`melis-login-2fa-email`) ist eine erforderliche Abhängigkeit und steht stets als fest verankerte Ausweichlösung zur Verfügung.

## Aktivierung

Fügen Sie es zu `config/melis.module.load.php` hinzu:

```php
return [
    'MelisLogin2fa',
];
```

`melisplatform/melis-login-2fa-email` ist eine erforderliche Abhängigkeit und muss ebenfalls geladen werden (es wird als Paar mit diesem Modul installiert). PHP `^8.1|^8.3`.

## Im React-Backoffice

Dieses Modul liefert einen **reinen Beitrags-Baustein (contribution-only brick)** — es hat **kein Werkzeug im linken Menü und keine eigene Route**. Stattdessen registriert es einen `OtherConfigSection`, den die native **Other config**-Seite von MelisCore nach ihren eigenen Karten rendert. Sie finden 2FA unter **System configuration → Other config**, als Karte **„Two-factor authentication (2FA)"** am unteren Rand. Die Karte erscheint nur, wenn das Modul aktiv ist (ermittelt über `GET /melis/react-api/react-modules`, danach wird das Bundle vorab geladen und beim Start ausgewertet).

![Die Karte „Two-factor authentication (2FA)" im React-Werkzeug „Other config": der Block „Melis, sites & other modules" mit Ziel-Tabs, einem Schalter „Activate 2FA" und der Zustellreihenfolge-Liste sowie der Block „Per environment" mit einem plattformspezifischen Schalter „Activate 2FA"](/screenshots/react/melis-login-2fa/melislogin2fa-tooloverride-otherconfig-tab-2fa.png)

Die Karte besteht aus zwei Blöcken:

| Block | Was er steuert |
| --- | --- |
| **Melis, sites & other modules** | Eine linke Tab-Spalte mit Zielen (**Melis Platform BO** sowie jede **Site**, wenn MelisCms aktiv ist). Für das ausgewählte Ziel: ein Schalter **Activate 2FA** und eine Liste **„Delivery order (drag to reorder)"**. **Default BO Email** ist fixiert (Default-Kennzeichnung + Mail-Symbol, stets aktiv, kann nicht abgeschaltet werden). Andere Methoden (z. B. **Primotexto**/SMS) verfügen über einen Ein/Aus-Schalter. Ziehen Sie die Zeilen, um die Prioritäts-/Ausweichkette festzulegen. |
| **Per environment** | Eine Tab-Spalte mit Plattformen (**local**, **prod** …), jede mit einem eigenen Schalter **Activate 2FA**, der `plf_2fa_active` schreibt. |

Jeder Schalter, jede Umschaltung und jede Neuanordnung **wird sofort gespeichert**. 2FA läuft nur, wenn sowohl ein Ziel als auch die aktuelle Umgebung aktiv sind. Der React-Abschnitt trägt keine Deklaration erweiterter Rechte (Capability) — um ihn zu erreichen, ist bereits Zugriff auf das Werkzeug „Other config" erforderlich.

![Die Methodenliste „Delivery order (drag to reorder)": Default BO Email (Default-Kennzeichnung + Mail-Symbol, gesperrt und stets aktiv) über Primotexto (Ein/Aus-Schalter); ziehen Sie den Griff, um die Prioritäts-/Ausweichkette festzulegen](/screenshots/react/melis-login-2fa/melislogin2fa-tooloverride-otherconfig-tab-2fa-order.png)

Die **Anmeldeabfrage selbst ist kein React-Baustein**: Wenn 2FA greift, wird die Anmeldung auf einer eigenständigen Code-Eingabeseite blockiert, die von `Login2faController` ausgeliefert wird (dieselbe Seite für `/melis` und `/melis-react`). Der Benutzer sieht das maskierte Ziel (z. B. `jo****@…`), gibt den 6-stelligen Code ein und kann nach einer Abkühlphase auf **Resend** klicken. Falsche Codes sind begrenzt, zu viele Fehlversuche sperren das Konto, und Codes verfallen nach 10 Minuten.

## Wichtige Dienste

| Dienst-Alias | Rolle |
| --- | --- |
| `MelisLogin2faService` | Erzeugt den 6-stelligen Code (`generate2faCode()`), einen 64-stelligen Hex-Tracking-Hash (`generateHash()`) und Gültigkeits-Zeitstempel (`getValidityDate($minutes)`). |
| `MelisLogin2faConfigService` | Liest und schreibt die 2FA-Konfiguration pro BO / pro Site. Wichtige Methoden: `getModuleConfig()`, `getAllModuleConfigs()`, `getAllSiteConfigs()`, `getAvailable2faModules()` (löst `melis_login_2fa.collect_available_modules` aus), `mergeAvailableModulesWithConfig()`, `filterOnlyInstalledModules()`, `saveItem()`. |
| `MelisLogin2faTranslationService` | Sprachbewusste Übersetzungshelfer (`translateByLocale`, `boTranslate`, …), damit Code-Zustellnachrichten der Sprache des Benutzers entsprechen. |
| `MelisLogin2faControllerPlugin` | Stellt `verifyUserCode($userId, $code)` bereit — bereinigt abgelaufene Codes, erzwingt das Versuchslimit, sperrt das Konto bei zu vielen Fehlversuchen, löscht den Datensatz bei Erfolg. |
| `MelisLogin2faVerifierPlugin` (Alias `melisLogin2faVerifier`) | Gate-Plugin — hält die Sitzung nicht abgeschlossen, bis ein gültiger Code übermittelt wurde. |

## React-API

Die Routen liegen in **`config/react-api.php`** (über `Module::getConfig()` unter der Route `melis-react-api` von MelisReactApi zusammengeführt). Controller **`MelisLogin2faReactApiSettingsController`** (aufrufbarer Alias `MelisLogin2faReactApiSettings`), alle unter `/melis/react-api/login2fa-settings`, Vertrag `{ success, data, error }`.

| Methode & URL | Zweck |
| --- | --- |
| `GET /melis/react-api/login2fa-settings` | Alle Einstellungen → `{ moduleConfigs[], sites[], siteConfigs[], platforms[] }`. Die `module_list` jeder Zeile wird durch `mergeAvailableModulesWithConfig()` geführt, sodass eine nie gespeicherte Zeile dennoch jede installierte Methode auflistet. Site-Zeilen nur, wenn MelisCms aktiv ist. |
| `POST /melis/react-api/login2fa-settings/save-config` | Speichert eine Zeile `melis_core_login_2fa_config`: `{ mcl2cf_id?, mcl2cf_module_name, mcl2cf_site_id, mcl2cf_activate_2fa, module_list[] }` → delegiert an `MelisLogin2faConfigService::saveItem()`. |
| `POST /melis/react-api/login2fa-settings/save-platform` | Speichert das Flag einer Plattform: `{ plf_id, plf_2fa_active }`. Schreibt `MelisCoreTablePlatform`; `422`, falls `plf_id` fehlt. |

Diese React-API ist ein schlankes JSON-Abbild der klassischen Other-config-Tabs — dieselben Zeilen, dasselbe `saveItem`, JSON statt gerendertem phtml. Die Aktionen sind **nur durch Authentifizierung** abgesichert (`denyUnlessAuthenticated()`, andernfalls `401`); das Modul liefert **keine `config/react.capabilities.php`** und deklariert keine erweiterten Rechte — erfinden Sie also keine Capability-Zeichenketten dafür.

## Datenbanktabellen

| Tabelle | Inhalt |
| --- | --- |
| `melis_core_login_2fa_codes` | Einmalcodes: Benutzer-ID, E-Mail, Typ (`melis-backoffice` oder Site-ID), der 6-stellige Code, Sitzungs-Hash, Ablaufdatum sowie Zähler für Fehlversuche mit Zeitstempeln (`mcl2c_try`, `mcl2c_try1/2/3_date`). |
| `melis_core_login_2fa_config` | Konfigurationszeilen pro BO / pro Site: `mcl2cf_module_name` oder `mcl2cf_site_id`, `mcl2cf_activate_2fa`, `mcl2cf_module_list` (JSON-geordnete Kanalliste). |

`melis_core_platform` erhält eine Spalte `plf_2fa_active` (durch das dbdeploy des Moduls hinzugefügt).

## Konfigurierbare Parameter

Deklariert unter dem Konfigurationsschlüssel `melis_login_2fa`:

| Schlüssel | Standard | Beschreibung |
| --- | --- | --- |
| `max_tries` | `3` | Fehlgeschlagene Code-Versuche, bevor das Konto gesperrt wird (`usr_status = 0`). |
| `code_validity_minutes` | `10` | Minuten bis zum Ablauf eines Codes. |
| `request_code_cooldown_seconds` | `60` | Mindestanzahl Sekunden zwischen erneuten Sendeanfragen. |

## Der Kanal-Ereignisvertrag

Der Kern ruft niemals direkt einen Kanal auf — er löst Ereignisse aus, die die Kanäle beantworten. Um eine Zustellmethode hinzuzufügen, implementieren Sie Listener für:

| Ereignis | Richtung | Zweck |
| --- | --- | --- |
| `melis_login_2fa.collect_available_modules` | Kern → Kanäle | Kanäle fügen `['module'=>'…', 'label'=>'…']` an, damit sie in der Methodenliste der Verwaltung erscheinen. |
| `canSend` | Kern → Kanäle | Jeder Kanal gibt `['<module-name>' => bool]` zurück und gibt so an, ob er den Benutzer erreichen kann. |
| `sendUserCode` | Kern → Kanäle | Der erste sendefähige Kanal in `orderedModules` erstellt/verwendet den Code erneut und stellt ihn zu, setzt dann `sent=true` und ruft `stopPropagation` auf. |

## Beispiel

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

## Wichtige Dateien

| Aspekt | Pfad |
| --- | --- |
| Modul-Bootstrap | `vendor/melisplatform/melis-login-2fa/src/Module.php` (`getConfig()` führt `react-api.php` zusammen) |
| Modul-Konfiguration (Dienste, Routen, Parameter) | `vendor/melisplatform/melis-login-2fa/config/module.config.php` |
| React-API-Routen | `vendor/melisplatform/melis-login-2fa/config/react-api.php` |
| Liste der vom Gate ausgenommenen Routen | `vendor/melisplatform/melis-login-2fa/config/excluded.routes.php` |
| Haupt-Anmelde-Listener (`melis_core_auth_pre_success`) | `vendor/melisplatform/melis-login-2fa/src/Listener/MelisLogin2faMainListener.php` |
| Listener zum Speichern der Konfiguration | `vendor/melisplatform/melis-login-2fa/src/Listener/MelisLogin2faListener.php` |
| Resend-Listener | `vendor/melisplatform/melis-login-2fa/src/Listener/MelisLogin2faRequestCodeListener.php` |
| React-API-Controller | `vendor/melisplatform/melis-login-2fa/src/Controller/ReactApi/MelisLogin2faReactApiSettingsController.php` |
| Controller (Verifizierungsrouten) | `vendor/melisplatform/melis-login-2fa/src/Controller/Login2faController.php` |
| Verify-Plugin | `vendor/melisplatform/melis-login-2fa/src/Controller/Plugin/MelisLogin2faControllerPlugin.php` |
| Gate-(Verifier-)Plugin | `vendor/melisplatform/melis-login-2fa/src/Controller/Plugin/MelisLogin2faVerifierPlugin.php` |
| Kern-Dienst | `vendor/melisplatform/melis-login-2fa/src/Service/MelisLogin2faService.php` |
| Konfigurationsdienst | `vendor/melisplatform/melis-login-2fa/src/Service/MelisLogin2faConfigService.php` |
| Codes-Tabelle | `vendor/melisplatform/melis-login-2fa/src/Model/Tables/MelisLogin2faCodesTable.php` |
| Konfigurationstabelle | `vendor/melisplatform/melis-login-2fa/src/Model/Tables/MelisLogin2faConfigTable.php` |
| React-Baustein-Quellcode | `vendor/melisplatform/melis-login-2fa/ui-react/src/` (`brick.tsx`, `Login2faOtherConfigSection.tsx`) |
| Gebauter Baustein + Manifest | `vendor/melisplatform/melis-login-2fa/public/ui-react/brick.js` · `brick.manifest.json` |
| DB-Deploy | `vendor/melisplatform/melis-login-2fa/install/dbdeploy/` |

## Metadaten

| Element | Wert |
| --- | --- |
| Paket | `melisplatform/melis-login-2fa` |
| Typ | `melisplatform-module` · Kategorie `core` · `dbdeploy: true` |
| Namespace | `MelisLogin2fa\` (PSR-4 → `src/`) · Modulname `MelisLogin2fa` |
| React-Baustein | Reiner Beitrags-Baustein (ID `melis-login-2fa`, `route`/`forwardKey`/`melisKey` = `null`); registriert einen `OtherConfigSection` |
| Erfordert | `melisplatform/melis-login-2fa-email` `^5.3` · PHP `^8.1\|^8.3` |

Siehe auch: [MelisLogin2faEmail](/de/reference/modules/melis-login-2fa-email) · [MelisCore](/de/reference/modules/melis-core)
