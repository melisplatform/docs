# MelisCmsCategory2

> Categorías de contenido multisitio y multilingües para el CMS, con un back-office React nativo — paquete `melisplatform/melis-cms-category2`.

## Propósito

MelisCmsCategory2 proporciona un sistema jerárquico de categorías en el back-office de Melis. Las categorías forman
un árbol (cada nodo apunta a un padre), incluyen traducciones por idioma (nombre y descripción), pueden
limitarse a uno o varios sitios, tienen una ventana de validez y un estado, y pueden contener archivos multimedia. El
módulo incluye un plugin de plantillas para el front-office que renderiza un árbol de categorías en una página y un selector
de categorías reutilizable integrado por otros módulos (por ejemplo, News, Commerce) para clasificar sus registros.

En el back-office React de la v6 (`/melis-react`), la herramienta se distribuye como un **brick full-React nativo**: una
verdadera interfaz maestro-detalle — el árbol de categorías a la izquierda, el editor con pestañas a la derecha — que lee y escribe
a través de su propia capa JSON `react-api`. Un conmutador **New / Old** permite recurrir a la herramienta heredada en
un iframe. El modelo de datos subyacente, los servicios y el plugin de front no han cambiado respecto a la v5.

## Activarlo

Añádelo a `config/melis.module.load.php`:

```php
return [
    'MelisCmsCategory2',
];
```

Requiere `melis-core` y `melis-cms`. El módulo tiene `dbdeploy` habilitado, por lo que sus tablas se crean
durante el despliegue. `melis-engine` es necesario para el renderizado del front. El brick React aparece en la barra lateral
solo mientras el módulo esté listado aquí (descubrimiento modular de bricks).

## Back-office (React)

**Dónde:** barra lateral izquierda → grupo **MelisCms** → **Categories** (`Catégories`). Se abre como una única
página maestro-detalle — no como el slider multipestaña — en la ruta `/melis-cms/category-v2`. El conmutador **New / Old**
en la parte superior derecha alterna entre la interfaz React (por defecto) y la herramienta clásica en un iframe.

![La herramienta Categories de React — maestro-detalle: árbol de categorías a la izquierda, editor con pestañas a la derecha, conmutador New/Old en la parte superior derecha](/screenshots/react/melis-cms-category2/meliscmscategory2-tool-categories-accordionsystem.png)

### Árbol de categorías (panel izquierdo)

La columna izquierda muestra todo el árbol. Su barra de herramientas dispone de un **desplegable de idioma** (banderas — elige en qué
idioma se muestran los nombres de los nodos), un **filtro de sitio**, un botón de **actualización**, un cuadro de **búsqueda**
(poda el árbol pero conserva los ancestros) y **+ New category** (crea una raíz/catálogo). Cada fila muestra un
**punto de estado** (verde = activo, rojo = inactivo), el nombre del nodo y —al pasar el cursor— un **+** (añadir una
subcategoría) y una **papelera** (eliminar). Arrastra el asa de un nodo para reordenarlo o cambiar su padre: cerca del borde
superior = soltar antes, borde inferior = soltar después (hermano), en medio = soltar dentro (último hijo). El arrastre se
ofrece únicamente en la vista completa sin filtrar. Un nodo con subcategorías no se puede eliminar.

![El panel del árbol de React — desplegable de idioma, filtro de sitio, actualización, búsqueda, + New category, árbol con puntos de estado y añadir/eliminar por nodo](/screenshots/react/melis-cms-category2/meliscmscategory2-page-plugin-categories-config-properties-search-category.png)

### Editor (panel derecho)

Al seleccionar un nodo —o al hacer clic en **+ New category** / en el **+** de una fila— se carga el editor. La cabecera
muestra el título, su contexto ("at the root" o "under «parent»") y **Cancel** / **Save**.

- **Pestaña Properties** — Nombre y Descripción por idioma (pestañas de idioma con un punto relleno/vacío por
  idioma), un conmutador de **Status**, fechas de **Validity** (Start / End) y los **Sites** a los que pertenece la categoría.
  El nombre (en al menos un idioma) y al menos un Site son obligatorios; si se establecen ambas fechas, Start debe preceder a End.
- **Pestaña Media** — adjunta **Images** y **Files** (dos columnas, cada una con **+ Add** y eliminación por elemento).
  Guarda primero la categoría antes de añadir archivos multimedia.

![Nueva categoría — pestaña Properties: pestañas de idioma, Name, Description, conmutador Status, fechas de Validity, Sites](/screenshots/react/melis-cms-category2/meliscmscategory2-tool-categories-new-tab-properties.png)

![Editor de categorías — pestaña Media: cuadrícula de Images (+ Add an image) y lista de Files (+ Add a file)](/screenshots/react/melis-cms-category2/meliscmscategory2-tool-categories-new-tab-media.png)

