# 电子商务

`melis-commerce` 为 Melis 添加了一个完整的**电子商务**领域：目录、客户、购物车、结账和订单——既以**后台工具**的形式暴露，也以**前台插件**的形式提供。本页是一份帮助你快速上手的导览；如需了解确切的、最新的 API，请阅读该模块的 `src/Service/`。

在 **Melis v6** 中，框架、模块及其服务保持不变——变化的是**后台 UI**：commerce 工具现在作为原生 **React "bricks"** 运行于 `/melis-react` 中（参见[创建工具](./create-a-tool)）。每个工具都保留了逐工具的 **New / Old** 切换开关，因此你可以回退到 iframe 中的经典界面，而全局悬浮的 [AI 助手](./ai)则在每个工具上均可使用。

## 领域模型

主要概念（位于 `melis-commerce/src/Entity/` 下的实体，表以 `melis_ecom_*` 为前缀）：

| 领域 | 概念 | 表（示例） |
| --- | --- | --- |
| **目录** | 产品、变体（可售卖的 SKU）、类别、属性及其值 | `melis_ecom_product`、`melis_ecom_variant`、`melis_ecom_category`、`melis_ecom_attribute` |
| **定价** | 按变体/产品 × 国家 × 货币 × 客户组的价格 | `melis_ecom_price`、`melis_ecom_client_groups` |
| **客户** | 客户（账户）、客户联系人、地址 | `melis_ecom_client`、`melis_ecom_client_person` |
| **购物车** | 匿名与持久化购物篮 | `melis_ecom_basket_anonymous`、`melis_ecom_basket_persistent` |
| **订单** | 订单 + 地址、支付、配送；退货 | `melis_ecom_order`、`melis_ecom_order_address`、`melis_ecom_order_payment` |
| **促销** | 优惠券（限定产品/客户） | `melis_ecom_coupon`、`melis_ecom_coupon_product` |
| **本地化** | 国家、货币 | `melis_ecom_country`、`melis_ecom_currency` |
| **媒体** | 文档（图片/PDF） | `melis_ecom_document` |

## 你将会用到的服务

全部注册于 `melis-commerce/config/module.config.php`（`service_manager.aliases`）。主要的服务有：

- **目录**：`MelisComProductService`、`MelisComVariantService`、`MelisComCategoryService`、
  `MelisComAttributeService`、`MelisComPriceService`、`MelisComProductSearchService`、
  `MelisComDocumentService`。
- **购物车与结账**：`MelisComBasketService`、`MelisComOrderCheckoutService`、
  `MelisComOrderService`、`MelisComShipmentCostService`、`MelisComPostPaymentService`、
  `MelisComOrderProductReturnService`。
- **客户**：`MelisComClientService`、`MelisComAuthenticationService`、`MelisComContactService`、
  `MelisComClientGroupsService`。
- **配置**：`MelisComCouponService`、`MelisComCurrencyService`、`MelisComSeoService`。

```php
$products = $sm->get('MelisComProductService');
$orders   = $sm->get('MelisComOrderService');
```

每个服务都建立在一个 `MelisEcom*Table` 数据层之上（例如 `MelisEcomProductTable` →
`melis_ecom_product`）。React 后台**并不会**重新实现其中任何逻辑：它的
`/melis/react-api/…` 端点仅校验输入并组织 JSON，然后调用这些相同的服务。

## 在后台中

MelisCommerce 在 `/melis-react` 侧边栏中注册了一个 **MelisCommerce** 区块，包含涵盖整个领域的 **13 个 React 工具**：**Accounts**（账户）、**Contacts**（联系人）、**Catalogs**（目录）、**Products**（产品）、**Orders**（订单）、**Coupons**（优惠券）、**Attributes**（属性）、**Countries**（国家）、**Commerce languages**（商务语言）、**Currencies**（货币）、**Order status**（订单状态）、**Client's groups**（客户组）和 **Commerce settings**（商务设置）。每一个都是真正的 React 页面（在默认的 "New" 视图中没有 iframe），并在各自的路由上打开；"entity"（实体）工具会将一条记录作为持久化的**子标签页**打开，因此你可以随时跳回列表而不会丢失当前位置。每个工具都带有一个 **New / Old** 开关——"Old" 会在 iframe 中显示经典工具，方便你进行对比。

![/melis-react 侧边栏中的 MelisCommerce 区块——工具选择器。](/screenshots/react/melis-commerce/meliscommerce-menu-tools-selector.png)

一个典型的工作流：先构建**目录**（Attributes → Catalogs → Products/Variants），再管理**客户**（Accounts + Contacts），然后运行**订单**流水线（Orders + 优惠券），所有这些都由 commerce 参考列表（Countries、Currencies、Order status、Client's groups、Settings）作为支撑。

