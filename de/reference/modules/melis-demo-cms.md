# MelisDemoCms

> Die offizielle Referenz-/Demo-Website der Melis Platform — ein installationsfertiges **Site-Modul**,
> das Entwicklern zeigt, wie eine Melis-Front-Office-Site aufgebaut ist. Paket `melisplatform/melis-demo-cms`.

## Zweck

`MelisDemoCms` ist eine vollständige, installierbare Front-Office-Website (`melis-site: true`,
`type: melisplatform-module`, Kategorie `cms`). Es ist **kein Back-Office-Werkzeug**: Seine Seiten,
Controller und Plugin-Templates demonstrieren die drei Techniken der Inhaltszusammenstellung — **manuelle
Plugin-Platzierung**, **Drag-and-Drop-Zonen** und **inline editierbare Tags** — unter Verwendung von MelisFront,
MelisEngine und den CMS-Inhaltsmodulen (Slider, News, Prospects). Verwenden Sie es als
Referenzimplementierung, wenn Sie [eine Site erstellen](/de/guide/build-a-site).

![Die live geschaltete MelisDemoCms-Front-Office-Startseite — obere Navigation (News / Team / Our Services / Our Process / FAQ / Contact), der "Melis Demo Cms"-Hero-Bereich mit einer "Try to Free"-Handlungsaufforderung über einer Dashboard-Hero-Grafik. Dies ist die serverseitig gerenderte Demo-Website, keine React-Back-Office-Ansicht.](/screenshots/react/melis-demo-cms/melisdemocms-site.png)

## Es hat kein React-Back-Office

Melis v6 hat ein React-Back-Office eingeführt, aber `MelisDemoCms` ist eine **Front-Office-Site**, kein
Back-Office-Werkzeug, und wurde daher bewusst **nicht nach React migriert**:

- kein `ui-react/`-Brick-Projekt, keine `public/ui-react/brick.manifest.json`;
- keine `config/react-api.php`-Endpunkte und keine `config/react.capabilities.php`-Capabilities;
- kein Sidebar-Eintrag und kein Menüknoten in `/melis-react`.

Sie suchen niemals nach einem „MelisDemoCms"-Werkzeug in der React-Shell. Die Demo-Site ist **Inhalt, mit dem
die generischen React-CMS-Werkzeuge arbeiten**, und die live geschaltete Site wird von
MelisFront/MelisEngine **serverseitig gerendert**, sobald ein Besucher die Domain aufruft.

### Wie Sie in `/melis-react` daran arbeiten

Da das Modul kein eigenes Werkzeug besitzt, bearbeiten Sie es mit den generischen React-CMS-Werkzeugen:

| React-Werkzeug | Was Sie hier damit tun |
| --- | --- |
| **CMS page editor** | Öffnen Sie eine beliebige Demo-Seite (Home, News, Team, FAQ, Contact…) aus dem **CMS Pages**-Baum und bearbeiten Sie deren Inline-Blöcke, Drag-and-Drop-Zonen und Plugins. Primäre Bearbeitungsoberfläche. |
| **Media** | Verwalten Sie die Bilder/Dateien, auf die die Seiten verweisen. |
| **Sites** | Die Domain-/Spracheinstellungen der Demo-Site. |
| **Templates** | Die Seitenvorlagen, die die CMS-Seiten verwenden. |

> **Wo:** Sidebar → **CMS Pages** → eine Seite der Demo-Site im Editor öffnen. Es gibt keinen
> „MelisDemoCms"-Eintrag in der Sidebar — das Modul ist der *Inhalt*, kein Werkzeug.

## Aktivierung

`MelisDemoCms` ist ein Laminas-Site-Modul, das durch die `installer-paths` von Composer unter
`module/MelisSites/MelisDemoCms/` installiert wird. Seine eigene `config/module.load.php` deklariert die
Module, die es erwartet, dass sie zusammen mit ihm geladen werden:

```php
// vendor/melisplatform/melis-demo-cms/config/module.load.php
'MelisAssetManager', 'MelisEngine', 'MelisFront',
'MelisCmsNews', 'MelisCmsSlider', 'MelisCmsProspects',
'MelisDemoCms', 'MelisCmsPageScriptEditor'
```

Erforderliche Composer-Abhängigkeiten: `melis-cms`, `melis-cms-slider`, `melis-cms-prospects`,
`melis-cms-news`, `melis-cms-page-script-editor` (`^6.0`). `melis-engine` und `melis-front` werden
empfohlen (und sind zur Laufzeit erforderlich). Die Site wird für eine Domain aktiviert, indem die
vhost-Umgebungsvariable `MELIS_MODULE "MelisDemoCms"` gesetzt wird.

## Zentrale Services

| Service-Alias | Rolle |
| --- | --- |
| `DemoCmsService` | Site-spezifische Hilfsfunktionen, die von den Front-Controllern und Setup-Listenern verwendet werden. |
| `MelisPlatformTable` | Generisches Table-Gateway über die Kern-Plattformtabelle (`MelisEngine\Model\Tables\MelisGenericTable`, Primärschlüssel `plf_id`). |

## Site-Einrichtung (Installer, nicht React)

Dieses Modul fügt keine Einträge im Back-Office-Werkzeugbaum hinzu. Seine einzige Back-Office-Oberfläche ist der
**Site-Einrichtungsassistent**, der vom Marketplace/Installer verwendet wird: die Controller
`MelisDemoCms\Controller\MelisSetupController` (Route `/MelisDemoCms/setup`),
`MelisSetupPostDownloadController` und `MelisSetupPostUpdateController`. Die Setup-Konfiguration liegt
in `config/setup/download.config.php` und `config/setup/update.config.php`. Dies ist ein Back-End-/CLI-Belang
ohne React-Oberfläche.

## Front-Office

Die Site wird von einfachen MelisFront-Site-Controllern gesteuert, einer pro Seitentyp:

| Controller | Seite |
| --- | --- |
| `MelisDemoCms\Controller\Home` | Home (Karussell + sekundärer Slider, Testimonials, DSGVO-Banner) |
| `MelisDemoCms\Controller\News` | News-Liste / News-Details |
| `MelisDemoCms\Controller\Team` | Team |
| `MelisDemoCms\Controller\Services` | Services-Liste / Details |
| `MelisDemoCms\Controller\Faq` | FAQ-Auflistung und Kategorieblöcke |
| `MelisDemoCms\Controller\Contact` | Contact / Prospects-Formular |
| `MelisDemoCms\Controller\Testimonial` | Testimonial |
| `MelisDemoCms\Controller\Template` / `DragDrop` | Template-Demos (statisch / Drag-and-Drop / gemischt) |
| `MelisDemoCms\Controller\Search` | Site-interne Suchergebnisse (Lucene; in der Demo deaktiviert) |
| `MelisDemoCms\Controller\Page404` | 404-Fehlerseite |

Anstatt eigene Plugins mitzuliefern, stellt `MelisDemoCms` **Plugin-Template-Overrides** bereit
(`view/plugins/*.phtml`), die in `config/melis.plugins.config.php` verdrahtet sind:

| Templating-Plugin (besitzendes Modul) | Von dieser Site bereitgestellte Templates |
| --- | --- |
| `MelisFrontMenuPlugin` (MelisFront) | `menu`, `white-menu`, `footer-menu` |
| `MelisFrontShowListFromFolderPlugin` (MelisFront) | `faq-listing`, `faq-values`, `home-testimonial-slider` |
| `MelisFrontGdprBannerPlugin` (MelisFront) | `gdpr-banner` |
| `MelisCmsSliderShowSliderPlugin` (MelisCmsSlider) | `home-carousel-slider`, `home-slider2`, `team-slider` |
| `MelisCmsNewsListNewsPlugin` / `…ShowNewsPlugin` / `…LatestNewsPlugin` (MelisCmsNews) | `news-list`, `news-details`, `latest-news-vertical`, `latest-news-horizontal` |
| `MelisCmsProspectsShowFormPlugin` (MelisCmsProspects) | `prospect-form` |

