# MelisCmsPageAnalytics

> Statistiques de visites de pages pour les sites CMS — enregistre les vues de page et permet à un
> site de brancher un fournisseur d'analytics externe (par ex. Google Analytics), désormais piloté
> depuis un back-office React natif. Paquet `melisplatform/melis-cms-page-analytics`.

## Présentation

`MelisCmsPageAnalytics` est le traceur de vues de page intégré à la plateforme. À chaque rendu de
page front-office, il enregistre une visite dédupliquée (une fois par session, par page et par jour)
dans `melis_cms_page_analytics`, et expose les données dans le back-office via un outil de site
**Page Analytics** et un onglet **Page Analytics** sur chaque page CMS. Par site, vous pouvez aussi
stocker une clé de fournisseur d'analytics et un extrait JavaScript que le module injecte dans le
`<head>` de la page au moment du rendu — le point d'extension utilisé par des fournisseurs
additionnels comme Google Analytics.

En v6, le back-office est une **brique React native à part entière** : un tableau de visites en
lecture seule accompagné d'un panneau de paramètres, appelant une couche JSON `react-api`. Le
traçage, le contrat fournisseur et la persistance des paramètres sont inchangés — la v6 ne remplace
que la couche d'affichage.

## Activation

Ajouter dans `config/melis.module.load.php` :

```php
return [
    'MelisCmsPageAnalytics',
];
```

Dépendances Composer requises : `melisplatform/melis-core` et `melisplatform/melis-cms`. Le module
s'appuie aussi à l'exécution sur les services `melis-engine` et `melis-front` (arbre, tables de
pages, événements de dispatch front). Les tables de base de données sont installées via
`MelisSetupController` depuis `install/sql/`. La brique React n'apparaît dans le menu que tant que le
module est listé dans `melis.module.load.php` (découverte modulaire des briques).

## Services principaux

Déclarés comme alias `service_manager` dans `config/module.config.php` :

| Alias de service | Rôle |
| --- | --- |
| `MelisCmsPageAnalyticsService` | Service principal implémentant le contrat fournisseur. `getAnalytics($siteId)` lit la clé du fournisseur actif dans `melis_cms_page_analytics_data` et la ligne de paramètres correspondante dans `melis_cms_page_analytics_data_settings`. |
| `MelisCmsDefaultPageAnalyticsService` | Enregistreur intégré. `saveAnalyticsData($pageId)` résout le site, vérifie que la page est active/publiée, et insère une ligne dédupliquée dans `melis_cms_page_analytics` — sauf si un identifiant de vue Google Analytics et un token sont configurés, auquel cas le compteur intégré s'efface. |
| `MelisCmsPageAnalyticsTable` | Table gateway pour le journal des visites. |
| `MelisCmsPageAnalyticsDataTable` | Table gateway pour la sélection du fournisseur par site. |
| `MelisCmsPageAnalyticsDataSettingsTable` | Table gateway pour les paramètres par (site, fournisseur). |

Les deux services principaux émettent des événements de début/fin :
`melis_cms_default_page_analytics_save_start` / `melis_cms_default_page_analytics_save_end`.

## Front office

Il n'existe pas de view helper ni de plugin de templating. Le traçage et l'injection du script sont
gérés par `MelisCmsPageAnalyticsListener` (attaché dans `Module.php`), qui s'accroche à deux
événements du pipeline de rendu front :

| Événement | Priorité | Action |
| --- | --- | --- |
| `melisfront_site_dispatch_ready` | `-10000` | Rendus front uniquement — appelle `MelisCmsDefaultPageAnalyticsService::saveAnalyticsData($pageId)` pour enregistrer la visite dédupliquée. |
| `melis_front_layout` | par défaut | Lit l'extrait `pads_js_analytics` configuré pour le site et l'injecte avant `</head>` du HTML rendu. |

## Tables de base de données

| Table | PK | Contenu |
| --- | --- | --- |
| `melis_cms_page_analytics` | `ph_id` | Journal des visites (hits dédupliqués) : `ph_page_id`, `ph_session_id`, `ph_date_visit`, `ph_site_id`. Aucune adresse IP n'est stockée. |
| `melis_cms_page_analytics_data` | `pad_id` | Sélection du fournisseur par site : `pad_site_id`, `pad_analytics_key`. |
| `melis_cms_page_analytics_data_settings` | `pads_id` | Paramètres par (site, fournisseur) : `pads_site_id`, `pads_analytics_key`, `pads_js_analytics`, `pads_settings` (ex. `google_analytics_view_id`). |

