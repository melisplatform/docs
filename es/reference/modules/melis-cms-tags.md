# MelisCmsTags

> Sistema compartido de etiquetas/taxonomía para el CMS — las "etiquetas" de las que los módulos de contenido (por ejemplo, News) cuelgan sus elementos, ahora con un back-office nativo en React. Paquete `melisplatform/melis-cms-tags`.

## Propósito

MelisCmsTags proporciona el **sistema de etiquetas (taxonomía)** de la plataforma: etiquetas multilingües (un título por
idioma) que otros módulos asocian con su contenido. Los editores crean y traducen etiquetas, ven cuántos
elementos utilizan cada etiqueta y eliminan las que no se usan. Otros módulos (por ejemplo, MelisCmsNews) se conectan a la
capa de asociación mediante una declaración de configuración y una única llamada de servicio, haciendo que sus elementos sean etiquetables
sin ningún cambio de esquema en el módulo de etiquetas. Un plugin de plantillas de front **List Tags** muestra las
etiquetas de un sitio en el front office.

En **Melis v6**, el back-office es un **brick nativo full-React** renderizado dentro de `/melis-react`, que llama
a una capa JSON `react-api` propia del módulo. El modelo de datos del lado servidor, el servicio, las tablas, la configuración de asociaciones
y el plugin de front no han cambiado respecto a la v5 — solo la capa de presentación y navegación se ha trasladado a React.

## Activarlo

Añade en `config/melis.module.load.php`:

```php
return [
    'MelisCmsTags',
];
```

Requiere `melis-core` y `melis-cms`. El módulo se distribuye con `dbdeploy: true` — sus tres tablas se
crean automáticamente en el primer despliegue. El brick de React aparece en el back-office **solo si el módulo
está activado** (descubrimiento modular de bricks).

## Dónde se encuentra en el back-office React

Barra lateral izquierda → grupo **Site Tools** → **Tags** (`fa-tag`). Se abre como una pestaña superior llamada **Tags**. La
clave `forwardKey` del menú `MelisCmsTags/TagsList` se asigna a la ruta de árbol `/melis-cms/tags` (`/melis-cms/tags/:id`
para el editor), donde se renderiza el componente `TagsPage`.

El brick es una interfaz **full-React nativa** con un **conmutador New / Old** (arriba a la derecha): *New* es la interfaz React
(por defecto), *Old* renderiza la herramienta heredada en un iframe (`/melis/react-tool-page?key=tags_left_menu`).

## Back-office — lista y editor

**Una única pestaña de shell (`Tags`) con sub-pestañas internas de la herramienta.** La lista es la vista principal; abrir o crear una etiqueta
añade una **sub-pestaña de edición** (`subTabs: true`), de modo que cambiar entre etiquetas abiertas es instantáneo.

**La lista** muestra todas las etiquetas de la plataforma, con:

- **Tarjetas KPI** — Total · Con asociaciones · Sin asociación (del endpoint `stats`).
- **Búsqueda** ("Search a tag…", coincide con el id o con un título en cualquier idioma), **Reset filters**, un gestor de **Columns**
  (ocultar/reordenar) y un botón **Export** (`.xlsx` mediante el `window.MelisXLSX` del host, con CSV como alternativa).
- Columnas ordenables **ID / Title / Nb associations**, con acciones de **edición** y **eliminación** por fila.
- Un botón **+ New tag** que abre un editor en blanco.

![Lista de Tags en React — tarjetas KPI (Total / Con asociaciones / Sin asociación), búsqueda, Reset filters, gestor de Columns, Export, el conmutador New/Old, "+ New tag", y filas que muestran ID / Title / Nb associations con acciones de edición y eliminación](/screenshots/react/melis-cms-tags/meliscmstags-tool-tags-list.png)

