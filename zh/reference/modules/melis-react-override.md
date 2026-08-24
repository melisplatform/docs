# MelisReactOverride

> React 后台基础设施：在 `/melis-react` 外壳中渲染旧版工具，并提供 React SPA 服务。软件包 `melisplatform/melis-react-override`。

## 用途

MelisReactOverride 是一个 **React 后台基础设施模块**，而非工具。它不提供任何 brick、任何 React 页面、任何 `react-api` 端点，也没有自己的界面。它提供了两套底层机制，使 React 后台（`/melis-react`）能够与旧版 `/melis` 并行运行：

1. **旧版工具 iframe 机制** —— 任何没有专属 React 页面的旧版 jQuery/AJAX 工具，都会被渲染为一个独立的 HTML 页面（`/melis/react-tool-page?key=<melisKey>`），并通过 `<iframe>` 显示在 React 外壳中。frame 内部的工具在外观和行为上与直接访问 `/melis` 完全一致 —— 保留其自身的 DataTables、表单、模态框、选项卡、保存按钮和原生通知（gritter 提示框、逐字段校验模态框）。
2. **SPA 回退路由** —— 它为 `/melis-react` 及其下的每一个客户端深层链接提供 React 外壳 `index.html`，并将该路由（以及少数几个只读的启动端点）设为公开。

你永远不会主动导航*到*这个模块。经验法则：如果你身处 `/melis-react` 中，却看到一个旧式（经典 Bootstrap）的工具界面，那么你看到的就是由 MelisReactOverride 生成的页面。

## 启用它

它是一个纯服务端的 Laminas MVC 模块，通过 `application.config.php`（`module_paths` + `modules`）加载 —— `src/Module.php` 通过 `StandardAutoloader` 从 `src/` 中自动加载 `MelisReactOverride\*`。类别为 `core`。

它通过一个 `controllers.invokables` 别名，用一个支持 React 的版本**覆盖了 MelisCore 的 `PluginView` 控制器**。由于该模块在 melis-core *之后*加载，此别名会在 Laminas 配置合并中胜出：

```php
'controllers' => [
    'invokables' => [
        'MelisCore\Controller\PluginView'   => \MelisReactOverride\Controller\PluginViewController::class,
        'MelisReactOverride\Controller\Spa' => \MelisReactOverride\Controller\SpaController::class,
    ],
],
```

## 一览

| 属性 | 值 |
| --- | --- |
| 模块名称 | `MelisReactOverride` |
| 软件包 | `melisplatform/melis-react-override` |
| 类别 | `core` |
| Brick / `ui-react/` / `react-api.php` | **无**（仅基础设施） |
| 控制器 | `PluginViewController`（别名覆盖 `MelisCore\Controller\PluginView`）、`SpaController` |
| 服务 | `PlatformAssetsService`、`LegacyWidgetCssService` |
| 扩展点 | `PluginViewToolPageExtensionInterface`（`toolpage_extensions` 钩子） |

## 路由

所有 tool/iframe 路由都是 `melis-backoffice` 的子路由，因此它们位于 `/melis` 之下。SPA 路由则是一个顶层正则路由。

