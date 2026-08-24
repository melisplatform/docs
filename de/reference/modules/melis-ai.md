# MelisAI

> React-Backoffice für die MelisAI-Suite — Anbieter verbinden, Agenten entwerfen, Instanzen bereitstellen, Nutzung überwachen, MCP-Server inspizieren und von überall chatten. Paket `melisplatform/melis-ai`.

## Zweck

MelisAI ist die **Backoffice-Verwaltungsebene** der MelisAI-Suite. Sie führt selbst keine KI-Modelle aus — das ist die Aufgabe von `melis-ai-engine` und dessen Anbietermodulen. Sie stellt die Benutzeroberfläche und die Dienste bereit, um das gesamte KI-System zu verdrahten: einen Anbieter verbinden (**Platform AI**), Verhaltensweisen erstellen (**AI Agents** mit Szenarien und Werkzeug-Zulassungslisten), diese als benannte **Instanzen** bereitstellen, die **Nutzung** überwachen, mit einem Roh-Payload-Chat debuggen (**Chat Dev Tool**) und verbundene **MCP-Server** inspizieren.

Im **React-Backoffice** (`/melis-react`) liefert MelisAI ein **einziges Multi-Brick-Bundle** aus, das drei native React-Menüwerkzeuge bereitstellt — **Admin**, **AI Agents**, **MCP Inspector** — jeweils mit einem **New / Old**-Umschalter zum zugehörigen Legacy-Werkzeug in einem iframe, **plus einem globalen AI-Assistant-Overlay** (eine schwebende Chat-Schaltfläche auf jedem Bildschirm, ohne Menüeintrag). Die KI-Logik verbleibt serverseitig in `melis-ai-engine`.

## Aktivierung

Zu `config/melis.module.load.php` hinzufügen (Anbietermodule müssen vor `MelisAI` aufgeführt werden):

```php
return [
    'MelisAIEngine',
    'MelisAIEngineClaude',   // Anthropic provider
    'MelisAIEngineGemini',   // Google provider
    'MelisAI',
];
```

`MelisAI` benötigt `melisplatform/melis-ai-engine`, das alle `melis_ai_*`-Datenbanktabellen sowie die Agenten-/Szenario-Laufzeitumgebung besitzt. Anbietermodule (`melis-ai-engine-claude`, `melis-ai-engine-gemini`, `-ollama`, `-oci`) implementieren den Anbietervertrag und müssen für die jeweiligen Unternehmen installiert sein.

## Die vier zentralen Begriffe

| Begriff | Tabelle | Schlüsselspalte | Beschreibung |
| --- | --- | --- | --- |
| **model** | `melis_ai_models` (`mam_*`) | `mam_generative_model` | Eine Anbieter-Modellzeile: Unternehmen (Anthropic / Google), Modell-String, API-Schlüssel-Verknüpfung, Standard-Kennzeichen, Datei-Upload-Einstellungen. |
| **agent** | `melis_ai_agents` (`maa_*`) | `maa_agent_tools` (JSON-Zulassungsliste) | Ein Verhalten: Name, Agenten-Code, optionale Modellüberschreibung, geordnete Szenarioschritte, Zulassungsliste von Werkzeugen. |
| **instance** | `melis_ai_instances` (`mai_*`) | `mai_instance_id` | Eine benannte Bereitstellung eines Agenten. Der `mai_instance_id`-String ist der stabile Schlüssel, auf den jede Benutzeroberfläche verweist (z. B. `mainchatassistantgeneral`, `aitoolcreator`). |
| **tool** | `melis_ai_tools` (`mat_*`) | — | Eine aufrufbare Funktion, die das Modell aufrufen kann. Entweder **MCP** (externer MCP-Server, `mcp: true`) oder **Local** (integriertes PHP). |

**Gedankenmodell in einem Satz:** Eine Instanz verweist auf einen Agenten, ein Agent verweist auf ein Modell, ein Modell benennt ein Unternehmen — das wählt den Anbieter; ein Chat auf der Instanz führt das Szenario des Agenten aus und ruft dessen zugelassene Werkzeuge auf.

## Wo es im React-Backoffice zu finden ist

