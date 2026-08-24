# 模块参考

Melis Platform 是一组 `melisplatform/*` Composer 包。本页是 v6 骨架附带的 **50 个模块** 的总览，按领域分组。每个模块都是位于 `vendor/melisplatform/` 下的标准 Laminas 模块。

Melis v6 保留了与 v5 相同的框架和模块，但 **将后台替换为 React UI**，在 `/melis-react` 下提供服务。工具现在是原生 React **“积木”（bricks）**——模块自带、由外壳（shell）在启动时发现的独立 React UI——并带有一个 **新（React）/ 旧（iframe）** 切换开关，因此任何尚未重写的工具仍可作为其传统的 jQuery/AJAX 页面在外壳内运行。全局 **AI 助手** 浮层可在任意位置使用。该层通过两个基础设施模块提供服务：[`melis-react-api`](/zh/reference/modules/melis-react-api)（JSON API 主干——用户、菜单、资源、积木发现、仪表盘数据、能力解析器）和 [`melis-react-override`](/zh/reference/modules/melis-react-override)（SPA 外壳路由以及传统工具的 iframe 机制）。有关它们如何协同工作的说明，请参阅[架构指南](/zh/guide/architecture)。

::: tip 每个模块一个页面
每个模块还有一个 **专属参考页面**（用途、关键服务、工具、插件、数据表、关键文件）——请打开侧边栏中的 **模块** 部分，例如
[MelisCms](/zh/reference/modules/melis-cms)、[MelisCommerce](/zh/reference/modules/melis-commerce)、[MelisAIEngine](/zh/reference/modules/melis-ai-engine)。
:::

## 核心与平台

| 模块 | 角色 |
| --- | --- |
| [`melis-core`](/zh/reference/modules/melis-core) | 平台核心：后台外壳、配置树（`MelisCoreConfig`）、身份验证、权限、用户、服务和事件。在 v6 中保持不变——只是它所驱动的外壳现在由 React 渲染。 |
| [`melis-asset-manager`](/zh/reference/modules/melis-asset-manager) | 通过简洁的 URL 提供每个模块的 `public/` 资源（CSS/JS/图片），并交付编译后的打包文件。 |
| [`melis-cache-internal`](/zh/reference/modules/melis-cache-internal) | 面向 CMS 前台的整页 HTTP 缓存，支持局部（区域）缓存和按页排除。 |
| [`melis-composerdeploy`](/zh/reference/modules/melis-composerdeploy) | 内嵌 Composer，以编程方式安装、更新和移除模块。 |
| [`melis-dbdeploy`](/zh/reference/modules/melis-dbdeploy) | 无界面的数据库迁移运行器——按顺序应用每个模块的 SQL 增量。 |
| [`melis-marketplace`](/zh/reference/modules/melis-marketplace) | 后台内的模块商店，用于发现、下载、更新和移除模块。 |
| [`melis-phpinfo`](/zh/reference/modules/melis-phpinfo) | 只读诊断工具，在 React 后台中渲染 PHP 原生的 `phpinfo()`。 |
| [`melis-sql`](/zh/reference/modules/melis-sql) | 开发者工具中的只读 SQL 查询运行器，以原生全 React 积木形式提供。 |
| [`melis-react-api`](/zh/reference/modules/melis-react-api) | React 后台的 JSON API 主干——启动外壳并托管能力解析器。 |
| [`melis-react-override`](/zh/reference/modules/melis-react-override) | React 基础设施——在 `/melis-react` 外壳内渲染传统工具并提供 React SPA。 |

## CMS 与前台

