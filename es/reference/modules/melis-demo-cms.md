# MelisDemoCms

> El sitio web oficial de referencia/demostración de Melis Platform — un **módulo de sitio** listo
> para instalar que enseña a los desarrolladores cómo se estructura un sitio de front-office de Melis.
> Paquete `melisplatform/melis-demo-cms`.

## Propósito

`MelisDemoCms` es un sitio web de front-office completo e instalable (`melis-site: true`,
`type: melisplatform-module`, categoría `cms`). **No es una herramienta de back-office**: sus
páginas, controladores y plantillas de plugin demuestran las tres técnicas de composición de
contenido — **colocación manual de plugins**, **zonas de arrastrar y soltar** y **etiquetas
editables en línea** — utilizando MelisFront, MelisEngine y los módulos de contenido del CMS
(slider, noticias, prospectos). Úsalo como la implementación de referencia al
[construir un sitio](/es/guide/build-a-site).

![La página de inicio del front-office de MelisDemoCms en funcionamiento — navegación superior (News / Team / Our Services / Our Process / FAQ / Contact), el hero "Melis Demo Cms" con una llamada a la acción "Try to Free" sobre un gráfico hero de panel de control. Este es el sitio web de demostración renderizado en el servidor, no una pantalla de back-office React.](/screenshots/react/melis-demo-cms/melisdemocms-site.png)

## No tiene back-office React

Melis v6 introdujo un back-office React, pero `MelisDemoCms` es un **sitio de front-office**, no una
herramienta de back-office, por lo que deliberadamente **no está migrado a React**:

- sin proyecto brick `ui-react/`, sin `public/ui-react/brick.manifest.json`;
- sin endpoints `config/react-api.php` ni capacidades `config/react.capabilities.php`;
- sin entrada en la barra lateral ni nodo de menú en `/melis-react`.

Nunca busques una herramienta "MelisDemoCms" en el shell de React. El sitio de demostración es
**contenido sobre el que operan las herramientas genéricas del CMS de React**, y el sitio en
funcionamiento es **renderizado en el servidor** por MelisFront/MelisEngine cada vez que un visitante
navega por el dominio.

### Cómo trabajas en él en `/melis-react`

Como el módulo no tiene una herramienta propia, lo editas con las herramientas genéricas del CMS de
React:

| Herramienta React | Qué haces con ella aquí |
| --- | --- |
| **Editor de páginas del CMS** | Abre cualquier página de demostración (Home, News, Team, FAQ, Contact…) desde el árbol de **Páginas del CMS** y edita sus bloques en línea, zonas de arrastrar y soltar y plugins. Superficie de edición principal. |
| **Media** | Gestiona las imágenes/archivos a los que hacen referencia las páginas. |
| **Sites** | La configuración de dominio / idioma del sitio de demostración. |
| **Templates** | Las plantillas de página que usan las páginas del CMS. |

> **Dónde:** barra lateral → **Páginas del CMS** → abre una página del sitio de demostración en el
> editor. No hay una entrada "MelisDemoCms" en la barra lateral — el módulo es el *contenido*, no una
> herramienta.

## Habilitarlo

`MelisDemoCms` es un módulo de sitio de Laminas instalado en `module/MelisSites/MelisDemoCms/` por los
`installer-paths` de Composer. Su propio `config/module.load.php` declara los módulos que espera que
se carguen junto a él:

```php
// vendor/melisplatform/melis-demo-cms/config/module.load.php
'MelisAssetManager', 'MelisEngine', 'MelisFront',
'MelisCmsNews', 'MelisCmsSlider', 'MelisCmsProspects',
'MelisDemoCms', 'MelisCmsPageScriptEditor'
```

