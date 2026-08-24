# MCP (Model Context Protocol)

Melis integriert das **[Model Context Protocol](https://modelcontextprotocol.io/)**, damit KI-[Agenten](./ai) während eines Laufs **Werkzeuge** aufrufen können — Dateien lesen/schreiben, Datenbankoperationen ausführen, Module gerüstartig anlegen. Diese Seite erläutert, wie das funktioniert und wie Sie Ihr eigenes MCP-Werkzeug hinzufügen.

::: info Gleiche Engine, neues Back-Office
Melis v6 hat die KI-Engine und ihre Module unverändert beibehalten; es hat das Back-Office durch eine **React-Oberfläche unter `/melis-react`** ersetzt. Alles auf dieser Seite zur Funktionsweise von MCP — der Client, die `mcp.tools.php`-Konfiguration, das Starten von Servern über stdio, die Sicherheit — ist identisch mit v5. Nur die *Wo-Sie-klicken*-Teile sind in die neuen React-Werkzeuge umgezogen (**Melis AI → Admin → MCP Server**, die Agenten-**AI Tools**-Freigabeliste und der **MCP Inspector**). Diese werden weiter unten hervorgehoben.
:::

::: info Client, kein Server (aktuell)
Melis fungiert als **MCP-Client**: Es startet lokale MCP-**Server** (PHP-Prozesse, stdio-Transport) und ruft deren Werkzeuge auf, wenn ein Modell sie anfordert. Die eigenen Werkzeuge von Melis *für externe* MCP-Clients bereitzustellen (Servermodus) ist **noch nicht** implementiert, und der Transport erfolgt ausschließlich über stdio. Die Funktion wird intern produktiv genutzt, wird jedoch aktiv weiterentwickelt — lesen Sie den Code, um den aktuellen Stand zu erfahren.
:::

## Integrierte MCP-Server

Von Haus aus liefert die Engine vier MCP-Server aus (deklariert in `melis-ai-engine/config/app.interface.php` und den `mcp.tools.php`-Dateien der Module):

| Server | Modul | Werkzeuge (Beispiele) |
| --- | --- | --- |
| `file_operations` | `melis-ai` | `readFile`, `createFile`, `updateFiles`, `createDirectory`, `deleteFile`… |
| `database_operations` | `melis-ai` | `getTableStructure`, `createDatabaseTable`, `selectData`, `insertData`, `updateData`… |
| `tool_creator` | `melis-ai-tool-creator` | `createModule`, `activateModule`, `deactivateModule` |
| `minitemplate_creator` | `melis-ai-community-extensions` | `readSiteAssets`, `getSitePublicUrl`, `renderMinitemplatePreview`… |

Jeder läuft als eigenständige ausführbare Datei, z. B. `vendor/melisplatform/melis-ai/mcp/dbmcp/bin/server.php`.

## Ablauf eines Werkzeugaufrufs

Wenn ein Modell (Claude/Gemini) während eines Agentenlaufs darum bittet, eine Funktion aufzurufen:

1. Der Provider-Service fragt den MCP-Service, ob es sich um ein MCP-Werkzeug handelt — `MelisAIEngineMcpService::isMcpTool($name)` (Werkzeuge, die mit `'mcp' => true` gekennzeichnet oder einem Server bekannt sind).
2. Falls ja, findet `invokeTool($name, $args)` den richtigen Server, (wieder)verwendet dessen Prozess und sendet eine JSON-RPC-`tools/call`-Anfrage über stdio.
3. Der Server führt das Werkzeug aus und gibt das Ergebnis zurück, das an das Modell zurückgespielt wird.

Der MCP-Client befindet sich in `melis-ai-engine/src/Service/MelisAIEngineMcpService.php` (zusammengesetzt aus Traits für Kommunikation, Serververwaltung, Werkzeugverwaltung, Schema-Discovery, Circuit-Breaking und Protokollierung).

## Die `mcp.tools.php`-Konfiguration

Ein Modul stellt MCP-Werkzeuge bereit, indem es eine `config/mcp.tools.php` ausliefert, die **(a)** die Werkzeugschemata für die KI-Engine und **(b)** den Server deklariert, der sie verarbeitet. Beispiel (gekürzt, aus `melis-ai-tool-creator/config/mcp.tools.php`):

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

## Eigenes MCP-Werkzeug hinzufügen

### 1. Den Server schreiben

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

### 2. Die Operationen implementieren

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

### 3. Deklarieren und die Konfiguration laden

Fügen Sie eine `config/mcp.tools.php` hinzu (wie oben), die die `function_declarations` und den `mcp.servers`-Eintrag deklariert, und binden Sie sie dann per `include` aus der `Module::getConfig()`-Methode Ihres Moduls ein.

Die Engine übernimmt für Sie das Starten der Prozesse, JSON-RPC über stdio, Timeouts, Wiederholungsversuche und Circuit-Breaking. Modelle, die Werkzeugaufrufe unterstützen, können Ihr Werkzeug dann während eines Agentenlaufs aufrufen.

## Ein Werkzeug für einen Agenten freigeben (React)

Das Deklarieren eines Werkzeugs macht es *verfügbar*; ein [Agent](./ai) sieht jedoch nur die Werkzeuge, die Sie für ihn ankreuzen. Öffnen Sie im React-Back-Office **Melis AI → AI Agents**, öffnen (oder erstellen) Sie einen Agenten und wechseln Sie zum Tab **AI Tools** — eine Checkliste, aufgeteilt in **MCP tools** (von MCP-Servern bereitgestellt) und **Local tools** (integriertes PHP). Kreuzen Sie diejenigen an, die dieser Agent aufrufen darf, und die Engine bietet dem Modell bei jedem Lauf genau diese an. Datenbank-MCP-Werkzeuge berücksichtigen zudem die tabellenspezifischen Lese-/Schreib-/Löschrechte im Tab **DB Rights** des Agenten.

![Freigabeliste der Agenten-AI-Tools](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-aitools.png)
*Melis AI → AI Agents → ein Agent → AI Tools: die MCP tools (getTableStructure, createDatabaseTable, selectData, insertData…) und Local tools, die ein Agent aufrufen darf.*

Welche Funktionen der integrierte MCP-Server *bereitstellt*, konfigurieren Sie unter **Melis AI → Admin → MCP Server** (der Untertab **MCP Exposition**); nur angekreuzte Werkzeuge werden verfügbar gemacht. Weitere Informationen zum vollständigen Agenten-/Instanzmodell finden Sie im [KI-Leitfaden](./ai) und zu den Werkzeugen und Endpunkten in der [`melis-ai`-Referenz](/de/reference/modules/melis-ai).

## MCP-Server inspizieren (MCP Inspector)

Das React-Back-Office liefert ein Werkzeug **MCP Inspector** unter **Melis AI → MCP Inspector** aus (Route `/melis-ai/mcp-inspector`). Es listet die verbundenen MCP-Server auf und ermöglicht es Ihnen, sie zu **starten / den Status zu prüfen / Protokolle zu lesen**, sodass Sie bestätigen können, dass ein Server läuft und die erwarteten Werkzeuge auffindbar sind, *bevor* Sie sie für einen Agenten freigeben. Wie jedes React-Werkzeug verfügt es über einen **New / Old**-Umschalter (**New** = die React-Seite; **Old** = das klassische Werkzeug in einem iframe), der die offizielle MCP-Inspector-Oberfläche gegen einen ausgewählten Server startet, und zwar über `vendor/melisplatform/melis-ai/src/Controller/McpInspectorController.php`.

Die React-Endpunkte des Inspectors (`servers`, `launch`, `status`, `log`) befinden sich in `MelisReactApiMcpInspectorController` — siehe die [`melis-ai`-Referenz](/de/reference/modules/melis-ai).

## Sicherheit

Datei-/DB-MCP-Operationen werden über `allowed_paths` / `forbidden_paths` in einer Sandbox betrieben, die in `melis-ai-engine/config/app.interface.php` konfiguriert wird (z. B. `module`, `public`, `config`, `/tmp` erlaubt; `/etc`, `/bin`, `/root`… verboten). Prüfen Sie diese, bevor Sie Schreibwerkzeuge aktivieren. Zusätzlich zur Sandbox wird die Reichweite eines Agenten durch seine **AI Tools**-Freigabeliste und die **DB Rights** (siehe oben) begrenzt, sodass ein Modell nur auf das zugreifen kann, was Sie ausdrücklich gewährt haben.

## Wichtige Dateien

| Aspekt | Pfad |
| --- | --- |
| MCP-Client-Service | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineMcpService.php` |
| Werkzeugverwaltungs-Trait | `vendor/melisplatform/melis-ai-engine/src/Service/Traits/Mcp/McpToolManagementTrait.php` |
| Serverkonfiguration | `vendor/melisplatform/melis-ai-engine/config/app.interface.php` |
| Beispiel-`mcp.tools.php` | `vendor/melisplatform/melis-ai-tool-creator/config/mcp.tools.php` |
| Beispielserver | `vendor/melisplatform/melis-ai/mcp/dbmcp/bin/server.php` |
| Inspector (klassisch) | `vendor/melisplatform/melis-ai/src/Controller/McpInspectorController.php` |
| Inspector (React-API) | `vendor/melisplatform/melis-ai/src/Controller/React/MelisReactApiMcpInspectorController.php` |
