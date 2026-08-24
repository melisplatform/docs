# MelisTemplatingPluginCreator

> Un asistente del back-office que genera un **plugin de templating** completo para el front-office —
> configuración, controlador, vista, formulario modal, recursos y traducciones— en un módulo nuevo o
> existente. En v6 se distribuye como un brick React nativo que llama a una `react-api` JSON, con un
> conmutador New/Old hacia la herramienta heredada. Paquete `melisplatform/melis-templating-plugin-creator`.

## Propósito

MelisTemplatingPluginCreator es un generador de código, no una funcionalidad de tiempo de ejecución.
Te guía a través de un **asistente de 6 pasos** —nombre del plugin, módulo de destino, textos de menú
localizados, propiedades (campos), traducciones— y luego escribe un plugin de templating listo para
usar en el módulo de destino. El plugin generado extiende
`MelisEngine\Controller\Plugin\MelisTemplatingPlugin`, por lo que una vez creado se comporta como
cualquier plugin de templating escrito a mano —lee [Plugins](/es/guide/plugins) para comprender y
personalizar el resultado.

## Activarlo

Es un módulo Laminas estándar. Añádelo a `config/melis.module.load.php`:

```php
return [
    // …
    'MelisTemplatingPluginCreator',
];
```

Dependencias de Composer (`composer.json`): `melis-core`, `melis-tool-creator`, `melis-cms`. Cuando
el destino es un módulo **nuevo**, la herramienta delega en `MelisToolCreatorService::createTool()`
para generar primero el módulo. No se requiere base de datos, pero el directorio `module/` y una
carpeta `tpc/temp-thumbnail/` bajo la raíz de documentos públicos deben tener permisos de escritura
(también se necesita la extensión GD para la validación de miniaturas). El brick React muestra estos
requisitos como avisos de preflight **bloqueantes** cuando el sistema de archivos no permite
escritura o falta GD.

## El back-office React

El asistente es un **brick React nativo completo** (no un iframe) montado en `/melis-react`. Se abre
como una pestaña superior llamada **Templating Plugin Creator** con una barra de 6 pasos y un
conmutador **New / Old** (arriba a la derecha, junto a **Restart**). *Old* recurre a la herramienta
jQuery heredada dentro de un iframe; *New* (por defecto) es el asistente React. El brick es
`persistent`: salir de la pestaña de la herramienta y volver no pierde ni el borrador ni el paso
actual. Los 6 pasos son paneles mostrados/ocultos mediante CSS en una única página montada.

![Paso 1 (Plugin) del asistente React: nombre del plugin, destino del plugin (New module / Existing site module) con un campo de nombre de nuevo módulo, la barra de 6 pasos y el botón Next](/screenshots/react/melis-templating-plugin-creator/melistemplatingplugincreator-tool-step1.png)

Toda la lógica de negocio permanece en el lado del servidor: la validación reconstruye los formularios
Laminas heredados (mismos validadores, mensajes y reglas) y la generación llama a
`MelisTemplatingPluginCreatorService`. React se ocupa de la presentación y las llamadas a la API.

### Los 6 pasos

| Paso | Nombre | Qué haces |
| --- | --- | --- |
| 1 | Plugin | Nombre del plugin + destino: **New module** (revela un campo de nombre de nuevo módulo) o **Existing site module** (desplegable de módulos). |
| 2 | Menu Texts & Display | Título/descripción por idioma mostrados en la lista de plugins del editor de páginas (≥1 idioma) + carga obligatoria de miniatura (GIF/JPG/PNG, ~190×100, ≤500 kB). |
| 3 | Main Properties | Número de propiedades (1–25, `template_path` incluida); por campo un nombre técnico, tipo de visualización, indicador de obligatorio y valor por defecto. La propiedad 1 es la `template_path` impuesta y de solo lectura. |
| 4 | Properties' Translation | Etiqueta + tooltip por idioma para cada campo (además de una etiqueta por opción de Dropdown); basta con un idioma completo. |
| 5 | Summary | Resumen de solo lectura de los pasos 1→4, módulo de destino y ruta de plantilla calculada. Aquí no se escribe nada. |
| 6 | Finalization | Opcionalmente elige un **Site** en el que activar y alterna **Activate plugin after creation**, luego **Finish and create the plugin**. |

