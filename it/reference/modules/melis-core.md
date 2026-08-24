# MelisCore

> La base del back-office su cui si costruisce ogni altro modulo — login, utenti/ruoli/diritti, il
> framework del menu e degli strumenti, la dashboard, la configurazione, le email, il GDPR e il
> sistema di base servizi + eventi — ora reso dal back-office **React** su `/melis-react`. Pacchetto
> `melisplatform/melis-core`.

## Scopo

`MelisCore` è il cuore back-office di Melis Platform. Fornisce lo shell applicativo (header, menu di
sinistra, albero degli strumenti, dashboard, footer), l'albero di configurazione `MelisCoreConfig`
che aggrega i file `app.*.php` di ogni modulo, l'autenticazione e i diritti per strumento, la
gestione degli utenti, la gestione di piattaforma/ambiente, le email transazionali, gli strumenti
GDPR, un endpoint di autenticazione micro-service e il livello condiviso servizi/eventi che ogni
altro modulo estende. Ogni modulo `melisplatform/*` dipende da esso.

In v6, MelisCore **è anche l'app back-office React**. Lo stesso shell viene servito come
single-page app React 19 + TypeScript + Tailwind su `/melis-react`, in esecuzione parallela al
back-office legacy `.phtml` su `/melis`. MelisCore fornisce lo shell (layout, routing, il client
generico `react-api`, il loader di moduli/brick, il resolver delle capability, il toggle New/Old)
**e** i propri strumenti React nativi (Utenti, Dashboard, Annunci, Email, GDPR, Lingue, Log,
Moduli, Altra configurazione, Piattaforme, Tema della piattaforma, Il mio account, login/2FA). Ogni
altro modulo si innesta **in** questo shell.

## Attivarlo

Aggiungerlo a `config/modules.config.php` — MelisCore deve caricarsi presto perché quasi ogni altro
modulo chiama i suoi servizi:

```php
return [
    'MelisCore',
    // … other modules …
];
```

Il back-office React è fornito da tre moduli cooperanti:

| Modulo | Ruolo |
| --- | --- |
| `MelisCore` | Il sorgente/build dell'app React + le rotte `react-api` e i controller degli strumenti nativi. |
| [`MelisReactApi`](/it/reference/modules/melis-react-api) | Il bridge generico `react-api` (`me`, `menu`, `assets`, `langs`, `react-modules`, `rights`, `i18n`, `dashboard`). |
| [`MelisReactOverride`](/it/reference/modules/melis-react-override) | Serve lo shell SPA su `/melis-react` e il meccanismo iframe legacy (`/melis/react-tool-page`). |

I suoi moduli infrastrutturali di supporto restano [MelisAssetManager](/it/reference/modules) (che
serve gli asset React con hash da `/MelisCore/ui-react/`), [MelisDbDeploy](/it/reference/modules),
[MelisComposerDeploy](/it/reference/modules) e [MelisInstaller](/it/reference/modules).

## L'architettura del back-office React

Il sorgente dell'app Vite + React risiede in `vendor/melisplatform/melis-core/ui-react/` ed è
compilato nella cartella committata `vendor/melisplatform/melis-core/public/ui-react/`. A runtime:

- Lo **shell (SPA)** viene servito su **`/melis-react`** da `MelisReactOverride`; il back-office
  legacy su `/melis` resta inalterato.
- Gli **asset con hash** vengono caricati da **`/MelisCore/ui-react/`** (il `base` di Vite, servito
  da MelisAssetManager).
- L'**API JSON** è sotto **`/melis/react-api/…`** con il contratto `{ success, data, error }`.

Ogni strumento che l'utente vede raggiunge lo schermo tramite **uno di tre meccanismi**:

1. **Strumento React nativo** — una vera pagina React sostenuta da un `MelisReactApi*Controller` in
   MelisCore (Utenti, Lingue, Email, GDPR…). Elencato nel registro dei moduli
   (`ui-react/src/lib/module-registry.ts`).
