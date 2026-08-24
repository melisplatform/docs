# Eine Website erstellen (CMS)

Melis ist in erster Linie ein **CMS**. Diese Seite erläutert das Inhaltsmodell — **Sites**,
**Seiten**, **Templates** und **Plugins** — und wie eine Seite im Frontoffice gerendert wird. Es ist
das mentale Modell, das Sie benötigen, bevor Sie Templates bearbeiten oder ein Site-Modul erstellen.

::: tip v6 — React-Backoffice
Melis v6 behält das gleiche Framework, die gleichen Module und das gleiche hier beschriebene Datenmodell bei. Was sich geändert hat, ist die
**Backoffice-Oberfläche**: Sie läuft jetzt als **React-Anwendung unter `/melis-react`**. Das CMS wird als
native React-„Brick"-Werkzeuge ausgeliefert — eine **Seitenbaum-Seitenleiste** sowie ein **Seiten-Editor mit Registerkarten** und eine Reihe von
Nebenwerkzeugen (Sites, Templates, Styles, Sprachen…). Die einzige Ausnahme ist die Registerkarte **Edition** der Seite,
die weiterhin den klassischen Drag-and-Drop-Editor **in einem iframe** lädt. Jedes Nebenwerkzeug verfügt über einen
**New / Old**-Umschalter, sodass Sie bei Bedarf zum klassischen Werkzeug wechseln können. Die nachstehenden Konzepte sind
unverändert; nur *wo Sie klicken* ist neu.
:::

## Das Inhaltsmodell

| Konzept      | Was es ist | Haupttabelle(n) |
| ------------ | ---------- | ------------- |
| **Site**     | Eine Website. Hat eine Startseite, Sprachen und eine oder mehrere Domains pro Umgebung. | `melis_cms_site`, `melis_cms_site_domain` |
| **Seite**    | Ein Knoten im Seitenbaum der Site. Hat einen Typ (Site/Ordner/Seite), ein Template und Inhalt. | `melis_cms_page_tree`, `melis_cms_page_published`, `melis_cms_page_saved` |
| **Template** | Das Layout, das eine Seite verwendet — es verweist auf einen Controller/eine Action/eine View eines Site-Moduls. | `melis_cms_template` |
| **SEO**      | URL-Slug und Meta-Tags pro Seite. | `melis_cms_page_seo` |
| **Sprache**  | Eine Seite kann miteinander verknüpfte Übersetzungen haben. | `melis_cms_lang`, `melis_cms_page_lang` |

Diese Tabellen gehören zu **MelisEngine**, der CMS-Engine — der einzigen Quelle der Wahrheit für das
Seiten-/Site-Modell. Das React-Backoffice liest und schreibt sie ausschließlich über die Services und
Table-Gateways der Engine; es greift niemals direkt auf das Schema zu. Siehe
[MelisEngine](/de/reference/modules/melis-engine).

### Seiten sind versioniert

Jede Seite existiert in zwei Versionen:

- **Gespeichert** (`melis_cms_page_saved`) — der Arbeitsentwurf, den Sie im Backoffice bearbeiten.
- **Veröffentlicht** (`melis_cms_page_published`) — die Live-Version, die im Frontoffice ausgeliefert wird.

Sie bearbeiten den Entwurf und **veröffentlichen** ihn dann, wenn er fertig ist. Der bearbeitbare Inhalt der Seite (siehe *Zonen* und
*Plugins* weiter unten) wird im Seitendatensatz gespeichert.

## Templates

Ein **Template** (`melis_cms_template`) ist die Brücke zwischen einer Seite und dem Code, der sie rendert.
Für den gängigen Template-Typ `ZF2` speichert es:

- `tpl_zf2_website_folder` — das **Site-Modul** (z. B. `MelisDemoCms`),
- `tpl_zf2_controller`, `tpl_zf2_action` — welcher Controller/welche Action die Seite rendert,
- `tpl_zf2_layout` — das Layout, in das sie eingebettet wird.

Eine Seite → verweist also auf ein Template → das zu einer `.phtml`-View innerhalb eines Site-Moduls routet.