**El editor** es un formulario compacto (una etiqueta no es más que un título por idioma): un **conmutador de idioma**
(English / Français…) alimentado por el endpoint `languages`, y un campo **Label** para el idioma seleccionado.
Todas las traducciones se mantienen a la vez y se guardan juntas — **se requiere al menos un título no vacío**.
La eliminación de una etiqueta se **rechaza mientras aún tenga asociaciones**, protegiendo el contenido etiquetado.

![El editor de etiquetas de React — un conmutador de idioma (English / Français) y el campo "LABEL" por idioma con la indicación "At least one title is required"](/screenshots/react/melis-cms-tags/meliscmstags-tool-tags-edit-texts.png)

## Etiquetar contenido — el selector de Tags

Las etiquetas están pensadas para ser *usadas* por otros módulos. En el **editor de News en React** (Site Tools → News → abrir un
artículo), la barra lateral de ajustes muestra un panel **TAGS**: una lista de verificación de las etiquetas disponibles. Marcar etiquetas
y guardar el artículo almacena las asociaciones, que luego cuentan para el **Nb associations** de cada etiqueta.

![El panel TAGS dentro del editor de artículos de News en React — una lista de verificación de etiquetas (Art, Business, Design, Development, Education…) que etiquetan el artículo](/screenshots/react/melis-cms-tags/meliscmstags-tooloverride-news-tags.png)

Ese selector y su guardado pertenecen al brick de **News** (lee `GET /melis/react-api/news/tags`
y escribe en la tabla de enlace compartida con `entity_type = 'NEWS'`); MelisCmsTags solo posee los datos de las etiquetas y
la tabla compartida `melis_cms_tag_entity`. El panel aparece únicamente cuando MelisCmsTags está activo.

## React API — endpoints

**No hay `config/react-api.php`**: las rutas se declaran **inline en `config/module.config.php`**
como el nodo hijo `react-api-cms-tags` bajo `melis-backoffice`, de modo que las URLs residen bajo
**`/melis/react-api-cms-tags`** (propias del módulo, *no* el espacio de nombres compartido `/melis/react-api/…`).
Controlador: `MelisCmsTags\Controller\MelisCmsTagsReactApiController`. Todas las respuestas usan el
contrato `{ success, data, error }`; las peticiones envían `X-Requested-With: XMLHttpRequest` y
`credentials: 'include'`.

| Método y URL | Acción | Propósito |
| --- | --- | --- |
| `GET /melis/react-api-cms-tags` | `list` | Lista de etiquetas (keyset: `search`, `limit`, `sort`, `dir`, `after`, `lang` opcional) → `{items,total,nextCursor}`; cada elemento tiene `id`, `title`, `associationsCount` |
| `GET /melis/react-api-cms-tags/stats` | `stats` | KPI `{total, withAssociations, orphan}` |
| `GET /melis/react-api-cms-tags/languages` | `languages` | Idiomas del CMS `{languages:[{id,locale,name}]}` (alimenta el conmutador de idioma del editor) |
| `GET /melis/react-api-cms-tags/:id` | `get` | Una etiqueta `{id, creationDate, titles:{langId:title}, associationsCount}` |
| `POST /melis/react-api-cms-tags/save` | `save` | Crear / actualizar (`{id?, titles:{langId:title}}`) → `{id}` |
| `DELETE /melis/react-api-cms-tags/delete/:id` | `delete` | Eliminar una etiqueta (rechazada si aún tiene asociaciones) |

> El orden de las rutas importa: `stats` / `languages` / `save` se declaran **antes** del comodín `:id`, de modo que
> se resuelven a sus propias acciones en lugar de a `get`.

El controlador combina SQL keyset parametrizado directo (list, stats) con las tablas y el servicio del módulo
(`TagTable`, `TagTextsTable`, `TagEntityTable` para `get`/`save`; `MelisCmsTagsService` para `delete` —
`getAssociationsByTagId()` bloquea la eliminación, luego `deleteTagById()` + `TagTextsTable::deleteByField()`
limpian). `save` reproduce las reglas heredadas (≥1 título no vacío, ≤255 caracteres, unicidad por idioma)
y dispara los mismos eventos (`meliscmstags_save_tag_end`, `meliscmstags_delete_tag_end`).

