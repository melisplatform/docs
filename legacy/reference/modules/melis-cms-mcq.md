# MelisCmsMcq

> Back-office MCQ (multiple-choice questionnaire / quiz) builder for the Melis CMS.
> Package `melisplatform/melis-cms-mcq`.

## Purpose

MelisCmsMcq is the **UI half** of the MCQ system. It provides the backoffice workbench where you
author **questions** (with answers, type, difficulty, category and tags), organise them into
**question categories** and **MCQ groups**, and assemble **MCQs** (tests) either by hand via a
per-user **basket** or automatically via a **random model**. It has no data layer of its own: all
persistence (tables, services, scoring, XML snapshots and front-office rendering) is delegated to
the companion module **MelisCmsMcqEngine**.

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisCmsMcq',
];
```

Requires `melisplatform/melis-cms-mcq-engine` (`^5.3`) and `laminas/laminas-paginator`. Also
requires **MelisCms**, **MelisCore** (backoffice) and **MelisCmsTags** (question tagging) to be
loaded. Install chain: `MelisCmsMcq` → `melis-cms-mcq-engine` → `melis-cms` + `melis-cms-tags`.

## Key services

MelisCmsMcq itself registers no services — its controllers resolve aliases from **MelisCmsMcqEngine**
at runtime:

| Engine service alias | Used by this module for |
| --- | --- |
| `MelisCmsMcqQuestionsService` | Questions CRUD, basket list (`getQuestionsBasketList`), random selection (`getRandomQuestionIds`) |
| `MelisCmsMcqAnswersService` | Answers CRUD (question editor) |
| `MelisCmsMcqQuestionCategoryService` | Question categories CRUD |
| `MelisCmsMcqGroupsService` | MCQ groups CRUD |
| `MelisCmsMcqService` | MCQ CRUD, XML generation (`generateMcqXml`), fetch (`getMcq`), scoring (`evaluateAnswers`) |

Form-element factories also come from the engine: `McqQuestionCategoriesSelect`,
`McqQuestionsDifficultySelect`, `QuestionsTypesSelect`, `McqPreviewTemplatesSelect`.

## Backoffice

Accessible via **Left menu → MelisCms → MCQ** (`fa fa-list`). The tool exposes four tabs and a
**Questions Favorites** header button (a per-user bookmarked question shortlist).

| Tab | What it manages |
| --- | --- |
| **MCQ** | Filterable DataTable of assembled tests (`#tableMcq` → `/MelisCmsMcq/getMcqList`): id, status, code, name, creation date, total groups, total questions |
| **Questions** | DataTable of questions (`#tableMcqQuestions` → `/McqQuestions/getQuestionsList`): id, status, question text, answer count, type, difficulty, category, tags — with category/type/status/difficulty/tags/search filters; bookmark action adds to basket |
| **Question Categories** | DataTable (`#tableMcqQuestionCategories` → `/McqQuestions/getQuestionCategoriesList`): id, status, code, category name — add/edit modal (Status, Code, Name per language) |
| **MCQ Groups** | DataTable (`#tableMcqGroups` → `/MelisCmsMcq/getMcqGroupsList`): id, status, code, group name — add/edit modal |

### MCQ editor

Opening an MCQ entry shows a three-tab editor:

| Editor tab | Content |
| --- | --- |
| **Properties** | Name, code, status, **Minimum score required (%)** (passing rate), **Change questions order at every MCQ creation** toggle |
| **Questions** | Add/remove MCQ groups; populate each group by dragging questions from the **Questions Favorites** or **Search Questions** side panels; **Configure a random MCQ** button opens the Random Model modal |
| **Preview** | Pick a rendering template, take the assembled test, then submit to see the **Correction** panel (score, pass/fail, per-question user answer vs correct answer) |

The **Random Model** modal (`meliscmsmcq_mcq_page_random_model_modal`) lets you define per-group
criteria rows: Difficulty / Category / Tag / Number. Saving calls the engine's
`getRandomQuestionIds` to resolve the matching question IDs.

### Question editor

Opening a question shows a two-tab editor:

| Editor tab | Content |
| --- | --- |
| **Properties** | Code, Type (MCQ / Open Ended), Category, Tags, Difficulty, Status; per language: Question text, Note for candidate |
| **Answers** | List of answers each with text, a **Correct Answer (Yes/No)** flag, a code, a status; drag the ✛ handle to reorder; **Add an answer** button |

## Front office

MelisCmsMcq has no front-office output of its own. The quiz renderer is a view helper
(`renderMcqQuestions`) registered in **MelisCmsMcqEngine**; the Preview tab uses it via the engine.
See the [MelisCmsMcqEngine reference](/legacy/reference/modules/melis-cms-mcq-engine) for front-office
rendering details.

## Database tables

All tables are owned by **MelisCmsMcqEngine**. The BO surfaces in this module map to them as
follows:

| Engine table | BO surface that writes to it |
| --- | --- |
| `melis_cms_mcq_questions` + `_trans` | Questions tab + question editor |
| `melis_cms_mcq_answers` + `_trans` | Answers editor (inside question editor) |
| `melis_cms_mcq_question_groups` + `_trans` | Question Categories tab (note: "question groups" in the DB, "categories" in the UI) |
| `melis_cms_mcq_groups` + `_trans` | MCQ Groups tab (tied to an MCQ via `mcqg_mcq_id`) |
| `melis_cms_mcq` + `_trans` | MCQ tab; assembled test stored as XML in `mcq_xml` |
| `melis_cms_mcq_questions_list` | Question-to-MCQ-group membership |
| `melis_cms_mcq_baskets` | Questions Favorites per user |

> **Naming caution.** The UI's "Question categories" map to `melis_cms_mcq_question_groups`; the
> UI's "MCQ groups" map to `melis_cms_mcq_groups`. Two separate "group" tables with different
> purposes — see the MelisCmsMcqEngine doc.

## Tags integration

`config/app.interface.php` registers a **MelisCmsTags** association so that questions are taggable:

```php
'melis_cms_tag' => ['datas' => ['associations' => [
    'meliscmsmcq' => [
        'module'           => 'MelisCmsMcq',
        'entity_type'      => 'MCQ_QUESTION',
        'entity_table'     => 'melis_cms_mcq_questions',
        'entity_primary_id'=> 'mcqq_id',
        'trans' => [
            'trans_table'      => 'melis_cms_mcq_questions_trans',
            'trans_foreign_id' => 'mcqqt_question_id',
            'trans_lang_key'   => 'mcqqt_lang_id',
        ],
        'association_title_key' => 'mcqqt_question_text',
    ],
]]],
```

Association type is `MCQ_QUESTION`. The Questions DataTable shows a **tags** column and a **tags
filter** driven by this registration.

## Key files

| Concern | Path |
| --- | --- |
| Routes + controller registrations | `vendor/melisplatform/melis-cms-mcq/config/module.config.php` |
| Backoffice tool tree, tabs, editor pages, modals, Tags association | `vendor/melisplatform/melis-cms-mcq/config/app.interface.php` |
| DataTable configurations (4 tables) | `vendor/melisplatform/melis-cms-mcq/config/app.tools.php` |
| MCQ + groups + random model + preview controller | `vendor/melisplatform/melis-cms-mcq/src/Controller/MelisCmsMcqController.php` |
| Questions + categories + basket controller | `vendor/melisplatform/melis-cms-mcq/src/Controller/McqQuestionsController.php` |
| Flash-messenger listener | `vendor/melisplatform/melis-cms-mcq/src/Listener/MelisCmsMcqFlashMessengerListener.php` |
| Views (question editor, MCQ editor, basket, random model, preview) | `vendor/melisplatform/melis-cms-mcq/view/melis-cms-mcq/` |
| JS (questions, MCQ, groups, categories, preview, multi-select) | `vendor/melisplatform/melis-cms-mcq/public/js/` |

See also: [melis-cms-mcq-engine](/legacy/reference/modules/melis-cms-mcq-engine),
[melis-cms-tags](/legacy/reference/modules/melis-cms-tags),
[melis-cms](/legacy/reference/modules/melis-cms),
[melis-core](/legacy/reference/modules/melis-core)