`template_path` es siempre la primera propiedad impuesta, calculada en el servidor como
`<Module>/plugins/<plugin-view-name>` y nunca enviada por el cliente. **El paso 6 es la única
operación que muta datos**: escribe los archivos del plugin y —para la rama de nuevo módulo— genera
el módulo, opcionalmente lo registra en el `module.load.php` del sitio elegido, lo activa e invalida
la caché de rutas de módulos (la activación requiere una recarga de la plataforma, mostrada como una
cuenta atrás). Los tipos de visualización disponibles incluyen `MelisText`, `Dropdown`, `DatePicker`,
`DateTimePicker`, `PageInput`, `NumericInput`, `Switch`, `Textarea`, `MelisCoreTinyMCE`.

![Paso 2 (Menu Texts & Display): título y descripción por idioma (English / Français) más la tarjeta obligatoria de miniatura del plugin con vista previa y Remove thumbnail](/screenshots/react/melis-templating-plugin-creator/melistemplatingplugincreator-tool-step2.png)

![Paso 3 (Main Properties): número de propiedades (1–25) y la propiedad 1, la template_path impuesta de solo lectura con su valor por defecto calculado en el servidor](/screenshots/react/melis-templating-plugin-creator/melistemplatingplugincreator-tool-step3.png)

![Paso 6 (Finalization): el desplegable Site, el conmutador Activate plugin after creation y el botón Finish and create the plugin](/screenshots/react/melis-templating-plugin-creator/melistemplatingplugincreator-tool-step6.png)

## API React

Las rutas residen en `config/react-api.php`, servidas por
`MelisReactApiTemplatingPluginCreatorController`, todas bajo `/melis/react-api/tpc`, con el contrato
`{ success, data, error }`. Un fallo de validación **no** es un error HTTP: `POST /tpc/step/:step`
devuelve `{ valid:false, errors:{…} }` para que la interfaz pueda mostrar mensajes por campo.

| Método y URL | Propósito |
| --- | --- |
| `GET /tpc/context` | Preflight (comprobaciones de escritura del FS + GD → `blocking[]`), metadatos de pasos, idiomas, módulos de sitio, sitios, tipos de visualización, `maxFields` (25), límites de miniatura. |
| `GET /tpc/state` | Restaura el asistente desde la sesión compartida. |
| `POST /tpc/reset` | Reinicio: limpia el borrador de la sesión + la miniatura temporal. |
| `POST /tpc/step/:step` (`1–4`) | Valida + persiste un paso → `{ valid, errors }`. |
| `POST /tpc/thumbnail` · `POST /tpc/thumbnail/remove` | Sube / elimina la miniatura del plugin. |
| `GET /tpc/translation-fields` | Campos a traducir (derivados del paso 3). |
| `GET /tpc/summary` | Resumen de solo lectura de los pasos 1→4 + módulo de destino + ruta de plantilla. |
| `POST /tpc/generate` | **Genera el plugin** (escribe archivos, opcionalmente genera + activa un módulo). |

## Capacidades (derechos avanzados)

Declaradas en `config/react.capabilities.php` bajo la melisKey portadora de derechos
`melistemplatingplugincreator_tool` (la misma clave usada por el manifiesto y el guard de acceso del
controlador). La semántica es de **permiso por defecto** (default-allow). Cadenas de capacidad
aplanadas:

| Capacidad | Controla |
| --- | --- |
| `wizard` · `wizard.edit` | Configurar/validar los pasos 1→4 (sin `wizard.edit` todo el asistente es de solo lectura). |
| `thumbnail` · `thumbnail.create` · `thumbnail.delete` | Subir / eliminar la miniatura (paso 2). |
| `summary` · `summary.list` | Leer el resumen (paso 5). |
| `finalization` · `finalization.create` | **Generar el plugin** (paso 6) — la capacidad sensible. |

Cada acción del controlador está protegida dos veces —`denyUnlessAccess()` (autenticación +
`canAccess`) y luego `denyUnlessCan(cap)`. Ocultar controles en la interfaz es solo cuestión de UX;
el servidor los rechaza de todos modos.

## Servicios clave

Registrado como un alias de `service_manager` en `config/module.config.php`.

| Alias | Función |
| --- | --- |
| `MelisTemplatingPluginCreatorService` | Genera (y revierte) el plugin de templating a partir de los datos del asistente guardados en la sesión. |

`MelisTemplatingPluginCreatorService` (extiende `MelisCore\Service\MelisGeneralService`) expone
notablemente:

| Método | Función |
| --- | --- |
| `generateTemplatingPlugin()` | Punto de entrada: lee los pasos de la sesión y escribe todos los archivos del plugin; revierte ante cualquier fallo. Devuelve un booleano. |
| `getSiteTemplatingPluginNames($siteModule)` | Lista los nombres de plugins de templating existentes de un módulo de sitio (usado para rechazar nombres de plugin duplicados). |
| `generateModuleNameCase($str)` / `convertToViewName($string)` | Normaliza un nombre a un nombre de módulo válido / nombre de directorio de vista. |
| `getTempThumbnail()` | Resuelve la ruta temporal de la miniatura del plugin subida para la sesión actual. |

Internamente `generateTemplatingPlugin()` ejecuta `performGeneration()`, que escribe la configuración
del plugin (`config/plugins/<Module><Plugin>Plugin.config.php`), actualiza el `module.config.php` de
destino (`template_map` + `controller_plugins`), añade traducciones por idioma, genera recursos
(css/js + miniatura), el controlador (`src/<Module>/Controller/Plugin/<Module><Plugin>Plugin.php`),
la vista del front y el formulario modal, e incluye la nueva configuración desde el `Module.php` del
módulo. El controlador React escribe su estado del asistente en el **mismo contenedor de sesión** que
la herramienta heredada (`templatingplugincreator`), porque el servicio toma una instantánea de él en
su constructor.

## Front office

Este módulo **no** añade ningún plugin de front-office ni view helper propio en tiempo de ejecución.
En su lugar, **genera** un plugin de templating en el módulo de destino: una clase de
controller-plugin que extiende `MelisEngine\Controller\Plugin\MelisTemplatingPlugin` con
`loadDbXmlToPluginConfig()` / `savePluginConfigToXml()` conectados a los campos configurados, un
`config/plugins/*.config.php` (secciones `front` + `melis`, una pestaña **Properties**), un `.phtml`
del front, un `.phtml` de formulario modal y recursos css/js. El plugin generado aparece luego en el
menú de plugins del editor de páginas del CMS y se arrastra a una `MelisDragDropZone` como cualquier
otro plugin de templating —consulta [Plugins](/es/guide/plugins) y
[Construir un sitio](/es/guide/build-a-site).

## Tablas de base de datos

Ninguna. Esta herramienta genera únicamente archivos fuente y almacena su estado de asistente en curso
en un contenedor de sesión Laminas (`templatingplugincreator`); no se instala ninguna tabla `melis_*`.

## Ejemplo

El plugin generado se consume como cualquier plugin de templating. Desde el lado del servicio, el paso
final del asistente llama a:

```php
$tpcService = $serviceManager->get('MelisTemplatingPluginCreatorService');
$result = $tpcService->generateTemplatingPlugin(); // true on success, files written to the target module
```

## Archivos clave

| Aspecto | Ruta |
| --- | --- |
| Módulo / carga de configuración | `vendor/melisplatform/melis-templating-plugin-creator/src/Module.php` |
| Conexiones (servicio, elementos de formulario, vistas) | `vendor/melisplatform/melis-templating-plugin-creator/config/module.config.php` |
| Rutas de la API React + invokable | `vendor/melisplatform/melis-templating-plugin-creator/config/react-api.php` |
| Capacidades React | `vendor/melisplatform/melis-templating-plugin-creator/config/react.capabilities.php` |
| Formularios del asistente + configuración de pasos (reutilizados para validación) | `vendor/melisplatform/melis-templating-plugin-creator/config/app.tools.php` |
| Controlador de la API React | `vendor/melisplatform/melis-templating-plugin-creator/src/Controller/MelisReactApiTemplatingPluginCreatorController.php` |
| Controlador del asistente heredado (iframe de la vista Old) | `vendor/melisplatform/melis-templating-plugin-creator/src/Controller/TemplatingPluginCreatorController.php` |
| Servicio generador | `vendor/melisplatform/melis-templating-plugin-creator/src/Service/MelisTemplatingPluginCreatorService.php` |
| Brick React (fuente + compilado) | `vendor/melisplatform/melis-templating-plugin-creator/ui-react/` · `public/ui-react/` |

Consulta también: [Referencia de módulos](/es/reference/modules) · [Plugins](/es/guide/plugins) ·
[Crear una herramienta](/es/guide/create-a-tool) · [Construir un sitio](/es/guide/build-a-site).
