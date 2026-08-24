# MelisCmsComments

> Sistema di commenti per gli articoli di News e Blog — moderazione, un flusso di approvazione facoltativo per singolo articolo, un plugin di front-office "Post comments" e un widget della dashboard. In v6 l'interfaccia di moderazione è una scheda **Comments** all'interno dell'editor React di News/Blog. Pacchetto `melisplatform/melis-cms-comments`.

## Scopo

MelisCmsComments collega un sistema di commenti agli articoli di **MelisCmsNews** e **MelisCmsBlog**. Fornisce
il backend dei commenti (tabella `melis_cms_comments` + `MelisCmsCommentsService`), un plugin di
templating per il front-office (elenco dei commenti + form "lascia un commento"), un flusso di **validazione**
per singolo articolo che mantiene i commenti del front-office in attesa finché un amministratore non li approva, e un
widget della dashboard **Latest comments**. In combinazione con **MelisCmsUserAccount**, i commenti possono richiedere
un account del sito con login effettuato.

Nel back-office React (`/melis-react`) questo modulo **non fornisce alcun brick proprio** — nessuna `ui-react/`,
nessun `react-api.php`, nessun `react.capabilities.php`. È un modulo **backend + contributo** con tre
superfici di proprietà dell'host:

1. una **scheda di moderazione Comments** all'interno dell'editor di News/Blog — l'interfaccia della scheda React e i suoi endpoint `/comments…`
   sono **di proprietà dei brick News e Blog**, che delegano al servizio di questo modulo;
2. un **plugin di pagina front-office "Post comments"** inserito e configurato nell'editor di pagine CMS React;
3. un **widget della dashboard "Latest comments"** — un plugin della dashboard **PHP/phtml legacy** renderizzato all'interno
   dell'host dei widget della dashboard React (nessuna riscrittura in React).

## Attivazione

Aggiungi a `config/melis.module.load.php`:

```php
return [
    'MelisCmsComments',
];
```

Dipendenze Composer: `melis-core ^6.0` e `melis-cms ^6.0`. Dal punto di vista funzionale richiede almeno un modulo
di articoli — **MelisCmsNews** o **MelisCmsBlog** — per essere utile. **MelisCmsUserAccount** è un'integrazione
facoltativa per i commenti riservati agli account. Tutte le superfici sono subordinate all'attivazione: quando il modulo è assente,
gli endpoint dei commenti di News/Blog restituiscono **404** e il pannello di moderazione si nasconde.

## Servizi principali

| Alias del servizio | Ruolo |
| --- | --- |
| `MelisCmsCommentsService` | Servizio principale di CRUD/moderazione (estende `MelisEngineGeneralService`). Genera coppie di eventi `*_start`/`*_end` su ogni metodo. Chiamato dai controller react-api di News/Blog. |

Metodi principali di `MelisCmsCommentsService`:

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

`saveComment()` legge il flag `c{type}_validate_comments` dell'articolo: quando è abilitato e il commento proviene
dal front-office, viene memorizzato come in attesa (`validated=0`); i commenti del back-office vengono memorizzati come
approvati immediatamente. Tutto il testo salvato viene passato attraverso **HTMLPurifier 4.12** per la sanificazione XSS.

## Scheda di moderazione Comments (React, di proprietà di News/Blog)

