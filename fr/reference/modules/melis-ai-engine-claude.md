# MelisAIEngineClaude

> Fournisseur Anthropic Claude pour le moteur d'IA Melis — un moteur back-end sans interface React propre. Paquet `melisplatform/melis-ai-engine-claude`.

## Présentation

`MelisAIEngineClaude` est le fournisseur Anthropic Claude concret de la suite MelisAI. Il étend le contrat `MelisAIEngineModelService` du moteur et fournit la configuration du client HTTP spécifique à Claude, la structure du payload de l'API Messages Anthropic, la gestion des fichiers, le mappage des outils/fonctions et l'analyse des réponses. Le module est sans état — il ne possède aucune table de base de données ; tout l'état d'exécution réside dans les tables propres au moteur.

Le moteur sélectionne automatiquement ce fournisseur à l'exécution lorsque la société du modèle actif contient `Anthropic` (et que ce module est installé).

## Rôle dans le back-office React

Ce module n'a **aucun outil back-office React ni aucune interface propre** : pas de brique `ui-react/`, pas de `config/react-api.php`, aucune capacité et aucun contrôleur. Il n'apparaît jamais comme outil, nœud de menu ou entrée de barre latérale dans `/melis-react`. C'est de la pure tuyauterie — le chemin de code qui permet à Melis de dialoguer avec Claude.

Son seul effet visible dans le back-office React est **transitif, via [MelisAI](/fr/reference/modules/melis-ai)** :

- Ses scripts `install/dbdeploy/*.sql` initialisent la société **`Anthropic`** et plusieurs **modèles Claude** dans le catalogue de modèles du moteur.
- Ces modèles apparaissent alors comme choix dans l'admin MelisAI (IA de la plateforme / réglages des modèles), sous la société **Anthropic**.
- Pour en utiliser un, vous stockez votre **clé API Anthropic** sur la ligne de ce modèle (`mapk_*`), puis vous pointez une **instance / un agent** vers le modèle Claude.
- Dès lors, chaque conversation sur cet agent — y compris l'**Assistant IA** React — passe par ce fournisseur.

> Vous n'ouvrez jamais ce module. Dans `/melis-react`, il n'est jamais qu'une ligne dans une liste déroulante de modèles exposée par MelisAI, plus le moteur derrière les conversations IA qui l'utilisent. Si les conversations Claude échouent, la cause est généralement une **clé API** manquante sur la ligne du modèle ou un modèle **inactif** — deux réglages configurés dans MelisAI, pas ici.

## Activation

Ajoutez à `config/melis.module.load.php` après le moteur d'IA :

```php
return [
    'MelisAIEngine',
    'MelisAIEngineClaude',
];
```

Dépendance : `melisplatform/melis-ai-engine` `^6.0`. La clé API Anthropic est stockée par modèle dans le back-office Melis AI (la ligne de clé `mapk_*` du modèle) — pas dans un fichier de configuration ni dans une variable d'environnement.

## Services principaux

| Alias de service | Rôle |
| --- | --- |
| `MelisAIEngineModelClaudeService` | Le fournisseur Claude. Étend `MelisAIEngineModelService` et implémente le contrat de l'API Messages Anthropic. Construit par le gestionnaire de services avec les options de fabrique `['modelId' => …, 'agentId' => …]`. |

Méthodes notables sur `MelisAIEngineModelClaudeService` :

| Méthode | Rôle |
| --- | --- |
| `setClient()` | Construit un `Laminas\Http\Client` effectuant un POST vers l'URL Claude Messages configurée. Définit les en-têtes `Content-Type/Accept: application/json`, `x-api-key` (depuis la clé API du modèle), `anthropic-version: 2023-06-01`, et un en-tête `anthropic-beta` activant les betas de mise en cache des prompts et de récupération web. Utilise un long délai d'attente pour accommoder les boucles d'appel d'outils. |
| `getMessageKey()` | Retourne `'messages'`. |
| `addToolsToPayload()` | Lit les fonctions de l'agent via `getAgentFunctions()`, retire les clés internes du moteur (`mcp`, `type`, `server`, `module`, `max_silence`, `operation_timeout`) via `sanitizeToolForClaudeAPI()`, ajoute les outils au format Anthropic (`name`, `description`, `input_schema`), ajoute l'outil intégré `web_fetch`, et déduplique par nom. |
| `constructContent()` / `addContentToPayload()` | Mappe le rôle `model` vers `assistant` ; construit les blocs de contenu Anthropic (`{type:text}`, `{type:image, source:{url\|base64,…}}`, `{type:document, source:{…, media_type:application/pdf}}`) ; les ajoute à `payload['messages']`. |
| `sendCustomAI()` | Injecte `model` (`mam_generative_model`) et `max_tokens` ; envoie le JSON en POST avec des relances sur les erreurs 5xx ; analyse `content[]` en blocs texte et `tool_use` ; dispatche chaque outil (MCP via `MelisAIEngineMcpService::invokeTool`, sinon intégré) ; ajoute les résultats en tant que `{type:tool_result, tool_use_id, content}` dans un message `user` ; boucle jusqu'à ce que `stop_reason === 'end_turn'` ou qu'un garde-fou de sauts soit atteint. Active la mise en cache des prompts. |
| `processFiles()` / `processContextFiles()` | Convertit les fichiers téléversés selon le `mam_file_upload_mode` du modèle (par défaut : `embed`) : DOCX/XLSX → texte extrait, images/PDF → base64, ou via `uploadDocument()` lorsque le téléversement interne est activé. |
| `setPromptTokenCount()` / `setResponseTokenCount()` / `setTotalTokenCount()` | Lisent les champs `responseData['usage']` (`input_tokens`, `output_tokens`, ainsi que les compteurs de lecture/création du cache) ; total = entrée + sortie. |
| `getAllowedMimetypes()` | Retourne les types MIME de téléversement autorisés depuis le bloc de configuration Claude. |
| `continueConversation()` | Réhydrate l'historique des messages depuis l'état sauvegardé et rappelle `sendCustomAI()` pour la continuation d'appels d'outils multi-sauts. |

