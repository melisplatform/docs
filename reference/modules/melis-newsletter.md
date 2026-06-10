# MelisNewsletter

> Turns a CMS page into a personalised email newsletter and delivers it to subscriber groups.
> Package `melisplatform/melis-newsletter`.

## Purpose

MelisNewsletter reuses the CMS page system as the newsletter template: a page flagged as type
**NEWSLETTER** is rendered as HTML, personalised per recipient via BB codes (`[NAME]`,
`[FIRSTNAME]`, `[EMAIL]`, `[UNSUBSCRIBELINK]`), and sent to selected subscribers and/or groups
through a configurable mail transport. Subscribers are organised in a per-site list and can be
segmented into groups. Every send is archived with a full HTML snapshot and a per-recipient log;
an unsubscribe front plugin and a complete GDPR integration (on-demand and scheduled auto-delete)
are included out of the box.

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisNewsletter',
];
```

Requires `melis-core` and `melis-cms` (`^5.2`); PHP `^8.1|^8.3`. Functionally also relies on
`melis-engine` and `melis-front` for page rendering and the unsubscribe page plugin.

## Key services

| Service alias | Role |
| --- | --- |
| `MelisNewsletterService` | Central service for subscribers, groups, send/test, archive and config. All methods fire `*_start` / `*_end` events. |
| `MelisNewsletterGdprAutoDeleteService` | Implements `MelisCoreGdprAutoDeleteInterface`; drives the scheduled GDPR warning/delete flow for stale subscribers. |

Table gateway aliases: `MelisNewsletterSubscribersTable`, `MelisNewsletterGroupsTable`,
`MelisNewsletterGroupsPeopleTable`, `MelisNewsletterArchiveTable`,
`MelisNewsletterRecipientsTable`, `MelisNewsletterConfigTable`.

## Backoffice

Accessible from the left menu under **MelisMarketing → Newsletter** (`fa fa-newspaper-o`). Four
tabs:

| Tab | Content |
| --- | --- |
| Subscribers | Add / edit / delete subscribers; CSV import and export; site filter; status (active/inactive); group membership column |
| Groups | Create and manage groups; member-count column; a sub-tab lists group members and allows adding/removing subscribers |
| History | Archive of every send: page name, site, sent date; per-row actions to view the exact HTML sent and export recipients as CSV |
| Configuration | SMTP Host / Username / Password — overrides the platform default transport |

The **Send Newsletter** button and **Test** action are not a tab here; they appear inside the CMS
page editor on any page whose type is set to **NEWSLETTER**.

Seven backoffice controllers: `MelisNewsletterTool` (subscribers), `MelisNewsletterGroupsTool`,
`MelisNewsletterGroupsSubTab`, `MelisNewsletterGroupsSubTabSubscribers`,
`MelisNewsletterSendTool`, `MelisNewsletterHistoryTool`, `MelisNewsletterConfigTool`.

## Front office

| Plugin | Config key | Description |
| --- | --- | --- |
| `MelisNewsletterUnsubscribePlugin` | `melisnewsletter` / `MelisNewsletterUnsubscribePlugin` | Drop on an `unsubscribe` page. Reads the `?s={hashed_id}` token baked into `[UNSUBSCRIBELINK]`, calls `deactivateSubscriberById()`, and shows a success/failure message. Exposes an `unsubscribe_data_salt` setting used in token hashing. |

Views: `plugins/unsubscribe.phtml` + `unsubscribe-modal-form.phtml`.

## Send mechanism

`MelisNewsletterSendToolController::sendNewsletterAction` delegates to
`MelisNewsletterService::sendNewsletter($pageId, $subscribers, $groups, $mailSubject)`:

1. **Resolve recipients** — explicit subscribers + group members via `getSubscribersInGroup()`,
   filtered to active only, deduped.
2. **Render content** — CMS page fetched as HTML; relative `href`/`src` rewritten to absolute URLs
   using the site domain.
3. **Personalise** — BB codes substituted per recipient; `[UNSUBSCRIBELINK]` carries the
   recipient's hashed token.
4. **Send** — via configured SMTP transport or platform default
   (`dummyMail@melistechnology.com` / "Melis Technology Inc." — override via Config tab).
5. **Archive** — one `nlan_*` row per send (site, page, version, full HTML, sent date) and one
   `nlus_*` row per recipient (name/firstname/email snapshot).

Fires `melis_newsletter_send_newsletter_start` / `melis_newsletter_send_newsletter_end`.

**Test send** (`testNewsletterAction` → `testNewsletter()` / `testNewsletterCustomMail()`)
delivers to one subscriber or an arbitrary email without archiving. A test send is **required**
before the Send button unlocks.

## CMS page type integration

`ModifyPagePropertiesFormConfigListener` hooks `modify_page_properties_form_config` and adds
**NEWSLETTER** as a selectable page type in the CMS page-properties form. Pages of that type
receive the **Send Newsletter** button (`MelisNewsletterSendTool/tool-send-newsletter-button`) in
the editor.

## GDPR integration

Hooks the MelisCore GDPR framework for both on-demand and scheduled flows:

- **On-demand:** `MelisNewsletterGdprUserInfoListener`, `…UserExtractListener`,
  `…UserDeleteListener` — find, export, and delete a person's subscriber data on request. Exposed
  columns: `nlu_firstname`, `nlu_name`, `nlu_email`, `nlu_date_creation` (declared in
  `config/app.gdpr.php`).
- **Scheduled auto-delete:** `MelisNewsletterGdprAutoDeleteService` with nine listeners covering
  module registration, GDPR tag declaration, first/second warning list building, warning email
  supply, and final deletion of unresponsive inactive subscribers.

## Database tables

| Table (alias → columns prefix) | Holds |
| --- | --- |
| `MelisNewsletterSubscribersTable` (`nlu_*`) | Per-site subscriber rows: email, first/last name, active/inactive status, creation date |
| `MelisNewsletterGroupsTable` (`nlg_*`) | Group definitions: name, status, creation date |
| `MelisNewsletterGroupsPeopleTable` (`nlgu_*`) | Subscriber ↔ group membership link |
| `MelisNewsletterArchiveTable` (`nlan_*`) | Per-send archive: site, page, version, full HTML body, sent date |
| `MelisNewsletterRecipientsTable` (`nlus_*`) | Per-recipient send log: name/firstname/email snapshot, archive FK |
| `MelisNewsletterConfigTable` (`nlc_*`) | Per-site SMTP transport config: host, username, password |

## Example

```php
$nl = $serviceManager->get('MelisNewsletterService');

