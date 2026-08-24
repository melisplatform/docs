# MelisFront

> 前台渲染系统，将 URL 转换为完整的公开页面，并交付作者在 React 后台拖放到页面上的内容块（页面插件）。软件包 `melisplatform/melis-front`。

## 用途

MelisFront 是运行时组件，负责将网址解析为对应的 Melis 页面，运行渲染流水线（路由、SEO、模板化插件、布局、缓存、资源压缩），并向访问者交付 HTML 响应。它还驱动**实时可编辑预览**：以 `melis` 模式重新渲染任意页面。MelisFront 自身不拥有任何数据库表——所有页面/站点/模板/SEO 数据都从 [melis-engine](/zh/reference/modules/melis-engine) 读取，后者是唯一的数据来源。

MelisFront 是紧密耦合三件套之一：[melis-engine](/zh/reference/modules/melis-engine)（数据层）、**melis-front**（前台渲染）、[melis-cms](/zh/reference/modules/melis-cms)（后台编辑器）。对其中任意一个进行改动，通常都会牵涉到另外两个。

## 在 React 后台中

MelisFront **没有独立的 React 工具**：没有 `ui-react/` brick，没有 `brick.manifest.json`，也没有 `react-api.php`——它从不出现在 `/melis-react` 左侧边栏中。它在后台的全部呈现，就是你在 **MelisCms 页面编辑器**中配置的那套**页面插件（内容块）**。

当你编辑页面时就会接触到 MelisFront：**MelisCms → 打开某个页面 → Edition（编辑）标签页**。该 Edition 标签页就是经典的拖放式页面编辑器，**在 React 外壳内的 iframe 中渲染**（`/melis/react-tool-page?key=meliscms_page`）。在其中，你把 MelisFront 的内容块拖到区域上，并打开它们的 **Properties（属性）**模态框。React 仅仅*承载*这个旧版编辑器；MelisFront 本身并不提供任何 React 组件。

内容块有两类：

- **标签块（Tag blocks）**，直接在页面上**原地编辑**——**HTML**（富文本）和 **Media**（图片/文件）。无模态框。
- **配置块（Config blocks）**，通过 **Properties（属性）**模态框进行设置——**Menu（菜单）**、**Breadcrumb（面包屑）**、**List-from-folder（文件夹列表）**、**GDPR banner（GDPR 横幅）**。它们根据页面树 / 站点配置生成内容。

## 启用

添加到 `config/melis.module.load.php`：

```php
return [
    'MelisFront',
];
```

声明的 Melis 依赖：`melisplatform/melis-core`。在运行时它还会调用 MelisEngine 服务。加载顺序：`melis-core` → **melis-front** → `melis-engine` → `melis-cms`。

## 标签块——原地编辑

### HTML（文本）

主力内容块：用于标题、段落、链接和格式化内容的**富文本区域**（TinyMCE）。**直接在页面上**编辑，没有 Properties 模态框。插件类 `MelisFrontTagHtmlPlugin`。

![页面编辑器中的 HTML/文本块，带完整 TinyMCE 工具栏](/screenshots/react/melis-front/melisfront-page-plugin-html-tag.png)

### Media（媒体）

从媒体库放置**图片或文件**。同样通过一个紧凑工具栏原地编辑，带有 "Add media content here"（在此添加媒体内容）占位符。插件类 `MelisFrontTagMediaPlugin`。

![带 Add media content here 占位符的原地媒体块](/screenshots/react/melis-front/melisfront-page-plugin-media-tag.png)

## 配置块——Properties 模态框

配置块通过平台渲染的一个小型 **Properties（属性）**模态框进行设置。两个反复出现的字段是：**Template（模板）**下拉框（`MelisEnginePluginTemplateSelect`，字段 `template_path`），用于选择 `.phtml` 视图；以及一个**页面选择器**（`MelisText`，带一个 `fa fa-sitemap` 按钮），用于在页面树中设置起始/父页面。每个配置块都在 `config/plugins/<Plugin>.config.php` 中将其模态框声明为一个 `melis.modal_form`（Laminas 表单规范）；不存在按插件划分的 React 组件。

### Menu（菜单）

**根据页面树自动构建导航菜单**。模态框字段：**Template（模板）**和 **Starting page（起始页面）**。插件 `MelisFrontMenuPlugin`（字段 `pageIdRootMenu`）。

![带 Template 和 Starting page 字段的菜单块 Properties 模态框](/screenshots/react/melis-front/melisfront-page-plugin-menu-config-properties.png)

### Breadcrumb（面包屑）

渲染"您所在位置"的路径（Home › Section › Page）。模态框字段：**Template（模板）**（默认 `MelisFront/breadcrumb`）和 **Starting page（起始页面）**。插件 `MelisFrontBreadcrumbPlugin`（字段 `pageIdRootBreadcrumb`）。

![带 Template 和 Starting page 字段的面包屑块 Properties 模态框](/screenshots/react/melis-front/melisfront-page-plugin-breadcrumb-config-properties.png)

### List-from-folder（文件夹列表）

