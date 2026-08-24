# MelisDashboardPluginCreator

> Un asistente paso a paso que genera un nuevo **plugin de panel** (widget) del back-office dentro de un módulo nuevo o existente, ahora entregado como un componente React nativo. Paquete `melisplatform/melis-dashboard-plugin-creator`.

## Propósito

MelisDashboardPluginCreator es un **asistente de generación de código**: un asistente de 5 pasos que genera un widget de panel listo para usar —su controlador, vista, configuración, recursos y traducciones— y lo integra en el módulo de destino. Eliges un widget de **una sola pestaña** o de **varias pestañas**, un destino (crear un módulo completamente nuevo o ampliar uno existente), títulos/descripciones por idioma, un icono y una miniatura; la herramienta escribe entonces los archivos y (opcionalmente) activa el plugin.

El widget generado extiende `MelisCore\Controller\DashboardPlugins\MelisCoreDashboardTemplatingPlugin` y se declara bajo la interfaz `melis_dashboardplugin`, de modo que aparece en el panel del back-office. El módulo depende de `melis-core` y `melis-tool-creator` (este último se reutiliza para generar el nuevo módulo). Para los conceptos que hay detrás de los plugins de panel, consulta [Plugins](/legacy/guide/plugins); para las herramientas del back-office en general, consulta [Crear una herramienta](/legacy/guide/create-a-tool).

## Activarlo

Es un módulo Laminas estándar. Añádelo a `config/melis.module.load.php`:

```php
return [
    // …
    'MelisDashboardPluginCreator',
];
```

Instálalo mediante Composer (`composer require melisplatform/melis-dashboard-plugin-creator`); `melis-core` y `melis-tool-creator` se incorporan automáticamente. No se requiere base de datos.

La herramienta escribe archivos en disco, por lo que los siguientes deben tener **permisos de escritura** para el servidor web (se comprueba en tiempo de ejecución y se expone al asistente como `context.blocking[]`): `config/melis.module.load.php`, el directorio `module/` y la ruta de miniaturas temporales `<DOCUMENT_ROOT>/dpc/temp-thumbnail/` (configurada en `config/app.tools.php` bajo `melisdashboardplugincreator/datas/plugin_thumbnail/path`).

## Back-office React

En el back-office React (`/melis-react`), la herramienta se entrega como un **componente React nativo completo** —un verdadero asistente React que llama a una `react-api` JSON, con un conmutador **New / Old** que recurre a la herramienta jQuery heredada dentro de un iframe. Todo el trabajo real permanece en el servidor: la validación reutiliza los formularios Laminas heredados y la generación llama a `MelisDashboardPluginCreatorService`. React es presentación más llamadas a la API.

| Elemento | Valor |
| --- | --- |
| Tipo de componente | React nativo completo (asistente de 5 pasos, con un respaldo New/Old mediante iframe heredado) |
| ID del componente | `dashboard-plugin-creator` |
| `route` del manifiesto | `/melis-core/dashboard-plugin-creator` (montaje de respaldo) |
| `label` | `Dashboard Plugin Creator` |
| `forwardKey` | `MelisDashboardPluginCreator/DashboardPluginCreator` |
| `melisKey` | `melisdashboardplugincreator_tool` |
| `subTabs` / `persistent` | `false` / `true` |
| Base de la API | `/melis/react-api/dpc` |

El componente se descubre mediante `GET /melis/react-api/react-modules` y aparece **solo si el módulo está activo** en `config/melis.module.load.php`. Es `persistent`: el asistente se monta una sola vez y sus 5 pasos son paneles mostrados/ocultos con CSS, de modo que salir de la pestaña de la herramienta y volver no pierde ni el borrador ni el paso actual. Un botón **Restart** (barra de herramientas superior) borra el borrador de la sesión y la miniatura temporal. Cambiar el conmutador **New / Old** a *Old* renderiza el controlador heredado en un iframe (`/melis/react-tool-page?key=melisdashboardplugincreator_tool`) y restablece el borrador compartido de la sesión; el asistente advierte antes si existe un borrador.

