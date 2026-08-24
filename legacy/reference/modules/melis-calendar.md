# MelisCalendar

> Backoffice scheduling tool with drag-and-drop calendar and dashboard widget. Package `melisplatform/melis-calendar`.

## Purpose

MelisCalendar provides an interactive calendar grid in the back-office where users create dated events, drag them to reschedule, and delete them. A companion dashboard widget surfaces upcoming events without opening the full tool. The module exposes `MelisCalendarService` so other modules can create, reschedule, or delete events programmatically, and fires a save event that external code can hook for notifications or synchronization.

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisCalendar',
];
```

The only required dependency is `melisplatform/melis-core` (`^5.2`).

## Key services

| Service alias | Role |
| --- | --- |
| `MelisCalendarService` | Create, reschedule, and delete calendar events. |

### Service methods

| Method | Role |
| --- | --- |
| `addCalendarEvent()` | Creates a new event. |
| `reschedCalendarEvent()` | Updates the dates of an existing event. |
| `deleteCalendarEvent()` | Removes an event. |

## Backoffice

The **Calendar** tool is accessible via back-office menu → MelisMarketing → Calendar (calendar icon). It is built on FullCalendar with Moment.js for UI rendering.

| Feature | Description |
| --- | --- |
| Calendar grid | Interactive monthly/weekly view with drag-and-drop rescheduling. |
| Event creation form | Form accepting title plus start and end dates. |
| Recently-added list | Panel listing the most recently created events. |
| Dashboard widget | Calendar Events widget available through the dashboard plugin selector; shows upcoming events at a glance. |

## Events & listeners

A `meliscalendar_save_event_end` event fires after each save operation. Other modules can attach to it for notifications or external calendar synchronization:

```php
$sharedEvents->attach('MelisCalendar', 'meliscalendar_save_event_end', function ($e) {
    $params = $e->getParams();
    // custom notification or sync logic
}, 10);
```

## Database tables

| Table | Holds |
| --- | --- |
| `melis_calendar` | One row per event; includes audit fields tracking creation and last modification. |

See also: [melis-core](/legacy/reference/modules/melis-core)
