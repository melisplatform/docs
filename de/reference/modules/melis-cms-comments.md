# MelisCmsComments

> Kommentarsystem für News- und Blog-Beiträge — Moderation, ein optionaler beitragsbezogener Freigabe-Workflow, ein Frontoffice-Plugin „Post comments" und ein Dashboard-Widget. In v6 ist die Moderationsoberfläche ein **Comments**-Tab im React-News/Blog-Editor. Paket `melisplatform/melis-cms-comments`.

## Zweck

MelisCmsComments fügt **MelisCmsNews**- und **MelisCmsBlog**-Beiträgen ein Kommentarsystem hinzu. Es liefert
das Kommentar-Backend (Tabelle `melis_cms_comments` + `MelisCmsCommentsService`), ein Frontoffice-
Templating-Plugin (Kommentarliste + Formular „Kommentar hinterlassen"), einen beitragsbezogenen **Validierungs**-Workflow, der
Frontoffice-Kommentare zurückhält, bis ein Administrator sie freigibt, sowie ein Dashboard-Widget **Latest comments**.
In Kombination mit **MelisCmsUserAccount** können Kommentare ein angemeldetes Website-Konto voraussetzen.

Im React-Backoffice (`/melis-react`) liefert dieses Modul **keinen eigenen Brick** — kein `ui-react/`,
kein `react-api.php`, kein `react.capabilities.php`. Es ist ein **Backend- + Contribution-Modul** mit drei
vom Host bereitgestellten Oberflächen:

1. einen **Kommentar-Moderations-Tab** innerhalb des News/Blog-Editors — die React-Tab-Oberfläche und ihre `/comments…`-
   Endpunkte gehören zu den **News- und Blog-Bricks**, die an den Service dieses Moduls delegieren;
2. ein **Frontpage-Plugin „Post comments"**, das im React-CMS-Seiteneditor platziert und konfiguriert wird;
3. ein **Dashboard-Widget „Latest comments"** — ein **klassisches PHP/phtml**-Dashboard-Plugin, das innerhalb
   des Widget-Hosts des React-Dashboards gerendert wird (kein React-Rewrite).

## Aktivierung

In `config/melis.module.load.php` hinzufügen:

```php
return [
    'MelisCmsComments',
];
```

Composer-Abhängigkeiten: `melis-core ^6.0` und `melis-cms ^6.0`. Funktional wird mindestens ein Beitrags-
modul — **MelisCmsNews** oder **MelisCmsBlog** — benötigt, damit es nützlich ist. **MelisCmsUserAccount** ist eine optionale
Integration für kontogebundene Kommentare. Alle Oberflächen sind aktivierungsabhängig: Ist das Modul nicht vorhanden,
liefern die News/Blog-Kommentar-Endpunkte **404** und das Moderationspanel blendet sich selbst aus.

## Zentrale Services

| Service-Alias | Rolle |
| --- | --- |
| `MelisCmsCommentsService` | Zentraler CRUD-/Moderations-Service (erweitert `MelisEngineGeneralService`). Löst bei jeder Methode `*_start`/`*_end`-Ereignispaare aus. Wird von den React-API-Controllern von News/Blog aufgerufen. |

Zentrale Methoden von `MelisCmsCommentsService`:

```php
$svc = $sm->get('MelisCmsCommentsService');

// Create or update a comment (BO comments are approved immediately)
$id = $svc->saveComment($text, $postId, $commentId, 'NEWS', $name, $authorId, 'front');

// Fetch a single comment
$comment = $svc->getCommentById($id);

// Front-office list for a post (ordered)
$list = $svc->getCommentsByPostId($postId, 'BLOG', 'mccom_date_creation', 'DESC');

// Back-office query — omit 'validated' to return pending + approved + refused
$rows = $svc->getComments([
    'postType'     => 'NEWS',
    'postId'       => $postId,
    'withUserInfo' => true,
    'limit'        => 10,
]);

// Moderation
$svc->approveComment($id);          // mccom_validated=1, status=1 (shown)
$svc->refuseComment($id);           // mccom_validated=2, status=0 (hidden)
$svc->deleteCommentById($id);

// Cascade-delete when a post is removed
$svc->deletePostComments('NEWS', $postId);
```

`saveComment()` liest das Flag `c{type}_validate_comments` des Beitrags: Ist es aktiviert und stammt der Kommentar
aus dem Frontoffice, wird er als ausstehend gespeichert (`validated=0`); Backoffice-Kommentare werden sofort als
freigegeben gespeichert. Sämtlicher gespeicherter Text wird zur XSS-Bereinigung durch **HTMLPurifier 4.12** geführt.

## Kommentar-Moderations-Tab (React, gehört zu News/Blog)

Öffnen Sie einen News-Artikel oder Blog-Beitrag im Editor und wechseln Sie zum **Comments**-Tab. Er listet die
Kommentare dieses Beitrags mit einem zeilenweisen **Statuspunkt** (blau = ausstehend, grün = angezeigt, rot = abgelehnt), dem
Autor, dem Kommentartext und der Uhrzeit auf, bietet ein integriertes **Name + Kommentar schreiben + Kommentar hinzufügen**-Feld, um
direkt einen Kommentar zu verfassen, sowie zeilenweise Aktionen **freigeben / ablehnen / löschen** (freigeben/ablehnen erscheinen nur, wenn
für den Beitrag die Validierung aktiviert ist).

![Der Comments-Tab des React-News-Editors: ein COMMENTS-Panel mit einem integrierten Name-Feld, einem Feld „Write a comment…" und einer roten Schaltfläche + Add a comment, gefolgt von einer Kommentarzeile mit Statuspunkt, dem Kommentartext und den Symbolaktionen ablehnen/löschen](/screenshots/react/melis-cms-comments/meliscmscomments-tooloverride-news-edit-tab-comments.png)

Die React-Tab-Komponente gehört zu den **News/Blog-Bricks**, nicht zu diesem Modul. Es gibt **kein
`react-api.php` in MelisCmsComments** — die Kommentare werden über die eigene React-API der News- und Blog-Module
bereitgestellt, die jede Operation an `MelisCmsCommentsService` delegiert:

| Methode & URL | Zuständiger Controller / Aktion | Zweck |
| --- | --- | --- |
| `GET /melis/react-api/news/:id/comments` | `MelisCmsNewsReactApiController::commentsAction` | Alle Kommentare (alle Status) eines News-Artikels |
| `POST /melis/react-api/news/comments/save` | `commentSaveAction` | Kommentar erstellen/bearbeiten (BO → freigegeben) |
| `POST /melis/react-api/news/comments/approve/:cid` | `commentApproveAction` | Freigeben (`mccom_validated=1`, status=1) |
| `POST /melis/react-api/news/comments/refuse/:cid` | `commentRefuseAction` | Ablehnen (`mccom_validated=2`, status=0) |
| `POST /melis/react-api/news/comments/delete/:cid` | `commentDeleteAction` | Kommentar löschen |
| `GET /melis/react-api/blog/:id/comments` | `MelisCmsBlog…ReactApiController::commentsAction` | Alle Kommentare eines Blog-Beitrags |
| `POST /melis/react-api/blog/comments/{save,approve,refuse,delete}[/:cid]` | Blog-Kommentaraktionen | Dieselben Operationen für Blog |

Die `commentsAction` erstellt eine `getComments(['postId' => …, 'postType' => 'NEWS'])`-Abfrage ohne
`validated`-Schlüssel, sodass sie **ausstehende + freigegebene + abgelehnte** Kommentare zurückgibt. Jede Aktion liefert **404,
wenn das Modul nicht verfügbar ist**; der Vertrag lautet `{ success, data|error }`.

```ts
// list a post's comments (all statuses)
const res = await fetch(`/melis/react-api/news/${idNews}/comments`, {
  credentials: 'include',
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
}).then(r => r.json());          // → { success: true, data: [ { …comment… } ] }

// approve one
await fetch(`/melis/react-api/news/comments/approve/${commentId}`, {
  method: 'POST', credentials: 'include',
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
});
```

Der klassische `MelisCmsCommentsTabController` (getComments / save / approve / refuse / delete, abgesichert durch
`hasAccess('meliscms_page')`) wird weiterhin vom klassischen/iframe-Pfad verwendet — siehe die
[Legacy-Dokumentation](/legacy/reference/modules/melis-cms-comments).

## Frontpage-Plugin „Post comments"

`Controller\Plugin\MelisCmsCommentsPlugin` ist ein `MelisTemplatingPlugin` (Konfigurationsschlüssel `meliscmscomments`,
Abschnitt **MelisCms**, Konfiguration in `config/plugins/MelisCmsCommentsPlugin.config.php`). Ziehen Sie im **PLUGINS**-Panel
des React-CMS-Seiteneditors unter **Melis Cms Comments** das Element **Post comments** in eine Drop-Zone
einer News/Blog-Seitenvorlage.

![Der CMS-Seiteneditor mit dem PLUGINS-Panel: die aufgeklappte Gruppe Melis Cms Comments zeigt das Post comments-Plugin, das in eine DRAG & DROP ZONE gezogen wurde; das gerenderte Frontformular zeigt ein Name-Feld, ein Feld „Add a comment:" und eine rote Submit-Schaltfläche](/screenshots/react/melis-cms-comments/meliscmscomments-page-plugin-postcomments-menu-selector.png)

- Das **Einstellungs-Modal** wählt die **Template** (Standard `MelisCmsComments/comments`) und den **Post Type**
  (NEWS / BLOG), die als `template_path`, `mccplugin_post_type` und
  `registration_page_page_id` (für kontogebundene Kommentare über MelisCmsUserAccount) in die Plugin-XML der Seite geschrieben werden.

![Das Einstellungs-Modal des Post comments-Plugins: eine Template-Auswahl (MelisCmsComments/comments) und eine Post Type-Auswahl (News / Blog) mit den Schaltflächen Cancel / Apply; diese Einstellungen werden in die Plugin-XML der Seite geschrieben](/screenshots/react/melis-cms-comments/meliscmscomments-page-plugin-postcomments-config-settings.png)

- Das **Frontend-Rendering** (`front()`) ermittelt den Beitrag anhand des Query-Parameters `newsId` / `blogId`, lädt
  die Kommentare über `getCommentsByPostId()` und baut das Kommentar-hinzufügen-Formular auf (Name + Kommentar + Submit).
  Erfordert der Beitrag ein Konto, wird `melis_cms_user_account_login_form` ausgelöst, um ein Login-
  Plugin einzubetten.
- Standard-View `MelisCmsComments/comments`; Assets `plugins/css/commentsPlugin.css`,
  `plugins/js/commentsPlugin.js`.

## Dashboard-Widget „Latest comments" (klassisch)

`Controller\DashboardPlugins\MelisCmsCommentsLatestCommentsPlugin` erweitert
`MelisCoreDashboardTemplatingPlugin`; seine `latestCommentsAction()` gibt ein Laminas-`ViewModel` zurück
(Template `melis-cms-comments/dashboard/latest-comments`, eine `.phtml`), registriert in
`config/dashboard-plugins/dashboard.config.php` (Plugin-ID `MelisCmsCommentsLatest`). Der **Widget-Host** des React-
Dashboards rendert dieses klassische Plugin unverändert — **es gibt kein React-Rewrite**. Es listet
die neuesten Kommentare je Beitragstyp (Tabs Blog / News) mit den Filtern **All sites / All users / limit**
auf und zeigt je Kommentar den Autor, ein Status-Badge, den Beitragstitel und das Datum an. Die Website-/Benutzer-
Filter und das Neuladen der Zone werden von `MelisCmsCommentsViewHelperController::listAction`
(`melis-cms-comments/dashboard/list`, Zone `dashboard_latest_comments_list`) bereitgestellt.

![Das Latest comments-Widget des React-Dashboards: ein „Blog comments"-Tab mit den Auswahlfeldern All sites, All users und limit, gefolgt von einer Liste aktueller Kommentare (Autor + Benutzer-ID-Badge + grünes „shown"-Augen-Badge, der Beitragstitel in Klammern, der Kommentartext und „on: date")](/screenshots/react/melis-cms-comments/meliscmscomments-dashboardplugins-latestcomments.png)

## Datenbanktabellen

| Tabelle | Enthält |
| --- | --- |
| `melis_cms_comments` | Alle Kommentare: `mccom_id`, `mccom_post_id`, `mccom_type` (NEWS/BLOG), `mccom_comment_text`, `mccom_name`, `mccom_validated`, `mccom_status`, `mccom_date_creation`, `mccom_author_account`. |

Beim Bootstrap werden den Tabellen der Beitragsmodule zwei Spalten automatisch hinzugefügt (dort ist keine Schemaänderung erforderlich):

| Spalte | Tabelle | Zweck |
| --- | --- | --- |
| `cnews_validate_comments` | `melis_cms_news` | Beitragsbezogenes „Validate comments"-Flag für News. |
| `cblog_validate_comments` | `melis_cms_blog` | Beitragsbezogenes „Validate comments"-Flag für Blog. |

**Statusmodell.** `mccom_validated`: `0` = neu/ausstehend (blau), `1` = freigegeben/angezeigt (grün),
`2` = abgelehnt/ausgeblendet (rot). `mccom_status` spiegelt die Sichtbarkeit auf der Website wider (`1` angezeigt / `0` ausgeblendet).

## Listener & modulübergreifende Verdrahtung

Beim Bootstrap in `Module.php` angehängt:

| Listener | Ereignis | Zweck |
| --- | --- | --- |
| `MelisCmsCommentsFlashMessengerListener` | `melis_cms_comments_flash_messenger` | Flash-Messenger-Rückmeldung und Aktivitätsprotokoll (`CMS_COMMENT_ADD / UPDATE / DELETE`). |
| `MelisCmsCommentsSaveValidateCommentListener` | `meliscmsnews_get_postvalues` | Speichert `cnews_validate_comments`, wenn ein News-Beitrag gespeichert wird. |
| `MelisCmsCommentsGdprAutoDeleteActionDeleteListener` | `melis_cms_user_account_gdpr_auto_delete_action_delete` | DSGVO: setzt `mccom_author_account` für ein gelöschtes Konto auf null und löst anschließend das DSGVO-Ereignis des Moduls erneut aus. |

`Module::addValidateCommentsField()` (Backoffice-Bootstrap) prüft, welche Beitragsmodule aktiv sind, und
fügt deren Tabellen bei Bedarf die Spalte `c{news,blog}_validate_comments` hinzu.

## Zentrale Dateien

| Bereich | Pfad |
| --- | --- |
| Modulkonfiguration (Services, Controller, Plugins) | `vendor/melisplatform/melis-cms-comments/config/module.config.php` |
| Frontend-Plugin-Konfiguration | `vendor/melisplatform/melis-cms-comments/config/plugins/MelisCmsCommentsPlugin.config.php` |
| Dashboard-Plugin-Konfiguration | `vendor/melisplatform/melis-cms-comments/config/dashboard-plugins/dashboard.config.php` |
| Hauptservice | `vendor/melisplatform/melis-cms-comments/src/Service/MelisCmsCommentsService.php` |
| Klassischer Tab-Controller | `vendor/melisplatform/melis-cms-comments/src/Controller/MelisCmsCommentsTabController.php` |
| Frontend-Templating-Plugin | `vendor/melisplatform/melis-cms-comments/src/Controller/Plugin/MelisCmsCommentsPlugin.php` |
| Dashboard-Widget | `vendor/melisplatform/melis-cms-comments/src/Controller/DashboardPlugins/MelisCmsCommentsLatestCommentsPlugin.php` |
| Listener | `vendor/melisplatform/melis-cms-comments/src/Listener/` |
| DB-Modell / Table-Gateway | `vendor/melisplatform/melis-cms-comments/src/Model/Tables/MelisCmsCommentsTable.php` |
| Bootstrap / Spalteninjektion | `vendor/melisplatform/melis-cms-comments/src/Module.php` |
| HTMLPurifier (gebündelt) | `vendor/melisplatform/melis-cms-comments/library/htmlpurifier-4.12.0/` |

> Die React-Comments-Tab-Oberfläche und ihre `/comments…`-Endpunkte befinden sich in den News/Blog-Bricks
> (`MelisCmsNewsReactApiController`, `MelisCmsBlog…ReactApiController`); beide delegieren an
> `MelisCmsCommentsService`. Datenmodell, Service und das klassische Tool:
> [Legacy-Dokumentation](/legacy/reference/modules/melis-cms-comments).

Siehe auch: [MelisCmsNews](/de/reference/modules/melis-cms-news) · [MelisCmsBlog](/de/reference/modules/melis-cms-blog) · [MelisCms](/de/reference/modules/melis-cms) · [MelisEngine](/de/reference/modules/melis-engine) · [MelisCore](/de/reference/modules/melis-core)
