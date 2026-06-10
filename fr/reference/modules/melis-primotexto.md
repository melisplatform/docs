# MelisPrimotexto

> Connecteur SMS headless — envoie et gère les messages texte via l'API Primotexto. Package `melisplatform/melis-primotexto`.

## Présentation

MelisPrimotexto est une intégration headless de passerelle SMS : pas d'interface back-office, uniquement des services PHP à appeler depuis votre propre module ou code. Il encapsule l'**API Primotexto v2** (`https://api.primotexto.com/v2/`) pour envoyer des SMS transactionnels ou marketing, suivre les statuts de livraison et les réponses, gérer les listes de contacts et leurs champs, et maintenir des listes noires au niveau du compte (désabonnés, bounces). Chaque SMS sortant est enregistré dans une table locale `melis_sms_messages`. Les trois services étendent `MelisGeneralService` de `MelisCore` et s'exécutent dans le système d'événements de la plateforme Melis.

## Activation

Ajouter dans `config/melis.module.load.php` :

```php
return [
    'MelisPrimotexto',
];
```

Requiert PHP `^8.1|^8.3`. **MelisCore** doit être présent à l'exécution (fournit `MelisGeneralService` ; non déclaré dans `composer.json` — fourni par la plateforme). Un **compte Primotexto** et sa **clé API** sont obligatoires avant tout appel de service.

## Services principaux

| Alias de service | Rôle |
| --- | --- |
| `MelisPrimotextoSmsService` | Envoyer des SMS, interroger le statut de livraison, récupérer les réponses (callbacks), les statistiques par catégorie, les listes noires au niveau du message, et vérifier la validité d'un numéro de téléphone |
| `MelisPrimotextoAccountService` | Lire les statistiques du compte ; gérer les listes noires au niveau du compte (désabonnés / bounces) |
| `MelisPrimotextoListService` | Créer, lire et supprimer des listes de contacts, lister les champs personnalisés et les contacts qu'elles contiennent |

**Définir toujours la clé API avant d'appeler toute méthode** — `ensureLogin()` lève une exception si la clé est vide :

```php
$sms = $serviceManager->get('MelisPrimotextoSmsService');
$sms->setApiKey('YOUR_PRIMOTEXTO_API_KEY');
```

## Tables de base de données

| Table | Contenu |
| --- | --- |
| `melis_sms_messages` | Journal de chaque SMS sortant : `sms_id`, `sms_number`, `sms_snapshot_id`, `sms_message`, `sms_type`, `sms_sender`, `sms_campaign_name`, `sms_category`, `sms_date` |

## Exemple

```php
// --- Envoyer un SMS ---
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
// En cas de succès, la passerelle retourne un snapshotId ; une ligne est sauvegardée dans melis_sms_messages.

// --- Listes noires du compte ---
$acct = $serviceManager->get('MelisPrimotextoAccountService');
$acct->setApiKey($apiKey);
$acct->accountStats();
$acct->accountBlacklists($bl);    // $bl->type = 'unsubscribers' | 'bounces'
$acct->accountBlacklistsAdd($bl); // + $bl->identifier
$acct->accountBlacklistsDel($bl);

// --- Listes de contacts ---
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
$lists->delContact($contact);     // par id OU identifier
```

## Modèles DTO

Objets de type property-bag passés aux services et encodés en JSON dans les charges utiles de l'API :

| Modèle | Propriétés clés |
| --- | --- |
| `MelisPrimotextoSms` | `type`, `number`, `message`, `sender`, `campaignName`, `category`, `date`, `identifier`, `snapshotId` |
| `MelisPrimotextoBlacklist` | `type` (`unsubscribers`/`bounces`), `identifier` |
| `MelisPrimotextoList` | `name`, `id` |
| `MelisPrimotextoField` | `type` (`STRING`/`DATE`/`NUMBER`), `format`, `listId`, `id`, `value` |
| `MelisPrimotextoContact` | `listId`, `id`, `identifier`, `attributes` |

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Service de base (curl + clé API) | `vendor/melisplatform/melis-primotexto/src/Service/MelisPrimotextoBaseService.php` |
| Service SMS | `vendor/melisplatform/melis-primotexto/src/Service/MelisPrimotextoSmsService.php` |
| Service compte | `vendor/melisplatform/melis-primotexto/src/Service/MelisPrimotextoAccountService.php` |
| Service listes | `vendor/melisplatform/melis-primotexto/src/Service/MelisPrimotextoListService.php` |
| Modèles DTO | `vendor/melisplatform/melis-primotexto/src/Model/` |
| Wrapper table journal SMS | `vendor/melisplatform/melis-primotexto/src/Model/Tables/MelisPrimotextoSmsMessageTable.php` |
| Configuration du module | `vendor/melisplatform/melis-primotexto/config/module.config.php` |
| Migration DB | `vendor/melisplatform/melis-primotexto/install/dbdeploy/24102501_create_melis_sms_tables.sql` |

Voir aussi : [MelisCore](/fr/reference/modules/melis-core) · [MelisLogin2faPrimotexto](/fr/reference/modules/melis-login-2fa-primotexto)
