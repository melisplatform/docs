# MelisAIEngineClaude

> Provider Anthropic Claude per il motore Melis AI — un motore di backend privo di una propria UI React. Pacchetto `melisplatform/melis-ai-engine-claude`.

## Scopo

`MelisAIEngineClaude` è il provider Anthropic Claude concreto per la suite MelisAI. Estende il contratto `MelisAIEngineModelService` del motore e fornisce la configurazione del client HTTP specifica per Claude, la struttura del payload dell'API Messages di Anthropic, la gestione dei file, la mappatura degli strumenti/funzioni e l'analisi delle risposte. Il modulo è stateless — non possiede tabelle di database; tutto lo stato di runtime risiede nelle tabelle del motore stesso.

Il motore seleziona automaticamente questo provider in fase di runtime quando la company del modello attivo contiene `Anthropic` (e questo modulo è installato).

## Ruolo nel back-office React

Questo modulo **non ha alcuno strumento back-office React né una propria UI**: nessun brick `ui-react/`, nessun `config/react-api.php`, nessuna capability e nessun controller. Non compare mai come strumento, nodo di menu o voce della sidebar in `/melis-react`. È puro impianto tecnico — il percorso di codice che consente a Melis di dialogare con Claude.

Il suo unico effetto visibile nel back-office React è **transitivo, attraverso [MelisAI](/it/reference/modules/melis-ai)**:

- I suoi script `install/dbdeploy/*.sql` inseriscono la company **`Anthropic`** e diversi **modelli Claude** nel catalogo modelli del motore.
- Tali modelli compaiono quindi come opzioni nell'amministrazione di MelisAI (Platform AI / impostazioni dei modelli), sotto la company **Anthropic**.
- Per utilizzarne uno si memorizza la propria **chiave API Anthropic** sulla riga di quel modello (`mapk_*`), quindi si punta un'**istanza / agente** sul modello Claude.
- Da quel momento in poi ogni chat su quell'agente — incluso l'**Assistente AI** React — viene instradata attraverso questo provider.

> Questo modulo non si apre mai. In `/melis-react` non è altro che una riga in un menu a tendina dei modelli esposto da MelisAI, oltre al motore dietro le chat AI che lo utilizzano. Se le chat con Claude falliscono, la causa è di solito una **chiave API** mancante sulla riga del modello o un modello **inattivo** — entrambi configurati in MelisAI, non qui.

## Abilitarlo

Aggiungere a `config/melis.module.load.php` dopo il motore AI:

```php
return [
    'MelisAIEngine',
    'MelisAIEngineClaude',
];
```

Dipendenza: `melisplatform/melis-ai-engine` `^6.0`. La chiave API Anthropic viene memorizzata per singolo modello nel back-office Melis AI (la riga della chiave `mapk_*` del modello) — non in un file di configurazione né in una variabile d'ambiente.

## Servizi principali

| Alias del servizio | Ruolo |
| --- | --- |
| `MelisAIEngineModelClaudeService` | Il provider Claude. Estende `MelisAIEngineModelService` e implementa il contratto dell'API Messages di Anthropic. Costruito dal service manager con le opzioni di factory `['modelId' => …, 'agentId' => …]`. |

Metodi degni di nota su `MelisAIEngineModelClaudeService`:

| Metodo | Ruolo |
| --- | --- |
| `setClient()` | Costruisce un `Laminas\Http\Client` che effettua POST verso l'URL Messages di Claude configurato. Imposta gli header `Content-Type/Accept: application/json`, `x-api-key` (dalla chiave API del modello), `anthropic-version: 2023-06-01` e un header `anthropic-beta` che abilita le beta di prompt-caching e web-fetch. Utilizza un timeout lungo per gestire i cicli di tool-use. |
| `getMessageKey()` | Restituisce `'messages'`. |
| `addToolsToPayload()` | Legge le funzioni dell'agente tramite `getAgentFunctions()`, rimuove le chiavi interne del motore (`mcp`, `type`, `server`, `module`, `max_silence`, `operation_timeout`) tramite `sanitizeToolForClaudeAPI()`, aggiunge gli strumenti nella struttura Anthropic (`name`, `description`, `input_schema`), aggiunge lo strumento integrato `web_fetch` ed elimina i duplicati per nome. |
| `constructContent()` / `addContentToPayload()` | Mappa il ruolo `model` su `assistant`; costruisce i blocchi di contenuto Anthropic (`{type:text}`, `{type:image, source:{url\|base64,…}}`, `{type:document, source:{…, media_type:application/pdf}}`); li aggiunge a `payload['messages']`. |
| `sendCustomAI()` | Inietta `model` (`mam_generative_model`) e `max_tokens`; effettua POST del JSON con ritentativi in caso di errori 5xx; analizza `content[]` in blocchi di testo e `tool_use`; invoca ogni strumento (MCP tramite `MelisAIEngineMcpService::invokeTool`, altrimenti integrato); aggiunge i risultati come `{type:tool_result, tool_use_id, content}` in un messaggio `user`; itera fino a `stop_reason === 'end_turn'` o al raggiungimento di un limite di sicurezza dei salti. Abilita il prompt caching. |
| `processFiles()` / `processContextFiles()` | Converte gli upload in base al `mam_file_upload_mode` del modello (predefinito: `embed`): DOCX/XLSX → testo estratto, immagini/PDF → base64, oppure tramite `uploadDocument()` quando l'upload interno è abilitato. |
| `setPromptTokenCount()` / `setResponseTokenCount()` / `setTotalTokenCount()` | Leggono i campi di `responseData['usage']` (`input_tokens`, `output_tokens`, più i contatori di cache-read/creation); totale = input + output. |
| `getAllowedMimetypes()` | Restituisce i tipi MIME di upload consentiti dal blocco di configurazione di Claude. |
| `continueConversation()` | Ricostruisce la cronologia dei messaggi dallo stato salvato e richiama `sendCustomAI()` per la continuazione del tool-use multi-salto. |

