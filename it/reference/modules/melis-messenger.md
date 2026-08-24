# MelisMessenger

> Sistema di messaggistica interna da utente a utente all'interno del back-office di Melis, esposto nel back-office React come icona di notifica nella barra superiore e come scheda "Melis Messenger" in Il mio account. Pacchetto `melisplatform/melis-messenger`.

## Scopo

MelisMessenger aggiunge un leggero sistema di messaggistica privata così che i collaboratori del
back-office possano comunicare tra loro. Un utente avvia una conversazione con uno o più altri utenti,
i messaggi vengono scambiati e aggiornati a intervalli di polling, e un badge dei non letti segnala i
nuovi messaggi da qualsiasi schermata. È uno strumento riservato al back-office — non esiste alcun
componente per il front-office.

Nel back-office React (`/melis-react`) è un **brick nativo-React speciale, non uno strumento del menu
laterale**. Non ha **né voce nella barra laterale né rotta** (`route`, `forwardKey`, `melisKey` sono
tutti `null`) e integra invece **due widget** nei punti di estensione dell'host:

1. un'**icona messenger nella barra superiore** con un badge del conteggio dei non letti (`MessengerHeader.tsx`), e
2. una **scheda "Melis Messenger" all'interno di Il mio account** (`MessengerTab.tsx`), un pannello di chat React nativo.

I componenti React vengono forniti **senza `react-api` e senza capacità** — riutilizzano gli endpoint
JSON legacy esistenti del modulo. La logica di business rimane lato server in `MelisMessengerService`.

## Come abilitarlo

Aggiungi a `config/melis.module.load.php`:

```php
return [
    'MelisMessenger',
];
```

Richiede `melisplatform/melis-core`. La categoria del modulo è `core` con `dbdeploy` abilitato, quindi
le sue tabelle vengono installate tramite il meccanismo dbdeploy. Entrambe le superfici React compaiono
**solo quando il modulo è attivo** — la scheda dell'account è protetta da
`window.__melisIsModuleActive('MelisMessenger')`, e il widget dell'intestazione è registrato tramite il
brick, che l'host carica solo per i moduli attivi.

## Nel back-office React

**Non esiste alcuna voce nella barra laterale** per Messenger. Vi si accede in due modi:

- **L'icona nella barra superiore** — una nuvoletta di chat nell'intestazione del back-office, accanto
  al selettore della lingua. Un badge rosso mostra il conteggio dei messaggi non letti (`99+` oltre 99).
  Cliccandola si apre **Il mio account** con la scheda **Melis Messenger** già selezionata.

![L'icona messenger nella barra superiore (evidenziata) accanto al selettore della lingua e agli altri widget dell'intestazione; su di essa compare un badge rosso quando hai messaggi non letti.](/screenshots/react/melis-messenger/melismessenger-platformheader-iconmessenger.png)

- **La scheda Melis Messenger** — all'interno di Il mio account (icona nuvoletta di chat, accanto a
  Profilo). Un pannello React nativo che mostra i tuoi **Contatti** (le conversazioni, dalla più recente)
  accanto al thread della **conversazione** selezionata (le tue bolle sulla destra). Un pulsante **+**
  apre una ricerca di utenti per avviare una nuova conversazione, e un compositore in basso ti permette
  di scrivere e **Inviare**. L'apertura di una conversazione la segna come letta, così il badge
  dell'intestazione cala immediatamente.