## API React

Las rutas residen en `config/react-api.php`, servidas por
`MelisCmsCategory2\Controller\MelisCmsCategoryReactApiController`, anidadas bajo la base de back-office del módulo,
de modo que el prefijo efectivo es `/melis/MelisCmsCategory2/react-api`. Cada respuesta
sigue el contrato `{ success, data, error }`. El controlador se comunica con las tablas directamente mediante
SQL parametrizado, reproduciendo las reglas de negocio heredadas (nombre en ≥1 idioma, ≥1 sitio, start ≤ end,
orden automático = max+1, `-1` = padre raíz, sin eliminar un nodo con hijos, eliminación en cascada de
traducciones/sitios/multimedia, subida de multimedia reforzada).

| Método y URL (relativos a la base) | Propósito |
| --- | --- |
| `GET /tree?lang=` | Árbol de categorías completo → `{langId, nodes:[TreeNode]}` (nombre resuelto al idioma, con marca de fallback) |
| `GET /langs` | Idiomas del CMS → `{langs:[{id,locale,name}]}` |
| `GET /sites` | Sitios (filtro + formulario) → `{sites:[{id,name}]}` |
| `GET /category/:id` | Una categoría → `{id,parentId,status,dateStart,dateEnd,sites,translations}` |
| `POST /save` | Crear / actualizar una categoría → `{id}` |
| `DELETE /delete/:id` | Eliminar una categoría (bloqueado si tiene hijos) + reordenar hermanos |
| `POST /reorder` | Reordenar los hermanos de un padre (`{parentId, orderedIds:[…]}`) — también cambia el padre |
| `GET /category/:id/media` | Multimedia de la categoría → `{images:[MediaItem], files:[MediaItem]}` |
| `POST /media/upload` | Subida multipart (`catId`, `type` image\|file, `file`) → `{id,type,path,name}` |
| `DELETE /media/delete/:id` | Eliminar un registro de multimedia + su archivo en disco |

## Capacidades

Declaradas en `config/react.capabilities.php` bajo el nodo **portador de derechos**
`melis_cms_category_v2_tools_section` (que es también la `MELIS_KEY` del controlador — no la clave de zona del manifiesto
`melis_cms_categories_v2`, que solo apunta al iframe *Old*). Cada acción del controlador
protege el acceso con `canAccess(MELIS_KEY)`. `Capabilities::flatten()` convierte el árbol en cadenas
con puntos que se pasan a `makeCan(...)` en React:

| Capacidad | Controla |
| --- | --- |
| `tree.create` | Botones "+ New category" y "+" por nodo |
| `tree.order` | Asa de reordenación por arrastre (requiere además la vista sin filtrar) |
| `tree.delete` | Papelera por nodo |
| `edition` | Carga del editor para una categoría existente (la creación sigue permitida) |
| `edition.properties` | Pestaña Properties |
| `edition.media` | Pestaña Media |

## El brick

La interfaz se desarrolla en `ui-react/` (Vite IIFE, React / ReactRouter externalizados a los globales del host,
con salida a `public/ui-react/brick.js` junto a `brick.manifest.json`). `brick.tsx` registra un
componente enrutado bajo el brick id `category2`.

```json
{
  "id": "category2",
  "route": "/melis-cms/category-v2",
  "label": "Catégories",
  "forwardKey": "MelisCmsCategory2/MelisCmsCategoryList",
  "melisKey": "melis_cms_categories_v2",
  "entry": "brick.js",
  "persistent": true
}
```

| Componente | Función |
| --- | --- |
| `CategoryPage.tsx` | Contenedor: carga idiomas + sitios, (re)carga el árbol por idioma, gestiona el nodo seleccionado y el `mode` New/Old, renderiza el diseño maestro-detalle + el iframe *Old* |
| `CategoryTree.tsx` | Panel izquierdo — árbol, desplegable de idioma, filtro de sitio, búsqueda, añadir/eliminar por nodo, reordenación por arrastre / cambio de padre |
| `CategoryEditor.tsx` | Panel derecho — pestañas Properties + Media, validación en cliente, errores en línea/banner |
| `ViewToggle.tsx` | Conmutador New (React) / Old (iframe) |
| `category-api.ts` | Cliente de API tipado para los endpoints anteriores |

El host descubre el brick mediante `GET /melis/react-api/react-modules` y lo monta; `useNavMenu`
asigna el `forwardKey` a la ruta del árbol. El brick lee el idioma activo desde
`document.documentElement.lang` e incluye un diccionario `{fr,en}` en el propio archivo. La lógica de negocio permanece
en el servidor (paridad con la herramienta heredada); React es presentación + llamadas a la API.

## Servicios clave

