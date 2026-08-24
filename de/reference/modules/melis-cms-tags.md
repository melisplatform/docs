# MelisCmsTags

> Gemeinsames Tag-/Taxonomie-System für das CMS — die „Labels", an denen Content-Module (z. B. News) ihre Elemente aufhängen, jetzt mit einem nativen React-Backoffice. Paket `melisplatform/melis-cms-tags`.

## Zweck

MelisCmsTags stellt das **Tag- (Taxonomie-) System** der Plattform bereit: mehrsprachige Tags (ein Titel je
Sprache), mit denen andere Module ihre Inhalte verknüpfen. Redakteure erstellen und übersetzen Tags, sehen, wie
viele Elemente jedes Tag verwenden, und löschen ungenutzte. Andere Module (z. B. MelisCmsNews) klinken sich über
eine Konfigurationsdeklaration und einen einzigen Service-Aufruf in die Verknüpfungsschicht ein und machen ihre
Elemente damit taggbar, ohne dass das Tag-Modul eine Schemaänderung benötigt. Ein Frontend-Templating-Plugin
**List Tags** zeigt die Tags einer Website im Frontoffice an.

In **Melis v6** ist das Backoffice ein **nativer Full-React-Baustein**, der innerhalb von `/melis-react` gerendert
wird und eine modul-eigene `react-api`-JSON-Schicht aufruft. Das serverseitige Datenmodell, der Service, die
Tabellen, die Verknüpfungskonfiguration und das Frontend-Plugin sind gegenüber v5 unverändert — nur die
Präsentations- und Navigationsschicht wurde nach React verlagert.

## Aktivierung

In `config/melis.module.load.php` ergänzen:

```php
return [
    'MelisCmsTags',
];
```

Erfordert `melis-core` und `melis-cms`. Das Modul wird mit `dbdeploy: true` ausgeliefert — seine drei Tabellen
werden beim ersten Deploy automatisch erstellt. Der React-Baustein erscheint im Backoffice **nur, wenn das Modul
aktiviert ist** (modulare Baustein-Erkennung).

## Wo es im React-Backoffice zu finden ist

Linke Seitenleiste → Gruppe **Site Tools** → **Tags** (`fa-tag`). Es öffnet sich als oberer Tab mit dem Namen
**Tags**. Der Menü-`forwardKey` `MelisCmsTags/TagsList` verweist auf die Baumroute `/melis-cms/tags`
(`/melis-cms/tags/:id` für den Editor), unter der die Komponente `TagsPage` gerendert wird.

Der Baustein ist eine **native Full-React**-Oberfläche mit einem **New-/Old-Umschalter** (oben rechts): *New* ist
die React-Oberfläche (Standard), *Old* rendert das Legacy-Tool in einem iframe
(`/melis/react-tool-page?key=tags_left_menu`).

## Backoffice — Liste und Editor

**Ein Shell-Tab (`Tags`) mit In-Tool-Untertabs.** Die Liste ist die Hauptansicht; das Öffnen oder Erstellen eines
Tags fügt einen **Bearbeitungs-Untertab** hinzu (`subTabs: true`), sodass der Wechsel zwischen geöffneten Tags
sofort erfolgt.

**Die Liste** zeigt jedes Tag der Plattform, mit:

