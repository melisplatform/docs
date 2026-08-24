# MelisAICommunityExtensions

> Integra la generazione AI nelle superfici di editing esistenti del CMS: creatore di mini-template, creatore di contenuti per le news e pulsanti AI nelle zone drag-and-drop. Nel back-office React fornisce un brick di estensione (host-injection) privo di pagina propria. Pacchetto `melisplatform/melis-ai-community-extensions`.

## Scopo

MelisAICommunityExtensions è un livello applicativo costruito sopra la suite MelisAI che collega la generazione AI direttamente alle superfici di editing esistenti. Registra due istanze pre-configurate (`minitemplatecreator` e `newscontentcreator`), un set di strumenti MCP e un insieme di listener di eventi che gestiscono il ciclo di vita degli asset front-end generati dall'AI (CSS, JS, immagini). Non ha **alcuna schermata strumento autonoma**; al suo posto inietta i pulsanti **Generate with AI** e le finestre modali di chat nel Mini-Template Manager, nell'editor delle News e nelle zone drag-and-drop delle pagine. La chat AI vera e propria è servita da MelisAI / MelisAIEngine: questo modulo fornisce soltanto l'interfaccia utente circostante e il cablaggio di ingresso/uscita.

## Come abilitarlo

Aggiungere a `config/melis.module.load.php`:

```php
return [
    'MelisAICommunityExtensions',
];
```

Richiede `melisplatform/melis-ai`. Eseguire il dbdeploy dopo l'abilitazione: il modulo popola le righe agente/istanza `minitemplatecreator` e `newscontentcreator` nelle tabelle del motore MelisAI (`dbdeploy: true`). Si integra con MelisCms e MelisCmsNews.

## Dove si trova nel back-office React

Il brick React è un **brick di estensione / host-injection**: non disegna alcuna pagina e non aggiunge voci nella sidebar. Al caricamento registra **due punti di estensione host** su `window` che le pagine React di altri moduli chiamano per rendere in linea il pulsante *Generate with AI*, più un widget `Header` sempre montato (`MiniTemplateAiDialogHost`) che ancora la finestra di edizione della pagina sopra i frame di editing legacy.

Poiché non ha una route, non c'è nulla verso cui navigare: lo si incontra *all'interno di altri strumenti*:

- **Editor delle News** (MelisCmsNews) → scheda **Texts** → pulsante per paragrafo.
- **Mini-Template manager** (MelisCms) → campo *Template's HTML* → pulsante.
- **Edizione della pagina** (drag-and-drop di MelisCms) → pulsante della zona / del plugin tag HTML.

