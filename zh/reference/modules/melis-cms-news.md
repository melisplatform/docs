# MelisCmsNews

> 面向 Melis 站点的新闻 / 博客系统，包含一个 React 后台创作工具和三个前台展示插件。软件包 `melisplatform/melis-cms-news`。

## 用途

MelisCmsNews 在后台提供一个 **News**（新闻）工具，编辑人员可在此撰写和管理多语言新闻文章（标题、富文本段落、图片、文档、发布/取消发布排期以及 SEO）。文章通过三个开箱即用的模板插件展示在前台：最新新闻速览、分页新闻列表以及单篇文章详情页。SEO 友好的 URL 和逐篇文章的 meta 标签由专门的监听器自动处理。

在 Melis v6 中，该工具以**原生全 React 砖块（brick）**的形式随新后台（`/melis-react`）一起发布：一个用于列表和编辑文章的真正 React 界面，调用 `react-api` JSON 层，并带有一个 **New / Old**（新 / 旧）切换开关，可回退到 iframe 中的经典工具。框架、服务、事件、数据表和前台插件与 v5 相比均保持不变——仅有展示层是新的。

## 启用

在 `config/melis.module.load.php` 中添加：

```php
return [
    'MelisCmsNews',
];
```

需要 `melis-core`、`melis-engine`、`melis-front` 以及 `melis-cms`（`^5.2`），外加 `laminas/laminas-paginator`。当同时安装了 `MelisCmsSlider`、Melis 分类模块、`MelisCmsTags`、`MelisCmsUserAccount`（作者）或 `MelisCmsComments` 时，相应的可选集成会被激活。仅当模块位于 `melis.module.load.php` 中时，React 砖块才会出现（通过 `GET /melis/react-api/react-modules` 进行模块化砖块发现）。

## React 后台

左侧边栏 → **Site Tools** → **News**（`Actualités`）。它会以名为 **News** 的顶部标签页打开，通过工具内的**子标签页**承载所有内容：文章列表，以及每篇已打开/新建文章各占一个子标签页并附带完整编辑器。每个子标签页都会保持挂载，因此在文章之间切换是即时的。树形路由为 `/melis-cms/news`（深层链接使用 `/melis-cms/news/:id`，例如 Workflow 眼睛图标）。

### 文章列表

![React 新闻列表——KPI 卡片（Total articles / Published / Unpublished）、带 All / Active / Inactive 筛选器的搜索框、Columns 列管理器、Export 导出按钮、New/Old 切换开关和 "+ New article" 按钮，每行带有编辑和删除操作](/screenshots/react/melis-cms-news/meliscmsnews-tool-news-list.png)

该列表显示平台上的每一篇文章，包含：

- **KPI 卡片** — Total articles（文章总数）、Published（已发布）、Unpublished（未发布）。
- **搜索**，带有 **All / Active / Inactive** 状态筛选器、可排序列、一个 **Columns** 列管理器（隐藏/重新排序）、一个 **Export**（导出为 xlsx）以及 **Reset filters**（重置筛选器）。
- 每行的 **edit**（将文章作为子标签页打开）和 **delete**；**+ New article** 会打开一个空白编辑器。
- 一个 **New / Old** 切换开关（右上角），在 React 界面和 iframe 中的旧版工具之间切换列表（`/melis/react-tool-page?key=meliscmsnews_left_menu`）。

### 文章编辑器

一个可滚动的单一表单：左侧是宽的内容列，右侧是设置边栏，顶部有一个**语言切换器**（English / Français）——所有译文会同时保留，并在一次调用中一起保存。

![新建文章编辑器——语言切换器、Title 和 Subtitle 字段、带 WYSIWYG 段落编辑器和 "Generate with AI" 的 BODY 区域、锁定的 MEDIA 区域，以及设置边栏（Status、Publication、Site、Author、SEO、Categories、Tags、Slider）](/screenshots/react/melis-cms-news/meliscmsnews-tool-news-new.png)

