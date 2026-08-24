# MelisCms

> CMS 后台管理界面——站点、页面树、页面编辑器、模板、样式与 SEO，以 React 后台形式交付。软件包 `melisplatform/melis-cms`。

## 用途

`MelisCms` 是你在 Melis 平台上构建和运行网站的后台。它提供站点页面树、页面编辑器（编辑、属性、SEO、语言等选项卡）、用于组合内容的拖放式插件区域，以及针对站点、模板、样式、语言、平台 ID、域名和重定向的管理工具。它**不拥有任何数据库表**——所有数据都通过 [melis-engine](/legacy/reference/modules/melis-engine) 读写，而页面渲染（包括实时编辑预览）则由 [melis-front](/legacy/reference/modules/melis-front) 负责。

在 Melis v6 中，业务逻辑保持不变；**展示层**是一个 **React 后台**（`/melis-react`）。MelisCms 提供**一个多砖块（multi-brick）包**，暴露**九个工具**：页面编辑器（一个侧边栏宿主：页面树 + 选项卡式编辑器）和**八个原生 React 侧栏工具**。唯一仍然使用经典 UI 的部分是页面编辑器的**编辑（Edition）**选项卡，它以 iframe 加载。

## MelisCms / MelisFront / MelisEngine 三件套

这三个模块构成了一个紧密耦合的系统；关于其中一个的问题通常都会涉及另外两个。

- **MelisEngine** — 拥有整个 CMS 数据库模型（页面、树、站点、模板、语言、SEO、样式），并通过表网关和服务将其暴露出来。定义了 `MelisTemplatingPlugin`，即每个内容块继承的基类。
- **MelisFront** — 前台渲染管线；将一个 URL 转换成一个完整页面，并驱动后台内部的实时可编辑预览（`renderMode/melis`）。
- **MelisCms** *（本模块）* — 后台 UI 层；通过触发由引擎和前台监听器处理的事件来驱动页面生命周期。

**加载顺序：** `melis-core` → `melis-front` → `melis-engine` → `melis-cms`。

## 启用它

添加到 `config/melis.module.load.php`：

```php
return [
    'MelisCms',
];
```

需要 `melisplatform/melis-core`、`melisplatform/melis-engine` 和 `melisplatform/melis-front`。它没有自己的安装 SQL；CMS 架构是 melis-engine 的一部分。只有当 MelisCms 处于激活状态时，砖块才会出现在 React 后台中（通过 `GET /melis/react-api/react-modules` 发现）。

## React 后台——一个包，九个砖块

该包（`public/ui-react/brick.js` + `brick.manifest.json`）声明了九个在 `brick.tsx` 中自注册的砖块。除页面编辑器的编辑选项卡外，其余全部为原生全 React 实现。

| 砖块 id | 路由 | melisKey | 类型 |
| --- | --- | --- | --- |
| `cms` | `/melis-cms/page` | `meliscms_page` | 页面编辑器（侧边栏宿主：树 + 选项卡式编辑器） |
| `cms-sites` | `/melis-cms/sites` | `meliscms_tool_sites` | 原生 React（列表 + 编辑器 + 5 步向导） |
| `cms-templates` | `/melis-cms/templates` | `meliscms_tool_templates` | 原生 React（列表 + 表单） |
| `cms-styles` | `/melis-cms/styles` | `meliscms_tool_styles` | 原生 React |
| `cms-languages` | `/melis-cms/languages` | `meliscms_tool_language` | 原生 React |
| `cms-platform-ids` | `/melis-cms/platform-ids` | `meliscms_tool_platform_ids` | 原生 React |
| `cms-site-301` | `/melis-cms/site-301` | `meliscms_tool_site_301` | 原生 React |
| `cms-mini-templates` | `/melis-cms/mini-templates` | `meliscms_mini_template_manager_tool` | 原生 React |
| `cms-menu-manager` | `/melis-cms/menu-manager` | `meliscms_mini_template_menu_manager_tool` | 原生 React |

