# MelisAIEngine

> Die abstrakte KI-Engine — Provider-Vertrag, Agenten-/Szenario-Laufzeitumgebung, Konversationsspeicher, MCP-/Tool-Bridge, sämtliche KI-Datenbanktabellen sowie die gemeinsam genutzten React-Chat-Komponenten, die das v6-Backoffice antreiben. Paket `melisplatform/melis-ai-engine`.

## Zweck

MelisAIEngine ist der Grundpfeiler der MelisAI-Suite. Sie definiert den abstrakten Provider-Vertrag (`MelisAIEngineModelService`), den Claude und Gemini implementieren, führt Agenten über mehrstufige Szenario-Workflows aus, verwaltet die MCP-/Tool-Calling-Bridge und besitzt sämtliche `melis_ai_*`-Datenbanktabellen. Sie verfügt über **kein eigenes eigenständiges Tool** — sie ist die unsichtbare Chat-Engine des Backoffice. In v6 (React) liefert sie zudem die gemeinsam genutzte React-Komponente **`AiChatContainer`** sowie das Chat-Backend `/melis/react-api/ai-engine/*`, das das Modul `MelisAI` in seine sichtbaren Tools einbindet.

## Aktivierung

Fügen Sie in `config/melis.module.load.php` hinzu:

```php
return [
    'MelisAIEngine',
];
```

Erforderliche Composer-Abhängigkeiten: `melisplatform/melis-core` und `melisplatform/melis-document-upload`. Für tatsächliche Modellaufrufe muss mindestens ein Provider-Modul (`MelisAIEngineClaude` oder `MelisAIEngineGemini`) installiert sein; ohne einen aktiven Provider für das Unternehmen des Modells meldet der Chat *"The AI company module is not active."*

## Zentrale Services

| Service-Alias | Rolle |
| --- | --- |
| `MelisAIEngineModelService` | Abstrakter Provider-Vertrag. Leiten Sie hiervon ab, um einen neuen KI-Provider hinzuzufügen (§ Provider-Vertrag). |
| `MelisAIEngineService` | Registry/Factory: `getActiveInstance()`, `getActiveAgent()`, `getActiveModel()`, `getActiveModelClass()` (Provider-Auswahl), `getActiveAITools()`, `saveDailyUsage()`. |
| `MelisAIEngineAgentService` | Szenario-Laufzeitumgebung: `runAgent($postValues, $files)` durchläuft die Schritte des Agenten und steuert `MelisAIEngineModelService::send()`. |
| `MelisAIEngineMcpService` | MCP-/Tool-Calling-Bridge: Serververwaltung, JSON-RPC-Kommunikation, Circuit Breaker, `getAvailableTools()`, `isMcpTool()`, `invokeTool()`, `formatToolsForAI()`, `getToolSchema()`. |
| `MelisAIEngineConversationStore` | Persistenter, mehrstufiger Konversationszustand in `melis_ai_conversation_state`: `get()`, `has()`, `set()`, `delete()`. Automatische Garbage Collection nach 48 Stunden. |
| `MelisAIEngineFunctionService` | Integrierte (Nicht-MCP-)Tool-Implementierungen, z. B. `get_table_structure`, `create_database_table`. |
| `MelisAIEngineFileService` | Aufbewahrungsbereinigung von KI-hochgeladenen Dokumenten: `deleteAIDocUploads()`. |
| `MelisAIEngineGeneralService` | Ereignisbewusste Basis: `sendEvent()`, `makeArrayFromParameters()`. |

## Provider-Vertrag

`MelisAIEngineModelService` (`src/Service/MelisAIEngineModelService.php`) ist die abstrakte Klasse, die jeder Provider erweitern muss. Konstruktor: `(ServiceManager $serviceManager, int $modelId, int $agentId)`.

**Abstrakte Methoden, die ein Provider implementieren muss:**

