# MelisCmsUserAccount

> 前台站点访客账户系统 —— 面向网站会员的注册、登录与按站点划分的个人资料，通过原生 React 后台工具进行管理。软件包 `melisplatform/melis-cms-user-account`。

## 用途

MelisCmsUserAccount 管理**站点访客**（前台）账户 —— 即在你的 CMS 站点上注册并登录的用户。这些账户不同于由 MelisCore 管理的后台员工账户。账户按**站点**划分（同一个人可以在多个站点上拥有账户）。该模块提供两个可拖放的页面插件（登录表单和注册表单）、一个后台管理工具，以及一整套 GDPR 处理流程，涵盖数据信息、数据导出、匿名化删除，以及非活跃账户的自动清除工作流。在启动时，它还会向 blog/news/comments 表添加外键列，以便一次 GDPR 处理就能在这些模块中呈现、导出或删除某个用户所拥有的全部内容。

在 v6 中，后台管理工具（**Users FO**）是一个**原生全 React 砖块（brick）**—— 一个真正的 React CRUD 界面，调用 JSON `react-api` 层 —— 并带有 **New / Old**（新 / 旧）切换开关，可回退到在 iframe 中运行的旧版工具。框架、服务、数据表、GDPR 机制和前台插件保持不变；只有管理界面迁移到了 React。

## 启用

在 `config/melis.module.load.php` 中添加：

```php
return [
    'MelisCmsUserAccount',
];
```

Composer 依赖：`melisplatform/melis-core`（GDPR 框架、会话、后台工具）和 `melisplatform/melis-cms`（页面 / 插件宿主）。`melis-engine` 和 `melis-front` 会作为传递依赖被引入以支持前台渲染。模块激活后会自动发现该 React 工具（它随附一个 `brick.manifest.json`）；从 `melis.module.load.php` 中移除该模块会使工具从 React 后台消失。

## 关键服务

| 服务别名 | 职责 |
| --- | --- |
| `MelisCmsUserAccountService` | 主服务 —— 同时别名为 **`FrontUserAccountService`**。提供站点用户的 CRUD 以及身份验证。 |
| `MelisCmsUserAccountGdprAutoDeleteService` | 非活跃账户自动删除流程逻辑（警告 + 匿名化）。 |
| `FrontUserAccountTable` | `melis_cms_user_account` 的表网关。 |
| `MelisCmsUserSitesTable` | `melis_cms_user_account_sites` 的表网关。 |
| `MelisPasswordValidator` | 密码策略校验器（至少 8 个字符、一个小写字母、一个数字），在注册和保存个人资料时应用。 |

`MelisCmsUserAccountService`（别名 `FrontUserAccountService`）上的关键方法：

```php
$svc = $sm->get('FrontUserAccountService');

// Authenticate a site visitor
$result = $svc->siteUserAuthenticate($login, $password, $siteId);

// Create a new account
$id = $svc->createUser($data);

// Fetch by various keys
$user = $svc->getUserById($id);
$user = $svc->getUserByLogin($login);
$user = $svc->getUserByEmailAndPassword($email, $password);

// Persist profile changes
$svc->saveUserAccountData($id, $data);

// Site memberships for a user
$sites = $svc->getUsersSitesByUserId($id);

// Record a login timestamp (used by the auto-delete pipeline)
$svc->updateUserConnectionDate($id);
```

或者，触发 `site_user_account_authentication` 事件，让 `MelisCmsUserAccountSiteUserAuthenticationListener` 调用 `siteUserAuthenticate()`；通过验证的用户随后会被存储在一个按站点键控的 `Laminas\Session\Container` 中。

## 后台（React）—— Users FO

**Users FO** 工具位于 React 后台（`/melis-react`）侧边栏 **MelisCms** 分组下的 **Utilisateurs FO**（"FO Users"，前台用户）。它是一个**原生全 React 砖块**（并非 iframe），挂载在树路由 `/melis-cms/user-account` 上；菜单键 `melis_cms_user_account_tool_display` 控制访问权限、能力以及旧视图 iframe。该工具仅管理**站点用户** —— 绝不涉及后台员工（后者属于 MelisCore 的 **Users** 工具）。

