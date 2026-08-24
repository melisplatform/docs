# MelisCron

> Verwaltung geplanter Aufgaben im Back-Office: Definieren Sie CLI- oder HTTP-Aufgaben mit flexiblen Zeitplänen, führen Sie sie bei Bedarf oder über einen minütlichen CLI-Runner aus und prüfen Sie den vollständigen Ausführungsverlauf — jetzt angetrieben von einem nativen React-Werkzeug. Paket `melisplatform/melis-cron`.

## Zweck

MelisCron ersetzt handgeschriebene Crontab-Zeilen durch eine verwaltete Liste von Aufgaben. Jede Aufgabe verweist auf einen **CLI-Befehl** oder eine **HTTP-URL** und legt fest, wann sie ausgeführt werden soll (alle N Minuten/Stunden/Tage, stündlich, täglich, wöchentlich oder monatlich). Jede Ausführung wird in einer Verlaufstabelle mit Status, Dauer und erfasster Ausgabe protokolliert. Die geplante Ausführung erfordert weiterhin einen einzigen Crontab-Eintrag auf Betriebssystemebene, der jede Minute den Runner `melis:cronexec` aufruft; das React-Werkzeug definiert, protokolliert und löst Aufgaben lediglich (bei Bedarf) aus.

## Aktivierung

Fügen Sie Folgendes in `config/melis.module.load.php` hinzu:

```php
return [
    'MelisCron',
];
```

Erfordert **MelisCore** (von der Plattform bereitgestellt). Composer-Abhängigkeiten: PHP `^8.1|^8.3`, `ext-curl`, `composer/composer ^2.9.6`, `laminas/laminas-cli ^1.5`. Das React-Werkzeug erscheint nur, wenn das Modul aktiviert ist (modulare Brick-Erkennung).

## Back-Office (React)

**Seitenleiste → MelisCore → Dev Tools → Scheduled Tasks**, neben Melis Phpinfo und dem SQL-Werkzeug. Es öffnet sich als oberer Tab mit dem Namen **Scheduled Tasks** und wird als **nativer Voll-React-Brick** ausgeliefert (Brick-ID `cron`, melisKey `cron_tool`), mit einem **New / Old**-Umschalter: *New* ist die React-Oberfläche (Standard); *Old* rendert das ältere jQuery-Werkzeug in einem iframe.

Da eine Cron-Aufgabe beliebige CLI-Befehle und HTTP-Aufrufe ausführt, sind **Erstellen / Bearbeiten / Ausführen** serverseitig zusätzlich zu den Berechtigungsprüfungen auf Plattform-**Administratoren** beschränkt.

### Aufgabenliste

Die Liste zeigt jede geplante Aufgabe mit **KPI-Karten** (Total / Active / Inactive), einem **Suchfeld** (Name und Ziel), Filtern für **Status** (All / Active / Inactive) und **Typ** (CLI / HTTP), **Filter zurücksetzen**, einem **Spalten**-Manager (dauerhaft gespeichert), einer **Export**- und einer **Aktualisieren**-Schaltfläche. Klicken Sie auf eine Spaltenüberschrift, um zu sortieren. Jede Zeile verfügt über drei zeilenbezogene Aktionen: **Jetzt ausführen** (▶), **Bearbeiten** und **Löschen** (beim Löschen wird auch der Verlauf der Aufgabe entfernt). Schaltflächen oben rechts: **History**, der **New / Old**-Umschalter und **+ New task**. Das Formular und die Verlaufsseite öffnen sich als native **Unter-Tabs** innerhalb des Tabs Scheduled Tasks und behalten jeweils ihren Zustand.

![Das React-Cron-Werkzeug: KPI-Karten, Suche, Status- und Typfilter, Spalten, Export, der New/Old-Umschalter, History und + New task, mit zeilenbezogenen Aktionen Ausführen/Bearbeiten/Löschen](/screenshots/react/melis-cron/meliscron-tool-cron-list.png)

### Aufgabe erstellen / bearbeiten

**+ New task** (oder der Bearbeiten-Stift einer Zeile) öffnet ein zweispaltiges React-Formular in einem Unter-Tab:

