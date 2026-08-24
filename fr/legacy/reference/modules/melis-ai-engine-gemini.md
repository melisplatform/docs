# MelisAIEngineGemini

> Fournisseur Google Gemini pour le moteur Melis AI — paquet `melisplatform/melis-ai-engine-gemini`.

## Présentation

`MelisAIEngineGemini` est l'implémentation concrète Google Gemini du contrat
`MelisAIEngineModelService` de `MelisAIEngine`. Il fournit la configuration spécifique du client
HTTP Gemini, le format de payload `generateContent` (le schéma `contents` / `parts`), le mapping
outil/appel de fonction, la gestion des fichiers via la File API ou l'intégration inline, et
l'analyse de la consommation de jetons. Le module est sans état (aucune table qui lui appartient)
et ne fournit aucune interface — tous les écrans IA proviennent de `melis-ai` /
`melis-ai-engine`.

## Activation

Ajoutez dans `config/melis.module.load.php` :

```php
return [
    'MelisAIEngineGemini',
];
```

Nécessite `melisplatform/melis-ai-engine` `^5.3`. Le moteur sélectionne automatiquement ce
fournisseur à l'exécution lorsque le nom de société du modèle actif contient **`Google`** et que
ce module est installé ; il construit `MelisAIEngineModelGeminiService` via
`$serviceManager->build(MelisAIEngineModelGeminiService::class, ['modelId' => …, 'agentId' => …])`.

## Services principaux

| Alias de service | Rôle |
| --- | --- |
| `MelisAIEngineModelGeminiService` | Le fournisseur Gemini — sous-classe de `MelisAIEngineModelService`, construit par requête avec `modelId` + `agentId`. |

Méthodes notables de `MelisAIEngineModelGeminiService` :

| Méthode | Implémentation Gemini |
| --- | --- |
| `setClient()` | Construit un `Laminas\Http\Client` effectuant un POST vers `{api_url}/models/{mam_generative_model}:generateContent?key={apiKey}`. La clé d'API est un **paramètre de requête URL** (pas un en-tête). Délai long. |
| `getMessageKey()` | Renvoie `'contents'`. |
| `addToolsToPayload()` | Récupère les outils via `getAgentFunctions()`, assainit chacun, renomme `input_schema` → `parameters`, et les enveloppe comme `tools:[{functionDeclarations:[…]}]` avec `toolConfig.functionCallingConfig.mode='AUTO'`. Utilise en repli un outil `url_context` lorsqu'aucune fonction n'est présente. |
| `constructContent()` / `addContentToPayload()` | Mappe le rôle `assistant` → `model` ; construit des tableaux `parts` contenant `{text}`, `{fileData:{fileUri,mimeType}}` (File API), ou `{inlineData:{mimeType,data}}` (base64). |
| `sendCustomAI()` | Envoie le payload JSON (réessaie sur 5xx / 429) ; analyse `candidates[].content.parts[]` pour les entrées texte et `functionCall` ; dispatche chaque appel d'outil (MCP ou intégré) ; ajoute les résultats sous forme de `{functionResponse:{name,response:{result}}}` et boucle jusqu'à ce qu'il n'y ait plus d'appels d'outils, qu'une `finishReason` soit atteinte, ou que le plafond de sécurité soit atteint. |
| `processFiles()` / `processContextFiles()` | Gère les téléversements de fichiers selon `mam_file_upload_mode` (voir [Modes de téléversement](#modes-de-téléversement-des-fichiers)) ; stocke également une copie via `uploadDocument()` pour l'affichage en session. |
| `setPromptTokenCount()` / `setResponseTokenCount()` / `setTotalTokenCount()` | Lisent `usageMetadata.promptTokenCount`, `candidatesTokenCount`, `totalTokenCount`. |
| `getAllowedMimetypes()` | Renvoie les types MIME autorisés depuis le bloc de configuration Gemini. |

## Modes de téléversement des fichiers

Le `mam_file_upload_mode` du modèle contrôle comment les fichiers parviennent à Gemini :

- **`fileapi`** (par défaut) — téléverse vers la **File API** Gemini via un POST multipart, puis
  interroge l'état jusqu'à ce qu'il passe à `ACTIVE`, et référence le `fileApiUri` renvoyé.
- **`embed`** — envoie les octets du fichier inline en base64 (`inlineData`), avec extraction de
  texte pour les formats pris en charge.

## Configuration

La configuration se trouve sous `config['plugins']['melisaiengine']['datas']['AI']['Gemini']` :

| Clé | Présentation |
| --- | --- |
| `api_url` | URL de base pour les requêtes `generateContent`. |
| `upload_url` | Point d'accès de téléversement de la File API Gemini. |
| `allowed_mimetypes` | Types MIME acceptés (renvoyés par `getAllowedMimetypes()`). |

La clé d'API provient de l'enregistrement de clé de plateforme du modèle (`mapk_*`), géré dans
le back-office IA. Elle n'est pas stockée dans les fichiers de configuration et n'a pas de
variable d'environnement de repli.

::: warning Clé d'API dans l'URL
La clé d'API Google est ajoutée en paramètre de requête (`?key=…`). Les journaux de requêtes et
les proxies HTTP peuvent la capturer — assurez-vous que votre infrastructure limite la rétention
des journaux en conséquence.
:::

## Mapping outil / appel de fonction

Gemini utilise `parameters` là où le contrat du moteur utilise `input_schema` ; `addToolsToPayload()`
effectue ce renommage avant l'envoi. Les appels d'outils arrivent sous la forme `{functionCall:{name,args}}`
**sans id** (positionnels, contrairement au `tool_use_id` de Claude). Le service achemine par `name` via
`MelisAIEngineMcpService::isMcpTool()` et renvoie
`{functionResponse:{name,response:{result:…}}}`.

## Différences avec le fournisseur Claude

| Aspect | Gemini | Claude |
| --- | --- | --- |
| Clé de message | `contents` | `messages` |
| Libellé du rôle assistant | `model` | `assistant` |
| Clé du schéma d'outil | `parameters` | `input_schema` |
| Id d'appel d'outil | aucun (positionnel) | `tool_use_id` |
| Méthode d'authentification | Paramètre de requête URL `?key=` | En-tête `x-api-key` |
| Mode fichier par défaut | `fileapi` | `embed` |

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Service fournisseur | `vendor/melisplatform/melis-ai-engine-gemini/src/Service/MelisAIEngineModelGeminiService.php` |

## Voir aussi

- [MelisAIEngine](/fr/legacy/reference/modules/melis-ai-engine) — le contrat abstrait et le runtime partagé.
- [MelisAIEngineClaude](/fr/legacy/reference/modules/melis-ai-engine-claude) — le fournisseur Anthropic.
- [MelisAI](/fr/legacy/reference/modules/melis-ai) — back-office pour les agents, instances et modèles.
