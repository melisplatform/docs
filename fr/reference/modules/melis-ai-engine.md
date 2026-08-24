# MelisAIEngine

> Le moteur IA abstrait — contrat fournisseur, runtime agent/scénario, stockage des conversations, pont MCP/tools, toutes les tables de base de données IA, et les composants React de chat partagés qui animent le back-office v6. Paquet `melisplatform/melis-ai-engine`.

## Présentation

MelisAIEngine est la clé de voûte de la suite MelisAI. Il définit le contrat fournisseur abstrait (`MelisAIEngineModelService`) qu'implémentent Claude et Gemini, exécute les agents au fil de workflows de scénario multi-étapes, gère le pont MCP/tool-calling, et possède toutes les tables `melis_ai_*` en base de données. Il n'a **aucun outil autonome** propre — c'est le moteur de chat invisible du back-office. En v6 (React), il fournit également le composant React partagé **`AiChatContainer`** ainsi que le backend de chat `/melis/react-api/ai-engine/*` que le module `MelisAI` monte dans ses outils visibles.

## Activation

Ajoutez à `config/melis.module.load.php` :

```php
return [
    'MelisAIEngine',
];
```

Dépendances Composer requises : `melisplatform/melis-core` et `melisplatform/melis-document-upload`. Au moins un module fournisseur (`MelisAIEngineClaude` ou `MelisAIEngineGemini`) doit être installé pour effectuer de vrais appels de modèle ; sans fournisseur actif pour la société du modèle, le chat signale *« The AI company module is not active. »*

## Services principaux

| Alias de service | Rôle |
| --- | --- |
| `MelisAIEngineModelService` | Contrat fournisseur abstrait. Étendre cette classe pour ajouter un nouveau fournisseur IA (§ Contrat fournisseur). |
| `MelisAIEngineService` | Registre/factory : `getActiveInstance()`, `getActiveAgent()`, `getActiveModel()`, `getActiveModelClass()` (sélection du fournisseur), `getActiveAITools()`, `saveDailyUsage()`. |
| `MelisAIEngineAgentService` | Runtime de scénario : `runAgent($postValues, $files)` parcourt les étapes de l'agent et pilote `MelisAIEngineModelService::send()`. |
| `MelisAIEngineMcpService` | Pont MCP/tool-calling : gestion des serveurs, communication JSON-RPC, disjoncteur, `getAvailableTools()`, `isMcpTool()`, `invokeTool()`, `formatToolsForAI()`, `getToolSchema()`. |
| `MelisAIEngineConversationStore` | État de conversation multi-tours persisté dans `melis_ai_conversation_state` : `get()`, `has()`, `set()`, `delete()`. GC automatique après 48 heures. |
| `MelisAIEngineFunctionService` | Implémentations de tools intégrés (non-MCP), p. ex. `get_table_structure`, `create_database_table`. |
| `MelisAIEngineFileService` | Nettoyage de rétention des documents téléversés via IA : `deleteAIDocUploads()`. |
| `MelisAIEngineGeneralService` | Base orientée événements : `sendEvent()`, `makeArrayFromParameters()`. |

## Contrat fournisseur

`MelisAIEngineModelService` (`src/Service/MelisAIEngineModelService.php`) est la classe abstraite que tout fournisseur doit étendre. Constructeur : `(ServiceManager $serviceManager, int $modelId, int $agentId)`.

**Méthodes abstraites qu'un fournisseur doit implémenter :**

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

Le cycle de vie de la méthode `send(array $contextArr): array` de base est fixé : `addToolsToPayload()` → `addContentToPayload()` par entrée de contexte → `sendCustomAI()` → comptage des tokens → retourne `['request','responseData','result','errors','needs_continuation','session_id','continuation_context','tool_results']`.

**Aides fournies par la classe de base :** `getModel()`, `getAgentFunctions()`, `getToolDeclarationByName()`, accesseurs de tokens, `uploadDocument()`, `extractTextFromDocx()`, `extractTextFromXlsx()`, `getMimeType()`.

## Sélection du fournisseur

`MelisAIEngineService::getActiveModelClass($company, $modelId, $agentId)` choisit le fournisseur en fonction du nom de société du modèle :

```php
if (strpos($company, 'Google') !== false) {
    // builds MelisAIEngineModelGeminiService — requires MelisAIEngineGemini module
} elseif (strpos($company, 'Anthropic') !== false) {
    // builds MelisAIEngineModelClaudeService — requires MelisAIEngineClaude module
}
```

Pour ajouter un nouveau fournisseur (p. ex. OpenAI) : étendre `MelisAIEngineModelService`, implémenter les méthodes abstraites, l'enregistrer comme service, et ajouter une branche ici indexée sur le nom de la société. Les fournisseurs Ollama et OCI suivent le même contrat.

## Système MCP / tool-calling

Les tools sont déclarés à deux endroits : `config['plugins']['melisaiengine']['datas']['function_declarations']` (nom, description, schéma JSON, booléen `mcp`) et la table `melis_ai_tools`. Un agent opte pour des tools via `maa_agent_tools`.

