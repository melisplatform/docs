# MelisCmsMcqEngine

> البيانات والخدمات ولقطات XML والتقييم وعارض الاختبارات في الواجهة الأمامية لنظام أسئلة الاختيار من متعدد (MCQ) — النظام الخلفي الذي تعتمد عليه أداة MCQ في React. الحزمة `melisplatform/melis-cms-mcq-engine`.

## الغرض

MelisCmsMcqEngine هو **طبقة البيانات والخدمات** لنظام MCQ: فهو يملك جداول قاعدة البيانات،
والخدمات الخاصة بالأسئلة والإجابات واختبارات MCQ والمجموعات والفئات، و**لقطة XML** التي تُجمّد
كل اختبار مُجمّع، ومُنتقي الأسئلة وفق **النموذج العشوائي**، وتقييم **درجات الإجابات / نسبة النجاح**،
و**عارض الاختبارات في الواجهة الأمامية**. تصوّره كعلاقة MelisEngine ↔ MelisCms، لكن للاختبارات.

يُخزَّن الاختبار المُجمَّع في `mcq_xml` بحيث يقرأ العرض والتقييم لقطة قائمة بذاتها،
وليس ربطًا حيًّا (live join)، مما يضمن الحفاظ على اختبار MCQ الذي جمّعه المستخدم بالضبط حتى لو
جرى تعديل الأسئلة الأساسية لاحقًا.

## لا توجد لبنة React — تظهر عبر MelisCmsMcq

لا يملك هذا المحرك **أي واجهة مستخدم خاصة به في المكتب الخلفي** — لا القديمة ولا React. فهو لا يشحن **أي**
ملف `brick.manifest.json`، ولا مشروع `ui-react/`، ولا ملف `config/react-api.php`، ولا ملف
`config/react.capabilities.php`. وهو **غير** مُدرَج في `GET /melis/react-api/react-modules`،
ولا يظهر في أي قائمة React، ولا يُساهم بأي عقدة قدرات (capability node).

في `/melis-react` تعيش ميزة MCQ بالكامل داخل أداة **MelisCmsMcq** (الشريط الجانبي ←
**MelisCms → MCQ**؛ اللبنة `cms-mcq`، المسار `/melis-cms/mcq`، `melisKey` هو `meliscmsmcq_tool`). تُحيل
وحدات التحكم `react-api` الخاصة بتلك الأداة إلى **خدمات هذا المحرك** وتُفوّض إليها كل منطق العمل
— نفس الخدمات التي استخدمتها الأداة القديمة. إن المسار React ← `react-api` ← **خدمة المحرك**
يحل ببساطة محل المسار القديم jQuery/AJAX ← وحدة التحكم ← **خدمة المحرك**؛ ولا يوجد أي كود محرك خاص بـ React.
كل حقوق الوصول وقدرات الحقوق المتقدمة تعيش على عقدة **MelisCmsMcq**
(`meliscmsmcq_tool`)، وليس هنا — وقيمة `rightsDisplay` للمحرك هي `'none'`.

## تفعيله

أضِف إلى `config/melis.module.load.php`:

```php
return [
    // …
    'MelisCmsMcqEngine',
];
```

يتطلب: `melisplatform/melis-cms` (`^5.3`)، و`melisplatform/melis-cms-tags` (`^5.3`)،
و`laminas/laminas-paginator`، وPHP `^8.1|^8.3`. تشحن الوحدة `dbdeploy: true` بحيث تُنشأ جداولها
وتُحدَّث تلقائيًا. سلسلة التثبيت: `melis-cms-mcq` ← **`melis-cms-mcq-engine`** ←
`melis-cms` + `melis-cms-tags`.

## الخدمات الرئيسية

جميع الخدمات تمتد من الخدمة العامة في MelisCore وتُطلق أحداث `*_start` / `*_end`. تُسجَّل الأسماء المستعارة (Aliases)
في `config/module.config.php` وهي نقاط الدخول الدقيقة التي تُحيل إليها وحدات تحكم MelisCmsMcq في React.

| الاسم المستعار للخدمة | الدور | يستهلكها (وحدة تحكم MelisCmsMcq في React) |
| --- | --- | --- |
| `MelisCmsMcqService` | اختبارات MCQ: الحفظ والحذف والسرد وتوليد/جلب XML الخاص بـ MCQ وخلط الترتيب وتقييم الإجابات (الدرجات). | `MelisReactApiMcqController` |
| `MelisCmsMcqQuestionsService` | الأسئلة: عمليات CRUD وتوليد XML والسلة ومُنتقي النموذج العشوائي. | `MelisReactApiMcqQuestionController` |
| `MelisCmsMcqAnswersService` | الإجابات: عمليات CRUD والتحقق من الإجابة الصحيحة وعدد الإجابات لكل سؤال. | `MelisReactApiMcqQuestionController` |
| `MelisCmsMcqGroupsService` | مجموعات MCQ: عمليات CRUD وتجميع المجموعات + الأسئلة لاختبار MCQ وتعطيل اختبارات MCQ المرتبطة. | `MelisReactApiMcqGroupController` |
| `MelisCmsMcqQuestionCategoryService` | فئات الأسئلة (الجدول `melis_cms_mcq_question_groups`): عمليات CRUD. | `MelisReactApiMcqCategoryController` |

