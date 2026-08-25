# IA: agenti e motore

Melis include un **motore IA** che consente di costruire **agenti** — flussi di lavoro IA scriptati e multi-fase —
e di renderli disponibili ovunque nel back-office o nei tuoi moduli. Diversi provider (Anthropic
Claude, Google Gemini, Ollama, OCI) si integrano dietro un unico motore.

I moduli coinvolti: `melis-ai` (strumenti React del back-office + l'Assistente IA globale),
`melis-ai-engine` (il motore e l'interfaccia di chat condivisa),
`melis-ai-engine-claude` / `melis-ai-engine-gemini` (provider) e
`melis-ai-community-extensions` (agenti di esempio già pronti).

In v6 il framework e i moduli sono invariati; ciò che è cambiato è il **back-office**, ora un'interfaccia React
in `/melis-react`. La logica IA resta lato server — React è presentazione più chiamate API.

## Concetti fondamentali

| Concetto | Che cos'è | Tabella |
| --- | --- | --- |
| **Azienda / provider** | Il fornitore IA (Anthropic, Google…). | `melis_ai_companies` |
| **Modello** | Un modello concreto di un'azienda (es. un modello Claude o Gemini). | `melis_ai_models` (`mam_generative_model`) |
| **Chiave di piattaforma** | La chiave API usata per chiamare un provider. | `melis_ai_platform_keys` |
| **Agente** | Un flusso di lavoro = un elenco ordinato di **fasi di scenario**. | `melis_ai_agents`, `melis_ai_scenario_steps` |
| **Istanza** | Un riferimento riutilizzabile e nominato per eseguire un agente (usato come id della sessione di chat). | `melis_ai_instances` (`mai_instance_id`) |
| **Utilizzo giornaliero** | Contabilizzazione dei token/utilizzo per modello/agente/istanza. | `melis_ai_daily_usage` |

Un **agente** è uno *scenario*: una sequenza di fasi come `ENTRY PARAMS`, `AI CONTEXT`,
`AI CHAT`, `CODE`, `EXIT PARAMS`. Il motore percorre le fasi, chiama il modello quando necessario e
produce una risposta finale — scrivendola opzionalmente nella pagina che l'ha avviato (tramite *exit
parameters*).

## Provider

Il motore seleziona un provider dal nome dell'**azienda** del modello
(`MelisAIEngine\Service\MelisAIEngineService::getActiveModelClass()`):

- l'azienda contiene **"Anthropic"** → `MelisAIEngineModelClaudeService` (modulo `melis-ai-engine-claude`)
- l'azienda contiene **"Google"** → `MelisAIEngineModelGeminiService` (modulo `melis-ai-engine-gemini`)
- più i moduli provider **Ollama** (locale) e **OCI** (OCI GenAI) che seguono lo stesso contratto

Ogni provider estende `MelisAIEngineModelService` di `melis-ai-engine` e implementa lo stesso
contratto (`setClient()`, formattazione di payload/messaggi, chiamate a strumenti). Aggiungere un nuovo provider significa
aggiungere un modulo con il proprio servizio di modello — nessuna modifica al motore. I provider **non hanno alcuna interfaccia
propria**: installandone uno si popolano la sua azienda + i modelli nel catalogo, che appaiono poi come
opzioni nell'amministrazione di MelisAI.

## Dove si trova nel back-office React

In `/melis-react`, MelisAI include **un unico bundle di brick** che espone **tre strumenti React nativi** nella
barra laterale sinistra sotto la sezione **Melis AI** — **Admin**, **AI Agents**, **MCP Inspector** — **oltre
a un overlay dell'Assistente IA globale**. Ogni strumento del menu ha un interruttore **New / Old**: *New* è l'interfaccia
React, *Old* apre lo strumento classico in un iframe.

![La sezione di menu Melis AI](/screenshots/react/melis-ai/melisai-menu-section-melisai.png)

Gli strumenti appaiono solo quando MelisAI è attivo. Una quarta voce — **AI Tool Creator** — è fornita
da un modulo differente (`melis-ai-tool-creator`).

## Configurarlo (Admin)

Apri **Melis AI → Admin**. Un unico interruttore **New/Old** si applica all'intero strumento; la vista React è
un contenitore a schede — **Usage · Platform AI · Instances · MCP Server · Chat dev tool** — con un unico **Save**
per la scheda attiva.

- **Platform AI** — scegli un **Company + Model**, incolla la/le **chiave/i API**
  (`melis_ai_platform_keys`) e imposta la piattaforma come **Active** + **Default**. Un modello deve avere una chiave
  per essere attivo. Il pannello di destra gestisce il caricamento dei file — inclusa la **Upload mode: File API vs Embed in
  request** (Gemini usa per impostazione predefinita File API, Claude l'embed).

  ![Admin → Platform AI](/screenshots/react/melis-ai/melisai-tool-admin-tab-platformai.png)

- **Instances** — gestisci le istanze nominate usate per avviare gli agenti. La tabella elenca il
  **Name ID** di ciascuna istanza (il `mai_instance_id`) e l'agente collegato; **+ New instance** apre un
  form React (Name, Instance ID, Status, Agent, etichetta per lingua).

  ![Admin → Instances](/screenshots/react/melis-ai/melisai-tool-admin-tab-instances.png)

- **Usage** — consumo di token/query, totale e per istanza, su un intervallo selezionabile.
- **MCP Server** — scegli quali funzioni MCP il server espone e contrassegna le tabelle sensibili.
- **Chat dev tool** — una console di chat per sviluppatori che mostra il payload IA grezzo e la risposta affiancati;
  il modo più rapido per vedere ciò che il modello ha effettivamente ricevuto e risposto.

## Costruire un agente (AI Agents)

Sotto **Melis AI → AI Agents** costruisci lo **scenario** di un agente. L'elenco mostra gli agenti forniti
con il loro numero di fasi e il numero totale di chiamate; aprendone uno si aggiunge una sotto-scheda con un editor a cinque schede —
**Config · AI Tools · DB Rights · Scenario · Run**.

![Elenco AI Agents](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents.png)

- **Config** — nome, codice, descrizione, un'eventuale sostituzione del modello e interruttori per il caricamento file.
- **AI Tools** — spunta gli strumenti che questo agente può chiamare, raggruppati in **MCP tools** e **Local tools**; il
  motore offre poi al modello esattamente quelli.
- **DB Rights** — lettura / scrittura / eliminazione / drop per tabella, più un interruttore globale *Allow table creation*.
  Scrittura, eliminazione di righe e drop sono irreversibili.
- **Scenario** — le fasi ordinate e tipizzate: **ENTRY PARAMS** → una o più **AI CONTEXT** (sistema/conoscenza
  silenziosi) → **AI CHAT** (il turno visibile) → **EXIT PARAMS**, con eventuali fasi **CODE**.
  Trascina per riordinare; ogni fase ha un **Code** a cui fai riferimento con `[CODE]` per richiamare la risposta di una fase
  precedente in un prompt successivo.

  ![Agente → Scenario](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-scenario.png)

- **Run** — una chat di test in tempo reale contro l'agente (l'istanza `agenttool`), così puoi iterare sullo
  scenario e sugli strumenti senza uscire dall'editor.

## L'Assistente IA

L'**Assistente IA** globale è un pulsante flottante in basso a destra di ogni schermata (non ha alcuna voce di
menu). Apre un pannello di chat che esegue il **Main Chat Assistant** generale (istanza
`mainchatassistantgeneral`) e può pilotare il back-office — aprire uno strumento, aprire una pagina — direttamente dalla
conversazione. Resta montato durante le navigazioni, così una sessione aperta sopravvive al passaggio tra gli strumenti.

