# MelisEngine

> Fondamenta dati condivise del CMS — modello di pagina, siti, lingue, classe base dei plugin di templating e cache di rendering. Pacchetto `melisplatform/melis-engine`.

## Scopo

MelisEngine possiede l'intero modello di database del CMS (pagine, albero delle pagine, siti, template, lingue,
domini, SEO, stili) e lo espone tramite table gateway, servizi e una cache multi-livello.
Sia [MelisFront](/it/reference/modules/melis-front) (rendering front-end) sia
[MelisCms](/it/reference/modules/melis-cms) (editing back-office) leggono e scrivono esclusivamente
attraverso MelisEngine — nessuno dei due moduli fratelli possiede tabelle. Definisce inoltre
`MelisTemplatingPlugin`, la classe base astratta che ogni content plugin della piattaforma estende.

## Ruolo nel back-office React

MelisEngine **non ha alcuno strumento back-office React e nessuna UI propria** — nessun brick, nessun
`config/react-api.php`, nessuna capability, nessuna voce nella barra laterale in `/melis-react`. **Non è migrato
a React e non è previsto che lo sia**: è infrastruttura di piattaforma, non uno strumento di back-office. La sua
relazione con lo shell React è interamente dietro le quinte, su due percorsi:

- **Percorso dati** — i controller CMS React (`MelisReactApi*`, che risiedono nei moduli CMS,
  non qui) leggono e scrivono pagine, siti, lingue, template e SEO **solo** attraverso
  i gateway `MelisEngineTable*` e i servizi di MelisEngine (`MelisEnginePage`, `MelisEngineTree`,
  `MelisEngineLang`, …). Il livello React non tocca mai direttamente lo schema del CMS.
- **Percorso di rendering** — il contenuto CMS mostrato nell'editor di pagine React e negli strumenti
  iframe legacy è renderizzato **lato server** (pagine → template → zone → plugin). L'engine risolve
  il modello di pagina e definisce la classe base dei plugin; MelisFront esegue il rendering effettivo. React
  incorpora il risultato renderizzato dal server anziché ri-renderizzare il contenuto CMS lato client.

Poiché è invisibile ma portante, i problemi dell'engine emergono *all'interno degli strumenti CMS React* —
un albero delle pagine vuoto, un menu a tendina delle lingue che resta vuoto, un editor di pagine che va in errore al caricamento —
tipicamente causati da una tabella CMS mancante/non aggiornata o da un servizio dell'engine in errore, mai da una schermata
dell'engine (che non esiste).

## Come attivarlo

MelisEngine viene caricato automaticamente come dipendenza. L'ordine di caricamento in
`config/melis.module.load.php` è:

```php
// config/melis.module.load.php
return [
    'MelisCore',
    'MelisFront',
    'MelisEngine',   // requires melis-core + melis-front
    'MelisCms',
];
```

Dipendenze Composer: `melisplatform/melis-core` `^6.0`, `melisplatform/melis-front` `^6.0`,
`laminas/laminas-cache` (adattatori filesystem + memory). Richiede PHP `^8.3 | ^8.5`.

## Servizi principali

Registrati come alias `service_manager` in `config/module.config.php`:

| Alias del servizio | Ruolo |
| --- | --- |
| `MelisEnginePage` / `MelisPageService` | Risolve una pagina per id e modalità (`published` / `saved`): `getDatasPage($idPage, $mode)` — restituisce l'albero delle pagine idratato, i dati di pagina, SEO, template e oggetti di stile |
| `MelisEngineTree` / `MelisTreeService` | Navigazione dell'albero delle pagine: `getPageChildren()`, `getPageFather()`, `getPageBreadcrumb()`, `getPageLink()`, ricerca |
| `MelisEngineTemplateService` | Ricerca template: `getTemplate($tplId)` |
| `MelisEngineSiteService` | Catalogo dei siti |
| `MelisEngineSiteDomainService` | Risoluzione dominio → sito: `getSiteByDomain()` |
| `MelisEngineLang` / `MelisEngineLangService` | Lingue: lingue disponibili, locale ↔ id, lingua del sito |
| `MelisEngineSEOService` | Dati SEO per pagina: `getSEOById()` |
| `MelisEnginePageDefaultUrlsService` | Ricerche di URL di pagina pre-calcolati / canonici |
| `MelisEngineStyle` / `MelisEngineStyleService` | Stili del sito e CSS per pagina |
| `MelisEngineCacheSystem` | Orchestratore della cache: `getCacheByKey()`, `setCacheByKey()`, `deleteCacheByPrefix()` |
| `MelisSearch` | Indice di pagina full-text (in stile Lucene) usato dalla ricerca front-end |
| `MelisEngineSendMail` | Utility per l'invio email |
| `MelisGdprService` / `MelisGdprAutoDeleteService` | Testi del banner GDPR e framework di cancellazione automatica |
| `MelisEngineComposer` | Operazioni Composer / gestione dipendenze |

