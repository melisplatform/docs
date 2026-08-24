# MelisCmsShare

> Inietta i meta tag di condivisione sui social e Open Graph nell'`<head>` front-office di una pagina CMS, gestiti da un back-office React nativo. Pacchetto `melisplatform/melis-cms-share`.

## Scopo

`MelisCmsShare` consente a un redattore di impostare cinque valori per pagina — **titolo, descrizione, immagine, tipo e URL** —
e li scrive nell'`<head>` della pagina renderizzata come tre famiglie di meta tag: **Twitter Card**
(`twitter:title/description/image/card`), **schema.org / Google** (attributi `itemprop`) e
**Facebook / Open Graph** (`og:title/description/image/type/url`). Viene memorizzata una riga di dati per
pagina; un tag già presente nel template viene sostituito, altrimenti viene inserito subito dopo
`<head>`. Le pagine senza una riga di condivisione restano inalterate.

In v6 il modulo fornisce un **brick full-React nativo** (non un brick in iframe) che espone questi dati su due
superfici — uno strumento **Open Graph** autonomo e una **scheda Open Graph all'interno dell'editor di pagina CMS** —
entrambi in lettura e scrittura tramite un livello JSON `/melis/react-api/cms-share…`. L'iniettore
`<head>` front-office, il modello dati e i servizi sono invariati rispetto alla v5.

## Come abilitarlo

Aggiungi a `config/melis.module.load.php`:

```php
return [
    'MelisCmsShare',
];
```

