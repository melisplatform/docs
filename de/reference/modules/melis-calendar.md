# MelisCalendar

> Backoffice-Planungswerkzeug mit einem nativen React-Monatskalender, Drag-and-drop-Ereignissen und einem Dashboard-Widget. Paket `melisplatform/melis-calendar`.

## Zweck

MelisCalendar ist das Kalender- bzw. Terminplanungswerkzeug der Plattform: datierte Ereignisse auf einem interaktiven Monatsraster, Planung per Drag-and-drop und Umplanung per Drag-and-drop. Im v6-React-Backoffice (`/melis-react`) wird es als **native, vollständig in React umgesetzte Komponente** ausgeliefert – ein individuelles Monatsraster mit nativem (und Touch-)Drag-and-drop –, die über eine `react-api`-JSON-Schicht liest und schreibt. Ein Umschalter **New / Old** ermöglicht es Benutzern, auf das ältere FullCalendar-Werkzeug in einem iframe zurückzugreifen. Ereignisse sind **plattformweit global** (ein gemeinsamer Team-Terminkalender, nicht an eine Website gebunden).

## Aktivierung

Fügen Sie es zu `config/melis.module.load.php` hinzu:

```php
return [
    'MelisCalendar',
];
```

Die einzige erforderliche Abhängigkeit ist `melisplatform/melis-core`. Das Werkzeug erscheint im React-Backoffice nur, solange das Modul aktiv ist (modulare Komponentenerkennung über `GET /melis/react-api/react-modules`).

## Backoffice (React)

Linke Seitenleiste → **MelisMarketing** → **Calendar** (Kalendersymbol). Es öffnet sich als dauerhaftes oberes Tab mit dem Namen **Calendar**. Es handelt sich um ein einstufiges Werkzeug (keine Unter-Tabs) mit einem Modal zum Erstellen/Bearbeiten.

![Das React-Kalenderwerkzeug: Umschalter New/Old und "+ New event" (oben rechts), KPI-Karten (Total / Upcoming), der Ziehblock "New event" und die Liste "This month's events" (links) sowie ein individuelles Monatsraster mit hervorgehobenem heutigen Tag](/screenshots/react/melis-calendar/meliscalendar-tool-calandar-display.png)

| Bereich | Beschreibung |
| --- | --- |
| Individuelles Monatsraster | 6-Wochen-Raster (Montag→Sonntag), `‹ / ›` zum Wechseln des Monats, **Today** zum Zurückspringen, aktueller Tag hervorgehoben. Ereignisse werden als Chips an ihrem Tag/ihren Tagen dargestellt; mehrtägige Ereignisse erstrecken sich über mehrere Zellen. |
| Ziehblock "New event" | Gestrichelter Block im linken Bereich: Titel eingeben und dann auf einen Tag ziehen, um das Ereignis dort zu erstellen (auf Touch-Geräten Antippen zum Aktivieren). |
| "+ New event" | Schaltfläche oben rechts, die das Modal mit expliziten Datumsauswahlfeldern **Title / Start / End** öffnet. |
| KPI-Karten | Zähler **Total** und **Upcoming** (upcoming = Startdatum heute oder später). |
| Liste "This month's events" | Liste der Ereignisse des aktuellen Monats im linken Bereich; zum Bearbeiten auf ein Ereignis klicken. |
| Umplanung | Ziehen Sie einen Ereignis-Chip auf einen anderen Tag; seine Dauer bleibt erhalten. |
| Umschalter New / Old | Umschalter oben rechts, der das gesamte Werkzeug zwischen der React-Oberfläche (**New**, Standard) und dem älteren FullCalendar-Werkzeug in einem iframe (**Old**) umschaltet. |

![Der linke Bereich "New event": ein Titel-Eingabefeld sowie der gestrichelte Ziehblock mit dem Hinweis "Drag this block onto a calendar day"](/screenshots/react/melis-calendar/meliscalendar-tool-calandar-new-event.png)

![Das Ereignis-Modal – Datumsauswahlfelder Title, Start und End, Cancel / Save; beim Öffnen eines vorhandenen Ereignisses zeigt dasselbe Modal eine Schaltfläche Delete an](/screenshots/react/melis-calendar/meliscalendar-tool-calandar-event-edition.png)

Beim Speichern erzwungene Regeln: Der Titel ist erforderlich (≤ 255 Zeichen); liegt **End** vor **Start**, wird es auf **Start** begrenzt, sodass das Ende eines Ereignisses immer ≥ seinem Start ist.

## React-API

Die Routen befinden sich in `config/react-api.php` (zusammengeführt über `MelisCalendar\Module::getConfig()`) und werden von `MelisCalendar\Controller\MelisReactApiCalendarController` bedient. Alle liegen unter `/melis/react-api/calendar-events`, Antwortvertrag `{ success, data, error }`, Datumsangaben als `YYYY-MM-DD` (ohne Uhrzeit). Jede Anfrage sendet `X-Requested-With: XMLHttpRequest` mit `credentials: 'include'`.

