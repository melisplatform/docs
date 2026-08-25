# MCP (Model Context Protocol)

Melis integra il **[Model Context Protocol](https://modelcontextprotocol.io/)** in modo che gli
[agenti](./ai) IA possano richiamare **strumenti** — leggere/scrivere file, eseguire operazioni sul
database, generare lo scheletro di moduli — durante un'esecuzione. Melis è anche un **server** MCP:
gli stessi strumenti possono essere esposti via HTTP a client MCP esterni. Questa pagina spiega come
funziona, come aggiungere il proprio strumento MCP e come esporlo.

::: info Stesso motore, nuovo back-office
Melis v6 ha mantenuto invariati il motore IA e i suoi moduli; ha sostituito il back-office con una
**UI React su `/melis-react`**. Tutto ciò che questa pagina spiega sul funzionamento di MCP — il
client, la configurazione `mcp.tools.php`, l'avvio dei server tramite stdio, la sicurezza — è
identico alla v5. Solo le parti che riguardano *dove fai clic* sono state spostate nei nuovi
strumenti React (**Melis AI → Admin → MCP Server**, la lista di autorizzazione **AI Tools**
dell'agente e l'**MCP Inspector**). Questi sono evidenziati di seguito.
:::

::: info Client *e* server
Melis agisce da **client MCP**: avvia **server** MCP locali (processi PHP, trasporto stdio) e ne
richiama gli strumenti quando un modello lo chiede.

Melis può ora agire anche da **server MCP**: gli stessi strumenti sono esponibili via
**Streamable HTTP** a client MCP esterni (Claude Desktop, l'MCP Inspector, le tue integrazioni).
Nulla è raggiungibile finché non lo esponi esplicitamente: vedi
**Esporre gli strumenti a client esterni** più sotto.
:::

## Server MCP integrati

Di serie la piattaforma include **sei** server MCP, distribuiti su tre moduli (dichiarati in
`melis-ai-engine/config/app.interface.php` e nei `mcp.tools.php` dei moduli):

| Server (chiave di configurazione) | Directory | Modulo | Strumenti |
| --- | --- | --- | --- |
| `file_operations` | `mcp/filemcp` | `melis-ai` | `createFile`, `createDirectory`, `pathExists`, `readFile`, `updateFiles`, `deleteFile`, `deleteDirectory` |
| `database_operations` | `mcp/dbmcp` | `melis-ai` | `get_table_structure`, `create_database_table`, `add_db_table_columns`, `update_db_table_columns`, `drop_db_table_columns`, `drop_database_table`, `selectData`, `insertData`, `updateData`, `deleteData`, `bulkInsertData` |
| `module_documents` | `mcp/documentationmcp` | `melis-ai` | `getDocModuleList`, `getModuleDoc`, `getModuleDocImage` |
| `navigation_operations` | `mcp/navigationmcp` | `melis-ai` | `listBackOfficeTools`, `openBackOfficeTool`, `listCmsPages`, `resolveHomepage`, `openCmsPage`, `navStep` |
| `tool_creator` | `mcp/toolcreator` | `melis-ai-tool-creator` | `createModule`, `activateModule`, `deactivateModule`, `generateBundle` |
| `minitemplate_creator` | `mcp/minitemplatecreator` | `melis-ai-community-extensions` | `readSiteAssets`, `getSitePublicUrl`, `uploadMinitemplateImages`, `renderMinitemplatePreview` |

Ogni server offre **due modalità di esecuzione** a partire dalle stesse implementazioni:

- **stdio** — `bin/server.php`, ad esempio
  `vendor/melisplatform/melis-ai/mcp/dbmcp/bin/server.php`. È ciò che il motore avvia per le
  esecuzioni degli agenti nella piattaforma, e ciò a cui può collegarsi un client desktop locale.
  Non raggiungibile dalla rete.
- **HTTP** — `public/index.php`, servito da `bin/serve.php` (un wrapper di `php -S`). È la modalità
  esponibile in rete, e l'unica che applica la lista di autorizzazione qui sotto.

::: tip I server vivono in più moduli
Non sono tutti sotto `melis-ai`. Per censire ciò che una data installazione contiene davvero:
```bash
ls -d vendor/melisplatform/melis-ai*/mcp/*/
```
`navigationmcp` è un caso particolare: non ha un `vendor/` proprio e prende in prestito
l'autoloader di `dbmcp`.
:::
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

## Esporre gli strumenti a client esterni (modalità server)

Eseguire un server in **modalità HTTP** rende i suoi strumenti richiamabili da qualsiasi client MCP
in grado di raggiungerlo, quindi l'esposizione è deliberatamente protetta su più livelli. La guida
operativa completa (prima Docker in locale, poi Kubernetes) è distribuita con il pacchetto in
`vendor/melisplatform/melis-ai/mcp/MCP-EXPOSURE-GUIDE.md`; questo è il riepilogo.

### La lista degli strumenti esposti

Il `public/index.php` di ogni server legge la tabella **`melis_ai_mcp_exposed_tools`** all'avvio e
registra *solo* gli strumenti elencati:

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

Una **tabella vuota — o un database irraggiungibile — non espone nulla**. È questa la principale
misura di sicurezza: strumenti distruttivi come `deleteData` o `drop_database_table` restano
semplicemente fuori dalla tabella. I valori devono corrispondere alle chiavi camelCase di
`$allTools` nel `public/index.php` di ciascun server.

Gestisci la lista dal back-office React in **Melis AI → Admin → MCP Server → MCP Exposition**: un
elenco di tutte le funzioni dichiarate; spuntare uno strumento inserisce la sua riga, togliere la
spunta la elimina. È supportato da `MelisReactApiAiMcpServerController`
(`GET /melis/react-api/ai-mcp-server/data`, `POST …/save-tools`) e dal modello
`MelisAIMcpExposedToolTable`.

::: warning Verifica il punto di ingresso prima di esporre
Un `public/index.php` distribuito non è automaticamente sicuro. Alcuni server includono una semplice
catena `Server::builder()->addTool(…)->build()` che registra **tutti** gli strumenti senza filtro sul
database. Apri il file e verifica che il ciclo `$allTools` + PDO qui sopra sia presente prima di
metterlo in rete.
:::

### Eseguire un server via HTTP

`bin/serve.php` avvia il web server integrato di PHP su `public/`, leggendo `MCP_HOST` e
`MCP_PORT`:

```bash
MCP_HOST=0.0.0.0 MCP_PORT=6276 php vendor/melisplatform/melis-ai/mcp/dbmcp/bin/serve.php
```

In uno stack Docker ogni server gira come programma **supervisord** di lunga durata. La
distribuzione di porte di riferimento (solo interna: verso l'esterno è tutto sulla 443):

| Port | Server |
| --- | --- |
| 6274 | UI MCP Inspector |
| 6275 | `filemcp` |
| 6276 | `dbmcp` |
| 6277 | Proxy MCP Inspector |
| 6278 | `documentationmcp` |
| 6279 | `navigationmcp` |
| 6280 | `toolcreator` |
| 6281 | `minitemplatecreator` |

Il punto di ingresso HTTP richiede `nyholm/psr7`, `nyholm/psr7-server` e
`laminas/laminas-httphandlerrunner`. I server sotto `melis-ai/mcp/*` li includono già; quelli di
altri moduli di solito devono aggiungerli.

### Verificare

Ogni server risponde `ok` a `GET /healthz`, ma **healthz da solo non dimostra nulla**: risponde
prima del bootstrap PSR-7, quindi un server con l'autoloader di Composer non aggiornato supera
healthz e va in errore alla prima richiesta reale. Invia sempre anche un handshake vero:

```bash
curl -s -X POST http://127.0.0.1:6276/ \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"curl","version":"1.0"}}}'
```

Un `"result"` JSON-RPC nella risposta significa che il server funziona davvero.

### Pubblicare da remoto

In Kubernetes i server stanno dietro l'ingress nginx con TLS sulla 443 e una whitelist di IP
(`whitelist-source-range`), così le porte `627x` non sono mai raggiungibili direttamente. Sono
disponibili due strategie di routing: un hostname per server (`https://dbmcp.<dominio>/`) oppure —
consigliata quando se ne espongono diversi — un unico host con routing per percorso
(`https://mcp.<dominio>/dbmcp`), dove `use-regex` + `rewrite-target` rimuovono il prefisso in modo
che ogni backend continui a vedere `/` e `/healthz`. Passare in seguito dall'una all'altra tocca
solo l'ingress.

::: danger `composer update` cancella le modifiche in vendor
Questi punti di ingresso vivono sotto `vendor/`. Un `composer update melisplatform/melis-ai` (o gli
altri moduli che contengono MCP) riestrae il pacchetto e può riportare un `public/index.php` con
filtro sul database a esporre tutto. Verifica di nuovo dopo ogni aggiornamento e porta le modifiche
durature a monte, nei repository dei pacchetti, invece che in `vendor/`.
:::

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

In **modalità server** i livelli si sommano: uno strumento deve essere presente in
`melis_ai_mcp_exposed_tools` anche solo per essere registrato, l'ingress limita i chiamanti per IP
di origine su TLS, e la sandbox su file/DB continua ad applicarsi a ciò che viene eseguito. Esponi
l'insieme utile più piccolo — prima gli strumenti di sola lettura — e tieni quelli distruttivi fuori
dalla lista.

## File principali

| Ambito | Percorso |
| --- | --- |
| Servizio client MCP | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineMcpService.php` |
| Trait di gestione degli strumenti | `vendor/melisplatform/melis-ai-engine/src/Service/Traits/Mcp/McpToolManagementTrait.php` |
| Configurazione del server | `vendor/melisplatform/melis-ai-engine/config/app.interface.php` |
| Esempio di `mcp.tools.php` | `vendor/melisplatform/melis-ai-tool-creator/config/mcp.tools.php` |
| Esempio di server (stdio) | `vendor/melisplatform/melis-ai/mcp/dbmcp/bin/server.php` |
| Esempio di server (HTTP) | `vendor/melisplatform/melis-ai/mcp/dbmcp/public/index.php` |
| Launcher HTTP | `vendor/melisplatform/melis-ai/mcp/dbmcp/bin/serve.php` |
| Guida all'esposizione | `vendor/melisplatform/melis-ai/mcp/MCP-EXPOSURE-GUIDE.md` |
| Modello degli strumenti esposti | `vendor/melisplatform/melis-ai/src/Model/Tables/MelisAIMcpExposedToolTable.php` |
| Scheda MCP Server (API React) | `vendor/melisplatform/melis-ai/src/Controller/React/MelisReactApiAiMcpServerController.php` |
| Inspector (classico) | `vendor/melisplatform/melis-ai/src/Controller/McpInspectorController.php` |
| Inspector (API React) | `vendor/melisplatform/melis-ai/src/Controller/React/MelisReactApiMcpInspectorController.php` |
