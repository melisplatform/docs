# MelisComposerDeploy

> 将 Composer 嵌入平台内部，以编程方式安装、更新和移除模块。软件包 `melisplatform/melis-composerdeploy`。

## 用途

MelisComposerDeploy 让平台能够 **在应用内部运行 Composer** —— 无需终端访问即可安装、更新或移除模块。它是后台 **模块工具 / 应用市场（marketplace）** 以及 MelisInstaller 首次运行向导背后的无界面（headless）引擎。它与 MelisAssetManager、MelisDbDeploy 和 MelisInstaller 一起位于 MelisCore 基础层，并且仅依赖 `composer/composer`（与 MelisCore 无耦合）。

## 无 React 后台

MelisComposerDeploy **没有 React 界面，也没有后台工具** —— 无论是在旧版后台还是 React 后台（`/melis-react`）中均是如此。它不附带任何 `ui-react/` brick、不含 `brick.manifest.json`、不含 `config/react-api.php`，也没有控制器。它从不出现在侧边栏中，也没有任何可点击的内容。

它与 React 后台的关系是 **间接的**：当你通过应用市场安装某个模块时，MelisComposerDeploy 会下载对应的 Composer 软件包。如果该软件包携带了已构建好的 React brick，那么 React 外壳会在 **模块激活后** 发现该 brick —— 但 brick 的发现由 `melis-react-api` 处理，而非本模块。MelisComposerDeploy 从不接触、构建或提供 React 资源。

> 在所有 `vendor/` 都已提交（不进行服务端 `composer install`）的已部署环境中，MelisComposerDeploy 是 *运行时应用市场* 引擎 —— 而非用于交付预构建 React 应用的机制。

## 启用它

添加到 `config/melis.module.load.php`：

```php
return [
    'MelisComposerDeploy',
];
```

## 核心服务

整个模块本质上就是一个服务，别名为 `MelisComposerService`（`config/module.config.php` → `service_manager.aliases`），类为 `MelisComposerDeploy\Service\MelisComposerService`。它构建一个 Composer 控制台命令，并通过 Symfony Console 在进程内运行，驱动随附于 `bin/extracted-composer/` 下的内置 Composer 库。

| 服务别名 | 作用 |
| --- | --- |
| `MelisComposerService` | 进程内 Composer 运行器。对外暴露 `download()`、`update()`、`remove()`、`dumpAutoload()`，以及 `setDocumentRoot()` 和 `setDryRun()`。 |

```php
$composer = $sm->get('MelisComposerService');

$composer->setDocumentRoot($projectRoot);            // composer working-dir (defaults to DOCUMENT_ROOT/../)
$composer->setDryRun(true);                           // simulate without writing (--dry-run)

$composer->download('melisplatform/melis-cms-news');  // composer require <pkg>[:version]
$composer->update('melisplatform/melis-cms-news');    // composer update --root-reqs
$composer->remove('melisplatform/melis-cms-news');    // composer remove --no-scripts
$composer->dumpAutoload();                             // composer dump-autoload
```

来自源码的说明：

- **仅允许的命令**：`install`、`update`、`dump-autoload`、`require`、`remove`。其他任何命令都会返回“unknown command”（未知命令）响应。
- **参数加固**：`package[:version]` 字符串会针对严格的 `vendor/name` + 类 semver 正则进行校验，并拒绝空白字符，从而防止向 Composer 命令行注入参数。
- 命令以 `--ignore-platform-reqs --no-progress --no-scripts --prefer-dist` 和 `--working-dir=<docRoot>` 运行。
- 没有路由、没有控制器、没有事件、没有视图 —— 它是一个供其他模块调用的服务。

## 部署流水线

调用方驱动该服务；一个典型的运行时安装流程如下：

```text
MelisComposerService::download(pkg)   →  composer require (package downloaded into vendor/)
        ↓
MelisComposerService::dumpAutoload()  →  autoloader regenerated (new classes visible)
        ↓
MelisDbDeploy                          →  applies the new module's SQL deltas (extra.dbdeploy: true)
        ↓
module active                          →  MelisAssetManager serves its assets; if the module ships
                                          a React brick, the React shell discovers it (via
                                          melis-react-api /react-modules)
```

最后一个箭头是与 React 后台唯一的、被动的接触点：本模块负责让模块变为存在且激活状态；React brick 的发现则完全属于 `melis-react-api`。

另请参阅：[MelisDbDeploy](/zh/reference/modules/melis-dbdeploy)、[MelisInstaller](/zh/reference/modules/melis-installer)、[MelisAssetManager](/zh/reference/modules/melis-asset-manager)