Apri un articolo di News o un post di Blog nell'editor e passa alla scheda **Comments**. Elenca i
commenti di questo articolo con un **indicatore di stato** per riga (blu = in attesa, verde = mostrato, rosso = rifiutato), l'autore,
il testo del commento e l'orario, un riquadro inline **Name + write-a-comment + Add a comment** per
pubblicarne uno direttamente, e le azioni per riga **approve / refuse / delete** (approve/refuse compaiono solo quando
la validazione è attiva per l'articolo).

![La scheda Comments dell'editor React di News: un pannello COMMENTS con un campo inline Name, un riquadro "Write a comment…" e un pulsante rosso + Add a comment, quindi una riga di commento con un indicatore di stato, il testo del commento e le icone di azione refuse/delete](/screenshots/react/melis-cms-comments/meliscmscomments-tooloverride-news-edit-tab-comments.png)

Il componente della scheda React appartiene ai **brick News/Blog**, non a questo modulo. Non esiste **alcun
`react-api.php` in MelisCmsComments** — i commenti sono esposti tramite la react-api dei moduli News e Blog
stessi, che delegano ogni operazione a `MelisCmsCommentsService`:

| Metodo e URL | Controller / azione proprietari | Scopo |
| --- | --- | --- |
| `GET /melis/react-api/news/:id/comments` | `MelisCmsNewsReactApiController::commentsAction` | Tutti i commenti (tutti gli stati) di un articolo di news |
| `POST /melis/react-api/news/comments/save` | `commentSaveAction` | Crea/modifica un commento (BO → approvato) |
| `POST /melis/react-api/news/comments/approve/:cid` | `commentApproveAction` | Approva (`mccom_validated=1`, status=1) |
| `POST /melis/react-api/news/comments/refuse/:cid` | `commentRefuseAction` | Rifiuta (`mccom_validated=2`, status=0) |
| `POST /melis/react-api/news/comments/delete/:cid` | `commentDeleteAction` | Elimina il commento |
| `GET /melis/react-api/blog/:id/comments` | `MelisCmsBlog…ReactApiController::commentsAction` | Tutti i commenti di un post di blog |
| `POST /melis/react-api/blog/comments/{save,approve,refuse,delete}[/:cid]` | Azioni sui commenti Blog | Stesse operazioni per Blog |

`commentsAction` costruisce una query `getComments(['postId' => …, 'postType' => 'NEWS'])` senza
chiave `validated`, quindi restituisce i commenti **in attesa + approvati + rifiutati**. Ogni azione restituisce **404
quando il modulo non è disponibile**; il contratto è `{ success, data|error }`.

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

Il `MelisCmsCommentsTabController` legacy (getComments / save / approve / refuse / delete, protetto da
`hasAccess('meliscms_page')`) è ancora utilizzato dal percorso classic/iframe — vedi la
[documentazione legacy](/legacy/reference/modules/melis-cms-comments).

## Plugin di pagina front-office "Post comments"

`Controller\Plugin\MelisCmsCommentsPlugin` è un `MelisTemplatingPlugin` (chiave di configurazione `meliscmscomments`,
sezione **MelisCms**, configurazione in `config/plugins/MelisCmsCommentsPlugin.config.php`). Nel pannello **PLUGINS**
dell'editor di pagine CMS React, sotto **Melis Cms Comments**, trascina **Post comments** in una drop zone
su un template di pagina News/Blog.

![L'editor di pagine CMS con il pannello PLUGINS: il gruppo Melis Cms Comments espanso per mostrare il plugin Post comments trascinato in una DRAG & DROP ZONE; il form front-office renderizzato mostra un campo Name, un riquadro "Add a comment:" e un pulsante rosso Submit](/screenshots/react/melis-cms-comments/meliscmscomments-page-plugin-postcomments-menu-selector.png)

- La **finestra modale delle impostazioni** consente di scegliere il **Template** (predefinito `MelisCmsComments/comments`) e il **Post Type**
  (NEWS / BLOG), persistiti nell'XML del plugin della pagina come `template_path`, `mccplugin_post_type` e
  `registration_page_page_id` (per i commenti riservati agli account tramite MelisCmsUserAccount).

![La finestra modale Settings del plugin Post comments: una select Template (MelisCmsComments/comments) e una select Post Type (News / Blog), con i pulsanti Cancel / Apply; queste impostazioni vengono persistite nell'XML del plugin della pagina](/screenshots/react/melis-cms-comments/meliscmscomments-page-plugin-postcomments-config-settings.png)

- Il **rendering front-office** (`front()`) risolve l'articolo a partire dal parametro di query `newsId` / `blogId`, carica
  i commenti tramite `getCommentsByPostId()` e costruisce il form di aggiunta commento (Name + comment + Submit).
  Quando l'articolo richiede un account, attiva `melis_cms_user_account_login_form` per incorporare un plugin di
  login.
- Vista predefinita `MelisCmsComments/comments`; asset `plugins/css/commentsPlugin.css`,
  `plugins/js/commentsPlugin.js`.

## Widget della dashboard "Latest comments" (legacy)

`Controller\DashboardPlugins\MelisCmsCommentsLatestCommentsPlugin` estende
`MelisCoreDashboardTemplatingPlugin`; il suo `latestCommentsAction()` restituisce un `ViewModel` Laminas
(template `melis-cms-comments/dashboard/latest-comments`, un `.phtml`), registrato in
`config/dashboard-plugins/dashboard.config.php` (plugin id `MelisCmsCommentsLatest`). L'**host dei widget**
della dashboard React renderizza questo plugin legacy così com'è — **non esiste una riscrittura in React**. Elenca
i commenti più recenti per tipo di articolo (schede Blog / News) con i filtri **All sites / All users / limit**,
e per ciascun commento mostra l'autore, un badge di stato, il titolo dell'articolo e la data. I filtri per
sito/utente e il ricaricamento della zona sono serviti da `MelisCmsCommentsViewHelperController::listAction`
(`melis-cms-comments/dashboard/list`, zona `dashboard_latest_comments_list`).

![Il widget Latest comments della Dashboard React: una scheda "Blog comments" con i selettori All sites, All users e limit, quindi un elenco di commenti recenti (autore + badge con user id + badge verde "shown" a forma di occhio, il titolo dell'articolo tra parentesi, il testo del commento e "on: date")](/screenshots/react/melis-cms-comments/meliscmscomments-dashboardplugins-latestcomments.png)

## Tabelle del database

| Tabella | Contenuto |
| --- | --- |
| `melis_cms_comments` | Tutti i commenti: `mccom_id`, `mccom_post_id`, `mccom_type` (NEWS/BLOG), `mccom_comment_text`, `mccom_name`, `mccom_validated`, `mccom_status`, `mccom_date_creation`, `mccom_author_account`. |

Due colonne vengono aggiunte automaticamente alle tabelle dei moduli di articoli al bootstrap (nessuna modifica di schema richiesta lì):

| Colonna | Tabella | Scopo |
| --- | --- | --- |
| `cnews_validate_comments` | `melis_cms_news` | Flag "Validate comments" per singolo articolo per News. |
| `cblog_validate_comments` | `melis_cms_blog` | Flag "Validate comments" per singolo articolo per Blog. |

**Modello di stato.** `mccom_validated`: `0` = nuovo/in attesa (blu), `1` = approvato/mostrato (verde),
`2` = rifiutato/nascosto (rosso). `mccom_status` rispecchia la visibilità sul sito (`1` mostrato / `0` nascosto).

## Listener e cablaggio tra moduli

Collegati in `Module.php` al bootstrap:

| Listener | Evento | Scopo |
| --- | --- | --- |
| `MelisCmsCommentsFlashMessengerListener` | `melis_cms_comments_flash_messenger` | Feedback del flash-messenger e log delle attività (`CMS_COMMENT_ADD / UPDATE / DELETE`). |
| `MelisCmsCommentsSaveValidateCommentListener` | `meliscmsnews_get_postvalues` | Persiste `cnews_validate_comments` quando un articolo di news viene salvato. |
| `MelisCmsCommentsGdprAutoDeleteActionDeleteListener` | `melis_cms_user_account_gdpr_auto_delete_action_delete` | GDPR: imposta a null `mccom_author_account` per un account eliminato, quindi rigenera l'evento GDPR del modulo. |

`Module::addValidateCommentsField()` (bootstrap del back-office) verifica quali moduli di articoli sono attivi e
aggiunge la colonna `c{news,blog}_validate_comments` alle loro tabelle se mancante.

## File principali

| Aspetto | Percorso |
| --- | --- |
| Configurazione del modulo (servizi, controller, plugin) | `vendor/melisplatform/melis-cms-comments/config/module.config.php` |
| Configurazione del plugin front-office | `vendor/melisplatform/melis-cms-comments/config/plugins/MelisCmsCommentsPlugin.config.php` |
| Configurazione del plugin della dashboard | `vendor/melisplatform/melis-cms-comments/config/dashboard-plugins/dashboard.config.php` |
| Servizio principale | `vendor/melisplatform/melis-cms-comments/src/Service/MelisCmsCommentsService.php` |
| Controller della scheda legacy | `vendor/melisplatform/melis-cms-comments/src/Controller/MelisCmsCommentsTabController.php` |
| Plugin di templating front-office | `vendor/melisplatform/melis-cms-comments/src/Controller/Plugin/MelisCmsCommentsPlugin.php` |
| Widget della dashboard | `vendor/melisplatform/melis-cms-comments/src/Controller/DashboardPlugins/MelisCmsCommentsLatestCommentsPlugin.php` |
| Listener | `vendor/melisplatform/melis-cms-comments/src/Listener/` |
| Modello DB / table gateway | `vendor/melisplatform/melis-cms-comments/src/Model/Tables/MelisCmsCommentsTable.php` |
| Bootstrap / iniezione delle colonne | `vendor/melisplatform/melis-cms-comments/src/Module.php` |
| HTMLPurifier (incluso) | `vendor/melisplatform/melis-cms-comments/library/htmlpurifier-4.12.0/` |

> L'interfaccia della scheda Comments React e i suoi endpoint `/comments…` risiedono nei brick News/Blog
> (`MelisCmsNewsReactApiController`, `MelisCmsBlog…ReactApiController`); entrambi delegano a
> `MelisCmsCommentsService`. Modello dati, servizio e tool classico:
> [documentazione legacy](/legacy/reference/modules/melis-cms-comments).

Vedi anche: [MelisCmsNews](/it/reference/modules/melis-cms-news) · [MelisCmsBlog](/it/reference/modules/melis-cms-blog) · [MelisCms](/it/reference/modules/melis-cms) · [MelisEngine](/it/reference/modules/melis-engine) · [MelisCore](/it/reference/modules/melis-core)
