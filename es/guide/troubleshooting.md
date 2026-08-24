# Resolución de problemas y operaciones

Una guía práctica de los problemas que realmente vas a encontrar, con su causa y su solución. Cuando algo
"no aparece", la respuesta casi siempre es **módulos / permisos / caché**.

En v6 el back-office es el **shell de React en `/melis-react`**, pero el framework, los módulos y la
configuración subyacentes no han cambiado, por lo que la mayoría de las soluciones aquí siguen siendo del lado del servidor. Cuando una herramienta no tiene
página React nativa, el shell muestra la herramienta clásica dentro de un iframe
(`/melis/react-tool-page?key=<melisKey>`), y las herramientas "brick" nativas de React incluyen un conmutador **New (React) /
Old (iframe)** hacia esa misma pantalla clásica. Saber en qué capa estás mirando suele ser
el primer paso del diagnóstico.

## Activa primero los errores

Por defecto, Melis es discreto con los errores. Activa el **modo desarrollo** para verlos:

```bash
vendor/bin/laminas-development-mode enable     # status | enable | disable
```

Esto carga `config/development.config.php`, desactiva las cachés de configuración/módulos y establece
`error_reporting(E_ALL)`. Las advertencias de PHP también las expone
`MelisCorePhpWarningListener`. El reporte/visualización de errores también puede controlarse mediante la configuración de Melis
bajo `/meliscore/datas/errors`.

Ten en cuenta que los endpoints de la API de React responden JSON, no HTML: una llamada de arranque fallida devuelve
`{ success: false, error: … }` (por ejemplo `{ success:false, error:'Unauthenticated' }` con HTTP 401),
así que consulta la pestaña de red, no solo la página. Una herramienta heredada dentro del iframe sigue mostrando sus propios
errores nativos (toasts de gritter, modales de validación por campo) exactamente igual que bajo `/melis`.

::: warning ¿Página en blanco, HTTP 200, sin error?
Melis usa buffering de salida; un error fatal durante el arranque/renderizado puede dar un **200 vacío**. Para ver la
excepción tragada, adjunta temporalmente un listener a `MvcEvent::EVENT_DISPATCH_ERROR` /
`EVENT_RENDER_ERROR` en `public/index.php` (envuelve `Application::init()` en try/catch e imprime el
parámetro `exception`), o activa el modo desarrollo.
:::

## Caché

La caché obsoleta es la causa n.º 1 de "cambié la configuración pero nada cambió". Las cachés se encuentran bajo `cache/`:

```
cache/meliscore_platform_cache-*   # backoffice zones / platform config
cache/meliscms_page-*              # rendered CMS pages
cache/config/                      # merged Laminas config (if enabled)
```

Bórralas eliminando las carpetas correspondientes, o mediante la API
`MelisCoreCacheSystemService::deleteCacheByPrefix('*', 'meliscore_platform_cache')`. Melis también
borra las cachés automáticamente al gestionar módulos y al cambiar permisos. Después de editar
`config/melis.module.load.php` o cualquier `app.*.php`, **borra `cache/melis*` y recarga**.

Desde el back-office puedes borrar las cachés con la herramienta **Cache** (su pantalla React incluye las
mismas pestañas que la herramienta clásica). Consulta [MelisCacheInternal](/es/reference/modules/melis-cache-internal).

El shell de React tiene su propia capa de caché que conviene tener en cuenta cuando las cosas parecen obsoletas:

- El **bundle de bricks** concatenado (`/melis/react-api/bricks-bundle.js?v=<sig>`) se sirve
  como inmutable durante 1 año; su firma `?v=` (nombre+mtime+tamaño de cada brick) cambia automáticamente
  cuando cambian los archivos de un brick, de modo que un **refresco forzado** recoge el nuevo bundle.
- El **shell SPA** (`index.html`) se sirve con `no-cache`, pero los recursos JS/CSS con hash a los que
  hace referencia llevan hash de contenido y se cachean; de nuevo, un refresco forzado es la solución.
- Si el iframe de una herramienta se carga con estilos rotos o un DataTable vacío tras un cambio en **Modules**,
  puede que los bundles de recursos de la plataforma bajo `etc/bundles/` se hayan borrado; se autorreparan
  (se regeneran en el siguiente renderizado de la página de la herramienta), pero puedes forzarlo recargando la herramienta.

## Errores frecuentes

### Un módulo no aparece
| Causa | Solución |
| --- | --- |
| No está en la lista de carga | Añádelo a `config/melis.module.load.php`. |
| Caché obsoleta | Borra `cache/melis*` y recarga. |
| Ruta no mapeada | Asegúrate de que esté en el `config/melis.modules.path.php` generado (regenerado por `MelisAssetManager`). |

### Una herramienta existe pero no está en el menú izquierdo / "No tienes acceso a esta herramienta"
El menú izquierdo de React (`GET /melis/react-api/menu`) es el árbol de navegación **filtrado por permisos**: la misma
lista de permisos XML `melis_core_user.usr_rights` que antes, solo que consumida por el shell.

| Causa | Solución |
| --- | --- |
| El usuario carece de permisos | Otorga el `*_toolstree_section` de la herramienta en **Users → Rights**, o mediante una migración (consulta `flyway/sql/V3__add_melisai_rights.sql`). |
| Permisos cacheados en la sesión | Los permisos se cargan al iniciar sesión y los refresca periódicamente `MelisCoreCheckUserRightsListener`; **cierra sesión y vuelve a entrar** tras cambiarlos. |
| Usuario inactivo | `usr_status` debe ser `1`. |
| Módulo del brick inactivo | Una herramienta nativa de React (brick) aparece **si y solo si** su módulo está activo; el shell descubre los bricks mediante `GET /melis/react-api/react-modules`. Activa el módulo. |

