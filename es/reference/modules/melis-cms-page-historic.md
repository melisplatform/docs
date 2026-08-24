# MelisCmsPageHistoric

> Registro de auditoría para la edición de páginas del CMS — registra quién hizo qué en una página y cuándo, mostrado como una pestaña Historic en el editor de páginas React y como un widget del panel. Paquete `melisplatform/melis-cms-page-historic`.

## Propósito

`MelisCmsPageHistoric` captura automáticamente cada acción de página (guardar, publicar, despublicar, eliminar)
con la identidad del autor y la marca de tiempo. El historial se escribe mediante escuchadores de eventos enganchados al ciclo de vida
de la página del CMS — no hace falta configurar nada por página. El registro se expone en **modo solo lectura**: en una
**pestaña Historic** dentro del editor de páginas y en un widget del panel **Recent page activity**. Está pensado
para la rendición de cuentas, no para restaurar páginas.

## Activarlo

Añade a `config/melis.module.load.php`:

```php
return [
    'MelisCmsPageHistoric',
];
```

Ejecuta los deltas incluidos en `install/dbdeploy/` para crear la tabla de historial (`extra.dbdeploy: true`).
Requiere `melis-core`, `melis-engine`, `melis-front` y `melis-cms`.

## Un módulo sin brick

Este es un módulo React inusual: no incluye **ningún brick propio** (sin `ui-react/`, sin
`public/ui-react/brick.manifest.json`, sin bundle de Vite). Su huella React consiste en tres archivos de configuración PHP
fusionados por `Module::getConfig()`, más un controlador y un plugin de panel heredado. Ambas superficies React
aparecen **solo mientras el módulo está activo**.

| Archivo de configuración | Contribución |
| --- | --- |
| `config/react-api.php` | El endpoint `GET /melis/react-api/cms-page/historic` + el controlador invocable |
| `config/react.capabilities.php` | La capacidad de la pestaña Historic bajo el nodo compartido `meliscms_page` |
| `config/app.interface.php` | El **botón** de la pestaña Historic en el editor de páginas del CMS (icono `history`) |

El componente React que se renderiza dentro de la pestaña Historic **no lo proporciona este módulo** — lo
suministra el lado del host mediante el shell de melis-core y se conecta a través del registro de pestañas de página
(`window.__melisRegisterPageTab('melispagehistoric_historic', Component)`). Este módulo aporta
únicamente el endpoint de datos, la capacidad y la declaración del botón de la pestaña; el editor de páginas del CMS
(MelisCms) aloja la pestaña.

## Pestaña Historic (editor de páginas React)

Barra lateral izquierda → **MelisCms** → abre una **página** → la pestaña **Historic** en la fila de pestañas del editor. Muestra
una tabla de solo lectura con las acciones **de esta página**, las más recientes primero, con las columnas **Date**, **Action**
(insignias de color Publish / Save / Unpublish) y **User**. Un desplegable **Filter (All actions)**
acota a un único tipo de acción. La lista está **paginada en el servidor** — nunca carga todo el
historial de una vez.

![Pestaña Historic en el editor de páginas React del CMS mostrando la tabla de historial de la página con columnas Date, insignias Action y User, más un filtro de acciones](/screenshots/react/melis-cms-page-historic/meliscmspagehistoric-page-tab-historic.png)

La pestaña muestra solo el historial de la página actual. Para la actividad en *todas* las páginas, usa el widget del panel
que aparece a continuación.

## Widget del panel Recent page activity

En el **Dashboard** del back-office, el widget **Recent page activity** enumera las acciones de página más recientes
de todos los usuarios (marca de tiempo · punto de estado · nombre de página + id · acción · usuario). Se
añade o elimina desde el panel "Add a widget" como cualquier otro widget del panel, bajo el grupo **MELIS CMS
PAGE HISTORIC**.

![Widget del panel Recent page activity enumerando las acciones de página recientes, con el panel Add a widget mostrándolo bajo Melis Cms Page Historic](/screenshots/react/melis-cms-page-historic/meliscmspagehistoric-dashboard-plugin-recentactivity.png)

Este widget sigue siendo un **plugin de panel PHP heredado**
(`MelisCmsPageHistoricRecentUserActivityPlugin`, acción `recentActivityPages`) renderizado dentro del
host de widgets del panel React — no hay una reescritura en React. Lee a través de
`MelisPageHistoricTable->getPagesHistoricForDashboard()` y se condiciona a que MelisCms esté activo más el
derecho de acceso al plugin de panel.

## API React — el endpoint Historic

Declarado en `config/react-api.php`, controlador
`MelisCmsPageHistoric\Controller\MelisReactApiPageHistoricController` (alias invocable
`MelisReactApiPageHistoric`). Una acción, contrato `{ success, data, error }`.