- **KPI-Karten** — Total · With associations · Without association (aus dem `stats`-Endpunkt).
- **Suche** („Search a tag…", trifft ID oder einen Titel in einer beliebigen Sprache), **Reset filters**, einen
  **Columns**-Manager (ausblenden/umsortieren) und eine **Export**-Schaltfläche (`.xlsx` über das Host-Objekt
  `window.MelisXLSX`, CSV als Fallback).
- Sortierbare Spalten **ID / Title / Nb associations**, mit zeilenbezogenen Aktionen **Bearbeiten** und **Löschen**.
- Eine Schaltfläche **+ New tag**, die einen leeren Editor öffnet.

![React-Tags-Liste — KPI-Karten (Total / With associations / Without association), Suche, Reset filters, Columns-Manager, Export, der New/Old-Umschalter, „+ New tag" und Zeilen mit ID / Title / Nb associations sowie Aktionen zum Bearbeiten und Löschen](/screenshots/react/melis-cms-tags/meliscmstags-tool-tags-list.png)

**Der Editor** ist ein kompaktes Formular (ein Tag ist lediglich ein Titel je Sprache): eine **Sprachumschaltung**
(English / Français…), gespeist vom `languages`-Endpunkt, sowie ein Feld **Label** für die gewählte Sprache.
Alle Übersetzungen werden gleichzeitig gehalten und gemeinsam gespeichert — **mindestens ein nicht-leerer Titel
ist erforderlich**. Das Löschen eines Tags wird **verweigert, solange es noch Verknüpfungen besitzt**, um getaggte
Inhalte zu schützen.

![Der React-Tag-Editor — eine Sprachumschaltung (English / Français) und das sprachbezogene Feld „LABEL" mit dem Hinweis „At least one title is required"](/screenshots/react/melis-cms-tags/meliscmstags-tool-tags-edit-texts.png)

## Inhalte taggen — der Tags-Picker

Tags sind dafür gedacht, von anderen Modulen *verwendet* zu werden. Im **React-News-Editor**
(Site Tools → News → einen Artikel öffnen) zeigt die Einstellungs-Seitenleiste ein **TAGS**-Panel: eine Checkliste
der verfügbaren Tags. Werden Tags angehakt und der Artikel gespeichert, werden die Verknüpfungen gespeichert, die
dann bei der **Nb associations** jedes Tags mitzählen.

![Das TAGS-Panel im React-News-Artikeleditor — eine Checkliste von Tags (Art, Business, Design, Development, Education…), die den Artikel taggen](/screenshots/react/melis-cms-tags/meliscmstags-tooloverride-news-tags.png)

Dieser Picker und sein Speichern gehören zum **News**-Baustein (er liest `GET /melis/react-api/news/tags` und
schreibt in die gemeinsame Verknüpfungstabelle mit `entity_type = 'NEWS'`); MelisCmsTags besitzt nur die Tag-Daten
und die gemeinsame Tabelle `melis_cms_tag_entity`. Das Panel erscheint nur, wenn MelisCmsTags aktiv ist.

## React-API — Endpunkte

Es gibt **keine `config/react-api.php`**: Die Routen werden **inline in `config/module.config.php`** als
Kindknoten `react-api-cms-tags` unter `melis-backoffice` deklariert, sodass die URLs unter
**`/melis/react-api-cms-tags`** liegen (modul-eigen, *nicht* der gemeinsame Namespace `/melis/react-api/…`).
Controller: `MelisCmsTags\Controller\MelisCmsTagsReactApiController`. Alle Antworten verwenden den Vertrag
`{ success, data, error }`; Anfragen senden `X-Requested-With: XMLHttpRequest` und `credentials: 'include'`.

| Methode & URL | Aktion | Zweck |
| --- | --- | --- |
| `GET /melis/react-api-cms-tags` | `list` | Tags auflisten (Keyset: `search`, `limit`, `sort`, `dir`, `after`, optional `lang`) → `{items,total,nextCursor}`; jedes Element hat `id`, `title`, `associationsCount` |
| `GET /melis/react-api-cms-tags/stats` | `stats` | KPI `{total, withAssociations, orphan}` |
| `GET /melis/react-api-cms-tags/languages` | `languages` | CMS-Sprachen `{languages:[{id,locale,name}]}` (steuert die Sprachumschaltung des Editors) |
| `GET /melis/react-api-cms-tags/:id` | `get` | Ein Tag `{id, creationDate, titles:{langId:title}, associationsCount}` |
| `POST /melis/react-api-cms-tags/save` | `save` | Erstellen / Aktualisieren (`{id?, titles:{langId:title}}`) → `{id}` |
| `DELETE /melis/react-api-cms-tags/delete/:id` | `delete` | Ein Tag löschen (verweigert, wenn es noch Verknüpfungen besitzt) |

> Die Routenreihenfolge ist entscheidend: `stats` / `languages` / `save` werden **vor** dem `:id`-Catch-all
> deklariert, damit sie zu ihren eigenen Aktionen und nicht zu `get` aufgelöst werden.

Der Controller kombiniert direktes, parametrisiertes Keyset-SQL (list, stats) mit den Tabellen und dem Service
des Moduls (`TagTable`, `TagTextsTable`, `TagEntityTable` für `get`/`save`; `MelisCmsTagsService` für `delete` —
`getAssociationsByTagId()` blockiert das Löschen, danach räumen `deleteTagById()` + `TagTextsTable::deleteByField()`
auf). `save` reproduziert die Legacy-Regeln (≥1 nicht-leerer Titel, ≤255 Zeichen, Eindeutigkeit je Sprache) und
löst dieselben Events aus (`meliscmstags_save_tag_end`, `meliscmstags_delete_tag_end`).

Beispiel (`tags-api.ts`):

```ts
const BASE = '/melis/react-api-cms-tags'
await apiFetch<TagListResult>(`${BASE}?search=art&limit=25&sort=id&dir=desc`) // list
await apiFetch<TagDetail>(`${BASE}/42`)                                       // one tag
await apiFetch<{ id: number }>(`${BASE}/save`, {                              // save all translations
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: null, titles: { 1: 'Art', 2: 'Art' } }),        // langId → title
})
await apiFetch<null>(`${BASE}/delete/42`, { method: 'DELETE' })              // delete
```

## Fähigkeiten (Capabilities)

Deklariert in `config/react.capabilities.php` unter dem Menüknoten **`tags_left_menu`** (dem renderbaren
Tool-Knoten; `MelisCmsTags\Module::getConfig()` führt die Datei zusammen). Aktionen: `list` · `create` · `edit`
· `delete` · `export`. In React liest `can(cap)` von `TagsPage` `window.MelisCan('tags_left_menu', cap)`, um die
Schaltfläche **+ New tag**, das zeilenbezogene Bearbeiten/Löschen und den Export zu steuern. Serverseitig ruft jede
Aktion `denyUnlessAccess()` auf (Auth + `MelisCoreRights::canAccess('tags_left_menu')` → 401/403); hier fallen der
Capabilities-Schlüssel und der Zugriffsschutz-`MELIS_KEY` zusammen (`tags_left_menu`).

## Wichtige Services

| Service-Alias | Rolle |
| --- | --- |
| `MelisCmsTagsService` | Vollständiges Tag-CRUD sowie die Verknüpfungs-API. Jede Methode löst über `MelisGeneralService` `*_start`- / `*_end`-Events aus. |

Table-Gateway-Aliase: `TagTable`, `TagTextsTable`, `TagEntityTable` (registriert in `module.config.php`).

## Frontoffice

`ListTagsPlugin` (`Controller\Plugin\ListPublicationsPlugin.php`) erweitert `MelisTemplatingPlugin`.

| Einstellung | Detail |
| --- | --- |
| Config-Plugin-Schlüssel | `tags` · XML-DB-Schlüssel `TagsList` |
| Konfigurationsdatei | `config/plugins/ListPublicationsPlugin.config.php` |
| Frontend-View | `MelisCmsTags/listtags` |
| Einstellungs-Tabs | **Template** (Template + Website-Auswahl) · **Filters** (Spalte / Sortierung / Min-Datum / Max-Datum / Suche) |

> **Namensabweichung.** Die Plugin-Klasse liegt in `ListPublicationsPlugin.php` und die ausgelieferten
> Phtml-Views sind `listpublications.phtml` / `showpublication.phtml` — ein historisches Artefakt; die
> aktive Funktion ist das oben beschriebene Plugin **List Tags**.

## Datenbanktabellen

Basisstruktur in `install/sql/setup_structure.sql`; Migrationen in `install/dbdeploy/`.

| Tabelle | Inhalt |
| --- | --- |
| `melis_cms_tag` | Kern-Tag-Zeile: `tag_id`, `tag_creation_date`, `tag_site_id`, `tag_type` |
| `melis_cms_tag_texts` | Texte je Sprache: `tag_text_id`, `tag_id`, `tag_title`, `tag_lang_id` |
| `melis_cms_tag_entity` | Verknüpfung Tag ↔ Content-Element: `id`, `tag_id`, `entity_id`, `entity_type` (z. B. `NEWS`) |

## Service-Beispiel

```php
$tags = $this->getServiceManager()->get('MelisCmsTagsService');

// Tag CRUD
$list = $tags->getTagsList($status, $langId, $start, $limit, $orderCol, $order, $siteId, $search);
$tag  = $tags->getTagById($tagId, $langId);
$id   = $tags->saveTag(['tag_site_id' => $siteId, ...], $tagId); // $tagId null → create
$tags->deleteTagById($tagId);

// Associations — the integration surface for other modules
$tags->saveTagEntity([$tagId1, $tagId2], $entityId, 'NEWS'); // (re)attach a tag set to an item
$set   = $tags->loadTagByEntityIdType($entityId, 'NEWS');    // tags of one item
$items = $tags->loadEntityByTagsId($tagIds, 'NEWS');         // items carrying given tags
$tags->deleteEntities($entityId, 'NEWS');                    // clear an item's tags
$assoc = $tags->getAssociationsByTagId($tagId, $langId);     // items associated to a tag
```

`saveTagEntity()` löscht die vorhandenen Verknüpfungen der Entität und speichert dann die übergebene Menge neu —
rufen Sie es aus dem Speicherablauf eines Content-Moduls auf, um dessen Tags synchron zu halten.

## Ein Modul taggbar machen (konfigurationsgesteuerte Verknüpfungen)

Deklarieren Sie das Mapping unter `plugins.melis_cms_tag.datas.associations` in `config/associations.config.php`.
Das ausgelieferte MelisCmsNews-Beispiel:

```php
'associations' => [
    'meliscmsnews' => [
        'module'           => 'MelisCmsNews',       // skipped if module not loaded
        'entity_type'      => 'NEWS',               // stored in melis_cms_tag_entity.entity_type
        'entity_table'     => 'melis_cms_news',
        'entity_primary_id'=> 'cnews_id',
        'trans' => [
            'trans_table'      => 'melis_cms_news_texts',
            'trans_foreign_id' => 'cnews_id',
            'trans_lang_key'   => 'cnews_lang_id',
        ],
        'association_title_key' => 'cnews_title',   // shown in the Associations grid "Title" column
    ],
],
```

Rufen Sie dann `saveTagEntity()` in der Speicheraktion des Content-Moduls auf. Im React-News-Baustein wird dies
über dessen eigene `/melis/react-api/news/tags`-Schnittstelle verdrahtet; MelisCmsTags besitzt lediglich die
Tag-Daten und die gemeinsame Verknüpfungstabelle.

## Wichtige Dateien

| Bereich | Pfad |
| --- | --- |
| Modulkonfiguration (Routen, react-api-Routen inline, Services, Formularelemente) | `vendor/melisplatform/melis-cms-tags/config/module.config.php` |
| React-Capabilities | `vendor/melisplatform/melis-cms-tags/config/react.capabilities.php` |
| Verknüpfungs-Mapping | `vendor/melisplatform/melis-cms-tags/config/associations.config.php` |
| List-Tags-Plugin-Konfiguration | `vendor/melisplatform/melis-cms-tags/config/plugins/ListPublicationsPlugin.config.php` |
| React-API-Controller | `vendor/melisplatform/melis-cms-tags/src/Controller/MelisCmsTagsReactApiController.php` |
| Haupt-Service | `vendor/melisplatform/melis-cms-tags/src/Service/MelisCmsTagsService.php` |
| Frontend-Plugin | `vendor/melisplatform/melis-cms-tags/src/Controller/Plugin/ListPublicationsPlugin.php` |
| Table-Gateways | `vendor/melisplatform/melis-cms-tags/src/Model/Tables/` |
| React-Baustein-Quellcode | `vendor/melisplatform/melis-cms-tags/ui-react/src/` (`TagsPage`, `tags-api.ts`, `ViewToggle`, `ExportModal`) |
| React-Baustein-Build + Manifest | `vendor/melisplatform/melis-cms-tags/public/ui-react/brick.js` · `brick.manifest.json` |
| Install-SQL | `vendor/melisplatform/melis-cms-tags/install/sql/setup_structure.sql` |
| DB-Migrationen | `vendor/melisplatform/melis-cms-tags/install/dbdeploy/` |

Siehe auch: [melis-cms](/de/reference/modules/melis-cms),
[melis-cms-news](/de/reference/modules/melis-cms-news),
[melis-front](/de/reference/modules/melis-front),
[melis-engine](/de/reference/modules/melis-engine),
[melis-core](/de/reference/modules/melis-core)
