# MelisAI

> Back-office React per la suite MelisAI — collega i provider, progetta gli agenti, distribuisci le istanze, monitora l'utilizzo, ispeziona i server MCP e chatta da qualsiasi punto. Pacchetto `melisplatform/melis-ai`.

## Scopo

MelisAI è il **livello di gestione back-office** della suite MelisAI. Non esegue direttamente i modelli AI — è questo il compito di `melis-ai-engine` e dei suoi moduli provider. Fornisce l'interfaccia e i servizi per collegare l'intero sistema AI: collega un provider (**Platform AI**), costruisce comportamenti (**AI Agents** con scenari e allow-list di strumenti), li distribuisce come **Istanze** con nome, monitora l'**Utilizzo**, esegue il debug con una chat a payload grezzo (**Chat Dev Tool**) e ispeziona i **server MCP** connessi.

Nel **back-office React** (`/melis-react`) MelisAI viene distribuito come un **unico bundle multi-brick** che espone tre strumenti di menu React nativi — **Admin**, **AI Agents**, **MCP Inspector** — ciascuno con un interruttore **New / Old** verso il rispettivo strumento legacy in un iframe, **più un overlay globale di AI Assistant** (un pulsante di chat fluttuante su ogni schermata, senza voce di menu). La logica AI rimane lato server in `melis-ai-engine`.

## Come abilitarlo

Aggiungi a `config/melis.module.load.php` (i moduli provider devono essere elencati prima di `MelisAI`):

```php
return [
    'MelisAIEngine',
    'MelisAIEngineClaude',   // Anthropic provider
    'MelisAIEngineGemini',   // Google provider
    'MelisAI',
];
```

`MelisAI` richiede `melisplatform/melis-ai-engine`, che possiede tutte le tabelle di database `melis_ai_*` e il runtime agente/scenario. I moduli provider (`melis-ai-engine-claude`, `melis-ai-engine-gemini`, `-ollama`, `-oci`) implementano il contratto del provider e devono essere installati per le rispettive company.

## I quattro sostantivi fondamentali

| Sostantivo | Tabella | Colonna chiave | Descrizione |
| --- | --- | --- | --- |
| **model** | `melis_ai_models` (`mam_*`) | `mam_generative_model` | Una riga di modello del provider: company (Anthropic / Google), stringa del modello, collegamento alla chiave API, flag predefinito, impostazioni di caricamento file. |
| **agent** | `melis_ai_agents` (`maa_*`) | `maa_agent_tools` (allow-list JSON) | Un comportamento: nome, codice agente, override facoltativo del modello, passi di scenario ordinati, allow-list di strumenti. |
| **instance** | `melis_ai_instances` (`mai_*`) | `mai_instance_id` | Una distribuzione con nome di un agente. La stringa `mai_instance_id` è la chiave stabile a cui fa riferimento ogni interfaccia (ad es. `mainchatassistantgeneral`, `aitoolcreator`). |
| **tool** | `melis_ai_tools` (`mat_*`) | — | Una funzione richiamabile che il modello può invocare. O di tipo **MCP** (server MCP esterno, `mcp: true`) oppure **Local** (PHP integrato). |

**Modello mentale in una frase:** un'istanza punta a un agente, un agente punta a un modello, un modello nomina una company — questo seleziona il provider; una chat sull'istanza esegue lo scenario dell'agente, richiamando gli strumenti consentiti dell'agente.

## Dove si trova nel back-office React

MelisAI viene distribuito come **un** bundle di brick (`public/ui-react/brick.js`) il cui manifest dichiara un array `bricks: [...]` — quattro registrazioni che si auto-registrano in `brick.tsx`:

| Brick id | Rotta | melisKey | Tipo |
| --- | --- | --- | --- |
| `ai-admin` | `/melis-ai/admin` | `melisadmin_tool` | shell a schede React nativa (Usage / Platform AI / Instances / MCP Server / Chat dev tool) |
| `ai-agents` | `/melis-ai/ai-agents` | `melisagent_tool` | elenco + editor React nativo (sotto-schede) |
| `mcp-inspector` | `/melis-ai/mcp-inspector` | `melis_mcp_inspector_tool` | React nativo (singola funzione) |
| `ai-assistant` | *(nessuna)* | — | **Overlay** — il FAB di chat fluttuante globale, senza rotta né voce di menu |

