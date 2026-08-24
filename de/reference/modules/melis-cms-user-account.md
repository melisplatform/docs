# MelisCmsUserAccount

> Kontosystem für Front-Office-Website-Besucher — Registrierung, Anmeldung und standortspezifische Profile für Website-Mitglieder, verwaltet über ein natives React-Back-Office-Werkzeug. Paket `melisplatform/melis-cms-user-account`.

## Zweck

MelisCmsUserAccount verwaltet Konten von **Website-Besuchern** (Front-Office) — jene Personen, die sich auf Ihren CMS-Websites registrieren und anmelden. Diese sind von den Back-Office-Mitarbeiterkonten zu unterscheiden, die von MelisCore verwaltet werden. Konten sind **standortspezifisch** (eine Person kann Konten auf mehreren Websites besitzen). Das Modul liefert zwei ablegbare Seiten-Plugins (Anmeldeformular und Registrierungsformular), ein Back-Office-Verwaltungswerkzeug sowie eine vollständige DSGVO-Pipeline, die Dateninformationen, Datenexport, anonymisierte Löschung und einen automatischen Bereinigungs-Workflow für inaktive Konten abdeckt. Beim Bootstrap werden außerdem Fremdschlüsselspalten zu den Blog-/News-/Kommentar-Tabellen hinzugefügt, sodass ein einziger DSGVO-Durchlauf alles aufdecken, exportieren oder löschen kann, was einem Benutzer über diese Module hinweg gehört.

In v6 ist das Back-Office-Verwaltungswerkzeug (**Users FO**) ein **nativer Full-React-Brick** — eine echte React-CRUD-Oberfläche, die eine JSON-`react-api`-Schicht aufruft — mit einem **New / Old**-Umschalter, der auf das Legacy-Werkzeug in einem iframe zurückgreift. Das Framework, die Services, Tabellen, die DSGVO-Mechanik und die Front-Office-Plugins bleiben unverändert; nur die Verwaltungsoberfläche wurde nach React verlagert.

## Aktivierung

Fügen Sie in `config/melis.module.load.php` hinzu:

```php
return [
    'MelisCmsUserAccount',
];
```

Composer-Abhängigkeiten: `melisplatform/melis-core` (DSGVO-Framework, Sessions, BO-Werkzeuge) und `melisplatform/melis-cms` (Seiten-/Plugin-Host). `melis-engine` und `melis-front` werden transitiv für das Front-Office-Rendering eingebunden. Das React-Werkzeug wird automatisch erkannt, sobald das Modul aktiv ist (es liefert eine `brick.manifest.json`); durch das Entfernen des Moduls aus `melis.module.load.php` verschwindet das Werkzeug aus dem React-Back-Office.

## Wichtige Services

| Service-Alias | Rolle |
| --- | --- |
| `MelisCmsUserAccountService` | Haupt-Service — ebenfalls unter **`FrontUserAccountService`** aliasiert. CRUD für Website-Benutzer sowie Authentifizierung. |
| `MelisCmsUserAccountGdprAutoDeleteService` | Logik der Pipeline zur automatischen Löschung inaktiver Konten (Warnungen + Anonymisierung). |
| `FrontUserAccountTable` | Table-Gateway für `melis_cms_user_account`. |
| `MelisCmsUserSitesTable` | Table-Gateway für `melis_cms_user_account_sites`. |
| `MelisPasswordValidator` | Validator für Passwortrichtlinien (mind. 8 Zeichen, ein Kleinbuchstabe, eine Ziffer), angewendet bei Registrierung und Profilspeicherung. |

Wichtige Methoden von `MelisCmsUserAccountService` (aliasiert als `FrontUserAccountService`):