| Methode & URL | Aktion | Zweck |
| --- | --- | --- |
| `GET /calendar-events[?from=&to=]` | `list` | Ereignisse, die sich mit dem Zeitfenster überschneiden → `{ items: [{id,title,start,end}] }` |
| `GET /calendar-events/stats` | `stats` | KPI `{ total, ongoing, upcoming }` |
| `GET /calendar-events/:id` | `get` | Ein Ereignis `{id,title,start,end}` |
| `POST /calendar-events/save` | `save` | Erstellen (ohne `id`) / Aktualisieren (mit `id`); wird auch zur Umplanung verwendet |
| `DELETE /calendar-events/delete/:id` | `delete` | Ein Ereignis löschen |

Die Reihenfolge der Routen ist entscheidend: `/stats`, `/save` und `/delete/:id` werden vor der Catch-all-Route `/:id` deklariert.

```ts
// create OR reschedule/edit (omit id = create, include id = update)
await fetch('/melis/react-api/calendar-events/save', {
  method: 'POST', credentials: 'include',
  headers: { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: null, title: 'Kickoff', start: '2026-08-19', end: '2026-08-19' }),
})
```

> Der Controller kommuniziert direkt mit `melis_calendar` über parametrisiertes SQL (`Laminas\Db\Adapter\AdapterInterface`) und reproduziert dabei die älteren Regeln und Audit-Felder (`cal_created_by` / `cal_last_update_by` aus `MelisCoreAuth`). Er ruft `MelisCalendarService` **nicht** auf.

## Berechtigungen (erweiterte Rechte)

Deklariert in `config/react.capabilities.php` unter dem Blatt-Werkzeugknoten `meliscalendar_tool` (derselbe Schlüssel ist der melisKey des Zugriffsschutzes im Controller sowie der `can()`-Schlüssel im Frontend):

```php
return [
    'melisReactToolCapabilities' => [
        'meliscalendar_tool' => ['create', 'edit'],
    ],
];
```

Es existieren nur zwei Berechtigungen:

- **`create`** – ein Ereignis erstellen (einen neuen Titel auf einen Tag ziehen / "+ New event").
- **`edit`** – ein vorhandenes Ereignis verschieben / umplanen (ziehen), bearbeiten **oder** löschen.

Zum Anzeigen des Kalenders ist `create` **ODER** `edit` erforderlich (eines von beiden genügt): `list` / `stats` sind serverseitig durch `denyUnlessCanAny(['create','edit'])` und in der Oberfläche durch `can('create') || can('edit')` geschützt. `save` erfordert `create`, wenn keine id vorhanden ist, und `edit`, wenn eine id vorhanden ist; `delete` erfordert `edit`. Die Schutzmechanismen erlauben standardmäßig den Zugriff (nicht deklarierte Berechtigung erlaubt) und werden von Administratoren umgangen.

## Dienste & Ereignisse (Legacy-Grundgerüst)

Das Modul stellt weiterhin `MelisCalendarService` für den programmatischen Zugriff bereit – verwendet vom älteren Werkzeug und von anderen Modulen, jedoch nicht vom React-Controller:

| Methode | Funktion |
| --- | --- |
| `addCalendarEvent()` | Erstellt ein neues Ereignis. |
| `reschedCalendarEvent()` | Aktualisiert die Daten eines vorhandenen Ereignisses. |
| `deleteCalendarEvent()` | Entfernt ein Ereignis. |

Nach jedem Speichern wird ein Ereignis `meliscalendar_save_event_end` ausgelöst. Andere Module können sich daran anhängen, um Benachrichtigungen oder die Synchronisierung mit externen Kalendern zu ermöglichen:

```php
$sharedEvents->attach('MelisCalendar', 'meliscalendar_save_event_end', function ($e) {
    $params = $e->getParams();
    // custom notification or sync logic
}, 10);
```

## Dashboard-Widget

Ein **Calendar**-Dashboard-Widget zeigt dieselben Ereignisse auf dem Backoffice-Dashboard an, ohne dass das Werkzeug geöffnet werden muss. Es wird über die Plugin-Auswahl des Dashboards (Abschnitt MELIS CALENDAR) hinzugefügt und vom älteren `MelisCalendarEventsPlugin` bereitgestellt.

![Das Calendar-Widget auf dem React-Dashboard – ein kompaktes Monatsraster mit hervorgehobenem heutigen Tag sowie seine Steuerelemente Zahnrad / Aktualisieren / Schließen](/screenshots/react/melis-calendar/meliscalendar-dashboardplugins-calandar.png)

![Der Dashboard-Bereich "Add a widget" – das Calendar-Widget unter dem Abschnitt MELIS CALENDAR](/screenshots/react/melis-calendar/meliscalendar-dashboardplugins-menu-selector.png)

## Datenbanktabellen

| Tabelle | Inhalt |
| --- | --- |
| `melis_calendar` | Eine Zeile pro Ereignis; enthält Audit-Felder zur Nachverfolgung von Erstellung und letzter Änderung. |

Siehe auch: [melis-core](/de/reference/modules/melis-core)
