# MelisCommerceGroupDiscountPerCategory

> Adds a per-category price discount, scoped by country and client group, as a "Price Discount" tab injected into MelisCommerce's Catalogs tool in the React back-office. Package `melisplatform/melis-commerce-group-discount-per-category`.

## Purpose

MelisCommerceGroupDiscountPerCategory lets you set a **percentage discount on a category's products, per country and per client group**. The discount is scoped to *(category × country × client group)*, so two clients buying the same product can see two different prices depending on the group they belong to, and the discount can vary country by country (with a **General** pseudo-country, id `-1`, that applies to all zones).

The module has **no tool of its own**. It is an **extension / host-injection brick**: it draws no page and adds no menu entry. Instead it publishes a React component on `window`, which MelisCommerce's Catalogs page picks up — when the module is active — to add a **Price Discount** tab to the category editor. The real persistence stays in the module's Laminas service, unchanged from the legacy tool.

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisCommerceGroupDiscountPerCategory',
];
```

Because this is an extension brick, the tab appears **only when both** of these hold:

- **The module is active** — only an active brick publishes its global on `window` for the host to pick up.
- **The user holds the `price_discount` right** on the Catalogs tool.

There is **no `config/react.capabilities.php`** in this module: the `price_discount` capability is declared in **MelisCommerce**, under the Catalogs tool's rights-bearing melisKey `meliscommerce_categories_page`.

## Where it lives in the React back-office

There is no dedicated screen. The feature is a tab inside the Catalogs tool:

- Sidebar → **Commerce → Catalogs**.
- Open/edit an existing **category**.
- Click the **Price Discount** tab (labelled *"Discount Per Client's Group"* / *"Réduction par groupe de client"*).

The tab is **edit-only**: it attaches to an existing category, so it is disabled while *creating* one — save the category first. It also has **no Save button of its own**; discounts are written by the host form's **"Save category"** button.

The tab has two areas:

- a **Country** list on the left (**General** first, then each country with its flag); a badge shows how many discounts are filled for that country;
- a set of **client-group tabs** on the right — pick a group, then type its **discount percentage** for the selected country. A dot marks a group tab that already holds a value (red if invalid).

## Discount rules

- **Percentage** — `0 < value ≤ 100`, at most **2 decimals**. Leaving a field **empty** removes (deletes) that discount row.
- Only **active** client groups are offered.
- The field validates as you type; an invalid value is shown under its own field and marks the group tab red. On **Save category**, an invalid percentage **blocks** the save and switches the tab to the first offending country + group. Otherwise the category saves first, then the discounts save with it.

## Brick anatomy

The brick source is a Vite **IIFE** library under `ui-react/`, building to `public/ui-react/brick.js` (+ `brick.manifest.json`). React is externalised to the host globals so the component renders inside the Catalogs page. The manifest declares **no route, label, forwardKey or melisKey** (all `null`), and the entry does **not** call `__melisRegisterBrick` — on load it simply publishes a global:

```ts
window.MelisCommerceGroupDiscountPerCategoryBrick = {
  CategoryDiscountTab,
  tabLabel: { fr: 'Réduction par groupe de client', en: "Discount Per Client's Group" },
}
```

| File | Role |
| --- | --- |
| `src/brick.tsx` | Publishes the `window.MelisCommerceGroupDiscountPerCategoryBrick` global. No route, no registration. |
| `src/CategoryDiscountTab.tsx` | The tab UI (props `{ categoryId }`): country list + client-group tabs + percentage field, self-contained fr/en dictionary, client-side validation, and the save-with-form event listeners. |
| `src/discountApi.ts` | JSON client for the module's `react-api` endpoints, using the `{ success, data, error }` contract. |

The tab label ships with **this** module (on the global), not with MelisCommerce's dictionary. The tab reads the active locale from `document.documentElement.lang`.

## React API

Routes are defined in `config/react-api.php` and merged into `melis-react-api`'s `child_routes`. Controller: `MelisReactApiCategoryDiscountController` (`optionsAction` / `getAction` / `saveAction`). Response shape `{ success, data, error? }`.

| Method + URL | Action | Returns (`data`) |
| --- | --- | --- |
| `GET /melis/react-api/category-discounts/options` | `optionsAction` | `{ countries, groups }` — countries with **General** (id `-1`) first + base64 flags; **active** client groups. |
| `GET /melis/react-api/category-discounts/:id` | `getAction` | `{ items }` — discounts stored for category `:id`. |
| `POST /melis/react-api/category-discounts/save` | `saveAction` | `{ items }` — discounts re-read after save (fresh ids). |

TS shapes (`discountApi.ts`):

```ts
interface CountryOpt  { id: number; name: string; flag: string | null; general: boolean }
interface GroupOpt    { id: number; name: string }
interface DiscountRow { id: number; countryId: number; groupId: number; percentage: number }
```

**Access guard (all three actions):** `denyUnlessAccess()` requires an authenticated identity (`MelisCoreAuth`, else 401) and `MelisCoreRights->canAccess('meliscommerce_categories_page')` — the **host** Catalogs tool's melisKey (else 403). The tab can never be more permissive than the tool it lives in.

**Save contract.** The client sends **every** cell (empty ones included — an empty `percentage` deletes that row). `saveAction` revalidates (numeric, ≤ 2 decimals, ≤ 100, > 0), rebuilds the legacy `[countryId][groupId] => ['gdc_id' => …, 'gdc_discount_percent' => …]` structure, and delegates to the service — no business logic in the controller:

```php
$this->getServiceManager()
     ->get('MelisCommerceGroupDiscountPerCategoryService')
     ->saveCategoryGroupDiscount($categoryId, $datas);   // same service + events as the legacy tool
