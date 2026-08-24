# MelisAssetManager

> Sirve los recursos públicos (CSS, JS, imágenes) de cada módulo mediante URLs limpias, entrega el
> bundle React compilado del back-office y es la fuente canónica para descubrir los módulos activos.
> Paquete `melisplatform/melis-asset-manager`.

## Propósito

MelisAssetManager intercepta las peticiones a `/<ModuleName>/…` en tiempo de carga y transmite el
archivo correspondiente desde el directorio `public/` de ese módulo, sin lógica de controlador en la
ruta crítica. En el primer arranque escribe un mapa de módulo a ruta en
`config/melis.modules.path.php` (lo que exige que la carpeta `config/` tenga permisos de escritura).
También proporciona los servicios de plataforma para consultar qué módulos están instalados o
activos, y para compilar el CSS/JS de todos los módulos en bundles de producción heredados mediante
webpack.

Forma parte de los **cimientos de la plataforma MelisCore** y es requerido por prácticamente todos
los demás módulos.

## Rol en el back-office React

El módulo **no tiene ninguna herramienta React ni interfaz propia**: no hay brick, ni
`config/react-api.php`, ni `config/react.capabilities.php`, y nunca aparece como herramienta en
`/melis-react`. Su relevancia para la v6 es puramente de infraestructura: es la capa de entrega HTTP
que sirve el **bundle compilado de la SPA React** al navegador.

El back-office React es una aplicación de una sola página (SPA) de Vite cuya salida de compilación
(JS, CSS, fuentes, iconos, `index.html`) se versiona en `melis-core/public/ui-react/`. Las peticiones
de esos archivos llegan a URLs que empiezan por **`/MelisCore/ui-react/`** —exactamente el `base`
contra el que se compila la build de Vite— y se sirven mediante el mismo resolutor genérico
`/<Module>/…` → `<module>/public/…` que se usa para los recursos de cada módulo. El reparto es:

| Capa | Servido por | URL |
| --- | --- | --- |
| Shell HTML de React | MelisReactOverride | `/melis-react` |
| Bundle JS/CSS de React con hash | **MelisAssetManager** | `/MelisCore/ui-react/…` |

