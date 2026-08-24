# MelisNewsletter

> Turns a CMS page into a personalised email newsletter and delivers it to subscriber groups, now driven from a native React back-office. Package `melisplatform/melis-newsletter`.

## Purpose

MelisNewsletter reuses the CMS page system as the newsletter template: a page flagged as type
**NEWSLETTER** is rendered as HTML, personalised per recipient via BB codes (`[NAME]`,
`[FIRSTNAME]`, `[EMAIL]`, `[UNSUBSCRIBELINK]`), and sent to selected subscribers and/or groups
through a configurable mail transport. Subscribers are organised in a per-site list and can be
segmented into groups. Every send is archived with a full HTML snapshot and a per-recipient log;
an unsubscribe front plugin and a complete GDPR integration are included out of the box.

In v6 the tool ships as a **native full-React brick** in the `/melis-react` back-office. The business
logic (services, send mechanism, GDPR, tables) is unchanged; only the display layer moved to React,
served through a `react-api` JSON layer exposed by the module.

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisNewsletter',
];
```

Requires `melis-core` and `melis-cms`; functionally also relies on `melis-engine` and `melis-front`
for page rendering and the unsubscribe plugin. The React tool appears in the menu **only when the
module is activated** (modular brick discovery via `GET /melis/react-api/react-modules`). Removing
`MelisNewsletter` from `melis.module.load.php` makes the brick disappear.

## Back-office (React)

Left sidebar → **MelisMarketing → Newsletter** (`fa fa-newspaper-o`), mount route
`/melis-marketing/melis-newsletter-tool-config`. It opens as a single tool whose header carries the
title *Newsletters*, the subtitle *"Subscribers, groups, history and send configuration"* and a
**New / Old** toggle (top-right). *New* is the React UI (default); *Old* renders the legacy tool in
an iframe (`/melis/react-tool-page?key=melis_newsletter_tool_display`).

Unlike a host-sub-tab tool, Newsletter renders its four screens as **its own React tabs**:

| Tab | Content |
| --- | --- |
| Subscribers | KPI cards (Total / Active / Inactive), search, status + site filters, column manager, CSV **Import**, **Export**, **Add selection to group(s)**, **+ New subscriber**. Table: Status / Email / First name / Last name / Site / Groups with per-row edit/delete |
| Groups | KPI cards, search, status filter, Export, **+ New group**. Table: Status / Name / Created / Members (count) with edit/delete |
| History | Read-only archive. KPI cards (Sends / Sites / Today), search, site filter, Export. Table: Page / Site / Version / Sent on with a per-row **eye** to view the exact archived HTML |
| Configuration | The single global SMTP **Transport configuration**: Host / Username / Password (+ confirm). Empty = the Melis default transport |

![The Subscribers tab in the React Newsletter tool](/screenshots/react/melis-newsletter/melisnewsletter-tool-newsletter-tab-subscribers.png)

Opening or creating a **subscriber** or **group** does not open a new main tab — it opens the record
editor (SubscriberForm / GroupForm) in a native **host sub-tab** (drill-down, keyed `s-<id>` /
`g-<id>`). The Subscriber form holds first/last name, email, site, an Active toggle and group
memberships; the Group form holds the name, an Active toggle and the group's members (add/remove +
subscriber picker).

![The Groups tab in the React Newsletter tool](/screenshots/react/melis-newsletter/melisnewsletter-tool-newsletter-tab-groups.png)

![The History tab in the React Newsletter tool](/screenshots/react/melis-newsletter/melisnewsletter-tool-newsletter-tab-history.png)

![The Configuration tab in the React Newsletter tool](/screenshots/react/melis-newsletter/melisnewsletter-tool-newsletter-tab-config.png)

For security the stored SMTP password is **never returned to the browser** — fields show a masked
placeholder, and leaving them empty on save keeps the current password.

### Sending a newsletter

The **Send** action is not a tab. It is a modal (`NewsletterSendModal`) exposed via
`window.__melisNewsletterSendModal`, which the **React page editor renders** for pages of type
**NEWSLETTER**. Set a subject, pick groups and/or subscribers, **Test** to a chosen subscriber or a
free e-mail address first, then **Send**. On success it fires a `melis:newsletter-sent` event so the
persistent History tab refreshes. Personalisation variables in the content: `[NAME]`, `[FIRSTNAME]`,
`[EMAIL]`, `[UNSUBSCRIBELINK]`. Publish the page before sending.

## React API

Routes live in `config/react-api.php` (merged via `MelisNewsletter\Module::getConfig()`), served as
child routes of the generic `melis-react-api` bridge under `/melis/react-api/newsletter`. Controller
`MelisNewsletter\Controller\MelisReactApiNewsletterController`; JSON contract `{ success, data, error }`;
every request carries `X-Requested-With: XMLHttpRequest` + credentials. Selected endpoints:

| Method & URL (relative to `/melis/react-api/newsletter`) | Purpose |
| --- | --- |
| `GET /subscribers` · `/subscribers/stats` · `/subscribers/:id` | Keyset list (`search`, `active`, `site`, `group`, `sort`, `dir`, `after`), KPI, one record |
| `POST /subscribers/save` · `/subscribers/import` | Create/update; CSV bulk import → `{imported,skipped,errors}` |
| `DELETE /subscribers/delete/:id` | Delete |
| `GET /groups` · `/groups/stats` · `/groups/:id` · `/groups/:id/members` | Groups list, KPI, record, members |
| `POST /groups/save` · `/groups/:id/members/add` · `/groups/members/bulk-add` | Save; add member; bulk-assign `subscriberIds[]` to `groupIds[]` |
| `DELETE /groups/delete/:id` · `/groups/members/remove/:mid` | Delete group; remove membership (`mid` = `nlgu_id`) |
| `GET /history` · `/history/stats` · `/history/:id` | Send archive list, KPI, archived HTML of one send |
| `GET /config` · `POST /config/save` | SMTP config (password not returned; only `hasPassword`) / save |
| `GET /send-options` · `POST /send` · `POST /test` | Send-modal options; send; test-send |

The React controller **reuses the module's Laminas service** (`MelisNewsletterService`) for the heavy
lifting — send/test go through `sendNewsletter()` / `testNewsletter()` / `testNewsletterCustomMail()`,
and validations mirror `saveSubscriber` / `importFileValidator` / `saveConfig` — so the React path
reproduces the exact legacy business rules.

## Capabilities (advanced rights)

Declared in `config/react.capabilities.php` under the rights-bearing node
**`melis_newsletter_tools_section`** (not the manifest/zone key `melis_newsletter_tool_display`). A
per-tab tree plus one cross-tab `send` action, flattened to dotted strings:

```
melis_newsletter_tools_section
├─ action: send                              (Send / Test — the page-editor modal)
├─ tab subscribers: list · create · edit · delete · export
├─ tab groups:      list · create · edit · delete · export
├─ tab history:     list                     (read-only)
└─ tab config:      edit                     (SMTP transport)
```

React reads them via `useCaps('melis_newsletter_tools_section').can('…')` and gates its action
buttons; server-side every mutating action is guarded (`denyUnlessAccess()` then `denyUnlessCan()`).
`react.capabilities.php` also merges a `newsletter` action under the shared `meliscms_page` node so
the Send button in the page editor is gatable in Users → Rights.

## Key services

| Service alias | Role |
| --- | --- |
| `MelisNewsletterService` | Central service for subscribers, groups, send/test, archive and config. Fires `*_start` / `*_end` events. |
| `MelisNewsletterGdprAutoDeleteService` | Implements `MelisCoreGdprAutoDeleteInterface`; drives the scheduled GDPR warning/delete flow for stale subscribers. |

Table gateway aliases: `MelisNewsletterSubscribersTable`, `MelisNewsletterGroupsTable`,
`MelisNewsletterGroupsPeopleTable`, `MelisNewsletterArchiveTable`,
`MelisNewsletterRecipientsTable`, `MelisNewsletterConfigTable`.

## Send mechanism

`MelisNewsletterService::sendNewsletter($pageId, $subscribers, $groups, $mailSubject)`:

1. **Resolve recipients** — explicit subscribers + group members via `getSubscribersInGroup()`,
   filtered to active only, deduped.
2. **Render content** — CMS page fetched as HTML; relative `href`/`src` rewritten to absolute URLs.
3. **Personalise** — BB codes substituted per recipient; `[UNSUBSCRIBELINK]` carries the hashed token.
4. **Send** — via configured SMTP transport or the platform default.
5. **Archive** — one `nlan_*` row per send (site, page, version, full HTML, sent date) and one
   `nlus_*` row per recipient.

**Test send** (`testNewsletter()` / `testNewsletterCustomMail()`) delivers to one subscriber or an
arbitrary email without archiving, and is required before a real send unlocks.

## Front office

| Plugin | Config key | Description |
| --- | --- | --- |
| `MelisNewsletterUnsubscribePlugin` | `melisnewsletter` / `MelisNewsletterUnsubscribePlugin` | Drop on an `unsubscribe` page. Reads the `?s={hashed_id}` token baked into `[UNSUBSCRIBELINK]`, calls `deactivateSubscriberById()`, shows a success/failure message. Exposes an `unsubscribe_data_salt` setting used in token hashing. |

Views: `plugins/unsubscribe.phtml` + `unsubscribe-modal-form.phtml`.

## GDPR integration

Hooks the MelisCore GDPR framework for both on-demand and scheduled flows:

- **On-demand:** `MelisNewsletterGdprUserInfoListener`, `…UserExtractListener`, `…UserDeleteListener`
  find, export and delete a person's subscriber data on request. Columns: `nlu_firstname`, `nlu_name`,
  `nlu_email`, `nlu_date_creation` (declared in `config/app.gdpr.php`).
- **Scheduled auto-delete:** `MelisNewsletterGdprAutoDeleteService` with nine listeners covering module
  registration, GDPR tag declaration, warning-list building, warning emails and final deletion of
  unresponsive inactive subscribers.

## Database tables

| Table (alias → columns prefix) | Holds |
| --- | --- |
| `MelisNewsletterSubscribersTable` (`nlu_*`) | Per-site subscriber rows: email, first/last name, status, creation date |
| `MelisNewsletterGroupsTable` (`nlg_*`) | Group definitions: name, status, creation date |
| `MelisNewsletterGroupsPeopleTable` (`nlgu_*`) | Subscriber ↔ group membership link |
| `MelisNewsletterArchiveTable` (`nlan_*`) | Per-send archive: site, page, version, full HTML body, sent date |
| `MelisNewsletterRecipientsTable` (`nlus_*`) | Per-recipient send log: name/firstname/email snapshot, archive FK |
| `MelisNewsletterConfigTable` (`nlc_*`) | Per-site SMTP transport config: host, username, password |

## Example

```php
$nl = $serviceManager->get('MelisNewsletterService');

