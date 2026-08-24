# MelisAICommunityExtensions

> Bindet KI-Generierung in bestehende CMS-Bearbeitungsoberflächen ein — Mini-Template-Ersteller, News-Content-Ersteller und KI-Schaltflächen in Drag-and-Drop-Zonen. Im React-Backoffice wird ein Extension-Brick (Host-Injection) ausgeliefert, der keine eigene Seite besitzt. Paket `melisplatform/melis-ai-community-extensions`.

## Zweck

MelisAICommunityExtensions ist eine Anwendungsschicht auf der MelisAI-Suite, die KI-Generierung direkt in bestehende Bearbeitungsoberflächen einbindet. Sie registriert zwei vorkonfigurierte Instanzen (`minitemplatecreator` und `newscontentcreator`), einen MCP-Tool-Satz sowie eine Reihe von Event-Listenern, die den Lebenszyklus KI-generierter Frontend-Assets (CSS, JS, Bilder) verwalten. Sie besitzt **keinen eigenständigen Tool-Bildschirm**; stattdessen injiziert sie **Generate with AI**-Schaltflächen und Chat-Modals in den Mini-Template-Manager, den News-Editor und die Drag-and-Drop-Zonen von Seiten. Der KI-Chat selbst wird von MelisAI / MelisAIEngine bereitgestellt — dieses Modul liefert nur die umgebende Benutzeroberfläche und die Ein-/Ausstiegsverdrahtung.

## Aktivierung

In `config/melis.module.load.php` hinzufügen:

```php
return [
    'MelisAICommunityExtensions',
];
```

Erfordert `melisplatform/melis-ai`. Führen Sie nach der Aktivierung den dbdeploy aus — das Modul befüllt die Agent-/Instanz-Zeilen `minitemplatecreator` und `newscontentcreator` in den MelisAI-Engine-Tabellen (`dbdeploy: true`). Es integriert sich mit MelisCms und MelisCmsNews.

## Standort im React-Backoffice

Der React-Brick ist ein **Extension- / Host-Injection-Brick**: Er zeichnet keine Seite und fügt keinen Sidebar-Eintrag hinzu. Beim Laden registriert er **zwei Host-Extension-Points** auf `window`, die von den React-Seiten anderer Module aufgerufen werden, um die *Generate with AI*-Schaltfläche inline darzustellen, sowie ein dauerhaft eingehängtes `Header`-Widget (`MiniTemplateAiDialogHost`), das den Seitenbearbeitungsdialog über den Legacy-Bearbeitungsrahmen verankert.

Da er keine Route besitzt, gibt es kein Ziel zum Navigieren — Sie begegnen ihm *innerhalb anderer Tools*:

- **News-Editor** (MelisCmsNews) → Tab **Texts** → Schaltfläche pro Absatz.
- **Mini-Template-Manager** (MelisCms) → Feld *Template's HTML* → Schaltfläche.
- **Seitenbearbeitung** (MelisCms Drag-and-Drop) → Schaltfläche der Zone / des HTML-Tag-Plugins.

**Aktivierung durch zwei Module gesteuert.** Die Schaltflächen erscheinen nur, wenn **beide** Module `MelisAICommunityExtensions` und `MelisAI` aktiv sind (live geprüft über den Host-Aufruf `__melisIsModuleActive`, gestützt auf `GET /melis/react-api/react-modules`). MelisAI ist erforderlich, weil es den Chat bereitstellt; wird eines der beiden Module während der Sitzung deaktiviert, verschwinden die Schaltflächen ohne erneutes Laden. Der Brick trägt **keinen Capability-Knoten** bei — die Sichtbarkeit ergibt sich rein aus dieser Zwei-Modul-Prüfung.

## Bearbeitungsoberflächen im Backoffice

Drei Bearbeitungsoberflächen werden erweitert. In jeder öffnet eine KI-Schaltfläche einen kontextbezogenen Chat, und das Ergebnis wird in das korrekte Feld zurückgeschrieben.

### AI Mini-Template Creator

Im Mini-Template-Manager trägt das Feld *Template's HTML* eine **Generate with AI**-Schaltfläche, die vom Extension-Point `renderHtmlActions()` gerendert wird. Sie öffnet einen fensterfüllenden Dialog: **KI-Chat + Liste vorhandener Templates links, Live-Vorschau rechts** (die beiden Bereiche werden bei schmalen Breiten zu segmentierten Tabs *AI & Templates / Preview* zusammengeklappt). Der Chat verwendet die Instanz `minitemplatecreator`, startet bei jedem Öffnen neu (`clearSession`) und lädt bei jedem KI-Ergebnis die reale Site-Shell erneut, sodass frisch geschriebenes CSS/JS berücksichtigt wird.

