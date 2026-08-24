# MCP (Model Context Protocol)

O Melis integra o **[Model Context Protocol](https://modelcontextprotocol.io/)** para que os
[agentes](./ai) de IA possam invocar **ferramentas** — ler/escrever ficheiros, executar operações
de base de dados, gerar a estrutura de módulos — durante uma execução. Esta página explica como
funciona e como adicionar a sua própria ferramenta MCP.

::: info Mesmo motor, novo back-office
O Melis v6 manteve o motor de IA e os seus módulos inalterados; substituiu o back-office por uma
**interface React em `/melis-react`**. Tudo o que esta página descreve sobre o funcionamento do
MCP — o cliente, a configuração `mcp.tools.php`, o arranque de servidores através de stdio, a
segurança — é idêntico ao v5. Apenas as partes de *onde clicar* passaram para as novas ferramentas
React (**Melis AI → Admin → MCP Server**, a lista de permissões **AI Tools** do agente e o
**MCP Inspector**). Essas são indicadas abaixo.
:::

::: info Cliente, não servidor (por agora)
O Melis atua como **cliente MCP**: lança **servidores** MCP locais (processos PHP, transporte
stdio) e invoca as suas ferramentas quando um modelo as solicita. Expor as próprias ferramentas do
Melis a clientes MCP *externos* (modo servidor) **ainda não** está implementado, e o transporte é
apenas stdio. A funcionalidade é usada internamente em produção, mas está em evolução ativa — leia
o código para conhecer o estado atual.
:::

## Servidores MCP integrados

De origem, o motor inclui quatro servidores MCP (declarados em
`melis-ai-engine/config/app.interface.php` e nos `mcp.tools.php` dos módulos):

| Servidor | Módulo | Ferramentas (exemplos) |
| --- | --- | --- |
| `file_operations` | `melis-ai` | `readFile`, `createFile`, `updateFiles`, `createDirectory`, `deleteFile`… |
| `database_operations` | `melis-ai` | `getTableStructure`, `createDatabaseTable`, `selectData`, `insertData`, `updateData`… |
| `tool_creator` | `melis-ai-tool-creator` | `createModule`, `activateModule`, `deactivateModule` |
| `minitemplate_creator` | `melis-ai-community-extensions` | `readSiteAssets`, `getSitePublicUrl`, `renderMinitemplatePreview`… |

Cada um é executado como um executável autónomo, por exemplo
`vendor/melisplatform/melis-ai/mcp/dbmcp/bin/server.php`.

## Como flui uma chamada de ferramenta

Quando um modelo (Claude/Gemini) pede para invocar uma função durante a execução de um agente:

1. O serviço do fornecedor pergunta ao serviço MCP se se trata de uma ferramenta MCP —
   `MelisAIEngineMcpService::isMcpTool($name)` (ferramentas marcadas com `'mcp' => true`, ou
   conhecidas por um servidor).
2. Em caso afirmativo, `invokeTool($name, $args)` encontra o servidor correto, (re)utiliza o seu
   processo e envia um pedido JSON-RPC `tools/call` através de stdio.
3. O servidor executa a ferramenta e devolve o resultado, que é reenviado ao modelo.

O cliente MCP encontra-se em `melis-ai-engine/src/Service/MelisAIEngineMcpService.php` (composto por
traits para comunicação, gestão de servidores, gestão de ferramentas, descoberta de esquemas,
disjuntor (circuit-breaking) e registo).

## A configuração `mcp.tools.php`

Um módulo expõe ferramentas MCP fornecendo um `config/mcp.tools.php` que declara **(a)** os esquemas
das ferramentas para o motor de IA e **(b)** o servidor que as processa. Exemplo (abreviado, de
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

## Adicionar a sua própria ferramenta MCP

### 1. Escrever o servidor

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

### 2. Implementar as operações

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

### 3. Declará-la e carregar a configuração

Adicione um `config/mcp.tools.php` (como acima) declarando as `function_declarations` e a entrada
`mcp.servers`, e depois faça o `include` a partir do `Module::getConfig()` do seu módulo.

O motor trata por si do arranque dos processos, do JSON-RPC através de stdio, dos tempos limite,
das repetições e do disjuntor (circuit-breaking). Os modelos que suportam chamadas de ferramentas
podem então invocar a sua ferramenta durante a execução de um agente.

## Permitir uma ferramenta num agente (React)

Declarar uma ferramenta torna-a *disponível*; um [agente](./ai) só vê as ferramentas que assinalar
para ele. No back-office React, abra **Melis AI → AI Agents**, abra (ou crie) um agente e vá ao
separador **AI Tools** — uma lista de verificação dividida em **MCP tools** (servidas por servidores
MCP) e **Local tools** (PHP integrado). Assinale as que este agente pode invocar, e o motor oferece
exatamente essas ao modelo em cada execução. As ferramentas MCP de base de dados também respeitam os
direitos de leitura/escrita/eliminação por tabela definidos no separador **DB Rights** do agente.

![Lista de permissões AI Tools do agente](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-aitools.png)
*Melis AI → AI Agents → um agente → AI Tools: as ferramentas MCP (getTableStructure, createDatabaseTable, selectData, insertData…) e as Local tools que um agente pode invocar.*

Configura quais as funções que o servidor MCP integrado *expõe* em **Melis AI → Admin → MCP
Server** (o subseparador **MCP Exposition**); apenas as ferramentas assinaladas são disponibilizadas.
Consulte o [guia de IA](./ai) para o modelo completo de agente/instância e a
[referência do `melis-ai`](/pt/reference/modules/melis-ai) para as ferramentas e endpoints.

## Inspecionar servidores MCP (MCP Inspector)

O back-office React inclui uma ferramenta **MCP Inspector** em **Melis AI → MCP Inspector** (rota
`/melis-ai/mcp-inspector`). Lista os servidores MCP ligados e permite-lhe **iniciar / verificar o
estado / ler os registos**, para que possa confirmar que um servidor está ativo e que as ferramentas
esperadas são detetáveis *antes* de as permitir num agente. Como todas as ferramentas React, dispõe
de um interruptor **New / Old** (**New** = a página React; **Old** = a ferramenta clássica num
iframe), que lança a interface oficial do MCP Inspector contra um servidor escolhido através de
`vendor/melisplatform/melis-ai/src/Controller/McpInspectorController.php`.

Os endpoints React do Inspector (`servers`, `launch`, `status`, `log`) encontram-se em
`MelisReactApiMcpInspectorController` — consulte a [referência do `melis-ai`](/pt/reference/modules/melis-ai).

## Segurança

As operações MCP de ficheiros/base de dados são executadas em sandbox através de `allowed_paths` /
`forbidden_paths` configurados em `melis-ai-engine/config/app.interface.php` (por exemplo, `module`,
`public`, `config`, `/tmp` permitidos; `/etc`, `/bin`, `/root`… proibidos). Reveja-os antes de
ativar ferramentas de escrita. Para além da sandbox, o alcance de um agente é limitado pela sua lista
de permissões **AI Tools** e pelos **DB Rights** (acima), pelo que um modelo só pode tocar naquilo
que concedeu explicitamente.

## Ficheiros principais

| Aspeto | Caminho |
| --- | --- |
| Serviço cliente MCP | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineMcpService.php` |
| Trait de gestão de ferramentas | `vendor/melisplatform/melis-ai-engine/src/Service/Traits/Mcp/McpToolManagementTrait.php` |
| Configuração do servidor | `vendor/melisplatform/melis-ai-engine/config/app.interface.php` |
| Exemplo de `mcp.tools.php` | `vendor/melisplatform/melis-ai-tool-creator/config/mcp.tools.php` |
| Exemplo de servidor | `vendor/melisplatform/melis-ai/mcp/dbmcp/bin/server.php` |
| Inspector (clássico) | `vendor/melisplatform/melis-ai/src/Controller/McpInspectorController.php` |
| Inspector (API React) | `vendor/melisplatform/melis-ai/src/Controller/React/MelisReactApiMcpInspectorController.php` |