| Método y URL | Acción | Propósito |
| --- | --- | --- |
| `GET /melis/react-api/cms-page/historic?idPage=<id>&page=<n>&perPage=<25>&action=<type>` | `listAction` | Las filas de auditoría de la página actual, paginadas en el servidor, más los tipos de acción distintos para el desplegable de filtro |

Forma de la respuesta `data`:

```jsonc
{ "success": true, "data": {
  "idPage": 1,
  "items": [ { "id": 123, "date": "2026-08-18 10:10:25", "action": "Publish",
               "user": "John Doe", "userId": 1 } ],   // newest first (ORDER BY hist_id DESC)
  "page": 1, "perPage": 25, "total": 87,               // total = indexed COUNT → drives paging
  "action": "",                                        // active action filter ('' = all)
  "actionTypes": ["Publish", "Save", "Unpublish"]      // DISTINCT hist_action for the filter select
} }
```

Notas de implementación:

- **Guard:** la acción comprueba únicamente `MelisCoreAuth->hasIdentity()` (devuelve `401` si
  no hay autenticación). **No** impone una capacidad en el lado del servidor — trata la capacidad de abajo como
  una señal de **restricción de la UI**, no como una comprobación de autorización en el backend.
- **Datos:** SQL parametrizado directo sobre `melis_hist_page_historic` (LEFT JOIN `melis_core_user` para
  el nombre del usuario; un usuario eliminado se etiqueta como `"Utilisateur supprimé (<id>)"`).
- **Paginación:** `perPage` acotado a `1..200` (por defecto 25); `total` es un `COUNT(*)` indexado
  independiente que respeta el mismo `WHERE`. El filtro opcional `action` se aplica tanto al conteo como a
  la página.

## Capacidades

Como el módulo aporta una pestaña a la herramienta de página del CMS, su capacidad se declara bajo el
nodo de derechos **compartido** `meliscms_page` (un `ArrayUtils::merge` añade a los `tabs[]` de esa herramienta):

```php
return [
  'melisReactToolCapabilities' => [
    'meliscms_page' => [
      'tabs' => [
        ['key' => 'melispagehistoric_historic', 'label' => 'tr_melispagehistoric_page_tab_historic_Historic'],
      ],
    ],
  ],
];
```

- La `key` (`melispagehistoric_historic`) es la capacidad de la pestaña; coincide con la clave que el host usa
  para registrar el componente de la pestaña y con el `melisKey` de la interfaz en `app.interface.php`.
- Se indexa bajo `meliscms_page` ("Edition de page" en Users → Rights), **no** bajo el envoltorio
  `meliscms` y **no** bajo el nodo del botón de la pestaña.
- Sin esta declaración, la lista blanca de capacidades de la página del CMS oculta el botón de la pestaña — incluso para un administrador.

## Cómo se escribe el historial (patrón de escuchador)

Dos escuchadores conectados en `src/Module.php` (solo en el arranque del back-office) registran las filas; React solo
las lee.

| Escuchador | Evento(s) | Qué registra |
| --- | --- | --- |
| `MelisPageHistoricPageEventListener` | `meliscms_page_save_end`, `meliscms_page_publish_end`, `meliscms_page_unpublish_end`, … | Save / Publish / Unpublish |
| `MelisPageHistoricDeletePageListener` | `meliscms_page_delete_end` | Delete (también realiza limpieza) |

No escribes las filas de historial tú mismo — guardar, publicar o eliminar una página a través del CMS
dispara los escuchadores automáticamente.

## Tabla de la base de datos

| Tabla | Contiene |
| --- | --- |
| `melis_hist_page_historic` | Una fila por acción registrada: `hist_id` (PK), `hist_page_id`, `hist_action`, `hist_date`, `hist_user_id`, `hist_description`. |

## Archivos clave

| Aspecto | Ruta |
| --- | --- |
| Controlador react-api | `vendor/melisplatform/melis-cms-page-historic/src/Controller/MelisReactApiPageHistoricController.php` |
| Ruta react-api | `vendor/melisplatform/melis-cms-page-historic/config/react-api.php` |
| Capacidad de la pestaña Historic | `vendor/melisplatform/melis-cms-page-historic/config/react.capabilities.php` |
| Botón / interfaz de la pestaña Historic | `vendor/melisplatform/melis-cms-page-historic/config/app.interface.php` |
| Arranque del módulo (escuchadores) | `vendor/melisplatform/melis-cms-page-historic/src/Module.php` |
| Table gateway | `vendor/melisplatform/melis-cms-page-historic/src/Model/Tables/MelisPageHistoricTable.php` |
| Plugin de panel (heredado) | `vendor/melisplatform/melis-cms-page-historic/src/Controller/DashboardPlugins/MelisCmsPageHistoricRecentUserActivityPlugin.php` |
| SQL de instalación / dbdeploy | `vendor/melisplatform/melis-cms-page-historic/install/` |

Ver también: [MelisCms](/es/reference/modules/melis-cms), [Referencia de módulos](/es/reference/modules)