`cms` 砖块比较特殊：它**同时**注册了一个带路由的 `Component`（选项卡式编辑器）**和**一个 `Sidebar`（页面树），因此在你工作时页面树会一直显示在左侧边栏中。每个侧栏工具都带有一个 **New / Old** 切换开关——*New* 是 React UI，*Old* 是以 iframe 加载的经典工具（`/melis/react-tool-page?key=<melisKey>`）。

![React 侧边栏中的 MelisCms 区块——PAGE TREE（页面树）面板和 Site Tools（站点工具）分组](/screenshots/react/melis-cms/meliscms-menu-entry.png)

## 页面树（左侧边栏）

页面树是你所有站点及其内部每个页面的地图。点击某个页面即可将其作为顶部选项卡在编辑器中打开；搜索可以找到尚未加载的页面并将树展开至该页面；节点的右键菜单可以添加子页面、显示详情、复制一个页面或整个分支，或者删除。通过拖放来移动页面（服务器端权限决定你可以移动哪些内容）。

![React 页面树——站点与页面，带有草稿、锁定和站点根节点指示标记](/screenshots/react/melis-cms/meliscms-menu-site-treeview.png)

该树通过 `cms-tree-api.ts` 复用了旧版 CMS 端点（后端无改动）：

| 用途 | 端点 |
| --- | --- |
| 某节点的子节点（懒加载） | `GET /melis/MelisCms/TreeSites/get-tree-pages-by-page-id?nodeId=<id>`（`-1` = 站点根节点） |
| 按名称搜索页面 | `POST /melis/MelisCms/Page/searchTreePages` |
| 移动 / 重新指定父节点 | `GET /melis/MelisCms/Page/movePage` |
| 复制一棵树 | `POST /melis/MelisCms/TreeSites/duplicateTreePage` |
| 删除一个页面 | `GET /melis/MelisCms/Page/deletePage?idPage=<id>` |

该树监听 `melis:cms-tree-refresh` 事件，以便在保存/发布/删除后刷新并显示相应页面。

## 页面编辑器

从树中打开一个页面，或深链接到 `/melis-cms/page/:idPage`。编辑器在选项卡内容周围有一层**原生 React 外壳**（标题 + 状态、操作按钮、选项卡栏）。该外壳由服务器合并的结构组装而成（`GET /melis/react-api/cms-page/structure?idPage=<id>` → `{ header, tabs[], buttons[] }`），因此**其他模块可以通过在服务器端合并配置来添加选项卡和按钮**。

原生选项卡在前，然后是其他模块贡献的选项卡：**编辑（Edition）· 属性（Properties）· SEO · 语言（Languages）· 历史记录（Historic）· 页面分析（Page Analytics）· 脚本（Scripts）· Open Graph · 链接检查器（Link Checker）· Google Analytics · 版本管理（Versioning）· 评论（Comments）**。操作按钮：**新建页面 · 复制 · 清除草稿 · 删除页面 · 查看 · 显示 · 保存 · 发布**（外加一个发布/在线状态开关以及诸如 Workflow 之类的模块化按钮）。

### 属性选项卡（原生 React）

设置页面**名称**、**类型**（页面 / 文件夹 / 站点……）、**模板**（布局）、**语言**（创建后锁定）、**菜单显示**、**样式**和分类关键词。

![React 属性选项卡——名称、类型、模板、语言、菜单显示、样式和分类](/screenshots/react/melis-cms/meliscms-page-tab-properties.png)

### 编辑选项卡（iframe 中的旧版拖放）

编辑选项卡填充整个页面：它进行实时渲染，你可以**将内容块（插件）拖放**到模板的区域中。它是**在 React 外壳内以 iframe 加载的经典编辑器**（`/melis/react-tool-page?key=meliscms_page&idPage=<id>`）；拖放、插件菜单、迷你模板管理器和富文本编辑器都与经典后台中的相同。它们的内容会自动保存到 PHP 会话中，并在你保存或发布时写入。

