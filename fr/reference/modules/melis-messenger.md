# MelisMessenger

> Messagerie interne entre utilisateurs dans le back-office Melis. Paquet `melisplatform/melis-messenger`.

## Présentation

MelisMessenger ajoute un système de messagerie privée léger à la plateforme afin que les
collaborateurs du back-office puissent communiquer entre eux. Un utilisateur démarre une conversation
avec un ou plusieurs autres utilisateurs, les messages sont échangés et rafraîchis à intervalle
régulier, et une icône dans l'en-tête signale les nouveaux messages non lus. C'est un outil
uniquement back-office — il n'existe aucun composant front-office.

## Activation

Ajouter dans `config/melis.module.load.php` :

```php
return [
    'MelisMessenger',
];
```

Nécessite `melisplatform/melis-core` (`^5.2`). La catégorie du module est `core` avec `dbdeploy`
activé, donc ses tables s'installent via le mécanisme dbdeploy.

## Services principaux

| Alias | Rôle |
| --- | --- |
| `MelisMessengerService` | Service public de messagerie : envoyer et lire messages/conversations. |
| `MelisMessengerMsgTable` | Passerelle de table pour `melis_messenger_msg`. |
| `MelisMessengerMsgContentTable` | Passerelle de table pour `melis_messenger_msg_content`. |
| `MelisMessengerMsgMembersTable` | Passerelle de table pour `melis_messenger_msg_members`. |

Les méthodes de `MelisMessengerService` déclenchent les événements `melismessenger_*_start` / `*_end`
pour chaque appel de lecture/liste (ex. `melismessenger_get_conversation_start` / `_end`) :

| Méthode | Rôle |
| --- | --- |
| `saveMsg($data)` | Crée/met à jour une conversation ; retourne l'id de conversation. |
| `saveMsgMembers($data)` | Rattache un utilisateur à une conversation. |
| `saveMsgContent($data)` | Enregistre un message dans une conversation. |
| `getConversation($id)` | Récupère une conversation complète par id. |
| `getConversationWithLimit($id, $limit, $offset)` | Récupération paginée de la conversation. |
| `getNewMessage($id)` | Récupère les nouveaux messages non lus depuis le dernier sondage. |
| `updateMessageStatus($data, $msg_id, $user_id)` | Marque les messages comme lus pour un utilisateur. |
| `getContactList($convo_id, $user_id)` | Résout les contacts d'une conversation. |
| `prepareConversationId($userId)` | Liste les ids de conversation auxquels un utilisateur appartient. |
| `getUserRightsForMessenger()` | Vérifie les droits d'accès de l'utilisateur courant au module. |

## Back-office

Le module apparaît dans le back-office via `config/app.interface.php` :

- Un **onglet Messenger** dans l'écran du profil utilisateur — melisKey `melismessenger_tool` (icône
  `comments`), injecté sous `meliscore_user_profile_tabs`.
- Une **icône de notification dans l'en-tête** — injectée sous `meliscore_header`, signale les
  nouveaux messages non lus depuis n'importe quel écran du back-office.
- Le fil de discussion se rafraîchit automatiquement toutes les `msg_interval` millisecondes
  (par défaut 60 000 ms).

Toutes les actions se trouvent dans `MelisMessenger\Controller\MelisMessengerController` :

| Action | Présentation |
| --- | --- |
| `renderMessengerAction` | Affiche l'onglet Messenger du profil. |
| `renderMessengerToolContentAction` | Affiche le contenu du fil de conversation. |
| `renderMessengerContactAction` | Affiche le sélecteur de contacts/destinataires. |
| `headerMessengerAction` | Affiche l'icône de notification dans l'en-tête. |
| `createConversationAction` | AJAX — crée une conversation. |
| `saveMessageAction` | AJAX — envoie un message. |
| `getConversationAction` | AJAX — récupère une conversation. |
| `getNewMessageAction` | AJAX — sonde les nouveaux messages. |
| `getLastMessageAction` | AJAX — récupère le dernier message. |
| `updateMessageStatusAction` | AJAX — marque les messages comme lus. |
| `getContactListAction` | AJAX — récupère la liste des contacts. |
| `getMsgTimeIntervalAction` | AJAX — retourne l'intervalle de sondage. |
| `getUserRightsForMessengerAction` | AJAX — retourne les droits de l'utilisateur. |

Le sélecteur de destinataires utilise la bibliothèque **tokenize2** (`public/plugins/tokenize2.*`)
via l'élément de formulaire `MelisMessengerInput` (un champ tokenize2 multi-destinataires).

## Tables de base de données

| Table | Contenu |
| --- | --- |
| `melis_messenger_msg` | Une ligne par conversation (`msgr_msg_id`, `msgr_msg_creator_id`, `msgr_msg_date_created`). |
| `melis_messenger_msg_members` | Utilisateurs participant à une conversation (`msgr_msg_mbr_id`, `msgr_msg_id`, `msgr_msg_mbr_usr_id`). |
| `melis_messenger_msg_content` | Messages individuels (`msgr_msg_cont_id`, expéditeur, texte du message, date, statut). |

## Exemple

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

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Config du module (routes, services, contrôleurs) | `vendor/melisplatform/melis-messenger/config/module.config.php` |
| Déclaration de l'interface (onglet profil + en-tête) | `vendor/melisplatform/melis-messenger/config/app.interface.php` |
| Config des formulaires | `vendor/melisplatform/melis-messenger/config/app.forms.php` |
| Config des outils | `vendor/melisplatform/melis-messenger/config/app.tools.php` |
| Service public | `vendor/melisplatform/melis-messenger/src/Service/MelisMessengerService.php` |
| Contrôleur principal | `vendor/melisplatform/melis-messenger/src/Controller/MelisMessengerController.php` |
| Passerelles de tables | `vendor/melisplatform/melis-messenger/src/Model/Tables/` |
| Élément de formulaire sélecteur de destinataires | `vendor/melisplatform/melis-messenger/src/Form/Factory/MelisMessengerInputFactory.php` |
| Delta d'installation BDD | `vendor/melisplatform/melis-messenger/install/` |

Voir aussi : [melis-core](/fr/reference/modules/melis-core)
