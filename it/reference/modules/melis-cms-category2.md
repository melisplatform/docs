# MelisCmsCategory2

> Categorie di contenuti multi-sito e multilingua per il CMS, con un back-office React nativo — pacchetto `melisplatform/melis-cms-category2`.

## Scopo

MelisCmsCategory2 fornisce un sistema di categorie gerarchico nel backoffice di Melis. Le categorie formano
un albero (ogni nodo punta a un genitore), portano traduzioni per lingua (nome e descrizione), possono
essere assegnate a uno o più siti, hanno una finestra di validità e uno stato, e possono contenere file multimediali. Il
modulo include un plugin di templating per il front-office che renderizza un albero di categorie in una pagina e un selettore di categorie riutilizzabile incorporato da altri moduli (ad es. News, Commerce) per classificare i loro record.

Nel back-office React v6 (`/melis-react`) lo strumento è distribuito come **brick full-React nativo**: una
vera interfaccia master-detail — albero delle categorie a sinistra, editor a schede a destra — che legge e scrive
tramite il proprio livello JSON `react-api`. Un toggle **New / Old** consente di tornare allo strumento legacy in
un iframe. Il modello di dati sottostante, i servizi e il plugin front sono invariati rispetto alla v5.

## Abilitazione

Aggiungi a `config/melis.module.load.php`:

```php
return [
    'MelisCmsCategory2',
];
```

Richiede `melis-core` e `melis-cms`. Il modulo è abilitato a `dbdeploy`, quindi le sue tabelle vengono create
al momento del deploy. `melis-engine` è necessario per il rendering front. Il brick React appare nella barra laterale
solo finché il modulo è elencato qui (rilevamento modulare dei brick).

## Back-office (React)

**Dove:** barra laterale sinistra → gruppo **MelisCms** → **Categories** (`Catégories`). Si apre come singola
pagina master-detail — non lo slider multi-scheda — alla route `/melis-cms/category-v2`. Il toggle **New / Old**
in alto a destra passa dall'interfaccia React (predefinita) allo strumento classico in un iframe.

![Lo strumento Categories React — master-detail: albero delle categorie a sinistra, editor a schede a destra, toggle New/Old in alto a destra](/screenshots/react/melis-cms-category2/meliscmscategory2-tool-categories-accordionsystem.png)

### Albero delle categorie (pannello sinistro)

La colonna sinistra mostra l'intero albero. La sua barra degli strumenti dispone di un **menu a tendina delle lingue** (bandiere — seleziona in quale
lingua vengono mostrati i nomi dei nodi), un **filtro sito**, un pulsante di **aggiornamento**, una casella di **ricerca**
(pota ma mantiene gli antenati) e **+ New category** (crea una radice/catalogo). Ogni riga mostra un
**indicatore di stato** (verde = attivo, rosso = inattivo), il nome del nodo e — al passaggio del mouse — un **+** (aggiungi
una sotto-categoria) e un **cestino** (elimina). Trascina la maniglia di un nodo per riordinarlo o cambiargli genitore: vicino al bordo
superiore = rilascia prima, bordo inferiore = rilascia dopo (fratello), centro = rilascia all'interno (ultimo figlio). Il trascinamento è
disponibile solo nella vista completa non filtrata. Un nodo con sotto-categorie non può essere eliminato.

![Il pannello albero React — menu a tendina delle lingue, filtro sito, aggiornamento, ricerca, + New category, albero con indicatori di stato e aggiunta/eliminazione per nodo](/screenshots/react/melis-cms-category2/meliscmscategory2-page-plugin-categories-config-properties-search-category.png)

### Editor (pannello destro)

Selezionando un nodo — o cliccando su **+ New category** / il **+** di una riga — si carica l'editor. L'intestazione
mostra il titolo, il suo contesto ("at the root" o "under «parent»") e **Cancel** / **Save**.

- **Scheda Properties** — Nome e Descrizione per lingua (schede lingua con un indicatore pieno/vuoto per
  lingua), un toggle **Status**, date di **Validity** (Start / End) e i **Sites** a cui appartiene la categoria. Il Nome (in almeno una lingua) e almeno un Site sono obbligatori; se entrambe le date sono
  impostate, Start deve precedere End.
- **Scheda Media** — allega **Images** e **Files** (due colonne, ciascuna con **+ Add** ed eliminazione per elemento). Salva prima la categoria prima di aggiungere media.

![Nuova categoria — scheda Properties: schede lingua, Name, Description, toggle Status, date Validity, Sites](/screenshots/react/melis-cms-category2/meliscmscategory2-tool-categories-new-tab-properties.png)

