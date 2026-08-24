# MelisCmsProspects

> 潜在客户 / 联系管理：前台联系表单将访客留言捕获为潜在客户，React 后台让你浏览、筛选、编辑、导出和删除这些记录，并按主题对请求进行分类。软件包 `melisplatform/melis-cms-prospects`。

## 用途

`MelisCmsProspects` 将访客提交的联系表单捕获为存储在数据库中的**潜在客户**（leads）。后台用户可以浏览、筛选、编辑、导出（CSV/Excel）和删除这些潜在客户，并按**主题**对其进行分类。该模块附带一个仪表盘统计小组件，并接入平台的 GDPR 工具链（用户信息 / 提取 / 删除 + 自动删除周期）。

在 Melis v6 中，两个后台工具 —— **Prospects** 和 **Themes** —— 都是在 `/melis-react` 下提供的**原生全 React 界面**，各自与一个 JSON `react-api` 层通信。底层的数据模型、服务、前台 Show Form 插件和 GDPR 接线与 v5 保持一致。

## 启用

添加到 `config/melis.module.load.php`：

```php
return [
    'MelisCmsProspects',
];
```

依赖项：`melis-core`、`melis-engine`、`melis-front`、`melis-cms` 和 `laminas/laminas-mvc-plugin-flashmessenger`。该模块为 `dbdeploy: true` —— 其数据表通过 dbdeploy 机制创建/更新。两个 React 工具仅在模块处于激活状态时才出现在后台中（它们从其 `brick.manifest.json` 中被发现）。

## React 后台

**位置：** 左侧边栏 → **MelisMarketing** → **Prospects** → **Prospects** / **Themes**。每个都以自己的顶级标签页打开。每个工具都保留一个 **New / Old** 切换开关：*New* 是 React 界面（默认），*Old* 在 iframe 中渲染旧版工具（`/melis/react-tool-page?key=<melisKey>`）。

两个 brick 打包在同一个 bundle 中（`public/ui-react/brick.manifest.json`）：

| 项 | Prospects | Themes |
| --- | --- | --- |
| Brick id / 路由 | `prospects` — `/prospects` | `prospect-themes` — `/prospect-themes` |
| `forwardKey`（菜单 → 路由） | `MelisCmsProspects/ToolProspects` | `MelisCmsProspects/ProspectThemes` |
| Old 视图 iframe `melisKey`（zone） | `MelisCmsProspects_tool_prospects` | `MelisCmsProspects_tool_themes` |
| 权限 / 能力 melisKey | `melisprospects_tool_prospects_section` | `melisprospects_tool_themes_section` |
| API 基址 | `/melis/react-api/prospects` | `/melis/react-api/prospect-themes` |
| 控制器 | `MelisReactApiProspectController` | `MelisReactApiProspectThemeController` |

> 注意：manifest 中的 `melisKey` 是用于 Old 视图 iframe 的可渲染 **zone** 键 —— 权限**并不**挂在它上面。访问守卫和能力键挂在菜单节点 `melisprospects_tool_..._section` 上（在 `config/app.interface.php` 中声明）。

### Prospects 工具

![React Prospects 工具：KPI 卡片（Total / This month / Average per month / Anonymized）、搜索、All-sites 和 All-types 筛选器、日期范围选择器、Reset filters、列管理器、Export、New/Old 切换开关和刷新按钮 —— 每一行都有编辑和删除操作](/screenshots/react/melis-cms-prospects/meliscmsprospects-tool-prospects-list.png)

你会看到**平台上的每一个潜在客户**。列表包含**四张 KPI 卡片**（Total、This month、Average per month、Anonymized）、一个**搜索**框（姓名 / 邮箱 / 电话 / 公司）、一个**站点**筛选器、一个**类型**筛选器、一个**日期**范围选择器（Today / Yesterday / Last 7 / Last 30 / This month / Last month / Custom）、**Reset filters**、一个持久化的**列（Columns）**管理器、**Export** 和一个刷新按钮。点击列头可**排序**（除 *Message* 外的所有列）。每一行都有**编辑**和**删除**。

潜在客户**不会**在这里创建 —— 它们只能来自前台联系表单。点击**编辑**会将该潜在客户作为宿主**子标签页**（← Back）打开，显示一个 React 表单：一张**联系信息（Contact information）**卡片（姓名、邮箱、电话、公司、国家/地区）、一张**留言（Message）**卡片和一张**详情（Details）**侧卡片（**站点（Site）**选择器、**主题（Theme）**选择器、只读的**联系日期（Contact date）**）。没有字段是必填的（邮箱仅在填写时才做格式校验）；**联系日期**和**类型**不可修改 —— 它们在捕获时由前台表单设置。

