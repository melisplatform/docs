# MelisCmsUserAccount

> Sistema di account per i visitatori del sito front-office — registrazione, login e profili per sito per i membri del sito web, amministrato da uno strumento di back-office React nativo. Pacchetto `melisplatform/melis-cms-user-account`.

## Scopo

MelisCmsUserAccount gestisce gli account dei **visitatori del sito** (front-office) — le persone che si registrano ed effettuano
il login sui tuoi siti CMS. Questi sono distinti dagli account del personale di back-office gestiti da MelisCore. Gli account
hanno un ambito **per sito** (una stessa persona può possedere account su più siti). Il modulo fornisce due plugin di pagina
inseribili (modulo di login e modulo di registrazione), uno strumento di amministrazione di back-office e una pipeline GDPR
completa che copre l'informativa sui dati, l'esportazione dei dati, l'eliminazione anonimizzata e un flusso di lavoro
automatico di eliminazione degli account inattivi. Al bootstrap aggiunge inoltre colonne di chiave esterna alle tabelle
blog/news/comments, così che un singolo passaggio GDPR possa individuare, esportare o cancellare tutto ciò che un utente
possiede all'interno di quei moduli.

In v6 lo strumento di amministrazione di back-office (**Users FO**) è un **brick full-React nativo** — una vera
interfaccia CRUD React che richiama un livello JSON `react-api` — con un interruttore **New / Old** che ripiega sullo
strumento legacy in un iframe. Il framework, i servizi, le tabelle, i meccanismi GDPR e i plugin front-office sono
invariati; solo l'interfaccia di amministrazione è passata a React.

## Abilitazione

Aggiungi a `config/melis.module.load.php`:

```php
return [
    'MelisCmsUserAccount',
];
```

Dipendenze Composer: `melisplatform/melis-core` (framework GDPR, sessioni, strumenti BO) e
`melisplatform/melis-cms` (host pagina/plugin). `melis-engine` e `melis-front` vengono inclusi
transitivamente per il rendering front-office. Lo strumento React viene individuato automaticamente quando il modulo è
attivo (fornisce un `brick.manifest.json`); rimuovendo il modulo da `melis.module.load.php` lo strumento
scompare dal back-office React.

## Servizi principali

| Alias del servizio | Ruolo |
| --- | --- |
| `MelisCmsUserAccountService` | Servizio principale — con alias anche **`FrontUserAccountService`**. CRUD per gli utenti del sito più autenticazione. |
| `MelisCmsUserAccountGdprAutoDeleteService` | Logica della pipeline di eliminazione automatica degli account inattivi (avvisi + anonimizzazione). |
| `FrontUserAccountTable` | Table gateway per `melis_cms_user_account`. |
| `MelisCmsUserSitesTable` | Table gateway per `melis_cms_user_account_sites`. |
| `MelisPasswordValidator` | Validatore della policy delle password (min 8 caratteri, una minuscola, una cifra) applicato in fase di registrazione e di salvataggio del profilo. |

Metodi principali di `MelisCmsUserAccountService` (con alias `FrontUserAccountService`):

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

In alternativa, scatena l'evento `site_user_account_authentication` e lascia che
`MelisCmsUserAccountSiteUserAuthenticationListener` richiami `siteUserAuthenticate()`; l'utente
autenticato viene quindi memorizzato in un `Laminas\Session\Container` indicizzato per sito.

## Back-office (React) — Users FO

