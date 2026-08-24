# MelisCmsSlider

> Gestore di slider / carosello per il backoffice — ora un modulo React nativo del back-office — con un plugin di templating per il front-office che consente di visualizzare gli slider nelle pagine. Pacchetto `melisplatform/melis-cms-slider`.

## Scopo

MelisCmsSlider fornisce uno strumento di back-office per costruire **slider** (caroselli con nome
composti da slide ordinate — immagine, titolo, sottotitoli, link) e un blocco di contenuto
`MelisCmsSliderShowSliderPlugin` che visualizza uno slider scelto su qualsiasi pagina di front-office.
Include inoltre un elemento di form **slider picker** riutilizzabile che altri moduli (News, Blog)
integrano per associare uno slider a un elemento di contenuto.

In Melis v6 lo strumento include un **modulo React nativo completo** per il back-office `/melis-react`,
con un interruttore **New / Old** che ricade sullo strumento classico all'interno di un iframe. Il
framework, i servizi, le tabelle del DB e il plugin di front-office rimangono invariati rispetto alla v5.

## Attivazione

Aggiungi a `config/melis.module.load.php`:

```php
return [
    // …
    'MelisCmsSlider',
];
```

Richiede: `melis-core`, `melis-engine`, `melis-front`, `melis-cms`. Il modulo include
`dbdeploy: true`, quindi le sue tabelle vengono create/aggiornate da melis-dbdeploy. Il modulo React è
**vincolato all'attivazione**: compare nel back-office solo finché il modulo è presente in
`melis.module.load.php` (rilevamento modulare dei brick, vedi sotto).

## Back-office React

**Dove:** barra laterale sinistra → gruppo **MelisCms** → **Slider** (rotta ad albero `/melis-cms/slider`).
Si apre come una scheda principale denominata **Slider**. Un interruttore **New / Old** (in alto a destra)
alterna tra l'interfaccia React (*New*, predefinita) e lo strumento legacy in un iframe (*Old*).

Lo strumento è un **drill-down a tre livelli**, esposto come **sotto-schede** native dell'host: elenco
degli slider → le slide di uno slider → il form di una slide.

![Elenco degli slider React con schede KPI, ricerca, gestore delle colonne, Export e l'interruttore New/Old](/screenshots/react/melis-cms-slider/meliscmsslider-tool-slider-list.png)

### Livello 1 — l'elenco degli slider

Elenca ogni slider presente sulla piattaforma (gli slider sono globali; uno slider può essere
facoltativamente collegato a una pagina). L'elenco dispone di **schede KPI** (totale slider, totale
slide, slide attive), una casella di **ricerca**, un gestore delle **Colonne**, un pulsante **Export** e
**Reset dei filtri**; fai clic su un'intestazione per ordinare. Ogni riga offre **apri** (le sue slide),
**rinomina** ed **elimina**.

**+ New slider** apre una finestra modale per il **nome** e una **pagina collegata** facoltativa scelta
dall'albero delle pagine del sito; la stessa modale rinomina uno slider esistente.