Lors de l'appel : `getAgentFunctions()` retourne les déclarations autorisées → `addToolsToPayload()` les injecte → lors d'un appel de tool, le fournisseur route via `MelisAIEngineMcpService::isMcpTool($name)` : les tools MCP vont vers `invokeTool()` (JSON-RPC sur stdio, protégé par disjoncteur) ; les tools intégrés vont vers `MelisAIEngineFunctionService`. Les résultats sont réinjectés et la conversation continue jusqu'à ce que le modèle signale la fin ou qu'un plafond de sécurité soit atteint.

Les serveurs MCP sont configurés sous `config['mcp']['servers'][<name>]` = `{enabled, command, args, tools, timeout}` ; `MelisAIEngineMcpService` les lance via `proc_open` et communique en JSON-RPC 2.0 (`tools/list`, invocation de tool).

## Tables de base de données

Toutes les tables `melis_ai_*` sont gérées par ce module (`dbdeploy: true`) :

| Table | Contenu |
| --- | --- |
| `melis_ai_models` | Modèles fournisseurs (société, `mam_generative_model`, lien clé API). |
| `melis_ai_companies` | Sociétés IA (Google, Anthropic…). |
| `melis_ai_platform_keys` | Clés API par plateforme. |
| `melis_ai_agents` | Agents (`maa_name`, lien modèle, JSON `maa_agent_tools`, options fichiers). |
| `melis_ai_agents_tools` | Affectation agent ↔ tool. |
| `melis_ai_tools` | Catalogue des tools (`mat_name`, `mat_desc`, JSON `mat_config`). |
| `melis_ai_instances` / `melis_ai_instance_trans` | Déploiements nommés (instances) et leurs traductions. |
| `melis_ai_scenario_steps` / `…_datas` / `…_datas_entryexit` | Étapes de scénario, leurs données et paramètres d'entrée/sortie. |
| `melis_ai_return_types` | Définitions des types de retour d'étape. |
| `melis_ai_files` | Fichiers attachés aux étapes/contexte. |
| `melis_ai_daily_usage` | Comptage des tokens et des appels par modèle/agent/instance/jour. |
| `melis_ai_conversation_state` | État de conversation persisté (`macs_key`, JSON, GC automatique). |

## Composants React de chat

MelisAIEngine n'a **aucune brique** ni entrée de menu `/melis-react`. Pour le back-office React, il expose une bibliothèque de composants **en sources uniquement** sous `ui-react/src/`, importée par les consommateurs via l'alias Vite **`@melis-ai-engine`** (associé à `melis-ai-engine/ui-react/src`). Elle rend l'intégralité de la surface de chat ; le LLM réel est toujours fourni par un module fournisseur.

| Export | Rôle |
| --- | --- |
| `AiChatContainer` (par défaut) | Composant orchestrateur : exécute toute la boucle `init → run → (continue×N) → validate`, détient l'état du chat, câble les sous-composants. **C'est celui à monter.** |
| `ChatHistory`, `TypingIndicator`, `StepInterface` | Liste défilante des messages (markdown via `window.marked` si présent), indicateur de réflexion, cartes d'interface par étape. |
| `ChatFormBox` | Barre de saisie du bas : zone de texte, envoi/validation, menu `+` → téléversement de fichier (`user_file_upload[]`) ou Médiathèque (`userMediaFiles[]`, MoxieManager), surcouche glisser-déposer. |
| `ChatDebugPanel`, `DebugEntry` | Vue de débogage : payload de requête (→) et réponse brute du modèle (←) sous forme de blocs JSON (uniquement lorsque `debugMode`). |
| `MelisPlanPanel`, `extractMelisPlan`, `looksLikeMelisPlan` | Rend un « plan Melis » structuré proposé par l'IA (p. ex. une liste de champs de formulaire) sous forme de tableau. |
| `aiEngineInit/Run/Continue/Validate/Restart` | Client typé pour les endpoints `ai-engine` (§ Backend de chat). |
| `parseResultActionString`, `dispatchResultAction`, `dispatchToolResults` | Dispatcher de navigation en boucle fermée `JS_ACTION` (§ Navigation en boucle fermée). |

**Contrat de montage — `AiChatContainerProps` :**

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

Le conteneur plafonne la continuation à `MAX_CONTINUATION_HOPS = 20`. Pour ajouter un chat IA à un outil React, importez `AiChatContainer` et montez-le avec un `maiInstanceId` — aucun travail backend nécessaire, les endpoints existent déjà. Les consommateurs incrémentent une `key` sur l'élément monté pour forcer une nouvelle session serveur au relancement.

## Où il apparaît

Vous ne voyez jamais MelisAIEngine comme entrée de menu ; ses surfaces de chat apparaissent au sein du module **MelisAI**, qui monte le même `AiChatContainer` à trois endroits (seuls `maiInstanceId` / `agentId` diffèrent) :

