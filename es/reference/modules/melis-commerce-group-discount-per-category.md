# MelisCommerceGroupDiscountPerCategory

> Añade un descuento de precio por categoría, delimitado por país y grupo de clientes, en forma de una pestaña "Price Discount" inyectada en la herramienta Catalogs de MelisCommerce dentro del back-office React. Paquete `melisplatform/melis-commerce-group-discount-per-category`.

## Propósito

MelisCommerceGroupDiscountPerCategory te permite definir un **descuento porcentual sobre los productos de una categoría, por país y por grupo de clientes**. El descuento se delimita a *(categoría × país × grupo de clientes)*, de modo que dos clientes que compran el mismo producto pueden ver dos precios diferentes según el grupo al que pertenezcan, y el descuento puede variar de un país a otro (con un pseudo-país **General**, id `-1`, que se aplica a todas las zonas).

El módulo **no tiene herramienta propia**. Es un **ladrillo de extensión / inyección en el host**: no dibuja ninguna página y no añade ninguna entrada de menú. En su lugar, publica un componente React en `window`, que la página Catalogs de MelisCommerce recoge — cuando el módulo está activo — para añadir una pestaña **Price Discount** al editor de categorías. La persistencia real permanece en el servicio Laminas del módulo, sin cambios respecto a la herramienta legacy.

## Activarlo

Añade a `config/melis.module.load.php`:

```php
return [
    'MelisCommerceGroupDiscountPerCategory',
];
```

Al tratarse de un ladrillo de extensión, la pestaña aparece **únicamente cuando se cumplen ambas** condiciones:

- **El módulo está activo** — solo un ladrillo activo publica su variable global en `window` para que el host la recoja.
- **El usuario dispone del derecho `price_discount`** sobre la herramienta Catalogs.

En este módulo **no hay `config/react.capabilities.php`**: la capacidad `price_discount` se declara en **MelisCommerce**, bajo la melisKey portadora de derechos de la herramienta Catalogs, `meliscommerce_categories_page`.

## Dónde se ubica en el back-office React

No hay una pantalla dedicada. La funcionalidad es una pestaña dentro de la herramienta Catalogs:

- Barra lateral → **Commerce → Catalogs**.
- Abre/edita una **categoría** existente.
- Haz clic en la pestaña **Price Discount** (etiquetada *"Discount Per Client's Group"* / *"Réduction par groupe de client"*).

La pestaña es **solo de edición**: se adjunta a una categoría existente, por lo que está deshabilitada mientras se *crea* una — guarda la categoría primero. Tampoco tiene **botón de guardado propio**; los descuentos se escriben con el botón **"Save category"** del formulario del host.

La pestaña tiene dos áreas:

- una lista de **países** a la izquierda (**General** primero, después cada país con su bandera); una insignia muestra cuántos descuentos están rellenados para ese país;
- un conjunto de **pestañas de grupos de clientes** a la derecha — elige un grupo y escribe su **porcentaje de descuento** para el país seleccionado. Un punto marca una pestaña de grupo que ya contiene un valor (rojo si es inválido).

## Reglas de descuento

- **Porcentaje** — `0 < valor ≤ 100`, con un máximo de **2 decimales**. Dejar un campo **vacío** elimina (borra) esa fila de descuento.
- Solo se ofrecen los grupos de clientes **activos**.
- El campo se valida a medida que escribes; un valor inválido se muestra bajo su propio campo y marca la pestaña del grupo en rojo. Al pulsar **Save category**, un porcentaje inválido **bloquea** el guardado y cambia a la pestaña del primer país + grupo que incumple. En caso contrario, la categoría se guarda primero y luego los descuentos se guardan con ella.

## Anatomía del ladrillo

El código fuente del ladrillo es una biblioteca **IIFE** de Vite ubicada en `ui-react/`, que se compila a `public/ui-react/brick.js` (+ `brick.manifest.json`). React se externaliza a las variables globales del host para que el componente se renderice dentro de la página Catalogs. El manifiesto no declara **ninguna route, label, forwardKey ni melisKey** (todos `null`), y el punto de entrada **no** llama a `__melisRegisterBrick` — al cargarse simplemente publica una variable global:

```ts
window.MelisCommerceGroupDiscountPerCategoryBrick = {
  CategoryDiscountTab,
  tabLabel: { fr: 'Réduction par groupe de client', en: "Discount Per Client's Group" },
}
```

| Archivo | Función |
| --- | --- |
| `src/brick.tsx` | Publica la variable global `window.MelisCommerceGroupDiscountPerCategoryBrick`. Sin route, sin registro. |
| `src/CategoryDiscountTab.tsx` | La interfaz de la pestaña (props `{ categoryId }`): lista de países + pestañas de grupos de clientes + campo de porcentaje, diccionario fr/en autocontenido, validación en el cliente y los escuchadores de eventos de guardado-con-formulario. |
| `src/discountApi.ts` | Cliente JSON para los endpoints `react-api` del módulo, usando el contrato `{ success, data, error }`. |