- **Identität + Ziel** — **Name**, **Typ** (CLI / HTTP als segmentierter Umschalter) und **Ziel** (der CLI-Befehl wie `cache:clear` oder die HTTP-URL), mit einem typabhängigen Hinweis.
- **Optionen** — ein **Active**-Umschalter und die **Schedule**-Auswahl. Die Auswahl eines Zeitplans blendet dessen Editor ein: *Interval* = Wert + Einheit (Minuten/Stunden/Tage); *Hourly* = Minute der Stunde; *Daily* = Stunde + Minute; *Weekly* = Wochentag-Schaltflächen + Stunde + Minute; *Monthly* = Tag des Monats + Stunde + Minute.

![Das React-Formular „New task“ — Name, Typ (CLI/HTTP), Ziel mit typabhängigem Hinweis und das Optionen-Panel mit dem Active-Umschalter und dem Schedule-Editor (Interval — alle 15 Minuten)](/screenshots/react/melis-cron/meliscron-tool-cron-new.png)

**Save** speichert die Aufgabe dauerhaft. Validierung (client- und serverseitig gespiegelt): Name erforderlich (≤ 100 Zeichen), Ziel erforderlich (≤ 255 Zeichen), Typ muss CLI/HTTP sein, und die Zeitplanoptionen müssen für den gewählten Typ gültig sein.

![Bearbeiten von „CRON 1“ (eine HTTP-Aufgabe mit dem Ziel /my-url, alle 15 Minuten) — dasselbe zweispaltige Formular, vorausgefüllt aus der Aufgabe](/screenshots/react/melis-cron/meliscron-tool-cron-edit.png)

### Jetzt ausführen & Verlauf

Die zeilenbezogene Schaltfläche **Run** (▶) fragt nach einer Bestätigung und **führt die Aufgabe dann sofort aus** (synchron, innerhalb der Anfrage), meldet das Ergebnis — Status, HTTP-Status bei HTTP-Aufgaben, Dauer — als Benachrichtigung und schreibt einen Verlaufseintrag. Dies umgeht den Zeitplan.

![Der Bestätigungsdialog „Run task“ — „Are you sure you want to perform 'CRON 1' now?“ mit Cancel / Run](/screenshots/react/melis-cron/meliscron-tool-cron-run.png)

Die Schaltfläche **History** öffnet die Seite **Execution history** in einem Unter-Tab: KPI-Karten (Executions / Succeeded / Failed / Running), Filter (Suche nach Name & Logs, Aufgaben-Dropdown, Status-Dropdown, Zeitraum Von/Bis) und eine Tabelle der Ausführungen (Aufgabe, Typ, Status, Dauer, Ausführungsdatum, Rerun-Kennzeichen). Ein zeilenbezogenes **Logs**-Popup zeigt das Ausführungsdetail (Ziel, Warteschlangen-/Ausführungsdaten, Dauer, HTTP-Code) sowie die roh erfassten Protokolle.

## React-API

Routen in `config/react-api.php`, Controller `MelisCron\Controller\MelisReactApiCronController`. Alle unter `/melis/react-api/crons`, Vertrag `{ success, data, error }`.

| Methode & URL | Aktion | Zweck |
| --- | --- | --- |
| `GET /crons` | `list` | Aufgaben auflisten (Keyset: `limit`, `search`, `active`, `type`, `sort`, `dir`, `after`) |
| `GET /crons/stats` | `stats` | KPI `{total, active, inactive}` |
| `GET /crons/:id` | `get` | Eine Aufgabe |
| `POST /crons/save` | `save` | Aufgabe erstellen / aktualisieren (validiert) — **nur Administrator** |
| `DELETE /crons/delete/:id` | `delete` | Eine Aufgabe und ihren Verlauf löschen |
| `POST /crons/run/:id` | `run` | Eine Aufgabe **jetzt** ausführen (synchron) — **nur Administrator** |
| `GET /crons/history` | `history` | Ausführungsverlauf (Filter `cronId`, `state`, `search`, `startDate`, `endDate`, `page`, `limit`) |
| `GET /crons/history/:id` | `historyDetail` | Eine Ausführung + vollständige Protokolle |

