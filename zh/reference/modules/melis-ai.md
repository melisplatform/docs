# MelisAI

> MelisAI 套件的 React 后台——连接服务商、设计智能体、部署实例、监控用量、检查 MCP 服务器，并可随处发起聊天。软件包 `melisplatform/melis-ai`。

## 用途

MelisAI 是 MelisAI 套件的**后台管理层**。它本身并不运行 AI 模型——这是 `melis-ai-engine` 及其服务商模块的职责。它提供用于串联整个 AI 系统的 UI 与服务：连接一个服务商（**Platform AI**）、构建行为（带场景和工具白名单的 **AI Agents**）、将其部署为具名**实例（Instances）**、监控**用量（Usage）**、通过原始载荷聊天进行调试（**Chat Dev Tool**），以及检查已连接的 **MCP 服务器**。

在 **React 后台**（`/melis-react`）中，MelisAI 交付**单一的多砖块（multi-brick）捆绑包**，暴露三个原生 React 菜单工具——**Admin**、**AI Agents**、**MCP Inspector**——每个工具都带有一个通向其 iframe 中旧版工具的 **New / Old** 切换开关，**外加一个全局 AI 助手浮层**（每个界面上都有的悬浮聊天按钮，无菜单入口）。AI 逻辑保留在 `melis-ai-engine` 的服务端。

## 启用它

添加到 `config/melis.module.load.php`（服务商模块必须列在 `MelisAI` 之前）：

```php
return [
    'MelisAIEngine',
    'MelisAIEngineClaude',   // Anthropic provider
    'MelisAIEngineGemini',   // Google provider
    'MelisAI',
];
```

`MelisAI` 依赖 `melisplatform/melis-ai-engine`，后者拥有所有 `melis_ai_*` 数据库表以及智能体/场景运行时。服务商模块（`melis-ai-engine-claude`、`melis-ai-engine-gemini`、`-ollama`、`-oci`）实现服务商契约，必须为其各自的公司（company）安装。

## 四个核心名词

| 名词 | 表 | 关键列 | 描述 |
| --- | --- | --- | --- |
| **model（模型）** | `melis_ai_models`（`mam_*`） | `mam_generative_model` | 一行服务商模型：公司（Anthropic / Google）、模型字符串、API 密钥关联、默认标志、文件上传设置。 |
| **agent（智能体）** | `melis_ai_agents`（`maa_*`） | `maa_agent_tools`（JSON 白名单） | 一种行为：名称、智能体代码、可选的模型覆盖、有序的场景步骤、工具白名单。 |
| **instance（实例）** | `melis_ai_instances`（`mai_*`） | `mai_instance_id` | 智能体的具名部署。`mai_instance_id` 字符串是每个 UI 引用的稳定键（例如 `mainchatassistantgeneral`、`aitoolcreator`）。 |
| **tool（工具）** | `melis_ai_tools`（`mat_*`） | — | 模型可调用的函数。可以是 **MCP**（外部 MCP 服务器，`mcp: true`）或 **Local**（内置 PHP）。 |

**一句话心智模型：** 一个实例指向一个智能体，一个智能体指向一个模型，一个模型指定一家公司——由此选定服务商；实例上的聊天运行该智能体的场景，调用该智能体允许的工具。

## 它在 React 后台中的位置

MelisAI 交付**一个**砖块捆绑包（`public/ui-react/brick.js`），其清单声明了一个 `bricks: [...]` 数组——四项注册在 `brick.tsx` 中自注册：

| 砖块 id | 路由 | melisKey | 类型 |
| --- | --- | --- | --- |
| `ai-admin` | `/melis-ai/admin` | `melisadmin_tool` | 原生 React 标签页外壳（Usage / Platform AI / Instances / MCP Server / Chat dev tool） |
| `ai-agents` | `/melis-ai/ai-agents` | `melisagent_tool` | 原生 React 列表 + 编辑器（子标签页） |
| `mcp-inspector` | `/melis-ai/mcp-inspector` | `melis_mcp_inspector_tool` | 原生 React（单一功能） |
| `ai-assistant` | *（无）* | — | **浮层**——全局悬浮聊天 FAB，无路由、无菜单入口 |

