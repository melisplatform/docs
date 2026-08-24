# MelisTemplatingPluginCreator

> Ein Backoffice-Assistent, der ein vollständiges Frontoffice-**Templating-Plugin** — Konfiguration,
> Controller, View, Modalformular, Assets und Übersetzungen — in ein neues oder bestehendes Modul
> gerüstet. In v6 wird er als nativer React-Baustein ausgeliefert, der eine JSON-`react-api` aufruft,
> mit einem New/Old-Umschalter zum alten Werkzeug.
> Paket `melisplatform/melis-templating-plugin-creator`.

## Zweck

MelisTemplatingPluginCreator ist ein Codegenerator, keine Laufzeitfunktion. Er führt Sie durch einen
**6-stufigen Assistenten** — Plugin-Name, Zielmodul, lokalisierte Menütexte, Eigenschaften (Felder),
Übersetzungen — und schreibt anschließend ein einsatzbereites Templating-Plugin in das Zielmodul. Das
generierte Plugin erweitert `MelisEngine\Controller\Plugin\MelisTemplatingPlugin`, sodass es sich nach
der Erstellung wie jedes von Hand geschriebene Templating-Plugin verhält — lesen Sie
[Plugins](/de/guide/plugins), um die Ausgabe zu verstehen und anzupassen.

## Aktivierung

Es ist ein Standard-Laminas-Modul. Fügen Sie es in `config/melis.module.load.php` hinzu:

```php
return [
    // …
    'MelisTemplatingPluginCreator',
];
```

Composer-Abhängigkeiten (`composer.json`): `melis-core`, `melis-tool-creator`, `melis-cms`. Wenn das
Ziel ein **neues** Modul ist, delegiert das Werkzeug an `MelisToolCreatorService::createTool()`, um
zunächst das Modul zu gerüsten. Es ist keine Datenbank erforderlich, aber das Verzeichnis `module/`
und ein Ordner `tpc/temp-thumbnail/` unterhalb des öffentlichen Dokument-Roots müssen beschreibbar
sein (die GD-Erweiterung wird ebenfalls für die Thumbnail-Validierung benötigt). Der React-Baustein
zeigt diese als **blockierende** Preflight-Hinweise an, wenn das Dateisystem nicht beschreibbar ist
oder GD fehlt.

## Das React-Backoffice

Der Assistent ist ein **nativer Voll-React-Baustein** (kein iframe), der in `/melis-react` eingebunden
wird. Er öffnet sich als oberer Tab mit dem Namen **Templating Plugin Creator** mit einer 6-stufigen
Leiste und einem **New / Old**-Umschalter (oben rechts, neben **Restart**). *Old* greift auf das alte
jQuery-Werkzeug in einem iframe zurück; *New* (Standard) ist der React-Assistent. Der Baustein ist
`persistent`: Beim Verlassen des Werkzeug-Tabs und Zurückkehren gehen weder der Entwurf noch der
aktuelle Schritt verloren. Die 6 Schritte sind per CSS ein-/ausgeblendete Bereiche auf einer einzigen
eingebundenen Seite.

![Schritt 1 (Plugin) des React-Assistenten: Plugin-Name, Plugin-Ziel (New module / Existing site module) mit einem Feld für den neuen Modulnamen, die 6-stufige Leiste und die Schaltfläche Next](/screenshots/react/melis-templating-plugin-creator/melistemplatingplugincreator-tool-step1.png)

Die gesamte Geschäftslogik bleibt serverseitig: Die Validierung baut die alten Laminas-Formulare neu
auf (dieselben Validatoren, Meldungen und Regeln), und die Generierung ruft
`MelisTemplatingPluginCreatorService` auf. React ist Präsentation + API-Aufrufe.

### Die 6 Schritte

| Schritt | Name | Was Sie tun |
| --- | --- | --- |
| 1 | Plugin | Plugin-Name + Ziel: **New module** (blendet ein Feld für den neuen Modulnamen ein) oder **Existing site module** (Modul-Dropdown). |
| 2 | Menu Texts & Display | Titel/Beschreibung je Sprache, angezeigt in der Plugin-Liste des Seiteneditors (≥1 Sprache) + erforderlicher Thumbnail-Upload (GIF/JPG/PNG, ~190×100, ≤500 kB). |
| 3 | Main Properties | Anzahl der Eigenschaften (1–25, `template_path` inbegriffen); je Feld ein technischer Name, Anzeigetyp, Pflicht-Kennzeichen und Standardwert. Eigenschaft 1 ist das erzwungene, schreibgeschützte `template_path`. |
| 4 | Properties' Translation | Bezeichnung + Tooltip je Sprache für jedes Feld (plus eine Bezeichnung je Dropdown-Option); eine vollständige Sprache genügt. |
| 5 | Summary | Schreibgeschützte Zusammenfassung der Schritte 1→4, Zielmodul und berechneter Template-Pfad. Hier wird nichts geschrieben. |
| 6 | Finalization | Optional eine **Site** zur Aktivierung auswählen und **Activate plugin after creation** umschalten, dann **Finish and create the plugin**. |

