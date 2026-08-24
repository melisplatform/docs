# MelisPrimotexto

> Headless SMS connector — sends and manages text messages through the Primotexto API. Package `melisplatform/melis-primotexto`.

## Purpose

MelisPrimotexto is a headless SMS-gateway integration: no back-office UI, only PHP services you call from your own module or code. It wraps the **Primotexto v2 API** (`https://api.primotexto.com/v2/`) to send transactional or marketing SMS messages, track delivery status and replies, manage contact lists and their fields, and maintain account-level blacklists (unsubscribers, bounces). Every outbound SMS is logged to a local `melis_sms_messages` table. The three services extend `MelisCore`'s `MelisGeneralService` and run inside the Melis platform event system.

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisPrimotexto',
];
```

Requires PHP `^8.1|^8.3`. **MelisCore** must be present at runtime (provides `MelisGeneralService`; not declared in `composer.json` — supplied by the platform). A **Primotexto account** and its **API key** are mandatory before any service call.

## Key services

| Service alias | Role |
| --- | --- |
| `MelisPrimotextoSmsService` | Send SMS, query delivery status, fetch replies (callbacks), per-category stats, message-level blacklists, and phone-number validity check |
| `MelisPrimotextoAccountService` | Read account stats; manage account-level blacklists (unsubscribers / bounces) |
| `MelisPrimotextoListService` | Create, read and delete contact lists, list custom fields, and the contacts within them |

**Always set the API key before calling any method** — `ensureLogin()` throws on an empty key:

```php
$sms = $serviceManager->get('MelisPrimotextoSmsService');
$sms->setApiKey('YOUR_PRIMOTEXTO_API_KEY');
```

## Database tables

| Table | Holds |
| --- | --- |
| `melis_sms_messages` | Log of every outbound SMS: `sms_id`, `sms_number`, `sms_snapshot_id`, `sms_message`, `sms_type`, `sms_sender`, `sms_campaign_name`, `sms_category`, `sms_date` |

## Example

```php
// --- Send an SMS ---
$sms = $serviceManager->get('MelisPrimotextoSmsService');
$sms->setApiKey($apiKey);

$result = $sms->sendSms(
    number:       '+33600000000',
    message:      'Your order has shipped!',
    sender:       'MyShop',        // optional
    campaignName: 'order-updates', // optional
    category:     'transactional', // optional
    dateTime:     null,            // optional — datetime string schedules the send
    type:         'notification'   // 'notification' (transactional) | 'marketing'
);
// On success the gateway returns a snapshotId; a row is saved to melis_sms_messages.

// --- Account blacklists ---
$acct = $serviceManager->get('MelisPrimotextoAccountService');
$acct->setApiKey($apiKey);
$acct->accountStats();
$acct->accountBlacklists($bl);    // $bl->type = 'unsubscribers' | 'bounces'
$acct->accountBlacklistsAdd($bl); // + $bl->identifier
$acct->accountBlacklistsDel($bl);

// --- Contact lists ---
$lists = $serviceManager->get('MelisPrimotextoListService');
$lists->setApiKey($apiKey);
$lists->addList($list);           // $list->name
$lists->getLists();
$lists->getList($listId);
$lists->delList($listId);
$lists->addField($field);         // $field->type = STRING | DATE | NUMBER, $field->listId
$lists->getFields($listId);
$lists->delField($listId, $fieldId);
$lists->addContact($contact);     // $contact->listId (+ attributes)
$lists->getContacts($listId);
$lists->delContact($contact);     // by id OR identifier
```

## DTO models

Plain property-bag objects passed to the services and JSON-encoded into API payloads:

| Model | Key properties |
| --- | --- |
| `MelisPrimotextoSms` | `type`, `number`, `message`, `sender`, `campaignName`, `category`, `date`, `identifier`, `snapshotId` |
| `MelisPrimotextoBlacklist` | `type` (`unsubscribers`/`bounces`), `identifier` |
| `MelisPrimotextoList` | `name`, `id` |
| `MelisPrimotextoField` | `type` (`STRING`/`DATE`/`NUMBER`), `format`, `listId`, `id`, `value` |
| `MelisPrimotextoContact` | `listId`, `id`, `identifier`, `attributes` |

## Key files

| Concern | Path |
| --- | --- |
| Base service (curl + API key) | `vendor/melisplatform/melis-primotexto/src/Service/MelisPrimotextoBaseService.php` |
| SMS service | `vendor/melisplatform/melis-primotexto/src/Service/MelisPrimotextoSmsService.php` |
| Account service | `vendor/melisplatform/melis-primotexto/src/Service/MelisPrimotextoAccountService.php` |
| List service | `vendor/melisplatform/melis-primotexto/src/Service/MelisPrimotextoListService.php` |
| DTO models | `vendor/melisplatform/melis-primotexto/src/Model/` |
| SMS log table wrapper | `vendor/melisplatform/melis-primotexto/src/Model/Tables/MelisPrimotextoSmsMessageTable.php` |
| Module config | `vendor/melisplatform/melis-primotexto/config/module.config.php` |
| DB migration | `vendor/melisplatform/melis-primotexto/install/dbdeploy/24102501_create_melis_sms_tables.sql` |

See also: [MelisCore](/legacy/reference/modules/melis-core) · [MelisLogin2faPrimotexto](/legacy/reference/modules/melis-login-2fa-primotexto)
