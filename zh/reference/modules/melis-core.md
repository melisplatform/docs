# MelisCore

> 所有其他模块赖以构建的后台基础——登录、用户/角色/权限、菜单与工具框架、仪表盘、配置、邮件、
> GDPR，以及基础服务 + 事件系统——现在由位于 `/melis-react` 的 **React** 后台渲染。
> 软件包 `melisplatform/melis-core`。

## 用途

`MelisCore` 是 Melis Platform 的后台核心。它提供应用外壳（页头、左侧菜单、工具树、仪表盘、页脚）、
用于聚合每个模块 `app.*.php` 文件的 `MelisCoreConfig` 配置树、身份验证与按工具划分的权限、用户管理、
平台/环境处理、事务性邮件、GDPR 工具、微服务鉴权端点，以及其他所有模块都会扩展的共享服务/事件层。
每一个 `melisplatform/*` 模块都依赖它。

在 v6 中，MelisCore 同时**就是 React 后台应用本身**。同一套外壳以 React 19 + TypeScript + Tailwind
单页应用的形式在 `/melis-react` 提供服务，与位于 `/melis` 的传统 `.phtml` 后台并行运行。MelisCore 交付
外壳（布局、路由、通用 `react-api` 客户端、模块/砖块加载器、能力解析器、New/Old 切换开关）**以及**它
自己的原生 React 工具（Users、Dashboard、Announcements、Emails、GDPR、Languages、Logs、Modules、
Other config、Platforms、Platform theme、My account、登录/2FA）。其他所有模块都插入**这套**外壳。

## 启用它

添加到 `config/modules.config.php`——MelisCore 必须尽早加载，因为几乎所有其他模块都会调用它的服务：

```php
return [
    'MelisCore',
    // … other modules …
];
```

React 后台由三个协同工作的模块交付：

| 模块 | 角色 |
| --- | --- |
| `MelisCore` | React 应用源码/构建产物 + 原生工具的 `react-api` 路由和控制器。 |
| [`MelisReactApi`](/zh/reference/modules/melis-react-api) | 通用的 `react-api` 桥接（`me`、`menu`、`assets`、`langs`、`react-modules`、`rights`、`i18n`、`dashboard`）。 |
| [`MelisReactOverride`](/zh/reference/modules/melis-react-override) | 在 `/melis-react` 提供 SPA 外壳，以及传统 iframe 机制（`/melis/react-tool-page`）。 |

它的配套基础设施模块仍然是 [MelisAssetManager](/zh/reference/modules)（负责从 `/MelisCore/ui-react/`
提供带哈希的 React 资源）、[MelisDbDeploy](/zh/reference/modules)、
[MelisComposerDeploy](/zh/reference/modules) 和 [MelisInstaller](/zh/reference/modules)。

## React 后台架构

Vite + React 应用源码位于 `vendor/melisplatform/melis-core/ui-react/`，并构建到已提交的
`vendor/melisplatform/melis-core/public/ui-react/`。运行时：

- **外壳（SPA）** 由 `MelisReactOverride` 在 **`/melis-react`** 提供；位于 `/melis` 的传统后台
  保持不变。
- **带哈希的资源** 从 **`/MelisCore/ui-react/`** 加载（即 Vite 的 `base`，由 MelisAssetManager 提供）。
- **JSON API** 位于 **`/melis/react-api/…`**，采用 `{ success, data, error }` 契约。

用户看到的每个工具都通过**三种机制之一**呈现在屏幕上：

1. **原生 React 工具**——由 MelisCore 中的 `MelisReactApi*Controller` 支撑的真正的 React 页面
   （Users、Languages、Emails、GDPR…）。在模块注册表（`ui-react/src/lib/module-registry.ts`）中列出。
2. **模块砖块（brick）**——另一个已激活的模块以*砖块*形式交付自己的 React UI，在运行时加载
   （仅当该模块已激活时才存在）。通过 `GET /melis/react-api/react-modules` 发现。
3. **iframe 池**——任何没有专属 React 路由的传统工具，都会通过 `/melis/react-tool-page?key=<melisKey>`
   在外壳内的池化 iframe 中渲染。

