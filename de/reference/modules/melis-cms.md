# MelisCms

> Das CMS-Backoffice – Sites, Seitenbaum, Seiteneditor, Templates, Styles und SEO, ausgeliefert als React-Backoffice. Paket `melisplatform/melis-cms`.

## Zweck

`MelisCms` ist das Backoffice, in dem Sie Ihre Websites auf der Melis-Plattform erstellen und betreiben. Es
stellt den Seitenbaum der Site, den Seiteneditor (Reiter Edition, Properties, SEO, Languages), die
Drag-and-Drop-Plugin-Zonen zum Zusammenstellen von Inhalten sowie die Verwaltungswerkzeuge für Sites,
Templates, Styles, Sprachen, Plattform-IDs, Domains und Weiterleitungen bereit. Es **besitzt keine Datenbanktabellen** –
es liest und schreibt alles über [melis-engine](/legacy/reference/modules/melis-engine), und
das Rendering der Seiten (einschließlich der Live-Bearbeitungsvorschau) wird von
[melis-front](/legacy/reference/modules/melis-front) übernommen.

In Melis v6 bleibt die Geschäftslogik unverändert; die **Darstellungsschicht** ist ein **React-Backoffice**
(`/melis-react`). MelisCms liefert **ein Multi-Brick-Bundle** aus, das **neun Werkzeuge** bereitstellt: den Seiteneditor
(einen Sidebar-Host: Seitenbaum + Reiter-Editor) sowie **acht native React-Nebenwerkzeuge**. Der einzige Teil,
der noch die klassische Oberfläche verwendet, ist der **Edition**-Reiter des Seiteneditors, der in einem iframe geladen wird.

## Das Trio MelisCms / MelisFront / MelisEngine

Diese drei Module bilden ein eng gekoppeltes System; eine Frage zu einem betrifft in der Regel auch die anderen.

- **MelisEngine** – besitzt das gesamte CMS-Datenbankmodell (Seiten, Baum, Sites, Templates, Sprachen,
  SEO, Styles) und stellt es über Table-Gateways und Services bereit. Definiert `MelisTemplatingPlugin`,
  die Basisklasse, von der jeder Inhaltsblock erbt.
- **MelisFront** – die Rendering-Pipeline des Frontoffice; wandelt eine URL in eine fertige Seite um und treibt die
  live bearbeitbare Vorschau innerhalb des Backoffice an (`renderMode/melis`).
- **MelisCms** *(dieses Modul)* – die UI-Schicht des Backoffice; steuert den Seiten-Lebenszyklus, indem es Events
  auslöst, die von Listenern der Engine und des Front verarbeitet werden.

**Ladereihenfolge:** `melis-core` → `melis-front` → `melis-engine` → `melis-cms`.

## Aktivierung

Fügen Sie es zu `config/melis.module.load.php` hinzu:

```php
return [
    'MelisCms',
];
```

Erfordert `melisplatform/melis-core`, `melisplatform/melis-engine` und `melisplatform/melis-front`.
Es besitzt kein eigenes Installations-SQL; das CMS-Schema ist Teil von melis-engine. Bricks erscheinen im React-Backoffice
nur, wenn MelisCms aktiv ist (Discovery über `GET /melis/react-api/react-modules`).

## Das React-Backoffice – ein Bundle, neun Bricks

Das Bundle (`public/ui-react/brick.js` + `brick.manifest.json`) deklariert neun Bricks, die sich
in `brick.tsx` selbst registrieren. Alle sind vollständig nativ in React, mit Ausnahme des Edition-Reiters des Seiteneditors.

| Brick-ID | Route | melisKey | Art |
| --- | --- | --- | --- |
| `cms` | `/melis-cms/page` | `meliscms_page` | Seiteneditor (Sidebar-Host: Baum + Reiter-Editor) |
| `cms-sites` | `/melis-cms/sites` | `meliscms_tool_sites` | Nativ React (Liste + Editor + 5-Schritte-Assistent) |
| `cms-templates` | `/melis-cms/templates` | `meliscms_tool_templates` | Nativ React (Liste + Formular) |
| `cms-styles` | `/melis-cms/styles` | `meliscms_tool_styles` | Nativ React |
| `cms-languages` | `/melis-cms/languages` | `meliscms_tool_language` | Nativ React |
| `cms-platform-ids` | `/melis-cms/platform-ids` | `meliscms_tool_platform_ids` | Nativ React |
| `cms-site-301` | `/melis-cms/site-301` | `meliscms_tool_site_301` | Nativ React |
| `cms-mini-templates` | `/melis-cms/mini-templates` | `meliscms_mini_template_manager_tool` | Nativ React |
| `cms-menu-manager` | `/melis-cms/menu-manager` | `meliscms_mini_template_menu_manager_tool` | Nativ React |

