# AI：智能体与引擎

Melis 内置了一套 **AI 引擎**，让你能够构建 **智能体**（agents）——脚本化的多步 AI 工作流——
并将它们呈现在后台或你自己的模块的任意位置。不同的服务商（Anthropic
Claude、Google Gemini、Ollama、OCI）都通过统一的引擎接入。

涉及的模块有：`melis-ai`（React 后台工具 + 全局 AI 助手）、
`melis-ai-engine`（引擎与共享聊天界面）、
`melis-ai-engine-claude` / `melis-ai-engine-gemini`（服务商），以及
`melis-ai-community-extensions`（现成的示例智能体）。

在 v6 中，框架和模块保持不变；改变的是 **后台**，现在它是位于 `/melis-react` 的 React 界面。
AI 逻辑仍然运行在服务端——React 只负责展示和 API 调用。

## 核心概念

| 概念 | 含义 | 数据表 |
| --- | --- | --- |
| **公司 / 服务商** | AI 供应商（Anthropic、Google 等）。 | `melis_ai_companies` |
| **模型** | 某公司的具体模型（例如某个 Claude 或 Gemini 模型）。 | `melis_ai_models`（`mam_generative_model`） |
| **平台密钥** | 用于调用服务商的 API 密钥。 | `melis_ai_platform_keys` |
| **智能体** | 一个工作流 = 一组有序的 **场景步骤**。 | `melis_ai_agents`、`melis_ai_scenario_steps` |
| **实例** | 用于运行智能体的可复用命名句柄（用作聊天会话 id）。 | `melis_ai_instances`（`mai_instance_id`） |
| **每日用量** | 按模型/智能体/实例统计的令牌/用量核算。 | `melis_ai_daily_usage` |

一个 **智能体** 就是一个 *场景*：一系列步骤，例如 `ENTRY PARAMS`、`AI CONTEXT`、
`AI CHAT`、`CODE`、`EXIT PARAMS`。引擎会依次执行这些步骤，在需要时调用模型，并
产出最终答案——还可以选择将其写回启动它的页面（通过 *退出参数*）。

## 服务商

引擎会根据模型所属 **公司** 的名称来选择服务商
（`MelisAIEngine\Service\MelisAIEngineService::getActiveModelClass()`）：

- 公司名称包含 **"Anthropic"** → `MelisAIEngineModelClaudeService`（模块 `melis-ai-engine-claude`）
- 公司名称包含 **"Google"** → `MelisAIEngineModelGeminiService`（模块 `melis-ai-engine-gemini`）
- 此外还有遵循相同契约的 **Ollama**（本地）和 **OCI**（OCI GenAI）服务商模块

每个服务商都继承自 `melis-ai-engine` 的 `MelisAIEngineModelService` 并实现相同的
契约（`setClient()`、载荷/消息格式化、工具调用）。新增一个服务商就是
新增一个带有自己模型服务的模块——无需改动引擎。服务商 **没有自己的界面**：
安装其中一个会把它的公司 + 模型写入目录，随后它们会作为可选项出现在 MelisAI 管理界面中。

## 它在 React 后台中的位置

在 `/melis-react` 中，MelisAI 提供 **一个 brick bundle**，在左侧边栏的 **Melis AI** 分区下
暴露 **三个原生 React 工具**——**Admin**、**AI Agents**、**MCP Inspector**——**外加
一个全局 AI 助手浮层**。每个菜单工具都带有 **New / Old** 切换开关：*New* 是 React
界面，*Old* 会在 iframe 中打开经典工具。

![Melis AI 菜单分区](/screenshots/react/melis-ai/melisai-menu-section-melisai.png)

这些工具仅在 MelisAI 处于激活状态时才会出现。第四个入口——**AI Tool Creator**——
由另一个模块（`melis-ai-tool-creator`）提供。

## 配置它（Admin）

打开 **Melis AI → Admin**。单个 **New/Old** 切换开关作用于整个工具；React 视图是
一个选项卡框架——**Usage · Platform AI · Instances · MCP Server · Chat dev tool**——
每个激活的选项卡都有一个 **Save**。

- **Platform AI** — 选择 **Company + Model**，粘贴 **API 密钥**
  （`melis_ai_platform_keys`），并将该平台设为 **Active** + **Default**。模型必须拥有密钥
  才能激活。右侧面板管理文件上传——包括 **上传模式：File API 与 Embed in
  request**（Gemini 默认使用 File API，Claude 默认使用 embed）。

  ![Admin → Platform AI](/screenshots/react/melis-ai/melisai-tool-admin-tab-platformai.png)

- **Instances** — 管理用于启动智能体的命名实例。表格列出每个
  实例的 **Name ID**（即 `mai_instance_id`）及其关联的智能体；**+ New instance** 会打开
  一个 React 表单（Name、Instance ID、Status、Agent、按语言的标签）。

  ![Admin → Instances](/screenshots/react/melis-ai/melisai-tool-admin-tab-instances.png)

- **Usage** — 令牌/查询消耗，包含总量和按实例统计，可在可选的时间范围内查看。
- **MCP Server** — 选择服务器暴露哪些 MCP 函数，并标记敏感数据表。
- **Chat dev tool** — 一个开发者聊天控制台，并排显示原始 AI 载荷与响应；
  这是查看模型实际收到了什么、回答了什么的最快方式。

## 构建智能体（AI Agents）

在 **Melis AI → AI Agents** 下，你可以构建智能体的 **场景**。列表会显示已随附的智能体
及其步骤数和累计调用次数；打开某个智能体会新增一个子选项卡，其中包含五个选项卡的编辑器——
**Config · AI Tools · DB Rights · Scenario · Run**。