![La scheda React "Melis Messenger" all'interno di Il mio account — l'elenco Contatti (con "+" per avviare una nuova conversazione), il thread di bolle di messaggi della conversazione selezionata e il compositore "Write a message… / Send". L'interruttore New/Old (in alto a destra) può ripiegare sul profilo legacy.](/screenshots/react/melis-messenger/melismessenger-tool-profile-tab-messenger.png)

Il badge e il thread aperto si aggiornano con un timer, quando la scheda del browser riacquista il focus
e non appena apri una conversazione. Su uno schermo stretto (~sotto i 560px) la scheda si riduce a una
colonna per volta (Contatti *o* conversazione) con un pulsante Indietro, come un'app di chat mobile. Un
interruttore **New / Old** sulla pagina dell'account ripiega sul profilo legacy in un iframe; in tal caso
l'icona dell'intestazione manipola il DOM dell'iframe per aprire invece la scheda Messenger legacy.

## Il brick

L'interfaccia React risiede in `ui-react/` e viene compilata (Vite IIFE, React/ReactRouter esternalizzati
verso le variabili globali dell'host) in `public/ui-react/brick.js` insieme a `brick.manifest.json`. Il
manifest dichiara che non si tratta di uno strumento — nota i valori null:

```json
{ "id": "messenger", "route": null, "label": "Messenger",
  "forwardKey": null, "melisKey": null, "entry": "brick.js" }
```

`ui-react/src/brick.tsx` registra **due superfici host** per l'id `messenger`, entrambe subordinate
all'attivazione del modulo:

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

| Componente | Ruolo |
| --- | --- |
| `brick.tsx` | Punto di ingresso. Registra il widget Header e aggiunge la scheda Il mio account. |
| `MessengerHeader.tsx` | Icona della barra superiore + badge dei non letti. Interroga `getNewMessage` per il conteggio, memorizza l'ultimo conteggio in `sessionStorage` per un rendering immediato, ricalcola su focus/visibilità e sull'evento `melis-messenger-unread-changed`. Il clic apre Il mio account e preseleziona la scheda Messenger. |
| `MessengerTab.tsx` | Il pannello di chat React nativo: elenco Contatti, thread della conversazione, compositore, ricerca utenti per la "nuova conversazione". Legge/scrive gli endpoint JSON legacy; responsive; invia `melis-messenger-unread-changed` quando segna una conversazione come letta. |

Poiché il bundle esternalizza solo `react` / `react-dom` / `react-router-dom` verso le variabili globali
dell'host (non può importare Tailwind/shadcn/lucide/i18n), i componenti usano stili inline con variabili
CSS dell'host e un dizionario `{fr,en}` interno al file, indicizzato su `document.documentElement.lang`.

## Endpoint riutilizzati

Il modulo non viene fornito con alcun **`config/react-api.php`**. Entrambi i componenti React chiamano
gli endpoint JSON legacy esistenti di `MelisMessenger\Controller\MelisMessengerController` sotto
`/melis/MelisMessenger/MelisMessenger/…`, inviando `X-Requested-With: XMLHttpRequest` e
`credentials: 'include'`.

**Header (`MessengerHeader.tsx`) — il poller del badge:**

| Metodo e URL | Scopo |
| --- | --- |
| `GET …/getNewMessage` | Messaggi non letti → `{ messages: [...] }`; conteggio del badge = `messages.length`. |
| `GET …/getMsgTimeInterval` | Intervallo di polling della piattaforma `{ interval }` (predefinito 60 000 ms). |

L'header limita il polling a `min(interval, 10 000 ms)` così che il badge, sempre visibile, resti reattivo.

**Scheda Il mio account (`MessengerTab.tsx`) — il pannello di chat:**

| Metodo e URL | Scopo |
| --- | --- |
| `GET …/getContactListByDate` | Conversazioni ordinate per data dell'ultimo messaggio → `{ data: ContactRow[] }`. |
| `GET …/getConversation/:id?limit=&offset=` | I messaggi di una conversazione → `{ data: Message[], user_id }`. |
| `GET …/getUserListForConversation?search=` | Ricerca utenti per la "nuova conversazione" → `{ data: UserRow[] }`. |
| `POST …/createConversation` | Avvia una conversazione (`mbrids=<userId>`) → `{ conversationId }`. |
| `POST …/saveMessage` | Invia un messaggio (`msgr_msg_id`, `msgr_msg_cont_message`) → `{ success }`. |
| `POST …/updateMessageStatus` | Segna come letta la conversazione aperta (`id=<convoId>`) — attivato all'apertura/risposta. |
| `GET …/getMsgTimeInterval` | Intervallo di polling per l'aggiornamento del thread. |

`getContactListByDate` e `getUserListForConversation` sono usati specificamente dalla scheda React
(elenco ordinato per data + ricerca utenti lato server); le vecchie azioni `getContactList` /
`renderMessenger*` continuano a gestire lo strumento legacy e sono lasciate invariate.

## Servizi principali

| Alias | Ruolo |
| --- | --- |
| `MelisMessengerService` | Servizio pubblico per la messaggistica: invio e lettura di messaggi/conversazioni. |
| `MelisMessengerMsgTable` | Gateway di tabella per `melis_messenger_msg`. |
| `MelisMessengerMsgContentTable` | Gateway di tabella per `melis_messenger_msg_content`. |
| `MelisMessengerMsgMembersTable` | Gateway di tabella per `melis_messenger_msg_members`. |

I metodi di `MelisMessengerService` emettono gli eventi `melismessenger_*_start` / `*_end` per ogni
chiamata di lettura/elenco (ad es. `melismessenger_get_conversation_start` / `_end`):

| Metodo | Ruolo |
| --- | --- |
| `saveMsg($data)` | Crea/aggiorna una conversazione; restituisce l'id della conversazione. |
| `saveMsgMembers($data)` | Associa un utente a una conversazione. |
| `saveMsgContent($data)` | Salva un messaggio all'interno di una conversazione. |
| `getConversation($id)` | Recupera una conversazione completa tramite id. |
| `getConversationWithLimit($id, $limit, $offset)` | Recupero paginato della conversazione. |
| `getNewMessage($id)` | Recupera i messaggi nuovi/non letti dall'ultimo polling. |
| `updateMessageStatus($data, $msg_id, $user_id)` | Segna i messaggi come letti per un utente. |
| `getContactList($convo_id, $user_id)` | Risolve i contatti di una conversazione. |
| `prepareConversationId($userId)` | Elenca gli id delle conversazioni a cui appartiene un utente. |
| `getUserRightsForMessenger()` | Verifica i diritti di accesso dell'utente corrente al modulo. |

## Tabelle del database

| Tabella | Contiene |
| --- | --- |
| `melis_messenger_msg` | Una riga per conversazione (`msgr_msg_id`, `msgr_msg_creator_id`, `msgr_msg_date_created`). |
| `melis_messenger_msg_members` | Utenti che partecipano a una conversazione (`msgr_msg_mbr_id`, `msgr_msg_id`, `msgr_msg_mbr_usr_id`). |
| `melis_messenger_msg_content` | Singoli messaggi (`msgr_msg_cont_id`, mittente, testo del messaggio, data, stato). |

## Capacità

**Nessuna.** Il modulo non ha alcun `config/react.capabilities.php` né alcun nodo di menu con diritti —
non è uno strumento del menu. L'accesso è protetto dagli endpoint legacy che richiedono una sessione
di back-office autenticata, e le superfici sono subordinate all'attivazione del modulo. Non ci sono
stringhe di capacità `MelisCan(...)` da dichiarare o verificare per Messenger.

## Esempio

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

## File chiave

| Ambito | Percorso |
| --- | --- |
| Configurazione del modulo (rotte, servizi, controller) | `vendor/melisplatform/melis-messenger/config/module.config.php` |
| Dichiarazione dell'interfaccia (scheda Profilo legacy + icona intestazione) | `vendor/melisplatform/melis-messenger/config/app.interface.php` |
| Configurazione dei form | `vendor/melisplatform/melis-messenger/config/app.forms.php` |
| Configurazione degli strumenti | `vendor/melisplatform/melis-messenger/config/app.tools.php` |
| Servizio pubblico | `vendor/melisplatform/melis-messenger/src/Service/MelisMessengerService.php` |
| Controller principale (endpoint JSON riutilizzati da React) | `vendor/melisplatform/melis-messenger/src/Controller/MelisMessengerController.php` |
| Gateway di tabella | `vendor/melisplatform/melis-messenger/src/Model/Tables/` |
| Brick React (widget Header + scheda Il mio account) | `vendor/melisplatform/melis-messenger/ui-react/src/` |
| Brick compilato + manifest | `vendor/melisplatform/melis-messenger/public/ui-react/brick.js`, `brick.manifest.json` |
| Delta di installazione DB | `vendor/melisplatform/melis-messenger/install/` |

Vedi anche: [melis-core](/it/reference/modules/melis-core)
