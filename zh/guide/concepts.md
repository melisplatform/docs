# 架构与概念

Melis Platform 是一个 **Laminas（ZF2 血统）MVC 应用**。在标准 Laminas 之上，它增加了
少量为后台提供支撑的约定。理解以下这五个概念，就足以读懂——并扩展——平台的几乎任何部分。

在 **v6** 中，框架和模块保持不变：相同的 Laminas 模块、相同的配置
树、相同的服务与事件。改变的是**后台 UI**：v6 在这套不变的基础之上，交付了一个全新的
**位于 `/melis-react` 的 React 后台**（参见 §6）。下面这五个
概念仍然描述了底层的一切是如何运作的。

## 1. 模块

Melis 中的一切都是**模块**（标准的 Laminas 模块）。应用加载的后台模块列表
位于：

```
config/melis.module.load.php
```

```php
return [
  'MelisAssetManager',
  'MelisDbDeploy',
  'MelisCore',
  'MelisCms',
  'MelisFront',
  // … your own modules go here
];
```

在引导阶段，`config/application.config.php` 通过
`MelisCore\MelisModuleManager` 组装最终的模块列表（它将这些模块与组件模块以及
由 `MELIS_MODULE` 选中的站点模块合并到一起）。

一个模块打包了它自己的控制器、服务、视图、翻译**以及**一组
Melis 专用的配置文件（见下文）。其 `Module::getConfig()` 会将它们合并到一起。在 v6 中，一个
模块**还**可以附带一个 React "brick"（一个小型 React UI）及其自己的 `react-api` 端点——
这些仍然只是同一模块内额外的配置和源码（参见 §6）。

## 2. 配置树与 "melis keys"

除了常见的 `module.config.php` 之外，每个后台模块都会发布**应用配置文件**，它们
被合并到一棵位于 `plugins` 根节点下、可查询的单一配置树中：

| 文件                  | 声明内容                                              |
| --------------------- | ---------------------------------------------------- |
| `app.interface.php`   | UI 区域/分区及其 **forwards**（参见 §3）              |
| `app.tools.php`       | 工具：数据表、列、筛选器、操作按钮                   |
| `app.toolstree.php`   | 工具在**左侧菜单**中挂载的位置                       |
| `app.forms.php`       | 表单定义                                             |

你可以通过 **`MelisCoreConfig`** 服务查询这棵树
（`vendor/melisplatform/melis-core/src/Service/MelisCoreConfigService.php`）：

```php
$config = $sm->get('MelisCoreConfig');

// Fetch a node by path:
$node = $config->getItem('meliscore_leftmenu');

// Resolve all the "melis keys" → full config paths:
$keys = $config->getMelisKeys();
```

**melis key** 是为某个深层嵌套的配置路径提供的一个稳定、易读的别名，通过
`'conf' => ['melisKey' => 'my_key']` 在节点上声明。它让模块能够引用彼此的 UI，而无需
硬耦合到具体路径。同样的这个 **melisKey** 也是 React 后台用来标识一个
工具的依据——既用于路由到它，也用于按权限对它进行门禁控制（参见 §6）。

## 3. 区域与 forwards（后台如何渲染）

后台 UI 是**配置驱动**的。一个页面是一棵由**区域（zones）**构成的树；每个区域可以声明一个
**forward**——一个用于渲染该区域的 `module / controller / action` 三元组：

```php
'forward' => [
  'module'     => 'MelisCms',
  'controller' => 'PageTree',
  'action'     => 'render-page-tree',
],
```

`MelisCore\Controller\PluginViewController` 会遍历配置树，分发每一个 forward，并
组装出最终的 HTML。这就是为什么左侧菜单、页头和工具全都在配置中声明，而不是硬编码的原因——
也是为什么添加一个工具主要就是**声明正确的
配置**并提供一个控制器 + 视图的原因。

在 v6 中，这套区域/forward 机制仍然是唯一的事实来源，它以两种方式为 React 外壳提供支撑：
任何没有原生 React 界面的经典工具都会被渲染为一个**独立区域**，
并在外壳内以 iframe 形式展示；而外壳所显示的左侧菜单，则是由
同一份 interface 配置构建、再按权限过滤而成的（参见 §6）。

## 4. 服务与工厂

Melis 依赖于 **Laminas 服务管理器**。服务在每个模块的
`module.config.php` 中注册（`service_manager` → `aliases` / `factories`），并按名称解析：

```php
$svc = $this->getServiceManager()->get('MelisCoreConfig');
```

常见的核心服务包括 `MelisCoreConfig`、`MelisCoreAuth`、`MelisCoreRights`、
`MelisCoreUser`、`MelisCoreTool`。业务服务通常继承自 `MelisGeneralService`
（它增加了事件分发能力）；数据库访问则通过 Laminas 的 `TableGateway` 封装进行。
v6 的 React 界面并不改变这一点：一个 React brick 只是表现层——它所执行的每个操作
都会通过 `react-api` 端点回调到这些**相同的服务端服务**中（参见 §6）。

## 5. 事件

模块在 `Module::onBootstrap()` 中、以及通过**共享事件管理器**上的监听器，
挂接到请求生命周期中。核心行为（身份验证、权限检查、flash 消息、
缓存……）都是以这种方式接线的，你也可以发布/订阅自定义的 Melis 事件——例如
`melis_core_auth_login_ok` 会在登录成功后触发。

