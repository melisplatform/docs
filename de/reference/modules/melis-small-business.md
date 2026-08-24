# MelisSmallBusiness

> Erweiterung für Redaktionsteams des CMS — **Benutzerrollen**, ein Freigabe-**Workflow**, **Versionierung** von Seiten, **Kommentare** und **Seitensperren**, dazu eine TinyMCE-**Medienbibliothek**, bereitgestellt über das React-Backoffice. Paket `melisplatform/melis-small-business`.

## Zweck

`MelisSmallBusiness` ergänzt den CMS-Seiteneditor um Werkzeuge für die Zusammenarbeit in kleinen Teams. Es bewahrt
**Versionen** veröffentlichter Seiten auf (einen früheren Zustand wiederherstellen/anzeigen), steuert einen Inhalts-**Workflow**,
bei dem eine Redakteurin die Freigabe anfragt und eine Prüferin sie erteilt oder ablehnt, hängt **Kommentare** an
Seiten an, verhindert über eine **Seitensperre**, dass zwei Benutzer dieselbe Seite gleichzeitig bearbeiten, verwaltet ein
eigenes Werkzeug für **Benutzerrollen** und liefert eine TinyMCE-basierte **Medienbibliothek** (MoxieManager) mit. Die Geschäftslogik
bleibt serverseitig (Laminas-Dienste, CMS-Editor-Ereignisse); in v6 besteht die gesamte für Benutzer sichtbare Oberfläche aus einer Reihe
von React-Bricks und modularen Beiträgen.

## Aktivierung

Dies ist ein Standard-Laminas-Modul. Fügen Sie es zu `config/melis.module.load.php` hinzu:

```php
return [
    // …
    'MelisSmallBusiness',
];
```

Es hängt von `melis-core`, `melis-engine`, `melis-front` und `melis-cms` ab, und seine Tabellen werden
per dbdeploy erstellt (`extra.dbdeploy = true`). Jede der nachstehenden React-Oberflächen erscheint **nur, wenn das Modul
aktiv ist** (Brick-Ermittlung über `GET /melis/react-api/react-modules`).

## React-Oberflächen

Im React-Backoffice (`/melis-react`) liefert das Modul **zwei Bricks** und **zwei modulare
Beiträge** ohne eigene Route mit.

| Oberfläche | Art | Route / Host |
| --- | --- | --- |
| **Benutzerrollen** (`smallbusiness`) | native Voll-React-Oberfläche (Umschalter Neu/Alt) | `/melis-core/user-roles` |
| **Medienbibliothek** (`smallbusiness-medialib`) | iframe-Brick (MoxieManager) | `/melis-cms/media-library` |
| **Workflow-Modal** | gemeinsames Modal (`window.__melisWorkflowModal`) | gerendert von News / Blog / CMS-Seiteneditor / Newsletter + Dashboard-Widget |
| **Versionierung / Kommentare / Sperre** | Reiter + Banner im CMS-Seiteneditor | beigetragen zum Capability-Knoten `meliscms_page` |
| **Rolle im Werkzeug „Benutzer“** | Spalte/Filter/Auswahl „Rolle“ | Host-Werkzeug „Benutzer“, gesteuert über `useModuleActive('MelisSmallBusiness')` |

`public/ui-react/brick.manifest.json` deklariert beide Bricks; `ui-react/src/brick.tsx` registriert sie
und veröffentlicht das Workflow-Modal als globale Window-Variable, sodass andere Bricks eine einzige gemeinsame
Implementierung rendern können.

## Werkzeug „Benutzerrollen“

**Wo:** Seitenleiste → **MelisCore → User Roles** (`/melis-core/user-roles`).

Eine **Rolle** ist ein benanntes Berechtigungsprofil, das einmal gespeichert (`melis_core_user_role`) und vielen Benutzern zugewiesen wird.
Die Liste zeigt jede Rolle mit KPI-Karten (Rollen / Zugewiesen), Suche, einem Spaltenmanager, Export und einem
Umschalter **Neu / Alt** (Alt = das klassische Werkzeug in einem iframe). Jede Zeile (ID, Name, Erstellt, Anzahl Benutzer)
verfügt über Aktionen zum Bearbeiten/Löschen; eine Rolle, die Benutzern zugewiesen ist, **kann nicht gelöscht werden**.