Im React-Backoffice verwalten Sie Templates im Nebenwerkzeug **Templates** (§ *Eine neue
Site erstellen*) — eine native React-Liste und ein Formular für Name, Typ, Site, Layout, Controller und Action.

## Bearbeitbarer Inhalt: Zonen & Plugins

Templates stellen über **View-Helper** zwei Arten von bearbeitbaren Bereichen bereit:

### `MelisTag` — einfache bearbeitbare Zonen

Eine benannte HTML-/Text-/Medienzone, die ein Redakteur im Backoffice direkt inline (TinyMCE) bearbeitet:

```php
<?= $this->MelisTag($this->idPage, 'home-html-1', 'html', '<h1>Default heading</h1>') ?>
```

Der Standardinhalt wird angezeigt, bis ein Redakteur ihn überschreibt; der gespeicherte Wert wird auf der Seite hinterlegt.
Helper: `vendor/melisplatform/melis-front/src/View/Helper/MelisTagsHelper.php`.

### `MelisDragDropZone` — Templating-Plugins

Eine Ablagezone, in die Redakteure **Templating-Plugins** ziehen — wiederverwendbare Inhaltsblöcke (ein Slider, eine
Nachrichtenliste, ein Kontaktformular):

```php
<?= $this->MelisDragDropZone($this->idPage, 'dragdropzone_home_1') ?>
```

Helper: `vendor/melisplatform/melis-front/src/View/Helper/MelisDragDropZoneHelper.php`.

Ein Templating-Plugin erweitert `MelisEngine\Controller\Plugin\MelisTemplatingPlugin` und implementiert:

- **`front()`** — gibt die Daten/View zurück, die auf der Live-Site gerendert werden,
- **`back()`** — das Konfigurationsformular, das im Backoffice-Editor angezeigt wird.

`MelisCmsSlider` und `MelisCmsNews` sind gute Referenz-Plugins; verwenden Sie **MelisTemplatingPluginCreator**,
um Ihr eigenes zu gerüsten. Redakteure legen diese Blöcke in der Registerkarte **Edition** des Seiten-Editors ab — siehe unten.

## Wie eine Seite im Frontoffice gerendert wird

Das Frontoffice wird von **MelisFront** (der Engine, die Sites anzeigt) auf Basis von
**MelisEngine** (Seiten-/Datenservices) ausgeliefert. Dieses Rendering erfolgt vollständig serverseitig und ist in v6 unverändert —
das React-Backoffice *hostet* lediglich die bearbeitbare Vorschau, es rendert die Seite nicht erneut im
Browser. Grob gesagt:

1. Der vhost setzt **`MELIS_MODULE`** → wählt das **Site-Modul**, das ausgeliefert werden soll.
2. Eine URL wie `…/id/5` wird zu **Seiten-ID 5** aufgelöst (Route in
   `vendor/melisplatform/melis-front/config/module.config.php`). SEO-URLs werden ebenfalls auf Seiten-IDs abgebildet.
3. **MelisEngine** lädt die Seite + ihr Template
   (`vendor/melisplatform/melis-engine/src/Service/MelisPageService.php`).
4. Der `ZF2`-Controller/die Action des Templates rendert die `.phtml`-View des Site-Moduls.
5. `MelisTag`-Zonen und `MelisDragDropZone`-Plugins werden aus dem veröffentlichten Inhalt der Seite befüllt.
6. Das Ergebnis wird in das Site-Layout eingebettet.

::: tip Bearbeitungs-/Vorschaumodi
Dieselbe Seite kann in verschiedenen Modi angefordert werden: `…/id/5` (live), `…/id/5/preview` (gespeicherter
Entwurf), `…/id/5/renderMode/melis` (Bearbeitung im Backoffice — das ist es, was der Edition-iframe anzeigt).
:::

## Aufbau eines Site-Moduls

Ein **Site-Modul** ist ein normales Laminas-Modul, das die Templates, Views und Assets einer Website enthält.
Die Referenz ist `vendor/melisplatform/melis-demo-cms/` (siehe
[MelisDemoCms](/de/reference/modules/melis-demo-cms)); benutzerdefinierte Sites liegen üblicherweise unter
`module/MelisSites/<YourSite>/`:

```
MelisDemoCms/
├── config/
│   ├── module.load.php           # modules this site needs (MelisEngine, MelisFront, plugins…)
│   ├── module.config.php         # routes / controllers / services
│   ├── assets.config.php         # front-office CSS & JS
│   └── melis.plugins.config.php  # templating plugins available to templates
├── src/Controller/               # Home, Contact… (render the template views)
├── view/
│   ├── layout/                   # site layouts
│   └── melis-demo-cms/home/index.phtml   # a page template (uses MelisTag / MelisDragDropZone)
└── public/                       # css / js / images
```

## Arbeiten im React-Backoffice

In v6 erstellen Sie Sites über das **React-Backoffice** unter `/melis-react`. Öffnen Sie den Abschnitt **MelisCms**
in der linken Seitenleiste: Er zeigt das Panel **Seitenbaum** (Ihre Sites und deren Seiten) sowie eine
Gruppe **Site Tools**.

![Der Abschnitt MelisCms in der React-Seitenleiste — Seitenbaum plus Site Tools.](/screenshots/react/melis-cms/meliscms-menu-entry.png)

### Der Seitenbaum

Der Seitenbaum ist die Übersicht Ihrer Sites und aller darin enthaltenen Seiten. Er befindet sich in der **linken Seitenleiste**,
sodass er sichtbar bleibt, während Sie arbeiten. Klicken Sie auf eine Seite, um sie im Editor zu öffnen; geben Sie einen Namen ein, um zu suchen;
klicken Sie mit der rechten Maustaste auf einen Knoten, um eine untergeordnete Seite hinzuzufügen, Details anzuzeigen, zu duplizieren, zu verschieben oder zu löschen. Sie können eine
Seite auch per Drag-and-Drop verschieben (serverseitige Rechte entscheiden, was Sie verschieben dürfen).

![Der React-Seitenbaum — Sites und Seiten; klicken zum Öffnen, Rechtsklick für Aktionen.](/screenshots/react/melis-cms/meliscms-menu-site-treeview.png)

### Der Seiten-Editor — Inhalt auf eine Seite bringen

Beim Öffnen einer Seite wird der Editor angezeigt: eine **native React-Chrome** (Seitentitel + Status, Aktionsschaltflächen,
Registerkartenleiste) um den Inhalt der aktuellen Registerkarte. Die Registerkarten sind **Properties · Edition · SEO · Languages**
(plus Registerkarten, die von anderen Modulen beigesteuert werden — Historic, Analytics, Scripts…). Zu den Aktionsschaltflächen gehören
**Save**, **Publish**, **See** (Preview / See online), **Duplicate**, **Erase draft** und **Delete**.

- **Properties** *(native React)* — der Seitenname, Typ (Page / Folder / Site), Template (Layout),
  Sprache, Menüanzeige, Style und Taxonomie.

  ![Die React-Registerkarte Properties.](/screenshots/react/melis-cms/meliscms-page-tab-properties.png)

- **Edition** *(klassischer Editor in einem iframe)* — die Seite befüllen. Sie wird live gerendert, und Sie **ziehen
  Inhaltsblöcke (Plugins)** in die Zonen des Templates (die `MelisDragDropZone`-Bereiche). Diese Registerkarte ist
  der klassische Drag-and-Drop-Editor, der innerhalb der React-Chrome geladen wird, sodass das Plugin-Panel, die Ablagezonen-
  Layouts und die Rich-Text-Editoren genau wie zuvor sind.

  ![Die Registerkarte Edition — Live-Seite mit dem Drag-and-Drop-Overlay, innerhalb der React-Chrome.](/screenshots/react/melis-cms/meliscms-page-tab-edition.png)

  ![Das Plugin-Panel — die Inhaltsblöcke, die Sie auf die Seite ziehen können.](/screenshots/react/melis-cms/meliscms-page-tab-edition-menu-templating-plugins.png)

- **SEO** *(native React)* — die benutzerfreundliche URL, Meta-Titel/-Beschreibung und Weiterleitungsfelder.
- **Languages** *(native React)* — die Sprachversionen der Seite erstellen und verwalten.

