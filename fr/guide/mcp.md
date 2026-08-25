# MCP (Model Context Protocol)

Melis intègre le **[Model Context Protocol](https://modelcontextprotocol.io/)** pour que les
[agents](/fr/guide/ai) IA puissent appeler des **outils** — lire/écrire des fichiers, faire des
opérations base de données, scaffolder des modules — pendant une exécution. Melis est aussi un
**serveur** MCP : ces mêmes outils peuvent être exposés en HTTP à des clients MCP externes. Cette
page explique le fonctionnement, comment ajouter votre propre outil MCP et comment l'exposer.

::: info Même moteur, nouveau back-office
Melis v6 a conservé le moteur IA et ses modules à l'identique ; il a remplacé le back-office par une
**UI React à `/melis-react`**. Tout ce que décrit cette page sur le fonctionnement de MCP — le
client, la config `mcp.tools.php`, le lancement des serveurs via stdio, la sécurité — est identique à
la v5. Seuls les emplacements *où vous cliquez* ont migré vers les nouveaux outils React (**Melis AI
→ Admin → MCP Server**, la liste d'autorisation **AI Tools** de l'agent et le **MCP Inspector**). Ces
points sont signalés ci-dessous.
:::

::: info Client *et* serveur
Melis agit comme **client MCP** : il lance des **serveurs** MCP locaux (processus PHP, transport
stdio) et invoque leurs outils quand un modèle le demande.

Melis peut désormais agir aussi comme **serveur MCP** — les mêmes outils sont exposables en
**Streamable HTTP** à des clients MCP externes (Claude Desktop, le MCP Inspector, vos propres
intégrations). Rien n'est joignable tant que vous ne l'avez pas explicitement exposé : voir
**Exposer les outils à des clients externes** ci-dessous.
:::

## Serveurs MCP intégrés

Par défaut, la plateforme fournit **six** serveurs MCP, répartis sur trois modules (déclarés dans
`melis-ai-engine/config/app.interface.php` et les `mcp.tools.php` des modules) :

| Serveur (clé de config) | Répertoire | Module | Outils |
| --- | --- | --- | --- |
| `file_operations` | `mcp/filemcp` | `melis-ai` | `createFile`, `createDirectory`, `pathExists`, `readFile`, `updateFiles`, `deleteFile`, `deleteDirectory` |
| `database_operations` | `mcp/dbmcp` | `melis-ai` | `get_table_structure`, `create_database_table`, `add_db_table_columns`, `update_db_table_columns`, `drop_db_table_columns`, `drop_database_table`, `selectData`, `insertData`, `updateData`, `deleteData`, `bulkInsertData` |
| `module_documents` | `mcp/documentationmcp` | `melis-ai` | `getDocModuleList`, `getModuleDoc`, `getModuleDocImage` |
| `navigation_operations` | `mcp/navigationmcp` | `melis-ai` | `listBackOfficeTools`, `openBackOfficeTool`, `listCmsPages`, `resolveHomepage`, `openCmsPage`, `navStep` |
| `tool_creator` | `mcp/toolcreator` | `melis-ai-tool-creator` | `createModule`, `activateModule`, `deactivateModule`, `generateBundle` |
| `minitemplate_creator` | `mcp/minitemplatecreator` | `melis-ai-community-extensions` | `readSiteAssets`, `getSitePublicUrl`, `uploadMinitemplateImages`, `renderMinitemplatePreview` |

Chaque serveur propose **deux modes d'exécution** à partir des mêmes implémentations d'outils :

- **stdio** — `bin/server.php`, p. ex. `vendor/melisplatform/melis-ai/mcp/dbmcp/bin/server.php`.
  C'est ce que le moteur lance pour les exécutions d'agents dans la plateforme, et ce à quoi un
  client desktop local peut se connecter. Non joignable par le réseau.
- **HTTP** — `public/index.php`, servi par `bin/serve.php` (un wrapper `php -S`). C'est le mode
  exposable, et le seul qui applique la liste d'autorisation ci-dessous.

::: tip Les serveurs vivent dans plusieurs modules
Ils ne sont pas tous sous `melis-ai`. Pour inventorier ce qu'une installation contient réellement :
```bash
ls -d vendor/melisplatform/melis-ai*/mcp/*/
```
`navigationmcp` est un cas particulier — il n'a pas de `vendor/` propre et emprunte l'autoloader de
`dbmcp`.
:::
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

## Exposer les outils à des clients externes (mode serveur)

Lancer un serveur en **mode HTTP** rend ses outils appelables par n'importe quel client MCP capable
de l'atteindre — l'exposition est donc volontairement verrouillée à plusieurs niveaux. Le guide
opérationnel complet (Docker en local, puis Kubernetes) est livré avec le paquet sous
`vendor/melisplatform/melis-ai/mcp/MCP-EXPOSURE-GUIDE.md` ; ce qui suit en est le résumé.

### La liste d'autorisation d'exposition

Le `public/index.php` de chaque serveur lit la table **`melis_ai_mcp_exposed_tools`** au démarrage
et n'enregistre *que* les outils qui y figurent :

```php
$names        = $pdo->query('SELECT met_tool_name FROM melis_ai_mcp_exposed_tools')
                    ->fetchAll(PDO::FETCH_COLUMN);
$exposedNames = array_flip($names);

foreach ($allTools as $toolName => $callable) {
    if (isset($exposedNames[$toolName])) {
        $builder->addTool($callable);
    }
}
```

Une **table vide — ou une base injoignable — n'expose rien**. C'est le garde-fou principal : des
outils destructifs comme `deleteData` ou `drop_database_table` restent simplement hors de la table.
Les valeurs doivent correspondre aux clés camelCase de `$allTools` dans le `public/index.php` de
chaque serveur.

Gérez la liste depuis le back-office React sous **Melis AI → Admin → MCP Server → MCP Exposition** —
une checklist de toutes les fonctions déclarées ; cocher un outil insère sa ligne, décocher la
supprime. Le tout s'appuie sur `MelisReactApiAiMcpServerController`
(`GET /melis/react-api/ai-mcp-server/data`, `POST …/save-tools`) et le modèle
`MelisAIMcpExposedToolTable`.

::: warning Vérifiez le point d'entrée avant d'exposer
Un `public/index.php` livré n'est pas automatiquement sûr. Certains serveurs embarquent une simple
chaîne `Server::builder()->addTool(…)->build()` qui enregistre **tous** les outils sans filtrage en
base. Ouvrez le fichier et confirmez la présence de la boucle `$allTools` + PDO ci-dessus avant de
le mettre sur un réseau.
:::

### Lancer un serveur en HTTP

`bin/serve.php` démarre le serveur web intégré de PHP sur `public/`, en lisant `MCP_HOST` et
`MCP_PORT` :

```bash
MCP_HOST=0.0.0.0 MCP_PORT=6276 php vendor/melisplatform/melis-ai/mcp/dbmcp/bin/serve.php
```

Dans une stack Docker, chaque serveur tourne comme un programme **supervisord** de longue durée.
La répartition de ports de référence (interne uniquement — à l'extérieur tout est en 443) :

| Port | Serveur |
| --- | --- |
| 6274 | UI MCP Inspector |
| 6275 | `filemcp` |
| 6276 | `dbmcp` |
| 6277 | Proxy MCP Inspector |
| 6278 | `documentationmcp` |
| 6279 | `navigationmcp` |
| 6280 | `toolcreator` |
| 6281 | `minitemplatecreator` |

Le point d'entrée HTTP a besoin de `nyholm/psr7`, `nyholm/psr7-server` et
`laminas/laminas-httphandlerrunner`. Les serveurs sous `melis-ai/mcp/*` les embarquent déjà ; ceux
des autres modules doivent généralement les ajouter.

### Vérifier

Chaque serveur répond `ok` à `GET /healthz`, mais **healthz seul ne prouve rien** — il répond avant
le bootstrap PSR-7, donc un serveur dont l'autoloader Composer est périmé passe healthz et plante
à la première vraie requête. Envoyez toujours aussi un vrai handshake :

```bash
curl -s -X POST http://127.0.0.1:6276/ \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"curl","version":"1.0"}}}'
```

Un `"result"` JSON-RPC dans la réponse signifie que le serveur fonctionne vraiment.

### Publier à distance

Sous Kubernetes, les serveurs sont derrière l'ingress nginx avec TLS sur 443 et une liste blanche
d'IP (`whitelist-source-range`), de sorte que les ports `627x` ne sont jamais joignables
directement. Deux stratégies de routage sont possibles : un hostname par serveur
(`https://dbmcp.<domaine>/`), ou — recommandé quand on en expose plusieurs — un hôte unique avec
routage par chemin (`https://mcp.<domaine>/dbmcp`), où `use-regex` + `rewrite-target` retirent le
préfixe pour que chaque backend voie toujours `/` et `/healthz`. Passer de l'une à l'autre plus
tard ne touche que l'ingress.

::: danger `composer update` écrase les modifications dans vendor
Ces points d'entrée vivent sous `vendor/`. Un `composer update melisplatform/melis-ai` (ou les
autres modules porteurs de MCP) réextrait le paquet et peut ramener un `public/index.php` filtré en
base à un mode « tout exposer ». Revérifiez après chaque mise à jour, et faites remonter les
changements durables en amont dans les dépôts des paquets plutôt que dans `vendor/`.
:::

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

En **mode serveur**, les couches s'empilent : un outil doit être présent dans
`melis_ai_mcp_exposed_tools` pour être seulement enregistré, l'ingress restreint les appelants par
IP source en TLS, et le sandbox fichiers/DB s'applique toujours à ce qui s'exécute. Exposez
l'ensemble utile le plus réduit — les outils en lecture seule d'abord — et gardez les outils
destructifs hors de la liste.

## Fichiers clés

| Sujet | Chemin |
| --- | --- |
| Service client MCP | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineMcpService.php` |
| Trait gestion d'outils | `vendor/melisplatform/melis-ai-engine/src/Service/Traits/Mcp/McpToolManagementTrait.php` |
| Config des serveurs | `vendor/melisplatform/melis-ai-engine/config/app.interface.php` |
| Exemple `mcp.tools.php` | `vendor/melisplatform/melis-ai-tool-creator/config/mcp.tools.php` |
| Exemple de serveur (stdio) | `vendor/melisplatform/melis-ai/mcp/dbmcp/bin/server.php` |
| Exemple de serveur (HTTP) | `vendor/melisplatform/melis-ai/mcp/dbmcp/public/index.php` |
| Lanceur HTTP | `vendor/melisplatform/melis-ai/mcp/dbmcp/bin/serve.php` |
| Guide d'exposition | `vendor/melisplatform/melis-ai/mcp/MCP-EXPOSURE-GUIDE.md` |
| Modèle des outils exposés | `vendor/melisplatform/melis-ai/src/Model/Tables/MelisAIMcpExposedToolTable.php` |
| Onglet MCP Server (API React) | `vendor/melisplatform/melis-ai/src/Controller/React/MelisReactApiAiMcpServerController.php` |
| Inspector (classique) | `vendor/melisplatform/melis-ai/src/Controller/McpInspectorController.php` |
| Inspector (API React) | `vendor/melisplatform/melis-ai/src/Controller/React/MelisReactApiMcpInspectorController.php` |
