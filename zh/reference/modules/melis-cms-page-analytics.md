# MelisCmsPageAnalytics

> 面向 CMS 站点的基础页面访问分析——记录页面浏览量，并允许站点接入
> 外部分析服务商（例如 Google Analytics），现由原生 React 后台驱动。
> 软件包 `melisplatform/melis-cms-page-analytics`。

## 用途

`MelisCmsPageAnalytics` 是平台内置的页面浏览量跟踪器。在每次前台页面
渲染时，它会向 `melis_cms_page_analytics` 中记录一次去重后的访问（每个会话、每个页面、
每天仅记录一次），并在后台以 **Page Analytics** 站点工具以及每个 CMS 页面上的
**Page Analytics** 选项卡的形式呈现数据。你还可以为每个站点存储一个分析服务商
密钥和一段 JavaScript 代码片段，模块会在渲染时将其注入页面 `<head>`——这正是
Google Analytics 等附加服务商所使用的挂钩点。

在 v6 中，后台是一个 **原生纯 React 砖块（brick）**：一个只读访问表格外加一个设置
面板，通过调用 `react-api` JSON 层实现。跟踪逻辑、服务商契约以及设置的持久化
均保持不变——v6 仅替换了展示层。

## 启用

在 `config/melis.module.load.php` 中添加：

```php
return [
    'MelisCmsPageAnalytics',
];
```

必需的 Composer 依赖：`melisplatform/melis-core` 和 `melisplatform/melis-cms`。该模块
在运行时还依赖 `melis-engine` 与 `melis-front` 服务（树结构、页面表、前台
分发事件）。数据库表通过 `MelisSetupController` 从 `install/sql/` 安装。仅当模块
被列入 `melis.module.load.php` 时，React 砖块才会出现在菜单中（模块化
砖块发现机制）。

## 关键服务

在 `config/module.config.php` 中注册为 `service_manager` 别名：

| 服务别名 | 作用 |
| --- | --- |
| `MelisCmsPageAnalyticsService` | 实现服务商契约的主服务。`getAnalytics($siteId)` 从 `melis_cms_page_analytics_data` 读取激活的服务商密钥，并从 `melis_cms_page_analytics_data_settings` 读取相应的设置行。 |
| `MelisCmsDefaultPageAnalyticsService` | 内置记录器。`saveAnalyticsData($pageId)` 解析站点、确认页面处于激活/已发布状态，并向 `melis_cms_page_analytics` 插入一条去重后的记录——除非已配置了 Google Analytics 的 view id 和令牌，此时内置计数器便会让位。 |
| `MelisCmsPageAnalyticsTable` | 访问日志的表网关。 |
| `MelisCmsPageAnalyticsDataTable` | 每站点服务商选择的表网关。 |
| `MelisCmsPageAnalyticsDataSettingsTable` | 每（站点、服务商）设置的表网关。 |

两个主服务都会触发开始/结束事件：`melis_cms_default_page_analytics_save_start` /
`melis_cms_default_page_analytics_save_end`。

## 前台

这里没有视图助手（view helper）或模板插件。跟踪与脚本注入由
`MelisCmsPageAnalyticsListener`（在 `Module.php` 中挂载）处理，它挂钩了前台
渲染管线中的两个事件：

| 事件 | 优先级 | 动作 |
| --- | --- | --- |
| `melisfront_site_dispatch_ready` | `-10000` | 仅前台渲染——调用 `MelisCmsDefaultPageAnalyticsService::saveAnalyticsData($pageId)` 以记录去重后的访问。 |
| `melis_front_layout` | 默认 | 读取站点配置的 `pads_js_analytics` 片段，并在渲染后的 HTML 的 `</head>` 之前注入它。 |

## 数据库表

| 表 | 主键 | 存储内容 |
| --- | --- | --- |
| `melis_cms_page_analytics` | `ph_id` | 访问日志（去重后的命中）：`ph_page_id`、`ph_session_id`、`ph_date_visit`、`ph_site_id`。不存储 IP 地址。 |
| `melis_cms_page_analytics_data` | `pad_id` | 每站点服务商选择：`pad_site_id`、`pad_analytics_key`。 |
| `melis_cms_page_analytics_data_settings` | `pads_id` | 每（站点、服务商）设置：`pads_site_id`、`pads_analytics_key`、`pads_js_analytics`、`pads_settings`（例如 `google_analytics_view_id`）。 |

