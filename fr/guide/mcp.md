# MCP (Model Context Protocol)

Melis intègre le **[Model Context Protocol](https://modelcontextprotocol.io/)** pour que les
[agents](/fr/guide/ai) IA puissent appeler des **outils** — lire/écrire des fichiers, faire des
opérations base de données, scaffolder des modules — pendant une exécution. Cette page explique le
fonctionnement et comment ajouter votre propre outil MCP.

::: info Même moteur, nouveau back-office
Melis v6 a conservé le moteur IA et ses modules à l'identique ; il a remplacé le back-office par une
**UI React à `/melis-react`**. Tout ce que décrit cette page sur le fonctionnement de MCP — le
client, la config `mcp.tools.php`, le lancement des serveurs via stdio, la sécurité — est identique à
la v5. Seuls les emplacements *où vous cliquez* ont migré vers les nouveaux outils React (**Melis AI
→ Admin → MCP Server**, la liste d'autorisation **AI Tools** de l'agent et le **MCP Inspector**). Ces
points sont signalés ci-dessous.
:::

::: info Client, pas serveur (aujourd'hui)
Melis agit comme **client MCP** : il lance des **serveurs** MCP locaux (processus PHP, transport
stdio) et invoque leurs outils quand un modèle le demande. Exposer les outils de Melis *à des
clients MCP externes* (mode serveur) **n'est pas** encore implémenté, et le transport est stdio
uniquement. La fonctionnalité est utilisée en production en interne mais évolue activement — lisez
le code pour l'état courant.
:::

## Serveurs MCP intégrés

Par défaut, le moteur fournit quatre serveurs MCP (déclarés dans
`melis-ai-engine/config/app.interface.php` et les `mcp.tools.php` des modules) :

| Serveur | Module | Outils (exemples) |
| --- | --- | --- |
| `file_operations` | `melis-ai` | `readFile`, `createFile`, `updateFiles`, `createDirectory`, `deleteFile`… |
| `database_operations` | `melis-ai` | `getTableStructure`, `createDatabaseTable`, `selectData`, `insertData`, `updateData`… |
| `tool_creator` | `melis-ai-tool-creator` | `createModule`, `activateModule`, `deactivateModule` |
| `minitemplate_creator` | `melis-ai-community-extensions` | `readSiteAssets`, `getSitePublicUrl`, `renderMinitemplatePreview`… |

Chacun tourne comme un exécutable autonome, p. ex.
`vendor/melisplatform/melis-ai/mcp/dbmcp/bin/server.php`.

## Le flux d'un appel d'outil

Quand un modèle (Claude/Gemini) demande à appeler une fonction pendant l'exécution d'un agent :

1. Le service provider demande au service MCP si c'est un outil MCP —
   `MelisAIEngineMcpService::isMcpTool($name)` (outils marqués `'mcp' => true`, ou connus d'un serveur).
2. Si oui, `invokeTool($name, $args)` trouve le bon serveur, (ré)utilise son processus, et envoie une
   requête JSON-RPC `tools/call` via stdio.
3. Le serveur exécute l'outil et renvoie le résultat, réinjecté dans le modèle.

Le client MCP vit dans `melis-ai-engine/src/Service/MelisAIEngineMcpService.php` (composé de traits
pour la communication, la gestion des serveurs, la gestion des outils, la découverte de schémas, le
circuit-breaking et le logging).

## La config `mcp.tools.php`

Un module expose des outils MCP en fournissant un `config/mcp.tools.php` qui déclare **(a)** les
schémas d'outils pour le moteur IA et **(b)** le serveur qui les traite. Exemple (abrégé, depuis
`melis-ai-tool-creator/config/mcp.tools.php`) :

```php
return [
    'plugins' => ['melisaiengine' => ['datas' => [
        'function_declarations' => [
            [
                'name' => 'createModule',
                'description' => 'Create a Laminas module with all components.',
                'mcp' => true,                  // routé vers un serveur MCP
                'input_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'moduleName'    => ['type' => 'string'],
                        'functionality' => ['type' => 'string'],
                        'needDBTable'   => ['type' => 'boolean'],
                    ],
                    'required' => ['moduleName', 'functionality', 'needDBTable'],
                ],
            ],
        ],
    ]]],
    'mcp' => ['servers' => [
        'tool_creator' => [
            'enabled'  => true,
            'module'   => 'melis-ai-tool-creator',
            'args'     => [__DIR__ . '/../mcp/toolcreator/bin/server.php'],
            'timeout'  => 600,
            'tools'    => ['createModule', 'activateModule', 'deactivateModule'],
        ],
    ]],
];
```

## Ajouter votre propre outil MCP

### 1. Écrire le serveur

`vendor/.../votre-module/mcp/votreserveur/bin/server.php` :

```php
#!/usr/bin/env php
<?php
require_once __DIR__ . '/../vendor/autoload.php';

use Mcp\Server;
use Mcp\Server\Transport\StdioTransport;
use VotreNs\VosOperations;

$server = Server::builder()
    ->setServerInfo('votre-mcp', '1.0.0')
    ->addTool([VosOperations::class, 'faireQuelqueChose'])
    ->build();

$server->run(new StdioTransport());
```

### 2. Implémenter les opérations

```php
namespace VotreNs;

use Mcp\Capability\Attribute\McpTool;

class VosOperations
{
    #[McpTool(name: 'faireQuelqueChose', description: 'Ce que fait cet outil')]
    public function faireQuelqueChose(string $param1): array
    {
        return ['success' => true, 'result' => /* … */];
    }
}
```

### 3. Le déclarer & charger la config

Ajoutez un `config/mcp.tools.php` (comme ci-dessus) déclarant les `function_declarations` et
l'entrée `mcp.servers`, puis `include`z-le depuis le `Module::getConfig()` de votre module.

Le moteur gère pour vous le lancement du processus, le JSON-RPC sur stdio, les timeouts, les retries
et le circuit-breaking. Les modèles qui supportent l'appel d'outils peuvent alors invoquer votre
outil pendant l'exécution d'un agent.

## Autoriser un outil sur un agent (React)

Déclarer un outil le rend *disponible* ; un [agent](/fr/guide/ai) ne voit jamais que les outils que
vous cochez pour lui. Dans le back-office React, ouvrez **Melis AI → AI Agents**, ouvrez (ou créez)
un agent, et allez dans l'onglet **AI Tools** — une liste de cases à cocher répartie entre **MCP
tools** (servis par des serveurs MCP) et **Local tools** (PHP intégré). Cochez ceux que cet agent
peut appeler, et le moteur proposera exactement ceux-là au modèle à chaque exécution. Les outils MCP
base de données respectent également les droits lecture/écriture/suppression par table définis dans
l'onglet **DB Rights** de l'agent.

![Liste d'autorisation AI Tools de l'agent](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-aitools.png)
*Melis AI → AI Agents → un agent → AI Tools : les MCP tools (getTableStructure, createDatabaseTable, selectData, insertData…) et Local tools qu'un agent peut appeler.*

Vous configurez les fonctions que le serveur MCP intégré *expose* sous **Melis AI → Admin → MCP
Server** (le sous-onglet **MCP Exposition**) ; seuls les outils cochés sont rendus disponibles.
Consultez le [guide IA](/fr/guide/ai) pour le modèle complet agent/instance et la
[référence `melis-ai`](/fr/reference/modules/melis-ai) pour les outils et endpoints.

## Inspecter les serveurs MCP (MCP Inspector)

Le back-office React fournit un outil **MCP Inspector** sous **Melis AI → MCP Inspector** (route
`/melis-ai/mcp-inspector`). Il liste les serveurs MCP connectés et permet de **lancer / vérifier
l'état / lire les logs**, afin de confirmer qu'un serveur est actif et que les outils attendus sont
découvrables *avant* de les autoriser sur un agent. Comme tout outil React, il porte un bouton
**New / Old** (**New** = la page React ; **Old** = l'outil classique dans une iframe), qui lance l'UI
officielle MCP Inspector contre un serveur choisi via
`vendor/melisplatform/melis-ai/src/Controller/McpInspectorController.php`.

Les endpoints React de l'Inspector (`servers`, `launch`, `status`, `log`) vivent dans
`MelisReactApiMcpInspectorController` — voir la [référence `melis-ai`](/fr/reference/modules/melis-ai).

## Sécurité

Les opérations MCP fichiers/DB sont sandboxées via `allowed_paths` / `forbidden_paths` configurés
dans `melis-ai-engine/config/app.interface.php` (p. ex. `module`, `public`, `config`, `/tmp`
autorisés ; `/etc`, `/bin`, `/root`… interdits). Vérifiez-les avant d'activer des outils en écriture.
Au-delà du sandbox, la portée d'un agent est bornée par sa liste d'autorisation **AI Tools** et ses
**DB Rights** (ci-dessus), de sorte qu'un modèle ne peut toucher que ce que vous avez explicitement
accordé.

## Fichiers clés

| Sujet | Chemin |
| --- | --- |
| Service client MCP | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineMcpService.php` |
| Trait gestion d'outils | `vendor/melisplatform/melis-ai-engine/src/Service/Traits/Mcp/McpToolManagementTrait.php` |
| Config des serveurs | `vendor/melisplatform/melis-ai-engine/config/app.interface.php` |
| Exemple `mcp.tools.php` | `vendor/melisplatform/melis-ai-tool-creator/config/mcp.tools.php` |
| Exemple de serveur | `vendor/melisplatform/melis-ai/mcp/dbmcp/bin/server.php` |
| Inspector (classique) | `vendor/melisplatform/melis-ai/src/Controller/McpInspectorController.php` |
| Inspector (API React) | `vendor/melisplatform/melis-ai/src/Controller/React/MelisReactApiMcpInspectorController.php` |
