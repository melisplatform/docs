# MelisAIEngine

> Il motore AI astratto — contratto del provider, runtime agente/scenario, archivio delle conversazioni, ponte MCP/tool e tutte le tabelle del database AI, oltre ai componenti React di chat condivisi che alimentano il back-office v6. Pacchetto `melisplatform/melis-ai-engine`.

## Scopo

MelisAIEngine è la chiave di volta della suite MelisAI. Definisce il contratto astratto del provider (`MelisAIEngineModelService`) implementato da Claude e Gemini, esegue gli agenti attraverso flussi di lavoro a più passaggi (scenario), gestisce il ponte MCP/tool-calling e possiede tutte le tabelle del database `melis_ai_*`. Non dispone di **alcun tool autonomo** proprio — è il motore di chat invisibile del back-office. In v6 (React) fornisce inoltre il componente React condiviso **`AiChatContainer`** e il backend di chat `/melis/react-api/ai-engine/*` che il modulo `MelisAI` monta nei propri tool visibili.

## Abilitazione

Aggiungi a `config/melis.module.load.php`:

```php
return [
    'MelisAIEngine',
];
```

Dipendenze Composer richieste: `melisplatform/melis-core` e `melisplatform/melis-document-upload`. Per le chiamate reali ai modelli deve essere installato almeno un modulo provider (`MelisAIEngineClaude` o `MelisAIEngineGemini`); senza un provider attivo per l'azienda del modello, la chat segnala *"The AI company module is not active."*

## Servizi principali

| Alias del servizio | Ruolo |
| --- | --- |
| `MelisAIEngineModelService` | Contratto astratto del provider. Estendi questa classe per aggiungere un nuovo provider AI (§ Contratto del provider). |
| `MelisAIEngineService` | Registro/factory: `getActiveInstance()`, `getActiveAgent()`, `getActiveModel()`, `getActiveModelClass()` (selezione del provider), `getActiveAITools()`, `saveDailyUsage()`. |
| `MelisAIEngineAgentService` | Runtime dello scenario: `runAgent($postValues, $files)` percorre i passaggi dell'agente e pilota `MelisAIEngineModelService::send()`. |
| `MelisAIEngineMcpService` | Ponte MCP/tool-calling: gestione dei server, comunicazione JSON-RPC, circuit breaker, `getAvailableTools()`, `isMcpTool()`, `invokeTool()`, `formatToolsForAI()`, `getToolSchema()`. |
| `MelisAIEngineConversationStore` | Stato persistente delle conversazioni multi-turno in `melis_ai_conversation_state`: `get()`, `has()`, `set()`, `delete()`. Garbage collection automatico dopo 48 ore. |
| `MelisAIEngineFunctionService` | Implementazioni dei tool integrati (non-MCP), ad es. `get_table_structure`, `create_database_table`. |
| `MelisAIEngineFileService` | Pulizia per retention dei documenti caricati dall'AI: `deleteAIDocUploads()`. |
| `MelisAIEngineGeneralService` | Base con gestione degli eventi: `sendEvent()`, `makeArrayFromParameters()`. |

## Contratto del provider

`MelisAIEngineModelService` (`src/Service/MelisAIEngineModelService.php`) è la classe astratta che ogni provider deve estendere. Costruttore: `(ServiceManager $serviceManager, int $modelId, int $agentId)`.

**Metodi astratti che un provider deve implementare:**

```php
abstract public function setClient();
abstract public function addToolsToPayload($payload);
abstract public function addContentToPayload($payload, $role, $prompt, $files=[], $content=[]);
abstract public function constructContent($role, $prompt, $files=[]);
abstract public function getMessageKey(): string;            // 'messages' (Claude) | 'contents' (Gemini)
abstract public function sendCustomAI(?array $payload = []): array;
abstract public function getAllowedMimetypes(): array;
abstract public function setPromptTokenCount($responseData);
abstract public function setResponseTokenCount($responseData);
abstract public function setTotalTokenCount($responseData);
abstract public function processFiles($filesArr): array;
abstract public function processContextFiles($filesArr): array;
```

Il ciclo di vita del metodo base `send(array $contextArr): array` è fisso: `addToolsToPayload()` → `addContentToPayload()` per ogni voce del contesto → `sendCustomAI()` → conteggio dei token → restituisce `['request','responseData','result','errors','needs_continuation','session_id','continuation_context','tool_results']`.

