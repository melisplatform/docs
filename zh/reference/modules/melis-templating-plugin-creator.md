# MelisTemplatingPluginCreator

> 一个后台向导，可将完整的前台 **模板插件（templating plugin）**——配置、
> 控制器、视图、模态表单、资源和翻译——一次性生成到新的或已有的模块中。在 v6 中它
> 以原生 React 组件（brick）形式提供，调用 JSON `react-api`，并带有切换到旧版工具的 New/Old 开关。
> 软件包 `melisplatform/melis-templating-plugin-creator`。

## 用途

MelisTemplatingPluginCreator 是一个代码生成器，而非运行时功能。它引导你完成一个
**6 步向导**——插件名称、目标模块、本地化菜单文本、属性（字段）、
翻译——然后将一个即用型模板插件写入目标模块。生成的
插件继承自 `MelisEngine\Controller\Plugin\MelisTemplatingPlugin`，因此创建之后其行为与
任何手写的模板插件完全一致——请阅读 [插件](/zh/guide/plugins) 以理解并自定义
其输出。

## 启用

它是一个标准的 Laminas 模块。将它添加到 `config/melis.module.load.php`：

```php
return [
    // …
    'MelisTemplatingPluginCreator',
];
```

Composer 依赖项（`composer.json`）：`melis-core`、`melis-tool-creator`、`melis-cms`。当
目标是一个 **新** 模块时，工具会委托 `MelisToolCreatorService::createTool()` 先
生成该模块。无需数据库，但 `module/` 目录以及公共文档根目录下的
`tpc/temp-thumbnail/` 文件夹必须可写（缩略图校验还需要 GD 扩展）。当文件系统不可写
或缺少 GD 时，React 组件会将这些情况作为 **阻塞性** 预检提示显示出来。

## React 后台

该向导是挂载于 `/melis-react` 的 **原生全 React 组件**（不是 iframe）。它作为名为
**Templating Plugin Creator** 的顶部标签页打开，带有一个 6 步进度条以及一个 **New / Old** 开关（位于右上角，
紧邻 **Restart**）。*Old* 会在 iframe 中回退到旧版 jQuery 工具；*New*（默认）则是
React 向导。该组件为 `persistent`（持久化）：离开工具标签页再返回时，草稿和当前步骤
都不会丢失。这 6 个步骤是同一个已挂载页面上通过 CSS 显示/隐藏的面板。

![React 向导的第 1 步（Plugin）：插件名称、插件目标（New module / Existing site module）及一个 New module name 字段、6 步进度条和 Next 按钮](/screenshots/react/melis-templating-plugin-creator/melistemplatingplugincreator-tool-step1.png)

所有业务逻辑均保留在服务器端：校验会重建旧版 Laminas 表单（相同的校验器、
消息和规则），而生成则调用 `MelisTemplatingPluginCreatorService`。React 只负责展示
和 API 调用。

### 6 个步骤

| 步骤 | 名称 | 你要做的事 |
| --- | --- | --- |
| 1 | Plugin | 插件名称 + 目标：**New module**（会显示一个新模块名称字段）或 **Existing site module**（模块下拉菜单）。 |
| 2 | Menu Texts & Display | 每种语言的标题/描述，显示在页面编辑器的插件列表中（≥1 种语言）+ 必需的缩略图上传（GIF/JPG/PNG，约 190×100，≤500 kB）。 |
| 3 | Main Properties | 属性数量（1–25，含 `template_path`）；每个字段需填写技术名称、显示类型、必填标志和默认值。属性 1 是强制的只读 `template_path`。 |
| 4 | Properties' Translation | 每个字段每种语言的标签 + 提示文字（外加每个 Dropdown 选项的标签）；填完一种完整的语言即可。 |
| 5 | Summary | 只读回顾第 1→4 步、目标模块和计算得出的模板路径。此处不写入任何内容。 |
| 6 | Finalization | 可选择要激活到的 **Site**，并切换 **Activate plugin after creation**，然后点击 **Finish and create the plugin**。 |

