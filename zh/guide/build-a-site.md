# 构建网站（CMS）

Melis 首先是一个 **CMS**。本页介绍其内容模型——**站点**、**页面**、**模板** 和 **插件**——以及页面如何在前台渲染。这是你在编辑模板或构建站点模块之前需要建立的思维模型。

::: tip v6 — React 后台
Melis v6 保留了此处描述的框架、模块和数据模型。改变的是 **后台 UI**：它现在作为一个 **位于 `/melis-react` 的 React 应用** 运行。CMS 以原生 React 的 "brick" 工具形式提供——一个 **页面树侧边栏**，加上一个 **带标签页的页面编辑器** 以及一组侧边工具（站点、模板、样式、语言……）。唯一的例外是页面 **Edition（编辑）** 标签，它仍然 **在 iframe 中** 加载经典的拖放编辑器。每个侧边工具都带有 **New / Old（新 / 旧）** 切换开关，因此在需要时你可以切换回经典工具。下面介绍的概念保持不变；改变的只是 *你点击的位置*。
:::

## 内容模型

| 概念         | 含义 | 主要数据表 |
| ------------ | ---------- | ------------- |
| **Site（站点）**     | 一个网站。拥有一个主页、多种语言，以及每个环境下的一个或多个域名。 | `melis_cms_site`、`melis_cms_site_domain` |
| **Page（页面）**     | 站点页面树中的一个节点。拥有类型（站点/文件夹/页面）、模板和内容。 | `melis_cms_page_tree`、`melis_cms_page_published`、`melis_cms_page_saved` |
| **Template（模板）** | 页面所使用的布局——它指向某个站点模块的控制器/动作/视图。 | `melis_cms_template` |
| **SEO**      | 每个页面的 URL slug 和 meta 标签。 | `melis_cms_page_seo` |
| **Language（语言）** | 一个页面可以有相互关联的多个翻译版本。 | `melis_cms_lang`、`melis_cms_page_lang` |

这些数据表由 CMS 引擎 **MelisEngine** 拥有——它是页面/站点模型的唯一可信来源。React 后台仅通过引擎的服务和表网关（table gateway）读写这些表；它从不直接触及数据库架构。参见 [MelisEngine](/zh/reference/modules/melis-engine)。

### 页面是版本化的

每个页面存在两个版本：

- **Saved（草稿，`melis_cms_page_saved`）**——你在后台编辑的工作草稿。
- **Published（已发布，`melis_cms_page_published`）**——在前台对外提供的线上版本。

你编辑草稿，然后在准备就绪时 **发布（publish）**。页面的可编辑内容（见下文的 *zones（区域）* 和 *plugins（插件）*）存储在页面记录上。

## 模板

**模板**（`melis_cms_template`）是页面与渲染它的代码之间的桥梁。对于常见的 `ZF2` 模板类型，它存储：

- `tpl_zf2_website_folder`——**站点模块**（例如 `MelisDemoCms`），
- `tpl_zf2_controller`、`tpl_zf2_action`——由哪个控制器/动作来渲染该页面，
- `tpl_zf2_layout`——用于包裹页面的布局。

所以一个页面 → 引用一个模板 → 该模板路由到某个站点模块内的一个 `.phtml` 视图。

在 React 后台中，你在 **Templates（模板）** 侧边工具里管理模板（见 § *创建新站点*）——这是一个用于设置名称、类型、站点、布局、控制器和动作的原生 React 列表和表单。

## 可编辑内容：zones（区域）与 plugins（插件）

模板通过 **视图助手（view helpers）** 暴露两种可编辑区域：

### `MelisTag` — 简单的可编辑区域

一个具名的 HTML/文本/媒体区域，编辑者可在后台就地（使用 TinyMCE）编辑：

```php
<?= $this->MelisTag($this->idPage, 'home-html-1', 'html', '<h1>Default heading</h1>') ?>
```

在编辑者覆盖它之前会显示默认内容；保存的值存储在页面上。助手：`vendor/melisplatform/melis-front/src/View/Helper/MelisTagsHelper.php`。

### `MelisDragDropZone` — 模板插件

一个投放区域（drop zone），编辑者可将 **模板插件** 拖入其中——即可复用的内容块（一个 slider、一个新闻列表、一个联系表单）：

```php
<?= $this->MelisDragDropZone($this->idPage, 'dragdropzone_home_1') ?>
```

助手：`vendor/melisplatform/melis-front/src/View/Helper/MelisDragDropZoneHelper.php`。

模板插件继承 `MelisEngine\Controller\Plugin\MelisTemplatingPlugin` 并实现：

