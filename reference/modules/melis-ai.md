# MelisAI

> The AI module surfaced in the Melis backoffice — agents, instances, models, tools and an MCP
> inspector. Package `melisplatform/melis-ai`.

## Purpose

MelisAI is the **backoffice UI and management layer** for Melis Platform's AI features. It does not
run the models itself: it provides the tools to configure AI **models** and platform keys, set up
**instances** (where agents are used across the platform), build **agents** with their **scenarios**
(steps) and **AI tools**, track token/query **usage**, and inspect **MCP** servers. The actual AI
execution is delegated to [`melis-ai-engine`](/reference/modules). See the [AI guide](/guide/ai) and
the [MCP guide](/guide/mcp).

## Enable it

MelisAI is a standard Laminas module. Add it to `config/melis.module.load.php` (the skeleton already
lists it):

```php
'MelisAIEngine',
'MelisAIEngineClaude',
'MelisAIEngineGemini',
'MelisAI',
```

It requires `melisplatform/melis-ai-engine` (`^5.3`) and PHP `^8.1|^8.3`; the engine owns the
database tables and table gateways that this module consumes. Provider modules (Claude / Gemini)
supply the models. To use the MCP-based agents (Tool Creator, Minitemplate Creator…), set
`melis_platform`, `melis_project_root`, `melis_php_binary`, `melis_http_host` and
`melis_request_scheme` in `config/autoload/platforms.[env].php` (see the module README).

## Key services

Registered as `service_manager` aliases in `config/module.config.php`. They extend
`MelisGeneralService` and read/write through the engine's table gateways (e.g.
`MelisAIEngineAgentTable`, `MelisAIEngineInstanceTable`).

| Service alias | Role |
| --- | --- |
| `MelisAIAgentService` | CRUD on AI agents — `getItemById()`, `getList()`, `saveItem()`, `deleteItem()`. |
| `MelisAIInstanceService` | Lists instances and checks uniqueness — `getList()`, `isInstanceExisting()`. |
| `MelisAIModelService` | Saves AI model definitions — `saveItem()`. |
| `MelisAIPlatformKeysService` | Stores platform/provider API keys — `saveItem($data, $keys)`. |
| `MelisAIScenarioStepService` | Agent scenario steps — `saveItem()`, `deleteItem()`, `getScenario()`, `isCodeExisting()`. |
| `MelisAIScenarioStepDataService` | Per-step data (entry/exit params) — `saveItem()`, `deleteItem()`. |
| `MelisAIScenarioStepFileService` | Step file attachments — `saveItem()`, `getFileByToken()`. |
| `MelisAIToolService` | AI tools available to agents — `getList()`, `isAiToolExisting()`. |
| `MelisAIUsageService` | Usage stats — `getTotalTokens()`, `getTotalQueries()` (by model, duration, per-instance). |

```php
// From any controller / service
$agentSrv = $this->getServiceManager()->get('MelisAIAgentService');
$agent    = $agentSrv->getItemById($agentId);
```

## Backoffice

MelisAI is a backoffice tool tree (the **Melis AI** left-menu section, `melisai_toolstree_section`).
Its tools and tabs are declared in `config/app.toolstree.php` under the `melisai` interface; their
content comes from `config/app.tools.php` and `config/app.agent.tools.php`.

| Tool (melisKey) | Controller / action |
| --- | --- |
| Admin (`melisadmin_tool`) | `MelisAI\Controller\Admin` → `render-tool` |
| ↳ Usage (`melisai_usage`) | `Admin` → `render-tool-usage` |
| ↳ Platform AI (`melisai_platform_ai`) — configure models & default model | `Admin` → `render-platform-ai` |
| ↳ Instances (`melisai_instances`) | `Admin` → `render-instances` |
| ↳ Chat Dev Tool (`melisai_chat_dev_tool`) — inspect AI request payloads | `Admin` → `render-chat-dev-tool` |
| AI Agents (`melisagent_tool`) | `MelisAI\Controller\Agent` → `render-tool` |
| ↳ Agent properties (Scenario / Config / AI Tools tabs) | `MelisAI\Controller\AgentProperties` |
| MCP Inspector (`melis_mcp_inspector_tool`) | `MelisAI\Controller\McpInspector` → `render-tool` |
| Instance modal | `MelisAI\Controller\Instance` |
| AI tool modal | `MelisAI\Controller\Tool` |

