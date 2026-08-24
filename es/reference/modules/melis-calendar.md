# MelisCalendar

> Herramienta de planificación del back-office con un calendario mensual React nativo, eventos con arrastrar y soltar y un widget de panel. Paquete `melisplatform/melis-calendar`.

## Propósito

MelisCalendar es la herramienta de calendario / planificación de eventos de la plataforma: eventos con fecha sobre una cuadrícula mensual interactiva, arrastrar para programar y arrastrar para reprogramar. En el back-office React v6 (`/melis-react`) se distribuye como un **componente totalmente nativo en React** — una cuadrícula mensual personalizada con arrastrar y soltar nativo (y táctil) — que lee y escribe a través de una capa JSON `react-api`. Un conmutador **New / Old** permite a los usuarios volver a la herramienta FullCalendar heredada dentro de un iframe. Los eventos son **globales de la plataforma** (una agenda de equipo compartida, no vinculada a un sitio).

## Activarlo

Añádelo a `config/melis.module.load.php`:

```php
return [
    'MelisCalendar',
];
```

La única dependencia obligatoria es `melisplatform/melis-core`. La herramienta aparece en el back-office React solo mientras el módulo está activo (descubrimiento modular de componentes mediante `GET /melis/react-api/react-modules`).

## Back-office (React)

Barra lateral izquierda → **MelisMarketing** → **Calendar** (icono de calendario). Se abre como una pestaña superior persistente llamada **Calendar**. Es una herramienta de un solo nivel (sin subpestañas) con un modal de creación/edición.

![La herramienta Calendar de React: conmutador New/Old y "+ New event" (arriba a la derecha), tarjetas KPI (Total / Upcoming), el bloque de arrastre "New event" y la lista "This month's events" (a la izquierda), y una cuadrícula mensual personalizada con el día de hoy resaltado](/screenshots/react/melis-calendar/meliscalendar-tool-calandar-display.png)

| Zona | Descripción |
| --- | --- |
| Cuadrícula mensual personalizada | Cuadrícula de 6 semanas (lunes→domingo), `‹ / ›` para cambiar de mes, **Today** para volver al día actual, día actual resaltado. Los eventos se muestran como chips en su día o días; los eventos de varios días abarcan varias celdas. |
| Bloque de arrastre "New event" | Bloque de trazo discontinuo del panel izquierdo: escribe un título y luego arrástralo sobre un día para crear el evento allí (tocar para activar en dispositivos táctiles). |
| "+ New event" | Botón superior derecho que abre el modal con selectores de fecha explícitos **Title / Start / End**. |
| Tarjetas KPI | Recuentos **Total** y **Upcoming** (próximos = fecha de inicio hoy o posterior). |
| Lista "This month's events" | Lista del panel izquierdo con los eventos del mes actual; haz clic en uno para editarlo. |
| Reprogramar | Arrastra el chip de un evento a otro día; se conserva su duración. |
| Conmutador New / Old | Conmutador superior derecho que cambia toda la herramienta entre la interfaz React (**New**, predeterminada) y la herramienta FullCalendar heredada dentro de un iframe (**Old**). |

![El panel izquierdo "New event": un campo de título más el bloque de arrastre discontinuo con la indicación "Drag this block onto a calendar day"](/screenshots/react/melis-calendar/meliscalendar-tool-calandar-new-event.png)

![El modal de evento — selectores de fecha Title, Start y End, Cancel / Save; al abrir un evento existente se muestra el mismo modal con un botón Delete](/screenshots/react/melis-calendar/meliscalendar-tool-calandar-event-edition.png)

Reglas aplicadas al guardar: el título es obligatorio (≤ 255 caracteres); si **End** es anterior a **Start**, se ajusta a **Start**, de modo que el fin de un evento siempre sea ≥ su inicio.

## API React

Las rutas se encuentran en `config/react-api.php` (fusionadas mediante `MelisCalendar\Module::getConfig()`), servidas por `MelisCalendar\Controller\MelisReactApiCalendarController`. Todas bajo `/melis/react-api/calendar-events`, contrato de respuesta `{ success, data, error }`, fechas como `YYYY-MM-DD` (sin hora). Cada solicitud envía `X-Requested-With: XMLHttpRequest` con `credentials: 'include'`.

