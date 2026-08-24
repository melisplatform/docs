# MelisCmsPageScriptEditor

> Inietta markup `<script>`/`<style>`/HTML personalizzato (analytics, pixel di tracciamento, widget di
> terze parti) nell'`<head>` e nel `<body>` delle pagine di front-office, per pagina e per sito, senza
> modificare i template.
> Pacchetto `melisplatform/melis-cms-page-script-editor`.

## Scopo

MelisCmsPageScriptEditor consente di aggiungere markup grezzo e di farlo iniettare automaticamente
nell'HTML renderizzato delle tue pagine. Sono disponibili tre slot di iniezione: **head top** (subito
dopo `<head>`), **head bottom** (appena prima di `</head>`) e **body bottom** (appena prima di
`</body>`). Gli script possono essere applicati a un intero sito o a una singola pagina; una pagina
può essere contrassegnata come **eccezione** per escludere gli script a livello di sito.

Nel back-office React v6 il modulo viene distribuito come **brick di sola contribuzione** — non
dispone di uno strumento proprio nel menu di sinistra. Aggiunge invece una **scheda Scripts in due
punti**: l'**editor di pagina CMS** (script per pagina) e l'**edizione dello strumento Sites** (script
a livello di sito + eccezioni). Il modello dati, il servizio e i listener di iniezione sono invariati
rispetto alla v5; solo la UI del back-office è passata a React.

## Attivazione

Aggiungi a `config/melis.module.load.php`:

```php
return [
    'MelisCmsPageScriptEditor',
];
```

Richiede `melis-core ^6.0` e `melis-cms ^6.0` (PHP `^8.3|^8.5`). Il modulo è contrassegnato
`dbdeploy: true`, quindi le sue tabelle vengono create automaticamente da melis-dbdeploy.

> **Attivazione per sito:** l'iniezione ha effetto su un sito solo dopo che il modulo è stato caricato
> per quel sito in MelisCms → Sites → Module loading. Gli script possono essere modificati nel
> back-office anche prima, ma nulla viene iniettato nel front finché il modulo non è abilitato sul sito.

## Back-office in React

Non esiste **alcuno strumento dedicato nel menu di sinistra** — la scheda Scripts risiede all'interno
di due strumenti esistenti, entrambi nativi in React. Entrambe le schede compaiono solo quando il
modulo è attivo (rilevato tramite `GET /melis/react-api/react-modules`, quindi il bundle del brick
viene precaricato all'avvio).

| Superficie | Dove | Contenuto | Salvataggio |
| --- | --- | --- | --- |
| **Editor di pagina → scheda Scripts** | MelisCms → apri una **pagina** → *Scripts* | Tre editor di codice per pagina (Head top / Head bottom / Body bottom) per **questa pagina soltanto**. | Pulsante **Save scripts** dedicato. |
| **Strumento Sites → scheda Scripts** | MelisCms → **Sites** → apri un sito → *Scripts* | Tre editor a livello di sito + elenco **Current Exceptions** + **Add an exception** (input page-id o selettore ad albero delle pagine). | Salvato dal pulsante **Save** globale dell'editor del sito; l'aggiunta/rimozione di eccezioni viene resa persistente immediatamente. |

![Editor di pagina CMS React, scheda Scripts: i tre editor di codice per pagina (Head top / Head bottom / Body bottom) con un pulsante Save scripts](/screenshots/react/melis-cms-page-script-editor/meliscmspagescripteditor-page-tab-scripts.png)

![Edizione Sites React, scheda Scripts: i tre editor a livello di sito, l'elenco Current Exceptions e il blocco Add an exception, salvati dal pulsante Save globale dell'editor del sito](/screenshots/react/melis-cms-page-script-editor/meliscmspagescripteditor-tooloverride-sites-edit-tab-scripts.png)

Su una pagina servita, ogni slot riceve **prima gli script del sito, poi gli script propri della
pagina** — a meno che la pagina non sia un'eccezione, nel qual caso vengono iniettati solo i suoi
script di pagina.

Il **componente della scheda dell'editor di pagina** risiede in MelisCms (`PageTabs.tsx`, chiave
`meliscms_page_script_editor`); il **componente della scheda del sito** (`ScriptsTab.tsx`) risiede in
questo modulo e si auto-registra tramite il registro generico `window.__melisSiteTabs` (ordine `55`).
Questo modulo possiede gli endpoint e la capability dietro entrambe le schede.

