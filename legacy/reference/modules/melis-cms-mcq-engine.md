# MelisCmsMcqEngine

> Data, services, XML snapshots, scoring, and front-office quiz renderer for the MCQ (quiz) system.
> Package `melisplatform/melis-cms-mcq-engine`.

## Purpose

MelisCmsMcqEngine is the **data and service layer** of the MCQ system: it owns the database tables,
the services for questions, answers, MCQs, groups and categories, the **XML snapshot** that freezes
each assembled test, the **random-model** question picker, **answer scoring / passing-rate**
evaluation, and the **front-office quiz renderer**. The back-office UI that drives it is
**MelisCmsMcq** — the engine itself has no screens of its own. Think MelisEngine ↔ MelisCms, but
for quizzes.

The assembled test is stored as `mcq_xml` so rendering and scoring read a self-contained snapshot,
not a live join, ensuring the exact MCQ a user assembled is preserved even if underlying questions
are later edited.

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    // …
    'MelisCmsMcqEngine',
];
```

Requires: `melisplatform/melis-cms` (`^5.3`), `melisplatform/melis-cms-tags` (`^5.3`),
`laminas/laminas-paginator`, PHP `^8.1|^8.3`. The module ships `dbdeploy: true` so its tables are
created/updated automatically. Install chain: `melis-cms-mcq` → **`melis-cms-mcq-engine`** →
`melis-cms` + `melis-cms-tags`.

## Key services

All services extend MelisCore's general service and fire `*_start` / `*_end` events. Aliases are
registered in `config/module.config.php`.

| Service alias | Role |
| --- | --- |
| `MelisCmsMcqService` | MCQs: save, delete, list, generate/fetch MCQ XML, shuffle order, evaluate answers (scoring). |
| `MelisCmsMcqQuestionsService` | Questions: CRUD, XML generation, basket, random-model picker. |
| `MelisCmsMcqAnswersService` | Answers: CRUD, correct-answer check, answer count per question. |
| `MelisCmsMcqGroupsService` | MCQ groups: CRUD, assemble groups+questions for an MCQ, deactivate related MCQs. |
| `MelisCmsMcqQuestionCategoryService` | Question categories (table `melis_cms_mcq_question_groups`): CRUD. |

### Selected methods

**`MelisCmsMcqService`**

| Method | Role |
| --- | --- |
| `getMcq($mcqId)` | Returns the assembled MCQ XML; shuffles question order if `mcq_random_order` is set. |
| `generateMcqXml($mcqProperties, $mcqTrans, $groupsData)` | Builds the full test XML from groups + questions and stores it in `mcq_xml`. |
| `evaluateAnswers($mcqXml, $userAnswers, $passingPercentage)` | Scores an MCQ-type submission; skips Open Ended; returns score + pass/fail. |
| `getMcqList` / `saveMcqItem` / `deleteMcqById` | Standard list/save/delete. |

**`MelisCmsMcqQuestionsService`**

| Method | Role |
| --- | --- |
| `generateQuestionXml()` | Builds the per-question XML snapshot on save. |
| `updateMcqQuestionDataXml()` | Refreshes the question snapshot inside every MCQ that uses it. |
| `getRandomQuestionIds($difficultyId, $categoryId, $tagId, $numberOfQuestions, $excludedIds)` | Auto-selects N question IDs by difficulty / category / tag. |
| `generateRandomQuestions($userId, $difficultyId, $categoryId, $tags, $numberOfQuestions, $langId, $alreadySelected)` | Higher-level random picker with exclusion list. |
| `getQuestionsBasketList` / `processBasketQuestions` | Manages the per-user question basket (cart). |

## Front office

| Item | Role |
| --- | --- |
| `renderMcqQuestions` view helper (`McqQuestionRendererHelper`) | Converts `mcq_xml` to an array and renders the quiz through the chosen template. No MelisTemplatingPlugin — the host template decides placement. |
| Default template | `view/templates/default-preview-template.phtml` |
| `McqPreviewTemplatesSelect` form-element factory | Populates a select with templates registered under `mcq_preview_templates` in `app.interface.php`. |

Additional form-element factories used by the back-office: `McqQuestionCategoriesSelect`,
`McqQuestionsDifficultySelect`, `QuestionsTypesSelect`.

## Database tables

> **Naming note.** The back-office "Question categories" map to `melis_cms_mcq_question_groups`
> (service `MelisCmsMcqQuestionCategoryService`). The back-office "MCQ groups" map to
> `melis_cms_mcq_groups` (service `MelisCmsMcqGroupsService`). Two distinct "group" tables —
> do not conflate them.

| Table | Holds |
| --- | --- |
| `melis_cms_mcq` | An MCQ/test: `mcq_status`, `mcq_code`, `mcq_random_order`, **`mcq_xml`** (assembled test snapshot), `mcq_passing_rate`, dates/users. |
| `melis_cms_mcq_trans` | MCQ name per language (`mcqt_name`). |
| `melis_cms_mcq_questions` | A question: `mcqq_status`, `mcqq_code`, `mcqq_type`, `mcqq_group_id`, `mcqq_difficulty_id`, **`mcqq_xml`** (question+answers snapshot). |
| `melis_cms_mcq_questions_trans` | Question text, `mcqqt_candidate_note`, `mcqqt_corrector_note` per language. |
| `melis_cms_mcq_answers` | An answer: `mcqa_question_id`, `mcqa_status`, `mcqa_correct_answer`, `mcqa_code`. |
| `melis_cms_mcq_answers_trans` | Answer text per language (`mcqat_answer_text`). |
| `melis_cms_mcq_question_types` | Question types: 1 = MCQ, 2 = Open Ended. |
| `melis_cms_mcq_questions_difficulty` (+`_trans`) | Difficulties: 1 = Easy, 2 = Medium, 3 = Hard. |
| `melis_cms_mcq_question_groups` (+`_trans`) | Question categories (`mcqqg_id`, `mcqqg_code`, `mcqqgt_name`). |
| `melis_cms_mcq_groups` (+`_trans`) | MCQ groups (`mcqg_id`, `mcqg_mcq_id`, `mcqg_code`, `mcqgt_name`), tied to a specific MCQ. |
| `melis_cms_mcq_questions_list` | Links questions ↔ an MCQ (`mcmql_mcq_id`, `mcmql_question_id`). |
| `melis_cms_mcq_groups_list` | Links groups within an MCQ (added by migration). |
| `melis_cms_mcq_questions_tags_list` | Question ↔ tag links (MelisCmsTags). |
| `melis_cms_mcq_baskets` | Per-user question basket (cart). |

## Example

```php
$sm = $this->getServiceLocator();