![编辑选项卡——带有拖放叠加层的实时页面，位于 React 编辑器外壳内](/screenshots/react/melis-cms/meliscms-page-tab-edition.png)

![插件面板——你可以拖放到页面上的内容块；列表取决于站点激活的模块](/screenshots/react/melis-cms/meliscms-page-tab-edition-menu-templating-plugins.png)

![拖放区域布局——选择如何拆分一个区域以放置你的内容块](/screenshots/react/melis-cms/meliscms-page-tab-edition-dragdropzone-layouts.png)

### SEO 与语言选项卡（原生 React）

**SEO** 选项卡包含友好 URL、meta 标题/描述、规范（canonical）和重定向 URL。**语言（Languages）**选项卡管理页面的各语言版本（每个版本都有各自的内容和 SEO）。

![React SEO 选项卡——URL、meta 标题/描述和重定向字段](/screenshots/react/melis-cms/meliscms-page-tab-seo.png)

### 保存与发布

- **保存**写入草稿（属性 + SEO + 编辑 XML 一起，一次操作）。
- **查看 → 预览 / 在线查看**显示草稿或线上页面。
- **发布**使当前草稿上线；状态开关执行发布 / 取消发布。
- **清除草稿**丢弃草稿并回退到已发布版本。

保存/发布会以旧版字段名向**旧版**端点发送 POST 请求：`POST /melis/MelisCms/Page/savePage?idPage=` 和 `.../publishPage?idPage=`（外加 `unpublishPage`、`clearSavedPage`、`deletePage`）；编辑 XML 从 PHP 会话中读取。

## 侧栏工具

### 站点（Sites）——创建和管理网站

`/melis-cms/sites`。每一行是一个完整的网站（ID、名称、模块、语言）。**+ New site** 会运行一个**5 步向导**：多语言 → 语言 → 域名 → 模块 → 摘要。已有站点通过原生 React 选项卡进行管理：**属性（Properties）· 模块加载（Module Loading）· 域名（Domains）· 语言（Languages）· 站点配置（Site Config）· 翻译（Translations）· 脚本（Scripts）**。

![React 站点工具——搜索、Columns（列）、Export（导出）、New/Old 切换开关和 + New site](/screenshots/react/melis-cms/meliscms-tool-sites-list.png)

![站点编辑——模块加载（Module Loading）选项卡：逐模块开关，可拖动重新排序加载顺序](/screenshots/react/melis-cms/meliscms-tool-sites-edit-tab-moduleloading.png)

![站点编辑——站点配置（Site Config）选项卡：常规设置以及逐语言的键/值设置](/screenshots/react/melis-cms/meliscms-tool-sites-edit-tab-siteconfig.png)

### 模板（Templates）——页面布局

`/melis-cms/templates`。原生列表和原生表单：名称 / 类型 / 站点，以及布局（Layout）/ 控制器（Controller）/ 动作（Action）（模板映射到的 `.phtml` 布局）。

![React 模板列表——KPI 卡片，每行显示控制器/动作、布局和站点](/screenshots/react/melis-cms/meliscms-tool-templatemanager-list.png)

### 样式（Styles）——应用于页面的 CSS

`/melis-cms/styles`。管理 CSS 样式表（名称、CSS 路径/源、站点）；在页面属性选项卡中为页面附加一个样式。

![React 样式列表——每行显示状态、名称、CSS 路径和站点](/screenshots/react/melis-cms/meliscms-tool-stylemanager-list.png)

### 前台语言（Front-office Languages）

`/melis-cms/languages`。平台已知的区域设置（locale）主列表（区域设置 + 带国旗的名称）。

### 平台 ID（Platforms IDs）——各环境的页面 ID 范围

`/melis-cms/platform-ids`。为每个环境预留一段独立的页面和模板 ID 区间，这样在 dev / staging / production 之间移动内容时 ID 永远不会冲突。

