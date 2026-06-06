# MelisMessenger

> Internal, user-to-user messaging inside the Melis backoffice. Package `melisplatform/melis-messenger`.

## Purpose

MelisMessenger adds a lightweight private-messaging system to the platform so backoffice
collaborators can talk to each other. A user starts a conversation with one or more other users,
messages are exchanged and refreshed on a polling interval, and a header icon surfaces new/unread
messages. It is a backoffice-only tool — there is no front-office component.

## Enable it

MelisMessenger is a standard Laminas module. It ships enabled in the skeleton via
`config/melis.module.load.php` (entry `'MelisMessenger'`). If you add it manually, append that
entry to the load list, then deploy its database delta. It depends on `melis-core` (`^5.2`); the
module category is `core` and `dbdeploy` is enabled, so its tables install through the dbdeploy
mechanism. See the [Module reference](/reference/modules).

## Key services

Registered under `service_manager` aliases in `config/module.config.php`.

| Alias | Role |
| --- | --- |
| `MelisMessengerService` | The public service for messaging. Send and read messages/conversations. |
| `MelisMessengerMsgTable` | Table gateway for conversations (`melis_messenger_msg`). |
| `MelisMessengerMsgContentTable` | Table gateway for message content (`melis_messenger_msg_content`). |
| `MelisMessengerMsgMembersTable` | Table gateway for conversation members (`melis_messenger_msg_members`). |

`MelisMessengerService` (extends `MelisGeneralService`, so each method fires
`melismessenger_*_start` / `_end` events) exposes:

| Method | Role |
| --- | --- |
| `saveMsg($data)` | Create/save a conversation; returns the conversation id. |
| `saveMsgMembers($data)` | Attach members (users) to a conversation. |
| `saveMsgContent($data)` | Save a message inside a conversation. |
| `getConversation($id)` | Fetch a full conversation by id. |
| `getConversationWithLimit($id, $limit = 10, $offset = 0)` | Paginated conversation fetch. |
| `getNewMessage($id)` | Fetch new/unread messages. |
| `updateMessageStatus($data, $msg_id, $user_id)` | Mark messages read/updated for a user. |
| `getContactList($convo_id, $user_id)` | Resolve the contacts of a conversation. |
| `prepareConversationId($userId)` | List conversation ids a user belongs to (creator + member). |
| `getUserRightsForMessenger()` | Check the current user's access right to `/melismessenger`. |

## Backoffice

The module surfaces in the backoffice through `config/app.tools.php` and `config/app.interface.php`:

- A **Messenger tab** inside the user profile screen — declared as melisKey `melismessenger_tool`
  (forwards to `MelisMessenger` controller, `render-messenger` action), with nested keys
  `melismessenger_tool_content` (`render-messenger-tool-content`) and
  `melismessenger_tool_contact` (`render-messenger-contact`).
- A **header notification** widget — melisKey `melismessenger_tool_header_messages`, injected into
  `meliscore_header`, forwarding to the `header-messenger` action.
- The tool is registered under the `melistoolmessenger` interface plugin; messages auto-refresh on
  the `msg_interval` defined in `app.interface.php` (default 60000 ms / 1 min).

All actions live on `MelisMessenger\Controller\MelisMessengerController` (e.g.
`createConversationAction`, `saveMessageAction`, `getConversationAction`, `getNewMessageAction`,
`getContactListAction`, `updateMessageStatusAction`). `MelisSetupController` handles the standalone
setup form. To build your own backoffice tools, see [Create a tool](/guide/create-a-tool).

## Front office

None. MelisMessenger does not ship templating plugins, view helpers or controller plugins — it is
purely a backoffice messaging tool.

## Database tables

Installed by `install/dbdeploy/1112618_melis_messenger_install.sql`.

| Table | Role |
| --- | --- |
| `melis_messenger_msg` | One row per conversation (`msgr_msg_id`, creator, creation date). |
| `melis_messenger_msg_content` | The individual messages (sender, message text, date, status). |
| `melis_messenger_msg_members` | Users participating in a conversation. |

## Example

```php
// In a backoffice controller (service available via the service manager)
$messenger = $this->getServiceManager()->get('MelisMessengerService');

// Start a conversation, attach members, then post a message
$convoId = $messenger->saveMsg([
    'msgr_msg_creator_id'  => $userId,
    'msgr_msg_date_created' => date('Y-m-d H:i:s'),
]);
$messenger->saveMsgMembers(['msgr_msg_id' => $convoId, 'msgr_msg_mbr_usr_id' => $otherUserId]);
$messenger->saveMsgContent([
    'msgr_msg_id'             => $convoId,
    'msgr_msg_cont_sender_id' => $userId,
    'msgr_msg_cont_message'   => 'Hello!',
    'msgr_msg_cont_date'      => date('Y-m-d H:i:s'),
]);
```

## Key files

| Concern | Path |
| --- | --- |
| Module config (routes, services, controllers) | `vendor/melisplatform/melis-messenger/config/module.config.php` |
| Backoffice tool declaration | `vendor/melisplatform/melis-messenger/config/app.tools.php` |
| Interface (profile tab + header) | `vendor/melisplatform/melis-messenger/config/app.interface.php` |
| Public service | `vendor/melisplatform/melis-messenger/src/Service/MelisMessengerService.php` |
| Main controller | `vendor/melisplatform/melis-messenger/src/Controller/MelisMessengerController.php` |
| Table gateways | `vendor/melisplatform/melis-messenger/src/Model/Tables/` |
| DB install delta | `vendor/melisplatform/melis-messenger/install/dbdeploy/1112618_melis_messenger_install.sql` |
| Front-end assets | `vendor/melisplatform/melis-messenger/public/js/tools/messenger-tool.js`, `public/css/messenger-tool.css` |
