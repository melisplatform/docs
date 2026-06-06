# MCP (Model Context Protocol)

Melis integrates the **[Model Context Protocol](https://modelcontextprotocol.io/)** so that AI
[agents](./ai) can call **tools** — read/write files, run database operations, scaffold modules —
during a run. This page explains how it works and how to add your own MCP tool.

::: info Client, not server (today)
Melis acts as an **MCP client**: it launches local MCP **servers** (PHP processes, stdio
transport) and invokes their tools when a model requests them. Exposing Melis's own tools *to
external* MCP clients (server mode) is **not** implemented yet, and the transport is stdio only.
The feature is production-used internally but actively evolving — read the code for the current
state.
:::

## Built-in MCP servers

Out of the box, the engine ships four MCP servers (declared in
`melis-ai-engine/config/app.interface.php` and the modules' `mcp.tools.php`):

| Server | Module | Tools (examples) |
| --- | --- | --- |
| `file_operations` | `melis-ai` | `readFile`, `createFile`, `updateFiles`, `createDirectory`, `deleteFile`… |
| `database_operations` | `melis-ai` | `getTableStructure`, `createDatabaseTable`, `selectData`, `insertData`, `updateData`… |
| `tool_creator` | `melis-ai-tool-creator` | `createModule`, `activateModule`, `deactivateModule` |
| `minitemplate_creator` | `melis-ai-community-extensions` | `readSiteAssets`, `getSitePublicUrl`, `renderMinitemplatePreview`… |

Each runs as a standalone executable, e.g.
`vendor/melisplatform/melis-ai/mcp/dbmcp/bin/server.php`.

## How a tool call flows

When a model (Claude/Gemini) asks to call a function during an agent run:

1. The provider service asks the MCP service whether it's an MCP tool —
   `MelisAIEngineMcpService::isMcpTool($name)` (tools flagged `'mcp' => true`, or known to a server).
2. If yes, `invokeTool($name, $args)` finds the right server, (re)uses its process, and sends a
   JSON-RPC `tools/call` request over stdio.
3. The server runs the tool and returns the result, which is fed back to the model.

The MCP client lives in `melis-ai-engine/src/Service/MelisAIEngineMcpService.php` (composed of
traits for communication, server management, tool management, schema discovery, circuit-breaking
and logging).

## The `mcp.tools.php` config

A module exposes MCP tools by shipping a `config/mcp.tools.php` that declares **(a)** the tool
schemas for the AI engine and **(b)** the server that handles them. Example (abridged, from
`melis-ai-tool-creator/config/mcp.tools.php`):

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

## Add your own MCP tool

### 1. Write the server

`vendor/.../your-module/mcp/yourserver/bin/server.php`:

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

### 2. Implement the operations

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

### 3. Declare it & load the config

Add a `config/mcp.tools.php` (as above) declaring the `function_declarations` and the
`mcp.servers` entry, then `include` it from your module's `Module::getConfig()`.

The engine handles process spawning, JSON-RPC over stdio, timeouts, retries and circuit-breaking
for you. Models that support tool calling can then invoke your tool during an agent run.

## Inspect MCP servers

The backoffice ships an **MCP Inspector** (under *Melis AI*) — controller
`vendor/melisplatform/melis-ai/src/Controller/McpInspectorController.php` — that launches the
official MCP Inspector UI against a chosen server so you can browse and test its tools.

## Security

File/DB MCP operations are sandboxed via `allowed_paths` / `forbidden_paths` configured in
`melis-ai-engine/config/app.interface.php` (e.g. `module`, `public`, `config`, `/tmp` allowed;
`/etc`, `/bin`, `/root`… forbidden). Review these before enabling write tools.

## Key files

| Concern | Path |
| --- | --- |
| MCP client service | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineMcpService.php` |
| Tool management trait | `vendor/melisplatform/melis-ai-engine/src/Service/Traits/Mcp/McpToolManagementTrait.php` |
| Server config | `vendor/melisplatform/melis-ai-engine/config/app.interface.php` |
| Example `mcp.tools.php` | `vendor/melisplatform/melis-ai-tool-creator/config/mcp.tools.php` |
| Example server | `vendor/melisplatform/melis-ai/mcp/dbmcp/bin/server.php` |
| Inspector | `vendor/melisplatform/melis-ai/src/Controller/McpInspectorController.php` |
