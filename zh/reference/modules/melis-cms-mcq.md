# MelisCmsMcq

> 面向 Melis CMS 的后台 MCQ（多项选择问卷 / 测验）构建器，在 v6 后台中现已成为原生全 React 工具。软件包 `melisplatform/melis-cms-mcq`。

## 用途

MelisCmsMcq 是 MCQ 系统的 **UI 部分**。它提供一个工作台，让你编写**问题**（含答案、类型、难度、分类和标签），将它们组织为**问题分类**和 **MCQ 分组**，并通过按用户维护的**收藏篮**手动组装、或通过**随机模型**自动组装出 **MCQ**（测验）。它自身没有数据层：所有持久化（数据表、服务、评分、XML 快照以及前台渲染）都委托给配套模块 **MelisCmsMcqEngine**。

在 v6 中，该工具是一个**原生全 React 砖块**：真实的 React 页面调用模块自身的 `/melis/react-api/mcq*` JSON 端点，默认视图中不含 iframe。旧版 PHP 工具保持原样，仅可通过每个工具的“新 / 旧”（New / Old）切换开关访问。

## 启用它

添加到 `config/melis.module.load.php`：

```php
return [
    'MelisCmsMcq',
];
```

需要 `melisplatform/melis-cms-mcq-engine`（`^5.3`）和 `laminas/laminas-paginator`。同时需要已加载 **MelisCms**、**MelisCore**（后台）和 **MelisCmsTags**（问题打标签）。安装链：`MelisCmsMcq` → `melis-cms-mcq-engine` → `melis-cms` + `melis-cms-tags`。

该 React 砖块通过 `GET /melis/react-api/react-modules` 被发现，仅在模块处于激活状态时出现。`src/Module.php` 将 `config/react-api.php`（JSON 端点）和 `config/react.capabilities.php`（高级权限映射）合并进应用配置。

## 它在 React 后台中的位置

**侧边栏 → MelisCms → MCQ**，路由 **`/melis-cms/mcq`**（由菜单转发 `MelisCmsMcq/MelisCmsMcq` 推导得出）。该砖块以 id **`cms-mcq`** 注册，并在 React 中绘制整个工具——它没有自己的侧边栏 / 页眉。

![MCQ 选项卡（React）：带 KPI 卡片、筛选器、新/旧切换开关以及“问题收藏篮”（Questions Favorites）的测验列表。](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-mcq-list.png)

清单文件（`public/ui-react/brick.manifest.json`）设置了 `persistent: true` 和 `subTabs: true`，因此该砖块拥有**自己的**工具内子选项卡栏，并在宿主导航切换期间保持挂载：打开一个 MCQ 或一个问题会添加一个子选项卡，而当你跳回列表时，筛选器、排序和填写到一半的表单都会保留下来。URL 仅是当前记录的外观性反映（`history.replaceState`）。

| 属性 | 值 |
| --- | --- |
| 砖块 id | `cms-mcq` |
| 路由 | `/melis-cms/mcq` |
| 标签 | `MCQ` |
| forwardKey | `MelisCmsMcq/MelisCmsMcq` |
| melisKey | `meliscmsmcq_tool`（访问守卫**且**承载权限的键） |

> **新 / 旧切换开关。** 在列表视图中，未受限用户会看到一个 **New（React）/ Old（旧版 iframe）** 切换；“Old”视图是在 `/melis/react-tool-page?key=meliscmsmcq_tool` 提供的经典工具。受限用户则只会看到 React 视图。

## 后台工作台

一个四选项卡的 React 工作台，外加位于工具头部的**问题收藏篮**（Questions Favorites，按用户维护的书签精选列表）。经验法则：编写**问题** → 将它们分组（**MCQ 分组** / **分类**）→ 组装出一个 **MCQ** → **预览**以进行作答并阅读订正。

