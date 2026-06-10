# MelisDemoCms

> The official Melis Platform reference/demo website — a ready-to-install **site module** that
> teaches developers how a Melis front-office site is wired. Package `melisplatform/melis-demo-cms`.

## Purpose

`MelisDemoCms` is a complete, installable front-office website (`melis-site: true`,
`type: melisplatform-module`, category `cms`). It is not a backoffice tool: its pages, controllers
and plugin templates demonstrate the three content-composition techniques — **manual plugin
placement**, **drag-and-drop zones** and **inline editable tags** — using MelisFront, MelisEngine
and the CMS content modules (slider, news, prospects). Use it as the reference implementation when
[building a site](/guide/build-a-site).

## Enable it

`MelisDemoCms` is a Laminas site module installed under `module/MelisSites/MelisDemoCms/` by
Composer's `installer-paths`. Its own `config/module.load.php` declares the modules it expects to
be loaded alongside it:

```php
// vendor/melisplatform/melis-demo-cms/config/module.load.php
'MelisAssetManager', 'MelisEngine', 'MelisFront',
'MelisCmsNews', 'MelisCmsSlider', 'MelisCmsProspects',
'MelisDemoCms', 'MelisCmsPageScriptEditor'
```

Required Composer dependencies: `melis-cms`, `melis-cms-slider`, `melis-cms-prospects`,
`melis-cms-news`, `melis-cms-page-script-editor` (`^5.2`). `melis-engine` and `melis-front` are
suggested (and required at runtime). The site is activated for a domain by setting the vhost
environment variable `MELIS_MODULE "MelisDemoCms"`.

## Key services

| Service alias | Role |
| --- | --- |
| `DemoCmsService` | Site-specific helpers used by the front controllers and setup listeners. |
| `MelisPlatformTable` | Generic table gateway over the core platform table (`MelisEngine\Model\Tables\MelisGenericTable`, primary key `plf_id`). |

## Backoffice

This module adds no backoffice toolstree entries. Its only backoffice surface is the **site setup
wizard** used by the marketplace/installer: controllers `MelisDemoCms\Controller\MelisSetupController`
(route `/MelisDemoCms/setup`), `MelisSetupPostDownloadController` and
`MelisSetupPostUpdateController`. Setup configuration lives in `config/setup/download.config.php`
and `config/setup/update.config.php`.

## Front office

The site is driven by plain MelisFront site controllers, one per page type:

| Controller | Page |
| --- | --- |
| `MelisDemoCms\Controller\Home` | Home (carousel + secondary slider, testimonials, GDPR banner) |
| `MelisDemoCms\Controller\News` | News list / news details |
| `MelisDemoCms\Controller\Team` | Team |
| `MelisDemoCms\Controller\Services` | Services list / details |
| `MelisDemoCms\Controller\Faq` | FAQ listing and category blocks |
| `MelisDemoCms\Controller\Contact` | Contact / prospects form |
| `MelisDemoCms\Controller\Testimonial` | Testimonial |
| `MelisDemoCms\Controller\Template` | Template demos (static / drag-drop / mixed) |
| `MelisDemoCms\Controller\Page404` | 404 error page |

Rather than ship its own plugins, `MelisDemoCms` supplies **plugin template overrides**
(`view/plugins/*.phtml`) wired in `config/melis.plugins.config.php`:

| Templating plugin (owning module) | Templates provided by this site |
| --- | --- |
| `MelisFrontMenuPlugin` (MelisFront) | `menu`, `white-menu`, `footer-menu` |
| `MelisFrontShowListFromFolderPlugin` (MelisFront) | `faq-listing`, `faq-values`, `home-testimonial-slider` |
| `MelisFrontGdprBannerPlugin` (MelisFront) | `gdpr-banner` |
| `MelisCmsSliderShowSliderPlugin` (MelisCmsSlider) | `home-carousel-slider`, `home-slider2`, `team-slider` |
| `MelisCmsNewsListNewsPlugin` / `…ShowNewsPlugin` / `…LatestNewsPlugin` (MelisCmsNews) | `news-list`, `news-details`, `latest-news-vertical`, `latest-news-horizontal` |
| `MelisCmsProspectsShowFormPlugin` (MelisCmsProspects) | `prospect-form` |

### The three composition techniques

| Technique | How it works | Example pages |
| --- | --- | --- |
| **Manual placement** | Plugin instantiated in the controller, rendered with params, added as a view child — view echoes it. | Home, Team (slider), News, FAQ, Contact |
| **Drag-and-drop zone** | `.phtml` declares a named zone; back-office editor drops any plugin in; no controller code. | DragDrop, Template showcases |
| **Inline editable tags** | `MelisTag` wraps a default value in the view; back-office user edits copy/images in place. | Services, Testimonial, 404 |

### Listeners

`SetupDemoCmsListener` drives the site install process.
`MelisDemoCmsCreateConfigListener` writes `MelisDemoCms.config.php` from the `.config.stub` after a
marketplace install. `SiteMenuCustomizationListener` customises the front menu.
`LatestNewsHorizontalListener` adjusts the latest-news plugin output.

## Database

`MelisDemoCms` defines no `melis_*` tables of its own. `MelisPlatformTable` reads the core
`melis_core_platform` table. All demo content (pages, templates, sliders, news, config keys) is
created at install time by the setup listeners, keyed off `config/MelisDemoCms.config.php` values
such as `home_page_id`, `news_page_id` and `home_page_slider_1_id`.

## Example

A front controller renders a templating plugin by injecting a site-specific template path and a
config-driven ID — the pattern used throughout the site (`HomeController`):

```php
$cfg = $this->getServiceManager()->get('MelisSiteConfigService');

$slider = $this->MelisCmsSliderShowSliderPlugin();
$homeSlider1 = $slider->render([
    'template_path' => 'MelisDemoCms/plugins/home-carousel-slider',
    'id'            => 'homeSlider1',
    'pageId'        => $this->idPage,
    'sliderId'      => $cfg->getSiteConfigByKey('home_page_slider_1_id', $this->idPage),
]);
$this->view->addChild($homeSlider1, 'homeSlider1');
// view: <?= $this->homeSlider1 ?>
```

A drag-and-drop zone requires a single call in the view — no controller code:

```php
<?= $this->MelisDragDropZone($this->idPage, 'dragdropzone_home_1') ?>
```

An inline editable tag with a default value:

```php
<?= $this->MelisTag($this->idPage, 'static-html-1', 'html', '<h1>Accessible…</h1>') ?>
```

## Key files

| Concern | Path (under `vendor/melisplatform/melis-demo-cms/`) |
| --- | --- |
| Routes, controllers, template map | `config/module.config.php` |
| Modules loaded with the site | `config/module.load.php` |
| Plugin template overrides wiring | `config/melis.plugins.config.php` |
| Per-site config keys (page / slider / folder IDs) | `config/MelisDemoCms.config.php`, `…config.stub` |
| Site setup flow | `config/setup/download.config.php`, `config/setup/update.config.php` |
| Bootstrap and listener registration | `src/Module.php` |
| Site helper service | `src/Service/DemoCmsService.php` |
| Setup and post-install controllers | `src/Controller/MelisSetupController.php`, `…PostDownloadController.php`, `…PostUpdateController.php` |
| Install / menu / news listeners | `src/Listener/` |
| Plugin templates | `view/plugins/*.phtml` |
| Page views | `view/melis-demo-cms/*/*.phtml` |
| Template demos | `view/melis-demo-cms/template/` |

See also: [Module reference](/reference/modules), [Build a site](/guide/build-a-site),
[Plugins](/guide/plugins).
