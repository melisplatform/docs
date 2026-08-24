# MelisReactApi

> Columna vertebral de la API JSON del back-office React (`/melis-react`): arranca el shell, sirve los datos de menú/usuario/assets/descubrimiento/dashboard y aloja el resolvedor de capacidades. Paquete `melisplatform/melis-react-api`.

## Propósito

MelisReactApi es **infraestructura, no una herramienta**. No dibuja ninguna interfaz, no incluye ningún brick y no añade ninguna
entrada en la barra lateral. Expone los endpoints JSON genéricos `/melis/react-api/…` que el shell React
(servido por MelisReactOverride en `/melis-react`) llama al arrancar y durante la navegación, y
aloja el **resolvedor de capacidades** (`Capabilities` + `CapabilityGuardTrait`) que los controladores
de herramientas de cada módulo reutilizan para restringir sus "derechos avanzados".

Todo lo que muestra el shell y que no es la pantalla propia de una herramienta específica proviene de aquí: el
menú izquierdo (filtrado por derechos), el usuario/avatar de la cabecera y el selector de idioma, los mosaicos
y KPIs del dashboard, el descubrimiento modular de bricks y la matriz de derechos avanzados de Usuarios → Derechos.
Los endpoints propios de cada herramienta, sus rutas y sus declaraciones de capacidades residen en **sus propios**
módulos (por ejemplo, `/users`, `/roles` se declaran en MelisCore / MelisSmallBusiness), no aquí.

Este módulo **no tiene pantallas React ni capturas de pantalla**: las secciones siguientes
describen el contrato de la API que se debe usar al comunicarse con el back-office React.

## Activarlo

MelisReactApi es un módulo central del back-office React. **No** se instala mediante composer en
el volumen vendor de Docker; se carga a través de `config/application.config.php` `module_paths`
(rama `melis-react`), y `src/Module.php` carga automáticamente sus clases mediante `StandardAutoloader`.
Se combina con **MelisReactOverride** (el mecanismo iframe/herramienta + la ruta del shell SPA) y con
**melis-core/ui-react** (la aplicación React que consume esta API — véanse sus clientes `src/lib/*-api.ts`).

Declara sus rutas directamente en `config/module.config.php` (sin `config/react-api.php`)
y no declara capacidades propias (es el motor que *lee* las declaraciones de otros módulos).

## La presencia React de un vistazo

| Propiedad | Valor |
| --- | --- |
| Brick / manifiesto | **ninguno** — no incluye ningún `public/ui-react/brick.manifest.json` |
| Fuente `ui-react/` | **ninguna** — sin proyecto Vite, sin componentes React |
| Controlador | `MelisReactApi\Controller\MelisReactApiController` (alias invocable `MelisReactApi\Controller\MelisReactApi`) |
| Ruta base | `melis-backoffice` → `react-api` (es decir, `/melis/react-api/…`) |
| Autenticación | `isAuthenticated()` (MelisCoreAuth) por acción, **excepto** `/langs` (público, cargado en la pantalla de inicio de sesión) |
| Contrato de respuesta | `{ success: bool, data: T, error?: string }` (JSON en bruto, sin layout) |

Cada acción devuelve una `Response` JSON en bruto mediante el método heredado `jsonResponse()`, de modo que Laminas
nunca envuelve un layout a su alrededor. Las acciones de solo lectura llaman a `releaseSessionLock()` de forma temprana para que
las peticiones concurrentes de arranque que comparten la cookie de sesión no se serialicen.

## Endpoints genéricos

Todos bajo `/melis/react-api/…`. Doce endpoints genéricos, todos asignados a
`MelisReactApiController`. Cada respuesta es `{ success, data, error? }` (401 cuando el
guard `isAuthenticated()` falla, excepto `/langs`).

