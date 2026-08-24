# MelisMarketPlace

> Tienda de módulos integrada en el back-office para descubrir, descargar, actualizar y eliminar
> módulos de Melis Platform, ahora servida como un catálogo React nativo. Paquete
> `melisplatform/melis-marketplace`.

## Propósito

MelisMarketPlace es la tienda de módulos del back-office: enumera cada paquete publicado en el
servidor Packagist de Melis, compara cada versión instalada con la última versión publicada y
permite a un administrador descargar, actualizar o eliminar módulos —e instalar productos de sitio
completos— sin salir del back-office. Llama a `MelisComposerService` (melis-composerdeploy) para el
trabajo real de Composer y lee/alterna el estado de los módulos mediante
`MelisAssetManagerModulesService` (melis-asset-manager).

Seis módulos fundamentales —**MelisCore, MelisEngine, MelisFront, MelisAssetManager,
MelisComposerDeploy, MelisDbDeploy**— figuran como excepciones (exentos) y nunca se ofrecen para
descarga, actualización o eliminación desde la tienda.

En el back-office React v6 (`/melis-react`), la herramienta incluye un **brick React nativo
completo**: la lista del catálogo y el detalle por paquete están escritos en React y leen una
`react-api` JSON propia del módulo. La maquinaria de instalación / actualización / eliminación
(Composer, dbdeploy, plug/unplug) permanece sin cambios y sigue ejecutándose en el servidor a través
del controlador legacy.

## Activarlo

Añádalo a `config/melis.module.load.php`:

```php
return [
    'MelisMarketPlace',
];
```

Requiere `melisplatform/melis-core: ^5.1` y PHP `^8.1|^8.3`. El módulo registra un indicador
`dbdeploy: true` para que cualquier delta de BD que incluya se aplique en la primera carga. El brick
React solo aparece mientras `MelisMarketPlace` esté presente en `config/melis.module.load.php`.

El endpoint remoto de Packagist se configura en `config/app.interface.php`, bajo
`melismarketplace_toolstree_section/datas/melis_packagist_server`
(por defecto `http://marketplace.melisplatform.com/melis-packagist`).

## Back-office React

**Dónde.** Barra lateral izquierda → **Market Place** (icono de carrito de la compra); se abre como
una pestaña superior llamada *Market Place*. El `route` del manifiesto es `/melis-marketplace` y el
`forwardKey` `MelisMarketPlace/MelisMarketPlace` asocia a ella el nodo de menú legacy.

**Catálogo (lista).** Una cuadrícula con búsqueda de tarjetas de módulo (imagen de portada, logo del
grupo, título, chip de versión, número de descargas e insignias Installed / Update-available o un
botón Download). Encima de la cuadrícula hay tres **tarjetas KPI** (Packages / Installed / Updates
available), un cuadro de búsqueda, un selector de orden (Downloads / Date added / Name), un botón
*Reset filters*, el **filtro de grupo** (All groups · Core · Cms · Marketing · Commerce · Sites), un
conmutador **Bundles**, un botón de recarga (↻) y el conmutador **New / Old**. La cuadrícula carga
más elementos a medida que se desplaza (scroll infinito). Una barra lateral derecha muestra "Want
your module listed?" y "Most downloaded packages".

![Catálogo Market Place en React: tarjetas KPI, búsqueda, orden, filtros de grupo y la cuadrícula de tarjetas de módulo con una barra lateral "Most downloaded packages"](/screenshots/react/melis-marketplace/melismarketplace-tool-list.png)

**Vista de producto (detalle).** Al hacer clic en una tarjeta se abre un detalle React completo (sin
recargar la página): un banner destacado (logo del grupo, título, insignias de estado, botones de
acción), una galería de imágenes (slider + lightbox a pantalla completa), la descripción y un panel
*Additional information* (última versión, versión actual si está instalada, GitHub, Packagist,
nombre del paquete, descargas). Un botón **← back** vuelve a la lista, que permanece montada para
conservar la búsqueda / los filtros / el desplazamiento. **No hay sub-pestañas de host**: la
transición lista ⇄ detalle es un estado interno, por lo que un brick usa exactamente una pestaña de
host.

![Vista de producto React de un módulo: banner destacado con insignias de estado y botones de acción, una galería de imágenes, la descripción y el panel Additional information](/screenshots/react/melis-marketplace/melismarketplace-tool-module-detail.png)