## Back-office React

L'outil est une **brique React native à part entière** dotée d'un bascule **New / Old** capable de
retomber sur l'outil legacy dans une iframe. Il se trouve dans la barre latérale sous **Marketing /
Outils de site → Page Analytics** et s'ouvre avec deux onglets internes, **Analytics** et
**Paramètres**.

| Propriété de la brique | Valeur |
| --- | --- |
| Id de la brique | `pageanalytics` |
| `route` du manifeste | `/melis-marketing/meliscms-page-analytics` |
| `forwardKey` | `MelisCmsPageAnalytics/MelisCmsPageAnalyticsTool` |
| `melisKey` (cible iframe de la vue Old) | `meliscms_page_analytics_display` |
| Nœud de garde d'accès (contrôleur) | `meliscms_page_analytics_tools_section` |
| Base de l'API | `/melis/react-api/page-analytics` |

- **Onglet Analytics** — un tableau en lecture seule des visites **agrégées par page** (id de page,
  nom de page, nombre de visites, dernière visite) avec des cartes KPI (hits / pages / sites /
  dernière visite), un filtre par site, une recherche, un gestionnaire de colonnes, un défilement
  infini, un tri côté serveur et un **Export**. Les pages supprimées affichent une mention en
  italique *(deleted)*. Si le site sélectionné est associé à un fournisseur tiers qui embarque son
  propre affichage React, l'onglet héberge **le tableau de bord de ce module** à la place du tableau
  intégré.
- **Onglet Paramètres** — choisir un **Site** puis un **Module d'analytics** (l'option intégrée
  « no analytics » plus chaque fournisseur actif). Les champs propres au module choisi sont rendus de
  façon dynamique (text / textarea / select / password / file, par ex. une clé privée Google
  Analytics). Les administrateurs de la plateforme peuvent aussi éditer l'extrait JS personnalisé du
  `<head>` ; les non-administrateurs le voient en lecture seule.

> Les captures d'écran React de ces écrans ne sont pas encore disponibles.

## API React

Les routes sont définies dans `config/react-api.php` et fusionnées dans la configuration du module.
Le contrat est `{ success, data, error }` ; chaque requête envoie `X-Requested-With: XMLHttpRequest`
et `credentials: 'include'`. Deux contrôleurs alimentent l'interface :
`MelisReactApiPageAnalyticsController` (l'outil) et `MelisReactApiPageAnalyticsTabController`
(l'onglet de l'éditeur de page CMS).

| Méthode et URL | Objet |
| --- | --- |
| `GET /melis/react-api/page-analytics` | Visites agrégées par page (keyset : `limit`, `search`, `site`, `sort`, `dir`, `after`) → `{items,total,nextCursor}`, chaque item `{pageId,pageName,count,lastVisit}`. |
| `GET /melis/react-api/page-analytics/stats` | KPI `{hits, pages, sites, lastVisit}` (respecte `search`/`site`). |
| `GET /melis/react-api/page-analytics/sites` | Options de sites `{sites:[{id,name}]}` pour le sélecteur. |
| `GET /melis/react-api/page-analytics/settings` | État de l'onglet Paramètres (liste des modules + schéma de formulaire dynamique + valeurs courantes). |
| `GET /melis/react-api/cms-page/analytics` | Visites d'une page (`idPage`, `page`, `perPage`) → `{visits, sessions, lastVisit, recent, page, perPage, recentTotal}`. |

Le contrôleur de l'outil lit les tables directement via du SQL paramétré (`melis_cms_page_analytics`
jointe à `melis_cms_page_published` pour les noms et à `melis_cms_site` pour le sélecteur, curseur
keyset opaque). Il protège l'accès sur le nœud porteur de droits
`meliscms_page_analytics_tools_section` — **et non** sur le `melisKey` du manifeste
(`meliscms_page_analytics_display`), qui n'est que la clé de zone iframe de la vue Old.

**L'écriture des paramètres n'est pas une route react-api** — le panneau Paramètres POST un payload
`FormData` vers l'action de l'outil legacy afin que toute la logique côté serveur (validation
Laminas, upload de la clé GA, sérialisation `pads_settings`, garde admin sur le JS brut, flash
messenger) soit réutilisée à l'identique :