// Subscriber / group management (same service the react-api reuses)
$nl->saveSubscriber($data, $id);           // $id null → create
$nl->deactivateSubscriberById($id);
$nl->saveGroup($data, $id);
$nl->getSubscribersInGroup($grpId);

// Send flow
$nl->testNewsletter($pageId, $subId, $subject);
$nl->sendNewsletter($pageId, $subscribers, $groups, $subject);

// History & config
$nl->getNewsletterRecipients($archiveId);
$nl->saveNewsletterConfig($cfg);
```

## Key files

| Concern | Path |
| --- | --- |
| React API routes + invokable controller | `vendor/melisplatform/melis-newsletter/config/react-api.php` |
| React capabilities (keyed `melis_newsletter_tools_section`) | `vendor/melisplatform/melis-newsletter/config/react.capabilities.php` |
| React API controller (reuses `MelisNewsletterService`) | `vendor/melisplatform/melis-newsletter/src/Controller/MelisReactApiNewsletterController.php` |
| React brick (Vite build) + manifest | `vendor/melisplatform/melis-newsletter/public/ui-react/brick.js` · `brick.manifest.json` |
| Module config (services, table gateways, controllers, plugin) | `vendor/melisplatform/melis-newsletter/config/module.config.php` |
| Main service | `vendor/melisplatform/melis-newsletter/src/Service/MelisNewsletterService.php` |
| GDPR auto-delete service | `vendor/melisplatform/melis-newsletter/src/Service/MelisNewsletterGdprAutoDeleteService.php` |
| Unsubscribe front plugin | `vendor/melisplatform/melis-newsletter/src/Controller/Plugin/MelisNewsletterUnsubscribePlugin.php` |
| Table gateways | `vendor/melisplatform/melis-newsletter/src/Model/Tables/` |
| DB install + migrations | `vendor/melisplatform/melis-newsletter/install/dbdeploy/` |

See also: [melis-core](/legacy/reference/modules/melis-core), [melis-cms](/legacy/reference/modules/melis-cms),
[melis-front](/legacy/reference/modules/melis-front), [melis-engine](/legacy/reference/modules/melis-engine)
