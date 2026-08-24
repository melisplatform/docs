# MelisCms

> El back-office del CMS — sitios, árbol de páginas, editor de páginas, plantillas, estilos y SEO, entregado como un back-office React. Paquete `melisplatform/melis-cms`.

## Propósito

`MelisCms` es el back-office donde construyes y gestionas tus sitios web en la plataforma Melis.
Proporciona el árbol de páginas del sitio, el editor de páginas (pestañas Edición, Propiedades, SEO,
Idiomas), las zonas de plugins con arrastrar y soltar para componer contenido, y las herramientas de
administración de sitios, plantillas, estilos, idiomas, IDs de plataforma, dominios y redirecciones.
**No posee ninguna tabla de base de datos** — lee y escribe todo a través de
[melis-engine](/legacy/reference/modules/melis-engine), y el renderizado de páginas (incluida la
vista previa de edición en vivo) lo gestiona [melis-front](/legacy/reference/modules/melis-front).

En Melis v6 la lógica de negocio no cambia; la **capa de presentación** es un **back-office React**
(`/melis-react`). MelisCms incluye **un único bundle multi-brick** que expone **nueve herramientas**:
el editor de páginas (un host de barra lateral: árbol de páginas + editor con pestañas) y **ocho
herramientas laterales React nativas**. La única parte que sigue siendo la interfaz clásica es la
pestaña **Edición** del editor de páginas, cargada en un iframe.

## El trío MelisCms / MelisFront / MelisEngine

Estos tres módulos forman un sistema fuertemente acoplado; una pregunta sobre uno suele implicar a los otros.

- **MelisEngine** — posee todo el modelo de base de datos del CMS (páginas, árbol, sitios, plantillas,
  idiomas, SEO, estilos) y lo expone mediante table gateways y servicios. Define `MelisTemplatingPlugin`,
  la clase base que extiende todo bloque de contenido.
- **MelisFront** — la canalización de renderizado del front-office; convierte una URL en una página
  terminada e impulsa la vista previa editable en vivo dentro del back-office (`renderMode/melis`).
- **MelisCms** *(este módulo)* — la capa de interfaz del back-office; dirige el ciclo de vida de la
  página disparando eventos que los listeners del engine y del front manejan.

**Orden de carga:** `melis-core` → `melis-front` → `melis-engine` → `melis-cms`.

## Activarlo

Añade a `config/melis.module.load.php`:

```php
return [
    'MelisCms',
];
```

Requiere `melisplatform/melis-core`, `melisplatform/melis-engine` y `melisplatform/melis-front`.
No tiene SQL de instalación propio; el esquema del CMS forma parte de melis-engine. Los bricks
aparecen en el back-office React solo cuando MelisCms está activo (descubrimiento vía
`GET /melis/react-api/react-modules`).

## El back-office React — un bundle, nueve bricks

El bundle (`public/ui-react/brick.js` + `brick.manifest.json`) declara nueve bricks que se
autorregistran en `brick.tsx`. Todos son React nativos completos excepto la pestaña Edición del
editor de páginas.

| ID del brick | Ruta | melisKey | Tipo |
| --- | --- | --- | --- |
| `cms` | `/melis-cms/page` | `meliscms_page` | Editor de páginas (host de barra lateral: árbol + editor con pestañas) |
| `cms-sites` | `/melis-cms/sites` | `meliscms_tool_sites` | React nativo (lista + editor + asistente de 5 pasos) |
| `cms-templates` | `/melis-cms/templates` | `meliscms_tool_templates` | React nativo (lista + formulario) |
| `cms-styles` | `/melis-cms/styles` | `meliscms_tool_styles` | React nativo |
| `cms-languages` | `/melis-cms/languages` | `meliscms_tool_language` | React nativo |
| `cms-platform-ids` | `/melis-cms/platform-ids` | `meliscms_tool_platform_ids` | React nativo |
| `cms-site-301` | `/melis-cms/site-301` | `meliscms_tool_site_301` | React nativo |
| `cms-mini-templates` | `/melis-cms/mini-templates` | `meliscms_mini_template_manager_tool` | React nativo |
| `cms-menu-manager` | `/melis-cms/menu-manager` | `meliscms_mini_template_menu_manager_tool` | React nativo |

