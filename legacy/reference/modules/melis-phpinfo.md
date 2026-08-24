# MelisPhpinfo

> Diagnostic tool that renders PHP's native `phpinfo()` inside the Melis back office. Package `melisplatform/melis-phpinfo`.

## Purpose

MelisPhpinfo is a single-screen Dev Tools module that captures `phpinfo()` output and displays it in the Melis admin, allowing an administrator to inspect the server's PHP version, loaded extensions, and runtime configuration without shell access. It has no database, service, or model layer — only one controller and three view zones. The module depends solely on `melisplatform/melis-core` (`^5.1|^5.2`) for the back-office shell.

::: warning Security note
`phpinfo()` exposes sensitive details — absolute paths, loaded modules, environment variables, and build flags. The tool is placed under **Dev Tools** intentionally; keep it restricted to trusted administrators and redact secrets before sharing any screenshot.
:::

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisPhpinfo',
];
```

Requires `MelisCore` to be loaded first.

## Backoffice

The tool appears in the left menu under **MelisCore → Dev Tools → PHP Info** (Dev Tools section icon: `fa fa-code`; tool icon: `fa fa-puzzle-piece`). Opening it shows the standard `phpinfo()` report styled to fit the Melis admin. There is nothing to configure.

| Zone identifier | Role |
| --- | --- |
| `melis_phpinfo_tool` | Container — forwards to `MelisPhpinfo/List/render-tool` |
| `melis_phpinfo_header` | Title bar (`render-tool-header`) |
| `melis_phpinfo_content` | The `phpinfo()` report (`render-tool-content`) |

## Key files

| Concern | Path |
| --- | --- |
| Menu / zone registration | `vendor/melisplatform/melis-phpinfo/config/app.toolstree.php` |
| Tool name | `vendor/melisplatform/melis-phpinfo/config/app.interface.php` |
| Tool config | `vendor/melisplatform/melis-phpinfo/config/app.tools.php` |
| Route + controller registration | `vendor/melisplatform/melis-phpinfo/config/module.config.php` |
| Controller (3 thin actions) | `vendor/melisplatform/melis-phpinfo/src/Controller/ListController.php` |
| Module bootstrap | `vendor/melisplatform/melis-phpinfo/src/Module.php` |
| Container view | `vendor/melisplatform/melis-phpinfo/view/melis-phpinfo/list/render-tool.phtml` |
| Header view | `vendor/melisplatform/melis-phpinfo/view/melis-phpinfo/list/render-tool-header.phtml` |
| Report view | `vendor/melisplatform/melis-phpinfo/view/melis-phpinfo/list/render-tool-content.phtml` |

## Implementation detail

The actual `phpinfo()` output is produced entirely in the view layer. The controller's three actions (`renderToolAction`, `renderToolHeaderAction`, `renderToolContentAction`) each return an empty `ViewModel`; no data is passed from PHP to the view. The report view captures and sanitises the output:

```php
ob_start();
phpinfo();
$phpInfoContent = ob_get_clean();
// Strip phpinfo()'s own <style> so the page inherits Melis admin CSS
$filtredPhpInfoContent = preg_replace('/<style\b[^>]*>(.*?)<\/style>/is', '', $phpInfoContent);
echo $filtredPhpInfoContent;
```

`Module.php` is boilerplate (route listener, config/autoloader) with no custom listeners or events.

See also: [MelisCore](/legacy/reference/modules/melis-core)
