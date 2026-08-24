# MelisCommerce

> 面向 MelisPlatform 的完整电子商务框架 —— 目录、客户、购物车/结算/订单、优惠券、配送与 SEO —— 配备 React 后台。软件包 `melisplatform/melis-commerce`。

## 用途

MelisCommerce 为 Melis 站点添加了完整的电商层：目录（产品、变体、属性、类别、价格、库存）、B2B 客户模型（账户 + 联系人）、购物车/结算/订单流水线、优惠券、货币、配送、退货、单据以及 SEO。它自带一套后台管理套件，以及一个由可拖放模板插件构建的前台商店。数据层使用 **59 张 `melis_ecom_*` 表**、**26 个服务**、**10 个富实体** 与 **33 个监听器**；数据访问采用 Eloquent（内置 `illuminate/database`），并由 Melis 风格的事件驱动服务进行封装。

在 Melis v6 中，业务逻辑保持不变；**显示层** 变为 **React 后台**（`/melis-react`）。MelisCommerce 自带 **一个多砖块 bundle**，暴露 **13 个原生 React 工具**，每个工具都由 `/melis/react-api/…` 下的 JSON 端点支撑。每个工具都保留独立的 **New / Old** 切换开关，让你可以回退到 iframe 中的经典旧版界面。

## 启用它

添加到 `config/melis.module.load.php`：

```php
return [
    'MelisCommerce',
];
```

需要 `melisplatform/melis-core`。数据库表由 MelisDbDeploy 自动配置（增量脚本位于 `install/dbdeploy/`）；该模块作为可选组件由 Melis 安装程序提供。只有当 MelisCommerce 处于激活状态时，这些 React 工具才会出现在后台中（通过 `GET /melis/react-api/react-modules` 发现）。

## React 后台 —— 一个 bundle，十三个工具

该 bundle（`public/ui-react/brick.js` + `brick.manifest.json`）声明了 13 个在 `brick.tsx` 中自注册的工具。它们全部是原生的纯 React 工具；每个都渲染共享的 `ViewModeToggle` + `LegacyFrame`，因此 *Old* 会在 iframe（`/melis/react-tool-page?key=<melisKey>`）中挂载经典工具。七个「实体」工具设置了 `subTabs: true`（打开一条记录会新增一个子标签页）；全部 13 个工具均为 `persistent`。

![React 侧边栏中的 MelisCommerce 版块 —— 13 个 commerce 工具](/screenshots/react/melis-commerce/meliscommerce-menu-tools-selector.png)

| Brick id | 路由 | 标签 | melisKey |
| --- | --- | --- | --- |
| `commerce-accounts` | `/melis-commerce/clients-list` | 账户 | `meliscommerce_clients_list_page` |
| `commerce-contacts` | `/melis-commerce/contact-list` | 联系人 | `meliscommerce_contact_list_page` |
| `commerce-catalog` | `/melis-commerce/categories` | 目录 | `meliscommerce_categories_page` |
| `commerce-products` | `/melis-commerce/product-list` | 产品 | `meliscommerce_product_list_container` |
| `commerce-orders` | `/melis-commerce/order-list` | 订单 | `meliscommerce_order_list_page` |
| `commerce-coupons` | `/melis-commerce/coupon-list` | 优惠券 | `meliscommerce_coupon_list_page` |
| `commerce-attributes` | `/melis-commerce/attribute-list` | 属性 | `meliscommerce_attribute_list_page` |
| `commerce-countries` | `/melis-commerce/country-list` | 国家 | `meliscommerce_country_list_container` |
| `commerce-languages` | `/melis-commerce/language-list` | Commerce 语言 | `meliscommerce_language_list_container` |
| `commerce-currencies` | `/melis-commerce/currency-lists` | 货币 | `meliscommerce_currency_conf` |
| `commerce-order-status` | `/melis-commerce/order-status-lists` | 订单状态 | `meliscommerce_order_status_tool_page` |
| `commerce-clients-groups` | `/melis-commerce/clients-group-list` | 客户分组 | `meliscommerce_clients_group_tool_container` |
| `commerce-settings` | `/melis-commerce/settings` | Commerce 设置 | `meliscommerce_settings_page` |

