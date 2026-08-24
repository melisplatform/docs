# MelisLogin2faPrimotexto

> 通过 Primotexto 网关为 Melis 2FA 系统提供短信投递通道。软件包 `melisplatform/melis-login-2fa-primotexto`。

## 用途

MelisLogin2faPrimotexto 是一个可选的 2FA 通道，通过 **Primotexto** 短信 API 以短信方式发送一次性登录验证码。它接入核心 `MelisLogin2fa` 事件契约（`canSend` / `sendUserCode`）。当它在已启用通道中排在首位、且用户拥有有效电话号码时，便会以短信方式投递验证码；如果找不到有效电话号码，但同时启用了邮件通道，则会回退到邮件方式，并据此通知用户。

## 启用

添加到 `config/melis.module.load.php`：

```php
return [
    'MelisLogin2faPrimotexto',
];
```

需要 `melisplatform/melis-login-2fa`（`^5.3`）以及 PHP `^8.1|^8.3`。核心模块 `MelisLogin2fa` 必须先行加载。

加载完成后，在共享的 **2FA 配置**（System config → 2FA）中启用 **SMS (Primotexto)**，并将其排在首位，使其成为主通道。在 `melis_login_2fa_primotexto` 配置键下提供 Primotexto API 凭据（参见 [配置](#配置)）。

## 在 React 后台中

本模块是一个 **服务端 2FA 方法插件**，而非后台工具。在 React 后台（`/melis-react`）中，它 **没有页面、没有路由、也没有菜单项**。它在 React 中的全部足迹是一个 **仅含 id 的发现砖块**：一个极简的 `public/ui-react/brick.manifest.json`（其中 `route`、`forwardKey` 和 `melisKey` 均为 `null`），以及一个只注册自身 id 的 `brick.tsx`。

```tsx
// ui-react/src/brick.tsx — 全部 React 贡献（仅含 id，无 UI）。
window.__melisRegisterBrick?.({ id: 'melis-login-2fa-primotexto' })
```

正是注册该 id，使模块出现在 `GET /melis/react-api/react-modules` 中——即随附砖块的已启用模块的发现列表。MelisCore 的 `useModuleActive('MelisLogin2faPrimotexto')` 依据该列表来 **在原生用户表单上显示 `usr_phone` 字段**——用户需要电话号码才能使用短信 2FA。本模块 **不提供自身的 `react-api` 端点，也不提供任何能力（capability）**；Primotexto API 设置项（`url`、`api_key`、`sender`）由 2FA 核心所拥有的共享 2FA 配置区块渲染，而非由本模块渲染。

## 配置

```php
// config/autoload/primotexto.local.php  (do NOT commit real keys)
return [
    'melis_login_2fa_primotexto' => [
        'url'     => 'https://api.primotexto.com/v2/notification/messages/send',
        'api_key' => 'YOUR_API_KEY',   // override per environment
        'sender'  => 'Melis',
    ],
];
```

> **警告。** 已提交的 `config/module.config.php` 附带了一个字面量 `api_key` 占位符。请始终在本地/环境专属的配置文件中覆盖它，并轮换任何可能已被提交的真实密钥。

## 关键服务

| 服务别名 | 作用 |
| --- | --- |
| `SmsService` | 调用 Primotexto HTTP API 投递 OTP 短信；将法国 `0…` 号码规范化为 `+33…`；将 curl/HTTP 失败记录到 `CmaErrorLogsTable` |
| `MelisLogin2faPrimotextoControllerPlugin` | 控制器插件，暴露 `canSend($userData)` 和 `sendUserCode($user, $code)`；驱动 `SmsService` |

## 事件监听器

| 监听器 | 事件 | 行为 |
| --- | --- | --- |
| `MelisCoreCanSendListener` | `canSend` | 返回 `['melis-login-2fa-primotexto' => bool]`；如果无法发送但邮件通道在排序中紧随其后，则将 `twofa_fallback_message` 暂存到 `melis_login_2fa` 会话中 |
| `MelisCoreSendUserCodeListener` | `sendUserCode` | 仅当尚未发送且本通道为 `orderedModules[0]` 时才动作；复用/创建 `melis_core_login_2fa_codes` 记录行，通过 `SmsService` 发送，将 `sent=true`，并调用 `stopPropagation` |

## 数据库表

| 表 | 存储内容 |
| --- | --- |
| `melis_core_user` | 新增一个可空的 `usr_phone` 列（由本模块的 `dbdeploy` 添加）——即 OTP 验证码发送到的电话号码 |
| `melis_core_login_2fa_codes` | OTP 验证码（由 `MelisLogin2fa` 核心所拥有；本通道通过 `MelisLogin2faService` + `MelisLogin2faCodesTable` 复用/创建记录行） |

## 示例

```php
// Primotexto API call assembled by SmsService::sendSms()
$url = $config['url'] . '?' . http_build_query([
    'apiKey'     => $config['api_key'],
    'identifier' => $number,           // normalised to +33… for French numbers
    'sender'     => trim($config['sender']),
    'message'    => $message,
]);
// Sent via curl (GET). HTTP >= 400 or curl failure → logged + returns false.
```

## 注意事项

- **`CmaErrorLogsTable` 依赖。** `SmsService` 会将失败记录到某个 CMA 客户端模块的 `CmaErrorLogsTable`。如果在通用安装环境中未注册该表/服务，错误日志记录路径将会失败。若在原始客户端上下文之外部署，请将此依赖设为可选。
- **回退到邮件。** 如果 Primotexto 排在首位但用户没有有效电话号码，且同时启用了邮件通道并排在其后，则验证码会以邮件方式投递，并附带一条说明性消息。
- **UI 中掩码显示的电话号码。** 验证码输入界面只显示电话号码的掩码版本（例如 `+3…**…07`）。

## 关键文件

| 关注点 | 路径 |
| --- | --- |
| 模块引导 | `vendor/melisplatform/melis-login-2fa-primotexto/src/Module.php` |
| `canSend` 监听器 | `vendor/melisplatform/melis-login-2fa-primotexto/src/Listener/MelisCoreCanSendListener.php` |
| `sendUserCode` 监听器 | `vendor/melisplatform/melis-login-2fa-primotexto/src/Listener/MelisCoreSendUserCodeListener.php` |
| 短信 API 服务 | `vendor/melisplatform/melis-login-2fa-primotexto/src/Service/SmsService.php` |
| 控制器插件 | `vendor/melisplatform/melis-login-2fa-primotexto/src/Controller/Plugin/MelisLogin2faPrimotextoControllerPlugin.php` |
| React 砖块 | `vendor/melisplatform/melis-login-2fa-primotexto/ui-react/src/brick.tsx` |
| React 清单 | `vendor/melisplatform/melis-login-2fa-primotexto/public/ui-react/brick.manifest.json` |
| 模块配置 | `vendor/melisplatform/melis-login-2fa-primotexto/config/module.config.php` |
| 数据库迁移 | `vendor/melisplatform/melis-login-2fa-primotexto/install/dbdeploy/` |

另请参阅：[MelisLogin2fa](/zh/reference/modules/melis-login-2fa) · [MelisLogin2faEmail](/zh/reference/modules/melis-login-2fa-email) · [MelisCore](/zh/reference/modules/melis-core)
