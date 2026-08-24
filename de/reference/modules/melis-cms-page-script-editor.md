# MelisCmsPageScriptEditor

> Fügen Sie benutzerdefiniertes `<script>`/`<style>`/HTML (Analytics, Tracking-Pixel, Widgets von
> Drittanbietern) in den `<head>` und `<body>` von Front-Office-Seiten ein – pro Seite und pro Site,
> ohne Vorlagen zu bearbeiten.
> Paket `melisplatform/melis-cms-page-script-editor`.

## Zweck

Mit MelisCmsPageScriptEditor können Sie rohes Markup hinzufügen, das automatisch in das gerenderte
HTML Ihrer Seiten eingefügt wird. Drei Einfügepositionen stehen zur Verfügung: **Head oben** (direkt
nach `<head>`), **Head unten** (unmittelbar vor `</head>`) und **Body unten** (unmittelbar vor
`</body>`). Skripte können auf eine gesamte Site oder auf eine einzelne Seite beschränkt werden; eine
Seite kann als **Ausnahme** markiert werden, um sich von den Site-weiten Skripten abzumelden.

Im v6-React-Back-Office wird das Modul als reiner **Beitrags-Baustein** ausgeliefert – es besitzt
kein eigenes Werkzeug im linken Menü. Stattdessen fügt es an **zwei Stellen einen Skripte-Tab**
hinzu: im **CMS-Seiteneditor** (Skripte pro Seite) und in der **Bearbeitung des Sites-Werkzeugs**
(Site-weite Skripte + Ausnahmen). Datenmodell, Service und Einfüge-Listener sind gegenüber v5
unverändert; nur die Back-Office-Oberfläche wurde nach React portiert.

## Aktivierung

Zu `config/melis.module.load.php` hinzufügen:

```php
return [
    'MelisCmsPageScriptEditor',
];
```

Erfordert `melis-core ^6.0` und `melis-cms ^6.0` (PHP `^8.3|^8.5`). Das Modul ist mit
`dbdeploy: true` gekennzeichnet, sodass seine Tabellen automatisch durch melis-dbdeploy erstellt
werden.

> **Aktivierung pro Site:** Das Einfügen wird für eine Site erst wirksam, sobald das Modul für diese
> Site unter MelisCms → Sites → Modulladung geladen ist. Skripte können bereits vorher im Back-Office
> bearbeitet werden, aber im Front-End wird nichts eingefügt, bis das Modul für die Site aktiviert
> ist.

## Back-Office in React

Es gibt **kein eigenes Werkzeug im linken Menü** – der Skripte-Tab befindet sich innerhalb von zwei
bestehenden Werkzeugen, die beide nativ in React umgesetzt sind. Beide Tabs erscheinen nur, wenn das
Modul aktiv ist (ermittelt über `GET /melis/react-api/react-modules`, danach wird das Bundle des
Bausteins beim Start vorgeladen).

| Oberfläche | Wo | Inhalt | Speichern |
| --- | --- | --- | --- |
| **Seiteneditor → Skripte-Tab** | MelisCms → eine **Seite** öffnen → *Scripts* | Drei Code-Editoren pro Seite (Head oben / Head unten / Body unten) für **ausschließlich diese Seite**. | Eigene Schaltfläche **Save scripts**. |
| **Sites-Werkzeug → Skripte-Tab** | MelisCms → **Sites** → eine Site öffnen → *Scripts* | Drei Site-weite Editoren + Liste **Current Exceptions** + **Add an exception** (Eingabe der Page-ID oder Auswahl über den Seitenbaum). | Wird über die globale Schaltfläche **Save** des Site-Editors gespeichert; das Hinzufügen/Entfernen von Ausnahmen wird sofort persistiert. |

![React-CMS-Seiteneditor, Skripte-Tab: die drei Code-Editoren pro Seite (Head oben / Head unten / Body unten) mit einer Save-scripts-Schaltfläche](/screenshots/react/melis-cms-page-script-editor/meliscmspagescripteditor-page-tab-scripts.png)

![React-Sites-Bearbeitung, Skripte-Tab: die drei Site-weiten Editoren, die Liste Current Exceptions und der Block Add an exception, gespeichert über die globale Save-Schaltfläche des Site-Editors](/screenshots/react/melis-cms-page-script-editor/meliscmspagescripteditor-tooloverride-sites-edit-tab-scripts.png)

Auf einer ausgelieferten Seite erhält jede Position **zuerst die Site-Skripte, dann die eigenen
Skripte der Seite** – es sei denn, die Seite ist eine Ausnahme, in welchem Fall nur ihre eigenen
Seiten-Skripte eingefügt werden.

Die **Tab-Komponente des Seiteneditors** befindet sich in MelisCms (`PageTabs.tsx`, Schlüssel
`meliscms_page_script_editor`); die **Site-Tab-Komponente** (`ScriptsTab.tsx`) befindet sich in
diesem Modul und registriert sich selbst über die generische Registry `window.__melisSiteTabs`
(Reihenfolge `55`). Dieses Modul besitzt die Endpunkte und die Berechtigung hinter beiden Tabs.

