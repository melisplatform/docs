# MelisAIEngineClaude

> Anthropic Claude provider for the Melis AI engine — a backend engine with no React UI of its own. Package `melisplatform/melis-ai-engine-claude`.

## Purpose

`MelisAIEngineClaude` is the concrete Anthropic Claude provider for the MelisAI suite. It extends the engine's `MelisAIEngineModelService` contract and supplies Claude-specific HTTP client setup, the Anthropic Messages API payload shape, file handling, tool/function mapping and response parsing. The module is stateless — it owns no database tables; all runtime state lives in the engine's own tables.

The engine selects this provider automatically at runtime when the active model's company contains `Anthropic` (and this module is installed).

## Role in the React back-office

This module has **no React back-office tool and no UI of its own**: no `ui-react/` brick, no `config/react-api.php`, no capabilities and no controller. It never appears as a tool, menu node or sidebar entry in `/melis-react`. It is pure plumbing — the code path that lets Melis talk to Claude.

Its only visible effect in the React back-office is **transitive, through [MelisAI](/reference/modules/melis-ai)**:

- Its `install/dbdeploy/*.sql` scripts seed the company **`Anthropic`** and several **Claude models** into the engine's model catalog.
- Those models then appear as choices in the MelisAI admin (Platform AI / model settings), under the **Anthropic** company.
- To use one you store your **Anthropic API key** on that model row (`mapk_*`), then point an **instance / agent** at the Claude model.
- From then on every chat on that agent — including the React **AI Assistant** — routes through this provider.

> You never open this module. In `/melis-react` it is only ever a line in a model dropdown surfaced by MelisAI, plus the engine behind AI chats that use it. If Claude chats fail, the cause is usually a missing **API key** on the model row or an **inactive** model — both configured in MelisAI, not here.

## Enable it

Add to `config/melis.module.load.php` after the AI engine:

```php
return [
    'MelisAIEngine',
    'MelisAIEngineClaude',
];
```

Dependency: `melisplatform/melis-ai-engine` `^6.0`. The Anthropic API key is stored per model in the Melis AI back-office (the model's `mapk_*` key row) — not in a config file or environment variable.

## Key services

| Service alias | Role |
| --- | --- |
| `MelisAIEngineModelClaudeService` | The Claude provider. Extends `MelisAIEngineModelService` and implements the Anthropic Messages API contract. Built by the service manager with `['modelId' => …, 'agentId' => …]` factory options. |

Notable methods on `MelisAIEngineModelClaudeService`:

| Method | Role |
| --- | --- |
| `setClient()` | Builds a `Laminas\Http\Client` POSTing to the configured Claude Messages URL. Sets headers `Content-Type/Accept: application/json`, `x-api-key` (from the model's API key), `anthropic-version: 2023-06-01`, and an `anthropic-beta` header enabling prompt-caching and web-fetch betas. Uses a long timeout to accommodate tool-use loops. |
| `getMessageKey()` | Returns `'messages'`. |
| `addToolsToPayload()` | Reads agent functions via `getAgentFunctions()`, strips internal engine keys (`mcp`, `type`, `server`, `module`, `max_silence`, `operation_timeout`) via `sanitizeToolForClaudeAPI()`, appends tools in Anthropic shape (`name`, `description`, `input_schema`), appends the built-in `web_fetch` tool, and deduplicates by name. |
| `constructContent()` / `addContentToPayload()` | Maps role `model` to `assistant`; builds Anthropic content blocks (`{type:text}`, `{type:image, source:{url\|base64,…}}`, `{type:document, source:{…, media_type:application/pdf}}`); appends to `payload['messages']`. |
| `sendCustomAI()` | Injects `model` (`mam_generative_model`) and `max_tokens`; POSTs JSON with retries on 5xx; parses `content[]` into text and `tool_use` blocks; dispatches each tool (MCP via `MelisAIEngineMcpService::invokeTool`, otherwise built-in); appends results as `{type:tool_result, tool_use_id, content}` in a `user` message; loops until `stop_reason === 'end_turn'` or a safety hop-cap is reached. Enables prompt caching. |
| `processFiles()` / `processContextFiles()` | Converts uploads per the model's `mam_file_upload_mode` (default: `embed`): DOCX/XLSX → extracted text, images/PDF → base64, or via `uploadDocument()` when internal upload is enabled. |
| `setPromptTokenCount()` / `setResponseTokenCount()` / `setTotalTokenCount()` | Read `responseData['usage']` fields (`input_tokens`, `output_tokens`, plus cache-read/creation counters); total = input + output. |
| `getAllowedMimetypes()` | Returns allowed upload MIME types from the Claude config block. |
| `continueConversation()` | Rehydrates message history from saved state and calls `sendCustomAI()` again for multi-hop tool-use continuation. |

## Tool / function-calling

Engine tools already use Anthropic's `input_schema` shape, so `addToolsToPayload()` primarily sanitises and forwards them. A model tool call arrives as `{type:'tool_use', name, id, input}`; the service extracts `name` / `input` / `id`, routes via `MelisAIEngineMcpService::isMcpTool()` (MCP `invokeTool` vs. built-in function), and returns the result as `{type:'tool_result', tool_use_id:<id>, content:<json>}` inside a `user` message, then continues the loop. The `id` field correlates call↔result as required by the Anthropic API.

## Configuration

Provider settings live under:

```
config['plugins']['melisaiengine']['datas']['AI']['Claude']
```

| Key | Purpose |
| --- | --- |
| `api_url` | The Anthropic Messages API endpoint URL (`https://api.anthropic.com/v1/messages`). |
| `allowed_mimetypes` | MIME types accepted for file uploads. |

A sibling `['AI']['Anthropic']` block declares the file-upload modes (`embed`) and internal-upload support. The API key is **not** read from config or environment — it comes exclusively from the model's DB key row (`mapk_*`), entered by an admin in the MelisAI admin.

## Seeded models

Installed via `install/dbdeploy/*.sql` under the company `Anthropic`; the `mam_status` flag decides which are offered:

| `mam_generative_model` | Model |
| --- | --- |
| `claude-opus-4-8` | Claude Opus 4.8 |
| `claude-sonnet-4-6` | Claude Sonnet 4.6 |
| `claude-haiku-4-5-20251001` | Claude Haiku 4.5 |
| `claude-sonnet-4-5-20250929` | Claude Sonnet 4.5 |
| `claude-sonnet-4-20250514` | Claude Sonnet 4 |
| `claude-opus-4-1-20250805` | Claude Opus 4.1 |

## Database tables

This module owns no tables. All conversation and usage state is stored in the engine's tables (`melis_ai_conversation_state`, `melis_ai_daily_usage`).

## Key files

| Concern | Path |
| --- | --- |
| Provider service | `vendor/melisplatform/melis-ai-engine-claude/src/Service/MelisAIEngineModelClaudeService.php` |
| Service factory | `vendor/melisplatform/melis-ai-engine-claude/src/Service/Factory/MelisAIEngineModelClaudeServiceFactory.php` |
| Config block | `vendor/melisplatform/melis-ai-engine-claude/config/app.interface.php` |

## See also

- [MelisAIEngine](/reference/modules/melis-ai-engine) — the abstract engine, shared tables and MCP bridge; contains the routing that selects this provider by company name.
- [MelisAIEngineGemini](/reference/modules/melis-ai-engine-gemini) — the Google Gemini provider.
- [MelisAI](/reference/modules/melis-ai) — React back-office for managing instances, agents, tools, models and API keys; the only UI where Claude surfaces.
- [Module reference](/reference/modules) — the full module map.
