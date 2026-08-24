# MelisFront

> Il sistema di rendering front-office che trasforma un URL in una pagina pubblica finita e distribuisce i blocchi di contenuto (page plugin) che gli autori trascinano sulle pagine nel back-office React. Pacchetto `melisplatform/melis-front`.

## Scopo

MelisFront è il runtime che risolve un indirizzo web in una pagina Melis, esegue la pipeline di rendering (routing, SEO, plugin di templating, layout, caching, minificazione degli asset) e consegna la risposta HTML al visitatore. Alimenta inoltre l'**anteprima live e modificabile** ri-renderizzando qualsiasi pagina in modalità `melis`. MelisFront non possiede tabelle di database: tutti i dati di pagina/sito/template/SEO vengono letti da [melis-engine](/it/reference/modules/melis-engine), l'unica fonte di verità.

MelisFront fa parte di un trio strettamente accoppiato: [melis-engine](/it/reference/modules/melis-engine) (livello dati), **melis-front** (rendering front) e [melis-cms](/it/reference/modules/melis-cms) (editor back-office). Le modifiche a uno qualsiasi di essi coinvolgono di norma gli altri due.

## Nel back-office React

MelisFront **non ha uno strumento React autonomo**: nessun brick `ui-react/`, nessun `brick.manifest.json`, nessun `react-api.php` — non compare mai nella barra laterale sinistra di `/melis-react`. La sua intera superficie back-office è l'insieme dei **page plugin (blocchi di contenuto)** che si configurano all'interno dell'**editor di pagina MelisCms**.

Si incontra MelisFront quando si modifica una pagina: **MelisCms → apri una pagina → scheda Edition**. Quella scheda Edition è il classico editor di pagina drag-drop **renderizzato in un iframe all'interno della shell React** (`/melis/react-tool-page?key=meliscms_page`). Al suo interno si trascinano i blocchi di MelisFront sulle zone e si apre il loro modale **Properties**. React si limita a *ospitare* quell'editor legacy; MelisFront non fornisce alcun componente React proprio.

Esistono due tipi di blocco:

- **Tag block** modificati **in loco** sulla pagina — **HTML** (rich text) e **Media** (immagine/file). Nessun modale.
- **Config block** configurati tramite un modale **Properties** — **Menu**, **Breadcrumb**, **List-from-folder**, **GDPR banner**. Generano contenuto a partire dall'albero delle pagine / configurazione del sito.

## Abilitarlo

Aggiungere a `config/melis.module.load.php`:

```php
return [
    'MelisFront',
];
```

Dipendenza Melis dichiarata: `melisplatform/melis-core`. A runtime consuma inoltre i servizi di MelisEngine. Ordine di caricamento: `melis-core` → **melis-front** → `melis-engine` → `melis-cms`.

## Tag block — modifica in loco

### HTML (Text)

Il blocco di riferimento: un'**area di rich text** (TinyMCE) per titoli, paragrafi, link e contenuti formattati. Modificato **direttamente sulla pagina**, senza modale Properties. Classe del plugin `MelisFrontTagHtmlPlugin`.

