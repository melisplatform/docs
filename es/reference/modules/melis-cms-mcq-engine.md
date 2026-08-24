# MelisCmsMcqEngine

> Datos, servicios, instantáneas XML, puntuación y renderizador de cuestionarios de front-office para el sistema MCQ (cuestionarios) — el backend detrás de la herramienta MCQ de React. Paquete `melisplatform/melis-cms-mcq-engine`.

## Propósito

MelisCmsMcqEngine es la **capa de datos y servicios** del sistema MCQ: gestiona las tablas de base de datos,
los servicios para preguntas, respuestas, MCQ, grupos y categorías, la **instantánea XML** que congela
cada test ensamblado, el selector de preguntas del **modelo aleatorio**, la evaluación de **puntuación de respuestas / tasa de aprobación**,
y el **renderizador de cuestionarios de front-office**. Piense en MelisEngine ↔ MelisCms, pero para cuestionarios.

El test ensamblado se almacena como `mcq_xml`, de modo que el renderizado y la puntuación leen una instantánea autocontenida,
no una unión (join) en vivo, garantizando que el MCQ exacto que un usuario ensambló se conserve incluso si las preguntas
subyacentes se editan posteriormente.

## Sin brick React — expuesto a través de MelisCmsMcq

Este motor **no tiene interfaz de back-office propia** — ni heredada (legacy) ni React. No incluye **ningún**
`brick.manifest.json`, **ningún** proyecto `ui-react/`, **ningún** `config/react-api.php` ni **ningún**
`config/react.capabilities.php`. **No** aparece listado por `GET /melis/react-api/react-modules`,
no figura en ningún menú de React y no aporta ningún nodo de capacidad.

En `/melis-react` la funcionalidad MCQ reside enteramente en la herramienta **MelisCmsMcq** (barra lateral →
**MelisCms → MCQ**; brick `cms-mcq`, ruta `/melis-cms/mcq`, `melisKey` `meliscmsmcq_tool`). Los
controladores `react-api` de esa herramienta resuelven **los servicios de este motor** y les delegan toda la lógica de negocio
— los mismos servicios que usaba la herramienta heredada. La ruta React → `react-api` → **servicio del motor**
simplemente sustituye a la ruta heredada jQuery/AJAX → controlador → **servicio del motor**; no existe código de motor específico de React. Los derechos de acceso y las capacidades de derechos avanzados residen todos en el nodo **MelisCmsMcq**
(`meliscmsmcq_tool`), no aquí — el `rightsDisplay` del motor es `'none'`.

## Cómo activarlo

Añádalo a `config/melis.module.load.php`:

```php
return [
    // …
    'MelisCmsMcqEngine',
];
```

Requiere: `melisplatform/melis-cms` (`^5.3`), `melisplatform/melis-cms-tags` (`^5.3`),
`laminas/laminas-paginator`, PHP `^8.1|^8.3`. El módulo incluye `dbdeploy: true`, por lo que sus tablas se
crean/actualizan automáticamente. Cadena de instalación: `melis-cms-mcq` → **`melis-cms-mcq-engine`** →
`melis-cms` + `melis-cms-tags`.

## Servicios clave

Todos los servicios extienden el servicio general de MelisCore y disparan eventos `*_start` / `*_end`. Los alias se
registran en `config/module.config.php` y son los puntos de entrada exactos que resuelven los controladores React de MelisCmsMcq.

| Alias de servicio | Función | Consumido por (controlador React de MelisCmsMcq) |
| --- | --- | --- |
| `MelisCmsMcqService` | MCQ: guardar, eliminar, listar, generar/obtener el XML del MCQ, mezclar el orden, evaluar respuestas (puntuación). | `MelisReactApiMcqController` |
| `MelisCmsMcqQuestionsService` | Preguntas: CRUD, generación de XML, cesta, selector de modelo aleatorio. | `MelisReactApiMcqQuestionController` |
| `MelisCmsMcqAnswersService` | Respuestas: CRUD, comprobación de respuesta correcta, recuento de respuestas por pregunta. | `MelisReactApiMcqQuestionController` |
| `MelisCmsMcqGroupsService` | Grupos de MCQ: CRUD, ensamblar grupos+preguntas para un MCQ, desactivar los MCQ relacionados. | `MelisReactApiMcqGroupController` |
| `MelisCmsMcqQuestionCategoryService` | Categorías de preguntas (tabla `melis_cms_mcq_question_groups`): CRUD. | `MelisReactApiMcqCategoryController` |

### Métodos seleccionados

**`MelisCmsMcqService`**

