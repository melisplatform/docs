# MelisCmsPageAnalytics

> Analisi di base delle visite alle pagine per i siti CMS — registra le visualizzazioni di pagina e
> consente a un sito di integrare un provider di analisi esterno (ad es. Google Analytics), ora
> gestita da un back-office React nativo.
> Pacchetto `melisplatform/melis-cms-page-analytics`.

## Scopo

`MelisCmsPageAnalytics` è il tracker delle visualizzazioni di pagina integrato nella piattaforma. A
ogni rendering di pagina del front-office registra una visita deduplicata (una volta per sessione,
per pagina, al giorno) in `melis_cms_page_analytics`, e mostra i dati nel back-office come strumento
di sito **Page Analytics** e come scheda **Page Analytics** su ogni pagina CMS. Per ogni sito è
inoltre possibile memorizzare una chiave del provider di analisi e uno snippet JavaScript che il
modulo inietta nell'`<head>` della pagina al momento del rendering — l'hook utilizzato dai provider
aggiuntivi come Google Analytics.

Nella v6 il back-office è un **brick full-React nativo**: una tabella delle visite in sola lettura e
un pannello impostazioni, che chiama un livello JSON `react-api`. Il tracciamento, il contratto del
provider e la persistenza delle impostazioni sono invariati — la v6 sostituisce solo il livello di
visualizzazione.

## Attivazione

Aggiungere a `config/melis.module.load.php`:

```php
return [
    'MelisCmsPageAnalytics',
];
```

Dipendenze Composer richieste: `melisplatform/melis-core` e `melisplatform/melis-cms`. Il modulo si
appoggia inoltre ai servizi `melis-engine` e `melis-front` a runtime (albero, tabelle delle pagine,
eventi di dispatch del front). Le tabelle del database vengono installate tramite
`MelisSetupController` da `install/sql/`. Il brick React compare nel menu solo finché il modulo è
elencato in `melis.module.load.php` (rilevamento modulare dei brick).

## Servizi principali

Registrati come alias `service_manager` in `config/module.config.php`:

| Alias del servizio | Ruolo |
| --- | --- |
| `MelisCmsPageAnalyticsService` | Servizio principale che implementa il contratto del provider. `getAnalytics($siteId)` legge la chiave del provider attivo da `melis_cms_page_analytics_data` e la riga di impostazioni corrispondente da `melis_cms_page_analytics_data_settings`. |
| `MelisCmsDefaultPageAnalyticsService` | Registratore integrato. `saveAnalyticsData($pageId)` risolve il sito, verifica che la pagina sia attiva/pubblicata e inserisce una riga deduplicata in `melis_cms_page_analytics` — a meno che non siano configurati un view id e un token di Google Analytics, nel qual caso il contatore integrato si fa da parte. |
| `MelisCmsPageAnalyticsTable` | Table gateway per il log delle visite. |
| `MelisCmsPageAnalyticsDataTable` | Table gateway per la selezione del provider per sito. |
| `MelisCmsPageAnalyticsDataSettingsTable` | Table gateway per le impostazioni per (sito, provider). |

Entrambi i servizi principali emettono eventi di inizio/fine: `melis_cms_default_page_analytics_save_start` /
`melis_cms_default_page_analytics_save_end`.

## Front office

Non è presente alcun view helper né plugin di templating. Il tracciamento e l'iniezione dello script
sono gestiti da `MelisCmsPageAnalyticsListener` (agganciato in `Module.php`), che intercetta due
eventi nella pipeline di rendering del front:

| Evento | Priorità | Azione |
| --- | --- | --- |
| `melisfront_site_dispatch_ready` | `-10000` | Solo rendering del front — chiama `MelisCmsDefaultPageAnalyticsService::saveAnalyticsData($pageId)` per registrare la visita deduplicata. |
| `melis_front_layout` | default | Legge lo snippet `pads_js_analytics` configurato per il sito e lo inietta prima di `</head>` nell'HTML renderizzato. |

## Tabelle del database

| Tabella | PK | Contenuto |
| --- | --- | --- |
| `melis_cms_page_analytics` | `ph_id` | Log delle visite (hit deduplicati): `ph_page_id`, `ph_session_id`, `ph_date_visit`, `ph_site_id`. Non viene memorizzato alcun indirizzo IP. |
| `melis_cms_page_analytics_data` | `pad_id` | Selezione del provider per sito: `pad_site_id`, `pad_analytics_key`. |
| `melis_cms_page_analytics_data_settings` | `pads_id` | Impostazioni per (sito, provider): `pads_site_id`, `pads_analytics_key`, `pads_js_analytics`, `pads_settings` (ad es. `google_analytics_view_id`). |

