# MelisAI

> Back-office React de la suite MelisAI — connectez des fournisseurs, concevez des agents, déployez des instances, surveillez l'usage, inspectez les serveurs MCP et discutez depuis n'importe où. Paquet `melisplatform/melis-ai`.

## Présentation

MelisAI est la **couche de gestion back-office** de la suite MelisAI. Il n'exécute pas les modèles d'IA lui-même — c'est le rôle de `melis-ai-engine` et de ses modules fournisseurs. Il fournit l'interface et les services pour câbler l'ensemble du système IA : connecter un fournisseur (**Platform AI**), construire des comportements (**AI Agents** avec scénarios et listes d'outils autorisés), les déployer sous forme d'**Instances** nommées, surveiller l'**Usage**, déboguer avec un chat brut (**Chat Dev Tool**), et inspecter les **serveurs MCP** connectés.

Dans le **back-office React** (`/melis-react`), MelisAI livre un **unique bundle multi-briques** exposant trois outils de menu natifs React — **Admin**, **AI Agents**, **MCP Inspector** — chacun doté d'une bascule **New / Old** vers son outil legacy dans une iframe, **plus une surcouche AI Assistant globale** (un bouton de chat flottant présent sur chaque écran, sans entrée de menu). La logique IA reste côté serveur dans `melis-ai-engine`.

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

`MelisAI` requiert `melisplatform/melis-ai-engine`, qui possède toutes les tables de base de données `melis_ai_*` ainsi que le runtime agent/scénario. Les modules fournisseurs (`melis-ai-engine-claude`, `melis-ai-engine-gemini`, `-ollama`, `-oci`) implémentent le contrat fournisseur et doivent être installés pour leurs entreprises respectives.

## Les quatre concepts fondamentaux

| Concept | Table | Colonne clé | Description |
| --- | --- | --- | --- |
| **model** | `melis_ai_models` (`mam_*`) | `mam_generative_model` | Une ligne de modèle fournisseur : entreprise (Anthropic / Google), chaîne du modèle, lien clé API, indicateur par défaut, paramètres d'upload de fichier. |
| **agent** | `melis_ai_agents` (`maa_*`) | `maa_agent_tools` (liste JSON autorisée) | Un comportement : nom, code agent, surcharge de modèle optionnelle, étapes de scénario ordonnées, liste d'outils autorisés. |
| **instance** | `melis_ai_instances` (`mai_*`) | `mai_instance_id` | Un déploiement nommé d'un agent. La chaîne `mai_instance_id` est la clé stable référencée par toute l'interface (ex. `mainchatassistantgeneral`, `aitoolcreator`). |
| **tool** | `melis_ai_tools` (`mat_*`) | — | Une fonction appelable que le modèle peut invoquer. Soit **MCP** (serveur MCP externe, `mcp: true`) soit **Local** (PHP intégré). |

**Modèle mental en une phrase :** une instance pointe vers un agent, un agent pointe vers un modèle, un modèle nomme une entreprise — ce qui sélectionne le fournisseur ; un chat sur l'instance exécute le scénario de l'agent, en appelant les outils autorisés de l'agent.

## Où cela se trouve dans le back-office React

MelisAI livre **un seul** bundle de briques (`public/ui-react/brick.js`) dont le manifeste déclare un tableau `bricks: [...]` — quatre enregistrements qui s'auto-enregistrent dans `brick.tsx` :

| ID de brique | Route | melisKey | Nature |
| --- | --- | --- | --- |
| `ai-admin` | `/melis-ai/admin` | `melisadmin_tool` | coquille à onglets React native (Usage / Platform AI / Instances / MCP Server / Chat dev tool) |
| `ai-agents` | `/melis-ai/ai-agents` | `melisagent_tool` | liste + éditeur React natifs (sous-onglets) |
| `mcp-inspector` | `/melis-ai/mcp-inspector` | `melis_mcp_inspector_tool` | React natif (fonction unique) |
| `ai-assistant` | *(aucune)* | — | **Surcouche** — le FAB de chat flottant global, sans route ni entrée de menu |