Ejemplo (`tags-api.ts`):

```ts
const BASE = '/melis/react-api-cms-tags'
await apiFetch<TagListResult>(`${BASE}?search=art&limit=25&sort=id&dir=desc`) // list
await apiFetch<TagDetail>(`${BASE}/42`)                                       // one tag
await apiFetch<{ id: number }>(`${BASE}/save`, {                              // save all translations
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: null, titles: { 1: 'Art', 2: 'Art' } }),        // langId → title
})
await apiFetch<null>(`${BASE}/delete/42`, { method: 'DELETE' })              // delete
```

## Capacidades

Declaradas en `config/react.capabilities.php` bajo el nodo de menú **`tags_left_menu`** (el nodo de herramienta
renderizable; `MelisCmsTags\Module::getConfig()` fusiona el archivo). Acciones: `list` · `create` · `edit` · `delete`
· `export`. En React, el `can(cap)` de `TagsPage` lee `window.MelisCan('tags_left_menu', cap)` para controlar el acceso al
botón **+ New tag**, a la edición/eliminación por fila y a Export. En el lado servidor, cada acción llama a `denyUnlessAccess()`
(autenticación + `MelisCoreRights::canAccess('tags_left_menu')` → 401/403); aquí la clave de capacidades y la
`MELIS_KEY` de la guardia de acceso coinciden (`tags_left_menu`).

## Servicios clave

| Alias de servicio | Rol |
| --- | --- |
| `MelisCmsTagsService` | CRUD completo de etiquetas más la API de asociación. Cada método dispara eventos `*_start` / `*_end` mediante `MelisGeneralService`. |

Alias de gateways de tablas: `TagTable`, `TagTextsTable`, `TagEntityTable` (registrados en `module.config.php`).

## Front office

`ListTagsPlugin` (`Controller\Plugin\ListPublicationsPlugin.php`) extiende `MelisTemplatingPlugin`.

| Ajuste | Detalle |
| --- | --- |
| Clave de configuración del plugin | `tags` · clave XML de BD `TagsList` |
| Archivo de configuración | `config/plugins/ListPublicationsPlugin.config.php` |
| Vista de front | `MelisCmsTags/listtags` |
| Pestañas de ajustes | **Template** (plantilla + selección de sitio) · **Filters** (columna / orden / fecha mínima / fecha máxima / búsqueda) |

> **Desfase de nomenclatura.** La clase del plugin reside en `ListPublicationsPlugin.php` y las vistas Phtml distribuidas
> son `listpublications.phtml` / `showpublication.phtml` — un artefacto histórico; la funcionalidad activa es
> el plugin **List Tags** anterior.

## Tablas de la base de datos

Estructura base en `install/sql/setup_structure.sql`; migraciones en `install/dbdeploy/`.

| Tabla | Contiene |
| --- | --- |
| `melis_cms_tag` | Fila principal de la etiqueta: `tag_id`, `tag_creation_date`, `tag_site_id`, `tag_type` |
| `melis_cms_tag_texts` | Textos por idioma: `tag_text_id`, `tag_id`, `tag_title`, `tag_lang_id` |
| `melis_cms_tag_entity` | Enlace etiqueta ↔ elemento de contenido: `id`, `tag_id`, `entity_id`, `entity_type` (por ejemplo, `NEWS`) |

## Ejemplo de servicio

