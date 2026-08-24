# MelisCmsSlider

> 后台幻灯片 / 轮播管理器——现已成为原生 React 后台组件——并附带一个前台模板插件，用于在页面上展示幻灯片。软件包 `melisplatform/melis-cms-slider`。

## 用途

MelisCmsSlider 提供一个后台工具，用于构建**幻灯片**（由有序的幻灯片单元——图片、标题、副标题、链接——组成的命名轮播），以及一个 `MelisCmsSliderShowSliderPlugin` 内容块，用于在任意前台页面上渲染所选的幻灯片。它还提供一个可复用的**幻灯片选择器**表单元素，供其他模块（News、Blog）嵌入，以将幻灯片关联到某个内容项。

在 Melis v6 中，该工具为 `/melis-react` 后台提供了一个**原生的全 React 组件**，并带有一个 **New / Old** 切换开关，可回退到 iframe 中的经典工具。相较于 v5，框架、服务、数据库表和前台插件均未改变。

## 启用

在 `config/melis.module.load.php` 中添加：

```php
return [
    // …
    'MelisCmsSlider',
];
```

依赖项：`melis-core`、`melis-engine`、`melis-front`、`melis-cms`。该模块提供 `dbdeploy: true`，因此其数据表由 melis-dbdeploy 创建/更新。React 组件采用**按激活状态控制**：仅当该模块存在于 `melis.module.load.php` 中时，它才会出现在后台（模块化组件发现机制，详见下文）。

## React 后台

**位置：**左侧边栏 → **MelisCms** 分组 → **Slider**（树路由 `/melis-cms/slider`）。它以名为 **Slider** 的顶部标签页打开。**New / Old** 切换开关（右上角）在 React 界面（*New*，默认）与 iframe 中的旧版工具（*Old*）之间切换。

该工具是一个**三层下钻**结构，以原生宿主**子标签页**的形式呈现：幻灯片列表 → 某个幻灯片的各单元 → 单元表单。

![带有 KPI 卡片、搜索、列管理器、Export 及 New/Old 切换开关的 React 幻灯片列表](/screenshots/react/melis-cms-slider/meliscmsslider-tool-slider-list.png)

### 第 1 层——幻灯片列表

列出平台上的每个幻灯片（幻灯片是全局的；一个幻灯片可以选择性地关联到某个页面）。该列表包含 **KPI 卡片**（幻灯片总数、单元总数、活跃单元数）、一个**搜索**框、一个 **Columns** 管理器、一个 **Export** 按钮以及 **Reset filters**；点击表头即可排序。每一行都提供**打开**（查看其单元）、**重命名**和**删除**操作。

**+ New slider** 打开一个模态框，用于填写**名称**及从站点页面树中选取的可选**关联页面**；同一个模态框也用于重命名已有的幻灯片。

![New slider 模态框——名称加上从页面树中选取的可选关联页面](/screenshots/react/melis-cms-slider/meliscmsslider-tool-slider-new.png)

### 第 2 层——某个幻灯片的各单元

打开一个幻灯片会新增一个子标签页（带 **← Back**），显示该幻灯片的各单元：顺序、状态（绿色 = 活跃）、图片缩略图、标题、副标题和链接。**拖动某一行即可重新排序**；**+ Add a slide** 创建一个新单元；每行可编辑/删除。

![某个幻灯片的各单元——支持拖动重新排序的列表，每行可编辑和删除](/screenshots/react/melis-cms-slider/meliscmsslider-tool-slider-edit-slidelist-tab-properties.png)

### 第 3 层——编辑单元

编辑（或新增）一个单元会打开一个嵌套子标签页，其中包含一个 React 表单：**Title**、**Subtitle 1**、两个 **Description (HTML)** 字段、**Link**、一个 **Active** 切换开关，以及一个 **Image** 面板（预览，**Choose an image** / **Remove image**；支持 JPG、PNG、GIF 或 WebP）。**Save** 保存该单元。Title 和 Subtitle 1 为纯文本；两个 Description 字段为原始 HTML，并映射到 `sub2`/`sub3`。

