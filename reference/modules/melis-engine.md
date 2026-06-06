# MelisEngine

> The page/data engine that powers Melis rendering — page tree, page data, sites, languages,
> templating-plugin base class and the cache system. Package `melisplatform/melis-engine`.

## Purpose

MelisEngine is the read/write data layer that sits between the [MelisCms](/reference/modules)
backoffice and the [MelisFront](/reference/modules) display engine. It resolves a page id into its
full data (tree, languages, SEO, template, styles), builds page links and breadcrumbs, exposes the
site / language / domain catalogue, ships the base class every front-office templating plugin
extends (`MelisTemplatingPlugin`), and provides the multi-layer cache used during rendering. See
[Build a site](/guide/build-a-site) for the end-to-end flow.

## Enable it

`MelisEngine` is a standard Laminas module. It is listed in `config/melis.module.load.php` between
`MelisFront` and the CMS content modules:

```php
// config/melis.module.load.php
'MelisCms',
'MelisFront',
'MelisEngine',
```

It requires `melisplatform/melis-core` and `melisplatform/melis-front` (see `composer.json`), and it
brings in `laminas/laminas-cache` with the Filesystem + Memory storage adapters.

## Key services

Registered as `service_manager` aliases in `config/module.config.php`. The most used:

| Service alias | Role |
| --- | --- |
| `MelisEnginePage` / `MelisPageService` | Page data: `getDatasPage($idPage, $type)`, `getPageById()`, `getPageLanguageList()`, `searchPage()`, `updatePageById()`. `$type` is `published` or `saved`. |
| `MelisEngineTree` / `MelisTreeService` | Page tree & links: `getPageChildren()`, `getPageFather()`, `getPageBreadcrumb()`, `getPageLink()`, `getHomePageLink()`, `getSiteByPageId()`, `getDomainByPageId()`, `getFullDatasPage()`. |
| `MelisEngineSiteService` | Site catalogue: `getSiteById()`, `getSiteDataByDomain()`, `getHomePageBySiteIdAndLangId()`, `getSiteDNDRenderMode()` (drag-drop render mode). |
| `MelisEngineLang` / `MelisEngineLangService` | Languages: `getAvailableLanguages()`, `getSiteLanguage()`, `getLocaleByLangId()`, `getLangByLocale()`. |
| `MelisEngineCacheSystem` | The render cache: `getCacheByKey()`, `setCacheByKey()`, `deleteCacheByPrefix()`, `getRenderMode()`, `isCacheConfActive()`. |
| `MelisEngineTemplateService` | Resolves a template by id: `getTemplate($tplId)`. |
| `MelisEngineSEOService` | Page SEO data: `getSEOById($seoId)`. |
| `MelisSearch` | Full-text indexing/search over pages: `createIndex()`, `search()`, `clearIndex()`, `optimizeIndex()`. |
| `MelisEngineSendMail` | Sends emails (`sendEmail(...)`) using the engine email layout. |
| `MelisEngineSiteDomainService` | Per-environment site domain resolution. |
| `MelisEnginePageDefaultUrlsService` | Default/canonical page URLs. |
| `MelisGdprService` / `MelisGdprAutoDeleteService` | GDPR consent banner texts and auto-delete of stored personal data. |
| `MelisEngineComposer` | Composer helper used by the module setup controllers. |

The `Model/Tables/*` classes are also aliased (e.g. `MelisEngineTablePageTree`,
`MelisEngineTableSite`, `MelisEngineTablePagePublished`) for direct table-gateway access.

## Backoffice

MelisEngine has no end-user tool tree of its own. It exposes a setup/maintenance controller,
`MelisEngine\Controller\MelisSetup` (route `/melis/MelisEngine`, action `setup-form`), plus
post-download / post-update setup controllers used by the installer and updater. It also registers
two form-element factories used elsewhere in the backoffice: `MelisEnginePluginTemplateSelect` and
`MelisEngineSiteSelect`.

## Front office

The class most modules build on lives here:

| Item | Name |
| --- | --- |
| Templating-plugin base class | `MelisEngine\Controller\Plugin\MelisTemplatingPlugin` — abstract `front()`, plus `back()`, `render()`, `createOptionsForms()`, `loadDbXmlToPluginConfig()`, `savePluginConfigToXml()`. |

Every front templating plugin (`MelisCmsSlider`, `MelisCmsNews`, …) extends this class — see
[Plugins](/guide/plugins). The module also provides the engine layout
(`layout/layoutEngine`), the email layout (`MelisEngine/emailLayout`) and the default
no-template / container plugin views, and the cache configurations (`engine_file_cache`,
`engine_memory_cache`, `meliscms_page`, `engine_page_services`, `templating_plugins`) consumed by
`MelisEngineCacheSystem`.

Two listeners expose the page/tree services over the platform micro-service layer
(`MelisEngineMicroServicePageServiceListener`, `MelisEngineTreeServiceMicroServiceListener`); the
exposed methods are declared in `config/app.microservice.php`.

## Database tables

MelisEngine owns the core CMS page/site schema (created from `install/sql/setup_structure.sql` and
the `install/dbdeploy/*.sql` deltas):

| Area | Tables |
| --- | --- |
| Pages | `melis_cms_page_tree`, `melis_cms_page_lang`, `melis_cms_page_published`, `melis_cms_page_saved`, `melis_cms_page_seo`, `melis_cms_page_style`, `melis_cms_page_default_urls` |
| Sites | `melis_cms_site`, `melis_cms_site_domain`, `melis_cms_site_home`, `melis_cms_site_langs`, `melis_cms_site_config`, `melis_cms_site_bundle`, `melis_cms_site_301`, `melis_cms_site_404` |
| Languages / i18n | `melis_cms_lang`, `melis_site_translation`, `melis_site_translation_text` |
| Templates / styles | `melis_cms_template`, `melis_cms_style`, `melis_cms_mini_tpl_category`, `melis_cms_mini_tpl_category_trans`, `melis_cms_mini_tpl_category_template`, `melis_cms_mini_tpl_site_category`, `melis_cms_mini_tpl_flagged_template` |
| Platform / GDPR | `melis_cms_platform_ids`, `melis_cms_gdpr_texts` |

## Example

Resolve a page and build its public link from any service-aware context:

```php
$pageSvc = $this->getServiceManager()->get('MelisEnginePage');
$treeSvc = $this->getServiceManager()->get('MelisEngineTree');

$page = $pageSvc->getDatasPage($idPage, 'published');   // full published page data
$url  = $treeSvc->getPageLink($idPage, true);           // absolute URL
$crumb = $treeSvc->getPageBreadcrumb($idPage);          // breadcrumb trail
```

## Key files

| Concern | Path |
| --- | --- |
| Module config (services, routes, caches) | `vendor/melisplatform/melis-engine/config/module.config.php` |
| Micro-service exposure | `vendor/melisplatform/melis-engine/config/app.microservice.php` |
| Page data service | `vendor/melisplatform/melis-engine/src/Service/MelisPageService.php` |
| Tree / links service | `vendor/melisplatform/melis-engine/src/Service/MelisTreeService.php` |
| Cache system | `vendor/melisplatform/melis-engine/src/Service/MelisEngineCacheSystemService.php` |
| Templating-plugin base class | `vendor/melisplatform/melis-engine/src/Controller/Plugin/MelisTemplatingPlugin.php` |
| Table gateways | `vendor/melisplatform/melis-engine/src/Model/Tables/` |
| Schema + deltas | `vendor/melisplatform/melis-engine/install/sql/`, `install/dbdeploy/` |
