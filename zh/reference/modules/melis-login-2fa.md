# MelisLogin2fa

> Melis 登录的双因素认证核心 / 编排器 —— 在用户名 + 密码之后要求输入一次性验证码，并将验证码的投递委托给可插拔的渠道模块。软件包 `melisplatform/melis-login-2fa`。

## 用途

MelisLogin2fa 是 Melis 的 **2FA 编排器**。在用户通过用户名/密码验证后，它会拦截登录流程（通过 `melis_core_auth_pre_success`），检查当前平台和站点/模块是否启用了 2FA，选择一个投递渠道，并在输入有效的 6 位验证码之前使会话保持未最终确认状态。它本身**并不**发送验证码 —— 验证码的投递通过 `canSend` / `sendUserCode` 事件契约委托给可插拔的渠道模块（电子邮件、短信）。内置的电子邮件渠道（`melis-login-2fa-email`）是必需的依赖项，始终作为锁定的回退方案可用。

## 启用它

添加到 `config/melis.module.load.php`：

```php
return [
    'MelisLogin2fa',
];
```

`melisplatform/melis-login-2fa-email` 是必需的依赖项，也必须一并加载（它与本模块作为一对进行安装）。PHP `^8.1|^8.3`。

## 在 React 后台中

本模块提供一个**仅贡献型 brick** —— 它**没有左侧菜单工具，也没有自己的路由**。相反，它注册了一个 `OtherConfigSection`，由 MelisCore 原生的 **Other config** 页面在其自身卡片之后渲染。你可以在 **System configuration → Other config**（系统配置 → 其他配置）中找到 2FA，它是位于底部的一张 **"Two-factor authentication (2FA)"**（双因素认证）卡片。该卡片仅在模块处于激活状态时出现（通过 `GET /melis/react-api/react-modules` 发现，随后在启动时预取并求值 bundle）。

![React Other config 工具内的 "Two-factor authentication (2FA)"（双因素认证）卡片：包含带有目标标签页的 "Melis, sites & other modules"（Melis、站点及其他模块）区块、一个 Activate 2FA（启用 2FA）开关和投递顺序列表，以及带有按平台 Activate 2FA 开关的 "Per environment"（按环境）区块](/screenshots/react/melis-login-2fa/melislogin2fa-tooloverride-otherconfig-tab-2fa.png)

该卡片包含两个区块：

| 区块 | 控制内容 |
| --- | --- |
| **Melis, sites & other modules**（Melis、站点及其他模块） | 左侧的目标标签页栏（**Melis Platform BO**，以及当 MelisCms 激活时的每个**站点**）。对于所选目标：一个 **Activate 2FA**（启用 2FA）开关和一个 **"Delivery order (drag to reorder)"**（投递顺序（拖动以重新排序））列表。**Default BO Email**（默认后台邮件）被固定（带有 Default 标签 + 邮件图标，始终激活，无法关闭）。其他方式（例如 **Primotexto**/短信）带有开/关开关。拖动行可设置优先级/回退链。 |
| **Per environment**（按环境） | 平台标签页栏（**local**、**prod** ……），每个平台都有各自的 **Activate 2FA** 开关，用于写入 `plf_2fa_active`。 |

每个开关、切换和重新排序都会**立即保存**。只有当目标和当前环境都处于激活状态时，2FA 才会运行。该 React 区块不携带高级权限（capability）声明 —— 能够访问它本身就已经需要拥有 Other config 工具的访问权限。

!["Delivery order (drag to reorder)"（投递顺序（拖动以重新排序））方式列表：Default BO Email（默认后台邮件，带有 Default 标签 + 邮件图标，锁定且始终激活）位于 Primotexto（带开/关开关）之上；拖动抓取手柄可设置优先级/回退链](/screenshots/react/melis-login-2fa/melislogin2fa-tooloverride-otherconfig-tab-2fa-order.png)

**登录质询本身并非一个 React brick**：当 2FA 适用时，登录会被拦截在一个由 `Login2faController` 提供的独立验证码输入页面上（`/melis` 和 `/melis-react` 使用同一页面）。用户会看到经过掩码处理的目标（例如 `jo****@…`），输入 6 位验证码，并可在冷却期后**重新发送**（Resend）。错误的验证码次数受限，失败次数过多会锁定账户，验证码在 10 分钟后过期。

## 关键服务