**Attivazione condizionata da due moduli.** I pulsanti compaiono solo se **entrambi** i moduli `MelisAICommunityExtensions` e `MelisAI` sono attivi (verifica in tempo reale tramite `__melisIsModuleActive` dell'host, basato su `GET /melis/react-api/react-modules`). MelisAI è necessario perché serve la chat; se uno dei due moduli viene disabilitato durante la sessione, i pulsanti scompaiono senza ricaricare la pagina. Il brick non contribuisce con **alcun nodo di capacità**: la visibilità dipende esclusivamente da questa verifica sui due moduli.

## Superfici di editing del back-office

Vengono estese tre superfici di editing. In ciascuna, un pulsante AI apre una chat contestualizzata e il risultato viene scritto nel campo corretto.

### AI Mini-Template Creator

Nel Mini-Template manager, il campo *Template's HTML* riporta un pulsante **Generate with AI** reso dal punto di estensione `renderHtmlActions()`. Apre una finestra di dialogo a tutto schermo: **chat AI + elenco dei template esistenti a sinistra, anteprima live a destra** (i due pannelli si riducono a schede segmentate *AI & Templates / Preview* sulle larghezze ridotte). La chat utilizza l'istanza `minitemplatecreator`, parte da zero a ogni apertura (`clearSession`) e recupera nuovamente lo shell reale del sito a ogni risultato AI, così che il CSS/JS appena scritto venga riflesso.

![Il Mini-Template manager, elenco per sito con il punto di ingresso Generate with AI](/screenshots/react/melis-ai-community-extensions/melisaicomext-tooloverride-minitplmanager-list.png)

![La chat minitemplatecreator che genera un template, con anteprima sullo shell reale del sito](/screenshots/react/melis-ai-community-extensions/melisaicomext-tooloverride-minitplmanager-createwithai.png)

Ogni riga dell'elenco dei template mostra un'**icona Melis-AI**: cliccandola si genera un nuovo template usando quello come riferimento di base (la chat viene rieseguita partendo dal markup del template selezionato). **Insert** cattura una miniatura PNG dell'anteprima (html2canvas) e compila il modulo; il submit del modulo stesso lo salva.

![L'icona Melis-AI su una riga di template — variare o duplicare un template esistente con l'AI](/screenshots/react/melis-ai-community-extensions/melisaicomext-tooloverride-minitplmanager-duplicatewithai.png)

![Il modulo Add mini-template — Generate with AI accanto al campo HTML](/screenshots/react/melis-ai-community-extensions/melisaicomext-tooloverride-minitplmanager-addminitpl.png)

### News Content Creator

Nella scheda **Texts** dell'editor delle **News**, ogni **Paragraph** riceve un pulsante **Generate with AI** (per lingua) reso dal punto di estensione `renderParagraphActions()`. Apre una modale compatta con la chat `newscontentcreator`, **contestualizzata sull'articolo** (inizializzata con il titolo, il sottotitolo, gli altri paragrafi e le immagini dell'articolo). La risposta sostituisce il testo di quel paragrafo e lo marca come validato. Le sessioni sono isolate per articolo tramite un id di istanza `newscontentcreator|<newsId>`.

![La scheda Texts delle News — la barra di intestazione di ogni paragrafo riporta l'azione Generate with AI](/screenshots/react/melis-ai-community-extensions/melisaicomext-tooloverride-news-edit-tab-texts.png)

![La chat newscontentcreator, consapevole del contesto dell'articolo](/screenshots/react/melis-ai-community-extensions/melisaicomext-tooloverride-news-edit-tab-texts-aicreator.png)

### Generate with AI nelle zone drag-and-drop

Durante la modifica di una pagina CMS, le **zone drag-and-drop** vuote (e i plugin tag HTML) ricevono un pulsante **Generate with AI** iniettato. Poiché l'edizione della pagina è un iframe legacy sotto lo shell React, il pulsante chiede all'host React di aprire la *stessa* finestra Mini-Template descritta sopra. Alla conferma vengono offerte tre opzioni di commit: **Close**, **Insert** (inserisce solo in questa zona) o **Save & Insert** (inserisce e promuove anche il blocco a mini-template riutilizzabile permanente).

![Una zona drag-and-drop vuota con il pulsante Generate with AI iniettato](/screenshots/react/melis-ai-community-extensions/melisaicomext-pageoverride-dragdropzone-generateaibutton-1.png)

![Un blocco completo e stilizzato generato direttamente nella zona della pagina](/screenshots/react/melis-ai-community-extensions/melisaicomext-pageoverride-dragdropzone-generateaibutton-2.png)

![La scelta di commit Close / Insert / Save & Insert per un blocco generato](/screenshots/react/melis-ai-community-extensions/melisaicomext-pageoverride-dragdropzone-generateaibutton-differentinserts.png)

## Il brick

`ui-react/` è una libreria Vite IIFE (nome `MelisAiCommunityExtensionsBrick`, output `public/ui-react/brick.js`). React, react-dom e react-router-dom sono esternalizzati verso le globali dell'host; un alias `@melis-ai-engine` importa il componente di chat condiviso `AiChatContainer`.

| File | Ruolo |
| --- | --- |
| `src/brick.tsx` | Registra i due punti di estensione + l'`Header`; inietta Tailwind una sola volta. |
| `src/NewsAiExtension.tsx` | `renderParagraphActions()` → pulsante per paragrafo + modale (istanza `newscontentcreator`). |
| `src/MiniTemplateAiExtension.tsx` | `renderHtmlActions()` → il `MiniTemplateAiDialog` a tutto schermo (chat + elenco + anteprima; Insert / Save & Insert; miniatura html2canvas). |
| `src/MiniTemplateAiDialogHost.tsx` | L'ancora `Header` per l'**edizione della pagina**; resta in ascolto di `melis-ai-minitemplate-open` e monta la finestra di dialogo. |

Il brick si registra **senza `Component`** e **senza `Sidebar`**: solo punti di estensione protetti e l'ancora `Header`:

```ts
window.__melisNewsExtensions.renderParagraphActions = /* guarded by isModuleActive() */
window.__melisMiniTemplateExtensions.renderHtmlActions = /* guarded by isModuleActive() */
window.__melisRegisterBrick?.({ id: 'melis-ai-community-extensions', Header: MiniTemplateAiDialogHost })
```

## Endpoint chiamati dal brick

Il brick non ha **alcun `config/react-api.php`**. Consuma endpoint di proprietà di altri moduli più una propria azione MVC legacy:

| Chiamata | Proprietario |
| --- | --- |
| `GET /melis/react-api/cms-mini-templates?site=<m>&limit=9999` | MelisCms (elenco template) |
| `GET /melis/react-api/cms-mini-templates/item?site=<m>&name=<n>` | MelisCms (HTML di un template) |
| `GET /melis/MelisAICommunityExtensions/MiniTemplate/getMiniTemplatePreviewShell?siteModule=<m>` | questo modulo (MVC legacy; restituisce l'HTML dello shell del sito) |
| Traffico run/exit di `AiChatContainer` | MelisAI / MelisAIEngine |

La risposta della chat torna nel campo dell'host tramite una callback `window` dichiarata nei parametri di uscita (`masse_exit_js_callback`): `__melisNewsAiCallback_<paraIdx>` per le news, `__melisMiniTemplateAiCallback` per i mini-template.

## Integrazione con l'host (bridge dell'edizione di pagina)

L'edizione della pagina viene eseguita diversi frame al di sotto dello shell React, quindi `MiniTemplateAiDialogHost` imposta `window.__melisAiMiniTemplateDialogReady = true` e resta in ascolto di un evento `melis-ai-minitemplate-open`. La pagina in modifica esegue `public/js/minitemplate/react-bridge.js`, che risale **la catena dei frame** cercando `__melisAiMiniTemplateDialogReady`; quando lo trova, invia l'evento di apertura con callback same-origin `onInsert` / `onSaveInsert`. Se non viene trovato alcun host React (legacy `/melis`), il bridge ricade sulla modale Bootstrap storica: lì non cambia nulla.

Per gli strumenti legacy mostrati nella vista **"Old"** di React, `config/module.config.php` registra `melis_react_override.toolpage_extensions` → `PluginViewToolPageExtension`, che inietta i file `tool.js` / `style.css` di questo modulo affinché le jsCallbacks innestate sugli strumenti MelisCms / MelisCmsNews trovino le proprie globali.

## Listener di eventi

| Listener | Evento | Effetto |
| --- | --- | --- |
| `…TinyMCEConfigurationListener` | `meliscore_tinymce_config` | Punta il plugin `minitemplate` di TinyMCE al JS di questo modulo. |
| `…CreateMiniTemplateListener` | `meliscms_mini_template_manager_create_end` | Sposta CSS/JS/immagini temporanei nello storage permanente; rinomina il JS di init per template. |
| `…PublishPageListener` | `meliscms_page_publish_start` | Promuove gli asset temporanei referenziati da una pagina pubblicata; aggiorna `page_content`. |
| `…SanitizeSavedPluginHtmlListener` | `meliscms_page_savesession_plugin_start` | Ripulisce il markup runtime di carousel/slider (artefatti Owl/Slick/Swiper) prima del salvataggio. |
| `…DeleteMiniTemplateAssetsListener` | `meliscms_mini_template_manager_delete_end` | Elimina CSS/JS/immagini del template. |
| `…AttachAIGeneratedCssListener` | `MvcEvent::EVENT_FINISH` (front + back) | Inietta CSS/JS AI nelle pagine renderizzate. |
| `…InjectDndAiButtonListener` | `MvcEvent::EVENT_FINISH` | Inietta il pulsante **Generate with AI** nelle zone drag-and-drop legacy. |

Il modulo registra inoltre un `MelisPluginRendererOverride` affinché gli asset AI vengano iniettati correttamente durante il rendering dei plugin.

## Server MCP

Un server MCP stdio `minitemplate_creator` (entry point `mcp/minitemplatecreator/bin/server.php`) è registrato in `config['mcp']['servers']`. Gli strumenti seguenti sono dichiarati con `mcp: true`:

| Strumento | Parametri | Scopo |
| --- | --- | --- |
| `readSiteAssets` | `siteModule`, `templateRequest` | Restituisce i file CSS/JS/view rilevanti del sito affinché l'AI corrisponda al design reale. |
| `getSitePublicUrl` | `siteModule` | Restituisce l'URL/dominio pubblico del sito per l'ispezione visiva prima della generazione. |
| `uploadMinitemplateImages` | `siteModule`, `image`, `filename` | Salva un'immagine (base64/data-URL/HTTP) nella directory temporanea AI e restituisce un percorso web per `<img src>`. |
| `renderMinitemplatePreview` | `siteModule` | Attiva l'anteprima nell'editor del template generato. |

L'agente `minitemplatecreator` dispone inoltre degli strumenti filesystem del motore (`createFile` / `readFile` / `updateFiles` / …) nella propria allow-list. Durante la conversazione, la finestra di dialogo React registra `window.melisReactActionMap.preview_minitemplate` affinché il motore possa inviare il blocco `html` generato nell'anteprima live quando `render_minitemplate_preview` restituisce.

## Tabelle del database

Questo modulo non crea tabelle proprie. I suoi delta dbdeploy inseriscono righe in tabelle di proprietà di `melis-ai`:

| Tabella | Contiene |
| --- | --- |
| `melis_ai_instances` | Le istanze `minitemplatecreator` e `newscontentcreator` popolate. |
| `melis_ai_agents` | Gli agenti popolati per le due istanze. |

A runtime, i dati delle news vengono acceduti tramite `NewsTable` (`getNewsData($newsId)`), che effettua il join con la tabella del sito per risolvere il `siteModule` necessario a collocare le immagini generate.

## File chiave

| Ambito | Percorso |
| --- | --- |
| Config del modulo (route MVC, toolpage_extensions) | `vendor/melisplatform/melis-ai-community-extensions/config/module.config.php` |
| Sorgente del brick | `vendor/melisplatform/melis-ai-community-extensions/ui-react/src/` |
| Brick compilato | `vendor/melisplatform/melis-ai-community-extensions/public/ui-react/{brick.js, brick.manifest.json}` |
| Bridge dei frame dell'edizione di pagina | `vendor/melisplatform/melis-ai-community-extensions/public/js/minitemplate/react-bridge.js` |
| Dichiarazione degli strumenti MCP | `vendor/melisplatform/melis-ai-community-extensions/config/mcp.tools.php` |
| Controller dei mini-template | `vendor/melisplatform/melis-ai-community-extensions/src/Controller/MiniTemplateController.php` |
| Controller delle news | `vendor/melisplatform/melis-ai-community-extensions/src/Controller/NewsController.php` |
| Injector della vista "Old" | `vendor/melisplatform/melis-ai-community-extensions/src/Controller/React/PluginViewToolPageExtension.php` |
| Listener | `vendor/melisplatform/melis-ai-community-extensions/src/Listener/` |
| Helper del pulsante Generate-with-AI | `vendor/melisplatform/melis-ai-community-extensions/src/View/Helper/MelisGenerateWithAIBtnHelper.php` |
| Gateway della tabella news | `vendor/melisplatform/melis-ai-community-extensions/src/Model/Tables/NewsTable.php` |
| Entry point del server MCP | `vendor/melisplatform/melis-ai-community-extensions/mcp/minitemplatecreator/bin/server.php` |
| Directory degli asset AI | `public/miniTemplatesTinyMce/AI/{siteModule}/{temp\|css\|js\|images}/` |
| Delta di installazione (seed degli agenti) | `vendor/melisplatform/melis-ai-community-extensions/install/dbdeploy/` |

Vedere anche: [MelisAIEngine](/it/reference/modules/melis-ai-engine), [MelisAI](/it/reference/modules/melis-ai), [MelisAIToolCreator](/it/reference/modules/melis-ai-tool-creator), [MelisCms](/it/reference/modules/melis-cms), [MelisCmsNews](/it/reference/modules/melis-cms-news)
