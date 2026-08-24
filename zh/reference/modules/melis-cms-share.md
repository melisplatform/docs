# MelisCmsShare

> 将社交媒体分享 / Open Graph 元标签注入 CMS 页面前台的 `<head>` 中，通过原生 React 后台进行管理。软件包 `melisplatform/melis-cms-share`。

## 用途

`MelisCmsShare` 让编辑者可以为每个页面设置五个值——**标题、描述、图片、类型和 URL**——
并将它们作为三组元标签写入渲染后的页面 `<head>` 中：**Twitter Card**
（`twitter:title/description/image/card`）、**schema.org / Google**（`itemprop` 属性）以及
**Facebook / Open Graph**（`og:title/description/image/type/url`）。每个页面存储一行数据；
如果模板中已存在某个标签，则将其替换，否则将其插入到 `<head>` 之后。没有分享数据行的页面
保持不变。

在 v6 中，该模块提供一个 **原生全 React 砖块**（brick，而非 iframe 砖块），在两个界面上暴露此数据——
一个独立的 **Open Graph** 工具，以及 **CMS 页面编辑器中的 Open Graph 标签页**——
两者都通过 `/melis/react-api/cms-share…` JSON 层进行读写。前台的
`<head>` 注入器、数据模型和服务与 v5 相比保持不变。

## 启用

添加到 `config/melis.module.load.php`：

```php
return [
    'MelisCmsShare',
];
```

依赖项：`melisplatform/melis-core`、`melisplatform/melis-engine`、`melisplatform/melis-front`
和 `melisplatform/melis-cms`。该模块需要 CMS 页面编辑器（用于 Open Graph 标签页和页面
生命周期事件）以及前台渲染管线（用于 `MvcEvent::EVENT_FINISH` 钩子）。两个 React 界面
**仅在该模块被列于此处时** 才会出现（通过 `GET /melis/react-api/react-modules` 进行模块化砖块发现）。

## React 后台

该砖块是一个 **原生全 React** 界面，带有 **New / Old 切换开关**：*New* 是 React 界面
（默认），*Old* 则在 iframe 中渲染旧版工具
（`/melis/react-tool-page?key=melis_cms_share_tool_display`）。

| 项目 | 值 |
| --- | --- |
| 砖块 id | `cms-share`（路由 `/melis-cms-share/share`，标签 `Partage`） |
| `forwardKey` | `MelisCmsShare/MelisCmsShareTool` |
| `melisKey`（权限 / Old 视图 iframe） | `melis_cms_share_tool_display` |
| 页面编辑器标签页键 | `melis_cms_share_page_edition_tab`（注册于 `meliscms_page` 下） |
| API 基址 | `/melis/react-api/cms-share` |

**Open Graph 工具**——侧边栏 → **Site Tools** → **Open Graph**。列出每个页面的分享数据行，包含
**KPI 卡片**（分享总数、覆盖页面数、不同类型数）、一个 **搜索** 框（标题、URL、类型、
描述、页面 id）、一个 **All types**（全部类型）筛选器、**Reset filters**（重置筛选器）、一个 **Columns**（列）
管理器、**Export**（导出）、一个刷新按钮以及 New/Old 切换开关。点击列标题（Page / Title / Type / URL /
Added on）可排序；每一行都有编辑（铅笔）和删除（垃圾桶）操作。

![React Open Graph 工具：KPI 卡片（分享总数 / 覆盖页面数 / 不同类型数）、搜索、类型筛选器、Reset filters、Columns 管理器、Export、New/Old 切换开关和刷新按钮——每一行显示 Page、Title、Type、URL、Added on，并带有各行的编辑和删除操作](/screenshots/react/melis-cms-share/meliscmsshare-tool-opengraph-list.png)

**编辑表单**——Page ID（必填）、Type（`article`、`website`…）、Title（`og:title`）、URL
（`og:url`）、一个图片面板（预览 + Replace / Remove；JPG、PNG、GIF、WEBP——最大 15 MB）以及一个
Description（`og:description`）。图片首先通过 multipart 上传到
`/media/melisCmsShare/<pageId>/…`，然后在 **Save**（保存）时存储其路径。

![React 分享表单——Page ID、Type、Title、URL，一个显示已存储路径（`/media/melisCmsShare/<pageId>/…`）并带 Replace/Remove 的图片面板，以及一个 Description 文本域](/screenshots/react/melis-cms-share/meliscmsshare-tool-opengraph-edit.png)

