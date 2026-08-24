# MelisMessenger

> Internes Benutzer-zu-Benutzer-Messaging innerhalb des Melis-Backoffice, im React-Backoffice als Benachrichtigungssymbol in der Kopfleiste sowie als Registerkarte „Melis Messenger" unter „Mein Konto" dargestellt. Paket `melisplatform/melis-messenger`.

## Zweck

MelisMessenger fügt ein schlankes System für private Nachrichten hinzu, damit Backoffice-Mitarbeiter miteinander
kommunizieren können. Ein Benutzer startet eine Unterhaltung mit einem oder mehreren anderen Benutzern, Nachrichten werden ausgetauscht und
in einem Abrufintervall aktualisiert, und ein Ungelesen-Abzeichen macht neue Nachrichten von jedem Bildschirm aus sichtbar. Es handelt sich um ein
reines Backoffice-Werkzeug — es gibt keine Frontoffice-Komponente.

Im React-Backoffice (`/melis-react`) ist es ein **spezieller nativer React-Baustein, kein Werkzeug im linken
Menü**. Es hat **keinen Eintrag in der Seitenleiste und keine Route** (`route`, `forwardKey`, `melisKey` sind allesamt `null`)
und bindet stattdessen **zwei Widgets** in Erweiterungspunkte des Hosts ein:

1. ein **Messenger-Symbol in der Kopfleiste** mit einem Abzeichen für die Anzahl ungelesener Nachrichten (`MessengerHeader.tsx`) und
2. eine **Registerkarte „Melis Messenger" innerhalb von „Mein Konto"** (`MessengerTab.tsx`), ein natives React-Chat-Panel.

Die React-Komponenten liefern **keine `react-api` und keine Capabilities** — sie verwenden die bestehenden
Legacy-JSON-Endpunkte des Moduls wieder. Die Geschäftslogik verbleibt serverseitig in `MelisMessengerService`.

## Aktivierung

Fügen Sie zu `config/melis.module.load.php` hinzu:

```php
return [
    'MelisMessenger',
];
```

Erfordert `melisplatform/melis-core`. Die Modulkategorie ist `core` mit aktiviertem `dbdeploy`, sodass seine
Tabellen über den dbdeploy-Mechanismus installiert werden. Beide React-Oberflächen erscheinen **nur, wenn das Modul
aktiv ist** — die Kontoregisterkarte ist durch `window.__melisIsModuleActive('MelisMessenger')` abgesichert, und das
Kopfleisten-Widget wird über den Baustein registriert, den der Host nur für aktive Module lädt.

## Im React-Backoffice

Es gibt **keinen Seitenleisteneintrag** für den Messenger. Sie erreichen ihn auf zwei Wegen:

- **Das Symbol in der Kopfleiste** — eine Sprechblase in der Backoffice-Kopfleiste, neben dem Sprachumschalter.
  Ein rotes Abzeichen zeigt Ihre Anzahl ungelesener Nachrichten an (`99+` bei über 99). Ein Klick darauf öffnet **Mein Konto** mit
  vorausgewählter Registerkarte **Melis Messenger**.

![Das Messenger-Symbol in der Kopfleiste (hervorgehoben) neben dem Sprachumschalter und den übrigen Kopfleisten-Widgets; ein rotes Abzeichen erscheint darauf, wenn Sie ungelesene Nachrichten haben.](/screenshots/react/melis-messenger/melismessenger-platformheader-iconmessenger.png)

- **Die Registerkarte Melis Messenger** — innerhalb von „Mein Konto" (Sprechblasen-Symbol, neben „Profil"). Ein natives
  React-Panel, das Ihre **Kontakte** (Unterhaltungen, neueste zuerst) neben dem ausgewählten
  **Unterhaltungs**-Verlauf anzeigt (Ihre Sprechblasen auf der rechten Seite). Eine **+**-Schaltfläche öffnet eine Benutzersuche, um
  eine neue Unterhaltung zu starten, und ein Eingabefeld am unteren Rand ermöglicht das Schreiben und **Senden**. Das Öffnen einer
  Unterhaltung markiert sie als gelesen, sodass das Kopfleisten-Abzeichen sofort sinkt.

