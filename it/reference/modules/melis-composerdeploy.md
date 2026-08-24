# MelisComposerDeploy

> Integra Composer all'interno della piattaforma per installare, aggiornare e rimuovere moduli a livello programmatico. Pacchetto `melisplatform/melis-composerdeploy`.

## Scopo

MelisComposerDeploy consente alla piattaforma di **eseguire Composer dall'interno dell'applicazione** — installando, aggiornando o rimuovendo moduli senza accesso al terminale. È il motore headless dietro lo strumento **Modules / marketplace** del back-office e la procedura guidata di primo avvio di MelisInstaller. Si colloca nel livello di base MelisCore accanto a MelisAssetManager, MelisDbDeploy e MelisInstaller, e dipende unicamente da `composer/composer` (nessun accoppiamento con MelisCore).

## Nessun back-office React

MelisComposerDeploy **non ha alcuna interfaccia React né alcuno strumento del back-office** — né nel back-office legacy né in quello React (`/melis-react`). Non fornisce alcun brick `ui-react/`, alcun `brick.manifest.json`, alcun `config/react-api.php` né alcun controller. Non compare mai nella barra laterale e non c'è nulla su cui fare clic.

Il suo rapporto con il back-office React è **indiretto**: quando si installa un modulo tramite il marketplace, MelisComposerDeploy scarica il pacchetto Composer. Se quel pacchetto include un brick React precompilato, la shell React scopre il brick **una volta che il modulo è attivo** — ma la scoperta dei brick è gestita da `melis-react-api`, non da questo modulo. MelisComposerDeploy non tocca, compila né serve mai asset React.

> Negli ambienti di deploy in cui l'intera cartella `vendor/` è versionata (nessun `composer install` lato server), MelisComposerDeploy è il motore del *marketplace runtime* — non il meccanismo che distribuisce l'app React precompilata.

## Attivazione

Aggiungere a `config/melis.module.load.php`:

```php
return [
    'MelisComposerDeploy',
];
```

## Servizio chiave

L'intero modulo è essenzialmente un unico servizio, con alias `MelisComposerService` (`config/module.config.php` → `service_manager.aliases`), classe `MelisComposerDeploy\Service\MelisComposerService`. Costruisce un comando della console Composer e lo esegue in-process tramite Symfony Console, pilotando la libreria Composer inclusa sotto `bin/extracted-composer/`.

| Alias del servizio | Ruolo |
| --- | --- |
| `MelisComposerService` | Esecutore Composer in-process. Espone `download()`, `update()`, `remove()`, `dumpAutoload()`, oltre a `setDocumentRoot()` e `setDryRun()`. |

```php
$composer = $sm->get('MelisComposerService');

$composer->setDocumentRoot($projectRoot);            // composer working-dir (defaults to DOCUMENT_ROOT/../)
$composer->setDryRun(true);                           // simulate without writing (--dry-run)

$composer->download('melisplatform/melis-cms-news');  // composer require <pkg>[:version]
$composer->update('melisplatform/melis-cms-news');    // composer update --root-reqs
$composer->remove('melisplatform/melis-cms-news');    // composer remove --no-scripts
$composer->dumpAutoload();                             // composer dump-autoload
```

Note dal codice sorgente:

- **Solo comandi consentiti**: `install`, `update`, `dump-autoload`, `require`, `remove`. Qualsiasi altro comando restituisce una risposta "unknown command".
- **Rafforzamento degli argomenti**: la stringa `package[:version]` viene validata rispetto a una rigorosa regex `vendor/name` + semver-ish e rifiuta gli spazi, prevenendo l'iniezione di argomenti nella riga di comando Composer.
- I comandi vengono eseguiti con `--ignore-platform-reqs --no-progress --no-scripts --prefer-dist` e `--working-dir=<docRoot>`.
- Nessuna rotta, nessun controller, nessun evento, nessuna vista — è un servizio invocato da altri moduli.

## Pipeline di deploy

I chiamanti pilotano il servizio; un tipico flusso di installazione a runtime:

```text
MelisComposerService::download(pkg)   →  composer require (package downloaded into vendor/)
        ↓
MelisComposerService::dumpAutoload()  →  autoloader regenerated (new classes visible)
        ↓
MelisDbDeploy                          →  applies the new module's SQL deltas (extra.dbdeploy: true)
        ↓
module active                          →  MelisAssetManager serves its assets; if the module ships
                                          a React brick, the React shell discovers it (via
                                          melis-react-api /react-modules)
```

L'ultima freccia è l'unico punto di contatto, passivo, con il back-office React: questo modulo rende il modulo presente e attivo; la scoperta del brick React appartiene interamente a `melis-react-api`.

Vedere anche: [MelisDbDeploy](/it/reference/modules/melis-dbdeploy), [MelisInstaller](/it/reference/modules/melis-installer), [MelisAssetManager](/it/reference/modules/melis-asset-manager)
