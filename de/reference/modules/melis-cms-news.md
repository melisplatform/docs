# MelisCmsNews

> News-/Blog-System für Melis-Sites, mit einem React-Redaktionswerkzeug im Backoffice und drei Frontoffice-Anzeige-Plugins. Paket `melisplatform/melis-cms-news`.

## Zweck

MelisCmsNews stellt im Backoffice ein **News**-Werkzeug bereit, in dem Redakteure mehrsprachige
News-Artikel verfassen und verwalten (Titel, Rich-Text-Absätze, Bilder, Dokumente, geplante
Veröffentlichung/Aufhebung der Veröffentlichung sowie SEO). Artikel werden im Frontoffice über drei
einsatzbereite Templating-Plugins angezeigt: einen Teaser für die neuesten News, eine paginierte
News-Liste und eine Detailseite für einen einzelnen Artikel. SEO-freundliche URLs und
artikelbezogene Meta-Tags werden über dedizierte Listener automatisch verarbeitet.

In Melis v6 wird das Werkzeug als **native Full-React-Brick** im neuen Backoffice (`/melis-react`)
ausgeliefert: eine echte React-Oberfläche zum Auflisten und Bearbeiten von Artikeln, die eine
`react-api`-JSON-Schicht aufruft, mit einem **New / Old**-Umschalter, der auf das klassische
Werkzeug in einem iframe zurückfallen kann. Framework, Services, Events, Tabellen und Front-Plugins
sind gegenüber v5 unverändert – nur die Präsentationsschicht ist neu.

## Aktivierung

In `config/melis.module.load.php` hinzufügen:

```php
return [
    'MelisCmsNews',
];
```

Benötigt `melis-core`, `melis-engine`, `melis-front` und `melis-cms` (`^5.2`) sowie
`laminas/laminas-paginator`. Optionale Integrationen werden aktiv, wenn auch `MelisCmsSlider`, das
Melis-Kategoriemodul, `MelisCmsTags`, `MelisCmsUserAccount` (Autoren) oder `MelisCmsComments`
installiert sind. Die React-Brick erscheint nur, solange das Modul in `melis.module.load.php`
eingetragen ist (modulare Brick-Erkennung über `GET /melis/react-api/react-modules`).

## React-Backoffice

Linke Seitenleiste → **Site Tools** → **News** (`Actualités`). Es öffnet sich als oberer Tab mit dem
Namen **News**, der über werkzeuginterne **Untertabs** alles bereitstellt: die Artikelliste und einen
Untertab pro geöffnetem/neuem Artikel mit dem vollständigen Editor. Jeder Untertab bleibt eingebunden,
sodass der Wechsel zwischen Artikeln unmittelbar erfolgt. Die Tree-Route lautet `/melis-cms/news`
(mit `/melis-cms/news/:id` für Deep-Links, z. B. das Workflow-Auge).

### Die Artikelliste

![Die React-News-Liste – KPI-Karten (Total articles / Published / Unpublished), ein Suchfeld mit den Filtern All / Active / Inactive, ein Columns-Manager, eine Export-Schaltfläche, der New/Old-Umschalter und die Schaltfläche "+ New article", mit Bearbeiten- und Löschaktionen pro Zeile](/screenshots/react/melis-cms-news/meliscmsnews-tool-news-list.png)

Die Liste zeigt alle Artikel der Plattform, mit:

- **KPI-Karten** – Total articles, Published, Unpublished.
- **Suche** mit den Statusfiltern **All / Active / Inactive**, sortierbaren Spalten, einem
  **Columns**-Manager (ausblenden/neu anordnen), einem **Export** (xlsx) und **Reset filters**.
- Pro Zeile **Bearbeiten** (öffnet den Artikel als Untertab) und **Löschen**; **+ New article**
  öffnet einen leeren Editor.
- Ein **New / Old**-Umschalter (oben rechts), der die Liste zwischen der React-Oberfläche und dem
  Legacy-Werkzeug in einem iframe umschaltet (`/melis/react-tool-page?key=meliscmsnews_left_menu`).

