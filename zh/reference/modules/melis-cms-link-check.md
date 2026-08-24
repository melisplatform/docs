# MelisCmsLinkCheck

> 链接检测器，用于抓取某个页面（也可选择性地抓取其子页面或内部链接），记录所有失效链接和失效图片，并为每个页面保留一份扫描日志。软件包 `melisplatform/melis-cms-link-check`。

## 用途

MelisCmsLinkCheck 是 Melis 的链接检测器。它会抓取某个页面——可选择跟踪其子页面或内部链接——并记录所发现的每一个失效链接和失效图片，为每个被扫描的页面保存一份扫描日志。抓取过程本身（curl、校验、日志写入、翻译）位于服务端的 Laminas 服务 `MelisCmsLinkCheckService::executeTest()` 中；React 后台只是一个展示层，通过该模块的 react-api 端点读取并启动扫描。

在 v6 React 后台（`/melis-react`）中，该模块提供了一个原生的全 React 砖块（brick），包含两个界面：

- 左侧菜单中的 **Link tester**（链接检测器）工具——一个只读的历史扫描结果查看器、一个 **Launch a scan**（启动扫描）弹窗，以及逐行的错误报告，并带有一个 **New / Old**（新版 / 旧版）切换开关，可回退到 iframe 中的经典工具。
- React CMS 页面编辑器中的 **Link Checker** 选项卡，用于启动并报告仅针对当前正在编辑的这一个页面的扫描。

## 启用方式

在 `config/melis.module.load.php` 中添加：

```php
return [
    'MelisCmsLinkCheck',
];
```

两个界面都受激活状态控制：只有当模块处于激活状态、且宿主通过 `GET /melis/react-api/react-modules`（该接口列出所有随附 `brick.manifest.json` 的已激活模块）发现它时，它们才会出现。停用该模块会同时移除菜单工具和页面编辑器选项卡。

## React 后台一览

| 项目 | 值 |
| --- | --- |
| 砖块类型 | 原生全 React（带 New/Old 旧版 iframe 回退）+ 一个页面编辑器选项卡 |
| 砖块 id | `cms-link-check` |
| Manifest `route` | `/melis-cms-link-check/results` |
| `label` | `Testeur de liens`（Link tester，链接检测器） |
| `forwardKey` | `MelisCmsLinkCheck/MelisCmsLinkCheckList` |
| `melisKey`（菜单 / Old 视图 iframe / 权限节点） | `meliscmslinkcheck_tool` |
| 页面选项卡键（= 其权限能力） | `meliscmslinkcheck_page_link_check_tab` |
| API 基址 | `/melis/react-api/cms-link-check` |
| React-api 控制器 | `MelisReactApiLinkCheckController`（可调用名 `MelisReactApiLinkCheck`） |
| 表（归属本模块） | `melis_cms_link_check_logs` |
| 扫描服务 | `MelisCmsLinkCheckService::executeTest(...)` |

## Link tester 工具

左侧边栏 → **Link tester**（*Testeur de liens*）节点会将该工具作为顶部选项卡打开。New 视图会列出平台上的每一条扫描日志，每个被扫描的页面对应一行。

![显示 KPI 卡片、筛选器和结果列表的 React Link tester 工具](/screenshots/react/melis-cms-link-check/meliscmslinkcheck-tool-linkchecker-list.png)

该列表包含 KPI 卡片（Pages scanned 已扫描页面数、Total errors 错误总数、Sites 站点数）、一个搜索框（匹配页面 URL、页面 id、站点名称 / 标签）、一个站点筛选器（仅列出有日志的站点）、Reset filters（重置筛选器）、一个列管理器（显示 / 隐藏 / 重排列，配置保存在本地）以及一个 Export（导出）。点击列标题可排序（默认：最新扫描在前）。错误数以徽章形式显示——为 0 时为绿色，否则为红色（Errors 为总数，Links 为链接数，Images 为图片数）。

每一行有四个操作：

