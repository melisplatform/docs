# MelisComposerDeploy

> Integra Composer dentro de la plataforma para instalar, actualizar y eliminar módulos de forma programática. Paquete `melisplatform/melis-composerdeploy`.

## Propósito

MelisComposerDeploy permite a la plataforma **ejecutar Composer desde dentro de la aplicación** — instalando, actualizando o eliminando módulos sin acceso a la terminal. Es el motor sin interfaz que hay detrás de la **herramienta de Módulos / marketplace** del back-office y del asistente de primera ejecución de MelisInstaller. Se sitúa en la capa base de MelisCore junto a MelisAssetManager, MelisDbDeploy y MelisInstaller, y depende únicamente de `composer/composer` (sin acoplamiento con MelisCore).

## Sin back-office React

MelisComposerDeploy **no tiene interfaz React ni herramienta de back-office** — ni en el back-office heredado ni en el de React (`/melis-react`). No incluye ningún brick `ui-react/`, ningún `brick.manifest.json`, ningún `config/react-api.php` ni controlador. Nunca aparece en la barra lateral y no hay nada en lo que hacer clic.

Su relación con el back-office React es **indirecta**: cuando instalas un módulo a través del marketplace, MelisComposerDeploy descarga el paquete de Composer. Si ese paquete incluye un brick React ya compilado, el shell de React descubre el brick **una vez que el módulo está activo** — pero el descubrimiento de bricks lo gestiona `melis-react-api`, no este módulo. MelisComposerDeploy nunca toca, compila ni sirve recursos React.

> En entornos desplegados donde todo el directorio `vendor/` está versionado (sin `composer install` en el servidor), MelisComposerDeploy es el motor del *marketplace en tiempo de ejecución* — no el mecanismo que entrega la aplicación React precompilada.

## Activarlo

Añádelo a `config/melis.module.load.php`:

```php
return [
    'MelisComposerDeploy',
];
```

## Servicio principal

Todo el módulo se reduce esencialmente a un único servicio, con el alias `MelisComposerService` (`config/module.config.php` → `service_manager.aliases`), clase `MelisComposerDeploy\Service\MelisComposerService`. Construye un comando de consola de Composer y lo ejecuta en el propio proceso mediante Symfony Console, controlando la biblioteca de Composer incluida bajo `bin/extracted-composer/`.

| Alias del servicio | Función |
| --- | --- |
| `MelisComposerService` | Ejecutor de Composer en el propio proceso. Expone `download()`, `update()`, `remove()`, `dumpAutoload()`, además de `setDocumentRoot()` y `setDryRun()`. |

```php
$composer = $sm->get('MelisComposerService');

$composer->setDocumentRoot($projectRoot);            // composer working-dir (defaults to DOCUMENT_ROOT/../)
$composer->setDryRun(true);                           // simulate without writing (--dry-run)

$composer->download('melisplatform/melis-cms-news');  // composer require <pkg>[:version]
$composer->update('melisplatform/melis-cms-news');    // composer update --root-reqs
$composer->remove('melisplatform/melis-cms-news');    // composer remove --no-scripts
$composer->dumpAutoload();                             // composer dump-autoload
```

Notas extraídas del código fuente:

- **Solo comandos permitidos**: `install`, `update`, `dump-autoload`, `require`, `remove`. Cualquier otro devuelve una respuesta de "comando desconocido".
- **Refuerzo de argumentos**: la cadena `package[:version]` se valida contra una expresión regular estricta de tipo `vendor/name` + semver y rechaza espacios en blanco, evitando la inyección de argumentos en la línea de comandos de Composer.
- Los comandos se ejecutan con `--ignore-platform-reqs --no-progress --no-scripts --prefer-dist` y `--working-dir=<docRoot>`.
- Sin rutas, sin controlador, sin eventos, sin vista — es un servicio invocado por otros módulos.

## Pipeline de despliegue

Los llamadores controlan el servicio; un flujo típico de instalación en tiempo de ejecución:

```text
MelisComposerService::download(pkg)   →  composer require (package downloaded into vendor/)
        ↓
MelisComposerService::dumpAutoload()  →  autoloader regenerated (new classes visible)
        ↓
MelisDbDeploy                          →  applies the new module's SQL deltas (extra.dbdeploy: true)
        ↓
module active                          →  MelisAssetManager serves its assets; if the module ships
                                          a React brick, the React shell discovers it (via
                                          melis-react-api /react-modules)
```

La última flecha es el único punto de contacto, pasivo, con el back-office React: este módulo hace que el módulo esté presente y activo; el descubrimiento del brick React corresponde por completo a `melis-react-api`.

Consulta también: [MelisDbDeploy](/es/reference/modules/melis-dbdeploy), [MelisInstaller](/es/reference/modules/melis-installer), [MelisAssetManager](/es/reference/modules/melis-asset-manager)
