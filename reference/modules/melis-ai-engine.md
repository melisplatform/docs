# MelisAIEngine

> The core AI engine — agents, instances, scenarios, models and the MCP/tool layer. Package
> `melisplatform/melis-ai-engine`.

## Purpose

MelisAIEngine is the provider-agnostic runtime that powers Melis AI. It defines the abstract
model contract (`MelisAIEngineModelService`) that provider modules (Claude, Gemini…) implement,
runs **agents** through their **scenario steps**, builds the payload from conversation context and
uploaded files, manages **tool/function** declarations (including MCP servers), tracks token usage,
and exposes the chat view helpers used in the backoffice. It is the engine layer; the
backoffice UI lives in the companion module `melis-ai`. See the [AI guide](/guide/ai) and the
[MCP guide](/guide/mcp).

## Enable it

A standard Laminas module. Add it to `config/melis.module.load.php`:

```php
'MelisAIEngine',
```

It is typically loaded alongside `MelisAIEngineClaude` / `MelisAIEngineGemini` (providers) and
`MelisAI` (backoffice). Composer dependencies: `melisplatform/melis-core` and
`melisplatform/melis-document-upload` (for document ingestion). At least one provider module must be
installed for real model calls.

## Key services

| Service alias | Role |
| --- | --- |
| `MelisAIEngineService` | Core data access for the engine: `getActiveInstance()`, `getActiveAgent()`, `getActiveModel()`, `getActiveModelClass()`, `getEntryParams()` / `getExitParams()`, `getDefaultModel()`, `getActiveAITools()`, `saveDailyUsage()`. |
| `MelisAIEngineModelService` | Abstract base contract for provider adapters. Concrete `send()`, `getAgentFunctions()`, token getters, document extraction (`extractTextFromDocx()`, `extractTextFromXlsx()`); abstract `setClient()`, `addToolsToPayload()`, `addContentToPayload()`, `sendCustomAI()`, `getAllowedMimetypes()`, `processFiles()`, `processContextFiles()`. |
| `MelisAIEngineFunctionService` | Built-in (non-MCP) tool/function implementations, e.g. `get_table_structure()`, `create_database_table()`, `add_database_table_fields()`, `activate_module()`, `save_file()`. |
| `MelisAIEngineMcpService` | MCP client: server management, tool discovery, schema handling, communication and circuit-breaker logic (composed from the `Service/Traits/Mcp/*` traits). Built via factory. |
| `MelisAIEngineFileService` | File lifecycle for AI uploads, e.g. `deleteAIDocUploads()`. |
| `MelisAIEngineGeneralService` | Event-aware helpers: `sendEvent()`, `makeArrayFromParameters()`, `getRenderMode()`. |
| `MelisAIEngineConversationStore` | Persists conversation state (`get()`, `set()`, `has()`, `delete()`) in `melis_ai_conversation_state`. Built via factory. |
| `MelisAIEngine\Service\MelisAIEngineAgentService` | Per-run agent orchestration (factory-built with an agent id + instance id): `runAgent()`, `continueConversation()`, `validateAnswer()`, `validateResult()`, session context/historic/answer accessors, `restartAgent()`, `clearSession()`. |

The `*Table` aliases (`MelisAIEngineAgentTable`, `MelisAIEngineInstanceTable`, `MelisAIEngineModelTable`,
`MelisAIEngineToolTable`, `MelisAIEngineAgentToolTable`, `MelisAIEngineScenarioStepTable`, …) expose the
underlying tables for the services above.

## Backoffice

The engine ships no tool-tree entry of its own (`app.tools.php` and `app.toolstree.php` are empty —
the UI is provided by `melis-ai`). It contributes:

- Controller `MelisAIEngine\Controller\AI` (`AIController`), routed under `MelisAIEngine`, with the
  AJAX actions that drive a chat session: `runAgentAction`, `validateAnswerAction`,
  `continueConversationAction`, `restartAgentAction`, `closeAgentAction`, plus the modal renderers
  `renderErrorModalAction` and `renderMessageModalAction`.
- Two interface modals declared in `app.interface.php`: melisKeys `melisaiengine_error_modal` and
  `melisaiengine_message_modal`.

## Front office

The chat experience is exposed as **view helpers** (not drag-drop templating plugins), usable in any
`.phtml`:

| View helper alias | Role |
| --- | --- |
| `AIChatViewHelper` | Renders a full chat box bound to an instance/agent. `__invoke($maiInstanceId, ?int $agentId = null, $extraEntryParams = [], $debugMode = false, $exitParamArr = [], $showCloseButton = true, $needExitParam = true, $showHideButton = false, $clearSession = true, $renderMode = 'melis')`. |
| `AIChatFormBoxViewHelper` | Renders the chat input/form box. `__invoke($agentId, $withLabel = true)`. |
| `AIChatHistoricViewHelper` | Renders the conversation history. `__invoke($debugMode = false)`. |
| `AIChatHistoricDebugViewHelper` | Renders the debug history view. |
| `AIUserInputViewHelper` | Builds a Laminas form element for a user-input step. `__invoke($fieldType, $label, $fieldName = 'user_input')`. |

The agent **scenario steps** are implemented as controller plugins, registered under
`controller_plugins` and named `MelisAIAgentStepType*Plugin` (e.g. `MelisAIAgentStepTypeAIChatPlugin`,
`MelisAIAgentStepTypeUserInputPlugin`, `MelisAIAgentStepTypeCodePhpPlugin`,
`MelisAIAgentStepTypeCodeBuiltInPlugin`, `MelisAIAgentStepTypeAIContextPlugin`,
`MelisAIAgentStepTypeEntryParamsPlugin`, `MelisAIAgentStepTypeExitParamsPlugin`,
`MelisAIAgentStepTypeCodeAICallPlugin`). Two extra plugins back the built-in code steps:
`MelisAIEngineBuiltInConnectedUser` and `MelisAIEngineBuiltInGetString`.

## Database tables

Created by `install/dbdeploy/` (the module sets `extra.dbdeploy: true`):

| Table | Holds |
| --- | --- |
| `melis_ai_companies` | AI providers/companies. |
| `melis_ai_models` | Provider models. |
| `melis_ai_agents` | Agents (incl. `maa_agent_tools`, file-context settings). |
| `melis_ai_instances` / `melis_ai_instance_trans` | Agent instances and their translations. |
| `melis_ai_scenario_steps` / `melis_ai_scenario_steps_datas` / `melis_ai_scenario_steps_datas_entryexit` | Scenario steps, their data, and entry/exit params. |
| `melis_ai_return_types` | Step return-type reference data. |
| `melis_ai_tools` / `melis_ai_agents_tools` | Tool catalogue and the agent↔tool assignment. |
| `melis_ai_platform_keys` | Per-platform API keys/credentials. |
| `melis_ai_daily_usage` | Token/usage accounting per agent. |
| `melis_ai_files` | Uploaded AI documents/context files. |
| `melis_ai_conversation_state` | Persisted multi-turn conversation state. |

(The `MelisAIEnginePlatformTable` alias reads the core `melis_core_platform` table.)

## Example

Drop a chat box for an existing AI instance into a backoffice view:

```php
// in a .phtml view
echo $this->AIChatViewHelper($maiInstanceId, $agentId);
```

Add a custom non-MCP function for agents to call by extending `MelisAIEngineFunctionService` and
declaring the function under `plugins -> melisaiengine -> datas -> function_declarations`, then assign
it to an agent via **Melis AI > AI Agents > [Agent] > AI Tools**. See
[Create a tool](/guide/create-a-tool) and the [MCP guide](/guide/mcp).

## Key files

| Concern | Path |
| --- | --- |
| Module config (services, routes, helpers, plugins) | `vendor/melisplatform/melis-ai-engine/config/module.config.php` |
| Interface modals | `vendor/melisplatform/melis-ai-engine/config/app.interface.php` |
| Provider contract | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineModelService.php` |
| Agent runtime | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineAgentService.php` |
| Built-in functions/tools | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineFunctionService.php` |
| MCP service + traits | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineMcpService.php`, `src/Service/Traits/Mcp/` |
| Chat controller | `vendor/melisplatform/melis-ai-engine/src/Controller/AIController.php` |
| View helpers | `vendor/melisplatform/melis-ai-engine/src/View/Helper/` |
| Step plugins | `vendor/melisplatform/melis-ai-engine/src/Controller/Plugin/` |
| DB deltas | `vendor/melisplatform/melis-ai-engine/install/dbdeploy/` |

See also: [Module reference](/reference/modules), [AI guide](/guide/ai), [MCP guide](/guide/mcp).
