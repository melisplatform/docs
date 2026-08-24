# 故障排查与运维

一份实战指南，涵盖你实际会遇到的问题，附带原因与修复方法。当某个东西"不显示"时，答案几乎总是 **模块 / 权限 / 缓存**。

在 v6 中，后台是位于 `/melis-react` 的 **React 外壳**，但其底层的框架、模块和配置保持不变——因此这里的大多数修复仍然是服务端的。当某个工具没有原生 React 页面时，外壳会在 iframe 中渲染经典工具（`/melis/react-tool-page?key=<melisKey>`），而原生 React "brick" 工具会带有一个指向同一经典界面的 **New (React) / Old (iframe)** 切换开关。搞清楚你正在查看的是哪一层，往往是诊断的第一步。

## 首先打开错误显示

默认情况下，Melis 对错误保持沉默。启用 **开发模式** 以查看它们：

```bash
vendor/bin/laminas-development-mode enable     # status | enable | disable
```

这会加载 `config/development.config.php`，禁用配置/模块缓存，并设置 `error_reporting(E_ALL)`。PHP 警告也会由 `MelisCorePhpWarningListener` 呈现出来。错误报告/显示还可以额外通过 `/meliscore/datas/errors` 下的 Melis 配置来驱动。

请注意，React API 端点返回的是 JSON 而非 HTML：一次失败的启动调用会返回 `{ success: false, error: … }`（例如 `{ success:false, error:'Unauthenticated' }`，HTTP 状态码 401），所以要查看网络（Network）标签页，而不仅仅是页面本身。iframe 内的旧版工具仍会像在 `/melis` 下一样显示其自身的原生错误（gritter 提示、逐字段校验弹窗）。

::: warning 空白页面、HTTP 200、没有错误？
Melis 使用输出缓冲；在启动/渲染期间发生的致命错误可能导致一个 **空的 200** 响应。要查看被吞掉的异常，可临时在 `public/index.php` 中为 `MvcEvent::EVENT_DISPATCH_ERROR` / `EVENT_RENDER_ERROR` 挂接一个监听器（将 `Application::init()` 包裹在 try/catch 中并打印 `exception` 参数），或者启用开发模式。
:::

## 缓存

陈旧的缓存是"我改了配置但什么都没变"的头号原因。缓存位于 `cache/` 目录下：

```
cache/meliscore_platform_cache-*   # backoffice zones / platform config
cache/meliscms_page-*              # rendered CMS pages
cache/config/                      # merged Laminas config (if enabled)
```

可通过删除相关文件夹来清除它们，或通过 API `MelisCoreCacheSystemService::deleteCacheByPrefix('*', 'meliscore_platform_cache')`。Melis 还会在模块管理和权限变更时自动清除缓存。在编辑 `config/melis.module.load.php` 或任何 `app.*.php` 之后，**清除 `cache/melis*` 并重新加载**。

在后台中，你可以从 **Cache** 工具清除缓存（其 React 界面带有与经典工具相同的标签页）。参见 [MelisCacheInternal](/zh/reference/modules/melis-cache-internal)。

当界面看起来陈旧时，React 外壳有它自己的一层缓存需要留意：

- 拼接后的 **bricks 打包文件**（`/melis/react-api/bricks-bundle.js?v=<sig>`）以 1 年 immutable 方式提供；其 `?v=` 签名（每个 brick 的名称+mtime+大小）会在 brick 文件变更时自动改变，因此一次 **强制刷新** 即可获取新的打包文件。
- **SPA 外壳**（`index.html`）以 `no-cache` 方式提供，但它引用的带哈希的 JS/CSS 资源是按内容哈希并缓存的——同样，强制刷新即可解决。
- 如果某个工具 iframe 在一次 **Modules** 变更后加载时样式损坏或 DataTable 为空，那么 `etc/bundles/` 下的平台资源打包文件可能已被清空；它们会自愈（在下次工具页面渲染时重新生成），但你也可以通过重新加载该工具来强制触发。

## 常见陷阱

### 某个模块不出现
| 原因 | 修复 |
| --- | --- |
| 不在加载列表中 | 将它添加到 `config/melis.module.load.php`。 |
| 缓存陈旧 | 清除 `cache/melis*` 并重新加载。 |
| 路径未映射 | 确保它在生成的 `config/melis.modules.path.php` 中（由 `MelisAssetManager` 重新生成）。 |

### 工具存在但不在左侧菜单中 / "You don't have access to this tool"
React 左侧菜单（`GET /melis/react-api/menu`）是经过 **权限过滤** 的导航树——与之前相同的 `melis_core_user.usr_rights` XML 白名单，只是改由外壳来消费。

| 原因 | 修复 |
| --- | --- |
| 用户缺少权限 | 在 **Users → Rights** 中授予该工具的 `*_toolstree_section`，或通过迁移授予（参见 `flyway/sql/V3__add_melisai_rights.sql`）。 |
| 权限被缓存在会话中 | 权限在登录时加载，并由 `MelisCoreCheckUserRightsListener` 定期刷新——修改后请 **注销 / 重新登录**。 |
| 用户处于非激活状态 | `usr_status` 必须为 `1`。 |
| brick 所属模块未激活 | 原生 React 工具（brick）**当且仅当** 其模块处于激活状态时才会出现——外壳通过 `GET /melis/react-api/react-modules` 发现 brick。请启用该模块。 |

