# MelisAI

> Interface back-office de la suite MelisAI — connectez des fournisseurs, construisez des agents, déployez des instances, suivez l'usage et inspectez les serveurs MCP. Paquet `melisplatform/melis-ai`.

## Présentation

MelisAI est la **couche de gestion back-office** de la suite MelisAI. Il n'exécute pas les modèles d'IA lui-même — c'est le rôle de `melis-ai-engine` et des modules fournisseurs. Il fournit l'interface et les services pour câbler l'ensemble du système IA : connecter un fournisseur (**Platform AI**), construire des comportements (**AI Agents** avec scénarios et listes d'outils autorisés), les déployer sous forme d'**Instances** nommées, surveiller l'**Usage**, déboguer avec un chat brut (**Chat Dev Tool**), et inspecter les **serveurs MCP** connectés.

## Activation

Ajoutez à `config/melis.module.load.php` (les modules fournisseurs doivent être listés avant `MelisAI`) :

```php
return [
    'MelisAIEngine',
    'MelisAIEngineClaude',   // Anthropic provider
    'MelisAIEngineGemini',   // Google provider
    'MelisAI',
];
```

`MelisAI` requiert `melisplatform/melis-ai-engine`, qui possède toutes les tables de base de données `melis_ai_*` ainsi que le runtime agent/scénario. Les modules fournisseurs (`melis-ai-engine-claude`, `melis-ai-engine-gemini`) implémentent le contrat fournisseur et doivent être installés pour leurs entreprises respectives.

## Les quatre concepts fondamentaux

| Concept | Table | Colonne clé | Description |
| --- | --- | --- | --- |
| **model** | `melis_ai_models` (`mam_*`) | `mam_generative_model` | Une ligne de modèle fournisseur : entreprise (Anthropic / Google), chaîne du modèle, lien clé API, indicateur par défaut, paramètres d'upload de fichier. |
| **agent** | `melis_ai_agents` (`maa_*`) | `maa_agent_tools` (liste JSON autorisée) | Un comportement : nom, code agent, surcharge de modèle optionnelle, étapes de scénario ordonnées, liste d'outils autorisés. |
| **instance** | `melis_ai_instances` (`mai_*`) | `mai_instance_id` | Un déploiement nommé d'un agent. La chaîne `mai_instance_id` est la clé stable référencée par toute l'interface (ex. `mainchatassistantgeneral`, `aitoolcreator`). |
| **tool** | `melis_ai_tools` (`mat_*`) | — | Une fonction appelable que le modèle peut invoquer. Soit **MCP** (serveur MCP externe, `mcp: true`) soit **Local** (PHP intégré). |

**Modèle mental en une phrase :** une instance pointe vers un agent, un agent pointe vers un modèle, un modèle nomme une entreprise — ce qui sélectionne le fournisseur ; un chat sur l'instance exécute le scénario de l'agent, en appelant les outils autorisés de l'agent.

## Services principaux

Les services émettent des événements `MelisAI_<entity>_service_<method>_start/_end`. Les contrôleurs émettent également `melisai_save_instance_end`, `melisai_delete_instance_end` et `melisai_save_ai_tool_end` (avec les valeurs `typeCode` `AI_INSTANCE_ADD|EDIT|DELETE`, `AI_TOOL_ADD|EDIT`) pour la journalisation.

| Service | Méthodes / Rôle |
| --- | --- |
| `MelisAIAgentService` | `getItemById()`, `getList()`, `saveItem()`, `deleteItem()` — CRUD sur les agents. |
| `MelisAIInstanceService` | `getList()`, `isInstanceExisting()` — liste des instances et vérification d'unicité. |
| `MelisAIToolService` | `getList()`, `isAiToolExisting()` — catalogue d'outils. |
| `MelisAIModelService` | Définitions de modèles. |
| `MelisAIPlatformKeysService` | Stockage des clés API. |
| `MelisAIScenarioStepService` | Gestion des étapes de scénario. |
| `MelisAIUsageService` | Statistiques d'usage tokens/requêtes. |