![Der Mini-Template-Manager, Liste pro Site mit dem Einstiegspunkt Generate with AI](/screenshots/react/melis-ai-community-extensions/melisaicomext-tooloverride-minitplmanager-list.png)

![Der minitemplatecreator-Chat generiert ein Template, dargestellt gegen die reale Site-Shell](/screenshots/react/melis-ai-community-extensions/melisaicomext-tooloverride-minitplmanager-createwithai.png)

Jede Zeile in der Template-Liste zeigt ein **Melis-AI-Symbol**: Klicken Sie darauf, um ein neues Template mit diesem als Basisreferenz zu generieren (der Chat läuft erneut, vorbefüllt mit dem Markup des ausgewählten Templates). **Insert** erfasst ein PNG-Thumbnail der Vorschau (html2canvas) und füllt das Formular; das eigene Absenden des Formulars speichert es.

![Das Melis-AI-Symbol in einer Template-Zeile — ein vorhandenes Template mit KI variieren oder duplizieren](/screenshots/react/melis-ai-community-extensions/melisaicomext-tooloverride-minitplmanager-duplicatewithai.png)

![Das Formular Add mini-template — Generate with AI neben dem HTML-Feld](/screenshots/react/melis-ai-community-extensions/melisaicomext-tooloverride-minitplmanager-addminitpl.png)

### News Content Creator

Im Tab **Texts** des **News**-Editors erhält jeder **Paragraph** eine **Generate with AI**-Schaltfläche (pro Sprache), die vom Extension-Point `renderParagraphActions()` gerendert wird. Sie öffnet ein kompaktes Modal mit dem `newscontentcreator`-Chat, **auf den Artikel bezogen** (vorbefüllt mit dem Titel, dem Untertitel, den übrigen Absätzen und den Artikelbildern). Die Antwort ersetzt den Text dieses Absatzes und markiert ihn als validiert. Sitzungen werden pro Artikel über eine Instanz-ID `newscontentcreator|<newsId>` isoliert.

![Der News-Tab Texts — jede Absatz-Kopfleiste trägt die Aktion Generate with AI](/screenshots/react/melis-ai-community-extensions/melisaicomext-tooloverride-news-edit-tab-texts.png)

![Der newscontentcreator-Chat, der den Artikelkontext kennt](/screenshots/react/melis-ai-community-extensions/melisaicomext-tooloverride-news-edit-tab-texts-aicreator.png)

### Generate with AI in Drag-and-Drop-Zonen

Beim Bearbeiten einer CMS-Seite erhalten leere **Drag-and-Drop-Zonen** (und HTML-Tag-Plugins) eine injizierte **Generate with AI**-Schaltfläche. Da die Seitenbearbeitung ein Legacy-iframe unterhalb der React-Shell ist, fordert die Schaltfläche den React-Host auf, *denselben* Mini-Template-Dialog wie oben zu öffnen. Bei Bestätigung werden drei Commit-Optionen angeboten: **Close**, **Insert** (nur in diese Zone einfügen) oder **Save & Insert** (einfügen und den Block zusätzlich zu einem dauerhaften, wiederverwendbaren Mini-Template hochstufen).

![Eine leere Drag-and-Drop-Zone mit der injizierten Generate with AI-Schaltfläche](/screenshots/react/melis-ai-community-extensions/melisaicomext-pageoverride-dragdropzone-generateaibutton-1.png)

![Ein vollständig gestalteter Block, direkt in die Seitenzone generiert](/screenshots/react/melis-ai-community-extensions/melisaicomext-pageoverride-dragdropzone-generateaibutton-2.png)

![Die Commit-Auswahl Close / Insert / Save & Insert für einen generierten Block](/screenshots/react/melis-ai-community-extensions/melisaicomext-pageoverride-dragdropzone-generateaibutton-differentinserts.png)

## Der Brick

`ui-react/` ist eine Vite-IIFE-Bibliothek (Name `MelisAiCommunityExtensionsBrick`, Ausgabe `public/ui-react/brick.js`). React, react-dom und react-router-dom sind auf die Host-Globals ausgelagert; ein `@melis-ai-engine`-Alias importiert die geteilte Chat-Komponente `AiChatContainer`.

| Datei | Rolle |
| --- | --- |
| `src/brick.tsx` | Registriert die zwei Extension-Points + den `Header`; injiziert Tailwind einmalig. |
| `src/NewsAiExtension.tsx` | `renderParagraphActions()` → Schaltfläche pro Absatz + Modal (Instanz `newscontentcreator`). |
| `src/MiniTemplateAiExtension.tsx` | `renderHtmlActions()` → der fensterfüllende `MiniTemplateAiDialog` (Chat + Liste + Vorschau; Insert / Save & Insert; html2canvas-Thumbnail). |
| `src/MiniTemplateAiDialogHost.tsx` | Der `Header`-Anker für die **Seitenbearbeitung**; lauscht auf `melis-ai-minitemplate-open` und hängt den Dialog ein. |

