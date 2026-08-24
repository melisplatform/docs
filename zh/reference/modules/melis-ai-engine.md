# MelisAIEngine

> 抽象 AI 引擎——提供商契约、智能体/场景运行时、会话存储、MCP/工具桥接、所有 AI 数据库表，以及驱动 v6 后台的共享 React 聊天组件。包名 `melisplatform/melis-ai-engine`。

## 用途

MelisAIEngine 是 MelisAI 套件的基石。它定义了 Claude 与 Gemini 所实现的抽象提供商契约（`MelisAIEngineModelService`），通过多步骤场景工作流运行智能体，管理 MCP/工具调用桥接，并拥有全部 `melis_ai_*` 数据库表。它自身**没有独立的工具**——它是后台中隐形的聊天引擎。在 v6（React）中，它还提供共享的 **`AiChatContainer`** React 组件，以及供 `MelisAI` 模块挂载到其可见工具中的 `/melis/react-api/ai-engine/*` 聊天后端。

## 启用

在 `config/melis.module.load.php` 中添加：

```php
return [
    'MelisAIEngine',
];
```

必需的 Composer 依赖：`melisplatform/melis-core` 和 `melisplatform/melis-document-upload`。至少需要安装一个提供商模块（`MelisAIEngineClaude` 或 `MelisAIEngineGemini`）才能进行真实的模型调用；如果模型所属公司没有可用的提供商，聊天会报告 *"The AI company module is not active."*（AI 公司模块未激活。）

## 核心服务

| 服务别名 | 职责 |
| --- | --- |
| `MelisAIEngineModelService` | 抽象提供商契约。派生该类以添加新的 AI 提供商（见 § 提供商契约）。 |
| `MelisAIEngineService` | 注册表/工厂：`getActiveInstance()`、`getActiveAgent()`、`getActiveModel()`、`getActiveModelClass()`（提供商选择）、`getActiveAITools()`、`saveDailyUsage()`。 |
| `MelisAIEngineAgentService` | 场景运行时：`runAgent($postValues, $files)` 遍历智能体的各个步骤并驱动 `MelisAIEngineModelService::send()`。 |
| `MelisAIEngineMcpService` | MCP/工具调用桥接：服务器管理、JSON-RPC 通信、熔断器、`getAvailableTools()`、`isMcpTool()`、`invokeTool()`、`formatToolsForAI()`、`getToolSchema()`。 |
| `MelisAIEngineConversationStore` | 在 `melis_ai_conversation_state` 中持久化多轮会话状态：`get()`、`has()`、`set()`、`delete()`。48 小时后自动进行垃圾回收。 |
| `MelisAIEngineFunctionService` | 内置（非 MCP）工具实现，例如 `get_table_structure`、`create_database_table`。 |
| `MelisAIEngineFileService` | 对 AI 上传文档的保留期清理：`deleteAIDocUploads()`。 |
| `MelisAIEngineGeneralService` | 事件感知基类：`sendEvent()`、`makeArrayFromParameters()`。 |

## 提供商契约

`MelisAIEngineModelService`（`src/Service/MelisAIEngineModelService.php`）是每个提供商都必须继承的抽象类。构造函数：`(ServiceManager $serviceManager, int $modelId, int $agentId)`。

**提供商必须实现的抽象方法：**

```php
abstract public function setClient();
abstract public function addToolsToPayload($payload);
abstract public function addContentToPayload($payload, $role, $prompt, $files=[], $content=[]);
abstract public function constructContent($role, $prompt, $files=[]);
abstract public function getMessageKey(): string;            // 'messages' (Claude) | 'contents' (Gemini)
abstract public function sendCustomAI(?array $payload = []): array;
abstract public function getAllowedMimetypes(): array;
abstract public function setPromptTokenCount($responseData);
abstract public function setResponseTokenCount($responseData);
abstract public function setTotalTokenCount($responseData);
abstract public function processFiles($filesArr): array;
abstract public function processContextFiles($filesArr): array;
```

基类的 `send(array $contextArr): array` 生命周期是固定的：`addToolsToPayload()` → 对每个上下文条目执行 `addContentToPayload()` → `sendCustomAI()` → 统计 token 数 → 返回 `['request','responseData','result','errors','needs_continuation','session_id','continuation_context','tool_results']`。

