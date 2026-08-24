# MelisReactApi

> React 后台（`/melis-react`）的 JSON API 主干：引导 shell、提供菜单/用户/资源/发现/仪表盘数据，并托管能力解析器。软件包 `melisplatform/melis-react-api`。

## 用途

MelisReactApi 是**基础设施，而非工具**。它不绘制任何 UI、不提供任何 brick，也不添加任何侧边栏入口。它暴露通用的 `/melis/react-api/…` JSON 端点，供 React shell（由 MelisReactOverride 在 `/melis-react` 处提供）在引导时和导航时调用；同时它还托管**能力解析器**（`Capabilities` + `CapabilityGuardTrait`），供各模块的工具控制器复用以管控其"高级权限"。

shell 中显示的一切非特定工具自有界面的内容都来自这里：左侧菜单（按权限过滤）、页头的用户/头像与语言切换器、仪表盘磁贴与 KPI、模块化 brick 发现，以及用户 → 权限的高级权限矩阵。各个工具自有的端点、路由和能力声明位于**它们各自的**模块中（例如 `/users`、`/roles` 在 MelisCore / MelisSmallBusiness 中声明），而非在此处。

本模块**没有 React 界面，也没有截图**——下文各节描述与 React 后台交互时应使用的 API 契约。

## 启用

MelisReactApi 是 React 后台的核心模块。它**不**通过 composer 安装到 Docker vendor 卷中；它通过 `config/application.config.php` 的 `module_paths`（分支 `melis-react`）加载，`src/Module.php` 则通过 `StandardAutoloader` 自动加载其类。它与 **MelisReactOverride**（iframe/工具机制 + SPA shell 路由）以及 **melis-core/ui-react**（消费此 API 的 React 应用——参见其 `src/lib/*-api.ts` 客户端）配套使用。

它直接在 `config/module.config.php` 中声明路由（没有 `config/react-api.php`），且不声明任何自有能力（它是*读取*其他模块声明的引擎）。

## React 存在概览

| 属性 | 值 |
| --- | --- |
| Brick / manifest | **无**——不提供 `public/ui-react/brick.manifest.json` |
| `ui-react/` 源码 | **无**——没有 Vite 项目，没有 React 组件 |
| 控制器 | `MelisReactApi\Controller\MelisReactApiController`（可调用别名 `MelisReactApi\Controller\MelisReactApi`） |
| 基础路由 | `melis-backoffice` → `react-api`（即 `/melis/react-api/…`） |
| 认证 | 每个 action 都执行 `isAuthenticated()`（MelisCoreAuth），**唯有** `/langs` 除外（公开，登录界面上加载） |
| 响应契约 | `{ success: bool, data: T, error?: string }`（原始 JSON，无布局） |

每个 action 都通过继承的 `jsonResponse()` 返回原始 JSON `Response`，因此 Laminas 绝不会在其外面包裹布局。只读 action 会尽早调用 `releaseSessionLock()`，以便共享会话 cookie 的并发引导请求不会被串行化。

## 通用端点

全部位于 `/melis/react-api/…` 之下。共十二个通用端点，全部映射到 `MelisReactApiController`。每个响应都是 `{ success, data, error? }`（当 `isAuthenticated()` 守卫失败时返回 401，`/langs` 除外）。