**Helper forniti dalla classe base:** `getModel()`, `getAgentFunctions()`, `getToolDeclarationByName()`, getter dei token, `uploadDocument()`, `extractTextFromDocx()`, `extractTextFromXlsx()`, `getMimeType()`.

## Selezione del provider

`MelisAIEngineService::getActiveModelClass($company, $modelId, $agentId)` seleziona il provider in base al nome dell'azienda del modello:

```php
if (strpos($company, 'Google') !== false) {
    // builds MelisAIEngineModelGeminiService — requires MelisAIEngineGemini module
} elseif (strpos($company, 'Anthropic') !== false) {
    // builds MelisAIEngineModelClaudeService — requires MelisAIEngineClaude module
}
```

Per aggiungere un nuovo provider (ad es. OpenAI): estendi `MelisAIEngineModelService`, implementa i metodi astratti, registralo come servizio e aggiungi qui un ramo basato sul nome dell'azienda. I provider Ollama e OCI seguono lo stesso contratto.

## Sistema MCP / tool-calling

I tool sono dichiarati in due punti: `config['plugins']['melisaiengine']['datas']['function_declarations']` (nome, descrizione, schema JSON, booleano `mcp`) e la tabella `melis_ai_tools`. Un agente sceglie di usare i tool tramite `maa_agent_tools`.

Al momento della chiamata: `getAgentFunctions()` restituisce le dichiarazioni consentite → `addToolsToPayload()` le inietta → in caso di chiamata a un tool il provider instrada tramite `MelisAIEngineMcpService::isMcpTool($name)`: i tool MCP vanno a `invokeTool()` (JSON-RPC su stdio, protetto da circuit breaker); i tool integrati vanno a `MelisAIEngineFunctionService`. I risultati vengono reimmessi e la conversazione prosegue finché il modello non segnala il completamento o non si raggiunge un limite di sicurezza.

I server MCP sono configurati sotto `config['mcp']['servers'][<name>]` = `{enabled, command, args, tools, timeout}`; `MelisAIEngineMcpService` li avvia tramite `proc_open` e comunica in JSON-RPC 2.0 (`tools/list`, invocazione dei tool).

## Tabelle del database

Tutte le tabelle `melis_ai_*` sono possedute da questo modulo (`dbdeploy: true`):

| Tabella | Contenuto |
| --- | --- |
| `melis_ai_models` | Modelli dei provider (azienda, `mam_generative_model`, collegamento alla chiave API). |
| `melis_ai_companies` | Aziende AI (Google, Anthropic…). |
| `melis_ai_platform_keys` | Chiavi API per piattaforma. |
| `melis_ai_agents` | Agenti (`maa_name`, collegamento al modello, JSON `maa_agent_tools`, interruttori dei file). |
| `melis_ai_agents_tools` | Assegnazione agente ↔ tool. |
| `melis_ai_tools` | Catalogo dei tool (`mat_name`, `mat_desc`, JSON `mat_config`). |
| `melis_ai_instances` / `melis_ai_instance_trans` | Distribuzioni denominate (istanze) e relative traduzioni. |
| `melis_ai_scenario_steps` / `…_datas` / `…_datas_entryexit` | Passaggi dello scenario, i loro dati e i parametri di ingresso/uscita. |
| `melis_ai_return_types` | Definizioni dei tipi di ritorno dei passaggi. |
| `melis_ai_files` | File allegati ai passaggi/contesto. |
| `melis_ai_daily_usage` | Conteggi di token e chiamate per modello/agente/istanza/giorno. |
| `melis_ai_conversation_state` | Stato persistente delle conversazioni (`macs_key`, JSON, GC automatico). |

## Componenti React di chat

MelisAIEngine non ha **alcun brick** né una voce di menu `/melis-react`. Per il back-office React espone una libreria di componenti **solo sorgente** sotto `ui-react/src/`, importata dai consumatori tramite l'alias Vite **`@melis-ai-engine`** (mappato a `melis-ai-engine/ui-react/src`). Rende l'intera superficie di chat; l'LLM effettivo è sempre fornito da un modulo provider.

