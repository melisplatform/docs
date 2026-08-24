# MelisSql

> Esecutore di query SQL in sola lettura negli Strumenti per sviluppatori del back-office React, distribuito come brick nativo full-React. Pacchetto `melisplatform/melis-sql`.

## Scopo

MelisSql è un piccolo strumento per sviluppatori: un **esecutore di query SQL in sola lettura**. Scrivi un'istruzione
`SELECT`, premi **Run** e le righe corrispondenti vengono restituite in una tabella dinamica, senza lasciare il
back-office né aprire un client di database esterno. Si connette utilizzando le credenziali configurate della piattaforma
`config['db']`, quindi non è necessario inserire alcun dettaglio di connessione.

In Melis v6 lo strumento è distribuito come **brick nativo full-React** in `/melis-react`: una vera pagina React che
chiama un unico endpoint JSON `react-api`, con un interruttore **New / Old** che può ripiegare sullo strumento legacy
in un iframe. È uno strumento di diagnostica e ispezione riservato agli amministratori, non una funzionalità per l'utente finale.

## Attivazione

Aggiungi a `config/melis.module.load.php`:

```php
return [
    'MelisSql',
];
```

Lo strumento compare nel back-office React **solo se il modulo è attivato** (rilevamento modulare dei brick).
Richiede `melisplatform/melis-core` e PHP `^8.1|^8.3|^8.4`.

## Dove si trova in /melis-react

Barra laterale sinistra → gruppo **Dev Tools** → **SQL**. Si apre come scheda superiore denominata **SQL**. Il
manifest del brick dichiara la rotta `/melis-core/sql` e vi associa la `forwardKey` di menu `MelisSql/List`.

È uno **strumento a schermata singola**: una pagina con una casella di query, un pulsante **Run** e una tabella
di risultati dinamica. Nessuna sotto-scheda, nessun approfondimento.

![Lo strumento SQL React: intestazione con titolo/sottotitolo, l'interruttore New/Old (in alto a destra), un'area di testo per la query con il placeholder `SELECT * FROM my_table LIMIT 10;`, il suggerimento "One SELECT statement only, ending with « ; »", un pulsante Run rosso e una scheda di risultati vuota.](/screenshots/react/melis-sql/melissql-tool-sql.png)

## Utilizzo dello strumento React

1. Scrivi **una** sola istruzione `SELECT` nell'area di testo della query.
2. Terminala con un punto e virgola `;`.
3. Fai clic su **Run** (oppure premi **Ctrl/Cmd + Enter**).

Una volta che una query restituisce dei risultati, compare una scheda dei risultati con:

- Un **conteggio delle righe** (ad es. `12 row(s)`; durante una ricerca, `matches / total`).
- Una casella di **ricerca** che filtra le righe restituite su **tutte** le colonne (anche quelle nascoste).
- Un pulsante **Columns** che apre un gestore delle colonne: due elenchi (**Visible** / **Hidden**), trascina per
  nascondere/riordinare, **Reset** per mostrarle tutte. La disposizione viene memorizzata per browser
  (`localStorage`, chiave `melis-sql-cols-v1`).
- La **tabella** stessa: fai clic su un'intestazione per **ordinare** (crescente → decrescente); i blob di immagine
  riconosciuti (ad es. un avatar utente) vengono renderizzati inline come miniature.

### Interruttore New / Old

Un interruttore **New / Old** in alto a destra commuta l'intero strumento tra le viste. **New** (predefinita) è
l'interfaccia React; **Old** renderizza lo strumento legacy in un iframe singleton
(`/melis/react-tool-page?key=melissql_tool`), posizionato su un'ancora tramite un `ResizeObserver`.

## Regole per le query

Lo strumento rifiuta qualsiasi cosa che non sia una singola istruzione in sola lettura, mostrando il motivo in un
banner rosso:

| Situazione | Cosa succede |
| --- | --- |
| L'istruzione non inizia con `SELECT` | Rifiutata — *only SELECT queries are allowed*. |
| Nessun punto e virgola alla fine | Rifiutata — *a query should end with ';'*. |
| Più di un'istruzione (diversi `;`) | Rifiutata — *only one query is allowed*. |
| **Non** sei un amministratore della piattaforma | Rifiutata — **403 Forbidden** (solo amministratori). |
| La query non può essere preparata / fallisce | L'errore del database viene mostrato nel banner. |

## Endpoint dell'API React

Per questo modulo **non** esiste un file `config/react-api.php`. L'unico endpoint viene raggiunto tramite la
rotta back-office catch-all del modulo (`config/module.config.php`,
`/melis/MelisSql[/:controller[/:action]]`), che risolve l'alias
`MelisSql\Controller\MelisSqlReactApi` → `MelisSqlReactApiController` (dichiarato sotto
`controllers.invokables`). Contratto: `{ success, data, error }`.

