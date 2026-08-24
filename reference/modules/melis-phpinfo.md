# MelisPhpinfo

> Read-only diagnostic tool that renders PHP's native `phpinfo()` inside the Melis React back office. Package `melisplatform/melis-phpinfo`.

## Purpose

MelisPhpinfo is a single-screen Dev Tools module that captures `phpinfo()` output and displays it in the Melis admin, letting an administrator inspect the server's PHP version, loaded extensions, `php.ini` directives, environment variables and paths without shell access. It has no database, service or model layer — only one controller and three view zones. In v6 it ships as an **iframe brick** in the React back-office: the React page mounts a persistent iframe that loads the existing legacy tool inside the React shell. There is no React API layer and no capabilities file.

::: warning Security note
`phpinfo()` exposes sensitive details — absolute paths, loaded modules, environment variables (potentially credentials/API keys) and build flags. The tool lives under **Dev Tools** intentionally; keep it restricted to trusted administrators and redact secrets before sharing any screenshot.
:::

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisPhpinfo',
];
```

Requires `MelisCore` to be loaded first. The React brick appears only if the module is activated — brick discovery (`GET /melis/react-api/react-modules`) lists active modules that ship a `brick.manifest.json`; deactivating the module removes the menu node.

## Back-office (React)

The tool appears in the left sidebar under **MelisCore → Dev Tools → PHP Info**. It opens as a top tab named **PHP Info** and shows the full `phpinfo()` report styled to fit the Melis admin; a brief spinner appears while the iframe loads the first time. The report can be long, so scroll within the tool area to reach a given section (Core, extensions, paths, environment). There is a single view — no New/Old toggle — and nothing is editable.

## Brick anatomy

The React presence is an **iframe brick**: `PhpinfoPage.tsx` implements no native React UI. It creates a persistent iframe (`id="melis-brick-frame-phpinfo"`) whose `src` is `/melis/react-tool-page?key=melis_phpinfo_tool`, appends it to `<body>` once, then only positions/toggles it over an anchor `<div>` on tab switches so it never reloads. The iframe target — served by **MelisReactOverride** — renders the classic legacy PHP Info tool.

| Item | Value |
| --- | --- |
| Brick id | `phpinfo` |
| Manifest `route` | `/melis-core/phpinfo` |
| `label` | `PHP Info` |
| `forwardKey` | `MelisPhpinfo/List` |
| `melisKey` (iframe target) | `melis_phpinfo_tool` |
| `entry` | `brick.js` |
| React API | none (no `config/react-api.php`) |
| Capabilities | none (no `config/react.capabilities.php`) — access-gated on the `melis_phpinfo_tool` right |

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

## Access

There are no fine-grained capabilities: access is all-or-nothing, gated on the `melis_phpinfo_tool` tool right. The React menu emits the node only if the user `canAccess('melis_phpinfo_tool')` (super-admins with `usr_admin=1`, or users granted the right). The legacy content view re-checks the same right server-side before running `phpinfo()`, so even a hand-crafted request to the content zone yields an empty response for others.

```php
// src/Controller/ListController.php — renderToolContentAction()
$view->accessAllowed = $this->isPhpinfoAccessAllowed(); // only then does the view run phpinfo()
// isPhpinfoAccessAllowed(): authenticated identity + MelisCoreRights::canAccess('melis_phpinfo_tool')
```

## View zones

The legacy tool (loaded in the iframe) is composed of three zones, unchanged in v6:

| Zone identifier | Role |
| --- | --- |
| `melis_phpinfo_tool` | Container — forwards to `MelisPhpinfo/List/render-tool` |
| `melis_phpinfo_header` | Title bar (`render-tool-header`) |
| `melis_phpinfo_content` | The `phpinfo()` report (`render-tool-content`) |

## Implementation detail

The `phpinfo()` output is produced entirely in the view layer. The controller's actions return an empty `ViewModel` with no data passed from PHP to the view; the report view captures and sanitises the output:

```php
ob_start();
phpinfo();
$phpInfoContent = ob_get_clean();
// Strip phpinfo()'s own <style> so the page inherits Melis admin CSS
$filtredPhpInfoContent = preg_replace('/<style\b[^>]*>(.*?)<\/style>/is', '', $phpInfoContent);
echo $filtredPhpInfoContent;
```

Business logic stays server-side: the React brick is only the legacy PHP Info tool embedded in the React shell.

## Key files

| Concern | Path |
| --- | --- |
| Brick entry point | `ui-react/src/brick.tsx` (registers id `phpinfo` → `PhpinfoPage`) |
| React page (iframe wrapper) | `ui-react/src/PhpinfoPage.tsx` |
| Built bundle / manifest | `public/ui-react/brick.js` · `public/ui-react/brick.manifest.json` |
| Menu / zone registration | `config/app.toolstree.php` |
| Tool config | `config/app.tools.php` · `config/app.interface.php` |
| Route + controller registration | `config/module.config.php` |
| Controller (3 thin actions, access-gated) | `src/Controller/ListController.php` |
| Report view | `view/melis-phpinfo/list/render-tool-content.phtml` |

See also: [MelisCore](/reference/modules/melis-core)
