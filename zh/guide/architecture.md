# 架构深入剖析

本页从**端到端**追踪一次请求，并指明其中涉及的真实类、事件与服务。它是 [核心概念](./concepts) 的补充：请先阅读那一页以掌握术语，再阅读本页以理解其*运行机制*。如果你（或某个 AI 助手）需要建立一套关于 Melis 如何运作的完整心智模型，这也是要读的一页。

Melis **v6** 保留了与 v5 相同的框架、模块与请求生命周期——变化的是**后台管理界面**。位于 `/melis` 的经典服务端渲染工具依然存在，但如今默认的体验是一个位于 **`/melis-react` 的 React 单页应用**，它加载原生 React 工具（"bricks"），并在必要时回退到 iframe 中的经典工具。下文各节保留了所有未变的机制，并在恰当之处补充了 React 外壳（shell）。

## 引导启动（Bootstrap）

`public/index.php` 加载 Composer 的自动加载器，将 `config/application.config.php` 与 `config/development.config.php`（若存在）合并，然后运行 Laminas MVC 应用。

`config/application.config.php` 动态构建模块列表：

```php
'modules' => array_merge(
    MelisCore\MelisModuleManager::getModuleComponents(), // framework components first
    MelisCore\MelisModuleManager::getModules()           // then Melis modules
),
'module_listener_options' => [
    'module_paths'      => ['./module', './module/MelisSites'],
    'config_glob_paths' => [
        realpath(__DIR__) . '/autoload/{{,*.}global,{,*.}local}.php',
        realpath(__DIR__) . '/autoload/platforms/' . getenv('MELIS_PLATFORM') . '.php',
    ],
],
```

`MelisCore\MelisModuleManager`（`vendor/melisplatform/melis-core/src/MelisModuleManager.php`）会根据请求组装三类模块：

- **组件（Components）**——框架依赖，在每个模块的 `config/module.load.php` 中声明。
- **模块（Modules）**——来自 `config/melis.module.load.php` 的后台模块。
- **站点模块（Site modules）**——针对前台 URL，由 `MELIS_MODULE` 选定的站点（来自 `module/MelisSites/<name>` 或某个 vendor 站点，如 `MelisDemoCms`）。

React 后台在此列表中额外加入了两个**基础设施模块**——[`melis-react-api`](/zh/reference/modules/melis-react-api)（JSON API 主干）和 [`melis-react-override`](/zh/reference/modules/melis-react-override)（SPA 路由 + 遗留工具的 iframe 机制）。二者都通过 `application.config.php` 的 `module_paths` 加载（它们并非由 composer 自动加载），并通过 `StandardAutoloader` 自行注册。

最后，平台文件 `config/autoload/platforms/<MELIS_PLATFORM>.php` 会将**数据库连接**与平台设置注入到合并后的配置中。

## 后台请求生命周期

现在有**两条入口**通往后台，二者都由 MelisCore 的路由与身份检查驱动：

- **`/melis-react…`**——React 外壳（默认 UI）。一条正则路由返回单个 HTML 文档；其余一切都是通过 `/melis/react-api/…` 获取的 JSON，工具以 brick 或 iframe 形式渲染（见下文）。
- **`/melis…`**——经典的服务端渲染后台，仍然完全可用，并作为遗留工具的 iframe 目标。

对于 **`/melis…`** URL，MelisCore 驱动经典流程。关键的钩子在 `MelisCore\Module::onBootstrap()` 中挂载：

