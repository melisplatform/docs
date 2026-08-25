# KI: Agenten & Engine

Melis liefert eine **KI-Engine**, mit der Sie **Agenten** erstellen können — skriptgesteuerte,
mehrstufige KI-Workflows — und diese überall im Back-Office oder in Ihren eigenen Modulen
bereitstellen können. Verschiedene Anbieter (Anthropic Claude, Google Gemini, Ollama, OCI) werden
hinter einer einzigen Engine eingebunden.

Die beteiligten Module: `melis-ai` (React-Back-Office-Werkzeuge + der globale KI-Assistent),
`melis-ai-engine` (die Engine und die gemeinsame Chat-Oberfläche),
`melis-ai-engine-claude` / `melis-ai-engine-gemini` (Anbieter) und
`melis-ai-community-extensions` (fertige Beispiel-Agenten).

In v6 sind Framework und Module unverändert; was sich geändert hat, ist das **Back-Office**, jetzt
eine React-Oberfläche unter `/melis-react`. Die KI-Logik bleibt serverseitig — React ist
Darstellung plus API-Aufrufe.

## Kernkonzepte

| Konzept | Was es ist | Tabelle |
| --- | --- | --- |
| **Unternehmen / Anbieter** | Der KI-Anbieter (Anthropic, Google…). | `melis_ai_companies` |
| **Modell** | Ein konkretes Modell eines Unternehmens (z. B. ein Claude- oder Gemini-Modell). | `melis_ai_models` (`mam_generative_model`) |
| **Plattformschlüssel** | Der API-Schlüssel, der zum Aufrufen eines Anbieters verwendet wird. | `melis_ai_platform_keys` |
| **Agent** | Ein Workflow = eine geordnete Liste von **Szenarioschritten**. | `melis_ai_agents`, `melis_ai_scenario_steps` |
| **Instanz** | Ein wiederverwendbarer, benannter Handle zum Ausführen eines Agenten (wird als Chat-Session-ID verwendet). | `melis_ai_instances` (`mai_instance_id`) |
| **Tägliche Nutzung** | Token-/Nutzungsabrechnung pro Modell/Agent/Instanz. | `melis_ai_daily_usage` |

Ein **Agent** ist ein *Szenario*: eine Abfolge von Schritten wie `ENTRY PARAMS`, `AI CONTEXT`,
`AI CHAT`, `CODE`, `EXIT PARAMS`. Die Engine durchläuft die Schritte, ruft bei Bedarf das Modell auf
und erzeugt eine endgültige Antwort — optional wird diese in die Seite zurückgeschrieben, die ihn
gestartet hat (über *Ausgabeparameter*).

## Anbieter

Die Engine wählt einen Anbieter anhand des **Unternehmensnamens** des Modells
(`MelisAIEngine\Service\MelisAIEngineService::getActiveModelClass()`):

- Unternehmen enthält **„Anthropic"** → `MelisAIEngineModelClaudeService` (Modul `melis-ai-engine-claude`)
- Unternehmen enthält **„Google"** → `MelisAIEngineModelGeminiService` (Modul `melis-ai-engine-gemini`)
- zuzüglich **Ollama** (lokal) und **OCI** (OCI GenAI) als Anbietermodule, die demselben Vertrag folgen

Jeder Anbieter erweitert den `MelisAIEngineModelService` von `melis-ai-engine` und implementiert
denselben Vertrag (`setClient()`, Payload-/Nachrichtenformatierung, Tool-Aufrufe). Einen neuen
Anbieter hinzuzufügen bedeutet, ein Modul mit seinem eigenen Modelldienst hinzuzufügen — ohne
Änderung an der Engine. Anbieter haben **keine eigene Oberfläche**: Bei der Installation werden ihr
Unternehmen + ihre Modelle in den Katalog eingespeist, die dann als Auswahlmöglichkeiten in der
MelisAI-Administration erscheinen.

## Wo es im React-Back-Office lebt

Unter `/melis-react` liefert MelisAI **ein Brick-Bundle**, das **drei native React-Werkzeuge** in
der linken Seitenleiste im Abschnitt **Melis AI** bereitstellt — **Admin**, **AI Agents**,
**MCP Inspector** — **sowie ein globales KI-Assistenten-Overlay**. Jedes Menüwerkzeug trägt einen
**Neu/Alt**-Umschalter: *Neu* ist die React-Oberfläche, *Alt* öffnet das klassische Werkzeug in einem
iframe.

![Der Menüabschnitt Melis AI](/screenshots/react/melis-ai/melisai-menu-section-melisai.png)

Die Werkzeuge erscheinen nur, wenn MelisAI aktiv ist. Ein vierter Eintrag — **AI Tool Creator** —
wird von einem anderen Modul beigesteuert (`melis-ai-tool-creator`).

