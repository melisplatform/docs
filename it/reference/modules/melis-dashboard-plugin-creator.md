# MelisDashboardPluginCreator

> Una procedura guidata passo-passo che genera lo scaffolding di un nuovo **plugin dashboard** (widget) di back-office in un modulo nuovo o esistente, ora distribuita come brick React nativo. Pacchetto `melisplatform/melis-dashboard-plugin-creator`.

## Scopo

MelisDashboardPluginCreator è un **assistente per la generazione di codice**: una procedura guidata in 5 passi che genera un widget dashboard pronto all'uso — il suo controller, la vista, la configurazione, gli asset e le traduzioni — e lo integra nel modulo di destinazione. Scegli un widget **a scheda singola** o **a schede multiple**, una destinazione (creare un modulo nuovo di zecca oppure estenderne uno esistente), titoli/descrizioni per ogni lingua, un'icona e una miniatura; lo strumento scrive quindi i file e (facoltativamente) attiva il plugin.

Il widget generato estende `MelisCore\Controller\DashboardPlugins\MelisCoreDashboardTemplatingPlugin` ed è dichiarato sotto l'interfaccia `melis_dashboardplugin`, così da comparire sulla dashboard di back-office. Il modulo dipende da `melis-core` e `melis-tool-creator` (quest'ultimo viene riutilizzato per generare lo scaffolding del nuovo modulo). Per i concetti alla base dei plugin dashboard, vedi [Plugin](/legacy/guide/plugins); per gli strumenti di back-office in generale, vedi [Creare uno strumento](/legacy/guide/create-a-tool).

## Abilitarlo

È un modulo Laminas standard. Aggiungilo a `config/melis.module.load.php`:

```php
return [
    // …
    'MelisDashboardPluginCreator',
];
```

Installa tramite Composer (`composer require melisplatform/melis-dashboard-plugin-creator`); `melis-core` e `melis-tool-creator` vengono inclusi automaticamente. Non è richiesto alcun database.

Lo strumento scrive file su disco, quindi i seguenti elementi devono essere **scrivibili** dal server web (verificati a runtime e comunicati alla procedura guidata come `context.blocking[]`): `config/melis.module.load.php`, la directory `module/` e il percorso della miniatura temporanea `<DOCUMENT_ROOT>/dpc/temp-thumbnail/` (configurato in `config/app.tools.php` sotto `melisdashboardplugincreator/datas/plugin_thumbnail/path`).

## Back-office React

Nel back-office React (`/melis-react`) lo strumento è distribuito come **brick full-React nativo** — una vera procedura guidata React che chiama una `react-api` JSON, con un interruttore **New / Old** che ripiega sullo strumento legacy jQuery all'interno di un iframe. Tutto il lavoro effettivo resta lato server: la validazione riutilizza i form Laminas legacy e la generazione chiama `MelisDashboardPluginCreatorService`. React si occupa della presentazione e delle chiamate API.

| Elemento | Valore |
| --- | --- |
| Tipo di brick | Full-React nativo (procedura guidata in 5 passi, con fallback New/Old su iframe legacy) |
| Id del brick | `dashboard-plugin-creator` |
| `route` del manifest | `/melis-core/dashboard-plugin-creator` (mount di fallback) |
| `label` | `Dashboard Plugin Creator` |
| `forwardKey` | `MelisDashboardPluginCreator/DashboardPluginCreator` |
| `melisKey` | `melisdashboardplugincreator_tool` |
| `subTabs` / `persistent` | `false` / `true` |
| Base API | `/melis/react-api/dpc` |

Il brick viene individuato tramite `GET /melis/react-api/react-modules` e compare **solo se il modulo è attivo** in `config/melis.module.load.php`. È `persistent`: la procedura guidata viene montata una sola volta e i suoi 5 passi sono pannelli mostrati/nascosti via CSS, quindi lasciando la scheda dello strumento e tornandovi non si perde né la bozza né il passo corrente. Un pulsante **Restart** (barra degli strumenti in alto) cancella la bozza di sessione e la miniatura temporanea. Spostando l'interruttore **New / Old** su *Old* si renderizza il controller legacy in un iframe (`/melis/react-tool-page?key=melisdashboardplugincreator_tool`) e si azzera la bozza di sessione condivisa; la procedura guidata avvisa prima se esiste una bozza.

