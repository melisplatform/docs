# MelisAICommunityExtensions

> Injecte la génération IA dans les surfaces d'édition CMS existantes — créateur de mini-templates, créateur de contenu d'actualités et boutons IA dans les zones de glisser-déposer. Dans le back-office React, il fournit une brique d'extension (injection dans l'hôte) sans page propre. Paquet `melisplatform/melis-ai-community-extensions`.

## Présentation

MelisAICommunityExtensions est une couche applicative au-dessus de la suite MelisAI qui relie la génération IA directement aux surfaces d'édition existantes. Il enregistre deux instances pré-configurées (`minitemplatecreator` et `newscontentcreator`), un ensemble d'outils MCP, et un ensemble de listeners d'événements qui gèrent le cycle de vie des assets front-end générés par l'IA (CSS, JS, images). Il n'a **aucun écran d'outil autonome** ; il injecte plutôt des boutons **Générer avec l'IA** et des modals de chat dans le Mini Template Manager, l'éditeur d'actualités et les zones de glisser-déposer des pages. Le chat IA lui-même est servi par MelisAI / MelisAIEngine — ce module ne fournit que l'interface environnante et le câblage d'entrée/sortie.

## Activation

Ajouter dans `config/melis.module.load.php` :

```php
return [
    'MelisAICommunityExtensions',
];
```

Nécessite `melisplatform/melis-ai`. Lancer le dbdeploy après activation — le module initialise les lignes d'agent/instance `minitemplatecreator` et `newscontentcreator` dans les tables du moteur MelisAI (`dbdeploy: true`). Il s'intègre avec MelisCms et MelisCmsNews.

## Emplacement dans le back-office React

La brique React est une **brique d'extension / d'injection dans l'hôte** : elle ne dessine aucune page et n'ajoute aucune entrée de barre latérale. Au chargement, elle enregistre **deux points d'extension d'hôte** sur `window` que les pages React d'autres modules appellent pour afficher le bouton *Générer avec l'IA* en ligne, ainsi qu'un widget `Header` toujours monté (`MiniTemplateAiDialogHost`) qui ancre le dialogue d'édition de page au-dessus des cadres d'édition legacy.

Comme elle n'a pas de route, il n'y a rien vers quoi naviguer — vous la rencontrez *à l'intérieur d'autres outils* :

- **Éditeur d'actualités** (MelisCmsNews) → onglet **Textes** → bouton par paragraphe.
- **Gestionnaire de mini-templates** (MelisCms) → le champ *HTML du template* → bouton.
- **Édition de page** (glisser-déposer MelisCms) → le bouton du plugin de la zone / de la balise HTML.