```php
abstract public function setClient();
abstract public function addToolsToPayload($payload);
abstract public function addContentToPayload($payload, $role, $prompt, $files=[], $content=[]);
abstract public function constructContent($role, $prompt, $files=[]);
abstract public function getMessageKey(): string;            // 'messages' (Claude) | 'contents' (Gemini)
abstract public function sendCustomAI(?array $payload = []): array;
abstract public function getAllowedMimetypes(): array;
abstract public function setPromptTokenCount($responseData);
abstract public function setResponseTokenCount($responseData);
abstract public function setTotalTokenCount($responseData);
abstract public function processFiles($filesArr): array;
abstract public function processContextFiles($filesArr): array;
```

Der Lebenszyklus der Basismethode `send(array $contextArr): array` ist fest vorgegeben: `addToolsToPayload()` → `addContentToPayload()` pro Kontexteintrag → `sendCustomAI()` → Token-Zählungen → gibt `['request','responseData','result','errors','needs_continuation','session_id','continuation_context','tool_results']` zurück.

**Von der Basisklasse bereitgestellte Hilfsmethoden:** `getModel()`, `getAgentFunctions()`, `getToolDeclarationByName()`, Token-Getter, `uploadDocument()`, `extractTextFromDocx()`, `extractTextFromXlsx()`, `getMimeType()`.

## Provider-Auswahl

`MelisAIEngineService::getActiveModelClass($company, $modelId, $agentId)` wählt den Provider anhand des Unternehmensnamens des Modells aus:

```php
if (strpos($company, 'Google') !== false) {
    // builds MelisAIEngineModelGeminiService — requires MelisAIEngineGemini module
} elseif (strpos($company, 'Anthropic') !== false) {
    // builds MelisAIEngineModelClaudeService — requires MelisAIEngineClaude module
}
```

Um einen neuen Provider hinzuzufügen (z. B. OpenAI): Erweitern Sie `MelisAIEngineModelService`, implementieren Sie die abstrakten Methoden, registrieren Sie ihn als Service und fügen Sie hier einen Zweig hinzu, der auf dem Unternehmensnamen basiert. Die Provider Ollama und OCI folgen demselben Vertrag.

## MCP-/Tool-Calling-System

Tools werden an zwei Stellen deklariert: in `config['plugins']['melisaiengine']['datas']['function_declarations']` (Name, Beschreibung, JSON-Schema, boolescher Wert `mcp`) und in der Tabelle `melis_ai_tools`. Ein Agent aktiviert Tools über `maa_agent_tools`.

Zum Aufrufzeitpunkt: `getAgentFunctions()` gibt die zulässigen Deklarationen zurück → `addToolsToPayload()` fügt sie ein → bei einem Tool-Aufruf leitet der Provider über `MelisAIEngineMcpService::isMcpTool($name)` weiter: MCP-Tools gehen an `invokeTool()` (JSON-RPC über stdio, durch Circuit Breaker abgesichert); integrierte Tools gehen an `MelisAIEngineFunctionService`. Die Ergebnisse werden zurückgeführt, und die Konversation wird fortgesetzt, bis das Modell den Abschluss signalisiert oder eine Sicherheitsobergrenze erreicht wird.

MCP-Server werden unter `config['mcp']['servers'][<name>]` = `{enabled, command, args, tools, timeout}` konfiguriert; `MelisAIEngineMcpService` startet sie über `proc_open` und kommuniziert per JSON-RPC 2.0 (`tools/list`, Tool-Aufruf).

## Datenbanktabellen

Alle `melis_ai_*`-Tabellen gehören zu diesem Modul (`dbdeploy: true`):

