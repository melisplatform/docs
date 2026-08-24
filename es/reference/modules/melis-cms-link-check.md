# MelisCmsLinkCheck

> Verificador de enlaces que rastrea una página (y, opcionalmente, sus subpáginas o sus enlaces
> internos) y registra cada enlace roto e imagen rota, manteniendo un registro de análisis por página.
> Paquete `melisplatform/melis-cms-link-check`.

## Propósito

MelisCmsLinkCheck es el verificador de enlaces de Melis. Rastrea una página —opcionalmente siguiendo
sus subpáginas o sus enlaces internos— y registra cada enlace roto e imagen rota que encuentra,
guardando un registro de análisis por página analizada. El rastreo en sí (curl, validación, inserción
del registro, traducciones) reside en el lado del servidor, en el servicio Laminas
`MelisCmsLinkCheckService::executeTest()`; el back-office React es una capa de presentación que lee y
lanza los análisis a través de los endpoints react-api del módulo.

En el back-office React de la v6 (`/melis-react`), el módulo incluye una brick nativa full-React con
dos superficies:

- Una herramienta **Verificador de enlaces** en el menú lateral izquierdo: un visor de solo lectura de
  los resultados de análisis anteriores, una ventana modal **Lanzar un análisis** y un informe de
  errores por fila, con un conmutador **Nuevo / Antiguo** que recurre a la herramienta clásica en un
  iframe.
- Una pestaña **Link Checker** en el editor de páginas CMS de React que lanza y reporta un análisis
  acotado a la única página que se está editando.

## Activarlo

Añádelo a `config/melis.module.load.php`:

```php
return [
    'MelisCmsLinkCheck',
];
```

Ambas superficies están condicionadas a la activación: solo aparecen si el módulo está activo,
detectado por el host mediante `GET /melis/react-api/react-modules` (que lista los módulos activos que
incluyen un `brick.manifest.json`). Desactivar el módulo elimina tanto la herramienta del menú como la
pestaña del editor de páginas.

## El back-office React de un vistazo

| Elemento | Valor |
| --- | --- |
| Tipo de brick | Nativa full-React (con un fallback Nuevo/Antiguo mediante iframe legacy) + una pestaña del editor de páginas |
| Id de brick | `cms-link-check` |
| `route` del manifest | `/melis-cms-link-check/results` |
| `label` | `Testeur de liens` (Link tester) |
| `forwardKey` | `MelisCmsLinkCheck/MelisCmsLinkCheckList` |
| `melisKey` (menú / iframe de la vista Antigua / nodo de derechos) | `meliscmslinkcheck_tool` |
| Clave de la pestaña de página (= su capacidad) | `meliscmslinkcheck_page_link_check_tab` |
| Base de la API | `/melis/react-api/cms-link-check` |
| Controlador react-api | `MelisReactApiLinkCheckController` (invocable `MelisReactApiLinkCheck`) |
| Tabla (propia) | `melis_cms_link_check_logs` |
| Servicio de análisis | `MelisCmsLinkCheckService::executeTest(...)` |

## La herramienta Verificador de enlaces

Barra lateral izquierda → el nodo **Verificador de enlaces** (*Testeur de liens*) abre la herramienta
como una pestaña superior. La vista Nueva lista cada registro de análisis de la plataforma, una fila
por página analizada.

![Herramienta React Verificador de enlaces mostrando tarjetas KPI, filtros y la lista de resultados](/screenshots/react/melis-cms-link-check/meliscmslinkcheck-tool-linkchecker-list.png)

La lista tiene tarjetas KPI (Páginas analizadas, Total de errores, Sitios), un cuadro de búsqueda
(coincide con la URL de la página, el id de la página, el nombre/etiqueta del sitio), un filtro de
sitio (solo los sitios que tienen registros), Restablecer filtros, un gestor de Columnas
(mostrar/ocultar/reordenar columnas, guardado localmente) y una Exportación. Haz clic en una cabecera
de columna para ordenar (por defecto: análisis más reciente primero). Los recuentos de errores se
muestran como distintivos: verde cuando es 0, rojo en caso contrario (Errores = total, Enlaces,
Imágenes).

Cada fila tiene cuatro acciones:

| Acción | Icono | Propósito |
| --- | --- | --- |
| Ver front | ojo | Abre la URL de la página analizada en una pestaña nueva. |
| Editar página | lápiz | Abre la página en el editor de páginas CMS de React y cambia a ella. |
| Informe | documento | Abre la ventana modal del informe de errores por página. |
| Eliminar | papelera | Elimina ese registro de análisis (requiere la capacidad `delete`). |

El conmutador **Nuevo / Antiguo** en la parte superior derecha alterna toda la herramienta entre el
visor React (por defecto) y la herramienta clásica renderizada en un iframe
(`/melis/react-tool-page?key=meliscmslinkcheck_tool`), que también puede usarse para lanzar análisis
a la manera legacy.

## Lanzar un análisis

El botón rojo **Lanzar un análisis** (mostrado si tienes la capacidad `launch`) abre una ventana
modal.

![Ventana modal Lanzar un análisis con selector de página, radios de alcance y casillas de verificación](/screenshots/react/melis-cms-link-check/meliscmslinkcheck-tool-linkchecker-launchscan.png)

Elige la página de inicio en el árbol de páginas CMS de carga diferida, elige un **alcance** y qué
**verificar**, y luego **Ejecutar**. El análisis rastrea la(s) página(s), registra los resultados,
actualiza la lista y publica una notificación.

- **Alcance** — Solo esta página / Esta página y sus subpáginas / Esta página y sus enlaces internos
  (enviado como `follow: '1' | '2' | '3'`).
- **Verificar** — Enlaces y/o Imágenes (enviado como `options: ['LINK', 'IMG']`).

## Leer el informe de una página

La acción **Informe** en una fila abre los errores detallados de ese registro de análisis.

![Ventana modal del informe de errores por página en su estado limpio](/screenshots/react/melis-cms-link-check/meliscmslinkcheck-tool-linkchecker-report.png)

Una página limpia muestra "✓ No error recorded for this page." Una página con errores muestra una
tabla: **Tipo** (distintivo LINK / IMG) · **URL** · **Detalles** (el fallo). El detalle proviene de la
columna XML `lcl_errors` analizada, decodificada en una `errorList` de `{ url, type, details }`.

## Verificar una página desde su editor

Abre una página en el editor de páginas CMS de React y haz clic en la pestaña **Link Checker**.
Muestra el último análisis de esa página (fecha, distintivos Errores / Enlaces / Imágenes y la tabla
de errores detallada o un mensaje de estado limpio) con un botón **Volver a analizar** —o **Lanzar un
análisis** si la página nunca se analizó— que ejecuta un análisis solo para esa página.

![Pestaña Link Checker en el editor de páginas CMS de React mostrando un análisis acotado a la página](/screenshots/react/melis-cms-link-check/meliscmslinkcheck-pageedition-tab-linkchecker-launchandreport.png)

La pestaña se aporta al editor de páginas CMS mediante el puente del host
`window.__melisRegisterPageTab` (propiedad de la brick CmsPage), con la clave
`meliscmslinkcheck_page_link_check_tab`; CmsPage la renderiza con `{ idPage }`.

## API React — endpoints

Las rutas residen en `config/react-api.php`, servidas por
`MelisCmsLinkCheck\Controller\MelisReactApiLinkCheckController`. Todas bajo
`/melis/react-api/cms-link-check`, con el contrato `{ success, data, error }`. Cada fetch envía
`X-Requested-With: XMLHttpRequest` y `credentials: 'include'`.

| Método y URL | Acción | Propósito |
| --- | --- | --- |
| `GET /cms-link-check` | `list` | Registros de análisis (keyset: `limit`, `search`, `site`, `sort`, `dir`, `after`) → `{items,total,nextCursor}` |
| `GET /cms-link-check/stats` | `stats` | KPI `{total, errors, sites}` |
| `GET /cms-link-check/sites` | `sites` | Opciones del filtro de sitio (solo los sitios presentes en los registros) |
| `POST /cms-link-check/launch` | `launch` | Ejecuta un análisis (`{pageId, follow, options}`) → `{status,message,logIds,pagesVisited}` |
| `GET /cms-link-check/by-page/:idPage` | `byPage` | Último análisis de UNA página (pestaña del editor de páginas); `data: null` si nunca se analizó |
| `DELETE /cms-link-check/delete/:id` | `delete` | Elimina un registro de análisis |
| `GET /cms-link-check/:id` | `get` | Un registro + su `errorList:[{url,type,details}]` analizada |

