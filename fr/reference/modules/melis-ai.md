# MelisAI

> Le module d'IA exposé dans le backoffice Melis — agents, instances, modèles, outils et un
> inspecteur MCP. Paquet `melisplatform/melis-ai`.

## Objectif

MelisAI est la **couche d'interface et de gestion backoffice** des fonctionnalités d'IA de Melis
Platform. Il n'exécute pas les modèles lui-même : il fournit les outils pour configurer les
**modèles** d'IA et les clés de plateforme, définir des **instances** (où les agents sont utilisés à
travers la plateforme), construire des **agents** avec leurs **scénarios** (étapes) et leurs
**outils d'IA**, suivre l'**usage** (tokens / requêtes) et inspecter les serveurs **MCP**.
L'exécution réelle de l'IA est déléguée à [`melis-ai-engine`](/fr/reference/modules). Voir le
[guide IA](/fr/guide/ai) et le [guide MCP](/fr/guide/mcp).

## Activation

MelisAI est un module Laminas standard. Ajoutez-le à `config/melis.module.load.php` (le squelette le
liste déjà) :

```php
'MelisAIEngine',
'MelisAIEngineClaude',
'MelisAIEngineGemini',
'MelisAI',
```

Il requiert `melisplatform/melis-ai-engine` (`^5.3`) et PHP `^8.1|^8.3` ; le moteur possède les
tables et les table gateways de base de données que ce module consomme. Les modules fournisseurs
(Claude / Gemini) apportent les modèles. Pour utiliser les agents basés sur MCP (Tool Creator,
Minitemplate Creator…), définissez `melis_platform`, `melis_project_root`, `melis_php_binary`,
`melis_http_host` et `melis_request_scheme` dans `config/autoload/platforms.[env].php` (voir le
README du module).

## Services principaux

Enregistrés en tant qu'alias `service_manager` dans `config/module.config.php`. Ils étendent
`MelisGeneralService` et lisent/écrivent via les table gateways du moteur (par ex.
`MelisAIEngineAgentTable`, `MelisAIEngineInstanceTable`).

| Alias de service | Rôle |
| --- | --- |
| `MelisAIAgentService` | CRUD sur les agents d'IA — `getItemById()`, `getList()`, `saveItem()`, `deleteItem()`. |
| `MelisAIInstanceService` | Liste les instances et vérifie l'unicité — `getList()`, `isInstanceExisting()`. |
| `MelisAIModelService` | Enregistre les définitions de modèles d'IA — `saveItem()`. |
| `MelisAIPlatformKeysService` | Stocke les clés d'API plateforme/fournisseur — `saveItem($data, $keys)`. |
| `MelisAIScenarioStepService` | Étapes de scénario d'agent — `saveItem()`, `deleteItem()`, `getScenario()`, `isCodeExisting()`. |
| `MelisAIScenarioStepDataService` | Données par étape (params entrée/sortie) — `saveItem()`, `deleteItem()`. |
| `MelisAIScenarioStepFileService` | Fichiers joints aux étapes — `saveItem()`, `getFileByToken()`. |
| `MelisAIToolService` | Outils d'IA disponibles pour les agents — `getList()`, `isAiToolExisting()`. |
| `MelisAIUsageService` | Statistiques d'usage — `getTotalTokens()`, `getTotalQueries()` (par modèle, durée, par instance). |

```php
// Depuis n'importe quel contrôleur / service
$agentSrv = $this->getServiceManager()->get('MelisAIAgentService');
$agent    = $agentSrv->getItemById($agentId);
```

## Backoffice

MelisAI est un arbre d'outils backoffice (la section de menu de gauche **Melis AI**,
`melisai_toolstree_section`). Ses outils et onglets sont déclarés dans `config/app.toolstree.php`
sous l'interface `melisai` ; leur contenu provient de `config/app.tools.php` et
`config/app.agent.tools.php`.

| Outil (melisKey) | Contrôleur / action |
| --- | --- |
| Admin (`melisadmin_tool`) | `MelisAI\Controller\Admin` → `render-tool` |
| ↳ Usage (`melisai_usage`) | `Admin` → `render-tool-usage` |
| ↳ Platform AI (`melisai_platform_ai`) — configurer les modèles et le modèle par défaut | `Admin` → `render-platform-ai` |
| ↳ Instances (`melisai_instances`) | `Admin` → `render-instances` |
| ↳ Chat Dev Tool (`melisai_chat_dev_tool`) — inspecter les payloads des requêtes IA | `Admin` → `render-chat-dev-tool` |
| AI Agents (`melisagent_tool`) | `MelisAI\Controller\Agent` → `render-tool` |
| ↳ Propriétés d'agent (onglets Scenario / Config / AI Tools) | `MelisAI\Controller\AgentProperties` |
| MCP Inspector (`melis_mcp_inspector_tool`) | `MelisAI\Controller\McpInspector` → `render-tool` |
| Modale d'instance | `MelisAI\Controller\Instance` |
| Modale d'outil IA | `MelisAI\Controller\Tool` |

