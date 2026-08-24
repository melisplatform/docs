# MelisCmsGoogleAnalytics

> Google Analytics 4 (GA4) 数据提供方，将站点已配置的 GA4 媒体资源转换为 Melis React 后台中的会话曲线、KPI 汇总和受众特征。软件包 `melisplatform/melis-cms-google-analytics`。

## 用途

MelisCmsGoogleAnalytics 在服务端读取站点的 GA4 媒体资源（通过 `google/apiclient` +
`google/analytics-data`），并在 React 后台中将其渲染为图表。它是一个**仅用于展示**的
提供方：为站点启用 GA（选择提供方、输入 **Property ID** 并上传服务账号
**私钥 JSON**）是在由 `melis-cms-page-analytics` 拥有的 **Site analytics** 工具中完成的，
而非本模块。

本模块提供**由同一个仪表盘组件支撑的两个界面**：

- React CMS 页面编辑器中的 **Google Analytics 选项卡**，展示**当前打开页面**的 GA 统计数据
  （按页面路径过滤）。
- 注入到 **Site analytics** 工具中的**原生 React 站点级展示**，当该站点的 *Analytics module*
  设置为 Google Analytics 时，展示**整个站点**的 GA 统计数据。

![React CMS 页面编辑器中的 Google Analytics 选项卡 —— 当前打开页面的会话曲线、KPI 卡片以及 Language/Country/City 受众特征](/screenshots/react/melis-cms-google-analytics/meliscmsgoogleanalytics-pageedition-tab-googleanalytics.png)

![Site analytics 工具中的站点级 Google Analytics 展示 —— 与页面级相同的 GA4 仪表盘，作用域为整个站点](/screenshots/react/melis-cms-google-analytics/meliscmsgoogleanalytics-tool-tab-analytics.png)

## 启用

React 宿主在启动时通过 `GET /melis/react-api/react-modules` 发现该模块，该接口会列出
所有随附 `brick.manifest.json` 的活动模块。停用该模块会同时移除这两个界面。

Composer 依赖项：`google/apiclient ^2.15`、`google/analytics-data ^0.16.0`、`melis-core`、
`melis-cms`、`melis-cms-page-analytics`。

## React brick

这是一个**页面编辑器选项卡 brick**（仅小部件）：它**没有左侧菜单工具**、**没有路由**，也
**没有 `react-api.php`**。清单采用多 brick 形态，仅含一个只带 id 的条目，因此宿主在启动时
加载该 bundle，brick 会尽早自行注册。

```json
{ "entry": "brick.js", "bricks": [ { "id": "cms-google-analytics" } ] }
```

`brick.tsx` 不调用 `__melisRegisterBrick`；相反，它在模块求值时执行两次注册：

```tsx
// 1) Contribute a tab to the CMS page editor (owned by the CmsPage brick).
registerPageTab('melis_cms_google_analytics_page_tab', GoogleAnalyticsPageTab)

// 2) Register the native site-level display for the PageAnalytics host to mount by key.
;(window.__melisAnalyticsSiteDisplays ||= {})['melis_cms_google_analytics'] = GoogleAnalyticsSiteDisplay
window.dispatchEvent(new CustomEvent('melis:analytics-site-display-registered'))
```

| 组件 | 职责 |
| --- | --- |
| `brick.tsx` | 仅负责注册 —— 添加页面选项卡和站点展示；不含路由 brick。 |
| `GoogleAnalyticsPage.tsx` (`GoogleAnalyticsPageTab`) | 页面编辑器选项卡。接收 `{ idPage }`，通过 `getPageContext` 解析出页面所属的站点 + 路径，然后使用 `siteId` + `pagePath` 挂载仪表盘。 |
| `GoogleAnalyticsSiteDisplay.tsx` | 仪表盘：日期范围切换、内联 SVG 会话图表、KPI 卡片、三个受众特征表格。两个界面复用同一组件（存在 `pagePath` ⇒ 页面级作用域，缺失 ⇒ 整个站点）。 |

由于 React 被外部化到宿主全局变量，该 bundle 无法导入宿主模块，因此采用了
**内联样式**、**文件内 `{fr,en}` 国际化**（来自 `document.documentElement.lang`）以及一个
**手绘 SVG 图表**（不使用图表库）。客户端从不使用 Google SDK。

## 仪表盘

两个界面渲染相同的仪表盘：

- **日期范围控件** —— **7 days** / **30 days** / **Custom**（起始与结束日期选择器 +
  **Apply**）以及一个**刷新**按钮。结束日期默认为今天（包含 GA4 当日数据）。
- **周期内会话数** —— 每日会话数的折线/面积图。
- **KPI 卡片** —— Sessions、Users、Page views、Pages/Session、Avg. Session Duration、Bounce Rate。
- **受众特征** —— 三个表格（Language、Country、City），各自按会话数排序并附带占比 %。

如果该站点未配置 GA 或 API 失败，则会显示一个红色错误框，展示后端消息
（例如 "GA settings incomplete"），而不是图表。

**查找位置：** 按页面 → **MelisCms** → 打开一个页面 → **Google Analytics** 选项卡。按站点 →
**MelisMarketing** → **Site analytics** → 选择站点 → **Analytics** 子选项卡。为站点启用 GA
的位置在 **Site analytics → Settings**（Analytics module = Google Analytics、Property ID、
私钥 JSON 上传、可选的自定义分析脚本）。

![Site analytics Settings 子选项卡 —— Analytics module 设置为 Google Analytics、Property ID、私钥 JSON 上传以及自定义分析脚本](/screenshots/react/melis-cms-google-analytics/meliscmsgoogleanalytics-tool-tab-settings.png)

