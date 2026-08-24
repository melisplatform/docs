# MelisCmsPageScriptEditor

> Inyecta `<script>`/`<style>`/HTML personalizado (analítica, píxeles de seguimiento, widgets de
> terceros) en el `<head>` y el `<body>` de las páginas del front-office, por página y por sitio, sin
> editar plantillas. Paquete `melisplatform/melis-cms-page-script-editor`.

## Propósito

MelisCmsPageScriptEditor permite añadir marcado en bruto para que se inyecte automáticamente en el
HTML renderizado de tus páginas. Hay tres ubicaciones de inyección disponibles: **parte superior del
head** (justo después de `<head>`), **parte inferior del head** (justo antes de `</head>`) y **parte
inferior del body** (justo antes de `</body>`). Los scripts pueden aplicarse al conjunto de un sitio
o a una única página; una página puede marcarse como **excepción** para excluirse de los scripts a
nivel de sitio.

En el back-office React v6 el módulo se distribuye como un **brick de solo contribución** — no tiene
una herramienta propia en el menú lateral. En su lugar añade una **pestaña Scripts en dos lugares**:
el **editor de páginas de CMS** (scripts por página) y la **edición de la herramienta Sites** (scripts
a nivel de sitio + excepciones). El modelo de datos, el servicio y los listeners de inyección no han
cambiado respecto a v5; solo la interfaz del back-office migró a React.

## Activarlo

Añade a `config/melis.module.load.php`:

```php
return [
    'MelisCmsPageScriptEditor',
];
```

Requiere `melis-core ^6.0` y `melis-cms ^6.0` (PHP `^8.3|^8.5`). El módulo está etiquetado como
`dbdeploy: true`, por lo que sus tablas se crean automáticamente mediante melis-dbdeploy.

> **Activación por sitio:** la inyección solo surte efecto en un sitio una vez que el módulo se ha
> cargado para ese sitio en MelisCms → Sites → Carga de módulos. Los scripts pueden editarse en el
> back-office antes de eso, pero no se inyecta nada en el front hasta que el módulo esté habilitado en
> el sitio.

## Back-office en React

**No hay una herramienta dedicada en el menú lateral** — la pestaña Scripts reside dentro de dos
herramientas existentes, ambas nativas en React. Ambas pestañas solo aparecen cuando el módulo está
activo (detectado mediante `GET /melis/react-api/react-modules`, tras lo cual el bundle del brick se
precarga en el arranque).

| Superficie | Dónde | Contenido | Guardar |
| --- | --- | --- | --- |
| **Editor de páginas → pestaña Scripts** | MelisCms → abre una **página** → *Scripts* | Tres editores de código por página (Head top / Head bottom / Body bottom) para **esta página únicamente**. | Botón propio **Save scripts**. |
| **Herramienta Sites → pestaña Scripts** | MelisCms → **Sites** → abre un sitio → *Scripts* | Tres editores a nivel de sitio + lista **Current Exceptions** + **Add an exception** (campo de id de página o selector de árbol de páginas). | Se guarda con el botón global **Save** del editor de sitios; añadir/eliminar excepciones se persiste de inmediato. |

![Editor de páginas de CMS en React, pestaña Scripts: los tres editores de código por página (Head top / Head bottom / Body bottom) con un botón Save scripts](/screenshots/react/melis-cms-page-script-editor/meliscmspagescripteditor-page-tab-scripts.png)

![Edición de Sites en React, pestaña Scripts: los tres editores a nivel de sitio, la lista Current Exceptions y el bloque Add an exception, guardados por el botón global Save del editor de sitios](/screenshots/react/melis-cms-page-script-editor/meliscmspagescripteditor-tooloverride-sites-edit-tab-scripts.png)

En una página servida, cada ubicación recibe **primero los scripts del sitio y luego los propios de la
página** — salvo que la página sea una excepción, en cuyo caso solo se inyectan sus propios scripts de
página.

El **componente de pestaña del editor de páginas** reside en MelisCms (`PageTabs.tsx`, clave
`meliscms_page_script_editor`); el **componente de pestaña de sitio** (`ScriptsTab.tsx`) reside en este
módulo y se autorregistra mediante el registro genérico `window.__melisSiteTabs` (orden `55`). Este
módulo es propietario de los endpoints y de la capacidad que respaldan ambas pestañas.

## Capacidades (derechos avanzados)

