# MelisDbDeploy

> Melis 平台的无界面数据库迁移执行器 —— 按顺序应用每个模块的 SQL 增量。软件包 `melisplatform/melis-dbdeploy`。

## 用途

`MelisDbDeploy` 使每个模块的数据库结构与已安装的代码保持同步。每个选择加入的模块，会以有序的 SQL 文件（**增量**，deltas）的形式，将其结构变更放置在 `install/dbdeploy/` 目录下。MelisDbDeploy 会在所有模块中发现这些增量，应用尚未执行的部分，并将每个增量记录到变更日志表中，以确保它只被应用一次 —— 该机制构建于 [Phing](https://www.phing.info/) 的 `DbDeployTask` 之上。

它**没有面向用户的界面**。

## 与 React 后台的关系

MelisDbDeploy **没有 React 工具、没有页面、没有菜单项、也没有路由**。它从不出现在 `/melis-react` 的任何位置。它没有 `ui-react/` 组件块，没有 `config/react-api.php`，没有 `config/react.capabilities.php`，也没有 `src/Controller/` —— 它是一个无界面、仅提供服务的模块。

它与 React 后台的关联完全是**间接的**，通过以下两点体现：

- **它创建 React 工具读写所依赖的表和列。** 每个 React 工具（用户、页面 CMS、站点、媒体……）都会查询数据库表。这些表 —— 以及较新的 React 功能所新增的列 —— 是由所属模块的 `install/dbdeploy/*.sql` 增量创建的，而这些增量正是由 MelisDbDeploy 应用的。如果某个 React 工具在安装或更新后立即报出 "table/column not found"（找不到表/列）错误，通常的原因就是某个迁移尚未运行。
- **它在发布 React 构建产物的部署流水线中运行。** 已提交的 React 构建产物（`melis-core/public/ui-react/`，应用位于 `/melis-react`）由运行结构迁移的同一次部署发布。MelisDbDeploy 负责处理**模块随附的** SQL 增量；**Flyway** 负责处理版本化的平台迁移（`V*.sql`）。它们是同一部署步骤中相互补充的两种机制。

## 启用它

将其添加到 `config/melis.module.load.php` 中：

```php
return [
    'MelisDbDeploy',
];
```

`MelisDbDeploy` 仅依赖 `phing/phing`。它**不**依赖 `melis-core` —— 它是一个独立工具，由 MelisInstaller 以及模块的安装/更新流程调用，从不由 React 调用。

## 让模块选择加入

模块通过在其 `composer.json` 中声明以下内容来参与迁移系统：

```json
"extra": {
    "dbdeploy": true
}
```

其 SQL 增量放置在 `install/dbdeploy/*.sql` 中。每个文件名都以一个数字前缀开头，用于定义执行顺序（例如 `23051701_create_my_table.sql`）。

## 关键服务

| 服务别名 | 职责 |
| --- | --- |
| `MelisDbDeployDiscoveryService` | 查找每个选择加入的 `melisplatform/*` 软件包的增量，并将它们复制到工作缓存（`dbdeploy/data/`），然后委托给部署服务。 |
| `MelisDbDeployDeployService` | 连接数据库，确保变更日志表存在，并通过 Phing 的 `DbDeployTask` + `PDOSQLExecTask` 应用待处理的增量。 |

## 变更日志表

每个已应用的增量都会记录在一个固定的 `changelog` 表中（该表名是 Phing 任务所要求的），它充当"仅应用一次"的账本：

```sql
CREATE TABLE IF NOT EXISTS changelog (
  `change_number` BIGINT NOT NULL,
  `delta_set`     VARCHAR(10) NOT NULL,
  `start_dt`      TIMESTAMP NOT NULL,
  `complete_dt`   TIMESTAMP NULL,
  `applied_by`    VARCHAR(100) NOT NULL,
  `description`   VARCHAR(500) NOT NULL,
  PRIMARY KEY `Pkchangelog` (`change_number`, `delta_set`)
);
```

模型访问通过 `MelisDbDeploy\Model\Table\ChangelogTable`（别名为 `ChangelogTable`）进行。

## 示例

```php
// Discovery — gather deltas from all dbdeploy modules
$discovery = $sm->get(\MelisDbDeploy\Service\MelisDbDeployDiscoveryService::class);
$discovery->setComposer($composer);
$discovery->processing();   // discovers modules and copies their *.sql deltas

// Deploy — apply pending deltas
$deploy = new \MelisDbDeploy\Service\MelisDbDeployDeployService(/* db params */);
if (!$deploy->isInstalled()) {
    $deploy->install();                  // creates the changelog table on first run
}
$count = $deploy->changeLogCount();      // number of deltas applied so far
$deploy->applyDeltaPath($pathToDeltas);  // run any not-yet-applied deltas
```

## 它何时运行

MelisDbDeploy 会在以下两种场景中自动被调用，两者都不涉及 React UI：

- **首次安装** —— 在平台设置向导过程中由 **MelisInstaller** 调用。
- **模块安装/更新** —— 通过后台的模块工具/应用市场，以及 Composer 的 post-update 钩子（`DbDeployOnComposerUpdate::postUpdate()`）调用；该钩子会复制每个模块的增量并反复应用，直到变更日志的数量与增量文件的数量匹配（幂等收敛）。

它不暴露任何控制器。

## 故障排查

如果某个 React 工具在模块安装、更新或部署后立即显示数据为空，或返回 500 / "table doesn't exist"（表不存在）错误，典型的根本原因是**某个 dbdeploy 增量尚未运行**（或缺少某个 Flyway 迁移）—— 而不是 React 代码本身的问题。重新运行迁移流程即可修复。

## 关键文件

| 关注点 | 路径 |
| --- | --- |
| 发现服务 | `vendor/melisplatform/melis-dbdeploy/src/Service/MelisDbDeployDiscoveryService.php` |
| 部署服务 | `vendor/melisplatform/melis-dbdeploy/src/Service/MelisDbDeployDeployService.php` |
| Composer post-update 钩子 | `vendor/melisplatform/melis-dbdeploy/src/DbDeployOnComposerUpdate.php` |
| 变更日志 DDL | `vendor/melisplatform/melis-dbdeploy/data/changelog.sql` |
| 模型 | `vendor/melisplatform/melis-dbdeploy/src/Model/` |
| 模块增量（任意模块） | `vendor/melisplatform/<module>/install/dbdeploy/*.sql` |

另请参阅：[MelisCore](/zh/reference/modules/melis-core) · [MelisInstaller](/zh/reference/modules/melis-installer) · [MelisComposerDeploy](/zh/reference/modules/melis-composerdeploy) · [平台概念](/zh/guide/concepts)