## Konfigurieren (Admin)

Öffnen Sie **Melis AI → Admin**. Ein einziger **Neu/Alt**-Umschalter gilt für das gesamte Werkzeug;
die React-Ansicht ist eine Registerkarten-Hülle — **Usage · Platform AI · Instances · MCP Server ·
Chat dev tool** — mit einem **Save** für die aktive Registerkarte.

- **Platform AI** — wählen Sie ein **Company + Model**, fügen Sie die **API-Schlüssel** ein
  (`melis_ai_platform_keys`) und setzen Sie die Plattform auf **Active** + **Default**. Ein Modell
  muss einen Schlüssel besitzen, um aktiv zu sein. Das rechte Panel verwaltet Datei-Uploads —
  einschließlich **Upload mode: File API vs Embed in request** (Gemini verwendet standardmäßig die
  File API, Claude das Einbetten).

  ![Admin → Platform AI](/screenshots/react/melis-ai/melisai-tool-admin-tab-platformai.png)

- **Instances** — verwalten Sie die benannten Instanzen, die zum Starten von Agenten verwendet
  werden. Die Tabelle listet für jede Instanz die **Name ID** (die `mai_instance_id`) und den
  verknüpften Agenten auf; **+ New instance** öffnet ein React-Formular (Name, Instance ID, Status,
  Agent, sprachspezifische Beschriftung).

  ![Admin → Instances](/screenshots/react/melis-ai/melisai-tool-admin-tab-instances.png)

- **Usage** — Token-/Abfrageverbrauch, insgesamt und pro Instanz, über einen wählbaren Zeitraum.
- **MCP Server** — wählen Sie, welche MCP-Funktionen der Server bereitstellt, und markieren Sie
  sensible Tabellen.
- **Chat dev tool** — eine Entwickler-Chat-Konsole, die die rohe KI-Payload und die Antwort
  nebeneinander anzeigt; der schnellste Weg, um zu sehen, was das Modell tatsächlich empfangen und
  geantwortet hat.

## Einen Agenten erstellen (AI Agents)

Unter **Melis AI → AI Agents** erstellen Sie das **Szenario** eines Agenten. Die Liste zeigt die
mitgelieferten Agenten mit ihrer Schrittzahl und der Gesamtzahl der Aufrufe; beim Öffnen eines
Agenten wird eine Unterregisterkarte mit einem fünfseitigen Editor hinzugefügt —
**Config · AI Tools · DB Rights · Scenario · Run**.

![AI-Agents-Liste](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents.png)

- **Config** — Name, Code, Beschreibung, ein optionales Modell-Override und Datei-Upload-Umschalter.
- **AI Tools** — kreuzen Sie die Werkzeuge an, die dieser Agent aufrufen darf, gruppiert in
  **MCP tools** und **Local tools**; die Engine bietet dem Modell dann genau diese an.
- **DB Rights** — pro Tabelle Lesen / Schreiben / Löschen / Verwerfen (Drop), zuzüglich eines
  globalen Schalters *Allow table creation*. Schreiben, Zeilenlöschung und Verwerfen sind
  unumkehrbar.
- **Scenario** — die geordneten, typisierten Schritte: **ENTRY PARAMS** → einer oder mehrere
  **AI CONTEXT** (unsichtbares System-/Wissen) → **AI CHAT** (der sichtbare Zug) → **EXIT PARAMS**,
  mit optionalen **CODE**-Schritten. Ziehen Sie zum Umsortieren; jeder Schritt hat einen **Code**,
  den Sie mit `[CODE]` referenzieren, um die Antwort eines vorherigen Schritts in einen späteren
  Prompt zu übernehmen.

  ![Agent → Scenario](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-scenario.png)

- **Run** — ein Live-Test-Chat gegen den Agenten (die Instanz `agenttool`), sodass Sie das Szenario
  und die Werkzeuge iterieren können, ohne den Editor zu verlassen.

## Der KI-Assistent

Der globale **KI-Assistent** ist eine schwebende Schaltfläche unten rechts auf jedem Bildschirm (er
hat keinen Menüeintrag). Er öffnet ein Chat-Panel, das den allgemeinen **Main Chat Assistant**
(Instanz `mainchatassistantgeneral`) ausführt, und kann das Back-Office steuern — ein Werkzeug
öffnen, eine Seite öffnen — direkt aus der Konversation heraus. Er bleibt über Navigationen hinweg
eingebunden, sodass eine offene Session das Wechseln von Werkzeugen übersteht.

![KI-Assistenten-Panel geöffnet](/screenshots/react/melis-ai/melisai-footer-icon-generalassistant-deployed.png)