| 方法 + 路径 | Action | `data` 结构 |
| --- | --- | --- |
| `GET /me` | `meAction` | `{ id, name, login, email, picture, isAdmin, capabilities }`——`capabilities` = 映射 `melisKey → string[]`，表示允许的能力（管理员 ⇒ 全部）。 |
| `GET /menu` | `menuAction` | `NavNode[]`——按权限过滤的导航树。`?full=1` 返回**未过滤**的树（仅供权限编辑器使用；需要 `canAccess('meliscore_tool_user')`）。 |
| `GET /langs` | `langsAction` | `{ current: { id, locale }, langs: [{ id, locale, short, label }] }`——**公开**。 |
| `GET /assets` | `assetsAction` | 用于引导工具 iframe 的 CSS/JS URL + 内联 JS 全局变量（委托给 `MelisReactOverride\Service\PlatformAssetsService::build()`）。 |
| `GET /react-modules` | `reactModulesAction` | `{ data: BrickDef[], bundle: { url } }`——已激活模块的 brick；`bundle.url` = 拼接后的 JS。 |
| `GET /bricks-bundle.js` | `bricksBundleAction` | **非 JSON**——每个已激活 brick 的 IIFE 拼接为一个不可变缓存的 JavaScript 响应。 |
| `GET /dashboard/bubbles` | `dashboardBubblesAction` | `{ news, updates, notifications:{count,items}, messages }` 计数（降级为 0，绝不返回 404）。 |
| `GET /dashboard/stats` | `dashboardStatsAction` | `{ kpis:{ users, sites, pages, languages }, activity:[{ id, name, loginDate }] }`。 |
| `GET /dashboard/legacy-plugins` | `legacyDashboardPluginsAction` | `[{ pluginName, title, icon, section, w, h }]`——作为 iframe 小部件的旧版仪表盘插件。 |
| `GET \| POST /dashboard/layout` | `dashboardLayoutAction` | GET → 已保存的磁贴 `[{ pluginName, pluginId, x, y, w, h }]`；POST → 相同 JSON，保存到 `melis_core_dashboards`。 |
| `GET /rights/dashboard-plugins` | `rightsDashboardPluginsAction` | `[{ key, title, module }]`——供权限编辑器使用的权威仪表盘插件列表（`?userId=`）。 |
| `GET /rights/capabilities` | `rightsCapabilitiesAction` | 映射 `melisKey → 由模块声明的能力树`，`tr_*` 标签已翻译为会话区域设置。 |

**引导集：** `/me`、`/menu`、`/langs`、`/assets`、`/react-modules`（外加 `/bricks-bundle.js`）。`/dashboard/*` 和 `/rights/*` 端点支撑仪表盘以及用户 → 权限编辑器。

工具自有的数据端点**不**在此处：`/melis/react-api/users…`、`/users/stats`、`/roles` 在 **MelisCore** 中声明；`/roles-list`、`/roles/save|stats|:id`、`/workflow/roles` 在 **MelisSmallBusiness** 中声明；AI 路由在 **MelisAI** 中声明。调用此通用集的客户端位于 `melis-core/ui-react/src/lib/melis-api.ts`。

真实的 fetch 示例——shell 的 `/me` 引导调用：

```ts
// mirrors melis-core/ui-react/src/lib/melis-api.ts
const res = await fetch('/melis/react-api/me', {
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
  credentials: 'include',
})
const json = await res.json()                    // { success, data, error? }
if (!json.success) throw new Error(json.error)   // 401 → { success:false, error:'Unauthenticated' }
const { name, isAdmin, capabilities } = json.data
// capabilities: Record<melisKey, string[]>
// e.g. { melis_core_announcement_tool: ['list','create','edit'] }
```

## Capabilities——解析器

这是 MelisReactApi 提供给*其他*模块的核心内容："高级权限"系统，用于管控某个**已授权工具**的**内部组件**（list / create / edit / delete / 嵌套标签页），它*从属于*工具访问检查（`MelisCoreRights::canAccess`，保持不变）。

**声明（在各模块中，而非此处）。** 模块按工具 `melisKey` 声明其存在的能力，通过合并的配置键 `melisReactToolCapabilities`（`config/react.capabilities.php`，在其 `Module::getConfig()` 中合并）：

```php
// <module>/config/react.capabilities.php  (declared BY the tool's module)
return [
  'melisReactToolCapabilities' => [
    'melis_core_announcement_tool' => ['list', 'create', 'edit', 'delete'],
    // or a TREE for nested tabs with their own actions:
    // 'some_tool' => ['actions' => ['list'], 'tabs' => [['key' => 'variants', 'actions' => ['list','create']]]],
  ],
];
```

**解析器——`MelisReactApi\Service\Capabilities`**（全部为静态方法；`const CONFIG_KEY = 'melisReactToolCapabilities'`，`const SECTION = 'meliscore_tool_capabilities'`）：

| 方法 | 作用 |
| --- | --- |
| `declared($appConfig)` | 原始的已声明映射（供权限编辑器渲染）。 |
| `flatten($node)` | 将扁平列表或 `{ actions, tabs }` 树扁平化为点号分隔的字符串（例如 `variants.list`）。 |
| `deniedFor($rightsXml, $toolKey)` | 从用户/角色权限 XML 中读取的拒绝列表。 |
| `isAllowed($appConfig, $rightsXml, $toolKey, $cap)` | **默认允许**——除非该能力既被声明*又*在拒绝列表中，否则允许。 |
| `allowedForUser($appConfig, $rightsXml)` | `/me` 中返回的 `melisKey → allowedCaps[]` 映射（`$rightsXml = null`，例如管理员 ⇒ 全部）。 |

