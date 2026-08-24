# MelisAIEngine

> The abstract AI engine — provider contract, agent/scenario runtime, conversation store, MCP/tool bridge, all AI database tables, and the shared React chat components that power the v6 back-office. Package `melisplatform/melis-ai-engine`.

## Purpose

MelisAIEngine is the keystone of the MelisAI suite. It defines the abstract provider contract (`MelisAIEngineModelService`) that Claude and Gemini implement, runs agents through multi-step scenario workflows, manages the MCP/tool-calling bridge, and owns all `melis_ai_*` database tables. It has **no standalone tool** of its own — it is the invisible chat engine of the back-office. In v6 (React) it also ships the shared **`AiChatContainer`** React component and the `/melis/react-api/ai-engine/*` chat backend that the `MelisAI` module mounts into its visible tools.

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisAIEngine',
];
```

Required Composer dependencies: `melisplatform/melis-core` and `melisplatform/melis-document-upload`. At least one provider module (`MelisAIEngineClaude` or `MelisAIEngineGemini`) must be installed for real model calls; without an active provider for the model's company the chat reports *"The AI company module is not active."*

## Key services

| Service alias | Role |
| --- | --- |
| `MelisAIEngineModelService` | Abstract provider contract. Subclass this to add a new AI provider (§ Provider contract). |
| `MelisAIEngineService` | Registry/factory: `getActiveInstance()`, `getActiveAgent()`, `getActiveModel()`, `getActiveModelClass()` (provider selection), `getActiveAITools()`, `saveDailyUsage()`. |
| `MelisAIEngineAgentService` | Scenario runtime: `runAgent($postValues, $files)` walks the agent's steps and drives `MelisAIEngineModelService::send()`. |
| `MelisAIEngineMcpService` | MCP/tool-calling bridge: server management, JSON-RPC communication, circuit breaker, `getAvailableTools()`, `isMcpTool()`, `invokeTool()`, `formatToolsForAI()`, `getToolSchema()`. |
| `MelisAIEngineConversationStore` | Persistent multi-turn conversation state in `melis_ai_conversation_state`: `get()`, `has()`, `set()`, `delete()`. Auto-GC after 48 hours. |
| `MelisAIEngineFunctionService` | Built-in (non-MCP) tool implementations, e.g. `get_table_structure`, `create_database_table`. |
| `MelisAIEngineFileService` | Retention cleanup of AI-uploaded documents: `deleteAIDocUploads()`. |
| `MelisAIEngineGeneralService` | Event-aware base: `sendEvent()`, `makeArrayFromParameters()`. |

## Provider contract

`MelisAIEngineModelService` (`src/Service/MelisAIEngineModelService.php`) is the abstract class every provider must extend. Constructor: `(ServiceManager $serviceManager, int $modelId, int $agentId)`.

**Abstract methods a provider must implement:**

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

The base `send(array $contextArr): array` lifecycle is fixed: `addToolsToPayload()` → `addContentToPayload()` per context entry → `sendCustomAI()` → token counts → returns `['request','responseData','result','errors','needs_continuation','session_id','continuation_context','tool_results']`.

**Helpers provided by the base class:** `getModel()`, `getAgentFunctions()`, `getToolDeclarationByName()`, token getters, `uploadDocument()`, `extractTextFromDocx()`, `extractTextFromXlsx()`, `getMimeType()`.

## Provider selection

`MelisAIEngineService::getActiveModelClass($company, $modelId, $agentId)` picks the provider by the model's company name:

```php
if (strpos($company, 'Google') !== false) {
    // builds MelisAIEngineModelGeminiService — requires MelisAIEngineGemini module
} elseif (strpos($company, 'Anthropic') !== false) {
    // builds MelisAIEngineModelClaudeService — requires MelisAIEngineClaude module
}
```

To add a new provider (e.g. OpenAI): extend `MelisAIEngineModelService`, implement the abstract methods, register as a service, and add a branch here keyed on the company name. Ollama and OCI providers follow the same contract.

## MCP / tool-calling system

Tools are declared in two places: `config['plugins']['melisaiengine']['datas']['function_declarations']` (name, description, JSON schema, `mcp` boolean) and the `melis_ai_tools` table. An agent opts into tools via `maa_agent_tools`.

At call time: `getAgentFunctions()` returns allowed declarations → `addToolsToPayload()` injects them → on a tool call the provider routes via `MelisAIEngineMcpService::isMcpTool($name)`: MCP tools go to `invokeTool()` (JSON-RPC over stdio, circuit-breaker guarded); built-in tools go to `MelisAIEngineFunctionService`. Results are fed back and the conversation continues until the model signals completion or a safety cap.

MCP servers are configured under `config['mcp']['servers'][<name>]` = `{enabled, command, args, tools, timeout}`; `MelisAIEngineMcpService` launches them via `proc_open` and speaks JSON-RPC 2.0 (`tools/list`, tool invocation).

## Database tables

All `melis_ai_*` tables are owned by this module (`dbdeploy: true`):

| Table | Holds |
| --- | --- |
| `melis_ai_models` | Provider models (company, `mam_generative_model`, API key link). |
| `melis_ai_companies` | AI companies (Google, Anthropic…). |
| `melis_ai_platform_keys` | API keys per platform. |
| `melis_ai_agents` | Agents (`maa_name`, model link, `maa_agent_tools` JSON, file toggles). |
| `melis_ai_agents_tools` | Agent ↔ tool assignment. |
| `melis_ai_tools` | Tool catalogue (`mat_name`, `mat_desc`, `mat_config` JSON). |
| `melis_ai_instances` / `melis_ai_instance_trans` | Named deployments (instances) and translations. |
| `melis_ai_scenario_steps` / `…_datas` / `…_datas_entryexit` | Scenario steps, their data, and entry/exit params. |
| `melis_ai_return_types` | Step return-type definitions. |
| `melis_ai_files` | Files attached to steps/context. |
| `melis_ai_daily_usage` | Per model/agent/instance/day token and call counts. |
| `melis_ai_conversation_state` | Persistent conversation state (`macs_key`, JSON, auto-GC). |

## React chat components

MelisAIEngine has **no brick** and no `/melis-react` menu entry. For the React back-office it exposes a **source-only** component library under `ui-react/src/`, imported by consumers through the Vite alias **`@melis-ai-engine`** (mapped to `melis-ai-engine/ui-react/src`). It renders the entire chat surface; the actual LLM is always supplied by a provider module.

| Export | Role |
| --- | --- |
| `AiChatContainer` (default) | Orchestrator component: runs the whole `init → run → (continue×N) → validate` loop, holds chat state, wires the sub-components. **Mount this.** |
| `ChatHistory`, `TypingIndicator`, `StepInterface` | Scrolling message list (markdown via `window.marked` when present), thinking indicator, per-step interface cards. |
| `ChatFormBox` | Bottom input bar: textarea, send/validate, `+` menu → file upload (`user_file_upload[]`) or Media Library (`userMediaFiles[]`, MoxieManager), drag-drop overlay. |
| `ChatDebugPanel`, `DebugEntry` | Debug view: request payload (→) and raw model response (←) as JSON blocks (only when `debugMode`). |
| `MelisPlanPanel`, `extractMelisPlan`, `looksLikeMelisPlan` | Renders an AI-proposed structured "Melis plan" (e.g. a form-field list) as a table. |
| `aiEngineInit/Run/Continue/Validate/Restart` | Typed client for the `ai-engine` endpoints (§ Chat backend). |
| `parseResultActionString`, `dispatchResultAction`, `dispatchToolResults` | Closed-loop `JS_ACTION` navigation dispatcher (§ Closed-loop navigation). |

**Mount contract — `AiChatContainerProps`:**

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

The container caps continuation at `MAX_CONTINUATION_HOPS = 20`. To add an AI chat to a React tool, import `AiChatContainer` and mount it with a `maiInstanceId` — no backend work needed, the endpoints already exist. Consumers bump a `key` on the mounted element to force a fresh server session on relaunch.

## Where it appears

You never see MelisAIEngine as a menu item; its chat surfaces inside the **MelisAI** module, which mounts the identical `AiChatContainer` in three places (only `maiInstanceId` / `agentId` differ):

- **AI Assistant** — the floating assistant overlay (general-purpose chat that can act on the back-office, launched with `autoRun`).
- **Chat Dev Tool** — a developer playground to launch any agent/instance and talk to it.
- **Agent "Run" tab** — testing an agent from the MelisAI agents tool (`maiInstanceId="agenttool"`).

## Chat backend — the `ai-engine` endpoints

Routes are declared in `config/module.config.php` (not a `react-api.php`), controller alias `MelisAIEngine\Controller\React\MelisReactApiAiEngine` → `MelisReactApiAiEngineController`. Every action guards with `denyUnlessAuthenticated()` (401 without a MelisCore identity — no per-tool capability gate, since this is a shared engine). Uniform response envelope: `{ success, data, error? }`. These endpoints mirror the legacy `AIController` (`/melis/MelisAIEngine/AI/*`) and call the same `MelisAIEngineAgentService`.

| Method & URL | Client fn | Purpose |
| --- | --- | --- |
| `GET /melis/react-api/ai-engine/init` | `aiEngineInit` | Validate instance→agent→model→provider; return `label`, `finalInstanceId`, `agentId`, `isFileUploadActivated`, `isMediaLibraryActivated`, `hasExitParameter` (or `errorType`/`errorMessage`). |
| `POST /melis/react-api/ai-engine/run` | `aiEngineRun` | Start/advance a turn. JSON for text, multipart/form-data when files are attached → `runAgent()`. |
| `POST /melis/react-api/ai-engine/continue` | `aiEngineContinue` | Resume a multi-hop turn (`needs_continuation=true`) → `continueConversation(sessionId, continuationContext)`. |
| `POST /melis/react-api/ai-engine/validate` | `aiEngineValidate` | Accept the AI's answer, advance to the exit-param step, return `exitParams` for the host callback → `validateAnswer()`. |
| `POST /melis/react-api/ai-engine/restart` | `aiEngineRestart` | Clear the session, return the same `finalInstanceId` ready for reuse. |

The `RunResult` includes `chatHist`, `needs_continuation`, `session_id`, `continuation_context`, `payload`/`response` (debug), `exitParams`, `tool_results`.

**Minimal text turn:**

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

## Closed-loop navigation

The engine only **dispatches**: `nav-actions.ts` parses `JS_ACTION::action::k=v&…` callback strings out of a response's `tool_results` and calls `window.melisReactActionMap[action](args)`. The **host shell (melis-core)** *registers* those handlers and owns React-Router navigation/DOM perception. A handler may return a `Promise<string>` observation, which `dispatchToolResults` awaits and feeds back as `continuationContext.clientObservation` — grounding the next model turn. This keeps the two independently-built bundles decoupled: only the `window` contract couples them.

## Example (legacy view helper)

The classic server-rendered helper still works for non-React (`.phtml`) contexts:

```php
// Render the chat box for a named instance
echo $this->AIChatViewHelper($maiInstanceId);
```

Register a custom MCP server and declare its tools so an agent can call them:

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

## Key files

| Concern | Path |
| --- | --- |
| Provider contract (abstract) | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineModelService.php` |
| Registry + provider selection | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineService.php` |
| Agent/scenario runtime | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineAgentService.php` |
| MCP/tool bridge | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineMcpService.php` |
| Persistent conversation store | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineConversationStore.php` |
| Built-in functions | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineFunctionService.php` |
| Legacy chat controller | `vendor/melisplatform/melis-ai-engine/src/Controller/AIController.php` |
| React chat backend | `vendor/melisplatform/melis-ai-engine/src/Controller/React/MelisReactApiAiEngineController.php` |
| Shared React chat library | `vendor/melisplatform/melis-ai-engine/ui-react/src/` (`AiChatContainer.tsx`, `api.ts`, `nav-actions.ts`…) |
| Database table models | `vendor/melisplatform/melis-ai-engine/src/Model/Tables/` |
| Module config | `vendor/melisplatform/melis-ai-engine/config/module.config.php` |

See also: [MelisAI](/reference/modules/melis-ai), [MelisAIEngineClaude](/reference/modules/melis-ai-engine-claude), [MelisAIEngineGemini](/reference/modules/melis-ai-engine-gemini), [MelisAIToolCreator](/reference/modules/melis-ai-tool-creator).