**菜单是动态的**（`GET /melis/react-api/menu` 返回按权限过滤后的工具树），工具路由**由该工具树派生**
（`/[section]/[tool]`，例如 `/melis-core/user`），且没有任何内容按模块硬编码。原生工具还可以带一个
**New（React）/ Old（iframe）** 切换开关，用于将其 React 视图与传统工具进行对比。

## 后台外壳

外壳（`ui-react/src/components/layout/Shell.tsx`）由侧边栏、顶栏、子标签页、传统工具标签栏和内容区
组合而成。每个工具的挂载都被包裹在按工具划分的 `ToolErrorBoundary` 中，因此某个工具的渲染崩溃
永远不会让整个后台变成空白。

### 顶栏

顶栏右侧有一个**主题**（浅色/深色）切换、**语言**切换器、一个 **Messenger** 图标（当该模块激活时）、
一个**通知**铃铛，以及你的**用户头像**（打开 *My account* 并包含 *Logout*）。最左侧有一个隐藏侧边栏
的按钮。

![顶栏右侧图标——主题切换、语言、messenger、通知、头像](/screenshots/react/melis-core/meliscore-header-righticons.png)

### 左侧边栏与页脚

侧边栏显示 **Dashboard** 链接以及**工具树**，按板块分组（MelisCore、MelisCms、MelisMarketing、
MelisCommerce、Marketplace、Melis AI…）。**你能看到什么取决于你的权限**——只有你有权使用的工具才会
显示。页脚显示平台 / MelisCore **版本**。

![页脚——MelisCore / 平台版本](/screenshots/react/melis-core/meliscore-footer-version-meliscore.png)

### 仪表盘

登录后的着陆页。它顶部显示一组**气泡**（Melis News / Updates / Notifications / Messages 计数），
以及一个**小组件**（仪表盘插件）网格。小组件从 **“Add a widget”（添加小组件）**面板添加，并通过
拖放排列；可用性取决于你的权限。

![React 仪表盘——顶部气泡、空的小组件网格和 “Add a widget” 面板](/screenshots/react/melis-core/meliscore-dashboard-empty.png)

![“Add a widget” 面板——选择一个小组件（按模块分组）放到仪表盘上](/screenshots/react/melis-core/meliscore-dashboardplugins-menu.png)

## 身份验证

登录页位于 `/melis-react/login`（React）——用户名 + 密码、可选的 **Remember me（记住我）**，以及一个
语言选择器。成功后你会进入仪表盘。启用了 **2FA** 的账户会被引导到 `/verify-2fa`（当验证码通过邮件
发送时可重新请求新的验证码）。**Lost password（找回密码）**链接（`/forgot-password`）会发送一封重置
链接邮件，打开 `/reset-password/:hash`。登录面板的品牌样式可通过 **Platform theme** 工具配置。

在底层，PHP 层保持不变：登录会向传统的 `POST /melis/authenticate` 提交，会话轮询使用
`GET /melis/islogin`，权限来自 `MelisCoreAuth` / `MelisCoreRights`。

## 用户、角色与权限

**位置：** MelisCore → Administration → **User management**（`/melis-core/user`）。管理每一个后台账户。
列表包含 KPI 卡片（Total / Active / Inactive / Admins）、搜索、状态和角色筛选、列管理器、导出、
New/Old 切换以及 **+ New user**。

![Users 工具——KPI 卡片、筛选、列管理器、导出、New/Old 切换、“+ New user”](/screenshots/react/melis-core/meliscore-tool-users-list.png)

打开某个用户会看到四个标签页：

- **Profile**——身份信息、标签、状态开关、角色、一个 **Administrator** 标志，以及一个带实时复杂度
  反馈的密码区域。

  ![Profile 标签页——身份信息、标签、Status/Role/Rights 卡片，以及带实时要求提示的密码字段](/screenshots/react/melis-core/meliscore-tool-users-edit-tab-profile.png)

- **Rights**——**访问树**（勾选用户可以使用哪些工具/板块），外加一个 **Dashboard Plugins** 面板和一个
  **Pages** 面板。任何未授予的内容都会从用户的菜单中隐藏。声明了**能力（capabilities）**的工具会展开
  子复选框（List / Create / Edit / Delete / Export）。

  ![权限树——按板块的计数和按工具的能力复选框](/screenshots/react/melis-core/meliscore-tool-users-edit-tab-rights-1.png)

  ![Rights 标签页下方——Dashboard Plugins 面板和 Pages 面板](/screenshots/react/melis-core/meliscore-tool-users-edit-tab-rights-2.png)