| 选项卡 | 它所管理的内容 |
| --- | --- |
| **MCQ** | 已组装测验的列表（Id、状态、代码、名称、创建日期、分组、问题），带 KPI 卡片、搜索、状态/日期筛选器、列管理器和导出。**Add** 会将 MCQ 构建器作为子选项卡打开。 |
| **Questions** | 问题列表，带按分类 / 类型 / 状态 / 难度 / 标签的筛选器和搜索；一个**书签**操作可将问题切换加入问题收藏篮。 |
| **MCQ groups** | 可复用的问题包（Id、状态、代码、名称）。带 KPI 卡片、导出、新增/编辑**弹窗**。 |
| **Question categories** | 命名的问题分组（Id、状态、代码、名称）。带 KPI 卡片、导出、新增/编辑**弹窗**。 |

![Questions 选项卡（React）：可筛选的问题列表，含收藏篮书签操作。](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-questions.png)

### 问题编辑器

在 Questions 选项卡上执行 **Add / edit** 会将编辑器作为子选项卡打开，分为两个标签页：

| 编辑器标签页 | 内容 |
| --- | --- |
| **Properties** | 代码、**Type**（MCQ / Open Ended）、**Category**、**Tags**、**Difficulty**、状态 |
| **Texts / Answers** | 每种语言的问题文本，以及每个**答案**及其**正确答案（Correct answer，是/否）**标志、一个代码和一个状态；拖动抓手手柄可重新排序答案 |

![问题编辑器 — Properties（Type、Category、Tags、Difficulty、Status）。](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-questions-edit-properties.png)

![问题编辑器 — 每种语言的文本以及答案列表（正确答案开关）。](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-questions-edit-texts.png)

![答案行上的拖动重排手柄。](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-questions-edit-dragdroporderingicon.png)

### MCQ 构建器

在 **MCQ** 选项卡 → **Add**（或编辑某一行）会将构建器作为子选项卡打开，分为三个标签页：

| 构建器标签页 | 内容 |
| --- | --- |
| **Properties** | 名称、代码、状态、**所需最低分数（%）**（Minimum score required，及格率），以及一个 **“每次创建 MCQ 时更改问题顺序”**（change questions order at every MCQ creation）的随机打乱开关 |
| **Composition (Questions)** | 添加**分组**，然后通过从 **Questions Favorites** / **Search Questions** 侧边面板拖动问题来填充每个分组，或点击 **Configure a random MCQ** 为每个分组自动挑选 |
| **Preview** | 作答已组装的测验，然后提交以查看引擎计算出的**订正**（Correction，分数、通过/未通过、每题的用户答案与正确答案对比）。React UI 仅负责显示它 |

![MCQ 构建器 Properties — 名称、所需最低分数（%）、随机顺序开关。](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-mcq-edit-tab-properties.png)

![MCQ 构建器 composition — 分组及其问题，外加 Favorites / Search 面板。](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-mcq-edit-tab-questions.png)

![MCQ 构建器 Preview — 已组装的测验，可供作答。](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-mcq-edit-tab-preview.png)

![预览订正 — 分数、通过/未通过以及每题的用户答案与正确答案对比。](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-mcq-edit-tab-preview-corrected.png)

**Random Model** 弹窗按分组定义条件行（Difficulty / Category / Tag / Number）；保存时会通过引擎的 `getRandomQuestionIds` 在服务器端解析出匹配的问题 ID。

![Random Model 弹窗 — 按条件为每个分组自动选择问题。](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-mcq-edit-tab-questions-randommcq-modal.png)

> 如果没有名称、没有分组、或**存在任何空分组**，保存都会失败——与旧版工具的规则相同。MCQ 的 XML 快照（`mcq_xml`）在每次保存时由引擎重新生成，绝不手工写入。创建或删除一个分类会刷新共享的引用数据，使其立即出现在问题编辑器的分类选择器中。

## React API — 端点

所有路由都是 `melis-react-api` 的子路由（从 `config/react-api.php` 合并而来），由四个可调用（invokable）控制器提供服务。各处统一的响应契约：`{ success: bool, data: T, error?: string, fields?: string[] }`。每个 action 都会调用 `denyUnlessAccess()`（认证 + `MelisCoreRights::canAccess('meliscmsmcq_tool')`），随后是一个能力守卫 `denyUnlessCan(<cap>)`。

**MCQ** — `MelisReactApiMcqController`：

