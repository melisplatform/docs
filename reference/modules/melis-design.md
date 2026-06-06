# MelisDesign

> A backoffice reference library of ready-to-use HTML/CSS/JS UI patterns to copy from when building
> tools and plugins. Package: `melisplatform/melis-design`.

## Purpose

MelisDesign ships **no business services and no database tables**. It is a catalogue: dozens of
pre-built backoffice screens (dashboards, forms, tables, charts, maps, galleries, calendars,
e-commerce pages, medical/support layouts, login/signup, etc.) styled with the same CSS that
MelisCore already loads. When you build a [tool](/guide/create-a-tool) or a
[plugin](/guide/plugins), you open the matching screen in the backoffice, find the HTML markup and
the JS init code, copy it, and wire it to your own logic. As the module's README puts it: "find the
HTML and JS if needed and start coding a plugin" — there is no CSS to hunt for.

## Enable it

MelisDesign is a standard Laminas module. It is listed in `config/melis.module.load.php` (entry
`'MelisDesign'`) so it loads with the platform. It depends on **`melis-core`** (declared in
`composer.json` and in `Module.php`'s `@require`); its CSS/JS resources are registered through the
MelisCore interface config and served from the module's `public/` folder via the asset-manager
alias `MelisDesign/`.

```php
// config/melis.module.load.php
return [
    // …
    'MelisDesign',
];
```

## Backoffice

The whole module is surfaced as a single backoffice tool, declared in
`config/app.interface.php` (no separate `app.tool.php`). It hangs under the tools-tree section
`meliscore_tool_creatrion_designs` (icon `fa fa-paint-brush`, label from `tr_melistooldesign_title`)
and exposes a left menu (`melisdesign_cof`) whose entries each `forward` to one controller/action.

Every page follows the same shape: a controller named after the topic, with a single
`render<Topic>Action()` that reads `melisKey` from the route and returns a `ViewModel` — the real
content is the `.phtml` markup and the matching JS init script.

| Menu entry (melisKey) | Controller → action | View / JS |
| --- | --- | --- |
| `melis_dashboard` | `Dashboard` → `render-dashboard` | `view/melis-design/dashboard/`, `public/js/dashboard/` |
| `melis_profile_resume` | `ProfileResume` → `render-profile-resume` | `view/melis-design/profile-resume/` |
| `melis_portfolio` | `Portfolio` → `render-portfolio` | `public/js/portfolio/` |
| `melis_support_tickets` / `…_questions` / `…_answers` / `…_knowledge` / `…_forum_overview` / `…_forum_post` | `Support*` | `public/js/support-*` |
| `melis_pricing_tables`, `melis_survey`, `melis_events`, `melis_contacts` | `PricingTables`, `Survey`, `Events`, `Contacts` | `public/js/events/`, … |
| `melis_maps_google` / `…_clustering` / `…_extend_pagination` / `…_filtering` / `…_geo_search` / `…_json` / `…_vector` | `Maps*` | `public/js/maps-*.init.js` |
| `melis_photo_gallery`, `melis_gallery_video`, `melis_carousel`, `melis_sliders` | `PhotoGallery`, `GalleryVideo`, `Carousel`, `Sliders` | `public/js/photo-gallery/`, `public/js/tiny-slider/` |
| `melis_buttons_icons`, `melis_icons`, `melis_typography`, `melis_grid`, `melis_tabs`, `melis_timelines` | `ButtonsIcons`, `Icons`, `Typography`, `Grid`, `Tabs`, `Timelines` | — |
| `melis_tables`, `melis_tables_responsive` | `Tables`, `TablesResponsive` | `public/js/tables/`, `public/tables/datatables/` |
| `melis_notifications`, `melis_modals`, `melis_widgets`, `melis_charts`, `melis_calendar` | `Notifications`, `Modals`, `Widgets`, `Charts`, `Calendar` | `public/js/charts/`, `public/js/calendar/` |
| `melis_form_wizards`, `melis_form_elements`, `melis_form_validator`, `melis_file_manager` | `FormWizards`, `FormElements`, `FormValidator`, `FileManager` | `public/js/form-*`, `public/js/file-manager/` |
| `melis_inbox`, `melis_finances`, `melis_invoice`, `melis_bookings` | `Inbox`, `Finances`, `Invoice`, `Bookings` | `public/js/invoice/`, `public/js/bookings/` |
| `melis_medical_overview` / `…_patients` / `…_appointments` / `…_memos` / `…_metrics` | `Medical*` | `public/js/medical*` |
| `melis_social`, `melis_shop_edit_products`, `melis_shop_products`, `melis_ratings` | `Social`, `ShopEditProducts`, `ShopProducts`, `Ratings` | `public/js/products/`, `public/js/ratings/` |
| `melis_login`, `melis_signup`, `melis_my_account`, `melis_error` | `Login`, `Signup`, `MyAccount`, `Error` | `public/js/edit-account/` |

All controllers live in `MelisDesign\Controller\*` and are wired as `invokables` in
`config/module.config.php`. Routing goes through the `melis-backoffice` child route
`application-MelisDesign` (`/MelisDesign/[:controller[/:action]]`).

## Front office

None. MelisDesign has **no templating plugins, no view helpers and no controller plugins**. It is a
design reference only — you copy its markup into your own front-office plugins (see
[Plugins](/guide/plugins)).

## Database tables

None. MelisDesign ships no `install/*.sql` and no dbdeploy deltas.

## Bundled assets

The module's interface config (`config/app.interface.php`) loads a concatenated set of front-end
libraries used by the examples: FullCalendar, tiny-slider, Bootstrap Icons, Prism, prettyPhoto and
DataTables, plus the module's own `design-tool.css` / `design-tool.js`. A `build` bundle
(`public/build/css/bundle.css`, `public/build/js/bundle.js`) is provided to collapse them into
single requests.

## Example

Typical workflow — reuse a MelisDesign screen in your own plugin:

```text
1. Backoffice → Designs (paint-brush) → e.g. "Bookings".
2. Read the markup:  vendor/melisplatform/melis-design/view/melis-design/bookings/render-bookings.phtml
3. Read the JS init: vendor/melisplatform/melis-design/public/js/bookings/bookings.init.js
4. Copy the HTML/JS into your tool or templating plugin and connect it to your service/data.
```

The CSS is already loaded by MelisCore, so only the HTML and JS need to be carried over.

## Key files

| Concern | Path |
| --- | --- |
| Module bootstrap | `vendor/melisplatform/melis-design/src/Module.php` |
| Routing + controllers (invokables) | `vendor/melisplatform/melis-design/config/module.config.php` |
| Tool/menu declaration + assets | `vendor/melisplatform/melis-design/config/app.interface.php` |
| Example controllers | `vendor/melisplatform/melis-design/src/Controller/*Controller.php` |
| Example views | `vendor/melisplatform/melis-design/view/melis-design/<topic>/` |
| Example init scripts | `vendor/melisplatform/melis-design/public/js/` |
| Translations | `vendor/melisplatform/melis-design/language/en_EN.interface.php`, `…/fr_FR.interface.php` |

See also: [Module reference](/reference/modules) · [Create a tool](/guide/create-a-tool) ·
[Plugins](/guide/plugins).
