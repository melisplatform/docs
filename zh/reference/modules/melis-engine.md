# MelisEngine

> 共享的 CMS 数据基础——页面模型、站点、语言、模板插件基类以及渲染缓存。软件包 `melisplatform/melis-engine`。

## 用途

MelisEngine 拥有整个 CMS 数据库模型（页面、页面树、站点、模板、语言、域名、SEO、样式），并通过表网关、服务和多层缓存对外暴露。[MelisFront](/zh/reference/modules/melis-front)（前端渲染）和 [MelisCms](/zh/reference/modules/melis-cms)（后台编辑）都只能通过 MelisEngine 进行读写——两个同级模块本身都不拥有任何数据表。它同时定义了 `MelisTemplatingPlugin`，即平台中每个内容插件所继承的抽象基类。

## 在 React 后台中的角色

MelisEngine **没有 React 后台工具，也没有自己的 UI**——没有 brick，没有 `config/react-api.php`，没有能力（capabilities），在 `/melis-react` 中也没有侧边栏入口。它**没有迁移到 React，并且也不打算迁移**：它是平台基础设施，而非后台工具。它与 React 外壳的关系完全在幕后进行，分为两条路径：

- **数据路径**——React CMS 控制器（`MelisReactApi*`，它们位于 CMS 模块中，而非本模块中）**只**通过 MelisEngine 的 `MelisEngineTable*` 网关和服务（`MelisEnginePage`、`MelisEngineTree`、`MelisEngineLang` 等）读写页面、站点、语言、模板和 SEO。React 层从不直接接触 CMS 模式（schema）。
- **渲染路径**——在 React 页面编辑器和旧版 iframe 工具中展示的 CMS 内容是在**服务端**渲染的（页面 → 模板 → 区域 → 插件）。引擎负责解析页面模型并定义插件基类；MelisFront 执行实际的渲染。React 嵌入服务端渲染的结果，而不是在客户端重新渲染 CMS 内容。

由于它虽不可见但却是承重的，引擎问题会*在 React CMS 工具内部*显现出来——空白的页面树、始终为空的语言下拉框、加载时报错的页面编辑器——这些通常由缺失/滞后的 CMS 表或某个失效的引擎服务引起，而绝非由某个引擎界面引起（因为根本没有引擎界面）。

## 启用它

MelisEngine 作为依赖被自动加载。在 `config/melis.module.load.php` 中的加载顺序为：

```php
// config/melis.module.load.php
return [
    'MelisCore',
    'MelisFront',
    'MelisEngine',   // requires melis-core + melis-front
    'MelisCms',
];
```

Composer 依赖：`melisplatform/melis-core` `^6.0`、`melisplatform/melis-front` `^6.0`、`laminas/laminas-cache`（filesystem + memory 适配器）。运行于 PHP `^8.3 | ^8.5`。

## 核心服务

在 `config/module.config.php` 中注册为 `service_manager` 别名：

| 服务别名 | 角色 |
| --- | --- |
| `MelisEnginePage` / `MelisPageService` | 按 id 和模式（`published` / `saved`）解析页面：`getDatasPage($idPage, $mode)`——返回已填充的页面树、页面数据、SEO、模板和样式对象 |
| `MelisEngineTree` / `MelisTreeService` | 页面树导航：`getPageChildren()`、`getPageFather()`、`getPageBreadcrumb()`、`getPageLink()`、搜索 |
| `MelisEngineTemplateService` | 模板查询：`getTemplate($tplId)` |
| `MelisEngineSiteService` | 站点目录 |
| `MelisEngineSiteDomainService` | 域名 → 站点解析：`getSiteByDomain()` |
| `MelisEngineLang` / `MelisEngineLangService` | 语言：可用语言、locale ↔ id、站点语言 |
| `MelisEngineSEOService` | 单页 SEO 数据：`getSEOById()` |
| `MelisEnginePageDefaultUrlsService` | 预计算 / 规范页面 URL 查询 |
| `MelisEngineStyle` / `MelisEngineStyleService` | 站点样式和单页 CSS |
| `MelisEngineCacheSystem` | 缓存编排器：`getCacheByKey()`、`setCacheByKey()`、`deleteCacheByPrefix()` |
| `MelisSearch` | 供前端搜索使用的全文（Lucene 风格）页面索引 |
| `MelisEngineSendMail` | 邮件工具 |
| `MelisGdprService` / `MelisGdprAutoDeleteService` | GDPR 横幅文本及自动删除框架 |
| `MelisEngineComposer` | Composer / 依赖操作 |