> El orden de las rutas importa: `/stats`, `/sites`, `/launch`, `/by-page/:idPage` y `/delete/:id` se
> declaran antes de la ruta comodín `/:id`.

Las acciones `list`, `stats`, `sites`, `get`, `by-page` y `delete` leen `melis_cms_link_check_logs`
directamente mediante SQL parametrizado (`Laminas\Db\Adapter\AdapterInterface`). Solo `launch` delega
en `MelisCmsLinkCheckService::executeTest([...])` —el rastreo real— envuelto en `ob_start()` /
`ob_end_clean()` para que las advertencias legacy no corrompan el JSON. El selector de página de
Lanzar un análisis reutiliza un endpoint legacy existente (sin nuevo backend):
`GET /melis/MelisCms/TreeSites/get-tree-pages-by-page-id?nodeId=<id>` (`nodeId=-1` → sitios raíz).

## Capacidades

Declaradas en `config/react.capabilities.php` bajo dos nodos portadores de derechos:

```php
return [
  'melisReactToolCapabilities' => [
    'meliscmslinkcheck_tool' => ['list', 'launch', 'delete', 'export'],
    'meliscms_page' => [
      'tabs' => [
        ['key' => 'meliscmslinkcheck_page_link_check_tab', 'label' => 'tr_meliscmslinkcheck_page_link_check_tab'],
      ],
    ],
  ],
];
```

- **Capacidades de la herramienta** — `list` (todo el visor de solo lectura: list/stats/sites/report),
  `launch` (ejecutar un análisis), `delete` (eliminar un registro), `export` (el botón Exportar; la
  exportación reutiliza el endpoint `list`). En React condicionan la interfaz mediante
  `MelisCan('meliscmslinkcheck_tool', cap)`; en el lado del servidor, cada acción está protegida por
  `denyUnlessAccess()` y luego `denyUnlessCan('list'|'launch'|'delete')`.
- **Capacidad de la pestaña de página** — la `key` `meliscmslinkcheck_page_link_check_tab` debe
  coincidir con la clave pasada a `window.__melisRegisterPageTab`; *es* la capacidad de la pestaña.
  Sin esta declaración, la lista blanca de capacidades de la página CMS oculta el botón de la pestaña
  incluso para un administrador. El endpoint `by-page` de la pestaña está protegido únicamente por la
  autenticación de sesión (es una subfuncionalidad del editor de páginas); el botón, por esta
  capacidad.

## Tablas de base de datos

| Tabla | Función |
| --- | --- |
| `melis_cms_link_check_logs` | Un registro de análisis por página analizada: recuentos de enlaces rotos / imágenes rotas más la lista detallada de errores almacenada como XML en la columna `lcl_errors`. |

## Controladores legacy (vista Antigua)

Usados por el fallback iframe Nuevo/Antiguo y por la herramienta clásica, no por el visor React:

| Controlador | Función |
| --- | --- |
| `MelisCmsLinkCheckListController` | Página de la herramienta clásica + sus DataTables de resultados. |
| `MelisCmsLinkCheckLaunchController` | Modal / formulario de lanzamiento clásico (página + alcance + verificación). |
| `MelisCmsLinkCheckPageLinkCheckController` | Pestaña Link Check de edición de páginas clásica (`renderPageLinkCheckAction`, `{ idPage }`). |

## Archivos clave

| Aspecto | Ruta |
| --- | --- |
| Rutas react-api + invocable | `config/react-api.php` |
| Capacidades | `config/react.capabilities.php` |
| Configuración de la herramienta legacy | `config/app.*.php` |
| Controlador react-api | `src/Controller/MelisReactApiLinkCheckController.php` |
| Servicio de análisis | `src/Service/MelisCmsLinkCheckService.php` |
| Código fuente de la brick React | `ui-react/src/` (`brick.tsx`, `LinkCheckPage.tsx`, `linkcheck-api.ts`, …) |
| Brick compilada + manifest | `public/ui-react/brick.js`, `public/ui-react/brick.manifest.json` |
