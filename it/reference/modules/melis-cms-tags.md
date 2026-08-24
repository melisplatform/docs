# MelisCmsTags

> Sistema condiviso di tag/tassonomia per il CMS — le "etichette" a cui i moduli di contenuto (ad es. News) agganciano i propri elementi, ora con un back-office React nativo. Pacchetto `melisplatform/melis-cms-tags`.

## Scopo

MelisCmsTags fornisce il **sistema di tag (tassonomia)** della piattaforma: tag multilingua (un titolo per
lingua) che altri moduli associano ai propri contenuti. I redattori creano e traducono i tag, vedono quanti
elementi utilizzano ciascun tag ed eliminano quelli inutilizzati. Altri moduli (ad es. MelisCmsNews) si
integrano nel livello di associazione tramite una dichiarazione di configurazione e una singola chiamata al
servizio, rendendo i propri elementi taggabili senza alcuna modifica dello schema del modulo dei tag. Un
plugin di templating front **List Tags** mostra i tag di un sito nel front office.

In **Melis v6** il back-office è un **brick full-React nativo** renderizzato all'interno di `/melis-react`, che
richiama un livello JSON `react-api` di proprietà del modulo. Il modello dati lato server, il servizio, le
tabelle, la configurazione delle associazioni e il plugin front sono invariati rispetto a v5 — solo il livello
di presentazione e navigazione è passato a React.

## Attivazione

Aggiungere a `config/melis.module.load.php`:

```php
return [
    'MelisCmsTags',
];
```

Richiede `melis-core` e `melis-cms`. Il modulo viene fornito con `dbdeploy: true` — le sue tre tabelle vengono
create automaticamente al primo deploy. Il brick React compare nel back-office **solo se il modulo è
attivato** (rilevamento modulare dei brick).

## Dove si trova nel back-office React

