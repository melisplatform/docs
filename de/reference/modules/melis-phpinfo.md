# MelisPhpinfo

> Schreibgeschütztes Diagnosewerkzeug, das die native `phpinfo()`-Ausgabe von PHP im Melis-React-Backoffice darstellt. Paket `melisplatform/melis-phpinfo`.

## Zweck

MelisPhpinfo ist ein Dev-Tools-Modul mit einem einzigen Bildschirm, das die Ausgabe von `phpinfo()` erfasst und im Melis-Administrationsbereich anzeigt. Es ermöglicht einem Administrator, die PHP-Version des Servers, die geladenen Erweiterungen, die `php.ini`-Direktiven, die Umgebungsvariablen und die Pfade ohne Shell-Zugriff zu überprüfen. Es besitzt weder eine Datenbank noch eine Service- oder Model-Schicht — lediglich einen Controller und drei View-Zonen. In v6 wird es als **Iframe-Brick** im React-Backoffice ausgeliefert: Die React-Seite bindet ein persistentes Iframe ein, das das bestehende Legacy-Werkzeug innerhalb der React-Shell lädt. Es gibt weder eine React-API-Schicht noch eine Capabilities-Datei.

::: warning Sicherheitshinweis
`phpinfo()` legt sensible Details offen — absolute Pfade, geladene Module, Umgebungsvariablen (potenziell Zugangsdaten/API-Schlüssel) und Build-Flags. Das Werkzeug befindet sich bewusst unter **Dev Tools**; beschränken Sie es auf vertrauenswürdige Administratoren und schwärzen Sie Geheimnisse, bevor Sie einen Screenshot weitergeben.
:::

## Aktivierung

Fügen Sie Folgendes zu `config/melis.module.load.php` hinzu:

```php
return [
    'MelisPhpinfo',
];
```

Erfordert, dass `MelisCore` zuvor geladen wird. Der React-Brick erscheint nur, wenn das Modul aktiviert ist — die Brick-Erkennung (`GET /melis/react-api/react-modules`) listet aktive Module auf, die eine `brick.manifest.json` ausliefern; das Deaktivieren des Moduls entfernt den Menüknoten.

## Backoffice (React)

Das Werkzeug erscheint in der linken Seitenleiste unter **MelisCore → Dev Tools → PHP Info**. Es öffnet sich als oberer Tab mit dem Namen **PHP Info** und zeigt den vollständigen `phpinfo()`-Bericht, der an das Melis-Administrationsdesign angepasst ist; beim erstmaligen Laden des Iframes erscheint kurz ein Ladeindikator. Der Bericht kann lang sein, scrollen Sie daher innerhalb des Werkzeugbereichs, um zu einem bestimmten Abschnitt zu gelangen (Core, Erweiterungen, Pfade, Umgebung). Es gibt eine einzige Ansicht — keinen Neu/Alt-Umschalter — und nichts ist bearbeitbar.

## Brick-Aufbau

Die React-Präsenz ist ein **Iframe-Brick**: `PhpinfoPage.tsx` implementiert keine native React-Oberfläche. Es erstellt ein persistentes Iframe (`id="melis-brick-frame-phpinfo"`), dessen `src` auf `/melis/react-tool-page?key=melis_phpinfo_tool` verweist, hängt es einmalig an `<body>` an und positioniert/schaltet es anschließend bei Tab-Wechseln lediglich über ein Anker-`<div>`, sodass es niemals neu geladen wird. Das Iframe-Ziel — bereitgestellt von **MelisReactOverride** — rendert das klassische Legacy-PHP-Info-Werkzeug.

| Element | Wert |
| --- | --- |
| Brick-ID | `phpinfo` |
| Manifest `route` | `/melis-core/phpinfo` |
| `label` | `PHP Info` |
| `forwardKey` | `MelisPhpinfo/List` |
| `melisKey` (Iframe-Ziel) | `melis_phpinfo_tool` |
| `entry` | `brick.js` |
| React-API | keine (kein `config/react-api.php`) |
| Capabilities | keine (kein `config/react.capabilities.php`) — Zugriff über das Recht `melis_phpinfo_tool` gesteuert |

