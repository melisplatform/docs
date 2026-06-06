# Référence des modules

Melis Platform est un ensemble de paquets Composer `melisplatform/*`. Voici une carte des modules
fournis avec le skeleton, regroupés par domaine. Chacun est un module Laminas standard sous
`vendor/melisplatform/`.

::: tip Une page par module
Chaque module a aussi une **page de référence dédiée** (rôle, services clés, tools, plugins, tables,
fichiers clés) — ouvrez la section **Modules** dans la sidebar, p. ex.
[MelisCore](/fr/reference/modules/melis-core), [MelisCms](/fr/reference/modules/melis-cms),
[MelisCommerce](/fr/reference/modules/melis-commerce),
[MelisAIEngine](/fr/reference/modules/melis-ai-engine).
:::

## Cœur & plateforme

| Module | Rôle |
| --- | --- |
| `melis-core` | Le cœur de la plateforme : shell du backoffice, arbre de config (`MelisCoreConfig`), auth, droits, services, événements. |
| `melis-asset-manager` | Sert et gère les assets des modules/sites (CSS/JS/images). |
| `melis-installer` | L'assistant de configuration au premier lancement. |
| `melis-dbdeploy` | Deltas de base versionnés (mécanisme du `changelog`). |
| `melis-composerdeploy` | Déploiement/mise à jour des modules via Composer. |
| `melis-marketplace` | Marketplace dans le backoffice pour découvrir & installer des modules. |

## CMS & front office

| Module | Rôle |
| --- | --- |
| `melis-cms` | Le backoffice CMS : sites, arbre de pages, éditeur de page, templates. |
| `melis-engine` | Services de pages/données qui alimentent le rendu (`MelisPageService`, arbre, cache). |
| `melis-front` | Le moteur front-office qui affiche les sites (`MelisTag`, `MelisDragDropZone`). |
| `melis-demo-cms` | Le site démo officiel — l'exemple canonique d'un module de site. |
| `melis-cms-news` | Actualités + plugin de templating. |
| `melis-cms-prospects` | Capture de prospects/leads + plugin de templating. |
| `melis-cms-slider` | Système de slider + plugin de templating. |
| `melis-cms-category2` | Catégories de contenu. |
| `melis-cms-page-historic` | Historique de versions par page. |
| `melis-cms-page-analytics` | Analytics de page par défaut. |
| `melis-cms-page-script-editor` | Injection de scripts custom par page / par site. |
| `melis-cms-site-robot` | Génération dynamique du `robots.txt` par site. |

## Commerce

| Module | Rôle |
| --- | --- |
| `melis-commerce` | Module e-commerce (catalogue, commandes, clients…). |
| `melis-commerce-order-invoice` | Facturation des commandes pour MelisCommerce. |

## Construire & étendre

| Module | Rôle |
| --- | --- |
| `melis-tool-creator` | Générateur GUI de nouveaux **tools** backoffice (voir [Créer un tool](../guide/create-a-tool)). |
| `melis-templating-plugin-creator` | Scaffolder de nouveaux **plugins de templating** front-office. |
| `melis-dashboard-plugin-creator` | Scaffolder de nouveaux **plugins de dashboard** backoffice. |
| `melis-data-source` | Module de source de données générique. |
| `melis-document-upload` | Gestion d'upload de documents/fichiers. |
| `melis-calendar` | Fonctionnalités de calendrier. |
| `melis-messenger` | Messagerie. |
| `melis-design` | Helpers de design/thématisation. |
| `melis-small-business` | Fonctionnalités orientées petites entreprises. |

## IA

| Module | Rôle |
| --- | --- |
| `melis-ai` | Le module IA exposé dans le backoffice. |
| `melis-ai-engine` | Le moteur IA cœur (agents, instances, scénarios). |
| `melis-ai-engine-claude` | Provider Anthropic Claude pour le moteur IA. |
| `melis-ai-engine-gemini` | Provider Google Gemini pour le moteur IA. |
| `melis-ai-community-extensions` | Extensions IA communautaires (assistants contenu/news/template…). |
| `melis-ai-tool-creator` | Créer des tools propulsés par l'IA. |