它是一个两级下钻界面，通过宿主的**原生子标签页**（`subTabs: true`）呈现：一个扁平的站点用户**列表**，以及每个子标签页打开的单个 **User** 表单。

![React Users FO 列表 —— KPI 卡片（Total / Active / Inactive / Admins，即总数 / 活跃 / 非活跃 / 管理员）、搜索、状态 / 管理员 / 站点筛选器、Reset filters（重置筛选器）、Columns（列）管理器、Export（导出）、New / Old 切换开关以及 + New user（新建用户）；每一行都提供 View sites（查看站点）、Edit（编辑）和 Delete（删除）操作](/screenshots/react/melis-cms-user-account/meliscmsuseraccount-tool-usersfo-list.png)

**列表（第 1 级）**—— 一个可搜索、可排序、可筛选的表格，列出平台上的每个前台账户，并配有 **KPI 卡片**（Total / Active / Inactive / Admins，即总数 / 活跃 / 非活跃 / 管理员）。控件：

- **Search**（搜索，匹配登录名、邮箱、名和姓）
- **Status** 筛选器（All / Active / Inactive，即全部 / 活跃 / 非活跃）和 **Admin** 筛选器（All / Admin / Non-admin，即全部 / 管理员 / 非管理员）
- **Site** 选择器（All sites，全部站点）和 **Reset filters**（重置筛选器）
- **Columns** 管理器（通过拖放来隐藏 / 重新排序列）
- **Export** 导出为 Excel 或 CSV（在砖块中通过 SheetJS 于客户端运行）
- **New / Old** 切换开关（右上角）和 **+ New user**（新建用户）按钮

列：**Id · Status · Admin · Picture · Email · Login · Full Name · Creation date · Action**（Picture 列仅用于展示；点击其他任意表头即可排序）。每一行提供三种操作：

| 操作 | 说明 |
| --- | --- |
| View sites（查看站点，🔍） | 弹窗按用户所属的各站点列出：注册日期、上次登录时间、该成员关系是否已**匿名化**（GDPR），以及站点的域名。 |
| Edit（编辑，✏️） | 在子标签页中打开该用户（见下文）。 |
| Delete（删除，🗑） | 移除该账户（不可逆）。 |

**User 表单（第 2 级）**—— 打开某一行或点击 **+ New user** 会新增一个子标签页，其中是单个 **User** 表单：**Login**（编辑时只读）、**Email**、**First name**（名）、**Last name**（姓）、**Birthday**（生日，采用会话语言的日历）、**Language**（语言）、只读的 **Creation date**（创建日期）、一个 **Picture** 面板（预览 + Choose an image / Remove picture，即选择图片 / 移除图片），以及 **Password** / **Confirm password**（密码 / 确认密码）。右侧是 **Active**（活跃）和 **Administrator**（管理员）开关，以及必填的 **Sites**（站点）复选框列表。**Save** 保存账户。

![React 编辑用户表单 —— Login（编辑时只读）、Email、First/Last name（名 / 姓）、Birthday（生日）、Language（语言）、只读的 Creation date（创建日期）、Picture 面板、Password / Confirm password（密码 / 确认密码），以及 Active（活跃）和 Administrator（管理员）开关和必填的 Sites（站点）复选框列表](/screenshots/react/melis-cms-user-account/meliscmsuseraccount-tool-usersfo-edit-tab-user.png)

> 密码字段带有提示 *"Leave empty to keep unchanged"*（留空则保持不变）—— 编辑个人资料绝不会强制修改密码。**一旦**输入了密码，它必须满足 `MelisPasswordValidator`（至少 8 个字符、一个小写字母、一个数字）。**至少需要一个站点**；对该用户而言已**匿名化**（GDPR）的站点会在提交时被静默丢弃。

**New / Old 切换开关**—— 整个工具在 React 界面（**New**，默认）和在 iframe 中渲染的经典工具（**Old**，`/melis/react-tool-page?key=melis_cms_user_account_tool_display`）之间切换。旧版后台工具仍由 **`MelisCmsUserAccountToolController`** 提供，保持不变。

## React API 端点