## Einen Agenten aus Ihrem Code verwenden

Die einfachste serverseitige Integration ist nach wie vor der **View-Helper `AIChatViewHelper`**
(`melis-ai-engine/src/View/Helper/MelisAIChatViewHelper.php`). Fügen Sie ihn in eine
`.phtml`-View ein, um einen einsatzbereiten, an eine Instanz gebundenen Chat zu rendern:

```php
<?= $this->AIChatViewHelper(
    $maiInstanceId,        // instance id from melis_ai_instances.mai_instance_id
    $agentId = null,       // optional explicit agent id
    $extraEntryParams = [],// custom_text / custom_files / custom_data
    $debugMode = false,
    $exitParamArr = []     // where to write the result back (fields, js/route callbacks)
) ?>
```

Ein gängiges Muster besteht darin, die **Session pro Objekt einzugrenzen**, indem man die Instanz-ID
mit einer ID versieht, z. B. `"newscontentcreator|".$newsId` — sodass jeder Nachrichtenartikel seine
eigene Konversation behält.

Im React-Back-Office ist das Äquivalent die von `melis-ai-engine` exportierte Komponente
**`AiChatContainer`** (über den Vite-Alias `@melis-ai-engine`). Binden Sie sie mit einer
`maiInstanceId` ein, und sie führt die gesamte Schleife `init → run → (continue×N) → validate` gegen
die Endpunkte `/melis/react-api/ai-engine/*` aus — ohne Backend-Aufwand:

```tsx
import { AiChatContainer } from '@melis-ai-engine'

<AiChatContainer maiInstanceId="newscontentcreator|42" clearSession autoRun />
```

::: tip Praxisbeispiel
`melis-ai-community-extensions` liefert funktionierende Agenten — z. B. einen *news content creator*,
der einen Prompt + Bilder entgegennimmt und den generierten Text über einen Exit-Callback in das
Nachrichtenformular zurückschreibt. Lesen Sie
`vendor/melisplatform/melis-ai-community-extensions/src/Controller/NewsController.php`, um den Helper
durchgängig im Einsatz zu sehen.
:::

Programmatisch wird die Engine über
`MelisAIEngine\Service\MelisAIEngineAgentService` gesteuert (`runAgent()`, `validateAnswer()`,
`continueConversation()`, `restartAgent()`, `getFinalAnswer()`), aufgebaut je Agent + Instanz, wobei
der Konversationszustand in einem DB-gestützten Speicher (`MelisAIEngineConversationStore`) statt in
PHP-Sessions persistiert wird. Sowohl der klassische View-Helper als auch der React-Chat-Container
rufen genau diesen Dienst auf.

## Werkzeuge

Agenten können während eines Durchlaufs **Werkzeuge** (Funktionen) aufrufen — einschließlich
**MCP-Werkzeugen** für Datei- und Datenbankoperationen. Verwenden Sie den **MCP Inspector**
(Melis AI → MCP Inspector), um zu bestätigen, dass ein Server läuft und seine Werkzeuge auffindbar
sind, bevor Sie sie für einen Agenten zulassen. Siehe die eigene Seite [MCP](./mcp).

## Wichtige Dateien

| Anliegen | Pfad |
| --- | --- |
| Engine-Dienst | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineService.php` |
| Agentenausführung | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineAgentService.php` |
| Chat-View-Helper | `vendor/melisplatform/melis-ai-engine/src/View/Helper/MelisAIChatViewHelper.php` |
| React-Chat-Container | `vendor/melisplatform/melis-ai-engine/ui-react/src/AiChatContainer.tsx` |
| React-Chat-Backend | `vendor/melisplatform/melis-ai-engine/src/Controller/React/MelisReactApiAiEngineController.php` |
| Claude-Anbieter | `vendor/melisplatform/melis-ai-engine-claude/src/Service/MelisAIEngineModelClaudeService.php` |
| Gemini-Anbieter | `vendor/melisplatform/melis-ai-engine-gemini/src/Service/MelisAIEngineModelGeminiService.php` |
| React-Back-Office-Bricks | `vendor/melisplatform/melis-ai/ui-react/src/` |
| Beispiel-Agenten | `vendor/melisplatform/melis-ai-community-extensions/` |

> Für das klassische (iframe-basierte) Back-Office jedes dieser Werkzeuge verwenden Sie den
> **Alt**-Umschalter des jeweiligen Werkzeugs — das Legacy-Verhalten ist unter [/legacy](/legacy/guide/ai)
> dokumentiert. Lesen Sie den Code der Module für die genaue, aktuelle API — siehe die
> [Modulreferenz](../reference/modules).
