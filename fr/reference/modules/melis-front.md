# MelisFront

> Le moteur front-office qui affiche les sites Melis aux visiteurs — routage, rendu, SEO, zones de
> glisser-déposer et les principaux view helpers du front. Paquet `melisplatform/melis-front`.

## Objectif

MelisFront est le runtime qui transforme une page Melis publiée en réponse HTML. Il fait correspondre
l'URL entrante à une page, construit le layout de la page, exécute les plugins de templating qu'un
éditeur a déposés dans les zones de glisser-déposer de la page, puis en restitue le rendu. Il prend
aussi en charge les préoccupations transversales du front-office : routage & méta SEO, le sitemap,
les bannières RGPD, la minification des assets, les traductions de site et les view helpers
`MelisTag` / `MelisDragDropZone` / `MelisMenu` utilisés dans les templates de site. C'est le pendant
de [melis-cms](/fr/reference/modules/melis-cms) (édition en backoffice) et de
[melis-engine](/fr/reference/modules/melis-engine) (services de page/données). Voir le guide
[Construire un site](/fr/guide/build-a-site) pour le workflow côté éditeur.

## Activation

MelisFront est un module Laminas standard listé dans `config/melis.module.load.php` (il est activé
par défaut dans le skeleton) :

```php
return [
    // …
    'MelisFront',
    // …
];
```

Il requiert `melisplatform/melis-core` et, à l'exécution, les services de page/données de
`melis-engine` ainsi que les données CMS de `melis-cms`. Son `config/module.load.php` charge les
composants Laminas dont il a besoin (`Laminas\Navigation`, `Laminas\I18n`, `Laminas\Router`,
`Laminas\Form`, `Laminas\Db`, …).

## Services clés

Enregistrés comme alias `service_manager` dans `config/module.config.php` :

| Alias de service | Rôle |
| --- | --- |
| `MelisFrontHead` | Met à jour le `<title>` / la méta description à partir du contenu généré (`updateTitleAndDescription($idPage, $contentGenerated)`) et injecte les ressources CSS/JS des plugins (`updatePluginsRessources($content)`). |
| `MelisSiteConfigService` | Lit la configuration par site — `getSiteConfigByKey($key, $pageId, $section, $language)`, `getSiteConfigByPageId($pageId, $langLocale)`, `getSiteConfig($siteId, $returnAll)`, `getConfig($siteName)`. |
| `MelisSiteTranslationService` | CRUD + recherche des clés/textes de traduction par site (`getSiteTranslation()`, `getText()`, `saveTranslation()`, `cacheTranslations($siteId)`, …). Lit via `MelisSiteTranslationTable` (fourni par la couche CMS). |
| `MelisTranslationService` | Traductions backoffice/locale — `getTranslationsByLocale($locale)`, `translateByLocale($key, $locale)`, `boTranslate($key)`. |
| `MinifyAssets` | Bundle & minifie les CSS/JS d'un site — `minifyAssets($siteId)`, `minifySitesVendorAssets()`, `getSiteBundleData($siteId)`. |
| `MelisFrontNavigation` | Fabrique qui construit l'arbre de navigation du front (`Navigation\Factory\MelisFrontNavigationFactory`). |

## Backoffice

MelisFront est un module front-office : il n'ajoute **aucun outil de backoffice** propre (pas
d'entrée `app.toolstree`). Sa surface côté backoffice est le **mode de rendu éditeur** — lorsqu'une
page est ouverte dans l'éditeur de page du CMS, MelisFront la restitue en `renderMode=melis` (et
`preview`) afin que les plugins affichent leurs contrôles d'édition en place. Les endpoints de
glisser-déposer (`/dnd-layout`, `/dnd-remove`, `/dnd-update-order`) et la route AJAX
`/melispluginrenderer` desservent l'interface de l'éditeur.

## Front office

### Plugins de templating (controller plugins)

Blocs de contenu intégrés que les éditeurs déposent dans une `MelisDragDropZone`, enregistrés sous
`controller_plugins` et configurés dans `config/plugins/*.config.php` :

