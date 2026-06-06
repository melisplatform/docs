# IA : agents & moteur

Melis embarque un **moteur IA** qui permet de construire des **agents** — des workflows IA scriptés
en plusieurs étapes — et de les exposer partout dans le backoffice ou dans vos propres modules.
Différents providers (Anthropic Claude, Google Gemini) se branchent derrière un moteur unique.

Les modules concernés : `melis-ai` (UI backoffice), `melis-ai-engine` (le moteur),
`melis-ai-engine-claude` / `melis-ai-engine-gemini` (providers), et
`melis-ai-community-extensions` (agents d'exemple prêts à l'emploi).

## Concepts clés

| Concept | Ce que c'est | Table |
| --- | --- | --- |
| **Company / provider** | Le fournisseur IA (Anthropic, Google…). | `melis_ai_companies` |
| **Model** | Un modèle concret d'une company (un modèle Claude ou Gemini). | `melis_ai_models` (`mam_generative_model`) |
| **Platform key** | La clé d'API utilisée pour appeler un provider. | `melis_ai_platform_keys` |
| **Agent** | Un workflow = une liste ordonnée d'**étapes de scénario**. | `melis_ai_agents`, `melis_ai_scenario_steps` |
| **Instance** | Une poignée nommée et réutilisable pour lancer un agent (sert d'id de session de chat). | `melis_ai_instances` (`mai_instance_id`) |
| **Daily usage** | Comptage des tokens/usage par modèle/agent/instance. | `melis_ai_daily_usage` |

Un **agent** est un *scénario* : une séquence d'étapes comme `USER INPUT`, `AI CONTEXT`,
`CODE AI CALL`, `AI CHAT`, `CODE PHP`, `ENTRY PARAMS` / `EXIT PARAMS`. Le moteur parcourt les
étapes, appelle le modèle au besoin, et produit une réponse finale — qu'il peut réinjecter dans la
page qui l'a lancé (via les *exit parameters*).

## Providers

Le moteur choisit un provider d'après le nom de la **company** du modèle
(`MelisAIEngine\Service\MelisAIEngineService::getActiveModelClass()`) :

- company contenant **« Anthropic »** → `MelisAIEngineModelClaudeService` (module `melis-ai-engine-claude`)
- company contenant **« Google »** → `MelisAIEngineModelGeminiService` (module `melis-ai-engine-gemini`)

Les deux étendent le `MelisAIEngineModelService` de `melis-ai-engine` et implémentent le même
contrat (`setClient()`, formatage des payloads/messages, appels d'outils). Ajouter un nouveau
provider revient à ajouter un module avec son propre model service — sans toucher au moteur.

## Le configurer (backoffice)

Dans le backoffice, ouvrez **Melis AI → Admin** :

- **Platform AI** — déclarez les companies & modèles, et stockez les **clés d'API**
  (`melis_ai_platform_keys`).
- **Instances** — gérez les instances nommées qui servent à lancer les agents.
- **Usage** — consommation de tokens par modèle/agent.
- **Chat Dev Tool** — une console de chat développeur pour tester le moteur.

Sous **Melis AI → Agents**, vous construisez le **scénario** d'un agent (ses étapes), vous le testez
avec *Run Scenario*, et vous lui assignez des outils.

## Utiliser un agent depuis votre code

L'intégration la plus simple est le **view helper `MelisAIChat`**
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

::: tip Exemple réel
`melis-ai-community-extensions` fournit des agents fonctionnels — p. ex. un *news content creator*
qui prend un prompt + des images et réécrit le texte généré dans le formulaire d'actualité via un
exit callback. Lisez `vendor/melisplatform/melis-ai-community-extensions/src/Controller/NewsController.php`
pour voir le helper utilisé de bout en bout.
:::

Par programmation, le moteur se pilote via
`MelisAIEngine\Service\MelisAIEngineAgentService` (`runAgent()`, `validateAnswer()`,
`continueConversation()`, `restartAgent()`, `getFinalAnswer()`), construit par agent + instance,
avec l'état de conversation persisté dans un store en base (`MelisAIEngineConversationStore`)
plutôt que dans les sessions PHP.

## Les outils

Les agents peuvent appeler des **outils** (fonctions) pendant une exécution — y compris des
**outils MCP** pour les opérations fichiers et base de données. Voir la page dédiée [MCP](./mcp).

## Fichiers clés

| Sujet | Chemin |
| --- | --- |
| Service moteur | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineService.php` |
| Exécution d'agent | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineAgentService.php` |
| View helper chat | `vendor/melisplatform/melis-ai-engine/src/View/Helper/MelisAIChatViewHelper.php` |
| Provider Claude | `vendor/melisplatform/melis-ai-engine-claude/src/Service/MelisAIEngineModelClaudeService.php` |
| Provider Gemini | `vendor/melisplatform/melis-ai-engine-gemini/src/Service/MelisAIEngineModelGeminiService.php` |
| Admin backoffice | `vendor/melisplatform/melis-ai/src/Controller/AdminController.php` |
| Agents d'exemple | `vendor/melisplatform/melis-ai-community-extensions/` |

> La suite IA évolue activement — épinglez les releases `^5.3` (voir
> [Référence des modules](../reference/modules)) et lisez le code des modules pour l'API exacte et
> à jour.
