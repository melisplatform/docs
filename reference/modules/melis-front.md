# MelisFront

> The front-office engine that displays Melis sites to visitors — routing, rendering, SEO,
> drag-and-drop zones and the core front view helpers. Package `melisplatform/melis-front`.

## Purpose

MelisFront is the runtime that turns a published Melis page into an HTML response. It matches the
incoming URL to a page, builds the page layout, runs the templating plugins an editor dropped into
the page's drag-and-drop zones, and renders the result. It also owns the front-office cross-cutting
concerns: SEO routing & meta, the sitemap, GDPR banners, asset minification, site translations and
the `MelisTag` / `MelisDragDropZone` / `MelisMenu` view helpers used inside site templates. It is the
companion of [melis-cms](/reference/modules/melis-cms) (backoffice editing) and
[melis-engine](/reference/modules/melis-engine) (page/data services). See the
[Build a site](/guide/build-a-site) guide for the editor-facing workflow.

## Enable it

MelisFront is a standard Laminas module listed in `config/melis.module.load.php` (it ships enabled
in the skeleton):

```php
return [
    // …
    'MelisFront',
    // …
];
```

It requires `melisplatform/melis-core` and, at runtime, the page/data services from
`melis-engine` and the CMS data from `melis-cms`. Its `config/module.load.php` pulls in the Laminas
components it needs (`Laminas\Navigation`, `Laminas\I18n`, `Laminas\Router`, `Laminas\Form`,
`Laminas\Db`, …).

## Key services

Registered as `service_manager` aliases in `config/module.config.php`:

| Service alias | Role |
| --- | --- |
| `MelisFrontHead` | Updates the page `<title>` / meta description from the generated content (`updateTitleAndDescription($idPage, $contentGenerated)`) and injects plugin CSS/JS resources (`updatePluginsRessources($content)`). |
| `MelisSiteConfigService` | Reads per-site config — `getSiteConfigByKey($key, $pageId, $section, $language)`, `getSiteConfigByPageId($pageId, $langLocale)`, `getSiteConfig($siteId, $returnAll)`, `getConfig($siteName)`. |
| `MelisSiteTranslationService` | CRUD + lookup of per-site translation keys/texts (`getSiteTranslation()`, `getText()`, `saveTranslation()`, `cacheTranslations($siteId)`, …). Reads via `MelisSiteTranslationTable` (provided by the CMS layer). |
| `MelisTranslationService` | Backoffice/locale translations — `getTranslationsByLocale($locale)`, `translateByLocale($key, $locale)`, `boTranslate($key)`. |
| `MinifyAssets` | Bundles & minifies a site's CSS/JS — `minifyAssets($siteId)`, `minifySitesVendorAssets()`, `getSiteBundleData($siteId)`. |
| `MelisFrontNavigation` | Factory that builds the front navigation tree (`Navigation\Factory\MelisFrontNavigationFactory`). |

## Backoffice

MelisFront is a front-office module: it adds **no backoffice tool** of its own (no `app.toolstree`
entry). Its backoffice-facing surface is the **editor render mode** — when a page is opened in the
CMS page editor, MelisFront re-renders it in `renderMode=melis` (and `preview`) so plugins display
their in-place edit controls. The drag-and-drop endpoints (`/dnd-layout`, `/dnd-remove`,
`/dnd-update-order`) and the AJAX `/melispluginrenderer` route back the editor UI.

## Front office

### Templating plugins (controller plugins)

Built-in content blocks editors drop into a `MelisDragDropZone`, registered under
`controller_plugins` and configured in `config/plugins/*.config.php`:

| Plugin | Block |
| --- | --- |
| `MelisFrontTagHtmlPlugin` / `MelisFrontTagTextareaPlugin` / `MelisFrontTagMediaPlugin` | Inline editable content tags (HTML, text, media) — the `MelisTag` family. |
| `MelisFrontDragDropZonePlugin` | A drop zone that hosts other plugins (the layout container). |
| `MelisFrontMenuPlugin` | Renders a site menu from the page tree. |
| `MelisFrontBreadcrumbPlugin` | Renders a breadcrumb trail. |
| `MelisFrontShowListFromFolderPlugin` | Lists items from a media folder. |
| `MelisFrontBlockSectionPlugin` | A reusable, shared block/section. |
| `MelisFrontGenericContentPlugin` | Generic configurable content block. |
| `MelisFrontGdprBannerPlugin` / `MelisFrontGdprRevalidationPlugin` | GDPR consent banner & revalidation. |
| `MiniTemplatePlugin` | Lightweight inline mini-template. |

These extend `MelisEngine\Controller\Plugin\MelisTemplatingPlugin`; see [Plugins](/guide/plugins) for
how to write your own. (`MelisFrontSearchResultsPlugin` exists but is commented out pending a Laminas
search backend.)

### View helpers

Registered under `view_helpers` aliases — use these inside a site's `.phtml` templates:

| Helper alias | Use |
| --- | --- |
| `MelisDragDropZone` | Renders a drag-and-drop zone where plugins are placed. |
| `MelisTag` | Renders an inline-editable content tag. |
| `MelisMenu` | Renders a navigation menu. |
| `MelisLink` / `MelisPageLangLink` / `MelisHomePageLink` | Build page URLs (link, language version, home). |
| `siteTranslate` | Translate a site translation key. |
| `boTranslate` | Translate a backoffice/locale key. |
| `SiteConfig` | Read a value from the site config. |
| `MelisGdprBannerPlugin` / `MelisListFromFolderPlugin` | Render the GDPR banner / folder list. |

### Routing & listeners

`config/module.config.php` defines the front routes — the page route (`Regex` on `.../id/{idpage}`),
the sitemap routes (`sitemap.xml` / `sitemap_index` / per-lang), `/melispluginrenderer`,
`/minify-assets` and the drag-and-drop endpoints. The render pipeline is assembled by the listeners
attached in `src/Module.php`, including `MelisFrontLayoutListener`, `MelisFrontPluginsToLayoutListener`,
the SEO listeners (`MelisFrontSEORouteListener`, `MelisFrontSEOMetaPageListener`,
`MelisFrontSEODispatchRouterRegularUrlListener`), `MelisFront404CatcherListener` /
`MelisFront404To301Listener`, `MelisFrontPageCacheListener`, `MelisFrontMinifiedAssetsCheckerListener`,
`MelisFrontHomePageRoutingListener` and `MelisFrontXSSParameterListener`.

## Database tables

MelisFront ships **no install SQL and owns no `melis_*` table**. The page, site, language and
translation tables it reads (e.g. `MelisSiteTranslationTable`) are provided by
[melis-cms](/reference/modules/melis-cms) / [melis-engine](/reference/modules/melis-engine).

## Example

Typical front template usage (inside a site module's `.phtml`):

```php
<?php // a site page template ?>
<title><?= $this->SiteConfig('site_title', $idPage) ?></title>

<?= $this->MelisMenu($idPage) ?>

<main>
    <?= $this->MelisDragDropZone('main_zone', $idPage) ?>
</main>

<footer><?= $this->siteTranslate('footer_copyright') ?></footer>
```

## Key files

| Concern | Path |
| --- | --- |
| Module config (routes, services, plugins, helpers, caches) | `vendor/melisplatform/melis-front/config/module.config.php` |
| Front app config (GDPR, DnD layouts) | `vendor/melisplatform/melis-front/config/app.interface.php` |
| Plugin configs | `vendor/melisplatform/melis-front/config/plugins/` |
| Listeners (render / SEO / cache) | `vendor/melisplatform/melis-front/src/Module.php`, `vendor/melisplatform/melis-front/src/Listener/` |
| Services | `vendor/melisplatform/melis-front/src/Service/` |
| Templating plugins | `vendor/melisplatform/melis-front/src/Controller/Plugin/` |
| View helpers | `vendor/melisplatform/melis-front/src/View/Helper/` |
| Front controllers | `vendor/melisplatform/melis-front/src/Controller/` |
