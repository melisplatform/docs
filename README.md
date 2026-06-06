# Melis Platform — Developer Documentation

Bilingual (EN + FR) developer documentation for Melis Platform, built with
[VitePress](https://vitepress.dev/). Themed with the Melis brand
(`designsystem/colors_and_type.css`): red `#ff0000` accent, Plus Jakarta Sans + Rubik.

## Develop

```bash
cd documentation
npm install
npm run dev       # local dev server with hot reload
```

## Build & preview

```bash
npm run build     # outputs a static site to .vitepress/dist
npm run preview   # serve the built site locally
```

## Structure

```
documentation/
├── .vitepress/
│   ├── config.mts            # site config + EN/FR i18n (nav, sidebar)
│   └── theme/                # Melis brand theme (custom.css)
├── index.md                  # EN home
├── guide/                    # EN guide pages
│   ├── getting-started.md
│   ├── concepts.md
│   └── create-a-tool.md
└── fr/                       # FR mirror (home + guide/)
```

Every English page has a French counterpart under `fr/`. When you add a page, add it to **both**
locales and to the `sidebar` of **both** locales in `.vitepress/config.mts`.

## Deploy

`npm run build` produces a fully static site (`.vitepress/dist`) that can be hosted anywhere
(static host, sub-domain such as `docs.melisplatform.com`, or a sub-path). Set `base` in
`.vitepress/config.mts` if serving from a sub-path.