`template_path` 始终是强制的第一个属性，由服务器端计算为
`<Module>/plugins/<plugin-view-name>`，并且从不由客户端提交。**第 6 步是唯一会产生变更的
操作**：它写入插件文件，并且——对于新模块分支——生成模块、
可选地将其注册到所选站点的 `module.load.php`、激活它并使
模块路径缓存失效（激活需要平台重新加载，以倒计时形式显示）。可用的显示类型
包括 `MelisText`、`Dropdown`、`DatePicker`、`DateTimePicker`、`PageInput`、`NumericInput`、
`Switch`、`Textarea`、`MelisCoreTinyMCE`。

![第 2 步（Menu Texts & Display）：每种语言的标题和描述（English / Français），外加必需的插件缩略图卡片，带预览和 Remove thumbnail](/screenshots/react/melis-templating-plugin-creator/melistemplatingplugincreator-tool-step2.png)

![第 3 步（Main Properties）：属性数量（1–25）以及属性 1，即强制的只读 template_path 及其服务器计算得出的默认值](/screenshots/react/melis-templating-plugin-creator/melistemplatingplugincreator-tool-step3.png)

![第 6 步（Finalization）：Site 下拉菜单、Activate plugin after creation 开关，以及 Finish and create the plugin 按钮](/screenshots/react/melis-templating-plugin-creator/melistemplatingplugincreator-tool-step6.png)

## React API

路由位于 `config/react-api.php`，由 `MelisReactApiTemplatingPluginCreatorController` 提供服务，全部
位于 `/melis/react-api/tpc` 之下，契约为 `{ success, data, error }`。校验失败 **不是**
HTTP 错误：`POST /tpc/step/:step` 返回 `{ valid:false, errors:{…} }`，以便 UI 能够显示各字段的
消息。

| 方法与 URL | 用途 |
| --- | --- |
| `GET /tpc/context` | 预检（文件系统可写 + GD 检查 → `blocking[]`）、步骤元数据、语言、站点模块、站点、显示类型、`maxFields`（25）、缩略图限制。 |
| `GET /tpc/state` | 从共享会话中恢复向导。 |
| `POST /tpc/reset` | 重新开始：清除会话草稿 + 临时缩略图。 |
| `POST /tpc/step/:step`（`1–4`） | 校验并持久化某一步骤 → `{ valid, errors }`。 |
| `POST /tpc/thumbnail` · `POST /tpc/thumbnail/remove` | 上传 / 移除插件缩略图。 |
| `GET /tpc/translation-fields` | 需要翻译的字段（由第 3 步派生）。 |
| `GET /tpc/summary` | 只读回顾第 1→4 步 + 目标模块 + 模板路径。 |
| `POST /tpc/generate` | **生成插件**（写入文件，可选地生成 + 激活模块）。 |

## 能力（高级权限）

声明于 `config/react.capabilities.php`，位于承载权限的 melisKey
`melistemplatingplugincreator_tool` 之下（该键同时被清单和控制器访问守卫使用）。
语义为 **默认允许**。扁平化后的能力字符串：

| 能力 | 门控 |
| --- | --- |
| `wizard` · `wizard.edit` | 配置/校验第 1→4 步（没有 `wizard.edit` 时整个向导为只读）。 |
| `thumbnail` · `thumbnail.create` · `thumbnail.delete` | 上传 / 移除缩略图（第 2 步）。 |
| `summary` · `summary.list` | 读取摘要（第 5 步）。 |
| `finalization` · `finalization.create` | **生成插件**（第 6 步）——敏感能力。 |

每个控制器动作都被守卫两次——先是 `denyUnlessAccess()`（认证 + `canAccess`），再是
`denyUnlessCan(cap)`。在 UI 中隐藏控件仅是 UX 层面的处理；无论如何服务器都会拒绝。

## 关键服务

在 `config/module.config.php` 中注册为 `service_manager` 别名。

| 别名 | 职责 |
| --- | --- |
| `MelisTemplatingPluginCreatorService` | 根据保存在会话中的向导数据生成（并回滚）模板插件。 |

`MelisTemplatingPluginCreatorService`（继承自 `MelisCore\Service\MelisGeneralService`）主要
暴露：

