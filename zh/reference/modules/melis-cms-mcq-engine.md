# MelisCmsMcqEngine

> MCQ（测验）系统的数据、服务、XML 快照、评分和前台测验渲染器——支撑 React MCQ 工具的后端。软件包 `melisplatform/melis-cms-mcq-engine`。

## 用途

MelisCmsMcqEngine 是 MCQ 系统的**数据与服务层**：它拥有数据库表、
针对问题、答案、MCQ、分组和分类的各项服务、用于冻结每个已组装测验的 **XML 快照**、
**随机模型**问题选取器、**答案评分 / 通过率**评估，以及**前台测验渲染器**。
可以将它类比为 MelisEngine ↔ MelisCms 的关系，只不过它面向的是测验。

已组装的测验以 `mcq_xml` 形式存储，因此渲染和评分读取的是一个自包含的快照，
而非实时联接（join），从而确保即使底层问题日后被编辑，用户当初组装的确切 MCQ 也能被完整保留。

## 没有 React brick——通过 MelisCmsMcq 呈现

本引擎**自身没有任何后台 UI**——无论是旧版还是 React。它不附带
`brick.manifest.json`、不附带 `ui-react/` 项目、不附带 `config/react-api.php`，也不附带
`config/react.capabilities.php`。它**不会**被 `GET /melis/react-api/react-modules` 列出、
不出现在任何 React 菜单中，也不贡献任何能力节点。

在 `/melis-react` 中，MCQ 功能完全位于 **MelisCmsMcq** 工具内（侧边栏 →
**MelisCms → MCQ**；brick `cms-mcq`，路由 `/melis-cms/mcq`，`melisKey` `meliscmsmcq_tool`）。
该工具的 `react-api` 控制器会解析**本引擎的各项服务**，并将所有业务逻辑委托给它们——
与旧版工具所用的服务相同。React → `react-api` → **引擎服务** 这条路径只是替换了
旧版 jQuery/AJAX → 控制器 → **引擎服务** 的路径；不存在任何 React 专用的引擎代码。
访问权限和高级权限能力全部位于 **MelisCmsMcq** 节点（`meliscmsmcq_tool`）上，而非此处——
本引擎的 `rightsDisplay` 为 `'none'`。

## 启用它

在 `config/melis.module.load.php` 中添加：

```php
return [
    // …
    'MelisCmsMcqEngine',
];
```

依赖：`melisplatform/melis-cms`（`^5.3`）、`melisplatform/melis-cms-tags`（`^5.3`）、
`laminas/laminas-paginator`、PHP `^8.1|^8.3`。该模块附带 `dbdeploy: true`，因此其数据表会
自动创建/更新。安装链：`melis-cms-mcq` → **`melis-cms-mcq-engine`** →
`melis-cms` + `melis-cms-tags`。

## 关键服务

所有服务都继承自 MelisCore 的通用服务，并触发 `*_start` / `*_end` 事件。别名注册在
`config/module.config.php` 中，也正是 MelisCmsMcq React 控制器所解析的确切入口点。

| 服务别名 | 职责 | 使用方（MelisCmsMcq React 控制器） |
| --- | --- | --- |
| `MelisCmsMcqService` | MCQ：保存、删除、列表、生成/获取 MCQ XML、打乱顺序、评估答案（评分）。 | `MelisReactApiMcqController` |
| `MelisCmsMcqQuestionsService` | 问题：CRUD、XML 生成、购物篮、随机模型选取器。 | `MelisReactApiMcqQuestionController` |
| `MelisCmsMcqAnswersService` | 答案：CRUD、正确答案检查、每题的答案计数。 | `MelisReactApiMcqQuestionController` |
| `MelisCmsMcqGroupsService` | MCQ 分组：CRUD、为某个 MCQ 组装分组+问题、停用相关的 MCQ。 | `MelisReactApiMcqGroupController` |
| `MelisCmsMcqQuestionCategoryService` | 问题分类（表 `melis_cms_mcq_question_groups`）：CRUD。 | `MelisReactApiMcqCategoryController` |

