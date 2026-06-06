# MelisAIEngineGemini

> Google Gemini provider for the Melis AI engine — package `melisplatform/melis-ai-engine-gemini`.

## Purpose

`MelisAIEngineGemini` plugs Google Gemini into [Melis AI](/guide/ai). It is a **provider
implementation**: it extends `MelisAIEngine`'s abstract `MelisAIEngineModelService` and supplies
the Gemini-specific HTTP client, request payload (the `contents` + `parts` schema), tool/function
calling (`functionDeclarations`), file handling (File API or inline embed) and token-usage parsing.
It ships no UI of its own — agents, instances and scenarios are configured in the AI backoffice, and
the engine routes a request here whenever the active model's company is **Google**. See
[Melis AI](/guide/ai) and [MCP & tools](/guide/mcp) for the surrounding workflow.

## Enable it

This is a standard Laminas module (module name `MelisAIEngineGemini`). Install it with Composer
(`composer require melisplatform/melis-ai-engine-gemini`) and add it to `config/melis.module.load.php`:

```php
'MelisAIEngineGemini',
```

It **requires `melisplatform/melis-ai-engine` (`^5.3`)** and PHP `^8.1|^8.3`. Its `dbdeploy` deltas
register the **Google** company and the Gemini models. At runtime, file handling can also use
**MelisDocumentUpload** (when the model's "internal upload" option is on). The provider is only used
if the module is in the active modules list — the engine checks this before instantiating it.

## How the engine selects it

`MelisAIEngineService::getActiveModelClass($company, $modelId, $agentId)` (in `melis-ai-engine`)
inspects the active model's `macp_company_name`. When it contains **`Google`** and
`MelisAIEngineGemini` is active, it builds `MelisAIEngineModelGeminiService` via the service manager
(`build()` with `modelId` / `agentId` options). No manual wiring is needed.

## Key services

| Service alias | Role |
| --- | --- |
| `MelisAIEngineModelGeminiService` | The Gemini provider. Subclass of `MelisAIEngine\Service\MelisAIEngineModelService`. Built per request with `modelId` + `agentId`. |

Notable methods of `MelisAIEngineModelGeminiService`:

| Method | Role |
| --- | --- |
| `setClient()` | Builds the Laminas HTTP client; URI = `{api_url}/models/{mam_generative_model}:generateContent?key={mapk_keys}`, POST, 3600s timeout. |
| `sendCustomAI(?array $payload = [])` | Sends the payload; parses `candidates`/`parts`; dispatches `functionCall`s (MCP or `MelisAIEngineFunctionService`); retries on 5xx/429; returns `result`, `errors`, `responseData`, `payload`, `needs_continuation`, `session_id`, `tool_results`. |
| `continueConversation($sessionId, $continuationContext, $existingContext = [])` | Rehydrates `contents` from the PHP session (or a fallback context) and re-calls `sendCustomAI()`. |
| `addToolsToPayload($payload)` | Adds `tools[].functionDeclarations` + `toolConfig.functionCallingConfig` (mode `AUTO`); when no functions, adds the `url_context` tool instead. |
| `addContentToPayload($payload, $role, $prompt, $files, $content)` / `constructContent($role, $prompt, $files)` | Build a `contents` entry (`role` + `parts`: `text`, `fileData`, `inlineData`). |
| `processFiles($files)` / `processContextFiles($files)` | Normalise uploads per the model's upload mode (`fileapi` / `embed`) and the internal-upload flag. |
| `setPromptTokenCount()` / `setResponseTokenCount()` / `setTotalTokenCount()` | Read `usageMetadata.{promptTokenCount,candidatesTokenCount,totalTokenCount}`. |
| `getAllowedMimetypes()` / `getMessageKey()` | Return the configured allowed MIME types / the message key (`contents`). |

Constants: `FILEAPI_UPLOAD_MODE = "fileapi"`, `EMBED_UPLOAD_MODE = "embed"`.

## File upload modes

The active model's `mam_file_upload_mode` selects how files reach Gemini:

- **`fileapi`** — uploads to the Gemini **File API** (`upload_url`), then references the returned
  `fileUri`. The service waits until the file state is `ACTIVE`.
- **`embed`** — sends file bytes inline as base64 (`inlineData`), with text extraction for `.docx`
  and `.xlsx`.

When `mam_internal_upload` is on, text files are routed through **MelisDocumentUpload** instead (so
they can be re-displayed in past chat sessions), and only non-text files go to the File API / embed.

## Configuration

Gemini endpoints and limits live under the config key
`plugins → melisaiengine → datas → AI → Gemini` (see `config/app.interface.php`):

| Key | Default |
| --- | --- |
| `api_url` | `https://generativelanguage.googleapis.com/v1beta` |
| `upload_url` | `https://generativelanguage.googleapis.com/upload/v1beta/files` |
| `allowed_mimetypes` | image / pdf / text / office / video / audio / zip MIME list |

The API key is **not** stored in config — it comes from the model row (`mapk_keys`), managed in the
AI backoffice.

## Backoffice

None of its own. The module declares the `melisaienginegemini` plugin shell (asset bundle config) but
ships no tool, controller action, view helper or dashboard plugin. All AI screens are provided by
`melis-ai` / `melis-ai-engine`.

## Database tables

The module owns no tables; it populates `melis-ai-engine`'s tables via `dbdeploy`:

| Table | What this module inserts |
| --- | --- |
| `melis_ai_companies` | The `Google` company row. |
| `melis_ai_models` | Gemini models (e.g. `gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-2.5-flash-lite`, `gemini-3.1-pro-preview`) with their `mam_generative_model`, upload mode and file flags. |

## Key files

| Concern | Path |
| --- | --- |
| Provider service | `vendor/melisplatform/melis-ai-engine-gemini/src/Service/MelisAIEngineModelGeminiService.php` |
| Service factory | `vendor/melisplatform/melis-ai-engine-gemini/src/Service/Factory/MelisAIEngineModelGeminiServiceFactory.php` |
| Service alias / routing | `vendor/melisplatform/melis-ai-engine-gemini/config/module.config.php` |
| Endpoints & allowed MIME types | `vendor/melisplatform/melis-ai-engine-gemini/config/app.interface.php` |
| dbdeploy (company + models) | `vendor/melisplatform/melis-ai-engine-gemini/install/dbdeploy/` |
| Module bootstrap | `vendor/melisplatform/melis-ai-engine-gemini/src/Module.php` |

## See also

- [Melis AI](/guide/ai) — agents, instances, scenarios.
- [MCP & tools](/guide/mcp) — function/tool calling.
- [Module reference](/reference/modules) — the full module map.