![React 潜在客户编辑表单 —— 一张联系信息卡片（姓名、邮箱、电话、公司、国家/地区）、一个留言框和一张详情侧卡片（Site、Theme、只读 Contact date）；子标签栏显示了下钻路径（← Back · Paul Martin）](/screenshots/react/melis-cms-prospects/meliscmsprospects-tool-prospects-edit.png)

### Themes 工具

Themes 列表显示**两张 KPI 卡片**（Total themes、total Items）、一个**搜索**框、**Reset filters**、一个**列（Columns）**管理器、**Export**、**New/Old** 切换开关和 **+ New theme**。每一行显示主题**名称**及其**条目数**，并有三个操作：**重命名**（单字段模态框）、**编辑**（打开该主题的 **Items** 子标签页）和**删除**。

![React Themes 工具：Total / Items KPI 卡片、搜索、Reset filters、Columns、Export、New/Old 切换开关和 "+ New theme" —— 每一行都提供重命名、编辑（打开条目）和删除](/screenshots/react/melis-cms-prospects/meliscmsprospects-tool-themes-list.png)

!["New theme"（新建主题）模态框 —— 单个 Name 字段（code 由后端保留，不在此处输入）](/screenshots/react/melis-cms-prospects/meliscmsprospects-tool-themes-new-modal.png)

编辑一个主题会将其 **Items** 面板作为子标签页打开（← Back + 主题名称）：一个可搜索的条目列表（id + 名称），每行带有编辑/删除操作以及 **+ New item**。添加或编辑条目会打开一个模态框，用于捕获**每种 CMS 语言的名称** —— 一行语言标签（旗帜 + 绿色"已填写"圆点）加上当前语言的 **Name** 字段。至少必须填写一种语言。

![某个主题（"My Billing"）的 Items 面板（子标签页）—— 一个可搜索的条目列表，每行带有编辑/删除操作以及一个 "+ New item" 按钮，以下钻子标签页的形式显示](/screenshots/react/melis-cms-prospects/meliscmsprospects-tool-themes-edit-themecategorylist.png)

!["New item"（新建条目）模态框 —— "Content per language"（按语言的内容）标签（English / Français）和当前语言的 Name 字段](/screenshots/react/melis-cms-prospects/meliscmsprospects-tool-themes-edit-themecategorylist-new-modal.png)

## React API

路由位于 `config/react-api.php`（通过 `Module::getConfig()` 合并）。全部位于 `/melis/react-api/` 之下，契约为 `{ success, data, error }`；每次 fetch 都会发送 `X-Requested-With: XMLHttpRequest` 和 `credentials: 'include'`。

**Prospects** —— `MelisReactApiProspectController`：

| 方法 & URL | 用途 |
| --- | --- |
| `GET /prospects` | 键集（keyset）列表（`limit,search,site,type,dateFrom,dateTo,sort,dir,after`）→ `{items,total,nextCursor}` |
| `GET /prospects/stats` | KPI `{total, thisMonth, avgPerMonth, anonymized}` |
| `GET /prospects/sites` | 站点筛选选项 |
| `GET /prospects/types` | 去重的 `pros_type` 值 |
| `GET /prospects/themes` | 用于表单 Theme 选择器的主题条目选项 |
| `GET /prospects/:id` | 单个潜在客户（已格式化） |
| `POST /prospects/save` | **仅更新**（不创建）；联系日期和类型在服务端不可变 |
| `DELETE /prospects/delete/:id` | 删除一个潜在客户 |

**Themes & items** —— `MelisReactApiProspectThemeController`：

| 方法 & URL | 用途 |
| --- | --- |
| `GET /prospect-themes` | 主题的键集列表 → `{items,total,nextCursor}`，含 `itemCount` |
| `GET /prospect-themes/stats` | KPI `{total, withCode, items}` |
| `GET /prospect-themes/:id` | 单个主题 `{id,name,code,itemCount}` |
| `POST /prospect-themes/save` | 创建（id=0）/ 更新（name 必填 ≤45，唯一；若缺省则保留 code） |
| `DELETE /prospect-themes/delete/:id` | 删除一个主题 + 条目 + 翻译（级联） |
| `GET /prospect-themes/languages` | CMS 语言 `{languages:[{id,name,locale}]}` |
| `GET /prospect-themes/items?themeId=X` | 某个主题的条目（名称使用会话语言） |
| `GET /prospect-themes/items/:id` | 单个条目 `{id,themeId,translations:{langId:text}}` |
| `POST /prospect-themes/items/save` | 创建/更新一个条目（≥1 条非空翻译；按语言 upsert/delete） |
| `DELETE /prospect-themes/items/delete/:id` | 删除一个条目及其翻译 |

