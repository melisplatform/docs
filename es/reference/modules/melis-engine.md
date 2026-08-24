# MelisEngine

> Base de datos compartida del CMS — modelo de páginas, sitios, idiomas, clase base del plugin de plantillas y la caché de renderizado. Paquete `melisplatform/melis-engine`.

## Propósito

MelisEngine es propietario de todo el modelo de base de datos del CMS (páginas, árbol de páginas, sitios, plantillas, idiomas,
dominios, SEO, estilos) y lo expone a través de gateways de tablas, servicios y una caché multinivel.
Tanto [MelisFront](/es/reference/modules/melis-front) (renderizado del front-end) como
[MelisCms](/es/reference/modules/melis-cms) (edición en el back-office) leen y escriben exclusivamente
a través de MelisEngine — ninguno de los módulos hermanos es propietario de tablas. También define
`MelisTemplatingPlugin`, la clase base abstracta que extiende cada plugin de contenido de la plataforma.

## Rol en el back-office React

MelisEngine **no tiene herramienta de back-office React ni interfaz propia** — ni brick, ni
`config/react-api.php`, ni capacidades, ni entrada en la barra lateral de `/melis-react`. **No está migrado
a React y no está pensado para estarlo**: es infraestructura de la plataforma, no una herramienta de back-office. Su
relación con la capa React ocurre por completo entre bastidores, a través de dos vías:

- **Vía de datos** — los controladores del CMS React (`MelisReactApi*`, que residen en los módulos del CMS,
  no aquí) leen y escriben páginas, sitios, idiomas, plantillas y SEO **únicamente** a través de
  los gateways `MelisEngineTable*` y los servicios de MelisEngine (`MelisEnginePage`, `MelisEngineTree`,
  `MelisEngineLang`, …). La capa React nunca toca el esquema del CMS directamente.
- **Vía de renderizado** — el contenido del CMS que se muestra en el editor de páginas React y en las
  herramientas heredadas dentro de iframes se renderiza **en el servidor** (páginas → plantillas → zonas → plugins). El motor resuelve
  el modelo de páginas y define la clase base del plugin; MelisFront ejecuta el renderizado real. React
  embebe el resultado renderizado en el servidor en lugar de volver a renderizar el contenido del CMS en el cliente.

Como es invisible pero fundamental, los problemas del motor se manifiestan *dentro de las herramientas del CMS React* —
un árbol de páginas vacío, un desplegable de idiomas que permanece vacío, un editor de páginas que da error al cargar —
normalmente causados por una tabla del CMS que falta o está desactualizada, o por un servicio del motor que falla, nunca por una pantalla del motor (no existe ninguna).

## Cómo habilitarlo

MelisEngine se carga automáticamente como dependencia. El orden de carga en
`config/melis.module.load.php` es:

```php
// config/melis.module.load.php
return [
    'MelisCore',
    'MelisFront',
    'MelisEngine',   // requires melis-core + melis-front
    'MelisCms',
];
```

Dependencias de Composer: `melisplatform/melis-core` `^6.0`, `melisplatform/melis-front` `^6.0`,
`laminas/laminas-cache` (adaptadores de sistema de archivos + memoria). Se ejecuta sobre PHP `^8.3 | ^8.5`.

## Servicios clave

Registrados como alias de `service_manager` en `config/module.config.php`:

| Alias de servicio | Rol |
| --- | --- |
| `MelisEnginePage` / `MelisPageService` | Resuelve una página por id y modo (`published` / `saved`): `getDatasPage($idPage, $mode)` — devuelve el árbol de páginas hidratado, los datos de la página, el SEO, la plantilla y los objetos de estilo |
| `MelisEngineTree` / `MelisTreeService` | Navegación por el árbol de páginas: `getPageChildren()`, `getPageFather()`, `getPageBreadcrumb()`, `getPageLink()`, búsqueda |
| `MelisEngineTemplateService` | Búsqueda de plantillas: `getTemplate($tplId)` |
| `MelisEngineSiteService` | Catálogo de sitios |
| `MelisEngineSiteDomainService` | Resolución dominio → sitio: `getSiteByDomain()` |
| `MelisEngineLang` / `MelisEngineLangService` | Idiomas: idiomas disponibles, locale ↔ id, idioma del sitio |
| `MelisEngineSEOService` | Datos SEO por página: `getSEOById()` |
| `MelisEnginePageDefaultUrlsService` | Búsquedas de URL de página precalculadas / canónicas |
| `MelisEngineStyle` / `MelisEngineStyleService` | Estilos del sitio y CSS por página |
| `MelisEngineCacheSystem` | Orquestador de caché: `getCacheByKey()`, `setCacheByKey()`, `deleteCacheByPrefix()` |
| `MelisSearch` | Índice de páginas de texto completo (estilo Lucene) usado por la búsqueda del front-end |
| `MelisEngineSendMail` | Utilidad de correo electrónico |
| `MelisGdprService` / `MelisGdprAutoDeleteService` | Textos del banner de RGPD y framework de autoeliminación |
| `MelisEngineComposer` | Operaciones de Composer / dependencias |