I tre strumenti con rotta compaiono nel menu di sinistra sotto **Melis AI** (accanto ad **AI Tool Creator**, fornito dal modulo separato `melis-ai-tool-creator`). L'assistant viene renderizzato una sola volta alla radice della shell, così la chat fluttuante sopravvive alla navigazione. Tutti compaiono solo quando MelisAI è attivo (rilevamento dei brick tramite `GET /melis/react-api/react-modules`). Ogni strumento di menu dispone di un interruttore **New / Old**: **New** = l'interfaccia React, **Old** = lo strumento classico in un iframe.

![La sezione Melis AI nella barra laterale React — Admin, AI Agents, MCP Inspector, AI Tool Creator](/screenshots/react/melis-ai/melisai-menu-section-melisai.png)

## Admin — configurare l'AI

Rotta `/melis-ai/admin`. Una shell a schede React nativa — **Usage · Platform AI · Instances · MCP Server · Chat dev tool** — con un unico Save (salva la scheda attiva) e un interruttore New/Old a livello di intero strumento.

- **Usage** — filtra per Company/Model su un intervallo; quattro grafici: Total Queries, Queries per Instance, Total Tokens, Tokens per Instance (le serie per istanza sono le istanze distribuite). Alimentato da `melis_ai_daily_usage`.

![Admin → scheda Usage — filtri Company/Model e quattro grafici (query e token, totali e per istanza) su un intervallo selezionabile](/screenshots/react/melis-ai/melisai-tool-admin-tab-usage.png)

- **Platform AI** — attiva l'AI: scegli Company + Model, seleziona *Same key for all platforms* o *One key per platform*, incolla la/le chiave/i, imposta **Status: Active** + **Default model: Yes**. In più **Upload management** — interruttori per i file utente/contesto e **Upload mode: File API vs Embed in request** (la modalità `mam_file_upload_mode` che i provider leggono; Gemini utilizza per impostazione predefinita File API, Claude embed) e la dimensione massima del file.

![Admin → scheda Platform AI — company/model/chiavi a sinistra, interruttori Status + Default e File Upload Management (File API vs Embed in request, dimensione massima) a destra](/screenshots/react/melis-ai/melisai-tool-admin-tab-platformai.png)

- **Instances** — schede KPI (Total / Active / Inactive), ricerca, filtri e **+ New instance**. Sei sono incluse di serie: tre istanze **system** (solo modifica, senza eliminazione: `admintool`, `agenttool`, `mainchatassistantgeneral`) e tre istanze **app** (eliminabili: `aitoolcreator`, `minitemplatecreator`, `newscontentcreator`). La modifica apre un modulo in sotto-scheda: **Name**, **Instance ID** (il `mai_instance_id`), **Status**, **Agent** (facoltativo) e una **Label** per lingua.

