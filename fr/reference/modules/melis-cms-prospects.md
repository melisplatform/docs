# MelisCmsProspects

> Capture de prospects / leads pour les sites Melis — un formulaire de contact en front-office,
> un outil de gestion en back-office et l'intégration RGPD. Package
> `melisplatform/melis-cms-prospects`.

## Objectif

`MelisCmsProspects` transforme les soumissions de formulaire en front-office (typiquement un
formulaire « contactez-nous ») en **prospects** stockés en base. Les éditeurs déposent le plugin
de templating `MelisCmsProspectsShowFormPlugin` dans une page ; les visiteurs le remplissent ;
les soumissions sont enregistrées puis consultées, modifiées, filtrées, exportées (CSV) et
supprimées depuis un outil de back-office. Le module fournit aussi un widget de statistiques sur
le tableau de bord, des **thèmes** configurables (listes de sujets) pour le champ « sujet » du
formulaire, et toute la mécanique RGPD (listeners d'info / extraction / suppression utilisateur
ainsi que la participation à l'auto-suppression).

## Activation

Un module Laminas standard. Il est listé dans `config/melis.module.load.php`, entre
`MelisCmsNews` et `MelisCmsSlider` :

```php
return [
    // …
    'MelisCmsProspects',
    // …
];
```

Dépendances (depuis `composer.json`) : `melis-core`, `melis-engine`, `melis-front`, `melis-cms`
(plus `laminas/laminas-mvc-plugin-flashmessenger`). Il est en `dbdeploy: true`, ses tables sont
donc créées/mises à jour via [melis-dbdeploy](/fr/reference/modules).

## Services clés

Enregistrés comme alias de `service_manager` dans `config/module.config.php` :

| Alias | Rôle |
| --- | --- |
| `MelisCmsProspectsService` / `MelisProspectsService` | Service principal (`MelisCmsProspectsService`). `saveProspectsDatas($datas, $prosId = null)` enregistre/met à jour un prospect ; `getProspectsDataForWidgets($widgetId)`, `getProspectsDataByDate($type, $date)` et `getWidgetProspects($identifier)` calculent les statistiques du tableau de bord/de l'outil (totaux, mois en cours, moyenne mensuelle). |
| `MelisProspectsGdprAutoDeleteService` | `MelisCmsProspectsGdprAutoDeleteService` — implémente `MelisCoreGdprAutoDeleteInterface` (liste des tags, listes d'utilisateurs d'avertissement / second avertissement, action de suppression) pour le cron RGPD d'auto-suppression du core. |

Passerelles de table (également aliasées) : `MelisProspects` (`MelisProspectTable`),
`MelisCmsProspectsThemeTable`, `MelisCmsProspectsThemeItemTable`,
`MelisCmsProspectsThemeItemTransTable`. `MelisProspectTable` expose des requêtes notables comme
`getData(...)` (flux de la datatable), `getDataForGdpr(...)`, `getProspectsOrderByDate($order)`,
`getCurrentMonth()`, `getAvgMonth($months)` et `getNumberProspectsPerDay($maxDays)`.

## Back-office

Déclaré dans `config/app.interface.php` et `config/app.tools.php`, sous la section des outils
Marketing (`melisprospects_tools_section`, icône `fa-user-plus`). Les contrôleurs sont sous
`MelisCmsProspects\Controller` :

| Outil (melisKey) | Contrôleur / action | Rôle |
| --- | --- | --- |
| `MelisCmsProspects_tool_prospects` | `ToolProspects` → `render-prospects` | La liste des prospects : datatable avec filtres limite/date/site/type, recherche, export CSV, modales d'édition et de suppression, plus trois widgets d'en-tête (total, ce mois-ci, moyenne mensuelle). |
| `MelisCmsProspects_tool_themes` | `ProspectThemes` → `tool-container` | Gérer les **thèmes** de prospects (groupes de sujets). |
| `MelisCmsProspects_tool_theme_items` | `ProspectThemeItems` → `tool-container` | Gérer les **items de thème** traduisibles (les options de sujet proposées dans le formulaire front). |

La datatable des prospects est alimentée par
`/melis/MelisCmsProspects/ToolProspects/getToolProspectData`. Des fabriques d'éléments de
formulaire personnalisés sont enregistrées : `MelisCmsProspectThemeSelect`,
`MelisCmsProspectThemeItemSelect` et `MelisCmsProspectName`.

Un **plugin de tableau de bord**, `MelisCmsProspectsStatisticsPlugin`
(`config/dashboard-plugins/MelisCmsProspectsStatisticsPlugin.config.php`), ajoute un widget
« Prospects Statistics » (graphiques Flot ligne/barres) — voir [Plugins](/fr/guide/plugins).

### RGPD & listeners

`src/Module.php` attache un ensemble de listeners au bootstrap : RGPD back-office (info /
extraction / suppression utilisateur : `MelisCmsProspectsGdprUserInfoListener`,
`…GdprUserExtractListener`, `…GdprUserDeleteListener`), un listener d'affichage de colonne de la
datatable, un listener de type d'édition pour le tool-creator, un listener de flash-messenger, et
les listeners RGPD d'**auto-suppression** (liste des modules, liste des tags, listes
d'utilisateurs d'avertissement / second avertissement, action de suppression). Les mappings de
champs RGPD sont configurés dans `config/app.gdpr.php` et `config/app.interface.php`
(`gdpr.tags`).