## El asistente de 5 pasos

| Paso | Componente React | Qué haces |
| --- | --- | --- |
| 1 — Plugin | `Step1Plugin` | **Nombre del plugin**, **Tipo de vista** (Una sola pestaña / Varias pestañas, 2–25 pestañas), **Destino del plugin** (nuevo módulo + nombre, o menú desplegable de módulo existente). |
| 2 — Textos del menú y presentación | `Step2Menu` | **Título del plugin** + **Descripción** por idioma (barra de pestañas de idiomas, al menos uno obligatorio); sube la **miniatura del plugin** obligatoria (GIF/JPG/PNG, ~190×100, ≤500 kB). |
| 3 — Textos del panel y presentación | `Step3Dashboard` | **Título de la tarjeta** por idioma, elige el **icono del plugin** de una cuadrícula; los plugins de varias pestañas eligen **un icono por pestaña**. |
| 4 — Resumen | `Step4Summary` | Recapitulación de solo lectura de los pasos 1→3 + módulo de destino (obtenido de `/dpc/summary`); no se escribe nada. |
| 5 — Finalización | `Step5Finalize` | Conmutador **Activar el plugin tras la creación** (activado por defecto) + **Finalizar y crear el plugin** → generación; al activarlo, una cuenta atrás recarga la plataforma. |

El paso 5 es la **única operación que modifica datos**. Las reglas de negocio (palabra clave PHP reservada, el módulo ya existe, el nombre/título del plugin ya está en uso) se validan en el servidor contra los formularios Laminas heredados; los componentes React solo renderizan los mensajes por campo devueltos.

![Paso 1 — Plugin: nombre, Tipo de vista (Una sola pestaña / Varias pestañas) y Destino del plugin (módulo Nuevo / Existente)](/screenshots/react/melis-dashboard-plugin-creator/melisdashboardcreator-tool-step1.png)

![Paso 2 — Textos del menú y presentación: título/descripción por idioma (English / Français) más la miniatura del plugin obligatoria con vista previa y Remove](/screenshots/react/melis-dashboard-plugin-creator/melisdashboardcreator-tool-step2.png)

![Paso 3 — Textos del panel y presentación: título de la tarjeta por idioma y la cuadrícula de iconos del plugin (Calendar seleccionado); los plugins de varias pestañas añaden una cuadrícula de iconos por pestaña](/screenshots/react/melis-dashboard-plugin-creator/melisdashboardcreator-tool-step3.png)

![Paso 4 — Resumen: recapitulación de solo lectura de Plugin / Módulo de destino / Tipo, la miniatura, los textos del menú, los títulos del panel y el icono antes de generar](/screenshots/react/melis-dashboard-plugin-creator/melisdashboardcreator-tool-step4.png)

![Paso 5 — Finalización: el conmutador "Activate plugin after creation" y el botón "Finish and create the plugin" que ejecuta la generación](/screenshots/react/melis-dashboard-plugin-creator/melisdashboardcreator-tool-step5.png)

## API React

Las rutas residen en `config/react-api.php`, servidas por `MelisReactApiDashboardPluginCreatorController`. Todas bajo `/melis/react-api/dpc`, con el contrato `{ success, data, error }`. Un fallo de validación **no** es un error HTTP: `POST /dpc/step/:step` devuelve `{ success:true, data:{ valid:false, errors:{…} } }` para que la interfaz pueda mostrar los mensajes por campo.