## Back-office React

Lo strumento è un **brick full-React nativo** con un interruttore **New / Old** che può ripiegare
sullo strumento legacy in un iframe. Si trova nella barra laterale sotto **Marketing / Site Tools →
Page Analytics** e si apre con due schede interne, **Analytics** e **Settings**.

| Proprietà del brick | Valore |
| --- | --- |
| Id del brick | `pageanalytics` |
| `route` del manifest | `/melis-marketing/meliscms-page-analytics` |
| `forwardKey` | `MelisCmsPageAnalytics/MelisCmsPageAnalyticsTool` |
| `melisKey` (target iframe della vista Old) | `meliscms_page_analytics_display` |
| Nodo di controllo accessi (controller) | `meliscms_page_analytics_tools_section` |
| Base API | `/melis/react-api/page-analytics` |

- **Scheda Analytics** — una tabella in sola lettura delle visite **aggregate per pagina** (id
  pagina, nome pagina, numero di visite, ultima visita) con schede KPI (hit / pagine / siti / ultima
  visita), un filtro per sito, una ricerca, un gestore di colonne, scorrimento infinito, ordinamento
  lato server ed **Export**. Le pagine eliminate mostrano un'etichetta in corsivo *(deleted)*. Se al
  sito selezionato è assegnato un provider di terze parti che fornisce la propria visualizzazione
  React, la scheda ospita **la dashboard di quel modulo** anziché la tabella integrata.
- **Scheda Settings** — scegliere un **Site** e poi un **Analytics module** (l'opzione integrata "no
  analytics" più ogni provider attivo). I campi propri del modulo scelto vengono renderizzati in modo
  data-driven (text / textarea / select / password / file, ad es. una chiave privata di Google
  Analytics). Gli amministratori della piattaforma possono anche modificare lo snippet JS
  personalizzato dell'`<head>`; i non amministratori lo vedono in sola lettura.

> Gli screenshot React di queste schermate non sono ancora disponibili.

## API React

Le route sono definite in `config/react-api.php` e unite alla configurazione del modulo. Il contratto
è `{ success, data, error }`; ogni richiesta invia `X-Requested-With: XMLHttpRequest` e
`credentials: 'include'`. Due controller supportano la UI: `MelisReactApiPageAnalyticsController` (lo
strumento) e `MelisReactApiPageAnalyticsTabController` (la scheda dell'editor di pagina CMS).

| Metodo e URL | Scopo |
| --- | --- |
| `GET /melis/react-api/page-analytics` | Visite aggregate per pagina (keyset: `limit`, `search`, `site`, `sort`, `dir`, `after`) → `{items,total,nextCursor}`, ogni elemento `{pageId,pageName,count,lastVisit}`. |
| `GET /melis/react-api/page-analytics/stats` | KPI `{hits, pages, sites, lastVisit}` (rispetta `search`/`site`). |
| `GET /melis/react-api/page-analytics/sites` | Opzioni dei siti `{sites:[{id,name}]}` per il selettore. |
| `GET /melis/react-api/page-analytics/settings` | Stato della scheda Settings (elenco moduli + schema del form data-driven + valori correnti). |
| `GET /melis/react-api/cms-page/analytics` | Visite di una singola pagina (`idPage`, `page`, `perPage`) → `{visits, sessions, lastVisit, recent, page, perPage, recentTotal}`. |

Il controller dello strumento legge le tabelle direttamente tramite SQL parametrizzato
(`melis_cms_page_analytics` in join con `melis_cms_page_published` per i nomi e `melis_cms_site` per
il selettore, cursore keyset opaco). Protegge l'accesso sul nodo portatore di diritti
`meliscms_page_analytics_tools_section` — **non** sul `melisKey` del manifest
(`meliscms_page_analytics_display`), che è solo la chiave della zona iframe della vista Old.

**La scrittura delle impostazioni non è una route react-api** — il pannello Settings invia in POST un
payload `FormData` all'azione dello strumento legacy così che tutta la logica lato server (validazione
Laminas, upload della chiave GA, serializzazione di `pads_settings`, guardia admin sul JS grezzo,
flash messenger) venga riutilizzata alla lettera:

```ts
const LEGACY_SAVE_URL = '/melis/MelisCmsPageAnalytics/MelisCmsPageAnalyticsTool/save'
await fetch(LEGACY_SAVE_URL, {
  method: 'POST',
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
  credentials: 'include',
  body: formData,
}) // → { success, textTitle, textMessage, errors }
```

## Scheda di pagina CMS e capability

Il modulo contribuisce una scheda **Page Analytics** all'editor di pagina CMS, supportata da
`GET /melis/react-api/cms-page/analytics` (visite totali, sessioni distinte, ultima visita e un
elenco paginato delle date di visita recenti per quella pagina). La scheda è dichiarata in
`config/react.capabilities.php` sotto il nodo condiviso `meliscms_page`, e la chiave
`meliscms_page_analytics_tab` **è** la stringa di capability usata per proteggerla in Users → Rights:

```php
'melisReactToolCapabilities' => [
  'meliscms_page' => [
    'tabs' => [
      ['key' => 'meliscms_page_analytics_tab', 'label' => 'tr_melis_cms_page_analytics_title'],
    ],
  ],
],
```

## Visualizzazione modulare a livello di sito

Quando a un sito è assegnato un modulo di analisi di terze parti che dichiara una visualizzazione
React (ad es. **MelisCmsGoogleAnalytics** tramite `react_display_key`), la scheda Analytics ospita la
visualizzazione React di quel modulo anziché la tabella delle visite nativa. Il brick consuma un
registro globale, `window.__melisAnalyticsSiteDisplays[<analyticsKey>]`; effettua un nuovo controllo
sull'evento window `melis:analytics-site-display-registered` (i bundle vengono caricati in modo
asincrono) e, se non è registrato nulla, ripiega su un iframe
`/melis/react-tool-page?key=<displayKey>&siteId=<site>`.