> Un `usr_rights` **vacío** significa acceso total (`isAccessible()` devuelve true si está vacío), pero para un
> usuario normal con una lista de permisos explícita, una sección ausente queda oculta.

### El botón/pestaña de una herramienta está prohibido aunque puedo abrir la herramienta (HTTP 403)
v6 añade **permisos avanzados** ("capabilities") *dentro* de una herramienta ya autorizada: las casillas granulares de
List / Create / Edit / Delete / por pestaña en **Users → Rights**.

| Causa | Solución |
| --- | --- |
| Capability denegada | El controlador de la herramienta llamó a `denyUnlessCan(<cap>)` y tu XML de permisos deniega esa capability. Quita la denegación en **Users → Rights** (matriz de permisos avanzados). |
| Cacheado en la sesión | Las capabilities llegan en la llamada de arranque `GET /melis/react-api/me` (`data.capabilities`); **cierra sesión y vuelve a entrar** tras editar los permisos. |

> Las capabilities son **permitir por defecto**: una herramienta sin declaración, o una cap que no esté denegada,
> sigue siendo totalmente utilizable; los **administradores las omiten** por completo. Las denegaciones residen en una sección
> `<meliscore_tool_capabilities>` dedicada del XML de permisos, por lo que no afectan al BO clásico.

### Una herramienta heredada se carga vacía / sus botones no hacen nada dentro del shell de React
Cuando una herramienta no tiene página React nativa se muestra en un iframe mediante
`/melis/react-tool-page?key=<melisKey>`. Un DataTable vacío o un botón inerte ahí casi siempre es
un **recurso de módulo faltante** (su propio `*.tool.js`/CSS no se inyectó).

| Causa | Solución |
| --- | --- |
| Recurso del módulo no cargado | La página de la herramienta inyecta los `ressources` de cada módulo; una pestaña/botón recién aportado que trae JS que la página desconoce necesita que su raíz de plugin esté registrada (o un hook `toolpage_extensions`; consulta [Crear una herramienta](/es/guide/create-a-tool)). |
| Compara con `/melis` | Abre la misma herramienta directamente en `/melis` (o mediante el conmutador **Old** de la herramienta). Si también está rota ahí, el problema está en la herramienta en sí, no en el frame de React. |

### Errores de conexión a la base de datos
| Causa | Solución |
| --- | --- |
| Falta el archivo de plataforma | `config/autoload/platforms/<MELIS_PLATFORM>.php` debe existir y coincidir con la variable de entorno `MELIS_PLATFORM`. |
| Credenciales incorrectas | Comprueba las variables de entorno `MYSQL_*` que consume el archivo de plataforma. |

### Los recursos (CSS/JS) dan 404
| Causa | Solución |
| --- | --- |
| Módulo no mapeado | Comprueba `config/melis.modules.path.php`. |
| Bundles no compilados | Recompila los recursos (build de Webpack / `vendor/bin/phing`). |
| Hoja de estilos servida como HTML | Una sesión caducada solía redirigir una petición de bundle a la página de login HTML (el navegador rechaza el MIME); v6 sirve el bundle de la plataforma en `/melis/react-platform-bundle` con el tipo correcto y lo mantiene público; un refresco forzado elimina el rechazo obsoleto. |

### Las traducciones muestran la clave `tr_…` en bruto
| Causa | Solución |
| --- | --- |
| Locale no establecido | El locale activo proviene de la sesión (`melis-lang-locale`); el selector de idioma de la cabecera de React lo escribe (`GET /melis/react-api/langs`). |
| Archivo faltante | Añade `language/<locale>.interface.php`; `en_EN` es el fallback. |

## Esquema de base de datos (dbdeploy y flyway)

- **dbdeploy** ([MelisDbDeploy](/es/reference/modules/melis-dbdeploy)) se ejecuta en `composer update`
  (hook post-update) para aplicar los deltas SQL numerados de cada módulo, registrados en la tabla `changelog`.
- **flyway** ([MelisFlyway](/es/reference/modules/melis-flyway)) aplica las migraciones del proyecto en
  `flyway/sql/` (`flyway -configFiles=flyway/conf/flyway.conf migrate`).

## Herramientas de CLI y build

```bash
vendor/bin/laminas-development-mode {status|enable|disable}   # dev mode
flyway -configFiles=flyway/conf/flyway.conf {migrate|info|repair}   # DB migrations
vendor/bin/phing                                             # build assets/bundles
```

`composer update` dispara los hooks de Melis (despliegue de módulos + dbdeploy) mediante el
`post-update-cmd` de `composer.json`.

## Dónde buscar

| Aspecto | Ruta |
| --- | --- |
| Plantilla del modo desarrollo | `config/development.config.php.dist` |
| API de caché | `vendor/melisplatform/melis-core/src/Service/MelisCoreCacheSystemService.php` |
| Refresco de permisos | `vendor/melisplatform/melis-core/src/Listener/MelisCoreCheckUserRightsListener.php` |
| Advertencias de PHP | `vendor/melisplatform/melis-core/src/Listener/MelisCorePhpWarningListener.php` |
| Ensamblaje de módulos | `vendor/melisplatform/melis-core/src/MelisModuleManager.php` |
| API de React (menu / me / capabilities) | `vendor/melisplatform/melis-react-api/src/Controller/MelisReactApiController.php` |
| Shell de React / páginas de herramientas en iframe | `vendor/melisplatform/melis-react-override/src/Controller/PluginViewController.php` |
| Configuración de Flyway | `flyway/conf/flyway.conf`, migraciones en `flyway/sql/` |