**Conmutador New / Old.** La lista puede alternar entre la interfaz React (*New*, por defecto) y la
herramienta clásica renderizada en un iframe (*Old*,
`/melis/react-tool-page?key=melis_market_place_tool_display`). En pantallas estrechas el conmutador
pasa a mostrar solo iconos.

**Los botones de acción** dependen del estado del paquete y de las capacidades del llamante:

| Botón | Se muestra cuando | Efecto |
| --- | --- | --- |
| Download | el módulo no está instalado | descarga con Composer → dbdeploy → activación |
| Update | instalado y `need_update` | mismo gesto de Composer sobre una versión atrasada |
| Remove | instalado, no exento | desinstalación (bloqueada si otros módulos dependen de él) |
| Private | paquete privado/bloqueado | panel de contacto; debe adquirirse |

Cada acción abre un modal **Manage** con una consola de progreso en vivo que transmite la salida de
Composer / dbdeploy, y a continuación ofrece *Activate module* / *Reload*. Si el servidor Packagist
no es accesible (`marketAccessible = false`), la interfaz React deshabilita la navegación pero
mantiene el shell activo.

## Brick React

Brick React nativo completo construido con Vite (IIFE; React / ReactDOM / react-router-dom
externalizados a los globales del host). Fuentes en `ui-react/src/`, compilado en
`public/ui-react/brick.js` junto a `brick.manifest.json`.

| Campo del manifiesto | Valor |
| --- | --- |
| `id` | `marketplace` (debe coincidir con el id registrado en `brick.tsx`) |
| `route` | `/melis-marketplace` |
| `label` | `Market Place` |
| `forwardKey` | `MelisMarketPlace/MelisMarketPlace` |
| `melisKey` | `melis_market_place_tool_display` |
| `entry` | `brick.js` |
| `persistent` | `true` |
| `subTabs` | *ausente* — lista ⇄ detalle es un estado interno `openId` |

Dado que la sección de menú Market Place es un nodo directamente clicable / `is_parent_tool`, la
clave portadora de derechos y la clave de zona del manifiesto son la **misma**
(`melis_market_place_tool_display`). El brick no puede importar módulos del host, por lo que utiliza
estilos en línea + variables CSS de tema y un diccionario `{fr,en}` en el propio archivo, controlado
por el idioma del host (`melis-ui-lang` / `melis-ui-locale` en `localStorage`). Las tarjetas y la
galería solicitan primero las capturas React con la URL de imagen legacy en `data-legacy`, y
recurren a esta en caso de error.

Archivos clave (`ui-react/src/`): `brick.tsx` (registra `id: 'marketplace'`), `MarketPlacePage.tsx`
(lista + detalle + modal de gestión), `ViewToggle.tsx` (conmutador New/Old), `marketplace-api.ts`
(cliente de API de solo lectura) y `shared/useCaps.ts` / `shared/useDebounce.ts` /
`shared/useIsNarrow.ts`.

## API React

Las rutas de **solo lectura** del catálogo se declaran en `config/module.config.php`, anidadas bajo
la ruta `application-MelisMarketPlace` (base `/melis/MelisMarketPlace/react-api`) —**propias del
módulo**, no bajo el nodo compartido `melis-react-api`. Controlador:
`MelisMarketPlace\Controller\MelisMarketPlaceReactApiController` (alias invocable
`MelisMarketPlace\Controller\MelisMarketPlaceReactApi`). Contrato `{ success, data, error }`; cada
solicitud envía `X-Requested-With: XMLHttpRequest` y `credentials: 'include'`.

| Método y URL | Acción | Propósito |
| --- | --- | --- |
| `GET …/react-api/packages` | `packages` | Lista (`page`, `limit`, `search`, `group`, `orderBy`, `order`, `bundle`) → `{items, page, pageCount, limit, marketAccessible}` |
| `GET …/react-api/packages/:id` | `get` | Detalle de un paquete (`images`, `currentVersion`, `isExempted`, versionStatus…) |
| `GET …/react-api/groups` | `groups` | Grupos de paquetes → `{groups, marketAccessible}` |
| `GET …/react-api/stats` | `stats` | KPI `{total, installed, needUpdate, marketAccessible}` |
| `GET …/react-api/status` | `status` | Estado de versión por módulo (`need_update` / `up_to_date` / `in_advance`) |

