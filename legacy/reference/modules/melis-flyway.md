# MelisFlyway

> Thin back-office viewer that embeds an external Flyway page in an `<iframe>` under Dev Tools. Package `melisplatform/melis-flyway`.

## Purpose

MelisFlyway is a single-screen Dev Tools module that reads a URL from the platform config key `flyway` and renders it in an `<iframe>` inside the Melis admin. It does not run database migrations itself — it is a viewer only. The module depends solely on `melisplatform/melis-core` (`^5.1|^5.2`).

::: warning The `flyway` key must be a URL
Despite the README wording ("path to the Flyway executable"), the controller assigns `config['flyway']` directly to the iframe's `src`. Set it to a **URL** (e.g. a Flyway web report or a reverse-proxied Flyway page), not a CLI path. If the key is absent, the iframe `src` is empty.
:::

::: info Scaffolding in the source
`MelisFlywayService` and the `config/app.microservice.php` endpoints are unwired boilerplate — they reference a `FlywayTable` that does not exist and are never called. There is no Flyway CRUD or migration API in this module; the only working behaviour is the iframe.
:::

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisFlyway',
];
```

Requires `MelisCore` to be loaded first.

## Configuration

Set the `flyway` key in your platform config to the URL you want embedded:

```php
// config/autoload/platforms/[your-platform].php (or equivalent)
return [
    'flyway' => 'https://your-flyway-report.example.com',
    // ...
];
```

The controller reads this value at request time:

```php
$view->url = $this->getServiceManager()->get('config')['flyway'] ?? '';
```

## Backoffice

The tool appears in the left menu under **MelisCore → Dev Tools → Flyway** (Dev Tools section icon: `fa fa-code`; tool icon: `fa fa-puzzle-piece`). Opening it displays whatever page the `flyway` URL targets, sized to fill the window. There is nothing to configure inside the tool.

| Entry | Route target |
| --- | --- |
| `melis_flyway_tool` | `MelisFlyway / Index / render-iframe` |

## Key files

| Concern | Path |
| --- | --- |
| Menu / tool registration | `vendor/melisplatform/melis-flyway/config/app.toolstree.php` |
| Microservice forms (unused) | `vendor/melisplatform/melis-flyway/config/app.microservice.php` |
| Route + controller/service registration | `vendor/melisplatform/melis-flyway/config/module.config.php` |
| Controller (iframe action) | `vendor/melisplatform/melis-flyway/src/Controller/IndexController.php` |
| Service stub (unwired) | `vendor/melisplatform/melis-flyway/src/Service/FlywayService.php` |
| Module bootstrap | `vendor/melisplatform/melis-flyway/src/Module.php` |
| Iframe view | `vendor/melisplatform/melis-flyway/view/melis-flyway/index/render-iframe.phtml` |

## Implementation detail

`IndexController::renderIframeAction()` contains the entire module logic:

```php
$view = new ViewModel();
$view->url = $this->getServiceManager()->get('config')['flyway'] ?? '';
return $view;
```

The view `render-iframe.phtml` renders an `<iframe src="<?= $this->url ?>">` and a small `updateIframe()` script that sets its height to the window. `Module.php` is boilerplate (route listener, config/autoloader) with no custom event listeners.

See also: [MelisCore](/legacy/reference/modules/melis-core)