2. **Brick di modulo** — un altro modulo attivo fornisce la propria UI React come *brick*, caricato
   a runtime (presente solo se il modulo è attivo). Individuato tramite
   `GET /melis/react-api/react-modules`.
3. **Pool di iframe** — qualsiasi strumento legacy senza una rotta React dedicata viene reso
   all'interno dello shell in un iframe del pool tramite `/melis/react-tool-page?key=<melisKey>`.

Il **menu è dinamico** (`GET /melis/react-api/menu` restituisce l'albero degli strumenti filtrato
per diritti), le rotte degli strumenti sono **derivate da quell'albero** (`/[section]/[tool]`, ad
es. `/melis-core/user`) e nulla è codificato in modo fisso per modulo. Uno strumento nativo può
inoltre disporre di un toggle **New (React) / Old (iframe)** per confrontare la sua vista React con
lo strumento classico.

## Shell del back-office

Lo shell (`ui-react/src/components/layout/Shell.tsx`) compone la sidebar, la barra superiore, le
sotto-schede, la barra delle schede degli strumenti legacy e l'area dei contenuti. Ogni montaggio di
strumento è racchiuso in un `ToolErrorBoundary` per strumento, così che il crash di rendering di uno
strumento non lasci mai vuoto l'intero back-office.

### Barra superiore

Il lato destro della barra superiore contiene un interruttore **tema** (chiaro/scuro), il selettore
di **lingua**, un'icona **Messenger** (quando quel modulo è attivo), una campanella di **notifiche**
e il tuo **avatar utente** (apre *Il mio account* e contiene *Logout*). Un pulsante per nascondere
la sidebar si trova all'estrema sinistra.

![Le icone del lato destro della barra superiore — toggle tema, lingua, messenger, notifiche, avatar](/screenshots/react/melis-core/meliscore-header-righticons.png)

### Sidebar sinistra e footer

La sidebar mostra il link **Dashboard** più l'**albero degli strumenti**, raggruppati per sezione
(MelisCore, MelisCms, MelisMarketing, MelisCommerce, Marketplace, Melis AI…). **Ciò che vedi dipende
dai tuoi diritti** — compaiono solo gli strumenti che puoi utilizzare. Il footer mostra la
**versione** di piattaforma / MelisCore.

![Il footer — versione MelisCore / piattaforma](/screenshots/react/melis-core/meliscore-footer-version-meliscore.png)

### Dashboard

La pagina iniziale dopo il login. Mostra delle **bolle** in alto (contatori Melis News / Aggiornamenti
/ Notifiche / Messaggi) e una griglia di **widget** (plugin della dashboard). I widget si aggiungono
dalla tavolozza **"Add a widget"** e si dispongono tramite drag-and-drop; la disponibilità dipende
dai tuoi diritti.

![La Dashboard React — bolle in alto, una griglia di widget vuota e la tavolozza "Add a widget"](/screenshots/react/melis-core/meliscore-dashboard-empty.png)

![La tavolozza "Add a widget" — scegli un widget (raggruppato per modulo) da rilasciare sulla dashboard](/screenshots/react/melis-core/meliscore-dashboardplugins-menu.png)

## Autenticazione

Il login risiede su `/melis-react/login` (React) — nome utente + password, **Remember me**
opzionale e un selettore di lingua. In caso di successo si arriva alla Dashboard. Gli account con
**2FA** vengono indirizzati a `/verify-2fa` (è possibile richiedere di nuovo un codice quando viene
inviato via email). Il link **Lost password** (`/forgot-password`) invia via email un link di reset
che apre `/reset-password/:hash`. Il branding del pannello di login è configurabile tramite lo
strumento **Tema della piattaforma**.

Dietro le quinte il livello PHP è invariato: il login invia in POST al legacy
`POST /melis/authenticate`, il polling di sessione usa `GET /melis/islogin` e i diritti provengono da
`MelisCoreAuth` / `MelisCoreRights`.

