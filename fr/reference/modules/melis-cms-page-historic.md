# MelisCmsPageHistoric

> Historique de version par page pour le CMS — ajoute un onglet **Historique** à l'éditeur de page
> et un widget de tableau de bord listant l'activité récente des pages. Package
> `melisplatform/melis-cms-page-historic`.

## Objectif

`MelisCmsPageHistoric` enregistre une piste d'audit des modifications de pages. Dès qu'une page est
**enregistrée**, **publiée**, **dépubliée** ou **supprimée** dans le CMS, le module capture qui a
agi, quand, et quelle action — puis expose cet historique dans un onglet **Historique** au sein de
l'éditeur de page ainsi que dans un widget de tableau de bord **Activité récente des utilisateurs**.
Il fonctionne automatiquement en écoutant les évènements de page du CMS ; rien n'est à configurer
page par page.

## Activation

Un module Laminas standard. Ajoutez-le à la liste de chargement (`config/melis.module.load.php`) :

```php
return [
    // …
    'MelisCmsPageHistoric',
];
```

Exécutez les deltas `install/dbdeploy/` du module (le package définit `extra.dbdeploy: true`) pour
créer sa table. Il dépend de `melis-core`, `melis-engine`, `melis-front` et `melis-cms` — voir la
[Référence des modules](/fr/reference/modules) et le guide [Construire un site](/fr/guide/build-a-site)
pour l'ensemble de la pile CMS.

## Services principaux

| Alias de service | Rôle |
| --- | --- |
| `MelisPageHistoricTable` | Passerelle de table sur `melis_hist_page_historic` (étend `MelisGenericTable`). Lit et écrit les lignes d'historique. |

Méthodes notables de `MelisPageHistoricTable` :

| Méthode | Rôle |
| --- | --- |
| `getPageHistoricData($options, $fixedCriteria, $user, $action)` | Flux d'historique paginé/filtré (jointure sur `melis_core_user` pour le nom de l'auteur) ; alimente le tableau de l'outil Historique. |
| `getDescendingHistoric($histIdPage, $max)` | Lignes d'historique d'une page, des plus récentes aux plus anciennes. |
| `getHistoricById($histId, $max)` | Une entrée d'historique unique par `hist_id`. |
| `getPagesHistoricForDashboard($max)` | Pages distinctes les plus récentes pour le widget de tableau de bord. |
| `getPageHistoricListOfActions($order)` | Valeurs d'action distinctes (Save / Publish / Unpublish / Delete) pour le filtre d'action. |
| `getUsers()` / `getBOUsers($where)` | Auteurs distincts / recherche d'utilisateur compatible Select2 pour le filtre utilisateur. |

## Back-office

Le module s'intègre à l'éditeur de page du CMS et au tableau de bord :

- **Onglet Historique** — déclaré sous l'interface `meliscms_page` → `meliscms_tabs` en tant que
  `melispagehistoric_page_historic` (melisKey `melispagehistoric_historic`, icône `history`).
  Il renvoie vers `MelisCmsPageHistoric\Controller\PageHistoric::renderPageHistoric`.
- **Tableau d'historique** (`melispagehistoric_table`) — un outil Melis (`tool_meliscmspagehistoric`,
  voir [Créer un outil](/fr/guide/create-a-tool)) listant les colonnes `hist_user_id`, `hist_action`,
  `hist_date`, `hist_description`, avec des filtres gauche/centre/droite (limite, recherche
  utilisateur, plage de dates, action). Son point d'accès de données est
  `PageHistoric::getPageHistoricData`.
- **L'historique est écrit automatiquement** par deux écouteurs attachés au démarrage du back-office :
  - `MelisPageHistoricPageEventListener` — sur `meliscms_page_save_end`,
    `meliscms_page_publish_end`, `meliscms_page_unpublish_end`, renvoie vers
    `PageHistoric::savePageHistoric` (action étiquetée `Save` / `Publish` / `Unpublish`).
  - `MelisPageHistoricDeletePageListener` — sur `meliscms_page_delete_end`, renvoie vers
    `PageHistoric::deletePageHistoric`.

### Plugin de tableau de bord

`MelisCmsPageHistoricRecentUserActivityPlugin` (un [plugin de tableau de bord](/fr/guide/plugins)
du back-office) affiche le widget **Activité récente des utilisateurs** — les pages modifiées le
plus récemment avec leur auteur, l'icône d'action et la date. Action `recentActivityPages`,
template `melis-cms-page-historic/dashboard-plugin/recent-user-activity`, section `MelisCms`.

## Tables de base de données

| Table | Rôle |
| --- | --- |
| `melis_hist_page_historic` | Une ligne par action enregistrée : `hist_id` (clé primaire), `hist_page_id`, `hist_action`, `hist_date`, `hist_user_id`, `hist_description`. |

## Exemple

Lire l'historique d'une page (le plus récent en premier) via le service de table :

```php
/** @var \MelisCmsPageHistoric\Model\Tables\MelisPageHistoricTable $histTable */
$histTable = $serviceManager->get('MelisPageHistoricTable');

$rows = $histTable->getDescendingHistoric($pageId, 10)->toArray();
foreach ($rows as $row) {
    // $row['hist_action'], $row['hist_date'], $row['hist_user_id'], $row['hist_description']
}
```

Vous n'écrivez normalement jamais l'historique vous-même — enregistrer / publier / supprimer une
page via le CMS le fait automatiquement grâce aux écouteurs ci-dessus.

## Fichiers clés

| Sujet | Chemin |
| --- | --- |
| Amorçage du module (attache les écouteurs, le layout) | `vendor/melisplatform/melis-cms-page-historic/src/Module.php` |
| Contrôleur | `vendor/melisplatform/melis-cms-page-historic/src/Controller/PageHistoricController.php` |
| Passerelle de table | `vendor/melisplatform/melis-cms-page-historic/src/Model/Tables/MelisPageHistoricTable.php` |
| Écouteur d'enregistrement | `vendor/melisplatform/melis-cms-page-historic/src/Listener/MelisPageHistoricPageEventListener.php` |
| Écouteur de suppression | `vendor/melisplatform/melis-cms-page-historic/src/Listener/MelisPageHistoricDeletePageListener.php` |
| Plugin de tableau de bord | `vendor/melisplatform/melis-cms-page-historic/src/Controller/DashboardPlugins/MelisCmsPageHistoricRecentUserActivityPlugin.php` |
| Interface onglet / tableau Historique | `vendor/melisplatform/melis-cms-page-historic/config/app.interface.php` |
| Configuration de l'outil Historique | `vendor/melisplatform/melis-cms-page-historic/config/app.tools.php` |
| Routes & alias de service | `vendor/melisplatform/melis-cms-page-historic/config/module.config.php` |
| SQL d'installation / dbdeploy | `vendor/melisplatform/melis-cms-page-historic/install/sql/setup_structure.sql`, `vendor/melisplatform/melis-cms-page-historic/install/dbdeploy/` |