| Plugin | Bloc |
| --- | --- |
| `MelisFrontTagHtmlPlugin` / `MelisFrontTagTextareaPlugin` / `MelisFrontTagMediaPlugin` | Balises de contenu éditables en place (HTML, texte, média) — la famille `MelisTag`. |
| `MelisFrontDragDropZonePlugin` | Une zone de dépôt qui héberge d'autres plugins (le conteneur de layout). |
| `MelisFrontMenuPlugin` | Restitue un menu de site à partir de l'arbre des pages. |
| `MelisFrontBreadcrumbPlugin` | Restitue un fil d'Ariane. |
| `MelisFrontShowListFromFolderPlugin` | Liste les éléments d'un dossier média. |
| `MelisFrontBlockSectionPlugin` | Un bloc/section partagé et réutilisable. |
| `MelisFrontGenericContentPlugin` | Bloc de contenu générique configurable. |
| `MelisFrontGdprBannerPlugin` / `MelisFrontGdprRevalidationPlugin` | Bannière de consentement RGPD & revalidation. |
| `MiniTemplatePlugin` | Mini-template léger en ligne. |

Ces plugins étendent `MelisEngine\Controller\Plugin\MelisTemplatingPlugin` ; voir
[Plugins](/fr/guide/plugins) pour écrire les vôtres. (`MelisFrontSearchResultsPlugin` existe mais est
commenté en attendant un backend de recherche Laminas.)

### View helpers

Enregistrés comme alias `view_helpers` — à utiliser dans les `.phtml` d'un site :

| Alias du helper | Usage |
| --- | --- |
| `MelisDragDropZone` | Restitue une zone de glisser-déposer où sont placés les plugins. |
| `MelisTag` | Restitue une balise de contenu éditable en place. |
| `MelisMenu` | Restitue un menu de navigation. |
| `MelisLink` / `MelisPageLangLink` / `MelisHomePageLink` | Construisent les URL de page (lien, version de langue, accueil). |
| `siteTranslate` | Traduit une clé de traduction de site. |
| `boTranslate` | Traduit une clé backoffice/locale. |
| `SiteConfig` | Lit une valeur de la configuration du site. |
| `MelisGdprBannerPlugin` / `MelisListFromFolderPlugin` | Restituent la bannière RGPD / la liste de dossier. |

### Routage & listeners

`config/module.config.php` définit les routes du front — la route de page (`Regex` sur
`.../id/{idpage}`), les routes de sitemap (`sitemap.xml` / `sitemap_index` / par langue),
`/melispluginrenderer`, `/minify-assets` et les endpoints de glisser-déposer. Le pipeline de rendu
est assemblé par les listeners attachés dans `src/Module.php`, notamment `MelisFrontLayoutListener`,
`MelisFrontPluginsToLayoutListener`, les listeners SEO (`MelisFrontSEORouteListener`,
`MelisFrontSEOMetaPageListener`, `MelisFrontSEODispatchRouterRegularUrlListener`),
`MelisFront404CatcherListener` / `MelisFront404To301Listener`, `MelisFrontPageCacheListener`,
`MelisFrontMinifiedAssetsCheckerListener`, `MelisFrontHomePageRoutingListener` et
`MelisFrontXSSParameterListener`.

## Tables de base de données

MelisFront ne livre **aucun script SQL d'installation et ne possède aucune table `melis_*`**. Les
tables de pages, sites, langues et traductions qu'il lit (par ex. `MelisSiteTranslationTable`) sont
fournies par [melis-cms](/fr/reference/modules/melis-cms) /
[melis-engine](/fr/reference/modules/melis-engine).

## Exemple

Usage typique dans un template front (dans un `.phtml` d'un module de site) :

```php
<?php // un template de page de site ?>
<title><?= $this->SiteConfig('site_title', $idPage) ?></title>

<?= $this->MelisMenu($idPage) ?>

<main>
    <?= $this->MelisDragDropZone('main_zone', $idPage) ?>
</main>

<footer><?= $this->siteTranslate('footer_copyright') ?></footer>
```

## Fichiers clés

| Sujet | Chemin |
| --- | --- |
| Config du module (routes, services, plugins, helpers, caches) | `vendor/melisplatform/melis-front/config/module.config.php` |
| Config app du front (RGPD, layouts DnD) | `vendor/melisplatform/melis-front/config/app.interface.php` |
| Configs de plugins | `vendor/melisplatform/melis-front/config/plugins/` |
| Listeners (rendu / SEO / cache) | `vendor/melisplatform/melis-front/src/Module.php`, `vendor/melisplatform/melis-front/src/Listener/` |
| Services | `vendor/melisplatform/melis-front/src/Service/` |
| Plugins de templating | `vendor/melisplatform/melis-front/src/Controller/Plugin/` |
| View helpers | `vendor/melisplatform/melis-front/src/View/Helper/` |
| Contrôleurs du front | `vendor/melisplatform/melis-front/src/Controller/` |
