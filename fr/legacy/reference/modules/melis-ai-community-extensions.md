# MelisAICommunityExtensions

> Injecte la génération IA dans les surfaces d'édition CMS existantes — créateur de mini-templates, créateur de contenu d'actualités et boutons IA dans les zones de glisser-déposer. Paquet `melisplatform/melis-ai-community-extensions`.

## Présentation

MelisAICommunityExtensions est une couche applicative au-dessus de la suite MelisAI qui relie la génération IA directement aux surfaces d'édition backoffice existantes. Il enregistre deux instances pré-configurées (`minitemplatecreator` et `newscontentcreator`), deux ensembles d'outils MCP, et un ensemble de listeners d'événements qui gèrent le cycle de vie des assets front-end générés par l'IA (CSS, JS, images). Il n'ajoute pas d'écran d'outil autonome ; il injecte plutôt des boutons **Générer avec l'IA** et des modals de chat dans le Mini Template Manager et l'éditeur d'actualités, ainsi que dans les zones de glisser-déposer.

## Activation

Ajouter dans `config/melis.module.load.php` :

```php
return [
    'MelisAICommunityExtensions',
];
```

Nécessite `melisplatform/melis-ai` `^5.3`. Lancer le dbdeploy après activation — le module initialise les lignes d'agent/instance `minitemplatecreator` et `newscontentcreator` dans les tables du moteur MelisAI (`dbdeploy: true`). Le module s'intègre avec MelisCms et MelisCmsNews.

## Services principaux

| Alias de service | Rôle |
| --- | --- |
| `generateWithAIBtn` (view helper `MelisGenerateWithAIBtnHelper`) | Affiche le bouton réutilisable **Générer avec l'IA** (en utilisant l'`melisAIIcon` du moteur) ; réutilisé sur les trois surfaces d'édition. |

Le module réutilise les tables `melis_ai_instances` / `melis_ai_agents` du moteur — il ne possède pas de tables IA supplémentaires.

## Back-office

Trois surfaces d'édition sont étendues. Dans chacune, un bouton IA ouvre un chat ciblé et le résultat est réécrit dans le champ approprié.

### Créateur de mini-templates IA (MiniTemplateController)

Surcharge le gestionnaire de mini-templates MelisCms pour ajouter un bouton **AI Mini Template Creator** qui ouvre le chat `minitemplatecreator`. Le formulaire manuel **Ajouter un mini-template** gagne également un bouton **Générer avec l'IA** dans la barre d'outils TinyMCE du champ *HTML du template*. Les mini-templates existants portent un badge IA pour les flux de duplication/variation avec l'IA.

| Action | Rôle |
| --- | --- |
| `renderAiChat` | Ouvre le chat `minitemplatecreator` ; passe `siteModule` et un template de référence optionnel. |
| `getMiniTemplatePreviewShell` | Retourne l'enveloppe HTML d'aperçu avec les assets IA injectés. |
| `validateTemplateName` | Valide le nom de template proposé. |
| `checkTemplateAssets` | Vérifie que les assets attendus existent. |
| `getSiteModuleByPageTemplateId` | Résout le module de site d'un template de page. |
| `getAIIcon` / `getGenerateWithAIButton` | Retourne le markup de l'icône et du bouton. |

### Créateur de contenu d'actualités (NewsController)

Ajoute un bouton **Générer avec l'IA** sur chaque **Paragraphe** dans l'onglet **Textes** de l'éditeur d'actualités, par langue. Ouvre le chat `newscontentcreator` ciblé sur cet article (session isolée par article pour éviter les collisions de sessions).

| Action | Rôle |
| --- | --- |
| `renderAiChat` | Ouvre le chat `newscontentcreator` ; définit les **paramètres de sortie** pour router la réponse vers le champ de paragraphe cible ; passe les images de l'article en tant que `custom_files`. |
| `getNewsTitle` | Retourne le titre de l'article d'actualités pour initialiser le message d'accueil du chat. |
| `getGenerateWithAIButton` | Retourne le markup du bouton par paragraphe. |

### Génération avec l'IA dans les zones de glisser-déposer

Les zones de glisser-déposer vides reçoivent un bouton **Générer avec l'IA** injecté. Lorsque l'utilisateur accepte un bloc généré, trois options de validation sont présentées : **Annuler**, **Insérer** (déposer dans cette zone uniquement), ou **Enregistrer et insérer** (déposer et promouvoir en mini-template réutilisable permanent).

### BaseController

`BaseController` fournit `emptyGenericModal` partagé entre les surfaces.

### Listeners d'événements

| Listener | Événement | Effet |
| --- | --- | --- |
| `…TinyMCEConfigurationListener` | `meliscore_tinymce_config` | Pointe le plugin TinyMCE `minitemplate` vers le JS de ce module. |
| `…CreateMiniTemplateListener` | `meliscms_mini_template_manager_create_end` | Déplace les CSS/JS/images temporaires vers le stockage permanent ; renomme le JS d'initialisation par template. |
| `…PublishPageListener` | `meliscms_page_publish_start` | Promeut les assets temporaires référencés par une page publiée ; met à jour `page_content`. |
| `…SanitizeSavedPluginHtmlListener` | `meliscms_page_savesession_plugin_start` | Nettoie le markup runtime carousel/slider (artefacts Owl/Slick/Swiper) avant l'enregistrement. |
| `…DeleteMiniTemplateAssetsListener` | `meliscms_mini_template_manager_delete_end` | Supprime le CSS/JS/images du template. |
| `…AttachAIGeneratedCssListener` | `MvcEvent::EVENT_FINISH` (front + back) | Injecte le CSS/JS IA dans les pages rendues. |
| `…InjectDndAiButtonListener` | `MvcEvent::EVENT_FINISH` | Injecte le bouton **Générer avec l'IA** dans les zones de glisser-déposer. |

