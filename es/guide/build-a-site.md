# Crear un sitio web (CMS)

Melis es, ante todo, un **CMS**. Esta página explica el modelo de contenido — **sitios**,
**páginas**, **plantillas** y **plugins** — y cómo se renderiza una página en el front office. Es
el modelo mental que necesitas antes de editar plantillas o construir un módulo de sitio.

::: tip v6 — Back-office React
Melis v6 conserva el mismo framework, módulos y modelo de datos descritos aquí. Lo que cambió es la
**interfaz del back-office**: ahora se ejecuta como una **aplicación React en `/melis-react`**. El CMS se distribuye como
herramientas nativas de React tipo "brick" — una **barra lateral con el árbol de páginas** más un **editor de páginas por pestañas** y un conjunto de
herramientas laterales (Sites, Templates, Styles, Languages…). La única excepción es la pestaña **Edition** de la página,
que sigue cargando el clásico editor de arrastrar y soltar **en un iframe**. Cada herramienta lateral incluye un
conmutador **New / Old** para que puedas cambiar a la herramienta clásica si la necesitas. Los conceptos que se explican a continuación no
cambian; lo único nuevo es *dónde haces clic*.
:::

## El modelo de contenido

| Concepto     | Qué es | Tabla(s) principal(es) |
| ------------ | ---------- | ------------- |
| **Sitio**    | Un sitio web. Tiene una página de inicio, idiomas y uno o varios dominios por entorno. | `melis_cms_site`, `melis_cms_site_domain` |
| **Página**   | Un nodo del árbol de páginas del sitio. Tiene un tipo (sitio/carpeta/página), una plantilla y contenido. | `melis_cms_page_tree`, `melis_cms_page_published`, `melis_cms_page_saved` |
| **Plantilla** | El diseño que usa una página — apunta a un controlador/acción/vista de un módulo de sitio. | `melis_cms_template` |
| **SEO**      | Slug de URL y metaetiquetas por página. | `melis_cms_page_seo` |
| **Idioma**   | Una página puede tener traducciones vinculadas entre sí. | `melis_cms_lang`, `melis_cms_page_lang` |

Estas tablas pertenecen a **MelisEngine**, el motor del CMS — la única fuente de verdad para el
modelo de página/sitio. El back-office React las lee y escribe únicamente a través de los servicios del motor y
las pasarelas de tablas (table gateways); nunca toca el esquema directamente. Consulta
[MelisEngine](/es/reference/modules/melis-engine).

### Las páginas están versionadas

Cada página existe en dos versiones:

- **Guardada** (`melis_cms_page_saved`) — el borrador de trabajo que editas en el back-office.
- **Publicada** (`melis_cms_page_published`) — la versión en vivo servida en el front office.

Editas el borrador y luego **publicas** cuando esté listo. El contenido editable de la página (consulta *zonas* y
*plugins* más abajo) se almacena en el registro de la página.

## Plantillas

Una **plantilla** (`melis_cms_template`) es el puente entre una página y el código que la renderiza.
Para el tipo de plantilla común `ZF2`, almacena:

- `tpl_zf2_website_folder` — el **módulo de sitio** (p. ej. `MelisDemoCms`),
- `tpl_zf2_controller`, `tpl_zf2_action` — qué controlador/acción renderiza la página,
- `tpl_zf2_layout` — el layout que la envuelve.

Así, una página → referencia una plantilla → que enruta hacia una vista `.phtml` dentro de un módulo de sitio.

En el back-office React gestionas las plantillas en la herramienta lateral **Templates** (§ *Crear un
nuevo sitio*) — una lista y un formulario nativos de React para el nombre, el tipo, el sitio, el layout, el controlador y la acción.

## Contenido editable: zonas y plugins

Las plantillas exponen dos tipos de áreas editables, mediante **view helpers**:

### `MelisTag` — zonas editables simples

Una zona con nombre de HTML/texto/multimedia que un editor modifica en línea (TinyMCE) en el back-office:

```php
<?= $this->MelisTag($this->idPage, 'home-html-1', 'html', '<h1>Default heading</h1>') ?>
```

El contenido por defecto se muestra hasta que un editor lo sobrescribe; el valor guardado se almacena en la página.
Helper: `vendor/melisplatform/melis-front/src/View/Helper/MelisTagsHelper.php`.

### `MelisDragDropZone` — plugins de plantilla

Una zona de destino donde los editores arrastran **plugins de plantilla** — bloques de contenido reutilizables (un slider, una
lista de noticias, un formulario de contacto):

```php
<?= $this->MelisDragDropZone($this->idPage, 'dragdropzone_home_1') ?>
```

Helper: `vendor/melisplatform/melis-front/src/View/Helper/MelisDragDropZoneHelper.php`.

