# MelisPhpinfo

> 只读诊断工具，在 Melis React 后台中渲染 PHP 原生的 `phpinfo()`。软件包 `melisplatform/melis-phpinfo`。

## 用途

MelisPhpinfo 是一个单屏的开发者工具（Dev Tools）模块，它捕获 `phpinfo()` 的输出并在 Melis 管理后台中显示，让管理员无需 shell 访问权限即可检查服务器的 PHP 版本、已加载的扩展、`php.ini` 指令、环境变量和路径。它没有数据库、服务或模型层——只有一个控制器和三个视图区域。在 v6 中，它作为 React 后台里的**iframe 砖块（brick）**发布：React 页面挂载一个持久化的 iframe，在 React 外壳内加载现有的旧版工具。它没有 React API 层，也没有 capabilities 文件。

::: warning 安全提示
`phpinfo()` 会暴露敏感细节——绝对路径、已加载的模块、环境变量（可能包含凭据/API 密钥）以及构建标志。该工具被特意归入**Dev Tools**；请将其限制给受信任的管理员，并在分享任何截图之前遮蔽机密信息。
:::

## 启用

添加到 `config/melis.module.load.php`：

```php
return [
    'MelisPhpinfo',
];
```

需要先加载 `MelisCore`。只有在该模块被激活时，React 砖块才会出现——砖块发现（`GET /melis/react-api/react-modules`）会列出附带 `brick.manifest.json` 的已激活模块；停用该模块会移除对应的菜单节点。

## 后台（React）

该工具出现在左侧边栏的 **MelisCore → Dev Tools → PHP Info** 下。它以名为 **PHP Info** 的顶部标签页打开，显示经过样式适配以契合 Melis 管理后台的完整 `phpinfo()` 报告；首次加载 iframe 时会短暂出现一个加载动画。报告可能很长，因此请在工具区域内滚动以到达指定的部分（Core、扩展、路径、环境）。它只有一个视图——没有新/旧切换开关——并且没有任何内容可编辑。

## 砖块结构解析

React 端的存在形式是一个**iframe 砖块**：`PhpinfoPage.tsx` 未实现任何原生 React UI。它创建一个持久化的 iframe（`id="melis-brick-frame-phpinfo"`），其 `src` 为 `/melis/react-tool-page?key=melis_phpinfo_tool`，将其一次性追加到 `<body>`，随后在标签页切换时只对锚点 `<div>` 上方的 iframe 进行定位/显隐，因此它永远不会重新加载。iframe 目标——由 **MelisReactOverride** 提供——渲染经典的旧版 PHP Info 工具。

| 项 | 值 |
| --- | --- |
| 砖块 id | `phpinfo` |
| 清单 `route` | `/melis-core/phpinfo` |
| `label` | `PHP Info` |
| `forwardKey` | `MelisPhpinfo/List` |
| `melisKey`（iframe 目标） | `melis_phpinfo_tool` |
| `entry` | `brick.js` |
| React API | 无（没有 `config/react-api.php`） |
| Capabilities | 无（没有 `config/react.capabilities.php`）——通过 `melis_phpinfo_tool` 权限进行访问门控 |

清单（`public/ui-react/brick.manifest.json`）：

```json
{
  "id": "phpinfo",
  "route": "/melis-core/phpinfo",
  "label": "PHP Info",
  "forwardKey": "MelisPhpinfo/List",
  "melisKey": "melis_phpinfo_tool",
  "entry": "brick.js"
}
```

## 访问权限

没有细粒度的 capabilities：访问是全有或全无的，由 `melis_phpinfo_tool` 工具权限门控。只有当用户 `canAccess('melis_phpinfo_tool')` 时，React 菜单才会发出该节点（拥有 `usr_admin=1` 的超级管理员，或被授予该权限的用户）。旧版内容视图在运行 `phpinfo()` 之前会在服务器端重新校验同一权限，因此即使对内容区域手工构造请求，其他人也只会得到空响应。

```php
// src/Controller/ListController.php — renderToolContentAction()
$view->accessAllowed = $this->isPhpinfoAccessAllowed(); // only then does the view run phpinfo()
// isPhpinfoAccessAllowed(): authenticated identity + MelisCoreRights::canAccess('melis_phpinfo_tool')
```

## 视图区域

旧版工具（在 iframe 中加载）由三个区域组成，在 v6 中保持不变：

| 区域标识符 | 作用 |
| --- | --- |
| `melis_phpinfo_tool` | 容器——转发到 `MelisPhpinfo/List/render-tool` |
| `melis_phpinfo_header` | 标题栏（`render-tool-header`） |
| `melis_phpinfo_content` | `phpinfo()` 报告（`render-tool-content`） |

## 实现细节

`phpinfo()` 的输出完全在视图层生成。控制器的各个操作返回一个空的 `ViewModel`，不从 PHP 向视图传递任何数据；报告视图捕获并清洗输出：

```php
ob_start();
phpinfo();
$phpInfoContent = ob_get_clean();
// Strip phpinfo()'s own <style> so the page inherits Melis admin CSS
$filtredPhpInfoContent = preg_replace('/<style\b[^>]*>(.*?)<\/style>/is', '', $phpInfoContent);
echo $filtredPhpInfoContent;
```

业务逻辑保留在服务器端：React 砖块只是嵌入在 React 外壳中的旧版 PHP Info 工具。

## 关键文件

| 关注点 | 路径 |
| --- | --- |
| 砖块入口点 | `ui-react/src/brick.tsx`（注册 id `phpinfo` → `PhpinfoPage`） |
| React 页面（iframe 包装器） | `ui-react/src/PhpinfoPage.tsx` |
| 构建产物 / 清单 | `public/ui-react/brick.js` · `public/ui-react/brick.manifest.json` |
| 菜单 / 区域注册 | `config/app.toolstree.php` |
| 工具配置 | `config/app.tools.php` · `config/app.interface.php` |
| 路由 + 控制器注册 | `config/module.config.php` |
| 控制器（3 个轻量操作，带访问门控） | `src/Controller/ListController.php` |
| 报告视图 | `view/melis-phpinfo/list/render-tool-content.phtml` |

另请参阅：[MelisCore](/zh/reference/modules/melis-core)