**基类提供的辅助方法：** `getModel()`、`getAgentFunctions()`、`getToolDeclarationByName()`、token 取值方法、`uploadDocument()`、`extractTextFromDocx()`、`extractTextFromXlsx()`、`getMimeType()`。

## 提供商选择

`MelisAIEngineService::getActiveModelClass($company, $modelId, $agentId)` 根据模型所属公司名称来选择提供商：

```php
if (strpos($company, 'Google') !== false) {
    // builds MelisAIEngineModelGeminiService — requires MelisAIEngineGemini module
} elseif (strpos($company, 'Anthropic') !== false) {
    // builds MelisAIEngineModelClaudeService — requires MelisAIEngineClaude module
}
```

要添加新的提供商（例如 OpenAI）：继承 `MelisAIEngineModelService`，实现其抽象方法，将其注册为服务，并在此处按公司名称添加一个分支。Ollama 与 OCI 提供商遵循相同的契约。

## MCP / 工具调用系统

工具在两个位置声明：`config['plugins']['melisaiengine']['datas']['function_declarations']`（名称、描述、JSON 模式、`mcp` 布尔值）以及 `melis_ai_tools` 表。智能体通过 `maa_agent_tools` 选择启用工具。

调用时：`getAgentFunctions()` 返回允许的声明 → `addToolsToPayload()` 将其注入 → 发生工具调用时，提供商通过 `MelisAIEngineMcpService::isMcpTool($name)` 进行路由：MCP 工具走 `invokeTool()`（通过 stdio 的 JSON-RPC，受熔断器保护）；内置工具走 `MelisAIEngineFunctionService`。结果会被反馈回去，会话持续进行，直到模型发出完成信号或达到安全上限。

MCP 服务器配置在 `config['mcp']['servers'][<name>]` = `{enabled, command, args, tools, timeout}` 下；`MelisAIEngineMcpService` 通过 `proc_open` 启动它们，并使用 JSON-RPC 2.0 通信（`tools/list`、工具调用）。

## 数据库表

所有 `melis_ai_*` 表都由该模块拥有（`dbdeploy: true`）：

| 表 | 存储内容 |
| --- | --- |
| `melis_ai_models` | 提供商模型（公司、`mam_generative_model`、API 密钥关联）。 |
| `melis_ai_companies` | AI 公司（Google、Anthropic 等）。 |
| `melis_ai_platform_keys` | 各平台的 API 密钥。 |
| `melis_ai_agents` | 智能体（`maa_name`、模型关联、`maa_agent_tools` JSON、文件开关）。 |
| `melis_ai_agents_tools` | 智能体 ↔ 工具的分配关系。 |
| `melis_ai_tools` | 工具目录（`mat_name`、`mat_desc`、`mat_config` JSON）。 |
| `melis_ai_instances` / `melis_ai_instance_trans` | 命名部署（实例）及其翻译。 |
| `melis_ai_scenario_steps` / `…_datas` / `…_datas_entryexit` | 场景步骤、其数据以及入口/出口参数。 |
| `melis_ai_return_types` | 步骤返回类型定义。 |
| `melis_ai_files` | 附加到步骤/上下文的文件。 |
| `melis_ai_daily_usage` | 按模型/智能体/实例/日统计的 token 和调用次数。 |
| `melis_ai_conversation_state` | 持久化会话状态（`macs_key`、JSON、自动垃圾回收）。 |

## React 聊天组件

MelisAIEngine **没有 brick**，也没有 `/melis-react` 菜单项。对于 React 后台，它在 `ui-react/src/` 下暴露了一个**仅源码**组件库，消费方通过 Vite 别名 **`@melis-ai-engine`**（映射到 `melis-ai-engine/ui-react/src`）来导入。它负责渲染整个聊天界面；而实际的 LLM 始终由某个提供商模块提供。

