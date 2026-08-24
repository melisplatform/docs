# MelisCmsSiteRobot

> Edición por dominio del `robots.txt` y publicación dinámica, con un back-office full-React nativo. Paquete `melisplatform/melis-cms-site-robot`.

## Propósito

`MelisCmsSiteRobot` te permite gestionar el `robots.txt` de cada dominio de sitio desde el back-office y
lo publica dinámicamente en `https://<domain>/robots.txt` — directamente desde la base de datos, sin ningún archivo
estático que mantener. Los cambios surten efecto de inmediato tras guardar. El texto de robots se almacena en una fila
por dominio en una tabla dedicada; no existe variante por página ni por idioma.

En el back-office React de la v6 (`/melis-react`), la herramienta se entrega como un **brick full-React nativo** — una verdadera
lista + editor React que consume una capa JSON `react-api` — con un conmutador **New / Old** que recurre a
la herramienta clásica en un iframe. El modelo de datos subyacente, los gateways de tabla del engine y la ruta front dinámica
`/robots.txt` no han cambiado respecto a la v5.

## Activarlo

Añádelo a `config/melis.module.load.php`:

```php
return [
    'MelisCmsSiteRobot',
];
```

Dependencias: `melis-core` y `melis-cms`. El módulo es `dbdeploy: true`, por lo que su tabla se crea
automáticamente, y reutiliza en tiempo de ejecución los gateways de tabla proporcionados por `melis-engine`. El brick React
aparece **solo si el módulo está activado** — el host lo descubre mediante `brick.manifest.json`
(`GET /melis/react-api/react-modules`); eliminar el módulo de `melis.module.load.php` hace que
desaparezca del menú.

## Back-office (React)

**Dónde:** barra lateral izquierda → grupo **MelisCms** → **Robots.txt** (ruta de árbol `/melis-cms/site-robot`).
Se abre como una pestaña superior llamada **Robots.txt**, con dos niveles expuestos como sub-pestañas nativas del host:
**lista de dominios de sitio → el editor de robots.txt de un dominio**.

![Lista React de Robots.txt — tarjetas KPI (Domains / With robots.txt / Without robots.txt), un cuadro "Search a domain…", un filtro "All sites", Reset filters / Columns / Export, el conmutador New/Old y un refresco, con Domain / Site / Env. por fila y una insignia Set/None más una acción de edición](/screenshots/react/melis-cms-site-robot/meliscmssiterobot-tool-robots-list.png)

### Nivel 1 — la lista de dominios

La lista muestra **cada dominio de sitio de la plataforma** (una fila por dominio, alimentada desde la herramienta
**Sites**). Ofrece **tarjetas KPI** (Domains / With robots.txt / Without robots.txt), un cuadro de **búsqueda**
(coincide con el dominio o el nombre del sitio), un filtro **All sites**, un gestor de **Columns**, un botón **Export**
y **Reset filters**. La lista se desplaza de forma infinita (keyset) con ordenación del lado del servidor. Columnas: **ID**,
**Domain**, **Site**, **Env.**, **robots.txt** (una insignia **Set / None** por fila). Cada fila tiene una acción de
**edición** (lápiz) y, cuando existe contenido, una acción de **eliminación** (limpiar).

**No hay "+ New" ni eliminación de dominio** — los dominios provienen de la herramienta Sites; solo editas o
limpias el robots.txt de cada dominio.

### Nivel 2 — editar el robots.txt de un dominio

Al abrir un dominio se añade una **sub-pestaña** (con un botón **← Back**). El editor muestra el **Domain** y el
**Site** en modo de solo lectura, más un amplio área de texto monoespaciada **robots.txt content** para el cuerpo. **Save**
(arriba a la derecha) lo persiste, y se publica en vivo en el `/robots.txt` de ese dominio. Dejarlo vacío
no publica nada.

![Editor React de robots.txt — campos Domain y Site de solo lectura, un área de texto monoespaciada "robots.txt content", la sub-pestaña ← Back y un botón Save arriba a la derecha](/screenshots/react/melis-cms-site-robot/meliscmssiterobot-tool-robots-edit.png)

### Conmutador New / Old

El conmutador **New / Old** de arriba a la derecha alterna toda la herramienta entre la interfaz React (**New**, por defecto)
y la herramienta clásica renderizada en un iframe (**Old**, en
`/melis/react-tool-page?key=site_robot_tool_display`).

## Brick React

| Elemento | Valor |
| --- | --- |
| Tipo de brick | Full-React nativo (con un fallback New/Old a iframe legacy) |
| ID de brick | `siterobot` (`brick.tsx` ⇄ `brick.manifest.json`) |
| `route` del manifest | `/melis-cms/site-robot` |
| `label` | `Robots.txt` |
| `forwardKey` | `MelisCmsSiteRobot/ToolSiteRobot` |
| `melisKey` (iframe / zona renderizable) | `site_robot_tool_display` |
| `subTabs` / `persistent` | `true` / `true` |
| melisKey de capacidades | `meliscms_site_robot_tools_section` |
| Base de la API | `/melis/react-api/site-robots` |