El brick `cms` es especial: registra **tanto** un `Component` con ruta (el editor con pestañas)
**como** una `Sidebar` (el árbol de páginas), de modo que el árbol permanece visible en la barra
lateral izquierda mientras trabajas. Cada herramienta lateral incluye un conmutador **New / Old** —
*New* es la interfaz React, *Old* es la herramienta clásica en un iframe
(`/melis/react-tool-page?key=<melisKey>`).

![La sección MelisCms en la barra lateral React — el panel PAGE TREE y el grupo Site Tools](/screenshots/react/melis-cms/meliscms-menu-entry.png)

## Árbol de páginas (barra lateral izquierda)

El árbol de páginas es el mapa de tus sitios y de cada página dentro de ellos. Haz clic en una página
para abrirla como pestaña superior en el editor; la búsqueda encuentra páginas aún no cargadas y
expande el árbol hasta ellas; el menú contextual (clic derecho) de un nodo añade una página hija,
muestra detalles, duplica una página o una rama entera, o elimina. Mueve una página arrastrando y
soltando (los permisos del lado del servidor deciden qué puedes mover).

![El árbol de páginas React — sitios y páginas, con indicadores de borrador, bloqueo y raíz de sitio](/screenshots/react/melis-cms/meliscms-menu-site-treeview.png)

El árbol reutiliza los endpoints heredados del CMS (sin cambios en el backend) a través de `cms-tree-api.ts`:

| Propósito | Endpoint |
| --- | --- |
| Hijos de un nodo (carga diferida) | `GET /melis/MelisCms/TreeSites/get-tree-pages-by-page-id?nodeId=<id>` (`-1` = raíces de sitios) |
| Buscar páginas por nombre | `POST /melis/MelisCms/Page/searchTreePages` |
| Mover / reasignar padre | `GET /melis/MelisCms/Page/movePage` |
| Duplicar un árbol | `POST /melis/MelisCms/TreeSites/duplicateTreePage` |
| Eliminar una página | `GET /melis/MelisCms/Page/deletePage?idPage=<id>` |

El árbol escucha el evento `melis:cms-tree-refresh` para refrescarse y revelar una página tras
Guardar/Publicar/Eliminar.

## Editor de páginas

Abre una página desde el árbol, o usa un enlace directo `/melis-cms/page/:idPage`. El editor tiene un
**chrome React nativo** (título + estado, botones de acción, barra de pestañas) alrededor del
contenido de la pestaña. El chrome se ensambla a partir de una estructura fusionada en el servidor
(`GET /melis/react-api/cms-page/structure?idPage=<id>` → `{ header, tabs[], buttons[] }`), de modo
que **otros módulos pueden añadir pestañas y botones fusionando configuración del lado del servidor**.

Primero las pestañas nativas, luego cualquiera aportada por otros módulos: **Edición · Propiedades ·
SEO · Idiomas · Histórico · Page Analytics · Scripts · Open Graph · Link Checker · Google Analytics ·
Versionado · Comentarios**. Botones de acción: **Nueva página · Duplicar · Borrar borrador · Eliminar
página · Ver · Mostrar · Guardar · Publicar** (más un conmutador de estado Publicar/En línea y botones
modulares como Workflow).

### Pestaña Propiedades (React nativo)

Establece el **nombre** de la página, el **tipo** (Página / Carpeta / Sitio…), la **plantilla**
(layout), el **idioma** (bloqueado tras la creación), la **visualización en el menú**, el **estilo** y
las palabras clave de taxonomía.

![La pestaña Propiedades React — nombre, tipo, plantilla, idioma, visualización en menú, estilo y taxonomía](/screenshots/react/melis-cms/meliscms-page-tab-properties.png)

### Pestaña Edición (arrastrar y soltar heredado en un iframe)