// Subscriber management
$nl->saveSubscriber($data, $id);           // $id null → create
$nl->activateSubscriberById($id);
$nl->deactivateSubscriberById($id);
$nl->getSubscribersByStatus(1);            // 1 = active
$nl->checkMailInSiteExists($email, $siteId, $excludeId);

// Group management
$nl->saveGroup($data, $id);
$nl->addSubscriberToGroup($subId, $grpId);
$nl->removeSubscriberFromGroup($subId, $grpId);
$nl->getSubscribersInGroup($grpId);
$nl->getGroupsOfSubscriber($subId);

// Send flow
$nl->testNewsletter($pageId, $subId, $subject);
$nl->testNewsletterCustomMail($pageId, $email, $subject);
$nl->sendNewsletter($pageId, $subscribers, $groups, $subject);

// History & config
$nl->getNewsletterRecipients($archiveId);
$nl->saveNewsletterConfig($cfg);
$nl->getNewsletterConfig($id);

// Export
$nl->getSubscribersForExport($active, $siteFilter, $groupFilter);
```

## Key files

| Concern | Path |
| --- | --- |
| Module config (services, table gateways, controllers, plugin) | `vendor/melisplatform/melis-newsletter/config/module.config.php` |
| Backoffice tool tree + GDPR tags | `vendor/melisplatform/melis-newsletter/config/app.interface.php` |
| DataTables config (subscribers, groups, history) | `vendor/melisplatform/melis-newsletter/config/app.tools.php` |
| GDPR info/extract column declarations | `vendor/melisplatform/melis-newsletter/config/app.gdpr.php` |
| Unsubscribe plugin config | `vendor/melisplatform/melis-newsletter/config/plugins/MelisNewsletterPlugin.config.php` |
| Main service | `vendor/melisplatform/melis-newsletter/src/Service/MelisNewsletterService.php` |
| GDPR auto-delete service | `vendor/melisplatform/melis-newsletter/src/Service/MelisNewsletterGdprAutoDeleteService.php` |
| Send/test controllers | `vendor/melisplatform/melis-newsletter/src/Controller/MelisNewsletterSendToolController.php` |
| Unsubscribe front plugin | `vendor/melisplatform/melis-newsletter/src/Controller/Plugin/MelisNewsletterUnsubscribePlugin.php` |
| Listeners (GDPR ×9, page-type, flash messenger) | `vendor/melisplatform/melis-newsletter/src/Listener/` |
| Table gateways | `vendor/melisplatform/melis-newsletter/src/Model/Tables/` |
| DB install + migrations | `vendor/melisplatform/melis-newsletter/install/dbdeploy/` |

See also: [melis-core](/reference/modules/melis-core), [melis-cms](/reference/modules/melis-cms),
[melis-front](/reference/modules/melis-front), [melis-engine](/reference/modules/melis-engine)
