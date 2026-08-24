# MelisSmallBusiness

> 面向编辑团队的 CMS 附加组件——**用户角色**、审核**工作流**、页面**版本管理**、**评论**与**页面锁定**，外加基于 TinyMCE 的**媒体库**，全部通过 React 后台呈现。软件包 `melisplatform/melis-small-business`。

## 用途

`MelisSmallBusiness` 在 CMS 页面编辑器之上叠加了一层面向小团队的协作工具。它为已发布页面保留
**版本**（可恢复／预览早期状态），驱动内容**工作流**——编辑者请求审核，审核者批准或拒绝，将**评论**
附加到页面，通过**页面锁**防止两名用户同时编辑同一页面，管理自定义**用户角色**工具，并附带一个基于
TinyMCE 的**媒体库**（MoxieManager）。业务逻辑保留在服务端（Laminas 服务、CMS 编辑器事件）；在 v6 中，
整个面向用户的界面由一组 React bricks 和模块化贡献构成。

## 启用模块

这是一个标准的 Laminas 模块。将其添加到 `config/melis.module.load.php`：

```php
return [
    // …
    'MelisSmallBusiness',
];
```

它依赖于 `melis-core`、`melis-engine`、`melis-front` 和 `melis-cms`，其数据表通过 dbdeploy
创建（`extra.dbdeploy = true`）。下述每个 React 界面**仅在模块处于激活状态时**才会出现
（brick 发现通过 `GET /melis/react-api/react-modules`）。

## React 界面

在 React 后台（`/melis-react`）中，该模块提供**两个 bricks** 和**两个模块化贡献**，后者没有自己的路由。

| 界面 | 类型 | 路由／宿主 |
| --- | --- | --- |
| **用户角色**（`smallbusiness`） | 原生全 React（新／旧切换） | `/melis-core/user-roles` |
| **媒体库**（`smallbusiness-medialib`） | iframe brick（MoxieManager） | `/melis-cms/media-library` |
| **工作流弹窗** | 共享弹窗（`window.__melisWorkflowModal`） | 由 News／Blog／CMS 页面编辑器／Newsletter + 仪表盘小组件渲染 |
| **版本管理／评论／锁定** | CMS 页面编辑器中的选项卡 + 横幅 | 贡献给 `meliscms_page` 能力节点 |
| **Users 中的角色** | 角色列／筛选器／选择器 | 宿主 Users 工具，由 `useModuleActive('MelisSmallBusiness')` 控制 |

`public/ui-react/brick.manifest.json` 声明这两个 bricks；`ui-react/src/brick.tsx` 注册它们，
并将工作流弹窗以 window 全局变量的形式发布，使其他 bricks 可以渲染同一个共享实现。

## 用户角色工具

**位置：** 侧边栏 → **MelisCore → User Roles**（`/melis-core/user-roles`）。

**角色**是一份具名的权限配置，只存储一次（`melis_core_user_role`），并可分配给多个用户。
列表显示每个角色，配有 KPI 卡片（角色数／已分配）、搜索、列管理器、导出以及一个
**新／旧**切换（旧 = iframe 中的经典工具）。每行（ID、名称、创建时间、用户数）
都带有编辑／删除操作；已分配给用户的角色**无法删除**。

![React 后台中的角色列表](/screenshots/react/melis-small-business/melissmallbusiness-tool-roles-list.png)

编辑角色会打开一个子选项卡，其中包含一个 **Role name**（角色名称）字段和一个 **Access rights**（访问权限）
树，该树镜像了 Users 权限树（TOOLS 按区块分组，每个工具的 List／Create／Edit／Delete／Export，
外加 Pages 和 Dashboard-plugins 区块）。**Save**（保存）会持久化名称和 `urole_rights` XML。

![角色编辑器及其权限树](/screenshots/react/melis-small-business/melissmallbusiness-tool-roles-edit-and-rights.png)

::: warning 警告
写入角色的**权限** XML 需要平台管理员身份（`usr_admin`）；非管理员编辑角色时，权限写入会得到 403。
这阻断了一条提权路径（伪造一个拥有全部权限的角色，然后将其自行分配）。角色**名称**可由任何拥有该工具
`edit` 权限的人更改。
:::

### Users 工具中的角色