路由位于 `config/react-api.php`，由控制器 `MelisReactApiUserAccountController`（可调用别名 `MelisCmsUserAccount\Controller\MelisReactApiUserAccount`）提供服务。全部位于 `/melis/react-api/user-account` 之下，返回 `{ success, data, error }` 契约。

| 方法与 URL | 用途 |
| --- | --- |
| `GET /user-account` | 列出用户（keyset 分页：`limit`、`search`、`siteId`、`admin`、`status`、`sort`、`dir`、`after`）→ `{items,total,nextCursor}`；每个条目携带 `hasPicture` |
| `GET /user-account/stats` | KPI `{total, active, inactive, admins}` |
| `GET /user-account/sites` | 平台站点列表（筛选器 + 表单复选框）→ `[{id,label}]` |
| `GET /user-account/langs` | 语言列表（表单下拉框）→ `[{id,label}]` |
| `GET /user-account/:id` | 单个用户（添加 `siteIds[]` + `pictureDataUrl`）—— 用于编辑 |
| `GET /user-account/:id/picture` | 行内图片，以 `image/jpeg` 返回（回退到默认头像） |
| `GET /user-account/:id/sites` | "View sites" 详情，按站点列出：标签、注册 / 上次登录日期、`anonymized`、域名 |
| `POST /user-account/save` | 创建 / 更新账户 |
| `DELETE /user-account/delete/:id` | 删除账户 |

`list`/`stats` 使用参数化 SQL 直接查询 `melis_cms_user_account`；`get`/`save`/`delete`/`userSites` 则**委托给旧版服务**（`FrontUserAccountTable`、`FrontUserAccountService`）—— 与旧版工具所用的服务相同，因此所有业务规则（登录名 / 邮箱唯一、密码哈希、站点关联、GDPR 匿名化站点防护）和活动日志事件（`meliscms_user_account_tooluser_save` / `_delete`）都得以保留。

## 能力（Capabilities）

在 `config/react.capabilities.php` 中于权限节点 `melis_cms_user_account_tool_display` 下声明。该工具是扁平的 CRUD，因此声明是一个扁平列表：

```php
return [
  'melisReactToolCapabilities' => [
    'melis_cms_user_account_tool_display' => ['list', 'create', 'edit', 'delete', 'export'],
  ],
];
```

每个 API 操作都会先调用 `denyUnlessAccess()`（身份验证 + `MelisCoreRights::canAccess('melis_cms_user_account_tool_display')` → 401/403），然后进行能力检查：

| 能力 | 强制作用于 |
| --- | --- |
| `list` | `list`、`stats`、`picture` |
| `edit` | `get`、`userSites`，以及存在 `id` 时的 `save`（更新） |
| `create` | 无 `id` 时的 `save`（创建） |
| `delete` | `delete` |
| `export` | 仅为声明式 —— 导出在砖块中于客户端运行 |

## 前台

在 `config/plugins/` 下注册了两个模板插件（在 v6 中保持不变 —— 由前台渲染器提供，而非 React 工具）：

| 插件 | 渲染内容 | 关键选项 |
| --- | --- | --- |
| `MelisCmsUserAccountLoginPlugin` | 登录表单（以及已通过验证时的登出控件）。 | `template_path`、`page_id_registration_page` |
| `MelisCmsUserAccountUserRegisterPlugin` | 注册表单（用户名、邮箱、密码 ×2、名 / 姓、图片、语言）。 | `template_path`、`page_id_login_page`、`force_joint_accounts` |

注册插件上的 `force_joint_accounts` 会复用一个已存在的跨站点账户；站点成员关系存储在 `melis_cms_user_account_sites` 中。

这两个插件均由 **`MelisCmsUserAccountPluginController`** 提供服务：

| 操作 | 职责 |
| --- | --- |
| `authenticateUserAction()` | 验证 `login`/`password`/`siteId` 并开启会话。 |
| `logoutUserAction()` | 关闭站点用户会话。 |
| `createUserAction()` | 校验并创建用户（包含图片上传）。 |
| `getRegistrationFormAction()` | 返回注册表单（用于登录↔注册切换）。 |
| `getTranslationsAction()` | 前端翻译字符串。 |