| 路由名称 | URL | Action | 用途 |
| --- | --- | --- | --- |
| `melis-backoffice/react-tool-page` | `/melis/react-tool-page` | `toolPage` | **核心机制。** 将一个旧版工具区域（zone）渲染为供 iframe 使用的独立 HTML 页面。接受 `?key=<melisKey>`（以及用于 CMS 页面编辑器的 `?idPage=<id>`）。 |
| `melis-backoffice/react-dashboard-plugin` | `/melis/react-dashboard-plugin` | `dashboardPluginPage` | 将单个旧版仪表盘插件渲染为一个极简的独立页面。 |
| `melis-backoffice/react-dashboard-plugin-config` | `/melis/react-dashboard-plugin-config` | `dashboardPluginConfigPage` | 将某个仪表盘插件的配置表单（齿轮按钮）渲染为独立 HTML。 |
| `melis-backoffice/react-dashboard-plugin-config-data` | `/melis/react-dashboard-plugin-config-data` | `dashboardPluginConfigData` | JSON：将配置表单作为数据返回（选项卡 + 带类型的字段 + 值），以便 React 原生渲染。 |
| `melis-backoffice/react-dashboard-plugin-config-save` | `/melis/react-dashboard-plugin-config-save` | `dashboardPluginConfigSave` | POST：校验并持久化某个仪表盘插件的配置。 |
| `melis-backoffice/react-dashboard-plugin-content` | `/melis/react-dashboard-plugin-content` | `dashboardPluginContent` | JSON：用于直接注入 DOM 的 HTML + 脚本 + jsCallbacks（无需 iframe）。 |
| `melis-backoffice/react-platform-bundle` | `/melis/react-platform-bundle` | `platformBundle` | 以正确的 MIME 类型提供拼接后的资源包（替代 MelisCore 的 `/melis/get-{css,js}-bundles`，后者在资源包缺失时会返回空的 `text/html`）。 |
| `melis-backoffice/react-legacy-widget-css` | `/melis/react-legacy-widget-css` | `legacyWidgetCss` | 旧版后台样式表，每条规则都作用域限定在 `.melis-legacy-widget` 之下。 |
| `meliscore-melis-react-spa` | `/melis-react`、`/melis-react/*` | `spa` | **SPA 回退。** 提供 React 外壳 `index.html`。正则路由，`priority => 1000`。 |

### 公开路由（`excluded_routes`）

该模块会向 MelisCore 的 `plugins.meliscore.datas.excluded_routes` 追加内容（数值数组通过追加方式合并），以便 `MelisCore\Module::checkIdentity()` 放行这些路由，而不将其重定向到 `/melis/login`：

- `meliscore-melis-react-spa` —— 外壳是公开的，因为 React 应用自行处理认证（拥有自己的登录界面）。
- `melis-backoffice/react-platform-bundle` —— 这样一来，过期的会话就不会把样式表请求重定向到一个 HTML 登录页面（这正是该路由所修复的 MIME 错误）。
- `melis-backoffice/melis-react-api/platformscheme-react-get` —— 登录面板的品牌信息，在认证之前读取（仅 GET）。
- `melis-backoffice/melis-react-api/langs` —— SPA 在启动时（包括在登录界面上）加载的后台语言列表（只读）。

> 后两个是 `melis-react-api` 路由（归 **MelisReactApi** 所有）；MelisReactOverride 只是将它们设为公开，并不定义它们。

## iframe 机制 —— `toolPageAction()` → `buildToolPage()`

`PluginViewController::toolPageAction()` 解析一个 melisKey、渲染其区域，并将 HTML 交给 `buildToolPage()` 组装成一个独立文档。流程如下：

1. **认证守卫** —— `denyIfUnauthenticated()` 首先运行（此页面*不是*公开的）。
2. **解析 melisKey → appConfig 路径** —— `MelisCoreConfig->getMelisKeys()` 将 `?key=` 映射到一个应用配置路径；最后一段是视图键（view key）。
3. **强制 XHR 模式** —— 添加 `X-Requested-With: XMLHttpRequest`，使 `generateRec()` 以 `follow_regular_rendering:false` 渲染区域，与经典的 AJAX 路径的方式相同（否则这些工具会落到前台并渲染出 "404 MelisDemoCms"）。
4. **固定 PHP 会话 id** —— 渲染前快照，渲染后恢复（某些旧版工具在渲染过程中会轮换会话 id —— 这在 `/melis` 中无害，但在此处却是致命的）。
5. **渲染区域** —— 使用 `generateRec()` + `renderViewRec()`，并捕获区域向输出流中 `echo` 出的任何游离输出（作为 HTML 注释保留在标记之外，以便诊断）。
6. **运行 `adjustToolHtml()` 扩展**（`toolpage_extensions`）作用于已渲染的 HTML。
7. **构建平台资源** —— 通过 `PlatformAssetsService::build()` 并注入该模块自身的 JS/CSS `ressources`。
8. **运行 `adjustToolAssets()` 扩展**（可能将某些模块 JS 移入 `<head>` 桶，并返回 `skipJsRoots`，以便通用循环不会重复加载它）。
9. **组装** `buildToolPage($html, $jsCallBacks, $assets, $zoneId, $key)`，并以 `text/html` 返回，带 `X-Frame-Options: SAMEORIGIN`。

### `buildToolPage()` 所解决的坑