当模块激活时，MelisCore 的 **Users** 工具会在列表中新增一个 **Role**（角色）列 + 筛选器，
并在用户表单中新增一个 **Role** 选择器（与状态和权限并列）。下拉列表由
`GET /melis/react-api/roles`（MelisCore 选择器列表）填充；保存时，一个监听器会重新注入该角色的
能力，使其不会丢失。

![带角色选择器的用户表单](/screenshots/react/melis-small-business/melissmallbusiness-tooloverride-users-edit-withrole.png)

## 媒体库

**位置：** 侧边栏 → **MelisCms → Media library**（`/melis-cms/media-library`）。

高级 TinyMCE／**MoxieManager** 文件浏览器：左侧为文件夹，右侧为文件（名称、大小、类型、日期），
带有创建、上传、列表／网格视图、排序、筛选以及收藏／历史／已上传快捷方式。React 页面是一个轻量封装，
渲染一个整页 iframe 指向旧版 moxiemanager（`/melis/MelisSmallBusiness/js/tinyMCE/moxiemanager/index.php?lang=xx`），
因此其行为与经典工具完全一致——没有自己的 react-api。

![媒体库——React 选项卡中的 MoxieManager 浏览器](/screenshots/react/melis-small-business/melissmallbusiness-tool-medialibrary.png)

## 工作流（页面审核）

工作流让编辑者**请求**审核，让审核者**回应**。**同一个弹窗**可从 CMS 页面编辑器（**Workflow** 按钮）、
News 和 Blog 编辑器以及仪表盘小组件中打开。它对条目类型是通用的——`PAGE`、`NEWS`、`BLOG`。

在 **Ask for validation**（请求审核）下，选择一个 **Role**（角色）以通知具有该角色的所有人，
或选择 **"1 person only"**（仅一人）以显示 **User**（用户）下拉列表并指定单个对象，然后点击
**Send request**（发送请求）。

![工作流弹窗——指定单人](/screenshots/react/melis-small-business/melissmallbusiness-pageoverride-workflow-demand-1person.png)

弹窗的 **History**（历史）列出每一条请求和回应（日期、状态、收件人／角色、发件人、操作）。
未处理请求的接收者会看到 **Validate**（批准）／**Refuse**（拒绝）按钮，并可附加一条备注。

![工作流弹窗——带批准／拒绝的历史](/screenshots/react/melis-small-business/melissmallbusiness-pageoverride-workflow-demand-to-validated.png)

后台**仪表盘**显示一个 **Workflow**（工作流）小组件，列出各项请求，分为 *Users' demands*（用户的请求）
／ *My demands*（我的请求），并带有 PAGE／NEWS 子选项卡；每行显示一个状态标签（VALIDATED／REFUSED／Demand），
并对发给你的请求提供内联批准（✓）／拒绝（✗）和预览操作。

![仪表盘工作流小组件](/screenshots/react/melis-small-business/melissmallbusiness-dashboardplugins-workflow.png)

## 版本管理与评论（CMS 页面编辑器）

在 CMS 编辑器中打开页面时，会在原生选项卡之后新增两个 SmallBusiness 选项卡：

- **Versioning**（版本管理）——页面快照的分页列表（编号、名称、修改时间、修改人），每行提供
  查看／恢复／重命名。每次发布时都会生成一个快照。

  ![页面编辑器——版本管理选项卡](/screenshots/react/melis-small-business/melissmallbusiness-pageoverride-edit-tab-versionning.png)

- **Comments**（评论）——页面的活动时间线，混合了用户评论和工作流事件（最新在前），
  并带有一个 "Add a comment"（添加评论）框。

  ![页面编辑器——评论选项卡](/screenshots/react/melis-small-business/melissmallbusiness-pageoverride-tab-comments.png)

当另一名用户持有页面锁时，会出现一个**页面锁**横幅 + **Unlock**（解锁）按钮。

## react-api 端点

全部位于 `/melis/react-api/…` 下，契约为 `{ success, data, error }`。控制器位于本模块中
（`config/react-api.php` + `src/Controller/MelisReactApi*Controller.php`）。

