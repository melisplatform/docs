# MelisReactApi

> Ossatura JSON dell'API del back-office React (`/melis-react`): avvia la shell, fornisce i dati di menu/utente/asset/discovery/dashboard e ospita il resolver delle capability. Pacchetto `melisplatform/melis-react-api`.

## Scopo

MelisReactApi è **infrastruttura, non uno strumento**. Non disegna alcuna UI, non fornisce alcun brick e non aggiunge alcuna
voce nella barra laterale. Espone gli endpoint JSON generici `/melis/react-api/…` che la shell React
(servita da MelisReactOverride su `/melis-react`) chiama all'avvio e durante la navigazione, e
ospita il **resolver delle capability** (`Capabilities` + `CapabilityGuardTrait`) che i controller
degli strumenti di ogni modulo riutilizzano per regolare i loro "diritti avanzati".

Tutto ciò che la shell mostra e che non è la schermata specifica di uno strumento proviene da qui: il
menu di sinistra (filtrato per diritti), l'utente/avatar dell'intestazione e il selettore di lingua, i riquadri
e i KPI della dashboard, il discovery modulare dei brick e la matrice dei diritti avanzati Utenti → Diritti.
Gli endpoint, le rotte e le dichiarazioni di capability propri dei singoli strumenti risiedono nei **loro**
moduli (ad es. `/users`, `/roles` sono dichiarati in MelisCore / MelisSmallBusiness), non qui.

Non esistono **schermate React né screenshot** per questo modulo — le sezioni seguenti
descrivono il contratto API da usare quando si dialoga con il back-office React.

## Come abilitarlo

MelisReactApi è un modulo centrale del back-office React. **Non** è installato via composer nel
volume vendor di Docker; viene caricato tramite `config/application.config.php` `module_paths`
(branch `melis-react`) e `src/Module.php` effettua l'autoload delle sue classi tramite `StandardAutoloader`.
Si abbina a **MelisReactOverride** (il meccanismo iframe/strumento + la rotta della shell SPA) e a
**melis-core/ui-react** (l'app React che consuma questa API — vedi i suoi client `src/lib/*-api.ts`).

Dichiara le sue rotte direttamente in `config/module.config.php` (nessun `config/react-api.php`)
e non dichiara alcuna capability propria (è il motore che *legge* le dichiarazioni degli altri
moduli).

## Presenza React in sintesi

| Proprietà | Valore |
| --- | --- |
| Brick / manifest | **nessuno** — non fornisce alcun `public/ui-react/brick.manifest.json` |
| Sorgente `ui-react/` | **nessuna** — nessun progetto Vite, nessun componente React |
| Controller | `MelisReactApi\Controller\MelisReactApiController` (alias invocabile `MelisReactApi\Controller\MelisReactApi`) |
| Rotta di base | `melis-backoffice` → `react-api` (ovvero `/melis/react-api/…`) |
| Autenticazione | `isAuthenticated()` (MelisCoreAuth) per ogni azione, **eccetto** `/langs` (pubblica, caricata nella schermata di login) |
| Contratto di risposta | `{ success: bool, data: T, error?: string }` (JSON grezzo, nessun layout) |

Ogni azione restituisce una `Response` JSON grezza tramite il metodo ereditato `jsonResponse()`, quindi Laminas
non incapsula mai un layout attorno ad essa. Le azioni di sola lettura chiamano `releaseSessionLock()` anticipatamente affinché
le richieste di avvio concorrenti che condividono il cookie di sessione non vengano serializzate.

## Endpoint generici

Tutti sotto `/melis/react-api/…`. Dodici endpoint generici, tutti mappati su
`MelisReactApiController`. Ogni risposta è `{ success, data, error? }` (401 quando il
guard `isAuthenticated()` fallisce, eccetto `/langs`).

| Metodo + percorso | Azione | Forma di `data` |
| --- | --- | --- |
| `GET /me` | `meAction` | `{ id, name, login, email, picture, isAdmin, capabilities }` — `capabilities` = mappa `melisKey → string[]` delle capability consentite (admin ⇒ tutto). |
| `GET /menu` | `menuAction` | `NavNode[]` — l'albero di navigazione filtrato per diritti. `?full=1` restituisce l'albero **non filtrato** (solo editor dei diritti; richiede `canAccess('meliscore_tool_user')`). |
| `GET /langs` | `langsAction` | `{ current: { id, locale }, langs: [{ id, locale, short, label }] }` — **pubblico**. |
| `GET /assets` | `assetsAction` | URL CSS/JS + globali JS inline per il bootstrap degli iframe degli strumenti (delega a `MelisReactOverride\Service\PlatformAssetsService::build()`). |
| `GET /react-modules` | `reactModulesAction` | `{ data: BrickDef[], bundle: { url } }` — i brick dei moduli attivi; `bundle.url` = il JS concatenato. |
| `GET /bricks-bundle.js` | `bricksBundleAction` | **non JSON** — l'IIFE di ogni brick attivo concatenato in un'unica risposta JavaScript con cache immutabile. |
| `GET /dashboard/bubbles` | `dashboardBubblesAction` | conteggi `{ news, updates, notifications:{count,items}, messages }` (degradano a 0, mai 404). |
| `GET /dashboard/stats` | `dashboardStatsAction` | `{ kpis:{ users, sites, pages, languages }, activity:[{ id, name, loginDate }] }`. |
| `GET /dashboard/legacy-plugins` | `legacyDashboardPluginsAction` | `[{ pluginName, title, icon, section, w, h }]` — plugin legacy della dashboard come widget iframe. |
| `GET \| POST /dashboard/layout` | `dashboardLayoutAction` | GET → riquadri salvati `[{ pluginName, pluginId, x, y, w, h }]`; POST → stesso JSON, salvato in `melis_core_dashboards`. |
| `GET /rights/dashboard-plugins` | `rightsDashboardPluginsAction` | `[{ key, title, module }]` — elenco autoritativo dei plugin della dashboard per l'editor dei diritti (`?userId=`). |
| `GET /rights/capabilities` | `rightsCapabilitiesAction` | mappa `melisKey → albero delle capability` **dichiarate** dai moduli, con le etichette `tr_*` tradotte nel locale della sessione. |

**Insieme di avvio:** `/me`, `/menu`, `/langs`, `/assets`, `/react-modules` (+ `/bricks-bundle.js`).
Gli endpoint `/dashboard/*` e `/rights/*` alimentano la dashboard e l'editor Utenti → Diritti.

Gli endpoint dati propri di uno strumento **non** sono qui: `/melis/react-api/users…`, `/users/stats`,
`/roles` sono dichiarati in **MelisCore**; `/roles-list`, `/roles/save|stats|:id`,
`/workflow/roles` in **MelisSmallBusiness**; le rotte AI in **MelisAI**. I client che chiamano
questo insieme generico risiedono in `melis-core/ui-react/src/lib/melis-api.ts`.

Esempio reale di fetch — la chiamata di avvio `/me` della shell:

```ts
// mirrors melis-core/ui-react/src/lib/melis-api.ts
const res = await fetch('/melis/react-api/me', {
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
  credentials: 'include',
})
const json = await res.json()                    // { success, data, error? }
if (!json.success) throw new Error(json.error)   // 401 → { success:false, error:'Unauthenticated' }
const { name, isAdmin, capabilities } = json.data
// capabilities: Record<melisKey, string[]>
// e.g. { melis_core_announcement_tool: ['list','create','edit'] }
```

## Capability — il resolver

Questa è la sostanza che MelisReactApi fornisce agli *altri* moduli: il sistema dei "diritti
avanzati" che regola i **componenti interni** di uno strumento già autorizzato (list / create /
edit / delete / schede annidate), *subordinato al* controllo di accesso allo strumento
(`MelisCoreRights::canAccess`, invariato).

