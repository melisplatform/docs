# MelisCmsSlider

> Gestor de sliders / carruseles del back-office — ahora un componente («brick») nativo de React en el back-office — con un plugin de plantillas para el front-office que muestra los sliders en las páginas. Paquete `melisplatform/melis-cms-slider`.

## Propósito

MelisCmsSlider proporciona una herramienta de back-office para crear **sliders** (carruseles con nombre compuestos por diapositivas ordenadas —imagen, título, subtítulos, enlace) y un bloque de contenido `MelisCmsSliderShowSliderPlugin` que renderiza un slider elegido en cualquier página del front-office. También incluye un elemento de formulario **selector de slider** reutilizable que otros módulos (News, Blog) integran para asociar un slider a un elemento de contenido.

En Melis v6 la herramienta incluye un **brick nativo totalmente en React** para el back-office `/melis-react`, con un conmutador **New / Old** que recurre a la herramienta clásica en un iframe. El framework, los servicios, las tablas de la base de datos y el plugin del front-office no han cambiado respecto a v5.

## Activación

Añádelo a `config/melis.module.load.php`:

```php
return [
    // …
    'MelisCmsSlider',
];
```

Requiere: `melis-core`, `melis-engine`, `melis-front`, `melis-cms`. El módulo incluye `dbdeploy: true`, de modo que sus tablas se crean/actualizan mediante melis-dbdeploy. El brick de React está **condicionado a la activación**: aparece en el back-office solo mientras el módulo esté en `melis.module.load.php` (descubrimiento modular de bricks, ver más abajo).

## Back-office en React

**Dónde:** barra lateral izquierda → grupo **MelisCms** → **Slider** (ruta del árbol `/melis-cms/slider`). Se abre como una pestaña superior llamada **Slider**. Un conmutador **New / Old** (arriba a la derecha) alterna entre la interfaz de React (*New*, por defecto) y la herramienta heredada en un iframe (*Old*).

La herramienta es un **desglose de tres niveles**, presentado mediante **sub-pestañas** nativas del host: lista de sliders → las diapositivas de un slider → el formulario de una diapositiva.

![Lista de sliders en React con tarjetas KPI, búsqueda, gestor de columnas, Export y el conmutador New/Old](/screenshots/react/melis-cms-slider/meliscmsslider-tool-slider-list.png)

### Nivel 1 — la lista de sliders

Muestra todos los sliders de la plataforma (los sliders son globales; un slider puede vincularse opcionalmente a una página). La lista dispone de **tarjetas KPI** (total de sliders, total de diapositivas, diapositivas activas), un cuadro de **búsqueda**, un gestor de **Columnas**, un botón **Export** y **Reset filters**; haz clic en una cabecera para ordenar. Cada fila ofrece **abrir** (sus diapositivas), **renombrar** y **eliminar**.

**+ New slider** abre un modal para el **nombre** y una **página vinculada** opcional elegida del árbol de páginas del sitio; el mismo modal renombra un slider existente.

![Modal de nuevo slider — nombre más página vinculada opcional del árbol de páginas](/screenshots/react/melis-cms-slider/meliscmsslider-tool-slider-new.png)

### Nivel 2 — las diapositivas de un slider

Al abrir un slider se añade una sub-pestaña (con **← Back**) que muestra las diapositivas de ese slider: orden, estado (verde = activa), miniatura de la imagen, título, subtítulo y enlace. **Arrastra una fila para reordenar**; **+ Add a slide** crea una; editar/eliminar por fila.

![Diapositivas de un slider — lista de arrastrar para reordenar con editar y eliminar por fila](/screenshots/react/melis-cms-slider/meliscmsslider-tool-slider-edit-slidelist-tab-properties.png)

### Nivel 3 — edición de una diapositiva

Editar (o añadir) una diapositiva abre una sub-pestaña anidada con un formulario de React: **Title**, **Subtitle 1**, dos campos **Description (HTML)**, **Link**, un conmutador **Active** y un panel **Image** (vista previa, **Choose an image** / **Remove image**; JPG, PNG, GIF o WebP). **Save** persiste la diapositiva. Title y Subtitle 1 son texto plano; los dos campos Description son HTML sin procesar y se asignan a `sub2`/`sub3`.

