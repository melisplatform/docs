# MelisCms

> The CMS backoffice — sites, page tree, page editor, templates, styles and SEO.
> Composer package `melisplatform/melis-cms`.

## Purpose

`MelisCms` is the content-management backoffice of Melis Platform. It provides the site tree
explorer, the page editor (Edition, Properties, SEO, Languages tabs), the drag-and-drop plugin
zones used to compose page content, and the administration tools for sites, templates, styles,
languages, platform IDs, domains and site redirects. It writes the page/site data that
[melis-engine](/reference/modules/melis-engine) reads and [melis-front](/reference/modules/melis-front)
renders. For the end-to-end story see [Build a site](/guide/build-a-site).

## Enable it

`MelisCms` is a standard Laminas module. It ships enabled in the skeleton — its name is listed in
`config/melis.module.load.php`:

```php
return [
    'MelisCms',
    // …
];
```

It requires `melisplatform/melis-core`, `melisplatform/melis-engine` and `melisplatform/melis-front`
(declared in its `composer.json`). It has no install SQL of its own; the CMS tables are part of the
platform schema (defined via melis-engine, see below).

## Key services

Registered under `service_manager` in `config/module.config.php`. Resolve them with
`$sm->get('<alias>')`.

| Service alias | Role |
| --- | --- |
| `MelisCmsPageService` | Save a page and its parts: `savePage()`, `savePagePublished()`, `savePageSaved()`, `savePageSeo()`, `savePageLang()`, `savePageStyle()`, `savePageTree()`, `duplicatePage()`, `saveProperties()`. |
| `MelisCmsSiteService` | Manage sites: `saveSite()`, `getSitePages()`, `getAllSites()`, `getSiteById()`, `getSiteByModule()`, `getModulePath()`. |
| `MelisCmsPageGetterService` | `getPageContent($pageId)` — return the full HTML of a page (uses the page cache under `/cache`; the page must have been generated at least once). |
| `MelisCmsRightsService` (alias `MelisCmsRights`) | Resolve user access to interface elements: `isAccessible()`, `getRightsValues()`, `createXmlRightsValues()`, `isActionButtonActive()`. |
| `MelisCmsSitesDomainsService` | Per-environment domains: `getEnvironments()`, `getDomainsBySiteId()`, `getDomainBySiteIdAndEnv()`, `saveSiteDomain()`. |
| `MelisCmsSitesPropertiesService` | Site properties (key/value site settings). |
| `MelisCmsSiteModuleLoadService` | Per-site module loading. |
| `MelisCmsMiniTemplateService` / `MelisCmsMiniTemplateGetterService` | Mini-templates (reusable backoffice content blocks) and their categories: `createMiniTemplate()`, `saveCategory()`, `getTree()`, `getMiniTemplates()`. |
| `MelisCmsPageExportService` / `MelisCmsPageImportService` | Export a page tree to a ZIP and re-import it. |

## Backoffice

`MelisCms` adds the CMS section of the backoffice. The interface tree lives in
`config/app.interface.php` / `config/app.tools.php`; tools are addressed by `melisKey`. Main entries:

| melisKey | Tool |
| --- | --- |
| `meliscms_sitetree` | The site tree explorer (left menu + center page editor). |
| `meliscms_site_tools` | Site administration group. |
| `meliscms_tool_sites` | Sites tool. |
| `meliscms_tool_templates` | Templates tool (`ToolTemplate` controller). |
| `meliscms_tool_styles` | Styles tool (`ToolStyle`). |
| `meliscms_tool_language` | Languages tool. |
| `meliscms_tool_platform_ids` | Platform IDs tool. |
| `meliscms_tool_site_301` | Site redirect (301) tool. |
| `meliscms_mini_template_manager` | Mini-template manager. |

The page editor controllers include `PageController`, `PageEditionController`,
`PagePropertiesController`, `PageSeoController`, `PageLanguagesController` and
`PageDuplicationController`. `FrontPluginsController` powers the in-editor plugin menu and the
plugin-configuration modal used by the drag-and-drop zones.

