# MelisAssetManager

> Serve le risorse pubbliche di ogni modulo (CSS, JS, immagini) tramite URL puliti, distribuisce il
> bundle React compilato del back-office ed è la sorgente canonica per l'individuazione dei moduli
> attivi. Pacchetto `melisplatform/melis-asset-manager`.

## Scopo

MelisAssetManager intercetta al momento del caricamento le richieste verso `/<ModuleName>/…` e
trasmette in streaming il file corrispondente dalla directory `public/` di quel modulo, senza alcuna
logica di controller nel percorso critico. Al primo avvio scrive una mappa modulo-percorso in
`config/melis.modules.path.php` (che richiede che la cartella `config/` sia scrivibile). Fornisce
inoltre i servizi a livello di piattaforma per interrogare quali moduli siano installati o attivi e
per compilare i CSS/JS di tutti i moduli in bundle di produzione legacy tramite webpack.

Fa parte della **base della piattaforma MelisCore** ed è richiesto praticamente da ogni altro
modulo.

## Ruolo nel back-office React

Il modulo **non ha alcuno strumento React né una UI propria** — non c'è brick, né
`config/react-api.php` né `config/react.capabilities.php`, e non compare mai come strumento in
`/melis-react`. La sua rilevanza per la v6 è puramente infrastrutturale: è il livello di
distribuzione HTTP che serve al browser il **bundle React SPA compilato**.

Il back-office React è un'applicazione single-page basata su Vite il cui output di build (JS, CSS,
font, icone, `index.html`) è versionato in `melis-core/public/ui-react/`. Le richieste per quei file
arrivano a URL che iniziano con **`/MelisCore/ui-react/`** — esattamente la `base` contro cui viene
compilata la build di Vite — e vengono servite dallo stesso resolver generico `/<Module>/…` →
`<module>/public/…` usato per le risorse di ogni modulo. La suddivisione è la seguente:

| Livello | Servito da | URL |
| --- | --- | --- |
| Shell HTML React | MelisReactOverride | `/melis-react` |
| Bundle JS/CSS React con hash | **MelisAssetManager** | `/MelisCore/ui-react/…` |

