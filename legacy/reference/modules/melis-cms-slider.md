# MelisCmsSlider

> Backoffice slider / carousel manager with a front-office templating plugin to display sliders on pages.
> Package `melisplatform/melis-cms-slider`.

## Purpose

MelisCmsSlider provides a back-office tool to build **sliders** (named carousels of ordered slides —
image, title, subtitles, link) and a `MelisCmsSliderShowSliderPlugin` content block that renders a
chosen slider on any front-office page. It also ships a reusable **slider picker** form element that
other modules (News, Blog) embed to attach a slider to a content item.

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    // …
    'MelisCmsSlider',
];
```

Requires: `melis-core`, `melis-engine`, `melis-front`, `melis-cms` (`^5.2`). The module ships
`dbdeploy: true` so its tables are created/updated by melis-dbdeploy.

## Key services

| Alias | Role |
| --- | --- |
| `MelisCmsSliderService` | Business logic for sliders and slides; fires `meliscmsslider_*` events. |
| `MelisCmsSliderTable` | Table gateway for `melis_cms_slider`. |
| `MelisCmsSliderDetailTable` | Table gateway for `melis_cms_slider_details`. |

`MelisCmsSliderService` extends `MelisGeneralService` and exposes:

| Method | Role |
| --- | --- |
| `getSlider($sliderId, $status)` | One slider with its slides; pass `1` to return active slides only. |
| `getSliderByPageId($pageId, $status)` | Slider linked to a page id, with its slides. |
| `getSliderList($start, $limit, $order, $search)` | Paginated/searchable list of sliders. |
| `getSliderDetails($sliderDetailId)` | A single slide row. |
| `saveSlider($data, $sliderId)` | Create or update a slider; returns the slider id. |
| `saveSliderDetails($slideData, $detailId)` | Create or update a slide. |
| `updateSliderDetailsOrdering($detailId, $newOrder)` | Reorder a slide. |
| `deleteSlider($sliderId)` | Delete a slider and all its slides. |
| `deleteSliderDetails($sliderDetailId)` | Delete a single slide. |

`getSlider()` / `getSliderByPageId()` return a `MelisCmsSlider\Entity\MelisCmsSlider` entity whose
`getSlider()` gives the container row and `getSliderDetails()` gives the slides.

**Event naming note:** each method fires `meliscmsslider_service_*_start` / `_end` events, but
several write methods reuse another method's event names in the current source. Specifically,
`saveSlider` fires the `get_slider_details` events, and `deleteSliderDetails` /
`updateSliderDetailsOrdering` reuse `deleteSlider`'s `delete_details` events — so a listener on
`meliscmsslider_service_delete_details_end` also fires on reorders.

**Micro-services** (`config/app.microservice.php`) expose `getSliderList`, `getSlider`,
`getSliderDetails`, `getSliderByPageId`.

## Backoffice

The **Slider manager** is available in the back-office left menu under **CMS** tools. It works as a
three-level drill-down:

| Level | Controller | Role |
| --- | --- | --- |
| Slider list | `MelisCmsSliderListController` | Lists all sliders platform-wide; create / rename modal. |
| Slider slides | `MelisCmsSliderDetailsController` | Lists a slider's slides; add / edit / delete / reorder; image upload to `/media/sliders/`. |
| Setup | `MelisSetupController` | First-time module setup. |

Tool and DataTable configuration lives in `config/app.tools.php` (two tables);
the slide form (fields `mcsdetail_title`, `mcsdetail_sub1`–`sub3`, `mcsdetail_link`,
`mcsdetail_img`, `mcsdetail_order`) is in `config/app.forms.php`.

## Front office

| Item | Role |
| --- | --- |
| `MelisCmsSliderShowSliderPlugin` (controller plugin) | Fetches the configured slider via `MelisCmsSliderService` and renders it through the chosen template. Config: `config/plugins/MelisCmsSliderShowSliderPlugin.config.php` — one **Properties** tab with `template_path` and `sliderId`. Default template: `view/melis-cms-slider/plugins/showslider.phtml`. |
| `MelisCmsSliderPlugin` (view helper) | `MelisCmsSliderHelper` — renders the plugin from a phtml template. |
| `CmsSliderSelect` (form element) | Select populated with available sliders; factory `src/Form/Factory/CmsSliderSelectFactory.php`. Used in the plugin option form and embedded by News / Blog. |

**Reusable picker interfaces:** `meliscmsslider_select_slider` (`renderSelectSliderAction`) for
News, `meliscmsslider_select_slider_blog` for Blog.

**Consumers:** MelisCmsNews persists the chosen slider in `cnews_slider_id` and ships a listener
that detaches a deleted slider from any news using it; Blog uses `cblog_slider_id`.

## Database tables

| Table | Holds |
| --- | --- |
| `melis_cms_slider` | A slider: `mcslide_id`, `mcslide_name`, `mcslide_page_id`, `mcslide_date`. |
| `melis_cms_slider_details` | A slide: `mcsdetail_id`, FK `mcsdetail_mcslider_id`, `mcsdetail_status`, `mcsdetail_title`, `mcsdetail_sub1`–`sub3`, `mcsdetail_link`, `mcsdetail_img`, `mcsdetail_order`. |

## Example

```php
$slider = $this->getServiceManager()->get('MelisCmsSliderService');

// Fetch one slider with active slides only
$one    = $slider->getSlider($sliderId, 1);

// Fetch the slider tied to a page
$byPage = $slider->getSliderByPageId($pageId, 1);

// Paginated list
$list   = $slider->getSliderList(0, 10, 'mcslide_id', null);

// Create / update
$id     = $slider->saveSlider($data, $sliderId);
$did    = $slider->saveSliderDetails($slideData, $detailId);

// Reorder
$slider->updateSliderDetailsOrdering($detailId, $newOrder);

// Delete slider + all its slides
$slider->deleteSlider($sliderId);
```

Listening to a service event:

```php
$sharedEvents->attach(
    'MelisCmsSlider',
    'meliscmsslider_service_delete_details_end',
    $fn,
    50
);
```

## Key files

| Concern | Path |
| --- | --- |
| Module wiring | `vendor/melisplatform/melis-cms-slider/config/module.config.php` |
| Backoffice interface / tools | `vendor/melisplatform/melis-cms-slider/config/app.interface.php` · `app.tools.php` |
| Slide form | `vendor/melisplatform/melis-cms-slider/config/app.forms.php` |
| Micro-service config | `vendor/melisplatform/melis-cms-slider/config/app.microservice.php` |
| Templating plugin config | `vendor/melisplatform/melis-cms-slider/config/plugins/MelisCmsSliderShowSliderPlugin.config.php` |
| Service | `vendor/melisplatform/melis-cms-slider/src/Service/MelisCmsSliderService.php` |
| Entity | `vendor/melisplatform/melis-cms-slider/src/Entity/MelisCmsSlider.php` |
| Table gateways | `vendor/melisplatform/melis-cms-slider/src/Model/Tables/` |
| Slider picker factory | `vendor/melisplatform/melis-cms-slider/src/Form/Factory/CmsSliderSelectFactory.php` |
| View helper | `vendor/melisplatform/melis-cms-slider/src/View/Helper/MelisCmsSliderHelper.php` |
| Default front template | `vendor/melisplatform/melis-cms-slider/view/melis-cms-slider/plugins/showslider.phtml` |

See also: [Module reference](/legacy/reference/modules) · [Plugins](/legacy/guide/plugins) ·
[Build a site](/legacy/guide/build-a-site)