- **`front()`**——返回在线上站点渲染的数据/视图，
- **`back()`**——在后台编辑器中显示的配置表单。

`MelisCmsSlider` 和 `MelisCmsNews` 是很好的参考插件；使用 **MelisTemplatingPluginCreator** 来脚手架生成你自己的插件。编辑者在页面编辑器的 **Edition（编辑）** 标签中投放这些内容块——见下文。

## 页面如何在前台渲染

前台由 **MelisFront**（负责展示站点的引擎）在 **MelisEngine**（页面/数据服务）之上提供服务。这一渲染过程完全在服务器端进行，在 v6 中保持不变——React 后台仅 *承载（host）* 可编辑的预览，它不会在浏览器中重新渲染页面。大致流程如下：

1. vhost 设置 **`MELIS_MODULE`** → 选择要提供服务的 **站点模块**。
2. 类似 `…/id/5` 的 URL 解析到 **页面 id 5**（路由定义在 `vendor/melisplatform/melis-front/config/module.config.php`）。SEO URL 同样映射到页面 id。
3. **MelisEngine** 加载页面及其模板（`vendor/melisplatform/melis-engine/src/Service/MelisPageService.php`）。
4. 模板的 `ZF2` 控制器/动作渲染站点模块的 `.phtml` 视图。
5. `MelisTag` 区域和 `MelisDragDropZone` 插件由页面的已发布内容填充。
6. 结果被包裹在站点布局中。

::: tip 编辑 / 预览模式
同一个页面可以通过不同模式请求：`…/id/5`（线上）、`…/id/5/preview`（已保存的草稿）、`…/id/5/renderMode/melis`（后台内编辑——这正是 Edition iframe 所显示的内容）。
:::

## 站点模块剖析

**站点模块** 是一个普通的 Laminas 模块，用于存放一个网站的模板、视图和资源。参考示例是 `vendor/melisplatform/melis-demo-cms/`（参见 [MelisDemoCms](/zh/reference/modules/melis-demo-cms)）；自定义站点通常位于 `module/MelisSites/<YourSite>/` 之下：

```
MelisDemoCms/
├── config/
│   ├── module.load.php           # modules this site needs (MelisEngine, MelisFront, plugins…)
│   ├── module.config.php         # routes / controllers / services
│   ├── assets.config.php         # front-office CSS & JS
│   └── melis.plugins.config.php  # templating plugins available to templates
├── src/Controller/               # Home, Contact… (render the template views)
├── view/
│   ├── layout/                   # site layouts
│   └── melis-demo-cms/home/index.phtml   # a page template (uses MelisTag / MelisDragDropZone)
└── public/                       # css / js / images
```

## 在 React 后台中工作

在 v6 中，你从位于 `/melis-react` 的 **React 后台** 构建站点。打开左侧边栏中的 **MelisCms** 部分：它显示 **页面树** 面板（你的站点及其页面），以及一个 **Site Tools（站点工具）** 分组。

![React 侧边栏中的 MelisCms 部分——页面树加上 Site Tools。](/screenshots/react/melis-cms/meliscms-menu-entry.png)

### 页面树

页面树是你所有站点及其中每个页面的地图。它位于 **左侧边栏**，因此在你工作时始终可见。点击某个页面可在编辑器中打开它；输入名称可进行搜索；右键点击某个节点可添加子页面、查看详情、复制、移动或删除它。你也可以通过拖放来移动页面（服务器端权限决定你可以移动哪些内容）。

![React 页面树——站点和页面；点击打开，右键查看操作。](/screenshots/react/melis-cms/meliscms-menu-site-treeview.png)

### 页面编辑器——为页面添加内容

打开一个页面会显示编辑器：一个 **原生 React 外壳（chrome）**（页面标题 + 状态、操作按钮、标签栏）围绕着当前标签的内容。标签为 **Properties（属性）· Edition（编辑）· SEO · Languages（语言）**（外加其他模块贡献的标签——Historic（历史）、Analytics（分析）、Scripts（脚本）……）。操作按钮包括 **Save（保存）**、**Publish（发布）**、**See（查看，预览 / 在线查看）**、**Duplicate（复制）**、**Erase draft（清除草稿）** 和 **Delete（删除）**。

- **Properties（属性）** *(原生 React)*——页面名称、类型（Page / Folder / Site，即页面 / 文件夹 / 站点）、模板（布局）、语言、菜单显示、样式和分类法（taxonomy）。

  ![React 的 Properties 标签。](/screenshots/react/melis-cms/meliscms-page-tab-properties.png)