MelisAI liefert **ein** Brick-Bundle (`public/ui-react/brick.js`), dessen Manifest ein `bricks: [...]`-Array deklariert — vier Registrierungen, die sich selbst in `brick.tsx` registrieren:

| Brick-ID | Route | melisKey | Art |
| --- | --- | --- | --- |
| `ai-admin` | `/melis-ai/admin` | `melisadmin_tool` | native React-Tab-Hülle (Usage / Platform AI / Instances / MCP Server / Chat dev tool) |
| `ai-agents` | `/melis-ai/ai-agents` | `melisagent_tool` | native React-Liste + Editor (Unterregister) |
| `mcp-inspector` | `/melis-ai/mcp-inspector` | `melis_mcp_inspector_tool` | native React (Einzelfunktion) |
| `ai-assistant` | *(keine)* | — | **Overlay** — der globale schwebende Chat-FAB, keine Route, kein Menüeintrag |

Die drei mit Routen versehenen Werkzeuge erscheinen im linken Menü unter **Melis AI** (neben **AI Tool Creator**, das vom separaten Modul `melis-ai-tool-creator` beigesteuert wird). Der Assistent wird einmal an der Wurzel der Hülle gerendert, sodass der schwebende Chat die Navigation überdauert. Alle erscheinen nur, wenn MelisAI aktiv ist (Brick-Erkennung über `GET /melis/react-api/react-modules`). Jedes Menüwerkzeug trägt einen **New / Old**-Umschalter: **New** = die React-Benutzeroberfläche, **Old** = das klassische Werkzeug in einem iframe.

![Der Bereich Melis AI in der React-Seitenleiste — Admin, AI Agents, MCP Inspector, AI Tool Creator](/screenshots/react/melis-ai/melisai-menu-section-melisai.png)

## Admin — die KI konfigurieren

Route `/melis-ai/admin`. Eine native React-Tab-Hülle — **Usage · Platform AI · Instances · MCP Server · Chat dev tool** — mit einem einzelnen Speichern (speichert das aktive Register) und einem werkzeugweiten New/Old-Umschalter.

- **Usage** — Filterung nach Company/Model über einen Zeitraum; vier Diagramme: Total Queries, Queries per Instance, Total Tokens, Tokens per Instance (die Reihen pro Instanz sind Ihre bereitgestellten Instanzen). Gestützt auf `melis_ai_daily_usage`.

![Admin → Register Usage — Company/Model-Filter und vier Diagramme (Abfragen & Tokens, gesamt und pro Instanz) über einen wählbaren Zeitraum](/screenshots/react/melis-ai/melisai-tool-admin-tab-usage.png)

- **Platform AI** — die KI einschalten: Company + Model wählen, *Same key for all platforms* oder *One key per platform* auswählen, die Schlüssel einfügen, **Status: Active** + **Default model: Yes** setzen. Dazu **Upload management** — Umschalter für Benutzer-/Kontextdateien und **Upload mode: File API vs Embed in request** (der `mam_file_upload_mode`, den die Anbieter auslesen; Gemini verwendet standardmäßig File API, Claude Embed) sowie maximale Dateigröße.

![Admin → Register Platform AI — Unternehmen/Modell/Schlüssel links, Status- + Default-Umschalter und File Upload Management (File API vs Embed in request, max. Größe) rechts](/screenshots/react/melis-ai/melisai-tool-admin-tab-platformai.png)

- **Instances** — KPI-Karten (Total / Active / Inactive), Suche, Filter und **+ New instance**. Sechs werden standardmäßig ausgeliefert: drei **System**-Instanzen (nur bearbeitbar, nicht löschbar: `admintool`, `agenttool`, `mainchatassistantgeneral`) und drei **App**-Instanzen (löschbar: `aitoolcreator`, `minitemplatecreator`, `newscontentcreator`). Das Bearbeiten öffnet ein Unterregister-Formular: **Name**, **Instance ID** (die `mai_instance_id`), **Status**, **Agent** (optional) und ein sprachspezifisches **Label**.

