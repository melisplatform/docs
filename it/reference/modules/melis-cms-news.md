# MelisCmsNews

> Sistema di notizie / blog per i siti Melis, con uno strumento di redazione back-office in React e tre plugin di visualizzazione front-office. Pacchetto `melisplatform/melis-cms-news`.

## Scopo

MelisCmsNews fornisce uno strumento **News** nel back-office in cui i redattori scrivono e gestiscono
articoli di notizie multilingua (titoli, paragrafi in testo formattato, immagini, documenti,
pianificazione di pubblicazione/rimozione e SEO). Gli articoli vengono mostrati nel front office
tramite tre plugin di templating pronti all'uso: un teaser delle ultime notizie, un elenco di notizie
paginato e una pagina di dettaglio del singolo articolo. Gli URL SEO-friendly e i meta tag per
articolo sono gestiti automaticamente tramite listener dedicati.

In Melis v6 lo strumento è distribuito come **brick full-React nativa** nel nuovo back-office
(`/melis-react`): una vera UI React per elencare e modificare gli articoli, che richiama un livello
JSON `react-api`, con un interruttore **New / Old** che può ripiegare sullo strumento classico in un
iframe. Il framework, i servizi, gli eventi, le tabelle e i plugin front sono invariati rispetto alla
v5 — è nuovo solo il livello di presentazione.

## Come abilitarlo

Aggiungi a `config/melis.module.load.php`:

```php
return [
    'MelisCmsNews',
];
```

Richiede `melis-core`, `melis-engine`, `melis-front` e `melis-cms` (`^5.2`), oltre a
`laminas/laminas-paginator`. Le integrazioni opzionali si attivano quando sono installati anche
`MelisCmsSlider`, il modulo di categorie Melis, `MelisCmsTags`, `MelisCmsUserAccount` (autori) o
`MelisCmsComments`. La brick React compare solo mentre il modulo è presente in
`melis.module.load.php` (rilevamento modulare delle brick tramite
`GET /melis/react-api/react-modules`).

## Back-office React

