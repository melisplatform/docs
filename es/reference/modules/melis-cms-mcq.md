# MelisCmsMcq

> Constructor de cuestionarios de opción múltiple (MCQ / quiz) para el back-office del Melis CMS, ahora una herramienta nativa totalmente en React en el back-office de la v6. Paquete `melisplatform/melis-cms-mcq`.

## Propósito

MelisCmsMcq es la **mitad de interfaz de usuario** del sistema MCQ. Proporciona el banco de trabajo donde redactas
**preguntas** (con respuestas, tipo, dificultad, categoría y etiquetas), las organizas en **categorías de
preguntas** y **grupos MCQ**, y ensamblas **MCQ** (tests) ya sea manualmente mediante una **cesta** por usuario
o automáticamente mediante un **modelo aleatorio**. No tiene capa de datos propia: toda
la persistencia (tablas, servicios, puntuación, instantáneas XML y renderizado en el front-office) se delega en
el módulo complementario **MelisCmsMcqEngine**.

En la v6 la herramienta es un **brick nativo totalmente en React**: páginas React reales que llaman a los propios
endpoints JSON `/melis/react-api/mcq*` del módulo, sin iframe en la vista predeterminada. La herramienta PHP heredada permanece
intacta y solo es accesible mediante un conmutador New / Old por herramienta.

## Cómo activarlo

Añádelo a `config/melis.module.load.php`:

```php
return [
    'MelisCmsMcq',
];
```

Requiere `melisplatform/melis-cms-mcq-engine` (`^5.3`) y `laminas/laminas-paginator`. También
requiere que estén cargados **MelisCms**, **MelisCore** (backoffice) y **MelisCmsTags** (etiquetado de preguntas).
Cadena de instalación: `MelisCmsMcq` → `melis-cms-mcq-engine` → `melis-cms` + `melis-cms-tags`.

El brick React se descubre mediante `GET /melis/react-api/react-modules` y solo aparece cuando el
módulo está activo. `src/Module.php` fusiona `config/react-api.php` (los endpoints JSON) y
`config/react.capabilities.php` (el mapa de derechos avanzados) en la configuración de la aplicación.

## Dónde se ubica en el back-office React

**Barra lateral → MelisCms → MCQ**, ruta **`/melis-cms/mcq`** (derivada del forward de menú
`MelisCmsMcq/MelisCmsMcq`). El brick está registrado con el id **`cms-mcq`** y dibuja toda la herramienta
en React — sin barra lateral ni cabecera propias.

![La pestaña MCQ (React): la lista de tests con tarjetas KPI, filtros, el conmutador New/Old y la cesta Questions Favorites.](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-mcq-list.png)

El manifiesto (`public/ui-react/brick.manifest.json`) establece `persistent: true` y `subTabs: true`,
por lo que el brick posee su **propia** barra de sub-pestañas dentro de la herramienta y permanece montado durante la navegación del host: abrir
un MCQ o una pregunta añade una sub-pestaña, y los filtros, la ordenación y los formularios a medio escribir sobreviven cuando vuelves
a una lista. La URL es solo un reflejo cosmético (`history.replaceState`) del registro activo.

| Propiedad | Valor |
| --- | --- |
| Brick id | `cms-mcq` |
| Ruta | `/melis-cms/mcq` |
| Etiqueta | `MCQ` |
| forwardKey | `MelisCmsMcq/MelisCmsMcq` |
| melisKey | `meliscmsmcq_tool` (clave de control de acceso **y** portadora de derechos) |

> **Conmutador New / Old.** En la vista de lista, un usuario sin restricciones obtiene un conmutador **New (React) / Old (iframe
> heredado)**; la vista "Old" es la herramienta clásica servida en
> `/melis/react-tool-page?key=meliscmsmcq_tool`. Los usuarios restringidos solo ven la vista React.

## Banco de trabajo del back-office

Un banco de trabajo React de cuatro pestañas, más una cesta **Questions Favorites** (una lista corta de marcadores por usuario)
en la cabecera de la herramienta. Regla general: redacta **preguntas** → agrúpalas (**grupos MCQ** /
**categorías**) → ensambla un **MCQ** → **Preview** para realizarlo y leer la corrección.