这三个带路由的工具出现在左侧菜单的 **Melis AI** 之下（与由独立的 `melis-ai-tool-creator` 模块贡献的 **AI Tool Creator** 并列）。助手在外壳根部渲染一次，因此悬浮聊天在导航切换后仍然存在。它们仅在 MelisAI 处于激活状态时出现（通过 `GET /melis/react-api/react-modules` 进行砖块发现）。每个菜单工具都带有一个 **New / Old** 切换开关：**New** = React UI，**Old** = iframe 中的经典工具。

![React 侧边栏中的 Melis AI 区块——Admin、AI Agents、MCP Inspector、AI Tool Creator](/screenshots/react/melis-ai/melisai-menu-section-melisai.png)

## Admin——配置 AI

路由 `/melis-ai/admin`。一个原生 React 标签页外壳——**Usage · Platform AI · Instances · MCP Server · Chat dev tool**——带有单个 Save（保存当前激活的标签页）和一个作用于整个工具的 New/Old 切换开关。

- **Usage** —— 按公司/模型在某个时间范围内进行筛选；四张图表：总查询数（Total Queries）、每实例查询数（Queries per Instance）、总 Token 数（Total Tokens）、每实例 Token 数（Tokens per Instance）（每实例序列即你部署的实例）。由 `melis_ai_daily_usage` 支撑。

![Admin → Usage 标签页——公司/模型筛选器和四张图表（查询与 Token，总计与每实例），可选时间范围](/screenshots/react/melis-ai/melisai-tool-admin-tab-usage.png)

- **Platform AI** —— 开启 AI：选择公司 + 模型，选择 *Same key for all platforms*（所有平台使用同一密钥）或 *One key per platform*（每平台一个密钥），粘贴密钥，设置 **Status: Active** + **Default model: Yes**。外加 **Upload management**（上传管理）——用户/上下文文件开关，以及 **Upload mode: File API vs Embed in request**（上传模式：File API 与嵌入请求，即服务商读取的 `mam_file_upload_mode`；Gemini 默认使用 File API，Claude 默认嵌入）和最大文件大小。

![Admin → Platform AI 标签页——左侧为公司/模型/密钥，右侧为 Status + Default 开关以及 File Upload Management（File API 与 Embed in request、最大大小）](/screenshots/react/melis-ai/melisai-tool-admin-tab-platformai.png)

- **Instances** —— KPI 卡片（Total / Active / Inactive）、搜索、筛选器以及 **+ New instance**。开箱即用交付六个：三个**系统（system）**实例（仅可编辑、不可删除：`admintool`、`agenttool`、`mainchatassistantgeneral`）和三个**应用（app）**实例（可删除：`aitoolcreator`、`minitemplatecreator`、`newscontentcreator`）。编辑时会打开一个子标签页表单：**Name**、**Instance ID**（即 `mai_instance_id`）、**Status**、**Agent**（可选）以及按语言划分的 **Label**。

![Admin → Instances 标签页——KPI 卡片、搜索 + 筛选器，以及交付的六个实例（系统 + 应用），含其 Name ID 和关联的智能体](/screenshots/react/melis-ai/melisai-tool-admin-tab-instances.png)

![Admin → Instances——编辑表单：Name、Instance ID、Status、Agent 以及按语言划分的翻译](/screenshots/react/melis-ai/melisai-tool-admin-tab-instances-edit.png)

- **MCP Server** —— 两个子标签页：**MCP Exposition**（勾选 MCP 服务器向客户端暴露哪些 MCP 函数）和一个 **DB / sensitive tables**（数据库/敏感表）标签页；各自都有自己的 Save。
- **Chat Dev Tool** —— 一个调试聊天：选择一个智能体、聊天，并并排读取精确的 **raw AI PAYLOAD**（`tools` / `functionDeclarations`、上下文）和 **AI RESPONSE** JSON。

![Admin → Chat Dev Tool——选择一个智能体，左侧聊天，右侧读取原始 AI 载荷（functionDeclarations、tools、context）](/screenshots/react/melis-ai/melisai-tool-admin-tab-chatdevtool.png)

## AI Agents——设计行为

路由 `/melis-ai/ai-agents`。列表显示 **ID / Status / Name / Entries / Call number**（Entries = 场景步骤数，Call number = 累计 AI 调用次数），并带有 KPI 卡片、搜索、筛选器和 Export。打开一个智能体会新增一个子标签页，其中含五个标签页的编辑器和单个 Save。

