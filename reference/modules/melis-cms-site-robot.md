# MelisCmsSiteRobot

> Per-site `robots.txt` editing and dynamic serving for Melis sites. Package
> `melisplatform/melis-cms-site-robot`.

## Purpose

`MelisCmsSiteRobot` adds a backoffice tool that lets you edit the **`robots.txt`** content for each
site domain, and a public route that serves it dynamically. The tool lists the site domains
(grouped by site) in a datatable; editing a domain opens a modal with a textarea holding that
domain's robots.txt text. On the front office, a request to `/robots.txt` is matched against the
incoming **host** and returns the stored text for that domain (an empty body if none is stored).
The robots text is kept in a single table keyed by domain — there is no per-page or per-language
variant.

## Enable it

A standard Laminas module, listed in `config/melis.module.load.php` (right after `MelisCms`):

```php
return [
    // …
    'MelisCmsSiteRobot',
    // …
];
```

Dependencies (from `composer.json`): `melis-core` and `melis-cms`. It is `dbdeploy: true`, so its
table is created/updated through [melis-dbdeploy](/reference/modules). The module reuses the table
services shipped by `melis-engine` (`MelisEngineTableRobot`, `MelisEngineTableSiteDomain`,
`MelisEngineTableSite`).

## Key services

The module registers **no service of its own** in `config/module.config.php`; the controller
consumes existing core/engine services:

| Service alias | Role |
| --- | --- |
| `MelisEngineTableRobot` | Table gateway over `melis_cms_domain_robots`. The controller reads/writes robots text via `getEntryByField('robot_site_domain', $host)` and `save($data, $id)`. |
| `MelisEngineTableSiteDomain` | Feeds the datatable of domains: `getData($search, $searchableCols, $orderCol, $orderDir, $start, $length, $siteId)`, plus `getTotalData()` / `getTotalFiltered()`. |
| `MelisEngineTableSite` | Lists sites for the "choose site" filter in the datatable. |
| `MelisCoreTool` | Builds the datatable config, columns, searchable columns and the edit form from the tool config (`setMelisToolKey('melis_cms_site_robots', 'melissiterobot_tool_templates')`). |

## Backoffice

Declared in `config/app.interface.php` and `config/app.tools.php`. The tool sits under the CMS
tools tree section (`meliscms_toolstree_section`) as `meliscms_site_robot_tools` (icon
`fa-server`). The interface key for the tool itself is `melis_cms_site_robots`, with the main view
`site_robot_tool_display`.

All actions are served by a single controller, `MelisCmsSiteRobot\Controller\ToolSiteRobot`
(`ToolSiteRobotController`):

| Action | Purpose |
| --- | --- |
| `tool-container` / `tool-header-container` / `tool-content-container` | The tool shell: header, description and the `#tableSiteRobot` datatable. |
| `getSiteRobotData` | JSON feed for the datatable (columns `sdom_id`, `site_label`, `sdom_domain`), with site filtering via `tpl_site_id`. |
| `tool-site-robot-content-filters-sites` | Renders the site `<select>` filter in the datatable filter bar. |
| `tool-modal-container` / `tool-modal-content` | The edit modal: loads the domain row and its existing robots text into the `site_robot_form` (read-only domain + `robot_text` textarea). |
| `saveSiteRobot` | Validates the form and saves the text to `melis_cms_domain_robots` (insert or update keyed by `robot_site_domain`), then triggers the `site_robot_flash_messenger` event (log type `CMS_SITE_ROBOT_UPDATE`). |

The datatable config (columns, search, filters, form) lives in `config/app.tools.php` under
`melis_cms_site_robots → melissiterobot_tool_templates`. See [Create a tool](/guide/create-a-tool).

### Listener

On bootstrap (`src/Module.php`), for backoffice routes only, `MelisCmsSiteRobotFlashMessengerListener`
attaches to the `site_robot_flash_messenger` (and `melis_domain_flash_messenger`) events and
forwards them to `MelisCore\Controller\MelisFlashMessenger` so save results appear as flash/log
messages.

## Front office

This module has no templating plugin or view helper. Instead it registers a public route in
`config/module.config.php`:

| Route | Maps to | Result |
| --- | --- | --- |
| `/robots.txt` (`melis-cms-site-robot-special-urls/robots_txt`) | `ToolSiteRobot::toolRobotsTxt` | Looks up `melis_cms_domain_robots` by the request **host** and outputs the stored `robot_text` (terminal view `tool-robots-txt.phtml`, which simply echoes the content). |

So each domain can serve its own `robots.txt` without a static file on disk.

## Database tables

Created from `install/sql/setup_structure.sql` (and the dbdeploy delta
`install/dbdeploy/93118_melis_site_robot_install.sql`):

| Table | Role |
| --- | --- |
| `melis_cms_domain_robots` | One robots.txt entry per domain: `robot_id` (PK), `robot_site_domain` (the host), `robot_text` (the full robots.txt body). |

## Example

Read the robots text for a host from your own code (the same call the front route makes):

```php
$robotTable = $this->getServiceManager()->get('MelisEngineTableRobot');
$row = $robotTable->getEntryByField('robot_site_domain', 'www.example.com')->current();
$robotsTxt = $row ? $row->robot_text : null;
```

In practice you edit this content from the **Site Robot** backoffice tool, and visitors get it by
requesting `https://www.example.com/robots.txt`.

## Key files

| Concern | Path (under `vendor/melisplatform/melis-cms-site-robot/`) |
| --- | --- |
| Module bootstrap / config loading | `src/Module.php` |
| Routes (backoffice + `/robots.txt`) / controllers | `config/module.config.php` |
| Backoffice tools tree | `config/app.interface.php` |
| Tool datatable & edit form | `config/app.tools.php` |
| Controller (all actions) | `src/Controller/ToolSiteRobotController.php` |
| Flash-messenger listener | `src/Listener/MelisCmsSiteRobotFlashMessengerListener.php` |
| Front `robots.txt` view | `view/melis-cms-site-robot/tool-site-robot/tool-robots-txt.phtml` |
| Install SQL | `install/sql/setup_structure.sql`, `install/dbdeploy/` |

See the [Module reference](/reference/modules) for the full module map.