```php
$tags = $this->getServiceManager()->get('MelisCmsTagsService');

// Tag CRUD
$list = $tags->getTagsList($status, $langId, $start, $limit, $orderCol, $order, $siteId, $search);
$tag  = $tags->getTagById($tagId, $langId);
$id   = $tags->saveTag(['tag_site_id' => $siteId, ...], $tagId); // $tagId null → create
$tags->deleteTagById($tagId);

// Associations — the integration surface for other modules
$tags->saveTagEntity([$tagId1, $tagId2], $entityId, 'NEWS'); // (re)attach a tag set to an item
$set   = $tags->loadTagByEntityIdType($entityId, 'NEWS');    // tags of one item
$items = $tags->loadEntityByTagsId($tagIds, 'NEWS');         // items carrying given tags
$tags->deleteEntities($entityId, 'NEWS');                    // clear an item's tags
$assoc = $tags->getAssociationsByTagId($tagId, $langId);     // items associated to a tag
```

`saveTagEntity()` elimina los enlaces existentes de la entidad y luego vuelve a guardar el conjunto suministrado — llámalo desde el
flujo de guardado de un módulo de contenido para mantener sus etiquetas sincronizadas.

## Hacer que un módulo sea etiquetable (asociaciones dirigidas por configuración)

Declara el mapeo bajo `plugins.melis_cms_tag.datas.associations` en `config/associations.config.php`.
El ejemplo de MelisCmsNews distribuido:

```php
'associations' => [
    'meliscmsnews' => [
        'module'           => 'MelisCmsNews',       // skipped if module not loaded
        'entity_type'      => 'NEWS',               // stored in melis_cms_tag_entity.entity_type
        'entity_table'     => 'melis_cms_news',
        'entity_primary_id'=> 'cnews_id',
        'trans' => [
            'trans_table'      => 'melis_cms_news_texts',
            'trans_foreign_id' => 'cnews_id',
            'trans_lang_key'   => 'cnews_lang_id',
        ],
        'association_title_key' => 'cnews_title',   // shown in the Associations grid "Title" column
    ],
],
```

Luego llama a `saveTagEntity()` en la acción de guardado del módulo de contenido. En el brick de News en React, esto se conecta
mediante su propia superficie `/melis/react-api/news/tags`; MelisCmsTags simplemente posee los datos de las etiquetas y la tabla de enlace compartida.

## Archivos clave

| Aspecto | Ruta |
| --- | --- |
| Configuración del módulo (rutas, rutas react-api inline, servicios, elementos de formulario) | `vendor/melisplatform/melis-cms-tags/config/module.config.php` |
| Capacidades de React | `vendor/melisplatform/melis-cms-tags/config/react.capabilities.php` |
| Mapeo de asociaciones | `vendor/melisplatform/melis-cms-tags/config/associations.config.php` |
| Configuración del plugin List Tags | `vendor/melisplatform/melis-cms-tags/config/plugins/ListPublicationsPlugin.config.php` |
| Controlador de la React API | `vendor/melisplatform/melis-cms-tags/src/Controller/MelisCmsTagsReactApiController.php` |
| Servicio principal | `vendor/melisplatform/melis-cms-tags/src/Service/MelisCmsTagsService.php` |
| Plugin de front | `vendor/melisplatform/melis-cms-tags/src/Controller/Plugin/ListPublicationsPlugin.php` |
| Gateways de tablas | `vendor/melisplatform/melis-cms-tags/src/Model/Tables/` |
| Código fuente del brick de React | `vendor/melisplatform/melis-cms-tags/ui-react/src/` (`TagsPage`, `tags-api.ts`, `ViewToggle`, `ExportModal`) |
| Build + manifiesto del brick de React | `vendor/melisplatform/melis-cms-tags/public/ui-react/brick.js` · `brick.manifest.json` |
| SQL de instalación | `vendor/melisplatform/melis-cms-tags/install/sql/setup_structure.sql` |
| Migraciones de BD | `vendor/melisplatform/melis-cms-tags/install/dbdeploy/` |

Véase también: [melis-cms](/es/reference/modules/melis-cms),
[melis-cms-news](/es/reference/modules/melis-cms-news),
[melis-front](/es/reference/modules/melis-front),
[melis-engine](/es/reference/modules/melis-engine),
[melis-core](/es/reference/modules/melis-core)