| Tabelle | Enthält |
| --- | --- |
| `melis_ai_models` | Provider-Modelle (Unternehmen, `mam_generative_model`, API-Schlüssel-Verknüpfung). |
| `melis_ai_companies` | KI-Unternehmen (Google, Anthropic …). |
| `melis_ai_platform_keys` | API-Schlüssel pro Plattform. |
| `melis_ai_agents` | Agenten (`maa_name`, Modell-Verknüpfung, `maa_agent_tools` JSON, Datei-Umschalter). |
| `melis_ai_agents_tools` | Zuordnung Agent ↔ Tool. |
| `melis_ai_tools` | Tool-Katalog (`mat_name`, `mat_desc`, `mat_config` JSON). |
| `melis_ai_instances` / `melis_ai_instance_trans` | Benannte Deployments (Instanzen) und Übersetzungen. |
| `melis_ai_scenario_steps` / `…_datas` / `…_datas_entryexit` | Szenario-Schritte, deren Daten sowie Eintritts-/Austrittsparameter. |
| `melis_ai_return_types` | Definitionen der Rückgabetypen von Schritten. |
| `melis_ai_files` | An Schritte/Kontext angehängte Dateien. |
| `melis_ai_daily_usage` | Token- und Aufrufzählungen pro Modell/Agent/Instanz/Tag. |
| `melis_ai_conversation_state` | Persistenter Konversationszustand (`macs_key`, JSON, automatische Garbage Collection). |

## React-Chat-Komponenten

MelisAIEngine hat **keinen Brick** und keinen `/melis-react`-Menüeintrag. Für das React-Backoffice stellt sie eine **reine Quellcode-Komponentenbibliothek** unter `ui-react/src/` bereit, die von Konsumenten über den Vite-Alias **`@melis-ai-engine`** (zugeordnet zu `melis-ai-engine/ui-react/src`) importiert wird. Sie rendert die gesamte Chat-Oberfläche; das eigentliche LLM wird stets von einem Provider-Modul geliefert.

| Export | Rolle |
| --- | --- |
| `AiChatContainer` (Standard) | Orchestrator-Komponente: durchläuft die gesamte Schleife `init → run → (continue×N) → validate`, hält den Chat-Zustand und verdrahtet die Unterkomponenten. **Diese einbinden.** |
| `ChatHistory`, `TypingIndicator`, `StepInterface` | Scrollbare Nachrichtenliste (Markdown über `window.marked`, sofern vorhanden), Denk-Indikator, Interface-Karten pro Schritt. |
| `ChatFormBox` | Untere Eingabeleiste: Textbereich, Senden/Validieren, `+`-Menü → Datei-Upload (`user_file_upload[]`) oder Medienbibliothek (`userMediaFiles[]`, MoxieManager), Drag-and-Drop-Overlay. |
| `ChatDebugPanel`, `DebugEntry` | Debug-Ansicht: Request-Payload (→) und rohe Modellantwort (←) als JSON-Blöcke (nur bei `debugMode`). |
| `MelisPlanPanel`, `extractMelisPlan`, `looksLikeMelisPlan` | Rendert einen von der KI vorgeschlagenen, strukturierten „Melis-Plan“ (z. B. eine Formularfeldliste) als Tabelle. |
| `aiEngineInit/Run/Continue/Validate/Restart` | Typisierter Client für die `ai-engine`-Endpunkte (§ Chat-Backend). |
| `parseResultActionString`, `dispatchResultAction`, `dispatchToolResults` | Dispatcher für die Closed-Loop-Navigation `JS_ACTION` (§ Closed-Loop-Navigation). |

**Einbindungsvertrag — `AiChatContainerProps`:**

```tsx
type AiChatContainerProps = {
  maiInstanceId: string                        // required — e.g. "agenttool" or "newscontentcreator|42"
  agentId?: number | null                      // override the instance's default agent
  extraEntryParams?: Record<string, unknown>   // → extra_entry_param[key] context
  entryParamForm?: Record<string, string>      // → entry_param_form[key]
  debugMode?: boolean
  exitParamArr?: ExitParamArr
  showCloseButton?: boolean
  needExitParam?: boolean
  showHideButton?: boolean
  showHeader?: boolean
  clearSession?: boolean                        // clear the server session on init (fresh conversation)
  autoRun?: boolean                             // start the agent immediately after init
  initialMessage?: string                       // first user_chat when autoRun
  onClose?: () => void
  onHide?: () => void
  className?: string
  style?: React.CSSProperties
}
```

