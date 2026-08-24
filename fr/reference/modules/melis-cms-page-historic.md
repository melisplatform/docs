# MelisCmsPageHistoric

> Journal d'audit pour l'édition des pages CMS — enregistre qui a fait quoi sur une page et quand, exposé sous forme d'onglet Historique dans l'éditeur de page React et de widget de tableau de bord. Package `melisplatform/melis-cms-page-historic`.

## Présentation

`MelisCmsPageHistoric` capture automatiquement chaque action sur une page (enregistrement, publication, dépublication, suppression) avec l'identité de l'auteur et l'horodatage. L'historique est écrit via des écouteurs d'événements branchés sur le cycle de vie des pages CMS — rien n'est à configurer page par page. Le journal est exposé en **lecture seule** : dans un **onglet Historique** au sein de l'éditeur de page et dans un widget **Activité récente des pages** sur le tableau de bord. Il sert à la traçabilité, pas à la restauration des pages.

## Activation

Ajoutez dans `config/melis.module.load.php` :

```php
return [
    'MelisCmsPageHistoric',
];
```

Exécutez les deltas `install/dbdeploy/` fournis pour créer la table d'historique (`extra.dbdeploy: true`). Nécessite `melis-core`, `melis-engine`, `melis-front` et `melis-cms`.

## Un module sans brick

C'est un module React inhabituel : il ne fournit **aucune brick propre** (pas de `ui-react/`, pas de `public/ui-react/brick.manifest.json`, pas de bundle Vite). Son empreinte React se résume à trois fichiers de configuration PHP fusionnés par `Module::getConfig()`, plus un contrôleur et un plugin de tableau de bord legacy. Les deux surfaces React n'apparaissent **que lorsque le module est actif**.

| Fichier de configuration | Contribution |
| --- | --- |
| `config/react-api.php` | Le point d'accès `GET /melis/react-api/cms-page/historic` + le contrôleur invokable |
| `config/react.capabilities.php` | La capacité de l'onglet Historique sous le nœud partagé `meliscms_page` |
| `config/app.interface.php` | Le **bouton** de l'onglet Historique dans l'éditeur de page CMS (icône `history`) |

Le composant React qui s'affiche dans l'onglet Historique **n'est pas fourni par ce module** — il est fourni côté hôte par le shell melis-core et branché via le registre d'onglets de page (`window.__melisRegisterPageTab('melispagehistoric_historic', Component)`). Ce module ne contribue que le point d'accès de données, la capacité et la déclaration du bouton d'onglet ; l'éditeur de page CMS (MelisCms) héberge l'onglet.

## Onglet Historique (éditeur de page React)

Barre latérale gauche → **MelisCms** → ouvrez une **page** → l'onglet **Historique** dans la rangée d'onglets de l'éditeur. Il affiche un tableau en lecture seule des actions **de cette page**, les plus récentes en premier, avec les colonnes **Date**, **Action** (badges colorés Publication / Enregistrement / Dépublication) et **Utilisateur**. Une liste déroulante **Filtre (Toutes les actions)** permet de restreindre à un seul type d'action. La liste est **paginée côté serveur** — elle ne charge jamais tout l'historique en une fois.

![Onglet Historique dans l'éditeur de page CMS React affichant le tableau d'historique de la page avec les colonnes Date, badges Action et Utilisateur ainsi qu'un filtre d'action](/screenshots/react/melis-cms-page-historic/meliscmspagehistoric-page-tab-historic.png)

L'onglet n'affiche que l'historique de la page courante. Pour l'activité sur *toutes* les pages, utilisez le widget de tableau de bord ci-dessous.

## Widget de tableau de bord Activité récente des pages

Sur le **tableau de bord** du back-office, le widget **Activité récente des pages** liste les actions de page les plus récentes tous utilisateurs confondus (horodatage · pastille de statut · nom + id de la page · action · utilisateur). Il s'ajoute et se retire depuis le panneau « Ajouter un widget » comme n'importe quel autre widget de tableau de bord, sous le groupe **MELIS CMS PAGE HISTORIC**.

![Widget de tableau de bord Activité récente des pages listant les actions de page récentes, avec le panneau Ajouter un widget le présentant sous Melis Cms Page Historic](/screenshots/react/melis-cms-page-historic/meliscmspagehistoric-dashboard-plugin-recentactivity.png)

Ce widget reste un **plugin de tableau de bord PHP legacy** (`MelisCmsPageHistoricRecentUserActivityPlugin`, action `recentActivityPages`) rendu au sein de l'hôte de widgets du tableau de bord React — il n'y a pas de réécriture React. Il lit via `MelisPageHistoricTable->getPagesHistoricForDashboard()` et est conditionné par l'activation de MelisCms ainsi que par le droit d'accès au plugin de tableau de bord.

## API React — le point d'accès Historique

Déclaré dans `config/react-api.php`, contrôleur `MelisCmsPageHistoric\Controller\MelisReactApiPageHistoricController` (alias invokable `MelisReactApiPageHistoric`). Une action, contrat `{ success, data, error }`.