| 方法 · URL | Action · cap | 用途 |
| --- | --- | --- |
| `GET /melis/react-api/mcq` | `list` · `mcq` | keyset 列表 |
| `GET /melis/react-api/mcq/stats` | `stats` · `mcq` | KPI 卡片 |
| `GET /melis/react-api/mcq/groups` | `groups` · `mcq` | 构建器中可选择的分组 |
| `GET /melis/react-api/mcq/:id` | `get` · `mcq` | 完整详情（属性、名称、有序的分组 + 问题） |
| `POST /melis/react-api/mcq/save` | `save` · `mcq.create` \| `mcq.edit` | 创建/更新（重新生成 `mcq_xml`） |
| `POST /melis/react-api/mcq/evaluate` | `evaluate` · `mcq.preview.test` | 对一组答案评分 |
| `GET /melis/react-api/mcq/:id/preview` | `preview` · `mcq.preview` | 作答形态的 MCQ（来自 XML） |
| `DELETE /melis/react-api/mcq/delete/:id` | `delete` · `mcq.delete` | 删除（级联） |

**Questions**（+ 答案、收藏篮、随机抽取）— `MelisReactApiMcqQuestionController`，位于 `/melis/react-api/mcq-questions[…]`：`list`/`stats`/`refs`/`get`/`save`（cap `questions`）、`delete`（`questions.delete`），以及组装端点 `basket`、`basket/toggle`、`basket/clear`、`search`、`random`、`random-model`（cap 均为 `mcq.composition`）。`refs` 返回共享的引用数据——类型、难度、分类、标签、语言、`nextCode`。

**MCQ groups** — `MelisReactApiMcqGroupController`：`list`/`stats`/`save`/`delete`/`related`/`get`，位于 `/melis/react-api/mcq-groups[…]`（cap 为 `groups`、`groups.delete`）。

**Question categories** — `MelisReactApiMcqCategoryController`：`list`/`stats`/`save`/`delete`/`related`/`get`，位于 `/melis/react-api/mcq-categories[…]`（cap 为 `categories`、`categories.delete`）。

> ⚠ 路由顺序很重要：字面量段（`/stats`、`/save`、`/groups`、`/basket`、`/random`、`/evaluate`、`/refs`）声明在通配的 `/:id` **之前**，并且所有名称都加上 `mcq-*` 前缀，以避免与通用的 `melis-react-api` 路由冲突。

**业务逻辑保留在服务器端。** 这些控制器仅负责校验输入、运行事务并组织 JSON；真正的工作在它们所解析的引擎服务中完成。

## 能力（高级权限）

`config/react.capabilities.php` 以承载权限的菜单节点 **`meliscmsmcq_tool`** 为键——即控制器所守卫的同一 melisKey。对工具本身的访问仍由 `MelisCoreRights::canAccess('meliscmsmcq_tool')` 控制；这些能力则用于在一个已获授权的工具**内部**对各组件进行门控。默认允许：没有能力节的用户/角色将保留全部权限。

扁平化的能力字符串：

- **`mcq`**、`mcq.create`、`mcq.edit`、`mcq.delete`、`mcq.export`；`mcq.composition`（组装页面——同时也门控收藏篮 + 搜索/随机端点）、`mcq.properties`、`mcq.preview`、`mcq.preview.test`
- **`questions`**、`questions.create`、`questions.edit`、`questions.delete`、`questions.export`；`questions.properties`、`questions.answers`
- **`groups`**、`groups.create`、`groups.edit`、`groups.delete`、`groups.export`
- **`categories`**、`categories.create`、`categories.edit`、`categories.delete`、`categories.export`

四个顶层键（`mcq`、`questions`、`groups`、`categories`）就是四个列表选项卡。React 通过 `useCaps(MELIS_KEY)` 读取它们并相应地隐藏选项卡/按钮；服务器端的 `denyUnlessCan()` 才是真正的强制执行。

## 所用的引擎服务

MelisCmsMcq 不注册任何自己的服务——它的 React 控制器在运行时从 **MelisCmsMcqEngine** 解析别名：