Dependencias de Composer requeridas: `melis-cms`, `melis-cms-slider`, `melis-cms-prospects`,
`melis-cms-news`, `melis-cms-page-script-editor` (`^6.0`). `melis-engine` y `melis-front` están
sugeridas (y son requeridas en tiempo de ejecución). El sitio se activa para un dominio estableciendo
la variable de entorno del vhost `MELIS_MODULE "MelisDemoCms"`.

## Servicios clave

| Alias de servicio | Rol |
| --- | --- |
| `DemoCmsService` | Ayudantes específicos del sitio usados por los controladores del front y los listeners de configuración. |
| `MelisPlatformTable` | Gateway de tabla genérico sobre la tabla principal de la plataforma (`MelisEngine\Model\Tables\MelisGenericTable`, clave primaria `plf_id`). |

## Configuración del sitio (instalador, no React)

Este módulo no añade entradas al árbol de herramientas del back-office. Su única superficie de
back-office es el **asistente de configuración del sitio** usado por el marketplace/instalador:
controladores `MelisDemoCms\Controller\MelisSetupController` (ruta `/MelisDemoCms/setup`),
`MelisSetupPostDownloadController` y `MelisSetupPostUpdateController`. La configuración de la
instalación reside en `config/setup/download.config.php` y `config/setup/update.config.php`. Esto es
un asunto de back-end / CLI sin superficie React.

## Front office

El sitio es impulsado por controladores de sitio simples de MelisFront, uno por cada tipo de página:

| Controlador | Página |
| --- | --- |
| `MelisDemoCms\Controller\Home` | Home (carrusel + slider secundario, testimonios, banner RGPD) |
| `MelisDemoCms\Controller\News` | Lista de noticias / detalles de noticias |
| `MelisDemoCms\Controller\Team` | Equipo |
| `MelisDemoCms\Controller\Services` | Lista de servicios / detalles |
| `MelisDemoCms\Controller\Faq` | Listado de FAQ y bloques de categoría |
| `MelisDemoCms\Controller\Contact` | Formulario de contacto / prospectos |
| `MelisDemoCms\Controller\Testimonial` | Testimonio |
| `MelisDemoCms\Controller\Template` / `DragDrop` | Demostraciones de plantillas (estática / arrastrar y soltar / mixta) |
| `MelisDemoCms\Controller\Search` | Resultados de búsqueda en el sitio (Lucene; desactivado en la demostración) |
| `MelisDemoCms\Controller\Page404` | Página de error 404 |

En lugar de incluir sus propios plugins, `MelisDemoCms` proporciona **sobrescrituras de plantillas de
plugin** (`view/plugins/*.phtml`) conectadas en `config/melis.plugins.config.php`:

| Plugin de plantillas (módulo propietario) | Plantillas proporcionadas por este sitio |
| --- | --- |
| `MelisFrontMenuPlugin` (MelisFront) | `menu`, `white-menu`, `footer-menu` |
| `MelisFrontShowListFromFolderPlugin` (MelisFront) | `faq-listing`, `faq-values`, `home-testimonial-slider` |
| `MelisFrontGdprBannerPlugin` (MelisFront) | `gdpr-banner` |
| `MelisCmsSliderShowSliderPlugin` (MelisCmsSlider) | `home-carousel-slider`, `home-slider2`, `team-slider` |
| `MelisCmsNewsListNewsPlugin` / `…ShowNewsPlugin` / `…LatestNewsPlugin` (MelisCmsNews) | `news-list`, `news-details`, `latest-news-vertical`, `latest-news-horizontal` |
| `MelisCmsProspectsShowFormPlugin` (MelisCmsProspects) | `prospect-form` |

### Las tres técnicas de composición

| Técnica | Cómo funciona | Páginas de ejemplo |
| --- | --- | --- |
| **Colocación manual** | El plugin se instancia en el controlador, se renderiza con parámetros y se añade como hijo de la vista — la vista lo imprime. | Home, Team (slider), News, FAQ, Contact |
| **Zona de arrastrar y soltar** | El `.phtml` declara una zona con nombre; el editor de páginas del CMS de React coloca cualquier plugin en ella; sin código de controlador. | DragDrop, muestras de plantillas |
| **Etiquetas editables en línea** | `MelisTag` envuelve un valor por defecto en la vista; el autor edita el texto/las imágenes directamente desde el editor de páginas de React. | Services, Testimonial, 404 |