**存储。** 拒绝项存放在用户/角色权限 XML 的专用区块中，与旧版拒绝列表分开，从而让经典 BO 忽略它：

```xml
<meliscore_tool_capabilities>
  <tool key="melis_core_announcement_tool"><deny>delete</deny></tool>
</meliscore_tool_capabilities>
```

在**旧版**保存时保留此区块的工作由相关模块完成（USER 由 MelisCore 负责，ROLE 由 MelisSmallBusiness 负责）。

**守卫——`MelisReactApi\Controller\CapabilityGuardTrait`。** 各模块的工具控制器 `use` 此 trait，定义 `const MELIS_KEY = '<该工具的 melisKey>'`，并在其工具访问检查**之后**调用 `denyUnlessCan($cap)`：

```php
use MelisReactApi\Controller\CapabilityGuardTrait;

class MelisReactApiFooController extends MelisAbstractActionController
{
    use CapabilityGuardTrait;
    const MELIS_KEY = 'melis_core_announcement_tool'; // the rights-bearing tool node

    public function saveAction()
    {
        if ($resp = $this->denyUnlessCan('edit')) return $resp;   // 403 JSON if denied
        // …call the module's Laminas service…
    }
}
```

`denyUnlessCan` 读取**有效**权限（`MelisCoreAuth::getAuthRights()` → 用户或角色），**管理员绕过**，且它是**默认允许**——没有任何声明的工具将保留完整的 CRUD。在客户端，同样的允许映射会随 `/me` 的 `data.capabilities` 到达并管控 UI（`melis-core/ui-react/src/lib/caps.ts`）。

## 宿主集成

- **发现 / bricks**——`GET /react-modules` 扫描**已激活**模块中的 `public/ui-react/brick.manifest.json`（单个对象或 `bricks: [...]` 数组），并返回 `BrickDef = { id, module, route, label, forwardKey, melisKey, subTabs, persistent, bundleUrl }`，外加 `bundle.url = /melis/react-api/bricks-bundle.js?v=<sig>`。shell 加载这个拼接后的单一 bundle（每个 brick 都是一个 IIFE，通过 `window.__melisRegisterBrick` 按 id 在 `window.__MELIS_BRICK_COMPONENTS__` 上自我注册，并包裹在 try/catch 中）。`?v=` 签名（每个 bundle 的名称+mtime+大小）使得 1 年的不可变缓存是安全的。一个 brick 存在**当且仅当**其模块已激活——即模块化规则。
- **菜单构建器（`GET /menu`）**——遍历 leftmenu 接口，应用区块/工具排序，并输出 `NavNode[]`，其中每个节点为 `{ key, name, icon, melisKey, isTool, forward, hasNavChild, configChildCount, children }`。顶层**区块（section）**是一个容器（仅在为空时被剪除）；可点击的 `is_parent_tool` 区块受 `canAccess(target)` 管控；未知的新安装区块使用宽松权限，以便保持可见。两个钩子对其进行扩展：`melisReactSidebarHostSections`（将空区块保留为携带 `sidebarModule` 的裸侧边栏宿主容器）和 `melisReactRightsTools`（注入仅权限用的合成工具节点，仅 `?full=1` 时）。
- **认证 / 资源桥接**——`/assets` 返回与旧版 `layoutCore.phtml` 加载的相同 CSS/JS（委托给 `MelisReactOverride\Service\PlatformAssetsService`），从而使工具 iframe 在 React shell 内以相同方式引导。
- **i18n**——`tr_*` 标签（菜单区块名称、能力标签页标签）通过 `MelisCoreTranslation` 翻译为当前会话区域设置（`meliscore` 容器 `melis-lang-locale`）；模块声明的是**键**，而绝非硬编码文本。

## 关键文件

| 关注点 | 路径 |
| --- | --- |
| 模块 manifest / 自动加载器 | `melis-react-api/src/Module.php` |
| 路由 + 可调用控制器 | `melis-react-api/config/module.config.php` |
| 通用 action（12 个） | `melis-react-api/src/Controller/MelisReactApiController.php` |
| 能力守卫 trait | `melis-react-api/src/Controller/CapabilityGuardTrait.php` |
| 能力解析器 | `melis-react-api/src/Service/Capabilities.php` |

另见：[melis-core](/zh/reference/modules/melis-core) ·
[melis-small-business](/zh/reference/modules/melis-small-business) ·
[melis-ai](/zh/reference/modules/melis-ai)