| 服务别名 | 职责 |
| --- | --- |
| `MelisLogin2faService` | 生成 6 位验证码（`generate2faCode()`）、64 位十六进制跟踪哈希（`generateHash()`）以及有效期时间戳（`getValidityDate($minutes)`）。 |
| `MelisLogin2faConfigService` | 读取和写入按后台 / 按站点的 2FA 配置。关键方法：`getModuleConfig()`、`getAllModuleConfigs()`、`getAllSiteConfigs()`、`getAvailable2faModules()`（触发 `melis_login_2fa.collect_available_modules`）、`mergeAvailableModulesWithConfig()`、`filterOnlyInstalledModules()`、`saveItem()`。 |
| `MelisLogin2faTranslationService` | 支持区域设置的翻译辅助工具（`translateByLocale`、`boTranslate`、……），使验证码投递消息与用户的语言相匹配。 |
| `MelisLogin2faControllerPlugin` | 暴露 `verifyUserCode($userId, $code)` —— 清除过期验证码、强制执行尝试次数限制、在失败次数过多时锁定账户、并在成功时清除记录。 |
| `MelisLogin2faVerifierPlugin`（别名 `melisLogin2faVerifier`） | 拦截插件 —— 在提交有效验证码之前使会话保持未最终确认状态。 |

## React API

路由位于 **`config/react-api.php`** 中（通过 `Module::getConfig()` 在 MelisReactApi 的 `melis-react-api` 路由下合并）。控制器 **`MelisLogin2faReactApiSettingsController`**（可调用别名 `MelisLogin2faReactApiSettings`），全部位于 `/melis/react-api/login2fa-settings` 之下，契约为 `{ success, data, error }`。

| 方法与 URL | 用途 |
| --- | --- |
| `GET /melis/react-api/login2fa-settings` | 所有设置 → `{ moduleConfigs[], sites[], siteConfigs[], platforms[] }`。每一行的 `module_list` 都经过 `mergeAvailableModulesWithConfig()` 处理，因此从未保存过的行仍会列出每一个已安装的方式。仅当 MelisCms 激活时才会有站点行。 |
| `POST /melis/react-api/login2fa-settings/save-config` | 保存一条 `melis_core_login_2fa_config` 记录：`{ mcl2cf_id?, mcl2cf_module_name, mcl2cf_site_id, mcl2cf_activate_2fa, module_list[] }` → 委托给 `MelisLogin2faConfigService::saveItem()`。 |
| `POST /melis/react-api/login2fa-settings/save-platform` | 保存某个平台的标志位：`{ plf_id, plf_2fa_active }`。写入 `MelisCoreTablePlatform`；若缺少 `plf_id` 则返回 `422`。 |

该 react-api 是旧版 Other config 标签页的轻量级 JSON 镜像 —— 相同的行、相同的 `saveItem`，只是用 JSON 代替了渲染后的 phtml。操作**仅通过身份验证**进行拦截（`denyUnlessAuthenticated()`，否则返回 `401`）；本模块**不附带 `config/react.capabilities.php`**，也不声明任何高级权限，因此请勿为其臆造 capability 字符串。

## 数据库表

| 表 | 存储内容 |
| --- | --- |
| `melis_core_login_2fa_codes` | 一次性验证码：用户 id、电子邮件、类型（`melis-backoffice` 或站点 id）、6 位验证码、会话哈希、过期日期，以及带时间戳的失败尝试计数器（`mcl2c_try`、`mcl2c_try1/2/3_date`）。 |
| `melis_core_login_2fa_config` | 按后台 / 按站点的配置行：`mcl2cf_module_name` 或 `mcl2cf_site_id`、`mcl2cf_activate_2fa`、`mcl2cf_module_list`（JSON 有序渠道列表）。 |

`melis_core_platform` 新增了一个 `plf_2fa_active` 列（由本模块的 dbdeploy 添加）。

## 可调配置项

在 `melis_login_2fa` 配置键下声明：

| 键 | 默认值 | 描述 |
| --- | --- | --- |
| `max_tries` | `3` | 账户被锁定（`usr_status = 0`）之前允许的验证码失败尝试次数。 |
| `code_validity_minutes` | `10` | 验证码过期前的分钟数。 |
| `request_code_cooldown_seconds` | `60` | 两次重新发送请求之间的最短秒数。 |

## 渠道事件契约

核心从不直接调用某个渠道 —— 它会触发事件，由渠道来响应。要添加一个投递方式，需为以下事件实现监听器：