## La procedura guidata in 5 passi

| Passo | Componente React | Cosa fai |
| --- | --- | --- |
| 1 — Plugin | `Step1Plugin` | **Nome del plugin**, **Tipo di vista** (Scheda singola / Schede multiple, 2–25 schede), **Destinazione del plugin** (Nuovo modulo + nome, oppure menu a tendina Modulo esistente). |
| 2 — Menu Texts & Display | `Step2Menu` | **Titolo del plugin** + **Descrizione** per ogni lingua (barra a schede delle lingue, almeno una richiesta); carica la **miniatura del plugin** richiesta (GIF/JPG/PNG, ~190×100, ≤500 kB). |
| 3 — Dashboard Texts & Display | `Step3Dashboard` | **Titolo della scheda** per ogni lingua, scelta dell'**icona del plugin** da una griglia; i plugin a schede multiple scelgono **un'icona per ciascuna scheda**. |
| 4 — Summary | `Step4Summary` | Riepilogo in sola lettura dei passi 1→3 + modulo di destinazione (recuperato da `/dpc/summary`); non viene scritto nulla. |
| 5 — Finalization | `Step5Finalize` | Interruttore **Activate plugin after creation** (attivo per impostazione predefinita) + **Finish and create the plugin** → generazione; all'attivazione un conto alla rovescia ricarica la piattaforma. |

Il passo 5 è l'**unica operazione che modifica dati**. Le regole di business (parola chiave PHP riservata, modulo già esistente, nome/titolo del plugin già in uso) sono validate lato server rispetto ai form Laminas legacy; i componenti React si limitano a renderizzare i messaggi per campo restituiti.

![Passo 1 — Plugin: nome, Tipo di vista (Scheda singola / Schede multiple) e Destinazione del plugin (Nuovo / Modulo esistente)](/screenshots/react/melis-dashboard-plugin-creator/melisdashboardcreator-tool-step1.png)

![Passo 2 — Menu Texts & Display: titolo/descrizione per ogni lingua (English / Français) più la miniatura del plugin richiesta con anteprima e Remove](/screenshots/react/melis-dashboard-plugin-creator/melisdashboardcreator-tool-step2.png)