Les trois outils routés apparaissent dans le menu de gauche sous **Melis AI** (aux côtés de **AI Tool Creator**, apporté par le module distinct `melis-ai-tool-creator`). L'assistant est rendu une seule fois à la racine de la coquille pour que le chat flottant survive à la navigation. Tous n'apparaissent que lorsque MelisAI est actif (découverte des briques via `GET /melis/react-api/react-modules`). Chaque outil de menu porte une bascule **New / Old** : **New** = l'interface React, **Old** = l'outil classique dans une iframe.

![La section Melis AI dans la barre latérale React — Admin, AI Agents, MCP Inspector, AI Tool Creator](/screenshots/react/melis-ai/melisai-menu-section-melisai.png)

## Admin — configurer l'IA

Route `/melis-ai/admin`. Une coquille à onglets React native — **Usage · Platform AI · Instances · MCP Server · Chat dev tool** — avec un unique Save (enregistre l'onglet actif) et une bascule New/Old pour tout l'outil.

- **Usage** — filtrez par Entreprise/Modèle sur une plage ; quatre graphiques : Total Requêtes, Requêtes par instance, Total Tokens, Tokens par instance (les séries par instance sont vos instances déployées). Adossé à `melis_ai_daily_usage`.

![Admin → onglet Usage — filtres Entreprise/Modèle et quatre graphiques (requêtes & tokens, total et par instance) sur une plage sélectionnable](/screenshots/react/melis-ai/melisai-tool-admin-tab-usage.png)

- **Platform AI** — activez l'IA : choisissez Entreprise + Modèle, optez pour *Même clé pour toutes les plateformes* ou *Une clé par plateforme*, collez la ou les clés, définissez **Statut : Actif** + **Modèle par défaut : Oui**. Plus la **gestion des uploads** — bascules fichier utilisateur/contexte et **Mode d'upload : File API ou Embed in request** (le `mam_file_upload_mode` que lisent les fournisseurs ; Gemini utilise File API par défaut, Claude l'intégration dans la requête) et la taille max de fichier.

![Admin → onglet Platform AI — entreprise/modèle/clés à gauche, bascules Status + Default et gestion des uploads de fichiers (File API ou Embed in request, taille max) à droite](/screenshots/react/melis-ai/melisai-tool-admin-tab-platformai.png)

- **Instances** — cartes KPI (Total / Actives / Inactives), recherche, filtres et **+ New instance**. Six sont fournies par défaut : trois instances **système** (édition seule, non supprimables : `admintool`, `agenttool`, `mainchatassistantgeneral`) et trois instances **applicatives** (supprimables : `aitoolcreator`, `minitemplatecreator`, `newscontentcreator`). L'édition ouvre un formulaire en sous-onglet : **Name**, **Instance ID** (le `mai_instance_id`), **Status**, **Agent** (optionnel) et un **Label** par langue.

![Admin → onglet Instances — cartes KPI, recherche + filtres, et les six instances fournies (système + applicatives) avec leur Name ID et l'agent lié](/screenshots/react/melis-ai/melisai-tool-admin-tab-instances.png)

![Admin → Instances — formulaire d'édition : Name, Instance ID, Status, Agent, et traductions par langue](/screenshots/react/melis-ai/melisai-tool-admin-tab-instances-edit.png)

- **MCP Server** — deux sous-onglets : **MCP Exposition** (cochez les fonctions MCP que le serveur MCP expose aux clients) et un onglet **DB / tables sensibles** ; chacun a son propre Save.
- **Chat Dev Tool** — un chat de débogage : choisissez un agent, discutez, et lisez côte à côte le **raw AI PAYLOAD** exact (`tools` / `functionDeclarations`, contexte) et l'**AI RESPONSE** au format JSON.

![Admin → Chat Dev Tool — choisissez un agent, discutez à gauche, et lisez le payload IA brut (functionDeclarations, tools, contexte) à droite](/screenshots/react/melis-ai/melisai-tool-admin-tab-chatdevtool.png)

## AI Agents — concevoir le comportement

Route `/melis-ai/ai-agents`. La liste affiche **ID / Status / Name / Entries / Call number** (Entries = étapes de scénario, Call number = nombre d'appels IA cumulés) avec des cartes KPI, une recherche, des filtres et un Export. L'ouverture d'un agent ajoute un sous-onglet avec un éditeur à cinq onglets et un unique Save.

![Liste AI Agents — cartes KPI, recherche/filtres, et les agents fournis (Tool Builder, Mini-template Creator, News Content Creator, Main Chat Assistant) avec le nombre d'étapes et le nombre d'appels](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents.png)

| Onglet | Rôle |
| --- | --- |
| **Config** | Nom de l'agent, code agent (slug stable), description, **Override default AI model** (Entreprise + Modèle), bascules d'upload de fichier, interrupteur Actif. |
| **AI Tools** | La liste des capacités autorisées — cochez les outils que cet agent peut appeler, regroupés en **MCP tools** (servis par des serveurs MCP) et **Local tools** (PHP intégré). Le moteur propose exactement les outils cochés au modèle. |
| **DB Rights** | Cases à cocher par table **read / write / delete row / drop** regroupées par module, un interrupteur global **Allow table creation**, la gestion des tables sensibles, une recherche et Expand/Collapse all. |
| **Scenario** | Étapes typées ordonnées avec réordonnancement par glisser-déposer et édition/suppression par ligne : `ENTRY PARAMS` → `AI CONTEXT` (silencieux) → `AI CHAT` (visible) → `EXIT PARAMS`, plus des étapes `CODE` optionnelles. Chaque étape possède un **Code** que vous référencez avec `[CODE]` pour récupérer la réponse d'une étape précédente. L'édition d'une étape ouvre une fenêtre modale (Code, Return type, Type of entry, AI Prompt avec un éditeur General + des surcharges par langue). |
| **Run** | Un chat de test intégré contre l'agent (avec un *Custom step end prompt* optionnel), exécutant le même chat natif que l'assistant. |

![Éditeur d'agent → onglet Config — Status, nom/code/description de l'agent, surcharge de modèle (entreprise + modèle), et bascules d'upload de fichier](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-config.png)

![Éditeur d'agent → onglet AI Tools — une liste de MCP tools et Local tools ; l'en-tête indique combien du catalogue sont cochés](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-aitools.png)

![Éditeur d'agent → onglet DB Rights — cases read/write/delete/drop par table regroupées par module, la bascule globale « Allow table creation » et la gestion des tables sensibles](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-dbrights.png)

![Éditeur d'agent → onglet Scenario — étapes typées ordonnées (ENTRY PARAMS, AI CONTEXT, CODE, AI CHAT, EXIT PARAMS) avec réordonnancement par glisser-déposer et édition/suppression par ligne](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-scenario.png)

![Éditeur d'agent → fenêtre modale d'édition d'étape — Code, Return type, Type of entry, et l'AI Prompt avec les onglets General + par langue](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-scenario-editstep.png)

![Éditeur d'agent → onglet Run — un chat de test intégré avec une zone « Custom step end prompt » et Relaunch, exécutant l'agent en direct](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-run.png)

### Catalogue d'outils fournis

| Groupe | Outils |
| --- | --- |
| **MCP — schéma/données DB** | `getTableStructure`, `createDatabaseTable`, `addDBTableColumns`, `updateDBTableColumns`, `dropDBTableColumns`, `selectData`, `insertData`, `updateData`, `deleteData`, `bulkInsertData` |
| **MCP — système de fichiers** | `createFile`, `createDirectory`, `pathExists`, `readFile`, `updateFiles`, `deleteFile`, `deleteDirectory` |
| **MCP — site/mini-template** (CommunityExtensions) | `readSiteAssets`, `getSitePublicUrl`, `uploadMinitemplateImages`, `renderMinitemplatePreview` |
| **MCP — module builder** (ToolCreator) | `createModule`, `activateModule`, `deactivateModule`, `generateBundle` |
| **Local** | `activate_module` |

## MCP Inspector

Route `/melis-ai/mcp-inspector`. Une page React native (avec bascule New/Old) qui liste les **serveurs MCP** connectés et permet de les lancer / vérifier leur statut / lire les logs — afin de confirmer qu'un serveur est actif et que ses outils sont découvrables avant de les autoriser sur un agent. Adossé au `MelisAIEngineMcpService` du moteur.

## AI Assistant — discuter depuis n'importe où

Le bouton flottant **AI Assistant** (en bas à droite, sur chaque écran) ouvre un panneau de chat exécutant le **Main Chat Assistant** général (agent id `1`, instance `mainchatassistantgeneral`). Il peut piloter le back-office (ouvrir un outil, ouvrir une page) depuis la conversation, dispatché côté hôte via `window.melisReactActionMap`. Minimiser conserve la session, New session en démarre une nouvelle, Close la termine.

![Le bouton flottant AI Assistant global (en bas à droite de la coquille) — une icône de robot marquée du logo dégradé « M » de MelisAi](/screenshots/react/melis-ai/melisai-footer-icon-generalassistant.png)

![Le panneau AI Assistant déployé — le « Main Chat Assistant » général exécutant l'instance `mainchatassistantgeneral`, avec Minimise / New session / Close dans l'en-tête](/screenshots/react/melis-ai/melisai-footer-icon-generalassistant-deployed.png)

## API React — endpoints

Il n'y a **pas de `config/react-api.php`** : les routes react-api sont déclarées **en ligne dans `config/module.config.php`**, greffées sur la route parente `melis-react-api` (préfixe `/melis/react-api`). Les contrôleurs résident dans `src/Controller/React/MelisReactApiAi*Controller.php`. Contrat partout : `{ success, data }` en cas de succès, `{ success:false, error }` en cas d'échec ; chaque fetch envoie `X-Requested-With: XMLHttpRequest` + credentials.

Chaque contrôleur implémente sa propre garde d'accès (pas le trait générique) :

```php
private const MELIS_KEY = 'melisadmin_tool'; // or melisagent_tool / melis_mcp_inspector_tool
if ($deny = $this->denyUnlessAccess()) { return $deny; }
//   → 401 if !isAuthenticated() ; else 403 unless MelisCoreRights::canAccess(self::MELIS_KEY)
```

| Surface (garde) | Endpoints représentatifs (`/melis/react-api/…`) |
| --- | --- |
| **Admin** (`melisadmin_tool`) | `ai-usage/bootstrap` · `ai-usage/charts` · `ai-platform/data` · `ai-instances/{bootstrap,stats,list,save,:id,delete/:id}` · `ai-mcp-server/{data,save-tools,save-sensitive}` · `ai-chat-dev/{agents,run,continue}` |
| **AI Agents** (`melisagent_tool`) | `agents` (liste) · `agents/{stats,options,:id,save,delete/:id,db-rights/:id}` · `agents/scenario/{list,options,step/:id,…}` |
| **MCP Inspector** (`melis_mcp_inspector_tool`) | `mcp-inspector/{servers,launch,status,log}` |

Les **écritures** de scénario réutilisent les endpoints legacy `/melis/MelisAI/AgentProperties/*` (delete / reorder / save) afin que toute la validation, la gestion des fichiers et l'unicité des codes restent côté serveur. Exemple (depuis `agent-api.ts`) :

```ts
const BASE = '/melis/react-api/agents'
await apiFetch<{ id: number }>(`${BASE}/save`, {
  method: 'POST',
  headers: { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json' },
  credentials: 'same-origin',
  body: JSON.stringify({
    id: 4, name: 'Tool Builder', code: 'aitoolcreator', modelId: null, status: 1,
    dbCanCreateTable: 1, tools: ['createModule', 'activateModule'],
    dbRights: { melis_cms_page: { read: true, write: false, delete_row: false, drop: false } },
  }),
})
```

## Capacités (droits avancés)

Déclarées dans `config/react.capabilities.php` sous `melisReactToolCapabilities`, indexées par le `melisKey` porteur de droits de chaque outil. **Autorisation par défaut, purement déclaratives** : elles pilotent les cases à cocher dans **Users → Rights** et conditionnent l'affichage des onglets/actions React (`useCaps(melisKey).can(cap)`) ; elles ne sont **pas** appliquées côté serveur (les contrôleurs ne filtrent que sur l'accès à l'outil via `canAccess`).

- `melisadmin_tool` — granularité par **onglet** (`usage`, `platform_ai.edit`, `instances` + `create/edit/delete`, `chat_dev`, `mcp_server` avec `tools.edit` / `db.edit` imbriqués).
- `melisagent_tool` — CRUD au niveau de l'outil (`list/create/edit/delete`) plus les onglets de l'éditeur (`general`, `tools`, `dbrights`, `scenario` + CRUD, `run`).
- `melis_mcp_inspector_tool` — ne déclare rien ; l'accès se résume à l'unique case d'accès à l'outil du menu.

## La dépendance à l'interface de chat

Chaque surface de chat (la surcouche assistant, l'onglet **Run** de l'agent, le **Chat Dev Tool** de l'Admin) rend `<AiChatContainer>` importé depuis **`@melis-ai-engine`** — un alias Vite vers `../../melis-ai-engine/ui-react/src`, si bien que le composant de chat est **bundlé depuis les sources de melis-ai-engine** dans cette brique (et non externalisé). Props clés : `maiInstanceId`, `agentId`, `autoRun`, `showHeader`, `clearSession`, `extraEntryParams`.

Pour les développeurs qui intègrent un chatbox dans une vue **legacy / rendue côté serveur**, `melis-ai-engine` fournit toujours le view helper `AIChatViewHelper($maiInstanceId, …)` — voir la [page MelisAI legacy](/fr/legacy/reference/modules/melis-ai) et [melis-ai-engine](/fr/legacy/reference/modules/melis-ai-engine).

## Flux de chat (ce qui se passe à l'envoi)

1. Une surface de chat poste les tours utilisateur au moteur pour le `mai_instance_id` donné.
2. `MelisAIEngineAgentService::runAgent()` résout **instance → agent → modèle**, puis sélectionne le fournisseur via `getActiveModelClass($company, $modelId, $agentId)` (entreprise `Google` → Gemini, `Anthropic` → Claude).
3. Le moteur parcourt les **étapes de scénario** de l'agent dans l'ordre ; `MelisAIEngineModelService::send()` appelle l'API IA ; les appels d'outils sont routés via `MelisAIEngineMcpService` (JSON-RPC pour les outils MCP, appel PHP direct pour les outils Local).
4. L'état persiste dans `melis_ai_conversation_state` ; les compteurs de tokens/appels dans `melis_ai_daily_usage`.

**MelisAI n'appelle jamais les APIs IA lui-même — le moteur et les modules fournisseurs s'en chargent.**

## Modèle d'extension (comment les modules applicatifs se branchent)

1. **dbdeploy** insère un **agent** (avec son scénario + liste d'outils autorisés) et une **instance** avec un `mai_instance_id` fixe.
2. Enregistrez un **serveur MCP** dans `config['mcp']['servers']` et déclarez ses outils dans `function_declarations` avec `mcp: true`.
3. Ajoutez une entrée d'interface qui ouvre un chat sur `<mai_instance_id>` avec les bons paramètres entrée/sortie.

## Tables de base de données

MelisAI ne possède pas de schéma propre — toutes les tables sont installées par `melis-ai-engine`. Le préfixe est `melis_ai_*`.

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