![Admin → Register Instances — KPI-Karten, Suche + Filter und die sechs ausgelieferten Instanzen (System + App) mit ihrer Name-ID und dem verknüpften Agenten](/screenshots/react/melis-ai/melisai-tool-admin-tab-instances.png)

![Admin → Instances — Bearbeitungsformular: Name, Instance ID, Status, Agent und sprachspezifische Übersetzungen](/screenshots/react/melis-ai/melisai-tool-admin-tab-instances-edit.png)

- **MCP Server** — zwei Unterregister: **MCP Exposition** (auswählen, welche MCP-Funktionen der MCP-Server für Clients bereitstellt) und ein Register **DB / sensitive tables**; jedes hat sein eigenes Speichern.
- **Chat Dev Tool** — ein Debugging-Chat: einen Agenten wählen, chatten und die exakte **raw AI PAYLOAD** (`tools` / `functionDeclarations`, Kontext) und die **AI RESPONSE** als JSON nebeneinander lesen.

![Admin → Chat Dev Tool — einen Agenten wählen, links chatten und rechts die rohe AI-Payload (functionDeclarations, tools, context) lesen](/screenshots/react/melis-ai/melisai-tool-admin-tab-chatdevtool.png)

## AI Agents — das Verhalten entwerfen

Route `/melis-ai/ai-agents`. Die Liste zeigt **ID / Status / Name / Entries / Call number** (Entries = Szenarioschritte, Call number = KI-Aufrufe über die Lebensdauer) mit KPI-Karten, Suche, Filtern und Export. Das Öffnen eines Agenten fügt ein Unterregister mit einem Editor aus fünf Registern und einem einzelnen Speichern hinzu.

![Liste AI Agents — KPI-Karten, Suche/Filter und die ausgelieferten Agenten (Tool Builder, Mini-template Creator, News Content Creator, Main Chat Assistant) mit Schrittanzahl und Aufrufanzahl](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents.png)

| Register | Zweck |
| --- | --- |
| **Config** | Agentenname, Agenten-Code (stabiler Slug), Beschreibung, **Override default AI model** (Company + Model), Datei-Upload-Umschalter, Active-Schalter. |
| **AI Tools** | Die Fähigkeits-Zulassungsliste — die Werkzeuge ankreuzen, die dieser Agent aufrufen darf, gruppiert in **MCP tools** (von MCP-Servern bereitgestellt) und **Local tools** (integriertes PHP). Die Engine bietet dem Modell genau die angekreuzten Werkzeuge an. |
| **DB Rights** | Kontrollkästchen **read / write / delete row / drop** pro Tabelle, gruppiert nach Modul, ein globaler Schalter **Allow table creation**, Behandlung sensibler Tabellen, Suche und Expand/Collapse all. |
| **Scenario** | Geordnete typisierte Schritte mit Drag-to-reorder und zeilenweisem Bearbeiten/Löschen: `ENTRY PARAMS` → `AI CONTEXT` (verdeckt) → `AI CHAT` (sichtbar) → `EXIT PARAMS`, plus optionale `CODE`-Schritte. Jeder Schritt hat einen **Code**, den Sie mit `[CODE]` referenzieren, um die Antwort eines vorherigen Schritts abzurufen. Das Bearbeiten eines Schritts öffnet ein Modal (Code, Return type, Type of entry, AI Prompt mit einem General-Editor + sprachspezifischen Überschreibungen). |
| **Run** | Ein integrierter Test-Chat gegen den Agenten (mit einem optionalen *Custom step end prompt*), der denselben nativen Chat wie der Assistent ausführt. |

![Agenten-Editor → Register Config — Status, Agentenname/-code/-beschreibung, Modellüberschreibung (Company + Model) und Datei-Upload-Umschalter](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-config.png)

![Agenten-Editor → Register AI Tools — eine Checkliste von MCP tools und Local tools; die Kopfzeile zeigt, wie viele des Katalogs angekreuzt sind](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-aitools.png)