```ts
// update a prospect (no create)
await apiFetch<{id:number}>('/melis/react-api/prospects/save', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: 3, siteId: 1, name: 'Paul Martin',
    email: 'paul.martin@example.com', message: '…', theme: null }),
})
// save a theme item (name per language)
await apiFetch<{id:number}>('/melis/react-api/prospect-themes/items/save', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: 0, themeId: 2, translations: { '1': 'My invoices', '2': 'Mes factures' } }),
})
```

> 两个控制器都通过参数化 SQL（`AdapterInterface`，键集列表使用 `MelisReactKeysetListTrait`）直接操作数据表，复现了旧版的业务规则。它们仍然会触发旧版日志事件（`meliscmsprospects_toolprospects_save_end` / `_delete_end`、`meliscmsprospects_theme_save_end` / `_delete_end`、`meliscmsprospects_theme_item_save_end`），因此模块的 flash/日志监听器可以继续工作。

## 能力（Capabilities）

在 `config/react.capabilities.php` 中声明（`melisReactToolCapabilities`），以承载权限的菜单节点 melisKey 为键。`Capabilities::flatten()` 生成点分字符串，传给 React 中的 `MelisCan(melisKey, cap)` 和服务端的 `denyUnlessCan(cap)`（对未声明的能力默认允许）。

```php
'melisprospects_tool_prospects_section' => ['list', 'edit', 'delete', 'export'], // NO create
'melisprospects_tool_themes_section' => [
    'actions' => ['create', 'list', 'edit', 'delete', 'export'],
    'tabs' => [
        ['key' => 'items', 'label' => 'tr_melis_cms_prospects_theme_items',
         'actions' => ['list', 'create', 'edit', 'delete']],
    ],
],
```

- **Prospects**：`list`、`edit`、`delete`、`export`（没有 `create` —— 潜在客户只能诞生于公开的联系表单）。
- **Themes**：`create`、`list`、`edit`、`delete`、`export`，外加 `items` 子标签页（`items`、`items.list`、`items.create`、`items.edit`、`items.delete`）。

每个控制器动作都会守卫两次：先是 `denyUnlessAccess()`（认证 + `MelisCoreRights::canAccess`），然后是 `denyUnlessCan('list')` 等。`save` 会根据 id 选择 `edit` 还是 `create`。

## 关键服务

| 服务别名 | 职责 |
| --- | --- |
| `MelisCmsProspectsService` / `MelisProspectsService` | 主服务。`saveProspectsDatas($datas, $prosId = null)` 创建或更新一个潜在客户；`getProspectsDataForWidgets($widgetId = '')` 返回总数 / 本月 / 平均计数；`getProspectsDataByDate($type, $date)` 按日期统计登记数；`getWidgetProspects($identifier)` 检索小组件所需的数据。 |
| `MelisProspectsGdprAutoDeleteService` | 处理 GDPR 自动删除周期（模块列表、标签列表、警告 / 二次警告用户列表、账户删除）。 |

表网关（Table gateways）：`MelisProspects`、`MelisCmsProspectsThemeTable`、`MelisCmsProspectsThemeItemTable`、`MelisCmsProspectsThemeItemTransTable`。

> React 控制器**不**使用 `MelisCmsProspectsService`（它们直接查询数据表）；而经典工具（Old 视图）、Show Form 插件、仪表盘小组件和 GDPR 监听器仍然依赖它。

## 前台

`MelisCmsProspectsShowFormPlugin` 控制器插件在前端渲染联系表单。从 React 页面编辑器的插件面板（在 **Melis Cms Prospects** 下）将 **Show Form** 块拖放到页面上。其设置模态框保留三个标签页：

![打开了插件面板的 React 页面编辑器 —— "Contact Form" 块位于 "Melis Cms Prospects" 分组下，可拖放到页面上](/screenshots/react/melis-cms-prospects/meliscmsprospects-page-menu-plugins-selector.png)

![Show Form —— Field list 标签页：字段构建器 —— 每个字段有一个 Show/Hide 开关和一个 Mandatory 复选框；行可拖动排序，其顺序即为表单顺序](/screenshots/react/melis-cms-prospects/meliscmsprospects-page-plugins-showform-config-tab-fieldlist.png)