> Se questo modulo (o la sua cache scrivibile) va in errore, l'HTML della shell potrebbe comunque
> caricarsi, ma i JS/CSS con hash restituiscono un **404** o un **MIME type** errato, quindi il
> browser rifiuta di eseguire lo script — il sintomo classico è una **pagina `/melis-react` vuota**.
> La causa principale è di solito che la cartella `config/` (e il suo `melis.modules.path.php`
> generato) non è scrivibile dall'utente del web server (ad es. `www-data`). L'attivazione di un
> nuovo modulo forza una ricostruzione di quella cache; un errore di permessi in quel punto degrada
> la distribuzione delle risorse. Vedi [Abilitalo](#abilitalo).

## Abilitalo

Aggiungi a `config/melis.module.load.php`:

```php
return [
    'MelisAssetManager',
];
```

Dipendenza: `melisplatform/melis-core` (`^6.0`), PHP `^8.3 | ^8.5`. La cartella `config/` deve
essere scrivibile affinché il modulo possa persistere `melis.modules.path.php` all'avvio.

## Meccanismo di distribuzione

**Non esiste alcun controller** per il percorso comune delle risorse — la distribuzione è un resolver
attivato al momento del caricamento e collegato in `src/Module.php`:

- **`onBootstrap()`** chiama **`displayFile($sm)`** ad ogni richiesta.
- **`displayFile()`** risolve l'URI della richiesta in un file: prima tenta la cartella pubblica
  principale del progetto (`$_SERVER['DOCUMENT_ROOT'] . $uri`); altrimenti tratta il primo segmento
  dell'URI come nome di modulo, lo cerca nella mappa in cache e costruisce
  `<modulePath>/public/<rest-of-URI>`.
- **`sendDocument()`** imposta il `Content-Type` corretto (tramite `getMimeType()` +
  `config/mime.config.php`), aggiunge un header di cache di 24 ore per i file statici, stampa i byte
  e termina. Un controllo (`isRequestAuthenticated()`) richiede una sessione valida prima di eseguire
  l'`eval` di un file `.php` servito; le risorse statiche restano pubbliche.
- **`checkFileInFolder()`** impone che il percorso risolto rimanga all'interno della directory
  `public/` del modulo (protezione contro il path-traversal).

Una richiesta per `/MelisCore/ui-react/assets/index-<hash>.js` risolve quindi il modulo `MelisCore`
e trasmette in streaming `melis-core/public/ui-react/assets/index-<hash>.js` — senza alcun codice
specifico per React.

## Cache dei percorsi dei moduli

La mappa `<ModuleName> → path` usata da `displayFile()` è un file PHP generato in
`config/melis.modules.path.php`. Viene (ri)costruita dal listener di caricamento dei moduli in
`src/Module.php`:

- **`init()`** collega **`onLoadModulesPost()`** a `ModuleEvent::EVENT_LOAD_MODULES_POST`.
- **`onLoadModulesPost()`** scrive il file quando manca o quando un modulo appena attivato non è
  ancora presente al suo interno, usando `MelisModulesService` per calcolare il percorso di ogni
  modulo, e infine ne imposta i permessi con `chmod` a `0777`.

Per il resto il modulo è **stateless** — questo file generato è il suo unico stato persistente.

## Servizi principali

Registrati in `config/module.config.php` sotto `service_manager`.

| Alias del servizio | Ruolo |
| --- | --- |
| `ModulesService` | Individua e interroga i moduli installati/attivi (`MelisModulesService`). |
| `MelisWebPackService` | Costruisce i bundle webpack legacy e risolve gli elenchi delle risorse dei moduli. |
| `MelisConfig` | Unisce e legge l'albero di configurazione dell'app della piattaforma (`MelisConfigService`). |

### `MelisModulesService`

Il servizio canonico "quali moduli esistono / sono attivi". Usato dallo strumento Modules, dal
marketplace, dal caricamento dei moduli dei siti e dall'installer.

```php
$modules = $sm->get('ModulesService'); // MelisAssetManager\Service\MelisModulesService

$active   = $modules->getMelisActiveModules();        // modules currently enabled
$all      = $modules->getAllModules();                // every discoverable module
$vendor   = $modules->getVendorModules();             // modules under vendor/
$versions = $modules->getModulesAndVersions();        // module => version
$deps     = $modules->getChildDependencies($moduleName);
$sites    = $modules->getSitesModules();              // template/site modules
```

Elenco completo dei metodi: `getMelisActiveModules`, `getModulesAndVersions`,
`getComposer`/`setComposer`, `getUserModules`, `getSitesModules`, `getMelisModules`,
`getAllModules`, `getVendorModules`, `getChildDependencies`.

### `MelisWebPackService`

```php
$webpack = $sm->get('MelisWebPackService');

$assets  = $webpack->getAssets($moduleName);           // a module's declared assets
$merged  = $webpack->getMergedAssets();                // platform-wide merged set
$webpack->buildWebPack();                               // compile bundles
$file    = $webpack->getWebPackMixStaticFile($asset);  // resolve a hashed/mixed asset
```

Elenco completo dei metodi: `getAssets`, `getWebPackMixStaticFile`, `getMergedAssets`,
`buildWebPack`, `setCachedFile`, `getCachedFiles`.

La chiave di configurazione `ressources.build` per singolo modulo (nell'`app.interface.php` di un
modulo) dichiara il `bundle.css` / `bundle.js` che questo servizio produce e serve. Il
`WebPackController` (rotte `melis-backoffice/build-webpack` e `melis-backoffice/view-assets`) lo
gestisce.

> Questa pipeline webpack costruisce soltanto il bundle **legacy** del back-office — non ha nulla a
> che fare con la build React. La SPA React viene compilata da **Vite** all'interno di
> `melis-core/ui-react/` (`npm run build`) e versionata in `melis-core/public/ui-react/`;
> MelisAssetManager si limita a *servire* quei file già compilati, non li compila.

### `MelisConfigService`

Un helper per l'unione della configurazione e la traduzione, per le esigenze specifiche
dell'asset-manager. Metodi principali: `getItem`, `getMelisKeys`, `getFormMergedAndOrdered`,
`translateAppConfig`.

## URL delle risorse

Le risorse di qualsiasi modulo sono raggiungibili a:

```
/<ModuleName>/css/<file>.css
/<ModuleName>/js/<file>.js
/<ModuleName>/images/<file>.jpg
/MelisCore/ui-react/assets/<file>          # the committed React bundle
```

Questi si mappano sulla cartella `public/` di ciascun modulo. Il fallback è la cartella `public/`
principale del progetto.

## Tabelle del database

Nessuna. Il modulo è stateless — il suo unico stato persistente è il file generato
`config/melis.modules.path.php`.

## File principali

| Ambito | Percorso |
| --- | --- |
| Alias dei servizi e collegamento per la distribuzione delle risorse | `vendor/melisplatform/melis-asset-manager/config/module.config.php` |
| Mappa estensione → MIME per `sendDocument()` | `vendor/melisplatform/melis-asset-manager/config/mime.config.php` |
| Distribuzione delle risorse + cache dei percorsi dei moduli | `vendor/melisplatform/melis-asset-manager/src/Module.php` |
| Servizio di individuazione dei moduli | `vendor/melisplatform/melis-asset-manager/src/Service/MelisModulesService.php` |
| Servizio webpack/bundle (legacy) | `vendor/melisplatform/melis-asset-manager/src/Service/MelisWebPackService.php` |
| Lettore dell'app-config | `vendor/melisplatform/melis-asset-manager/src/Service/MelisConfigService.php` |
| Controller delle risorse/webpack | `vendor/melisplatform/melis-asset-manager/src/Controller/` |
| Mappa dei percorsi dei moduli (generata) | `config/melis.modules.path.php` |
| Build React versionata (servita, non compilata qui) | `vendor/melisplatform/melis-core/public/ui-react/` |

Vedi anche: [MelisCore](/it/reference/modules/melis-core) · [MelisReactApi](/it/reference/modules/melis-react-api) · [MelisDbDeploy](/it/reference/modules/melis-dbdeploy) · [MelisComposerDeploy](/it/reference/modules/melis-composerdeploy) · [MelisInstaller](/it/reference/modules/melis-installer) · [Riferimento dei moduli](/it/reference/modules)
