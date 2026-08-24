# MelisMarketPlace

> 后台内置的模块商店，用于发现、下载、更新和移除 Melis Platform 模块，
> 现已以原生 React 目录形式提供。软件包 `melisplatform/melis-marketplace`。

## 用途

MelisMarketPlace 是后台模块商店：它列出发布在 Melis Packagist 服务器上的每一个软件包，将各已安装版本与最新发布版本进行比较，并允许管理员下载、更新或移除模块，以及安装完整的站点产品，全程无需离开后台。它调用 `MelisComposerService`（melis-composerdeploy）来完成实际的 Composer 工作，并通过 `MelisAssetManagerModulesService`（melis-asset-manager）读取和切换模块状态。

六个基础模块 —— **MelisCore、MelisEngine、MelisFront、MelisAssetManager、MelisComposerDeploy、MelisDbDeploy** —— 被列为例外（豁免），商店永远不会提供对它们的下载、更新或移除操作。

在 v6 React 后台（`/melis-react`）中，该工具提供一个**原生全 React 砖块（brick）**：目录列表和单个软件包详情均以 React 编写，并读取模块自有的 JSON `react-api`。安装 / 更新 / 移除机制（Composer、dbdeploy、plug/unplug）保持不变，仍通过传统控制器在服务端运行。

## 启用

在 `config/melis.module.load.php` 中添加：

```php
return [
    'MelisMarketPlace',
];
```

需要 `melisplatform/melis-core: ^5.1` 和 PHP `^8.1|^8.3`。该模块注册了一个 `dbdeploy: true` 标志，因此它附带的任何数据库增量都会在首次加载时应用。仅当 `MelisMarketPlace` 存在于 `config/melis.module.load.php` 中时，React 砖块才会出现。

远程 Packagist 端点在 `config/app.interface.php` 中的 `melismarketplace_toolstree_section/datas/melis_packagist_server` 下配置（默认为 `http://marketplace.melisplatform.com/melis-packagist`）。

## React 后台

**位置。** 左侧边栏 → **Market Place**（购物车图标）；作为名为 *Market Place* 的顶部标签页打开。清单中的 `route` 为 `/melis-marketplace`，而 `forwardKey` `MelisMarketPlace/MelisMarketPlace` 将传统菜单节点映射到它。

**目录（列表）。** 一个可搜索的模块卡片网格（封面图、分组徽标、标题、版本标签、下载次数，以及 Installed / Update-available 徽章或一个 Download 按钮）。网格上方是三个 **KPI 卡片**（Packages / Installed / Updates available）、一个搜索框、一个排序选择器（Downloads / Date added / Name）、一个 *Reset filters* 按钮、**分组筛选器**（All groups · Core · Cms · Marketing · Commerce · Sites）、一个 **Bundles** 开关、一个刷新（↻）按钮以及 **New / Old** 开关。网格在滚动时加载更多内容（无限滚动）。右侧边栏显示 "Want your module listed?"（想让您的模块被收录？）和 "Most downloaded packages"（下载量最高的软件包）。

![React Market Place 目录：KPI 卡片、搜索、排序、分组筛选器，以及带有 "Most downloaded packages" 侧边栏的模块卡片网格](/screenshots/react/melis-marketplace/melismarketplace-tool-list.png)

**产品视图（详情）。** 点击某个卡片会打开一个全 React 详情页（无页面重新加载）：一个主横幅（分组徽标、标题、状态徽章、操作按钮）、一个图片画廊（滑块 + 全屏灯箱）、描述，以及一个 *Additional information* 面板（最新版本、已安装时的当前版本、GitHub、Packagist、软件包名称、下载量）。一个 **← back** 按钮返回列表，列表保持挂载状态，因此搜索 / 筛选 / 滚动位置都会被保留。这里**没有宿主子标签页** —— 列表 ⇄ 详情的切换是内部状态，因此一个砖块正好使用一个宿主标签页。

![某模块的 React 产品视图：带有状态徽章和操作按钮的主横幅、图片画廊、描述以及 Additional information 面板](/screenshots/react/melis-marketplace/melismarketplace-tool-module-detail.png)

