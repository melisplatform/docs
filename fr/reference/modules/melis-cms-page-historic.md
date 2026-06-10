# MelisCmsPageHistoric

> Journal d'audit pour l'édition des pages CMS — enregistre qui a fait quoi sur une page et quand,
> exposé dans un onglet Historique et un widget de tableau de bord. Package
> `melisplatform/melis-cms-page-historic`.

## Présentation

`MelisCmsPageHistoric` capture automatiquement chaque action sur une page (création, modification,
publication, dépublication, suppression) avec l'identité de l'auteur et l'horodatage. L'historique
est écrit via des écouteurs d'événements qui se branchent sur le cycle de vie des pages CMS — rien
n'est à configurer page par page. Le journal est exposé en lecture seule dans un **onglet
Historique** au sein de l'éditeur de page et dans un widget **Activité récente des utilisateurs**
sur le tableau de bord.

## Activation

Ajoutez dans `config/melis.module.load.php` :

```php
return [
    'MelisCmsPageHistoric',
];
```

Exécutez les deltas `install/dbdeploy/` fournis pour créer la table d'historique (`extra.dbdeploy: true`).
Nécessite `melis-core`, `melis-engine`, `melis-front` et `melis-cms` (`^5.2`).

## Services principaux

| Alias de service | Rôle |
| --- | --- |
| `MelisPageHistoricTable` | Passerelle de table sur `melis_hist_page_historic`. Gère toutes les lectures et écritures des lignes d'historique. |

Aucune classe de service dédiée n'est fournie — les lectures et écritures passent par
`MelisPageHistoricTable` ainsi que par les actions save/delete du contrôleur.

## Back-office

### Onglet Historique (éditeur de page)

Injecté via `config/app.interface.php` (clé `melispagehistoric_historic`, icône `history`) dans
les onglets de l'éditeur de page CMS. L'onglet affiche un DataTable en lecture seule limité à la
page courante (`hist_page_id`). Filtres disponibles : limite, utilisateur, plage de dates, type
d'action. La liste d'utilisateurs pour le filtre est servie par `getBackOfficeUsersAction`. La
configuration de l'outil est déclarée dans `config/app.tools.php` (`tool_meliscmspagehistoric`).

Contrôleur : `PageHistoricController` — l'action `getPageHistoricDataAction` alimente le DataTable.

### Plugin de tableau de bord

`MelisCmsPageHistoricRecentUserActivityPlugin` (`recentActivityPages`) affiche le widget **Activité
récente des utilisateurs** sur le tableau de bord du back-office. La configuration se trouve dans
`config/dashboard-plugins/`, section `MelisCms`.

### Comment l'historique est écrit (pattern écouteur)

Deux écouteurs sont branchés dans `src/Module.php` (démarrage back-office uniquement) :

| Écouteur | Événement | Ce qui est enregistré |
| --- | --- | --- |
| `MelisPageHistoricPageEventListener` | `meliscms_page_save_end`, `meliscms_page_publish_end`, `meliscms_page_unpublish_end`, … | Actions Enregistrement / Publication / Dépublication |
| `MelisPageHistoricDeletePageListener` | `meliscms_page_delete_end` | Action Suppression (effectue aussi un nettoyage) |

## Tables de base de données

| Table | Contenu |
| --- | --- |
| `melis_hist_page_historic` | Une ligne par action enregistrée : `hist_id` (clé primaire), `hist_page_id`, `hist_action`, `hist_date`, `hist_user_id`, `hist_description`. |

## Exemple

Se brancher sur un événement de page CMS (le même pattern qu'utilisent les écouteurs — réutilisable
par n'importe quel module) :

```php
// Dans Module.php onBootstrap :
$sharedEvents = $eventManager->getSharedManager();
$sharedEvents->attach('MelisCms', 'meliscms_page_publish_end', function ($e) {
    $params = $e->getParams(); // id de page, données de page…
    // enregistrer : qui/quoi/quand -> melis_hist_page_historic
}, 50);
```

Il n'est pas nécessaire d'écrire les lignes d'historique soi-même — enregistrer, publier ou
supprimer une page via le CMS déclenche les écouteurs automatiquement.

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Amorçage du module (écouteurs) | `vendor/melisplatform/melis-cms-page-historic/src/Module.php` |
| Contrôleur de l'onglet Historique | `vendor/melisplatform/melis-cms-page-historic/src/Controller/PageHistoricController.php` |
| Passerelle de table | `vendor/melisplatform/melis-cms-page-historic/src/Model/Tables/MelisPageHistoricTable.php` |
| Écouteur d'événement de page | `vendor/melisplatform/melis-cms-page-historic/src/Listener/MelisPageHistoricPageEventListener.php` |
| Écouteur de suppression | `vendor/melisplatform/melis-cms-page-historic/src/Listener/MelisPageHistoricDeletePageListener.php` |
| Plugin de tableau de bord | `vendor/melisplatform/melis-cms-page-historic/src/Controller/DashboardPlugins/MelisCmsPageHistoricRecentUserActivityPlugin.php` |
| Configuration interface onglet Historique | `vendor/melisplatform/melis-cms-page-historic/config/app.interface.php` |
| Configuration de l'outil | `vendor/melisplatform/melis-cms-page-historic/config/app.tools.php` |
| SQL d'installation / dbdeploy | `vendor/melisplatform/melis-cms-page-historic/install/` |

Voir aussi : [MelisCms](/fr/reference/modules/melis-cms), [Référence des modules](/fr/reference/modules)
