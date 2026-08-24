# MelisAI

> Back-office UI for the MelisAI suite — connect providers, build agents, deploy instances, track usage and inspect MCP servers. Package `melisplatform/melis-ai`.

## Purpose

MelisAI is the **back-office management layer** of the MelisAI suite. It does not run AI models itself — that is the role of `melis-ai-engine` and the provider modules. It provides the UI and services to wire up the whole AI system: connect a provider (**Platform AI**), build behaviours (**AI Agents** with scenarios and tool allow-lists), deploy them as named **Instances**, monitor **Usage**, debug with a raw-payload chat (**Chat Dev Tool**), and inspect connected **MCP servers**.

## Enable it

Add to `config/melis.module.load.php` (provider modules must be listed before `MelisAI`):

```php
return [
    'MelisAIEngine',
    'MelisAIEngineClaude',   // Anthropic provider
    'MelisAIEngineGemini',   // Google provider
    'MelisAI',
];
```

`MelisAI` requires `melisplatform/melis-ai-engine`, which owns all `melis_ai_*` database tables and the agent/scenario runtime. Provider modules (`melis-ai-engine-claude`, `melis-ai-engine-gemini`) implement the provider contract and must be installed for their respective companies.

## The four core nouns

| Noun | Table | Key column | Description |
| --- | --- | --- | --- |
| **model** | `melis_ai_models` (`mam_*`) | `mam_generative_model` | A provider model row: company (Anthropic / Google), model string, API-key link, default flag, file-upload settings. |
| **agent** | `melis_ai_agents` (`maa_*`) | `maa_agent_tools` (JSON allow-list) | A behaviour: name, agent code, optional model override, ordered scenario steps, allow-list of tools. |
| **instance** | `melis_ai_instances` (`mai_*`) | `mai_instance_id` | A named deployment of an agent. The `mai_instance_id` string is the stable key every UI references (e.g. `mainchatassistantgeneral`, `aitoolcreator`). |
| **tool** | `melis_ai_tools` (`mat_*`) | — | A callable function the model may invoke. Either **MCP** (external MCP server, `mcp: true`) or **Local** (built-in PHP). |

**One-sentence mental model:** an instance points at an agent, an agent points at a model, a model names a company — that picks the provider; a chat on the instance runs the agent's scenario, calling the agent's allowed tools.

## Key services

Services fire `MelisAI_<entity>_service_<method>_start/_end` events. Controllers also fire `melisai_save_instance_end`, `melisai_delete_instance_end`, and `melisai_save_ai_tool_end` (with `typeCode` values `AI_INSTANCE_ADD|EDIT|DELETE`, `AI_TOOL_ADD|EDIT`) for logging.

| Service | Methods / role |
| --- | --- |
| `MelisAIAgentService` | `getItemById()`, `getList()`, `saveItem()`, `deleteItem()` — CRUD on agents. |
| `MelisAIInstanceService` | `getList()`, `isInstanceExisting()` — instance listing and uniqueness check. |
| `MelisAIToolService` | `getList()`, `isAiToolExisting()` — tool catalogue. |
| `MelisAIModelService` | Model definitions. |
| `MelisAIPlatformKeysService` | API key storage. |
| `MelisAIScenarioStepService` | Scenario step management. |
| `MelisAIUsageService` | Token/query usage stats. |

## Backoffice

The **Melis AI** section in the left menu installs four entries:

| BO entry | What it does |
| --- | --- |
| **Admin → Usage** | Dashboard over `melis_ai_daily_usage`. Filter by Company/Model and time range; four charts: Total Queries, Queries per instance, Total Tokens, Tokens per instance. |
| **Admin → Platform AI** | Connect a provider: pick Company + Model, choose Common key or per-platform keys, paste API key(s), set Active + Default model. Also controls File Upload Management (user / context upload toggles, max size, *File Api* vs *Embed in request* mode). |
| **Admin → Instances** | Manage named deployments. Six ship out of the box: three system (`admintool`, `agenttool`, `mainchatassistantgeneral`) and three app (`aitoolcreator`, `minitemplatecreator`, `newscontentcreator`). Each instance has a `mai_instance_id`, a label, a linked agent, and a status. |
| **Admin → Chat Dev Tool** | Developer debugging chat. Shows the exact **raw AI PAYLOAD** and **raw AI RESPONSE** (JSON) side-by-side — the full `contents`/`parts`, system context, tools sent, and the `candidates`/`usageMetadata` returned. |
| **AI Agents** | List and edit agent behaviours. Editing an agent exposes four tabs: **Scenario**, **Run**, **Config**, **AI Tools**. |
| **MCP Inspector** | Lists connected MCP servers and the tools they advertise (via `tools/list`), backed by the engine's `MelisAIEngineMcpService`. |