| 标签页 | 控制项 |
| --- | --- |
| Properties | 渲染模板（`template_path`）和来源站点（`pros_site_id`）。 |
| Field list | 字段构建器 —— 每个字段有一个 Show/Hide 开关和一个 Mandatory 复选框（仅在 Show 开启时启用）；拖动行以设置表单顺序。字段：`pros_name`、`pros_company`、`pros_country`、`pros_email`、`pros_telephone`、`pros_message`。 |
| Themes | 用于填充表单主题下拉框的主题。 |

配置文件：`config/plugins/MelisCmsProspectsShowFormPlugin.config.php`。前台模板：`view/.../plugins/prospects-form.phtml`。在后台仪表盘上，**Prospects Statistics** 小组件（`MelisCmsProspectsStatisticsPlugin`，分区 `MelisMarketing`）以图表展示一段时间内的登记情况。

!["Prospects statistics" 仪表盘小组件 —— 一个 Daily/Monthly/Yearly 登记图表加上一个最近潜在客户的表格](/screenshots/react/melis-cms-prospects/meliscmsprospects-dashboard-plugin-prospectsstatistics.png)

## 数据库表

| 表 | 存储内容 |
| --- | --- |
| `melis_cms_prospects` | 一条捕获的潜在客户记录：站点、类型、主题、姓名、邮箱、电话、留言、公司、国家/地区、联系日期、GDPR 最后日期。主键：`pros_id`。 |
| `melis_cms_prospects_themes` | 主题（`pros_theme_name`、`pros_theme_code`）。主键：`pros_theme_id`。 |
| `melis_cms_prospects_theme_items` | 属于某个主题的条目。主键：`pros_theme_item_id`。 |
| `melis_cms_prospects_theme_items_trans` | 主题条目的按语言翻译。主键：`item_trans_id`。 |

## 事件钩子

以 `MelisCmsProspects` 作为目标标识符进行挂载：

| 事件名称 | 触发者 |
| --- | --- |
| `meliscmsprospects_toolprospects_save_start` / `_end` | Prospects 工具（经典 + React 控制器） |
| `meliscmsprospects_toolprospects_delete_start` / `_end` | Prospects 工具（经典 + React 控制器） |
| `meliscmsprospects_theme_save_end` / `_delete_end` | Themes 工具（经典 + React 控制器） |
| `meliscmsprospects_theme_item_save_end` | 主题条目（经典 + React 控制器） |

```php
$sharedEvents->attach(
    'MelisCmsProspects',
    'meliscmsprospects_toolprospects_save_end',
    $fn,
    50
);
```

GDPR 监听器（用户信息、提取、删除、自动删除）在 `src/Module.php` 中接线。GDPR 字段映射位于 `config/app.gdpr.php`。

## 关键文件

| 关注点 | 路径（位于 `vendor/melisplatform/melis-cms-prospects/` 下） |
| --- | --- |
| 模块配置 / 路由 / 服务 | `config/module.config.php` |
| React-api 路由 + invokables | `config/react-api.php` |
| React 能力 | `config/react.capabilities.php` |
| 后台界面树 | `config/app.interface.php` |
| 经典工具的表与表单 | `config/app.tools.php` |
| 模板插件配置 | `config/plugins/MelisCmsProspectsShowFormPlugin.config.php` |
| 仪表盘小组件配置 | `config/dashboard-plugins/` |
| GDPR 字段映射 | `config/app.gdpr.php` |
| React API 控制器 | `src/Controller/MelisReactApiProspectController.php`、`MelisReactApiProspectThemeController.php` |
| 经典控制器 | `src/Controller/ToolProspectsController.php`、`MelisCmsProspectsThemesController.php`、`MelisCmsProspectsThemeItemsController.php` |
| 主服务 | `src/Service/MelisCmsProspectsService.php` |
| GDPR 自动删除服务 | `src/Service/` |
| 前台表单插件 | `src/Controller/Plugin/MelisCmsProspectsShowFormPlugin.php` |
| 仪表盘小组件 | `src/Controller/DashboardPlugins/MelisCmsProspectsStatisticsPlugin.php` |
| React bricks（源码 / 构建产物） | `ui-react/src/` → `public/ui-react/brick.js` + `brick.manifest.json` |
| 表网关 | `src/Model/Tables/` |
| GDPR 监听器与引导 | `src/Module.php`、`src/Listener/` |

另请参阅：[模块参考](/zh/reference/modules) · [melis-cms](/zh/reference/modules/melis-cms) · [melis-core](/zh/reference/modules/melis-core)
