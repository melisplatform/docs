# MelisCalendar

> 后台日程安排工具，内置原生 React 月历、拖放事件以及仪表盘小组件。软件包 `melisplatform/melis-calendar`。

## 用途

MelisCalendar 是平台的日历 / 事件排期工具：在交互式月视图网格上展示带日期的事件，支持拖放创建以及拖放重新排期。在 v6 React 后台（`/melis-react`）中，它以 **原生全 React 砖块** 的形式提供——一个自定义月视图网格，支持原生（及触控）拖放——并通过 `react-api` JSON 层进行读写。**New / Old** 切换开关允许用户回退到嵌入 iframe 中的旧版 FullCalendar 工具。事件是 **平台级全局** 的（一份共享的团队日程，不与具体站点绑定）。

## 启用

在 `config/melis.module.load.php` 中添加：

```php
return [
    'MelisCalendar',
];
```

唯一的必需依赖是 `melisplatform/melis-core`。只有在该模块处于激活状态时，该工具才会出现在 React 后台中（通过 `GET /melis/react-api/react-modules` 进行模块化砖块发现）。

## 后台（React）

左侧边栏 → **MelisMarketing** → **Calendar**（日历图标）。它会以一个名为 **Calendar** 的常驻顶部标签页打开。这是一个单级工具（无子标签页），并带有创建/编辑模态框。