**CMS 页面编辑器中的 Open Graph 标签页**——打开一个 CMS 页面并选择 **Open Graph** 标签页，即可就地
编辑该页面的分享元数据（Title、Type、URL、Image、Description）；Page ID 是隐式的。该标签页
**没有自己的 Save 按钮**——数值通过保存钩子由页面编辑器的
Save / Publish 持久化，与旧版 Share 标签页完全一样。

![处于激活状态的 Open Graph 标签页的 CMS 页面编辑器（位于 Edition、Properties、SEO、Languages、Historic、Page Analytics 等旁边）——Title、Type、URL、图片面板和 Description，通过页面顶部的 Save/Publish 按钮保存](/screenshots/react/melis-cms-share/meliscmsshare-pageedition-tab-opengraph.png)

## React API

路由位于 `config/react-api.php`（通过 `MelisCmsShare\Module::getConfig()` 合并）；控制器为
`MelisCmsShare\Controller\MelisReactApiShareController`。全部位于 `/melis/react-api/cms-share` 下，
遵循 `{ success, data, error }` 契约。

| 方法与 URL | 守卫 | 用途 |
| --- | --- | --- |
| `GET /cms-share` | access + `list` | 键集列表（`limit`、`search`、`type`、`page`、`sort`、`dir`、`after`）→ `{items,total,nextCursor}` |
| `GET /cms-share/stats` | access + `list` | KPI `{total, pages, types}` |
| `GET /cms-share/types` | access + `list` | 不同的 `mcs_type` 值（筛选选项） |
| `GET /cms-share/:id` | access + `edit` | 单个分享数据行 |
| `GET /cms-share/by-page/:idPage` | 仅需 auth | 该页面的分享数据（用于页面编辑器标签页）；若无则 `data:null` |
| `POST /cms-share/save` | access + `create`/`edit` | 创建 / 更新（`{id?, pageId, title, type, url, img, description}`）；作者在服务端强制设定；页面缓存失效 |
| `POST /cms-share/upload-image` | access + `edit` | Multipart 上传（`pageId`、`image`）→ `{path}`，位于 `/media/melisCmsShare/<pageId>/…` 下 |
| `DELETE /cms-share/delete/:id` | access + `delete` | 删除一行；页面缓存失效 |

该控制器 **直接通过参数化 SQL** 与 `melis_cms_share` 交互，复现了旧版的
业务规则（page id 必填、创建时作者强制设为当前用户、图片白名单
jpg/jpeg/png/gif/webp/ico/bmp 且 ≤ 15 MB 并作为 `/media/melisCmsShare/<pageId>/` 下唯一文件保留、
前台页面缓存失效以刷新 `<head>` 标签）。此控制器不使用更高层的 `MelisCmsShareService`。
每次 fetch 都会发送 `X-Requested-With: XMLHttpRequest` 和
`credentials:'include'`。

## 能力（Capabilities）

在 `config/react.capabilities.php` 中声明于承载权限的节点
`melis_cms_share_tool_display` 下（即控制器 access 守卫所使用的同一节点）：

```
melis_cms_share_tool_display → list · create · edit · delete · export
```

`MelisCan('melis_cms_share_tool_display', cap)` 用于控制 UI 按钮的门禁；在服务端，每个操作都会调用
`denyUnlessAccess()`（auth + `MelisCoreRights::canAccess(...)` → 401/403），然后调用 `denyUnlessCan(cap)`。
页面编辑器标签页是一个独立的 **模块化** 贡献：同一文件在 `meliscms_page` 下合并了一个 `tabs` 条目
（键 `melis_cms_share_page_edition_tab`，与砖块中的 `registerPageTab(...)`
调用匹配），因此 MelisCms 会显示该标签页按钮。

## 关键服务

| 服务别名 | 作用 |
| --- | --- |
| `MelisCmsShareService` | 分享记录的完整 CRUD：`saveShare($data)`、`deleteShare()`、`getShareById()`、`getShareByPageId($idPage)`、`getAllShare()`、`searchShare()`、`countAllShare()`、`countFilteredShare()`。 |
| `melisCmsShareTable` | `melis_cms_share` 的表网关（`MelisCmsShareTable`）。使用 `getEntryByField('mcs_page_id', $idPage)` 查找某个页面的数据行。 |

## 前台