| Méthode et URL | Action | Rôle |
| --- | --- | --- |
| `GET /melis/react-api/cms-page/historic?idPage=<id>&page=<n>&perPage=<25>&action=<type>` | `listAction` | Les lignes d'audit de la page courante, paginées côté serveur, plus les types d'action distincts pour la liste déroulante de filtre |

Forme du `data` de la réponse :

```jsonc
{ "success": true, "data": {
  "idPage": 1,
  "items": [ { "id": 123, "date": "2026-08-18 10:10:25", "action": "Publish",
               "user": "John Doe", "userId": 1 } ],   // newest first (ORDER BY hist_id DESC)
  "page": 1, "perPage": 25, "total": 87,               // total = indexed COUNT → drives paging
  "action": "",                                        // active action filter ('' = all)
  "actionTypes": ["Publish", "Save", "Unpublish"]      // DISTINCT hist_action for the filter select
} }
```

Notes d'implémentation :

- **Contrôle d'accès :** l'action vérifie uniquement `MelisCoreAuth->hasIdentity()` (renvoie `401` si non authentifié). Elle **n'impose pas** de capacité côté serveur — considérez la capacité ci-dessous comme un signal de **verrouillage de l'interface**, et non comme un contrôle d'autorisation côté backend.
- **Données :** SQL paramétré direct sur `melis_hist_page_historic` (LEFT JOIN `melis_core_user` pour le nom d'utilisateur ; un utilisateur supprimé est libellé `"Utilisateur supprimé (<id>)"`).
- **Pagination :** `perPage` borné à `1..200` (25 par défaut) ; `total` est un `COUNT(*)` indexé distinct respectant le même `WHERE`. Le filtre optionnel `action` s'applique à la fois au comptage et à la page.

## Capacités

Comme le module contribue un onglet à l'outil de page CMS, sa capacité est déclarée sous le nœud de droits **partagé** `meliscms_page` (un `ArrayUtils::merge` l'ajoute au `tabs[]` de cet outil) :

```php
return [
  'melisReactToolCapabilities' => [
    'meliscms_page' => [
      'tabs' => [
        ['key' => 'melispagehistoric_historic', 'label' => 'tr_melispagehistoric_page_tab_historic_Historic'],
      ],
    ],
  ],
];
```

- La `key` (`melispagehistoric_historic`) est la capacité de l'onglet ; elle correspond à la clé que l'hôte utilise pour enregistrer le composant d'onglet et à la `melisKey` de l'interface dans `app.interface.php`.
- Elle est rattachée à `meliscms_page` (« Édition de page » dans Utilisateurs → Droits), **et non** au wrapper `meliscms` **ni** au nœud du bouton d'onglet.
- Sans cette déclaration, la liste blanche des capacités de page CMS masque le bouton d'onglet — même pour un administrateur.

## Comment l'historique est écrit (pattern écouteur)

Deux écouteurs branchés dans `src/Module.php` (démarrage back-office uniquement) enregistrent les lignes ; React ne fait que les lire.

| Écouteur | Événement(s) | Ce qui est enregistré |
| --- | --- | --- |
| `MelisPageHistoricPageEventListener` | `meliscms_page_save_end`, `meliscms_page_publish_end`, `meliscms_page_unpublish_end`, … | Enregistrement / Publication / Dépublication |
| `MelisPageHistoricDeletePageListener` | `meliscms_page_delete_end` | Suppression (effectue aussi un nettoyage) |

Vous n'écrivez pas les lignes d'historique vous-même — enregistrer, publier ou supprimer une page via le CMS déclenche les écouteurs automatiquement.

## Table de base de données

| Table | Contenu |
| --- | --- |
| `melis_hist_page_historic` | Une ligne par action enregistrée : `hist_id` (clé primaire), `hist_page_id`, `hist_action`, `hist_date`, `hist_user_id`, `hist_description`. |

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Contrôleur react-api | `vendor/melisplatform/melis-cms-page-historic/src/Controller/MelisReactApiPageHistoricController.php` |
| Route react-api | `vendor/melisplatform/melis-cms-page-historic/config/react-api.php` |
| Capacité de l'onglet Historique | `vendor/melisplatform/melis-cms-page-historic/config/react.capabilities.php` |
| Bouton / interface de l'onglet Historique | `vendor/melisplatform/melis-cms-page-historic/config/app.interface.php` |
| Amorçage du module (écouteurs) | `vendor/melisplatform/melis-cms-page-historic/src/Module.php` |
| Passerelle de table | `vendor/melisplatform/melis-cms-page-historic/src/Model/Tables/MelisPageHistoricTable.php` |
| Plugin de tableau de bord (legacy) | `vendor/melisplatform/melis-cms-page-historic/src/Controller/DashboardPlugins/MelisCmsPageHistoricRecentUserActivityPlugin.php` |
| SQL d'installation / dbdeploy | `vendor/melisplatform/melis-cms-page-historic/install/` |

Voir aussi : [MelisCms](/fr/reference/modules/melis-cms), [Référence des modules](/fr/reference/modules)