La pestaña de página es una **capacidad de la herramienta de páginas de CMS**, declarada en
`config/react.capabilities.php` bajo el nodo compartido `meliscms_page`:

```php
return [
  'melisReactToolCapabilities' => [
    'meliscms_page' => [
      'tabs' => [
        ['key' => 'meliscms_page_script_editor', 'label' => 'tr_meliscmspagescripteditor_title'],
      ],
    ],
  ],
];
```

Sin esta declaración, la lista blanca de capacidades de la página de CMS oculta el botón de la pestaña
**Scripts** en el editor de páginas, incluso para un administrador. La pestaña Scripts de la
**herramienta Sites** no tiene una capacidad propia: está controlada por el acceso a la herramienta
Sites (`meliscms_tool_sites`).

## API React

Dos controladores propiedad de este módulo, ambos delegando en `MelisCmsPageScriptEditorService`.
Contrato `{ success, data, error }`, con `X-Requested-With: XMLHttpRequest` y `credentials: 'include'`.

**Pestaña de página** — `MelisReactApiPageScriptEditorController`, rutas en `config/react-api.php`.
Protegido por autenticación + `MelisCoreRights::canAccess('meliscms_page_script_editor')`:

| Método y URL | Propósito |
| --- | --- |
| `GET /melis/react-api/cms-page/scripts?idPage=<id>` | Lee los scripts de una página → `{ idPage, headTop, headBottom, bodyBottom, editDate }`. |
| `POST /melis/react-api/cms-page/scripts/save` | Guarda los scripts de una página (`{ idPage, headTop, headBottom, bodyBottom }`). |

**Pestaña de sitio** — `MelisCmsPageScriptEditorReactController`, ruta genérica
`/melis/MelisCmsPageScriptEditor/:controller/:action` en `config/module.config.php`. Protegido por
autenticación + `MelisCoreRights::canAccess('meliscms_tool_sites')`:

| Método y URL (relativa a `.../MelisCmsPageScriptEditorReact`) | Propósito |
| --- | --- |
| `GET /site-script?siteId=<id>` | Scripts del sitio + número de excepciones → `{ siteId, script, exceptionCount }`. |
| `POST /save-site-script` | Guarda los scripts del sitio (si todo está vacío ⇒ elimina la entrada). |
| `GET /exceptions?siteId=<id>` | Las excepciones del sitio → `{ items:[{id,pageId,pageName}], total }`. |
| `POST /add-exception` | Añade una excepción (`{ siteId, pageId }`; exige mismo sitio + sin duplicados). |
| `POST /delete-exception` | Elimina una excepción (`{ id }`). |

> **Nota de seguridad.** Los endpoints de página inyectan `<script>`/HTML personalizado en el
> renderizado **público** de una página, por lo que tanto `get` como `save` requieren el derecho de la
> herramienta page-script-editor (no una mera sesión), lo que impide que un usuario del BO sin derechos
> implante un XSS persistente. Las escrituras usan SQL parametrizado directamente sobre
> `melis_cms_scripts`.

## Servicios clave

| Alias | Rol |
| --- | --- |
| `MelisCmsPageScriptEditorService` | Toda la lógica de negocio de scripts: guardar, leer, fusionar e inyectar scripts. Reutilizado por ambos controladores React. |
| `MelisCmsScriptTable` | Table gateway para `melis_cms_scripts`. |
| `MelisCmsScriptExceptionTable` | Table gateway para `melis_cms_scripts_exceptions`. |

`MelisCmsPageScriptEditorService` expone:

| Método | Rol |
| --- | --- |
| `addScript($siteId, $pageId, $headTop, $headBottom, $bodyBottom, $mcsId)` | Inserta o actualiza una fila de script para un sitio o una página. |
| `addScriptException($siteId, $pageId)` | Marca una página como excluida de los scripts a nivel de sitio. |
| `getScriptExceptions($siteId, $sortCol, $sortOrder)` | Lista las páginas que se excluyen de los scripts del sitio. |
| `getScriptsPerSite($siteId)` / `getScriptsPerPage($pageId)` | Recupera la(s) fila(s) de script de un sitio / página. |
| `getScriptsExceptionPerPage($pageId)` | Recupera la(s) fila(s) de excepción de una página. |
| `getMixedScriptsPerPage($pageId)` | Resuelve los scripts finales de una página — sitio + página fusionados, o solo página cuando la página es una excepción. Usado por el listener de render del front. |
| `updatePageScripts($pageId, $html)` | Inyecta los scripts fusionados en el HTML renderizado (después de `<head>`, antes de `</head>`, antes de `</body>`). |
| `getSiteId($pageId)` | Resuelve el id del sitio para una página dada. |

