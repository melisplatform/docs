# MelisMessenger

> Internal, user-to-user messaging inside the Melis backoffice. Package `melisplatform/melis-messenger`.

## Purpose

MelisMessenger adds a lightweight private-messaging system to the platform so backoffice
collaborators can talk to each other. A user starts a conversation with one or more other users,
messages are exchanged and refreshed on a polling interval, and a header icon surfaces new/unread
messages. It is a backoffice-only tool — there is no front-office component.

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisMessenger',
];
```

Requires `melisplatform/melis-core` (`^5.2`). The module category is `core` with `dbdeploy`
enabled, so its tables install through the dbdeploy mechanism.

## Key services

| Alias | Role |
| --- | --- |
| `MelisMessengerService` | Public service for messaging: send and read messages/conversations. |
| `MelisMessengerMsgTable` | Table gateway for `melis_messenger_msg`. |
| `MelisMessengerMsgContentTable` | Table gateway for `melis_messenger_msg_content`. |
| `MelisMessengerMsgMembersTable` | Table gateway for `melis_messenger_msg_members`. |

`MelisMessengerService` methods fire `melismessenger_*_start` / `*_end` events for each read/list
call (e.g. `melismessenger_get_conversation_start` / `_end`):

| Method | Role |
| --- | --- |
| `saveMsg($data)` | Create/update a conversation; returns the conversation id. |
| `saveMsgMembers($data)` | Attach a user to a conversation. |
| `saveMsgContent($data)` | Save a message inside a conversation. |
| `getConversation($id)` | Fetch a full conversation by id. |
| `getConversationWithLimit($id, $limit, $offset)` | Paginated conversation fetch. |
| `getNewMessage($id)` | Fetch new/unread messages since the last poll. |
| `updateMessageStatus($data, $msg_id, $user_id)` | Mark messages read for a user. |
| `getContactList($convo_id, $user_id)` | Resolve the contacts of a conversation. |
| `prepareConversationId($userId)` | List conversation ids a user belongs to. |
| `getUserRightsForMessenger()` | Check the current user's access rights to the module. |

## Backoffice

The module surfaces in the backoffice via `config/app.interface.php`:

- A **Messenger tab** inside the user Profile screen — melisKey `melismessenger_tool` (icon
  `comments`), injected under `meliscore_user_profile_tabs`.
- A **header notification icon** — injected under `meliscore_header`, surfaces new/unread messages
  from any backoffice screen.
- The thread auto-refreshes every `msg_interval` milliseconds (default 60 000 ms).

All actions live on `MelisMessenger\Controller\MelisMessengerController`:

| Action | Purpose |
| --- | --- |
| `renderMessengerAction` | Render the Messenger profile tab. |
| `renderMessengerToolContentAction` | Render the conversation thread content. |
| `renderMessengerContactAction` | Render the contacts/recipient picker. |
| `headerMessengerAction` | Render the header notification icon. |
| `createConversationAction` | AJAX — create a conversation. |
| `saveMessageAction` | AJAX — post a message. |
| `getConversationAction` | AJAX — fetch a conversation. |
| `getNewMessageAction` | AJAX — poll for new messages. |
| `getLastMessageAction` | AJAX — fetch the last message. |
| `updateMessageStatusAction` | AJAX — mark messages read. |
| `getContactListAction` | AJAX — retrieve the contact list. |
| `getMsgTimeIntervalAction` | AJAX — return the polling interval. |
| `getUserRightsForMessengerAction` | AJAX — return the user's rights. |

The recipient picker uses the **tokenize2** library (`public/plugins/tokenize2.*`) via the
`MelisMessengerInput` form element (a multi-recipient tokenize2 input).

## Database tables

| Table | Holds |
| --- | --- |
| `melis_messenger_msg` | One row per conversation (`msgr_msg_id`, `msgr_msg_creator_id`, `msgr_msg_date_created`). |
| `melis_messenger_msg_members` | Users participating in a conversation (`msgr_msg_mbr_id`, `msgr_msg_id`, `msgr_msg_mbr_usr_id`). |
| `melis_messenger_msg_content` | Individual messages (`msgr_msg_cont_id`, sender, message text, date, status). |

## Example

```php
$messenger = $this->getServiceManager()->get('MelisMessengerService');

// Create a conversation, add a member, then post a message
$convoId = $messenger->saveMsg($data);
$messenger->saveMsgMembers(['msgr_msg_id' => $convoId, 'msgr_msg_mbr_usr_id' => $userId]);
$messenger->saveMsgContent(['msgr_msg_id' => $convoId, 'msgr_msg_cont_message' => 'Hi']);

// Read messages
$thread = $messenger->getConversation($convoId);
$page   = $messenger->getConversationWithLimit($convoId, 10, 0);
$new    = $messenger->getNewMessage($convoId);

// Mark read
$messenger->updateMessageStatus($data, $msgId, $userId);

// Contacts
$contacts = $messenger->getContactList($convoId, $userId);
```

## Key files

| Concern | Path |
| --- | --- |
| Module config (routes, services, controllers) | `vendor/melisplatform/melis-messenger/config/module.config.php` |
| Interface declaration (profile tab + header) | `vendor/melisplatform/melis-messenger/config/app.interface.php` |
| Forms config | `vendor/melisplatform/melis-messenger/config/app.forms.php` |
| Tools config | `vendor/melisplatform/melis-messenger/config/app.tools.php` |
| Public service | `vendor/melisplatform/melis-messenger/src/Service/MelisMessengerService.php` |
| Main controller | `vendor/melisplatform/melis-messenger/src/Controller/MelisMessengerController.php` |
| Table gateways | `vendor/melisplatform/melis-messenger/src/Model/Tables/` |
| Recipient picker form element | `vendor/melisplatform/melis-messenger/src/Form/Factory/MelisMessengerInputFactory.php` |
| DB install delta | `vendor/melisplatform/melis-messenger/install/` |

See also: [melis-core](/reference/modules/melis-core)