Manifest (`public/ui-react/brick.manifest.json`):

```json
{
  "id": "phpinfo",
  "route": "/melis-core/phpinfo",
  "label": "PHP Info",
  "forwardKey": "MelisPhpinfo/List",
  "melisKey": "melis_phpinfo_tool",
  "entry": "brick.js"
}
```

## Zugriff

Es gibt keine feingranularen Capabilities: Der Zugriff erfolgt nach dem Alles-oder-Nichts-Prinzip und ist an das Werkzeugrecht `melis_phpinfo_tool` gebunden. Das React-Menü gibt den Knoten nur aus, wenn der Benutzer `canAccess('melis_phpinfo_tool')` erfüllt (Super-Administratoren mit `usr_admin=1` oder Benutzer, denen das Recht gewährt wurde). Die Legacy-Content-Ansicht überprüft dasselbe Recht serverseitig erneut, bevor `phpinfo()` ausgeführt wird, sodass selbst eine manuell erstellte Anfrage an die Content-Zone bei anderen eine leere Antwort ergibt.

```php
// src/Controller/ListController.php — renderToolContentAction()
$view->accessAllowed = $this->isPhpinfoAccessAllowed(); // only then does the view run phpinfo()
// isPhpinfoAccessAllowed(): authenticated identity + MelisCoreRights::canAccess('melis_phpinfo_tool')
```

## View-Zonen

Das Legacy-Werkzeug (im Iframe geladen) besteht aus drei Zonen, die in v6 unverändert sind:

| Zonenbezeichner | Rolle |
| --- | --- |
| `melis_phpinfo_tool` | Container — leitet weiter an `MelisPhpinfo/List/render-tool` |
| `melis_phpinfo_header` | Titelleiste (`render-tool-header`) |
| `melis_phpinfo_content` | Der `phpinfo()`-Bericht (`render-tool-content`) |

## Implementierungsdetail

Die `phpinfo()`-Ausgabe wird vollständig in der View-Schicht erzeugt. Die Actions des Controllers geben ein leeres `ViewModel` zurück, ohne dass Daten von PHP an die View übergeben werden; die Berichts-View erfasst die Ausgabe und bereinigt sie:

```php
ob_start();
phpinfo();
$phpInfoContent = ob_get_clean();
// Strip phpinfo()'s own <style> so the page inherits Melis admin CSS
$filtredPhpInfoContent = preg_replace('/<style\b[^>]*>(.*?)<\/style>/is', '', $phpInfoContent);
echo $filtredPhpInfoContent;
```

Die Geschäftslogik verbleibt serverseitig: Der React-Brick ist lediglich das in die React-Shell eingebettete Legacy-PHP-Info-Werkzeug.

## Wichtige Dateien

| Aspekt | Pfad |
| --- | --- |
| Brick-Einstiegspunkt | `ui-react/src/brick.tsx` (registriert ID `phpinfo` → `PhpinfoPage`) |
| React-Seite (Iframe-Wrapper) | `ui-react/src/PhpinfoPage.tsx` |
| Kompiliertes Bundle / Manifest | `public/ui-react/brick.js` · `public/ui-react/brick.manifest.json` |
| Menü-/Zonenregistrierung | `config/app.toolstree.php` |
| Werkzeugkonfiguration | `config/app.tools.php` · `config/app.interface.php` |
| Route- + Controller-Registrierung | `config/module.config.php` |
| Controller (3 schlanke Actions, zugriffsgesteuert) | `src/Controller/ListController.php` |
| Berichts-View | `view/melis-phpinfo/list/render-tool-content.phtml` |

Siehe auch: [MelisCore](/de/reference/modules/melis-core)
