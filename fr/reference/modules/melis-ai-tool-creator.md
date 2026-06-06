# MelisAIToolCreator

> Outil de back-office assisté par IA qui crée et modifie des modules Melis via un agent
> conversationnel. Paquet `melisplatform/melis-ai-tool-creator`.

## Objectif

`MelisAIToolCreator` ajoute une entrée **AI Tool Creator** dans l'arbre des outils du back-office
Melis. Depuis un panneau de chat, il pilote un agent IA (le *Tool Builder*) qui génère un module
Laminas complet — config, contrôleur, modèle, vues, fichiers de langue, champs de formulaire, et
même une table de base de données — puis l'active. C'est le pendant IA de
[`melis-tool-creator`](/fr/reference/modules) ; le générateur graphique reste disponible pour un
scaffolding manuel (voir [Créer un outil](/fr/guide/create-a-tool)). L'agent dialogue avec la
plateforme via un serveur MCP dédié : ce module fait donc partie de la pile IA — voir
[IA](/fr/guide/ai) et [MCP](/fr/guide/mcp).

## Activation

Module Laminas standard. Ajoutez-le à `config/melis.module.load.php` :

```php
'MelisAIToolCreator',
```

Nécessite PHP `^8.1 | ^8.3` et `melisplatform/melis-ai` `^5.3` (qui entraîne
[`melis-ai-engine`](/fr/reference/modules)). Le module est compatible `dbdeploy` : ses deltas
d'installation insèrent l'agent IA *Tool Builder* (`mai_instance_id = aitoolcreator`) et
enregistrent la liste d'outils de l'agent. Il ne livre pas de site, seulement un outil de
back-office.

## Services clés

| Alias de service | Rôle |
| --- | --- |
| `MelisAIToolCreatorService` | Service léger émettant des évènements (`getToolConfig()`) ; le vrai travail est réalisé par l'agent IA + le serveur MCP, et non par ce service PHP. |

## Back-office

L'outil est déclaré dans `config/app.interface.php` sous la section des outils IA
(`melisai_tool_section`) et routé par `config/module.config.php`. Contrôleur
`MelisAIToolCreator\Controller\IndexController` :

| melisKey | Action | Rôle |
| --- | --- | --- |
| `melisaitoolcreator_tool` | `render-tool` | Coquille de l'outil. |
| `melisai_toolcreator_header` | `render-tool-header` | Zone d'en-tête. |
| `melisai_toolcreator_content` | `render-tool-content` | Panneau de lancement : choix du mode + liste des modules éditables lus depuis `module/AIModules`. |
| — | `launch-agent` | Point d'entrée POST qui démarre le chat IA (`AIChatViewHelper`) selon le mode choisi. |

Le panneau de lancement propose trois modes (voir `launchAgentAction`) :

- **`new`** — créer un module/outil de zéro.
- **`continue_session`** — reprendre la session de chat précédente (la session n'est pas effacée).
- **`edit_existing`** — charger un module depuis `module/AIModules` et restreindre l'agent à
  l'édition à l'intérieur du chemin de ce module uniquement.

Le chat est démarré sur l'instance IA `aitoolcreator` via
`/melis/MelisAIToolCreator/Index/launchAgent`.

## L'agent Tool Builder et le serveur MCP

L'agent (instance BD `aitoolcreator`, nom d'agent *Tool Builder*) reçoit une liste d'outils par le
delta d'installation `26051502_update_agent_tools.sql`. Ces outils se répartissent en deux groupes :

- **Génération de module (serveur MCP `tool_creator`)** — `config/mcp.tools.php` enregistre un
  serveur MCP en stdio (`mcp/toolcreator/bin/server.php`) exposant **`createModule`**,
  **`activateModule`**, **`deactivateModule`** (implémentés dans `ToolCreatorOperations`).
  `createModule` génère le module (éventuellement la variante multilingue à table `_texts`) ;
  `activateModule` l'ajoute à la liste de chargement et vide les caches, avec un contrôle de
  personnalisation qui rejette les ébauches non modifiées.
- **Assistants BD / fichiers (fournis par le moteur IA)** — `getTableStructure`,
  `createDatabaseTable`, `addDBTableColumns`, `selectData`, `insertData`, `updateData`,
  `deleteData`, `readFile`, `createFile`, `createDirectory`, `pathExists`, `updateFiles`, …
  utilisés par l'agent pour inspecter les données et écrire les fichiers.

Les modules générés sont écrits sous `module/AIModules/<ModuleName>/`.

Le serveur MCP peut être exécuté seul pour inspection :

```bash
npx @modelcontextprotocol/inspector \
  php vendor/melisplatform/melis-ai-tool-creator/mcp/toolcreator/bin/server.php
```

## Tables de base de données

Ce module n'ajoute **aucune table `melis_*` propre**. Ses deltas `dbdeploy` écrivent dans les tables
de `melis-ai-engine` — principalement `melis_ai_agents` (la ligne *Tool Builder* et sa liste
`maa_agent_tools`). Les tables des modules générés par l'agent sont créées à l'exécution par l'outil
`createDatabaseTable`, et non livrées ici.

## Fichiers clés

| Sujet | Chemin |
| --- | --- |
| Amorçage du module | `vendor/melisplatform/melis-ai-tool-creator/src/Module.php` |
| Contrôleur | `vendor/melisplatform/melis-ai-tool-creator/src/Controller/IndexController.php` |
| Service | `vendor/melisplatform/melis-ai-tool-creator/src/Service/MelisAIToolCreatorService.php` |
| Arbre d'outils / interface back-office | `vendor/melisplatform/melis-ai-tool-creator/config/app.interface.php`, `config/app.toolstree.php`, `config/app.tools.php` |
| Enregistrement MCP | `vendor/melisplatform/melis-ai-tool-creator/config/mcp.tools.php` |
| Serveur MCP + opérations | `vendor/melisplatform/melis-ai-tool-creator/mcp/toolcreator/bin/server.php`, `mcp/toolcreator/src/ToolCreatorOperations.php` |
| Deltas d'installation de l'agent | `vendor/melisplatform/melis-ai-tool-creator/install/dbdeploy/26051501_insert_tool_builder_agent.sql`, `26051502_update_agent_tools.sql` |
| Vues | `vendor/melisplatform/melis-ai-tool-creator/view/melis-ai-tool-creator/index/` |

## Voir aussi

- [Créer un outil](/fr/guide/create-a-tool) — le générateur d'outils graphique.
- [IA](/fr/guide/ai) et [MCP](/fr/guide/mcp) — le moteur IA et l'intégration MCP.
- [Référence des modules](/fr/reference/modules) — la carte complète des modules.
