# 配置参考

Melis 中你可以配置的一切，尽收此处：环境变量、平台文件、`app.*.php` 配置文件族、melis 键、翻译、资源和缓存。

## 环境变量

每个安装都由两个变量驱动（在 `docker-compose.yml` 中设置，或通过 Apache `SetEnv` 设置）：

| 变量 | 用途 |
| --- | --- |
| **`MELIS_PLATFORM`** | 选择平台配置 `config/autoload/platforms/<MELIS_PLATFORM>.php`（数据库连接）。例如 `local`、`dev1`。 |
| **`MELIS_MODULE`** | 作为该域名前台（front office）提供服务的**站点模块**（例如 `MelisDemoCms`）。 |
| `MYSQL_HOSTNAME` / `MYSQL_DATABASE` / `MYSQL_USER` / `MYSQL_PASSWORD` | 数据库连接，通常由平台文件通过 `getenv()` 读取。 |

## 平台文件

`config/autoload/platforms/<MELIS_PLATFORM>.php` 保存着**数据库连接**（以及一些主机设置）。它最后被合并，因此会按环境覆盖默认值：

```php
return [
    'db' => [
        'driver'   => 'Mysqli',
        'hostname' => getenv('MYSQL_HOSTNAME') ?: 'localhost',
        'database' => getenv('MYSQL_DATABASE'),
        'username' => getenv('MYSQL_USER'),
        'password' => getenv('MYSQL_PASSWORD'),
        'port'     => '3306',
        'charset'  => 'utf8mb4',
    ],
    'melis_platform'       => getenv('MELIS_PLATFORM'),
    'melis_http_host'      => 'localhost',
    'melis_request_scheme' => 'http',
];
```

加载哪个文件是在 `config/application.config.php`（`config_glob_paths`）中根据 `getenv('MELIS_PLATFORM')` 选择的。

## 项目配置文件

| 文件 | 作用 |
| --- | --- |
| `config/melis.module.load.php` | 要加载的**后台模块**的有序列表。 |
| `config/melis.modules.path.php` | 生成的映射：模块名 → 文件系统路径（由 `MelisAssetManager` 构建）。 |
| `config/application.config.php` | 应用入口：模块装配、glob 路径、缓存标志。 |
| `config/autoload/{global,local}.php` | 标准的 Laminas autoload 配置。 |
| `config/autoload/platforms/<env>.php` | 每个环境的数据库/平台配置（见上文）。 |
| `config/development.config.php` | 开发环境覆盖配置（由 `laminas-development-mode enable` 创建）。 |

## `app.*.php` 配置文件族

