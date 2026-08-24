# MelisAIEngineClaude

> 面向 Melis AI 引擎的 Anthropic Claude 提供程序 —— 一个没有自身 React UI 的后端引擎。软件包 `melisplatform/melis-ai-engine-claude`。

## 用途

`MelisAIEngineClaude` 是 MelisAI 套件的具体 Anthropic Claude 提供程序。它扩展了引擎的 `MelisAIEngineModelService` 契约，并提供 Claude 专属的 HTTP 客户端配置、Anthropic Messages API 载荷结构、文件处理、工具/函数映射以及响应解析。该模块是无状态的 —— 它不拥有任何数据库表；所有运行时状态都保存在引擎自身的表中。

当激活模型的公司包含 `Anthropic`（且已安装本模块）时，引擎会在运行时自动选择该提供程序。

## 在 React 后台中的角色

本模块**没有 React 后台工具，也没有自身的 UI**：没有 `ui-react/` brick、没有 `config/react-api.php`、没有 capabilities，也没有控制器。它从不会作为工具、菜单节点或侧边栏条目出现在 `/melis-react` 中。它是纯粹的底层管道 —— 让 Melis 能够与 Claude 通信的代码路径。

它在 React 后台中唯一可见的效果是**间接的，通过 [MelisAI](/zh/reference/modules/melis-ai)** 体现：

- 它的 `install/dbdeploy/*.sql` 脚本会向引擎的模型目录中植入公司 **`Anthropic`** 以及若干 **Claude 模型**。
- 随后这些模型会在 MelisAI 管理界面（Platform AI / 模型设置）中，作为 **Anthropic** 公司下的可选项出现。
- 要使用其中某个模型，需在该模型行上存储你的 **Anthropic API 密钥**（`mapk_*`），然后将某个**实例 / 智能体**指向该 Claude 模型。
- 从此以后，该智能体上的每一次聊天 —— 包括 React 的 **AI Assistant** —— 都会经由此提供程序路由。

> 你永远不会打开这个模块。在 `/melis-react` 中，它只会是 MelisAI 呈现的模型下拉列表中的一行，以及使用它的 AI 聊天背后的引擎。如果 Claude 聊天失败，原因通常是模型行上缺少 **API 密钥**，或者模型处于**未激活**状态 —— 两者都在 MelisAI 中配置，而非在这里。

## 启用

在 AI 引擎之后，将其添加到 `config/melis.module.load.php`：

```php
return [
    'MelisAIEngine',
    'MelisAIEngineClaude',
];
```

依赖项：`melisplatform/melis-ai-engine` `^6.0`。Anthropic API 密钥按模型存储在 Melis AI 后台中（模型的 `mapk_*` 密钥行）—— 而不是在配置文件或环境变量中。

## 关键服务

| 服务别名 | 角色 |
| --- | --- |
| `MelisAIEngineModelClaudeService` | Claude 提供程序。扩展 `MelisAIEngineModelService` 并实现 Anthropic Messages API 契约。由服务管理器通过 `['modelId' => …, 'agentId' => …]` 工厂选项构建。 |

`MelisAIEngineModelClaudeService` 上值得关注的方法：

| 方法 | 角色 |
| --- | --- |
| `setClient()` | 构建一个向所配置的 Claude Messages URL 发起 POST 请求的 `Laminas\Http\Client`。设置请求头 `Content-Type/Accept: application/json`、`x-api-key`（来自模型的 API 密钥）、`anthropic-version: 2023-06-01`，以及一个启用提示缓存（prompt-caching）与网页抓取（web-fetch）beta 特性的 `anthropic-beta` 请求头。使用较长的超时时间以适应工具调用循环。 |
| `getMessageKey()` | 返回 `'messages'`。 |
| `addToolsToPayload()` | 通过 `getAgentFunctions()` 读取智能体函数，借助 `sanitizeToolForClaudeAPI()` 剥离引擎内部键（`mcp`、`type`、`server`、`module`、`max_silence`、`operation_timeout`），以 Anthropic 结构（`name`、`description`、`input_schema`）追加工具，追加内置的 `web_fetch` 工具，并按名称去重。 |
| `constructContent()` / `addContentToPayload()` | 将角色 `model` 映射为 `assistant`；构建 Anthropic 内容块（`{type:text}`、`{type:image, source:{url\|base64,…}}`、`{type:document, source:{…, media_type:application/pdf}}`）；追加到 `payload['messages']`。 |
| `sendCustomAI()` | 注入 `model`（`mam_generative_model`）与 `max_tokens`；以 JSON 形式 POST，并在 5xx 时重试；将 `content[]` 解析为文本块与 `tool_use` 块；分派每个工具（MCP 通过 `MelisAIEngineMcpService::invokeTool`，否则为内置工具）；将结果作为 `{type:tool_result, tool_use_id, content}` 追加到一条 `user` 消息中；循环直到 `stop_reason === 'end_turn'` 或达到安全跳数上限。启用提示缓存。 |
| `processFiles()` / `processContextFiles()` | 依据模型的 `mam_file_upload_mode`（默认：`embed`）转换上传内容：DOCX/XLSX → 提取文本，图像/PDF → base64，或在启用内部上传时通过 `uploadDocument()` 处理。 |
| `setPromptTokenCount()` / `setResponseTokenCount()` / `setTotalTokenCount()` | 读取 `responseData['usage']` 字段（`input_tokens`、`output_tokens`，以及缓存读取/创建计数器）；总数 = 输入 + 输出。 |
| `getAllowedMimetypes()` | 从 Claude 配置块返回允许的上传 MIME 类型。 |
| `continueConversation()` | 从保存的状态重新填充消息历史，并再次调用 `sendCustomAI()` 以进行多跳工具调用的续接。 |

