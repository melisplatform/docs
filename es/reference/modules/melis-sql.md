# MelisSql

> Ejecutor de consultas SQL de solo lectura en las Dev Tools del back-office React, distribuido como un brick nativo full-React. Paquete `melisplatform/melis-sql`.

## Propósito

MelisSql es una pequeña herramienta para desarrolladores: un **ejecutor de consultas SQL de solo lectura**. Escribes una sentencia `SELECT`, pulsas **Run** y las filas correspondientes se devuelven en una tabla dinámica, sin salir del back-office ni abrir un cliente de base de datos externo. Se conecta usando las credenciales `config['db']` configuradas en la plataforma, por lo que no se introduce ningún dato de conexión.

En Melis v6 la herramienta se distribuye como un **brick nativo full-React** en `/melis-react`: una página React real que llama a un único endpoint JSON `react-api`, con un conmutador **New / Old** que puede recurrir a la herramienta legacy en un iframe. Es una herramienta de diagnóstico e inspección reservada a administradores, no una funcionalidad para el usuario final.

## Activarla

Añade en `config/melis.module.load.php`:

```php
return [
    'MelisSql',
];
```

La herramienta aparece en el back-office React **solo si el módulo está activado** (descubrimiento modular de bricks). Requiere `melisplatform/melis-core` y PHP `^8.1|^8.3|^8.4`.

## Dónde se encuentra en /melis-react

Barra lateral izquierda → grupo **Dev Tools** → **SQL**. Se abre como una pestaña superior llamada **SQL**. El manifiesto del brick declara la ruta `/melis-core/sql` y mapea sobre ella la `forwardKey` de menú `MelisSql/List`.

Es una **herramienta de una sola pantalla**: una página con un cuadro de consulta, un botón **Run** y una tabla de resultados dinámica. Sin subpestañas, sin desglose.

![La herramienta SQL de React: cabecera con título/subtítulo, el conmutador New/Old (arriba a la derecha), un área de texto de consulta con el placeholder `SELECT * FROM my_table LIMIT 10;`, la indicación "One SELECT statement only, ending with « ; »", un botón rojo Run y una tarjeta de resultados vacía.](/screenshots/react/melis-sql/melissql-tool-sql.png)

## Uso de la herramienta React

1. Escribe **una** sentencia `SELECT` en el área de texto de consulta.
2. Termínala con un punto y coma `;`.
3. Haz clic en **Run** (o pulsa **Ctrl/Cmd + Enter**).

Cuando una consulta devuelve resultados, aparece una tarjeta de resultados con:

- Un **recuento de filas** (p. ej. `12 row(s)`; al buscar, `matches / total`).
- Un cuadro de **búsqueda** que filtra las filas devueltas en **todas** las columnas (incluso las ocultas).
- Un botón **Columns** que abre un gestor de columnas: dos listas (**Visible** / **Hidden**), arrastrar para ocultar/reordenar, **Reset** para mostrarlas todas. La disposición se recuerda por navegador (`localStorage`, clave `melis-sql-cols-v1`).
- La **tabla** en sí: haz clic en una cabecera para **ordenar** (ascendente → descendente); los blobs de imagen reconocidos (p. ej. el avatar de un usuario) se renderizan en línea como miniaturas.

### Conmutador New / Old

Un conmutador **New / Old** arriba a la derecha alterna toda la herramienta entre vistas. **New** (por defecto) es la interfaz React; **Old** renderiza la herramienta legacy en un iframe singleton (`/melis/react-tool-page?key=melissql_tool`), posicionado sobre un ancla mediante un `ResizeObserver`.

## Reglas de las consultas

La herramienta rechaza todo lo que no sea una única sentencia de solo lectura, mostrando el motivo en un banner rojo:

| Situación | Qué ocurre |
| --- | --- |
| La sentencia no comienza por `SELECT` | Rechazada — *only SELECT queries are allowed*. |
| Falta el punto y coma al final | Rechazada — *a query should end with ';'*. |
| Más de una sentencia (varios `;`) | Rechazada — *only one query is allowed*. |
| **No** eres administrador de la plataforma | Rechazada — **403 Forbidden** (solo administradores). |
| La consulta no puede prepararse / falla | El error de la base de datos se muestra en el banner. |

## Endpoint de la API React

**No** existe un `config/react-api.php` para este módulo. El único endpoint se alcanza a través de la ruta catch-all de back-office del módulo (`config/module.config.php`, `/melis/MelisSql[/:controller[/:action]]`), que resuelve el alias `MelisSql\Controller\MelisSqlReactApi` → `MelisSqlReactApiController` (declarado bajo `controllers.invokables`). Contrato: `{ success, data, error }`.

