# MelisCron

> Gestionnaire de tâches planifiées pour le back-office : définissez des tâches CLI ou HTTP avec des planifications flexibles, exécutez-les à la demande ou via un runner CLI déclenché à la minute, et consultez l'historique complet des exécutions — désormais piloté par un outil React natif. Package `melisplatform/melis-cron`.

## Présentation

MelisCron remplace les lignes crontab écrites manuellement par une liste de tâches gérée. Chaque tâche pointe vers une **commande CLI** ou une **URL HTTP** et déclare quand s'exécuter (toutes les N minutes/heures/jours, toutes les heures, chaque jour, chaque semaine ou chaque mois). Chaque exécution est enregistrée dans une table d'historique avec son état, sa durée et la sortie capturée. L'exécution planifiée nécessite toujours une seule entrée crontab au niveau du système d'exploitation qui appelle le runner `melis:cronexec` chaque minute ; l'outil React se contente de définir, d'enregistrer et (à la demande) de déclencher les tâches.

## Activation

Ajoutez dans `config/melis.module.load.php` :

```php
return [
    'MelisCron',
];
```

Nécessite **MelisCore** (fourni par la plateforme). Dépendances Composer : PHP `^8.1|^8.3`, `ext-curl`, `composer/composer ^2.9.6`, `laminas/laminas-cli ^1.5`. L'outil React n'apparaît que si le module est activé (découverte modulaire des briques).

## Back-office (React)

**Menu gauche → MelisCore → Dev Tools → Scheduled Tasks**, aux côtés de Melis Phpinfo et de l'outil SQL. Il s'ouvre dans un onglet principal nommé **Scheduled Tasks** et est livré comme **brique full-React native** (id de brique `cron`, melisKey `cron_tool`), avec une bascule **New / Old** : *New* correspond à l'interface React (par défaut) ; *Old* affiche l'ancien outil jQuery dans une iframe.

Parce qu'une tâche cron exécute des commandes CLI et des appels HTTP arbitraires, les actions **créer / modifier / exécuter** sont réservées aux **administrateurs** de la plateforme côté serveur, en plus des contrôles de capacités.

### Liste des tâches