## Berechtigungen (erweiterte Rechte)

Der Seiten-Tab ist eine **Berechtigung des CMS-Seitenwerkzeugs**, deklariert in
`config/react.capabilities.php` unter dem gemeinsamen Knoten `meliscms_page`:

```php
return [
  'melisReactToolCapabilities' => [
    'meliscms_page' => [
      'tabs' => [
        ['key' => 'meliscms_page_script_editor', 'label' => 'tr_meliscmspagescripteditor_title'],
      ],
    ],
  ],
];
```

Ohne diese Deklaration verbirgt die Berechtigungs-Whitelist der CMS-Seite die Schaltfläche des
**Scripts**-Tabs im Seiteneditor – selbst für einen Administrator. Der Skripte-Tab des
**Sites-Werkzeugs** besitzt keine eigene Berechtigung: Er wird durch den Zugriff auf das
Sites-Werkzeug (`meliscms_tool_sites`) gesteuert.

## React-API

Zwei Controller, die diesem Modul gehören, beide delegieren an
`MelisCmsPageScriptEditorService`. Vertrag `{ success, data, error }`, mit
`X-Requested-With: XMLHttpRequest` und `credentials: 'include'`.

**Seiten-Tab** — `MelisReactApiPageScriptEditorController`, Routen in `config/react-api.php`.
Abgesichert durch Authentifizierung + `MelisCoreRights::canAccess('meliscms_page_script_editor')`:

| Methode & URL | Zweck |
| --- | --- |
| `GET /melis/react-api/cms-page/scripts?idPage=<id>` | Die Skripte einer Seite lesen → `{ idPage, headTop, headBottom, bodyBottom, editDate }`. |
| `POST /melis/react-api/cms-page/scripts/save` | Die Skripte einer Seite speichern (`{ idPage, headTop, headBottom, bodyBottom }`). |

**Site-Tab** — `MelisCmsPageScriptEditorReactController`, generische Route
`/melis/MelisCmsPageScriptEditor/:controller/:action` in `config/module.config.php`. Abgesichert
durch Authentifizierung + `MelisCoreRights::canAccess('meliscms_tool_sites')`:

| Methode & URL (relativ zu `.../MelisCmsPageScriptEditorReact`) | Zweck |
| --- | --- |
| `GET /site-script?siteId=<id>` | Site-Skripte + Anzahl der Ausnahmen → `{ siteId, script, exceptionCount }`. |
| `POST /save-site-script` | Site-Skripte speichern (alle leer ⇒ löscht den Eintrag). |
| `GET /exceptions?siteId=<id>` | Die Ausnahmen der Site → `{ items:[{id,pageId,pageName}], total }`. |
| `POST /add-exception` | Eine Ausnahme hinzufügen (`{ siteId, pageId }`; erzwingt dieselbe Site + keine Duplikate). |
| `POST /delete-exception` | Eine Ausnahme entfernen (`{ id }`). |

> **Sicherheitshinweis.** Die Seiten-Endpunkte fügen benutzerdefiniertes `<script>`/HTML in das
> **öffentliche** Rendering einer Seite ein, daher erfordern sowohl `get` als auch `save` das
> Werkzeugrecht für den Page-Script-Editor (nicht nur eine Sitzung), um zu verhindern, dass ein
> BO-Benutzer ohne Rechte persistentes XSS platziert. Schreibvorgänge verwenden parametrisiertes
> SQL direkt auf `melis_cms_scripts`.

## Wichtige Services

| Alias | Rolle |
| --- | --- |
| `MelisCmsPageScriptEditorService` | Die gesamte Geschäftslogik der Skripte: Speichern, Lesen, Zusammenführen und Einfügen von Skripten. Von beiden React-Controllern wiederverwendet. |
| `MelisCmsScriptTable` | Table-Gateway für `melis_cms_scripts`. |
| `MelisCmsScriptExceptionTable` | Table-Gateway für `melis_cms_scripts_exceptions`. |

`MelisCmsPageScriptEditorService` stellt bereit:

| Methode | Rolle |
| --- | --- |
| `addScript($siteId, $pageId, $headTop, $headBottom, $bodyBottom, $mcsId)` | Eine Skript-Zeile für eine Site oder Seite einfügen oder aktualisieren. |
| `addScriptException($siteId, $pageId)` | Eine Seite als von den Site-weiten Skripten ausgeschlossen markieren. |
| `getScriptExceptions($siteId, $sortCol, $sortOrder)` | Seiten auflisten, die sich von den Site-Skripten abmelden. |
| `getScriptsPerSite($siteId)` / `getScriptsPerPage($pageId)` | Die Skript-Zeile(n) für eine Site / Seite abrufen. |
| `getScriptsExceptionPerPage($pageId)` | Die Ausnahme-Zeile(n) für eine Seite abrufen. |
| `getMixedScriptsPerPage($pageId)` | Die endgültigen Skripte für eine Seite auflösen – Site + Seite zusammengeführt, oder nur Seite, wenn die Seite eine Ausnahme ist. Wird vom Front-Render-Listener verwendet. |
| `updatePageScripts($pageId, $html)` | Fügt die zusammengeführten Skripte in das gerenderte HTML ein (nach `<head>`, vor `</head>`, vor `</body>`). |
| `getSiteId($pageId)` | Die Site-ID für eine bestimmte Seite auflösen. |

