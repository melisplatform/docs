# MelisCore

> Das Back-Office-Fundament, auf dem jedes andere Modul aufbaut — Anmeldung, Benutzer/Rollen/Rechte, das
> Menü- und Werkzeug-Framework, Dashboard, Konfiguration, E-Mail, DSGVO sowie das Basis-Service- und
> Event-System — nun bereitgestellt durch das **React**-Back-Office unter `/melis-react`. Paket
> `melisplatform/melis-core`.

## Zweck

`MelisCore` ist das Herzstück des Back-Office von Melis Platform. Es stellt die Anwendungshülle (Kopfzeile,
linkes Menü, Werkzeugbaum, Dashboard, Fußzeile), den Konfigurationsbaum `MelisCoreConfig`, der die
`app.*.php`-Dateien jedes Moduls zusammenführt, die Authentifizierung und werkzeugspezifische Rechte, die
Benutzerverwaltung, die Plattform-/Umgebungsverwaltung, transaktionale E-Mails, DSGVO-Werkzeuge, einen
Micro-Service-Authentifizierungs-Endpunkt sowie die gemeinsam genutzte Service-/Event-Schicht bereit, die
jedes andere Modul erweitert. Jedes `melisplatform/*`-Modul hängt davon ab.

In v6 **ist** MelisCore zugleich die React-Back-Office-Anwendung. Dieselbe Hülle wird als React 19 +
TypeScript + Tailwind Single-Page-Anwendung unter `/melis-react` bereitgestellt und läuft parallel zum
klassischen `.phtml`-Back-Office unter `/melis`. MelisCore liefert die Hülle (Layout, Routing, den
generischen `react-api`-Client, den Modul-/Brick-Loader, den Capability-Resolver, den Umschalter Neu/Alt)
**und** seine eigenen nativen React-Werkzeuge (Benutzer, Dashboard, Ankündigungen, E-Mails, DSGVO,
Sprachen, Protokolle, Module, Weitere Konfiguration, Plattformen, Plattform-Design, Mein Konto,
Anmeldung/2FA). Jedes andere Modul dockt **an** diese Hülle an.

## Aktivieren

Fügen Sie es zu `config/modules.config.php` hinzu — MelisCore muss früh geladen werden, da fast jedes andere
Modul seine Services aufruft:

```php
return [
    'MelisCore',
    // … other modules …
];
```

Das React-Back-Office wird von drei zusammenarbeitenden Modulen bereitgestellt:

| Modul | Rolle |
| --- | --- |
| `MelisCore` | Der Quellcode/Build der React-Anwendung + die `react-api`-Routen und Controller der nativen Werkzeuge. |
| [`MelisReactApi`](/de/reference/modules/melis-react-api) | Die generische `react-api`-Brücke (`me`, `menu`, `assets`, `langs`, `react-modules`, `rights`, `i18n`, `dashboard`). |
| [`MelisReactOverride`](/de/reference/modules/melis-react-override) | Stellt die SPA-Hülle unter `/melis-react` und den klassischen Iframe-Mechanismus (`/melis/react-tool-page`) bereit. |

Die begleitenden Infrastrukturmodule bleiben [MelisAssetManager](/de/reference/modules) (das die
gehashten React-Assets aus `/MelisCore/ui-react/` bereitstellt), [MelisDbDeploy](/de/reference/modules),
[MelisComposerDeploy](/de/reference/modules) und [MelisInstaller](/de/reference/modules).

## Die Architektur des React-Back-Office

Der Quellcode der Vite + React-Anwendung liegt in `vendor/melisplatform/melis-core/ui-react/` und wird in
das eingecheckte `vendor/melisplatform/melis-core/public/ui-react/` gebaut. Zur Laufzeit:

- Die **Hülle (SPA)** wird unter **`/melis-react`** von `MelisReactOverride` bereitgestellt; das klassische
  Back-Office unter `/melis` bleibt unberührt.