## Chiamata di strumenti / funzioni

Gli strumenti del motore utilizzano già la struttura `input_schema` di Anthropic, quindi `addToolsToPayload()` si limita principalmente a sanificarli e inoltrarli. Una chiamata a uno strumento da parte del modello arriva come `{type:'tool_use', name, id, input}`; il servizio estrae `name` / `input` / `id`, instrada tramite `MelisAIEngineMcpService::isMcpTool()` (MCP `invokeTool` vs. funzione integrata) e restituisce il risultato come `{type:'tool_result', tool_use_id:<id>, content:<json>}` all'interno di un messaggio `user`, quindi prosegue il ciclo. Il campo `id` correla chiamata↔risultato come richiesto dall'API Anthropic.

## Configurazione

Le impostazioni del provider risiedono sotto:

```
config['plugins']['melisaiengine']['datas']['AI']['Claude']
```

| Chiave | Scopo |
| --- | --- |
| `api_url` | L'URL dell'endpoint dell'API Messages di Anthropic (`https://api.anthropic.com/v1/messages`). |
| `allowed_mimetypes` | Tipi MIME accettati per gli upload di file. |

Un blocco affine `['AI']['Anthropic']` dichiara le modalità di upload dei file (`embed`) e il supporto all'upload interno. La chiave API **non** viene letta dalla configurazione o dall'ambiente — proviene esclusivamente dalla riga della chiave del modello nel DB (`mapk_*`), inserita da un amministratore nell'amministrazione di MelisAI.

## Modelli preinstallati

Installati tramite `install/dbdeploy/*.sql` sotto la company `Anthropic`; il flag `mam_status` decide quali vengono offerti:

| `mam_generative_model` | Modello |
| --- | --- |
| `claude-opus-4-8` | Claude Opus 4.8 |
| `claude-sonnet-4-6` | Claude Sonnet 4.6 |
| `claude-haiku-4-5-20251001` | Claude Haiku 4.5 |
| `claude-sonnet-4-5-20250929` | Claude Sonnet 4.5 |
| `claude-sonnet-4-20250514` | Claude Sonnet 4 |
| `claude-opus-4-1-20250805` | Claude Opus 4.1 |

## Tabelle di database

Questo modulo non possiede tabelle. Tutto lo stato di conversazione e di utilizzo è memorizzato nelle tabelle del motore (`melis_ai_conversation_state`, `melis_ai_daily_usage`).

## File principali

| Ambito | Percorso |
| --- | --- |
| Servizio provider | `vendor/melisplatform/melis-ai-engine-claude/src/Service/MelisAIEngineModelClaudeService.php` |
| Factory del servizio | `vendor/melisplatform/melis-ai-engine-claude/src/Service/Factory/MelisAIEngineModelClaudeServiceFactory.php` |
| Blocco di configurazione | `vendor/melisplatform/melis-ai-engine-claude/config/app.interface.php` |

## Vedi anche

- [MelisAIEngine](/it/reference/modules/melis-ai-engine) — il motore astratto, le tabelle condivise e il bridge MCP; contiene il routing che seleziona questo provider in base al nome della company.
- [MelisAIEngineGemini](/it/reference/modules/melis-ai-engine-gemini) — il provider Google Gemini.
- [MelisAI](/it/reference/modules/melis-ai) — back-office React per la gestione di istanze, agenti, strumenti, modelli e chiavi API; l'unica UI in cui Claude compare.
- [Riferimento dei moduli](/it/reference/modules) — la mappa completa dei moduli.
