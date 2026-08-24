# MelisCmsComments

> 面向新闻（News）与博客（Blog）文章的评论系统 —— 提供审核功能、可选的按文章审批流程、一个前台"发表评论"插件以及一个仪表盘小组件。在 v6 中，审核界面是 React 版新闻/博客编辑器中的一个 **Comments**（评论）选项卡。软件包为 `melisplatform/melis-cms-comments`。

## 用途

MelisCmsComments 为 **MelisCmsNews** 与 **MelisCmsBlog** 的文章附加了一套评论系统。它提供
评论后端（`melis_cms_comments` 表 + `MelisCmsCommentsService`）、一个前台
模板插件（评论列表 +"发表评论"表单）、一套按文章的**校验**流程（该流程会将前台
提交的评论保持为待处理状态，直到管理员批准），以及一个 **Latest comments**（最新评论）仪表盘
小组件。结合 **MelisCmsUserAccount**，评论可以要求用户登录站点账号后才能发表。

在 React 后台（`/melis-react`）中，该模块**不提供任何自有 brick** —— 没有 `ui-react/`、
没有 `react-api.php`、也没有 `react.capabilities.php`。它是一个**后端 + 贡献型**模块，具有三个
由宿主拥有的界面：

1. 位于新闻/博客编辑器内部的**评论审核选项卡** —— 该 React 选项卡 UI 及其 `/comments…`
   端点由**新闻和博客 brick 拥有**，它们委托给本模块的服务；
2. 一个在 React CMS 页面编辑器中拖放并配置的**"发表评论"前台页面插件**；
3. 一个 **"最新评论"仪表盘小组件** —— 一个 **legacy 版 PHP/phtml** 仪表盘插件，在
   React 仪表盘的小组件宿主中原样渲染（未做 React 重写）。

## 启用方法

在 `config/melis.module.load.php` 中添加：

```php
return [
    'MelisCmsComments',
];
```

Composer 依赖：`melis-core ^6.0` 与 `melis-cms ^6.0`。在功能上，它至少需要一个文章
模块 —— **MelisCmsNews** 或 **MelisCmsBlog** —— 才能发挥作用。**MelisCmsUserAccount** 是用于
账号限定评论的可选集成。所有界面均受激活状态控制：当该模块不存在时，
新闻/博客评论端点会返回 **404**，审核面板会自行隐藏。

## 核心服务

| 服务别名 | 职责 |
| --- | --- |
| `MelisCmsCommentsService` | 主要的 CRUD/审核服务（继承自 `MelisEngineGeneralService`）。在每个方法上触发 `*_start`/`*_end` 事件对。由新闻/博客的 react-api 控制器调用。 |

`MelisCmsCommentsService` 上的关键方法：

```php
$svc = $sm->get('MelisCmsCommentsService');

// Create or update a comment (BO comments are approved immediately)
$id = $svc->saveComment($text, $postId, $commentId, 'NEWS', $name, $authorId, 'front');

// Fetch a single comment
$comment = $svc->getCommentById($id);

// Front-office list for a post (ordered)
$list = $svc->getCommentsByPostId($postId, 'BLOG', 'mccom_date_creation', 'DESC');

// Back-office query — omit 'validated' to return pending + approved + refused
$rows = $svc->getComments([
    'postType'     => 'NEWS',
    'postId'       => $postId,
    'withUserInfo' => true,
    'limit'        => 10,
]);

// Moderation
$svc->approveComment($id);          // mccom_validated=1, status=1 (shown)
$svc->refuseComment($id);           // mccom_validated=2, status=0 (hidden)
$svc->deleteCommentById($id);

// Cascade-delete when a post is removed
$svc->deletePostComments('NEWS', $postId);
```

`saveComment()` 会读取文章的 `c{type}_validate_comments` 标志：当该标志启用且评论来自
前台时，评论会以待处理状态存储（`validated=0`）；后台评论则会立即以已批准状态存储。所有
保存的文本都会经过 **HTMLPurifier 4.12** 处理以完成 XSS 清理。

## 评论审核选项卡（React，由新闻/博客拥有）

在编辑器中打开一篇新闻文章或博客文章，切换到 **Comments**（评论）选项卡。它会列出该
文章的评论，每一行带有一个**状态圆点**（蓝色 = 待处理，绿色 = 已显示，红色 = 已拒绝）、
作者、评论文本和时间，以及一个用于直接发表评论的内联 **Name + write-a-comment + Add a comment**（姓名 + 撰写评论 + 添加评论）框，
并有每行的 **approve / refuse / delete**（批准 / 拒绝 / 删除）操作（只有当文章开启了校验时，批准/拒绝才会出现）。

![React 版新闻编辑器的 Comments 选项卡：一个 COMMENTS 面板，带有内联的 Name 字段、一个 "Write a comment…" 框和一个红色的 + Add a comment 按钮，然后是一条评论行，带有状态圆点、评论文本以及拒绝/删除图标操作](/screenshots/react/melis-cms-comments/meliscmscomments-tooloverride-news-edit-tab-comments.png)