![React 日历工具：New/Old 切换开关和 “+ New event”（右上角）、KPI 卡片（Total / Upcoming）、“New event” 拖放块和 “This month's events” 列表（左侧），以及一个高亮显示当天的自定义月视图网格](/screenshots/react/melis-calendar/meliscalendar-tool-calandar-display.png)

| 区域 | 说明 |
| --- | --- |
| 自定义月视图网格 | 6 周网格（周一→周日），`‹ / ›` 用于切换月份，**Today** 用于跳回当天，当天会被高亮。事件以色块（chip）形式渲染在其所在日期；跨天事件会横跨多个单元格。 |
| “New event” 拖放块 | 左侧面板的虚线块：输入标题，然后将其拖到某一天以在该处创建事件（在触控设备上点击以激活）。 |
| “+ New event” | 右上角按钮，打开带有明确 **Title / Start / End** 日期选择器的模态框。 |
| KPI 卡片 | **Total** 和 **Upcoming** 计数（upcoming = 开始日期为今天或之后）。 |
| “This month's events” 列表 | 左侧面板中当前月份的事件列表；点击某项即可编辑。 |
| 重新排期 | 将事件色块拖到另一天；其时长会被保留。 |
| New / Old 切换开关 | 右上角开关，用于在整个工具的 React 界面（**New**，默认）与嵌入 iframe 中的旧版 FullCalendar 工具（**Old**）之间切换。 |

![左侧 “New event” 面板：一个标题输入框加上带有提示 “Drag this block onto a calendar day”（将此块拖到日历某一天上）的虚线拖放块](/screenshots/react/melis-calendar/meliscalendar-tool-calandar-new-event.png)

![事件模态框——Title、Start 和 End 日期选择器，Cancel / Save；打开一个已有事件时会显示带有 Delete 按钮的同一模态框](/screenshots/react/melis-calendar/meliscalendar-tool-calandar-event-edition.png)

保存时强制执行的规则：标题为必填项（≤ 255 个字符）；如果 **End** 早于 **Start**，则会被钳制为 **Start**，因此事件的结束时间始终 ≥ 其开始时间。

## React API

路由位于 `config/react-api.php`（通过 `MelisCalendar\Module::getConfig()` 合并），由 `MelisCalendar\Controller\MelisReactApiCalendarController` 提供服务。所有路由都在 `/melis/react-api/calendar-events` 之下，响应契约为 `{ success, data, error }`，日期格式为 `YYYY-MM-DD`（不含时间）。每个请求都会携带 `X-Requested-With: XMLHttpRequest` 以及 `credentials: 'include'`。

| 方法与 URL | 操作 | 用途 |
| --- | --- | --- |
| `GET /calendar-events[?from=&to=]` | `list` | 与时间窗重叠的事件 → `{ items: [{id,title,start,end}] }` |
| `GET /calendar-events/stats` | `stats` | KPI `{ total, ongoing, upcoming }` |
| `GET /calendar-events/:id` | `get` | 单个事件 `{id,title,start,end}` |
| `POST /calendar-events/save` | `save` | 创建（无 `id`）/ 更新（带 `id`）；也用于重新排期 |
| `DELETE /calendar-events/delete/:id` | `delete` | 删除某个事件 |

路由顺序很重要：`/stats`、`/save` 和 `/delete/:id` 声明在通配路由 `/:id` 之前。

```ts
// create OR reschedule/edit (omit id = create, include id = update)
await fetch('/melis/react-api/calendar-events/save', {
  method: 'POST', credentials: 'include',
  headers: { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: null, title: 'Kickoff', start: '2026-08-19', end: '2026-08-19' }),
})
```

> 该控制器通过参数化 SQL（`Laminas\Db\Adapter\AdapterInterface`）直接操作 `melis_calendar`，复现了旧版规则和审计字段（来自 `MelisCoreAuth` 的 `cal_created_by` / `cal_last_update_by`）。它 **不** 调用 `MelisCalendarService`。

## 权能（高级权限）

在 `config/react.capabilities.php` 中声明于叶子工具节点 `meliscalendar_tool` 之下（同一个键既是控制器访问守卫的 melisKey，也是前端 `can()` 的键）：

```php
return [
    'melisReactToolCapabilities' => [
        'meliscalendar_tool' => ['create', 'edit'],
    ],
];
```

只存在两种权能：

- **`create`** —— 创建事件（将一个新标题拖到某一天 / “+ New event”）。
- **`edit`** —— 移动 / 重新排期（拖放）、编辑 **或** 删除已有事件。

查看日历需要 `create` **或** `edit`（任一即可）：`list` / `stats` 在服务端由 `denyUnlessCanAny(['create','edit'])` 守卫，在界面中由 `can('create') || can('edit')` 守卫。`save` 在无 id 时需要 `create`，在带 id 时需要 `edit`；`delete` 需要 `edit`。守卫默认放行（未声明的权能被允许）且管理员可绕过。

## 服务与事件（旧版基础架构）

该模块仍然暴露 `MelisCalendarService` 以供编程式访问——供旧版工具及其他模块使用，但 React 控制器不使用它：

| 方法 | 作用 |
| --- | --- |
| `addCalendarEvent()` | 创建一个新事件。 |
| `reschedCalendarEvent()` | 更新已有事件的日期。 |
| `deleteCalendarEvent()` | 删除一个事件。 |

每次保存后会触发 `meliscalendar_save_event_end` 事件。其他模块可以挂接该事件，以实现通知或外部日历同步：

```php
$sharedEvents->attach('MelisCalendar', 'meliscalendar_save_event_end', function ($e) {
    $params = $e->getParams();
    // custom notification or sync logic
}, 10);
```

## 仪表盘小组件

一个 **Calendar** 仪表盘小组件会在后台仪表盘上显示相同的事件，无需打开该工具。它从仪表盘的插件选择器（MELIS CALENDAR 分区）中添加，并由旧版 `MelisCalendarEventsPlugin` 提供服务。

![React 仪表盘上的 Calendar 小组件——一个高亮显示当天的紧凑月视图网格，以及它的齿轮 / 刷新 / 关闭控件](/screenshots/react/melis-calendar/meliscalendar-dashboardplugins-calandar.png)

![仪表盘的 “Add a widget” 面板——位于 MELIS CALENDAR 分区下的 Calendar 小组件](/screenshots/react/melis-calendar/meliscalendar-dashboardplugins-menu-selector.png)

## 数据库表

| 表 | 存储内容 |
| --- | --- |
| `melis_calendar` | 每个事件一行；包含用于跟踪创建和最后修改的审计字段。 |

另见：[melis-core](/zh/reference/modules/melis-core)
