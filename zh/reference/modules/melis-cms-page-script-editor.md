# MelisCmsPageScriptEditor

> 将自定义的 `<script>`/`<style>`/HTML（分析代码、跟踪像素、第三方小组件）逐页、逐站点地注入到
> 前台页面的 `<head>` 和 `<body>` 中，无需编辑模板。
> 包 `melisplatform/melis-cms-page-script-editor`。

## 用途

MelisCmsPageScriptEditor 让你可以添加原始标记，并将其自动注入到页面渲染后的 HTML 中。共有三个可用的
注入位置：**head top**（紧跟在 `<head>` 之后）、**head bottom**（紧邻 `</head>` 之前），以及
**body bottom**（紧邻 `</body>` 之前）。脚本可以作用于整个站点，也可以只作用于单个页面；一个页面可以被
标记为**例外**，从而退出站点级脚本的注入。

在 v6 React 后台中，该模块以**纯贡献型砖块（contribution-only brick）**的形式发布——它没有自己的
左侧菜单工具。相反，它在**两个位置**添加了一个 **Scripts 选项卡**：**CMS 页面编辑器**（逐页脚本）和
**Sites 工具编辑界面**（站点级脚本 + 例外）。数据模型、服务和注入监听器与 v5 相比没有变化；只有后台
UI 迁移到了 React。

## 启用它

在 `config/melis.module.load.php` 中添加：

```php
return [
    'MelisCmsPageScriptEditor',
];
```

需要 `melis-core ^6.0` 和 `melis-cms ^6.0`（PHP `^8.3|^8.5`）。该模块被标记为
`dbdeploy: true`，因此其数据表由 melis-dbdeploy 自动创建。

> **按站点激活：** 只有在某个站点为其加载了该模块之后，注入才会在该站点上生效
> （MelisCms → Sites → Module loading）。在此之前脚本可以在后台中编辑，但在模块于该站点启用之前，
> 前台不会注入任何内容。

## React 中的后台

这里**没有专属的左侧菜单工具**——Scripts 选项卡位于两个现有工具内部，二者均为原生 React。这两个选项卡
仅在模块处于激活状态时才会出现（通过 `GET /melis/react-api/react-modules` 发现，随后砖块 bundle
会在启动时预取）。

| 界面 | 位置 | 内容 | 保存 |
| --- | --- | --- | --- |
| **页面编辑器 → Scripts 选项卡** | MelisCms → 打开一个**页面** → *Scripts* | 三个逐页代码编辑器（Head top / Head bottom / Body bottom），**仅针对当前页面**。 | 自带 **Save scripts** 按钮。 |
| **Sites 工具 → Scripts 选项卡** | MelisCms → **Sites** → 打开一个站点 → *Scripts* | 三个站点级编辑器 + **Current Exceptions** 列表 + **Add an exception**（页面 id 输入框或页面树选择器）。 | 由站点编辑器的全局 **Save** 按钮保存；添加/移除例外会立即持久化。 |

![React CMS 页面编辑器，Scripts 选项卡：三个逐页代码编辑器（Head top / Head bottom / Body bottom）以及一个 Save scripts 按钮](/screenshots/react/melis-cms-page-script-editor/meliscmspagescripteditor-page-tab-scripts.png)

![React Sites 编辑界面，Scripts 选项卡：三个站点级编辑器、Current Exceptions 列表和 Add an exception 区块，由站点编辑器的全局 Save 按钮保存](/screenshots/react/melis-cms-page-script-editor/meliscmspagescripteditor-tooloverride-sites-edit-tab-scripts.png)

在被访问的页面上，每个位置都会**先获得站点脚本，然后是页面自身的脚本**——除非该页面是一个例外，此时
只会注入其自身的页面脚本。

**页面编辑器选项卡组件**位于 MelisCms 中（`PageTabs.tsx`，键为
`meliscms_page_script_editor`）；**站点选项卡组件**（`ScriptsTab.tsx`）位于本模块中，并通过通用的
`window.__melisSiteTabs` 注册表自行注册（顺序 `55`）。本模块拥有这两个选项卡背后的端点和能力
（capability）。

## 能力（高级权限）

