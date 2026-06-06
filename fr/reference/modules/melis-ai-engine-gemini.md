# MelisAIEngineGemini

> Fournisseur Google Gemini pour le moteur Melis AI — paquet `melisplatform/melis-ai-engine-gemini`.

## Objectif

`MelisAIEngineGemini` branche Google Gemini sur [Melis AI](/fr/guide/ai). C'est une
**implémentation de fournisseur** : il étend la classe abstraite `MelisAIEngineModelService` de
`MelisAIEngine` et fournit le client HTTP propre à Gemini, le format de requête (le schéma
`contents` + `parts`), l'appel d'outils/fonctions (`functionDeclarations`), la gestion des fichiers
(File API ou intégration inline) et l'analyse de la consommation de jetons. Il n'apporte aucune
interface propre — les agents, instances et scénarios se configurent dans le backoffice IA, et le
moteur achemine une requête ici dès que la société du modèle actif est **Google**. Voir
[Melis AI](/fr/guide/ai) et [MCP et outils](/fr/guide/mcp) pour le déroulé complet.

## Activation

C'est un module Laminas standard (nom de module `MelisAIEngineGemini`). Installez-le avec Composer
(`composer require melisplatform/melis-ai-engine-gemini`) puis ajoutez-le à
`config/melis.module.load.php` :

```php
'MelisAIEngineGemini',
```

Il **nécessite `melisplatform/melis-ai-engine` (`^5.3`)** et PHP `^8.1|^8.3`. Ses deltas `dbdeploy`
enregistrent la société **Google** et les modèles Gemini. À l'exécution, la gestion des fichiers
peut aussi s'appuyer sur **MelisDocumentUpload** (quand l'option « internal upload » du modèle est
activée). Le fournisseur n'est utilisé que si le module figure dans la liste des modules actifs — le
moteur le vérifie avant de l'instancier.

## Comment le moteur le sélectionne

`MelisAIEngineService::getActiveModelClass($company, $modelId, $agentId)` (dans `melis-ai-engine`)
examine le `macp_company_name` du modèle actif. Lorsqu'il contient **`Google`** et que
`MelisAIEngineGemini` est actif, il construit `MelisAIEngineModelGeminiService` via le service
manager (`build()` avec les options `modelId` / `agentId`). Aucun câblage manuel n'est nécessaire.

## Services clés

| Alias de service | Rôle |
| --- | --- |
| `MelisAIEngineModelGeminiService` | Le fournisseur Gemini. Sous-classe de `MelisAIEngine\Service\MelisAIEngineModelService`. Construit par requête avec `modelId` + `agentId`. |

Méthodes notables de `MelisAIEngineModelGeminiService` :

| Méthode | Rôle |
| --- | --- |
| `setClient()` | Construit le client HTTP Laminas ; URI = `{api_url}/models/{mam_generative_model}:generateContent?key={mapk_keys}`, POST, délai 3600 s. |
| `sendCustomAI(?array $payload = [])` | Envoie le payload ; analyse `candidates`/`parts` ; dispatche les `functionCall` (MCP ou `MelisAIEngineFunctionService`) ; réessaie sur 5xx/429 ; renvoie `result`, `errors`, `responseData`, `payload`, `needs_continuation`, `session_id`, `tool_results`. |
| `continueConversation($sessionId, $continuationContext, $existingContext = [])` | Réhydrate `contents` depuis la session PHP (ou un contexte de repli) et rappelle `sendCustomAI()`. |
| `addToolsToPayload($payload)` | Ajoute `tools[].functionDeclarations` + `toolConfig.functionCallingConfig` (mode `AUTO`) ; sans fonctions, ajoute à la place l'outil `url_context`. |
| `addContentToPayload($payload, $role, $prompt, $files, $content)` / `constructContent($role, $prompt, $files)` | Construisent une entrée `contents` (`role` + `parts` : `text`, `fileData`, `inlineData`). |
| `processFiles($files)` / `processContextFiles($files)` | Normalisent les téléversements selon le mode d'upload du modèle (`fileapi` / `embed`) et l'indicateur d'upload interne. |
| `setPromptTokenCount()` / `setResponseTokenCount()` / `setTotalTokenCount()` | Lisent `usageMetadata.{promptTokenCount,candidatesTokenCount,totalTokenCount}`. |
| `getAllowedMimetypes()` / `getMessageKey()` | Renvoient les types MIME autorisés configurés / la clé de message (`contents`). |