| 引擎服务别名 | 本模块用它来做什么 |
| --- | --- |
| `MelisCmsMcqQuestionsService` | 问题 CRUD、收藏篮列表、随机选择（`getRandomQuestionIds`） |
| `MelisCmsMcqAnswersService` | 答案 CRUD（问题编辑器） |
| `MelisCmsMcqQuestionCategoryService` | 问题分类 CRUD |
| `MelisCmsMcqGroupsService` | MCQ 分组 CRUD |
| `MelisCmsMcqService` | MCQ CRUD、XML 生成（`generateMcqXml`）、获取（`getMcq`）、评分（`evaluateAnswers`）、删除（`deleteMcqById`） |

## 数据库表

所有表都归 **MelisCmsMcqEngine** 所有。本模块中的后台界面与它们的映射关系如下：

| 引擎表 | 写入它的后台界面 |
| --- | --- |
| `melis_cms_mcq_questions` + `_trans` | Questions 选项卡 + 问题编辑器 |
| `melis_cms_mcq_answers` + `_trans` | 答案编辑器（位于问题编辑器内） |
| `melis_cms_mcq_question_groups` + `_trans` | Question categories 选项卡 |
| `melis_cms_mcq_groups` + `_trans` | MCQ groups 选项卡（通过 `mcqg_mcq_id` 关联到某个 MCQ） |
| `melis_cms_mcq` + `_trans` | MCQ 选项卡；已组装的测验以 XML 形式存储在 `mcq_xml` 中 |
| `melis_cms_mcq_questions_list` | 问题到 MCQ 分组的隶属关系 |
| `melis_cms_mcq_baskets` | 按用户维护的问题收藏篮 |

> **命名注意事项。** UI 中的“Question categories”映射到 `melis_cms_mcq_question_groups`；UI 中的“MCQ groups”映射到 `melis_cms_mcq_groups`。这是两张用途不同的独立“group”表——参见 MelisCmsMcqEngine 文档。

## 标签集成

`config/app.interface.php` 注册了一个 **MelisCmsTags** 关联，使问题可被打标签（关联类型 `MCQ_QUESTION`、实体表 `melis_cms_mcq_questions`、主键 `mcqq_id`）。Questions 列表会展示一个**标签**列和一个由该注册驱动的**标签筛选器**；在 React 工具中，标签也是问题 `refs` 载荷的一部分。

## 前台

MelisCmsMcq 没有自己的前台输出。测验渲染器是一个视图助手（`renderMcqQuestions`），注册于 **MelisCmsMcqEngine** 中；Preview 选项卡通过引擎使用它。前台渲染详情请参见 [MelisCmsMcqEngine 参考](/legacy/reference/modules/melis-cms-mcq-engine)。

## 关键文件

| 关注点 | 路径 |
| --- | --- |
| React API 路由 + 4 个可调用控制器 | `config/react-api.php` |
| 高级权限能力映射 | `config/react.capabilities.php` |
| 模块引导（合并上述两个配置） | `src/Module.php` |
| 共享控制器 trait（MELIS_KEY、denyUnlessAccess、json/error/tr） | `src/Controller/McqReactApiTrait.php` |
| MCQ list/get/save/preview/evaluate/delete | `src/Controller/MelisReactApiMcqController.php` |
| Questions + 答案 + 收藏篮 + 随机抽取 | `src/Controller/MelisReactApiMcqQuestionController.php` |
| MCQ groups | `src/Controller/MelisReactApiMcqGroupController.php` |
| Question categories | `src/Controller/MelisReactApiMcqCategoryController.php` |
| React 砖块源码（Vite IIFE） | `ui-react/src/`（`brick.tsx`、`McqPage.tsx`、`McqBuilder.tsx`、`QuestionEditor.tsx`、`mcq-api.ts`、…） |
| 构建后的砖块 bundle + 清单 | `public/ui-react/{brick.js, brick.manifest.json}` |
| 旧版工具（树、选项卡、DataTables、视图、JS） | `config/app.interface.php`、`config/app.tools.php`、`src/Controller/`、`view/`、`public/js/` |

另请参见：[melis-cms-mcq-engine](/legacy/reference/modules/melis-cms-mcq-engine)、[melis-cms-tags](/legacy/reference/modules/melis-cms-tags)、[melis-cms](/legacy/reference/modules/melis-cms)、[melis-core](/legacy/reference/modules/melis-core)
