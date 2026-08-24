# MelisFront

> Le système de rendu front-office qui transforme une URL en page complète et alimente l'aperçu éditable en direct. Paquet `melisplatform/melis-front`.

## Présentation

MelisFront est le runtime qui résout une adresse web en page Melis, exécute le pipeline de rendu (routage, SEO, plugins de templating, layout, cache, minification des assets) et délivre la réponse HTML au visiteur. Il alimente également l'**aperçu éditable en direct** dans le back-office (MelisCms) en restituant n'importe quelle page en mode `melis`. MelisFront ne possède aucune table de base de données — toutes les données de page/site/template/SEO sont lues depuis [melis-engine](/fr/legacy/reference/modules/melis-engine), qui est la source de vérité unique.

MelisFront fait partie d'un trio étroitement couplé : [melis-engine](/fr/legacy/reference/modules/melis-engine) (couche de données), **melis-front** (rendu front), [melis-cms](/fr/legacy/reference/modules/melis-cms) (back-office). Les modifications ou questions concernant l'un de ces modules impliquent régulièrement les deux autres.

## Activation

Ajouter dans `config/melis.module.load.php` :

```php
return [
    'MelisFront',
];
```

Dépendance Melis déclarée : `melisplatform/melis-core`. À l'exécution, il consomme également les services de MelisEngine. Ordre de chargement : `melis-core` → **melis-front** → `melis-engine` → `melis-cms`.

## Services principaux

| Alias de service | Rôle |
| --- | --- |
| `MelisFrontHead` | Gère le `<title>`, la méta description, le canonical et injecte les assets CSS/JS des plugins. |
| `MelisSiteConfigService` | Lit la configuration par site à partir d'une clé, d'une page ou d'une langue — prend en charge la fusion fichier + base de données. |
| `MelisSiteTranslationService` | Recherche et CRUD de clés/textes de traduction par site, mis en cache par site. |
| `MelisTranslationService` | Traductions module/locale (chaînes back-office), mises en cache. |
| `MinifyAssets` | Construit `bundle.css` / `bundle.js` par site en utilisant `matthiasmullie/minify`. |
| `MelisFrontNavigation` | Fabrique de navigation qui construit un arbre `Laminas\Navigation` à partir de l'arbre de pages du moteur. |

## Front office

### Routage

La route front principale est un modèle Regex correspondant à `.../id/{idpage}` — distribué vers `MelisFront\Controller\Index::index`. Deux routes enfants l'étendent :

- `/renderMode/melis` — mode édition back-office (utilisé par MelisCms pour restituer une page en vue de son édition).
- `/preview` — aperçu de la version *enregistrée* (`renderMode: melis`, `preview: true`).

Routes spéciales : `sitemap(.xml)`, `/css/plugin-width.css`, `/melissearchindex/…`, `/melispluginrenderer` (rendu AJAX d'un plugin seul), `/minify-assets`.

### Pipeline de rendu (listeners)

Câblés dans `src/Module.php` sur `EVENT_DISPATCH` et `EVENT_FINISH` (~19 listeners au total) :

| Phase | Listeners |
| --- | --- |
| `EVENT_LOAD_MODULES_POST` | `MelisFrontSEORouteListener` (routes SEO depuis la base de données), `MelisFrontSiteConfigListener`, `MelisFrontMiniTemplateConfigListener` |
| `EVENT_DISPATCH` | `MelisFrontXSSParameterListener`, `MelisFrontHomePageRoutingListener` / `…HomePageIdOverrideListener`, `MelisFrontSEODispatchRouterRegularUrlListener` (validation de page, 404/301, déclenche `melisfront_site_dispatch_ready`), `MelisFront404To301Listener`, `MelisFront404CatcherListener` |
| `EVENT_FINISH` | `MelisFrontPluginsToLayoutListener` (CSS/JS des plugins), `MelisFrontSEOMetaPageListener` (titre/description/canonical), `MelisFrontAttachCssListener` (CSS de la page), `MelisFrontLayoutListener` (layout front ou layout BO + TinyMCE en mode `melis`), `MelisFrontPageCacheListener`, `MelisFrontMinifiedAssetsCheckerListener` |

### Plugins de templating (controller plugins)

Tous étendent `MelisEngine\Controller\Plugin\MelisTemplatingPlugin`. Enregistrés sous `controller_plugins` :

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

`MelisFrontNavigation` (`src/Navigation/Factory/`) étend la fabrique de navigation Laminas pour construire un objet `Laminas\Navigation` à partir de l'arbre de pages du moteur (`MelisEnginePage` / `MelisEngineTree`), que les helpers Menu et Breadcrumb utilisent pour le rendu.

### Minification des assets

`MinifyAssetsService` (basé sur `matthiasmullie/minify`) construit `bundle.css` / `bundle.js` par site. `MelisFrontMinifiedAssetsCheckerListener` les injecte (avec cache-busting) lorsqu'ils sont présents. Déclencher une construction via la route `/minify-assets`.

## Tables de base de données

MelisFront ne possède **aucune table de base de données**. Toutes les données de page, site, langue, SEO et traduction appartiennent à [melis-engine](/fr/legacy/reference/modules/melis-engine) et [melis-cms](/fr/legacy/reference/modules/melis-cms).

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
| Listeners du pipeline de rendu | `vendor/melisplatform/melis-front/src/Listener/` |
| Services (Head, SiteConfig, Translations, Minify) | `vendor/melisplatform/melis-front/src/Service/` |
| Plugins de templating (blocs de contenu) | `vendor/melisplatform/melis-front/src/Controller/Plugin/` |
| View helpers | `vendor/melisplatform/melis-front/src/View/Helper/` |
| Fabrique de navigation | `vendor/melisplatform/melis-front/src/Navigation/Factory/` |
| Contrôleurs front | `vendor/melisplatform/melis-front/src/Controller/` |

Voir aussi : [melis-engine](/fr/legacy/reference/modules/melis-engine), [melis-cms](/fr/legacy/reference/modules/melis-cms), [melis-core](/fr/legacy/reference/modules/melis-core)
