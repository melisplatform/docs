# Approfondimento sull'architettura

Questa pagina traccia una richiesta **dall'inizio alla fine** e nomina le classi, gli eventi e i servizi reali
coinvolti. Completa i [Concetti](./concepts): leggi prima quello per il vocabolario, leggi questo per
comprendere i *meccanismi*. È anche la pagina da leggere se tu (o un assistente AI) hai bisogno di un modello
mentale completo di come funziona Melis.

Melis **v6** mantiene lo stesso framework, gli stessi moduli e lo stesso ciclo di vita delle richieste della v5 — ciò che è cambiato è la
**UI del back-office**. I classici strumenti renderizzati lato server su `/melis` sono ancora presenti, ma l'esperienza
predefinita è ora una **single-page app React su `/melis-react`** che carica strumenti React nativi
("bricks") e ripiega sui classici strumenti all'interno di un iframe. Le sezioni seguenti mantengono tutti i
meccanismi invariati e aggiungono lo shell React dove appropriato.

## Bootstrap

`public/index.php` carica l'autoloader di Composer, unisce
`config/application.config.php` con `config/development.config.php` (quando presente), quindi esegue
l'applicazione Laminas MVC.

`config/application.config.php` costruisce dinamicamente l'elenco dei moduli:

```php
'modules' => array_merge(
    MelisCore\MelisModuleManager::getModuleComponents(), // framework components first
    MelisCore\MelisModuleManager::getModules()           // then Melis modules
),
'module_listener_options' => [
    'module_paths'      => ['./module', './module/MelisSites'],
    'config_glob_paths' => [
        realpath(__DIR__) . '/autoload/{{,*.}global,{,*.}local}.php',
        realpath(__DIR__) . '/autoload/platforms/' . getenv('MELIS_PLATFORM') . '.php',
    ],
],
```

`MelisCore\MelisModuleManager` (`vendor/melisplatform/melis-core/src/MelisModuleManager.php`)
assembla tre tipi di moduli a seconda della richiesta:

- **Components** — dipendenze del framework, dichiarate per modulo in `config/module.load.php`.
- **Modules** — i moduli del back-office da `config/melis.module.load.php`.
- **Site modules** — per un URL di front-office, il sito selezionato da `MELIS_MODULE`
  (da `module/MelisSites/<name>` o da un sito vendor come `MelisDemoCms`).

Il back-office React aggiunge a questo elenco due **moduli di infrastruttura** —
[`melis-react-api`](/it/reference/modules/melis-react-api) (la struttura portante dell'API JSON) e
[`melis-react-override`](/it/reference/modules/melis-react-override) (la rotta SPA + il meccanismo iframe
per gli strumenti legacy). Entrambi vengono caricati tramite i `module_paths` di `application.config.php` (non vengono
autocaricati da Composer) e si registrano tramite `StandardAutoloader`.

Infine il file della piattaforma `config/autoload/platforms/<MELIS_PLATFORM>.php` inietta la **connessione al
database** e le impostazioni della piattaforma nella configurazione unita.

## Ciclo di vita della richiesta del back-office

Ora ci sono **due modi di accesso** al back-office, entrambi gestiti dal routing e dal controllo dell'identità
di MelisCore:

- **`/melis-react…`** — lo shell React (la UI predefinita). Una rotta regex serve un singolo documento
  HTML; tutto il resto è JSON recuperato tramite `/melis/react-api/…` e strumenti renderizzati come bricks
  o iframe (vedi sotto).
- **`/melis…`** — il classico back-office renderizzato lato server, ancora pienamente funzionante e usato come
  destinazione iframe per gli strumenti legacy.

Per un URL **`/melis…`**, MelisCore gestisce il flusso classico. Gli hook chiave sono collegati in
`MelisCore\Module::onBootstrap()`:

1. **Routing** — la rotta `melis-backoffice` (e le sue figlie: `login`, `authenticate`,
   `logout`, `zoneview`, `react-tool-page`, …) corrisponde.
2. **`MvcEvent::EVENT_ROUTE` → controllo dell'identità** — viene eseguito `Module::checkIdentity()`. Se la rotta
   corrispondente non è nell'elenco escluso (`login`, `authenticate`, `change-language`, la SPA React e
   i suoi endpoint di avvio…) e l'utente non è autenticato, **reindirizza a `/melis/login`** (o
   restituisce 404 per richieste non-GET).
3. **Sessione e lingua** — il contenitore di sessione `meliscore` viene inizializzato; il locale
   (`melis-lang-locale`) guida `Module::createTranslations()` che carica
   `language/<locale>.{interface,forms,…}.php`.
4. **`EVENT_DISPATCH`** — il layout è impostato su `layout/layoutCore` e vengono eseguiti i listener core:
   `MelisCoreCheckUserRightsListener` (rilegge periodicamente i diritti), `MelisCoreFlashMessengerListener`,
   `MelisCorePhpWarningListener` e altri.