Cada acción de lectura está protegida por `denyUnlessAccess()` —autenticación
(`MelisCoreAuth::hasIdentity`) **y** `MelisCoreRights::canAccess('melis_market_place_tool_display')`,
que devuelve **401 / 403**—, por lo que la API JSON no es una puerta trasera. El controlador reutiliza
`MelisMarketPlaceService` (`compareLocalVersionFromRepo`, precarga de la última versión) y
`MelisAssetManagerModulesService` (versiones instaladas / lista de módulos) y lee los endpoints JSON
de Packagist, exactamente igual que la herramienta legacy.

> **Las acciones de modificación no tienen ruta react-api.** Download / Update / Remove las realiza
> de forma nativa el `ManageModal`, que reproduce la orquestación JS legacy llamando directamente al
> controlador **legacy** del módulo (`/melis/MelisMarketPlace/MelisMarketPlace/…`):
> `melisMarketPlaceProductDo` (consola en streaming), `reDumpAutoload`, `execDbDeploy`, `plugModule`
> / `unplugModule`, `executeComposerScripts`, `getSetupModuleForm`, `activateModule`,
> `isPackageDirectoryRemovable`, `changePackageDirectoryPermission`, `getModuleTables`,
> `exportTables`, además de `/melis/MelisCore/Modules/getDependents` para la comprobación de
> dependencias en la eliminación.

## Capacidades

Declaradas en `config/react.capabilities.php`, fusionadas bajo `melisReactToolCapabilities` por
`MelisMarketPlace\Module::getConfig()`. Indexadas por la misma melisKey usada por el manifiesto y por
la protección de acceso (`melis_market_place_tool_display`), ya que la sección es directamente
clicable:

```
melis_market_place_tool_display
└─ actions: list · download · remove
```

`list` = navegar por la cuadrícula; `download` = la descarga con Composer que tanto instala
(Download) como actualiza (Update); `remove` = desinstalar. Se trata de un **control puramente en
React** (permitir por defecto, declarativo): el controlador aplica **únicamente el acceso**
(`denyUnlessAccess`), no llama a `denyUnlessCan`. En React, el brick las lee mediante
`useCaps('melis_market_place_tool_display')`: `can('list')` controla la cuadrícula,
`can('download')` los botones Download / Update, y `can('remove')` el botón Remove (también oculto
para los módulos exentos).

## Servicios clave

| Alias del servicio | Función |
| --- | --- |
| `MelisMarketPlaceService` | Comparación de versiones, plug/unplug y envío del formulario de post-instalación por módulo. |
| `MelisMarketPlaceSiteService` | Genera un sitio web completo a partir de un paquete `melisplatform-site`. |

### `MelisMarketPlaceService`

Extiende `MelisGeneralService`.

```php
$mp = $serviceManager->get('MelisMarketPlaceService');

// Compare installed vs latest — returns one of the constants below.
$status = $mp->compareLocalVersionFromRepo('MelisCmsSlider', 'v5.1.3');
// MelisMarketPlaceService::NEED_UPDATE  (-1)
// MelisMarketPlaceService::UP_TO_DATE   (1)
// MelisMarketPlaceService::IN_ADVANCE   (2)  — running a dev-… build

// Toggle a module on/off (rewrites the active-module loader via asset-manager).
$mp->plugModule('MelisCmsSlider');
$mp->unplugModule('MelisCmsSlider');
```

`compareLocalVersionFromRepo()` dispara el par de eventos
`melismarketplace_compare_local_version_from_repo_start` / `…_end` para que los oyentes puedan
sobrescribir el estado calculado.

