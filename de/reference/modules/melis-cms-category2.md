# MelisCmsCategory2

> Mehrsprachige Inhaltskategorien für mehrere Sites im CMS, mit einem nativen React-Backoffice — Paket `melisplatform/melis-cms-category2`.

## Zweck

MelisCmsCategory2 stellt ein hierarchisches Kategoriesystem im Melis-Backoffice bereit. Kategorien
bilden einen Baum (jeder Knoten verweist auf einen übergeordneten Knoten), tragen sprachspezifische
Übersetzungen (Name und Beschreibung), können auf eine oder mehrere Sites eingeschränkt werden,
verfügen über einen Gültigkeitszeitraum und einen Status und können Mediendateien enthalten. Das
Modul liefert ein Templating-Plugin für das Frontoffice, das einen Kategoriebaum auf einer Seite
darstellt, sowie eine wiederverwendbare Kategorieauswahl, die von anderen Modulen (z. B. News,
Commerce) zur Klassifizierung ihrer Datensätze eingebettet wird.

Im v6-React-Backoffice (`/melis-react`) wird das Tool als **native Full-React-Brick** ausgeliefert:
eine echte Master-Detail-Oberfläche — links der Kategoriebaum, rechts der Editor mit Registerkarten —,
die über eine eigene `react-api`-JSON-Schicht liest und schreibt. Ein Umschalter **New / Old** kann
auf das klassische Tool in einem iframe zurückgreifen. Das zugrunde liegende Datenmodell, die Dienste
und das Front-Plugin sind gegenüber v5 unverändert.

## Aktivierung

In `config/melis.module.load.php` hinzufügen:

```php
return [
    'MelisCmsCategory2',
];
```

Erfordert `melis-core` und `melis-cms`. Das Modul ist `dbdeploy`-fähig, sodass seine Tabellen beim
Deploy angelegt werden. `melis-engine` wird für das Front-Rendering benötigt. Der React-Brick
erscheint nur dann in der Seitenleiste, wenn das Modul hier gelistet ist (modulare Brick-Erkennung).

## Backoffice (React)

**Wo:** linke Seitenleiste → Gruppe **MelisCms** → **Categories** (`Catégories`). Er öffnet sich als
einzelne Master-Detail-Seite — nicht als Multi-Tab-Slider — unter der Route `/melis-cms/category-v2`.
Der Umschalter **New / Old** oben rechts wechselt zwischen der React-Oberfläche (Standard) und dem
klassischen Tool in einem iframe.

![Das React-Tool „Categories“ — Master-Detail: links der Kategoriebaum, rechts der Editor mit Registerkarten, Umschalter New/Old oben rechts](/screenshots/react/melis-cms-category2/meliscmscategory2-tool-categories-accordionsystem.png)

### Kategoriebaum (linker Bereich)

Die linke Spalte zeigt den gesamten Baum. Ihre Symbolleiste enthält ein **Sprach-Dropdown** (Flaggen —
legt fest, in welcher Sprache die Knotennamen angezeigt werden), einen **Site-Filter**, eine Schaltfläche
**Aktualisieren**, ein **Suchfeld** (blendet aus, behält jedoch übergeordnete Knoten bei) sowie
**+ New category** (erstellt eine Wurzel/einen Katalog). Jede Zeile zeigt einen **Statuspunkt**
(grün = aktiv, rot = inaktiv), den Knotennamen und — beim Überfahren mit der Maus — ein **+**
(Unterkategorie hinzufügen) sowie einen **Papierkorb** (Löschen). Ziehen Sie den Griff eines Knotens,
um ihn neu anzuordnen oder neu zuzuordnen: nahe der oberen Kante = davor einfügen, untere Kante =
danach einfügen (gleiche Ebene), Mitte = darin einfügen (letztes Kind). Das Ziehen wird nur in der
vollständigen, ungefilterten Ansicht angeboten. Ein Knoten mit Unterkategorien kann nicht gelöscht
werden.

