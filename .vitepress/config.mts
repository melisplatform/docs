import { defineConfig } from 'vitepress'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Per-module reference pages (one .md per module, EN + /fr). Grouped by area
// into collapsible sidebar sections, generated for both locales below.
type ModuleGroup = { text: string; slugs: string[] }

// v6 / React module set — modules that ship a `<Module>-react.md` source doc,
// including the new React-era modules (react-api, react-override, cms-google-
// analytics, cms-link-check, commerce group-discount). Drives the root docs.
const MODULE_GROUPS_REACT: ModuleGroup[] = [
  { text: 'Core & platform', slugs: ['melis-core', 'melis-asset-manager', 'melis-cache-internal', 'melis-composerdeploy', 'melis-dbdeploy', 'melis-marketplace', 'melis-phpinfo', 'melis-sql', 'melis-react-api', 'melis-react-override'] },
  { text: 'CMS & front', slugs: ['melis-cms', 'melis-engine', 'melis-front', 'melis-demo-cms', 'melis-cms-blog', 'melis-cms-comments', 'melis-cms-news', 'melis-cms-prospects', 'melis-cms-slider', 'melis-cms-category2', 'melis-cms-mcq', 'melis-cms-mcq-engine', 'melis-cms-page-historic', 'melis-cms-page-analytics', 'melis-cms-page-script-editor', 'melis-cms-share', 'melis-cms-site-robot', 'melis-cms-tags', 'melis-cms-user-account', 'melis-cms-google-analytics', 'melis-cms-link-check'] },
  { text: 'Commerce', slugs: ['melis-commerce', 'melis-commerce-order-invoice', 'melis-commerce-group-discount-per-category'] },
  { text: 'Extend & utilities', slugs: ['melis-templating-plugin-creator', 'melis-dashboard-plugin-creator', 'melis-calendar', 'melis-cron', 'melis-document-upload', 'melis-messenger', 'melis-small-business'] },
  { text: 'Authentication', slugs: ['melis-login-2fa', 'melis-login-2fa-email', 'melis-login-2fa-primotexto'] },
  { text: 'Notifications', slugs: ['melis-newsletter'] },
  { text: 'AI', slugs: ['melis-ai', 'melis-ai-engine', 'melis-ai-engine-claude', 'melis-ai-engine-gemini', 'melis-ai-community-extensions'] },
]

// v5 / Legacy module set — the original 56 modules, kept as-is for the frozen
// legacy docs under /legacy and /fr/legacy.
const MODULE_GROUPS_LEGACY: ModuleGroup[] = [
  { text: 'Core & platform', slugs: ['melis-core', 'melis-asset-manager', 'melis-cache-internal', 'melis-composerdeploy', 'melis-dbdeploy', 'melis-flyway', 'melis-installer', 'melis-marketplace', 'melis-phpinfo', 'melis-platform-skeleton', 'melis-sql'] },
  { text: 'CMS & front', slugs: ['melis-cms', 'melis-engine', 'melis-front', 'melis-demo-cms', 'melis-cms-blog', 'melis-cms-comments', 'melis-cms-news', 'melis-cms-prospects', 'melis-cms-slider', 'melis-cms-category2', 'melis-cms-mcq', 'melis-cms-mcq-engine', 'melis-cms-page-historic', 'melis-cms-page-analytics', 'melis-cms-page-script-editor', 'melis-cms-share', 'melis-cms-site-robot', 'melis-cms-tags', 'melis-cms-user-account'] },
  { text: 'Commerce', slugs: ['melis-commerce', 'melis-commerce-order-invoice', 'melis-demo-commerce'] },
  { text: 'Extend & utilities', slugs: ['melis-tool-creator', 'melis-templating-plugin-creator', 'melis-dashboard-plugin-creator', 'melis-data-source', 'melis-calendar', 'melis-cron', 'melis-design', 'melis-document-generator', 'melis-document-generator-variables', 'melis-document-upload', 'melis-form-creator', 'melis-form-engine', 'melis-form-tool', 'melis-messenger', 'melis-small-business', 'melis-user-tabs'] },
  { text: 'Authentication', slugs: ['melis-login-2fa', 'melis-login-2fa-email', 'melis-login-2fa-primotexto'] },
  { text: 'Notifications', slugs: ['melis-newsletter', 'melis-primotexto', 'melis-tipimail'] },
  { text: 'AI', slugs: ['melis-ai', 'melis-ai-engine', 'melis-ai-engine-claude', 'melis-ai-engine-gemini', 'melis-ai-community-extensions', 'melis-ai-tool-creator'] },
]
const slugTitle = (s: string) =>
  s.split('-').map(p => (p === 'ai' ? 'AI' : p[0].toUpperCase() + p.slice(1))).join('')