- **Connections**——用户的登录历史（日期、登入/登出时间、时长）。
- **Microservices**——生成一个 **API key**，使第三方能够以该用户身份对微服务端点进行鉴权。

  ![生成的 API key——启用/禁用开关、带显示/复制/重新生成的掩码密钥，以及微服务 URL](/screenshots/react/melis-core/meliscore-tool-users-edit-tab-microservices-generated.png)

**角色（Roles）**一次性定义一组权限并将其分配给多个用户；Roles 工具由 **MelisSmallBusiness** 提供，
因此 Profile 标签页的 *Role* 选择器仅在该模块激活时才会出现。

> 经验法则：如果有人“看不到某个工具”，说明他们的 **Rights** 树没有授予它——编辑该用户
> （或其角色）→ Rights → 勾选该工具。

## My account

**位置：** 顶栏头像 → **My account**（`/melis-core/account`）。编辑你自己的邮箱、更改密码、设置界面
语言并上传头像图片。模块可以在此处添加标签页（例如 Melis Messenger）。这是唯一没有能力守卫的原生
工具——它对任何已认证用户开放。

![“My account” 页面——头像、身份摘要，以及一个 Profile 标签页（邮箱 / 密码 / 语言）](/screenshots/react/melis-core/meliscore-tool-profile-tab-profile.png)

## Announcements（公告）

**位置：** MelisCore → Administration → **Announcement**（`/melis-core/announcement`）。显示在仪表盘上的
平台公告，包含 KPI 卡片、搜索、状态筛选和 **+ New announcement**。编辑器是一个标题 + **富文本
（TinyMCE）** 正文、一个 **Active** 开关和一个 **Date**。

![Announcements 列表——KPI 卡片、Active/Inactive 筛选、逐行编辑/删除](/screenshots/react/melis-core/meliscore-tool-announcement-list.png)

![公告编辑器——Title、HTML 文本（TinyMCE）、Active 开关和 Date](/screenshots/react/melis-core/meliscore-tool-announcement-edit.png)

## 后台语言（Back-Office Languages）

**位置：** MelisCore → System configuration → **Back-Office languages**（`/melis-core/language`）。可供
后台用户使用的区域设置（locale + 名称）。`en_EN` 是**受保护的默认项**（不能被重命名掉或删除）。保存
会通过 `MelisCoreTranslation` 重新生成翻译文件。

![Languages 列表——locale + 名称，默认项（en_EN）已标记，逐行编辑](/screenshots/react/melis-core/meliscore-tool-bolanguages-list.png)

## 邮件管理（Emails management）

**位置：** MelisCore → System configuration → **Emails management**（`/melis-core/emails`）。平台的
**事务性邮件**（账户创建、找回密码、工作流…）。列表显示名称、代码、发件人/发件人邮箱，以及一个
**Source** 徽章（Default 与 Custom）。

![Emails management 列表——带代码、发件人和 Default/Custom 来源的事务性模板](/screenshots/react/melis-core/meliscore-tool-emailsmanagement-list.png)

编辑器包含 **General properties**（名称、代码、发件人、回复地址、替换标签、布局路径）和一个
**Content per language** 区域（按语言划分的主题 + HTML/文本正文），带有诸如 `[NAME]`、`[EMAIL]`、
`[LOGIN]` 这样的可替换标签。保存会委托给 `MelisCoreBOEmailService::saveBoEmailByCode`。

![邮件属性——名称、代码、发件人、回复地址、替换标签和布局路径](/screenshots/react/melis-core/meliscore-tool-emailsmanagement-edit-properties.png)

![按语言划分的内容——主题、带 `[NAME]`/`[EMAIL]`/`[LOGIN]` 标签的 TinyMCE HTML 正文，以及纯文本版本](/screenshots/react/melis-core/meliscore-tool-emailsmanagement-edit-language.png)

## GDPR

**位置：** MelisCore → Administration → **GDPR**（`/melis-core/gdpr`）。四个标签页：