La pestaña Edición ocupa la página: se renderiza en vivo y **arrastras bloques de contenido
(plugins)** a las zonas de la plantilla. Es el **editor clásico cargado en un iframe** dentro del
chrome React (`/melis/react-tool-page?key=meliscms_page&idPage=<id>`); el arrastrar y soltar, el menú
de plugins, el gestor de mini-plantillas y los editores de texto enriquecido son los mismos que en el
back-office clásico. Su contenido se guarda automáticamente en la sesión PHP y se escribe cuando
Guardas o Publicas.

![La pestaña Edición — la página en vivo con la superposición de arrastrar y soltar, dentro del chrome del editor React](/screenshots/react/melis-cms/meliscms-page-tab-edition.png)

![El panel de plugins — los bloques de contenido que puedes soltar en la página; la lista depende de los módulos activos del sitio](/screenshots/react/melis-cms/meliscms-page-tab-edition-menu-templating-plugins.png)

![Diseños de zona de arrastrar y soltar — elige cómo dividir una zona para colocar tus bloques](/screenshots/react/melis-cms/meliscms-page-tab-edition-dragdropzone-layouts.png)

### Pestañas SEO e Idiomas (React nativo)

La pestaña **SEO** contiene la URL amigable, el meta título/descripción, las URLs canónica y de
redirección. La pestaña **Idiomas** gestiona las versiones de idioma de la página (cada una con su
propio contenido y SEO).

![La pestaña SEO React — URL, meta título/descripción y campos de redirección](/screenshots/react/melis-cms/meliscms-page-tab-seo.png)

### Guardar frente a publicar

- **Guardar** escribe el borrador (Propiedades + SEO + el XML de Edición juntos, en una sola acción).
- **Ver → Vista previa / Ver en línea** muestra el borrador o la página en vivo.
- **Publicar** pone en vivo el borrador actual; el conmutador de estado publica / despublica.
- **Borrar borrador** descarta el borrador y vuelve a la versión publicada.

Guardar/Publicar envían a los endpoints **heredados** con los nombres de campo heredados:
`POST /melis/MelisCms/Page/savePage?idPage=` y `.../publishPage?idPage=` (más `unpublishPage`,
`clearSavedPage`, `deletePage`); el XML de Edición se lee de la sesión PHP.

## Herramientas laterales

### Sites — crear y gestionar sitios web

`/melis-cms/sites`. Cada fila es un sitio web completo (ID, nombre, módulo, idiomas). **+ New site**
ejecuta un **asistente de 5 pasos**: Multilingüe → Idiomas → Dominios → Módulo → Resumen. Un sitio
existente se gestiona mediante pestañas React nativas: **Properties · Module Loading · Domains ·
Languages · Site Config · Translations · Scripts**.

![La herramienta Sites React — búsqueda, Columns, Export, conmutador New/Old y + New site](/screenshots/react/melis-cms/meliscms-tool-sites-list.png)

![Edición de sitio — pestaña Module Loading: conmutadores por módulo con orden de carga reordenable arrastrando](/screenshots/react/melis-cms/meliscms-tool-sites-edit-tab-moduleloading.png)

![Edición de sitio — pestaña Site Config: General más ajustes clave/valor por idioma](/screenshots/react/melis-cms/meliscms-tool-sites-edit-tab-siteconfig.png)

### Templates — diseños de página

`/melis-cms/templates`. Lista nativa y formulario nativo: Name / Type / Site, y Layout / Controller /
Action (el layout `.phtml` al que se asigna la plantilla).

![La lista Templates React — tarjetas KPI, controller/action, layout y sitio por fila](/screenshots/react/melis-cms/meliscms-tool-templatemanager-list.png)

### Styles — CSS aplicado a las páginas

`/melis-cms/styles`. Gestiona hojas de estilo CSS (nombre, ruta/origen del CSS, sitio); adjunta un
estilo a una página desde la pestaña Propiedades de la página.

![La lista Styles React — estado, nombre, ruta CSS y sitio por fila](/screenshots/react/melis-cms/meliscms-tool-stylemanager-list.png)

### Front-office Languages

`/melis-cms/languages`. La lista maestra de locales que la plataforma conoce (locale + nombre con bandera).

