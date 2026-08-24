# MelisCmsSlider

> Backoffice-Manager für Slider / Karussells — jetzt ein natives React-Backoffice-Modul — mit einem Frontoffice-Templating-Plugin zur Anzeige von Slidern auf Seiten. Paket `melisplatform/melis-cms-slider`.

## Zweck

MelisCmsSlider stellt ein Backoffice-Werkzeug zum Erstellen von **Slidern** bereit (benannte Karussells aus geordneten Slides —
Bild, Titel, Untertitel, Link) sowie einen `MelisCmsSliderShowSliderPlugin`-Inhaltsblock, der einen
ausgewählten Slider auf jeder Frontoffice-Seite rendert. Außerdem liefert es ein wiederverwendbares **Slider-Auswahl**-Formularelement, das
andere Module (News, Blog) einbetten, um einen Slider an ein Inhaltselement anzuhängen.

In Melis v6 liefert das Werkzeug ein **natives Full-React-Modul** für das `/melis-react`-Backoffice, mit einem
**Neu / Alt**-Umschalter, der auf das klassische Werkzeug in einem iframe zurückfällt. Das Framework, die Dienste, die DB-Tabellen
und das Frontoffice-Plugin sind gegenüber v5 unverändert.

## Aktivierung

Fügen Sie zu `config/melis.module.load.php` hinzu:

```php
return [
    // …
    'MelisCmsSlider',
];
```

Voraussetzungen: `melis-core`, `melis-engine`, `melis-front`, `melis-cms`. Das Modul liefert
`dbdeploy: true`, sodass seine Tabellen durch melis-dbdeploy erstellt/aktualisiert werden. Das React-Modul ist
**aktivierungsgebunden**: Es erscheint im Backoffice nur, solange das Modul in
`melis.module.load.php` eingetragen ist (modulare Modulerkennung, siehe unten).

## React-Backoffice

**Wo:** linke Seitenleiste → Gruppe **MelisCms** → **Slider** (Baumroute `/melis-cms/slider`). Es öffnet sich
als oberer Tab mit dem Namen **Slider**. Ein **Neu / Alt**-Umschalter (oben rechts) wechselt zwischen der React-Oberfläche
(*Neu*, Standard) und dem Legacy-Werkzeug in einem iframe (*Alt*).

Das Werkzeug ist ein **dreistufiges Drilldown**, dargestellt als native Host-**Untertabs**: Liste der Slider → die
Slides eines Sliders → ein Slide-Formular.

![React-Sliderliste mit KPI-Karten, Suche, Spaltenmanager, Export und dem Neu/Alt-Umschalter](/screenshots/react/melis-cms-slider/meliscmsslider-tool-slider-list.png)

### Ebene 1 — die Liste der Slider

Listet jeden Slider auf der Plattform auf (Slider sind global; ein Slider kann optional mit einer Seite verknüpft werden).
Die Liste verfügt über **KPI-Karten** (Slider insgesamt, Slides insgesamt, aktive Slides), ein **Suchfeld**, einen
**Spalten**-Manager, eine **Export**-Schaltfläche und **Filter zurücksetzen**; klicken Sie auf eine Kopfzeile zum Sortieren. Jede Zeile
bietet **öffnen** (ihre Slides), **umbenennen** und **löschen**.

**+ Neuer Slider** öffnet ein Modal für den **Namen** und eine optionale **verknüpfte Seite**, ausgewählt aus dem
Seitenbaum der Website; dasselbe Modal benennt einen bestehenden Slider um.

![Modal für neuen Slider — Name plus optionale verknüpfte Seite aus dem Seitenbaum](/screenshots/react/melis-cms-slider/meliscmsslider-tool-slider-new.png)

### Ebene 2 — die Slides eines Sliders

Das Öffnen eines Sliders fügt einen Untertab (mit **← Zurück**) hinzu, der die Slides dieses Sliders zeigt: Reihenfolge, Status
(grün = aktiv), Bild-Thumbnail, Titel, Untertitel und Link. **Ziehen Sie eine Zeile, um die Reihenfolge zu ändern**; **+ Slide
hinzufügen** erstellt eine; bearbeiten/löschen pro Zeile.

![Die Slides eines Sliders — per Drag-and-drop sortierbare Liste mit Bearbeiten und Löschen pro Zeile](/screenshots/react/melis-cms-slider/meliscmsslider-tool-slider-edit-slidelist-tab-properties.png)

### Ebene 3 — Bearbeiten einer Slide

