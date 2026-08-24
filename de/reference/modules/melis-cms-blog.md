# MelisCmsBlog

> Blog-System für Melis-Websites, mit einem nativen React-Backoffice zur Beitragsverwaltung und drei
> Frontoffice-Anzeige-Plugins. Paket `melisplatform/melis-cms-blog`.

## Zweck

MelisCmsBlog stellt im Backoffice ein **Blog**-Werkzeug bereit, in dem Redakteure mehrsprachige
Blogbeiträge erstellen und verwalten (Titel, Untertitel, bis zu vier Rich-Text-Absätze, Bilder,
Dokumente, Planung von Veröffentlichung/Zurückziehen, ein optionaler Slider sowie SEO-URL + Meta).
Beiträge werden im Frontoffice über drei einsatzbereite Templating-Plugins bereitgestellt: einen
Teaser der neuesten Beiträge, eine paginierte und filterbare Beitragsliste sowie eine
Detailansicht eines einzelnen Beitrags. SEO-freundliche URLs, beitragsspezifische Meta-Tags und
automatische 301-Weiterleitungen zur kanonischen URL werden über dedizierte Event-Listener
verarbeitet.

Im v6-React-Backoffice (`/melis-react`) liefert das Modul einen **nativen Voll-React-Brick** — eine
echte React-Oberfläche zum Auflisten und Bearbeiten von Beiträgen, gestützt auf eine
`react-api`-JSON-Schicht — mit einem **New / Old**-Umschalter, der bei Bedarf auf das Legacy-Werkzeug
in einem iframe zurückfallen kann. Er ist das architektonische Gegenstück zu MelisCmsNews. Das
Framework, die Services, das Datenmodell, das SEO-Routing und die Front-Plugins sind gegenüber v5
unverändert; nur die Anzeigeschicht des Backoffice ist neu.

## Aktivierung

In `config/melis.module.load.php` hinzufügen:

```php
return [
    'MelisCmsBlog',
];
```

Erfordert `melis-core` und `melis-cms`, PHP `^8.1|^8.3|^8.4`. Optionale Integrationen werden aktiv,
wenn `MelisCmsComments`, `MelisCmsSlider`, `MelisSmallBusiness` oder `MelisCmsUserAccount` ebenfalls
installiert sind. Der Brick erscheint in der React-Seitenleiste nur, wenn das Modul vorhanden ist
(modulare Brick-Erkennung über `GET /melis/react-api/react-modules`).

## Wichtige Services

Als `service_manager`-Aliase in `config/module.config.php` registriert. Der React-Controller nutzt
serverseitig dieselben Geschäftsregeln erneut und wahrt so die Parität mit dem Legacy-Werkzeug.

| Service-Alias | Rolle |
| --- | --- |
| `MelisCmsBlogService` | Haupt-CRUD-/Abfrage-Service. Beiträge lesen, erstellen, aktualisieren und löschen; Abfrage nach Website, Sprache, Datumsbereich, Status, Autor. Jede Methode löst über `MelisEngineGeneralService` `*_start`-/`*_end`-Events aus. |

Table-Gateway-Aliase: `MelisCmsBlogTable`, `MelisCmsBlogTextsTable`.

## Datenbanktabellen

Grundstruktur in `install/sql/setup_structure.sql`; Migrationen in `install/dbdeploy/`.

| Tabelle | Enthält |
| --- | --- |
| `melis_cms_blog` | Kern-Beitragszeile: Status, Veröffentlichungs-/Zurückziehen-Datum, Website-ID, image1-3, documents1-3, Slider-ID |
| `melis_cms_blog_texts` | Sprachspezifische Texte: Titel, Untertitel, Absätze 1-4, Sprach-ID, SEO-URL, SEO-Meta-Titel/-Beschreibung, Autoren-Konto |

> Im Gegensatz zu MelisCmsNews besitzt der Blog **keine Kategorien und keine Tags** — keine
> Verknüpfungstabelle und keine `melis_cms_tag*`-Unterstützung.

