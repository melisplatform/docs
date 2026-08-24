# MelisAIEngineClaude

> Anthropic-Claude-Anbieter für die Melis-KI-Engine — eine Backend-Engine ohne eigene React-Oberfläche. Paket `melisplatform/melis-ai-engine-claude`.

## Zweck

`MelisAIEngineClaude` ist der konkrete Anthropic-Claude-Anbieter für die MelisAI-Suite. Er erweitert den Vertrag `MelisAIEngineModelService` der Engine und stellt die Claude-spezifische Einrichtung des HTTP-Clients, das Payload-Format der Anthropic Messages API, die Dateiverarbeitung, das Mapping von Tools/Funktionen sowie das Parsen der Antworten bereit. Das Modul ist zustandslos — es besitzt keine eigenen Datenbanktabellen; der gesamte Laufzeitzustand liegt in den Tabellen der Engine selbst.

Die Engine wählt diesen Anbieter zur Laufzeit automatisch aus, wenn das Unternehmen des aktiven Modells `Anthropic` enthält (und dieses Modul installiert ist).

## Rolle im React-Backoffice

Dieses Modul besitzt **kein React-Backoffice-Werkzeug und keine eigene Oberfläche**: kein `ui-react/`-Baustein, keine `config/react-api.php`, keine Capabilities und keinen Controller. Es erscheint niemals als Werkzeug, Menüknoten oder Seitenleisteneintrag in `/melis-react`. Es ist reine Verdrahtung — der Codepfad, über den Melis mit Claude kommuniziert.

Seine einzige sichtbare Wirkung im React-Backoffice ist **transitiv, über [MelisAI](/de/reference/modules/melis-ai)**:

- Seine `install/dbdeploy/*.sql`-Skripte legen das Unternehmen **`Anthropic`** und mehrere **Claude-Modelle** im Modellkatalog der Engine an.
- Diese Modelle erscheinen daraufhin als Auswahlmöglichkeiten im MelisAI-Adminbereich (Platform AI / Modelleinstellungen), unter dem Unternehmen **Anthropic**.
- Um eines zu verwenden, hinterlegen Sie Ihren **Anthropic-API-Schlüssel** in dieser Modellzeile (`mapk_*`) und richten anschließend eine **Instanz / einen Agenten** auf das Claude-Modell aus.
- Ab diesem Zeitpunkt wird jeder Chat dieses Agenten — einschließlich des React-**KI-Assistenten** — über diesen Anbieter geleitet.

> Sie öffnen dieses Modul nie. In `/melis-react` ist es stets nur eine Zeile in einem Modell-Dropdown, das von MelisAI bereitgestellt wird, sowie die Engine hinter den KI-Chats, die es nutzen. Wenn Claude-Chats fehlschlagen, ist die Ursache meist ein fehlender **API-Schlüssel** in der Modellzeile oder ein **inaktives** Modell — beides wird in MelisAI konfiguriert, nicht hier.

## Aktivierung

Fügen Sie es in `config/melis.module.load.php` nach der KI-Engine hinzu:

```php
return [
    'MelisAIEngine',
    'MelisAIEngineClaude',
];
```

Abhängigkeit: `melisplatform/melis-ai-engine` `^6.0`. Der Anthropic-API-Schlüssel wird pro Modell im Melis-KI-Backoffice gespeichert (die `mapk_*`-Schlüsselzeile des Modells) — nicht in einer Konfigurationsdatei oder Umgebungsvariablen.

## Zentrale Services

| Service-Alias | Rolle |
| --- | --- |
| `MelisAIEngineModelClaudeService` | Der Claude-Anbieter. Erweitert `MelisAIEngineModelService` und implementiert den Vertrag der Anthropic Messages API. Wird vom Service-Manager mit den Factory-Optionen `['modelId' => …, 'agentId' => …]` erstellt. |

Bemerkenswerte Methoden von `MelisAIEngineModelClaudeService`:

