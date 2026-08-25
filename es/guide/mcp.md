# MCP (Model Context Protocol)

Melis integra el **[Model Context Protocol](https://modelcontextprotocol.io/)** para que los
[agentes](./ai) de IA puedan llamar a **herramientas** — leer/escribir archivos, ejecutar operaciones
de base de datos, generar la estructura de módulos — durante una ejecución. Melis es también un
**servidor** MCP: esas mismas herramientas pueden exponerse por HTTP a clientes MCP externos. Esta
página explica cómo funciona, cómo añadir tu propia herramienta MCP y cómo exponerla.

::: info Mismo motor, nuevo back-office
Melis v6 mantuvo el motor de IA y sus módulos sin cambios; sustituyó el back-office por una **interfaz
React en `/melis-react`**. Todo lo que se explica en esta página sobre cómo funciona MCP — el cliente,
la configuración `mcp.tools.php`, el arranque de servidores por stdio, la seguridad — es idéntico a v5.
Solo se trasladaron a las nuevas herramientas React las partes de *dónde haces clic* (**Melis AI →
Admin → MCP Server**, la lista de permitidos **AI Tools** del agente y el **MCP Inspector**). Estas se
señalan más abajo.
:::

::: info Cliente *y* servidor
Melis actúa como **cliente MCP**: lanza **servidores** MCP locales (procesos PHP, transporte stdio)
e invoca sus herramientas cuando un modelo lo solicita.

Melis ya puede actuar también como **servidor MCP** — esas mismas herramientas son exponibles por
**Streamable HTTP** a clientes MCP externos (Claude Desktop, el MCP Inspector, tus propias
integraciones). Nada es accesible hasta que lo expones explícitamente: consulta
**Exponer herramientas a clientes externos** más abajo.
:::

## Servidores MCP integrados

Por defecto la plataforma incluye **seis** servidores MCP, repartidos en tres módulos (declarados en
`melis-ai-engine/config/app.interface.php` y en los `mcp.tools.php` de los módulos):

| Servidor (clave de configuración) | Directorio | Módulo | Herramientas |
| --- | --- | --- | --- |
| `file_operations` | `mcp/filemcp` | `melis-ai` | `createFile`, `createDirectory`, `pathExists`, `readFile`, `updateFiles`, `deleteFile`, `deleteDirectory` |
| `database_operations` | `mcp/dbmcp` | `melis-ai` | `get_table_structure`, `create_database_table`, `add_db_table_columns`, `update_db_table_columns`, `drop_db_table_columns`, `drop_database_table`, `selectData`, `insertData`, `updateData`, `deleteData`, `bulkInsertData` |
| `module_documents` | `mcp/documentationmcp` | `melis-ai` | `getDocModuleList`, `getModuleDoc`, `getModuleDocImage` |
| `navigation_operations` | `mcp/navigationmcp` | `melis-ai` | `listBackOfficeTools`, `openBackOfficeTool`, `listCmsPages`, `resolveHomepage`, `openCmsPage`, `navStep` |
| `tool_creator` | `mcp/toolcreator` | `melis-ai-tool-creator` | `createModule`, `activateModule`, `deactivateModule`, `generateBundle` |
| `minitemplate_creator` | `mcp/minitemplatecreator` | `melis-ai-community-extensions` | `readSiteAssets`, `getSitePublicUrl`, `uploadMinitemplateImages`, `renderMinitemplatePreview` |

Cada servidor ofrece **dos modos de ejecución** a partir de las mismas implementaciones:

- **stdio** — `bin/server.php`, p. ej. `vendor/melisplatform/melis-ai/mcp/dbmcp/bin/server.php`. Es
  lo que lanza el motor para las ejecuciones de agentes dentro de la plataforma, y a lo que puede
  conectarse un cliente de escritorio local. No accesible por red.
- **HTTP** — `public/index.php`, servido por `bin/serve.php` (un envoltorio de `php -S`). Es el modo
  exponible en red, y el único que aplica la lista de permitidos de abajo.

::: tip Los servidores viven en varios módulos
No están todos bajo `melis-ai`. Para inventariar lo que una instalación tiene realmente:
```bash
ls -d vendor/melisplatform/melis-ai*/mcp/*/
```
`navigationmcp` es un caso especial: no tiene `vendor/` propio y toma prestado el autoloader de
`dbmcp`.
:::
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

## Exponer herramientas a clientes externos (modo servidor)

Ejecutar un servidor en **modo HTTP** hace que sus herramientas sean invocables por cualquier
cliente MCP que pueda alcanzarlo, así que la exposición está deliberadamente controlada en varias
capas. La guía operativa completa (Docker en local y después Kubernetes) viene con el paquete en
`vendor/melisplatform/melis-ai/mcp/MCP-EXPOSURE-GUIDE.md`; esto es el resumen.

### La lista de herramientas expuestas

El `public/index.php` de cada servidor lee la tabla **`melis_ai_mcp_exposed_tools`** al arrancar y
registra *solo* las herramientas que figuran en ella:

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

Una **tabla vacía —o una base de datos inaccesible— no expone nada**. Esa es la salvaguarda
principal: herramientas destructivas como `deleteData` o `drop_database_table` simplemente se quedan
fuera de la tabla. Los valores deben coincidir con las claves camelCase de `$allTools` en el
`public/index.php` de cada servidor.

Gestiona la lista desde el back-office React en **Melis AI → Admin → MCP Server → MCP Exposition**:
una lista de todas las funciones declaradas; marcar una herramienta inserta su fila y desmarcarla la
elimina. Está respaldado por `MelisReactApiAiMcpServerController`
(`GET /melis/react-api/ai-mcp-server/data`, `POST …/save-tools`) y el modelo
`MelisAIMcpExposedToolTable`.

::: warning Revisa el punto de entrada antes de exponer
Un `public/index.php` distribuido no es automáticamente seguro. Algunos servidores incluyen una
cadena `Server::builder()->addTool(…)->build()` sin filtrado en base de datos, que registra **todas**
las herramientas. Abre el archivo y confirma que está el bucle `$allTools` + PDO de arriba antes de
ponerlo en una red.
:::

### Ejecutar un servidor por HTTP

`bin/serve.php` arranca el servidor web integrado de PHP sobre `public/`, leyendo `MCP_HOST` y
`MCP_PORT`:

```bash
MCP_HOST=0.0.0.0 MCP_PORT=6276 php vendor/melisplatform/melis-ai/mcp/dbmcp/bin/serve.php
```

En una stack Docker cada servidor corre como un programa **supervisord** de larga duración. El
reparto de puertos de referencia (solo interno; de puertas afuera todo es 443):

| Port | Servidor |
| --- | --- |
| 6274 | UI MCP Inspector |
| 6275 | `filemcp` |
| 6276 | `dbmcp` |
| 6277 | Proxy MCP Inspector |
| 6278 | `documentationmcp` |
| 6279 | `navigationmcp` |
| 6280 | `toolcreator` |
| 6281 | `minitemplatecreator` |

El punto de entrada HTTP necesita `nyholm/psr7`, `nyholm/psr7-server` y
`laminas/laminas-httphandlerrunner`. Los servidores bajo `melis-ai/mcp/*` ya los incluyen; los de
otros módulos suelen tener que añadirlos.

### Verificar

Todos los servidores responden `ok` a `GET /healthz`, pero **healthz por sí solo no demuestra
nada**: responde antes del arranque de PSR-7, así que un servidor con el autoloader de Composer
desactualizado pasa healthz y falla en la primera petición real. Envía siempre también un handshake
de verdad:

```bash
curl -s -X POST http://127.0.0.1:6276/ \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"curl","version":"1.0"}}}'
```

Un `"result"` JSON-RPC en la respuesta significa que el servidor funciona de verdad.

### Publicar en remoto

En Kubernetes los servidores quedan detrás del ingress de nginx con TLS en el 443 y una lista blanca
de IP (`whitelist-source-range`), de modo que los puertos `627x` nunca son accesibles directamente.
Hay dos estrategias de enrutado: un hostname por servidor (`https://dbmcp.<dominio>/`) o —
recomendada cuando expones varios— un único host con enrutado por ruta
(`https://mcp.<dominio>/dbmcp`), donde `use-regex` + `rewrite-target` eliminan el prefijo para que
cada backend siga viendo `/` y `/healthz`. Cambiar de una a otra más adelante afecta solo al
ingress.

::: danger `composer update` borra los cambios en vendor
Estos puntos de entrada viven bajo `vendor/`. Ejecutar `composer update melisplatform/melis-ai` (o
los demás módulos con MCP) vuelve a extraer el paquete y puede revertir un `public/index.php` con
filtrado en base de datos a exponerlo todo. Vuelve a verificar tras cada actualización y lleva los
cambios duraderos aguas arriba, a los repositorios de los paquetes, en lugar de a `vendor/`.
:::

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

En **modo servidor** las capas se acumulan: una herramienta tiene que estar en
`melis_ai_mcp_exposed_tools` para siquiera registrarse, el ingress restringe a quien llama por IP de
origen sobre TLS, y el aislamiento de archivos/base de datos sigue aplicándose a lo que se ejecute.
Expón el conjunto útil más pequeño —primero las herramientas de solo lectura— y mantén las
destructivas fuera de la lista.

## Archivos clave

| Aspecto | Ruta |
| --- | --- |
| Servicio cliente MCP | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineMcpService.php` |
| Trait de gestión de herramientas | `vendor/melisplatform/melis-ai-engine/src/Service/Traits/Mcp/McpToolManagementTrait.php` |
| Configuración del servidor | `vendor/melisplatform/melis-ai-engine/config/app.interface.php` |
| Ejemplo `mcp.tools.php` | `vendor/melisplatform/melis-ai-tool-creator/config/mcp.tools.php` |
| Ejemplo de servidor (stdio) | `vendor/melisplatform/melis-ai/mcp/dbmcp/bin/server.php` |
| Ejemplo de servidor (HTTP) | `vendor/melisplatform/melis-ai/mcp/dbmcp/public/index.php` |
| Lanzador HTTP | `vendor/melisplatform/melis-ai/mcp/dbmcp/bin/serve.php` |
| Guía de exposición | `vendor/melisplatform/melis-ai/mcp/MCP-EXPOSURE-GUIDE.md` |
| Modelo de herramientas expuestas | `vendor/melisplatform/melis-ai/src/Model/Tables/MelisAIMcpExposedToolTable.php` |
| Pestaña MCP Server (API React) | `vendor/melisplatform/melis-ai/src/Controller/React/MelisReactApiAiMcpServerController.php` |
| Inspector (clásico) | `vendor/melisplatform/melis-ai/src/Controller/McpInspectorController.php` |
| Inspector (API React) | `vendor/melisplatform/melis-ai/src/Controller/React/MelisReactApiMcpInspectorController.php` |
