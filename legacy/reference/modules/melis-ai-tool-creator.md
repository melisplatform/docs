# MelisAIToolCreator

> AI-assisted back-office tool that builds and edits whole Melis modules through a chat agent.
> Package `melisplatform/melis-ai-tool-creator`.

## Purpose

`MelisAIToolCreator` adds an **AI Tool Creator** entry to the Melis AI back-office menu. It ships a
dedicated AI agent (*Tool Builder*) and an MCP server; the agent scaffolds complete Laminas modules
under `module/AIModules/` by calling code-generation tools over JSON-RPC. It is the reference
example of the MelisAI **app-extension pattern**: it registers the `aitoolcreator` instance, the
MCP server, and opens the engine's chat helper.

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisAIToolCreator',
];
```

Requires `melisplatform/melis-ai` `^5.3` (which pulls in `melis-ai-engine`). The module is
`dbdeploy`-enabled: on install its deltas insert the *Tool Builder* agent and the `aitoolcreator`
instance into the engine's `melis_ai_agents` / `melis_ai_instances` tables.

## Key services

| Service alias | Role |
| --- | --- |
| `MelisAIToolCreatorService` | `getToolConfig()`; fires `melisaitoolcreator_service_get_tool_config_start/_end`. The real work is performed by the AI agent + MCP server. |

## Backoffice

The tool is declared in `config/app.toolstree.php` (icon `fa-magic`) and routed by
`config/module.config.php` (`/MelisAIToolCreator/[:controller[/:action]]`). Controller
`MelisAIToolCreator\Controller\IndexController` exposes:

| Action | Role |
| --- | --- |
| `renderTool` / `renderToolHeader` / `renderToolContent` | Render the tool shell, header, and the launch panel (mode picker + module dropdown). |
| `launchAgentAction` | POST to `/melis/MelisAIToolCreator/Index/launchAgent`; opens the engine chat for the `aitoolcreator` instance via `AIChatViewHelper`. |

The module dropdown for `edit_existing` is populated by scanning `module/AIModules/` with
`glob(... GLOB_ONLYDIR)`.

### Launch modes

| Button (UI label) | `mode` | Behaviour |
| --- | --- | --- |
| New tool | `new` | Agent calls `createModule` first, then `updateFiles` the two language files using the SCAN RESULTS keys. |
| Continue my last session | `continue_session` | `clearSession=false` — resumes the previous conversation state for the `aitoolcreator` instance. |
| Edit existing tool | `edit_existing` | Pre-selects the chosen module; agent may only touch files inside that module path, must `readFile` before `updateFiles`, and must not call `createModule`. |

## The Tool Builder agent & MCP server

`config/mcp.tools.php` declares the MCP server:

```php
$config['mcp']['servers']['tool_creator'] = [
    'enabled'        => true,
    'module'         => 'melis-ai-tool-creator',
    'args'           => '.../mcp/toolcreator/bin/server.php',
    'timeout'        => 600,
    'retry_attempts' => 1,
];
```

The long timeout (600 s) reflects that module generation can take minutes.

Tools are registered in
`config['plugins']['melisaiengine']['datas']['function_declarations']` with `mcp: true`; the engine
routes calls to this server. They appear under the **module-builder** group in the agent's AI Tools
allow-list.

### Module-builder tools (MCP server `tool_creator`)

| Tool | Purpose |
| --- | --- |
| `createModule` | Scaffold a full Laminas module under `module/AIModules/`. Inputs: `moduleName`, `functionality`, `needDBTable`, `databaseTableStructure{tableName, fields[{name,type,primary}]}`. Returns **SCAN RESULTS** (generated config + view keys). |
| `updateFiles` | Write or modify files inside the module (the agent's main editing tool). |
| `activateModule` | Enable the module and clear caches. After activation the agent instructs the user to reload. |
| `deactivateModule` | Disable the module and clear caches. |
| `generateBundle` | Rebuild CSS/JS bundles after editing `public/`. |

The agent also has access to the engine's shared **filesystem** tools (`createFile`,
`createDirectory`, `pathExists`, `readFile`, `deleteFile`, `deleteDirectory`) and **DB-schema**
tools (`getTableStructure`, `createDatabaseTable`, `addDBTableColumns`, …) — see
[MelisAI §A5.3](/legacy/reference/modules/melis-ai).

::: warning Safety note
The file-writing tools are constrained to `module/AIModules/` and the agent prompts forbid touching
paths outside the chosen module. Generated modules are real PHP that gets activated — **review them
before production**, and treat `activateModule` as a privileged action. The agent narrates one short
sentence before each tool call, making the build auditable in the chat transcript.
:::

## Database tables

This module owns **no `melis_*` tables**. Its dbdeploy deltas write into the engine's
`melis_ai_instances` and `melis_ai_agents` tables. Tables for modules the agent generates are
created at runtime by the `createDatabaseTable` tool.

## Key files

| Concern | Path |
| --- | --- |
| Controller | `vendor/melisplatform/melis-ai-tool-creator/src/Controller/IndexController.php` |
| Service | `vendor/melisplatform/melis-ai-tool-creator/src/Service/MelisAIToolCreatorService.php` |
| MCP registration | `vendor/melisplatform/melis-ai-tool-creator/config/mcp.tools.php` |
| MCP server entry point | `vendor/melisplatform/melis-ai-tool-creator/mcp/toolcreator/bin/server.php` |
| Tool tree / assets | `vendor/melisplatform/melis-ai-tool-creator/config/app.toolstree.php`, `config/app.interface.php` |
| Route config | `vendor/melisplatform/melis-ai-tool-creator/config/module.config.php` |

## See also

- [MelisAI](/legacy/reference/modules/melis-ai) — manage instances, agents, tools, models and keys.
- [MelisAIEngine](/legacy/reference/modules/melis-ai-engine) — the contract, shared tables, MCP/tool bridge.
- [MelisAIEngineClaude](/legacy/reference/modules/melis-ai-engine-claude) · [MelisAIEngineGemini](/legacy/reference/modules/melis-ai-engine-gemini) — provider implementations.
- [MelisAICommunityExtensions](/legacy/reference/modules/melis-ai-community-extensions) — another app-extension example.