- **Data**——按姓名/邮箱搜索某个人；跨所有模块查看关于此人所持有的数据，然后对所选记录进行
  **提取**（导出 XML）或**删除**。

  ![GDPR Data 标签页——搜索某个人；各模块返回匹配的数据以供提取或删除](/screenshots/react/melis-core/meliscore-tool-gdpr-tab-data.png)

- **Banners**——按站点 + 语言配置 GDPR cookie/同意横幅文本。
- **Anonymization**——计划中的**自动删除 / 数据保留**配置（每个站点 + 模块一个），带 **Run** 和 **Logs**。

  ![Anonymization 标签页——自动删除配置，带 Logs、Run 和 “+ New config”](/screenshots/react/melis-core/meliscore-tool-gdpr-tab-anonymization.png)

- **SMTP**——用于发送匿名化提醒邮件的邮件服务器。

  ![SMTP 标签页——用于匿名化提醒邮件的 host / username / password](/screenshots/react/melis-core/meliscore-tool-gdpr-tab-smtp.png)

## 日志（Logs）

**位置：** MelisCore → System configuration → **Logs**（`/melis-core/logs`）。一个只读、可搜索的
**活动日志**——按类型、标题、用户和日期范围筛选，带 KPI 卡片（Total / Today / Types）。非管理员
只能看到自己的操作。

![Logs 查看器——KPI 卡片，类型/标题/用户/日期筛选，以及活动行](/screenshots/react/melis-core/meliscore-tool-logs-list.png)

## 模块（Modules）

**位置：** MelisCore → System configuration → **Modules**（`/melis-core/modules`）。启用/禁用并
**重新排序**（拖放）平台模块；每一行显示模块、其软件包、版本和依赖。**Save** 会重写
`config/melis.module.load.php` 并触发 `meliscore_module_management_save_end`。

![Modules 工具——搜索、激活数、拖动重排加载顺序、按模块开关、requires/version 徽章](/screenshots/react/melis-core/meliscore-tool-modules-list.png)

## 其他配置（登录与密码策略）

**位置：** MelisCore → System configuration → **Other Config**（`/melis-core/other-config`）。安全策略：
**多次失败后锁定账户**、**密码有效期**、**密码复用**，以及**密码复杂度**（最小长度 + 小写/大写/数字/特殊
字符要求）。通过 `MelisPasswordSettingsService` 写入 `app.login.php`。

![Other Configurations 页面——锁定、密码有效期、复用和复杂度开关](/screenshots/react/melis-core/meliscore-tool-other-config.png)

## 平台（Platforms）

**位置：** MelisCore → System configuration → **Platforms**（`/melis-core/platforms`）。管理**环境**
（dev/staging/prod），带 KPI 卡片、搜索和 **+ New platform**。**当前**平台会被标记，且其名称不能更改。

![Platforms 列表——已标记的“当前”平台、Marketplace/Cache 列、逐行编辑/删除](/screenshots/react/melis-core/meliscore-tool-platforms-list.png)

![平台编辑器——名称（对当前平台锁定）、Marketplace 更新和 Cache 开关](/screenshots/react/melis-core/meliscore-tool-platforms-edit.png)

## 平台主题（Platform theme）

**位置：** MelisCore → System configuration → **Platform Scheme**（`/melis-core/platform-scheme`）。
配置后台**品牌样式**：页头 logo、**登录左侧面板**（logo、背景、按语言划分的标题/副标题）和网站图标。
**Restore to Default（恢复默认）**会将其重置。

![Platform theme 页面——后台页头 logo 和登录左侧面板品牌样式](/screenshots/react/melis-core/meliscore-tool-platformscheme.png)

> 在 React 中，有两个主题控制器归在同一个权限节点 `meliscore_tool_platform_scheme` 之下：这个
> **Platform theme** 页面（React 品牌样式——logo、登录、网站图标）和传统的**配色方案（colour scheme）**
> （后台配色，重新生成 `schemes.css`）。

## 原生工具 → 控制器与能力

每个原生 React 工具都映射到一个 `MelisReactApi*Controller`（位于 `src/Controller/`），在
`config/react-api.php` 中声明，由一个承载权限的 `melisKey` 守卫。高级的按操作划分的**能力
（capabilities）**在 `config/react.capabilities.php` 中声明，并在服务端强制执行（UI 中默认放行）。