## React 后台

该工具是一个 **原生纯 React 砖块**，带有 **New / Old** 切换开关，可回退到 iframe 中的
旧版工具。它位于侧边栏 **Marketing / Site Tools → Page Analytics** 之下，
打开后包含两个内部选项卡：**Analytics** 和 **Settings**。

| 砖块属性 | 值 |
| --- | --- |
| 砖块 id | `pageanalytics` |
| 清单 `route` | `/melis-marketing/meliscms-page-analytics` |
| `forwardKey` | `MelisCmsPageAnalytics/MelisCmsPageAnalyticsTool` |
| `melisKey`（Old 视图 iframe 目标） | `meliscms_page_analytics_display` |
| 访问守卫节点（控制器） | `meliscms_page_analytics_tools_section` |
| API 基址 | `/melis/react-api/page-analytics` |

- **Analytics 选项卡**——一个 **按页面聚合** 的只读访问表格（页面 id、页面名称、
  访问次数、最近访问），配有 KPI 卡片（命中数 / 页面数 / 站点数 / 最近访问）、站点筛选、
  搜索、列管理器、无限滚动、服务端排序以及 **Export（导出）**。已删除的页面会显示
  斜体的 *(deleted)*（已删除）标签。如果所选站点被分配了自带 React 展示的第三方
  服务商，该选项卡会承载 **该模块的仪表盘** 而非内置表格。
- **Settings 选项卡**——先选择一个 **Site（站点）**，然后选择一个 **Analytics module（分析模块）**
  （内置的 "no analytics"（无分析）选项外加每个激活的服务商）。所选模块自身的字段会以
  数据驱动方式渲染（文本 / 文本域 / 下拉 / 密码 / 文件，例如 Google Analytics 私钥）。平台
  管理员还可以编辑自定义的 `<head>` JS 片段；非管理员则只能只读查看。

> 这些界面的 React 截图暂不可用。

## React API

路由定义在 `config/react-api.php` 中并合并入模块配置。契约为
`{ success, data, error }`；每个请求都会发送 `X-Requested-With: XMLHttpRequest` 和
`credentials: 'include'`。两个控制器支撑该 UI：`MelisReactApiPageAnalyticsController`（工具本体）
和 `MelisReactApiPageAnalyticsTabController`（CMS 页面编辑器选项卡）。

| 方法与 URL | 用途 |
| --- | --- |
| `GET /melis/react-api/page-analytics` | 按页面聚合的访问（keyset：`limit`、`search`、`site`、`sort`、`dir`、`after`）→ `{items,total,nextCursor}`，每项 `{pageId,pageName,count,lastVisit}`。 |
| `GET /melis/react-api/page-analytics/stats` | KPI `{hits, pages, sites, lastVisit}`（遵循 `search`/`site`）。 |
| `GET /melis/react-api/page-analytics/sites` | 供选择器使用的站点选项 `{sites:[{id,name}]}`。 |
| `GET /melis/react-api/page-analytics/settings` | Settings 选项卡状态（模块列表 + 数据驱动的表单结构 + 当前值）。 |
| `GET /melis/react-api/cms-page/analytics` | 单个页面的访问（`idPage`、`page`、`perPage`）→ `{visits, sessions, lastVisit, recent, page, perPage, recentTotal}`。 |

工具控制器通过参数化 SQL 直接读取表（`melis_cms_page_analytics`
连接 `melis_cms_page_published` 以获取名称、连接 `melis_cms_site` 供选择器使用，采用不透明的 keyset
游标）。它在具备权限的节点 `meliscms_page_analytics_tools_section` 上守卫访问——而 **不是**
在清单的 `melisKey`（`meliscms_page_analytics_display`）上，后者仅是 Old 视图 iframe
区域键。

**写入设置并不是一条 react-api 路由**——Settings 面板会将一个 `FormData` 载荷 POST 到
旧版工具的 action，从而完整复用所有服务端逻辑（Laminas 校验、GA 密钥上传、`pads_settings`
序列化、对原始 JS 的管理员守卫、flash messenger）：

