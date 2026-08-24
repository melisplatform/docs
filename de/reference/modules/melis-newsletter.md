# MelisNewsletter

> Verwandelt eine CMS-Seite in einen personalisierten E-Mail-Newsletter und stellt ihn an Abonnentengruppen zu – jetzt gesteuert über ein natives React-Backoffice. Paket `melisplatform/melis-newsletter`.

## Zweck

MelisNewsletter verwendet das CMS-Seitensystem als Newsletter-Vorlage wieder: Eine als Typ
**NEWSLETTER** gekennzeichnete Seite wird als HTML gerendert, pro Empfänger über BB-Codes (`[NAME]`,
`[FIRSTNAME]`, `[EMAIL]`, `[UNSUBSCRIBELINK]`) personalisiert und über einen konfigurierbaren
Mail-Transport an ausgewählte Abonnenten und/oder Gruppen versendet. Abonnenten werden in einer
Liste pro Website organisiert und können in Gruppen segmentiert werden. Jeder Versand wird mit
einem vollständigen HTML-Snapshot und einem Protokoll pro Empfänger archiviert; ein
Abmelde-Front-Plugin und eine vollständige DSGVO-Integration sind von Haus aus enthalten.

In v6 wird das Werkzeug als **native reine React-Brick** im `/melis-react`-Backoffice ausgeliefert.
Die Geschäftslogik (Services, Versandmechanismus, DSGVO, Tabellen) bleibt unverändert; lediglich die
Anzeigeschicht wurde nach React verlagert und wird über eine vom Modul bereitgestellte
`react-api`-JSON-Schicht ausgeliefert.

## Aktivierung

Zu `config/melis.module.load.php` hinzufügen:

```php
return [
    'MelisNewsletter',
];
```

Benötigt `melis-core` und `melis-cms`; funktional stützt es sich zudem auf `melis-engine` und
`melis-front` für das Seiten-Rendering und das Abmelde-Plugin. Das React-Werkzeug erscheint **nur
dann im Menü, wenn das Modul aktiviert ist** (modulare Brick-Erkennung über
`GET /melis/react-api/react-modules`). Wird `MelisNewsletter` aus `melis.module.load.php` entfernt,
verschwindet die Brick.

## Backoffice (React)

Linke Seitenleiste → **MelisMarketing → Newsletter** (`fa fa-newspaper-o`), Mount-Route
`/melis-marketing/melis-newsletter-tool-config`. Es öffnet sich als einzelnes Werkzeug, dessen
Kopfzeile den Titel *Newsletters*, den Untertitel *"Subscribers, groups, history and send
configuration"* und einen **New / Old**-Umschalter (oben rechts) trägt. *New* ist die React-Oberfläche
(Standard); *Old* rendert das Legacy-Werkzeug in einem iframe
(`/melis/react-tool-page?key=melis_newsletter_tool_display`).

Anders als bei einem Werkzeug mit Host-Untertabs rendert Newsletter seine vier Ansichten als
**eigene React-Tabs**:

| Tab | Inhalt |
| --- | --- |
| Subscribers | KPI-Karten (Total / Active / Inactive), Suche, Status- + Website-Filter, Spaltenmanager, CSV-**Import**, **Export**, **Auswahl zu Gruppe(n) hinzufügen**, **+ Neuer Abonnent**. Tabelle: Status / E-Mail / Vorname / Nachname / Website / Gruppen mit Bearbeiten/Löschen pro Zeile |
| Groups | KPI-Karten, Suche, Statusfilter, Export, **+ Neue Gruppe**. Tabelle: Status / Name / Erstellt / Mitglieder (Anzahl) mit Bearbeiten/Löschen |
| History | Schreibgeschütztes Archiv. KPI-Karten (Sends / Sites / Today), Suche, Website-Filter, Export. Tabelle: Seite / Website / Version / Gesendet am mit einem **Auge** pro Zeile zur Anzeige des exakt archivierten HTML |
| Configuration | Die einzige globale SMTP-**Transportkonfiguration**: Host / Benutzername / Passwort (+ Bestätigung). Leer = der Melis-Standardtransport |

![Der Tab „Subscribers“ im React-Newsletter-Werkzeug](/screenshots/react/melis-newsletter/melisnewsletter-tool-newsletter-tab-subscribers.png)