## 6. React 后台（v6）

v6 保留了框架和模块，但用一个服务于 **`/melis-react`** 的 React 单页
应用**替换了后台 UI**（经典的 `/melis` UI 仍然在底层存在）。只需两个概念
就足以描绘它：

- **Bricks（砖块）**——一个原生 React 工具。一个模块附带一个 `public/ui-react/brick.manifest.json` 和一个
  构建好的 bundle；外壳会**发现**每个已激活模块的 bricks 并挂载它们。一个 brick 当且仅当其
  模块被启用时才会出现——与其他地方相同的模块化规则。
- **New / Old 切换开关**——大多数工具在右上角都带有一个开关：**New** = 原生 React 界面，
  **Old** = 在 iframe 内渲染的经典工具。因此在模块被逐步用 React 重写的过程中，
  不会丢失任何功能。

外壳围绕你的工具所展示的一切——你是谁、**左侧菜单**（已按你的权限过滤）、
语言切换器、**仪表盘**磁贴、工具发现——都是在启动时由一小组通用的
**JSON 端点**（位于 `/melis/react-api/…` 下）组装而成的，每个端点都返回一个
`{ success, data, error? }` 载荷。每个界面上都提供一个全局悬浮的 **AI 助手**浮层。

![React AI 助手浮层](/screenshots/react/melis-ai/melisai-footer-icon-generalassistant-deployed.png)
*悬浮的 AI 助手在 React 后台的每个界面上都可用。*

有三个模块使这一切得以运转，而它们都不是你会导航前往的工具：

- **MelisReactApi**——JSON API 主干。它不绘制任何 UI；它提供启动集
  （`/me`、`/menu`、`/langs`、`/assets`、`/react-modules`）以及仪表盘和权限端点，
  并托管着**能力（capability）**引擎（见下文）。一个工具*自身*的数据端点位于该
  工具的模块中，而不在这里。
- **MelisReactOverride**——负责底层管道的模块，它 (a) 为 `/melis-react` 及其
  深层链接提供 React 外壳，并 (b) 将任何经典工具渲染为一个独立页面
  （`/melis/react-tool-page?key=<melisKey>`），使得 **Old** 开关以及任何尚未重写的工具
  仍能在外壳内正常工作。
- 每个**功能模块**（例如 `MelisCms`）都附带它自己的 bricks、`react-api` 路由和
  能力（capabilities）。

**能力（Capabilities）**是 v6 的细粒度"高级权限"：在一个*已经授权*的工具*内部*，
单个操作（`list`、`create`、`edit`、`delete`，或某个嵌套的标签页）可以按
用户/角色被拒绝。它们是**默认允许**的，并且**从属**于经典的工具访问检查
（`MelisCoreRights::canAccess`，保持不变）——一个没有能力声明的工具会保留完整的 CRUD。
一个模块在 `config/react.capabilities.php` 中声明其工具 `melisKey` 所存在的能力；
其控制器则用 `denyUnlessCan($cap)` 对每个操作进行门禁控制。

> 经验法则：如果 React 外壳展示了某样东西（菜单、页头、仪表盘、工具列表、权限矩阵），
> 但它并不是某个具体工具自身的界面，那么它就来自某个 MelisReactApi 端点。如果你在
> `/melis-react` 内看到的是一个经典的 Bootstrap 风格工具，那么你看到的就是 MelisReactOverride
> 在 iframe 中渲染那个工具。

关于完整的契约与内部实现，请参见模块参考：
[MelisReactApi](/zh/reference/modules/melis-react-api) 和
[MelisReactOverride](/zh/reference/modules/melis-react-override)；关于一个
多 brick 模块的实战示例，请参见 [MelisCms](/zh/reference/modules/melis-cms)。

## 附加内容：数据库变更（dbdeploy 与 flyway）

Schema 和种子数据的变更都是版本化管理的：

- **dbdeploy**（`MelisDbDeploy`）：每个模块附带带编号的 SQL 增量（delta）；已应用的增量会
  被记录在 `changelog` 表中，以确保它们只运行一次。模块增量会被发布到 `dbdeploy/` 中。
- **flyway**（`flyway/sql/`）：项目级别的迁移（例如 `V3__add_melisai_rights.sql`），
  通过 `flyway migrate` 应用。

## 在代码中该看哪里

| 关注点             | 路径 |
| ------------------- | ---- |
| 模块列表         | `config/melis.module.load.php` |
| 应用引导       | `config/application.config.php` |
| 平台数据库配置  | `config/autoload/platforms/<MELIS_PLATFORM>.php` |
| 配置服务      | `vendor/melisplatform/melis-core/src/Service/MelisCoreConfigService.php` |
| 区域/forward 渲染 | `vendor/melisplatform/melis-core/src/Controller/PluginViewController.php` |
| 模块管理器      | `vendor/melisplatform/melis-core/src/MelisModuleManager.php` |
| React 外壳（SPA）   | `vendor/melisplatform/melis-core/public/ui-react/` |
| React API + 能力 | `vendor/melisplatform/melis-react-api/` |
| React 外壳与 iframe 管道 | `vendor/melisplatform/melis-react-override/` |

下一步：动手实践，[创建你的第一个工具](./create-a-tool)。
