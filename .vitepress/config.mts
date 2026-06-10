import { defineConfig } from 'vitepress'

// Per-module reference pages (one .md per module, EN + /fr). Grouped by area
// into collapsible sidebar sections, generated for both locales below.
const MODULE_GROUPS: { text: string; slugs: string[] }[] = [
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
function moduleSidebar(prefix: string) {
  return MODULE_GROUPS.map(g => ({
    text: g.text,
    collapsed: true,
    items: g.slugs.map(slug => ({ text: slugTitle(slug), link: `${prefix}/reference/modules/${slug}` }))
  }))
}

// Shared config + per-locale (EN root, FR under /fr/).
export default defineConfig({
  title: 'Melis Platform',
  description: 'Developer documentation for Melis Platform — the Laminas-based CMS & application platform.',
  base: (process.env.VITEPRESS_BASE ?? '/') as '/',
  lastUpdated: true,
  cleanUrls: true,
  ignoreDeadLinks: 'localhostLinks',
  srcExclude: ['README.md'],

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
    }]
  ],

  themeConfig: {
    logo: { light: '/melis-logo-light.svg', dark: '/melis-logo-dark.svg' },
    search: { provider: 'local' },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/melisplatform' }
    ]
  },

  locales: {
    root: {
      label: '🇬🇧 English',
      lang: 'en-US',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/guide/getting-started' },
          { text: 'Concepts', link: '/guide/concepts' },
          { text: 'Reference', link: '/reference/modules' },
          { text: 'melisplatform.com', link: 'https://www.melisplatform.com/' }
        ],
        sidebar: {
          '/guide/': [
            {
              text: 'Getting started',
              items: [
                { text: 'Installation', link: '/guide/getting-started' },
                { text: 'Architecture & concepts', link: '/guide/concepts' },
                { text: 'Architecture deep-dive', link: '/guide/architecture' }
              ]
            },
            {
              text: 'Build',
              items: [
                { text: 'Build a website (CMS)', link: '/guide/build-a-site' },
                { text: 'Commerce', link: '/guide/commerce' }
              ]
            },
            {
              text: 'Extend the platform',
              items: [
                { text: 'Create your first tool', link: '/guide/create-a-tool' },
                { text: 'Templating & dashboard plugins', link: '/guide/plugins' }
              ]
            },
            {
              text: 'AI & MCP',
              items: [
                { text: 'AI: agents & engine', link: '/guide/ai' },
                { text: 'MCP', link: '/guide/mcp' }
              ]
            },
            {
              text: 'Operations',
              items: [
                { text: 'Troubleshooting', link: '/guide/troubleshooting' }
              ]
            },
            {
              text: 'Reference',
              items: [
                { text: 'Module reference', link: '/reference/modules' },
                { text: 'Configuration reference', link: '/reference/configuration' }
              ]
            }
          ],
          '/reference/': [
            {
              text: 'Reference',
              items: [
                { text: 'Module reference', link: '/reference/modules' },
                { text: 'Configuration reference', link: '/reference/configuration' }
              ]
            },
            ...moduleSidebar('')
          ]
        },
        editLink: {
          pattern: 'https://github.com/melisplatform/docs/edit/main/:path',
          text: 'Edit this page on GitHub'
        },
        lastUpdated: { text: 'Last updated' },
        docFooter: { prev: 'Previous', next: 'Next' }
      }
    },

    fr: {
      label: '🇫🇷 Français',
      lang: 'fr-FR',
      link: '/fr/',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/fr/guide/getting-started' },
          { text: 'Concepts', link: '/fr/guide/concepts' },
          { text: 'Référence', link: '/fr/reference/modules' },
          { text: 'melisplatform.com', link: 'https://www.melisplatform.com/' }
        ],
        sidebar: {
          '/fr/guide/': [
            {
              text: 'Démarrer',
              items: [
                { text: 'Installation', link: '/fr/guide/getting-started' },
                { text: 'Architecture & concepts', link: '/fr/guide/concepts' },
                { text: 'Architecture en profondeur', link: '/fr/guide/architecture' }
              ]
            },
            {
              text: 'Construire',
              items: [
                { text: 'Construire un site (CMS)', link: '/fr/guide/build-a-site' },
                { text: 'Commerce', link: '/fr/guide/commerce' }
              ]
            },
            {
              text: 'Étendre la plateforme',
              items: [
                { text: 'Créer votre premier tool', link: '/fr/guide/create-a-tool' },
                { text: 'Plugins templating & dashboard', link: '/fr/guide/plugins' }
              ]
            },
            {
              text: 'IA & MCP',
              items: [
                { text: 'IA : agents & moteur', link: '/fr/guide/ai' },
                { text: 'MCP', link: '/fr/guide/mcp' }
              ]
            },
            {
              text: 'Exploitation',
              items: [
                { text: 'Dépannage', link: '/fr/guide/troubleshooting' }
              ]
            },
            {
              text: 'Référence',
              items: [
                { text: 'Référence des modules', link: '/fr/reference/modules' },
                { text: 'Référence de configuration', link: '/fr/reference/configuration' }
              ]
            }
          ],
          '/fr/reference/': [
            {
              text: 'Référence',
              items: [
                { text: 'Référence des modules', link: '/fr/reference/modules' },
                { text: 'Référence de configuration', link: '/fr/reference/configuration' }
              ]
            },
            ...moduleSidebar('/fr')
          ]
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
    }
  }
})