| 导出 | 职责 |
| --- | --- |
| `AiChatContainer`（默认导出） | 编排组件：运行整个 `init → run → (continue×N) → validate` 循环，持有聊天状态，串联各子组件。**挂载此组件即可。** |
| `ChatHistory`、`TypingIndicator`、`StepInterface` | 滚动消息列表（存在 `window.marked` 时通过它渲染 markdown）、思考指示器、按步骤的界面卡片。 |
| `ChatFormBox` | 底部输入栏：文本域、发送/校验、`+` 菜单 → 文件上传（`user_file_upload[]`）或媒体库（`userMediaFiles[]`，MoxieManager）、拖放覆盖层。 |
| `ChatDebugPanel`、`DebugEntry` | 调试视图：以 JSON 块形式展示请求负载（→）和模型原始响应（←）（仅在 `debugMode` 时）。 |
| `MelisPlanPanel`、`extractMelisPlan`、`looksLikeMelisPlan` | 将 AI 提议的结构化"Melis 计划"（例如表单字段列表）渲染为表格。 |
| `aiEngineInit/Run/Continue/Validate/Restart` | 针对 `ai-engine` 端点的类型化客户端（见 § 聊天后端）。 |
| `parseResultActionString`、`dispatchResultAction`、`dispatchToolResults` | 闭环 `JS_ACTION` 导航分发器（见 § 闭环导航）。 |

**挂载契约——`AiChatContainerProps`：**

```tsx
type AiChatContainerProps = {
  maiInstanceId: string                        // required — e.g. "agenttool" or "newscontentcreator|42"
  agentId?: number | null                      // override the instance's default agent
  extraEntryParams?: Record<string, unknown>   // → extra_entry_param[key] context
  entryParamForm?: Record<string, string>      // → entry_param_form[key]
  debugMode?: boolean
  exitParamArr?: ExitParamArr
  showCloseButton?: boolean
  needExitParam?: boolean
  showHideButton?: boolean
  showHeader?: boolean
  clearSession?: boolean                        // clear the server session on init (fresh conversation)
  autoRun?: boolean                             // start the agent immediately after init
  initialMessage?: string                       // first user_chat when autoRun
  onClose?: () => void
  onHide?: () => void
  className?: string
  style?: React.CSSProperties
}
```

该容器将续接（continuation）上限设为 `MAX_CONTINUATION_HOPS = 20`。要为某个 React 工具添加 AI 聊天，只需导入 `AiChatContainer` 并以一个 `maiInstanceId` 挂载它——无需任何后端工作，端点已经存在。消费方通过改变所挂载元素上的 `key` 来强制在重新启动时开启一个全新的服务器会话。

## 出现位置

你不会把 MelisAIEngine 看作一个菜单项；它的聊天界面出现在 **MelisAI** 模块内部，该模块在三个位置挂载了完全相同的 `AiChatContainer`（仅 `maiInstanceId` / `agentId` 不同）：

- **AI Assistant**——浮动助手覆盖层（通用聊天，可对后台执行操作，使用 `autoRun` 启动）。
- **Chat Dev Tool**——一个开发者试验场，可启动任意智能体/实例并与之对话。
- **智能体 "Run" 选项卡**——从 MelisAI 智能体工具测试某个智能体（`maiInstanceId="agenttool"`）。

## 聊天后端——`ai-engine` 端点

路由声明在 `config/module.config.php`（不是 `react-api.php`）中，控制器别名 `MelisAIEngine\Controller\React\MelisReactApiAiEngine` → `MelisReactApiAiEngineController`。每个动作都以 `denyUnlessAuthenticated()` 做守卫（没有 MelisCore 身份时返回 401——不做按工具的权限门控，因为这是一个共享引擎）。统一的响应信封：`{ success, data, error? }`。这些端点镜像了旧版的 `AIController`（`/melis/MelisAIEngine/AI/*`），并调用同一个 `MelisAIEngineAgentService`。

| 方法与 URL | 客户端函数 | 用途 |
| --- | --- | --- |
| `GET /melis/react-api/ai-engine/init` | `aiEngineInit` | 校验 实例→智能体→模型→提供商；返回 `label`、`finalInstanceId`、`agentId`、`isFileUploadActivated`、`isMediaLibraryActivated`、`hasExitParameter`（或 `errorType`/`errorMessage`）。 |
| `POST /melis/react-api/ai-engine/run` | `aiEngineRun` | 启动/推进一轮对话。文本时用 JSON，附带文件时用 multipart/form-data → `runAgent()`。 |
| `POST /melis/react-api/ai-engine/continue` | `aiEngineContinue` | 恢复一个多跳轮次（`needs_continuation=true`）→ `continueConversation(sessionId, continuationContext)`。 |
| `POST /melis/react-api/ai-engine/validate` | `aiEngineValidate` | 接受 AI 的回答，推进到出口参数步骤，返回供宿主回调使用的 `exitParams` → `validateAnswer()`。 |
| `POST /melis/react-api/ai-engine/restart` | `aiEngineRestart` | 清除会话，返回可复用的同一个 `finalInstanceId`。 |

