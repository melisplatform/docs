# MelisCmsShare

> Fügt Social-Media-Share-/Open-Graph-Meta-Tags in den Front-Office-`<head>` einer CMS-Seite ein, verwaltet über ein natives React-Back-Office. Paket `melisplatform/melis-cms-share`.

## Zweck

`MelisCmsShare` ermöglicht es einem Redakteur, fünf seitenbezogene Werte festzulegen — **Titel, Beschreibung, Bild, Typ und URL** —
und schreibt sie als drei Familien von Meta-Tags in den `<head>` der gerenderten Seite: **Twitter Card**
(`twitter:title/description/image/card`), **schema.org / Google** (`itemprop`-Attribute) und
**Facebook / Open Graph** (`og:title/description/image/type/url`). Pro Seite wird eine Datenzeile
gespeichert; ein bereits im Template vorhandenes Tag wird ersetzt, andernfalls direkt nach
`<head>` eingefügt. Seiten ohne Share-Zeile bleiben unverändert.

In v6 liefert das Modul einen **nativen Full-React-Brick** (kein iframe-Brick), der diese Daten auf zwei
Oberflächen bereitstellt — ein eigenständiges **Open Graph**-Werkzeug und einen **Open-Graph-Tab innerhalb des CMS-Seiteneditors** —
die beide über eine `/melis/react-api/cms-share…`-JSON-Schicht lesen und schreiben. Der Front-Office-
`<head>`-Injektor, das Datenmodell und die Services sind gegenüber v5 unverändert.

## Aktivierung

Zu `config/melis.module.load.php` hinzufügen:

```php
return [
    'MelisCmsShare',
];
```

Abhängigkeiten: `melisplatform/melis-core`, `melisplatform/melis-engine`, `melisplatform/melis-front`
und `melisplatform/melis-cms`. Das Modul benötigt den CMS-Seiteneditor (für den Open-Graph-Tab und die
Seiten-Lifecycle-Events) sowie die Front-Render-Pipeline (für den `MvcEvent::EVENT_FINISH`-Hook). Beide React-
Oberflächen erscheinen **nur, solange das Modul hier aufgeführt ist** (modulare Brick-Erkennung über
`GET /melis/react-api/react-modules`).

## Das React-Back-Office

Der Brick ist eine **native Full-React**-Oberfläche mit einem **New/Old-Umschalter**: *New* ist die React-Oberfläche
(Standard), *Old* rendert das Legacy-Werkzeug in einem iframe
(`/melis/react-tool-page?key=melis_cms_share_tool_display`).

| Element | Wert |
| --- | --- |
| Brick-ID | `cms-share` (Route `/melis-cms-share/share`, Label `Partage`) |
| `forwardKey` | `MelisCmsShare/MelisCmsShareTool` |
| `melisKey` (Rechte / Old-View-iframe) | `melis_cms_share_tool_display` |
| Seiteneditor-Tab-Key | `melis_cms_share_page_edition_tab` (registriert unter `meliscms_page`) |
| API-Basis | `/melis/react-api/cms-share` |

**Open-Graph-Werkzeug** — Seitenleiste → **Site Tools** → **Open Graph**. Listet die Share-Zeile jeder Seite mit
**KPI-Karten** (Total shares, Pages covered, Distinct types), einem **Suchfeld** (Titel, URL, Typ,
Beschreibung, Seiten-ID), einem **All types**-Filter, **Reset filters**, einem **Columns**-Manager,
**Export**, einer Aktualisierungsschaltfläche und dem New/Old-Umschalter. Klicken Sie auf einen Spaltenkopf (Page / Title / Type / URL /
Added on), um zu sortieren; jede Zeile verfügt über Bearbeiten (Stift) und Löschen (Papierkorb).

![Das React-Open-Graph-Werkzeug: KPI-Karten (Total / Pages covered / Distinct types), Suche, ein Typfilter, Reset filters, Columns-Manager, Export, der New/Old-Umschalter und eine Aktualisierung — jede Zeile zeigt Page, Title, Type, URL, Added on mit zeilenbezogenen Bearbeiten- und Löschen-Aktionen](/screenshots/react/melis-cms-share/meliscmsshare-tool-opengraph-list.png)

**Bearbeitungsformular** — Page ID (erforderlich), Type (`article`, `website`…), Title (`og:title`), URL
(`og:url`), ein Bildbereich (Vorschau + Replace / Remove; JPG, PNG, GIF, WEBP — max. 15 MB) und eine
Description (`og:description`). Das Bild wird zuerst (multipart) nach
`/media/melisCmsShare/<pageId>/…` hochgeladen, anschließend wird sein Pfad beim **Save** gespeichert.

![Das React-Share-Formular — Page ID, Type, Title, URL, ein Bildbereich mit dem gespeicherten Pfad (`/media/melisCmsShare/<pageId>/…`) samt Replace/Remove und eine Description-Textarea](/screenshots/react/melis-cms-share/meliscmsshare-tool-opengraph-edit.png)

