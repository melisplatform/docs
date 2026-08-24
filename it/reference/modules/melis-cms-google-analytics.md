# MelisCmsGoogleAnalytics

> Provider Google Analytics 4 (GA4) che trasforma la proprietà GA4 configurata di un sito in curve delle sessioni, totali KPI e dati demografici all'interno del back-office React di Melis. Pacchetto `melisplatform/melis-cms-google-analytics`.

## Scopo

MelisCmsGoogleAnalytics legge la proprietà GA4 di un sito lato server (tramite `google/apiclient` +
`google/analytics-data`) e la visualizza come grafici nel back-office React. È un provider di **sola
visualizzazione**: l'attivazione di GA per un sito — la scelta del provider, l'inserimento del
**Property ID** e il caricamento del file JSON con la **chiave privata** dell'account di servizio —
avviene nello strumento **Site analytics** di proprietà di `melis-cms-page-analytics`, non in questo
modulo.

Il modulo fornisce **due superfici basate su un unico componente dashboard**:

- Una **scheda Google Analytics** nell'editor di pagina CMS React, che mostra le statistiche GA
  **per la pagina aperta** (filtrate per percorso della pagina).
- Una **visualizzazione nativa React a livello di sito** iniettata nello strumento **Site analytics**,
  che mostra le statistiche GA **per l'intero sito** quando il *modulo Analytics* di quel sito è
  impostato su Google Analytics.

