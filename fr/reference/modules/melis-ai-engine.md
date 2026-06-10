# MelisAIEngine

> Le moteur IA abstrait — contrat fournisseur, runtime agent/scénario, stockage des conversations, pont MCP/tools, et toutes les tables de base de données IA. Paquet `melisplatform/melis-ai-engine`.

## Présentation

MelisAIEngine est la clé de voûte de la suite MelisAI. Il définit le contrat fournisseur abstrait (`MelisAIEngineModelService`) qu'implémentent Claude et Gemini, exécute les agents au fil de workflows de scénario multi-étapes, gère le pont MCP/tool-calling, et possède toutes les tables `melis_ai_*` en base de données. L'interface back-office se trouve dans le module compagnon `MelisAI` ; ce module est uniquement la couche service et données.

## Activation

Ajoutez à `config/melis.module.load.php` :

```php
return [
    'MelisAIEngine',
];
```

Dépendances Composer requises : `melisplatform/melis-core ^5.3` et `melisplatform/melis-document-upload ^5.3`. Au moins un module fournisseur (`MelisAIEngineClaude` ou `MelisAIEngineGemini`) doit être installé pour effectuer de vrais appels de modèle.

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

Pour ajouter un nouveau fournisseur (p. ex. OpenAI) : étendre `MelisAIEngineModelService`, implémenter les méthodes abstraites, l'enregistrer comme service, et ajouter une branche ici indexée sur le nom de la société.

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

## Exemple

Afficher une boîte de chat liée à une instance IA existante depuis n'importe quelle vue `.phtml` :

```php
// Afficher la boîte de chat pour une instance nommée
echo $this->AIChatViewHelper($maiInstanceId);
```

Enregistrer un serveur MCP personnalisé et déclarer ses tools pour qu'un agent puisse les appeler :

```php
// Dans la config d'un module — enregistrer le serveur MCP
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
// Déclarer le tool avec mcp: true
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
| Contrôleur de chat | `vendor/melisplatform/melis-ai-engine/src/Controller/AIController.php` |
| Plugins de type d'étape | `vendor/melisplatform/melis-ai-engine/src/Controller/Plugin/` |
| Modèles de tables BDD | `vendor/melisplatform/melis-ai-engine/src/Model/Tables/` |
| Config du module | `vendor/melisplatform/melis-ai-engine/config/module.config.php` |

Voir aussi : [MelisAI](/fr/reference/modules/melis-ai), [MelisAIEngineClaude](/fr/reference/modules/melis-ai-engine-claude), [MelisAIEngineGemini](/fr/reference/modules/melis-ai-engine-gemini), [MelisAIToolCreator](/fr/reference/modules/melis-ai-tool-creator).