![React 平台 ID 列表——各平台的页面和模板 ID 范围](/screenshots/react/melis-cms/meliscms-tool-platformids-list.png)

### 301 重定向（301 Redirects）——让旧链接持续有效

`/melis-cms/site-301`。当某个公开 URL 发生变化时，添加一条重定向（旧 URL → 新 URL，每个站点唯一），使旧地址仍然可以解析。

![React 301 重定向列表——每个站点从旧 URL 到新 URL](/screenshots/react/melis-cms/meliscms-tool-siteredirect-list.png)

### 迷你模板与菜单管理器（Mini-Templates & Menu manager）

迷你模板（`/melis-cms/mini-templates`）是预先构建好的内容块，编辑者可以一键将其拖放到页面上；菜单管理器（`/melis-cms/menu-manager`）将它们组织成分类，以便在页面编辑器的迷你模板管理器中易于查找。

![React 菜单管理器——可拖动重新排序的分类及其迷你模板树](/screenshots/react/melis-cms/meliscms-tool-minitemplate-menu-manager.png)

## React API 端点

路由在 `config/react-api.php` 中于 `/melis/react-api/…` 下声明；控制器位于 `src/Controller/MelisReactApi*Controller.php`。每个动作都由 `CapabilityGuardTrait` 守护（`denyUnlessAccess()` 用于 `MelisCoreRights::canAccess(MELIS_KEY)`，然后是 `denyUnlessCan('<action>')`）。到处遵循的约定是：成功时返回 `{ success, data }`，失败时返回 `{ success:false, error }`；每个 fetch 都会携带凭据发送 `X-Requested-With: XMLHttpRequest`。

| 控制器 | 守护（melisKey） | 基础路径 | 动作 |
| --- | --- | --- | --- |
| `MelisReactApiPageController` | `meliscms_page` | `/cms-page` | `structure`、`properties`、`seo`、`refs`、`languages`、`ancestors`、`save-properties`、`save-seo` |
| `MelisReactApiCmsSitesController` | `meliscms_tool_sites` | `/cms-sites` | `list`、`meta`、`get`、`config`、`modules`、`create` |
| `MelisReactApiSiteRedirectController` | `meliscms_tool_site_301` | `/site-redirects` | `list`、`stats`、`sites`、`get`、`save`、`delete` |
| `MelisReactApiTemplateController` | `meliscms_tool_templates` | `/templates` | `list`、`stats`、`sites`、`get`、`save`、`delete` |
| `MelisReactApiCmsLanguageController` | `meliscms_tool_language` | `/cms-languages` | `list`、`stats`、`get`、`save`、`delete` |
| `MelisReactApiCmsPlatformIdController` | `meliscms_tool_platform_ids` | `/cms-platform-ids` | `list`、`stats`、`get`、`save`、`delete` |
| `MelisReactApiCmsStyleController` | `meliscms_tool_styles` | `/cms-styles` | `list`、`stats`、`sites`、`get`、`save`、`delete` |
| `MelisReactApiCmsMiniTemplateController` | `meliscms_mini_template_manager_tool` | `/cms-mini-templates` | `list`、`stats`、`sites`、`item`、`save`、`delete` |
| `MelisReactApiCmsMenuManagerController` | `meliscms_mini_template_menu_manager_tool` | `/menu-manager` | `sites`、`languages`、`tree`、`saveTree`、`category`、`saveCategory`、`deleteCategory` |

```ts
// GET the styles list (keyset), then POST a 301 redirect
const r = await fetch('/melis/react-api/cms-styles?limit=25', {
  headers: { 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'include',
})
const { success, data } = await r.json()   // { success, data: { items, total, nextCursor } }

await fetch('/melis/react-api/site-redirects/save', {
  method: 'POST',
  headers: { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ id: null, siteId: 1, oldUrl: 'old', newUrl: 'new' }),
})
```