## Capability (diritti avanzati)

La scheda di pagina è una **capability dello strumento pagina CMS**, dichiarata in
`config/react.capabilities.php` sotto il nodo condiviso `meliscms_page`:

```php
return [
  'melisReactToolCapabilities' => [
    'meliscms_page' => [
      'tabs' => [
        ['key' => 'meliscms_page_script_editor', 'label' => 'tr_meliscmspagescripteditor_title'],
      ],
    ],
  ],
];
```

Senza questa dichiarazione la whitelist delle capability della pagina CMS nasconde il pulsante della
scheda **Scripts** nell'editor di pagina, anche per un amministratore. La scheda Scripts dello
**strumento Sites** non ha una capability propria: è protetta dall'accesso allo strumento Sites
(`meliscms_tool_sites`).

## React API

Due controller di proprietà di questo modulo, entrambi delegano a
`MelisCmsPageScriptEditorService`. Contratto `{ success, data, error }`, con
`X-Requested-With: XMLHttpRequest` e `credentials: 'include'`.

**Scheda di pagina** — `MelisReactApiPageScriptEditorController`, route in `config/react-api.php`.
Protetto da auth + `MelisCoreRights::canAccess('meliscms_page_script_editor')`:

| Metodo e URL | Scopo |
| --- | --- |
| `GET /melis/react-api/cms-page/scripts?idPage=<id>` | Legge gli script di una pagina → `{ idPage, headTop, headBottom, bodyBottom, editDate }`. |
| `POST /melis/react-api/cms-page/scripts/save` | Salva gli script di una pagina (`{ idPage, headTop, headBottom, bodyBottom }`). |

**Scheda del sito** — `MelisCmsPageScriptEditorReactController`, route generica
`/melis/MelisCmsPageScriptEditor/:controller/:action` in `config/module.config.php`. Protetto da auth
+ `MelisCoreRights::canAccess('meliscms_tool_sites')`:

| Metodo e URL (relativi a `.../MelisCmsPageScriptEditorReact`) | Scopo |
| --- | --- |
| `GET /site-script?siteId=<id>` | Script del sito + conteggio eccezioni → `{ siteId, script, exceptionCount }`. |
| `POST /save-site-script` | Salva gli script del sito (se tutti vuoti ⇒ elimina la voce). |
| `GET /exceptions?siteId=<id>` | Le eccezioni del sito → `{ items:[{id,pageId,pageName}], total }`. |
| `POST /add-exception` | Aggiunge un'eccezione (`{ siteId, pageId }`; impone stesso sito + nessun duplicato). |
| `POST /delete-exception` | Rimuove un'eccezione (`{ id }`). |

> **Nota sulla sicurezza.** Gli endpoint di pagina iniettano `<script>`/HTML personalizzato nel
> rendering **pubblico** di una pagina, quindi sia `get` che `save` richiedono il diritto sullo
> strumento page-script-editor (non solo una sessione), impedendo a un utente BO senza diritti di
> piazzare XSS persistenti. Le scritture usano SQL parametrizzato direttamente su `melis_cms_scripts`.

## Servizi principali

| Alias | Ruolo |
| --- | --- |
| `MelisCmsPageScriptEditorService` | Tutta la logica di business degli script: salvataggio, lettura, merge e iniezione. Riutilizzato da entrambi i controller React. |
| `MelisCmsScriptTable` | Table gateway per `melis_cms_scripts`. |
| `MelisCmsScriptExceptionTable` | Table gateway per `melis_cms_scripts_exceptions`. |

`MelisCmsPageScriptEditorService` espone:

| Metodo | Ruolo |
| --- | --- |
| `addScript($siteId, $pageId, $headTop, $headBottom, $bodyBottom, $mcsId)` | Inserisce o aggiorna una riga di script per un sito o una pagina. |
| `addScriptException($siteId, $pageId)` | Contrassegna una pagina come esclusa dagli script a livello di sito. |
| `getScriptExceptions($siteId, $sortCol, $sortOrder)` | Elenca le pagine che escludono gli script del sito. |
| `getScriptsPerSite($siteId)` / `getScriptsPerPage($pageId)` | Recupera la/le riga/righe di script per un sito / una pagina. |
| `getScriptsExceptionPerPage($pageId)` | Recupera la/le riga/righe di eccezione per una pagina. |
| `getMixedScriptsPerPage($pageId)` | Risolve gli script finali per una pagina — sito + pagina uniti, oppure solo pagina quando la pagina è un'eccezione. Usato dal listener di render del front. |
| `updatePageScripts($pageId, $html)` | Inietta gli script uniti nell'HTML renderizzato (dopo `<head>`, prima di `</head>`, prima di `</body>`). |
| `getSiteId($pageId)` | Risolve l'id del sito per una data pagina. |