Das Bearbeiten (oder Hinzufügen) einer Slide öffnet einen verschachtelten Untertab mit einem React-Formular: **Titel**, **Untertitel 1**, zwei
**Beschreibung (HTML)**-Felder, **Link**, einen **Aktiv**-Umschalter und ein **Bild**-Panel (Vorschau,
**Bild auswählen** / **Bild entfernen**; JPG, PNG, GIF oder WebP). **Speichern** persistiert die Slide. Titel und
Untertitel 1 sind Klartext; die beiden Beschreibungsfelder sind reines HTML und werden auf `sub2`/`sub3` abgebildet.

![React-Slide-Formular — Titel, Untertitel, zwei HTML-Beschreibungen, Link, Aktiv-Umschalter und Bild-Panel](/screenshots/react/melis-cms-slider/meliscmsslider-tool-slider-edit-properties-slide-edit.png)

## React-API

Das Modul liest/schreibt über eine JSON-Schicht unter `/melis/react-api/sliders` (Routen in
`config/react-api.php`, Controller `MelisReactApiCmsSliderController`). Alle Antworten folgen dem
`{ success, data, error }`-Vertrag; jeder Fetch sendet `X-Requested-With: XMLHttpRequest` mit
`credentials: 'include'`.

| Methode & URL | Zweck |
| --- | --- |
| `GET /sliders` | Slider auflisten (Keyset: `limit`, `search`, `sort`, `dir`, `after`) mit `slideCount`. |
| `GET /sliders/stats` | KPI-Zählungen `{sliders, slides, active}`. |
| `GET /sliders/:id` | Ein Slider `{id, name, pageId, slideCount}`. |
| `POST /sliders/save` | Slider erstellen / umbenennen (`{id?, name, pageId?}`). |
| `DELETE /sliders/delete/:id` | Einen Slider, seine Slides und Bilddateien löschen. |
| `GET /sliders/:id/slides` | Die geordneten Slides eines Sliders. |
| `POST /sliders/slides/reorder` | Neu ordnen (`{sliderId, ids:[…]}`). |
| `POST /sliders/slide/upload` | Multipart-Bild-Upload (Feld `image`, `?sliderId=`) → `{path}`. |
| `GET /sliders/slide/:id` | Eine Slide. |
| `POST /sliders/slide/save` | Eine Slide erstellen / aktualisieren. |
| `DELETE /sliders/slide/delete/:id` | Eine Slide löschen, Reihenfolge neu sequenzieren, ihr Bild entfernen. |

Der Controller kommuniziert direkt mit den Tabellen über parametrisiertes SQL und reproduziert die Legacy-Geschäftsregeln
(Name erforderlich ≤255, Slide-Reihenfolge automatisch = max+1, Bilder unter `/media/sliders/<sliderId>/…` mit
Erweiterungen jpg/jpeg/gif/png/webp, Safe-URL-Prüfung des Links, kaskadierendes Löschen von Dateien). Der
übergeordnete `MelisCmsSliderService` liegt weiterhin dem Legacy-Werkzeug und dem Frontoffice-Plugin zugrunde.

## Berechtigungen

Erweiterte Rechte werden in `config/react.capabilities.php` unter dem rechtetragenden Knoten
`meliscms_slider_tools_section` deklariert und spiegeln die drei Ebenen wider. Abgeflachte Berechtigungs-Strings (z. B.
`list`, `create`, `rename`, `export`, `slides`, `slides.create`, `slides.image.create`) werden in
React über `MelisCan(melisKey, cap)` und serverseitig über `denyUnlessCan(cap)` geprüft. Jede Controller-Aktion
ist doppelt abgesichert — eine Zugriffsprüfung (`denyUnlessAccess()` → 401/403) und dann eine Berechtigungsprüfung;
der Berechtigungs-Resolver ist **standardmäßig erlaubend** für nicht deklarierte Berechtigungen.

## Host-Integration

| Aspekt | Wie |
| --- | --- |
| Erkennung / Gating | `GET /melis/react-api/react-modules` listet aktive Module auf, die eine `brick.manifest.json` liefern; der Host lädt `brick.js` und mountet das Modul. Das Entfernen des Moduls blendet das Werkzeug aus. |
| Menü → Route | `useNavMenu` bildet `forwardKey` `MelisCmsSlider/MelisCmsSliderList` auf `/melis-cms/slider` ab. |
| Untertabs | `subTabs: true` — das Modul steuert die native Untertab-Leiste des Hosts über `window.__melisOpenSubTab` / `__melisCloseSubTab` / `__melisUpdateSubTabLabel`; jeder Bildschirm bleibt gemountet (ausgeblendet), sodass der Zustand erhalten bleibt. |
| Neu / Alt-Umschalter | `window.__melisSetToolView(MELIS_KEY, mode)`; *Alt* rendert `/melis/react-tool-page?key=MelisCmsSlider_left_menu` in einem iframe. |
| i18n | Das Modul liest `document.documentElement.lang` und liefert ein integriertes `{fr, en}`-Wörterbuch. |

