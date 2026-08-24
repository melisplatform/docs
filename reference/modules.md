# Module reference

Melis Platform is a set of `melisplatform/*` Composer packages. This is a map of the **50
modules** that ship with the v6 skeleton, grouped by area. Each is a standard Laminas module
under `vendor/melisplatform/`.

Melis v6 keeps the same framework and modules as v5, but **replaces the back-office with a
React UI** served at `/melis-react`. Tools are now native-React **"bricks"** — self-contained
React UIs a module ships and the shell discovers at boot — with a **New (React) / Old (iframe)**
toggle so any tool that hasn't been rewritten still runs as its legacy jQuery/AJAX page inside
the shell. A global **AI Assistant** overlay is available anywhere. This layer is served through
two infrastructure modules: [`melis-react-api`](/reference/modules/melis-react-api) (the JSON
API backbone — user, menu, assets, brick discovery, dashboard data, capability resolver) and
[`melis-react-override`](/reference/modules/melis-react-override) (the SPA shell route plus the
legacy-tool iframe mechanism). See the [Architecture guide](/guide/architecture) for how it all
fits together.

::: tip One page per module
Every module also has a **dedicated reference page** (purpose, key services, tools, plugins,
tables, key files) — open the **Modules** section in the sidebar, e.g.
[MelisCms](/reference/modules/melis-cms), [MelisCommerce](/reference/modules/melis-commerce),
[MelisAIEngine](/reference/modules/melis-ai-engine).
:::

## Core & platform

| Module | Role |
| --- | --- |
| [`melis-core`](/reference/modules/melis-core) | The platform core: back-office shell, config tree (`MelisCoreConfig`), auth, rights, users, services and events. Unchanged in v6 — only the shell it powers is now rendered by React. |
| [`melis-asset-manager`](/reference/modules/melis-asset-manager) | Serves every module's `public/` assets (CSS/JS/images) over clean URLs and delivers the compiled bundles. |
| [`melis-cache-internal`](/reference/modules/melis-cache-internal) | Full-page HTTP cache for the CMS front-office, with partial (zone) caching and per-page exclusions. |
| [`melis-composerdeploy`](/reference/modules/melis-composerdeploy) | Embeds Composer to install, update and remove modules programmatically. |
| [`melis-dbdeploy`](/reference/modules/melis-dbdeploy) | Headless database-migration runner — applies each module's SQL deltas in order. |
| [`melis-marketplace`](/reference/modules/melis-marketplace) | In-backoffice module store to discover, download, update and remove modules. |
| [`melis-phpinfo`](/reference/modules/melis-phpinfo) | Read-only diagnostic tool that renders PHP's native `phpinfo()` inside the React back-office. |
| [`melis-sql`](/reference/modules/melis-sql) | Read-only SQL query runner in the Dev Tools, shipped as a native full-React brick. |
| [`melis-react-api`](/reference/modules/melis-react-api) | JSON API backbone of the React back-office — boots the shell and hosts the capability resolver. |
| [`melis-react-override`](/reference/modules/melis-react-override) | React infrastructure — renders legacy tools inside the `/melis-react` shell and serves the React SPA. |

## CMS & front

| Module | Role |
| --- | --- |
| [`melis-cms`](/reference/modules/melis-cms) | The CMS back-office — sites, page tree, page editor, templates, styles and SEO, as a React back-office. |
| [`melis-engine`](/reference/modules/melis-engine) | Shared CMS data foundation — page model, sites, languages, templating-plugin base class and render cache. |
| [`melis-front`](/reference/modules/melis-front) | Front-office rendering system — turns a URL into a finished page and ships the content blocks (page plugins). |
| [`melis-demo-cms`](/reference/modules/melis-demo-cms) | The official reference/demo website — a ready-to-install **site module**. |
| [`melis-cms-blog`](/reference/modules/melis-cms-blog) | Blog system with a native React back-office and three front-office display plugins. |
| [`melis-cms-comments`](/reference/modules/melis-cms-comments) | Comment system for News and Blog — moderation, approval workflow and a front plugin; a Comments tab in the editor. |
| [`melis-cms-news`](/reference/modules/melis-cms-news) | News/blog system with a React authoring tool and three front-office display plugins. |
| [`melis-cms-prospects`](/reference/modules/melis-cms-prospects) | Leads/contact management — a front form captures messages; a React tool browses, filters, exports and classifies them. |
| [`melis-cms-slider`](/reference/modules/melis-cms-slider) | Slider/carousel manager (native React brick) with a front-office templating plugin. |
| [`melis-cms-category2`](/reference/modules/melis-cms-category2) | Multi-site, multilingual content categories, with a native React back-office. |
| [`melis-cms-mcq`](/reference/modules/melis-cms-mcq) | Back-office MCQ (quiz) builder, now a native full-React tool. |
| [`melis-cms-mcq-engine`](/reference/modules/melis-cms-mcq-engine) | Data, scoring and front-office renderer behind the React MCQ tool. |
| [`melis-cms-page-historic`](/reference/modules/melis-cms-page-historic) | Audit log for page editing — a Historic tab in the React page editor plus a dashboard widget. |
| [`melis-cms-page-analytics`](/reference/modules/melis-cms-page-analytics) | Basic page-visit analytics, extensible with a provider (e.g. Google Analytics). |
| [`melis-cms-page-script-editor`](/reference/modules/melis-cms-page-script-editor) | Inject custom `<script>`/`<style>`/HTML per page or per site (analytics, pixels, widgets). |
| [`melis-cms-share`](/reference/modules/melis-cms-share) | Injects social-media share / Open Graph meta tags, managed from a native React back-office. |
| [`melis-cms-site-robot`](/reference/modules/melis-cms-site-robot) | Per-domain `robots.txt` editing and dynamic serving, with a native full-React back-office. |
| [`melis-cms-tags`](/reference/modules/melis-cms-tags) | Shared tag/taxonomy system that content modules hang items off, now with a native React back-office. |
| [`melis-cms-user-account`](/reference/modules/melis-cms-user-account) | Front-office visitor account system — registration, login and per-site profiles, administered from a React tool. |
| [`melis-cms-google-analytics`](/reference/modules/melis-cms-google-analytics) | GA4 provider that renders sessions curves, KPI totals and demographics in the React back-office. |
| [`melis-cms-link-check`](/reference/modules/melis-cms-link-check) | Link tester that crawls a page (and optionally sub-pages) and records every broken link. |

