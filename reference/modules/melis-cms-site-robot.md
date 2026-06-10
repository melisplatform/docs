# MelisCmsSiteRobot

> Per-domain `robots.txt` editing and dynamic serving from the back-office. Package `melisplatform/melis-cms-site-robot`.

## Purpose

`MelisCmsSiteRobot` lets you manage the `robots.txt` of each site domain from the back-office and
serves it dynamically at `https://<domain>/robots.txt` — straight from the database, with no
static file to maintain. Changes take effect immediately after saving. The robots text is stored
one row per domain in a dedicated table; no per-page or per-language variant exists.

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisCmsSiteRobot',
];
```

Dependencies: `melis-core` and `melis-cms` (`^5.2`). The module is `dbdeploy: true`, so its
table is created automatically. It reuses table gateways provided by `melis-engine` at runtime.

## Key services

The module registers no service of its own. The controller consumes existing engine services:

| Service alias | Role |
| --- | --- |
| `MelisEngineTableRobot` | Table gateway over `melis_cms_domain_robots` — reads and writes the `robot_text` by domain. |
| `MelisEngineTableSiteDomain` | Feeds the list of site domains (`sdom_id`, `site_label`, `sdom_domain`) for the back-office tool. |

## Backoffice

Registered under **CMS** tools in the back-office left menu as **Site robots** (server icon).
The tool shows a list of the platform's site domains — one row per domain. There is no Add or
Delete action; you only **edit** existing domain entries.

Clicking **Edit** on a domain opens a modal with the domain name (read-only) and a large textarea
holding the `robots.txt` content for that domain. Saving performs an upsert into
`melis_cms_domain_robots` (the row is created on first save if absent).

| Controller | Class |
| --- | --- |
| `ToolSiteRobot` | `MelisCmsSiteRobot\Controller\ToolSiteRobotController` |

Key actions:

| Action | Purpose |
| --- | --- |
| `toolContainerAction` | Renders the tool layout. |
| `getSiteRobotDataAction` | JSON feed for the domains datatable. |
| `toolContentTableActionEditAction` | The Edit button per row. |
| `toolModalContentAction` | Edit modal — domain + `robot_text` textarea (form key `site_robot_form`). |
| `saveSiteRobotAction` | Upsert into `melis_cms_domain_robots`. |
| `toolSiteRobotContentFiltersSitesAction` | Site filter in the datatable filter bar. |

### Listener

`MelisCmsSiteRobotFlashMessengerListener` forwards save results to the core flash-messenger so
success/error messages appear in the back-office.

## Front office

A public route in `config/module.config.php` (`melis-cms-site-robot-special-urls`) maps
`/robots.txt` to `ToolSiteRobotController::toolRobotsTxtAction`. The action looks up
`melis_cms_domain_robots` by the requesting host and outputs the stored `robot_text`.

| Route | Handler | Result |
| --- | --- | --- |
| `/robots.txt` | `ToolSiteRobotController::toolRobotsTxtAction` | Serves the `robot_text` stored for the requesting domain. |

## Database tables

| Table | Holds |
| --- | --- |
| `melis_cms_domain_robots` | One robots.txt entry per domain: `robot_id` (PK), `robot_site_domain`, `robot_text`. |

## Example

Read or serve the robots text for a domain from your own code:

```php
// List domains for the back-office tool:
$domains = $sm->get('MelisEngineTableSiteDomain')
              ->getData($search, $cols, $colOrder, $dir, $start, $len)->toArray();

// Get the robots.txt for a specific domain:
$robot = (array) $sm->get('MelisEngineTableRobot')
                    ->getEntryByField('robot_site_domain', $domainName)->current();
echo $robot['robot_text'] ?? '';
```

## Key files

| Concern | Path |
| --- | --- |
| Routes (back-office + `/robots.txt`) | `vendor/melisplatform/melis-cms-site-robot/config/module.config.php` |
| Back-office tools tree | `vendor/melisplatform/melis-cms-site-robot/config/app.interface.php` |
| Tool datatable & edit form | `vendor/melisplatform/melis-cms-site-robot/config/app.tools.php` |
| Controller (all actions) | `vendor/melisplatform/melis-cms-site-robot/src/Controller/ToolSiteRobotController.php` |
| Flash-messenger listener | `vendor/melisplatform/melis-cms-site-robot/src/Listener/MelisCmsSiteRobotFlashMessengerListener.php` |
| Install SQL | `vendor/melisplatform/melis-cms-site-robot/install/` |

See also: [Module reference](/reference/modules), [melis-cms](/reference/modules/melis-cms), [melis-core](/reference/modules/melis-core)