**Open-Graph-Tab im CMS-Seiteneditor** — öffnen Sie eine CMS-Seite und wählen Sie den **Open Graph**-Tab, um die
Share-Metadaten dieser einen Seite inline zu bearbeiten (Title, Type, URL, Image, Description); die Page ID ist
implizit. Der Tab hat **keine eigene Save-Schaltfläche** — die Werte werden beim
Save / Publish des Seiteneditors über einen Save-Hook gespeichert, genau wie beim Legacy-Share-Tab.

![Der CMS-Seiteneditor mit aktivem Open-Graph-Tab (neben Edition, Properties, SEO, Languages, Historic, Page Analytics und weiteren) — Title, Type, URL, Bildbereich und Description, gespeichert über die oberen Save/Publish-Schaltflächen der Seite](/screenshots/react/melis-cms-share/meliscmsshare-pageedition-tab-opengraph.png)

## React-API

Die Routen befinden sich in `config/react-api.php` (zusammengeführt über `MelisCmsShare\Module::getConfig()`); Controller
`MelisCmsShare\Controller\MelisReactApiShareController`. Alle unter `/melis/react-api/cms-share` mit
dem Vertrag `{ success, data, error }`.

| Methode & URL | Guard | Zweck |
| --- | --- | --- |
| `GET /cms-share` | access + `list` | Keyset-Liste (`limit`, `search`, `type`, `page`, `sort`, `dir`, `after`) → `{items,total,nextCursor}` |
| `GET /cms-share/stats` | access + `list` | KPI `{total, pages, types}` |
| `GET /cms-share/types` | access + `list` | Eindeutige `mcs_type`-Werte (Filteroptionen) |
| `GET /cms-share/:id` | access + `edit` | Eine Share-Zeile |
| `GET /cms-share/by-page/:idPage` | nur auth | Die Share-Zeile der Seite (für den Seiteneditor-Tab); `data:null`, falls keine |
| `POST /cms-share/save` | access + `create`/`edit` | Erstellen / Aktualisieren (`{id?, pageId, title, type, url, img, description}`); Autor serverseitig erzwungen; Seiten-Cache invalidiert |
| `POST /cms-share/upload-image` | access + `edit` | Multipart-Upload (`pageId`, `image`) → `{path}` unter `/media/melisCmsShare/<pageId>/…` |
| `DELETE /cms-share/delete/:id` | access + `delete` | Löscht eine Zeile; Seiten-Cache invalidiert |

Der Controller spricht `melis_cms_share` **direkt über parametrisiertes SQL** an und reproduziert die
Legacy-Geschäftsregeln (Seiten-ID erforderlich, Autor beim Erstellen auf den aktuellen Benutzer erzwungen, Bild-Allowlist
jpg/jpeg/png/gif/webp/ico/bmp ≤ 15 MB als einzige Datei unter `/media/melisCmsShare/<pageId>/` gehalten,
Front-Page-Cache-Invalidierung, damit die `<head>`-Tags aktualisiert werden). Der übergeordnete `MelisCmsShareService`
wird von diesem Controller nicht verwendet. Jeder Fetch sendet `X-Requested-With: XMLHttpRequest` und
`credentials:'include'`.

## Berechtigungen

Deklariert in `config/react.capabilities.php` unter dem rechtetragenden Knoten
`melis_cms_share_tool_display` (derselbe Knoten, den der Access-Guard des Controllers verwendet):

```
melis_cms_share_tool_display → list · create · edit · delete · export
```

`MelisCan('melis_cms_share_tool_display', cap)` steuert die UI-Schaltflächen; serverseitig ruft jede Aktion
`denyUnlessAccess()` (auth + `MelisCoreRights::canAccess(...)` → 401/403) und anschließend `denyUnlessCan(cap)` auf.
Der Seiteneditor-Tab ist ein separater **modularer** Beitrag: dieselbe Datei führt einen `tabs`-Eintrag
unter `meliscms_page` zusammen (Key `melis_cms_share_page_edition_tab`, passend zum `registerPageTab(...)`-
Aufruf im Brick), sodass MelisCms die Tab-Schaltfläche anzeigt.

## Wichtige Services

| Service-Alias | Rolle |
| --- | --- |
| `MelisCmsShareService` | Vollständiges CRUD für Share-Datensätze: `saveShare($data)`, `deleteShare()`, `getShareById()`, `getShareByPageId($idPage)`, `getAllShare()`, `searchShare()`, `countAllShare()`, `countFilteredShare()`. |
| `melisCmsShareTable` | Table-Gateway für `melis_cms_share` (`MelisCmsShareTable`). Zeile einer Seite abrufen mit `getEntryByField('mcs_page_id', $idPage)`. |

## Front-Office