### Platforms IDs — rangos de ID de página por entorno

`/melis-cms/platform-ids`. Reserva una banda distinta de IDs de página y plantilla por entorno para
que los IDs nunca colisionen al mover contenido entre dev / staging / producción.

![La lista Platforms IDs React — rangos de ID de página y plantilla por plataforma](/screenshots/react/melis-cms/meliscms-tool-platformids-list.png)

### 301 Redirects — mantener los enlaces antiguos funcionando

`/melis-cms/site-301`. Cuando cambia una URL pública, añade una redirección (URL antigua → URL nueva,
única por sitio) para que la dirección antigua siga resolviéndose.

![La lista 301 Redirects React — URL antigua a URL nueva por sitio](/screenshots/react/melis-cms/meliscms-tool-siteredirect-list.png)

### Mini-Templates y Menu manager

Las Mini-Templates (`/melis-cms/mini-templates`) son bloques de contenido preconstruidos que los
editores pueden soltar en una página con un solo clic; el Menu manager (`/melis-cms/menu-manager`) las
organiza en categorías para que sean fáciles de encontrar en el gestor de mini-plantillas del editor
de páginas.

![El Menu manager React — un árbol reordenable por arrastre de categorías y sus mini-plantillas](/screenshots/react/melis-cms/meliscms-tool-minitemplate-menu-manager.png)

## Endpoints de la API React

Las rutas se declaran en `config/react-api.php` bajo `/melis/react-api/…`; los controladores están en
`src/Controller/MelisReactApi*Controller.php`. Cada acción está protegida por `CapabilityGuardTrait`
(`denyUnlessAccess()` para `MelisCoreRights::canAccess(MELIS_KEY)`, luego `denyUnlessCan('<action>')`).
El contrato en todas partes es `{ success, data }` en caso de OK y `{ success:false, error }` en caso
de fallo; cada fetch envía `X-Requested-With: XMLHttpRequest` con credenciales.

| Controlador | Guard (melisKey) | Base | Acciones |
| --- | --- | --- | --- |
| `MelisReactApiPageController` | `meliscms_page` | `/cms-page` | `structure`, `properties`, `seo`, `refs`, `languages`, `ancestors`, `save-properties`, `save-seo` |
| `MelisReactApiCmsSitesController` | `meliscms_tool_sites` | `/cms-sites` | `list`, `meta`, `get`, `config`, `modules`, `create` |
| `MelisReactApiSiteRedirectController` | `meliscms_tool_site_301` | `/site-redirects` | `list`, `stats`, `sites`, `get`, `save`, `delete` |
| `MelisReactApiTemplateController` | `meliscms_tool_templates` | `/templates` | `list`, `stats`, `sites`, `get`, `save`, `delete` |
| `MelisReactApiCmsLanguageController` | `meliscms_tool_language` | `/cms-languages` | `list`, `stats`, `get`, `save`, `delete` |
| `MelisReactApiCmsPlatformIdController` | `meliscms_tool_platform_ids` | `/cms-platform-ids` | `list`, `stats`, `get`, `save`, `delete` |
| `MelisReactApiCmsStyleController` | `meliscms_tool_styles` | `/cms-styles` | `list`, `stats`, `sites`, `get`, `save`, `delete` |
| `MelisReactApiCmsMiniTemplateController` | `meliscms_mini_template_manager_tool` | `/cms-mini-templates` | `list`, `stats`, `sites`, `item`, `save`, `delete` |
| `MelisReactApiCmsMenuManagerController` | `meliscms_mini_template_menu_manager_tool` | `/menu-manager` | `sites`, `languages`, `tree`, `saveTree`, `category`, `saveCategory`, `deleteCategory` |

```ts
// GET the styles list (keyset), then POST a 301 redirect
const r = await fetch('/melis/react-api/cms-styles?limit=25', {
  headers: { 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'include',
})
const { success, data } = await r.json()   // { success, data: { items, total, nextCursor } }

await fetch('/melis/react-api/site-redirects/save', {
  method: 'POST',
  headers: { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ id: null, siteId: 1, oldUrl: 'old', newUrl: 'new' }),
})
```

