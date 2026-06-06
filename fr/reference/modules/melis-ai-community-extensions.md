# MelisAICommunityExtensions

> Extensions IA communautaires qui relient Melis AI à de vrais flux d'édition — contenu d'actualité
> assisté par IA et génération de mini-templates par IA. Paquet
> `melisplatform/melis-ai-community-extensions`.

## Objectif

MelisAICommunityExtensions fournit des agents IA prêts à l'emploi qui branchent le moteur
[Melis AI](/fr/guide/ai) sur des tâches concrètes du backoffice. Il propose deux agents
pré-configurés :

- **newscontentcreator** — génère le contenu d'un article d'actualité (titre, intro, paragraphes,
  conclusion) directement dans les champs MelisCmsNews, en utilisant éventuellement des images
  jointes comme contexte.
- **minitemplatecreator** — aide le modèle à rédiger le HTML d'un mini-template pour un site, appuyé
  par un serveur [MCP](/fr/guide/mcp) qui lit les assets pertinents du site, résout l'URL publique du
  site, téléverse des images et affiche un aperçu en direct.

Le module n'ajoute pas d'écran d'outil autonome ; il injecte plutôt un bouton **« Generate with
AI »** et des fenêtres de chat dans les outils existants (l'éditeur d'actualités et le Mini Template
Manager) et gère les CSS/JS produits par l'IA.

## Activation

C'est un module Laminas standard listé dans `config/melis.module.load.php` — assurez-vous que
`'MelisAICommunityExtensions'` est présent dans ce tableau. Il requiert `melisplatform/melis-ai`
(`^5.3`) et PHP 8.1/8.3 (voir `composer.json`) ; il s'intègre à `melis-cms`, `melis-cms-news` et
`melis-engine` lorsqu'ils sont présents. Ses deltas d'installation (`install/dbdeploy/`) initialisent
les données d'agent/instance, lancez donc le dbdeploy après activation.

Pour que les assets de mini-template générés par l'IA s'affichent en front-office, chargez également
`MelisAICommunityExtensions` sur le site lui-même (MelisCMS → Outils du site → Sites → *site* →
onglet Chargement des modules). Voir [Référence des modules](/fr/reference/modules),
[IA](/fr/guide/ai) et [MCP](/fr/guide/mcp).

## Services clés

Le module enregistre un seul alias de table-gateway dans `config/module.config.php` ; le gros du
travail est assuré par les agents (initialisés en base) ainsi que par les contrôleurs et listeners
ci-dessous.

| Alias de service | Rôle |
| --- | --- |
| `AINewsTable` | Table-gateway (`MelisAICommunityExtensions\Model\Tables\NewsTable`, étend `MelisCmsNewsTable`). `getNewsData($newsId)` joint `melis_cms_news` à `melis_cms_site` pour résoudre le `site_name` d'un article (utilisé pour localiser les chemins d'images du site). |

Il ajoute aussi un alias de view helper `generateWithAIBtn`
(`MelisGenerateWithAIBtnHelper`), qui rend le bouton réutilisable **Generate with AI** (icône IA +
libellé), et un bloc `controllers` pour ses quatre contrôleurs.

## Backoffice

Le module n'a pas d'entrée propre dans l'arbre d'outils (`app.tools.php` est un emplacement vide).
Il s'accroche plutôt aux outils existants via `config/app.interface.php` et des listeners
d'événements.

| Contrôleur | Actions clés | Rôle |
| --- | --- | --- |
| `MelisAICommunityExtensions\Controller\News` | `render-ai-chat`, `get-generate-with-ai-button`, `get-news-title` | Ouvre le chat **newscontentcreator** pour un `newsId`/`paragraphField` donné ; construit `exitParamArr` pour que l'agent réécrive sa réponse dans le champ d'actualité ciblé. |
| `MelisAICommunityExtensions\Controller\MiniTemplate` | `render-ai-chat`, `get-generate-with-ai-button`, `get-mini-template-preview-shell`, `validate-template-name`, `check-template-assets`, `get-site-module-by-page-template-id` | Ouvre le chat **minitemplatecreator** pour un module de site / template de page ; sert l'enveloppe d'aperçu et valide les noms/assets de template. |
| `MelisAICommunityExtensions\Controller\MelisPluginRendererOverride` | `get-plugin` | Surcharge la route du renderer de plugins MelisFront (`/melispluginrenderer`) pour que le contenu de mini-template généré par l'IA s'affiche correctement. |
| `MelisAICommunityExtensions\Controller\Base` | — | Contrôleur de base partagé (helpers du service manager, accès à la config TinyMCE). |

Points d'intégration backoffice déclarés dans `app.interface.php` :

- `melisaicommunity_extension_generate_news_text_modal` (melisKey, icône `cogwheel`) — renvoie vers
  `News/render-ai-chat`.
- Un `jscallback` `addNewsGenerateAIBtn()` injecté sous les champs de paragraphe MelisCmsNews.
- Un `jscallback` `addMinitplCreatorGenerateAIBtn()` injecté dans le formulaire d'ajout du Mini
  Template Manager de MelisCMS.

Listeners d'événements (attachés dans `src/Module.php`, tous étendant `MelisGeneralListener`) :