Das Öffnen oder Anlegen eines **Abonnenten** oder einer **Gruppe** öffnet keinen neuen Haupttab –
es öffnet den Datensatz-Editor (SubscriberForm / GroupForm) in einem nativen **Host-Untertab**
(Drill-down, mit Schlüssel `s-<id>` / `g-<id>`). Das Abonnentenformular enthält Vor-/Nachname,
E-Mail, Website, einen Active-Umschalter und Gruppenmitgliedschaften; das Gruppenformular enthält
den Namen, einen Active-Umschalter und die Mitglieder der Gruppe (Hinzufügen/Entfernen +
Abonnentenauswahl).

![Der Tab „Groups“ im React-Newsletter-Werkzeug](/screenshots/react/melis-newsletter/melisnewsletter-tool-newsletter-tab-groups.png)

![Der Tab „History“ im React-Newsletter-Werkzeug](/screenshots/react/melis-newsletter/melisnewsletter-tool-newsletter-tab-history.png)

![Der Tab „Configuration“ im React-Newsletter-Werkzeug](/screenshots/react/melis-newsletter/melisnewsletter-tool-newsletter-tab-config.png)

Aus Sicherheitsgründen wird das gespeicherte SMTP-Passwort **niemals an den Browser zurückgegeben** –
die Felder zeigen einen maskierten Platzhalter, und wenn sie beim Speichern leer bleiben, wird das
aktuelle Passwort beibehalten.

### Versand eines Newsletters

Die Aktion **Send** ist kein Tab. Es handelt sich um einen Modaldialog (`NewsletterSendModal`), der
über `window.__melisNewsletterSendModal` bereitgestellt wird und den der **React-Seiteneditor
rendert** – für Seiten vom Typ **NEWSLETTER**. Legen Sie einen Betreff fest, wählen Sie Gruppen
und/oder Abonnenten aus, versenden Sie zunächst einen **Test** an einen ausgewählten Abonnenten oder
eine freie E-Mail-Adresse und klicken Sie dann auf **Send**. Bei Erfolg wird ein
`melis:newsletter-sent`-Ereignis ausgelöst, sodass sich der persistente History-Tab aktualisiert.
Personalisierungsvariablen im Inhalt: `[NAME]`, `[FIRSTNAME]`, `[EMAIL]`, `[UNSUBSCRIBELINK]`.
Veröffentlichen Sie die Seite vor dem Versand.

## React-API

Die Routen liegen in `config/react-api.php` (zusammengeführt über
`MelisNewsletter\Module::getConfig()`) und werden als Unterrouten der generischen
`melis-react-api`-Brücke unter `/melis/react-api/newsletter` ausgeliefert. Controller
`MelisNewsletter\Controller\MelisReactApiNewsletterController`; JSON-Vertrag
`{ success, data, error }`; jede Anfrage führt `X-Requested-With: XMLHttpRequest` + Credentials mit.
Ausgewählte Endpunkte:

| Methode & URL (relativ zu `/melis/react-api/newsletter`) | Zweck |
| --- | --- |
| `GET /subscribers` · `/subscribers/stats` · `/subscribers/:id` | Keyset-Liste (`search`, `active`, `site`, `group`, `sort`, `dir`, `after`), KPI, ein Datensatz |
| `POST /subscribers/save` · `/subscribers/import` | Anlegen/Aktualisieren; CSV-Massenimport → `{imported,skipped,errors}` |
| `DELETE /subscribers/delete/:id` | Löschen |
| `GET /groups` · `/groups/stats` · `/groups/:id` · `/groups/:id/members` | Gruppenliste, KPI, Datensatz, Mitglieder |
| `POST /groups/save` · `/groups/:id/members/add` · `/groups/members/bulk-add` | Speichern; Mitglied hinzufügen; `subscriberIds[]` massenweise `groupIds[]` zuweisen |
| `DELETE /groups/delete/:id` · `/groups/members/remove/:mid` | Gruppe löschen; Mitgliedschaft entfernen (`mid` = `nlgu_id`) |
| `GET /history` · `/history/stats` · `/history/:id` | Liste des Versandarchivs, KPI, archiviertes HTML eines Versands |
| `GET /config` · `POST /config/save` | SMTP-Konfiguration (Passwort wird nicht zurückgegeben; nur `hasPassword`) / Speichern |
| `GET /send-options` · `POST /send` · `POST /test` | Optionen des Versand-Modaldialogs; senden; Testversand |