## 权能（Capabilities）

在 `config/react.capabilities.php` 中于 `melisReactToolCapabilities` 下声明，以每个工具的承载权限的 `melisKey` 为键（仅在工具带有 Export 按钮时才有 `export`）：

```php
'meliscms_tool_site_301'                    => ['list','create','edit','delete','export','test'],
'meliscms_tool_templates'                   => ['list','create','edit','delete','export'],
'meliscms_tool_styles'                      => ['list','create','edit','delete','export'],
'meliscms_tool_language'                    => ['list','create','edit','delete'],
'meliscms_tool_platform_ids'                => ['list','create','edit','delete','export'],
'meliscms_tool_sites'                       => ['list','create','edit','delete','export'],
'meliscms_mini_template_manager_tool'       => ['list','create','edit','delete','export'],
'meliscms_mini_template_menu_manager_tool'  => ['list','create','edit','delete'],
```

页面编辑器以 `meliscms_page` 为键，采用结构化树形，因此它的每个按钮和选项卡都会成为一项权能：

```php
'meliscms_page' => [
  'actions' => ['create','save','clear','publish','status','delete','duplicate','view','display'],
  'tabs'    => ['edition','properties','seo','languages'],
],
```

每个贡献模块都在同一个 `meliscms_page` 键下添加**它自己的**页面选项卡/按钮（Laminas 合并），并且 `CmsPage.tsx` 通过 `useCaps('meliscms_page').can(cap)` 对它们进行过滤。同一文件中还有两个相关的键用于暴露编辑器的权限：`melisReactRightsTools` 向 用户 → 权限 中注入一个仅含权限的 `meliscms_page`（"Page edition"，页面编辑）节点，而 `melisReactSidebarHostSections` 则保持 MelisCms 区块可见，这样即使某个用户只拥有页面权限也能访问到页面树。

## 模块化扩展接缝

其他模块可以在不触碰 MelisCms 的情况下贡献页面编辑器选项卡和跨选项卡的保存：

```ts
// Register a page-edit tab (link-check, Open Graph, GA, historic, script-editor…)
window.__melisRegisterPageTab(key, ({ idPage }) => <MyTab idPage={idPage} />)
// Register a cross-cutting save hook, run by the global Save/Publish
window.__melisRegisterPageSaveHook(key, async (idPage) => { /* persist my tab */ })
```

在服务器端，同样的扩展点依然可用：

- **`melis_cms_page_tabs_alter`** — 在页面编辑器中添加或移除选项卡。
- **`modify_page_properties_form_config`** — 修改属性表单以添加自定义字段。

## 关键服务

使用 `$sm->get('<alias>')` 解析。业务逻辑保留在服务器端（Laminas 服务）；React 只负责展示以及 API 调用。

| 服务别名 | 职责 |
| --- | --- |
| `MelisCmsPageService` | 写入页面模型：`savePage()`、`savePagePublished()`、`savePageSaved()`、`savePageSeo()`、`savePageLang()`、`savePageStyle()`、`savePageTree()`、`saveProperties()`。 |
| `MelisCmsSiteService` | 站点 CRUD 以及按站点查询页面。 |
| `MelisCmsPageGetterService` | `getPageContent($pageId)` — 返回页面已缓存的渲染 HTML。 |
| `MelisCmsRights` | 后台权限检查：`isAccessible()`、`isActionButtonActive()`。 |
| `MelisCmsSitesDomainsService` | 各环境的域名管理。 |
| `MelisCmsSitesPropertiesService` | 站点级键/值设置（站点配置选项卡）。 |
| `MelisCmsSiteModuleLoadService` | 逐站点的模块加载（模块加载选项卡）。 |
| `MelisCmsMiniTemplateService` / `MelisCmsMiniTemplateGetterService` | 迷你模板库和分类管理。 |
| `MelisCmsPageExportService` / `MelisCmsPageImportService` | 将页面树导出/导入为文件。 |

