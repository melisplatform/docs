# MelisCmsBlog

> 面向 Melis 站点的博客系统，配备原生 React 后台用于文章管理，以及三个前台展示插件。软件包 `melisplatform/melis-cms-blog`。

## 用途

MelisCmsBlog 在后台提供一个 **Blog** 工具，编辑人员可在其中创建和管理多语言博客文章（标题、副标题、最多四段富文本、图片、文档、发布/下架排期、可选的滑块，以及 SEO url 与元信息）。文章通过三个开箱即用的模板插件呈现于前台：最新文章预告、可分页且可筛选的文章列表，以及单篇文章详情视图。SEO 友好的 URL、每篇文章的元标签以及自动 301 重定向至规范 URL，均由专用的事件监听器处理。

在 v6 React 后台（`/melis-react`）中，本模块提供一个 **原生全 React 砖块**——一个用于列出和编辑文章的真正的 React UI，背后由 `react-api` JSON 层支撑——并带有一个 **New / Old** 切换开关，可回退到在 iframe 中运行的传统工具。它在架构上与 MelisCmsNews 是孪生模块。框架、服务、数据模型、SEO 路由和前台插件与 v5 保持一致；只有后台展示层是新的。

## 启用

添加到 `config/melis.module.load.php`：

```php
return [
    'MelisCmsBlog',
];
```

需要 `melis-core` 和 `melis-cms`，PHP `^8.1|^8.3|^8.4`。当同时安装了 `MelisCmsComments`、`MelisCmsSlider`、`MelisSmallBusiness` 或 `MelisCmsUserAccount` 时，相应的可选集成会被激活。只有在模块存在时，砖块才会出现在 React 侧边栏中（通过 `GET /melis/react-api/react-modules` 进行模块化砖块发现）。

## 关键服务

在 `config/module.config.php` 中注册为 `service_manager` 别名。React 控制器在服务端复用这些相同的业务规则，从而与传统工具保持一致。

| 服务别名 | 职责 |
| --- | --- |
| `MelisCmsBlogService` | 主 CRUD/查询服务。读取、创建、更新和删除文章；按站点、语言、日期范围、状态、作者查询。每个方法都通过 `MelisEngineGeneralService` 触发 `*_start` / `*_end` 事件。 |

表网关别名：`MelisCmsBlogTable`、`MelisCmsBlogTextsTable`。

## 数据库表

基础结构位于 `install/sql/setup_structure.sql`；迁移脚本位于 `install/dbdeploy/`。

| 表 | 存储内容 |
| --- | --- |
| `melis_cms_blog` | 核心文章行：状态、发布/下架日期、站点 id、image1-3、documents1-3、滑块 id |
| `melis_cms_blog_texts` | 各语言文本：标题、副标题、段落 1-4、语言 id、SEO url、SEO 元标题/描述、作者账户 |

> 与 MelisCmsNews 不同，博客 **没有分类也没有标签**——没有关联表，也不支持 `melis_cms_tag*`。

## React 后台

侧边栏 → **MelisCms** 分组 → **Blog**（`fa-rss`）。该砖块以一个名为 **Blog** 的顶部标签页打开，并绘制自己的工具内子标签栏：每篇已打开的文章对应一个子标签，外加一个返回列表。每篇已打开的文章都保持挂载状态，因此在文章之间切换是即时的。

### 文章列表

React 列表显示平台上的每一篇文章，配有 **KPI 卡片**（文章总数、已发布、未发布）、一个带 **All / Active / Inactive** 筛选器的 **搜索** 框、一个 **Columns** 列管理器（隐藏/重排）、一个 **Export** 导出按钮（xlsx/csv）、键集分页以及每行的 **编辑** / **删除**。点击列标题可排序。**+ New post** 会启动一个空白编辑器。