Der `cms`-Brick ist besonders: Er registriert **sowohl** eine geroutete `Component` (den Reiter-Editor) **als auch**
eine `Sidebar` (den Seitenbaum), sodass der Baum in der linken Sidebar sichtbar bleibt, während Sie arbeiten. Jedes Neben-
werkzeug trägt einen **New / Old**-Umschalter – *New* ist die React-Oberfläche, *Old* ist das klassische Werkzeug in einem iframe
(`/melis/react-tool-page?key=<melisKey>`).

![Der Bereich MelisCms in der React-Sidebar – das Panel PAGE TREE und die Gruppe Site Tools](/screenshots/react/melis-cms/meliscms-menu-entry.png)

## Seitenbaum (linke Sidebar)

Der Seitenbaum ist die Karte Ihrer Sites und jeder darin enthaltenen Seite. Klicken Sie auf eine Seite, um sie als oberen
Reiter im Editor zu öffnen; die Suche findet noch nicht geladene Seiten und klappt den Baum bis zu ihnen auf; das
Kontextmenü eines Knotens (Rechtsklick) fügt eine untergeordnete Seite hinzu, zeigt Details an, dupliziert eine Seite oder einen
ganzen Zweig oder löscht sie. Verschieben Sie eine Seite per Drag-and-Drop (serverseitige Rechte entscheiden, was Sie verschieben dürfen).

![Der React-Seitenbaum – Sites und Seiten, mit Indikatoren für Entwurf, Sperre und Site-Wurzel](/screenshots/react/melis-cms/meliscms-menu-site-treeview.png)

Der Baum verwendet die Legacy-CMS-Endpunkte wieder (keine Backend-Änderung) über `cms-tree-api.ts`:

| Zweck | Endpunkt |
| --- | --- |
| Kinder eines Knotens (lazy) | `GET /melis/MelisCms/TreeSites/get-tree-pages-by-page-id?nodeId=<id>` (`-1` = Site-Wurzeln) |
| Seiten nach Name suchen | `POST /melis/MelisCms/Page/searchTreePages` |
| Verschieben / neu zuordnen | `GET /melis/MelisCms/Page/movePage` |
| Einen Baum duplizieren | `POST /melis/MelisCms/TreeSites/duplicateTreePage` |
| Eine Seite löschen | `GET /melis/MelisCms/Page/deletePage?idPage=<id>` |

Der Baum lauscht auf das Event `melis:cms-tree-refresh`, um sich zu aktualisieren und nach
Speichern/Veröffentlichen/Löschen eine Seite anzuzeigen.

## Seiteneditor

Öffnen Sie eine Seite aus dem Baum oder verwenden Sie den Deep-Link `/melis-cms/page/:idPage`. Der Editor hat einen **nativen React-
Rahmen** (Titel + Status, Aktionsschaltflächen, Reiterleiste) um den Reiterinhalt. Der Rahmen wird
aus einer serverseitig zusammengeführten Struktur aufgebaut (`GET /melis/react-api/cms-page/structure?idPage=<id>` →
`{ header, tabs[], buttons[] }`), sodass **andere Module Reiter und Schaltflächen durch serverseitiges Zusammenführen
der Konfiguration hinzufügen können**.

Zuerst die nativen Reiter, dann alle von anderen Modulen beigesteuerten: **Edition · Properties · SEO · Languages ·
Historic · Page Analytics · Scripts · Open Graph · Link Checker · Google Analytics · Versioning ·
Comments**. Aktionsschaltflächen: **New page · Duplicate · Erase draft · Delete page · See · Display ·
Save · Publish** (zzgl. eines Publish/Online-Statusschalters und modularer Schaltflächen wie Workflow).

### Reiter Properties (nativ React)

Legen Sie den **Namen** der Seite, den **Typ** (Page / Folder / Site…), das **Template** (Layout), die **Sprache** (nach der
Erstellung gesperrt), die **Menüanzeige**, den **Style** und die Taxonomie-Schlüsselwörter fest.

![Der React-Reiter Properties – Name, Typ, Template, Sprache, Menüanzeige, Style und Taxonomie](/screenshots/react/melis-cms/meliscms-page-tab-properties.png)