Barra laterale sinistra → **Site Tools** → **News** (`Actualités`). Si apre come scheda principale
chiamata **News** che ospita tutto tramite **sotto-schede** interne allo strumento: l'elenco degli
articoli e una sotto-scheda per ciascun articolo aperto/nuovo con l'editor completo. Ogni sotto-scheda
rimane montata, quindi il passaggio tra articoli è istantaneo. La rotta dell'albero è
`/melis-cms/news` (con `/melis-cms/news/:id` per i deep link, ad esempio l'occhio del Workflow).

### L'elenco degli articoli

![L'elenco News in React — schede KPI (Total articles / Published / Unpublished), una casella di ricerca con i filtri All / Active / Inactive, un gestore Columns, un pulsante Export, l'interruttore New/Old e il pulsante "+ New article", con azioni di modifica ed eliminazione per ogni riga](/screenshots/react/melis-cms-news/meliscmsnews-tool-news-list.png)

L'elenco mostra ogni articolo sulla piattaforma, con:

- **Schede KPI** — Total articles, Published, Unpublished.
- **Ricerca** con i filtri di stato **All / Active / Inactive**, colonne ordinabili, un gestore
  **Columns** (nascondi/riordina), un **Export** (xlsx) e **Reset filters**.
- Per ogni riga **modifica** (apre l'articolo come sotto-scheda) ed **eliminazione**; **+ New article**
  apre un editor vuoto.
- Un interruttore **New / Old** (in alto a destra) che alterna l'elenco tra la UI React e lo strumento
  legacy in un iframe (`/melis/react-tool-page?key=meliscmsnews_left_menu`).

### L'editor degli articoli

Un unico modulo scorrevole: una colonna di contenuto ampia a sinistra, una barra laterale di
impostazioni a destra e un **selettore di lingua** (English / Français) in alto — ogni traduzione è
mantenuta contemporaneamente e salvata insieme in un'unica chiamata.

![L'editor del nuovo articolo — un selettore di lingua, i campi Title e Subtitle, il BODY con un editor di paragrafi WYSIWYG e "Generate with AI", un'area MEDIA bloccata e la barra laterale delle impostazioni (Status, Publication, Site, Author, SEO, Categories, Tags, Slider)](/screenshots/react/melis-cms-news/meliscmsnews-tool-news-new.png)

| Area | Contenuto |
| --- | --- |
| Title / Subtitle | Testo semplice, per lingua |
| Body | Fino a **10 paragrafi in testo formattato (WYSIWYG)**, riordinabili tramite trascinamento, ciascuno con un assistente **Generate with AI** |
| Media | Fino a **3 immagini** e **3 file di documento** — bloccati fino al primo salvataggio dell'articolo |
| Status | Interruttore **Published / Unpublished**, più un pulsante **Workflow** quando MelisSmallBusiness è attivo |
| Publication | Selettori data-ora **Publish on** / **Unpublish on** |
| Site | Il sito a cui appartiene l'articolo |
| Author | Selettore di autore — solo quando `MelisCmsUserAccount` fornisce la colonna `cnews_author_account` |
| SEO | **URL** amichevole, **URL redirect**, **URL 301**, **Meta title**, **Meta description**, **Canonical URL** (per lingua) |
| Categories / Tags / Slider | Sezioni opzionali mostrate solo quando il modulo corrispondente è attivo |
| Comments | Pannello di moderazione nativo (aggiungi / approva / rifiuta / elimina) mostrato solo quando `MelisCmsComments` è attivo |

![Modifica dei testi di un articolo — titolo, sottotitolo e un editor di paragrafi in testo formattato (stile TinyMCE); i paragrafi possono essere aggiunti e riordinati](/screenshots/react/melis-cms-news/meliscmsnews-tool-news-edit-texts.png)

![La parte superiore della barra laterale delle impostazioni — l'interruttore Published con Workflow, le date Publish on / Unpublish on e il selettore Site](/screenshots/react/melis-cms-news/meliscmsnews-tool-news-edit-properties.png)

![L'area Media — Images (max. 3, con Replace/Remove) e File attachments (max. 3), più il pannello di moderazione Comments nativo quando MelisCmsComments è attivo](/screenshots/react/melis-cms-news/meliscmsnews-tool-news-edit-medias.png)

![La sezione SEO — Meta title, Meta description, URL, URL redirect, URL 301 e Canonical URL, per lingua](/screenshots/react/melis-cms-news/meliscmsnews-tool-news-edit-seo.png)

Una volta salvato, un'area **Preview** mostra l'articolo all'interno della sua pagina NEWS_DETAIL in
un iframe, con un'opzione **Display in new tab** e un selettore di pagina quando il sito ha più pagine
di dettaglio.

![L'area Preview — l'articolo salvato mostrato all'interno della sua pagina NEWS_DETAIL, con un pulsante "Display in new tab"](/screenshots/react/melis-cms-news/meliscmsnews-tool-news-edit-preview.png)

### Mostrare le notizie su una pagina

Dall'editor di pagina React (apri una pagina → Edition), apri il pannello dei plugin e trascina
**Latest News**, **News List** o **News Detail** sulla pagina; ciascuno apre la classica finestra
modale di configurazione del plugin Melis (renderizzata all'interno dell'editor React) con le stesse
schede della v5 — vedi [Front office](#front-office).

![L'editor di pagina React con il pannello dei plugin aperto — i blocchi di contenuto News pronti da trascinare sulla pagina](/screenshots/react/melis-cms-news/meliscmsnews-page-menu-plugins-selector.png)

![Plugin Latest News → Properties — Template, Site e News detail page (con un selettore ad albero delle pagine)](/screenshots/react/melis-cms-news/meliscmsnews-page-plugin-latestnews-config-tab-properties.png)

![Plugin News List → Pagination — News per page e il numero di link di pagina da mostrare](/screenshots/react/melis-cms-news/meliscmsnews-page-plugin-newslist-tab-pagination.png)

![Plugin News Detail → Properties — Template (news-details) e un selettore Default news con una scorciatoia allo strumento News](/screenshots/react/melis-cms-news/meliscmsnews-page-plugin-newsdetail-config-tab-properties.png)

## API React

Non esiste alcun **`config/react-api.php`**: le rotte sono dichiarate **inline in
`config/module.config.php`**, annidate sotto il nodo condiviso `melis-react-api` così da essere
montate sotto `/melis/react-api/…`. Controller:
`MelisCmsNews\Controller\MelisCmsNewsReactApiController` (alias invocabile
`MelisCmsNews\Controller\MelisCmsNewsReactApi`). Contratto `{ success, data, error }`.

| Metodo e URL | Scopo |
| --- | --- |
| `GET /news` | Elenca gli articoli (keyset: `limit`, `search`, `status`, `siteId`, `sort`, `dir`, `after`, `langId`) |
| `GET /news/stats` | KPI `{total, published, draft}` |
| `GET /news/:id` | Un articolo (`?langId=` → quella traduzione; base + paragrafi + media + SEO + id categoria/tag) |
| `POST /news/save` | Crea / aggiorna (tutte le traduzioni, SEO, categorie, tag in un'unica chiamata) |
| `DELETE /news/delete/:id` | Elimina un articolo (+ i suoi testi + SEO) |
| `GET /news/categories` | Categorie disponibili (`?langId=&siteId=`) |
| `GET /news/tags` | Tag disponibili (`MelisCmsTags`; vuoto se assente) |
| `GET /news/users` | Utenti front-office come autori (`MelisCmsUserAccount`; vuoto se assente) |
| `GET /news/preview/:id` | URL di anteprima + pagine NEWS_DETAIL per il sito dell'articolo |
| `GET /news/:id/comments` | Commenti di un articolo (404 se `MelisCmsComments` è disattivato) |
| `POST /news/comments/save` | Aggiunge / modifica un commento (BO → approvato) |
| `POST /news/comments/approve/:cid` · `/refuse/:cid` | Modera un commento |
| `DELETE /news/comments/delete/:cid` | Elimina un commento |
| `GET /news-sites` · `GET /news-languages` | Elenco dei siti · lingue CMS |

Il caricamento/rimozione dei media riutilizza gli endpoint **legacy** (nessuna modifica al backend):
`POST /melis/MelisCmsNews/MelisCmsNews/saveFileForm` e `.../removeAttachFile`.

Il controller combina il `MelisCmsNewsService` del modulo (`getNewsById`, `saveNews`,
`deleteNewsById`, `getNewsDetailsPagesBySite`) con SQL parametrizzato diretto (keyset dell'elenco,
statistiche, SEO, tabelle di collegamento categoria/tag) e il `MelisCmsCategory2Service` condiviso; le
colonne/tabelle opzionali vengono rilevate come funzionalità, così un modulo opzionale mancante non
interrompe mai un salvataggio.

### Capacità

Dichiarate in `config/react.capabilities.php` sotto il nodo portatore di diritti
`meliscmsnews_tools_section` (non la chiave manifest/zona `meliscmsnews_left_menu` usata dall'iframe
della vista Old):

```
meliscmsnews_tools_section
└─ actions: list · create · edit · delete · export
```

Ogni azione del controller è protetta due volte — `denyUnlessAccess()` (auth +
`MelisCoreRights::canAccess`) poi `denyUnlessCan(<cap>)`. `saveAction` sceglie tra `create` ed `edit`
in base alla presenza di un id. React protegge il pulsante **+ New article** con `create` e l'elenco
con `list` tramite `window.__melisUseCaps(melisKey)`.

## Servizi principali

Registrati come alias `service_manager` in `config/module.config.php`.

| Alias del servizio | Ruolo |
| --- | --- |
| `MelisCmsNewsService` | Servizio principale di CRUD/query. Legge, crea, aggiorna ed elimina articoli; interroga per sito, lingua, intervallo di date, stato. Ogni metodo genera eventi `*_start` / `*_end` tramite `MelisGeneralService`. |

Alias dei table gateway: `MelisCmsNewsTable`, `MelisCmsNewsTextsTable`, `MelisCmsNewsSeoTable`,
`MelisCmsNewsCategoryTable`, `MelisCmsNewsTagsTable`.

## Front office

Tre plugin di templating estendono `MelisTemplatingPlugin`; ciascuno ha un controller plugin, un view
helper e un file di configurazione sotto `config/plugins/`.

| Plugin | Controller plugin | View helper | Schede di configurazione |
| --- | --- | --- | --- |
| Latest News | `MelisCmsNewsLatestNewsPlugin` | `MelisCmsNewsLatestPlugin` | Properties, Filters |
| News List | `MelisCmsNewsListNewsPlugin` | `MelisCmsNewsListPlugin` | Properties, Pagination, Filters |
| News Detail | `MelisCmsNewsShowNewsPlugin` | `MelisCmsNewsShowNewsPlugin` | Properties |

Parametri di configurazione dei plugin: `template_path`, `site_id`, `pageIdNews` (link alla pagina di
dettaglio), `column`, `order`, `limit`, `date_min`, `date_max`, `search`, più `nbPerPage` /
`nbPageBeforeAfter` (solo News List). La configurazione è persistita nell'XML della pagina tramite
`loadDbXmlToPluginConfig()` / `savePluginConfigToXml()`.

Il routing SEO e i meta tag per articolo sono collegati in `src/Module.php` tramite:
`MelisCmsNewsSEORouteListener`, `MelisCmsNewsRenderPageListener`, `MelisCmsNewsMetaPageListener`,
`MelisCmsNewsSeoRedirectUrlListener`.

## Tabelle del database

Struttura di base in `install/sql/setup_structure.sql`; migrazioni in `install/dbdeploy/`.

| Tabella | Contiene |
| --- | --- |
| `melis_cms_news` | Riga principale dell'articolo: stato, date di pubblicazione/rimozione, sito, image1-3, documents1-3, id dello slider |
| `melis_cms_news_texts` | Testi per lingua: titolo, sottotitolo, paragrafi 1-10, ordine dei paragrafi, lingua |
| `melis_cms_news_seo` | SEO per lingua: URL, redirect, flag 301, meta title/description, canonical |
| `melis_cms_news_category` | Collegamento articolo ↔ categoria (funzionalità categoria opzionale) |

## Esempio

```php
$news = $this->getServiceManager()->get('MelisCmsNewsService');

// Latest 10 published articles for site 1, French, newest first:
$list = $news->getNewsList(
    status: 1, langId: 1, start: 0, limit: 10,
    orderColumn: 'cnews_publish_date', order: 'DESC', siteId: 1
);

// Fetch one article (all languages, or one language):
$all = $news->getNewsById(42);
$fr  = $news->getNewsById(42, 1);

// Create / update / delete:
$id = $news->saveNews($data, $newsId);   // $newsId null → create
$ok = $news->deleteNewsById(42);         // also removes texts + SEO rows

// Utility:
$txt  = $news->getPostText(42);
$pages = $news->getNewsDetailsPagesBySite(1);  // NEWS_DETAIL-type pages for a site
```

Agganciati a un evento di servizio per estendere il comportamento (ad esempio, notificare un indice di
ricerca dopo il salvataggio):

```php
$sharedEvents->attach('MelisCmsNews', 'melis_cms_news_save_news_end', function ($e) {
    $params = $e->getParams(); // includes 'news', 'newsId', 'results'
}, 50);
```

Gli altri identificatori di evento seguono lo stesso schema `melis_cms_news_[method]_start/end`:
`melis_cms_news_get_news_list_*`, `melis_cms_news_get_news_by_id_*`,
`melis_cms_news_get_news_by_id_array_*`, `melis_cms_news__delete_news_by_id_*` (doppio
trattino basso), `melis_cms_news_get_post_text_*`, `melis_cms_news_get_news_details_pages_*`.

## Micro-servizi

`config/app.microservice.php` espone `getNewsList` e `getNewsById` sul bus di micro-servizi Melis con
form e filtri di input generati automaticamente. Le factory di form `MelisCmsNewsSelect` e
`MelisCmsNewsBOSelect` si trovano in `src/Form/Factory/`.

## File principali

| Ambito | Percorso |
| --- | --- |
| Configurazione del modulo + rotte react-api inline | `vendor/melisplatform/melis-cms-news/config/module.config.php` |
| Capacità React | `vendor/melisplatform/melis-cms-news/config/react.capabilities.php` |
| Albero degli strumenti del back-office | `vendor/melisplatform/melis-cms-news/config/app.interface.php` |
| Configurazione della tabella dell'elenco | `vendor/melisplatform/melis-cms-news/config/app.tools.php` |
| Configurazione dei micro-servizi | `vendor/melisplatform/melis-cms-news/config/app.microservice.php` |
| Controller dell'API React | `vendor/melisplatform/melis-cms-news/src/Controller/MelisCmsNewsReactApiController.php` |
| Brick React (sorgente Vite IIFE) | `vendor/melisplatform/melis-cms-news/ui-react/src/` |
| Brick compilata + manifest | `vendor/melisplatform/melis-cms-news/public/ui-react/brick.js` · `brick.manifest.json` |
| Servizio principale | `vendor/melisplatform/melis-cms-news/src/Service/MelisCmsNewsService.php` |
| Plugin front | `vendor/melisplatform/melis-cms-news/src/Controller/Plugin/` |
| View helper | `vendor/melisplatform/melis-cms-news/src/View/Helper/` |
| Listener (SEO, GDPR, pulizia slider) | `vendor/melisplatform/melis-cms-news/src/Listener/` |
| Table gateway | `vendor/melisplatform/melis-cms-news/src/Model/Tables/` |
| SQL di installazione | `vendor/melisplatform/melis-cms-news/install/sql/setup_structure.sql` |
| Migrazioni del DB | `vendor/melisplatform/melis-cms-news/install/dbdeploy/` |

Vedi anche: [melis-cms](/it/reference/modules/melis-cms), [melis-front](/it/reference/modules/melis-front),
[melis-engine](/it/reference/modules/melis-engine), [melis-core](/it/reference/modules/melis-core)
