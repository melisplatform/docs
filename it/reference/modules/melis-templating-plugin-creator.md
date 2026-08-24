# MelisTemplatingPluginCreator

> Una procedura guidata del back-office che genera un completo **plugin di templating** front-office —
> configurazione, controller, vista, form modale, asset e traduzioni — in un modulo nuovo o esistente.
> Nella v6 è distribuita come brick React nativo che chiama una `react-api` JSON, con un interruttore
> New/Old verso lo strumento legacy. Pacchetto `melisplatform/melis-templating-plugin-creator`.

## Scopo

MelisTemplatingPluginCreator è un generatore di codice, non una funzionalità di runtime. Ti guida
attraverso una **procedura guidata a 6 passi** — nome del plugin, modulo di destinazione, testi di menu
localizzati, proprietà (campi), traduzioni — poi scrive un plugin di templating pronto all'uso nel
modulo di destinazione. Il plugin generato estende
`MelisEngine\Controller\Plugin\MelisTemplatingPlugin`, quindi una volta creato si comporta come
qualsiasi plugin di templating scritto a mano — leggi [Plugin](/it/guide/plugins) per comprendere e
personalizzare l'output.

## Abilitarlo

È un modulo Laminas standard. Aggiungilo a `config/melis.module.load.php`:

```php
return [
    // …
    'MelisTemplatingPluginCreator',
];
```

Dipendenze Composer (`composer.json`): `melis-core`, `melis-tool-creator`, `melis-cms`. Quando la
destinazione è un modulo **nuovo**, lo strumento delega a `MelisToolCreatorService::createTool()` per
generare prima il modulo. Non è richiesto alcun database, ma la directory `module/` e una cartella
`tpc/temp-thumbnail/` sotto la document root pubblica devono essere scrivibili (è necessaria anche
l'estensione GD per la validazione delle miniature). Il brick React mostra questi requisiti come
avvisi di preflight **bloccanti** quando il filesystem non è scrivibile o GD è mancante.

## Il back-office React

La procedura guidata è un **brick React nativo completo** (non un iframe) montato in `/melis-react`.
Si apre come scheda superiore denominata **Templating Plugin Creator** con una barra a 6 passi e un
interruttore **New / Old** (in alto a destra, accanto a **Restart**). *Old* ricade sullo strumento
jQuery legacy in un iframe; *New* (predefinito) è la procedura guidata React. Il brick è `persistent`:
lasciare la scheda dello strumento e tornarci non fa perdere né la bozza né il passo corrente. I 6
passi sono pannelli mostrati/nascosti via CSS su un'unica pagina montata.

![Passo 1 (Plugin) della procedura guidata React: nome del plugin, destinazione del plugin (New module / Existing site module) con un campo per il nome del nuovo modulo, la barra a 6 passi e il pulsante Next](/screenshots/react/melis-templating-plugin-creator/melistemplatingplugincreator-tool-step1.png)

Tutta la logica di business resta lato server: la validazione ricostruisce i form Laminas legacy
(stessi validatori, messaggi e regole) e la generazione chiama
`MelisTemplatingPluginCreatorService`. React si occupa della presentazione e delle chiamate API.

### I 6 passi

| Passo | Nome | Cosa fai |
| --- | --- | --- |
| 1 | Plugin | Nome del plugin + destinazione: **New module** (rivela un campo per il nome del nuovo modulo) o **Existing site module** (menu a discesa dei moduli). |
| 2 | Menu Texts & Display | Titolo/descrizione per lingua mostrati nell'elenco dei plugin dell'editor di pagina (≥1 lingua) + caricamento obbligatorio della miniatura (GIF/JPG/PNG, ~190×100, ≤500 kB). |
| 3 | Main Properties | Numero di proprietà (1–25, `template_path` incluso); per ogni campo un nome tecnico, tipo di visualizzazione, flag obbligatorio e valore predefinito. La proprietà 1 è il `template_path` imposto e in sola lettura. |
| 4 | Properties' Translation | Etichetta + tooltip per lingua per ogni campo (più un'etichetta per opzione Dropdown); è sufficiente una lingua completa. |
| 5 | Summary | Riepilogo in sola lettura dei passi 1→4, modulo di destinazione e percorso del template calcolato. Qui non viene scritto nulla. |
| 6 | Finalization | Facoltativamente scegli un **Site** su cui attivare e attiva/disattiva **Activate plugin after creation**, poi **Finish and create the plugin**. |