Es wird kein View-Helper oder Templating-Plugin bereitgestellt. Die Share-Tags werden von
`MelisCmsShare\Listener\MelisCmsShareMetaPageListener` eingefügt, der in `src/Module.php` angehängt wird und bei
**`MvcEvent::EVENT_FINISH`** mit Priorität **110** ausgelöst wird:

1. Überspringt Nicht-PHP-/Asset-Anfragen (Regex auf URI) und Anfragen ohne `idpage`.
2. Lädt die Share-Zeile der Seite über `melisCmsShareTable->getEntryByField('mcs_page_id', $idPage)`.
3. Für jedes nicht leere Feld wird entweder das vorhandene Tag per `preg_replace` ersetzt oder nach `<head>` eingefügt —
   über alle drei Familien hinweg (Twitter Card, `itemprop`, `og:`).
4. Escaped Werte per `addslashes`, stellt `scheme://host` den Bild-URLs voran und schreibt über
   `$response->setContent()` zurück.

Da er auf dem bereits gerenderten HTML-String am Ende des MVC-Lebenszyklus arbeitet, kann er
Tags ersetzen, die ein Template bereits ausgegeben hat.

> **Typ-Vorbehalt:** Das einzelne `mcs_type`-Feld speist sowohl `twitter:card` als auch `og:type`, die
> unterschiedliche Vokabulare erwarten (`summary`/`summary_large_image` vs. `website`/`article`). Verwenden Sie einen für beide
> akzeptablen Wert, oder nehmen Sie in Kauf, dass einer nicht kanonisch ist.

## Seiten-Lifecycle-Listener

| Listener | Event(s) | Zweck |
| --- | --- | --- |
| `MelisCmsSavePageListener` | `meliscms_page_save_start`, `meliscms_page_publish_start` | Hält den Share-Datensatz konsistent, wenn eine CMS-Seite gespeichert oder veröffentlicht wird. |
| `MelisCmsShareDeletePageListener` | `meliscms_page_delete_end` | Löscht die `melis_cms_share`-Zeile, wenn ihre Seite gelöscht wird (keine verwaisten Share-Daten). |
| `MelisCmsShareFlashMessengerListener` | BO-Save-/Delete-Events | Back-Office-Flash-Feedback nach Speichern oder Löschen. |

## Datenbanktabellen

| Tabelle | Enthält |
| --- | --- |
| `melis_cms_share` | Eine Share-Konfiguration pro Seite. PK `mcs_id`. Spalten: `mcs_page_id`, `mcs_title`, `mcs_description`, `mcs_img`, `mcs_type`, `mcs_url`, `mcs_add_user_id`, `mcs_date_added`. Die Tabelle verknüpft den BO-Benutzer, um `mcs_share_added_by` (vollständiger Name) bereitzustellen. |

## Beispiel

```php
// Read the share config for a given page
$share = $serviceManager->get('MelisCmsShareService')->getShareByPageId($pageId);

// Persist a share config for a page (create or update)
$serviceManager->get('MelisCmsShareService')->saveShare([
    'mcs_page_id'      => $pageId,
    'mcs_title'        => 'My page title for social',
    'mcs_description'  => 'A short description shown in link previews.',
    'mcs_img'          => '/path/to/preview-image.jpg',
    'mcs_type'         => 'summary_large_image',
    'mcs_url'          => 'https://example.com/my-page',
    'mcs_add_user_id'  => $currentUserId,
]);
```

## Wichtige Dateien

| Bereich | Pfad |
| --- | --- |
| Modul / Bootstrap | `vendor/melisplatform/melis-cms-share/src/Module.php` |
| React-API-Routen + Invokable | `vendor/melisplatform/melis-cms-share/config/react-api.php` |
| React-Berechtigungen + Seiten-Tab | `vendor/melisplatform/melis-cms-share/config/react.capabilities.php` |
| React-API-Controller | `vendor/melisplatform/melis-cms-share/src/Controller/MelisReactApiShareController.php` |
| Legacy-BO-Controller (Old-View) | `vendor/melisplatform/melis-cms-share/src/Controller/MelisCmsShareToolController.php` |
| React-Brick-Quelle | `vendor/melisplatform/melis-cms-share/ui-react/src/` (`brick.tsx`, `SharePage.tsx`, …) |
| Gebauter Brick + Manifest | `vendor/melisplatform/melis-cms-share/public/ui-react/` (`brick.js`, `brick.manifest.json`) |
| Front-`<head>`-Injektor | `vendor/melisplatform/melis-cms-share/src/Listener/MelisCmsShareMetaPageListener.php` |
| Service | `vendor/melisplatform/melis-cms-share/src/Service/MelisCmsShareService.php` |
| Table | `vendor/melisplatform/melis-cms-share/src/Model/Tables/MelisCmsShareTable.php` |

Siehe auch: [MelisCms](/de/reference/modules/melis-cms) · [MelisCmsPageAnalytics](/de/reference/modules/melis-cms-page-analytics) · [Modulreferenz](/de/reference/modules)