![Editor categoria — scheda Media: griglia Images (+ Add an image) ed elenco Files (+ Add a file)](/screenshots/react/melis-cms-category2/meliscmscategory2-tool-categories-new-tab-media.png)

## React API

Le route risiedono in `config/react-api.php`, servite da
`MelisCmsCategory2\Controller\MelisCmsCategoryReactApiController`, annidate sotto la base back-office del modulo
in modo che il prefisso effettivo sia `/melis/MelisCmsCategory2/react-api`. Ogni risposta
segue il contratto `{ success, data, error }`. Il controller comunica direttamente con le tabelle tramite
SQL parametrizzato, riproducendo le regole di business legacy (nome in ≥1 lingua, ≥1 sito, start ≤ end,
ordine auto = max+1, `-1` = padre radice, nessuna eliminazione di un nodo con figli, eliminazione a cascata di
trans/sites/media, upload media rafforzato).

| Metodo e URL (relativi alla base) | Scopo |
| --- | --- |
| `GET /tree?lang=` | Albero completo delle categorie → `{langId, nodes:[TreeNode]}` (nome risolto alla lingua, fallback contrassegnato) |
| `GET /langs` | Lingue del CMS → `{langs:[{id,locale,name}]}` |
| `GET /sites` | Siti (filtro + form) → `{sites:[{id,name}]}` |
| `GET /category/:id` | Una categoria → `{id,parentId,status,dateStart,dateEnd,sites,translations}` |
| `POST /save` | Crea / aggiorna una categoria → `{id}` |
| `DELETE /delete/:id` | Elimina una categoria (bloccato se ha figli) + ri-sequenzia i fratelli |
| `POST /reorder` | Ri-sequenzia i fratelli di un genitore (`{parentId, orderedIds:[…]}`) — cambia anche il genitore |
| `GET /category/:id/media` | Media della categoria → `{images:[MediaItem], files:[MediaItem]}` |
| `POST /media/upload` | Upload multipart (`catId`, `type` image\|file, `file`) → `{id,type,path,name}` |
| `DELETE /media/delete/:id` | Elimina una riga media + il suo file su disco |

## Capacità

Dichiarate in `config/react.capabilities.php` sotto il nodo **portatore di diritti**
`melis_cms_category_v2_tools_section` (che è anche la `MELIS_KEY` del controller — non la chiave di zona del manifest
`melis_cms_categories_v2`, che punta solo all'iframe *Old*). Ogni azione del controller
protegge l'accesso con `canAccess(MELIS_KEY)`. `Capabilities::flatten()` trasforma l'albero in stringhe
puntate passate a `makeCan(...)` in React:

| Capacità | Controlla |
| --- | --- |
| `tree.create` | Pulsanti "+ New category" e "+" per nodo |
| `tree.order` | Maniglia di trascinamento-riordino (richiede anche la vista non filtrata) |
| `tree.delete` | Cestino per nodo |
| `edition` | Caricamento dell'editor per una categoria esistente (la creazione resta consentita) |
| `edition.properties` | Scheda Properties |
| `edition.media` | Scheda Media |

## Il brick

L'interfaccia è realizzata in `ui-react/` (Vite IIFE, React / ReactRouter esternalizzati alle variabili globali dell'host,
output in `public/ui-react/brick.js` accanto a `brick.manifest.json`). `brick.tsx` registra un
componente instradato sotto l'id brick `category2`.

```json
{
  "id": "category2",
  "route": "/melis-cms/category-v2",
  "label": "Catégories",
  "forwardKey": "MelisCmsCategory2/MelisCmsCategoryList",
  "melisKey": "melis_cms_categories_v2",
  "entry": "brick.js",
  "persistent": true
}
```

| Componente | Ruolo |
| --- | --- |
| `CategoryPage.tsx` | Contenitore: carica langs + sites, (ri)carica l'albero per lingua, possiede il nodo selezionato e il `mode` New/Old, renderizza il layout master-detail + l'iframe *Old* |
| `CategoryTree.tsx` | Pannello sinistro — albero, menu a tendina lingue, filtro sito, ricerca, aggiunta/eliminazione per nodo, trascinamento-riordino / cambio genitore |
| `CategoryEditor.tsx` | Pannello destro — schede Properties + Media, validazione client, errori inline/banner |
| `ViewToggle.tsx` | Toggle New (React) / Old (iframe) |
| `category-api.ts` | Client API tipizzato per gli endpoint sopra |

L'host rileva il brick tramite `GET /melis/react-api/react-modules` e lo monta; `useNavMenu`
mappa la `forwardKey` alla route dell'albero. Il brick legge la lingua attiva da
`document.documentElement.lang` e include un dizionario `{fr,en}` nel file. La logica di business resta
lato server (parità con lo strumento legacy); React è presentazione + chiamate API.

