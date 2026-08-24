# MelisDbDeploy

> Headless-Runner für Datenbankmigrationen der Melis-Plattform — wendet die SQL-Deltas jedes Moduls der Reihe nach an. Paket `melisplatform/melis-dbdeploy`.

## Zweck

`MelisDbDeploy` hält das Datenbankschema jedes Moduls mit dem installierten Code synchron. Jedes
Modul, das teilnimmt, liefert seine Schemaänderungen als geordnete SQL-Dateien (**Deltas**) unter
`install/dbdeploy/`. MelisDbDeploy erkennt diese Deltas über alle Module hinweg, wendet die noch
nicht ausgeführten an und protokolliert jedes in einer Changelog-Tabelle, sodass es genau einmal
angewendet wird — aufbauend auf dem `DbDeployTask` von [Phing](https://www.phing.info/).

Es besitzt **keine Benutzeroberfläche**.

## Beziehung zum React-Backoffice

MelisDbDeploy hat **kein React-Tool, keine Seite, keinen Menüeintrag, keine Route**. Es erscheint
niemals irgendwo in `/melis-react`. Es gibt keinen `ui-react/`-Baustein, keine
`config/react-api.php`, keine `config/react.capabilities.php` und kein `src/Controller/` — es ist
ein headless, rein dienstbasiertes Modul.

Seine Verbindung zum React-Backoffice ist vollständig **indirekt**, über zwei Tatsachen:

- **Es erstellt die Tabellen und Spalten, die die React-Tools lesen und schreiben.** Jedes
  React-Tool (Benutzer, Seiten-CMS, Sites, Medien …) fragt Datenbanktabellen ab. Diese Tabellen —
  und die Spalten, die neuere React-Funktionen hinzufügen — werden durch die
  `install/dbdeploy/*.sql`-Deltas des jeweils zuständigen Moduls erstellt, die MelisDbDeploy
  anwendet. Wenn ein React-Tool direkt nach einer Installation oder Aktualisierung mit
  „Tabelle/Spalte nicht gefunden" fehlschlägt, ist eine nicht ausgeführte Migration die übliche
  Ursache.
- **Es läuft in der Deploy-Pipeline, die den React-Build ausliefert.** Der eingecheckte React-Build
  (`melis-core/public/ui-react/`, App unter `/melis-react`) wird durch dasselbe Deployment
  ausgeliefert, das die Schemamigrationen ausführt. MelisDbDeploy verarbeitet die **vom Modul
  gelieferten** SQL-Deltas; **Flyway** verarbeitet die versionierten Plattformmigrationen
  (`V*.sql`). Sie sind komplementäre Mechanismen innerhalb desselben Deploy-Schritts.

## Aktivierung

Zu `config/melis.module.load.php` hinzufügen:

```php
return [
    'MelisDbDeploy',
];
```

`MelisDbDeploy` hängt ausschließlich von `phing/phing` ab. Es hat **keine** Abhängigkeit von
`melis-core` — es ist ein eigenständiges Werkzeug, das von MelisInstaller sowie von den
Modul-Installations-/Aktualisierungsabläufen aufgerufen wird, niemals aus React heraus.

## Ein Modul teilnehmen lassen

Ein Modul nimmt am Migrationssystem teil, indem es Folgendes in seiner `composer.json` deklariert:

```json
"extra": {
    "dbdeploy": true
}
```

Seine SQL-Deltas werden in `install/dbdeploy/*.sql` abgelegt. Jeder Dateiname beginnt mit einem
numerischen Präfix, das die Ausführungsreihenfolge festlegt (z. B.
`23051701_create_my_table.sql`).

## Wichtige Dienste

| Dienst-Alias | Rolle |
| --- | --- |
| `MelisDbDeployDiscoveryService` | Findet die Deltas jedes teilnehmenden `melisplatform/*`-Pakets, kopiert sie in den Arbeits-Cache (`dbdeploy/data/`) und delegiert anschließend an den Deploy-Dienst. |
| `MelisDbDeployDeployService` | Verbindet sich mit der Datenbank, stellt sicher, dass die Changelog-Tabelle existiert, und wendet ausstehende Deltas über Phings `DbDeployTask` + `PDOSQLExecTask` an. |

## Die Changelog-Tabelle

Jedes angewendete Delta wird in einer festen `changelog`-Tabelle protokolliert (der Name wird vom
Phing-Task vorgegeben), die als „Einmal-angewendet"-Register dient:

```sql
CREATE TABLE IF NOT EXISTS changelog (
  `change_number` BIGINT NOT NULL,
  `delta_set`     VARCHAR(10) NOT NULL,
  `start_dt`      TIMESTAMP NOT NULL,
  `complete_dt`   TIMESTAMP NULL,
  `applied_by`    VARCHAR(100) NOT NULL,
  `description`   VARCHAR(500) NOT NULL,
  PRIMARY KEY `Pkchangelog` (`change_number`, `delta_set`)
);
```

Der Modellzugriff erfolgt über `MelisDbDeploy\Model\Table\ChangelogTable` (Alias `ChangelogTable`).

## Beispiel

```php
// Discovery — gather deltas from all dbdeploy modules
$discovery = $sm->get(\MelisDbDeploy\Service\MelisDbDeployDiscoveryService::class);
$discovery->setComposer($composer);
$discovery->processing();   // discovers modules and copies their *.sql deltas

// Deploy — apply pending deltas
$deploy = new \MelisDbDeploy\Service\MelisDbDeployDeployService(/* db params */);
if (!$deploy->isInstalled()) {
    $deploy->install();                  // creates the changelog table on first run
}
$count = $deploy->changeLogCount();      // number of deltas applied so far
$deploy->applyDeltaPath($pathToDeltas);  // run any not-yet-applied deltas
```

## Wann es läuft

MelisDbDeploy wird in zwei Szenarien automatisch aufgerufen, von denen keines die React-Oberfläche
einbezieht:

- **Erstinstallation** — durch **MelisInstaller** während des Einrichtungsassistenten der Plattform.
- **Modulinstallation / -aktualisierung** — über das Modul-Tool / den Marketplace des Backoffice und
  den Composer-Post-Update-Hook (`DbDeployOnComposerUpdate::postUpdate()`), der die Deltas jedes
  Moduls kopiert und erneut anwendet, bis die Changelog-Zählung mit der Anzahl der Delta-Dateien
  übereinstimmt (idempotente Konvergenz).

Es stellt keine Controller bereit.

## Fehlerbehebung

Wenn ein React-Tool direkt nach einer Modulinstallation, -aktualisierung oder einem Deployment leere
Daten oder einen 500-Fehler / „Tabelle existiert nicht" anzeigt, ist die typische Grundursache ein
**nicht ausgeführtes dbdeploy-Delta** (oder eine fehlende Flyway-Migration) — nicht der React-Code.
Ein erneutes Ausführen des Migrationsablaufs behebt das Problem.

## Wichtige Dateien

| Aspekt | Pfad |
| --- | --- |
| Discovery-Dienst | `vendor/melisplatform/melis-dbdeploy/src/Service/MelisDbDeployDiscoveryService.php` |
| Deploy-Dienst | `vendor/melisplatform/melis-dbdeploy/src/Service/MelisDbDeployDeployService.php` |
| Composer-Post-Update-Hook | `vendor/melisplatform/melis-dbdeploy/src/DbDeployOnComposerUpdate.php` |
| Changelog-DDL | `vendor/melisplatform/melis-dbdeploy/data/changelog.sql` |
| Modell | `vendor/melisplatform/melis-dbdeploy/src/Model/` |
| Modul-Deltas (beliebiges Modul) | `vendor/melisplatform/<module>/install/dbdeploy/*.sql` |

Siehe auch: [MelisCore](/de/reference/modules/melis-core) · [MelisInstaller](/de/reference/modules/melis-installer) · [MelisComposerDeploy](/de/reference/modules/melis-composerdeploy) · [Plattformkonzepte](/de/guide/concepts)