页面选项卡是 **CMS 页面工具的一项能力（capability）**，在 `config/react.capabilities.php` 中于共享的
`meliscms_page` 节点下声明：

```php
return [
  'melisReactToolCapabilities' => [
    'meliscms_page' => [
      'tabs' => [
        ['key' => 'meliscms_page_script_editor', 'label' => 'tr_meliscmspagescripteditor_title'],
      ],
    ],
  ],
];
```

若没有此声明，CMS 页面能力白名单会在页面编辑器中隐藏 **Scripts** 选项卡按钮，即便对管理员也是如此。
**Sites 工具**的 Scripts 选项卡没有自己的能力：它由对 Sites 工具的访问权限（`meliscms_tool_sites`）
把控。

## React API

本模块拥有两个控制器，二者都委托给 `MelisCmsPageScriptEditorService`。契约为
`{ success, data, error }`，带有 `X-Requested-With: XMLHttpRequest` 和 `credentials: 'include'`。

**页面选项卡** —— `MelisReactApiPageScriptEditorController`，路由位于 `config/react-api.php`。由 auth +
`MelisCoreRights::canAccess('meliscms_page_script_editor')` 保护：

| 方法与 URL | 用途 |
| --- | --- |
| `GET /melis/react-api/cms-page/scripts?idPage=<id>` | 读取某页面的脚本 → `{ idPage, headTop, headBottom, bodyBottom, editDate }`。 |
| `POST /melis/react-api/cms-page/scripts/save` | 保存某页面的脚本（`{ idPage, headTop, headBottom, bodyBottom }`）。 |

**站点选项卡** —— `MelisCmsPageScriptEditorReactController`，通用路由
`/melis/MelisCmsPageScriptEditor/:controller/:action` 位于 `config/module.config.php`。由 auth +
`MelisCoreRights::canAccess('meliscms_tool_sites')` 保护：

| 方法与 URL（相对于 `.../MelisCmsPageScriptEditorReact`） | 用途 |
| --- | --- |
| `GET /site-script?siteId=<id>` | 站点脚本 + 例外数量 → `{ siteId, script, exceptionCount }`。 |
| `POST /save-site-script` | 保存站点脚本（全部为空 ⇒ 删除该条目）。 |
| `GET /exceptions?siteId=<id>` | 站点的例外 → `{ items:[{id,pageId,pageName}], total }`。 |
| `POST /add-exception` | 添加一个例外（`{ siteId, pageId }`；强制同站点 + 不重复）。 |
| `POST /delete-exception` | 移除一个例外（`{ id }`）。 |

> **安全说明。** 页面端点会将自定义的 `<script>`/HTML 注入到页面的**公开**渲染中，因此 `get` 和
> `save` 都需要 page-script-editor 工具权限（而不仅仅是一个会话），从而防止零权限的后台用户植入持久型
> XSS。写入操作直接在 `melis_cms_scripts` 上使用参数化 SQL。

## 关键服务

| 别名 | 角色 |
| --- | --- |
| `MelisCmsPageScriptEditorService` | 所有脚本业务逻辑：保存、读取、合并并注入脚本。被两个 React 控制器复用。 |
| `MelisCmsScriptTable` | `melis_cms_scripts` 的表网关。 |
| `MelisCmsScriptExceptionTable` | `melis_cms_scripts_exceptions` 的表网关。 |

`MelisCmsPageScriptEditorService` 暴露：

| 方法 | 角色 |
| --- | --- |
| `addScript($siteId, $pageId, $headTop, $headBottom, $bodyBottom, $mcsId)` | 为某个站点或页面插入或更新一条脚本记录。 |
| `addScriptException($siteId, $pageId)` | 将某页面标记为排除站点级脚本。 |
| `getScriptExceptions($siteId, $sortCol, $sortOrder)` | 列出退出站点脚本的页面。 |
| `getScriptsPerSite($siteId)` / `getScriptsPerPage($pageId)` | 检索某站点/页面的脚本记录。 |
| `getScriptsExceptionPerPage($pageId)` | 检索某页面的例外记录。 |
| `getMixedScriptsPerPage($pageId)` | 解析某页面的最终脚本——站点 + 页面合并，或当页面为例外时仅取页面脚本。由前台渲染监听器使用。 |
| `updatePageScripts($pageId, $html)` | 将合并后的脚本注入渲染后的 HTML（`<head>` 之后、`</head>` 之前、`</body>` 之前）。 |
| `getSiteId($pageId)` | 解析给定页面对应的站点 id。 |