| Método + ruta | Acción | Forma de `data` |
| --- | --- | --- |
| `GET /me` | `meAction` | `{ id, name, login, email, picture, isAdmin, capabilities }` — `capabilities` = mapa `melisKey → string[]` de capacidades permitidas (admin ⇒ todo). |
| `GET /menu` | `menuAction` | `NavNode[]` — el árbol de navegación filtrado por derechos. `?full=1` devuelve el árbol **sin filtrar** (solo el editor de derechos; requiere `canAccess('meliscore_tool_user')`). |
| `GET /langs` | `langsAction` | `{ current: { id, locale }, langs: [{ id, locale, short, label }] }` — **público**. |
| `GET /assets` | `assetsAction` | URLs de CSS/JS + variables globales JS en línea para inicializar los iframes de las herramientas (delega en `MelisReactOverride\Service\PlatformAssetsService::build()`). |
| `GET /react-modules` | `reactModulesAction` | `{ data: BrickDef[], bundle: { url } }` — los bricks de los módulos activos; `bundle.url` = el JS concatenado. |
| `GET /bricks-bundle.js` | `bricksBundleAction` | **no es JSON** — la IIFE de cada brick activo concatenada en una única respuesta JavaScript con caché inmutable. |
| `GET /dashboard/bubbles` | `dashboardBubblesAction` | recuentos `{ news, updates, notifications:{count,items}, messages }` (degradan a 0, nunca 404). |
| `GET /dashboard/stats` | `dashboardStatsAction` | `{ kpis:{ users, sites, pages, languages }, activity:[{ id, name, loginDate }] }`. |
| `GET /dashboard/legacy-plugins` | `legacyDashboardPluginsAction` | `[{ pluginName, title, icon, section, w, h }]` — plugins de dashboard legacy como widgets iframe. |
| `GET \| POST /dashboard/layout` | `dashboardLayoutAction` | GET → mosaicos guardados `[{ pluginName, pluginId, x, y, w, h }]`; POST → el mismo JSON, guardado en `melis_core_dashboards`. |
| `GET /rights/dashboard-plugins` | `rightsDashboardPluginsAction` | `[{ key, title, module }]` — lista autoritativa de plugins de dashboard para el editor de derechos (`?userId=`). |
| `GET /rights/capabilities` | `rightsCapabilitiesAction` | mapa `melisKey → árbol de capacidades` **declarado** por los módulos, con las etiquetas `tr_*` traducidas al locale de la sesión. |

**Conjunto de arranque:** `/me`, `/menu`, `/langs`, `/assets`, `/react-modules` (+ `/bricks-bundle.js`).
Los endpoints `/dashboard/*` y `/rights/*` respaldan el dashboard y el editor de Usuarios → Derechos.

Los endpoints de datos propios de una herramienta **no** están aquí: `/melis/react-api/users…`, `/users/stats`,
`/roles` se declaran en **MelisCore**; `/roles-list`, `/roles/save|stats|:id`,
`/workflow/roles` en **MelisSmallBusiness**; las rutas de IA en **MelisAI**. Los clientes que llaman a
este conjunto genérico residen en `melis-core/ui-react/src/lib/melis-api.ts`.

Ejemplo real de fetch — la llamada de arranque `/me` del shell:

```ts
// mirrors melis-core/ui-react/src/lib/melis-api.ts
const res = await fetch('/melis/react-api/me', {
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
  credentials: 'include',
})
const json = await res.json()                    // { success, data, error? }
if (!json.success) throw new Error(json.error)   // 401 → { success:false, error:'Unauthenticated' }
const { name, isAdmin, capabilities } = json.data
// capabilities: Record<melisKey, string[]>
// e.g. { melis_core_announcement_tool: ['list','create','edit'] }
```

## Capacidades — el resolvedor

Esta es la sustancia que MelisReactApi proporciona a *otros* módulos: el sistema de "derechos avanzados"
que restringe los **componentes internos** de una herramienta ya autorizada (list / create /
edit / delete / pestañas anidadas), *subordinado a* la comprobación de acceso a la herramienta
(`MelisCoreRights::canAccess`, sin cambios).

**Declaración (en cada módulo, no aquí).** Un módulo declara, por cada `melisKey` de herramienta, las
capacidades que existen mediante la clave de configuración fusionada `melisReactToolCapabilities`
(`config/react.capabilities.php`, fusionada en su `Module::getConfig()`):

```php
// <module>/config/react.capabilities.php  (declared BY the tool's module)
return [
  'melisReactToolCapabilities' => [
    'melis_core_announcement_tool' => ['list', 'create', 'edit', 'delete'],
    // or a TREE for nested tabs with their own actions:
    // 'some_tool' => ['actions' => ['list'], 'tabs' => [['key' => 'variants', 'actions' => ['list','create']]]],
  ],
];
```

**Resolvedor — `MelisReactApi\Service\Capabilities`** (todo estático; `const CONFIG_KEY =
'melisReactToolCapabilities'`, `const SECTION = 'meliscore_tool_capabilities'`):

| Método | Rol |
| --- | --- |
| `declared($appConfig)` | El mapa declarado en bruto (el editor de derechos lo renderiza). |
| `flatten($node)` | Aplana una lista plana O un árbol `{ actions, tabs }` en cadenas con puntos (por ejemplo, `variants.list`). |
| `deniedFor($rightsXml, $toolKey)` | La lista de denegaciones leída del XML de derechos del usuario/rol. |
| `isAllowed($appConfig, $rightsXml, $toolKey, $cap)` | **Permitido por defecto** — se permite salvo que la capacidad esté a la vez declarada *y* en la lista de denegaciones. |
| `allowedForUser($appConfig, $rightsXml)` | El mapa `melisKey → allowedCaps[]` devuelto en `/me` (`$rightsXml = null`, por ejemplo, admin ⇒ todo). |