| 模块 | 角色 |
| --- | --- |
| [`melis-cms`](/zh/reference/modules/melis-cms) | CMS 后台——站点、页面树、页面编辑器、模板、样式和 SEO，以 React 后台形式呈现。 |
| [`melis-engine`](/zh/reference/modules/melis-engine) | 共享的 CMS 数据基础——页面模型、站点、语言、模板插件基类和渲染缓存。 |
| [`melis-front`](/zh/reference/modules/melis-front) | 前台渲染系统——将 URL 转换为完整页面，并交付内容块（页面插件）。 |
| [`melis-demo-cms`](/zh/reference/modules/melis-demo-cms) | 官方参考/演示网站——一个即装即用的 **站点模块**。 |
| [`melis-cms-blog`](/zh/reference/modules/melis-cms-blog) | 博客系统，带原生 React 后台和三个前台展示插件。 |
| [`melis-cms-comments`](/zh/reference/modules/melis-cms-comments) | 面向新闻和博客的评论系统——审核、审批工作流和一个前台插件；在编辑器中提供“评论”选项卡。 |
| [`melis-cms-news`](/zh/reference/modules/melis-cms-news) | 新闻/博客系统，带 React 创作工具和三个前台展示插件。 |
| [`melis-cms-prospects`](/zh/reference/modules/melis-cms-prospects) | 潜在客户/联系管理——前台表单捕获消息；React 工具用于浏览、筛选、导出和分类。 |
| [`melis-cms-slider`](/zh/reference/modules/melis-cms-slider) | 滑块/轮播管理器（原生 React 积木），带前台模板插件。 |
| [`melis-cms-category2`](/zh/reference/modules/melis-cms-category2) | 多站点、多语言的内容分类，带原生 React 后台。 |
| [`melis-cms-mcq`](/zh/reference/modules/melis-cms-mcq) | 后台 MCQ（测验）构建器，现为原生全 React 工具。 |
| [`melis-cms-mcq-engine`](/zh/reference/modules/melis-cms-mcq-engine) | React MCQ 工具背后的数据、计分和前台渲染器。 |
| [`melis-cms-page-historic`](/zh/reference/modules/melis-cms-page-historic) | 页面编辑的审计日志——React 页面编辑器中的“历史”选项卡以及一个仪表盘小组件。 |
| [`melis-cms-page-analytics`](/zh/reference/modules/melis-cms-page-analytics) | 基础的页面访问分析，可通过提供程序扩展（例如 Google Analytics）。 |
| [`melis-cms-page-script-editor`](/zh/reference/modules/melis-cms-page-script-editor) | 按页面或按站点注入自定义 `<script>`/`<style>`/HTML（分析、像素、小组件）。 |
| [`melis-cms-share`](/zh/reference/modules/melis-cms-share) | 注入社交媒体分享 / Open Graph 元标签，从原生 React 后台管理。 |
| [`melis-cms-site-robot`](/zh/reference/modules/melis-cms-site-robot) | 按域名编辑并动态提供 `robots.txt`，带原生全 React 后台。 |
| [`melis-cms-tags`](/zh/reference/modules/melis-cms-tags) | 共享的标签/分类法系统，供内容模块挂载条目，现带原生 React 后台。 |
| [`melis-cms-user-account`](/zh/reference/modules/melis-cms-user-account) | 前台访客账户系统——注册、登录和按站点的个人资料，从 React 工具进行管理。 |
| [`melis-cms-google-analytics`](/zh/reference/modules/melis-cms-google-analytics) | GA4 提供程序，在 React 后台中渲染会话曲线、KPI 汇总和人口统计数据。 |
| [`melis-cms-link-check`](/zh/reference/modules/melis-cms-link-check) | 链接测试器，抓取某个页面（可选地包括子页面）并记录每一个失效链接。 |

## 电商

| 模块 | 角色 |
| --- | --- |
| [`melis-commerce`](/zh/reference/modules/melis-commerce) | 完整的电商框架——目录、客户、购物车/结账/订单、优惠券、配送和 SEO——带 React 后台。 |
| [`melis-commerce-order-invoice`](/zh/reference/modules/melis-commerce-order-invoice) | 添加 PDF 订单发票生成功能，呈现在 React 订单工具内。 |
| [`melis-commerce-group-discount-per-category`](/zh/reference/modules/melis-commerce-group-discount-per-category) | 按分类的价格折扣（按国家和客户组），作为 React 目录工具中的一个选项卡。 |