所有继承 `MelisGeneralService` 的服务都会触发 `*_start` / `*_end` 事件（例如 `melisengine_service_get_available_languages_start` / `_end`），其他模块可以挂接这些事件。

### React 消费方（已验证）

以下是 React CMS 工具通过引擎调用的官方数据路径入口点：

| 引擎服务 / 网关（别名） | 使用方（React 后台） |
| --- | --- |
| `MelisEnginePage` (`MelisPageService`) | melis-cms `MelisReactApiPageController`——为 React 页面编辑器提供页面数据 |
| `MelisEngineTree` (`MelisTreeService`) | melis-cms `MelisReactApiPageController`——页面树导航 |
| `MelisEngineLang` (`MelisEngineLangService`) | melis-cms `MelisReactApiCmsSitesController`、`MelisReactApiCmsMenuManagerController`——可用的 CMS 语言 |
| `MelisEngineTableCmsLang` (`MelisCmsLangTable`) | melis-cms-tags、melis-cms-user-account、melis-core（GDPR）——React 语言下拉框 |

别名 `MelisEngineTableCmsLang => MelisCmsLangTable::class` 注册于 `config/module.config.php` 中。

## 后台

MelisEngine 无论是在旧版后台还是在 `/melis-react` 中，都没有自己面向最终用户的工具。它注册了两个在整个后台中使用的表单元素工厂：

| 工厂 | 用途 |
| --- | --- |
| `MelisEnginePluginTemplateSelect` | 用于插件表单的模板选择元素 |
| `MelisEngineSiteSelect` | 用于插件表单的站点选择元素 |

安装与维护控制器（`MelisSetup*`）也存在，但它们由安装程序调用，而非由编辑者调用。

## 前台

每个内容插件的基类都位于此处：

| 项 | 描述 |
| --- | --- |
| `MelisEngine\Controller\Plugin\MelisTemplatingPlugin` | 所有内容插件的抽象基类。定义了 `front()`（实时渲染，抽象方法）、`back()`（后台容器/编辑视图）、配置 XML 持久化（`loadDbXmlToPluginConfig()` / `savePluginConfigToXml()`）、GET/POST 加载、预览模式和响应式宽度。 |

每个平台内容插件（News、Slider、Menu、Breadcrumb 等）都继承此类。实现 `front()` 以进行实时输出；基类会自动处理 `back()`。同一条插件流水线也为 React 页面编辑器提供支持：MelisFront 在服务端渲染每个区域的插件，React 显示其结果。

两个微服务监听器挂接 `melis_core_microservice_amend_data`，以便通过平台微服务层暴露页面树和页面方法（`getPageChildren`、`getPageFather`、`getDomainByPageId`、`getDatasPage`）。

## 数据库表

MelisEngine 是 CMS 模式的唯一可信来源（`install/sql/setup_structure.sql` + `install/dbdeploy/` 增量）：

| 表 | 存储内容 |
| --- | --- |
| `melis_cms_page_tree` | 页面层级（`tree_father_page_id`、顺序） |
| `melis_cms_page_published` | 每个页面的已发布（线上）版本 |
| `melis_cms_page_saved` | 已保存 / 草稿版本（在后台中编辑） |
| `melis_cms_page_lang` | 页面 ↔ 语言关联 |
| `melis_cms_lang` | CMS 语言 / locale |
| `melis_cms_site` | 站点（页面树的根） |
| `melis_cms_template` | 模板（布局 / 控制器 / 动作或 PHP 路径） |
| `melis_cms_page_seo` | 单页 SEO（URL、301 重定向、meta 标题/描述、canonical） |
| `melis_cms_site_domain` | 各环境下的站点域名 |
| `melis_cms_site_301` / `melis_cms_site_404` | 站点级 301 重定向 / 404 映射 |
| `melis_cms_page_default_urls` | 预计算的页面 URL（缓存表） |
| `melis_cms_style` / `melis_cms_page_style` | CSS 样式和页面 ↔ 样式关联 |
| `melis_cms_platform_ids` | 各环境下的页面 id 分配区间 |
| `melis_cms_site_config` / `_home` / `_langs` | 站点配置、各语言的首页、启用的语言 |
| `melis_cms_site_robot` | 各域名的 robots.txt |
| `melis_cms_mini_tpl_*` | 迷你模板分类、模板和标志 |
| `melis_cms_gdpr_texts` | 各站点 / 语言的 GDPR 横幅文本 |
| `melis_site_translation` / `_text` | 站点级翻译字符串 |

### 表网关

