# MCP (Model Context Protocol)

O Melis integra o **[Model Context Protocol](https://modelcontextprotocol.io/)** para que os
[agentes](./ai) de IA possam invocar **ferramentas** — ler/escrever ficheiros, executar operações
de base de dados, gerar a estrutura de módulos — durante uma execução. O Melis é também um
**servidor** MCP: essas mesmas ferramentas podem ser expostas por HTTP a clientes MCP externos. Esta
página explica como funciona, como adicionar a sua própria ferramenta MCP e como expô-la.

::: info Mesmo motor, novo back-office
O Melis v6 manteve o motor de IA e os seus módulos inalterados; substituiu o back-office por uma
**interface React em `/melis-react`**. Tudo o que esta página descreve sobre o funcionamento do
MCP — o cliente, a configuração `mcp.tools.php`, o arranque de servidores através de stdio, a
segurança — é idêntico ao v5. Apenas as partes de *onde clicar* passaram para as novas ferramentas
React (**Melis AI → Admin → MCP Server**, a lista de permissões **AI Tools** do agente e o
**MCP Inspector**). Essas são indicadas abaixo.
:::

::: info Cliente *e* servidor
O Melis atua como **cliente MCP**: lança **servidores** MCP locais (processos PHP, transporte stdio)
e invoca as suas ferramentas quando um modelo o pede.

O Melis já pode atuar também como **servidor MCP** — essas mesmas ferramentas são exponíveis por
**Streamable HTTP** a clientes MCP externos (Claude Desktop, o MCP Inspector, as suas próprias
integrações). Nada fica acessível enquanto não o expuser explicitamente: veja
**Expor ferramentas a clientes externos** mais abaixo.
:::

## Servidores MCP integrados

Por omissão a plataforma inclui **seis** servidores MCP, distribuídos por três módulos (declarados em
`melis-ai-engine/config/app.interface.php` e nos `mcp.tools.php` dos módulos):

| Servidor (chave de configuração) | Diretório | Módulo | Ferramentas |
| --- | --- | --- | --- |
| `file_operations` | `mcp/filemcp` | `melis-ai` | `createFile`, `createDirectory`, `pathExists`, `readFile`, `updateFiles`, `deleteFile`, `deleteDirectory` |
| `database_operations` | `mcp/dbmcp` | `melis-ai` | `get_table_structure`, `create_database_table`, `add_db_table_columns`, `update_db_table_columns`, `drop_db_table_columns`, `drop_database_table`, `selectData`, `insertData`, `updateData`, `deleteData`, `bulkInsertData` |
| `module_documents` | `mcp/documentationmcp` | `melis-ai` | `getDocModuleList`, `getModuleDoc`, `getModuleDocImage` |
| `navigation_operations` | `mcp/navigationmcp` | `melis-ai` | `listBackOfficeTools`, `openBackOfficeTool`, `listCmsPages`, `resolveHomepage`, `openCmsPage`, `navStep` |
| `tool_creator` | `mcp/toolcreator` | `melis-ai-tool-creator` | `createModule`, `activateModule`, `deactivateModule`, `generateBundle` |
| `minitemplate_creator` | `mcp/minitemplatecreator` | `melis-ai-community-extensions` | `readSiteAssets`, `getSitePublicUrl`, `uploadMinitemplateImages`, `renderMinitemplatePreview` |

Cada servidor oferece **dois modos de execução** a partir das mesmas implementações:

- **stdio** — `bin/server.php`, por exemplo
  `vendor/melisplatform/melis-ai/mcp/dbmcp/bin/server.php`. É o que o motor lança para as execuções
  de agentes dentro da plataforma, e aquilo a que um cliente desktop local se pode ligar. Não
  acessível pela rede.
- **HTTP** — `public/index.php`, servido por `bin/serve.php` (um wrapper de `php -S`). É o modo
  exponível na rede, e o único que aplica a lista de permissões abaixo.

::: tip Os servidores vivem em vários módulos
Não estão todos sob `melis-ai`. Para inventariar o que uma instalação tem realmente:
```bash
ls -d vendor/melisplatform/melis-ai*/mcp/*/
```
`navigationmcp` é um caso especial: não tem `vendor/` próprio e usa emprestado o autoloader do
`dbmcp`.
:::
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

## Expor ferramentas a clientes externos (modo servidor)

Executar um servidor em **modo HTTP** torna as suas ferramentas invocáveis por qualquer cliente MCP
que lhe consiga chegar, pelo que a exposição é deliberadamente protegida em várias camadas. O guia
operacional completo (Docker local e depois Kubernetes) vem com o pacote em
`vendor/melisplatform/melis-ai/mcp/MCP-EXPOSURE-GUIDE.md`; isto é o resumo.

### A lista de ferramentas expostas

O `public/index.php` de cada servidor lê a tabela **`melis_ai_mcp_exposed_tools`** no arranque e
regista *apenas* as ferramentas aí listadas:

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

Uma **tabela vazia — ou uma base de dados inacessível — não expõe nada**. Essa é a salvaguarda
principal: ferramentas destrutivas como `deleteData` ou `drop_database_table` ficam simplesmente
fora da tabela. Os valores têm de corresponder às chaves camelCase de `$allTools` no
`public/index.php` de cada servidor.

Faça a gestão da lista a partir do back-office React em
**Melis AI → Admin → MCP Server → MCP Exposition** — uma checklist de todas as funções declaradas;
marcar uma ferramenta insere a sua linha, desmarcar remove-a. É suportado por
`MelisReactApiAiMcpServerController` (`GET /melis/react-api/ai-mcp-server/data`,
`POST …/save-tools`) e pelo modelo `MelisAIMcpExposedToolTable`.

::: warning Verifique o ponto de entrada antes de expor
Um `public/index.php` distribuído não é automaticamente seguro. Alguns servidores trazem uma simples
cadeia `Server::builder()->addTool(…)->build()` que regista **todas** as ferramentas sem filtragem
na base de dados. Abra o ficheiro e confirme que o ciclo `$allTools` + PDO acima está presente antes
de o colocar numa rede.
:::

### Executar um servidor por HTTP

O `bin/serve.php` arranca o servidor web integrado do PHP sobre `public/`, lendo `MCP_HOST` e
`MCP_PORT`:

```bash
MCP_HOST=0.0.0.0 MCP_PORT=6276 php vendor/melisplatform/melis-ai/mcp/dbmcp/bin/serve.php
```

Numa stack Docker cada servidor corre como um programa **supervisord** de longa duração. A
distribuição de portas de referência (apenas interna — para fora é tudo 443):

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

O ponto de entrada HTTP precisa de `nyholm/psr7`, `nyholm/psr7-server` e
`laminas/laminas-httphandlerrunner`. Os servidores sob `melis-ai/mcp/*` já os incluem; os de outros
módulos normalmente têm de os adicionar.

### Verificar

Todos os servidores respondem `ok` a `GET /healthz`, mas **o healthz por si só não prova nada**:
responde antes do bootstrap PSR-7, por isso um servidor com o autoloader do Composer desatualizado
passa no healthz e falha no primeiro pedido real. Envie sempre também um handshake a sério:

```bash
curl -s -X POST http://127.0.0.1:6276/ \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"curl","version":"1.0"}}}'
```

Um `"result"` JSON-RPC na resposta significa que o servidor está mesmo a funcionar.

### Publicar remotamente

No Kubernetes os servidores ficam atrás do ingress nginx com TLS na 443 e uma lista branca de IP
(`whitelist-source-range`), pelo que as portas `627x` nunca são acessíveis diretamente. Há duas
estratégias de encaminhamento: um hostname por servidor (`https://dbmcp.<dominio>/`) ou —
recomendada quando expõe vários — um único host com encaminhamento por caminho
(`https://mcp.<dominio>/dbmcp`), onde `use-regex` + `rewrite-target` retiram o prefixo para que cada
backend continue a ver `/` e `/healthz`. Mudar de uma para a outra mais tarde altera apenas o
ingress.

::: danger O `composer update` apaga as alterações em vendor
Estes pontos de entrada vivem sob `vendor/`. Um `composer update melisplatform/melis-ai` (ou os
outros módulos com MCP) volta a extrair o pacote e pode reverter um `public/index.php` com filtragem
na base de dados para expor tudo. Verifique de novo após cada atualização e leve as alterações
duradouras para montante, para os repositórios dos pacotes, em vez de `vendor/`.
:::

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

Em **modo servidor** as camadas somam-se: uma ferramenta tem de estar em
`melis_ai_mcp_exposed_tools` para sequer ser registada, o ingress restringe quem chama por IP de
origem sobre TLS, e a sandbox de ficheiros/base de dados continua a aplicar-se ao que for executado.
Exponha o conjunto útil mais pequeno — primeiro as ferramentas só de leitura — e mantenha as
destrutivas fora da lista.

## Ficheiros principais

| Aspeto | Caminho |
| --- | --- |
| Serviço cliente MCP | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineMcpService.php` |
| Trait de gestão de ferramentas | `vendor/melisplatform/melis-ai-engine/src/Service/Traits/Mcp/McpToolManagementTrait.php` |
| Configuração do servidor | `vendor/melisplatform/melis-ai-engine/config/app.interface.php` |
| Exemplo de `mcp.tools.php` | `vendor/melisplatform/melis-ai-tool-creator/config/mcp.tools.php` |
| Exemplo de servidor (stdio) | `vendor/melisplatform/melis-ai/mcp/dbmcp/bin/server.php` |
| Exemplo de servidor (HTTP) | `vendor/melisplatform/melis-ai/mcp/dbmcp/public/index.php` |
| Lançador HTTP | `vendor/melisplatform/melis-ai/mcp/dbmcp/bin/serve.php` |
| Guia de exposição | `vendor/melisplatform/melis-ai/mcp/MCP-EXPOSURE-GUIDE.md` |
| Modelo das ferramentas expostas | `vendor/melisplatform/melis-ai/src/Model/Tables/MelisAIMcpExposedToolTable.php` |
| Separador MCP Server (API React) | `vendor/melisplatform/melis-ai/src/Controller/React/MelisReactApiAiMcpServerController.php` |
| Inspector (clássico) | `vendor/melisplatform/melis-ai/src/Controller/McpInspectorController.php` |
| Inspector (API React) | `vendor/melisplatform/melis-ai/src/Controller/React/MelisReactApiMcpInspectorController.php` |
