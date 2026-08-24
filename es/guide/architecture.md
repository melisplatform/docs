# Análisis profundo de la arquitectura

Esta página traza una petición **de principio a fin** y nombra las clases, eventos y servicios reales
implicados. Complementa a [Conceptos](./concepts): lee esa primero para el vocabulario, lee esta para
entender la *mecánica*. Es también la página que debes leer si tú (o un asistente de IA) necesitáis un modelo
mental completo de cómo funciona Melis.

Melis **v6** conserva el mismo framework, módulos y ciclo de vida de la petición que v5 — lo que cambió es la
**interfaz del back-office**. Las herramientas clásicas renderizadas en el servidor en `/melis` siguen ahí, pero la experiencia
por defecto es ahora una **aplicación de página única (SPA) en React en `/melis-react`** que carga herramientas nativas de React
("bricks") y recurre a las herramientas clásicas dentro de un iframe. Las secciones siguientes conservan toda la
mecánica sin cambios y añaden el shell de React donde corresponde.

## Bootstrap

`public/index.php` carga el autoloader de Composer, fusiona
`config/application.config.php` con `config/development.config.php` (cuando está presente) y luego ejecuta la
aplicación MVC de Laminas.

`config/application.config.php` construye la lista de módulos dinámicamente:

```php
'modules' => array_merge(
    MelisCore\MelisModuleManager::getModuleComponents(), // framework components first
    MelisCore\MelisModuleManager::getModules()           // then Melis modules
),
'module_listener_options' => [
    'module_paths'      => ['./module', './module/MelisSites'],
    'config_glob_paths' => [
        realpath(__DIR__) . '/autoload/{{,*.}global,{,*.}local}.php',
        realpath(__DIR__) . '/autoload/platforms/' . getenv('MELIS_PLATFORM') . '.php',
    ],
],
```

`MelisCore\MelisModuleManager` (`vendor/melisplatform/melis-core/src/MelisModuleManager.php`)
ensambla tres tipos de módulos según la petición:

- **Components** — dependencias del framework, declaradas por módulo en `config/module.load.php`.
- **Modules** — los módulos del back-office de `config/melis.module.load.php`.
- **Site modules** — para una URL de front-office, el sitio seleccionado por `MELIS_MODULE`
  (desde `module/MelisSites/<name>` o un sitio de proveedor como `MelisDemoCms`).

El back-office de React añade dos **módulos de infraestructura** a esta lista —
[`melis-react-api`](/es/reference/modules/melis-react-api) (la columna vertebral de la API JSON) y
[`melis-react-override`](/es/reference/modules/melis-react-override) (la ruta de la SPA + el mecanismo de iframe de
herramientas heredadas). Ambos se cargan a través de `module_paths` de `application.config.php` (no se
autocargan por composer) y se registran ellos mismos mediante `StandardAutoloader`.

Finalmente, el archivo de plataforma `config/autoload/platforms/<MELIS_PLATFORM>.php` inyecta la **conexión a la base de
datos** y los ajustes de la plataforma en la configuración fusionada.

## Ciclo de vida de la petición del back-office

Ahora hay **dos vías de entrada** al back-office, ambas gobernadas por el enrutamiento y la
comprobación de identidad de MelisCore:

- **`/melis-react…`** — el shell de React (la interfaz por defecto). Una ruta regex sirve un único documento
  HTML; todo lo demás es JSON obtenido a través de `/melis/react-api/…` y herramientas renderizadas como bricks
  o iframes (véase más abajo).
- **`/melis…`** — el back-office clásico renderizado en el servidor, aún plenamente funcional y usado como
  destino del iframe para las herramientas heredadas.

Para una URL **`/melis…`**, MelisCore gobierna el flujo clásico. Los hooks clave se enganchan en
`MelisCore\Module::onBootstrap()`:

1. **Enrutamiento** — coincide la ruta `melis-backoffice` (y sus hijas: `login`, `authenticate`,
   `logout`, `zoneview`, `react-tool-page`, …).
2. **`MvcEvent::EVENT_ROUTE` → comprobación de identidad** — se ejecuta `Module::checkIdentity()`. Si la ruta
   coincidente no está en la lista de exclusiones (`login`, `authenticate`, `change-language`, la SPA de React y
   sus endpoints de arranque…) y el usuario no está autenticado, **redirige a `/melis/login`** (o
   devuelve 404 para peticiones no-GET).
3. **Sesión e idioma** — se inicializa el contenedor de sesión `meliscore`; el locale
   (`melis-lang-locale`) gobierna `Module::createTranslations()`, que carga
   `language/<locale>.{interface,forms,…}.php`.
4. **`EVENT_DISPATCH`** — el layout se fija en `layout/layoutCore` y se ejecutan los listeners del core:
   `MelisCoreCheckUserRightsListener` (relee los permisos periódicamente), `MelisCoreFlashMessengerListener`,
   `MelisCorePhpWarningListener` y otros.