## Back-office

La section **Melis AI** dans le menu de gauche installe quatre entrées :

| Entrée BO | Ce qu'elle fait |
| --- | --- |
| **Admin → Usage** | Tableau de bord sur `melis_ai_daily_usage`. Filtrage par Entreprise/Modèle et plage temporelle ; quatre graphiques : Total Requêtes, Requêtes par instance, Total Tokens, Tokens par instance. |
| **Admin → Platform AI** | Connecter un fournisseur : choisir Entreprise + Modèle, opter pour une clé commune ou des clés par plateforme, coller la ou les clés API, définir le modèle Actif + Par défaut. Gère aussi la File Upload Management (bascules upload utilisateur / contexte, taille max, mode *File Api* vs *Embed in request*). |
| **Admin → Instances** | Gérer les déploiements nommés. Six sont fournis par défaut : trois système (`admintool`, `agenttool`, `mainchatassistantgeneral`) et trois applicatifs (`aitoolcreator`, `minitemplatecreator`, `newscontentcreator`). Chaque instance possède un `mai_instance_id`, un libellé, un agent lié et un statut. |
| **Admin → Chat Dev Tool** | Chat de débogage pour développeurs. Affiche le **raw AI PAYLOAD** et la **raw AI RESPONSE** (JSON) côte à côte — le contenu complet `contents`/`parts`, le contexte système, les outils envoyés, et les `candidates`/`usageMetadata` retournés. |
| **AI Agents** | Lister et modifier les comportements des agents. L'édition d'un agent expose quatre onglets : **Scenario**, **Run**, **Config**, **AI Tools**. |
| **MCP Inspector** | Liste les serveurs MCP connectés et les outils qu'ils exposent (via `tools/list`), adossé au `MelisAIEngineMcpService` du moteur. |

### Onglets de l'agent

| Onglet | Rôle |
| --- | --- |
| **Scenario** | Étapes ordonnées : `ENTRY_PARAMS` → `AI_CONTEXT` (prompt système) → `AI_CHAT` → `EXIT_PARAMS`. Les étapes se référencent avec `[CODE]`. |
| **Config** | Nom de l'agent, code agent (slug stable), description, surcharge de modèle (Entreprise + Modèle), bascules upload de fichier, interrupteur Actif. |
| **AI Tools** | Cochez les outils que cet agent peut appeler. Les outils sont regroupés en **MCP Tools** (servis par des serveurs MCP) et **Local Tools** (PHP intégré). |
| **Run** | Chat en direct intégré contre l'agent pour itérer sur le scénario/les outils sans quitter l'éditeur. |

### Catalogue d'outils fournis

| Groupe | Outils |
| --- | --- |
| **MCP — schéma/données DB** | `getTableStructure`, `createDatabaseTable`, `addDBTableColumns`, `updateDBTableColumns`, `dropDBTableColumns`, `selectData`, `insertData`, `updateData`, `deleteData`, `bulkInsertData` |
| **MCP — système de fichiers** | `createFile`, `createDirectory`, `pathExists`, `readFile`, `updateFiles`, `deleteFile`, `deleteDirectory` |
| **MCP — site/mini-template** (depuis CommunityExtensions) | `readSiteAssets`, `getSitePublicUrl`, `uploadMinitemplateImages`, `renderMinitemplatePreview` |
| **MCP — module builder** (depuis ToolCreator) | `createModule`, `activateModule`, `deactivateModule`, `generateBundle` |
| **Local** | `activate_module` |

## Flux de chat (ce qui se passe à l'envoi)