该 React 选项卡组件属于**新闻/博客 brick**，而非本模块。**MelisCmsComments 中没有
`react-api.php`** —— 评论是通过新闻和博客模块自身的 react-api 暴露的，后者将每一次
操作都委托给 `MelisCmsCommentsService`：

| 方法与 URL | 所属控制器 / 动作 | 用途 |
| --- | --- | --- |
| `GET /melis/react-api/news/:id/comments` | `MelisCmsNewsReactApiController::commentsAction` | 一篇新闻文章的全部评论（所有状态） |
| `POST /melis/react-api/news/comments/save` | `commentSaveAction` | 创建/编辑评论（后台 → 已批准） |
| `POST /melis/react-api/news/comments/approve/:cid` | `commentApproveAction` | 批准（`mccom_validated=1`，status=1） |
| `POST /melis/react-api/news/comments/refuse/:cid` | `commentRefuseAction` | 拒绝（`mccom_validated=2`，status=0） |
| `POST /melis/react-api/news/comments/delete/:cid` | `commentDeleteAction` | 删除评论 |
| `GET /melis/react-api/blog/:id/comments` | `MelisCmsBlog…ReactApiController::commentsAction` | 一篇博客文章的全部评论 |
| `POST /melis/react-api/blog/comments/{save,approve,refuse,delete}[/:cid]` | 博客评论动作 | 针对博客的相同操作 |

`commentsAction` 会构建一个不带 `validated` 键的 `getComments(['postId' => …, 'postType' => 'NEWS'])`
查询，因此它会返回**待处理 + 已批准 + 已拒绝**的评论。每个动作在**模块不可用时都会返回 404**；
其约定为 `{ success, data|error }`。

```ts
// list a post's comments (all statuses)
const res = await fetch(`/melis/react-api/news/${idNews}/comments`, {
  credentials: 'include',
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
}).then(r => r.json());          // → { success: true, data: [ { …comment… } ] }

// approve one
await fetch(`/melis/react-api/news/comments/approve/${commentId}`, {
  method: 'POST', credentials: 'include',
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
});
```

legacy 版的 `MelisCmsCommentsTabController`（getComments / save / approve / refuse / delete，受
`hasAccess('meliscms_page')` 守卫）仍被经典/iframe 路径使用 —— 参见
[legacy 文档](/legacy/reference/modules/melis-cms-comments)。

## "发表评论"前台页面插件

`Controller\Plugin\MelisCmsCommentsPlugin` 是一个 `MelisTemplatingPlugin`（配置键 `meliscmscomments`，
所属分区 **MelisCms**，配置文件为 `config/plugins/MelisCmsCommentsPlugin.config.php`）。在 React CMS
页面编辑器的 **PLUGINS**（插件）面板中，于 **Melis Cms Comments** 之下，将 **Post comments**（发表评论）拖入
新闻/博客页面模板上的某个放置区。

![CMS 页面编辑器及其 PLUGINS 面板：Melis Cms Comments 分组展开后显示 Post comments 插件被拖入一个 DRAG & DROP ZONE；渲染出的前台表单显示一个 Name 字段、一个 "Add a comment:" 框和一个红色的 Submit 按钮](/screenshots/react/melis-cms-comments/meliscmscomments-page-plugin-postcomments-menu-selector.png)

- **设置弹窗**用于选择 **Template**（模板，默认 `MelisCmsComments/comments`）和 **Post Type**（文章类型，
  NEWS / BLOG），这些设置会作为 `template_path`、`mccplugin_post_type` 和
  `registration_page_page_id`（用于通过 MelisCmsUserAccount 实现账号限定评论）持久化到页面的插件 XML 中。

![Post comments 插件的设置弹窗：一个 Template 下拉框（MelisCmsComments/comments）和一个 Post Type 下拉框（News / Blog），带有 Cancel / Apply 按钮；这些设置会持久化到页面的插件 XML 中](/screenshots/react/melis-cms-comments/meliscmscomments-page-plugin-postcomments-config-settings.png)

- **前台渲染**（`front()`）会根据 `newsId` / `blogId` 查询参数解析出文章，通过
  `getCommentsByPostId()` 加载评论，并构建发表评论表单（Name + 评论 + Submit）。
  当文章要求账号时，它会触发 `melis_cms_user_account_login_form` 以嵌入一个登录
  插件。
- 默认视图为 `MelisCmsComments/comments`；资源文件为 `plugins/css/commentsPlugin.css`、
  `plugins/js/commentsPlugin.js`。

## "最新评论"仪表盘小组件（legacy）

`Controller\DashboardPlugins\MelisCmsCommentsLatestCommentsPlugin` 继承自
`MelisCoreDashboardTemplatingPlugin`；其 `latestCommentsAction()` 返回一个 Laminas `ViewModel`
（模板为 `melis-cms-comments/dashboard/latest-comments`，一个 `.phtml`），在
`config/dashboard-plugins/dashboard.config.php` 中注册（插件 id 为 `MelisCmsCommentsLatest`）。React
仪表盘的**小组件宿主**会原样渲染这个 legacy 插件 —— **未做 React 重写**。它按文章类型
（Blog / News 选项卡）列出最近的评论，带有 **All sites / All users / limit**（所有站点 / 所有用户 / 数量限制）
筛选器，每条评论显示作者、状态徽章、文章标题和日期。站点/用户
筛选器与区域重载由 `MelisCmsCommentsViewHelperController::listAction`
（`melis-cms-comments/dashboard/list`，区域 `dashboard_latest_comments_list`）提供服务。

