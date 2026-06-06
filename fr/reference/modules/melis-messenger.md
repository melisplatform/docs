# MelisMessenger

> Messagerie interne entre utilisateurs dans le backoffice Melis. Paquet `melisplatform/melis-messenger`.

## Objectif

MelisMessenger ajoute un systeme de messagerie privee leger a la plateforme afin que les
collaborateurs du backoffice puissent echanger entre eux. Un utilisateur ouvre une conversation
avec un ou plusieurs autres utilisateurs, les messages sont echanges et rafraichis a intervalle
regulier, et une icone dans l'en-tete signale les nouveaux messages (non lus). C'est un outil
purement backoffice — il n'y a aucun composant front-office.

## Activation

MelisMessenger est un module Laminas standard. Il est livre active dans le squelette via
`config/melis.module.load.php` (entree `'MelisMessenger'`). Si vous l'ajoutez manuellement, ajoutez
cette entree a la liste de chargement, puis deployez son delta de base de donnees. Il depend de
`melis-core` (`^5.2`) ; la categorie du module est `core` et `dbdeploy` est active, donc ses tables
s'installent via le mecanisme dbdeploy. Voir la [reference des modules](/fr/reference/modules).

## Services cles

Declares sous les alias `service_manager` dans `config/module.config.php`.

| Alias | Role |
| --- | --- |
| `MelisMessengerService` | Le service public de messagerie. Envoyer et lire messages/conversations. |
| `MelisMessengerMsgTable` | Passerelle de table des conversations (`melis_messenger_msg`). |
| `MelisMessengerMsgContentTable` | Passerelle de table du contenu des messages (`melis_messenger_msg_content`). |
| `MelisMessengerMsgMembersTable` | Passerelle de table des membres de conversation (`melis_messenger_msg_members`). |

`MelisMessengerService` (etend `MelisGeneralService`, donc chaque methode declenche les evenements
`melismessenger_*_start` / `_end`) expose :

| Methode | Role |
| --- | --- |
| `saveMsg($data)` | Cree/enregistre une conversation ; retourne l'id de conversation. |
| `saveMsgMembers($data)` | Rattache des membres (utilisateurs) a une conversation. |
| `saveMsgContent($data)` | Enregistre un message dans une conversation. |
| `getConversation($id)` | Recupere une conversation complete par id. |
| `getConversationWithLimit($id, $limit = 10, $offset = 0)` | Recuperation paginee de la conversation. |
| `getNewMessage($id)` | Recupere les nouveaux messages (non lus). |
| `updateMessageStatus($data, $msg_id, $user_id)` | Marque les messages comme lus/mis a jour pour un utilisateur. |
| `getContactList($convo_id, $user_id)` | Resout les contacts d'une conversation. |
| `prepareConversationId($userId)` | Liste les ids de conversation auxquels un utilisateur appartient (createur + membre). |
| `getUserRightsForMessenger()` | Verifie le droit d'acces de l'utilisateur courant a `/melismessenger`. |

## Backoffice

Le module apparait dans le backoffice via `config/app.tools.php` et `config/app.interface.php` :

- Un **onglet Messenger** dans l'ecran du profil utilisateur — declare avec la melisKey
  `melismessenger_tool` (renvoie vers le controleur `MelisMessenger`, action `render-messenger`),
  avec les cles imbriquees `melismessenger_tool_content` (`render-messenger-tool-content`) et
  `melismessenger_tool_contact` (`render-messenger-contact`).
- Un **widget de notification** dans l'en-tete — melisKey `melismessenger_tool_header_messages`,
  injecte dans `meliscore_header`, renvoyant vers l'action `header-messenger`.
- L'outil est enregistre sous le plugin d'interface `melistoolmessenger` ; les messages se
  rafraichissent automatiquement selon l'intervalle `msg_interval` defini dans `app.interface.php`
  (par defaut 60000 ms / 1 min).

Toutes les actions vivent dans `MelisMessenger\Controller\MelisMessengerController` (ex.
`createConversationAction`, `saveMessageAction`, `getConversationAction`, `getNewMessageAction`,
`getContactListAction`, `updateMessageStatusAction`). `MelisSetupController` gere le formulaire
d'installation autonome. Pour creer vos propres outils backoffice, voir
[Creer un outil](/fr/guide/create-a-tool).

## Front office

Aucun. MelisMessenger ne fournit pas de plugins de templating, de view helpers ni de controller
plugins — c'est uniquement un outil de messagerie backoffice.

## Tables de base de donnees

Installees par `install/dbdeploy/1112618_melis_messenger_install.sql`.

| Table | Role |
| --- | --- |
| `melis_messenger_msg` | Une ligne par conversation (`msgr_msg_id`, createur, date de creation). |
| `melis_messenger_msg_content` | Les messages individuels (expediteur, texte, date, statut). |
| `melis_messenger_msg_members` | Les utilisateurs participant a une conversation. |

## Exemple

```php
// Dans un controleur backoffice (service disponible via le service manager)
$messenger = $this->getServiceManager()->get('MelisMessengerService');

// Ouvrir une conversation, rattacher des membres, puis poster un message
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

## Fichiers cles

| Sujet | Chemin |
| --- | --- |
| Config du module (routes, services, controleurs) | `vendor/melisplatform/melis-messenger/config/module.config.php` |
| Declaration de l'outil backoffice | `vendor/melisplatform/melis-messenger/config/app.tools.php` |
| Interface (onglet profil + en-tete) | `vendor/melisplatform/melis-messenger/config/app.interface.php` |
| Service public | `vendor/melisplatform/melis-messenger/src/Service/MelisMessengerService.php` |
| Controleur principal | `vendor/melisplatform/melis-messenger/src/Controller/MelisMessengerController.php` |
| Passerelles de tables | `vendor/melisplatform/melis-messenger/src/Model/Tables/` |
| Delta d'installation BDD | `vendor/melisplatform/melis-messenger/install/dbdeploy/1112618_melis_messenger_install.sql` |
| Assets front-end | `vendor/melisplatform/melis-messenger/public/js/tools/messenger-tool.js`, `public/css/messenger-tool.css` |