**Convención de post-instalación por módulo.** Un módulo puede incluir un
`MelisSetupPostDownloadController` y/o un `MelisSetupPostUpdateController` en su propio espacio de
nombres `Controller\`, exponiendo `$showOnMarketplacePostSetup = true` y las acciones `getFormAction`,
`validateFormAction`, `submitAction`. MarketPlace reenvía hacia ellos para renderizar y procesar el
formulario de instalación.

### `MelisMarketPlaceSiteService`

Extiende `MelisGeneralService`. Genera un sitio web completo a partir de un paquete
`melisplatform-site`: crea las filas `melis_cms_site` / home / langs, asigna nuevos rangos de
page-id, platform-id y template-id, y crea las tablas CMS del módulo mediante
`Support\MelisMarketPlaceCmsTables` / `Support\MelisMarketPlaceSiteInstall`.

```php
$site = $serviceManager->get('MelisMarketPlaceSiteService');
$site->marketplaceInstallSite($request);   // reads POST: name, scheme, domain, module, action
```

Excepciones tipadas (en `src/Exception/`): `EmptySiteException`,
`PlatformIdMaxRangeReachedException`, `TemplateIdMaxRangeReachedException`,
`ArrayKeyNotFoundException`, `FileNotFoundException`.

## Herramienta legacy (vista Old)

La herramienta clásica sigue disponible tras el conmutador New/Old y todavía es dueña del flujo de
modificación. `melisMarketPlaceProductDoAction()` es el único endpoint para las acciones del
catálogo: dispara `melis_marketplace_product_do_start`, selecciona según la acción
(`MelisComposerService::DOWNLOAD / UPDATE / REMOVE`) y luego dispara
`melis_marketplace_product_do_finish` para gestionar la respuesta del flash-messenger. Antes de
eliminar, recorre las dependencias del módulo objetivo, las de todos los demás módulos activos y el
bloque `require` del `composer.json` raíz del proyecto, para evitar eliminar una dependencia
compartida.

Dos comprobaciones controlan la usabilidad de la tienda (ambas en `MelisMarketPlaceController`):

- `isMarketplaceAccessible()` — si el servidor Packagist es accesible y la funcionalidad está
  activada.
- `allowUpdate()` — lee `melis_core_platform.plf_update_marketplace` para la plataforma actual
  (variable de entorno `MELIS_PLATFORM`); una plataforma con `plf_update_marketplace = 0` puede
  navegar pero no descargar ni actualizar.

`MelisSetupController` gestiona la ruta independiente `/MelisMarketPlace/setup` (instalación por
módulo fuera del árbol de la interfaz del back-office).

## Eventos

| Evento | Disparado por | Propósito |
| --- | --- | --- |
| `melismarketplace_compare_local_version_from_repo_start` / `_end` | `compareLocalVersionFromRepo` | Enganchar o sobrescribir el resultado del estado de versión calculado. |
| `melis_marketplace_product_do_start` | `melisMarketPlaceProductDo` | Antes de una acción de descarga, actualización o eliminación. |
| `melis_marketplace_product_do_finish` | `melisMarketPlaceProductDo` | Tras la acción — gestiona la respuesta del flash-messenger. |

## Tablas de base de datos

MelisMarketPlace no define tablas propias. Cuando un módulo descargado incluye deltas de base de
datos, estos se aplican mediante `execDbDeployAction()` (melis-dbdeploy). Las instalaciones de
productos de sitio escriben en las tablas CMS existentes de la plataforma (asignadas mediante
`MelisMarketPlaceSiteService`).

## Archivos clave

| Aspecto | Ruta |
| --- | --- |
| Manifiesto del módulo | `vendor/melisplatform/melis-marketplace/composer.json` |
| Rutas / servicios / react-api / controladores | `vendor/melisplatform/melis-marketplace/config/module.config.php` |
| Capacidades React | `vendor/melisplatform/melis-marketplace/config/react.capabilities.php` |
| Árbol de herramientas, icono de cabecera, config de Packagist | `vendor/melisplatform/melis-marketplace/config/app.interface.php` |
| Controlador de la API React | `vendor/melisplatform/melis-marketplace/src/Controller/MelisMarketPlaceReactApiController.php` |
| Controlador principal (legacy) | `vendor/melisplatform/melis-marketplace/src/Controller/MelisMarketPlaceController.php` |
| Servicio de instalación/actualización/plug | `vendor/melisplatform/melis-marketplace/src/Service/MelisMarketPlaceService.php` |
| Servicio de instalación de sitio | `vendor/melisplatform/melis-marketplace/src/Service/MelisMarketPlaceSiteService.php` |
| Fuentes del brick React | `vendor/melisplatform/melis-marketplace/ui-react/src/` |
| Brick compilado + manifiesto | `vendor/melisplatform/melis-marketplace/public/ui-react/` |
| Excepciones | `vendor/melisplatform/melis-marketplace/src/Exception/` |

Véase también: [melis-composerdeploy](/es/reference/modules/melis-composerdeploy) ·
[melis-asset-manager](/es/reference/modules/melis-asset-manager) ·
[melis-dbdeploy](/es/reference/modules/melis-dbdeploy) ·
[melis-core](/es/reference/modules/melis-core)
