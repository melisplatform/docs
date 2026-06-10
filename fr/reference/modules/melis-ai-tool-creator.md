# MelisAIToolCreator

> Outil de back-office assisté par IA qui crée et modifie des modules Melis entiers via un agent
> conversationnel. Paquet `melisplatform/melis-ai-tool-creator`.

## Présentation

`MelisAIToolCreator` ajoute une entrée **AI Tool Creator** dans le menu back-office Melis AI. Il
embarque un agent IA dédié (*Tool Builder*) et un serveur MCP ; l'agent génère des modules Laminas
complets sous `module/AIModules/` en appelant des outils de génération de code via JSON-RPC. C'est
l'exemple de référence du **pattern app-extension** de MelisAI : il enregistre l'instance
`aitoolcreator`, le serveur MCP, et ouvre l'assistant de chat du moteur.

## Activation

Ajoutez à `config/melis.module.load.php` :

```php
return [
    'MelisAIToolCreator',
];
```

Nécessite `melisplatform/melis-ai` `^5.3` (qui entraîne `melis-ai-engine`). Le module est compatible
`dbdeploy` : ses deltas d'installation insèrent l'agent *Tool Builder* et l'instance `aitoolcreator`
dans les tables `melis_ai_agents` / `melis_ai_instances` du moteur.

## Services principaux

| Alias de service | Rôle |
| --- | --- |
| `MelisAIToolCreatorService` | `getToolConfig()` ; émet les événements `melisaitoolcreator_service_get_tool_config_start/_end`. Le vrai travail est réalisé par l'agent IA + le serveur MCP. |

## Back-office

L'outil est déclaré dans `config/app.toolstree.php` (icône `fa-magic`) et routé par
`config/module.config.php` (`/MelisAIToolCreator/[:controller[/:action]]`). Le contrôleur
`MelisAIToolCreator\Controller\IndexController` expose :

| Action | Rôle |
| --- | --- |
| `renderTool` / `renderToolHeader` / `renderToolContent` | Affiche la coquille de l'outil, l'en-tête et le panneau de lancement (sélecteur de mode + liste déroulante des modules). |
| `launchAgentAction` | POST vers `/melis/MelisAIToolCreator/Index/launchAgent` ; ouvre le chat du moteur pour l'instance `aitoolcreator` via `AIChatViewHelper`. |

La liste déroulante des modules pour `edit_existing` est alimentée par un scan de `module/AIModules/`
avec `glob(... GLOB_ONLYDIR)`.

### Modes de lancement

| Libellé (bouton UI) | `mode` | Comportement |
| --- | --- | --- |
| New tool | `new` | L'agent appelle d'abord `createModule`, puis `updateFiles` sur les deux fichiers de langue en utilisant les clés SCAN RESULTS. |
| Continue my last session | `continue_session` | `clearSession=false` — reprend l'état de la conversation précédente pour l'instance `aitoolcreator`. |
| Edit existing tool | `edit_existing` | Présélectionne le module choisi ; l'agent ne peut toucher que les fichiers à l'intérieur du chemin de ce module, doit appeler `readFile` avant `updateFiles`, et ne doit pas appeler `createModule`. |

## L'agent Tool Builder et le serveur MCP

`config/mcp.tools.php` déclare le serveur MCP :

```php
$config['mcp']['servers']['tool_creator'] = [
    'enabled'        => true,
    'module'         => 'melis-ai-tool-creator',
    'args'           => '.../mcp/toolcreator/bin/server.php',
    'timeout'        => 600,
    'retry_attempts' => 1,
];
```

Le timeout élevé (600 s) reflète que la génération de module peut prendre plusieurs minutes.

Les outils sont enregistrés dans
`config['plugins']['melisaiengine']['datas']['function_declarations']` avec `mcp: true` ; le moteur
achemine les appels vers ce serveur. Ils apparaissent dans le groupe **module-builder** de la liste
d'outils autorisés de l'agent.

### Outils du module-builder (serveur MCP `tool_creator`)

| Outil | Rôle |
| --- | --- |
| `createModule` | Génère un module Laminas complet sous `module/AIModules/`. Paramètres : `moduleName`, `functionality`, `needDBTable`, `databaseTableStructure{tableName, fields[{name,type,primary}]}`. Retourne les **SCAN RESULTS** (clés de config + de vues générées). |
| `updateFiles` | Écrit ou modifie des fichiers à l'intérieur du module (outil d'édition principal de l'agent). |
| `activateModule` | Active le module et vide les caches. Après activation, l'agent demande à l'utilisateur de recharger la page. |
| `deactivateModule` | Désactive le module et vide les caches. |
| `generateBundle` | Reconstruit les bundles CSS/JS après modification de `public/`. |

L'agent a également accès aux outils partagés **filesystem** du moteur (`createFile`,
`createDirectory`, `pathExists`, `readFile`, `deleteFile`, `deleteDirectory`) et aux outils
**schéma-BD** (`getTableStructure`, `createDatabaseTable`, `addDBTableColumns`, …) — voir
[MelisAI §A5.3](/fr/reference/modules/melis-ai).

::: warning Note de sécurité
Les outils d'écriture de fichiers sont contraints à `module/AIModules/` et les prompts de l'agent
interdisent de toucher des chemins hors du module choisi. Les modules générés sont du vrai PHP qui
sera activé — **relisez-les avant la mise en production**, et traitez `activateModule` comme une
action privilégiée. L'agent énonce une courte phrase avant chaque appel d'outil, ce qui rend la
construction auditable dans le transcript du chat.
:::

## Tables de base de données

Ce module ne possède **aucune table `melis_*`**. Ses deltas dbdeploy écrivent dans les tables
`melis_ai_instances` et `melis_ai_agents` du moteur. Les tables des modules générés par l'agent sont
créées à l'exécution par l'outil `createDatabaseTable`.

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Contrôleur | `vendor/melisplatform/melis-ai-tool-creator/src/Controller/IndexController.php` |
| Service | `vendor/melisplatform/melis-ai-tool-creator/src/Service/MelisAIToolCreatorService.php` |
| Enregistrement MCP | `vendor/melisplatform/melis-ai-tool-creator/config/mcp.tools.php` |
| Point d'entrée du serveur MCP | `vendor/melisplatform/melis-ai-tool-creator/mcp/toolcreator/bin/server.php` |
| Arbre d'outils / assets | `vendor/melisplatform/melis-ai-tool-creator/config/app.toolstree.php`, `config/app.interface.php` |
| Config des routes | `vendor/melisplatform/melis-ai-tool-creator/config/module.config.php` |

## Voir aussi

- [MelisAI](/fr/reference/modules/melis-ai) — gérer les instances, agents, outils, modèles et clés.
- [MelisAIEngine](/fr/reference/modules/melis-ai-engine) — le contrat, les tables partagées, le pont MCP/outils.
- [MelisAIEngineClaude](/fr/reference/modules/melis-ai-engine-claude) · [MelisAIEngineGemini](/fr/reference/modules/melis-ai-engine-gemini) — implémentations des fournisseurs.
- [MelisAICommunityExtensions](/fr/reference/modules/melis-ai-community-extensions) — un autre exemple de pattern app-extension.