![Admin → scheda Instances — schede KPI, ricerca + filtri e le sei istanze incluse (system + app) con il loro Name ID e l'agente collegato](/screenshots/react/melis-ai/melisai-tool-admin-tab-instances.png)

![Admin → Instances — modulo di modifica: Name, Instance ID, Status, Agent e traduzioni per lingua](/screenshots/react/melis-ai/melisai-tool-admin-tab-instances-edit.png)

- **MCP Server** — due sotto-schede: **MCP Exposition** (seleziona quali funzioni MCP il server MCP espone ai client) e una scheda **DB / sensitive tables**; ciascuna ha il proprio Save.
- **Chat Dev Tool** — una chat di debug: scegli un agente, chatta e leggi l'esatto **raw AI PAYLOAD** (`tools` / `functionDeclarations`, contesto) e il JSON di **AI RESPONSE** affiancati.

![Admin → Chat Dev Tool — scegli un agente, chatta a sinistra e leggi il payload AI grezzo (functionDeclarations, tools, contesto) a destra](/screenshots/react/melis-ai/melisai-tool-admin-tab-chatdevtool.png)

## AI Agents — progettare il comportamento

Rotta `/melis-ai/ai-agents`. L'elenco mostra **ID / Status / Name / Entries / Call number** (Entries = passi dello scenario, Call number = chiamate AI complessive) con schede KPI, ricerca, filtri ed Export. L'apertura di un agente aggiunge una sotto-scheda con un editor a cinque schede e un unico Save.

![Elenco AI Agents — schede KPI, ricerca/filtri e gli agenti inclusi (Tool Builder, Mini-template Creator, News Content Creator, Main Chat Assistant) con conteggio dei passi e numero di chiamate](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents.png)

| Scheda | Scopo |
| --- | --- |
| **Config** | Nome dell'agente, codice agente (slug stabile), descrizione, **Override default AI model** (Company + Model), interruttori di caricamento file, interruttore Active. |
| **AI Tools** | L'allow-list delle capacità — seleziona gli strumenti che questo agente può richiamare, raggruppati in **MCP tools** (serviti dai server MCP) e **Local tools** (PHP integrato). Il motore offre al modello esattamente gli strumenti selezionati. |
| **DB Rights** | Caselle **read / write / delete row / drop** per tabella raggruppate per modulo, un interruttore globale **Allow table creation**, gestione delle tabelle sensibili, ricerca ed Espandi/Comprimi tutto. |
| **Scenario** | Passi tipizzati e ordinati con riordinamento tramite trascinamento e modifica/eliminazione per riga: `ENTRY PARAMS` → `AI CONTEXT` (silenzioso) → `AI CHAT` (visibile) → `EXIT PARAMS`, più passi `CODE` facoltativi. Ogni passo ha un **Code** a cui fai riferimento con `[CODE]` per recuperare la risposta di un passo precedente. La modifica di un passo apre una finestra modale (Code, Return type, Type of entry, AI Prompt con un editor General + override per lingua). |
| **Run** | Una chat di test in loco contro l'agente (con un facoltativo *Custom step end prompt*), che esegue la stessa chat nativa dell'assistant. |

![Editor agente → scheda Config — Status, nome/codice/descrizione dell'agente, override del modello (company + model) e interruttori di caricamento file](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-config.png)

![Editor agente → scheda AI Tools — un elenco di controllo di MCP tools e Local tools; l'intestazione mostra quanti del catalogo sono selezionati](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-aitools.png)

![Editor agente → scheda DB Rights — caselle read/write/delete/drop per tabella raggruppate per modulo, l'interruttore globale "Allow table creation" e la gestione delle tabelle sensibili](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-dbrights.png)

![Editor agente → scheda Scenario — passi tipizzati e ordinati (ENTRY PARAMS, AI CONTEXT, CODE, AI CHAT, EXIT PARAMS) con riordinamento tramite trascinamento e modifica/eliminazione per riga](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-scenario.png)

![Editor agente → finestra modale di modifica passo — Code, Return type, Type of entry e l'AI Prompt con schede General + per lingua](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-scenario-editstep.png)

![Editor agente → scheda Run — una chat di test in loco con una casella "Custom step end prompt" e Relaunch, che esegue l'agente in tempo reale](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-run.png)

### Catalogo degli strumenti inclusi

| Gruppo | Strumenti |
| --- | --- |
| **MCP — schema/dati DB** | `getTableStructure`, `createDatabaseTable`, `addDBTableColumns`, `updateDBTableColumns`, `dropDBTableColumns`, `selectData`, `insertData`, `updateData`, `deleteData`, `bulkInsertData` |
| **MCP — filesystem** | `createFile`, `createDirectory`, `pathExists`, `readFile`, `updateFiles`, `deleteFile`, `deleteDirectory` |
| **MCP — sito/mini-template** (CommunityExtensions) | `readSiteAssets`, `getSitePublicUrl`, `uploadMinitemplateImages`, `renderMinitemplatePreview` |
| **MCP — module builder** (ToolCreator) | `createModule`, `activateModule`, `deactivateModule`, `generateBundle` |
| **Local** | `activate_module` |

## MCP Inspector

Rotta `/melis-ai/mcp-inspector`. Una pagina React nativa (con interruttore New/Old) che elenca i **server MCP** connessi e consente di avviarli / verificarne lo stato / leggerne i log — per confermare che un server sia attivo e che i suoi strumenti siano rilevabili prima di consentirli su un agente. Alimentato dal `MelisAIEngineMcpService` del motore.

## AI Assistant — chattare da qualsiasi punto

Il pulsante fluttuante **AI Assistant** (in basso a destra, su ogni schermata) apre un pannello di chat che esegue il **Main Chat Assistant** generale (agente id `1`, istanza `mainchatassistantgeneral`). Può pilotare il back-office (aprire uno strumento, aprire una pagina) dalla conversazione, inoltrato lato host tramite `window.melisReactActionMap`. Minimise conserva la sessione, New session ne avvia una nuova, Close la termina.

![Il pulsante fluttuante globale di AI Assistant (in basso a destra della shell) — un'icona a forma di robot contrassegnata con il logo a gradiente "M" di MelisAi](/screenshots/react/melis-ai/melisai-footer-icon-generalassistant.png)

![Il pannello AI Assistant aperto — il "Main Chat Assistant" generale che esegue l'istanza `mainchatassistantgeneral`, con Minimise / New session / Close nell'intestazione](/screenshots/react/melis-ai/melisai-footer-icon-generalassistant-deployed.png)

## React API — endpoint

Non esiste alcun **`config/react-api.php`**: le rotte react-api sono dichiarate **inline in `config/module.config.php`**, innestate sulla rotta padre `melis-react-api` (prefisso `/melis/react-api`). I controller si trovano in `src/Controller/React/MelisReactApiAi*Controller.php`. Contratto ovunque: `{ success, data }` in caso di OK, `{ success:false, error }` in caso di errore; ogni fetch invia `X-Requested-With: XMLHttpRequest` + credentials.

Ogni controller implementa la propria protezione di accesso (non il trait generico):

```php
private const MELIS_KEY = 'melisadmin_tool'; // or melisagent_tool / melis_mcp_inspector_tool
if ($deny = $this->denyUnlessAccess()) { return $deny; }
//   → 401 if !isAuthenticated() ; else 403 unless MelisCoreRights::canAccess(self::MELIS_KEY)
```

| Superficie (protezione) | Endpoint rappresentativi (`/melis/react-api/…`) |
| --- | --- |
| **Admin** (`melisadmin_tool`) | `ai-usage/bootstrap` · `ai-usage/charts` · `ai-platform/data` · `ai-instances/{bootstrap,stats,list,save,:id,delete/:id}` · `ai-mcp-server/{data,save-tools,save-sensitive}` · `ai-chat-dev/{agents,run,continue}` |
| **AI Agents** (`melisagent_tool`) | `agents` (elenco) · `agents/{stats,options,:id,save,delete/:id,db-rights/:id}` · `agents/scenario/{list,options,step/:id,…}` |
| **MCP Inspector** (`melis_mcp_inspector_tool`) | `mcp-inspector/{servers,launch,status,log}` |

Le **scritture** dello scenario riutilizzano gli endpoint legacy `/melis/MelisAI/AgentProperties/*` (delete / reorder / save), così tutta la validazione, la gestione dei file e l'unicità del codice restano lato server. Esempio (da `agent-api.ts`):

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

## Capacità (diritti avanzati)

Dichiarate in `config/react.capabilities.php` sotto `melisReactToolCapabilities`, indicizzate dal `melisKey` portatore di diritti di ciascuno strumento. **Predefinite come consentite, solo dichiarative**: pilotano le caselle di controllo in **Users → Rights** e regolano quali schede/azioni React vengono mostrate (`useCaps(melisKey).can(cap)`); **non** sono applicate lato server (i controller regolano l'accesso solo sull'accesso allo strumento tramite `canAccess`).

- `melisadmin_tool` — granularità per **scheda** (`usage`, `platform_ai.edit`, `instances` + `create/edit/delete`, `chat_dev`, `mcp_server` con `tools.edit` / `db.edit` annidati).
- `melisagent_tool` — CRUD a livello di strumento (`list/create/edit/delete`) più le schede dell'editor (`general`, `tools`, `dbrights`, `scenario` + CRUD, `run`).
- `melis_mcp_inspector_tool` — non dichiara nulla; l'accesso è l'unica casella di controllo di accesso allo strumento di menu.

## La dipendenza dall'interfaccia di chat

Ogni superficie di chat (l'overlay dell'assistant, la scheda **Run** dell'agente, il **Chat Dev Tool** di Admin) renderizza `<AiChatContainer>` importato da **`@melis-ai-engine`** — un alias Vite per `../../melis-ai-engine/ui-react/src`, così il componente di chat viene **impacchettato dai sorgenti di melis-ai-engine** in questo brick (non esternalizzato). Prop principali: `maiInstanceId`, `agentId`, `autoRun`, `showHeader`, `clearSession`, `extraEntryParams`.

Per gli sviluppatori che incorporano una chatbox in una vista **legacy / renderizzata lato server**, `melis-ai-engine` fornisce ancora il view helper `AIChatViewHelper($maiInstanceId, …)` — vedi la [pagina MelisAI legacy](/legacy/reference/modules/melis-ai) e [melis-ai-engine](/legacy/reference/modules/melis-ai-engine).

## Flusso di chat (cosa accade all'invio)

1. Una superficie di chat invia i turni dell'utente al motore per il dato `mai_instance_id`.
2. `MelisAIEngineAgentService::runAgent()` risolve **instance → agent → model**, quindi seleziona il provider tramite `getActiveModelClass($company, $modelId, $agentId)` (company `Google` → Gemini, `Anthropic` → Claude).
3. Il motore percorre in ordine i **passi dello scenario** dell'agente; `MelisAIEngineModelService::send()` chiama l'API AI; le chiamate agli strumenti vengono instradate tramite `MelisAIEngineMcpService` (JSON-RPC per gli strumenti MCP, chiamata PHP diretta per gli strumenti Local).
4. Lo stato viene persistito in `melis_ai_conversation_state`; i conteggi di token/chiamate in `melis_ai_daily_usage`.

**MelisAI non chiama mai direttamente le API AI — lo fanno il motore e i moduli provider.**

## Pattern di estensione (come si integrano i moduli applicativi)

1. **dbdeploy** inserisce un **agente** (con scenario + allow-list di strumenti) e un'**istanza** con un `mai_instance_id` fisso.
2. Registra un **server MCP** sotto `config['mcp']['servers']` e dichiara i suoi strumenti in `function_declarations` con `mcp: true`.
3. Aggiungi una voce di interfaccia che apre una chat su `<mai_instance_id>` con i corretti parametri di entry/exit.

## Tabelle di database

MelisAI non possiede alcuno schema proprio — tutte le tabelle sono installate da `melis-ai-engine`. Il prefisso è `melis_ai_*`.

| Tabella | Contiene |
| --- | --- |
| `melis_ai_models` (`mam_*`) | Righe di modello del provider (company, stringa del modello, collegamento alla chiave API, impostazioni di caricamento file). |
| `melis_ai_companies` (`macp_*`) | Definizioni di company (Google, Anthropic, …). |
| `melis_ai_platform_keys` (`mapk_*`) | Chiavi API del provider. |
| `melis_ai_agents` (`maa_*`) | Definizioni di agente (code, override del modello, allow-list JSON `maa_agent_tools`). |
| `melis_ai_agents_tools` (`maat_*`) | Join agente-strumento. |
| `melis_ai_tools` (`mat_*`) | Catalogo degli strumenti (MCP / Local). |
| `melis_ai_instances` (`mai_*`) | Distribuzioni con nome (`mai_instance_id` stabile). |
| `melis_ai_instance_trans` (`mait_*`) | Etichette di istanza per lingua. |
| `melis_ai_scenario_steps` (`mas_*`) | Passi di scenario ordinati per agente. |
| `melis_ai_scenario_steps_datas` (`massd_*`) | Dati del passo (testo di contesto, percorso del modulo, …). |
| `melis_ai_scenario_steps_datas_entryexit` (`masse_*`) | Definizioni dei parametri di entry/exit per passo. |
| `melis_ai_return_types` (`mart_*`) | Definizioni dei tipi di ritorno di exit. |
| `melis_ai_files` (`maf_*`) | File allegati ai passi dello scenario. |
| `melis_ai_daily_usage` (`mau_*`) | Contatori di utilizzo di token e query. |
| `melis_ai_conversation_state` (`macs_*`) | Stato della conversazione per utente. |

Vedi anche: [melis-ai-engine](/legacy/reference/modules/melis-ai-engine) · [melis-ai-engine-claude](/legacy/reference/modules/melis-ai-engine-claude) · [melis-ai-engine-gemini](/legacy/reference/modules/melis-ai-engine-gemini) · [melis-ai-tool-creator](/legacy/reference/modules/melis-ai-tool-creator) · [melis-ai-community-extensions](/legacy/reference/modules/melis-ai-community-extensions)
