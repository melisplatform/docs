# MelisCron

> Back-office scheduled-task manager: define CLI or HTTP tasks with flexible schedules, run them concurrently via a per-minute CLI runner, and inspect full run history. Package `melisplatform/melis-cron`.

## Purpose

MelisCron replaces hand-written crontab lines with a managed list of tasks defined in the back-office. Each task points at a CLI command or an HTTP URL and declares when to run (every N minutes/hours/days, hourly, daily, weekly, or monthly). Every execution is recorded in a history table with state, duration and captured output. Actual execution requires one OS-level crontab entry that calls the `melis:cronexec` runner every minute; without it, tasks are defined but never fire.

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisCron',
];
```

Requires **MelisCore** (provided by the platform; not declared in `composer.json`). Composer dependencies: PHP `^8.1|^8.3`, `ext-curl`, `composer/composer ^2.9.6`, `laminas/laminas-cli ^1.5`.

## Key services

| Service alias | Role |
| --- | --- |
| `MelisCronService` | Task and history CRUD, scheduling helpers, job queue management |

### `MelisCronService` API

```php
$cron = $sm->get('MelisCronService');

// Active tasks
$cron->getActiveTasks();

// DataTable feeds
$cron->getList(...);
$cron->getHistoryList($cronId, $startDate, $endDate, ...);

// Task CRUD (fires events)
$cron->saveItem($data, $id);
$cron->deleteItem($id);

// Job queue
$cron->addJob($cronId, $forceRun);       // inserts a 'pending' row in melis_cron_history
$cron->getPendingJobs();
$cron->updateProcessingJob($jobId);      // claims job: pending → processing
$cron->finishJob($jobId, $data);         // writes state/duration/logs/status

// Helpers
$cron->getDateLastRunByCron($cronId);                      // last run DateTime
$cron->getWordingScheduleType($type, $optionsJson);        // human-readable schedule label
```

**Events fired:** `cron_service_get_list_start`, `meliscron_service_get_list_end`, `meliscron_service_get_listhistory_end`, `meliscron_service_save_item_start`/`_end`, `meliscron_service_delete_item_start`/`_end`.

## Backoffice

Accessible at **Left menu → Tools → Cron** (`fa fa-clock-o`), melisKey `cron_tool`.

| Area | Route / action |
| --- | --- |
| Task list (DataTable) | `MelisCron/List/render-tool` |
| Task properties form | `MelisCron/Properties/render-properties-form` |
| Run history page | `MelisCron/History/render-history-page` |
| Logs popup | `MelisCron/History/tool-modal-logs-content` |
| HTTP runner trigger | `GET /melis/MelisCron/Cron/execute` |

## Database tables

| Table | Holds |
| --- | --- |
| `melis_cron` | Task definitions: `cron_id`, `cron_name`, `cron_active`, `cron_target`, `cron_type` (ENUM `CLI\|HTTP`), `cron_schedule_type` (ENUM `every\|hourly\|daily\|weekly\|monthly`), `cron_schedule_options` (JSON) |
| `melis_cron_history` | Run records: `id`, `cron_id`, `state` (ENUM `pending\|processing\|success\|error`), `date_add`, `rerun`, `date_run`, `duration`, `logs`, `status` |

### `cron_schedule_options` JSON shapes

| `cron_schedule_type` | JSON structure |
| --- | --- |
| `every` | `{ "everyItem": "minutes\|hours\|days", "everyValue": N }` |
| `hourly` | `{ "hourlyValue": MM }` |
| `daily` | `{ "dailyHour": HH, "dailyMinute": MM }` |
| `weekly` | `{ "weeklyDays": [1..7], "atHour": HH, "atMinute": MM }` (ISO weekday, Mon=1) |
| `monthly` | `{ "monthlyDay": D, "atHour": HH, "atMinute": MM }` |

## Runner setup

The engine is `MelisCron\Command\ExecCommand`, registered with laminas-cli as **`melis:cronexec`**. Add one line to the server crontab:

```cron
* * * * * cd /path/to/project && php vendor/bin/laminas melis:cronexec --env=production >/dev/null 2>&1
```

Each tick runs two phases:

1. **`scheduleTasks()`** — evaluates each active task's schedule against the current time; calls `addJob()` for any task that is due.
2. **`runJobs()`** — claims each pending job (`pending → processing`) then executes it inside a **PHP Fiber** for concurrency:
   - **HTTP** — `curl` GET of `cron_target`; records HTTP status and response body.
   - **CLI** — `exec()` of `cron_target`; non-zero exit code sets state to `error`.

An HTTP fallback trigger is available at `/melis/MelisCron/Cron/execute` for environments where a CLI crontab is unavailable.

> Scheduling resolution is one minute (the tick cadence).

## Key files

| Concern | Path |
| --- | --- |
| Runner command | `vendor/melisplatform/melis-cron/src/Command/ExecCommand.php` |
| Runner factory | `vendor/melisplatform/melis-cron/src/Command/ExecCommandFactory.php` |
| Cron service | `vendor/melisplatform/melis-cron/src/Service/CronService.php` |
| Task table model | `vendor/melisplatform/melis-cron/src/Model/Tables/MelisCronTable.php` |
| History table model | `vendor/melisplatform/melis-cron/src/Model/Tables/MelisCronHistoryTable.php` |
| Save/delete listeners | `vendor/melisplatform/melis-cron/src/Listener/SavePropertiesListener.php`, `DeleteListener.php` |
| Module config | `vendor/melisplatform/melis-cron/config/module.config.php` |
| Left-menu wiring | `vendor/melisplatform/melis-cron/config/app.toolstree.php` |
| History page wiring | `vendor/melisplatform/melis-cron/config/app.interface.php` |
| DataTables config | `vendor/melisplatform/melis-cron/config/app.tools.php` |
| DB install script | `vendor/melisplatform/melis-cron/install/dbdeploy/24110301_meliscron_install.sql` |

See also: [MelisCore](/reference/modules/melis-core)