`template_path` è sempre la prima proprietà imposta, calcolata lato server come
`<Module>/plugins/<plugin-view-name>` e mai inviata dal client. **Il passo 6 è l'unica operazione di
scrittura**: scrive i file del plugin e — per il ramo del nuovo modulo — genera il modulo, lo registra
facoltativamente nel `module.load.php` del sito scelto, lo attiva e invalida la cache dei percorsi dei
moduli (l'attivazione richiede un ricaricamento della piattaforma, mostrato come conto alla rovescia).
I tipi di visualizzazione disponibili includono `MelisText`, `Dropdown`, `DatePicker`,
`DateTimePicker`, `PageInput`, `NumericInput`, `Switch`, `Textarea`, `MelisCoreTinyMCE`.

![Passo 2 (Menu Texts & Display): titolo e descrizione per lingua (English / Français) più la scheda della miniatura obbligatoria del plugin con anteprima e Remove thumbnail](/screenshots/react/melis-templating-plugin-creator/melistemplatingplugincreator-tool-step2.png)

![Passo 3 (Main Properties): numero di proprietà (1–25) e Property 1, il template_path imposto e in sola lettura con il suo valore predefinito calcolato dal server](/screenshots/react/melis-templating-plugin-creator/melistemplatingplugincreator-tool-step3.png)

![Passo 6 (Finalization): il menu a discesa Site, l'interruttore Activate plugin after creation e il pulsante Finish and create the plugin](/screenshots/react/melis-templating-plugin-creator/melistemplatingplugincreator-tool-step6.png)

## API React

Le route risiedono in `config/react-api.php`, servite da
`MelisReactApiTemplatingPluginCreatorController`, tutte sotto `/melis/react-api/tpc`, contratto
`{ success, data, error }`. Un fallimento di validazione **non** è un errore HTTP:
`POST /tpc/step/:step` restituisce `{ valid:false, errors:{…} }` così che l'interfaccia possa mostrare
i messaggi per campo.

| Metodo e URL | Scopo |
| --- | --- |
| `GET /tpc/context` | Preflight (controlli FS-scrivibile + GD → `blocking[]`), metadati dei passi, lingue, moduli del sito, siti, tipi di visualizzazione, `maxFields` (25), limiti della miniatura. |
| `GET /tpc/state` | Ripristina la procedura guidata dalla sessione condivisa. |
| `POST /tpc/reset` | Riavvia: cancella la bozza di sessione + la miniatura temporanea. |
| `POST /tpc/step/:step` (`1–4`) | Valida + persiste un passo → `{ valid, errors }`. |
| `POST /tpc/thumbnail` · `POST /tpc/thumbnail/remove` | Carica / rimuove la miniatura del plugin. |
| `GET /tpc/translation-fields` | Campi da tradurre (derivati dal passo 3). |
| `GET /tpc/summary` | Riepilogo in sola lettura dei passi 1→4 + modulo di destinazione + percorso del template. |
| `POST /tpc/generate` | **Genera il plugin** (scrive i file, facoltativamente genera + attiva un modulo). |

## Capacità (diritti avanzati)

Dichiarate in `config/react.capabilities.php` sotto la melisKey portatrice di diritti
`melistemplatingplugincreator_tool` (la stessa chiave usata dal manifest e dalla guardia di accesso
del controller). La semantica è **default-allow**. Stringhe di capacità appiattite:

| Capacità | Controlla |
| --- | --- |
| `wizard` · `wizard.edit` | Configura/valida i passi 1→4 (senza `wizard.edit` l'intera procedura guidata è in sola lettura). |
| `thumbnail` · `thumbnail.create` · `thumbnail.delete` | Carica / rimuove la miniatura (passo 2). |
| `summary` · `summary.list` | Legge il riepilogo (passo 5). |
| `finalization` · `finalization.create` | **Genera il plugin** (passo 6) — la capacità sensibile. |

Ogni azione del controller è protetta due volte — `denyUnlessAccess()` (autenticazione + `canAccess`)
poi `denyUnlessCan(cap)`. Nascondere i controlli nell'interfaccia è solo UX; il server rifiuta comunque.

## Servizi principali

Registrato come alias `service_manager` in `config/module.config.php`.

| Alias | Ruolo |
| --- | --- |
| `MelisTemplatingPluginCreatorService` | Genera (ed esegue il rollback) del plugin di templating a partire dai dati della procedura guidata salvati nella sessione. |

`MelisTemplatingPluginCreatorService` (estende `MelisCore\Service\MelisGeneralService`) espone in
particolare:

| Metodo | Ruolo |
| --- | --- |
| `generateTemplatingPlugin()` | Punto di ingresso: legge i passi della sessione e scrive tutti i file del plugin; esegue il rollback in caso di qualsiasi errore. Restituisce un booleano. |
| `getSiteTemplatingPluginNames($siteModule)` | Elenca i nomi dei plugin di templating esistenti di un modulo del sito (usato per rifiutare nomi di plugin duplicati). |
| `generateModuleNameCase($str)` / `convertToViewName($string)` | Normalizza un nome in un nome di modulo valido / nome di directory della vista. |
| `getTempThumbnail()` | Risolve il percorso temporaneo della miniatura del plugin caricata per la sessione corrente. |

Internamente `generateTemplatingPlugin()` esegue `performGeneration()`, che scrive la configurazione
del plugin (`config/plugins/<Module><Plugin>Plugin.config.php`), aggiorna il `module.config.php` di
destinazione (`template_map` + `controller_plugins`), aggiunge le traduzioni per lingua, genera gli
asset (css/js + miniatura), il controller
(`src/<Module>/Controller/Plugin/<Module><Plugin>Plugin.php`), la vista front-office e il form modale,
e include la nuova configurazione dal `Module.php` del modulo. Il controller React scrive il suo stato
della procedura guidata nello **stesso container di sessione** dello strumento legacy
(`templatingplugincreator`), perché il servizio ne cattura uno snapshot nel proprio costruttore.

## Front office

Questo modulo non aggiunge **alcun** plugin front-office di runtime o view helper proprio. Invece,
**genera** un plugin di templating nel modulo di destinazione: una classe controller-plugin che estende
`MelisEngine\Controller\Plugin\MelisTemplatingPlugin` con `loadDbXmlToPluginConfig()` /
`savePluginConfigToXml()` collegati ai campi configurati, un `config/plugins/*.config.php` (sezioni
`front` + `melis`, una scheda **Properties**), un `.phtml` front-office, un `.phtml` del form modale e
asset css/js. Il plugin generato appare quindi nel menu dei plugin dell'editor di pagina del CMS e
viene rilasciato in una `MelisDragDropZone` come qualsiasi altro plugin di templating — vedi
[Plugin](/it/guide/plugins) e [Costruire un sito](/it/guide/build-a-site).

## Tabelle del database

Nessuna. Questo strumento genera solo file sorgente e memorizza lo stato in corso della procedura
guidata in un container di sessione Laminas (`templatingplugincreator`); non viene installata alcuna
tabella `melis_*`.

## Esempio

Il plugin generato viene utilizzato come qualsiasi plugin di templating. Dal lato del servizio, il
passo finale della procedura guidata chiama:

```php
$tpcService = $serviceManager->get('MelisTemplatingPluginCreatorService');
$result = $tpcService->generateTemplatingPlugin(); // true in caso di successo, file scritti nel modulo di destinazione
```

## File principali

| Ambito | Percorso |
| --- | --- |
| Modulo / caricamento configurazione | `vendor/melisplatform/melis-templating-plugin-creator/src/Module.php` |
| Wiring (servizio, elementi del form, viste) | `vendor/melisplatform/melis-templating-plugin-creator/config/module.config.php` |
| Route API React + invokable | `vendor/melisplatform/melis-templating-plugin-creator/config/react-api.php` |
| Capacità React | `vendor/melisplatform/melis-templating-plugin-creator/config/react.capabilities.php` |
| Form della procedura guidata + configurazione dei passi (riutilizzata per la validazione) | `vendor/melisplatform/melis-templating-plugin-creator/config/app.tools.php` |
| Controller API React | `vendor/melisplatform/melis-templating-plugin-creator/src/Controller/MelisReactApiTemplatingPluginCreatorController.php` |
| Controller della procedura guidata legacy (iframe vista Old) | `vendor/melisplatform/melis-templating-plugin-creator/src/Controller/TemplatingPluginCreatorController.php` |
| Servizio generatore | `vendor/melisplatform/melis-templating-plugin-creator/src/Service/MelisTemplatingPluginCreatorService.php` |
| Brick React (sorgente + compilato) | `vendor/melisplatform/melis-templating-plugin-creator/ui-react/` · `public/ui-react/` |

Vedi anche: [Riferimento dei moduli](/it/reference/modules) · [Plugin](/it/guide/plugins) ·
[Creare uno strumento](/it/guide/create-a-tool) · [Costruire un sito](/it/guide/build-a-site).
