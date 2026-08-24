---
layout: home

hero:
  name: Melis Platform v6
  text: 开发者文档
  tagline: 在这个基于 Laminas 的开源平台上构建、扩展和运营网站与应用——现已配备现代化的 React 后台。
  actions:
    - theme: brand
      text: 快速开始 →
      link: /zh/guide/getting-started
    - theme: alt
      text: 模块参考 →
      link: /zh/reference/modules

features:
  - icon:
      light: /icons/bolt-light.svg
      dark: /icons/bolt-dark.svg
    title: 几分钟即可安装
    details: 三种安装方式——Docker、Composer 或 GitHub 源码。选择适合你工作流的方式，几分钟内即可拥有可用的后台。
    link: /zh/guide/getting-started
    linkText: 安装指南
  - icon:
      light: /icons/layers-light.svg
      dark: /icons/layers-dark.svg
    title: 架构与概念
    details: 模块、配置树、melis 键、区域（zones）与转发（forwards）——掌握这五个概念，即可解锁平台的每一个部分。
    link: /zh/guide/concepts
    linkText: 阅读核心概念
  - icon:
      light: /icons/globe-light.svg
      dark: /icons/globe-dark.svg
    title: 构建网站（CMS）
    details: 页面、模板、站点树、slug、多语言——使用 MelisCms 交付内容驱动型网站所需的一切。
    link: /zh/guide/build-a-site
    linkText: 构建站点
  - icon:
      light: /icons/wrench-light.svg
      dark: /icons/wrench-dark.svg
    title: 创建你自己的工具
    details: 添加功能完备的后台工具——控制器、服务、Laminas 视图、权限管理等等。
    link: /zh/guide/create-a-tool
    linkText: 创建工具
  - icon:
      light: /icons/bag-light.svg
      dark: /icons/bag-dark.svg
    title: 电子商务
    details: 商品、订单、客户、发票——MelisCommerce 在 CMS 之上为你提供模块化的电子商务层。
    link: /zh/guide/commerce
    linkText: 电子商务指南
  - icon:
      src: /icons/melis-ai.svg
    title: AI 与 MCP
    details: MelisAI 内置了一套智能体框架和一个 MCP 服务器，使 LLM 工具能够通过结构化 API 读写你的平台。
    link: /zh/guide/ai
    linkText: AI 指南
  - icon:
      light: /icons/cube-light.svg
      dark: /icons/cube-dark.svg
    title: 50 个模块的完整文档
    details: 涵盖每一个社区版模块——用途、服务、后台工具、前端辅助器、数据库表以及真实的代码示例。
    link: /zh/reference/modules
    linkText: 模块参考
  - icon:
      light: /icons/sliders-light.svg
      dark: /icons/sliders-dark.svg
    title: 配置参考
    details: 平台读取的每一个配置键，附带类型、默认值和示例——为 MELIS_PLATFORM 及相关配置提供单一可信来源。
    link: /zh/reference/configuration
    linkText: 配置参考
---

## 什么是 Melis Platform？

**Melis Platform** 是一个开源的 CMS 与应用平台，构建于
**[Laminas](https://getlaminas.org/)**（Zend Framework / ZF2 的继任者）之上。它提供了一个
模块化的 **后台**，用于管理站点、页面、电子商务、内容等等——并且被设计为可以
通过你自己的模块和工具进行 **扩展**。

本文档面向 **v6**，它保留了相同的框架、模块和 API，同时将后台
替换为位于 `/melis-react` 的 **现代化 React UI**。工具被重构为
原生 React "brick"（砖块），每个工具都带有一个 New/Old 切换开关，可回退到 iframe 中的经典工具，
并且在整个界面中都可使用一个全局悬浮式 **AI 助手** 浮层。

它面向 **开发者**：从首次安装，到架构、构建站点与工具、
集成电子商务、添加 AI 能力，以及完整的模块 API 参考。
关于产品信息，请访问 **[melisplatform.com](https://www.melisplatform.com/)**。

> v5 文档仍然可在 **[/legacy/](/legacy/)** 下访问。

> 🇫🇷 Cette documentation est aussi disponible en **[français](/fr/)**。