### Agent tabs

| Tab | Purpose |
| --- | --- |
| **Scenario** | Ordered steps: `ENTRY_PARAMS` → `AI_CONTEXT` (system prompt) → `AI_CHAT` → `EXIT_PARAMS`. Steps reference each other with `[CODE]`. |
| **Config** | Agent name, agent code (stable slug), description, model override (Company + Model), file-upload toggles, Active switch. |
| **AI Tools** | Tick the tools this agent may call. Tools are grouped **MCP Tools** (served by MCP servers) and **Local Tools** (built-in PHP). |
| **Run** | In-place live chat against the agent for iterating on scenario/tools without leaving the editor. |

### Shipped tool catalogue

| Group | Tools |
| --- | --- |
| **MCP — DB schema/data** | `getTableStructure`, `createDatabaseTable`, `addDBTableColumns`, `updateDBTableColumns`, `dropDBTableColumns`, `selectData`, `insertData`, `updateData`, `deleteData`, `bulkInsertData` |
| **MCP — filesystem** | `createFile`, `createDirectory`, `pathExists`, `readFile`, `updateFiles`, `deleteFile`, `deleteDirectory` |
| **MCP — site/mini-template** (from CommunityExtensions) | `readSiteAssets`, `getSitePublicUrl`, `uploadMinitemplateImages`, `renderMinitemplatePreview` |
| **MCP — module builder** (from ToolCreator) | `createModule`, `activateModule`, `deactivateModule`, `generateBundle` |
| **Local** | `activate_module` |

## Chat flow (what happens on send)

1. A view renders **`AIChatViewHelper(<mai_instance_id>, …)`** — provided by `melis-ai-engine` — which posts user turns to the engine.
2. The engine's `AIController::runAgentAction` → `MelisAIEngineAgentService::runAgent()` resolves **instance → agent → model**, then picks the provider via `MelisAIEngineService::getActiveModelClass($company, $modelId, $agentId)` (company `Google` → Gemini, `Anthropic` → Claude).
3. The engine walks the agent's **scenario steps** in order; `MelisAIEngineModelService::send()` calls the AI API; tool calls are routed via `MelisAIEngineMcpService` (JSON-RPC for MCP tools, direct PHP call for Local tools).
4. State persists to `melis_ai_conversation_state`; token/call counts to `melis_ai_daily_usage`.

**MelisAI never calls the AI APIs itself — the engine and provider modules do.**

## AIChatViewHelper — embedding a chatbox

The entire chatbox is one view helper from `melis-ai-engine`. Signature:

```php
$this->AIChatViewHelper(
    string  $maiInstanceId,           // the instance's mai_instance_id (e.g. "newscontentcreator")
    ?int    $agentId        = null,   // null → use the instance's linked agent
    ?array  $extraEntryParams = [],   // silent seed: ['custom_text'=>…, 'custom_files'=>[…], 'custom_data'=>…]
    ?bool   $debugMode      = false,  // true → show raw payload/response logs
    ?array  $exitParamArr   = [],     // override the agent's exit params
    ?bool   $showCloseButton = true,
    ?bool   $needExitParam  = true,   // true → require an exit target + show Validate button
    bool    $showHideButton = false,
    ?bool   $clearSession   = true,   // false → resume the previous session
    string  $renderMode     = 'melis' // 'melis' (back office) | 'front' (front office)
)
```

Minimal usage:

```php
<?= $this->AIChatViewHelper('mainchatassistantgeneral') ?>
```

**Per-object sessions.** Append `"|".$objectId` to the instance id so each object (article, product…) gets its own conversation:

```php
<?= $this->AIChatViewHelper('newscontentcreator|' . $newsId, null, $extraEntryParam, false, $exitParamArr) ?>
```

### ENTRY PARAMS — seeding the agent silently

Pass `extraEntryParams` to start the agent without user input:

| Key | Meaning |
| --- | --- |
| `custom_text` | Instruction prepended to the prompt. |
| `custom_files` | Array of absolute file paths or public URLs passed as real model inputs. |
| `custom_data` | Opaque string threaded through the scenario (e.g. an id) without appearing in the prompt. |

### EXIT PARAMS — routing the answer back

`EXIT_PARAMS` resolves where the AI's final answer goes. Pass `exitParamArr` to override per field:

| Field | Meaning |
| --- | --- |
| `masse_exit_input_1` / `masse_exit_input_2` | Id(s) of host input field(s) the answer should fill. |
| `masse_exit_js_callback` | JS function called with the answer (most flexible). |
| `masse_exit_url_route_callback` | Route to POST the result to (server-side handling). |

## Example

```php
// NewsController — compute entry seed + exit routing, pass to view
$exitParamArr = [
    'masse_exit_input_1'     => $paragraphField,
    'masse_exit_js_callback' => "setParagraphContent($paragraphField)",
];
$extraEntryParam = [
    'custom_files' => $resolvedAbsolutePaths,  // article images as real model inputs
    'custom_text'  => 'Generate content for paragraph N of the news',
];
$view->maiInstanceId    = 'newscontentcreator|' . $newsId;
$view->extraEntryParam  = $extraEntryParam;
$view->exitParamArr     = $exitParamArr;
```

```php
<!-- render-ai-chat.phtml -->
<?= $this->AIChatViewHelper($this->maiInstanceId, null, $this->extraEntryParam, false, $this->exitParamArr) ?>
```

The engine fires `masse_exit_js_callback` when the user accepts, dropping the generated text straight into the target field.

## Extension pattern (how app modules plug in)

1. **dbdeploy** inserts an **agent** (with its scenario + tool allow-list) and an **instance** with a fixed `mai_instance_id`.
2. Register an **MCP server** under `config['mcp']['servers']` and declare its tools in `function_declarations` with `mcp: true`.
3. Add a UI entry that opens `AIChatViewHelper(<mai_instance_id>, …)` with the right entry/exit params.

## Controllers

BO route: `…/MelisAI/[:controller[/:action]]`

| Controller | Key actions |
| --- | --- |
| `Admin` | `render-tool`, `render-tool-usage`, `render-platform-ai`, `render-instances`, `render-chat-dev-tool`, `getChart()` |
| `Agent` + `AgentProperties` | `render-tool-scenario`, `render-run-scenario`, `render-config`, `render-ai-tools`, `saveProperties` |
| `Instance` | `saveInstance`, `deleteInstance`, `getList`, `render-instance-modal` |
| `Tool` | `saveAiTool`, `render-ai-tool-modal` |
| `GeneralChat` | `displayMainChatAssistant`, `headerMainChatAssistant` |
| `McpInspector` | MCP server + tool listing |
| `AIMenu` / `AITreeTools` | Left-menu and tree renderers |

## Database tables

MelisAI owns no schema of its own — all tables are installed by `melis-ai-engine`. The tables prefix is `melis_ai_*` (not `melis_ai_engine_*`).

| Table | Holds |
| --- | --- |
| `melis_ai_models` (`mam_*`) | Provider model rows (company, model string, API-key link, file-upload settings). |
| `melis_ai_companies` (`macp_*`) | Company definitions (Google, Anthropic, …). |
| `melis_ai_platform_keys` (`mapk_*`) | Provider API keys. |
| `melis_ai_agents` (`maa_*`) | Agent definitions (code, model override, `maa_agent_tools` JSON allow-list). |
| `melis_ai_agents_tools` (`maat_*`) | Agent-to-tool join. |
| `melis_ai_tools` (`mat_*`) | Tool catalogue (MCP / Local). |
| `melis_ai_instances` (`mai_*`) | Named deployments (stable `mai_instance_id`). |
| `melis_ai_instance_trans` (`mait_*`) | Per-language instance labels. |
| `melis_ai_scenario_steps` (`mas_*`) | Ordered scenario steps per agent. |
| `melis_ai_scenario_steps_datas` (`massd_*`) | Step data (context text, form path, …). |
| `melis_ai_scenario_steps_datas_entryexit` (`masse_*`) | Entry/exit param definitions per step. |
| `melis_ai_return_types` (`mart_*`) | Exit return type definitions. |
| `melis_ai_files` (`maf_*`) | Files attached to scenario steps. |
| `melis_ai_daily_usage` (`mau_*`) | Token and query usage counters. |
| `melis_ai_conversation_state` (`macs_*`) | Per-user conversation state. |

See also: [melis-ai-engine](/legacy/reference/modules/melis-ai-engine) · [melis-ai-engine-claude](/legacy/reference/modules/melis-ai-engine-claude) · [melis-ai-engine-gemini](/legacy/reference/modules/melis-ai-engine-gemini) · [melis-ai-tool-creator](/legacy/reference/modules/melis-ai-tool-creator) · [melis-ai-community-extensions](/legacy/reference/modules/melis-ai-community-extensions)