> 插件控制器中没有内置的忘记 / 重置密码或邮件激活操作。如有需要，请在 `FrontUserAccountService` 之上自行构建。

## 数据库表

| 表 | 主键 | 存储内容 |
| --- | --- | --- |
| `melis_cms_user_account` | `uac_id` | 站点用户：`uac_login`、`uac_email`、`uac_password`、`uac_firstname`、`uac_lastname`、`uac_picture`、`uac_status`、`uac_admin`、`uac_birthday`、`uac_lang_id`、`uac_date_creation`。 |
| `melis_cms_user_account_sites` | `uacs_id` | 用户 ↔ 站点关联表：`uacs_uac_id`、站点 id、`uacs_anonymized`（按站点划分的 GDPR 标志）。 |

`MelisCmsUserAccountAddCustomFieldsTableListener`（在启动时触发）会向 blog/news/comments 表添加 `*_author_account` 外键列，创建 `melis_cms_user_account_sites`，并迁移旧版的 `uac_site_id` 列。该操作是幂等的（基于列是否存在进行防护）。

## GDPR

### 手动信息 / 提取 / 删除（第 1+2 组）

九个监听器响应三个 MelisCore 事件：

| 事件 | 账户监听器 | Blog 监听器 | Comments 监听器 |
| --- | --- | --- | --- |
| `melis_core_gdpr_user_info_event` | `…GdprUserInfoListener` | `…BlogGdprUserInfoListener` | `…CommentsGdprUserInfoListener` |
| `melis_core_gdpr_user_extract_event` | `…GdprUserExtractListener` | `…BlogGdprUserExtractListener` | `…CommentsGdprUserExtractListener` |
| `melis_core_gdpr_user_delete_event` | `…GdprUserDeleteListener` | `…BlogGdprUserDeleteListener` | `…CommentsGdprUserDeleteListener` |

Blog 和 Comments 监听器仅在安装了 `MelisCmsBlog` / `MelisCmsComments` 时才处于活跃状态。删除操作会将账户行匿名化并设置 `uacs_anonymized`。字段映射和保留阈值位于 `config/app.gdpr.php`。

### 非活跃账户自动处理流程（第 3 组）

六个监听器接入 MelisCore 的自动删除调度器：

| 步骤 | 监听器 | 事件 | 效果 |
| --- | --- | --- | --- |
| 1. 注册 | `…GdprAutoDeleteModuleListListener` | `melis_core_gdpr_auto_delete_modules_list` | 向调度器声明该模块。 |
| 2. 标签 | `…GdprAutoDeleteTagsListListener` | `MelisCoreGdprAutoDeleteService::TAGS_EVENT` | 注册非活跃标签 / 类别。 |
| 3. 首次警告 | `…GdprAutoDeleteWarningListUsersListener` | `MelisCoreGdprAutoDeleteService::WARNING_EVENT` | 向休眠用户发送首次警告邮件。 |
| 4. 二次警告 | `…GdprAutoDeleteSecondWarningListUsersListener` | `MelisCoreGdprAutoDeleteService::SECOND_WARNING_EVENT` | 向仍处于休眠的用户发送二次警告邮件。 |
| 5. 删除 | `…GdprAutoDeleteActionDeleteUserListener` | `MelisCoreGdprAutoDeleteService::DELETE_ACTION_EVENT` | 将无响应的账户匿名化。 |
| （日志） | `…GdprAutoDeleteGetEmailListener` | `melis_core_gdpr_auto_delete_log_get_user_email` | 为审计日志解析邮箱（跳过已匿名化的账户）。 |

"最后活动"由 `updateUserConnectionDate()` 跟踪。

## 跨模块监听器

在启动时于 `Module.php` 中注册：