![Formulario de diapositiva en React — título, subtítulo, dos descripciones HTML, enlace, conmutador Active y panel de imagen](/screenshots/react/melis-cms-slider/meliscmsslider-tool-slider-edit-properties-slide-edit.png)

## API de React

El brick lee/escribe a través de una capa JSON bajo `/melis/react-api/sliders` (rutas en `config/react-api.php`, controlador `MelisReactApiCmsSliderController`). Todas las respuestas siguen el contrato `{ success, data, error }`; cada petición envía `X-Requested-With: XMLHttpRequest` con `credentials: 'include'`.

| Método y URL | Propósito |
| --- | --- |
| `GET /sliders` | Lista de sliders (keyset: `limit`, `search`, `sort`, `dir`, `after`) con `slideCount`. |
| `GET /sliders/stats` | Recuentos KPI `{sliders, slides, active}`. |
| `GET /sliders/:id` | Un slider `{id, name, pageId, slideCount}`. |
| `POST /sliders/save` | Crear / renombrar un slider (`{id?, name, pageId?}`). |
| `DELETE /sliders/delete/:id` | Elimina un slider, sus diapositivas y los archivos de imagen. |
| `GET /sliders/:id/slides` | Las diapositivas ordenadas de un slider. |
| `POST /sliders/slides/reorder` | Reordenar (`{sliderId, ids:[…]}`). |
| `POST /sliders/slide/upload` | Subida de imagen multipart (campo `image`, `?sliderId=`) → `{path}`. |
| `GET /sliders/slide/:id` | Una diapositiva. |
| `POST /sliders/slide/save` | Crear / actualizar una diapositiva. |
| `DELETE /sliders/slide/delete/:id` | Elimina una diapositiva, resecuencia el orden y elimina su imagen. |

El controlador se comunica con las tablas directamente mediante SQL parametrizado, reproduciendo las reglas de negocio heredadas (nombre obligatorio ≤255, orden de diapositiva automático = max+1, imágenes en `/media/sliders/<sliderId>/…` con extensiones jpg/jpeg/gif/png/webp, comprobación de URL segura en el enlace, eliminación en cascada de archivos). El servicio de más alto nivel `MelisCmsSliderService` sigue respaldando la herramienta heredada y el plugin del front-office.

## Capacidades

Los permisos avanzados se declaran en `config/react.capabilities.php` bajo el nodo portador de derechos `meliscms_slider_tools_section`, reflejando los tres niveles. Las cadenas de capacidad aplanadas (p. ej. `list`, `create`, `rename`, `export`, `slides`, `slides.create`, `slides.image.create`) se comprueban en React mediante `MelisCan(melisKey, cap)` y del lado del servidor mediante `denyUnlessCan(cap)`. Cada acción del controlador está protegida dos veces —una comprobación de acceso (`denyUnlessAccess()` → 401/403) y luego una comprobación de capacidad—; el resolvedor de capacidades es **permitir por defecto** para las capacidades no declaradas.

## Integración con el host

| Aspecto | Cómo |
| --- | --- |
| Descubrimiento / condicionamiento | `GET /melis/react-api/react-modules` lista los módulos activos que incluyen un `brick.manifest.json`; el host carga `brick.js` y monta el brick. Al eliminar el módulo se oculta la herramienta. |
| Menú → ruta | `useNavMenu` asigna el `forwardKey` `MelisCmsSlider/MelisCmsSliderList` a `/melis-cms/slider`. |
| Sub-pestañas | `subTabs: true` — el brick controla la barra de sub-pestañas nativa del host mediante `window.__melisOpenSubTab` / `__melisCloseSubTab` / `__melisUpdateSubTabLabel`; cada pantalla permanece montada (oculta) para conservar su estado. |
| Conmutador New / Old | `window.__melisSetToolView(MELIS_KEY, mode)`; *Old* renderiza `/melis/react-tool-page?key=MelisCmsSlider_left_menu` en un iframe. |
| i18n | El brick lee `document.documentElement.lang` e incluye un diccionario `{fr, en}` en el propio archivo. |