![AI Agents 列表](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents.png)

- **Config** — 名称、代号、描述、一个可选的模型覆盖，以及文件上传开关。
- **AI Tools** — 勾选该智能体可以调用的工具，分为 **MCP tools** 和 **Local tools** 两组；
  引擎随后只会将这些工具提供给模型。
- **DB Rights** — 按表设置读取 / 写入 / 删除 / 删表（drop），外加一个全局的 *Allow table creation*
  开关。写入、删除行和删表都是不可逆的。
- **Scenario** — 有序、带类型的步骤：**ENTRY PARAMS** → 一个或多个 **AI CONTEXT**
  （静默的系统/知识）→ **AI CHAT**（可见的对话轮次）→ **EXIT PARAMS**，可选包含 **CODE**
  步骤。可拖动重新排序；每个步骤都有一个 **Code**，你可以用 `[CODE]` 引用它，把前一
  步骤的答案拉入后续的提示词中。

  ![Agent → Scenario](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-scenario.png)

- **Run** — 针对该智能体的实时测试聊天（`agenttool` 实例），让你无需离开编辑器即可迭代
  场景和工具。

## AI 助手

全局 **AI 助手** 是位于每个屏幕右下角的浮动按钮（它没有菜单
入口）。它会打开一个运行通用 **Main Chat Assistant** 的聊天面板（实例
`mainchatassistantgeneral`），并能直接从对话中驱动后台——打开某个工具、打开某个页面。它
在页面导航之间保持挂载，因此已打开的会话在切换工具时不会中断。

![AI 助手面板已展开](/screenshots/react/melis-ai/melisai-footer-icon-generalassistant-deployed.png)

## 从你的代码中使用智能体

最简单的服务端集成方式仍然是 **`MelisAIChat` 视图辅助器**
（`melis-ai-engine/src/View/Helper/MelisAIChatViewHelper.php`）。将它放入 `.phtml` 视图中，即可
渲染一个绑定到某实例、可直接使用的聊天界面：

```php
<?= $this->MelisAIChat(
    $maiInstanceId,        // instance id from melis_ai_instances.mai_instance_id
    $agentId = null,       // optional explicit agent id
    $extraEntryParams = [],// custom_text / custom_files / custom_data
    $debugMode = false,
    $exitParamArr = []     // where to write the result back (fields, js/route callbacks)
) ?>
```

一种常见的做法是通过在实例 id 后缀一个 id 来 **为每个对象划定独立会话**，
例如 `"newscontentcreator|".$newsId`——这样每条新闻都能保有自己的对话。

在 React 后台中，等价物是由 `melis-ai-engine` 导出的 **`AiChatContainer`** 组件
（通过 `@melis-ai-engine` Vite 别名）。用一个 `maiInstanceId` 挂载它，它就会
针对 `/melis/react-api/ai-engine/*` 端点运行完整的 `init → run → (continue×N) → validate`
循环——无需任何后端工作：

```tsx
import { AiChatContainer } from '@melis-ai-engine'

<AiChatContainer maiInstanceId="newscontentcreator|42" clearSession autoRun />
```

::: tip 真实示例
`melis-ai-community-extensions` 附带了可运行的智能体——例如一个 *news content creator*，它接收
一段提示词 + 图片，并通过退出回调把生成的文案写回新闻表单。阅读
`vendor/melisplatform/melis-ai-community-extensions/src/Controller/NewsController.php` 可以看到
该辅助器的完整端到端用法。
:::

在编程层面，引擎通过
`MelisAIEngine\Service\MelisAIEngineAgentService`（`runAgent()`、`validateAnswer()`、
`continueConversation()`、`restartAgent()`、`getFinalAnswer()`）来驱动，针对每个智能体 + 实例
构建，其对话状态持久化在基于数据库的存储（`MelisAIEngineConversationStore`）中，而非 PHP
会话里。经典视图辅助器和 React 聊天容器都调用同一个服务。

## 工具

智能体可以在运行期间调用 **工具**（函数）——包括用于文件和数据库
操作的 **MCP 工具**。在你允许某个智能体使用这些工具之前，先用 **MCP Inspector**
（Melis AI → MCP Inspector）确认服务器已启动且其工具可被发现。详见专门的 [MCP](./mcp) 页面。

## 关键文件

| 关注点 | 路径 |
| --- | --- |
| 引擎服务 | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineService.php` |
| 智能体执行 | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineAgentService.php` |
| 聊天视图辅助器 | `vendor/melisplatform/melis-ai-engine/src/View/Helper/MelisAIChatViewHelper.php` |
| React 聊天容器 | `vendor/melisplatform/melis-ai-engine/ui-react/src/AiChatContainer.tsx` |
| React 聊天后端 | `vendor/melisplatform/melis-ai-engine/src/Controller/React/MelisReactApiAiEngineController.php` |
| Claude 服务商 | `vendor/melisplatform/melis-ai-engine-claude/src/Service/MelisAIEngineModelClaudeService.php` |
| Gemini 服务商 | `vendor/melisplatform/melis-ai-engine-gemini/src/Service/MelisAIEngineModelGeminiService.php` |
| React 后台 bricks | `vendor/melisplatform/melis-ai/ui-react/src/` |
| 示例智能体 | `vendor/melisplatform/melis-ai-community-extensions/` |

> 若要使用其中任意工具的经典（iframe）后台，请使用每个工具的 **Old** 切换开关——
> 其旧版行为记录在 [/legacy](/legacy/guide/ai) 下。请阅读各模块的代码以获取
> 准确、最新的 API——参见 [模块参考](../reference/modules)。