## 数据端点

该模块**没有 `config/react-api.php`**。React UI 调用已有的
`GoogleAnalyticsController`（路由 `application-MelisCmsGoogleAnalytics/default`，`ViewJsonStrategy`）。

| 方法与 URL | 动作 | 用途 |
| --- | --- | --- |
| `GET /melis/MelisCmsGoogleAnalytics/GoogleAnalytics/getPageContext?idPage=<id>` | `getPageContextAction` | 解析页面所属的站点 + 路径 → `{ success, siteId, pagePath, pageURL }`。 |
| `POST /melis/MelisCmsGoogleAnalytics/GoogleAnalytics/getChartData` | `getChartDataAction` | 获取某站点（可选带页面路径）的 GA4 数据 → `{ success, chartData, errors }`。 |

`getChartData` 的请求体采用表单编码：

```ts
const body = new URLSearchParams()
body.set('siteId', String(siteId))
body.set('dateRange[option]', option)          // '7days' | '30days' | 'custom'
body.set('dateRange[startDate]', startDate)    // '7daysAgo' | '30daysAgo' | 'YYYY-MM-DD'
body.set('dateRange[endDate]', endDate)        // 'today' | 'YYYY-MM-DD'
body.set('dateRange[clientTimestamp]', String(Date.now()))
if (pagePath) body.set('pagePath', pagePath)   // page tab only → GA4 dimensionFilter on pagePath
```

UI 所消费的 `chartData` 结构：

- `chartData.date.totals{}` → KPI 值（`sessions`、`activeUsers`、`screenPageViews`、
  `screenPageViewsPerSession`、`averageSessionDuration`、`bounceRate`）。
- `chartData.date.plot{ <tsSeconds>: { sessions } }` → 会话曲线（键为秒数）。
- `chartData.language / .country / .city` → 受众特征表格（`{ value: { sessions } }`）。

在服务端，`getChartDataAction` 调用 GA4 服务（`GoogleAnalytics4APIService` /
`MelisCmsGoogleAnalyticsService`，在 `module.config.php` 中设有别名），它们使用站点的 Property ID
和私钥 JSON，并将 GA4 行数据规范化为 `chartData`。当 API 失败时，该动作会返回一个
干净的 `{ success:false, errors }`，而非 500。

## 能力

在 `config/react.capabilities.php` 中声明，并由 `Module::getConfig()` 合并。由于该模块
向 CMS 页面工具贡献了一个选项卡，因此它在共享的权限承载节点
**`meliscms_page`** 下声明其能力（一个 `ArrayUtils::merge` 会将 `tabs[]` 折叠进 CMS 页面工具的能力中）：

```php
return [
  'melisReactToolCapabilities' => [
    'meliscms_page' => [
      'tabs' => [
        ['key' => 'melis_cms_google_analytics_page_tab', 'label' => 'tr_melis_cms_google_analytics'],
      ],
    ],
  ],
];
```

- `key` **必须等于**在 `brick.tsx` 中传给 `window.__melisRegisterPageTab` 的键 —— 它*就是*
  该选项卡的能力。若缺失，即使是管理员，CMS 页面能力白名单也会隐藏该选项卡按钮。
- **无需声明后端能力**：该模块不暴露任何 `react-api` 动作。访问权限由对 CMS 页面编辑器
  （页面选项卡）以及对 Site analytics 工具（站点展示）的访问权来控制。

## 宿主集成

- **页面选项卡桥接（`__melisRegisterPageTab`）** —— 由 CmsPage brick 提供。两个 brick 共享
  一个幂等守卫：谁先加载谁就创建 `window.__melisPageTabRegistry` 并定义注册器。
  CmsPage 读取 `tabs['melis_cms_google_analytics_page_tab']` 并使用 `{ idPage }` 渲染组件；
  仅当能力被授予时该按钮才会出现。
- **站点展示桥接（`__melisAnalyticsSiteDisplays`）** —— 由 `melis-cms-page-analytics` 的
  *Site analytics* 工具提供/消费。该 brick 在键
  `melis_cms_google_analytics`（与站点存储的 `pad_analytics_key` 匹配）下注册其组件，并触发
  `melis:analytics-site-display-registered`。当站点的 *Analytics module* = Google Analytics 时，
  宿主会在 Analytics 子选项卡中挂载它（带 `{ siteId }`）—— 以原生 React 替换旧的 iframe。
- **通用部分保留在宿主中。** 页面编辑器选项卡外壳、Site analytics 工具、站点选择器
  以及 Settings 表单归属于 MelisCms / MelisCmsPageAnalytics；本模块仅填充
  *Google Analytics* 展示部分。

## 关键文件

| 关注点 | 路径 |
| --- | --- |
| 路由 / GA 服务别名 | `config/module.config.php` |
| React 能力（`meliscms_page.tabs[]`） | `config/react.capabilities.php` |
| 控制器（`getPageContextAction`、`getChartDataAction`） | `src/Controller/GoogleAnalyticsController.php` |
| React brick 源码（Vite IIFE） | `ui-react/src/brick.tsx`、`GoogleAnalyticsPage.tsx`、`GoogleAnalyticsSiteDisplay.tsx` |
| 已构建的 brick + 清单 | `public/ui-react/brick.js`、`public/ui-react/brick.manifest.json` |

另请参阅：[melis-cms-page-analytics](/zh/reference/modules/melis-cms-page-analytics) ·
[melis-cms](/legacy/reference/modules/melis-cms) ·
[melis-core](/legacy/reference/modules/melis-core)