| Export | Ruolo |
| --- | --- |
| `AiChatContainer` (default) | Componente orchestratore: esegue l'intero ciclo `init → run → (continue×N) → validate`, mantiene lo stato della chat, collega i sotto-componenti. **È questo da montare.** |
| `ChatHistory`, `TypingIndicator`, `StepInterface` | Elenco scorrevole dei messaggi (markdown tramite `window.marked` se presente), indicatore di elaborazione, schede di interfaccia per passaggio. |
| `ChatFormBox` | Barra di input inferiore: textarea, invia/valida, menu `+` → caricamento file (`user_file_upload[]`) o Media Library (`userMediaFiles[]`, MoxieManager), overlay drag-drop. |
| `ChatDebugPanel`, `DebugEntry` | Vista di debug: payload della richiesta (→) e risposta grezza del modello (←) come blocchi JSON (solo quando `debugMode`). |
| `MelisPlanPanel`, `extractMelisPlan`, `looksLikeMelisPlan` | Rende un "Melis plan" strutturato proposto dall'AI (ad es. un elenco di campi di form) come tabella. |
| `aiEngineInit/Run/Continue/Validate/Restart` | Client tipizzato per gli endpoint `ai-engine` (§ Backend di chat). |
| `parseResultActionString`, `dispatchResultAction`, `dispatchToolResults` | Dispatcher di navigazione a ciclo chiuso `JS_ACTION` (§ Navigazione a ciclo chiuso). |

**Contratto di montaggio — `AiChatContainerProps`:**

```tsx
type AiChatContainerProps = {
  maiInstanceId: string                        // required — e.g. "agenttool" or "newscontentcreator|42"
  agentId?: number | null                      // override the instance's default agent
  extraEntryParams?: Record<string, unknown>   // → extra_entry_param[key] context
  entryParamForm?: Record<string, string>      // → entry_param_form[key]
  debugMode?: boolean
  exitParamArr?: ExitParamArr
  showCloseButton?: boolean
  needExitParam?: boolean
  showHideButton?: boolean
  showHeader?: boolean
  clearSession?: boolean                        // clear the server session on init (fresh conversation)
  autoRun?: boolean                             // start the agent immediately after init
  initialMessage?: string                       // first user_chat when autoRun
  onClose?: () => void
  onHide?: () => void
  className?: string
  style?: React.CSSProperties
}
```

Il container limita la continuazione a `MAX_CONTINUATION_HOPS = 20`. Per aggiungere una chat AI a un tool React, importa `AiChatContainer` e montalo con un `maiInstanceId` — non è necessario alcun lavoro sul backend, gli endpoint esistono già. I consumatori incrementano una `key` sull'elemento montato per forzare una nuova sessione lato server al rilancio.

## Dove appare

Non vedi mai MelisAIEngine come voce di menu; la sua chat compare all'interno del modulo **MelisAI**, che monta l'identico `AiChatContainer` in tre punti (cambiano solo `maiInstanceId` / `agentId`):

- **AI Assistant** — l'overlay dell'assistente fluttuante (chat generica in grado di agire sul back-office, avviata con `autoRun`).
- **Chat Dev Tool** — uno spazio di prova per sviluppatori per avviare qualsiasi agente/istanza e dialogarci.
- **Scheda "Run" dell'agente** — test di un agente dal tool degli agenti MelisAI (`maiInstanceId="agenttool"`).

## Backend di chat — gli endpoint `ai-engine`

