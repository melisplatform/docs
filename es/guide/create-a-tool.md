# Cree su primera herramienta

Una **herramienta** es una pantalla del backoffice (una lista, un formulario, un panel…) empaquetada dentro de un módulo y
adjunta al menú de la izquierda. Esta página muestra cómo crear una en **Melis v6** y explica la
anatomía de una herramienta para que pueda ampliarla con confianza.

::: tip Lea esto primero
Asegúrese de haber revisado [Arquitectura y conceptos](./concepts) — las herramientas se construyen sobre **módulos**,
el **árbol de configuración**, los **forwards** y los **derechos**. Esos fundamentos no han cambiado en v6.
:::

::: info v6 conservó el framework, reemplazó la interfaz
Melis v6 ejecuta el **mismo** framework Laminas, los mismos módulos y el mismo árbol de configuración que v5. Lo que cambió es el
backoffice: la interfaz clásica `/melis` ha sido reemplazada por un **shell React en `/melis-react`**.
Las herramientas ahora aparecen allí como "bricks" React nativos, y cualquier herramienta que no haya sido reescrita en React
sigue funcionando, sin cambios, dentro de un iframe. Así que la manera de *construir* una herramienta que se describe a continuación es la misma; solo cambia la
forma de *usarla* en el backoffice. Consulte
[MelisReactApi](/es/reference/modules/melis-react-api) y
[MelisReactOverride](/es/reference/modules/melis-react-override) para conocer los detalles internos.
:::

## La vía rápida: los asistentes de generación de código

Melis incluye generadores gráficos que crean para usted una herramienta completa y funcional. En v6 los dos más
utilizados son **asistentes React nativos** en el shell `/melis-react`:

- **[Dashboard Plugin Creator](/es/reference/modules/melis-dashboard-plugin-creator)** — genera un
  widget que aparece en el panel de inicio del backoffice.
- **[Templating Plugin Creator](/es/reference/modules/melis-templating-plugin-creator)** — genera un
  bloque CMS de front-end que puede colocar en las páginas desde el editor de páginas.

Ambos se abren desde su entrada en el menú de la izquierda como una pestaña superior con una **barra de pasos** en la parte superior y un
conmutador **New / Old** (arriba a la derecha, junto a **Restart**): *New* es el asistente React (predeterminado), *Old*
abre la herramienta clásica en un iframe. Cada paso se valida **en el servidor** (reutilizando los formularios Laminas
heredados), de modo que las reglas de negocio — palabras clave reservadas de PHP, nombres de módulo/plugin duplicados — son
exactamente las mismas que antes.

![Dashboard Plugin Creator — Step 1 (Plugin)](/screenshots/react/melis-dashboard-plugin-creator/melisdashboardcreator-tool-step1.png)
*Paso 1 del Dashboard Plugin Creator: **Plugin name**, **View type** (Single / Multi-tabs) y
**Plugin destination** (New module / Existing module), con **Next** en la parte inferior.*

Recorra el asistente: asigne un nombre a su plugin, elija un módulo **nuevo** o **existente**, localice sus títulos por
idioma, cargue una miniatura, elija los iconos y luego revise un **Summary** de solo lectura. El paso de **Finalization**
es la única acción que modifica datos — escribe los archivos PHP/vista/config/idioma en el disco y, para la
rama de *nuevo módulo*, genera el módulo (mediante el servicio subyacente
[MelisToolCreator](/es/reference/modules/melis-tool-creator)), lo registra, lo **activa**
y recarga la plataforma.

![Templating Plugin Creator — Step 6 (Finalization)](/screenshots/react/melis-templating-plugin-creator/melistemplatingplugincreator-tool-step6.png)
*El paso de **Finalization** del Templating Plugin Creator: elija un **Site** en el que activarlo, mantenga
**Activate plugin after creation** activado y luego **Finish and create the plugin** — el asistente hace una cuenta atrás
y recarga la plataforma.*

::: tip Restart / New vs Old
**Restart** (barra de herramientas superior) borra el borrador y vuelve al paso 1. Cambiar a **Old** abre la
herramienta clásica en un iframe y **reinicia el borrador compartido** — el asistente le advierte antes.
:::

Para una herramienta de backoffice sencilla (una pantalla de lista/formulario, no un panel ni un bloque CMS), el subyacente
**MelisToolCreator** sigue generando un esqueleto de módulo completo (config, controladores, servicio, modelo de tabla
y vistas). El resto de esta página explica **qué producen estos generadores** — para que también pueda
leer, ajustar y escribir herramientas a mano.

## Anatomía de una herramienta (lo que se genera)

Esta parte no ha cambiado respecto a v5: una herramienta sigue siendo un módulo Laminas. Una típica tiene este aspecto:

```
module/MyTool/
├── src/Module.php                 # merges the config files below
├── config/
│   ├── module.config.php          # routes, services, controllers, view paths
│   ├── app.interface.php          # the tool's internal UI zones + forwards
│   ├── app.tools.php              # table columns, filters, action buttons
│   └── app.toolstree.php          # where the tool sits in the left menu
├── src/MyTool/
│   ├── Controller/                # *Controller.php (extend MelisAbstractActionController)
│   ├── Service/                   # *Service.php   (extend MelisGeneralService)
│   └── Model/Tables/              # *Table.php      (Laminas TableGateway wrappers)
├── view/melis-my-tool/            # .phtml templates
└── language/{en_EN,fr_FR}.interface.php
```

> 📎 Las mejores implementaciones de referencia para copiar son los módulos reales
> `vendor/melisplatform/melis-cms-news/` y `vendor/melisplatform/melis-cms-prospects/`.
> Ábralos uno junto al otro mientras construye.

### 1. Registre el módulo

