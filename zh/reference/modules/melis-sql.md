# MelisSql

> React 后台开发者工具中的只读 SQL 查询运行器，以原生全 React 砖块（brick）形式发布。软件包 `melisplatform/melis-sql`。

## 用途

MelisSql 是一个小型开发者工具：一个 **只读 SQL 查询运行器**。你输入一条 `SELECT` 语句，按下 **Run**，匹配的行便会以动态表格形式返回——无需离开后台，也无需打开外部数据库客户端。它使用平台已配置的 `config['db']` 凭据进行连接，因此无需输入任何连接信息。

在 Melis v6 中，该工具以 **原生全 React 砖块** 的形式发布于 `/melis-react`：一个真正的 React 页面，调用单个 `react-api` JSON 端点，并带有一个 **New / Old** 切换开关，可回退到 iframe 中的旧版工具。它是一个仅限管理员使用的诊断和检查工具，并非面向最终用户的功能。

## 启用

在 `config/melis.module.load.php` 中添加：

```php
return [
    'MelisSql',
];
```

只有在 **模块被激活时**，该工具才会出现在 React 后台中（模块化砖块发现机制）。需要 `melisplatform/melis-core` 以及 PHP `^8.1|^8.3|^8.4`。

## 它在 /melis-react 中的位置

左侧边栏 → **Dev Tools** 分组 → **SQL**。它会以名为 **SQL** 的顶部标签页打开。砖块清单（manifest）声明了路由 `/melis-core/sql`，并将菜单 `forwardKey` `MelisSql/List` 映射到它。

它是一个 **单屏工具**：一个页面，包含一个查询框、一个 **Run** 按钮和一个动态结果表格。没有子标签页，也没有下钻。

![React SQL 工具：标题/副标题头部，New/Old 切换开关（右上角），一个带有 `SELECT * FROM my_table LIMIT 10;` 占位符的查询文本区域，"One SELECT statement only, ending with « ; »"（仅限一条以「;」结尾的 SELECT 语句）提示，一个红色的 Run 按钮，以及一张空的结果卡片。](/screenshots/react/melis-sql/melissql-tool-sql.png)

## 使用 React 工具

1. 在查询文本区域中输入 **一条** `SELECT` 语句。
2. 以分号 `;` 结尾。
3. 点击 **Run**（或按下 **Ctrl/Cmd + Enter**）。

查询返回后，会出现一张结果卡片，其中包含：

- 一个 **行数统计**（例如 `12 row(s)`；搜索时显示为 `matches / total`）。
- 一个 **搜索** 框，可跨 **所有** 列（甚至是隐藏列）过滤返回的行。
- 一个 **Columns** 按钮，用于打开列管理器：两个列表（**Visible** / **Hidden**），拖动以隐藏/重新排序，**Reset** 可全部显示。布局会按浏览器分别记住（`localStorage`，键名 `melis-sql-cols-v1`）。
- **表格** 本身：点击表头可 **排序**（升序 → 降序）；可识别的图片二进制数据（例如用户头像）会以缩略图形式内联渲染。

### New / Old 切换开关

右上角的 **New / Old** 切换开关可在两种视图之间切换整个工具。**New**（默认）是 React 界面；**Old** 会在一个单例 iframe（`/melis/react-tool-page?key=melissql_tool`）中渲染旧版工具，并通过 `ResizeObserver` 定位到一个锚点之上。

## 查询规则

该工具会拒绝任何不是单条只读语句的内容，并在红色横幅中显示原因：

| 情形 | 结果 |
| --- | --- |
| 语句不以 `SELECT` 开头 | 被拒绝——*only SELECT queries are allowed*（仅允许 SELECT 查询）。 |
| 末尾没有分号 | 被拒绝——*a query should end with ';'*（查询应以「;」结尾）。 |
| 多于一条语句（多个 `;`） | 被拒绝——*only one query is allowed*（仅允许一条查询）。 |
| 你 **不是** 平台管理员 | 被拒绝——**403 Forbidden**（仅限管理员）。 |
| 查询无法预处理 / 执行失败 | 数据库错误会显示在横幅中。 |

## React API 端点

该模块 **没有** `config/react-api.php`。单个端点通过模块的兜底后台路由（`config/module.config.php`，`/melis/MelisSql[/:controller[/:action]]`）到达，该路由将别名 `MelisSql\Controller\MelisSqlReactApi` 解析为 `MelisSqlReactApiController`（在 `controllers.invokables` 下声明）。契约：`{ success, data, error }`。