![React 博客列表：KPI 卡片（文章总数 / 已发布 / 未发布）、带 All / Active / Inactive 筛选器的搜索框、Columns 列管理器、Export 导出按钮、New/Old 切换开关和 "+ New post" 按钮，以及每行的编辑和删除操作](/screenshots/react/melis-cms-blog/meliscmsblog-tool-blog-list.png)

一个 **New / Old** 切换开关（右上角）在 React UI 与在 iframe 中渲染的传统工具（`/melis/react-tool-page?key=meliscmsblog_left_menu`）之间切换列表——且仅切换列表，因此两个界面可以并排比较。

### 文章编辑器

在传统工具使用独立顶部标签页（Properties / Texts / Medias）的地方，React 编辑器是一个可滚动的单页：左侧为较宽的 **内容列**，右侧为可折叠的 **设置侧边栏**。顶部的 **语言切换器** 同时持有所有译文——所有语言在一次调用中一起保存。

**内容列**

- **标题 / 副标题**——纯文本，按语言。

![文章编辑器的语言切换器（English / Français / Español）、Title 和 Subtitle 字段，以及包含最多 4 段富文本（TinyMCE）的 BODY——每段位于各自可拖拽重排的卡片中，并带有段落计数器](/screenshots/react/melis-cms-blog/meliscmsblog-tool-blog-edit-tab-texts.png)

- **正文**——最多 **4 段富文本（TinyMCE）段落**（`cblog_paragraph1..4`），可拖拽重排，
  并带有 **+ Add paragraph (max. 4)**。
- **媒体**——最多 **3 张图片**（每个槽位可 Replace / Remove）以及最多 **3 个文件附件**。
  仅在 **首次保存之后** 出现，因为上传需要文章先已存在。

![媒体区域——图片（最多 3 张，每个槽位可 Replace/Remove）和文件附件（最多 3 个，"Click to attach a file"）](/screenshots/react/melis-cms-blog/meliscmsblog-tool-blog-edit-tab-medias.png)

- **评论**——一个原生审核面板（添加/编辑、批准/拒绝/删除、可分页），仅在安装了 **MelisCmsComments** 时显示。

**设置侧边栏**（可折叠分区）

- **状态**——一个 Published / Unpublished 切换开关，以及当 **MelisSmallBusiness** 激活时的一个 **Workflow** 按钮（校验）。

![设置侧边栏顶部——带有 Workflow 按钮的 Published 开关、Publish on / Unpublish on 日期时间选择器和 Site 选择器](/screenshots/react/melis-cms-blog/meliscmsblog-tool-blog-edit-tab-properties.png)
- **发布**——**Publish on** / **Unpublish on** 日期时间选择器。
- **站点**——文章所属的站点（必填）。
- **作者**——一个作者选择器，仅在 **MelisCmsUserAccount** 提供 `cblog_author_account` 列时显示。
- **评论校验**——一个"前台评论在获批前保持隐藏"的切换开关，外加一个博客专属的"评论需要账户"开关，在 **MelisCmsComments** 激活时显示。
- **SEO**——元标题、元描述和友好 **URL**，按语言（存储在 texts 表中，而非专用的 SEO 表）。
- **滑块**——随文章一起显示的滑块，仅在 **MelisCmsSlider** 激活时显示。

可选分区在运行时进行特性检测（配套端点会优雅地返回 404；模块状态从 `/melis/react-api/react-modules` 读取），因此缺失配套模块绝不会中断保存。**Save**（右上角）在一次调用中持久化每个译文、SEO、日期、媒体链接、滑块和作者。之后一个 **Preview** 区域会在 iframe 中将已保存的文章渲染到其详情页上。

![增强后的设置侧边栏——一个评论校验切换开关、博客专属的"评论需要账户"切换开关，然后是可折叠的 SEO 和 Slider 分区](/screenshots/react/melis-cms-blog/meliscmsblog-tool-blog-edit-tab-properties-with-overrides.png)

## React API

