# MCP (Model Context Protocol)

Melis integra el **[Model Context Protocol](https://modelcontextprotocol.io/)** para que los
[agentes](./ai) de IA puedan llamar a **herramientas** — leer/escribir archivos, ejecutar operaciones
de base de datos, generar la estructura de módulos — durante una ejecución. Esta página explica cómo
funciona y cómo añadir tu propia herramienta MCP.

::: info Mismo motor, nuevo back-office
Melis v6 mantuvo el motor de IA y sus módulos sin cambios; sustituyó el back-office por una **interfaz
React en `/melis-react`**. Todo lo que se explica en esta página sobre cómo funciona MCP — el cliente,
la configuración `mcp.tools.php`, el arranque de servidores por stdio, la seguridad — es idéntico a v5.
Solo se trasladaron a las nuevas herramientas React las partes de *dónde haces clic* (**Melis AI →
Admin → MCP Server**, la lista de permitidos **AI Tools** del agente y el **MCP Inspector**). Estas se
señalan más abajo.
:::

::: info Cliente, no servidor (por ahora)
Melis actúa como **cliente MCP**: lanza **servidores** MCP locales (procesos PHP, transporte stdio) e
invoca sus herramientas cuando un modelo lo solicita. Exponer las propias herramientas de Melis *a
clientes MCP externos* (modo servidor) **aún no** está implementado, y el transporte es únicamente
stdio. La funcionalidad se usa en producción de forma interna pero evoluciona activamente — consulta
el código para conocer su estado actual.
:::

## Servidores MCP integrados

De serie, el motor incluye cuatro servidores MCP (declarados en
`melis-ai-engine/config/app.interface.php` y en los `mcp.tools.php` de los módulos):

| Servidor | Módulo | Herramientas (ejemplos) |
| --- | --- | --- |
| `file_operations` | `melis-ai` | `readFile`, `createFile`, `updateFiles`, `createDirectory`, `deleteFile`… |
| `database_operations` | `melis-ai` | `getTableStructure`, `createDatabaseTable`, `selectData`, `insertData`, `updateData`… |
| `tool_creator` | `melis-ai-tool-creator` | `createModule`, `activateModule`, `deactivateModule` |
| `minitemplate_creator` | `melis-ai-community-extensions` | `readSiteAssets`, `getSitePublicUrl`, `renderMinitemplatePreview`… |

Cada uno se ejecuta como un ejecutable independiente, p. ej.
`vendor/melisplatform/melis-ai/mcp/dbmcp/bin/server.php`.

## Cómo fluye una llamada a herramienta

Cuando un modelo (Claude/Gemini) solicita llamar a una función durante la ejecución de un agente:

1. El servicio del proveedor pregunta al servicio MCP si se trata de una herramienta MCP —
   `MelisAIEngineMcpService::isMcpTool($name)` (herramientas marcadas con `'mcp' => true`, o conocidas por un servidor).
2. Si es así, `invokeTool($name, $args)` localiza el servidor adecuado, (re)utiliza su proceso y envía
   una petición JSON-RPC `tools/call` por stdio.
3. El servidor ejecuta la herramienta y devuelve el resultado, que se vuelve a pasar al modelo.

El cliente MCP reside en `melis-ai-engine/src/Service/MelisAIEngineMcpService.php` (compuesto por
traits para comunicación, gestión de servidores, gestión de herramientas, descubrimiento de esquemas,
circuit-breaking y registro).

## La configuración `mcp.tools.php`

Un módulo expone herramientas MCP incluyendo un `config/mcp.tools.php` que declara **(a)** los
esquemas de las herramientas para el motor de IA y **(b)** el servidor que las gestiona. Ejemplo
(abreviado, de `melis-ai-tool-creator/config/mcp.tools.php`):

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

## Añade tu propia herramienta MCP

### 1. Escribe el servidor

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

### 2. Implementa las operaciones

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

### 3. Decláralo y carga la configuración

Añade un `config/mcp.tools.php` (como el anterior) que declare las `function_declarations` y la
entrada `mcp.servers`, y luego haz un `include` desde el `Module::getConfig()` de tu módulo.

El motor se encarga por ti del arranque de procesos, JSON-RPC por stdio, tiempos de espera,
reintentos y circuit-breaking. Los modelos que admiten llamadas a herramientas podrán entonces
invocar tu herramienta durante la ejecución de un agente.

## Permitir una herramienta en un agente (React)

Declarar una herramienta la hace *disponible*; un [agente](./ai) solo ve las herramientas que marques
para él. En el back-office React, abre **Melis AI → AI Agents**, abre (o crea) un agente y ve a la
pestaña **AI Tools** — una lista de verificación dividida en **MCP tools** (servidas por servidores
MCP) y **Local tools** (PHP integrado). Marca las que este agente puede llamar, y el motor ofrecerá
exactamente esas al modelo en cada ejecución. Las herramientas MCP de base de datos también respetan
los permisos de lectura/escritura/borrado por tabla de la pestaña **DB Rights** del agente.

![Lista de herramientas permitidas AI Tools del agente](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-aitools.png)
*Melis AI → AI Agents → un agente → AI Tools: las MCP tools (getTableStructure, createDatabaseTable, selectData, insertData…) y Local tools que un agente puede llamar.*

Puedes configurar qué funciones *expone* el servidor MCP integrado en **Melis AI → Admin → MCP
Server** (la subpestaña **MCP Exposition**); solo se ponen a disposición las herramientas marcadas.
Consulta la [guía de IA](./ai) para el modelo completo de agentes/instancias y la
[referencia de `melis-ai`](/es/reference/modules/melis-ai) para las herramientas y endpoints.

## Inspeccionar servidores MCP (MCP Inspector)

El back-office React incluye una herramienta **MCP Inspector** en **Melis AI → MCP Inspector** (ruta
`/melis-ai/mcp-inspector`). Muestra los servidores MCP conectados y te permite **lanzar / comprobar
el estado / leer registros** para que puedas confirmar que un servidor está activo y que las
herramientas que esperas son detectables *antes* de permitirlas en un agente. Como toda herramienta
React, incluye un conmutador **New / Old** (**New** = la página React; **Old** = la herramienta
clásica en un iframe), que lanza la interfaz oficial del MCP Inspector contra un servidor elegido a
través de `vendor/melisplatform/melis-ai/src/Controller/McpInspectorController.php`.

Los endpoints React del Inspector (`servers`, `launch`, `status`, `log`) residen en
`MelisReactApiMcpInspectorController` — consulta la [referencia de `melis-ai`](/es/reference/modules/melis-ai).

## Seguridad

Las operaciones MCP de archivos/base de datos están aisladas mediante `allowed_paths` /
`forbidden_paths` configurados en `melis-ai-engine/config/app.interface.php` (p. ej. `module`,
`public`, `config`, `/tmp` permitidos; `/etc`, `/bin`, `/root`… prohibidos). Revísalos antes de
habilitar herramientas de escritura. Además del aislamiento, el alcance de un agente queda limitado
por su lista de permitidos **AI Tools** y sus **DB Rights** (arriba), de modo que un modelo solo puede
tocar lo que le hayas concedido explícitamente.

## Archivos clave

| Aspecto | Ruta |
| --- | --- |
| Servicio cliente MCP | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineMcpService.php` |
| Trait de gestión de herramientas | `vendor/melisplatform/melis-ai-engine/src/Service/Traits/Mcp/McpToolManagementTrait.php` |
| Configuración del servidor | `vendor/melisplatform/melis-ai-engine/config/app.interface.php` |
| Ejemplo `mcp.tools.php` | `vendor/melisplatform/melis-ai-tool-creator/config/mcp.tools.php` |
| Ejemplo de servidor | `vendor/melisplatform/melis-ai/mcp/dbmcp/bin/server.php` |
| Inspector (clásico) | `vendor/melisplatform/melis-ai/src/Controller/McpInspectorController.php` |
| Inspector (API React) | `vendor/melisplatform/melis-ai/src/Controller/React/MelisReactApiMcpInspectorController.php` |