| Método | Función |
| --- | --- |
| `getMcq($mcqId)` | Devuelve el XML del MCQ ensamblado; mezcla el orden de las preguntas si `mcq_random_order` está activado. |
| `generateMcqXml($mcqProperties, $mcqTrans, $groupsData)` | Construye el XML completo del test a partir de grupos + preguntas y lo almacena en `mcq_xml`. |
| `evaluateAnswers($mcqXml, $userAnswers, $passingPercentage)` | Puntúa un envío de tipo MCQ; omite las preguntas de respuesta abierta (Open Ended); devuelve la puntuación + aprobado/suspendido. |
| `xmlToArray($mcqXml)` | Analiza la instantánea congelada `mcq_xml` convirtiéndola en un array (usado por la vista previa de React). |
| `getMcqList` / `saveMcqItem` / `deleteMcqById` | Listado/guardado/eliminación estándar. |

**`MelisCmsMcqQuestionsService`**

| Método | Función |
| --- | --- |
| `generateQuestionXml()` | Construye la instantánea XML por pregunta al guardar. |
| `updateMcqQuestionDataXml()` | Actualiza la instantánea de la pregunta dentro de cada MCQ que la utiliza. |
| `getRandomQuestionIds($difficultyId, $categoryId, $tagId, $numberOfQuestions, $excludedIds)` | Selecciona automáticamente N IDs de preguntas por dificultad / categoría / etiqueta. |
| `generateRandomQuestions($userId, $difficultyId, $categoryId, $tags, $numberOfQuestions, $langId, $alreadySelected)` | Selector aleatorio de nivel superior con lista de exclusión. |
| `getQuestionsBasketList` / `processBasketQuestions` | Gestiona la cesta de preguntas por usuario (carrito). |

## Cómo la herramienta MCQ de React usa este motor

Los controladores React del MCQ organizan el intercambio de JSON de entrada/salida y delegan toda la lógica al motor. Los principales
puntos de contacto del lado del servidor (desde `melis-cms-mcq/src/Controller/MelisReactApi*Controller.php`):

```php
// POST /melis/react-api/mcq/save  → MelisReactApiMcqController::saveAction()
$mcqService = $this->getServiceManager()->get('MelisCmsMcqService');
$mcqXml = $mcqService->generateMcqXml($mcqProperties, $mcqTrans, $groupsData); // engine assembles snapshot

// POST /melis/react-api/mcq/evaluate  → evaluateAction()
$result = $mcqService->evaluateAnswers($xml, $answers, $passing);              // engine scores; React displays

// GET  /melis/react-api/mcq/:id/preview  → previewAction()
$xml    = $mcqService->getMcq($id);            // frozen test XML (shuffled if mcq_random_order)
$parsed = (array) $mcqService->xmlToArray($xml);

// POST /melis/react-api/mcq-questions/random  → MelisReactApiMcqQuestionController::randomAction()
$ids = $questionService->getRandomQuestionIds($difficulty, $category, $tagId, $count, $exclude);
```

La **vista previa** de React renderiza directamente el `mcq_xml` ya analizado (`getMcq` + `xmlToArray`); **no**
llama al view helper `renderMcqQuestions` del motor — ese helper es únicamente el renderizador del front-office /
sitio web, y el back-office de React no lo modifica.

## Front office

| Elemento | Función |
| --- | --- |
| View helper `renderMcqQuestions` (`McqQuestionRendererHelper`) | Convierte `mcq_xml` en un array y renderiza el cuestionario mediante la plantilla elegida. Sin MelisTemplatingPlugin — la plantilla anfitriona decide la ubicación. |
| Plantilla por defecto | `view/templates/default-preview-template.phtml` |
| Factoría de elementos de formulario `McqPreviewTemplatesSelect` | Rellena un select con las plantillas registradas bajo `mcq_preview_templates` en `app.interface.php`. |

Factorías de elementos de formulario adicionales que el motor registra: `McqQuestionCategoriesSelect`,
`McqQuestionsDifficultySelect`, `QuestionsTypesSelect`. La herramienta React construye sus propias referencias JSON
(tipos, dificultades, categorías) en lugar de renderizar estos elementos select de Laminas, pero los
datos subyacentes del motor (tipos 1=MCQ / 2=Open Ended, dificultades Easy/Medium/Hard, categorías) son
los mismos. El `app.interface.php` del motor sigue registrando el plugin `meliscmsmcqengine` con
`datas` (`mcq_groups.default_group_lists`, `mcq_preview_templates`) — valores por defecto que la herramienta MCQ respeta
independientemente del front-end.

## Tablas de base de datos

> **Nota sobre la nomenclatura.** Las "Categorías de preguntas" del back-office se corresponden con `melis_cms_mcq_question_groups`
> (servicio `MelisCmsMcqQuestionCategoryService`). Los "Grupos de MCQ" del back-office se corresponden con
> `melis_cms_mcq_groups` (servicio `MelisCmsMcqGroupsService`). Dos tablas de "grupo" distintas —
> no las confunda.