![Passo 3 — Dashboard Texts & Display: titolo della scheda per ogni lingua e la griglia dell'icona del plugin (Calendar selezionata); i plugin a schede multiple aggiungono una griglia di icone per scheda](/screenshots/react/melis-dashboard-plugin-creator/melisdashboardcreator-tool-step3.png)

![Passo 4 — Summary: riepilogo in sola lettura di Plugin / Modulo di destinazione / Tipo, la miniatura, i testi del menu, i titoli della dashboard e l'icona prima della generazione](/screenshots/react/melis-dashboard-plugin-creator/melisdashboardcreator-tool-step4.png)

![Passo 5 — Finalization: l'interruttore "Activate plugin after creation" e il pulsante "Finish and create the plugin" che avvia la generazione](/screenshots/react/melis-dashboard-plugin-creator/melisdashboardcreator-tool-step5.png)

## API React

Le route risiedono in `config/react-api.php`, servite da `MelisReactApiDashboardPluginCreatorController`. Tutte sotto `/melis/react-api/dpc`, contratto `{ success, data, error }`. Un fallimento di validazione **non** è un errore HTTP — `POST /dpc/step/:step` restituisce `{ success:true, data:{ valid:false, errors:{…} } }` così che la UI possa mostrare i messaggi per campo.

| Metodo e URL | Scopo |
| --- | --- |
| `GET /dpc/context` | Preflight (scrivibilità FS → `blocking[]`), metadati dei passi, lingue, moduli esistenti, icone, min/max schede, limiti della miniatura |
| `GET /dpc/state` | Stato corrente della procedura guidata dalla sessione condivisa (ripristina la UI) |
| `POST /dpc/reset` | Restart: cancella la bozza di sessione + la miniatura temporanea |
| `POST /dpc/step/:step` (`1`–`3`) | Valida + persiste un passo → `{ valid, errors }` |
| `POST /dpc/thumbnail` | Upload multipart della miniatura del plugin |
| `POST /dpc/thumbnail/remove` | Rimuove la miniatura |
| `GET /dpc/summary` | Riepilogo in sola lettura dei passi 1→3 + modulo di destinazione |
| `POST /dpc/generate` | **Genera il plugin** → `{ generated, module, plugin, restartRequired, notices }` |

```ts
const BASE = '/melis/react-api/dpc'

// validate + save step 1
await postJson('/step/1', {
  dpc_plugin_name: 'SalesOverview', dpc_plugin_type: 'single',
  dpc_plugin_destination: 'new_module', dpc_new_module_name: 'MyDashboards',
}) // → { valid: true, errors: {} }

// generate (step 5) — the ONLY mutating call
await postJson('/generate', { dpc_activate_plugin: true })
// → { generated:true, module:'MyDashboards', plugin:'SalesOverview', restartRequired:true }
```

Il controller non reimplementa la logica dello strumento: la validazione ricostruisce i form Laminas legacy a partire da `config/app.tools.php` (`getFormMergedAndOrdered`), e lo stato viene scritto nello **stesso contenitore di sessione** dello strumento legacy (`dashboardplugincreator`), che il servizio legge nel suo costruttore.

## Capacità

Dichiarate in `config/react.capabilities.php` sotto il nodo portatore di diritti `melisdashboardplugincreator_tool`. La semantica è **default-allow** (una capacità non dichiarata è consentita, così i ruoli legacy continuano a funzionare). Stringhe di capacità appiattite:

| Scheda | Azioni | Vincoli |
| --- | --- | --- |
| `wizard` | `edit` | Configura/salva i passi 1→3 (senza `wizard.edit` l'intera procedura guidata è in sola lettura) |
| `thumbnail` | `create`, `delete` | Carica / rimuove la miniatura (passo 2) |
| `summary` | `list` | Legge il riepilogo (passo 4) |
| `finalization` | `create` | **Genera** il plugin (passo 5) — la capacità sensibile |

Ogni azione del controller è protetta due volte — prima l'accesso (`denyUnlessAccess`), poi la capacità pertinente (`denyUnlessCan('finalization.create')`). Nascondere i controlli in React è solo una questione di UX; il server rifiuta comunque.

## Servizi principali

Registrati in `config/module.config.php` e con alias:

| Alias del servizio | Ruolo |
| --- | --- |
| `MelisDashboardPluginCreatorService` | Genera il plugin dashboard dai dati salvati nella sessione della procedura guidata. |

`MelisDashboardPluginCreatorService` estende `MelisCore\Service\MelisGeneralService`. Metodi notevoli:

- `generateDashboardPlugin()` — il punto di ingresso: legge i passi della sessione, risolve il modulo/nome del plugin di destinazione, quindi esegue `performGeneration()`, effettuando il rollback in caso di errore (`rollbackPluginGeneration()`). Emette gli eventi `melisdashboard_plugin_creator_service_generate_dashboard_plugin_start/end`.
- Passi di generazione interni: `generateDashboardPluginConfig()` (scrive `config/dashboard-plugins/<Plugin>Plugin.config.php`), `generateDashboardPluginController()`, `generateDashboardPluginView()` (template a scheda singola o multipla), `generateDashboardPluginAssets()` (CSS/JS + copia la miniatura), `setTranslations()` (chiavi di menu/titolo per ogni lingua), `updateModuleConfig()` (inietta `template_map` + `controller_plugins`) e `updateModuleFile()` (aggiunge l'`include` della config a `Module.php`).
- Helper: `getModuleExistingPlugins()` / `getExistingTranslatedPluginTitle()` (controlli sui nomi duplicati), `getTempThumbnail()`, `generateFile()`, `generateModuleNameCase()`, `removeDir()`.

Quando la destinazione è un **nuovo modulo**, la generazione delega la creazione del modulo a `melis-tool-creator` (`MelisToolCreatorService::createTool()` con uno strumento `blank`), poi lo attiva (`ModulesService::activateModule()`) e invalida le cache dei percorsi dei moduli e del menu della dashboard. L'attivazione richiede un riavvio della piattaforma.

## Front office

Questo modulo non ha plugin di templating di front-office né view helper — è uno strumento esclusivamente di back-office. (I widget che *genera*, tuttavia, sono plugin dashboard di back-office.)

## Tabelle del database

MelisDashboardPluginCreator non definisce **alcuna tabella propria** — non viene distribuito alcun SQL di installazione o delta dbdeploy. Tutto lo stato è mantenuto nella sessione della procedura guidata; l'output viene scritto direttamente nei file del modulo di destinazione.

## Esempio

Avvia la generazione a partire dai dati già memorizzati nella sessione della procedura guidata (è ciò che fa dietro le quinte il passo 5 / `POST /dpc/generate`):

```php
/** @var \MelisDashboardPluginCreator\Service\MelisDashboardPluginCreatorService $dpc */
$dpc = $serviceManager->get('MelisDashboardPluginCreatorService');

$success = $dpc->generateDashboardPlugin(); // true on success, false (and rolled back) on failure
```

Il widget generato segue il template in `template/DashboardPluginController.php` — una classe che estende `MelisCoreDashboardTemplatingPlugin` con un'azione che restituisce un `ViewModel`:

```php
class MyModuleMyWidgetPlugin extends MelisCoreDashboardTemplatingPlugin
{
    public function __construct()
    {
        $this->pluginModule = 'mymodule';
        parent::__construct();
    }

    public function myWidget()
    {
        $view = new ViewModel();
        $view->setTemplate('my-module/dashboard-plugins/my-widget');
        return $view;
    }
}
```

## File principali

| Ambito | Percorso |
| --- | --- |
| Manifest del modulo | `vendor/melisplatform/melis-dashboard-plugin-creator/composer.json` |
| Route / servizio / controller / form | `vendor/melisplatform/melis-dashboard-plugin-creator/config/module.config.php` |
| Route API React | `vendor/melisplatform/melis-dashboard-plugin-creator/config/react-api.php` |
| Capacità React | `vendor/melisplatform/melis-dashboard-plugin-creator/config/react.capabilities.php` |
| Passi della procedura guidata, form, icone, config miniatura | `vendor/melisplatform/melis-dashboard-plugin-creator/config/app.tools.php` |
| Servizio di generazione | `vendor/melisplatform/melis-dashboard-plugin-creator/src/Service/MelisDashboardPluginCreatorService.php` |
| Controller API React | `vendor/melisplatform/melis-dashboard-plugin-creator/src/Controller/MelisReactApiDashboardPluginCreatorController.php` |
| Controller legacy della procedura guidata (vista Old) | `vendor/melisplatform/melis-dashboard-plugin-creator/src/Controller/DashboardPluginCreatorController.php` |
| Sorgente del brick React | `vendor/melisplatform/melis-dashboard-plugin-creator/ui-react/src/` |
| Brick compilato + manifest | `vendor/melisplatform/melis-dashboard-plugin-creator/public/ui-react/` |
| Template dei plugin generati | `vendor/melisplatform/melis-dashboard-plugin-creator/template/` |

::: tip Correlato
Questa è la controparte per la dashboard di `melis-templating-plugin-creator` (plugin di templating di front-office). Per comprendere gli artefatti che genera, leggi [Plugin](/legacy/guide/plugins).
:::