| 操作 | 图标 | 用途 |
| --- | --- | --- |
| View front | eye（眼睛） | 在新标签页中打开被扫描页面的 URL。 |
| Edit page | pencil（铅笔） | 在 React CMS 页面编辑器中打开该页面并切换过去。 |
| Report | document（文档） | 打开该页面的逐条错误报告弹窗。 |
| Delete | trash（垃圾桶） | 删除该扫描日志（需要 `delete` 权限能力）。 |

右上角的 **New / Old**（新版 / 旧版）切换开关可在整个工具的 React 查看器（默认）与在 iframe 中渲染的经典工具（`/melis/react-tool-page?key=meliscmslinkcheck_tool`）之间切换，后者也可用于以旧方式启动扫描。

## 启动扫描

红色的 **Launch a scan**（启动扫描）按钮（在你拥有 `launch` 权限能力时显示）会打开一个弹窗。

![带有页面选择器、范围单选按钮和检查复选框的 Launch a scan 弹窗](/screenshots/react/melis-cms-link-check/meliscmslinkcheck-tool-linkchecker-launchscan.png)

从惰性加载的 CMS 页面树中选择起始页面，选择一个 **scope**（范围）以及要 **check**（检查）的内容，然后 **Run**（运行）。扫描会抓取相关页面、记录结果、刷新列表并推送一条通知。

- **Scope**（范围）——仅此页面 / 此页面及其子页面 / 此页面及其内部链接（以 `follow: '1' | '2' | '3'` 发送）。
- **Check**（检查）——Links（链接）和 / 或 Images（图片）（以 `options: ['LINK', 'IMG']` 发送）。

## 查看某个页面的报告

某一行上的 **Report** 操作会打开该扫描日志的详细错误信息。

![处于干净状态的逐页错误报告弹窗](/screenshots/react/melis-cms-link-check/meliscmslinkcheck-tool-linkchecker-report.png)

无错误的页面会显示 “✓ No error recorded for this page.”（此页面未记录任何错误。）存在错误的页面会显示一个表格：**Type**（LINK / IMG 徽章）· **URL** · **Details**（失败详情）。详情来自解析后的 XML `lcl_errors` 列，被解码为一个由 `{ url, type, details }` 组成的 `errorList`。

## 从页面编辑器检查单个页面

在 React CMS 页面编辑器中打开一个页面，然后点击 **Link Checker** 选项卡。它会显示该页面的最近一次扫描（日期，Errors / Links / Images 徽章，以及详细错误表格或一条干净状态消息），并带有一个 **Re-scan**（重新扫描）按钮——如果该页面从未被扫描过，则显示 **Launch a scan**（启动扫描）——用于仅针对该页面运行一次扫描。

![React CMS 页面编辑器中的 Link Checker 选项卡，显示针对单个页面的扫描](/screenshots/react/melis-cms-link-check/meliscmslinkcheck-pageedition-tab-linkchecker-launchandreport.png)

该选项卡通过宿主桥接 `window.__melisRegisterPageTab`（归属于 CmsPage 砖块）贡献到 CMS 页面编辑器中，键为 `meliscmslinkcheck_page_link_check_tab`；CmsPage 以 `{ idPage }` 渲染它。

## React API —— 端点

路由位于 `config/react-api.php`，由 `MelisCmsLinkCheck\Controller\MelisReactApiLinkCheckController` 提供服务。全部位于 `/melis/react-api/cms-link-check` 之下，采用 `{ success, data, error }` 契约。每次 fetch 都会发送 `X-Requested-With: XMLHttpRequest` 和 `credentials: 'include'`。

| 方法与 URL | Action | 用途 |
| --- | --- | --- |
| `GET /cms-link-check` | `list` | 扫描日志（keyset：`limit`、`search`、`site`、`sort`、`dir`、`after`）→ `{items,total,nextCursor}` |
| `GET /cms-link-check/stats` | `stats` | KPI `{total, errors, sites}` |
| `GET /cms-link-check/sites` | `sites` | 站点筛选选项（仅日志中出现过的站点） |
| `POST /cms-link-check/launch` | `launch` | 运行一次扫描（`{pageId, follow, options}`）→ `{status,message,logIds,pagesVisited}` |
| `GET /cms-link-check/by-page/:idPage` | `byPage` | 单个页面的最近一次扫描（页面编辑器选项卡）；若从未扫描过则 `data: null` |
| `DELETE /cms-link-check/delete/:id` | `delete` | 删除一条扫描日志 |
| `GET /cms-link-check/:id` | `get` | 单条日志 + 其解析后的 `errorList:[{url,type,details}]` |