每个表都由一个在服务管理器中注册的 `MelisEngineTable*` 网关封装（例如 `MelisEngineTablePageTree`、`MelisEngineTablePagePublished`、`MelisEngineTablePageSeo`）。其他模块——无论是旧版还是 React——都必须始终使用这些网关，绝不能使用原始 SQL。基础网关提供 `getEntryById()`、`getEntryByField()`、`save()`、`deleteById()`、`fetchAll()`。

## 示例

**读取一个页面并遍历页面树：**

```php
$pageSvc = $sm->get('MelisEnginePage');
$page    = $pageSvc->getDatasPage($idPage);            // 'published' (live) by default
$draft   = $pageSvc->getDatasPage($idPage, 'saved');   // draft shown in the React page editor

$tree       = $sm->get('MelisEngineTree');
$children   = $tree->getPageChildren($idPage, 1);       // 1 = published only
$breadcrumb = $tree->getPageBreadcrumb($idPage);
$url        = $tree->getPageLink($idPage, true);        // true = absolute URL
```

**从 CMS 控制器填充 React 语言下拉框（服务端，委托给引擎）：**

```php
// Inside a MelisReactApi* controller of a CMS module — the React JSON layer
// delegates to the engine; MelisEngine exposes no react-api of its own.
$langTable = $sm->get('MelisEngineTableCmsLang');
$langs     = $langTable->fetchAll()->toArray();   // fills a React language dropdown
```

**通过表网关读写（绝不使用原始 SQL）：**

```php
$seoTable = $sm->get('MelisEngineTablePageSeo');
$seo      = $seoTable->getEntryByField('plang_page_id', $idPage)->current();
$seoTable->save(['seo_meta_title' => 'New title'], $existingSeoId);  // upsert
```

**缓存一个计算结果：**

```php
$cache = $sm->get('MelisEngineCacheSystem');
$cache->setCacheByKey('mykey', 'my_cache_config', $value);
$value = $cache->getCacheByKey('mykey', 'my_cache_config');
$cache->deleteCacheByPrefix('page_' . $idPage, 'meliscms_page');   // invalidate a page
```

**监听一个服务事件：**

```php
$sharedEvents->attach('MelisEngine', 'melisengine_page_getdatas_end', function ($e) {
    $p = $e->getParams();   // includes page id and 'results'
    // alter $p['results'] before it is returned
}, 50);
```

**构建一个内容插件：**

```php
// Subclass MelisTemplatingPlugin, implement front() for live render.
// The base class handles back() (BO container), config XML persistence and preview.
class MyPlugin extends MelisEngine\Controller\Plugin\MelisTemplatingPlugin
{
    public function front(): string
    {
        return $this->getView()->render('my-module/plugin/my-plugin', $this->pluginConfig);
    }
}
```

## Core / Engine / Front 三件套

React 后台并未改变这个三件套；它构建于其之上：

- **MelisEngine** *（本模块）*——拥有整个 CMS 数据库模型，并通过表网关 + 服务 + 缓存对外暴露；定义 `MelisTemplatingPlugin`。
- **MelisFront**——根据引擎的数据渲染页面（运行内容插件），并为后台内部使用的可编辑预览提供支持（旧版*以及* React 页面编辑器 / iframe 工具）。
- **MelisCms**——CMS 后台；它**不拥有任何表**，一切都通过引擎进行编辑。它的 React CMS 工具（`MelisReactApiPage`、`MelisReactApiCmsSites`、`MelisReactApiCmsMenuManager` 等）就是上面列出的 React 消费方。

## 关键文件

| 关注点 | 路径 |
| --- | --- |
| 服务与网关别名、缓存 | `vendor/melisplatform/melis-engine/config/module.config.php` |
| 页面数据服务 | `vendor/melisplatform/melis-engine/src/Service/MelisPageService.php` |
| 页面树 / 链接服务 | `vendor/melisplatform/melis-engine/src/Service/MelisTreeService.php` |
| 缓存编排器 | `vendor/melisplatform/melis-engine/src/Service/` (`MelisEngineCacheSystem*`) |
| 模板插件基类 | `vendor/melisplatform/melis-engine/src/Controller/Plugin/MelisTemplatingPlugin.php` |
| 表网关 | `vendor/melisplatform/melis-engine/src/Model/Tables/` |
| 模式 + 增量迁移 | `vendor/melisplatform/melis-engine/install/sql/` |

另请参阅：[MelisFront](/zh/reference/modules/melis-front) · [MelisCms](/zh/reference/modules/melis-cms) · [MelisCore](/zh/reference/modules/melis-core)
