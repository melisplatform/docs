# MelisCron

> Gestor de tareas programadas del back-office: define tareas CLI o HTTP con programaciones flexibles, ejecútalas bajo demanda o mediante un ejecutor CLI por minuto, e inspecciona el historial completo de ejecuciones — ahora impulsado por una herramienta React nativa. Paquete `melisplatform/melis-cron`.

## Propósito

MelisCron reemplaza las líneas de crontab escritas a mano por una lista gestionada de tareas. Cada tarea apunta a un **comando CLI** o a una **URL HTTP** y declara cuándo ejecutarse (cada N minutos/horas/días, cada hora, diariamente, semanalmente o mensualmente). Cada ejecución se registra en una tabla de historial con su estado, duración y salida capturada. La ejecución programada sigue requiriendo una entrada de crontab a nivel del sistema operativo que invoque el ejecutor `melis:cronexec` cada minuto; la herramienta React solo define, registra y (bajo demanda) dispara tareas.

## Activación

Añade a `config/melis.module.load.php`:

```php
return [
    'MelisCron',
];
```

Requiere **MelisCore** (proporcionado por la plataforma). Dependencias de Composer: PHP `^8.1|^8.3`, `ext-curl`, `composer/composer ^2.9.6`, `laminas/laminas-cli ^1.5`. La herramienta React aparece únicamente si el módulo está activado (descubrimiento modular de bricks).

## Back-office (React)

**Barra lateral → MelisCore → Dev Tools → Scheduled Tasks**, junto a Melis Phpinfo y la SQL Tool. Se abre como una pestaña superior llamada **Scheduled Tasks** y se distribuye como un **brick React nativo completo** (id de brick `cron`, melisKey `cron_tool`), con un conmutador **New / Old**: *New* es la interfaz React (por defecto); *Old* renderiza la herramienta jQuery heredada en un iframe.

Dado que una tarea cron ejecuta comandos CLI arbitrarios y llamadas HTTP, las acciones **crear / editar / ejecutar** están restringidas a los **administradores** de la plataforma del lado del servidor, además de las comprobaciones de capacidades.

### Lista de tareas

La lista muestra cada tarea programada con **tarjetas KPI** (Total / Activas / Inactivas), un cuadro de **búsqueda** (nombre y destino), filtros de **estado** (Todas / Activas / Inactivas) y de **tipo** (CLI / HTTP), **Restablecer filtros**, un gestor de **Columnas** (persistente), un botón de **Exportar** y un botón de **actualizar**. Haz clic en el encabezado de una columna para ordenar. Cada fila tiene tres acciones por fila: **Ejecutar ahora** (▶), **editar** y **eliminar** (al eliminar también se borra el historial de la tarea). Botones en la esquina superior derecha: **History**, el conmutador **New / Old** y **+ New task**. El formulario y las páginas de History se abren como **sub-pestañas** nativas dentro de la pestaña Scheduled Tasks, cada una conservando su estado.

![La herramienta Cron en React: tarjetas KPI, búsqueda, filtros de estado y tipo, Columnas, Exportar, el conmutador New/Old, History y + New task, con acciones por fila de Ejecutar/editar/eliminar](/screenshots/react/melis-cron/meliscron-tool-cron-list.png)

### Crear / editar una tarea

**+ New task** (o el lápiz de edición de una fila) abre un formulario React de dos paneles en una sub-pestaña:

- **Identidad + destino** — **Name**, **Type** (conmutador segmentado CLI / HTTP) y **Target** (el comando CLI como `cache:clear`, o la URL HTTP), con una indicación adaptada al tipo.
- **Opciones** — un conmutador **Active** y el selector de **Schedule**. Al elegir una programación se revela su editor: *Interval* = valor + unidad (minutos/horas/días); *Hourly* = minuto de la hora; *Daily* = hora + minuto; *Weekly* = botones de día de la semana + hora + minuto; *Monthly* = día del mes + hora + minuto.

![El formulario React de nueva tarea — Name, Type (CLI/HTTP), Target con una indicación adaptada al tipo, y el panel de Opciones con el conmutador Active y el editor de Schedule (Interval — cada 15 minutos)](/screenshots/react/melis-cron/meliscron-tool-cron-new.png)

**Save** persiste la tarea. Validación (replicada en el cliente y en el servidor): nombre obligatorio (≤ 100 caracteres), destino obligatorio (≤ 255 caracteres), el tipo debe ser CLI/HTTP y las opciones de programación válidas para el tipo elegido.

![Edición de "CRON 1" (una tarea HTTP con destino /my-url, cada 15 minutos) — el mismo formulario de dos paneles, precargado desde la tarea](/screenshots/react/melis-cron/meliscron-tool-cron-edit.png)

### Ejecutar ahora e historial

El botón **Ejecutar** (▶) de cada fila pide confirmación y luego **ejecuta la tarea inmediatamente** (de forma síncrona, dentro de la petición) e informa del resultado —estado, código HTTP para las tareas HTTP, duración— como una notificación, y escribe una entrada en el historial. Esto omite la programación.

![El diálogo de confirmación "Run task" — "Are you sure you want to perform 'CRON 1' now?" con Cancel / Run](/screenshots/react/melis-cron/meliscron-tool-cron-run.png)

El botón **History** abre la página de **Historial de ejecuciones** en una sub-pestaña: tarjetas KPI (Ejecuciones / Exitosas / Fallidas / En ejecución), filtros (búsqueda por nombre y logs, desplegable de tarea, desplegable de estado, rango de fechas Desde/Hasta) y una tabla de ejecuciones (tarea, tipo, estado, duración, fecha de ejecución, distintivo de reejecución). Un popup de **Logs** por fila muestra el detalle de la ejecución (destino, fechas de encolado/ejecución, duración, código HTTP) y los logs sin procesar capturados.

