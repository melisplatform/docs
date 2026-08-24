# MelisCmsPageHistoric

> Registro di audit per la modifica delle pagine CMS — registra chi ha fatto cosa a una pagina e quando, esposto come scheda Historic nell'editor di pagine React e come widget della dashboard. Pacchetto `melisplatform/melis-cms-page-historic`.

## Scopo

`MelisCmsPageHistoric` cattura automaticamente ogni azione sulla pagina (salvataggio, pubblicazione, annullamento della pubblicazione, eliminazione)
con l'identità dell'autore e il timestamp. La cronologia viene scritta tramite listener di eventi agganciati al ciclo di vita
della pagina CMS — non è necessario configurare nulla per singola pagina. Il registro è esposto in **sola lettura**: in una
**scheda Historic** all'interno dell'editor di pagine e in un widget della dashboard **Recent page activity**. Serve
per la tracciabilità delle responsabilità, non per il ripristino delle pagine.

## Come abilitarlo

Aggiungere a `config/melis.module.load.php`:

```php
return [
    'MelisCmsPageHistoric',
];
```

Eseguire i delta `install/dbdeploy/` inclusi per creare la tabella della cronologia (`extra.dbdeploy: true`).
Richiede `melis-core`, `melis-engine`, `melis-front` e `melis-cms`.

## Un modulo senza brick

Si tratta di un modulo React insolito: non fornisce **alcun brick proprio** (nessuna `ui-react/`, nessun
`public/ui-react/brick.manifest.json`, nessun bundle Vite). La sua impronta React è costituita da tre file di configurazione PHP
uniti da `Module::getConfig()`, più un controller e un plugin dashboard legacy. Entrambe le superfici React
compaiono **solo mentre il modulo è attivo**.

| File di configurazione | Contributo |
| --- | --- |
| `config/react-api.php` | L'endpoint `GET /melis/react-api/cms-page/historic` + il controller invocabile |
| `config/react.capabilities.php` | La capability della scheda Historic sotto il nodo condiviso `meliscms_page` |
| `config/app.interface.php` | Il **pulsante** della scheda Historic nell'editor di pagine CMS (icona `history`) |

Il componente React che viene renderizzato all'interno della scheda Historic **non è fornito da questo modulo** — viene
fornito lato host dalla shell melis-core e collegato tramite il registro delle schede di pagina
(`window.__melisRegisterPageTab('melispagehistoric_historic', Component)`). Questo modulo contribuisce
solo con l'endpoint dati, la capability e la dichiarazione del pulsante della scheda; l'editor di pagine CMS
(MelisCms) ospita la scheda.

## Scheda Historic (editor di pagine React)

Barra laterale sinistra → **MelisCms** → aprire una **pagina** → la scheda **Historic** nella riga delle schede dell'editor.
Mostra una tabella in sola lettura delle azioni **di questa pagina**, dalla più recente, con le colonne **Date**, **Action**
(badge colorati Publish / Save / Unpublish) e **User**. Un menu a discesa **Filter (All actions)**
restringe a un singolo tipo di azione. L'elenco è **paginato lato server** — non carica mai l'intera
cronologia in una sola volta.

![Scheda Historic nell'editor di pagine CMS React che mostra la tabella della cronologia della pagina con le colonne Date, badge Action e User oltre a un filtro delle azioni](/screenshots/react/melis-cms-page-historic/meliscmspagehistoric-page-tab-historic.png)

La scheda mostra solo la cronologia della pagina corrente. Per l'attività su *tutte* le pagine, utilizzare il widget
della dashboard descritto di seguito.

## Widget della dashboard Recent page activity

Nella **Dashboard** del back-office, il widget **Recent page activity** elenca le azioni più recenti sulle pagine
per tutti gli utenti (timestamp · indicatore di stato · nome pagina + id · azione · utente). Viene
aggiunto/rimosso dal pannello "Add a widget" come qualsiasi altro widget della dashboard, sotto il gruppo **MELIS CMS
PAGE HISTORIC**.

![Widget della dashboard Recent page activity che elenca le azioni recenti sulle pagine, con il pannello Add a widget che lo mostra sotto Melis Cms Page Historic](/screenshots/react/melis-cms-page-historic/meliscmspagehistoric-dashboard-plugin-recentactivity.png)

Questo widget è ancora un **plugin dashboard PHP legacy**
(`MelisCmsPageHistoricRecentUserActivityPlugin`, azione `recentActivityPages`) renderizzato all'interno dell'host dei widget
della dashboard React — non esiste una riscrittura in React. Legge tramite
`MelisPageHistoricTable->getPagesHistoricForDashboard()` ed è subordinato all'attivazione di MelisCms oltre che
al diritto di accesso al plugin della dashboard.

## React API — l'endpoint Historic

Dichiarato in `config/react-api.php`, controller
`MelisCmsPageHistoric\Controller\MelisReactApiPageHistoricController` (alias invocabile
`MelisReactApiPageHistoric`). Una sola azione, contratto `{ success, data, error }`.

| Metodo e URL | Azione | Scopo |
| --- | --- | --- |
| `GET /melis/react-api/cms-page/historic?idPage=<id>&page=<n>&perPage=<25>&action=<type>` | `listAction` | Le righe di audit della pagina corrente, paginate lato server, più i tipi di azione distinti per il menu a discesa del filtro |

Struttura di `data` nella risposta:

```jsonc
{ "success": true, "data": {
  "idPage": 1,
  "items": [ { "id": 123, "date": "2026-08-18 10:10:25", "action": "Publish",
               "user": "John Doe", "userId": 1 } ],   // newest first (ORDER BY hist_id DESC)
  "page": 1, "perPage": 25, "total": 87,               // total = indexed COUNT → drives paging
  "action": "",                                        // active action filter ('' = all)
  "actionTypes": ["Publish", "Save", "Unpublish"]      // DISTINCT hist_action for the filter select
} }
```

Note di implementazione:

- **Guardia:** l'azione verifica solo `MelisCoreAuth->hasIdentity()` (restituisce `401` se
  non autenticato). **Non** applica una capability lato server — considerare la capability descritta di seguito come
  un segnale di **gating dell'interfaccia utente**, non un controllo di autorizzazione backend.
