# MelisCmsProspects

> Gestión de leads / contactos: un formulario de contacto de front-office captura los mensajes de los visitantes como prospectos, y un back-office en React le permite navegar, filtrar, editar, exportar y eliminarlos, además de clasificar las solicitudes por temas. Paquete `melisplatform/melis-cms-prospects`.

## Propósito

`MelisCmsProspects` captura los envíos del formulario de contacto de los visitantes como **prospectos** (leads) almacenados en
la base de datos. Los usuarios del back-office navegan, filtran, editan, exportan (CSV/Excel) y eliminan esos leads,
y los clasifican por **temas**. El módulo incluye un widget de estadísticas para el panel de control y se integra con
las herramientas de RGPD de la plataforma (información de usuario / extracción / eliminación + ciclo de eliminación automática).

En Melis v6 las dos herramientas de back-office — **Prospects** y **Themes** — son **interfaces nativas
completamente en React** servidas bajo `/melis-react`, cada una comunicándose con una capa JSON `react-api`. El modelo de datos
subyacente, los servicios, el plugin front Show Form y la integración RGPD no han cambiado respecto a v5.

## Activarlo

Añada a `config/melis.module.load.php`:

```php
return [
    'MelisCmsProspects',
];
```

Dependencias: `melis-core`, `melis-engine`, `melis-front`, `melis-cms` y
`laminas/laminas-mvc-plugin-flashmessenger`. El módulo es `dbdeploy: true` — sus tablas se
crean/actualizan mediante el mecanismo dbdeploy. Ambas herramientas React aparecen en el back-office solo
mientras el módulo está activo (se descubren desde su `brick.manifest.json`).

## Back-office React

**Dónde:** barra lateral izquierda → **MelisMarketing** → **Prospects** → **Prospects** / **Themes**. Cada una
se abre como su propia pestaña superior. Cada herramienta mantiene un conmutador **New / Old**: *New* es la interfaz React
(por defecto), *Old* renderiza la herramienta heredada en un iframe (`/melis/react-tool-page?key=<melisKey>`).

Dos bricks se incluyen en un mismo bundle (`public/ui-react/brick.manifest.json`):

| Elemento | Prospects | Themes |
| --- | --- | --- |
| ID de brick / ruta | `prospects` — `/prospects` | `prospect-themes` — `/prospect-themes` |
| `forwardKey` (menú → ruta) | `MelisCmsProspects/ToolProspects` | `MelisCmsProspects/ProspectThemes` |
| `melisKey` del iframe Old-view (zona) | `MelisCmsProspects_tool_prospects` | `MelisCmsProspects_tool_themes` |
| melisKey de permisos / capacidad | `melisprospects_tool_prospects_section` | `melisprospects_tool_themes_section` |
| Base de la API | `/melis/react-api/prospects` | `/melis/react-api/prospect-themes` |
| Controlador | `MelisReactApiProspectController` | `MelisReactApiProspectThemeController` |

> Nota: el `melisKey` del manifiesto es la clave de la **zona** renderizable utilizada para el iframe Old-view —
> los permisos **no** dependen de él. La protección de acceso y las capacidades se basan en el nodo de menú
> `melisprospects_tool_..._section` (declarado en `config/app.interface.php`).

### Herramienta Prospects

![La herramienta Prospects en React: tarjetas KPI (Total / This month / Average per month / Anonymized), búsqueda, filtros All-sites y All-types, un selector de rango de fechas, Reset filters, un gestor de Columns, Export, el conmutador New/Old y un botón de actualización — cada fila tiene acciones de edición y eliminación](/screenshots/react/melis-cms-prospects/meliscmsprospects-tool-prospects-list.png)

Verá **todos los prospectos de la plataforma**. La lista tiene **cuatro tarjetas KPI** (Total, This month,
Average per month, Anonymized), un cuadro de **búsqueda** (nombre / correo electrónico / teléfono / empresa), un filtro de
**sitio**, un filtro de **tipo**, un selector de rango de **fechas** (Today / Yesterday / Last 7 / Last 30 / This
month / Last month / Custom), **Reset filters**, un gestor de **Columns** persistente, **Export** y
un botón de actualización. Haga clic en una cabecera para **ordenar** (todas las columnas excepto *Message*). Cada fila tiene **editar**
y **eliminar**.

Los prospectos **no se crean** aquí — solo llegan desde el formulario de contacto del front. Al hacer clic en
**editar** se abre el prospecto como una **subpestaña** anfitriona (← Back) que muestra un formulario React: una tarjeta de **Contact
information** (Name, Email, Phone, Company, Country), una tarjeta de **Message** y una tarjeta lateral de **Details**
(selector de **Site**, selector de **Theme**, **Contact date** de solo lectura). Ningún campo es obligatorio
(el correo electrónico solo se valida en formato si está relleno); **Contact date** y **type** son inmutables — se
establecen en el momento de la captura por el formulario del front.