![React 仪表盘的 Latest comments 小组件：一个 "Blog comments" 选项卡，带有 All sites、All users 和 limit 选择器，然后是一列最近评论（作者 + 用户 id 徽章 + 绿色 "shown" 眼睛徽章、方括号中的文章标题、评论文本，以及 "on: date"）](/screenshots/react/melis-cms-comments/meliscmscomments-dashboardplugins-latestcomments.png)

## 数据库表

| 表 | 存储内容 |
| --- | --- |
| `melis_cms_comments` | 所有评论：`mccom_id`、`mccom_post_id`、`mccom_type`（NEWS/BLOG）、`mccom_comment_text`、`mccom_name`、`mccom_validated`、`mccom_status`、`mccom_date_creation`、`mccom_author_account`。 |

在引导（bootstrap）阶段，会向文章模块的表中自动添加两个列（无需在那里修改表结构）：

| 列 | 表 | 用途 |
| --- | --- | --- |
| `cnews_validate_comments` | `melis_cms_news` | 新闻的按文章"Validate comments"（校验评论）标志。 |
| `cblog_validate_comments` | `melis_cms_blog` | 博客的按文章"Validate comments"（校验评论）标志。 |

**状态模型。** `mccom_validated`：`0` = 新建/待处理（蓝色），`1` = 已批准/已显示（绿色），
`2` = 已拒绝/已隐藏（红色）。`mccom_status` 反映站点可见性（`1` 显示 / `0` 隐藏）。

## 监听器与跨模块接线

在引导（bootstrap）阶段于 `Module.php` 中附加：

| 监听器 | 事件 | 用途 |
| --- | --- | --- |
| `MelisCmsCommentsFlashMessengerListener` | `melis_cms_comments_flash_messenger` | Flash-messenger 反馈与活动日志（`CMS_COMMENT_ADD / UPDATE / DELETE`）。 |
| `MelisCmsCommentsSaveValidateCommentListener` | `meliscmsnews_get_postvalues` | 在保存新闻文章时持久化 `cnews_validate_comments`。 |
| `MelisCmsCommentsGdprAutoDeleteActionDeleteListener` | `melis_cms_user_account_gdpr_auto_delete_action_delete` | GDPR：为被删除的账号将 `mccom_author_account` 置空，然后重新触发本模块的 GDPR 事件。 |

`Module::addValidateCommentsField()`（后台引导）会检查哪些文章模块处于激活状态，
并在缺失时向它们的表中添加 `c{news,blog}_validate_comments` 列。

## 关键文件

| 关注点 | 路径 |
| --- | --- |
| 模块配置（服务、控制器、插件） | `vendor/melisplatform/melis-cms-comments/config/module.config.php` |
| 前台插件配置 | `vendor/melisplatform/melis-cms-comments/config/plugins/MelisCmsCommentsPlugin.config.php` |
| 仪表盘插件配置 | `vendor/melisplatform/melis-cms-comments/config/dashboard-plugins/dashboard.config.php` |
| 主服务 | `vendor/melisplatform/melis-cms-comments/src/Service/MelisCmsCommentsService.php` |
| legacy 选项卡控制器 | `vendor/melisplatform/melis-cms-comments/src/Controller/MelisCmsCommentsTabController.php` |
| 前台模板插件 | `vendor/melisplatform/melis-cms-comments/src/Controller/Plugin/MelisCmsCommentsPlugin.php` |
| 仪表盘小组件 | `vendor/melisplatform/melis-cms-comments/src/Controller/DashboardPlugins/MelisCmsCommentsLatestCommentsPlugin.php` |
| 监听器 | `vendor/melisplatform/melis-cms-comments/src/Listener/` |
| 数据库模型 / 表网关 | `vendor/melisplatform/melis-cms-comments/src/Model/Tables/MelisCmsCommentsTable.php` |
| 引导 / 列注入 | `vendor/melisplatform/melis-cms-comments/src/Module.php` |
| HTMLPurifier（已内置） | `vendor/melisplatform/melis-cms-comments/library/htmlpurifier-4.12.0/` |

> React 版 Comments 选项卡 UI 及其 `/comments…` 端点位于新闻/博客 brick 中
> （`MelisCmsNewsReactApiController`、`MelisCmsBlog…ReactApiController`）；两者都委托给
> `MelisCmsCommentsService`。数据模型、服务和经典工具：
> [legacy 文档](/legacy/reference/modules/melis-cms-comments)。

另见：[MelisCmsNews](/zh/reference/modules/melis-cms-news) · [MelisCmsBlog](/zh/reference/modules/melis-cms-blog) · [MelisCms](/zh/reference/modules/melis-cms) · [MelisEngine](/zh/reference/modules/melis-engine) · [MelisCore](/zh/reference/modules/melis-core)
