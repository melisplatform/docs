# MelisAIEngineGemini

> Fournisseur Google Gemini pour le moteur Melis AI — un moteur backend sans back-office propre. Paquet `melisplatform/melis-ai-engine-gemini`.

## Présentation

`MelisAIEngineGemini` est l'implémentation concrète Google Gemini du contrat
`MelisAIEngineModelService` de `MelisAIEngine`. Il fournit la configuration spécifique du client
HTTP Gemini, le format de payload `generateContent` (le schéma `contents` / `parts`), le mapping
outil/appel de fonction, la gestion des fichiers via la File API ou l'intégration inline, et
l'analyse de la consommation de jetons. Le module est sans état (aucune table qui lui appartient)
et ne fournit **aucune interface** — tous les écrans IA proviennent de `melis-ai` /
`melis-ai-engine`.

## Aucun back-office React

Ce module n'a **aucun outil React** et n'est pas censé en avoir un — c'est une couche fournisseur
backend, pas un écran. Il ne fournit aucune brique `ui-react/`, aucun `config/react-api.php`, aucun
`config/react.capabilities.php`, aucun contrôleur, et n'affiche **aucune entrée de barre latérale
ni nœud de menu** dans `/melis-react`. Il n'y a aucune capture d'écran.

Dans le back-office React, Gemini n'apparaît qu'**indirectement**, en tant que moteur/modèle
sélectionnable au sein de l'administration **MelisAI** (IA de la plateforme / Instances / Modèles
et clés). Lorsqu'un administrateur crée un modèle dont la société est **Google** et que ce module
est installé, `MelisAIEngine` achemine le chat et les agents de ce modèle via le moteur Gemini
implémenté ici — sans page Gemini dédiée.

## Activation

Ajoutez dans `config/melis.module.load.php` :

```php
return [
    'MelisAIEngineGemini',
];
```

Nécessite `melisplatform/melis-ai-engine` `^6.0`. Le moteur sélectionne automatiquement ce
fournisseur à l'exécution lorsque le nom de société du modèle actif contient **`Google`** et que
ce module est installé ; il construit `MelisAIEngineModelGeminiService` via
`$serviceManager->build(MelisAIEngineModelGeminiService::class, ['modelId' => …, 'agentId' => …])`.

## Services principaux

| Alias de service | Rôle |
| --- | --- |
| `MelisAIEngineModelGeminiService` | Le fournisseur Gemini — sous-classe de `MelisAIEngineModelService`, construit par requête avec `modelId` + `agentId` (via `MelisAIEngineModelGeminiServiceFactory`). |

Méthodes notables de `MelisAIEngineModelGeminiService` :

| Méthode | Implémentation Gemini |
| --- | --- |
| `setClient()` | Construit un `Laminas\Http\Client` effectuant un POST vers `{api_url}/models/{mam_generative_model}:generateContent`. La clé d'API est envoyée dans l'en-tête de requête **`x-goog-api-key`** (hors de l'URL). Délai long. |
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

La configuration fixe du fournisseur se trouve sous `config['plugins']['melisaiengine']['datas']['AI']['Gemini']`
(dans `config/app.interface.php`, sans interface) :

| Clé | Présentation |
| --- | --- |
| `api_url` | URL de base pour les requêtes `generateContent` (`https://generativelanguage.googleapis.com/v1beta`). |
| `upload_url` | Point d'accès de téléversement de la File API Gemini (`https://generativelanguage.googleapis.com/upload/v1beta/files`). |
| `allowed_mimetypes` | Types MIME acceptés (renvoyés par `getAllowedMimetypes()`). |

Les valeurs par modèle proviennent de la **ligne de modèle** configurée dans MelisAI, et non de ce
module :

- **`mam_generative_model`** — l'id du modèle Gemini (par ex. `gemini-…`), utilisé dans l'URL de
  requête.
- **`mapk_keys`** — la **clé d'API Google**, envoyée dans l'en-tête `x-goog-api-key`. Elle provient
  de l'enregistrement de clé de plateforme du modèle, n'est pas stockée dans les fichiers de
  configuration et n'a **aucune variable d'environnement de repli**.
- **`mam_file_upload_mode`** (`fileapi` par défaut, ou `embed`) et `mam_internal_upload` —
  gouvernent la façon dont les fichiers sont téléversés.

::: tip Clé d'API dans l'en-tête
Contrairement aux versions antérieures qui ajoutaient la clé en paramètre de requête `?key=…`, la
source actuelle envoie la clé d'API Google dans l'en-tête de requête **`x-goog-api-key`**, la
gardant hors des URL et des journaux de proxy.
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
| Méthode d'authentification | En-tête `x-goog-api-key` | En-tête `x-api-key` |
| Mode fichier par défaut | `fileapi` | `embed` |

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Service fournisseur | `vendor/melisplatform/melis-ai-engine-gemini/src/Service/MelisAIEngineModelGeminiService.php` |
| Fabrique de service | `vendor/melisplatform/melis-ai-engine-gemini/src/Service/Factory/MelisAIEngineModelGeminiServiceFactory.php` |
| Configuration fixe | `vendor/melisplatform/melis-ai-engine-gemini/config/app.interface.php` |

## Voir aussi

- [MelisAIEngine](/fr/reference/modules/melis-ai-engine) — le contrat abstrait et le runtime partagé.
- [MelisAIEngineClaude](/fr/reference/modules/melis-ai-engine-claude) — le fournisseur Anthropic.
- [MelisAI](/fr/reference/modules/melis-ai) — back-office pour les agents, instances et modèles.
