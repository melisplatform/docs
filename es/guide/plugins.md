# Plugins: templating y dashboard

Melis tiene dos tipos de plugins, y son cosas distintas:

- **Plugins de templating** — **bloques de contenido** reutilizables que se colocan en el
  `MelisDragDropZone` de una página en el **front office** (un slider, una lista de productos, un
  formulario de contacto).
- **Plugins de dashboard** — **widgets** que se muestran en el dashboard del **back office**.

Ambos disponen de un asistente de generación con interfaz gráfica (`melis-templating-plugin-creator`,
`melis-dashboard-plugin-creator`) — úsalo para generar el código base y, a continuación, sigue
leyendo para entenderlo y personalizarlo. En Melis v6 estos generadores son **asistentes nativos de
React** en el back office `/melis-react` (cada uno conserva un conmutador **New / Old** hacia la
herramienta clásica en un iframe). El framework, el conjunto de módulos y el PHP generado no cambian:
solo la interfaz con la que los manejas es ahora React.

## Plugins de templating (front office)

Un plugin de templating extiende
`MelisEngine\Controller\Plugin\MelisTemplatingPlugin` e implementa:

| Método | Función |
| --- | --- |
| `front()` *(obligatorio)* | Devuelve el **array de variables** que se pasan al `.phtml` de front del plugin. |
| `back()` | Renderiza la vista previa + el editor del back office (se proporciona un valor por defecto razonable). |
| `createOptionsForms()` | Construye las **pestañas** del formulario del back office a partir de la configuración del plugin. |
| `loadDbXmlToPluginConfig()` / `savePluginConfigToXml($params)` | Decodifican/codifican los parámetros guardados del plugin (almacenados como XML dentro del contenido de la página). |

El constructor enlaza el plugin con su configuración:

```php
use MelisEngine\Controller\Plugin\MelisTemplatingPlugin;

class MyBlockPlugin extends MelisTemplatingPlugin
{
    public function __construct($updatesPluginConfig = [])
    {
        $this->configPluginKey = 'mymodule';      // key in the plugin config file
        $this->pluginXmlDbKey  = 'myBlock';       // XML element name saved in the page
        parent::__construct($updatesPluginConfig);
    }

    public function front()
    {
        $id = $this->pluginFrontConfig['someParam'] ?? null;
        // … fetch data via a service …
        return ['pluginId' => $this->pluginFrontConfig['id'], 'items' => $items];
    }
}
```

### El archivo de configuración del plugin

Cada plugin incluye un `config/plugins/<Name>.config.php` con una sección **`front`** (configuración
de renderizado: `template_path`, un `id`, parámetros personalizados, css/js) y una sección **`melis`**
(interfaz del back office: nombre, miniatura y las pestañas/campos de `modal_form`). Referencia:
`vendor/melisplatform/melis-cms-slider/config/plugins/MelisCmsSliderShowSliderPlugin.config.php`.

Registra el plugin como controller plugin en `module.config.php`:

```php
'controller_plugins' => ['invokables' => [
    'MyBlockPlugin' => \MyModule\Controller\Plugin\MyBlockPlugin::class,
]],
```

### Cómo llega a una página

Un editor arrastra el plugin a un `MelisDragDropZone` (véase [Crear un sitio](./build-a-site)). Los
parámetros configurados se serializan como XML en el contenido de la página; al renderizar, el motor
de front llama al método `front()` del plugin y renderiza su `.phtml`. `MelisCmsSlider` y
`MelisCmsNews` son los ejemplos canónicos.

### Estructura mínima

```
MyModule/
├── config/plugins/MyBlockPlugin.config.php
├── src/Controller/Plugin/MyBlockPlugin.php
└── view/my-module/my-block.phtml             # front template
    view/my-module/my-block/melis/form.phtml  # back-office form
```

### Generarlo en /melis-react

Abre **Templating Plugin Creator** desde su entrada en el menú de la izquierda: se abre como una
pestaña superior con una **barra de 6 pasos** y el conmutador **New / Old** en la esquina superior
derecha (junto a **Restart**). La vista New es un asistente React real; el conjunto es `persistent`,
por lo que puedes salir de la pestaña y volver sin perder el paso ni los datos introducidos. (Todo el
trabajo real permanece en el servidor: la validación reutiliza los formularios Laminas clásicos y la
generación llama a `MelisTemplatingPluginCreatorService`, que escribe los mismos archivos
PHP/vista/config/idioma que antes.)

![Templating Plugin Creator — Paso 1 (nombre del plugin + destino)](/screenshots/react/melis-templating-plugin-creator/melistemplatingplugincreator-tool-step1.png)

Los seis pasos:

1. **Plugin** — nombre del plugin + destino (**New module**, o un **Existing site module** que eliges
   en un desplegable). El servidor calcula a partir de esto el `template_path` impuesto.
2. **Menu Texts & Display** — título/descripción por idioma que se muestran en la lista de plugins del
   editor de páginas, más la miniatura obligatoria (GIF/JPG/PNG, ~190×100, ≤500 kB).
3. **Main Properties** — los campos editables del plugin (1–25, `template_path` incluido). El campo 1
   es el `template_path` bloqueado; los campos 2..N reciben cada uno un nombre técnico, un tipo de
   visualización (text, Dropdown, DatePicker, NumericInput, Switch, Textarea, texto enriquecido…), un
   indicador de obligatoriedad y un valor por defecto.
4. **Properties' Translation** — una etiqueta + un tooltip por propiedad y por idioma (más una etiqueta
   por opción de Dropdown).