```php
$svc = $sm->get('FrontUserAccountService');

// Authenticate a site visitor
$result = $svc->siteUserAuthenticate($login, $password, $siteId);

// Create a new account
$id = $svc->createUser($data);

// Fetch by various keys
$user = $svc->getUserById($id);
$user = $svc->getUserByLogin($login);
$user = $svc->getUserByEmailAndPassword($email, $password);

// Persist profile changes
$svc->saveUserAccountData($id, $data);

// Site memberships for a user
$sites = $svc->getUsersSitesByUserId($id);

// Record a login timestamp (used by the auto-delete pipeline)
$svc->updateUserConnectionDate($id);
```

Alternativ können Sie das Ereignis `site_user_account_authentication` auslösen und `MelisCmsUserAccountSiteUserAuthenticationListener` an `siteUserAuthenticate()` durchreichen lassen; der authentifizierte Benutzer wird dann in einem pro Website verschlüsselten `Laminas\Session\Container` gespeichert.

## Back-Office (React) — Users FO

Das Werkzeug **Users FO** befindet sich im React-Back-Office (`/melis-react`) in der Seitenleiste unter der Gruppe **MelisCms** → **Utilisateurs FO** („FO Users"). Es ist ein **nativer Full-React-Brick** (kein iframe), eingehängt an der Baum-Route `/melis-cms/user-account`; der Menüschlüssel `melis_cms_user_account_tool_display` steuert Zugriff, Berechtigungen und den iframe der Old-Ansicht. Das Werkzeug verwaltet ausschließlich **Website-Benutzer** — niemals Back-Office-Mitarbeiter (dafür ist das MelisCore-Werkzeug **Users** zuständig).

Es handelt sich um einen zweistufigen Drill-down, der über die **nativen Unter-Tabs** des Hosts (`subTabs: true`) dargestellt wird: eine flache **Liste** der Website-Benutzer und ein einzelnes **User**-Formular, das pro Unter-Tab geöffnet wird.

![React-Users-FO-Liste — KPI-Karten (Total / Active / Inactive / Admins), Suche, Status-/Admin-/Website-Filter, Reset filters, Spaltenverwaltung, Export, der New / Old-Umschalter und + New user; jede Zeile bietet die Aktionen View sites, Edit und Delete](/screenshots/react/melis-cms-user-account/meliscmsuseraccount-tool-usersfo-list.png)

**Liste (Ebene 1)** — eine durchsuchbare, sortierbare und filterbare Tabelle aller Front-Office-Konten auf der Plattform, mit **KPI-Karten** (Total / Active / Inactive / Admins). Steuerelemente:

- **Search** (durchsucht Login, E-Mail, Vorname, Nachname)
- **Status**-Filter (All / Active / Inactive) und **Admin**-Filter (All / Admin / Non-admin)
- **Site**-Auswahl (All sites) und **Reset filters**
- **Columns**-Verwaltung (Spalten per Drag-and-drop ausblenden / neu anordnen)
- **Export** nach Excel oder CSV (läuft clientseitig im Brick über SheetJS)
- **New / Old**-Umschalter (oben rechts) und Schaltfläche **+ New user**

Spalten: **Id · Status · Admin · Picture · Email · Login · Full Name · Creation date · Action** (die Spalte Picture dient nur der Darstellung; klicken Sie auf einen beliebigen anderen Spaltenkopf zum Sortieren). Jede Zeile bietet drei Aktionen:

| Aktion | Beschreibung |
| --- | --- |
| View sites (🔍) | Modal, das je Website, der der Benutzer angehört, das Registrierungsdatum, den Zeitpunkt der letzten Anmeldung, ob die Mitgliedschaft **anonymisiert** (DSGVO) ist, und die Domains der Website auflistet. |
| Edit (✏️) | Öffnet den Benutzer in einem Unter-Tab (siehe unten). |
| Delete (🗑) | Entfernt das Konto (unwiderruflich). |

**User-Formular (Ebene 2)** — das Öffnen einer Zeile oder **+ New user** fügt einen Unter-Tab mit einem einzelnen **User**-Formular hinzu: **Login** (schreibgeschützt beim Bearbeiten), **Email**, **First name**, **Last name**, **Birthday** (ein Kalender in der Session-Sprache), **Language**, ein schreibgeschütztes **Creation date**, ein **Picture**-Panel (Vorschau + Choose an image / Remove picture) sowie **Password** / **Confirm password**. Rechts befinden sich die Umschalter **Active** und **Administrator** sowie die erforderliche Kontrollkästchenliste **Sites**. **Save** speichert das Konto.

![Das React-Formular zum Bearbeiten eines Benutzers — Login (schreibgeschützt beim Bearbeiten), Email, First/Last name, Birthday, Language, schreibgeschütztes Creation date, Picture-Panel, Password / Confirm password sowie die Umschalter Active und Administrator und die erforderliche Sites-Kontrollkästchenliste](/screenshots/react/melis-cms-user-account/meliscmsuseraccount-tool-usersfo-edit-tab-user.png)

> Die Passwortfelder tragen den Hinweis *„Leave empty to keep unchanged"* — das Bearbeiten eines Profils erzwingt niemals eine Passwortänderung. Wird jedoch ein Passwort eingegeben, muss es `MelisPasswordValidator` erfüllen (mind. 8 Zeichen, ein Kleinbuchstabe, eine Ziffer). **Mindestens eine Website ist erforderlich**; eine für diesen Benutzer bereits **anonymisierte** (DSGVO) Website wird stillschweigend aus der Übermittlung entfernt.

**New / Old-Umschalter** — das gesamte Werkzeug wechselt zwischen der React-Oberfläche (**New**, Standard) und dem klassischen Werkzeug, das in einem iframe gerendert wird (**Old**, `/melis/react-tool-page?key=melis_cms_user_account_tool_display`). Das Legacy-BO-Werkzeug wird weiterhin unverändert von **`MelisCmsUserAccountToolController`** ausgeliefert.

## React-API-Endpunkte

Die Routen befinden sich in `config/react-api.php` und werden vom Controller `MelisReactApiUserAccountController` (invokierbarer Alias `MelisCmsUserAccount\Controller\MelisReactApiUserAccount`) bedient. Alle liegen unter `/melis/react-api/user-account` und geben den Vertrag `{ success, data, error }` zurück.

| Methode & URL | Zweck |
| --- | --- |
| `GET /user-account` | Benutzer auflisten (Keyset: `limit`, `search`, `siteId`, `admin`, `status`, `sort`, `dir`, `after`) → `{items,total,nextCursor}`; jedes Element trägt `hasPicture` |
| `GET /user-account/stats` | KPI `{total, active, inactive, admins}` |
| `GET /user-account/sites` | Website-Liste der Plattform (Filter + Formular-Kontrollkästchen) → `[{id,label}]` |
| `GET /user-account/langs` | Sprachliste (Formular-Auswahl) → `[{id,label}]` |
| `GET /user-account/:id` | Einzelner Benutzer (fügt `siteIds[]` + `pictureDataUrl` hinzu) — zum Bearbeiten |
| `GET /user-account/:id/picture` | Zeilenbild als `image/jpeg` (fällt auf Standard-Avatar zurück) |
| `GET /user-account/:id/sites` | „View sites"-Details je Website: Label, Registrierungs-/Letzte-Anmeldung-Daten, `anonymized`, Domains |
| `POST /user-account/save` | Konto erstellen / aktualisieren |
| `DELETE /user-account/delete/:id` | Konto löschen |

`list`/`stats` fragen `melis_cms_user_account` direkt mit parametrisiertem SQL ab; `get`/`save`/`delete`/`userSites` **delegieren an die Legacy-Services** (`FrontUserAccountTable`, `FrontUserAccountService`) — dieselben Services, die auch das Legacy-Werkzeug nutzt, sodass alle Geschäftsregeln (eindeutiger Login/E-Mail, Passwort-Hash, Website-Verknüpfungen, DSGVO-Wächter für anonymisierte Websites) und Aktivitätsprotokoll-Ereignisse (`meliscms_user_account_tooluser_save` / `_delete`) erhalten bleiben.

## Berechtigungen

Deklariert in `config/react.capabilities.php` unter dem Rechte-Knoten `melis_cms_user_account_tool_display`. Das Werkzeug ist ein flaches CRUD, daher ist die Deklaration eine flache Liste:

```php
return [
  'melisReactToolCapabilities' => [
    'melis_cms_user_account_tool_display' => ['list', 'create', 'edit', 'delete', 'export'],
  ],
];
```

Jede API-Aktion ruft zuerst `denyUnlessAccess()` auf (Auth + `MelisCoreRights::canAccess('melis_cms_user_account_tool_display')` → 401/403) und anschließend eine Berechtigungsprüfung:

| Berechtigung | Erzwungen bei |
| --- | --- |
| `list` | `list`, `stats`, `picture` |
| `edit` | `get`, `userSites` und `save`, wenn eine `id` vorhanden ist (Aktualisierung) |
| `create` | `save`, wenn keine `id` vorhanden ist (Erstellung) |
| `delete` | `delete` |
| `export` | nur deklarativ — der Export läuft clientseitig im Brick |

## Front-Office

Zwei Templating-Plugins sind unter `config/plugins/` registriert (in v6 unverändert — vom Front-Office-Renderer ausgeliefert, nicht vom React-Werkzeug):

| Plugin | Rendert | Wichtige Optionen |
| --- | --- | --- |
| `MelisCmsUserAccountLoginPlugin` | Anmeldeformular (und Abmelde-Steuerelement, wenn bereits authentifiziert). | `template_path`, `page_id_registration_page` |
| `MelisCmsUserAccountUserRegisterPlugin` | Registrierungsformular (Benutzername, E-Mail, Passwort ×2, Vor-/Nachname, Bild, Sprache). | `template_path`, `page_id_login_page`, `force_joint_accounts` |

`force_joint_accounts` im Register-Plugin verwendet ein bestehendes standortübergreifendes Konto erneut; die Website-Mitgliedschaft wird in `melis_cms_user_account_sites` gespeichert.

Beide Plugins werden von **`MelisCmsUserAccountPluginController`** ausgeliefert:

| Aktion | Rolle |
| --- | --- |
| `authenticateUserAction()` | Authentifiziert `login`/`password`/`siteId` und öffnet die Session. |
| `logoutUserAction()` | Schließt die Website-Benutzer-Session. |
| `createUserAction()` | Validiert und erstellt einen Benutzer (einschließlich Bild-Upload). |
| `getRegistrationFormAction()` | Gibt das Registrierungsformular zurück (für den Wechsel zwischen Anmeldung↔Registrierung). |
| `getTranslationsAction()` | Übersetzungszeichenketten für die Front-Seite. |

> Der Plugin-Controller enthält keine integrierte Aktion für Passwort-vergessen/-zurücksetzen oder E-Mail-Aktivierung. Bauen Sie diese bei Bedarf auf `FrontUserAccountService` auf.

## Datenbanktabellen

| Tabelle | PK | Enthält |
| --- | --- | --- |
| `melis_cms_user_account` | `uac_id` | Website-Benutzer: `uac_login`, `uac_email`, `uac_password`, `uac_firstname`, `uac_lastname`, `uac_picture`, `uac_status`, `uac_admin`, `uac_birthday`, `uac_lang_id`, `uac_date_creation`. |
| `melis_cms_user_account_sites` | `uacs_id` | Verknüpfungstabelle Benutzer ↔ Website: `uacs_uac_id`, Website-ID, `uacs_anonymized` (standortspezifisches DSGVO-Flag). |

`MelisCmsUserAccountAddCustomFieldsTableListener` (beim Bootstrap ausgelöst) fügt `*_author_account`-FK-Spalten zu den Blog-/News-/Kommentar-Tabellen hinzu, erstellt `melis_cms_user_account_sites` und migriert die Legacy-Spalte `uac_site_id`. Der Vorgang ist idempotent (prüft auf Vorhandensein der Spalten).

## DSGVO

### Manuelle Information / Extraktion / Löschung (Set 1+2)

Neun Listener beantworten drei MelisCore-Ereignisse:

| Ereignis | Konto-Listener | Blog-Listener | Kommentar-Listener |
| --- | --- | --- | --- |
| `melis_core_gdpr_user_info_event` | `…GdprUserInfoListener` | `…BlogGdprUserInfoListener` | `…CommentsGdprUserInfoListener` |
| `melis_core_gdpr_user_extract_event` | `…GdprUserExtractListener` | `…BlogGdprUserExtractListener` | `…CommentsGdprUserExtractListener` |
| `melis_core_gdpr_user_delete_event` | `…GdprUserDeleteListener` | `…BlogGdprUserDeleteListener` | `…CommentsGdprUserDeleteListener` |

Die Blog- und Kommentar-Listener sind nur aktiv, wenn `MelisCmsBlog` / `MelisCmsComments` installiert sind. Die Löschung anonymisiert die Kontozeile und setzt `uacs_anonymized`. Feldzuordnungen und Aufbewahrungsschwellen befinden sich in `config/app.gdpr.php`.

### Automatische Pipeline für inaktive Konten (Set 3)

Sechs Listener klinken sich in den Auto-Delete-Scheduler von MelisCore ein:

| Schritt | Listener | Ereignis | Wirkung |
| --- | --- | --- | --- |
| 1. Registrierung | `…GdprAutoDeleteModuleListListener` | `melis_core_gdpr_auto_delete_modules_list` | Meldet das Modul beim Scheduler an. |
| 2. Tags | `…GdprAutoDeleteTagsListListener` | `MelisCoreGdprAutoDeleteService::TAGS_EVENT` | Registriert Inaktivitäts-Tags/-Kategorien. |
| 3. Erste Warnung | `…GdprAutoDeleteWarningListUsersListener` | `MelisCoreGdprAutoDeleteService::WARNING_EVENT` | Sendet die erste Warn-E-Mail an inaktive Benutzer. |
| 4. Zweite Warnung | `…GdprAutoDeleteSecondWarningListUsersListener` | `MelisCoreGdprAutoDeleteService::SECOND_WARNING_EVENT` | Sendet die zweite Warn-E-Mail an weiterhin inaktive Benutzer. |
| 5. Löschung | `…GdprAutoDeleteActionDeleteUserListener` | `MelisCoreGdprAutoDeleteService::DELETE_ACTION_EVENT` | Anonymisiert Konten ohne Reaktion. |
| (Protokoll) | `…GdprAutoDeleteGetEmailListener` | `melis_core_gdpr_auto_delete_log_get_user_email` | Löst die E-Mail für das Audit-Protokoll auf (überspringt bereits anonymisierte). |

Die „letzte Aktivität" wird über `updateUserConnectionDate()` nachverfolgt.

## Modulübergreifende Listener

Beim Bootstrap in `Module.php` registriert:

| Listener | Ereignis | Zweck |
| --- | --- | --- |
| `MelisCmsUserAccountSiteUserAuthenticationListener` | `site_user_account_authentication` | Einstiegspunkt der FO-Authentifizierung → `siteUserAuthenticate()`; speichert den Benutzer in einem pro Website verschlüsselten `Laminas\Session\Container`. (Priorität `-1001`) |
| `MelisCmsUserAccountLoginFormListener` | `melis_cms_user_account_login_form` | Fügt das angemeldete Mitglied in das Kommentarformular ein (verstecktes `mccom_user_acct`/`mccom_site_id`, Abmelde-Schaltfläche, Name aus dem Konto); entfernt Namens-/E-Mail-Felder für anonyme Benutzer. |
| `MelisCmsUserAccountCommentsFormModificationListener` | `meliscmsuseraccount_comments_form_modification_listener` | Ordnet die Elemente des Kommentarformulars in einer angeforderten Reihenfolge neu an. |
| `MelisCmsUserAccountAddAuthorPicture` | `melis_cms_user_account_add_user_picture` | Rendert das `uac_picture` des Mitglieds neben dessen Kommentar (Base64-Data-URI). |
| `MelisCmsUserAccountSaveUserAccountListenter` | `meliscmsnews_get_postvalues` | Speichert `cnews_author_account` / `cnews_comments_require_account` beim Speichern von News. |
| `MelisCmsUserAccountAddCustomFieldsTableListener` | `meliscms_user_account_add_custom_fields_table` | Bootstrap-Migration: fügt FK-Spalten zu den Blog-/News-/Kommentar-Tabellen hinzu, erstellt die Website-Verknüpfungstabelle, migriert Legacy-Daten. |
| `MelisCmsUserAccountFlashMessengerListener` | `meliscms_user_account_tooluser_save`, `meliscms_user_account_tooluser_delete` | BO-Flash-Meldungen beim Speichern/Löschen (Legacy-Werkzeug). |

## Wichtige Dateien

| Bereich | Pfad |
| --- | --- |
| React-Brick-Manifest | `vendor/melisplatform/melis-cms-user-account/public/ui-react/brick.manifest.json` |
| React-API-Routen + Invokable | `vendor/melisplatform/melis-cms-user-account/config/react-api.php` |
| React-Berechtigungen | `vendor/melisplatform/melis-cms-user-account/config/react.capabilities.php` |
| React-API-Controller | `vendor/melisplatform/melis-cms-user-account/src/Controller/MelisReactApiUserAccountController.php` |
| Legacy-BO-Werkzeug-Controller (Old-Ansicht) | `vendor/melisplatform/melis-cms-user-account/src/Controller/MelisCmsUserAccountToolController.php` |
| FO-Plugin-Controller | `vendor/melisplatform/melis-cms-user-account/src/Controller/MelisCmsUserAccountPluginController.php` |
| BO-Menüeintrag | `vendor/melisplatform/melis-cms-user-account/config/app.interface.php` |
| Legacy-BO-Datentabelle (Spalten, Filter, Modals) | `vendor/melisplatform/melis-cms-user-account/config/app.tools.php` |
| Alle Formulare (FO + Legacy-BO) | `vendor/melisplatform/melis-cms-user-account/config/app.forms.php` |
| DSGVO-Feldzuordnungen + Aufbewahrungsschwellen | `vendor/melisplatform/melis-cms-user-account/config/app.gdpr.php` |
| Integrationspunkte für Kommentare | `vendor/melisplatform/melis-cms-user-account/config/comments.php` |
| Routen, Service-Aliase, Plugins, Validatoren | `vendor/melisplatform/melis-cms-user-account/config/module.config.php` |
| Konfiguration Login-Plugin | `vendor/melisplatform/melis-cms-user-account/config/plugins/MelisCmsUserAccountLoginPlugin.config.php` |
| Konfiguration Register-Plugin | `vendor/melisplatform/melis-cms-user-account/config/plugins/MelisCmsUserAccountUserRegisterPlugin.config.php` |
| Haupt-Service | `vendor/melisplatform/melis-cms-user-account/src/Service/MelisCmsUserAccountService.php` |
| Auto-Delete-Service | `vendor/melisplatform/melis-cms-user-account/src/Service/MelisCmsUserAccountGdprAutoDeleteService.php` |
| Passwort-Validator | `vendor/melisplatform/melis-cms-user-account/src/Validator/MelisPasswordValidator.php` |
| DB-Table-Gateways | `vendor/melisplatform/melis-cms-user-account/src/Model/Tables/` |
| Listener | `vendor/melisplatform/melis-cms-user-account/src/Listener/` |
| Bootstrap / Spalteninjektion | `vendor/melisplatform/melis-cms-user-account/src/Module.php` |

Siehe auch: [MelisCore](/de/reference/modules/melis-core) · [MelisCms](/de/reference/modules/melis-cms) · [MelisCmsComments](/de/reference/modules/melis-cms-comments) · [MelisCmsBlog](/de/reference/modules/melis-cms-blog) · [MelisCmsNews](/de/reference/modules/melis-cms-news)
