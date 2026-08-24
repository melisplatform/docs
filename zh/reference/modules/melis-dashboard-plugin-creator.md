# MelisDashboardPluginCreator

> 一个分步向导，用于将新的后台**仪表盘插件**（小部件）脚手架生成到新模块或现有模块中，现以原生 React 砖块（brick）形式提供。软件包 `melisplatform/melis-dashboard-plugin-creator`。

## 用途

MelisDashboardPluginCreator 是一个**代码生成助手**：一个 5 步向导，用于生成一个可直接使用的仪表盘小部件——包括其控制器、视图、配置、资源和翻译——并将其接入目标模块。你可以选择**单标签页**或**多标签页**小部件、目标位置（创建全新模块或扩展现有模块）、按语言的标题/描述、一个图标和一张缩略图；随后该工具会写入文件，并（可选地）激活该插件。

生成的小部件继承 `MelisCore\Controller\DashboardPlugins\MelisCoreDashboardTemplatingPlugin`，并在 `melis_dashboardplugin` 接口下声明，因此它会出现在后台仪表盘上。该模块依赖 `melis-core` 和 `melis-tool-creator`（后者被复用于脚手架生成新模块）。关于仪表盘插件背后的概念，请参阅 [插件](/legacy/guide/plugins)；关于后台工具的总体介绍，请参阅 [创建工具](/legacy/guide/create-a-tool)。

## 启用

它是一个标准的 Laminas 模块。将其添加到 `config/melis.module.load.php`：

```php
return [
    // …
    'MelisDashboardPluginCreator',
];
```

通过 Composer 安装（`composer require melisplatform/melis-dashboard-plugin-creator`）；`melis-core` 和 `melis-tool-creator` 会被自动引入。无需数据库。

该工具会向磁盘写入文件，因此以下路径必须对 Web 服务器**可写**（在运行时检查，并作为 `context.blocking[]` 呈现给向导）：`config/melis.module.load.php`、`module/` 目录，以及临时缩略图路径 `<DOCUMENT_ROOT>/dpc/temp-thumbnail/`（在 `config/app.tools.php` 中的 `melisdashboardplugincreator/datas/plugin_thumbnail/path` 下配置）。

## React 后台

在 React 后台（`/melis-react`）中，该工具以**原生全 React 砖块**的形式提供——一个真正的 React 向导，调用 JSON 格式的 `react-api`，并带有一个 **New / Old** 切换开关，可回退到 iframe 中的旧版 jQuery 工具。所有实际工作都保留在服务端：验证复用旧版 Laminas 表单，生成则调用 `MelisDashboardPluginCreatorService`。React 仅负责呈现和 API 调用。

| 项目 | 值 |
| --- | --- |
| 砖块类型 | 原生全 React（5 步向导，带 New/Old 旧版 iframe 回退） |
| 砖块 id | `dashboard-plugin-creator` |
| 清单 `route` | `/melis-core/dashboard-plugin-creator`（回退挂载点） |
| `label` | `Dashboard Plugin Creator` |
| `forwardKey` | `MelisDashboardPluginCreator/DashboardPluginCreator` |
| `melisKey` | `melisdashboardplugincreator_tool` |
| `subTabs` / `persistent` | `false` / `true` |
| API 基础路径 | `/melis/react-api/dpc` |

该砖块通过 `GET /melis/react-api/react-modules` 被发现，且**仅当该模块在 `config/melis.module.load.php` 中处于激活状态时**才会出现。它是 `persistent`（持久化）的：向导只挂载一次，其 5 个步骤是通过 CSS 显示/隐藏的面板，因此离开工具标签页再返回既不会丢失草稿，也不会丢失当前步骤。**Restart**（重启）按钮（顶部工具栏）会清除会话草稿和临时缩略图。将 **New / Old** 切换开关切到 *Old* 会在 iframe 中渲染旧版控制器（`/melis/react-tool-page?key=melisdashboardplugincreator_tool`）并重置共享会话草稿；如果存在草稿，向导会先发出警告。

## 5 步向导

| 步骤 | React 组件 | 你要做什么 |
| --- | --- | --- |
| 1 — Plugin | `Step1Plugin` | **插件名称**、**视图类型**（Single 单标签页 / Multi-tabs 多标签页，2–25 个标签页）、**插件目标位置**（新模块 + 名称，或从现有模块下拉列表中选择）。 |
| 2 — Menu Texts & Display | `Step2Menu` | 按语言填写**插件标题** + **描述**（语言标签栏，至少需要一种语言）；上传必需的**插件缩略图**（GIF/JPG/PNG，约 190×100，≤500 kB）。 |
| 3 — Dashboard Texts & Display | `Step3Dashboard` | 按语言填写**卡片标题**，从网格中选择**插件图标**；多标签页插件需**为每个标签页各选一个图标**。 |
| 4 — Summary | `Step4Summary` | 步骤 1→3 及目标模块的只读回顾（从 `/dpc/summary` 获取）；不会写入任何内容。 |
| 5 — Finalization | `Step5Finalize` | **创建后激活插件** 切换开关（默认开启）+ **完成并创建插件** → 执行生成；激活后会有一个倒计时并重新加载平台。 |