`RunResult` 包含 `chatHist`、`needs_continuation`、`session_id`、`continuation_context`、`payload`/`response`（调试）、`exitParams`、`tool_results`。

**最简文本轮次：**

```ts
import { aiEngineInit, aiEngineRun } from '@melis-ai-engine'

const cfg = await aiEngineInit({ maiInstanceId: 'agenttool', clearSession: true })
if (cfg.errorType) throw new Error(cfg.errorMessage)   // instance/agent/model/companyModule/exitParam

const res = await aiEngineRun({
  agentId:    cfg.agentId,
  instanceId: cfg.finalInstanceId,
  userText:   'Create a news article about our new store',
})
// res.chatHist, res.needs_continuation, res.session_id, res.tool_results …
```

## 闭环导航

引擎只负责**分发**：`nav-actions.ts` 从响应的 `tool_results` 中解析出 `JS_ACTION::action::k=v&…` 回调字符串，并调用 `window.melisReactActionMap[action](args)`。**宿主外壳（melis-core）** 负责*注册*这些处理器，并掌管 React-Router 导航/DOM 感知。处理器可以返回一个 `Promise<string>` 观测值，`dispatchToolResults` 会等待它并将其作为 `continuationContext.clientObservation` 反馈回去——为下一轮模型对话提供依据。这使得两个独立构建的 bundle 保持解耦：唯一耦合它们的是 `window` 契约。

## 示例（旧版视图助手）

对于非 React（`.phtml`）的上下文，经典的服务端渲染助手仍然可用：

```php
// Render the chat box for a named instance
echo $this->AIChatViewHelper($maiInstanceId);
```

注册一个自定义 MCP 服务器并声明其工具，以便智能体可以调用它们：

```php
// In a module's config — register the MCP server
'mcp' => [
    'servers' => [
        'my-mcp-server' => [
            'enabled' => true,
            'command' => 'node',
            'args'    => ['/path/to/server.js'],
            'tools'   => ['my_tool'],
            'timeout' => 30,
        ],
    ],
],
// Declare the tool with mcp: true
'plugins' => [
    'melisaiengine' => [
        'datas' => [
            'function_declarations' => [
                [
                    'name'        => 'my_tool',
                    'description' => 'Does something useful',
                    'mcp'         => true,
                    // JSON schema for parameters…
                ],
            ],
        ],
    ],
],
```

## 关键文件

| 关注点 | 路径 |
| --- | --- |
| 提供商契约（抽象） | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineModelService.php` |
| 注册表 + 提供商选择 | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineService.php` |
| 智能体/场景运行时 | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineAgentService.php` |
| MCP/工具桥接 | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineMcpService.php` |
| 持久化会话存储 | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineConversationStore.php` |
| 内置函数 | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineFunctionService.php` |
| 旧版聊天控制器 | `vendor/melisplatform/melis-ai-engine/src/Controller/AIController.php` |
| React 聊天后端 | `vendor/melisplatform/melis-ai-engine/src/Controller/React/MelisReactApiAiEngineController.php` |
| 共享 React 聊天库 | `vendor/melisplatform/melis-ai-engine/ui-react/src/`（`AiChatContainer.tsx`、`api.ts`、`nav-actions.ts` 等） |
| 数据库表模型 | `vendor/melisplatform/melis-ai-engine/src/Model/Tables/` |
| 模块配置 | `vendor/melisplatform/melis-ai-engine/config/module.config.php` |

另见：[MelisAI](/zh/reference/modules/melis-ai)、[MelisAIEngineClaude](/zh/reference/modules/melis-ai-engine-claude)、[MelisAIEngineGemini](/zh/reference/modules/melis-ai-engine-gemini)、[MelisAIToolCreator](/zh/reference/modules/melis-ai-tool-creator)。