| 区域 | 内容 |
| --- | --- |
| Title / Subtitle | 纯文本，逐语言 |
| Body | 最多 **10 个富文本（WYSIWYG）段落**，可拖拽重排，每个段落带有 **Generate with AI**（AI 生成）助手 |
| Media | 最多 **3 张图片**和 **3 个文档文件**——在文章首次保存前处于锁定状态 |
| Status | **Published / Unpublished** 切换开关，当 MelisSmallBusiness 激活时还会有一个 **Workflow** 按钮 |
| Publication | **Publish on** / **Unpublish on** 日期时间选择器 |
| Site | 文章所属的站点 |
| Author | 作者选择器——仅当 `MelisCmsUserAccount` 提供了 `cnews_author_account` 列时 |
| SEO | 友好 **URL**、**URL redirect**、**URL 301**、**Meta title**、**Meta description**、**Canonical URL**（逐语言） |
| Categories / Tags / Slider | 可选区块，仅当对应模块激活时显示 |
| Comments | 原生审核面板（添加 / 批准 / 拒绝 / 删除），仅当 `MelisCmsComments` 激活时显示 |

![编辑文章文本——标题、副标题和一个富文本（TinyMCE 风格）段落编辑器；段落可以添加和重排](/screenshots/react/melis-cms-news/meliscmsnews-tool-news-edit-texts.png)

![设置边栏顶部——带 Workflow 的 Published 切换开关、Publish on / Unpublish on 日期，以及 Site 选择器](/screenshots/react/melis-cms-news/meliscmsnews-tool-news-edit-properties.png)

![Media 区域——Images（最多 3 张，带 Replace/Remove）和 File attachments（最多 3 个），以及当 MelisCmsComments 激活时的原生 Comments 审核面板](/screenshots/react/melis-cms-news/meliscmsnews-tool-news-edit-medias.png)

![SEO 区块——Meta title、Meta description、URL、URL redirect、URL 301 和 Canonical URL，逐语言](/screenshots/react/melis-cms-news/meliscmsnews-tool-news-edit-seo.png)

保存后，**Preview**（预览）区域会在 iframe 中将文章渲染在其 NEWS_DETAIL 页面内，并提供一个 **Display in new tab**（在新标签页中显示）选项，当站点有多个详情页时还会提供页面选择器。

![Preview 区域——已保存的文章渲染在其 NEWS_DETAIL 页面内，带有一个 "Display in new tab" 按钮](/screenshots/react/melis-cms-news/meliscmsnews-tool-news-edit-preview.png)

### 在页面上展示新闻

