# MelisAIEngine

> Le moteur IA central — agents, instances, scénarios, modèles et la couche tools/MCP. Paquet
> `melisplatform/melis-ai-engine`.

## Objectif

MelisAIEngine est le runtime indépendant du fournisseur qui anime Melis AI. Il définit le contrat
de modèle abstrait (`MelisAIEngineModelService`) que les modules fournisseurs (Claude, Gemini…)
implémentent, exécute les **agents** au fil de leurs **étapes de scénario**, construit la charge utile
à partir du contexte de conversation et des fichiers téléversés, gère les déclarations de
**tools/fonctions** (y compris les serveurs MCP), suit la consommation de tokens et expose les view
helpers de chat utilisés dans le back-office. C'est la couche moteur ; l'interface back-office se
trouve dans le module compagnon `melis-ai`. Voir le [guide IA](/fr/guide/ai) et le
[guide MCP](/fr/guide/mcp).

## Activation

Un module Laminas standard. Ajoutez-le à `config/melis.module.load.php` :

```php
'MelisAIEngine',
```

Il est généralement chargé avec `MelisAIEngineClaude` / `MelisAIEngineGemini` (fournisseurs) et
`MelisAI` (back-office). Dépendances Composer : `melisplatform/melis-core` et
`melisplatform/melis-document-upload` (pour l'ingestion de documents). Au moins un module fournisseur
doit être installé pour effectuer de vrais appels de modèle.

## Services clés

| Alias de service | Rôle |
| --- | --- |
| `MelisAIEngineService` | Accès aux données du moteur : `getActiveInstance()`, `getActiveAgent()`, `getActiveModel()`, `getActiveModelClass()`, `getEntryParams()` / `getExitParams()`, `getDefaultModel()`, `getActiveAITools()`, `saveDailyUsage()`. |
| `MelisAIEngineModelService` | Contrat de base abstrait pour les adaptateurs fournisseurs. `send()`, `getAgentFunctions()`, accesseurs de tokens, extraction de documents (`extractTextFromDocx()`, `extractTextFromXlsx()`) ; méthodes abstraites `setClient()`, `addToolsToPayload()`, `addContentToPayload()`, `sendCustomAI()`, `getAllowedMimetypes()`, `processFiles()`, `processContextFiles()`. |
| `MelisAIEngineFunctionService` | Implémentations de tools/fonctions intégrés (non-MCP), par ex. `get_table_structure()`, `create_database_table()`, `add_database_table_fields()`, `activate_module()`, `save_file()`. |
| `MelisAIEngineMcpService` | Client MCP : gestion des serveurs, découverte des tools, gestion des schémas, communication et logique de disjoncteur (composé à partir des traits `Service/Traits/Mcp/*`). Construit par factory. |
| `MelisAIEngineFileService` | Cycle de vie des fichiers pour les téléversements IA, par ex. `deleteAIDocUploads()`. |
| `MelisAIEngineGeneralService` | Aides liées aux événements : `sendEvent()`, `makeArrayFromParameters()`, `getRenderMode()`. |
| `MelisAIEngineConversationStore` | Persiste l'état de conversation (`get()`, `set()`, `has()`, `delete()`) dans `melis_ai_conversation_state`. Construit par factory. |
| `MelisAIEngine\Service\MelisAIEngineAgentService` | Orchestration d'un agent par exécution (construit par factory avec un id d'agent + id d'instance) : `runAgent()`, `continueConversation()`, `validateAnswer()`, `validateResult()`, accesseurs de contexte/historique/réponses de session, `restartAgent()`, `clearSession()`. |

Les alias `*Table` (`MelisAIEngineAgentTable`, `MelisAIEngineInstanceTable`, `MelisAIEngineModelTable`,
`MelisAIEngineToolTable`, `MelisAIEngineAgentToolTable`, `MelisAIEngineScenarioStepTable`, …) exposent
les tables sous-jacentes utilisées par les services ci-dessus.

## Back-office

Le moteur ne fournit pas d'entrée d'arborescence d'outils propre (`app.tools.php` et
`app.toolstree.php` sont vides — l'interface est fournie par `melis-ai`). Il apporte :

- Le contrôleur `MelisAIEngine\Controller\AI` (`AIController`), routé sous `MelisAIEngine`, avec les
  actions AJAX qui pilotent une session de chat : `runAgentAction`, `validateAnswerAction`,
  `continueConversationAction`, `restartAgentAction`, `closeAgentAction`, ainsi que les rendus de
  modales `renderErrorModalAction` et `renderMessageModalAction`.
- Deux modales d'interface déclarées dans `app.interface.php` : melisKeys `melisaiengine_error_modal`
  et `melisaiengine_message_modal`.

## Front-office

L'expérience de chat est exposée sous forme de **view helpers** (et non de templating plugins en
glisser-déposer), utilisables dans n'importe quel `.phtml` :

