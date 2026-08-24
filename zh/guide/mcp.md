# MCP（模型上下文协议）

Melis 集成了 **[模型上下文协议（Model Context Protocol）](https://modelcontextprotocol.io/)**，使 AI
[智能体](/zh/guide/ai)能够在运行过程中调用 **工具**——读写文件、执行数据库操作、脚手架式生成模块。
本页介绍其工作原理，以及如何添加你自己的 MCP 工具。

::: info 相同的引擎，全新的后台
Melis v6 保持 AI 引擎及其模块不变；它将后台替换为一套位于 **`/melis-react` 的 React 界面**。
本页所讲述的 MCP 工作方式——客户端、`mcp.tools.php` 配置、通过 stdio 启动服务器、安全性——与 v5 完全一致。
只有 *你点击操作的位置* 迁移到了新的 React 工具中（**Melis AI → Admin → MCP Server**、智能体的
**AI Tools** 允许列表，以及 **MCP Inspector**）。这些内容会在下文中专门指出。
:::

::: info 客户端，而非服务器（当前）
Melis 充当 **MCP 客户端**：它启动本地 MCP **服务器**（PHP 进程，stdio 传输），并在模型请求时调用其工具。
将 Melis 自身的工具 *对外* 暴露给外部 MCP 客户端（服务器模式）**尚未** 实现，且传输方式仅支持 stdio。
该功能已在内部投入生产使用，但仍在积极演进——请阅读代码以了解当前状态。
:::

## 内置 MCP 服务器

开箱即用，引擎提供了四个 MCP 服务器（在
`melis-ai-engine/config/app.interface.php` 及各模块的 `mcp.tools.php` 中声明）：

| 服务器 | 模块 | 工具（示例） |
| --- | --- | --- |
| `file_operations` | `melis-ai` | `readFile`、`createFile`、`updateFiles`、`createDirectory`、`deleteFile`… |
| `database_operations` | `melis-ai` | `getTableStructure`、`createDatabaseTable`、`selectData`、`insertData`、`updateData`… |
| `tool_creator` | `melis-ai-tool-creator` | `createModule`、`activateModule`、`deactivateModule` |
| `minitemplate_creator` | `melis-ai-community-extensions` | `readSiteAssets`、`getSitePublicUrl`、`renderMinitemplatePreview`… |

每个服务器都作为独立可执行文件运行，例如
`vendor/melisplatform/melis-ai/mcp/dbmcp/bin/server.php`。

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

## 关键文件

| 关注点 | 路径 |
| --- | --- |
| MCP 客户端服务 | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineMcpService.php` |
| 工具管理 trait | `vendor/melisplatform/melis-ai-engine/src/Service/Traits/Mcp/McpToolManagementTrait.php` |
| 服务器配置 | `vendor/melisplatform/melis-ai-engine/config/app.interface.php` |
| 示例 `mcp.tools.php` | `vendor/melisplatform/melis-ai-tool-creator/config/mcp.tools.php` |
| 示例服务器 | `vendor/melisplatform/melis-ai/mcp/dbmcp/bin/server.php` |
| Inspector（经典版） | `vendor/melisplatform/melis-ai/src/Controller/McpInspectorController.php` |
| Inspector（React API） | `vendor/melisplatform/melis-ai/src/Controller/React/MelisReactApiMcpInspectorController.php` |