Todos los servicios que extienden `MelisGeneralService` disparan eventos `*_start` / `*_end` (p. ej.
`melisengine_service_get_available_languages_start` / `_end`) a los que otros módulos pueden engancharse.

### Consumidores React (verificados)

Estos son los puntos de entrada sancionados de la vía de datos por los que las herramientas del CMS React acceden al motor:

| Servicio / gateway del motor (alias) | Usado por (BO React) |
| --- | --- |
| `MelisEnginePage` (`MelisPageService`) | melis-cms `MelisReactApiPageController` — datos de página para el editor de páginas React |
| `MelisEngineTree` (`MelisTreeService`) | melis-cms `MelisReactApiPageController` — navegación por el árbol de páginas |
| `MelisEngineLang` (`MelisEngineLangService`) | melis-cms `MelisReactApiCmsSitesController`, `MelisReactApiCmsMenuManagerController` — idiomas disponibles del CMS |
| `MelisEngineTableCmsLang` (`MelisCmsLangTable`) | melis-cms-tags, melis-cms-user-account, melis-core (RGPD) — desplegables de idioma React |

El alias `MelisEngineTableCmsLang => MelisCmsLangTable::class` está registrado en
`config/module.config.php`.

## Back-office

MelisEngine no tiene herramienta propia para el usuario final, ni en el back-office heredado ni en `/melis-react`. Sí
registra dos factorías de elementos de formulario utilizadas en todo el back-office:

| Factoría | Propósito |
| --- | --- |
| `MelisEnginePluginTemplateSelect` | Elemento de selección de plantilla para formularios de plugin |
| `MelisEngineSiteSelect` | Elemento de selección de sitio para formularios de plugin |

También existen controladores de instalación y mantenimiento (`MelisSetup*`), pero son invocados por el
instalador, no por los editores.

## Front-office

Aquí reside la clase base de cada plugin de contenido:

| Elemento | Descripción |
| --- | --- |
| `MelisEngine\Controller\Plugin\MelisTemplatingPlugin` | Base abstracta para todos los plugins de contenido. Define `front()` (renderizado en vivo, abstracto), `back()` (contenedor/vista de edición del back-office), persistencia de la configuración XML (`loadDbXmlToPluginConfig()` / `savePluginConfigToXml()`), carga GET/POST, modo de vista previa y ancho responsivo. |

Cada plugin de contenido de la plataforma (News, Slider, Menu, Breadcrumb, …) hereda de esta clase. Implementa
`front()` para la salida en vivo; la clase base gestiona `back()` automáticamente. El mismo pipeline de plugins
alimenta el editor de páginas React: MelisFront renderiza los plugins de cada zona en el servidor y React
muestra el resultado.

Dos listeners de microservicios se enganchan a `melis_core_microservice_amend_data` para exponer métodos de árbol y de página
(`getPageChildren`, `getPageFather`, `getDomainByPageId`, `getDatasPage`) sobre la capa de microservicios de la
plataforma.

## Tablas de la base de datos

MelisEngine es la única fuente de verdad para el esquema del CMS
(`install/sql/setup_structure.sql` + deltas en `install/dbdeploy/`):

| Tabla | Contiene |
| --- | --- |
| `melis_cms_page_tree` | Jerarquía de páginas (`tree_father_page_id`, orden) |
| `melis_cms_page_published` | Versión publicada (en vivo) de cada página |
| `melis_cms_page_saved` | Versión guardada / borrador (editada en el back-office) |
| `melis_cms_page_lang` | Enlaces página ↔ idioma |
| `melis_cms_lang` | Idiomas / locales del CMS |
| `melis_cms_site` | Sitios (raíz del árbol de páginas) |
| `melis_cms_template` | Plantillas (layout / controlador / acción o ruta PHP) |
| `melis_cms_page_seo` | SEO por página (URL, redirección 301, meta title/description, canónica) |
| `melis_cms_site_domain` | Dominios del sitio por entorno |
| `melis_cms_site_301` / `melis_cms_site_404` | Redirecciones 301 / mapeo 404 a nivel de sitio |
| `melis_cms_page_default_urls` | URL de página precalculadas (tabla de caché) |
| `melis_cms_style` / `melis_cms_page_style` | Estilos CSS y enlaces página ↔ estilo |
| `melis_cms_platform_ids` | Rangos de asignación de id de página por entorno |
| `melis_cms_site_config` / `_home` / `_langs` | Configuración del sitio, página de inicio por idioma, idiomas activos |
| `melis_cms_site_robot` | robots.txt por dominio |
| `melis_cms_mini_tpl_*` | Categorías, plantillas y flags de mini-plantillas |
| `melis_cms_gdpr_texts` | Textos del banner de RGPD por sitio / idioma |
| `melis_site_translation` / `_text` | Cadenas de traducción a nivel de sitio |

