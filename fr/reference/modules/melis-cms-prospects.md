# MelisCmsProspects

> Système de gestion de prospects / contacts : formulaire de contact en front-office, gestion des prospects en back-office et intégration RGPD. Package `melisplatform/melis-cms-prospects`.

## Présentation

`MelisCmsProspects` capture les soumissions de formulaire de contact des visiteurs en tant que **prospects** (leads) stockés en base de données. Les utilisateurs du back-office parcourent, filtrent, modifient, exportent (CSV) et suppriment ces leads, et les classifient par **thèmes**. Le module inclut un widget de statistiques pour le tableau de bord et s'intègre aux outils RGPD de la plateforme (informations utilisateur / extraction / suppression + cycle d'auto-suppression).

## Activation

Ajouter dans `config/melis.module.load.php` :

```php
return [
    'MelisCmsProspects',
];
```

Dépendances : `melis-core`, `melis-engine`, `melis-front`, `melis-cms` (`^5.2`) et
`laminas/laminas-mvc-plugin-flashmessenger`. Le module est en `dbdeploy: true` — ses tables sont
créées/mises à jour via le mécanisme dbdeploy.

## Services principaux

| Alias de service | Rôle |
| --- | --- |
| `MelisCmsProspectsService` / `MelisProspectsService` | Service principal. `saveProspectsDatas($datas, $prosId = null)` crée ou met à jour un prospect ; `getProspectsDataForWidgets($widgetId = '')` retourne les totaux / mois en cours / moyennes ; `getProspectsDataByDate($type, $date)` compte les inscriptions par date ; `getWidgetProspects($identifier)` récupère les données pour un widget. |
| `MelisProspectsGdprAutoDeleteService` | Gère le cycle d'auto-suppression RGPD (liste des modules, liste des tags, listes d'utilisateurs d'avertissement / second avertissement, suppression du compte). |

Passerelles de table : `MelisProspects`, `MelisCmsProspectsThemeTable`,
`MelisCmsProspectsThemeItemTable`, `MelisCmsProspectsThemeItemTransTable`.

## Back-office

Deux outils principaux enregistrés sous la section des outils Marketing :

| Outil | Contrôleur | Rôle |
| --- | --- | --- |
| Prospects | `ToolProspectsController` | Liste tous les leads avec filtres sur la limite / plage de dates / site / type, recherche, export CSV (`exportToCsvAction`), modale d'édition et suppression. Trois widgets de statistiques en en-tête : total, ce mois-ci, moyenne mensuelle. |
| Thèmes | `MelisCmsProspectsThemesController` / `MelisCmsProspectsThemeItemsController` | Gérer les **thèmes** de sujets et leurs **items** traduisibles (les options du menu déroulant de sujet affichées dans le formulaire front). |

Un **plugin de tableau de bord** (`MelisCmsProspectsStatisticsPlugin`, section `MelisMarketing`)
ajoute un graphique « Prospects Statistics » (Flot) au tableau de bord du back-office.

### RGPD & hooks d'événements

Événements au niveau des contrôleurs (à attacher avec `MelisCmsProspects` comme identifiant cible) :

| Nom de l'événement | Déclenché par |
| --- | --- |
| `meliscmsprospects_toolprospects_save_start` / `_end` | `ToolProspectsController` |
| `meliscmsprospects_toolprospects_delete_start` / `_end` | `ToolProspectsController` |
| `meliscmsprospects_theme_save_end` / `…_delete_end` | `ProspectThemesController` |
| `meliscmsprospects_theme_item_save_end` | `ProspectThemeItemsController` |

```php
$sharedEvents->attach(
    'MelisCmsProspects',
    'meliscmsprospects_toolprospects_save_end',
    $fn,
    50
);
```

Les listeners RGPD (informations utilisateur, extraction, suppression, auto-suppression) sont câblés dans `src/Module.php`. Les mappings de champs RGPD se trouvent dans `config/app.gdpr.php`.

## Front office

Le plugin de contrôleur `MelisCmsProspectsShowFormPlugin` affiche le formulaire de contact en
front-office. Déposez le bloc **Show Form** sur une page depuis le sélecteur de plugins de
l'éditeur de pages ; l'éditeur expose trois onglets de configuration :

| Onglet | Contrôles |
| --- | --- |
| Properties | Template de rendu (`template_path`) et site source (`pros_site_id`). |
| Fields | Table de construction des champs — activer/désactiver Afficher / Obligatoire par champ, glisser les lignes pour réordonner. Champs disponibles : `pros_name`, `pros_company`, `pros_country`, `pros_email`, `pros_telephone`, `pros_message`. La case Obligatoire n'est activée que lorsque le commutateur Afficher d'un champ est actif. |
| Theme | Le thème qui alimente le menu déroulant de sujet du formulaire. |

Fichier de configuration : `config/plugins/MelisCmsProspectsShowFormPlugin.config.php`. Template front :
`view/.../plugins/prospects-form.phtml`.

## Tables de base de données

| Table | Contenu |
| --- | --- |
| `melis_cms_prospects` | Un lead capturé : site, type, thème, nom, email, téléphone, message, société, pays, date de contact, dernière date RGPD. PK : `pros_id`. |
| `melis_cms_prospects_themes` | Thèmes de sujets (`pros_theme_name`, `pros_theme_code`). PK : `pros_theme_id`. |
| `melis_cms_prospects_theme_items` | Items appartenant à un thème. PK : `pros_theme_item_id`. |
| `melis_cms_prospects_theme_items_trans` | Traductions par langue des items de thème. PK : `item_trans_id`. |

## Exemple

```php
$prospects = $this->getServiceManager()->get('MelisProspectsService');

// Create or update a prospect
$id = $prospects->saveProspectsDatas($datas, $prosId);

// Get registration count by date
$nb = $prospects->getProspectsDataByDate('monthly', '2017-10-04 12:00:00');

// Get stats for backoffice widgets (total / this month / average)
$w  = $prospects->getProspectsDataForWidgets();
```

## Fichiers clés

| Élément | Chemin (sous `vendor/melisplatform/melis-cms-prospects/`) |
| --- | --- |
| Config module / routes / services | `config/module.config.php` |
| Arbre de l'interface back-office | `config/app.interface.php` |
| Tables & formulaires des outils | `config/app.tools.php` |
| Config du plugin de templating | `config/plugins/MelisCmsProspectsShowFormPlugin.config.php` |
| Config du widget de tableau de bord | `config/dashboard-plugins/` |
| Mapping des champs RGPD | `config/app.gdpr.php` |
| Service principal | `src/Service/MelisCmsProspectsService.php` |
| Service RGPD d'auto-suppression | `src/Service/` |
| Plugin de formulaire front | `src/Controller/Plugin/MelisCmsProspectsShowFormPlugin.php` |
| Widget de tableau de bord | `src/Controller/DashboardPlugins/MelisCmsProspectsStatisticsPlugin.php` |
| Contrôleurs back-office | `src/Controller/ToolProspectsController.php`, `MelisCmsProspectsThemesController.php`, `MelisCmsProspectsThemeItemsController.php` |
| Passerelles de table | `src/Model/Tables/` |
| Listeners RGPD & bootstrap | `src/Module.php`, `src/Listener/` |

Voir aussi : [Référence des modules](/fr/reference/modules) · [melis-cms](/fr/reference/modules/melis-cms) · [melis-core](/fr/reference/modules/melis-core)