![Der React-Baumbereich — Sprach-Dropdown, Site-Filter, Aktualisieren, Suche, + New category, Baum mit Statuspunkten und Hinzufügen/Löschen pro Knoten](/screenshots/react/melis-cms-category2/meliscmscategory2-page-plugin-categories-config-properties-search-category.png)

### Editor (rechter Bereich)

Beim Auswählen eines Knotens — oder beim Klick auf **+ New category** / das **+** einer Zeile — wird
der Editor geladen. Die Kopfzeile zeigt den Titel, dessen Kontext („at the root“ oder „under «parent»“)
sowie **Cancel** / **Save**.

- **Registerkarte „Properties“** — Name und Beschreibung pro Sprache (Sprachregister mit einem
  gefüllten/leeren Punkt je Sprache), ein **Status**-Umschalter, **Gültigkeitsdaten** (Start / Ende)
  sowie die **Sites**, zu denen die Kategorie gehört. Ein Name (in mindestens einer Sprache) und
  mindestens eine Site sind erforderlich; sind beide Daten gesetzt, muss das Startdatum vor dem
  Enddatum liegen.
- **Registerkarte „Media“** — **Bilder** und **Dateien** anhängen (zwei Spalten, jeweils mit
  **+ Add** und Löschen pro Element). Speichern Sie die Kategorie zuerst, bevor Sie Medien hinzufügen.

![Neue Kategorie — Registerkarte „Properties“: Sprachregister, Name, Beschreibung, Status-Umschalter, Gültigkeitsdaten, Sites](/screenshots/react/melis-cms-category2/meliscmscategory2-tool-categories-new-tab-properties.png)

![Kategorie-Editor — Registerkarte „Media“: Bildraster (+ Add an image) und Dateiliste (+ Add a file)](/screenshots/react/melis-cms-category2/meliscmscategory2-tool-categories-new-tab-media.png)

## React-API

Die Routen befinden sich in `config/react-api.php` und werden von
`MelisCmsCategory2\Controller\MelisCmsCategoryReactApiController` bereitgestellt, verschachtelt unter
der Backoffice-Basis des Moduls, sodass das effektive Präfix `/melis/MelisCmsCategory2/react-api`
lautet. Jede Antwort folgt dem Vertrag `{ success, data, error }`. Der Controller spricht die Tabellen
direkt über parametrisiertes SQL an und bildet die klassischen Geschäftsregeln nach (Name in ≥ 1
Sprache, ≥ 1 Site, Start ≤ Ende, Reihenfolge automatisch = max+1, `-1` = Wurzel-Vater, kein Löschen
eines Knotens mit Kindern, kaskadierendes Löschen von trans/sites/media, gehärteter Medien-Upload).

| Methode & URL (relativ zur Basis) | Zweck |
| --- | --- |
| `GET /tree?lang=` | Vollständiger Kategoriebaum → `{langId, nodes:[TreeNode]}` (Name auf Sprache aufgelöst, Fallback markiert) |
| `GET /langs` | CMS-Sprachen → `{langs:[{id,locale,name}]}` |
| `GET /sites` | Sites (Filter + Formular) → `{sites:[{id,name}]}` |
| `GET /category/:id` | Eine Kategorie → `{id,parentId,status,dateStart,dateEnd,sites,translations}` |
| `POST /save` | Kategorie erstellen / aktualisieren → `{id}` |
| `DELETE /delete/:id` | Kategorie löschen (blockiert, wenn sie Kinder hat) + gleiche Ebene neu sequenzieren |
| `POST /reorder` | Gleiche Ebene eines übergeordneten Knotens neu sequenzieren (`{parentId, orderedIds:[…]}`) — ordnet auch neu zu |
| `GET /category/:id/media` | Kategorie-Medien → `{images:[MediaItem], files:[MediaItem]}` |
| `POST /media/upload` | Multipart-Upload (`catId`, `type` image\|file, `file`) → `{id,type,path,name}` |
| `DELETE /media/delete/:id` | Medienzeile + zugehörige Datei auf der Festplatte löschen |

## Berechtigungen

