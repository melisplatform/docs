# MelisAIEngineClaude

> Fournisseur Anthropic Claude pour le moteur d'IA Melis — paquet `melisplatform/melis-ai-engine-claude`.

## Présentation

`MelisAIEngineClaude` est le fournisseur Anthropic Claude concret de la suite MelisAI. Il étend le contrat `MelisAIEngineModelService` du moteur et fournit la configuration du client HTTP spécifique à Claude, la structure du payload de l'API Messages Anthropic, la gestion des fichiers, le mappage des outils/fonctions et l'analyse des réponses. Le module est sans état — il ne possède aucune table de base de données ; tout l'état d'exécution réside dans les tables propres au moteur.

Le moteur sélectionne automatiquement ce fournisseur à l'exécution lorsque la société du modèle actif contient `Anthropic` (et que ce module est installé).

## Activation

Ajoutez à `config/melis.module.load.php` après le moteur d'IA :

```php
return [
    'MelisAIEngine',
    'MelisAIEngineClaude',
];
```

Dépendance : `melisplatform/melis-ai-engine` `^5.3`. La clé API Anthropic est stockée par modèle dans le back-office Melis AI (la ligne de clé `mapk_*` du modèle) — pas dans un fichier de configuration ni dans une variable d'environnement.

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
| `constructContent()` / `addContentToPayload()` | Mappe le rôle `model` vers `assistant` ; construit les blocs de contenu Anthropic (`{type:text}`, `{type:image, source:{url|base64,…}}`, `{type:document, source:{…, media_type:application/pdf}}`) ; les ajoute à `payload['messages']`. |
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
| `api_url` | L'URL du point de terminaison de l'API Messages Anthropic. |
| `allowed_mimetypes` | Les types MIME acceptés pour les téléversements de fichiers. |

La clé API n'est **pas** lue depuis la configuration ou l'environnement — elle provient exclusivement de la ligne de clé BD du modèle (`mapk_*`).

## Tables de base de données

Ce module ne possède aucune table. Tout l'état des conversations et de l'utilisation est stocké dans les tables du moteur (`melis_ai_conversation_state`, `melis_ai_daily_usage`).

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Service fournisseur | `vendor/melisplatform/melis-ai-engine-claude/src/Service/MelisAIEngineModelClaudeService.php` |

## Voir aussi

- [MelisAIEngine](/fr/reference/modules/melis-ai-engine) — le moteur abstrait, les tables partagées et le pont MCP.
- [MelisAIEngineGemini](/fr/reference/modules/melis-ai-engine-gemini) — le fournisseur Google Gemini.
- [MelisAI](/fr/reference/modules/melis-ai) — interface back-office pour gérer les instances, agents, outils et modèles.
- [Référence des modules](/fr/reference/modules) — la carte complète des modules.