### Gateways de tablas

Cada tabla está envuelta por un gateway `MelisEngineTable*` registrado en el service manager
(p. ej. `MelisEngineTablePageTree`, `MelisEngineTablePagePublished`, `MelisEngineTablePageSeo`).
Otros módulos — heredados o React — deben usar siempre estos gateways, nunca SQL en crudo. El gateway
base proporciona `getEntryById()`, `getEntryByField()`, `save()`, `deleteById()`, `fetchAll()`.

## Ejemplo

**Leer una página y navegar por el árbol:**

```php
$pageSvc = $sm->get('MelisEnginePage');
$page    = $pageSvc->getDatasPage($idPage);            // 'published' (live) by default
$draft   = $pageSvc->getDatasPage($idPage, 'saved');   // draft shown in the React page editor

$tree       = $sm->get('MelisEngineTree');
$children   = $tree->getPageChildren($idPage, 1);       // 1 = published only
$breadcrumb = $tree->getPageBreadcrumb($idPage);
$url        = $tree->getPageLink($idPage, true);        // true = absolute URL
```

**Rellenar un desplegable de idiomas React desde un controlador del CMS (en el servidor, delegando al motor):**

```php
// Inside a MelisReactApi* controller of a CMS module — the React JSON layer
// delegates to the engine; MelisEngine exposes no react-api of its own.
$langTable = $sm->get('MelisEngineTableCmsLang');
$langs     = $langTable->fetchAll()->toArray();   // fills a React language dropdown
```

**Leer/escribir a través de un gateway de tabla (nunca SQL en crudo):**

```php
$seoTable = $sm->get('MelisEngineTablePageSeo');
$seo      = $seoTable->getEntryByField('plang_page_id', $idPage)->current();
$seoTable->save(['seo_meta_title' => 'New title'], $existingSeoId);  // upsert
```

**Cachear un resultado calculado:**

```php
$cache = $sm->get('MelisEngineCacheSystem');
$cache->setCacheByKey('mykey', 'my_cache_config', $value);
$value = $cache->getCacheByKey('mykey', 'my_cache_config');
$cache->deleteCacheByPrefix('page_' . $idPage, 'meliscms_page');   // invalidate a page
```

**Escuchar un evento de servicio:**

```php
$sharedEvents->attach('MelisEngine', 'melisengine_page_getdatas_end', function ($e) {
    $p = $e->getParams();   // includes page id and 'results'
    // alter $p['results'] before it is returned
}, 50);
```

**Construir un plugin de contenido:**

```php
// Subclass MelisTemplatingPlugin, implement front() for live render.
// The base class handles back() (BO container), config XML persistence and preview.
class MyPlugin extends MelisEngine\Controller\Plugin\MelisTemplatingPlugin
{
    public function front(): string
    {
        return $this->getView()->render('my-module/plugin/my-plugin', $this->pluginConfig);
    }
}
```

## El trío Core / Engine / Front

El back-office React no cambia el trío; se apoya sobre él:

- **MelisEngine** *(este módulo)* — es propietario de todo el modelo de BD del CMS y lo expone mediante gateways
  de tablas + servicios + caché; define `MelisTemplatingPlugin`.
- **MelisFront** — renderiza las páginas a partir de los datos del motor (ejecuta los plugins de contenido) y da soporte
  a la vista previa editable usada dentro del back-office (heredado *y* el editor de páginas React / herramientas en
  iframe).
- **MelisCms** — el back-office del CMS; **no es propietario de ninguna tabla** y edita todo a través del
  motor. Sus herramientas del CMS React (`MelisReactApiPage`, `MelisReactApiCmsSites`,
  `MelisReactApiCmsMenuManager`, …) son los consumidores React enumerados arriba.

## Archivos clave

| Ámbito | Ruta |
| --- | --- |
| Alias de servicios y gateways, cachés | `vendor/melisplatform/melis-engine/config/module.config.php` |
| Servicio de datos de página | `vendor/melisplatform/melis-engine/src/Service/MelisPageService.php` |
| Servicio de árbol / enlaces | `vendor/melisplatform/melis-engine/src/Service/MelisTreeService.php` |
| Orquestador de caché | `vendor/melisplatform/melis-engine/src/Service/` (`MelisEngineCacheSystem*`) |
| Clase base del plugin de plantillas | `vendor/melisplatform/melis-engine/src/Controller/Plugin/MelisTemplatingPlugin.php` |
| Gateways de tablas | `vendor/melisplatform/melis-engine/src/Model/Tables/` |
| Esquema + migraciones delta | `vendor/melisplatform/melis-engine/install/sql/` |

Véase también: [MelisFront](/es/reference/modules/melis-front) · [MelisCms](/es/reference/modules/melis-cms) · [MelisCore](/es/reference/modules/melis-core)
