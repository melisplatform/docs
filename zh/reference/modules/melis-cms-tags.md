# MelisCmsTags

> CMS 的共享标签/分类系统 —— 内容模块（例如 News）用来挂载条目的“标签”，现已配备原生 React 后台。软件包 `melisplatform/melis-cms-tags`。

## 用途

MelisCmsTags 提供平台的**标签（分类）系统**：多语言标签（每种语言一个标题），供其他模块将其内容与之关联。编辑人员可以创建和翻译标签，查看每个标签被多少条目使用，并删除未使用的标签。其他模块（例如 MelisCmsNews）通过一份配置声明和一次服务调用即可接入关联层，使其条目可打标签，而无需对标签模块做任何表结构改动。前台的 **List Tags** 模板插件用于在前台展示站点的标签。

在 **Melis v6** 中，后台是一块在 `/melis-react` 内渲染的**原生纯 React 砖块（brick）**，调用模块自有的 `react-api` JSON 层。服务端的数据模型、服务、数据表、关联配置和前台插件与 v5 保持一致 —— 仅展示层和导航层迁移到了 React。

## 启用它

添加到 `config/melis.module.load.php`：

```php
return [
    'MelisCmsTags',
];
```

依赖 `melis-core` 和 `melis-cms`。该模块随附 `dbdeploy: true` —— 其三张数据表会在首次部署时自动创建。仅当**模块被激活时**，React 砖块才会出现在后台中（模块化砖块发现机制）。

## 它在 React 后台中的位置

左侧边栏 → **Site Tools** 分组 → **Tags**（`fa-tag`）。它会以名为 **Tags** 的顶部标签页打开。菜单 `forwardKey` `MelisCmsTags/TagsList` 映射到树路由 `/melis-cms/tags`（编辑器为 `/melis-cms/tags/:id`），由 `TagsPage` 组件渲染。

该砖块是一套**原生纯 React** UI，带有一个 **New / Old 切换开关**（右上角）：*New* 是 React UI（默认），*Old* 则在 iframe 中渲染旧版工具（`/melis/react-tool-page?key=tags_left_menu`）。

## 后台 —— 列表与编辑器

**一个外壳标签页（`Tags`）加上工具内的子标签页。**列表是主视图；打开或创建一个标签会新增一个**编辑子标签页**（`subTabs: true`），因此在已打开的标签之间切换非常快捷。

**列表**显示平台上的每一个标签，包含：

- **KPI 卡片** —— 总计 · 有关联 · 无关联（来自 `stats` 端点）。
- **搜索**（“Search a tag…”，按 id 或任意语言中的标题匹配）、**Reset filters**（重置筛选）、一个**Columns** 管理器（隐藏/重排），以及一个 **Export** 按钮（通过宿主 `window.MelisXLSX` 导出 `.xlsx`，并回退到 CSV）。
- 可排序列 **ID / Title / Nb associations**，每行带有**编辑**和**删除**操作。
- 一个 **+ New tag** 按钮，用于打开空白编辑器。

![React Tags 列表 —— KPI 卡片（Total / With associations / Without association）、搜索、Reset filters、Columns 管理器、Export、New/Old 切换开关、“+ New tag”，以及显示 ID / Title / Nb associations 并带有编辑和删除操作的行](/screenshots/react/melis-cms-tags/meliscmstags-tool-tags-list.png)

**编辑器**是一个紧凑的表单（一个标签仅由每种语言的标题组成）：一个由 `languages` 端点驱动的**语言切换器**（English / Français…），以及一个用于所选语言的 **Label** 字段。所有译文会一次性保存在一起 —— **至少需要一个非空标题**。当标签仍有关联时，**删除会被拒绝**，以保护已打标签的内容。

![React 标签编辑器 —— 语言切换器（English / Français）和按语言的 “LABEL” 字段，以及 “At least one title is required”（至少需要一个标题）提示](/screenshots/react/melis-cms-tags/meliscmstags-tool-tags-edit-texts.png)

## 为内容打标签 —— 标签选择器

标签的意义在于被其他模块*使用*。在 **React News 编辑器**中（Site Tools → News → 打开一篇文章），设置侧边栏会显示一个 **TAGS** 面板：一份可用标签的复选清单。勾选标签并保存文章即可存储关联，随后这些关联会计入每个标签的 **Nb associations**。

![React News 文章编辑器内的 TAGS 面板 —— 一份标签复选清单（Art、Business、Design、Development、Education…），用于给文章打标签](/screenshots/react/melis-cms-tags/meliscmstags-tooloverride-news-tags.png)

该选择器及其保存逻辑归 **News** 砖块所有（它读取 `GET /melis/react-api/news/tags`，并以 `entity_type = 'NEWS'` 写入共享的关联表）；MelisCmsTags 仅拥有标签数据和共享的 `melis_cms_tag_entity` 表。该面板仅在 MelisCmsTags 处于激活状态时出现。

