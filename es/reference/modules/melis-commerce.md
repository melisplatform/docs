# MelisCommerce

> Framework de comercio electrónico completo para MelisPlatform — catálogo, clientes, carrito/checkout/pedidos, cupones, envío y SEO — con un back-office en React. Paquete `melisplatform/melis-commerce`.

## Propósito

MelisCommerce añade una capa de comercio completa a un sitio Melis: un catálogo (productos, variantes,
atributos, categorías, precios, stock), un modelo de cliente B2B (cuentas + contactos), el
pipeline de carrito/checkout/pedido, cupones, monedas, envíos, devoluciones, documentos y SEO. Incluye una
suite de gestión de back-office y una tienda de front-office construida a partir de plugins de plantillas arrastrables. La
capa de datos utiliza **59 tablas `melis_ecom_*`**, **26 servicios**, **10 entidades enriquecidas** y **33
listeners**; el acceso a datos usa Eloquent (`illuminate/database` incluido), envuelto por servicios
orientados a eventos al estilo Melis.

En Melis v6 la lógica de negocio no cambia; la **capa de presentación** es un **back-office en React**
(`/melis-react`). MelisCommerce incluye **un único bundle multi-brick** que expone **13 herramientas React nativas**,
cada una respaldada por endpoints JSON bajo `/melis/react-api/…`. Cada herramienta conserva un conmutador **New / Old**
por herramienta para poder volver a la pantalla legacy clásica en un iframe.

## Activarlo

Añádelo a `config/melis.module.load.php`:

```php
return [
    'MelisCommerce',
];
```

Requiere `melisplatform/melis-core`. Las tablas de base de datos se aprovisionan automáticamente mediante MelisDbDeploy
(deltas bajo `install/dbdeploy/`); el instalador de Melis ofrece el módulo como un componente
opcional. Las herramientas React aparecen en el back-office solo cuando MelisCommerce está activo (descubrimiento mediante
`GET /melis/react-api/react-modules`).

## El back-office en React — un bundle, trece herramientas

El bundle (`public/ui-react/brick.js` + `brick.manifest.json`) declara 13 herramientas que se autorregistran
en `brick.tsx`. Todas son full-React nativas; cada una renderiza un `ViewModeToggle` + `LegacyFrame` compartidos, de modo que
*Old* monta la herramienta clásica en un iframe (`/melis/react-tool-page?key=<melisKey>`). Las siete
herramientas "de entidad" definen `subTabs: true` (abrir un registro añade una sub-pestaña); las 13 son `persistent`.

![La sección MelisCommerce en la barra lateral de React — las 13 herramientas de comercio](/screenshots/react/melis-commerce/meliscommerce-menu-tools-selector.png)

| Brick id | Ruta | Etiqueta | melisKey |
| --- | --- | --- | --- |
| `commerce-accounts` | `/melis-commerce/clients-list` | Cuentas | `meliscommerce_clients_list_page` |
| `commerce-contacts` | `/melis-commerce/contact-list` | Contactos | `meliscommerce_contact_list_page` |
| `commerce-catalog` | `/melis-commerce/categories` | Catálogos | `meliscommerce_categories_page` |
| `commerce-products` | `/melis-commerce/product-list` | Productos | `meliscommerce_product_list_container` |
| `commerce-orders` | `/melis-commerce/order-list` | Pedidos | `meliscommerce_order_list_page` |
| `commerce-coupons` | `/melis-commerce/coupon-list` | Cupones | `meliscommerce_coupon_list_page` |
| `commerce-attributes` | `/melis-commerce/attribute-list` | Atributos | `meliscommerce_attribute_list_page` |
| `commerce-countries` | `/melis-commerce/country-list` | Países | `meliscommerce_country_list_container` |
| `commerce-languages` | `/melis-commerce/language-list` | Idiomas de comercio | `meliscommerce_language_list_container` |
| `commerce-currencies` | `/melis-commerce/currency-lists` | Monedas | `meliscommerce_currency_conf` |
| `commerce-order-status` | `/melis-commerce/order-status-lists` | Estado del pedido | `meliscommerce_order_status_tool_page` |
| `commerce-clients-groups` | `/melis-commerce/clients-group-list` | Grupos de clientes | `meliscommerce_clients_group_tool_container` |
| `commerce-settings` | `/melis-commerce/settings` | Ajustes de comercio | `meliscommerce_settings_page` |

