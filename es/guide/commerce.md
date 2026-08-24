# Commerce

`melis-commerce` añade un dominio completo de **comercio electrónico** a Melis: catálogo, clientes, carrito, pago (checkout) y
pedidos, expuesto tanto como **herramientas del backoffice** como **plugins del front-office**. Esta página es un mapa para
orientarse; consulta el `src/Service/` del módulo para conocer la API exacta y actual.

En **Melis v6** el framework, el módulo y sus servicios no han cambiado; lo que cambió es la
**interfaz del back-office**: las herramientas de comercio ahora se ejecutan como **"bricks"** de React nativas dentro de `/melis-react`
(consulta [Crear una herramienta](./create-a-tool)). Cada herramienta conserva un conmutador **New / Old** por herramienta para que puedas
volver a la pantalla clásica en un iframe, y el [Asistente de IA](./ai) flotante global está
disponible sobre cada herramienta.

## Modelo de dominio

Los conceptos principales (entidades en `melis-commerce/src/Entity/`, tablas con el prefijo `melis_ecom_*`):

| Área | Conceptos | Tablas (ejemplos) |
| --- | --- | --- |
| **Catálogo** | Producto, Variante (SKU vendible), Categoría, Atributo y valores | `melis_ecom_product`, `melis_ecom_variant`, `melis_ecom_category`, `melis_ecom_attribute` |
| **Precios** | Precio por variante/producto × país × moneda × grupo de clientes | `melis_ecom_price`, `melis_ecom_client_groups` |
| **Clientes** | Cliente (cuenta), Persona del cliente, direcciones | `melis_ecom_client`, `melis_ecom_client_person` |
| **Carrito** | Cestas anónimas y persistentes | `melis_ecom_basket_anonymous`, `melis_ecom_basket_persistent` |
| **Pedidos** | Pedido + direcciones, pago, envío; devoluciones | `melis_ecom_order`, `melis_ecom_order_address`, `melis_ecom_order_payment` |
| **Promociones** | Cupones (restringidos por producto/cliente) | `melis_ecom_coupon`, `melis_ecom_coupon_product` |
| **Localización** | País, Moneda | `melis_ecom_country`, `melis_ecom_currency` |
| **Medios** | Documentos (imágenes/PDF) | `melis_ecom_document` |

## Servicios que usarás

Todos registrados en `melis-commerce/config/module.config.php` (`service_manager.aliases`). Los principales
son:

- **Catálogo**: `MelisComProductService`, `MelisComVariantService`, `MelisComCategoryService`,
  `MelisComAttributeService`, `MelisComPriceService`, `MelisComProductSearchService`,
  `MelisComDocumentService`.
- **Carrito y checkout**: `MelisComBasketService`, `MelisComOrderCheckoutService`,
  `MelisComOrderService`, `MelisComShipmentCostService`, `MelisComPostPaymentService`,
  `MelisComOrderProductReturnService`.
- **Clientes**: `MelisComClientService`, `MelisComAuthenticationService`, `MelisComContactService`,
  `MelisComClientGroupsService`.
- **Configuración**: `MelisComCouponService`, `MelisComCurrencyService`, `MelisComSeoService`.

```php
$products = $sm->get('MelisComProductService');
$orders   = $sm->get('MelisComOrderService');
```

Cada servicio se apoya en una capa de datos `MelisEcom*Table` (por ejemplo, `MelisEcomProductTable` →
`melis_ecom_product`). El back-office React **no** reimplementa nada de esto: sus
endpoints `/melis/react-api/…` solo validan la entrada y dan forma al JSON, para luego llamar a estos mismos servicios.

## En el backoffice

MelisCommerce registra una sección **MelisCommerce** en la barra lateral de `/melis-react` con **13 herramientas React**
que cubren todo el dominio: **Accounts**, **Contacts**, **Catalogs**, **Products**,
**Orders**, **Coupons**, **Attributes**, **Countries**, **Commerce languages**, **Currencies**,
**Order status**, **Client's groups** y **Commerce settings**. Cada una es una página React real (sin
iframe en la vista "New" por defecto) que se abre en su propia ruta; las herramientas de "entidad" abren un registro como una
**subpestaña** persistente para que puedas volver a la lista sin perder tu posición. Cada herramienta lleva
un conmutador **New / Old**: "Old" muestra la herramienta clásica en un iframe para que puedas compararlas.

![La sección MelisCommerce en la barra lateral de /melis-react — el selector de herramientas.](/screenshots/react/melis-commerce/meliscommerce-menu-tools-selector.png)