## Capacidades

Declaradas en `config/react.capabilities.php` bajo `melisReactToolCapabilities`, indexadas por el
`melisKey` portador de derechos de cada herramienta (`export` solo donde la herramienta tiene un botón
Export):

```php
'meliscms_tool_site_301'                    => ['list','create','edit','delete','export','test'],
'meliscms_tool_templates'                   => ['list','create','edit','delete','export'],
'meliscms_tool_styles'                      => ['list','create','edit','delete','export'],
'meliscms_tool_language'                    => ['list','create','edit','delete'],
'meliscms_tool_platform_ids'                => ['list','create','edit','delete','export'],
'meliscms_tool_sites'                       => ['list','create','edit','delete','export'],
'meliscms_mini_template_manager_tool'       => ['list','create','edit','delete','export'],
'meliscms_mini_template_menu_manager_tool'  => ['list','create','edit','delete'],
```

El editor de páginas se indexa bajo `meliscms_page` como un árbol estructurado, de modo que sus
botones y pestañas se convierten cada uno en una capacidad:

```php
'meliscms_page' => [
  'actions' => ['create','save','clear','publish','status','delete','duplicate','view','display'],
  'tabs'    => ['edition','properties','seo','languages'],
],
```

Cada módulo contribuyente añade **sus** pestañas/botones de página bajo esta misma clave
`meliscms_page` (fusión Laminas), y `CmsPage.tsx` los filtra mediante `useCaps('meliscms_page').can(cap)`.
Dos claves relacionadas en el mismo archivo exponen los derechos del editor: `melisReactRightsTools`
inyecta un nodo `meliscms_page` solo de derechos ("Page edition") en Users → Rights, y
`melisReactSidebarHostSections` mantiene visible la sección MelisCms para que el árbol de páginas sea
accesible incluso para un usuario con solo derechos de página.

## Puntos de extensión modular

Otros módulos aportan pestañas del editor de páginas y guardados entre pestañas sin tocar MelisCms:

```ts
// Register a page-edit tab (link-check, Open Graph, GA, historic, script-editor…)
window.__melisRegisterPageTab(key, ({ idPage }) => <MyTab idPage={idPage} />)
// Register a cross-cutting save hook, run by the global Save/Publish
window.__melisRegisterPageSaveHook(key, async (idPage) => { /* persist my tab */ })
```

En el lado del servidor, los mismos puntos de extensión siguen disponibles:

- **`melis_cms_page_tabs_alter`** — añadir o eliminar pestañas en el editor de páginas.
- **`modify_page_properties_form_config`** — alterar el formulario de Propiedades para añadir campos personalizados.

## Servicios clave

Se resuelven con `$sm->get('<alias>')`. La lógica de negocio permanece en el servidor (servicios
Laminas); React es presentación más llamadas a la API.

| Alias del servicio | Rol |
| --- | --- |
| `MelisCmsPageService` | Escribe el modelo de página: `savePage()`, `savePagePublished()`, `savePageSaved()`, `savePageSeo()`, `savePageLang()`, `savePageStyle()`, `savePageTree()`, `saveProperties()`. |
| `MelisCmsSiteService` | CRUD de sitios y consultas de páginas por sitio. |
| `MelisCmsPageGetterService` | `getPageContent($pageId)` — devuelve el HTML renderizado y cacheado de una página. |
| `MelisCmsRights` | Comprobaciones de permisos del back-office: `isAccessible()`, `isActionButtonActive()`. |
| `MelisCmsSitesDomainsService` | Gestión de dominios por entorno. |
| `MelisCmsSitesPropertiesService` | Ajustes clave/valor a nivel de sitio (pestaña Site Config). |
| `MelisCmsSiteModuleLoadService` | Carga de módulos por sitio (pestaña Module Loading). |
| `MelisCmsMiniTemplateService` / `MelisCmsMiniTemplateGetterService` | Gestión de la biblioteca de mini-plantillas y sus categorías. |
| `MelisCmsPageExportService` / `MelisCmsPageImportService` | Exportar/importar un árbol de páginas como archivo. |