1. Une vue rend **`AIChatViewHelper(<mai_instance_id>, …)`** — fourni par `melis-ai-engine` — qui poste les tours utilisateur au moteur.
2. Le `AIController::runAgentAction` du moteur → `MelisAIEngineAgentService::runAgent()` résout **instance → agent → modèle**, puis sélectionne le fournisseur via `MelisAIEngineService::getActiveModelClass($company, $modelId, $agentId)` (entreprise `Google` → Gemini, `Anthropic` → Claude).
3. Le moteur parcourt les **étapes de scénario** de l'agent dans l'ordre ; `MelisAIEngineModelService::send()` appelle l'API IA ; les appels d'outils sont routés via `MelisAIEngineMcpService` (JSON-RPC pour les outils MCP, appel PHP direct pour les outils Local).
4. L'état persiste dans `melis_ai_conversation_state` ; les compteurs de tokens/appels dans `melis_ai_daily_usage`.

**MelisAI n'appelle jamais les APIs IA lui-même — le moteur et les modules fournisseurs s'en chargent.**

## AIChatViewHelper — intégrer un chatbox

L'ensemble du chatbox est un view helper provenant de `melis-ai-engine`. Signature :

```php
$this->AIChatViewHelper(
    string  $maiInstanceId,           // the instance's mai_instance_id (e.g. "newscontentcreator")
    ?int    $agentId        = null,   // null → use the instance's linked agent
    ?array  $extraEntryParams = [],   // silent seed: ['custom_text'=>…, 'custom_files'=>[…], 'custom_data'=>…]
    ?bool   $debugMode      = false,  // true → show raw payload/response logs
    ?array  $exitParamArr   = [],     // override the agent's exit params
    ?bool   $showCloseButton = true,
    ?bool   $needExitParam  = true,   // true → require an exit target + show Validate button
    bool    $showHideButton = false,
    ?bool   $clearSession   = true,   // false → resume the previous session
    string  $renderMode     = 'melis' // 'melis' (back office) | 'front' (front office)
)
```

Usage minimal :

```php
<?= $this->AIChatViewHelper('mainchatassistantgeneral') ?>
```

**Sessions par objet.** Ajoutez `"|".$objectId` à l'id d'instance pour que chaque objet (article, produit…) dispose de sa propre conversation :

```php
<?= $this->AIChatViewHelper('newscontentcreator|' . $newsId, null, $extraEntryParam, false, $exitParamArr) ?>
```

### ENTRY PARAMS — amorcer l'agent silencieusement

Passez `extraEntryParams` pour démarrer l'agent sans saisie utilisateur :

| Clé | Signification |
| --- | --- |
| `custom_text` | Instruction préfixée au prompt. |
| `custom_files` | Tableau de chemins de fichiers absolus ou d'URLs publiques passés comme vraies entrées du modèle. |
| `custom_data` | Chaîne opaque parcourant le scénario (ex. un identifiant) sans apparaître dans le prompt. |

### EXIT PARAMS — router la réponse

`EXIT_PARAMS` définit où va la réponse finale de l'IA. Passez `exitParamArr` pour surcharger champ par champ :

| Champ | Signification |
| --- | --- |
| `masse_exit_input_1` / `masse_exit_input_2` | Id(s) du ou des champs de saisie hôte que la réponse doit remplir. |
| `masse_exit_js_callback` | Fonction JS appelée avec la réponse (le plus flexible). |
| `masse_exit_url_route_callback` | Route vers laquelle POSTer le résultat (traitement côté serveur). |

## Exemple

```php
// NewsController — compute entry seed + exit routing, pass to view
$exitParamArr = [
    'masse_exit_input_1'     => $paragraphField,
    'masse_exit_js_callback' => "setParagraphContent($paragraphField)",
];
$extraEntryParam = [
    'custom_files' => $resolvedAbsolutePaths,  // article images as real model inputs
    'custom_text'  => 'Generate content for paragraph N of the news',
];
$view->maiInstanceId    = 'newscontentcreator|' . $newsId;
$view->extraEntryParam  = $extraEntryParam;
$view->exitParamArr     = $exitParamArr;
```

```php
<!-- render-ai-chat.phtml -->
<?= $this->AIChatViewHelper($this->maiInstanceId, null, $this->extraEntryParam, false, $this->exitParamArr) ?>
```

