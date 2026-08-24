# MelisCacheInternal

> 面向 CMS 前台的整页 HTTP 缓存，支持局部（区域）缓存和按页面排除。
> 软件包 `melisplatform/melis-cache-internal`。

## 用途

`MelisCacheInternal` 是位于 MelisFront 渲染管线之前的性能层。它将已发布页面完整渲染后的 HTML（以序列化的 HTTP Response 形式）存储下来，并在后续访问时直接返回，从而跳过整个渲染过程。页面上的各个插件可以配置为按更短的 TTL 刷新（局部/区域缓存），而页面的其余部分保持缓存状态。页面在发布、取消发布或删除时会自动失效，手动清除缓存的审计日志会保留三个月。本模块与 MelisEngine 的通用键/值对象缓存不同——它专门是一个 HTTP 整页缓存。

## 启用

在 `config/melis.module.load.php` 中添加：

```php
return [
    'MelisCacheInternal',
];
```

需要 `melisplatform/melis-cms`。本模块附带数据库迁移（`dbdeploy: true`），必须在首次安装时应用。在 v6 后台中，只有在模块被激活后该工具才会出现——React 宿主通过其 `brick.manifest.json` 发现它（参见 [React 后台](#react-hou-tai)）。

## 核心服务

在 `config/module.config.php` 的 `service_manager` 下注册。使用 `$sm->get('<alias>')` 解析。

| 服务别名 | 作用 |
| --- | --- |
| `MelisCacheInternalService` | 整页缓存操作：`getCacheConfig()`、`getPageCacheByPageIdAndType($pageId, $uri, $methodType)`、`getPageCacheByUrl()`、`saveItem()`、`deleteCacheByPageId()`、`deleteCacheByUrl()`、`deleteCacheByPageIdOrByUrl()`、`deleteAllCache()`、`getMelisCacheSize()`、`hasCache()`。触发 `melis_cache_internal_*_start`/`_end` 事件。 |
| `PartialCachingService` | 局部/区域缓存管理：`getLists()`、`savePartialCaching()`、`deletePartialCaching()`、`getPartialCachingByCode()`、`searchPartialCachingByCode()`，以及 `processedZoneCaching($uri, $response, $pageId, $type)`——区域刷新引擎，在缓存命中时仅重新渲染已过期的区域。 |

React 后台复用这些相同的服务和数据表，因此 React 路径重现了完全一致的旧版行为（配置是单例 upsert，排除项批量替换，`deleteCacheByUrl` 处理 `*` 通配符/REGEXP）。

## 请求周期机制

监听器在 `Module.php` 中按渲染模式挂接：

| 监听器 | 事件 | 作用 |
| --- | --- | --- |
| `MelisCacheInternalPageGetCacheListener` | `MvcEvent::EVENT_DISPATCH`（优先级 10） | **提供**——缓存命中时，输出已存储的响应并短路渲染（添加 `Melis-Cache: Hit` 头）。 |
| `MelisCacheInternalPageSaveCacheListener` | `MvcEvent::EVENT_FINISH`（优先级 -1001） | **存储**——渲染后，将 200 响应保存到缓存中。 |
| `MelisCacheInternalViewResultListener` | `melisengine_melistemplating_view_result_plugin_end` | 用局部缓存元数据（`data-pcache-code`、`data-pcache-gendate`、插件名/id/dbkey）包裹每个插件的输出。 |
| `MelisCacheInternalCmsPageListener` | `meliscms_page_publish_end` / `…_unpublish_end` / `…_delete_end` | **使**页面缓存**失效**并将局部插件配置持久化到页面中。 |
| `MelisCacheInternalDeleteCacheListener` | `melis_cache_delete_cache` | 按需通过 `pageId` 或 `pageUrl` 使缓存失效。 |
| `MelisCacheInternalSaveEditionSessionListener` | `meliscms_page_savesession_plugin_start` | 将插件的局部缓存配置暂存到会话中以备发布。 |
| `MelisCacheInternalGetPluginParametersListener` | `melistemplating_plugin_update_parameters` | 将局部缓存设置注入到插件的后台编辑表单中。 |
| `MelisCacheInternalPartialCachingFormConfigListener` | `ModuleEvent::EVENT_LOAD_MODULES_POST` | 为每个前台插件的模态框添加局部缓存表单选项卡。 |
| `MelisCacheInternalFlashMessengerListener` | `meliscacheinternal_save_cache_end` | 闪现消息（flash-messenger）与活动日志记录。 |

**缓存键** = `页面 id + 归一化 URL + 请求方法`（1 = GET，2 = POST）。归一化 URL 是指在生成键之前会剥离 `melis_cache_url_parameters` 中列出的 URL 参数，因此诸如 `utm_source` 之类的跟踪参数不会使缓存碎片化。缓存值（`mc_cache_content`）是一个序列化的 HTTP Response（正文 + 头），而不是原始的 HTML 数据块。所有设备共享同一个缓存响应（假定采用响应式布局）。

## 局部（区域）缓存

完整缓存的页面可以让各个插件以更短的 TTL 保持刷新：

- `MelisCacheInternalViewResultListener` 在渲染时用 `data-pcache-*` 元数据（缓存代码和生成日期）包裹每个插件的输出。
- 在缓存**命中**时，`PartialCachingService::processedZoneCaching()` 解析这些标记，并针对每个 TTL 已过期的区域，仅重新渲染该区域。类型 `PLUGIN` 会重新渲染模板插件；类型 `MANUAL` 会转发到配置好的 `module/controller/action`。
- **局部缓存代码**（`melis_cache_partial_codes`）定义区域的类型、代码、TTL（`mcpc_time`）以及 MANUAL 目标。
- **主插件**配置（`melis_cache_partial_general_site_plugins`）是一个站点级的基础配置，会传播到所有页面；`_exclusion` 行则将某个插件从指定页面的缓存中排除。

## React 后台 {#react-hou-tai}

在 v6 中，该工具以**原生全 React brick** 形式提供——一个位于左侧菜单的工具（**Melis Cache**），其各个界面是**工具内选项卡**，而非宿主子选项卡。可在 **侧边栏 → MelisCms → Melis Cache**（`fa fa-bookmark`）下找到，挂载于 `/melis-cms/cache-internal`。标题栏带有 *"Platform cache management"*（平台缓存管理）副标题、一个跟随当前活动选项卡的**刷新**按钮、一个全局**保存**按钮，以及一个 **New / Old** 切换开关：*New* 是 React UI（默认）；*Old* 则在一个持久化 iframe（`/melis/react-tool-page?key=MelisCacheInternal_tool`）中渲染经典工具。

四个选项卡：

| 选项卡 | 内容 |
| --- | --- |
| **Properties**（属性） | 数据库中的完整缓存大小、*Activate the cache system*（激活缓存系统）开关、*cache time in seconds*（缓存时间，秒）（TTL）、GET/POST 请求类型复选框，以及页面排除树（每个页面可切换 GET/POST）。由全局标题栏的**保存**按钮持久化。 |
| **Partial Caching**（局部缓存） | 局部缓存代码的 CRUD 列表，带 KPI 卡片（Total / Manual / Plugin）、搜索、列管理器、Export（导出）和 **+ Add**（添加）。列：Id、Partial Caching Code、Type、Module、Controller、Action、Cache lifetime in seconds、Methods。 |
| **URL Parameters**（URL 参数） | 生成缓存键时被忽略的查询参数名的 CRUD 列表（Total KPI、搜索、Export、**+ Add**）。例如添加 `utm_source`，使链接的各种变体共享同一个缓存条目。 |
| **Cache Clearing**（清除缓存） | 按 URL 清除的表单（URL 以 `/` 开头，`*` 作为通配符），外加清除日志审计表（KPI 卡片 Total / Today / Users；列 Id、URL Cleared、Date、User；偏移分页）。保留 3 个月。 |

![Properties 选项卡——数据库中的完整缓存大小、Activate the cache system 开关、cache time in seconds、GET/POST 请求类型复选框，以及带 GET/POST 标记的按页面排除树](/screenshots/react/melis-cache-internal/meliscacheinternal-tool-cache-tab-properties.png)

![Partial Caching 选项卡——代码表（Id、Partial Caching Code、Type、Module、Controller、Action、Cache lifetime in seconds、Methods）上方的 KPI 卡片（Total / Manual / Plugin）、搜索、Columns 管理器、Export 和 + Add](/screenshots/react/melis-cache-internal/meliscacheinternal-tool-cache-tab-partialcaching.png)

![URL Parameters 选项卡——被忽略的查询参数表（Id、Parameter）上方的 Total KPI、搜索、Export 和 + Add，用于避免跟踪参数使缓存碎片化](/screenshots/react/melis-cache-internal/meliscacheinternal-tool-cache-tab-urlparameters.png)

![Cache Clearing 选项卡——按 URL 清除的表单（URL 以 / 开头，* 作为通配符），带 KPI 卡片（Total / Today / Users）以及带分页的清除日志审计表（Id、URL Cleared、Date、User）](/screenshots/react/melis-cache-internal/meliscacheinternal-tool-cache-tab-cacheclearing.png)

常见任务：开启缓存 / 设置 TTL → *Properties → Activate → cache time → 勾选 GET/POST → Save*；阻止某个页面被缓存 → *Properties → 在树中勾选该页面的 GET/POST → Save*；添加局部规则 → *Partial Caching → + Add*；忽略某个跟踪参数 → *URL Parameters → + Add*；立即清除某个 URL → *Cache Clearing → 输入 URL → Clear cache*。

## React API

React UI 与由**本模块自身的控制器**（子命名空间 `MelisCacheInternal\Controller\React`，在 `config/module.config.php` 中注册）提供的 JSON API 通信——**而非** `melis-react-api`。基路径 `/melis/MelisCacheInternal/react-api`。每个 action 都继承 `MelisAbstractActionController`，以 `MELIS_KEY = 'MelisCacheInternal_tool'` 为键，通过 `denyUnlessAccess()` + `denyUnlessCan()` 守护访问，并返回 `{ success, data, error }`。

| 方法及 URL（相对于基路径） | 用途 |
| --- | --- |
| `GET /config` | 设置 + 缓存大小 + 页面排除项 |
| `POST /config/save` | 保存设置（单例 upsert）+ 批量替换页面排除项 |
| `POST /config/empty-cache` | 清空整个缓存 |
| `POST /config/clear-cache` | 按 URL 模式清除（不记录日志） |
| `GET /page-tree?nodeId=` | 用于排除项的惰性加载页面树（`nodeId=-1` = 根） |
| `GET /partial-caching` · `/stats` · `/:id` | 键集列表 · KPI · 单个代码 |
| `POST /partial-caching/save` · `/delete/:id` | 创建 / 更新 · 删除一个代码 |
| `GET /url-parameters` · `/stats` · `/:id` | 键集列表 · KPI · 单个参数 |
| `POST /url-parameters/save` · `/delete/:id` | 创建 / 更新 · 删除 |
| `GET /clearing-logs` · `/stats` | 偏移分页日志 · KPI（total / today / users） |
| `POST /clearing-logs/clear-cache` | 按 URL 清除**并记录日志** |

```ts
const BASE = '/melis/MelisCacheInternal/react-api'
// save config + page exclusions (bulk replace)
await apiFetch<null>('/config/save', {
  method: 'POST',
  body: JSON.stringify({ active: true, time: 3600, requestType: ['GET'],
    pageExclusions: [{ pageId: 42, excludeGet: true, excludePost: false }] }),
})
// create a partial-caching code
await apiFetch<{ id: number }>('/partial-caching/save', {
  method: 'POST',
  body: JSON.stringify({ type: 'PLUGIN', code: 'NEWS_LATEST', time: 60,
    module: '', controller: '', action: '', requestGet: true, requestPost: false }),
})
```

每个 fetch 都会发送 `X-Requested-With: XMLHttpRequest`；带正文的 POST 会添加 `Content-Type: application/json`。React 控制器复用本模块的 Laminas 服务和数据表；旧版控制器仍然为 *Old* 视图提供支持。

## 能力（Capabilities）

高级权限在 `config/react.capabilities.php` 中的权限承载节点 `MelisCacheInternal_tool` 下声明（与 manifest、*Old* 视图 iframe 和访问守卫使用相同的 `melisKey`）。它是一棵按选项卡组织的树；`Capabilities::flatten()` 会将其转换为点号分隔的字符串，React 通过 `useCaps('MelisCacheInternal_tool').can('…')` 读取：

```
MelisCacheInternal_tool
├─ tab "config"   actions: edit                                  (Properties — save settings)
├─ tab "partial"  actions: list · create · edit · delete · export   (Partial Caching CRUD)
├─ tab "params"   actions: list · create · edit · delete · export   (URL Parameters CRUD)
└─ tab "logs"     actions: list · clear · export                 (Cache Clearing — logs + clear by URL)
```

选项卡可见性通过 `can('config'|'partial'|'params'|'logs')` 过滤；各项操作按叶子节点分别控制（例如 config 的 Save 按钮由 `can('config.edit')` 控制）。每个服务端操作都受到两重守护——`denyUnlessAccess()`（认证 + `MelisCoreRights::canAccess`），然后是 `denyUnlessCan('<leaf>')`——并且对于未声明的工具/能力，`Capabilities` 默认为允许。

## 数据库表

| 表 | 存储内容 |
| --- | --- |
| `melis_cache` | 缓存条目：`mc_page_id`、`mc_cache_url`（归一化）、`mc_cache_content`（序列化 Response）、`mc_cache_date`、`mc_cache_method_type`（1 GET / 2 POST）。 |
| `melis_cache_config` | 全局配置：`mcc_active`、`mcc_time`（TTL 秒）、`mcc_request_type`（GET, POST）。 |
| `melis_cache_exclusions` | 按页面排除：`mce_page_id`、`mce_request_get`、`mce_request_post`。 |
| `melis_cache_partial_codes` | 局部缓存区域规则：`mcpc_type`（MANUAL/PLUGIN）、`mcpc_code`、`mcpc_time`（TTL）、`mcpc_module/controller/action`。 |
| `melis_cache_partial_general_site_plugins` | 站点级主插件配置：`mcpg_site_id`、`mcpg_page_id`、`mcpg_plugin_*`、`mcpg_cache_code`。 |
| `melis_cache_partial_general_site_plugins_exclusion` | 将插件从缓存中按页面排除。 |
| `melis_cache_url_parameters` | 被忽略的查询参数名（`mcup_name`）。 |
| `melis_cache_clearing_logs` | 审计日志：`mccl_cache_url`、`mccl_user_id`、`mccl_clearing_date`。 |

## 示例

以编程方式删除某个特定页面的缓存：

```php
// In a controller or service with the service manager available
$cacheSrv = $sm->get('MelisCacheInternalService');

// Invalidate by page ID
$cacheSrv->deleteCacheByPageId($pageId);

// Invalidate by URL
$cacheSrv->deleteCacheByUrl('/my-page');

// Check whether a cached entry exists
$hasCache = $cacheSrv->hasCache($pageId, $normalisedUrl, $methodType); // 1=GET, 2=POST
```

## 核心文件

| 关注点 | 路径 |
| --- | --- |
| 模块引导（监听器挂接） | `vendor/melisplatform/melis-cache-internal/src/Module.php` |
| 模块配置（服务、控制器、表别名、React 路由） | `vendor/melisplatform/melis-cache-internal/config/module.config.php` |
| React 能力树 | `vendor/melisplatform/melis-cache-internal/config/react.capabilities.php` |
| React API 控制器 | `vendor/melisplatform/melis-cache-internal/src/Controller/React/` |
| React brick 源码 / 构建 | `vendor/melisplatform/melis-cache-internal/ui-react/` → `public/ui-react/brick.js` + `brick.manifest.json` |
| 整页缓存服务 | `vendor/melisplatform/melis-cache-internal/src/Service/MelisCacheInternalService.php` |
| 局部/区域缓存服务 | `vendor/melisplatform/melis-cache-internal/src/Service/PartialCachingService.php` |
| 提供监听器（缓存命中） | `vendor/melisplatform/melis-cache-internal/src/Listener/MelisCacheInternalPageGetCacheListener.php` |
| 存储监听器（缓存保存） | `vendor/melisplatform/melis-cache-internal/src/Listener/MelisCacheInternalPageSaveCacheListener.php` |
| CMS 页面失效监听器 | `vendor/melisplatform/melis-cache-internal/src/Listener/MelisCacheInternalCmsPageListener.php` |
| 数据库迁移 | `vendor/melisplatform/melis-cache-internal/install/dbdeploy/` |

## 另请参阅

- [melis-cms](/zh/reference/modules/melis-cms) — 其发布事件会触发缓存失效的 CMS。
- [melis-front](/zh/reference/modules/melis-front) — MelisCacheInternal 所包裹的渲染管线。
- [melis-engine](/zh/reference/modules/melis-engine) — 平台的通用对象缓存（与本模块不同）。
- [模块参考](/zh/reference/modules) — 所有平台模块。
