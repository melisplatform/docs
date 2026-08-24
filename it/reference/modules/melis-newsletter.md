# MelisNewsletter

> Trasforma una pagina CMS in una newsletter email personalizzata e la recapita ai gruppi di iscritti, ora gestita da un back-office React nativo. Pacchetto `melisplatform/melis-newsletter`.

## Scopo

MelisNewsletter riutilizza il sistema di pagine CMS come template della newsletter: una pagina contrassegnata come tipo
**NEWSLETTER** viene renderizzata in HTML, personalizzata per ciascun destinatario tramite codici BB (`[NAME]`,
`[FIRSTNAME]`, `[EMAIL]`, `[UNSUBSCRIBELINK]`) e inviata agli iscritti e/o ai gruppi selezionati
attraverso un trasporto di posta configurabile. Gli iscritti sono organizzati in un elenco per sito e possono essere
segmentati in gruppi. Ogni invio viene archiviato con uno snapshot HTML completo e un log per singolo destinatario;
un plugin di front di disiscrizione e una completa integrazione GDPR sono inclusi di serie.

In v6 lo strumento è distribuito come **brick full-React nativo** nel back-office `/melis-react`. La logica
di business (servizi, meccanismo di invio, GDPR, tabelle) è invariata; solo il livello di visualizzazione è passato a React,
servito tramite un livello JSON `react-api` esposto dal modulo.

## Attivazione

Aggiungi a `config/melis.module.load.php`:

```php
return [
    'MelisNewsletter',
];
```

Richiede `melis-core` e `melis-cms`; funzionalmente si basa anche su `melis-engine` e `melis-front`
per il rendering delle pagine e il plugin di disiscrizione. Lo strumento React compare nel menu **solo quando il
modulo è attivato** (discovery modulare dei brick tramite `GET /melis/react-api/react-modules`). Rimuovendo
`MelisNewsletter` da `melis.module.load.php` il brick scompare.

## Back-office (React)

Barra laterale sinistra → **MelisMarketing → Newsletter** (`fa fa-newspaper-o`), rotta di mount
`/melis-marketing/melis-newsletter-tool-config`. Si apre come uno strumento unico la cui intestazione riporta il
titolo *Newsletters*, il sottotitolo *"Subscribers, groups, history and send configuration"* e un
toggle **New / Old** (in alto a destra). *New* è l'interfaccia React (predefinita); *Old* renderizza lo strumento legacy in
un iframe (`/melis/react-tool-page?key=melis_newsletter_tool_display`).

A differenza di uno strumento a sotto-schede dell'host, Newsletter renderizza le sue quattro schermate come **schede React proprie**:

| Scheda | Contenuto |
| --- | --- |
| Subscribers | Card KPI (Totale / Attivi / Inattivi), ricerca, filtri per stato + sito, gestore colonne, **Import** CSV, **Export**, **Add selection to group(s)**, **+ New subscriber**. Tabella: Stato / Email / Nome / Cognome / Sito / Gruppi con modifica/eliminazione per riga |
| Groups | Card KPI, ricerca, filtro per stato, Export, **+ New group**. Tabella: Stato / Nome / Creato / Membri (conteggio) con modifica/eliminazione |
| History | Archivio in sola lettura. Card KPI (Invii / Siti / Oggi), ricerca, filtro per sito, Export. Tabella: Pagina / Sito / Versione / Inviato il con un'**icona a occhio** per riga per visualizzare l'HTML archiviato esatto |
| Configuration | L'unica **Transport configuration** SMTP globale: Host / Username / Password (+ conferma). Vuoto = il trasporto Melis predefinito |

![La scheda Subscribers nello strumento React Newsletter](/screenshots/react/melis-newsletter/melisnewsletter-tool-newsletter-tab-subscribers.png)

L'apertura o la creazione di un **subscriber** o di un **group** non apre una nuova scheda principale — apre l'editor
del record (SubscriberForm / GroupForm) in una **sotto-scheda dell'host** nativa (drill-down, con chiave `s-<id>` /
`g-<id>`). Il form Subscriber contiene nome/cognome, email, sito, un toggle Active e le
appartenenze ai gruppi; il form Group contiene il nome, un toggle Active e i membri del gruppo (aggiunta/rimozione +
selettore di iscritti).

![La scheda Groups nello strumento React Newsletter](/screenshots/react/melis-newsletter/melisnewsletter-tool-newsletter-tab-groups.png)

![La scheda History nello strumento React Newsletter](/screenshots/react/melis-newsletter/melisnewsletter-tool-newsletter-tab-history.png)

![La scheda Configuration nello strumento React Newsletter](/screenshots/react/melis-newsletter/melisnewsletter-tool-newsletter-tab-config.png)

Per motivi di sicurezza la password SMTP memorizzata **non viene mai restituita al browser** — i campi mostrano un
placeholder mascherato e lasciarli vuoti al salvataggio mantiene la password corrente.

### Invio di una newsletter