The left menu itself is rendered by `MelisAI\Controller\AIMenu` (`left-menu`) and the tree by
`MelisAI\Controller\AITreeTools` (`render-tree-tools`). Backoffice listeners
(`SavePropertiesListener`, `SaveAgentPropertiesListener`, `DeleteListener`,
`MelisAIFlashMessengerListener`) are attached in `src/Module.php` to persist forms and flash
messages. Form factories under `src/Form/Factory/` build the model/agent/tool dropdowns.

A **header chat assistant** is injected into the backoffice header via the `meliscore` interface
(`meliscore_header_ai_main_chat_assistant`), served by `MelisAI\Controller\GeneralChat`
(`headerMainChatAssistant`).

## Front office

MelisAI is a backoffice module and ships **no front-office templating plugins**. It does expose two
backoffice view helpers (`config/module.config.php`):

| Helper | Role |
| --- | --- |
| `melisAIIcon` | Renders MelisAI icons (`src/View/Helper/MelisAIIconHelper.php`). |
| `CustomFormViewHelper` | Renders the dynamic AI custom form (`src/View/Helper/MelisAICustomFormViewHelper.php`). |

A public route `melis-backoffice/melisaifile` (`MelisAI\Controller\File` → `view`) serves AI step
files by token; it is in `excluded_routes` so no login is required for that view.

## Database tables

MelisAI has no SQL of its own — the schema is installed and versioned by `melis-ai-engine`
(`vendor/melisplatform/melis-ai-engine/install/dbdeploy/`). The tables it reads/writes through the
engine's gateways are:

| Table | Holds |
| --- | --- |
| `melis_ai_agents` | AI agents. |
| `melis_ai_instances`, `melis_ai_instance_trans` | Instances and their translations. |
| `melis_ai_models` | AI model definitions. |
| `melis_ai_platform_keys` | Provider/platform API keys. |
| `melis_ai_scenario_steps` | Agent scenario steps. |
| `melis_ai_scenario_steps_datas`, `melis_ai_scenario_steps_datas_entryexit` | Step data and entry/exit params. |
| `melis_ai_files` | Step file attachments. |
| `melis_ai_daily_usage` | Token/query usage counters. |
| `melis_ai_conversation_state` | Conversation state. |

## MCP servers

The module bundles two standalone MCP servers used by MCP-enabled agents and surfaced through the
**MCP Inspector** tool:

| Path | Package | Role |
| --- | --- | --- |
| `mcp/dbmcp/` | `melisplatform/dbmanager-mcp` | Database manager MCP server. |
| `mcp/filemcp/` | `melisplatform/filemanager-mcp` | File manager MCP server. |

`composer.json` advertises `supports-mcp` and `allow-mcp-discovery`. See [MCP](/guide/mcp).

## Key files

| Concern | Path |
| --- | --- |
| Module + listener wiring | `vendor/melisplatform/melis-ai/src/Module.php` |
| Service aliases, controllers, view helpers, routes | `vendor/melisplatform/melis-ai/config/module.config.php` |
| Tool tree (menu, tabs, modals) | `vendor/melisplatform/melis-ai/config/app.toolstree.php` |
| Admin / instance / tool tables & forms | `vendor/melisplatform/melis-ai/config/app.tools.php` |
| Agent tool tables | `vendor/melisplatform/melis-ai/config/app.agent.tools.php` |
| Backoffice assets, header chat plugin | `vendor/melisplatform/melis-ai/config/app.interface.php` |
| Services | `vendor/melisplatform/melis-ai/src/Service/` |
| Controllers | `vendor/melisplatform/melis-ai/src/Controller/` |
| Listeners | `vendor/melisplatform/melis-ai/src/Listener/` |
| Bundled MCP servers | `vendor/melisplatform/melis-ai/mcp/dbmcp/`, `vendor/melisplatform/melis-ai/mcp/filemcp/` |

::: tip Related
The AI engine and providers are documented in the [Module reference](/reference/modules); workflows
are in the [AI guide](/guide/ai) and [MCP guide](/guide/mcp).
:::