![El formulario de edición de prospecto en React — una tarjeta de Contact information (Name, Email, Phone, Company, Country), un cuadro de Message y una tarjeta lateral de Details (Site, Theme, Contact date de solo lectura); la barra de subpestañas muestra el desglose (← Back · Paul Martin)](/screenshots/react/melis-cms-prospects/meliscmsprospects-tool-prospects-edit.png)

### Herramienta Themes

La lista de Themes muestra **dos tarjetas KPI** (Total themes, total Items), un cuadro de **búsqueda**, **Reset
filters**, un gestor de **Columns**, **Export**, el conmutador **New/Old** y **+ New theme**. Cada fila
muestra el **nombre** del tema y su **recuento de elementos**, con tres acciones: **renombrar** (modal de un solo campo),
**editar** (abre la subpestaña **Items** del tema) y **eliminar**.

![La herramienta Themes en React: tarjetas KPI Total / Items, búsqueda, Reset filters, Columns, Export, conmutador New/Old y "+ New theme" — cada fila expone renombrar, editar (abrir elementos) y eliminar](/screenshots/react/melis-cms-prospects/meliscmsprospects-tool-themes-list.png)

![El modal "New theme" — un único campo Name (el código lo conserva el back-end, no se introduce aquí)](/screenshots/react/melis-cms-prospects/meliscmsprospects-tool-themes-new-modal.png)

Al editar un tema se abre su panel de **Items** como una subpestaña (← Back + nombre del tema): una lista buscable de
elementos (id + nombre) con edición/eliminación por fila y **+ New item**. Al añadir o editar un elemento se abre un
modal que captura un **nombre por idioma del CMS** — una fila de pestañas de idioma (bandera + punto verde de "relleno")
más el campo **Name** para el idioma activo. Se debe rellenar al menos un idioma.

![El panel de Items de un tema (subpestaña) para "My Billing" — una lista buscable de elementos con edición/eliminación por fila y un botón "+ New item", mostrado como una subpestaña de desglose](/screenshots/react/melis-cms-prospects/meliscmsprospects-tool-themes-edit-themecategorylist.png)

![El modal "New item" — pestañas "Content per language" (English / Français) y el campo Name para el idioma activo](/screenshots/react/melis-cms-prospects/meliscmsprospects-tool-themes-edit-themecategorylist-new-modal.png)

## API React

Las rutas residen en `config/react-api.php` (fusionadas mediante `Module::getConfig()`). Todas bajo
`/melis/react-api/`, contrato `{ success, data, error }`; cada petición envía
`X-Requested-With: XMLHttpRequest` y `credentials: 'include'`.

**Prospects** — `MelisReactApiProspectController`:

| Método y URL | Propósito |
| --- | --- |
| `GET /prospects` | Lista keyset (`limit,search,site,type,dateFrom,dateTo,sort,dir,after`) → `{items,total,nextCursor}` |
| `GET /prospects/stats` | KPIs `{total, thisMonth, avgPerMonth, anonymized}` |
| `GET /prospects/sites` | Opciones del filtro de sitio |
| `GET /prospects/types` | Valores distintos de `pros_type` |
| `GET /prospects/themes` | Opciones de elementos de tema para el selector Theme del formulario |
| `GET /prospects/:id` | Un prospecto (formateado) |
| `POST /prospects/save` | **Solo actualización** (sin creación); fecha de contacto y tipo inmutables en el servidor |
| `DELETE /prospects/delete/:id` | Eliminar un prospecto |

**Themes e items** — `MelisReactApiProspectThemeController`:

| Método y URL | Propósito |
| --- | --- |
| `GET /prospect-themes` | Lista keyset de temas → `{items,total,nextCursor}` con `itemCount` |
| `GET /prospect-themes/stats` | KPIs `{total, withCode, items}` |
| `GET /prospect-themes/:id` | Un tema `{id,name,code,itemCount}` |
| `POST /prospect-themes/save` | Crear (id=0) / actualizar (name obligatorio ≤45, único; code preservado si ausente) |
| `DELETE /prospect-themes/delete/:id` | Eliminar un tema + items + traducciones (cascada) |
| `GET /prospect-themes/languages` | Idiomas del CMS `{languages:[{id,name,locale}]}` |
| `GET /prospect-themes/items?themeId=X` | Los items de un tema (nombre en el idioma de la sesión) |
| `GET /prospect-themes/items/:id` | Un item `{id,themeId,translations:{langId:text}}` |
| `POST /prospect-themes/items/save` | Crear/actualizar un item (≥1 traducción no vacía; upsert/delete por idioma) |
| `DELETE /prospect-themes/items/delete/:id` | Eliminar un item + sus traducciones |