function moduleSidebar(prefix: string, groups: ModuleGroup[]) {
  return groups.map(g => ({
    text: g.text,
    collapsed: true,
    items: g.slugs.map(slug => ({ text: slugTitle(slug), link: `${prefix}/reference/modules/${slug}` }))
  }))
}

// Localised sidebar labels. The same structure is reused for the current
// (React) docs at the locale root and for the frozen legacy docs, only the
// path `prefix` changes ('' | '/fr' | '/legacy' | '/fr/legacy').
type Labels = {
  gettingStarted: string; installation: string; archConcepts: string; archDeep: string
  build: string; buildSite: string; commerce: string
  extend: string; createTool: string; plugins: string
  aiMcp: string; ai: string; mcp: string
  operations: string; troubleshooting: string
  reference: string; moduleRef: string; configRef: string
}
const L_EN: Labels = {
  gettingStarted: 'Getting started', installation: 'Installation',
  archConcepts: 'Architecture & concepts', archDeep: 'Architecture deep-dive',
  build: 'Build', buildSite: 'Build a website (CMS)', commerce: 'Commerce',
  extend: 'Extend the platform', createTool: 'Create your first tool',
  plugins: 'Templating & dashboard plugins',
  aiMcp: 'AI & MCP', ai: 'AI: agents & engine', mcp: 'MCP',
  operations: 'Operations', troubleshooting: 'Troubleshooting',
  reference: 'Reference', moduleRef: 'Module reference', configRef: 'Configuration reference'
}
const L_FR: Labels = {
  gettingStarted: 'Démarrer', installation: 'Installation',
  archConcepts: 'Architecture & concepts', archDeep: 'Architecture en profondeur',
  build: 'Construire', buildSite: 'Construire un site (CMS)', commerce: 'Commerce',
  extend: 'Étendre la plateforme', createTool: 'Créer votre premier tool',
  plugins: 'Plugins templating & dashboard',
  aiMcp: 'IA & MCP', ai: 'IA : agents & moteur', mcp: 'MCP',
  operations: 'Exploitation', troubleshooting: 'Dépannage',
  reference: 'Référence', moduleRef: 'Référence des modules', configRef: 'Référence de configuration'
}
const L_ES: Labels = {
  gettingStarted: 'Primeros pasos', installation: 'Instalación',
  archConcepts: 'Arquitectura y conceptos', archDeep: 'Arquitectura en profundidad',
  build: 'Construir', buildSite: 'Crear un sitio web (CMS)', commerce: 'Comercio',
  extend: 'Extender la plataforma', createTool: 'Cree su primera herramienta',
  plugins: 'Plugins de templating y dashboard',
  aiMcp: 'IA y MCP', ai: 'IA: agentes y motor', mcp: 'MCP',
  operations: 'Operaciones', troubleshooting: 'Resolución de problemas',
  reference: 'Referencia', moduleRef: 'Referencia de módulos', configRef: 'Referencia de configuración'
}
const L_DE: Labels = {
  gettingStarted: 'Erste Schritte', installation: 'Installation',
  archConcepts: 'Architektur & Konzepte', archDeep: 'Architektur im Detail',
  build: 'Erstellen', buildSite: 'Website erstellen (CMS)', commerce: 'Commerce',
  extend: 'Plattform erweitern', createTool: 'Ihr erstes Tool erstellen',
  plugins: 'Templating- & Dashboard-Plugins',
  aiMcp: 'KI & MCP', ai: 'KI: Agenten & Engine', mcp: 'MCP',
  operations: 'Betrieb', troubleshooting: 'Fehlerbehebung',
  reference: 'Referenz', moduleRef: 'Modulreferenz', configRef: 'Konfigurationsreferenz'
}
const L_ZH: Labels = {
  gettingStarted: '快速开始', installation: '安装',
  archConcepts: '架构与概念', archDeep: '架构深入',
  build: '构建', buildSite: '构建网站 (CMS)', commerce: '电商',
  extend: '扩展平台', createTool: '创建您的第一个工具',
  plugins: '模板与仪表盘插件',
  aiMcp: 'AI 与 MCP', ai: 'AI：智能体与引擎', mcp: 'MCP',
  operations: '运维', troubleshooting: '故障排除',
  reference: '参考', moduleRef: '模块参考', configRef: '配置参考'
}
const L_PT: Labels = {
  gettingStarted: 'Primeiros passos', installation: 'Instalação',
  archConcepts: 'Arquitetura e conceitos', archDeep: 'Arquitetura em detalhe',
  build: 'Construir', buildSite: 'Criar um site (CMS)', commerce: 'Comércio',
  extend: 'Estender a plataforma', createTool: 'Crie a sua primeira ferramenta',
  plugins: 'Plugins de templating e dashboard',
  aiMcp: 'IA e MCP', ai: 'IA: agentes e motor', mcp: 'MCP',
  operations: 'Operações', troubleshooting: 'Resolução de problemas',
  reference: 'Referência', moduleRef: 'Referência de módulos', configRef: 'Referência de configuração'
}
const L_IT: Labels = {
  gettingStarted: 'Primi passi', installation: 'Installazione',
  archConcepts: 'Architettura e concetti', archDeep: 'Architettura in dettaglio',
  build: 'Costruire', buildSite: 'Creare un sito web (CMS)', commerce: 'Commercio',
  extend: 'Estendere la piattaforma', createTool: 'Crea il tuo primo strumento',
  plugins: 'Plugin di templating e dashboard',
  aiMcp: 'IA e MCP', ai: 'IA: agenti e motore', mcp: 'MCP',
  operations: 'Operatività', troubleshooting: 'Risoluzione dei problemi',
  reference: 'Riferimento', moduleRef: 'Riferimento dei moduli', configRef: 'Riferimento di configurazione'
}
const L_AR: Labels = {
  gettingStarted: 'البدء', installation: 'التثبيت',
  archConcepts: 'البنية والمفاهيم', archDeep: 'البنية بالتفصيل',
  build: 'البناء', buildSite: 'إنشاء موقع ويب (CMS)', commerce: 'التجارة',
  extend: 'توسيع المنصة', createTool: 'أنشئ أداتك الأولى',
  plugins: 'إضافات القوالب ولوحة التحكم',
  aiMcp: 'الذكاء الاصطناعي و MCP', ai: 'الذكاء الاصطناعي: الوكلاء والمحرك', mcp: 'MCP',
  operations: 'التشغيل', troubleshooting: 'استكشاف الأخطاء وإصلاحها',
  reference: 'المرجع', moduleRef: 'مرجع الوحدات', configRef: 'مرجع الإعدادات'
}

