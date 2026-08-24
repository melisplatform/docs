# MelisCmsPageHistoric

> CMS 页面编辑的审计日志——记录谁在何时对页面做了什么，以 Historic（历史）标签页的形式呈现在 React 页面编辑器中，并以仪表盘小组件的形式展示。软件包 `melisplatform/melis-cms-page-historic`。

## 用途

`MelisCmsPageHistoric` 会自动捕获每一次页面操作（保存、发布、取消发布、删除），并附带作者身份和时间戳。历史记录通过挂接在 CMS 页面生命周期上的事件监听器写入——无需为每个页面单独接线。日志以**只读**方式呈现：既出现在页面编辑器内的 **Historic 标签页**中，也出现在 **Recent page activity（近期页面活动）**仪表盘小组件中。它用于问责追溯，而非恢复页面。

## 启用

在 `config/melis.module.load.php` 中添加：

```php
return [
    'MelisCmsPageHistoric',
];
```

运行随附的 `install/dbdeploy/` 增量脚本以创建历史记录表（`extra.dbdeploy: true`）。依赖 `melis-core`、`melis-engine`、`melis-front` 和 `melis-cms`。

## 一个没有 brick 的模块

这是一个不寻常的 React 模块：它**不携带自己的 brick**（没有 `ui-react/`，没有 `public/ui-react/brick.manifest.json`，也没有 Vite 打包产物）。它的 React 足迹是由 `Module::getConfig()` 合并的三个 PHP 配置文件，外加一个控制器和一个 legacy 仪表盘插件。这两个 React 界面**仅在模块处于激活状态时**才会出现。

| 配置文件 | 贡献内容 |
| --- | --- |
| `config/react-api.php` | `GET /melis/react-api/cms-page/historic` 端点 + 可调用（invokable）控制器 |
| `config/react.capabilities.php` | 共享 `meliscms_page` 节点下的 Historic 标签页 capability |
| `config/app.interface.php` | CMS 页面编辑器中的 Historic 标签页**按钮**（图标 `history`） |

在 Historic 标签页内渲染的 React 组件**并非由本模块提供**——它由 melis-core 外壳在宿主侧提供，并通过 page-tab 注册表接线（`window.__melisRegisterPageTab('melispagehistoric_historic', Component)`）。本模块只贡献数据端点、capability 和标签页按钮声明；CMS 页面编辑器（MelisCms）承载该标签页。

## Historic 标签页（React 页面编辑器）

左侧边栏 → **MelisCms** → 打开一个**页面** → 编辑器标签行中的 **Historic** 标签页。它以只读表格显示**当前页面的**操作记录，最新的在前，包含 **Date**（日期）、**Action**（操作，带彩色的 Publish / Save / Unpublish 徽章）和 **User**（用户）三列。**Filter (All actions)**（筛选，全部操作）下拉菜单可将结果收窄到单一操作类型。列表在**服务端分页**——它绝不会一次性加载全部历史记录。

![React CMS 页面编辑器中的 Historic 标签页，显示带有 Date、Action 徽章和 User 列的页面历史表格以及操作筛选器](/screenshots/react/melis-cms-page-historic/meliscmspagehistoric-page-tab-historic.png)

该标签页仅显示当前页面的历史。若需查看*所有*页面的活动，请使用下方的仪表盘小组件。

## Recent page activity（近期页面活动）仪表盘小组件

在后台**仪表盘（Dashboard）**上，**Recent page activity** 小组件列出跨所有用户的最近页面操作（时间戳 · 状态圆点 · 页面名称 + id · 操作 · 用户）。它与其他仪表盘小组件一样，可从 "Add a widget"（添加小组件）面板中添加/移除，位于 **MELIS CMS PAGE HISTORIC** 分组下。

![Recent page activity 仪表盘小组件，列出近期页面操作，"Add a widget" 面板中将其显示在 Melis Cms Page Historic 分组下](/screenshots/react/melis-cms-page-historic/meliscmspagehistoric-dashboard-plugin-recentactivity.png)

该小组件仍是一个 **legacy PHP 仪表盘插件**（`MelisCmsPageHistoricRecentUserActivityPlugin`，动作 `recentActivityPages`），在 React 仪表盘的小组件宿主内渲染——没有 React 重写版本。它通过 `MelisPageHistoricTable->getPagesHistoricForDashboard()` 读取数据，并以 MelisCms 处于激活状态及仪表盘插件访问权限作为准入条件。

## React API——Historic 端点

在 `config/react-api.php` 中声明，控制器为 `MelisCmsPageHistoric\Controller\MelisReactApiPageHistoricController`（可调用别名 `MelisReactApiPageHistoric`）。仅一个动作，契约为 `{ success, data, error }`。