**Almacenamiento.** Las denegaciones residen en una sección dedicada del XML de derechos del usuario/rol, separada de
la lista de denegaciones legacy para que el BO clásico la ignore:

```xml
<meliscore_tool_capabilities>
  <tool key="melis_core_announcement_tool"><deny>delete</deny></tool>
</meliscore_tool_capabilities>
```

La preservación de esta sección durante un guardado **legacy** la realizan los módulos concernidos (MelisCore para
USER, MelisSmallBusiness para ROLE).

**Guard — `MelisReactApi\Controller\CapabilityGuardTrait`.** Un controlador de herramienta de cada módulo
hace `use` de este trait, define `const MELIS_KEY = '<el melisKey de la herramienta>'` y llama a
`denyUnlessCan($cap)` **después** de su comprobación de acceso a la herramienta:

```php
use MelisReactApi\Controller\CapabilityGuardTrait;

class MelisReactApiFooController extends MelisAbstractActionController
{
    use CapabilityGuardTrait;
    const MELIS_KEY = 'melis_core_announcement_tool'; // the rights-bearing tool node

    public function saveAction()
    {
        if ($resp = $this->denyUnlessCan('edit')) return $resp;   // 403 JSON if denied
        // …call the module's Laminas service…
    }
}
```

`denyUnlessCan` lee los derechos **efectivos** (`MelisCoreAuth::getAuthRights()` → usuario O
rol), los **admins lo omiten** y es **permitido por defecto**: una herramienta sin declaración conserva el CRUD
completo. Del lado del cliente, el mismo mapa de permisos llega en `/me` `data.capabilities` y restringe la interfaz
(`melis-core/ui-react/src/lib/caps.ts`).

## Integración con el host

- **Descubrimiento / bricks** — `GET /react-modules` escanea los módulos **activos** en busca de
  `public/ui-react/brick.manifest.json` (un único objeto o un array `bricks: [...]`) y
  devuelve `BrickDef = { id, module, route, label, forwardKey, melisKey, subTabs, persistent,
  bundleUrl }`, más `bundle.url = /melis/react-api/bricks-bundle.js?v=<sig>`. El shell carga
  el único bundle concatenado (cada brick es una IIFE que se autorregistra por id en
  `window.__MELIS_BRICK_COMPONENTS__` mediante `window.__melisRegisterBrick`, envuelta en
  try/catch). La firma `?v=` (nombre+mtime+tamaño de cada bundle) hace segura una caché inmutable
  de 1 año. Un brick existe **si y solo si** su módulo está activo — la regla de modularidad.
- **Constructor del menú (`GET /menu`)** — recorre la interfaz del menú izquierdo, aplica el orden de
  secciones/herramientas y emite `NavNode[]` donde cada nodo es `{ key, name, icon, melisKey, isTool,
  forward, hasNavChild, configChildCount, children }`. Una **sección** de nivel superior es un contenedor
  (se poda solo si está vacía); una sección `is_parent_tool` clicable se restringe mediante
  `canAccess(target)`; las secciones desconocidas recién instaladas usan derechos permisivos para permanecer
  visibles. Dos hooks la extienden: `melisReactSidebarHostSections` (mantiene una sección vacía como
  contenedor host de barra lateral desnudo que lleva `sidebarModule`) y `melisReactRightsTools` (inyecta
  nodos de herramienta sintéticos solo de derechos, únicamente con `?full=1`).
- **Puente de autenticación / assets** — `/assets` devuelve el mismo CSS/JS que carga el `layoutCore.phtml`
  legacy (delegado a `MelisReactOverride\Service\PlatformAssetsService`), de modo que los iframes de las herramientas
  se inicializan de forma idéntica dentro del shell React.
- **i18n** — las etiquetas `tr_*` (nombres de secciones de menú, etiquetas de pestañas de capacidades) se traducen al
  locale de sesión actual (contenedor `meliscore` `melis-lang-locale`) mediante
  `MelisCoreTranslation`; los módulos declaran **claves**, nunca texto codificado de forma fija.

## Archivos clave

| Aspecto | Ruta |
| --- | --- |
| Manifiesto del módulo / autoloader | `melis-react-api/src/Module.php` |
| Rutas + controlador invocable | `melis-react-api/config/module.config.php` |
| Acciones genéricas (12) | `melis-react-api/src/Controller/MelisReactApiController.php` |
| Trait guard de capacidades | `melis-react-api/src/Controller/CapabilityGuardTrait.php` |
| Resolvedor de capacidades | `melis-react-api/src/Service/Capabilities.php` |

Véase también: [melis-core](/es/reference/modules/melis-core) ·
[melis-small-business](/es/reference/modules/melis-small-business) ·
[melis-ai](/es/reference/modules/melis-ai)
