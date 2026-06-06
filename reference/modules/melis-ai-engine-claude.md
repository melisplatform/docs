# MelisAIEngineClaude

> Anthropic Claude provider for the Melis AI engine — package `melisplatform/melis-ai-engine-claude`.

## Purpose

`MelisAIEngineClaude` plugs Anthropic's Claude models into [Melis AI](/guide/ai). It is a *provider
implementation*: it extends `MelisAIEngine\Service\MelisAIEngineModelService` and supplies everything
specific to the Anthropic Messages API — HTTP client setup, request/response shape, file handling,
tool calling (including [MCP](/guide/mcp) tools and the built-in `web_fetch` tool), prompt caching and
token accounting. The AI engine picks this provider automatically based on the active model's company
(`Anthropic`) and model id. It is not a backoffice tool or a front-office plugin — it has no UI of its
own.

## Enable it

It is a standard Laminas module. Add it to `config/melis.module.load.php` **after** the AI engine:

```php
'MelisAIEngine',
'MelisAIEngineClaude',
'MelisAI',
```

Dependencies (from `composer.json`): `melisplatform/melis-ai-engine` `^5.3` and PHP `^8.1|^8.3`.
The module ships `dbdeploy` deltas (`"dbdeploy": true`) that register the Anthropic company and its
Claude models; run dbdeploy after enabling so they are inserted. The Claude API key is stored per
model (the model's `mapk_keys`), set in the Melis AI backoffice — not in a config file.

## Key services

| Service alias | Role |
| --- | --- |
| `MelisAIEngineModelClaudeService` | The Claude provider. Extends `MelisAIEngineModelService` and implements the Anthropic Messages API contract. |

It is built by `MelisAIEngineModelClaudeServiceFactory`, which takes `modelId` / `agentId` from the
factory `$options`. Notable methods:

| Method | Role |
| --- | --- |
| `setClient()` | Builds the Laminas HTTP client: POST to the configured `api_url`, `x-api-key` from the model, `anthropic-version: 2023-06-01`, the `prompt-caching` + `web-fetch` betas, 3600 s timeout. |
| `sendCustomAI($payload)` | The main call. Sets `model` / `max_tokens`, applies prompt caching, adds tools, sends the request, then runs the multi-hop tool-use loop (executing MCP and function-service tools, feeding `tool_result` back) with retries and a continuation/hop safety cap. |
| `addContentToPayload($payload, $role, $prompt, $files, $content)` / `constructContent()` / `constructTextContent()` | Build messages in Messages-API shape (`text`, `image`, `document` blocks). |
| `addToolsToPayload($payload)` / `sanitizeToolForClaudeAPI($tool)` | Attach agent tools (stripping internal keys like `mcp`, `server`, `module`) plus the `web_fetch` tool. |
| `processFiles($files)` / `processContextFiles($files)` | Normalize uploads for the `embed` mode (text inline, images/PDF base64, `.docx`/`.xlsx` text-extracted, or Document Upload URLs). |
| `getAllowedMimetypes()` | Returns the allowed upload MIME types from config. |
| `continueConversation($sessionId, ...)` | Resumes a tool-use chain stored in session across HTTP hops. |
| `setPromptTokenCount()` / `setResponseTokenCount()` / `setTotalTokenCount()` | Read `usage.input_tokens` / `usage.output_tokens` from the response. |

## Configuration

Provider settings live under the plugin config key `plugins → melisaiengine → datas → AI → Claude`
(see `config/app.interface.php`):

- `api_url` — defaults to `https://api.anthropic.com/v1/messages`.
- `allowed_mimetypes` — images, PDF, text/CSV/HTML/XML/JSON and Office (`.docx`/`.xlsx`) types.

The same file declares an `Anthropic` block describing file handling: only the `embed` upload mode is
supported, and internal upload (via [melis-document-upload](/reference/modules)) is available.

## Database

The module owns no tables. Its `install/dbdeploy/*.sql` deltas only **insert/update rows** in tables
owned by `melis-ai-engine`:

- `melis_ai_companies` — adds the `Anthropic` company.
- `melis_ai_models` — adds Claude models (Opus 4.1, Sonnet 4 / 4.5, Haiku 4.5) with their
  `mam_generative_model` ids, `embed` upload mode and internal-upload flag.

Models ship with `mam_status = 0` (inactive); enable and key them in the Melis AI backoffice.

## Key files

| Concern | Path |
| --- | --- |
| Provider service | `vendor/melisplatform/melis-ai-engine-claude/src/Service/MelisAIEngineModelClaudeService.php` |
| Service factory | `vendor/melisplatform/melis-ai-engine-claude/src/Service/Factory/MelisAIEngineModelClaudeServiceFactory.php` |
| Service alias / routing | `vendor/melisplatform/melis-ai-engine-claude/config/module.config.php` |
| Provider config (api_url, mimetypes, upload modes) | `vendor/melisplatform/melis-ai-engine-claude/config/app.interface.php` |
| DB seed (company + models) | `vendor/melisplatform/melis-ai-engine-claude/install/dbdeploy/` |
| Module bootstrap | `vendor/melisplatform/melis-ai-engine-claude/src/Module.php` |

## See also

- [Melis AI](/guide/ai) — the AI engine, agents and models.
- [MCP](/guide/mcp) — how tools are exposed to the model.
- [Module reference](/reference/modules) — the full module map.