步骤 5 是**唯一的写入操作**。业务规则（保留的 PHP 关键字、模块已存在、插件名称/标题已被占用）在服务端针对旧版 Laminas 表单进行验证；React 组件只负责渲染返回的按字段消息。

![步骤 1 — Plugin：名称、视图类型（Single / Multi-tabs）和插件目标位置（New / Existing module）](/screenshots/react/melis-dashboard-plugin-creator/melisdashboardcreator-tool-step1.png)

![步骤 2 — Menu Texts & Display：按语言的标题/描述（English / Français）以及带预览和 Remove 的必需插件缩略图](/screenshots/react/melis-dashboard-plugin-creator/melisdashboardcreator-tool-step2.png)

![步骤 3 — Dashboard Texts & Display：按语言的卡片标题和插件图标网格（已选中 Calendar）；多标签页插件会追加一个按标签页的图标网格](/screenshots/react/melis-dashboard-plugin-creator/melisdashboardcreator-tool-step3.png)

![步骤 4 — Summary：生成前对 Plugin / Target module / Type、缩略图、Menu 文本、Dashboard 标题和 Icon 的只读回顾](/screenshots/react/melis-dashboard-plugin-creator/melisdashboardcreator-tool-step4.png)

![步骤 5 — Finalization："Activate plugin after creation"（创建后激活插件）切换开关和运行生成的 "Finish and create the plugin"（完成并创建插件）按钮](/screenshots/react/melis-dashboard-plugin-creator/melisdashboardcreator-tool-step5.png)

## React API

路由位于 `config/react-api.php`，由 `MelisReactApiDashboardPluginCreatorController` 提供服务。全部位于 `/melis/react-api/dpc` 之下，契约为 `{ success, data, error }`。验证失败**并非** HTTP 错误——`POST /dpc/step/:step` 返回 `{ success:true, data:{ valid:false, errors:{…} } }`，以便 UI 能显示按字段消息。

| 方法与 URL | 用途 |
| --- | --- |
| `GET /dpc/context` | 预检（文件系统可写 → `blocking[]`）、步骤元数据、语言、现有模块、图标、标签页最小/最大值、缩略图限制 |
| `GET /dpc/state` | 从共享会话获取当前向导状态（恢复 UI） |
| `POST /dpc/reset` | 重启：清除会话草稿 + 临时缩略图 |
| `POST /dpc/step/:step`（`1`–`3`） | 验证 + 持久化某一步骤 → `{ valid, errors }` |
| `POST /dpc/thumbnail` | 以 multipart 方式上传插件缩略图 |
| `POST /dpc/thumbnail/remove` | 移除缩略图 |
| `GET /dpc/summary` | 步骤 1→3 及目标模块的只读回顾 |
| `POST /dpc/generate` | **生成插件** → `{ generated, module, plugin, restartRequired, notices }` |

```ts
const BASE = '/melis/react-api/dpc'

// validate + save step 1
await postJson('/step/1', {
  dpc_plugin_name: 'SalesOverview', dpc_plugin_type: 'single',
  dpc_plugin_destination: 'new_module', dpc_new_module_name: 'MyDashboards',
}) // → { valid: true, errors: {} }

// generate (step 5) — the ONLY mutating call
await postJson('/generate', { dpc_activate_plugin: true })
// → { generated:true, module:'MyDashboards', plugin:'SalesOverview', restartRequired:true }
```

控制器不会重新实现该工具的逻辑：验证会从 `config/app.tools.php` 重新构建旧版 Laminas 表单（`getFormMergedAndOrdered`），而状态会被写入与旧版工具**相同的会话容器**（`dashboardplugincreator`），服务在其构造函数中读取该容器。

## 能力（Capabilities）

在 `config/react.capabilities.php` 中声明，位于承载权限的节点 `melisdashboardplugincreator_tool` 之下。其语义为**默认允许**（未声明的能力会被放行，因此旧版角色仍可正常工作）。扁平化后的能力字符串：

| 标签页 | 操作 | 守卫 |
| --- | --- | --- |
| `wizard` | `edit` | 配置/保存步骤 1→3（若没有 `wizard.edit`，则整个向导为只读） |
| `thumbnail` | `create`、`delete` | 上传/移除缩略图（步骤 2） |
| `summary` | `list` | 读取摘要（步骤 4） |
| `finalization` | `create` | **生成**插件（步骤 5）——敏感能力 |

每个控制器操作都会被守卫两次——先是访问权限（`denyUnlessAccess`），然后是相关能力（`denyUnlessCan('finalization.create')`）。在 React 中隐藏控件仅是 UX 层面的处理；无论如何服务端都会拒绝。

