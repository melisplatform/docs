# MelisCmsPageAnalytics

> Statistiques de pages par défaut pour les sites Melis CMS — enregistre les vues de page et permet
> à un site de brancher un fournisseur d'analytics externe (par ex. Google Analytics). Paquet
> `melisplatform/melis-cms-page-analytics`.

## Objectif

`MelisCmsPageAnalytics` est le traceur de vues de page intégré à la plateforme. À chaque rendu de
page **front-office**, il enregistre une visite (une par session, par page et par jour) dans
`melis_cms_page_analytics`, et expose les données dans le backoffice via un outil **Site Analytics**
et un onglet **Page Analytics** sur chaque page. Il est aussi extensible : par site, vous pouvez
stocker une clé de fournisseur d'analytics, des réglages et un extrait JavaScript que le module
injecte dans le `<head>` de la page au moment du rendu — le point d'extension utilisé par des
fournisseurs additionnels comme Google Analytics.

## Activation

C'est un module Laminas standard, déjà listé dans `config/melis.module.load.php` :

```php
'MelisCmsPageAnalytics',
```

Dépendances (d'après `composer.json`) : `melisplatform/melis-core` et `melisplatform/melis-cms`. Le
module s'appuie aussi à l'exécution sur des services `melis-engine` / `melis-front` (arbre, tables
de pages, événements de dispatch front). Il fournit des deltas dbdeploy (`"dbdeploy": true`) : ses
tables sont créées/mises à jour via le [mécanisme de deltas de base de données](/fr/reference/modules).
Voir [Référence des modules](/fr/reference/modules) et [Construire un site](/fr/guide/build-a-site).

## Services principaux

Déclarés comme alias `service_manager` dans `config/module.config.php` :

| Alias de service | Rôle |
| --- | --- |
| `MelisCmsPageAnalyticsService` | Retourne la configuration d'analytics courante d'un site. `getAnalytics($siteId)` lit la clé de fournisseur active dans `melis_cms_page_analytics_data`, puis la ligne correspondante dans `melis_cms_page_analytics_data_settings` (désérialise `pads_settings`). |
| `MelisCmsDefaultPageAnalyticsService` | Enregistre une vue de page. `saveAnalyticsData($pageId)` résout le site, vérifie que la page est active, et insère une ligne dans `melis_cms_page_analytics` — une fois par session et par jour — sauf si un fournisseur externe (view id Google Analytics + token) est configuré. |

Les deux services étendent `MelisEngineGeneralService` et émettent des événements de début/fin
(`melis_cms_page_analytics_get_current_analytics_*`, `melis_cms_default_page_analytics_save_*`).

Les tables modèle sont aussi aliasées : `MelisCmsPageAnalyticsTable` (avec `getData(...)`,
`getDataByPageId(...)`, `getDataBySessionAndPageId($pageId, $sessionCookie)`),
`MelisCmsPageAnalyticsDataTable` (`getAnalytics($siteId, $analyticsKey = null)`) et
`MelisCmsPageAnalyticsDataSettingsTable`.

## Backoffice

Le module ajoute un outil **Site Analytics** et un onglet **Page Analytics** par page (configuration
dans `config/app.interface.php` / `config/app.tools.php`) :

| Élément (melisKey) | Forward |
| --- | --- |
| `meliscms_page_analytics_tool_display` (outil Site Analytics, sous le menu des outils de site) | `MelisCmsPageAnalyticsTool::tool-container` |
| `meliscms_page_analytics_site_analytics_tab_content` (table des vues par site) | `MelisCmsPageAnalyticsTool::tool-content-container-analytics-tab-content` |
| `meliscms_page_analytics_site_analytics_tab_settings_content` (formulaire des réglages du fournisseur) | `MelisCmsPageAnalyticsTool::tool-content-container-analytics-settings-tab-content` |
| `meliscms_page_analytics_tab` / `meliscms_page_analytics_tab_display` (onglet de l'éditeur de page) | `MelisCmsPageAnalyticsPageDetailsTool::tool-container` |

Les deux outils DataTable (`MelisCmsPageAnalytics_tool`, `MelisCmsPageAnalytics_page_details`)
chargent leurs lignes en AJAX depuis `MelisCmsPageAnalyticsToolController::getMelisCmsPageAnalyticsDataAction`
et `MelisCmsPageAnalyticsPageDetailsToolController::getMelisCmsPageAnalyticsPageDetailsDataAction`.
Le formulaire de réglages (`getSettingsFormAction`, `saveAction`) persiste, par site, la clé du
fournisseur, les réglages et l'extrait JS. Voir [Créer un outil](/fr/guide/create-a-tool).

Une route d'installation autonome (`MelisSetupController::setup-form`) est également fournie.

## Front office

Il n'y a pas de plugin de templating ni de view helper. Le traçage et l'injection du script sont
réalisés par un listener d'événements, `MelisCmsPageAnalytics\Listener\MelisCmsPageAnalyticsListener`
(attaché dans `Module::onBootstrap`), qui s'accroche à deux événements front :

- `melisfront_site_dispatch_ready` — pour les rendus front uniquement, appelle
  `MelisCmsDefaultPageAnalyticsService::saveAnalyticsData($pageId)` pour enregistrer la visite.
- `melis_front_layout` — lit l'extrait `pads_js_analytics` configuré pour le site et l'injecte
  avant `</head>` de la page rendue.

Pour le rendu front piloté par événements en général, voir [Plugins](/fr/guide/plugins) et
[Construire un site](/fr/guide/build-a-site).

## Tables de base de données

Créées/mises à jour par `install/dbdeploy/*.sql` :

| Table | Rôle |
| --- | --- |
| `melis_cms_page_analytics` | Vues de page enregistrées : `ph_id`, `ph_page_id`, `ph_session_id`, `ph_date_visit`, `ph_site_id`. |
| `melis_cms_page_analytics_data` | Le fournisseur d'analytics actif par site : `pad_id`, `pad_site_id`, `pad_analytics_key`. |
| `melis_cms_page_analytics_data_settings` | Configuration du fournisseur par site : `pads_id`, `pads_site_id`, `pads_analytics_key`, `pads_settings` (sérialisé), `pads_js_analytics`. |

## Exemple

Lire le nombre de vues d'une page, ou la configuration d'analytics active, depuis un service ou un
contrôleur :

```php
// Fournisseur/config d'analytics actif pour un site (null si rien n'est configuré)
$analytics = $sm->get('MelisCmsPageAnalyticsService')->getAnalytics($siteId);

// Vues enregistrées pour une page (utilisé par l'onglet Page Analytics)
$views = $sm->get('MelisCmsPageAnalyticsTable')->getDataByPageId($pageId);
```

L'enregistrement d'une vue se fait automatiquement au rendu front via le listener ; vous n'appelez
normalement jamais `saveAnalyticsData()` vous-même.

## Fichiers clés

| Sujet | Chemin |
| --- | --- |
| Module / bootstrap | `vendor/melisplatform/melis-cms-page-analytics/src/Module.php` |
| Routes, services, contrôleurs | `vendor/melisplatform/melis-cms-page-analytics/config/module.config.php` |
| Interface outil/onglet backoffice | `vendor/melisplatform/melis-cms-page-analytics/config/app.interface.php` |
| Configuration des outils DataTable | `vendor/melisplatform/melis-cms-page-analytics/config/app.tools.php` |
| Service de config courante | `vendor/melisplatform/melis-cms-page-analytics/src/Service/MelisCmsPageAnalyticsService.php` |
| Service d'enregistrement des vues | `vendor/melisplatform/melis-cms-page-analytics/src/Service/MelisCmsDefaultPageAnalyticsService.php` |
| Listener front (traçage + injection) | `vendor/melisplatform/melis-cms-page-analytics/src/Listener/MelisCmsPageAnalyticsListener.php` |
| Contrôleur d'outil | `vendor/melisplatform/melis-cms-page-analytics/src/Controller/MelisCmsPageAnalyticsToolController.php` |
| Contrôleur détails de page | `vendor/melisplatform/melis-cms-page-analytics/src/Controller/MelisCmsPageAnalyticsPageDetailsToolController.php` |
| Tables | `vendor/melisplatform/melis-cms-page-analytics/src/Model/Tables/` |
| Install / dbdeploy | `vendor/melisplatform/melis-cms-page-analytics/install/dbdeploy/` |
