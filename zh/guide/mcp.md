# MCP（模型上下文协议）

Melis 集成了 **[模型上下文协议（Model Context Protocol）](https://modelcontextprotocol.io/)**，使 AI
[智能体](/zh/guide/ai)能够在运行过程中调用 **工具**——读写文件、执行数据库操作、脚手架式生成模块。
Melis 同时也是一个 MCP **服务器**：这些相同的工具可以通过 HTTP 暴露给外部 MCP 客户端。
本页介绍其工作原理、如何添加你自己的 MCP 工具，以及如何将其暴露出去。

::: info 相同的引擎，全新的后台
Melis v6 保持 AI 引擎及其模块不变；它将后台替换为一套位于 **`/melis-react` 的 React 界面**。
本页所讲述的 MCP 工作方式——客户端、`mcp.tools.php` 配置、通过 stdio 启动服务器、安全性——与 v5 完全一致。
只有 *你点击操作的位置* 迁移到了新的 React 工具中（**Melis AI → Admin → MCP Server**、智能体的
**AI Tools** 允许列表，以及 **MCP Inspector**）。这些内容会在下文中专门指出。
:::

::: info 客户端*与*服务器
Melis 充当 **MCP 客户端**：它启动本地 MCP **服务器**（PHP 进程，stdio 传输），并在模型请求时调用其工具。

Melis 现在也可以充当 **MCP 服务器**——这些相同的工具可通过 **Streamable HTTP** 暴露给外部 MCP
客户端（Claude Desktop、MCP Inspector、你自己的集成）。在你明确暴露之前，任何工具都不可访问：
参见下文的 **将工具暴露给外部客户端**。
:::

## 内置 MCP 服务器

平台开箱即用地提供 **六个** MCP 服务器，分布在三个模块中（声明于
`melis-ai-engine/config/app.interface.php` 以及各模块的 `mcp.tools.php`）：

| 服务器（配置键） | 目录 | 模块 | 工具 |
| --- | --- | --- | --- |
| `file_operations` | `mcp/filemcp` | `melis-ai` | `createFile`, `createDirectory`, `pathExists`, `readFile`, `updateFiles`, `deleteFile`, `deleteDirectory` |
| `database_operations` | `mcp/dbmcp` | `melis-ai` | `get_table_structure`, `create_database_table`, `add_db_table_columns`, `update_db_table_columns`, `drop_db_table_columns`, `drop_database_table`, `selectData`, `insertData`, `updateData`, `deleteData`, `bulkInsertData` |
| `module_documents` | `mcp/documentationmcp` | `melis-ai` | `getDocModuleList`, `getModuleDoc`, `getModuleDocImage` |
| `navigation_operations` | `mcp/navigationmcp` | `melis-ai` | `listBackOfficeTools`, `openBackOfficeTool`, `listCmsPages`, `resolveHomepage`, `openCmsPage`, `navStep` |
| `tool_creator` | `mcp/toolcreator` | `melis-ai-tool-creator` | `createModule`, `activateModule`, `deactivateModule`, `generateBundle` |
| `minitemplate_creator` | `mcp/minitemplatecreator` | `melis-ai-community-extensions` | `readSiteAssets`, `getSitePublicUrl`, `uploadMinitemplateImages`, `renderMinitemplatePreview` |

每个服务器都基于同一套工具实现提供 **两种运行模式**：

- **stdio** —— `bin/server.php`，例如 `vendor/melisplatform/melis-ai/mcp/dbmcp/bin/server.php`。
  这是引擎在平台内执行智能体运行时所启动的模式，本地桌面客户端也可以接入。不可通过网络访问。
- **HTTP** —— `public/index.php`，由 `bin/serve.php`（一个 `php -S` 包装器）提供服务。
  这是可对外暴露的模式，也是唯一会应用下述允许列表的模式。

::: tip 服务器分布在多个模块中
它们并非都位于 `melis-ai` 之下。要清点某个安装实际包含哪些服务器：
```bash
ls -d vendor/melisplatform/melis-ai*/mcp/*/
```
`navigationmcp` 是一个特例——它没有自己的 `vendor/`，而是借用 `dbmcp` 的自动加载器。
:::
## 一次工具调用的流程

当模型（Claude/Gemini）在智能体运行期间请求调用某个函数时：

1. 提供商服务向 MCP 服务询问它是否为 MCP 工具——
   `MelisAIEngineMcpService::isMcpTool($name)`（标记为 `'mcp' => true` 的工具，或某个服务器已知的工具）。
2. 如果是，`invokeTool($name, $args)` 会找到对应的服务器，（重新）使用其进程，并通过 stdio 发送一个
   JSON-RPC `tools/call` 请求。
3. 服务器执行该工具并返回结果，结果再被反馈给模型。

MCP 客户端位于 `melis-ai-engine/src/Service/MelisAIEngineMcpService.php`（由用于通信、服务器管理、
工具管理、schema 发现、熔断和日志记录的多个 trait 组成）。

## `mcp.tools.php` 配置

模块通过提供一个 `config/mcp.tools.php` 来暴露 MCP 工具，该文件声明 **(a)** 供 AI 引擎使用的工具
schema，以及 **(b)** 处理这些工具的服务器。示例（节选自
`melis-ai-tool-creator/config/mcp.tools.php`）：

```php
return [
    'plugins' => ['melisaiengine' => ['datas' => [
        'function_declarations' => [
            [
                'name' => 'createModule',
                'description' => 'Create a Laminas module with all components.',
                'mcp' => true,                  // routed to an MCP server
                'input_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'moduleName'    => ['type' => 'string'],
                        'functionality' => ['type' => 'string'],
                        'needDBTable'   => ['type' => 'boolean'],
                    ],
                    'required' => ['moduleName', 'functionality', 'needDBTable'],
                ],
            ],
        ],
    ]]],
    'mcp' => ['servers' => [
        'tool_creator' => [
            'enabled'  => true,
            'module'   => 'melis-ai-tool-creator',
            'args'     => [__DIR__ . '/../mcp/toolcreator/bin/server.php'],
            'timeout'  => 600,
            'tools'    => ['createModule', 'activateModule', 'deactivateModule'],
        ],
    ]],
];
```

## 添加你自己的 MCP 工具

### 1. 编写服务器

`vendor/.../your-module/mcp/yourserver/bin/server.php`：

```php
#!/usr/bin/env php
<?php
require_once __DIR__ . '/../vendor/autoload.php';

use Mcp\Server;
use Mcp\Server\Transport\StdioTransport;
use YourNs\YourOperations;

$server = Server::builder()
    ->setServerInfo('your-mcp', '1.0.0')
    ->addTool([YourOperations::class, 'doSomething'])
    ->build();

$server->run(new StdioTransport());
```

### 2. 实现具体操作

```php
namespace YourNs;

use Mcp\Capability\Attribute\McpTool;

class YourOperations
{
    #[McpTool(name: 'doSomething', description: 'What this tool does')]
    public function doSomething(string $param1): array
    {
        return ['success' => true, 'result' => /* … */];
    }
}
```

### 3. 声明并加载配置

添加一个 `config/mcp.tools.php`（如上所示），声明 `function_declarations` 和
`mcp.servers` 条目，然后从你模块的 `Module::getConfig()` 中 `include` 它。

引擎会为你处理进程启动、基于 stdio 的 JSON-RPC、超时、重试和熔断。支持工具调用的模型随后即可在智能体运行期间
调用你的工具。

## 为智能体启用某个工具（React）

声明一个工具会使其 *可用*；但[智能体](/zh/guide/ai)只会看到你为其勾选的工具。
在 React 后台中，打开 **Melis AI → AI Agents**，打开（或创建）一个智能体，进入
**AI Tools** 标签页——这是一个分为 **MCP tools**（由 MCP 服务器提供）和 **Local tools**
（内置 PHP）的清单。勾选此智能体可调用的工具，引擎便会在每次运行时向模型提供且仅提供这些工具。
数据库 MCP 工具还会遵循智能体 **DB Rights** 标签页中按表设置的读/写/删除权限。

![智能体 AI Tools 允许列表](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-aitools.png)
*Melis AI → AI Agents → 某个智能体 → AI Tools：智能体可调用的 MCP tools（getTableStructure、createDatabaseTable、selectData、insertData…）和 Local tools。*

你可在 **Melis AI → Admin → MCP Server**（**MCP Exposition** 子标签页）中配置内置 MCP 服务器 *暴露*
哪些函数；只有被勾选的工具才会被提供。有关完整的智能体/实例模型，请参阅
[AI 指南](/zh/guide/ai)；有关工具和端点，请参阅
[`melis-ai` 参考](/zh/reference/modules/melis-ai)。

## 将工具暴露给外部客户端（服务器模式）

以 **HTTP 模式** 运行服务器会让其工具可被任何能够访问到它的 MCP 客户端调用，因此暴露过程刻意设置了多道关卡。
完整的运维指南（先本地 Docker，再 Kubernetes）随包提供，位于
`vendor/melisplatform/melis-ai/mcp/MCP-EXPOSURE-GUIDE.md`；以下是其摘要。

### 暴露工具允许列表

每个服务器的 `public/index.php` 会在启动时读取 **`melis_ai_mcp_exposed_tools`** 表，并且*只*注册其中列出的工具：

```php
$names        = $pdo->query('SELECT met_tool_name FROM melis_ai_mcp_exposed_tools')
                    ->fetchAll(PDO::FETCH_COLUMN);
$exposedNames = array_flip($names);

foreach ($allTools as $toolName => $callable) {
    if (isset($exposedNames[$toolName])) {
        $builder->addTool($callable);
    }
}
```

**空表——或数据库不可达——则不暴露任何工具**。这是首要的安全关卡：
`deleteData` 或 `drop_database_table` 这类破坏性工具只要不写入该表即可。
表中的值必须与各服务器 `public/index.php` 中 `$allTools` 的 camelCase 键名一致。

在 React 后台的 **Melis AI → Admin → MCP Server → MCP Exposition** 中管理该列表——
这是一份包含所有已声明函数的清单；勾选某个工具会插入对应记录，取消勾选则删除。
其背后由 `MelisReactApiAiMcpServerController`（`GET /melis/react-api/ai-mcp-server/data`、
`POST …/save-tools`）和 `MelisAIMcpExposedToolTable` 模型支撑。

::: warning 暴露之前请先检查入口文件
随包分发的 `public/index.php` 并不必然安全。某些服务器附带的是一条普通的
`Server::builder()->addTool(…)->build()` 链，会在没有数据库过滤的情况下注册**全部**工具。
在把它放到网络上之前，请打开该文件确认上述 `$allTools` + PDO 过滤循环确实存在。
:::

### 以 HTTP 方式运行服务器

`bin/serve.php` 会针对 `public/` 启动 PHP 内置 Web 服务器，并读取 `MCP_HOST` 与 `MCP_PORT`：

```bash
MCP_HOST=0.0.0.0 MCP_PORT=6276 php vendor/melisplatform/melis-ai/mcp/dbmcp/bin/serve.php
```

在 Docker 环境中，每个服务器都作为长期运行的 **supervisord** 程序运行。
参考端口分配（仅限内部——对外一律为 443）：

| Port | 服务器 |
| --- | --- |
| 6274 | UI MCP Inspector |
| 6275 | `filemcp` |
| 6276 | `dbmcp` |
| 6277 | Proxy MCP Inspector |
| 6278 | `documentationmcp` |
| 6279 | `navigationmcp` |
| 6280 | `toolcreator` |
| 6281 | `minitemplatecreator` |

HTTP 入口需要 `nyholm/psr7`、`nyholm/psr7-server` 和 `laminas/laminas-httphandlerrunner`。
`melis-ai/mcp/*` 下的服务器已自带这些依赖；其他模块中的服务器通常需要额外添加。

### 验证

每个服务器都会对 `GET /healthz` 返回 `ok`，但**仅凭 healthz 说明不了任何问题**——
它在 PSR-7 引导之前就返回了，因此 Composer 自动加载映射过期的服务器同样能通过 healthz，
却会在第一个真实请求上崩溃。请务必同时发送一次真正的握手：

```bash
curl -s -X POST http://127.0.0.1:6276/ \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"curl","version":"1.0"}}}'
```

响应中出现 JSON-RPC 的 `"result"` 才说明服务器真正可用。

### 远程发布

在 Kubernetes 中，这些服务器位于 nginx ingress 之后，443 端口启用 TLS 并配有 IP 白名单
（`whitelist-source-range`），因此 `627x` 端口永远不会被直接访问。可选两种路由策略：
每个服务器一个主机名（`https://dbmcp.<domain>/`），或者——在暴露多个服务器时推荐——
单一主机加路径路由（`https://mcp.<domain>/dbmcp`），其中 `use-regex` + `rewrite-target`
会剥离前缀，使每个后端仍然看到 `/` 和 `/healthz`。日后在两者之间切换只需改动 ingress。

::: danger `composer update` 会覆盖 vendor 中的改动
这些入口文件位于 `vendor/` 之下。执行 `composer update melisplatform/melis-ai`
（或其他包含 MCP 的模块）会重新解包，可能把带数据库过滤的 `public/index.php` 还原为暴露全部工具。
每次更新后都要重新验证，并把需要长期保留的改动提交到上游的包仓库，而不是留在 `vendor/` 中。
:::

## 检查 MCP 服务器（MCP Inspector）

React 后台在 **Melis AI → MCP Inspector**（路由
`/melis-ai/mcp-inspector`）下提供了一个 **MCP Inspector** 工具。它列出已连接的 MCP 服务器，并让你
**启动 / 检查状态 / 读取日志**，以便你在为某个智能体启用工具 *之前* 确认服务器已启动、且你期望的工具可被发现。
与每个 React 工具一样，它带有一个 **New / Old** 切换开关（**New** = React 页面；**Old** = iframe 中的经典工具），
后者会针对所选服务器启动官方的 MCP Inspector 界面，路径为
`vendor/melisplatform/melis-ai/src/Controller/McpInspectorController.php`。

Inspector 的 React 端点（`servers`、`launch`、`status`、`log`）位于
`MelisReactApiMcpInspectorController` 中——参见 [`melis-ai` 参考](/zh/reference/modules/melis-ai)。

## 安全性

文件/数据库 MCP 操作通过在 `melis-ai-engine/config/app.interface.php` 中配置的
`allowed_paths` / `forbidden_paths` 进行沙箱隔离（例如允许 `module`、`public`、`config`、`/tmp`；
禁止 `/etc`、`/bin`、`/root`…）。在启用写入类工具之前请审查这些配置。除沙箱之外，智能体的操作范围还受其
**AI Tools** 允许列表和 **DB Rights**（如上所述）的限制，因此模型只能触及你明确授予的内容。

在**服务器模式**下，各层防护叠加生效：工具必须存在于 `melis_ai_mcp_exposed_tools` 中才会被注册，
ingress 会基于源 IP 在 TLS 之上限制调用方，而文件/数据库沙箱依然作用于实际执行的操作。
请只暴露最小可用集合——优先暴露只读工具——并让破坏性工具始终不在列表之内。

## 关键文件

| 关注点 | 路径 |
| --- | --- |
| MCP 客户端服务 | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineMcpService.php` |
| 工具管理 trait | `vendor/melisplatform/melis-ai-engine/src/Service/Traits/Mcp/McpToolManagementTrait.php` |
| 服务器配置 | `vendor/melisplatform/melis-ai-engine/config/app.interface.php` |
| 示例 `mcp.tools.php` | `vendor/melisplatform/melis-ai-tool-creator/config/mcp.tools.php` |
| 示例服务器（stdio） | `vendor/melisplatform/melis-ai/mcp/dbmcp/bin/server.php` |
| 示例服务器（HTTP） | `vendor/melisplatform/melis-ai/mcp/dbmcp/public/index.php` |
| HTTP 启动器 | `vendor/melisplatform/melis-ai/mcp/dbmcp/bin/serve.php` |
| 暴露指南 | `vendor/melisplatform/melis-ai/mcp/MCP-EXPOSURE-GUIDE.md` |
| 暴露工具模型 | `vendor/melisplatform/melis-ai/src/Model/Tables/MelisAIMcpExposedToolTable.php` |
| MCP Server 标签页（React API） | `vendor/melisplatform/melis-ai/src/Controller/React/MelisReactApiAiMcpServerController.php` |
| Inspector（经典版） | `vendor/melisplatform/melis-ai/src/Controller/McpInspectorController.php` |
| Inspector（React API） | `vendor/melisplatform/melis-ai/src/Controller/React/MelisReactApiMcpInspectorController.php` |