5. **Rendering delle zone** — la UI del back-office è un albero di **zone**; `PluginViewController` risolve
   il `forward` di ciascuna zona (modulo/controller/action) e la renderizza, assemblando l'HTML finale
   (vedi [Concetti → zone e forward](./concepts#_3-zones-forwards-how-the-backoffice-renders)).

```
GET /melis
  → route: melis-backoffice
  → EVENT_ROUTE: checkIdentity() → redirect to /melis/login if not logged in
  → EVENT_DISPATCH: layout = layout/layoutCore; rights/flash/warning listeners
  → PluginViewController renders zones (header, left menu, center, footer) via forwards
  → response
```

## Ciclo di vita del back-office React

Per un URL **`/melis-react…`**, il flusso è suddiviso tra un caricamento dello shell eseguito una sola volta e le successive
chiamate JSON:

1. **Rotta SPA** — `MelisReactOverride\Controller\SpaController` serve lo shell React
   `index.html` (compilato in `melis-core/public/ui-react/`) per `/melis-react` e ogni deep link
   sottostante (`/melis-react/news/5`, …). La rotta è **pubblica** — l'app React esegue la propria
   **schermata di login** — e prevale sul catch-all di MelisFront tramite una rotta regex ad alta priorità.
2. **Fetch di avvio** — lo shell chiama gli endpoint generici di
   [`melis-react-api`](/it/reference/modules/melis-react-api):
   `GET /me` (utente corrente + capacità), `GET /menu` (l'albero di navigazione filtrato per diritti),
   `GET /langs` (lingue del back-office), `GET /assets` (CSS/JS per gli iframe degli strumenti) e
   `GET /react-modules` + `/bricks-bundle.js` (discovery dei brick). Ogni risposta rispetta il
   contratto `{ success, data, error? }`.
3. **Rendering degli strumenti** — cliccare su una voce di menu apre un **brick** (uno strumento React nativo) se il suo modulo
   ne fornisce uno, altrimenti uno **strumento legacy in un iframe** servito da
   `/melis/react-tool-page?key=<melisKey>` (vedi [Bricks e il meccanismo iframe](#bricks-the-iframe-mechanism)).
4. **Overlay dell'assistente AI** — un pulsante di chat flottante renderizzato una sola volta alla radice dello shell (da
   [`melis-ai`](/it/reference/modules/melis-ai)) sopravvive alla navigazione e può guidare il back-office
   (aprire uno strumento, aprire una pagina) a partire dalla conversazione. Vedi la [guida AI](./ai).

```
GET /melis-react
  → SpaController serves ui-react/index.html (public route)
  → shell boot: GET /me, /menu, /langs, /assets, /react-modules (+ /bricks-bundle.js)
  → click a tool → React brick, or iframe → /melis/react-tool-page?key=<melisKey>
  → AI Assistant overlay mounted at the shell root
```

## Bricks e il meccanismo iframe

Lo shell React è **modulare**: uno strumento appare **se e solo se** il suo modulo è attivo.

- **Discovery dei brick** — `GET /melis/react-api/react-modules` esamina i moduli attivi alla ricerca di
  `public/ui-react/brick.manifest.json` e restituisce i loro `BrickDef` (`{ id, module, route, label,
  forwardKey, melisKey, subTabs, … }`) più un unico `/bricks-bundle.js` concatenato. Ogni brick è
  una IIFE che si auto-registra su `window.__MELIS_BRICK_COMPONENTS__`; la firma `?v=<sig>` rende
  il bundle memorizzabile in cache in modo sicuro per un anno.
- **Toggle New / Old** — la maggior parte dei brick porta un toggle **New (React) / Old (iframe)**. *New* è la
  schermata React nativa; *Old* carica lo strumento classico tramite il meccanismo iframe descritto sotto, così nulla
  viene mai perso durante la migrazione.
- **Iframe legacy** — il metodo `PluginViewController::toolPageAction()` di
  [`melis-react-override`](/it/reference/modules/melis-react-override) renderizza esattamente una zona (risolta da `?key=<melisKey>`)
  come **pagina HTML autonoma** e la restituisce con `X-Frame-Options: SAMEORIGIN`. Forza
  `X-Requested-With: XMLHttpRequest` in modo che le zone `follow_regular_rendering:false` vengano renderizzate in modalità AJAX,
  fissa l'id di sessione PHP durante il rendering, inietta il JS/CSS `ressources` del modulo dello strumento
  (il `bundle.js` core trasporta solo gli strumenti di MelisCore) e aggira una lunga lista di stranezze
  legacy affinché lo strumento all'interno del frame appaia e si comporti esattamente come un accesso diretto a `/melis`
  (i suoi DataTables, le sue modali, i toast gritter e la validazione per campo).

Lo shell serve gli asset della piattaforma a questi iframe tramite
`MelisReactOverride\Service\PlatformAssetsService::build()` — gli stessi CSS/JS che il classico
`layoutCore.phtml` carica — così uno strumento legacy si avvia in modo identico all'interno dello shell React.

## Autenticazione e diritti

Il **login** è gestito da `MelisCoreAuth` (`MelisCoreAuthService`), un servizio di autenticazione Laminas
sulla tabella `melis_core_user` (`usr_login` / `usr_password`, bcrypt tramite
`password_hash`). L'identità autenticata — inclusi i `usr_rights` dell'utente — è memorizzata nella
sessione. Lo shell React gestisce la **stessa** autenticazione (renderizza la propria schermata di login ma invia i dati allo
stesso servizio); `GET /me` restituisce l'identità una volta autenticata, mentre `GET /langs` e la lettura del
branding del pannello di login sono gli unici endpoint pubblici prima del login.

I **diritti** regolano l'accesso al back-office. `MelisCoreRights` (`MelisCoreRightsService`) legge i
`usr_rights` dell'utente — una **allow-list XML** — per decidere cosa è visibile e disponibile:

- Le **sezioni del menu a sinistra** che un utente vede sono i nodi `*_toolstree_section` elencati nei suoi
  diritti (`isAccessible()`); un **XML dei diritti vuoto significa accesso completo**. Nello shell React lo stesso
  filtraggio avviene lato server in `GET /menu`, che emette solo i nodi a cui l'utente può accedere (`canAccess`).
- Uno strumento per cui l'utente non dispone dei diritti produce *"You don't have access to this tool"*.
- I diritti risiedono in `melis_core_user.usr_rights`; per gli utenti basati su ruolo possono provenire dal ruolo
  (`melis_core_user_role`). `MelisCoreCheckUserRightsListener` li aggiorna periodicamente e
  disconnette l'utente se `usr_status` diventa inattivo.

**Diritti avanzati (capacità).** Il back-office React aggiunge uno strato più granulare *subordinato al*
controllo di accesso allo strumento: **capacità** per strumento (`list` / `create` / `edit` / `delete`, o schede
annidate). I moduli dichiarano quali capacità esistono tramite `config/react.capabilities.php`; il resolver
`MelisReactApi\Service\Capabilities` è **default-allow** — una capacità viene negata solo se è
sia dichiarata sia presente in una sezione dedicata `<meliscore_tool_capabilities>` dell'XML dei diritti.
I controller degli strumenti proteggono le loro azioni con `CapabilityGuardTrait::denyUnlessCan($cap)` (gli amministratori bypassano il controllo),
e la stessa allow-map arriva lato client in `GET /me` per nascondere la UI. Tutto questo risiede in
[`melis-react-api`](/it/reference/modules/melis-react-api); la deny-list si modifica in **Users → Rights**.

::: tip Concedere l'accesso a un nuovo strumento
Dopo aver aggiunto uno strumento, concedi l'accesso tramite **Users → Rights** nel back-office React (la sua matrice
di diritti avanzati è alimentata da `GET /rights/capabilities`), oppure inietta la sezione nell'XML dei diritti con una
migrazione — vedi `flyway/sql/V3__add_melisai_rights.sql`.
:::

## Ciclo di vita della richiesta del front-office

Per un URL pubblico, **MelisFront** + **MelisEngine** renderizzano una pagina CMS (invariato nella v6):

1. **Routing** — `melis-front` corrisponde a `…/id/{idpage}`. Gli URL SEO (`/about-us`) vengono risolti in un
   id di pagina da `MelisFrontSEORouteListener` (interroga la tabella page-SEO e registra una rotta dinamica
   al momento del caricamento del modulo).
2. **Dispatch** — i listener front selezionano il layout front e consultano la cache della pagina.
3. **Caricamento della pagina** — `MelisEngine\Service\MelisPageService::getDatasPage($idPage, $type)` restituisce una
   `MelisPage` (dati dell'albero delle pagine + template), memorizzata in cache sotto `getDatasPage_{id}_{type}`.
4. **Rendering del template** — il controller/action `ZF2` del template renderizza il `.phtml` del modulo del sito;
   le zone `MelisTag` e i plugin `MelisDragDropZone` vengono riempiti dal contenuto **pubblicato**.

```
GET /about-us
  → MelisFrontSEORouteListener maps /about-us → idpage=5
  → MelisFront\Controller\Index::index(idpage=5)
  → MelisPageService::getDatasPage(5, 'published')  (cached)
  → template ZF2 controller/action → site .phtml → MelisTag / MelisDragDropZone
  → response
```

> La rotta regex `/melis-react` ad alta priorità prevale deliberatamente su questo catch-all, così un ricaricamento
> completo della pagina su un deep link React si risolve nella SPA anziché in una "404 page not found".

## Caching

Melis effettua un caching aggressivo tramite cache su filesystem sotto `cache/`:

| Cache | Contiene |
| --- | --- |
| `meliscore_platform_cache-*` | zone del back-office renderizzate / config della piattaforma |
| `meliscms_page-*`, `melisfront_pages_file_cache-*` | pagine CMS renderizzate |
| `cache/config/` | config Laminas unita (solo se `config_cache_enabled`) |
| `datasource-*`, `melistoolcreator-*` | cache specifiche dei moduli |

`MelisCoreCacheSystemService` è l'API di cache (`getCacheByKey`/`setCacheByKey`/
`deleteCacheByPrefix`). Le cache vengono invalidate in occasione di eventi chiave (modifiche ai moduli, pubblicazione di pagine, aggiornamenti dei
diritti) e possono essere svuotate manualmente eliminando le relative cartelle `cache/*` — vedi
[Risoluzione dei problemi](./troubleshooting). Lo strato React aggiunge le proprie cache economiche: il bundle di
discovery viene servito come immutabile con una firma di contenuto e `PlatformAssetsService` memoizza i
CSS/JS dei moduli concatenati (rigenerando `etc/bundles/` se lo strumento Modules li ha cancellati).

## Eventi

Melis è fortemente **event-driven**. I moduli collegano listener in `Module::onBootstrap()` (e tramite il
gestore di eventi condiviso) al ciclo di vita MVC (`EVENT_ROUTE`, `EVENT_DISPATCH`, `EVENT_RENDER`,
`EVENT_FINISH`) e agli **eventi di dominio Melis** (ad es. `melis_core_auth_login_ok`, eventi di salvataggio pagina).
I servizi di dominio estendono `MelisGeneralService`, che aggiunge `sendEvent()` così qualsiasi servizio può pubblicare
eventi a cui altri moduli si sottoscrivono. Questo è il principale meccanismo di estensione disaccoppiato — è preferibile un
listener piuttosto che modificare un altro modulo.

Lo strato React segue la stessa filosofia "accumula, non sovrascrivere": invece di codificare a livello fisso le
stranezze per strumento, `melis-react-override` espone un hook `toolpage_extensions` che qualsiasi modulo può
implementare per adattare l'HTML o gli asset di uno strumento legacy all'interno del frame (usato, ad esempio, da
[`melis-ai-community-extensions`](/it/reference/modules/melis-ai-community-extensions)).

## La richiesta, in un'unica immagine

```
public/index.php
  → application.config.php  (MelisModuleManager assembles modules + platform DB config)
  → Laminas MVC run
     ├── /melis-react → SpaController serves the React shell (public)
     │                    → boot JSON: /me /menu /langs /assets /react-modules
     │                    → brick, or iframe → /melis/react-tool-page?key=<melisKey>
     ├── /melis…      → auth (checkIdentity) → rights → PluginViewController zones (forwards)
     └── public URL   → MelisFront route (id/SEO) → MelisEngine page load → site template
  → caching at every expensive step (MelisCoreCacheSystemService)
  → response
```

## File chiave

| Ambito | Percorso |
| --- | --- |
| Config app / bootstrap | `config/application.config.php` |
| Assemblaggio dei moduli | `vendor/melisplatform/melis-core/src/MelisModuleManager.php` |
| Bootstrap / listener core | `vendor/melisplatform/melis-core/src/Module.php` |
| Autenticazione | `vendor/melisplatform/melis-core/src/Service/MelisCoreAuthService.php` |
| Diritti | `vendor/melisplatform/melis-core/src/Service/MelisCoreRightsService.php` |
| Albero di configurazione | `vendor/melisplatform/melis-core/src/Service/MelisCoreConfigService.php` |
| Rendering delle zone | `vendor/melisplatform/melis-core/src/Controller/PluginViewController.php` |
| API di cache | `vendor/melisplatform/melis-core/src/Service/MelisCoreCacheSystemService.php` |
| Routing/SEO front | `vendor/melisplatform/melis-front/src/Listener/MelisFrontSEORouteListener.php` |
| Servizio pagina | `vendor/melisplatform/melis-engine/src/Service/MelisPageService.php` |
| API JSON React | `vendor/melisplatform/melis-react-api/src/Controller/MelisReactApiController.php` |
| Resolver delle capacità | `vendor/melisplatform/melis-react-api/src/Service/Capabilities.php` |
| SPA + iframe legacy | `vendor/melisplatform/melis-react-override/src/Controller/` |
| Shell React (sorgente SPA) | `vendor/melisplatform/melis-core/ui-react/` |