- **Edition（编辑）** *(iframe 中的经典编辑器)*——填充页面。它实时渲染，你可以将 **内容块（插件）拖入** 模板的区域（即 `MelisDragDropZone` 区域）。此标签是加载在 React 外壳内的经典拖放编辑器，因此插件面板、投放区布局和富文本编辑器与之前完全一致。

  ![Edition 标签——带拖放叠加层的实时页面，位于 React 外壳内。](/screenshots/react/melis-cms/meliscms-page-tab-edition.png)

  ![插件面板——你可以拖放到页面上的内容块。](/screenshots/react/melis-cms/meliscms-page-tab-edition-menu-templating-plugins.png)

- **SEO** *(原生 React)*——友好 URL、meta 标题/描述和重定向字段。
- **Languages（语言）** *(原生 React)*——创建和管理页面的语言版本。

**Save 与 Publish 的区别。** *Save*（保存）写入草稿（Properties + SEO + 拖放内容，在一次操作中全部完成）；*See → Preview*（查看 → 预览）显示草稿；*Publish*（发布）使当前草稿上线；*Erase draft*（清除草稿）恢复到已发布版本。经验法则：自由编辑，随手 **Save**，用 **Preview** 检查，然后 **Publish**。

### 标准内容块

你在 Edition 标签中拖放到页面上的内容块来自 **MelisFront**。最常见的有：一个 **HTML (Text)（HTML 文本）** 块和一个 **Media（媒体）** 块（两者都是 **就地** 编辑的），以及通过一个小型 **Properties（属性）** 模态框设置的配置块——**Menu（菜单）**、**Breadcrumb（面包屑）**、**List-from-folder（文件夹列表）** 和 **GDPR banner（GDPR 横幅）**。完整目录参见 [MelisFront](/zh/reference/modules/melis-front)。

![一个就地编辑的 HTML (Text) 块，页面上带有所见即所得（WYSIWYG）工具栏。](/screenshots/react/melis-front/melisfront-page-plugin-html-tag.png)

## 创建新站点（概览）

从高层来看：

1. **在后台创建站点**——侧边栏 → **Site Tools → Sites → + New site（新建站点）**，然后进入 **5 步向导**（Multilingual（多语言）→ Languages（语言）→ Domains（域名）→ Module（模块）→ Summary（摘要）），它会创建该站点及其主页。

   ![React 的 Sites 工具——每一行都是一个完整的网站，带有 "+ New site"。](/screenshots/react/melis-cms/meliscms-tool-sites-list.png)

2. **在 `module/MelisSites/<YourSite>/` 下提供一个站点模块**（控制器 + `.phtml` 模板 + 资源）。
3. **声明模板**（`melis_cms_template`），指向你模块的控制器/动作——Site Tools → **Templates（模板）**。
4. **构建页面树** 并分配模板；在你的视图中添加 `MelisTag`/`MelisDragDropZone`。
5. **将 vhost 指向** `public/`，并设置 `SetEnv MELIS_MODULE "<YourSite>"`（参见 [安装](/zh/guide/getting-started)）。
6. **发布** 并浏览前台。

站点创建后，从 Sites 工具中打开它，即可通过原生 React 标签进行管理：**Properties（属性）· Module Loading（模块加载）· Domains（域名）· Languages（语言）· Site Config（站点配置）· Translations（翻译）· Scripts（脚本）**。**Module Loading（模块加载）** 标签是你为某个特定站点开启某项功能的地方（支持拖拽重排加载顺序）。

> 先从头到尾通读 `vendor/melisplatform/melis-demo-cms/`——它是本页每个概念的规范、可运行的示例。

## 关键文件

| 关注点 | 路径 |
| --- | --- |
| CMS 服务（页面/站点） | `vendor/melisplatform/melis-cms/src/Service/` |
| React CMS bricks（页面编辑器 + 侧边工具） | `vendor/melisplatform/melis-cms/ui-react/src/` |
| 页面服务（引擎） | `vendor/melisplatform/melis-engine/src/Service/MelisPageService.php` |
| 前台渲染 | `vendor/melisplatform/melis-front/` |
| 可编辑区域助手 | `vendor/melisplatform/melis-front/src/View/Helper/` |
| 模板插件基类 | `vendor/melisplatform/melis-engine/src/Controller/Plugin/MelisTemplatingPlugin.php` |
| 参考演示站点 | `vendor/melisplatform/melis-demo-cms/` |

> 拥有该界面的 React 模块——[MelisCms](/zh/reference/modules/melis-cms)、[MelisFront](/zh/reference/modules/melis-front) 和 [MelisEngine](/zh/reference/modules/melis-engine)——完整记录了这些工具、插件和数据模型。