> **经验法则：** 先构建 **目录**（属性 → 目录 → 产品/变体），再管理 **客户**（账户 + 联系人），然后运行 **订单** 流水线（订单 + 结算向导 + 优惠券），一切都由 commerce 参考列表提供支撑。

## 对象模型

| 概念 | 它是什么 |
| --- | --- |
| **Product（产品）** | 变体的容器 —— 本身并非可售单元。 |
| **Variant（变体）** | 可售单元：拥有自己的 SKU、库存和价格。没有实际可选项的产品也仍然有一个主变体。 |
| **Attribute（属性）** | 可筛选/定义变体的属性（例如颜色、尺寸），带有类型化、可翻译的取值。产品声明它们使用哪些属性；每个变体为每个属性选取一个值。 |
| **Price（价格）** | 针对某个 `(countryId, groupId)` 组合并含增值税进行解析；会优雅地回退（参见 [价格解析](#价格与库存解析)）。 |
| **Account（账户）** | 一个 B2B 组织（`melis_ecom_client`）；拥有公司记录、分组和地址。 |
| **Contact / Person（联系人/个人）** | 一个用于登录的个人（`melis_ecom_client_person`）；可以隶属于多个账户。 |
| **Basket（购物车）** | 匿名（以 `clientKey` 为键）或持久化（关联到某个账户）；登录时会合并。 |
| **Order（订单）** | 结算期间以状态 `-1`（临时）创建；付款后转为 `1`（新订单）。 |

## 账户与联系人

**账户**（`/melis-commerce/clients-list`）管理 B2B 客户：列表带有搜索、状态/分组筛选、列管理器、导出以及 CSV **导入**。打开一个账户会进入子标签页，包含 **Properties（属性）**、**Company（公司）**、**Contacts（联系人）**（关联/取消关联、设为默认）、**Addresses（地址）**、**Orders（订单）**（历史）和 **Files（文件）** 标签页。

![账户列表 —— 筛选、列管理器和 CSV 导入](/screenshots/react/melis-commerce/meliscommerce-tools-accounts-list.png)

![账户编辑器 —— Properties 标签页（状态、名称策略、分组、国家、标签）](/screenshots/react/melis-commerce/meliscommerce-tools-accounts-new-tab-properties.png)

![账户编辑器 —— Contacts 标签页（关联 / 取消关联 / 默认）](/screenshots/react/melis-commerce/meliscommerce-tools-accounts-new-tab-contacts.png)

**联系人**（`/melis-commerce/contact-list`）管理个人。编辑器包含 **Information（信息）**、**Address（地址）** 和 **Association（关联）** 标签页（将联系人关联/取消关联到账户，设置默认）。联系人由 `MelisComContactService` 支撑；账户由 `MelisComClientService` 支撑。

![联系人编辑器 —— Association 标签页（关联 / 取消关联账户）](/screenshots/react/melis-commerce/meliscommerce-tools-contacts-edit-tab-association.png)

## 目录、产品与变体

**目录**（`/melis-commerce/categories`）是一个可拖放重排的类别 **树**；一个类别包含 **Properties（属性）**、**SEO** 和 **Products（产品）**（可重排）标签页。

![目录类别树（React）](/screenshots/react/melis-commerce/meliscommerce-tools-catalogs-treeview.png)

**产品**（`/melis-commerce/product-list`）列出产品，带有筛选、复制和导出。产品编辑器包含 **Properties（属性）**、**Text（文本）**（分语言）、**Variants（变体）**、**SEO** 和 **Prices（价格）** 标签页。**Variants** 标签页内容最丰富：每个变体都有自己的 Properties、SEO、Prices、Stocks 和 Associations，以及媒体。

![产品列表（React）](/screenshots/react/melis-commerce/meliscommerce-tools-products-list.png)

![产品编辑器 —— Variants 标签页（每变体的价格、库存、SEO、关联）](/screenshots/react/melis-commerce/meliscommerce-tools-products-edit-tab-variants.png)

![产品编辑器 —— Prices 标签页](/screenshots/react/melis-commerce/meliscommerce-tools-products-edit-tab-prices.png)

**属性**（`/melis-commerce/attribute-list`）管理类型化的产品特征：编辑器标签页包括 **Properties（属性）**（引用、类型、状态、可见、可搜索）、**Labels（标签）**（分语言）和 **Values（取值）**（带有类型化翻译的取值）。

![属性编辑器 —— Values 标签页（带有类型化翻译的取值）](/screenshots/react/melis-commerce/meliscommerce-tools-attributes-edit-tab-values.png)

## 订单与结算向导

**订单**（`/melis-commerce/order-list`）带有状态筛选和导出。每个订单的编辑器标签页包括 **Properties（属性）**、**Basket（购物车）**（只读）、**Addresses（地址）**、**Payment（付款）**（只读）、**Shipping（配送）**、**Messages（消息）** 和 **Returns（退货）** —— 当 [MelisCommerceOrderInvoice](/zh/reference/modules/melis-commerce-order-invoice) 处于激活状态时，还会增加 **Invoices（发票）**。

![订单列表（React）](/screenshots/react/melis-commerce/meliscommerce-tools-order-list.png)

![订单编辑器 —— Properties 标签页](/screenshots/react/melis-commerce/meliscommerce-tools-order-edit-tab-properties.png)

**New Order（新建订单）** 会打开一个引导式的 **7 步结算向导**（`contact → account → products → addresses → summary → payment → confirmation`），由服务端结算会话（端点位于 `/orders/checkout/*`）支撑，可从上次中断处继续。

![新建订单结算向导 —— contact / account / products 步骤](/screenshots/react/melis-commerce/meliscommerce-tools-order-newordertunnel-1.png)

![结算向导 —— addresses / summary 步骤](/screenshots/react/melis-commerce/meliscommerce-tools-order-newordertunnel-2.png)

## 优惠券

**优惠券**（`/melis-commerce/coupon-list`）管理折扣码（百分比或金额）。编辑器标签页：**Properties（属性）**、**Assign account（分配账户）**（客户）、**Assign product（分配产品）** 和 **Orders（订单）**（使用历史）。由 `MelisComCouponService` 支撑；内置折扣本身就是 `meliscommerce_service_get_item_price_end` 上的一个监听器。

![优惠券编辑器 —— Assign account 标签页](/screenshots/react/melis-commerce/meliscommerce-tools-coupons-edit-tab-assignedclients.png)

## Commerce 参考工具

小型「设置风格」工具 —— 带有新增/编辑模态框的单页列表，或单个表单：

| 工具 | 路由 | 管理内容 |
| --- | --- | --- |
| 国家 | `/melis-commerce/country-list` | Commerce 国家列表（新增/编辑） |
| Commerce 语言 | `/melis-commerce/language-list` | Commerce 语言（列表 + 模态框） |
| 货币 | `/melis-commerce/currency-lists` | 货币（列表 + 模态框，**设为默认**） |
| 订单状态 | `/melis-commerce/order-status-lists` | 状态；编辑器包含 Properties（颜色）+ Labels |
| 客户分组 | `/melis-commerce/clients-group-list` | 客户分组（列表 + 模态框） |
| Commerce 设置 | `/melis-commerce/settings` | 单页配置 —— Properties + Accounts 标签页 |

![订单状态列表（React）](/screenshots/react/melis-commerce/meliscommerce-tools-orderstatus-list.png)

![Commerce 设置 —— Properties 标签页（库存告警阈值、账户名称策略）](/screenshots/react/melis-commerce/meliscommerce-tools-settings-tab-properties.png)

Commerce 设置保存全局库存告警阈值以及账户名称策略（`sa_type`）。

## 关键服务

所有服务都继承 `MelisComGeneralService`，并在 `config/module.config.php` 中注册。每个公开方法都被包裹在 `meliscommerce_service_*_start` / `*_end` 事件中（参见 [事件与监听器](#事件与监听器)）。React 控制器只负责校验输入并整形 JSON —— 真正的工作留在这些服务中。

| 服务别名 | 职责 |
| --- | --- |
| `MelisComProductService` | `getProductById`、`getProductList` → `MelisProduct` |
| `MelisComVariantService` | `getVariantById`、`getVariantListByProductId`、`getVariantBySKU`、`getMainVariantByProductId` → `MelisVariant` |
| `MelisComCategoryService` | `getCategoryById`、`getCategoryListById(Recursive)` → `MelisCategory` |
| `MelisComAttributeService` | `getAttributeById`、`getAttributes` → `MelisAttribute` |
| `MelisComPriceService` | `getItemPrice($itemId, $countryId, $groupId, $type)` —— 带回退层级的价格 |
| `MelisComProductSearchService` | 前台产品搜索 |
| `MelisComSeoService` | Commerce SEO（产品和类别的 URL / meta） |
| `MelisComClientService` | `getClientById`、`getClientList`、`getClientByIdAndClientPerson` → `MelisClient` |
| `MelisComContactService` | 联系人（个人）管理 |
| `MelisComClientGroupsService` | 客户分组（用于分组特定的定价） |
| `MelisComAuthenticationService` | 前台登录：`login`、`getClientId`、`getPersonId`、`getClientGroup`、`setClientId`、`logout`、`hasIdentity` |
| `MelisComBasketService` | `getBasket`、`getPersistentBasket`、`getAnonymousBasket`、`addVariantToBasket`、`transferAnonymousBasketToPersistentBasket` → `MelisBasket` |
| `MelisComOrderService` | `getOrderById`、`getOrderList` → `MelisOrder` |
| `MelisComOrderCheckoutService` | 两阶段结算：`checkoutStep1_prePayment`、`checkoutStep2_postPayment` |
| `MelisComPostPaymentService` | 付款后交易记录 |
| `MelisComOrderProductReturnService` | 产品退货 / RMA |
| `MelisComCouponService` | `getCouponById`、`getCouponList` → `MelisCoupon` |
| `MelisComCurrencyService` | 货币 |
| `MelisComShipmentCostService` | 配送费用计算 |
| `MelisComStockEmailAlertService` | 低库存邮件告警（`VARIANTSLOWSTOCK`） |
| `MelisComDocumentService` | `getDocumentById`、`getDocumentsByRelation` → `MelisDocument` |
| `MelisComDuplicationService` | 复制产品 / 变体 |
| `MelisComLinksService` | 前台 commerce 链接构建器 |
| `MelisComCacheService` | Commerce 缓存（`commerce_big_services`） |
| `MelisComHead` | SEO head 辅助（`updateTitleAndDescription`） |
| `MelisComGeneralService` | 基类；辅助方法：`getTableColumns`、`getEcomLang`、`getFrontPluginLangId` |

## 价格与库存解析

`MelisComPriceService::getItemPrice($itemId, $countryId, $groupId, $type)` 会沿着一条回退链逐级查找：

1. 特定国家 + 特定分组
2. 特定国家 + 通用分组
3. 通用国家（`price_country_id = 0`）+ 特定分组
4. 通用国家 + 通用分组
5. （对于变体）回退到 **产品** 价格

库存是 **按变体按国家**（`melis_ecom_variant_stock`）计的。当某个订单使库存低于阈值时，会向已配置的收件人发送 `VARIANTSLOWSTOCK` 邮件。

## 结算流水线

`MelisComOrderCheckoutService` 中的两个阶段（React 向导驱动的是相同的服务端逻辑）：

**阶段 1 —— `checkoutStep1_prePayment($clientId)`** 校验购物车和地址，计算所有费用和配送，生成订单参考号，然后调用 `MelisComOrderService::saveOrder()`。订单以 `ord_status = -1`（临时）保存。触发 `meliscommerce_service_checkout_step1_prepayment_start/_end` 和 `…_save_success`（携带新的 `orderId`）。

**阶段 2 —— `checkoutStep2_postPayment()`** 在支付网关返回后调用。`MelisComPostPaymentService::processPostPayment()` 会在 `melis_ecom_order_payment` 中记录交易，并将订单从状态 `-1` 移动到一个真实状态。触发 `meliscommerce_service_checkout_step2_postpayment_start/_end`。

**订单状态：** `-1` 临时 · `1` 新订单 · `2` 挂起 · `3` 已发货 · `4` 已送达 · `5` 已取消 · `6` 付款错误。

## 事件与监听器

每个服务方法都会发出 `meliscommerce_service_*_start` 和 `*_end` 事件。命名参数（通过反射由 `makeArrayFromParameters` 构建）以及 `results` 键会随事件一同传递。

- `_start` 监听器：在工作运行前修改输入。
- `_end` 监听器：在调用方看到结果前修改 `$params['results']`。

这是主要的扩展机制 —— 无需子类化。33 个自带监听器分为四大类：

| 类别 | 示例 |
| --- | --- |
| 保存 / 校验 | `…SaveProductListener`、`…SaveOrderListener`、`…SaveClientListener`、`…ValidateVariantListener` |
| 级联清理（国家/语言被删除） | `…ProductPriceCountryDeletedListener`、`…CategoryCountryLink…`、`…SEOLanguageDeletedListener` |
| 结算 / 定价 / 库存 | `…CheckoutCouponListener`、`…CouponProductPriceListener`、`…ShipmentCostListener`、`…PostPaymentListener`、`…VariantCheckLowStockListener` |
| 前台 SEO 路由 | `…SEOReformatToRoutePageUrlListener`、`…SEODispatchRouterCommerceUrlListener`、`…SEOMetaPageListener` |

## React API 与能力

所有路由都是 `melis-react-api` 的子路由（从 `config/react-api.php` 合并）：`src/Controller/ReactApi/` 中有 **13 个可调用控制器**，`/melis/react-api/…` 下有 **184 条路由**。所有地方的响应契约都是 `{ success, data, error? }`；每个 action 都会首先调用 `denyUnlessAccess()`（鉴权 + `MelisCoreRights::canAccess(<melisKey>)`，401/403）。每个实体工具大致暴露 `GET /<tool>`（keyset 列表）、`/<tool>/stats`、`/<tool>/options`、`POST /<tool>/save`、`DELETE /<tool>/delete/:id`、`GET /<tool>/:id`，外加工具特定的子资源（例如订单增加了完整的 `/orders/checkout/*` 向导）。

> ⚠ Commerce 语言使用命名空间 `/commerce-languages`（而非 `/languages`），因为核心的 Languages 工具已经在共享的 `melis-react-api` 父级下占用了 `/languages`。

`config/react.capabilities.php` 为每个工具声明一个 `melisReactToolCapabilities` 条目，以其 melisKey 为键。这些是 **声明式的默认允许** UI 提示 —— 它们驱动 Users → Rights 复选框树，并让 React 通过 `useCaps(...)` 遮蔽标签页/按钮 —— 但 **目前还没有服务端的 `denyUnlessCan()`**；只有针对工具 melisKey 的 `denyUnlessAccess()` 会对 API 进行门控。请将能力视为 UI 提示，而非安全机制。

## 前台

模板插件注册在 `config/plugins/{products,categories,clients,orders}/` 下，并作为 `module.config.php` 中的 `controller_plugins`。将它们拖放到 CMS 页面的拖放区域中。

| 区域 | 插件 |
| --- | --- |
| 目录 | `ProductShowPlugin`、`ProductListPlugin`、`ProductSearchPlugin`、`CategoryTreePlugin`、`CategoryProductListPlugin`、`RelatedProductsPlugin`、`AttributesShowPlugin`、`ProductAttributePlugin`、`ProductPriceRangePlugin` |
| 购物车与结算 | `AddToCartPlugin`、`CartPlugin`、`CheckoutPlugin`、`CheckoutCartPlugin`、`CheckoutAddressesPlugin`、`CheckoutCouponPlugin`、`CheckoutSummaryPlugin`、`CheckoutConfirmSummaryPlugin`、`CheckoutConfirmPlugin` |
| 账户 | `LoginPlugin`、`RegisterPlugin`、`AccountPlugin`、`ProfilePlugin`、`BillingAddressPlugin`、`DeliveryAddressPlugin`、`LostPasswordGetEmailPlugin`、`LostPasswordResetPlugin` |
| 订单（客户端） | `OrderPlugin`、`OrderHistoryPlugin`、`OrderMessagesPlugin`、`OrderShippingDetailsPlugin`、`OrderReturnProductPlugin`、`OrderAddressPlugin` |

## 数据库表

59 张带有 `melis_ecom_*` 前缀的表，按子系统分组：

| 组 | 关键表 |
| --- | --- |
| 产品与变体 | `melis_ecom_product`、`melis_ecom_product_text` + `_text_type`、`melis_ecom_product_attribute`、`melis_ecom_product_category`、`melis_ecom_variant`、`melis_ecom_variant_attribute_value`、`melis_ecom_variant_stock`、`melis_ecom_assoc_variant` + `_type` |
| 属性 | `melis_ecom_attribute` + `_trans`、`melis_ecom_attribute_type`、`melis_ecom_attribute_value` + `_value_trans` |
| 类别与地理 | `melis_ecom_category` + `_trans`、`melis_ecom_country_category`、`melis_ecom_country`、`melis_ecom_lang` |
| 定价与货币 | `melis_ecom_price`、`melis_ecom_currency` |
| 客户（B2B） | `melis_ecom_client`、`melis_ecom_client_person` + `_person_emails`、`melis_ecom_client_company`、`melis_ecom_client_account_rel`、`melis_ecom_client_person_rel`、`melis_ecom_client_address` + `_address_type`、`melis_ecom_client_groups`、`melis_ecom_civility`、`melis_ecom_settings_account` |
| 购物车与订单 | `melis_ecom_basket_anonymous`、`melis_ecom_basket_persistent`、`melis_ecom_order`、`melis_ecom_order_basket`、`melis_ecom_order_address`、`melis_ecom_order_payment` + `_type`、`melis_ecom_order_shipping`、`melis_ecom_order_message`、`melis_ecom_order_status` + `_trans`、`melis_ecom_order_product_return` + `_details` |
| 优惠券 | `melis_ecom_coupon` + `_coupon_client` / `_coupon_order` / `_coupon_product` |
| 单据与 SEO | `melis_ecom_document` + `_doc_type` + `_doc_relations`、`melis_ecom_seo`、`melis_ecom_stock_email_alert` |

## 示例

**读取一个产品、它的主变体以及一个解析后的价格**

```php
$prdSrv   = $sm->get('MelisComProductService');
$varSrv   = $sm->get('MelisComVariantService');
$priceSrv = $sm->get('MelisComPriceService');

$product = $prdSrv->getProductById($prdId, $langId, $countryId);  // → MelisProduct
$variant = $varSrv->getMainVariantByProductId($prdId, $langId, $countryId);  // → MelisVariant
$price   = $priceSrv->getItemPrice($variant->getId(), $countryId, $groupId, 'variant');
// $price['price'] (net), $price['price_currency'], $price['price_details']
```

**加入购物车并运行两阶段结算**

```php
$basketSrv   = $sm->get('MelisComBasketService');
$checkoutSrv = $sm->get('MelisComOrderCheckoutService');

$basketSrv->addVariantToBasket($variantId, 1, $clientId);
$basketSrv->transferAnonymousBasketToPersistentBasket($clientKey, $clientId);

$step1 = $checkoutSrv->checkoutStep1_prePayment($clientId);  // order at status -1
// $step1['orderId'] — hand to payment gateway
$step2 = $checkoutSrv->checkoutStep2_postPayment();          // records payment, moves off -1
```

**无需子类化即可挂钩商店**

```php
// _start → mutate inputs; _end → mutate $params['results'].
$this->attachEventListener(
    $events, '*', 'meliscommerce_service_get_item_price_end',
    function ($e) {
        $params = $e->getParams();
        $price  = $params['results'];
        // modify $price, then:
        $params['results'] = $price;
        return $params;
    }
);
```

## 关键文件

| 关注点 | 路径 |
| --- | --- |
| 模块配置（服务、控制器、插件） | `vendor/melisplatform/melis-commerce/config/module.config.php` |
| React API 路由 / 能力 | `vendor/melisplatform/melis-commerce/config/react-api.php`、`config/react.capabilities.php` |
| React 砖块（源码 / 构建） | `vendor/melisplatform/melis-commerce/ui-react/src/`、`public/ui-react/{brick.js, brick.manifest.json}` |
| React API 控制器（13 个） | `vendor/melisplatform/melis-commerce/src/Controller/ReactApi/` |
| 前台插件配置 | `vendor/melisplatform/melis-commerce/config/plugins/` |
| 服务 / 实体（10 个） / 表网关（59 个） | `vendor/melisplatform/melis-commerce/src/Service/`、`src/Entity/`、`src/Model/Tables/` |
| 监听器（33 个） | `vendor/melisplatform/melis-commerce/src/Listener/` |
| DB 增量脚本 | `vendor/melisplatform/melis-commerce/install/dbdeploy/` |

另请参阅：[模块参考](/zh/reference/modules) · [melis-react-api](/zh/reference/modules/melis-react-api) · [melis-commerce-order-invoice](/zh/reference/modules/melis-commerce-order-invoice) · [melis-core](/legacy/reference/modules/melis-core) · [melis-cms](/zh/reference/modules/melis-cms)。