| Methode | Rolle |
| --- | --- |
| `setClient()` | Erstellt einen `Laminas\Http\Client`, der einen POST an die konfigurierte Claude-Messages-URL sendet. Setzt die Header `Content-Type/Accept: application/json`, `x-api-key` (aus dem API-Schlüssel des Modells), `anthropic-version: 2023-06-01` sowie einen `anthropic-beta`-Header, der die Betas für Prompt-Caching und Web-Fetch aktiviert. Verwendet ein langes Timeout, um Tool-Use-Schleifen zu berücksichtigen. |
| `getMessageKey()` | Gibt `'messages'` zurück. |
| `addToolsToPayload()` | Liest die Agentenfunktionen über `getAgentFunctions()`, entfernt interne Engine-Schlüssel (`mcp`, `type`, `server`, `module`, `max_silence`, `operation_timeout`) mittels `sanitizeToolForClaudeAPI()`, hängt Tools im Anthropic-Format an (`name`, `description`, `input_schema`), fügt das integrierte `web_fetch`-Tool hinzu und dedupliziert nach Name. |
| `constructContent()` / `addContentToPayload()` | Bildet die Rolle `model` auf `assistant` ab; erstellt Anthropic-Content-Blöcke (`{type:text}`, `{type:image, source:{url\|base64,…}}`, `{type:document, source:{…, media_type:application/pdf}}`); hängt sie an `payload['messages']` an. |
| `sendCustomAI()` | Fügt `model` (`mam_generative_model`) und `max_tokens` ein; sendet JSON per POST mit Wiederholungen bei 5xx; parst `content[]` in Text- und `tool_use`-Blöcke; führt jedes Tool aus (MCP über `MelisAIEngineMcpService::invokeTool`, andernfalls integriert); hängt die Ergebnisse als `{type:tool_result, tool_use_id, content}` in einer `user`-Nachricht an; wiederholt, bis `stop_reason === 'end_turn'` erreicht ist oder eine Sicherheitsobergrenze für Durchläufe erreicht wird. Aktiviert Prompt-Caching. |
| `processFiles()` / `processContextFiles()` | Konvertiert Uploads gemäß dem `mam_file_upload_mode` des Modells (Standard: `embed`): DOCX/XLSX → extrahierter Text, Bilder/PDF → base64, oder über `uploadDocument()`, wenn der interne Upload aktiviert ist. |
| `setPromptTokenCount()` / `setResponseTokenCount()` / `setTotalTokenCount()` | Lesen die Felder von `responseData['usage']` (`input_tokens`, `output_tokens`, zuzüglich der Cache-Lese-/Erstellungszähler); Gesamt = Input + Output. |
| `getAllowedMimetypes()` | Gibt die zulässigen Upload-MIME-Typen aus dem Claude-Konfigurationsblock zurück. |
| `continueConversation()` | Stellt den Nachrichtenverlauf aus dem gespeicherten Zustand wieder her und ruft `sendCustomAI()` erneut auf, um eine mehrstufige Tool-Use-Fortsetzung zu ermöglichen. |

## Tool- / Funktionsaufrufe

Engine-Tools verwenden bereits das `input_schema`-Format von Anthropic, sodass `addToolsToPayload()` sie hauptsächlich bereinigt und weiterleitet. Ein Modell-Toolaufruf trifft als `{type:'tool_use', name, id, input}` ein; der Service extrahiert `name` / `input` / `id`, leitet über `MelisAIEngineMcpService::isMcpTool()` weiter (MCP `invokeTool` vs. integrierte Funktion) und gibt das Ergebnis als `{type:'tool_result', tool_use_id:<id>, content:<json>}` innerhalb einer `user`-Nachricht zurück und setzt dann die Schleife fort. Das Feld `id` korreliert Aufruf ↔ Ergebnis, wie es die Anthropic-API erfordert.

## Konfiguration

Die Anbietereinstellungen befinden sich unter:

```
config['plugins']['melisaiengine']['datas']['AI']['Claude']
```

| Schlüssel | Zweck |
| --- | --- |
| `api_url` | Die Endpunkt-URL der Anthropic Messages API (`https://api.anthropic.com/v1/messages`). |
| `allowed_mimetypes` | Für Datei-Uploads akzeptierte MIME-Typen. |

Ein benachbarter Block `['AI']['Anthropic']` deklariert die Datei-Upload-Modi (`embed`) und die Unterstützung für den internen Upload. Der API-Schlüssel wird **nicht** aus der Konfiguration oder der Umgebung gelesen — er stammt ausschließlich aus der DB-Schlüsselzeile des Modells (`mapk_*`), die von einem Administrator im MelisAI-Adminbereich eingegeben wird.

## Vorinstallierte Modelle

Installiert über `install/dbdeploy/*.sql` unter dem Unternehmen `Anthropic`; das Flag `mam_status` entscheidet, welche angeboten werden:

| `mam_generative_model` | Modell |
| --- | --- |
| `claude-opus-4-8` | Claude Opus 4.8 |
| `claude-sonnet-4-6` | Claude Sonnet 4.6 |
| `claude-haiku-4-5-20251001` | Claude Haiku 4.5 |
| `claude-sonnet-4-5-20250929` | Claude Sonnet 4.5 |
| `claude-sonnet-4-20250514` | Claude Sonnet 4 |
| `claude-opus-4-1-20250805` | Claude Opus 4.1 |

## Datenbanktabellen

Dieses Modul besitzt keine Tabellen. Der gesamte Konversations- und Nutzungszustand wird in den Tabellen der Engine gespeichert (`melis_ai_conversation_state`, `melis_ai_daily_usage`).

## Zentrale Dateien

| Aspekt | Pfad |
| --- | --- |
| Anbieter-Service | `vendor/melisplatform/melis-ai-engine-claude/src/Service/MelisAIEngineModelClaudeService.php` |
| Service-Factory | `vendor/melisplatform/melis-ai-engine-claude/src/Service/Factory/MelisAIEngineModelClaudeServiceFactory.php` |
| Konfigurationsblock | `vendor/melisplatform/melis-ai-engine-claude/config/app.interface.php` |

## Siehe auch

- [MelisAIEngine](/de/reference/modules/melis-ai-engine) — die abstrakte Engine, gemeinsame Tabellen und MCP-Brücke; enthält das Routing, das diesen Anbieter anhand des Unternehmensnamens auswählt.
- [MelisAIEngineGemini](/de/reference/modules/melis-ai-engine-gemini) — der Google-Gemini-Anbieter.
- [MelisAI](/de/reference/modules/melis-ai) — React-Backoffice zur Verwaltung von Instanzen, Agenten, Tools, Modellen und API-Schlüsseln; die einzige Oberfläche, in der Claude erscheint.
- [Modulreferenz](/de/reference/modules) — die vollständige Modulübersicht.
