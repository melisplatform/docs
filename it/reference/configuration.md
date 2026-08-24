# Riferimento della configurazione

Tutto ciò che puoi configurare in Melis, in un unico posto: variabili d'ambiente, il file di
piattaforma, la famiglia di file di configurazione `app.*.php`, le melis key, le traduzioni, gli asset
e le cache.

## Variabili d'ambiente

Due variabili guidano ogni installazione (impostate in `docker-compose.yml`, oppure tramite `SetEnv` di Apache):

| Variabile | Scopo |
| --- | --- |
| **`MELIS_PLATFORM`** | Seleziona la configurazione di piattaforma `config/autoload/platforms/<MELIS_PLATFORM>.php` (la connessione al DB). Ad es. `local`, `dev1`. |
| **`MELIS_MODULE`** | Il **modulo del sito** servito come front office per questo dominio (ad es. `MelisDemoCms`). |
| `MYSQL_HOSTNAME` / `MYSQL_DATABASE` / `MYSQL_USER` / `MYSQL_PASSWORD` | Connessione al DB, di solito letta dal file di piattaforma tramite `getenv()`. |

## Il file di piattaforma

`config/autoload/platforms/<MELIS_PLATFORM>.php` contiene la **connessione al database** (e alcune
impostazioni dell'host). Viene unito per ultimo, quindi sovrascrive i valori predefiniti per ciascun ambiente:

```php
return [
    'db' => [
        'driver'   => 'Mysqli',
        'hostname' => getenv('MYSQL_HOSTNAME') ?: 'localhost',
        'database' => getenv('MYSQL_DATABASE'),
        'username' => getenv('MYSQL_USER'),
        'password' => getenv('MYSQL_PASSWORD'),
        'port'     => '3306',
        'charset'  => 'utf8mb4',
    ],
    'melis_platform'       => getenv('MELIS_PLATFORM'),
    'melis_http_host'      => 'localhost',
    'melis_request_scheme' => 'http',
];
```

Il file caricato viene scelto in `config/application.config.php` (`config_glob_paths`) a partire da
`getenv('MELIS_PLATFORM')`.

## File di configurazione del progetto

| File | Ruolo |
| --- | --- |
| `config/melis.module.load.php` | L'elenco ordinato dei **moduli di backoffice** da caricare. |
| `config/melis.modules.path.php` | Mappa generata: nome del modulo → percorso sul filesystem (costruita da `MelisAssetManager`). |
| `config/application.config.php` | Punto di ingresso dell'app: assemblaggio dei moduli, glob path, flag della cache. |
| `config/autoload/{global,local}.php` | Configurazione di autoload standard di Laminas. |
| `config/autoload/platforms/<env>.php` | Configurazione DB/piattaforma per ambiente (vedi sopra). |
| `config/development.config.php` | Override per lo sviluppo (creato da `laminas-development-mode enable`). |

## La famiglia di file di configurazione `app.*.php`

Ogni modulo di backoffice unisce questi file specifici di Melis in `Module::getConfig()`. Costruiscono tutti
un unico albero sotto una radice `plugins`, interrogabile tramite [`MelisCoreConfig`](/it/guide/concepts#_2-the-config-tree-melis-keys):

| File | Dichiara |
| --- | --- |
| `app.interface.php` | Le **zone** dell'interfaccia utente e il loro `forward` (module/controller/action). Ogni nodo: `conf` (id, name, icon, `melisKey`, `rightsDisplay`), `forward`, `interface` annidato. |
| `app.toolstree.php` | Dove uno strumento si aggancia nel **menu di sinistra** (`*_toolstree_section`). |
| `app.tools.php` | **Strumenti**: tabelle dati (colonne, filtri, pulsanti di azione), form. |
| `app.forms.php` | Definizioni di **form** riutilizzabili (spec del form Laminas + `input_filter`). |
| `app.emails.php` | Configurazioni dei template email. |
| `app.microservice.php` | API di metodi di servizio richiamabili (form di input/output). |
| `excluded.routes.php` | Route che bypassano il controllo di autenticazione. |

### Convenzioni

- **Chiavi di traduzione**: `tr_<module>_<section>_<item>` (ad es. `tr_meliscore_tool_users`).
- **Id di configurazione**: `id_<module>_<item>`.
- **Melis key**: alias brevi dichiarati come `'conf' => ['melisKey' => '…']` → risolti in percorsi
  di configurazione completi da `MelisCoreConfig::getMelisKeys()`.
- **Tabelle**: `melis_<area>_<entity>` (ad es. `melis_core_user`, `melis_cms_page_published`,
  `melis_ecom_product`).
- **Route**: `<module-slug>/<name>` (ad es. `melis-backoffice/login`).

## Traduzioni

Array PHP per ogni locale sotto la cartella `language/` di ciascun modulo:

```
language/en_EN.interface.php
language/fr_FR.interface.php   // 'tr_key' => 'Texte'
```

Caricati da `Module::createTranslations()` per il locale attivo (sessione `melis-lang-locale`), con
`en_EN` come fallback. I tipi includono `interface`, `forms`, `install`, `setup`.

## Asset

`MelisAssetManager` serve la cartella `public/` di ciascun modulo su `/<ModuleName>/…` e genera
`config/melis.modules.path.php`. Un **modulo del sito** elenca i propri CSS/JS di front office in
`config/assets.config.php`. È disponibile il bundling con Webpack (strumento di build / azione di backoffice).

## Cache

Il comportamento della cache è configurato nel `module.config.php` di `melis-core` (la sezione `caches`) e usato
tramite `MelisCoreCacheSystemService`. Ogni cache ha un flag `active`, una `cache_dir` sotto `cache/`,
e TTL per chiave. La **cache di configurazione** di Laminas è governata da `config_cache_enabled` in
`application.config.php` (disattivata per impostazione predefinita in questo skeleton). Vedi
[Risoluzione dei problemi](/it/guide/troubleshooting#cache) per svuotare le cache.

## Configurazione del back-office React

Il back-office React v6 (`/melis-react`) gira sullo **stesso framework e sullo stesso albero di
configurazione** del back-office classico (`/melis`) — tutto quanto sopra resta valido. Due moduli
infrastrutturali aggiuntivi lo collegano. Entrambi vengono caricati tramite `config/application.config.php`
(`module_paths` / `modules`, non tramite l'autoload di composer) e nessuno dei due ha alcuna configurazione
a livello di progetto da modificare: abilitare il BO React è semplicemente una questione di caricare questi moduli.

| Modulo | Ruolo |
| --- | --- |
| `MelisReactApi` | La struttura portante dell'API JSON. Dichiara gli endpoint generici `/melis/react-api/…` (nel proprio `config/module.config.php`) e ospita il resolver delle capability. Non disegna alcuna UI. |
| `MelisReactOverride` | Serve la shell React e visualizza gli strumenti legacy come iframe. Sovrascrive il controller `PluginView` di MelisCore e dichiara le route della shell/degli strumenti. |

### Servire la shell

La SPA React è servita dallo `SpaController` di `MelisReactOverride` su **`/melis-react`** e su
ogni deep link al suo interno (route regex `meliscore-melis-react-spa`, `priority => 1000`). L'
`index.html` della shell viene letto dal `public/ui-react/index.html` di **melis-core**, servito su
`/MelisCore/ui-react/` — quindi la build React risiede insieme a `melis-core`, non in questi moduli.

Poiché l'app React gestisce la propria autenticazione, `MelisReactOverride` aggiunge alcune
route a `plugins.meliscore.datas.excluded_routes` di MelisCore (pubbliche, senza redirect al login):
la route della SPA stessa, `melis-backoffice/react-platform-bundle`, e i due endpoint di boot in
sola lettura `melis-backoffice/melis-react-api/platformscheme-react-get` e
`melis-backoffice/melis-react-api/langs`.

### Scoperta di brick / moduli

La shell scopre gli strumenti al boot tramite **`GET /melis/react-api/react-modules`**, che scansiona
i moduli **attivi** alla ricerca di un `public/ui-react/brick.manifest.json` (un singolo oggetto o un
array `bricks: [...]`) e restituisce le definizioni dei brick più un unico URL di bundle concatenato
(`GET /melis/react-api/bricks-bundle.js`). Un brick appare quindi **se e solo se il suo
modulo è attivo** — questa è la regola di modularità; non c'è alcun registro separato da mantenere.
Un modulo che fornisce uno strumento React lo espone come brick sotto il proprio `public/ui-react/`.

### Chiavi di configurazione React per modulo

I singoli moduli degli strumenti (non questi due moduli infrastrutturali) possono dichiarare configurazione React,
unita nell'albero di configurazione tramite il loro `Module::getConfig()`:

| File / chiave | Dichiara |
| --- | --- |
| `config/react-api.php` | Le route dati `/melis/react-api/…` proprie di un modulo di strumento (ad es. `users`, `roles` risiedono in MelisCore / MelisSmallBusiness — **non** in MelisReactApi). |
| `config/react.capabilities.php` (`melisReactToolCapabilities`) | I "diritti avanzati" a grana fine (`list` / `create` / `edit` / `delete`, o un albero annidato `{ actions, tabs }`) che esistono per ciascun `melisKey` dello strumento. Il valore predefinito è **allow**; i divieti sono memorizzati in una sezione dedicata `<meliscore_tool_capabilities>` dell'XML dei diritti dell'utente/ruolo. |
| `melis_react_override.toolpage_extensions[]` | Nomi di servizio che implementano `PluginViewToolPageExtensionInterface` — le peculiarità per strumento di un modulo (aggiustamenti HTML/asset) per gli strumenti legacy mostrati nella shell React. I contributi si accumulano indipendentemente dall'ordine di caricamento. |

I moduli infrastrutturali stessi non dichiarano **nessuna** di queste chiavi: `MelisReactApi` è il
motore che *legge* le dichiarazioni di capability degli altri moduli, e `MelisReactOverride` non fornisce alcun
brick, alcun `react-api.php` e alcun `react.capabilities.php`.

## Dove cercare

| Argomento | Percorso |
| --- | --- |
| Elenco dei moduli | `config/melis.module.load.php` |
| DB di piattaforma | `config/autoload/platforms/<MELIS_PLATFORM>.php` |
| Servizio di configurazione | `vendor/melisplatform/melis-core/src/Service/MelisCoreConfigService.php` |
| Configurazione della cache | `vendor/melisplatform/melis-core/config/module.config.php` (`caches`) |
| Asset manager | `vendor/melisplatform/melis-asset-manager/` |
| Route dell'API React / resolver delle capability | `vendor/melisplatform/melis-react-api/` |
| Shell React + iframe degli strumenti legacy / route della SPA | `vendor/melisplatform/melis-react-override/` |
| Build della shell React (`index.html`, brick) | `vendor/melisplatform/melis-core/public/ui-react/` |
