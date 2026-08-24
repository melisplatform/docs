# Creare un sito web (CMS)

Melis è, prima di tutto, un **CMS**. Questa pagina illustra il modello di contenuto — **siti**,
**pagine**, **template** e **plugin** — e come una pagina viene renderizzata sul front office. È
il modello mentale che ti serve prima di modificare i template o costruire un modulo sito.

::: tip v6 — Back-office React
Melis v6 mantiene lo stesso framework, gli stessi moduli e lo stesso modello di dati descritti qui.
Ciò che è cambiato è l'**interfaccia del back-office**: ora funziona come un'**applicazione React
all'indirizzo `/melis-react`**. Il CMS include strumenti "brick" nativi in React — una **barra
laterale con l'albero delle pagine** più un **editor di pagina a schede** e una serie di strumenti
laterali (Siti, Template, Stili, Lingue…). L'unica eccezione è la scheda **Edition** della pagina,
che carica ancora il classico editor drag-and-drop **in un iframe**. Ogni strumento laterale è
dotato di un interruttore **New / Old** che ti permette di passare allo strumento classico se ti
serve. I concetti riportati di seguito sono invariati; è nuovo solo *dove clicchi*.
:::

## Il modello di contenuto

| Concetto     | Che cos'è | Tabella/e principale/i |
| ------------ | ---------- | ------------- |
| **Site**     | Un sito web. Ha una home page, delle lingue e uno o più domini per ambiente. | `melis_cms_site`, `melis_cms_site_domain` |
| **Page**     | Un nodo nell'albero delle pagine del sito. Ha un tipo (site/folder/page), un template e dei contenuti. | `melis_cms_page_tree`, `melis_cms_page_published`, `melis_cms_page_saved` |
| **Template** | Il layout usato da una pagina — punta a un controller/action/view di un modulo sito. | `melis_cms_template` |
| **SEO**      | Slug dell'URL e meta tag per singola pagina. | `melis_cms_page_seo` |
| **Language** | Una pagina può avere traduzioni collegate tra loro. | `melis_cms_lang`, `melis_cms_page_lang` |

Queste tabelle appartengono a **MelisEngine**, il motore del CMS — l'unica fonte di verità per il
modello pagina/sito. Il back-office React le legge e le scrive solo attraverso i servizi del motore e
i table gateway; non tocca mai lo schema direttamente. Vedi
[MelisEngine](/it/reference/modules/melis-engine).

### Le pagine sono versionate

Ogni pagina esiste in due versioni:

- **Saved** (`melis_cms_page_saved`) — la bozza di lavoro che modifichi nel back-office.
- **Published** (`melis_cms_page_published`) — la versione live servita sul front office.

Modifichi la bozza, poi **pubblichi** quando sei pronto. Il contenuto modificabile della pagina (vedi
*zone* e *plugin* più avanti) è memorizzato nel record della pagina.

## Template

Un **template** (`melis_cms_template`) è il ponte tra una pagina e il codice che la renderizza.
Per il comune tipo di template `ZF2`, memorizza:

- `tpl_zf2_website_folder` — il **modulo sito** (ad esempio `MelisDemoCms`),
- `tpl_zf2_controller`, `tpl_zf2_action` — quale controller/action renderizza la pagina,
- `tpl_zf2_layout` — il layout in cui racchiuderla.

Quindi una pagina → fa riferimento a un template → che instrada verso una view `.phtml` all'interno
di un modulo sito.

Nel back-office React gestisci i template nello strumento laterale **Templates** (§ *Creare un nuovo
sito*) — un elenco e un form nativi in React per nome, tipo, sito, layout, controller e action.

## Contenuto modificabile: zone e plugin

I template espongono due tipi di aree modificabili, tramite i **view helper**:

### `MelisTag` — zone modificabili semplici

Una zona HTML/testo/media con nome che un editor modifica inline (TinyMCE) nel back-office:

```php
<?= $this->MelisTag($this->idPage, 'home-html-1', 'html', '<h1>Default heading</h1>') ?>
```

Il contenuto predefinito viene mostrato finché un editor non lo sovrascrive; il valore salvato è
memorizzato nella pagina.
Helper: `vendor/melisplatform/melis-front/src/View/Helper/MelisTagsHelper.php`.

### `MelisDragDropZone` — plugin di templating

Una zona di rilascio in cui gli editor trascinano i **plugin di templating** — blocchi di contenuto
riutilizzabili (uno slider, un elenco di news, un modulo di contatto):

```php
<?= $this->MelisDragDropZone($this->idPage, 'dragdropzone_home_1') ?>
```

Helper: `vendor/melisplatform/melis-front/src/View/Helper/MelisDragDropZoneHelper.php`.

Un plugin di templating estende `MelisEngine\Controller\Plugin\MelisTemplatingPlugin` e implementa:

- **`front()`** — restituisce i dati/la view renderizzati sul sito live,
- **`back()`** — il form di configurazione mostrato nell'editor del back-office.

`MelisCmsSlider` e `MelisCmsNews` sono buoni plugin di riferimento; usa **MelisTemplatingPluginCreator**
per generare lo scaffold del tuo. Gli editor rilasciano questi blocchi nella scheda **Edition**
dell'editor di pagina — vedi più avanti.

## Come una pagina viene renderizzata sul front office

Il front office è servito da **MelisFront** (il motore che visualizza i siti) sopra a
**MelisEngine** (servizi pagina/dati). Questo rendering è interamente lato server ed è invariato in v6 —
il back-office React si limita a *ospitare* l'anteprima modificabile, non ri-renderizza la pagina nel
browser. In sintesi:

1. Il vhost imposta **`MELIS_MODULE`** → seleziona il **modulo sito** da servire.
2. Un URL come `…/id/5` si risolve nella **pagina con id 5** (rotta in
   `vendor/melisplatform/melis-front/config/module.config.php`). Anche gli URL SEO vengono mappati sugli id delle pagine.
3. **MelisEngine** carica la pagina + il suo template
   (`vendor/melisplatform/melis-engine/src/Service/MelisPageService.php`).
4. Il controller/action `ZF2` del template renderizza la view `.phtml` del modulo sito.
5. Le zone `MelisTag` e i plugin `MelisDragDropZone` vengono popolati dal contenuto pubblicato della pagina.
6. Il risultato viene racchiuso nel layout del sito.

::: tip Modalità di modifica / anteprima
La stessa pagina può essere richiesta in modalità diverse: `…/id/5` (live), `…/id/5/preview` (bozza
salvata), `…/id/5/renderMode/melis` (modifica nel back-office — è ciò che mostra l'iframe Edition).
:::

## Anatomia di un modulo sito

Un **modulo sito** è un normale modulo Laminas che contiene i template, le view e gli asset di un
sito web. Il riferimento è `vendor/melisplatform/melis-demo-cms/` (vedi
[MelisDemoCms](/it/reference/modules/melis-demo-cms)); i siti personalizzati risiedono solitamente sotto
`module/MelisSites/<YourSite>/`:

```
MelisDemoCms/
├── config/
│   ├── module.load.php           # modules this site needs (MelisEngine, MelisFront, plugins…)
│   ├── module.config.php         # routes / controllers / services
│   ├── assets.config.php         # front-office CSS & JS
│   └── melis.plugins.config.php  # templating plugins available to templates
├── src/Controller/               # Home, Contact… (render the template views)
├── view/
│   ├── layout/                   # site layouts
│   └── melis-demo-cms/home/index.phtml   # a page template (uses MelisTag / MelisDragDropZone)
└── public/                       # css / js / images
```

## Lavorare nel back-office React

In v6 costruisci i siti dal **back-office React** all'indirizzo `/melis-react`. Apri la sezione
**MelisCms** nella barra laterale sinistra: mostra il pannello dell'**albero delle pagine** (i tuoi
siti e le loro pagine) più un gruppo **Site Tools**.

![La sezione MelisCms nella barra laterale React — albero delle pagine più Site Tools.](/screenshots/react/melis-cms/meliscms-menu-entry.png)

### L'albero delle pagine

L'albero delle pagine è la mappa dei tuoi siti e di ogni pagina al loro interno. Si trova nella
**barra laterale sinistra**, così resta visibile mentre lavori. Clicca una pagina per aprirla
nell'editor; digita un nome per cercare; fai clic destro su un nodo per aggiungere una pagina figlia,
vederne i dettagli, duplicarla, spostarla o eliminarla. Puoi anche spostare una pagina tramite
drag-and-drop (i diritti lato server decidono cosa puoi spostare).

![L'albero delle pagine React — siti e pagine; clicca per aprire, clic destro per le azioni.](/screenshots/react/melis-cms/meliscms-menu-site-treeview.png)

### L'editor di pagina — inserire contenuto in una pagina

Aprendo una pagina viene mostrato l'editor: una **cornice nativa React** (titolo della pagina +
stato, pulsanti d'azione, barra delle schede) attorno al contenuto della scheda corrente. Le schede
sono **Properties · Edition · SEO · Languages** (più le schede fornite da altri moduli — Historic,
Analytics, Scripts…). I pulsanti d'azione includono **Save**, **Publish**, **See** (Preview / See
online), **Duplicate**, **Erase draft** ed **Delete**.

- **Properties** *(React nativo)* — il nome della pagina, il tipo (Page / Folder / Site), il template
  (layout), la lingua, la visualizzazione nel menu, lo stile e la tassonomia.

  ![La scheda Properties React.](/screenshots/react/melis-cms/meliscms-page-tab-properties.png)

