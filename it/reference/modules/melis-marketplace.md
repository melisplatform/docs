# MelisMarketPlace

> Store di moduli nel back-office per scoprire, scaricare, aggiornare e rimuovere i moduli di Melis Platform,
> ora servito come catalogo nativo React. Pacchetto `melisplatform/melis-marketplace`.

## Scopo

MelisMarketPlace è lo store di moduli del back-office: elenca ogni pacchetto pubblicato sul server
Packagist di Melis, confronta ciascuna versione installata con l'ultima versione pubblicata e consente a un
amministratore di scaricare, aggiornare o rimuovere moduli — e di installare interi prodotti sito — senza uscire
dal back-office. Chiama `MelisComposerService` (melis-composerdeploy) per il lavoro effettivo di Composer
e legge/commuta lo stato dei moduli tramite `MelisAssetManagerModulesService` (melis-asset-manager).

Sei moduli fondamentali — **MelisCore, MelisEngine, MelisFront, MelisAssetManager,
MelisComposerDeploy, MelisDbDeploy** — sono elencati come eccezioni (esentati) e non vengono mai proposti per il
download, l'aggiornamento o la rimozione dallo store.

Nel back-office React v6 (`/melis-react`) lo strumento include un **brick full-React nativo**: l'elenco del
catalogo e il dettaglio per pacchetto sono scritti in React e leggono una `react-api` JSON di proprietà del
modulo. Il meccanismo di installazione / aggiornamento / rimozione (Composer, dbdeploy, plug/unplug) è invariato
e viene ancora eseguito lato server tramite il controller legacy.

## Attivazione

Aggiungi a `config/melis.module.load.php`:

```php
return [
    'MelisMarketPlace',
];
```

Richiede `melisplatform/melis-core: ^5.1` e PHP `^8.1|^8.3`. Il modulo registra un flag
`dbdeploy: true`, quindi qualsiasi delta di DB fornito viene applicato al primo caricamento. Il brick React appare
solo mentre `MelisMarketPlace` è presente in `config/melis.module.load.php`.

L'endpoint Packagist remoto è configurato in `config/app.interface.php` sotto
`melismarketplace_toolstree_section/datas/melis_packagist_server`
(predefinito `http://marketplace.melisplatform.com/melis-packagist`).

## Back-office React

**Dove.** Barra laterale sinistra → **Market Place** (icona carrello); si apre come scheda superiore denominata
*Market Place*. La `route` del manifest è `/melis-marketplace` e la `forwardKey`
`MelisMarketPlace/MelisMarketPlace` mappa ad essa il nodo di menu legacy.

**Catalogo (elenco).** Una griglia ricercabile di card di moduli (immagine di copertina, logo del gruppo, titolo, chip di
versione, numero di download e badge Installed / Update-available oppure un pulsante Download). Sopra la griglia
si trovano tre **card KPI** (Packages / Installed / Updates available), una casella di ricerca, un selettore di ordinamento
(Downloads / Date added / Name), un pulsante *Reset filters*, il **filtro per gruppo** (All groups · Core ·
Cms · Marketing · Commerce · Sites), un toggle **Bundles**, un pulsante di aggiornamento (↻) e il toggle **New / Old**.
La griglia carica altri elementi man mano che scorri (scroll infinito). Una barra laterale destra mostra "Want your module
listed?" e "Most downloaded packages".

![Catalogo React del Market Place: card KPI, ricerca, ordinamento, filtri per gruppo e la griglia di card dei moduli con una barra laterale "Most downloaded packages"](/screenshots/react/melis-marketplace/melismarketplace-tool-list.png)

**Vista prodotto (dettaglio).** Facendo clic su una card si apre un dettaglio full-React (senza ricaricamento della pagina): un banner hero
(logo del gruppo, titolo, badge di stato, pulsanti azione), una galleria di immagini (slider + lightbox a schermo
intero), la descrizione e un pannello *Additional information* (ultima versione, versione corrente se
installata, GitHub, Packagist, nome del pacchetto, download). Un pulsante **← back** riporta all'elenco,
che resta montato in modo da preservare ricerca / filtri / scroll. **Non ci sono sotto-schede host** — la
transizione elenco ⇄ dettaglio è uno stato interno, quindi un brick usa esattamente una scheda host.

![Vista prodotto React di un modulo: hero con badge di stato e pulsanti azione, una galleria di immagini, descrizione e il pannello Additional information](/screenshots/react/melis-marketplace/melismarketplace-tool-module-detail.png)