**Conditionné par l'activation de deux modules.** Les boutons n'apparaissent que si **les deux** modules `MelisAICommunityExtensions` et `MelisAI` sont actifs (vérifié en direct via le `__melisIsModuleActive` de l'hôte, adossé à `GET /melis/react-api/react-modules`). MelisAI est requis car il sert le chat ; si l'un des deux modules est désactivé en cours de session, les boutons disparaissent sans rechargement. La brique n'apporte **aucun nœud de capacité** — la visibilité repose uniquement sur cette vérification à deux modules.

## Surfaces d'édition du back-office

Trois surfaces d'édition sont étendues. Dans chacune, un bouton IA ouvre un chat ciblé et le résultat est réécrit dans le champ approprié.

### Créateur de mini-templates IA

Dans le gestionnaire de mini-templates, le champ *HTML du template* porte un bouton **Générer avec l'IA** affiché par le point d'extension `renderHtmlActions()`. Il ouvre un dialogue plein écran : **chat IA + liste des templates existants à gauche, aperçu en direct à droite** (les deux panneaux se replient en onglets segmentés *IA & Templates / Aperçu* sur les faibles largeurs). Le chat utilise l'instance `minitemplatecreator`, repart de zéro à chaque ouverture (`clearSession`) et recharge l'enveloppe réelle du site à chaque résultat de l'IA afin que le CSS/JS fraîchement écrit soit reflété.

![Le gestionnaire de mini-templates, liste par site avec le point d'entrée Générer avec l'IA](/screenshots/react/melis-ai-community-extensions/melisaicomext-tooloverride-minitplmanager-list.png)

![Le chat minitemplatecreator générant un template, prévisualisé sur l'enveloppe réelle du site](/screenshots/react/melis-ai-community-extensions/melisaicomext-tooloverride-minitplmanager-createwithai.png)

Chaque ligne de la liste des templates affiche une **icône Melis-AI** : cliquez dessus pour générer un nouveau template en utilisant celui-ci comme référence de base (le chat est relancé en étant initialisé avec le markup du template sélectionné). **Insérer** capture une vignette PNG de l'aperçu (html2canvas) et remplit le formulaire ; la soumission propre du formulaire l'enregistre.

![L'icône Melis-AI sur une ligne de template — décliner ou dupliquer un template existant avec l'IA](/screenshots/react/melis-ai-community-extensions/melisaicomext-tooloverride-minitplmanager-duplicatewithai.png)

![Le formulaire Ajouter un mini-template — Générer avec l'IA à côté du champ HTML](/screenshots/react/melis-ai-community-extensions/melisaicomext-tooloverride-minitplmanager-addminitpl.png)

### Créateur de contenu d'actualités

Dans l'onglet **Textes** de l'éditeur d'**actualités**, chaque **Paragraphe** reçoit un bouton **Générer avec l'IA** (par langue) affiché par le point d'extension `renderParagraphActions()`. Il ouvre un modal compact avec le chat `newscontentcreator`, **ciblé sur l'article** (initialisé avec le titre, le sous-titre, les autres paragraphes et les images de l'article). La réponse remplace le texte de ce paragraphe et le marque comme validé. Les sessions sont isolées par article via un identifiant d'instance `newscontentcreator|<newsId>`.

![L'onglet Textes des actualités — la barre d'en-tête de chaque paragraphe porte l'action Générer avec l'IA](/screenshots/react/melis-ai-community-extensions/melisaicomext-tooloverride-news-edit-tab-texts.png)

![Le chat newscontentcreator, conscient du contexte de l'article](/screenshots/react/melis-ai-community-extensions/melisaicomext-tooloverride-news-edit-tab-texts-aicreator.png)

### Génération avec l'IA dans les zones de glisser-déposer

Lors de l'édition d'une page CMS, les **zones de glisser-déposer** vides (et les plugins de balise HTML) reçoivent un bouton **Générer avec l'IA** injecté. Comme l'édition de page est une iframe legacy sous l'enveloppe React, le bouton demande à l'hôte React d'ouvrir le *même* dialogue de mini-template que ci-dessus. À la validation, trois options de commit sont proposées : **Fermer**, **Insérer** (déposer dans cette zone uniquement), ou **Enregistrer et insérer** (déposer et promouvoir en plus le bloc en mini-template réutilisable permanent).

![Une zone de glisser-déposer vide avec le bouton Générer avec l'IA injecté](/screenshots/react/melis-ai-community-extensions/melisaicomext-pageoverride-dragdropzone-generateaibutton-1.png)

![Un bloc entièrement stylé généré directement dans la zone de la page](/screenshots/react/melis-ai-community-extensions/melisaicomext-pageoverride-dragdropzone-generateaibutton-2.png)

![Le choix de commit Fermer / Insérer / Enregistrer et insérer pour un bloc généré](/screenshots/react/melis-ai-community-extensions/melisaicomext-pageoverride-dragdropzone-generateaibutton-differentinserts.png)

## La brique

`ui-react/` est une bibliothèque Vite IIFE (nom `MelisAiCommunityExtensionsBrick`, sortie `public/ui-react/brick.js`). React, react-dom et react-router-dom sont externalisés vers les globales de l'hôte ; un alias `@melis-ai-engine` importe le composant de chat partagé `AiChatContainer`.

| Fichier | Rôle |
| --- | --- |
| `src/brick.tsx` | Enregistre les deux points d'extension + le `Header` ; injecte Tailwind une seule fois. |
| `src/NewsAiExtension.tsx` | `renderParagraphActions()` → bouton par paragraphe + modal (instance `newscontentcreator`). |
| `src/MiniTemplateAiExtension.tsx` | `renderHtmlActions()` → le `MiniTemplateAiDialog` plein écran (chat + liste + aperçu ; Insérer / Enregistrer et insérer ; vignette html2canvas). |
| `src/MiniTemplateAiDialogHost.tsx` | L'ancre `Header` pour l'**édition de page** ; écoute `melis-ai-minitemplate-open` et monte le dialogue. |

La brique s'enregistre **sans `Component`** et **sans `Sidebar`** — uniquement des points d'extension protégés et l'ancre `Header` :

```ts
window.__melisNewsExtensions.renderParagraphActions = /* guarded by isModuleActive() */
window.__melisMiniTemplateExtensions.renderHtmlActions = /* guarded by isModuleActive() */
window.__melisRegisterBrick?.({ id: 'melis-ai-community-extensions', Header: MiniTemplateAiDialogHost })
```

## Endpoints appelés par la brique

La brique n'a **pas de `config/react-api.php`**. Elle consomme des endpoints détenus par d'autres modules, plus une action MVC legacy qui lui est propre :

| Appel | Propriétaire |
| --- | --- |
| `GET /melis/react-api/cms-mini-templates?site=<m>&limit=9999` | MelisCms (liste des templates) |
| `GET /melis/react-api/cms-mini-templates/item?site=<m>&name=<n>` | MelisCms (HTML d'un template) |
| `GET /melis/MelisAICommunityExtensions/MiniTemplate/getMiniTemplatePreviewShell?siteModule=<m>` | ce module (MVC legacy ; retourne le HTML de l'enveloppe du site) |
| trafic run/exit de `AiChatContainer` | MelisAI / MelisAIEngine |

La réponse du chat est routée vers le champ hôte via un callback `window` déclaré dans les paramètres de sortie (`masse_exit_js_callback`) : `__melisNewsAiCallback_<paraIdx>` pour les actualités, `__melisMiniTemplateAiCallback` pour les mini-templates.

## Intégration à l'hôte (passerelle d'édition de page)

L'édition de page s'exécute plusieurs cadres sous l'enveloppe React, aussi `MiniTemplateAiDialogHost` définit `window.__melisAiMiniTemplateDialogReady = true` et écoute un événement `melis-ai-minitemplate-open`. La page éditée exécute `public/js/minitemplate/react-bridge.js`, qui remonte **la chaîne des cadres** à la recherche de `__melisAiMiniTemplateDialogReady` ; lorsqu'il le trouve, il dispatche l'événement d'ouverture avec des callbacks `onInsert` / `onSaveInsert` de même origine. Si aucun hôte React n'est trouvé (legacy `/melis`), la passerelle se rabat sur le modal Bootstrap historique — rien n'y change.

Pour les outils legacy affichés dans la vue React **« Old »**, `config/module.config.php` enregistre `melis_react_override.toolpage_extensions` → `PluginViewToolPageExtension`, qui injecte les `tool.js` / `style.css` de ce module afin que les jsCallbacks greffés sur les outils MelisCms / MelisCmsNews trouvent leurs globales.

## Listeners d'événements

| Listener | Événement | Effet |
| --- | --- | --- |
| `…TinyMCEConfigurationListener` | `meliscore_tinymce_config` | Pointe le plugin TinyMCE `minitemplate` vers le JS de ce module. |
| `…CreateMiniTemplateListener` | `meliscms_mini_template_manager_create_end` | Déplace les CSS/JS/images temporaires vers le stockage permanent ; renomme le JS d'initialisation par template. |
| `…PublishPageListener` | `meliscms_page_publish_start` | Promeut les assets temporaires référencés par une page publiée ; met à jour `page_content`. |
| `…SanitizeSavedPluginHtmlListener` | `meliscms_page_savesession_plugin_start` | Nettoie le markup runtime carousel/slider (artefacts Owl/Slick/Swiper) avant l'enregistrement. |
| `…DeleteMiniTemplateAssetsListener` | `meliscms_mini_template_manager_delete_end` | Supprime le CSS/JS/images du template. |
| `…AttachAIGeneratedCssListener` | `MvcEvent::EVENT_FINISH` (front + back) | Injecte le CSS/JS IA dans les pages rendues. |
| `…InjectDndAiButtonListener` | `MvcEvent::EVENT_FINISH` | Injecte le bouton **Générer avec l'IA** dans les zones de glisser-déposer legacy. |

Le module enregistre également un `MelisPluginRendererOverride` afin que les assets IA soient injectés correctement lors du rendu des plugins.

## Serveur MCP

Un serveur MCP stdio `minitemplate_creator` (point d'entrée `mcp/minitemplatecreator/bin/server.php`) est enregistré dans `config['mcp']['servers']`. Les outils ci-dessous sont déclarés avec `mcp: true` :

| Outil | Paramètres | Rôle |
| --- | --- | --- |
| `readSiteAssets` | `siteModule`, `templateRequest` | Retourne les fichiers CSS/JS/vues pertinents du site afin que l'IA corresponde au design réel. |
| `getSitePublicUrl` | `siteModule` | Retourne l'URL/domaine public du site pour inspection visuelle avant génération. |
| `uploadMinitemplateImages` | `siteModule`, `image`, `filename` | Enregistre une image (base64/data-URL/HTTP) dans le répertoire temporaire IA et retourne un chemin web pour `<img src>`. |
| `renderMinitemplatePreview` | `siteModule` | Déclenche l'aperçu éditeur du template généré. |

L'agent `minitemplatecreator` dispose également des outils filesystem du moteur (`createFile` / `readFile` / `updateFiles` / …) dans sa liste d'autorisations. En cours de conversation, le dialogue React enregistre `window.melisReactActionMap.preview_minitemplate` afin que le moteur puisse pousser le bloc `html` généré dans l'aperçu en direct lorsque `render_minitemplate_preview` retourne.

## Tables de base de données

Ce module ne crée aucune table qui lui soit propre. Ses deltas dbdeploy insèrent des lignes dans les tables détenues par `melis-ai` :

| Table | Contenu |
| --- | --- |
| `melis_ai_instances` | Les instances `minitemplatecreator` et `newscontentcreator` initialisées. |
| `melis_ai_agents` | Les agents initialisés pour les deux instances. |

À l'exécution, les données d'actualités sont accédées via `NewsTable` (`getNewsData($newsId)`), qui joint la table du site pour résoudre le `siteModule` nécessaire au placement des images générées.

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Config du module (route MVC, toolpage_extensions) | `vendor/melisplatform/melis-ai-community-extensions/config/module.config.php` |
| Source de la brique | `vendor/melisplatform/melis-ai-community-extensions/ui-react/src/` |
| Brique compilée | `vendor/melisplatform/melis-ai-community-extensions/public/ui-react/{brick.js, brick.manifest.json}` |
| Passerelle de cadres d'édition de page | `vendor/melisplatform/melis-ai-community-extensions/public/js/minitemplate/react-bridge.js` |
| Déclaration des outils MCP | `vendor/melisplatform/melis-ai-community-extensions/config/mcp.tools.php` |
| Contrôleur mini-templates | `vendor/melisplatform/melis-ai-community-extensions/src/Controller/MiniTemplateController.php` |
| Contrôleur actualités | `vendor/melisplatform/melis-ai-community-extensions/src/Controller/NewsController.php` |
| Injecteur de vue « Old » | `vendor/melisplatform/melis-ai-community-extensions/src/Controller/React/PluginViewToolPageExtension.php` |
| Listeners | `vendor/melisplatform/melis-ai-community-extensions/src/Listener/` |
| Helper du bouton Générer avec l'IA | `vendor/melisplatform/melis-ai-community-extensions/src/View/Helper/MelisGenerateWithAIBtnHelper.php` |
| Table-gateway des actualités | `vendor/melisplatform/melis-ai-community-extensions/src/Model/Tables/NewsTable.php` |
| Point d'entrée du serveur MCP | `vendor/melisplatform/melis-ai-community-extensions/mcp/minitemplatecreator/bin/server.php` |
| Répertoire des assets IA | `public/miniTemplatesTinyMce/AI/{siteModule}/{temp\|css\|js\|images}/` |
| Deltas d'installation (initialisation des agents) | `vendor/melisplatform/melis-ai-community-extensions/install/dbdeploy/` |

Voir aussi : [MelisAIEngine](/fr/reference/modules/melis-ai-engine), [MelisAI](/fr/reference/modules/melis-ai), [MelisAIToolCreator](/fr/reference/modules/melis-ai-tool-creator), [MelisCms](/fr/reference/modules/melis-cms), [MelisCmsNews](/fr/reference/modules/melis-cms-news)