**Save vs. Publish.** *Save* schreibt den Entwurf (Properties + SEO + der Drag-and-Drop-Inhalt, alles in einer
Aktion); *See → Preview* zeigt den Entwurf; *Publish* macht den aktuellen Entwurf live; *Erase draft*
setzt auf die veröffentlichte Version zurück. Faustregel: frei bearbeiten, unterwegs **Save** verwenden, mit **Preview**
prüfen und dann **Publish**.

### Die Standard-Inhaltsblöcke

Die Blöcke, die Sie in der Registerkarte Edition auf die Seite ziehen, stammen aus **MelisFront**. Die häufigsten:
ein **HTML (Text)**-Block und ein **Media**-Block (beide werden **direkt vor Ort** bearbeitet), plus Konfigurationsblöcke, die
über ein kleines **Properties**-Modal eingerichtet werden — **Menu**, **Breadcrumb**, **List-from-folder** und das
**GDPR banner**. Den vollständigen Katalog finden Sie unter [MelisFront](/de/reference/modules/melis-front).

![Ein HTML (Text)-Block, der direkt vor Ort bearbeitet wird, mit der WYSIWYG-Symbolleiste auf der Seite.](/screenshots/react/melis-front/melisfront-page-plugin-html-tag.png)

## Eine neue Site erstellen (Überblick)

Auf höherer Ebene:

1. **Erstellen Sie die Site** im Backoffice — Seitenleiste → **Site Tools → Sites → + New site**, dann der
   **5-stufige Assistent** (Multilingual → Languages → Domains → Module → Summary), der die Site
   und ihre Startseite erstellt.

   ![Das React-Werkzeug Sites — jede Zeile ist eine komplette Website, mit „+ New site".](/screenshots/react/melis-cms/meliscms-tool-sites-list.png)

2. **Stellen Sie ein Site-Modul bereit** unter `module/MelisSites/<YourSite>/` (Controller + `.phtml`-
   Templates + Assets).
3. **Deklarieren Sie Templates** (`melis_cms_template`), die auf den Controller/die Action Ihres Moduls verweisen — Site
   Tools → **Templates**.
4. **Bauen Sie den Seitenbaum** auf und weisen Sie Templates zu; fügen Sie `MelisTag`/`MelisDragDropZone` zu Ihren Views hinzu.
5. **Richten Sie einen vhost** auf `public/` aus mit `SetEnv MELIS_MODULE "<YourSite>"` (siehe
   [Installation](/de/guide/getting-started)).
6. **Veröffentlichen** Sie und rufen Sie das Frontoffice auf.

Sobald eine Site existiert, öffnen Sie sie über das Werkzeug Sites, um sie über native React-Registerkarten zu verwalten: **Properties
· Module Loading · Domains · Languages · Site Config · Translations · Scripts**. Auf der Registerkarte **Module
Loading** aktivieren Sie eine Funktion für eine bestimmte Site (mit Ladereihenfolge per Drag-and-Drop).

> Beginnen Sie damit, `vendor/melisplatform/melis-demo-cms/` von Anfang bis Ende zu lesen — es ist das kanonische,
> funktionierende Beispiel für jedes Konzept auf dieser Seite.

## Wichtige Dateien

| Bereich | Pfad |
| --- | --- |
| CMS-Services (Seiten/Sites) | `vendor/melisplatform/melis-cms/src/Service/` |
| React-CMS-Bricks (Seiten-Editor + Nebenwerkzeuge) | `vendor/melisplatform/melis-cms/ui-react/src/` |
| Seiten-Service (Engine) | `vendor/melisplatform/melis-engine/src/Service/MelisPageService.php` |
| Front-Rendering | `vendor/melisplatform/melis-front/` |
| Helper für bearbeitbare Zonen | `vendor/melisplatform/melis-front/src/View/Helper/` |
| Basisklasse für Templating-Plugins | `vendor/melisplatform/melis-engine/src/Controller/Plugin/MelisTemplatingPlugin.php` |
| Referenz-Demo-Site | `vendor/melisplatform/melis-demo-cms/` |

> Die React-Module, die die Oberfläche besitzen — [MelisCms](/de/reference/modules/melis-cms),
> [MelisFront](/de/reference/modules/melis-front) und [MelisEngine](/de/reference/modules/melis-engine) —
> dokumentieren die Werkzeuge, Plugins und das Datenmodell vollständig.
