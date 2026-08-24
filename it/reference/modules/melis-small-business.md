# MelisSmallBusiness

> Estensione per il team editoriale del CMS — **ruoli utente**, un **workflow** di validazione, il **versionamento** delle pagine, i **commenti** e il **blocco delle pagine**, oltre a una **libreria multimediale** TinyMCE, esposti tramite il back-office React. Pacchetto `melisplatform/melis-small-business`.

## Scopo

`MelisSmallBusiness` aggiunge strumenti di collaborazione per piccoli team sopra l'editor di pagine del CMS. Conserva le
**versioni** delle pagine pubblicate (ripristino/anteprima di uno stato precedente), gestisce un **workflow** dei contenuti
in cui un redattore richiede la validazione e un revisore la convalida o la rifiuta, allega **commenti** alle
pagine, impedisce a due utenti di modificare la stessa pagina contemporaneamente tramite un **blocco pagina**, gestisce uno
strumento di **ruoli utente** personalizzato e include una **libreria multimediale** basata su TinyMCE (MoxieManager). La logica di business
resta lato server (servizi Laminas, eventi dell'editor CMS); in v6 l'intera superficie rivolta all'utente è un insieme
di brick React e contributi modulari.

## Come attivarlo

Si tratta di un modulo Laminas standard. Aggiungilo a `config/melis.module.load.php`:

```php
return [
    // …
    'MelisSmallBusiness',
];
```

Dipende da `melis-core`, `melis-engine`, `melis-front` e `melis-cms`, e le sue tabelle vengono create
tramite dbdeploy (`extra.dbdeploy = true`). Ciascuna superficie React elencata di seguito compare **solo quando il modulo è
attivo** (individuazione dei brick tramite `GET /melis/react-api/react-modules`).

## Superfici React

Nel back-office React (`/melis-react`) il modulo fornisce **due brick** e **due contributi
modulari** privi di una route propria.

| Superficie | Tipo | Route / host |
| --- | --- | --- |
| **User Roles** (`smallbusiness`) | full-React nativo (interruttore New/Old) | `/melis-core/user-roles` |
| **Media library** (`smallbusiness-medialib`) | brick iframe (MoxieManager) | `/melis-cms/media-library` |
| **Modale Workflow** | modale condivisa (`window.__melisWorkflowModal`) | renderizzata da News / Blog / editor di pagine CMS / Newsletter + widget della Dashboard |
| **Versionamento / Commenti / Blocco** | schede + banner nell'editor di pagine CMS | contribuito al nodo di capacità `meliscms_page` |
| **Ruolo in Users** | colonna/filtro/selettore Ruolo | strumento host Users, condizionato da `useModuleActive('MelisSmallBusiness')` |

`public/ui-react/brick.manifest.json` dichiara entrambi i brick; `ui-react/src/brick.tsx` li registra
e pubblica la modale Workflow come variabile globale della window in modo che altri brick possano renderizzare un'unica implementazione condivisa.

## Strumento User Roles

**Dove:** barra laterale → **MelisCore → User Roles** (`/melis-core/user-roles`).

Un **ruolo** è un profilo di diritti denominato, memorizzato una sola volta (`melis_core_user_role`) e assegnato a molti utenti.
L'elenco mostra ogni ruolo con schede KPI (Roles / Assigned), la ricerca, un gestore Columns, l'Export e un
interruttore **New / Old** (Old = lo strumento classico in un iframe). Ogni riga (ID, Name, Created, numero di Users)
dispone di azioni di modifica/eliminazione; un ruolo assegnato a degli utenti **non può essere eliminato**.

![Elenco dei ruoli nel back-office React](/screenshots/react/melis-small-business/melissmallbusiness-tool-roles-list.png)

La modifica di un ruolo apre una sotto-scheda con un campo **Role name** e un albero **Access rights** che rispecchia
l'albero dei diritti di Users (TOOLS raggruppati per sezione, List/Create/Edit/Delete/Export per ogni strumento, oltre alle
sezioni Pages e Dashboard-plugins). **Save** rende persistenti il nome e l'XML `urole_rights`.

![Editor dei ruoli e il relativo albero dei diritti](/screenshots/react/melis-small-business/melissmallbusiness-tool-roles-edit-and-rights.png)

::: warning
La scrittura dell'XML dei **diritti** di un ruolo richiede un amministratore della piattaforma (`usr_admin`); un non amministratore che modifica
un ruolo riceve un 403 sulla scrittura dei diritti. Questo blocca un percorso di escalation dei privilegi (creare un ruolo con tutti i diritti,
per poi auto-assegnarselo). Il **nome** del ruolo può essere modificato da chiunque disponga del diritto `edit` dello strumento.
:::

