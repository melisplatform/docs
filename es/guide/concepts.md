# Arquitectura y conceptos

Melis Platform es una **aplicación MVC de Laminas (linaje ZF2)**. Sobre el Laminas estándar añade
un puñado de convenciones que hacen funcionar el backoffice. Comprender estos cinco conceptos es
suficiente para leer — y extender — casi cualquier parte de la plataforma.

En **v6**, el framework y los módulos no cambian: los mismos módulos de Laminas, el mismo árbol de
configuración, los mismos servicios y eventos. Lo que cambió es la **interfaz del back-office**: v6
incorpora un nuevo **back-office React en `/melis-react`** sobre esa misma base sin cambios (ver §6).
Los cinco conceptos siguientes siguen describiendo cómo funciona todo por debajo.

## 1. Módulos

Todo en Melis es un **módulo** (un módulo estándar de Laminas). La lista de módulos de backoffice
que carga la aplicación se encuentra en:

```
config/melis.module.load.php
```

```php
return [
  'MelisAssetManager',
  'MelisDbDeploy',
  'MelisCore',
  'MelisCms',
  'MelisFront',
  // … tus propios módulos van aquí
];
```

En el arranque, `config/application.config.php` ensambla la lista final de módulos mediante
`MelisCore\MelisModuleManager` (que fusiona estos módulos con los módulos de componentes y el
módulo de sitio seleccionado por `MELIS_MODULE`).

Un módulo agrupa sus propios controladores, servicios, vistas, traducciones **y** un conjunto de
archivos de configuración específicos de Melis (ver más abajo). Su `Module::getConfig()` los fusiona.
En v6 un módulo puede **además** incluir un "brick" de React (una pequeña interfaz React) y sus
propios endpoints `react-api` — estos siguen siendo simplemente configuración y código adicionales
dentro del mismo módulo (ver §6).

## 2. El árbol de configuración y las "melis keys"

Además del habitual `module.config.php`, cada módulo de backoffice publica **archivos de
configuración de aplicación** que se fusionan en un único árbol consultable bajo una raíz `plugins`:

| Archivo               | Declara                                              |
| --------------------- | ---------------------------------------------------- |
| `app.interface.php`   | Zonas/secciones de UI y sus **forwards** (ver §3)    |
| `app.tools.php`       | Herramientas: tablas de datos, columnas, filtros, botones de acción |
| `app.toolstree.php`   | Dónde se adjunta una herramienta en el **menú izquierdo** |
| `app.forms.php`       | Definiciones de formularios                          |

Consultas este árbol a través del servicio **`MelisCoreConfig`**
(`vendor/melisplatform/melis-core/src/Service/MelisCoreConfigService.php`):

```php
$config = $sm->get('MelisCoreConfig');

// Obtener un nodo por ruta:
$node = $config->getItem('meliscore_leftmenu');

// Resolver todas las "melis keys" → rutas de configuración completas:
$keys = $config->getMelisKeys();
```

Una **melis key** es un alias estable y legible para una ruta de configuración profundamente
anidada, declarado en un nodo mediante `'conf' => ['melisKey' => 'my_key']`. Permite que los módulos
se referencien entre sí sin acoplarse rígidamente a una ruta. Esta misma **melisKey** es la que el
back-office React usa para identificar una herramienta — tanto para enrutar hacia ella como para
controlar su acceso según los permisos (ver §6).

## 3. Zonas y forwards (cómo se renderiza el backoffice)

La interfaz del backoffice está **impulsada por configuración**. Una página es un árbol de **zonas**;
cada zona puede declarar un **forward** — un triplete `module / controller / action` que renderiza
esa zona:

```php
'forward' => [
  'module'     => 'MelisCms',
  'controller' => 'PageTree',
  'action'     => 'render-page-tree',
],
```

`MelisCore\Controller\PluginViewController` recorre el árbol de configuración, despacha cada forward
y ensambla el HTML resultante. Por eso el menú izquierdo, las cabeceras y las herramientas se
declaran todos en la configuración en lugar de estar codificados de forma fija — y por eso añadir
una herramienta es principalmente cuestión de **declarar la configuración correcta** y proporcionar
un controlador + una vista.

En v6 esta maquinaria de zonas/forwards sigue siendo la fuente de verdad, e impulsa el shell React
de dos maneras: cualquier herramienta clásica que no tenga una pantalla React nativa se renderiza
como una **zona independiente** y se muestra dentro del shell en un iframe, y el menú izquierdo que
muestra el shell se construye a partir de la misma configuración de interfaz, filtrada por permisos
(ver §6).

## 4. Servicios y factories

Melis se apoya en el **service manager de Laminas**. Los servicios se registran en el
`module.config.php` de cada módulo (`service_manager` → `aliases` / `factories`) y se resuelven por
nombre:

```php
$svc = $this->getServiceManager()->get('MelisCoreConfig');
```

Los servicios básicos comunes incluyen `MelisCoreConfig`, `MelisCoreAuth`, `MelisCoreRights`,
`MelisCoreUser`, `MelisCoreTool`. Los servicios de negocio suelen extender `MelisGeneralService`
(que añade el despacho de eventos); el acceso a la base de datos pasa por envoltorios `TableGateway`
de Laminas. Las pantallas React de v6 no cambian esto: un brick de React es solo presentación —
cada acción que realiza vuelve a llamar a estos **mismos servicios del lado del servidor** a través
de endpoints `react-api` (ver §6).

## 5. Eventos

Los módulos se enganchan al ciclo de vida de la petición en `Module::onBootstrap()` y mediante
listeners en el **gestor de eventos compartido**. El comportamiento básico (autenticación,
comprobaciones de permisos, mensajes flash, caché…) se conecta de esta forma, y puedes
publicar/suscribirte a eventos Melis personalizados — p. ej. `melis_core_auth_login_ok` se dispara
tras un inicio de sesión correcto.

