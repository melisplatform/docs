# MelisCalendar

> Outil calendrier en backoffice et widget de tableau de bord pour planifier des événements sur la plateforme.
> Paquet : `melisplatform/melis-calendar`.

## Objectif

MelisCalendar ajoute un outil **Calendrier** en backoffice (basé sur FullCalendar) où les
utilisateurs créent, replanifient et suppriment des événements datés, ainsi qu'un **widget de
tableau de bord** qui met en avant les événements à venir. Il expose aussi un petit service public
(`MelisCalendarService`) pour que d'autres modules puissent créer ou mettre à jour des événements
depuis leur propre code. Les événements sont stockés dans une unique table `melis_calendar`.

## Activation

C'est un module Laminas standard. Il figure déjà dans `config/melis.module.load.php` :

```php
'MelisCalendar',
```

Sa seule dépendance est `melisplatform/melis-core` (`^5.2`) ; l'installation via Composer l'inclut
et la table `melis_calendar` est créée par les hooks dbdeploy du module (voir
[Référence des modules](/fr/reference/modules)).

## Services clés

| Alias de service | Rôle |
| --- | --- |
| `MelisCalendarService` | Créer / replanifier / supprimer des événements. Méthodes : `addCalendarEvent($postValues)`, `reschedCalendarEvent($postValues)` (déplace un événement par `cal_id` + nouvelles dates de début/fin), `deleteCalendarEvent($postValues)` (par `cal_id`). |
| `MelisCalendarTable` | Accès aux données de `melis_calendar` (étend `MelisGenericTable`). Méthodes : `retrieveDashboardCalendarEvents()`, `retrieveCalendarEvents()`, `getEventRecentAdded()`. |

Utiliser le service depuis un autre module :

```php
$calendarService = $this->getServiceManager()->get('MelisCalendarService');
$calendarService->addCalendarEvent($postValues);
```

## Backoffice

L'outil est déclaré dans `config/app.interface.php` et `config/app.tools.php`, et se trouve sous la
section **Marketing** de l'arbre des outils. Les actions backoffice sont servies par
`MelisCalendar\Controller\Calendar` (`CalendarController`) et
`MelisCalendar\Controller\ToolCalendar` (`ToolCalendarController`).

| melisKey | Rôle |
| --- | --- |
| `meliscalendar_leftnemu` | Entrée du menu de gauche (`render-calendar-leftmenu`). |
| `meliscalendar_tool` | Conteneur de l'outil (`render-calendar`). |
| `melistoolcalendar_tool_calendar_content` | La vue FullCalendar (`render-calendar-tool-calendar-content`, callback JS `initCalendarTool();`). |
| `melistoolcalendar_tool_create_form` | Panneau de formulaire de création d'événement (`render-calendar-tool-create-form`). |
| `melistoolcalendar_tool_recent_added` | Panneau des événements récemment ajoutés (`render-calendar-tool-recent-added`). |
| `meliscalendar_tool_edit_event_modal` | Modale d'édition d'événement (`render-calendar-edit-event-modal`). |

`ToolCalendarController` gère les points d'accès AJAX : `saveEvent`, `reschedEvent`, `deleteEvent`,
`searchCalendarEvent`, `getEventTitle`, `retrieveCalendarEvents`, `retrieveDashboardCalendarEvents`.
À l'enregistrement, il déclenche l'événement `meliscalendar_save_event_end` (voir
[Événements & listeners](#événements--listeners)).

## Plugin de tableau de bord

`MelisCalendarEventsPlugin` (`src/Controller/DashboardPlugins/MelisCalendarEventsPlugin.php`)
étend `MelisCoreDashboardTemplatingPlugin`. Son action `calendarEvents()` rend le template
`melis-calendar/dashboard/calendar-events` (callback JS `initDashboardCalendar()`). Il est déclaré
sous l'interface `melis_dashboardplugin` (section `MelisMarketing`) dans
`config/dashboard-plugins/MelisCalendarEventsPlugin.config.php` et enregistré comme controller
plugin dans `module.config.php`. Voir [Plugins](/fr/guide/plugins).

## Éléments de formulaire

Le module enregistre une factory d'élément de formulaire dans `module.config.php` :

| Élément de formulaire | Rôle |
| --- | --- |
| `MelisCalendarDraggableInput` | Champ texte par glisser-déposer utilisé dans le formulaire de création d'événement (`config/app.forms.php`, formulaire `melicalendar_event_form`). |

## Événements & listeners

`MelisCalendarFlashMessengerListener` (attaché dans `src/Module.php`) écoute sur l'identifiant
d'événement partagé `MelisCalendar` l'événement `meliscalendar_save_event_end` et transmet le
résultat au flash messenger de `MelisCore`. D'autres modules peuvent s'abonner au même événement :

```php
$sharedEvents->attach('MelisCalendar', 'meliscalendar_save_event_end', function ($e) {
    $sm     = $e->getTarget()->getServiceManager();
    $params = $e->getParams();
    // code personnalisé
}, 10);
```

## Tables de base de données

| Table | Rôle |
| --- | --- |
| `melis_calendar` | Une ligne par événement : `cal_id` (PK), `cal_event_title`, `cal_date_start`, `cal_date_end`, `cal_created_by`, `cal_last_update_by`, `cal_date_last_update`, `cal_date_added`. |

## Fichiers clés

| Sujet | Chemin |
| --- | --- |
| Service | `vendor/melisplatform/melis-calendar/src/Service/MelisCalendarService.php` |
| Modèle de table | `vendor/melisplatform/melis-calendar/src/Model/Tables/MelisCalendarTable.php` |
| Contrôleurs de l'outil | `vendor/melisplatform/melis-calendar/src/Controller/CalendarController.php`, `.../ToolCalendarController.php` |
| Plugin de tableau de bord | `vendor/melisplatform/melis-calendar/src/Controller/DashboardPlugins/MelisCalendarEventsPlugin.php` |
| Listener | `vendor/melisplatform/melis-calendar/src/Listener/MelisCalendarFlashMessengerListener.php` |
| Config outil / interface | `vendor/melisplatform/melis-calendar/config/app.interface.php`, `.../app.tools.php`, `.../app.forms.php` |
| Config tableau de bord | `vendor/melisplatform/melis-calendar/config/dashboard-plugins/MelisCalendarEventsPlugin.config.php` |
| SQL d'installation | `vendor/melisplatform/melis-calendar/install/sql/setup_structure.sql` |