| 控制器 | 基础路由 | 守卫 |
| --- | --- | --- |
| `MelisReactApiRoleController` | `GET /user-roles`、`/user-roles/stats`、`/user-roles/:id`；`POST /user-roles/save`；`DELETE /user-roles/delete/:id` | `melissb_tool_userrole` 访问权 + 能力（权限 XML 写入 = 仅限管理员） |
| `MelisReactApiWorkflowController` | `GET /workflow/roles`、`/workflow/users`、`/workflow/history`；`POST /workflow/ask` | 仅需认证 |
| `MelisReactApiPageVersioningController` | `GET /cms-page/versioning` | 仅需认证 |
| `MelisReactApiPageCommentsController` | `GET /cms-page/comments`、`/cms-page/timeline`；`POST /cms-page/comments/save` | 仅需认证 |
| `MelisReactApiPageLockController` | `GET /cms-page/lock`；`POST /cms-page/unlock` | 仅需认证 |

工作流的**变更操作**复用久经验证的旧版端点，而非 react-api：
`GET /melis/MelisSmallBusiness/MelisWorkflow/saveWorkflowActions`（批准／拒绝）和
`POST /melis/MelisSmallBusiness/MelisWorkflow/addWorkflowComments`（添加备注）。评论文本在保存时
经过 HTMLPurifier 清理。

## 能力

`config/react.capabilities.php` 在 MelisCms 所拥有的共享 `meliscms_page` 键下**贡献**了页面编辑器按钮 + 选项卡
（经过合并，因此 MelisCms 无需知道 SB 的存在）：

| 类型 | 键 | 标签 |
| --- | --- | --- |
| action | `workflow` | 工作流按钮 |
| action | `unlock` | 解锁按钮 |
| tab | `melissb_page_versioning` | 版本管理选项卡 |
| tab | `melissb_page_comments` | 评论选项卡 |

`CmsPage.tsx` 通过 `useCaps('meliscms_page').can(cap)` 筛选这些选项卡／隐藏这些按钮。
角色工具本身以 `melissb_tool_userrole` 为键，媒体库以 `melissb_medialib` 为键。

## 数据库表

由 `install/dbdeploy/126618_melis_sb_install.sql` 创建。

| 表 | 作用 |
| --- | --- |
| `melis_sb_page_versioning` | 已发布页面的归档副本（支撑版本管理选项卡）。 |
| `melis_sb_workflow` | 每个条目的工作流记录。 |
| `melis_sb_workflow_events` | 工作流事件（请求／批准／拒绝）。 |
| `melis_sb_page_comment` | 附加到页面的评论（评论类型 1 = PAGE，2 = WORKFLOW）。 |
| `melis_sb_page_comment_type` | 评论类型。 |
| `melis_sb_page_locked` | 活动的页面锁（哪个用户正在编辑哪个页面）。 |
| `melis_core_user_role` | 具名角色（`urole_id`、`urole_name`、`urole_creation_date`、`urole_rights` XML）。 |

## 关键服务

| 服务别名 | 作用 |
| --- | --- |
| `MelisEnginePage` | 该模块用 `MelisSBPageService` **覆盖**了引擎的页面服务；在版本预览路由上，它返回来自 `melis_sb_page_versioning` 的版本化树，否则其行为与父类一致。 |
| `MelisSBPageCommentService` | 页面评论：`getPageComments()` / `setPageComments()`。 |

::: warning 警告
通过将 `MelisEnginePage` 别名指向自己的类，本模块在启用期间为整个应用替换了核心页面服务。
在为模块排序时请牢记这一点。
:::

工作流会发送三封后台邮件（`app.emails.php`）：`WF_DEMAND`、`WF_VALIDATED`、
`WF_REFUSED`（标签 `USER_TO`、`USER_FROM`、`TYPE`、`DETAILS`）。

## 关键文件

| 关注点 | 路径 |
| --- | --- |
| 模块引导与监听器 | `src/Module.php`、`src/Listener/` |
| react-api 路由 + 可调用项 | `config/react-api.php` |
| react-api 控制器 | `src/Controller/MelisReactApi{Role,Workflow,PageVersioning,PageComments,PageLock}Controller.php` |
| 能力贡献 | `config/react.capabilities.php` |
| 页面服务（引擎覆盖） | `src/Service/MelisSBPageService.php` |
| 评论服务 | `src/Service/MelisSBPageCommentService.php` |
| React bricks（源码） | `ui-react/src/`（`brick.tsx`、`UserRolePage.tsx`、`MediaLibraryPage.tsx`、`WorkflowModal.tsx`、`RolesRightsTree.tsx`） |
| 构建产物 | `public/ui-react/brick.js` + `brick.manifest.json` |
| 安装 SQL | `install/dbdeploy/126618_melis_sb_install.sql` |