## Appel d'outils / fonctions

Les outils du moteur utilisent déjà le format `input_schema` d'Anthropic, donc `addToolsToPayload()` se contente principalement de les assainir et de les transmettre. Un appel d'outil du modèle arrive sous la forme `{type:'tool_use', name, id, input}` ; le service en extrait `name` / `input` / `id`, route via `MelisAIEngineMcpService::isMcpTool()` (MCP `invokeTool` vs. fonction intégrée), et retourne le résultat sous la forme `{type:'tool_result', tool_use_id:<id>, content:<json>}` dans un message `user`, puis continue la boucle. Le champ `id` corrèle l'appel et le résultat comme requis par l'API Anthropic.

## Configuration

Les réglages du fournisseur se trouvent sous :

```
config['plugins']['melisaiengine']['datas']['AI']['Claude']
```

| Clé | Rôle |
| --- | --- |
| `api_url` | L'URL du point de terminaison de l'API Messages Anthropic (`https://api.anthropic.com/v1/messages`). |
| `allowed_mimetypes` | Les types MIME acceptés pour les téléversements de fichiers. |

Un bloc voisin `['AI']['Anthropic']` déclare les modes de téléversement de fichiers (`embed`) et la prise en charge du téléversement interne. La clé API n'est **pas** lue depuis la configuration ou l'environnement — elle provient exclusivement de la ligne de clé BD du modèle (`mapk_*`), saisie par un administrateur dans l'admin MelisAI.

## Modèles initialisés

Installés via `install/dbdeploy/*.sql` sous la société `Anthropic` ; le drapeau `mam_status` décide lesquels sont proposés :

| `mam_generative_model` | Modèle |
| --- | --- |
| `claude-opus-4-8` | Claude Opus 4.8 |
| `claude-sonnet-4-6` | Claude Sonnet 4.6 |
| `claude-haiku-4-5-20251001` | Claude Haiku 4.5 |
| `claude-sonnet-4-5-20250929` | Claude Sonnet 4.5 |
| `claude-sonnet-4-20250514` | Claude Sonnet 4 |
| `claude-opus-4-1-20250805` | Claude Opus 4.1 |

## Tables de base de données

Ce module ne possède aucune table. Tout l'état des conversations et de l'utilisation est stocké dans les tables du moteur (`melis_ai_conversation_state`, `melis_ai_daily_usage`).

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Service fournisseur | `vendor/melisplatform/melis-ai-engine-claude/src/Service/MelisAIEngineModelClaudeService.php` |
| Fabrique de service | `vendor/melisplatform/melis-ai-engine-claude/src/Service/Factory/MelisAIEngineModelClaudeServiceFactory.php` |
| Bloc de configuration | `vendor/melisplatform/melis-ai-engine-claude/config/app.interface.php` |

## Voir aussi

- [MelisAIEngine](/fr/reference/modules/melis-ai-engine) — le moteur abstrait, les tables partagées et le pont MCP ; contient le routage qui sélectionne ce fournisseur d'après le nom de la société.
- [MelisAIEngineGemini](/fr/reference/modules/melis-ai-engine-gemini) — le fournisseur Google Gemini.
- [MelisAI](/fr/reference/modules/melis-ai) — back-office React pour gérer les instances, agents, outils, modèles et clés API ; la seule interface où Claude est exposé.
- [Référence des modules](/fr/reference/modules) — la carte complète des modules.