![React 单元表单——标题、副标题、两个 HTML 描述、链接、Active 切换开关和图片面板](/screenshots/react/melis-cms-slider/meliscmsslider-tool-slider-edit-properties-slide-edit.png)

## React API

该组件通过 `/melis/react-api/sliders` 下的 JSON 层进行读写（路由位于 `config/react-api.php`，控制器为 `MelisReactApiCmsSliderController`）。所有响应均遵循 `{ success, data, error }` 约定；每次请求都会携带 `X-Requested-With: XMLHttpRequest` 并设置 `credentials: 'include'`。

| 方法与 URL | 用途 |
| --- | --- |
| `GET /sliders` | 列出幻灯片（keyset 分页：`limit`、`search`、`sort`、`dir`、`after`），并附带 `slideCount`。 |
| `GET /sliders/stats` | KPI 计数 `{sliders, slides, active}`。 |
| `GET /sliders/:id` | 单个幻灯片 `{id, name, pageId, slideCount}`。 |
| `POST /sliders/save` | 创建 / 重命名幻灯片（`{id?, name, pageId?}`）。 |
| `DELETE /sliders/delete/:id` | 删除一个幻灯片及其单元和图片文件。 |
| `GET /sliders/:id/slides` | 某个幻灯片的有序单元。 |
| `POST /sliders/slides/reorder` | 重新排序（`{sliderId, ids:[…]}`）。 |
| `POST /sliders/slide/upload` | Multipart 图片上传（字段 `image`，`?sliderId=`）→ `{path}`。 |
| `GET /sliders/slide/:id` | 单个单元。 |
| `POST /sliders/slide/save` | 创建 / 更新一个单元。 |
| `DELETE /sliders/slide/delete/:id` | 删除一个单元、重新编排顺序并移除其图片。 |

控制器通过参数化 SQL 直接操作数据表，复现了旧版的业务规则（名称必填且 ≤255、单元顺序自动取 max+1、图片存放于 `/media/sliders/<sliderId>/…` 且扩展名为 jpg/jpeg/gif/png/webp、对链接进行安全 URL 校验、删除时级联清除文件）。更高层的 `MelisCmsSliderService` 仍然为旧版工具和前台插件提供支撑。

## 权能

高级权限在 `config/react.capabilities.php` 中于承载权限的节点 `meliscms_slider_tools_section` 下声明，与三个层级相对应。扁平化的权能字符串（例如 `list`、`create`、`rename`、`export`、`slides`、`slides.create`、`slides.image.create`）在 React 中通过 `MelisCan(melisKey, cap)` 检查，在服务端通过 `denyUnlessCan(cap)` 检查。每个控制器动作都受到双重守护——先是访问守护（`denyUnlessAccess()` → 401/403），然后是权能检查；对于未声明的权能，权能解析器采用**默认允许**策略。

## 宿主集成

| 关注点 | 方式 |
| --- | --- |
| 发现 / 门控 | `GET /melis/react-api/react-modules` 列出提供了 `brick.manifest.json` 的活跃模块；宿主加载 `brick.js` 并挂载该组件。移除该模块即会隐藏该工具。 |
| 菜单 → 路由 | `useNavMenu` 将 `forwardKey` `MelisCmsSlider/MelisCmsSliderList` 映射到 `/melis-cms/slider`。 |
| 子标签页 | `subTabs: true`——该组件通过 `window.__melisOpenSubTab` / `__melisCloseSubTab` / `__melisUpdateSubTabLabel` 驱动宿主的原生子标签栏；每个界面保持挂载（隐藏），以便状态得以保留。 |
| New / Old 切换 | `window.__melisSetToolView(MELIS_KEY, mode)`；*Old* 在 iframe 中渲染 `/melis/react-tool-page?key=MelisCmsSlider_left_menu`。 |
| i18n | 该组件读取 `document.documentElement.lang`，并内置一个文件内 `{fr, en}` 字典。 |