- **Edition** *(editor classico in un iframe)* — riempi la pagina. Viene renderizzata in tempo reale
  e tu **trascini blocchi di contenuto (plugin)** nelle zone del template (le aree `MelisDragDropZone`).
  Questa scheda è il classico editor drag-and-drop caricato all'interno della cornice React, quindi
  il pannello dei plugin, i layout delle drop-zone e gli editor rich-text sono esattamente come prima.

  ![La scheda Edition — pagina live con l'overlay drag-and-drop, all'interno della cornice React.](/screenshots/react/melis-cms/meliscms-page-tab-edition.png)

  ![Il pannello dei plugin — i blocchi di contenuto che puoi rilasciare sulla pagina.](/screenshots/react/melis-cms/meliscms-page-tab-edition-menu-templating-plugins.png)

- **SEO** *(React nativo)* — l'URL descrittivo, i campi meta title/description e i campi di reindirizzamento.
- **Languages** *(React nativo)* — crea e gestisce le versioni linguistiche della pagina.

**Save vs Publish.** *Save* scrive la bozza (Properties + SEO + il contenuto drag-drop, tutto in una
sola azione); *See → Preview* mostra la bozza; *Publish* rende live la bozza corrente; *Erase draft*
ripristina la versione pubblicata. Regola pratica: modifica liberamente, **Save** man mano che
procedi, **Preview** per controllare, poi **Publish**.

### I blocchi di contenuto standard

I blocchi che rilasci sulla pagina nella scheda Edition provengono da **MelisFront**. I più comuni:
un blocco **HTML (Text)** e un blocco **Media** (entrambi modificati **in loco**), più i blocchi di
configurazione impostati tramite un piccolo modale **Properties** — **Menu**, **Breadcrumb**,
**List-from-folder** e il **banner GDPR**. Vedi [MelisFront](/it/reference/modules/melis-front) per il
catalogo completo.

![Un blocco HTML (Text) modificato in loco, con la barra degli strumenti WYSIWYG sulla pagina.](/screenshots/react/melis-front/melisfront-page-plugin-html-tag.png)

## Creare un nuovo sito (panoramica)

Ad alto livello:

1. **Crea il sito** nel back-office — barra laterale → **Site Tools → Sites → + New site**, poi la
   **procedura guidata in 5 passaggi** (Multilingual → Languages → Domains → Module → Summary), che
   crea il sito e la sua home page.

   ![Lo strumento Sites React — ogni riga è un intero sito web, con "+ New site".](/screenshots/react/melis-cms/meliscms-tool-sites-list.png)

2. **Fornisci un modulo sito** sotto `module/MelisSites/<YourSite>/` (controller + template
   `.phtml` + asset).
3. **Dichiara i template** (`melis_cms_template`) che puntano al controller/action del tuo modulo —
   Site Tools → **Templates**.
4. **Costruisci l'albero delle pagine** e assegna i template; aggiungi `MelisTag`/`MelisDragDropZone`
   alle tue view.
5. **Punta un vhost** su `public/` con `SetEnv MELIS_MODULE "<YourSite>"` (vedi
   [Installazione](/it/guide/getting-started)).
6. **Pubblica** e naviga il front office.

Una volta che un sito esiste, aprilo dallo strumento Sites per gestirlo tramite schede native React:
**Properties · Module Loading · Domains · Languages · Site Config · Translations · Scripts**. La
scheda **Module Loading** è dove attivi una funzionalità per un dato sito (con riordino tramite
trascinamento dell'ordine di caricamento).

> Inizia leggendo `vendor/melisplatform/melis-demo-cms/` da cima a fondo — è l'esempio canonico e
> funzionante di ogni concetto presente in questa pagina.

## File principali

| Ambito | Percorso |
| --- | --- |
| Servizi CMS (pagine/siti) | `vendor/melisplatform/melis-cms/src/Service/` |
| Brick CMS React (editor di pagina + strumenti laterali) | `vendor/melisplatform/melis-cms/ui-react/src/` |
| Servizio pagina (engine) | `vendor/melisplatform/melis-engine/src/Service/MelisPageService.php` |
| Rendering front | `vendor/melisplatform/melis-front/` |
| Helper delle zone modificabili | `vendor/melisplatform/melis-front/src/View/Helper/` |
| Base dei plugin di templating | `vendor/melisplatform/melis-engine/src/Controller/Plugin/MelisTemplatingPlugin.php` |
| Sito demo di riferimento | `vendor/melisplatform/melis-demo-cms/` |

> I moduli React che possiedono l'interfaccia — [MelisCms](/it/reference/modules/melis-cms),
> [MelisFront](/it/reference/modules/melis-front) e [MelisEngine](/it/reference/modules/melis-engine) —
> documentano per intero gli strumenti, i plugin e il modello di dati.