![Die React-Registerkarte „Melis Messenger" innerhalb von „Mein Konto" — die Kontaktliste (mit „+" zum Starten einer neuen Unterhaltung), der ausgewählte Unterhaltungsverlauf mit Nachrichten-Sprechblasen und das Eingabefeld „Write a message… / Send". Der New/Old-Umschalter (oben rechts) kann auf das Legacy-Profil zurückfallen.](/screenshots/react/melis-messenger/melismessenger-tool-profile-tab-messenger.png)

Das Abzeichen und der geöffnete Verlauf werden per Timer aktualisiert, wenn die Browser-Registerkarte den Fokus zurückerlangt, sowie
sobald Sie eine Unterhaltung öffnen. Auf einem schmalen Bildschirm (~unter 560 px) klappt die Registerkarte auf jeweils eine Spalte
zusammen (Kontakte *oder* Unterhaltung) mit einer Zurück-Schaltfläche, ähnlich einer mobilen Chat-App. Ein **New / Old**-Umschalter
auf der Kontoseite fällt in einem iframe auf das Legacy-Profil zurück; in diesem Fall steuert das Kopfleisten-Symbol
das iframe-DOM, um stattdessen die Legacy-Messenger-Registerkarte zu öffnen.

## Der Baustein

Die React-Oberfläche befindet sich in `ui-react/` und wird (Vite IIFE, React/ReactRouter ausgelagert an die
Host-Globals) nach `public/ui-react/brick.js` neben `brick.manifest.json` gebaut. Das Manifest erklärt,
dass dies kein Werkzeug ist — beachten Sie die `null`-Werte:

```json
{ "id": "messenger", "route": null, "label": "Messenger",
  "forwardKey": null, "melisKey": null, "entry": "brick.js" }
```

`ui-react/src/brick.tsx` registriert **zwei Host-Oberflächen** für die id `messenger`, beide abhängig von der
Modulaktivierung:

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

| Komponente | Rolle |
| --- | --- |
| `brick.tsx` | Einstiegspunkt. Registriert das Header-Widget und fügt die Registerkarte in „Mein Konto" ein. |
| `MessengerHeader.tsx` | Symbol in der Kopfleiste + Ungelesen-Abzeichen. Ruft `getNewMessage` für die Anzahl ab, speichert die letzte Anzahl in `sessionStorage` zwischen für sofortiges Rendern, zählt bei Fokus/Sichtbarkeit und beim Ereignis `melis-messenger-unread-changed` neu. Ein Klick öffnet „Mein Konto" und wählt die Messenger-Registerkarte vor. |
| `MessengerTab.tsx` | Das native React-Chat-Panel: Kontaktliste, Unterhaltungsverlauf, Eingabefeld, Benutzersuche für „neue Unterhaltung". Liest/schreibt die Legacy-JSON-Endpunkte; responsiv; löst `melis-messenger-unread-changed` aus, wenn es eine Unterhaltung als gelesen markiert. |

Da das Bundle nur `react` / `react-dom` / `react-router-dom` an die Host-Globals auslagert
(es kann Tailwind/shadcn/lucide/i18n nicht importieren), verwenden die Komponenten Inline-Styles mit Host-CSS-Variablen
und ein in der Datei enthaltenes `{fr,en}`-Wörterbuch, das nach `document.documentElement.lang` verschlüsselt wird.

## Wiederverwendete Endpunkte

Das Modul liefert **keine `config/react-api.php`**. Beide React-Komponenten rufen die bestehenden Legacy-JSON-
Endpunkte von `MelisMessenger\Controller\MelisMessengerController` unter
`/melis/MelisMessenger/MelisMessenger/…` auf und senden dabei `X-Requested-With: XMLHttpRequest` und
`credentials: 'include'`.

**Header (`MessengerHeader.tsx`) — der Badge-Poller:**

| Methode & URL | Zweck |
| --- | --- |
| `GET …/getNewMessage` | Ungelesene Nachrichten → `{ messages: [...] }`; Abzeichenanzahl = `messages.length`. |
| `GET …/getMsgTimeInterval` | Plattform-Abrufintervall `{ interval }` (Standard 60 000 ms). |

Der Header begrenzt das Abrufen auf `min(interval, 10 000 ms)`, damit das stets sichtbare Abzeichen reaktionsfähig bleibt.

**Registerkarte „Mein Konto" (`MessengerTab.tsx`) — das Chat-Panel:**

| Methode & URL | Zweck |
| --- | --- |
| `GET …/getContactListByDate` | Unterhaltungen sortiert nach dem Datum der letzten Nachricht → `{ data: ContactRow[] }`. |
| `GET …/getConversation/:id?limit=&offset=` | Die Nachrichten einer Unterhaltung → `{ data: Message[], user_id }`. |
| `GET …/getUserListForConversation?search=` | Benutzersuche für „neue Unterhaltung" → `{ data: UserRow[] }`. |
| `POST …/createConversation` | Eine Unterhaltung starten (`mbrids=<userId>`) → `{ conversationId }`. |
| `POST …/saveMessage` | Eine Nachricht senden (`msgr_msg_id`, `msgr_msg_cont_message`) → `{ success }`. |
| `POST …/updateMessageStatus` | Die geöffnete Unterhaltung als gelesen markieren (`id=<convoId>`) — beim Öffnen/Antworten ausgelöst. |
| `GET …/getMsgTimeInterval` | Abrufintervall für die Aktualisierung des Verlaufs. |

`getContactListByDate` und `getUserListForConversation` werden speziell von der React-Registerkarte verwendet
(nach Datum sortierte Liste + serverseitige Benutzersuche); die älteren Aktionen `getContactList` / `renderMessenger*`
steuern weiterhin das Legacy-Werkzeug und bleiben unverändert.

## Wichtige Services

| Alias | Rolle |
| --- | --- |
| `MelisMessengerService` | Öffentlicher Service für Messaging: Nachrichten/Unterhaltungen senden und lesen. |
| `MelisMessengerMsgTable` | Table-Gateway für `melis_messenger_msg`. |
| `MelisMessengerMsgContentTable` | Table-Gateway für `melis_messenger_msg_content`. |
| `MelisMessengerMsgMembersTable` | Table-Gateway für `melis_messenger_msg_members`. |

Die Methoden von `MelisMessengerService` lösen für jeden Lese-/Listenaufruf `melismessenger_*_start` / `*_end`-Ereignisse aus
(z. B. `melismessenger_get_conversation_start` / `_end`):

| Methode | Rolle |
| --- | --- |
| `saveMsg($data)` | Eine Unterhaltung erstellen/aktualisieren; gibt die Unterhaltungs-ID zurück. |
| `saveMsgMembers($data)` | Einen Benutzer an eine Unterhaltung anhängen. |
| `saveMsgContent($data)` | Eine Nachricht innerhalb einer Unterhaltung speichern. |
| `getConversation($id)` | Eine vollständige Unterhaltung anhand der ID abrufen. |
| `getConversationWithLimit($id, $limit, $offset)` | Seitenweiser Abruf einer Unterhaltung. |
| `getNewMessage($id)` | Neue/ungelesene Nachrichten seit dem letzten Abruf holen. |
| `updateMessageStatus($data, $msg_id, $user_id)` | Nachrichten für einen Benutzer als gelesen markieren. |
| `getContactList($convo_id, $user_id)` | Die Kontakte einer Unterhaltung auflösen. |
| `prepareConversationId($userId)` | Die Unterhaltungs-IDs auflisten, zu denen ein Benutzer gehört. |
| `getUserRightsForMessenger()` | Die Zugriffsrechte des aktuellen Benutzers auf das Modul prüfen. |

## Datenbanktabellen

| Tabelle | Enthält |
| --- | --- |
| `melis_messenger_msg` | Eine Zeile pro Unterhaltung (`msgr_msg_id`, `msgr_msg_creator_id`, `msgr_msg_date_created`). |
| `melis_messenger_msg_members` | An einer Unterhaltung teilnehmende Benutzer (`msgr_msg_mbr_id`, `msgr_msg_id`, `msgr_msg_mbr_usr_id`). |
| `melis_messenger_msg_content` | Einzelne Nachrichten (`msgr_msg_cont_id`, Absender, Nachrichtentext, Datum, Status). |

## Capabilities

**Keine.** Das Modul hat keine `config/react.capabilities.php` und keinen rechtetragenden Menüknoten — es ist
kein Menüwerkzeug. Der Zugriff wird dadurch abgesichert, dass die Legacy-Endpunkte eine authentifizierte Backoffice-
Sitzung erfordern, und die Oberflächen sind an die Modulaktivierung gebunden. Es gibt keine `MelisCan(...)`-Capability-
Zeichenketten, die für den Messenger deklariert oder geprüft werden müssten.

## Beispiel

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

## Wichtige Dateien

| Anliegen | Pfad |
| --- | --- |
| Modulkonfiguration (Routen, Services, Controller) | `vendor/melisplatform/melis-messenger/config/module.config.php` |
| Schnittstellendeklaration (Legacy-Profil-Registerkarte + Kopfleistensymbol) | `vendor/melisplatform/melis-messenger/config/app.interface.php` |
| Formularkonfiguration | `vendor/melisplatform/melis-messenger/config/app.forms.php` |
| Werkzeugkonfiguration | `vendor/melisplatform/melis-messenger/config/app.tools.php` |
| Öffentlicher Service | `vendor/melisplatform/melis-messenger/src/Service/MelisMessengerService.php` |
| Haupt-Controller (von React wiederverwendete JSON-Endpunkte) | `vendor/melisplatform/melis-messenger/src/Controller/MelisMessengerController.php` |
| Table-Gateways | `vendor/melisplatform/melis-messenger/src/Model/Tables/` |
| React-Baustein (Header-Widget + „Mein Konto"-Registerkarte) | `vendor/melisplatform/melis-messenger/ui-react/src/` |
| Gebauter Baustein + Manifest | `vendor/melisplatform/melis-messenger/public/ui-react/brick.js`, `brick.manifest.json` |
| DB-Installations-Delta | `vendor/melisplatform/melis-messenger/install/` |

Siehe auch: [melis-core](/de/reference/modules/melis-core)
