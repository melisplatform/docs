# MelisAIEngineClaude

> Fournisseur Anthropic Claude pour le moteur d'IA Melis — paquet `melisplatform/melis-ai-engine-claude`.

## Objectif

`MelisAIEngineClaude` branche les modèles Claude d'Anthropic dans [Melis AI](/fr/guide/ai). C'est une
*implémentation de fournisseur* : elle étend `MelisAIEngine\Service\MelisAIEngineModelService` et
fournit tout ce qui est spécifique à l'API Messages d'Anthropic — configuration du client HTTP, forme
des requêtes/réponses, gestion des fichiers, appel d'outils (y compris les outils [MCP](/fr/guide/mcp)
et l'outil intégré `web_fetch`), mise en cache des prompts et comptage des jetons. Le moteur d'IA
choisit ce fournisseur automatiquement selon la société (`Anthropic`) et l'identifiant du modèle
actif. Ce n'est ni un outil de back-office ni un plugin de front-office — il n'a pas d'interface
propre.

## Activation

C'est un module Laminas standard. Ajoutez-le à `config/melis.module.load.php` **après** le moteur
d'IA :

```php
'MelisAIEngine',
'MelisAIEngineClaude',
'MelisAI',
```

Dépendances (d'après `composer.json`) : `melisplatform/melis-ai-engine` `^5.3` et PHP `^8.1|^8.3`.
Le module fournit des deltas `dbdeploy` (`"dbdeploy": true`) qui enregistrent la société Anthropic et
ses modèles Claude ; exécutez dbdeploy après l'activation pour qu'ils soient insérés. La clé API Claude
est stockée par modèle (le `mapk_keys` du modèle), renseignée dans le back-office Melis AI — pas dans
un fichier de config.

## Services clés

| Alias de service | Rôle |
| --- | --- |
| `MelisAIEngineModelClaudeService` | Le fournisseur Claude. Étend `MelisAIEngineModelService` et implémente le contrat de l'API Messages d'Anthropic. |

Il est construit par `MelisAIEngineModelClaudeServiceFactory`, qui prend `modelId` / `agentId` dans les
`$options` de la fabrique. Méthodes notables :

| Méthode | Rôle |
| --- | --- |
| `setClient()` | Construit le client HTTP Laminas : POST vers l'`api_url` configurée, `x-api-key` depuis le modèle, `anthropic-version: 2023-06-01`, les betas `prompt-caching` + `web-fetch`, délai de 3600 s. |
| `sendCustomAI($payload)` | L'appel principal. Définit `model` / `max_tokens`, applique la mise en cache des prompts, ajoute les outils, envoie la requête, puis exécute la boucle d'appel d'outils multi-sauts (exécution des outils MCP et du service de fonctions, renvoi des `tool_result`) avec relances et un garde-fou de continuation/sauts. |
| `addContentToPayload($payload, $role, $prompt, $files, $content)` / `constructContent()` / `constructTextContent()` | Construisent les messages au format de l'API Messages (blocs `text`, `image`, `document`). |
| `addToolsToPayload($payload)` / `sanitizeToolForClaudeAPI($tool)` | Attachent les outils de l'agent (en retirant les clés internes comme `mcp`, `server`, `module`) ainsi que l'outil `web_fetch`. |
| `processFiles($files)` / `processContextFiles($files)` | Normalisent les téléversements pour le mode `embed` (texte en ligne, images/PDF en base64, `.docx`/`.xlsx` extraits en texte, ou URLs de Document Upload). |
| `getAllowedMimetypes()` | Renvoie les types MIME de téléversement autorisés depuis la config. |
| `continueConversation($sessionId, ...)` | Reprend une chaîne d'appels d'outils stockée en session entre les sauts HTTP. |
| `setPromptTokenCount()` / `setResponseTokenCount()` / `setTotalTokenCount()` | Lisent `usage.input_tokens` / `usage.output_tokens` dans la réponse. |

## Configuration

Les réglages du fournisseur se trouvent sous la clé de config de plugin
`plugins → melisaiengine → datas → AI → Claude` (voir `config/app.interface.php`) :

- `api_url` — par défaut `https://api.anthropic.com/v1/messages`.
- `allowed_mimetypes` — images, PDF, types text/CSV/HTML/XML/JSON et Office (`.docx`/`.xlsx`).

Le même fichier déclare un bloc `Anthropic` décrivant la gestion des fichiers : seul le mode de
téléversement `embed` est pris en charge, et le téléversement interne (via
[melis-document-upload](/fr/reference/modules)) est disponible.

## Base de données

Le module ne possède aucune table. Ses deltas `install/dbdeploy/*.sql` se contentent
d'**insérer/mettre à jour des lignes** dans des tables appartenant à `melis-ai-engine` :

- `melis_ai_companies` — ajoute la société `Anthropic`.
- `melis_ai_models` — ajoute les modèles Claude (Opus 4.1, Sonnet 4 / 4.5, Haiku 4.5) avec leurs
  identifiants `mam_generative_model`, le mode de téléversement `embed` et l'indicateur de
  téléversement interne.

Les modèles arrivent avec `mam_status = 0` (inactifs) ; activez-les et renseignez leur clé dans le
back-office Melis AI.

## Fichiers clés

| Sujet | Chemin |
| --- | --- |
| Service fournisseur | `vendor/melisplatform/melis-ai-engine-claude/src/Service/MelisAIEngineModelClaudeService.php` |
| Fabrique du service | `vendor/melisplatform/melis-ai-engine-claude/src/Service/Factory/MelisAIEngineModelClaudeServiceFactory.php` |
| Alias de service / routage | `vendor/melisplatform/melis-ai-engine-claude/config/module.config.php` |
| Config fournisseur (api_url, mimetypes, modes de téléversement) | `vendor/melisplatform/melis-ai-engine-claude/config/app.interface.php` |
| Amorçage BD (société + modèles) | `vendor/melisplatform/melis-ai-engine-claude/install/dbdeploy/` |
| Bootstrap du module | `vendor/melisplatform/melis-ai-engine-claude/src/Module.php` |

## Voir aussi

- [Melis AI](/fr/guide/ai) — le moteur d'IA, les agents et les modèles.
- [MCP](/fr/guide/mcp) — comment les outils sont exposés au modèle.
- [Référence des modules](/fr/reference/modules) — la carte complète des modules.
