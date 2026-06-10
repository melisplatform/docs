# MelisTipimail

> Back-office shortcut that embeds the Tipimail web application inside the Melis admin via an iframe. Package `melisplatform/melis-tipimail`.

## Purpose

MelisTipimail is a single-screen back-office tool that displays the external Tipimail transactional email service inside the Melis admin using an `<iframe>`. It is essentially a built-in bookmark: it opens Tipimail's own login/dashboard in a Melis tab, letting administrators manage their Tipimail account without leaving the platform.

The module adds **no** database, service, or model layer — one controller and one view only. It does **not** act as a mail transport; installing it does not route outgoing email through Tipimail. The only runtime dependency is `melisplatform/melis-core` (`^5.2`).

::: warning Inert API config block
`config/app.interface.php` defines a `tipimail_conf` block with API (`serverURI`, `username`, `apikey`, `apiVersion`, `urlWS`, `userAgent`) and web (`user`/`password`) credential placeholders. No code in this module reads those values — they are scaffolding for a future/external integration. Only the `url` key in `config/app.tools.php` is actually used.
:::

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisTipimail',
];
```

Requires `MelisCore` to be loaded first.

## Backoffice

The tool appears in the left menu under **MelisMarketing → Tipimail** (icon `fa-envelope`). Opening it renders the Tipimail web application embedded in the page via a full-width `<iframe>`.

Access is gated by the back-office rights system: a user who lacks the `melis_tipmail_tool` right sees a "no access" message instead of the embed.

::: tip Naming quirk
The tool key and rights identifier are spelled **`melis_tipmail_tool`** (single "i"), while the module name is `MelisTipimail` (double "i"). Use the existing strings exactly when referencing rights or config keys.
:::

## Configuration

| Where | Key | Purpose |
| --- | --- | --- |
| `config/app.tools.php` | `melisTipimail.tools.melis_tipmail_tool.config.url` | The iframe URL the controller actually reads. Default: `https://app.tipimail.com/#/access/login`. |
| `config/app.interface.php` | `melisTipimail.datas.tipimail_conf.default.{api,web}` | Unused API/web credential placeholders — no code reads these. |

To point the embed at a different URL or a self-hosted Tipimail login, change the `url` value in `config/app.tools.php`.

## Key files

| Concern | Path |
| --- | --- |
| Left-menu tool + inert config block | `vendor/melisplatform/melis-tipimail/config/app.interface.php` |
| Configurable iframe URL | `vendor/melisplatform/melis-tipimail/config/app.tools.php` |
| Route + controller registration | `vendor/melisplatform/melis-tipimail/config/module.config.php` |
| Controller (`webaccessAction`) | `vendor/melisplatform/melis-tipimail/src/Controller/TipimailController.php` |
| Module bootstrap | `vendor/melisplatform/melis-tipimail/src/Module.php` |
| Iframe view | `vendor/melisplatform/melis-tipimail/view/melis-tipimail/tipimail/webaccess.phtml` |
| Front-side iframe handler | `vendor/melisplatform/melis-tipimail/public/js/page/tipimail.js` |

## Implementation detail

`TipimailController::webaccessAction()` (`TOOL_KEY = 'melis_tipmail_tool'`) performs three steps:

1. Reads the target URL via `MelisCoreConfig->getItem('melisTipimail/tools/melis_tipmail_tool/config')['url']`.
2. Checks `MelisCoreRights->canAccess('melis_tipmail_tool')` — on denial, passes the `tr_tool_no_access` translation to the view.
3. Passes `$view->url` to `webaccess.phtml`, which renders:

```php
<iframe width="100%" class="melis-tipimail" onload="load();" src="<?php echo $this->url; ?>"></iframe>
```

`Module.php` is boilerplate (`ModuleRouteListener`, config/autoloader, `createTranslations`). It attaches no event listeners and registers no mail transport.

See also: [MelisCore](/reference/modules/melis-core)
