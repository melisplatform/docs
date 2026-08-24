# MelisNewsletter

> 将 CMS 页面转化为个性化的电子邮件通讯，并投递给订阅者分组，现由原生 React 后台驱动。软件包 `melisplatform/melis-newsletter`。

## 用途

MelisNewsletter 复用 CMS 页面系统作为通讯模板：一个标记为 **NEWSLETTER** 类型的页面会被渲染为 HTML，通过 BB 代码（`[NAME]`、`[FIRSTNAME]`、`[EMAIL]`、`[UNSUBSCRIBELINK]`）为每位收件人进行个性化处理，并经由可配置的邮件传输通道发送给选定的订阅者和/或分组。订阅者以站点为单位组织成列表，并可细分为分组。每次发送都会连同完整的 HTML 快照和逐收件人日志一起归档；开箱即包含一个退订前台插件和完整的 GDPR 集成。

在 v6 中，该工具作为 **原生全 React 砖块（brick）** 集成到 `/melis-react` 后台。业务逻辑（服务、发送机制、GDPR、数据表）保持不变；仅展示层迁移到 React，通过模块暴露的 `react-api` JSON 层提供服务。

## 启用模块

将其添加到 `config/melis.module.load.php`：

```php
return [
    'MelisNewsletter',
];
```

依赖 `melis-core` 和 `melis-cms`；在功能上还依赖 `melis-engine` 和 `melis-front` 来完成页面渲染和退订插件。该 React 工具**仅在模块被激活时**才会出现在菜单中（通过 `GET /melis/react-api/react-modules` 进行模块化砖块发现）。从 `melis.module.load.php` 中移除 `MelisNewsletter` 会使该砖块消失。

## 后台（React）

左侧边栏 → **MelisMarketing → Newsletter**（`fa fa-newspaper-o`），挂载路由 `/melis-marketing/melis-newsletter-tool-config`。它以单个工具的形式打开，其页头显示标题 *Newsletters*、副标题 *"Subscribers, groups, history and send configuration"* 以及一个 **New / Old** 切换开关（右上角）。*New* 是 React 界面（默认）；*Old* 则在 iframe 中渲染旧版工具（`/melis/react-tool-page?key=melis_newsletter_tool_display`）。

与宿主子标签页工具不同，Newsletter 将其四个界面渲染为**它自己的 React 标签页**：

| 标签页 | 内容 |
| --- | --- |
| Subscribers（订阅者） | KPI 卡片（总数 / 活跃 / 非活跃）、搜索、状态 + 站点筛选、列管理器、CSV **Import**（导入）、**Export**（导出）、**Add selection to group(s)**（将所选添加到分组）、**+ New subscriber**（新建订阅者）。表格列：状态 / 邮箱 / 名 / 姓 / 站点 / 分组，每行支持编辑/删除 |
| Groups（分组） | KPI 卡片、搜索、状态筛选、Export、**+ New group**（新建分组）。表格列：状态 / 名称 / 创建时间 / 成员（数量），支持编辑/删除 |
| History（历史） | 只读归档。KPI 卡片（发送数 / 站点数 / 今日）、搜索、站点筛选、Export。表格列：页面 / 站点 / 版本 / 发送时间，每行带一个 **eye**（眼睛）图标用于查看归档的确切 HTML |
| Configuration（配置） | 唯一的全局 SMTP **Transport configuration**（传输配置）：主机 / 用户名 / 密码（+ 确认）。留空 = 使用 Melis 默认传输通道 |

![React Newsletter 工具中的 Subscribers 标签页](/screenshots/react/melis-newsletter/melisnewsletter-tool-newsletter-tab-subscribers.png)

打开或创建一个**订阅者**或**分组**不会打开新的主标签页——它会在一个原生的**宿主子标签页**中打开记录编辑器（SubscriberForm / GroupForm）（下钻式，键名为 `s-<id>` / `g-<id>`）。订阅者表单包含名/姓、邮箱、站点、一个 Active（活跃）切换开关以及分组成员关系；分组表单包含名称、一个 Active 切换开关以及该分组的成员（添加/移除 + 订阅者选择器）。

![React Newsletter 工具中的 Groups 标签页](/screenshots/react/melis-newsletter/melisnewsletter-tool-newsletter-tab-groups.png)

![React Newsletter 工具中的 History 标签页](/screenshots/react/melis-newsletter/melisnewsletter-tool-newsletter-tab-history.png)

![React Newsletter 工具中的 Configuration 标签页](/screenshots/react/melis-newsletter/melisnewsletter-tool-newsletter-tab-config.png)

出于安全考虑，存储的 SMTP 密码**从不返回给浏览器**——字段显示为一个带掩码的占位符，保存时将其留空则会保留当前密码。

### 发送通讯

