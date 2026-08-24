# MelisCmsSiteRobot

> 按域名编辑 `robots.txt` 并动态提供服务，配备原生全 React 后台。软件包 `melisplatform/melis-cms-site-robot`。

## 用途

`MelisCmsSiteRobot` 让你可以从后台管理每个站点域名的 `robots.txt`，并在 `https://<domain>/robots.txt` 上动态提供服务——直接从数据库读取，无需维护任何静态文件。保存后更改立即生效。robots 文本以每个域名一行的方式存储在专用表中；不存在按页面或按语言的变体。

在 v6 React 后台（`/melis-react`）中，该工具以**原生全 React 砖块（brick）**的形式提供——一个真正调用 `react-api` JSON 层的 React 列表 + 编辑器——并带有一个 **New / Old** 切换开关，可回退到 iframe 中的旧版工具。底层数据模型、引擎表网关以及动态 `/robots.txt` 前台路由与 v5 相比保持不变。

## 启用

在 `config/melis.module.load.php` 中添加：

```php
return [
    'MelisCmsSiteRobot',
];
```

依赖项：`melis-core` 和 `melis-cms`。该模块为 `dbdeploy: true`，因此其数据表会自动创建，并在运行时复用由 `melis-engine` 提供的表网关。React 砖块**仅在模块被激活时**才会出现——宿主通过 `brick.manifest.json` 发现它（`GET /melis/react-api/react-modules`）；从 `melis.module.load.php` 中移除该模块会使其从菜单中消失。

## 后台（React）

**位置：**左侧边栏 → **MelisCms** 分组 → **Robots.txt**（树路由 `/melis-cms/site-robot`）。它会作为一个名为 **Robots.txt** 的顶部标签页打开，其中两个层级以原生宿主子标签页呈现：**站点域名列表 → 某个域名的 robots.txt 编辑器**。

![React Robots.txt 列表——KPI 卡片（Domains（域名）/ With robots.txt（有 robots.txt）/ Without robots.txt（无 robots.txt））、一个 "Search a domain…"（搜索域名）搜索框、一个 "All sites"（所有站点）筛选器、Reset filters / Columns / Export（重置筛选 / 列 / 导出）、New/Old 切换开关以及一个刷新按钮，每行包含 Domain / Site / Env.（域名 / 站点 / 环境）以及一个 Set/None（已设置/未设置）徽章外加一个编辑操作](/screenshots/react/melis-cms-site-robot/meliscmssiterobot-tool-robots-list.png)

### 第 1 层 —— 域名列表

该列表显示**平台上的每一个站点域名**（每个域名一行，数据来自 **Sites** 工具）。它提供 **KPI 卡片**（Domains / With robots.txt / Without robots.txt）、一个**搜索**框（匹配域名或站点名称）、一个 **All sites** 筛选器、一个 **Columns** 列管理器、一个 **Export** 按钮以及 **Reset filters**。列表支持无限滚动（keyset）并采用服务端排序。列包括：**ID**、**Domain**、**Site**、**Env.**、**robots.txt**（每行一个 **Set / None** 徽章）。每行都有一个**编辑**（铅笔）操作，并且在存在内容时还有一个**删除**（清空）操作。

这里**没有 "+ New"，也没有删除域名的功能**——域名来自 Sites 工具；你只能编辑或清空每个域名的 robots.txt。

### 第 2 层 —— 编辑某个域名的 robots.txt

打开一个域名会新增一个**子标签页**（带有 **← Back** 返回按钮）。编辑器以只读方式显示 **Domain** 和 **Site**，外加一个大型等宽字体的 **robots.txt content**（robots.txt 内容）文本区域用于填写正文。**Save**（右上角）会持久化保存，并在该域名的 `/robots.txt` 上实时提供服务。若留空，则不提供任何内容。

![React robots.txt 编辑器——只读的 Domain 和 Site 字段、一个等宽字体的 "robots.txt content"（robots.txt 内容）文本区域、← Back 子标签页以及右上角的 Save 按钮](/screenshots/react/melis-cms-site-robot/meliscmssiterobot-tool-robots-edit.png)

### New / Old 切换开关

右上角的 **New / Old** 切换开关可将整个工具在 React 界面（**New**，默认）与 iframe 中渲染的经典工具（**Old**，位于 `/melis/react-tool-page?key=site_robot_tool_display`）之间切换。

## React 砖块

| 项目 | 值 |
| --- | --- |
| 砖块类型 | 原生全 React（带 New/Old 旧版 iframe 回退） |
| 砖块 id | `siterobot`（`brick.tsx` ⇄ `brick.manifest.json`） |
| Manifest `route` | `/melis-cms/site-robot` |
| `label` | `Robots.txt` |
| `forwardKey` | `MelisCmsSiteRobot/ToolSiteRobot` |
| `melisKey`（iframe / 可渲染区域） | `site_robot_tool_display` |
| `subTabs` / `persistent` | `true` / `true` |
| Capabilities melisKey | `meliscms_site_robot_tools_section` |
| API 基础路径 | `/melis/react-api/site-robots` |