Un flujo de trabajo típico: construir el **catálogo** (Attributes → Catalogs → Products/Variants), gestionar los
**clientes** (Accounts + Contacts) y, luego, ejecutar el proceso de **pedidos** (Orders + cupones), todo respaldado
por las listas de referencia de comercio (Countries, Currencies, Order status, Client's groups, Settings).

- **Catálogo** — la herramienta **Catalogs** es un **árbol** de categorías (arrastra para reordenar; Properties / SEO /
  Products por nodo). **Products** lista los productos (búsqueda, duplicar, exportar); el editor tiene
  las pestañas **Properties**, **Text**, **Variants**, **SEO** y **Prices**, con un editor completo por variante
  (precios, existencias, SEO, asociaciones, medios). **Attributes** gestiona características tipadas
  (Properties / Labels / Values).

  ![La lista de Products (React).](/screenshots/react/melis-commerce/meliscommerce-tools-products-list.png)

  ![Editor de producto — pestaña Variants.](/screenshots/react/melis-commerce/meliscommerce-tools-products-edit-tab-variants.png)

- **Clientes** — las **Accounts** son clientes B2B (Properties, Company, Contacts, Addresses, Orders,
  Files), con búsqueda, filtros, un gestor de columnas, exportación e **importación** CSV. Los **Contacts** son las
  personas individuales (Information / Address / Association), vinculadas a una o varias cuentas.

  ![La lista de Accounts (React).](/screenshots/react/melis-commerce/meliscommerce-tools-accounts-list.png)

- **Pedidos** — la herramienta **Orders** lista los pedidos (filtros, filtros de estado, exportación). El editor
  por pedido tiene las pestañas **Properties**, **Basket**, **Addresses**, **Payment**, **Shipping**, **Messages** y
  **Returns** (más **Invoices** cuando la facturación está activa — ver más abajo). **New Order** abre un
  **asistente de checkout de 7 pasos** guiado (contacto → cuenta → productos → direcciones → resumen → pago →
  confirmación) respaldado por una sesión del lado del servidor que retoma donde lo dejaste.

  ![La lista de Orders (React).](/screenshots/react/melis-commerce/meliscommerce-tools-order-list.png)

  ![Asistente de checkout New Order.](/screenshots/react/melis-commerce/meliscommerce-tools-order-newordertunnel-1.png)

- **Referencia y configuración** — **Coupons** (Properties, Assign account, Assign product, Orders de uso),
  **Countries**, **Commerce languages**, **Currencies** (con una acción *set default*), **Order
  status** (estado + color + etiquetas por idioma), **Client's groups** y una única página **Commerce
  settings** (Properties + Accounts).

Para la referencia completa pestaña por pestaña de cada herramienta (rutas, capacidades, endpoints de `react-api`) consulta la
[referencia del módulo melis-commerce](/es/reference/modules/melis-commerce).

## En el front office

Commerce incluye un amplio conjunto de **plugins de plantillas** (colócalos en las páginas — ver
[Plugins](./plugins)) que cubren toda la tienda:

- **Catálogo**: `MelisCommerceProductShowPlugin`, `MelisCommerceProductListPlugin`,
  `MelisCommerceProductSearchPlugin`, `MelisCommerceCategoryProductListPlugin`,
  `MelisCommerceRelatedProductsPlugin`.
- **Cuenta**: `MelisCommerceLoginPlugin`, `MelisCommerceRegisterPlugin`,
  `MelisCommerceAccountPlugin`, `MelisCommerceProfilePlugin`, plugins de dirección de entrega/facturación.
- **Carrito y checkout**: `MelisCommerceAddToCartPlugin`, `MelisCommerceCartPlugin`,
  `MelisCommerceCheckoutPlugin` (+ pasos de carrito / cupón / direcciones / resumen / confirmación).
- **Pedidos**: `MelisCommerceOrderHistoryPlugin`, `MelisCommerceOrderPlugin`,
  `MelisCommerceOrderReturnProductPlugin`.

…más widgets del panel (recuento de pedidos, ingresos por ventas, mensajes de pedidos).

Por tanto, una tienda se ensambla principalmente **colocando estos plugins** en las páginas del CMS y dándoles estilo
en las vistas de tu módulo de sitio. El cambio del back-office React **no** afecta al front office:
los plugins de la tienda y sus vistas no han cambiado.

## Facturación

`melis-commerce-order-invoice` extiende commerce con la **generación de facturas en PDF** (mediante
Spipu/Html2Pdf): un servicio de facturas + tabla (`melis_ecom_order_invoice`) y listeners que generan
facturas a partir de los datos del pedido. En el back-office React **no tiene una herramienta propia**: es una
**brick de extensión** que inyecta dos elementos en la herramienta **Orders** cuando el módulo está activo:

- una pestaña **Invoices** en el editor de pedidos — listar facturas, **Regenerate Invoice** y descargar cualquier
  factura listada;
- un botón de **descarga** por fila en la lista de Orders que obtiene el PDF de la última factura del pedido.

Si no los ves, comprueba que `melis-commerce-order-invoice` esté activo y que tu rol tenga el
permiso **Invoices** de Orders. Consulta la
[referencia del módulo melis-commerce-order-invoice](/es/reference/modules/melis-commerce-order-invoice).

## Archivos clave

| Aspecto | Ruta |
| --- | --- |
| Servicios | `vendor/melisplatform/melis-commerce/src/Service/` |
| Entidades | `vendor/melisplatform/melis-commerce/src/Entity/` |
| Esquema | `vendor/melisplatform/melis-commerce/install/sql/setup_structure.sql` |
| Plugins del front | `vendor/melisplatform/melis-commerce/src/Controller/Plugin/` |
| Bricks y API de React | `vendor/melisplatform/melis-commerce/ui-react/`, `config/react-api.php`, `src/Controller/ReactApi/` |
| Facturación | `vendor/melisplatform/melis-commerce-order-invoice/` |