![Scheda Google Analytics nell'editor di pagina CMS React — curva delle sessioni, schede KPI e dati demografici per Lingua/Paese/Città della pagina aperta](/screenshots/react/melis-cms-google-analytics/meliscmsgoogleanalytics-pageedition-tab-googleanalytics.png)

![Visualizzazione Google Analytics a livello di sito nello strumento Site analytics — la stessa dashboard GA4 riferita all'intero sito](/screenshots/react/melis-cms-google-analytics/meliscmsgoogleanalytics-tool-tab-analytics.png)

## Attivazione

Il modulo viene rilevato dall'host React all'avvio tramite `GET /melis/react-api/react-modules`, che
elenca i moduli attivi che forniscono un file `brick.manifest.json`. La disattivazione del modulo
rimuove entrambe le superfici.

Dipendenze Composer: `google/apiclient ^2.15`, `google/analytics-data ^0.16.0`, `melis-core`,
`melis-cms`, `melis-cms-page-analytics`.

## Il brick React

Si tratta di un **brick TAB dell'editor di pagina** (solo widget): non ha **alcuno strumento nel menu
di sinistra**, **nessuna rotta** e **nessun `react-api.php`**. Il manifest ha la forma multi-brick con
una singola voce contenente solo l'id, quindi l'host carica il bundle all'avvio e il brick si registra
autonomamente in anticipo.

```json
{ "entry": "brick.js", "bricks": [ { "id": "cms-google-analytics" } ] }
```

`brick.tsx` non chiama `__melisRegisterBrick`; esegue invece due registrazioni al momento della
valutazione del modulo:

```tsx
// 1) Contribute a tab to the CMS page editor (owned by the CmsPage brick).
registerPageTab('melis_cms_google_analytics_page_tab', GoogleAnalyticsPageTab)

// 2) Register the native site-level display for the PageAnalytics host to mount by key.
;(window.__melisAnalyticsSiteDisplays ||= {})['melis_cms_google_analytics'] = GoogleAnalyticsSiteDisplay
window.dispatchEvent(new CustomEvent('melis:analytics-site-display-registered'))
```

| Componente | Ruolo |
| --- | --- |
| `brick.tsx` | Sola registrazione — aggiunge la scheda di pagina e la visualizzazione del sito; nessun brick con rotta. |
| `GoogleAnalyticsPage.tsx` (`GoogleAnalyticsPageTab`) | Scheda dell'editor di pagina. Riceve `{ idPage }`, risolve il sito + il percorso della pagina tramite `getPageContext`, quindi monta la dashboard con `siteId` + `pagePath`. |
| `GoogleAnalyticsSiteDisplay.tsx` | La dashboard: selettore dell'intervallo di date, grafico SVG inline delle sessioni, schede KPI, tre tabelle demografiche. Riutilizzata da entrambe le superfici (`pagePath` presente ⇒ ambito pagina, assente ⇒ intero sito). |

Poiché React è esternalizzato nelle variabili globali dell'host, il bundle non può importare i moduli
dell'host, da cui gli **stili inline**, la **i18n `{fr,en}` interna al file** (da
`document.documentElement.lang`) e un **grafico SVG disegnato a mano** (nessuna libreria di grafici).
L'SDK di Google non viene mai utilizzato lato client.

## La dashboard

Entrambe le superfici visualizzano la stessa dashboard:

- **Controllo dell'intervallo di date** — **7 giorni** / **30 giorni** / **Personalizzato**
  (selettori di data di inizio e fine + **Applica**) e un pulsante di **aggiornamento**. La data di
  fine è per impostazione predefinita quella odierna (dati infragiornalieri GA4 inclusi).
- **Sessioni nel periodo** — un grafico a linee/area delle sessioni per giorno.
- **Schede KPI** — Sessioni, Utenti, Visualizzazioni di pagina, Pagine/Sessione, Durata media della
  sessione, Frequenza di rimbalzo.
- **Dati demografici** — tre tabelle (Lingua, Paese, Città), ciascuna ordinata per sessioni con una
  percentuale di quota.

Se GA non è configurato per il sito o l'API fallisce, al posto dei grafici viene mostrato un riquadro
di errore rosso con il messaggio del backend (ad esempio "GA settings incomplete").

**Dove trovarla:** per pagina → **MelisCms** → apri una pagina → scheda **Google Analytics**. Per
sito → **MelisMarketing** → **Site analytics** → seleziona il sito → sotto-scheda **Analytics**. GA
viene attivato per un sito in **Site analytics → Settings** (modulo Analytics = Google Analytics,
Property ID, caricamento del file JSON con la chiave privata, script analytics personalizzato
opzionale).

![Sotto-scheda Settings di Site analytics — modulo Analytics impostato su Google Analytics, Property ID, caricamento del file JSON con la chiave privata e script analytics personalizzato](/screenshots/react/melis-cms-google-analytics/meliscmsgoogleanalytics-tool-tab-settings.png)

## Endpoint dei dati

Il modulo **non ha alcun `config/react-api.php`**. L'interfaccia React chiama il già esistente
`GoogleAnalyticsController` (rotta `application-MelisCmsGoogleAnalytics/default`, `ViewJsonStrategy`).

| Metodo e URL | Azione | Scopo |
| --- | --- | --- |
| `GET /melis/MelisCmsGoogleAnalytics/GoogleAnalytics/getPageContext?idPage=<id>` | `getPageContextAction` | Risolve il sito proprietario di una pagina + il percorso → `{ success, siteId, pagePath, pageURL }`. |
| `POST /melis/MelisCmsGoogleAnalytics/GoogleAnalytics/getChartData` | `getChartDataAction` | Recupera i dati GA4 per un sito (facoltativamente un percorso di pagina) → `{ success, chartData, errors }`. |

Il corpo di `getChartData` è codificato come form:

```ts
const body = new URLSearchParams()
body.set('siteId', String(siteId))
body.set('dateRange[option]', option)          // '7days' | '30days' | 'custom'
body.set('dateRange[startDate]', startDate)    // '7daysAgo' | '30daysAgo' | 'YYYY-MM-DD'
body.set('dateRange[endDate]', endDate)        // 'today' | 'YYYY-MM-DD'
body.set('dateRange[clientTimestamp]', String(Date.now()))
if (pagePath) body.set('pagePath', pagePath)   // page tab only → GA4 dimensionFilter on pagePath
```

Struttura di `chartData` consumata dall'interfaccia:

- `chartData.date.totals{}` → valori KPI (`sessions`, `activeUsers`, `screenPageViews`,
  `screenPageViewsPerSession`, `averageSessionDuration`, `bounceRate`).
- `chartData.date.plot{ <tsSeconds>: { sessions } }` → la curva delle sessioni (le chiavi sono in secondi).
- `chartData.language / .country / .city` → le tabelle demografiche (`{ value: { sessions } }`).

Lato server, `getChartDataAction` chiama i servizi GA4 (`GoogleAnalytics4APIService` /
`MelisCmsGoogleAnalyticsService`, con alias in `module.config.php`), che utilizzano il Property ID del
sito e il file JSON con la chiave privata e normalizzano le righe GA4 in `chartData`. In caso di
fallimento dell'API, l'azione restituisce un `{ success:false, errors }` pulito anziché un 500.

## Capacità

Dichiarate in `config/react.capabilities.php` e unite da `Module::getConfig()`. Poiché il modulo
contribuisce con una scheda allo strumento di pagina CMS, dichiara la propria capacità sotto il nodo
condiviso titolare dei diritti **`meliscms_page`** (un `ArrayUtils::merge` integra i `tabs[]` nelle
capacità dello strumento di pagina CMS):

```php
return [
  'melisReactToolCapabilities' => [
    'meliscms_page' => [
      'tabs' => [
        ['key' => 'melis_cms_google_analytics_page_tab', 'label' => 'tr_melis_cms_google_analytics'],
      ],
    ],
  ],
];
```

- La `key` **deve essere uguale** alla chiave passata a `window.__melisRegisterPageTab` in
  `brick.tsx` — *è* la capacità della scheda. Senza di essa, la whitelist delle capacità della pagina
  CMS nasconde il pulsante della scheda anche a un amministratore.
- Non c'è **alcuna capacità di backend** da dichiarare: il modulo non espone alcuna azione
  `react-api`. L'accesso è regolato dall'accesso all'editor di pagina CMS (scheda di pagina) e allo
  strumento Site analytics (visualizzazione del sito).

## Integrazione con l'host

- **Ponte per la scheda di pagina (`__melisRegisterPageTab`)** — fornito dal brick CmsPage. Entrambi
  i brick condividono una protezione idempotente: chi carica per primo crea
  `window.__melisPageTabRegistry` e definisce il registrar. CmsPage legge
  `tabs['melis_cms_google_analytics_page_tab']` e renderizza il componente con `{ idPage }`; il
  pulsante appare solo se la capacità è concessa.
- **Ponte per la visualizzazione del sito (`__melisAnalyticsSiteDisplays`)** — fornito/consumato dallo
  strumento *Site analytics* di `melis-cms-page-analytics`. Il brick registra il proprio componente
  sotto la chiave `melis_cms_google_analytics` (corrispondente al `pad_analytics_key` memorizzato del
  sito) e attiva `melis:analytics-site-display-registered`. L'host lo monta (con `{ siteId }`) nella
  sotto-scheda Analytics quando il *modulo Analytics* del sito = Google Analytics — sostituendo il
  vecchio iframe con React nativo.
- **Le parti generiche restano nell'host.** Il contenitore della scheda dell'editor di pagina, lo
  strumento Site analytics, il selettore del sito e il modulo Settings appartengono a MelisCms /
  MelisCmsPageAnalytics; questo modulo riempie solo la visualizzazione *Google Analytics*.

## File principali

| Ambito | Percorso |
| --- | --- |
| Rotte / alias dei servizi GA | `config/module.config.php` |
| Capacità React (`meliscms_page.tabs[]`) | `config/react.capabilities.php` |
| Controller (`getPageContextAction`, `getChartDataAction`) | `src/Controller/GoogleAnalyticsController.php` |
| Sorgente del brick React (Vite IIFE) | `ui-react/src/brick.tsx`, `GoogleAnalyticsPage.tsx`, `GoogleAnalyticsSiteDisplay.tsx` |
| Brick compilato + manifest | `public/ui-react/brick.js`, `public/ui-react/brick.manifest.json` |

Vedi anche: [melis-cms-page-analytics](/it/reference/modules/melis-cms-page-analytics) ·
[melis-cms](/legacy/reference/modules/melis-cms) ·
[melis-core](/legacy/reference/modules/melis-core)