**New / Old 开关。** 列表可以在 React UI（*New*，默认）与在 iframe 中渲染的经典工具（*Old*，`/melis/react-tool-page?key=melis_market_place_tool_display`）之间切换。在窄视口下，该开关变为纯图标形式。

**操作按钮**取决于软件包状态和调用者的能力：

| 按钮 | 显示时机 | 效果 |
| --- | --- | --- |
| Download | 模块未安装 | Composer 获取 → dbdeploy → 激活 |
| Update | 已安装且 `need_update` | 对落后版本执行相同的 Composer 操作 |
| Remove | 已安装、非豁免 | 卸载（若有其他模块依赖它则被阻止） |
| Private | 私有 / 锁定的软件包 | 联系面板；必须购买 |

每个操作都会打开一个 **Manage** 模态框，其中带有一个实时进度控制台，流式输出 Composer / dbdeploy 的结果，随后提供 *Activate module* / *Reload*。如果 Packagist 服务器不可达（`marketAccessible = false`），React UI 会禁用浏览功能，但保持外壳可用。

## React 砖块

使用 Vite 构建的原生全 React 砖块（IIFE；React / ReactDOM / react-router-dom 外部化到宿主全局变量）。源码位于 `ui-react/src/`，构建到 `public/ui-react/brick.js`，与 `brick.manifest.json` 相邻。

| 清单字段 | 值 |
| --- | --- |
| `id` | `marketplace`（必须与 `brick.tsx` 中注册的 id 匹配） |
| `route` | `/melis-marketplace` |
| `label` | `Market Place` |
| `forwardKey` | `MelisMarketPlace/MelisMarketPlace` |
| `melisKey` | `melis_market_place_tool_display` |
| `entry` | `brick.js` |
| `persistent` | `true` |
| `subTabs` | *缺省* —— 列表 ⇄ 详情是内部 `openId` 状态 |

由于 Market Place 菜单区块是一个可直接点击 / `is_parent_tool` 节点，承载权限的键与清单区域键是**相同的**（`melis_market_place_tool_display`）。砖块无法导入宿主模块，因此它使用内联样式 + 主题 CSS 变量，以及一个由宿主语言（`localStorage` 中的 `melis-ui-lang` / `melis-ui-locale`）驱动的文件内 `{fr,en}` 字典。卡片和画廊首先请求 React 截图，并在 `data-legacy` 中携带传统图片 URL，出错时回退到后者。

关键文件（`ui-react/src/`）：`brick.tsx`（注册 `id: 'marketplace'`）、`MarketPlacePage.tsx`（列表 + 详情 + manage 模态框）、`ViewToggle.tsx`（New/Old 开关）、`marketplace-api.ts`（只读 API 客户端），以及 `shared/useCaps.ts` / `shared/useDebounce.ts` / `shared/useIsNarrow.ts`。

## React API

目录的**只读**路由在 `config/module.config.php` 中声明，嵌套在 `application-MelisMarketPlace` 路由之下（基路径 `/melis/MelisMarketPlace/react-api`）—— 属于**模块自有**，而非位于共享的 `melis-react-api` 节点之下。控制器：`MelisMarketPlace\Controller\MelisMarketPlaceReactApiController`（可调用别名 `MelisMarketPlace\Controller\MelisMarketPlaceReactApi`）。契约为 `{ success, data, error }`；每次 fetch 都发送 `X-Requested-With: XMLHttpRequest` 和 `credentials: 'include'`。

| 方法与 URL | 动作 | 用途 |
| --- | --- | --- |
| `GET …/react-api/packages` | `packages` | 列表（`page`、`limit`、`search`、`group`、`orderBy`、`order`、`bundle`）→ `{items, page, pageCount, limit, marketAccessible}` |
| `GET …/react-api/packages/:id` | `get` | 单个软件包详情（`images`、`currentVersion`、`isExempted`、versionStatus…） |
| `GET …/react-api/groups` | `groups` | 软件包分组 → `{groups, marketAccessible}` |
| `GET …/react-api/stats` | `stats` | KPI `{total, installed, needUpdate, marketAccessible}` |
| `GET …/react-api/status` | `status` | 各模块版本状态（`need_update` / `up_to_date` / `in_advance`） |