## Utenti, ruoli e diritti

**Dove:** MelisCore → Amministrazione → **Gestione utenti** (`/melis-core/user`). Gestisci ogni
account del back-office. L'elenco ha schede KPI (Totale / Attivi / Inattivi / Amministratori),
ricerca, filtri per stato e ruolo, un gestore di Colonne, Esportazione, il toggle New/Old e **+ Nuovo
utente**.

![Lo strumento Utenti — schede KPI, filtri, gestore colonne, Esportazione, toggle New/Old, "+ Nuovo utente"](/screenshots/react/melis-core/meliscore-tool-users-list.png)

Aprendo un utente si ottengono quattro schede:

- **Profilo** — identità, tag, toggle di stato, ruolo, un flag **Amministratore** e una sezione
  password con feedback di complessità in tempo reale.

  ![La scheda Profilo — identità, tag, schede Stato/Ruolo/Diritti e un campo password con requisiti in tempo reale](/screenshots/react/melis-core/meliscore-tool-users-edit-tab-profile.png)

- **Diritti** — l'**albero degli accessi** (spunta quali strumenti/sezioni l'utente può utilizzare),
  più un pannello **Dashboard Plugins** e un pannello **Pagine**. Tutto ciò che non è concesso è
  nascosto dal menu dell'utente. Gli strumenti che dichiarano **capability** espongono sotto-caselle
  (List / Create / Edit / Delete / Export).

  ![L'albero dei diritti — conteggi per sezione e caselle di capability per strumento](/screenshots/react/melis-core/meliscore-tool-users-edit-tab-rights-1.png)

  ![Più in basso nella scheda Diritti — il pannello Dashboard Plugins e il pannello Pagine](/screenshots/react/melis-core/meliscore-tool-users-edit-tab-rights-2.png)

- **Connessioni** — la cronologia di login dell'utente (data, ora di ingresso/uscita, durata).
- **Microservizi** — genera una **chiave API** così che terze parti possano autenticarsi come questo
  utente verso gli endpoint micro-service.

  ![Una chiave API generata — toggle abilita/disabilita, chiave mascherata con mostra/copia/rigenera e l'URL del microservizio](/screenshots/react/melis-core/meliscore-tool-users-edit-tab-microservices-generated.png)

I **Ruoli** definiscono un insieme di diritti una sola volta e li assegnano a molti utenti; lo
strumento Ruoli è fornito da **MelisSmallBusiness**, quindi il selettore *Ruolo* della scheda Profilo
compare solo quando quel modulo è attivo.

> Regola pratica: se qualcuno "non riesce a vedere uno strumento", il suo albero dei **Diritti** non
> lo concede — modifica l'utente (o il suo ruolo) → Diritti → spunta lo strumento.

## Il mio account

**Dove:** avatar della barra superiore → **Il mio account** (`/melis-core/account`). Modifica la tua
email, cambia la tua password, imposta la lingua dell'interfaccia e carica un'immagine del profilo. I
moduli possono aggiungere schede qui (ad es. Melis Messenger). Questo è l'unico strumento nativo
senza guardia di capability — è aperto a qualsiasi utente autenticato.

![La pagina "Il mio account" — avatar, riepilogo identità e una scheda Profilo (email / password / lingua)](/screenshots/react/melis-core/meliscore-tool-profile-tab-profile.png)

## Annunci

**Dove:** MelisCore → Amministrazione → **Annuncio** (`/melis-core/announcement`). Annunci di
piattaforma mostrati sulla dashboard, con schede KPI, ricerca, un filtro di stato e **+ Nuovo
annuncio**. L'editor è un titolo + un corpo in **rich-text (TinyMCE)**, un toggle **Active** e una
**Data**.

![L'elenco Annunci — schede KPI, filtro Active/Inactive, modifica/eliminazione per riga](/screenshots/react/melis-core/meliscore-tool-announcement-list.png)

![L'editor degli annunci — Titolo, testo HTML (TinyMCE), toggle Active e Data](/screenshots/react/melis-core/meliscore-tool-announcement-edit.png)

## Lingue del back-office

**Dove:** MelisCore → Configurazione di sistema → **Lingue del back-office** (`/melis-core/language`).
Le locale (locale + nome) disponibili per gli utenti del back-office. `en_EN` è la **predefinita
protetta** (non può essere rinominata via né eliminata). Il salvataggio rigenera i file di traduzione
tramite `MelisCoreTranslation`.

![L'elenco Lingue — locale + nome, la predefinita (en_EN) contrassegnata, modifica per riga](/screenshots/react/melis-core/meliscore-tool-bolanguages-list.png)

## Gestione email

**Dove:** MelisCore → Configurazione di sistema → **Gestione email** (`/melis-core/emails`). Le
**email transazionali** della piattaforma (creazione account, password persa, workflow…). L'elenco
mostra nome, codice, mittente/email del mittente e un badge **Source** (Default vs Custom).

![L'elenco Gestione email — template transazionali con codice, mittente e source Default/Custom](/screenshots/react/melis-core/meliscore-tool-emailsmanagement-list.png)

L'editor ha delle **Proprietà generali** (nome, codice, mittente, reply-to, tag di sostituzione,
percorso del layout) e una sezione **Contenuto per lingua** (oggetto + corpo HTML/testo per lingua)
con tag sostituibili come `[NAME]`, `[EMAIL]`, `[LOGIN]`. I salvataggi delegano a
`MelisCoreBOEmailService::saveBoEmailByCode`.

![Le proprietà dell'email — nome, codice, mittente, reply-to, tag di sostituzione e percorso del layout](/screenshots/react/melis-core/meliscore-tool-emailsmanagement-edit-properties.png)

![Il contenuto per lingua — oggetto, un corpo HTML TinyMCE con tag `[NAME]`/`[EMAIL]`/`[LOGIN]` e una versione in testo semplice](/screenshots/react/melis-core/meliscore-tool-emailsmanagement-edit-language.png)

## GDPR

**Dove:** MelisCore → Amministrazione → **GDPR** (`/melis-core/gdpr`). Quattro schede:

- **Dati** — cerca una persona per nome/email; su tutti i moduli, vedi i dati conservati su di essa,
  quindi **estrai** (esporta XML) oppure **elimina** i record selezionati.

  ![La scheda Dati GDPR — cerca una persona; i moduli restituiscono i dati corrispondenti da estrarre o eliminare](/screenshots/react/melis-core/meliscore-tool-gdpr-tab-data.png)

- **Banner** — configura i testi del banner cookie/consenso GDPR per sito + lingua.
- **Anonimizzazione** — le configurazioni pianificate di **auto-eliminazione / conservazione dati**
  (una per sito + modulo), con **Esegui** e **Log**.

  ![La scheda Anonimizzazione — configurazioni di auto-eliminazione, con Log, Esegui e "+ Nuova configurazione"](/screenshots/react/melis-core/meliscore-tool-gdpr-tab-anonymization.png)

- **SMTP** — il server di posta usato per inviare le email di avviso di anonimizzazione.

  ![La scheda SMTP — host / username / password per le email di avviso di anonimizzazione](/screenshots/react/melis-core/meliscore-tool-gdpr-tab-smtp.png)

## Log

**Dove:** MelisCore → Configurazione di sistema → **Log** (`/melis-core/logs`). Un **registro delle
attività** di sola lettura e ricercabile — filtra per tipo, titolo, utente e intervallo di date, con
schede KPI (Totale / Oggi / Tipi). I non amministratori vedono solo le proprie azioni.

![Il visualizzatore Log — schede KPI, filtri per tipo/titolo/utente/data e righe di attività](/screenshots/react/melis-core/meliscore-tool-logs-list.png)

## Moduli

**Dove:** MelisCore → Configurazione di sistema → **Moduli** (`/melis-core/modules`). Attiva/disattiva
e **riordina** (drag-and-drop) i moduli della piattaforma; ogni riga mostra il modulo, il suo
pacchetto, la versione e le dipendenze. **Salva** riscrive `config/melis.module.load.php` e attiva
`meliscore_module_management_save_end`.

![Lo strumento Moduli — ricerca, conteggio attivi, riordino con drag dell'ordine di caricamento, toggle per modulo, badge requires/versione](/screenshots/react/melis-core/meliscore-tool-modules-list.png)

## Altra configurazione (policy di login e password)

**Dove:** MelisCore → Configurazione di sistema → **Altra configurazione** (`/melis-core/other-config`).
La policy di sicurezza: **blocco account dopo tentativi falliti**, **durata di validità della
password**, **riutilizzo della password** e **complessità della password** (lunghezza minima +
requisiti di minuscole/maiuscole/cifre/caratteri speciali). Scritta in `app.login.php` tramite
`MelisPasswordSettingsService`.

![La pagina Altre configurazioni — toggle di blocco, validità password, riutilizzo e complessità](/screenshots/react/melis-core/meliscore-tool-other-config.png)

## Piattaforme

**Dove:** MelisCore → Configurazione di sistema → **Piattaforme** (`/melis-core/platforms`). Gestisci
gli **ambienti** (dev/staging/prod), con schede KPI, ricerca e **+ Nuova piattaforma**. La
piattaforma **corrente** è contrassegnata e il suo nome non può essere modificato.

![L'elenco Piattaforme — la piattaforma "corrente" contrassegnata, colonne Marketplace/Cache, modifica/eliminazione per riga](/screenshots/react/melis-core/meliscore-tool-platforms-list.png)

![L'editor della piattaforma — nome (bloccato per la piattaforma corrente), toggle di aggiornamenti Marketplace e Cache](/screenshots/react/melis-core/meliscore-tool-platforms-edit.png)

## Tema della piattaforma

**Dove:** MelisCore → Configurazione di sistema → **Schema della piattaforma**
(`/melis-core/platform-scheme`). Configura il **branding** del back-office: il logo dell'header, il
**pannello sinistro di login** (logo, sfondo, titolo/sottotitolo per lingua) e la favicon. **Restore
to Default** lo reimposta.

![La pagina Tema della piattaforma — logo dell'header del back-office e branding del pannello sinistro di login](/screenshots/react/melis-core/meliscore-tool-platformscheme.png)

> In React ci sono due controller di tema chiavati sotto lo stesso nodo di diritti
> `meliscore_tool_platform_scheme`: questa pagina **Tema della piattaforma** (branding React — loghi,
> login, favicon) e lo **schema colori** legacy (colori del back-office, rigenera `schemes.css`).

## Strumenti nativi → controller e capability

Ogni strumento React nativo mappa a un `MelisReactApi*Controller` (in `src/Controller/`) dichiarato in
`config/react-api.php`, protetto da un `melisKey` portatore di diritti. Le **capability** avanzate per
azione sono dichiarate in `config/react.capabilities.php` e applicate lato server (default-allow
nella UI).

| Strumento (rotta) | Controller | melisKey / guardia | Capability |
| --- | --- | --- | --- |
| Utenti (`/melis-core/user`) | `MelisReactApiUserController` | `meliscore_tool_user` | list, create, edit, delete, export |
| Il mio account (`/melis-core/account`) | `MelisReactApiUserProfileController` | `meliscore_user_profile` (solo auth) | — |
| Annuncio | `MelisReactApiAnnouncementController` | `melis_core_announcement_tool` | list, create, edit, delete, export |
| Email | `MelisReactApiEmailsController` | `meliscore_tool_emails_mngt` | list, create, edit, delete |
| GDPR | `MelisReactApiGdprController` | `melis_core_gdpr` | applicata, non dichiarata → default-allow |
| Lingue | `MelisReactApiLanguageController` | `meliscore_tool_language` | list, create, edit, delete |
| Log | `MelisReactApiLogController` | `meliscore_logs_tool` (sola lettura) | list |
| Moduli | `MelisReactApiModulesController` | `meliscore_tool_user_module_management` | list, edit |
| Altra configurazione | `MelisReactApiOtherConfigController` | `meliscore_tool_other_config` | list, edit |
| Piattaforme | `MelisReactApiPlatformController` | `meliscore_tool_platform` | list, create, edit, delete |
| Tema della piattaforma | `MelisReactApiPlatformScheme(React)Controller` | `meliscore_tool_platform_scheme` | list, edit |
| Auth (pubblico) | `MelisReactApiAuthController` | nessuno (forgot/reset/i18n) | — |

Ogni azione protetta esegue lo stesso gate di due righe:

```php
private const MELIS_KEY = 'meliscore_tool_user';
if ($deny    = $this->denyUnlessAccess())    { return $deny; }    // 401 unauth / 403 canAccess(MELIS_KEY)
if ($denyCap = $this->denyUnlessCan('list')) { return $denyCap; } // capability (CapabilityGuardTrait)
```

## La react-api

Lo shell consuma una `react-api` **generica** (dal modulo `MelisReactApi`) più le rotte degli
strumenti **nativi** (da MelisCore). Base `/melis/react-api`, contratto `{ success, data, error }`;
ogni chiamata invia `X-Requested-With: XMLHttpRequest` e `credentials: 'include'`.

| Metodo e URL | Scopo |
| --- | --- |
| `GET /melis/react-api/me` | Utente corrente (id, name, login, email, picture, isAdmin, capabilities). |
| `GET /melis/react-api/menu[?full=1]` | Albero degli strumenti filtrato per diritti (`full=1` = non filtrato, solo editor dei diritti). |
| `GET /melis/react-api/react-modules` | Moduli attivi che forniscono un brick + l'URL del bundle concatenato. |
| `GET /melis/react-api/langs` · `/assets` · `/i18n?locale=…` | Lingue del BO, asset di piattaforma, traduzioni pubbliche. |
| `GET /melis/react-api/dashboard/{bubbles,stats,layout}` · `POST …/layout` | Dati della dashboard + layout condiviso. |
| `GET/POST /melis/react-api/{users\|languages\|platforms\|emails\|…}` | CRUD degli strumenti nativi (per controller come sopra). |

Esempio — un elenco keyset nativo e un salvataggio:

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

## Servizi chiave (invariati)

Registrati come alias `service_manager` in `config/module.config.php` — la spina dorsale PHP che gli
strumenti React chiamano:

| Alias del servizio | Ruolo |
| --- | --- |
| `MelisCoreConfig` | Albero di configurazione runtime sui file `app.*` aggregati: `getItem('/meliscore/interface/…')`, `getItemPerPlatform('/meliscore/datas/')`, `getFormMergedAndOrdered(…)`. |
| `MelisCoreAuth` | Autenticazione del back-office: `hasIdentity()`, `getIdentity()`, `getAuthRights()`, `encryptPassword()`, `isPasswordCorrect()`. |
| `MelisCoreRights` | Controllo degli accessi per strumento: `canAccess($melisKey)`, `getRightsValues($id, $isRole)`, `createXmlRightsValues(…)`. |
| `MelisCoreTool` | Helper degli strumenti del back-office (colonne, form, configurazione DataTable) per strumenti legacy/iframe. |
| `MelisCoreBOEmailService` | Template transazionali: `sendBoEmailByCode()`, `getBoEmailByCode()`, `saveBoEmailByCode()`, `deleteEmail()`. |
| `MelisCoreGdprService` / `MelisCoreGdprAutoDeleteService` | Accesso/cancellazione dei dati del soggetto GDPR e il motore di conservazione pianificato. |
| `MelisCoreTranslation` | Carica e unisce le traduzioni `tr_*` per locale (rigenerate al salvataggio della lingua). |
| `MelisGeneralService` | Classe base che la maggior parte dei servizi estende — `sendEvent()`, `makeArrayFromParameters()`, `getServiceManager()`. |

## Sistema di eventi

`MelisGeneralService` continua ad attivare gli eventi `*_start` / `*_end` attorno a ciascun metodo di
servizio, così che qualsiasi modulo possa intercettarli. Aggancia tramite lo shared event manager:

```php
$sm->get('SharedEventManager')->attach(
    'MelisCore',
    'meliscore_tooluser_savenew_end',
    function ($e) { $p = $e->getParams(); /* react */ },
    100
);
```

Eventi core comuni: `meliscore_tooluser_savenew_start/end`, `…delete_start/end`, `…save_start/end`,
`melis_core_check_user_rights`, `meliscore_install_create_new_user`, `melis_core_new_platform`,
`meliscore_module_management_save_end` e gli eventi GDPR (`melis_core_gdpr_user_info_event`,
`…_extract_event`, `…_delete_event`, `melis_core_gdpr_auto_delete*`).

## Tabelle del database

| Tabella | Contiene |
| --- | --- |
| `melis_core_user` | Utenti del back-office (login, hash della password, XML `usr_rights`, flag admin, lingua, ruolo). |
| `melis_core_user_role` | Ruoli e il loro XML `urole_rights`. |
| `melis_core_user_connection_date` | Cronologia dei login. |
| `melis_core_lang` | Lingue del back-office. |
| `melis_core_platform` | Ambienti/piattaforme. |
| `melis_core_bo_emails` / `_details` | Template di email transazionali e corpi per lingua. |
| `melis_core_log` / `_log_type` / `_log_type_trans` | Log delle azioni, tipi e traduzioni. |
| `melis_core_lost_password` | Token di reset password. |
| `melis_core_microservice_auth` | Chiavi API per gli endpoint micro-service. |
| `melis_core_dashboards` / `_dashboard_schema` | Layout della dashboard per utente. |
| `melis_core_plugins` | Plugin registrati. |
| `melis_core_gdpr_delete_config` / `_delete_emails_logs` | Regole di auto-eliminazione GDPR e audit trail. |
| `melis_user_password_history` | Cronologia password (prevenzione del riutilizzo). |
| `melis_announcement` | Annunci del back-office. |

## File chiave

| Ambito | Percorso |
| --- | --- |
| Bootstrap del modulo | `vendor/melisplatform/melis-core/src/Module.php` |
| Rotte, servizi, controller, view helper | `vendor/melisplatform/melis-core/config/module.config.php` |
| Shell del back-office legacy e albero degli strumenti (interface) | `vendor/melisplatform/melis-core/config/app.interface.php` |
| Dichiarazioni degli strumenti DataTable | `vendor/melisplatform/melis-core/config/app.tools.php` |
| Endpoint micro-service | `vendor/melisplatform/melis-core/config/app.microservice.php` |
| Rotte react-api native + controller | `config/react-api.php` + `src/Controller/MelisReactApi*Controller.php` |
| Capability degli strumenti nativi | `config/react.capabilities.php` |
| Sorgente dell'app React | `vendor/melisplatform/melis-core/ui-react/src/` |
| App React compilata (committata) | `vendor/melisplatform/melis-core/public/ui-react/` |
| Servizi · Controller · Table gateway | `src/Service/` · `src/Controller/` · `src/Model/Tables/` |
| SQL di installazione e migrazioni · Traduzioni | `install/` · `language/` |

Vedi anche: [Riferimento moduli](/it/reference/modules), [Creare uno strumento](/it/guide/create-a-tool),
[Plugin](/it/guide/plugins)
