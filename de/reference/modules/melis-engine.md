# MelisEngine

> Gemeinsame CMS-Datengrundlage — Seitenmodell, Sites, Sprachen, Basisklasse für Templating-Plugins und der Render-Cache. Paket `melisplatform/melis-engine`.

## Zweck

MelisEngine besitzt das gesamte CMS-Datenbankmodell (Seiten, Seitenbaum, Sites, Templates, Sprachen,
Domains, SEO, Styles) und stellt es über Table-Gateways, Services und einen mehrstufigen Cache bereit.
Sowohl [MelisFront](/de/reference/modules/melis-front) (Frontend-Rendering) als auch
[MelisCms](/de/reference/modules/melis-cms) (Backoffice-Bearbeitung) lesen und schreiben ausschließlich
über MelisEngine — keines der Schwestermodule besitzt eigene Tabellen. Es definiert außerdem
`MelisTemplatingPlugin`, die abstrakte Basisklasse, die jedes Content-Plugin der Plattform erweitert.

## Rolle im React-Backoffice

MelisEngine hat **kein React-Backoffice-Tool und keine eigene Oberfläche** — keine Brick, keine
`config/react-api.php`, keine Capabilities, keinen Sidebar-Eintrag in `/melis-react`. Es ist **nicht auf
React migriert und soll es auch nicht sein**: Es ist Plattform-Infrastruktur, kein Backoffice-Tool. Seine
Beziehung zur React-Shell verläuft vollständig im Hintergrund, über zwei Pfade:

- **Datenpfad** — die React-CMS-Controller (`MelisReactApi*`, die in den CMS-Modulen liegen,
  nicht hier) lesen und schreiben Seiten, Sites, Sprachen, Templates und SEO **ausschließlich** über
  die `MelisEngineTable*`-Gateways und -Services von MelisEngine (`MelisEnginePage`, `MelisEngineTree`,
  `MelisEngineLang`, …). Die React-Schicht greift niemals direkt auf das CMS-Schema zu.
- **Render-Pfad** — der CMS-Inhalt, der im React-Seiteneditor und in den Legacy-Iframe-Tools angezeigt
  wird, wird **serverseitig** gerendert (Seiten → Templates → Zonen → Plugins). Die Engine löst das
  Seitenmodell auf und definiert die Plugin-Basisklasse; MelisFront führt das eigentliche Rendering aus. React
  bettet das serverseitig gerenderte Ergebnis ein, anstatt CMS-Inhalte clientseitig neu zu rendern.

Da es unsichtbar, aber tragend ist, treten Engine-Probleme *innerhalb der React-CMS-Tools* zutage —
ein leerer Seitenbaum, ein Sprach-Dropdown, das leer bleibt, ein Seiteneditor, der beim Laden einen Fehler
wirft — typischerweise verursacht durch eine fehlende/veraltete CMS-Tabelle oder einen fehlschlagenden
Engine-Service, niemals durch einen Engine-Bildschirm (es gibt keinen).

## Aktivierung

MelisEngine wird automatisch als Abhängigkeit geladen. Die Ladereihenfolge in
`config/melis.module.load.php` lautet:

```php
// config/melis.module.load.php
return [
    'MelisCore',
    'MelisFront',
    'MelisEngine',   // requires melis-core + melis-front
    'MelisCms',
];
```

Composer-Abhängigkeiten: `melisplatform/melis-core` `^6.0`, `melisplatform/melis-front` `^6.0`,
`laminas/laminas-cache` (Filesystem- + Memory-Adapter). Läuft auf PHP `^8.3 | ^8.5`.

## Zentrale Services

Registriert als `service_manager`-Aliase in `config/module.config.php`:

| Service-Alias | Rolle |
| --- | --- |
| `MelisEnginePage` / `MelisPageService` | Auflösung einer Seite anhand von ID und Modus (`published` / `saved`): `getDatasPage($idPage, $mode)` — gibt hydratisierten Seitenbaum, Seitendaten, SEO, Template- und Style-Objekte zurück |
| `MelisEngineTree` / `MelisTreeService` | Navigation im Seitenbaum: `getPageChildren()`, `getPageFather()`, `getPageBreadcrumb()`, `getPageLink()`, Suche |
| `MelisEngineTemplateService` | Template-Suche: `getTemplate($tplId)` |
| `MelisEngineSiteService` | Site-Katalog |
| `MelisEngineSiteDomainService` | Domain → Site-Auflösung: `getSiteByDomain()` |
| `MelisEngineLang` / `MelisEngineLangService` | Sprachen: verfügbare Sprachen, Locale ↔ ID, Site-Sprache |
| `MelisEngineSEOService` | SEO-Daten pro Seite: `getSEOById()` |
| `MelisEnginePageDefaultUrlsService` | Vorberechnete / kanonische Seiten-URL-Abfragen |
| `MelisEngineStyle` / `MelisEngineStyleService` | Site-Styles und CSS pro Seite |
| `MelisEngineCacheSystem` | Cache-Orchestrator: `getCacheByKey()`, `setCacheByKey()`, `deleteCacheByPrefix()` |
| `MelisSearch` | Volltext-Seitenindex (Lucene-Stil), der von der Frontend-Suche verwendet wird |
| `MelisEngineSendMail` | E-Mail-Hilfsdienst |
| `MelisGdprService` / `MelisGdprAutoDeleteService` | DSGVO-Bannertexte und Auto-Delete-Framework |
| `MelisEngineComposer` | Composer- / Abhängigkeitsoperationen |

Alle Services, die `MelisGeneralService` erweitern, lösen `*_start` / `*_end`-Events aus (z. B.
`melisengine_service_get_available_languages_start` / `_end`), an die sich andere Module anhängen können.

### React-Consumer (verifiziert)

Dies sind die zugelassenen Einstiegspunkte des Datenpfads, über die die React-CMS-Tools die Engine ansprechen:

| Engine-Service / -Gateway (Alias) | Verwendet von (React-BO) |
| --- | --- |
| `MelisEnginePage` (`MelisPageService`) | melis-cms `MelisReactApiPageController` — Seitendaten für den React-Seiteneditor |
| `MelisEngineTree` (`MelisTreeService`) | melis-cms `MelisReactApiPageController` — Navigation im Seitenbaum |
| `MelisEngineLang` (`MelisEngineLangService`) | melis-cms `MelisReactApiCmsSitesController`, `MelisReactApiCmsMenuManagerController` — verfügbare CMS-Sprachen |
| `MelisEngineTableCmsLang` (`MelisCmsLangTable`) | melis-cms-tags, melis-cms-user-account, melis-core (DSGVO) — React-Sprach-Dropdowns |

Der Alias `MelisEngineTableCmsLang => MelisCmsLangTable::class` ist in
`config/module.config.php` registriert.

## Backoffice

MelisEngine hat kein eigenes Endanwender-Tool, weder im Legacy-Backoffice noch in `/melis-react`. Es
registriert zwei Formularelement-Factories, die im gesamten Backoffice verwendet werden:

| Factory | Zweck |
| --- | --- |
| `MelisEnginePluginTemplateSelect` | Template-Auswahlelement für Plugin-Formulare |
| `MelisEngineSiteSelect` | Site-Auswahlelement für Plugin-Formulare |

Setup- und Wartungs-Controller (`MelisSetup*`) sind ebenfalls vorhanden, werden aber vom
Installer aufgerufen, nicht von Redakteuren.

## Frontoffice

Die Basisklasse für jedes Content-Plugin befindet sich hier:

| Element | Beschreibung |
| --- | --- |
| `MelisEngine\Controller\Plugin\MelisTemplatingPlugin` | Abstrakte Basis für alle Content-Plugins. Definiert `front()` (Live-Rendering, abstrakt), `back()` (Backoffice-Container-/Bearbeitungsansicht), Persistenz der Konfigurations-XML (`loadDbXmlToPluginConfig()` / `savePluginConfigToXml()`), GET/POST-Laden, Vorschaumodus und responsive Breite. |