## React API —— 端点

**不存在 `config/react-api.php`**：路由**内联声明在 `config/module.config.php` 中**，作为 `melis-backoffice` 下的子节点 `react-api-cms-tags`，因此这些 URL 位于 **`/melis/react-api-cms-tags`** 之下（模块自有，*而非*共享的 `/melis/react-api/…` 命名空间）。控制器：`MelisCmsTags\Controller\MelisCmsTagsReactApiController`。所有响应均采用 `{ success, data, error }` 契约；请求发送 `X-Requested-With: XMLHttpRequest` 和 `credentials: 'include'`。

| 方法与 URL | Action | 用途 |
| --- | --- | --- |
| `GET /melis/react-api-cms-tags` | `list` | 列出标签（keyset：`search`、`limit`、`sort`、`dir`、`after`，可选 `lang`）→ `{items,total,nextCursor}`；每个条目包含 `id`、`title`、`associationsCount` |
| `GET /melis/react-api-cms-tags/stats` | `stats` | KPI `{total, withAssociations, orphan}` |
| `GET /melis/react-api-cms-tags/languages` | `languages` | CMS 语言 `{languages:[{id,locale,name}]}`（驱动编辑器的语言切换器） |
| `GET /melis/react-api-cms-tags/:id` | `get` | 单个标签 `{id, creationDate, titles:{langId:title}, associationsCount}` |
| `POST /melis/react-api-cms-tags/save` | `save` | 创建/更新（`{id?, titles:{langId:title}}`）→ `{id}` |
| `DELETE /melis/react-api-cms-tags/delete/:id` | `delete` | 删除一个标签（如果它仍有关联则拒绝） |

> 路由顺序很重要：`stats` / `languages` / `save` 声明在 `:id` 通配路由**之前**，这样它们才能解析到各自的 action 而非 `get`。

控制器混合使用了直接参数化的 keyset SQL（list、stats）以及模块的数据表和服务（`get`/`save` 使用 `TagTable`、`TagTextsTable`、`TagEntityTable`；`delete` 使用 `MelisCmsTagsService` —— `getAssociationsByTagId()` 阻止删除，随后由 `deleteTagById()` + `TagTextsTable::deleteByField()` 清理）。`save` 复现了旧版规则（≥1 个非空标题、≤255 字符、按语言唯一），并触发相同的事件（`meliscmstags_save_tag_end`、`meliscmstags_delete_tag_end`）。

示例（`tags-api.ts`）：

```ts
const BASE = '/melis/react-api-cms-tags'
await apiFetch<TagListResult>(`${BASE}?search=art&limit=25&sort=id&dir=desc`) // list
await apiFetch<TagDetail>(`${BASE}/42`)                                       // one tag
await apiFetch<{ id: number }>(`${BASE}/save`, {                              // save all translations
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: null, titles: { 1: 'Art', 2: 'Art' } }),        // langId → title
})
await apiFetch<null>(`${BASE}/delete/42`, { method: 'DELETE' })              // delete
```

## 能力（Capabilities）

在 `config/react.capabilities.php` 中的菜单节点 **`tags_left_menu`** 下声明（即可渲染的工具节点；由 `MelisCmsTags\Module::getConfig()` 合并该文件）。操作：`list` · `create` · `edit` · `delete` · `export`。在 React 中，`TagsPage` 的 `can(cap)` 读取 `window.MelisCan('tags_left_menu', cap)`，以控制 **+ New tag** 按钮、行的编辑/删除以及 Export 的启用。在服务端，每个操作都会调用 `denyUnlessAccess()`（认证 + `MelisCoreRights::canAccess('tags_left_menu')` → 401/403）；此处 capabilities 键和访问守卫 `MELIS_KEY` 相同（`tags_left_menu`）。

## 关键服务

| 服务别名 | 角色 |
| --- | --- |
| `MelisCmsTagsService` | 完整的标签 CRUD 以及关联 API。每个方法都通过 `MelisGeneralService` 触发 `*_start` / `*_end` 事件。 |

表网关别名：`TagTable`、`TagTextsTable`、`TagEntityTable`（注册于 `module.config.php`）。

## 前台

`ListTagsPlugin`（`Controller\Plugin\ListPublicationsPlugin.php`）继承自 `MelisTemplatingPlugin`。

| 设置 | 详情 |
| --- | --- |
| 配置插件键 | `tags` · XML DB 键 `TagsList` |
| 配置文件 | `config/plugins/ListPublicationsPlugin.config.php` |
| 前台视图 | `MelisCmsTags/listtags` |
| 设置标签页 | **Template**（模板 + 站点选择） · **Filters**（列 / 排序 / 最小日期 / 最大日期 / 搜索） |

> **命名偏差。**该插件类位于 `ListPublicationsPlugin.php`，随附的 Phtml 视图为 `listpublications.phtml` / `showpublication.phtml` —— 这是历史遗留产物；实际生效的功能是上文的 **List Tags** 插件。