`template_path` ist stets die erzwungene erste Eigenschaft, serverseitig berechnet als
`<Module>/plugins/<plugin-view-name>` und niemals vom Client übermittelt. **Schritt 6 ist die einzige
verändernde Operation**: Er schreibt die Plugin-Dateien und — im Zweig für das neue Modul — gerüstet
das Modul, registriert es optional in der `module.load.php` der gewählten Site, aktiviert es und
invalidiert den Cache der Modulpfade (die Aktivierung erfordert einen Plattform-Neustart, angezeigt
als Countdown). Zu den verfügbaren Anzeigetypen gehören `MelisText`, `Dropdown`, `DatePicker`,
`DateTimePicker`, `PageInput`, `NumericInput`, `Switch`, `Textarea`, `MelisCoreTinyMCE`.

![Schritt 2 (Menu Texts & Display): Titel und Beschreibung je Sprache (English / Français) plus die erforderliche Plugin-Thumbnail-Karte mit Vorschau und Remove thumbnail](/screenshots/react/melis-templating-plugin-creator/melistemplatingplugincreator-tool-step2.png)

![Schritt 3 (Main Properties): Anzahl der Eigenschaften (1–25) und Eigenschaft 1, das erzwungene, schreibgeschützte template_path mit seinem serverseitig berechneten Standardwert](/screenshots/react/melis-templating-plugin-creator/melistemplatingplugincreator-tool-step3.png)

![Schritt 6 (Finalization): das Site-Dropdown, der Umschalter Activate plugin after creation und die Schaltfläche Finish and create the plugin](/screenshots/react/melis-templating-plugin-creator/melistemplatingplugincreator-tool-step6.png)

## React-API

Die Routen befinden sich in `config/react-api.php`, bereitgestellt durch
`MelisReactApiTemplatingPluginCreatorController`, alle unter `/melis/react-api/tpc`, Vertrag
`{ success, data, error }`. Ein Validierungsfehler ist **kein** HTTP-Fehler: `POST /tpc/step/:step`
gibt `{ valid:false, errors:{…} }` zurück, damit die Oberfläche Meldungen je Feld anzeigen kann.

| Methode & URL | Zweck |
| --- | --- |
| `GET /tpc/context` | Preflight (Prüfung auf FS-Beschreibbarkeit + GD → `blocking[]`), Schritt-Metadaten, Sprachen, Site-Module, Sites, Anzeigetypen, `maxFields` (25), Thumbnail-Grenzwerte. |
| `GET /tpc/state` | Wiederherstellung des Assistenten aus der gemeinsamen Session. |
| `POST /tpc/reset` | Restart: Session-Entwurf + temporäres Thumbnail löschen. |
| `POST /tpc/step/:step` (`1–4`) | Einen Schritt validieren + speichern → `{ valid, errors }`. |
| `POST /tpc/thumbnail` · `POST /tpc/thumbnail/remove` | Plugin-Thumbnail hochladen / entfernen. |
| `GET /tpc/translation-fields` | Zu übersetzende Felder (abgeleitet aus Schritt 3). |
| `GET /tpc/summary` | Schreibgeschützte Zusammenfassung der Schritte 1→4 + Zielmodul + Template-Pfad. |
| `POST /tpc/generate` | **Das Plugin generieren** (Dateien schreiben, optional ein Modul gerüsten + aktivieren). |

## Berechtigungen (erweiterte Rechte)

Deklariert in `config/react.capabilities.php` unter dem rechtetragenden melisKey
`melistemplatingplugincreator_tool` (derselbe Schlüssel, den das Manifest und die Zugriffsprüfung des
Controllers verwenden). Die Semantik ist **default-allow**. Abgeflachte Berechtigungs-Strings:

| Berechtigung | Steuert |
| --- | --- |
| `wizard` · `wizard.edit` | Schritte 1→4 konfigurieren/validieren (ohne `wizard.edit` ist der gesamte Assistent schreibgeschützt). |
| `thumbnail` · `thumbnail.create` · `thumbnail.delete` | Thumbnail hochladen / entfernen (Schritt 2). |
| `summary` · `summary.list` | Zusammenfassung lesen (Schritt 5). |
| `finalization` · `finalization.create` | **Das Plugin generieren** (Schritt 6) — die sensible Berechtigung. |

Jede Controller-Aktion ist doppelt abgesichert — `denyUnlessAccess()` (Authentifizierung + `canAccess`)
und anschließend `denyUnlessCan(cap)`. Das Ausblenden von Steuerelementen in der Oberfläche dient nur
der UX; der Server verweigert ungeachtet dessen.

## Wichtige Services

Registriert als `service_manager`-Alias in `config/module.config.php`.

| Alias | Rolle |
| --- | --- |
| `MelisTemplatingPluginCreatorService` | Generiert (und macht rückgängig) das Templating-Plugin aus den in der Session gespeicherten Assistenten-Daten. |

