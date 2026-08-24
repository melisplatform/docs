# MelisMessenger

> Messagerie interne entre utilisateurs au sein du back-office Melis, exposée dans le back-office React sous forme d'une icône de notification dans la barre supérieure et d'un onglet « Melis Messenger » dans Mon compte. Paquet `melisplatform/melis-messenger`.

## Présentation

MelisMessenger ajoute un système de messagerie privée léger permettant aux collaborateurs du
back-office de communiquer entre eux. Un utilisateur démarre une conversation avec un ou plusieurs
autres utilisateurs, les messages sont échangés et rafraîchis à intervalle de sondage régulier, et un
badge de non-lus signale les nouveaux messages depuis n'importe quel écran. C'est un outil uniquement
back-office — il n'existe aucun composant front-office.

Dans le back-office React (`/melis-react`), il s'agit d'une **brique native React spéciale, et non
d'un outil du menu de gauche**. Il n'a **aucune entrée de menu latéral ni aucune route** (`route`,
`forwardKey`, `melisKey` valent tous `null`) et branche à la place **deux widgets** sur des points
d'extension de l'hôte :

1. une **icône de messagerie dans la barre supérieure** avec un badge de nombre de non-lus
   (`MessengerHeader.tsx`), et
2. un **onglet « Melis Messenger » dans Mon compte** (`MessengerTab.tsx`), un panneau de discussion
   natif React.

Les composants React n'embarquent **ni `react-api` ni capacités** — ils réutilisent les endpoints
JSON legacy existants du module. La logique métier reste côté serveur dans `MelisMessengerService`.

## Activation

Ajouter dans `config/melis.module.load.php` :

```php
return [
    'MelisMessenger',
];
```

Nécessite `melisplatform/melis-core`. La catégorie du module est `core` avec `dbdeploy` activé, donc
ses tables s'installent via le mécanisme dbdeploy. Les deux surfaces React n'apparaissent **que
lorsque le module est actif** — l'onglet de compte est protégé par
`window.__melisIsModuleActive('MelisMessenger')`, et le widget d'en-tête est enregistré via la
brique, que l'hôte ne charge que pour les modules actifs.

## Dans le back-office React

Il n'y a **aucune entrée de menu latéral** pour Messenger. On y accède de deux façons :

- **L'icône de la barre supérieure** — une bulle de discussion dans l'en-tête du back-office, à côté
  du sélecteur de langue. Un badge rouge affiche votre nombre de non-lus (`99+` au-delà de 99). Un
  clic ouvre **Mon compte** avec l'onglet **Melis Messenger** présélectionné.

![L'icône de messagerie de la barre supérieure (mise en évidence) placée à côté du sélecteur de langue et des autres widgets d'en-tête ; un badge rouge y apparaît lorsque vous avez des messages non lus.](/screenshots/react/melis-messenger/melismessenger-platformheader-iconmessenger.png)

- **L'onglet Melis Messenger** — dans Mon compte (icône bulle de discussion, à côté de Profil). Un
  panneau natif React affichant vos **Contacts** (conversations, les plus récentes en premier) à côté
  du fil de la **conversation** sélectionnée (vos bulles à droite). Un bouton **+** ouvre une
  recherche d'utilisateur pour démarrer une nouvelle conversation, et un composeur en bas vous permet
  de rédiger puis d'**Envoyer**. Ouvrir une conversation la marque comme lue, ce qui fait
  immédiatement chuter le badge de l'en-tête.

