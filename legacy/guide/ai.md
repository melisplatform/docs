# AI: agents & engine

Melis ships an **AI engine** that lets you build **agents** — scripted, multi-step AI workflows —
and surface them anywhere in the backoffice or your own modules. Different providers (Anthropic
Claude, Google Gemini) plug in behind a single engine.

The modules involved: `melis-ai` (backoffice UI), `melis-ai-engine` (the engine),
`melis-ai-engine-claude` / `melis-ai-engine-gemini` (providers), and
`melis-ai-community-extensions` (ready-made example agents).

## Core concepts

| Concept | What it is | Table |
| --- | --- | --- |
| **Company / provider** | The AI vendor (Anthropic, Google…). | `melis_ai_companies` |
| **Model** | A concrete model of a company (e.g. a Claude or Gemini model). | `melis_ai_models` (`mam_generative_model`) |
| **Platform key** | The API key used to call a provider. | `melis_ai_platform_keys` |
| **Agent** | A workflow = an ordered list of **scenario steps**. | `melis_ai_agents`, `melis_ai_scenario_steps` |
| **Instance** | A reusable, named handle to run an agent (used as the chat session id). | `melis_ai_instances` (`mai_instance_id`) |
| **Daily usage** | Token/usage accounting per model/agent/instance. | `melis_ai_daily_usage` |

An **agent** is a *scenario*: a sequence of steps such as `USER INPUT`, `AI CONTEXT`,
`CODE AI CALL`, `AI CHAT`, `CODE PHP`, `ENTRY PARAMS` / `EXIT PARAMS`. The engine walks the steps,
calls the model when needed, and produces a final answer — optionally writing it back to the page
that launched it (via *exit parameters*).

## Providers

The engine picks a provider from the model's **company** name
(`MelisAIEngine\Service\MelisAIEngineService::getActiveModelClass()`):

- company contains **"Anthropic"** → `MelisAIEngineModelClaudeService` (module `melis-ai-engine-claude`)
- company contains **"Google"** → `MelisAIEngineModelGeminiService` (module `melis-ai-engine-gemini`)

Both extend `melis-ai-engine`'s `MelisAIEngineModelService` and implement the same contract
(`setClient()`, payload/message formatting, tool calls). Adding a new provider means adding a
module with its own model service — no change to the engine.

## Configure it (backoffice)

In the backoffice, open **Melis AI → Admin**:

- **Platform AI** — declare companies & models, and store the **API keys**
  (`melis_ai_platform_keys`).
- **Instances** — manage the named instances used to launch agents.
- **Usage** — token consumption per model/agent.
- **Chat Dev Tool** — a developer chat console to try the engine.

Under **Melis AI → Agents** you build an agent's **scenario** (its steps), test it with
*Run Scenario*, and assign tools.

## Use an agent from your code

The simplest integration is the **`AIChatViewHelper` view helper**
(`melis-ai-engine/src/View/Helper/MelisAIChatViewHelper.php`). Drop it into a `.phtml` view to
render a ready-to-use chat bound to an instance:

```php
<?= $this->AIChatViewHelper(
    $maiInstanceId,        // instance id from melis_ai_instances.mai_instance_id
    $agentId = null,       // optional explicit agent id
    $extraEntryParams = [],// custom_text / custom_files / custom_data
    $debugMode = false,
    $exitParamArr = []     // where to write the result back (fields, js/route callbacks)
) ?>
```

A common pattern is to **scope the session per object** by suffixing the instance id with an id,
e.g. `"newscontentcreator|".$newsId` — so each news item keeps its own conversation.

::: tip Real example
`melis-ai-community-extensions` ships working agents — e.g. a *news content creator* that takes a
prompt + images and writes the generated copy back into the news form via an exit callback. Read
`vendor/melisplatform/melis-ai-community-extensions/src/Controller/NewsController.php` to see the
helper used end to end.
:::

Programmatically, the engine is driven through
`MelisAIEngine\Service\MelisAIEngineAgentService` (`runAgent()`, `validateAnswer()`,
`continueConversation()`, `restartAgent()`, `getFinalAnswer()`), built per
agent + instance, with conversation state persisted in a DB-backed store
(`MelisAIEngineConversationStore`) rather than PHP sessions.

## Tools

Agents can call **tools** (functions) during a run — including **MCP tools** for file and database
operations. See the dedicated [MCP](./mcp) page.

## Key files

| Concern | Path |
| --- | --- |
| Engine service | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineService.php` |
| Agent execution | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineAgentService.php` |
| Chat view helper | `vendor/melisplatform/melis-ai-engine/src/View/Helper/MelisAIChatViewHelper.php` |
| Claude provider | `vendor/melisplatform/melis-ai-engine-claude/src/Service/MelisAIEngineModelClaudeService.php` |
| Gemini provider | `vendor/melisplatform/melis-ai-engine-gemini/src/Service/MelisAIEngineModelGeminiService.php` |
| Backoffice admin | `vendor/melisplatform/melis-ai/src/Controller/AdminController.php` |
| Example agents | `vendor/melisplatform/melis-ai-community-extensions/` |

> The AI suite is actively evolving — pin the `^5.3` releases (see
> [Module reference](../reference/modules)) and read the modules' code for the exact, current API.
