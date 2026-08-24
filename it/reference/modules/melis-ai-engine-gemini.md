# MelisAIEngineGemini

> Provider Google Gemini per il motore Melis AI — un motore di backend privo di un proprio back-office. Pacchetto `melisplatform/melis-ai-engine-gemini`.

## Scopo

`MelisAIEngineGemini` è l'implementazione concreta per Google Gemini del contratto
`MelisAIEngineModelService` di `MelisAIEngine`. Fornisce la configurazione del client HTTP
specifica per Gemini, la struttura del payload `generateContent` (lo schema `contents` / `parts`),
la mappatura delle chiamate a tool/funzioni, la gestione dei file tramite la File API o l'embed
inline e l'analisi dell'utilizzo dei token. Il modulo è stateless (non ha tabelle proprie) e non
fornisce **alcuna UI** — tutte le schermate AI sono fornite da `melis-ai` / `melis-ai-engine`.

## Nessun back-office React

Questo modulo **non ha alcun tool React** e non è pensato per averne uno — è uno strato provider
di backend, non una schermata. Non fornisce alcun brick `ui-react/`, nessun `config/react-api.php`,
nessun `config/react.capabilities.php`, nessun controller e non mostra **alcuna voce nella sidebar
o nodo di menu** in `/melis-react`. Non ci sono screenshot.

Nel back-office React Gemini emerge solo **indirettamente**, come motore/modello selezionabile
all'interno dell'amministrazione di **MelisAI** (Platform AI / Instances / Models & keys). Quando
un amministratore crea un modello la cui azienda è **Google** e questo modulo è installato,
`MelisAIEngine` instrada la chat e gli agenti di quel modello attraverso il motore Gemini qui
implementato — senza alcuna pagina Gemini dedicata.

## Come abilitarlo

Aggiungi a `config/melis.module.load.php`:

```php
return [
    'MelisAIEngineGemini',
];
```

Richiede `melisplatform/melis-ai-engine` `^6.0`. Il motore seleziona automaticamente questo
provider in fase di esecuzione quando il nome dell'azienda del modello attivo contiene **`Google`**
e questo modulo è installato; costruisce `MelisAIEngineModelGeminiService` tramite
`$serviceManager->build(MelisAIEngineModelGeminiService::class, ['modelId' => …, 'agentId' => …])`.

## Servizi chiave

| Alias del servizio | Ruolo |
| --- | --- |
| `MelisAIEngineModelGeminiService` | Il provider Gemini — sottoclasse di `MelisAIEngineModelService`, costruito per ogni richiesta con `modelId` + `agentId` (tramite `MelisAIEngineModelGeminiServiceFactory`). |

Metodi rilevanti di `MelisAIEngineModelGeminiService`:

| Metodo | Implementazione Gemini |
| --- | --- |
| `setClient()` | Costruisce un `Laminas\Http\Client` che esegue una POST su `{api_url}/models/{mam_generative_model}:generateContent`. La chiave API viene inviata nell'header di richiesta **`x-goog-api-key`** (mantenuta fuori dall'URL). Timeout lungo. |
| `getMessageKey()` | Restituisce `'contents'`. |
| `addToolsToPayload()` | Recupera i tool tramite `getAgentFunctions()`, sanifica ciascuno, rinomina `input_schema` → `parameters` e li racchiude come `tools:[{functionDeclarations:[…]}]` con `toolConfig.functionCallingConfig.mode='AUTO'`. In assenza di funzioni, ricade su un tool `url_context`. |
| `constructContent()` / `addContentToPayload()` | Mappa il ruolo `assistant` → `model`; costruisce array `parts` contenenti `{text}`, `{fileData:{fileUri,mimeType}}` (File API) o `{inlineData:{mimeType,data}}` (base64). |
| `sendCustomAI()` | Esegue la POST del payload JSON (con retry su 5xx / 429); analizza `candidates[].content.parts[]` per il testo e le voci `functionCall`; smista ogni chiamata di tool (MCP o integrato); accoda i risultati come `{functionResponse:{name,response:{result}}}` e itera finché non ci sono più chiamate di tool, un `finishReason` o un limite di sicurezza. |
| `processFiles()` / `processContextFiles()` | Gestisce i caricamenti di file in base a `mam_file_upload_mode` (vedi [Modalità di caricamento dei file](#modalita-di-caricamento-dei-file)); memorizza inoltre una copia tramite `uploadDocument()` per la visualizzazione nella sessione. |
| `setPromptTokenCount()` / `setResponseTokenCount()` / `setTotalTokenCount()` | Leggono `usageMetadata.promptTokenCount`, `candidatesTokenCount`, `totalTokenCount`. |
| `getAllowedMimetypes()` | Restituisce i tipi MIME consentiti dal blocco di configurazione Gemini. |

## Modalità di caricamento dei file

Il parametro `mam_file_upload_mode` del modello controlla come i file raggiungono Gemini:

- **`fileapi`** (predefinita) — carica sulla **File API** di Gemini tramite una POST multipart,
  quindi effettua il polling finché lo stato del file non è `ACTIVE`, e fa riferimento al
  `fileApiUri` restituito.
- **`embed`** — invia i byte del file inline come base64 (`inlineData`), con estrazione del testo
  per i formati supportati.

## Configurazione

La configurazione fissa del provider risiede sotto `config['plugins']['melisaiengine']['datas']['AI']['Gemini']`
(in `config/app.interface.php`, senza UI):

| Chiave | Scopo |
| --- | --- |
| `api_url` | URL di base per le richieste `generateContent` (`https://generativelanguage.googleapis.com/v1beta`). |
| `upload_url` | Endpoint di caricamento della File API di Gemini (`https://generativelanguage.googleapis.com/upload/v1beta/files`). |
| `allowed_mimetypes` | Tipi MIME accettati (restituiti da `getAllowedMimetypes()`). |

I valori per singolo modello provengono dalla **riga del modello** configurata in MelisAI, non da
questo modulo:

- **`mam_generative_model`** — l'id del modello Gemini (ad es. `gemini-…`), usato nell'URL della
  richiesta.
- **`mapk_keys`** — la **chiave API di Google**, inviata nell'header `x-goog-api-key`. Proviene dal
  record della chiave di piattaforma del modello, non è memorizzata nei file di configurazione e
  **non ha alcun fallback su variabile d'ambiente**.
- **`mam_file_upload_mode`** (`fileapi` predefinita, oppure `embed`) e `mam_internal_upload` —
  regolano il modo in cui i file vengono caricati.

::: tip Chiave API nell'header
A differenza delle versioni precedenti che aggiungevano la chiave come parametro di query `?key=…`,
il codice sorgente attuale invia la chiave API di Google nell'header di richiesta
**`x-goog-api-key`**, mantenendola fuori dagli URL e dai log dei proxy.
:::

## Mappatura delle chiamate a tool/funzioni

Gemini usa `parameters` dove il contratto del motore usa `input_schema`; `addToolsToPayload()`
esegue questa rinomina prima dell'invio. Le chiamate di tool arrivano come
`{functionCall:{name,args}}` **senza id** (posizionali, a differenza del `tool_use_id` di Claude).
Il servizio effettua l'instradamento in base a `name` tramite
`MelisAIEngineMcpService::isMcpTool()` e restituisce
`{functionResponse:{name,response:{result:…}}}`.

## Differenze rispetto al provider Claude

| Aspetto | Gemini | Claude |
| --- | --- | --- |
| Chiave dei messaggi | `contents` | `messages` |
| Etichetta del ruolo assistant | `model` | `assistant` |
| Chiave dello schema dei tool | `parameters` | `input_schema` |
| Id della chiamata di tool | nessuno (posizionale) | `tool_use_id` |
| Metodo di autenticazione | header `x-goog-api-key` | header `x-api-key` |
| Modalità file predefinita | `fileapi` | `embed` |

## File chiave

| Ambito | Percorso |
| --- | --- |
| Servizio provider | `vendor/melisplatform/melis-ai-engine-gemini/src/Service/MelisAIEngineModelGeminiService.php` |
| Factory del servizio | `vendor/melisplatform/melis-ai-engine-gemini/src/Service/Factory/MelisAIEngineModelGeminiServiceFactory.php` |
| Configurazione fissa | `vendor/melisplatform/melis-ai-engine-gemini/config/app.interface.php` |

## Vedi anche

- [MelisAIEngine](/it/reference/modules/melis-ai-engine) — il contratto astratto e il runtime condiviso.
- [MelisAIEngineClaude](/it/reference/modules/melis-ai-engine-claude) — il provider Anthropic.
- [MelisAI](/it/reference/modules/melis-ai) — back-office per agenti, istanze e modelli.