**Dichiarazione (in ciascun modulo, non qui).** Un modulo dichiara, per ogni `melisKey` di strumento, le
capability esistenti tramite la chiave di configurazione mergiata `melisReactToolCapabilities`
(`config/react.capabilities.php`, mergiata nel suo `Module::getConfig()`):

```php
// <module>/config/react.capabilities.php  (declared BY the tool's module)
return [
  'melisReactToolCapabilities' => [
    'melis_core_announcement_tool' => ['list', 'create', 'edit', 'delete'],
    // or a TREE for nested tabs with their own actions:
    // 'some_tool' => ['actions' => ['list'], 'tabs' => [['key' => 'variants', 'actions' => ['list','create']]]],
  ],
];
```

**Resolver — `MelisReactApi\Service\Capabilities`** (tutti statici; `const CONFIG_KEY =
'melisReactToolCapabilities'`, `const SECTION = 'meliscore_tool_capabilities'`):

| Metodo | Ruolo |
| --- | --- |
| `declared($appConfig)` | La mappa dichiarata grezza (l'editor dei diritti la renderizza). |
| `flatten($node)` | Appiattisce un elenco piatto OPPURE un albero `{ actions, tabs }` in stringhe con notazione a punti (ad es. `variants.list`). |
| `deniedFor($rightsXml, $toolKey)` | La deny-list letta dall'XML dei diritti dell'utente/ruolo. |
| `isAllowed($appConfig, $rightsXml, $toolKey, $cap)` | **Default-allow** — consentito a meno che la capability sia sia dichiarata *sia* presente nella deny-list. |
| `allowedForUser($appConfig, $rightsXml)` | La mappa `melisKey → allowedCaps[]` restituita in `/me` (`$rightsXml = null`, ad es. admin ⇒ tutto). |

**Archiviazione.** I dinieghi risiedono in una sezione dedicata dell'XML dei diritti dell'utente/ruolo, separata dalla
deny-list legacy così che il BO classico la ignori:

```xml
<meliscore_tool_capabilities>
  <tool key="melis_core_announcement_tool"><deny>delete</deny></tool>
</meliscore_tool_capabilities>
```

La conservazione di questa sezione durante un salvataggio **legacy** è a carico dei moduli interessati (MelisCore per
l'UTENTE, MelisSmallBusiness per il RUOLO).

**Guard — `MelisReactApi\Controller\CapabilityGuardTrait`.** Il controller di uno strumento di un modulo
`use`sa questo trait, definisce `const MELIS_KEY = '<il melisKey dello strumento>'` e chiama
`denyUnlessCan($cap)` **dopo** il proprio controllo di accesso allo strumento:

```php
use MelisReactApi\Controller\CapabilityGuardTrait;

class MelisReactApiFooController extends MelisAbstractActionController
{
    use CapabilityGuardTrait;
    const MELIS_KEY = 'melis_core_announcement_tool'; // the rights-bearing tool node

    public function saveAction()
    {
        if ($resp = $this->denyUnlessCan('edit')) return $resp;   // 403 JSON if denied
        // …call the module's Laminas service…
    }
}
```

`denyUnlessCan` legge i diritti **effettivi** (`MelisCoreAuth::getAuthRights()` → utente OPPURE
ruolo), gli **admin lo bypassano**, ed è **default-allow** — uno strumento senza dichiarazione mantiene il
CRUD completo. Lato client, la stessa mappa di autorizzazioni arriva in `/me` come `data.capabilities` e regola la UI
(`melis-core/ui-react/src/lib/caps.ts`).

## Integrazione con l'host

- **Discovery / brick** — `GET /react-modules` scansiona i moduli **attivi** alla ricerca di
  `public/ui-react/brick.manifest.json` (un singolo oggetto o un array `bricks: [...]`) e
  restituisce `BrickDef = { id, module, route, label, forwardKey, melisKey, subTabs, persistent,
  bundleUrl }`, più `bundle.url = /melis/react-api/bricks-bundle.js?v=<sig>`. La shell carica
  l'unico bundle concatenato (ogni brick è un IIFE che si auto-registra per id su
  `window.__MELIS_BRICK_COMPONENTS__` tramite `window.__melisRegisterBrick`, avvolto in
  try/catch). La firma `?v=` (nome+mtime+dimensione di ogni bundle) rende sicura una cache
  immutabile di 1 anno. Un brick esiste **se e solo se** il suo modulo è attivo — la regola della modularità.
- **Costruttore del menu (`GET /menu`)** — percorre l'interfaccia leftmenu, applica l'ordinamento di
  sezioni/strumenti ed emette `NavNode[]` dove ogni nodo è `{ key, name, icon, melisKey, isTool,
  forward, hasNavChild, configChildCount, children }`. Una **sezione** di primo livello è un contenitore
  (potato solo se vuoto); una sezione cliccabile `is_parent_tool` è regolata da
  `canAccess(target)`; le sezioni sconosciute appena installate usano diritti permissivi così da rimanere
  visibili. Due hook la estendono: `melisReactSidebarHostSections` (mantiene una sezione vuota come
  contenitore host della sidebar minimale che trasporta `sidebarModule`) e `melisReactRightsTools` (inietta
  nodi di strumenti sintetici di soli diritti, solo con `?full=1`).
- **Bridge auth / asset** — `/assets` restituisce gli stessi CSS/JS che il legacy `layoutCore.phtml`
  carica (delegato a `MelisReactOverride\Service\PlatformAssetsService`), così che gli iframe degli strumenti
  effettuino il bootstrap in modo identico all'interno della shell React.
- **i18n** — le etichette `tr_*` (nomi delle sezioni di menu, etichette delle schede di capability) vengono tradotte nel
  locale corrente della sessione (container `meliscore` `melis-lang-locale`) tramite
  `MelisCoreTranslation`; i moduli dichiarano **chiavi**, mai testo hard-coded.

## File chiave

| Ambito | Percorso |
| --- | --- |
| Manifest del modulo / autoloader | `melis-react-api/src/Module.php` |
| Rotte + controller invocabile | `melis-react-api/config/module.config.php` |
| Azioni generiche (12) | `melis-react-api/src/Controller/MelisReactApiController.php` |
| Trait guard delle capability | `melis-react-api/src/Controller/CapabilityGuardTrait.php` |
| Resolver delle capability | `melis-react-api/src/Service/Capabilities.php` |

Vedi anche: [melis-core](/it/reference/modules/melis-core) ·
[melis-small-business](/it/reference/modules/melis-small-business) ·
[melis-ai](/it/reference/modules/melis-ai)