Der Brick registriert sich **ohne `Component`** und **ohne `Sidebar`** — nur mit abgesicherten Extension-Points und dem `Header`-Anker:

```ts
window.__melisNewsExtensions.renderParagraphActions = /* guarded by isModuleActive() */
window.__melisMiniTemplateExtensions.renderHtmlActions = /* guarded by isModuleActive() */
window.__melisRegisterBrick?.({ id: 'melis-ai-community-extensions', Header: MiniTemplateAiDialogHost })
```

## Vom Brick aufgerufene Endpunkte

Der Brick besitzt **keine `config/react-api.php`**. Er nutzt Endpunkte anderer Module sowie eine eigene Legacy-MVC-Aktion:

| Aufruf | Eigentümer |
| --- | --- |
| `GET /melis/react-api/cms-mini-templates?site=<m>&limit=9999` | MelisCms (Template-Liste) |
| `GET /melis/react-api/cms-mini-templates/item?site=<m>&name=<n>` | MelisCms (HTML eines Templates) |
| `GET /melis/MelisAICommunityExtensions/MiniTemplate/getMiniTemplatePreviewShell?siteModule=<m>` | dieses Modul (Legacy-MVC; liefert das Site-Shell-HTML) |
| `AiChatContainer`-Run/Exit-Traffic | MelisAI / MelisAIEngine |

Die Chat-Antwort wird über einen `window`-Callback, der in den Exit-Parametern deklariert ist (`masse_exit_js_callback`), in das Host-Feld zurückgeleitet: `__melisNewsAiCallback_<paraIdx>` für News, `__melisMiniTemplateAiCallback` für Mini-Templates.

## Host-Integration (Brücke zur Seitenbearbeitung)

Die Seitenbearbeitung läuft mehrere Frames unterhalb der React-Shell, daher setzt `MiniTemplateAiDialogHost` `window.__melisAiMiniTemplateDialogReady = true` und lauscht auf ein `melis-ai-minitemplate-open`-Ereignis. Die bearbeitete Seite führt `public/js/minitemplate/react-bridge.js` aus, das die **Frame-Kette nach oben** nach `__melisAiMiniTemplateDialogReady` durchläuft; wird es gefunden, löst es das Open-Ereignis mit den Same-Origin-Callbacks `onInsert` / `onSaveInsert` aus. Wird kein React-Host gefunden (Legacy `/melis`), fällt die Brücke auf das historische Bootstrap-Modal zurück — dort ändert sich nichts.

Für Legacy-Tools, die in der React-Ansicht **„Old"** angezeigt werden, registriert `config/module.config.php` `melis_react_override.toolpage_extensions` → `PluginViewToolPageExtension`, das die `tool.js` / `style.css` dieses Moduls injiziert, damit die auf die MelisCms- / MelisCmsNews-Tools aufgepfropften jsCallbacks ihre Globals finden.

## Event-Listener

| Listener | Ereignis | Wirkung |
| --- | --- | --- |
| `…TinyMCEConfigurationListener` | `meliscore_tinymce_config` | Verweist das TinyMCE-Plugin `minitemplate` auf das JS dieses Moduls. |
| `…CreateMiniTemplateListener` | `meliscms_mini_template_manager_create_end` | Verschiebt temporäres CSS/JS/Bilder in den permanenten Speicher; benennt das Init-JS pro Template um. |
| `…PublishPageListener` | `meliscms_page_publish_start` | Stuft temporäre Assets hoch, auf die eine veröffentlichte Seite verweist; aktualisiert `page_content`. |
| `…SanitizeSavedPluginHtmlListener` | `meliscms_page_savesession_plugin_start` | Bereinigt Carousel-/Slider-Laufzeit-Markup (Owl-/Slick-/Swiper-Artefakte) vor dem Speichern. |
| `…DeleteMiniTemplateAssetsListener` | `meliscms_mini_template_manager_delete_end` | Löscht das CSS/JS/die Bilder des Templates. |
| `…AttachAIGeneratedCssListener` | `MvcEvent::EVENT_FINISH` (Front + Back) | Injiziert KI-CSS/JS in gerenderte Seiten. |
| `…InjectDndAiButtonListener` | `MvcEvent::EVENT_FINISH` | Injiziert die **Generate with AI**-Schaltfläche in Legacy-Drag-and-Drop-Zonen. |

