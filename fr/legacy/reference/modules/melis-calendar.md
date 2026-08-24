# MelisCalendar

> Outil de planification en back-office avec calendrier glisser-déposer et widget de tableau de bord. Paquet `melisplatform/melis-calendar`.

## Présentation

MelisCalendar fournit une grille de calendrier interactive dans le back-office où les utilisateurs créent des événements datés, les déplacent pour les replanifier et les suppriment. Un widget de tableau de bord associé affiche les événements à venir sans avoir à ouvrir l'outil complet. Le module expose `MelisCalendarService` afin que d'autres modules puissent créer, replanifier ou supprimer des événements de manière programmatique, et déclenche un événement de sauvegarde auquel du code externe peut se connecter pour envoyer des notifications ou synchroniser des données.

## Activation

Ajouter dans `config/melis.module.load.php` :

```php
return [
    'MelisCalendar',
];
```

La seule dépendance requise est `melisplatform/melis-core` (`^5.2`).

## Services principaux

| Alias de service | Rôle |
| --- | --- |
| `MelisCalendarService` | Créer, replanifier et supprimer des événements du calendrier. |

### Méthodes du service

| Méthode | Rôle |
| --- | --- |
| `addCalendarEvent()` | Crée un nouvel événement. |
| `reschedCalendarEvent()` | Met à jour les dates d'un événement existant. |
| `deleteCalendarEvent()` | Supprime un événement. |

## Back-office

L'outil **Calendrier** est accessible via le menu du back-office → MelisMarketing → Calendar (icône calendrier). Il est construit sur FullCalendar avec Moment.js pour le rendu de l'interface.

| Fonctionnalité | Description |
| --- | --- |
| Grille de calendrier | Vue mensuelle/hebdomadaire interactive avec replanification par glisser-déposer. |
| Formulaire de création d'événement | Formulaire acceptant un titre ainsi que des dates de début et de fin. |
| Liste des derniers ajouts | Panneau listant les événements créés le plus récemment. |
| Widget de tableau de bord | Widget Événements du calendrier disponible via le sélecteur de plugins du tableau de bord ; affiche les événements à venir en un coup d'œil. |

## Événements & listeners

Un événement `meliscalendar_save_event_end` est déclenché après chaque opération de sauvegarde. D'autres modules peuvent s'y abonner pour envoyer des notifications ou synchroniser un calendrier externe :

```php
$sharedEvents->attach('MelisCalendar', 'meliscalendar_save_event_end', function ($e) {
    $params = $e->getParams();
    // logique personnalisée de notification ou de synchronisation
}, 10);
```

## Tables de base de données

| Table | Contenu |
| --- | --- |
| `melis_calendar` | Une ligne par événement ; inclut des champs d'audit pour suivre la création et la dernière modification. |

Voir aussi : [melis-core](/fr/legacy/reference/modules/melis-core)