Jedes Content-Plugin der Plattform (News, Slider, Menu, Breadcrumb, …) leitet von dieser Klasse ab. Implementieren Sie
`front()` für die Live-Ausgabe; die Basis übernimmt `back()` automatisch. Dieselbe Plugin-Pipeline
speist den React-Seiteneditor: MelisFront rendert die Plugins jeder Zone serverseitig und React
zeigt das Ergebnis an.

Zwei Microservice-Listener hängen sich an `melis_core_microservice_amend_data`, um Baum- und Seitenmethoden
(`getPageChildren`, `getPageFather`, `getDomainByPageId`, `getDatasPage`) über die
Microservice-Schicht der Plattform bereitzustellen.

## Datenbanktabellen

MelisEngine ist die alleinige Quelle der Wahrheit für das CMS-Schema
(`install/sql/setup_structure.sql` + `install/dbdeploy/`-Deltas):

| Tabelle | Enthält |
| --- | --- |
| `melis_cms_page_tree` | Seitenhierarchie (`tree_father_page_id`, Reihenfolge) |
| `melis_cms_page_published` | Veröffentlichte (Live-)Version jeder Seite |
| `melis_cms_page_saved` | Gespeicherte / Entwurfsversion (im Backoffice bearbeitet) |
| `melis_cms_page_lang` | Verknüpfungen Seite ↔ Sprache |
| `melis_cms_lang` | CMS-Sprachen / Locales |
| `melis_cms_site` | Sites (Wurzel des Seitenbaums) |
| `melis_cms_template` | Templates (Layout / Controller / Action oder PHP-Pfad) |
| `melis_cms_page_seo` | SEO pro Seite (URL, 301-Weiterleitung, Meta-Titel/-Beschreibung, Canonical) |
| `melis_cms_site_domain` | Site-Domains pro Umgebung |
| `melis_cms_site_301` / `melis_cms_site_404` | Site-weite 301-Weiterleitungen / 404-Zuordnung |
| `melis_cms_page_default_urls` | Vorberechnete Seiten-URLs (Cache-Tabelle) |
| `melis_cms_style` / `melis_cms_page_style` | CSS-Styles und Verknüpfungen Seite ↔ Style |
| `melis_cms_platform_ids` | Seiten-ID-Zuteilungsbereiche pro Umgebung |
| `melis_cms_site_config` / `_home` / `_langs` | Site-Konfiguration, Startseite pro Sprache, aktive Sprachen |
| `melis_cms_site_robot` | robots.txt pro Domain |
| `melis_cms_mini_tpl_*` | Mini-Template-Kategorien, -Templates und -Flags |
| `melis_cms_gdpr_texts` | DSGVO-Bannertexte pro Site / Sprache |
| `melis_site_translation` / `_text` | Site-weite Übersetzungs-Strings |

### Table-Gateways

Jede Tabelle ist von einem `MelisEngineTable*`-Gateway umschlossen, das im Service Manager registriert ist
(z. B. `MelisEngineTablePageTree`, `MelisEngineTablePagePublished`, `MelisEngineTablePageSeo`).
Andere Module — ob Legacy oder React — müssen stets diese Gateways verwenden, niemals rohes SQL. Das Basis-Gateway
stellt `getEntryById()`, `getEntryByField()`, `save()`, `deleteById()`, `fetchAll()` bereit.

## Beispiel

**Eine Seite lesen und im Baum navigieren:**

```php
$pageSvc = $sm->get('MelisEnginePage');
$page    = $pageSvc->getDatasPage($idPage);            // 'published' (live) by default
$draft   = $pageSvc->getDatasPage($idPage, 'saved');   // draft shown in the React page editor

$tree       = $sm->get('MelisEngineTree');
$children   = $tree->getPageChildren($idPage, 1);       // 1 = published only
$breadcrumb = $tree->getPageBreadcrumb($idPage);
$url        = $tree->getPageLink($idPage, true);        // true = absolute URL
```

