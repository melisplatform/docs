# MelisReactOverride

> Infrastruttura back-office React: esegue il rendering degli strumenti legacy all'interno della shell `/melis-react` e serve la SPA React. Pacchetto `melisplatform/melis-react-override`.

## Scopo

MelisReactOverride è un **modulo di infrastruttura back-office React** — non uno strumento. Non fornisce alcun
brick, alcuna pagina React, alcun endpoint `react-api` né una schermata propria. Fornisce i due
meccanismi di supporto che permettono al back-office React (`/melis-react`) di funzionare accanto al legacy
`/melis`:

1. **Meccanismo iframe per gli strumenti legacy** — qualsiasi strumento legacy jQuery/AJAX privo di una pagina React
   dedicata viene reso come pagina HTML autonoma (`/melis/react-tool-page?key=<melisKey>`) e mostrato
   all'interno della shell React in un `<iframe>`. Lo strumento all'interno del frame appare e si comporta esattamente
   come nell'accesso diretto a `/melis` — con le proprie DataTables, form, modali, schede, pulsanti di salvataggio e
   notifiche native (toast gritter, modali di validazione per campo).
2. **Rotta di fallback SPA** — serve la shell React `index.html` per `/melis-react` e per ogni
   deep link lato client sotto di essa, e rende pubblica quella rotta (più alcuni endpoint di boot in sola lettura).

Non si naviga mai *verso* questo modulo. Regola pratica: se ti trovi dentro `/melis-react` e stai guardando una
schermata di uno strumento in vecchio stile (Bootstrap classico), stai guardando una pagina prodotta da
MelisReactOverride.

## Abilitazione

È un modulo Laminas MVC puramente lato server caricato tramite `application.config.php` (`module_paths` +
`modules`) — `src/Module.php` esegue l'autoload di `MelisReactOverride\*` da `src/` tramite
`StandardAutoloader`. Categoria `core`.

**Esegue l'override del controller `PluginView` di MelisCore** con una versione compatibile con React tramite un
alias `controllers.invokables`. Poiché questo modulo viene caricato *dopo* melis-core, l'alias prevale nel
merge della configurazione Laminas:

```php
'controllers' => [
    'invokables' => [
        'MelisCore\Controller\PluginView'   => \MelisReactOverride\Controller\PluginViewController::class,
        'MelisReactOverride\Controller\Spa' => \MelisReactOverride\Controller\SpaController::class,
    ],
],
```

## In sintesi

| Proprietà | Valore |
| --- | --- |
| Nome del modulo | `MelisReactOverride` |
| Pacchetto | `melisplatform/melis-react-override` |
| Categoria | `core` |
| Brick / `ui-react/` / `react-api.php` | **nessuno** (solo infrastruttura) |
| Controller | `PluginViewController` (aliasato su `MelisCore\Controller\PluginView`), `SpaController` |
| Servizi | `PlatformAssetsService`, `LegacyWidgetCssService` |
| Punto di estensione | `PluginViewToolPageExtensionInterface` (hook `toolpage_extensions`) |

## Rotte

Tutte le rotte tool/iframe sono rotte figlie di `melis-backoffice`, quindi risiedono sotto `/melis`. La
rotta SPA è una rotta regex di primo livello.

