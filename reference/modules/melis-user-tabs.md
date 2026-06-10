# MelisUserTabs

> Back-office UX utility that persists and restores the set of tabs a user has open across sessions. Package `melisplatform/melis-user-tabs`.

## Purpose

MelisUserTabs is a small back-office utility that integrates with the MelisCore admin shell tab system. It tracks which tools a user has open as tabs, persists that set per user, and reopens those tabs on the next login. It also powers the *Close all tabs* control in the BO header. There is no dedicated left-menu tool — it operates entirely in the background.

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisUserTabs',
];
```

Requires `melisplatform/melis-core` `^5.2`.

## Key services

| Service alias | Role |
| --- | --- |
| `MelisUserTabsService` | Saves and restores open tabs; handles translation-key round-trip |
| `MelisUserTabsTable` | Low-level access to `melis_user_tabs_open` |

### MelisUserTabsService — method reference

**`getUserTabsOpenByUserId($userId)`**
Loads the user's row, unserializes `tabs_list`, and translates each tab's `melisTitle` into the current user's language before returning the array.
Events: `user_tabs_open_get_user_tabs_by_user_id_start` / `user_tabs_open_get_user_tabs_by_use_rid_end` (note: the "end" event name carries a verbatim typo — `use_rid`).

**`saveOpenTabs($userTabsOpen)`**
JSON-decodes each entry in `$userTabsOpen['tabOpen']`, reverse-translates the title to its **translation key** (not the localized string) for every parent tab (a tab is a parent when it has no `melisparameter`), serializes the set, and inserts or updates the single per-user row.
Events: `user_tabs_open_save_open_tabs_start` / `user_tabs_open_save_open_tabs_end`.

**`getTranslationByText($text)`**
Reverse lookup — localized string to translation key — used internally by `saveOpenTabs`.

> **Design intent — store keys, localize on read.** Titles are persisted as translation keys and converted to text only when read back. This ensures restored tabs are labeled correctly if the user switches language between sessions.

## Backoffice

MelisUserTabs hooks into `meliscore_header` — it is not a standalone tool.

### Controller actions (`MelisUserTabsController`)

Route: `/melis/MelisUserTabs/[:controller[/:action]]`

| Action | Returns | Role |
| --- | --- | --- |
| `saveOpenTabsAction()` | `JsonModel` | Receives the POSTed `tabOpen` set and delegates to `MelisUserTabsService::saveOpenTabs()` |
| `getUserTabsOpenedAction()` | `JsonModel` | Returns the current user's saved tabs via `getUserTabsOpenByUserId()` so the shell can reopen them |
| `closeAllButtonAction()` | `ViewModel` | Renders the *Close all tabs* button |

### Opening a tab programmatically

Use MelisCore's JS helper — MelisUserTabs will persist it automatically:

```js
melisHelper.tabOpen(title, icon, zoneId, melisKey, parameters);
```

## Database tables

| Table | Holds |
| --- | --- |
| `melis_user_tabs_open` | One row per back-office user; `tabs_list` stores the open-tab set as a PHP-serialized array |

### Schema

| Column | Meaning |
| --- | --- |
| `tabs_id` | Primary key |
| `tabs_user_id` | Back-office user (`usr_id`) |
| `tabs_list` | PHP-serialized array of tab objects (`melisTitle`, `melisKey`, optional `melisparameter`, …) |

> `tabs_list` is an internal representation written and read only by `MelisUserTabsService`. Do not feed it untrusted data.

## Example

```php
// Read the saved open tabs for a given user
$userTabsService = $this->getServiceManager()->get('MelisUserTabsService');
$tabs = $userTabsService->getUserTabsOpenByUserId($userId);
// $tabs is an array of tab objects with localized melisTitle values
```

## Key files

| Concern | Path |
| --- | --- |
| Header hook + JS asset wiring | `vendor/melisplatform/melis-user-tabs/config/app.interface.php` |
| Route, service & table aliases | `vendor/melisplatform/melis-user-tabs/config/module.config.php` |
| Controller | `vendor/melisplatform/melis-user-tabs/src/Controller/MelisUserTabsController.php` |
| Service | `vendor/melisplatform/melis-user-tabs/src/Service/MelisUserTabsService.php` |
| Table gateway | `vendor/melisplatform/melis-user-tabs/src/Model/Tables/MelisUserTabsTable.php` |
| Front-end tracker | `vendor/melisplatform/melis-user-tabs/public/js/melis-user-tabs.js` |

See also: [MelisCore](/reference/modules/melis-core)