### Dashboard plugin

`MelisCmsPagesIndicatorsPlugin` (module `meliscms`, action `pageIndicators`) is a backoffice
dashboard widget that surfaces page indicators. See [Plugins](/guide/plugins) for the dashboard
plugin model.

## Front office

`MelisCms` is a backoffice module and ships **no** templating plugins or view helpers of its own —
front rendering is handled by [melis-engine](/reference/modules/melis-engine) and
[melis-front](/reference/modules/melis-front). What it provides on the editing side is the plugin
**authoring** surface: editors drop content blocks into a page's `MelisDragDropZone`, and
`FrontPluginsController` renders the plugin menu, modal forms and saves the chosen parameters into
the page content. Form-element factories such as `MelisCmsPluginSiteSelect` and
`MelisCmsPluginSiteModuleSelect` are reused by other modules' plugin forms.

## Database tables

`MelisCms` operates on the core CMS schema (the table gateways are defined in melis-engine and
consumed by the CMS services):

| Table | Holds |
| --- | --- |
| `melis_cms_site` | Sites. |
| `melis_cms_site_config` | Per-site configuration. |
| `melis_cms_site_domain` | Per-environment domains. |
| `melis_cms_site_home` | Site home page mapping. |
| `melis_cms_site_langs` | Languages enabled per site. |
| `melis_cms_page_tree` | The page tree (hierarchy). |
| `melis_cms_page_saved` | Saved (draft) page content. |
| `melis_cms_page_published` | Published page content. |
| `melis_cms_page_lang` | Page language links. |
| `melis_cms_page_seo` | Per-page SEO. |
| `melis_cms_page_style` | Per-page styles. |
| `melis_cms_page_default_urls` | Default/canonical page URLs. |
| `melis_cms_template` | Templates. |
| `melis_cms_style` | Styles. |
| `melis_cms_lang` | CMS languages. |
| `melis_cms_platform_ids` | Platform IDs (environments). |
| `melis_cms_mini_tpl_category`, `melis_cms_mini_tpl_site_category`, `melis_cms_mini_tpl_category_template` | Mini-template categories and links. |

## Example

Save a page and read back its rendered HTML:

```php
// In a controller / service with the service manager available
$pageSrv = $sm->get('MelisCmsPageService');
$pageId  = $pageSrv->savePage($pageTree, $pagePublished, $pageSaved, $pageSeo, $pageLang, $pageStyle);

$pageGetter  = $sm->get('MelisCmsPageGetterService');
$pageContent = $pageGetter->getPageContent($pageId); // full HTML (page must have been generated once)
```

## Key files

| Concern | Path |
| --- | --- |
| Module config (services, controllers, dashboard plugin) | `vendor/melisplatform/melis-cms/config/module.config.php` |
| Backoffice interface tree | `vendor/melisplatform/melis-cms/config/app.interface.php` |
| Tools (templates, styles, …) | `vendor/melisplatform/melis-cms/config/app.tools.php` |
| Page service | `vendor/melisplatform/melis-cms/src/Service/MelisCmsPageService.php` |
| Site service | `vendor/melisplatform/melis-cms/src/Service/MelisCmsSiteService.php` |
| Page getter (HTML/cache) | `vendor/melisplatform/melis-cms/src/Service/MelisCmsPageGetterService.php` |
| Rights service | `vendor/melisplatform/melis-cms/src/Service/MelisCmsRightsService.php` |
| Page editor plugin controller | `vendor/melisplatform/melis-cms/src/Controller/FrontPluginsController.php` |
| Dashboard plugin | `vendor/melisplatform/melis-cms/src/Controller/DashboardPlugins/MelisCmsPagesIndicatorsPlugin.php` |
| Event listeners | `vendor/melisplatform/melis-cms/src/Listener/` |

## See also

- [Build a site](/guide/build-a-site) — the CMS + engine + front workflow.
- [Plugins](/guide/plugins) — templating and dashboard plugins.
- [Module reference](/reference/modules) — all platform modules.