### 精选方法

**`MelisCmsMcqService`**

| 方法 | 职责 |
| --- | --- |
| `getMcq($mcqId)` | 返回已组装的 MCQ XML；若设置了 `mcq_random_order` 则打乱问题顺序。 |
| `generateMcqXml($mcqProperties, $mcqTrans, $groupsData)` | 从分组 + 问题构建完整测验 XML，并将其存储到 `mcq_xml` 中。 |
| `evaluateAnswers($mcqXml, $userAnswers, $passingPercentage)` | 对 MCQ 类型的提交进行评分；跳过开放式题（Open Ended）；返回分数 + 通过/不通过。 |
| `xmlToArray($mcqXml)` | 将冻结的 `mcq_xml` 快照解析为数组（供 React 预览使用）。 |
| `getMcqList` / `saveMcqItem` / `deleteMcqById` | 标准的列表/保存/删除。 |

**`MelisCmsMcqQuestionsService`**

| 方法 | 职责 |
| --- | --- |
| `generateQuestionXml()` | 在保存时构建每个问题的 XML 快照。 |
| `updateMcqQuestionDataXml()` | 刷新使用该问题的每个 MCQ 内部的问题快照。 |
| `getRandomQuestionIds($difficultyId, $categoryId, $tagId, $numberOfQuestions, $excludedIds)` | 按难度 / 分类 / 标签自动选取 N 个问题 ID。 |
| `generateRandomQuestions($userId, $difficultyId, $categoryId, $tags, $numberOfQuestions, $langId, $alreadySelected)` | 带排除列表的更高层随机选取器。 |
| `getQuestionsBasketList` / `processBasketQuestions` | 管理每个用户的问题购物篮（购物车）。 |

## React MCQ 工具如何使用本引擎

React MCQ 控制器负责整理进出的 JSON，并将所有逻辑委托给引擎。主要的
服务端接触点（来自 `melis-cms-mcq/src/Controller/MelisReactApi*Controller.php`）：

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

React **预览**直接渲染解析后的 `mcq_xml`（`getMcq` + `xmlToArray`）；它**不会**
调用引擎的 `renderMcqQuestions` 视图助手——该助手仅用于前台 / 网站渲染，且不受 React 后台影响。

## 前台

| 项目 | 职责 |
| --- | --- |
| `renderMcqQuestions` 视图助手（`McqQuestionRendererHelper`） | 将 `mcq_xml` 转换为数组，并通过所选模板渲染测验。不使用 MelisTemplatingPlugin——由宿主模板决定其放置位置。 |
| 默认模板 | `view/templates/default-preview-template.phtml` |
| `McqPreviewTemplatesSelect` 表单元素工厂 | 用在 `app.interface.php` 中注册于 `mcq_preview_templates` 下的模板填充一个下拉选择框。 |

引擎注册的其他表单元素工厂：`McqQuestionCategoriesSelect`、
`McqQuestionsDifficultySelect`、`QuestionsTypesSelect`。React 工具会构建自己的 JSON 引用
（类型、难度、分类），而非渲染这些 Laminas 下拉选择元素，但底层的引擎数据
（类型 1=MCQ / 2=Open Ended、难度 Easy/Medium/Hard、分类）是相同的。引擎的
`app.interface.php` 仍会注册带有 `datas`（`mcq_groups.default_group_lists`、`mcq_preview_templates`）
的 `meliscmsmcqengine` 插件——这些默认值无论前端如何，MCQ 工具都会遵循。

## 数据库表

> **命名提示。** 后台的“问题分类（Question categories）”对应 `melis_cms_mcq_question_groups`
> （服务 `MelisCmsMcqQuestionCategoryService`）。后台的“MCQ 分组（MCQ groups）”对应
> `melis_cms_mcq_groups`（服务 `MelisCmsMcqGroupsService`）。这是两个不同的“group”表——
> 请勿混淆。