每个后台模块都在 `Module::getConfig()` 中合并这些 Melis 专有文件。它们共同构建出一棵位于 `plugins` 根下的单一配置树，可通过 [`MelisCoreConfig`](/zh/guide/concepts#_2-the-config-tree-melis-keys) 查询：

| 文件 | 声明内容 |
| --- | --- |
| `app.interface.php` | UI **区域（zones）**及其 `forward`（module/controller/action）。每个节点包含：`conf`（id、name、icon、`melisKey`、`rightsDisplay`）、`forward`、嵌套的 `interface`。 |
| `app.toolstree.php` | 工具在**左侧菜单**中的挂载位置（`*_toolstree_section`）。 |
| `app.tools.php` | **工具**：数据表格（列、筛选器、操作按钮）、表单。 |
| `app.forms.php` | 可复用的**表单**定义（Laminas form 规范 + `input_filter`）。 |
| `app.emails.php` | 邮件模板配置。 |
| `app.microservice.php` | 可调用的服务方法 API（输入/输出表单）。 |
| `excluded.routes.php` | 绕过鉴权检查的路由。 |

### 约定

- **翻译键**：`tr_<module>_<section>_<item>`（例如 `tr_meliscore_tool_users`）。
- **配置 id**：`id_<module>_<item>`。
- **Melis 键**：声明为 `'conf' => ['melisKey' => '…']` 的简短别名 → 由 `MelisCoreConfig::getMelisKeys()` 解析为完整的配置路径。
- **数据表**：`melis_<area>_<entity>`（例如 `melis_core_user`、`melis_cms_page_published`、`melis_ecom_product`）。
- **路由**：`<module-slug>/<name>`（例如 `melis-backoffice/login`）。

## 翻译

位于每个模块 `language/` 目录下、按语言区域划分的 PHP 数组：

```
language/en_EN.interface.php
language/fr_FR.interface.php   // 'tr_key' => 'Texte'
```

由 `Module::createTranslations()` 为当前语言区域（会话 `melis-lang-locale`）加载，并以 `en_EN` 作为回退。类型包括 `interface`、`forms`、`install`、`setup`。

## 资源（Assets）

`MelisAssetManager` 在 `/<ModuleName>/…` 路径下提供每个模块的 `public/` 文件夹，并生成 `config/melis.modules.path.php`。**站点模块**在 `config/assets.config.php` 中列出其前台的 CSS/JS。可使用 Webpack 打包（构建工具 / 后台操作）。

## 缓存

缓存行为在 `melis-core` 的 `module.config.php` 中配置（`caches` 部分），并通过 `MelisCoreCacheSystemService` 使用。每个缓存都有一个 `active` 标志、一个位于 `cache/` 下的 `cache_dir`，以及按键设置的 TTL。Laminas 的**配置缓存**由 `application.config.php` 中的 `config_cache_enabled` 控制（在此骨架中默认关闭）。有关清除缓存的说明，请参阅[故障排查](/zh/guide/troubleshooting#cache)。

## React 后台配置

v6 React 后台（`/melis-react`）运行在与经典后台（`/melis`）**相同的框架和相同的配置树**之上——上文的所有内容仍然适用。另有两个基础设施模块负责将其接入。二者都通过 `config/application.config.php`（`module_paths` / `modules`，而非 composer autoload）加载，并且都没有任何需要编辑的项目级配置：启用 React 后台只是加载这些模块的事。

| 模块 | 作用 |
| --- | --- |
| `MelisReactApi` | JSON API 的骨干。声明通用的 `/melis/react-api/…` 端点（在其自身的 `config/module.config.php` 中），并托管能力解析器（capability resolver）。不绘制任何 UI。 |
| `MelisReactOverride` | 提供 React 外壳（shell），并将旧版工具以 iframe 形式渲染。覆盖 MelisCore 的 `PluginView` 控制器，并声明外壳/工具路由。 |

### 提供外壳（shell）

React SPA 由 `MelisReactOverride` 的 `SpaController` 在 **`/melis-react`** 及其下的每个深层链接处提供（正则路由 `meliscore-melis-react-spa`，`priority => 1000`）。外壳的 `index.html` 从 **melis-core 的** `public/ui-react/index.html` 读取，并在 `/MelisCore/ui-react/` 处提供——因此 React 构建产物随 `melis-core` 存放，而不在这两个模块中。

由于 React 应用自行处理认证，`MelisReactOverride` 会向 MelisCore 的 `plugins.meliscore.datas.excluded_routes` 追加几条路由（公开访问，不做登录重定向）：SPA 路由本身、`melis-backoffice/react-platform-bundle`，以及两个只读的启动端点 `melis-backoffice/melis-react-api/platformscheme-react-get` 和 `melis-backoffice/melis-react-api/langs`。

### 砖块（Brick）/ 模块发现

外壳在启动时通过 **`GET /melis/react-api/react-modules`** 发现工具，该端点会扫描**处于激活状态**的模块，查找其中的 `public/ui-react/brick.manifest.json`（单个对象或 `bricks: [...]` 数组），并返回砖块定义以及一个拼接后的单一 bundle URL（`GET /melis/react-api/bricks-bundle.js`）。因此，**当且仅当某个砖块所在的模块处于激活状态时**它才会出现——这就是模块化规则；不存在需要维护的独立注册表。附带 React 工具的模块会将其作为砖块提供在自身的 `public/ui-react/` 下。

### 每个模块的 React 配置键

各个工具模块（不是这两个基础设施模块）可以声明 React 配置，并通过其 `Module::getConfig()` 合并进配置树：

| 文件 / 键 | 声明内容 |
| --- | --- |
| `config/react-api.php` | 工具模块自身的 `/melis/react-api/…` 数据路由（例如 `users`、`roles` 定义在 MelisCore / MelisSmallBusiness 中，而**不是**在 MelisReactApi 中）。 |
| `config/react.capabilities.php`（`melisReactToolCapabilities`） | 每个工具 `melisKey` 所拥有的细粒度“高级权限”（`list` / `create` / `edit` / `delete`，或嵌套的 `{ actions, tabs }` 树）。默认是**允许**；拒绝项存储在用户/角色权限 XML 的专用 `<meliscore_tool_capabilities>` 部分中。 |
| `melis_react_override.toolpage_extensions[]` | 实现 `PluginViewToolPageExtensionInterface` 的服务名——针对在 React 外壳中显示的旧版工具，模块可为每个工具做特定处理（HTML/资源调整）。无论加载顺序如何，各处贡献都会累加。 |

基础设施模块本身**不声明**这些键中的任何一个：`MelisReactApi` 是*读取*其他模块能力声明的引擎，而 `MelisReactOverride` 不附带任何砖块、任何 `react-api.php`，也没有任何 `react.capabilities.php`。

## 何处查找

| 关注点 | 路径 |
| --- | --- |
| 模块列表 | `config/melis.module.load.php` |
| 平台数据库 | `config/autoload/platforms/<MELIS_PLATFORM>.php` |
| 配置服务 | `vendor/melisplatform/melis-core/src/Service/MelisCoreConfigService.php` |
| 缓存配置 | `vendor/melisplatform/melis-core/config/module.config.php`（`caches`） |
| 资源管理器 | `vendor/melisplatform/melis-asset-manager/` |
| React API 路由 / 能力解析器 | `vendor/melisplatform/melis-react-api/` |
| React 外壳 + 旧版工具 iframe / SPA 路由 | `vendor/melisplatform/melis-react-override/` |
| React 外壳构建产物（`index.html`、砖块） | `vendor/melisplatform/melis-core/public/ui-react/` |