## React-Backoffice

Seitenleiste → Gruppe **MelisCms** → **Blog** (`fa-rss`). Der Brick öffnet sich als oberer Tab namens
**Blog** und zeichnet seine eigene werkzeuginterne Untertab-Leiste: einen Untertab pro geöffnetem
Beitrag, plus einen „Zurück zur Liste". Jeder geöffnete Beitrag bleibt eingehängt, sodass der Wechsel
zwischen Beiträgen sofort erfolgt.

### Die Beitragsliste

Die React-Liste zeigt jeden Beitrag der Plattform, mit **KPI-Karten** (Beiträge gesamt,
Veröffentlicht, Nicht veröffentlicht), einem **Suchfeld** mit den Filtern **All / Active / Inactive**,
einem **Spalten**-Manager (ausblenden/neu anordnen), einer **Export**-Schaltfläche (xlsx/csv),
Keyset-Pagination sowie zeilenweisem **Bearbeiten** / **Löschen**. Klicken Sie auf eine Spaltenüberschrift,
um zu sortieren. **+ New post** startet einen leeren Editor.

![Die React-Blog-Liste: KPI-Karten (Beiträge gesamt / Veröffentlicht / Nicht veröffentlicht), ein Suchfeld mit den Filtern All / Active / Inactive, ein Spalten-Manager, eine Export-Schaltfläche, der New/Old-Umschalter und die Schaltfläche „+ New post", mit zeilenweisen Bearbeiten- und Löschen-Aktionen](/screenshots/react/melis-cms-blog/meliscmsblog-tool-blog-list.png)

Ein **New / Old**-Umschalter (oben rechts) schaltet die Liste — und nur die Liste — zwischen der
React-Oberfläche und dem in einem iframe gerenderten Legacy-Werkzeug um
(`/melis/react-tool-page?key=meliscmsblog_left_menu`), sodass die beiden Oberflächen nebeneinander
verglichen werden können.

### Der Beitragseditor

Wo das Legacy-Werkzeug getrennte obere Tabs verwendete (Properties / Texts / Medias), ist der
React-Editor eine einzige scrollbare Seite: eine breite **Inhaltsspalte** links und eine
einklappbare **Einstellungs-Seitenleiste** rechts. Ein **Sprachumschalter** oben hält jede
Übersetzung gleichzeitig — alle Sprachen werden zusammen in einem einzigen Aufruf gespeichert.

**Inhaltsspalte**

- **Title / Subtitle** — Klartext, pro Sprache.

![Der Sprachumschalter des Beitragseditors (English / Français / Español), die Felder Title und Subtitle sowie der BODY mit bis zu 4 Rich-Text-Absätzen (TinyMCE) — jeder in einer eigenen per Ziehen neu anordenbaren Karte mit einem Absatzzähler](/screenshots/react/melis-cms-blog/meliscmsblog-tool-blog-edit-tab-texts.png)

- **Body** — bis zu **4 Rich-Text-Absätzen (TinyMCE)** (`cblog_paragraph1..4`), per Ziehen neu
  anordenbar, mit **+ Add paragraph (max. 4)**.
- **Media** — bis zu **3 Bilder** (Replace / Remove pro Slot) und bis zu **3 Datei-Anhänge**.
  Erscheint erst **nach dem ersten Speichern**, da Uploads voraussetzen, dass der Beitrag bereits
  existiert.

![Der Media-Bereich — Bilder (max. 3, mit Replace/Remove pro Slot) und Datei-Anhänge (max. 3, „Click to attach a file")](/screenshots/react/melis-cms-blog/meliscmsblog-tool-blog-edit-tab-medias.png)

- **Comments** — ein natives Moderationspanel (hinzufügen/bearbeiten, genehmigen/ablehnen/löschen,
  paginiert), das nur angezeigt wird, wenn **MelisCmsComments** installiert ist.

**Einstellungs-Seitenleiste** (einklappbare Abschnitte)

- **Status** — ein Umschalter Published / Unpublished, plus eine **Workflow**-Schaltfläche
  (Validierung), wenn **MelisSmallBusiness** aktiv ist.

![Der obere Teil der Einstellungs-Seitenleiste — der Published-Umschalter mit einer Workflow-Schaltfläche, die Datum-Uhrzeit-Auswahlfelder Publish on / Unpublish on und die Website-Auswahl](/screenshots/react/melis-cms-blog/meliscmsblog-tool-blog-edit-tab-properties.png)
- **Publication** — Datum-Uhrzeit-Auswahlfelder **Publish on** / **Unpublish on**.
- **Site** — die Website, zu der der Beitrag gehört (erforderlich).
- **Author** — eine Autorenauswahl, die nur angezeigt wird, wenn **MelisCmsUserAccount** die Spalte
  `cblog_author_account` bereitstellt.
- **Comments validation** — ein Umschalter „Frontoffice-Kommentare bleiben ausgeblendet, bis sie
  genehmigt sind" plus ein nur für den Blog geltender Schalter „Konto zum Kommentieren erforderlich",
  angezeigt, wenn **MelisCmsComments** aktiv ist.
- **SEO** — Meta-Titel, Meta-Beschreibung und benutzerfreundliche **URL**, pro Sprache (in der
  Texttabelle gespeichert, nicht in einer dedizierten SEO-Tabelle).
- **Slider** — ein mit dem Beitrag anzuzeigender Slider, nur angezeigt, wenn **MelisCmsSlider** aktiv
  ist.

Optionale Abschnitte werden zur Laufzeit per Feature-Erkennung ermittelt (begleitende Endpunkte
liefern anmutig einen 404; der Modulstatus wird aus `/melis/react-api/react-modules` gelesen), sodass
ein fehlendes Begleitmodul das Speichern niemals unterbricht. **Save** (oben rechts) persistiert jede
Übersetzung, SEO, Daten, Medienverknüpfungen, Slider und Autor in einem einzigen Aufruf. Ein
**Preview**-Bereich rendert anschließend den gespeicherten Beitrag auf seiner Detailseite in einem
iframe.

![Die erweiterte Einstellungs-Seitenleiste — ein Comments-validation-Umschalter, der nur für den Blog geltende Umschalter „Account required to comment", dann die einklappbaren Abschnitte SEO und Slider](/screenshots/react/melis-cms-blog/meliscmsblog-tool-blog-edit-tab-properties-with-overrides.png)

## React-API

Routen befinden sich in `config/react-api.php` (zusammengeführt über
`MelisCmsBlog\Module::getConfig()`), eingehängt unter `/melis/react-api/…`. Controller:
`MelisCmsBlog\Controller\MelisCmsBlogReactApiController`. Vertrag `{ success, data, error }`; jeder
Fetch sendet `X-Requested-With: XMLHttpRequest` und `credentials:'include'`.

| Methode & URL | Zweck |
| --- | --- |
| `GET /blog` | Beiträge auflisten (Keyset: `limit`, `search`, `status`, `siteId`, `sort`, `dir`, `after`) → `{items,total,nextCursor}` |
| `GET /blog/stats` | KPI `{total, published, draft}` |
| `GET /blog/:id` | Ein Beitrag (`?langId=` → diese Übersetzung; Basisfelder + Absätze + Medien + SEO + Slider/Autor) |
| `POST /blog/save` | Erstellen / Aktualisieren (alle Übersetzungen, Status, siteId, Daten, sliderId, authorId, Kommentar-Flags, SEO) |
| `DELETE /blog/delete/:id` | Einen Beitrag und seine Texte löschen |
| `GET /blog/preview/:id` | Vorschau-URL + Liste der BLOG_DETAIL-Seiten für die Website des Beitrags |
| `GET /blog/users` | Frontoffice-Benutzer als Autoren (`MelisCmsUserAccount`) |
| `GET /blog/:id/comments` | Kommentare eines Beitrags (404, wenn `MelisCmsComments` deaktiviert) |
| `POST /blog/comments/save` | Einen Kommentar hinzufügen/bearbeiten |
| `POST /blog/comments/approve/:cid` · `/refuse/:cid` | Einen Kommentar moderieren |
| `DELETE /blog/comments/delete/:cid` | Einen Kommentar löschen |
| `GET /blog-sites` | Websites-Liste |
| `GET /blog-languages` | CMS-Sprachen (`melis_cms_lang`) |

Es gibt **keine `/blog/categories`- oder `/blog/tags`-Routen**. Slider stammen aus dem eigenen
`GET /melis/react-api/sliders` des MelisCmsSlider-Bricks. Medien-Upload/-Entfernen und die Suche nach
Kommentarautoren nutzen die **Legacy**-Endpunkte erneut (keine Backend-Änderung):

- `POST /melis/MelisCmsBlog/MelisCmsBlog/saveFileForm` — Multipart-Upload von Bildern/Dateien
- `POST /melis/MelisCmsBlog/MelisCmsBlog/removeAttachFile` — leert die Spalte und löscht die Datei

### Berechtigungen (Capabilities)

Deklariert in `config/react.capabilities.php` unter dem rechtetragenden Knoten
`meliscmsblog_left_menu`:

```
meliscmsblog_left_menu
└─ actions: list · create · edit · delete · export
```

React steuert den Zugriff auf die Oberfläche über
`window.__melisUseCaps('meliscmsblog_left_menu').can(cap)` (New post → `create`, Export → `export`,
Zeilenaktionen → `edit`/`delete`, Listenkörper → `list`). Serverseitig wird jede Controller-Aktion
durch `denyUnlessAccess()` (Auth + `canAccess`) und anschließend `denyUnlessCan(cap)` abgesichert.

## Brick-Manifest

`public/ui-react/brick.manifest.json` (Vite-IIFE-Bundle, React/ReactDOM auf Host-Globals
externalisiert):

```json
{ "id": "blog", "route": "/melis-cms/blog", "label": "Blog",
  "forwardKey": "MelisCmsBlog/MelisCmsBlogList", "melisKey": "meliscmsblog_left_menu",
  "entry": "brick.js", "persistent": true, "subTabs": true }
```

`forwardKey` bildet den Legacy-Knoten des linken Menüs auf die Baumroute `/melis-cms/blog` ab
(deep-linkbar als `/melis-cms/blog/:id`, verwendet vom Workflow-Auge). `subTabs: true` bedeutet, dass
der Brick seine eigene werkzeuginterne Untertab-Leiste zeichnet. Wenn MelisSmallBusiness aktiv ist,
rendert der Status-Abschnitt das gemeinschaftlich genutzte `window.__melisWorkflowModal` mit
`ctx.wfType = 'BLOG'`. Ein optionales Modul kann über
`window.__melisBlogExtensions.renderParagraphActions(...)` absatzspezifische Aktionen hinzufügen.

## Frontoffice

Drei Templating-Plugins erweitern `MelisTemplatingPlugin`, jedes mit einem Controller-Plugin und
einer Konfigurationsdatei unter `config/plugins/`. Alle lesen die aktive Beitrags-ID aus dem
Query-Parameter `?blogId`. Im React-Seiteneditor werden sie aus der Gruppe **Melis Cms Blog** im
Plugins-Panel abgelegt, und jedes öffnet das klassische tabbasierte Konfigurationsmodal.

![Der React-Seiteneditor mit geöffnetem Plugins-Panel — die Gruppe „Melis Cms Blog": Latest blog posts, Blog post list, Blog post details](/screenshots/react/melis-cms-blog/meliscmsblog-page-plugins-menu.png)

| Plugin-Klasse | Config-Schlüssel | View | Config-Tabs |
| --- | --- | --- | --- |
| `MelisCmsBlogLatestBlogPlugin` | `MelisCmsBlogLatestBlog` | `MelisCmsBlog/latest-blog` | Properties, Filters |
| `MelisCmsBlogListBlogPlugin` | `MelisCmsBlogListBlog` | `MelisCmsBlog/blog-list` | Properties, Pagination, Filters |
| `MelisCmsBlogShowBlogPlugin` | `MelisCmsBlogShowBlog` | `MelisCmsBlog/blog-details` | Properties |

Plugin-Konfigurationsparameter: `template_path`, `site_id`, `pageIdBlog` (Link zur Detailseite),
`column`, `order`, `limit`, `date_min`, `date_max`, `search`; sowie `nbPerPage` /
`nbPageBeforeAfter` (nur Blog list). Das Blog-list-Plugin filtert außerdem nach `?authorId`. Das
Blog-details-Plugin greift auf den neuesten veröffentlichten Beitrag zurück, wenn keine `blogId` in
der Anfrage enthalten ist, und unterstützt den Vorschaumodus (`renderMode === 'previewtab'`).

Verfügbare Sortierspalten: `cblog_id`, `cblog_title`, `cblog_publish_date`, `cblog_creation_date`.

![Blog-list-Plugin → Properties — Template MelisCmsBlog/blog-list, Site und Blog-Detailseite](/screenshots/react/melis-cms-blog/meliscmsblog-page-plugin-bloglist-config-properties.png)

![Latest-blog-Plugin → Filters — Sort (Blog publish date), Order, Limit, From/To-Datum und Default search](/screenshots/react/melis-cms-blog/meliscmsblog-page-plugin-latestblog-config-filters.png)

![Blog-details-Plugin → Properties — Template MelisCmsBlog/blog-details und ein Default-post-Selektor](/screenshots/react/melis-cms-blog/meliscmsblog-page-plugin-blogdetails-config-properties.png)

### SEO-Routing

Beiträge werden über eine Seite vom Typ **`BLOG_DETAIL`** ausgeliefert, die das Blog-details-Plugin
trägt, unter der `cblog_seo_url` des Beitrags. Vier Listener implementieren die vollständige
SEO-Pipeline:

| Listener | Event | Rolle |
| --- | --- | --- |
| `MelisCmsBlogSEOReformatToRoutePageUrlListener` | `EVENT_ROUTE` | Gleicht die SEO-URL ab und erstellt eine Route zur BLOG_DETAIL-Seite |
| `MelisBlogSEODispatchRouterRegularUrlListener` | `EVENT_DISPATCH` | Leitet eine nicht-kanonische URL per 301 auf die `cblog_seo_url` des Beitrags um |
| `MelisCmsBlogRedirect301Listener` | `meliscmsblog_redirect_page` | Setzt die SEO-Meta der Seite aus den Meta-Feldern des Beitrags |
| `MelisCmsBlogSEOMetaPageListener` | `EVENT_FINISH` | Schreibt den gerenderten `<title>` / `<meta description>` mit der SEO-Meta des Beitrags neu |

`MelisCmsBlogPreviewTypeListener` registriert den Seitentyp **BLOG_DETAIL** im
Seiteneigenschaften-Formular (Event `modify_page_properties_form_config`).

## Beispiel

```php
$blog = $this->getServiceManager()->get('MelisCmsBlogService');

// Latest 10 published posts for site 1, newest first:
$list = $blog->getBlogList([
    'siteId'   => 1,
    'langId'   => 1,
    'limit'    => 10,
    'orderBy'  => 'cblog_publish_date',
    'orderDir' => 'DESC',
]);

// Fetch one post (with its texts for a given language):
$post = $blog->getBlogById($blogId, $langId);
$txt  = $blog->getPostText($blogId);

// Create / update / delete:
$id = $blog->saveBlog(['cblog_site_id' => 1, 'cblog_status' => 1, ...], $blogId); // null → create
$blog->deleteBlogById($blogId);  // also removes its texts

// Utility:
$pages  = $blog->getBlogDetailsPagesBySite($siteId);       // BLOG_DETAIL-type pages for a site
$isDupe = $blog->checkSeoUrlDuplication($seoUrl, $blogId); // SEO URL uniqueness check
$slug   = $blog->cleanURL($title);                         // slugify (handles accents)

// Posts by a front-account author:
$posts  = $blog->getBlogListByAuthorId($authorId);
```

## Weitere Listener

| Listener | Event | Zweck |
| --- | --- | --- |
| `MelisCmsBlogSliderDeletedListener` | `meliscmsslider_delete_slider_end` | Entfernt einen gelöschten Slider aus Beiträgen (`cblog_slider_id`) |
| `MelisCmsBlogGdprAutoDeleteActionDeleteListener` | `melis_cms_user_account_gdpr_auto_delete_action_delete` | DSGVO: setzt `cblog_author_account` für ein gelöschtes Benutzerkonto auf null |
| `MelisCmsBlogServiceMicroServiceListener` | `melis_core_microservice_amend_data` | Wandelt Bildpfade in `getBlogList`-Ergebnissen in absolute URLs für die API-/Microservice-Ausgabe um |
| `SiteMenuBlogDataListener` | `MelisFrontMenuPlugin_melistemplating_plugin_end` | Speist Beiträge (nach Monat/Jahr gruppiert) in das Front-Menü-Plugin ein |
| `MelisCmsBlogFlashMessengerListener` | `meliscmsblog_delete_blog_end`, `meliscmsblog_save_blog_*_end` | Flash-Messenger-Rückmeldung für Blog-Aktionen |

## Wichtige Dateien

| Betrifft | Pfad |
| --- | --- |
| Modulkonfiguration (Services, Gateways, Plugins) | `vendor/melisplatform/melis-cms-blog/config/module.config.php` |
| React-API-Routen | `vendor/melisplatform/melis-cms-blog/config/react-api.php` |
| React-Berechtigungen | `vendor/melisplatform/melis-cms-blog/config/react.capabilities.php` |
| Backoffice-Werkzeugbaum (Legacy / Old-Ansicht) | `vendor/melisplatform/melis-cms-blog/config/app.interface.php` |
| Injektion des Comments-Tabs | `vendor/melisplatform/melis-cms-blog/config/comments.config.php` |
| Plugin-Konfigurationen | `vendor/melisplatform/melis-cms-blog/config/plugins/` |
| Haupt-Service | `vendor/melisplatform/melis-cms-blog/src/Service/MelisCmsBlogService.php` |
| React-API-Controller | `vendor/melisplatform/melis-cms-blog/src/Controller/MelisCmsBlogReactApiController.php` |
| Front-Plugins | `vendor/melisplatform/melis-cms-blog/src/Controller/Plugin/` |
| Listener (SEO, DSGVO, Slider, Menü, Flash) | `vendor/melisplatform/melis-cms-blog/src/Listener/` |
| React-Brick-Quellcode | `vendor/melisplatform/melis-cms-blog/ui-react/src/` |
| Gebauter Brick + Manifest | `vendor/melisplatform/melis-cms-blog/public/ui-react/` |
| Install-SQL | `vendor/melisplatform/melis-cms-blog/install/sql/setup_structure.sql` |

Siehe auch: [melis-cms](/de/reference/modules/melis-cms), [melis-front](/de/reference/modules/melis-front),
[melis-engine](/de/reference/modules/melis-engine), [melis-core](/de/reference/modules/melis-core),
[melis-cms-slider](/de/reference/modules/melis-cms-slider),
[melis-small-business](/de/reference/modules/melis-small-business)
