# MelisCmsSlider

> Backoffice slider manager plus a front-office templating plugin that renders a slider on a page.
> Composer package `melisplatform/melis-cms-slider`.

## Purpose

MelisCmsSlider lets editors create **sliders** (named collections of ordered slides) in the
backoffice, then drop them onto front-office pages with the `MelisCmsSliderShowSliderPlugin`
templating plugin. Each slide carries a title, three sub-lines, a link, an image and an
active/inactive status; only active slides are returned to the front render. It is the canonical
small content module to read alongside [Plugins](/guide/plugins).

## Enable it

It's a standard Laminas module. Add it to `config/melis.module.load.php`:

```php
return [
    // …
    'MelisCmsSlider',
];
```

Composer dependencies (`composer.json`): `melis-core`, `melis-engine`, `melis-front`, `melis-cms`.
The module ships `dbdeploy: true`, so its tables are created/updated through
[melis-dbdeploy](/reference/modules). Sliders are managed from the CMS area — see
[Build a site](/guide/build-a-site).

## Key services

Registered as `service_manager` aliases in `config/module.config.php`.

| Alias | Role |
| --- | --- |
| `MelisCmsSliderService` | The slider business logic. Wraps the two table gateways and fires `meliscmsslider_*` events. |
| `MelisCmsSliderTable` | Table gateway for `melis_cms_slider`. |
| `MelisCmsSliderDetailTable` | Table gateway for `melis_cms_slider_details` (slides). |

`MelisCmsSliderService` (extends `MelisCore\Service\MelisGeneralService`) exposes:

| Method | Role |
| --- | --- |
| `getSliderList($start, $limit, $order, $search)` | Paginated/searchable list of sliders (each returned as a full slider entity). |
| `getSlider($sliderId, $status = null)` | One slider with its ordered slides; pass `$status = 1` to keep only active slides. |
| `getSliderByPageId($pageId, $status = null)` | Slider attached to a page id, with its slides. |
| `getSliderDetails($sliderDetailId)` | A single slide row. |
| `saveSlider($slider, $sliderId = null)` | Insert/update a slider; returns the slider id. |
| `saveSliderDetails($sliderDetail, $sliderDetailId = null)` | Insert/update a slide. |
| `updateSliderDetailsOrdering($sliderDetailId, $mcsdetail_order)` | Reorder a slide. |
| `deleteSlider($sliderId)` | Delete a slider and all of its slides. |
| `deleteSliderDetails($sliderDetailId)` | Delete a single slide. |

`getSlider()` / `getSliderByPageId()` return a `MelisCmsSlider\Entity\MelisCmsSlider` whose
`getSliderDetails()` yields the slides.

## Backoffice

The module adds the **Slider manager** tool under the CMS tools tree (`config/app.interface.php` /
`config/app.tools.php`):

- Tools-tree entry `melis_cms_slider_tool` → section melisKey `meliscms_slider_tools_section`.
- A **list** view (`MelisCmsSlider_list`, melisKey `MelisCmsSlider_left_menu`) backed by the
  `MelisCmsSlider_list` table config and `MelisCmsSlider\Controller\MelisCmsSliderListController`.
- A **details** view (slides editor) under
  `MelisCmsSlider\Controller\MelisCmsSliderDetailsController`, with the `MelisCmsSlider_details`
  table config, a properties tab, and add/edit/delete/info slide modals.
- `MelisSetupController` handles first-time setup (`melis-setup/setup-form`).

Backoffice routing is the standard `/melis/MelisCmsSlider/<Controller>/<action>` segment.
`onBootstrap` (in `src/Module.php`) attaches four backoffice listeners:
`MelisCmsSliderFlashMessengerListener`, `MelisCmsSliderServiceMicroServiceListener`,
`MelisCmsSliderTableColumnDisplayListener`, `MelisCmsSliderToolCreatorEditionTypeListener`.

To build your own tool like this one, see [Create a tool](/guide/create-a-tool).

## Front office

