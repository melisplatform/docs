# MelisDemoCms

> Il sito web ufficiale di riferimento/demo di Melis Platform — un **modulo sito** pronto da
> installare che insegna agli sviluppatori come è strutturato un sito front-office di Melis.
> Pacchetto `melisplatform/melis-demo-cms`.

## Scopo

`MelisDemoCms` è un sito web front-office completo e installabile (`melis-site: true`,
`type: melisplatform-module`, categoria `cms`). **Non è uno strumento di back-office**: le sue
pagine, i controller e i template dei plugin illustrano le tre tecniche di composizione dei
contenuti — **posizionamento manuale dei plugin**, **zone drag-and-drop** e **tag modificabili
inline** — utilizzando MelisFront, MelisEngine e i moduli di contenuto CMS (slider, news,
prospects). Usalo come implementazione di riferimento quando
[costruisci un sito](/it/guide/build-a-site).

![La home page front-office live di MelisDemoCms — navigazione superiore (News / Team / Our Services / Our Process / FAQ / Contact), l'hero "Melis Demo Cms" con una call-to-action "Try to Free" sopra una grafica hero da dashboard. Questo è il sito demo renderizzato lato server, non una schermata React di back-office.](/screenshots/react/melis-demo-cms/melisdemocms-site.png)

## Non ha un back-office React

Melis v6 ha introdotto un back-office React, ma `MelisDemoCms` è un **sito front-office**, non uno
strumento di back-office, quindi deliberatamente **non è migrato a React**:

- nessun progetto brick `ui-react/`, nessun `public/ui-react/brick.manifest.json`;
- nessun endpoint `config/react-api.php` e nessuna capability `config/react.capabilities.php`;
- nessuna voce nella barra laterale e nessun nodo di menu in `/melis-react`.

Non cercherai mai uno strumento "MelisDemoCms" nella shell React. Il sito demo è **contenuto su cui
operano gli strumenti CMS React generici**, e il sito live è **renderizzato lato server** da
MelisFront/MelisEngine ogni volta che un visitatore naviga sul dominio.

### Come ci lavori in `/melis-react`

Poiché il modulo non ha uno strumento proprio, lo modifichi con gli strumenti CMS React generici:

| Strumento React | Cosa ci fai qui |
| --- | --- |
| **CMS page editor** | Apri qualsiasi pagina demo (Home, News, Team, FAQ, Contact…) dall'albero **CMS Pages** e modifica i suoi blocchi inline, le zone drag-and-drop e i plugin. Superficie di modifica principale. |
| **Media** | Gestisci le immagini/i file a cui le pagine fanno riferimento. |
| **Sites** | Le impostazioni di dominio / lingua del sito demo. |
| **Templates** | I template di pagina usati dalle pagine CMS. |

> **Dove:** barra laterale → **CMS Pages** → apri una pagina del sito demo nell'editor. Non c'è
> alcuna voce "MelisDemoCms" nella barra laterale — il modulo è il *contenuto*, non uno strumento.

## Abilitarlo

`MelisDemoCms` è un modulo sito Laminas installato in `module/MelisSites/MelisDemoCms/` tramite gli
`installer-paths` di Composer. Il suo `config/module.load.php` dichiara i moduli che si aspetta
vengano caricati insieme ad esso:

```php
// vendor/melisplatform/melis-demo-cms/config/module.load.php
'MelisAssetManager', 'MelisEngine', 'MelisFront',
'MelisCmsNews', 'MelisCmsSlider', 'MelisCmsProspects',
'MelisDemoCms', 'MelisCmsPageScriptEditor'
```

Dipendenze Composer richieste: `melis-cms`, `melis-cms-slider`, `melis-cms-prospects`,
`melis-cms-news`, `melis-cms-page-script-editor` (`^6.0`). `melis-engine` e `melis-front` sono
suggeriti (e richiesti a runtime). Il sito viene attivato per un dominio impostando la variabile
d'ambiente del vhost `MELIS_MODULE "MelisDemoCms"`.

## Servizi principali

| Alias del servizio | Ruolo |
| --- | --- |
| `DemoCmsService` | Helper specifici del sito usati dai controller front-office e dai listener di setup. |
| `MelisPlatformTable` | Gateway di tabella generico sulla tabella core della piattaforma (`MelisEngine\Model\Tables\MelisGenericTable`, chiave primaria `plf_id`). |

## Setup del sito (installer, non React)

Questo modulo non aggiunge voci al toolstree del back-office. La sua unica superficie back-office è
il **wizard di setup del sito** usato dal marketplace/installer: controller
`MelisDemoCms\Controller\MelisSetupController` (rotta `/MelisDemoCms/setup`),
`MelisSetupPostDownloadController` e `MelisSetupPostUpdateController`. La configurazione del setup si
trova in `config/setup/download.config.php` e `config/setup/update.config.php`. Si tratta di un
aspetto back-end / CLI senza alcuna superficie React.

## Front office

Il sito è gestito da semplici controller di sito MelisFront, uno per tipo di pagina:

| Controller | Pagina |
| --- | --- |
| `MelisDemoCms\Controller\Home` | Home (carosello + slider secondario, testimonianze, banner GDPR) |
| `MelisDemoCms\Controller\News` | Elenco news / dettaglio news |
| `MelisDemoCms\Controller\Team` | Team |
| `MelisDemoCms\Controller\Services` | Elenco servizi / dettaglio |
| `MelisDemoCms\Controller\Faq` | Elenco FAQ e blocchi di categoria |
| `MelisDemoCms\Controller\Contact` | Modulo Contatti / prospects |
| `MelisDemoCms\Controller\Testimonial` | Testimonianza |
| `MelisDemoCms\Controller\Template` / `DragDrop` | Demo di template (statico / drag-drop / misto) |
| `MelisDemoCms\Controller\Search` | Risultati di ricerca sul sito (Lucene; disabilitata nella demo) |
| `MelisDemoCms\Controller\Page404` | Pagina di errore 404 |

Anziché fornire plugin propri, `MelisDemoCms` mette a disposizione **override dei template dei
plugin** (`view/plugins/*.phtml`) collegati in `config/melis.plugins.config.php`:

| Plugin di templating (modulo proprietario) | Template forniti da questo sito |
| --- | --- |
| `MelisFrontMenuPlugin` (MelisFront) | `menu`, `white-menu`, `footer-menu` |
| `MelisFrontShowListFromFolderPlugin` (MelisFront) | `faq-listing`, `faq-values`, `home-testimonial-slider` |
| `MelisFrontGdprBannerPlugin` (MelisFront) | `gdpr-banner` |
| `MelisCmsSliderShowSliderPlugin` (MelisCmsSlider) | `home-carousel-slider`, `home-slider2`, `team-slider` |
| `MelisCmsNewsListNewsPlugin` / `…ShowNewsPlugin` / `…LatestNewsPlugin` (MelisCmsNews) | `news-list`, `news-details`, `latest-news-vertical`, `latest-news-horizontal` |
| `MelisCmsProspectsShowFormPlugin` (MelisCmsProspects) | `prospect-form` |

### Le tre tecniche di composizione

| Tecnica | Come funziona | Pagine di esempio |
| --- | --- | --- |
| **Posizionamento manuale** | Il plugin viene istanziato nel controller, renderizzato con parametri e aggiunto come figlio della view — la view lo restituisce con echo. | Home, Team (slider), News, FAQ, Contact |
| **Zona drag-and-drop** | Il `.phtml` dichiara una zona con nome; l'editor di pagine CMS React vi rilascia qualsiasi plugin; nessun codice nel controller. | DragDrop, showcase di Template |
| **Tag modificabili inline** | `MelisTag` racchiude un valore predefinito nella view; l'autore modifica testo/immagini sul posto dall'editor di pagine React. | Services, Testimonial, 404 |

### Listener

`SetupDemoCmsListener` gestisce il processo di installazione del sito.
`MelisDemoCmsCreateConfigListener` scrive `MelisDemoCms.config.php` a partire dal `.config.stub`
dopo un'installazione dal marketplace. `SiteMenuCustomizationListener` personalizza il menu
front-office. `LatestNewsHorizontalListener` regola l'output del plugin latest-news.

## Database

`MelisDemoCms` non definisce tabelle `melis_*` proprie. `MelisPlatformTable` legge la tabella core
`melis_core_platform`. Tutti i contenuti demo (pagine, template, slider, news, chiavi di
configurazione) vengono creati al momento dell'installazione dai listener di setup, basandosi sui
valori di `config/MelisDemoCms.config.php` come `home_page_id`, `news_page_id` e
`home_page_slider_1_id`.

## Esempio

Un controller front-office renderizza un plugin di templating iniettando un percorso di template
specifico del sito e un ID guidato dalla configurazione — lo schema usato in tutto il sito
(`HomeController`):

```php
$cfg = $this->getServiceManager()->get('MelisSiteConfigService');

$slider = $this->MelisCmsSliderShowSliderPlugin();
$homeSlider1 = $slider->render([
    'template_path' => 'MelisDemoCms/plugins/home-carousel-slider',
    'id'            => 'homeSlider1',
    'pageId'        => $this->idPage,
    'sliderId'      => $cfg->getSiteConfigByKey('home_page_slider_1_id', $this->idPage),
]);
$this->view->addChild($homeSlider1, 'homeSlider1');
// view: <?= $this->homeSlider1 ?>
```

Una zona drag-and-drop richiede una singola chiamata nella view — nessun codice nel controller (il
blocco viene riempito dall'editor di pagine CMS React):

```php
<?= $this->MelisDragDropZone($this->idPage, 'dragdropzone_home_1') ?>
```

Un tag modificabile inline con un valore predefinito (modificato sul posto dall'editor di pagine
React):

```php
<?= $this->MelisTag($this->idPage, 'static-html-1', 'html', '<h1>Accessible…</h1>') ?>
```

## File principali

| Aspetto | Percorso (sotto `vendor/melisplatform/melis-demo-cms/`) |
| --- | --- |
| Rotte, controller, mappa dei template | `config/module.config.php` |
| Moduli caricati con il sito | `config/module.load.php` |
| Collegamento degli override dei template dei plugin | `config/melis.plugins.config.php` |
| Chiavi di configurazione per sito (ID di pagina / slider / cartella) | `config/MelisDemoCms.config.php`, `…config.stub` |
| Flusso di setup del sito | `config/setup/download.config.php`, `config/setup/update.config.php` |
| Bootstrap e registrazione dei listener | `src/Module.php` |
| Servizio helper del sito | `src/Service/DemoCmsService.php` |
| Controller di setup e post-installazione | `src/Controller/MelisSetupController.php`, `…PostDownloadController.php`, `…PostUpdateController.php` |
| Listener di installazione / menu / news | `src/Listener/` |
| Template dei plugin | `view/plugins/*.phtml` |
| View delle pagine | `view/melis-demo-cms/*/*.phtml` |
| Demo dei template | `view/melis-demo-cms/template/` |

Vedi anche: [Riferimento dei moduli](/it/reference/modules), [Costruire un sito](/it/guide/build-a-site),
[Plugin](/it/guide/plugins).