Tutti i servizi che estendono `MelisGeneralService` emettono eventi `*_start` / `*_end` (ad es.
`melisengine_service_get_available_languages_start` / `_end`) a cui altri moduli possono agganciarsi.

### Consumatori React (verificati)

Questi sono i punti di ingresso sanciti del percorso dati attraverso cui gli strumenti CMS React chiamano l'engine:

| Servizio / gateway dell'engine (alias) | Usato da (BO React) |
| --- | --- |
| `MelisEnginePage` (`MelisPageService`) | melis-cms `MelisReactApiPageController` — dati di pagina per l'editor di pagine React |
| `MelisEngineTree` (`MelisTreeService`) | melis-cms `MelisReactApiPageController` — navigazione dell'albero delle pagine |
| `MelisEngineLang` (`MelisEngineLangService`) | melis-cms `MelisReactApiCmsSitesController`, `MelisReactApiCmsMenuManagerController` — lingue CMS disponibili |
| `MelisEngineTableCmsLang` (`MelisCmsLangTable`) | melis-cms-tags, melis-cms-user-account, melis-core (GDPR) — menu a tendina delle lingue React |

L'alias `MelisEngineTableCmsLang => MelisCmsLangTable::class` è registrato in
`config/module.config.php`.

## Back-office

MelisEngine non ha uno strumento proprio per l'utente finale, né nel back-office legacy né in `/melis-react`. Registra
due factory di elementi di form usate in tutto il back-office:

| Factory | Scopo |
| --- | --- |
| `MelisEnginePluginTemplateSelect` | Elemento di selezione template per i form dei plugin |
| `MelisEngineSiteSelect` | Elemento di selezione sito per i form dei plugin |

Sono presenti anche controller di setup e manutenzione (`MelisSetup*`), ma vengono invocati dall'installer,
non dagli editor.

## Front office

Qui risiede la classe base per ogni content plugin:

| Elemento | Descrizione |
| --- | --- |
| `MelisEngine\Controller\Plugin\MelisTemplatingPlugin` | Classe base astratta per tutti i content plugin. Definisce `front()` (rendering live, astratto), `back()` (container/vista di editing back-office), persistenza XML della configurazione (`loadDbXmlToPluginConfig()` / `savePluginConfigToXml()`), caricamento GET/POST, modalità di anteprima e larghezza responsive. |

Ogni content plugin della piattaforma (News, Slider, Menu, Breadcrumb, …) estende questa classe. Implementa
`front()` per l'output live; la classe base gestisce automaticamente `back()`. La stessa pipeline dei plugin
alimenta l'editor di pagine React: MelisFront renderizza lato server i plugin di ciascuna zona e React
mostra il risultato.

Due listener micro-service si agganciano a `melis_core_microservice_amend_data` per esporre i metodi di albero e di pagina
(`getPageChildren`, `getPageFather`, `getDomainByPageId`, `getDatasPage`) sul livello micro-service
della piattaforma.

## Tabelle del database

MelisEngine è l'unica fonte di verità per lo schema del CMS
(`install/sql/setup_structure.sql` + delta in `install/dbdeploy/`):