5. **Summary** — un resumen de solo lectura de todo lo anterior; aquí no se escribe nada.
6. **Finalization** — elige un **Site** en el que activar (opcional), deja marcado **Activate plugin
   after creation** y luego pulsa **Finish and create the plugin**. La activación provoca una recarga
   de la plataforma (el asistente hace una cuenta atrás y recarga).

![Templating Plugin Creator — Paso 6 (Finalización)](/screenshots/react/melis-templating-plugin-creator/melistemplatingplugincreator-tool-step6.png)

> **Conmutador New / Old.** *New* es el asistente React (por defecto); *Old* renderiza la herramienta
> jQuery clásica en un iframe. Cambiar a *Old* reinicia el borrador de sesión compartido, por lo que
> el asistente te avisa primero.

## Plugins de dashboard (back office)

Un widget de dashboard extiende
`MelisCore\Controller\DashboardPlugins\MelisCoreDashboardTemplatingPlugin`. Define su módulo en el
constructor y expone un método de acción que devuelve un `ViewModel` con `setTemplate()`:

```php
use MelisCore\Controller\DashboardPlugins\MelisCoreDashboardTemplatingPlugin;
use Laminas\View\Model\ViewModel;

class MyWidgetPlugin extends MelisCoreDashboardTemplatingPlugin
{
    public function __construct()
    {
        $this->pluginModule = 'mymodule';
        parent::__construct();
    }

    public function mywidget()   // the action referenced by the plugin config
    {
        $view = new ViewModel();
        $view->setTemplate('my-module/dashboard-plugin/my-widget');
        return $view;
    }
}
```

El widget se declara bajo la interfaz `melis_dashboardplugin` (nombre, icono, miniatura, `width`/`height`
de la cuadrícula y un `forward` a `module` / `plugin` / `function`), y se registra en
`module.config.php` bajo `controller_plugins`. Referencia:
`vendor/melisplatform/melis-core/src/Controller/DashboardPlugins/MelisCoreDashboardBubbleNewsMelisPlugin.php`.

### Estructura mínima

```
MyModule/
├── config/module.config.php                 # declares the dashboard plugin + registers it
├── src/Controller/DashboardPlugins/MyWidgetPlugin.php
└── view/my-module/dashboard-plugin/my-widget.phtml
```

### Generarlo en /melis-react

Abre **Dashboard Plugin Creator** desde su entrada en el menú de la izquierda: una pestaña superior
con una **barra de 5 pasos** y el mismo conmutador **New / Old**. Al igual que su equivalente de
templating, es un asistente React `persistent` respaldado por `MelisDashboardPluginCreatorService`,
por lo que el PHP generado es idéntico al que produce la herramienta clásica.

![Dashboard Plugin Creator — Paso 1 (nombre, tipo de vista, destino)](/screenshots/react/melis-dashboard-plugin-creator/melisdashboardcreator-tool-step1.png)

Los cinco pasos:

1. **Plugin** — nombre, **View type** (tarjeta **Single** o **Multi-tabs**, 2–25 pestañas) y destino
   (**New module** o un desplegable **Existing module**).
2. **Menu Texts & Display** — título/descripción de menú por idioma + la miniatura obligatoria.
3. **Dashboard Texts & Display** — el título de la tarjeta por idioma y el **icono del plugin** (y,
   para plugins de varias pestañas, un icono por pestaña).
4. **Summary** — resumen de solo lectura.
5. **Finalization** — deja marcado **Activate plugin after creation** y luego pulsa **Finish and
   create the plugin**; la activación recarga la plataforma.

![Dashboard Plugin Creator — Paso 3 (título de la tarjeta + iconos)](/screenshots/react/melis-dashboard-plugin-creator/melisdashboardcreator-tool-step3.png)

## Templating frente a dashboard — de un vistazo

| | Plugin de templating | Plugin de dashboard |
| --- | --- | --- |
| Clase base | `MelisTemplatingPlugin` | `MelisCoreDashboardTemplatingPlugin` |
| Ubicado en | `src/Controller/Plugin/` | `src/Controller/DashboardPlugins/` |
| Método principal | `front()` → array de variables | una acción → `ViewModel` |
| Se muestra en | páginas del front office (zonas de arrastrar y soltar) | dashboard del back office |
| Configuración guardada | XML en el contenido de la página | configuración de la interfaz del dashboard |
| Asistente de generación | 6 pasos (`melis-templating-plugin-creator`) | 5 pasos (`melis-dashboard-plugin-creator`) |

## Archivos clave

| Aspecto | Ruta |
| --- | --- |
| Clase base de templating | `vendor/melisplatform/melis-engine/src/Controller/Plugin/MelisTemplatingPlugin.php` |
| Ejemplo de templating | `vendor/melisplatform/melis-cms-slider/src/Controller/Plugin/MelisCmsSliderShowSliderPlugin.php` |
| Clase base de dashboard | `vendor/melisplatform/melis-core/src/Controller/DashboardPlugins/MelisCoreDashboardTemplatingPlugin.php` |
| Ejemplo de dashboard | `vendor/melisplatform/melis-core/src/Controller/DashboardPlugins/MelisCoreDashboardBubbleNewsMelisPlugin.php` |
| Generadores | `vendor/melisplatform/melis-templating-plugin-creator/`, `vendor/melisplatform/melis-dashboard-plugin-creator/` |

Para las páginas de referencia de los módulos, consulta
[melis-templating-plugin-creator](/es/reference/modules/melis-templating-plugin-creator) y
[melis-dashboard-plugin-creator](/es/reference/modules/melis-dashboard-plugin-creator).