// --- Fetch and render a quiz ---
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
// $result['global'] => ['score', 'pass', 'total', 'checked', 'skipped']
// $result['details'] => per-question outcome

// --- Random model: auto-select N questions ---
$qSvc = $sm->get('MelisCmsMcqQuestionsService');
$ids  = $qSvc->getRandomQuestionIds(
    $difficultyId,
    $categoryId,
    $tagId,
    $numberOfQuestions,
    $excludedIds
);
```

## Key files

| Concern | Path |
| --- | --- |
| Module wiring + service aliases | `vendor/melisplatform/melis-cms-mcq-engine/config/module.config.php` |
| Plugin config (default groups, preview templates) | `vendor/melisplatform/melis-cms-mcq-engine/config/app.interface.php` |
| MCQ service (XML, scoring) | `vendor/melisplatform/melis-cms-mcq-engine/src/Service/MelisCmsMcqService.php` |
| Questions service (basket, random model) | `vendor/melisplatform/melis-cms-mcq-engine/src/Service/MelisCmsMcqQuestionsService.php` |
| Answers service | `vendor/melisplatform/melis-cms-mcq-engine/src/Service/MelisCmsMcqAnswersService.php` |
| Groups service | `vendor/melisplatform/melis-cms-mcq-engine/src/Service/MelisCmsMcqGroupsService.php` |
| Question category service | `vendor/melisplatform/melis-cms-mcq-engine/src/Service/MelisCmsMcqQuestionCategoryService.php` |
| Table gateways | `vendor/melisplatform/melis-cms-mcq-engine/src/Model/Tables/` |
| Form-element factories | `vendor/melisplatform/melis-cms-mcq-engine/src/Form/Factory/` |
| View helper | `vendor/melisplatform/melis-cms-mcq-engine/src/View/Helper/McqQuestionRendererHelper.php` |
| Default front template | `vendor/melisplatform/melis-cms-mcq-engine/view/templates/default-preview-template.phtml` |
| DB install + migrations | `vendor/melisplatform/melis-cms-mcq-engine/install/dbdeploy/` |

See also: [Module reference](/legacy/reference/modules) · [MelisCmsMcq](/legacy/reference/modules/melis-cms-mcq) ·
[MelisCms](/legacy/reference/modules/melis-cms)