```ts
const LEGACY_SAVE_URL = '/melis/MelisCmsPageAnalytics/MelisCmsPageAnalyticsTool/save'
await fetch(LEGACY_SAVE_URL, {
  method: 'POST',
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
  credentials: 'include',
  body: formData,
}) // → { success, textTitle, textMessage, errors }
```

## CMS 页面选项卡与能力

该模块为 CMS 页面编辑器贡献了一个 **Page Analytics** 选项卡，由
`GET /melis/react-api/cms-page/analytics`（总访问数、去重会话数、最近访问，以及
该页面近期访问日期的分页列表）支撑。该选项卡在
`config/react.capabilities.php` 中的共享节点 `meliscms_page` 下声明，而键
`meliscms_page_analytics_tab` **就是** 在 Users → Rights 中用于对其进行门控的能力字符串：

```php
'melisReactToolCapabilities' => [
  'meliscms_page' => [
    'tabs' => [
      ['key' => 'meliscms_page_analytics_tab', 'label' => 'tr_melis_cms_page_analytics_title'],
    ],
  ],
],
```

## 模块化站点级展示

当一个站点被分配了声明有 React 展示的第三方分析模块（例如通过 `react_display_key` 的
**MelisCmsGoogleAnalytics**）时，Analytics 选项卡会承载该模块自己的
React 展示，而非原生访问表格。该砖块消费一个全局注册表，
`window.__melisAnalyticsSiteDisplays[<analyticsKey>]`；它会在
`melis:analytics-site-display-registered` 这一 window 事件上重新检查（因为 bundle 是异步加载的），
如果没有任何注册项，则回退到 iframe `/melis/react-tool-page?key=<displayKey>&siteId=<site>`。

## 示例

```php
// Read the active analytics provider config for a site
$analytics = $serviceManager->get('MelisCmsPageAnalyticsService')->getAnalytics($siteId);

// Read recorded visits for a specific page (used by the Page Analytics tab)
$visits = $serviceManager->get('MelisCmsPageAnalyticsTable')->getDataByPageId($pageId);
```

访问记录会在前台渲染时通过监听器自动完成；通常无需直接调用
`saveAnalyticsData()`。

## 关键文件

| 关注点 | 路径 |
| --- | --- |
| 模块引导 / 监听器注册 | `vendor/melisplatform/melis-cms-page-analytics/src/Module.php` |
| 路由、服务、表别名、控制器 | `vendor/melisplatform/melis-cms-page-analytics/config/module.config.php` |
| React API 路由 | `vendor/melisplatform/melis-cms-page-analytics/config/react-api.php` |
| React 选项卡能力 | `vendor/melisplatform/melis-cms-page-analytics/config/react.capabilities.php` |
| React 砖块 + 清单 | `vendor/melisplatform/melis-cms-page-analytics/public/ui-react/` |
| React 源码 | `vendor/melisplatform/melis-cms-page-analytics/ui-react/src/` |
| React API 控制器 | `vendor/melisplatform/melis-cms-page-analytics/src/Controller/MelisReactApiPageAnalyticsController.php`、`MelisReactApiPageAnalyticsTabController.php` |
| 服务商契约 | `vendor/melisplatform/melis-cms-page-analytics/src/Service/MelisCmsPageAnalyticsServiceInterface.php` |
| 主分析服务 | `vendor/melisplatform/melis-cms-page-analytics/src/Service/MelisCmsPageAnalyticsService.php` |
| 内置记录器 | `vendor/melisplatform/melis-cms-page-analytics/src/Service/MelisCmsDefaultPageAnalyticsService.php` |
| 前台监听器（跟踪 + 注入） | `vendor/melisplatform/melis-cms-page-analytics/src/Listener/MelisCmsPageAnalyticsListener.php` |
| 表网关 | `vendor/melisplatform/melis-cms-page-analytics/src/Model/Tables/` |
| 数据库安装 SQL | `vendor/melisplatform/melis-cms-page-analytics/install/sql/` |

另见：[melis-cms](/zh/reference/modules/melis-cms)、[melis-core](/zh/reference/modules/melis-core)