## 前台

注入通过 MVC 监听器完成，而非模板插件：

| 监听器 | 触发时机 | 角色 |
| --- | --- | --- |
| `MelisCmsPageScriptEditorScriptTagListener` | 页面渲染（前台） | 调用 `getMixedScriptsPerPage()` 并注入解析后的脚本：head-top 位于 `<head>` 之后，head-bottom 位于 `</head>` 之前，body-bottom 位于 `</body>` 之前。 |

保存和复制仍然是事件驱动的（`Module.php::onBootstrap`）：save-page、save-site-script 和 duplicate-page
监听器会在后台保存或复制页面/站点时，持久化脚本以及 exclude-site 例外。视图助手
`melisCmsPageScriptEditorAddScript`
（`src/View/Helper/MelisCmsPageScriptEditorAddScriptHelper.php`）提供了通过服务以编程方式保存一条脚本
记录的能力。

## 数据表

| 表 | 存放内容 |
| --- | --- |
| `melis_cms_scripts` | 每个站点或每个页面一组脚本：`mcs_id`、`mcs_site_id`、`mcs_page_id`、`mcs_head_top`、`mcs_head_bottom`、`mcs_body_bottom`、`mcs_date_edition`、`mcs_user_id`。 |
| `melis_cms_scripts_exceptions` | 忽略站点脚本的页面：`mcse_id`、`mcse_site_id`、`mcse_page_id`、`mcse_date_creation`、`mcse_user_id`。 |

## 示例

```php
$scripts = $this->getServiceManager()->get('MelisCmsPageScriptEditorService');

// Resolve the final scripts for a page (site + page merged, or page-only if exception)
$resolved = $scripts->getMixedScriptsPerPage($pageId);
// $resolved contains headTopScript, headBottomScript, bodyBottomScript

// Save scripts for a site or page
$scripts->addScript($siteId, $pageId, $headTop, $headBottom, $bodyBottom, $mcsId);

// Mark a page as an exception (it will no longer receive site-wide scripts)
$scripts->addScriptException($siteId, $pageId);

// List all pages that opted out of the site scripts
$exceptions = $scripts->getScriptExceptions($siteId, $sortCol, $sortOrder);
```

## 关键文件

| 关注点 | 路径 |
| --- | --- |
| 模块引导与监听器接线 | `vendor/melisplatform/melis-cms-page-script-editor/src/Module.php` |
| 服务与路由接线 | `vendor/melisplatform/melis-cms-page-script-editor/config/module.config.php` |
| 页面选项卡 React API 路由 | `vendor/melisplatform/melis-cms-page-script-editor/config/react-api.php` |
| 页面选项卡能力声明 | `vendor/melisplatform/melis-cms-page-script-editor/config/react.capabilities.php` |
| React 控制器（页面 / 站点） | `vendor/melisplatform/melis-cms-page-script-editor/src/Controller/` |
| 站点选项卡砖块（Vite IIFE） | `vendor/melisplatform/melis-cms-page-script-editor/ui-react/src/`（`brick.tsx`、`ScriptsTab.tsx`、`site-scripts-api.ts`） |
| 服务 | `vendor/melisplatform/melis-cms-page-script-editor/src/Service/MelisCmsPageScriptEditorService.php` |
| 前台注入监听器 | `vendor/melisplatform/melis-cms-page-script-editor/src/Listener/MelisCmsPageScriptEditorScriptTagListener.php` |
| 视图助手 | `vendor/melisplatform/melis-cms-page-script-editor/src/View/Helper/MelisCmsPageScriptEditorAddScriptHelper.php` |
| 表网关 | `vendor/melisplatform/melis-cms-page-script-editor/src/Model/Tables/` |
| 安装 SQL | `vendor/melisplatform/melis-cms-page-script-editor/install/dbdeploy/` |

另见：[模块参考](/zh/reference/modules) · [melis-cms](/zh/reference/modules/melis-cms) ·
[melis-core](/zh/reference/modules/melis-core)