Barra laterale sinistra → gruppo **Site Tools** → **Tags** (`fa-tag`). Si apre come scheda superiore denominata
**Tags**. Il `forwardKey` del menu `MelisCmsTags/TagsList` corrisponde alla rotta ad albero `/melis-cms/tags`
(`/melis-cms/tags/:id` per l'editor), dove viene renderizzato il componente `TagsPage`.

Il brick è un'interfaccia **full-React nativa** con un **toggle New / Old** (in alto a destra): *New* è
l'interfaccia React (predefinita), *Old* renderizza lo strumento legacy in un iframe
(`/melis/react-tool-page?key=tags_left_menu`).

## Back-office — elenco ed editor

**Un'unica scheda della shell (`Tags`) con sotto-schede all'interno dello strumento.** L'elenco è la vista
principale; aprire o creare un tag aggiunge una **sotto-scheda di modifica** (`subTabs: true`), rendendo
istantaneo il passaggio tra i tag aperti.

**L'elenco** mostra ogni tag della piattaforma, con:

- **Card KPI** — Totale · Con associazioni · Senza associazione (dall'endpoint `stats`).
- **Ricerca** ("Search a tag…", corrisponde all'id o a un titolo in qualsiasi lingua), **Reset filters**, un
  gestore **Columns** (nascondi/riordina) e un pulsante **Export** (`.xlsx` tramite l'host
  `window.MelisXLSX`, con fallback CSV).
- Colonne ordinabili **ID / Title / Nb associations**, con azioni **modifica** ed **elimina** per riga.
- Un pulsante **+ New tag** che apre un editor vuoto.

![Elenco Tags React — card KPI (Total / With associations / Without association), ricerca, Reset filters, gestore Columns, Export, il toggle New/Old, "+ New tag" e righe che mostrano ID / Title / Nb associations con azioni di modifica ed eliminazione](/screenshots/react/melis-cms-tags/meliscmstags-tool-tags-list.png)

**L'editor** è un modulo compatto (un tag è semplicemente un titolo per lingua): uno **switch di lingua**
(English / Français…) alimentato dall'endpoint `languages` e un campo **Label** per la lingua selezionata.
Tutte le traduzioni sono mantenute contemporaneamente e salvate insieme — **è richiesto almeno un titolo non
vuoto**. L'eliminazione di un tag viene **rifiutata finché ha ancora associazioni**, proteggendo i contenuti
taggati.

![L'editor dei tag React — uno switch di lingua (English / Français) e il campo "LABEL" per lingua con il suggerimento "At least one title is required"](/screenshots/react/melis-cms-tags/meliscmstags-tool-tags-edit-texts.png)

## Taggare i contenuti — il selettore Tags

I tag sono pensati per essere *utilizzati* da altri moduli. Nell'**editor News React** (Site Tools → News →
apri un articolo), la barra laterale delle impostazioni mostra un pannello **TAGS**: una checklist dei tag
disponibili. Selezionando i tag e salvando l'articolo si memorizzano le associazioni, che vengono poi
conteggiate nel campo **Nb associations** di ciascun tag.

![Il pannello TAGS all'interno dell'editor di articoli News React — una checklist di tag (Art, Business, Design, Development, Education…) che taggano l'articolo](/screenshots/react/melis-cms-tags/meliscmstags-tooloverride-news-tags.png)

Quel selettore e il suo salvataggio sono di proprietà del brick **News** (che legge
`GET /melis/react-api/news/tags` e scrive la tabella di collegamento condivisa con `entity_type = 'NEWS'`);
MelisCmsTags possiede solo i dati dei tag e la tabella condivisa `melis_cms_tag_entity`. Il pannello compare
solo quando MelisCmsTags è attivo.

## React API — endpoint

Non esiste alcun **`config/react-api.php`**: le rotte sono dichiarate **inline in
`config/module.config.php`** come nodo figlio `react-api-cms-tags` sotto `melis-backoffice`, quindi gli URL
risiedono sotto **`/melis/react-api-cms-tags`** (di proprietà del modulo, *non* nel namespace condiviso
`/melis/react-api/…`). Controller: `MelisCmsTags\Controller\MelisCmsTagsReactApiController`. Tutte le risposte
utilizzano il contratto `{ success, data, error }`; le richieste inviano `X-Requested-With: XMLHttpRequest` e
`credentials: 'include'`.

| Metodo e URL | Azione | Scopo |
| --- | --- | --- |
| `GET /melis/react-api-cms-tags` | `list` | Elenca i tag (keyset: `search`, `limit`, `sort`, `dir`, `after`, `lang` opzionale) → `{items,total,nextCursor}`; ogni elemento ha `id`, `title`, `associationsCount` |
| `GET /melis/react-api-cms-tags/stats` | `stats` | KPI `{total, withAssociations, orphan}` |
| `GET /melis/react-api-cms-tags/languages` | `languages` | Lingue CMS `{languages:[{id,locale,name}]}` (alimenta lo switch di lingua dell'editor) |
| `GET /melis/react-api-cms-tags/:id` | `get` | Un tag `{id, creationDate, titles:{langId:title}, associationsCount}` |
| `POST /melis/react-api-cms-tags/save` | `save` | Crea / aggiorna (`{id?, titles:{langId:title}}`) → `{id}` |
| `DELETE /melis/react-api-cms-tags/delete/:id` | `delete` | Elimina un tag (rifiutato se ha ancora associazioni) |

> L'ordine delle rotte è importante: `stats` / `languages` / `save` sono dichiarate **prima** del catch-all
> `:id` in modo da risolversi verso le proprie azioni anziché verso `get`.

Il controller combina SQL keyset parametrizzato diretto (list, stats) con le tabelle e il servizio del modulo
(`TagTable`, `TagTextsTable`, `TagEntityTable` per `get`/`save`; `MelisCmsTagsService` per `delete` —
`getAssociationsByTagId()` blocca l'eliminazione, poi `deleteTagById()` + `TagTextsTable::deleteByField()`
effettuano la pulizia). `save` riproduce le regole legacy (≥1 titolo non vuoto, ≤255 caratteri, unicità per
lingua) e attiva gli stessi eventi (`meliscmstags_save_tag_end`, `meliscmstags_delete_tag_end`).

Esempio (`tags-api.ts`):

```ts
const BASE = '/melis/react-api-cms-tags'
await apiFetch<TagListResult>(`${BASE}?search=art&limit=25&sort=id&dir=desc`) // list
await apiFetch<TagDetail>(`${BASE}/42`)                                       // one tag
await apiFetch<{ id: number }>(`${BASE}/save`, {                              // save all translations
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: null, titles: { 1: 'Art', 2: 'Art' } }),        // langId → title
})
await apiFetch<null>(`${BASE}/delete/42`, { method: 'DELETE' })              // delete
```

## Capacità

Dichiarate in `config/react.capabilities.php` sotto il nodo di menu **`tags_left_menu`** (il nodo dello
strumento renderizzabile; `MelisCmsTags\Module::getConfig()` unisce il file). Azioni: `list` · `create` ·
`edit` · `delete` · `export`. In React, il metodo `can(cap)` di `TagsPage` legge
`window.MelisCan('tags_left_menu', cap)` per abilitare il pulsante **+ New tag**, la modifica/eliminazione per
riga ed Export. Lato server, ogni azione chiama `denyUnlessAccess()`
(auth + `MelisCoreRights::canAccess('tags_left_menu')` → 401/403); qui la chiave delle capacità e il
`MELIS_KEY` della guardia di accesso coincidono (`tags_left_menu`).

## Servizi principali

| Alias del servizio | Ruolo |
| --- | --- |
| `MelisCmsTagsService` | CRUD completo dei tag più l'API di associazione. Ogni metodo attiva gli eventi `*_start` / `*_end` tramite `MelisGeneralService`. |

Alias dei table gateway: `TagTable`, `TagTextsTable`, `TagEntityTable` (registrati in `module.config.php`).

## Front office

`ListTagsPlugin` (`Controller\Plugin\ListPublicationsPlugin.php`) estende `MelisTemplatingPlugin`.

| Impostazione | Dettaglio |
| --- | --- |
| Chiave di configurazione del plugin | `tags` · chiave XML DB `TagsList` |
| File di configurazione | `config/plugins/ListPublicationsPlugin.config.php` |
| Vista front | `MelisCmsTags/listtags` |
| Schede delle impostazioni | **Template** (template + selezione sito) · **Filters** (colonna / ordine / data-min / data-max / ricerca) |

> **Discrepanza di denominazione.** La classe del plugin risiede in `ListPublicationsPlugin.php` e le viste
> Phtml fornite sono `listpublications.phtml` / `showpublication.phtml` — un artefatto storico; la funzionalità
> attiva è il plugin **List Tags** descritto sopra.

## Tabelle del database

Struttura di base in `install/sql/setup_structure.sql`; migrazioni in `install/dbdeploy/`.

| Tabella | Contenuto |
| --- | --- |
| `melis_cms_tag` | Riga principale del tag: `tag_id`, `tag_creation_date`, `tag_site_id`, `tag_type` |
| `melis_cms_tag_texts` | Testi per lingua: `tag_text_id`, `tag_id`, `tag_title`, `tag_lang_id` |
| `melis_cms_tag_entity` | Collegamento tag ↔ elemento di contenuto: `id`, `tag_id`, `entity_id`, `entity_type` (ad es. `NEWS`) |

## Esempio di servizio

```php
$tags = $this->getServiceManager()->get('MelisCmsTagsService');

// Tag CRUD
$list = $tags->getTagsList($status, $langId, $start, $limit, $orderCol, $order, $siteId, $search);
$tag  = $tags->getTagById($tagId, $langId);
$id   = $tags->saveTag(['tag_site_id' => $siteId, ...], $tagId); // $tagId null → create
$tags->deleteTagById($tagId);

// Associations — the integration surface for other modules
$tags->saveTagEntity([$tagId1, $tagId2], $entityId, 'NEWS'); // (re)attach a tag set to an item
$set   = $tags->loadTagByEntityIdType($entityId, 'NEWS');    // tags of one item
$items = $tags->loadEntityByTagsId($tagIds, 'NEWS');         // items carrying given tags
$tags->deleteEntities($entityId, 'NEWS');                    // clear an item's tags
$assoc = $tags->getAssociationsByTagId($tagId, $langId);     // items associated to a tag
```

`saveTagEntity()` elimina i collegamenti esistenti dell'entità e poi risalva l'insieme fornito — chiamarlo dal
flusso di salvataggio di un modulo di contenuto per mantenere sincronizzati i suoi tag.

## Rendere un modulo taggabile (associazioni basate su configurazione)

Dichiarare la mappatura sotto `plugins.melis_cms_tag.datas.associations` in `config/associations.config.php`.
L'esempio MelisCmsNews fornito:

```php
'associations' => [
    'meliscmsnews' => [
        'module'           => 'MelisCmsNews',       // skipped if module not loaded
        'entity_type'      => 'NEWS',               // stored in melis_cms_tag_entity.entity_type
        'entity_table'     => 'melis_cms_news',
        'entity_primary_id'=> 'cnews_id',
        'trans' => [
            'trans_table'      => 'melis_cms_news_texts',
            'trans_foreign_id' => 'cnews_id',
            'trans_lang_key'   => 'cnews_lang_id',
        ],
        'association_title_key' => 'cnews_title',   // shown in the Associations grid "Title" column
    ],
],
```

Quindi chiamare `saveTagEntity()` nell'azione di salvataggio del modulo di contenuto. Nel brick News React
questo è collegato tramite la sua superficie `/melis/react-api/news/tags`; MelisCmsTags possiede solo i dati
dei tag e la tabella di collegamento condivisa.

## File principali

| Ambito | Percorso |
| --- | --- |
| Configurazione del modulo (rotte, rotte react-api inline, servizi, elementi del form) | `vendor/melisplatform/melis-cms-tags/config/module.config.php` |
| Capacità React | `vendor/melisplatform/melis-cms-tags/config/react.capabilities.php` |
| Mappatura delle associazioni | `vendor/melisplatform/melis-cms-tags/config/associations.config.php` |
| Configurazione del plugin List Tags | `vendor/melisplatform/melis-cms-tags/config/plugins/ListPublicationsPlugin.config.php` |
| Controller React API | `vendor/melisplatform/melis-cms-tags/src/Controller/MelisCmsTagsReactApiController.php` |
| Servizio principale | `vendor/melisplatform/melis-cms-tags/src/Service/MelisCmsTagsService.php` |
| Plugin front | `vendor/melisplatform/melis-cms-tags/src/Controller/Plugin/ListPublicationsPlugin.php` |
| Table gateway | `vendor/melisplatform/melis-cms-tags/src/Model/Tables/` |
| Sorgente del brick React | `vendor/melisplatform/melis-cms-tags/ui-react/src/` (`TagsPage`, `tags-api.ts`, `ViewToggle`, `ExportModal`) |
| Build + manifest del brick React | `vendor/melisplatform/melis-cms-tags/public/ui-react/brick.js` · `brick.manifest.json` |
| SQL di installazione | `vendor/melisplatform/melis-cms-tags/install/sql/setup_structure.sql` |
| Migrazioni DB | `vendor/melisplatform/melis-cms-tags/install/dbdeploy/` |

Vedi anche: [melis-cms](/it/reference/modules/melis-cms),
[melis-cms-news](/it/reference/modules/melis-cms-news),
[melis-front](/it/reference/modules/melis-front),
[melis-engine](/it/reference/modules/melis-engine),
[melis-core](/it/reference/modules/melis-core)