![Finestra modale New slider — nome più pagina collegata facoltativa dall'albero delle pagine](/screenshots/react/melis-cms-slider/meliscmsslider-tool-slider-new.png)

### Livello 2 — le slide di uno slider

L'apertura di uno slider aggiunge una sotto-scheda (con **← Back**) che mostra le slide di quello slider:
ordine, stato (verde = attiva), miniatura dell'immagine, titolo, sottotitolo e link. **Trascina una riga
per riordinare**; **+ Add a slide** ne crea una; modifica/elimina per ogni riga.

![Le slide di uno slider — elenco con riordino tramite trascinamento e modifica ed eliminazione per riga](/screenshots/react/melis-cms-slider/meliscmsslider-tool-slider-edit-slidelist-tab-properties.png)

### Livello 3 — modifica di una slide

La modifica (o l'aggiunta) di una slide apre una sotto-scheda annidata con un form React: **Title**,
**Subtitle 1**, due campi **Description (HTML)**, **Link**, un interruttore **Active** e un pannello
**Image** (anteprima, **Choose an image** / **Remove image**; JPG, PNG, GIF o WebP). **Save** salva la
slide. Title e Subtitle 1 sono testo semplice; i due campi Description sono HTML grezzo e si mappano su
`sub2`/`sub3`.

![Form della slide React — titolo, sottotitolo, due descrizioni HTML, link, interruttore Active e pannello immagine](/screenshots/react/melis-cms-slider/meliscmsslider-tool-slider-edit-properties-slide-edit.png)

## API React

Il modulo legge/scrive attraverso un livello JSON sotto `/melis/react-api/sliders` (rotte in
`config/react-api.php`, controller `MelisReactApiCmsSliderController`). Tutte le risposte seguono il
contratto `{ success, data, error }`; ogni fetch invia `X-Requested-With: XMLHttpRequest` con
`credentials: 'include'`.

| Metodo e URL | Scopo |
| --- | --- |
| `GET /sliders` | Elenca gli slider (keyset: `limit`, `search`, `sort`, `dir`, `after`) con `slideCount`. |
| `GET /sliders/stats` | Conteggi KPI `{sliders, slides, active}`. |
| `GET /sliders/:id` | Uno slider `{id, name, pageId, slideCount}`. |
| `POST /sliders/save` | Crea / rinomina uno slider (`{id?, name, pageId?}`). |
| `DELETE /sliders/delete/:id` | Elimina uno slider, le sue slide e i file delle immagini. |
| `GET /sliders/:id/slides` | Le slide ordinate di uno slider. |
| `POST /sliders/slides/reorder` | Riordina (`{sliderId, ids:[…]}`). |
| `POST /sliders/slide/upload` | Caricamento immagine multipart (campo `image`, `?sliderId=`) → `{path}`. |
| `GET /sliders/slide/:id` | Una slide. |
| `POST /sliders/slide/save` | Crea / aggiorna una slide. |
| `DELETE /sliders/slide/delete/:id` | Elimina una slide, ri-sequenzia l'ordine, rimuove la sua immagine. |

Il controller comunica direttamente con le tabelle tramite SQL parametrizzato, riproducendo le regole di
business legacy (nome obbligatorio ≤255, ordine della slide auto = max+1, immagini sotto
`/media/sliders/<sliderId>/…` con estensioni jpg/jpeg/gif/png/webp, controllo safe-URL sul link,
eliminazione a cascata dei file). Il `MelisCmsSliderService` di più alto livello continua a supportare lo
strumento legacy e il plugin di front-office.

## Capability

I diritti avanzati sono dichiarati in `config/react.capabilities.php` sotto il nodo portatore di diritti
`meliscms_slider_tools_section`, rispecchiando i tre livelli. Le stringhe di capability appiattite (ad es.
`list`, `create`, `rename`, `export`, `slides`, `slides.create`, `slides.image.create`) vengono verificate
in React tramite `MelisCan(melisKey, cap)` e lato server tramite `denyUnlessCan(cap)`. Ogni azione del
controller è protetta due volte — un guard di accesso (`denyUnlessAccess()` → 401/403) e poi un controllo
della capability; il resolver delle capability è **default-allow** per le capability non dichiarate.

## Integrazione con l'host

| Aspetto | Come |
| --- | --- |
| Rilevamento / gating | `GET /melis/react-api/react-modules` elenca i moduli attivi che includono un `brick.manifest.json`; l'host carica `brick.js` e monta il brick. La rimozione del modulo nasconde lo strumento. |
| Menu → rotta | `useNavMenu` mappa il `forwardKey` `MelisCmsSlider/MelisCmsSliderList` su `/melis-cms/slider`. |
| Sotto-schede | `subTabs: true` — il brick pilota la barra di sotto-schede nativa dell'host tramite `window.__melisOpenSubTab` / `__melisCloseSubTab` / `__melisUpdateSubTabLabel`; ogni schermata rimane montata (nascosta) affinché lo stato venga preservato. |
| Interruttore New / Old | `window.__melisSetToolView(MELIS_KEY, mode)`; *Old* rende `/melis/react-tool-page?key=MelisCmsSlider_left_menu` in un iframe. |
| i18n | Il brick legge `document.documentElement.lang` e include un dizionario `{fr, en}` interno al file. |

Id del brick `slider` (corrisponde a `brick.tsx` ⇄ `brick.manifest.json`); il bundle è un IIFE Vite con
React esternalizzato verso le globali dell'host, quindi l'interfaccia utilizza stili inline e i18n
interno al file invece di importare i moduli dell'host.

## Servizi principali

Questi continuano ad alimentare lo strumento legacy, i micro-servizi e il plugin di front-office.

| Alias | Ruolo |
| --- | --- |
| `MelisCmsSliderService` | Logica di business per slider e slide; genera eventi `meliscmsslider_*`. |
| `MelisCmsSliderTable` | Table gateway per `melis_cms_slider`. |
| `MelisCmsSliderDetailTable` | Table gateway per `melis_cms_slider_details`. |

`MelisCmsSliderService` estende `MelisGeneralService` ed espone:

| Metodo | Ruolo |
| --- | --- |
| `getSlider($sliderId, $status)` | Uno slider con le sue slide; passa `1` per le sole slide attive. |
| `getSliderByPageId($pageId, $status)` | Slider collegato a un id di pagina, con le sue slide. |
| `getSliderList($start, $limit, $order, $search)` | Elenco paginato/ricercabile degli slider. |
| `getSliderDetails($sliderDetailId)` | Una singola riga di slide. |
| `saveSlider($data, $sliderId)` | Crea o aggiorna uno slider; restituisce l'id dello slider. |
| `saveSliderDetails($slideData, $detailId)` | Crea o aggiorna una slide. |
| `updateSliderDetailsOrdering($detailId, $newOrder)` | Riordina una slide. |
| `deleteSlider($sliderId)` | Elimina uno slider e tutte le sue slide. |
| `deleteSliderDetails($sliderDetailId)` | Elimina una singola slide. |

`getSlider()` / `getSliderByPageId()` restituiscono un'entità `MelisCmsSlider\Entity\MelisCmsSlider` il
cui metodo `getSlider()` fornisce la riga contenitore e `getSliderDetails()` fornisce le slide.

**Nota sulla denominazione degli eventi:** ogni metodo genera eventi
`meliscmsslider_service_*_start` / `_end`, ma diversi metodi di scrittura riutilizzano i nomi degli eventi
di un altro metodo nel sorgente attuale. `saveSlider` genera gli eventi `get_slider_details`, e
`deleteSliderDetails` / `updateSliderDetailsOrdering` riutilizzano gli eventi `delete_details` di
`deleteSlider` — quindi un listener su `meliscmsslider_service_delete_details_end` viene attivato anche
sui riordini.

**Micro-servizi** (`config/app.microservice.php`) espongono `getSliderList`, `getSlider`,
`getSliderDetails`, `getSliderByPageId`.

## Front-office

Dall'**editor di pagine React** (MelisCms → apri una pagina → Edition), apri il pannello dei plugin e
trascina il blocco **Show Slider** sulla pagina; le sue **Properties** ti permettono di scegliere il
template di rendering e lo slider da visualizzare.

![Blocco Show Slider nel selettore dei plugin dell'editor di pagine React](/screenshots/react/melis-cms-slider/meliscmsslider-page-menu-plugins-selector.png)

![Impostazioni del plugin Show Slider — scegli il template e lo slider da visualizzare](/screenshots/react/melis-cms-slider/meliscmsslider-page-plugin-slider-config-properties-tab.png)

| Elemento | Ruolo |
| --- | --- |
| `MelisCmsSliderShowSliderPlugin` (controller plugin) | Recupera lo slider configurato tramite `MelisCmsSliderService` e lo rende attraverso il template scelto. Config: `config/plugins/MelisCmsSliderShowSliderPlugin.config.php` — una scheda **Properties** con `template_path` e `sliderId`. Template predefinito: `view/melis-cms-slider/plugins/showslider.phtml`. |
| `MelisCmsSliderPlugin` (view helper) | `MelisCmsSliderHelper` — rende il plugin da un template phtml. |
| `CmsSliderSelect` (elemento di form) | Select popolata con gli slider disponibili; factory `src/Form/Factory/CmsSliderSelectFactory.php`. Usata nel form delle opzioni del plugin e integrata da News / Blog. |

**Interfacce del picker riutilizzabili:** `meliscmsslider_select_slider` (`renderSelectSliderAction`) per
News, `meliscmsslider_select_slider_blog` per Blog.

**Consumatori:** MelisCmsNews conserva lo slider scelto in `cnews_slider_id` e include un listener che
scollega uno slider eliminato da qualsiasi news che lo utilizza; Blog usa `cblog_slider_id`.

## Tabelle del database

| Tabella | Contiene |
| --- | --- |
| `melis_cms_slider` | Uno slider: `mcslide_id`, `mcslide_name`, `mcslide_page_id`, `mcslide_date`. |
| `melis_cms_slider_details` | Una slide: `mcsdetail_id`, FK `mcsdetail_mcslider_id`, `mcsdetail_status`, `mcsdetail_title`, `mcsdetail_sub1`–`sub3`, `mcsdetail_link`, `mcsdetail_img`, `mcsdetail_order`. |

## Esempio

```php
$slider = $this->getServiceManager()->get('MelisCmsSliderService');

// Fetch one slider with active slides only
$one    = $slider->getSlider($sliderId, 1);

// Fetch the slider tied to a page
$byPage = $slider->getSliderByPageId($pageId, 1);

// Paginated list
$list   = $slider->getSliderList(0, 10, 'mcslide_id', null);

// Create / update
$id     = $slider->saveSlider($data, $sliderId);
$did    = $slider->saveSliderDetails($slideData, $detailId);

// Reorder
$slider->updateSliderDetailsOrdering($detailId, $newOrder);

// Delete slider + all its slides
$slider->deleteSlider($sliderId);
```

Ascolto di un evento di servizio:

```php
$sharedEvents->attach(
    'MelisCmsSlider',
    'meliscmsslider_service_delete_details_end',
    $fn,
    50
);
```

## File principali

| Aspetto | Percorso |
| --- | --- |
| Wiring del modulo | `vendor/melisplatform/melis-cms-slider/config/module.config.php` |
| Rotte API React | `vendor/melisplatform/melis-cms-slider/config/react-api.php` |
| Capability React | `vendor/melisplatform/melis-cms-slider/config/react.capabilities.php` |
| Controller API React | `vendor/melisplatform/melis-cms-slider/src/Controller/MelisReactApiCmsSliderController.php` |
| Brick React | `vendor/melisplatform/melis-cms-slider/ui-react/src/` · `public/ui-react/brick.manifest.json` |
| Interfaccia / strumenti di backoffice | `vendor/melisplatform/melis-cms-slider/config/app.interface.php` · `app.tools.php` |
| Form della slide | `vendor/melisplatform/melis-cms-slider/config/app.forms.php` |
| Config del micro-servizio | `vendor/melisplatform/melis-cms-slider/config/app.microservice.php` |
| Config del plugin di templating | `vendor/melisplatform/melis-cms-slider/config/plugins/MelisCmsSliderShowSliderPlugin.config.php` |
| Servizio | `vendor/melisplatform/melis-cms-slider/src/Service/MelisCmsSliderService.php` |
| Entità | `vendor/melisplatform/melis-cms-slider/src/Entity/MelisCmsSlider.php` |
| Table gateway | `vendor/melisplatform/melis-cms-slider/src/Model/Tables/` |
| Factory del slider picker | `vendor/melisplatform/melis-cms-slider/src/Form/Factory/CmsSliderSelectFactory.php` |
| View helper | `vendor/melisplatform/melis-cms-slider/src/View/Helper/MelisCmsSliderHelper.php` |
| Template di front-office predefinito | `vendor/melisplatform/melis-cms-slider/view/melis-cms-slider/plugins/showslider.phtml` |

Vedi anche: [Riferimento dei moduli](/it/reference/modules) · [Pagina legacy v5](/legacy/reference/modules/melis-cms-slider)