路由位于 `config/react-api.php`（通过 `MelisCmsBlog\Module::getConfig()` 合并），挂载于 `/melis/react-api/…` 之下。控制器：`MelisCmsBlog\Controller\MelisCmsBlogReactApiController`。契约 `{ success, data, error }`；每次 fetch 都发送 `X-Requested-With: XMLHttpRequest` 和 `credentials:'include'`。

| 方法与 URL | 用途 |
| --- | --- |
| `GET /blog` | 列出文章（键集：`limit`、`search`、`status`、`siteId`、`sort`、`dir`、`after`）→ `{items,total,nextCursor}` |
| `GET /blog/stats` | KPI `{total, published, draft}` |
| `GET /blog/:id` | 单篇文章（`?langId=` → 该译文；基础字段 + 段落 + 媒体 + SEO + 滑块/作者） |
| `POST /blog/save` | 创建 / 更新（所有译文、状态、siteId、日期、sliderId、authorId、评论标志、seo） |
| `DELETE /blog/delete/:id` | 删除一篇文章及其文本 |
| `GET /blog/preview/:id` | 预览 URL + 该文章所在站点的 BLOG_DETAIL 页面列表 |
| `GET /blog/users` | 作为作者的前台用户（`MelisCmsUserAccount`） |
| `GET /blog/:id/comments` | 一篇文章的评论（若 `MelisCmsComments` 关闭则返回 404） |
| `POST /blog/comments/save` | 添加/编辑一条评论 |
| `POST /blog/comments/approve/:cid` · `/refuse/:cid` | 审核一条评论 |
| `DELETE /blog/comments/delete/:cid` | 删除一条评论 |
| `GET /blog-sites` | 站点列表 |
| `GET /blog-languages` | CMS 语言（`melis_cms_lang`） |

**没有 `/blog/categories` 或 `/blog/tags` 路由**。滑块来自 MelisCmsSlider 砖块自身的 `GET /melis/react-api/sliders`。媒体上传/移除以及评论作者搜索复用 **传统** 端点（后端无变化）：

- `POST /melis/MelisCmsBlog/MelisCmsBlog/saveFileForm` — multipart 图片/文件上传
- `POST /melis/MelisCmsBlog/MelisCmsBlog/removeAttachFile` — 清空该列并删除文件

### 能力（Capabilities）

在 `config/react.capabilities.php` 中的权限承载节点 `meliscmsblog_left_menu` 下声明：

```
meliscmsblog_left_menu
└─ actions: list · create · edit · delete · export
```

React 通过 `window.__melisUseCaps('meliscmsblog_left_menu').can(cap)` 对 UI 进行门控（New post → `create`，Export → `export`，行操作 → `edit`/`delete`，列表主体 → `list`）。在服务端，每个控制器操作都由 `denyUnlessAccess()`（认证 + `canAccess`）守护，随后是 `denyUnlessCan(cap)`。

## 砖块清单（Brick manifest）

`public/ui-react/brick.manifest.json`（Vite IIFE 打包，React/ReactDOM 外部化为宿主全局变量）：

```json
{ "id": "blog", "route": "/melis-cms/blog", "label": "Blog",
  "forwardKey": "MelisCmsBlog/MelisCmsBlogList", "melisKey": "meliscmsblog_left_menu",
  "entry": "brick.js", "persistent": true, "subTabs": true }
```

`forwardKey` 将传统左侧菜单节点映射到树路由 `/melis-cms/blog`（可深度链接为 `/melis-cms/blog/:id`，由 Workflow 眼睛图标使用）。`subTabs: true` 表示该砖块绘制自己的工具内子标签栏。当 MelisSmallBusiness 激活时，状态分区会渲染共用的 `window.__melisWorkflowModal`，并设置 `ctx.wfType = 'BLOG'`。一个可选模块可以通过 `window.__melisBlogExtensions.renderParagraphActions(...)` 添加逐段操作。

## 前台