- **中和 bundle.js 的 "Remove Envato Frame" 守卫** —— 在沙箱化的 iframe 内部，该守卫会抛出一个 `SecurityError`，从而搞垮 bundle.js。页面会捕获真正的父窗口（`window.__melisRealParent`），然后重新定义 `window.parent`/`window.top` 使其返回 `window`。
- **单独加载 `melisDataTable.js`** —— 它在 `app.interface.php` 中声明，但不存在于 `bundle.js` 中；因此被加入 JS 队列（暴露 `window.melisDataTable`）。
- **全局 `Proxy` 垫片** —— 对于那些仅在 bundle.js 的 `$(function(){…})` 内部定义、在工具的同步内联脚本解析时尚不可用的对象，一个空操作（no-op）`Proxy` 可避免过早抛出异常。
- **用 try/catch 包裹 jsCallbacks** —— 某个回调如果其依赖在独立模式下未被加载，也不会破坏整个页面。
- **注入该模块的 JS/CSS `ressources`** —— 核心的 `bundle.js` 只包含 MelisCore 的工具；模块工具自带其专属文件（例如 `news.tool.js` → `window.initNewsList`）。控制器会收集该工具所需的每一个根：其自身的插件根、通过 `type` 链接到达的根（递归遍历，带环路守卫）、`forward` 模块节点，以及为已知的组合式编辑器（例如 `meliscms_page`）额外提供的几个根，全部经过门控，使得未激活的模块不加载任何内容。
- **head 与 body 尾部的 JS 顺序** —— 平台 JS 在 `<head>` 中加载；模块 `ressources` 在 `<body>` 内、选项卡条之后但在工具 HTML 之前加载，与经典后台保持一致。
- **编辑器选项卡外壳** —— 包含经典的选项卡锚点（隐藏的 `#melis-id-nav-bar-tabs`、`#melis-id-body-content-load`、全局 `activeTabId`），以便经典的编辑流程能正常工作。
- **`<base href="/">`** —— 使工具中的相对 AJAX URL 从站点根目录解析。
- **模态框挂载点 `#melis-modals-container`** —— 外加一个用于处理游离背景遮罩的自愈观察器。
- **导出修复** —— 将 `melisCoreTool.exportData()` 重新绑定到 frame 内的锚点点击（旧版的 `window.open` 弹窗在沙箱化 iframe 中永远无法完成下载）。
- **工具选项卡桥接与工具结果 postMessage** —— 隐藏的选项卡条通过 `postMessage({ __melisToolTabs, … })` 镜像到宿主；在一次 JSON 保存之后会发送一条 `{ __melisToolResult, url, data }` 消息，以便宿主能在结构上做出响应。不桥接任何可见通知 —— 旧版工具保留它们自己的原生反馈。

## 平台资源 —— `PlatformAssetsService`

`PlatformAssetsService::build($sm)` 返回 `['css' => …, 'js' => …, 'inline' => …]`，即每个工具 iframe 启动时所需的平台资源列表：

- **CSS** —— 所有模块的 `bundle.css` 文件（并行加载），并在前面加上 Google Fonts 和 `/assets/css/schemes.css`，过滤为磁盘上确实存在的文件。
- **JS 队列**（顺序很重要）—— `get-translations?locale=…`、`MelisCore/build/js/bundle.js`，然后是未打包的附加项：`melisDataTable.js`、`loader.js`、`findpage.tool.js`、`bootstrap-tagsinput.js`、`typeahead.bundle.js`、`moment/fr.js`、`melis_tinymce.js`。
- **内联全局变量** —— `basePath`、`primaryColor`、……从活动的平台方案（`MelisCorePlatformSchemeService`）中读取，并以 Melis 默认颜色作为回退。
- **资源包缓存 / 自愈** —— 开销较大的 `MelisAssetManagerWebPack->getAssets(true)` 调用会被缓存（临时文件，600 秒 TTL + 进程内记忆化）；如果 `etc/bundles/` 被 Modules 工具清空了，它会在单写入者锁下重新生成，或者将拼接路由切换为 `/melis/react-platform-bundle`。
- **`bust($url)`** —— 为本地资源 URL 追加 `?v=<mtime>`。

`LegacyWidgetCssService` 支撑着 `react-legacy-widget-css` 路由 —— 旧版后台 CSS 被作用域限定在 `.melis-legacy-widget` 之下，从而不会泄漏到 React 外壳上（供直接注入到 React DOM 中的非 iframe 旧版控件使用，例如仪表盘插件内容）。