### دوال مختارة

**`MelisCmsMcqService`**

| الدالة | الدور |
| --- | --- |
| `getMcq($mcqId)` | تُعيد XML الخاص باختبار MCQ المُجمَّع؛ وتخلط ترتيب الأسئلة إذا كانت `mcq_random_order` مُفعَّلة. |
| `generateMcqXml($mcqProperties, $mcqTrans, $groupsData)` | تبني XML الكامل للاختبار من المجموعات + الأسئلة وتخزّنه في `mcq_xml`. |
| `evaluateAnswers($mcqXml, $userAnswers, $passingPercentage)` | تُقيّم درجة إرسال من نوع MCQ؛ وتتخطى الأسئلة المفتوحة (Open Ended)؛ وتُعيد الدرجة + النجاح/الرسوب. |
| `xmlToArray($mcqXml)` | تحلّل لقطة `mcq_xml` المُجمَّدة إلى مصفوفة (تستخدمها معاينة React). |
| `getMcqList` / `saveMcqItem` / `deleteMcqById` | سرد/حفظ/حذف قياسي. |

**`MelisCmsMcqQuestionsService`**

| الدالة | الدور |
| --- | --- |
| `generateQuestionXml()` | تبني لقطة XML لكل سؤال عند الحفظ. |
| `updateMcqQuestionDataXml()` | تُحدّث لقطة السؤال داخل كل اختبار MCQ يستخدمه. |
| `getRandomQuestionIds($difficultyId, $categoryId, $tagId, $numberOfQuestions, $excludedIds)` | تختار تلقائيًا N من معرّفات الأسئلة حسب الصعوبة / الفئة / الوسم. |
| `generateRandomQuestions($userId, $difficultyId, $categoryId, $tags, $numberOfQuestions, $langId, $alreadySelected)` | مُنتقٍ عشوائي أعلى مستوى مع قائمة استبعاد. |
| `getQuestionsBasketList` / `processBasketQuestions` | تُدير سلة الأسئلة (cart) لكل مستخدم. |

## كيف تستخدم أداة MCQ في React هذا المحرك

تُنظّم وحدات تحكم MCQ في React بيانات JSON داخلًا وخارجًا وتُفوّض كل المنطق إلى المحرك. تظهر نقاط
التماس الرئيسية على جانب الخادم (من `melis-cms-mcq/src/Controller/MelisReactApi*Controller.php`) كالآتي:

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

تعرض **معاينة** React قيمة `mcq_xml` المُحلَّلة مباشرةً (`getMcq` + `xmlToArray`)؛ وهي **لا**
تستدعي مساعد العرض (view helper) `renderMcqQuestions` الخاص بالمحرك — فذلك المساعد هو عارض الواجهة الأمامية /
الموقع فقط، وهو غير متأثر بمكتب React الخلفي.

## الواجهة الأمامية

| العنصر | الدور |
| --- | --- |
| مساعد العرض `renderMcqQuestions` (`McqQuestionRendererHelper`) | يحوّل `mcq_xml` إلى مصفوفة ويعرض الاختبار عبر القالب المُختار. لا يوجد MelisTemplatingPlugin — قالب المُضيف هو من يقرّر موضع العرض. |
| القالب الافتراضي | `view/templates/default-preview-template.phtml` |
| مصنع عنصر النموذج `McqPreviewTemplatesSelect` | يملأ قائمة اختيار بالقوالب المُسجَّلة ضمن `mcq_preview_templates` في `app.interface.php`. |

مصانع عناصر النماذج الإضافية التي يسجّلها المحرك: `McqQuestionCategoriesSelect`،
و`McqQuestionsDifficultySelect`، و`QuestionsTypesSelect`. تبني أداة React مراجع JSON الخاصة بها
(الأنواع والصعوبات والفئات) بدلًا من عرض عناصر الاختيار هذه في Laminas، لكن بيانات المحرك
الأساسية (الأنواع 1=MCQ / 2=Open Ended، والصعوبات Easy/Medium/Hard، والفئات) هي
نفسها. لا يزال ملف `app.interface.php` الخاص بالمحرك يسجّل المُلحق `meliscmsmcqengine` مع
`datas` (`mcq_groups.default_group_lists`، `mcq_preview_templates`) — وهي الافتراضيات التي تلتزم بها أداة MCQ
بصرف النظر عن الواجهة الأمامية.

## جداول قاعدة البيانات