Un plugin de plantilla extiende `MelisEngine\Controller\Plugin\MelisTemplatingPlugin` e implementa:

- **`front()`** — devuelve los datos/la vista que se renderizan en el sitio en vivo,
- **`back()`** — el formulario de configuración que se muestra en el editor del back-office.

`MelisCmsSlider` y `MelisCmsNews` son buenos plugins de referencia; usa **MelisTemplatingPluginCreator**
para generar el andamiaje (scaffold) del tuyo. Los editores sueltan estos bloques en la pestaña **Edition** del editor de páginas — consulta más abajo.

## Cómo se renderiza una página en el front office

El front office lo sirve **MelisFront** (el motor que muestra los sitios) sobre
**MelisEngine** (servicios de página/datos). Este renderizado es totalmente del lado del servidor y no cambia en v6 —
el back-office React solo *aloja* la vista previa editable, no vuelve a renderizar la página en el
navegador. A grandes rasgos:

1. El vhost establece **`MELIS_MODULE`** → selecciona el **módulo de sitio** que se va a servir.
2. Una URL como `…/id/5` resuelve a la **página con id 5** (ruta en
   `vendor/melisplatform/melis-front/config/module.config.php`). Las URL de SEO también se mapean a ids de página.
3. **MelisEngine** carga la página + su plantilla
   (`vendor/melisplatform/melis-engine/src/Service/MelisPageService.php`).
4. El controlador/acción `ZF2` de la plantilla renderiza la vista `.phtml` del módulo de sitio.
5. Las zonas `MelisTag` y los plugins `MelisDragDropZone` se rellenan con el contenido publicado de la página.
6. El resultado se envuelve en el layout del sitio.

::: tip Modos de edición / vista previa
La misma página se puede solicitar en distintos modos: `…/id/5` (en vivo), `…/id/5/preview` (borrador
guardado), `…/id/5/renderMode/melis` (edición en el back-office — esto es lo que muestra el iframe de Edition).
:::

## Anatomía de un módulo de sitio

Un **módulo de sitio** es un módulo normal de Laminas que contiene las plantillas, vistas y recursos de un sitio web.
La referencia es `vendor/melisplatform/melis-demo-cms/` (consulta
[MelisDemoCms](/es/reference/modules/melis-demo-cms)); los sitios personalizados suelen ubicarse en
`module/MelisSites/<YourSite>/`:

```
MelisDemoCms/
├── config/
│   ├── module.load.php           # modules this site needs (MelisEngine, MelisFront, plugins…)
│   ├── module.config.php         # routes / controllers / services
│   ├── assets.config.php         # front-office CSS & JS
│   └── melis.plugins.config.php  # templating plugins available to templates
├── src/Controller/               # Home, Contact… (render the template views)
├── view/
│   ├── layout/                   # site layouts
│   └── melis-demo-cms/home/index.phtml   # a page template (uses MelisTag / MelisDragDropZone)
└── public/                       # css / js / images
```

## Trabajar en el back-office React

En v6 construyes los sitios desde el **back-office React** en `/melis-react`. Abre la sección **MelisCms**
en la barra lateral izquierda: muestra el panel del **árbol de páginas** (tus sitios y sus páginas) más un
grupo **Site Tools**.

![La sección MelisCms en la barra lateral de React — árbol de páginas más Site Tools.](/screenshots/react/melis-cms/meliscms-menu-entry.png)

### El árbol de páginas

El árbol de páginas es el mapa de tus sitios y de todas las páginas que contienen. Se ubica en la **barra lateral izquierda**,
de modo que permanece visible mientras trabajas. Haz clic en una página para abrirla en el editor; escribe un nombre para buscar;
haz clic derecho en un nodo para añadir una página hija, ver detalles, duplicarla, moverla o eliminarla. También puedes mover
una página arrastrando y soltando (los permisos del lado del servidor deciden qué puedes mover).

![El árbol de páginas de React — sitios y páginas; clic para abrir, clic derecho para acciones.](/screenshots/react/melis-cms/meliscms-menu-site-treeview.png)

### El editor de páginas — poner contenido en una página

Al abrir una página se muestra el editor: un **marco (chrome) nativo de React** (título de la página + estado, botones de acción,
barra de pestañas) alrededor del contenido de la pestaña actual. Las pestañas son **Properties · Edition · SEO · Languages**
(más las pestañas aportadas por otros módulos — Historic, Analytics, Scripts…). Los botones de acción incluyen
**Save**, **Publish**, **See** (Preview / See online), **Duplicate**, **Erase draft** y **Delete**.

- **Properties** *(React nativo)* — el nombre de la página, el tipo (Page / Folder / Site), la plantilla (layout),
  el idioma, la visualización en el menú, el estilo y la taxonomía.

  ![La pestaña Properties de React.](/screenshots/react/melis-cms/meliscms-page-tab-properties.png)