> Si este módulo (o su caché con permisos de escritura) falla, el HTML del shell puede que aún se
> cargue, pero el JS/CSS con hash devuelve **404** o un **tipo MIME** incorrecto, de modo que el
> navegador se niega a ejecutar el script: el síntoma clásico es una **página `/melis-react` en
> blanco**. La causa habitual es que la carpeta `config/` (y su archivo generado
> `melis.modules.path.php`) no tiene permisos de escritura para el usuario web (p. ej. `www-data`).
> Activar un módulo nuevo fuerza una reconstrucción de esa caché; un fallo de permisos ahí degrada
> el servicio de recursos. Consulta [Activarlo](#activarlo).

## Activarlo

Añade a `config/melis.module.load.php`:

```php
return [
    'MelisAssetManager',
];
```

Dependencia: `melisplatform/melis-core` (`^6.0`), PHP `^8.3 | ^8.5`. La carpeta `config/` debe tener
permisos de escritura para que el módulo pueda persistir `melis.modules.path.php` en el arranque.

## Mecanismo de servicio

**No hay controlador** para la ruta común de recursos: el servicio es un resolutor en tiempo de
carga cableado en `src/Module.php`:

- **`onBootstrap()`** llama a **`displayFile($sm)`** en cada petición.
- **`displayFile()`** resuelve la URI de la petición a un archivo: primero prueba la carpeta pública
  principal del proyecto (`$_SERVER['DOCUMENT_ROOT'] . $uri`); en caso contrario, trata el primer
  segmento de la URI como nombre de módulo, lo busca en el mapa de caché y construye
  `<modulePath>/public/<resto-de-la-URI>`.
- **`sendDocument()`** establece el `Content-Type` correcto (mediante `getMimeType()` +
  `config/mime.config.php`), añade una cabecera de caché de 24 h para los archivos estáticos, imprime
  los bytes y termina la ejecución. Una salvaguarda (`isRequestAuthenticated()`) exige una sesión
  válida antes de hacer `eval` de cualquier archivo `.php` servido; los recursos estáticos siguen
  siendo públicos.
- **`checkFileInFolder()`** garantiza que la ruta resuelta permanezca dentro del directorio
  `public/` del módulo (protección contra path traversal).

Por tanto, una petición de `/MelisCore/ui-react/assets/index-<hash>.js` resuelve el módulo
`MelisCore` y transmite `melis-core/public/ui-react/assets/index-<hash>.js`, sin que intervenga
ningún código específico de React.

## Caché de rutas de módulos

El mapa `<ModuleName> → ruta` que usa `displayFile()` es un archivo PHP generado en
`config/melis.modules.path.php`. Lo (re)construye el listener de carga de módulos en `src/Module.php`:

- **`init()`** vincula **`onLoadModulesPost()`** a `ModuleEvent::EVENT_LOAD_MODULES_POST`.
- **`onLoadModulesPost()`** escribe el archivo cuando falta o cuando un módulo recién activado aún
  no figura en él, usando `MelisModulesService` para calcular la ruta de cada módulo, y luego le
  aplica `chmod` `0777`.

Por lo demás, el módulo es **sin estado**: este archivo generado es su único estado persistido.

## Servicios clave

Registrados en `config/module.config.php` bajo `service_manager`.

| Alias del servicio | Rol |
| --- | --- |
| `ModulesService` | Descubrir y consultar los módulos instalados/activos (`MelisModulesService`). |
| `MelisWebPackService` | Construir los bundles webpack heredados y resolver las listas de recursos de los módulos. |
| `MelisConfig` | Fusionar y leer el árbol de configuración de la aplicación de la plataforma (`MelisConfigService`). |

### `MelisModulesService`

El servicio canónico de "qué módulos existen / están activos". Lo usan la herramienta Modules, el
marketplace, la carga de módulos de sitios y el instalador.

```php
$modules = $sm->get('ModulesService'); // MelisAssetManager\Service\MelisModulesService

$active   = $modules->getMelisActiveModules();        // modules currently enabled
$all      = $modules->getAllModules();                // every discoverable module
$vendor   = $modules->getVendorModules();             // modules under vendor/
$versions = $modules->getModulesAndVersions();        // module => version
$deps     = $modules->getChildDependencies($moduleName);
$sites    = $modules->getSitesModules();              // template/site modules
```

Lista completa de métodos: `getMelisActiveModules`, `getModulesAndVersions`,
`getComposer`/`setComposer`, `getUserModules`, `getSitesModules`, `getMelisModules`,
`getAllModules`, `getVendorModules`, `getChildDependencies`.

### `MelisWebPackService`

```php
$webpack = $sm->get('MelisWebPackService');

$assets  = $webpack->getAssets($moduleName);           // a module's declared assets
$merged  = $webpack->getMergedAssets();                // platform-wide merged set
$webpack->buildWebPack();                               // compile bundles
$file    = $webpack->getWebPackMixStaticFile($asset);  // resolve a hashed/mixed asset
```

Lista completa de métodos: `getAssets`, `getWebPackMixStaticFile`, `getMergedAssets`,
`buildWebPack`, `setCachedFile`, `getCachedFiles`.

La clave de configuración `ressources.build` por módulo (en el `app.interface.php` de un módulo)
declara el `bundle.css` / `bundle.js` que este servicio produce y sirve. El `WebPackController`
(rutas `melis-backoffice/build-webpack` y `melis-backoffice/view-assets`) lo controla.

> Este pipeline de webpack construye únicamente el bundle **heredado** del back-office: no tiene nada
> que ver con la build de React. La SPA React se compila con **Vite** dentro de
> `melis-core/ui-react/` (`npm run build`) y se versiona en `melis-core/public/ui-react/`;
> MelisAssetManager solo *sirve* esos archivos ya construidos, no los compila.

### `MelisConfigService`

Un asistente de fusión de configuración y traducción para las propias necesidades del asset-manager.
Métodos clave: `getItem`, `getMelisKeys`, `getFormMergedAndOrdered`, `translateAppConfig`.

## URLs de recursos

Los recursos de cualquier módulo son accesibles en:

```
/<ModuleName>/css/<file>.css
/<ModuleName>/js/<file>.js
/<ModuleName>/images/<file>.jpg
/MelisCore/ui-react/assets/<file>          # the committed React bundle
```

Estos se corresponden con la carpeta `public/` de cada módulo. El fallback es la carpeta `public/`
principal del proyecto.

## Tablas de base de datos

Ninguna. El módulo es sin estado: su único estado persistido es el archivo generado
`config/melis.modules.path.php`.

## Archivos clave

| Aspecto | Ruta |
| --- | --- |
| Alias de servicios y cableado del servicio de recursos | `vendor/melisplatform/melis-asset-manager/config/module.config.php` |
| Mapa extensión → MIME para `sendDocument()` | `vendor/melisplatform/melis-asset-manager/config/mime.config.php` |
| Servicio de recursos + caché de rutas de módulos | `vendor/melisplatform/melis-asset-manager/src/Module.php` |
| Servicio de descubrimiento de módulos | `vendor/melisplatform/melis-asset-manager/src/Service/MelisModulesService.php` |
| Servicio de webpack/bundles (heredado) | `vendor/melisplatform/melis-asset-manager/src/Service/MelisWebPackService.php` |
| Lector de configuración de la aplicación | `vendor/melisplatform/melis-asset-manager/src/Service/MelisConfigService.php` |
| Controladores de recursos/webpack | `vendor/melisplatform/melis-asset-manager/src/Controller/` |
| Mapa de rutas de módulos (generado) | `config/melis.modules.path.php` |
| Build de React versionada (servida, no construida aquí) | `vendor/melisplatform/melis-core/public/ui-react/` |

Véase también: [MelisCore](/es/reference/modules/melis-core) · [MelisReactApi](/es/reference/modules/melis-react-api) · [MelisDbDeploy](/es/reference/modules/melis-dbdeploy) · [MelisComposerDeploy](/es/reference/modules/melis-composerdeploy) · [MelisInstaller](/es/reference/modules/melis-installer) · [Referencia de módulos](/es/reference/modules)