El brick es un bundle Vite IIFE (React externalizado a globales del host). `SiteRobotPage.tsx` es el
contenedor: analiza `/[section]/site-robot[/:id]` y alterna entre `DomainList` (sin id) y
`RobotForm` (id presente), manteniendo el `mode` New/Old, las tarjetas KPI, los filtros, el gestor de columnas, Export y
el modal de confirmación de eliminación. Las sub-pestañas se controlan mediante el puente de ventana
(`window.__melisOpenSubTab` / `__melisUpdateSubTabLabel`).

## API React

Las rutas viven en `config/react-api.php`; controlador
`MelisCmsSiteRobot\Controller\MelisReactApiSiteRobotController`. Todas bajo
`/melis/react-api/site-robots`, contrato JSON `{ success, data, error }`. El controlador se comunica con
las tablas **directamente mediante SQL parametrizado** (sin servicio de módulo — igual que la herramienta legacy).

| Método y URL | Acción | Propósito |
| --- | --- | --- |
| `GET /site-robots` | `list` | Lista los dominios de sitio (keyset: `limit`, `search`, `site`, `sort`, `dir`, `after`); cada elemento lleva `hasRobots` |
| `GET /site-robots/stats` | `stats` | KPI `{ total, withRobots, withoutRobots }` |
| `GET /site-robots/sites` | `sites` | Opciones de sitio para el filtro |
| `GET /site-robots/:id` | `get` | Un dominio (`sdom_id`) + su `robotText` |
| `POST /site-robots/save` | `save` | Upsert del robots.txt de un dominio (`{ id, robotText }`) |
| `DELETE /site-robots/delete/:id` | `delete` | Limpia el robots.txt de un dominio (el dominio permanece) |

`list` hace LEFT-JOIN de `melis_cms_site_domain` con `melis_cms_site` y `melis_cms_domain_robots` (unidos por
el nombre de dominio, `robot_site_domain = sdom_domain`). `save` hace upsert de la fila de robots indexada por nombre de
dominio y limita el cuerpo almacenado a **65535 caracteres**. El orden de las rutas importa: `/stats`, `/sites`,
`/save`, `/delete/:id` se declaran **antes** del comodín `/:id` (restringido a `[0-9]+`).

### Capacidades

Declaradas en `config/react.capabilities.php` bajo el nodo portador de derechos
`meliscms_site_robot_tools_section`:

```php
return [
    'melisReactToolCapabilities' => [
        'meliscms_site_robot_tools_section' => ['list', 'edit', 'delete', 'export'],
    ],
];
```

- **`list`** — ver la lista de dominios (también controla `stats` + `sites`).
- **`edit`** — abrir (`get`) y guardar (`save`) el robots.txt de un dominio.
- **`delete`** — limpiar el robots.txt de un dominio.
- **`export`** — el botón Export (control de UI, reutiliza la lista).

**No existe** la capacidad **`create`** — no puedes añadir un dominio desde esta herramienta. Cada acción del controlador
está protegida dos veces: `denyUnlessAccess()` (autenticación + `MelisCoreRights::canAccess`) y luego `denyUnlessCan(cap)`
(permitir por defecto; el servidor sigue siendo el punto de aplicación).

## Servicios clave

El módulo no registra ningún servicio propio. La herramienta legacy y la API React comparten el mismo modelo de
datos; los gateways del engine permanecen disponibles:

| Alias de servicio | Rol |
| --- | --- |
| `MelisEngineTableRobot` | Gateway de tabla sobre `melis_cms_domain_robots` — lee y escribe `robot_text` por dominio. |
| `MelisEngineTableSiteDomain` | Alimenta la lista de dominios de sitio (`sdom_id`, `site_label`, `sdom_domain`). |

## Front office

Una ruta pública en `config/module.config.php` (`melis-cms-site-robot-special-urls`) mapea `/robots.txt`
a `ToolSiteRobotController::toolRobotsTxtAction`. La acción busca en `melis_cms_domain_robots` por
el host solicitante y devuelve el `robot_text` almacenado. Sin cambios en la v6.

| Ruta | Handler | Resultado |
| --- | --- | --- |
| `/robots.txt` | `ToolSiteRobotController::toolRobotsTxtAction` | Publica el `robot_text` almacenado para el dominio solicitante. |

## Tablas de base de datos

| Tabla | Contiene |
| --- | --- |
| `melis_cms_domain_robots` | Una entrada robots.txt por dominio: `robot_id` (PK), `robot_site_domain`, `robot_text`. |

## Archivos clave

| Aspecto | Ruta |
| --- | --- |
| Rutas de la API React | `vendor/melisplatform/melis-cms-site-robot/config/react-api.php` |
| Capacidades React | `vendor/melisplatform/melis-cms-site-robot/config/react.capabilities.php` |
| Manifest del brick React | `vendor/melisplatform/melis-cms-site-robot/public/ui-react/brick.manifest.json` |
| Controlador de la API React | `vendor/melisplatform/melis-cms-site-robot/src/Controller/MelisReactApiSiteRobotController.php` |
| Herramienta legacy + ruta `/robots.txt` | `vendor/melisplatform/melis-cms-site-robot/src/Controller/ToolSiteRobotController.php` |
| Rutas (back-office + `/robots.txt`) | `vendor/melisplatform/melis-cms-site-robot/config/module.config.php` |
| SQL de instalación | `vendor/melisplatform/melis-cms-site-robot/install/` |

Ver también: [Referencia de módulos](/es/reference/modules), [melis-cms](/es/reference/modules/melis-cms), [melis-core](/es/reference/modules/melis-core)