Le rotte sono dichiarate in `config/module.config.php` (non un `react-api.php`), con alias del controller `MelisAIEngine\Controller\React\MelisReactApiAiEngine` → `MelisReactApiAiEngineController`. Ogni azione è protetta da `denyUnlessAuthenticated()` (401 senza un'identità MelisCore — nessun controllo di capacità per tool, trattandosi di un motore condiviso). Envelope di risposta uniforme: `{ success, data, error? }`. Questi endpoint rispecchiano il legacy `AIController` (`/melis/MelisAIEngine/AI/*`) e chiamano lo stesso `MelisAIEngineAgentService`.

| Metodo e URL | Funzione client | Scopo |
| --- | --- | --- |
| `GET /melis/react-api/ai-engine/init` | `aiEngineInit` | Valida istanza→agente→modello→provider; restituisce `label`, `finalInstanceId`, `agentId`, `isFileUploadActivated`, `isMediaLibraryActivated`, `hasExitParameter` (oppure `errorType`/`errorMessage`). |
| `POST /melis/react-api/ai-engine/run` | `aiEngineRun` | Avvia/fa avanzare un turno. JSON per il testo, multipart/form-data quando sono allegati file → `runAgent()`. |
| `POST /melis/react-api/ai-engine/continue` | `aiEngineContinue` | Riprende un turno multi-hop (`needs_continuation=true`) → `continueConversation(sessionId, continuationContext)`. |
| `POST /melis/react-api/ai-engine/validate` | `aiEngineValidate` | Accetta la risposta dell'AI, avanza al passaggio dei parametri di uscita, restituisce `exitParams` per la callback host → `validateAnswer()`. |
| `POST /melis/react-api/ai-engine/restart` | `aiEngineRestart` | Cancella la sessione, restituisce lo stesso `finalInstanceId` pronto al riutilizzo. |

Il `RunResult` include `chatHist`, `needs_continuation`, `session_id`, `continuation_context`, `payload`/`response` (debug), `exitParams`, `tool_results`.

**Turno di testo minimo:**

```ts
import { aiEngineInit, aiEngineRun } from '@melis-ai-engine'

const cfg = await aiEngineInit({ maiInstanceId: 'agenttool', clearSession: true })
if (cfg.errorType) throw new Error(cfg.errorMessage)   // instance/agent/model/companyModule/exitParam

const res = await aiEngineRun({
  agentId:    cfg.agentId,
  instanceId: cfg.finalInstanceId,
  userText:   'Create a news article about our new store',
})
// res.chatHist, res.needs_continuation, res.session_id, res.tool_results …
```

## Navigazione a ciclo chiuso

Il motore si limita a **fare dispatch**: `nav-actions.ts` estrae le stringhe di callback `JS_ACTION::action::k=v&…` dai `tool_results` di una risposta e chiama `window.melisReactActionMap[action](args)`. La **shell host (melis-core)** *registra* quegli handler e possiede la navigazione React-Router e la percezione del DOM. Un handler può restituire un'osservazione `Promise<string>`, che `dispatchToolResults` attende e reimmette come `continuationContext.clientObservation` — fornendo il grounding per il turno successivo del modello. Ciò mantiene disaccoppiati i due bundle costruiti in modo indipendente: solo il contratto `window` li collega.

## Esempio (view helper legacy)

Il classico helper con rendering lato server continua a funzionare per contesti non-React (`.phtml`):

```php
// Render the chat box for a named instance
echo $this->AIChatViewHelper($maiInstanceId);
```

Registra un server MCP personalizzato e dichiara i suoi tool affinché un agente possa chiamarli:

```php
// In a module's config — register the MCP server
'mcp' => [
    'servers' => [
        'my-mcp-server' => [
            'enabled' => true,
            'command' => 'node',
            'args'    => ['/path/to/server.js'],
            'tools'   => ['my_tool'],
            'timeout' => 30,
        ],
    ],
],
// Declare the tool with mcp: true
'plugins' => [
    'melisaiengine' => [
        'datas' => [
            'function_declarations' => [
                [
                    'name'        => 'my_tool',
                    'description' => 'Does something useful',
                    'mcp'         => true,
                    // JSON schema for parameters…
                ],
            ],
        ],
    ],
],
```

## File principali

| Ambito | Percorso |
| --- | --- |
| Contratto del provider (astratto) | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineModelService.php` |
| Registro + selezione del provider | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineService.php` |
| Runtime agente/scenario | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineAgentService.php` |
| Ponte MCP/tool | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineMcpService.php` |
| Archivio persistente delle conversazioni | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineConversationStore.php` |
| Funzioni integrate | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineFunctionService.php` |
| Controller di chat legacy | `vendor/melisplatform/melis-ai-engine/src/Controller/AIController.php` |
| Backend di chat React | `vendor/melisplatform/melis-ai-engine/src/Controller/React/MelisReactApiAiEngineController.php` |
| Libreria React di chat condivisa | `vendor/melisplatform/melis-ai-engine/ui-react/src/` (`AiChatContainer.tsx`, `api.ts`, `nav-actions.ts`…) |
| Modelli delle tabelle del database | `vendor/melisplatform/melis-ai-engine/src/Model/Tables/` |
| Config del modulo | `vendor/melisplatform/melis-ai-engine/config/module.config.php` |

Vedi anche: [MelisAI](/it/reference/modules/melis-ai), [MelisAIEngineClaude](/it/reference/modules/melis-ai-engine-claude), [MelisAIEngineGemini](/it/reference/modules/melis-ai-engine-gemini), [MelisAIToolCreator](/it/reference/modules/melis-ai-tool-creator).