| Método y URL | Acción del controlador | Propósito |
| --- | --- | --- |
| `POST /melis/MelisSql/MelisSqlReactApi/run` | `runAction` | Valida + ejecuta una `SELECT` de solo lectura, devuelve `{ columns, rows, rowCount }` |

Cuerpo de la petición: `{ "query": "SELECT … ;" }`.

```ts
// runSqlQuery(query) — the only call the brick makes (ui-react/src/sql-api.ts)
const res = await fetch('/melis/MelisSql/MelisSqlReactApi/run', {
  method: 'POST',
  headers: { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: 'SELECT * FROM melis_cms_page_tree;' }),
})
// → { success: true, data: { columns: string[], rows: Record<string,unknown>[], rowCount: number } }
```

`MelisSqlReactApiController` **extiende el `ListController` legacy** para reutilizar su guarda `runQuery()` tal cual (la misma conexión `mysqli` de `config['db']`, la misma validación de sentencia única / solo `SELECT`, los mismos mensajes de error traducidos). Solo añade el remodelado JSON más las salvaguardas indicadas más abajo. Los errores de validación/BD devuelven HTTP **200** con `{ success:false, error }`; los fallos de autenticación devuelven 401/403; los métodos distintos de `POST` devuelven 405.

## Capacidades

Declaradas en `config/react.capabilities.php` (fusionadas mediante `MelisSql\Module::getConfig()`), indexadas bajo la melisKey `melissql_tool` de la herramienta:

```php
return ['melisReactToolCapabilities' => [
    'melissql_tool' => ['run'],   // one internal cap: the Run (execute-query) action
]];
```

- **`run`** es una capacidad personalizada (no una de las capacidades estándar `list/create/edit/delete/export`). Permite a un administrador *ver/consultar* la herramienta sin estar necesariamente autorizado a **ejecutar** consultas.
- **Control en el front.** `SqlPage` llama a `useCaps('melissql_tool')` → `can('run')` y solo entonces renderiza el botón **Run** y habilita el atajo Ctrl/Cmd + Enter.
- Este archivo es **solo declarativo** (alimenta las casillas de Users → Rights); la **aplicación real** es la guarda de acceso + el control `usr_admin` en el controlador.

## Notas de seguridad

- **Solo administradores.** El controlador ejecuta `denyUnlessAccess()` (401 si no autenticado, 403 si `MelisCoreRights::canAccess('melissql_tool')` falla) y, además, exige `usr_admin`. El derecho `melissql_tool` es delegable, por lo que **los derechos por sí solos no bastan**: un no administrador obtiene **403 Forbidden**.
- **De solo lectura por construcción.** `runQuery()` rechaza todo lo que no sea exactamente una sentencia que termine en `;` y comience por `SELECT` — sin vía hacia `INSERT`/`UPDATE`/`DELETE`/DDL. Trata cualquier cambio en `runAction`/`runQuery` como sensible a la seguridad.
- **Enmascarado de columnas sensibles.** `maskSensitiveColumns()` enmascara los *valores* de las columnas cuyo nombre coincida con `password|passwd|pwd|mot_de_passe|secret|token|api_key` con `••••••••`, del lado del servidor, de modo que un hash nunca llegue al navegador en un `SELECT *`. Es una barrera de protección, no un límite de seguridad.
- **JSON seguro para binarios.** `sanitizeForJson()` codifica en base64 los datos binarios no UTF-8 y emite los blobs de imagen reconocidos (p. ej. `melis_core_user.usr_image`) como URIs `data:<mime>;base64,…` para su renderizado en línea.
- Evita `SELECT *` sin límite en tablas muy grandes: no hay paginación del lado del servidor.

## Archivos clave

| Aspecto | Ruta |
| --- | --- |
| Ruta catch-all, invokable del controlador, extensión de toolpage de la vista Old | `config/module.config.php` |
| Capacidades (`melisReactToolCapabilities` → `melissql_tool` → `run`) | `config/react.capabilities.php` |
| Herramienta legacy + guarda `runQuery()` (reutilizada por el controlador de la API) | `src/Controller/ListController.php` |
| Controlador de la API React (control de administrador + reutilización de `runQuery` + enmascarado + JSON seguro) | `src/Controller/MelisSqlReactApiController.php` |
| Peculiaridad del iframe `toolPageAction()` de la vista Old | `src/Controller/React/PluginViewToolPageExtension.php` |
| Fuente del brick React (Vite IIFE) | `ui-react/src/` — `brick.tsx`, `SqlPage.tsx`, `ViewToggle.tsx`, `sql-api.ts` |
| Brick compilado + manifiesto | `public/ui-react/brick.js`, `public/ui-react/brick.manifest.json` |

Ver también: [MelisCore](/es/reference/modules/melis-core)
