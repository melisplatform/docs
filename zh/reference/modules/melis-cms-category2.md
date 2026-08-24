# MelisCmsCategory2

> 面向 CMS 的多站点、多语言内容分类，配备原生 React 后台——包 `melisplatform/melis-cms-category2`。

## 用途

MelisCmsCategory2 在 Melis 后台中提供了一套分层分类系统。各分类构成一棵树（每个节点指向一个父节点），携带按语言划分的翻译（名称与描述），可限定作用于一个或多个站点，具有有效期时间窗和状态，并可保存媒体文件。该模块附带一个前台模板插件，用于在页面上渲染分类树，还提供一个可复用的分类选择器，供其他模块（如 News、Commerce）嵌入以对其记录进行归类。

在 v6 React 后台（`/melis-react`）中，该工具以**原生纯 React 砖块**的形式提供：一个真正的主从（master-detail）界面——左侧为分类树，右侧为带选项卡的编辑器——通过其自有的 `react-api` JSON 层进行读写。**New / Old** 切换开关可回退到 iframe 中的旧版工具。底层数据模型、服务与前台插件相较于 v5 保持不变。

## 启用

在 `config/melis.module.load.php` 中添加：

```php
return [
    'MelisCmsCategory2',
];
```

依赖 `melis-core` 与 `melis-cms`。该模块已启用 `dbdeploy`，因此其数据表会在部署时创建。前台渲染需要 `melis-engine`。仅当该模块在此处被列出时，React 砖块才会出现在侧边栏中（模块化砖块发现机制）。

## 后台（React）

**位置：** 左侧边栏 → **MelisCms** 分组 → **Categories**（分类，`Catégories`）。它会作为单个主从页面打开——而非多选项卡滑块——路由为 `/melis-cms/category-v2`。右上角的 **New / Old** 切换开关可在 React 界面（默认）与 iframe 中的经典工具之间切换。

![React 分类工具——主从布局：左侧为分类树，右侧为带选项卡的编辑器，右上角为 New/Old 切换开关](/screenshots/react/melis-cms-category2/meliscmscategory2-tool-categories-accordionsystem.png)

### 分类树（左侧窗格）

左侧栏显示整棵树。其工具栏包含一个**语言下拉框**（旗帜——选择以哪种语言显示节点名称）、一个**站点筛选器**、一个**刷新**按钮、一个**搜索**框（会剪除节点但保留祖先节点），以及 **+ New category**（创建根节点/目录）。每一行显示一个**状态圆点**（绿色 = 启用，红色 = 停用）、节点名称，并在悬停时显示一个 **+**（添加子分类）和一个**垃圾桶**（删除）。拖动节点的抓取柄可对其重新排序或更改父节点：靠近顶边 = 放置在其之前，靠近底边 = 放置在其之后（同级），中部 = 放置在其内部（作为最后一个子节点）。仅在完整的未筛选视图中才提供拖动操作。含有子分类的节点无法被删除。

![React 树面板——语言下拉框、站点筛选器、刷新、搜索、+ New category，以及带状态圆点和逐节点添加/删除的树](/screenshots/react/melis-cms-category2/meliscmscategory2-page-plugin-categories-config-properties-search-category.png)

### 编辑器（右侧窗格）

选择一个节点——或点击 **+ New category** / 某一行的 **+**——即可加载编辑器。标题栏显示标题、其上下文（"at the root"（位于根节点）或 "under «parent»"（位于«父节点»下）），以及 **Cancel** / **Save**。

- **Properties 选项卡** — 按语言划分的名称（Name）与描述（Description）（语言选项卡，每种语言带一个已填写/空白的圆点）、一个**状态（Status）**切换开关、**有效期（Validity）**日期（开始 / 结束），以及该分类所属的**站点（Sites）**。至少需在一种语言下填写名称，且至少需选择一个站点；如果同时设置了两个日期，则开始日期必须早于结束日期。
- **Media 选项卡** — 附加**图片（Images）**与**文件（Files）**（两列，各带 **+ Add** 及逐项删除）。添加媒体前请先保存该分类。

![新建分类——Properties 选项卡：语言选项卡、名称、描述、状态切换开关、有效期日期、站点](/screenshots/react/melis-cms-category2/meliscmscategory2-tool-categories-new-tab-properties.png)

![分类编辑器——Media 选项卡：图片网格（+ Add an image）与文件列表（+ Add a file）](/screenshots/react/melis-cms-category2/meliscmscategory2-tool-categories-new-tab-media.png)

