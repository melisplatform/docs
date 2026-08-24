# MelisCmsProspects

> Gestione di lead / contatti: un modulo di contatto front-office cattura i messaggi dei visitatori come prospect e un back-office React consente di sfogliarli, filtrarli, modificarli, esportarli ed eliminarli, oltre a classificare le richieste per temi. Pacchetto `melisplatform/melis-cms-prospects`.

## Scopo

`MelisCmsProspects` cattura gli invii dei moduli di contatto dei visitatori come **prospect** (lead) memorizzati nel
database. Gli utenti del back-office sfogliano, filtrano, modificano, esportano (CSV/Excel) ed eliminano tali lead
e li classificano per **temi**. Il modulo include un widget di statistiche per la dashboard e si integra con
gli strumenti GDPR della piattaforma (informazioni utente / estrazione / eliminazione + ciclo di eliminazione automatica).

In Melis v6 i due strumenti del back-office — **Prospects** e **Themes** — sono **interfacce React
native complete** servite sotto `/melis-react`, ciascuna in dialogo con un livello JSON `react-api`. Il modello dati
sottostante, i servizi, il plugin front Show Form e il cablaggio GDPR restano invariati rispetto alla v5.

## Attivazione

Aggiungi a `config/melis.module.load.php`:

```php
return [
    'MelisCmsProspects',
];
```

Dipendenze: `melis-core`, `melis-engine`, `melis-front`, `melis-cms` e
`laminas/laminas-mvc-plugin-flashmessenger`. Il modulo è `dbdeploy: true` — le sue tabelle vengono
create/aggiornate tramite il meccanismo dbdeploy. Entrambi gli strumenti React compaiono nel back-office solo
quando il modulo è attivo (vengono rilevati dal relativo `brick.manifest.json`).

## Back-office React

**Dove:** barra laterale sinistra → **MelisMarketing** → **Prospects** → **Prospects** / **Themes**. Ciascuno
si apre come scheda principale a sé stante. Ogni strumento mantiene un interruttore **New / Old**: *New* è l'interfaccia React
(predefinita), *Old* mostra lo strumento legacy in un iframe (`/melis/react-tool-page?key=<melisKey>`).

Due brick vengono forniti in un unico bundle (`public/ui-react/brick.manifest.json`):

| Elemento | Prospects | Themes |
| --- | --- | --- |
| Id brick / route | `prospects` — `/prospects` | `prospect-themes` — `/prospect-themes` |
| `forwardKey` (menu → route) | `MelisCmsProspects/ToolProspects` | `MelisCmsProspects/ProspectThemes` |
| `melisKey` iframe vista Old (zona) | `MelisCmsProspects_tool_prospects` | `MelisCmsProspects_tool_themes` |
| melisKey diritti / capability | `melisprospects_tool_prospects_section` | `melisprospects_tool_themes_section` |
| Base API | `/melis/react-api/prospects` | `/melis/react-api/prospect-themes` |
| Controller | `MelisReactApiProspectController` | `MelisReactApiProspectThemeController` |

> Nota: il `melisKey` del manifest è la chiave della **zona** renderizzabile usata per l'iframe della vista Old —
> i diritti **non** dipendono da esso. Il controllo di accesso e le capability si basano sul nodo di menu
> `melisprospects_tool_..._section` (dichiarato in `config/app.interface.php`).

### Strumento Prospects

![Lo strumento React Prospects: card KPI (Total / This month / Average per month / Anonymized), ricerca, filtri All-sites e All-types, un selettore di intervallo di date (Date range), Reset filters, un gestore di colonne (Columns), Export, l'interruttore New/Old e un pulsante di aggiornamento — ogni riga ha azioni di modifica ed eliminazione](/screenshots/react/melis-cms-prospects/meliscmsprospects-tool-prospects-list.png)

Vedi **ogni prospect della piattaforma**. L'elenco ha **quattro card KPI** (Total, This month,
Average per month, Anonymized), una casella di **ricerca** (nome / email / telefono / azienda), un filtro
per **sito**, un filtro per **tipo**, un selettore di intervallo di **date** (Today / Yesterday / Last 7 / Last 30 / This
month / Last month / Custom), **Reset filters**, un gestore di **colonne** persistente, **Export** e
un pulsante di aggiornamento. Clicca su un'intestazione per **ordinare** (tutte le colonne tranne *Message*). Ogni riga ha **modifica**
ed **eliminazione**.