从 React 页面编辑器（打开一个页面 → Edition），打开插件面板并将 **Latest News**、**News List** 或 **News Detail** 拖放到页面上；每一个都会打开经典的 Melis 插件配置弹窗（在 React 编辑器内渲染），其标签页与 v5 相同——参见[前台](#front-office)。

![打开了插件面板的 React 页面编辑器——可拖放到页面上的 News 内容块](/screenshots/react/melis-cms-news/meliscmsnews-page-menu-plugins-selector.png)

![Latest News 插件 → Properties——Template、Site 和 News detail page（带页面树选择器）](/screenshots/react/melis-cms-news/meliscmsnews-page-plugin-latestnews-config-tab-properties.png)

![News List 插件 → Pagination——每页新闻数以及要显示的页码链接数量](/screenshots/react/melis-cms-news/meliscmsnews-page-plugin-newslist-tab-pagination.png)

![News Detail 插件 → Properties——Template（news-details）和一个带有跳转到 News 工具快捷方式的 Default news 选择器](/screenshots/react/melis-cms-news/meliscmsnews-page-plugin-newsdetail-config-tab-properties.png)

## React API

**没有 `config/react-api.php`**：路由**内联声明在 `config/module.config.php`** 中，嵌套在共享的 `melis-react-api` 节点之下，因此挂载在 `/melis/react-api/…` 之下。控制器：`MelisCmsNews\Controller\MelisCmsNewsReactApiController`（可调用别名 `MelisCmsNews\Controller\MelisCmsNewsReactApi`）。契约为 `{ success, data, error }`。

| 方法与 URL | 用途 |
| --- | --- |
| `GET /news` | 列出文章（键集分页：`limit`、`search`、`status`、`siteId`、`sort`、`dir`、`after`、`langId`） |
| `GET /news/stats` | KPI `{total, published, draft}` |
| `GET /news/:id` | 单篇文章（`?langId=` → 该译文；基础信息 + 段落 + 媒体 + SEO + 分类/标签 id） |
| `POST /news/save` | 创建 / 更新（在一次调用中处理所有译文、SEO、分类、标签） |
| `DELETE /news/delete/:id` | 删除一篇文章（+ 其文本 + SEO） |
| `GET /news/categories` | 可用分类（`?langId=&siteId=`） |
| `GET /news/tags` | 可用标签（`MelisCmsTags`；缺失时为空） |
| `GET /news/users` | 作为作者的前台用户（`MelisCmsUserAccount`；缺失时为空） |
| `GET /news/preview/:id` | 预览 URL + 该文章所属站点的 NEWS_DETAIL 页面 |
| `GET /news/:id/comments` | 一篇文章的评论（若 `MelisCmsComments` 关闭则返回 404） |
| `POST /news/comments/save` | 添加 / 编辑评论（后台 → 已批准） |
| `POST /news/comments/approve/:cid` · `/refuse/:cid` | 审核一条评论 |
| `DELETE /news/comments/delete/:cid` | 删除一条评论 |
| `GET /news-sites` · `GET /news-languages` | 站点列表 · CMS 语言 |

媒体上传/移除复用**旧版**端点（后端无变更）：`POST /melis/MelisCmsNews/MelisCmsNews/saveFileForm` 和 `.../removeAttachFile`。

该控制器混合使用了模块的 `MelisCmsNewsService`（`getNewsById`、`saveNews`、`deleteNewsById`、`getNewsDetailsPagesBySite`）、直接的参数化 SQL（列表键集分页、统计、SEO、分类/标签关联表）以及共享的 `MelisCmsCategory2Service`；可选的列/表会通过特性检测识别，因此缺失某个可选模块绝不会破坏一次保存。

### 能力（Capabilities）

在 `config/react.capabilities.php` 中声明，位于携带权限的节点 `meliscmsnews_tools_section` 之下（而非旧视图 iframe 所用的清单/区域键 `meliscmsnews_left_menu`）：

```
meliscmsnews_tools_section
└─ actions: list · create · edit · delete · export
```

每个控制器 action 都会被守护两次——先 `denyUnlessAccess()`（认证 + `MelisCoreRights::canAccess`），再 `denyUnlessCan(<cap>)`。`saveAction` 根据是否存在 id 来判定是 `create` 还是 `edit`。React 通过 `window.__melisUseCaps(melisKey)` 将 **+ New article** 按钮限制在 `create` 上、将列表限制在 `list` 上。

## 关键服务

在 `config/module.config.php` 中注册为 `service_manager` 别名。

| 服务别名 | 职责 |
| --- | --- |
| `MelisCmsNewsService` | 主要的 CRUD/查询服务。读取、创建、更新和删除文章；按站点、语言、日期范围、状态查询。每个方法都通过 `MelisGeneralService` 触发 `*_start` / `*_end` 事件。 |

表网关别名：`MelisCmsNewsTable`、`MelisCmsNewsTextsTable`、`MelisCmsNewsSeoTable`、`MelisCmsNewsCategoryTable`、`MelisCmsNewsTagsTable`。

## 前台

三个模板插件扩展了 `MelisTemplatingPlugin`；每个插件都有一个控制器插件、一个视图助手（view helper）以及一个位于 `config/plugins/` 下的配置文件。

| 插件 | 控制器插件 | 视图助手 | 配置标签页 |
| --- | --- | --- | --- |
| Latest News | `MelisCmsNewsLatestNewsPlugin` | `MelisCmsNewsLatestPlugin` | Properties、Filters |
| News List | `MelisCmsNewsListNewsPlugin` | `MelisCmsNewsListPlugin` | Properties、Pagination、Filters |
| News Detail | `MelisCmsNewsShowNewsPlugin` | `MelisCmsNewsShowNewsPlugin` | Properties |

插件配置参数：`template_path`、`site_id`、`pageIdNews`（详情页链接）、`column`、`order`、`limit`、`date_min`、`date_max`、`search`，外加 `nbPerPage` / `nbPageBeforeAfter`（仅 News List）。配置通过 `loadDbXmlToPluginConfig()` / `savePluginConfigToXml()` 持久化到页面 XML 中。

SEO 路由和逐篇文章的 meta 标签在 `src/Module.php` 中通过以下监听器接入：`MelisCmsNewsSEORouteListener`、`MelisCmsNewsRenderPageListener`、`MelisCmsNewsMetaPageListener`、`MelisCmsNewsSeoRedirectUrlListener`。

## 数据库表

基础结构位于 `install/sql/setup_structure.sql`；迁移位于 `install/dbdeploy/`。

| 表 | 保存内容 |
| --- | --- |
| `melis_cms_news` | 核心文章行：状态、发布/取消发布日期、站点、image1-3、documents1-3、slider id |
| `melis_cms_news_texts` | 逐语言文本：标题、副标题、段落 1-10、段落顺序、语言 |
| `melis_cms_news_seo` | 逐语言 SEO：URL、重定向、301 标志、meta 标题/描述、canonical |
| `melis_cms_news_category` | 文章 ↔ 分类关联（可选的分类特性） |

## 示例

```php
$news = $this->getServiceManager()->get('MelisCmsNewsService');

// Latest 10 published articles for site 1, French, newest first:
$list = $news->getNewsList(
    status: 1, langId: 1, start: 0, limit: 10,
    orderColumn: 'cnews_publish_date', order: 'DESC', siteId: 1
);

// Fetch one article (all languages, or one language):
$all = $news->getNewsById(42);
$fr  = $news->getNewsById(42, 1);

// Create / update / delete:
$id = $news->saveNews($data, $newsId);   // $newsId null → create
$ok = $news->deleteNewsById(42);         // also removes texts + SEO rows

// Utility:
$txt  = $news->getPostText(42);
$pages = $news->getNewsDetailsPagesBySite(1);  // NEWS_DETAIL-type pages for a site
```

挂接到某个服务事件以扩展行为（例如在保存后 ping 一个搜索索引）：

```php
$sharedEvents->attach('MelisCmsNews', 'melis_cms_news_save_news_end', function ($e) {
    $params = $e->getParams(); // includes 'news', 'newsId', 'results'
}, 50);
```

其他事件标识符遵循相同的 `melis_cms_news_[method]_start/end` 模式：`melis_cms_news_get_news_list_*`、`melis_cms_news_get_news_by_id_*`、`melis_cms_news_get_news_by_id_array_*`、`melis_cms_news__delete_news_by_id_*`（双下划线）、`melis_cms_news_get_post_text_*`、`melis_cms_news_get_news_details_pages_*`。

## 微服务

`config/app.microservice.php` 通过 Melis 微服务总线暴露 `getNewsList` 和 `getNewsById`，并带有自动生成的表单和输入过滤器。表单工厂 `MelisCmsNewsSelect` 和 `MelisCmsNewsBOSelect` 位于 `src/Form/Factory/`。

## 关键文件

| 关注点 | 路径 |
| --- | --- |
| 模块配置 + 内联 react-api 路由 | `vendor/melisplatform/melis-cms-news/config/module.config.php` |
| React 能力 | `vendor/melisplatform/melis-cms-news/config/react.capabilities.php` |
| 后台工具树 | `vendor/melisplatform/melis-cms-news/config/app.interface.php` |
| 列表表格配置 | `vendor/melisplatform/melis-cms-news/config/app.tools.php` |
| 微服务配置 | `vendor/melisplatform/melis-cms-news/config/app.microservice.php` |
| React API 控制器 | `vendor/melisplatform/melis-cms-news/src/Controller/MelisCmsNewsReactApiController.php` |
| React 砖块（Vite IIFE 源码） | `vendor/melisplatform/melis-cms-news/ui-react/src/` |
| 构建后的砖块 + 清单 | `vendor/melisplatform/melis-cms-news/public/ui-react/brick.js` · `brick.manifest.json` |
| 主服务 | `vendor/melisplatform/melis-cms-news/src/Service/MelisCmsNewsService.php` |
| 前台插件 | `vendor/melisplatform/melis-cms-news/src/Controller/Plugin/` |
| 视图助手 | `vendor/melisplatform/melis-cms-news/src/View/Helper/` |
| 监听器（SEO、GDPR、slider 清理） | `vendor/melisplatform/melis-cms-news/src/Listener/` |
| 表网关 | `vendor/melisplatform/melis-cms-news/src/Model/Tables/` |
| 安装 SQL | `vendor/melisplatform/melis-cms-news/install/sql/setup_structure.sql` |
| 数据库迁移 | `vendor/melisplatform/melis-cms-news/install/dbdeploy/` |

另见：[melis-cms](/zh/reference/modules/melis-cms)、[melis-front](/zh/reference/modules/melis-front)、[melis-engine](/zh/reference/modules/melis-engine)、[melis-core](/zh/reference/modules/melis-core)