```ts
// update a prospect (no create)
await apiFetch<{id:number}>('/melis/react-api/prospects/save', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: 3, siteId: 1, name: 'Paul Martin',
    email: 'paul.martin@example.com', message: '…', theme: null }),
})
// save a theme item (name per language)
await apiFetch<{id:number}>('/melis/react-api/prospect-themes/items/save', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: 0, themeId: 2, translations: { '1': 'My invoices', '2': 'Mes factures' } }),
})
```

> Ambos controladores se comunican con las tablas directamente mediante SQL parametrizado (`AdapterInterface`, listas
> keyset a través de `MelisReactKeysetListTrait`), reproduciendo las reglas de negocio heredadas. Siguen disparando
> los eventos de log heredados (`meliscmsprospects_toolprospects_save_end` / `_delete_end`,
> `meliscmsprospects_theme_save_end` / `_delete_end`, `meliscmsprospects_theme_item_save_end`) para
> que los listeners de flash/log del módulo sigan funcionando.

## Capacidades

Declaradas en `config/react.capabilities.php` (`melisReactToolCapabilities`), indexadas por el
melisKey del nodo de menú portador de permisos. `Capabilities::flatten()` produce cadenas con puntos que se pasan a
`MelisCan(melisKey, cap)` en React y a `denyUnlessCan(cap)` en el servidor (permitir por defecto para una
capacidad no declarada).

```php
'melisprospects_tool_prospects_section' => ['list', 'edit', 'delete', 'export'], // NO create
'melisprospects_tool_themes_section' => [
    'actions' => ['create', 'list', 'edit', 'delete', 'export'],
    'tabs' => [
        ['key' => 'items', 'label' => 'tr_melis_cms_prospects_theme_items',
         'actions' => ['list', 'create', 'edit', 'delete']],
    ],
],
```

- **Prospects**: `list`, `edit`, `delete`, `export` (sin `create` — un prospecto solo nace desde el
  formulario de contacto público).
- **Themes**: `create`, `list`, `edit`, `delete`, `export`, más la subpestaña `items`
  (`items`, `items.list`, `items.create`, `items.edit`, `items.delete`).

Cada acción de controlador protege dos veces: `denyUnlessAccess()` (autenticación + `MelisCoreRights::canAccess`)
y luego `denyUnlessCan('list')`, etc. `save` elige `edit` o `create` según el id.

## Servicios clave

| Alias de servicio | Rol |
| --- | --- |
| `MelisCmsProspectsService` / `MelisProspectsService` | Servicio principal. `saveProspectsDatas($datas, $prosId = null)` crea o actualiza un prospecto; `getProspectsDataForWidgets($widgetId = '')` devuelve los recuentos de total / este mes / promedio; `getProspectsDataByDate($type, $date)` cuenta los registros por fecha; `getWidgetProspects($identifier)` recupera datos para un widget. |
| `MelisProspectsGdprAutoDeleteService` | Gestiona el ciclo de eliminación automática RGPD (lista de módulos, lista de etiquetas, listas de usuarios de advertencia / segunda advertencia, eliminación de cuentas). |

Table gateways: `MelisProspects`, `MelisCmsProspectsThemeTable`,
`MelisCmsProspectsThemeItemTable`, `MelisCmsProspectsThemeItemTransTable`.

> Los controladores React **no** usan `MelisCmsProspectsService` (consultan las tablas
> directamente); las herramientas clásicas (vista Old), el plugin Show Form, el widget del panel de control y los
> listeners RGPD siguen dependiendo de él.

## Front office

El plugin de controlador `MelisCmsProspectsShowFormPlugin` renderiza el formulario de contacto en el
front. Arrastre el bloque **Show Form** a una página desde el panel de plugins del editor de páginas React (en
**Melis Cms Prospects**). Su modal de configuración mantiene tres pestañas:

![El editor de páginas React con el panel de plugins abierto — el bloque "Contact Form" se encuentra bajo el grupo "Melis Cms Prospects", listo para arrastrar a la página](/screenshots/react/melis-cms-prospects/meliscmsprospects-page-menu-plugins-selector.png)

![Show Form — pestaña Field list: el constructor de campos — por cada campo un conmutador Show/Hide y una casilla Mandatory; las filas se pueden reordenar arrastrando, de modo que su orden es el orden del formulario](/screenshots/react/melis-cms-prospects/meliscmsprospects-page-plugins-showform-config-tab-fieldlist.png)

