# MelisDbDeploy

> Ejecutor headless de migraciones de base de datos para la plataforma Melis — aplica en orden los deltas SQL de cada módulo. Paquete `melisplatform/melis-dbdeploy`.

## Propósito

`MelisDbDeploy` mantiene el esquema de base de datos de cada módulo sincronizado con el código
instalado. Cada módulo que se adhiere entrega sus cambios de esquema como archivos SQL ordenados
(**deltas**) en `install/dbdeploy/`. MelisDbDeploy descubre esos deltas en todos los módulos, aplica
los que aún no se han ejecutado y registra cada uno en una tabla de changelog para que se aplique
exactamente una vez — construido sobre el `DbDeployTask` de [Phing](https://www.phing.info/).

**No tiene interfaz de cara al usuario**.

## Relación con el back-office React

MelisDbDeploy **no tiene herramienta React, ni página, ni entrada de menú, ni ruta**. Nunca aparece
en ningún lugar de `/melis-react`. No hay brick `ui-react/`, ni `config/react-api.php`, ni
`config/react.capabilities.php`, ni `src/Controller/` — es un módulo headless, solo de servicio.

Su vínculo con el back-office React es totalmente **indirecto**, a través de dos hechos:

- **Crea las tablas y columnas que las herramientas React leen y escriben.** Cada herramienta React
  (Usuarios, Páginas CMS, Sitios, Medios, …) consulta tablas de base de datos. Esas tablas — y las
  columnas que añaden las funcionalidades React más recientes — las crean los deltas
  `install/dbdeploy/*.sql` del módulo propietario, que MelisDbDeploy aplica. Si una herramienta
  React arroja un error de "tabla/columna no encontrada" justo después de una instalación o
  actualización, la causa habitual es una migración sin ejecutar.
- **Se ejecuta en el pipeline de despliegue que entrega el build de React.** El build de React
  incluido en el repositorio (`melis-core/public/ui-react/`, aplicación en `/melis-react`) se
  entrega mediante el mismo despliegue que ejecuta las migraciones de esquema. MelisDbDeploy gestiona
  los deltas SQL **entregados por los módulos**; **Flyway** gestiona las migraciones versionadas de
  la plataforma (`V*.sql`). Son mecanismos complementarios dentro del mismo paso de despliegue.

## Activarlo

Añádelo a `config/melis.module.load.php`:

```php
return [
    'MelisDbDeploy',
];
```

`MelisDbDeploy` depende únicamente de `phing/phing`. **No** tiene dependencia de `melis-core` — es
una herramienta autónoma invocada por MelisInstaller y por los flujos de instalación/actualización
de módulos, nunca llamada desde React.

## Adherir un módulo

Un módulo participa en el sistema de migración declarando lo siguiente en su `composer.json`:

```json
"extra": {
    "dbdeploy": true
}
```

Sus deltas SQL se colocan en `install/dbdeploy/*.sql`. Cada nombre de archivo comienza con un prefijo
numérico que define el orden de ejecución (por ejemplo, `23051701_create_my_table.sql`).

## Servicios clave

| Alias del servicio | Función |
| --- | --- |
| `MelisDbDeployDiscoveryService` | Encuentra los deltas de cada paquete `melisplatform/*` adherido y los copia a la caché de trabajo (`dbdeploy/data/`), y luego delega en el servicio de despliegue. |
| `MelisDbDeployDeployService` | Se conecta a la base de datos, garantiza que la tabla changelog exista y aplica los deltas pendientes mediante el `DbDeployTask` + `PDOSQLExecTask` de Phing. |

## La tabla changelog

Cada delta aplicado se registra en una tabla fija `changelog` (el nombre lo exige la tarea de Phing),
que actúa como el libro mayor de "aplicado una sola vez":

```sql
CREATE TABLE IF NOT EXISTS changelog (
  `change_number` BIGINT NOT NULL,
  `delta_set`     VARCHAR(10) NOT NULL,
  `start_dt`      TIMESTAMP NOT NULL,
  `complete_dt`   TIMESTAMP NULL,
  `applied_by`    VARCHAR(100) NOT NULL,
  `description`   VARCHAR(500) NOT NULL,
  PRIMARY KEY `Pkchangelog` (`change_number`, `delta_set`)
);
```

El acceso al modelo se realiza a través de `MelisDbDeploy\Model\Table\ChangelogTable` (con alias
`ChangelogTable`).

## Ejemplo

```php
// Discovery — gather deltas from all dbdeploy modules
$discovery = $sm->get(\MelisDbDeploy\Service\MelisDbDeployDiscoveryService::class);
$discovery->setComposer($composer);
$discovery->processing();   // discovers modules and copies their *.sql deltas

// Deploy — apply pending deltas
$deploy = new \MelisDbDeploy\Service\MelisDbDeployDeployService(/* db params */);
if (!$deploy->isInstalled()) {
    $deploy->install();                  // creates the changelog table on first run
}
$count = $deploy->changeLogCount();      // number of deltas applied so far
$deploy->applyDeltaPath($pathToDeltas);  // run any not-yet-applied deltas
```

## Cuándo se ejecuta

MelisDbDeploy se invoca automáticamente en dos escenarios, ninguno de los cuales involucra la interfaz
React:

- **Primera instalación** — por **MelisInstaller** durante el asistente de configuración de la
  plataforma.
- **Instalación / actualización de módulos** — a través de la herramienta de Módulos del
  back-office / marketplace y el hook post-update de Composer
  (`DbDeployOnComposerUpdate::postUpdate()`), que copia los deltas de cada módulo y los vuelve a
  aplicar hasta que el recuento del changelog coincide con el número de archivos delta (convergencia
  idempotente).

No expone ningún controlador.

## Resolución de problemas

Si una herramienta React muestra datos vacíos o un error 500 / "table doesn't exist" justo después de
la instalación, actualización o despliegue de un módulo, la causa raíz habitual es un **delta de
dbdeploy sin ejecutar** (o una migración de Flyway faltante) — no el código React. Volver a ejecutar
el flujo de migración lo soluciona.

## Archivos clave

| Aspecto | Ruta |
| --- | --- |
| Servicio de descubrimiento | `vendor/melisplatform/melis-dbdeploy/src/Service/MelisDbDeployDiscoveryService.php` |
| Servicio de despliegue | `vendor/melisplatform/melis-dbdeploy/src/Service/MelisDbDeployDeployService.php` |
| Hook post-update de Composer | `vendor/melisplatform/melis-dbdeploy/src/DbDeployOnComposerUpdate.php` |
| DDL del changelog | `vendor/melisplatform/melis-dbdeploy/data/changelog.sql` |
| Modelos | `vendor/melisplatform/melis-dbdeploy/src/Model/` |
| Deltas de módulo (cualquier módulo) | `vendor/melisplatform/<module>/install/dbdeploy/*.sql` |

Véase también: [MelisCore](/es/reference/modules/melis-core) · [MelisInstaller](/es/reference/modules/melis-installer) · [MelisComposerDeploy](/es/reference/modules/melis-composerdeploy) · [Conceptos de la plataforma](/es/guide/concepts)