## Front office

La inyección se produce mediante un listener MVC, no un plugin de plantilla:

| Listener | Disparador | Rol |
| --- | --- | --- |
| `MelisCmsPageScriptEditorScriptTagListener` | Render de página (front) | Llama a `getMixedScriptsPerPage()` e inyecta los scripts resueltos: head-top después de `<head>`, head-bottom antes de `</head>`, body-bottom antes de `</body>`. |

El guardado y la duplicación siguen siendo dirigidos por eventos (`Module.php::onBootstrap`): los
listeners de save-page, save-site-script y duplicate-page persisten los scripts y la excepción de
exclusión del sitio cuando las páginas/sitios se guardan o duplican en el back-office. El view helper
`melisCmsPageScriptEditorAddScript`
(`src/View/Helper/MelisCmsPageScriptEditorAddScriptHelper.php`) proporciona acceso programático para
guardar una fila de script mediante el servicio.

## Tablas de la base de datos

| Tabla | Contiene |
| --- | --- |
| `melis_cms_scripts` | Un conjunto de scripts por sitio o por página: `mcs_id`, `mcs_site_id`, `mcs_page_id`, `mcs_head_top`, `mcs_head_bottom`, `mcs_body_bottom`, `mcs_date_edition`, `mcs_user_id`. |
| `melis_cms_scripts_exceptions` | Páginas que ignoran los scripts del sitio: `mcse_id`, `mcse_site_id`, `mcse_page_id`, `mcse_date_creation`, `mcse_user_id`. |

## Ejemplo

```php
$scripts = $this->getServiceManager()->get('MelisCmsPageScriptEditorService');

// Resolve the final scripts for a page (site + page merged, or page-only if exception)
$resolved = $scripts->getMixedScriptsPerPage($pageId);
// $resolved contains headTopScript, headBottomScript, bodyBottomScript

// Save scripts for a site or page
$scripts->addScript($siteId, $pageId, $headTop, $headBottom, $bodyBottom, $mcsId);

// Mark a page as an exception (it will no longer receive site-wide scripts)
$scripts->addScriptException($siteId, $pageId);

// List all pages that opted out of the site scripts
$exceptions = $scripts->getScriptExceptions($siteId, $sortCol, $sortOrder);
```

## Archivos clave

| Aspecto | Ruta |
| --- | --- |
| Arranque del módulo y cableado de listeners | `vendor/melisplatform/melis-cms-page-script-editor/src/Module.php` |
| Cableado de servicio y rutas | `vendor/melisplatform/melis-cms-page-script-editor/config/module.config.php` |
| Rutas de la API React de la pestaña de página | `vendor/melisplatform/melis-cms-page-script-editor/config/react-api.php` |
| Declaración de capacidad de la pestaña de página | `vendor/melisplatform/melis-cms-page-script-editor/config/react.capabilities.php` |
| Controladores React (página / sitio) | `vendor/melisplatform/melis-cms-page-script-editor/src/Controller/` |
| Brick de la pestaña de sitio (Vite IIFE) | `vendor/melisplatform/melis-cms-page-script-editor/ui-react/src/` (`brick.tsx`, `ScriptsTab.tsx`, `site-scripts-api.ts`) |
| Servicio | `vendor/melisplatform/melis-cms-page-script-editor/src/Service/MelisCmsPageScriptEditorService.php` |
| Listener de inyección del front | `vendor/melisplatform/melis-cms-page-script-editor/src/Listener/MelisCmsPageScriptEditorScriptTagListener.php` |
| View helper | `vendor/melisplatform/melis-cms-page-script-editor/src/View/Helper/MelisCmsPageScriptEditorAddScriptHelper.php` |
| Table gateways | `vendor/melisplatform/melis-cms-page-script-editor/src/Model/Tables/` |
| SQL de instalación | `vendor/melisplatform/melis-cms-page-script-editor/install/dbdeploy/` |

Consulta también: [Referencia de módulos](/es/reference/modules) · [melis-cms](/es/reference/modules/melis-cms) ·
[melis-core](/es/reference/modules/melis-core)