## 扩展与实用工具

| 模块 | 角色 |
| --- | --- |
| [`melis-templating-plugin-creator`](/zh/reference/modules/melis-templating-plugin-creator) | 后台向导，可脚手架生成完整的前台 **模板插件**。 |
| [`melis-dashboard-plugin-creator`](/zh/reference/modules/melis-dashboard-plugin-creator) | 向导，可脚手架生成新的后台 **仪表盘插件**（小组件），以原生 React 积木形式提供。 |
| [`melis-calendar`](/zh/reference/modules/melis-calendar) | 日程工具，带原生 React 月历、拖放事件和一个仪表盘小组件。 |
| [`melis-cron`](/zh/reference/modules/melis-cron) | 定时任务管理器——定义 CLI/HTTP 任务、运行它们并查看运行历史，通过原生 React 工具实现。 |
| [`melis-document-upload`](/zh/reference/modules/melis-document-upload) | 文档上传管理，作为原生 React 工具——定义类型、收集并提供文件。 |
| [`melis-messenger`](/zh/reference/modules/melis-messenger) | 用户间内部消息——顶栏通知图标以及“我的账户”中的一个选项卡。 |
| [`melis-small-business`](/zh/reference/modules/melis-small-business) | 编辑扩展——角色、校验工作流、页面版本控制、评论、锁定和媒体库。 |

## 身份验证

| 模块 | 角色 |
| --- | --- |
| [`melis-login-2fa`](/zh/reference/modules/melis-login-2fa) | 双因素认证核心——要求一次性验证码，并将投递委派给渠道模块。 |
| [`melis-login-2fa-email`](/zh/reference/modules/melis-login-2fa-email) | 邮件投递渠道——通过电子邮件发送一次性登录验证码。 |
| [`melis-login-2fa-primotexto`](/zh/reference/modules/melis-login-2fa-primotexto) | 通过 Primotexto 网关的短信投递渠道。 |

## 通知

| 模块 | 角色 |
| --- | --- |
| [`melis-newsletter`](/zh/reference/modules/melis-newsletter) | 将 CMS 页面转换为个性化的电子邮件通讯，并投递给订阅者组，从 React 后台操作。 |

## AI

| 模块 | 角色 |
| --- | --- |
| [`melis-ai`](/zh/reference/modules/melis-ai) | AI 套件的 React 后台——连接提供商、设计智能体、部署实例、监控使用情况，随处聊天。 |
| [`melis-ai-engine`](/zh/reference/modules/melis-ai-engine) | 抽象 AI 引擎——提供商契约、智能体/场景运行时、对话存储、MCP/工具桥接以及共享的 React 聊天组件。 |
| [`melis-ai-engine-claude`](/zh/reference/modules/melis-ai-engine-claude) | 面向 AI 引擎的 Anthropic Claude 提供商（后端，自身无 React UI）。 |
| [`melis-ai-engine-gemini`](/zh/reference/modules/melis-ai-engine-gemini) | 面向 AI 引擎的 Google Gemini 提供商（后端，自身无后台）。 |
| [`melis-ai-community-extensions`](/zh/reference/modules/melis-ai-community-extensions) | 将 AI 生成能力注入现有的 CMS 编辑界面（迷你模板、新闻、拖放区域）。 |

::: tip 仅 v5 的模块位于 /legacy 下
v5 后台中的一些模块尚无专属的 v6 页面——例如
[`melis-tool-creator`](/legacy/reference/modules/melis-tool-creator)、
[`melis-installer`](/legacy/reference/modules/melis-installer) 以及各个 `form-*` 模块。
它们的文档冻结在 `/legacy/reference/modules/` 下。
:::

::: tip 浏览源代码
每个模块都位于 `vendor/melisplatform/<module-name>/`。阅读模块的 `config/` 和
`src/` 是了解其公共服务和约定的最快方式。
:::
