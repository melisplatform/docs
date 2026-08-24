# MelisAIEngineGemini

> Google-Gemini-Anbieter für die Melis-KI-Engine — eine Backend-Engine ohne eigenes Back-Office. Paket `melisplatform/melis-ai-engine-gemini`.

## Zweck

`MelisAIEngineGemini` ist die konkrete Google-Gemini-Implementierung des Vertrags
`MelisAIEngineModelService` von `MelisAIEngine`. Es stellt die Gemini-spezifische Einrichtung des
HTTP-Clients, die Struktur der `generateContent`-Nutzlast (das `contents`- / `parts`-Schema), die
Zuordnung von Tool- und Funktionsaufrufen, die Dateiverarbeitung über die File API oder inline
eingebettet sowie die Auswertung der Token-Nutzung bereit. Das Modul ist zustandslos (keine eigenen
Tabellen) und liefert **keine Benutzeroberfläche** — alle KI-Ansichten werden von `melis-ai` /
`melis-ai-engine` bereitgestellt.

## Kein React-Back-Office

Dieses Modul hat **kein React-Tool** und soll auch keines haben — es handelt sich um eine
Backend-Anbieterschicht, nicht um eine Ansicht. Es liefert keinen `ui-react/`-Baustein, keine
`config/react-api.php`, keine `config/react.capabilities.php`, keinen Controller und zeigt **keinen
Seitenleisteneintrag und keinen Menüknoten** in `/melis-react`. Es gibt keine Screenshots.

Im React-Back-Office erscheint Gemini nur **indirekt**, als auswählbare Engine bzw. auswählbares
Modell innerhalb der **MelisAI**-Verwaltung (Platform AI / Instances / Models & keys). Wenn ein
Administrator ein Modell anlegt, dessen Unternehmen **Google** ist, und dieses Modul installiert ist,
leitet `MelisAIEngine` den Chat und die Agenten dieses Modells über die hier implementierte
Gemini-Engine — ohne eigene Gemini-Seite.

## Aktivierung

Zu `config/melis.module.load.php` hinzufügen:

```php
return [
    'MelisAIEngineGemini',
];
```

Benötigt `melisplatform/melis-ai-engine` `^6.0`. Die Engine wählt diesen Anbieter zur Laufzeit
automatisch aus, wenn der Unternehmensname des aktiven Modells **`Google`** enthält und dieses Modul
installiert ist; sie erstellt `MelisAIEngineModelGeminiService` über
`$serviceManager->build(MelisAIEngineModelGeminiService::class, ['modelId' => …, 'agentId' => …])`.

## Wichtige Services

| Service-Alias | Rolle |
| --- | --- |
| `MelisAIEngineModelGeminiService` | Der Gemini-Anbieter — Unterklasse von `MelisAIEngineModelService`, pro Anfrage mit `modelId` + `agentId` erstellt (über `MelisAIEngineModelGeminiServiceFactory`). |

Bemerkenswerte Methoden von `MelisAIEngineModelGeminiService`:

| Methode | Gemini-Implementierung |
| --- | --- |
| `setClient()` | Erstellt einen `Laminas\Http\Client`, der per POST an `{api_url}/models/{mam_generative_model}:generateContent` sendet. Der API-Schlüssel wird im Request-Header **`x-goog-api-key`** übermittelt (bleibt aus der URL heraus). Langes Timeout. |
| `getMessageKey()` | Gibt `'contents'` zurück. |
| `addToolsToPayload()` | Ruft Tools über `getAgentFunctions()` ab, bereinigt jedes davon, benennt `input_schema` → `parameters` um und kapselt sie als `tools:[{functionDeclarations:[…]}]` mit `toolConfig.functionCallingConfig.mode='AUTO'`. Greift auf ein `url_context`-Tool zurück, wenn keine Funktionen vorhanden sind. |
| `constructContent()` / `addContentToPayload()` | Ordnet die Rolle `assistant` → `model` zu; erstellt `parts`-Arrays mit `{text}`, `{fileData:{fileUri,mimeType}}` (File API) oder `{inlineData:{mimeType,data}}` (base64). |
| `sendCustomAI()` | Sendet die JSON-Nutzlast per POST (Wiederholung bei 5xx / 429); wertet `candidates[].content.parts[]` auf Text und `functionCall`-Einträge aus; führt jeden Tool-Aufruf aus (MCP oder integriert); hängt die Ergebnisse als `{functionResponse:{name,response:{result}}}` an und wiederholt den Vorgang, bis keine Tool-Aufrufe mehr vorliegen, ein `finishReason` eintritt oder eine Sicherheitsobergrenze erreicht wird. |
| `processFiles()` / `processContextFiles()` | Verarbeitet Datei-Uploads gemäß `mam_file_upload_mode` (siehe [Datei-Upload-Modi](#datei-upload-modi)); speichert außerdem eine Kopie über `uploadDocument()` für die Anzeige in der Sitzung. |
| `setPromptTokenCount()` / `setResponseTokenCount()` / `setTotalTokenCount()` | Lesen `usageMetadata.promptTokenCount`, `candidatesTokenCount`, `totalTokenCount`. |
| `getAllowedMimetypes()` | Gibt die zulässigen MIME-Typen aus dem Gemini-Konfigurationsblock zurück. |

## Datei-Upload-Modi

Das Feld `mam_file_upload_mode` des Modells steuert, wie Dateien Gemini erreichen:

- **`fileapi`** (Standard) — lädt über einen Multipart-POST in die Gemini-**File API** hoch, fragt
  dann ab, bis der Dateistatus `ACTIVE` ist, und verweist auf die zurückgegebene `fileApiUri`.
- **`embed`** — sendet die Dateibytes inline als base64 (`inlineData`), mit Textextraktion für
  unterstützte Formate.

## Konfiguration

Die feste Anbieterkonfiguration liegt unter `config['plugins']['melisaiengine']['datas']['AI']['Gemini']`
(in `config/app.interface.php`, keine UI):

| Schlüssel | Zweck |
| --- | --- |
| `api_url` | Basis-URL für `generateContent`-Anfragen (`https://generativelanguage.googleapis.com/v1beta`). |
| `upload_url` | Upload-Endpunkt der Gemini File API (`https://generativelanguage.googleapis.com/upload/v1beta/files`). |
| `allowed_mimetypes` | Akzeptierte MIME-Typen (von `getAllowedMimetypes()` zurückgegeben). |

Die modellspezifischen Werte stammen aus der **Modellzeile**, die in MelisAI konfiguriert wird, nicht
aus diesem Modul:

- **`mam_generative_model`** — die Gemini-Modell-ID (z. B. `gemini-…`), die in der Request-URL
  verwendet wird.
- **`mapk_keys`** — der **Google-API-Schlüssel**, der im Header `x-goog-api-key` gesendet wird. Er
  stammt aus dem Plattform-Schlüsseldatensatz des Modells, wird nicht in Konfigurationsdateien
  gespeichert und hat **keinen Rückgriff auf eine Umgebungsvariable**.
- **`mam_file_upload_mode`** (`fileapi` als Standard oder `embed`) und `mam_internal_upload` —
  bestimmen, wie Dateien hochgeladen werden.

::: tip API-Schlüssel im Header
Anders als frühere Versionen, die den Schlüssel als Query-Parameter `?key=…` anhängten, sendet die
aktuelle Quelle den Google-API-Schlüssel im Request-Header **`x-goog-api-key`** und hält ihn damit
aus URLs und Proxy-Protokollen heraus.
:::

## Tool- / Funktionsaufruf-Zuordnung

Gemini verwendet `parameters`, wo der Engine-Vertrag `input_schema` verwendet; `addToolsToPayload()`
führt diese Umbenennung vor dem Senden durch. Tool-Aufrufe treffen als `{functionCall:{name,args}}`
ein, **ohne ID** (positionsbasiert, anders als Claudes `tool_use_id`). Der Service leitet anhand des
`name` über `MelisAIEngineMcpService::isMcpTool()` weiter und gibt
`{functionResponse:{name,response:{result:…}}}` zurück.

## Unterschiede zum Claude-Anbieter

| Aspekt | Gemini | Claude |
| --- | --- | --- |
| Nachrichtenschlüssel | `contents` | `messages` |
| Bezeichnung der Assistant-Rolle | `model` | `assistant` |
| Tool-Schema-Schlüssel | `parameters` | `input_schema` |
| Tool-Aufruf-ID | keine (positionsbasiert) | `tool_use_id` |
| Authentifizierungsmethode | Header `x-goog-api-key` | Header `x-api-key` |
| Standard-Dateimodus | `fileapi` | `embed` |

## Wichtige Dateien

| Bereich | Pfad |
| --- | --- |
| Anbieter-Service | `vendor/melisplatform/melis-ai-engine-gemini/src/Service/MelisAIEngineModelGeminiService.php` |
| Service-Factory | `vendor/melisplatform/melis-ai-engine-gemini/src/Service/Factory/MelisAIEngineModelGeminiServiceFactory.php` |
| Feste Konfiguration | `vendor/melisplatform/melis-ai-engine-gemini/config/app.interface.php` |

## Siehe auch

- [MelisAIEngine](/de/reference/modules/melis-ai-engine) — der abstrakte Vertrag und die gemeinsame Laufzeit.
- [MelisAIEngineClaude](/de/reference/modules/melis-ai-engine-claude) — der Anthropic-Anbieter.
- [MelisAI](/de/reference/modules/melis-ai) — Back-Office für Agenten, Instanzen und Modelle.