### Reiter Edition (klassisches Drag-and-Drop in einem iframe)

Der Edition-Reiter füllt die Seite: Er rendert live, und Sie **ziehen Inhaltsblöcke (Plugins)** in die
Zonen des Templates. Es ist der **klassische Editor, geladen in einem iframe** innerhalb des React-Rahmens
(`/melis/react-tool-page?key=meliscms_page&idPage=<id>`); Drag-and-Drop, Plugin-Menü, Mini-Template-
Manager und Rich-Text-Editoren sind dieselben wie im klassischen Backoffice. Ihr Inhalt wird
automatisch in die PHP-Session gespeichert und beim Speichern oder Veröffentlichen geschrieben.

![Der Edition-Reiter – die Live-Seite mit dem Drag-and-Drop-Overlay innerhalb des React-Editor-Rahmens](/screenshots/react/melis-cms/meliscms-page-tab-edition.png)

![Das Plugin-Panel – die Inhaltsblöcke, die Sie auf die Seite ziehen können; die Liste hängt von den aktiven Modulen der Site ab](/screenshots/react/melis-cms/meliscms-page-tab-edition-menu-templating-plugins.png)

![Layouts der Drag-and-Drop-Zonen – wählen Sie, wie eine Zone aufgeteilt wird, um Ihre Blöcke zu platzieren](/screenshots/react/melis-cms/meliscms-page-tab-edition-dragdropzone-layouts.png)

### Reiter SEO und Languages (nativ React)

Der **SEO**-Reiter enthält die sprechende URL, Meta-Titel/-Beschreibung, kanonische und Weiterleitungs-URLs. Der
**Languages**-Reiter verwaltet die Sprachversionen der Seite (jede mit eigenem Inhalt und SEO).

![Der React-Reiter SEO – URL, Meta-Titel/-Beschreibung und Weiterleitungsfelder](/screenshots/react/melis-cms/meliscms-page-tab-seo.png)

### Speichern vs. Veröffentlichen

- **Save** schreibt den Entwurf (Properties + SEO + das Edition-XML zusammen, eine Aktion).
- **See → Preview / See online** zeigt den Entwurf oder die Live-Seite.
- **Publish** macht den aktuellen Entwurf live; der Statusschalter veröffentlicht / hebt die Veröffentlichung auf.
- **Erase draft** verwirft den Entwurf und kehrt zur veröffentlichten Version zurück.

Save/Publish senden an die **Legacy**-Endpunkte mit den Legacy-Feldnamen:
`POST /melis/MelisCms/Page/savePage?idPage=` und `.../publishPage?idPage=` (zzgl. `unpublishPage`,
`clearSavedPage`, `deletePage`); das Edition-XML wird aus der PHP-Session gelesen.

## Nebenwerkzeuge

### Sites – Websites erstellen und verwalten

`/melis-cms/sites`. Jede Zeile ist eine vollständige Website (ID, Name, Modul, Sprachen). **+ New site** startet einen
**5-Schritte-Assistenten**: Multilingual → Languages → Domains → Module → Summary. Eine bestehende Site wird
über native React-Reiter verwaltet: **Properties · Module Loading · Domains · Languages · Site Config ·
Translations · Scripts**.

![Das React-Werkzeug Sites – Suche, Columns, Export, New/Old-Umschalter und + New site](/screenshots/react/melis-cms/meliscms-tool-sites-list.png)

![Site-Bearbeitung – Reiter Module Loading: Umschalter je Modul mit Drag-to-Reorder-Ladereihenfolge](/screenshots/react/melis-cms/meliscms-tool-sites-edit-tab-moduleloading.png)

![Site-Bearbeitung – Reiter Site Config: General sowie Schlüssel/Wert-Einstellungen je Sprache](/screenshots/react/melis-cms/meliscms-tool-sites-edit-tab-siteconfig.png)

### Templates – Seitenlayouts

`/melis-cms/templates`. Native Liste und natives Formular: Name / Type / Site sowie Layout / Controller /
Action (das `.phtml`-Layout, auf das das Template abgebildet wird).

![Die React-Liste Templates – KPI-Karten, Controller/Action, Layout und Site je Zeile](/screenshots/react/melis-cms/meliscms-tool-templatemanager-list.png)

### Styles – auf Seiten angewendetes CSS

`/melis-cms/styles`. Verwalten Sie CSS-Stylesheets (Name, CSS-Pfad/-Quelle, Site); weisen Sie einer Seite einen Style
über den Reiter Properties der Seite zu.

