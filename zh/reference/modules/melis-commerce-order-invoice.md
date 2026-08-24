# MelisCommerceOrderInvoice

> 为 MelisCommerce 添加 PDF 订单发票生成功能，并集成到 React 版订单工具中。软件包 `melisplatform/melis-commerce-order-invoice`。

## 用途

`MelisCommerceOrderInvoice` 为 [MelisCommerce](/zh/guide/commerce) 扩展了订单发票功能。当一个订单被确认时，它会自动生成一份 PDF 发票（通过 `spipu/html2pdf`）并将其存储到数据库中。它**本身不提供任何工具**：在 React 后台（`/melis-react`）中，它向 **MelisCommerce → Orders** 工具注入两个组件——订单编辑器中的一个 **Invoices**（发票）选项卡（列表、重新生成、下载），以及订单列表每一行上的一个小型**下载**按钮。发票模板是一个 `.phtml` 视图，可按语言环境完全覆盖。

## 启用

它是一个标准的 Laminas 模块。将其添加到 `config/melis.module.load.php` 中（位于 `MelisCommerce` 之后，因为它依赖于后者）：

```php
'MelisCommerce',
'MelisCommerceOrderInvoice',
```

依赖项（来自 `composer.json`）：`melisplatform/melis-commerce` 和 `spipu/html2pdf`。该模块启用了 `dbdeploy`，因此其数据表会在安装时通过 dbdeploy 增量脚本创建。

## React 后台

本模块的 brick 是一个**扩展 / 宿主注入型 brick**：它不绘制任何页面、不注册任何路由，也没有侧边栏入口。它的 `brick.manifest.json` 将 `route`、`label`、`forwardKey` 和 `melisKey` 全部设为 `null`（只有 `entry: "brick.js"` 是真实的；brick id 为 `commerce-order-invoice`）。加载时，`brick.tsx` 会将两个 React 组件发布到一个 `window` 全局变量上，而不是调用 `__melisRegisterBrick`：

```ts
window.MelisCommerceOrderInvoiceBrick = { OrderRowButton, InvoicesTab }
```

MelisCommerce 的 Orders 工具**仅在本模块处于激活状态时**才会使用它们——它通过自身的 `useExternalBrickComponent(globalName, key)` 钩子轮询 `window.MelisCommerceOrderInvoiceBrick`，如果该全局变量从未被设置，则不渲染任何内容。两个组件都接收单个 `{ orderId: number }` 属性，并读取 `document.documentElement.lang` 以确定 FR/EN 标签。

| 组件（`ui-react/src/`） | 出现位置 | 行为 |
| --- | --- | --- |
| `OrderRowButton` | 订单列表——每个订单行 | 获取该订单最新的发票 id；下载其 PDF，若无发票则弹出提示 *"No invoice available"*（无可用发票）。 |
| `InvoicesTab` | 订单编辑器—— **Invoices**（发票）选项卡（仅限已有订单） | 列出发票（ **ID**、 **Date**），提供 **Regenerate Invoice**（重新生成发票），以及每行的 **download**（下载）。 |

该 brick 是一个 Vite IIFE 打包产物（`ui-react/vite.config.ts`，名称为 `MelisCommerceOrderInvoiceBrickBundle`），构建输出到 `public/ui-react/brick.js`；React 与 react-router 被外部化到宿主全局变量，因此该 brick 复用宿主的 React 实例。

## brick 调用的端点

该 brick **没有 `config/react-api.php`**——它的客户端（`invoiceApi.ts`）以 `credentials: 'same-origin'` 重放该模块自身的**传统 MVC** action，全部位于同一个基础路径下：

```ts
export const INVOICE_BASE = '/melis/MelisCommerceOrderInvoice/MelisCommerceOrderInvoice'
```

| 调用 | 控制器 action | 返回 |
| --- | --- | --- |
| `POST {INVOICE_BASE}/getOrderLatestInvoiceId` (`orderId`) | `getOrderLatestInvoiceIdAction` | JSON `{ latestInvoiceId }`（无则为 0） |
| `POST {INVOICE_BASE}/getOrderInvoice` (`invoiceId`) | `getOrderInvoiceAction` | PDF 字节数据 + 一个 `fileName` 响应头 |
| `POST {INVOICE_BASE}/getOrderInvoiceList` (`draw,start,length,orderId`) | `getOrderInvoiceListAction` | DataTables JSON `{ data: [{ ordin_id, ordin_date_generated }] }` |
| `POST {INVOICE_BASE}/generateOrderInvoice` (`orderId`) | `generateOrderInvoiceAction` | JSON `{ id }`（新发票的 id） |

这些接口返回原始的传统 JSON/二进制数据，**而非** `{ success, data, error }` react-api 封装结构，因此客户端会对其进行规范化处理（`fetchOrderInvoiceList` 映射 `ordin_id`/`ordin_date_generated`；`downloadInvoiceFile` 读取 `fileName` 响应头）。在服务端，这些 action 委托给 `MelisCommerceOrderInvoiceService`，在重新生成时调用 `generateOrderInvoice($orderId, 'orderinvoicetemplate/default')`。该模块还声明了两个额外的字面量路由（`/CommerceOrderInvoice/getOrderLatestInvoiceId`、`/CommerceOrderInvoice/getInvoice`），但 React brick 使用的是上文的分段路由。

## 能力与访问控制

本模块中**没有 `config/react.capabilities.php`**。访问控制分为两层：