## Commerce

| Module | Role |
| --- | --- |
| [`melis-commerce`](/reference/modules/melis-commerce) | Full e-commerce framework — catalog, customers, cart/checkout/orders, coupons, shipping and SEO — with a React back-office. |
| [`melis-commerce-order-invoice`](/reference/modules/melis-commerce-order-invoice) | Adds PDF order-invoice generation, surfaced inside the React Orders tool. |
| [`melis-commerce-group-discount-per-category`](/reference/modules/melis-commerce-group-discount-per-category) | Per-category price discount (by country and client group) as a tab in the React Catalogs tool. |

## Extend & utilities

| Module | Role |
| --- | --- |
| [`melis-templating-plugin-creator`](/reference/modules/melis-templating-plugin-creator) | Back-office wizard that scaffolds a complete front-office **templating plugin**. |
| [`melis-dashboard-plugin-creator`](/reference/modules/melis-dashboard-plugin-creator) | Wizard that scaffolds a new back-office **dashboard plugin** (widget), as a native React brick. |
| [`melis-calendar`](/reference/modules/melis-calendar) | Scheduling tool with a native React month calendar, drag-and-drop events and a dashboard widget. |
| [`melis-cron`](/reference/modules/melis-cron) | Scheduled-task manager — define CLI/HTTP tasks, run them, and inspect run history, via a native React tool. |
| [`melis-document-upload`](/reference/modules/melis-document-upload) | Document-upload management as a native React tool — define types, collect and serve files. |
| [`melis-messenger`](/reference/modules/melis-messenger) | Internal user-to-user messaging — a topbar notification icon and a tab in My Account. |
| [`melis-small-business`](/reference/modules/melis-small-business) | Editorial add-on — roles, validation workflow, page versioning, comments, locking and a media library. |

## Authentication

| Module | Role |
| --- | --- |
| [`melis-login-2fa`](/reference/modules/melis-login-2fa) | Two-factor authentication core — requires a one-time code and delegates delivery to channel modules. |
| [`melis-login-2fa-email`](/reference/modules/melis-login-2fa-email) | Email delivery channel — sends the one-time login code by email. |
| [`melis-login-2fa-primotexto`](/reference/modules/melis-login-2fa-primotexto) | SMS delivery channel via the Primotexto gateway. |

## Notifications

| Module | Role |
| --- | --- |
| [`melis-newsletter`](/reference/modules/melis-newsletter) | Turns a CMS page into a personalised email newsletter and delivers it to subscriber groups, from a React back-office. |

## AI

| Module | Role |
| --- | --- |
| [`melis-ai`](/reference/modules/melis-ai) | React back-office for the AI suite — connect providers, design agents, deploy instances, watch usage, chat anywhere. |
| [`melis-ai-engine`](/reference/modules/melis-ai-engine) | The abstract AI engine — provider contract, agent/scenario runtime, conversation store, MCP/tool bridge and shared React chat components. |
| [`melis-ai-engine-claude`](/reference/modules/melis-ai-engine-claude) | Anthropic Claude provider for the AI engine (backend, no React UI of its own). |
| [`melis-ai-engine-gemini`](/reference/modules/melis-ai-engine-gemini) | Google Gemini provider for the AI engine (backend, no back-office of its own). |
| [`melis-ai-community-extensions`](/reference/modules/melis-ai-community-extensions) | Injects AI generation into existing CMS editing surfaces (mini-templates, news, drag-and-drop zones). |

::: tip v5-only modules live under /legacy
Some modules from the v5 back-office have no dedicated v6 page yet — e.g.
[`melis-tool-creator`](/legacy/reference/modules/melis-tool-creator),
[`melis-installer`](/legacy/reference/modules/melis-installer) and the `form-*` modules.
Their documentation is frozen under `/legacy/reference/modules/`.
:::

::: tip Browse the source
Every module lives at `vendor/melisplatform/<module-name>/`. Reading a module's `config/` and
`src/` is the fastest way to learn its public services and conventions.
:::