Le moteur déclenche `masse_exit_js_callback` lorsque l'utilisateur accepte, déposant directement le texte généré dans le champ cible.

## Modèle d'extension (comment les modules applicatifs se branchent)

1. **dbdeploy** insère un **agent** (avec son scénario + liste d'outils autorisés) et une **instance** avec un `mai_instance_id` fixe.
2. Enregistrez un **serveur MCP** dans `config['mcp']['servers']` et déclarez ses outils dans `function_declarations` avec `mcp: true`.
3. Ajoutez une entrée d'interface qui ouvre `AIChatViewHelper(<mai_instance_id>, …)` avec les bons paramètres entrée/sortie.

## Contrôleurs

Route BO : `…/MelisAI/[:controller[/:action]]`

| Contrôleur | Actions principales |
| --- | --- |
| `Admin` | `render-tool`, `render-tool-usage`, `render-platform-ai`, `render-instances`, `render-chat-dev-tool`, `getChart()` |
| `Agent` + `AgentProperties` | `render-tool-scenario`, `render-run-scenario`, `render-config`, `render-ai-tools`, `saveProperties` |
| `Instance` | `saveInstance`, `deleteInstance`, `getList`, `render-instance-modal` |
| `Tool` | `saveAiTool`, `render-ai-tool-modal` |
| `GeneralChat` | `displayMainChatAssistant`, `headerMainChatAssistant` |
| `McpInspector` | Liste des serveurs MCP et leurs outils |
| `AIMenu` / `AITreeTools` | Rendus du menu gauche et de l'arbre |

## Tables de base de données

MelisAI ne possède pas de schéma propre — toutes les tables sont installées par `melis-ai-engine`. Le préfixe des tables est `melis_ai_*` (et non `melis_ai_engine_*`).

| Table | Contenu |
| --- | --- |
| `melis_ai_models` (`mam_*`) | Lignes de modèles fournisseurs (entreprise, chaîne du modèle, lien clé API, paramètres upload). |
| `melis_ai_companies` (`macp_*`) | Définitions des entreprises (Google, Anthropic, …). |
| `melis_ai_platform_keys` (`mapk_*`) | Clés API fournisseurs. |
| `melis_ai_agents` (`maa_*`) | Définitions des agents (code, surcharge modèle, liste JSON `maa_agent_tools`). |
| `melis_ai_agents_tools` (`maat_*`) | Jointure agent-outil. |
| `melis_ai_tools` (`mat_*`) | Catalogue d'outils (MCP / Local). |
| `melis_ai_instances` (`mai_*`) | Déploiements nommés (`mai_instance_id` stable). |
| `melis_ai_instance_trans` (`mait_*`) | Libellés d'instance par langue. |
| `melis_ai_scenario_steps` (`mas_*`) | Étapes de scénario ordonnées par agent. |
| `melis_ai_scenario_steps_datas` (`massd_*`) | Données d'étape (texte de contexte, chemin de formulaire, …). |
| `melis_ai_scenario_steps_datas_entryexit` (`masse_*`) | Définitions des paramètres entrée/sortie par étape. |
| `melis_ai_return_types` (`mart_*`) | Définitions des types de retour à la sortie. |
| `melis_ai_files` (`maf_*`) | Fichiers attachés aux étapes de scénario. |
| `melis_ai_daily_usage` (`mau_*`) | Compteurs d'usage tokens et requêtes. |
| `melis_ai_conversation_state` (`macs_*`) | État de conversation par utilisateur. |

Voir aussi : [melis-ai-engine](/fr/legacy/reference/modules/melis-ai-engine) · [melis-ai-engine-claude](/fr/legacy/reference/modules/melis-ai-engine-claude) · [melis-ai-engine-gemini](/fr/legacy/reference/modules/melis-ai-engine-gemini) · [melis-ai-tool-creator](/fr/legacy/reference/modules/melis-ai-tool-creator) · [melis-ai-community-extensions](/fr/legacy/reference/modules/melis-ai-community-extensions)
