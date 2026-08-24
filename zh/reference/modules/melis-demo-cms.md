# MelisDemoCms

> Melis Platform 官方参考/演示网站——一个开箱即安装的 **站点模块（site module）**，
> 用于向开发者讲解 Melis 前台站点是如何连接组织起来的。软件包 `melisplatform/melis-demo-cms`。

## 用途

`MelisDemoCms` 是一个完整、可安装的前台网站（`melis-site: true`、
`type: melisplatform-module`、类别 `cms`）。它 **不是后台工具**：其页面、
控制器和插件模板演示了三种内容组合技术——**手动放置插件**、
**拖放区域** 以及 **内联可编辑标签**——并借助 MelisFront、
MelisEngine 和 CMS 内容模块（slider、news、prospects）实现。在[构建站点](/zh/guide/build-a-site)时，
可将它作为参考实现。

![MelisDemoCms 前台首页实况——顶部导航（News / Team / Our Services / Our Process / FAQ / Contact），以及带有 "Try to Free" 行动号召按钮、叠加在仪表盘主视觉图上的 "Melis Demo Cms" 主横幅。这是由服务器渲染的演示网站，而非 React 后台界面。](/screenshots/react/melis-demo-cms/melisdemocms-site.png)

## 它没有 React 后台

Melis v6 引入了 React 后台，但 `MelisDemoCms` 是一个 **前台站点**，而非
后台工具，因此它被刻意地 **不迁移到 React**：

- 没有 `ui-react/` brick 项目，没有 `public/ui-react/brick.manifest.json`；
- 没有 `config/react-api.php` 端点，也没有 `config/react.capabilities.php` 能力声明；
- 在 `/melis-react` 中没有侧边栏条目，也没有菜单节点。

你永远不会在 React 外壳中查找名为 "MelisDemoCms" 的工具。该演示站点是 **由通用
React CMS 工具操作的内容**，每当访客浏览该域名时，实况站点便由
MelisFront/MelisEngine **在服务器端渲染**。

### 如何在 `/melis-react` 中操作它

由于该模块没有自己的工具，你需要使用通用的 React CMS 工具来编辑它：

| React 工具 | 你在此处用它做什么 |
| --- | --- |
| **CMS 页面编辑器** | 从 **CMS Pages** 树中打开任意演示页面（Home、News、Team、FAQ、Contact 等），并编辑其内联块、拖放区域和插件。这是主要的编辑界面。 |
| **Media** | 管理页面所引用的图片/文件。 |
| **Sites** | 演示站点的域名/语言设置。 |
| **Templates** | CMS 页面所使用的页面模板。 |

> **位置：** 侧边栏 → **CMS Pages** → 在编辑器中打开某个演示站点页面。侧边栏中没有
> "MelisDemoCms" 条目——该模块是 *内容*，而非工具。

## 启用它

`MelisDemoCms` 是一个 Laminas 站点模块，由 Composer 的 `installer-paths` 安装到
`module/MelisSites/MelisDemoCms/` 下。其自身的 `config/module.load.php` 声明了它期望与之
一同加载的模块：

```php
// vendor/melisplatform/melis-demo-cms/config/module.load.php
'MelisAssetManager', 'MelisEngine', 'MelisFront',
'MelisCmsNews', 'MelisCmsSlider', 'MelisCmsProspects',
'MelisDemoCms', 'MelisCmsPageScriptEditor'
```

必需的 Composer 依赖：`melis-cms`、`melis-cms-slider`、`melis-cms-prospects`、
`melis-cms-news`、`melis-cms-page-script-editor`（`^6.0`）。`melis-engine` 和 `melis-front` 为
建议依赖（且在运行时必需）。通过设置 vhost 环境变量
`MELIS_MODULE "MelisDemoCms"`，即可为某个域名激活该站点。

## 关键服务

| 服务别名 | 作用 |
| --- | --- |
| `DemoCmsService` | 供前台控制器和安装监听器使用的站点专用辅助方法。 |
| `MelisPlatformTable` | 核心平台表（`MelisEngine\Model\Tables\MelisGenericTable`，主键 `plf_id`）之上的通用表网关。 |

## 站点安装（安装程序，而非 React）

该模块不添加任何后台工具树条目。它唯一的后台界面是供市场/安装程序使用的 **站点安装
向导**：控制器
`MelisDemoCms\Controller\MelisSetupController`（路由 `/MelisDemoCms/setup`）、
`MelisSetupPostDownloadController` 和 `MelisSetupPostUpdateController`。安装配置位于
`config/setup/download.config.php` 和 `config/setup/update.config.php` 中。这是后端 / CLI
层面的事务，没有 React 界面。

## 前台

该站点由普通的 MelisFront 站点控制器驱动，每种页面类型对应一个控制器：

| 控制器 | 页面 |
| --- | --- |
| `MelisDemoCms\Controller\Home` | 首页（轮播 + 次级 slider、客户评价、GDPR 横幅） |
| `MelisDemoCms\Controller\News` | 新闻列表 / 新闻详情 |
| `MelisDemoCms\Controller\Team` | 团队 |
| `MelisDemoCms\Controller\Services` | 服务列表 / 详情 |
| `MelisDemoCms\Controller\Faq` | FAQ 列表和类别块 |
| `MelisDemoCms\Controller\Contact` | 联系 / 潜在客户表单 |
| `MelisDemoCms\Controller\Testimonial` | 客户评价 |
| `MelisDemoCms\Controller\Template` / `DragDrop` | 模板演示（静态 / 拖放 / 混合） |
| `MelisDemoCms\Controller\Search` | 站内搜索结果（Lucene；在演示中已禁用） |
| `MelisDemoCms\Controller\Page404` | 404 错误页面 |