| Tabella | Contiene |
| --- | --- |
| `melis_cms_page_tree` | Gerarchia delle pagine (`tree_father_page_id`, ordine) |
| `melis_cms_page_published` | Versione pubblicata (live) di ogni pagina |
| `melis_cms_page_saved` | Versione salvata / bozza (modificata nel back-office) |
| `melis_cms_page_lang` | Collegamenti pagina ↔ lingua |
| `melis_cms_lang` | Lingue / locale del CMS |
| `melis_cms_site` | Siti (radice dell'albero delle pagine) |
| `melis_cms_template` | Template (layout / controller / action o percorso PHP) |
| `melis_cms_page_seo` | SEO per pagina (URL, redirect 301, meta title/description, canonical) |
| `melis_cms_site_domain` | Domini del sito per ambiente |
| `melis_cms_site_301` / `melis_cms_site_404` | Redirect 301 a livello di sito / mappatura 404 |
| `melis_cms_page_default_urls` | URL di pagina pre-calcolati (tabella di cache) |
| `melis_cms_style` / `melis_cms_page_style` | Stili CSS e collegamenti pagina ↔ stile |
| `melis_cms_platform_ids` | Intervalli di allocazione degli id di pagina per ambiente |
| `melis_cms_site_config` / `_home` / `_langs` | Configurazione del sito, home page per lingua, lingue attive |
| `melis_cms_site_robot` | robots.txt per dominio |
| `melis_cms_mini_tpl_*` | Categorie, template e flag dei mini-template |
| `melis_cms_gdpr_texts` | Testi del banner GDPR per sito / lingua |
| `melis_site_translation` / `_text` | Stringhe di traduzione a livello di sito |

### Table gateway

Ogni tabella è incapsulata da un gateway `MelisEngineTable*` registrato nel service manager
(ad es. `MelisEngineTablePageTree`, `MelisEngineTablePagePublished`, `MelisEngineTablePageSeo`).
Gli altri moduli — legacy o React — devono sempre usare questi gateway, mai SQL grezzo. Il gateway
base fornisce `getEntryById()`, `getEntryByField()`, `save()`, `deleteById()`, `fetchAll()`.

## Esempio

**Leggere una pagina e navigare l'albero:**

```php
$pageSvc = $sm->get('MelisEnginePage');
$page    = $pageSvc->getDatasPage($idPage);            // 'published' (live) by default
$draft   = $pageSvc->getDatasPage($idPage, 'saved');   // draft shown in the React page editor

$tree       = $sm->get('MelisEngineTree');
$children   = $tree->getPageChildren($idPage, 1);       // 1 = published only
$breadcrumb = $tree->getPageBreadcrumb($idPage);
$url        = $tree->getPageLink($idPage, true);        // true = absolute URL
```

**Popolare un menu a tendina delle lingue React da un controller CMS (lato server, delegando all'engine):**

```php
// Inside a MelisReactApi* controller of a CMS module — the React JSON layer
// delegates to the engine; MelisEngine exposes no react-api of its own.
$langTable = $sm->get('MelisEngineTableCmsLang');
$langs     = $langTable->fetchAll()->toArray();   // fills a React language dropdown
```

**Leggere/scrivere tramite un table gateway (mai SQL grezzo):**

```php
$seoTable = $sm->get('MelisEngineTablePageSeo');
$seo      = $seoTable->getEntryByField('plang_page_id', $idPage)->current();
$seoTable->save(['seo_meta_title' => 'New title'], $existingSeoId);  // upsert
```

**Mettere in cache un risultato calcolato:**

```php
$cache = $sm->get('MelisEngineCacheSystem');
$cache->setCacheByKey('mykey', 'my_cache_config', $value);
$value = $cache->getCacheByKey('mykey', 'my_cache_config');
$cache->deleteCacheByPrefix('page_' . $idPage, 'meliscms_page');   // invalidate a page
```

**Mettersi in ascolto di un evento di servizio:**

```php
$sharedEvents->attach('MelisEngine', 'melisengine_page_getdatas_end', function ($e) {
    $p = $e->getParams();   // includes page id and 'results'
    // alter $p['results'] before it is returned
}, 50);
```

**Costruire un content plugin:**

```php
// Subclass MelisTemplatingPlugin, implement front() for live render.
// The base class handles back() (BO container), config XML persistence and preview.
class MyPlugin extends MelisEngine\Controller\Plugin\MelisTemplatingPlugin
{
    public function front(): string
    {
        return $this->getView()->render('my-module/plugin/my-plugin', $this->pluginConfig);
    }
}
```

## Il trio Core / Engine / Front

Il back-office React non modifica il trio; vi si appoggia sopra:

- **MelisEngine** *(questo modulo)* — possiede l'intero modello DB del CMS e lo espone tramite table
  gateway + servizi + cache; definisce `MelisTemplatingPlugin`.
- **MelisFront** — renderizza le pagine a partire dai dati dell'engine (esegue i content plugin) e alimenta
  l'anteprima editabile usata all'interno del back-office (legacy *e* editor di pagine React / strumenti
  iframe).
- **MelisCms** — il back-office CMS; **non possiede tabelle** e modifica tutto attraverso
  l'engine. I suoi strumenti CMS React (`MelisReactApiPage`, `MelisReactApiCmsSites`,
  `MelisReactApiCmsMenuManager`, …) sono i consumatori React elencati sopra.

## File principali

| Ambito | Percorso |
| --- | --- |
| Alias di servizi e gateway, cache | `vendor/melisplatform/melis-engine/config/module.config.php` |
| Servizio dati di pagina | `vendor/melisplatform/melis-engine/src/Service/MelisPageService.php` |
| Servizio albero / link | `vendor/melisplatform/melis-engine/src/Service/MelisTreeService.php` |
| Orchestratore della cache | `vendor/melisplatform/melis-engine/src/Service/` (`MelisEngineCacheSystem*`) |
| Classe base dei plugin di templating | `vendor/melisplatform/melis-engine/src/Controller/Plugin/MelisTemplatingPlugin.php` |
| Table gateway | `vendor/melisplatform/melis-engine/src/Model/Tables/` |
| Schema + migrazioni delta | `vendor/melisplatform/melis-engine/install/sql/` |

Vedi anche: [MelisFront](/it/reference/modules/melis-front) · [MelisCms](/it/reference/modules/melis-cms) · [MelisCore](/it/reference/modules/melis-core)