![Pannello dell'Assistente IA aperto](/screenshots/react/melis-ai/melisai-footer-icon-generalassistant-deployed.png)

## Usare un agente dal tuo codice

L'integrazione lato server più semplice resta il **view helper `AIChatViewHelper`**
(`melis-ai-engine/src/View/Helper/MelisAIChatViewHelper.php`). Inseriscilo in una vista `.phtml` per
renderizzare una chat pronta all'uso associata a un'istanza:

```php
<?= $this->AIChatViewHelper(
    $maiInstanceId,        // instance id from melis_ai_instances.mai_instance_id
    $agentId = null,       // optional explicit agent id
    $extraEntryParams = [],// custom_text / custom_files / custom_data
    $debugMode = false,
    $exitParamArr = []     // where to write the result back (fields, js/route callbacks)
) ?>
```

Un pattern comune è **delimitare la sessione per oggetto** aggiungendo un suffisso con un id all'instance id,
es. `"newscontentcreator|".$newsId` — così ogni articolo di news mantiene la propria conversazione.

Nel back-office React, l'equivalente è il componente **`AiChatContainer`** esportato da
`melis-ai-engine` (tramite l'alias Vite `@melis-ai-engine`). Montalo con un `maiInstanceId` ed esegue
l'intero ciclo `init → run → (continue×N) → validate` contro gli endpoint
`/melis/react-api/ai-engine/*` — senza alcun lavoro sul backend:

```tsx
import { AiChatContainer } from '@melis-ai-engine'

<AiChatContainer maiInstanceId="newscontentcreator|42" clearSession autoRun />
```

::: tip Esempio reale
`melis-ai-community-extensions` include agenti funzionanti — es. un *news content creator* che prende un
prompt + immagini e scrive il testo generato nel form delle news tramite una callback di uscita. Leggi
`vendor/melisplatform/melis-ai-community-extensions/src/Controller/NewsController.php` per vedere il
helper usato da capo a fondo.
:::

Programmaticamente, il motore è pilotato attraverso
`MelisAIEngine\Service\MelisAIEngineAgentService` (`runAgent()`, `validateAnswer()`,
`continueConversation()`, `restartAgent()`, `getFinalAnswer()`), costruito per agente + istanza, con
lo stato della conversazione persistito in uno store su DB (`MelisAIEngineConversationStore`) anziché nelle sessioni
PHP. Sia il view helper classico sia il container di chat React chiamano questo stesso servizio.

## Strumenti

Gli agenti possono chiamare **strumenti** (funzioni) durante un'esecuzione — inclusi gli **MCP tools** per le operazioni su file e database.
Usa **MCP Inspector** (Melis AI → MCP Inspector) per confermare che un server sia attivo e che i suoi strumenti
siano rilevabili prima di consentirli su un agente. Consulta la pagina dedicata [MCP](./mcp).

## File chiave

| Ambito | Percorso |
| --- | --- |
| Servizio del motore | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineService.php` |
| Esecuzione dell'agente | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineAgentService.php` |
| View helper di chat | `vendor/melisplatform/melis-ai-engine/src/View/Helper/MelisAIChatViewHelper.php` |
| Container di chat React | `vendor/melisplatform/melis-ai-engine/ui-react/src/AiChatContainer.tsx` |
| Backend di chat React | `vendor/melisplatform/melis-ai-engine/src/Controller/React/MelisReactApiAiEngineController.php` |
| Provider Claude | `vendor/melisplatform/melis-ai-engine-claude/src/Service/MelisAIEngineModelClaudeService.php` |
| Provider Gemini | `vendor/melisplatform/melis-ai-engine-gemini/src/Service/MelisAIEngineModelGeminiService.php` |
| Brick React del back-office | `vendor/melisplatform/melis-ai/ui-react/src/` |
| Agenti di esempio | `vendor/melisplatform/melis-ai-community-extensions/` |

> Per il back-office classico (iframe) di uno qualsiasi di questi strumenti, usa l'interruttore **Old** di ciascuno strumento — il
> comportamento legacy è documentato sotto [/legacy](/legacy/guide/ai). Leggi il codice dei moduli per l'API
> esatta e attuale — consulta il [Riferimento dei moduli](../reference/modules).