![AI Agents 列表——KPI 卡片、搜索/筛选器，以及交付的智能体（Tool Builder、Mini-template Creator、News Content Creator、Main Chat Assistant），含步骤数和调用次数](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents.png)

| 标签页 | 用途 |
| --- | --- |
| **Config** | 智能体名称、智能体代码（稳定 slug）、描述、**Override default AI model**（覆盖默认 AI 模型，公司 + 模型）、文件上传开关、Active 开关。 |
| **AI Tools** | 能力白名单——勾选此智能体可调用的工具，分组为 **MCP tools**（由 MCP 服务器提供）和 **Local tools**（内置 PHP）。引擎恰好只向模型提供已勾选的工具。 |
| **DB Rights** | 按模块分组的每表 **read / write / delete row / drop** 复选框、一个全局 **Allow table creation** 开关、敏感表处理、搜索以及全部展开/折叠。 |
| **Scenario** | 有序的类型化步骤，支持拖拽重排和逐行编辑/删除：`ENTRY PARAMS` → `AI CONTEXT`（静默）→ `AI CHAT`（可见）→ `EXIT PARAMS`，外加可选的 `CODE` 步骤。每个步骤都有一个 **Code**，你可用 `[CODE]` 引用它以提取前一步的答案。编辑步骤会打开一个模态框（Code、Return type、Type of entry、带 General 编辑器 + 按语言覆盖的 AI Prompt）。 |
| **Run** | 针对该智能体的原地测试聊天（带可选的 *Custom step end prompt*），运行与助手相同的原生聊天。 |

![智能体编辑器 → Config 标签页——Status、智能体名称/代码/描述、模型覆盖（公司 + 模型）以及文件上传开关](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-config.png)

![智能体编辑器 → AI Tools 标签页——MCP tools 和 Local tools 的清单；标头显示目录中已勾选的数量](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-aitools.png)

![智能体编辑器 → DB Rights 标签页——按模块分组的每表 read/write/delete/drop 复选框、全局 “Allow table creation” 开关以及敏感表处理](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-dbrights.png)

![智能体编辑器 → Scenario 标签页——有序的类型化步骤（ENTRY PARAMS、AI CONTEXT、CODE、AI CHAT、EXIT PARAMS），支持拖拽重排和逐行编辑/删除](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-scenario.png)

![智能体编辑器 → 编辑步骤模态框——Code、Return type、Type of entry，以及带 General + 按语言标签页的 AI Prompt](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-scenario-editstep.png)

![智能体编辑器 → Run 标签页——原地测试聊天，带 “Custom step end prompt” 输入框和 Relaunch，实时运行该智能体](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-run.png)

### 交付的工具目录

| 分组 | 工具 |
| --- | --- |
| **MCP —— 数据库 schema/数据** | `getTableStructure`、`createDatabaseTable`、`addDBTableColumns`、`updateDBTableColumns`、`dropDBTableColumns`、`selectData`、`insertData`、`updateData`、`deleteData`、`bulkInsertData` |
| **MCP —— 文件系统** | `createFile`、`createDirectory`、`pathExists`、`readFile`、`updateFiles`、`deleteFile`、`deleteDirectory` |
| **MCP —— 站点/迷你模板**（CommunityExtensions） | `readSiteAssets`、`getSitePublicUrl`、`uploadMinitemplateImages`、`renderMinitemplatePreview` |
| **MCP —— 模块构建器**（ToolCreator） | `createModule`、`activateModule`、`deactivateModule`、`generateBundle` |
| **Local** | `activate_module` |

## MCP Inspector

路由 `/melis-ai/mcp-inspector`。一个原生 React 页面（带 New/Old 切换开关），列出已连接的 **MCP 服务器**，并让你启动 / 检查状态 / 读取日志——以便在允许智能体使用某个服务器的工具之前，确认该服务器已运行且其工具可被发现。由引擎的 `MelisAIEngineMcpService` 支撑。

## AI Assistant——随处发起聊天

悬浮的 **AI Assistant** 按钮（每个界面右下角）会打开一个运行通用 **Main Chat Assistant** 的聊天面板（智能体 id `1`，实例 `mainchatassistantgeneral`）。它可以从对话中驱动后台（打开一个工具、打开一个页面），由主机端通过 `window.melisReactActionMap` 派发。Minimise（最小化）保留会话，New session（新会话）重新开始，Close（关闭）结束会话。

