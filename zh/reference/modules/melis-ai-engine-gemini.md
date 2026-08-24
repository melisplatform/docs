# MelisAIEngineGemini

> Melis AI 引擎的 Google Gemini 提供方 —— 一个没有自身后台的后端引擎。软件包 `melisplatform/melis-ai-engine-gemini`。

## 用途

`MelisAIEngineGemini` 是 `MelisAIEngine` 的 `MelisAIEngineModelService` 契约的具体 Google Gemini 实现。它提供 Gemini 专用的 HTTP 客户端配置、`generateContent` 载荷结构（`contents` / `parts` 模式）、工具/函数调用映射、通过 File API 或内联嵌入实现的文件处理，以及 token 用量解析。该模块是无状态的（没有自己的数据表），且**不提供任何 UI** —— 所有 AI 界面均由 `melis-ai` / `melis-ai-engine` 提供。

## 无 React 后台

该模块**没有 React 工具**，也不应有 —— 它是一个后端提供方层，而非界面。它不提供 `ui-react/` 组件块、`config/react-api.php`、`config/react.capabilities.php`，也没有控制器，并且在 `/melis-react` 中**不显示任何侧边栏条目或菜单节点**。没有任何截图。

在 React 后台中，Gemini 仅**间接**出现，即作为 **MelisAI** 管理后台（Platform AI / Instances / Models & keys）内可选的引擎/模型。当管理员创建一个所属公司为 **Google** 的模型且已安装本模块时，`MelisAIEngine` 会将该模型的聊天和智能体路由到此处实现的 Gemini 引擎 —— 无需专门的 Gemini 页面。

## 启用它

添加到 `config/melis.module.load.php`：

```php
return [
    'MelisAIEngineGemini',
];
```

需要 `melisplatform/melis-ai-engine` `^6.0`。当活动模型的公司名称包含 **`Google`** 且已安装本模块时，引擎会在运行时自动选择此提供方；它通过 `$serviceManager->build(MelisAIEngineModelGeminiService::class, ['modelId' => …, 'agentId' => …])` 构建 `MelisAIEngineModelGeminiService`。

## 关键服务

| 服务别名 | 作用 |
| --- | --- |
| `MelisAIEngineModelGeminiService` | Gemini 提供方 —— `MelisAIEngineModelService` 的子类，按请求使用 `modelId` + `agentId` 构建（通过 `MelisAIEngineModelGeminiServiceFactory`）。 |

`MelisAIEngineModelGeminiService` 的重要方法：