![Die React-Liste Styles – Status, Name, CSS-Pfad und Site je Zeile](/screenshots/react/melis-cms/meliscms-tool-stylemanager-list.png)

### Front-Office-Sprachen

`/melis-cms/languages`. Die Hauptliste der Locales, die die Plattform kennt (Locale + Name mit Flagge).

### Plattform-IDs – Seiten-ID-Bereiche je Umgebung

`/melis-cms/platform-ids`. Reserviert je Umgebung ein eigenes Band an Seiten- und Template-IDs, sodass IDs
beim Verschieben von Inhalten zwischen Dev / Staging / Produktion nie kollidieren.

![Die React-Liste Plattform-IDs – Seiten- und Template-ID-Bereiche je Plattform](/screenshots/react/melis-cms/meliscms-tool-platformids-list.png)

### 301-Weiterleitungen – alte Links funktionsfähig halten

`/melis-cms/site-301`. Wenn sich eine öffentliche URL ändert, fügen Sie eine Weiterleitung hinzu (alte URL → neue URL, je
Site eindeutig), damit die alte Adresse weiterhin aufgelöst wird.

![Die React-Liste 301-Weiterleitungen – alte URL zu neuer URL je Site](/screenshots/react/melis-cms/meliscms-tool-siteredirect-list.png)

### Mini-Templates & Menü-Manager

Mini-Templates (`/melis-cms/mini-templates`) sind vorgefertigte Inhaltsblöcke, die Redakteure mit einem Klick auf eine
Seite ziehen können; der Menü-Manager (`/melis-cms/menu-manager`) ordnet sie in Kategorien, damit sie
im Mini-Template-Manager des Seiteneditors leicht zu finden sind.

![Der React-Menü-Manager – ein per Drag umsortierbarer Baum aus Kategorien und ihren Mini-Templates](/screenshots/react/melis-cms/meliscms-tool-minitemplate-menu-manager.png)

## React-API-Endpunkte

Die Routen sind in `config/react-api.php` unter `/melis/react-api/…` deklariert; die Controller befinden sich in
`src/Controller/MelisReactApi*Controller.php`. Jede Aktion ist durch `CapabilityGuardTrait` abgesichert
(`denyUnlessAccess()` für `MelisCoreRights::canAccess(MELIS_KEY)`, dann `denyUnlessCan('<action>')`).
Der Vertrag ist überall `{ success, data }` bei Erfolg und `{ success:false, error }` bei Fehlern;
jeder Fetch sendet `X-Requested-With: XMLHttpRequest` mit Credentials.

| Controller | Guard (melisKey) | Basis | Aktionen |
| --- | --- | --- | --- |
| `MelisReactApiPageController` | `meliscms_page` | `/cms-page` | `structure`, `properties`, `seo`, `refs`, `languages`, `ancestors`, `save-properties`, `save-seo` |
| `MelisReactApiCmsSitesController` | `meliscms_tool_sites` | `/cms-sites` | `list`, `meta`, `get`, `config`, `modules`, `create` |
| `MelisReactApiSiteRedirectController` | `meliscms_tool_site_301` | `/site-redirects` | `list`, `stats`, `sites`, `get`, `save`, `delete` |
| `MelisReactApiTemplateController` | `meliscms_tool_templates` | `/templates` | `list`, `stats`, `sites`, `get`, `save`, `delete` |
| `MelisReactApiCmsLanguageController` | `meliscms_tool_language` | `/cms-languages` | `list`, `stats`, `get`, `save`, `delete` |
| `MelisReactApiCmsPlatformIdController` | `meliscms_tool_platform_ids` | `/cms-platform-ids` | `list`, `stats`, `get`, `save`, `delete` |
| `MelisReactApiCmsStyleController` | `meliscms_tool_styles` | `/cms-styles` | `list`, `stats`, `sites`, `get`, `save`, `delete` |
| `MelisReactApiCmsMiniTemplateController` | `meliscms_mini_template_manager_tool` | `/cms-mini-templates` | `list`, `stats`, `sites`, `item`, `save`, `delete` |
| `MelisReactApiCmsMenuManagerController` | `meliscms_mini_template_menu_manager_tool` | `/menu-manager` | `sites`, `languages`, `tree`, `saveTree`, `category`, `saveCategory`, `deleteCategory` |

```ts
// GET the styles list (keyset), then POST a 301 redirect
const r = await fetch('/melis/react-api/cms-styles?limit=25', {
  headers: { 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'include',
})
const { success, data } = await r.json()   // { success, data: { items, total, nextCursor } }

await fetch('/melis/react-api/site-redirects/save', {
  method: 'POST',
  headers: { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ id: null, siteId: 1, oldUrl: 'old', newUrl: 'new' }),
})
```