| Método y URL | Acción | Propósito |
| --- | --- | --- |
| `GET /calendar-events[?from=&to=]` | `list` | Eventos que se solapan con la ventana → `{ items: [{id,title,start,end}] }` |
| `GET /calendar-events/stats` | `stats` | KPI `{ total, ongoing, upcoming }` |
| `GET /calendar-events/:id` | `get` | Un evento `{id,title,start,end}` |
| `POST /calendar-events/save` | `save` | Crear (sin `id`) / actualizar (con `id`); también se usa para reprogramar |
| `DELETE /calendar-events/delete/:id` | `delete` | Eliminar un evento |

El orden de las rutas importa: `/stats`, `/save` y `/delete/:id` se declaran antes del comodín `/:id`.

```ts
// create OR reschedule/edit (omit id = create, include id = update)
await fetch('/melis/react-api/calendar-events/save', {
  method: 'POST', credentials: 'include',
  headers: { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: null, title: 'Kickoff', start: '2026-08-19', end: '2026-08-19' }),
})
```

> El controlador se comunica directamente con `melis_calendar` mediante SQL parametrizado (`Laminas\Db\Adapter\AdapterInterface`), reproduciendo las reglas heredadas y los campos de auditoría (`cal_created_by` / `cal_last_update_by` de `MelisCoreAuth`). **No** invoca `MelisCalendarService`.

## Capacidades (derechos avanzados)

Declaradas en `config/react.capabilities.php` bajo el nodo hoja de la herramienta `meliscalendar_tool` (la misma clave es la melisKey del guard de acceso del controlador y la clave `can()` del frontend):

```php
return [
    'melisReactToolCapabilities' => [
        'meliscalendar_tool' => ['create', 'edit'],
    ],
];
```

Solo existen dos capacidades:

- **`create`** — crear un evento (arrastrar un nuevo título sobre un día / "+ New event").
- **`edit`** — mover / reprogramar (arrastrar), editar **o** eliminar un evento existente.

Para ver el calendario se requiere `create` **O** `edit` (basta con cualquiera de las dos): `list` / `stats` están protegidas del lado del servidor por `denyUnlessCanAny(['create','edit'])`, y en la interfaz por `can('create') || can('edit')`. `save` requiere `create` cuando no hay id y `edit` cuando hay un id presente; `delete` requiere `edit`. Los guards son de permiso predeterminado (una capacidad no declarada se permite) y admiten bypass para administradores.

## Servicios y eventos (base heredada)

El módulo sigue exponiendo `MelisCalendarService` para el acceso programático — utilizado por la herramienta heredada y por otros módulos, pero no por el controlador React:

| Método | Función |
| --- | --- |
| `addCalendarEvent()` | Crea un nuevo evento. |
| `reschedCalendarEvent()` | Actualiza las fechas de un evento existente. |
| `deleteCalendarEvent()` | Elimina un evento. |

Un evento `meliscalendar_save_event_end` se dispara después de cada guardado. Otros módulos pueden engancharse a él para notificaciones o sincronización con calendarios externos:

```php
$sharedEvents->attach('MelisCalendar', 'meliscalendar_save_event_end', function ($e) {
    $params = $e->getParams();
    // custom notification or sync logic
}, 10);
```

## Widget de panel

Un widget de panel **Calendar** muestra los mismos eventos en el Panel del back-office sin abrir la herramienta. Se añade desde el selector de plugins del panel (sección MELIS CALENDAR) y lo sirve el `MelisCalendarEventsPlugin` heredado.

![El widget Calendar en el Panel React — una cuadrícula mensual compacta con el día de hoy resaltado, más sus controles de engranaje / recargar / cerrar](/screenshots/react/melis-calendar/meliscalendar-dashboardplugins-calandar.png)

![El panel "Add a widget" del panel — el widget Calendar bajo la sección MELIS CALENDAR](/screenshots/react/melis-calendar/meliscalendar-dashboardplugins-menu-selector.png)

## Tablas de base de datos

| Tabla | Contiene |
| --- | --- |
| `melis_calendar` | Una fila por evento; incluye campos de auditoría que registran la creación y la última modificación. |

Véase también: [melis-core](/es/reference/modules/melis-core)