![Agenten-Editor → Register DB Rights — read/write/delete/drop-Kontrollkästchen pro Tabelle, gruppiert nach Modul, der globale Umschalter „Allow table creation" und die Behandlung sensibler Tabellen](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-dbrights.png)

![Agenten-Editor → Register Scenario — geordnete, typisierte Schritte (ENTRY PARAMS, AI CONTEXT, CODE, AI CHAT, EXIT PARAMS) mit Drag-to-reorder und zeilenweisem Bearbeiten/Löschen](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-scenario.png)

![Agenten-Editor → Modal zur Schrittbearbeitung — Code, Return type, Type of entry und der AI Prompt mit General- + sprachspezifischen Registern](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-scenario-editstep.png)

![Agenten-Editor → Register Run — ein integrierter Test-Chat mit einem Feld „Custom step end prompt" und Relaunch, der den Agenten live ausführt](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-run.png)

### Ausgelieferter Werkzeugkatalog

| Gruppe | Werkzeuge |
| --- | --- |
| **MCP — DB-Schema/-Daten** | `getTableStructure`, `createDatabaseTable`, `addDBTableColumns`, `updateDBTableColumns`, `dropDBTableColumns`, `selectData`, `insertData`, `updateData`, `deleteData`, `bulkInsertData` |
| **MCP — Dateisystem** | `createFile`, `createDirectory`, `pathExists`, `readFile`, `updateFiles`, `deleteFile`, `deleteDirectory` |
| **MCP — Site/Mini-Template** (CommunityExtensions) | `readSiteAssets`, `getSitePublicUrl`, `uploadMinitemplateImages`, `renderMinitemplatePreview` |
| **MCP — Modul-Builder** (ToolCreator) | `createModule`, `activateModule`, `deactivateModule`, `generateBundle` |
| **Local** | `activate_module` |

## MCP Inspector

Route `/melis-ai/mcp-inspector`. Eine native React-Seite (mit New/Old-Umschalter), die die verbundenen **MCP-Server** auflistet und es Ihnen ermöglicht, sie zu starten / den Status zu prüfen / Protokolle zu lesen — um zu bestätigen, dass ein Server läuft und seine Werkzeuge auffindbar sind, bevor Sie sie für einen Agenten zulassen. Gestützt auf den `MelisAIEngineMcpService` der Engine.

## AI Assistant — von überall chatten

Die schwebende Schaltfläche **AI Assistant** (unten rechts, auf jedem Bildschirm) öffnet ein Chat-Panel, das den allgemeinen **Main Chat Assistant** ausführt (Agenten-ID `1`, Instanz `mainchatassistantgeneral`). Er kann das Backoffice aus der Konversation heraus steuern (ein Werkzeug öffnen, eine Seite öffnen), wobei die Verteilung hostseitig über `window.melisReactActionMap` erfolgt. Minimieren behält die Sitzung bei, New session startet neu, Close beendet sie.

![Die globale schwebende Schaltfläche AI Assistant (unten rechts in der Hülle) — ein Roboter-Symbol mit dem „M"-Verlaufslogo von MelisAi als Abzeichen](/screenshots/react/melis-ai/melisai-footer-icon-generalassistant.png)

![Das AI-Assistant-Panel ausgeklappt — der allgemeine „Main Chat Assistant", der die Instanz `mainchatassistantgeneral` ausführt, mit Minimise / New session / Close in der Kopfzeile](/screenshots/react/melis-ai/melisai-footer-icon-generalassistant-deployed.png)

## React-API — Endpunkte

Es gibt **keine `config/react-api.php`**: Die react-api-Routen werden **inline in `config/module.config.php`** deklariert und an die übergeordnete Route `melis-react-api` (Präfix `/melis/react-api`) angehängt. Die Controller befinden sich in `src/Controller/React/MelisReactApiAi*Controller.php`. Vertrag überall: `{ success, data }` bei OK, `{ success:false, error }` bei Fehlschlag; jeder Fetch sendet `X-Requested-With: XMLHttpRequest` + Anmeldeinformationen.

Jeder Controller implementiert seinen eigenen Zugriffsschutz (nicht das generische Trait):

```php
private const MELIS_KEY = 'melisadmin_tool'; // or melisagent_tool / melis_mcp_inspector_tool
if ($deny = $this->denyUnlessAccess()) { return $deny; }
//   → 401 if !isAuthenticated() ; else 403 unless MelisCoreRights::canAccess(self::MELIS_KEY)
```

| Oberfläche (Guard) | Repräsentative Endpunkte (`/melis/react-api/…`) |
| --- | --- |
| **Admin** (`melisadmin_tool`) | `ai-usage/bootstrap` · `ai-usage/charts` · `ai-platform/data` · `ai-instances/{bootstrap,stats,list,save,:id,delete/:id}` · `ai-mcp-server/{data,save-tools,save-sensitive}` · `ai-chat-dev/{agents,run,continue}` |
| **AI Agents** (`melisagent_tool`) | `agents` (Liste) · `agents/{stats,options,:id,save,delete/:id,db-rights/:id}` · `agents/scenario/{list,options,step/:id,…}` |
| **MCP Inspector** (`melis_mcp_inspector_tool`) | `mcp-inspector/{servers,launch,status,log}` |

Szenario-**Schreibvorgänge** verwenden die Legacy-Endpunkte `/melis/MelisAI/AgentProperties/*` (delete / reorder / save) wieder, sodass die gesamte Validierung, Dateiverarbeitung und Code-Eindeutigkeit serverseitig bleibt. Beispiel (aus `agent-api.ts`):

```ts
const BASE = '/melis/react-api/agents'
await apiFetch<{ id: number }>(`${BASE}/save`, {
  method: 'POST',
  headers: { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json' },
  credentials: 'same-origin',
  body: JSON.stringify({
    id: 4, name: 'Tool Builder', code: 'aitoolcreator', modelId: null, status: 1,
    dbCanCreateTable: 1, tools: ['createModule', 'activateModule'],
    dbRights: { melis_cms_page: { read: true, write: false, delete_row: false, drop: false } },
  }),
})
```

## Fähigkeiten (erweiterte Rechte)

Deklariert in `config/react.capabilities.php` unter `melisReactToolCapabilities`, verschlüsselt nach dem rechtetragenden `melisKey` jedes Werkzeugs. **Standardmäßig erlaubend, rein deklarativ**: Sie steuern die Kontrollkästchen in **Users → Rights** und regeln, welche React-Register/-Aktionen angezeigt werden (`useCaps(melisKey).can(cap)`); sie werden **nicht** serverseitig durchgesetzt (Controller regeln nur den Werkzeugzugriff über `canAccess`).

- `melisadmin_tool` — Granularität pro **Register** (`usage`, `platform_ai.edit`, `instances` + `create/edit/delete`, `chat_dev`, `mcp_server` mit verschachteltem `tools.edit` / `db.edit`).
- `melisagent_tool` — CRUD auf Werkzeugebene (`list/create/edit/delete`) plus Editor-Register (`general`, `tools`, `dbrights`, `scenario` + CRUD, `run`).
- `melis_mcp_inspector_tool` — deklariert nichts; der Zugriff ist das einzelne Menü-Werkzeugzugriffs-Kontrollkästchen.

## Die Abhängigkeit der Chat-Benutzeroberfläche

Jede Chat-Oberfläche (das Assistant-Overlay, das Register **Run** des Agenten, das **Chat Dev Tool** des Admin) rendert `<AiChatContainer>`, importiert aus **`@melis-ai-engine`** — ein Vite-Alias auf `../../melis-ai-engine/ui-react/src`, sodass die Chat-Komponente **aus melis-ai-engine-Quellen** in diesen Brick **gebündelt** (nicht externalisiert) wird. Wichtige Props: `maiInstanceId`, `agentId`, `autoRun`, `showHeader`, `clearSession`, `extraEntryParams`.

Für Entwickler, die eine Chatbox in eine **Legacy- / serverseitig gerenderte** Ansicht einbetten, stellt `melis-ai-engine` weiterhin den View-Helper `AIChatViewHelper($maiInstanceId, …)` bereit — siehe die [Legacy-MelisAI-Seite](/legacy/reference/modules/melis-ai) und [melis-ai-engine](/legacy/reference/modules/melis-ai-engine).

## Chat-Ablauf (was beim Senden geschieht)

1. Eine Chat-Oberfläche sendet Benutzerbeiträge an die Engine für die gegebene `mai_instance_id`.
2. `MelisAIEngineAgentService::runAgent()` löst **Instanz → Agent → Modell** auf und wählt dann den Anbieter über `getActiveModelClass($company, $modelId, $agentId)` (Unternehmen `Google` → Gemini, `Anthropic` → Claude).
3. Die Engine durchläuft die **Szenarioschritte** des Agenten der Reihe nach; `MelisAIEngineModelService::send()` ruft die KI-API auf; Werkzeugaufrufe werden über `MelisAIEngineMcpService` geroutet (JSON-RPC für MCP-Werkzeuge, direkter PHP-Aufruf für Local-Werkzeuge).
4. Der Zustand wird in `melis_ai_conversation_state` persistiert; Token-/Aufrufzähler in `melis_ai_daily_usage`.

**MelisAI ruft die KI-APIs niemals selbst auf — das tun die Engine und die Anbietermodule.**

## Erweiterungsmuster (wie sich App-Module einklinken)

1. **dbdeploy** fügt einen **Agenten** (mit Szenario + Werkzeug-Zulassungsliste) und eine **Instanz** mit einer festen `mai_instance_id` ein.
2. Einen **MCP-Server** unter `config['mcp']['servers']` registrieren und dessen Werkzeuge in `function_declarations` mit `mcp: true` deklarieren.
3. Einen UI-Eintrag hinzufügen, der einen Chat auf `<mai_instance_id>` mit den richtigen Entry-/Exit-Parametern öffnet.

## Datenbanktabellen

MelisAI besitzt kein eigenes Schema — alle Tabellen werden von `melis-ai-engine` installiert. Das Präfix ist `melis_ai_*`.

| Tabelle | Enthält |
| --- | --- |
| `melis_ai_models` (`mam_*`) | Anbieter-Modellzeilen (Unternehmen, Modell-String, API-Schlüssel-Verknüpfung, Datei-Upload-Einstellungen). |
| `melis_ai_companies` (`macp_*`) | Unternehmensdefinitionen (Google, Anthropic, …). |
| `melis_ai_platform_keys` (`mapk_*`) | Anbieter-API-Schlüssel. |
| `melis_ai_agents` (`maa_*`) | Agentendefinitionen (Code, Modellüberschreibung, `maa_agent_tools`-JSON-Zulassungsliste). |
| `melis_ai_agents_tools` (`maat_*`) | Verknüpfung Agent-zu-Werkzeug. |
| `melis_ai_tools` (`mat_*`) | Werkzeugkatalog (MCP / Local). |
| `melis_ai_instances` (`mai_*`) | Benannte Bereitstellungen (stabile `mai_instance_id`). |
| `melis_ai_instance_trans` (`mait_*`) | Sprachspezifische Instanz-Labels. |
| `melis_ai_scenario_steps` (`mas_*`) | Geordnete Szenarioschritte pro Agent. |
| `melis_ai_scenario_steps_datas` (`massd_*`) | Schrittdaten (Kontexttext, Formularpfad, …). |
| `melis_ai_scenario_steps_datas_entryexit` (`masse_*`) | Entry-/Exit-Parameterdefinitionen pro Schritt. |
| `melis_ai_return_types` (`mart_*`) | Definitionen der Exit-Rückgabetypen. |
| `melis_ai_files` (`maf_*`) | An Szenarioschritte angehängte Dateien. |
| `melis_ai_daily_usage` (`mau_*`) | Token- und Abfrage-Nutzungszähler. |
| `melis_ai_conversation_state` (`macs_*`) | Konversationszustand pro Benutzer. |

Siehe auch: [melis-ai-engine](/legacy/reference/modules/melis-ai-engine) · [melis-ai-engine-claude](/legacy/reference/modules/melis-ai-engine-claude) · [melis-ai-engine-gemini](/legacy/reference/modules/melis-ai-engine-gemini) · [melis-ai-tool-creator](/legacy/reference/modules/melis-ai-tool-creator) · [melis-ai-community-extensions](/legacy/reference/modules/melis-ai-community-extensions)