![Blocco HTML/Text nell'editor di pagina con la barra degli strumenti TinyMCE completa](/screenshots/react/melis-front/melisfront-page-plugin-html-tag.png)

### Media

Inserisce un'**immagine o un file** dalla libreria multimediale. Anch'esso modificato in loco tramite una barra degli strumenti compatta con un segnaposto "Add media content here". Classe del plugin `MelisFrontTagMediaPlugin`.

![Blocco Media in loco con il segnaposto Add media content here](/screenshots/react/melis-front/melisfront-page-plugin-media-tag.png)

## Config block — modale Properties

I config block vengono configurati tramite un piccolo modale **Properties** renderizzato dalla piattaforma. I due campi ricorrenti sono il menu a tendina **Template** (`MelisEnginePluginTemplateSelect`, campo `template_path`) che seleziona la vista `.phtml`, e un **selettore di pagina** (`MelisText` con un pulsante `fa fa-sitemap`) che imposta la pagina iniziale/padre nell'albero. Ogni config block dichiara il proprio modale come `melis.modal_form` (specifica di form Laminas) in `config/plugins/<Plugin>.config.php`; non esiste alcun componente React per singolo plugin.

### Menu

Costruisce un **menu di navigazione automaticamente a partire dall'albero delle pagine**. Campi del modale: **Template** e **Starting page**. Plugin `MelisFrontMenuPlugin` (campo `pageIdRootMenu`).

![Modale Properties del blocco Menu con i campi Template e Starting page](/screenshots/react/melis-front/melisfront-page-plugin-menu-config-properties.png)

### Breadcrumb

Renderizza il percorso "sei qui" (Home › Sezione › Pagina). Campi del modale: **Template** (predefinito `MelisFront/breadcrumb`) e **Starting page**. Plugin `MelisFrontBreadcrumbPlugin` (campo `pageIdRootBreadcrumb`).

![Modale Properties del blocco Breadcrumb con i campi Template e Starting page](/screenshots/react/melis-front/melisfront-page-plugin-breadcrumb-config-properties.png)

### List-from-folder

Prende una **cartella nell'albero delle pagine ed elenca automaticamente le sue pagine figlie**. Campi del modale: **Template** (come viene renderizzato ogni elemento) e **Parent page** (la cartella di origine). Plugin `MelisFrontShowListFromFolderPlugin` (campo `pageIdFolder`).

![Modale Properties di List-from-folder con i campi Template e Parent page](/screenshots/react/melis-front/melisfront-page-plugin-folderlisting-config-properties.png)

### GDPR banner

Il **banner cookie/consenso** mostrato sul sito pubblico. Il suo modale richiede solo il **Template**; i testi provengono dai testi GDPR del sito. Plugin `MelisFrontGdprBannerPlugin`.

![Modale Properties del GDPR banner con un unico campo Template](/screenshots/react/melis-front/melisfront-page-plugin-gdprbanner-config-properties.png)

### Campi dei modali di configurazione

| Plugin | Campi del modale (nome / tipo) | Template predefinito |
| --- | --- | --- |
| Breadcrumb | `template_path` (`MelisEnginePluginTemplateSelect`) · `pageIdRootBreadcrumb` (`MelisText`, sitemap) | `MelisFront/breadcrumb` |
| Menu | `template_path` · `pageIdRootMenu` (`MelisText`, sitemap) | `MelisFront/menu` |
| List-from-folder | `template_path` · `pageIdFolder` (`MelisText`, sitemap) | `MelisFront/show-list-from-folder` |
| GDPR banner | solo `template_path` | `MelisFront/gdpr-banner` |

**Apply** invia nuovamente i valori attraverso il livello drag-drop, che li persiste nel file XML di sessione della pagina. React non è coinvolto in questo scambio; l'interfaccia del plugin è interamente PHP/JS legacy all'interno dell'iframe Edition.

## Servizi chiave

| Alias del servizio | Ruolo |
| --- | --- |
| `MelisFrontHead` | Gestisce `<title>`, meta description e canonical della pagina e inietta gli asset CSS/JS dei plugin. |
| `MelisSiteConfigService` | Legge la configurazione per singolo sito per chiave, pagina o lingua — merge file + DB. |
| `MelisSiteTranslationService` | Lookup e CRUD di chiave/testo di traduzione per singolo sito, con cache per sito. |
| `MelisTranslationService` | Traduzioni per modulo/locale (stringhe back-office), con cache. |
| `MinifyAssets` | Costruisce `bundle.css` / `bundle.js` per singolo sito usando `matthiasmullie/minify`. |
| `MelisFrontNavigation` | Factory di navigazione che costruisce un albero `Laminas\Navigation` a partire dall'albero delle pagine dell'engine. |

## Rendering front

### Routing

La rotta front principale è un pattern Regex che corrisponde a `.../id/{idpage}`, inviato a `MelisFront\Controller\Index::index`. Rotte figlie: `/renderMode/melis` (modalità di modifica back-office usata da MelisCms) e `/preview` (anteprima della versione salvata). Rotte speciali: `sitemap(.xml)`, `/css/plugin-width.css`, `/melissearchindex/…`, `/melispluginrenderer` (render AJAX di un singolo plugin), `/minify-assets`.

### Pipeline di rendering (listener)

Collegati in `src/Module.php` tra `EVENT_DISPATCH` ed `EVENT_FINISH` (~19 listener in totale):

| Fase | Listener |
| --- | --- |
| `EVENT_LOAD_MODULES_POST` | `MelisFrontSEORouteListener`, `MelisFrontSiteConfigListener`, `MelisFrontMiniTemplateConfigListener` |
| `EVENT_DISPATCH` | `MelisFrontXSSParameterListener`, `MelisFrontHomePageRoutingListener` / `…HomePageIdOverrideListener`, `MelisFrontSEODispatchRouterRegularUrlListener` (validazione pagina, 404/301, scatena `melisfront_site_dispatch_ready`), `MelisFront404To301Listener`, `MelisFront404CatcherListener` |
| `EVENT_FINISH` | `MelisFrontPluginsToLayoutListener` (CSS/JS dei plugin), `MelisFrontSEOMetaPageListener` (title/description/canonical), `MelisFrontAttachCssListener` (CSS della pagina), `MelisFrontLayoutListener` (layout front o layout BO + TinyMCE in modalità `melis`), `MelisFrontPageCacheListener`, `MelisFrontMinifiedAssetsCheckerListener` |

### Plugin di templating (controller plugin)

Tutti estendono `MelisEngine\Controller\Plugin\MelisTemplatingPlugin`, registrati sotto `controller_plugins`. I blocchi esposti nell'editor React sono un sottoinsieme di questi:

| Alias del plugin | Blocco |
| --- | --- |
| `MelisFrontTagHtmlPlugin` | Zona HTML / rich text modificabile inline. |
| `MelisFrontTagTextareaPlugin` | Zona di testo semplice. |
| `MelisFrontTagMediaPlugin` | Immagine / file dalla libreria multimediale. |
| `MelisFrontMenuPlugin` | Menu di navigazione costruito dall'albero delle pagine. |
| `MelisFrontBreadcrumbPlugin` | Percorso breadcrumb (Home › … › Pagina corrente). |
| `MelisFrontShowListFromFolderPlugin` | Elenca automaticamente le sotto-pagine da una cartella scelta. |
| `MelisFrontDragDropZonePlugin` | Contenitore di layout (zona di drop per altri plugin). |
| `MelisFrontBlockSectionPlugin` | Contenitore di blocco/sezione riutilizzabile. |
| `MelisFrontGenericContentPlugin` | Blocco di contenuto generico. |
| `MelisFrontGdprBannerPlugin` | Banner di consenso cookie / GDPR. |
| `MelisFrontGdprRevalidationPlugin` | Richiede nuovamente il consenso quando la policy GDPR cambia. |
| `MelisFrontSearchResultsPlugin` | Renderizza i risultati della ricerca interna al sito. |
| `MiniTemplatePlugin` | Inserisce un mini-template pre-costruito con un clic. |

### Il controller del renderer dei plugin

`MelisFront\Controller\MelisPluginRendererController` ri-renderizza un singolo plugin su richiesta — è ciò che l'iframe Edition chiama quando si trascina o si modifica un blocco:

- `getPluginAction()` (rotta `/melispluginrenderer`) — render AJAX di un plugin.
- `editPluginAction`, `dndLayoutAction`, `dndUpdateOrderAction`, `dndRemoveAction` — i flussi di drag-drop e di modifica dei plugin.

### View helper

Usati all'interno dei template `.phtml` di un sito (registrati sotto `view_helpers`):

| Alias dell'helper | Uso |
| --- | --- |
| `MelisTag` | Dichiara una zona modificabile (HTML o media) che gli editor compilano in loco. |
| `MelisLink` | Restituisce l'URL SEO-friendly di una pagina (rimane corretto se la pagina viene spostata). |
| `MelisMenu` | Renderizza un menu di navigazione dall'albero delle pagine. |
| `MelisDragDropZone` | Renderizza una zona drag-and-drop che ospita altri plugin. |
| `siteTranslate` | Restituisce una stringa di traduzione del sito tramite chiave. |
| `SiteConfig` | Legge un valore di configurazione del sito. |

Sono inoltre disponibili helper per lingua/home per i link alle versioni linguistiche e il link alla home page.

### Navigazione

`MelisFrontNavigation` (`src/Navigation/Factory/`) estende la factory di navigazione Laminas per costruire un oggetto `Laminas\Navigation` a partire dall'albero delle pagine dell'engine (`MelisEnginePage` / `MelisEngineTree`), che gli helper Menu e Breadcrumb renderizzano.

### Minificazione degli asset

`MinifyAssetsService` (basato su `matthiasmullie/minify`) costruisce `bundle.css` / `bundle.js` per singolo sito. `MelisFrontMinifiedAssetsCheckerListener` li inietta (con cache-busting) quando presenti. Attivare una build tramite la rotta `/minify-assets`.

## Tabelle di database

MelisFront **non possiede tabelle di database**. Tutti i dati di pagina, sito, lingua, SEO e traduzione appartengono a [melis-engine](/it/reference/modules/melis-engine) e [melis-cms](/it/reference/modules/melis-cms).

## Esempio

Utilizzo tipico in un template `.phtml` di sito e chiamate a servizi PHP:

```php
// Inside a site page template (.phtml)
<?= $this->MelisMenu($idPage); ?>                         // navigation menu from the page tree
<a href="<?= $this->MelisLink($targetPageId); ?>">…</a>  // SEO-friendly page link
<?= $this->MelisTag($idPage, 'zone_main', 'html'); ?>    // editable HTML zone
<?= $this->siteTranslate('btn_send'); ?>                  // site translation string
<?= $this->SiteConfig('contact_email'); ?>               // site config value
```

```php
// Reading site config and translations in PHP
$siteConfig = $serviceManager->get('MelisSiteConfigService');
$email = $siteConfig->getSiteConfigByKey('contact_email', $siteId);

$tr = $serviceManager->get('MelisSiteTranslationService')
        ->getEntryByTextAndSiteId('btn_send', $siteId, $langId);
```

```php
// Hooking the render pipeline (after page validation, before render)
$sharedEvents->attach('MelisFront', 'melisfront_site_dispatch_ready', function ($e) {
    $params = $e->getParams(); // page id, site, renderMode…
    // e.g. force a redirect, add data to the layout, A/B-test…
}, 50);
```

## File chiave

| Ambito | Percorso |
| --- | --- |
| Bootstrap del modulo + collegamento dei listener | `vendor/melisplatform/melis-front/src/Module.php` |
| Rotte, servizi, plugin, helper, cache | `vendor/melisplatform/melis-front/config/module.config.php` |
| Configurazione dei plugin (default front + `melis.modal_form`) | `vendor/melisplatform/melis-front/config/plugins/` |
| Listener della pipeline di rendering | `vendor/melisplatform/melis-front/src/Listener/` |
| Servizi (Head, SiteConfig, Translations, Minify) | `vendor/melisplatform/melis-front/src/Service/` |
| Plugin di templating (blocchi di contenuto) | `vendor/melisplatform/melis-front/src/Controller/Plugin/` |
| Controller del renderer dei plugin | `vendor/melisplatform/melis-front/src/Controller/MelisPluginRendererController.php` |
| View helper | `vendor/melisplatform/melis-front/src/View/Helper/` |
| Factory di navigazione | `vendor/melisplatform/melis-front/src/Navigation/Factory/` |

Vedi anche: [melis-engine](/it/reference/modules/melis-engine), [melis-cms](/it/reference/modules/melis-cms), [melis-core](/it/reference/modules/melis-core)