Der React-Controller **verwendet den Laminas-Service des Moduls wieder** (`MelisNewsletterService`)
für die eigentliche Arbeit – Versand/Test laufen über `sendNewsletter()` / `testNewsletter()` /
`testNewsletterCustomMail()`, und die Validierungen spiegeln `saveSubscriber` /
`importFileValidator` / `saveConfig` wider – sodass der React-Pfad die exakten Legacy-Geschäftsregeln
reproduziert.

## Berechtigungen (erweiterte Rechte)

Deklariert in `config/react.capabilities.php` unter dem rechtetragenden Knoten
**`melis_newsletter_tools_section`** (nicht dem Manifest-/Zonenschlüssel
`melis_newsletter_tool_display`). Ein Baum pro Tab plus eine tab-übergreifende `send`-Aktion,
abgeflacht zu punktgetrennten Zeichenketten:

```
melis_newsletter_tools_section
├─ action: send                              (Send / Test — the page-editor modal)
├─ tab subscribers: list · create · edit · delete · export
├─ tab groups:      list · create · edit · delete · export
├─ tab history:     list                     (read-only)
└─ tab config:      edit                     (SMTP transport)
```

React liest sie über `useCaps('melis_newsletter_tools_section').can('…')` und schaltet damit seine
Aktionsschaltflächen frei; serverseitig wird jede verändernde Aktion abgesichert (`denyUnlessAccess()`
danach `denyUnlessCan()`). `react.capabilities.php` führt außerdem eine `newsletter`-Aktion unter dem
gemeinsam genutzten Knoten `meliscms_page` zusammen, sodass die Send-Schaltfläche im Seiteneditor
unter Users → Rights steuerbar ist.

## Wichtige Services

| Service-Alias | Rolle |
| --- | --- |
| `MelisNewsletterService` | Zentraler Service für Abonnenten, Gruppen, Versand/Test, Archiv und Konfiguration. Löst `*_start` / `*_end`-Ereignisse aus. |
| `MelisNewsletterGdprAutoDeleteService` | Implementiert `MelisCoreGdprAutoDeleteInterface`; steuert den geplanten DSGVO-Warn-/Löschablauf für inaktive Abonnenten. |

Table-Gateway-Aliase: `MelisNewsletterSubscribersTable`, `MelisNewsletterGroupsTable`,
`MelisNewsletterGroupsPeopleTable`, `MelisNewsletterArchiveTable`,
`MelisNewsletterRecipientsTable`, `MelisNewsletterConfigTable`.

## Versandmechanismus

`MelisNewsletterService::sendNewsletter($pageId, $subscribers, $groups, $mailSubject)`:

1. **Empfänger auflösen** – explizite Abonnenten + Gruppenmitglieder über `getSubscribersInGroup()`,
   nur auf aktive gefiltert, dedupliziert.
2. **Inhalt rendern** – CMS-Seite wird als HTML abgerufen; relative `href`/`src` werden in absolute
   URLs umgeschrieben.
3. **Personalisieren** – BB-Codes werden pro Empfänger ersetzt; `[UNSUBSCRIBELINK]` trägt das
   gehashte Token.
4. **Versenden** – über den konfigurierten SMTP-Transport oder den Plattform-Standard.
5. **Archivieren** – eine `nlan_*`-Zeile pro Versand (Website, Seite, Version, vollständiges HTML,
   Versanddatum) und eine `nlus_*`-Zeile pro Empfänger.

**Testversand** (`testNewsletter()` / `testNewsletterCustomMail()`) stellt an einen Abonnenten oder
eine beliebige E-Mail-Adresse zu, ohne zu archivieren, und ist erforderlich, bevor ein echter Versand
freigeschaltet wird.

## Frontoffice

| Plugin | Konfigurationsschlüssel | Beschreibung |
| --- | --- | --- |
| `MelisNewsletterUnsubscribePlugin` | `melisnewsletter` / `MelisNewsletterUnsubscribePlugin` | Auf einer `unsubscribe`-Seite platzieren. Liest das in `[UNSUBSCRIBELINK]` eingebettete Token `?s={hashed_id}`, ruft `deactivateSubscriberById()` auf und zeigt eine Erfolgs-/Fehlermeldung an. Stellt eine Einstellung `unsubscribe_data_salt` bereit, die beim Token-Hashing verwendet wird. |

Views: `plugins/unsubscribe.phtml` + `unsubscribe-modal-form.phtml`.