5. **Renderizado de zonas** — la interfaz del back-office es un árbol de **zonas**; `PluginViewController` resuelve
   el `forward` de cada zona (módulo/controlador/acción) y la renderiza, ensamblando el HTML final
   (véase [Conceptos → zonas y forwards](./concepts#_3-zones-forwards-how-the-backoffice-renders)).

```
GET /melis
  → route: melis-backoffice
  → EVENT_ROUTE: checkIdentity() → redirect to /melis/login if not logged in
  → EVENT_DISPATCH: layout = layout/layoutCore; rights/flash/warning listeners
  → PluginViewController renders zones (header, left menu, center, footer) via forwards
  → response
```

## Ciclo de vida del back-office de React

Para una URL **`/melis-react…`**, el flujo se divide entre una carga única del shell y llamadas JSON
posteriores:

1. **Ruta de la SPA** — `MelisReactOverride\Controller\SpaController` sirve el shell de React
   `index.html` (compilado en `melis-core/public/ui-react/`) para `/melis-react` y cada enlace profundo
   por debajo de él (`/melis-react/news/5`, …). La ruta es **pública** — la aplicación de React ejecuta su **propia
   pantalla de inicio de sesión** — y prevalece sobre el catch-all de MelisFront mediante una ruta regex de alta prioridad.
2. **Peticiones de arranque** — el shell llama a los endpoints genéricos de
   [`melis-react-api`](/es/reference/modules/melis-react-api):
   `GET /me` (usuario actual + capacidades), `GET /menu` (el árbol de navegación filtrado por permisos),
   `GET /langs` (idiomas del back-office), `GET /assets` (CSS/JS para los iframes de las herramientas) y
   `GET /react-modules` + `/bricks-bundle.js` (descubrimiento de bricks). Cada respuesta cumple el
   contrato `{ success, data, error? }`.
3. **Renderizado de herramientas** — al hacer clic en una entrada del menú se abre un **brick** (una herramienta nativa de React) si su módulo
   incluye uno; de lo contrario, una **herramienta heredada en un iframe** servida por
   `/melis/react-tool-page?key=<melisKey>` (véase [Bricks y el mecanismo de iframe](#bricks-the-iframe-mechanism)).
4. **Overlay del Asistente de IA** — un botón de chat flotante renderizado una sola vez en la raíz del shell (desde
   [`melis-ai`](/es/reference/modules/melis-ai)) sobrevive a la navegación y puede gobernar el back-office
   (abrir una herramienta, abrir una página) desde la conversación. Véase la [guía de IA](./ai).

```
GET /melis-react
  → SpaController serves ui-react/index.html (public route)
  → shell boot: GET /me, /menu, /langs, /assets, /react-modules (+ /bricks-bundle.js)
  → click a tool → React brick, or iframe → /melis/react-tool-page?key=<melisKey>
  → AI Assistant overlay mounted at the shell root
```

## Bricks y el mecanismo de iframe

El shell de React es **modular**: una herramienta aparece **si y solo si** su módulo está activo.

- **Descubrimiento de bricks** — `GET /melis/react-api/react-modules` escanea los módulos activos en busca de
  `public/ui-react/brick.manifest.json` y devuelve sus `BrickDef` (`{ id, module, route, label,
  forwardKey, melisKey, subTabs, … }`) más un único `/bricks-bundle.js` concatenado. Cada brick es
  una IIFE que se autorregistra en `window.__MELIS_BRICK_COMPONENTS__`; la firma `?v=<sig>` hace que
  el bundle sea cacheable con seguridad durante un año.
- **Conmutador Nuevo / Antiguo** — la mayoría de los bricks llevan un conmutador **Nuevo (React) / Antiguo (iframe)**. *Nuevo* es la
  pantalla nativa de React; *Antiguo* carga la herramienta clásica a través del mecanismo de iframe descrito abajo, de modo que nada
  se pierde jamás durante la migración.
- **Iframe heredado** — el
  `PluginViewController::toolPageAction()` de [`melis-react-override`](/es/reference/modules/melis-react-override)
  renderiza exactamente una zona (resuelta desde `?key=<melisKey>`)
  como una **página HTML independiente** y la devuelve con `X-Frame-Options: SAMEORIGIN`. Fuerza
  `X-Requested-With: XMLHttpRequest` para que las zonas con `follow_regular_rendering:false` se rendericen a la manera AJAX,
  fija el id de sesión de PHP durante el render, inyecta el JS/CSS propio del módulo de la herramienta (`ressources`)
  (el `bundle.js` del core solo transporta las herramientas de MelisCore) y sortea una larga lista de peculiaridades
  heredadas para que la herramienta dentro del marco tenga exactamente el mismo aspecto y comportamiento que el acceso directo a `/melis`
  (sus propios DataTables, modales, toasts de gritter y validación por campo).

El shell sirve los assets de la plataforma a esos iframes mediante
`MelisReactOverride\Service\PlatformAssetsService::build()` — el mismo CSS/JS que carga el clásico
`layoutCore.phtml` — de modo que una herramienta heredada arranca de forma idéntica dentro del shell de React.

## Autenticación y permisos

El **inicio de sesión** lo gestiona `MelisCoreAuth` (`MelisCoreAuthService`), un servicio de autenticación de Laminas
sobre la tabla `melis_core_user` (`usr_login` / `usr_password`, bcrypt vía
`password_hash`). La identidad autenticada — incluidos los `usr_rights` del usuario — se almacena en la
sesión. El shell de React gobierna la **misma** autenticación (renderiza su propia pantalla de inicio de sesión pero hace POST al
mismo servicio); `GET /me` devuelve la identidad una vez autenticado, y `GET /langs` junto con la lectura de la
marca del panel de inicio de sesión son los únicos endpoints públicos antes de iniciar sesión.

Los **permisos** controlan el acceso al back-office. `MelisCoreRights` (`MelisCoreRightsService`) lee los
`usr_rights` del usuario — una **lista blanca XML** — para decidir qué es visible y despachable:

- Las **secciones del menú izquierdo** que ve un usuario son los nodos `*_toolstree_section` listados en sus
  permisos (`isAccessible()`); un **XML de permisos vacío significa acceso total**. En el shell de React el mismo
  filtrado ocurre del lado del servidor en `GET /menu`, que emite únicamente los nodos a los que el usuario puede acceder (`canAccess`).
- Una herramienta para la que el usuario carece de permisos produce *"You don't have access to this tool"*.
- Los permisos residen en `melis_core_user.usr_rights`; para usuarios basados en roles pueden provenir del rol
  (`melis_core_user_role`). `MelisCoreCheckUserRightsListener` los refresca periódicamente y
  cierra la sesión del usuario si `usr_status` pasa a inactivo.

**Permisos avanzados (capabilities).** El back-office de React añade una capa más fina *subordinada a* la
comprobación de acceso a la herramienta: **capabilities** por herramienta (`list` / `create` / `edit` / `delete`, o pestañas
anidadas). Los módulos declaran qué capabilities existen mediante `config/react.capabilities.php`; el resolvedor
`MelisReactApi\Service\Capabilities` es de **permitir por defecto** — una capability se deniega solo si está
a la vez declarada y presente en una sección dedicada `<meliscore_tool_capabilities>` del XML de permisos.
Los controladores de las herramientas controlan sus acciones con `CapabilityGuardTrait::denyUnlessCan($cap)` (los administradores lo omiten),
y el mismo mapa de permisos llega al lado del cliente en `GET /me` para ocultar la interfaz. Esto reside en
[`melis-react-api`](/es/reference/modules/melis-react-api); la lista de denegación se edita en **Users → Rights**.

::: tip Conceder acceso a una nueva herramienta
Tras añadir una herramienta, concede el acceso mediante **Users → Rights** en el back-office de React (su
matriz de permisos avanzados se alimenta de `GET /rights/capabilities`), o inyecta la sección en el XML de permisos con una
migración — véase `flyway/sql/V3__add_melisai_rights.sql`.
:::

## Ciclo de vida de la petición del front-office

Para una URL pública, **MelisFront** + **MelisEngine** renderizan una página CMS (sin cambios en v6):

1. **Enrutamiento** — `melis-front` coincide con `…/id/{idpage}`. Las URLs SEO (`/about-us`) las resuelve a un
   id de página `MelisFrontSEORouteListener` (consulta la tabla page-SEO y registra una ruta dinámica
   en tiempo de carga del módulo).
2. **Dispatch** — los listeners del front seleccionan el layout del front y consultan la caché de páginas.
3. **Carga de la página** — `MelisEngine\Service\MelisPageService::getDatasPage($idPage, $type)` devuelve un
   `MelisPage` (datos del árbol de páginas + plantilla), cacheado bajo `getDatasPage_{id}_{type}`.
4. **Renderizado de la plantilla** — el controlador/acción `ZF2` de la plantilla renderiza el `.phtml` del módulo del sitio;
   las zonas `MelisTag` y los plugins `MelisDragDropZone` se rellenan a partir del contenido **publicado**.

```
GET /about-us
  → MelisFrontSEORouteListener maps /about-us → idpage=5
  → MelisFront\Controller\Index::index(idpage=5)
  → MelisPageService::getDatasPage(5, 'published')  (cached)
  → template ZF2 controller/action → site .phtml → MelisTag / MelisDragDropZone
  → response
```

> La ruta regex de alta prioridad `/melis-react` prevalece deliberadamente sobre este catch-all, de modo que una recarga
> de página completa en un enlace profundo de React se resuelve hacia la SPA en lugar de a un "404 page not found".

## Caché

Melis cachea de forma agresiva mediante cachés en el sistema de archivos bajo `cache/`:

| Caché | Contiene |
| --- | --- |
| `meliscore_platform_cache-*` | zonas del back-office renderizadas / configuración de la plataforma |
| `meliscms_page-*`, `melisfront_pages_file_cache-*` | páginas CMS renderizadas |
| `cache/config/` | configuración de Laminas fusionada (solo si `config_cache_enabled`) |
| `datasource-*`, `melistoolcreator-*` | cachés específicas de módulo |

`MelisCoreCacheSystemService` es la API de caché (`getCacheByKey`/`setCacheByKey`/
`deleteCacheByPrefix`). Las cachés se invalidan en eventos clave (cambios de módulo, publicación de página, actualizaciones
de permisos) y pueden limpiarse manualmente borrando las carpetas `cache/*` correspondientes — véase
[Solución de problemas](./troubleshooting). La capa de React añade sus propias cachés económicas: el bundle
de descubrimiento se sirve como inmutable con una firma de contenido, y `PlatformAssetsService` memoiza el
CSS/JS de módulos concatenado (regenerando `etc/bundles/` si la herramienta de Módulos lo ha vaciado).

## Eventos

Melis está fuertemente **orientado a eventos**. Los módulos enganchan listeners en `Module::onBootstrap()` (y mediante el
gestor de eventos compartido) al ciclo de vida MVC (`EVENT_ROUTE`, `EVENT_DISPATCH`, `EVENT_RENDER`,
`EVENT_FINISH`) y a **eventos de dominio de Melis** (p. ej. `melis_core_auth_login_ok`, eventos de guardado de página).
Los servicios de dominio extienden `MelisGeneralService`, que añade `sendEvent()` para que cualquier servicio pueda publicar
eventos a los que otros módulos se suscriben. Este es el mecanismo de extensión principal y desacoplado — prefiere un
listener antes que parchear otro módulo.

La capa de React sigue la misma filosofía de "acumular, no sobreescribir": en lugar de codificar de forma fija
las peculiaridades por herramienta, `melis-react-override` expone un hook `toolpage_extensions` que cualquier módulo puede
implementar para ajustar el HTML o los assets de una herramienta heredada dentro del marco (usado, por ejemplo, por
[`melis-ai-community-extensions`](/es/reference/modules/melis-ai-community-extensions)).

## La petición, en una sola imagen

```
public/index.php
  → application.config.php  (MelisModuleManager assembles modules + platform DB config)
  → Laminas MVC run
     ├── /melis-react → SpaController serves the React shell (public)
     │                    → boot JSON: /me /menu /langs /assets /react-modules
     │                    → brick, or iframe → /melis/react-tool-page?key=<melisKey>
     ├── /melis…      → auth (checkIdentity) → rights → PluginViewController zones (forwards)
     └── public URL   → MelisFront route (id/SEO) → MelisEngine page load → site template
  → caching at every expensive step (MelisCoreCacheSystemService)
  → response
```

## Archivos clave

| Aspecto | Ruta |
| --- | --- |
| Configuración de la app / bootstrap | `config/application.config.php` |
| Ensamblado de módulos | `vendor/melisplatform/melis-core/src/MelisModuleManager.php` |
| Bootstrap / listeners del core | `vendor/melisplatform/melis-core/src/Module.php` |
| Autenticación | `vendor/melisplatform/melis-core/src/Service/MelisCoreAuthService.php` |
| Permisos | `vendor/melisplatform/melis-core/src/Service/MelisCoreRightsService.php` |
| Árbol de configuración | `vendor/melisplatform/melis-core/src/Service/MelisCoreConfigService.php` |
| Renderizado de zonas | `vendor/melisplatform/melis-core/src/Controller/PluginViewController.php` |
| API de caché | `vendor/melisplatform/melis-core/src/Service/MelisCoreCacheSystemService.php` |
| Enrutamiento/SEO del front | `vendor/melisplatform/melis-front/src/Listener/MelisFrontSEORouteListener.php` |
| Servicio de páginas | `vendor/melisplatform/melis-engine/src/Service/MelisPageService.php` |
| API JSON de React | `vendor/melisplatform/melis-react-api/src/Controller/MelisReactApiController.php` |
| Resolvedor de capabilities | `vendor/melisplatform/melis-react-api/src/Service/Capabilities.php` |
| SPA + iframe heredado | `vendor/melisplatform/melis-react-override/src/Controller/` |
| Shell de React (fuente de la SPA) | `vendor/melisplatform/melis-core/ui-react/` |