### Die drei Kompositionstechniken

| Technik | Funktionsweise | Beispielseiten |
| --- | --- | --- |
| **Manuelle Platzierung** | Plugin wird im Controller instanziiert, mit Parametern gerendert und als View-Child hinzugefügt — die View gibt es aus. | Home, Team (Slider), News, FAQ, Contact |
| **Drag-and-Drop-Zone** | Die `.phtml` deklariert eine benannte Zone; der React-CMS-Seiteneditor legt ein beliebiges Plugin hinein; kein Controller-Code. | DragDrop, Template-Showcases |
| **Inline editierbare Tags** | `MelisTag` umschließt einen Standardwert in der View; der Autor bearbeitet Text/Bilder direkt aus dem React-Seiteneditor. | Services, Testimonial, 404 |

### Listener

`SetupDemoCmsListener` steuert den Installationsprozess der Site.
`MelisDemoCmsCreateConfigListener` schreibt `MelisDemoCms.config.php` aus der `.config.stub` nach einer
Marketplace-Installation. `SiteMenuCustomizationListener` passt das Front-Menü an.
`LatestNewsHorizontalListener` justiert die Ausgabe des Latest-News-Plugins.

## Datenbank

`MelisDemoCms` definiert keine eigenen `melis_*`-Tabellen. `MelisPlatformTable` liest die Kern-Tabelle
`melis_core_platform`. Alle Demo-Inhalte (Seiten, Templates, Slider, News, Konfigurationsschlüssel) werden
zur Installationszeit von den Setup-Listenern erstellt, ausgehend von den Werten in
`config/MelisDemoCms.config.php` wie `home_page_id`, `news_page_id` und `home_page_slider_1_id`.

## Beispiel

Ein Front-Controller rendert ein Templating-Plugin, indem er einen site-spezifischen Template-Pfad und eine
konfigurationsgesteuerte ID injiziert — das Muster, das überall auf der Site verwendet wird (`HomeController`):

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

Eine Drag-and-Drop-Zone erfordert einen einzigen Aufruf in der View — kein Controller-Code (der Block wird
aus dem React-CMS-Seiteneditor befüllt):

```php
<?= $this->MelisDragDropZone($this->idPage, 'dragdropzone_home_1') ?>
```

Ein inline editierbares Tag mit einem Standardwert (direkt aus dem React-Seiteneditor bearbeitet):

```php
<?= $this->MelisTag($this->idPage, 'static-html-1', 'html', '<h1>Accessible…</h1>') ?>
```

## Zentrale Dateien

| Belang | Pfad (unter `vendor/melisplatform/melis-demo-cms/`) |
| --- | --- |
| Routen, Controller, Template-Map | `config/module.config.php` |
| Mit der Site geladene Module | `config/module.load.php` |
| Verdrahtung der Plugin-Template-Overrides | `config/melis.plugins.config.php` |
| Pro-Site-Konfigurationsschlüssel (Seiten-/Slider-/Ordner-IDs) | `config/MelisDemoCms.config.php`, `…config.stub` |
| Ablauf der Site-Einrichtung | `config/setup/download.config.php`, `config/setup/update.config.php` |
| Bootstrap und Listener-Registrierung | `src/Module.php` |
| Site-Hilfsservice | `src/Service/DemoCmsService.php` |
| Setup- und Post-Install-Controller | `src/Controller/MelisSetupController.php`, `…PostDownloadController.php`, `…PostUpdateController.php` |
| Install-/Menü-/News-Listener | `src/Listener/` |
| Plugin-Templates | `view/plugins/*.phtml` |
| Seitenansichten | `view/melis-demo-cms/*/*.phtml` |
| Template-Demos | `view/melis-demo-cms/template/` |

Siehe auch: [Modulreferenz](/de/reference/modules), [Eine Site erstellen](/de/guide/build-a-site),
[Plugins](/de/guide/plugins).