三个模板插件扩展了 `MelisTemplatingPlugin`，每个都带有一个控制器插件和一个位于 `config/plugins/` 下的配置文件。它们都从 `?blogId` 查询参数读取活动文章 id。在 React 页面编辑器中，它们从插件面板的 **Melis Cms Blog** 分组中拖放出来，每个都会打开经典的分标签配置模态框。

![打开插件面板的 React 页面编辑器——"Melis Cms Blog" 分组：Latest blog posts、Blog post list、Blog post details](/screenshots/react/melis-cms-blog/meliscmsblog-page-plugins-menu.png)

| 插件类 | 配置键 | 视图 | 配置标签页 |
| --- | --- | --- | --- |
| `MelisCmsBlogLatestBlogPlugin` | `MelisCmsBlogLatestBlog` | `MelisCmsBlog/latest-blog` | Properties, Filters |
| `MelisCmsBlogListBlogPlugin` | `MelisCmsBlogListBlog` | `MelisCmsBlog/blog-list` | Properties, Pagination, Filters |
| `MelisCmsBlogShowBlogPlugin` | `MelisCmsBlogShowBlog` | `MelisCmsBlog/blog-details` | Properties |

插件配置参数：`template_path`、`site_id`、`pageIdBlog`（详情页链接）、`column`、`order`、`limit`、`date_min`、`date_max`、`search`；外加 `nbPerPage` / `nbPageBeforeAfter`（仅 Blog list）。Blog list 插件还会按 `?authorId` 筛选。当请求中没有 `blogId` 时，Blog details 插件会回退到最新发布的文章，并支持预览模式（`renderMode === 'previewtab'`）。

可用的排序列：`cblog_id`、`cblog_title`、`cblog_publish_date`、`cblog_creation_date`。

![Blog list 插件 → Properties——模板 MelisCmsBlog/blog-list、Site 和 Blog 详情页](/screenshots/react/melis-cms-blog/meliscmsblog-page-plugin-bloglist-config-properties.png)

![Latest blog 插件 → Filters——Sort（Blog publish date）、Order、Limit、From/To 日期和 Default search](/screenshots/react/melis-cms-blog/meliscmsblog-page-plugin-latestblog-config-filters.png)

![Blog details 插件 → Properties——模板 MelisCmsBlog/blog-details 和一个 Default post 选择器](/screenshots/react/melis-cms-blog/meliscmsblog-page-plugin-blogdetails-config-properties.png)

### SEO 路由

文章通过一个类型为 **`BLOG_DETAIL`** 的页面提供，该页面承载 Blog details 插件，位于文章的 `cblog_seo_url`。四个监听器实现了完整的 SEO 流水线：

| 监听器 | 事件 | 职责 |
| --- | --- | --- |
| `MelisCmsBlogSEOReformatToRoutePageUrlListener` | `EVENT_ROUTE` | 匹配 SEO URL 并构建到 BLOG_DETAIL 页面的路由 |
| `MelisBlogSEODispatchRouterRegularUrlListener` | `EVENT_DISPATCH` | 将非规范 URL 301 重定向至文章的 `cblog_seo_url` |
| `MelisCmsBlogRedirect301Listener` | `meliscmsblog_redirect_page` | 从文章的元字段设置页面的 SEO 元信息 |
| `MelisCmsBlogSEOMetaPageListener` | `EVENT_FINISH` | 用文章的 SEO 元信息重写已渲染的 `<title>` / `<meta description>` |

`MelisCmsBlogPreviewTypeListener` 在页面属性表单中注册 **BLOG_DETAIL** 页面类型（事件 `modify_page_properties_form_config`）。

## 示例