function guideSidebar(prefix: string, L: Labels) {
  return [
    {
      text: L.gettingStarted,
      items: [
        { text: L.installation, link: `${prefix}/guide/getting-started` },
        { text: L.archConcepts, link: `${prefix}/guide/concepts` },
        { text: L.archDeep, link: `${prefix}/guide/architecture` }
      ]
    },
    {
      text: L.build,
      items: [
        { text: L.buildSite, link: `${prefix}/guide/build-a-site` },
        { text: L.commerce, link: `${prefix}/guide/commerce` }
      ]
    },
    {
      text: L.extend,
      items: [
        { text: L.createTool, link: `${prefix}/guide/create-a-tool` },
        { text: L.plugins, link: `${prefix}/guide/plugins` }
      ]
    },
    {
      text: L.aiMcp,
      items: [
        { text: L.ai, link: `${prefix}/guide/ai` },
        { text: L.mcp, link: `${prefix}/guide/mcp` }
      ]
    },
    {
      text: L.operations,
      items: [
        { text: L.troubleshooting, link: `${prefix}/guide/troubleshooting` }
      ]
    },
    {
      text: L.reference,
      items: [
        { text: L.moduleRef, link: `${prefix}/reference/modules` },
        { text: L.configRef, link: `${prefix}/reference/configuration` }
      ]
    }
  ]
}