| 工具（路由） | 控制器 | melisKey / 守卫 | 能力 |
| --- | --- | --- | --- |
| Users（`/melis-core/user`） | `MelisReactApiUserController` | `meliscore_tool_user` | list, create, edit, delete, export |
| My account（`/melis-core/account`） | `MelisReactApiUserProfileController` | `meliscore_user_profile`（仅需认证） | — |
| Announcement | `MelisReactApiAnnouncementController` | `melis_core_announcement_tool` | list, create, edit, delete, export |
| Emails | `MelisReactApiEmailsController` | `meliscore_tool_emails_mngt` | list, create, edit, delete |
| GDPR | `MelisReactApiGdprController` | `melis_core_gdpr` | 强制执行但未声明 → 默认放行 |
| Languages | `MelisReactApiLanguageController` | `meliscore_tool_language` | list, create, edit, delete |
| Logs | `MelisReactApiLogController` | `meliscore_logs_tool`（只读） | list |
| Modules | `MelisReactApiModulesController` | `meliscore_tool_user_module_management` | list, edit |
| Other config | `MelisReactApiOtherConfigController` | `meliscore_tool_other_config` | list, edit |
| Platforms | `MelisReactApiPlatformController` | `meliscore_tool_platform` | list, create, edit, delete |
| Platform theme | `MelisReactApiPlatformScheme(React)Controller` | `meliscore_tool_platform_scheme` | list, edit |
| Auth（公开） | `MelisReactApiAuthController` | 无（forgot/reset/i18n） | — |

每个受守卫的操作都运行同样的两行门禁：

```php
private const MELIS_KEY = 'meliscore_tool_user';
if ($deny    = $this->denyUnlessAccess())    { return $deny; }    // 401 unauth / 403 canAccess(MELIS_KEY)
if ($denyCap = $this->denyUnlessCan('list')) { return $denyCap; } // capability (CapabilityGuardTrait)
```

## react-api

外壳消费一个**通用的** `react-api`（来自 `MelisReactApi` 模块）以及**原生**工具的路由（来自 MelisCore）。
基础路径 `/melis/react-api`，契约 `{ success, data, error }`；每次调用都发送
`X-Requested-With: XMLHttpRequest` 和 `credentials: 'include'`。

| 方法与 URL | 用途 |
| --- | --- |
| `GET /melis/react-api/me` | 当前用户（id、name、login、email、picture、isAdmin、capabilities）。 |
| `GET /melis/react-api/menu[?full=1]` | 按权限过滤后的工具树（`full=1` = 未过滤，仅供权限编辑器使用）。 |
| `GET /melis/react-api/react-modules` | 交付砖块的已激活模块 + 拼接后的 bundle URL。 |
| `GET /melis/react-api/langs` · `/assets` · `/i18n?locale=…` | 后台语言、平台资源、公开翻译。 |
| `GET /melis/react-api/dashboard/{bubbles,stats,layout}` · `POST …/layout` | 仪表盘数据 + 共享布局。 |
| `GET/POST /melis/react-api/{users\|languages\|platforms\|emails\|…}` | 原生工具的 CRUD（对应上述各控制器）。 |

示例——一个原生的 keyset 列表和一次保存：

```ts
// GET a keyset page of platforms
const r = await fetch('/melis/react-api/platforms?limit=25&sort=plf_id&dir=desc', {
  headers: { 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'include',
})
const { success, data } = await r.json()   // { success, data: { items, total, nextCursor } }

// POST save a language
await fetch('/melis/react-api/languages/save', {
  method: 'POST',
  headers: { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ id: null, locale: 'de_DE', name: 'Deutsch' }),
})
```

## 关键服务（未变更）

在 `config/module.config.php` 中注册为 `service_manager` 别名——React 工具据以调用的 PHP 骨干：