`config/melis.module.load.php`:

```php
return [
  // … core modules …
  'MyTool',
];
```

### 2. `Module.php` — ensamble la configuración

```php
namespace MyTool;

use Laminas\ModuleManager\Feature\ConfigProviderInterface;
use Laminas\Stdlib\ArrayUtils;

class Module implements ConfigProviderInterface
{
    public function getConfig()
    {
        $config = [];
        foreach ([
            __DIR__ . '/../config/module.config.php',
            __DIR__ . '/../config/app.interface.php',
            __DIR__ . '/../config/app.tools.php',
            __DIR__ . '/../config/app.toolstree.php',
        ] as $file) {
            $config = ArrayUtils::merge($config, include $file);
        }
        return $config;
    }
}
```

### 3. `app.toolstree.php` — muéstrela en el menú de la izquierda

Esto adjunta su herramienta bajo una sección del menú de la izquierda y hace un forward a su controlador. El `melisKey`
es el identificador estable; el `forward` apunta a la acción que renderiza la herramienta. El shell React
lee este mismo árbol (mediante `GET /melis/react-api/menu`), **filtrado por derechos**, para construir su barra lateral —
así que declarar aquí su herramienta es lo que hace que aparezca en `/melis-react`.

```php
return ['plugins' => ['meliscore' => ['interface' => ['meliscore_leftmenu' => ['interface' => [
  'meliscustom_toolstree_section' => ['interface' => [
    'mytool_tool' => [
      'conf' => [
        'id'       => 'id_mytool_tool',
        'melisKey' => 'mytool_tool',
        'name'     => 'tr_mytool_title',   // translation key
        'icon'     => 'fa fa-puzzle-piece',
      ],
      'forward' => [
        'module'     => 'MyTool',
        'controller' => 'MyTool',
        'action'     => 'render-mytool',
      ],
    ],
  ]],
]]]]]];
```

### 4. Controlador + servicio

```php
// src/MyTool/Controller/MyToolController.php
namespace MyTool\Controller;

use Laminas\View\Model\ViewModel;
use Laminas\View\Model\JsonModel;
use MelisCore\Controller\MelisAbstractActionController;

class MyToolController extends MelisAbstractActionController
{
    public function renderMytoolAction()
    {
        $view = new ViewModel();
        $view->melisKey = $this->params()->fromRoute('melisKey', '');
        return $view; // renders view/melis-my-tool/my-tool/render-mytool.phtml
    }

    public function getListAction()
    {
        $items = $this->getServiceManager()->get('MyToolService')->getList();
        return new JsonModel(['data' => $items]);
    }
}
```

Los servicios extienden `MelisGeneralService` y acceden a la base de datos a través de un envoltorio `TableGateway`
registrado en `module.config.php`.

::: info Cómo se renderiza su herramienta en /melis-react
Una herramienta declarada de esta manera no necesita **ningún código React** para aparecer en v6. El shell React simplemente muestra su
interfaz `.phtml` existente dentro de un iframe servido en `/melis/react-tool-page?key=<melisKey>` — con sus propios
DataTables, formularios, ventanas modales y botones de guardar comportándose exactamente igual que en el `/melis` clásico. Esto lo
gestiona por completo [MelisReactOverride](/es/reference/modules/melis-react-override); usted no lo toca.
Reescribir una herramienta como un **brick React nativo** (con un `brick.manifest.json` y
endpoints `/melis/react-api/…`) es una mejora opcional — los dos asistentes de creación anteriores son ejemplos
de ello — no un requisito.
:::

### 5. Hágala visible — derechos

Incluso cuando una herramienta está correctamente declarada, la sección del menú de la izquierda solo aparece para los usuarios cuyos
**derechos** la incluyen. Los derechos se almacenan como una lista de permitidos en formato XML en `melis_core_user.usr_rights`:
una sección es visible cuando su `*_toolstree_section` figura allí. El menú de `/melis-react` se
filtra exactamente por estos derechos, por lo que una sección no listada también queda oculta en el shell React.

Otorgue el acceso desde el editor **Users → Rights** del backoffice (marque su herramienta para el rol/usuario y
guarde). Para automatizar, también puede inyectar la sección en el XML de derechos mediante una migración — vea
cómo lo hace la plataforma para el menú de IA en `flyway/sql/V3__add_melisai_rights.sql`.

::: tip v6 también tiene "derechos avanzados" (capabilities)
Además del *acceso* a la herramienta, v6 añade **capabilities** de grano fino (`list` / `create` / `edit` /
`delete`, o pestañas anidadas) que controlan las partes internas de una herramienta ya autorizada. Son
**permitidas por defecto** — una herramienta que no declara ninguna conserva el CRUD completo, así que esto es opcional. Si lo desea,
declare un `config/react.capabilities.php` en su módulo y proteja sus acciones de la React-API con
`denyUnlessCan('edit')`. El contrato completo se encuentra en
[MelisReactApi](/es/reference/modules/melis-react-api).
:::

## Resumen

1. Genere con un **asistente** (Dashboard / Templating Plugin Creator) o copie `melis-cms-news`.
2. **Registre** el módulo en `config/melis.module.load.php`.
3. Declárela en **`app.toolstree.php`** (menú) y **`app.interface.php`** (zonas internas).
4. Implemente el **controlador + servicio + vista**.
5. Otorgue **derechos** para que aparezca en el menú.

Ahora tiene una herramienta funcional que aparece en el backoffice `/melis-react` — como un iframe para una
herramienta `.phtml` clásica, o como un brick nativo si la reescribió en React. A partir de aquí, explore
`app.tools.php` para conectar una tabla de datos completa (columnas, filtros, botones de acción) como hacen los módulos
CMS.