I prospect **non vengono creati** qui — arrivano solo dal modulo di contatto front. Cliccando
**modifica** si apre il prospect come **sotto-scheda** host (← Back) che mostra un modulo React: una card **Contact
information** (Name, Email, Phone, Company, Country), una card **Message** e una card laterale **Details**
(selettore **Site**, selettore **Theme**, **Contact date** in sola lettura). Nessun campo è obbligatorio
(l'email viene controllata nel formato solo se compilata); **Contact date** e **type** sono immutabili — vengono
impostati al momento della cattura dal modulo front.

![Il modulo React di modifica del prospect — una card Contact information (Name, Email, Phone, Company, Country), una casella Message e una card laterale Details (Site, Theme, Contact date in sola lettura); la barra delle sotto-schede mostra il drill-down (← Back · Paul Martin)](/screenshots/react/melis-cms-prospects/meliscmsprospects-tool-prospects-edit.png)

### Strumento Themes

L'elenco Themes mostra **due card KPI** (Total themes, total Items), una casella di **ricerca**, **Reset
filters**, un gestore di **colonne** (Columns), **Export**, l'interruttore **New/Old** e **+ New theme**. Ogni riga
mostra il **nome** del tema e il relativo **conteggio degli elementi**, con tre azioni: **rinomina** (modale a campo singolo),
**modifica** (apre la sotto-scheda **Items** del tema) ed **elimina**.

![Lo strumento React Themes: card KPI Total / Items, ricerca, Reset filters, Columns, Export, interruttore New/Old e "+ New theme" — ogni riga espone rinomina, modifica (apri items) ed elimina](/screenshots/react/melis-cms-prospects/meliscmsprospects-tool-themes-list.png)

![La modale "New theme" — un unico campo Name (il codice viene preservato dal back-end, non inserito qui)](/screenshots/react/melis-cms-prospects/meliscmsprospects-tool-themes-new-modal.png)

La modifica di un tema apre il relativo pannello **Items** come sotto-scheda (← Back + nome del tema): un elenco ricercabile di
elementi (id + nome) con modifica/eliminazione per riga e **+ New item**. L'aggiunta o la modifica di un elemento apre una
modale che cattura un **nome per lingua CMS** — una riga di schede lingua (bandiera + pallino verde "compilato")
più il campo **Name** per la lingua attiva. Deve essere compilata almeno una lingua.

![Il pannello Items di un tema (sotto-scheda) per "My Billing" — un elenco ricercabile di elementi con modifica/eliminazione per riga e un pulsante "+ New item", mostrato come sotto-scheda di drill-down](/screenshots/react/melis-cms-prospects/meliscmsprospects-tool-themes-edit-themecategorylist.png)

![La modale "New item" — schede "Content per language" (English / Français) e il campo Name per la lingua attiva](/screenshots/react/melis-cms-prospects/meliscmsprospects-tool-themes-edit-themecategorylist-new-modal.png)

## API React

Le route si trovano in `config/react-api.php` (unite tramite `Module::getConfig()`). Tutte sotto
`/melis/react-api/`, contratto `{ success, data, error }`; ogni fetch invia
`X-Requested-With: XMLHttpRequest` e `credentials: 'include'`.

**Prospects** — `MelisReactApiProspectController`:

| Metodo e URL | Scopo |
| --- | --- |
| `GET /prospects` | Elenco keyset (`limit,search,site,type,dateFrom,dateTo,sort,dir,after`) → `{items,total,nextCursor}` |
| `GET /prospects/stats` | KPI `{total, thisMonth, avgPerMonth, anonymized}` |
| `GET /prospects/sites` | Opzioni del filtro per sito |
| `GET /prospects/types` | Valori distinti di `pros_type` |
| `GET /prospects/themes` | Opzioni degli elementi tema per il selettore Theme del modulo |
| `GET /prospects/:id` | Un prospect (formattato) |
| `POST /prospects/save` | **Solo aggiornamento** (nessuna creazione); data di contatto e tipo immutabili lato server |
| `DELETE /prospects/delete/:id` | Elimina un prospect |

**Themes & items** — `MelisReactApiProspectThemeController`:

| Metodo e URL | Scopo |
| --- | --- |
| `GET /prospect-themes` | Elenco keyset dei temi → `{items,total,nextCursor}` con `itemCount` |
| `GET /prospect-themes/stats` | KPI `{total, withCode, items}` |
| `GET /prospect-themes/:id` | Un tema `{id,name,code,itemCount}` |
| `POST /prospect-themes/save` | Crea (id=0) / aggiorna (name obbligatorio ≤45, univoco; code preservato se assente) |
| `DELETE /prospect-themes/delete/:id` | Elimina un tema + elementi + traduzioni (cascade) |
| `GET /prospect-themes/languages` | Lingue CMS `{languages:[{id,name,locale}]}` |
| `GET /prospect-themes/items?themeId=X` | Gli elementi di un tema (nome nella lingua di sessione) |
| `GET /prospect-themes/items/:id` | Un elemento `{id,themeId,translations:{langId:text}}` |
| `POST /prospect-themes/items/save` | Crea/aggiorna un elemento (≥1 traduzione non vuota; upsert/delete per lingua) |
| `DELETE /prospect-themes/items/delete/:id` | Elimina un elemento + le sue traduzioni |

```ts
// update a prospect (no create)
await apiFetch<{id:number}>('/melis/react-api/prospects/save', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: 3, siteId: 1, name: 'Paul Martin',
    email: 'paul.martin@example.com', message: '…', theme: null }),
})
// save a theme item (name per language)
await apiFetch<{id:number}>('/melis/react-api/prospect-themes/items/save', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: 0, themeId: 2, translations: { '1': 'My invoices', '2': 'Mes factures' } }),
})
```

> Entrambi i controller dialogano direttamente con le tabelle tramite SQL parametrizzato (`AdapterInterface`, elenchi
> keyset tramite `MelisReactKeysetListTrait`), riproducendo le regole di business legacy. Continuano a lanciare
> gli eventi di log legacy (`meliscmsprospects_toolprospects_save_end` / `_delete_end`,
> `meliscmsprospects_theme_save_end` / `_delete_end`, `meliscmsprospects_theme_item_save_end`) affinché
> i listener di flash/log del modulo continuino a funzionare.

## Capability

Dichiarate in `config/react.capabilities.php` (`melisReactToolCapabilities`), indicizzate in base al
melisKey del nodo di menu portatore dei diritti. `Capabilities::flatten()` produce stringhe puntate passate a
`MelisCan(melisKey, cap)` in React e a `denyUnlessCan(cap)` lato server (default-allow per una
capability non dichiarata).

```php
'melisprospects_tool_prospects_section' => ['list', 'edit', 'delete', 'export'], // NO create
'melisprospects_tool_themes_section' => [
    'actions' => ['create', 'list', 'edit', 'delete', 'export'],
    'tabs' => [
        ['key' => 'items', 'label' => 'tr_melis_cms_prospects_theme_items',
         'actions' => ['list', 'create', 'edit', 'delete']],
    ],
],
```

- **Prospects**: `list`, `edit`, `delete`, `export` (nessun `create` — un prospect nasce solo dal
  modulo di contatto pubblico).
- **Themes**: `create`, `list`, `edit`, `delete`, `export`, più la sotto-scheda `items`
  (`items`, `items.list`, `items.create`, `items.edit`, `items.delete`).

Ogni azione del controller applica una doppia protezione: `denyUnlessAccess()` (auth + `MelisCoreRights::canAccess`)
poi `denyUnlessCan('list')` ecc. `save` sceglie tra `edit` e `create` in base all'id.

## Servizi principali

| Alias del servizio | Ruolo |
| --- | --- |
| `MelisCmsProspectsService` / `MelisProspectsService` | Servizio principale. `saveProspectsDatas($datas, $prosId = null)` crea o aggiorna un prospect; `getProspectsDataForWidgets($widgetId = '')` restituisce i conteggi totale / questo mese / media; `getProspectsDataByDate($type, $date)` conta le registrazioni per data; `getWidgetProspects($identifier)` recupera i dati di un widget. |
| `MelisProspectsGdprAutoDeleteService` | Gestisce il ciclo di eliminazione automatica GDPR (elenco moduli, elenco tag, elenchi utenti di avviso / secondo avviso, eliminazione account). |

Gateway delle tabelle: `MelisProspects`, `MelisCmsProspectsThemeTable`,
`MelisCmsProspectsThemeItemTable`, `MelisCmsProspectsThemeItemTransTable`.

> I controller React **non** usano `MelisCmsProspectsService` (interrogano direttamente le tabelle);
> gli strumenti classici (vista Old), il plugin Show Form, il widget della dashboard e i
> listener GDPR continuano a farvi affidamento.

## Front office

Il plugin controller `MelisCmsProspectsShowFormPlugin` renderizza il modulo di contatto sul front
end. Trascina il blocco **Show Form** su una pagina dal pannello dei plugin dell'editor di pagine React (sotto
**Melis Cms Prospects**). La sua modale di impostazioni mantiene tre schede:

![L'editor di pagine React con il pannello dei plugin aperto — il blocco "Contact Form" si trova sotto il gruppo "Melis Cms Prospects", pronto per essere trascinato sulla pagina](/screenshots/react/melis-cms-prospects/meliscmsprospects-page-menu-plugins-selector.png)

![Show Form — scheda Field list: il costruttore di campi — per ogni campo un interruttore Show/Hide e una casella Mandatory; le righe sono ordinabili tramite trascinamento, quindi il loro ordine è l'ordine del modulo](/screenshots/react/melis-cms-prospects/meliscmsprospects-page-plugins-showform-config-tab-fieldlist.png)

| Scheda | Controlli |
| --- | --- |
| Properties | Template di rendering (`template_path`) e sito di origine (`pros_site_id`). |
| Field list | Costruttore di campi — per ogni campo un interruttore Show/Hide e una casella Mandatory (abilitata solo quando Show è attivo); trascina le righe per impostare l'ordine del modulo. Campi: `pros_name`, `pros_company`, `pros_country`, `pros_email`, `pros_telephone`, `pros_message`. |
| Themes | Il tema che popola il menu a discesa dell'oggetto del modulo. |

File di configurazione: `config/plugins/MelisCmsProspectsShowFormPlugin.config.php`. Template front:
`view/.../plugins/prospects-form.phtml`. Nella Dashboard del back-office, il widget **Prospects
Statistics** (`MelisCmsProspectsStatisticsPlugin`, sezione `MelisMarketing`) rappresenta le
registrazioni nel tempo.

![Il widget della dashboard "Prospects statistics" — un grafico delle registrazioni Daily/Monthly/Yearly più una tabella dei prospect più recenti](/screenshots/react/melis-cms-prospects/meliscmsprospects-dashboard-plugin-prospectsstatistics.png)

## Tabelle del database

| Tabella | Contiene |
| --- | --- |
| `melis_cms_prospects` | Un lead catturato: sito, tipo, tema, nome, email, telefono, messaggio, azienda, paese, data di contatto, ultima data GDPR. PK: `pros_id`. |
| `melis_cms_prospects_themes` | Temi dell'oggetto (`pros_theme_name`, `pros_theme_code`). PK: `pros_theme_id`. |
| `melis_cms_prospects_theme_items` | Elementi appartenenti a un tema. PK: `pros_theme_item_id`. |
| `melis_cms_prospects_theme_items_trans` | Traduzioni per lingua degli elementi tema. PK: `item_trans_id`. |

## Hook degli eventi

Collega con `MelisCmsProspects` come identificatore di destinazione:

| Nome evento | Attivato da |
| --- | --- |
| `meliscmsprospects_toolprospects_save_start` / `_end` | Strumento Prospects (classico + controller React) |
| `meliscmsprospects_toolprospects_delete_start` / `_end` | Strumento Prospects (classico + controller React) |
| `meliscmsprospects_theme_save_end` / `_delete_end` | Strumento Themes (classico + controller React) |
| `meliscmsprospects_theme_item_save_end` | Elementi tema (classico + controller React) |

```php
$sharedEvents->attach(
    'MelisCmsProspects',
    'meliscmsprospects_toolprospects_save_end',
    $fn,
    50
);
```

I listener GDPR (informazioni utente, estrazione, eliminazione, eliminazione automatica) sono cablati in `src/Module.php`. Le mappature
dei campi GDPR si trovano in `config/app.gdpr.php`.

## File principali

| Ambito | Percorso (sotto `vendor/melisplatform/melis-cms-prospects/`) |
| --- | --- |
| Config modulo / route / servizi | `config/module.config.php` |
| Route react-api + invokables | `config/react-api.php` |
| Capability React | `config/react.capabilities.php` |
| Albero dell'interfaccia back-office | `config/app.interface.php` |
| Tabelle e moduli dello strumento classico | `config/app.tools.php` |
| Config plugin di templating | `config/plugins/MelisCmsProspectsShowFormPlugin.config.php` |
| Config widget dashboard | `config/dashboard-plugins/` |
| Mappatura dei campi GDPR | `config/app.gdpr.php` |
| Controller API React | `src/Controller/MelisReactApiProspectController.php`, `MelisReactApiProspectThemeController.php` |
| Controller classici | `src/Controller/ToolProspectsController.php`, `MelisCmsProspectsThemesController.php`, `MelisCmsProspectsThemeItemsController.php` |
| Servizio principale | `src/Service/MelisCmsProspectsService.php` |
| Servizio di eliminazione automatica GDPR | `src/Service/` |
| Plugin del modulo front | `src/Controller/Plugin/MelisCmsProspectsShowFormPlugin.php` |
| Widget dashboard | `src/Controller/DashboardPlugins/MelisCmsProspectsStatisticsPlugin.php` |
| Brick React (sorgente / build) | `ui-react/src/` → `public/ui-react/brick.js` + `brick.manifest.json` |
| Gateway delle tabelle | `src/Model/Tables/` |
| Listener GDPR e bootstrap | `src/Module.php`, `src/Listener/` |

Vedi anche: [Riferimento moduli](/it/reference/modules) · [melis-cms](/it/reference/modules/melis-cms) · [melis-core](/it/reference/modules/melis-core)