Jede Aktion ruft zuerst `denyUnlessAccess()` auf (Authentifizierung + `MelisCoreRights::canAccess('cron_tool')`). Verändernde Aktionen ergänzen `denyUnlessAdmin()` (blockiert Nicht-`usr_admin`) und `denyUnlessCan(cap)`. Lese- und CRUD-Vorgänge greifen über parametrisiertes SQL auf die beiden Tabellen zu; `run` delegiert an `MelisCronService::runTaskNow($id)`.

### Berechtigungen

Deklariert in `config/react.capabilities.php` unter dem Knoten `cron_tool` — eine flache CRUD-Liste:

```php
'melisReactToolCapabilities' => [
    'cron_tool' => ['list', 'create', 'edit', 'delete', 'export', 'run'],
],
```

In React steuert `useCaps('cron_tool').can(cap)` die Oberfläche (blendet **+ New task**, zeilenbezogene Aktionen, Export aus). Das Modell ist **default-allow** mit **Admin-Bypass**; darüber hinaus sind Erstellen/Bearbeiten/Ausführen fest auf Administratoren beschränkt.

## Zentraler Service — `MelisCronService`

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

**Ausgelöste Events:** `cron_service_get_list_start`, `meliscron_service_get_list_end`, `meliscron_service_get_listhistory_end`, `meliscron_service_save_item_start`/`_end`, `meliscron_service_delete_item_start`/`_end`.

## Datenbanktabellen

| Tabelle | Enthält |
| --- | --- |
| `melis_cron` | Aufgabendefinitionen: `cron_id`, `cron_name`, `cron_active`, `cron_target`, `cron_type` (ENUM `CLI\|HTTP`), `cron_schedule_type` (ENUM `every\|hourly\|daily\|weekly\|monthly`), `cron_schedule_options` (JSON) |
| `melis_cron_history` | Ausführungsdatensätze: `id`, `cron_id`, `state` (ENUM `pending\|processing\|success\|error`), `date_add`, `rerun`, `date_run`, `duration`, `logs`, `status` |

### JSON-Formen von `cron_schedule_options`

| `cron_schedule_type` | JSON-Struktur |
| --- | --- |
| `every` | `{ "everyItem": "minutes\|hours\|days", "everyValue": N }` |
| `hourly` | `{ "hourlyValue": MM }` |
| `daily` | `{ "dailyHour": HH, "dailyMinute": MM }` |
| `weekly` | `{ "weeklyDays": [1..7], "atHour": HH, "atMinute": MM }` (ISO-Wochentag, Mo=1) |
| `monthly` | `{ "monthlyDay": D, "atHour": HH, "atMinute": MM }` |

## Einrichtung des Runners

Die geplante Ausführung wird von `MelisCron\Command\ExecCommand` angetrieben, das bei laminas-cli als **`melis:cronexec`** registriert ist. Fügen Sie eine Zeile zur Server-Crontab hinzu:

```cron
* * * * * cd /path/to/project && php vendor/bin/laminas melis:cronexec --env=production >/dev/null 2>&1
```

Jeder Tick durchläuft zwei Phasen:

1. **`scheduleTasks()`** — wertet den Zeitplan jeder aktiven Aufgabe gegen die aktuelle Zeit aus; ruft `addJob()` für jede fällige Aufgabe auf.
2. **`runJobs()`** — beansprucht jeden ausstehenden Job (`pending → processing`) und führt ihn dann innerhalb einer **PHP-Fiber** zur Nebenläufigkeit aus:
   - **HTTP** — `curl`-GET von `cron_target`; protokolliert HTTP-Status und Antworttext.
   - **CLI** — `exec()` von `cron_target`; ein Exit-Code ungleich null setzt den Status auf `error`.

Ein HTTP-Fallback-Trigger ist unter `/melis/MelisCron/Cron/execute` für Umgebungen verfügbar, in denen keine CLI-Crontab bereitsteht.

> Die Zeitplanauflösung beträgt eine Minute (die Tick-Frequenz). Ohne die Crontab-Zeile sind Aufgaben zwar definiert, werden aber nur ausgelöst, wenn sie manuell über **Jetzt ausführen** gestartet werden.

Siehe auch: [MelisCore](/de/reference/modules/melis-core)
