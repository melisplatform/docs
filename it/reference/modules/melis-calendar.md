# MelisCalendar

> Strumento di pianificazione del back-office con un calendario mensile nativo in React, eventi con trascinamento e un widget per la dashboard. Pacchetto `melisplatform/melis-calendar`.

## Scopo

MelisCalendar è lo strumento di calendario / pianificazione eventi della piattaforma: eventi datati su una griglia mensile interattiva, trascinamento per pianificare e trascinamento per riprogrammare. Nel back-office React v6 (`/melis-react`) è distribuito come **brick full-React nativo** — una griglia mensile personalizzata con trascinamento nativo (e touch) — che legge e scrive tramite un livello JSON `react-api`. Un interruttore **New / Old** consente agli utenti di tornare allo strumento legacy FullCalendar in un iframe. Gli eventi sono **globali per la piattaforma** (un'agenda di team condivisa, non legata a un sito).

## Attivazione

Aggiungi a `config/melis.module.load.php`:

```php
return [
    'MelisCalendar',
];
```

L'unica dipendenza richiesta è `melisplatform/melis-core`. Lo strumento appare nel back-office React solo quando il modulo è attivo (scoperta modulare dei brick tramite `GET /melis/react-api/react-modules`).

## Back-office (React)

Barra laterale sinistra → **MelisMarketing** → **Calendar** (icona del calendario). Si apre come scheda superiore persistente denominata **Calendar**. È uno strumento a livello singolo (senza sotto-schede) con una finestra modale di creazione/modifica.

![Lo strumento Calendar in React: interruttore New/Old e "+ New event" (in alto a destra), schede KPI (Total / Upcoming), il blocco di trascinamento "New event" e l'elenco "This month's events" (a sinistra) e una griglia mensile personalizzata con il giorno corrente evidenziato](/screenshots/react/melis-calendar/meliscalendar-tool-calandar-display.png)

| Area | Descrizione |
| --- | --- |
| Griglia mensile personalizzata | Griglia di 6 settimane (lunedì→domenica), `‹ / ›` per cambiare mese, **Today** per tornare indietro, giorno corrente evidenziato. Gli eventi vengono visualizzati come chip nei loro giorni; gli eventi su più giorni si estendono tra le celle. |
| Blocco di trascinamento "New event" | Blocco tratteggiato nel pannello sinistro: digita un titolo, quindi trascinalo su un giorno per creare lì l'evento (tocca per attivare sui dispositivi touch). |
| "+ New event" | Pulsante in alto a destra che apre la finestra modale con selettori di data espliciti **Title / Start / End**. |
| Schede KPI | Conteggi **Total** e **Upcoming** (imminenti = data di inizio odierna o successiva). |
| Elenco "This month's events" | Elenco nel pannello sinistro degli eventi del mese corrente; fai clic su uno per modificarlo. |
| Riprogrammazione | Trascina il chip di un evento su un altro giorno; la sua durata viene preservata. |
| Interruttore New / Old | Interruttore in alto a destra che commuta l'intero strumento tra l'interfaccia React (**New**, predefinita) e lo strumento legacy FullCalendar in un iframe (**Old**). |

![Il pannello sinistro "New event": un campo per il titolo più il blocco di trascinamento tratteggiato con il suggerimento "Drag this block onto a calendar day"](/screenshots/react/melis-calendar/meliscalendar-tool-calandar-new-event.png)

![La finestra modale dell'evento — selettori di data Title, Start ed End, Cancel / Save; l'apertura di un evento esistente mostra la stessa finestra modale con un pulsante Delete](/screenshots/react/melis-calendar/meliscalendar-tool-calandar-event-edition.png)

Regole applicate al salvataggio: il titolo è obbligatorio (≤ 255 caratteri); se **End** è precedente a **Start** viene fissato a **Start**, quindi la fine di un evento è sempre ≥ del suo inizio.

## API React

Le route si trovano in `config/react-api.php` (unite tramite `MelisCalendar\Module::getConfig()`), servite da `MelisCalendar\Controller\MelisReactApiCalendarController`. Tutte sotto `/melis/react-api/calendar-events`, contratto di risposta `{ success, data, error }`, date come `YYYY-MM-DD` (senza orario). Ogni richiesta invia `X-Requested-With: XMLHttpRequest` con `credentials: 'include'`.

| Metodo e URL | Azione | Scopo |
| --- | --- | --- |
| `GET /calendar-events[?from=&to=]` | `list` | Eventi che si sovrappongono alla finestra → `{ items: [{id,title,start,end}] }` |
| `GET /calendar-events/stats` | `stats` | KPI `{ total, ongoing, upcoming }` |
| `GET /calendar-events/:id` | `get` | Un evento `{id,title,start,end}` |
| `POST /calendar-events/save` | `save` | Creazione (senza `id`) / aggiornamento (con `id`); usato anche per la riprogrammazione |
| `DELETE /calendar-events/delete/:id` | `delete` | Elimina un evento |

L'ordine delle route è importante: `/stats`, `/save` e `/delete/:id` sono dichiarate prima della route catch-all `/:id`.

```ts
// create OR reschedule/edit (omit id = create, include id = update)
await fetch('/melis/react-api/calendar-events/save', {
  method: 'POST', credentials: 'include',
  headers: { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: null, title: 'Kickoff', start: '2026-08-19', end: '2026-08-19' }),
})
```

> Il controller comunica direttamente con `melis_calendar` tramite SQL parametrizzato (`Laminas\Db\Adapter\AdapterInterface`), riproducendo le regole legacy e i campi di audit (`cal_created_by` / `cal_last_update_by` da `MelisCoreAuth`). **Non** richiama `MelisCalendarService`.

## Capacità (diritti avanzati)

Dichiarate in `config/react.capabilities.php` sotto il nodo dello strumento foglia `meliscalendar_tool` (la stessa chiave è la melisKey di access-guard del controller e la chiave `can()` del front-end):

```php
return [
    'melisReactToolCapabilities' => [
        'meliscalendar_tool' => ['create', 'edit'],
    ],
];
```

Esistono solo due capacità:

- **`create`** — crea un evento (trascina un nuovo titolo su un giorno / "+ New event").
- **`edit`** — sposta / riprogramma (trascina), modifica **oppure** elimina un evento esistente.

La visualizzazione del calendario richiede `create` **OPPURE** `edit` (uno dei due è sufficiente): `list` / `stats` sono protetti lato server da `denyUnlessCanAny(['create','edit'])`, e nell'interfaccia da `can('create') || can('edit')`. `save` richiede `create` quando non c'è alcun id ed `edit` quando è presente un id; `delete` richiede `edit`. Le protezioni sono default-allow (capacità non dichiarata consentita) e con bypass per l'amministratore.

## Servizi ed eventi (backbone legacy)

Il modulo espone ancora `MelisCalendarService` per l'accesso programmatico — usato dallo strumento legacy e da altri moduli, ma non dal controller React:

| Metodo | Ruolo |
| --- | --- |
| `addCalendarEvent()` | Crea un nuovo evento. |
| `reschedCalendarEvent()` | Aggiorna le date di un evento esistente. |
| `deleteCalendarEvent()` | Rimuove un evento. |

Un evento `meliscalendar_save_event_end` viene attivato dopo ogni salvataggio. Altri moduli possono collegarsi ad esso per notifiche o sincronizzazione con calendari esterni:

```php
$sharedEvents->attach('MelisCalendar', 'meliscalendar_save_event_end', function ($e) {
    $params = $e->getParams();
    // custom notification or sync logic
}, 10);
```

## Widget della dashboard

Un widget **Calendar** della dashboard mostra gli stessi eventi sulla Dashboard del back-office senza aprire lo strumento. Viene aggiunto dal selettore di plugin della dashboard (sezione MELIS CALENDAR) ed è servito dal legacy `MelisCalendarEventsPlugin`.

![Il widget Calendar sulla Dashboard React — una griglia mensile compatta con il giorno corrente evidenziato, più i controlli ingranaggio / aggiorna / chiudi](/screenshots/react/melis-calendar/meliscalendar-dashboardplugins-calandar.png)

![Il pannello "Add a widget" della dashboard — il widget Calendar sotto la sezione MELIS CALENDAR](/screenshots/react/melis-calendar/meliscalendar-dashboardplugins-menu-selector.png)

## Tabelle del database

| Tabella | Contiene |
| --- | --- |
| `melis_calendar` | Una riga per evento; include campi di audit che tracciano la creazione e l'ultima modifica. |

Vedi anche: [melis-core](/it/reference/modules/melis-core)