## DSGVO-Integration

Bindet das MelisCore-DSGVO-Framework sowohl für bedarfsgesteuerte als auch für geplante Abläufe ein:

- **Bedarfsgesteuert:** `MelisNewsletterGdprUserInfoListener`, `…UserExtractListener`,
  `…UserDeleteListener` finden, exportieren und löschen die Abonnentendaten einer Person auf Anfrage.
  Spalten: `nlu_firstname`, `nlu_name`, `nlu_email`, `nlu_date_creation` (deklariert in
  `config/app.gdpr.php`).
- **Geplantes automatisches Löschen:** `MelisNewsletterGdprAutoDeleteService` mit neun Listenern, die
  Modulregistrierung, DSGVO-Tag-Deklaration, Aufbau der Warnliste, Warn-E-Mails und die endgültige
  Löschung nicht reagierender inaktiver Abonnenten abdecken.

## Datenbanktabellen

| Tabelle (Alias → Spaltenpräfix) | Enthält |
| --- | --- |
| `MelisNewsletterSubscribersTable` (`nlu_*`) | Abonnentenzeilen pro Website: E-Mail, Vor-/Nachname, Status, Erstellungsdatum |
| `MelisNewsletterGroupsTable` (`nlg_*`) | Gruppendefinitionen: Name, Status, Erstellungsdatum |
| `MelisNewsletterGroupsPeopleTable` (`nlgu_*`) | Verknüpfung Abonnent ↔ Gruppenmitgliedschaft |
| `MelisNewsletterArchiveTable` (`nlan_*`) | Archiv pro Versand: Website, Seite, Version, vollständiger HTML-Body, Versanddatum |
| `MelisNewsletterRecipientsTable` (`nlus_*`) | Versandprotokoll pro Empfänger: Snapshot von Name/Vorname/E-Mail, Archiv-FK |
| `MelisNewsletterConfigTable` (`nlc_*`) | SMTP-Transportkonfiguration pro Website: Host, Benutzername, Passwort |

## Beispiel

```php
$nl = $serviceManager->get('MelisNewsletterService');

// Subscriber / group management (same service the react-api reuses)
$nl->saveSubscriber($data, $id);           // $id null → create
$nl->deactivateSubscriberById($id);
$nl->saveGroup($data, $id);
$nl->getSubscribersInGroup($grpId);

// Send flow
$nl->testNewsletter($pageId, $subId, $subject);
$nl->sendNewsletter($pageId, $subscribers, $groups, $subject);

// History & config
$nl->getNewsletterRecipients($archiveId);
$nl->saveNewsletterConfig($cfg);
```

## Wichtige Dateien

| Bereich | Pfad |
| --- | --- |
| React-API-Routen + aufrufbarer Controller | `vendor/melisplatform/melis-newsletter/config/react-api.php` |
| React-Berechtigungen (mit Schlüssel `melis_newsletter_tools_section`) | `vendor/melisplatform/melis-newsletter/config/react.capabilities.php` |
| React-API-Controller (verwendet `MelisNewsletterService` wieder) | `vendor/melisplatform/melis-newsletter/src/Controller/MelisReactApiNewsletterController.php` |
| React-Brick (Vite-Build) + Manifest | `vendor/melisplatform/melis-newsletter/public/ui-react/brick.js` · `brick.manifest.json` |
| Modulkonfiguration (Services, Table-Gateways, Controller, Plugin) | `vendor/melisplatform/melis-newsletter/config/module.config.php` |
| Hauptservice | `vendor/melisplatform/melis-newsletter/src/Service/MelisNewsletterService.php` |
| DSGVO-Service zum automatischen Löschen | `vendor/melisplatform/melis-newsletter/src/Service/MelisNewsletterGdprAutoDeleteService.php` |
| Abmelde-Front-Plugin | `vendor/melisplatform/melis-newsletter/src/Controller/Plugin/MelisNewsletterUnsubscribePlugin.php` |
| Table-Gateways | `vendor/melisplatform/melis-newsletter/src/Model/Tables/` |
| DB-Installation + Migrationen | `vendor/melisplatform/melis-newsletter/install/dbdeploy/` |

Siehe auch: [melis-core](/legacy/reference/modules/melis-core), [melis-cms](/legacy/reference/modules/melis-cms),
[melis-front](/legacy/reference/modules/melis-front), [melis-engine](/legacy/reference/modules/melis-engine)