未暴露任何视图助手或模板插件。分享标签由
`MelisCmsShare\Listener\MelisCmsShareMetaPageListener` 注入，它在 `src/Module.php` 中挂载，并在
**`MvcEvent::EVENT_FINISH`** 上以优先级 **110** 触发：

1. 跳过非 PHP / 资源请求（对 URI 进行正则匹配）以及没有 `idpage` 的请求。
2. 通过 `melisCmsShareTable->getEntryByField('mcs_page_id', $idPage)` 加载该页面的分享数据行。
3. 对每个非空字段，要么对现有标签进行 `preg_replace`，要么将其插入到 `<head>` 之后——
   涵盖全部三组标签（Twitter Card、`itemprop`、`og:`）。
4. 使用 `addslashes` 转义值，将 `scheme://host` 前置到图片 URL 上，并通过
   `$response->setContent()` 写回。

由于它在 MVC 生命周期末尾对已渲染的 HTML 字符串进行操作，因此它可以
替换模板已经输出的标签。

> **类型注意事项：** 单个 `mcs_type` 字段同时供给 `twitter:card` 和 `og:type`，而这两者期望
> 不同的词汇表（`summary`/`summary_large_image` 与 `website`/`article`）。请使用一个
> 对两者都可接受的值，或接受其中一个不符合规范的情况。

## 页面生命周期监听器

| 监听器 | 事件 | 用途 |
| --- | --- | --- |
| `MelisCmsSavePageListener` | `meliscms_page_save_start`、`meliscms_page_publish_start` | 在保存或发布 CMS 页面时保持分享记录一致。 |
| `MelisCmsShareDeletePageListener` | `meliscms_page_delete_end` | 在页面被删除时删除对应的 `melis_cms_share` 数据行（不留孤立的分享数据）。 |
| `MelisCmsShareFlashMessengerListener` | 后台保存/删除事件 | 在保存或删除后提供后台的 flash 反馈。 |

## 数据库表

| 表 | 存储内容 |
| --- | --- |
| `melis_cms_share` | 每个页面一份分享配置。主键 `mcs_id`。列：`mcs_page_id`、`mcs_title`、`mcs_description`、`mcs_img`、`mcs_type`、`mcs_url`、`mcs_add_user_id`、`mcs_date_added`。该表关联后台用户以暴露 `mcs_share_added_by`（全名）。 |

## 示例

```php
// Read the share config for a given page
$share = $serviceManager->get('MelisCmsShareService')->getShareByPageId($pageId);

// Persist a share config for a page (create or update)
$serviceManager->get('MelisCmsShareService')->saveShare([
    'mcs_page_id'      => $pageId,
    'mcs_title'        => 'My page title for social',
    'mcs_description'  => 'A short description shown in link previews.',
    'mcs_img'          => '/path/to/preview-image.jpg',
    'mcs_type'         => 'summary_large_image',
    'mcs_url'          => 'https://example.com/my-page',
    'mcs_add_user_id'  => $currentUserId,
]);
```

## 关键文件

| 关注点 | 路径 |
| --- | --- |
| 模块 / 引导 | `vendor/melisplatform/melis-cms-share/src/Module.php` |
| React API 路由 + invokable | `vendor/melisplatform/melis-cms-share/config/react-api.php` |
| React 能力 + 页面标签页 | `vendor/melisplatform/melis-cms-share/config/react.capabilities.php` |
| React API 控制器 | `vendor/melisplatform/melis-cms-share/src/Controller/MelisReactApiShareController.php` |
| 旧版后台控制器（Old 视图） | `vendor/melisplatform/melis-cms-share/src/Controller/MelisCmsShareToolController.php` |
| React 砖块源码 | `vendor/melisplatform/melis-cms-share/ui-react/src/`（`brick.tsx`、`SharePage.tsx`…） |
| 已构建的砖块 + 清单 | `vendor/melisplatform/melis-cms-share/public/ui-react/`（`brick.js`、`brick.manifest.json`） |
| 前台 `<head>` 注入器 | `vendor/melisplatform/melis-cms-share/src/Listener/MelisCmsShareMetaPageListener.php` |
| 服务 | `vendor/melisplatform/melis-cms-share/src/Service/MelisCmsShareService.php` |
| 表 | `vendor/melisplatform/melis-cms-share/src/Model/Tables/MelisCmsShareTable.php` |

另请参阅：[MelisCms](/zh/reference/modules/melis-cms) · [MelisCmsPageAnalytics](/zh/reference/modules/melis-cms-page-analytics) · [模块参考](/zh/reference/modules)