`MelisTemplatingPluginCreatorService` (erweitert `MelisCore\Service\MelisGeneralService`) stellt
insbesondere bereit:

| Methode | Rolle |
| --- | --- |
| `generateTemplatingPlugin()` | Einstiegspunkt: liest die Session-Schritte und schreibt alle Plugin-Dateien; macht bei jedem Fehler alles rückgängig. Gibt einen Boolean zurück. |
| `getSiteTemplatingPluginNames($siteModule)` | Listet die bestehenden Templating-Plugin-Namen eines Site-Moduls auf (dient dazu, doppelte Plugin-Namen abzulehnen). |
| `generateModuleNameCase($str)` / `convertToViewName($string)` | Normalisiert einen Namen zu einem gültigen Modulnamen / View-Verzeichnisnamen. |
| `getTempThumbnail()` | Ermittelt den temporären Pfad des hochgeladenen Plugin-Thumbnails für die aktuelle Session. |

Intern führt `generateTemplatingPlugin()` `performGeneration()` aus, das die Plugin-Konfiguration
(`config/plugins/<Module><Plugin>Plugin.config.php`) schreibt, die Ziel-`module.config.php` aktualisiert
(`template_map` + `controller_plugins`), Übersetzungen je Sprache anhängt, Assets generiert
(css/js + Thumbnail), den Controller (`src/<Module>/Controller/Plugin/<Module><Plugin>Plugin.php`),
die Front-View und das Modalformular, und die neue Konfiguration aus der `Module.php` des Moduls
einbindet. Der React-Controller schreibt seinen Assistenten-Zustand in denselben **Session-Container**
wie das alte Werkzeug (`templatingplugincreator`), da der Service ihn in seinem Konstruktor als
Snapshot festhält.

## Frontoffice

Dieses Modul fügt **kein** eigenes Frontoffice-Plugin oder View-Helper zur Laufzeit hinzu. Stattdessen
**generiert** es ein Templating-Plugin in das Zielmodul: eine Controller-Plugin-Klasse, die
`MelisEngine\Controller\Plugin\MelisTemplatingPlugin` erweitert, mit `loadDbXmlToPluginConfig()` /
`savePluginConfigToXml()`, die mit den konfigurierten Feldern verdrahtet sind, eine
`config/plugins/*.config.php` (Abschnitte `front` + `melis`, ein **Properties**-Tab), eine Front-`.phtml`,
eine Modalformular-`.phtml` sowie css/js-Assets. Das generierte Plugin erscheint anschließend im
Plugin-Menü des CMS-Seiteneditors und wird wie jedes andere Templating-Plugin in eine
`MelisDragDropZone` gezogen — siehe [Plugins](/de/guide/plugins) und
[Eine Site erstellen](/de/guide/build-a-site).

## Datenbanktabellen

Keine. Dieses Werkzeug generiert ausschließlich Quelldateien und speichert seinen laufenden
Assistenten-Zustand in einem Laminas-Session-Container (`templatingplugincreator`); es werden keine
`melis_*`-Tabellen installiert.

## Beispiel

Das generierte Plugin wird wie jedes Templating-Plugin verwendet. Auf der Service-Seite ruft der
letzte Schritt des Assistenten Folgendes auf:

```php
$tpcService = $serviceManager->get('MelisTemplatingPluginCreatorService');
$result = $tpcService->generateTemplatingPlugin(); // true bei Erfolg, Dateien in das Zielmodul geschrieben
```

## Wichtige Dateien

| Betrifft | Pfad |
| --- | --- |
| Modul / Laden der Konfiguration | `vendor/melisplatform/melis-templating-plugin-creator/src/Module.php` |
| Verdrahtung (Service, Formularelemente, Views) | `vendor/melisplatform/melis-templating-plugin-creator/config/module.config.php` |
| React-API-Routen + Invokable | `vendor/melisplatform/melis-templating-plugin-creator/config/react-api.php` |
| React-Berechtigungen | `vendor/melisplatform/melis-templating-plugin-creator/config/react.capabilities.php` |
| Assistenten-Formulare + Schritt-Konfiguration (für die Validierung wiederverwendet) | `vendor/melisplatform/melis-templating-plugin-creator/config/app.tools.php` |
| React-API-Controller | `vendor/melisplatform/melis-templating-plugin-creator/src/Controller/MelisReactApiTemplatingPluginCreatorController.php` |
| Alter Assistenten-Controller (Old-View-iframe) | `vendor/melisplatform/melis-templating-plugin-creator/src/Controller/TemplatingPluginCreatorController.php` |
| Generator-Service | `vendor/melisplatform/melis-templating-plugin-creator/src/Service/MelisTemplatingPluginCreatorService.php` |
| React-Baustein (Quelle + gebaut) | `vendor/melisplatform/melis-templating-plugin-creator/ui-react/` · `public/ui-react/` |

Siehe auch: [Modulreferenz](/de/reference/modules) · [Plugins](/de/guide/plugins) ·
[Ein Werkzeug erstellen](/de/guide/create-a-tool) · [Eine Site erstellen](/de/guide/build-a-site).