## Front office

L'iniezione avviene tramite un listener MVC, non tramite un plugin di template:

| Listener | Trigger | Ruolo |
| --- | --- | --- |
| `MelisCmsPageScriptEditorScriptTagListener` | Render di pagina (front) | Chiama `getMixedScriptsPerPage()` e inietta gli script risolti: head-top dopo `<head>`, head-bottom prima di `</head>`, body-bottom prima di `</body>`. |

Il salvataggio e la duplicazione restano guidati da eventi (`Module.php::onBootstrap`): i listener
save-page, save-site-script e duplicate-page rendono persistenti gli script e l'eccezione di
esclusione dal sito quando le pagine/i siti vengono salvati o duplicati nel back-office. Il view
helper `melisCmsPageScriptEditorAddScript`
(`src/View/Helper/MelisCmsPageScriptEditorAddScriptHelper.php`) fornisce accesso programmatico per
salvare una riga di script tramite il servizio.

## Tabelle del database

| Tabella | Contiene |
| --- | --- |
| `melis_cms_scripts` | Un set di script per sito o per pagina: `mcs_id`, `mcs_site_id`, `mcs_page_id`, `mcs_head_top`, `mcs_head_bottom`, `mcs_body_bottom`, `mcs_date_edition`, `mcs_user_id`. |
| `melis_cms_scripts_exceptions` | Pagine che ignorano gli script del sito: `mcse_id`, `mcse_site_id`, `mcse_page_id`, `mcse_date_creation`, `mcse_user_id`. |

## Esempio

```php
$scripts = $this->getServiceManager()->get('MelisCmsPageScriptEditorService');

// Resolve the final scripts for a page (site + page merged, or page-only if exception)
$resolved = $scripts->getMixedScriptsPerPage($pageId);
// $resolved contains headTopScript, headBottomScript, bodyBottomScript

// Save scripts for a site or page
$scripts->addScript($siteId, $pageId, $headTop, $headBottom, $bodyBottom, $mcsId);

// Mark a page as an exception (it will no longer receive site-wide scripts)
$scripts->addScriptException($siteId, $pageId);

// List all pages that opted out of the site scripts
$exceptions = $scripts->getScriptExceptions($siteId, $sortCol, $sortOrder);
```

## File principali

| Ambito | Percorso |
| --- | --- |
| Bootstrap del modulo e wiring dei listener | `vendor/melisplatform/melis-cms-page-script-editor/src/Module.php` |
| Wiring di servizio e route | `vendor/melisplatform/melis-cms-page-script-editor/config/module.config.php` |
| Route React API della scheda di pagina | `vendor/melisplatform/melis-cms-page-script-editor/config/react-api.php` |
| Dichiarazione della capability della scheda di pagina | `vendor/melisplatform/melis-cms-page-script-editor/config/react.capabilities.php` |
| Controller React (pagina / sito) | `vendor/melisplatform/melis-cms-page-script-editor/src/Controller/` |
| Brick della scheda del sito (Vite IIFE) | `vendor/melisplatform/melis-cms-page-script-editor/ui-react/src/` (`brick.tsx`, `ScriptsTab.tsx`, `site-scripts-api.ts`) |
| Servizio | `vendor/melisplatform/melis-cms-page-script-editor/src/Service/MelisCmsPageScriptEditorService.php` |
| Listener di iniezione del front | `vendor/melisplatform/melis-cms-page-script-editor/src/Listener/MelisCmsPageScriptEditorScriptTagListener.php` |
| View helper | `vendor/melisplatform/melis-cms-page-script-editor/src/View/Helper/MelisCmsPageScriptEditorAddScriptHelper.php` |
| Table gateway | `vendor/melisplatform/melis-cms-page-script-editor/src/Model/Tables/` |
| SQL di installazione | `vendor/melisplatform/melis-cms-page-script-editor/install/dbdeploy/` |

Vedi anche: [Riferimento moduli](/it/reference/modules) · [melis-cms](/it/reference/modules/melis-cms) ·
[melis-core](/it/reference/modules/melis-core)
