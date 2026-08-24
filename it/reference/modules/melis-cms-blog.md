# MelisCmsBlog

> Sistema di blog per i siti Melis, con un back-office React nativo per la gestione degli articoli e tre
> plugin di visualizzazione front-office. Pacchetto `melisplatform/melis-cms-blog`.

## Scopo

MelisCmsBlog fornisce uno strumento **Blog** nel back-office dove i redattori creano e gestiscono articoli
di blog multilingua (titoli, sottotitolo, fino a quattro paragrafi in testo formattato, immagini, documenti,
pianificazione di pubblicazione/rimozione, uno slider opzionale e URL SEO + meta). Gli articoli vengono
esposti sul front office tramite tre plugin di templating pronti all'uso: un'anteprima degli ultimi articoli,
un elenco di articoli paginato e filtrabile, e una vista di dettaglio del singolo articolo. Gli URL ottimizzati
per la SEO, i meta tag per articolo e i redirect 301 automatici verso l'URL canonico sono gestiti da listener
di eventi dedicati.

Nel back-office React v6 (`/melis-react`) il modulo include un **brick React nativo completo** — una vera
interfaccia React per elencare e modificare gli articoli, supportata da un livello JSON `react-api` — con un
toggle **New / Old** che può ricadere sullo strumento legacy in un iframe. È il gemello architetturale di
MelisCmsNews. Il framework, i servizi, il modello dati, il routing SEO e i plugin front sono invariati rispetto
alla v5; è nuovo solo il livello di visualizzazione del back-office.

## Attivazione

Aggiungere a `config/melis.module.load.php`:

```php
return [
    'MelisCmsBlog',
];
```

Richiede `melis-core` e `melis-cms`, PHP `^8.1|^8.3|^8.4`. Le integrazioni opzionali si attivano quando sono
installati anche `MelisCmsComments`, `MelisCmsSlider`, `MelisSmallBusiness` o `MelisCmsUserAccount`. Il brick
compare nella barra laterale React solo se il modulo è presente (rilevamento modulare dei brick tramite
`GET /melis/react-api/react-modules`).

## Servizi principali

Registrati come alias `service_manager` in `config/module.config.php`. Il controller React riutilizza queste
stesse regole di business lato server, mantenendo la parità con lo strumento legacy.

| Alias del servizio | Ruolo |
| --- | --- |
| `MelisCmsBlogService` | Servizio principale CRUD/query. Legge, crea, aggiorna ed elimina gli articoli; interroga per sito, lingua, intervallo di date, stato, autore. Ogni metodo scatena eventi `*_start` / `*_end` tramite `MelisEngineGeneralService`. |

Alias dei table gateway: `MelisCmsBlogTable`, `MelisCmsBlogTextsTable`.

## Tabelle del database

Struttura di base in `install/sql/setup_structure.sql`; migrazioni in `install/dbdeploy/`.

| Tabella | Contenuto |
| --- | --- |
| `melis_cms_blog` | Riga principale dell'articolo: stato, date di pubblicazione/rimozione, id del sito, image1-3, documents1-3, id dello slider |
| `melis_cms_blog_texts` | Testi per lingua: titolo, sottotitolo, paragrafi 1-4, id lingua, URL SEO, meta title/description SEO, account autore |

> A differenza di MelisCmsNews, il blog **non ha né categorie né tag** — nessuna tabella di collegamento e
> nessun supporto per `melis_cms_tag*`.

## Back-office React

Barra laterale → gruppo **MelisCms** → **Blog** (`fa-rss`). Il brick si apre come scheda principale denominata
**Blog** e disegna la propria barra di sotto-schede interna allo strumento: una sotto-scheda per ogni articolo
aperto, più un ritorno all'elenco. Ogni articolo aperto rimane montato, così il passaggio tra articoli è
istantaneo.

### L'elenco degli articoli

L'elenco React mostra ogni articolo della piattaforma, con **schede KPI** (Totale articoli, Pubblicati, Non
pubblicati), una casella di **ricerca** con filtri **All / Active / Inactive**, un gestore di **Colonne**
(nascondi/riordina), un pulsante di **Esportazione** (xlsx/csv), paginazione keyset e **modifica** / **elimina**
per riga. Fare clic sull'intestazione di una colonna per ordinare. **+ New post** avvia un editor vuoto.