Id del brick `slider` (coincide con `brick.tsx` ⇄ `brick.manifest.json`); el bundle es un IIFE de Vite con React externalizado a los globales del host, de modo que la interfaz usa estilos en línea e i18n en el propio archivo en lugar de importar módulos del host.

## Servicios clave

Estos siguen impulsando la herramienta heredada, los microservicios y el plugin del front-office.

| Alias | Función |
| --- | --- |
| `MelisCmsSliderService` | Lógica de negocio de sliders y diapositivas; dispara eventos `meliscmsslider_*`. |
| `MelisCmsSliderTable` | Gateway de tabla para `melis_cms_slider`. |
| `MelisCmsSliderDetailTable` | Gateway de tabla para `melis_cms_slider_details`. |

`MelisCmsSliderService` extiende `MelisGeneralService` y expone:

| Método | Función |
| --- | --- |
| `getSlider($sliderId, $status)` | Un slider con sus diapositivas; pasa `1` para obtener solo las diapositivas activas. |
| `getSliderByPageId($pageId, $status)` | Slider vinculado a un id de página, con sus diapositivas. |
| `getSliderList($start, $limit, $order, $search)` | Lista paginada/buscable de sliders. |
| `getSliderDetails($sliderDetailId)` | Una única fila de diapositiva. |
| `saveSlider($data, $sliderId)` | Crea o actualiza un slider; devuelve el id del slider. |
| `saveSliderDetails($slideData, $detailId)` | Crea o actualiza una diapositiva. |
| `updateSliderDetailsOrdering($detailId, $newOrder)` | Reordena una diapositiva. |
| `deleteSlider($sliderId)` | Elimina un slider y todas sus diapositivas. |
| `deleteSliderDetails($sliderDetailId)` | Elimina una única diapositiva. |

`getSlider()` / `getSliderByPageId()` devuelven una entidad `MelisCmsSlider\Entity\MelisCmsSlider` cuyo `getSlider()` proporciona la fila contenedora y cuyo `getSliderDetails()` proporciona las diapositivas.

**Nota sobre el nombrado de eventos:** cada método dispara eventos `meliscmsslider_service_*_start` / `_end`, pero varios métodos de escritura reutilizan los nombres de eventos de otro método en el código actual. `saveSlider` dispara los eventos `get_slider_details`, y `deleteSliderDetails` / `updateSliderDetailsOrdering` reutilizan los eventos `delete_details` de `deleteSlider` —de modo que un listener sobre `meliscmsslider_service_delete_details_end` también se dispara en las reordenaciones.

**Microservicios** (`config/app.microservice.php`) exponen `getSliderList`, `getSlider`, `getSliderDetails`, `getSliderByPageId`.

## Front-office

Desde el **editor de páginas de React** (MelisCms → abrir una página → Edition), abre el panel de plugins y arrastra el bloque **Show Slider** a la página; sus **Properties** te permiten elegir la plantilla de renderizado y el slider que se mostrará.

![Bloque Show Slider en el selector de plugins del editor de páginas de React](/screenshots/react/melis-cms-slider/meliscmsslider-page-menu-plugins-selector.png)

![Ajustes del plugin Show Slider — elige la plantilla y el slider que se mostrará](/screenshots/react/melis-cms-slider/meliscmsslider-page-plugin-slider-config-properties-tab.png)

| Elemento | Función |
| --- | --- |
| `MelisCmsSliderShowSliderPlugin` (plugin de controlador) | Obtiene el slider configurado mediante `MelisCmsSliderService` y lo renderiza a través de la plantilla elegida. Configuración: `config/plugins/MelisCmsSliderShowSliderPlugin.config.php` — una pestaña **Properties** con `template_path` y `sliderId`. Plantilla por defecto: `view/melis-cms-slider/plugins/showslider.phtml`. |
| `MelisCmsSliderPlugin` (view helper) | `MelisCmsSliderHelper` — renderiza el plugin a partir de una plantilla phtml. |
| `CmsSliderSelect` (elemento de formulario) | Select poblado con los sliders disponibles; factory `src/Form/Factory/CmsSliderSelectFactory.php`. Se usa en el formulario de opciones del plugin y lo integran News / Blog. |