![L'onglet React « Melis Messenger » dans Mon compte — la liste des Contacts (avec « + » pour démarrer une nouvelle conversation), le fil de bulles de messages de la conversation sélectionnée, et le composeur « Écrire un message… / Envoyer ». La bascule Nouveau/Ancien (en haut à droite) peut revenir au profil legacy.](/screenshots/react/melis-messenger/melismessenger-tool-profile-tab-messenger.png)

Le badge et le fil ouvert se rafraîchissent sur minuterie, lorsque l'onglet du navigateur reprend le
focus, et dès que vous ouvrez une conversation. Sur un écran étroit (~sous 560 px), l'onglet se
réduit à une seule colonne à la fois (Contacts *ou* conversation) avec un bouton retour, à la manière
d'une application de messagerie mobile. Une bascule **Nouveau / Ancien** sur la page de compte
bascule vers le profil legacy dans une iframe ; dans ce cas, l'icône d'en-tête pilote le DOM de
l'iframe pour ouvrir à la place l'onglet Messenger legacy.

## La brique

L'interface React se trouve dans `ui-react/` et se compile (Vite IIFE, React/ReactRouter externalisés
vers les globales de l'hôte) vers `public/ui-react/brick.js` aux côtés de `brick.manifest.json`. Le
manifeste déclare qu'il ne s'agit pas d'un outil — noter les valeurs nulles :

```json
{ "id": "messenger", "route": null, "label": "Messenger",
  "forwardKey": null, "melisKey": null, "entry": "brick.js" }
```

`ui-react/src/brick.tsx` enregistre **deux surfaces hôtes** pour l'id `messenger`, toutes deux
conditionnées à l'activation du module :

```tsx
// 1) My-Account tab — modular extension point
window.__melisAccountTabs.push({
  id: 'messenger', label: 'Melis Messenger', icon: <ChatIcon />, order: 10,
  render: () => <MessengerTab />,
})
window.dispatchEvent(new CustomEvent('melis-account-tabs-changed'))

// 2) Topbar icon — the brick's Header widget
window.__melisRegisterBrick?.({ id: 'messenger', Header: MessengerHeader })
```

| Composant | Rôle |
| --- | --- |
| `brick.tsx` | Point d'entrée. Enregistre le widget Header et pousse l'onglet Mon compte. |
| `MessengerHeader.tsx` | Icône de la barre supérieure + badge de non-lus. Sonde `getNewMessage` pour le compteur, met en cache le dernier compteur dans `sessionStorage` pour un affichage instantané, recompte au focus/à la visibilité et sur l'événement `melis-messenger-unread-changed`. Un clic ouvre Mon compte et présélectionne l'onglet Messenger. |
| `MessengerTab.tsx` | Le panneau de discussion natif React : liste des Contacts, fil de conversation, composeur, recherche d'utilisateur « nouvelle conversation ». Lit/écrit les endpoints JSON legacy ; responsive ; émet `melis-messenger-unread-changed` lorsqu'il marque une conversation comme lue. |

Comme le bundle n'externalise que `react` / `react-dom` / `react-router-dom` vers les globales de
l'hôte (il ne peut pas importer Tailwind/shadcn/lucide/i18n), les composants utilisent des styles
inline avec les variables CSS de l'hôte et un dictionnaire `{fr,en}` en fichier indexé sur
`document.documentElement.lang`.

## Endpoints réutilisés

Le module n'embarque **aucun `config/react-api.php`**. Les deux composants React appellent les
endpoints JSON legacy existants de `MelisMessenger\Controller\MelisMessengerController` sous
`/melis/MelisMessenger/MelisMessenger/…`, en envoyant `X-Requested-With: XMLHttpRequest` et
`credentials: 'include'`.

**En-tête (`MessengerHeader.tsx`) — le sondeur de badge :**

| Méthode et URL | Rôle |
| --- | --- |
| `GET …/getNewMessage` | Messages non lus → `{ messages: [...] }` ; nombre du badge = `messages.length`. |
| `GET …/getMsgTimeInterval` | Intervalle de sondage de la plateforme `{ interval }` (par défaut 60 000 ms). |

L'en-tête plafonne le sondage à `min(interval, 10 000 ms)` afin que le badge, toujours visible, reste
réactif.

**Onglet Mon compte (`MessengerTab.tsx`) — le panneau de discussion :**

| Méthode et URL | Rôle |
| --- | --- |
| `GET …/getContactListByDate` | Conversations triées par date du dernier message → `{ data: ContactRow[] }`. |
| `GET …/getConversation/:id?limit=&offset=` | Messages d'une conversation → `{ data: Message[], user_id }`. |
| `GET …/getUserListForConversation?search=` | Recherche d'utilisateur pour « nouvelle conversation » → `{ data: UserRow[] }`. |
| `POST …/createConversation` | Démarre une conversation (`mbrids=<userId>`) → `{ conversationId }`. |
| `POST …/saveMessage` | Envoie un message (`msgr_msg_id`, `msgr_msg_cont_message`) → `{ success }`. |
| `POST …/updateMessageStatus` | Marque la conversation ouverte comme lue (`id=<convoId>`) — déclenché à l'ouverture/réponse. |
| `GET …/getMsgTimeInterval` | Intervalle de sondage pour le rafraîchissement du fil. |

`getContactListByDate` et `getUserListForConversation` sont utilisés spécifiquement par l'onglet React
(liste triée par date + recherche d'utilisateur côté serveur) ; les anciennes actions `getContactList`
/ `renderMessenger*` pilotent toujours l'outil legacy et restent inchangées.

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

## Tables de base de données

| Table | Contenu |
| --- | --- |
| `melis_messenger_msg` | Une ligne par conversation (`msgr_msg_id`, `msgr_msg_creator_id`, `msgr_msg_date_created`). |
| `melis_messenger_msg_members` | Utilisateurs participant à une conversation (`msgr_msg_mbr_id`, `msgr_msg_id`, `msgr_msg_mbr_usr_id`). |
| `melis_messenger_msg_content` | Messages individuels (`msgr_msg_cont_id`, expéditeur, texte du message, date, statut). |

## Capacités

**Aucune.** Le module n'a pas de `config/react.capabilities.php` ni de nœud de menu porteur de droits
— ce n'est pas un outil de menu. L'accès est protégé par les endpoints legacy qui exigent une session
back-office authentifiée, et les surfaces sont conditionnées à l'activation du module. Il n'y a aucune
chaîne de capacité `MelisCan(...)` à déclarer ou à vérifier pour Messenger.

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
```

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Config du module (routes, services, contrôleurs) | `vendor/melisplatform/melis-messenger/config/module.config.php` |
| Déclaration de l'interface (onglet Profil legacy + icône d'en-tête) | `vendor/melisplatform/melis-messenger/config/app.interface.php` |
| Config des formulaires | `vendor/melisplatform/melis-messenger/config/app.forms.php` |
| Config des outils | `vendor/melisplatform/melis-messenger/config/app.tools.php` |
| Service public | `vendor/melisplatform/melis-messenger/src/Service/MelisMessengerService.php` |
| Contrôleur principal (endpoints JSON réutilisés par React) | `vendor/melisplatform/melis-messenger/src/Controller/MelisMessengerController.php` |
| Passerelles de tables | `vendor/melisplatform/melis-messenger/src/Model/Tables/` |
| Brique React (widget Header + onglet Mon compte) | `vendor/melisplatform/melis-messenger/ui-react/src/` |
| Brique compilée + manifeste | `vendor/melisplatform/melis-messenger/public/ui-react/brick.js`, `brick.manifest.json` |
| Delta d'installation BDD | `vendor/melisplatform/melis-messenger/install/` |

Voir aussi : [melis-core](/fr/reference/modules/melis-core)