![L'elenco Blog React: schede KPI (Totale articoli / Pubblicati / Non pubblicati), una casella di ricerca con filtri All / Active / Inactive, un gestore di Colonne, un pulsante di Esportazione, il toggle New/Old e il pulsante "+ New post", con azioni di modifica ed eliminazione per riga](/screenshots/react/melis-cms-blog/meliscmsblog-tool-blog-list.png)

Un toggle **New / Old** (in alto a destra) commuta l'elenco — e solo l'elenco — tra l'interfaccia React e lo
strumento legacy renderizzato in un iframe (`/melis/react-tool-page?key=meliscmsblog_left_menu`), così da poter
confrontare le due interfacce affiancate.

### L'editor degli articoli

Dove lo strumento legacy usava schede principali separate (Properties / Texts / Medias), l'editor React è una
singola pagina scorrevole: un'ampia **colonna dei contenuti** a sinistra e una **barra laterale delle
impostazioni** comprimibile a destra. Un **selettore di lingua** in alto contiene tutte le traduzioni
contemporaneamente — tutte le lingue vengono salvate insieme in un'unica chiamata.

**Colonna dei contenuti**

- **Titolo / Sottotitolo** — testo semplice, per lingua.

![Il selettore di lingua dell'editor degli articoli (English / Français / Español), i campi Titolo e Sottotitolo e il BODY con fino a 4 paragrafi in testo formattato (TinyMCE) — ciascuno nella propria scheda riordinabile tramite trascinamento con un contatore di paragrafi](/screenshots/react/melis-cms-blog/meliscmsblog-tool-blog-edit-tab-texts.png)

- **Body** — fino a **4 paragrafi in testo formattato (TinyMCE)** (`cblog_paragraph1..4`), riordinabili tramite
  trascinamento, con **+ Add paragraph (max. 4)**.
- **Media** — fino a **3 immagini** (Replace / Remove per slot) e fino a **3 file allegati**. Compare solo
  **dopo il primo salvataggio**, poiché i caricamenti richiedono che l'articolo esista già.

![L'area Media — Immagini (max. 3, con Replace/Remove per slot) e file allegati (max. 3, "Click to attach a file")](/screenshots/react/melis-cms-blog/meliscmsblog-tool-blog-edit-tab-medias.png)

- **Comments** — un pannello di moderazione nativo (aggiungi/modifica, approva/rifiuta/elimina, paginato),
  mostrato solo quando **MelisCmsComments** è installato.

**Barra laterale delle impostazioni** (sezioni comprimibili)

- **Status** — un toggle Published / Unpublished, più un pulsante **Workflow** (validazione) quando
  **MelisSmallBusiness** è attivo.

![La parte superiore della barra laterale delle impostazioni — il toggle Published con un pulsante Workflow, i selettori di data e ora Publish on / Unpublish on e il selettore del sito](/screenshots/react/melis-cms-blog/meliscmsblog-tool-blog-edit-tab-properties.png)
- **Publication** — selettori di data e ora **Publish on** / **Unpublish on**.
- **Site** — il sito a cui appartiene l'articolo (obbligatorio).
- **Author** — un selettore di autore, mostrato solo quando **MelisCmsUserAccount** fornisce la colonna
  `cblog_author_account`.
- **Comments validation** — un toggle "i commenti front-office restano nascosti fino all'approvazione" più un
  interruttore specifico del blog "Account required to comment", mostrato quando **MelisCmsComments** è attivo.
- **SEO** — Meta title, Meta description e **URL** semplificato, per lingua (memorizzati nella tabella dei
  testi, non in una tabella SEO dedicata).
- **Slider** — uno slider da mostrare con l'articolo, mostrato solo quando **MelisCmsSlider** è attivo.

Le sezioni opzionali vengono rilevate a runtime tramite feature detection (gli endpoint companion rispondono
404 in modo controllato; lo stato del modulo viene letto da `/melis/react-api/react-modules`), così un modulo
companion mancante non interrompe mai un salvataggio. **Save** (in alto a destra) persiste ogni traduzione,
SEO, date, collegamenti media, slider e autore in un'unica chiamata. Un'area di **Preview** renderizza poi
l'articolo salvato sulla sua pagina di dettaglio in un iframe.

![La barra laterale delle impostazioni ampliata — un toggle Comments validation, il toggle "Account required to comment" specifico del blog, poi le sezioni comprimibili SEO e Slider](/screenshots/react/melis-cms-blog/meliscmsblog-tool-blog-edit-tab-properties-with-overrides.png)

## API React

Le rotte si trovano in `config/react-api.php` (unite tramite `MelisCmsBlog\Module::getConfig()`), montate sotto
`/melis/react-api/…`. Controller: `MelisCmsBlog\Controller\MelisCmsBlogReactApiController`. Contratto
`{ success, data, error }`; ogni fetch invia `X-Requested-With: XMLHttpRequest` e `credentials:'include'`.

| Metodo e URL | Scopo |
| --- | --- |
| `GET /blog` | Elenca gli articoli (keyset: `limit`, `search`, `status`, `siteId`, `sort`, `dir`, `after`) → `{items,total,nextCursor}` |
| `GET /blog/stats` | KPI `{total, published, draft}` |
| `GET /blog/:id` | Un articolo (`?langId=` → quella traduzione; campi base + paragrafi + media + SEO + slider/autore) |
| `POST /blog/save` | Crea / aggiorna (tutte le traduzioni, status, siteId, date, sliderId, authorId, flag dei commenti, seo) |
| `DELETE /blog/delete/:id` | Elimina un articolo e i suoi testi |
| `GET /blog/preview/:id` | URL di anteprima + elenco delle pagine BLOG_DETAIL per il sito dell'articolo |
| `GET /blog/users` | Utenti front-office come autori (`MelisCmsUserAccount`) |
| `GET /blog/:id/comments` | Commenti di un articolo (404 se `MelisCmsComments` è disattivato) |
| `POST /blog/comments/save` | Aggiunge/modifica un commento |
| `POST /blog/comments/approve/:cid` · `/refuse/:cid` | Modera un commento |
| `DELETE /blog/comments/delete/:cid` | Elimina un commento |
| `GET /blog-sites` | Elenco dei siti |
| `GET /blog-languages` | Lingue CMS (`melis_cms_lang`) |

**Non esistono rotte `/blog/categories` o `/blog/tags`**. Gli slider provengono dalla rotta `GET /melis/react-api/sliders`
del brick MelisCmsSlider. Il caricamento/rimozione dei media e la ricerca dell'autore dei commenti riutilizzano
gli endpoint **legacy** (nessuna modifica al backend):

- `POST /melis/MelisCmsBlog/MelisCmsBlog/saveFileForm` — caricamento multipart di immagini/file
- `POST /melis/MelisCmsBlog/MelisCmsBlog/removeAttachFile` — svuota la colonna ed elimina il file

### Capacità

Dichiarate in `config/react.capabilities.php` sotto il nodo dei diritti `meliscmsblog_left_menu`:

```
meliscmsblog_left_menu
└─ actions: list · create · edit · delete · export
```

React regola l'interfaccia tramite `window.__melisUseCaps('meliscmsblog_left_menu').can(cap)` (New post →
`create`, Export → `export`, azioni di riga → `edit`/`delete`, corpo dell'elenco → `list`). Lato server, ogni
azione del controller è protetta da `denyUnlessAccess()` (auth + `canAccess`) e poi da `denyUnlessCan(cap)`.

## Manifest del brick

`public/ui-react/brick.manifest.json` (bundle Vite IIFE, React/ReactDOM esternalizzati verso i global host):

```json
{ "id": "blog", "route": "/melis-cms/blog", "label": "Blog",
  "forwardKey": "MelisCmsBlog/MelisCmsBlogList", "melisKey": "meliscmsblog_left_menu",
  "entry": "brick.js", "persistent": true, "subTabs": true }
```

`forwardKey` mappa il nodo del menu di sinistra legacy sulla rotta ad albero `/melis-cms/blog` (deep-linkabile
come `/melis-cms/blog/:id`, usata dall'occhio Workflow). `subTabs: true` significa che il brick disegna la
propria barra di sotto-schede interna allo strumento. Quando MelisSmallBusiness è attivo, la sezione Status
renderizza il `window.__melisWorkflowModal` mutualizzato con `ctx.wfType = 'BLOG'`. Un modulo opzionale può
aggiungere azioni per paragrafo tramite `window.__melisBlogExtensions.renderParagraphActions(...)`.

## Front office

Tre plugin di templating estendono `MelisTemplatingPlugin`, ciascuno con un controller plugin e un file di
configurazione sotto `config/plugins/`. Tutti leggono l'id dell'articolo attivo dal parametro di query
`?blogId`. Nell'editor di pagina React vengono trascinati dal gruppo **Melis Cms Blog** nel pannello dei plugin,
e ciascuno apre la classica finestra modale di configurazione a schede.

![L'editor di pagina React con il pannello dei plugin aperto — il gruppo "Melis Cms Blog": Latest blog posts, Blog post list, Blog post details](/screenshots/react/melis-cms-blog/meliscmsblog-page-plugins-menu.png)

| Classe del plugin | Chiave di config | Vista | Schede di config |
| --- | --- | --- | --- |
| `MelisCmsBlogLatestBlogPlugin` | `MelisCmsBlogLatestBlog` | `MelisCmsBlog/latest-blog` | Properties, Filters |
| `MelisCmsBlogListBlogPlugin` | `MelisCmsBlogListBlog` | `MelisCmsBlog/blog-list` | Properties, Pagination, Filters |
| `MelisCmsBlogShowBlogPlugin` | `MelisCmsBlogShowBlog` | `MelisCmsBlog/blog-details` | Properties |

Parametri di configurazione dei plugin: `template_path`, `site_id`, `pageIdBlog` (link alla pagina di dettaglio),
`column`, `order`, `limit`, `date_min`, `date_max`, `search`; più `nbPerPage` / `nbPageBeforeAfter` (solo Blog
list). Il plugin Blog list filtra anche per `?authorId`. Il plugin Blog details ricade sull'articolo pubblicato
più recente quando nella richiesta non è presente alcun `blogId`, e supporta la modalità di anteprima
(`renderMode === 'previewtab'`).

Colonne di ordinamento disponibili: `cblog_id`, `cblog_title`, `cblog_publish_date`, `cblog_creation_date`.

![Plugin Blog list → Properties — Template MelisCmsBlog/blog-list, sito e pagina di dettaglio del blog](/screenshots/react/melis-cms-blog/meliscmsblog-page-plugin-bloglist-config-properties.png)

![Plugin Latest blog → Filters — Sort (Blog publish date), Order, Limit, data From/To e Default search](/screenshots/react/melis-cms-blog/meliscmsblog-page-plugin-latestblog-config-filters.png)

![Plugin Blog details → Properties — Template MelisCmsBlog/blog-details e un selettore Default post](/screenshots/react/melis-cms-blog/meliscmsblog-page-plugin-blogdetails-config-properties.png)

### Routing SEO

Gli articoli vengono serviti tramite una pagina di tipo **`BLOG_DETAIL`** che ospita il plugin Blog details,
all'URL `cblog_seo_url` dell'articolo. Quattro listener implementano l'intera pipeline SEO:

| Listener | Evento | Ruolo |
| --- | --- | --- |
| `MelisCmsBlogSEOReformatToRoutePageUrlListener` | `EVENT_ROUTE` | Fa corrispondere l'URL SEO e costruisce una rotta verso la pagina BLOG_DETAIL |
| `MelisBlogSEODispatchRouterRegularUrlListener` | `EVENT_DISPATCH` | Reindirizza con 301 un URL non canonico verso il `cblog_seo_url` dell'articolo |
| `MelisCmsBlogRedirect301Listener` | `meliscmsblog_redirect_page` | Imposta i meta SEO della pagina dai campi meta dell'articolo |
| `MelisCmsBlogSEOMetaPageListener` | `EVENT_FINISH` | Riscrive i `<title>` / `<meta description>` renderizzati con i meta SEO dell'articolo |

`MelisCmsBlogPreviewTypeListener` registra il tipo di pagina **BLOG_DETAIL** nel form delle proprietà di pagina
(evento `modify_page_properties_form_config`).

## Esempio

```php
$blog = $this->getServiceManager()->get('MelisCmsBlogService');

// Latest 10 published posts for site 1, newest first:
$list = $blog->getBlogList([
    'siteId'   => 1,
    'langId'   => 1,
    'limit'    => 10,
    'orderBy'  => 'cblog_publish_date',
    'orderDir' => 'DESC',
]);

// Fetch one post (with its texts for a given language):
$post = $blog->getBlogById($blogId, $langId);
$txt  = $blog->getPostText($blogId);

// Create / update / delete:
$id = $blog->saveBlog(['cblog_site_id' => 1, 'cblog_status' => 1, ...], $blogId); // null → create
$blog->deleteBlogById($blogId);  // also removes its texts

// Utility:
$pages  = $blog->getBlogDetailsPagesBySite($siteId);       // BLOG_DETAIL-type pages for a site
$isDupe = $blog->checkSeoUrlDuplication($seoUrl, $blogId); // SEO URL uniqueness check
$slug   = $blog->cleanURL($title);                         // slugify (handles accents)

// Posts by a front-account author:
$posts  = $blog->getBlogListByAuthorId($authorId);
```

## Altri listener

| Listener | Evento | Scopo |
| --- | --- | --- |
| `MelisCmsBlogSliderDeletedListener` | `meliscmsslider_delete_slider_end` | Rimuove dagli articoli uno slider eliminato (`cblog_slider_id`) |
| `MelisCmsBlogGdprAutoDeleteActionDeleteListener` | `melis_cms_user_account_gdpr_auto_delete_action_delete` | GDPR: azzera `cblog_author_account` per un account utente eliminato |
| `MelisCmsBlogServiceMicroServiceListener` | `melis_core_microservice_amend_data` | Trasforma i percorsi delle immagini in URL assoluti nei risultati di `getBlogList` per l'output API/microservizio |
| `SiteMenuBlogDataListener` | `MelisFrontMenuPlugin_melistemplating_plugin_end` | Alimenta gli articoli (raggruppati per mese/anno) nel plugin del menu front |
| `MelisCmsBlogFlashMessengerListener` | `meliscmsblog_delete_blog_end`, `meliscmsblog_save_blog_*_end` | Feedback flash-messenger per le azioni del blog |

## File principali

| Ambito | Percorso |
| --- | --- |
| Config del modulo (servizi, gateway, plugin) | `vendor/melisplatform/melis-cms-blog/config/module.config.php` |
| Rotte API React | `vendor/melisplatform/melis-cms-blog/config/react-api.php` |
| Capacità React | `vendor/melisplatform/melis-cms-blog/config/react.capabilities.php` |
| Albero dello strumento di backoffice (legacy / vista Old) | `vendor/melisplatform/melis-cms-blog/config/app.interface.php` |
| Iniezione della scheda dei commenti | `vendor/melisplatform/melis-cms-blog/config/comments.config.php` |
| Config dei plugin | `vendor/melisplatform/melis-cms-blog/config/plugins/` |
| Servizio principale | `vendor/melisplatform/melis-cms-blog/src/Service/MelisCmsBlogService.php` |
| Controller API React | `vendor/melisplatform/melis-cms-blog/src/Controller/MelisCmsBlogReactApiController.php` |
| Plugin front | `vendor/melisplatform/melis-cms-blog/src/Controller/Plugin/` |
| Listener (SEO, GDPR, slider, menu, flash) | `vendor/melisplatform/melis-cms-blog/src/Listener/` |
| Sorgente del brick React | `vendor/melisplatform/melis-cms-blog/ui-react/src/` |
| Brick compilato + manifest | `vendor/melisplatform/melis-cms-blog/public/ui-react/` |
| SQL di installazione | `vendor/melisplatform/melis-cms-blog/install/sql/setup_structure.sql` |

Vedere anche: [melis-cms](/it/reference/modules/melis-cms), [melis-front](/it/reference/modules/melis-front),
[melis-engine](/it/reference/modules/melis-engine), [melis-core](/it/reference/modules/melis-core),
[melis-cms-slider](/it/reference/modules/melis-cms-slider),
[melis-small-business](/it/reference/modules/melis-small-business)
