# Melis Platform — Developer Documentation

Developer documentation for **Melis Platform**, built with [VitePress](https://vitepress.dev/) and
themed with the Melis brand (red `#ff0000` accent, Plus Jakarta Sans + Rubik — see
`.vitepress/theme/custom.css`).

The site documents **two versions of the platform side by side**:

- **v6 (React back-office)** — the current version, served at the site root. It documents the new
  React back-office (`/melis-react`) alongside the modules, with **screenshots**.
- **v5 (legacy)** — the previous back-office, **frozen** under `/legacy/` (and `/fr/legacy/`) so it
  stays available without being rebuilt.

A **version switcher** in the nav jumps between v6 and v5 in both directions.

## Languages

The **v6** docs are available in **8 languages**, selectable via the flag switcher in the nav
(real SVG flags in `public/flags/`):

| Locale | Dir key | Path | Notes |
|---|---|---|---|
| English | `root` | `/` | default (no prefix) |
| Deutsch | `de` | `/de/` | |
| Español | `es` | `/es/` | |
| Français | `fr` | `/fr/` | |
| Italiano | `it` | `/it/` | |
| Português | `pt` | `/pt/` | |
| 简体中文 | `zh` | `/zh/` | Simplified Chinese |
| العربية | `ar` | `/ar/` | **RTL** (`dir: 'rtl'`) |

The **v5 (legacy)** docs exist in **English + French only**; on legacy pages the switcher hides the
other languages automatically.

## Develop

```bash
npm install
npm run dev       # local dev server with hot reload
```

## Build & preview

```bash
npm run build     # outputs a static site to .vitepress/dist
npm run preview   # serve the built site locally
```

## Local serving (Docker)

For local use behind the shared Melis `nginx-proxy` stack, this repo ships a `docker-compose.yml`
that serves the built site at **http://melisplatform-doc.local**:

```bash
npm run build
docker compose up -d          # nginx:alpine serving .vitepress/dist via VIRTUAL_HOST
```

`.vitepress/dist` is bind-mounted, so `npm run build` refreshes the content live (no container
restart). See `docker/nginx-docs.conf` (it uses `try_files` because `cleanUrls: true`).

## Structure

```
.
├── .vitepress/
│   ├── config.mts            # site config + i18n (8 locales, sidebars, version switcher)
│   └── theme/                # Melis brand theme (custom.css, flag switcher)
├── public/
│   ├── flags/                # SVG flags for the language switcher
│   └── screenshots/react/    # v6 back-office screenshots, one folder per module
├── index.md                  # EN (v6) home
├── guide/                    # EN (v6) guide pages
├── reference/                # EN (v6) module & configuration reference
│   └── modules/              # one page per module
├── legacy/                   # EN v5 (frozen)
├── fr/                       # FR v6  + fr/legacy/ (FR v5, frozen)
├── de/  es/  it/  pt/  zh/  ar/   # v6 translations (mirror of the EN root)
├── docker-compose.yml        # local serving behind nginx-proxy
└── docker/nginx-docs.conf
```

## i18n — how it works

`.vitepress/config.mts` centralises everything:

- **Labels** — one `L_XX` object per language (guide/reference sidebar section titles).
- **`guideSidebar(prefix, L)` / `referenceSidebar(prefix, L, groups)`** — build a locale's sidebar
  from a path prefix (`''`, `/fr`, `/de`, `/legacy`, …).
- **`MODULE_GROUPS_REACT`** (v6, 50 documented modules) vs **`MODULE_GROUPS_LEGACY`** (v5) drive the
  module reference sidebars.
- **`locales`** — one block per language, listed **alphabetically by native label** (`root` is the
  default English locale). Each declares its nav, sidebars and localized UI strings.

### Adding a language

1. Add an `L_XX: Labels` object and a `locales.xx` block in `config.mts` (copy an existing one,
   translate the labels/nav/UI strings; add `dir: 'rtl'` for RTL languages).
2. Add `public/flags/xx.svg` and one CSS rule in `custom.css` (flag + the legacy-hide selector).
3. Translate the ~79 v6 pages into `xx/` (mirror of the EN root: `index.md`, `guide/`,
   `reference/`, `reference/modules/`). Keep image paths and code identical; map internal links to
   `/xx/…`; leave `/legacy/…` links pointing at the English legacy.

Every v6 page has a counterpart in each language directory. Screenshots are shared (absolute
`/screenshots/react/…` paths), so translations reuse the same images.

## Deploy

`npm run build` produces a fully static site (`.vitepress/dist`) that can be hosted anywhere (static
host, a sub-domain such as `docs.melisplatform.com`, or a sub-path). Set `base` in
`.vitepress/config.mts` (or the `VITEPRESS_BASE` env var) when serving from a sub-path.