function referenceSidebar(prefix: string, L: Labels, groups: ModuleGroup[]) {
  return [
    {
      text: L.reference,
      items: [
        { text: L.moduleRef, link: `${prefix}/reference/modules` },
        { text: L.configRef, link: `${prefix}/reference/configuration` }
      ]
    },
    ...moduleSidebar(prefix, groups)
  ]
}

// Version switcher shown in the nav on every page — jumps between the current
// React (v6) docs and the frozen Legacy (v5) docs, in both directions.
function versionNav(localePrefix: string, current: string, legacy: string) {
  return {
    text: 'Version',
    items: [
      { text: `${current}`, link: `${localePrefix}/` },
      { text: `${legacy}`, link: `${localePrefix}/legacy/` }
    ]
  }
}

const SITE_BASE = process.env.VITEPRESS_BASE ?? '/'

// Absolute origin of the published site, used to build canonical URLs for the
// sitemap, Open Graph and Twitter Card tags. Overridable per deploy; the default
// matches the canonical GitHub Pages deploy served under `base` (/docs/).
const SITE_ORIGIN = (process.env.VITEPRESS_ORIGIN ?? 'https://melisplatform.github.io').replace(/\/$/, '')
const CANONICAL_BASE = SITE_ORIGIN + SITE_BASE // e.g. https://melisplatform.github.io/docs/
const SOCIAL_IMAGE = CANONICAL_BASE + 'og-image.png'

// Open Graph locale per path prefix (root tree is English).
const OG_LOCALES: Record<string, string> = {
  fr: 'fr_FR', de: 'de_DE', es: 'es_ES', it: 'it_IT', pt: 'pt_PT', zh: 'zh_CN', ar: 'ar_AR',
}

// relativePath ('guide/getting-started.md', 'index.md', 'fr/guide/x.md') → absolute
// canonical URL, honouring cleanUrls (no .html, index → directory).
function canonicalUrl(relativePath: string): string {
  const path = relativePath.replace(/\.md$/, '').replace(/(^|\/)index$/, '$1')
  return CANONICAL_BASE + path
}

// hreflang alternates are emitted in each page <head> (not the sitemap, which
// must stay valid against the strict 0.9 XSD). English is the root (no prefix).
const LOCALE_PREFIXES = ['fr', 'de', 'es', 'it', 'pt', 'zh', 'ar']
const HREFLANG: Record<string, string> = {
  '': 'en', fr: 'fr-FR', de: 'de-DE', es: 'es-ES', it: 'it-IT', pt: 'pt-PT', zh: 'zh-CN', ar: 'ar',
}

