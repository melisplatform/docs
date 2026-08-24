# MelisDesign

> Back-office design catalog / pattern library: ~60 ready-made HTML/JS screens built on the
> MelisCore admin theme. Package `melisplatform/melis-design`.

## Purpose

MelisDesign ships no database, no services, and no business logic — it is a pure view and asset
reference. Each demo page is a controller that renders a `.phtml` showing how a given screen or
widget looks with MelisCore's CSS already applied. The intended workflow is to find the closest
design in the catalog, copy its markup (and JS if needed) into your own module, and wire it to
your own data. As the README states: *"All styles are already included with MelisCore. There is no
need to look for CSS. Just find the HTML and JS if needed and start coding a plugin!"*

It depends only on **`melisplatform/melis-core`** (`^5.2`) for the theme and assets.

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisDesign',
];
```

`melis-cms` is expected to be present in the platform as well.

## Backoffice

The module surfaces as a single tool in the back office, listed under
`meliscore_toolstree_section` with the melisKey `meliscore_tool_creatrion_designs`. It appears in
the left menu as **HTML** (`melisdesign_cof`), which enumerates all ~60 demo pages. Clicking a
page renders that design full-screen — read-only, nothing to configure or save.

Designs are grouped as follows:

| Group | Demos |
| --- | --- |
| App shells & profiles | Dashboard · Profile / Resume · Portfolio · Edit Account · Social · Ratings |
| Support / community | Support Tickets · Forum Overview · Forum Post · Q&A Listing · Q&A Page · Knowledge Base · Survey |
| Commerce & finance | Pricing Tables · Finances · Invoice · Bookings · Add Product · Products |
| Medical (vertical demo) | Medical Overview · Patients · Appointments · Memos · Metrics |
| Maps | Google Maps · Clustering · Extend · Filter · Search · JSON · Vector Maps |
| Media & galleries | Photo Gallery · Gallery Video · Carousel · Sliders |
| Data & layout | Tables · Responsive Tables · Grid System · Charts · Calendar · Events · Contacts · Timelines · Widgets |
| UI elements | Buttons · Icons · Typography · Alerts & Notifications · Modals · Tabs |
| Forms | Form Wizards · Form Elements · Form Validator |
| Files & messaging | File Manager · Inbox |
| Auth & errors | Login · Signup · Error |

The **HTML** sub-menu is declared in `config/app.interface.php`; each entry `forward`s to its
controller. `DesignSidebarController` renders the left navigation and exposes two AJAX helpers:
`getDomAction()` (returns the sidebar DOM via `MelisCoreTool::getViewContent`) and
`getResourceAction()` (returns a design's resource config from `melisdesign/datas/<key>` in
`MelisCoreConfig`).

## Database tables

None. MelisDesign ships no install SQL and no database schema.

## Example

Reuse a design in your own module — the intended workflow:

```php
// 1. Browse Designs in the BO (left menu: HTML) and pick the closest screen or component.
// 2. Copy the .phtml markup into your tool's view:
//    vendor/melisplatform/melis-design/view/melis-design/<area>/*.phtml
// 3. If the design needs JS behaviour, grab the matching file:
//    vendor/melisplatform/melis-design/public/js/<area>/*
// 4. Skip the CSS — MelisCore already loads all required classes.
// 5. Replace demo content with your real data / bindings.
```

Controller pattern (all design controllers follow the same shape):

```php
// src/Controller/ButtonsIconsController.php
public function renderButtonsIconsAction()
{
    $melisKey = $this->params()->fromRoute('melisKey', '');
    $view = new ViewModel();
    $view->melisKey = $melisKey;
    return $view; // → view/melis-design/buttons-icons/…phtml
}
```

## Key files

| Concern | Path |
| --- | --- |
| One controller per design | `vendor/melisplatform/melis-design/src/Controller/<Name>Controller.php` |
| HTML markup to copy | `vendor/melisplatform/melis-design/view/melis-design/<area>/` |
| Optional JS per design | `vendor/melisplatform/melis-design/public/js/<area>/` |
| Tool & page list (left menu) | `vendor/melisplatform/melis-design/config/app.interface.php` |
| Routing + controller map | `vendor/melisplatform/melis-design/config/module.config.php` |

See also: [MelisCore](/legacy/reference/modules/melis-core)
