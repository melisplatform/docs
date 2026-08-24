# MelisCron

> 后台计划任务管理器：定义 CLI 或 HTTP 任务并设置灵活的调度计划，按需运行或通过每分钟触发的 CLI 运行器运行，并查看完整的运行历史 —— 现由原生 React 工具驱动。软件包 `melisplatform/melis-cron`。

## 用途

MelisCron 用一份托管的任务列表替代了手写的 crontab 行。每个任务指向一条 **CLI 命令** 或一个 **HTTP URL**，并声明其运行时机（每 N 分钟/小时/天，每小时、每天、每周或每月）。每次执行都会记录到历史表中，包含状态、耗时和捕获的输出。计划执行仍需要在操作系统层面设置一条 crontab 条目，每分钟调用 `melis:cronexec` 运行器；React 工具仅负责定义、记录以及（按需）触发任务。

## 启用它

添加到 `config/melis.module.load.php`：

```php
return [
    'MelisCron',
];
```

需要 **MelisCore**（由平台提供）。Composer 依赖：PHP `^8.1|^8.3`、`ext-curl`、`composer/composer ^2.9.6`、`laminas/laminas-cli ^1.5`。仅当模块被激活时，React 工具才会出现（模块化砖块发现机制）。

## 后台（React）

**侧边栏 → MelisCore → Dev Tools → Scheduled Tasks**，与 Melis Phpinfo 和 SQL Tool 并列。它以名为 **Scheduled Tasks**（计划任务）的顶部标签页打开，并作为 **原生纯 React 砖块** 提供（砖块 id 为 `cron`，melisKey 为 `cron_tool`），带有 **New / Old** 切换开关：*New* 为 React 界面（默认）；*Old* 则在 iframe 中渲染旧版 jQuery 工具。

由于 cron 任务会运行任意 CLI 命令和 HTTP 调用，因此在服务端，除了权限检查之外，**创建 / 编辑 / 运行** 操作仅限平台 **管理员** 使用。

### 任务列表

该列表显示每个计划任务，并配有 **KPI 卡片**（总计 / 活跃 / 非活跃）、一个 **搜索** 框（按名称和目标）、**状态**（全部 / 活跃 / 非活跃）和 **类型**（CLI / HTTP）筛选器、**重置筛选**、一个（可持久化的）**列** 管理器、一个 **导出** 和一个 **刷新** 按钮。点击列标题可排序。每一行都有三个逐行操作：**立即运行**（▶）、**编辑** 和 **删除**（删除时也会移除该任务的历史记录）。右上角按钮：**History**（历史）、**New / Old** 切换开关，以及 **+ New task**（新建任务）。表单和历史页面会作为原生 **子标签页** 在 Scheduled Tasks 标签页内打开，各自保持其状态。

![React Cron 工具：KPI 卡片、搜索、状态和类型筛选器、列、导出、New/Old 切换开关、历史和 + New task，以及逐行的运行/编辑/删除操作](/screenshots/react/melis-cron/meliscron-tool-cron-list.png)

### 创建 / 编辑任务

**+ New task**（或某一行的编辑铅笔图标）会在子标签页中打开一个双面板 React 表单：

- **标识 + 目标** —— **Name**（名称）、**Type**（类型，CLI / HTTP 分段切换）和 **Target**（目标，例如 `cache:clear` 这样的 CLI 命令，或 HTTP URL），并附有随类型变化的提示。
- **选项** —— 一个 **Active**（活跃）切换开关和 **Schedule**（调度）选择器。选定某个调度计划后会显示其编辑器：*Interval*（间隔）= 数值 + 单位（分钟/小时/天）；*Hourly*（每小时）= 一小时中的第几分钟；*Daily*（每天）= 小时 + 分钟；*Weekly*（每周）= 星期按钮 + 小时 + 分钟；*Monthly*（每月）= 月中的第几天 + 小时 + 分钟。

![React 新建任务表单 —— Name、Type（CLI/HTTP）、带类型感知提示的 Target，以及带有 Active 切换开关和 Schedule 编辑器（Interval —— 每 15 分钟）的选项面板](/screenshots/react/melis-cron/meliscron-tool-cron-new.png)

**Save**（保存）会持久化该任务。校验（客户端与服务端同步进行）：名称必填（≤ 100 字符），目标必填（≤ 255 字符），类型必须为 CLI/HTTP，且调度选项对所选类型有效。

![编辑 "CRON 1"（一个目标为 /my-url、每 15 分钟运行的 HTTP 任务）—— 相同的双面板表单，已从该任务预填充](/screenshots/react/melis-cron/meliscron-tool-cron-edit.png)

### 立即运行与历史

逐行的 **Run**（▶）按钮会请求确认，随后 **立即执行该任务**（同步、在请求内执行）并将结果 —— 状态、HTTP 任务的 HTTP 状态码、耗时 —— 作为通知报告，同时写入一条历史记录。此操作会绕过调度计划。

!["Run task" 确认对话框 —— "Are you sure you want to perform 'CRON 1' now?"，带 Cancel / Run 按钮](/screenshots/react/melis-cron/meliscron-tool-cron-run.png)

**History** 按钮会在子标签页中打开 **Execution history**（执行历史）页面：KPI 卡片（执行次数 / 成功 / 失败 / 运行中）、筛选器（按名称和日志搜索、任务下拉、状态下拉、起始/结束日期范围），以及一个运行记录表（任务、类型、状态、耗时、运行日期、重跑标记）。逐行的 **Logs**（日志）弹窗会显示执行详情（目标、排队/运行日期、耗时、HTTP 代码）以及原始捕获的日志。