**Interfaces de selector reutilizables:** `meliscmsslider_select_slider` (`renderSelectSliderAction`) para News, `meliscmsslider_select_slider_blog` para Blog.

**Consumidores:** MelisCmsNews persiste el slider elegido en `cnews_slider_id` e incluye un listener que desvincula un slider eliminado de cualquier noticia que lo use; Blog usa `cblog_slider_id`.

## Tablas de base de datos

| Tabla | Contiene |
| --- | --- |
| `melis_cms_slider` | Un slider: `mcslide_id`, `mcslide_name`, `mcslide_page_id`, `mcslide_date`. |
| `melis_cms_slider_details` | Una diapositiva: `mcsdetail_id`, FK `mcsdetail_mcslider_id`, `mcsdetail_status`, `mcsdetail_title`, `mcsdetail_sub1`–`sub3`, `mcsdetail_link`, `mcsdetail_img`, `mcsdetail_order`. |

## Ejemplo

```php
$slider = $this->getServiceManager()->get('MelisCmsSliderService');

// Fetch one slider with active slides only
$one    = $slider->getSlider($sliderId, 1);

// Fetch the slider tied to a page
$byPage = $slider->getSliderByPageId($pageId, 1);

// Paginated list
$list   = $slider->getSliderList(0, 10, 'mcslide_id', null);

// Create / update
$id     = $slider->saveSlider($data, $sliderId);
$did    = $slider->saveSliderDetails($slideData, $detailId);

// Reorder
$slider->updateSliderDetailsOrdering($detailId, $newOrder);

// Delete slider + all its slides
$slider->deleteSlider($sliderId);
```

Escuchar un evento de servicio:

```php
$sharedEvents->attach(
    'MelisCmsSlider',
    'meliscmsslider_service_delete_details_end',
    $fn,
    50
);
```

## Archivos clave

| Aspecto | Ruta |
| --- | --- |
| Cableado del módulo | `vendor/melisplatform/melis-cms-slider/config/module.config.php` |
| Rutas de la API de React | `vendor/melisplatform/melis-cms-slider/config/react-api.php` |
| Capacidades de React | `vendor/melisplatform/melis-cms-slider/config/react.capabilities.php` |
| Controlador de la API de React | `vendor/melisplatform/melis-cms-slider/src/Controller/MelisReactApiCmsSliderController.php` |
| Brick de React | `vendor/melisplatform/melis-cms-slider/ui-react/src/` · `public/ui-react/brick.manifest.json` |
| Interfaz / herramientas del back-office | `vendor/melisplatform/melis-cms-slider/config/app.interface.php` · `app.tools.php` |
| Formulario de diapositiva | `vendor/melisplatform/melis-cms-slider/config/app.forms.php` |
| Configuración de microservicio | `vendor/melisplatform/melis-cms-slider/config/app.microservice.php` |
| Configuración del plugin de plantillas | `vendor/melisplatform/melis-cms-slider/config/plugins/MelisCmsSliderShowSliderPlugin.config.php` |
| Servicio | `vendor/melisplatform/melis-cms-slider/src/Service/MelisCmsSliderService.php` |
| Entidad | `vendor/melisplatform/melis-cms-slider/src/Entity/MelisCmsSlider.php` |
| Gateways de tabla | `vendor/melisplatform/melis-cms-slider/src/Model/Tables/` |
| Factory del selector de slider | `vendor/melisplatform/melis-cms-slider/src/Form/Factory/CmsSliderSelectFactory.php` |
| View helper | `vendor/melisplatform/melis-cms-slider/src/View/Helper/MelisCmsSliderHelper.php` |
| Plantilla por defecto del front | `vendor/melisplatform/melis-cms-slider/view/melis-cms-slider/plugins/showslider.phtml` |

Ver también: [Referencia de módulos](/es/reference/modules) · [Página heredada v5](/legacy/reference/modules/melis-cms-slider)