## 数据库表

`MelisCms` 不拥有任何表。CMS 架构定义在 melis-engine 中，并通过其网关和服务进行访问。切勿直接查询 CMS 表——请使用引擎的网关/服务，以便缓存和生态系统的其余部分保持一致。

## 页面生命周期事件

页面生命周期通过在 `Module.php::onBootstrap` 中接线的 19 个监听器实现。这些事件是主要的扩展点——请挂钩这些事件，而不是直接调用 `MelisCmsPageService`，以便历史记录、缓存和其他模块保持同步。

| 操作 | 事件 |
| --- | --- |
| 保存草稿 | `meliscms_page_save_start` / `_end`（+ `…savetree_*`、`…saveproperties_*`、`…saveedition_*`、`…saveseo_*`） |
| 发布 | `meliscms_page_publish_start` / `_end` |
| 取消发布 | `meliscms_page_unpublish_start` / `_end` |
| 删除 | `meliscms_page_delete_start` / `_end`（+ `…deleteseo_*`、`…delete_page_*`） |
| 移动 | `meliscms_page_move_start` / `_end` |
| 复制 | `meliscms_page_duplicate_start` / `_end` |
| 插件会话 | `meliscms_page_savesession_plugin_*`、`meliscms_page_removesession_plugin_*` |

```php
// React to a page being published — in Module.php::onBootstrap or a listener's attach()
$eventManager->getSharedManager()->attach(
    'MelisCms',
    'meliscms_page_publish_end',
    function (\Laminas\EventManager\EventInterface $e) {
        $idPage = $e->getParams()['idPage'] ?? null;
        // log, sync, clear a custom cache, notify…
    },
    50
);
```

## 添加新的内容块

每个内容块都继承 `MelisTemplatingPlugin`（定义在 melis-engine 中）。实现 `front()` 以在线上站点上渲染，实现 `back()` 以渲染编辑容器，然后注册该插件。News、Slider 和 Category2 模块是参考实现。

## 仪表盘小组件

`MelisCmsPagesIndicatorsPlugin` 在后台仪表盘上显示站点和页面数量（已发布与未发布）。

![指标（Indicators）仪表盘小组件——站点、页面，以及已发布与未发布的页面](/screenshots/react/melis-cms/meliscms-dashboardplugins-indicators.png)

## 关键文件

| 关注点 | 路径 |
| --- | --- |
| 模块引导 + 监听器接线 | `vendor/melisplatform/melis-cms/src/Module.php` |
| React API 路由 + 控制器 | `vendor/melisplatform/melis-cms/config/react-api.php` |
| React 权能 | `vendor/melisplatform/melis-cms/config/react.capabilities.php` |
| 砖块源码（全部 9 个工具） | `vendor/melisplatform/melis-cms/ui-react/src/` |
| 已构建的包（已提交） | `vendor/melisplatform/melis-cms/public/ui-react/brick.js` + `brick.manifest.json` |
| 页面服务 | `vendor/melisplatform/melis-cms/src/Service/MelisCmsPageService.php` |
| 站点服务 | `vendor/melisplatform/melis-cms/src/Service/MelisCmsSiteService.php` |
| 权限服务 | `vendor/melisplatform/melis-cms/src/Service/MelisCmsRightsService.php` |
| 全部监听器（19 个） | `vendor/melisplatform/melis-cms/src/Listener/` |
| 仪表盘小组件 | `vendor/melisplatform/melis-cms/src/Controller/DashboardPlugins/MelisCmsPagesIndicatorsPlugin.php` |

## 另见

- [melis-engine](/legacy/reference/modules/melis-engine) — 拥有 CMS 数据模型和所有表网关。
- [melis-front](/legacy/reference/modules/melis-front) — 前台渲染和实时预览。
- [melis-core](/legacy/reference/modules/melis-core) — 认证、权限、事件和基础配置。