| Nome della rotta | URL | Action | Scopo |
| --- | --- | --- | --- |
| `melis-backoffice/react-tool-page` | `/melis/react-tool-page` | `toolPage` | **Meccanismo principale.** Esegue il rendering di una zona di uno strumento legacy come pagina HTML autonoma per un iframe. Accetta `?key=<melisKey>` (e `?idPage=<id>` per l'editor di pagine CMS). |
| `melis-backoffice/react-dashboard-plugin` | `/melis/react-dashboard-plugin` | `dashboardPluginPage` | Un singolo plugin di dashboard legacy come pagina autonoma minimale. |
| `melis-backoffice/react-dashboard-plugin-config` | `/melis/react-dashboard-plugin-config` | `dashboardPluginConfigPage` | Il form di configurazione di un plugin di dashboard (pulsante ingranaggio) come HTML autonomo. |
| `melis-backoffice/react-dashboard-plugin-config-data` | `/melis/react-dashboard-plugin-config-data` | `dashboardPluginConfigData` | JSON: il form di configurazione come dati (schede + campi tipizzati + valori) affinché React lo renderizzi in modo nativo. |
| `melis-backoffice/react-dashboard-plugin-config-save` | `/melis/react-dashboard-plugin-config-save` | `dashboardPluginConfigSave` | POST: valida + persiste la configurazione di un plugin di dashboard. |
| `melis-backoffice/react-dashboard-plugin-content` | `/melis/react-dashboard-plugin-content` | `dashboardPluginContent` | JSON: HTML + script + jsCallbacks per l'iniezione diretta nel DOM (nessun iframe). |
| `melis-backoffice/react-platform-bundle` | `/melis/react-platform-bundle` | `platformBundle` | Serve il bundle di asset concatenato con il MIME type corretto (sostituisce `/melis/get-{css,js}-bundles` di MelisCore, che rispondono con un `text/html` vuoto quando il bundle è mancante). |
| `melis-backoffice/react-legacy-widget-css` | `/melis/react-legacy-widget-css` | `legacyWidgetCss` | Fogli di stile del back-office legacy, con ogni regola limitata all'ambito `.melis-legacy-widget`. |
| `meliscore-melis-react-spa` | `/melis-react`, `/melis-react/*` | `spa` | **Fallback SPA.** Serve la shell React `index.html`. Rotta regex, `priority => 1000`. |

### Rotte pubbliche (`excluded_routes`)

Il modulo aggiunge a `plugins.meliscore.datas.excluded_routes` di MelisCore (gli array numerici si uniscono
per accodamento) affinché `MelisCore\Module::checkIdentity()` le lasci passare senza reindirizzare a
`/melis/login`:

- `meliscore-melis-react-spa` — la shell è pubblica perché l'app React gestisce la propria
  autenticazione (schermata di login propria).
- `melis-backoffice/react-platform-bundle` — così una sessione scaduta non reindirizza un foglio di stile
  a una pagina di login HTML (esattamente l'errore di MIME che questa rotta corregge).
- `melis-backoffice/melis-react-api/platformscheme-react-get` — branding del pannello di login, letto prima
  dell'autenticazione (solo GET).
- `melis-backoffice/melis-react-api/langs` — l'elenco delle lingue del back-office che la SPA carica al boot,
  anche nella schermata di login (sola lettura).

> Le ultime due sono rotte `melis-react-api` (di proprietà di **MelisReactApi**); MelisReactOverride si limita
> a renderle pubbliche, non le definisce.

## Il meccanismo iframe — `toolPageAction()` → `buildToolPage()`

`PluginViewController::toolPageAction()` risolve una melisKey, ne esegue il rendering della zona e passa l'HTML
a `buildToolPage()` per assemblare un documento autonomo. Flusso:

1. **Guardia di autenticazione** — `denyIfUnauthenticated()` viene eseguito per primo (questa pagina *non* è pubblica).
2. **Risoluzione melisKey → percorso appConfig** — `MelisCoreConfig->getMelisKeys()` mappa `?key=` a un
   percorso di app-config; l'ultimo segmento è la chiave della vista.
3. **Forza la modalità XHR** — aggiunge `X-Requested-With: XMLHttpRequest` in modo che `generateRec()` renderizzi le zone
   con `follow_regular_rendering:false` nello stesso modo del percorso AJAX classico (altrimenti quegli
   strumenti finiscono sul front e renderizzano un "404 MelisDemoCms").
4. **Blocca l'id della sessione PHP** — snapshot prima del rendering, ripristino dopo (alcuni strumenti legacy ruotano
   l'id di sessione durante il rendering — innocuo in `/melis`, fatale qui).
5. **Renderizza la zona** con `generateRec()` + `renderViewRec()`, catturando qualsiasi output spurio che una
   zona invia con `echo` allo stream (tenuto fuori dal markup come commento HTML per la diagnosi).
6. **Esegui le estensioni `adjustToolHtml()`** (`toolpage_extensions`) sull'HTML renderizzato.
7. **Costruisci gli asset di piattaforma** tramite `PlatformAssetsService::build()` e inietta i `ressources`
   JS/CSS del modulo stesso.
8. **Esegui le estensioni `adjustToolAssets()`** (possono spostare alcuni JS del modulo nel bucket `<head>` e
   restituire `skipJsRoots` affinché il ciclo generico non li carichi due volte).
9. **Assembla** `buildToolPage($html, $jsCallBacks, $assets, $zoneId, $key)` e restituisci come
   `text/html` con `X-Frame-Options: SAMEORIGIN`.

### Insidie che `buildToolPage()` risolve

- **Neutralizzare la guardia "Remove Envato Frame" di bundle.js** — all'interno di un iframe sandbox la guardia
  lancia un `SecurityError` che blocca bundle.js. La pagina cattura il vero parent
  (`window.__melisRealParent`) e poi ridefinisce `window.parent`/`window.top` in modo che restituiscano `window`.
- **Caricare `melisDataTable.js` separatamente** — dichiarato in `app.interface.php` ma assente da
  `bundle.js`; aggiunto alla coda JS (espone `window.melisDataTable`).
- **Shim globale `Proxy`** — per gli oggetti definiti solo all'interno del `$(function(){…})` di bundle.js e non
  ancora disponibili quando gli script sincroni del corpo di uno strumento vengono analizzati, un `Proxy` no-op evita
  errori prematuri.
- **Avvolgere i jsCallbacks in try/catch** — un callback la cui dipendenza non è caricata in modalità autonoma non
  bloccherà la pagina.
- **Iniettare i `ressources` JS/CSS del modulo** — il `bundle.js` core contiene solo gli strumenti di MelisCore;
  gli strumenti dei moduli forniscono i propri file (ad es. `news.tool.js` → `window.initNewsList`). Il
  controller raccoglie ogni root di cui lo strumento ha bisogno — la propria root di plugin, le root raggiunte tramite link
  `type` (attraversate ricorsivamente, con protezione dai cicli) e i nodi di modulo `forward`, più alcune root aggiuntive per
  editor compositi noti (ad es. `meliscms_page`), tutte condizionate in modo che i moduli inattivi non carichino nulla.
- **Ordinamento JS head vs fine-body** — i JS di piattaforma vengono caricati nel `<head>`; i `ressources` del modulo vengono
  caricati all'interno del `<body>` dopo la barra delle schede ma prima dell'HTML dello strumento, replicando il BO classico.
- **Shell delle schede dell'editor** — include le ancore di schede classiche (`#melis-id-nav-bar-tabs` nascosta,
  `#melis-id-body-content-load`, `activeTabId` globale) affinché i flussi di modifica classici funzionino.
- **`<base href="/">`** così gli URL AJAX relativi degli strumenti si risolvono a partire dalla root del sito.
- **Punto di montaggio della modale `#melis-modals-container`** più un watcher di auto-riparazione per i backdrop spuri.
- **Correzione dell'export** — riassegna `melisCoreTool.exportData()` a un click su un'ancora interna al frame (il popup
  legacy `window.open` non porta mai a termine il download in un iframe sandbox).
- **Bridge delle schede dello strumento & postMessage del risultato dello strumento** — la barra delle schede nascosta viene rispecchiata verso l'host tramite
  `postMessage({ __melisToolTabs, … })`; un messaggio `{ __melisToolResult, url, data }` viene inviato
  dopo un salvataggio JSON affinché l'host possa reagire strutturalmente. Nessuna notifica visibile viene trasmessa — gli strumenti legacy
  mantengono il proprio feedback nativo.

## Asset di piattaforma — `PlatformAssetsService`

`PlatformAssetsService::build($sm)` restituisce `['css' => …, 'js' => …, 'inline' => …]`, l'elenco degli
asset di piattaforma con cui ogni iframe di strumento esegue il bootstrap:

- **CSS** — tutti i file `bundle.css` dei moduli (caricati in parallelo), preceduti da Google Fonts e
  `/assets/css/schemes.css`, filtrati ai file presenti su disco.
- **Coda JS** (l'ordine è importante) — `get-translations?locale=…`, `MelisCore/build/js/bundle.js`, poi
  gli extra non inclusi nel bundle: `melisDataTable.js`, `loader.js`, `findpage.tool.js`,
  `bootstrap-tagsinput.js`, `typeahead.bundle.js`, `moment/fr.js`, `melis_tinymce.js`.
- **Globali inline** — `basePath`, `primaryColor`, … letti dallo schema di piattaforma attivo
  (`MelisCorePlatformSchemeService`), con i colori predefiniti di Melis come fallback.
- **Caching / auto-riparazione del bundle** — la costosa chiamata `MelisAssetManagerWebPack->getAssets(true)`
  è memorizzata in cache (file temporaneo, TTL di 600s + memoizzazione in-process); se `etc/bundles/` è stato cancellato dallo
  strumento Modules, viene rigenerato sotto un lock a scrittore singolo, oppure la rotta concatenata viene sostituita
  con `/melis/react-platform-bundle`.
- **`bust($url)`** aggiunge `?v=<mtime>` agli URL degli asset locali.

`LegacyWidgetCssService` supporta la rotta `react-legacy-widget-css` — CSS del BO legacy limitato all'ambito
`.melis-legacy-widget` in modo che non possa propagarsi alla shell React (usato dai widget legacy non-iframe
iniettati direttamente nel DOM React, ad es. il contenuto dei plugin di dashboard).

## Fallback SPA — `SpaController`

`SpaController::spaAction()` serve la shell React per `/melis-react` e per ogni deep link
lato client:

- Risolve `index.html` tramite `$_SERVER['DOCUMENT_ROOT']`, leggendo
  `…/vendor/melisplatform/melis-core/public/ui-react/index.html` (la build React risiede nella
  `public/` di melis-core, servita in `/MelisCore/ui-react/`). Funziona indipendentemente da dove risiede questo
  modulo su disco.
- Restituisce `404` se la shell è mancante; altrimenti restituisce il file come
  `text/html; charset=utf-8` con `Cache-Control: no-cache, no-store, must-revalidate` (la shell
  non viene mai memorizzata in cache; gli asset referenziati hanno un content-hash).
- I file reali (`index.html` root, asset con hash) vengono trasmessi in streaming prima da MelisAssetManager al
  bootstrap, quindi solo le rotte lato client virtuali (ad es. `/melis-react/news/5`) arrivano qui.

La rotta regex `meliscore-melis-react-spa` (`priority => 1000`) prevale sulla rotta front catch-all di MelisFront.
La sua regex `'/melis-react(?<spa>/[a-zA-Z0-9_\-/~.]*)?'` include `~` (separatore di id composito) e `.` così
quei deep link si risolvono nella SPA in caso di ricaricamento completo della pagina.

## Punto di estensione — l'hook `toolpage_extensions`

Le particolarità specifiche di uno strumento risiedono nel modulo **proprietario**, non codificate qui. Un modulo registra un
nome di servizio sotto `config('melis_react_override')['toolpage_extensions'][]` e implementa
`MelisReactOverride\Controller\PluginViewToolPageExtensionInterface`:

```php
interface PluginViewToolPageExtensionInterface
{
    // Adjust the rendered zone HTML for a melisKey before assembly (return $html unchanged
    // for keys the extension doesn't care about).
    public function adjustToolHtml(string $key, string $html, array $jsCallBacks, PluginViewController $controller): string;

    // Adjust the platform asset bundle. Return ['assets' => array, 'skipJsRoots' => array<string, true>];
    // 'skipJsRoots' lists roots the extension already injected so the generic loop must NOT re-add them.
    public function adjustToolAssets(string $key, string $html, array $assets, PluginViewController $controller): array;
}
```

`PluginViewController::toolPageExtensions()` risolve i nomi registrati, **salta silenziosamente** i
nomi che non sono servizi registrati o che non implementano l'interfaccia (così un'estensione è del tutto
opzionale — modulo non installato → no-op), memorizza in cache l'elenco e chiama `adjustToolHtml()` (passo 6)
e `adjustToolAssets()` (passo 8) per ciascuno.

> **Perché un array di configurazione e non un override di controller:** i contributi di moduli diversi si
> accumulano semplicemente indipendentemente dall'ordine di caricamento (a differenza di un alias di controller, dove prevale solo
> il modulo unito per ultimo).