| 方法与 URL | 动作 | 用途 |
| --- | --- | --- |
| `GET /melis/react-api/cms-page/historic?idPage=<id>&page=<n>&perPage=<25>&action=<type>` | `listAction` | 当前页面的审计行，服务端分页，外加用于筛选下拉框的各不相同的操作类型 |

响应 `data` 结构：

```jsonc
{ "success": true, "data": {
  "idPage": 1,
  "items": [ { "id": 123, "date": "2026-08-18 10:10:25", "action": "Publish",
               "user": "John Doe", "userId": 1 } ],   // newest first (ORDER BY hist_id DESC)
  "page": 1, "perPage": 25, "total": 87,               // total = indexed COUNT → drives paging
  "action": "",                                        // active action filter ('' = all)
  "actionTypes": ["Publish", "Save", "Unpublish"]      // DISTINCT hist_action for the filter select
} }
```

实现说明：

- **访问守卫：** 该动作仅检查 `MelisCoreAuth->hasIdentity()`（未认证时返回 `401`）。它**不会**在服务端强制校验 capability——请将下文的 capability 视为一个 **UI 门控**信号，而非后端授权检查。
- **数据：** 在 `melis_hist_page_historic` 上直接执行参数化 SQL（LEFT JOIN `melis_core_user` 以获取用户名；已删除的用户标记为 `"Utilisateur supprimé (<id>)"`）。
- **分页：** `perPage` 被限制在 `1..200` 范围内（默认 25）；`total` 是一个遵循相同 `WHERE` 条件的独立索引 `COUNT(*)`。可选的 `action` 筛选同时应用于计数和当前页。

## Capabilities（权限能力）

由于本模块向 CMS 页面工具贡献了一个标签页，其 capability 声明在**共享的** `meliscms_page` 权限节点下（通过 `ArrayUtils::merge` 追加到该工具的 `tabs[]`）：

```php
return [
  'melisReactToolCapabilities' => [
    'meliscms_page' => [
      'tabs' => [
        ['key' => 'melispagehistoric_historic', 'label' => 'tr_melispagehistoric_page_tab_historic_Historic'],
      ],
    ],
  ],
];
```

- `key`（`melispagehistoric_historic`）即该标签页的 capability；它与宿主用于注册标签页组件的 key 以及 `app.interface.php` 中的接口 `melisKey` 相匹配。
- 它归属在 `meliscms_page`（Users → Rights 中的 "Edition de page"）之下，**而非**包装器 `meliscms`，**也不是**标签页按钮节点。
- 缺少该声明时，CMS 页面 capability 白名单会隐藏该标签页按钮——即使对管理员也是如此。

## 历史记录是如何写入的（监听器模式）

在 `src/Module.php` 中接线了两个监听器（仅在后台引导时），负责写入记录行；React 只负责读取。

| 监听器 | 事件 | 记录内容 |
| --- | --- | --- |
| `MelisPageHistoricPageEventListener` | `meliscms_page_save_end`、`meliscms_page_publish_end`、`meliscms_page_unpublish_end`、… | Save / Publish / Unpublish |
| `MelisPageHistoricDeletePageListener` | `meliscms_page_delete_end` | Delete（同时清理） |

你无需自己写入历史记录行——通过 CMS 保存、发布或删除页面会自动触发监听器。

## 数据库表

| 表 | 存储内容 |
| --- | --- |
| `melis_hist_page_historic` | 每条记录的操作占一行：`hist_id`（主键）、`hist_page_id`、`hist_action`、`hist_date`、`hist_user_id`、`hist_description`。 |

## 关键文件

| 关注点 | 路径 |
| --- | --- |
| React-api 控制器 | `vendor/melisplatform/melis-cms-page-historic/src/Controller/MelisReactApiPageHistoricController.php` |
| React-api 路由 | `vendor/melisplatform/melis-cms-page-historic/config/react-api.php` |
| Historic 标签页 capability | `vendor/melisplatform/melis-cms-page-historic/config/react.capabilities.php` |
| Historic 标签页按钮 / 接口 | `vendor/melisplatform/melis-cms-page-historic/config/app.interface.php` |
| 模块引导（监听器） | `vendor/melisplatform/melis-cms-page-historic/src/Module.php` |
| 表网关（table gateway） | `vendor/melisplatform/melis-cms-page-historic/src/Model/Tables/MelisPageHistoricTable.php` |
| 仪表盘插件（legacy） | `vendor/melisplatform/melis-cms-page-historic/src/Controller/DashboardPlugins/MelisCmsPageHistoricRecentUserActivityPlugin.php` |
| 安装 SQL / dbdeploy | `vendor/melisplatform/melis-cms-page-historic/install/` |

另见：[MelisCms](/zh/reference/modules/melis-cms)、[模块参考](/zh/reference/modules)