组件 id 为 `slider`（与 `brick.tsx` ⇄ `brick.manifest.json` 匹配）；该 bundle 是一个 Vite IIFE，React 被外置到宿主全局对象上，因此该 UI 使用内联样式和文件内 i18n，而非导入宿主模块。

## 关键服务

它们仍然为旧版工具、微服务和前台插件提供支撑。

| 别名 | 职责 |
| --- | --- |
| `MelisCmsSliderService` | 幻灯片及其单元的业务逻辑；触发 `meliscmsslider_*` 事件。 |
| `MelisCmsSliderTable` | `melis_cms_slider` 的表网关。 |
| `MelisCmsSliderDetailTable` | `melis_cms_slider_details` 的表网关。 |

`MelisCmsSliderService` 继承自 `MelisGeneralService`，并对外提供：

| 方法 | 职责 |
| --- | --- |
| `getSlider($sliderId, $status)` | 单个幻灯片及其各单元；传入 `1` 表示仅取活跃单元。 |
| `getSliderByPageId($pageId, $status)` | 关联到某页面 id 的幻灯片及其各单元。 |
| `getSliderList($start, $limit, $order, $search)` | 分页/可搜索的幻灯片列表。 |
| `getSliderDetails($sliderDetailId)` | 单条单元记录。 |
| `saveSlider($data, $sliderId)` | 创建或更新一个幻灯片；返回幻灯片 id。 |
| `saveSliderDetails($slideData, $detailId)` | 创建或更新一个单元。 |
| `updateSliderDetailsOrdering($detailId, $newOrder)` | 重新排序某个单元。 |
| `deleteSlider($sliderId)` | 删除一个幻灯片及其所有单元。 |
| `deleteSliderDetails($sliderDetailId)` | 删除单个单元。 |

`getSlider()` / `getSliderByPageId()` 返回一个 `MelisCmsSlider\Entity\MelisCmsSlider` 实体，其 `getSlider()` 给出容器记录，`getSliderDetails()` 给出各单元。

**事件命名说明：**每个方法都会触发 `meliscmsslider_service_*_start` / `_end` 事件，但在当前源码中，若干写入方法复用了其他方法的事件名。`saveSlider` 触发 `get_slider_details` 事件，而 `deleteSliderDetails` / `updateSliderDetailsOrdering` 复用了 `deleteSlider` 的 `delete_details` 事件——因此，监听 `meliscmsslider_service_delete_details_end` 的监听器在重新排序时也会被触发。

**微服务**（`config/app.microservice.php`）对外暴露 `getSliderList`、`getSlider`、`getSliderDetails`、`getSliderByPageId`。

## 前台

在 **React 页面编辑器**（MelisCms → 打开一个页面 → Edition）中，打开插件面板并将 **Show Slider** 块拖放到页面上；其 **Properties** 允许你选择渲染模板和要展示的幻灯片。

![React 页面编辑器插件选择器中的 Show Slider 块](/screenshots/react/melis-cms-slider/meliscmsslider-page-menu-plugins-selector.png)

![Show Slider 插件设置——选择模板和要展示的幻灯片](/screenshots/react/melis-cms-slider/meliscmsslider-page-plugin-slider-config-properties-tab.png)

| 项目 | 职责 |
| --- | --- |
| `MelisCmsSliderShowSliderPlugin`（控制器插件） | 通过 `MelisCmsSliderService` 获取所配置的幻灯片，并通过所选模板进行渲染。配置：`config/plugins/MelisCmsSliderShowSliderPlugin.config.php`——一个包含 `template_path` 和 `sliderId` 的 **Properties** 标签页。默认模板：`view/melis-cms-slider/plugins/showslider.phtml`。 |
| `MelisCmsSliderPlugin`（视图助手） | `MelisCmsSliderHelper`——从 phtml 模板渲染该插件。 |
| `CmsSliderSelect`（表单元素） | 由可用幻灯片填充的下拉选择框；工厂 `src/Form/Factory/CmsSliderSelectFactory.php`。用于插件选项表单，并被 News / Blog 嵌入。 |

