# MelisCms

> Il back-office CMS — siti, albero delle pagine, editor di pagina, template, stili e SEO, distribuito come back-office React. Pacchetto `melisplatform/melis-cms`.

## Scopo

`MelisCms` è il back-office in cui costruisci e gestisci i tuoi siti web sulla piattaforma Melis.
Fornisce l'albero delle pagine del sito, l'editor di pagina (schede Edition, Properties, SEO,
Languages), le zone plugin drag-and-drop per comporre i contenuti e gli strumenti di amministrazione
per siti, template, stili, lingue, ID di piattaforma, domini e reindirizzamenti. **Non possiede
alcuna tabella di database**: legge e scrive tutto tramite
[melis-engine](/legacy/reference/modules/melis-engine), mentre il rendering delle pagine (inclusa
l'anteprima di modifica in tempo reale) è gestito da
[melis-front](/legacy/reference/modules/melis-front).

In Melis v6 la logica di business è invariata; il **livello di visualizzazione** è un **back-office
React** (`/melis-react`). MelisCms distribuisce **un unico bundle multi-brick** che espone **nove
strumenti**: l'editor di pagina (un host con sidebar: albero delle pagine + editor a schede) e **otto
strumenti laterali React nativi**. L'unica parte ancora nella UI classica è la scheda **Edition**
dell'editor di pagina, caricata in un iframe.

## Il trio MelisCms / MelisFront / MelisEngine

Questi tre moduli formano un unico sistema fortemente accoppiato; una domanda su uno di essi
coinvolge di solito anche gli altri.

- **MelisEngine** — possiede l'intero modello di database del CMS (pagine, albero, siti, template,
  lingue, SEO, stili) e lo espone tramite table gateway e servizi. Definisce
  `MelisTemplatingPlugin`, la classe base che ogni blocco di contenuto estende.
- **MelisFront** — pipeline di rendering del front-office; trasforma un URL in una pagina finita e
  alimenta l'anteprima modificabile in tempo reale all'interno del back-office (`renderMode/melis`).
- **MelisCms** *(questo modulo)* — il livello UI del back-office; guida il ciclo di vita della pagina
  emettendo eventi che i listener di engine e front gestiscono.

**Ordine di caricamento:** `melis-core` → `melis-front` → `melis-engine` → `melis-cms`.

## Attivarlo

Aggiungi a `config/melis.module.load.php`:

```php
return [
    'MelisCms',
];
```

Richiede `melisplatform/melis-core`, `melisplatform/melis-engine` e `melisplatform/melis-front`.
Non ha uno script SQL di installazione proprio; lo schema del CMS fa parte di melis-engine. I brick
compaiono nel back-office React solo quando MelisCms è attivo (discovery tramite
`GET /melis/react-api/react-modules`).

## Il back-office React — un bundle, nove brick

Il bundle (`public/ui-react/brick.js` + `brick.manifest.json`) dichiara nove brick che si
auto-registrano in `brick.tsx`. Tutti sono React nativi al 100% eccetto la scheda Edition
dell'editor di pagina.

| ID brick | Route | melisKey | Tipo |
| --- | --- | --- | --- |
| `cms` | `/melis-cms/page` | `meliscms_page` | Editor di pagina (host con sidebar: albero + editor a schede) |
| `cms-sites` | `/melis-cms/sites` | `meliscms_tool_sites` | React nativo (elenco + editor + wizard a 5 passaggi) |
| `cms-templates` | `/melis-cms/templates` | `meliscms_tool_templates` | React nativo (elenco + form) |
| `cms-styles` | `/melis-cms/styles` | `meliscms_tool_styles` | React nativo |
| `cms-languages` | `/melis-cms/languages` | `meliscms_tool_language` | React nativo |
| `cms-platform-ids` | `/melis-cms/platform-ids` | `meliscms_tool_platform_ids` | React nativo |
| `cms-site-301` | `/melis-cms/site-301` | `meliscms_tool_site_301` | React nativo |
| `cms-mini-templates` | `/melis-cms/mini-templates` | `meliscms_mini_template_manager_tool` | React nativo |
| `cms-menu-manager` | `/melis-cms/menu-manager` | `meliscms_mini_template_menu_manager_tool` | React nativo |