> **ملاحظة حول التسمية.** إن "فئات الأسئلة" (Question categories) في المكتب الخلفي تقابل `melis_cms_mcq_question_groups`
> (الخدمة `MelisCmsMcqQuestionCategoryService`). أما "مجموعات MCQ" (MCQ groups) في المكتب الخلفي فتقابل
> `melis_cms_mcq_groups` (الخدمة `MelisCmsMcqGroupsService`). جدولان مختلفان لـ "group" —
> لا تخلط بينهما.

| الجدول | يحتوي على |
| --- | --- |
| `melis_cms_mcq` | اختبار MCQ/test: `mcq_status`، و`mcq_code`، و`mcq_random_order`، و**`mcq_xml`** (لقطة الاختبار المُجمَّع)، و`mcq_passing_rate`، والتواريخ/المستخدمون. |
| `melis_cms_mcq_trans` | اسم MCQ لكل لغة (`mcqt_name`). |
| `melis_cms_mcq_questions` | سؤال: `mcqq_status`، و`mcqq_code`، و`mcqq_type`، و`mcqq_group_id`، و`mcqq_difficulty_id`، و**`mcqq_xml`** (لقطة السؤال + الإجابات). |
| `melis_cms_mcq_questions_trans` | نص السؤال، و`mcqqt_candidate_note`، و`mcqqt_corrector_note` لكل لغة. |
| `melis_cms_mcq_answers` | إجابة: `mcqa_question_id`، و`mcqa_status`، و`mcqa_correct_answer`، و`mcqa_code`. |
| `melis_cms_mcq_answers_trans` | نص الإجابة لكل لغة (`mcqat_answer_text`). |
| `melis_cms_mcq_question_types` | أنواع الأسئلة: 1 = MCQ، 2 = Open Ended. |
| `melis_cms_mcq_questions_difficulty` (+`_trans`) | الصعوبات: 1 = Easy، 2 = Medium، 3 = Hard. |
| `melis_cms_mcq_question_groups` (+`_trans`) | فئات الأسئلة (`mcqqg_id`، `mcqqg_code`، `mcqqgt_name`). |
| `melis_cms_mcq_groups` (+`_trans`) | مجموعات MCQ (`mcqg_id`، `mcqg_mcq_id`، `mcqg_code`، `mcqgt_name`)، مرتبطة باختبار MCQ محدد. |
| `melis_cms_mcq_questions_list` | يربط الأسئلة ↔ باختبار MCQ (`mcmql_mcq_id`، `mcmql_question_id`). |
| `melis_cms_mcq_groups_list` | يربط المجموعات ضمن اختبار MCQ (أُضيف عبر الترحيل). |
| `melis_cms_mcq_questions_tags_list` | روابط السؤال ↔ الوسم (MelisCmsTags). |
| `melis_cms_mcq_baskets` | سلة الأسئلة (cart) لكل مستخدم. |

## مثال

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

## الملفات الرئيسية

| المجال | المسار |
| --- | --- |
| ربط الوحدة + الأسماء المستعارة للخدمات | `vendor/melisplatform/melis-cms-mcq-engine/config/module.config.php` |
| إعدادات المُلحق (المجموعات الافتراضية، قوالب المعاينة) | `vendor/melisplatform/melis-cms-mcq-engine/config/app.interface.php` |
| خدمة MCQ (XML، التقييم) | `vendor/melisplatform/melis-cms-mcq-engine/src/Service/MelisCmsMcqService.php` |
| خدمة الأسئلة (السلة، النموذج العشوائي) | `vendor/melisplatform/melis-cms-mcq-engine/src/Service/MelisCmsMcqQuestionsService.php` |
| خدمة الإجابات | `vendor/melisplatform/melis-cms-mcq-engine/src/Service/MelisCmsMcqAnswersService.php` |
| خدمة المجموعات | `vendor/melisplatform/melis-cms-mcq-engine/src/Service/MelisCmsMcqGroupsService.php` |
| خدمة فئة الأسئلة | `vendor/melisplatform/melis-cms-mcq-engine/src/Service/MelisCmsMcqQuestionCategoryService.php` |
| بوابات الجداول (Table gateways) | `vendor/melisplatform/melis-cms-mcq-engine/src/Model/Tables/` |
| مصانع عناصر النماذج | `vendor/melisplatform/melis-cms-mcq-engine/src/Form/Factory/` |
| مساعد العرض | `vendor/melisplatform/melis-cms-mcq-engine/src/View/Helper/McqQuestionRendererHelper.php` |
| قالب الواجهة الأمامية الافتراضي | `vendor/melisplatform/melis-cms-mcq-engine/view/templates/default-preview-template.phtml` |
| تثبيت قاعدة البيانات + الترحيلات | `vendor/melisplatform/melis-cms-mcq-engine/install/dbdeploy/` |

اطّلع أيضًا على: [مرجع الوحدات](/ar/reference/modules) · [MelisCmsMcq](/ar/reference/modules/melis-cms-mcq) ·
[MelisCms](/ar/reference/modules/melis-cms)