| 表 | 存储内容 |
| --- | --- |
| `melis_cms_mcq` | 一个 MCQ/测验：`mcq_status`、`mcq_code`、`mcq_random_order`、**`mcq_xml`**（已组装测验快照）、`mcq_passing_rate`、日期/用户。 |
| `melis_cms_mcq_trans` | 各语言的 MCQ 名称（`mcqt_name`）。 |
| `melis_cms_mcq_questions` | 一个问题：`mcqq_status`、`mcqq_code`、`mcqq_type`、`mcqq_group_id`、`mcqq_difficulty_id`、**`mcqq_xml`**（问题+答案快照）。 |
| `melis_cms_mcq_questions_trans` | 各语言的问题文本、`mcqqt_candidate_note`、`mcqqt_corrector_note`。 |
| `melis_cms_mcq_answers` | 一个答案：`mcqa_question_id`、`mcqa_status`、`mcqa_correct_answer`、`mcqa_code`。 |
| `melis_cms_mcq_answers_trans` | 各语言的答案文本（`mcqat_answer_text`）。 |
| `melis_cms_mcq_question_types` | 问题类型：1 = MCQ，2 = Open Ended。 |
| `melis_cms_mcq_questions_difficulty`（+`_trans`） | 难度：1 = Easy，2 = Medium，3 = Hard。 |
| `melis_cms_mcq_question_groups`（+`_trans`） | 问题分类（`mcqqg_id`、`mcqqg_code`、`mcqqgt_name`）。 |
| `melis_cms_mcq_groups`（+`_trans`） | MCQ 分组（`mcqg_id`、`mcqg_mcq_id`、`mcqg_code`、`mcqgt_name`），绑定到特定的 MCQ。 |
| `melis_cms_mcq_questions_list` | 将问题 ↔ 某个 MCQ 关联起来（`mcmql_mcq_id`、`mcmql_question_id`）。 |
| `melis_cms_mcq_groups_list` | 关联某个 MCQ 内的各分组（由迁移添加）。 |
| `melis_cms_mcq_questions_tags_list` | 问题 ↔ 标签关联（MelisCmsTags）。 |
| `melis_cms_mcq_baskets` | 每个用户的问题购物篮（购物车）。 |

## 示例

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

## 关键文件

| 关注点 | 路径 |
| --- | --- |
| 模块接线 + 服务别名 | `vendor/melisplatform/melis-cms-mcq-engine/config/module.config.php` |
| 插件配置（默认分组、预览模板） | `vendor/melisplatform/melis-cms-mcq-engine/config/app.interface.php` |
| MCQ 服务（XML、评分） | `vendor/melisplatform/melis-cms-mcq-engine/src/Service/MelisCmsMcqService.php` |
| 问题服务（购物篮、随机模型） | `vendor/melisplatform/melis-cms-mcq-engine/src/Service/MelisCmsMcqQuestionsService.php` |
| 答案服务 | `vendor/melisplatform/melis-cms-mcq-engine/src/Service/MelisCmsMcqAnswersService.php` |
| 分组服务 | `vendor/melisplatform/melis-cms-mcq-engine/src/Service/MelisCmsMcqGroupsService.php` |
| 问题分类服务 | `vendor/melisplatform/melis-cms-mcq-engine/src/Service/MelisCmsMcqQuestionCategoryService.php` |
| 表网关（Table gateways） | `vendor/melisplatform/melis-cms-mcq-engine/src/Model/Tables/` |
| 表单元素工厂 | `vendor/melisplatform/melis-cms-mcq-engine/src/Form/Factory/` |
| 视图助手 | `vendor/melisplatform/melis-cms-mcq-engine/src/View/Helper/McqQuestionRendererHelper.php` |
| 默认前台模板 | `vendor/melisplatform/melis-cms-mcq-engine/view/templates/default-preview-template.phtml` |
| 数据库安装 + 迁移 | `vendor/melisplatform/melis-cms-mcq-engine/install/dbdeploy/` |

另见：[模块参考](/zh/reference/modules) · [MelisCmsMcq](/zh/reference/modules/melis-cms-mcq) ·
[MelisCms](/zh/reference/modules/melis-cms)