- **Dati:** SQL parametrizzato diretto su `melis_hist_page_historic` (LEFT JOIN `melis_core_user` per
  il nome utente; un utente eliminato è etichettato come `"Utilisateur supprimé (<id>)"`).
- **Paginazione:** `perPage` limitato all'intervallo `1..200` (predefinito 25); `total` è un `COUNT(*)`
  indicizzato separato che rispetta lo stesso `WHERE`. Il filtro opzionale `action` si applica sia al conteggio
  sia alla pagina.

## Capability

Poiché il modulo contribuisce con una scheda allo strumento di pagine CMS, la sua capability è dichiarata sotto il
nodo dei diritti **condiviso** `meliscms_page` (un `ArrayUtils::merge` aggiunge in coda alla `tabs[]` di quello strumento):

```php
return [
  'melisReactToolCapabilities' => [
    'meliscms_page' => [
      'tabs' => [
        ['key' => 'melispagehistoric_historic', 'label' => 'tr_melispagehistoric_page_tab_historic_Historic'],
      ],
    ],
  ],
];
```

- La `key` (`melispagehistoric_historic`) è la capability della scheda; corrisponde alla chiave che l'host usa
  per registrare il componente della scheda e alla `melisKey` dell'interfaccia in `app.interface.php`.
- È indicizzata sotto `meliscms_page` ("Edition de page" in Users → Rights), **non** sotto il wrapper
  `meliscms` e **non** sotto il nodo del pulsante della scheda.
- Senza questa dichiarazione, la whitelist delle capability delle pagine CMS nasconde il pulsante della scheda — anche per un amministratore.

## Come viene scritta la cronologia (pattern listener)

Due listener collegati in `src/Module.php` (solo bootstrap del back-office) registrano le righe; React si limita
a leggerle.

| Listener | Evento/i | Cosa registra |
| --- | --- | --- |
| `MelisPageHistoricPageEventListener` | `meliscms_page_save_end`, `meliscms_page_publish_end`, `meliscms_page_unpublish_end`, … | Save / Publish / Unpublish |
| `MelisPageHistoricDeletePageListener` | `meliscms_page_delete_end` | Delete (esegue anche la pulizia) |

Non si scrivono righe di cronologia manualmente — salvando, pubblicando o eliminando una pagina tramite il CMS
si attivano automaticamente i listener.

## Tabella del database

| Tabella | Contiene |
| --- | --- |
| `melis_hist_page_historic` | Una riga per ogni azione registrata: `hist_id` (PK), `hist_page_id`, `hist_action`, `hist_date`, `hist_user_id`, `hist_description`. |

## File chiave

| Ambito | Percorso |
| --- | --- |
| Controller react-api | `vendor/melisplatform/melis-cms-page-historic/src/Controller/MelisReactApiPageHistoricController.php` |
| Rotta react-api | `vendor/melisplatform/melis-cms-page-historic/config/react-api.php` |
| Capability della scheda Historic | `vendor/melisplatform/melis-cms-page-historic/config/react.capabilities.php` |
| Pulsante / interfaccia della scheda Historic | `vendor/melisplatform/melis-cms-page-historic/config/app.interface.php` |
| Bootstrap del modulo (listener) | `vendor/melisplatform/melis-cms-page-historic/src/Module.php` |
| Table gateway | `vendor/melisplatform/melis-cms-page-historic/src/Model/Tables/MelisPageHistoricTable.php` |
| Plugin dashboard (legacy) | `vendor/melisplatform/melis-cms-page-historic/src/Controller/DashboardPlugins/MelisCmsPageHistoricRecentUserActivityPlugin.php` |
| SQL di installazione / dbdeploy | `vendor/melisplatform/melis-cms-page-historic/install/` |

Vedi anche: [MelisCms](/it/reference/modules/melis-cms), [Riferimento dei moduli](/it/reference/modules)