## SPA 回退 —— `SpaController`

`SpaController::spaAction()` 为 `/melis-react` 及其每一个客户端深层链接提供 React 外壳：

- 通过 `$_SERVER['DOCUMENT_ROOT']` 解析 `index.html`，读取 `…/vendor/melisplatform/melis-core/public/ui-react/index.html`（React 构建产物位于 melis-core 的 `public/` 中，通过 `/MelisCore/ui-react/` 提供）。无论该模块位于磁盘上的哪个位置都能正常工作。
- 如果外壳缺失则返回 `404`；否则以 `text/html; charset=utf-8` 返回该文件，并带上 `Cache-Control: no-cache, no-store, must-revalidate`（外壳从不缓存；被引用的资源则做了内容哈希）。
- 真实文件（根目录的 `index.html`、哈希化的资源）在启动时由 MelisAssetManager 更早地流式传输，因此只有虚拟的客户端路由（例如 `/melis-react/news/5`）才会落到这里。

`meliscore-melis-react-spa` 正则路由（`priority => 1000`）会胜过 MelisFront 的通配前台路由。它的正则 `'/melis-react(?<spa>/[a-zA-Z0-9_\-/~.]*)?'` 包含了 `~`（组合 id 分隔符）和 `.`，因此在整页刷新时这些深层链接也能解析到 SPA。

## 扩展点 —— `toolpage_extensions` 钩子

与特定工具相关的怪异处理逻辑存在于其**所属**模块中，而不是硬编码在这里。模块在 `config('melis_react_override')['toolpage_extensions'][]` 下注册一个服务名称，并实现 `MelisReactOverride\Controller\PluginViewToolPageExtensionInterface`：

```php
interface PluginViewToolPageExtensionInterface
{
    // Adjust the rendered zone HTML for a melisKey before assembly (return $html unchanged
    // for keys the extension doesn't care about).
    public function adjustToolHtml(string $key, string $html, array $jsCallBacks, PluginViewController $controller): string;

    // Adjust the platform asset bundle. Return ['assets' => array, 'skipJsRoots' => array<string, true>];
    // 'skipJsRoots' lists roots the extension already injected so the generic loop must NOT re-add them.
    public function adjustToolAssets(string $key, string $html, array $assets, PluginViewController $controller): array;
}
```

`PluginViewController::toolPageExtensions()` 会解析已注册的名称，对那些不是已注册服务或未实现该接口的名称**静默跳过**（因此扩展是完全可选的 —— 模块未安装 → 空操作），缓存该列表，并为每一个扩展调用 `adjustToolHtml()`（步骤 6）和 `adjustToolAssets()`（步骤 8）。

> **为何采用配置数组，而非控制器覆盖：** 来自不同模块的贡献只会简单地累加，与加载顺序无关（这与控制器别名不同，后者只有最后合并的模块才会胜出）。

**示例消费者。** MelisAICommunityExtensions 在 `melis_react_override.toolpage_extensions` 下注册了 `MelisAICommunityExtensions\Controller\React\PluginViewToolPageExtension`，以便将其 `tool.js` / `style.css` 注入到 React "Old"（旧版）视图中所提供的旧版工具页面里。

## 关键文件

| 关注点 | 路径 |
| --- | --- |
| 路由、控制器覆盖、`excluded_routes` | `config/module.config.php` |
| 模块启动 + 自动加载器 | `src/Module.php` |
| iframe 机制、仪表盘 action、扩展 | `src/Controller/PluginViewController.php` |
| SPA 外壳服务 | `src/Controller/SpaController.php` |
| `toolpage_extensions` 契约 | `src/Controller/PluginViewToolPageExtensionInterface.php` |
| 平台资源构建 + 资源包缓存 | `src/Service/PlatformAssetsService.php` |
| 作用域化的旧版后台 CSS | `src/Service/LegacyWidgetCssService.php` |

另请参阅：[melis-core](/legacy/reference/modules/melis-core)

> **无 UI，无截图。** MelisReactOverride 是没有自身界面的基础设施 —— 屏幕上显示的内容是它渲染的*旧版工具*，或它所提供的 *React 外壳*，二者均在各自的模块中记录。