```ts
const LEGACY_SAVE_URL = '/melis/MelisCmsPageAnalytics/MelisCmsPageAnalyticsTool/save'
await fetch(LEGACY_SAVE_URL, {
  method: 'POST',
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
  credentials: 'include',
  body: formData,
}) // → { success, textTitle, textMessage, errors }
```

## Onglet de page CMS et capacités

Le module contribue un onglet **Page Analytics** à l'éditeur de page CMS, alimenté par
`GET /melis/react-api/cms-page/analytics` (total des visites, sessions distinctes, dernière visite et
une liste paginée des dates de visite récentes pour cette page). L'onglet est déclaré dans
`config/react.capabilities.php` sous le nœud partagé `meliscms_page`, et la clé
`meliscms_page_analytics_tab` **est** la chaîne de capacité utilisée pour le contrôler dans
Utilisateurs → Droits :

```php
'melisReactToolCapabilities' => [
  'meliscms_page' => [
    'tabs' => [
      ['key' => 'meliscms_page_analytics_tab', 'label' => 'tr_melis_cms_page_analytics_title'],
    ],
  ],
],
```

## Affichage modulaire au niveau du site

Lorsqu'un site est associé à un module d'analytics tiers qui déclare un affichage React (par ex.
**MelisCmsGoogleAnalytics** via `react_display_key`), l'onglet Analytics héberge l'affichage React
propre à ce module au lieu du tableau de visites natif. La brique consomme un registre global,
`window.__melisAnalyticsSiteDisplays[<analyticsKey>]` ; elle revérifie sur l'événement de fenêtre
`melis:analytics-site-display-registered` (les bundles se chargent de façon asynchrone) et, si rien
n'est enregistré, retombe sur une iframe `/melis/react-tool-page?key=<displayKey>&siteId=<site>`.

## Exemple

```php
// Lire la configuration du fournisseur d'analytics actif pour un site
$analytics = $serviceManager->get('MelisCmsPageAnalyticsService')->getAnalytics($siteId);

// Lire les visites enregistrées pour une page spécifique (utilisé par l'onglet Page Analytics)
$visits = $serviceManager->get('MelisCmsPageAnalyticsTable')->getDataByPageId($pageId);
```

L'enregistrement des visites se fait automatiquement au rendu front via le listener ; il n'est
normalement pas nécessaire d'appeler `saveAnalyticsData()` directement.

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Bootstrap du module / enregistrement du listener | `vendor/melisplatform/melis-cms-page-analytics/src/Module.php` |
| Routes, services, alias de tables, contrôleurs | `vendor/melisplatform/melis-cms-page-analytics/config/module.config.php` |
| Routes de l'API React | `vendor/melisplatform/melis-cms-page-analytics/config/react-api.php` |
| Capacité de l'onglet React | `vendor/melisplatform/melis-cms-page-analytics/config/react.capabilities.php` |
| Brique React + manifeste | `vendor/melisplatform/melis-cms-page-analytics/public/ui-react/` |
| Sources React | `vendor/melisplatform/melis-cms-page-analytics/ui-react/src/` |
| Contrôleurs de l'API React | `vendor/melisplatform/melis-cms-page-analytics/src/Controller/MelisReactApiPageAnalyticsController.php`, `MelisReactApiPageAnalyticsTabController.php` |
| Contrat fournisseur | `vendor/melisplatform/melis-cms-page-analytics/src/Service/MelisCmsPageAnalyticsServiceInterface.php` |
| Service d'analytics principal | `vendor/melisplatform/melis-cms-page-analytics/src/Service/MelisCmsPageAnalyticsService.php` |
| Enregistreur intégré | `vendor/melisplatform/melis-cms-page-analytics/src/Service/MelisCmsDefaultPageAnalyticsService.php` |
| Listener front (traçage + injection) | `vendor/melisplatform/melis-cms-page-analytics/src/Listener/MelisCmsPageAnalyticsListener.php` |
| Tables gateway | `vendor/melisplatform/melis-cms-page-analytics/src/Model/Tables/` |
| SQL d'installation | `vendor/melisplatform/melis-cms-page-analytics/install/sql/` |

Voir aussi : [melis-cms](/fr/reference/modules/melis-cms), [melis-core](/fr/reference/modules/melis-core)