| Pestaña | Controles |
| --- | --- |
| Properties | Plantilla de renderizado (`template_path`) y sitio de origen (`pros_site_id`). |
| Field list | Constructor de campos — por cada campo un conmutador Show/Hide y una casilla Mandatory (habilitada solo cuando Show está activado); arrastre las filas para establecer el orden del formulario. Campos: `pros_name`, `pros_company`, `pros_country`, `pros_email`, `pros_telephone`, `pros_message`. |
| Themes | El tema que rellena el desplegable de asunto del formulario. |

Archivo de configuración: `config/plugins/MelisCmsProspectsShowFormPlugin.config.php`. Plantilla del front:
`view/.../plugins/prospects-form.phtml`. En el Dashboard del back-office, el widget de **Prospects
Statistics** (`MelisCmsProspectsStatisticsPlugin`, sección `MelisMarketing`) grafica los
registros a lo largo del tiempo.

![El widget de panel de control "Prospects statistics" — un gráfico de registros Daily/Monthly/Yearly más una tabla de los prospectos más recientes](/screenshots/react/melis-cms-prospects/meliscmsprospects-dashboard-plugin-prospectsstatistics.png)

## Tablas de la base de datos

| Tabla | Contiene |
| --- | --- |
| `melis_cms_prospects` | Un lead capturado: sitio, tipo, tema, nombre, correo electrónico, teléfono, mensaje, empresa, país, fecha de contacto, última fecha RGPD. PK: `pros_id`. |
| `melis_cms_prospects_themes` | Temas de asunto (`pros_theme_name`, `pros_theme_code`). PK: `pros_theme_id`. |
| `melis_cms_prospects_theme_items` | Elementos pertenecientes a un tema. PK: `pros_theme_item_id`. |
| `melis_cms_prospects_theme_items_trans` | Traducciones por idioma de los elementos de tema. PK: `item_trans_id`. |

## Hooks de eventos

Adjunte con `MelisCmsProspects` como identificador de destino:

| Nombre del evento | Disparado por |
| --- | --- |
| `meliscmsprospects_toolprospects_save_start` / `_end` | Herramienta Prospects (clásica + controlador React) |
| `meliscmsprospects_toolprospects_delete_start` / `_end` | Herramienta Prospects (clásica + controlador React) |
| `meliscmsprospects_theme_save_end` / `_delete_end` | Herramienta Themes (clásica + controlador React) |
| `meliscmsprospects_theme_item_save_end` | Elementos de tema (clásica + controlador React) |

```php
$sharedEvents->attach(
    'MelisCmsProspects',
    'meliscmsprospects_toolprospects_save_end',
    $fn,
    50
);
```

Los listeners RGPD (información de usuario, extracción, eliminación, eliminación automática) están cableados en `src/Module.php`. Las asignaciones de
campos RGPD residen en `config/app.gdpr.php`.

## Archivos clave

| Aspecto | Ruta (bajo `vendor/melisplatform/melis-cms-prospects/`) |
| --- | --- |
| Configuración de módulo / rutas / servicios | `config/module.config.php` |
| Rutas react-api + invokables | `config/react-api.php` |
| Capacidades React | `config/react.capabilities.php` |
| Árbol de interfaz del back-office | `config/app.interface.php` |
| Tablas y formularios de herramientas clásicas | `config/app.tools.php` |
| Configuración del plugin de plantillas | `config/plugins/MelisCmsProspectsShowFormPlugin.config.php` |
| Configuración del widget del panel de control | `config/dashboard-plugins/` |
| Asignación de campos RGPD | `config/app.gdpr.php` |
| Controladores de la API React | `src/Controller/MelisReactApiProspectController.php`, `MelisReactApiProspectThemeController.php` |
| Controladores clásicos | `src/Controller/ToolProspectsController.php`, `MelisCmsProspectsThemesController.php`, `MelisCmsProspectsThemeItemsController.php` |
| Servicio principal | `src/Service/MelisCmsProspectsService.php` |
| Servicio de eliminación automática RGPD | `src/Service/` |
| Plugin del formulario front | `src/Controller/Plugin/MelisCmsProspectsShowFormPlugin.php` |
| Widget del panel de control | `src/Controller/DashboardPlugins/MelisCmsProspectsStatisticsPlugin.php` |
| Bricks React (fuente / build) | `ui-react/src/` → `public/ui-react/brick.js` + `brick.manifest.json` |
| Table gateways | `src/Model/Tables/` |
| Listeners RGPD y bootstrap | `src/Module.php`, `src/Listener/` |

Véase también: [Referencia de módulos](/es/reference/modules) · [melis-cms](/es/reference/modules/melis-cms) · [melis-core](/es/reference/modules/melis-core)