| 服务别名 | 角色 |
| --- | --- |
| `MelisCoreConfig` | 覆盖聚合后的 `app.*` 文件的运行时配置树：`getItem('/meliscore/interface/…')`、`getItemPerPlatform('/meliscore/datas/')`、`getFormMergedAndOrdered(…)`。 |
| `MelisCoreAuth` | 后台身份验证：`hasIdentity()`、`getIdentity()`、`getAuthRights()`、`encryptPassword()`、`isPasswordCorrect()`。 |
| `MelisCoreRights` | 按工具划分的访问控制：`canAccess($melisKey)`、`getRightsValues($id, $isRole)`、`createXmlRightsValues(…)`。 |
| `MelisCoreTool` | 面向传统/iframe 工具的后台工具辅助器（列、表单、DataTable 配置）。 |
| `MelisCoreBOEmailService` | 事务性模板：`sendBoEmailByCode()`、`getBoEmailByCode()`、`saveBoEmailByCode()`、`deleteEmail()`。 |
| `MelisCoreGdprService` / `MelisCoreGdprAutoDeleteService` | GDPR 主体访问/删除，以及计划中的数据保留引擎。 |
| `MelisCoreTranslation` | 按区域设置加载并合并 `tr_*` 翻译（保存语言时重新生成）。 |
| `MelisGeneralService` | 大多数服务继承的基类——`sendEvent()`、`makeArrayFromParameters()`、`getServiceManager()`。 |

## 事件系统

`MelisGeneralService` 仍然会在每个服务方法前后触发 `*_start` / `*_end` 事件，因此任何模块都可以拦截。
通过共享事件管理器挂钩：

```php
$sm->get('SharedEventManager')->attach(
    'MelisCore',
    'meliscore_tooluser_savenew_end',
    function ($e) { $p = $e->getParams(); /* react */ },
    100
);
```

常见的核心事件：`meliscore_tooluser_savenew_start/end`、`…delete_start/end`、`…save_start/end`、
`melis_core_check_user_rights`、`meliscore_install_create_new_user`、`melis_core_new_platform`、
`meliscore_module_management_save_end`，以及 GDPR 事件（`melis_core_gdpr_user_info_event`、
`…_extract_event`、`…_delete_event`、`melis_core_gdpr_auto_delete*`）。

## 数据库表

| 表 | 存储内容 |
| --- | --- |
| `melis_core_user` | 后台用户（login、密码哈希、`usr_rights` XML、管理员标志、语言、角色）。 |
| `melis_core_user_role` | 角色及其 `urole_rights` XML。 |
| `melis_core_user_connection_date` | 登录历史。 |
| `melis_core_lang` | 后台语言。 |
| `melis_core_platform` | 环境/平台。 |
| `melis_core_bo_emails` / `_details` | 事务性邮件模板及按语言划分的正文。 |
| `melis_core_log` / `_log_type` / `_log_type_trans` | 操作日志、类型及其翻译。 |
| `melis_core_lost_password` | 密码重置令牌。 |
| `melis_core_microservice_auth` | 微服务端点的 API key。 |
| `melis_core_dashboards` / `_dashboard_schema` | 按用户划分的仪表盘布局。 |
| `melis_core_plugins` | 已注册的插件。 |
| `melis_core_gdpr_delete_config` / `_delete_emails_logs` | GDPR 自动删除规则和审计记录。 |
| `melis_user_password_history` | 密码历史（防止复用）。 |
| `melis_announcement` | 后台公告。 |

## 关键文件

| 关注点 | 路径 |
| --- | --- |
| 模块引导 | `vendor/melisplatform/melis-core/src/Module.php` |
| 路由、服务、控制器、视图辅助器 | `vendor/melisplatform/melis-core/config/module.config.php` |
| 传统后台外壳与工具树（interface） | `vendor/melisplatform/melis-core/config/app.interface.php` |
| DataTable 工具声明 | `vendor/melisplatform/melis-core/config/app.tools.php` |
| 微服务端点 | `vendor/melisplatform/melis-core/config/app.microservice.php` |
| 原生 react-api 路由 + 控制器 | `config/react-api.php` + `src/Controller/MelisReactApi*Controller.php` |
| 原生工具的能力 | `config/react.capabilities.php` |
| React 应用源码 | `vendor/melisplatform/melis-core/ui-react/src/` |
| 已构建的 React 应用（已提交） | `vendor/melisplatform/melis-core/public/ui-react/` |
| 服务 · 控制器 · 表网关 | `src/Service/` · `src/Controller/` · `src/Model/Tables/` |
| 安装 SQL 与迁移 · 翻译 | `install/` · `language/` |

另请参阅：[模块参考](/zh/reference/modules)、[创建工具](/zh/guide/create-a-tool)、
[插件](/zh/guide/plugins)
