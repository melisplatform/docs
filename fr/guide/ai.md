# IA : agents & moteur

Melis embarque un **moteur IA** qui permet de construire des **agents** — des workflows IA scriptés
en plusieurs étapes — et de les exposer partout dans le backoffice ou dans vos propres modules.
Différents providers (Anthropic Claude, Google Gemini, Ollama, OCI) se branchent derrière un moteur
unique.

Les modules concernés : `melis-ai` (outils backoffice React + l'Assistant IA global),
`melis-ai-engine` (le moteur et l'UI de chat partagée),
`melis-ai-engine-claude` / `melis-ai-engine-gemini` (providers), et
`melis-ai-community-extensions` (agents d'exemple prêts à l'emploi).

En v6, le framework et les modules sont inchangés ; ce qui change, c'est le **backoffice**,
désormais une UI React sur `/melis-react`. La logique IA reste côté serveur — React n'est que
présentation et appels d'API.

## Concepts clés

| Concept | Ce que c'est | Table |
| --- | --- | --- |
| **Company / provider** | Le fournisseur IA (Anthropic, Google…). | `melis_ai_companies` |
| **Model** | Un modèle concret d'une company (un modèle Claude ou Gemini). | `melis_ai_models` (`mam_generative_model`) |
| **Platform key** | La clé d'API utilisée pour appeler un provider. | `melis_ai_platform_keys` |
| **Agent** | Un workflow = une liste ordonnée d'**étapes de scénario**. | `melis_ai_agents`, `melis_ai_scenario_steps` |
| **Instance** | Une poignée nommée et réutilisable pour lancer un agent (sert d'id de session de chat). | `melis_ai_instances` (`mai_instance_id`) |
| **Daily usage** | Comptage des tokens/usage par modèle/agent/instance. | `melis_ai_daily_usage` |

Un **agent** est un *scénario* : une séquence d'étapes comme `ENTRY PARAMS`, `AI CONTEXT`,
`AI CHAT`, `CODE`, `EXIT PARAMS`. Le moteur parcourt les étapes, appelle le modèle au besoin, et
produit une réponse finale — qu'il peut réinjecter dans la page qui l'a lancé (via les *exit
parameters*).

## Providers

Le moteur choisit un provider d'après le nom de la **company** du modèle
(`MelisAIEngine\Service\MelisAIEngineService::getActiveModelClass()`) :

- company contenant **« Anthropic »** → `MelisAIEngineModelClaudeService` (module `melis-ai-engine-claude`)
- company contenant **« Google »** → `MelisAIEngineModelGeminiService` (module `melis-ai-engine-gemini`)
- ainsi que des modules providers **Ollama** (local) et **OCI** (OCI GenAI) suivant le même contrat

Chaque provider étend le `MelisAIEngineModelService` de `melis-ai-engine` et implémente le même
contrat (`setClient()`, formatage des payloads/messages, appels d'outils). Ajouter un nouveau
provider revient à ajouter un module avec son propre model service — sans toucher au moteur. Les
providers **n'ont pas d'UI propre** : en installer un injecte sa company + ses modèles dans le
catalogue, qui apparaissent alors comme choix dans l'admin MelisAI.

## Où ça se trouve dans le backoffice React

Dans `/melis-react`, MelisAI fournit **un bundle de bricks** exposant **trois outils natifs React**
dans la barre latérale gauche, sous la section **Melis AI** — **Admin**, **AI Agents**, **MCP
Inspector** — **plus une surcouche d'Assistant IA global**. Chaque outil du menu porte un bascule
**New / Old** : *New* correspond à l'UI React, *Old* ouvre l'outil classique dans une iframe.

![La section de menu Melis AI](/screenshots/react/melis-ai/melisai-menu-section-melisai.png)

Les outils n'apparaissent que lorsque MelisAI est actif. Une quatrième entrée — **AI Tool Creator** —
est contribuée par un autre module (`melis-ai-tool-creator`).

## Le configurer (Admin)

Ouvrez **Melis AI → Admin**. Un unique bascule **New/Old** s'applique à tout l'outil ; la vue React
est une coquille à onglets — **Usage · Platform AI · Instances · MCP Server · Chat dev tool** — avec
un seul **Save** pour l'onglet actif.

- **Platform AI** — choisissez une **Company + un Model**, collez la ou les **clés d'API**
  (`melis_ai_platform_keys`), et réglez la plateforme sur **Active** + **Default**. Un modèle doit
  avoir une clé pour être actif. Le panneau de droite gère les uploads de fichiers — dont le **mode
  d'upload : File API vs Embed in request** (Gemini utilise File API par défaut, Claude l'embed).

  ![Admin → Platform AI](/screenshots/react/melis-ai/melisai-tool-admin-tab-platformai.png)

- **Instances** — gérez les instances nommées utilisées pour lancer les agents. Le tableau liste,
  pour chaque instance, son **Name ID** (le `mai_instance_id`) et l'agent lié ; **+ New instance**
  ouvre un formulaire React (Name, Instance ID, Status, Agent, libellé par langue).

  ![Admin → Instances](/screenshots/react/melis-ai/melisai-tool-admin-tab-instances.png)

- **Usage** — consommation de tokens/requêtes, au total et par instance, sur une plage
  sélectionnable.
- **MCP Server** — choisissez quelles fonctions MCP le serveur expose, et marquez les tables
  sensibles.
- **Chat dev tool** — une console de chat développeur qui affiche le payload IA brut et la réponse
  côte à côte ; le moyen le plus rapide de voir ce que le modèle a réellement reçu et répondu.

## Construire un agent (AI Agents)

Sous **Melis AI → AI Agents**, vous construisez le **scénario** d'un agent. La liste affiche les
agents livrés avec leur nombre d'étapes et leur nombre d'appels cumulés ; en ouvrir un ajoute un
sous-onglet avec un éditeur à cinq onglets — **Config · AI Tools · DB Rights · Scenario · Run**.

![Liste AI Agents](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents.png)

- **Config** — nom, code, description, un override de modèle optionnel, et les bascules d'upload de
  fichiers.
- **AI Tools** — cochez les outils que cet agent peut appeler, regroupés en **MCP tools** et **Local
  tools** ; le moteur ne propose alors au modèle que ceux-là.
- **DB Rights** — par table : read / write / delete / drop, plus un interrupteur global *Allow table
  creation*. L'écriture, la suppression de lignes et le drop sont irréversibles.
- **Scenario** — les étapes typées et ordonnées : **ENTRY PARAMS** → une ou plusieurs **AI CONTEXT**
  (système/connaissance silencieux) → **AI CHAT** (le tour visible) → **EXIT PARAMS**, avec des
  étapes **CODE** optionnelles. Glissez pour réordonner ; chaque étape a un **Code** que vous
  référencez avec `[CODE]` pour injecter la réponse d'une étape précédente dans un prompt ultérieur.

  ![Agent → Scenario](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-scenario.png)

- **Run** — un chat de test en direct contre l'agent (l'instance `agenttool`), pour itérer sur le
  scénario et les outils sans quitter l'éditeur.

## L'Assistant IA

L'**Assistant IA** global est un bouton flottant en bas à droite de chaque écran (il n'a pas
d'entrée de menu). Il ouvre un panneau de chat exécutant l'**assistant de chat principal** général
(instance `mainchatassistantgeneral`), et peut piloter le backoffice — ouvrir un outil, ouvrir une
page — directement depuis la conversation. Il reste monté au fil des navigations, si bien qu'une
session ouverte survit au changement d'outil.

![Panneau Assistant IA ouvert](/screenshots/react/melis-ai/melisai-footer-icon-generalassistant-deployed.png)

## Utiliser un agent depuis votre code

L'intégration côté serveur la plus simple reste le **view helper `MelisAIChat`**
(`melis-ai-engine/src/View/Helper/MelisAIChatViewHelper.php`). Déposez-le dans une vue `.phtml` pour
rendre un chat prêt à l'emploi lié à une instance :

```php
<?= $this->MelisAIChat(
    $maiInstanceId,        // id d'instance depuis melis_ai_instances.mai_instance_id
    $agentId = null,       // id d'agent explicite (optionnel)
    $extraEntryParams = [],// custom_text / custom_files / custom_data
    $debugMode = false,
    $exitParamArr = []     // où réécrire le résultat (champs, callbacks js/route)
) ?>
```

Un pattern courant consiste à **scoper la session par objet** en suffixant l'id d'instance avec un
id, p. ex. `"newscontentcreator|".$newsId` — pour que chaque actualité garde sa propre conversation.

Dans le backoffice React, l'équivalent est le composant **`AiChatContainer`** exporté par
`melis-ai-engine` (via l'alias Vite `@melis-ai-engine`). Montez-le avec un `maiInstanceId` et il
exécute toute la boucle `init → run → (continue×N) → validate` contre les endpoints
`/melis/react-api/ai-engine/*` — sans aucun travail backend :

```tsx
import { AiChatContainer } from '@melis-ai-engine'

<AiChatContainer maiInstanceId="newscontentcreator|42" clearSession autoRun />
```

::: tip Exemple réel
`melis-ai-community-extensions` fournit des agents fonctionnels — p. ex. un *news content creator*
qui prend un prompt + des images et réécrit le texte généré dans le formulaire d'actualité via un
exit callback. Lisez
`vendor/melisplatform/melis-ai-community-extensions/src/Controller/NewsController.php` pour voir le
helper utilisé de bout en bout.
:::

Par programmation, le moteur se pilote via
`MelisAIEngine\Service\MelisAIEngineAgentService` (`runAgent()`, `validateAnswer()`,
`continueConversation()`, `restartAgent()`, `getFinalAnswer()`), construit par agent + instance,
avec l'état de conversation persisté dans un store en base (`MelisAIEngineConversationStore`) plutôt
que dans les sessions PHP. Le view helper classique comme le conteneur de chat React appellent ce
même service.

## Les outils

Les agents peuvent appeler des **outils** (fonctions) pendant une exécution — y compris des **outils
MCP** pour les opérations fichiers et base de données. Utilisez le **MCP Inspector** (Melis AI → MCP
Inspector) pour confirmer qu'un serveur est en ligne et que ses outils sont découvrables avant de
les autoriser sur un agent. Voir la page dédiée [MCP](./mcp).

## Fichiers clés

| Sujet | Chemin |
| --- | --- |
| Service moteur | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineService.php` |
| Exécution d'agent | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineAgentService.php` |
| View helper chat | `vendor/melisplatform/melis-ai-engine/src/View/Helper/MelisAIChatViewHelper.php` |
| Conteneur de chat React | `vendor/melisplatform/melis-ai-engine/ui-react/src/AiChatContainer.tsx` |
| Backend de chat React | `vendor/melisplatform/melis-ai-engine/src/Controller/React/MelisReactApiAiEngineController.php` |
| Provider Claude | `vendor/melisplatform/melis-ai-engine-claude/src/Service/MelisAIEngineModelClaudeService.php` |
| Provider Gemini | `vendor/melisplatform/melis-ai-engine-gemini/src/Service/MelisAIEngineModelGeminiService.php` |
| Bricks backoffice React | `vendor/melisplatform/melis-ai/ui-react/src/` |
| Agents d'exemple | `vendor/melisplatform/melis-ai-community-extensions/` |

> Pour le backoffice classique (iframe) de l'un de ces outils, utilisez le bascule **Old** de chaque
> outil — le comportement legacy est documenté sous [/fr/legacy](/fr/legacy/guide/ai). Lisez le code
> des modules pour l'API exacte et à jour — voir la [Référence des modules](../reference/modules).
