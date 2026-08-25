# MCP (Model Context Protocol)

Melis integriert das **[Model Context Protocol](https://modelcontextprotocol.io/)**, damit KI-[Agenten](./ai) während eines Laufs **Werkzeuge** aufrufen können — Dateien lesen/schreiben, Datenbankoperationen ausführen, Module gerüstartig anlegen. Melis ist außerdem ein MCP-**Server**: dieselben Werkzeuge lassen sich per HTTP für externe MCP-Clients bereitstellen. Diese Seite erläutert, wie das funktioniert, wie Sie Ihr eigenes MCP-Werkzeug hinzufügen und wie Sie es bereitstellen.

::: info Gleiche Engine, neues Back-Office
Melis v6 hat die KI-Engine und ihre Module unverändert beibehalten; es hat das Back-Office durch eine **React-Oberfläche unter `/melis-react`** ersetzt. Alles auf dieser Seite zur Funktionsweise von MCP — der Client, die `mcp.tools.php`-Konfiguration, das Starten von Servern über stdio, die Sicherheit — ist identisch mit v5. Nur die *Wo-Sie-klicken*-Teile sind in die neuen React-Werkzeuge umgezogen (**Melis AI → Admin → MCP Server**, die Agenten-**AI Tools**-Freigabeliste und der **MCP Inspector**). Diese werden weiter unten hervorgehoben.
:::

::: info Client *und* Server
Melis fungiert als **MCP-Client**: Es startet lokale MCP-**Server** (PHP-Prozesse, stdio-Transport) und ruft deren Werkzeuge auf, wenn ein Modell sie anfordert.

Melis kann inzwischen auch als **MCP-Server** fungieren — dieselben Werkzeuge lassen sich per **Streamable HTTP** für externe MCP-Clients bereitstellen (Claude Desktop, den MCP Inspector, eigene Integrationen). Nichts ist erreichbar, solange Sie es nicht ausdrücklich freigeben: siehe **Werkzeuge für externe Clients bereitstellen** weiter unten.
:::

## Integrierte MCP-Server

Von Haus aus liefert die Plattform **sechs** MCP-Server aus, verteilt auf drei Module (deklariert in `melis-ai-engine/config/app.interface.php` und den `mcp.tools.php`-Dateien der Module):

| Server (Konfigurationsschlüssel) | Verzeichnis | Modul | Werkzeuge |
| --- | --- | --- | --- |
| `file_operations` | `mcp/filemcp` | `melis-ai` | `createFile`, `createDirectory`, `pathExists`, `readFile`, `updateFiles`, `deleteFile`, `deleteDirectory` |
| `database_operations` | `mcp/dbmcp` | `melis-ai` | `get_table_structure`, `create_database_table`, `add_db_table_columns`, `update_db_table_columns`, `drop_db_table_columns`, `drop_database_table`, `selectData`, `insertData`, `updateData`, `deleteData`, `bulkInsertData` |
| `module_documents` | `mcp/documentationmcp` | `melis-ai` | `getDocModuleList`, `getModuleDoc`, `getModuleDocImage` |
| `navigation_operations` | `mcp/navigationmcp` | `melis-ai` | `listBackOfficeTools`, `openBackOfficeTool`, `listCmsPages`, `resolveHomepage`, `openCmsPage`, `navStep` |
| `tool_creator` | `mcp/toolcreator` | `melis-ai-tool-creator` | `createModule`, `activateModule`, `deactivateModule`, `generateBundle` |
| `minitemplate_creator` | `mcp/minitemplatecreator` | `melis-ai-community-extensions` | `readSiteAssets`, `getSitePublicUrl`, `uploadMinitemplateImages`, `renderMinitemplatePreview` |

Jeder Server bietet aus denselben Werkzeug-Implementierungen **zwei Betriebsarten**:

- **stdio** — `bin/server.php`, z. B. `vendor/melisplatform/melis-ai/mcp/dbmcp/bin/server.php`. Das startet die Engine für Agentenläufe innerhalb der Plattform, und daran kann sich ein lokaler Desktop-Client anbinden. Nicht über das Netzwerk erreichbar.
- **HTTP** — `public/index.php`, ausgeliefert von `bin/serve.php` (ein `php -S`-Wrapper). Das ist die im Netzwerk bereitstellbare Betriebsart und die einzige, die die untenstehende Freigabeliste anwendet.

::: tip Die Server liegen in mehreren Modulen
Sie liegen nicht alle unter `melis-ai`. So inventarisieren Sie, was eine Installation tatsächlich enthält:
```bash
ls -d vendor/melisplatform/melis-ai*/mcp/*/
```
`navigationmcp` ist ein Sonderfall — es hat kein eigenes `vendor/` und leiht sich den Autoloader von `dbmcp`.
:::
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

## Werkzeuge für externe Clients bereitstellen (Servermodus)

Ein Server im **HTTP-Modus** macht seine Werkzeuge für jeden MCP-Client aufrufbar, der ihn erreichen kann — die Bereitstellung ist deshalb bewusst mehrfach abgesichert. Die vollständige betriebliche Anleitung (erst Docker lokal, dann Kubernetes) liegt dem Paket unter `vendor/melisplatform/melis-ai/mcp/MCP-EXPOSURE-GUIDE.md` bei; dies ist die Zusammenfassung.

### Die Freigabeliste

Die `public/index.php` jedes Servers liest beim Start die Tabelle **`melis_ai_mcp_exposed_tools`** und registriert *nur* die dort aufgeführten Werkzeuge:

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

Eine **leere Tabelle — oder eine nicht erreichbare Datenbank — gibt nichts frei**. Das ist die wichtigste Schutzschwelle: destruktive Werkzeuge wie `deleteData` oder `drop_database_table` bleiben schlicht außerhalb der Tabelle. Die Werte müssen den camelCase-Schlüsseln von `$allTools` in der `public/index.php` des jeweiligen Servers entsprechen.

Verwalten Sie die Liste im React-Back-Office unter **Melis AI → Admin → MCP Server → MCP Exposition** — eine Checkliste aller deklarierten Funktionen; ein Häkchen legt die Zeile an, ein entferntes Häkchen löscht sie. Dahinter stehen `MelisReactApiAiMcpServerController` (`GET /melis/react-api/ai-mcp-server/data`, `POST …/save-tools`) und das Modell `MelisAIMcpExposedToolTable`.

::: warning Prüfen Sie den Einstiegspunkt vor der Bereitstellung
Eine mitgelieferte `public/index.php` ist nicht automatisch sicher. Manche Server bringen eine schlichte `Server::builder()->addTool(…)->build()`-Kette mit, die **alle** Werkzeuge ohne Datenbankfilterung registriert. Öffnen Sie die Datei und stellen Sie sicher, dass die obige `$allTools`-plus-PDO-Schleife vorhanden ist, bevor Sie den Server ins Netz stellen.
:::

### Einen Server über HTTP betreiben

`bin/serve.php` startet den in PHP eingebauten Webserver auf `public/` und liest dabei `MCP_HOST` und `MCP_PORT`:

```bash
MCP_HOST=0.0.0.0 MCP_PORT=6276 php vendor/melisplatform/melis-ai/mcp/dbmcp/bin/serve.php
```

In einem Docker-Stack läuft jeder Server als langlebiges **supervisord**-Programm. Die Referenz-Portbelegung (nur intern — nach außen läuft alles über 443):

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

Der HTTP-Einstiegspunkt benötigt `nyholm/psr7`, `nyholm/psr7-server` und `laminas/laminas-httphandlerrunner`. Die Server unter `melis-ai/mcp/*` bringen diese bereits mit; Server in anderen Modulen müssen sie meist nachinstallieren.

### Überprüfen

Jeder Server beantwortet `GET /healthz` mit `ok`, aber **healthz allein beweist nichts** — es antwortet vor dem PSR-7-Bootstrap, sodass ein Server mit veraltetem Composer-Autoloader healthz besteht und bei der ersten echten Anfrage abstürzt. Senden Sie deshalb immer auch einen echten Handshake:

```bash
curl -s -X POST http://127.0.0.1:6276/ \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"curl","version":"1.0"}}}'
```

Ein JSON-RPC-`"result"` in der Antwort bedeutet, dass der Server wirklich läuft.

### Entfernt veröffentlichen

In Kubernetes stehen die Server hinter dem nginx-Ingress mit TLS auf 443 und einer IP-Freigabeliste (`whitelist-source-range`), sodass die `627x`-Ports nie direkt erreichbar sind. Zwei Routing-Strategien stehen zur Wahl: ein Hostname pro Server (`https://dbmcp.<domain>/`) oder — empfohlen, wenn Sie mehrere bereitstellen — ein einzelner Host mit Pfad-Routing (`https://mcp.<domain>/dbmcp`), wobei `use-regex` + `rewrite-target` das Präfix entfernen, damit jedes Backend weiterhin `/` und `/healthz` sieht. Ein späterer Wechsel betrifft ausschließlich den Ingress.

::: danger `composer update` überschreibt Änderungen in vendor
Diese Einstiegspunkte liegen unter `vendor/`. Ein `composer update melisplatform/melis-ai` (oder die anderen MCP-tragenden Module) entpackt das Paket neu und kann eine datenbankgefilterte `public/index.php` auf „alles freigeben“ zurücksetzen. Prüfen Sie nach jedem Update erneut und bringen Sie dauerhafte Änderungen stromaufwärts in die Paket-Repositories ein statt in `vendor/`.
:::

## MCP-Server inspizieren (MCP Inspector)

Das React-Back-Office liefert ein Werkzeug **MCP Inspector** unter **Melis AI → MCP Inspector** aus (Route `/melis-ai/mcp-inspector`). Es listet die verbundenen MCP-Server auf und ermöglicht es Ihnen, sie zu **starten / den Status zu prüfen / Protokolle zu lesen**, sodass Sie bestätigen können, dass ein Server läuft und die erwarteten Werkzeuge auffindbar sind, *bevor* Sie sie für einen Agenten freigeben. Wie jedes React-Werkzeug verfügt es über einen **New / Old**-Umschalter (**New** = die React-Seite; **Old** = das klassische Werkzeug in einem iframe), der die offizielle MCP-Inspector-Oberfläche gegen einen ausgewählten Server startet, und zwar über `vendor/melisplatform/melis-ai/src/Controller/McpInspectorController.php`.

Die React-Endpunkte des Inspectors (`servers`, `launch`, `status`, `log`) befinden sich in `MelisReactApiMcpInspectorController` — siehe die [`melis-ai`-Referenz](/de/reference/modules/melis-ai).

## Sicherheit

Datei-/DB-MCP-Operationen werden über `allowed_paths` / `forbidden_paths` in einer Sandbox betrieben, die in `melis-ai-engine/config/app.interface.php` konfiguriert wird (z. B. `module`, `public`, `config`, `/tmp` erlaubt; `/etc`, `/bin`, `/root`… verboten). Prüfen Sie diese, bevor Sie Schreibwerkzeuge aktivieren. Zusätzlich zur Sandbox wird die Reichweite eines Agenten durch seine **AI Tools**-Freigabeliste und die **DB Rights** (siehe oben) begrenzt, sodass ein Modell nur auf das zugreifen kann, was Sie ausdrücklich gewährt haben.

Im **Servermodus** greifen die Schichten ineinander: Ein Werkzeug muss in `melis_ai_mcp_exposed_tools` stehen, um überhaupt registriert zu werden, der Ingress schränkt Aufrufer per Quell-IP über TLS ein, und die Datei-/DB-Sandbox gilt weiterhin für alles, was ausgeführt wird. Geben Sie die kleinste sinnvolle Menge frei — zuerst lesende Werkzeuge — und halten Sie destruktive von der Liste fern.

## Wichtige Dateien

| Aspekt | Pfad |
| --- | --- |
| MCP-Client-Service | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineMcpService.php` |
| Werkzeugverwaltungs-Trait | `vendor/melisplatform/melis-ai-engine/src/Service/Traits/Mcp/McpToolManagementTrait.php` |
| Serverkonfiguration | `vendor/melisplatform/melis-ai-engine/config/app.interface.php` |
| Beispiel-`mcp.tools.php` | `vendor/melisplatform/melis-ai-tool-creator/config/mcp.tools.php` |
| Beispielserver (stdio) | `vendor/melisplatform/melis-ai/mcp/dbmcp/bin/server.php` |
| Beispielserver (HTTP) | `vendor/melisplatform/melis-ai/mcp/dbmcp/public/index.php` |
| HTTP-Starter | `vendor/melisplatform/melis-ai/mcp/dbmcp/bin/serve.php` |
| Bereitstellungs-Leitfaden | `vendor/melisplatform/melis-ai/mcp/MCP-EXPOSURE-GUIDE.md` |
| Modell der freigegebenen Werkzeuge | `vendor/melisplatform/melis-ai/src/Model/Tables/MelisAIMcpExposedToolTable.php` |
| MCP-Server-Tab (React-API) | `vendor/melisplatform/melis-ai/src/Controller/React/MelisReactApiAiMcpServerController.php` |
| Inspector (klassisch) | `vendor/melisplatform/melis-ai/src/Controller/McpInspectorController.php` |
| Inspector (React-API) | `vendor/melisplatform/melis-ai/src/Controller/React/MelisReactApiMcpInspectorController.php` |