**Send**（发送）操作不是一个标签页。它是一个模态框（`NewsletterSendModal`），通过 `window.__melisNewsletterSendModal` 暴露，由 **React 页面编辑器为** **NEWSLETTER** 类型的页面**渲染**。先设置一个主题，选择分组和/或订阅者，先向选定的订阅者或一个自由填写的邮箱地址进行 **Test**（测试），然后再 **Send**（发送）。成功后它会触发一个 `melis:newsletter-sent` 事件，从而使常驻的 History 标签页刷新。内容中的个性化变量：`[NAME]`、`[FIRSTNAME]`、`[EMAIL]`、`[UNSUBSCRIBELINK]`。发送前请先发布页面。

## React API

路由位于 `config/react-api.php` 中（通过 `MelisNewsletter\Module::getConfig()` 合并），作为通用 `melis-react-api` 桥接的子路由，挂载在 `/melis/react-api/newsletter` 下。控制器为 `MelisNewsletter\Controller\MelisReactApiNewsletterController`；JSON 契约为 `{ success, data, error }`；每个请求都携带 `X-Requested-With: XMLHttpRequest` + 凭据。部分端点：

| 方法 & URL（相对于 `/melis/react-api/newsletter`） | 用途 |
| --- | --- |
| `GET /subscribers` · `/subscribers/stats` · `/subscribers/:id` | 键集列表（`search`、`active`、`site`、`group`、`sort`、`dir`、`after`）、KPI、单条记录 |
| `POST /subscribers/save` · `/subscribers/import` | 创建/更新；CSV 批量导入 → `{imported,skipped,errors}` |
| `DELETE /subscribers/delete/:id` | 删除 |
| `GET /groups` · `/groups/stats` · `/groups/:id` · `/groups/:id/members` | 分组列表、KPI、记录、成员 |
| `POST /groups/save` · `/groups/:id/members/add` · `/groups/members/bulk-add` | 保存；添加成员；将 `subscriberIds[]` 批量分配给 `groupIds[]` |
| `DELETE /groups/delete/:id` · `/groups/members/remove/:mid` | 删除分组；移除成员关系（`mid` = `nlgu_id`） |
| `GET /history` · `/history/stats` · `/history/:id` | 发送归档列表、KPI、某次发送的归档 HTML |
| `GET /config` · `POST /config/save` | SMTP 配置（不返回密码；仅返回 `hasPassword`）/ 保存 |
| `GET /send-options` · `POST /send` · `POST /test` | 发送模态框选项；发送；测试发送 |

React 控制器**复用模块的 Laminas 服务**（`MelisNewsletterService`）来完成繁重的工作——发送/测试通过 `sendNewsletter()` / `testNewsletter()` / `testNewsletterCustomMail()` 进行，校验则镜像 `saveSubscriber` / `importFileValidator` / `saveConfig`——因此 React 路径重现了与旧版完全一致的业务规则。

## 能力（高级权限）

在 `config/react.capabilities.php` 中，于承载权限的节点 **`melis_newsletter_tools_section`**（而非清单/区域键 `melis_newsletter_tool_display`）下声明。这是一棵按标签页划分的树，外加一个跨标签页的 `send` 操作，扁平化为点分字符串：

```
melis_newsletter_tools_section
├─ action: send                              (Send / Test — the page-editor modal)
├─ tab subscribers: list · create · edit · delete · export
├─ tab groups:      list · create · edit · delete · export
├─ tab history:     list                     (read-only)
└─ tab config:      edit                     (SMTP transport)
```

React 通过 `useCaps('melis_newsletter_tools_section').can('…')` 读取这些能力并据此控制其操作按钮的可用性；在服务端，每个变更操作都受到保护（先 `denyUnlessAccess()` 再 `denyUnlessCan()`）。`react.capabilities.php` 还在共享的 `meliscms_page` 节点下合并了一个 `newsletter` 操作，以便页面编辑器中的 Send 按钮可以在 Users → Rights（用户 → 权限）中进行权限控制。

## 关键服务

| 服务别名 | 职责 |
| --- | --- |
| `MelisNewsletterService` | 用于订阅者、分组、发送/测试、归档和配置的核心服务。触发 `*_start` / `*_end` 事件。 |
| `MelisNewsletterGdprAutoDeleteService` | 实现 `MelisCoreGdprAutoDeleteInterface`；驱动针对陈旧订阅者的计划性 GDPR 警告/删除流程。 |

表网关别名：`MelisNewsletterSubscribersTable`、`MelisNewsletterGroupsTable`、`MelisNewsletterGroupsPeopleTable`、`MelisNewsletterArchiveTable`、`MelisNewsletterRecipientsTable`、`MelisNewsletterConfigTable`。

## 发送机制

`MelisNewsletterService::sendNewsletter($pageId, $subscribers, $groups, $mailSubject)`：

1. **解析收件人**——显式指定的订阅者 + 通过 `getSubscribersInGroup()` 获取的分组成员，仅筛选活跃者，并去重。
2. **渲染内容**——将 CMS 页面获取为 HTML；相对的 `href`/`src` 被重写为绝对 URL。
3. **个性化**——为每位收件人替换 BB 代码；`[UNSUBSCRIBELINK]` 携带哈希后的令牌。
4. **发送**——通过配置的 SMTP 传输通道或平台默认通道。
5. **归档**——每次发送生成一条 `nlan_*` 行（站点、页面、版本、完整 HTML、发送日期），每位收件人生成一条 `nlus_*` 行。