Le module enregistre également un `MelisPluginRendererOverride` afin que les assets IA soient injectés correctement lors du rendu des plugins.

## Serveur MCP

Un serveur MCP stdio `minitemplate_creator` (point d'entrée `mcp/minitemplatecreator/bin/server.php`) est enregistré dans `config['mcp']['servers']`. Les outils ci-dessous sont déclarés dans `function_declarations` avec `mcp: true` :

| Outil | Paramètres | Rôle |
| --- | --- | --- |
| `readSiteAssets` | `siteModule`, `templateRequest` | Retourne les fichiers CSS/JS/vues pertinents du site afin que l'IA corresponde au design réel. |
| `getSitePublicUrl` | `siteModule` | Retourne l'URL/domaine public du site pour inspection visuelle avant génération. |
| `uploadMinitemplateImages` | `siteModule`, `image`, `filename` | Enregistre une image (base64/data-URL/HTTP) dans le répertoire temporaire IA et retourne un chemin web pour `<img src>`. |
| `renderMinitemplatePreview` | `siteModule` | Déclenche l'aperçu éditeur du template généré. |

L'agent `minitemplatecreator` dispose également des outils filesystem du moteur (`createFile` / `readFile` / `updateFiles` / …) dans sa liste d'autorisations.

## Tables de base de données

Ce module ne crée aucune table. Ses deltas dbdeploy insèrent des lignes dans les tables détenues par `melis-ai` :

| Table | Contenu |
| --- | --- |
| `melis_ai_instances` | Les instances `minitemplatecreator` et `newscontentcreator` initialisées. |
| `melis_ai_agents` | Les agents initialisés pour les deux instances. |

À l'exécution, les données d'actualités sont accédées via `NewsTable` (`getNewsData($newsId)`), qui joint la table du site pour résoudre le `siteModule` nécessaire au placement des images générées.

## Exemple

Ouvrir le chat `newscontentcreator` ciblé sur un article et relié à un champ de paragraphe spécifique :

```php
// Suffixer l'ID d'instance avec l'ID de l'actualité pour isoler la session par article.
$instanceId = 'newscontentcreator|' . $newsId;

// exitParamArr route la réponse de l'agent vers le champ de paragraphe cible.
$exitParamArr = [
    'masse_exit_input_1'     => $paragraphField,             // ex. 'news_paragraph_1'
    'masse_exit_js_callback' => "setParagraphContent($paragraphField)",
];

// Afficher le chat via le view helper du moteur.
echo $this->AIChatViewHelper(
    $instanceId,
    null,
    ['custom_text' => '...', 'custom_files' => $images],
    false,
    $exitParamArr
);
```

Le schéma général : (1) injecter un `generateWithAIBtn` via `app.toolstree.php` + un listener `EVENT_FINISH` ; (2) ouvrir `AIChatViewHelper(<instance>, …)` avec des paramètres de sortie qui routent la réponse vers le champ hôte ; (3) donner à l'agent des outils MCP qui exposent le contexte hôte ; (4) gérer le cycle de vie temp→permanent des assets générés avec des listeners d'événements CMS.

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Config du module | `vendor/melisplatform/melis-ai-community-extensions/config/module.config.php` |
| Injections UI backoffice | `vendor/melisplatform/melis-ai-community-extensions/config/app.toolstree.php` |
| Interface (câblage bouton + modal) | `vendor/melisplatform/melis-ai-community-extensions/config/app.interface.php` |
| Déclaration des outils MCP | `vendor/melisplatform/melis-ai-community-extensions/config/mcp.tools.php` |
| Contrôleur mini-templates | `vendor/melisplatform/melis-ai-community-extensions/src/Controller/MiniTemplateController.php` |
| Contrôleur actualités | `vendor/melisplatform/melis-ai-community-extensions/src/Controller/NewsController.php` |
| Listeners | `vendor/melisplatform/melis-ai-community-extensions/src/Listener/` |
| Helper bouton Générer avec l'IA | `vendor/melisplatform/melis-ai-community-extensions/src/View/Helper/MelisGenerateWithAIBtnHelper.php` |
| Table-gateway des actualités | `vendor/melisplatform/melis-ai-community-extensions/src/Model/Tables/NewsTable.php` |
| Point d'entrée du serveur MCP | `vendor/melisplatform/melis-ai-community-extensions/mcp/minitemplatecreator/bin/server.php` |
| Répertoire des assets IA | `public/miniTemplatesTinyMce/AI/{siteModule}/{temp\|css\|js\|images}/` |
| Deltas d'installation (initialisation des agents) | `vendor/melisplatform/melis-ai-community-extensions/install/dbdeploy/` |

Voir aussi : [MelisAIEngine](/fr/legacy/reference/modules/melis-ai-engine), [MelisAI](/fr/legacy/reference/modules/melis-ai), [MelisAIToolCreator](/fr/legacy/reference/modules/melis-ai-tool-creator), [MelisCms](/fr/legacy/reference/modules/melis-cms), [MelisCmsNews](/fr/legacy/reference/modules/melis-cms-news)