## React API

路由位于 `config/react-api.php`，控制器为 `MelisCron\Controller\MelisReactApiCronController`。全部位于 `/melis/react-api/crons` 之下，契约为 `{ success, data, error }`。

| 方法与 URL | 操作 | 用途 |
| --- | --- | --- |
| `GET /crons` | `list` | 列出任务（键集分页：`limit`、`search`、`active`、`type`、`sort`、`dir`、`after`） |
| `GET /crons/stats` | `stats` | KPI `{total, active, inactive}` |
| `GET /crons/:id` | `get` | 单个任务 |
| `POST /crons/save` | `save` | 创建 / 更新任务（已校验）—— **仅管理员** |
| `DELETE /crons/delete/:id` | `delete` | 删除任务及其历史 |
| `POST /crons/run/:id` | `run` | **立即** 执行任务（同步）—— **仅管理员** |
| `GET /crons/history` | `history` | 运行历史（筛选 `cronId`、`state`、`search`、`startDate`、`endDate`、`page`、`limit`） |
| `GET /crons/history/:id` | `historyDetail` | 单次执行 + 完整日志 |

每个操作都会先调用 `denyUnlessAccess()`（认证 + `MelisCoreRights::canAccess('cron_tool')`）。变更类操作还会加上 `denyUnlessAdmin()`（拦截非 `usr_admin`）和 `denyUnlessCan(cap)`。读取和 CRUD 通过参数化 SQL 访问这两张表；`run` 委托给 `MelisCronService::runTaskNow($id)`。

### 权限（Capabilities）

在 `config/react.capabilities.php` 的 `cron_tool` 节点下声明 —— 一份扁平的 CRUD 列表：

```php
'melisReactToolCapabilities' => [
    'cron_tool' => ['list', 'create', 'edit', 'delete', 'export', 'run'],
],
```

在 React 中，`useCaps('cron_tool').can(cap)` 会对 UI 进行门控（隐藏 **+ New task**、逐行操作、导出）。该模型为 **默认允许** 并带有 **管理员绕过**；在此之上，创建/编辑/运行被硬性限制为仅管理员可用。

## 核心服务 —— `MelisCronService`

```php
$cron = $sm->get('MelisCronService');

$cron->getActiveTasks();
$cron->saveItem($data, $id);   // fires events
$cron->deleteItem($id);

// Job queue
$cron->addJob($cronId, $forceRun);       // inserts a 'pending' row in melis_cron_history
$cron->getPendingJobs();
$cron->updateProcessingJob($jobId);      // claims job: pending → processing
$cron->finishJob($jobId, $data);         // writes state/duration/logs/status
$cron->runTaskNow($id);                  // synchronous execution used by the React Run action

// Helpers
$cron->getDateLastRunByCron($cronId);
$cron->getWordingScheduleType($type, $optionsJson);
```

**触发的事件：** `cron_service_get_list_start`、`meliscron_service_get_list_end`、`meliscron_service_get_listhistory_end`、`meliscron_service_save_item_start`/`_end`、`meliscron_service_delete_item_start`/`_end`。

## 数据库表

| 表 | 存储内容 |
| --- | --- |
| `melis_cron` | 任务定义：`cron_id`、`cron_name`、`cron_active`、`cron_target`、`cron_type`（ENUM `CLI\|HTTP`）、`cron_schedule_type`（ENUM `every\|hourly\|daily\|weekly\|monthly`）、`cron_schedule_options`（JSON） |
| `melis_cron_history` | 运行记录：`id`、`cron_id`、`state`（ENUM `pending\|processing\|success\|error`）、`date_add`、`rerun`、`date_run`、`duration`、`logs`、`status` |

### `cron_schedule_options` JSON 结构

| `cron_schedule_type` | JSON 结构 |
| --- | --- |
| `every` | `{ "everyItem": "minutes\|hours\|days", "everyValue": N }` |
| `hourly` | `{ "hourlyValue": MM }` |
| `daily` | `{ "dailyHour": HH, "dailyMinute": MM }` |
| `weekly` | `{ "weeklyDays": [1..7], "atHour": HH, "atMinute": MM }`（ISO 星期，周一=1） |
| `monthly` | `{ "monthlyDay": D, "atHour": HH, "atMinute": MM }` |

## 运行器设置

计划执行由 `MelisCron\Command\ExecCommand` 驱动，它以 **`melis:cronexec`** 名称注册到 laminas-cli。在服务器 crontab 中添加一行：

```cron
* * * * * cd /path/to/project && php vendor/bin/laminas melis:cronexec --env=production >/dev/null 2>&1
```

每次触发（tick）执行两个阶段：

1. **`scheduleTasks()`** —— 根据当前时间评估每个活跃任务的调度计划；为任何到期的任务调用 `addJob()`。
2. **`runJobs()`** —— 认领每个待处理作业（`pending → processing`），然后在 **PHP Fiber** 中执行以实现并发：
   - **HTTP** —— 对 `cron_target` 执行 `curl` GET；记录 HTTP 状态码和响应正文。
   - **CLI** —— 对 `cron_target` 执行 `exec()`；非零退出码会将状态设为 `error`。

对于无法使用 CLI crontab 的环境，可在 `/melis/MelisCron/Cron/execute` 使用一个 HTTP 回退触发器。

> 调度分辨率为一分钟（即触发节奏）。若没有该 crontab 行，任务虽已定义，但只会在通过 **立即运行** 手动触发时才会执行。

另见：[MelisCore](/zh/reference/modules/melis-core)