```php
$blog = $this->getServiceManager()->get('MelisCmsBlogService');

// Latest 10 published posts for site 1, newest first:
$list = $blog->getBlogList([
    'siteId'   => 1,
    'langId'   => 1,
    'limit'    => 10,
    'orderBy'  => 'cblog_publish_date',
    'orderDir' => 'DESC',
]);

// Fetch one post (with its texts for a given language):
$post = $blog->getBlogById($blogId, $langId);
$txt  = $blog->getPostText($blogId);

// Create / update / delete:
$id = $blog->saveBlog(['cblog_site_id' => 1, 'cblog_status' => 1, ...], $blogId); // null → create
$blog->deleteBlogById($blogId);  // also removes its texts

// Utility:
$pages  = $blog->getBlogDetailsPagesBySite($siteId);       // BLOG_DETAIL-type pages for a site
$isDupe = $blog->checkSeoUrlDuplication($seoUrl, $blogId); // SEO URL uniqueness check
$slug   = $blog->cleanURL($title);                         // slugify (handles accents)

// Posts by a front-account author:
$posts  = $blog->getBlogListByAuthorId($authorId);
```

## 其他监听器

| 监听器 | 事件 | 用途 |
| --- | --- | --- |
| `MelisCmsBlogSliderDeletedListener` | `meliscmsslider_delete_slider_end` | 从文章中清除已删除的滑块（`cblog_slider_id`） |
| `MelisCmsBlogGdprAutoDeleteActionDeleteListener` | `melis_cms_user_account_gdpr_auto_delete_action_delete` | GDPR：为已删除的用户账户将 `cblog_author_account` 置空 |
| `MelisCmsBlogServiceMicroServiceListener` | `melis_core_microservice_amend_data` | 在 `getBlogList` 结果中将图片路径转换为绝对 URL，用于 API/微服务输出 |
| `SiteMenuBlogDataListener` | `MelisFrontMenuPlugin_melistemplating_plugin_end` | 将文章（按月/年分组）馈送到前台菜单插件 |
| `MelisCmsBlogFlashMessengerListener` | `meliscmsblog_delete_blog_end`、`meliscmsblog_save_blog_*_end` | 为博客操作提供 flash-messenger 反馈 |

## 关键文件

| 关注点 | 路径 |
| --- | --- |
| 模块配置（服务、网关、插件） | `vendor/melisplatform/melis-cms-blog/config/module.config.php` |
| React API 路由 | `vendor/melisplatform/melis-cms-blog/config/react-api.php` |
| React 能力 | `vendor/melisplatform/melis-cms-blog/config/react.capabilities.php` |
| 后台工具树（传统 / Old 视图） | `vendor/melisplatform/melis-cms-blog/config/app.interface.php` |
| 评论标签页注入 | `vendor/melisplatform/melis-cms-blog/config/comments.config.php` |
| 插件配置 | `vendor/melisplatform/melis-cms-blog/config/plugins/` |
| 主服务 | `vendor/melisplatform/melis-cms-blog/src/Service/MelisCmsBlogService.php` |
| React API 控制器 | `vendor/melisplatform/melis-cms-blog/src/Controller/MelisCmsBlogReactApiController.php` |
| 前台插件 | `vendor/melisplatform/melis-cms-blog/src/Controller/Plugin/` |
| 监听器（SEO、GDPR、滑块、菜单、flash） | `vendor/melisplatform/melis-cms-blog/src/Listener/` |
| React 砖块源码 | `vendor/melisplatform/melis-cms-blog/ui-react/src/` |
| 构建后的砖块 + 清单 | `vendor/melisplatform/melis-cms-blog/public/ui-react/` |
| 安装 SQL | `vendor/melisplatform/melis-cms-blog/install/sql/setup_structure.sql` |

另见：[melis-cms](/zh/reference/modules/melis-cms)、[melis-front](/zh/reference/modules/melis-front)、
[melis-engine](/zh/reference/modules/melis-engine)、[melis-core](/zh/reference/modules/melis-core)、
[melis-cms-slider](/zh/reference/modules/melis-cms-slider)、
[melis-small-business](/zh/reference/modules/melis-small-business)
