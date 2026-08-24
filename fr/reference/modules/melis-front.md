# MelisFront

> Le système de rendu front-office qui transforme une URL en page publique complète et livre les blocs de contenu (page plugins) que les rédacteurs déposent sur les pages dans le back-office React. Paquet `melisplatform/melis-front`.

## Présentation

MelisFront est le runtime qui résout une adresse web en page Melis, exécute le pipeline de rendu (routage, SEO, plugins de templating, layout, cache, minification des assets) et délivre la réponse HTML au visiteur. Il alimente également l'**aperçu éditable en direct** en restituant n'importe quelle page en mode `melis`. MelisFront ne possède aucune table de base de données — toutes les données de page/site/template/SEO sont lues depuis [melis-engine](/fr/reference/modules/melis-engine), la source de vérité unique.

MelisFront fait partie d'un trio étroitement couplé : [melis-engine](/fr/reference/modules/melis-engine) (couche de données), **melis-front** (rendu front), [melis-cms](/fr/reference/modules/melis-cms) (éditeur back-office). Toute modification de l'un implique régulièrement les deux autres.

## Dans le back-office React

MelisFront n'a **aucun outil React autonome** : pas de brique `ui-react/`, pas de `brick.manifest.json`, pas de `react-api.php` — il n'apparaît jamais dans la barre latérale gauche de `/melis-react`. Toute sa surface back-office se résume à l'ensemble des **page plugins (blocs de contenu)** que vous configurez dans l'**éditeur de page MelisCms**.

Vous rencontrez MelisFront lorsque vous éditez une page : **MelisCms → ouvrir une page → onglet Édition**. Cet onglet Édition est l'éditeur de page classique en glisser-déposer **rendu dans une iframe à l'intérieur du shell React** (`/melis/react-tool-page?key=meliscms_page`). À l'intérieur, vous glissez les blocs de MelisFront sur les zones et ouvrez leur modale de **Propriétés**. React ne fait qu'*héberger* cet éditeur historique ; MelisFront n'apporte aucun composant React qui lui soit propre.

Il existe deux types de blocs :

- **Blocs Tag** édités **en place** sur la page — **HTML** (texte riche) et **Média** (image/fichier). Sans modale.
- **Blocs Config** configurés via une modale de **Propriétés** — **Menu**, **Fil d'Ariane**, **Liste depuis un dossier**, **Bandeau RGPD**. Ils génèrent leur contenu à partir de l'arbre des pages / de la configuration du site.

## Activation

Ajouter dans `config/melis.module.load.php` :

```php
return [
    'MelisFront',
];
```

Dépendance Melis déclarée : `melisplatform/melis-core`. À l'exécution, il consomme également les services de MelisEngine. Ordre de chargement : `melis-core` → **melis-front** → `melis-engine` → `melis-cms`.

## Blocs Tag — édition en place

### HTML (Texte)

Le bloc de référence : une **zone de texte riche** (TinyMCE) pour les titres, paragraphes, liens et contenus formatés. Édité **directement sur la page**, sans modale de Propriétés. Classe de plugin `MelisFrontTagHtmlPlugin`.

![Bloc HTML/Texte dans l'éditeur de page avec la barre d'outils TinyMCE complète](/screenshots/react/melis-front/melisfront-page-plugin-html-tag.png)

### Média

Place une **image ou un fichier** depuis la médiathèque. Également édité en place via une barre d'outils compacte affichant l'emplacement « Add media content here ». Classe de plugin `MelisFrontTagMediaPlugin`.