| 监听器 | 事件 | 用途 |
| --- | --- | --- |
| `MelisCmsUserAccountSiteUserAuthenticationListener` | `site_user_account_authentication` | 前台验证入口 → `siteUserAuthenticate()`；将用户存储在按站点键控的 `Laminas\Session\Container` 中。（优先级 `-1001`） |
| `MelisCmsUserAccountLoginFormListener` | `melis_cms_user_account_login_form` | 将已登录的会员注入评论表单（隐藏字段 `mccom_user_acct`/`mccom_site_id`、登出按钮、来自账户的名称）；为匿名用户去除名称 / 邮箱字段。 |
| `MelisCmsUserAccountCommentsFormModificationListener` | `meliscmsuseraccount_comments_form_modification_listener` | 将评论表单元素重新排序为请求的顺序。 |
| `MelisCmsUserAccountAddAuthorPicture` | `melis_cms_user_account_add_user_picture` | 在会员评论旁渲染其 `uac_picture`（base64 data URI）。 |
| `MelisCmsUserAccountSaveUserAccountListenter` | `meliscmsnews_get_postvalues` | 保存新闻时持久化 `cnews_author_account` / `cnews_comments_require_account`。 |
| `MelisCmsUserAccountAddCustomFieldsTableListener` | `meliscms_user_account_add_custom_fields_table` | 启动迁移：向 blog/news/comments 表添加外键列，创建站点关联表，迁移旧版数据。 |
| `MelisCmsUserAccountFlashMessengerListener` | `meliscms_user_account_tooluser_save`、`meliscms_user_account_tooluser_delete` | 保存 / 删除时的后台快闪消息（旧版工具）。 |

## 关键文件

| 关注点 | 路径 |
| --- | --- |
| React 砖块清单 | `vendor/melisplatform/melis-cms-user-account/public/ui-react/brick.manifest.json` |
| React API 路由 + 可调用项 | `vendor/melisplatform/melis-cms-user-account/config/react-api.php` |
| React 能力 | `vendor/melisplatform/melis-cms-user-account/config/react.capabilities.php` |
| React API 控制器 | `vendor/melisplatform/melis-cms-user-account/src/Controller/MelisReactApiUserAccountController.php` |
| 旧版后台工具控制器（Old 视图） | `vendor/melisplatform/melis-cms-user-account/src/Controller/MelisCmsUserAccountToolController.php` |
| 前台插件控制器 | `vendor/melisplatform/melis-cms-user-account/src/Controller/MelisCmsUserAccountPluginController.php` |
| 后台菜单项 | `vendor/melisplatform/melis-cms-user-account/config/app.interface.php` |
| 旧版后台数据表（列、筛选器、弹窗） | `vendor/melisplatform/melis-cms-user-account/config/app.tools.php` |
| 所有表单（前台 + 旧版后台） | `vendor/melisplatform/melis-cms-user-account/config/app.forms.php` |
| GDPR 字段映射 + 保留阈值 | `vendor/melisplatform/melis-cms-user-account/config/app.gdpr.php` |
| Comments 集成点 | `vendor/melisplatform/melis-cms-user-account/config/comments.php` |
| 路由、服务别名、插件、校验器 | `vendor/melisplatform/melis-cms-user-account/config/module.config.php` |
| 登录插件配置 | `vendor/melisplatform/melis-cms-user-account/config/plugins/MelisCmsUserAccountLoginPlugin.config.php` |
| 注册插件配置 | `vendor/melisplatform/melis-cms-user-account/config/plugins/MelisCmsUserAccountUserRegisterPlugin.config.php` |
| 主服务 | `vendor/melisplatform/melis-cms-user-account/src/Service/MelisCmsUserAccountService.php` |
| 自动删除服务 | `vendor/melisplatform/melis-cms-user-account/src/Service/MelisCmsUserAccountGdprAutoDeleteService.php` |
| 密码校验器 | `vendor/melisplatform/melis-cms-user-account/src/Validator/MelisPasswordValidator.php` |
| 数据库表网关 | `vendor/melisplatform/melis-cms-user-account/src/Model/Tables/` |
| 监听器 | `vendor/melisplatform/melis-cms-user-account/src/Listener/` |
| 启动 / 列注入 | `vendor/melisplatform/melis-cms-user-account/src/Module.php` |

另请参阅：[MelisCore](/zh/reference/modules/melis-core) · [MelisCms](/zh/reference/modules/melis-cms) · [MelisCmsComments](/zh/reference/modules/melis-cms-comments) · [MelisCmsBlog](/zh/reference/modules/melis-cms-blog) · [MelisCmsNews](/zh/reference/modules/melis-cms-news)