Constantes : `FILEAPI_UPLOAD_MODE = "fileapi"`, `EMBED_UPLOAD_MODE = "embed"`.

## Modes de téléversement des fichiers

Le `mam_file_upload_mode` du modèle actif détermine comment les fichiers parviennent à Gemini :

- **`fileapi`** — téléverse via la **File API** Gemini (`upload_url`), puis référence le `fileUri`
  renvoyé. Le service attend que l'état du fichier passe à `ACTIVE`.
- **`embed`** — envoie les octets du fichier en base64 inline (`inlineData`), avec extraction de
  texte pour les `.docx` et `.xlsx`.

Quand `mam_internal_upload` est activé, les fichiers texte passent par **MelisDocumentUpload** (afin
de pouvoir être réaffichés dans les sessions de discussion antérieures), et seuls les fichiers non
texte vont vers la File API / l'embed.

## Configuration

Les points d'accès et limites Gemini se trouvent sous la clé de configuration
`plugins → melisaiengine → datas → AI → Gemini` (voir `config/app.interface.php`) :

| Clé | Valeur par défaut |
| --- | --- |
| `api_url` | `https://generativelanguage.googleapis.com/v1beta` |
| `upload_url` | `https://generativelanguage.googleapis.com/upload/v1beta/files` |
| `allowed_mimetypes` | Liste MIME image / pdf / texte / office / vidéo / audio / zip |

La clé d'API n'est **pas** stockée dans la configuration — elle provient de la ligne du modèle
(`mapk_keys`), gérée dans le backoffice IA.

## Backoffice

Aucun en propre. Le module déclare la coquille de plugin `melisaienginegemini` (configuration du
bundle d'assets) mais ne fournit ni outil, ni action de contrôleur, ni aide de vue, ni plugin de
tableau de bord. Tous les écrans IA proviennent de `melis-ai` / `melis-ai-engine`.

## Tables de base de données

Le module ne possède aucune table ; il peuple celles de `melis-ai-engine` via `dbdeploy` :

| Table | Ce que ce module insère |
| --- | --- |
| `melis_ai_companies` | La ligne de société `Google`. |
| `melis_ai_models` | Les modèles Gemini (p. ex. `gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-2.5-flash-lite`, `gemini-3.1-pro-preview`) avec leur `mam_generative_model`, mode d'upload et indicateurs de fichier. |

## Fichiers clés

| Sujet | Chemin |
| --- | --- |
| Service fournisseur | `vendor/melisplatform/melis-ai-engine-gemini/src/Service/MelisAIEngineModelGeminiService.php` |
| Fabrique de service | `vendor/melisplatform/melis-ai-engine-gemini/src/Service/Factory/MelisAIEngineModelGeminiServiceFactory.php` |
| Alias de service / routage | `vendor/melisplatform/melis-ai-engine-gemini/config/module.config.php` |
| Points d'accès et types MIME autorisés | `vendor/melisplatform/melis-ai-engine-gemini/config/app.interface.php` |
| dbdeploy (société + modèles) | `vendor/melisplatform/melis-ai-engine-gemini/install/dbdeploy/` |
| Amorçage du module | `vendor/melisplatform/melis-ai-engine-gemini/src/Module.php` |

## Voir aussi

- [Melis AI](/fr/guide/ai) — agents, instances, scénarios.
- [MCP et outils](/fr/guide/mcp) — appel de fonctions/d'outils.
- [Référence des modules](/fr/reference/modules) — la carte complète des modules.