**可复用选择器接口：**用于 News 的 `meliscmsslider_select_slider`（`renderSelectSliderAction`），用于 Blog 的 `meliscmsslider_select_slider_blog`。

**使用方：**MelisCmsNews 将所选幻灯片持久化于 `cnews_slider_id`，并提供一个监听器，当某个幻灯片被删除时，将其从所有使用它的新闻中解除关联；Blog 使用 `cblog_slider_id`。

## 数据库表

| 表 | 存放内容 |
| --- | --- |
| `melis_cms_slider` | 一个幻灯片：`mcslide_id`、`mcslide_name`、`mcslide_page_id`、`mcslide_date`。 |
| `melis_cms_slider_details` | 一个单元：`mcsdetail_id`、外键 `mcsdetail_mcslider_id`、`mcsdetail_status`、`mcsdetail_title`、`mcsdetail_sub1`–`sub3`、`mcsdetail_link`、`mcsdetail_img`、`mcsdetail_order`。 |

## 示例

```php
$slider = $this->getServiceManager()->get('MelisCmsSliderService');

// Fetch one slider with active slides only
$one    = $slider->getSlider($sliderId, 1);

// Fetch the slider tied to a page
$byPage = $slider->getSliderByPageId($pageId, 1);

// Paginated list
$list   = $slider->getSliderList(0, 10, 'mcslide_id', null);

// Create / update
$id     = $slider->saveSlider($data, $sliderId);
$did    = $slider->saveSliderDetails($slideData, $detailId);

// Reorder
$slider->updateSliderDetailsOrdering($detailId, $newOrder);

// Delete slider + all its slides
$slider->deleteSlider($sliderId);
```

监听某个服务事件：

```php
$sharedEvents->attach(
    'MelisCmsSlider',
    'meliscmsslider_service_delete_details_end',
    $fn,
    50
);
```

## 关键文件

| 关注点 | 路径 |
| --- | --- |
| 模块接线 | `vendor/melisplatform/melis-cms-slider/config/module.config.php` |
| React API 路由 | `vendor/melisplatform/melis-cms-slider/config/react-api.php` |
| React 权能 | `vendor/melisplatform/melis-cms-slider/config/react.capabilities.php` |
| React API 控制器 | `vendor/melisplatform/melis-cms-slider/src/Controller/MelisReactApiCmsSliderController.php` |
| React 组件 | `vendor/melisplatform/melis-cms-slider/ui-react/src/` · `public/ui-react/brick.manifest.json` |
| 后台界面 / 工具 | `vendor/melisplatform/melis-cms-slider/config/app.interface.php` · `app.tools.php` |
| 单元表单 | `vendor/melisplatform/melis-cms-slider/config/app.forms.php` |
| 微服务配置 | `vendor/melisplatform/melis-cms-slider/config/app.microservice.php` |
| 模板插件配置 | `vendor/melisplatform/melis-cms-slider/config/plugins/MelisCmsSliderShowSliderPlugin.config.php` |
| 服务 | `vendor/melisplatform/melis-cms-slider/src/Service/MelisCmsSliderService.php` |
| 实体 | `vendor/melisplatform/melis-cms-slider/src/Entity/MelisCmsSlider.php` |
| 表网关 | `vendor/melisplatform/melis-cms-slider/src/Model/Tables/` |
| 幻灯片选择器工厂 | `vendor/melisplatform/melis-cms-slider/src/Form/Factory/CmsSliderSelectFactory.php` |
| 视图助手 | `vendor/melisplatform/melis-cms-slider/src/View/Helper/MelisCmsSliderHelper.php` |
| 默认前台模板 | `vendor/melisplatform/melis-cms-slider/view/melis-cms-slider/plugins/showslider.phtml` |

另见：[模块参考](/zh/reference/modules) · [旧版 v5 页面](/legacy/reference/modules/melis-cms-slider)