Dipendenze: `melisplatform/melis-core`, `melisplatform/melis-engine`, `melisplatform/melis-front`
e `melisplatform/melis-cms`. Il modulo necessita dell'editor di pagina CMS (per la scheda Open Graph e gli eventi
del ciclo di vita della pagina) e della pipeline di render front-office (per l'hook `MvcEvent::EVENT_FINISH`). Entrambe le
superfici React appaiono **solo mentre il modulo è elencato qui** (rilevamento del brick modulare tramite
`GET /melis/react-api/react-modules`).

## Il back-office React

Il brick è un'interfaccia **full-React nativa** con un **interruttore New / Old**: *New* è l'interfaccia React
(predefinita), *Old* renderizza lo strumento legacy in un iframe
(`/melis/react-tool-page?key=melis_cms_share_tool_display`).

| Elemento | Valore |
| --- | --- |
| ID del brick | `cms-share` (rotta `/melis-cms-share/share`, etichetta `Partage`) |
| `forwardKey` | `MelisCmsShare/MelisCmsShareTool` |
| `melisKey` (diritti / iframe vista Old) | `melis_cms_share_tool_display` |
| Chiave scheda editor di pagina | `melis_cms_share_page_edition_tab` (registrata sotto `meliscms_page`) |
| Base API | `/melis/react-api/cms-share` |

**Strumento Open Graph** — Barra laterale → **Site Tools** → **Open Graph**. Elenca la riga di condivisione di ogni pagina con
**schede KPI** (Total shares, Pages covered, Distinct types), una casella di **ricerca** (titolo, URL, tipo,
descrizione, ID pagina), un filtro **All types**, **Reset filters**, un gestore di **Columns**,
**Export**, un aggiornamento e l'interruttore New/Old. Fai clic su un'intestazione di colonna (Page / Title / Type / URL /
Added on) per ordinare; ogni riga ha modifica (matita) ed eliminazione (cestino).

![Lo strumento React Open Graph: schede KPI (Total / Pages covered / Distinct types), ricerca, un filtro per tipo, Reset filters, gestore Columns, Export, l'interruttore New/Old e un aggiornamento — ogni riga mostra Page, Title, Type, URL, Added on con azioni di modifica ed eliminazione per riga](/screenshots/react/melis-cms-share/meliscmsshare-tool-opengraph-list.png)

**Modulo di modifica** — Page ID (obbligatorio), Type (`article`, `website`…), Title (`og:title`), URL
(`og:url`), un pannello Image (anteprima + Replace / Remove; JPG, PNG, GIF, WEBP — max 15 MB) e una
Description (`og:description`). L'immagine viene caricata per prima (multipart) in
`/media/melisCmsShare/<pageId>/…`, poi il suo percorso viene memorizzato al **Save**.

![Il modulo di condivisione React — Page ID, Type, Title, URL, un pannello immagine con il percorso memorizzato (`/media/melisCmsShare/<pageId>/…`) più Replace/Remove, e un'area di testo Description](/screenshots/react/melis-cms-share/meliscmsshare-tool-opengraph-edit.png)

**Scheda Open Graph nell'editor di pagina CMS** — apri una pagina CMS e seleziona la scheda **Open Graph** per modificare
inline i metadati di condivisione di quella singola pagina (Title, Type, URL, Image, Description); il Page ID è
implicito. La scheda **non ha un proprio pulsante Save** — i valori vengono persistiti dal
Save / Publish dell'editor di pagina tramite un hook di salvataggio, esattamente come la scheda Share legacy.

![L'editor di pagina CMS con la scheda Open Graph attiva (accanto a Edition, Properties, SEO, Languages, Historic, Page Analytics e altro) — Title, Type, URL, pannello immagine e Description, salvati tramite i pulsanti Save/Publish in alto della pagina](/screenshots/react/melis-cms-share/meliscmsshare-pageedition-tab-opengraph.png)

## API React

Le rotte si trovano in `config/react-api.php` (unite tramite `MelisCmsShare\Module::getConfig()`); controller
`MelisCmsShare\Controller\MelisReactApiShareController`. Tutte sotto `/melis/react-api/cms-share` con
il contratto `{ success, data, error }`.

| Metodo e URL | Guardia | Scopo |
| --- | --- | --- |
| `GET /cms-share` | access + `list` | Elenco keyset (`limit`, `search`, `type`, `page`, `sort`, `dir`, `after`) → `{items,total,nextCursor}` |
| `GET /cms-share/stats` | access + `list` | KPI `{total, pages, types}` |
| `GET /cms-share/types` | access + `list` | Valori distinti di `mcs_type` (opzioni di filtro) |
| `GET /cms-share/:id` | access + `edit` | Una riga di condivisione |
| `GET /cms-share/by-page/:idPage` | solo auth | La condivisione della pagina (per la scheda dell'editor di pagina); `data:null` se assente |
| `POST /cms-share/save` | access + `create`/`edit` | Crea / aggiorna (`{id?, pageId, title, type, url, img, description}`); autore forzato lato server; cache di pagina invalidata |
| `POST /cms-share/upload-image` | access + `edit` | Caricamento multipart (`pageId`, `image`) → `{path}` sotto `/media/melisCmsShare/<pageId>/…` |
| `DELETE /cms-share/delete/:id` | access + `delete` | Elimina una riga; cache di pagina invalidata |

Il controller comunica con `melis_cms_share` **direttamente tramite SQL parametrizzato**, riproducendo le regole
di business legacy (ID pagina obbligatorio, autore forzato all'utente corrente in creazione, allow-list immagini
jpg/jpeg/png/gif/webp/ico/bmp ≤ 15 MB mantenuta come unico file sotto `/media/melisCmsShare/<pageId>/`,
invalidazione della cache di pagina front-office affinché i tag `<head>` si aggiornino). Il `MelisCmsShareService`
di livello superiore non viene usato da questo controller. Ogni fetch invia `X-Requested-With: XMLHttpRequest` e
`credentials:'include'`.

## Capacità

Dichiarate in `config/react.capabilities.php` sotto il nodo portatore di diritti
`melis_cms_share_tool_display` (lo stesso nodo usato dalla guardia di accesso del controller):

```
melis_cms_share_tool_display → list · create · edit · delete · export
```

`MelisCan('melis_cms_share_tool_display', cap)` controlla i pulsanti della UI; lato server ogni azione chiama
`denyUnlessAccess()` (auth + `MelisCoreRights::canAccess(...)` → 401/403) poi `denyUnlessCan(cap)`.
La scheda dell'editor di pagina è un contributo **modulare** separato: lo stesso file unisce una voce `tabs`
sotto `meliscms_page` (chiave `melis_cms_share_page_edition_tab`, corrispondente alla chiamata `registerPageTab(...)`
nel brick), così MelisCms mostra il pulsante della scheda.

## Servizi chiave

| Alias del servizio | Ruolo |
| --- | --- |
| `MelisCmsShareService` | CRUD completo per i record di condivisione: `saveShare($data)`, `deleteShare()`, `getShareById()`, `getShareByPageId($idPage)`, `getAllShare()`, `searchShare()`, `countAllShare()`, `countFilteredShare()`. |
| `melisCmsShareTable` | Table gateway per `melis_cms_share` (`MelisCmsShareTable`). Cerca la riga di una pagina con `getEntryByField('mcs_page_id', $idPage)`. |

## Front office

Non è esposto alcun view helper o plugin di templating. I tag di condivisione vengono iniettati da
`MelisCmsShare\Listener\MelisCmsShareMetaPageListener`, agganciato in `src/Module.php` e attivato su
**`MvcEvent::EVENT_FINISH`** con priorità **110**:

1. Salta le richieste non-PHP/asset (regex sull'URI) e le richieste prive di un `idpage`.
2. Carica la riga di condivisione della pagina tramite `melisCmsShareTable->getEntryByField('mcs_page_id', $idPage)`.
3. Per ogni campo non vuoto, esegue un `preg_replace` del tag esistente oppure lo inserisce dopo `<head>` —
   attraverso tutte e tre le famiglie (Twitter Card, `itemprop`, `og:`).
4. Applica l'escape dei valori con `addslashes`, antepone `scheme://host` agli URL delle immagini, riscrive tramite
   `$response->setContent()`.

Poiché opera sulla stringa HTML già renderizzata alla fine del ciclo di vita MVC, può
sostituire i tag già emessi da un template.

> **Avvertenza sul tipo:** l'unico campo `mcs_type` alimenta sia `twitter:card` che `og:type`, che si aspettano
> vocabolari diversi (`summary`/`summary_large_image` contro `website`/`article`). Usa un valore
> accettabile da entrambi, oppure accetta che uno sia non canonico.

## Listener del ciclo di vita della pagina

| Listener | Evento/i | Scopo |
| --- | --- | --- |
| `MelisCmsSavePageListener` | `meliscms_page_save_start`, `meliscms_page_publish_start` | Mantiene coerente il record di condivisione quando una pagina CMS viene salvata o pubblicata. |
| `MelisCmsShareDeletePageListener` | `meliscms_page_delete_end` | Elimina la riga `melis_cms_share` quando la sua pagina viene eliminata (nessun dato di condivisione orfano). |
| `MelisCmsShareFlashMessengerListener` | Eventi di salvataggio/eliminazione BO | Feedback flash del back-office dopo il salvataggio o l'eliminazione. |

## Tabelle del database

| Tabella | Contiene |
| --- | --- |
| `melis_cms_share` | Una configurazione di condivisione per pagina. PK `mcs_id`. Colonne: `mcs_page_id`, `mcs_title`, `mcs_description`, `mcs_img`, `mcs_type`, `mcs_url`, `mcs_add_user_id`, `mcs_date_added`. La tabella effettua un join con l'utente BO per esporre `mcs_share_added_by` (nome completo). |

## Esempio

```php
// Read the share config for a given page
$share = $serviceManager->get('MelisCmsShareService')->getShareByPageId($pageId);

// Persist a share config for a page (create or update)
$serviceManager->get('MelisCmsShareService')->saveShare([
    'mcs_page_id'      => $pageId,
    'mcs_title'        => 'My page title for social',
    'mcs_description'  => 'A short description shown in link previews.',
    'mcs_img'          => '/path/to/preview-image.jpg',
    'mcs_type'         => 'summary_large_image',
    'mcs_url'          => 'https://example.com/my-page',
    'mcs_add_user_id'  => $currentUserId,
]);
```

## File chiave

| Ambito | Percorso |
| --- | --- |
| Modulo / bootstrap | `vendor/melisplatform/melis-cms-share/src/Module.php` |
| Rotte API React + invokable | `vendor/melisplatform/melis-cms-share/config/react-api.php` |
| Capacità React + scheda di pagina | `vendor/melisplatform/melis-cms-share/config/react.capabilities.php` |
| Controller API React | `vendor/melisplatform/melis-cms-share/src/Controller/MelisReactApiShareController.php` |
| Controller BO legacy (vista Old) | `vendor/melisplatform/melis-cms-share/src/Controller/MelisCmsShareToolController.php` |
| Sorgente del brick React | `vendor/melisplatform/melis-cms-share/ui-react/src/` (`brick.tsx`, `SharePage.tsx`, …) |
| Brick compilato + manifest | `vendor/melisplatform/melis-cms-share/public/ui-react/` (`brick.js`, `brick.manifest.json`) |
| Iniettore `<head>` front-office | `vendor/melisplatform/melis-cms-share/src/Listener/MelisCmsShareMetaPageListener.php` |
| Servizio | `vendor/melisplatform/melis-cms-share/src/Service/MelisCmsShareService.php` |
| Tabella | `vendor/melisplatform/melis-cms-share/src/Model/Tables/MelisCmsShareTable.php` |

Vedi anche: [MelisCms](/it/reference/modules/melis-cms) · [MelisCmsPageAnalytics](/it/reference/modules/melis-cms-page-analytics) · [Riferimento moduli](/it/reference/modules)