每个读取动作都由 `denyUnlessAccess()` 保护 —— 需要认证（`MelisCoreAuth::hasIdentity`）**并且** `MelisCoreRights::canAccess('melis_market_place_tool_display')`，否则返回 **401 / 403** —— 因此该 JSON API 不是后门。控制器复用 `MelisMarketPlaceService`（`compareLocalVersionFromRepo`、最新版本预取）和 `MelisAssetManagerModulesService`（已安装版本 / 模块列表），并读取 Packagist JSON 端点，与传统工具完全一致。

> **变更类操作没有 react-api 路由。** 下载 / 更新 / 移除由 `ManageModal` 原生执行，它通过直接调用模块的**传统**控制器（`/melis/MelisMarketPlace/MelisMarketPlace/…`）来复现传统 JS 编排：`melisMarketPlaceProductDo`（流式控制台）、`reDumpAutoload`、`execDbDeploy`、`plugModule` / `unplugModule`、`executeComposerScripts`、`getSetupModuleForm`、`activateModule`、`isPackageDirectoryRemovable`、`changePackageDirectoryPermission`、`getModuleTables`、`exportTables`，以及用于移除依赖检查的 `/melis/MelisCore/Modules/getDependents`。

## 能力（Capabilities）

在 `config/react.capabilities.php` 中声明，由 `MelisMarketPlace\Module::getConfig()` 合并到 `melisReactToolCapabilities` 下。以清单和访问守卫所用的同一 melisKey（`melis_market_place_tool_display`）为键，因为该区块可直接点击：

```
melis_market_place_tool_display
└─ actions: list · download · remove
```

`list` = 浏览网格；`download` = 用于安装（Download）和更新（Update）两者的 Composer 获取；`remove` = 卸载。这些是**仅限 React 的门控**（默认允许、声明式）：控制器仅强制执行**访问**控制（`denyUnlessAccess`），不调用 `denyUnlessCan`。在 React 中，砖块通过 `useCaps('melis_market_place_tool_display')` 读取它们 —— `can('list')` 门控网格，`can('download')` 门控 Download / Update 按钮，`can('remove')` 门控 Remove 按钮（对豁免模块同样隐藏）。

## 关键服务

| 服务别名 | 职责 |
| --- | --- |
| `MelisMarketPlaceService` | 版本比较、plug/unplug，以及各模块的安装后表单分发。 |
| `MelisMarketPlaceSiteService` | 从 `melisplatform-site` 软件包搭建完整网站。 |

### `MelisMarketPlaceService`

继承自 `MelisGeneralService`。

```php
$mp = $serviceManager->get('MelisMarketPlaceService');

// Compare installed vs latest — returns one of the constants below.
$status = $mp->compareLocalVersionFromRepo('MelisCmsSlider', 'v5.1.3');
// MelisMarketPlaceService::NEED_UPDATE  (-1)
// MelisMarketPlaceService::UP_TO_DATE   (1)
// MelisMarketPlaceService::IN_ADVANCE   (2)  — running a dev-… build

// Toggle a module on/off (rewrites the active-module loader via asset-manager).
$mp->plugModule('MelisCmsSlider');
$mp->unplugModule('MelisCmsSlider');
```

`compareLocalVersionFromRepo()` 会触发事件对 `melismarketplace_compare_local_version_from_repo_start` / `…_end`，以便监听器覆盖计算出的状态。

