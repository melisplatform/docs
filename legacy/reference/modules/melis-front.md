# MelisFront

> The front-office rendering system that turns a URL into a finished page and powers the live editable preview. Package `melisplatform/melis-front`.

## Purpose

MelisFront is the runtime that resolves a web address to a Melis page, runs the render pipeline (routing, SEO, templating plugins, layout, caching, asset minification) and delivers the HTML response to the visitor. It also powers the **live, editable preview** inside the back-office (MelisCms) by re-rendering any page in `melis` mode. MelisFront owns no database tables — all page/site/template/SEO data is read from [melis-engine](/legacy/reference/modules/melis-engine), which is the single source of truth.

MelisFront is one of a tightly-coupled trio: [melis-engine](/legacy/reference/modules/melis-engine) (data layer), **melis-front** (front rendering), [melis-cms](/legacy/reference/modules/melis-cms) (back-office). Changes or questions about any one module routinely involve the other two.

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisFront',
];
```

Declared Melis dependency: `melisplatform/melis-core`. At runtime it also consumes MelisEngine services. Load order: `melis-core` → **melis-front** → `melis-engine` → `melis-cms`.

## Key services

| Service alias | Role |
| --- | --- |
| `MelisFrontHead` | Manages page `<title>`, meta description, canonical and injects plugin CSS/JS assets. |
| `MelisSiteConfigService` | Reads per-site configuration by key, page or language — supports file + DB merge. |
| `MelisSiteTranslationService` | Per-site translation key/text lookup and CRUD, cached per site. |
| `MelisTranslationService` | Module/locale translations (back-office strings), cached. |
| `MinifyAssets` | Builds `bundle.css` / `bundle.js` per site using `matthiasmullie/minify`. |
| `MelisFrontNavigation` | Navigation factory that builds a `Laminas\Navigation` tree from the engine page tree. |

## Front office

### Routing

The main front route is a Regex pattern matching `.../id/{idpage}` — dispatched to `MelisFront\Controller\Index::index`. Two child routes extend it:

- `/renderMode/melis` — back-office edit mode (used by MelisCms to render a page for editing).
- `/preview` — preview of the *saved* version (`renderMode: melis`, `preview: true`).

Special routes: `sitemap(.xml)`, `/css/plugin-width.css`, `/melissearchindex/…`, `/melispluginrenderer` (AJAX single-plugin render), `/minify-assets`.

### Render pipeline (listeners)

Wired in `src/Module.php` across `EVENT_DISPATCH` and `EVENT_FINISH` (~19 listeners total):

| Phase | Listeners |
| --- | --- |
| `EVENT_LOAD_MODULES_POST` | `MelisFrontSEORouteListener` (SEO URL routes from DB), `MelisFrontSiteConfigListener`, `MelisFrontMiniTemplateConfigListener` |
| `EVENT_DISPATCH` | `MelisFrontXSSParameterListener`, `MelisFrontHomePageRoutingListener` / `…HomePageIdOverrideListener`, `MelisFrontSEODispatchRouterRegularUrlListener` (page validation, 404/301, fires `melisfront_site_dispatch_ready`), `MelisFront404To301Listener`, `MelisFront404CatcherListener` |
| `EVENT_FINISH` | `MelisFrontPluginsToLayoutListener` (plugin CSS/JS), `MelisFrontSEOMetaPageListener` (title/description/canonical), `MelisFrontAttachCssListener` (page CSS), `MelisFrontLayoutListener` (front layout or BO layout + TinyMCE in `melis` mode), `MelisFrontPageCacheListener`, `MelisFrontMinifiedAssetsCheckerListener` |

### Templating plugins (controller plugins)

All extend `MelisEngine\Controller\Plugin\MelisTemplatingPlugin`. Registered under `controller_plugins`:

| Plugin alias | Block |
| --- | --- |
| `MelisFrontTagHtmlPlugin` | Inline-editable HTML / rich-text zone. |
| `MelisFrontTagTextareaPlugin` | Plain text zone. |
| `MelisFrontTagMediaPlugin` | Image / file from the media library. |
| `MelisFrontMenuPlugin` | Navigation menu built from the page tree. |
| `MelisFrontBreadcrumbPlugin` | Breadcrumb trail (Home › … › Current page). |
| `MelisFrontShowListFromFolderPlugin` | Lists sub-pages from a chosen folder automatically. |
| `MelisFrontDragDropZonePlugin` | Layout container (drop zone for other plugins). |
| `MelisFrontBlockSectionPlugin` | Reusable block/section container. |
| `MelisFrontGenericContentPlugin` | General-purpose content block. |
| `MelisFrontGdprBannerPlugin` | Cookie / GDPR consent banner. |
| `MelisFrontGdprRevalidationPlugin` | Re-asks consent when the GDPR policy changes. |
| `MelisFrontSearchResultsPlugin` | Renders internal site-search results. |
| `MiniTemplatePlugin` | Inserts a pre-built mini-template in one click. |

### View helpers

Used inside a site's `.phtml` templates (registered under `view_helpers`):

| Helper alias | Use |
| --- | --- |
| `MelisTag` | Declares an editable zone (HTML or media) that editors fill in-place. |
| `MelisLink` | Outputs a page's SEO-friendly URL (stays correct if the page moves). |
| `MelisMenu` | Renders a navigation menu from the page tree. |
| `MelisDragDropZone` | Renders a drag-and-drop zone hosting other plugins. |
| `siteTranslate` | Outputs a site translation string by key. |
| `SiteConfig` | Reads a site configuration value. |

Language/home helpers for language-version links and the home-page link are also available.

### Navigation

`MelisFrontNavigation` (`src/Navigation/Factory/`) extends the Laminas navigation factory to build a `Laminas\Navigation` object from the engine's page tree (`MelisEnginePage` / `MelisEngineTree`), which the Menu and Breadcrumb helpers render.

### Asset minification

`MinifyAssetsService` (backed by `matthiasmullie/minify`) builds `bundle.css` / `bundle.js` per site. `MelisFrontMinifiedAssetsCheckerListener` injects them (cache-busted) when present. Trigger a build via the `/minify-assets` route.

## Database tables

MelisFront owns **no database tables**. All page, site, language, SEO and translation data is owned by [melis-engine](/legacy/reference/modules/melis-engine) and [melis-cms](/legacy/reference/modules/melis-cms).

## Example

Typical usage in a site `.phtml` template and PHP service calls:

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

## Key files

| Concern | Path |
| --- | --- |
| Module bootstrap + listener wiring | `vendor/melisplatform/melis-front/src/Module.php` |
| Routes, services, plugins, helpers, caches | `vendor/melisplatform/melis-front/config/module.config.php` |
| Render-pipeline listeners | `vendor/melisplatform/melis-front/src/Listener/` |
| Services (Head, SiteConfig, Translations, Minify) | `vendor/melisplatform/melis-front/src/Service/` |
| Templating plugins (content blocks) | `vendor/melisplatform/melis-front/src/Controller/Plugin/` |
| View helpers | `vendor/melisplatform/melis-front/src/View/Helper/` |
| Navigation factory | `vendor/melisplatform/melis-front/src/Navigation/Factory/` |
| Front controllers | `vendor/melisplatform/melis-front/src/Controller/` |

See also: [melis-engine](/legacy/reference/modules/melis-engine), [melis-cms](/legacy/reference/modules/melis-cms), [melis-core](/legacy/reference/modules/melis-core)
