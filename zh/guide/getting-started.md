# 安装

Melis Platform 社区版是**免费且开源的**（OSL-3.0）。目前提供三种安装方式——请选择最适合你工作流程的一种。

Melis v6 沿用了与 v5 相同的框架、模块和数据库。真正改变的是**后台**：一个全新的 React 界面现已上线于 **`/melis-react`**，与经典工具并存。安装过程完全相同——下文各节内容依旧适用，而[认识 React 后台](#meet-the-react-back-office)一节将说明你登录后会看到什么。

## 在哪里获取 Melis Platform

所有官方仓库都托管在 GitHub 上的 **[melisplatform](https://github.com/melisplatform)** 组织下：

| 仓库 | 说明 |
|---|---|
| [melis-docker-react](https://github.com/melisplatform/melis-docker-react) | 开箱即用的 Docker 技术栈，**默认启用 React 后台**——获得可用 v6 平台的最快途径 |
| [melis-platform-skeleton](https://github.com/melisplatform/melis-platform-skeleton) | 用于 Composer 和源码安装的项目骨架 |

该骨架同时以 [`melisplatform/melis-platform-skeleton`](https://packagist.org/packages/melisplatform/melis-platform-skeleton) 的名称发布在 **Packagist** 上，Docker 镜像则发布在 **Docker Hub** 上——当你启动 Compose 技术栈时会自动拉取它们。

::: tip 经典（v5）Docker 技术栈
早于 React 的 [`melis-docker`](https://github.com/melisplatform/melis-docker) 技术栈仍然存在；相关内容见[旧版（v5）安装指南](/legacy/guide/getting-started)。
:::

## 选择你的安装方式

| 方式 | 命令 | 最适合 |
|---|---|---|
| **Docker** | `git clone https://github.com/melisplatform/melis-docker-react.git` | 演示、本地开发、无需本地 PHP 环境——**默认启用 React 后台** |
| **Composer** | `composer create-project melisplatform/melis-platform-skeleton` | 在你自己的 Apache/PHP 环境上创建新项目 |
| **GitHub 源码** | `git clone --recursive https://github.com/melisplatform/melis-platform-skeleton.git` | 贡献者，以及希望获得完整 Git 历史的团队 |

---

## 环境要求

对于 Docker，所有依赖均已打包——请直接跳至下方的[方案 A](#option-a-docker-recommended)。
对于 Composer 或源码安装：

- **PHP 8.3（推荐）**或 8.4（实验性），并需启用以下扩展：`intl`、`mysqli`、
  `pdo_mysql`、`gd`（freetype/jpeg/webp）、`zip`、`curl`、`mbstring`、`exif`、`xml`（并建议启用
  `opcache`）。PHP 8.5 暂不可用（Laminas 依赖上限为 8.4）。
- **MySQL 8**（本技术栈使用 MySQL 8.4）。
- **Composer 2** 和 **Git**（用于 Composer 和源码安装方式）。
- **Apache 或 Nginx**，并将 `mod_rewrite` / `try_files` 指向 `public/`。

## 方案 A —— Docker（推荐）

Melis 提供了专门的 **React 版 Docker 仓库**
[`melis-docker-react`](https://github.com/melisplatform/melis-docker-react)，其中**每个技术栈都默认启用 React 后台**（`WITH_REACT=1`）——你将开箱即用地同时获得 `/melis`（经典）**和** `/melis-react`。克隆一次，然后选择一个技术栈（每个文件夹都是自包含的，各自带有 `docker-compose.yml`、`.env.example`、`conf/` 和 `README.md`）：

```bash
git clone https://github.com/melisplatform/melis-docker-react.git
cd melis-docker-react
```

| 技术栈（文件夹）  | 你将获得 | 最适合 |
|---|---|---|
| **`prebuilt/`**  | 拉取一个开箱即用的镜像 + MySQL——无需本地构建 | 最快速的评估 |
| **`install/`**   | 将全新的骨架构建到宿主机的 `./melis`（可编辑）+ 一个 Vite 开发服务器 | 处理代码 / React UI |
| **`fpm/`**       | nginx + PHP-FPM，骨架已烘焙进镜像 | 类生产环境的拓扑 |
| **`app/latest/`**| 挂载一个**已有的** Melis 项目（会改写你的 `composer.json`——请先提交） | 你已经拥有的项目 |
| **`dev/`**       | 仅提供各 PHP 版本的基础镜像（Apache/FPM，PHP 8.1–8.5） | 构建你自己的镜像 |

每种方式的结尾都相同：位于 <http://localhost:8080> 的 **Melis 原生 Web 安装程序**（`/melis/setup`）负责设置数据库结构、管理员用户以及可选的演示站点。该安装过程**不是**脚本化的——Web 安装程序才是权威来源。

### 最快 —— 预构建镜像

```bash
cd prebuilt
cp .env.example .env
docker compose up -d
# 打开 http://localhost:8080 并按照 Web 安装程序操作
```

当安装程序询问数据库信息时，请使用 `.env` 的默认值：

| 字段 | 值 |
|---|---|
| 主机 | `melis-db` &nbsp;*（不带 `:port`）* |
| 数据库 / 用户 / 密码 | `melis` / `melis` / `melis` |

### 一键构建（代码可在宿主机上编辑）

首次启动会执行骨架的 `composer create-project`，将其安装到 `./melis`（需要几分钟）；代码会保留在你的宿主机上，可编辑。此技术栈还会启动一个 **Vite 开发服务器**，用于对 React UI 进行热重载：

```bash
cd install
cp .env.example .env
mkdir -p melis            # 预先创建绑定挂载目录（WSL / Rancher Desktop）
docker compose up -d --build
```

该技术栈暴露以下服务：

| 服务 | URL |
| --- | --- |
| 前台 | <http://localhost:8080> |
| **React 后台** | <http://localhost:8080/melis-react> |
| 经典工具 | <http://localhost:8080/melis> |
| 带热重载的 React UI（Vite） | <http://localhost:5173> |

::: tip 默认值与提示
数据库主机为 `melis-db`（不带端口），数据库 / 用户 / 密码为 `melis` / `melis` / `melis`。如果 8080 端口被占用，请在 `.env` 中修改 `HOST_PORT`。**无需 GitHub 令牌**——所有软件包（React 模块和 `laminas-*` 分支）都从 Packagist 解析。`make` 快捷命令：`make up STACK=install`、`make logs`、`make shell`、`make down`、`make up VITE=1`、`make adminer`。
:::

::: warning 上生产环境前请更改凭据
默认的 `melis` / `melis` 凭据以及数据库密码仅供本地开发使用。在将任何实例公开暴露之前，请务必更改它们。
:::

### React 后台是如何启用的

Composer 会拉取以下三个模块的稳定版 **6.x** 发行版：[`melis-core`](/zh/reference/modules/melis-core)（附带已提交的 React 应用生产构建，通过 `/MelisCore/ui-react/` 提供——运行时无需 Node.js）、[`melis-react-api`](/zh/reference/modules/melis-react-api)（位于 `/melis/react-api/*` 下的 JSON API）以及 [`melis-react-override`](/zh/reference/modules/melis-react-override)（`/melis-react` SPA 路由 + 用于在 React 外壳内显示尚未迁移工具的 iframe 桥接）。更倾向于纯粹的旧版 Melis？请在首次执行 `up` 之前于 `.env` 中设置 `WITH_REACT=0`。

若要同时运行多个技术栈而不必费心处理端口，可选启用 `local-proxy/` 中共享的 `nginx-proxy`，它会路由 `*.local` 主机名——详见该仓库的 README。

## 方案 B —— Composer（在你的环境上创建新项目）

```bash
# 1. 从骨架创建项目
composer create-project melisplatform/melis-platform-skeleton my-project
cd my-project
composer install

# 2. 创建数据库（utf8mb4）
mysql -u root -p -e "CREATE DATABASE myproject CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 3. 导入基础数据，然后运行迁移
mysql -u root -p myproject < install/first_install.sql
flyway -configFiles=flyway/conf/flyway.conf migrate
```

将一个 Apache 虚拟主机指向项目的 **`public/`** 目录，并声明这两个 Melis 环境变量：

```apache
<VirtualHost *:80>
    DocumentRoot "/path/to/my-project/public"
    <Directory "/path/to/my-project/public">
        Options -Indexes +FollowSymLinks +ExecCGI
        DirectoryIndex index.php
        AllowOverride All
        Require all granted
    </Directory>

    ServerName www.mysite.local
    SetEnv MELIS_PLATFORM "development"
    SetEnv MELIS_MODULE   "MelisDemoCms"
</VirtualHost>
```

将 `127.0.0.1 www.mysite.local` 添加到你的 hosts 文件，重新加载 Apache，然后打开
`http://www.mysite.local/melis-react`。

## 方案 C —— GitHub 源码（贡献者）

每个模块都位于各自的仓库中，并作为 Git 子模块引入：

```bash
git clone --recursive https://github.com/melisplatform/melis-platform-skeleton.git
# 已经克隆过了？拉取所有子模块：
git submodule update --init --recursive

cd melis-platform-skeleton
composer install
```

然后按照上文方案 B 相同的虚拟主机和数据库设置步骤操作。

## 两个 Melis 环境变量

每个 Melis 安装都由两个变量驱动（对于 Docker 在 `docker-compose.yml` 中设置，对于 Apache 则通过 `SetEnv` 设置）：

- **`MELIS_PLATFORM`** —— 标识环境。它会选择配置文件
  `config/autoload/platforms/<MELIS_PLATFORM>.php`，该文件保存了**数据库连接**信息（因此
  `MELIS_PLATFORM=local` 会加载 `config/autoload/platforms/local.php`）。
- **`MELIS_MODULE`** —— 标识哪个**站点模块**作为该域名的前台提供服务。

## 认识 React 后台

打开 **`/melis-react`** 并登录——该 React 应用会显示自己的登录界面，并自行处理身份验证。登录后，你会进入仪表盘：通知气泡、KPI 计数器（用户 / 站点 / 页面 / 语言）、近期登录活动，以及你保存的磁贴布局。

初次接触时，有几点值得了解：

- **左侧菜单。** 整个导航树都在这里，并已**根据你的权限进行过滤**——只有当某个工具的模块已启用且你有权使用时，它才会出现。点击某一项即可在主面板中打开对应的工具。
- **原生 React 工具（"bricks"，砖块）。** 许多工具已被重写为原生 React 页面，以带来更快速、更流畅的体验。这些工具每个都带有一个 **New (React) / Old (iframe)**（新版 React / 旧版 iframe）切换开关，让你可以在需要时随时切换到同一工具的经典版本。
- **经典工具依然可用。** 任何尚未被重写的工具都能无缝地在外壳内打开——与之前一样的 DataTables、表单、标签页、模态框和保存按钮。它的外观和行为与经典的 `/melis` 后台完全一致，只是被嵌入在 React UI 的框架内。
- **两个 URL，一个平台。** `/melis-react` 是全新体验；如果你更喜欢，经典后台仍然可通过 **`/melis`** 访问。两者驱动的是相同的数据、权限和模块。

::: tip AI 助手始终一键可及
每个后台界面的角落都有一个悬浮的 **AI Assistant**（AI 助手）按钮。打开它即可与 Melis 内置的助手对话，无需离开你正在使用的工具。

![React 后台中悬浮的 AI 助手按钮](/screenshots/react/melis-ai/melisai-footer-icon-generalassistant.png)
:::

有关外壳、砖块（bricks）以及经典工具桥接背后的思维模型，请参阅[架构与概念](./concepts)；有关每个工具的功能，请参阅[模块参考](/zh/reference/modules/melis-core)。

## 后续步骤

- [架构与概念](./concepts) —— Melis 背后的思维模型。
- [搭建网站（CMS）](./build-a-site) —— 页面、模板和站点树。
- [创建你的第一个工具](./create-a-tool) —— 添加你自己的后台工具。
- [使用 AI](./ai) —— Melis 内的助手、智能体和 MCP。
