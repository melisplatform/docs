# MelisAssetManager

> 通过简洁的 URL 提供每个模块的公共资源（CSS、JS、图片），交付编译后的
> React 后台管理包，并作为活动模块发现的权威来源。软件包
> `melisplatform/melis-asset-manager`。

## 用途

MelisAssetManager 在加载时拦截对 `/<ModuleName>/…` 的请求，并从该模块的 `public/`
目录中流式传输匹配的文件，热路径中不包含任何控制器逻辑。首次
启动时，它会在 `config/melis.modules.path.php` 处写入一份模块到路径的映射（要求 `config/`
文件夹可写）。它还提供了平台级的服务，用于查询哪些模块已
安装或处于活动状态，以及通过 webpack 将所有模块的 CSS/JS 编译为传统的生产包。

它是 **MelisCore 平台基础** 的一部分，几乎每个其他
模块都需要它。

## 在 React 后台管理中的角色

该模块 **没有 React 工具，也没有自己的 UI** —— 它没有 brick，没有 `config/react-api.php`
也没有 `config/react.capabilities.php`，并且它从不作为工具出现在 `/melis-react` 中。它对
v6 的意义纯粹在于基础设施：它是将 **编译后的 React SPA 包** 交付给浏览器的
HTTP 交付层。

React 后台管理是一个 Vite 单页应用，其构建输出（JS、CSS、字体、图标、
`index.html`）被提交到 `melis-core/public/ui-react/` 下。对这些文件的请求会到达
以 **`/MelisCore/ui-react/`** 开头的 URL —— 正是 Vite 构建所针对的 `base` —— 并
由为每个模块资源所用的同一个通用 `/<Module>/…` → `<module>/public/…` 解析器提供。其划分如下：

| 层 | 提供方 | URL |
| --- | --- | --- |
| React HTML 外壳 | MelisReactOverride | `/melis-react` |
| React 带哈希的 JS/CSS 包 | **MelisAssetManager** | `/MelisCore/ui-react/…` |