## Détails des modules (services & tables)

Les modules que vous intégrerez le plus souvent, avec leurs principaux services publics et tables
clés.

### Modules de contenu CMS

- **melis-cms-news** — actualités/blog. Services `MelisCmsNewsService`, `MelisCmsNewsSeoService` ;
  plugins front `MelisCmsNewsLatestNewsPlugin`, `MelisCmsNewsListNewsPlugin`,
  `MelisCmsNewsShowNewsPlugin`. Tables `melis_cms_news`, `melis_cms_news_texts`, `melis_cms_news_seo`.
- **melis-cms-prospects** — capture de leads. Service `MelisProspectsService` ; plugin front
  `MelisCmsProspectsShowFormPlugin` ; service d'auto-suppression RGPD. Tables `melis_cms_prospects*`.
- **melis-cms-slider** — sliders. Service `MelisCmsSliderService` ; plugin front
  `MelisCmsSliderShowSliderPlugin`.
- **melis-cms-category2** — catégories multi-site/langue. Services `MelisCmsCategory2Service`,
  `MelisCmsCategory2MediaService` ; plugin front `MelisCmsCategoryDisplayCategoriesPlugin`. Tables
  `melis_cms_category2*`.
- **melis-cms-page-script-editor** — injecte du JS/CSS custom par page/site (listeners d'injection
  au rendu). Tables `melis_cms_scripts`, `melis_cms_scripts_exceptions`.
- **melis-cms-page-historic** — historique de versions de page (onglet Historic). Table
  `melis_hist_page_historic`.
- **melis-cms-page-analytics** — analytics par page (extensible, p. ex. Google Analytics). Service
  `MelisCmsPageAnalyticsService`.
- **melis-cms-site-robot** — sert un `robots.txt` par site.

### Utilitaires & extensions

- **melis-document-upload** — uploads de fichiers sécurisés par token. Services
  `MelisDocumentUploadService`, `MelisDocumentService`. Tables `melis_docupl_*`. Accès public via
  `?token=…`.
- **melis-data-source** — sources de données génériques (CSV / requête DB / custom) consommées par
  des tools & plugins. Service `MelisDataSourceService` ; helpers `DataSourceHelper`,
  `DataFiltersViewHelper`.
- **melis-calendar** — calendrier backoffice + événements. Service `MelisCalendarService` ; table
  `melis_calendar` ; widget dashboard `MelisCalendarEventsPlugin`.
- **melis-messenger** — messagerie interne. Service `MelisMessengerService` ; tables
  `melis_messenger_msg*`.
- **melis-small-business** — versioning de page, workflow/approbation, commentaires, verrouillage de
  page, médiathèque. Services autour de `MelisSBPageService`, `MelisSBPageCommentService` ; tables
  `melis_sb_*`.
- **melis-design** — une grande bibliothèque de patterns UI HTML/CSS/JS prêts (sans services) à
  copier pour construire tools/plugins.

### Plomberie de la plateforme

- **melis-asset-manager** — sert les assets `public/` des modules et génère
  `config/melis.modules.path.php`. Service `MelisAssetManagerModulesService` ; view helpers d'icônes.
- **melis-marketplace** — parcourir/installer des modules depuis Packagist
  (`type: melisplatform-module`). Service `MelisMarketPlaceService`.
- **melis-installer** — assistant de configuration au premier lancement (install vide / site / démo).
- **melis-composerdeploy** — déploiement de modules via Composer. Service `MelisComposerService`.
- **melis-tool-creator** — générateur GUI de tools backoffice. Service `MelisToolCreatorService`.

::: tip Parcourir les sources
Chaque module se trouve dans `vendor/melisplatform/<nom-du-module>/`. Lire les dossiers `config/`
et `src/` d'un module est le moyen le plus rapide d'apprendre ses services publics et ses
conventions.
:::