## Servizi principali

| Alias del servizio | Ruolo |
| --- | --- |
| `MelisCmsCategory2Service` | Servizio principale delle categorie: crea/legge nodi categoria, recupero dell'albero, traduzioni e collegamenti ai siti. |
| `MelisCmsCategory2MediaService` | Archiviazione dei file per categoria su disco e nel database. |

Metodi notevoli su `MelisCmsCategory2Service`:

- `getCategoryTreeview($fatherId, $langId, $onlyValid, $siteId)` — albero ricorsivo.
- `getCategoryById($categoryId, $langId, $onlyValid)` — nodo categoria completo.
- `getCategoryNameById($categoryId, $langId)` — ricerca del nome.
- `getCategoriesPerSite($siteId, $langId)`, `getFirstLevelCategoriesPerSite($siteId, $langId)`.
- `saveCategory(...)`, `saveCategoryTexts(...)`, `saveCategorySites(...)` — persiste nodo/traduzione/sito.
- `reOrderCategories($parentId, $currentOrder)` — persiste il trascinamento-riordino.
- `validateDates($dateStart, $dateEnd)`.

`MelisCmsCategory2MediaService` gestisce il lato filesystem: `uploadFile`, `deleteFile`,
`getMediaFilesByCategoryId`, `getFilesInDir`, `removeCategoryDir`.

> Il controller `react-api` React utilizza SQL diretto anziché questi servizi, ma il plugin front
> e il selettore di categorie riutilizzabile chiamano ancora `MelisCmsCategory2Service`.

## Front office

- **Plugin di templating** `MelisCmsCategoryDisplayCategoriesPlugin` — renderizza un albero di categorie in una
  pagina. La sua configurazione espone una scheda Properties con tre campi: `template_path`, `site_id`,
  `category_start`. Template predefinito: `MelisCmsCategory2/default`. Nell'editor di pagina React, trascina
  il blocco **Display Categories** e imposta il template, la categoria di partenza (tree picker) e il sito.
- **View helper** `renderTreeRec` — renderizza ricorsivamente un array di albero di categorie all'interno di una view.

![Impostazioni del plugin Display Categories — Template, Category start (tree picker), Site](/screenshots/react/melis-cms-category2/meliscmscategory2-page-plugin-categories-config-properties.png)

Uso hardcoded:

```php
$display = $this->MelisCmsCategoryDisplayCategoriesPlugin();
echo $display->render([
    'template_path' => ['MelisCmsCategory2/default'],
    'site_id'        => 1,
    'category_start' => 1,
]);
```

## Tabelle del database

| Tabella | Contiene |
| --- | --- |
| `melis_cms_category2` | Nodo categoria: `cat2_id`, `cat2_father_cat_id`, ordine, stato, riferimento, date di validità, audit. |
| `melis_cms_category2_trans` | Traduzione per lingua: nome e descrizione, indicizzata da `catt2_id`. |
| `melis_cms_category2_sites` | Collegamento categoria-sito, indicizzato da `cats2_id`. |
| `melis_cms_category2_media` | Media allegati a una categoria: `catm2_type`, `catm2_path`, `catm2_cat_id`. |

Un nodo radice seed (`cat2_id = 1`, "My catalog" / "Mon catalogue") viene inserito durante l'installazione.

## File chiave

| Ambito | Percorso |
| --- | --- |
| Route React API + controller invocabile | `vendor/melisplatform/melis-cms-category2/config/react-api.php` |
| Dichiarazione delle capacità React | `vendor/melisplatform/melis-cms-category2/config/react.capabilities.php` |
| Controller React API (10 azioni, SQL diretto, rafforzamento upload) | `vendor/melisplatform/melis-cms-category2/src/Controller/MelisCmsCategoryReactApiController.php` |
| Brick React (Vite IIFE) | `vendor/melisplatform/melis-cms-category2/ui-react/` e `public/ui-react/` compilato |
| Manifest del brick | `vendor/melisplatform/melis-cms-category2/public/ui-react/brick.manifest.json` |
| Servizio principale | `vendor/melisplatform/melis-cms-category2/src/Service/MelisCmsCategoryService.php` |
| Servizio media | `vendor/melisplatform/melis-cms-category2/src/Service/MelisCmsCategoryMediaService.php` |
| Plugin di templating | `vendor/melisplatform/melis-cms-category2/src/Controller/Plugin/MelisCmsCategoryDisplayCategoriesPlugin.php` |
| SQL di installazione | `vendor/melisplatform/melis-cms-category2/install/sql/` |

Vedi anche: [melis-cms](/it/reference/modules/melis-cms), [melis-core](/it/reference/modules/melis-core), [melis-cms-news](/it/reference/modules/melis-cms-news)