| Alias de servicio | Función |
| --- | --- |
| `MelisCmsCategory2Service` | Servicio principal de categorías: crear/leer nodos de categoría, obtención del árbol, traducciones y vínculos con sitios. |
| `MelisCmsCategory2MediaService` | Almacenamiento de archivos por categoría en disco y en la base de datos. |

Métodos destacados de `MelisCmsCategory2Service`:

- `getCategoryTreeview($fatherId, $langId, $onlyValid, $siteId)` — árbol recursivo.
- `getCategoryById($categoryId, $langId, $onlyValid)` — nodo de categoría completo.
- `getCategoryNameById($categoryId, $langId)` — búsqueda de nombre.
- `getCategoriesPerSite($siteId, $langId)`, `getFirstLevelCategoriesPerSite($siteId, $langId)`.
- `saveCategory(...)`, `saveCategoryTexts(...)`, `saveCategorySites(...)` — persistir nodo/traducción/sitio.
- `reOrderCategories($parentId, $currentOrder)` — persistir la reordenación por arrastre.
- `validateDates($dateStart, $dateEnd)`.

`MelisCmsCategory2MediaService` gestiona la parte del sistema de archivos: `uploadFile`, `deleteFile`,
`getMediaFilesByCategoryId`, `getFilesInDir`, `removeCategoryDir`.

> El controlador `react-api` de React usa SQL directo en lugar de estos servicios, pero el plugin de front
> y el selector de categorías reutilizable siguen llamando a `MelisCmsCategory2Service`.

## Front-office

- **Plugin de plantillas** `MelisCmsCategoryDisplayCategoriesPlugin` — renderiza un árbol de categorías en una
  página. Su configuración expone una pestaña Properties con tres campos: `template_path`, `site_id`,
  `category_start`. Plantilla por defecto: `MelisCmsCategory2/default`. En el editor de páginas de React, arrastra
  el bloque **Display Categories** y establece la plantilla, la categoría inicial (selector de árbol) y el sitio.
- **View helper** `renderTreeRec` — renderiza recursivamente un array de árbol de categorías dentro de una vista.

![Ajustes del plugin Display Categories — Template, Category start (selector de árbol), Site](/screenshots/react/melis-cms-category2/meliscmscategory2-page-plugin-categories-config-properties.png)

Uso codificado en duro:

```php
$display = $this->MelisCmsCategoryDisplayCategoriesPlugin();
echo $display->render([
    'template_path' => ['MelisCmsCategory2/default'],
    'site_id'        => 1,
    'category_start' => 1,
]);
```

## Tablas de base de datos

| Tabla | Contiene |
| --- | --- |
| `melis_cms_category2` | Nodo de categoría: `cat2_id`, `cat2_father_cat_id`, orden, estado, referencia, fechas de validez, auditoría. |
| `melis_cms_category2_trans` | Traducción por idioma: nombre y descripción, con clave `catt2_id`. |
| `melis_cms_category2_sites` | Vínculo categoría-sitio, con clave `cats2_id`. |
| `melis_cms_category2_media` | Multimedia adjunto a una categoría: `catm2_type`, `catm2_path`, `catm2_cat_id`. |

Al instalar se inserta un nodo raíz semilla (`cat2_id = 1`, "My catalog" / "Mon catalogue").

## Archivos clave

| Aspecto | Ruta |
| --- | --- |
| Rutas de la API React + controlador invocable | `vendor/melisplatform/melis-cms-category2/config/react-api.php` |
| Declaración de capacidades React | `vendor/melisplatform/melis-cms-category2/config/react.capabilities.php` |
| Controlador de la API React (10 acciones, SQL directo, refuerzo de subidas) | `vendor/melisplatform/melis-cms-category2/src/Controller/MelisCmsCategoryReactApiController.php` |
| Brick React (Vite IIFE) | `vendor/melisplatform/melis-cms-category2/ui-react/` y compilado en `public/ui-react/` |
| Manifiesto del brick | `vendor/melisplatform/melis-cms-category2/public/ui-react/brick.manifest.json` |
| Servicio principal | `vendor/melisplatform/melis-cms-category2/src/Service/MelisCmsCategoryService.php` |
| Servicio de multimedia | `vendor/melisplatform/melis-cms-category2/src/Service/MelisCmsCategoryMediaService.php` |
| Plugin de plantillas | `vendor/melisplatform/melis-cms-category2/src/Controller/Plugin/MelisCmsCategoryDisplayCategoriesPlugin.php` |
| SQL de instalación | `vendor/melisplatform/melis-cms-category2/install/sql/` |

Véase también: [melis-cms](/es/reference/modules/melis-cms), [melis-core](/es/reference/modules/melis-core), [melis-cms-news](/es/reference/modules/melis-cms-news)