该砖块是一个 Vite IIFE 打包产物（React 外部化为宿主全局变量）。`SiteRobotPage.tsx` 是容器组件：它解析 `/[section]/site-robot[/:id]`，并在 `DomainList`（无 id）与 `RobotForm`（存在 id）之间切换，同时持有 New/Old `mode`、KPI 卡片、筛选器、列管理器、Export 以及删除确认弹窗。子标签页通过 window 桥接驱动（`window.__melisOpenSubTab` / `__melisUpdateSubTabLabel`）。

## React API

路由位于 `config/react-api.php`；控制器为 `MelisCmsSiteRobot\Controller\MelisReactApiSiteRobotController`。全部位于 `/melis/react-api/site-robots` 下，JSON 契约为 `{ success, data, error }`。该控制器**通过参数化 SQL 直接**与数据表交互（无模块服务——与旧版工具一致）。

| 方法与 URL | 动作 | 用途 |
| --- | --- | --- |
| `GET /site-robots` | `list` | 列出站点域名（keyset：`limit`、`search`、`site`、`sort`、`dir`、`after`）；每一项都携带 `hasRobots` |
| `GET /site-robots/stats` | `stats` | KPI `{ total, withRobots, withoutRobots }` |
| `GET /site-robots/sites` | `sites` | 供筛选器使用的站点选项 |
| `GET /site-robots/:id` | `get` | 单个域名（`sdom_id`）及其 `robotText` |
| `POST /site-robots/save` | `save` | 更新插入（upsert）某个域名的 robots.txt（`{ id, robotText }`） |
| `DELETE /site-robots/delete/:id` | `delete` | 清空某个域名的 robots.txt（域名保留） |

`list` 将 `melis_cms_site_domain` 左连接（LEFT JOIN）到 `melis_cms_site` 和 `melis_cms_domain_robots`（按域名连接，`robot_site_domain = sdom_domain`）。`save` 以域名为键更新插入 robots 行，并将存储的正文上限限制为 **65535 个字符**。路由顺序很重要：`/stats`、`/sites`、`/save`、`/delete/:id` 声明在通配路由 `/:id`（约束为 `[0-9]+`）**之前**。

### 权限能力（Capabilities）

在 `config/react.capabilities.php` 中的权限承载节点 `meliscms_site_robot_tools_section` 下声明：

```php
return [
    'melisReactToolCapabilities' => [
        'meliscms_site_robot_tools_section' => ['list', 'edit', 'delete', 'export'],
    ],
];
```

- **`list`** —— 查看域名列表（同时也管控 `stats` + `sites`）。
- **`edit`** —— 打开（`get`）并保存（`save`）某个域名的 robots.txt。
- **`delete`** —— 清空某个域名的 robots.txt。
- **`export`** —— Export 按钮（UI 层管控，复用列表）。

这里**没有 `create`** 能力——你无法从此工具添加域名。每个控制器动作都受到两重保护：`denyUnlessAccess()`（认证 + `MelisCoreRights::canAccess`），随后是 `denyUnlessCan(cap)`（默认允许；服务端仍是强制执行点）。

## 关键服务

该模块自身未注册任何服务。旧版工具与 React API 共享同一数据模型；引擎网关依然可用：

| 服务别名 | 作用 |
| --- | --- |
| `MelisEngineTableRobot` | `melis_cms_domain_robots` 之上的表网关——按域名读写 `robot_text`。 |
| `MelisEngineTableSiteDomain` | 提供站点域名列表（`sdom_id`、`site_label`、`sdom_domain`）。 |

## 前台

`config/module.config.php` 中的一个公共路由（`melis-cms-site-robot-special-urls`）将 `/robots.txt` 映射到 `ToolSiteRobotController::toolRobotsTxtAction`。该动作按请求主机查询 `melis_cms_domain_robots`，并输出存储的 `robot_text`。在 v6 中保持不变。

| 路由 | 处理器 | 结果 |
| --- | --- | --- |
| `/robots.txt` | `ToolSiteRobotController::toolRobotsTxtAction` | 提供为请求域名存储的 `robot_text`。 |

## 数据库表

| 表 | 存储内容 |
| --- | --- |
| `melis_cms_domain_robots` | 每个域名一条 robots.txt 记录：`robot_id`（主键）、`robot_site_domain`、`robot_text`。 |

## 关键文件

| 关注点 | 路径 |
| --- | --- |
| React API 路由 | `vendor/melisplatform/melis-cms-site-robot/config/react-api.php` |
| React 权限能力 | `vendor/melisplatform/melis-cms-site-robot/config/react.capabilities.php` |
| React 砖块 manifest | `vendor/melisplatform/melis-cms-site-robot/public/ui-react/brick.manifest.json` |
| React API 控制器 | `vendor/melisplatform/melis-cms-site-robot/src/Controller/MelisReactApiSiteRobotController.php` |
| 旧版工具 + `/robots.txt` 路由 | `vendor/melisplatform/melis-cms-site-robot/src/Controller/ToolSiteRobotController.php` |
| 路由（后台 + `/robots.txt`） | `vendor/melisplatform/melis-cms-site-robot/config/module.config.php` |
| 安装 SQL | `vendor/melisplatform/melis-cms-site-robot/install/` |

另请参阅：[模块参考](/zh/reference/modules)、[melis-cms](/zh/reference/modules/melis-cms)、[melis-core](/zh/reference/modules/melis-core)