Modul-ID `slider` (entspricht `brick.tsx` ⇄ `brick.manifest.json`); das Bundle ist ein Vite-IIFE mit
auf die Host-Globals externalisiertem React, sodass die Oberfläche Inline-Styles und integrierte i18n verwendet, statt
Host-Module zu importieren.

## Zentrale Dienste

Diese betreiben weiterhin das Legacy-Werkzeug, die Microservices und das Frontoffice-Plugin.

| Alias | Rolle |
| --- | --- |
| `MelisCmsSliderService` | Geschäftslogik für Slider und Slides; löst `meliscmsslider_*`-Events aus. |
| `MelisCmsSliderTable` | Table-Gateway für `melis_cms_slider`. |
| `MelisCmsSliderDetailTable` | Table-Gateway für `melis_cms_slider_details`. |

`MelisCmsSliderService` erweitert `MelisGeneralService` und stellt bereit:

| Methode | Rolle |
| --- | --- |
| `getSlider($sliderId, $status)` | Ein Slider mit seinen Slides; übergeben Sie `1` für nur aktive Slides. |
| `getSliderByPageId($pageId, $status)` | Der mit einer Seiten-ID verknüpfte Slider samt seinen Slides. |
| `getSliderList($start, $limit, $order, $search)` | Paginierte/durchsuchbare Liste von Slidern. |
| `getSliderDetails($sliderDetailId)` | Eine einzelne Slide-Zeile. |
| `saveSlider($data, $sliderId)` | Einen Slider erstellen oder aktualisieren; gibt die Slider-ID zurück. |
| `saveSliderDetails($slideData, $detailId)` | Eine Slide erstellen oder aktualisieren. |
| `updateSliderDetailsOrdering($detailId, $newOrder)` | Eine Slide neu ordnen. |
| `deleteSlider($sliderId)` | Einen Slider und alle seine Slides löschen. |
| `deleteSliderDetails($sliderDetailId)` | Eine einzelne Slide löschen. |

`getSlider()` / `getSliderByPageId()` geben eine `MelisCmsSlider\Entity\MelisCmsSlider`-Entität zurück, deren
`getSlider()` die Container-Zeile und deren `getSliderDetails()` die Slides liefert.

**Hinweis zur Event-Benennung:** Jede Methode löst `meliscmsslider_service_*_start` / `_end`-Events aus, doch mehrere
Schreibmethoden verwenden im aktuellen Quellcode die Event-Namen einer anderen Methode wieder. `saveSlider` löst die
`get_slider_details`-Events aus, und `deleteSliderDetails` / `updateSliderDetailsOrdering` verwenden
die `delete_details`-Events von `deleteSlider` wieder — sodass ein Listener auf
`meliscmsslider_service_delete_details_end` auch bei Neuordnungen ausgelöst wird.

**Microservices** (`config/app.microservice.php`) stellen `getSliderList`, `getSlider`,
`getSliderDetails`, `getSliderByPageId` bereit.

## Frontoffice

Öffnen Sie im **React-Seiteneditor** (MelisCms → eine Seite öffnen → Edition) das Plugin-Panel und ziehen Sie den
**Show Slider**-Block auf die Seite; seine **Properties** lassen Sie das Rendering-Template und den
anzuzeigenden Slider auswählen.

![Show Slider-Block im Plugin-Auswahlbereich des React-Seiteneditors](/screenshots/react/melis-cms-slider/meliscmsslider-page-menu-plugins-selector.png)

![Show Slider-Plugin-Einstellungen — Template und anzuzeigenden Slider auswählen](/screenshots/react/melis-cms-slider/meliscmsslider-page-plugin-slider-config-properties-tab.png)