![Bloc Média en place avec l'emplacement Add media content here](/screenshots/react/melis-front/melisfront-page-plugin-media-tag.png)

## Blocs Config — modale de Propriétés

Les blocs Config se configurent via une petite modale de **Propriétés** rendue par la plateforme. Les deux champs récurrents sont la liste déroulante **Template** (`MelisEnginePluginTemplateSelect`, champ `template_path`) qui choisit la vue `.phtml`, et un **sélecteur de page** (`MelisText` avec un bouton `fa fa-sitemap`) qui définit la page de départ/parente dans l'arbre. Chaque bloc Config déclare sa modale sous forme de `melis.modal_form` (spécification de formulaire Laminas) dans `config/plugins/<Plugin>.config.php` ; il n'y a aucun composant React par plugin.

### Menu

Construit **automatiquement un menu de navigation à partir de l'arbre des pages**. Champs de la modale : **Template** et **Page de départ**. Plugin `MelisFrontMenuPlugin` (champ `pageIdRootMenu`).

![Modale de Propriétés du bloc Menu avec les champs Template et Page de départ](/screenshots/react/melis-front/melisfront-page-plugin-menu-config-properties.png)

### Fil d'Ariane

Affiche le chemin « vous êtes ici » (Accueil › Section › Page). Champs de la modale : **Template** (par défaut `MelisFront/breadcrumb`) et **Page de départ**. Plugin `MelisFrontBreadcrumbPlugin` (champ `pageIdRootBreadcrumb`).

![Modale de Propriétés du bloc Fil d'Ariane avec les champs Template et Page de départ](/screenshots/react/melis-front/melisfront-page-plugin-breadcrumb-config-properties.png)

### Liste depuis un dossier

Prend un **dossier dans l'arbre des pages et liste automatiquement ses pages enfants**. Champs de la modale : **Template** (rendu de chaque élément) et **Page parente** (le dossier source). Plugin `MelisFrontShowListFromFolderPlugin` (champ `pageIdFolder`).

![Modale de Propriétés Liste depuis un dossier avec les champs Template et Page parente](/screenshots/react/melis-front/melisfront-page-plugin-folderlisting-config-properties.png)

### Bandeau RGPD

Le **bandeau de consentement aux cookies** affiché sur le site public. Sa modale ne requiert que le **Template** ; le libellé provient des textes RGPD du site. Plugin `MelisFrontGdprBannerPlugin`.

![Modale de Propriétés du bandeau RGPD avec un unique champ Template](/screenshots/react/melis-front/melisfront-page-plugin-gdprbanner-config-properties.png)

### Champs des modales Config

| Plugin | Champs de la modale (nom / type) | Template par défaut |
| --- | --- | --- |
| Fil d'Ariane | `template_path` (`MelisEnginePluginTemplateSelect`) · `pageIdRootBreadcrumb` (`MelisText`, sitemap) | `MelisFront/breadcrumb` |
| Menu | `template_path` · `pageIdRootMenu` (`MelisText`, sitemap) | `MelisFront/menu` |
| Liste depuis un dossier | `template_path` · `pageIdFolder` (`MelisText`, sitemap) | `MelisFront/show-list-from-folder` |
| Bandeau RGPD | `template_path` uniquement | `MelisFront/gdpr-banner` |

**Apply** renvoie les valeurs via la couche de glisser-déposer, qui les persiste dans le XML de session de la page. React n'intervient pas dans cet aller-retour ; l'interface du plugin est entièrement en PHP/JS historique à l'intérieur de l'iframe d'Édition.

## Services principaux

| Alias de service | Rôle |
| --- | --- |
| `MelisFrontHead` | Gère le `<title>` de la page, la méta description, le canonical et injecte les assets CSS/JS des plugins. |
| `MelisSiteConfigService` | Lit la configuration par site à partir d'une clé, d'une page ou d'une langue — fusion fichier + base de données. |
| `MelisSiteTranslationService` | Recherche et CRUD de clés/textes de traduction par site, mis en cache par site. |
| `MelisTranslationService` | Traductions module/locale (chaînes back-office), mises en cache. |
| `MinifyAssets` | Construit `bundle.css` / `bundle.js` par site en utilisant `matthiasmullie/minify`. |
| `MelisFrontNavigation` | Fabrique de navigation qui construit un arbre `Laminas\Navigation` à partir de l'arbre de pages du moteur. |

## Rendu front

### Routage

La route front principale est un modèle Regex correspondant à `.../id/{idpage}`, distribué vers `MelisFront\Controller\Index::index`. Routes enfants : `/renderMode/melis` (mode édition back-office utilisé par MelisCms) et `/preview` (aperçu de la version enregistrée). Routes spéciales : `sitemap(.xml)`, `/css/plugin-width.css`, `/melissearchindex/…`, `/melispluginrenderer` (rendu AJAX d'un plugin seul), `/minify-assets`.

### Pipeline de rendu (listeners)

Câblés dans `src/Module.php` sur `EVENT_DISPATCH` et `EVENT_FINISH` (~19 listeners au total) :

| Phase | Listeners |
| --- | --- |
| `EVENT_LOAD_MODULES_POST` | `MelisFrontSEORouteListener`, `MelisFrontSiteConfigListener`, `MelisFrontMiniTemplateConfigListener` |
| `EVENT_DISPATCH` | `MelisFrontXSSParameterListener`, `MelisFrontHomePageRoutingListener` / `…HomePageIdOverrideListener`, `MelisFrontSEODispatchRouterRegularUrlListener` (validation de page, 404/301, déclenche `melisfront_site_dispatch_ready`), `MelisFront404To301Listener`, `MelisFront404CatcherListener` |
| `EVENT_FINISH` | `MelisFrontPluginsToLayoutListener` (CSS/JS des plugins), `MelisFrontSEOMetaPageListener` (titre/description/canonical), `MelisFrontAttachCssListener` (CSS de la page), `MelisFrontLayoutListener` (layout front ou layout BO + TinyMCE en mode `melis`), `MelisFrontPageCacheListener`, `MelisFrontMinifiedAssetsCheckerListener` |

### Plugins de templating (controller plugins)

Tous étendent `MelisEngine\Controller\Plugin\MelisTemplatingPlugin`, enregistrés sous `controller_plugins`. Les blocs présentés dans l'éditeur React en sont un sous-ensemble :

| Alias du plugin | Bloc |
| --- | --- |
| `MelisFrontTagHtmlPlugin` | Zone HTML / texte riche éditable en place. |
| `MelisFrontTagTextareaPlugin` | Zone de texte brut. |
| `MelisFrontTagMediaPlugin` | Image / fichier depuis la médiathèque. |
| `MelisFrontMenuPlugin` | Menu de navigation construit à partir de l'arbre des pages. |
| `MelisFrontBreadcrumbPlugin` | Fil d'Ariane (Accueil › … › Page courante). |
| `MelisFrontShowListFromFolderPlugin` | Liste automatiquement les sous-pages d'un dossier sélectionné. |
| `MelisFrontDragDropZonePlugin` | Conteneur de layout (zone de dépôt pour d'autres plugins). |
| `MelisFrontBlockSectionPlugin` | Conteneur bloc/section réutilisable. |
| `MelisFrontGenericContentPlugin` | Bloc de contenu générique. |
| `MelisFrontGdprBannerPlugin` | Bandeau de consentement aux cookies / RGPD. |
| `MelisFrontGdprRevalidationPlugin` | Redemande le consentement lors d'une modification de la politique RGPD. |
| `MelisFrontSearchResultsPlugin` | Affiche les résultats de la recherche interne du site. |
| `MiniTemplatePlugin` | Insère un mini-template pré-construit en un clic. |

### Le contrôleur de rendu de plugin

`MelisFront\Controller\MelisPluginRendererController` restitue un plugin unique à la demande — c'est ce qu'appelle l'iframe d'Édition lorsque vous déposez ou éditez un bloc :

- `getPluginAction()` (route `/melispluginrenderer`) — rendu AJAX d'un plugin.
- `editPluginAction`, `dndLayoutAction`, `dndUpdateOrderAction`, `dndRemoveAction` — les flux de glisser-déposer et d'édition de plugin.

### View helpers

Utilisés dans les templates `.phtml` d'un site (enregistrés sous `view_helpers`) :

| Alias du helper | Usage |
| --- | --- |
| `MelisTag` | Déclare une zone éditable (HTML ou média) que les éditeurs remplissent en place. |
| `MelisLink` | Génère l'URL SEO-friendly d'une page (reste correct si la page est déplacée). |
| `MelisMenu` | Affiche un menu de navigation à partir de l'arbre des pages. |
| `MelisDragDropZone` | Affiche une zone de glisser-déposer hébergeant d'autres plugins. |
| `siteTranslate` | Retourne une chaîne de traduction du site par clé. |
| `SiteConfig` | Lit une valeur de configuration du site. |

Des helpers de langue/accueil pour les liens vers les versions linguistiques et le lien vers la page d'accueil sont également disponibles.

### Navigation

`MelisFrontNavigation` (`src/Navigation/Factory/`) étend la fabrique de navigation Laminas pour construire un objet `Laminas\Navigation` à partir de l'arbre de pages du moteur (`MelisEnginePage` / `MelisEngineTree`), que les helpers Menu et Fil d'Ariane utilisent pour le rendu.

### Minification des assets

`MinifyAssetsService` (basé sur `matthiasmullie/minify`) construit `bundle.css` / `bundle.js` par site. `MelisFrontMinifiedAssetsCheckerListener` les injecte (avec cache-busting) lorsqu'ils sont présents. Déclencher une construction via la route `/minify-assets`.

## Tables de base de données

MelisFront ne possède **aucune table de base de données**. Toutes les données de page, site, langue, SEO et traduction appartiennent à [melis-engine](/fr/reference/modules/melis-engine) et [melis-cms](/fr/reference/modules/melis-cms).

## Exemple

Usage typique dans un template `.phtml` de site et appels de services PHP :

```php
// Inside a site page template (.phtml)
<?= $this->MelisMenu($idPage); ?>                         // navigation menu from the page tree
<a href="<?= $this->MelisLink($targetPageId); ?>">…</a>  // SEO-friendly page link
<?= $this->MelisTag($idPage, 'zone_main', 'html'); ?>    // editable HTML zone
<?= $this->siteTranslate('btn_send'); ?>                  // site translation string
<?= $this->SiteConfig('contact_email'); ?>               // site config value
```

```php
// Reading site config and translations in PHP
$siteConfig = $serviceManager->get('MelisSiteConfigService');
$email = $siteConfig->getSiteConfigByKey('contact_email', $siteId);

$tr = $serviceManager->get('MelisSiteTranslationService')
        ->getEntryByTextAndSiteId('btn_send', $siteId, $langId);
```

```php
// Hooking the render pipeline (after page validation, before render)
$sharedEvents->attach('MelisFront', 'melisfront_site_dispatch_ready', function ($e) {
    $params = $e->getParams(); // page id, site, renderMode…
    // e.g. force a redirect, add data to the layout, A/B-test…
}, 50);
```

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Bootstrap du module + câblage des listeners | `vendor/melisplatform/melis-front/src/Module.php` |
| Routes, services, plugins, helpers, caches | `vendor/melisplatform/melis-front/config/module.config.php` |
| Config des plugins (valeurs par défaut front + `melis.modal_form`) | `vendor/melisplatform/melis-front/config/plugins/` |
| Listeners du pipeline de rendu | `vendor/melisplatform/melis-front/src/Listener/` |
| Services (Head, SiteConfig, Translations, Minify) | `vendor/melisplatform/melis-front/src/Service/` |
| Plugins de templating (blocs de contenu) | `vendor/melisplatform/melis-front/src/Controller/Plugin/` |
| Contrôleur de rendu de plugin | `vendor/melisplatform/melis-front/src/Controller/MelisPluginRendererController.php` |
| View helpers | `vendor/melisplatform/melis-front/src/View/Helper/` |
| Fabrique de navigation | `vendor/melisplatform/melis-front/src/Navigation/Factory/` |

Voir aussi : [melis-engine](/fr/reference/modules/melis-engine), [melis-cms](/fr/reference/modules/melis-cms), [melis-core](/fr/reference/modules/melis-core)