- **Gehashte Assets** werden aus **`/MelisCore/ui-react/`** geladen (das Vite-`base`, bereitgestellt von
  MelisAssetManager).
- Die **JSON-API** liegt unter **`/melis/react-api/…`** mit dem Vertrag `{ success, data, error }`.

Jedes Werkzeug, das der Benutzer sieht, gelangt über **einen von drei Mechanismen** auf den Bildschirm:

1. **Natives React-Werkzeug** — eine echte React-Seite, gestützt durch einen `MelisReactApi*Controller` in
   MelisCore (Benutzer, Sprachen, E-Mails, DSGVO…). Aufgeführt in der Modul-Registry
   (`ui-react/src/lib/module-registry.ts`).
2. **Modul-Brick** — ein anderes aktives Modul liefert seine eigene React-Oberfläche als *Brick*, geladen
   zur Laufzeit (nur vorhanden, wenn das Modul aktiv ist). Ermittelt über
   `GET /melis/react-api/react-modules`.
3. **Iframe-Pool** — jedes klassische Werkzeug ohne eigene React-Route wird innerhalb der Hülle in einem
   gepoolten Iframe über `/melis/react-tool-page?key=<melisKey>` gerendert.

Das **Menü ist dynamisch** (`GET /melis/react-api/menu` gibt den rechtebasiert gefilterten Werkzeugbaum
zurück), Werkzeug-Routen werden **aus diesem Baum abgeleitet** (`/[section]/[tool]`, z. B.
`/melis-core/user`), und nichts ist pro Modul fest verdrahtet. Ein natives Werkzeug kann außerdem einen
Umschalter **Neu (React) / Alt (Iframe)** tragen, um seine React-Ansicht mit dem klassischen Werkzeug zu
vergleichen.

## Back-Office-Hülle

Die Hülle (`ui-react/src/components/layout/Shell.tsx`) setzt sich aus der Seitenleiste, der oberen Leiste,
den Unter-Tabs, der Tab-Leiste der klassischen Werkzeuge und dem Inhaltsbereich zusammen. Jede
Werkzeug-Einbindung ist in eine werkzeugspezifische `ToolErrorBoundary` gehüllt, sodass der Render-Absturz
eines Werkzeugs niemals das gesamte Back-Office leert.

### Obere Leiste

Die rechte Seite der oberen Leiste enthält einen **Design**-Umschalter (hell/dunkel), den
**Sprach**-Umschalter, ein **Messenger**-Symbol (wenn dieses Modul aktiv ist), eine
**Benachrichtigungs**-Glocke und Ihren **Benutzer-Avatar** (öffnet *Mein Konto* und enthält *Abmelden*).
Ganz links befindet sich eine Schaltfläche zum Ausblenden der Seitenleiste.

![Die Symbole auf der rechten Seite der oberen Leiste — Design-Umschalter, Sprache, Messenger, Benachrichtigungen, Avatar](/screenshots/react/melis-core/meliscore-header-righticons.png)

### Linke Seitenleiste und Fußzeile

Die Seitenleiste zeigt den **Dashboard**-Link sowie den **Werkzeugbaum**, gruppiert nach Bereich (MelisCore,
MelisCms, MelisMarketing, MelisCommerce, Marketplace, Melis AI…). **Was Sie sehen, hängt von Ihren Rechten
ab** — es erscheinen nur Werkzeuge, die Sie verwenden dürfen. Die Fußzeile zeigt die **Version** der
Plattform / von MelisCore.

![Die Fußzeile — Version von MelisCore / der Plattform](/screenshots/react/melis-core/meliscore-footer-version-meliscore.png)

### Dashboard

Die Landeseite nach der Anmeldung. Sie zeigt oben **Bubbles** (Zähler für Melis News / Updates /
Benachrichtigungen / Nachrichten) und ein Raster aus **Widgets** (Dashboard-Plugins). Widgets werden über
die Palette **„Add a widget"** hinzugefügt und per Drag-and-drop angeordnet; die Verfügbarkeit hängt von
Ihren Rechten ab.

