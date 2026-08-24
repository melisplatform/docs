# MelisDbDeploy

> Esecutore headless delle migrazioni del database per la piattaforma Melis — applica in ordine i delta SQL di ogni modulo. Pacchetto `melisplatform/melis-dbdeploy`.

## Scopo

`MelisDbDeploy` mantiene lo schema del database di ogni modulo allineato al codice installato. Ogni modulo
che aderisce distribuisce le proprie modifiche di schema come file SQL ordinati (**delta**) sotto
`install/dbdeploy/`. MelisDbDeploy individua questi delta in tutti i moduli, applica quelli
non ancora eseguiti e registra ciascuno in una tabella changelog affinché venga applicato esattamente una volta — basato
su `DbDeployTask` di [Phing](https://www.phing.info/).

Non dispone di **alcuna interfaccia rivolta all'utente**.

## Relazione con il back-office React

MelisDbDeploy **non ha alcuno strumento React, nessuna pagina, nessuna voce di menu, nessuna route**. Non compare mai da nessuna parte in
`/melis-react`. Non esiste alcun brick `ui-react/`, nessun `config/react-api.php`, nessun
`config/react.capabilities.php` e nessun `src/Controller/` — è un modulo headless, di soli servizi.

Il suo collegamento con il back-office React è del tutto **indiretto**, tramite due fatti:

- **Crea le tabelle e le colonne che gli strumenti React leggono e scrivono.** Ogni strumento React (Utenti,
  Pagine CMS, Siti, Media, …) interroga tabelle del database. Queste tabelle — e le colonne che le nuove funzionalità
  React aggiungono — sono create dai delta `install/dbdeploy/*.sql` del modulo proprietario, che
  MelisDbDeploy applica. Se uno strumento React genera un errore "table/column not found" subito dopo un'installazione
  o un aggiornamento, la causa abituale è una migrazione non eseguita.
- **Viene eseguito nella pipeline di deploy che distribuisce la build React.** La build React committata
  (`melis-core/public/ui-react/`, applicazione su `/melis-react`) è distribuita dallo stesso deployment che
  esegue le migrazioni di schema. MelisDbDeploy gestisce i delta SQL **distribuiti dai moduli**; **Flyway**
  gestisce le migrazioni versionate della piattaforma (`V*.sql`). Sono meccanismi complementari nello
  stesso passaggio di deploy.

## Abilitarlo

Aggiungere a `config/melis.module.load.php`:

```php
return [
    'MelisDbDeploy',
];
```

`MelisDbDeploy` dipende solo da `phing/phing`. **Non** ha alcuna dipendenza da `melis-core` — è uno
strumento autonomo invocato da MelisInstaller e dai flussi di installazione/aggiornamento dei moduli, mai chiamato
da React.

## Far aderire un modulo

Un modulo partecipa al sistema di migrazione dichiarando quanto segue nel suo `composer.json`:

```json
"extra": {
    "dbdeploy": true
}
```

I suoi delta SQL vengono collocati in `install/dbdeploy/*.sql`. Ogni nome di file inizia con un prefisso numerico
che ne definisce l'ordine di esecuzione (ad es. `23051701_create_my_table.sql`).

## Servizi principali

| Alias del servizio | Ruolo |
| --- | --- |
| `MelisDbDeployDiscoveryService` | Trova i delta di ogni pacchetto `melisplatform/*` aderente e li copia nella cache di lavoro (`dbdeploy/data/`), quindi delega al servizio di deploy. |
| `MelisDbDeployDeployService` | Si connette al database, verifica che la tabella changelog esista e applica i delta in sospeso tramite `DbDeployTask` + `PDOSQLExecTask` di Phing. |

## La tabella changelog

Ogni delta applicato viene registrato in una tabella `changelog` fissa (il nome è richiesto dal task
di Phing), che funge da registro "applicato una sola volta":

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

L'accesso al modello avviene tramite `MelisDbDeploy\Model\Table\ChangelogTable` (con alias `ChangelogTable`).

## Esempio

```php
// Discovery — raccoglie i delta da tutti i moduli dbdeploy
$discovery = $sm->get(\MelisDbDeploy\Service\MelisDbDeployDiscoveryService::class);
$discovery->setComposer($composer);
$discovery->processing();   // individua i moduli e copia i loro delta *.sql

// Deploy — applica i delta in sospeso
$deploy = new \MelisDbDeploy\Service\MelisDbDeployDeployService(/* db params */);
if (!$deploy->isInstalled()) {
    $deploy->install();                  // crea la tabella changelog alla prima esecuzione
}
$count = $deploy->changeLogCount();      // numero di delta applicati finora
$deploy->applyDeltaPath($pathToDeltas);  // esegue tutti i delta non ancora applicati
```

## Quando viene eseguito

MelisDbDeploy viene invocato automaticamente in due scenari, nessuno dei quali coinvolge l'interfaccia React:

- **Prima installazione** — da **MelisInstaller** durante la procedura guidata di configurazione della piattaforma.
- **Installazione / aggiornamento di un modulo** — tramite lo strumento Modules del back-office / il marketplace e l'hook Composer
  post-update (`DbDeployOnComposerUpdate::postUpdate()`), che copia i delta di ogni modulo e
  li ri-applica finché il conteggio del changelog non corrisponde al numero di file delta (convergenza idempotente).

Non espone alcun controller.

## Risoluzione dei problemi

Se uno strumento React mostra dati vuoti o un errore 500 / "table doesn't exist" subito dopo l'installazione, l'aggiornamento
o il deploy di un modulo, la causa principale tipica è un **delta dbdeploy non eseguito** (o una migrazione Flyway
mancante) — non il codice React. Rieseguire il flusso di migrazione risolve il problema.

## File principali

| Ambito | Percorso |
| --- | --- |
| Servizio di discovery | `vendor/melisplatform/melis-dbdeploy/src/Service/MelisDbDeployDiscoveryService.php` |
| Servizio di deploy | `vendor/melisplatform/melis-dbdeploy/src/Service/MelisDbDeployDeployService.php` |
| Hook Composer post-update | `vendor/melisplatform/melis-dbdeploy/src/DbDeployOnComposerUpdate.php` |
| DDL del changelog | `vendor/melisplatform/melis-dbdeploy/data/changelog.sql` |
| Modelli | `vendor/melisplatform/melis-dbdeploy/src/Model/` |
| Delta dei moduli (qualsiasi modulo) | `vendor/melisplatform/<module>/install/dbdeploy/*.sql` |

Vedi anche: [MelisCore](/it/reference/modules/melis-core) · [MelisInstaller](/it/reference/modules/melis-installer) · [MelisComposerDeploy](/it/reference/modules/melis-composerdeploy) · [Concetti della piattaforma](/it/guide/concepts)