### Der Artikeleditor

Ein einzelnes scrollbares Formular: eine breite Inhaltsspalte links, eine Einstellungs-Seitenleiste
rechts und ein **Sprachumschalter** (English / Français) oben – jede Übersetzung wird gleichzeitig
gehalten und in einem einzigen Aufruf zusammen gespeichert.

![Der Editor für neue Artikel – ein Sprachumschalter, die Felder Title und Subtitle, der BODY mit einem WYSIWYG-Absatzeditor und "Generate with AI", ein gesperrter MEDIA-Bereich sowie die Einstellungs-Seitenleiste (Status, Publication, Site, Author, SEO, Categories, Tags, Slider)](/screenshots/react/melis-cms-news/meliscmsnews-tool-news-new.png)

| Bereich | Inhalt |
| --- | --- |
| Title / Subtitle | Klartext, pro Sprache |
| Body | Bis zu **10 Rich-Text-Absätze (WYSIWYG)**, per Drag-and-drop neu anordbar, jeder mit einem **Generate with AI**-Helfer |
| Media | Bis zu **3 Bilder** und **3 Dokumentdateien** – gesperrt bis zum ersten Speichern des Artikels |
| Status | Umschalter **Published / Unpublished**, plus eine **Workflow**-Schaltfläche, wenn MelisSmallBusiness aktiv ist |
| Publication | Datum-Uhrzeit-Auswahl für **Publish on** / **Unpublish on** |
| Site | Die Site, zu der der Artikel gehört |
| Author | Autorenauswahl – nur wenn `MelisCmsUserAccount` die Spalte `cnews_author_account` bereitstellt |
| SEO | Sprechende **URL**, **URL redirect**, **URL 301**, **Meta title**, **Meta description**, **Canonical URL** (pro Sprache) |
| Categories / Tags / Slider | Optionale Abschnitte, die nur angezeigt werden, wenn das zugehörige Modul aktiv ist |
| Comments | Natives Moderationspanel (Hinzufügen / Freigeben / Ablehnen / Löschen), nur angezeigt, wenn `MelisCmsComments` aktiv ist |

![Bearbeiten der Texte eines Artikels – Titel, Untertitel und ein Rich-Text-Absatzeditor (TinyMCE-Stil); Absätze können hinzugefügt und neu angeordnet werden](/screenshots/react/melis-cms-news/meliscmsnews-tool-news-edit-texts.png)

![Der obere Teil der Einstellungs-Seitenleiste – der Published-Umschalter mit Workflow, die Daten Publish on / Unpublish on und der Site-Selektor](/screenshots/react/melis-cms-news/meliscmsnews-tool-news-edit-properties.png)

![Der Media-Bereich – Images (max. 3, mit Replace/Remove) und File attachments (max. 3), plus das native Comments-Moderationspanel, wenn MelisCmsComments aktiv ist](/screenshots/react/melis-cms-news/meliscmsnews-tool-news-edit-medias.png)

![Der SEO-Abschnitt – Meta title, Meta description, URL, URL redirect, URL 301 und Canonical URL, pro Sprache](/screenshots/react/melis-cms-news/meliscmsnews-tool-news-edit-seo.png)

Nach dem Speichern rendert ein **Preview**-Bereich den Artikel innerhalb seiner NEWS_DETAIL-Seite
in einem iframe, mit einer Option **Display in new tab** und einer Seitenauswahl, wenn die Site
mehrere Detailseiten hat.

![Der Preview-Bereich – der gespeicherte Artikel, gerendert innerhalb seiner NEWS_DETAIL-Seite, mit einer Schaltfläche "Display in new tab"](/screenshots/react/melis-cms-news/meliscmsnews-tool-news-edit-preview.png)

### News auf einer Seite anzeigen