L'azione **Send** non è una scheda. È una finestra modale (`NewsletterSendModal`) esposta tramite
`window.__melisNewsletterSendModal`, che **l'editor di pagine React renderizza** per le pagine di tipo
**NEWSLETTER**. Imposta un oggetto, scegli gruppi e/o iscritti, **Test** verso un iscritto scelto o un
indirizzo email libero come prima cosa, quindi **Send**. In caso di successo emette un evento `melis:newsletter-sent` così che
la scheda persistente History si aggiorni. Variabili di personalizzazione nel contenuto: `[NAME]`, `[FIRSTNAME]`,
`[EMAIL]`, `[UNSUBSCRIBELINK]`. Pubblica la pagina prima dell'invio.

## React API

Le rotte risiedono in `config/react-api.php` (unite tramite `MelisNewsletter\Module::getConfig()`), servite come
rotte figlie del bridge generico `melis-react-api` sotto `/melis/react-api/newsletter`. Controller
`MelisNewsletter\Controller\MelisReactApiNewsletterController`; contratto JSON `{ success, data, error }`;
ogni richiesta trasporta `X-Requested-With: XMLHttpRequest` + credenziali. Endpoint selezionati:

| Metodo & URL (relativi a `/melis/react-api/newsletter`) | Scopo |
| --- | --- |
| `GET /subscribers` · `/subscribers/stats` · `/subscribers/:id` | Elenco keyset (`search`, `active`, `site`, `group`, `sort`, `dir`, `after`), KPI, un record |
| `POST /subscribers/save` · `/subscribers/import` | Crea/aggiorna; import CSV in blocco → `{imported,skipped,errors}` |
| `DELETE /subscribers/delete/:id` | Elimina |
| `GET /groups` · `/groups/stats` · `/groups/:id` · `/groups/:id/members` | Elenco gruppi, KPI, record, membri |
| `POST /groups/save` · `/groups/:id/members/add` · `/groups/members/bulk-add` | Salva; aggiungi membro; assegna in blocco `subscriberIds[]` a `groupIds[]` |
| `DELETE /groups/delete/:id` · `/groups/members/remove/:mid` | Elimina gruppo; rimuovi appartenenza (`mid` = `nlgu_id`) |
| `GET /history` · `/history/stats` · `/history/:id` | Elenco archivio invii, KPI, HTML archiviato di un invio |
| `GET /config` · `POST /config/save` | Configurazione SMTP (password non restituita; solo `hasPassword`) / salva |
| `GET /send-options` · `POST /send` · `POST /test` | Opzioni della modale di invio; invio; invio di test |

Il controller React **riutilizza il servizio Laminas del modulo** (`MelisNewsletterService`) per il lavoro
pesante — invio/test passano per `sendNewsletter()` / `testNewsletter()` / `testNewsletterCustomMail()`,
e le validazioni rispecchiano `saveSubscriber` / `importFileValidator` / `saveConfig` — così il percorso React
riproduce esattamente le regole di business legacy.

## Capability (diritti avanzati)

Dichiarate in `config/react.capabilities.php` sotto il nodo portatore di diritti
**`melis_newsletter_tools_section`** (non la chiave di manifest/zona `melis_newsletter_tool_display`). Un
albero per scheda più una singola azione `send` trasversale, appiattito in stringhe con notazione a punti:

```
melis_newsletter_tools_section
├─ action: send                              (Send / Test — la modale dell'editor di pagine)
├─ tab subscribers: list · create · edit · delete · export
├─ tab groups:      list · create · edit · delete · export
├─ tab history:     list                     (sola lettura)
└─ tab config:      edit                     (trasporto SMTP)
```

React le legge tramite `useCaps('melis_newsletter_tools_section').can('…')` e regola l'accesso ai suoi
pulsanti d'azione; lato server ogni azione di modifica è protetta (`denyUnlessAccess()` poi `denyUnlessCan()`).
`react.capabilities.php` unisce anche un'azione `newsletter` sotto il nodo condiviso `meliscms_page` così che
il pulsante Send nell'editor di pagine sia regolabile in Users → Rights.

## Servizi principali

| Alias del servizio | Ruolo |
| --- | --- |
| `MelisNewsletterService` | Servizio centrale per iscritti, gruppi, invio/test, archivio e configurazione. Emette eventi `*_start` / `*_end`. |
| `MelisNewsletterGdprAutoDeleteService` | Implementa `MelisCoreGdprAutoDeleteInterface`; gestisce il flusso schedulato di avviso/eliminazione GDPR per gli iscritti inattivi. |

Alias dei table gateway: `MelisNewsletterSubscribersTable`, `MelisNewsletterGroupsTable`,
`MelisNewsletterGroupsPeopleTable`, `MelisNewsletterArchiveTable`,
`MelisNewsletterRecipientsTable`, `MelisNewsletterConfigTable`.

## Meccanismo di invio

`MelisNewsletterService::sendNewsletter($pageId, $subscribers, $groups, $mailSubject)`:

1. **Risoluzione dei destinatari** — iscritti espliciti + membri dei gruppi tramite `getSubscribersInGroup()`,
   filtrati solo agli attivi, deduplicati.
2. **Rendering del contenuto** — pagina CMS recuperata come HTML; `href`/`src` relativi riscritti in URL assoluti.
3. **Personalizzazione** — codici BB sostituiti per ciascun destinatario; `[UNSUBSCRIBELINK]` trasporta il token hashato.
4. **Invio** — tramite trasporto SMTP configurato o quello predefinito della piattaforma.
5. **Archiviazione** — una riga `nlan_*` per invio (sito, pagina, versione, HTML completo, data di invio) e una
   riga `nlus_*` per destinatario.

**Invio di test** (`testNewsletter()` / `testNewsletterCustomMail()`) recapita a un singolo iscritto o a un
indirizzo email arbitrario senza archiviare, ed è richiesto prima che un invio reale venga sbloccato.

## Front office

| Plugin | Chiave di config | Descrizione |
| --- | --- | --- |
| `MelisNewsletterUnsubscribePlugin` | `melisnewsletter` / `MelisNewsletterUnsubscribePlugin` | Da inserire in una pagina `unsubscribe`. Legge il token `?s={hashed_id}` incorporato in `[UNSUBSCRIBELINK]`, chiama `deactivateSubscriberById()`, mostra un messaggio di successo/errore. Espone un'impostazione `unsubscribe_data_salt` usata nell'hashing del token. |

Viste: `plugins/unsubscribe.phtml` + `unsubscribe-modal-form.phtml`.

## Integrazione GDPR

Si aggancia al framework GDPR di MelisCore sia per i flussi on-demand sia per quelli schedulati:

- **On-demand:** `MelisNewsletterGdprUserInfoListener`, `…UserExtractListener`, `…UserDeleteListener`
  trovano, esportano ed eliminano i dati di iscrizione di una persona su richiesta. Colonne: `nlu_firstname`, `nlu_name`,
  `nlu_email`, `nlu_date_creation` (dichiarate in `config/app.gdpr.php`).
- **Auto-eliminazione schedulata:** `MelisNewsletterGdprAutoDeleteService` con nove listener che coprono la
  registrazione del modulo, la dichiarazione dei tag GDPR, la costruzione della lista di avviso, le email di avviso e l'eliminazione finale degli
  iscritti inattivi che non rispondono.

## Tabelle del database

| Tabella (alias → prefisso colonne) | Contiene |
| --- | --- |
| `MelisNewsletterSubscribersTable` (`nlu_*`) | Righe degli iscritti per sito: email, nome/cognome, stato, data di creazione |
| `MelisNewsletterGroupsTable` (`nlg_*`) | Definizioni dei gruppi: nome, stato, data di creazione |
| `MelisNewsletterGroupsPeopleTable` (`nlgu_*`) | Collegamento di appartenenza iscritto ↔ gruppo |
| `MelisNewsletterArchiveTable` (`nlan_*`) | Archivio per invio: sito, pagina, versione, corpo HTML completo, data di invio |
| `MelisNewsletterRecipientsTable` (`nlus_*`) | Log di invio per destinatario: snapshot di nome/cognome/email, FK all'archivio |
| `MelisNewsletterConfigTable` (`nlc_*`) | Configurazione del trasporto SMTP per sito: host, username, password |

## Esempio

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

## File chiave

| Ambito | Percorso |
| --- | --- |
| Rotte React API + controller invokable | `vendor/melisplatform/melis-newsletter/config/react-api.php` |
| Capability React (con chiave `melis_newsletter_tools_section`) | `vendor/melisplatform/melis-newsletter/config/react.capabilities.php` |
| Controller React API (riutilizza `MelisNewsletterService`) | `vendor/melisplatform/melis-newsletter/src/Controller/MelisReactApiNewsletterController.php` |
| Brick React (build Vite) + manifest | `vendor/melisplatform/melis-newsletter/public/ui-react/brick.js` · `brick.manifest.json` |
| Configurazione del modulo (servizi, table gateway, controller, plugin) | `vendor/melisplatform/melis-newsletter/config/module.config.php` |
| Servizio principale | `vendor/melisplatform/melis-newsletter/src/Service/MelisNewsletterService.php` |
| Servizio di auto-eliminazione GDPR | `vendor/melisplatform/melis-newsletter/src/Service/MelisNewsletterGdprAutoDeleteService.php` |
| Plugin di front di disiscrizione | `vendor/melisplatform/melis-newsletter/src/Controller/Plugin/MelisNewsletterUnsubscribePlugin.php` |
| Table gateway | `vendor/melisplatform/melis-newsletter/src/Model/Tables/` |
| Installazione DB + migrazioni | `vendor/melisplatform/melis-newsletter/install/dbdeploy/` |

Vedi anche: [melis-core](/legacy/reference/modules/melis-core), [melis-cms](/legacy/reference/modules/melis-cms),
[melis-front](/legacy/reference/modules/melis-front), [melis-engine](/legacy/reference/modules/melis-engine)