- **Edition** *(editor clásico en un iframe)* — rellena la página. Se renderiza en vivo y **arrastras
  bloques de contenido (plugins)** hacia las zonas de la plantilla (las áreas `MelisDragDropZone`). Esta pestaña es
  el clásico editor de arrastrar y soltar cargado dentro del marco de React, por lo que el panel de plugins, los diseños de zonas de destino
  y los editores de texto enriquecido son exactamente como antes.

  ![La pestaña Edition — página en vivo con la superposición de arrastrar y soltar, dentro del marco de React.](/screenshots/react/melis-cms/meliscms-page-tab-edition.png)

  ![El panel de plugins — los bloques de contenido que puedes soltar en la página.](/screenshots/react/melis-cms/meliscms-page-tab-edition-menu-templating-plugins.png)

- **SEO** *(React nativo)* — la URL amigable, el meta título/descripción y los campos de redirección.
- **Languages** *(React nativo)* — crea y gestiona las versiones de idioma de la página.

**Save vs Publish.** *Save* escribe el borrador (Properties + SEO + el contenido de arrastrar y soltar, todo en una sola
acción); *See → Preview* muestra el borrador; *Publish* pone en vivo el borrador actual; *Erase draft*
revierte a la versión publicada. Regla general: edita con libertad, **Save** sobre la marcha, **Preview** para
comprobar y luego **Publish**.

### Los bloques de contenido estándar

Los bloques que sueltas en la página en la pestaña Edition provienen de **MelisFront**. Los más comunes:
un bloque **HTML (Text)** y un bloque **Media** (ambos se editan **en el sitio**), más bloques de configuración establecidos
a través de un pequeño modal de **Properties** — **Menu**, **Breadcrumb**, **List-from-folder** y el
**banner de RGPD**. Consulta [MelisFront](/es/reference/modules/melis-front) para ver el catálogo completo.

![Un bloque HTML (Text) editado en el sitio, con la barra de herramientas WYSIWYG en la página.](/screenshots/react/melis-front/melisfront-page-plugin-html-tag.png)

## Crear un nuevo sitio (resumen)

A alto nivel:

1. **Crea el sitio** en el back-office — barra lateral → **Site Tools → Sites → + New site**, y después el
   **asistente de 5 pasos** (Multilingual → Languages → Domains → Module → Summary), que crea el sitio
   y su página de inicio.

   ![La herramienta Sites de React — cada fila es un sitio web completo, con "+ New site".](/screenshots/react/melis-cms/meliscms-tool-sites-list.png)

2. **Proporciona un módulo de sitio** en `module/MelisSites/<YourSite>/` (controladores + plantillas
   `.phtml` + recursos).
3. **Declara plantillas** (`melis_cms_template`) que apunten al controlador/acción de tu módulo — Site
   Tools → **Templates**.
4. **Construye el árbol de páginas** y asigna plantillas; añade `MelisTag`/`MelisDragDropZone` a tus vistas.
5. **Apunta un vhost** a `public/` con `SetEnv MELIS_MODULE "<YourSite>"` (consulta
   [Instalación](/es/guide/getting-started)).
6. **Publica** y navega por el front office.

Una vez que existe un sitio, ábrelo desde la herramienta Sites para gestionarlo a través de pestañas nativas de React: **Properties
· Module Loading · Domains · Languages · Site Config · Translations · Scripts**. La pestaña **Module
Loading** es donde activas una funcionalidad para un sitio determinado (con reordenación por arrastre del orden de carga).

> Empieza leyendo `vendor/melisplatform/melis-demo-cms/` de principio a fin — es el ejemplo canónico y
> funcional de cada concepto de esta página.

## Archivos clave

| Aspecto | Ruta |
| --- | --- |
| Servicios del CMS (páginas/sitios) | `vendor/melisplatform/melis-cms/src/Service/` |
| Bricks del CMS en React (editor de páginas + herramientas laterales) | `vendor/melisplatform/melis-cms/ui-react/src/` |
| Servicio de página (motor) | `vendor/melisplatform/melis-engine/src/Service/MelisPageService.php` |
| Renderizado del front | `vendor/melisplatform/melis-front/` |
| Helpers de zonas editables | `vendor/melisplatform/melis-front/src/View/Helper/` |
| Clase base del plugin de plantilla | `vendor/melisplatform/melis-engine/src/Controller/Plugin/MelisTemplatingPlugin.php` |
| Sitio demo de referencia | `vendor/melisplatform/melis-demo-cms/` |

> Los módulos React que gobiernan la interfaz — [MelisCms](/es/reference/modules/melis-cms),
> [MelisFront](/es/reference/modules/melis-front) y [MelisEngine](/es/reference/modules/melis-engine) —
> documentan por completo las herramientas, los plugins y el modelo de datos.