```

`options`/`get` read from `MelisCommerceGroupDiscountPerCategoryService->getCategoryDiscountsByCategoryId()`, `MelisEcomCountryTable->getCountries()` and `MelisComClientGroupsService->getClientsGroupList()`.

## Host integration

- **Discovery / load:** standard brick flow — `GET /melis/react-api/react-modules` lists it, the host background-loads `brick.js`, and `brick.tsx` publishes the global.
- **Component pickup:** MelisCommerce's `CatalogPage.tsx` resolves the component and label via the generic helpers, and adds the tab **iff both resolve** and only in **edit** mode:

  ```ts
  const DiscountTabComp  = useExternalBrickComponent<{ categoryId: number }>(
    'MelisCommerceGroupDiscountPerCategoryBrick', 'CategoryDiscountTab')
  const DiscountTabLabel = useExternalBrickValue<{ fr: string; en: string }>(
    'MelisCommerceGroupDiscountPerCategoryBrick', 'tabLabel')
  ```

  The tab content is **mounted permanently** (hidden with `display:none` when inactive) so it keeps its inputs and listeners.

- **Save-with-the-form bridge** (two `CustomEvent`s on `window`):
  - `melis:commerce-category-validate` — dispatched before saving; the tab validates and, on the first invalid value, sets `detail.blocked = true` and `detail.tab = 'price_discount'`, aborting the category save.
  - `melis:commerce-category-saved` — dispatched after the category is saved; the tab pushes its `submit({ silent: true })` promise into `detail.pending`, which `CatalogPage` awaits before finishing.

## Key files

| Concern | Path |
| --- | --- |
| Brick source (component, api client) | `ui-react/src/{brick.tsx, CategoryDiscountTab.tsx, discountApi.ts}` |
| Built brick + manifest | `public/ui-react/{brick.js, brick.manifest.json}` (id `commerce-group-discount-per-category`) |
| React API routes | `config/react-api.php` |
| Module wiring | `config/module.config.php` |
| React API controller | `src/Controller/ReactApi/MelisReactApiCategoryDiscountController.php` |

See also: [melis-commerce](/legacy/reference/modules/melis-commerce)