1. **路由（Routing）**——匹配 `melis-backoffice` 路由（及其子路由：`login`、`authenticate`、`logout`、`zoneview`、`react-tool-page`……）。
2. **`MvcEvent::EVENT_ROUTE` → 身份检查**——运行 `Module::checkIdentity()`。如果匹配到的路由不在排除列表中（`login`、`authenticate`、`change-language`、React SPA 及其引导端点……），且用户未通过认证，则**重定向到 `/melis/login`**（对于非 GET 请求则返回 404）。
3. **会话与语言（Session & language）**——初始化会话容器 `meliscore`；语言区域设置（`melis-lang-locale`）驱动 `Module::createTranslations()`，后者加载 `language/<locale>.{interface,forms,…}.php`。
4. **`EVENT_DISPATCH`**——布局被设为 `layout/layoutCore`，核心监听器随之运行：`MelisCoreCheckUserRightsListener`（定期重新读取权限）、`MelisCoreFlashMessengerListener`、`MelisCorePhpWarningListener` 等。
5. **区域渲染（Zone rendering）**——后台 UI 是一棵**区域（zones）**树；`PluginViewController` 解析每个区域的 `forward`（模块/控制器/动作）并渲染它，最终组装出完整的 HTML（见 [核心概念 → 区域与 forward](./concepts#_3-zones-forwards-how-the-backoffice-renders)）。

```
GET /melis
  → route: melis-backoffice
  → EVENT_ROUTE: checkIdentity() → redirect to /melis/login if not logged in
  → EVENT_DISPATCH: layout = layout/layoutCore; rights/flash/warning listeners
  → PluginViewController renders zones (header, left menu, center, footer) via forwards
  → response
```

## React 后台生命周期

对于 **`/melis-react…`** URL，流程被拆分为一次性的外壳加载与后续的 JSON 调用：

1. **SPA 路由**——`MelisReactOverride\Controller\SpaController` 为 `/melis-react` 及其下的每一个深层链接（`/melis-react/news/5`……）返回 React 外壳 `index.html`（构建于 `melis-core/public/ui-react/`）。该路由是**公开的**——React 应用运行其**自己的登录界面**——并通过一条高优先级的正则路由胜过 MelisFront 的兜底（catch-all）路由。
2. **引导获取（Boot fetches）**——外壳调用通用的 [`melis-react-api`](/zh/reference/modules/melis-react-api) 端点：`GET /me`（当前用户 + 能力）、`GET /menu`（经权限过滤的导航树）、`GET /langs`（后台语言）、`GET /assets`（工具 iframe 的 CSS/JS），以及 `GET /react-modules` + `/bricks-bundle.js`（brick 发现）。每个响应都遵循 `{ success, data, error? }` 契约。
3. **工具渲染（Tool rendering）**——点击某个菜单项时，如果其模块自带 brick，则打开一个 **brick**（原生 React 工具）；否则，通过 `/melis/react-tool-page?key=<melisKey>` 打开 **iframe 中的遗留工具**（见 [Bricks 与 iframe 机制](#bricks-the-iframe-mechanism)）。
4. **AI 助手浮层（AI Assistant overlay）**——在外壳根部渲染一次的悬浮聊天按钮（来自 [`melis-ai`](/zh/reference/modules/melis-ai)）在页面导航中持续存在，并能从对话中驱动后台（打开工具、打开页面）。参见 [AI 指南](./ai)。

```
GET /melis-react
  → SpaController serves ui-react/index.html (public route)
  → shell boot: GET /me, /menu, /langs, /assets, /react-modules (+ /bricks-bundle.js)
  → click a tool → React brick, or iframe → /melis/react-tool-page?key=<melisKey>
  → AI Assistant overlay mounted at the shell root
```

## Bricks 与 iframe 机制

React 外壳是**模块化的**：一个工具**当且仅当**其模块处于激活状态时才会出现。

- **Brick 发现**——`GET /melis/react-api/react-modules` 扫描处于激活状态的模块，查找 `public/ui-react/brick.manifest.json`，返回它们的 `BrickDef`（`{ id, module, route, label, forwardKey, melisKey, subTabs, … }`），外加一个拼接好的单一 `/bricks-bundle.js`。每个 brick 都是一个在 `window.__MELIS_BRICK_COMPONENTS__` 上自行注册的 IIFE；`?v=<sig>` 签名使该 bundle 可安全缓存一年。
- **新/旧切换（New / Old toggle）**——大多数 brick 都带有一个 **New（React）/ Old（iframe）** 切换开关。*New* 是原生 React 界面；*Old* 通过下文的 iframe 机制加载经典工具，因此在迁移过程中不会丢失任何东西。
- **遗留 iframe**——[`melis-react-override`](/zh/reference/modules/melis-react-override) 的 `PluginViewController::toolPageAction()` 将恰好一个区域（由 `?key=<melisKey>` 解析而来）渲染为一个**独立的 HTML 页面**，并以 `X-Frame-Options: SAMEORIGIN` 交回。它强制设置 `X-Requested-With: XMLHttpRequest`，使 `follow_regular_rendering:false` 的区域以 AJAX 方式渲染；在整个渲染过程中固定 PHP 会话 id；注入工具自身模块的 JS/CSS `ressources`（核心 `bundle.js` 只携带 MelisCore 的工具）；并绕过一长串遗留怪癖，从而让 frame 内的工具在外观和行为上与直接访问 `/melis` 完全一致（它自己的 DataTables、模态框、gritter 提示条以及逐字段校验）。

外壳通过 `MelisReactOverride\Service\PlatformAssetsService::build()` 向这些 iframe 提供平台资源——与经典的 `layoutCore.phtml` 所加载的 CSS/JS 相同——因此一个遗留工具在 React 外壳内部的引导过程完全相同。

## 认证与权限

**登录**由 `MelisCoreAuth`（`MelisCoreAuthService`）处理，它是一个基于 `melis_core_user` 表（`usr_login` / `usr_password`，通过 `password_hash` 使用 bcrypt）之上的 Laminas 认证服务。已认证的身份——包括用户的 `usr_rights`——存储在会话中。React 外壳驱动**同一套**认证（它渲染自己的登录界面，但提交到同一个服务）；`GET /me` 在认证成功后返回身份，而 `GET /langs` 与登录面板品牌信息的读取是登录前仅有的公开端点。

**权限**是后台的门禁。`MelisCoreRights`（`MelisCoreRightsService`）读取用户的 `usr_rights`——一份 **XML 白名单**——以决定哪些内容可见、可分发：

- 用户看到的**左侧菜单分区**是其权限中列出的 `*_toolstree_section` 节点（`isAccessible()`）；**空的权限 XML 意味着完全访问权**。在 React 外壳中，同样的过滤发生在服务端的 `GET /menu` 中，它只输出用户 `canAccess` 的节点。
- 对于用户缺乏权限的工具，会得到 *"You don't have access to this tool"*（你无权访问此工具）。
- 权限存储在 `melis_core_user.usr_rights` 上；对于基于角色的用户，权限可以来自角色（`melis_core_user_role`）。`MelisCoreCheckUserRightsListener` 会定期刷新它们，并在 `usr_status` 变为非激活时将用户登出。

**高级权限（能力，capabilities）。** React 后台在工具访问检查*之下*增加了一层更细粒度的机制：逐工具的**能力**（`list` / `create` / `edit` / `delete`，或嵌套标签页）。模块通过 `config/react.capabilities.php` 声明存在哪些能力；解析器 `MelisReactApi\Service\Capabilities` 采用**默认允许**策略——只有当某个能力既被声明、又出现在权限 XML 的专用 `<meliscore_tool_capabilities>` 分区中时，它才会被拒绝。工具控制器通过 `CapabilityGuardTrait::denyUnlessCan($cap)` 为其动作设门禁（管理员绕过），同一份允许映射也会随 `GET /me` 到达客户端以隐藏 UI。这部分位于 [`melis-react-api`](/zh/reference/modules/melis-react-api) 中；拒绝列表在 **Users → Rights**（用户 → 权限）中编辑。

::: tip 为新工具授权
添加工具后，在 React 后台的 **Users → Rights**（用户 → 权限）中授予访问权（其高级权限矩阵由 `GET /rights/capabilities` 提供数据），或通过迁移将相应分区注入权限 XML——参见 `flyway/sql/V3__add_melisai_rights.sql`。
:::

## 前台请求生命周期

对于公开 URL，**MelisFront** + **MelisEngine** 渲染一个 CMS 页面（在 v6 中保持不变）：

1. **路由（Routing）**——`melis-front` 匹配 `…/id/{idpage}`。SEO URL（`/about-us`）由 `MelisFrontSEORouteListener` 解析为页面 id（它查询 page-SEO 表，并在模块加载时注册一条动态路由）。
2. **分发（Dispatch）**——前台监听器选择前台布局并查询页面缓存。
3. **页面加载（Page load）**——`MelisEngine\Service\MelisPageService::getDatasPage($idPage, $type)` 返回一个 `MelisPage`（页面树数据 + 模板），缓存在 `getDatasPage_{id}_{type}` 之下。
4. **模板渲染（Template render）**——模板的 `ZF2` 控制器/动作渲染站点模块的 `.phtml`；`MelisTag` 区域与 `MelisDragDropZone` 插件由**已发布**的内容填充。

```
GET /about-us
  → MelisFrontSEORouteListener maps /about-us → idpage=5
  → MelisFront\Controller\Index::index(idpage=5)
  → MelisPageService::getDatasPage(5, 'published')  (cached)
  → template ZF2 controller/action → site .phtml → MelisTag / MelisDragDropZone
  → response
```

> 高优先级的 `/melis-react` 正则路由被有意设计为胜过这条兜底路由，从而使 React 深层链接上的整页刷新解析到 SPA，而不是一个"404 page not found"（找不到页面）。

## 缓存

Melis 通过 `cache/` 下的文件系统缓存进行积极缓存：

| 缓存 | 存储内容 |
| --- | --- |
| `meliscore_platform_cache-*` | 已渲染的后台区域 / 平台配置 |
| `meliscms_page-*`、`melisfront_pages_file_cache-*` | 已渲染的 CMS 页面 |
| `cache/config/` | 合并后的 Laminas 配置（仅当 `config_cache_enabled` 时） |
| `datasource-*`、`melistoolcreator-*` | 模块专属缓存 |

`MelisCoreCacheSystemService` 是缓存 API（`getCacheByKey`/`setCacheByKey`/`deleteCacheByPrefix`）。缓存会在关键事件（模块变更、页面发布、权限更新）时失效，也可以通过删除相应的 `cache/*` 文件夹手动清除——见 [故障排查](./troubleshooting)。React 层增加了自己的轻量缓存：发现（discovery）bundle 以内容签名作为不可变资源提供，而 `PlatformAssetsService` 会对拼接后的模块 CSS/JS 进行记忆化缓存（若 Modules 工具清空了 `etc/bundles/`，则重新生成）。

## 事件

Melis 高度**事件驱动**。模块在 `Module::onBootstrap()` 中（以及通过共享事件管理器）将监听器挂载到 MVC 生命周期（`EVENT_ROUTE`、`EVENT_DISPATCH`、`EVENT_RENDER`、`EVENT_FINISH`）以及 **Melis 领域事件**（例如 `melis_core_auth_login_ok`、页面保存事件）上。领域服务继承 `MelisGeneralService`，它增加了 `sendEvent()`，使任何服务都能发布其他模块所订阅的事件。这是首要的、解耦的扩展机制——优先使用监听器，而不是去修补另一个模块。

React 层遵循同样的"累加、不覆盖"哲学：`melis-react-override` 并没有把逐工具的怪癖硬编码进去，而是暴露了一个 `toolpage_extensions` 钩子，任何模块都可以实现它来调整 frame 内遗留工具的 HTML 或资源（例如 [`melis-ai-community-extensions`](/zh/reference/modules/melis-ai-community-extensions) 就用到了它）。

## 一图看懂整个请求

```
public/index.php
  → application.config.php  (MelisModuleManager assembles modules + platform DB config)
  → Laminas MVC run
     ├── /melis-react → SpaController serves the React shell (public)
     │                    → boot JSON: /me /menu /langs /assets /react-modules
     │                    → brick, or iframe → /melis/react-tool-page?key=<melisKey>
     ├── /melis…      → auth (checkIdentity) → rights → PluginViewController zones (forwards)
     └── public URL   → MelisFront route (id/SEO) → MelisEngine page load → site template
  → caching at every expensive step (MelisCoreCacheSystemService)
  → response
```

## 关键文件

| 关注点 | 路径 |
| --- | --- |
| 应用配置 / 引导 | `config/application.config.php` |
| 模块组装 | `vendor/melisplatform/melis-core/src/MelisModuleManager.php` |
| 核心引导 / 监听器 | `vendor/melisplatform/melis-core/src/Module.php` |
| 认证 | `vendor/melisplatform/melis-core/src/Service/MelisCoreAuthService.php` |
| 权限 | `vendor/melisplatform/melis-core/src/Service/MelisCoreRightsService.php` |
| 配置树 | `vendor/melisplatform/melis-core/src/Service/MelisCoreConfigService.php` |
| 区域渲染 | `vendor/melisplatform/melis-core/src/Controller/PluginViewController.php` |
| 缓存 API | `vendor/melisplatform/melis-core/src/Service/MelisCoreCacheSystemService.php` |
| 前台路由/SEO | `vendor/melisplatform/melis-front/src/Listener/MelisFrontSEORouteListener.php` |
| 页面服务 | `vendor/melisplatform/melis-engine/src/Service/MelisPageService.php` |
| React JSON API | `vendor/melisplatform/melis-react-api/src/Controller/MelisReactApiController.php` |
| 能力解析器 | `vendor/melisplatform/melis-react-api/src/Service/Capabilities.php` |
| SPA + 遗留 iframe | `vendor/melisplatform/melis-react-override/src/Controller/` |
| React 外壳（SPA 源码） | `vendor/melisplatform/melis-core/ui-react/` |