- **Assistant IA** — la surcouche d'assistant flottant (chat généraliste capable d'agir sur le back-office, lancé avec `autoRun`).
- **Outil Chat Dev** — un bac à sable développeur pour lancer n'importe quel agent/instance et dialoguer avec lui.
- **Onglet « Run » de l'agent** — tester un agent depuis l'outil des agents MelisAI (`maiInstanceId="agenttool"`).

## Backend de chat — les endpoints `ai-engine`

Les routes sont déclarées dans `config/module.config.php` (pas un `react-api.php`), alias de contrôleur `MelisAIEngine\Controller\React\MelisReactApiAiEngine` → `MelisReactApiAiEngineController`. Chaque action se protège avec `denyUnlessAuthenticated()` (401 sans identité MelisCore — aucun contrôle de capacité par outil, puisqu'il s'agit d'un moteur partagé). Enveloppe de réponse uniforme : `{ success, data, error? }`. Ces endpoints reflètent le `AIController` legacy (`/melis/MelisAIEngine/AI/*`) et appellent le même `MelisAIEngineAgentService`.

| Méthode & URL | Fn client | Objet |
| --- | --- | --- |
| `GET /melis/react-api/ai-engine/init` | `aiEngineInit` | Valider instance→agent→modèle→fournisseur ; retourne `label`, `finalInstanceId`, `agentId`, `isFileUploadActivated`, `isMediaLibraryActivated`, `hasExitParameter` (ou `errorType`/`errorMessage`). |
| `POST /melis/react-api/ai-engine/run` | `aiEngineRun` | Démarrer/faire avancer un tour. JSON pour le texte, multipart/form-data lorsque des fichiers sont joints → `runAgent()`. |
| `POST /melis/react-api/ai-engine/continue` | `aiEngineContinue` | Reprendre un tour multi-sauts (`needs_continuation=true`) → `continueConversation(sessionId, continuationContext)`. |
| `POST /melis/react-api/ai-engine/validate` | `aiEngineValidate` | Accepter la réponse de l'IA, avancer vers l'étape de paramètre de sortie, retourner `exitParams` pour le callback hôte → `validateAnswer()`. |
| `POST /melis/react-api/ai-engine/restart` | `aiEngineRestart` | Effacer la session, retourner le même `finalInstanceId` prêt à être réutilisé. |

Le `RunResult` inclut `chatHist`, `needs_continuation`, `session_id`, `continuation_context`, `payload`/`response` (débogage), `exitParams`, `tool_results`.

**Tour texte minimal :**

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

## Navigation en boucle fermée

Le moteur ne fait que **dispatcher** : `nav-actions.ts` analyse les chaînes de callback `JS_ACTION::action::k=v&…` extraites du `tool_results` d'une réponse et appelle `window.melisReactActionMap[action](args)`. Le **shell hôte (melis-core)** *enregistre* ces handlers et détient la navigation React-Router / la perception du DOM. Un handler peut retourner une observation `Promise<string>`, que `dispatchToolResults` attend et réinjecte comme `continuationContext.clientObservation` — ce qui ancre le tour de modèle suivant. Cela maintient découplés les deux bundles construits indépendamment : seul le contrat `window` les relie.

## Exemple (view helper legacy)

Le view helper classique rendu côté serveur fonctionne toujours pour les contextes non-React (`.phtml`) :

```php
// Render the chat box for a named instance
echo $this->AIChatViewHelper($maiInstanceId);
```

Enregistrer un serveur MCP personnalisé et déclarer ses tools pour qu'un agent puisse les appeler :

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

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Contrat fournisseur (abstrait) | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineModelService.php` |
| Registre + sélection du fournisseur | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineService.php` |
| Runtime agent/scénario | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineAgentService.php` |
| Pont MCP/tools | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineMcpService.php` |
| Stockage de conversation persisté | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineConversationStore.php` |
| Fonctions intégrées | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineFunctionService.php` |
| Contrôleur de chat legacy | `vendor/melisplatform/melis-ai-engine/src/Controller/AIController.php` |
| Backend React de chat | `vendor/melisplatform/melis-ai-engine/src/Controller/React/MelisReactApiAiEngineController.php` |
| Bibliothèque React de chat partagée | `vendor/melisplatform/melis-ai-engine/ui-react/src/` (`AiChatContainer.tsx`, `api.ts`, `nav-actions.ts`…) |
| Modèles de tables BDD | `vendor/melisplatform/melis-ai-engine/src/Model/Tables/` |
| Config du module | `vendor/melisplatform/melis-ai-engine/config/module.config.php` |

Voir aussi : [MelisAI](/fr/reference/modules/melis-ai), [MelisAIEngineClaude](/fr/reference/modules/melis-ai-engine-claude), [MelisAIEngineGemini](/fr/reference/modules/melis-ai-engine-gemini), [MelisAIToolCreator](/fr/reference/modules/melis-ai-tool-creator).