## Capabilities

Deklariert in `config/react.capabilities.php` unter `melisReactToolCapabilities`, verschlüsselt nach dem
rechtstragenden `melisKey` jedes Werkzeugs (`export` nur dort, wo das Werkzeug eine Export-Schaltfläche hat):

```php
'meliscms_tool_site_301'                    => ['list','create','edit','delete','export','test'],
'meliscms_tool_templates'                   => ['list','create','edit','delete','export'],
'meliscms_tool_styles'                      => ['list','create','edit','delete','export'],
'meliscms_tool_language'                    => ['list','create','edit','delete'],
'meliscms_tool_platform_ids'                => ['list','create','edit','delete','export'],
'meliscms_tool_sites'                       => ['list','create','edit','delete','export'],
'meliscms_mini_template_manager_tool'       => ['list','create','edit','delete','export'],
'meliscms_mini_template_menu_manager_tool'  => ['list','create','edit','delete'],
```

Der Seiteneditor ist unter `meliscms_page` als strukturierter Baum verschlüsselt, sodass seine Schaltflächen und Reiter jeweils
zu einer Capability werden:

```php
'meliscms_page' => [
  'actions' => ['create','save','clear','publish','status','delete','duplicate','view','display'],
  'tabs'    => ['edition','properties','seo','languages'],
],
```