// Every markdown route (relative path with .md), scanned once, so alternates are
// only emitted for locales where the page actually exists (e.g. legacy is EN+FR).
const DOCS_ROOT = fileURLToPath(new URL('..', import.meta.url))
const IGNORE_DIRS = new Set(['node_modules', '.vitepress', 'public', '.git', '.github', '.vscode'])
function collectRoutes(dir: string, base = ''): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      if (!IGNORE_DIRS.has(entry.name)) out.push(...collectRoutes(join(dir, entry.name), rel))
    } else if (entry.name.endsWith('.md') && entry.name !== 'README.md') {
      out.push(rel)
    }
  }
  return out
}
const ALL_ROUTES = new Set(collectRoutes(DOCS_ROOT))

// <link rel="alternate" hreflang> tags for a page, across the locales that have it.
function alternateLinks(relativePath: string): [string, Record<string, string>][] {
  const first = relativePath.split('/')[0]
  const inner = LOCALE_PREFIXES.includes(first) ? relativePath.slice(first.length + 1) : relativePath
  const links: [string, Record<string, string>][] = []
  for (const loc of ['', ...LOCALE_PREFIXES]) {
    const candidate = loc ? `${loc}/${inner}` : inner
    if (ALL_ROUTES.has(candidate)) {
      links.push(['link', { rel: 'alternate', hreflang: HREFLANG[loc], href: canonicalUrl(candidate) }])
    }
  }
  if (ALL_ROUTES.has(inner)) {
    links.push(['link', { rel: 'alternate', hreflang: 'x-default', href: canonicalUrl(inner) }])
  }
  return links
}