## API React

Rutas en `config/react-api.php`, controlador `MelisCron\Controller\MelisReactApiCronController`. Todas bajo `/melis/react-api/crons`, contrato `{ success, data, error }`.

| Método y URL | Acción | Propósito |
| --- | --- | --- |
| `GET /crons` | `list` | Listar tareas (keyset: `limit`, `search`, `active`, `type`, `sort`, `dir`, `after`) |
| `GET /crons/stats` | `stats` | KPI `{total, active, inactive}` |
| `GET /crons/:id` | `get` | Una tarea |
| `POST /crons/save` | `save` | Crear / actualizar una tarea (validada) — **solo administradores** |
| `DELETE /crons/delete/:id` | `delete` | Eliminar una tarea y su historial |
| `POST /crons/run/:id` | `run` | Ejecutar una tarea **ahora** (síncrono) — **solo administradores** |
| `GET /crons/history` | `history` | Historial de ejecuciones (filtros `cronId`, `state`, `search`, `startDate`, `endDate`, `page`, `limit`) |
| `GET /crons/history/:id` | `historyDetail` | Una ejecución + logs completos |

Cada acción invoca primero `denyUnlessAccess()` (autenticación + `MelisCoreRights::canAccess('cron_tool')`). Las acciones que modifican datos añaden `denyUnlessAdmin()` (bloquea a los no `usr_admin`) y `denyUnlessCan(cap)`. Las lecturas y el CRUD dialogan con las dos tablas mediante SQL parametrizado; `run` delega en `MelisCronService::runTaskNow($id)`.

### Capacidades

Declaradas en `config/react.capabilities.php` bajo el nodo `cron_tool` — una lista CRUD plana:

```php
'melisReactToolCapabilities' => [
    'cron_tool' => ['list', 'create', 'edit', 'delete', 'export', 'run'],
],
```

En React, `useCaps('cron_tool').can(cap)` controla la interfaz (oculta **+ New task**, las acciones por fila, Exportar). El modelo es **permitir-por-defecto** con **omisión para administradores**; además de esto, crear/editar/ejecutar están restringidos de forma estricta a los administradores.

## Servicio clave — `MelisCronService`

```php
$cron = $sm->get('MelisCronService');

$cron->getActiveTasks();
$cron->saveItem($data, $id);   // fires events
$cron->deleteItem($id);

// Job queue
$cron->addJob($cronId, $forceRun);       // inserts a 'pending' row in melis_cron_history
$cron->getPendingJobs();
$cron->updateProcessingJob($jobId);      // claims job: pending → processing
$cron->finishJob($jobId, $data);         // writes state/duration/logs/status
$cron->runTaskNow($id);                  // synchronous execution used by the React Run action

// Helpers
$cron->getDateLastRunByCron($cronId);
$cron->getWordingScheduleType($type, $optionsJson);
```

**Eventos disparados:** `cron_service_get_list_start`, `meliscron_service_get_list_end`, `meliscron_service_get_listhistory_end`, `meliscron_service_save_item_start`/`_end`, `meliscron_service_delete_item_start`/`_end`.

## Tablas de base de datos

| Tabla | Contiene |
| --- | --- |
| `melis_cron` | Definiciones de tareas: `cron_id`, `cron_name`, `cron_active`, `cron_target`, `cron_type` (ENUM `CLI\|HTTP`), `cron_schedule_type` (ENUM `every\|hourly\|daily\|weekly\|monthly`), `cron_schedule_options` (JSON) |
| `melis_cron_history` | Registros de ejecución: `id`, `cron_id`, `state` (ENUM `pending\|processing\|success\|error`), `date_add`, `rerun`, `date_run`, `duration`, `logs`, `status` |

### Estructuras JSON de `cron_schedule_options`

| `cron_schedule_type` | Estructura JSON |
| --- | --- |
| `every` | `{ "everyItem": "minutes\|hours\|days", "everyValue": N }` |
| `hourly` | `{ "hourlyValue": MM }` |
| `daily` | `{ "dailyHour": HH, "dailyMinute": MM }` |
| `weekly` | `{ "weeklyDays": [1..7], "atHour": HH, "atMinute": MM }` (día ISO, Lun=1) |
| `monthly` | `{ "monthlyDay": D, "atHour": HH, "atMinute": MM }` |

## Configuración del ejecutor

La ejecución programada la impulsa `MelisCron\Command\ExecCommand`, registrado con laminas-cli como **`melis:cronexec`**. Añade una línea al crontab del servidor:

```cron
* * * * * cd /path/to/project && php vendor/bin/laminas melis:cronexec --env=production >/dev/null 2>&1
```

Cada tick ejecuta dos fases:

1. **`scheduleTasks()`** — evalúa la programación de cada tarea activa frente a la hora actual; llama a `addJob()` para cualquier tarea que corresponda.
2. **`runJobs()`** — reclama cada trabajo pendiente (`pending → processing`) y luego lo ejecuta dentro de un **PHP Fiber** para concurrencia:
   - **HTTP** — `curl` GET de `cron_target`; registra el código de estado HTTP y el cuerpo de la respuesta.
   - **CLI** — `exec()` de `cron_target`; un código de salida distinto de cero establece el estado en `error`.

Hay disponible un disparador HTTP de respaldo en `/melis/MelisCron/Cron/execute` para entornos donde no se dispone de un crontab CLI.

> La resolución de programación es de un minuto (la cadencia del tick). Sin la línea de crontab, las tareas quedan definidas pero solo se disparan cuando se activan manualmente mediante **Ejecutar ahora**.

Véase también: [MelisCore](/es/reference/modules/melis-core)
