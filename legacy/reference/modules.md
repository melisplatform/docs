# Module reference

Melis Platform is a set of `melisplatform/*` Composer packages. This is a map of the modules that
ship with the skeleton, grouped by area. Each is a standard Laminas module under
`vendor/melisplatform/`.

::: tip One page per module
Every module also has a **dedicated reference page** (purpose, key services, tools, plugins, tables,
key files) — open the **Modules** section in the sidebar, e.g. [MelisCore](/legacy/reference/modules/melis-core),
[MelisCms](/legacy/reference/modules/melis-cms), [MelisCommerce](/legacy/reference/modules/melis-commerce),
[MelisAIEngine](/legacy/reference/modules/melis-ai-engine).
:::

## Core & platform

| Module | Role |
| --- | --- |
| `melis-core` | The platform core: backoffice shell, config tree (`MelisCoreConfig`), auth, rights, services, events. |
| `melis-asset-manager` | Serves and manages module/site assets (CSS/JS/images). |
| `melis-installer` | The first-run setup wizard. |
| `melis-dbdeploy` | Versioned database deltas (the `changelog` mechanism). |
| `melis-composerdeploy` | Composer-based deployment/update of modules. |
| `melis-marketplace` | In-backoffice marketplace to discover & install modules. |

## CMS & front office

| Module | Role |
| --- | --- |
| `melis-cms` | The CMS backoffice: sites, page tree, page editor, templates. |
| `melis-engine` | Page/data services that power rendering (`MelisPageService`, tree, cache). |
| `melis-front` | The front-office engine that displays sites (`MelisTag`, `MelisDragDropZone`). |
| `melis-demo-cms` | The official demo site — the canonical example of a site module. |
| `melis-cms-news` | News posts + templating plugin. |
| `melis-cms-prospects` | Prospect/lead capture + templating plugin. |
| `melis-cms-slider` | Slider system + templating plugin. |
| `melis-cms-category2` | Content categories. |
| `melis-cms-page-historic` | Per-page version history. |
| `melis-cms-page-analytics` | Default page analytics. |
| `melis-cms-page-script-editor` | Inject custom scripts per page / per site. |
| `melis-cms-site-robot` | Dynamic per-site `robots.txt` generation. |

## Commerce

| Module | Role |
| --- | --- |
| `melis-commerce` | E-commerce module (catalog, orders, customers…). |
| `melis-commerce-order-invoice` | Order invoicing for MelisCommerce. |

## Build & extend

| Module | Role |
| --- | --- |
| `melis-tool-creator` | GUI generator for new backoffice **tools** (see [Create a tool](../guide/create-a-tool)). |
| `melis-templating-plugin-creator` | Scaffold new front-office **templating plugins**. |
| `melis-dashboard-plugin-creator` | Scaffold new backoffice **dashboard plugins**. |
| `melis-data-source` | Generic data-source module. |
| `melis-document-upload` | Document/file upload management. |
| `melis-calendar` | Calendar features. |
| `melis-messenger` | Messaging. |
| `melis-design` | Design/theming helpers. |
| `melis-small-business` | Small-business oriented features. |

## AI

| Module | Role |
| --- | --- |
| `melis-ai` | The AI module surfaced in the backoffice. |
| `melis-ai-engine` | The core AI engine (agents, instances, scenarios). |
| `melis-ai-engine-claude` | Anthropic Claude provider for the AI engine. |
| `melis-ai-engine-gemini` | Google Gemini provider for the AI engine. |
| `melis-ai-community-extensions` | Community AI extensions (e.g. content/news/template assistants). |
| `melis-ai-tool-creator` | Create AI-powered tools. |

## Module details (services & tables)

The modules you'll most often integrate with, with their main public services and key tables.

### CMS content modules

- **melis-cms-news** — news/blog. Services `MelisCmsNewsService`, `MelisCmsNewsSeoService`; front
  plugins `MelisCmsNewsLatestNewsPlugin`, `MelisCmsNewsListNewsPlugin`, `MelisCmsNewsShowNewsPlugin`.
  Tables `melis_cms_news`, `melis_cms_news_texts`, `melis_cms_news_seo`.
- **melis-cms-prospects** — lead capture. Service `MelisProspectsService`; front plugin
  `MelisCmsProspectsShowFormPlugin`; GDPR auto-delete service. Tables `melis_cms_prospects*`.
- **melis-cms-slider** — sliders. Service `MelisCmsSliderService`; front plugin
  `MelisCmsSliderShowSliderPlugin`.
- **melis-cms-category2** — multi-site/lang categories. Services `MelisCmsCategory2Service`,
  `MelisCmsCategory2MediaService`; front plugin `MelisCmsCategoryDisplayCategoriesPlugin`. Tables
  `melis_cms_category2*`.
- **melis-cms-page-script-editor** — inject custom JS/CSS per page/site (listeners auto-inject at
  render). Tables `melis_cms_scripts`, `melis_cms_scripts_exceptions`.
- **melis-cms-page-historic** — page version history (Historic tab). Table `melis_hist_page_historic`.
- **melis-cms-page-analytics** — per-page analytics (extensible to e.g. Google Analytics). Service
  `MelisCmsPageAnalyticsService`.
- **melis-cms-site-robot** — serves a per-site `robots.txt`.

### Utilities & extensions

- **melis-document-upload** — secure, token-based file uploads. Services `MelisDocumentUploadService`,
  `MelisDocumentService`. Tables `melis_docupl_*`. Public access via `?token=…`.
- **melis-data-source** — generic data sources (CSV / DB query / custom) consumed by tools &
  plugins. Service `MelisDataSourceService`; helpers `DataSourceHelper`, `DataFiltersViewHelper`.
- **melis-calendar** — backoffice calendar + events. Service `MelisCalendarService`; table
  `melis_calendar`; dashboard widget `MelisCalendarEventsPlugin`.
- **melis-messenger** — internal messaging. Service `MelisMessengerService`; tables
  `melis_messenger_msg*`.
- **melis-small-business** — page versioning, workflow/approval, comments, page locking, media
  library. Services around `MelisSBPageService`, `MelisSBPageCommentService`; tables `melis_sb_*`.
- **melis-design** — a large reference library of ready HTML/CSS/JS UI patterns (no services) to
  copy from when building tools/plugins.

### Platform plumbing

- **melis-asset-manager** — serves module `public/` assets and generates
  `config/melis.modules.path.php`. Service `MelisAssetManagerModulesService`; icon view helpers.
- **melis-marketplace** — browse/install modules from Packagist (`type: melisplatform-module`).
  Service `MelisMarketPlaceService`.
- **melis-installer** — first-run setup wizard (empty / site / demo install).
- **melis-composerdeploy** — Composer-driven module deployment. Service `MelisComposerService`.
- **melis-tool-creator** — GUI generator for backoffice tools. Service `MelisToolCreatorService`.

::: tip Browse the source
Every module lives at `vendor/melisplatform/<module-name>/`. Reading a module's `config/` and
`src/` is the fastest way to learn its public services and conventions.
:::