## 数据库表

基础结构见 `install/sql/setup_structure.sql`；迁移见 `install/dbdeploy/`。

| 表 | 存储内容 |
| --- | --- |
| `melis_cms_tag` | 核心标签行：`tag_id`、`tag_creation_date`、`tag_site_id`、`tag_type` |
| `melis_cms_tag_texts` | 按语言的文本：`tag_text_id`、`tag_id`、`tag_title`、`tag_lang_id` |
| `melis_cms_tag_entity` | 标签 ↔ 内容条目关联：`id`、`tag_id`、`entity_id`、`entity_type`（例如 `NEWS`） |

## 服务示例

```php
$tags = $this->getServiceManager()->get('MelisCmsTagsService');

// Tag CRUD
$list = $tags->getTagsList($status, $langId, $start, $limit, $orderCol, $order, $siteId, $search);
$tag  = $tags->getTagById($tagId, $langId);
$id   = $tags->saveTag(['tag_site_id' => $siteId, ...], $tagId); // $tagId null → create
$tags->deleteTagById($tagId);

// Associations — the integration surface for other modules
$tags->saveTagEntity([$tagId1, $tagId2], $entityId, 'NEWS'); // (re)attach a tag set to an item
$set   = $tags->loadTagByEntityIdType($entityId, 'NEWS');    // tags of one item
$items = $tags->loadEntityByTagsId($tagIds, 'NEWS');         // items carrying given tags
$tags->deleteEntities($entityId, 'NEWS');                    // clear an item's tags
$assoc = $tags->getAssociationsByTagId($tagId, $langId);     // items associated to a tag
```

`saveTagEntity()` 会删除该实体现有的关联，然后重新保存所提供的集合 —— 从内容模块的保存流程中调用它，即可让其标签保持同步。

## 让模块可打标签（配置驱动的关联）

在 `config/associations.config.php` 的 `plugins.melis_cms_tag.datas.associations` 下声明映射。随附的 MelisCmsNews 示例：

```php
'associations' => [
    'meliscmsnews' => [
        'module'           => 'MelisCmsNews',       // skipped if module not loaded
        'entity_type'      => 'NEWS',               // stored in melis_cms_tag_entity.entity_type
        'entity_table'     => 'melis_cms_news',
        'entity_primary_id'=> 'cnews_id',
        'trans' => [
            'trans_table'      => 'melis_cms_news_texts',
            'trans_foreign_id' => 'cnews_id',
            'trans_lang_key'   => 'cnews_lang_id',
        ],
        'association_title_key' => 'cnews_title',   // shown in the Associations grid "Title" column
    ],
],
```

然后在内容模块的保存操作中调用 `saveTagEntity()`。在 React News 砖块中，这是通过其自有的 `/melis/react-api/news/tags` 接口面接线的；MelisCmsTags 只拥有标签数据和共享的关联表。

## 关键文件

| 关注点 | 路径 |
| --- | --- |
| 模块配置（路由、内联的 react-api 路由、服务、表单元素） | `vendor/melisplatform/melis-cms-tags/config/module.config.php` |
| React capabilities | `vendor/melisplatform/melis-cms-tags/config/react.capabilities.php` |
| 关联映射 | `vendor/melisplatform/melis-cms-tags/config/associations.config.php` |
| List Tags 插件配置 | `vendor/melisplatform/melis-cms-tags/config/plugins/ListPublicationsPlugin.config.php` |
| React API 控制器 | `vendor/melisplatform/melis-cms-tags/src/Controller/MelisCmsTagsReactApiController.php` |
| 主服务 | `vendor/melisplatform/melis-cms-tags/src/Service/MelisCmsTagsService.php` |
| 前台插件 | `vendor/melisplatform/melis-cms-tags/src/Controller/Plugin/ListPublicationsPlugin.php` |
| 表网关 | `vendor/melisplatform/melis-cms-tags/src/Model/Tables/` |
| React 砖块源码 | `vendor/melisplatform/melis-cms-tags/ui-react/src/`（`TagsPage`、`tags-api.ts`、`ViewToggle`、`ExportModal`） |
| React 砖块构建产物 + 清单 | `vendor/melisplatform/melis-cms-tags/public/ui-react/brick.js` · `brick.manifest.json` |
| 安装 SQL | `vendor/melisplatform/melis-cms-tags/install/sql/setup_structure.sql` |
| 数据库迁移 | `vendor/melisplatform/melis-cms-tags/install/dbdeploy/` |

另请参阅：[melis-cms](/zh/reference/modules/melis-cms)、
[melis-cms-news](/zh/reference/modules/melis-cms-news)、
[melis-front](/zh/reference/modules/melis-front)、
[melis-engine](/zh/reference/modules/melis-engine)、
[melis-core](/zh/reference/modules/melis-core)