Deklariert in `config/react.capabilities.php` unter dem **rechtetragenden** Knoten
`melis_cms_category_v2_tools_section` (dies ist zugleich der `MELIS_KEY` des Controllers — nicht der
Manifest-Zonenschlüssel `melis_cms_categories_v2`, der nur den *Old*-iframe adressiert). Jede
Controller-Aktion schützt den Zugriff mit `canAccess(MELIS_KEY)`. `Capabilities::flatten()` wandelt
den Baum in Punkt-getrennte Strings um, die in React an `makeCan(...)` übergeben werden:

| Berechtigung | Steuert |
| --- | --- |
| `tree.create` | Schaltflächen „+ New category“ und „+“ pro Knoten |
| `tree.order` | Griff zum Neuanordnen per Drag (erfordert zusätzlich die ungefilterte Ansicht) |
| `tree.delete` | Papierkorb pro Knoten |
| `edition` | Laden des Editors für eine bestehende Kategorie (Erstellung bleibt erlaubt) |
| `edition.properties` | Registerkarte „Properties“ |
| `edition.media` | Registerkarte „Media“ |

## Der Brick

Die Oberfläche ist in `ui-react/` erstellt (Vite IIFE, React / ReactRouter auf Host-Globals
ausgelagert, Ausgabe nach `public/ui-react/brick.js` neben `brick.manifest.json`). `brick.tsx`
registriert eine geroutete Komponente unter der Brick-ID `category2`.

```json
{
  "id": "category2",
  "route": "/melis-cms/category-v2",
  "label": "Catégories",
  "forwardKey": "MelisCmsCategory2/MelisCmsCategoryList",
  "melisKey": "melis_cms_categories_v2",
  "entry": "brick.js",
  "persistent": true
}
```

| Komponente | Rolle |
| --- | --- |
| `CategoryPage.tsx` | Container: lädt Sprachen + Sites, (neu)lädt den Baum pro Sprache, besitzt den ausgewählten Knoten und den New/Old-`mode`, rendert das Master-Detail-Layout + den *Old*-iframe |
| `CategoryTree.tsx` | Linker Bereich — Baum, Sprach-Dropdown, Site-Filter, Suche, Hinzufügen/Löschen pro Knoten, Neuanordnen / Neuzuordnen per Drag |
| `CategoryEditor.tsx` | Rechter Bereich — Registerkarten „Properties“ + „Media“, clientseitige Validierung, Inline-/Banner-Fehler |
| `ViewToggle.tsx` | Umschalter New (React) / Old (iframe) |
| `category-api.ts` | Typisierter API-Client für die oben genannten Endpunkte |

Der Host erkennt den Brick über `GET /melis/react-api/react-modules` und bindet ihn ein; `useNavMenu`
ordnet den `forwardKey` der Baum-Route zu. Der Brick liest die aktive Sprache aus
`document.documentElement.lang` und liefert ein in der Datei enthaltenes `{fr,en}`-Wörterbuch. Die
Geschäftslogik verbleibt serverseitig (Gleichwertigkeit mit dem klassischen Tool); React ist
Präsentation + API-Aufrufe.

## Wichtige Dienste

| Dienst-Alias | Rolle |
| --- | --- |
| `MelisCmsCategory2Service` | Haupt-Kategoriedienst: Kategorieknoten erstellen/lesen, Baumabruf, Übersetzungen und Site-Verknüpfungen. |
| `MelisCmsCategory2MediaService` | Dateiablage pro Kategorie auf der Festplatte und in der Datenbank. |

Bemerkenswerte Methoden von `MelisCmsCategory2Service`:

- `getCategoryTreeview($fatherId, $langId, $onlyValid, $siteId)` — rekursiver Baum.
- `getCategoryById($categoryId, $langId, $onlyValid)` — vollständiger Kategorieknoten.
- `getCategoryNameById($categoryId, $langId)` — Namensabfrage.
- `getCategoriesPerSite($siteId, $langId)`, `getFirstLevelCategoriesPerSite($siteId, $langId)`.
- `saveCategory(...)`, `saveCategoryTexts(...)`, `saveCategorySites(...)` — Knoten/Übersetzung/Site persistieren.
- `reOrderCategories($parentId, $currentOrder)` — Drag-Neuanordnung persistieren.
- `validateDates($dateStart, $dateEnd)`.