Le menu de gauche lui-même est rendu par `MelisAI\Controller\AIMenu` (`left-menu`) et l'arbre par
`MelisAI\Controller\AITreeTools` (`render-tree-tools`). Les listeners backoffice
(`SavePropertiesListener`, `SaveAgentPropertiesListener`, `DeleteListener`,
`MelisAIFlashMessengerListener`) sont attachés dans `src/Module.php` pour persister les formulaires
et les messages flash. Les fabriques de formulaires sous `src/Form/Factory/` construisent les listes
déroulantes modèle/agent/outil.

Un **assistant de chat d'en-tête** est injecté dans l'en-tête du backoffice via l'interface
`meliscore` (`meliscore_header_ai_main_chat_assistant`), servi par `MelisAI\Controller\GeneralChat`
(`headerMainChatAssistant`).

## Front office

MelisAI est un module backoffice et ne fournit **aucun plugin de templating front-office**. Il
expose toutefois deux view helpers backoffice (`config/module.config.php`) :

| Helper | Rôle |
| --- | --- |
| `melisAIIcon` | Affiche les icônes MelisAI (`src/View/Helper/MelisAIIconHelper.php`). |
| `CustomFormViewHelper` | Affiche le formulaire IA dynamique (`src/View/Helper/MelisAICustomFormViewHelper.php`). |

Une route publique `melis-backoffice/melisaifile` (`MelisAI\Controller\File` → `view`) sert les
fichiers d'étape IA par token ; elle figure dans `excluded_routes`, aucune authentification n'est
donc requise pour cette vue.

## Tables de base de données

MelisAI n'a pas de SQL propre — le schéma est installé et versionné par `melis-ai-engine`
(`vendor/melisplatform/melis-ai-engine/install/dbdeploy/`). Les tables qu'il lit/écrit via les
gateways du moteur sont :

| Table | Contenu |
| --- | --- |
| `melis_ai_agents` | Agents d'IA. |
| `melis_ai_instances`, `melis_ai_instance_trans` | Instances et leurs traductions. |
| `melis_ai_models` | Définitions de modèles d'IA. |
| `melis_ai_platform_keys` | Clés d'API fournisseur/plateforme. |
| `melis_ai_scenario_steps` | Étapes de scénario d'agent. |
| `melis_ai_scenario_steps_datas`, `melis_ai_scenario_steps_datas_entryexit` | Données d'étape et params entrée/sortie. |
| `melis_ai_files` | Fichiers joints aux étapes. |
| `melis_ai_daily_usage` | Compteurs d'usage tokens/requêtes. |
| `melis_ai_conversation_state` | État de conversation. |

## Serveurs MCP

Le module embarque deux serveurs MCP autonomes utilisés par les agents compatibles MCP et exposés
via l'outil **MCP Inspector** :

| Chemin | Paquet | Rôle |
| --- | --- | --- |
| `mcp/dbmcp/` | `melisplatform/dbmanager-mcp` | Serveur MCP gestionnaire de base de données. |
| `mcp/filemcp/` | `melisplatform/filemanager-mcp` | Serveur MCP gestionnaire de fichiers. |

Le `composer.json` annonce `supports-mcp` et `allow-mcp-discovery`. Voir [MCP](/fr/guide/mcp).

## Fichiers clés

| Sujet | Chemin |
| --- | --- |
| Module + câblage des listeners | `vendor/melisplatform/melis-ai/src/Module.php` |
| Alias de services, contrôleurs, view helpers, routes | `vendor/melisplatform/melis-ai/config/module.config.php` |
| Arbre d'outils (menu, onglets, modales) | `vendor/melisplatform/melis-ai/config/app.toolstree.php` |
| Tables et formulaires admin / instance / outil | `vendor/melisplatform/melis-ai/config/app.tools.php` |
| Tables d'outils d'agent | `vendor/melisplatform/melis-ai/config/app.agent.tools.php` |
| Assets backoffice, plugin chat d'en-tête | `vendor/melisplatform/melis-ai/config/app.interface.php` |
| Services | `vendor/melisplatform/melis-ai/src/Service/` |
| Contrôleurs | `vendor/melisplatform/melis-ai/src/Controller/` |
| Listeners | `vendor/melisplatform/melis-ai/src/Listener/` |
| Serveurs MCP embarqués | `vendor/melisplatform/melis-ai/mcp/dbmcp/`, `vendor/melisplatform/melis-ai/mcp/filemcp/` |

::: tip Voir aussi
Le moteur d'IA et les fournisseurs sont documentés dans la [Référence des modules](/fr/reference/modules) ;
les workflows sont dans le [guide IA](/fr/guide/ai) et le [guide MCP](/fr/guide/mcp).
:::