**测试发送**（`testNewsletter()` / `testNewsletterCustomMail()`）向单个订阅者或任意邮箱投递而不归档，且在正式发送解锁之前是必需的。

## 前台

| 插件 | 配置键 | 说明 |
| --- | --- | --- |
| `MelisNewsletterUnsubscribePlugin` | `melisnewsletter` / `MelisNewsletterUnsubscribePlugin` | 放置在一个 `unsubscribe`（退订）页面上。读取内嵌于 `[UNSUBSCRIBELINK]` 中的 `?s={hashed_id}` 令牌，调用 `deactivateSubscriberById()`，并显示成功/失败消息。暴露一个用于令牌哈希的 `unsubscribe_data_salt` 设置。 |

视图：`plugins/unsubscribe.phtml` + `unsubscribe-modal-form.phtml`。

## GDPR 集成

挂接 MelisCore GDPR 框架，同时支持按需和计划性流程：

- **按需：** `MelisNewsletterGdprUserInfoListener`、`…UserExtractListener`、`…UserDeleteListener` 会在收到请求时查找、导出并删除某人的订阅者数据。相关列：`nlu_firstname`、`nlu_name`、`nlu_email`、`nlu_date_creation`（在 `config/app.gdpr.php` 中声明）。
- **计划性自动删除：** `MelisNewsletterGdprAutoDeleteService` 配合九个监听器，涵盖模块注册、GDPR 标签声明、警告列表构建、警告邮件以及对无响应的非活跃订阅者的最终删除。

## 数据库表

| 表（别名 → 列前缀） | 存储内容 |
| --- | --- |
| `MelisNewsletterSubscribersTable`（`nlu_*`） | 按站点划分的订阅者行：邮箱、名/姓、状态、创建日期 |
| `MelisNewsletterGroupsTable`（`nlg_*`） | 分组定义：名称、状态、创建日期 |
| `MelisNewsletterGroupsPeopleTable`（`nlgu_*`） | 订阅者 ↔ 分组的成员关系关联 |
| `MelisNewsletterArchiveTable`（`nlan_*`） | 按发送划分的归档：站点、页面、版本、完整 HTML 正文、发送日期 |
| `MelisNewsletterRecipientsTable`（`nlus_*`） | 按收件人划分的发送日志：姓名/名/邮箱快照、归档外键 |
| `MelisNewsletterConfigTable`（`nlc_*`） | 按站点划分的 SMTP 传输配置：主机、用户名、密码 |

## 示例

```php
$nl = $serviceManager->get('MelisNewsletterService');

// Subscriber / group management (same service the react-api reuses)
$nl->saveSubscriber($data, $id);           // $id null → create
$nl->deactivateSubscriberById($id);
$nl->saveGroup($data, $id);
$nl->getSubscribersInGroup($grpId);

// Send flow
$nl->testNewsletter($pageId, $subId, $subject);
$nl->sendNewsletter($pageId, $subscribers, $groups, $subject);

// History & config
$nl->getNewsletterRecipients($archiveId);
$nl->saveNewsletterConfig($cfg);
```

## 关键文件

| 关注点 | 路径 |
| --- | --- |
| React API 路由 + 可调用控制器 | `vendor/melisplatform/melis-newsletter/config/react-api.php` |
| React 能力（键名 `melis_newsletter_tools_section`） | `vendor/melisplatform/melis-newsletter/config/react.capabilities.php` |
| React API 控制器（复用 `MelisNewsletterService`） | `vendor/melisplatform/melis-newsletter/src/Controller/MelisReactApiNewsletterController.php` |
| React 砖块（Vite 构建）+ 清单 | `vendor/melisplatform/melis-newsletter/public/ui-react/brick.js` · `brick.manifest.json` |
| 模块配置（服务、表网关、控制器、插件） | `vendor/melisplatform/melis-newsletter/config/module.config.php` |
| 主服务 | `vendor/melisplatform/melis-newsletter/src/Service/MelisNewsletterService.php` |
| GDPR 自动删除服务 | `vendor/melisplatform/melis-newsletter/src/Service/MelisNewsletterGdprAutoDeleteService.php` |
| 退订前台插件 | `vendor/melisplatform/melis-newsletter/src/Controller/Plugin/MelisNewsletterUnsubscribePlugin.php` |
| 表网关 | `vendor/melisplatform/melis-newsletter/src/Model/Tables/` |
| 数据库安装 + 迁移 | `vendor/melisplatform/melis-newsletter/install/dbdeploy/` |

另见：[melis-core](/legacy/reference/modules/melis-core)、[melis-cms](/legacy/reference/modules/melis-cms)、[melis-front](/legacy/reference/modules/melis-front)、[melis-engine](/legacy/reference/modules/melis-engine)