La etiqueta de la pestaña se distribuye con **este** módulo (en la variable global), no con el diccionario de MelisCommerce. La pestaña lee el locale activo desde `document.documentElement.lang`.

## API React

Las rutas se definen en `config/react-api.php` y se fusionan en los `child_routes` de `melis-react-api`. Controlador: `MelisReactApiCategoryDiscountController` (`optionsAction` / `getAction` / `saveAction`). Forma de respuesta `{ success, data, error? }`.

| Método + URL | Acción | Devuelve (`data`) |
| --- | --- | --- |
| `GET /melis/react-api/category-discounts/options` | `optionsAction` | `{ countries, groups }` — países con **General** (id `-1`) primero + banderas en base64; grupos de clientes **activos**. |
| `GET /melis/react-api/category-discounts/:id` | `getAction` | `{ items }` — descuentos almacenados para la categoría `:id`. |
| `POST /melis/react-api/category-discounts/save` | `saveAction` | `{ items }` — descuentos releídos tras guardar (ids nuevos). |

Formas TS (`discountApi.ts`):

```ts
interface CountryOpt  { id: number; name: string; flag: string | null; general: boolean }
interface GroupOpt    { id: number; name: string }
interface DiscountRow { id: number; countryId: number; groupId: number; percentage: number }
```

**Control de acceso (las tres acciones):** `denyUnlessAccess()` requiere una identidad autenticada (`MelisCoreAuth`, si no 401) y `MelisCoreRights->canAccess('meliscommerce_categories_page')` — la melisKey de la herramienta Catalogs del **host** (si no 403). La pestaña nunca puede ser más permisiva que la herramienta en la que reside.

**Contrato de guardado.** El cliente envía **todas** las celdas (incluidas las vacías — un `percentage` vacío borra esa fila). `saveAction` revalida (numérico, ≤ 2 decimales, ≤ 100, > 0), reconstruye la estructura legacy `[countryId][groupId] => ['gdc_id' => …, 'gdc_discount_percent' => …]` y delega en el servicio — sin lógica de negocio en el controlador:

```php
$this->getServiceManager()
     ->get('MelisCommerceGroupDiscountPerCategoryService')
     ->saveCategoryGroupDiscount($categoryId, $datas);   // same service + events as the legacy tool
```

`options`/`get` leen de `MelisCommerceGroupDiscountPerCategoryService->getCategoryDiscountsByCategoryId()`, `MelisEcomCountryTable->getCountries()` y `MelisComClientGroupsService->getClientsGroupList()`.

## Integración con el host

- **Descubrimiento / carga:** flujo estándar de ladrillos — `GET /melis/react-api/react-modules` lo lista, el host carga `brick.js` en segundo plano y `brick.tsx` publica la variable global.
- **Recogida del componente:** el `CatalogPage.tsx` de MelisCommerce resuelve el componente y la etiqueta mediante los helpers genéricos, y añade la pestaña **solo si ambos se resuelven** y únicamente en modo **edición**:

  ```ts
  const DiscountTabComp  = useExternalBrickComponent<{ categoryId: number }>(
    'MelisCommerceGroupDiscountPerCategoryBrick', 'CategoryDiscountTab')
  const DiscountTabLabel = useExternalBrickValue<{ fr: string; en: string }>(
    'MelisCommerceGroupDiscountPerCategoryBrick', 'tabLabel')
  ```

  El contenido de la pestaña se **monta de forma permanente** (oculto con `display:none` cuando está inactivo) para que conserve sus campos y escuchadores.

- **Puente de guardado-con-el-formulario** (dos `CustomEvent` en `window`):
  - `melis:commerce-category-validate` — se despacha antes de guardar; la pestaña valida y, ante el primer valor inválido, establece `detail.blocked = true` y `detail.tab = 'price_discount'`, abortando el guardado de la categoría.
  - `melis:commerce-category-saved` — se despacha después de guardar la categoría; la pestaña inserta su promesa `submit({ silent: true })` en `detail.pending`, que `CatalogPage` espera antes de finalizar.

## Archivos clave

| Aspecto | Ruta |
| --- | --- |
| Código fuente del ladrillo (componente, cliente api) | `ui-react/src/{brick.tsx, CategoryDiscountTab.tsx, discountApi.ts}` |
| Ladrillo compilado + manifiesto | `public/ui-react/{brick.js, brick.manifest.json}` (id `commerce-group-discount-per-category`) |
| Rutas de la API React | `config/react-api.php` |
| Cableado del módulo | `config/module.config.php` |
| Controlador de la API React | `src/Controller/ReactApi/MelisReactApiCategoryDiscountController.php` |

Ver también: [melis-commerce](/legacy/reference/modules/melis-commerce)