**Ein React-Sprach-Dropdown aus einem CMS-Controller befüllen (serverseitig, delegiert an die Engine):**

```php
// Inside a MelisReactApi* controller of a CMS module — the React JSON layer
// delegates to the engine; MelisEngine exposes no react-api of its own.
$langTable = $sm->get('MelisEngineTableCmsLang');
$langs     = $langTable->fetchAll()->toArray();   // fills a React language dropdown
```

**Über ein Table-Gateway lesen/schreiben (niemals rohes SQL):**

```php
$seoTable = $sm->get('MelisEngineTablePageSeo');
$seo      = $seoTable->getEntryByField('plang_page_id', $idPage)->current();
$seoTable->save(['seo_meta_title' => 'New title'], $existingSeoId);  // upsert
```

**Ein berechnetes Ergebnis cachen:**

```php
$cache = $sm->get('MelisEngineCacheSystem');
$cache->setCacheByKey('mykey', 'my_cache_config', $value);
$value = $cache->getCacheByKey('mykey', 'my_cache_config');
$cache->deleteCacheByPrefix('page_' . $idPage, 'meliscms_page');   // invalidate a page
```

**Auf ein Service-Event lauschen:**

```php
$sharedEvents->attach('MelisEngine', 'melisengine_page_getdatas_end', function ($e) {
    $p = $e->getParams();   // includes page id and 'results'
    // alter $p['results'] before it is returned
}, 50);
```

**Ein Content-Plugin erstellen:**

```php
// Subclass MelisTemplatingPlugin, implement front() for live render.
// The base class handles back() (BO container), config XML persistence and preview.
class MyPlugin extends MelisEngine\Controller\Plugin\MelisTemplatingPlugin
{
    public function front(): string
    {
        return $this->getView()->render('my-module/plugin/my-plugin', $this->pluginConfig);
    }
}
```

## Das Trio Core / Engine / Front

Das React-Backoffice ändert das Trio nicht; es setzt darauf auf:

- **MelisEngine** *(dieses Modul)* — besitzt das gesamte CMS-DB-Modell und stellt es über Table-Gateways
  + Services + Cache bereit; definiert `MelisTemplatingPlugin`.
- **MelisFront** — rendert Seiten aus den Daten der Engine (führt die Content-Plugins aus) und treibt
  die bearbeitbare Vorschau an, die im Backoffice verwendet wird (Legacy *und* React-Seiteneditor / Iframe-Tools).
- **MelisCms** — das CMS-Backoffice; es besitzt **keine Tabellen** und bearbeitet alles über die
  Engine. Seine React-CMS-Tools (`MelisReactApiPage`, `MelisReactApiCmsSites`,
  `MelisReactApiCmsMenuManager`, …) sind die oben aufgeführten React-Consumer.

## Zentrale Dateien

| Aspekt | Pfad |
| --- | --- |
| Service- & Gateway-Aliase, Caches | `vendor/melisplatform/melis-engine/config/module.config.php` |
| Seitendaten-Service | `vendor/melisplatform/melis-engine/src/Service/MelisPageService.php` |
| Baum-/Link-Service | `vendor/melisplatform/melis-engine/src/Service/MelisTreeService.php` |
| Cache-Orchestrator | `vendor/melisplatform/melis-engine/src/Service/` (`MelisEngineCacheSystem*`) |
| Basisklasse für Templating-Plugins | `vendor/melisplatform/melis-engine/src/Controller/Plugin/MelisTemplatingPlugin.php` |
| Table-Gateways | `vendor/melisplatform/melis-engine/src/Model/Tables/` |
| Schema + Delta-Migrationen | `vendor/melisplatform/melis-engine/install/sql/` |

Siehe auch: [MelisFront](/de/reference/modules/melis-front) · [MelisCms](/de/reference/modules/melis-cms) · [MelisCore](/de/reference/modules/melis-core)