| Metodo e URL | Azione del controller | Scopo |
| --- | --- | --- |
| `POST /melis/MelisSql/MelisSqlReactApi/run` | `runAction` | Valida + esegue una singola `SELECT` in sola lettura, restituisce `{ columns, rows, rowCount }` |

Corpo della richiesta: `{ "query": "SELECT … ;" }`.

```ts
// runSqlQuery(query) — the only call the brick makes (ui-react/src/sql-api.ts)
const res = await fetch('/melis/MelisSql/MelisSqlReactApi/run', {
  method: 'POST',
  headers: { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: 'SELECT * FROM melis_cms_page_tree;' }),
})
// → { success: true, data: { columns: string[], rows: Record<string,unknown>[], rowCount: number } }
```

`MelisSqlReactApiController` **estende il `ListController` legacy** per riutilizzarne il guard `runQuery()`
alla lettera (stessa connessione `mysqli` da `config['db']`, stessa validazione a singola istruzione /
solo `SELECT`, stessi messaggi di errore tradotti). Aggiunge soltanto la riformattazione JSON più le
salvaguardie descritte di seguito. Gli errori di validazione/DB restituiscono HTTP **200** con
`{ success:false, error }`; i fallimenti di autenticazione restituiscono 401/403; le richieste non-`POST` restituiscono 405.

## Capacità

Dichiarate in `config/react.capabilities.php` (unite tramite `MelisSql\Module::getConfig()`), indicizzate sotto
la melisKey `melissql_tool` dello strumento:

```php
return ['melisReactToolCapabilities' => [
    'melissql_tool' => ['run'],   // one internal cap: the Run (execute-query) action
]];
```

- **`run`** è una capacità personalizzata (non una delle capacità standard `list/create/edit/delete/export`).
  Consente a un amministratore di *vedere/consultare* lo strumento senza necessariamente avere il permesso di **eseguire** query.
- **Controllo lato front.** `SqlPage` chiama `useCaps('melissql_tool')` → `can('run')` e solo allora renderizza
  il pulsante **Run** e abilita la scorciatoia Ctrl/Cmd + Enter.
- Questo file è **solo dichiarativo** (pilota le caselle di controllo in Users → Rights); l'**effettiva applicazione**
  è il guard di accesso + il controllo `usr_admin` nel controller.

## Note sulla sicurezza

- **Solo amministratori.** Il controller esegue `denyUnlessAccess()` (401 se non autenticato, 403 se
  `MelisCoreRights::canAccess('melissql_tool')` fallisce), quindi richiede in aggiunta `usr_admin`. Il
  diritto `melissql_tool` è delegabile, quindi **i soli diritti non sono sufficienti**: un non amministratore riceve
  **403 Forbidden**.
- **Sola lettura per costruzione.** `runQuery()` rifiuta qualsiasi cosa che non sia esattamente una singola istruzione
  che termina con `;` e inizia con `SELECT`: nessun percorso verso `INSERT`/`UPDATE`/`DELETE`/DDL. Considera qualsiasi
  modifica a `runAction`/`runQuery` come sensibile per la sicurezza.
- **Mascheramento delle colonne sensibili.** `maskSensitiveColumns()` maschera i *valori* delle colonne il cui nome
  corrisponde a `password|passwd|pwd|mot_de_passe|secret|token|api_key` con `••••••••`, lato server, in modo che un
  hash non raggiunga mai il browser su una `SELECT *`. È una salvaguardia, non un confine di sicurezza.
- **JSON sicuro per i binari.** `sanitizeForJson()` codifica in base64 i binari non-UTF-8 ed emette i blob di immagine
  riconosciuti (ad es. `melis_core_user.usr_image`) come URI `data:<mime>;base64,…` per il rendering inline.
- Evita `SELECT *` illimitate su tabelle molto grandi: non esiste una paginazione lato server.

## File chiave

| Ambito | Percorso |
| --- | --- |
| Rotta catch-all, invokable del controller, estensione toolpage della vista Old | `config/module.config.php` |
| Capacità (`melisReactToolCapabilities` → `melissql_tool` → `run`) | `config/react.capabilities.php` |
| Strumento legacy + guard `runQuery()` (riutilizzato dal controller API) | `src/Controller/ListController.php` |
| Controller API React (controllo admin + riuso di `runQuery` + mascheramento + JSON-safe) | `src/Controller/MelisSqlReactApiController.php` |
| Particolarità di `toolPageAction()` per l'iframe della vista Old | `src/Controller/React/PluginViewToolPageExtension.php` |
| Sorgente del brick React (Vite IIFE) | `ui-react/src/` — `brick.tsx`, `SqlPage.tsx`, `ViewToggle.tsx`, `sql-api.ts` |
| Brick compilato + manifest | `public/ui-react/brick.js`, `public/ui-react/brick.manifest.json` |

Vedi anche: [MelisCore](/it/reference/modules/melis-core)