// Shared config + per-locale (EN root, FR under /fr/).
export default defineConfig({
  title: 'Melis Platform',
  description: 'Developer documentation for Melis Platform — the Laminas-based CMS & application platform.',
  base: SITE_BASE as '/',
  lastUpdated: true,
  cleanUrls: true,
  ignoreDeadLinks: 'localhostLinks',
  srcExclude: ['README.md'],

  // The hreflang alternates VitePress adds per locale emit <xhtml:link> children,
  // which the strict sitemaps.org 0.9 XSD rejects (extension elements). Drop them
  // so the sitemap validates against the base schema; hreflang is declared in the
  // page <head> instead (see transformHead), which Google treats as equivalent.
  sitemap: {
    hostname: CANONICAL_BASE,
    transformItems: (items) => items.map(({ links, ...rest }) => rest),
  },

  // Per-page canonical + Open Graph + Twitter Card tags (social previews, SEO).
  transformHead({ pageData, siteData }) {
    const siteTitle = siteData.title || 'Melis Platform'
    const title = pageData.title && pageData.title !== siteTitle
      ? `${pageData.title} | ${siteTitle}`
      : siteTitle
    const description = pageData.description || pageData.frontmatter?.description || siteData.description || ''
    const url = canonicalUrl(pageData.relativePath)
    const ogLocale = OG_LOCALES[pageData.relativePath.split('/')[0]] ?? 'en_US'
    return [
      ['link', { rel: 'canonical', href: url }],
      ...alternateLinks(pageData.relativePath),
      ['meta', { property: 'og:type', content: 'website' }],
      ['meta', { property: 'og:site_name', content: siteTitle }],
      ['meta', { property: 'og:locale', content: ogLocale }],
      ['meta', { property: 'og:title', content: title }],
      ['meta', { property: 'og:description', content: description }],
      ['meta', { property: 'og:url', content: url }],
      ['meta', { property: 'og:image', content: SOCIAL_IMAGE }],
      ['meta', { property: 'og:image:width', content: '1200' }],
      ['meta', { property: 'og:image:height', content: '630' }],
      ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
      ['meta', { name: 'twitter:title', content: title }],
      ['meta', { name: 'twitter:description', content: description }],
      ['meta', { name: 'twitter:image', content: SOCIAL_IMAGE }],
    ]
  },

  // Always render code blocks with a dark (terminal-like) syntax theme,
  // so they stay high-contrast in light mode too.
  markdown: {
    theme: 'github-dark'
  },

  head: [
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    ['link', {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Rubik:wght@400;500;600;700&display=swap'
    }],
    // Base-aware flag image URLs for the language switcher — baked with the real
    // `base` at build time so they resolve under '/' locally and '/docs/' on
    // GitHub Pages. custom.css references them via var(--flag-xx).
    ['style', {}, `:root{` +
      `--flag-gb:url(${SITE_BASE}flags/gb.svg);` +
      `--flag-fr:url(${SITE_BASE}flags/fr.svg);` +
      `--flag-es:url(${SITE_BASE}flags/es.svg);` +
      `--flag-de:url(${SITE_BASE}flags/de.svg);` +
      `--flag-zh:url(${SITE_BASE}flags/zh.svg);` +
      `--flag-pt:url(${SITE_BASE}flags/pt.svg);` +
      `--flag-it:url(${SITE_BASE}flags/it.svg);` +
      `--flag-ar:url(${SITE_BASE}flags/ar.svg);` +
    `}`]
  ],

  themeConfig: {
    logo: { light: '/melis-logo-light.svg', dark: '/melis-logo-dark.svg' },
    search: { provider: 'local' },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/melisplatform' }
    ]
  },

  // Locales listed alphabetically by their native label (Latin scripts first,
  // then Chinese and Arabic). `root` is the default (unprefixed) English locale.
  locales: {
    de: {
      label: 'Deutsch',
      lang: 'de-DE',
      link: '/de/',
      themeConfig: {
        nav: [
          { text: 'Leitfaden', link: '/de/guide/getting-started' },
          { text: 'Konzepte', link: '/de/guide/concepts' },
          { text: 'Referenz', link: '/de/reference/modules' },
          { text: 'Version', items: [
            { text: 'React (v6) — aktuell', link: '/de/' },
            { text: 'Legacy (v5)', link: '/legacy/' }
          ] },
          { text: 'melisplatform.com', link: 'https://www.melisplatform.com/' }
        ],
        sidebar: {
          '/de/guide/': guideSidebar('/de', L_DE),
          '/de/reference/': referenceSidebar('/de', L_DE, MODULE_GROUPS_REACT)
        },
        editLink: {
          pattern: 'https://github.com/melisplatform/docs/edit/main/:path',
          text: 'Diese Seite auf GitHub bearbeiten'
        },
        docFooter: { prev: 'Zurück', next: 'Weiter' },
        outline: { label: 'Auf dieser Seite' },
        lastUpdated: { text: 'Zuletzt aktualisiert' },
        returnToTopLabel: 'Nach oben',
        darkModeSwitchLabel: 'Erscheinungsbild',
        sidebarMenuLabel: 'Menü'
      }
    },

    root: {
      label: 'English',
      lang: 'en-US',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/guide/getting-started' },
          { text: 'Concepts', link: '/guide/concepts' },
          { text: 'Reference', link: '/reference/modules' },
          versionNav('', 'React (v6) — current', 'Legacy (v5)'),
          { text: 'melisplatform.com', link: 'https://www.melisplatform.com/' }
        ],
        sidebar: {
          '/guide/': guideSidebar('', L_EN),
          '/reference/': referenceSidebar('', L_EN, MODULE_GROUPS_REACT),
          // Frozen legacy (v5) docs
          '/legacy/guide/': guideSidebar('/legacy', L_EN),
          '/legacy/reference/': referenceSidebar('/legacy', L_EN, MODULE_GROUPS_LEGACY)
        },
        editLink: {
          pattern: 'https://github.com/melisplatform/docs/edit/main/:path',
          text: 'Edit this page on GitHub'
        },
        lastUpdated: { text: 'Last updated' },
        docFooter: { prev: 'Previous', next: 'Next' }
      }
    },

    es: {
      label: 'Español',
      lang: 'es-ES',
      link: '/es/',
      themeConfig: {
        nav: [
          { text: 'Guía', link: '/es/guide/getting-started' },
          { text: 'Conceptos', link: '/es/guide/concepts' },
          { text: 'Referencia', link: '/es/reference/modules' },
          { text: 'Version', items: [
            { text: 'React (v6) — actual', link: '/es/' },
            { text: 'Legacy (v5)', link: '/legacy/' }
          ] },
          { text: 'melisplatform.com', link: 'https://www.melisplatform.com/' }
        ],
        sidebar: {
          '/es/guide/': guideSidebar('/es', L_ES),
          '/es/reference/': referenceSidebar('/es', L_ES, MODULE_GROUPS_REACT)
        },
        editLink: {
          pattern: 'https://github.com/melisplatform/docs/edit/main/:path',
          text: 'Editar esta página en GitHub'
        },
        docFooter: { prev: 'Anterior', next: 'Siguiente' },
        outline: { label: 'En esta página' },
        lastUpdated: { text: 'Última actualización' },
        returnToTopLabel: 'Volver arriba',
        darkModeSwitchLabel: 'Apariencia',
        sidebarMenuLabel: 'Menú'
      }
    },

    fr: {
      label: 'Français',
      lang: 'fr-FR',
      link: '/fr/',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/fr/guide/getting-started' },
          { text: 'Concepts', link: '/fr/guide/concepts' },
          { text: 'Référence', link: '/fr/reference/modules' },
          versionNav('/fr', 'React (v6) — actuel', 'Legacy (v5)'),
          { text: 'melisplatform.com', link: 'https://www.melisplatform.com/' }
        ],
        sidebar: {
          '/fr/guide/': guideSidebar('/fr', L_FR),
          '/fr/reference/': referenceSidebar('/fr', L_FR, MODULE_GROUPS_REACT),
          // Docs legacy (v5) figées
          '/fr/legacy/guide/': guideSidebar('/fr/legacy', L_FR),
          '/fr/legacy/reference/': referenceSidebar('/fr/legacy', L_FR, MODULE_GROUPS_LEGACY)
        },
        editLink: {
          pattern: 'https://github.com/melisplatform/docs/edit/main/:path',
          text: 'Éditer cette page sur GitHub'
        },
        docFooter: { prev: 'Précédent', next: 'Suivant' },
        outline: { label: 'Sur cette page' },
        lastUpdated: { text: 'Dernière mise à jour' },
        returnToTopLabel: 'Retour en haut',
        darkModeSwitchLabel: 'Apparence',
        sidebarMenuLabel: 'Menu'
      }
    },

    it: {
      label: 'Italiano',
      lang: 'it-IT',
      link: '/it/',
      themeConfig: {
        nav: [
          { text: 'Guida', link: '/it/guide/getting-started' },
          { text: 'Concetti', link: '/it/guide/concepts' },
          { text: 'Riferimento', link: '/it/reference/modules' },
          { text: 'Versione', items: [
            { text: 'React (v6) — attuale', link: '/it/' },
            { text: 'Legacy (v5)', link: '/legacy/' }
          ] },
          { text: 'melisplatform.com', link: 'https://www.melisplatform.com/' }
        ],
        sidebar: {
          '/it/guide/': guideSidebar('/it', L_IT),
          '/it/reference/': referenceSidebar('/it', L_IT, MODULE_GROUPS_REACT)
        },
        editLink: {
          pattern: 'https://github.com/melisplatform/docs/edit/main/:path',
          text: 'Modifica questa pagina su GitHub'
        },
        docFooter: { prev: 'Precedente', next: 'Successivo' },
        outline: { label: 'In questa pagina' },
        lastUpdated: { text: 'Ultimo aggiornamento' },
        returnToTopLabel: 'Torna su',
        darkModeSwitchLabel: 'Aspetto',
        sidebarMenuLabel: 'Menu'
      }
    },

    pt: {
      label: 'Português',
      lang: 'pt-PT',
      link: '/pt/',
      themeConfig: {
        nav: [
          { text: 'Guia', link: '/pt/guide/getting-started' },
          { text: 'Conceitos', link: '/pt/guide/concepts' },
          { text: 'Referência', link: '/pt/reference/modules' },
          { text: 'Versão', items: [
            { text: 'React (v6) — atual', link: '/pt/' },
            { text: 'Legacy (v5)', link: '/legacy/' }
          ] },
          { text: 'melisplatform.com', link: 'https://www.melisplatform.com/' }
        ],
        sidebar: {
          '/pt/guide/': guideSidebar('/pt', L_PT),
          '/pt/reference/': referenceSidebar('/pt', L_PT, MODULE_GROUPS_REACT)
        },
        editLink: {
          pattern: 'https://github.com/melisplatform/docs/edit/main/:path',
          text: 'Editar esta página no GitHub'
        },
        docFooter: { prev: 'Anterior', next: 'Próximo' },
        outline: { label: 'Nesta página' },
        lastUpdated: { text: 'Última atualização' },
        returnToTopLabel: 'Voltar ao topo',
        darkModeSwitchLabel: 'Aparência',
        sidebarMenuLabel: 'Menu'
      }
    },

    zh: {
      label: '简体中文',
      lang: 'zh-CN',
      link: '/zh/',
      themeConfig: {
        nav: [
          { text: '指南', link: '/zh/guide/getting-started' },
          { text: '概念', link: '/zh/guide/concepts' },
          { text: '参考', link: '/zh/reference/modules' },
          { text: '版本', items: [
            { text: 'React (v6) — 当前', link: '/zh/' },
            { text: 'Legacy (v5)', link: '/legacy/' }
          ] },
          { text: 'melisplatform.com', link: 'https://www.melisplatform.com/' }
        ],
        sidebar: {
          '/zh/guide/': guideSidebar('/zh', L_ZH),
          '/zh/reference/': referenceSidebar('/zh', L_ZH, MODULE_GROUPS_REACT)
        },
        editLink: {
          pattern: 'https://github.com/melisplatform/docs/edit/main/:path',
          text: '在 GitHub 上编辑此页'
        },
        docFooter: { prev: '上一页', next: '下一页' },
        outline: { label: '本页目录' },
        lastUpdated: { text: '最后更新' },
        returnToTopLabel: '返回顶部',
        darkModeSwitchLabel: '外观',
        sidebarMenuLabel: '菜单'
      }
    },

    ar: {
      label: 'العربية',
      lang: 'ar',
      dir: 'rtl',
      link: '/ar/',
      themeConfig: {
        nav: [
          { text: 'الدليل', link: '/ar/guide/getting-started' },
          { text: 'المفاهيم', link: '/ar/guide/concepts' },
          { text: 'المرجع', link: '/ar/reference/modules' },
          { text: 'الإصدار', items: [
            { text: 'React (v6) — الحالي', link: '/ar/' },
            { text: 'Legacy (v5)', link: '/legacy/' }
          ] },
          { text: 'melisplatform.com', link: 'https://www.melisplatform.com/' }
        ],
        sidebar: {
          '/ar/guide/': guideSidebar('/ar', L_AR),
          '/ar/reference/': referenceSidebar('/ar', L_AR, MODULE_GROUPS_REACT)
        },
        editLink: {
          pattern: 'https://github.com/melisplatform/docs/edit/main/:path',
          text: 'حرّر هذه الصفحة على GitHub'
        },
        docFooter: { prev: 'السابق', next: 'التالي' },
        outline: { label: 'في هذه الصفحة' },
        lastUpdated: { text: 'آخر تحديث' },
        returnToTopLabel: 'العودة إلى الأعلى',
        darkModeSwitchLabel: 'المظهر',
        sidebarMenuLabel: 'القائمة'
      }
    }
  }
})