Lo strumento **Users FO** risiede nel back-office React (`/melis-react`) sotto il gruppo **MelisCms** della barra
laterale → **Utilisateurs FO** ("FO Users"). È un **brick full-React nativo** (non un iframe) montato
sulla rotta ad albero `/melis-cms/user-account`; la chiave di menu `melis_cms_user_account_tool_display`
regola l'accesso, le capability e l'iframe della vista Old. Lo strumento amministra solo gli **utenti del sito** —
mai il personale di back-office (per quello c'è lo strumento **Users** di MelisCore).

È un drill-down a due livelli esposto tramite le **sub-tab native** dell'host (`subTabs: true`): un
**elenco** piatto degli utenti del sito e un singolo modulo **User** aperto per sub-tab.

![Elenco React Users FO — schede KPI (Total / Active / Inactive / Admins), ricerca, filtri per stato/admin/sito, Reset filters, gestore Columns, Export, l'interruttore New / Old e + New user; ogni riga espone le azioni View sites, Edit e Delete](/screenshots/react/melis-cms-user-account/meliscmsuseraccount-tool-usersfo-list.png)

**Elenco (livello 1)** — una tabella ricercabile, ordinabile e filtrabile di ogni account front-office della
piattaforma, con **schede KPI** (Total / Active / Inactive / Admins). Controlli:

- **Search** (corrisponde a login, email, nome, cognome)
- Filtro **Status** (All / Active / Inactive) e filtro **Admin** (All / Admin / Non-admin)
- Selettore **Site** (All sites) e **Reset filters**
- Gestore **Columns** (nasconde / riordina le colonne tramite drag-and-drop)
- **Export** in Excel o CSV (eseguito lato client nel brick tramite SheetJS)
- Interruttore **New / Old** (in alto a destra) e pulsante **+ New user**

Colonne: **Id · Status · Admin · Picture · Email · Login · Full Name · Creation date · Action** (la
colonna Picture è solo di presentazione; clicca su qualsiasi altra intestazione per ordinare). Ogni riga espone tre azioni:

| Azione | Descrizione |
| --- | --- |
| View sites (🔍) | Modale che elenca, per ciascun sito a cui l'utente appartiene, la data di registrazione, l'ora dell'ultimo login, se l'appartenenza è **anonymized** (GDPR) e i domini del sito. |
| Edit (✏️) | Apre l'utente in una sub-tab (vedi sotto). |
| Delete (🗑) | Rimuove l'account (irreversibile). |

**Modulo User (livello 2)** — aprendo una riga o **+ New user** viene aggiunta una sub-tab con un singolo modulo **User**:
**Login** (di sola lettura durante la modifica), **Email**, **First name**, **Last name**, **Birthday** (un
calendario nella lingua della sessione), **Language**, una **Creation date** di sola lettura, un pannello **Picture**
(anteprima + Choose an image / Remove picture) e **Password** / **Confirm password**. Sulla destra,
gli interruttori **Active** e **Administrator** e l'elenco obbligatorio di checkbox **Sites**. **Save** rende persistente
l'account.

![Il modulo React di modifica utente — Login (di sola lettura durante la modifica), Email, First/Last name, Birthday, Language, Creation date di sola lettura, pannello Picture, Password / Confirm password, oltre agli interruttori Active e Administrator e all'elenco obbligatorio di checkbox Sites](/screenshots/react/melis-cms-user-account/meliscmsuseraccount-tool-usersfo-edit-tab-user.png)

> I campi Password riportano il suggerimento *"Leave empty to keep unchanged"* — la modifica di un profilo non forza mai un
> cambio di password. Quando una password **viene** digitata, deve soddisfare `MelisPasswordValidator` (min 8 caratteri,
> una minuscola, una cifra). **È richiesto almeno un sito**; un sito già **anonymized** (GDPR)
> per quell'utente viene scartato silenziosamente dall'invio.

**Interruttore New / Old** — l'intero strumento passa dall'interfaccia React (**New**, predefinita) allo strumento
classico renderizzato in un iframe (**Old**, `/melis/react-tool-page?key=melis_cms_user_account_tool_display`).
Lo strumento BO legacy è ancora servito da **`MelisCmsUserAccountToolController`**, invariato.

## Endpoint API React

Le rotte risiedono in `config/react-api.php`, servite dal controller
`MelisReactApiUserAccountController` (alias invocabile
`MelisCmsUserAccount\Controller\MelisReactApiUserAccount`). Tutte sotto `/melis/react-api/user-account`,
restituiscono il contratto `{ success, data, error }`.

| Metodo e URL | Scopo |
| --- | --- |
| `GET /user-account` | Elenca gli utenti (keyset: `limit`, `search`, `siteId`, `admin`, `status`, `sort`, `dir`, `after`) → `{items,total,nextCursor}`; ogni elemento riporta `hasPicture` |
| `GET /user-account/stats` | KPI `{total, active, inactive, admins}` |
| `GET /user-account/sites` | Elenco dei siti della piattaforma (filtro + checkbox del modulo) → `[{id,label}]` |
| `GET /user-account/langs` | Elenco delle lingue (select del modulo) → `[{id,label}]` |
| `GET /user-account/:id` | Un utente (aggiunge `siteIds[]` + `pictureDataUrl`) — per la modifica |
| `GET /user-account/:id/picture` | Immagine della riga come `image/jpeg` (ripiega sull'avatar predefinito) |
| `GET /user-account/:id/sites` | Dettaglio "View sites" per sito: etichetta, date di registrazione/ultimo login, `anonymized`, domini |
| `POST /user-account/save` | Crea / aggiorna l'account |
| `DELETE /user-account/delete/:id` | Elimina l'account |

`list`/`stats` interrogano `melis_cms_user_account` direttamente con SQL parametrizzato; `get`/`save`/`delete`/
`userSites` **delegano ai servizi legacy** (`FrontUserAccountTable`, `FrontUserAccountService`) —
gli stessi servizi utilizzati dallo strumento legacy, così che tutte le regole di business (login/email univoci, hash della
password, collegamenti ai siti, guardia GDPR sui siti anonimizzati) e gli eventi del log delle attività
(`meliscms_user_account_tooluser_save` / `_delete`) siano preservati.

## Capability

Dichiarate in `config/react.capabilities.php` sotto il nodo dei diritti
`melis_cms_user_account_tool_display`. Lo strumento è un CRUD piatto, quindi la dichiarazione è un elenco piatto:

```php
return [
  'melisReactToolCapabilities' => [
    'melis_cms_user_account_tool_display' => ['list', 'create', 'edit', 'delete', 'export'],
  ],
];
```

Ogni azione dell'API chiama prima `denyUnlessAccess()` (auth +
`MelisCoreRights::canAccess('melis_cms_user_account_tool_display')` → 401/403), poi un controllo delle capability:

| Capability | Applicata su |
| --- | --- |
| `list` | `list`, `stats`, `picture` |
| `edit` | `get`, `userSites` e `save` quando è presente un `id` (aggiornamento) |
| `create` | `save` quando non c'è un `id` (creazione) |
| `delete` | `delete` |
| `export` | solo dichiarativa — l'export viene eseguito lato client nel brick |

## Front office

Due plugin di templating sono registrati sotto `config/plugins/` (invariati in v6 — serviti dal
renderer front-office, non dallo strumento React):

| Plugin | Renderizza | Opzioni principali |
| --- | --- | --- |
| `MelisCmsUserAccountLoginPlugin` | Modulo di login (e controllo di logout quando già autenticati). | `template_path`, `page_id_registration_page` |
| `MelisCmsUserAccountUserRegisterPlugin` | Modulo di registrazione (username, email, password ×2, nome/cognome, immagine, lingua). | `template_path`, `page_id_login_page`, `force_joint_accounts` |

`force_joint_accounts` sul plugin di registrazione riutilizza un account cross-site esistente; l'appartenenza al sito
è memorizzata in `melis_cms_user_account_sites`.

Entrambi i plugin sono serviti da **`MelisCmsUserAccountPluginController`**:

| Azione | Ruolo |
| --- | --- |
| `authenticateUserAction()` | Autentica `login`/`password`/`siteId` e apre la sessione. |
| `logoutUserAction()` | Chiude la sessione dell'utente del sito. |
| `createUserAction()` | Valida e crea un utente (include l'upload dell'immagine). |
| `getRegistrationFormAction()` | Restituisce il modulo di registrazione (per il passaggio login↔register). |
| `getTranslationsAction()` | Stringhe di traduzione lato front. |

> Nel controller del plugin non è presente alcuna azione integrata di password dimenticata/reset o di attivazione via email.
> Costruiscile sopra a `FrontUserAccountService` se necessario.

## Tabelle del database

| Tabella | PK | Contiene |
| --- | --- | --- |
| `melis_cms_user_account` | `uac_id` | Utente del sito: `uac_login`, `uac_email`, `uac_password`, `uac_firstname`, `uac_lastname`, `uac_picture`, `uac_status`, `uac_admin`, `uac_birthday`, `uac_lang_id`, `uac_date_creation`. |
| `melis_cms_user_account_sites` | `uacs_id` | Tabella di giunzione utente ↔ sito: `uacs_uac_id`, id del sito, `uacs_anonymized` (flag GDPR per sito). |

`MelisCmsUserAccountAddCustomFieldsTableListener` (scatenato al bootstrap) aggiunge le colonne FK `*_author_account`
alle tabelle blog/news/comments, crea `melis_cms_user_account_sites` e migra la colonna legacy `uac_site_id`.
L'operazione è idempotente (verifica l'esistenza delle colonne).

## GDPR

### Informativa / estrazione / eliminazione manuale (set 1+2)

Nove listener rispondono a tre eventi MelisCore:

| Evento | Listener account | Listener blog | Listener comments |
| --- | --- | --- | --- |
| `melis_core_gdpr_user_info_event` | `…GdprUserInfoListener` | `…BlogGdprUserInfoListener` | `…CommentsGdprUserInfoListener` |
| `melis_core_gdpr_user_extract_event` | `…GdprUserExtractListener` | `…BlogGdprUserExtractListener` | `…CommentsGdprUserExtractListener` |
| `melis_core_gdpr_user_delete_event` | `…GdprUserDeleteListener` | `…BlogGdprUserDeleteListener` | `…CommentsGdprUserDeleteListener` |

I listener Blog e Comments sono attivi solo quando `MelisCmsBlog` / `MelisCmsComments` sono installati.
L'eliminazione anonimizza la riga dell'account e imposta `uacs_anonymized`. Le mappature dei campi e le soglie di conservazione
risiedono in `config/app.gdpr.php`.

### Pipeline automatica degli account inattivi (set 3)

Sei listener si agganciano allo scheduler di eliminazione automatica di MelisCore:

| Passo | Listener | Evento | Effetto |
| --- | --- | --- | --- |
| 1. Registrazione | `…GdprAutoDeleteModuleListListener` | `melis_core_gdpr_auto_delete_modules_list` | Dichiara il modulo allo scheduler. |
| 2. Tag | `…GdprAutoDeleteTagsListListener` | `MelisCoreGdprAutoDeleteService::TAGS_EVENT` | Registra i tag/le categorie di inattività. |
| 3. Primo avviso | `…GdprAutoDeleteWarningListUsersListener` | `MelisCoreGdprAutoDeleteService::WARNING_EVENT` | Invia una prima email di avviso agli utenti dormienti. |
| 4. Secondo avviso | `…GdprAutoDeleteSecondWarningListUsersListener` | `MelisCoreGdprAutoDeleteService::SECOND_WARNING_EVENT` | Invia una seconda email di avviso agli utenti ancora dormienti. |
| 5. Eliminazione | `…GdprAutoDeleteActionDeleteUserListener` | `MelisCoreGdprAutoDeleteService::DELETE_ACTION_EVENT` | Anonimizza gli account senza risposta. |
| (log) | `…GdprAutoDeleteGetEmailListener` | `melis_core_gdpr_auto_delete_log_get_user_email` | Risolve l'email per il log di audit (salta quelli già anonimizzati). |

L'"ultima attività" è tracciata da `updateUserConnectionDate()`.

## Listener cross-modulo

Registrati in `Module.php` al bootstrap:

| Listener | Evento | Scopo |
| --- | --- | --- |
| `MelisCmsUserAccountSiteUserAuthenticationListener` | `site_user_account_authentication` | Punto di ingresso dell'auth FO → `siteUserAuthenticate()`; memorizza l'utente in un `Laminas\Session\Container` indicizzato per sito. (priorità `-1001`) |
| `MelisCmsUserAccountLoginFormListener` | `melis_cms_user_account_login_form` | Inietta il membro loggato nel modulo dei commenti (campi nascosti `mccom_user_acct`/`mccom_site_id`, pulsante di logout, nome dall'account); rimuove i campi nome/email per gli utenti anonimi. |
| `MelisCmsUserAccountCommentsFormModificationListener` | `meliscmsuseraccount_comments_form_modification_listener` | Riordina gli elementi del modulo dei commenti secondo l'ordine richiesto. |
| `MelisCmsUserAccountAddAuthorPicture` | `melis_cms_user_account_add_user_picture` | Renderizza la `uac_picture` del membro accanto al suo commento (data URI base64). |
| `MelisCmsUserAccountSaveUserAccountListenter` | `meliscmsnews_get_postvalues` | Rende persistenti `cnews_author_account` / `cnews_comments_require_account` al salvataggio delle news. |
| `MelisCmsUserAccountAddCustomFieldsTableListener` | `meliscms_user_account_add_custom_fields_table` | Migrazione al bootstrap: aggiunge le colonne FK alle tabelle blog/news/comments, crea la tabella di giunzione dei siti, migra i dati legacy. |
| `MelisCmsUserAccountFlashMessengerListener` | `meliscms_user_account_tooluser_save`, `meliscms_user_account_tooluser_delete` | Messaggi flash BO su salvataggio/eliminazione (strumento legacy). |

## File principali

| Ambito | Percorso |
| --- | --- |
| Manifest del brick React | `vendor/melisplatform/melis-cms-user-account/public/ui-react/brick.manifest.json` |
| Rotte API React + invocabile | `vendor/melisplatform/melis-cms-user-account/config/react-api.php` |
| Capability React | `vendor/melisplatform/melis-cms-user-account/config/react.capabilities.php` |
| Controller API React | `vendor/melisplatform/melis-cms-user-account/src/Controller/MelisReactApiUserAccountController.php` |
| Controller dello strumento BO legacy (vista Old) | `vendor/melisplatform/melis-cms-user-account/src/Controller/MelisCmsUserAccountToolController.php` |
| Controller del plugin FO | `vendor/melisplatform/melis-cms-user-account/src/Controller/MelisCmsUserAccountPluginController.php` |
| Voce di menu BO | `vendor/melisplatform/melis-cms-user-account/config/app.interface.php` |
| Datatable BO legacy (colonne, filtri, modali) | `vendor/melisplatform/melis-cms-user-account/config/app.tools.php` |
| Tutti i moduli (FO + BO legacy) | `vendor/melisplatform/melis-cms-user-account/config/app.forms.php` |
| Mappature dei campi GDPR + soglie di conservazione | `vendor/melisplatform/melis-cms-user-account/config/app.gdpr.php` |
| Punti di integrazione con Comments | `vendor/melisplatform/melis-cms-user-account/config/comments.php` |
| Rotte, alias dei servizi, plugin, validatori | `vendor/melisplatform/melis-cms-user-account/config/module.config.php` |
| Configurazione del plugin di login | `vendor/melisplatform/melis-cms-user-account/config/plugins/MelisCmsUserAccountLoginPlugin.config.php` |
| Configurazione del plugin di registrazione | `vendor/melisplatform/melis-cms-user-account/config/plugins/MelisCmsUserAccountUserRegisterPlugin.config.php` |
| Servizio principale | `vendor/melisplatform/melis-cms-user-account/src/Service/MelisCmsUserAccountService.php` |
| Servizio di eliminazione automatica | `vendor/melisplatform/melis-cms-user-account/src/Service/MelisCmsUserAccountGdprAutoDeleteService.php` |
| Validatore delle password | `vendor/melisplatform/melis-cms-user-account/src/Validator/MelisPasswordValidator.php` |
| Table gateway del DB | `vendor/melisplatform/melis-cms-user-account/src/Model/Tables/` |
| Listener | `vendor/melisplatform/melis-cms-user-account/src/Listener/` |
| Bootstrap / iniezione delle colonne | `vendor/melisplatform/melis-cms-user-account/src/Module.php` |

Vedi anche: [MelisCore](/it/reference/modules/melis-core) · [MelisCms](/it/reference/modules/melis-cms) · [MelisCmsComments](/it/reference/modules/melis-cms-comments) · [MelisCmsBlog](/it/reference/modules/melis-cms-blog) · [MelisCmsNews](/it/reference/modules/melis-cms-news)