## Esempio

```php
// Legge la configurazione del provider di analisi attivo per un sito
$analytics = $serviceManager->get('MelisCmsPageAnalyticsService')->getAnalytics($siteId);

// Legge le visite registrate per una pagina specifica (usato dalla scheda Page Analytics)
$visits = $serviceManager->get('MelisCmsPageAnalyticsTable')->getDataByPageId($pageId);
```

La registrazione delle visite avviene automaticamente al rendering del front tramite il listener;
normalmente non è necessario chiamare `saveAnalyticsData()` direttamente.

## File principali

| Ambito | Percorso |
| --- | --- |
| Bootstrap del modulo / registrazione del listener | `vendor/melisplatform/melis-cms-page-analytics/src/Module.php` |
| Route, servizi, alias delle tabelle, controller | `vendor/melisplatform/melis-cms-page-analytics/config/module.config.php` |
| Route API React | `vendor/melisplatform/melis-cms-page-analytics/config/react-api.php` |
| Capability della scheda React | `vendor/melisplatform/melis-cms-page-analytics/config/react.capabilities.php` |
| Brick React + manifest | `vendor/melisplatform/melis-cms-page-analytics/public/ui-react/` |
| Sorgenti React | `vendor/melisplatform/melis-cms-page-analytics/ui-react/src/` |
| Controller API React | `vendor/melisplatform/melis-cms-page-analytics/src/Controller/MelisReactApiPageAnalyticsController.php`, `MelisReactApiPageAnalyticsTabController.php` |
| Contratto del provider | `vendor/melisplatform/melis-cms-page-analytics/src/Service/MelisCmsPageAnalyticsServiceInterface.php` |
| Servizio di analisi principale | `vendor/melisplatform/melis-cms-page-analytics/src/Service/MelisCmsPageAnalyticsService.php` |
| Registratore integrato | `vendor/melisplatform/melis-cms-page-analytics/src/Service/MelisCmsDefaultPageAnalyticsService.php` |
| Listener del front (traccia + inietta) | `vendor/melisplatform/melis-cms-page-analytics/src/Listener/MelisCmsPageAnalyticsListener.php` |
| Table gateway | `vendor/melisplatform/melis-cms-page-analytics/src/Model/Tables/` |
| SQL di installazione DB | `vendor/melisplatform/melis-cms-page-analytics/install/sql/` |

Vedi anche: [melis-cms](/it/reference/modules/melis-cms), [melis-core](/it/reference/modules/melis-core)