| 方法 | Gemini 实现 |
| --- | --- |
| `setClient()` | 构建一个向 `{api_url}/models/{mam_generative_model}:generateContent` 发起 POST 请求的 `Laminas\Http\Client`。API 密钥通过 **`x-goog-api-key`** 请求头发送（不暴露在 URL 中）。较长的超时时间。 |
| `getMessageKey()` | 返回 `'contents'`。 |
| `addToolsToPayload()` | 通过 `getAgentFunctions()` 获取工具，对每个工具进行清理，将 `input_schema` 重命名为 `parameters`，并封装为 `tools:[{functionDeclarations:[…]}]`，同时设置 `toolConfig.functionCallingConfig.mode='AUTO'`。当没有函数时，回退为一个 `url_context` 工具。 |
| `constructContent()` / `addContentToPayload()` | 将角色 `assistant` 映射为 `model`；构建包含 `{text}`、`{fileData:{fileUri,mimeType}}`（File API）或 `{inlineData:{mimeType,data}}`（base64）的 `parts` 数组。 |
| `sendCustomAI()` | POST JSON 载荷（在 5xx / 429 时重试）；解析 `candidates[].content.parts[]` 中的文本和 `functionCall` 条目；分派每个工具调用（MCP 或内置）；将结果追加为 `{functionResponse:{name,response:{result}}}` 并循环，直到不再有工具调用、出现 `finishReason` 或达到安全上限。 |
| `processFiles()` / `processContextFiles()` | 按 `mam_file_upload_mode` 处理文件上传（参见 [文件上传模式](#文件上传模式)）；同时通过 `uploadDocument()` 存储一份副本用于会话显示。 |
| `setPromptTokenCount()` / `setResponseTokenCount()` / `setTotalTokenCount()` | 读取 `usageMetadata.promptTokenCount`、`candidatesTokenCount`、`totalTokenCount`。 |
| `getAllowedMimetypes()` | 返回 Gemini 配置块中允许的 MIME 类型。 |

## 文件上传模式

模型的 `mam_file_upload_mode` 控制文件如何送达 Gemini：

- **`fileapi`**（默认）—— 通过 multipart POST 上传到 Gemini **File API**，随后轮询直到文件状态为 `ACTIVE`，并引用返回的 `fileApiUri`。
- **`embed`** —— 以 base64（`inlineData`）内联发送文件字节，并对支持的格式进行文本提取。

## 配置

固定的提供方配置位于 `config['plugins']['melisaiengine']['datas']['AI']['Gemini']`（在 `config/app.interface.php` 中，无 UI）：

| 键 | 用途 |
| --- | --- |
| `api_url` | `generateContent` 请求的基础 URL（`https://generativelanguage.googleapis.com/v1beta`）。 |
| `upload_url` | Gemini File API 上传端点（`https://generativelanguage.googleapis.com/upload/v1beta/files`）。 |
| `allowed_mimetypes` | 允许的 MIME 类型（由 `getAllowedMimetypes()` 返回）。 |

每个模型的值来自 MelisAI 中配置的**模型行**，而非本模块：

- **`mam_generative_model`** —— Gemini 模型 id（例如 `gemini-…`），用于请求 URL。
- **`mapk_keys`** —— **Google API 密钥**，通过 `x-goog-api-key` 请求头发送。它来自模型的平台密钥记录，不存储在配置文件中，且**没有环境变量回退**。
- **`mam_file_upload_mode`**（默认 `fileapi`，或 `embed`）和 `mam_internal_upload` —— 控制文件的上传方式。

::: tip 请求头中的 API 密钥
与早期版本将密钥作为 `?key=…` 查询参数附加不同，当前源码将 Google API 密钥放在 **`x-goog-api-key`** 请求头中发送，使其不出现在 URL 和代理日志里。
:::

## 工具 / 函数调用映射

Gemini 使用 `parameters`，而引擎契约使用 `input_schema`；`addToolsToPayload()` 会在发送前执行此重命名。工具调用以 `{functionCall:{name,args}}` 的形式到达，**没有 id**（按位置，与 Claude 的 `tool_use_id` 不同）。该服务通过 `MelisAIEngineMcpService::isMcpTool()` 按 `name` 进行路由，并返回 `{functionResponse:{name,response:{result:…}}}`。

## 与 Claude 提供方的差异

| 方面 | Gemini | Claude |
| --- | --- | --- |
| 消息键 | `contents` | `messages` |
| Assistant 角色标签 | `model` | `assistant` |
| 工具 schema 键 | `parameters` | `input_schema` |
| 工具调用 id | 无（按位置） | `tool_use_id` |
| 认证方式 | `x-goog-api-key` 请求头 | `x-api-key` 请求头 |
| 默认文件模式 | `fileapi` | `embed` |

## 关键文件

| 关注点 | 路径 |
| --- | --- |
| 提供方服务 | `vendor/melisplatform/melis-ai-engine-gemini/src/Service/MelisAIEngineModelGeminiService.php` |
| 服务工厂 | `vendor/melisplatform/melis-ai-engine-gemini/src/Service/Factory/MelisAIEngineModelGeminiServiceFactory.php` |
| 固定配置 | `vendor/melisplatform/melis-ai-engine-gemini/config/app.interface.php` |

## 另请参阅

- [MelisAIEngine](/zh/reference/modules/melis-ai-engine) —— 抽象契约与共享运行时。
- [MelisAIEngineClaude](/zh/reference/modules/melis-ai-engine-claude) —— Anthropic 提供方。
- [MelisAI](/zh/reference/modules/melis-ai) —— 用于智能体、实例和模型的后台。
