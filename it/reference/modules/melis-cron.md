# MelisCron

> Gestore di attività pianificate del back-office: definisci attività CLI o HTTP con pianificazioni flessibili, eseguile su richiesta o tramite un runner CLI al minuto e consulta lo storico completo delle esecuzioni — ora basato su uno strumento React nativo. Pacchetto `melisplatform/melis-cron`.

## Scopo

MelisCron sostituisce le righe di crontab scritte a mano con un elenco gestito di attività. Ogni attività punta a un **comando CLI** o a un **URL HTTP** e dichiara quando eseguirsi (ogni N minuti/ore/giorni, ogni ora, ogni giorno, ogni settimana o ogni mese). Ogni esecuzione viene registrata in una tabella di storico con stato, durata e output catturato. L'esecuzione pianificata richiede comunque una voce crontab a livello di sistema operativo che invoca il runner `melis:cronexec` ogni minuto; lo strumento React si limita a definire, registrare e (su richiesta) attivare le attività.

## Attivazione

Aggiungi a `config/melis.module.load.php`:

```php
return [
    'MelisCron',
];
```

Richiede **MelisCore** (fornito dalla piattaforma). Dipendenze Composer: PHP `^8.1|^8.3`, `ext-curl`, `composer/composer ^2.9.6`, `laminas/laminas-cli ^1.5`. Lo strumento React compare solo se il modulo è attivato (rilevamento modulare dei brick).

## Back-office (React)

**Barra laterale → MelisCore → Dev Tools → Scheduled Tasks**, insieme a Melis Phpinfo e allo strumento SQL. Si apre come scheda principale denominata **Scheduled Tasks** e viene distribuito come **brick full-React nativo** (brick id `cron`, melisKey `cron_tool`), con un selettore **New / Old**: *New* è l'interfaccia React (predefinita); *Old* mostra lo strumento jQuery legacy in un iframe.

Poiché un'attività cron esegue comandi CLI arbitrari e chiamate HTTP, le operazioni di **creazione / modifica / esecuzione** sono limitate agli **amministratori** della piattaforma lato server, in aggiunta ai controlli sulle capability.

### Elenco delle attività

L'elenco mostra ogni attività pianificata con **schede KPI** (Total / Active / Inactive), un campo di **ricerca** (nome e target), i filtri **status** (All / Active / Inactive) e **type** (CLI / HTTP), **Reset filters**, un gestore delle **Columns** (persistente), un pulsante **Export** e un pulsante di **aggiornamento**. Fai clic sull'intestazione di una colonna per ordinare. Ogni riga dispone di tre azioni: **Run now** (▶), **modifica** ed **elimina** (l'eliminazione rimuove anche lo storico dell'attività). Pulsanti in alto a destra: **History**, il selettore **New / Old** e **+ New task**. Le pagine del modulo e dello storico si aprono come **sotto-schede** native all'interno della scheda Scheduled Tasks, ciascuna mantenendo il proprio stato.

![Lo strumento React Cron: schede KPI, ricerca, filtri status e type, Columns, Export, il selettore New/Old, History e + New task, con azioni Run/modifica/elimina per ogni riga](/screenshots/react/melis-cron/meliscron-tool-cron-list.png)

### Creare / modificare un'attività

**+ New task** (o la matita di modifica di una riga) apre un modulo React a due pannelli in una sotto-scheda:

- **Identità + target** — **Name**, **Type** (selettore segmentato CLI / HTTP) e **Target** (il comando CLI come `cache:clear`, oppure l'URL HTTP), con un suggerimento contestuale in base al tipo.
- **Options** — un selettore **Active** e il selettore **Schedule**. La scelta di una pianificazione mostra il relativo editor: *Interval* = valore + unità (minuti/ore/giorni); *Hourly* = minuto dell'ora; *Daily* = ora + minuto; *Weekly* = pulsanti dei giorni della settimana + ora + minuto; *Monthly* = giorno del mese + ora + minuto.

![Il modulo React New-task — Name, Type (CLI/HTTP), Target con un suggerimento contestuale in base al tipo, e il pannello Options con il selettore Active e l'editor Schedule (Interval — ogni 15 minuti)](/screenshots/react/melis-cron/meliscron-tool-cron-new.png)

**Save** salva l'attività. La validazione (replicata lato client e lato server): nome obbligatorio (≤ 100 caratteri), target obbligatorio (≤ 255 caratteri), il tipo deve essere CLI/HTTP e le opzioni di pianificazione devono essere valide per il tipo scelto.

![Modifica di "CRON 1" (un'attività HTTP con target /my-url, ogni 15 minuti) — lo stesso modulo a due pannelli, precompilato con i dati dell'attività](/screenshots/react/melis-cron/meliscron-tool-cron-edit.png)

### Run now e storico

Il pulsante **Run** (▶) per riga chiede conferma, quindi **esegue immediatamente l'attività** (in modo sincrono, nella richiesta) e riporta l'esito — stato, codice HTTP per le attività HTTP, durata — come notifica, e scrive una voce nello storico. Questo ignora la pianificazione.

![La finestra di conferma "Run task" — "Are you sure you want to perform 'CRON 1' now?" con Cancel / Run](/screenshots/react/melis-cron/meliscron-tool-cron-run.png)

Il pulsante **History** apre la pagina **Execution history** in una sotto-scheda: schede KPI (Executions / Succeeded / Failed / Running), filtri (ricerca su nome e log, menu a discesa dell'attività, menu a discesa dello stato, intervallo di date From/To) e una tabella delle esecuzioni (attività, tipo, stato, durata, data di esecuzione, badge di riesecuzione). Un popup **Logs** per riga mostra il dettaglio dell'esecuzione (target, date di accodamento/esecuzione, durata, codice HTTP) e i log grezzi catturati.

## API React

Le rotte si trovano in `config/react-api.php`, controller `MelisCron\Controller\MelisReactApiCronController`. Tutte sotto `/melis/react-api/crons`, contratto `{ success, data, error }`.

| Metodo e URL | Azione | Scopo |
| --- | --- | --- |
| `GET /crons` | `list` | Elenca le attività (keyset: `limit`, `search`, `active`, `type`, `sort`, `dir`, `after`) |
| `GET /crons/stats` | `stats` | KPI `{total, active, inactive}` |
| `GET /crons/:id` | `get` | Una singola attività |
| `POST /crons/save` | `save` | Crea / aggiorna un'attività (validata) — **solo admin** |
| `DELETE /crons/delete/:id` | `delete` | Elimina un'attività e il suo storico |
| `POST /crons/run/:id` | `run` | Esegue un'attività **ora** (sincrono) — **solo admin** |
| `GET /crons/history` | `history` | Storico delle esecuzioni (filtri `cronId`, `state`, `search`, `startDate`, `endDate`, `page`, `limit`) |
| `GET /crons/history/:id` | `historyDetail` | Una singola esecuzione + log completi |

Ogni azione chiama per prima cosa `denyUnlessAccess()` (autenticazione + `MelisCoreRights::canAccess('cron_tool')`). Le azioni di modifica aggiungono `denyUnlessAdmin()` (blocca gli utenti non `usr_admin`) e `denyUnlessCan(cap)`. Le letture e il CRUD dialogano con le due tabelle tramite SQL parametrizzato; `run` delega a `MelisCronService::runTaskNow($id)`.

### Capability

Dichiarate in `config/react.capabilities.php` sotto il nodo `cron_tool` — un elenco CRUD flat:

```php
'melisReactToolCapabilities' => [
    'cron_tool' => ['list', 'create', 'edit', 'delete', 'export', 'run'],
],
```

In React, `useCaps('cron_tool').can(cap)` regola l'interfaccia (nasconde **+ New task**, le azioni per riga, Export). Il modello è **default-allow** con **admin-bypass**; su questa base, creazione/modifica/esecuzione sono rigidamente limitate agli amministratori.

## Servizio chiave — `MelisCronService`

```php
$cron = $sm->get('MelisCronService');

$cron->getActiveTasks();
$cron->saveItem($data, $id);   // fires events
$cron->deleteItem($id);

// Job queue
$cron->addJob($cronId, $forceRun);       // inserts a 'pending' row in melis_cron_history
$cron->getPendingJobs();
$cron->updateProcessingJob($jobId);      // claims job: pending → processing
$cron->finishJob($jobId, $data);         // writes state/duration/logs/status
$cron->runTaskNow($id);                  // synchronous execution used by the React Run action

// Helpers
$cron->getDateLastRunByCron($cronId);
$cron->getWordingScheduleType($type, $optionsJson);
```

**Eventi emessi:** `cron_service_get_list_start`, `meliscron_service_get_list_end`, `meliscron_service_get_listhistory_end`, `meliscron_service_save_item_start`/`_end`, `meliscron_service_delete_item_start`/`_end`.

## Tabelle del database

| Tabella | Contenuto |
| --- | --- |
| `melis_cron` | Definizioni delle attività: `cron_id`, `cron_name`, `cron_active`, `cron_target`, `cron_type` (ENUM `CLI\|HTTP`), `cron_schedule_type` (ENUM `every\|hourly\|daily\|weekly\|monthly`), `cron_schedule_options` (JSON) |
| `melis_cron_history` | Record delle esecuzioni: `id`, `cron_id`, `state` (ENUM `pending\|processing\|success\|error`), `date_add`, `rerun`, `date_run`, `duration`, `logs`, `status` |

### Strutture JSON di `cron_schedule_options`

| `cron_schedule_type` | Struttura JSON |
| --- | --- |
| `every` | `{ "everyItem": "minutes\|hours\|days", "everyValue": N }` |
| `hourly` | `{ "hourlyValue": MM }` |
| `daily` | `{ "dailyHour": HH, "dailyMinute": MM }` |
| `weekly` | `{ "weeklyDays": [1..7], "atHour": HH, "atMinute": MM }` (giorno della settimana ISO, Lun=1) |
| `monthly` | `{ "monthlyDay": D, "atHour": HH, "atMinute": MM }` |

## Configurazione del runner

L'esecuzione pianificata è gestita da `MelisCron\Command\ExecCommand`, registrato con laminas-cli come **`melis:cronexec`**. Aggiungi una riga al crontab del server:

```cron
* * * * * cd /path/to/project && php vendor/bin/laminas melis:cronexec --env=production >/dev/null 2>&1
```

A ogni tick vengono eseguite due fasi:

1. **`scheduleTasks()`** — valuta la pianificazione di ogni attività attiva rispetto all'orario corrente; chiama `addJob()` per ogni attività scaduta.
2. **`runJobs()`** — prende in carico ogni job in attesa (`pending → processing`) e poi lo esegue all'interno di una **PHP Fiber** per la concorrenza:
   - **HTTP** — `curl` GET di `cron_target`; registra lo stato HTTP e il corpo della risposta.
   - **CLI** — `exec()` di `cron_target`; un codice di uscita diverso da zero imposta lo stato su `error`.

Un trigger HTTP di fallback è disponibile all'indirizzo `/melis/MelisCron/Cron/execute` per gli ambienti in cui non è disponibile un crontab CLI.

> La risoluzione della pianificazione è di un minuto (la cadenza del tick). Senza la riga del crontab, le attività sono definite ma si attivano solo quando vengono avviate manualmente tramite **Run now**.

Vedi anche: [MelisCore](/it/reference/modules/melis-core)
