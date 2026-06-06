# MelisDemoCms

> The official Melis Platform demo site — the canonical example of a **site module**.
> Composer package: `melisplatform/melis-demo-cms`.

## Purpose

`MelisDemoCms` is a ready-made, front-office website that ships with Melis Platform. It is not a
backoffice tool: it is a **site** (`type: melisplatform-site`, `extra.melis-site: true`) whose
pages, templates and front controllers demonstrate how to wire MelisFront/MelisEngine rendering to
the CMS content modules — sliders, news, prospects (contact forms), folder listings and a GDPR
banner. Read it as the reference implementation when [building a site](/guide/build-a-site).

## Enable it

`MelisDemoCms` is a standard Laminas module. It is listed in the skeleton's
`config/melis.module.load.php`; the module's own `config/module.load.php` declares the modules it
expects to be loaded alongside it:

```php
// vendor/melisplatform/melis-demo-cms/config/module.load.php
'MelisAssetManager', 'MelisEngine', 'MelisFront',
'MelisCmsNews', 'MelisCmsSlider', 'MelisCmsProspects',
'MelisDemoCms', 'MelisCmsPageScriptEditor'
```

Composer dependencies (`composer.json`): `melis-cms`, `melis-cms-slider`, `melis-cms-prospects`,
`melis-cms-news`, `melis-cms-page-script-editor`; `melis-engine` and `melis-front` are suggested
(and required at runtime to render). The site is served when the vhost sets
`SetEnv MELIS_MODULE "MelisDemoCms"`. Its content (pages, sliders, news…) is installed through the
marketplace **site install** flow rather than a plain SQL dump (see [Database](#database)).

## Key services

| Service alias | Role |
| --- | --- |
| `DemoCmsService` | Site-specific helpers used by the front controllers and listeners. Builds the customised site menu (`customizeSiteMenu()`), injects a date-grouped news submenu into the menu (`getNewsListFormMenu()`), and produces the year/month news filter options (`getNewsListMonthsYears()`). Extends `MelisCore\Service\MelisGeneralService`. |
| `MelisPlatformTable` | Generic table over `melis_core_platform` (`MelisEngine\Model\Tables\MelisGenericTable`, primary key `plf_id`). |

`DemoCmsService` leans on platform services it resolves at runtime — `MelisSiteConfigService`
(MelisFront), `MelisCmsNewsTable` (MelisCmsNews) and `MelisEngineTree` — rather than re-implementing
them.

## Backoffice

This module adds **no backoffice tool** (no toolstree / `melisKey` entries). Its only backoffice
surface is the **site setup** wizard used by the marketplace/installer: controllers
`MelisDemoCms\Controller\MelisSetup`, `…\MelisSetupPostDownload` and `…\MelisSetupPostUpdate`
(routed under `/MelisDemoCms/setup` and `/melis/MelisDemoCms/...`), plus the form view helpers
`DemoSiteFieldRow` / `DemoSiteFieldCollection` used to render the install form. The setup config
lives in `config/setup/download.config.php` and `config/setup/update.config.php`.

## Front office

The site is driven by plain MelisFront site controllers (extending
`MelisFront\Controller\MelisSiteActionController` via the local `BaseController`), one per page
type:

| Controller (invokable) | Page |
| --- | --- |
| `MelisDemoCms\Controller\Home` | Home (carousel + secondary slider, testimonials, GDPR banner) |
| `MelisDemoCms\Controller\News` | News list / details |
| `MelisDemoCms\Controller\Team` | Team |
| `MelisDemoCms\Controller\Services` | Services |
| `MelisDemoCms\Controller\Faq` | FAQ listing & details |
| `MelisDemoCms\Controller\Contact` | Contact (prospects form) |
| `MelisDemoCms\Controller\Testimonial` / `…\Template` / `…\DragDrop` | Testimonials / template demos / drag-drop zones |
| `MelisDemoCms\Controller\Page404` | 404 |

Rather than ship its own plugins, `MelisDemoCms` **supplies front templates** (`view/plugins/*.phtml`)
to the platform's existing [templating plugins](/guide/plugins), wired in
`config/melis.plugins.config.php`:

| Templating plugin (owning module) | Templates provided |
| --- | --- |
| `MelisFrontMenuPlugin` (MelisFront) | `menu`, `white-menu`, `footer-menu` |
| `MelisFrontShowListFromFolderPlugin` (MelisFront) | `faq-listing`, `faq-values`, `home-testimonial-slider` |
| `MelisFrontGdprBannerPlugin` (MelisFront) | `gdpr-banner` |
| `MelisCmsSliderShowSliderPlugin` (MelisCmsSlider) | `home-carousel-slider`, `home-slider2`, `team-slider` |
| `MelisCmsNewsListNewsPlugin` / `…ShowNewsPlugin` / `…LatestNewsPlugin` (MelisCmsNews) | `news-list`, `news-details`, `latest-news-vertical`, `latest-news-horizontal` |
| `MelisCmsProspectsShowFormPlugin` (MelisCmsProspects) | `prospect-form` |

Two event listeners customise rendering:
`SiteMenuCustomizationListener` hooks `MelisFrontMenuPlugin_melistemplating_plugin_end` to rebuild
the menu through `DemoCmsService::customizeSiteMenu()`, and `LatestNewsHorizontalListener` adjusts
the latest-news block. `MelisDemoCmsCreateConfigListener` listens to
`melis_marketplace_site_install_results` to generate the site's `MelisDemoCms.config.php` from the
`.config.stub` after install.

## Database

`MelisDemoCms` defines no `melis_*` tables of its own. Its `MelisPlatformTable` reads the core
`melis_core_platform` table. The demo **content** (pages, templates, sliders, news, prospects
config and per-site config keys) is created at install time by the marketplace site-install process
(`SetupDemoCmsListener` on `melis_install_last_process_start`), keyed off the per-site config in
`config/MelisDemoCms.config.php` (e.g. `home_page_id`, `news_page_id`, `home_page_slider_1_id`).

## Example

A front controller renders a templating plugin by injecting a template path and the page's config
values — the pattern used throughout the site (`HomeController`):

```php
$siteConfigSrv = $this->getServiceManager()->get('MelisSiteConfigService');

$sliderPlugin = $this->MelisCmsSliderShowSliderPlugin();
$homeSlider1 = $sliderPlugin->render([
    'template_path' => 'MelisDemoCms/plugins/home-carousel-slider',
    'id'            => 'homeSlider1',
    'pageId'        => $this->idPage,
    'sliderId'      => $siteConfigSrv->getSiteConfigByKey('home_page_slider_1_id', $this->idPage),
]);
$this->view->addChild($homeSlider1, 'homeSlider1');
```

## Key files

| Concern | Path (under `vendor/melisplatform/melis-demo-cms/`) |
| --- | --- |
| Routes, controllers, services, template map | `config/module.config.php` |
| Template ↔ plugin wiring | `config/melis.plugins.config.php` |
| Per-site config keys (page/slider ids) | `config/MelisDemoCms.config.php`, `config/MelisDemoCms.config.stub` |
| Modules loaded with the site | `config/module.load.php` |
| Site setup forms / flow | `config/setup/download.config.php`, `config/setup/update.config.php` |
| Bootstrap & listeners attach | `src/Module.php` |
| Site helper service | `src/Service/DemoCmsService.php` |
| Front base controller | `src/Controller/BaseController.php` |
| Menu / news / install listeners | `src/Listener/` |
| Front plugin templates | `view/plugins/*.phtml` |
| Page templates | `view/melis-demo-cms/*/*.phtml` |

See also: [Module reference](/reference/modules), [Build a site](/guide/build-a-site),
[Plugins](/guide/plugins).