**各模块的安装后约定。** 一个模块可以在其自己的 `Controller\` 命名空间中提供一个 `MelisSetupPostDownloadController` 和/或 `MelisSetupPostUpdateController`，暴露 `$showOnMarketplacePostSetup = true` 以及动作 `getFormAction`、`validateFormAction`、`submitAction`。MarketPlace 会转发到它们，以渲染和处理安装表单。

### `MelisMarketPlaceSiteService`

继承自 `MelisGeneralService`。从一个 `melisplatform-site` 软件包搭建整个网站：创建 `melis_cms_site` / 首页 / 语言行，分配全新的 page-id、platform-id 和 template-id 范围，并通过 `Support\MelisMarketPlaceCmsTables` / `Support\MelisMarketPlaceSiteInstall` 创建模块的 CMS 表。

```php
$site = $serviceManager->get('MelisMarketPlaceSiteService');
$site->marketplaceInstallSite($request);   // reads POST: name, scheme, domain, module, action
```

类型化异常（位于 `src/Exception/`）：`EmptySiteException`、`PlatformIdMaxRangeReachedException`、`TemplateIdMaxRangeReachedException`、`ArrayKeyNotFoundException`、`FileNotFoundException`。

## 传统工具（Old 视图）

经典工具仍可通过 New/Old 开关使用，并且仍然掌管变更流程。`melisMarketPlaceProductDoAction()` 是目录操作的唯一端点：它触发 `melis_marketplace_product_do_start`，根据动作进行分支（`MelisComposerService::DOWNLOAD / UPDATE / REMOVE`），然后触发 `melis_marketplace_product_do_finish` 以驱动 flash-messenger 反馈。在移除之前，它会遍历目标模块的依赖、所有其他活动模块的依赖，以及项目根 `composer.json` 的 `require` 块，以防止移除一个共享依赖。

有两项检查控制着商店的可用性（均在 `MelisMarketPlaceController` 中）：

- `isMarketplaceAccessible()` —— Packagist 服务器是否可达且功能是否已开启。
- `allowUpdate()` —— 读取当前平台（`MELIS_PLATFORM` 环境变量）的 `melis_core_platform.plf_update_marketplace`；`plf_update_marketplace = 0` 的平台可以浏览，但不能下载或更新。

`MelisSetupController` 处理独立的 `/MelisMarketPlace/setup` 路由（后台界面树之外的各模块安装）。

## 事件

| 事件 | 触发者 | 用途 |
| --- | --- | --- |
| `melismarketplace_compare_local_version_from_repo_start` / `_end` | `compareLocalVersionFromRepo` | 挂钩或覆盖计算出的版本状态结果。 |
| `melis_marketplace_product_do_start` | `melisMarketPlaceProductDo` | 在下载、更新或移除操作之前。 |
| `melis_marketplace_product_do_finish` | `melisMarketPlaceProductDo` | 在操作之后 —— 驱动 flash-messenger 反馈。 |

## 数据库表

MelisMarketPlace 自身不定义任何表。当一个下载的模块附带数据库增量时，它们通过 `execDbDeployAction()`（melis-dbdeploy）应用。站点产品的安装会写入平台现有的 CMS 表（通过 `MelisMarketPlaceSiteService` 分配）。

## 关键文件

| 关注点 | 路径 |
| --- | --- |
| 模块清单 | `vendor/melisplatform/melis-marketplace/composer.json` |
| 路由 / 服务 / react-api / 控制器 | `vendor/melisplatform/melis-marketplace/config/module.config.php` |
| React 能力 | `vendor/melisplatform/melis-marketplace/config/react.capabilities.php` |
| 工具树、头部图标、Packagist 配置 | `vendor/melisplatform/melis-marketplace/config/app.interface.php` |
| React API 控制器 | `vendor/melisplatform/melis-marketplace/src/Controller/MelisMarketPlaceReactApiController.php` |
| 主（传统）控制器 | `vendor/melisplatform/melis-marketplace/src/Controller/MelisMarketPlaceController.php` |
| 安装/更新/plug 服务 | `vendor/melisplatform/melis-marketplace/src/Service/MelisMarketPlaceService.php` |
| 站点安装服务 | `vendor/melisplatform/melis-marketplace/src/Service/MelisMarketPlaceSiteService.php` |
| React 砖块源码 | `vendor/melisplatform/melis-marketplace/ui-react/src/` |
| 构建后的砖块 + 清单 | `vendor/melisplatform/melis-marketplace/public/ui-react/` |
| 异常 | `vendor/melisplatform/melis-marketplace/src/Exception/` |

另请参阅：[melis-composerdeploy](/zh/reference/modules/melis-composerdeploy) ·
[melis-asset-manager](/zh/reference/modules/melis-asset-manager) ·
[melis-dbdeploy](/zh/reference/modules/melis-dbdeploy) ·
[melis-core](/zh/reference/modules/melis-core)