A **templating plugin** renders the slider on a page (see [Plugins](/guide/plugins)).

| Plugin | Role |
| --- | --- |
| `MelisCmsSliderShowSliderPlugin` (`src/Controller/Plugin/`) | Fetches the configured slider via `MelisCmsSliderService::getSlider($sliderId, 1)` and passes `pluginId` + `showSlider` (the active slides) to the front template. |

Config: `config/plugins/MelisCmsSliderShowSliderPlugin.config.php` — `configPluginKey` is
`meliscmsslider`, `pluginXmlDbKey` is `melisCmsSlider`. The backoffice form (one
**Properties** tab) lets the editor pick a `template_path` (`MelisEnginePluginTemplateSelect`) and a
`sliderId` (the `CmsSliderSelect` form element, factory `src/Form/Factory/CmsSliderSelectFactory.php`).
Default front template: `MelisCmsSlider/showslider`
(`view/melis-cms-slider/plugins/showslider.phtml`).

Also registered:

| Item | Name | Role |
| --- | --- | --- |
| View helper | `MelisCmsSliderPlugin` (`src/View/Helper/MelisCmsSliderHelper.php`) | Renders the slider plugin from a template: `$this->MelisCmsSliderPlugin($params)`. |
| Form element | `CmsSliderSelect` | A select populated with the available sliders, used in the plugin's option form. |

## Database tables

Created by `install/dbdeploy/` (managed by melis-dbdeploy):

| Table | Role |
| --- | --- |
| `melis_cms_slider` | A slider: `mcslide_id`, `mcslide_name`, `mcslide_page_id`, `mcslide_date`. |
| `melis_cms_slider_details` | Slides: `mcsdetail_id`, `mcsdetail_mcslider_id`, `mcsdetail_status`, `mcsdetail_title`, `mcsdetail_sub1`–`sub3`, `mcsdetail_link`, `mcsdetail_img`, `mcsdetail_order`. |

## Example

Render a slider from a front-office controller using the templating plugin:

```php
// In a controller action
$plugin = $this->MelisCmsSliderShowSliderPlugin();
$pluginView = $plugin->render(['sliderId' => 1]);
$view->addChild($pluginView, 'showSlider');
// In the .phtml: echo $this->showSlider;
```

Or read a slider's active slides directly through the service:

```php
$sliderSrv = $serviceManager->get('MelisCmsSliderService');
$slider = $sliderSrv->getSlider($sliderId, 1); // status 1 = active only
$slides = $slider ? $slider->getSliderDetails() : [];
```

## Key files

| Concern | Path |
| --- | --- |
| Module / config loading | `vendor/melisplatform/melis-cms-slider/src/Module.php` |
| Wiring (services, routes, plugins, helpers) | `vendor/melisplatform/melis-cms-slider/config/module.config.php` |
| Backoffice tools tree | `vendor/melisplatform/melis-cms-slider/config/app.interface.php` |
| Backoffice table config | `vendor/melisplatform/melis-cms-slider/config/app.tools.php` |
| Templating plugin config | `vendor/melisplatform/melis-cms-slider/config/plugins/MelisCmsSliderShowSliderPlugin.config.php` |
| Service | `vendor/melisplatform/melis-cms-slider/src/Service/MelisCmsSliderService.php` |
| Templating plugin | `vendor/melisplatform/melis-cms-slider/src/Controller/Plugin/MelisCmsSliderShowSliderPlugin.php` |
| View helper | `vendor/melisplatform/melis-cms-slider/src/View/Helper/MelisCmsSliderHelper.php` |
| Tables | `vendor/melisplatform/melis-cms-slider/src/Model/Tables/MelisCmsSliderTable.php`, `MelisCmsSliderDetailTable.php` |
| Install SQL | `vendor/melisplatform/melis-cms-slider/install/dbdeploy/83118_cms_slider_install.sql` |

See also: [Module reference](/reference/modules) · [Plugins](/guide/plugins) ·
[Build a site](/guide/build-a-site).
