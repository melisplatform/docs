# MelisAIEngineGemini

> Google Gemini provider for the Melis AI engine — a backend engine with no back-office of its own. Package `melisplatform/melis-ai-engine-gemini`.

## Purpose

`MelisAIEngineGemini` is the concrete Google Gemini implementation of `MelisAIEngine`'s
`MelisAIEngineModelService` contract. It supplies Gemini-specific HTTP client setup, the
`generateContent` payload shape (the `contents` / `parts` schema), tool/function-call mapping,
file handling via the File API or inline embed, and token-usage parsing. The module is stateless
(no tables of its own) and ships **no UI** — all AI screens are provided by `melis-ai` /
`melis-ai-engine`.

## No React back-office

This module has **no React tool** and is not meant to have one — it is a backend provider layer,
not a screen. It ships no `ui-react/` brick, no `config/react-api.php`, no
`config/react.capabilities.php`, no controller, and shows **no sidebar entry or menu node** in
`/melis-react`. There are no screenshots.

In the React back-office Gemini surfaces only **indirectly**, as a selectable engine/model inside
the **MelisAI** admin (Platform AI / Instances / Models & keys). When an admin creates a model
whose company is **Google** and this module is installed, `MelisAIEngine` routes that model's chat
and agents through the Gemini engine implemented here — with no dedicated Gemini page.

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisAIEngineGemini',
];
```

Requires `melisplatform/melis-ai-engine` `^6.0`. The engine selects this provider automatically
at runtime when the active model's company name contains **`Google`** and this module is
installed; it builds `MelisAIEngineModelGeminiService` via
`$serviceManager->build(MelisAIEngineModelGeminiService::class, ['modelId' => …, 'agentId' => …])`.

## Key services

| Service alias | Role |
| --- | --- |
| `MelisAIEngineModelGeminiService` | The Gemini provider — subclass of `MelisAIEngineModelService`, built per request with `modelId` + `agentId` (via `MelisAIEngineModelGeminiServiceFactory`). |

Notable methods of `MelisAIEngineModelGeminiService`:

| Method | Gemini implementation |
| --- | --- |
| `setClient()` | Builds a `Laminas\Http\Client` POSTing to `{api_url}/models/{mam_generative_model}:generateContent`. The API key is sent in the **`x-goog-api-key`** request header (kept out of the URL). Long timeout. |
| `getMessageKey()` | Returns `'contents'`. |
| `addToolsToPayload()` | Fetches tools via `getAgentFunctions()`, sanitises each, renames `input_schema` → `parameters`, and wraps as `tools:[{functionDeclarations:[…]}]` with `toolConfig.functionCallingConfig.mode='AUTO'`. Falls back to a `url_context` tool when no functions are present. |
| `constructContent()` / `addContentToPayload()` | Maps role `assistant` → `model`; builds `parts` arrays containing `{text}`, `{fileData:{fileUri,mimeType}}` (File API), or `{inlineData:{mimeType,data}}` (base64). |
| `sendCustomAI()` | POSTs JSON payload (retries on 5xx / 429); parses `candidates[].content.parts[]` for text and `functionCall` entries; dispatches each tool call (MCP or built-in); appends results as `{functionResponse:{name,response:{result}}}` and loops until no more tool calls, a `finishReason`, or a safety cap. |
| `processFiles()` / `processContextFiles()` | Handles file uploads per `mam_file_upload_mode` (see [File upload modes](#file-upload-modes)); also stores a copy via `uploadDocument()` for session display. |
| `setPromptTokenCount()` / `setResponseTokenCount()` / `setTotalTokenCount()` | Read `usageMetadata.promptTokenCount`, `candidatesTokenCount`, `totalTokenCount`. |
| `getAllowedMimetypes()` | Returns the allowed MIME types from the Gemini config block. |

## File upload modes

The model's `mam_file_upload_mode` controls how files reach Gemini:

- **`fileapi`** (default) — uploads to the Gemini **File API** via a multipart POST, then polls
  until the file state is `ACTIVE`, and references the returned `fileApiUri`.
- **`embed`** — sends file bytes inline as base64 (`inlineData`), with text extraction for
  supported formats.

## Configuration

Fixed provider config lives under `config['plugins']['melisaiengine']['datas']['AI']['Gemini']`
(in `config/app.interface.php`, no UI):

| Key | Purpose |
| --- | --- |
| `api_url` | Base URL for `generateContent` requests (`https://generativelanguage.googleapis.com/v1beta`). |
| `upload_url` | Gemini File API upload endpoint (`https://generativelanguage.googleapis.com/upload/v1beta/files`). |
| `allowed_mimetypes` | Accepted MIME types (returned by `getAllowedMimetypes()`). |

Per-model values come from the **model row** configured in MelisAI, not from this module:

- **`mam_generative_model`** — the Gemini model id (e.g. `gemini-…`), used in the request URL.
- **`mapk_keys`** — the **Google API key**, sent in the `x-goog-api-key` header. It comes from the
  model's platform key record, is not stored in config files, and has **no environment-variable
  fallback**.
- **`mam_file_upload_mode`** (`fileapi` default, or `embed`) and `mam_internal_upload` — govern
  how files are uploaded.

::: tip API key in header
Unlike earlier releases that appended the key as a `?key=…` query parameter, the current source
sends the Google API key in the **`x-goog-api-key`** request header, keeping it out of URLs and
proxy logs.
:::

## Tool / function-call mapping

Gemini uses `parameters` where the engine contract uses `input_schema`; `addToolsToPayload()`
performs this rename before sending. Tool calls arrive as `{functionCall:{name,args}}` with
**no id** (positional, unlike Claude's `tool_use_id`). The service routes by `name` via
`MelisAIEngineMcpService::isMcpTool()` and returns
`{functionResponse:{name,response:{result:…}}}`.

## Differences vs Claude provider

| Aspect | Gemini | Claude |
| --- | --- | --- |
| Message key | `contents` | `messages` |
| Assistant role label | `model` | `assistant` |
| Tool schema key | `parameters` | `input_schema` |
| Tool-call id | none (positional) | `tool_use_id` |
| Auth method | `x-goog-api-key` header | `x-api-key` header |
| Default file mode | `fileapi` | `embed` |

## Key files

| Concern | Path |
| --- | --- |
| Provider service | `vendor/melisplatform/melis-ai-engine-gemini/src/Service/MelisAIEngineModelGeminiService.php` |
| Service factory | `vendor/melisplatform/melis-ai-engine-gemini/src/Service/Factory/MelisAIEngineModelGeminiServiceFactory.php` |
| Fixed config | `vendor/melisplatform/melis-ai-engine-gemini/config/app.interface.php` |

## See also

- [MelisAIEngine](/reference/modules/melis-ai-engine) — the abstract contract and shared runtime.
- [MelisAIEngineClaude](/reference/modules/melis-ai-engine-claude) — the Anthropic provider.
- [MelisAI](/reference/modules/melis-ai) — back-office for agents, instances and models.