![Rollenliste im React-Backoffice](/screenshots/react/melis-small-business/melissmallbusiness-tool-roles-list.png)

Das Bearbeiten einer Rolle öffnet einen Unterreiter mit einem Feld **Role name** und einem Baum **Access rights**, der den
Berechtigungsbaum des Werkzeugs „Benutzer“ widerspiegelt (nach Bereich gruppierte TOOLS, pro Werkzeug List/Create/Edit/Delete/Export, dazu
die Bereiche Pages und Dashboard-Plugins). **Speichern** persistiert den Namen und das `urole_rights`-XML.

![Rolleneditor und sein Berechtigungsbaum](/screenshots/react/melis-small-business/melissmallbusiness-tool-roles-edit-and-rights.png)

::: warning
Das Schreiben des **Berechtigungs**-XML einer Rolle erfordert einen Plattformadministrator (`usr_admin`); ein Nicht-Administrator, der
eine Rolle bearbeitet, erhält beim Schreiben der Berechtigungen einen 403. Dies blockiert einen Weg zur Rechteausweitung
(eine Rolle mit allen Rechten fälschen und sie sich anschließend selbst zuweisen). Der **Name** der Rolle kann von jedem geändert werden, der über das
Recht `edit` des Werkzeugs verfügt.
:::

### Rolle im Werkzeug „Benutzer“

Wenn das Modul aktiv ist, erhält das MelisCore-Werkzeug **Benutzer** eine Spalte + Filter **Rolle** in der Liste
und eine Auswahl **Rolle** im Benutzerformular (neben Status und Rechten). Das Dropdown wird gespeist von
`GET /melis/react-api/roles` (der Auswahlliste von MelisCore); beim Speichern injiziert ein Listener die Fähigkeiten der Rolle
erneut, damit sie nicht verloren gehen.

![Benutzerformular mit der Auswahl „Rolle“](/screenshots/react/melis-small-business/melissmallbusiness-tooloverride-users-edit-withrole.png)

## Medienbibliothek

**Wo:** Seitenleiste → **MelisCms → Media library** (`/melis-cms/media-library`).

Der erweiterte TinyMCE- / **MoxieManager**-Dateibrowser: Ordner links, Dateien rechts
(Name, Größe, Typ, Datum), mit Erstellen, Hochladen, Listen-/Rasteransicht, Sortieren, Filtern und Verknüpfungen für Favoriten/Verlauf/
Hochgeladen. Die React-Seite ist eine dünne Hülle, die ein iframe über den gesamten Reiter zum älteren
MoxieManager rendert (`/melis/MelisSmallBusiness/js/tinyMCE/moxiemanager/index.php?lang=xx`), sodass das Verhalten
identisch mit dem klassischen Werkzeug ist — es besitzt keine eigene react-api.

![Medienbibliothek — MoxieManager-Browser in einem React-Reiter](/screenshots/react/melis-small-business/melissmallbusiness-tool-medialibrary.png)

## Workflow (Seitenfreigabe)

Der Workflow ermöglicht es einer Redakteurin, eine Freigabe **anzufragen**, und einer prüfenden Person, zu **antworten**. Das **gleiche Modal**
öffnet sich aus dem CMS-Seiteneditor (Schaltfläche **Workflow**), den News- und Blog-Editoren sowie dem Dashboard-
Widget. Es ist generisch über den Elementtyp — `PAGE`, `NEWS`, `BLOG`.

Wählen Sie unter **Ask for validation** eine **Rolle**, um alle Personen mit dieser Rolle zu benachrichtigen, oder **„1 person
only“**, um ein Dropdown **Benutzer** einzublenden und eine einzelne Person anzusprechen, und dann **Send request**.