## 关键服务

在 `config/module.config.php` 中注册并设置别名：

| 服务别名 | 作用 |
| --- | --- |
| `MelisDashboardPluginCreatorService` | 根据向导会话中保存的数据生成仪表盘插件。 |

`MelisDashboardPluginCreatorService` 继承 `MelisCore\Service\MelisGeneralService`。值得注意的方法：

- `generateDashboardPlugin()`——入口点：读取会话中的各步骤，解析目标模块/插件名称，然后运行 `performGeneration()`，失败时回滚（`rollbackPluginGeneration()`）。触发 `melisdashboard_plugin_creator_service_generate_dashboard_plugin_start/end` 事件。
- 内部生成步骤：`generateDashboardPluginConfig()`（写入 `config/dashboard-plugins/<Plugin>Plugin.config.php`）、`generateDashboardPluginController()`、`generateDashboardPluginView()`（单标签页或多标签页模板）、`generateDashboardPluginAssets()`（CSS/JS + 复制缩略图）、`setTranslations()`（按语言的菜单/标题键）、`updateModuleConfig()`（注入 `template_map` + `controller_plugins`）以及 `updateModuleFile()`（将配置 `include` 添加到 `Module.php`）。
- 辅助方法：`getModuleExistingPlugins()` / `getExistingTranslatedPluginTitle()`（重名检查）、`getTempThumbnail()`、`generateFile()`、`generateModuleNameCase()`、`removeDir()`。

当目标位置为**新模块**时，生成会将模块创建委托给 `melis-tool-creator`（以 `blank` 工具调用 `MelisToolCreatorService::createTool()`），然后激活它（`ModulesService::activateModule()`），并使模块路径缓存和仪表盘菜单缓存失效。激活需要重新加载平台。

## 前台

该模块没有前台模板插件或视图助手——它是一个仅限后台的工具。（不过，它所*生成*的小部件本身是后台仪表盘插件。）

## 数据库表

MelisDashboardPluginCreator **没有定义任何自己的表**——它不附带任何安装 SQL 或 dbdeploy 增量脚本。所有状态都保存在向导会话中；输出会直接写入目标模块的文件。

## 示例

根据已存储在向导会话中的数据触发生成（这正是步骤 5 / `POST /dpc/generate` 在幕后所做的事）：

```php
/** @var \MelisDashboardPluginCreator\Service\MelisDashboardPluginCreatorService $dpc */
$dpc = $serviceManager->get('MelisDashboardPluginCreatorService');

$success = $dpc->generateDashboardPlugin(); // true on success, false (and rolled back) on failure
```

生成的小部件遵循 `template/DashboardPluginController.php` 中的模板——一个继承 `MelisCoreDashboardTemplatingPlugin` 的类，其操作返回一个 `ViewModel`：

```php
class MyModuleMyWidgetPlugin extends MelisCoreDashboardTemplatingPlugin
{
    public function __construct()
    {
        $this->pluginModule = 'mymodule';
        parent::__construct();
    }

    public function myWidget()
    {
        $view = new ViewModel();
        $view->setTemplate('my-module/dashboard-plugins/my-widget');
        return $view;
    }
}
```

## 关键文件

| 关注点 | 路径 |
| --- | --- |
| 模块清单 | `vendor/melisplatform/melis-dashboard-plugin-creator/composer.json` |
| 路由 / 服务 / 控制器 / 表单 | `vendor/melisplatform/melis-dashboard-plugin-creator/config/module.config.php` |
| React API 路由 | `vendor/melisplatform/melis-dashboard-plugin-creator/config/react-api.php` |
| React 能力 | `vendor/melisplatform/melis-dashboard-plugin-creator/config/react.capabilities.php` |
| 向导步骤、表单、图标、缩略图配置 | `vendor/melisplatform/melis-dashboard-plugin-creator/config/app.tools.php` |
| 生成服务 | `vendor/melisplatform/melis-dashboard-plugin-creator/src/Service/MelisDashboardPluginCreatorService.php` |
| React API 控制器 | `vendor/melisplatform/melis-dashboard-plugin-creator/src/Controller/MelisReactApiDashboardPluginCreatorController.php` |
| 旧版向导控制器（Old 视图） | `vendor/melisplatform/melis-dashboard-plugin-creator/src/Controller/DashboardPluginCreatorController.php` |
| React 砖块源码 | `vendor/melisplatform/melis-dashboard-plugin-creator/ui-react/src/` |
| 构建后的砖块 + 清单 | `vendor/melisplatform/melis-dashboard-plugin-creator/public/ui-react/` |
| 生成插件的模板 | `vendor/melisplatform/melis-dashboard-plugin-creator/template/` |

::: tip 相关内容
这是 `melis-templating-plugin-creator`（前台模板插件）在仪表盘侧的对应工具。若要理解它所生成的产物，请阅读 [插件](/legacy/guide/plugins)。
:::