- **目录（Catalog）**——**Catalogs** 工具是一个类别**树**（拖动可重新排序；每个节点有 Properties / SEO / Products）。**Products** 列出产品（搜索、复制、导出）；编辑器包含 **Properties**、**Text**、**Variants**、**SEO** 和 **Prices** 标签页，并提供功能丰富的逐变体编辑器（价格、库存、SEO、关联、媒体）。**Attributes** 管理带类型的特征（Properties / Labels / Values）。

  ![产品列表（React）。](/screenshots/react/melis-commerce/meliscommerce-tools-products-list.png)

  ![产品编辑器——Variants 标签页。](/screenshots/react/melis-commerce/meliscommerce-tools-products-edit-tab-variants.png)

- **客户（Customers）**——**Accounts** 是 B2B 客户（Properties、Company、Contacts、Addresses、Orders、Files），支持搜索、筛选、列管理器、导出和 CSV **导入**。**Contacts** 是具体的个人（Information / Address / Association），关联到一个或多个账户。

  ![账户列表（React）。](/screenshots/react/melis-commerce/meliscommerce-tools-accounts-list.png)

- **订单（Orders）**——**Orders** 工具列出订单（筛选、状态筛选、导出）。逐订单编辑器包含 **Properties**、**Basket**、**Addresses**、**Payment**、**Shipping**、**Messages** 和 **Returns** 标签页（当启用开票功能时还会有 **Invoices**——见下文）。**New Order** 会打开一个引导式的 **7 步结账向导**（联系人 → 账户 → 产品 → 地址 → 摘要 → 支付 → 确认），由服务端会话支撑，可从你上次离开的位置继续。

  ![订单列表（React）。](/screenshots/react/melis-commerce/meliscommerce-tools-order-list.png)

  ![New Order 结账向导。](/screenshots/react/melis-commerce/meliscommerce-tools-order-newordertunnel-1.png)

- **参考与配置（Reference & config）**——**Coupons**（Properties、Assign account、Assign product、使用记录 Orders）、**Countries**、**Commerce languages**、**Currencies**（带有*设为默认*操作）、**Order status**（状态 + 颜色 + 逐语言标签）、**Client's groups**，以及单个 **Commerce settings** 页面（Properties + Accounts）。

如需完整的逐工具、逐标签页参考（路由、功能、`react-api` 端点），请参见 [melis-commerce 模块参考](/zh/reference/modules/melis-commerce)。

## 在前台中

Commerce 附带了一大批**模板插件**（将它们放入页面中——参见 [插件](./plugins)），涵盖整个店面：

- **目录**：`MelisCommerceProductShowPlugin`、`MelisCommerceProductListPlugin`、
  `MelisCommerceProductSearchPlugin`、`MelisCommerceCategoryProductListPlugin`、
  `MelisCommerceRelatedProductsPlugin`。
- **账户**：`MelisCommerceLoginPlugin`、`MelisCommerceRegisterPlugin`、
  `MelisCommerceAccountPlugin`、`MelisCommerceProfilePlugin`，以及配送/账单地址插件。
- **购物车与结账**：`MelisCommerceAddToCartPlugin`、`MelisCommerceCartPlugin`、
  `MelisCommerceCheckoutPlugin`（+ 购物车 / 优惠券 / 地址 / 摘要 / 确认步骤）。
- **订单**：`MelisCommerceOrderHistoryPlugin`、`MelisCommerceOrderPlugin`、
  `MelisCommerceOrderReturnProductPlugin`。

……外加仪表盘小组件（订单数量、销售收入、订单消息）。

因此，一个店面主要是通过在 CMS 页面上**放置这些插件**并在你的站点模块视图中为其设置样式来组装的。React 后台的变化**不会**影响前台：店面插件及其视图保持不变。

## 开票

`melis-commerce-order-invoice` 通过 **PDF 发票生成**（借助 Spipu/Html2Pdf）扩展了 commerce：一个发票服务 + 表（`melis_ecom_order_invoice`），以及从订单数据生成发票的监听器。在 React 后台中，它**没有自己的工具**——它是一个**扩展 brick**，在该模块启用时向 **Orders** 工具注入两处内容：

- 订单编辑器中的 **Invoices** 标签页——列出发票、**Regenerate Invoice**（重新生成发票），并可下载任意所列发票；
- Orders 列表中逐行的**下载**按钮，用于获取该订单的最新发票 PDF。

如果你看不到它们，请检查 `melis-commerce-order-invoice` 是否已启用，以及你的角色是否拥有 Orders 的 **Invoices** 权限。参见 [melis-commerce-order-invoice 模块参考](/zh/reference/modules/melis-commerce-order-invoice)。

## 关键文件

| 关注点 | 路径 |
| --- | --- |
| 服务 | `vendor/melisplatform/melis-commerce/src/Service/` |
| 实体 | `vendor/melisplatform/melis-commerce/src/Entity/` |
| Schema | `vendor/melisplatform/melis-commerce/install/sql/setup_structure.sql` |
| 前台插件 | `vendor/melisplatform/melis-commerce/src/Controller/Plugin/` |
| React bricks 与 API | `vendor/melisplatform/melis-commerce/ui-react/`、`config/react-api.php`、`src/Controller/ReactApi/` |
| 开票 | `vendor/melisplatform/melis-commerce-order-invoice/` |
