# MelisFront

> Das Front-Office-Rendering-System, das eine URL in eine fertige öffentliche Seite verwandelt und die Inhaltsblöcke (Seiten-Plugins) ausliefert, die Redakteure im React-Back-Office auf Seiten ablegen. Paket `melisplatform/melis-front`.

## Zweck

MelisFront ist die Laufzeitumgebung, die eine Webadresse zu einer Melis-Seite auflöst, die Render-Pipeline ausführt (Routing, SEO, Templating-Plugins, Layout, Caching, Asset-Minifizierung) und die HTML-Antwort an den Besucher ausliefert. Es ermöglicht außerdem die **live bearbeitbare Vorschau**, indem es jede Seite im Modus `melis` neu rendert. MelisFront besitzt keine eigenen Datenbanktabellen — sämtliche Seiten-, Site-, Template- und SEO-Daten werden aus [melis-engine](/de/reference/modules/melis-engine) gelesen, der einzigen maßgeblichen Datenquelle.

MelisFront ist Teil eines eng gekoppelten Trios: [melis-engine](/de/reference/modules/melis-engine) (Datenschicht), **melis-front** (Front-Rendering), [melis-cms](/de/reference/modules/melis-cms) (Back-Office-Editor). Änderungen an einem der drei betreffen regelmäßig auch die beiden anderen.

## Im React-Back-Office

MelisFront hat **kein eigenständiges React-Tool**: keinen `ui-react/`-Brick, keine `brick.manifest.json`, keine `react-api.php` — es erscheint niemals in der linken Seitenleiste von `/melis-react`. Seine gesamte Back-Office-Oberfläche besteht aus der Menge der **Seiten-Plugins (Inhaltsblöcke)**, die Sie innerhalb des **MelisCms-Seiteneditors** konfigurieren.

MelisFront begegnet Ihnen, wenn Sie eine Seite bearbeiten: **MelisCms → Seite öffnen → Tab „Edition"**. Dieser Edition-Tab ist der klassische Drag-and-Drop-Seiteneditor, der **in einem iframe innerhalb der React-Shell gerendert wird** (`/melis/react-tool-page?key=meliscms_page`). Darin ziehen Sie die Blöcke von MelisFront in Zonen und öffnen deren **Eigenschaften**-Modal. React *hostet* diesen Legacy-Editor lediglich; MelisFront steuert keine eigene React-Komponente bei.

Es gibt zwei Arten von Blöcken:

- **Tag-Blöcke**, die **direkt** auf der Seite bearbeitet werden — **HTML** (Rich Text) und **Media** (Bild/Datei). Kein Modal.
- **Config-Blöcke**, die über ein **Eigenschaften**-Modal eingerichtet werden — **Menu**, **Breadcrumb**, **List-from-folder**, **GDPR-Banner**. Sie generieren Inhalte aus dem Seitenbaum bzw. der Site-Konfiguration.

## Aktivierung

Fügen Sie zu `config/melis.module.load.php` hinzu:

```php
return [
    'MelisFront',
];
```

Deklarierte Melis-Abhängigkeit: `melisplatform/melis-core`. Zur Laufzeit nutzt es außerdem MelisEngine-Dienste. Ladereihenfolge: `melis-core` → **melis-front** → `melis-engine` → `melis-cms`.

## Tag-Blöcke — direkt bearbeiten

### HTML (Text)

Der Arbeitspferd-Block: ein **Rich-Text-Bereich** (TinyMCE) für Titel, Absätze, Links und formatierte Inhalte. Wird **direkt auf der Seite** bearbeitet, ohne Eigenschaften-Modal. Plugin-Klasse `MelisFrontTagHtmlPlugin`.

![HTML/Text-Block im Seiteneditor mit der vollständigen TinyMCE-Symbolleiste](/screenshots/react/melis-front/melisfront-page-plugin-html-tag.png)

### Media

Platziert ein **Bild oder eine Datei** aus der Medienbibliothek. Wird ebenfalls direkt über eine kompakte Symbolleiste mit dem Platzhalter „Add media content here" bearbeitet. Plugin-Klasse `MelisFrontTagMediaPlugin`.

