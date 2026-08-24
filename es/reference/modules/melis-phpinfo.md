# MelisPhpinfo

> Herramienta de diagnóstico de solo lectura que muestra la función nativa `phpinfo()` de PHP dentro del back office React de Melis. Paquete `melisplatform/melis-phpinfo`.

## Propósito

MelisPhpinfo es un módulo de Dev Tools de una sola pantalla que captura la salida de `phpinfo()` y la muestra en el administrador de Melis, permitiendo a un administrador inspeccionar la versión de PHP del servidor, las extensiones cargadas, las directivas de `php.ini`, las variables de entorno y las rutas sin acceso al shell. No tiene base de datos ni capa de servicios o modelos: solo un controlador y tres zonas de vista. En la v6 se distribuye como un **brick iframe** en el back office React: la página React monta un iframe persistente que carga la herramienta legacy existente dentro del contenedor React. No hay capa de API React ni archivo de capacidades.

::: warning Nota de seguridad
`phpinfo()` expone detalles sensibles: rutas absolutas, módulos cargados, variables de entorno (potencialmente credenciales/claves de API) y flags de compilación. La herramienta reside bajo **Dev Tools** de forma intencionada; manténgala restringida a administradores de confianza y oculte los secretos antes de compartir cualquier captura de pantalla.
:::

## Activarlo

Añada a `config/melis.module.load.php`:

```php
return [
    'MelisPhpinfo',
];
```

Requiere que `MelisCore` se cargue primero. El brick React aparece solo si el módulo está activado — el descubrimiento de bricks (`GET /melis/react-api/react-modules`) lista los módulos activos que incluyen un `brick.manifest.json`; desactivar el módulo elimina el nodo de menú.

## Back office (React)

La herramienta aparece en la barra lateral izquierda bajo **MelisCore → Dev Tools → PHP Info**. Se abre como una pestaña superior llamada **PHP Info** y muestra el informe completo de `phpinfo()` con un estilo adaptado al administrador de Melis; aparece un breve indicador de carga mientras el iframe carga por primera vez. El informe puede ser largo, así que desplácese dentro del área de la herramienta para llegar a una sección concreta (Core, extensiones, rutas, entorno). Hay una única vista — sin conmutador Nuevo/Antiguo — y nada es editable.

## Anatomía del brick

La presencia en React es un **brick iframe**: `PhpinfoPage.tsx` no implementa ninguna interfaz de usuario React nativa. Crea un iframe persistente (`id="melis-brick-frame-phpinfo"`) cuyo `src` es `/melis/react-tool-page?key=melis_phpinfo_tool`, lo añade al `<body>` una sola vez, y luego únicamente lo posiciona/muestra sobre un `<div>` de anclaje al cambiar de pestaña, de modo que nunca se recarga. El destino del iframe — servido por **MelisReactOverride** — renderiza la herramienta legacy clásica PHP Info.

| Elemento | Valor |
| --- | --- |
| ID del brick | `phpinfo` |
| `route` del manifiesto | `/melis-core/phpinfo` |
| `label` | `PHP Info` |
| `forwardKey` | `MelisPhpinfo/List` |
| `melisKey` (destino del iframe) | `melis_phpinfo_tool` |
| `entry` | `brick.js` |
| API React | ninguna (sin `config/react-api.php`) |
| Capacidades | ninguna (sin `config/react.capabilities.php`) — acceso controlado por el derecho `melis_phpinfo_tool` |

Manifiesto (`public/ui-react/brick.manifest.json`):

```json
{
  "id": "phpinfo",
  "route": "/melis-core/phpinfo",
  "label": "PHP Info",
  "forwardKey": "MelisPhpinfo/List",
  "melisKey": "melis_phpinfo_tool",
  "entry": "brick.js"
}
```

## Acceso

No hay capacidades granulares: el acceso es de todo o nada, controlado por el derecho de herramienta `melis_phpinfo_tool`. El menú React emite el nodo solo si el usuario cumple `canAccess('melis_phpinfo_tool')` (superadministradores con `usr_admin=1`, o usuarios a los que se ha concedido el derecho). La vista de contenido legacy vuelve a comprobar el mismo derecho en el servidor antes de ejecutar `phpinfo()`, de modo que incluso una solicitud manual a la zona de contenido devuelve una respuesta vacía para los demás.

```php
// src/Controller/ListController.php — renderToolContentAction()
$view->accessAllowed = $this->isPhpinfoAccessAllowed(); // only then does the view run phpinfo()
// isPhpinfoAccessAllowed(): authenticated identity + MelisCoreRights::canAccess('melis_phpinfo_tool')
```

## Zonas de vista

La herramienta legacy (cargada en el iframe) se compone de tres zonas, sin cambios en la v6:

| Identificador de zona | Rol |
| --- | --- |
| `melis_phpinfo_tool` | Contenedor — reenvía a `MelisPhpinfo/List/render-tool` |
| `melis_phpinfo_header` | Barra de título (`render-tool-header`) |
| `melis_phpinfo_content` | El informe de `phpinfo()` (`render-tool-content`) |

## Detalle de implementación

La salida de `phpinfo()` se produce enteramente en la capa de vista. Las acciones del controlador devuelven un `ViewModel` vacío sin datos pasados desde PHP a la vista; la vista del informe captura y sanea la salida:

```php
ob_start();
phpinfo();
$phpInfoContent = ob_get_clean();
// Strip phpinfo()'s own <style> so the page inherits Melis admin CSS
$filtredPhpInfoContent = preg_replace('/<style\b[^>]*>(.*?)<\/style>/is', '', $phpInfoContent);
echo $filtredPhpInfoContent;
```

La lógica de negocio permanece en el servidor: el brick React es únicamente la herramienta legacy PHP Info incrustada en el contenedor React.

## Archivos clave

| Área | Ruta |
| --- | --- |
| Punto de entrada del brick | `ui-react/src/brick.tsx` (registra el id `phpinfo` → `PhpinfoPage`) |
| Página React (envoltura del iframe) | `ui-react/src/PhpinfoPage.tsx` |
| Bundle compilado / manifiesto | `public/ui-react/brick.js` · `public/ui-react/brick.manifest.json` |
| Registro de menú / zonas | `config/app.toolstree.php` |
| Configuración de la herramienta | `config/app.tools.php` · `config/app.interface.php` |
| Registro de ruta + controlador | `config/module.config.php` |
| Controlador (3 acciones ligeras, con acceso controlado) | `src/Controller/ListController.php` |
| Vista del informe | `view/melis-phpinfo/list/render-tool-content.phtml` |

Consulte también: [MelisCore](/es/reference/modules/melis-core)