| Element | Rolle |
| --- | --- |
| `MelisCmsSliderShowSliderPlugin` (Controller-Plugin) | Ruft den konfigurierten Slider über `MelisCmsSliderService` ab und rendert ihn über das gewählte Template. Konfiguration: `config/plugins/MelisCmsSliderShowSliderPlugin.config.php` — ein **Properties**-Tab mit `template_path` und `sliderId`. Standard-Template: `view/melis-cms-slider/plugins/showslider.phtml`. |
| `MelisCmsSliderPlugin` (View-Helper) | `MelisCmsSliderHelper` — rendert das Plugin aus einem phtml-Template. |
| `CmsSliderSelect` (Formularelement) | Select, das mit verfügbaren Slidern befüllt wird; Factory `src/Form/Factory/CmsSliderSelectFactory.php`. Wird im Plugin-Optionsformular verwendet und von News / Blog eingebettet. |

**Wiederverwendbare Auswahl-Schnittstellen:** `meliscmsslider_select_slider` (`renderSelectSliderAction`) für News,
`meliscmsslider_select_slider_blog` für Blog.

**Konsumenten:** MelisCmsNews persistiert den gewählten Slider in `cnews_slider_id` und liefert einen Listener, der
einen gelöschten Slider von jeder News-Meldung löst, die ihn verwendet; Blog verwendet `cblog_slider_id`.

## Datenbanktabellen

| Tabelle | Enthält |
| --- | --- |
| `melis_cms_slider` | Ein Slider: `mcslide_id`, `mcslide_name`, `mcslide_page_id`, `mcslide_date`. |
| `melis_cms_slider_details` | Eine Slide: `mcsdetail_id`, FK `mcsdetail_mcslider_id`, `mcsdetail_status`, `mcsdetail_title`, `mcsdetail_sub1`–`sub3`, `mcsdetail_link`, `mcsdetail_img`, `mcsdetail_order`. |

## Beispiel

```php
$slider = $this->getServiceManager()->get('MelisCmsSliderService');

// Fetch one slider with active slides only
$one    = $slider->getSlider($sliderId, 1);

// Fetch the slider tied to a page
$byPage = $slider->getSliderByPageId($pageId, 1);

// Paginated list
$list   = $slider->getSliderList(0, 10, 'mcslide_id', null);

// Create / update
$id     = $slider->saveSlider($data, $sliderId);
$did    = $slider->saveSliderDetails($slideData, $detailId);

// Reorder
$slider->updateSliderDetailsOrdering($detailId, $newOrder);

// Delete slider + all its slides
$slider->deleteSlider($sliderId);
```

Auf ein Dienst-Event lauschen:

```php
$sharedEvents->attach(
    'MelisCmsSlider',
    'meliscmsslider_service_delete_details_end',
    $fn,
    50
);
```

## Zentrale Dateien

| Aspekt | Pfad |
| --- | --- |
| Modulverdrahtung | `vendor/melisplatform/melis-cms-slider/config/module.config.php` |
| React-API-Routen | `vendor/melisplatform/melis-cms-slider/config/react-api.php` |
| React-Berechtigungen | `vendor/melisplatform/melis-cms-slider/config/react.capabilities.php` |
| React-API-Controller | `vendor/melisplatform/melis-cms-slider/src/Controller/MelisReactApiCmsSliderController.php` |
| React-Modul | `vendor/melisplatform/melis-cms-slider/ui-react/src/` · `public/ui-react/brick.manifest.json` |
| Backoffice-Oberfläche / Werkzeuge | `vendor/melisplatform/melis-cms-slider/config/app.interface.php` · `app.tools.php` |
| Slide-Formular | `vendor/melisplatform/melis-cms-slider/config/app.forms.php` |
| Microservice-Konfiguration | `vendor/melisplatform/melis-cms-slider/config/app.microservice.php` |
| Templating-Plugin-Konfiguration | `vendor/melisplatform/melis-cms-slider/config/plugins/MelisCmsSliderShowSliderPlugin.config.php` |
| Dienst | `vendor/melisplatform/melis-cms-slider/src/Service/MelisCmsSliderService.php` |
| Entität | `vendor/melisplatform/melis-cms-slider/src/Entity/MelisCmsSlider.php` |
| Table-Gateways | `vendor/melisplatform/melis-cms-slider/src/Model/Tables/` |
| Slider-Auswahl-Factory | `vendor/melisplatform/melis-cms-slider/src/Form/Factory/CmsSliderSelectFactory.php` |
| View-Helper | `vendor/melisplatform/melis-cms-slider/src/View/Helper/MelisCmsSliderHelper.php` |
| Standard-Frontend-Template | `vendor/melisplatform/melis-cms-slider/view/melis-cms-slider/plugins/showslider.phtml` |

Siehe auch: [Modulreferenz](/de/reference/modules) · [Legacy-v5-Seite](/legacy/reference/modules/melis-cms-slider)