获取**页面树中的一个文件夹并自动列出其子页面**。模态框字段：**Template（模板）**（每一项如何渲染）和 **Parent page（父页面）**（源文件夹）。插件 `MelisFrontShowListFromFolderPlugin`（字段 `pageIdFolder`）。

![带 Template 和 Parent page 字段的文件夹列表 Properties 模态框](/screenshots/react/melis-front/melisfront-page-plugin-folderlisting-config-properties.png)

### GDPR banner（GDPR 横幅）

在公开站点上显示的 **cookie/同意横幅**。它的模态框只需要 **Template（模板）**；文案来自站点的 GDPR 文本。插件 `MelisFrontGdprBannerPlugin`。

![只有单个 Template 字段的 GDPR 横幅 Properties 模态框](/screenshots/react/melis-front/melisfront-page-plugin-gdprbanner-config-properties.png)

### 配置模态框字段

| 插件 | 模态框字段（名称 / 类型） | 默认模板 |
| --- | --- | --- |
| Breadcrumb | `template_path`（`MelisEnginePluginTemplateSelect`）· `pageIdRootBreadcrumb`（`MelisText`，sitemap） | `MelisFront/breadcrumb` |
| Menu | `template_path` · `pageIdRootMenu`（`MelisText`，sitemap） | `MelisFront/menu` |
| List-from-folder | `template_path` · `pageIdFolder`（`MelisText`，sitemap） | `MelisFront/show-list-from-folder` |
| GDPR banner | 仅 `template_path` | `MelisFront/gdpr-banner` |

**Apply（应用）**会将这些值通过拖放层回传，由该层将其持久化到页面的会话 XML 中。React 不参与这次往返；插件 UI 完全是 Edition iframe 内的旧版 PHP/JS。

## 关键服务

| 服务别名 | 作用 |
| --- | --- |
| `MelisFrontHead` | 管理页面的 `<title>`、meta description、canonical，并注入插件的 CSS/JS 资源。 |
| `MelisSiteConfigService` | 按 key、页面或语言读取各站点配置——文件 + 数据库合并。 |
| `MelisSiteTranslationService` | 各站点翻译 key/文本的查询与增删改查，按站点缓存。 |
| `MelisTranslationService` | 模块/区域设置翻译（后台字符串），带缓存。 |
| `MinifyAssets` | 使用 `matthiasmullie/minify` 为每个站点构建 `bundle.css` / `bundle.js`。 |
| `MelisFrontNavigation` | 导航工厂，从引擎的页面树构建 `Laminas\Navigation` 树。 |

## 前台渲染

### 路由

主前台路由是一个匹配 `.../id/{idpage}` 的正则模式，分发到 `MelisFront\Controller\Index::index`。子路由：`/renderMode/melis`（MelisCms 使用的后台编辑模式）和 `/preview`（已保存版本的预览）。特殊路由：`sitemap(.xml)`、`/css/plugin-width.css`、`/melissearchindex/…`、`/melispluginrenderer`（AJAX 单插件渲染）、`/minify-assets`。

### 渲染流水线（监听器）

在 `src/Module.php` 中跨 `EVENT_DISPATCH` 和 `EVENT_FINISH` 连接（共约 19 个监听器）：

| 阶段 | 监听器 |
| --- | --- |
| `EVENT_LOAD_MODULES_POST` | `MelisFrontSEORouteListener`、`MelisFrontSiteConfigListener`、`MelisFrontMiniTemplateConfigListener` |
| `EVENT_DISPATCH` | `MelisFrontXSSParameterListener`、`MelisFrontHomePageRoutingListener` / `…HomePageIdOverrideListener`、`MelisFrontSEODispatchRouterRegularUrlListener`（页面校验、404/301，触发 `melisfront_site_dispatch_ready`）、`MelisFront404To301Listener`、`MelisFront404CatcherListener` |
| `EVENT_FINISH` | `MelisFrontPluginsToLayoutListener`（插件 CSS/JS）、`MelisFrontSEOMetaPageListener`（title/description/canonical）、`MelisFrontAttachCssListener`（页面 CSS）、`MelisFrontLayoutListener`（前台布局，或在 `melis` 模式下为 BO 布局 + TinyMCE）、`MelisFrontPageCacheListener`、`MelisFrontMinifiedAssetsCheckerListener` |

### 模板化插件（控制器插件）

全部继承 `MelisEngine\Controller\Plugin\MelisTemplatingPlugin`，注册在 `controller_plugins` 下。在 React 编辑器中呈现的内容块是其中的一个子集：

| 插件别名 | 内容块 |
| --- | --- |
| `MelisFrontTagHtmlPlugin` | 可原地编辑的 HTML / 富文本区域。 |
| `MelisFrontTagTextareaPlugin` | 纯文本区域。 |
| `MelisFrontTagMediaPlugin` | 来自媒体库的图片 / 文件。 |
| `MelisFrontMenuPlugin` | 由页面树构建的导航菜单。 |
| `MelisFrontBreadcrumbPlugin` | 面包屑路径（Home › … › 当前页面）。 |
| `MelisFrontShowListFromFolderPlugin` | 自动列出所选文件夹下的子页面。 |
| `MelisFrontDragDropZonePlugin` | 布局容器（供其他插件放置的拖放区域）。 |
| `MelisFrontBlockSectionPlugin` | 可复用的块/区段容器。 |
| `MelisFrontGenericContentPlugin` | 通用内容块。 |
| `MelisFrontGdprBannerPlugin` | Cookie / GDPR 同意横幅。 |
| `MelisFrontGdprRevalidationPlugin` | 当 GDPR 政策变更时重新征求同意。 |
| `MelisFrontSearchResultsPlugin` | 渲染站内搜索结果。 |
| `MiniTemplatePlugin` | 一键插入预构建的迷你模板。 |

