# MelisCalendar

> Backoffice calendar tool and dashboard widget for scheduling events on the platform.
> Package: `melisplatform/melis-calendar`.

## Purpose

MelisCalendar adds a **Calendar** backoffice tool (built on FullCalendar) where users create,
reschedule and delete dated events, plus a **dashboard widget** that surfaces upcoming events. It
also exposes a small public service (`MelisCalendarService`) so other modules can create or update
calendar events from their own code. Events are stored in a single `melis_calendar` table.

## Enable it

It is a standard Laminas module. It is already listed in `config/melis.module.load.php`:

```php
'MelisCalendar',
```

Its only dependency is `melisplatform/melis-core` (`^5.2`); installing via Composer pulls it in and
the `melis_calendar` table is created through the module's dbdeploy hooks (see
[Module reference](/reference/modules)).

## Key services

| Service alias | Role |
| --- | --- |
| `MelisCalendarService` | Create / reschedule / delete events. Methods: `addCalendarEvent($postValues)`, `reschedCalendarEvent($postValues)` (moves an event by `cal_id` + new start/end dates), `deleteCalendarEvent($postValues)` (by `cal_id`). |
| `MelisCalendarTable` | Data access over `melis_calendar` (extends `MelisGenericTable`). Methods: `retrieveDashboardCalendarEvents()`, `retrieveCalendarEvents()`, `getEventRecentAdded()`. |

Use the service from another module:

```php
$calendarService = $this->getServiceManager()->get('MelisCalendarService');
$calendarService->addCalendarEvent($postValues);
```

## Backoffice

The tool is declared in `config/app.interface.php` and `config/app.tools.php`, and lives under the
**Marketing** tools-tree section. Backoffice actions are served by
`MelisCalendar\Controller\Calendar` (`CalendarController`) and
`MelisCalendar\Controller\ToolCalendar` (`ToolCalendarController`).

| melisKey | Role |
| --- | --- |
| `meliscalendar_leftnemu` | Left-menu entry (`render-calendar-leftmenu`). |
| `meliscalendar_tool` | The tool container (`render-calendar`). |
| `melistoolcalendar_tool_calendar_content` | The FullCalendar view (`render-calendar-tool-calendar-content`, JS callback `initCalendarTool();`). |
| `melistoolcalendar_tool_create_form` | New-event form panel (`render-calendar-tool-create-form`). |
| `melistoolcalendar_tool_recent_added` | Recently added events panel (`render-calendar-tool-recent-added`). |
| `meliscalendar_tool_edit_event_modal` | Edit-event modal (`render-calendar-edit-event-modal`). |

`ToolCalendarController` handles the AJAX endpoints: `saveEvent`, `reschedEvent`, `deleteEvent`,
`searchCalendarEvent`, `getEventTitle`, `retrieveCalendarEvents`, `retrieveDashboardCalendarEvents`.
On save it triggers the `meliscalendar_save_event_end` event (see
[Events & listeners](#events--listeners)).

## Dashboard plugin

`MelisCalendarEventsPlugin` (`src/Controller/DashboardPlugins/MelisCalendarEventsPlugin.php`)
extends `MelisCoreDashboardTemplatingPlugin`. Its `calendarEvents()` action renders the
`melis-calendar/dashboard/calendar-events` template (JS callback `initDashboardCalendar()`). It is
declared under the `melis_dashboardplugin` interface (section `MelisMarketing`) in
`config/dashboard-plugins/MelisCalendarEventsPlugin.config.php` and registered as a controller
plugin in `module.config.php`. See [Plugins](/guide/plugins).

## Form elements

The module registers one form element factory in `module.config.php`:

| Form element | Role |
| --- | --- |
| `MelisCalendarDraggableInput` | Drag-and-drop text input used in the event-creation form (`config/app.forms.php`, form `melicalendar_event_form`). |

## Events & listeners

`MelisCalendarFlashMessengerListener` (attached in `src/Module.php`) listens on the `MelisCalendar`
shared-event identifier for `meliscalendar_save_event_end` and forwards the result to
`MelisCore`'s flash messenger. Other modules can hook the same event:

```php
$sharedEvents->attach('MelisCalendar', 'meliscalendar_save_event_end', function ($e) {
    $sm     = $e->getTarget()->getServiceManager();
    $params = $e->getParams();
    // custom code
}, 10);
```

## Database tables

| Table | Role |
| --- | --- |
| `melis_calendar` | One row per event: `cal_id` (PK), `cal_event_title`, `cal_date_start`, `cal_date_end`, `cal_created_by`, `cal_last_update_by`, `cal_date_last_update`, `cal_date_added`. |

## Key files

| Concern | Path |
| --- | --- |
| Service | `vendor/melisplatform/melis-calendar/src/Service/MelisCalendarService.php` |
| Table model | `vendor/melisplatform/melis-calendar/src/Model/Tables/MelisCalendarTable.php` |
| Tool controllers | `vendor/melisplatform/melis-calendar/src/Controller/CalendarController.php`, `.../ToolCalendarController.php` |
| Dashboard plugin | `vendor/melisplatform/melis-calendar/src/Controller/DashboardPlugins/MelisCalendarEventsPlugin.php` |
| Listener | `vendor/melisplatform/melis-calendar/src/Listener/MelisCalendarFlashMessengerListener.php` |
| Tool / interface config | `vendor/melisplatform/melis-calendar/config/app.interface.php`, `.../app.tools.php`, `.../app.forms.php` |
| Dashboard config | `vendor/melisplatform/melis-calendar/config/dashboard-plugins/MelisCalendarEventsPlugin.config.php` |
| Install SQL | `vendor/melisplatform/melis-calendar/install/sql/setup_structure.sql` |
