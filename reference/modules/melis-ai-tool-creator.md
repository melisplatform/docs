# MelisAIToolCreator

> AI-assisted back-office tool that creates and edits Melis modules through a chat agent.
> Package `melisplatform/melis-ai-tool-creator`.

## Purpose

`MelisAIToolCreator` adds an **AI Tool Creator** entry to the Melis back-office tools tree. From a
chat panel it drives an AI agent (the *Tool Builder*) that scaffolds a complete Laminas module —
config, controller, model, views, language files, form fields, even a database table — and then
activates it. It is the AI counterpart of [`melis-tool-creator`](/reference/modules); the GUI
generator stays available for hand-driven scaffolding (see [Create a tool](/guide/create-a-tool)).
The agent talks to the platform through a dedicated MCP server, so this module is part of the wider
AI stack — see [AI](/guide/ai) and [MCP](/guide/mcp).

## Enable it

Standard Laminas module. Add it to `config/melis.module.load.php`:

```php
'MelisAIToolCreator',
```

Requires PHP `^8.1 | ^8.3` and `melisplatform/melis-ai` `^5.3` (which pulls in
[`melis-ai-engine`](/reference/modules)). The module is `dbdeploy`-enabled: its install deltas
insert the *Tool Builder* AI agent (`mai_instance_id = aitoolcreator`) and register the agent's
tool list. It ships no site, only a back-office tool.

## Key services

| Service alias | Role |
| --- | --- |
| `MelisAIToolCreatorService` | Thin event-firing service (`getToolConfig()`); the real work is done by the AI agent + MCP server, not by this PHP service. |

## Backoffice

The tool is declared in `config/app.interface.php` under the AI tools section
(`melisai_tool_section`) and routed by `config/module.config.php`. Controller
`MelisAIToolCreator\Controller\IndexController`:

| melisKey | Action | Role |
| --- | --- | --- |
| `melisaitoolcreator_tool` | `render-tool` | Tool shell. |
| `melisai_toolcreator_header` | `render-tool-header` | Header zone. |
| `melisai_toolcreator_content` | `render-tool-content` | Launch panel: mode picker + the list of editable modules read from `module/AIModules`. |
| — | `launch-agent` | POST endpoint that boots the AI chat (`AIChatViewHelper`) for the chosen mode. |

The launch panel offers three modes (see `launchAgentAction`):

- **`new`** — create a module/tool from scratch.
- **`continue_session`** — resume the previous chat session (session is not cleared).
- **`edit_existing`** — load a module from `module/AIModules` and constrain the agent to edit only
  inside that module's path.

The chat is started against the AI instance `aitoolcreator` via
`/melis/MelisAIToolCreator/Index/launchAgent`.

## The Tool Builder agent & MCP server

The agent (DB instance `aitoolcreator`, agent name *Tool Builder*) is granted a tool list by the
install delta `26051502_update_agent_tools.sql`. Those tools split in two groups:

- **Module generation (MCP server `tool_creator`)** — `config/mcp.tools.php` registers a stdio MCP
  server (`mcp/toolcreator/bin/server.php`) exposing **`createModule`**, **`activateModule`**,
  **`deactivateModule`** (implemented in `ToolCreatorOperations`). `createModule` scaffolds the
  module (optionally a multi-locale, `_texts`-table variant); `activateModule` adds it to the load
  list and clears caches, gated by a personalization check so unedited stubs are rejected.
- **DB / file helpers (provided by the AI engine)** — `getTableStructure`, `createDatabaseTable`,
  `addDBTableColumns`, `selectData`, `insertData`, `updateData`, `deleteData`, `readFile`,
  `createFile`, `createDirectory`, `pathExists`, `updateFiles`, … used by the agent to inspect data
  and write files.

Generated modules are written under `module/AIModules/<ModuleName>/`.

You can run the MCP server standalone for inspection:

```bash
npx @modelcontextprotocol/inspector \
  php vendor/melisplatform/melis-ai-tool-creator/mcp/toolcreator/bin/server.php
```

## Database tables

This module adds **no `melis_*` table of its own**. Its `dbdeploy` deltas write into
`melis-ai-engine` tables — chiefly `melis_ai_agents` (the *Tool Builder* row and its
`maa_agent_tools` list). Tables for modules the agent generates are created at runtime by the
`createDatabaseTable` tool, not shipped here.

## Key files

| Concern | Path |
| --- | --- |
| Module bootstrap | `vendor/melisplatform/melis-ai-tool-creator/src/Module.php` |
| Controller | `vendor/melisplatform/melis-ai-tool-creator/src/Controller/IndexController.php` |
| Service | `vendor/melisplatform/melis-ai-tool-creator/src/Service/MelisAIToolCreatorService.php` |
| Back-office tool tree / interface | `vendor/melisplatform/melis-ai-tool-creator/config/app.interface.php`, `config/app.toolstree.php`, `config/app.tools.php` |
| MCP registration | `vendor/melisplatform/melis-ai-tool-creator/config/mcp.tools.php` |
| MCP server + operations | `vendor/melisplatform/melis-ai-tool-creator/mcp/toolcreator/bin/server.php`, `mcp/toolcreator/src/ToolCreatorOperations.php` |
| Agent install deltas | `vendor/melisplatform/melis-ai-tool-creator/install/dbdeploy/26051501_insert_tool_builder_agent.sql`, `26051502_update_agent_tools.sql` |
| Views | `vendor/melisplatform/melis-ai-tool-creator/view/melis-ai-tool-creator/index/` |

## See also

- [Create a tool](/guide/create-a-tool) — the GUI tool generator.
- [AI](/guide/ai) and [MCP](/guide/mcp) — the AI engine and MCP integration.
- [Module reference](/reference/modules) — full module map.