| Tabla | Contiene |
| --- | --- |
| `melis_cms_mcq` | Un MCQ/test: `mcq_status`, `mcq_code`, `mcq_random_order`, **`mcq_xml`** (instantánea del test ensamblado), `mcq_passing_rate`, fechas/usuarios. |
| `melis_cms_mcq_trans` | Nombre del MCQ por idioma (`mcqt_name`). |
| `melis_cms_mcq_questions` | Una pregunta: `mcqq_status`, `mcqq_code`, `mcqq_type`, `mcqq_group_id`, `mcqq_difficulty_id`, **`mcqq_xml`** (instantánea de pregunta+respuestas). |
| `melis_cms_mcq_questions_trans` | Texto de la pregunta, `mcqqt_candidate_note`, `mcqqt_corrector_note` por idioma. |
| `melis_cms_mcq_answers` | Una respuesta: `mcqa_question_id`, `mcqa_status`, `mcqa_correct_answer`, `mcqa_code`. |
| `melis_cms_mcq_answers_trans` | Texto de la respuesta por idioma (`mcqat_answer_text`). |
| `melis_cms_mcq_question_types` | Tipos de pregunta: 1 = MCQ, 2 = Open Ended. |
| `melis_cms_mcq_questions_difficulty` (+`_trans`) | Dificultades: 1 = Easy, 2 = Medium, 3 = Hard. |
| `melis_cms_mcq_question_groups` (+`_trans`) | Categorías de preguntas (`mcqqg_id`, `mcqqg_code`, `mcqqgt_name`). |
| `melis_cms_mcq_groups` (+`_trans`) | Grupos de MCQ (`mcqg_id`, `mcqg_mcq_id`, `mcqg_code`, `mcqgt_name`), vinculados a un MCQ específico. |
| `melis_cms_mcq_questions_list` | Vincula preguntas ↔ un MCQ (`mcmql_mcq_id`, `mcmql_question_id`). |
| `melis_cms_mcq_groups_list` | Vincula grupos dentro de un MCQ (añadida por migración). |
| `melis_cms_mcq_questions_tags_list` | Vínculos pregunta ↔ etiqueta (MelisCmsTags). |
| `melis_cms_mcq_baskets` | Cesta de preguntas por usuario (carrito). |

## Ejemplo

```php
$sm = $this->getServiceLocator();

// --- Fetch and render a quiz on a website ---
$mcqSvc = $sm->get('MelisCmsMcqService');
$mcqXml = $mcqSvc->getMcq($mcqId); // shuffles if mcq_random_order is set

// In a phtml template:
echo $this->renderMcqQuestions(
    'MelisCmsMcqEngine/default-template',
    $mcqXml,
    $langId
);

// --- Score a submission ---
$result = $mcqSvc->evaluateAnswers($mcqXml, $userAnswers, 50);
// $result['global']  => ['score', 'pass', 'total', 'checked', 'skipped']
// $result['details'] => per-question outcome

// --- Random model: auto-select N questions ---
$qSvc = $sm->get('MelisCmsMcqQuestionsService');
$ids  = $qSvc->getRandomQuestionIds($difficultyId, $categoryId, $tagId, $numberOfQuestions, $excludedIds);
```

## Archivos clave

| Aspecto | Ruta |
| --- | --- |
| Conexión del módulo + alias de servicios | `vendor/melisplatform/melis-cms-mcq-engine/config/module.config.php` |
| Configuración del plugin (grupos por defecto, plantillas de vista previa) | `vendor/melisplatform/melis-cms-mcq-engine/config/app.interface.php` |
| Servicio MCQ (XML, puntuación) | `vendor/melisplatform/melis-cms-mcq-engine/src/Service/MelisCmsMcqService.php` |
| Servicio de preguntas (cesta, modelo aleatorio) | `vendor/melisplatform/melis-cms-mcq-engine/src/Service/MelisCmsMcqQuestionsService.php` |
| Servicio de respuestas | `vendor/melisplatform/melis-cms-mcq-engine/src/Service/MelisCmsMcqAnswersService.php` |
| Servicio de grupos | `vendor/melisplatform/melis-cms-mcq-engine/src/Service/MelisCmsMcqGroupsService.php` |
| Servicio de categorías de preguntas | `vendor/melisplatform/melis-cms-mcq-engine/src/Service/MelisCmsMcqQuestionCategoryService.php` |
| Table gateways | `vendor/melisplatform/melis-cms-mcq-engine/src/Model/Tables/` |
| Factorías de elementos de formulario | `vendor/melisplatform/melis-cms-mcq-engine/src/Form/Factory/` |
| View helper | `vendor/melisplatform/melis-cms-mcq-engine/src/View/Helper/McqQuestionRendererHelper.php` |
| Plantilla front por defecto | `vendor/melisplatform/melis-cms-mcq-engine/view/templates/default-preview-template.phtml` |
| Instalación de BD + migraciones | `vendor/melisplatform/melis-cms-mcq-engine/install/dbdeploy/` |

Véase también: [Referencia de módulos](/es/reference/modules) · [MelisCmsMcq](/es/reference/modules/melis-cms-mcq) ·
[MelisCms](/es/reference/modules/melis-cms)