Der Container begrenzt die Fortsetzung auf `MAX_CONTINUATION_HOPS = 20`. Um einem React-Tool einen KI-Chat hinzuzufügen, importieren Sie `AiChatContainer` und binden ihn mit einer `maiInstanceId` ein — es ist keine Backend-Arbeit erforderlich, die Endpunkte existieren bereits. Konsumenten erhöhen einen `key` am eingebundenen Element, um beim Neustart eine frische Serversitzung zu erzwingen.

## Wo es erscheint

Sie sehen MelisAIEngine niemals als Menüpunkt; seine Chat-Oberflächen erscheinen innerhalb des Moduls **MelisAI**, das denselben `AiChatContainer` an drei Stellen einbindet (nur `maiInstanceId` / `agentId` unterscheiden sich):

- **AI Assistant** — das schwebende Assistenten-Overlay (universeller Chat, der auf das Backoffice einwirken kann, gestartet mit `autoRun`).
- **Chat Dev Tool** — eine Entwickler-Spielwiese, um einen beliebigen Agenten/eine beliebige Instanz zu starten und mit ihm/ihr zu kommunizieren.
- **Agenten-Tab „Run“** — Testen eines Agenten aus dem MelisAI-Agenten-Tool (`maiInstanceId="agenttool"`).

## Chat-Backend — die `ai-engine`-Endpunkte

Die Routen werden in `config/module.config.php` deklariert (nicht in einer `react-api.php`), Controller-Alias `MelisAIEngine\Controller\React\MelisReactApiAiEngine` → `MelisReactApiAiEngineController`. Jede Aktion sichert sich mit `denyUnlessAuthenticated()` ab (401 ohne MelisCore-Identität — kein Berechtigungsgate pro Tool, da es sich um eine gemeinsam genutzte Engine handelt). Einheitlicher Antwort-Envelope: `{ success, data, error? }`. Diese Endpunkte spiegeln den älteren `AIController` (`/melis/MelisAIEngine/AI/*`) wider und rufen denselben `MelisAIEngineAgentService` auf.

| Methode & URL | Client-Funktion | Zweck |
| --- | --- | --- |
| `GET /melis/react-api/ai-engine/init` | `aiEngineInit` | Validiert Instanz→Agent→Modell→Provider; gibt `label`, `finalInstanceId`, `agentId`, `isFileUploadActivated`, `isMediaLibraryActivated`, `hasExitParameter` (oder `errorType`/`errorMessage`) zurück. |
| `POST /melis/react-api/ai-engine/run` | `aiEngineRun` | Startet/setzt einen Turn fort. JSON für Text, multipart/form-data, wenn Dateien angehängt sind → `runAgent()`. |
| `POST /melis/react-api/ai-engine/continue` | `aiEngineContinue` | Setzt einen mehrstufigen Turn fort (`needs_continuation=true`) → `continueConversation(sessionId, continuationContext)`. |
| `POST /melis/react-api/ai-engine/validate` | `aiEngineValidate` | Akzeptiert die Antwort der KI, geht zum Austrittsparameter-Schritt über, gibt `exitParams` für den Host-Callback zurück → `validateAnswer()`. |
| `POST /melis/react-api/ai-engine/restart` | `aiEngineRestart` | Löscht die Sitzung, gibt dieselbe `finalInstanceId` zur Wiederverwendung bereit zurück. |

Das `RunResult` enthält `chatHist`, `needs_continuation`, `session_id`, `continuation_context`, `payload`/`response` (Debug), `exitParams`, `tool_results`.

**Minimaler Text-Turn:**