> 路由顺序很重要：`/stats`、`/sites`、`/launch`、`/by-page/:idPage` 和 `/delete/:id` 都声明在通配路由 `/:id` 之前。

`list`、`stats`、`sites`、`get`、`by-page` 和 `delete` 这些操作通过参数化 SQL（`Laminas\Db\Adapter\AdapterInterface`）直接读取 `melis_cms_link_check_logs`。只有 `launch` 会委托给 `MelisCmsLinkCheckService::executeTest([...])`——即真正的抓取过程——并用 `ob_start()` / `ob_end_clean()` 包裹，以防旧代码产生的警告破坏 JSON。Launch-a-scan 的页面选择器复用了一个已有的旧端点（没有新增后端）：`GET /melis/MelisCms/TreeSites/get-tree-pages-by-page-id?nodeId=<id>`（`nodeId=-1` → 根站点）。

## 权限能力

在 `config/react.capabilities.php` 中声明于两个承载权限的节点下：

```php
return [
  'melisReactToolCapabilities' => [
    'meliscmslinkcheck_tool' => ['list', 'launch', 'delete', 'export'],
    'meliscms_page' => [
      'tabs' => [
        ['key' => 'meliscmslinkcheck_page_link_check_tab', 'label' => 'tr_meliscmslinkcheck_page_link_check_tab'],
      ],
    ],
  ],
];
```

- **工具权限能力**——`list`（整个只读查看器：list/stats/sites/report）、`launch`（运行一次扫描）、`delete`（删除一条日志）、`export`（Export 按钮；导出复用 `list` 端点）。在 React 中，它们通过 `MelisCan('meliscmslinkcheck_tool', cap)` 控制 UI；在服务端，每个操作先由 `denyUnlessAccess()` 守卫，再由 `denyUnlessCan('list'|'launch'|'delete')` 守卫。
- **页面选项卡权限能力**——键 `meliscmslinkcheck_page_link_check_tab` 必须与传给 `window.__melisRegisterPageTab` 的键一致；它*就是*该选项卡的权限能力。如果没有这条声明，即使是管理员，CMS 页面权限白名单也会隐藏该选项卡按钮。该选项卡的 `by-page` 端点仅由会话认证守卫（它是页面编辑器的一个子功能）；而按钮由此权限能力守卫。

## 数据库表

| 表 | 作用 |
| --- | --- |
| `melis_cms_link_check_logs` | 每个被扫描页面一条扫描日志：失效链接 / 失效图片计数，以及以 XML 形式存储在 `lcl_errors` 列中的详细错误列表。 |

## 旧版控制器（Old 视图）

供 New/Old iframe 回退和经典工具使用，React 查看器不使用它们：

| 控制器 | 作用 |
| --- | --- |
| `MelisCmsLinkCheckListController` | 经典工具页面及其结果 DataTables。 |
| `MelisCmsLinkCheckLaunchController` | 经典的启动弹窗 / 表单（页面 + 范围 + 检查项）。 |
| `MelisCmsLinkCheckPageLinkCheckController` | 经典的页面编辑 Link Check 选项卡（`renderPageLinkCheckAction`，`{ idPage }`）。 |

## 关键文件

| 关注点 | 路径 |
| --- | --- |
| React-api 路由 + 可调用名 | `config/react-api.php` |
| 权限能力 | `config/react.capabilities.php` |
| 旧版工具配置 | `config/app.*.php` |
| React-api 控制器 | `src/Controller/MelisReactApiLinkCheckController.php` |
| 扫描服务 | `src/Service/MelisCmsLinkCheckService.php` |
| React 砖块源码 | `ui-react/src/`（`brick.tsx`、`LinkCheckPage.tsx`、`linkcheck-api.ts`、……） |
| 构建后的砖块 + manifest | `public/ui-react/brick.js`、`public/ui-react/brick.manifest.json` |
