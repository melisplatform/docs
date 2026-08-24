# Referencia de configuración

Todo lo que puedes configurar en Melis, en un solo lugar: variables de entorno, el archivo de
plataforma, la familia de configuración `app.*.php`, las claves melis, las traducciones, los recursos
(assets) y las cachés.

## Variables de entorno

Dos variables gobiernan cada instalación (definidas en `docker-compose.yml`, o mediante `SetEnv` de Apache):

| Variable | Propósito |
| --- | --- |
| **`MELIS_PLATFORM`** | Selecciona la configuración de plataforma `config/autoload/platforms/<MELIS_PLATFORM>.php` (la conexión a la BD). Por ejemplo, `local`, `dev1`. |
| **`MELIS_MODULE`** | El **módulo de sitio** servido como front office para este dominio (por ejemplo, `MelisDemoCms`). |
| `MYSQL_HOSTNAME` / `MYSQL_DATABASE` / `MYSQL_USER` / `MYSQL_PASSWORD` | Conexión a la BD, normalmente leída por el archivo de plataforma mediante `getenv()`. |

## El archivo de plataforma

`config/autoload/platforms/<MELIS_PLATFORM>.php` contiene la **conexión a la base de datos** (y algunos
ajustes de host). Se fusiona en último lugar, por lo que sobrescribe los valores por defecto en cada entorno:

```php
return [
    'db' => [
        'driver'   => 'Mysqli',
        'hostname' => getenv('MYSQL_HOSTNAME') ?: 'localhost',
        'database' => getenv('MYSQL_DATABASE'),
        'username' => getenv('MYSQL_USER'),
        'password' => getenv('MYSQL_PASSWORD'),
        'port'     => '3306',
        'charset'  => 'utf8mb4',
    ],
    'melis_platform'       => getenv('MELIS_PLATFORM'),
    'melis_http_host'      => 'localhost',
    'melis_request_scheme' => 'http',
];
```

El archivo que se carga se elige en `config/application.config.php` (`config_glob_paths`) a partir de
`getenv('MELIS_PLATFORM')`.

## Archivos de configuración del proyecto

| Archivo | Función |
| --- | --- |
| `config/melis.module.load.php` | La lista ordenada de **módulos de backoffice** a cargar. |
| `config/melis.modules.path.php` | Mapa generado: nombre de módulo → ruta en el sistema de archivos (construido por `MelisAssetManager`). |
| `config/application.config.php` | Punto de entrada de la app: ensamblaje de módulos, glob paths, flags de caché. |
| `config/autoload/{global,local}.php` | Configuración de autocarga estándar de Laminas. |
| `config/autoload/platforms/<env>.php` | Configuración de BD/plataforma por entorno (arriba). |
| `config/development.config.php` | Sobrescrituras de desarrollo (creado por `laminas-development-mode enable`). |

## La familia de configuración `app.*.php`