### Listeners

`SetupDemoCmsListener` impulsa el proceso de instalación del sitio.
`MelisDemoCmsCreateConfigListener` escribe `MelisDemoCms.config.php` a partir del `.config.stub` tras
una instalación desde el marketplace. `SiteMenuCustomizationListener` personaliza el menú del front.
`LatestNewsHorizontalListener` ajusta la salida del plugin de últimas noticias.

## Base de datos

`MelisDemoCms` no define ninguna tabla `melis_*` propia. `MelisPlatformTable` lee la tabla principal
`melis_core_platform`. Todo el contenido de demostración (páginas, plantillas, sliders, noticias,
claves de configuración) se crea en el momento de la instalación por los listeners de configuración,
basándose en los valores de `config/MelisDemoCms.config.php` tales como `home_page_id`, `news_page_id`
y `home_page_slider_1_id`.

## Ejemplo

Un controlador del front renderiza un plugin de plantillas inyectando una ruta de plantilla específica
del sitio y un ID basado en la configuración — el patrón usado en todo el sitio (`HomeController`):

```php
$cfg = $this->getServiceManager()->get('MelisSiteConfigService');

$slider = $this->MelisCmsSliderShowSliderPlugin();
$homeSlider1 = $slider->render([
    'template_path' => 'MelisDemoCms/plugins/home-carousel-slider',
    'id'            => 'homeSlider1',
    'pageId'        => $this->idPage,
    'sliderId'      => $cfg->getSiteConfigByKey('home_page_slider_1_id', $this->idPage),
]);
$this->view->addChild($homeSlider1, 'homeSlider1');
// view: <?= $this->homeSlider1 ?>
```

Una zona de arrastrar y soltar requiere una sola llamada en la vista — sin código de controlador (el
bloque se rellena desde el editor de páginas del CMS de React):

```php
<?= $this->MelisDragDropZone($this->idPage, 'dragdropzone_home_1') ?>
```

Una etiqueta editable en línea con un valor por defecto (editada directamente desde el editor de
páginas de React):

```php
<?= $this->MelisTag($this->idPage, 'static-html-1', 'html', '<h1>Accessible…</h1>') ?>
```

## Archivos clave

| Aspecto | Ruta (bajo `vendor/melisplatform/melis-demo-cms/`) |
| --- | --- |
| Rutas, controladores, mapa de plantillas | `config/module.config.php` |
| Módulos cargados con el sitio | `config/module.load.php` |
| Conexión de sobrescrituras de plantillas de plugin | `config/melis.plugins.config.php` |
| Claves de configuración por sitio (IDs de página / slider / carpeta) | `config/MelisDemoCms.config.php`, `…config.stub` |
| Flujo de configuración del sitio | `config/setup/download.config.php`, `config/setup/update.config.php` |
| Bootstrap y registro de listeners | `src/Module.php` |
| Servicio de ayuda del sitio | `src/Service/DemoCmsService.php` |
| Controladores de configuración y post-instalación | `src/Controller/MelisSetupController.php`, `…PostDownloadController.php`, `…PostUpdateController.php` |
| Listeners de instalación / menú / noticias | `src/Listener/` |
| Plantillas de plugin | `view/plugins/*.phtml` |
| Vistas de página | `view/melis-demo-cms/*/*.phtml` |
| Demostraciones de plantillas | `view/melis-demo-cms/template/` |

Véase también: [Referencia de módulos](/es/reference/modules), [Construir un sitio](/es/guide/build-a-site),
[Plugins](/es/guide/plugins).
