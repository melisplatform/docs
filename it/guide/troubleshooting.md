# Risoluzione dei problemi e operazioni

Una guida pratica ai problemi che incontrerai davvero, con la causa e la soluzione. Quando qualcosa
"non compare", la risposta è quasi sempre **moduli / diritti / cache**.

In v6 il back-office è la **shell React su `/melis-react`**, ma il framework, i moduli e la
configurazione sottostanti sono invariati — quindi la maggior parte delle soluzioni qui è ancora lato
server. Dove uno strumento non ha una pagina React nativa, la shell mostra lo strumento classico
all'interno di un iframe (`/melis/react-tool-page?key=<melisKey>`), e gli strumenti "brick" React
nativi presentano un interruttore **New (React) / Old (iframe)** verso quella stessa schermata
classica. Sapere quale livello stai osservando è spesso il primo passo diagnostico.

## Attiva prima gli errori

Per impostazione predefinita Melis non segnala gli errori. Abilita la **modalità sviluppo** per
vederli:

```bash
vendor/bin/laminas-development-mode enable     # status | enable | disable
```

Questo carica `config/development.config.php`, disabilita le cache di config/moduli e imposta
`error_reporting(E_ALL)`. Anche gli avvisi PHP vengono mostrati da
`MelisCorePhpWarningListener`. La segnalazione/visualizzazione degli errori può inoltre essere
controllata dalla configurazione Melis sotto `/meliscore/datas/errors`.

Nota che gli endpoint dell'API React rispondono in JSON, non in HTML: una chiamata di boot fallita
restituisce `{ success: false, error: … }` (ad esempio `{ success:false, error:'Unauthenticated' }`
con HTTP 401), quindi leggi la scheda di rete, non solo la pagina. Uno strumento legacy all'interno
dell'iframe mostra ancora i propri errori nativi (toast gritter, modali di validazione per campo)
esattamente come sotto `/melis`.

::: warning Pagina bianca, HTTP 200, nessun errore?
Melis utilizza l'output buffering; un errore fatale durante il bootstrap/rendering può produrre un
**200 vuoto**. Per vedere l'eccezione inghiottita, collega temporaneamente un listener a
`MvcEvent::EVENT_DISPATCH_ERROR` / `EVENT_RENDER_ERROR` in `public/index.php` (racchiudi
`Application::init()` in un try/catch e stampa il parametro `exception`), oppure abilita la modalità
sviluppo.
:::

## Cache

La cache obsoleta è la causa numero 1 di "ho cambiato la config ma non è cambiato niente". Le cache
risiedono sotto `cache/`:

```
cache/meliscore_platform_cache-*   # zone del back-office / config della piattaforma
cache/meliscms_page-*              # pagine CMS renderizzate
cache/config/                      # config Laminas unificata (se abilitata)
```

Svuotale eliminando le cartelle pertinenti, oppure tramite l'API
`MelisCoreCacheSystemService::deleteCacheByPrefix('*', 'meliscore_platform_cache')`. Melis svuota
inoltre automaticamente le cache in caso di modifiche alla gestione dei moduli e ai diritti. Dopo
aver modificato `config/melis.module.load.php` o qualsiasi `app.*.php`, **svuota `cache/melis*` e
ricarica**.

Dal back-office puoi svuotare le cache dallo strumento **Cache** (la sua schermata React presenta le
stesse schede dello strumento classico). Vedi [MelisCacheInternal](/it/reference/modules/melis-cache-internal).

La shell React ha un proprio livello di caching da tenere presente quando le cose sembrano obsolete:

- Il **bundle bricks** concatenato (`/melis/react-api/bricks-bundle.js?v=<sig>`) viene servito come
  immutabile per 1 anno; la sua firma `?v=` (nome+mtime+dimensione di ogni brick) cambia
  automaticamente quando i file di un brick cambiano, quindi un **ricaricamento forzato** recupera il
  nuovo bundle.