### Ruolo nello strumento Users

Quando il modulo è attivo, lo strumento **Users** di MelisCore acquisisce una colonna **Role** + filtro nell'elenco
e un selettore **Role** nel form utente (accanto a Status e Rights). Il menu a tendina è alimentato da
`GET /melis/react-api/roles` (l'elenco di selezione di MelisCore); al salvataggio, un listener re-inietta le
capacità del ruolo in modo che non vadano perse.

![Form utente con il selettore Role](/screenshots/react/melis-small-business/melissmallbusiness-tooloverride-users-edit-withrole.png)

## Libreria multimediale

**Dove:** barra laterale → **MelisCms → Media library** (`/melis-cms/media-library`).

Il file browser avanzato TinyMCE / **MoxieManager**: le cartelle a sinistra, i file a destra
(nome, dimensione, tipo, data), con Create, Upload, vista a elenco/griglia, Sort, Filter e le scorciatoie Favorites/History/
Uploaded. La pagina React è un sottile wrapper che renderizza un iframe a scheda intera verso il moxiemanager legacy
(`/melis/MelisSmallBusiness/js/tinyMCE/moxiemanager/index.php?lang=xx`), quindi il comportamento è
identico a quello dello strumento classico — senza react-api proprie.

![Libreria multimediale — browser MoxieManager in una scheda React](/screenshots/react/melis-small-business/melissmallbusiness-tool-medialibrary.png)

## Workflow (validazione delle pagine)

Il Workflow consente a un redattore di **richiedere** la validazione e a un validatore di **rispondere**. La **stessa modale**
si apre dall'editor di pagine CMS (pulsante **Workflow**), dagli editor di News e Blog e dal widget della Dashboard.
È generica rispetto al tipo di elemento — `PAGE`, `NEWS`, `BLOG`.

In **Ask for validation**, scegli un **Role** per notificare tutti coloro che hanno quel ruolo, oppure **"1 person
only"** per rivelare un menu a tendina **User** e indirizzare una singola persona, quindi **Send request**.

![Modale Workflow — richiesta a una singola persona](/screenshots/react/melis-small-business/melissmallbusiness-pageoverride-workflow-demand-1person.png)

La sezione **History** della modale elenca ogni richiesta e risposta (Date, Status, To/Role, From, Action). Un
destinatario di una richiesta aperta ottiene i pulsanti **Validate** / **Refuse** e può allegare una nota.

![Modale Workflow — cronologia con Validate/Refuse](/screenshots/react/melis-small-business/melissmallbusiness-pageoverride-workflow-demand-to-validated.png)

La **Dashboard** del back-office mostra un widget **Workflow** che elenca le richieste, suddiviso in *Users' demands*
/ *My demands* con sotto-schede PAGE / NEWS; ogni riga mostra una pill di stato (VALIDATED / REFUSED / Demand)
e offre azioni inline di validazione (✓) / rifiuto (✗) e di anteprima sulle richieste a te indirizzate.

![Widget Workflow della Dashboard](/screenshots/react/melis-small-business/melissmallbusiness-dashboardplugins-workflow.png)

## Versionamento e Commenti (editor di pagine CMS)

L'apertura di una pagina nell'editor CMS aggiunge due schede SmallBusiness dopo quelle native:

- **Versioning** — un elenco paginato delle istantanee della pagina (No., Name, Modified on, By) con
  View / Restore / Rename per ogni riga. Un'istantanea viene creata a ogni pubblicazione.

  ![Editor di pagine — scheda Versioning](/screenshots/react/melis-small-business/melissmallbusiness-pageoverride-edit-tab-versionning.png)

- **Comments** — la timeline delle attività della pagina che mescola i commenti degli utenti e gli eventi di workflow (dal più
  recente), con una casella "Add a comment".

  ![Editor di pagine — scheda Comments](/screenshots/react/melis-small-business/melissmallbusiness-pageoverride-tab-comments.png)

Un banner di **blocco pagina** + un pulsante **Unlock** compaiono quando un altro utente detiene il blocco sulla pagina.

## Endpoint react-api

Tutti sotto `/melis/react-api/…`, contratto `{ success, data, error }`. I controller risiedono in questo
modulo (`config/react-api.php` + `src/Controller/MelisReactApi*Controller.php`).

| Controller | Route di base | Guard |
| --- | --- | --- |
| `MelisReactApiRoleController` | `GET /user-roles`, `/user-roles/stats`, `/user-roles/:id`; `POST /user-roles/save`; `DELETE /user-roles/delete/:id` | accesso `melissb_tool_userrole` + capacità (scrittura XML dei diritti = solo admin) |
| `MelisReactApiWorkflowController` | `GET /workflow/roles`, `/workflow/users`, `/workflow/history`; `POST /workflow/ask` | solo autenticato |
| `MelisReactApiPageVersioningController` | `GET /cms-page/versioning` | solo autenticato |
| `MelisReactApiPageCommentsController` | `GET /cms-page/comments`, `/cms-page/timeline`; `POST /cms-page/comments/save` | solo autenticato |
| `MelisReactApiPageLockController` | `GET /cms-page/lock`; `POST /cms-page/unlock` | solo autenticato |

Le **mutazioni** del Workflow riutilizzano i collaudati endpoint legacy anziché react-api:
`GET /melis/MelisSmallBusiness/MelisWorkflow/saveWorkflowActions` (validate / refuse) e
`POST /melis/MelisSmallBusiness/MelisWorkflow/addWorkflowComments` (aggiunta di una nota). Il testo dei commenti viene
sanificato con HTMLPurifier al salvataggio.

## Capacità

`config/react.capabilities.php` **contribuisce** il pulsante + le schede dell'editor di pagine sotto la chiave condivisa
`meliscms_page` di proprietà di MelisCms (uniti, così MelisCms non deve conoscere SB):

| Tipo | Chiave | Etichetta |
| --- | --- | --- |
| action | `workflow` | Pulsante Workflow |
| action | `unlock` | Pulsante Unlock |
| tab | `melissb_page_versioning` | Scheda Versioning |
| tab | `melissb_page_comments` | Scheda Comments |

`CmsPage.tsx` filtra queste schede / nasconde questi pulsanti tramite `useCaps('meliscms_page').can(cap)`. Lo
strumento Roles stesso è associato alla chiave `melissb_tool_userrole` e la Media library a
`melissb_medialib`.

## Tabelle del database

Create da `install/dbdeploy/126618_melis_sb_install.sql`.

| Tabella | Ruolo |
| --- | --- |
| `melis_sb_page_versioning` | Copie archiviate delle pagine pubblicate (supporta la scheda Versioning). |
| `melis_sb_workflow` | Record di workflow per elemento. |
| `melis_sb_workflow_events` | Eventi di workflow (ask / validate / refuse). |
| `melis_sb_page_comment` | Commenti allegati a una pagina (tipo di commento 1 = PAGE, 2 = WORKFLOW). |
| `melis_sb_page_comment_type` | Tipi di commento. |
| `melis_sb_page_locked` | Blocchi pagina attivi (quale utente sta modificando quale pagina). |
| `melis_core_user_role` | Ruoli denominati (`urole_id`, `urole_name`, `urole_creation_date`, XML `urole_rights`). |

## Servizi chiave

| Alias del servizio | Ruolo |
| --- | --- |
| `MelisEnginePage` | Il modulo **sovrascrive** il servizio di pagina del motore con `MelisSBPageService`; sulla route di anteprima di versione restituisce l'albero versionato da `melis_sb_page_versioning`, altrimenti si comporta come il parent. |
| `MelisSBPageCommentService` | Commenti delle pagine: `getPageComments()` / `setPageComments()`. |

::: warning
Assegnando l'alias `MelisEnginePage` alla propria classe, questo modulo sostituisce il servizio di pagina core per
l'intera applicazione mentre è abilitato. Tienilo presente nell'ordinamento dei moduli.
:::

Il workflow invia tre email al back-office (`app.emails.php`): `WF_DEMAND`, `WF_VALIDATED`,
`WF_REFUSED` (tag `USER_TO`, `USER_FROM`, `TYPE`, `DETAILS`).

## File chiave

| Aspetto | Percorso |
| --- | --- |
| Bootstrap del modulo e listener | `src/Module.php`, `src/Listener/` |
| Route react-api + invokable | `config/react-api.php` |
| Controller react-api | `src/Controller/MelisReactApi{Role,Workflow,PageVersioning,PageComments,PageLock}Controller.php` |
| Contributo delle capacità | `config/react.capabilities.php` |
| Servizio di pagina (override del motore) | `src/Service/MelisSBPageService.php` |
| Servizio dei commenti | `src/Service/MelisSBPageCommentService.php` |
| Brick React (sorgente) | `ui-react/src/` (`brick.tsx`, `UserRolePage.tsx`, `MediaLibraryPage.tsx`, `WorkflowModal.tsx`, `RolesRightsTree.tsx`) |
| Bundle compilato | `public/ui-react/brick.js` + `brick.manifest.json` |
| SQL di installazione | `install/dbdeploy/126618_melis_sb_install.sql` |