- **UI 可见性**——只有在 brick 已加载时，宿主才会渲染行按钮和选项卡； **Invoices**（发票）选项卡还会额外受到 MelisCommerce 自身 `invoices` 能力的过滤，该能力位于其 `meliscommerce_order_list_page` 能力树之下。
- **API 访问**——只有 PDF 下载 action 在服务端强制校验权限：`getOrderInvoiceAction` 会检查 `canAccess('meliscommerce_orders_content_tab_order_invoice')`，否则返回 403。列表 / 获取最新 / 生成这些 action 只要求存在后台会话，因此应将选项卡 / 按钮的可见性视为 UI 提示，而非严格的授权边界。

## 关键服务

在 `config/module.config.php` 中注册为 `service_manager` 别名：

| 服务别名 | 职责 |
| --- | --- |
| `MelisCommerceOrderInvoiceService` | 发票服务（继承 `MelisComGeneralService`）。负责生成、检索和列出发票。 |
| `MelisCommerceOrderInvoiceTable` | 针对 `melis_ecom_order_invoice` 的表网关（继承 `MelisEcomGenericTable`）。 |

`MelisCommerceOrderInvoiceService` 上的重要方法：

| 方法 | 职责 |
| --- | --- |
| `generateOrderInvoice($orderId, $template)` | 为订单构建 PDF 并保存；返回新发票的 id。 |
| `getOrderInvoiceList($orderId, $start, $limit, $order)` | 列出某订单的发票。 |
| `getOrderLatestInvoiceId($orderId)` | 某订单最新的发票 id，若无则返回 `0`。 |
| `getInvoice($invoiceId)` | 按 id 获取发票记录行。 |
| `getOrderInvoice($invoiceId)` | 某发票的原始 PDF blob（`ordin_invoice_pdf`）。 |
| `generateFileName($dateGenerated, $orderId, $invoiceId)` | 构建下载文件名（`Y/m/d-order-invoice[-suffix].pdf`）。 |

每个方法都会触发 `meliscommerce_order_invoice_*_start` / `_end` 事件。PDF 构建还会触发 `meliscommerceorderinvoice_pdf_view` 事件，允许你在渲染前覆盖 `ViewModel`。文件名后缀来自 `config/app.interface.php` 中的 `plugins.meliscommerceorderinvoice.data.custom-pdf-file-name`（默认值为 `invoice`）。

## 监听器（集成方式）

该模块通过三个监听器（在 `src/Module.php` 中挂载）将自身接入系统，而不是提供自己的前端模板插件：

| 监听器 | 监听事件 | 效果 |
| --- | --- | --- |
| `MelisCommerceOrderInvoiceGenerateInvoiceListener` | `meliscommerce_service_checkout_step2_postpayment_proccess_end` | 当订单成功且状态为 `1` 时，从 `orderinvoicetemplate/default` 自动生成发票。 |
| `MelisCommerceOrderDetailsInvoiceDataListener` | `MelisCommerceOrderPlugin_melistemplating_plugin_generate_view` | 将最新发票（及下载 URL）注入订单详情插件视图。 |
| `MelisCommerceOrderHistoryInvoiceDataListener` | `MelisCommerceOrderHistoryPlugin_melistemplating_plugin_generate_view` | 为订单历史插件的每一行添加 `invoiceId`。 |

这就是该模块向 MelisCommerce 账户 / 订单前端插件供给数据的方式；它本身不提供任何 `MelisTemplatingPlugin`（参见 [插件](/zh/guide/plugins)）。

## 数据库表

| 表 | 职责 |
| --- | --- |
| `melis_ecom_order_invoice` | 每生成一份发票对应一行。字段：`ordin_id`（主键）、`ordin_user_id`、`ordin_order_id`、`ordin_date_generated`、`ordin_invoice_pdf`（以 `longblob` 存储的 PDF）。 |

## 示例

从控制器 / 服务中为某个订单生成（或重新生成）并下载最新发票：

```php
$invoiceSvc = $serviceManager->get('MelisCommerceOrderInvoiceService');

// Generate a fresh invoice from the default template
$invoiceId = $invoiceSvc->generateOrderInvoice($orderId, 'orderinvoicetemplate/default');

// Fetch the latest invoice and its raw PDF
$latestId = $invoiceSvc->getOrderLatestInvoiceId($orderId);
$pdf      = $invoiceSvc->getOrderInvoice($latestId);   // binary PDF contents
```

## 关键文件

| 关注点 | 路径 |
| --- | --- |
| React brick 源码 | `ui-react/src/{brick.tsx, OrderRowButton.tsx, InvoicesTab.tsx, invoiceApi.ts}` |
| brick 构建产物 + manifest | `public/ui-react/{brick.js, brick.manifest.json}` |
| 发票服务 | `src/Service/MelisCommerceOrderInvoiceService.php` |
| 表网关 | `src/Model/Tables/MelisCommerceOrderInvoiceTable.php` |
| 控制器 | `src/Controller/MelisCommerceOrderInvoiceController.php` |
| 监听器 | `src/Listener/` |
| 模块 / 配置 | `src/Module.php`、`config/module.config.php`、`config/app.interface.php`、`config/app.tools.php` |
| 发票模板 | `view/melis-commerce-order-invoice/melis-commerce-order-invoice/default-order-invoice-template.phtml` |
| 数据库结构 | `install/dbdeploy/021419_melis_commerce_order_invoice_structure.sql` |