> **空的** `usr_rights` 意味着完全访问权限（在为空时 `isAccessible()` 返回 true）——但对于带有显式白名单的普通用户，缺失的 section 会被隐藏。

### 即使我能打开某工具，其按钮/标签页仍被禁止访问（HTTP 403）
v6 在已授权的工具 *内部* 增加了 **高级权限**（"capabilities"）——即 **Users → Rights** 中细粒度的 List / Create / Edit / Delete / 逐标签页复选框。

| 原因 | 修复 |
| --- | --- |
| capability 被拒绝 | 该工具的控制器调用了 `denyUnlessCan(<cap>)`，而你的权限 XML 拒绝了该 cap。请在 **Users → Rights**（高级权限矩阵）中取消对它的拒绝。 |
| 被缓存在会话中 | capabilities 通过启动调用 `GET /melis/react-api/me`（`data.capabilities`）返回——编辑权限后请 **注销 / 重新登录**。 |

> capabilities 是 **默认允许** 的：没有声明的工具，或未被拒绝的 cap，仍然完全可用；**管理员** 会完全绕过它。拒绝项存放在权限 XML 中专门的 `<meliscore_tool_capabilities>` section 内，因此它们不会影响经典后台。

### 旧版工具在 React 外壳内加载为空 / 其按钮无反应
当某个工具没有原生 React 页面时，它会通过 `/melis/react-tool-page?key=<melisKey>` 在 iframe 中渲染。那里出现空的 DataTable 或失效的按钮，几乎总是由于 **缺少模块资源**（它自己的 `*.tool.js`/CSS 未被注入）。

| 原因 | 修复 |
| --- | --- |
| 模块资源未加载 | 工具页面会注入每个模块的 `ressources`；一个新贡献的、附带了页面未知 JS 的标签页/按钮，需要注册其插件根目录（或使用 `toolpage_extensions` 钩子——参见 [创建工具](/zh/guide/create-a-tool)）。 |
| 与 `/melis` 对比 | 直接在 `/melis` 打开同一个工具（或通过该工具的 **Old** 切换开关）。如果它在那里也是坏的，那么问题出在工具本身，而不是 React 框架。 |

### 数据库连接错误
| 原因 | 修复 |
| --- | --- |
| 平台文件缺失 | `config/autoload/platforms/<MELIS_PLATFORM>.php` 必须存在并与 `MELIS_PLATFORM` 环境变量匹配。 |
| 凭据错误 | 检查平台文件消费的 `MYSQL_*` 环境变量。 |

### 资源（CSS/JS）404
| 原因 | 修复 |
| --- | --- |
| 模块未映射 | 检查 `config/melis.modules.path.php`。 |
| 打包文件未构建 | 重新构建资源（Webpack 构建 / `vendor/bin/phing`）。 |
| 样式表以 HTML 形式返回 | 过期的会话曾经会将打包请求重定向到 HTML 登录页面（浏览器会因 MIME 类型不符而拒绝）；v6 在 `/melis/react-platform-bundle` 以正确的类型提供平台打包文件，并保持其公开可访问——强制刷新即可清除这种陈旧的拒绝状态。 |

### 翻译显示为原始的 `tr_…` 键
| 原因 | 修复 |
| --- | --- |
| 未设置区域设置 | 当前区域设置来自会话（`melis-lang-locale`）；React 头部的语言切换器会写入它（`GET /melis/react-api/langs`）。 |
| 文件缺失 | 添加 `language/<locale>.interface.php`；`en_EN` 是回退项。 |

## 数据库 schema（dbdeploy 与 flyway）

- **dbdeploy**（[MelisDbDeploy](/zh/reference/modules/melis-dbdeploy)）会在 `composer update` 时运行（post-update 钩子），以应用每个模块编号的 SQL 增量，并在 `changelog` 表中进行跟踪。
- **flyway**（[MelisFlyway](/zh/reference/modules/melis-flyway)）会应用 `flyway/sql/` 中的项目迁移（`flyway -configFiles=flyway/conf/flyway.conf migrate`）。

## CLI 与构建工具

```bash
vendor/bin/laminas-development-mode {status|enable|disable}   # dev mode
flyway -configFiles=flyway/conf/flyway.conf {migrate|info|repair}   # DB migrations
vendor/bin/phing                                             # build assets/bundles
```

`composer update` 会通过 `composer.json` 的 `post-update-cmd` 触发 Melis 钩子（模块部署 + dbdeploy）。

## 该去哪里查看

| 关注点 | 路径 |
| --- | --- |
| 开发模式模板 | `config/development.config.php.dist` |
| 缓存 API | `vendor/melisplatform/melis-core/src/Service/MelisCoreCacheSystemService.php` |
| 权限刷新 | `vendor/melisplatform/melis-core/src/Listener/MelisCoreCheckUserRightsListener.php` |
| PHP 警告 | `vendor/melisplatform/melis-core/src/Listener/MelisCorePhpWarningListener.php` |
| 模块装配 | `vendor/melisplatform/melis-core/src/MelisModuleManager.php` |
| React API（menu / me / capabilities） | `vendor/melisplatform/melis-react-api/src/Controller/MelisReactApiController.php` |
| React 外壳 / iframe 工具页面 | `vendor/melisplatform/melis-react-override/src/Controller/PluginViewController.php` |
| Flyway 配置 | `flyway/conf/flyway.conf`，迁移文件位于 `flyway/sql/` |