Il brick `cms` è speciale: registra **sia** un `Component` con routing (l'editor a schede) **sia** una
`Sidebar` (l'albero delle pagine), così l'albero rimane visibile nella sidebar di sinistra mentre
lavori. Ogni strumento laterale ha un interruttore **New / Old** — *New* è la UI React, *Old* è lo
strumento classico in un iframe (`/melis/react-tool-page?key=<melisKey>`).

![La sezione MelisCms nella sidebar React — il pannello PAGE TREE e il gruppo Site Tools](/screenshots/react/melis-cms/meliscms-menu-entry.png)

## Albero delle pagine (sidebar sinistra)

L'albero delle pagine è la mappa dei tuoi siti e di ogni pagina al loro interno. Fai clic su una
pagina per aprirla come scheda principale nell'editor; la ricerca trova pagine non ancora caricate ed
espande l'albero fino a esse; il menu contestuale (clic destro) di un nodo aggiunge una pagina figlia,
ne mostra i dettagli, duplica una pagina o un intero ramo, oppure elimina. Sposta una pagina con il
drag-and-drop (i diritti lato server decidono cosa puoi spostare).

![L'albero delle pagine React — siti e pagine, con indicatori di bozza, blocco e radice del sito](/screenshots/react/melis-cms/meliscms-menu-site-treeview.png)

L'albero riutilizza gli endpoint CMS legacy (nessuna modifica al backend) tramite `cms-tree-api.ts`:

| Scopo | Endpoint |
| --- | --- |
| Figli di un nodo (lazy) | `GET /melis/MelisCms/TreeSites/get-tree-pages-by-page-id?nodeId=<id>` (`-1` = radici dei siti) |
| Ricerca pagine per nome | `POST /melis/MelisCms/Page/searchTreePages` |
| Sposta / cambia genitore | `GET /melis/MelisCms/Page/movePage` |
| Duplica un albero | `POST /melis/MelisCms/TreeSites/duplicateTreePage` |
| Elimina una pagina | `GET /melis/MelisCms/Page/deletePage?idPage=<id>` |

L'albero è in ascolto dell'evento `melis:cms-tree-refresh` per aggiornarsi e rivelare una pagina dopo
Save/Publish/Delete.

## Editor di pagina

Apri una pagina dall'albero, oppure usa il deep-link `/melis-cms/page/:idPage`. L'editor ha una
**chrome React nativa** (titolo + stato, pulsanti d'azione, barra delle schede) attorno al contenuto
della scheda. La chrome è assemblata a partire da una struttura unita lato server
(`GET /melis/react-api/cms-page/structure?idPage=<id>` → `{ header, tabs[], buttons[] }`), così **altri
moduli possono aggiungere schede e pulsanti unendo la configurazione lato server**.

Prima le schede native, poi quelle contribuite da altri moduli: **Edition · Properties · SEO ·
Languages · Historic · Page Analytics · Scripts · Open Graph · Link Checker · Google Analytics ·
Versioning · Comments**. Pulsanti d'azione: **New page · Duplicate · Erase draft · Delete page · See ·
Display · Save · Publish** (più un interruttore di stato Publish/Online e pulsanti modulari come
Workflow).

### Scheda Properties (React nativo)

Imposta il **nome** della pagina, il **tipo** (Page / Folder / Site…), il **template** (layout), la
**lingua** (bloccata dopo la creazione), la **visualizzazione nel menu**, lo **stile** e le parole
chiave della tassonomia.

![La scheda Properties React — nome, tipo, template, lingua, visualizzazione nel menu, stile e tassonomia](/screenshots/react/melis-cms/meliscms-page-tab-properties.png)

### Scheda Edition (drag-and-drop legacy in un iframe)

La scheda Edition riempie la pagina: esegue il rendering in tempo reale e tu **trascini i blocchi di
contenuto (plugin)** nelle zone del template. È l'**editor classico caricato in un iframe** all'interno
della chrome React (`/melis/react-tool-page?key=meliscms_page&idPage=<id>`); il drag-drop, il menu dei
plugin, il gestore dei mini-template e gli editor rich-text sono gli stessi del back-office classico. Il
loro contenuto viene salvato automaticamente nella sessione PHP e scritto quando esegui Save o Publish.

![La scheda Edition — la pagina in tempo reale con l'overlay drag-and-drop, all'interno della chrome dell'editor React](/screenshots/react/melis-cms/meliscms-page-tab-edition.png)

![Il pannello dei plugin — i blocchi di contenuto che puoi rilasciare sulla pagina; l'elenco dipende dai moduli attivi del sito](/screenshots/react/melis-cms/meliscms-page-tab-edition-menu-templating-plugins.png)

![Layout delle zone drag-drop — scegli come suddividere una zona per posizionare i tuoi blocchi](/screenshots/react/melis-cms/meliscms-page-tab-edition-dragdropzone-layouts.png)

### Schede SEO e Languages (React nativo)

La scheda **SEO** contiene l'URL amichevole, meta title/description, URL canonico e di
reindirizzamento. La scheda **Languages** gestisce le versioni linguistiche della pagina (ciascuna con
i propri contenuti e SEO).

![La scheda SEO React — campi URL, meta title/description e reindirizzamento](/screenshots/react/melis-cms/meliscms-page-tab-seo.png)

### Salvataggio vs pubblicazione

- **Save** scrive la bozza (Properties + SEO + l'XML di Edition insieme, in un'unica azione).
- **See → Preview / See online** mostra la bozza o la pagina live.
- **Publish** rende live la bozza corrente; l'interruttore di stato pubblica / annulla la pubblicazione.
- **Erase draft** scarta la bozza tornando alla versione pubblicata.

Save/Publish inviano richieste agli endpoint **legacy** con i nomi di campo legacy:
`POST /melis/MelisCms/Page/savePage?idPage=` e `.../publishPage?idPage=` (più `unpublishPage`,
`clearSavedPage`, `deletePage`); l'XML di Edition viene letto dalla sessione PHP.

## Strumenti laterali

### Sites — creare e gestire siti web

`/melis-cms/sites`. Ogni riga è un intero sito web (ID, nome, modulo, lingue). **+ New site** avvia un
**wizard a 5 passaggi**: Multilingual → Languages → Domains → Module → Summary. Un sito esistente si
gestisce tramite schede React native: **Properties · Module Loading · Domains · Languages · Site
Config · Translations · Scripts**.

![Lo strumento Sites React — ricerca, Columns, Export, interruttore New/Old e + New site](/screenshots/react/melis-cms/meliscms-tool-sites-list.png)

![Modifica sito — scheda Module Loading: interruttori per modulo con ordine di caricamento riordinabile via drag](/screenshots/react/melis-cms/meliscms-tool-sites-edit-tab-moduleloading.png)

![Modifica sito — scheda Site Config: impostazioni generali più chiave/valore per lingua](/screenshots/react/melis-cms/meliscms-tool-sites-edit-tab-siteconfig.png)

### Templates — layout delle pagine

`/melis-cms/templates`. Elenco nativo e form nativo: Name / Type / Site, e Layout / Controller /
Action (il layout `.phtml` a cui il template è mappato).

![L'elenco Templates React — schede KPI, controller/action, layout e sito per riga](/screenshots/react/melis-cms/meliscms-tool-templatemanager-list.png)

### Styles — CSS applicato alle pagine

`/melis-cms/styles`. Gestisci i fogli di stile CSS (nome, percorso/sorgente CSS, sito); associa uno
stile a una pagina dalla scheda Properties della pagina.

![L'elenco Styles React — stato, nome, percorso CSS e sito per riga](/screenshots/react/melis-cms/meliscms-tool-stylemanager-list.png)

### Front-office Languages

`/melis-cms/languages`. L'elenco principale dei locale che la piattaforma conosce (locale + nome con
bandiera).

### Platforms IDs — intervalli di ID pagina per ambiente

`/melis-cms/platform-ids`. Riserva una banda distinta di ID pagina e template per ogni ambiente, così
gli ID non si scontrano mai spostando contenuti tra dev / staging / production.

![L'elenco Platforms IDs React — intervalli di ID pagina e template per piattaforma](/screenshots/react/melis-cms/meliscms-tool-platformids-list.png)

### 301 Redirects — mantenere funzionanti i vecchi link

`/melis-cms/site-301`. Quando un URL pubblico cambia, aggiungi un reindirizzamento (vecchio URL → nuovo
URL, univoco per sito) così il vecchio indirizzo continua a risolversi.

![L'elenco 301 Redirects React — vecchio URL verso nuovo URL per sito](/screenshots/react/melis-cms/meliscms-tool-siteredirect-list.png)

### Mini-Templates & Menu manager

I Mini-Templates (`/melis-cms/mini-templates`) sono blocchi di contenuto predefiniti che gli editor
possono rilasciare su una pagina con un clic; il Menu manager (`/melis-cms/menu-manager`) li organizza
in categorie così sono facili da trovare nel gestore dei mini-template dell'editor di pagina.

![Il Menu manager React — un albero di categorie e dei loro mini-template riordinabile via drag](/screenshots/react/melis-cms/meliscms-tool-minitemplate-menu-manager.png)

## Endpoint dell'API React

Le route sono dichiarate in `config/react-api.php` sotto `/melis/react-api/…`; i controller sono in
`src/Controller/MelisReactApi*Controller.php`. Ogni azione è protetta da `CapabilityGuardTrait`
(`denyUnlessAccess()` per `MelisCoreRights::canAccess(MELIS_KEY)`, poi `denyUnlessCan('<action>')`). Il
contratto ovunque è `{ success, data }` in caso di OK e `{ success:false, error }` in caso di errore;
ogni fetch invia `X-Requested-With: XMLHttpRequest` con le credenziali.

| Controller | Guard (melisKey) | Base | Azioni |
| --- | --- | --- | --- |
| `MelisReactApiPageController` | `meliscms_page` | `/cms-page` | `structure`, `properties`, `seo`, `refs`, `languages`, `ancestors`, `save-properties`, `save-seo` |
| `MelisReactApiCmsSitesController` | `meliscms_tool_sites` | `/cms-sites` | `list`, `meta`, `get`, `config`, `modules`, `create` |
| `MelisReactApiSiteRedirectController` | `meliscms_tool_site_301` | `/site-redirects` | `list`, `stats`, `sites`, `get`, `save`, `delete` |
| `MelisReactApiTemplateController` | `meliscms_tool_templates` | `/templates` | `list`, `stats`, `sites`, `get`, `save`, `delete` |
| `MelisReactApiCmsLanguageController` | `meliscms_tool_language` | `/cms-languages` | `list`, `stats`, `get`, `save`, `delete` |
| `MelisReactApiCmsPlatformIdController` | `meliscms_tool_platform_ids` | `/cms-platform-ids` | `list`, `stats`, `get`, `save`, `delete` |
| `MelisReactApiCmsStyleController` | `meliscms_tool_styles` | `/cms-styles` | `list`, `stats`, `sites`, `get`, `save`, `delete` |
| `MelisReactApiCmsMiniTemplateController` | `meliscms_mini_template_manager_tool` | `/cms-mini-templates` | `list`, `stats`, `sites`, `item`, `save`, `delete` |
| `MelisReactApiCmsMenuManagerController` | `meliscms_mini_template_menu_manager_tool` | `/menu-manager` | `sites`, `languages`, `tree`, `saveTree`, `category`, `saveCategory`, `deleteCategory` |

```ts
// GET the styles list (keyset), then POST a 301 redirect
const r = await fetch('/melis/react-api/cms-styles?limit=25', {
  headers: { 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'include',
})
const { success, data } = await r.json()   // { success, data: { items, total, nextCursor } }

await fetch('/melis/react-api/site-redirects/save', {
  method: 'POST',
  headers: { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ id: null, siteId: 1, oldUrl: 'old', newUrl: 'new' }),
})
```

## Capabilities

Dichiarate in `config/react.capabilities.php` sotto `melisReactToolCapabilities`, indicizzate per il
`melisKey` portatore dei diritti di ciascuno strumento (`export` solo dove lo strumento ha un pulsante
Export):

```php
'meliscms_tool_site_301'                    => ['list','create','edit','delete','export','test'],
'meliscms_tool_templates'                   => ['list','create','edit','delete','export'],
'meliscms_tool_styles'                      => ['list','create','edit','delete','export'],
'meliscms_tool_language'                    => ['list','create','edit','delete'],
'meliscms_tool_platform_ids'                => ['list','create','edit','delete','export'],
'meliscms_tool_sites'                       => ['list','create','edit','delete','export'],
'meliscms_mini_template_manager_tool'       => ['list','create','edit','delete','export'],
'meliscms_mini_template_menu_manager_tool'  => ['list','create','edit','delete'],
```

L'editor di pagina è indicizzato sotto `meliscms_page` come un albero strutturato, così i suoi pulsanti
e le sue schede diventano ciascuno una capability:

```php
'meliscms_page' => [
  'actions' => ['create','save','clear','publish','status','delete','duplicate','view','display'],
  'tabs'    => ['edition','properties','seo','languages'],
],
```

Ogni modulo che contribuisce aggiunge **le proprie** schede/pulsanti di pagina sotto questa stessa
chiave `meliscms_page` (merge Laminas), e `CmsPage.tsx` le filtra tramite
`useCaps('meliscms_page').can(cap)`. Due chiavi correlate nello stesso file espongono i diritti
dell'editor: `melisReactRightsTools` inietta un nodo `meliscms_page` solo-diritti ("Page edition") in
Users → Rights, e `melisReactSidebarHostSections` mantiene visibile la sezione MelisCms così l'albero
delle pagine è raggiungibile anche per un utente con soli diritti di pagina.

## Punti di estensione modulari

Altri moduli contribuiscono schede all'editor di pagina e salvataggi trasversali senza toccare
MelisCms:

```ts
// Register a page-edit tab (link-check, Open Graph, GA, historic, script-editor…)
window.__melisRegisterPageTab(key, ({ idPage }) => <MyTab idPage={idPage} />)
// Register a cross-cutting save hook, run by the global Save/Publish
window.__melisRegisterPageSaveHook(key, async (idPage) => { /* persist my tab */ })
```

Lato server, restano disponibili gli stessi punti di estensione:

- **`melis_cms_page_tabs_alter`** — aggiungi o rimuovi schede nell'editor di pagina.
- **`modify_page_properties_form_config`** — modifica il form Properties per aggiungere campi
  personalizzati.

## Servizi principali

Risolvi con `$sm->get('<alias>')`. La logica di business resta lato server (servizi Laminas); React è
presentazione più chiamate API.

| Alias del servizio | Ruolo |
| --- | --- |
| `MelisCmsPageService` | Scrive il modello di pagina: `savePage()`, `savePagePublished()`, `savePageSaved()`, `savePageSeo()`, `savePageLang()`, `savePageStyle()`, `savePageTree()`, `saveProperties()`. |
| `MelisCmsSiteService` | CRUD dei siti e query per pagina-per-sito. |
| `MelisCmsPageGetterService` | `getPageContent($pageId)` — restituisce l'HTML renderizzato e in cache di una pagina. |
| `MelisCmsRights` | Verifiche dei permessi del back-office: `isAccessible()`, `isActionButtonActive()`. |
| `MelisCmsSitesDomainsService` | Gestione dei domini per ambiente. |
| `MelisCmsSitesPropertiesService` | Impostazioni chiave/valore a livello di sito (scheda Site Config). |
| `MelisCmsSiteModuleLoadService` | Caricamento dei moduli per sito (scheda Module Loading). |
| `MelisCmsMiniTemplateService` / `MelisCmsMiniTemplateGetterService` | Gestione della libreria di mini-template e delle categorie. |
| `MelisCmsPageExportService` / `MelisCmsPageImportService` | Esporta/importa un albero di pagine come file. |

## Tabelle di database

`MelisCms` non possiede tabelle. Lo schema del CMS è definito in melis-engine e accessibile tramite i
suoi gateway e servizi. Non interrogare mai direttamente le tabelle del CMS — usa i gateway/servizi
dell'engine così il caching e il resto dell'ecosistema restano coerenti.

## Eventi del ciclo di vita della pagina

Il ciclo di vita della pagina è implementato tramite 19 listener collegati in
`Module.php::onBootstrap`. Questi eventi sono il principale punto di estensione — agganciati a essi
invece di chiamare direttamente `MelisCmsPageService`, così cronologia, cache e altri moduli restano
sincronizzati.

| Azione | Eventi |
| --- | --- |
| Salva bozza | `meliscms_page_save_start` / `_end` (+ `…savetree_*`, `…saveproperties_*`, `…saveedition_*`, `…saveseo_*`) |
| Pubblica | `meliscms_page_publish_start` / `_end` |
| Annulla pubblicazione | `meliscms_page_unpublish_start` / `_end` |
| Elimina | `meliscms_page_delete_start` / `_end` (+ `…deleteseo_*`, `…delete_page_*`) |
| Sposta | `meliscms_page_move_start` / `_end` |
| Duplica | `meliscms_page_duplicate_start` / `_end` |
| Sessione plugin | `meliscms_page_savesession_plugin_*`, `meliscms_page_removesession_plugin_*` |

```php
// React to a page being published — in Module.php::onBootstrap or a listener's attach()
$eventManager->getSharedManager()->attach(
    'MelisCms',
    'meliscms_page_publish_end',
    function (\Laminas\EventManager\EventInterface $e) {
        $idPage = $e->getParams()['idPage'] ?? null;
        // log, sync, clear a custom cache, notify…
    },
    50
);
```

## Aggiungere un nuovo blocco di contenuto

Ogni blocco di contenuto estende `MelisTemplatingPlugin` (definito in melis-engine). Implementa
`front()` per il rendering sul sito live e `back()` per il rendering del contenitore di modifica, poi
registra il plugin. I moduli News, Slider e Category2 sono implementazioni di riferimento.

## Widget della dashboard

`MelisCmsPagesIndicatorsPlugin` mostra il conteggio di siti e pagine (pubblicate vs non) sulla
Dashboard del back-office.

![Il widget della dashboard Indicators — siti, pagine e pagine pubblicate vs non pubblicate](/screenshots/react/melis-cms/meliscms-dashboardplugins-indicators.png)

## File principali

| Ambito | Percorso |
| --- | --- |
| Bootstrap del modulo + collegamento dei listener | `vendor/melisplatform/melis-cms/src/Module.php` |
| Route + controller dell'API React | `vendor/melisplatform/melis-cms/config/react-api.php` |
| Capabilities React | `vendor/melisplatform/melis-cms/config/react.capabilities.php` |
| Sorgente dei brick (tutti i 9 strumenti) | `vendor/melisplatform/melis-cms/ui-react/src/` |
| Bundle compilato (committato) | `vendor/melisplatform/melis-cms/public/ui-react/brick.js` + `brick.manifest.json` |
| Servizio di pagina | `vendor/melisplatform/melis-cms/src/Service/MelisCmsPageService.php` |
| Servizio di sito | `vendor/melisplatform/melis-cms/src/Service/MelisCmsSiteService.php` |
| Servizio dei diritti | `vendor/melisplatform/melis-cms/src/Service/MelisCmsRightsService.php` |
| Tutti i listener (19) | `vendor/melisplatform/melis-cms/src/Listener/` |
| Widget della dashboard | `vendor/melisplatform/melis-cms/src/Controller/DashboardPlugins/MelisCmsPagesIndicatorsPlugin.php` |

## Vedi anche

- [melis-engine](/legacy/reference/modules/melis-engine) — possiede il modello dati del CMS e tutti i table gateway.
- [melis-front](/legacy/reference/modules/melis-front) — rendering del front-office e anteprima in tempo reale.
- [melis-core](/legacy/reference/modules/melis-core) — autenticazione, diritti, eventi e configurazione di base.