Jedes beitragende Modul fügt **seine** Seitenreiter/-schaltflächen unter demselben `meliscms_page`-Schlüssel hinzu (Laminas-
Merge), und `CmsPage.tsx` filtert sie über `useCaps('meliscms_page').can(cap)`. Zwei verwandte Schlüssel in
derselben Datei legen die Rechte des Editors offen: `melisReactRightsTools` injiziert einen reinen Rechte-Knoten
`meliscms_page` („Page edition") in Users → Rights, und `melisReactSidebarHostSections` hält
den Bereich MelisCms sichtbar, sodass der Seitenbaum selbst für einen Benutzer mit nur Seitenrechten erreichbar ist.

## Modulare Erweiterungsnähte

Andere Module steuern Seiteneditor-Reiter und reiterübergreifende Speichervorgänge bei, ohne MelisCms zu berühren:

```ts
// Register a page-edit tab (link-check, Open Graph, GA, historic, script-editor…)
window.__melisRegisterPageTab(key, ({ idPage }) => <MyTab idPage={idPage} />)
// Register a cross-cutting save hook, run by the global Save/Publish
window.__melisRegisterPageSaveHook(key, async (idPage) => { /* persist my tab */ })
```

Serverseitig bleiben dieselben Erweiterungspunkte verfügbar:

- **`melis_cms_page_tabs_alter`** – Reiter im Seiteneditor hinzufügen oder entfernen.
- **`modify_page_properties_form_config`** – das Properties-Formular ändern, um benutzerdefinierte Felder hinzuzufügen.

## Wichtige Services

Auflösen mit `$sm->get('<alias>')`. Die Geschäftslogik bleibt serverseitig (Laminas-Services); React ist
Präsentation plus API-Aufrufe.

| Service-Alias | Rolle |
| --- | --- |
| `MelisCmsPageService` | Schreibt das Seitenmodell: `savePage()`, `savePagePublished()`, `savePageSaved()`, `savePageSeo()`, `savePageLang()`, `savePageStyle()`, `savePageTree()`, `saveProperties()`. |
| `MelisCmsSiteService` | Site-CRUD und Abfragen je Seite pro Site. |
| `MelisCmsPageGetterService` | `getPageContent($pageId)` – gibt das zwischengespeicherte gerenderte HTML einer Seite zurück. |
| `MelisCmsRights` | Berechtigungsprüfungen im Backoffice: `isAccessible()`, `isActionButtonActive()`. |
| `MelisCmsSitesDomainsService` | Domainverwaltung je Umgebung. |
| `MelisCmsSitesPropertiesService` | Site-weite Schlüssel/Wert-Einstellungen (Reiter Site Config). |
| `MelisCmsSiteModuleLoadService` | Modulladen je Site (Reiter Module Loading). |
| `MelisCmsMiniTemplateService` / `MelisCmsMiniTemplateGetterService` | Verwaltung der Mini-Template-Bibliothek und -Kategorien. |
| `MelisCmsPageExportService` / `MelisCmsPageImportService` | Export/Import eines Seitenbaums als Datei. |

## Datenbanktabellen

`MelisCms` besitzt keine Tabellen. Das CMS-Schema ist in melis-engine definiert und wird über dessen Gateways
und Services angesprochen. Fragen Sie die CMS-Tabellen niemals direkt ab – verwenden Sie die Engine-Gateways/-Services, damit
Caching und der Rest des Ökosystems konsistent bleiben.

## Events des Seiten-Lebenszyklus

Der Seiten-Lebenszyklus ist über 19 Listener implementiert, die in `Module.php::onBootstrap` verdrahtet sind. Diese
Events sind der primäre Erweiterungspunkt – hängen Sie sich an sie an, statt `MelisCmsPageService`
direkt aufzurufen, damit History, Caches und andere Module synchron bleiben.

| Aktion | Events |
| --- | --- |
| Entwurf speichern | `meliscms_page_save_start` / `_end` (+ `…savetree_*`, `…saveproperties_*`, `…saveedition_*`, `…saveseo_*`) |
| Veröffentlichen | `meliscms_page_publish_start` / `_end` |
| Veröffentlichung aufheben | `meliscms_page_unpublish_start` / `_end` |
| Löschen | `meliscms_page_delete_start` / `_end` (+ `…deleteseo_*`, `…delete_page_*`) |
| Verschieben | `meliscms_page_move_start` / `_end` |
| Duplizieren | `meliscms_page_duplicate_start` / `_end` |
| Plugin-Session | `meliscms_page_savesession_plugin_*`, `meliscms_page_removesession_plugin_*` |

```php
// React to a page being published — in Module.php::onBootstrap or a listener's attach()
$eventManager->getSharedManager()->attach(
    'MelisCms',
    'meliscms_page_publish_end',
    function (\Laminas\EventManager\EventInterface $e) {
        $idPage = $e->getParams()['idPage'] ?? null;
        // log, sync, clear a custom cache, notify…
    },
    50
);
```

## Einen neuen Inhaltsblock hinzufügen

Jeder Inhaltsblock erbt von `MelisTemplatingPlugin` (definiert in melis-engine). Implementieren Sie `front()`,
um auf der Live-Site zu rendern, und `back()`, um den Bearbeitungscontainer zu rendern, und registrieren Sie dann das Plugin. Die
Module News, Slider und Category2 sind Referenzimplementierungen.

## Dashboard-Widget

`MelisCmsPagesIndicatorsPlugin` zeigt die Anzahl der Sites und Seiten (veröffentlicht vs. nicht) auf dem
Dashboard des Backoffice an.

![Das Dashboard-Widget Indicators – Sites, Seiten sowie veröffentlichte vs. nicht veröffentlichte Seiten](/screenshots/react/melis-cms/meliscms-dashboardplugins-indicators.png)

## Wichtige Dateien

| Anliegen | Pfad |
| --- | --- |
| Modul-Bootstrap + Listener-Verdrahtung | `vendor/melisplatform/melis-cms/src/Module.php` |
| React-API-Routen + Controller | `vendor/melisplatform/melis-cms/config/react-api.php` |
| React-Capabilities | `vendor/melisplatform/melis-cms/config/react.capabilities.php` |
| Brick-Quellcode (alle 9 Werkzeuge) | `vendor/melisplatform/melis-cms/ui-react/src/` |
| Gebautes Bundle (committet) | `vendor/melisplatform/melis-cms/public/ui-react/brick.js` + `brick.manifest.json` |
| Page-Service | `vendor/melisplatform/melis-cms/src/Service/MelisCmsPageService.php` |
| Site-Service | `vendor/melisplatform/melis-cms/src/Service/MelisCmsSiteService.php` |
| Rights-Service | `vendor/melisplatform/melis-cms/src/Service/MelisCmsRightsService.php` |
| Alle Listener (19) | `vendor/melisplatform/melis-cms/src/Listener/` |
| Dashboard-Widget | `vendor/melisplatform/melis-cms/src/Controller/DashboardPlugins/MelisCmsPagesIndicatorsPlugin.php` |

## Siehe auch

- [melis-engine](/legacy/reference/modules/melis-engine) – besitzt das CMS-Datenmodell und alle Table-Gateways.
- [melis-front](/legacy/reference/modules/melis-front) – Frontoffice-Rendering und Live-Vorschau.
- [melis-core](/legacy/reference/modules/melis-core) – Authentifizierung, Rechte, Events und Basiskonfiguration.