![全局 AI Assistant 悬浮按钮（外壳右下角）——一个机器人图标，带有 MelisAi 的 “M” 渐变徽标](/screenshots/react/melis-ai/melisai-footer-icon-generalassistant.png)

![展开的 AI Assistant 面板——运行 `mainchatassistantgeneral` 实例的通用 “Main Chat Assistant”，标头中带有 Minimise / New session / Close](/screenshots/react/melis-ai/melisai-footer-icon-generalassistant-deployed.png)

## React API——端点

**不存在 `config/react-api.php`**：react-api 路由**内联声明在 `config/module.config.php` 中**，嫁接到 `melis-react-api` 父路由（前缀 `/melis/react-api`）之上。控制器位于 `src/Controller/React/MelisReactApiAi*Controller.php`。各处的契约：成功时返回 `{ success, data }`，失败时返回 `{ success:false, error }`；每次 fetch 都发送 `X-Requested-With: XMLHttpRequest` + 凭据。

每个控制器都自行实现访问守卫（而非通用 trait）：

```php
private const MELIS_KEY = 'melisadmin_tool'; // or melisagent_tool / melis_mcp_inspector_tool
if ($deny = $this->denyUnlessAccess()) { return $deny; }
//   → 401 if !isAuthenticated() ; else 403 unless MelisCoreRights::canAccess(self::MELIS_KEY)
```

| 界面（守卫） | 代表性端点（`/melis/react-api/…`） |
| --- | --- |
| **Admin**（`melisadmin_tool`） | `ai-usage/bootstrap` · `ai-usage/charts` · `ai-platform/data` · `ai-instances/{bootstrap,stats,list,save,:id,delete/:id}` · `ai-mcp-server/{data,save-tools,save-sensitive}` · `ai-chat-dev/{agents,run,continue}` |
| **AI Agents**（`melisagent_tool`） | `agents`（列表）· `agents/{stats,options,:id,save,delete/:id,db-rights/:id}` · `agents/scenario/{list,options,step/:id,…}` |
| **MCP Inspector**（`melis_mcp_inspector_tool`） | `mcp-inspector/{servers,launch,status,log}` |

场景**写操作**复用旧版 `/melis/MelisAI/AgentProperties/*` 端点（删除 / 重排 / 保存），因此所有校验、文件处理和代码唯一性都保留在服务端。示例（来自 `agent-api.ts`）：

```ts
const BASE = '/melis/react-api/agents'
await apiFetch<{ id: number }>(`${BASE}/save`, {
  method: 'POST',
  headers: { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json' },
  credentials: 'same-origin',
  body: JSON.stringify({
    id: 4, name: 'Tool Builder', code: 'aitoolcreator', modelId: null, status: 1,
    dbCanCreateTable: 1, tools: ['createModule', 'activateModule'],
    dbRights: { melis_cms_page: { read: true, write: false, delete_row: false, drop: false } },
  }),
})
```

## 能力（高级权限）

在 `config/react.capabilities.php` 的 `melisReactToolCapabilities` 下声明，以每个工具承载权限的 `melisKey` 为键。**默认允许、仅为声明式**：它们驱动 **Users → Rights** 中的复选框，并控制哪些 React 标签页/操作显示（`useCaps(melisKey).can(cap)`）；它们**不在服务端强制执行**（控制器仅通过 `canAccess` 对工具访问进行门控）。

- `melisadmin_tool` —— 粒度到**标签页**（`usage`、`platform_ai.edit`、`instances` + `create/edit/delete`、`chat_dev`、`mcp_server`，含嵌套的 `tools.edit` / `db.edit`）。
- `melisagent_tool` —— 工具级 CRUD（`list/create/edit/delete`）外加编辑器标签页（`general`、`tools`、`dbrights`、`scenario` + CRUD、`run`）。
- `melis_mcp_inspector_tool` —— 不声明任何内容；访问由单一的菜单工具访问复选框控制。

## 聊天 UI 依赖

