# Build a website (CMS)

Melis is, first and foremost, a **CMS**. This page explains the content model — **sites**,
**pages**, **templates** and **plugins** — and how a page is rendered on the front office. It's
the mental model you need before editing templates or building a site module.

## The content model

| Concept      | What it is | Main table(s) |
| ------------ | ---------- | ------------- |
| **Site**     | A website. Has a home page, languages and one or more domains per environment. | `melis_cms_site`, `melis_cms_site_domain` |
| **Page**     | A node in the site's page tree. Has a type (site/folder/page), a template and content. | `melis_cms_page_tree`, `melis_cms_page_published`, `melis_cms_page_saved` |
| **Template** | The layout a page uses — it points at a site-module controller/action/view. | `melis_cms_template` |
| **SEO**      | Per-page URL slug and meta tags. | `melis_cms_page_seo` |
| **Language** | A page can have translations linked together. | `melis_cms_lang`, `melis_cms_page_lang` |

### Pages are versioned

Every page exists in two versions:

- **Saved** (`melis_cms_page_saved`) — the working draft you edit in the backoffice.
- **Published** (`melis_cms_page_published`) — the live version served on the front office.

You edit the draft, then **publish** when ready. The page's editable content (see *zones* and
*plugins* below) is stored on the page record.

## Templates

A **template** (`melis_cms_template`) is the bridge between a page and the code that renders it.
For the common `ZF2` template type, it stores:

- `tpl_zf2_website_folder` — the **site module** (e.g. `MelisDemoCms`),
- `tpl_zf2_controller`, `tpl_zf2_action` — which controller/action renders the page,
- `tpl_zf2_layout` — the layout to wrap it in.

So a page → references a template → which routes to a `.phtml` view inside a site module.

## Editable content: zones & plugins

Templates expose two kinds of editable areas, via **view helpers**:

### `MelisTag` — simple editable zones

A named HTML/text/media zone an editor edits inline (TinyMCE) in the backoffice:

```php
<?= $this->MelisTag($this->idPage, 'home-html-1', 'html', '<h1>Default heading</h1>') ?>
```

The default content shows until an editor overrides it; the saved value is stored on the page.
Helper: `vendor/melisplatform/melis-front/src/View/Helper/MelisTagsHelper.php`.

### `MelisDragDropZone` — templating plugins

A drop zone where editors drag **templating plugins** — reusable content blocks (a slider, a
news list, a contact form):

```php
<?= $this->MelisDragDropZone($this->idPage, 'dragdropzone_home_1') ?>
```

Helper: `vendor/melisplatform/melis-front/src/View/Helper/MelisDragDropZoneHelper.php`.

A templating plugin extends `MelisEngine\Controller\Plugin\MelisTemplatingPlugin` and implements:

- **`front()`** — returns the data/view rendered on the live site,
- **`back()`** — the configuration form shown in the backoffice editor.

`MelisCmsSlider` and `MelisCmsNews` are good reference plugins; use **MelisTemplatingPluginCreator**
to scaffold your own.

## How a page renders on the front office

The front office is served by **MelisFront** (the engine that displays sites) on top of
**MelisEngine** (page/data services). Roughly:

1. The vhost sets **`MELIS_MODULE`** → selects the **site module** to serve.
2. A URL like `…/id/5` resolves to **page id 5** (route in
   `vendor/melisplatform/melis-front/config/module.config.php`). SEO URLs map to page ids too.
3. **MelisEngine** loads the page + its template
   (`vendor/melisplatform/melis-engine/src/Service/MelisPageService.php`).
4. The template's `ZF2` controller/action renders the site module's `.phtml` view.
5. `MelisTag` zones and `MelisDragDropZone` plugins are filled from the page's published content.
6. The result is wrapped in the site layout.

::: tip Edit / preview modes
The same page can be requested in different modes: `…/id/5` (live), `…/id/5/preview` (saved
draft), `…/id/5/renderMode/melis` (in-backoffice editing).
:::

## Anatomy of a site module

A **site module** is a normal Laminas module that holds a website's templates, views and assets.
The reference is `vendor/melisplatform/melis-demo-cms/`; custom sites usually live under
`module/MelisSites/<YourSite>/`:

```
MelisDemoCms/
├── config/
│   ├── module.load.php           # modules this site needs (MelisEngine, MelisFront, plugins…)
│   ├── module.config.php         # routes / controllers / services
│   ├── assets.config.php         # front-office CSS & JS
│   └── melis.plugins.config.php  # templating plugins available to templates
├── src/Controller/               # Home, Contact… (render the template views)
├── view/
│   ├── layout/                   # site layouts
│   └── melis-demo-cms/home/index.phtml   # a page template (uses MelisTag / MelisDragDropZone)
└── public/                       # css / js / images
```

## Creating a new site (overview)

At a high level:

1. **Create the site** in the backoffice (Sites tool) — name, languages, home page.
2. **Provide a site module** under `module/MelisSites/<YourSite>/` (controllers + `.phtml`
   templates + assets).
3. **Declare templates** (`melis_cms_template`) pointing at your module's controller/action.
4. **Build the page tree** and assign templates; add `MelisTag`/`MelisDragDropZone` to your views.
5. **Point a vhost** at `public/` with `SetEnv MELIS_MODULE "<YourSite>"` (see
   [Installation](./getting-started)).
6. **Publish** and browse the front office.

> Start by reading `vendor/melisplatform/melis-demo-cms/` end to end — it's the canonical,
> working example of every concept on this page.

## Key files

| Concern | Path |
| --- | --- |
| CMS services (pages/sites) | `vendor/melisplatform/melis-cms/src/Service/` |
| Page service (engine) | `vendor/melisplatform/melis-engine/src/Service/MelisPageService.php` |
| Front rendering | `vendor/melisplatform/melis-front/` |
| Editable-zone helpers | `vendor/melisplatform/melis-front/src/View/Helper/` |
| Templating plugin base | `vendor/melisplatform/melis-engine/src/Controller/Plugin/MelisTemplatingPlugin.php` |
| Reference demo site | `vendor/melisplatform/melis-demo-cms/` |