## 工具 / 函数调用

引擎工具已经使用 Anthropic 的 `input_schema` 结构，因此 `addToolsToPayload()` 主要进行净化并转发它们。模型工具调用以 `{type:'tool_use', name, id, input}` 的形式到达；服务提取 `name` / `input` / `id`，通过 `MelisAIEngineMcpService::isMcpTool()` 进行路由（MCP `invokeTool` 或内置函数），并将结果以 `{type:'tool_result', tool_use_id:<id>, content:<json>}` 的形式返回到一条 `user` 消息中，然后继续循环。`id` 字段按照 Anthropic API 的要求关联调用与结果。

## 配置

提供程序设置位于：

```
config['plugins']['melisaiengine']['datas']['AI']['Claude']
```

| 键 | 用途 |
| --- | --- |
| `api_url` | Anthropic Messages API 端点 URL（`https://api.anthropic.com/v1/messages`）。 |
| `allowed_mimetypes` | 文件上传所接受的 MIME 类型。 |

一个同级的 `['AI']['Anthropic']` 块声明文件上传模式（`embed`）以及内部上传支持。API 密钥**不会**从配置或环境中读取 —— 它完全来自模型的数据库密钥行（`mapk_*`），由管理员在 MelisAI 管理界面中录入。

## 预植入的模型

通过 `install/dbdeploy/*.sql` 在公司 `Anthropic` 下安装；`mam_status` 标志决定提供哪些模型：

| `mam_generative_model` | 模型 |
| --- | --- |
| `claude-opus-4-8` | Claude Opus 4.8 |
| `claude-sonnet-4-6` | Claude Sonnet 4.6 |
| `claude-haiku-4-5-20251001` | Claude Haiku 4.5 |
| `claude-sonnet-4-5-20250929` | Claude Sonnet 4.5 |
| `claude-sonnet-4-20250514` | Claude Sonnet 4 |
| `claude-opus-4-1-20250805` | Claude Opus 4.1 |

## 数据库表

本模块不拥有任何表。所有会话与用量状态都存储在引擎的表中（`melis_ai_conversation_state`、`melis_ai_daily_usage`）。

## 关键文件

| 关注点 | 路径 |
| --- | --- |
| 提供程序服务 | `vendor/melisplatform/melis-ai-engine-claude/src/Service/MelisAIEngineModelClaudeService.php` |
| 服务工厂 | `vendor/melisplatform/melis-ai-engine-claude/src/Service/Factory/MelisAIEngineModelClaudeServiceFactory.php` |
| 配置块 | `vendor/melisplatform/melis-ai-engine-claude/config/app.interface.php` |

## 另见

- [MelisAIEngine](/zh/reference/modules/melis-ai-engine) —— 抽象引擎、共享表与 MCP 桥接；包含按公司名称选择此提供程序的路由逻辑。
- [MelisAIEngineGemini](/zh/reference/modules/melis-ai-engine-gemini) —— Google Gemini 提供程序。
- [MelisAI](/zh/reference/modules/melis-ai) —— 用于管理实例、智能体、工具、模型与 API 密钥的 React 后台；Claude 唯一显现的 UI。
- [模块参考](/zh/reference/modules) —— 完整的模块地图。
