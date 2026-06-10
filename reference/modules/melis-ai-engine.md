# MelisAIEngine

> The abstract AI engine — provider contract, agent/scenario runtime, conversation store, MCP/tool bridge, and all AI database tables. Package `melisplatform/melis-ai-engine`.

## Purpose

MelisAIEngine is the keystone of the MelisAI suite. It defines the abstract provider contract (`MelisAIEngineModelService`) that Claude and Gemini implement, runs agents through multi-step scenario workflows, manages the MCP/tool-calling bridge, and owns all `melis_ai_*` database tables. The backoffice UI lives in the companion module `MelisAI`; this module is the service and data layer only.

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisAIEngine',
];
```

Required Composer dependencies: `melisplatform/melis-core ^5.3` and `melisplatform/melis-document-upload ^5.3`. At least one provider module (`MelisAIEngineClaude` or `MelisAIEngineGemini`) must be installed for real model calls.

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

To add a new provider (e.g. OpenAI): extend `MelisAIEngineModelService`, implement the abstract methods, register as a service, and add a branch here keyed on the company name.

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

## Example

Render a chat box bound to an existing AI instance from any `.phtml` view:

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
| Chat controller | `vendor/melisplatform/melis-ai-engine/src/Controller/AIController.php` |
| Step type plugins | `vendor/melisplatform/melis-ai-engine/src/Controller/Plugin/` |
| Database table models | `vendor/melisplatform/melis-ai-engine/src/Model/Tables/` |
| Module config | `vendor/melisplatform/melis-ai-engine/config/module.config.php` |

See also: [MelisAI](/reference/modules/melis-ai), [MelisAIEngineClaude](/reference/modules/melis-ai-engine-claude), [MelisAIEngineGemini](/reference/modules/melis-ai-engine-gemini), [MelisAIToolCreator](/reference/modules/melis-ai-tool-creator).
