# MelisCmsLinkCheck

> Verificatore di link che analizza una pagina (e facoltativamente le sue sotto-pagine o i suoi link interni)
> e registra ogni link e ogni immagine non funzionante, mantenendo un log di scansione per pagina. Pacchetto `melisplatform/melis-cms-link-check`.

## Scopo

MelisCmsLinkCheck è il verificatore di link di Melis. Analizza una pagina — seguendo facoltativamente le sue sotto-pagine o i
suoi link interni — e registra ogni link e ogni immagine non funzionante che trova, salvando un log di scansione
per ogni pagina scansionata. La scansione vera e propria (curl, validazione, inserimento nel log, traduzioni) risiede lato server
nel servizio Laminas `MelisCmsLinkCheckService::executeTest()`; il back-office React è uno
strato di presentazione che legge e avvia le scansioni tramite gli endpoint react-api del modulo.

Nel back-office React v6 (`/melis-react`) il modulo fornisce un brick nativo full-React con due
superfici:

- Uno strumento **Testeur de liens** nel menu di sinistra — un visualizzatore in sola lettura dei risultati delle scansioni passate, una modale **Avvia una scansione**
  e un report degli errori per riga, con un interruttore **Nuovo / Vecchio** che ripiega sullo strumento classico
  in un iframe.
- Una scheda **Link Checker** nell'editor di pagine CMS React che avvia e mostra il report di una scansione limitata alla
  singola pagina in fase di modifica.

## Attivazione

Aggiungere a `config/melis.module.load.php`:

```php
return [
    'MelisCmsLinkCheck',
];
```

Entrambe le superfici sono subordinate all'attivazione: compaiono solo se il modulo è attivo, individuato dall'host
tramite `GET /melis/react-api/react-modules` (che elenca i moduli attivi che forniscono un `brick.manifest.json`).
La disattivazione del modulo rimuove sia lo strumento del menu sia la scheda dell'editor di pagine.

## Il back-office React in breve

| Elemento | Valore |
| --- | --- |
| Tipo di brick | Nativo full-React (con fallback legacy in iframe Nuovo/Vecchio) + una scheda dell'editor di pagine |
| Id del brick | `cms-link-check` |
| `route` del manifest | `/melis-cms-link-check/results` |
| `label` | `Testeur de liens` (Verificatore di link) |
| `forwardKey` | `MelisCmsLinkCheck/MelisCmsLinkCheckList` |
| `melisKey` (menu / iframe vista Vecchia / nodo dei diritti) | `meliscmslinkcheck_tool` |
| Chiave della scheda di pagina (= la sua capability) | `meliscmslinkcheck_page_link_check_tab` |
| Base API | `/melis/react-api/cms-link-check` |
| Controller react-api | `MelisReactApiLinkCheckController` (invokable `MelisReactApiLinkCheck`) |
| Tabella (di proprietà) | `melis_cms_link_check_logs` |
| Servizio di scansione | `MelisCmsLinkCheckService::executeTest(...)` |

## Lo strumento Verificatore di link

Barra laterale sinistra → il nodo **Testeur de liens** (*Verificatore di link*) apre lo strumento come scheda principale. La vista Nuova
elenca ogni log di scansione presente sulla piattaforma, una riga per ogni pagina scansionata.

![Strumento Verificatore di link React che mostra le card KPI, i filtri e l'elenco dei risultati](/screenshots/react/melis-cms-link-check/meliscmslinkcheck-tool-linkchecker-list.png)

L'elenco dispone di card KPI (Pagine scansionate, Errori totali, Siti), una casella di ricerca (che confronta URL della pagina, id della
pagina, nome/etichetta del sito), un filtro per sito (solo i siti che hanno dei log), Reimposta filtri, un gestore di colonne (mostra/nascondi/riordina le colonne, salvato
localmente) e un'Esportazione. Fare clic sull'intestazione di una colonna per ordinare (predefinito:
scansione più recente per prima). I conteggi degli errori sono mostrati come badge — verde quando è 0, rosso altrimenti (Errori = totale,
Link, Immagini).

Ogni riga dispone di quattro azioni:

| Azione | Icona | Scopo |
| --- | --- | --- |
| Visualizza front | occhio | Apre l'URL della pagina scansionata in una nuova scheda. |
| Modifica pagina | matita | Apre la pagina nell'editor di pagine CMS React e vi passa. |
| Report | documento | Apre la modale del report degli errori per pagina. |
| Elimina | cestino | Rimuove quel log di scansione (richiede la capability `delete`). |

L'interruttore **Nuovo / Vecchio** in alto a destra commuta l'intero strumento tra il visualizzatore React (predefinito) e lo
strumento classico renderizzato in un iframe (`/melis/react-tool-page?key=meliscmslinkcheck_tool`), che può
essere usato anche per avviare le scansioni nel modo legacy.

## Avviare una scansione

Il pulsante rosso **Avvia una scansione** (mostrato se si dispone della capability `launch`) apre una modale.

![Modale Avvia una scansione con selettore di pagina, radio per l'ambito e checkbox di verifica](/screenshots/react/melis-cms-link-check/meliscmslinkcheck-tool-linkchecker-launchscan.png)

Selezionare la pagina di partenza dall'albero lazy delle pagine CMS, scegliere un **ambito** e cosa **verificare**, quindi
**Esegui**. La scansione analizza la/le pagina/e, registra i risultati, aggiorna l'elenco e pubblica una
notifica.

- **Ambito** — Solo questa pagina / Questa pagina e le sue sotto-pagine / Questa pagina e i suoi link interni
  (inviato come `follow: '1' | '2' | '3'`).
- **Verifica** — Link e/o Immagini (inviato come `options: ['LINK', 'IMG']`).

## Leggere il report di una pagina

L'azione **Report** su una riga apre gli errori dettagliati per quel log di scansione.

![Modale del report degli errori per pagina nel suo stato pulito](/screenshots/react/melis-cms-link-check/meliscmslinkcheck-tool-linkchecker-report.png)

Una pagina pulita mostra "✓ Nessun errore registrato per questa pagina." Una pagina con errori mostra una tabella: **Tipo**
(badge LINK / IMG) · **URL** · **Dettagli** (l'errore). Il dettaglio proviene dalla colonna XML
`lcl_errors` analizzata, decodificata in un `errorList` di `{ url, type, details }`.

## Verificare una singola pagina dal suo editor

Aprire una pagina nell'editor di pagine CMS React e fare clic sulla scheda **Link Checker**. Mostra l'ultima scansione
di quella pagina (data, badge Errori / Link / Immagini e la tabella dettagliata degli errori o un messaggio di stato pulito)
con un pulsante **Ri-scansiona** — oppure **Avvia una scansione** se la pagina non è mai stata scansionata — che esegue una scansione
solo per quella pagina.

![Scheda Link Checker nell'editor di pagine CMS React che mostra una scansione limitata a una pagina](/screenshots/react/melis-cms-link-check/meliscmslinkcheck-pageedition-tab-linkchecker-launchandreport.png)

La scheda viene aggiunta all'editor di pagine CMS tramite il bridge dell'host `window.__melisRegisterPageTab`
(di proprietà del brick CmsPage), con chiave `meliscmslinkcheck_page_link_check_tab`; CmsPage la renderizza con
`{ idPage }`.

## API React — endpoint

Le route risiedono in `config/react-api.php`, servite da
`MelisCmsLinkCheck\Controller\MelisReactApiLinkCheckController`. Tutte sotto
`/melis/react-api/cms-link-check`, con il contratto `{ success, data, error }`. Ogni fetch invia
`X-Requested-With: XMLHttpRequest` e `credentials: 'include'`.

| Metodo e URL | Azione | Scopo |
| --- | --- | --- |
| `GET /cms-link-check` | `list` | Log di scansione (keyset: `limit`, `search`, `site`, `sort`, `dir`, `after`) → `{items,total,nextCursor}` |
| `GET /cms-link-check/stats` | `stats` | KPI `{total, errors, sites}` |
| `GET /cms-link-check/sites` | `sites` | Opzioni del filtro per sito (solo i siti presenti nei log) |
| `POST /cms-link-check/launch` | `launch` | Esegue una scansione (`{pageId, follow, options}`) → `{status,message,logIds,pagesVisited}` |
| `GET /cms-link-check/by-page/:idPage` | `byPage` | Ultima scansione di UNA pagina (scheda dell'editor di pagine); `data: null` se mai scansionata |
| `DELETE /cms-link-check/delete/:id` | `delete` | Elimina un log di scansione |
| `GET /cms-link-check/:id` | `get` | Un log + il suo `errorList:[{url,type,details}]` analizzato |

> L'ordine delle route è importante: `/stats`, `/sites`, `/launch`, `/by-page/:idPage` e `/delete/:id` sono
> dichiarate prima della catch-all `/:id`.

Le azioni `list`, `stats`, `sites`, `get`, `by-page` e `delete` leggono `melis_cms_link_check_logs`
direttamente tramite SQL parametrizzato (`Laminas\Db\Adapter\AdapterInterface`). Solo `launch` delega a
`MelisCmsLinkCheckService::executeTest([...])` — la scansione vera e propria — racchiusa in `ob_start()` /
`ob_end_clean()` affinché gli warning legacy non corrompano il JSON. Il selettore di pagina di Avvia-una-scansione riutilizza un
endpoint legacy esistente (nessun nuovo backend):
`GET /melis/MelisCms/TreeSites/get-tree-pages-by-page-id?nodeId=<id>` (`nodeId=-1` → siti radice).

## Capabilities

Dichiarate in `config/react.capabilities.php` sotto due nodi portatori di diritti:

```php
return [
  'melisReactToolCapabilities' => [
    'meliscmslinkcheck_tool' => ['list', 'launch', 'delete', 'export'],
    'meliscms_page' => [
      'tabs' => [
        ['key' => 'meliscmslinkcheck_page_link_check_tab', 'label' => 'tr_meliscmslinkcheck_page_link_check_tab'],
      ],
    ],
  ],
];
```

- **Capability dello strumento** — `list` (l'intero visualizzatore in sola lettura: list/stats/sites/report), `launch` (esegue una
  scansione), `delete` (elimina un log), `export` (il pulsante Esportazione; l'esportazione riutilizza l'endpoint `list`). In
  React limitano l'interfaccia tramite `MelisCan('meliscmslinkcheck_tool', cap)`; lato server ogni azione è
  protetta da `denyUnlessAccess()` seguito da `denyUnlessCan('list'|'launch'|'delete')`.
- **Capability della scheda di pagina** — la `key` `meliscmslinkcheck_page_link_check_tab` deve corrispondere alla chiave passata a
  `window.__melisRegisterPageTab`; *è* la capability della scheda. Senza questa dichiarazione la
  whitelist delle capability delle pagine CMS nasconde il pulsante della scheda anche a un amministratore. L'endpoint `by-page` della scheda è
  protetto solo dall'autenticazione di sessione (è una sotto-funzionalità dell'editor di pagine); il pulsante da questa capability.

## Tabelle del database

| Tabella | Ruolo |
| --- | --- |
| `melis_cms_link_check_logs` | Un log di scansione per pagina scansionata: conteggi di link/immagini non funzionanti più l'elenco dettagliato degli errori memorizzato come XML nella colonna `lcl_errors`. |

## Controller legacy (vista Vecchia)

Usati dal fallback in iframe Nuovo/Vecchio e dallo strumento classico, non dal visualizzatore React:

| Controller | Ruolo |
| --- | --- |
| `MelisCmsLinkCheckListController` | Pagina dello strumento classico + le sue DataTables dei risultati. |
| `MelisCmsLinkCheckLaunchController` | Modale/form di avvio classico (pagina + ambito + verifica). |
| `MelisCmsLinkCheckPageLinkCheckController` | Scheda Link Check classica dell'editor di pagine (`renderPageLinkCheckAction`, `{ idPage }`). |

## File chiave

| Ambito | Percorso |
| --- | --- |
| Route react-api + invokable | `config/react-api.php` |
| Capabilities | `config/react.capabilities.php` |
| Configurazione dello strumento legacy | `config/app.*.php` |
| Controller react-api | `src/Controller/MelisReactApiLinkCheckController.php` |
| Servizio di scansione | `src/Service/MelisCmsLinkCheckService.php` |
| Sorgente del brick React | `ui-react/src/` (`brick.tsx`, `LinkCheckPage.tsx`, `linkcheck-api.ts`, …) |
| Brick compilato + manifest | `public/ui-react/brick.js`, `public/ui-react/brick.manifest.json` |
