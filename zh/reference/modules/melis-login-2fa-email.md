# MelisLogin2faEmail

> Melis 2FA 系统的邮件发送通道 —— 通过电子邮件发送一次性登录验证码。软件包 `melisplatform/melis-login-2fa-email`。

## 用途

MelisLogin2faEmail 是 [MelisLogin2fa](/zh/reference/modules/melis-login-2fa) 的**默认且内置**的邮件通道。它处理由 2FA 核心触发的 `canSend` 和 `sendUserCode` 事件，判断用户是否可以通过电子邮件联系到，然后将 6 位验证码发送出去。由于核心模块依赖本模块、本模块又依赖核心模块，因此二者成对安装 —— 邮件通道始终是可用的后备通道。

## React 后台中的呈现

本模块是一个 **2FA 方法插件**，而非工具：它**没有 React 砖块、没有 `react-api` 路由、没有能力项，也没有自己的界面**。它从不作为条目出现在 `/melis-react` 侧边栏或菜单中。相反，邮件通道仅出现*在* MelisLogin2fa / MelisCore 所拥有的界面*内部*：

- **作为一种可选择、可排序的 2FA 方法**，位于核心模块向 *Other config* 工具贡献的 **2FA 设置区块** 中。管理员在此启用它并设置其顺序；顺序决定了先尝试哪个已启用的通道。
- **作为登录时的邮件 + 验证码输入步骤** —— 当 2FA 已开启且邮件被选为通道时，登录流程会将 6 位验证码发送至邮箱并显示验证码输入界面。确认信息会显示一个**打码遮蔽**的地址（例如 `jo****@…`）。

本模块**没有 React 截图**，因为它没有自己的界面。

## 启用它

本模块由 `melis-login-2fa` 所依赖，并随其自动安装。除了加载 `MelisLogin2fa` 之外，无需在模块加载文件中添加单独的条目。

要激活邮件通道，请打开在 React 后台中呈现的 2FA 设置：

**System config → Other config → 2FA** —— 将 **Email** 启用为一种发送方式，并在已启用的通道中设置其顺序。

平台的后台（BO）邮件功能也必须处于激活状态（通过 MelisCore 邮件设置进行配置）。

## 关键服务

| 服务别名 | 作用 |
| --- | --- |
| `Melis2faBOEmailService` | 继承自 `MelisCoreBOEmailService`；重写 `sendBoEmailByCode()` / `sendEmail()` 以设置正确的信封发件人（使用 `email_from` 而非收件人地址）。按代号加载邮件模板，替换 `[TAG]` 占位符，将其包裹进布局中，并通过 `Laminas\Mail` 发送。 |
| `MelisLogin2faEmailControllerPlugin` | 控制器插件 —— 由两个监听器共同调用的入口点；对外暴露 `canSend($userData)` 和 `sendUserCode($user, $code)`。 |

## 监听器

| 监听器 | 事件 | 行为 |
| --- | --- | --- |
| `MelisCoreCanSendListener` | `canSend` | 返回 `['melis-login-2fa-email' => <bool>]` —— 当用户拥有可用的 `usr_email`（非空且通过 `Laminas\Validator\EmailAddress` 校验）时为 `true`。 |
| `MelisCoreSendUserCodeListener` | `sendUserCode` | 仅在尚未发送**且**本通道在 `orderedModules` 中排在首位（`orderedModules[0] === 'melis-login-2fa-email'`）时才起作用。复用或创建一条 `melis_core_login_2fa_codes` 记录，解析区域设置（locale），发送验证码，然后设置 `sent=true`，调用 `stopPropagation`，并返回 `['sent'=>true, 'hash'=>…, 'message'=>'<sent-to> '.maskEmail($email)]`。 |

在整个方法选择和排序过程中所使用的标识符是字符串 `melis-login-2fa-email`。

## 区域设置与找回链接

`sendUserCode()` 会解析收件人的**区域设置（locale）**（在后台（BO）上下文中使用收件人自身的 `usr_lang_id`，并以会话区域设置作为后备；在前台（FO）上下文中使用站点主页面的语言），以便邮件的主题和正文使用收件人的语言。

邮件中的*忘记密码*链接会根据用户所来自的后台进行适配：一位**从 React 外壳**请求验证码的后台用户，其链接会指向 **`/melis-react/forgot-password`**，而非旧版的 `/melis/lost-password`。这由 `($user['ui_origin'] ?? null) === 'react'` 控制，其中 `ui_origin` 由核心模块的 `Login2faController::request2faCodeAction()` 派生得出（基于 Referer，默认为 `'legacy'`）。流程中没有其他与 React 相关的部分。

## 配置

在 `melis_login_2fa_email` 配置键下声明：

| 键 | 默认值 | 说明 |
| --- | --- | --- |
| `email_from` | `noreply@melistechnology.com` | 信封发件人地址 |
| `from_name` | `Melis Platform` | 发件人显示名称 |
| `reply_to` | — | 回复至（Reply-to）地址 |

## 数据库表

| 表 | 存储内容 |
| --- | --- |
| `melis_core_login_2fa_codes` | 一次性验证码（与 2FA 核心共享）；在仍然有效时复用记录，或由 `MelisLogin2faService::generate2faCode()` 新建记录。 |

## 关键文件

| 关注点 | 路径 |
| --- | --- |
| 模块引导 | `vendor/melisplatform/melis-login-2fa-email/src/Module.php` |
| 模块配置 | `vendor/melisplatform/melis-login-2fa-email/config/module.config.php` |
| `canSend` 监听器 | `vendor/melisplatform/melis-login-2fa-email/src/Listener/MelisCoreCanSendListener.php` |
| `sendUserCode` 监听器 | `vendor/melisplatform/melis-login-2fa-email/src/Listener/MelisCoreSendUserCodeListener.php` |
| 控制器插件 | `vendor/melisplatform/melis-login-2fa-email/src/Controller/Plugin/MelisLogin2faEmailControllerPlugin.php` |
| 邮件服务 | `vendor/melisplatform/melis-login-2fa-email/src/Service/Melis2faBOEmailService.php` |

## 元数据

| 项 | 值 |
| --- | --- |
| 软件包 | `melisplatform/melis-login-2fa-email` |
| 类型 | `melisplatform-module` · 类别 `core` · `dbdeploy: true` |
| 命名空间 | `MelisLogin2faEmail\`（PSR-4 → `src/`） |
| 依赖 | `melisplatform/melis-login-2fa` `^5.3` · PHP `^8.1\|^8.3` |
| React 呈现 | 无 —— 无砖块、无 `react-api`、无能力项、无界面 |

另见：[MelisLogin2fa](/zh/reference/modules/melis-login-2fa) · [MelisCore](/zh/reference/modules/melis-core)
