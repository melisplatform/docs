# MelisCmsPageAnalytics

> Statistiques de visites de pages pour les sites CMS — enregistre les vues de page et permet
> à un site de brancher un fournisseur d'analytics externe (par ex. Google Analytics). Paquet
> `melisplatform/melis-cms-page-analytics`.

## Présentation

`MelisCmsPageAnalytics` est le traceur de vues de page intégré à la plateforme. À chaque rendu de
page front-office, il enregistre une visite dédupliquée (une fois par session, par page et par jour)
dans `melis_cms_page_analytics`, et expose les données dans le back-office via un outil **Page
Analytics** global et un onglet **Page Analytics** sur chaque page CMS. Par site, vous pouvez
également stocker une clé de fournisseur d'analytics et un extrait JavaScript que le module injecte
dans le `<head>` de la page au moment du rendu — le point d'extension utilisé par des fournisseurs
additionnels comme Google Analytics.

## Activation

Ajouter dans `config/melis.module.load.php` :

```php
return [
    'MelisCmsPageAnalytics',
];
```

Dépendances Composer requises : `melisplatform/melis-core ^5.2` et `melisplatform/melis-cms ^5.2`.
Le module s'appuie aussi à l'exécution sur les services `melis-engine` et `melis-front` (arbre,
tables de pages, événements de dispatch front). Les tables de base de données sont installées via
`MelisSetupController` depuis `install/sql/`.

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

## Back-office

Configuré dans `config/app.interface.php` et `config/app.tools.php`. Le module ajoute deux éléments
d'interface :

| Élément | Emplacement | Contenu |
| --- | --- | --- |
| Outil **Page Analytics** (`meliscms_page_analytics_tool_display`) | Menu Outils du site sous `meliscms_site_tools_parent_menu` (icône `fa-bar-chart`) | Deux onglets : **Analytiques du site** (tableau des visites : Id, Page id, Nom de la page, Date de visite) et **Paramètres** (sélection du fournisseur + extrait JS). |
| Onglet **Page Analytics** (`meliscms_page_analytics_tab`) | Éditeur de page CMS → Onglets (icône *stats*) | Visites enregistrées pour la page courante, par date. |

Le formulaire de l'onglet **Paramètres** (`PageAnalyticsSelect` / `PageAnalyticsSiteSelect`)
enregistre la clé du fournisseur actif, les paramètres par site et l'extrait `pads_js_analytics`
dans `melis_cms_page_analytics_data` / `melis_cms_page_analytics_data_settings`.

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
| Interface outil back-office + onglet de page | `vendor/melisplatform/melis-cms-page-analytics/config/app.interface.php` |
| Configuration des outils DataTable | `vendor/melisplatform/melis-cms-page-analytics/config/app.tools.php` |
| Configuration des formulaires de paramètres | `vendor/melisplatform/melis-cms-page-analytics/config/app.forms.php` |
| Contrat fournisseur | `vendor/melisplatform/melis-cms-page-analytics/src/Service/MelisCmsPageAnalyticsServiceInterface.php` |
| Service d'analytics principal | `vendor/melisplatform/melis-cms-page-analytics/src/Service/MelisCmsPageAnalyticsService.php` |
| Enregistreur intégré | `vendor/melisplatform/melis-cms-page-analytics/src/Service/MelisCmsDefaultPageAnalyticsService.php` |
| Listener front (traçage + injection) | `vendor/melisplatform/melis-cms-page-analytics/src/Listener/MelisCmsPageAnalyticsListener.php` |
| Contrôleur de l'outil global | `vendor/melisplatform/melis-cms-page-analytics/src/Controller/MelisCmsPageAnalyticsToolController.php` |
| Contrôleur de l'onglet par page | `vendor/melisplatform/melis-cms-page-analytics/src/Controller/MelisCmsPageAnalyticsPageDetailsToolController.php` |
| Tables gateway | `vendor/melisplatform/melis-cms-page-analytics/src/Model/Tables/` |
| SQL d'installation | `vendor/melisplatform/melis-cms-page-analytics/install/sql/` |

Voir aussi : [melis-cms](/fr/reference/modules/melis-cms), [melis-core](/fr/reference/modules/melis-core)