![Workflow-Modal — eine einzelne Person anfragen](/screenshots/react/melis-small-business/melissmallbusiness-pageoverride-workflow-demand-1person.png)

Der Reiter **History** des Modals listet jede Anfrage und Antwort auf (Datum, Status, An/Rolle, Von, Aktion). Eine
Empfängerin einer offenen Anfrage erhält Schaltflächen **Validate** / **Refuse** und kann eine Notiz anhängen.

![Workflow-Modal — Verlauf mit Validate/Refuse](/screenshots/react/melis-small-business/melissmallbusiness-pageoverride-workflow-demand-to-validated.png)

Das **Dashboard** des Backoffice zeigt ein **Workflow**-Widget, das Anfragen auflistet, aufgeteilt in *Users' demands*
/ *My demands* mit den Unterreitern PAGE / NEWS; jede Zeile zeigt eine Status-Plakette (VALIDATED / REFUSED / Demand)
und bietet Inline-Aktionen zum Freigeben (✓) / Ablehnen (✗) sowie zur Vorschau von an Sie gerichteten Anfragen.

![Dashboard-Workflow-Widget](/screenshots/react/melis-small-business/melissmallbusiness-dashboardplugins-workflow.png)

## Versionierung & Kommentare (CMS-Seiteneditor)

Das Öffnen einer Seite im CMS-Editor fügt nach den nativen Reitern zwei SmallBusiness-Reiter hinzu:

- **Versionierung** — eine seitenweise Liste der Momentaufnahmen der Seite (Nr., Name, Geändert am, Von) mit
  View / Restore / Rename pro Zeile. Bei jeder Veröffentlichung wird eine Momentaufnahme erstellt.

  ![Seiteneditor — Reiter „Versionierung“](/screenshots/react/melis-small-business/melissmallbusiness-pageoverride-edit-tab-versionning.png)

- **Kommentare** — die Aktivitäts-Zeitleiste der Seite, die Benutzerkommentare und Workflow-Ereignisse mischt (neueste
  zuerst), mit einem Feld „Add a comment“.

  ![Seiteneditor — Reiter „Kommentare“](/screenshots/react/melis-small-business/melissmallbusiness-pageoverride-tab-comments.png)

Ein Banner **Seitensperre** + eine Schaltfläche **Unlock** erscheinen, wenn ein anderer Benutzer die Sperre der Seite hält.

## react-api-Endpunkte

Alle unter `/melis/react-api/…`, Vertrag `{ success, data, error }`. Die Controller befinden sich in diesem
Modul (`config/react-api.php` + `src/Controller/MelisReactApi*Controller.php`).

| Controller | Basis-Routen | Schutz |
| --- | --- | --- |
| `MelisReactApiRoleController` | `GET /user-roles`, `/user-roles/stats`, `/user-roles/:id`; `POST /user-roles/save`; `DELETE /user-roles/delete/:id` | Zugriff `melissb_tool_userrole` + Capability (Schreiben des Rechte-XML = nur Administrator) |
| `MelisReactApiWorkflowController` | `GET /workflow/roles`, `/workflow/users`, `/workflow/history`; `POST /workflow/ask` | nur authentifiziert |
| `MelisReactApiPageVersioningController` | `GET /cms-page/versioning` | nur authentifiziert |
| `MelisReactApiPageCommentsController` | `GET /cms-page/comments`, `/cms-page/timeline`; `POST /cms-page/comments/save` | nur authentifiziert |
| `MelisReactApiPageLockController` | `GET /cms-page/lock`; `POST /cms-page/unlock` | nur authentifiziert |

Workflow-**Mutationen** verwenden die bewährten älteren Endpunkte anstelle der react-api wieder:
`GET /melis/MelisSmallBusiness/MelisWorkflow/saveWorkflowActions` (Validate / Refuse) und
`POST /melis/MelisSmallBusiness/MelisWorkflow/addWorkflowComments` (eine Notiz hinzufügen). Der Kommentartext wird
beim Speichern per HTMLPurifier bereinigt.