Im React-Seiteneditor (eine Seite öffnen → Edition) das Plugins-Panel öffnen und **Latest News**,
**News List** oder **News Detail** auf die Seite ziehen; jedes öffnet den klassischen
Melis-Plugin-Konfigurationsdialog (innerhalb des React-Editors gerendert) mit denselben Tabs wie
v5 – siehe [Frontoffice](#frontoffice).

![Der React-Seiteneditor mit geöffnetem Plugins-Panel – die News-Inhaltsblöcke, bereit zum Ziehen auf die Seite](/screenshots/react/melis-cms-news/meliscmsnews-page-menu-plugins-selector.png)

![Latest-News-Plugin → Properties – Template, Site und News-Detailseite (mit einer Seitenbaum-Auswahl)](/screenshots/react/melis-cms-news/meliscmsnews-page-plugin-latestnews-config-tab-properties.png)

![News-List-Plugin → Pagination – News pro Seite und die Anzahl der anzuzeigenden Seitenlinks](/screenshots/react/melis-cms-news/meliscmsnews-page-plugin-newslist-tab-pagination.png)

![News-Detail-Plugin → Properties – Template (news-details) und ein Default-News-Selektor mit einer Verknüpfung zum News-Werkzeug](/screenshots/react/melis-cms-news/meliscmsnews-page-plugin-newsdetail-config-tab-properties.png)

## React-API

Es gibt **keine `config/react-api.php`**: Die Routen werden **inline in
`config/module.config.php`** deklariert, verschachtelt unter dem gemeinsamen Knoten
`melis-react-api`, sodass sie unter `/melis/react-api/…` eingebunden werden. Controller:
`MelisCmsNews\Controller\MelisCmsNewsReactApiController` (Invokable-Alias
`MelisCmsNews\Controller\MelisCmsNewsReactApi`). Vertrag `{ success, data, error }`.

| Methode & URL | Zweck |
| --- | --- |
| `GET /news` | Artikel auflisten (Keyset: `limit`, `search`, `status`, `siteId`, `sort`, `dir`, `after`, `langId`) |
| `GET /news/stats` | KPI `{total, published, draft}` |
| `GET /news/:id` | Ein Artikel (`?langId=` → diese Übersetzung; Basis + Absätze + Medien + SEO + Kategorie-/Tag-IDs) |
| `POST /news/save` | Erstellen / Aktualisieren (alle Übersetzungen, SEO, Kategorien, Tags in einem Aufruf) |
| `DELETE /news/delete/:id` | Einen Artikel löschen (+ seine Texte + SEO) |
| `GET /news/categories` | Verfügbare Kategorien (`?langId=&siteId=`) |
| `GET /news/tags` | Verfügbare Tags (`MelisCmsTags`; leer, wenn nicht vorhanden) |
| `GET /news/users` | Frontoffice-Benutzer als Autoren (`MelisCmsUserAccount`; leer, wenn nicht vorhanden) |
| `GET /news/preview/:id` | Preview-URL + NEWS_DETAIL-Seiten für die Site des Artikels |
| `GET /news/:id/comments` | Kommentare eines Artikels (404, wenn `MelisCmsComments` aus) |
| `POST /news/comments/save` | Einen Kommentar hinzufügen / bearbeiten (BO → freigegeben) |
| `POST /news/comments/approve/:cid` · `/refuse/:cid` | Einen Kommentar moderieren |
| `DELETE /news/comments/delete/:cid` | Einen Kommentar löschen |
| `GET /news-sites` · `GET /news-languages` | Site-Liste · CMS-Sprachen |

Upload/Entfernen von Medien nutzen die **Legacy**-Endpunkte wieder (keine Backend-Änderung):
`POST /melis/MelisCmsNews/MelisCmsNews/saveFileForm` und `.../removeAttachFile`.

Der Controller kombiniert den modulinternen `MelisCmsNewsService` (`getNewsById`, `saveNews`,
`deleteNewsById`, `getNewsDetailsPagesBySite`) mit direktem parametrisiertem SQL (Listen-Keyset,
Statistiken, SEO, Kategorie-/Tag-Verknüpfungstabellen) und dem gemeinsamen
`MelisCmsCategory2Service`; optionale Spalten/Tabellen werden per Feature-Erkennung ermittelt, sodass
ein fehlendes optionales Modul ein Speichern nie unterbricht.

### Berechtigungen (Capabilities)

Deklariert in `config/react.capabilities.php` unter dem rechteverwaltenden Knoten
`meliscmsnews_tools_section` (nicht dem Manifest-/Zonen-Schlüssel `meliscmsnews_left_menu`, der von
der Old-Ansicht im iframe genutzt wird):

```
meliscmsnews_tools_section
└─ actions: list · create · edit · delete · export
```

Jede Controller-Aktion ist doppelt abgesichert – `denyUnlessAccess()` (Auth +
`MelisCoreRights::canAccess`), dann `denyUnlessCan(<cap>)`. `saveAction` wählt `create` vs. `edit`
anhand des Vorhandenseins einer id. React schaltet die Schaltfläche **+ New article** über `create`
und die Liste über `list` mittels `window.__melisUseCaps(melisKey)` frei.

## Wichtige Services

Als `service_manager`-Aliase in `config/module.config.php` registriert.

| Service-Alias | Rolle |
| --- | --- |
| `MelisCmsNewsService` | Haupt-CRUD-/Abfrageservice. Lesen, Erstellen, Aktualisieren und Löschen von Artikeln; Abfrage nach Site, Sprache, Datumsbereich, Status. Jede Methode löst `*_start` / `*_end`-Events über `MelisGeneralService` aus. |

Table-Gateway-Aliase: `MelisCmsNewsTable`, `MelisCmsNewsTextsTable`, `MelisCmsNewsSeoTable`,
`MelisCmsNewsCategoryTable`, `MelisCmsNewsTagsTable`.

## Frontoffice

Drei Templating-Plugins erweitern `MelisTemplatingPlugin`; jedes hat ein Controller-Plugin, einen
View-Helper und eine Konfigurationsdatei unter `config/plugins/`.

| Plugin | Controller-Plugin | View-Helper | Konfigurations-Tabs |
| --- | --- | --- | --- |
| Latest News | `MelisCmsNewsLatestNewsPlugin` | `MelisCmsNewsLatestPlugin` | Properties, Filters |
| News List | `MelisCmsNewsListNewsPlugin` | `MelisCmsNewsListPlugin` | Properties, Pagination, Filters |
| News Detail | `MelisCmsNewsShowNewsPlugin` | `MelisCmsNewsShowNewsPlugin` | Properties |

Plugin-Konfigurationsparameter: `template_path`, `site_id`, `pageIdNews` (Link zur Detailseite),
`column`, `order`, `limit`, `date_min`, `date_max`, `search`, plus `nbPerPage` / `nbPageBeforeAfter`
(nur News List). Die Konfiguration wird im Seiten-XML über `loadDbXmlToPluginConfig()` /
`savePluginConfigToXml()` gespeichert.

SEO-Routing und artikelbezogene Meta-Tags werden in `src/Module.php` verdrahtet über:
`MelisCmsNewsSEORouteListener`, `MelisCmsNewsRenderPageListener`, `MelisCmsNewsMetaPageListener`,
`MelisCmsNewsSeoRedirectUrlListener`.

## Datenbanktabellen

Basisstruktur in `install/sql/setup_structure.sql`; Migrationen in `install/dbdeploy/`.

| Tabelle | Enthält |
| --- | --- |
| `melis_cms_news` | Kern-Artikelzeile: Status, Veröffentlichungs-/Aufhebungsdaten, Site, image1-3, documents1-3, Slider-id |
| `melis_cms_news_texts` | Sprachbezogene Texte: Titel, Untertitel, Absätze 1-10, Absatzreihenfolge, Sprache |
| `melis_cms_news_seo` | Sprachbezogenes SEO: URL, Redirect, 301-Flag, Meta-Titel/-Beschreibung, Canonical |
| `melis_cms_news_category` | Verknüpfung Artikel ↔ Kategorie (optionales Kategorie-Feature) |

## Beispiel

```php
$news = $this->getServiceManager()->get('MelisCmsNewsService');

// Latest 10 published articles for site 1, French, newest first:
$list = $news->getNewsList(
    status: 1, langId: 1, start: 0, limit: 10,
    orderColumn: 'cnews_publish_date', order: 'DESC', siteId: 1
);

// Fetch one article (all languages, or one language):
$all = $news->getNewsById(42);
$fr  = $news->getNewsById(42, 1);

// Create / update / delete:
$id = $news->saveNews($data, $newsId);   // $newsId null → create
$ok = $news->deleteNewsById(42);         // also removes texts + SEO rows

// Utility:
$txt  = $news->getPostText(42);
$pages = $news->getNewsDetailsPagesBySite(1);  // NEWS_DETAIL-type pages for a site
```

In ein Service-Event einhaken, um das Verhalten zu erweitern (z. B. einen Suchindex nach dem
Speichern anpingen):

```php
$sharedEvents->attach('MelisCmsNews', 'melis_cms_news_save_news_end', function ($e) {
    $params = $e->getParams(); // includes 'news', 'newsId', 'results'
}, 50);
```

Weitere Event-Identifier folgen demselben Muster `melis_cms_news_[method]_start/end`:
`melis_cms_news_get_news_list_*`, `melis_cms_news_get_news_by_id_*`,
`melis_cms_news_get_news_by_id_array_*`, `melis_cms_news__delete_news_by_id_*` (doppelter
Unterstrich), `melis_cms_news_get_post_text_*`, `melis_cms_news_get_news_details_pages_*`.

## Micro-Services

`config/app.microservice.php` stellt `getNewsList` und `getNewsById` über den Melis-Micro-Service-Bus
mit automatisch generierten Formularen und Input-Filtern bereit. Die Formular-Factories
`MelisCmsNewsSelect` und `MelisCmsNewsBOSelect` befinden sich in `src/Form/Factory/`.

## Wichtige Dateien

| Bereich | Pfad |
| --- | --- |
| Modulkonfiguration + inline react-api-Routen | `vendor/melisplatform/melis-cms-news/config/module.config.php` |
| React-Berechtigungen | `vendor/melisplatform/melis-cms-news/config/react.capabilities.php` |
| Backoffice-Werkzeugbaum | `vendor/melisplatform/melis-cms-news/config/app.interface.php` |
| Listentabellen-Konfiguration | `vendor/melisplatform/melis-cms-news/config/app.tools.php` |
| Micro-Service-Konfiguration | `vendor/melisplatform/melis-cms-news/config/app.microservice.php` |
| React-API-Controller | `vendor/melisplatform/melis-cms-news/src/Controller/MelisCmsNewsReactApiController.php` |
| React-Brick (Vite-IIFE-Quelle) | `vendor/melisplatform/melis-cms-news/ui-react/src/` |
| Gebaute Brick + Manifest | `vendor/melisplatform/melis-cms-news/public/ui-react/brick.js` · `brick.manifest.json` |
| Haupt-Service | `vendor/melisplatform/melis-cms-news/src/Service/MelisCmsNewsService.php` |
| Front-Plugins | `vendor/melisplatform/melis-cms-news/src/Controller/Plugin/` |
| View-Helper | `vendor/melisplatform/melis-cms-news/src/View/Helper/` |
| Listener (SEO, DSGVO, Slider-Bereinigung) | `vendor/melisplatform/melis-cms-news/src/Listener/` |
| Table-Gateways | `vendor/melisplatform/melis-cms-news/src/Model/Tables/` |
| Install-SQL | `vendor/melisplatform/melis-cms-news/install/sql/setup_structure.sql` |
| DB-Migrationen | `vendor/melisplatform/melis-cms-news/install/dbdeploy/` |

Siehe auch: [melis-cms](/de/reference/modules/melis-cms), [melis-front](/de/reference/modules/melis-front),
[melis-engine](/de/reference/modules/melis-engine), [melis-core](/de/reference/modules/melis-core)