**Esempio di consumatore.** MelisAICommunityExtensions registra
`MelisAICommunityExtensions\Controller\React\PluginViewToolPageExtension` sotto
`melis_react_override.toolpage_extensions` per iniettare il proprio `tool.js` / `style.css` nelle pagine degli strumenti
legacy servite nella vista React "Old".

## File chiave

| Ambito | Percorso |
| --- | --- |
| Rotte, override del controller, `excluded_routes` | `config/module.config.php` |
| Bootstrap del modulo + autoloader | `src/Module.php` |
| Meccanismo iframe, action di dashboard, estensioni | `src/Controller/PluginViewController.php` |
| Serving della shell SPA | `src/Controller/SpaController.php` |
| Contratto `toolpage_extensions` | `src/Controller/PluginViewToolPageExtensionInterface.php` |
| Build degli asset di piattaforma + cache del bundle | `src/Service/PlatformAssetsService.php` |
| CSS del BO legacy con ambito limitato | `src/Service/LegacyWidgetCssService.php` |

Vedi anche: [melis-core](/legacy/reference/modules/melis-core)

> **Nessuna UI, nessuno screenshot.** MelisReactOverride è infrastruttura senza un'interfaccia propria —
> ciò che appare a schermo è lo *strumento legacy* di cui esegue il rendering o la *shell React* che serve, entrambi
> documentati nei rispettivi moduli.