Das Modul registriert außerdem ein `MelisPluginRendererOverride`, damit KI-Assets während des Plugin-Renderings korrekt injiziert werden.

## MCP-Server

Ein stdio-MCP-Server `minitemplate_creator` (Einstiegspunkt `mcp/minitemplatecreator/bin/server.php`) ist in `config['mcp']['servers']` registriert. Die folgenden Tools sind mit `mcp: true` deklariert:

| Tool | Parameter | Zweck |
| --- | --- | --- |
| `readSiteAssets` | `siteModule`, `templateRequest` | Liefert die relevanten CSS-/JS-/View-Dateien der Site, damit die KI das reale Design nachbildet. |
| `getSitePublicUrl` | `siteModule` | Liefert die öffentliche URL/Domain der Site zur visuellen Prüfung vor der Generierung. |
| `uploadMinitemplateImages` | `siteModule`, `image`, `filename` | Speichert ein Bild (base64/data-URL/HTTP) im KI-Temp-Verzeichnis und liefert einen Web-Pfad für `<img src>`. |
| `renderMinitemplatePreview` | `siteModule` | Löst die Editor-Vorschau des generierten Templates aus. |

Der `minitemplatecreator`-Agent verfügt zudem über die Dateisystem-Tools der Engine (`createFile` / `readFile` / `updateFiles` / …) in seiner Allow-List. Mitten im Gespräch registriert der React-Dialog `window.melisReactActionMap.preview_minitemplate`, sodass die Engine den generierten `html`-Block in die Live-Vorschau schieben kann, wenn `render_minitemplate_preview` zurückkehrt.

## Datenbanktabellen

Dieses Modul erstellt keine eigenen Tabellen. Seine dbdeploy-Deltas fügen Zeilen in Tabellen ein, die `melis-ai` gehören:

| Tabelle | Enthält |
| --- | --- |
| `melis_ai_instances` | Die befüllten Instanzen `minitemplatecreator` und `newscontentcreator`. |
| `melis_ai_agents` | Die befüllten Agenten für die zwei Instanzen. |

Zur Laufzeit wird auf News-Daten über `NewsTable` (`getNewsData($newsId)`) zugegriffen, das die Site-Tabelle joint, um das für die Platzierung generierter Bilder benötigte `siteModule` aufzulösen.

## Wichtige Dateien

| Bereich | Pfad |
| --- | --- |
| Modulkonfiguration (MVC-Route, toolpage_extensions) | `vendor/melisplatform/melis-ai-community-extensions/config/module.config.php` |
| Brick-Quellcode | `vendor/melisplatform/melis-ai-community-extensions/ui-react/src/` |
| Gebauter Brick | `vendor/melisplatform/melis-ai-community-extensions/public/ui-react/{brick.js, brick.manifest.json}` |
| Frame-Brücke der Seitenbearbeitung | `vendor/melisplatform/melis-ai-community-extensions/public/js/minitemplate/react-bridge.js` |
| MCP-Tools-Deklaration | `vendor/melisplatform/melis-ai-community-extensions/config/mcp.tools.php` |
| Mini-Template-Controller | `vendor/melisplatform/melis-ai-community-extensions/src/Controller/MiniTemplateController.php` |
| News-Controller | `vendor/melisplatform/melis-ai-community-extensions/src/Controller/NewsController.php` |
| „Old"-View-Injektor | `vendor/melisplatform/melis-ai-community-extensions/src/Controller/React/PluginViewToolPageExtension.php` |
| Listener | `vendor/melisplatform/melis-ai-community-extensions/src/Listener/` |
| Helper für Generate-with-AI-Schaltfläche | `vendor/melisplatform/melis-ai-community-extensions/src/View/Helper/MelisGenerateWithAIBtnHelper.php` |
| News-Table-Gateway | `vendor/melisplatform/melis-ai-community-extensions/src/Model/Tables/NewsTable.php` |
| MCP-Server-Einstiegspunkt | `vendor/melisplatform/melis-ai-community-extensions/mcp/minitemplatecreator/bin/server.php` |
| KI-Assets-Verzeichnis | `public/miniTemplatesTinyMce/AI/{siteModule}/{temp\|css\|js\|images}/` |
| Install-Deltas (Seed-Agenten) | `vendor/melisplatform/melis-ai-community-extensions/install/dbdeploy/` |

Siehe auch: [MelisAIEngine](/de/reference/modules/melis-ai-engine), [MelisAI](/de/reference/modules/melis-ai), [MelisAIToolCreator](/de/reference/modules/melis-ai-tool-creator), [MelisCms](/de/reference/modules/melis-cms), [MelisCmsNews](/de/reference/modules/melis-cms-news)