```ts
import { aiEngineInit, aiEngineRun } from '@melis-ai-engine'

const cfg = await aiEngineInit({ maiInstanceId: 'agenttool', clearSession: true })
if (cfg.errorType) throw new Error(cfg.errorMessage)   // instance/agent/model/companyModule/exitParam

const res = await aiEngineRun({
  agentId:    cfg.agentId,
  instanceId: cfg.finalInstanceId,
  userText:   'Create a news article about our new store',
})
// res.chatHist, res.needs_continuation, res.session_id, res.tool_results …
```

## Closed-Loop-Navigation

Die Engine übernimmt ausschließlich das **Dispatching**: `nav-actions.ts` parst Callback-Strings der Form `JS_ACTION::action::k=v&…` aus den `tool_results` einer Antwort und ruft `window.melisReactActionMap[action](args)` auf. Die **Host-Shell (melis-core)** *registriert* diese Handler und ist für die React-Router-Navigation/DOM-Wahrnehmung zuständig. Ein Handler kann eine Beobachtung `Promise<string>` zurückgeben, auf die `dispatchToolResults` wartet und die als `continuationContext.clientObservation` zurückgeführt wird — was den nächsten Modell-Turn fundiert. Dadurch bleiben die beiden unabhängig erstellten Bundles entkoppelt: Nur der `window`-Vertrag verbindet sie.

## Beispiel (klassischer View-Helper)

Der klassische, serverseitig gerenderte Helper funktioniert weiterhin für Nicht-React-Kontexte (`.phtml`):

```php
// Render the chat box for a named instance
echo $this->AIChatViewHelper($maiInstanceId);
```

Registrieren Sie einen benutzerdefinierten MCP-Server und deklarieren Sie seine Tools, damit ein Agent sie aufrufen kann:

```php
// In a module's config — register the MCP server
'mcp' => [
    'servers' => [
        'my-mcp-server' => [
            'enabled' => true,
            'command' => 'node',
            'args'    => ['/path/to/server.js'],
            'tools'   => ['my_tool'],
            'timeout' => 30,
        ],
    ],
],
// Declare the tool with mcp: true
'plugins' => [
    'melisaiengine' => [
        'datas' => [
            'function_declarations' => [
                [
                    'name'        => 'my_tool',
                    'description' => 'Does something useful',
                    'mcp'         => true,
                    // JSON schema for parameters…
                ],
            ],
        ],
    ],
],
```

## Zentrale Dateien

| Aspekt | Pfad |
| --- | --- |
| Provider-Vertrag (abstrakt) | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineModelService.php` |
| Registry + Provider-Auswahl | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineService.php` |
| Agenten-/Szenario-Laufzeitumgebung | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineAgentService.php` |
| MCP-/Tool-Bridge | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineMcpService.php` |
| Persistenter Konversationsspeicher | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineConversationStore.php` |
| Integrierte Funktionen | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineFunctionService.php` |
| Klassischer Chat-Controller | `vendor/melisplatform/melis-ai-engine/src/Controller/AIController.php` |
| React-Chat-Backend | `vendor/melisplatform/melis-ai-engine/src/Controller/React/MelisReactApiAiEngineController.php` |
| Gemeinsam genutzte React-Chat-Bibliothek | `vendor/melisplatform/melis-ai-engine/ui-react/src/` (`AiChatContainer.tsx`, `api.ts`, `nav-actions.ts`…) |
| Datenbanktabellen-Modelle | `vendor/melisplatform/melis-ai-engine/src/Model/Tables/` |
| Modulkonfiguration | `vendor/melisplatform/melis-ai-engine/config/module.config.php` |

Siehe auch: [MelisAI](/de/reference/modules/melis-ai), [MelisAIEngineClaude](/de/reference/modules/melis-ai-engine-claude), [MelisAIEngineGemini](/de/reference/modules/melis-ai-engine-gemini), [MelisAIToolCreator](/de/reference/modules/melis-ai-tool-creator).