| Método y URL | Propósito |
| --- | --- |
| `GET /dpc/context` | Comprobación previa (FS con permisos de escritura → `blocking[]`), metadatos de los pasos, idiomas, módulos existentes, iconos, mín./máx. de pestañas, límites de la miniatura |
| `GET /dpc/state` | Estado actual del asistente desde la sesión compartida (restaura la interfaz) |
| `POST /dpc/reset` | Reinicio: borra el borrador de la sesión + la miniatura temporal |
| `POST /dpc/step/:step` (`1`–`3`) | Valida + persiste un paso → `{ valid, errors }` |
| `POST /dpc/thumbnail` | Subida multipart de la miniatura del plugin |
| `POST /dpc/thumbnail/remove` | Elimina la miniatura |
| `GET /dpc/summary` | Recapitulación de solo lectura de los pasos 1→3 + módulo de destino |
| `POST /dpc/generate` | **Genera el plugin** → `{ generated, module, plugin, restartRequired, notices }` |

```ts
const BASE = '/melis/react-api/dpc'

// validate + save step 1
await postJson('/step/1', {
  dpc_plugin_name: 'SalesOverview', dpc_plugin_type: 'single',
  dpc_plugin_destination: 'new_module', dpc_new_module_name: 'MyDashboards',
}) // → { valid: true, errors: {} }

// generate (step 5) — the ONLY mutating call
await postJson('/generate', { dpc_activate_plugin: true })
// → { generated:true, module:'MyDashboards', plugin:'SalesOverview', restartRequired:true }
```

El controlador no reimplementa la lógica de la herramienta: la validación reconstruye los formularios Laminas heredados a partir de `config/app.tools.php` (`getFormMergedAndOrdered`), y el estado se escribe en el **mismo contenedor de sesión** que la herramienta heredada (`dashboardplugincreator`), que el servicio lee en su constructor.

## Capacidades

Declaradas en `config/react.capabilities.php` bajo el nodo portador de derechos `melisdashboardplugincreator_tool`. La semántica es de **permitir por defecto** (una capacidad no declarada se permite, por lo que los roles heredados siguen funcionando). Cadenas de capacidad aplanadas:

| Pestaña | Acciones | Restricciones |
| --- | --- | --- |
| `wizard` | `edit` | Configurar/guardar los pasos 1→3 (sin `wizard.edit` todo el asistente es de solo lectura) |
| `thumbnail` | `create`, `delete` | Subir / eliminar la miniatura (paso 2) |
| `summary` | `list` | Leer el resumen (paso 4) |
| `finalization` | `create` | **Generar** el plugin (paso 5) — la capacidad sensible |

Cada acción del controlador está protegida dos veces: primero el acceso (`denyUnlessAccess`) y luego la capacidad correspondiente (`denyUnlessCan('finalization.create')`). Ocultar controles en React es solo cuestión de experiencia de usuario; el servidor rechaza de todos modos.

## Servicios clave

Registrados en `config/module.config.php` y con alias:

| Alias del servicio | Función |
| --- | --- |
| `MelisDashboardPluginCreatorService` | Genera el plugin de panel a partir de los datos guardados en la sesión del asistente. |

`MelisDashboardPluginCreatorService` extiende `MelisCore\Service\MelisGeneralService`. Métodos destacables:

- `generateDashboardPlugin()` — el punto de entrada: lee los pasos de la sesión, resuelve el nombre del módulo/plugin de destino y luego ejecuta `performGeneration()`, revirtiendo en caso de fallo (`rollbackPluginGeneration()`). Dispara los eventos `melisdashboard_plugin_creator_service_generate_dashboard_plugin_start/end`.
- Pasos internos de generación: `generateDashboardPluginConfig()` (escribe `config/dashboard-plugins/<Plugin>Plugin.config.php`), `generateDashboardPluginController()`, `generateDashboardPluginView()` (plantilla de una sola pestaña o de varias), `generateDashboardPluginAssets()` (CSS/JS + copia la miniatura), `setTranslations()` (claves de menú/título por idioma), `updateModuleConfig()` (inyecta `template_map` + `controller_plugins`) y `updateModuleFile()` (añade el `include` de la configuración a `Module.php`).
- Auxiliares: `getModuleExistingPlugins()` / `getExistingTranslatedPluginTitle()` (comprobaciones de nombre duplicado), `getTempThumbnail()`, `generateFile()`, `generateModuleNameCase()`, `removeDir()`.