### 插件渲染器控制器

`MelisFront\Controller\MelisPluginRendererController` 按需重新渲染单个插件——当你放置或编辑一个内容块时，Edition iframe 调用的正是它：

- `getPluginAction()`（路由 `/melispluginrenderer`）——单个插件的 AJAX 渲染。
- `editPluginAction`、`dndLayoutAction`、`dndUpdateOrderAction`、`dndRemoveAction`——拖放及插件编辑流程。

### 视图助手

在站点的 `.phtml` 模板内使用（注册在 `view_helpers` 下）：

| 助手别名 | 用途 |
| --- | --- |
| `MelisTag` | 声明一个由编辑者原地填充的可编辑区域（HTML 或媒体）。 |
| `MelisLink` | 输出页面对 SEO 友好的 URL（页面移动后仍保持正确）。 |
| `MelisMenu` | 从页面树渲染导航菜单。 |
| `MelisDragDropZone` | 渲染承载其他插件的拖放区域。 |
| `siteTranslate` | 按 key 输出站点翻译字符串。 |
| `SiteConfig` | 读取一个站点配置值。 |

用于语言版本链接的语言/首页助手，以及首页链接助手同样可用。

### 导航

`MelisFrontNavigation`（`src/Navigation/Factory/`）扩展了 Laminas 导航工厂，从引擎的页面树（`MelisEnginePage` / `MelisEngineTree`）构建一个 `Laminas\Navigation` 对象，供 Menu 和 Breadcrumb 助手渲染。

### 资源压缩

`MinifyAssetsService`（基于 `matthiasmullie/minify`）为每个站点构建 `bundle.css` / `bundle.js`。当它们存在时，`MelisFrontMinifiedAssetsCheckerListener` 会注入它们（带缓存清除）。通过 `/minify-assets` 路由触发构建。

## 数据库表

MelisFront **不拥有任何数据库表**。所有页面、站点、语言、SEO 和翻译数据都归 [melis-engine](/zh/reference/modules/melis-engine) 和 [melis-cms](/zh/reference/modules/melis-cms) 所有。

## 示例

在站点 `.phtml` 模板中的典型用法及 PHP 服务调用：

```php
// Inside a site page template (.phtml)
<?= $this->MelisMenu($idPage); ?>                         // navigation menu from the page tree
<a href="<?= $this->MelisLink($targetPageId); ?>">…</a>  // SEO-friendly page link
<?= $this->MelisTag($idPage, 'zone_main', 'html'); ?>    // editable HTML zone
<?= $this->siteTranslate('btn_send'); ?>                  // site translation string
<?= $this->SiteConfig('contact_email'); ?>               // site config value
```

```php
// Reading site config and translations in PHP
$siteConfig = $serviceManager->get('MelisSiteConfigService');
$email = $siteConfig->getSiteConfigByKey('contact_email', $siteId);

$tr = $serviceManager->get('MelisSiteTranslationService')
        ->getEntryByTextAndSiteId('btn_send', $siteId, $langId);
```

```php
// Hooking the render pipeline (after page validation, before render)
$sharedEvents->attach('MelisFront', 'melisfront_site_dispatch_ready', function ($e) {
    $params = $e->getParams(); // page id, site, renderMode…
    // e.g. force a redirect, add data to the layout, A/B-test…
}, 50);
```

## 关键文件

| 关注点 | 路径 |
| --- | --- |
| 模块引导 + 监听器连接 | `vendor/melisplatform/melis-front/src/Module.php` |
| 路由、服务、插件、助手、缓存 | `vendor/melisplatform/melis-front/config/module.config.php` |
| 插件配置（前台默认值 + `melis.modal_form`） | `vendor/melisplatform/melis-front/config/plugins/` |
| 渲染流水线监听器 | `vendor/melisplatform/melis-front/src/Listener/` |
| 服务（Head、SiteConfig、Translations、Minify） | `vendor/melisplatform/melis-front/src/Service/` |
| 模板化插件（内容块） | `vendor/melisplatform/melis-front/src/Controller/Plugin/` |
| 插件渲染器控制器 | `vendor/melisplatform/melis-front/src/Controller/MelisPluginRendererController.php` |
| 视图助手 | `vendor/melisplatform/melis-front/src/View/Helper/` |
| 导航工厂 | `vendor/melisplatform/melis-front/src/Navigation/Factory/` |

另见：[melis-engine](/zh/reference/modules/melis-engine)、[melis-cms](/zh/reference/modules/melis-cms)、[melis-core](/zh/reference/modules/melis-core)