- La **shell SPA** (`index.html`) viene servita come `no-cache`, ma gli asset JS/CSS con hash a cui
  fa riferimento sono content-hashed e memorizzati in cache — di nuovo, un ricaricamento forzato è la
  soluzione.
- Se un iframe dello strumento si carica con uno stile rotto o una DataTable vuota dopo una modifica
  ai **Moduli**, i bundle degli asset della piattaforma sotto `etc/bundles/` potrebbero essere stati
  cancellati; si auto-riparano (rigenerati al successivo rendering della pagina dello strumento), ma
  puoi forzarlo ricaricando lo strumento.

## Insidie comuni

### Un modulo non compare
| Causa | Soluzione |
| --- | --- |
| Non presente nella lista di caricamento | Aggiungilo a `config/melis.module.load.php`. |
| Cache obsoleta | Svuota `cache/melis*` e ricarica. |
| Percorso non mappato | Assicurati che sia nel `config/melis.modules.path.php` generato (rigenerato da `MelisAssetManager`). |

### Uno strumento esiste ma non è nel menu a sinistra / "Non hai accesso a questo strumento"
Il menu a sinistra di React (`GET /melis/react-api/menu`) è l'albero di navigazione **filtrato per
diritti** — lo stesso allow-list XML `melis_core_user.usr_rights` di prima, semplicemente consumato
dalla shell.

| Causa | Soluzione |
| --- | --- |
| L'utente non ha i diritti | Concedi la `*_toolstree_section` dello strumento in **Users → Rights**, oppure tramite una migrazione (vedi `flyway/sql/V3__add_melisai_rights.sql`). |
| Diritti memorizzati nella sessione | I diritti vengono caricati al login e aggiornati periodicamente da `MelisCoreCheckUserRightsListener` — **disconnettiti / riconnettiti** dopo averli modificati. |
| Utente inattivo | `usr_status` deve essere `1`. |
| Modulo del brick inattivo | Uno strumento React nativo (brick) compare **se e solo se** il suo modulo è attivo — la shell rileva i brick tramite `GET /melis/react-api/react-modules`. Abilita il modulo. |

> Un `usr_rights` **vuoto** significa accesso completo (`isAccessible()` restituisce true se vuoto) —
> ma per un utente normale con un allow-list esplicito, una sezione mancante viene nascosta.

### Il pulsante/scheda di uno strumento è vietato anche se posso aprire lo strumento (HTTP 403)
La v6 aggiunge **diritti avanzati** ("capabilities") *all'interno* di uno strumento già autorizzato
— le caselle di controllo granulari List / Create / Edit / Delete / per-scheda in **Users → Rights**.

| Causa | Soluzione |
| --- | --- |
| Capability negata | Il controller dello strumento ha chiamato `denyUnlessCan(<cap>)` e il tuo XML dei diritti nega quella capability. Rimuovi il diniego in **Users → Rights** (matrice dei diritti avanzati). |
| Memorizzata nella sessione | Le capabilities arrivano nella chiamata di boot `GET /melis/react-api/me` (`data.capabilities`) — **disconnettiti / riconnettiti** dopo aver modificato i diritti. |

> Le capabilities sono **consentite per impostazione predefinita**: uno strumento senza dichiarazione,
> o una capability che non è negata, rimane pienamente utilizzabile; **gli amministratori le bypassano**
> completamente. I dinieghi risiedono in una sezione dedicata `<meliscore_tool_capabilities>` dell'XML
> dei diritti, quindi non influiscono sul BO classico.

### Uno strumento legacy si carica vuoto / i suoi pulsanti non fanno nulla all'interno della shell React
Quando uno strumento non ha una pagina React nativa viene mostrato in un iframe tramite
`/melis/react-tool-page?key=<melisKey>`. Una DataTable vuota o un pulsante inattivo lì è quasi sempre
una **risorsa di modulo mancante** (il suo `*.tool.js`/CSS non è stato iniettato).