![Das React-Dashboard — obere Bubbles, ein leeres Widget-Raster und die Palette „Add a widget"](/screenshots/react/melis-core/meliscore-dashboard-empty.png)

![Die Palette „Add a widget" — wählen Sie ein Widget (nach Modul gruppiert), um es auf das Dashboard zu ziehen](/screenshots/react/melis-core/meliscore-dashboardplugins-menu.png)

## Authentifizierung

Die Anmeldung befindet sich unter `/melis-react/login` (React) — Benutzername + Passwort, optional
**Remember me** und eine Sprachauswahl. Bei Erfolg landen Sie auf dem Dashboard. Konten mit **2FA** werden
zu `/verify-2fa` weitergeleitet (ein neuer Code kann erneut angefordert werden, wenn er per E-Mail versendet
wurde). Der Link **Lost password** (`/forgot-password`) versendet einen Link zum Zurücksetzen per E-Mail,
der `/reset-password/:hash` öffnet. Das Branding des Anmeldebereichs ist über das Werkzeug
**Plattform-Design** konfigurierbar.

Unter der Haube ist die PHP-Schicht unverändert: Die Anmeldung sendet an das klassische
`POST /melis/authenticate`, das Session-Polling nutzt `GET /melis/islogin`, und die Rechte stammen aus
`MelisCoreAuth` / `MelisCoreRights`.

## Benutzer, Rollen und Rechte

**Wo:** MelisCore → Administration → **Benutzerverwaltung** (`/melis-core/user`). Verwalten Sie jedes
Back-Office-Konto. Die Liste verfügt über KPI-Karten (Gesamt / Aktiv / Inaktiv / Administratoren), Suche,
Status- und Rollenfilter, einen Spaltenmanager, Export, den Umschalter Neu/Alt und **+ New user**.

![Das Werkzeug Benutzer — KPI-Karten, Filter, Spaltenmanager, Export, Umschalter Neu/Alt, „+ New user"](/screenshots/react/melis-core/meliscore-tool-users-list.png)

Das Öffnen eines Benutzers zeigt vier Tabs:

- **Profil** — Identität, Tags, Status-Umschalter, Rolle, ein Kennzeichen **Administrator** und ein
  Passwort-Abschnitt mit Live-Feedback zur Komplexität.

  ![Der Tab Profil — Identität, Tags, Karten Status/Rolle/Rechte und ein Passwortfeld mit Live-Anforderungen](/screenshots/react/melis-core/meliscore-tool-users-edit-tab-profile.png)

- **Rechte** — der **Zugriffsbaum** (haken Sie an, welche Werkzeuge/Bereiche der Benutzer verwenden darf),
  dazu ein Panel **Dashboard-Plugins** und ein Panel **Seiten**. Alles, was nicht gewährt wird, ist im Menü
  des Benutzers verborgen. Werkzeuge, die **Capabilities** deklarieren, zeigen Unter-Kontrollkästchen (Liste
  / Erstellen / Bearbeiten / Löschen / Export).

  ![Der Rechtebaum — Zählungen pro Bereich und Capability-Kontrollkästchen pro Werkzeug](/screenshots/react/melis-core/meliscore-tool-users-edit-tab-rights-1.png)

  ![Weiter unten im Tab Rechte — das Panel Dashboard-Plugins und das Panel Seiten](/screenshots/react/melis-core/meliscore-tool-users-edit-tab-rights-2.png)

- **Verbindungen** — der Anmeldeverlauf des Benutzers (Datum, Uhrzeit ein/aus, Dauer).
- **Microservices** — erzeugen Sie einen **API-Schlüssel**, damit sich Dritte als dieser Benutzer gegenüber
  den Micro-Service-Endpunkten authentifizieren können.

  ![Ein erzeugter API-Schlüssel — Umschalter Aktivieren/Deaktivieren, maskierter Schlüssel mit Anzeigen/Kopieren/Neu erzeugen und die Microservice-URL](/screenshots/react/melis-core/meliscore-tool-users-edit-tab-microservices-generated.png)

**Rollen** definieren einmalig eine Rechtemenge und weisen sie vielen Benutzern zu; das Werkzeug Rollen wird
von **MelisSmallBusiness** beigesteuert, daher erscheint die Auswahl *Rolle* im Tab Profil nur, wenn dieses
Modul aktiv ist.

> Faustregel: Wenn jemand „ein Werkzeug nicht sehen kann", gewährt sein **Rechte**-Baum es nicht —
> bearbeiten Sie den Benutzer (oder seine Rolle) → Rechte → haken Sie das Werkzeug an.

## Mein Konto

**Wo:** Avatar in der oberen Leiste → **Mein Konto** (`/melis-core/account`). Bearbeiten Sie Ihre eigene
E-Mail-Adresse, ändern Sie Ihr Passwort, legen Sie Ihre Oberflächensprache fest und laden Sie ein Profilbild
hoch. Module können hier Tabs hinzufügen (z. B. Melis Messenger). Dies ist das einzige native Werkzeug ohne
Capability-Schutz — es steht jedem authentifizierten Benutzer offen.

![Die Seite „Mein Konto" — Avatar, Identitätsübersicht und ein Tab Profil (E-Mail / Passwort / Sprache)](/screenshots/react/melis-core/meliscore-tool-profile-tab-profile.png)

## Ankündigungen

**Wo:** MelisCore → Administration → **Ankündigung** (`/melis-core/announcement`).
Plattform-Ankündigungen, die auf dem Dashboard angezeigt werden, mit KPI-Karten, Suche, einem Statusfilter
und **+ New announcement**. Der Editor besteht aus einem Titel + einem **Rich-Text-Text (TinyMCE)**, einem
Umschalter **Aktiv** und einem **Datum**.

![Die Ankündigungsliste — KPI-Karten, Filter Aktiv/Inaktiv, Bearbeiten/Löschen pro Zeile](/screenshots/react/melis-core/meliscore-tool-announcement-list.png)

![Der Ankündigungseditor — Titel, HTML-Text (TinyMCE), Umschalter Aktiv und Datum](/screenshots/react/melis-core/meliscore-tool-announcement-edit.png)

## Back-Office-Sprachen

**Wo:** MelisCore → Systemkonfiguration → **Back-Office-Sprachen** (`/melis-core/language`). Die für
Back-Office-Benutzer verfügbaren Locales (Locale + Name). `en_EN` ist der **geschützte Standard** (kann
nicht umbenannt oder gelöscht werden). Beim Speichern werden die Übersetzungsdateien über
`MelisCoreTranslation` neu generiert.

![Die Sprachenliste — Locale + Name, der Standard (en_EN) markiert, Bearbeiten pro Zeile](/screenshots/react/melis-core/meliscore-tool-bolanguages-list.png)

## E-Mail-Verwaltung

**Wo:** MelisCore → Systemkonfiguration → **E-Mail-Verwaltung** (`/melis-core/emails`). Die
**transaktionalen E-Mails** der Plattform (Kontoerstellung, verlorenes Passwort, Workflow…). Die Liste zeigt
Name, Code, Absender/Absender-E-Mail und ein **Source**-Abzeichen (Default vs. Custom).

![Die Liste der E-Mail-Verwaltung — transaktionale Vorlagen mit Code, Absender und Quelle Default/Custom](/screenshots/react/melis-core/meliscore-tool-emailsmanagement-list.png)

Der Editor verfügt über **Allgemeine Eigenschaften** (Name, Code, Absender, Antwort-an, Ersetzungs-Tags,
Layout-Pfad) und einen Abschnitt **Inhalt pro Sprache** (Betreff + HTML-/Textkörper pro Sprache) mit
ersetzbaren Tags wie `[NAME]`, `[EMAIL]`, `[LOGIN]`. Das Speichern delegiert an
`MelisCoreBOEmailService::saveBoEmailByCode`.

![Die E-Mail-Eigenschaften — Name, Code, Absender, Antwort-an, Ersetzungs-Tags und Layout-Pfad](/screenshots/react/melis-core/meliscore-tool-emailsmanagement-edit-properties.png)

![Der Inhalt pro Sprache — Betreff, ein TinyMCE-HTML-Körper mit Tags `[NAME]`/`[EMAIL]`/`[LOGIN]` und eine Klartextversion](/screenshots/react/melis-core/meliscore-tool-emailsmanagement-edit-language.png)

## DSGVO

**Wo:** MelisCore → Administration → **DSGVO** (`/melis-core/gdpr`). Vier Tabs:

- **Daten** — suchen Sie eine Person nach Name/E-Mail; sehen Sie modulübergreifend die zu ihr gespeicherten
  Daten und **extrahieren** (XML-Export) oder **löschen** Sie dann die ausgewählten Datensätze.

  ![Der DSGVO-Tab Daten — Person suchen; Module liefern passende Daten zum Extrahieren oder Löschen](/screenshots/react/melis-core/meliscore-tool-gdpr-tab-data.png)

- **Banner** — konfigurieren Sie die Texte des DSGVO-Cookie-/Einwilligungsbanners pro Website + Sprache.
- **Anonymisierung** — die geplanten Konfigurationen für **automatisches Löschen / Datenaufbewahrung** (eine
  pro Website + Modul), mit **Ausführen** und **Protokollen**.

  ![Der Tab Anonymisierung — Konfigurationen zum automatischen Löschen, mit Protokollen, Ausführen und „+ New config"](/screenshots/react/melis-core/meliscore-tool-gdpr-tab-anonymization.png)

- **SMTP** — der Mailserver, der zum Versand der Anonymisierungs-Warnungs-E-Mails verwendet wird.

  ![Der Tab SMTP — Host / Benutzername / Passwort für Anonymisierungs-Warnungs-E-Mails](/screenshots/react/melis-core/meliscore-tool-gdpr-tab-smtp.png)

## Protokolle

**Wo:** MelisCore → Systemkonfiguration → **Protokolle** (`/melis-core/logs`). Ein schreibgeschütztes,
durchsuchbares **Aktivitätsprotokoll** — filtern Sie nach Typ, Titel, Benutzer und Datumsbereich, mit
KPI-Karten (Gesamt / Heute / Typen). Nicht-Administratoren sehen nur ihre eigenen Aktionen.

![Der Protokoll-Viewer — KPI-Karten, Filter für Typ/Titel/Benutzer/Datum und Aktivitätszeilen](/screenshots/react/melis-core/meliscore-tool-logs-list.png)

## Module

**Wo:** MelisCore → Systemkonfiguration → **Module** (`/melis-core/modules`). Aktivieren/deaktivieren und
**neu anordnen** (Drag-and-drop) Sie die Plattformmodule; jede Zeile zeigt das Modul, sein Paket, die
Version und die Abhängigkeiten. **Speichern** schreibt `config/melis.module.load.php` neu und löst
`meliscore_module_management_save_end` aus.

![Das Werkzeug Module — Suche, Anzahl aktiv, Ladereihenfolge per Drag-and-drop, Umschalter pro Modul, Abzeichen für Abhängigkeiten/Version](/screenshots/react/melis-core/meliscore-tool-modules-list.png)

## Weitere Konfiguration (Anmelde- und Passwortrichtlinie)

**Wo:** MelisCore → Systemkonfiguration → **Weitere Konfiguration** (`/melis-core/other-config`). Die
Sicherheitsrichtlinie: **Kontosperrung nach Fehlversuchen**, **Gültigkeitsdauer des Passworts**,
**Passwort-Wiederverwendung** und **Passwortkomplexität** (Mindestlänge + Anforderungen an
Klein-/Groß-/Ziffern-/Sonderzeichen). Wird über `MelisPasswordSettingsService` in `app.login.php`
geschrieben.

![Die Seite Weitere Konfigurationen — Umschalter für Sperrung, Passwortgültigkeit, Wiederverwendung und Komplexität](/screenshots/react/melis-core/meliscore-tool-other-config.png)

## Plattformen

**Wo:** MelisCore → Systemkonfiguration → **Plattformen** (`/melis-core/platforms`). Verwalten Sie die
**Umgebungen** (dev/staging/prod), mit KPI-Karten, Suche und **+ New platform**. Die **aktuelle** Plattform
ist markiert und ihr Name kann nicht geändert werden.

![Die Plattformliste — die „aktuelle" Plattform markiert, Spalten Marketplace/Cache, Bearbeiten/Löschen pro Zeile](/screenshots/react/melis-core/meliscore-tool-platforms-list.png)

![Der Plattformeditor — Name (gesperrt für die aktuelle Plattform), Umschalter für Marketplace-Updates und Cache](/screenshots/react/melis-core/meliscore-tool-platforms-edit.png)

## Plattform-Design

**Wo:** MelisCore → Systemkonfiguration → **Plattform-Schema** (`/melis-core/platform-scheme`).
Konfigurieren Sie das **Branding** des Back-Office: das Logo der Kopfzeile, das **linke Panel der Anmeldung**
(Logo, Hintergrund, Titel/Untertitel pro Sprache) und das Favicon. **Restore to Default** setzt es zurück.

![Die Seite Plattform-Design — Logo der Back-Office-Kopfzeile und das Branding des linken Anmeldepanels](/screenshots/react/melis-core/meliscore-tool-platformscheme.png)

> In React gibt es zwei Design-Controller unter demselben Rechte-Knoten
> `meliscore_tool_platform_scheme`: diese Seite **Plattform-Design** (React-Branding — Logos, Anmeldung,
> Favicon) und das klassische **Farbschema** (Back-Office-Farben, generiert `schemes.css` neu).

## Native Werkzeuge → Controller und Capabilities

Jedes native React-Werkzeug ist einem `MelisReactApi*Controller` (in `src/Controller/`) zugeordnet, der in
`config/react-api.php` deklariert und durch einen rechtetragenden `melisKey` geschützt ist. Erweiterte
**Capabilities** pro Aktion werden in `config/react.capabilities.php` deklariert und serverseitig
durchgesetzt (in der Oberfläche standardmäßig erlaubt).

| Werkzeug (Route) | Controller | melisKey / Guard | Capabilities |
| --- | --- | --- | --- |
| Benutzer (`/melis-core/user`) | `MelisReactApiUserController` | `meliscore_tool_user` | list, create, edit, delete, export |
| Mein Konto (`/melis-core/account`) | `MelisReactApiUserProfileController` | `meliscore_user_profile` (nur auth) | — |
| Ankündigung | `MelisReactApiAnnouncementController` | `melis_core_announcement_tool` | list, create, edit, delete, export |
| E-Mails | `MelisReactApiEmailsController` | `meliscore_tool_emails_mngt` | list, create, edit, delete |
| DSGVO | `MelisReactApiGdprController` | `melis_core_gdpr` | durchgesetzt, nicht deklariert → standardmäßig erlaubt |
| Sprachen | `MelisReactApiLanguageController` | `meliscore_tool_language` | list, create, edit, delete |
| Protokolle | `MelisReactApiLogController` | `meliscore_logs_tool` (schreibgeschützt) | list |
| Module | `MelisReactApiModulesController` | `meliscore_tool_user_module_management` | list, edit |
| Weitere Konfiguration | `MelisReactApiOtherConfigController` | `meliscore_tool_other_config` | list, edit |
| Plattformen | `MelisReactApiPlatformController` | `meliscore_tool_platform` | list, create, edit, delete |
| Plattform-Design | `MelisReactApiPlatformScheme(React)Controller` | `meliscore_tool_platform_scheme` | list, edit |
| Auth (öffentlich) | `MelisReactApiAuthController` | keiner (forgot/reset/i18n) | — |

Jede geschützte Aktion durchläuft dasselbe zweizeilige Gate:

```php
private const MELIS_KEY = 'meliscore_tool_user';
if ($deny    = $this->denyUnlessAccess())    { return $deny; }    // 401 unauth / 403 canAccess(MELIS_KEY)
if ($denyCap = $this->denyUnlessCan('list')) { return $denyCap; } // capability (CapabilityGuardTrait)
```

## Die react-api

Die Hülle nutzt eine **generische** `react-api` (aus dem Modul `MelisReactApi`) sowie die Routen der
**nativen** Werkzeuge (aus MelisCore). Basis `/melis/react-api`, Vertrag `{ success, data, error }`; jeder
Aufruf sendet `X-Requested-With: XMLHttpRequest` und `credentials: 'include'`.

| Methode und URL | Zweck |
| --- | --- |
| `GET /melis/react-api/me` | Aktueller Benutzer (id, name, login, email, picture, isAdmin, capabilities). |
| `GET /melis/react-api/menu[?full=1]` | Rechtebasiert gefilterter Werkzeugbaum (`full=1` = ungefiltert, nur Rechte-Editor). |
| `GET /melis/react-api/react-modules` | Aktive Module, die einen Brick liefern + die zusammengefügte Bundle-URL. |
| `GET /melis/react-api/langs` · `/assets` · `/i18n?locale=…` | BO-Sprachen, Plattform-Assets, öffentliche Übersetzungen. |
| `GET /melis/react-api/dashboard/{bubbles,stats,layout}` · `POST …/layout` | Dashboard-Daten + gemeinsames Layout. |
| `GET/POST /melis/react-api/{users\|languages\|platforms\|emails\|…}` | CRUD der nativen Werkzeuge (pro Controller oben). |

Beispiel — eine native Keyset-Liste und ein Speichervorgang:

```ts
// GET a keyset page of platforms
const r = await fetch('/melis/react-api/platforms?limit=25&sort=plf_id&dir=desc', {
  headers: { 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'include',
})
const { success, data } = await r.json()   // { success, data: { items, total, nextCursor } }

// POST save a language
await fetch('/melis/react-api/languages/save', {
  method: 'POST',
  headers: { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ id: null, locale: 'de_DE', name: 'Deutsch' }),
})
```

## Wichtige Services (unverändert)

Registriert als `service_manager`-Aliase in `config/module.config.php` — das PHP-Rückgrat, durch das die
React-Werkzeuge aufrufen:

| Service-Alias | Rolle |
| --- | --- |
| `MelisCoreConfig` | Laufzeit-Konfigurationsbaum über die zusammengeführten `app.*`-Dateien: `getItem('/meliscore/interface/…')`, `getItemPerPlatform('/meliscore/datas/')`, `getFormMergedAndOrdered(…)`. |
| `MelisCoreAuth` | Back-Office-Authentifizierung: `hasIdentity()`, `getIdentity()`, `getAuthRights()`, `encryptPassword()`, `isPasswordCorrect()`. |
| `MelisCoreRights` | Zugriffssteuerung pro Werkzeug: `canAccess($melisKey)`, `getRightsValues($id, $isRole)`, `createXmlRightsValues(…)`. |
| `MelisCoreTool` | Back-Office-Werkzeug-Helfer (Spalten, Formulare, DataTable-Konfiguration) für klassische/Iframe-Werkzeuge. |
| `MelisCoreBOEmailService` | Transaktionale Vorlagen: `sendBoEmailByCode()`, `getBoEmailByCode()`, `saveBoEmailByCode()`, `deleteEmail()`. |
| `MelisCoreGdprService` / `MelisCoreGdprAutoDeleteService` | DSGVO-Auskunft/-Löschung und die geplante Aufbewahrungs-Engine. |
| `MelisCoreTranslation` | Lädt und führt `tr_*`-Übersetzungen pro Locale zusammen (beim Sprachspeichern neu generiert). |
| `MelisGeneralService` | Basisklasse, die die meisten Services erweitern — `sendEvent()`, `makeArrayFromParameters()`, `getServiceManager()`. |

## Event-System

`MelisGeneralService` löst weiterhin `*_start` / `*_end`-Events rund um jede Service-Methode aus, sodass
jedes Modul eingreifen kann. Hängen Sie sich über den gemeinsam genutzten Event-Manager ein:

```php
$sm->get('SharedEventManager')->attach(
    'MelisCore',
    'meliscore_tooluser_savenew_end',
    function ($e) { $p = $e->getParams(); /* react */ },
    100
);
```

Häufige Core-Events: `meliscore_tooluser_savenew_start/end`, `…delete_start/end`, `…save_start/end`,
`melis_core_check_user_rights`, `meliscore_install_create_new_user`, `melis_core_new_platform`,
`meliscore_module_management_save_end` und die DSGVO-Events (`melis_core_gdpr_user_info_event`,
`…_extract_event`, `…_delete_event`, `melis_core_gdpr_auto_delete*`).

## Datenbanktabellen

| Tabelle | Enthält |
| --- | --- |
| `melis_core_user` | Back-Office-Benutzer (login, Passwort-Hash, `usr_rights` XML, Admin-Kennzeichen, Sprache, Rolle). |
| `melis_core_user_role` | Rollen und ihr `urole_rights` XML. |
| `melis_core_user_connection_date` | Anmeldeverlauf. |
| `melis_core_lang` | Back-Office-Sprachen. |
| `melis_core_platform` | Umgebungen/Plattformen. |
| `melis_core_bo_emails` / `_details` | Transaktionale E-Mail-Vorlagen und Körper pro Sprache. |
| `melis_core_log` / `_log_type` / `_log_type_trans` | Aktionsprotokoll, Typen und Übersetzungen. |
| `melis_core_lost_password` | Tokens zum Zurücksetzen des Passworts. |
| `melis_core_microservice_auth` | API-Schlüssel für Micro-Service-Endpunkte. |
| `melis_core_dashboards` / `_dashboard_schema` | Dashboard-Layout pro Benutzer. |
| `melis_core_plugins` | Registrierte Plugins. |
| `melis_core_gdpr_delete_config` / `_delete_emails_logs` | DSGVO-Regeln zum automatischen Löschen und Audit-Trail. |
| `melis_user_password_history` | Passwortverlauf (Verhinderung der Wiederverwendung). |
| `melis_announcement` | Back-Office-Ankündigungen. |

## Wichtige Dateien

| Aspekt | Pfad |
| --- | --- |
| Modul-Bootstrap | `vendor/melisplatform/melis-core/src/Module.php` |
| Routen, Services, Controller, View-Helper | `vendor/melisplatform/melis-core/config/module.config.php` |
| Klassische Back-Office-Hülle und Werkzeugbaum (Interface) | `vendor/melisplatform/melis-core/config/app.interface.php` |
| DataTable-Werkzeugdeklarationen | `vendor/melisplatform/melis-core/config/app.tools.php` |
| Micro-Service-Endpunkte | `vendor/melisplatform/melis-core/config/app.microservice.php` |
| Native react-api-Routen + Controller | `config/react-api.php` + `src/Controller/MelisReactApi*Controller.php` |
| Capabilities der nativen Werkzeuge | `config/react.capabilities.php` |
| Quellcode der React-Anwendung | `vendor/melisplatform/melis-core/ui-react/src/` |
| Gebaute React-Anwendung (eingecheckt) | `vendor/melisplatform/melis-core/public/ui-react/` |
| Services · Controller · Table-Gateways | `src/Service/` · `src/Controller/` · `src/Model/Tables/` |
| Install-SQL und Migrationen · Übersetzungen | `install/` · `language/` |

Siehe auch: [Modulreferenz](/de/reference/modules), [Ein Werkzeug erstellen](/de/guide/create-a-tool),
[Plugins](/de/guide/plugins)