![Media-Block direkt bearbeitet mit dem Platzhalter „Add media content here"](/screenshots/react/melis-front/melisfront-page-plugin-media-tag.png)

## Config-Blöcke — Eigenschaften-Modal

Config-Blöcke werden über ein kleines **Eigenschaften**-Modal eingerichtet, das von der Plattform gerendert wird. Die beiden wiederkehrenden Felder sind das Dropdown **Template** (`MelisEnginePluginTemplateSelect`, Feld `template_path`), das die `.phtml`-Ansicht auswählt, und ein **Seitenauswahl-Feld** (`MelisText` mit einer `fa fa-sitemap`-Schaltfläche), das die Start- bzw. übergeordnete Seite im Baum festlegt. Jeder Config-Block deklariert sein Modal als `melis.modal_form` (Laminas-Formularspezifikation) in `config/plugins/<Plugin>.config.php`; es gibt keine plugin-spezifische React-Komponente.

### Menu

Erstellt **automatisch ein Navigationsmenü aus dem Seitenbaum**. Modal-Felder: **Template** und **Starting page**. Plugin `MelisFrontMenuPlugin` (Feld `pageIdRootMenu`).

![Eigenschaften-Modal des Menu-Blocks mit den Feldern Template und Starting page](/screenshots/react/melis-front/melisfront-page-plugin-menu-config-properties.png)

### Breadcrumb

Rendert den „Sie sind hier"-Pfad (Home › Bereich › Seite). Modal-Felder: **Template** (Standard `MelisFront/breadcrumb`) und **Starting page**. Plugin `MelisFrontBreadcrumbPlugin` (Feld `pageIdRootBreadcrumb`).

![Eigenschaften-Modal des Breadcrumb-Blocks mit den Feldern Template und Starting page](/screenshots/react/melis-front/melisfront-page-plugin-breadcrumb-config-properties.png)

### List-from-folder

Nimmt einen **Ordner im Seitenbaum und listet dessen untergeordnete Seiten** automatisch auf. Modal-Felder: **Template** (wie jedes Element gerendert wird) und **Parent page** (der Quellordner). Plugin `MelisFrontShowListFromFolderPlugin` (Feld `pageIdFolder`).

![Eigenschaften-Modal von List-from-folder mit den Feldern Template und Parent page](/screenshots/react/melis-front/melisfront-page-plugin-folderlisting-config-properties.png)

### GDPR-Banner

Das auf der öffentlichen Site angezeigte **Cookie-/Einwilligungsbanner**. Sein Modal benötigt nur das **Template**; der Wortlaut stammt aus den GDPR-Texten der Site. Plugin `MelisFrontGdprBannerPlugin`.

![Eigenschaften-Modal des GDPR-Banners mit einem einzelnen Template-Feld](/screenshots/react/melis-front/melisfront-page-plugin-gdprbanner-config-properties.png)

### Felder des Config-Modals

| Plugin | Modal-Felder (Name / Typ) | Standard-Template |
| --- | --- | --- |
| Breadcrumb | `template_path` (`MelisEnginePluginTemplateSelect`) · `pageIdRootBreadcrumb` (`MelisText`, sitemap) | `MelisFront/breadcrumb` |
| Menu | `template_path` · `pageIdRootMenu` (`MelisText`, sitemap) | `MelisFront/menu` |
| List-from-folder | `template_path` · `pageIdFolder` (`MelisText`, sitemap) | `MelisFront/show-list-from-folder` |
| GDPR-Banner | nur `template_path` | `MelisFront/gdpr-banner` |

**Apply** sendet die Werte über die Drag-and-Drop-Schicht zurück, die sie in das Session-XML der Seite persistiert. React ist an diesem Hin und Her nicht beteiligt; die Plugin-Oberfläche ist vollständig Legacy-PHP/JS innerhalb des Edition-iframes.

## Zentrale Dienste

| Dienst-Alias | Rolle |
| --- | --- |
| `MelisFrontHead` | Verwaltet den Seiten-`<title>`, die Meta-Description, den Canonical und injiziert die CSS-/JS-Assets der Plugins. |
| `MelisSiteConfigService` | Liest die site-spezifische Konfiguration nach Schlüssel, Seite oder Sprache — Zusammenführung von Datei und DB. |
| `MelisSiteTranslationService` | Site-spezifisches Nachschlagen und CRUD von Übersetzungsschlüssel/-text, pro Site zwischengespeichert. |
| `MelisTranslationService` | Modul-/Locale-Übersetzungen (Back-Office-Strings), zwischengespeichert. |
| `MinifyAssets` | Erstellt `bundle.css` / `bundle.js` pro Site mithilfe von `matthiasmullie/minify`. |
| `MelisFrontNavigation` | Navigations-Factory, die aus dem Seitenbaum der Engine einen `Laminas\Navigation`-Baum erstellt. |

## Front-Rendering

### Routing

Die Haupt-Front-Route ist ein Regex-Muster, das `.../id/{idpage}` abgleicht und an `MelisFront\Controller\Index::index` weiterleitet. Untergeordnete Routen: `/renderMode/melis` (Back-Office-Bearbeitungsmodus, von MelisCms genutzt) und `/preview` (Vorschau der gespeicherten Version). Spezielle Routen: `sitemap(.xml)`, `/css/plugin-width.css`, `/melissearchindex/…`, `/melispluginrenderer` (AJAX-Rendering eines einzelnen Plugins), `/minify-assets`.

### Render-Pipeline (Listener)

Verdrahtet in `src/Module.php` über `EVENT_DISPATCH` und `EVENT_FINISH` (insgesamt ~19 Listener):

| Phase | Listener |
| --- | --- |
| `EVENT_LOAD_MODULES_POST` | `MelisFrontSEORouteListener`, `MelisFrontSiteConfigListener`, `MelisFrontMiniTemplateConfigListener` |
| `EVENT_DISPATCH` | `MelisFrontXSSParameterListener`, `MelisFrontHomePageRoutingListener` / `…HomePageIdOverrideListener`, `MelisFrontSEODispatchRouterRegularUrlListener` (Seitenvalidierung, 404/301, löst `melisfront_site_dispatch_ready` aus), `MelisFront404To301Listener`, `MelisFront404CatcherListener` |
| `EVENT_FINISH` | `MelisFrontPluginsToLayoutListener` (Plugin-CSS/JS), `MelisFrontSEOMetaPageListener` (Titel/Description/Canonical), `MelisFrontAttachCssListener` (Seiten-CSS), `MelisFrontLayoutListener` (Front-Layout oder BO-Layout + TinyMCE im Modus `melis`), `MelisFrontPageCacheListener`, `MelisFrontMinifiedAssetsCheckerListener` |

### Templating-Plugins (Controller-Plugins)

Alle erweitern `MelisEngine\Controller\Plugin\MelisTemplatingPlugin` und sind unter `controller_plugins` registriert. Die im React-Editor angebotenen Blöcke sind eine Teilmenge davon:

| Plugin-Alias | Block |
| --- | --- |
| `MelisFrontTagHtmlPlugin` | Direkt bearbeitbare HTML-/Rich-Text-Zone. |
| `MelisFrontTagTextareaPlugin` | Reine Textzone. |
| `MelisFrontTagMediaPlugin` | Bild / Datei aus der Medienbibliothek. |
| `MelisFrontMenuPlugin` | Aus dem Seitenbaum erstelltes Navigationsmenü. |
| `MelisFrontBreadcrumbPlugin` | Breadcrumb-Pfad (Home › … › Aktuelle Seite). |
| `MelisFrontShowListFromFolderPlugin` | Listet Unterseiten aus einem gewählten Ordner automatisch auf. |
| `MelisFrontDragDropZonePlugin` | Layout-Container (Drop-Zone für andere Plugins). |
| `MelisFrontBlockSectionPlugin` | Wiederverwendbarer Block-/Abschnitts-Container. |
| `MelisFrontGenericContentPlugin` | Universeller Inhaltsblock. |
| `MelisFrontGdprBannerPlugin` | Cookie-/GDPR-Einwilligungsbanner. |
| `MelisFrontGdprRevalidationPlugin` | Fragt die Einwilligung erneut ab, wenn sich die GDPR-Richtlinie ändert. |
| `MelisFrontSearchResultsPlugin` | Rendert die Ergebnisse der internen Site-Suche. |
| `MiniTemplatePlugin` | Fügt ein vorgefertigtes Mini-Template mit einem Klick ein. |

### Der Plugin-Renderer-Controller

`MelisFront\Controller\MelisPluginRendererController` rendert bei Bedarf ein einzelnes Plugin neu — genau das ruft der Edition-iframe auf, wenn Sie einen Block ablegen oder bearbeiten:

- `getPluginAction()` (Route `/melispluginrenderer`) — AJAX-Rendering eines einzelnen Plugins.
- `editPluginAction`, `dndLayoutAction`, `dndUpdateOrderAction`, `dndRemoveAction` — die Drag-and-Drop- und Plugin-Bearbeitungsabläufe.

### View-Helper

Werden innerhalb der `.phtml`-Templates einer Site verwendet (registriert unter `view_helpers`):

| Helper-Alias | Verwendung |
| --- | --- |
| `MelisTag` | Deklariert eine bearbeitbare Zone (HTML oder Media), die Redakteure direkt befüllen. |
| `MelisLink` | Gibt die SEO-freundliche URL einer Seite aus (bleibt korrekt, wenn die Seite verschoben wird). |
| `MelisMenu` | Rendert ein Navigationsmenü aus dem Seitenbaum. |
| `MelisDragDropZone` | Rendert eine Drag-and-Drop-Zone, die andere Plugins beherbergt. |
| `siteTranslate` | Gibt eine Site-Übersetzung anhand ihres Schlüssels aus. |
| `SiteConfig` | Liest einen Wert der Site-Konfiguration. |

Sprach-/Home-Helper für Links zu Sprachversionen und den Link zur Startseite sind ebenfalls verfügbar.

### Navigation

`MelisFrontNavigation` (`src/Navigation/Factory/`) erweitert die Laminas-Navigations-Factory, um aus dem Seitenbaum der Engine (`MelisEnginePage` / `MelisEngineTree`) ein `Laminas\Navigation`-Objekt zu erstellen, das die Menu- und Breadcrumb-Helper rendern.

### Asset-Minifizierung

`MinifyAssetsService` (gestützt auf `matthiasmullie/minify`) erstellt `bundle.css` / `bundle.js` pro Site. `MelisFrontMinifiedAssetsCheckerListener` injiziert sie (cache-busted), sofern vorhanden. Lösen Sie einen Build über die Route `/minify-assets` aus.

## Datenbanktabellen

MelisFront besitzt **keine Datenbanktabellen**. Alle Seiten-, Site-, Sprach-, SEO- und Übersetzungsdaten gehören [melis-engine](/de/reference/modules/melis-engine) und [melis-cms](/de/reference/modules/melis-cms).

## Beispiel

Typische Verwendung in einem Site-`.phtml`-Template und in PHP-Dienstaufrufen:

```php
// Inside a site page template (.phtml)
<?= $this->MelisMenu($idPage); ?>                         // navigation menu from the page tree
<a href="<?= $this->MelisLink($targetPageId); ?>">…</a>  // SEO-friendly page link
<?= $this->MelisTag($idPage, 'zone_main', 'html'); ?>    // editable HTML zone
<?= $this->siteTranslate('btn_send'); ?>                  // site translation string
<?= $this->SiteConfig('contact_email'); ?>               // site config value
```

```php
// Reading site config and translations in PHP
$siteConfig = $serviceManager->get('MelisSiteConfigService');
$email = $siteConfig->getSiteConfigByKey('contact_email', $siteId);

$tr = $serviceManager->get('MelisSiteTranslationService')
        ->getEntryByTextAndSiteId('btn_send', $siteId, $langId);
```

```php
// Hooking the render pipeline (after page validation, before render)
$sharedEvents->attach('MelisFront', 'melisfront_site_dispatch_ready', function ($e) {
    $params = $e->getParams(); // page id, site, renderMode…
    // e.g. force a redirect, add data to the layout, A/B-test…
}, 50);
```

## Zentrale Dateien

| Aspekt | Pfad |
| --- | --- |
| Modul-Bootstrap + Listener-Verdrahtung | `vendor/melisplatform/melis-front/src/Module.php` |
| Routen, Dienste, Plugins, Helper, Caches | `vendor/melisplatform/melis-front/config/module.config.php` |
| Plugin-Konfiguration (Front-Standards + `melis.modal_form`) | `vendor/melisplatform/melis-front/config/plugins/` |
| Render-Pipeline-Listener | `vendor/melisplatform/melis-front/src/Listener/` |
| Dienste (Head, SiteConfig, Translations, Minify) | `vendor/melisplatform/melis-front/src/Service/` |
| Templating-Plugins (Inhaltsblöcke) | `vendor/melisplatform/melis-front/src/Controller/Plugin/` |
| Plugin-Renderer-Controller | `vendor/melisplatform/melis-front/src/Controller/MelisPluginRendererController.php` |
| View-Helper | `vendor/melisplatform/melis-front/src/View/Helper/` |
| Navigations-Factory | `vendor/melisplatform/melis-front/src/Navigation/Factory/` |

Siehe auch: [melis-engine](/de/reference/modules/melis-engine), [melis-cms](/de/reference/modules/melis-cms), [melis-core](/de/reference/modules/melis-core)