| Causa | Soluzione |
| --- | --- |
| Risorsa del modulo non caricata | La pagina dello strumento inietta le `ressources` di ogni modulo; una scheda/pulsante appena aggiunta che fornisce JS di cui la pagina non è a conoscenza necessita della registrazione della radice del suo plugin (o di un hook `toolpage_extensions` — vedi [Creare uno strumento](/it/guide/create-a-tool)). |
| Confronta con `/melis` | Apri lo stesso strumento direttamente su `/melis` (o tramite l'interruttore **Old** dello strumento). Se è rotto anche lì, il problema è nello strumento stesso, non nel frame React. |

### Errori di connessione al database
| Causa | Soluzione |
| --- | --- |
| File di piattaforma mancante | `config/autoload/platforms/<MELIS_PLATFORM>.php` deve esistere e corrispondere alla variabile d'ambiente `MELIS_PLATFORM`. |
| Credenziali errate | Controlla le variabili d'ambiente `MYSQL_*` consumate dal file di piattaforma. |

### Asset (CSS/JS) 404
| Causa | Soluzione |
| --- | --- |
| Modulo non mappato | Controlla `config/melis.modules.path.php`. |
| Bundle non compilati | Ricompila gli asset (build Webpack / `vendor/bin/phing`). |
| Foglio di stile restituito come HTML | Una sessione scaduta reindirizzava una richiesta di bundle alla pagina di login HTML (il browser rifiuta il MIME); la v6 serve il bundle della piattaforma su `/melis/react-platform-bundle` con il tipo corretto e lo mantiene pubblico — un ricaricamento forzato elimina il rifiuto obsoleto. |

### Le traduzioni mostrano la chiave grezza `tr_…`
| Causa | Soluzione |
| --- | --- |
| Locale non impostato | Il locale attivo proviene dalla sessione (`melis-lang-locale`); il selettore di lingua dell'header React lo scrive (`GET /melis/react-api/langs`). |
| File mancante | Aggiungi `language/<locale>.interface.php`; `en_EN` è il fallback. |

## Schema del database (dbdeploy & flyway)

- **dbdeploy** ([MelisDbDeploy](/it/reference/modules/melis-dbdeploy)) viene eseguito su
  `composer update` (hook post-update) per applicare i delta SQL numerati di ogni modulo, tracciati
  nella tabella `changelog`.
- **flyway** ([MelisFlyway](/it/reference/modules/melis-flyway)) applica le migrazioni del progetto
  in `flyway/sql/` (`flyway -configFiles=flyway/conf/flyway.conf migrate`).

## Strumenti CLI e di build

```bash
vendor/bin/laminas-development-mode {status|enable|disable}   # dev mode
flyway -configFiles=flyway/conf/flyway.conf {migrate|info|repair}   # DB migrations
vendor/bin/phing                                             # build assets/bundles
```

`composer update` attiva gli hook di Melis (deploy dei moduli + dbdeploy) tramite `composer.json`
`post-update-cmd`.

## Dove cercare

| Aspetto | Percorso |
| --- | --- |
| Template della modalità sviluppo | `config/development.config.php.dist` |
| API della cache | `vendor/melisplatform/melis-core/src/Service/MelisCoreCacheSystemService.php` |
| Aggiornamento dei diritti | `vendor/melisplatform/melis-core/src/Listener/MelisCoreCheckUserRightsListener.php` |
| Avvisi PHP | `vendor/melisplatform/melis-core/src/Listener/MelisCorePhpWarningListener.php` |
| Assemblaggio dei moduli | `vendor/melisplatform/melis-core/src/MelisModuleManager.php` |
| API React (menu / me / capabilities) | `vendor/melisplatform/melis-react-api/src/Controller/MelisReactApiController.php` |
| Shell React / pagine strumento iframe | `vendor/melisplatform/melis-react-override/src/Controller/PluginViewController.php` |
| Config Flyway | `flyway/conf/flyway.conf`, migrazioni in `flyway/sql/` |