| Alias de view helper | Rôle |
| --- | --- |
| `AIChatViewHelper` | Affiche une boîte de chat complète liée à une instance/agent. `__invoke($maiInstanceId, ?int $agentId = null, $extraEntryParams = [], $debugMode = false, $exitParamArr = [], $showCloseButton = true, $needExitParam = true, $showHideButton = false, $clearSession = true, $renderMode = 'melis')`. |
| `AIChatFormBoxViewHelper` | Affiche la boîte de saisie/formulaire du chat. `__invoke($agentId, $withLabel = true)`. |
| `AIChatHistoricViewHelper` | Affiche l'historique de la conversation. `__invoke($debugMode = false)`. |
| `AIChatHistoricDebugViewHelper` | Affiche la vue d'historique de débogage. |
| `AIUserInputViewHelper` | Construit un élément de formulaire Laminas pour une étape de saisie utilisateur. `__invoke($fieldType, $label, $fieldName = 'user_input')`. |

Les **étapes de scénario** des agents sont implémentées en tant que controller plugins, enregistrés
sous `controller_plugins` et nommés `MelisAIAgentStepType*Plugin` (par ex.
`MelisAIAgentStepTypeAIChatPlugin`, `MelisAIAgentStepTypeUserInputPlugin`,
`MelisAIAgentStepTypeCodePhpPlugin`, `MelisAIAgentStepTypeCodeBuiltInPlugin`,
`MelisAIAgentStepTypeAIContextPlugin`, `MelisAIAgentStepTypeEntryParamsPlugin`,
`MelisAIAgentStepTypeExitParamsPlugin`, `MelisAIAgentStepTypeCodeAICallPlugin`). Deux plugins
supplémentaires servent les étapes de code intégrées : `MelisAIEngineBuiltInConnectedUser` et
`MelisAIEngineBuiltInGetString`.

## Tables de base de données

Créées par `install/dbdeploy/` (le module définit `extra.dbdeploy: true`) :

| Table | Contenu |
| --- | --- |
| `melis_ai_companies` | Fournisseurs/sociétés IA. |
| `melis_ai_models` | Modèles des fournisseurs. |
| `melis_ai_agents` | Agents (dont `maa_agent_tools`, réglages de contexte fichier). |
| `melis_ai_instances` / `melis_ai_instance_trans` | Instances d'agent et leurs traductions. |
| `melis_ai_scenario_steps` / `melis_ai_scenario_steps_datas` / `melis_ai_scenario_steps_datas_entryexit` | Étapes de scénario, leurs données et paramètres d'entrée/sortie. |
| `melis_ai_return_types` | Données de référence des types de retour d'étape. |
| `melis_ai_tools` / `melis_ai_agents_tools` | Catalogue des tools et l'affectation agent↔tool. |
| `melis_ai_platform_keys` | Clés/identifiants d'API par plateforme. |
| `melis_ai_daily_usage` | Comptabilité des tokens/usage par agent. |
| `melis_ai_files` | Documents/fichiers de contexte IA téléversés. |
| `melis_ai_conversation_state` | État de conversation multi-tours persisté. |

(L'alias `MelisAIEnginePlatformTable` lit la table cœur `melis_core_platform`.)

## Exemple

Insérer une boîte de chat pour une instance IA existante dans une vue back-office :

```php
// dans une vue .phtml
echo $this->AIChatViewHelper($maiInstanceId, $agentId);
```

Ajouter une fonction personnalisée non-MCP appelable par les agents en étendant
`MelisAIEngineFunctionService` et en déclarant la fonction sous
`plugins -> melisaiengine -> datas -> function_declarations`, puis affectez-la à un agent via
**Melis AI > AI Agents > [Agent] > AI Tools**. Voir [Créer un outil](/fr/guide/create-a-tool) et le
[guide MCP](/fr/guide/mcp).

## Fichiers clés

| Sujet | Chemin |
| --- | --- |
| Config du module (services, routes, helpers, plugins) | `vendor/melisplatform/melis-ai-engine/config/module.config.php` |
| Modales d'interface | `vendor/melisplatform/melis-ai-engine/config/app.interface.php` |
| Contrat fournisseur | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineModelService.php` |
| Runtime d'agent | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineAgentService.php` |
| Fonctions/tools intégrés | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineFunctionService.php` |
| Service MCP + traits | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineMcpService.php`, `src/Service/Traits/Mcp/` |
| Contrôleur de chat | `vendor/melisplatform/melis-ai-engine/src/Controller/AIController.php` |
| View helpers | `vendor/melisplatform/melis-ai-engine/src/View/Helper/` |
| Plugins d'étape | `vendor/melisplatform/melis-ai-engine/src/Controller/Plugin/` |
| Deltas BDD | `vendor/melisplatform/melis-ai-engine/install/dbdeploy/` |

Voir aussi : [Référence des modules](/fr/reference/modules), [guide IA](/fr/guide/ai),
[guide MCP](/fr/guide/mcp).
