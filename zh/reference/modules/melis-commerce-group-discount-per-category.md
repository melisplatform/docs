# MelisCommerceGroupDiscountPerCategory

> 添加按分类的价格折扣，并按国家和客户组进行限定，以"价格折扣（Price Discount）"选项卡的形式注入到 React 后台中 MelisCommerce 的目录（Catalogs）工具里。软件包 `melisplatform/melis-commerce-group-discount-per-category`。

## 用途

MelisCommerceGroupDiscountPerCategory 让你能够**按国家、按客户组为某个分类的产品设置百分比折扣**。该折扣限定在 *（分类 × 国家 × 客户组）* 的范围内，因此两个购买同一产品的客户，会因所属客户组不同而看到两种不同的价格，且折扣可以逐个国家地变化（其中有一个 **General（通用）** 伪国家，id 为 `-1`，适用于所有区域）。

该模块**没有自己的工具**。它是一个**扩展 / 宿主注入砖块（brick）**：它不绘制任何页面，也不添加任何菜单项。相反，它在 `window` 上发布一个 React 组件，当模块处于激活状态时，MelisCommerce 的目录页面会捕获该组件，从而在分类编辑器中添加一个**价格折扣（Price Discount）**选项卡。真正的持久化仍留在该模块的 Laminas 服务中，与旧版工具保持一致、未作改动。

## 启用它

添加到 `config/melis.module.load.php`：

```php
return [
    'MelisCommerceGroupDiscountPerCategory',
];
```

由于这是一个扩展砖块，只有在**同时满足**以下两个条件时选项卡才会出现：

- **模块处于激活状态** —— 只有激活的砖块才会在 `window` 上发布其全局变量，供宿主捕获。
- **用户在目录工具上拥有 `price_discount` 权限**。

该模块中**没有 `config/react.capabilities.php`**：`price_discount` 能力声明在 **MelisCommerce** 中，位于目录工具承载权限的 melisKey `meliscommerce_categories_page` 之下。

## 它在 React 后台中的位置

没有专用界面。该功能是目录工具内部的一个选项卡：

- 侧边栏 → **Commerce → Catalogs**。
- 打开/编辑一个已有的**分类**。
- 点击**价格折扣（Price Discount）**选项卡（标签为 *"Discount Per Client's Group"* / *"Réduction par groupe de client"*，即"按客户组折扣"）。

该选项卡**仅在编辑时可用**：它附着于一个已有分类，因此在*创建*分类时被禁用 —— 请先保存分类。它也**没有自己的保存按钮**；折扣通过宿主表单的**"Save category"（保存分类）**按钮写入。

该选项卡包含两个区域：

- 左侧的**国家（Country）**列表（**General** 排在最前，随后是各个国家及其国旗）；每个国家上会有一个徽章，显示该国家已填写了多少条折扣；
- 右侧的一组**客户组选项卡** —— 选择一个组，然后为所选国家输入其**折扣百分比**。已含有值的客户组选项卡会用一个圆点标记（如果值无效则为红色）。

## 折扣规则

- **百分比** —— `0 < value ≤ 100`，最多保留 **2 位小数**。将某个字段**留空**会移除（删除）该条折扣记录。
- 仅提供**激活的**客户组。
- 该字段在你输入时即时校验；无效值会显示在其对应字段下方，并将该客户组选项卡标记为红色。在**保存分类（Save category）**时，无效的百分比会**阻止**保存，并将选项卡切换到第一个出错的国家 + 客户组。否则会先保存分类，然后随之保存折扣。

## 砖块结构

砖块源码是 `ui-react/` 下的一个 Vite **IIFE** 库，构建为 `public/ui-react/brick.js`（以及 `brick.manifest.json`）。React 被外置到宿主的全局变量上，使该组件能够在目录页面内部渲染。清单文件**未声明 route、label、forwardKey 或 melisKey**（全部为 `null`），且该入口**不**调用 `__melisRegisterBrick` —— 加载时它只是简单地发布一个全局变量：

```ts
window.MelisCommerceGroupDiscountPerCategoryBrick = {
  CategoryDiscountTab,
  tabLabel: { fr: 'Réduction par groupe de client', en: "Discount Per Client's Group" },
}
```

| 文件 | 作用 |
| --- | --- |
| `src/brick.tsx` | 发布 `window.MelisCommerceGroupDiscountPerCategoryBrick` 全局变量。无 route、无注册。 |
| `src/CategoryDiscountTab.tsx` | 选项卡 UI（属性 `{ categoryId }`）：国家列表 + 客户组选项卡 + 百分比字段、自包含的 fr/en 字典、客户端校验，以及随表单保存的事件监听器。 |
| `src/discountApi.ts` | 该模块 `react-api` 端点的 JSON 客户端，使用 `{ success, data, error }` 契约。 |