La liste affiche chaque tâche planifiée avec des **cartes KPI** (Total / Actives / Inactives), une **zone de recherche** (nom et cible), des filtres **statut** (Toutes / Actives / Inactives) et **type** (CLI / HTTP), un bouton **Réinitialiser les filtres**, un gestionnaire de **Colonnes** (persistant), un bouton **Export** et un bouton de **rafraîchissement**. Cliquez sur l'en-tête d'une colonne pour trier. Chaque ligne propose trois actions : **Exécuter maintenant** (▶), **modifier** et **supprimer** (la suppression retire également l'historique de la tâche). Boutons en haut à droite : **History**, la bascule **New / Old** et **+ New task**. Le formulaire et la page d'historique s'ouvrent dans des **sous-onglets** natifs à l'intérieur de l'onglet Scheduled Tasks, chacun conservant son état.

![L'outil Cron React : cartes KPI, recherche, filtres statut et type, Colonnes, Export, la bascule New/Old, History et + New task, avec les actions Exécuter/modifier/supprimer par ligne](/screenshots/react/melis-cron/meliscron-tool-cron-list.png)

### Créer / modifier une tâche

**+ New task** (ou le crayon de modification d'une ligne) ouvre un formulaire React à deux panneaux dans un sous-onglet :

- **Identité + cible** — **Nom**, **Type** (bascule segmentée CLI / HTTP) et **Cible** (la commande CLI comme `cache:clear`, ou l'URL HTTP), avec une aide contextuelle selon le type.
- **Options** — une bascule **Actif** et le sélecteur de **Planification**. Choisir une planification révèle son éditeur : *Intervalle* = valeur + unité (minutes/heures/jours) ; *Toutes les heures* = minute de l'heure ; *Quotidien* = heure + minute ; *Hebdomadaire* = boutons des jours de la semaine + heure + minute ; *Mensuel* = jour du mois + heure + minute.

![Le formulaire React de nouvelle tâche — Nom, Type (CLI/HTTP), Cible avec une aide contextuelle selon le type, et le panneau Options avec la bascule Actif et l'éditeur de Planification (Intervalle — toutes les 15 minutes)](/screenshots/react/melis-cron/meliscron-tool-cron-new.png)

**Enregistrer** persiste la tâche. Validation (reproduite côté client et côté serveur) : nom requis (≤ 100 caractères), cible requise (≤ 255 caractères), type CLI/HTTP obligatoire, et options de planification valides pour le type choisi.

![Modification de « CRON 1 » (une tâche HTTP avec la cible /my-url, toutes les 15 minutes) — le même formulaire à deux panneaux, pré-rempli à partir de la tâche](/screenshots/react/melis-cron/meliscron-tool-cron-edit.png)

### Exécuter maintenant et historique

Le bouton **Exécuter** (▶) de chaque ligne demande une confirmation, puis **exécute la tâche immédiatement** (de façon synchrone, dans la requête) et rapporte le résultat — état, statut HTTP pour les tâches HTTP, durée — sous forme de notification, et écrit une entrée d'historique. Cela contourne la planification.

![La boîte de dialogue de confirmation « Run task » — « Are you sure you want to perform 'CRON 1' now? » avec Cancel / Run](/screenshots/react/melis-cron/meliscron-tool-cron-run.png)

Le bouton **History** ouvre la page **Historique des exécutions** dans un sous-onglet : cartes KPI (Exécutions / Réussies / Échouées / En cours), filtres (recherche sur le nom et les logs, liste déroulante des tâches, liste déroulante des états, plage de dates De/À) et un tableau des exécutions (tâche, type, état, durée, date d'exécution, badge de relance). Une popup **Logs** par ligne affiche le détail de l'exécution (cible, dates de mise en file/d'exécution, durée, code HTTP) ainsi que les logs bruts capturés.

## API React

Routes dans `config/react-api.php`, contrôleur `MelisCron\Controller\MelisReactApiCronController`. Toutes sous `/melis/react-api/crons`, contrat `{ success, data, error }`.

| Méthode et URL | Action | Rôle |
| --- | --- | --- |
| `GET /crons` | `list` | Liste les tâches (keyset : `limit`, `search`, `active`, `type`, `sort`, `dir`, `after`) |
| `GET /crons/stats` | `stats` | KPI `{total, active, inactive}` |
| `GET /crons/:id` | `get` | Une tâche |
| `POST /crons/save` | `save` | Crée / met à jour une tâche (validée) — **admin uniquement** |
| `DELETE /crons/delete/:id` | `delete` | Supprime une tâche et son historique |
| `POST /crons/run/:id` | `run` | Exécute une tâche **maintenant** (synchrone) — **admin uniquement** |
| `GET /crons/history` | `history` | Historique des exécutions (filtres `cronId`, `state`, `search`, `startDate`, `endDate`, `page`, `limit`) |
| `GET /crons/history/:id` | `historyDetail` | Une exécution + logs complets |

Chaque action appelle d'abord `denyUnlessAccess()` (authentification + `MelisCoreRights::canAccess('cron_tool')`). Les actions modifiantes ajoutent `denyUnlessAdmin()` (bloque les non-`usr_admin`) et `denyUnlessCan(cap)`. Les lectures et le CRUD interrogent les deux tables via des requêtes SQL paramétrées ; `run` délègue à `MelisCronService::runTaskNow($id)`.

### Capacités

Déclarées dans `config/react.capabilities.php` sous le nœud `cron_tool` — une liste CRUD plate :

```php
'melisReactToolCapabilities' => [
    'cron_tool' => ['list', 'create', 'edit', 'delete', 'export', 'run'],
],
```

Dans React, `useCaps('cron_tool').can(cap)` conditionne l'interface (masque **+ New task**, les actions par ligne, Export). Le modèle est **autorisé par défaut** avec **contournement admin** ; par-dessus, les actions créer/modifier/exécuter sont strictement réservées aux administrateurs.

## Service clé — `MelisCronService`

```php
$cron = $sm->get('MelisCronService');

$cron->getActiveTasks();
$cron->saveItem($data, $id);   // fires events
$cron->deleteItem($id);

// Job queue
$cron->addJob($cronId, $forceRun);       // inserts a 'pending' row in melis_cron_history
$cron->getPendingJobs();
$cron->updateProcessingJob($jobId);      // claims job: pending → processing
$cron->finishJob($jobId, $data);         // writes state/duration/logs/status
$cron->runTaskNow($id);                  // synchronous execution used by the React Run action

// Helpers
$cron->getDateLastRunByCron($cronId);
$cron->getWordingScheduleType($type, $optionsJson);
```

**Événements déclenchés :** `cron_service_get_list_start`, `meliscron_service_get_list_end`, `meliscron_service_get_listhistory_end`, `meliscron_service_save_item_start`/`_end`, `meliscron_service_delete_item_start`/`_end`.

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

L'exécution planifiée est pilotée par `MelisCron\Command\ExecCommand`, enregistré avec laminas-cli sous le nom **`melis:cronexec`**. Ajoutez une ligne dans le crontab du serveur :

```cron
* * * * * cd /path/to/project && php vendor/bin/laminas melis:cronexec --env=production >/dev/null 2>&1
```

Chaque déclenchement s'effectue en deux phases :

1. **`scheduleTasks()`** — évalue le planning de chaque tâche active par rapport à l'heure courante ; appelle `addJob()` pour toute tâche arrivée à échéance.
2. **`runJobs()`** — prend en charge chaque job en attente (`pending → processing`) puis l'exécute dans une **PHP Fiber** pour la concurrence :
   - **HTTP** — requête GET `curl` vers `cron_target` ; enregistre le statut HTTP et le corps de la réponse.
   - **CLI** — `exec()` de `cron_target` ; un code de sortie non nul définit l'état sur `error`.

Un déclencheur HTTP de secours est disponible à `/melis/MelisCron/Cron/execute` pour les environnements où un crontab CLI n'est pas disponible.

> La résolution de la planification est d'une minute (la cadence de déclenchement). Sans la ligne crontab, les tâches sont définies mais ne se déclenchent que manuellement via **Exécuter maintenant**.

Voir aussi : [MelisCore](/reference/modules/melis-core)