`MelisDemoCms` 并不自带插件，而是提供 **插件模板覆盖**
（`view/plugins/*.phtml`），并在 `config/melis.plugins.config.php` 中进行连接：

| 模板化插件（所属模块） | 本站点提供的模板 |
| --- | --- |
| `MelisFrontMenuPlugin`（MelisFront） | `menu`、`white-menu`、`footer-menu` |
| `MelisFrontShowListFromFolderPlugin`（MelisFront） | `faq-listing`、`faq-values`、`home-testimonial-slider` |
| `MelisFrontGdprBannerPlugin`（MelisFront） | `gdpr-banner` |
| `MelisCmsSliderShowSliderPlugin`（MelisCmsSlider） | `home-carousel-slider`、`home-slider2`、`team-slider` |
| `MelisCmsNewsListNewsPlugin` / `…ShowNewsPlugin` / `…LatestNewsPlugin`（MelisCmsNews） | `news-list`、`news-details`、`latest-news-vertical`、`latest-news-horizontal` |
| `MelisCmsProspectsShowFormPlugin`（MelisCmsProspects） | `prospect-form` |

### 三种内容组合技术

| 技术 | 工作原理 | 示例页面 |
| --- | --- | --- |
| **手动放置** | 在控制器中实例化插件，带参数渲染，并作为视图子项添加——视图将其回显。 | Home、Team（slider）、News、FAQ、Contact |
| **拖放区域** | `.phtml` 声明一个命名区域；React CMS 页面编辑器可将任意插件拖入其中；无需控制器代码。 | DragDrop、模板展示页 |
| **内联可编辑标签** | `MelisTag` 在视图中包裹一个默认值；作者可在 React 页面编辑器中就地编辑文案/图片。 | Services、Testimonial、404 |

### 监听器

`SetupDemoCmsListener` 驱动站点安装流程。
`MelisDemoCmsCreateConfigListener` 在市场安装后依据 `.config.stub` 写出
`MelisDemoCms.config.php`。`SiteMenuCustomizationListener` 自定义前台菜单。
`LatestNewsHorizontalListener` 调整最新新闻插件的输出。

## 数据库

`MelisDemoCms` 不定义任何自己的 `melis_*` 表。`MelisPlatformTable` 读取核心
`melis_core_platform` 表。所有演示内容（页面、模板、slider、新闻、配置键）均在安装时
由安装监听器创建，并以 `config/MelisDemoCms.config.php` 中的取值为键，例如
`home_page_id`、`news_page_id` 和 `home_page_slider_1_id`。

## 示例

前台控制器通过注入站点专用的模板路径和由配置驱动的 ID 来渲染模板化插件——这是整个
站点通用的模式（`HomeController`）：

```php
$cfg = $this->getServiceManager()->get('MelisSiteConfigService');

$slider = $this->MelisCmsSliderShowSliderPlugin();
$homeSlider1 = $slider->render([
    'template_path' => 'MelisDemoCms/plugins/home-carousel-slider',
    'id'            => 'homeSlider1',
    'pageId'        => $this->idPage,
    'sliderId'      => $cfg->getSiteConfigByKey('home_page_slider_1_id', $this->idPage),
]);
$this->view->addChild($homeSlider1, 'homeSlider1');
// view: <?= $this->homeSlider1 ?>
```

拖放区域只需在视图中调用一次——无需控制器代码（该块由 React CMS 页面编辑器填充）：

```php
<?= $this->MelisDragDropZone($this->idPage, 'dragdropzone_home_1') ?>
```

带默认值的内联可编辑标签（可在 React 页面编辑器中就地编辑）：

```php
<?= $this->MelisTag($this->idPage, 'static-html-1', 'html', '<h1>Accessible…</h1>') ?>
```

## 关键文件

| 关注点 | 路径（位于 `vendor/melisplatform/melis-demo-cms/` 下） |
| --- | --- |
| 路由、控制器、模板映射 | `config/module.config.php` |
| 随站点一同加载的模块 | `config/module.load.php` |
| 插件模板覆盖的连接配置 | `config/melis.plugins.config.php` |
| 每站点配置键（页面 / slider / 文件夹 ID） | `config/MelisDemoCms.config.php`、`…config.stub` |
| 站点安装流程 | `config/setup/download.config.php`、`config/setup/update.config.php` |
| 引导启动与监听器注册 | `src/Module.php` |
| 站点辅助服务 | `src/Service/DemoCmsService.php` |
| 安装与安装后控制器 | `src/Controller/MelisSetupController.php`、`…PostDownloadController.php`、`…PostUpdateController.php` |
| 安装 / 菜单 / 新闻监听器 | `src/Listener/` |
| 插件模板 | `view/plugins/*.phtml` |
| 页面视图 | `view/melis-demo-cms/*/*.phtml` |
| 模板演示 | `view/melis-demo-cms/template/` |

另请参阅：[模块参考](/zh/reference/modules)、[构建站点](/zh/guide/build-a-site)、
[插件](/zh/guide/plugins)。