每个聊天界面（助手浮层、智能体 **Run** 标签页、Admin **Chat Dev Tool**）都渲染从 **`@melis-ai-engine`** 导入的 `<AiChatContainer>`——这是指向 `../../melis-ai-engine/ui-react/src` 的一个 Vite 别名，因此聊天组件是**从 melis-ai-engine 源码捆绑**进此砖块的（而非外部化）。关键 props：`maiInstanceId`、`agentId`、`autoRun`、`showHeader`、`clearSession`、`extraEntryParams`。

对于要在**旧版 / 服务端渲染**视图中嵌入聊天框的开发者，`melis-ai-engine` 仍提供 `AIChatViewHelper($maiInstanceId, …)` 视图助手——参见[旧版 MelisAI 页面](/legacy/reference/modules/melis-ai)和 [melis-ai-engine](/legacy/reference/modules/melis-ai-engine)。

## 聊天流程（发送时发生了什么）

1. 某个聊天界面将用户轮次发送到引擎，针对给定的 `mai_instance_id`。
2. `MelisAIEngineAgentService::runAgent()` 解析 **实例 → 智能体 → 模型**，然后通过 `getActiveModelClass($company, $modelId, $agentId)` 选取服务商（公司 `Google` → Gemini，`Anthropic` → Claude）。
3. 引擎按顺序遍历智能体的**场景步骤**；`MelisAIEngineModelService::send()` 调用 AI API；工具调用经由 `MelisAIEngineMcpService` 路由（MCP 工具走 JSON-RPC，Local 工具直接 PHP 调用）。
4. 状态持久化到 `melis_ai_conversation_state`；Token/调用计数持久化到 `melis_ai_daily_usage`。

**MelisAI 从不自行调用 AI API——由引擎和服务商模块完成。**

## 扩展模式（应用模块如何接入）

1. **dbdeploy** 插入一个**智能体**（含场景 + 工具白名单）和一个带固定 `mai_instance_id` 的**实例**。
2. 在 `config['mcp']['servers']` 下注册一个 **MCP 服务器**，并在 `function_declarations` 中以 `mcp: true` 声明其工具。
3. 添加一个 UI 入口，用正确的入口/出口参数在 `<mai_instance_id>` 上打开聊天。

## 数据库表

MelisAI 本身不拥有任何 schema——所有表都由 `melis-ai-engine` 安装。前缀为 `melis_ai_*`。

| 表 | 保存内容 |
| --- | --- |
| `melis_ai_models`（`mam_*`） | 服务商模型行（公司、模型字符串、API 密钥关联、文件上传设置）。 |
| `melis_ai_companies`（`macp_*`） | 公司定义（Google、Anthropic、……）。 |
| `melis_ai_platform_keys`（`mapk_*`） | 服务商 API 密钥。 |
| `melis_ai_agents`（`maa_*`） | 智能体定义（代码、模型覆盖、`maa_agent_tools` JSON 白名单）。 |
| `melis_ai_agents_tools`（`maat_*`） | 智能体到工具的关联。 |
| `melis_ai_tools`（`mat_*`） | 工具目录（MCP / Local）。 |
| `melis_ai_instances`（`mai_*`） | 具名部署（稳定的 `mai_instance_id`）。 |
| `melis_ai_instance_trans`（`mait_*`） | 按语言划分的实例标签。 |
| `melis_ai_scenario_steps`（`mas_*`） | 每个智能体的有序场景步骤。 |
| `melis_ai_scenario_steps_datas`（`massd_*`） | 步骤数据（上下文文本、表单路径、……）。 |
| `melis_ai_scenario_steps_datas_entryexit`（`masse_*`） | 每个步骤的入口/出口参数定义。 |
| `melis_ai_return_types`（`mart_*`） | 出口返回类型定义。 |
| `melis_ai_files`（`maf_*`） | 附加到场景步骤的文件。 |
| `melis_ai_daily_usage`（`mau_*`） | Token 和查询用量计数器。 |
| `melis_ai_conversation_state`（`macs_*`） | 每用户的对话状态。 |

另见：[melis-ai-engine](/legacy/reference/modules/melis-ai-engine) · [melis-ai-engine-claude](/legacy/reference/modules/melis-ai-engine-claude) · [melis-ai-engine-gemini](/legacy/reference/modules/melis-ai-engine-gemini) · [melis-ai-tool-creator](/legacy/reference/modules/melis-ai-tool-creator) · [melis-ai-community-extensions](/legacy/reference/modules/melis-ai-community-extensions)