`MelisCmsCategory2MediaService` übernimmt die Dateisystemseite: `uploadFile`, `deleteFile`,
`getMediaFilesByCategoryId`, `getFilesInDir`, `removeCategoryDir`.

> Der React-`react-api`-Controller verwendet direktes SQL statt dieser Dienste, doch das Front-Plugin
> und die wiederverwendbare Kategorieauswahl rufen weiterhin `MelisCmsCategory2Service` auf.

## Frontoffice

- **Templating-Plugin** `MelisCmsCategoryDisplayCategoriesPlugin` — rendert einen Kategoriebaum auf
  einer Seite. Seine Konfiguration bietet eine Registerkarte „Properties“ mit drei Feldern:
  `template_path`, `site_id`, `category_start`. Standardvorlage: `MelisCmsCategory2/default`. Ziehen
  Sie im React-Seiteneditor den Block **Display Categories** und legen Sie Vorlage, Startkategorie
  (Baumauswahl) und Site fest.
- **View-Helper** `renderTreeRec` — rendert rekursiv ein Kategoriebaum-Array innerhalb einer View.

![Einstellungen des Plugins „Display Categories“ — Vorlage, Startkategorie (Baumauswahl), Site](/screenshots/react/melis-cms-category2/meliscmscategory2-page-plugin-categories-config-properties.png)

Fest codierte Verwendung:

```php
$display = $this->MelisCmsCategoryDisplayCategoriesPlugin();
echo $display->render([
    'template_path' => ['MelisCmsCategory2/default'],
    'site_id'        => 1,
    'category_start' => 1,
]);
```

## Datenbanktabellen

| Tabelle | Enthält |
| --- | --- |
| `melis_cms_category2` | Kategorieknoten: `cat2_id`, `cat2_father_cat_id`, Reihenfolge, Status, Referenz, Gültigkeitsdaten, Audit. |
| `melis_cms_category2_trans` | Übersetzung pro Sprache: Name und Beschreibung, verschlüsselt über `catt2_id`. |
| `melis_cms_category2_sites` | Verknüpfung Kategorie-zu-Site, verschlüsselt über `cats2_id`. |
| `melis_cms_category2_media` | An eine Kategorie angehängte Medien: `catm2_type`, `catm2_path`, `catm2_cat_id`. |

Ein Wurzel-Startknoten (`cat2_id = 1`, „My catalog“ / „Mon catalogue“) wird bei der Installation eingefügt.

## Wichtige Dateien

| Bereich | Pfad |
| --- | --- |
| React-API-Routen + invokable Controller | `vendor/melisplatform/melis-cms-category2/config/react-api.php` |
| React-Berechtigungsdeklaration | `vendor/melisplatform/melis-cms-category2/config/react.capabilities.php` |
| React-API-Controller (10 Aktionen, direktes SQL, gehärteter Upload) | `vendor/melisplatform/melis-cms-category2/src/Controller/MelisCmsCategoryReactApiController.php` |
| React-Brick (Vite IIFE) | `vendor/melisplatform/melis-cms-category2/ui-react/` und gebautes `public/ui-react/` |
| Brick-Manifest | `vendor/melisplatform/melis-cms-category2/public/ui-react/brick.manifest.json` |
| Hauptdienst | `vendor/melisplatform/melis-cms-category2/src/Service/MelisCmsCategoryService.php` |
| Mediendienst | `vendor/melisplatform/melis-cms-category2/src/Service/MelisCmsCategoryMediaService.php` |
| Templating-Plugin | `vendor/melisplatform/melis-cms-category2/src/Controller/Plugin/MelisCmsCategoryDisplayCategoriesPlugin.php` |
| Installations-SQL | `vendor/melisplatform/melis-cms-category2/install/sql/` |

Siehe auch: [melis-cms](/de/reference/modules/melis-cms), [melis-core](/de/reference/modules/melis-core), [melis-cms-news](/de/reference/modules/melis-cms-news)