## 6. El back-office React (v6)

v6 mantiene el framework y los módulos pero **reemplaza la interfaz del back-office** por una
aplicación React de página única (SPA) servida en **`/melis-react`** (la interfaz clásica `/melis`
sigue estando por debajo). Dos ideas bastan para imaginarlo:

- **Bricks** — una herramienta React nativa. Un módulo incluye un
  `public/ui-react/brick.manifest.json` y un bundle compilado; el shell **descubre** los bricks de
  cada módulo activo y los monta. Un brick aparece **si y solo si** su módulo está habilitado — la
  misma regla de modularidad que en todas partes.
- **Interruptor New / Old** — la mayoría de las herramientas llevan un conmutador en la esquina
  superior derecha: **New** = la pantalla React nativa, **Old** = la herramienta clásica renderizada
  dentro de un iframe. Así no se pierde nada mientras los módulos se reescriben progresivamente en
  React.

Todo lo que el shell muestra alrededor de tus herramientas — quién eres, el **menú izquierdo** (ya
filtrado según tus permisos), el selector de idioma, los mosaicos del **dashboard**, el
descubrimiento de herramientas — se ensambla en el arranque a partir de un pequeño conjunto de
**endpoints JSON** genéricos bajo `/melis/react-api/…`, cada uno devolviendo una carga útil
`{ success, data, error? }`. Una superposición global flotante de **Asistente de IA** está
disponible en todas las pantallas.

![La superposición del Asistente de IA React](/screenshots/react/melis-ai/melisai-footer-icon-generalassistant-deployed.png)
*El Asistente de IA flotante está disponible desde cada pantalla del back-office React.*

Tres módulos hacen esto posible, y ninguno de ellos es una herramienta a la que navegues:

- **MelisReactApi** — la columna vertebral de la API JSON. No dibuja ninguna interfaz; sirve el
  conjunto de arranque (`/me`, `/menu`, `/langs`, `/assets`, `/react-modules`) más los endpoints del
  dashboard y de permisos, y aloja el motor de **capabilities** (ver más abajo). Los endpoints de
  datos *propios* de una herramienta viven en el módulo de esa herramienta, no aquí.
- **MelisReactOverride** — la infraestructura que (a) sirve el shell React para `/melis-react` y sus
  enlaces profundos, y (b) renderiza cualquier herramienta clásica como una página independiente
  (`/melis/react-tool-page?key=<melisKey>`) para que el conmutador **Old** y cualquier herramienta
  aún no reescrita sigan funcionando dentro del shell.
- Cada **módulo de funcionalidad** (p. ej. `MelisCms`) incluye sus propios bricks, rutas `react-api`
  y capabilities.

Las **capabilities** son los "permisos avanzados" de grano fino de v6: *dentro* de una herramienta
ya autorizada, se pueden denegar acciones individuales (`list`, `create`, `edit`, `delete`, o una
pestaña anidada) por usuario/rol. Son **permitidas por defecto** y **subordinadas** a la
comprobación clásica de acceso a la herramienta (`MelisCoreRights::canAccess`, sin cambios) — una
herramienta sin declaración de capabilities conserva el CRUD completo. Un módulo declara las
capabilities que existen para la `melisKey` de su herramienta en `config/react.capabilities.php`; sus
controladores controlan cada acción con `denyUnlessCan($cap)`.

> Regla práctica: si el shell React lo muestra (menú, cabecera, dashboard, lista de herramientas,
> matriz de permisos) pero no es la pantalla propia de una herramienta específica, proviene de un
> endpoint de MelisReactApi. Si estás viendo una herramienta clásica de estilo Bootstrap dentro de
> `/melis-react`, estás viendo a MelisReactOverride renderizar esa herramienta en un iframe.

Para el contrato completo y los detalles internos, consulta las referencias de los módulos:
[MelisReactApi](/es/reference/modules/melis-react-api) y
[MelisReactOverride](/es/reference/modules/melis-react-override); para un ejemplo trabajado de un
módulo multi-brick, [MelisCms](/es/reference/modules/melis-cms).

## Extra: cambios en la base de datos (dbdeploy y flyway)

Los cambios de esquema y de datos semilla están versionados:

- **dbdeploy** (`MelisDbDeploy`): cada módulo incluye deltas SQL numerados; los deltas aplicados se
  registran en una tabla `changelog` para que se ejecuten una sola vez. Los deltas de los módulos se
  publican en `dbdeploy/`.
- **flyway** (`flyway/sql/`): migraciones a nivel de proyecto (p. ej. `V3__add_melisai_rights.sql`),
  aplicadas con `flyway migrate`.

## Dónde mirar en el código

| Aspecto             | Ruta |
| ------------------- | ---- |
| Lista de módulos    | `config/melis.module.load.php` |
| Arranque de la app  | `config/application.config.php` |
| Config de BD de plataforma | `config/autoload/platforms/<MELIS_PLATFORM>.php` |
| Servicio de configuración | `vendor/melisplatform/melis-core/src/Service/MelisCoreConfigService.php` |
| Render de zonas/forwards | `vendor/melisplatform/melis-core/src/Controller/PluginViewController.php` |
| Gestor de módulos   | `vendor/melisplatform/melis-core/src/MelisModuleManager.php` |
| Shell React (SPA)   | `vendor/melisplatform/melis-core/public/ui-react/` |
| API React + capabilities | `vendor/melisplatform/melis-react-api/` |
| Infraestructura del shell e iframe React | `vendor/melisplatform/melis-react-override/` |

Siguiente: júntalo todo [creando tu primera herramienta](./create-a-tool).