选项卡标签随**本**模块一同发布（在全局变量上），而非随 MelisCommerce 的字典。选项卡从 `document.documentElement.lang` 读取当前激活的语言环境。

## React API

路由定义在 `config/react-api.php` 中，并合并进 `melis-react-api` 的 `child_routes`。控制器：`MelisReactApiCategoryDiscountController`（`optionsAction` / `getAction` / `saveAction`）。响应结构为 `{ success, data, error? }`。

| 方法 + URL | Action | 返回（`data`） |
| --- | --- | --- |
| `GET /melis/react-api/category-discounts/options` | `optionsAction` | `{ countries, groups }` —— 国家列表，**General**（id `-1`）排在最前，并附带 base64 编码的国旗；以及**激活的**客户组。 |
| `GET /melis/react-api/category-discounts/:id` | `getAction` | `{ items }` —— 为分类 `:id` 存储的折扣。 |
| `POST /melis/react-api/category-discounts/save` | `saveAction` | `{ items }` —— 保存后重新读取的折扣（含新生成的 id）。 |

TS 结构（`discountApi.ts`）：

```ts
interface CountryOpt  { id: number; name: string; flag: string | null; general: boolean }
interface GroupOpt    { id: number; name: string }
interface DiscountRow { id: number; countryId: number; groupId: number; percentage: number }
```

**访问守卫（全部三个 action）：** `denyUnlessAccess()` 要求已认证的身份（`MelisCoreAuth`，否则返回 401），以及 `MelisCoreRights->canAccess('meliscommerce_categories_page')` —— **宿主**目录工具的 melisKey（否则返回 403）。该选项卡永远不可能比它所在的工具拥有更宽松的权限。

**保存契约。** 客户端会发送**每一个**单元格（包括空的 —— 空的 `percentage` 会删除对应记录）。`saveAction` 会重新校验（数值、≤ 2 位小数、≤ 100、> 0），重建旧版的 `[countryId][groupId] => ['gdc_id' => …, 'gdc_discount_percent' => …]` 结构，并委托给服务处理 —— 控制器中不含任何业务逻辑：

```php
$this->getServiceManager()
     ->get('MelisCommerceGroupDiscountPerCategoryService')
     ->saveCategoryGroupDiscount($categoryId, $datas);   // same service + events as the legacy tool
```

`options`/`get` 从 `MelisCommerceGroupDiscountPerCategoryService->getCategoryDiscountsByCategoryId()`、`MelisEcomCountryTable->getCountries()` 和 `MelisComClientGroupsService->getClientsGroupList()` 读取数据。

## 宿主集成

- **发现 / 加载：** 标准砖块流程 —— `GET /melis/react-api/react-modules` 会列出它，宿主在后台加载 `brick.js`，然后 `brick.tsx` 发布全局变量。
- **组件捕获：** MelisCommerce 的 `CatalogPage.tsx` 通过通用辅助函数解析出组件和标签，并**仅在两者都解析成功**且处于**编辑**模式时添加该选项卡：

  ```ts
  const DiscountTabComp  = useExternalBrickComponent<{ categoryId: number }>(
    'MelisCommerceGroupDiscountPerCategoryBrick', 'CategoryDiscountTab')
  const DiscountTabLabel = useExternalBrickValue<{ fr: string; en: string }>(
    'MelisCommerceGroupDiscountPerCategoryBrick', 'tabLabel')
  ```

  选项卡内容会**被永久挂载**（未激活时用 `display:none` 隐藏），以便保留其输入内容和监听器。

- **随表单保存的桥接**（`window` 上的两个 `CustomEvent`）：
  - `melis:commerce-category-validate` —— 在保存前派发；选项卡进行校验，并在遇到第一个无效值时设置 `detail.blocked = true` 和 `detail.tab = 'price_discount'`，从而中止分类的保存。
  - `melis:commerce-category-saved` —— 在分类保存后派发；选项卡将其 `submit({ silent: true })` promise 推入 `detail.pending`，`CatalogPage` 会在完成前等待该 promise。

## 关键文件

| 关注点 | 路径 |
| --- | --- |
| 砖块源码（组件、api 客户端） | `ui-react/src/{brick.tsx, CategoryDiscountTab.tsx, discountApi.ts}` |
| 构建后的砖块 + 清单 | `public/ui-react/{brick.js, brick.manifest.json}`（id 为 `commerce-group-discount-per-category`） |
| React API 路由 | `config/react-api.php` |
| 模块接线 | `config/module.config.php` |
| React API 控制器 | `src/Controller/ReactApi/MelisReactApiCategoryDiscountController.php` |

另请参阅：[melis-commerce](/legacy/reference/modules/melis-commerce)
