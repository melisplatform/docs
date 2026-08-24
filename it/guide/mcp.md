# MCP (Model Context Protocol)

Melis integra il **[Model Context Protocol](https://modelcontextprotocol.io/)** in modo che gli
[agenti](./ai) IA possano richiamare **strumenti** — leggere/scrivere file, eseguire operazioni sul
database, generare lo scheletro di moduli — durante un'esecuzione. Questa pagina spiega come
funziona e come aggiungere il proprio strumento MCP.

::: info Stesso motore, nuovo back-office
Melis v6 ha mantenuto invariati il motore IA e i suoi moduli; ha sostituito il back-office con una
**UI React su `/melis-react`**. Tutto ciò che questa pagina spiega sul funzionamento di MCP — il
client, la configurazione `mcp.tools.php`, l'avvio dei server tramite stdio, la sicurezza — è
identico alla v5. Solo le parti che riguardano *dove fai clic* sono state spostate nei nuovi
strumenti React (**Melis AI → Admin → MCP Server**, la lista di autorizzazione **AI Tools**
dell'agente e l'**MCP Inspector**). Questi sono evidenziati di seguito.
:::

::: info Client, non server (per ora)
Melis funge da **client MCP**: avvia **server** MCP locali (processi PHP, trasporto stdio) e ne
richiama gli strumenti quando un modello ne fa richiesta. L'esposizione degli strumenti di Melis *a
client* MCP *esterni* (modalità server) **non** è ancora implementata, e il trasporto è unicamente
stdio. La funzionalità è usata internamente in produzione ma in continua evoluzione — consulta il
codice per conoscere lo stato attuale.
:::

## Server MCP integrati

Di serie, il motore include quattro server MCP (dichiarati in
`melis-ai-engine/config/app.interface.php` e nei file `mcp.tools.php` dei moduli):

| Server | Modulo | Strumenti (esempi) |
| --- | --- | --- |
| `file_operations` | `melis-ai` | `readFile`, `createFile`, `updateFiles`, `createDirectory`, `deleteFile`… |
| `database_operations` | `melis-ai` | `getTableStructure`, `createDatabaseTable`, `selectData`, `insertData`, `updateData`… |
| `tool_creator` | `melis-ai-tool-creator` | `createModule`, `activateModule`, `deactivateModule` |
| `minitemplate_creator` | `melis-ai-community-extensions` | `readSiteAssets`, `getSitePublicUrl`, `renderMinitemplatePreview`… |

Ognuno viene eseguito come eseguibile autonomo, ad esempio
`vendor/melisplatform/melis-ai/mcp/dbmcp/bin/server.php`.

## Come si svolge una chiamata a uno strumento

Quando un modello (Claude/Gemini) chiede di richiamare una funzione durante l'esecuzione di un agente:

1. Il servizio del provider chiede al servizio MCP se si tratta di uno strumento MCP —
   `MelisAIEngineMcpService::isMcpTool($name)` (strumenti contrassegnati con `'mcp' => true`, oppure
   noti a un server).
2. In caso affermativo, `invokeTool($name, $args)` individua il server corretto, (ri)utilizza il suo
   processo e invia una richiesta JSON-RPC `tools/call` tramite stdio.
3. Il server esegue lo strumento e restituisce il risultato, che viene rinviato al modello.

Il client MCP si trova in `melis-ai-engine/src/Service/MelisAIEngineMcpService.php` (composto da
trait per la comunicazione, la gestione dei server, la gestione degli strumenti, la scoperta degli
schemi, l'interruttore automatico e il logging).

## La configurazione `mcp.tools.php`

Un modulo espone strumenti MCP fornendo un file `config/mcp.tools.php` che dichiara **(a)** gli
schemi degli strumenti per il motore IA e **(b)** il server che li gestisce. Esempio (ridotto, da
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

## Aggiungere il proprio strumento MCP

### 1. Scrivere il server

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

### 2. Implementare le operazioni

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

### 3. Dichiararlo e caricare la configurazione

Aggiungi un file `config/mcp.tools.php` (come sopra) che dichiari le `function_declarations` e la
voce `mcp.servers`, quindi `include`lo dal metodo `Module::getConfig()` del tuo modulo.

Il motore si occupa per te dell'avvio dei processi, di JSON-RPC su stdio, dei timeout, dei tentativi
di ripetizione e dell'interruttore automatico. I modelli che supportano le chiamate agli strumenti
possono quindi richiamare il tuo strumento durante l'esecuzione di un agente.

## Autorizzare uno strumento su un agente (React)

Dichiarare uno strumento lo rende *disponibile*; un [agente](./ai) vede sempre e solo gli strumenti
che spunti per esso. Nel back-office React, apri **Melis AI → AI Agents**, apri (o crea) un agente e
vai alla scheda **AI Tools** — un elenco di controllo suddiviso in **MCP tools** (serviti dai server
MCP) e **Local tools** (PHP integrati). Spunta quelli che questo agente può richiamare e il motore
offrirà esattamente quelli al modello a ogni esecuzione. Anche gli strumenti MCP del database
rispettano i diritti di lettura/scrittura/eliminazione per singola tabella definiti nella scheda
**DB Rights** dell'agente.

![Lista di autorizzazione AI Tools dell'agente](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-aitools.png)
*Melis AI → AI Agents → un agente → AI Tools: gli MCP tools (getTableStructure, createDatabaseTable, selectData, insertData…) e i Local tools che un agente può richiamare.*

Puoi configurare quali funzioni il server MCP integrato *espone* in **Melis AI → Admin → MCP
Server** (la sotto-scheda **MCP Exposition**); vengono resi disponibili solo gli strumenti spuntati.
Consulta la [guida IA](./ai) per il modello completo agente/istanza e il
[riferimento `melis-ai`](/it/reference/modules/melis-ai) per gli strumenti e gli endpoint.

## Ispezionare i server MCP (MCP Inspector)

Il back-office React include uno strumento **MCP Inspector** in **Melis AI → MCP Inspector** (rotta
`/melis-ai/mcp-inspector`). Elenca i server MCP connessi e ti consente di **avviarli / verificarne
lo stato / leggerne i log**, così puoi confermare che un server sia attivo e che gli strumenti che
ti aspetti siano individuabili *prima* di autorizzarli su un agente. Come ogni strumento React,
dispone di un interruttore **New / Old** (**New** = la pagina React; **Old** = lo strumento classico
in un iframe), che avvia l'interfaccia ufficiale dell'MCP Inspector su un server scelto tramite
`vendor/melisplatform/melis-ai/src/Controller/McpInspectorController.php`.

Gli endpoint React dell'Inspector (`servers`, `launch`, `status`, `log`) si trovano in
`MelisReactApiMcpInspectorController` — consulta il [riferimento `melis-ai`](/it/reference/modules/melis-ai).

## Sicurezza

Le operazioni MCP su file/DB sono isolate in una sandbox tramite `allowed_paths` /
`forbidden_paths`, configurati in `melis-ai-engine/config/app.interface.php` (ad esempio `module`,
`public`, `config`, `/tmp` consentiti; `/etc`, `/bin`, `/root`… vietati). Verifica queste
impostazioni prima di abilitare gli strumenti di scrittura. Oltre alla sandbox, la portata di un
agente è limitata dalla sua lista di autorizzazione **AI Tools** e dai **DB Rights** (sopra), così
un modello può accedere solo a ciò che hai esplicitamente concesso.

## File principali

| Ambito | Percorso |
| --- | --- |
| Servizio client MCP | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineMcpService.php` |
| Trait di gestione degli strumenti | `vendor/melisplatform/melis-ai-engine/src/Service/Traits/Mcp/McpToolManagementTrait.php` |
| Configurazione del server | `vendor/melisplatform/melis-ai-engine/config/app.interface.php` |
| Esempio di `mcp.tools.php` | `vendor/melisplatform/melis-ai-tool-creator/config/mcp.tools.php` |
| Esempio di server | `vendor/melisplatform/melis-ai/mcp/dbmcp/bin/server.php` |
| Inspector (classico) | `vendor/melisplatform/melis-ai/src/Controller/McpInspectorController.php` |
| Inspector (API React) | `vendor/melisplatform/melis-ai/src/Controller/React/MelisReactApiMcpInspectorController.php` |