## Capabilities

`config/react.capabilities.php` **trägt** die Schaltfläche und die Reiter des Seiteneditors unter dem gemeinsamen
Schlüssel `meliscms_page` bei, der zu MelisCms gehört (zusammengeführt, sodass MelisCms nichts von SB wissen muss):

| Art | Schlüssel | Beschriftung |
| --- | --- | --- |
| action | `workflow` | Schaltfläche Workflow |
| action | `unlock` | Schaltfläche Unlock |
| tab | `melissb_page_versioning` | Reiter Versionierung |
| tab | `melissb_page_comments` | Reiter Kommentare |

`CmsPage.tsx` filtert diese Reiter / blendet diese Schaltflächen über `useCaps('meliscms_page').can(cap)` aus. Das
Werkzeug „Rollen“ selbst ist unter `melissb_tool_userrole` verschlüsselt und die Medienbibliothek unter
`melissb_medialib`.

## Datenbanktabellen

Erstellt durch `install/dbdeploy/126618_melis_sb_install.sql`.

| Tabelle | Rolle |
| --- | --- |
| `melis_sb_page_versioning` | Archivierte Kopien veröffentlichter Seiten (Grundlage des Reiters „Versionierung“). |
| `melis_sb_workflow` | Workflow-Datensätze pro Element. |
| `melis_sb_workflow_events` | Workflow-Ereignisse (anfragen / freigeben / ablehnen). |
| `melis_sb_page_comment` | An eine Seite angehängte Kommentare (Kommentartyp 1 = PAGE, 2 = WORKFLOW). |
| `melis_sb_page_comment_type` | Kommentartypen. |
| `melis_sb_page_locked` | Aktive Seitensperren (welcher Benutzer welche Seite bearbeitet). |
| `melis_core_user_role` | Benannte Rollen (`urole_id`, `urole_name`, `urole_creation_date`, `urole_rights`-XML). |

## Wichtige Dienste

| Dienst-Alias | Rolle |
| --- | --- |
| `MelisEnginePage` | Das Modul **überschreibt** den Seitendienst der Engine mit `MelisSBPageService`; auf der Route für die Versionsvorschau gibt es den versionierten Baum aus `melis_sb_page_versioning` zurück, andernfalls verhält es sich wie das übergeordnete Element. |
| `MelisSBPageCommentService` | Seitenkommentare: `getPageComments()` / `setPageComments()`. |

::: warning
Indem dieses Modul `MelisEnginePage` mit einer eigenen Klasse aliasiert, ersetzt es den Seitendienst des Kerns für die
gesamte Anwendung, solange es aktiviert ist. Behalten Sie dies bei der Reihenfolge der Module im Hinterkopf.
:::

Der Workflow versendet drei Backoffice-E-Mails (`app.emails.php`): `WF_DEMAND`, `WF_VALIDATED`,
`WF_REFUSED` (Tags `USER_TO`, `USER_FROM`, `TYPE`, `DETAILS`).

## Wichtige Dateien

| Belang | Pfad |
| --- | --- |
| Modul-Bootstrap & Listener | `src/Module.php`, `src/Listener/` |
| react-api-Routen + Invokables | `config/react-api.php` |
| react-api-Controller | `src/Controller/MelisReactApi{Role,Workflow,PageVersioning,PageComments,PageLock}Controller.php` |
| Capabilities-Beitrag | `config/react.capabilities.php` |
| Seitendienst (Engine-Override) | `src/Service/MelisSBPageService.php` |
| Kommentardienst | `src/Service/MelisSBPageCommentService.php` |
| React-Bricks (Quelle) | `ui-react/src/` (`brick.tsx`, `UserRolePage.tsx`, `MediaLibraryPage.tsx`, `WorkflowModal.tsx`, `RolesRightsTree.tsx`) |
| Gebautes Bundle | `public/ui-react/brick.js` + `brick.manifest.json` |
| Installations-SQL | `install/dbdeploy/126618_melis_sb_install.sql` |