| 事件 | 方向 | 用途 |
| --- | --- | --- |
| `melis_login_2fa.collect_available_modules` | 核心 → 渠道 | 渠道追加 `['module'=>'…', 'label'=>'…']`，使其出现在管理端的方式列表中。 |
| `canSend` | 核心 → 渠道 | 每个渠道返回 `['<module-name>' => bool]`，指示它是否能够触达用户。 |
| `sendUserCode` | 核心 → 渠道 | `orderedModules` 中第一个能够发送的渠道创建/复用验证码并投递，然后设置 `sent=true` 并调用 `stopPropagation`。 |

## 示例

```php
// Building a custom delivery channel — attach these two listeners in your module:

'canSend' => fn($e) => ['my-channel' => $canIReach($e->getParam('user'))],

'sendUserCode' => function ($e) {
    if (!empty($e->getParam('sent'))) return;                              // already sent
    if (($e->getParam('orderedModules')[0] ?? null) !== 'my-channel') return; // not my turn

    // Create/reuse the code via the core's service + table:
    // MelisLogin2faService::generate2faCode() + MelisLogin2faCodesTable

    // Deliver via your transport, then signal completion:
    $e->setParam('sent', true);
    $e->stopPropagation(true);
    return ['sent' => true, 'hash' => $hash, 'message' => 'sent to ' . $maskedTarget];
},

// Also respond to collect_available_modules so the admin can enable/order your channel.
```

## 关键文件

| 关注点 | 路径 |
| --- | --- |
| 模块引导 | `vendor/melisplatform/melis-login-2fa/src/Module.php`（`getConfig()` 合并 `react-api.php`） |
| 模块配置（服务、路由、可调项） | `vendor/melisplatform/melis-login-2fa/config/module.config.php` |
| React-api 路由 | `vendor/melisplatform/melis-login-2fa/config/react-api.php` |
| 拦截绕过路由列表 | `vendor/melisplatform/melis-login-2fa/config/excluded.routes.php` |
| 主登录监听器（`melis_core_auth_pre_success`） | `vendor/melisplatform/melis-login-2fa/src/Listener/MelisLogin2faMainListener.php` |
| 配置保存监听器 | `vendor/melisplatform/melis-login-2fa/src/Listener/MelisLogin2faListener.php` |
| 重新发送监听器 | `vendor/melisplatform/melis-login-2fa/src/Listener/MelisLogin2faRequestCodeListener.php` |
| React-api 控制器 | `vendor/melisplatform/melis-login-2fa/src/Controller/ReactApi/MelisLogin2faReactApiSettingsController.php` |
| 控制器（验证路由） | `vendor/melisplatform/melis-login-2fa/src/Controller/Login2faController.php` |
| 验证插件 | `vendor/melisplatform/melis-login-2fa/src/Controller/Plugin/MelisLogin2faControllerPlugin.php` |
| 拦截（验证器）插件 | `vendor/melisplatform/melis-login-2fa/src/Controller/Plugin/MelisLogin2faVerifierPlugin.php` |
| 核心服务 | `vendor/melisplatform/melis-login-2fa/src/Service/MelisLogin2faService.php` |
| 配置服务 | `vendor/melisplatform/melis-login-2fa/src/Service/MelisLogin2faConfigService.php` |
| 验证码表 | `vendor/melisplatform/melis-login-2fa/src/Model/Tables/MelisLogin2faCodesTable.php` |
| 配置表 | `vendor/melisplatform/melis-login-2fa/src/Model/Tables/MelisLogin2faConfigTable.php` |
| React brick 源码 | `vendor/melisplatform/melis-login-2fa/ui-react/src/`（`brick.tsx`、`Login2faOtherConfigSection.tsx`） |
| 构建后的 brick + 清单 | `vendor/melisplatform/melis-login-2fa/public/ui-react/brick.js` · `brick.manifest.json` |
| 数据库部署 | `vendor/melisplatform/melis-login-2fa/install/dbdeploy/` |

## 元数据

| 项 | 值 |
| --- | --- |
| 软件包 | `melisplatform/melis-login-2fa` |
| 类型 | `melisplatform-module` · 类别 `core` · `dbdeploy: true` |
| 命名空间 | `MelisLogin2fa\`（PSR-4 → `src/`） · 模块名 `MelisLogin2fa` |
| React brick | 仅贡献型（id `melis-login-2fa`，`route`/`forwardKey`/`melisKey` = `null`）；注册一个 `OtherConfigSection` |
| 依赖 | `melisplatform/melis-login-2fa-email` `^5.3` · PHP `^8.1\|^8.3` |

另请参阅：[MelisLogin2faEmail](/zh/reference/modules/melis-login-2fa-email) · [MelisCore](/zh/reference/modules/melis-core)
