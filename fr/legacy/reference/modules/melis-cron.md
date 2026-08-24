# MelisCron

> Gestionnaire de tâches planifiées pour le back-office : définissez des tâches CLI ou HTTP avec des planifications flexibles, exécutez-les en parallèle via un runner CLI déclenché à la minute, et consultez l'historique complet des exécutions. Package `melisplatform/melis-cron`.

## Présentation

MelisCron remplace les lignes crontab écrites manuellement par une liste de tâches gérée dans le back-office. Chaque tâche pointe vers une commande CLI ou une URL HTTP et déclare quand s'exécuter (toutes les N minutes/heures/jours, toutes les heures, chaque jour, chaque semaine ou chaque mois). Chaque exécution est enregistrée dans une table d'historique avec son état, sa durée et la sortie capturée. L'exécution effective nécessite une seule entrée crontab au niveau du système d'exploitation qui appelle le runner `melis:cronexec` chaque minute ; sans elle, les tâches sont définies mais ne se déclenchent jamais.

## Activation

Ajoutez dans `config/melis.module.load.php` :

```php
return [
    'MelisCron',
];
```

Nécessite **MelisCore** (fourni par la plateforme ; non déclaré dans `composer.json`). Dépendances Composer : PHP `^8.1|^8.3`, `ext-curl`, `composer/composer ^2.9.6`, `laminas/laminas-cli ^1.5`.

## Services principaux

| Alias de service | Rôle |
| --- | --- |
| `MelisCronService` | CRUD des tâches et de l'historique, helpers de planification, gestion de la file d'attente |

### API `MelisCronService`

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

**Événements déclenchés :** `cron_service_get_list_start`, `meliscron_service_get_list_end`, `meliscron_service_get_listhistory_end`, `meliscron_service_save_item_start`/`_end`, `meliscron_service_delete_item_start`/`_end`.

## Back-office

Accessible via **Menu gauche → Outils → Cron** (`fa fa-clock-o`), melisKey `cron_tool`.

| Zone | Route / action |
| --- | --- |
| Liste des tâches (DataTable) | `MelisCron/List/render-tool` |
| Formulaire de propriétés d'une tâche | `MelisCron/Properties/render-properties-form` |
| Page d'historique d'exécution | `MelisCron/History/render-history-page` |
| Popup des logs | `MelisCron/History/tool-modal-logs-content` |
| Déclencheur HTTP du runner | `GET /melis/MelisCron/Cron/execute` |

## Tables de base de données

| Table | Contenu |
| --- | --- |
| `melis_cron` | Définitions des tâches : `cron_id`, `cron_name`, `cron_active`, `cron_target`, `cron_type` (ENUM `CLI\|HTTP`), `cron_schedule_type` (ENUM `every\|hourly\|daily\|weekly\|monthly`), `cron_schedule_options` (JSON) |
| `melis_cron_history` | Enregistrements d'exécution : `id`, `cron_id`, `state` (ENUM `pending\|processing\|success\|error`), `date_add`, `rerun`, `date_run`, `duration`, `logs`, `status` |

### Formats JSON de `cron_schedule_options`

| `cron_schedule_type` | Structure JSON |
| --- | --- |
| `every` | `{ "everyItem": "minutes\|hours\|days", "everyValue": N }` |
| `hourly` | `{ "hourlyValue": MM }` |
| `daily` | `{ "dailyHour": HH, "dailyMinute": MM }` |
| `weekly` | `{ "weeklyDays": [1..7], "atHour": HH, "atMinute": MM }` (jour ISO, Lun=1) |
| `monthly` | `{ "monthlyDay": D, "atHour": HH, "atMinute": MM }` |

## Configuration du runner

Le moteur est `MelisCron\Command\ExecCommand`, enregistré avec laminas-cli sous le nom **`melis:cronexec`**. Ajoutez une ligne dans le crontab du serveur :

```cron
* * * * * cd /path/to/project && php vendor/bin/laminas melis:cronexec --env=production >/dev/null 2>&1
```

Chaque déclenchement s'effectue en deux phases :

1. **`scheduleTasks()`** — évalue le planning de chaque tâche active par rapport à l'heure courante ; appelle `addJob()` pour toute tâche arrivée à échéance.
2. **`runJobs()`** — prend en charge chaque job en attente (`pending → processing`) puis l'exécute dans une **PHP Fiber** pour la concurrence :
   - **HTTP** — requête GET `curl` vers `cron_target` ; enregistre le statut HTTP et le corps de la réponse.
   - **CLI** — `exec()` de `cron_target` ; un code de sortie non nul définit l'état sur `error`.

Un déclencheur HTTP de secours est disponible à `/melis/MelisCron/Cron/execute` pour les environnements où un crontab CLI n'est pas disponible.

> La résolution de la planification est d'une minute (la cadence de déclenchement).

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Commande du runner | `vendor/melisplatform/melis-cron/src/Command/ExecCommand.php` |
| Fabrique du runner | `vendor/melisplatform/melis-cron/src/Command/ExecCommandFactory.php` |
| Service cron | `vendor/melisplatform/melis-cron/src/Service/CronService.php` |
| Modèle de table des tâches | `vendor/melisplatform/melis-cron/src/Model/Tables/MelisCronTable.php` |
| Modèle de table d'historique | `vendor/melisplatform/melis-cron/src/Model/Tables/MelisCronHistoryTable.php` |
| Listeners sauvegarde/suppression | `vendor/melisplatform/melis-cron/src/Listener/SavePropertiesListener.php`, `DeleteListener.php` |
| Configuration du module | `vendor/melisplatform/melis-cron/config/module.config.php` |
| Câblage menu gauche | `vendor/melisplatform/melis-cron/config/app.toolstree.php` |
| Câblage page d'historique | `vendor/melisplatform/melis-cron/config/app.interface.php` |
| Configuration DataTables | `vendor/melisplatform/melis-cron/config/app.tools.php` |
| Script d'installation BDD | `vendor/melisplatform/melis-cron/install/dbdeploy/24110301_meliscron_install.sql` |

Voir aussi : [MelisCore](/fr/legacy/reference/modules/melis-core)