## Front-Office

Das Einfügen erfolgt über einen MVC-Listener, nicht über ein Template-Plugin:

| Listener | Auslöser | Rolle |
| --- | --- | --- |
| `MelisCmsPageScriptEditorScriptTagListener` | Seiten-Rendering (Front) | Ruft `getMixedScriptsPerPage()` auf und fügt die aufgelösten Skripte ein: Head oben nach `<head>`, Head unten vor `</head>`, Body unten vor `</body>`. |

Speichern und Duplizieren bleiben ereignisgesteuert (`Module.php::onBootstrap`): Die Listener für
Seite-Speichern, Site-Skript-Speichern und Seite-Duplizieren persistieren die Skripte und die
Ausnahme zum Ausschluss der Site, wenn Seiten/Sites im Back-Office gespeichert oder dupliziert
werden. Der View-Helper `melisCmsPageScriptEditorAddScript`
(`src/View/Helper/MelisCmsPageScriptEditorAddScriptHelper.php`) bietet programmatischen Zugriff, um
eine Skript-Zeile über den Service zu speichern.

## Datenbanktabellen

| Tabelle | Enthält |
| --- | --- |
| `melis_cms_scripts` | Ein Skript-Satz pro Site oder pro Seite: `mcs_id`, `mcs_site_id`, `mcs_page_id`, `mcs_head_top`, `mcs_head_bottom`, `mcs_body_bottom`, `mcs_date_edition`, `mcs_user_id`. |
| `melis_cms_scripts_exceptions` | Seiten, die die Site-Skripte ignorieren: `mcse_id`, `mcse_site_id`, `mcse_page_id`, `mcse_date_creation`, `mcse_user_id`. |

## Beispiel

```php
$scripts = $this->getServiceManager()->get('MelisCmsPageScriptEditorService');

// Resolve the final scripts for a page (site + page merged, or page-only if exception)
$resolved = $scripts->getMixedScriptsPerPage($pageId);
// $resolved contains headTopScript, headBottomScript, bodyBottomScript

// Save scripts for a site or page
$scripts->addScript($siteId, $pageId, $headTop, $headBottom, $bodyBottom, $mcsId);

// Mark a page as an exception (it will no longer receive site-wide scripts)
$scripts->addScriptException($siteId, $pageId);

// List all pages that opted out of the site scripts
$exceptions = $scripts->getScriptExceptions($siteId, $sortCol, $sortOrder);
```

## Wichtige Dateien

| Bereich | Pfad |
| --- | --- |
| Modul-Bootstrap & Listener-Verdrahtung | `vendor/melisplatform/melis-cms-page-script-editor/src/Module.php` |
| Service- & Routen-Verdrahtung | `vendor/melisplatform/melis-cms-page-script-editor/config/module.config.php` |
| React-API-Routen des Seiten-Tabs | `vendor/melisplatform/melis-cms-page-script-editor/config/react-api.php` |
| Berechtigungsdeklaration des Seiten-Tabs | `vendor/melisplatform/melis-cms-page-script-editor/config/react.capabilities.php` |
| React-Controller (Seite / Site) | `vendor/melisplatform/melis-cms-page-script-editor/src/Controller/` |
| Site-Tab-Baustein (Vite IIFE) | `vendor/melisplatform/melis-cms-page-script-editor/ui-react/src/` (`brick.tsx`, `ScriptsTab.tsx`, `site-scripts-api.ts`) |
| Service | `vendor/melisplatform/melis-cms-page-script-editor/src/Service/MelisCmsPageScriptEditorService.php` |
| Front-Einfüge-Listener | `vendor/melisplatform/melis-cms-page-script-editor/src/Listener/MelisCmsPageScriptEditorScriptTagListener.php` |
| View-Helper | `vendor/melisplatform/melis-cms-page-script-editor/src/View/Helper/MelisCmsPageScriptEditorAddScriptHelper.php` |
| Table-Gateways | `vendor/melisplatform/melis-cms-page-script-editor/src/Model/Tables/` |
| Installations-SQL | `vendor/melisplatform/melis-cms-page-script-editor/install/dbdeploy/` |

Siehe auch: [Modulreferenz](/de/reference/modules) · [melis-cms](/de/reference/modules/melis-cms) ·
[melis-core](/de/reference/modules/melis-core)