| Pestaña | Qué gestiona |
| --- | --- |
| **MCQ** | Lista de tests ensamblados (Id, Estado, Código, nombre, fecha de creación, grupos, preguntas) con tarjetas KPI, búsqueda, filtros de estado/fecha, gestor de columnas y exportación. **Add** abre el constructor de MCQ como una sub-pestaña. |
| **Questions** | Lista de preguntas con filtros por categoría / tipo / estado / dificultad / etiquetas y búsqueda; una acción de **marcador** alterna la pregunta en Questions Favorites. |
| **MCQ groups** | Paquetes de preguntas reutilizables (Id, Estado, Código, Nombre). Tarjetas KPI, exportación, **modal** de añadir/editar. |
| **Question categories** | Agrupaciones de preguntas con nombre (Id, Estado, Código, Nombre). Tarjetas KPI, exportación, **modal** de añadir/editar. |

![La pestaña Questions (React): lista de preguntas filtrable, con la acción de marcador de la cesta.](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-questions.png)

### Editor de preguntas

**Add / edit** en la pestaña Questions abre el editor como una sub-pestaña, en dos pestañas:

| Pestaña del editor | Contenido |
| --- | --- |
| **Properties** | Código, **Type** (MCQ / Open Ended), **Category**, **Tags**, **Difficulty**, Estado |
| **Texts / Answers** | Texto de la pregunta por idioma más cada **respuesta** con su indicador **Correct answer (Yes/No)**, un código y un estado; arrastra el asa para reordenar las respuestas |

![Editor de preguntas — Properties (Type, Category, Tags, Difficulty, Status).](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-questions-edit-properties.png)

![Editor de preguntas — textos por idioma y la lista de respuestas (conmutador de respuesta correcta).](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-questions-edit-texts.png)

![Asa de arrastrar para reordenar en una fila de respuesta.](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-questions-edit-dragdroporderingicon.png)

### Constructor de MCQ

Pestaña **MCQ** → **Add** (o editar una fila) abre el constructor como una sub-pestaña, en tres pestañas:

| Pestaña del constructor | Contenido |
| --- | --- |
| **Properties** | Nombre, código, estado, **Minimum score required (%)** (tasa de aprobación) y un conmutador de barajado aleatorio **"change questions order at every MCQ creation"** |
| **Composition (Questions)** | Añade **grupos** y luego llena cada grupo arrastrando preguntas desde los paneles laterales **Questions Favorites** / **Search Questions**, o haz clic en **Configure a random MCQ** para autoseleccionar por grupo |
| **Preview** | Realiza el quiz ensamblado y luego envía para ver la **Corrección** calculada por el motor (puntuación, aprobado/suspenso, respuestas del usuario frente a las correctas por pregunta). La interfaz React solo la muestra |

![Constructor de MCQ Properties — nombre, minimum score required (%), conmutador de orden aleatorio.](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-mcq-edit-tab-properties.png)

![Composición del constructor de MCQ — grupos con sus preguntas, más los paneles Favorites / Search.](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-mcq-edit-tab-questions.png)

![Preview del constructor de MCQ — el quiz ensamblado, listo para realizarse.](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-mcq-edit-tab-preview.png)

![Corrección del Preview — puntuación, aprobado/suspenso y respuestas del usuario frente a las correctas por pregunta.](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-mcq-edit-tab-preview-corrected.png)

El modal **Random Model** define filas de criterios por grupo (Difficulty / Category / Tag / Number);
al guardar se resuelven los IDs de preguntas coincidentes en el servidor mediante el `getRandomQuestionIds` del motor.

![El modal Random Model — autoseleccionar preguntas por grupo según criterios.](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-mcq-edit-tab-questions-randommcq-modal.png)

> Un guardado falla si no hay nombre, ni grupo, o si **algún grupo está vacío** — las mismas reglas que la herramienta
> heredada. La instantánea XML del MCQ (`mcq_xml`) la regenera el motor en cada guardado, nunca se escribe
> a mano. Crear o eliminar una categoría actualiza los datos de referencia compartidos para que aparezca inmediatamente
> en el selector de categorías del editor de preguntas.

## API React — endpoints

Todas las rutas son rutas hijas de `melis-react-api` (fusionadas desde `config/react-api.php`), servidas por
cuatro controladores invocables. Contrato de respuesta en todas partes:
`{ success: bool, data: T, error?: string, fields?: string[] }`. Cada acción llama a
`denyUnlessAccess()` (autenticación + `MelisCoreRights::canAccess('meliscmsmcq_tool')`) y luego a una comprobación de capacidad
`denyUnlessCan(<cap>)`.

**MCQ** — `MelisReactApiMcqController`:

| Método · URL | Acción · cap | Propósito |
| --- | --- | --- |
| `GET /melis/react-api/mcq` | `list` · `mcq` | lista por keyset |
| `GET /melis/react-api/mcq/stats` | `stats` · `mcq` | tarjetas KPI |
| `GET /melis/react-api/mcq/groups` | `groups` · `mcq` | grupos seleccionables en el constructor |
| `GET /melis/react-api/mcq/:id` | `get` · `mcq` | detalle completo (props, nombres, grupos ordenados + preguntas) |
| `POST /melis/react-api/mcq/save` | `save` · `mcq.create` \| `mcq.edit` | crear/actualizar (regenera `mcq_xml`) |
| `POST /melis/react-api/mcq/evaluate` | `evaluate` · `mcq.preview.test` | puntuar un conjunto de respuestas |
| `GET /melis/react-api/mcq/:id/preview` | `preview` · `mcq.preview` | el MCQ tal como se juega (desde XML) |
| `DELETE /melis/react-api/mcq/delete/:id` | `delete` · `mcq.delete` | eliminar (en cascada) |

**Questions** (+ respuestas, cesta, sorteo aleatorio) — `MelisReactApiMcqQuestionController`, en
`/melis/react-api/mcq-questions[…]`: `list`/`stats`/`refs`/`get`/`save` (cap `questions`),
`delete` (`questions.delete`), y los endpoints de composición `basket`, `basket/toggle`,
`basket/clear`, `search`, `random`, `random-model` (todos con cap `mcq.composition`). `refs` devuelve los
datos de referencia compartidos — tipos, dificultades, categorías, etiquetas, idiomas, `nextCode`.

**MCQ groups** — `MelisReactApiMcqGroupController`: `list`/`stats`/`save`/`delete`/`related`/`get`
en `/melis/react-api/mcq-groups[…]` (caps `groups`, `groups.delete`).

**Question categories** — `MelisReactApiMcqCategoryController`:
`list`/`stats`/`save`/`delete`/`related`/`get` en `/melis/react-api/mcq-categories[…]`
(caps `categories`, `categories.delete`).

> ⚠ El orden de las rutas importa: los segmentos literales (`/stats`, `/save`, `/groups`, `/basket`, `/random`,
> `/evaluate`, `/refs`) se declaran **antes** que el comodín `/:id`, y todos los nombres llevan el prefijo
> `mcq-*` para evitar colisiones con las rutas genéricas de `melis-react-api`.

**La lógica de negocio permanece en el servidor.** Estos controladores solo validan la entrada, ejecutan una transacción y
dan forma al JSON; el trabajo real está en los servicios del motor que resuelven.

## Capacidades (derechos avanzados)

`config/react.capabilities.php` está indexado bajo el nodo de menú portador de derechos **`meliscmsmcq_tool`** —
la misma melisKey que protegen los controladores. El acceso a la herramienta en sí sigue siendo
`MelisCoreRights::canAccess('meliscmsmcq_tool')`; estas capacidades controlan el acceso a **componentes dentro** de una
herramienta ya autorizada. Permiso por defecto: un usuario/rol sin la sección de capacidades conserva
todo.

Cadenas de capacidad aplanadas:

- **`mcq`**, `mcq.create`, `mcq.edit`, `mcq.delete`, `mcq.export`; `mcq.composition` (página de composición —
  también controla los endpoints de cesta + búsqueda/aleatorio), `mcq.properties`, `mcq.preview`,
  `mcq.preview.test`
- **`questions`**, `questions.create`, `questions.edit`, `questions.delete`, `questions.export`;
  `questions.properties`, `questions.answers`
- **`groups`**, `groups.create`, `groups.edit`, `groups.delete`, `groups.export`
- **`categories`**, `categories.create`, `categories.edit`, `categories.delete`, `categories.export`

Las cuatro claves de nivel superior (`mcq`, `questions`, `groups`, `categories`) son las cuatro pestañas de lista. React
las lee mediante `useCaps(MELIS_KEY)` y oculta pestañas/botones en consecuencia; el `denyUnlessCan()`
del lado del servidor es la aplicación real.

## Servicios del motor utilizados

MelisCmsMcq no registra servicios propios — sus controladores React resuelven alias de
**MelisCmsMcqEngine** en tiempo de ejecución:

| Alias de servicio del motor | Usado por este módulo para |
| --- | --- |
| `MelisCmsMcqQuestionsService` | CRUD de preguntas, lista de cesta, selección aleatoria (`getRandomQuestionIds`) |
| `MelisCmsMcqAnswersService` | CRUD de respuestas (editor de preguntas) |
| `MelisCmsMcqQuestionCategoryService` | CRUD de categorías de preguntas |
| `MelisCmsMcqGroupsService` | CRUD de grupos MCQ |
| `MelisCmsMcqService` | CRUD de MCQ, generación de XML (`generateMcqXml`), obtención (`getMcq`), puntuación (`evaluateAnswers`), eliminación (`deleteMcqById`) |

## Tablas de base de datos

Todas las tablas pertenecen a **MelisCmsMcqEngine**. Las superficies del BO en este módulo se corresponden con ellas de la
siguiente manera:

| Tabla del motor | Superficie del BO que escribe en ella |
| --- | --- |
| `melis_cms_mcq_questions` + `_trans` | Pestaña Questions + editor de preguntas |
| `melis_cms_mcq_answers` + `_trans` | Editor de respuestas (dentro del editor de preguntas) |
| `melis_cms_mcq_question_groups` + `_trans` | Pestaña Question categories |
| `melis_cms_mcq_groups` + `_trans` | Pestaña MCQ groups (vinculada a un MCQ mediante `mcqg_mcq_id`) |
| `melis_cms_mcq` + `_trans` | Pestaña MCQ; test ensamblado almacenado como XML en `mcq_xml` |
| `melis_cms_mcq_questions_list` | Pertenencia de pregunta a grupo MCQ |
| `melis_cms_mcq_baskets` | Questions Favorites por usuario |

> **Precaución con la nomenclatura.** Las "Question categories" de la interfaz se corresponden con `melis_cms_mcq_question_groups`; los
> "MCQ groups" de la interfaz se corresponden con `melis_cms_mcq_groups`. Dos tablas de "grupo" separadas con propósitos
> distintos — consulta la documentación de MelisCmsMcqEngine.

## Integración de etiquetas

`config/app.interface.php` registra una asociación de **MelisCmsTags** para que las preguntas sean etiquetables
(tipo de asociación `MCQ_QUESTION`, tabla de entidad `melis_cms_mcq_questions`, clave primaria `mcqq_id`). La
lista de preguntas expone una columna de **etiquetas** y un **filtro de etiquetas** impulsados por este registro; en la
herramienta React las etiquetas también forman parte del payload `refs` de la pregunta.

## Front-office

MelisCmsMcq no tiene salida propia en el front-office. El renderizador del quiz es un view helper
(`renderMcqQuestions`) registrado en **MelisCmsMcqEngine**; la pestaña Preview lo usa a través del motor.
Consulta la [referencia de MelisCmsMcqEngine](/legacy/reference/modules/melis-cms-mcq-engine) para
los detalles del renderizado en el front-office.

## Archivos clave

| Aspecto | Ruta |
| --- | --- |
| Rutas de la API React + 4 controladores invocables | `config/react-api.php` |
| Mapa de capacidades de derechos avanzados | `config/react.capabilities.php` |
| Bootstrap del módulo (fusiona las dos configuraciones anteriores) | `src/Module.php` |
| Trait compartido del controlador (MELIS_KEY, denyUnlessAccess, json/error/tr) | `src/Controller/McqReactApiTrait.php` |
| MCQ list/get/save/preview/evaluate/delete | `src/Controller/MelisReactApiMcqController.php` |
| Preguntas + respuestas + cesta + sorteo aleatorio | `src/Controller/MelisReactApiMcqQuestionController.php` |
| Grupos MCQ | `src/Controller/MelisReactApiMcqGroupController.php` |
| Categorías de preguntas | `src/Controller/MelisReactApiMcqCategoryController.php` |
| Fuente del brick React (Vite IIFE) | `ui-react/src/` (`brick.tsx`, `McqPage.tsx`, `McqBuilder.tsx`, `QuestionEditor.tsx`, `mcq-api.ts`, …) |
| Bundle del brick compilado + manifiesto | `public/ui-react/{brick.js, brick.manifest.json}` |
| Herramienta heredada (árbol, pestañas, DataTables, vistas, JS) | `config/app.interface.php`, `config/app.tools.php`, `src/Controller/`, `view/`, `public/js/` |

Consulta también: [melis-cms-mcq-engine](/legacy/reference/modules/melis-cms-mcq-engine),
[melis-cms-tags](/legacy/reference/modules/melis-cms-tags),
[melis-cms](/legacy/reference/modules/melis-cms),
[melis-core](/legacy/reference/modules/melis-core)