## Front-office

Le plugin de templating `MelisCmsProspectsShowFormPlugin`
(`src/Controller/Plugin/MelisCmsProspectsShowFormPlugin.php`, config
`config/plugins/MelisCmsProspectsShowFormPlugin.config.php`) affiche le formulaire de
prospect/contact. Il étend `MelisEngine\Controller\Plugin\MelisTemplatingPlugin` avec
`configPluginKey = 'meliscmsprospects'` et `pluginXmlDbKey = 'melisCmsProspects'`. Sa
méthode `front()` :

- construit le formulaire à partir des `fields` sélectionnés/obligatoires (`pros_name`,
  `pros_company`, `pros_country`, `pros_telephone`, `pros_email`, `pros_theme`, `pros_message`) ;
- sur un POST valide, résout l'id du site (depuis la config ou l'arbre des pages) et appelle
  `MelisProspectsService::saveProspectsDatas()` ;
- déclenche l'événement `meliscms_prospects_plugin_save` et affiche un message flash de succès.

L'éditeur back-office expose trois onglets de configuration (`config/plugins/…`) : template et
site (`MelisCmsPluginSiteSelect`), les champs à afficher / rendre obligatoires, et le **thème** de
sujet (`MelisCmsProspectThemeSelect`). Le plugin est enregistré dans `module.config.php` sous
`controller_plugins`, dans la section de plugins `MelisMarketing`. Voir
[Plugins](/fr/guide/plugins) et [Construire un site](/fr/guide/build-a-site).

## Tables de base de données

Créées depuis `install/sql/setup_structure.sql` (et les deltas dbdeploy sous
`install/dbdeploy/`) :

| Table | Rôle |
| --- | --- |
| `melis_cms_prospects` | Les prospects capturés (`pros_id`, `pros_site_id`, `pros_type`, `pros_theme`, `pros_name`, `pros_email`, `pros_telephone`, `pros_message`, `pros_company`, `pros_country`, `pros_contact_date`, `pros_gdpr_lastdate`). |
| `melis_cms_prospects_themes` | Thèmes de sujet (`pros_theme_id`, `pros_theme_name`, `pros_theme_code`). |
| `melis_cms_prospects_theme_items` | Items de thème liés à un thème (`pros_theme_item_id`, `pros_theme_id`). |
| `melis_cms_prospects_theme_items_trans` | Traductions par langue des items de thème (`item_trans_id`, `item_trans_text`, `item_trans_lang_id`, `item_trans_theme_item_id`). |

## Exemple

Afficher le plugin de formulaire de prospect depuis un contrôleur / une vue (d'après le docblock
du plugin) :

```php
$plugin     = $this->MelisCmsProspectsShowFormPlugin();
$pluginView = $plugin->render([
    'template_path' => 'MySiteTest/contactus/prospectsForm',
]);
$view->addChild($pluginView, 'prospectsForm');
// dans la vue : echo $this->prospectsForm;
```

En pratique, le plugin est normalement ajouté en le glissant dans un `MelisDragDropZone` d'une
page, où son template, son site, ses champs et son thème sont configurés via l'éditeur.

## Fichiers clés

| Sujet | Chemin (sous `vendor/melisplatform/melis-cms-prospects/`) |
| --- | --- |
| Config module / routes / services | `config/module.config.php` |
| Arbre des outils back-office | `config/app.interface.php` |
| Tables & formulaires des outils | `config/app.tools.php` |
| Config du plugin de templating | `config/plugins/MelisCmsProspectsShowFormPlugin.config.php` |
| Config du widget de tableau de bord | `config/dashboard-plugins/MelisCmsProspectsStatisticsPlugin.config.php` |
| Mapping des champs RGPD | `config/app.gdpr.php` |
| Service principal | `src/Service/MelisCmsProspectsService.php` |
| Service RGPD d'auto-suppression | `src/Service/MelisCmsProspectsGdprAutoDeleteService.php` |
| Plugin de formulaire front | `src/Controller/Plugin/MelisCmsProspectsShowFormPlugin.php` |
| Widget de tableau de bord | `src/Controller/DashboardPlugins/MelisCmsProspectsStatisticsPlugin.php` |
| Contrôleurs back-office | `src/Controller/ToolProspectsController.php`, `MelisCmsProspectsThemesController.php`, `MelisCmsProspectsThemeItemsController.php` |
| Passerelle de table des prospects | `src/Model/Tables/MelisProspectTable.php` |
| Listeners (bootstrap) | `src/Module.php`, `src/Listener/` |
| SQL d'installation | `install/sql/setup_structure.sql`, `install/dbdeploy/` |

Voir la [Référence des modules](/fr/reference/modules) pour la carte complète des modules.