| 方法与 URL | 控制器动作 | 用途 |
| --- | --- | --- |
| `POST /melis/MelisSql/MelisSqlReactApi/run` | `runAction` | 校验 + 执行一条只读 `SELECT`，返回 `{ columns, rows, rowCount }` |

请求体：`{ "query": "SELECT … ;" }`。

```ts
// runSqlQuery(query) — the only call the brick makes (ui-react/src/sql-api.ts)
const res = await fetch('/melis/MelisSql/MelisSqlReactApi/run', {
  method: 'POST',
  headers: { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: 'SELECT * FROM melis_cms_page_tree;' }),
})
// → { success: true, data: { columns: string[], rows: Record<string,unknown>[], rowCount: number } }
```

`MelisSqlReactApiController` **继承了旧版的 `ListController`**，以便逐字复用其 `runQuery()` 防护逻辑（相同的、来自 `config['db']` 的 `mysqli` 连接，相同的单语句 / 仅 `SELECT` 校验，相同的已翻译错误消息）。它仅额外添加了 JSON 重组以及下述保护措施。校验/数据库错误会返回 HTTP **200** 并携带 `{ success:false, error }`；认证失败返回 401/403；非 `POST` 请求返回 405。

## 权能（Capabilities）

在 `config/react.capabilities.php` 中声明（通过 `MelisSql\Module::getConfig()` 合并），以该工具的 `melissql_tool` melisKey 为键：

```php
return ['melisReactToolCapabilities' => [
    'melissql_tool' => ['run'],   // one internal cap: the Run (execute-query) action
]];
```

- **`run`** 是一个自定义权能（不属于标准的 `list/create/edit/delete/export` 权能）。它允许管理员 *查看/查阅* 该工具，而不一定被允许 **执行** 查询。
- **前端门控。** `SqlPage` 调用 `useCaps('melissql_tool')` → `can('run')`，只有满足条件时才渲染 **Run** 按钮并启用 Ctrl/Cmd + Enter 快捷键。
- 该文件 **仅为声明式的**（驱动 Users → Rights 复选框）；**真正的强制执行** 是控制器中的访问防护 + `usr_admin` 门控。

## 安全说明

- **仅限管理员。** 控制器会运行 `denyUnlessAccess()`（未认证返回 401，`MelisCoreRights::canAccess('melissql_tool')` 失败返回 403），随后还额外要求 `usr_admin`。`melissql_tool` 权限是可委派的，因此 **仅有权限还不够**——非管理员会得到 **403 Forbidden**。
- **结构上的只读。** `runQuery()` 会拒绝任何不是恰好一条、以 `;` 结尾并以 `SELECT` 开头的语句——没有任何通往 `INSERT`/`UPDATE`/`DELETE`/DDL 的路径。请将对 `runAction`/`runQuery` 的任何改动视为安全敏感操作。
- **敏感列脱敏。** `maskSensitiveColumns()` 会在服务端将名称匹配 `password|passwd|pwd|mot_de_passe|secret|token|api_key` 的列的 *值* 脱敏为 `••••••••`，因此在 `SELECT *` 时哈希值绝不会到达浏览器。它是一道护栏，而非边界。
- **二进制安全的 JSON。** `sanitizeForJson()` 会对非 UTF-8 二进制数据进行 base64 编码，并将可识别的图片二进制数据（例如 `melis_core_user.usr_image`）以 `data:<mime>;base64,…` URI 形式输出，用于内联渲染。
- 避免在超大表上执行无限制的 `SELECT *`：服务端没有分页。

## 关键文件

| 关注点 | 路径 |
| --- | --- |
| 兜底路由、控制器 invokable、Old 视图工具页扩展 | `config/module.config.php` |
| 权能（`melisReactToolCapabilities` → `melissql_tool` → `run`） | `config/react.capabilities.php` |
| 旧版工具 + `runQuery()` 防护（被 API 控制器复用） | `src/Controller/ListController.php` |
| React API 控制器（管理员门控 + 复用 `runQuery` + 脱敏 + JSON 安全） | `src/Controller/MelisSqlReactApiController.php` |
| Old 视图 iframe 的 `toolPageAction()` 特殊处理 | `src/Controller/React/PluginViewToolPageExtension.php` |
| React 砖块源码（Vite IIFE） | `ui-react/src/` — `brick.tsx`、`SqlPage.tsx`、`ViewToggle.tsx`、`sql-api.ts` |
| 构建后的砖块 + 清单 | `public/ui-react/brick.js`、`public/ui-react/brick.manifest.json` |

另请参阅：[MelisCore](/zh/reference/modules/melis-core)