| 方法 | 职责 |
| --- | --- |
| `generateTemplatingPlugin()` | 入口点：读取会话中的各步骤并写入所有插件文件；出现任何失败时回滚。返回布尔值。 |
| `getSiteTemplatingPluginNames($siteModule)` | 列出某个站点模块中已有的模板插件名称（用于拒绝重复的插件名称）。 |
| `generateModuleNameCase($str)` / `convertToViewName($string)` | 将名称规范化为合法的模块名称 / 视图目录名称。 |
| `getTempThumbnail()` | 解析当前会话中已上传插件缩略图的临时路径。 |

在内部，`generateTemplatingPlugin()` 会运行 `performGeneration()`，后者写入插件配置
（`config/plugins/<Module><Plugin>Plugin.config.php`）、更新目标 `module.config.php`
（`template_map` + `controller_plugins`）、按语言追加翻译、生成资源
（css/js + 缩略图）、控制器（`src/<Module>/Controller/Plugin/<Module><Plugin>Plugin.php`）、
前台视图和模态表单，并从模块的 `Module.php` 中引入这个新配置。React
控制器将其向导状态写入与旧版工具 **相同的会话容器**
（`templatingplugincreator`），因为该服务会在其构造函数中对其做快照。

## 前台

本模块自身 **不** 添加任何运行时前台插件或视图助手。相反，它会将一个模板插件
**生成** 到目标模块中：一个继承 `MelisEngine\Controller\Plugin\MelisTemplatingPlugin` 的
控制器插件类，其 `loadDbXmlToPluginConfig()` / `savePluginConfigToXml()` 已与所配置的字段
连接好；一个 `config/plugins/*.config.php`（`front` + `melis` 小节，一个 **Properties** 标签页）、
一个前台 `.phtml`、一个模态表单 `.phtml`，以及 css/js 资源。生成的插件随后
会出现在 CMS 页面编辑器的插件菜单中，并像其他任何模板插件一样被放入
`MelisDragDropZone`——参见 [插件](/zh/guide/plugins) 和
[搭建站点](/zh/guide/build-a-site)。

## 数据库表

无。本工具只生成源文件，并将其进行中的向导状态存储在一个 Laminas
会话容器（`templatingplugincreator`）中；不会安装任何 `melis_*` 表。

## 示例

生成的插件与任何模板插件一样被使用。从服务端来看，向导的
最后一步会调用：

```php
$tpcService = $serviceManager->get('MelisTemplatingPluginCreatorService');
$result = $tpcService->generateTemplatingPlugin(); // true on success, files written to the target module
```

## 关键文件

| 关注点 | 路径 |
| --- | --- |
| 模块 / 配置加载 | `vendor/melisplatform/melis-templating-plugin-creator/src/Module.php` |
| 装配（服务、表单元素、视图） | `vendor/melisplatform/melis-templating-plugin-creator/config/module.config.php` |
| React API 路由 + invokable | `vendor/melisplatform/melis-templating-plugin-creator/config/react-api.php` |
| React 能力 | `vendor/melisplatform/melis-templating-plugin-creator/config/react.capabilities.php` |
| 向导表单 + 步骤配置（复用于校验） | `vendor/melisplatform/melis-templating-plugin-creator/config/app.tools.php` |
| React API 控制器 | `vendor/melisplatform/melis-templating-plugin-creator/src/Controller/MelisReactApiTemplatingPluginCreatorController.php` |
| 旧版向导控制器（Old 视图 iframe） | `vendor/melisplatform/melis-templating-plugin-creator/src/Controller/TemplatingPluginCreatorController.php` |
| 生成器服务 | `vendor/melisplatform/melis-templating-plugin-creator/src/Service/MelisTemplatingPluginCreatorService.php` |
| React 组件（源码 + 构建产物） | `vendor/melisplatform/melis-templating-plugin-creator/ui-react/` · `public/ui-react/` |

另请参见：[模块参考](/zh/reference/modules) · [插件](/zh/guide/plugins) ·
[创建工具](/zh/guide/create-a-tool) · [搭建站点](/zh/guide/build-a-site)。