> **Regla general:** construye el **catálogo** (atributos → catálogos → productos/variantes), gestiona
> los **clientes** (cuentas + contactos) y luego ejecuta el pipeline de **pedidos** (pedidos + asistente de checkout +
> cupones), todo respaldado por las listas de referencia de comercio.

## Modelo de objetos

| Concepto | Qué es |
| --- | --- |
| **Producto** | Un contenedor de variantes — no es en sí una unidad vendible. |
| **Variante** | La unidad vendible: tiene su propio SKU, stock y precio. Un producto sin opciones reales sigue teniendo una variante principal. |
| **Atributo** | Una propiedad filtrable/que define variantes (p. ej. Color, Talla) con valores tipados y traducibles. Los productos declaran qué atributos usan; cada variante elige un valor por atributo. |
| **Precio** | Resuelto para un par `(countryId, groupId)` con IVA; recurre a valores por defecto de forma escalonada (véase [Resolución de precios](#resolución-de-precios-y-stock)). |
| **Cuenta** | Una organización B2B (`melis_ecom_client`); tiene un registro de empresa, grupo y direcciones. |
| **Contacto / Persona** | Un individuo (`melis_ecom_client_person`) que inicia sesión; puede pertenecer a varias cuentas. |
| **Cesta** | Anónima (identificada por `clientKey`) o persistente (vinculada a una cuenta); se fusionan al iniciar sesión. |
| **Pedido** | Creado con estado `-1` (temporal) durante el checkout; pasa a `1` (Nuevo pedido) tras el pago. |

## Cuentas y contactos

**Cuentas** (`/melis-commerce/clients-list`) gestiona clientes B2B: la lista incluye búsqueda,
filtros por estado/grupo, un gestor de columnas, exportación e **importación** por CSV. Abrir una cuenta es una sub-pestaña
con pestañas **Properties**, **Company**, **Contacts** (vincular/desvincular, definir predeterminado), **Addresses**, **Orders**
(historial) y **Files**.

![La lista de Cuentas — filtros, gestor de columnas e importación por CSV](/screenshots/react/melis-commerce/meliscommerce-tools-accounts-list.png)

![Editor de cuenta — pestaña Properties (estado, estrategia de nombre, grupo, país, etiquetas)](/screenshots/react/melis-commerce/meliscommerce-tools-accounts-new-tab-properties.png)

![Editor de cuenta — pestaña Contacts (vincular / desvincular / predeterminado)](/screenshots/react/melis-commerce/meliscommerce-tools-accounts-new-tab-contacts.png)

**Contactos** (`/melis-commerce/contact-list`) gestiona personas individuales. El editor tiene las pestañas
**Information**, **Address** y **Association** (vincular/desvincular un contacto a cuentas, definir el
predeterminado). Los contactos están respaldados por `MelisComContactService`; las cuentas por `MelisComClientService`.

![Editor de contacto — pestaña Association (vincular / desvincular cuentas)](/screenshots/react/melis-commerce/meliscommerce-tools-contacts-edit-tab-association.png)

## Catálogos, productos y variantes

**Catálogos** (`/melis-commerce/categories`) es un **árbol** de categorías reordenable arrastrando; una categoría
tiene pestañas **Properties**, **SEO** y **Products** (reordenables).

![El árbol de categorías del Catálogo (React)](/screenshots/react/melis-commerce/meliscommerce-tools-catalogs-treeview.png)

**Productos** (`/melis-commerce/product-list`) lista productos con filtros, duplicación y exportación. El
editor de producto tiene las pestañas **Properties**, **Text** (por idioma), **Variants**, **SEO** y **Prices**.
La pestaña **Variants** es la más completa: cada variante tiene sus propias Properties, SEO, Prices, Stocks
y Associations, además de medios.

![La lista de Productos (React)](/screenshots/react/melis-commerce/meliscommerce-tools-products-list.png)

![Editor de producto — pestaña Variants (precios, stocks, SEO y asociaciones por variante)](/screenshots/react/melis-commerce/meliscommerce-tools-products-edit-tab-variants.png)

![Editor de producto — pestaña Prices](/screenshots/react/melis-commerce/meliscommerce-tools-products-edit-tab-prices.png)

**Atributos** (`/melis-commerce/attribute-list`) gestiona las características tipadas de los productos: pestañas del editor
**Properties** (referencia, tipo, estado, visible, buscable), **Labels** (por idioma) y
**Values** (valores con traducciones tipadas).

![Editor de atributo — pestaña Values (valores con traducciones tipadas)](/screenshots/react/melis-commerce/meliscommerce-tools-attributes-edit-tab-values.png)

## Pedidos y el asistente de checkout

**Pedidos** (`/melis-commerce/order-list`) tiene filtros por estado y exportación. Las pestañas del editor por pedido
son **Properties**, **Basket** (solo lectura), **Addresses**, **Payment** (solo lectura), **Shipping**,
**Messages** y **Returns** — además de **Invoices** cuando
[MelisCommerceOrderInvoice](/es/reference/modules/melis-commerce-order-invoice) está activo.

![La lista de Pedidos (React)](/screenshots/react/melis-commerce/meliscommerce-tools-order-list.png)

![Editor de pedido — pestaña Properties](/screenshots/react/melis-commerce/meliscommerce-tools-order-edit-tab-properties.png)

**New Order** abre un **asistente de checkout guiado de 7 pasos**
(`contact → account → products → addresses → summary → payment → confirmation`), respaldado por una
sesión de checkout del lado del servidor (endpoints bajo `/orders/checkout/*`) que reanuda donde lo dejaste.

![El asistente de checkout de New Order — pasos contacto / cuenta / productos](/screenshots/react/melis-commerce/meliscommerce-tools-order-newordertunnel-1.png)

![El asistente de checkout — paso direcciones / resumen](/screenshots/react/melis-commerce/meliscommerce-tools-order-newordertunnel-2.png)

## Cupones

**Cupones** (`/melis-commerce/coupon-list`) gestiona códigos de descuento (% o importe). Pestañas del editor:
**Properties**, **Assign account** (clientes), **Assign product** y **Orders** (historial de uso).
Respaldado por `MelisComCouponService`; el descuento integrado es en sí mismo un listener de
`meliscommerce_service_get_item_price_end`.

![Editor de cupón — pestaña Assign account](/screenshots/react/melis-commerce/meliscommerce-tools-coupons-edit-tab-assignedclients.png)

## Herramientas de referencia de comercio

Pequeñas herramientas "tipo ajustes" — listas de una sola página con modales de añadir/editar o un único formulario:

| Herramienta | Ruta | Gestiona |
| --- | --- | --- |
| Países | `/melis-commerce/country-list` | Lista de países de comercio (añadir/editar) |
| Idiomas de comercio | `/melis-commerce/language-list` | Idiomas de comercio (lista + modal) |
| Monedas | `/melis-commerce/currency-lists` | Monedas (lista + modal, **definir predeterminada**) |
| Estado del pedido | `/melis-commerce/order-status-lists` | Estados; el editor tiene Properties (color) + Labels |
| Grupos de clientes | `/melis-commerce/clients-group-list` | Grupos de clientes (lista + modal) |
| Ajustes de comercio | `/melis-commerce/settings` | Página de configuración única — pestañas Properties + Accounts |

![La lista de Estado del pedido (React)](/screenshots/react/melis-commerce/meliscommerce-tools-orderstatus-list.png)

![Ajustes de comercio — pestaña Properties (umbral de alerta de stock, estrategia de nombre de cuenta)](/screenshots/react/melis-commerce/meliscommerce-tools-settings-tab-properties.png)

Los ajustes de comercio guardan el umbral global de alerta de stock y la estrategia de nombre de cuenta (`sa_type`).

## Servicios clave

Todos los servicios extienden `MelisComGeneralService` y se registran en `config/module.config.php`. Cada
método público se envuelve en eventos `meliscommerce_service_*_start` / `*_end` (véase
[Eventos y listeners](#eventos-y-listeners)). Los controladores React solo validan la entrada y dan forma al JSON — el
trabajo real permanece en estos servicios.

| Alias del servicio | Rol |
| --- | --- |
| `MelisComProductService` | `getProductById`, `getProductList` → `MelisProduct` |
| `MelisComVariantService` | `getVariantById`, `getVariantListByProductId`, `getVariantBySKU`, `getMainVariantByProductId` → `MelisVariant` |
| `MelisComCategoryService` | `getCategoryById`, `getCategoryListById(Recursive)` → `MelisCategory` |
| `MelisComAttributeService` | `getAttributeById`, `getAttributes` → `MelisAttribute` |
| `MelisComPriceService` | `getItemPrice($itemId, $countryId, $groupId, $type)` — precio con jerarquía de reserva |
| `MelisComProductSearchService` | Búsqueda de productos en el front-office |
| `MelisComSeoService` | SEO de comercio (URLs / meta para productos y categorías) |
| `MelisComClientService` | `getClientById`, `getClientList`, `getClientByIdAndClientPerson` → `MelisClient` |
| `MelisComContactService` | Gestión de contactos (personas) |
| `MelisComClientGroupsService` | Grupos de clientes (usados para precios específicos por grupo) |
| `MelisComAuthenticationService` | Login del front-office: `login`, `getClientId`, `getPersonId`, `getClientGroup`, `setClientId`, `logout`, `hasIdentity` |
| `MelisComBasketService` | `getBasket`, `getPersistentBasket`, `getAnonymousBasket`, `addVariantToBasket`, `transferAnonymousBasketToPersistentBasket` → `MelisBasket` |
| `MelisComOrderService` | `getOrderById`, `getOrderList` → `MelisOrder` |
| `MelisComOrderCheckoutService` | Checkout en dos fases: `checkoutStep1_prePayment`, `checkoutStep2_postPayment` |
| `MelisComPostPaymentService` | Registro de transacciones posteriores al pago |
| `MelisComOrderProductReturnService` | Devoluciones de productos / RMA |
| `MelisComCouponService` | `getCouponById`, `getCouponList` → `MelisCoupon` |
| `MelisComCurrencyService` | Monedas |
| `MelisComShipmentCostService` | Cálculo del coste de envío |
| `MelisComStockEmailAlertService` | Alertas por email de stock bajo (`VARIANTSLOWSTOCK`) |
| `MelisComDocumentService` | `getDocumentById`, `getDocumentsByRelation` → `MelisDocument` |
| `MelisComDuplicationService` | Duplicar productos / variantes |
| `MelisComLinksService` | Constructor de enlaces de comercio en el front-office |
| `MelisComCacheService` | Caché de comercio (`commerce_big_services`) |
| `MelisComHead` | Helper de cabecera SEO (`updateTitleAndDescription`) |
| `MelisComGeneralService` | Clase base; helpers: `getTableColumns`, `getEcomLang`, `getFrontPluginLangId` |

## Resolución de precios y stock

`MelisComPriceService::getItemPrice($itemId, $countryId, $groupId, $type)` recorre una cadena de reserva:

1. país específico + grupo específico
2. país específico + grupo general
3. país general (`price_country_id = 0`) + grupo específico
4. país general + grupo general
5. (para una variante) recurre al precio del **producto**

El stock es por **variante y por país** (`melis_ecom_variant_stock`). Cuando un pedido reduce el stock por debajo
del umbral, se envía el email `VARIANTSLOWSTOCK` a los destinatarios configurados.

## Pipeline de checkout

Dos fases en `MelisComOrderCheckoutService` (el asistente React ejecuta la misma lógica de servidor):

**Fase 1 — `checkoutStep1_prePayment($clientId)`** valida la cesta y las direcciones, calcula todos
los costes y el envío, genera la referencia del pedido y luego llama a `MelisComOrderService::saveOrder()`.
El pedido se guarda con `ord_status = -1` (temporal). Dispara
`meliscommerce_service_checkout_step1_prepayment_start/_end` y `…_save_success` (que lleva el nuevo
`orderId`).

**Fase 2 — `checkoutStep2_postPayment()`** se llama después de que la pasarela devuelva.
`MelisComPostPaymentService::processPostPayment()` registra la transacción en
`melis_ecom_order_payment` y saca el pedido del estado `-1` a un estado real. Dispara
`meliscommerce_service_checkout_step2_postpayment_start/_end`.

**Estados del pedido:** `-1` temporal · `1` Nuevo pedido · `2` En espera · `3` Enviado · `4` Entregado ·
`5` Cancelado · `6` Error de pago.

## Eventos y listeners

Cada método de servicio emite eventos `meliscommerce_service_*_start` y `*_end`. Los argumentos con nombre
(construidos por `makeArrayFromParameters` mediante reflexión) y la clave `results` viajan con el evento.

- listener `_start`: mutar las entradas antes de que se ejecute el trabajo.
- listener `_end`: mutar `$params['results']` antes de que el llamante lo vea.

Este es el mecanismo de extensión principal — sin necesidad de subclases. Los 33 listeners incluidos se dividen en
cuatro familias:

| Familia | Ejemplos |
| --- | --- |
| Guardar / validar | `…SaveProductListener`, `…SaveOrderListener`, `…SaveClientListener`, `…ValidateVariantListener` |
| Limpieza en cascada (país/idioma eliminado) | `…ProductPriceCountryDeletedListener`, `…CategoryCountryLink…`, `…SEOLanguageDeletedListener` |
| Checkout / precios / stock | `…CheckoutCouponListener`, `…CouponProductPriceListener`, `…ShipmentCostListener`, `…PostPaymentListener`, `…VariantCheckLowStockListener` |
| Enrutamiento SEO del front-office | `…SEOReformatToRoutePageUrlListener`, `…SEODispatchRouterCommerceUrlListener`, `…SEOMetaPageListener` |

## API React y capacidades

Todas las rutas son rutas hijas de `melis-react-api` (fusionadas desde `config/react-api.php`): **13
controladores invocables** en `src/Controller/ReactApi/`, **184 rutas** bajo `/melis/react-api/…`.
El contrato de respuesta en todas partes es `{ success, data, error? }`; cada acción llama primero a
`denyUnlessAccess()` (auth + `MelisCoreRights::canAccess(<melisKey>)`, 401/403). Cada herramienta de entidad
expone aproximadamente `GET /<tool>` (lista por keyset), `/<tool>/stats`, `/<tool>/options`,
`POST /<tool>/save`, `DELETE /<tool>/delete/:id`, `GET /<tool>/:id`, además de
sub-recursos específicos de la herramienta (p. ej. Orders añade el asistente completo `/orders/checkout/*`).

> ⚠ Los idiomas de comercio se sitúan en el espacio de nombres `/commerce-languages` (no `/languages`) porque la herramienta
> Languages del núcleo ya posee `/languages` bajo el padre `melis-react-api` compartido.

`config/react.capabilities.php` declara una entrada `melisReactToolCapabilities` por herramienta, indexada bajo
su melisKey. Se trata de **indicaciones de UI declarativas con permiso por defecto** — impulsan el árbol de casillas de
Users → Rights y permiten que React oculte pestañas/botones mediante `useCaps(...)` — pero **todavía no hay
`denyUnlessCan()` del lado del servidor**; solo `denyUnlessAccess()` sobre el melisKey de la herramienta protege la API. Trata
las capacidades como indicaciones de UI, no como seguridad.

## Front-office

Los plugins de plantillas se registran bajo `config/plugins/{products,categories,clients,orders}/` y
como `controller_plugins` en `module.config.php`. Arrástralos a una zona de arrastrar y soltar de una página CMS.

| Área | Plugins |
| --- | --- |
| Catálogo | `ProductShowPlugin`, `ProductListPlugin`, `ProductSearchPlugin`, `CategoryTreePlugin`, `CategoryProductListPlugin`, `RelatedProductsPlugin`, `AttributesShowPlugin`, `ProductAttributePlugin`, `ProductPriceRangePlugin` |
| Carrito y checkout | `AddToCartPlugin`, `CartPlugin`, `CheckoutPlugin`, `CheckoutCartPlugin`, `CheckoutAddressesPlugin`, `CheckoutCouponPlugin`, `CheckoutSummaryPlugin`, `CheckoutConfirmSummaryPlugin`, `CheckoutConfirmPlugin` |
| Cuenta | `LoginPlugin`, `RegisterPlugin`, `AccountPlugin`, `ProfilePlugin`, `BillingAddressPlugin`, `DeliveryAddressPlugin`, `LostPasswordGetEmailPlugin`, `LostPasswordResetPlugin` |
| Pedidos (cliente) | `OrderPlugin`, `OrderHistoryPlugin`, `OrderMessagesPlugin`, `OrderShippingDetailsPlugin`, `OrderReturnProductPlugin`, `OrderAddressPlugin` |

## Tablas de base de datos

59 tablas con el prefijo `melis_ecom_*`, agrupadas por subsistema:

| Grupo | Tablas clave |
| --- | --- |
| Productos y variantes | `melis_ecom_product`, `melis_ecom_product_text` + `_text_type`, `melis_ecom_product_attribute`, `melis_ecom_product_category`, `melis_ecom_variant`, `melis_ecom_variant_attribute_value`, `melis_ecom_variant_stock`, `melis_ecom_assoc_variant` + `_type` |
| Atributos | `melis_ecom_attribute` + `_trans`, `melis_ecom_attribute_type`, `melis_ecom_attribute_value` + `_value_trans` |
| Categorías y geo | `melis_ecom_category` + `_trans`, `melis_ecom_country_category`, `melis_ecom_country`, `melis_ecom_lang` |
| Precios y moneda | `melis_ecom_price`, `melis_ecom_currency` |
| Clientes (B2B) | `melis_ecom_client`, `melis_ecom_client_person` + `_person_emails`, `melis_ecom_client_company`, `melis_ecom_client_account_rel`, `melis_ecom_client_person_rel`, `melis_ecom_client_address` + `_address_type`, `melis_ecom_client_groups`, `melis_ecom_civility`, `melis_ecom_settings_account` |
| Cestas y pedidos | `melis_ecom_basket_anonymous`, `melis_ecom_basket_persistent`, `melis_ecom_order`, `melis_ecom_order_basket`, `melis_ecom_order_address`, `melis_ecom_order_payment` + `_type`, `melis_ecom_order_shipping`, `melis_ecom_order_message`, `melis_ecom_order_status` + `_trans`, `melis_ecom_order_product_return` + `_details` |
| Cupones | `melis_ecom_coupon` + `_coupon_client` / `_coupon_order` / `_coupon_product` |
| Documentos y SEO | `melis_ecom_document` + `_doc_type` + `_doc_relations`, `melis_ecom_seo`, `melis_ecom_stock_email_alert` |

## Ejemplos

**Leer un producto, su variante principal y un precio resuelto**

```php
$prdSrv   = $sm->get('MelisComProductService');
$varSrv   = $sm->get('MelisComVariantService');
$priceSrv = $sm->get('MelisComPriceService');

$product = $prdSrv->getProductById($prdId, $langId, $countryId);  // → MelisProduct
$variant = $varSrv->getMainVariantByProductId($prdId, $langId, $countryId);  // → MelisVariant
$price   = $priceSrv->getItemPrice($variant->getId(), $countryId, $groupId, 'variant');
// $price['price'] (net), $price['price_currency'], $price['price_details']
```

**Añadir a la cesta y ejecutar el checkout en dos fases**

```php
$basketSrv   = $sm->get('MelisComBasketService');
$checkoutSrv = $sm->get('MelisComOrderCheckoutService');

$basketSrv->addVariantToBasket($variantId, 1, $clientId);
$basketSrv->transferAnonymousBasketToPersistentBasket($clientKey, $clientId);

$step1 = $checkoutSrv->checkoutStep1_prePayment($clientId);  // order at status -1
// $step1['orderId'] — hand to payment gateway
$step2 = $checkoutSrv->checkoutStep2_postPayment();          // records payment, moves off -1
```

**Enganchar la tienda sin subclases**

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

## Archivos clave

| Aspecto | Ruta |
| --- | --- |
| Config del módulo (servicios, controladores, plugins) | `vendor/melisplatform/melis-commerce/config/module.config.php` |
| Rutas / capacidades de la API React | `vendor/melisplatform/melis-commerce/config/react-api.php`, `config/react.capabilities.php` |
| Brick React (fuente / build) | `vendor/melisplatform/melis-commerce/ui-react/src/`, `public/ui-react/{brick.js, brick.manifest.json}` |
| Controladores de la API React (13) | `vendor/melisplatform/melis-commerce/src/Controller/ReactApi/` |
| Config de plugins del front-office | `vendor/melisplatform/melis-commerce/config/plugins/` |
| Servicios / Entidades (10) / Table gateways (59) | `vendor/melisplatform/melis-commerce/src/Service/`, `src/Entity/`, `src/Model/Tables/` |
| Listeners (33) | `vendor/melisplatform/melis-commerce/src/Listener/` |
| Deltas de BD | `vendor/melisplatform/melis-commerce/install/dbdeploy/` |

Véase también: [Referencia de módulos](/es/reference/modules) · [melis-react-api](/es/reference/modules/melis-react-api) · [melis-commerce-order-invoice](/es/reference/modules/melis-commerce-order-invoice) · [melis-core](/legacy/reference/modules/melis-core) · [melis-cms](/es/reference/modules/melis-cms).