## Tablas de base de datos

`MelisCms` no posee tablas. El esquema del CMS se define en melis-engine y se accede a través de sus
gateways y servicios. Nunca consultes las tablas del CMS directamente — usa los gateways/servicios del
engine para que la caché y el resto del ecosistema permanezcan coherentes.

## Eventos del ciclo de vida de la página

El ciclo de vida de la página se implementa mediante 19 listeners conectados en
`Module.php::onBootstrap`. Estos eventos son el principal punto de extensión — engánchalos en lugar de
llamar directamente a `MelisCmsPageService` para que el historial, las cachés y otros módulos
permanezcan sincronizados.

| Acción | Eventos |
| --- | --- |
| Guardar borrador | `meliscms_page_save_start` / `_end` (+ `…savetree_*`, `…saveproperties_*`, `…saveedition_*`, `…saveseo_*`) |
| Publicar | `meliscms_page_publish_start` / `_end` |
| Despublicar | `meliscms_page_unpublish_start` / `_end` |
| Eliminar | `meliscms_page_delete_start` / `_end` (+ `…deleteseo_*`, `…delete_page_*`) |
| Mover | `meliscms_page_move_start` / `_end` |
| Duplicar | `meliscms_page_duplicate_start` / `_end` |
| Sesión de plugin | `meliscms_page_savesession_plugin_*`, `meliscms_page_removesession_plugin_*` |

```php
// React to a page being published — in Module.php::onBootstrap or a listener's attach()
$eventManager->getSharedManager()->attach(
    'MelisCms',
    'meliscms_page_publish_end',
    function (\Laminas\EventManager\EventInterface $e) {
        $idPage = $e->getParams()['idPage'] ?? null;
        // log, sync, clear a custom cache, notify…
    },
    50
);
```

## Añadir un nuevo bloque de contenido

Cada bloque de contenido extiende `MelisTemplatingPlugin` (definido en melis-engine). Implementa
`front()` para renderizar en el sitio en vivo y `back()` para renderizar el contenedor de edición,
luego registra el plugin. Los módulos News, Slider y Category2 son implementaciones de referencia.

## Widget del dashboard

`MelisCmsPagesIndicatorsPlugin` muestra los recuentos de sitios y páginas (publicadas frente a no
publicadas) en el Dashboard del back-office.

![El widget Indicators del dashboard — sitios, páginas y páginas publicadas frente a no publicadas](/screenshots/react/melis-cms/meliscms-dashboardplugins-indicators.png)

## Archivos clave

| Aspecto | Ruta |
| --- | --- |
| Bootstrap del módulo + conexión de listeners | `vendor/melisplatform/melis-cms/src/Module.php` |
| Rutas + controladores de la API React | `vendor/melisplatform/melis-cms/config/react-api.php` |
| Capacidades React | `vendor/melisplatform/melis-cms/config/react.capabilities.php` |
| Código fuente del brick (las 9 herramientas) | `vendor/melisplatform/melis-cms/ui-react/src/` |
| Bundle compilado (versionado) | `vendor/melisplatform/melis-cms/public/ui-react/brick.js` + `brick.manifest.json` |
| Servicio de página | `vendor/melisplatform/melis-cms/src/Service/MelisCmsPageService.php` |
| Servicio de sitio | `vendor/melisplatform/melis-cms/src/Service/MelisCmsSiteService.php` |
| Servicio de derechos | `vendor/melisplatform/melis-cms/src/Service/MelisCmsRightsService.php` |
| Todos los listeners (19) | `vendor/melisplatform/melis-cms/src/Listener/` |
| Widget del dashboard | `vendor/melisplatform/melis-cms/src/Controller/DashboardPlugins/MelisCmsPagesIndicatorsPlugin.php` |

## Ver también

- [melis-engine](/legacy/reference/modules/melis-engine) — posee el modelo de datos del CMS y todos los table gateways.
- [melis-front](/legacy/reference/modules/melis-front) — renderizado del front-office y vista previa en vivo.
- [melis-core](/legacy/reference/modules/melis-core) — autenticación, derechos, eventos y configuración base.