Cada módulo de backoffice fusiona estos archivos específicos de Melis en `Module::getConfig()`. Todos
construyen un único árbol bajo una raíz `plugins`, consultable mediante [`MelisCoreConfig`](../guide/concepts#_2-the-config-tree-melis-keys):

| Archivo | Declara |
| --- | --- |
| `app.interface.php` | **Zonas** de la interfaz y su `forward` (módulo/controlador/acción). Cada nodo: `conf` (id, name, icon, `melisKey`, `rightsDisplay`), `forward`, `interface` anidada. |
| `app.toolstree.php` | Dónde se adjunta una herramienta en el **menú izquierdo** (`*_toolstree_section`). |
| `app.tools.php` | **Herramientas**: tablas de datos (columnas, filtros, botones de acción), formularios. |
| `app.forms.php` | Definiciones de **formularios** reutilizables (especificación de formulario Laminas + `input_filter`). |
| `app.emails.php` | Configuraciones de plantillas de correo electrónico. |
| `app.microservice.php` | APIs de métodos de servicio invocables (formularios de entrada/salida). |
| `excluded.routes.php` | Rutas que omiten la comprobación de autenticación. |

### Convenciones

- **Claves de traducción**: `tr_<module>_<section>_<item>` (por ejemplo, `tr_meliscore_tool_users`).
- **Ids de configuración**: `id_<module>_<item>`.
- **Claves melis**: alias cortos declarados como `'conf' => ['melisKey' => '…']` → resueltos a rutas de
  configuración completas por `MelisCoreConfig::getMelisKeys()`.
- **Tablas**: `melis_<area>_<entity>` (por ejemplo, `melis_core_user`, `melis_cms_page_published`,
  `melis_ecom_product`).
- **Rutas**: `<module-slug>/<name>` (por ejemplo, `melis-backoffice/login`).

## Traducciones

Arrays PHP por configuración regional (locale) bajo la carpeta `language/` de cada módulo:

```
language/en_EN.interface.php
language/fr_FR.interface.php   // 'tr_key' => 'Texte'
```

Cargados por `Module::createTranslations()` para el locale activo (sesión `melis-lang-locale`), con
`en_EN` como alternativa (fallback). Los tipos incluyen `interface`, `forms`, `install`, `setup`.

## Recursos (assets)

`MelisAssetManager` sirve la carpeta `public/` de cada módulo en `/<ModuleName>/…` y genera
`config/melis.modules.path.php`. Un **módulo de sitio** enumera su CSS/JS de front office en
`config/assets.config.php`. El empaquetado con Webpack está disponible (build tool / acción de backoffice).

## Cachés

El comportamiento de la caché se configura en el `module.config.php` de `melis-core` (la sección `caches`) y
se usa mediante `MelisCoreCacheSystemService`. Cada caché tiene un flag `active`, un `cache_dir` bajo `cache/`,
y TTLs por clave. La **caché de configuración** de Laminas se rige por `config_cache_enabled` en
`application.config.php` (desactivada por defecto en este esqueleto). Consulta
[Resolución de problemas](../guide/troubleshooting#cache) para limpiar las cachés.

## Configuración del back-office React

El back-office React de la v6 (`/melis-react`) se ejecuta sobre el **mismo framework y el mismo árbol de
configuración** que el back-office clásico (`/melis`); todo lo anterior sigue aplicándose. Dos módulos de
infraestructura adicionales lo conectan. Ambos se cargan a través de `config/application.config.php`
(`module_paths` / `modules`, no mediante la autocarga de composer) y ninguno tiene configuración a nivel de
proyecto que editar: habilitar el BO React es cuestión de cargar estos módulos.

| Módulo | Función |
| --- | --- |
| `MelisReactApi` | La columna vertebral de la API JSON. Declara los endpoints genéricos `/melis/react-api/…` (en su propio `config/module.config.php`) y aloja el resolutor de capacidades. No dibuja ninguna interfaz. |
| `MelisReactOverride` | Sirve el shell de React y renderiza las herramientas heredadas como iframes. Sobrescribe el controlador `PluginView` de MelisCore y declara las rutas del shell/herramientas. |

### Servir el shell

La SPA de React es servida por el `SpaController` de `MelisReactOverride` en **`/melis-react`** y en cada
enlace profundo (deep link) bajo esa ruta (ruta regex `meliscore-melis-react-spa`, `priority => 1000`). El
`index.html` del shell se lee desde el `public/ui-react/index.html` de **melis-core**, servido en
`/MelisCore/ui-react/`, de modo que el build de React reside con `melis-core`, no en estos módulos.

Dado que la aplicación React gestiona su propia autenticación, `MelisReactOverride` añade algunas rutas a
`plugins.meliscore.datas.excluded_routes` de MelisCore (públicas, sin redirección de inicio de sesión): la
propia ruta de la SPA, `melis-backoffice/react-platform-bundle`, y los dos endpoints de arranque (boot) de
solo lectura `melis-backoffice/melis-react-api/platformscheme-react-get` y
`melis-backoffice/melis-react-api/langs`.

### Descubrimiento de bricks / módulos

El shell descubre las herramientas al arrancar mediante **`GET /melis/react-api/react-modules`**, que escanea
los módulos **activos** en busca de un `public/ui-react/brick.manifest.json` (un único objeto o un array
`bricks: [...]`) y devuelve las definiciones de bricks más una única URL de bundle concatenado
(`GET /melis/react-api/bricks-bundle.js`). Por lo tanto, un brick aparece **si y solo si su módulo está
activo**; esa es la regla de modularidad; no hay un registro separado que mantener. Un módulo que incorpora
una herramienta React la proporciona como un brick bajo su propio `public/ui-react/`.

### Claves de configuración React por módulo

Los módulos de herramientas individuales (no estos dos módulos de infraestructura) pueden declarar
configuración de React, fusionada en el árbol de configuración a través de su `Module::getConfig()`:

| Archivo / clave | Declara |
| --- | --- |
| `config/react-api.php` | Las rutas de datos `/melis/react-api/…` propias de un módulo de herramientas (por ejemplo, `users`, `roles` residen en MelisCore / MelisSmallBusiness, **no** en MelisReactApi). |
| `config/react.capabilities.php` (`melisReactToolCapabilities`) | Los "derechos avanzados" (advanced rights) de grano fino (`list` / `create` / `edit` / `delete`, o un árbol anidado `{ actions, tabs }`) que existen por `melisKey` de herramienta. El valor por defecto es **permitir** (allow); las denegaciones se almacenan en una sección dedicada `<meliscore_tool_capabilities>` del XML de derechos del usuario/rol. |
| `melis_react_override.toolpage_extensions[]` | Nombres de servicio que implementan `PluginViewToolPageExtensionInterface`: las particularidades por herramienta de un módulo (ajustes de HTML/assets) para las herramientas heredadas mostradas en el shell de React. Las contribuciones se acumulan independientemente del orden de carga. |

Los propios módulos de infraestructura no declaran **ninguna** de estas claves: `MelisReactApi` es el motor
que *lee* las declaraciones de capacidades de otros módulos, y `MelisReactOverride` no incorpora ningún
brick, ni `react-api.php` ni `react.capabilities.php`.

## Dónde buscar

| Aspecto | Ruta |
| --- | --- |
| Lista de módulos | `config/melis.module.load.php` |
| BD de plataforma | `config/autoload/platforms/<MELIS_PLATFORM>.php` |
| Servicio de configuración | `vendor/melisplatform/melis-core/src/Service/MelisCoreConfigService.php` |
| Configuración de caché | `vendor/melisplatform/melis-core/config/module.config.php` (`caches`) |
| Gestor de recursos (asset manager) | `vendor/melisplatform/melis-asset-manager/` |
| Rutas de la API React / resolutor de capacidades | `vendor/melisplatform/melis-react-api/` |
| Shell React + iframe de herramienta heredada / ruta SPA | `vendor/melisplatform/melis-react-override/` |
| Build del shell React (`index.html`, bricks) | `vendor/melisplatform/melis-core/public/ui-react/` |