Cuando el destino es un **módulo nuevo**, la generación delega la creación del módulo en `melis-tool-creator` (`MelisToolCreatorService::createTool()` con una herramienta `blank`), luego lo activa (`ModulesService::activateModule()`) e invalida las cachés de rutas de módulos y del menú del panel. La activación requiere recargar la plataforma.

## Front office

Este módulo no tiene plugins de templating de front-office ni view helpers: es una herramienta exclusiva del back-office. (Los widgets que *genera*, sin embargo, sí son plugins de panel del back-office.)

## Tablas de base de datos

MelisDashboardPluginCreator no define **ninguna tabla propia**: no incluye SQL de instalación ni delta de dbdeploy. Todo el estado se mantiene en la sesión del asistente; la salida se escribe directamente en los archivos del módulo de destino.

## Ejemplo

Dispara la generación a partir de los datos ya almacenados en la sesión del asistente (esto es lo que hace el paso 5 / `POST /dpc/generate` entre bastidores):

```php
/** @var \MelisDashboardPluginCreator\Service\MelisDashboardPluginCreatorService $dpc */
$dpc = $serviceManager->get('MelisDashboardPluginCreatorService');

$success = $dpc->generateDashboardPlugin(); // true on success, false (and rolled back) on failure
```

El widget generado sigue la plantilla de `template/DashboardPluginController.php` —una clase que extiende `MelisCoreDashboardTemplatingPlugin` con una acción que devuelve un `ViewModel`:

```php
class MyModuleMyWidgetPlugin extends MelisCoreDashboardTemplatingPlugin
{
    public function __construct()
    {
        $this->pluginModule = 'mymodule';
        parent::__construct();
    }

    public function myWidget()
    {
        $view = new ViewModel();
        $view->setTemplate('my-module/dashboard-plugins/my-widget');
        return $view;
    }
}
```

## Archivos clave

| Aspecto | Ruta |
| --- | --- |
| Manifiesto del módulo | `vendor/melisplatform/melis-dashboard-plugin-creator/composer.json` |
| Rutas / servicio / controlador / formulario | `vendor/melisplatform/melis-dashboard-plugin-creator/config/module.config.php` |
| Rutas de la API React | `vendor/melisplatform/melis-dashboard-plugin-creator/config/react-api.php` |
| Capacidades React | `vendor/melisplatform/melis-dashboard-plugin-creator/config/react.capabilities.php` |
| Pasos del asistente, formularios, iconos, configuración de miniatura | `vendor/melisplatform/melis-dashboard-plugin-creator/config/app.tools.php` |
| Servicio de generación | `vendor/melisplatform/melis-dashboard-plugin-creator/src/Service/MelisDashboardPluginCreatorService.php` |
| Controlador de la API React | `vendor/melisplatform/melis-dashboard-plugin-creator/src/Controller/MelisReactApiDashboardPluginCreatorController.php` |
| Controlador heredado del asistente (vista Old) | `vendor/melisplatform/melis-dashboard-plugin-creator/src/Controller/DashboardPluginCreatorController.php` |
| Fuente del componente React | `vendor/melisplatform/melis-dashboard-plugin-creator/ui-react/src/` |
| Componente compilado + manifiesto | `vendor/melisplatform/melis-dashboard-plugin-creator/public/ui-react/` |
| Plantillas del plugin generado | `vendor/melisplatform/melis-dashboard-plugin-creator/template/` |

::: tip Relacionado
Este es el equivalente para el panel de `melis-templating-plugin-creator` (plugins de templating de front-office). Para entender los artefactos que genera, lee [Plugins](/legacy/guide/plugins).
:::
