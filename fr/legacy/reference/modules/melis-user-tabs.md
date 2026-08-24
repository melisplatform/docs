# MelisUserTabs

> Utilitaire UX back-office qui persiste et restaure l'ensemble des onglets ouverts par un utilisateur entre les sessions. Package `melisplatform/melis-user-tabs`.

## Présentation

MelisUserTabs est un petit utilitaire back-office qui s'intègre au système d'onglets du shell d'administration MelisCore. Il suit les outils qu'un utilisateur a ouverts sous forme d'onglets, persiste cet ensemble par utilisateur, et rouvre ces onglets lors de la prochaine connexion. Il alimente également le contrôle *Fermer tous les onglets* dans l'en-tête du BO. Il n'existe pas d'outil dédié dans le menu gauche — il fonctionne entièrement en arrière-plan.

## Activation

Ajouter dans `config/melis.module.load.php` :

```php
return [
    'MelisUserTabs',
];
```

Nécessite `melisplatform/melis-core` `^5.2`.

## Services principaux

| Alias de service | Rôle |
| --- | --- |
| `MelisUserTabsService` | Sauvegarde et restaure les onglets ouverts ; gère l'aller-retour des clés de traduction |
| `MelisUserTabsTable` | Accès bas niveau à `melis_user_tabs_open` |

### MelisUserTabsService — référence des méthodes

**`getUserTabsOpenByUserId($userId)`**
Charge la ligne de l'utilisateur, désérialise `tabs_list`, et traduit le `melisTitle` de chaque onglet dans la langue courante de l'utilisateur avant de retourner le tableau.
Événements : `user_tabs_open_get_user_tabs_by_user_id_start` / `user_tabs_open_get_user_tabs_by_use_rid_end` (remarque : le nom de l'événement « end » comporte une faute de frappe verbatim — `use_rid`).

**`saveOpenTabs($userTabsOpen)`**
Décode en JSON chaque entrée de `$userTabsOpen['tabOpen']`, effectue la traduction inverse du titre vers sa **clé de traduction** (et non la chaîne localisée) pour chaque onglet parent (un onglet est parent lorsqu'il n'a pas de `melisparameter`), sérialise l'ensemble, puis insère ou met à jour la ligne unique par utilisateur.
Événements : `user_tabs_open_save_open_tabs_start` / `user_tabs_open_save_open_tabs_end`.

**`getTranslationByText($text)`**
Recherche inversée — chaîne localisée vers clé de traduction — utilisée en interne par `saveOpenTabs`.

> **Intention de conception — stocker des clés, localiser à la lecture.** Les titres sont persistés sous forme de clés de traduction et convertis en texte uniquement lors de la relecture. Cela garantit que les onglets restaurés sont correctement libellés si l'utilisateur change de langue entre les sessions.

## Back-office

MelisUserTabs se connecte à `meliscore_header` — ce n'est pas un outil autonome.

### Actions du contrôleur (`MelisUserTabsController`)

Route : `/melis/MelisUserTabs/[:controller[/:action]]`

| Action | Retourne | Rôle |
| --- | --- | --- |
| `saveOpenTabsAction()` | `JsonModel` | Reçoit l'ensemble `tabOpen` envoyé en POST et délègue à `MelisUserTabsService::saveOpenTabs()` |
| `getUserTabsOpenedAction()` | `JsonModel` | Retourne les onglets sauvegardés de l'utilisateur courant via `getUserTabsOpenByUserId()` afin que le shell puisse les rouvrir |
| `closeAllButtonAction()` | `ViewModel` | Rend le bouton *Fermer tous les onglets* |

### Ouverture d'un onglet par programmation

Utiliser l'aide JS de MelisCore — MelisUserTabs le persistera automatiquement :

```js
melisHelper.tabOpen(title, icon, zoneId, melisKey, parameters);
```

## Tables de base de données

| Table | Contenu |
| --- | --- |
| `melis_user_tabs_open` | Une ligne par utilisateur back-office ; `tabs_list` stocke l'ensemble des onglets ouverts sous forme de tableau PHP sérialisé |

### Schéma

| Colonne | Signification |
| --- | --- |
| `tabs_id` | Clé primaire |
| `tabs_user_id` | Utilisateur back-office (`usr_id`) |
| `tabs_list` | Tableau PHP sérialisé d'objets onglet (`melisTitle`, `melisKey`, `melisparameter` optionnel, …) |

> `tabs_list` est une représentation interne écrite et lue uniquement par `MelisUserTabsService`. Ne lui fournissez pas de données non fiables.

## Exemple

```php
// Lire les onglets ouverts sauvegardés pour un utilisateur donné
$userTabsService = $this->getServiceManager()->get('MelisUserTabsService');
$tabs = $userTabsService->getUserTabsOpenByUserId($userId);
// $tabs est un tableau d'objets onglet avec des valeurs melisTitle localisées
```

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Accroche en-tête + câblage des assets JS | `vendor/melisplatform/melis-user-tabs/config/app.interface.php` |
| Route, alias de service et de table | `vendor/melisplatform/melis-user-tabs/config/module.config.php` |
| Contrôleur | `vendor/melisplatform/melis-user-tabs/src/Controller/MelisUserTabsController.php` |
| Service | `vendor/melisplatform/melis-user-tabs/src/Service/MelisUserTabsService.php` |
| Passerelle de table | `vendor/melisplatform/melis-user-tabs/src/Model/Tables/MelisUserTabsTable.php` |
| Tracker front-end | `vendor/melisplatform/melis-user-tabs/public/js/melis-user-tabs.js` |

Voir aussi : [MelisCore](/fr/legacy/reference/modules/melis-core)