## React API

路由位于 `config/react-api.php`，由 `MelisCmsCategory2\Controller\MelisCmsCategoryReactApiController` 提供服务，嵌套在该模块的后台基础路径下，因此实际前缀为 `/melis/MelisCmsCategory2/react-api`。每个响应都遵循 `{ success, data, error }` 契约。该控制器通过参数化 SQL 直接操作数据表，重现了旧版的业务规则（至少 1 种语言的名称、至少 1 个站点、开始 ≤ 结束、排序自动 = max+1、`-1` = 根父节点、含子节点的节点不可删除、级联删除翻译/站点/媒体、加固的媒体上传）。

| 方法与 URL（相对于基础路径） | 用途 |
| --- | --- |
| `GET /tree?lang=` | 完整分类树 → `{langId, nodes:[TreeNode]}`（名称按语言解析，回退情况会被标记） |
| `GET /langs` | CMS 语言 → `{langs:[{id,locale,name}]}` |
| `GET /sites` | 站点（筛选器 + 表单）→ `{sites:[{id,name}]}` |
| `GET /category/:id` | 单个分类 → `{id,parentId,status,dateStart,dateEnd,sites,translations}` |
| `POST /save` | 创建 / 更新分类 → `{id}` |
| `DELETE /delete/:id` | 删除分类（若含子节点则被阻止）并重新排列同级节点 |
| `POST /reorder` | 重新排列某父节点的同级节点（`{parentId, orderedIds:[…]}`）——同时更改父节点 |
| `GET /category/:id/media` | 分类媒体 → `{images:[MediaItem], files:[MediaItem]}` |
| `POST /media/upload` | 分段（Multipart）上传（`catId`、`type` image\|file、`file`）→ `{id,type,path,name}` |
| `DELETE /media/delete/:id` | 删除一条媒体记录及其在磁盘上的文件 |

## 权限能力（Capabilities）

在 `config/react.capabilities.php` 中，于**承载权限**节点 `melis_cms_category_v2_tools_section` 下声明（这同时也是该控制器的 `MELIS_KEY`——而非清单区域键 `melis_cms_categories_v2`，后者仅指向 *Old* iframe）。每个控制器动作都以 `canAccess(MELIS_KEY)` 守护访问。`Capabilities::flatten()` 会将该树转换为传递给 React 中 `makeCan(...)` 的点分字符串：

| 能力 | 控制项 |
| --- | --- |
| `tree.create` | "+ New category" 及逐节点的 "+" 按钮 |
| `tree.order` | 拖动重排的抓取柄（同时要求处于未筛选视图） |
| `tree.delete` | 逐节点的垃圾桶 |
| `edition` | 为已有分类加载编辑器（创建操作仍被允许） |
| `edition.properties` | Properties 选项卡 |
| `edition.media` | Media 选项卡 |

## 砖块

界面在 `ui-react/` 中编写（Vite IIFE，React / ReactRouter 外部化为宿主全局变量，输出到 `public/ui-react/brick.js`，与 `brick.manifest.json` 相邻）。`brick.tsx` 在砖块 id `category2` 下注册一个路由组件。

```json
{
  "id": "category2",
  "route": "/melis-cms/category-v2",
  "label": "Catégories",
  "forwardKey": "MelisCmsCategory2/MelisCmsCategoryList",
  "melisKey": "melis_cms_categories_v2",
  "entry": "brick.js",
  "persistent": true
}
```

| 组件 | 职责 |
| --- | --- |
| `CategoryPage.tsx` | 容器：加载语言 + 站点，按语言（重新）加载树，持有所选节点及 New/Old `mode`，渲染主从布局 + *Old* iframe |
| `CategoryTree.tsx` | 左侧窗格——树、语言下拉框、站点筛选器、搜索、逐节点添加/删除、拖动重排 / 更改父节点 |
| `CategoryEditor.tsx` | 右侧窗格——Properties + Media 选项卡、客户端校验、内联/横幅错误提示 |
| `ViewToggle.tsx` | New（React）/ Old（iframe）切换开关 |
| `category-api.ts` | 面向上述端点的类型化 API 客户端 |

宿主通过 `GET /melis/react-api/react-modules` 发现该砖块并挂载它；`useNavMenu` 将 `forwardKey` 映射到树路由。该砖块从 `document.documentElement.lang` 读取当前语言，并附带一个文件内的 `{fr,en}` 字典。业务逻辑保留在服务端（与旧版工具保持一致）；React 负责呈现 + API 调用。