**Toggle New / Old.** L'elenco può passare dall'interfaccia React (*New*, predefinita) allo strumento classico
renderizzato in un iframe (*Old*, `/melis/react-tool-page?key=melis_market_place_tool_display`). Su
viewport strette il toggle diventa solo icona.

**I pulsanti azione** dipendono dallo stato del pacchetto e dalle capacità del chiamante:

| Pulsante | Mostrato quando | Effetto |
| --- | --- | --- |
| Download | modulo non installato | fetch Composer → dbdeploy → attivazione |
| Update | installato e `need_update` | stessa operazione Composer su una versione arretrata |
| Remove | installato, non esentato | disinstallazione (bloccata se altri moduli dipendono da esso) |
| Private | pacchetto privato/bloccato | pannello di contatto; deve essere acquistato |

Ogni azione apre una modale **Manage** con una console di avanzamento in tempo reale che trasmette l'output di
Composer / dbdeploy, quindi propone *Activate module* / *Reload*. Se il server Packagist è irraggiungibile
(`marketAccessible = false`), l'interfaccia React disabilita la navigazione ma mantiene attiva la shell.

## Brick React

Brick full-React nativo costruito con Vite (IIFE; React / ReactDOM / react-router-dom esternalizzati verso le
variabili globali dell'host). Sorgenti in `ui-react/src/`, compilati in `public/ui-react/brick.js` accanto a
`brick.manifest.json`.

| Campo del manifest | Valore |
| --- | --- |
| `id` | `marketplace` (deve corrispondere all'id registrato in `brick.tsx`) |
| `route` | `/melis-marketplace` |
| `label` | `Market Place` |
| `forwardKey` | `MelisMarketPlace/MelisMarketPlace` |
| `melisKey` | `melis_market_place_tool_display` |
| `entry` | `brick.js` |
| `persistent` | `true` |
| `subTabs` | *assente* — elenco ⇄ dettaglio è uno stato interno `openId` |

Poiché la sezione di menu Market Place è un nodo direttamente cliccabile / `is_parent_tool`, la
chiave portatrice dei diritti e la chiave di zona del manifest sono la **stessa** (`melis_market_place_tool_display`).
Il brick non può importare moduli host, quindi usa stili inline + variabili CSS del tema e un dizionario
`{fr,en}` in-file guidato dalla lingua dell'host (`melis-ui-lang` / `melis-ui-locale` in
`localStorage`). Le card e la galleria richiedono prima gli screenshot React con l'URL dell'immagine legacy in
`data-legacy`, con fallback in caso di errore.

File chiave (`ui-react/src/`): `brick.tsx` (registra `id: 'marketplace'`), `MarketPlacePage.tsx`
(elenco + dettaglio + modale manage), `ViewToggle.tsx` (toggle New/Old), `marketplace-api.ts` (client API
di sola lettura) e `shared/useCaps.ts` / `shared/useDebounce.ts` / `shared/useIsNarrow.ts`.

## API React

Le rotte di **sola lettura** del catalogo sono dichiarate in `config/module.config.php`, annidate sotto la
rotta `application-MelisMarketPlace` (base `/melis/MelisMarketPlace/react-api`) — **di proprietà del modulo**,
non sotto il nodo condiviso `melis-react-api`. Controller:
`MelisMarketPlace\Controller\MelisMarketPlaceReactApiController` (alias invocabile
`MelisMarketPlace\Controller\MelisMarketPlaceReactApi`). Contratto `{ success, data, error }`; ogni
fetch invia `X-Requested-With: XMLHttpRequest` e `credentials: 'include'`.

| Metodo e URL | Azione | Scopo |
| --- | --- | --- |
| `GET …/react-api/packages` | `packages` | Elenco (`page`, `limit`, `search`, `group`, `orderBy`, `order`, `bundle`) → `{items, page, pageCount, limit, marketAccessible}` |
| `GET …/react-api/packages/:id` | `get` | Dettaglio di un pacchetto (`images`, `currentVersion`, `isExempted`, versionStatus…) |
| `GET …/react-api/groups` | `groups` | Gruppi di pacchetti → `{groups, marketAccessible}` |
| `GET …/react-api/stats` | `stats` | KPI `{total, installed, needUpdate, marketAccessible}` |
| `GET …/react-api/status` | `status` | Stato di versione per modulo (`need_update` / `up_to_date` / `in_advance`) |

Ogni azione di lettura è protetta da `denyUnlessAccess()` — autenticazione (`MelisCoreAuth::hasIdentity`) **e**
`MelisCoreRights::canAccess('melis_market_place_tool_display')`, che restituisce **401 / 403** — così l'API
JSON non è una porta di servizio. Il controller riutilizza `MelisMarketPlaceService`
(`compareLocalVersionFromRepo`, priming dell'ultima versione) e `MelisAssetManagerModulesService`
(versioni installate / elenco moduli) e legge gli endpoint JSON di Packagist, esattamente come lo strumento
legacy.

> **Le azioni di modifica non hanno una rotta react-api.** Download / Update / Remove vengono eseguite nativamente dalla
> `ManageModal`, che riproduce l'orchestrazione JS legacy chiamando direttamente il controller **legacy** del
> modulo (`/melis/MelisMarketPlace/MelisMarketPlace/…`): `melisMarketPlaceProductDo`
> (console in streaming), `reDumpAutoload`, `execDbDeploy`, `plugModule` / `unplugModule`,
> `executeComposerScripts`, `getSetupModuleForm`, `activateModule`, `isPackageDirectoryRemovable`,
> `changePackageDirectoryPermission`, `getModuleTables`, `exportTables`, oltre a
> `/melis/MelisCore/Modules/getDependents` per il controllo delle dipendenze in fase di rimozione.

## Capacità

Dichiarate in `config/react.capabilities.php`, unite sotto `melisReactToolCapabilities` da
`MelisMarketPlace\Module::getConfig()`. Basate sulla stessa melisKey usata dal manifest e dalla
guardia di accesso (`melis_market_place_tool_display`), poiché la sezione è direttamente cliccabile:

```
melis_market_place_tool_display
└─ actions: list · download · remove
```

`list` = navigare la griglia; `download` = il fetch Composer che sia installa (Download) sia aggiorna
(Update); `remove` = disinstallazione. Si tratta di **gating solo React** (default-allow, dichiarativo): il
controller applica solo l'**accesso** (`denyUnlessAccess`), non chiama `denyUnlessCan`. In React
il brick le legge tramite `useCaps('melis_market_place_tool_display')` — `can('list')` regola la griglia,
`can('download')` i pulsanti Download / Update, `can('remove')` il pulsante Remove (nascosto anche per i
moduli esentati).

## Servizi chiave

| Alias servizio | Ruolo |
| --- | --- |
| `MelisMarketPlaceService` | Confronto delle versioni, plug/unplug e dispatch del form di post-setup per modulo. |
| `MelisMarketPlaceSiteService` | Genera un intero sito web da un pacchetto `melisplatform-site`. |

### `MelisMarketPlaceService`

Estende `MelisGeneralService`.

```php
$mp = $serviceManager->get('MelisMarketPlaceService');

// Compare installed vs latest — returns one of the constants below.
$status = $mp->compareLocalVersionFromRepo('MelisCmsSlider', 'v5.1.3');
// MelisMarketPlaceService::NEED_UPDATE  (-1)
// MelisMarketPlaceService::UP_TO_DATE   (1)
// MelisMarketPlaceService::IN_ADVANCE   (2)  — running a dev-… build

// Toggle a module on/off (rewrites the active-module loader via asset-manager).
$mp->plugModule('MelisCmsSlider');
$mp->unplugModule('MelisCmsSlider');
```

`compareLocalVersionFromRepo()` scatena la coppia di eventi
`melismarketplace_compare_local_version_from_repo_start` / `…_end`, così i listener possono sovrascrivere lo
stato calcolato.

**Convenzione di post-setup per modulo.** Un modulo può fornire un `MelisSetupPostDownloadController`
e/o un `MelisSetupPostUpdateController` nel proprio namespace `Controller\`, esponendo
`$showOnMarketplacePostSetup = true` e le azioni `getFormAction`, `validateFormAction`,
`submitAction`. MarketPlace inoltra ad essi per renderizzare ed elaborare il form di setup.

### `MelisMarketPlaceSiteService`

Estende `MelisGeneralService`. Genera un intero sito web da un pacchetto `melisplatform-site`:
crea le righe `melis_cms_site` / home / lingue, alloca nuovi intervalli di page-id, platform-id e template-id
e crea le tabelle CMS del modulo tramite `Support\MelisMarketPlaceCmsTables` /
`Support\MelisMarketPlaceSiteInstall`.

```php
$site = $serviceManager->get('MelisMarketPlaceSiteService');
$site->marketplaceInstallSite($request);   // reads POST: name, scheme, domain, module, action
```

Eccezioni tipizzate (in `src/Exception/`): `EmptySiteException`,
`PlatformIdMaxRangeReachedException`, `TemplateIdMaxRangeReachedException`,
`ArrayKeyNotFoundException`, `FileNotFoundException`.

## Strumento legacy (vista Old)

Lo strumento classico rimane disponibile dietro il toggle New/Old e possiede ancora il flusso di modifica.
`melisMarketPlaceProductDoAction()` è l'unico endpoint per le azioni del catalogo: scatena
`melis_marketplace_product_do_start`, effettua lo switch sull'azione
(`MelisComposerService::DOWNLOAD / UPDATE / REMOVE`), quindi scatena `melis_marketplace_product_do_finish`
per pilotare il feedback del flash-messenger. Prima della rimozione, percorre le dipendenze del modulo target, quelle
di tutti gli altri moduli attivi e il blocco `require` del `composer.json` alla radice del progetto, per impedire la
rimozione di una dipendenza condivisa.

Due controlli regolano l'usabilità dello store (entrambi in `MelisMarketPlaceController`):

- `isMarketplaceAccessible()` — se il server Packagist è raggiungibile e la funzionalità è attiva.
- `allowUpdate()` — legge `melis_core_platform.plf_update_marketplace` per la piattaforma corrente
  (variabile d'ambiente `MELIS_PLATFORM`); una piattaforma con `plf_update_marketplace = 0` può navigare ma non
  scaricare o aggiornare.

`MelisSetupController` gestisce la rotta autonoma `/MelisMarketPlace/setup` (setup per modulo
al di fuori dell'albero dell'interfaccia del back-office).

## Eventi

| Evento | Scatenato da | Scopo |
| --- | --- | --- |
| `melismarketplace_compare_local_version_from_repo_start` / `_end` | `compareLocalVersionFromRepo` | Intercetta o sovrascrivi il risultato dello stato di versione calcolato. |
| `melis_marketplace_product_do_start` | `melisMarketPlaceProductDo` | Prima di un'azione di download, aggiornamento o rimozione. |
| `melis_marketplace_product_do_finish` | `melisMarketPlaceProductDo` | Dopo l'azione — pilota il feedback del flash-messenger. |

## Tabelle del database

MelisMarketPlace non definisce tabelle proprie. Quando un modulo scaricato fornisce delta di database,
questi vengono applicati tramite `execDbDeployAction()` (melis-dbdeploy). Le installazioni di prodotti sito scrivono
nelle tabelle CMS esistenti della piattaforma (allocate tramite `MelisMarketPlaceSiteService`).

## File chiave

| Ambito | Percorso |
| --- | --- |
| Manifest del modulo | `vendor/melisplatform/melis-marketplace/composer.json` |
| Rotte / servizi / react-api / controller | `vendor/melisplatform/melis-marketplace/config/module.config.php` |
| Capacità React | `vendor/melisplatform/melis-marketplace/config/react.capabilities.php` |
| Albero degli strumenti, icona di intestazione, config Packagist | `vendor/melisplatform/melis-marketplace/config/app.interface.php` |
| Controller dell'API React | `vendor/melisplatform/melis-marketplace/src/Controller/MelisMarketPlaceReactApiController.php` |
| Controller principale (legacy) | `vendor/melisplatform/melis-marketplace/src/Controller/MelisMarketPlaceController.php` |
| Servizio di installazione/aggiornamento/plug | `vendor/melisplatform/melis-marketplace/src/Service/MelisMarketPlaceService.php` |
| Servizio di installazione sito | `vendor/melisplatform/melis-marketplace/src/Service/MelisMarketPlaceSiteService.php` |
| Sorgenti del brick React | `vendor/melisplatform/melis-marketplace/ui-react/src/` |
| Brick compilato + manifest | `vendor/melisplatform/melis-marketplace/public/ui-react/` |
| Eccezioni | `vendor/melisplatform/melis-marketplace/src/Exception/` |

Vedi anche: [melis-composerdeploy](/it/reference/modules/melis-composerdeploy) ·
[melis-asset-manager](/it/reference/modules/melis-asset-manager) ·
[melis-dbdeploy](/it/reference/modules/melis-dbdeploy) ·
[melis-core](/it/reference/modules/melis-core)