| Listener | Événement écouté | Rôle |
| --- | --- | --- |
| `...CreateMiniTemplateListener` | `meliscms_mini_template_manager_create_end` | Persiste les assets de mini-template générés par l'IA à la création d'un template. |
| `...DeleteMiniTemplateAssetsListener` | `meliscms_mini_template_manager_delete_end` | Nettoie les CSS/JS IA d'un mini-template supprimé. |
| `...PublishPageListener` | `meliscms_page_publish_start` | Promeut les assets générés par l'IA à la publication d'une page. |
| `...SanitizeSavedPluginHtmlListener` | `meliscms_page_savesession_plugin_start` | Assainit le HTML IA avant son enregistrement dans le contenu de la page. |
| `...AttachAIGeneratedCssListener` | rendu (front + back) | Ajoute le CSS généré par l'IA à la page. |
| `...InjectDndAiButtonListener` | rendu / dnd-layout | Injecte le bouton « Generate with AI » dans les zones de glisser-déposer. |
| `...TinyMCEConfigurationListener` | bootstrap backoffice | Étend la configuration TinyMCE utilisée par l'éditeur de mini-templates. |

## Front-office

Le module surcharge la route `melis-plugin-renderer` (`/melispluginrenderer`) par
`MelisPluginRendererOverride::getPlugin` afin que les mini-templates rédigés via l'IA s'affichent à
travers le moteur front. Le CSS généré par l'IA est ajouté au moment du rendu par
`MelisAICommunityExtensionsAttachAIGeneratedCssListener`. Il n'expose pas de plugin de templating
glisser-déposer propre — voir [Plugins](/fr/guide/plugins).

## Serveur MCP

`config/mcp.tools.php` enregistre un serveur MCP stdio (`minitemplate_creator`, point d'entrée
`mcp/minitemplatecreator/bin/server.php`) et fusionne quatre déclarations de fonctions dans la config
`melisaiengine` pour que l'agent **minitemplatecreator** puisse les appeler :

| Outil | Rôle |
| --- | --- |
| `readSiteAssets` | Sélectionne et lit un petit ensemble d'assets CSS/JS/vues pertinents pour un module de site selon une demande de template. |
| `getSitePublicUrl` | Résout l'URL publique / le domaine d'un module de site pour le contexte visuel. |
| `uploadMinitemplateImages` | Enregistre les images jointes (data URL / base64 / URL HTTP) dans le dossier temporaire des mini-templates et retourne un chemin web. |
| `renderMinitemplatePreview` | Déclenche un aperçu visuel du mini-template en cours de rédaction. |

Voir [MCP](/fr/guide/mcp).

## Tables de base de données

Ce module ne crée **aucune table `melis_*` qui lui soit propre**. Ses deltas `install/dbdeploy/`
insèrent et mettent à jour uniquement des lignes d'**agent/instance/scénario** dans les tables
détenues par `melis-ai` (`melis_ai_agents`, `melis_ai_instances`, `melis_ai_instance_trans`,
`melis_ai_scenario_steps`, `melis_ai_scenario_steps_datas`,
`melis_ai_scenario_steps_datas_entryexit`, `melis_ai_files`), initialisant les agents
`newscontentcreator` et `minitemplatecreator`. À l'exécution, il lit les données MelisCmsNews via
`melis_cms_news` / `melis_cms_site`.

## Exemple

Afficher le chat **newscontentcreator** pour que l'agent réécrive dans un champ de paragraphe
d'actualité précis (le schéma utilisé par `NewsController::renderAiChatAction`) :

```php
// mai_instance_id est suffixé de |{newsId} pour isoler la session par article
$view->maiInstanceId = 'newscontentcreator|' . $newsId;

// exitParamArr indique à l'agent où renvoyer sa réponse dans l'UI
$view->exitParamArr = [
    'masse_exit_input_1'     => $paragraphField,                    // ex. 'news_paragraph_1'
    'masse_exit_js_callback' => "setParagraphContent($paragraphField)",
];

// extraEntryParam amorce le prompt et le contexte image optionnel
$view->extraEntryParam = [
    'custom_text'  => 'Generate content for paragraph 1 of the news',
    'custom_files' => $images,   // chemins locaux ou URLs publiques
];
```

La vue affiche le chat via le helper de Melis AI Engine :

```php
<?= $this->AIChatViewHelper(
    'newscontentcreator|' . $newsId,
    null,
    $this->extraEntryParam,
    false,
    $this->exitParamArr
) ?>
```

## Fichiers clés

| Sujet | Chemin |
| --- | --- |
| Config du module (routes, contrôleurs, alias de table, view helper) | `vendor/melisplatform/melis-ai-community-extensions/config/module.config.php` |
| Points d'intégration backoffice (modals, jscallbacks) | `vendor/melisplatform/melis-ai-community-extensions/config/app.interface.php` |
| Serveur MCP + déclarations de fonctions | `vendor/melisplatform/melis-ai-community-extensions/config/mcp.tools.php` |
| Contrôleur IA des actualités | `vendor/melisplatform/melis-ai-community-extensions/src/Controller/NewsController.php` |
| Contrôleur IA des mini-templates | `vendor/melisplatform/melis-ai-community-extensions/src/Controller/MiniTemplateController.php` |
| Surcharge du renderer de plugins | `vendor/melisplatform/melis-ai-community-extensions/src/Controller/MelisPluginRendererOverrideController.php` |
| Listeners | `vendor/melisplatform/melis-ai-community-extensions/src/Listener/` |
| Helper du bouton « Generate with AI » | `vendor/melisplatform/melis-ai-community-extensions/src/View/Helper/MelisGenerateWithAIBtnHelper.php` |
| Table-gateway des actualités | `vendor/melisplatform/melis-ai-community-extensions/src/Model/Tables/NewsTable.php` |
| Implémentation MCP | `vendor/melisplatform/melis-ai-community-extensions/mcp/minitemplatecreator/` |
| Deltas d'installation (initialisation des agents) | `vendor/melisplatform/melis-ai-community-extensions/install/dbdeploy/` |