> 如果该模块（或其可写缓存）发生故障，外壳 HTML 可能仍会加载，但带哈希的
> JS/CSS 会返回 **404** 或错误的 **MIME 类型**，因此浏览器拒绝执行该脚本 ——
> 典型症状是 **空白的 `/melis-react`**。常见的根本原因是 `config/`
> 文件夹（及其生成的 `melis.modules.path.php`）对 Web 用户
> （例如 `www-data`）不可写。激活一个新模块会强制重建该缓存；此处的权限失败
> 会削弱资源交付能力。参见 [启用它](#启用它)。

## 启用它

添加到 `config/melis.module.load.php`：

```php
return [
    'MelisAssetManager',
];
```

依赖项：`melisplatform/melis-core`（`^6.0`），PHP `^8.3 | ^8.5`。`config/` 文件夹必须
可写，以便模块能在启动时持久化 `melis.modules.path.php`。

## 交付机制

常见资源路径 **没有控制器** —— 交付是在 `src/Module.php` 中连接的一个加载时解析器：

- **`onBootstrap()`** 在每个请求上调用 **`displayFile($sm)`**。
- **`displayFile()`** 将请求 URI 解析为一个文件：首先它尝试项目主 public
  文件夹（`$_SERVER['DOCUMENT_ROOT'] . $uri`）；否则它将第一个 URI 段视为一个
  模块名，在缓存映射中查找它，并构建 `<modulePath>/public/<rest-of-URI>`。
- **`sendDocument()`** 设置正确的 `Content-Type`（通过 `getMimeType()` +
  `config/mime.config.php`），为静态文件添加 24 小时缓存头，输出字节并终止执行。
  在对所交付的 `.php` 文件进行 `eval` 之前，一个守卫（`isRequestAuthenticated()`）会要求存在有效的会话；
  静态资源保持公开。
- **`checkFileInFolder()`** 强制要求解析后的路径保持在模块的 `public/`
  目录内（路径遍历守卫）。

因此，对 `/MelisCore/ui-react/assets/index-<hash>.js` 的请求会解析出模块 `MelisCore`
并流式传输 `melis-core/public/ui-react/assets/index-<hash>.js` —— 不涉及任何 React 专用代码。

## 模块路径缓存

`displayFile()` 所用的 `<ModuleName> → path` 映射是一个生成的 PHP 文件，位于
`config/melis.modules.path.php`。它由 `src/Module.php` 中的模块加载监听器（重新）构建：

- **`init()`** 将 **`onLoadModulesPost()`** 挂接到 `ModuleEvent::EVENT_LOAD_MODULES_POST`。
- **`onLoadModulesPost()`** 在文件缺失，或某个新激活的模块尚未存在于其中时写入该文件，
  使用 `MelisModulesService` 计算每个模块的路径，然后对其执行 `chmod` 为 `0777`。

除此之外，该模块是 **无状态的** —— 这个生成的文件是它唯一持久化的状态。

## 关键服务

在 `config/module.config.php` 的 `service_manager` 下注册。

| 服务别名 | 角色 |
| --- | --- |
| `ModulesService` | 发现并查询已安装/活动的模块（`MelisModulesService`）。 |
| `MelisWebPackService` | 构建传统的 webpack 包并解析模块资源列表。 |
| `MelisConfig` | 合并并读取平台应用配置树（`MelisConfigService`）。 |

### `MelisModulesService`

关于"哪些模块存在／处于活动状态"的权威服务。由 Modules 工具、
市场、站点模块加载和安装程序使用。

```php
$modules = $sm->get('ModulesService'); // MelisAssetManager\Service\MelisModulesService

$active   = $modules->getMelisActiveModules();        // 当前已启用的模块
$all      = $modules->getAllModules();                // 每一个可发现的模块
$vendor   = $modules->getVendorModules();             // vendor/ 下的模块
$versions = $modules->getModulesAndVersions();        // 模块 => 版本
$deps     = $modules->getChildDependencies($moduleName);
$sites    = $modules->getSitesModules();              // 模板/站点模块
```

完整方法列表：`getMelisActiveModules`、`getModulesAndVersions`、`getComposer`/`setComposer`、
`getUserModules`、`getSitesModules`、`getMelisModules`、`getAllModules`、`getVendorModules`、
`getChildDependencies`。

### `MelisWebPackService`

```php
$webpack = $sm->get('MelisWebPackService');

$assets  = $webpack->getAssets($moduleName);           // 某个模块声明的资源
$merged  = $webpack->getMergedAssets();                // 平台级合并后的集合
$webpack->buildWebPack();                               // 编译包
$file    = $webpack->getWebPackMixStaticFile($asset);  // 解析带哈希/混淆的资源
```

完整方法列表：`getAssets`、`getWebPackMixStaticFile`、`getMergedAssets`、`buildWebPack`、
`setCachedFile`、`getCachedFiles`。

每个模块的 `ressources.build` 配置键（位于模块的 `app.interface.php` 中）声明了
此服务所生产和交付的 `bundle.css` / `bundle.js`。`WebPackController`
（路由 `melis-backoffice/build-webpack` 和 `melis-backoffice/view-assets`）驱动它。

> 此 webpack 管线仅构建 **传统** 后台管理包 —— 它与 React 构建无关。React SPA
> 由 `melis-core/ui-react/` 内的 **Vite** 编译（`npm run build`）
> 并提交到 `melis-core/public/ui-react/`；MelisAssetManager 仅 *交付*
> 这些已构建好的文件，它并不编译它们。

### `MelisConfigService`

一个用于 asset-manager 自身需求的配置合并与翻译辅助工具。关键方法：`getItem`、
`getMelisKeys`、`getFormMergedAndOrdered`、`translateAppConfig`。

## 资源 URL

来自任何模块的资源可通过以下地址访问：

```
/<ModuleName>/css/<file>.css
/<ModuleName>/js/<file>.js
/<ModuleName>/images/<file>.jpg
/MelisCore/ui-react/assets/<file>          # 已提交的 React 包
```

这些映射到各模块的 `public/` 文件夹。回退是项目的主 `public/`。

## 数据库表

无。该模块是无状态的 —— 它唯一持久化的状态是生成的文件
`config/melis.modules.path.php`。

## 关键文件

| 关注点 | 路径 |
| --- | --- |
| 服务别名与资源交付接线 | `vendor/melisplatform/melis-asset-manager/config/module.config.php` |
| 供 `sendDocument()` 使用的扩展名 → MIME 映射 | `vendor/melisplatform/melis-asset-manager/config/mime.config.php` |
| 资源交付 + 模块路径缓存 | `vendor/melisplatform/melis-asset-manager/src/Module.php` |
| 模块发现服务 | `vendor/melisplatform/melis-asset-manager/src/Service/MelisModulesService.php` |
| Webpack/包服务（传统） | `vendor/melisplatform/melis-asset-manager/src/Service/MelisWebPackService.php` |
| 应用配置读取器 | `vendor/melisplatform/melis-asset-manager/src/Service/MelisConfigService.php` |
| 资源/webpack 控制器 | `vendor/melisplatform/melis-asset-manager/src/Controller/` |
| 模块路径映射（生成的） | `config/melis.modules.path.php` |
| 已提交的 React 构建（在此交付，非在此构建） | `vendor/melisplatform/melis-core/public/ui-react/` |

另请参阅：[MelisCore](/zh/reference/modules/melis-core) · [MelisReactApi](/zh/reference/modules/melis-react-api) · [MelisDbDeploy](/zh/reference/modules/melis-dbdeploy) · [MelisComposerDeploy](/zh/reference/modules/melis-composerdeploy) · [MelisInstaller](/zh/reference/modules/melis-installer) · [模块参考](/zh/reference/modules)