## 关键服务

| 服务别名 | 职责 |
| --- | --- |
| `MelisCmsCategory2Service` | 主分类服务：创建/读取分类节点、检索树、翻译及站点关联。 |
| `MelisCmsCategory2MediaService` | 按分类在磁盘及数据库中存储文件。 |

`MelisCmsCategory2Service` 上的重要方法：

- `getCategoryTreeview($fatherId, $langId, $onlyValid, $siteId)` — 递归树。
- `getCategoryById($categoryId, $langId, $onlyValid)` — 完整分类节点。
- `getCategoryNameById($categoryId, $langId)` — 名称查找。
- `getCategoriesPerSite($siteId, $langId)`、`getFirstLevelCategoriesPerSite($siteId, $langId)`。
- `saveCategory(...)`、`saveCategoryTexts(...)`、`saveCategorySites(...)` — 持久化节点/翻译/站点。
- `reOrderCategories($parentId, $currentOrder)` — 持久化拖动重排。
- `validateDates($dateStart, $dateEnd)`。

`MelisCmsCategory2MediaService` 负责文件系统一侧：`uploadFile`、`deleteFile`、`getMediaFilesByCategoryId`、`getFilesInDir`、`removeCategoryDir`。

> React 的 `react-api` 控制器使用直接 SQL 而非这些服务，但前台插件和可复用的分类选择器仍会调用 `MelisCmsCategory2Service`。

## 前台

- **模板插件** `MelisCmsCategoryDisplayCategoriesPlugin` — 在页面上渲染分类树。其配置提供一个 Properties 选项卡，含三个字段：`template_path`、`site_id`、`category_start`。默认模板：`MelisCmsCategory2/default`。在 React 页面编辑器中，放置 **Display Categories** 区块，并设置模板、起始分类（树选择器）及站点。
- **视图助手** `renderTreeRec` — 在视图内递归渲染分类树数组。

![Display Categories 插件设置——模板、起始分类（树选择器）、站点](/screenshots/react/melis-cms-category2/meliscmscategory2-page-plugin-categories-config-properties.png)

硬编码用法：

```php
$display = $this->MelisCmsCategoryDisplayCategoriesPlugin();
echo $display->render([
    'template_path' => ['MelisCmsCategory2/default'],
    'site_id'        => 1,
    'category_start' => 1,
]);
```

## 数据库表

| 表 | 存储内容 |
| --- | --- |
| `melis_cms_category2` | 分类节点：`cat2_id`、`cat2_father_cat_id`、排序、状态、引用、有效期日期、审计信息。 |
| `melis_cms_category2_trans` | 按语言划分的翻译：名称与描述，以 `catt2_id` 为键。 |
| `melis_cms_category2_sites` | 分类到站点的关联，以 `cats2_id` 为键。 |
| `melis_cms_category2_media` | 附加到分类的媒体：`catm2_type`、`catm2_path`、`catm2_cat_id`。 |

安装时会插入一个种子根节点（`cat2_id = 1`，"My catalog" / "Mon catalogue"）。

## 关键文件

| 关注点 | 路径 |
| --- | --- |
| React API 路由 + 可调用控制器 | `vendor/melisplatform/melis-cms-category2/config/react-api.php` |
| React 能力声明 | `vendor/melisplatform/melis-cms-category2/config/react.capabilities.php` |
| React API 控制器（10 个动作、直接 SQL、上传加固） | `vendor/melisplatform/melis-cms-category2/src/Controller/MelisCmsCategoryReactApiController.php` |
| React 砖块（Vite IIFE） | `vendor/melisplatform/melis-cms-category2/ui-react/` 及构建产物 `public/ui-react/` |
| 砖块清单 | `vendor/melisplatform/melis-cms-category2/public/ui-react/brick.manifest.json` |
| 主服务 | `vendor/melisplatform/melis-cms-category2/src/Service/MelisCmsCategoryService.php` |
| 媒体服务 | `vendor/melisplatform/melis-cms-category2/src/Service/MelisCmsCategoryMediaService.php` |
| 模板插件 | `vendor/melisplatform/melis-cms-category2/src/Controller/Plugin/MelisCmsCategoryDisplayCategoriesPlugin.php` |
| 安装 SQL | `vendor/melisplatform/melis-cms-category2/install/sql/` |

另请参阅：[melis-cms](/zh/reference/modules/melis-cms)、[melis-core](/zh/reference/modules/melis-core)、[melis-cms-news](/zh/reference/modules/melis-cms-news)
