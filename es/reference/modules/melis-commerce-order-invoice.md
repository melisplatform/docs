# MelisCommerceOrderInvoice

> Añade la generación de facturas de pedido en PDF a MelisCommerce, integrada dentro de la herramienta de Pedidos en React. Paquete `melisplatform/melis-commerce-order-invoice`.

## Propósito

`MelisCommerceOrderInvoice` amplía [MelisCommerce](/es/guide/commerce) con la facturación de pedidos. Cuando un
pedido se valida, genera automáticamente una factura en PDF (mediante `spipu/html2pdf`) y la almacena en la
base de datos. **No incluye ninguna herramienta propia**: en el back-office React (`/melis-react`) inyecta dos
elementos en la herramienta **MelisCommerce → Pedidos** — una pestaña **Facturas** en el editor de pedidos (listar,
regenerar, descargar) y un pequeño botón de **descarga** en cada fila de la lista de pedidos. La plantilla de la factura es
una vista `.phtml`, totalmente sobrescribible por idioma.

## Cómo activarlo

Es un módulo estándar de Laminas. Añádelo a `config/melis.module.load.php` (después de `MelisCommerce`,
del que depende):

```php
'MelisCommerce',
'MelisCommerceOrderInvoice',
```

Dependencias (según `composer.json`): `melisplatform/melis-commerce` y `spipu/html2pdf`. El módulo
está habilitado para `dbdeploy`, por lo que su tabla se crea a través del delta de dbdeploy durante la instalación.

## Back-office React

El brick de este módulo es un **brick de extensión / inyección en el host**: no dibuja ninguna página, ni ruta, ni
entrada en la barra lateral. Su `brick.manifest.json` establece `route`, `label`, `forwardKey` y `melisKey` todos a
`null` (solo `entry: "brick.js"` es real; id del brick `commerce-order-invoice`). Al cargarse, `brick.tsx`
publica dos componentes React en un global de `window` en lugar de llamar a `__melisRegisterBrick`:

```ts
window.MelisCommerceOrderInvoiceBrick = { OrderRowButton, InvoicesTab }
```

La herramienta de Pedidos de MelisCommerce los consume **solo si este módulo está activo** — sondea
`window.MelisCommerceOrderInvoiceBrick` mediante su hook `useExternalBrickComponent(globalName, key)` y
no renderiza nada si el global nunca se define. Ambos componentes reciben una única prop `{ orderId: number }` y
leen `document.documentElement.lang` para las etiquetas FR/EN.

| Componente (`ui-react/src/`) | Dónde aparece | Comportamiento |
| --- | --- | --- |
| `OrderRowButton` | Lista de pedidos — por fila de pedido | Obtiene el id de la última factura del pedido; descarga su PDF, o muestra la alerta *"No invoice available"* si no hay ninguna. |
| `InvoicesTab` | Editor de pedidos — pestaña **Facturas** (solo pedido existente) | Lista las facturas (**ID**, **Fecha**), ofrece **Regenerar factura** y una **descarga** por fila. |

El brick es un bundle IIFE de Vite (`ui-react/vite.config.ts`, nombre `MelisCommerceOrderInvoiceBrickBundle`)
compilado en `public/ui-react/brick.js`; React y react-router se externalizan a los globals del host, de modo que el
brick reutiliza la instancia de React del host.

## Endpoints que llama el brick

El brick **no tiene `config/react-api.php`** — su cliente (`invoiceApi.ts`) reproduce las propias acciones
**MVC heredadas** del módulo con `credentials: 'same-origin'`, todas bajo una misma base:

```ts
export const INVOICE_BASE = '/melis/MelisCommerceOrderInvoice/MelisCommerceOrderInvoice'
```

| Llamada | Acción del controlador | Devuelve |
| --- | --- | --- |
| `POST {INVOICE_BASE}/getOrderLatestInvoiceId` (`orderId`) | `getOrderLatestInvoiceIdAction` | JSON `{ latestInvoiceId }` (0 si no hay ninguna) |
| `POST {INVOICE_BASE}/getOrderInvoice` (`invoiceId`) | `getOrderInvoiceAction` | Bytes del PDF + una cabecera de respuesta `fileName` |
| `POST {INVOICE_BASE}/getOrderInvoiceList` (`draw,start,length,orderId`) | `getOrderInvoiceListAction` | JSON de DataTables `{ data: [{ ordin_id, ordin_date_generated }] }` |
| `POST {INVOICE_BASE}/generateOrderInvoice` (`orderId`) | `generateOrderInvoiceAction` | JSON `{ id }` (el id de la nueva factura) |

Estas devuelven JSON/binario heredado en bruto, **no** el sobre de react-api `{ success, data, error }`, por lo que el
cliente las normaliza (`fetchOrderInvoiceList` mapea `ordin_id`/`ordin_date_generated`;
`downloadInvoiceFile` lee la cabecera `fileName`). En el lado del servidor, las acciones delegan en
`MelisCommerceOrderInvoiceService`, llamando a `generateOrderInvoice($orderId, 'orderinvoicetemplate/default')`
para una regeneración. El módulo también declara dos rutas literales adicionales
(`/CommerceOrderInvoice/getOrderLatestInvoiceId`, `/CommerceOrderInvoice/getInvoice`), pero el brick de React
utiliza la ruta por segmentos anterior.

## Capacidades y control de acceso

En este módulo **no existe `config/react.capabilities.php`**. El control de acceso tiene dos capas:

- **Visibilidad de la interfaz** — el host renderiza el botón de fila y la pestaña solo si el brick está cargado; la
  pestaña **Facturas** se filtra además según la propia capacidad `invoices` de MelisCommerce dentro de su
  árbol de capacidades `meliscommerce_order_list_page`.
- **Acceso a la API** — solo la acción de descarga del PDF aplica un permiso en el servidor:
  `getOrderInvoiceAction` comprueba `canAccess('meliscommerce_orders_content_tab_order_invoice')` y
  devuelve 403 en caso contrario. Las acciones de listar/última/generar solo requieren una sesión de BO, así que trata la
  visibilidad de la pestaña/botón como pistas de interfaz más que como un límite de autorización estricto.

## Servicios clave

Registrados como alias de `service_manager` en `config/module.config.php`:

| Alias del servicio | Rol |
| --- | --- |
| `MelisCommerceOrderInvoiceService` | El servicio de facturas (extiende `MelisComGeneralService`). Genera, recupera y lista facturas. |
| `MelisCommerceOrderInvoiceTable` | Table gateway sobre `melis_ecom_order_invoice` (extiende `MelisEcomGenericTable`). |

Métodos destacados de `MelisCommerceOrderInvoiceService`:

| Método | Rol |
| --- | --- |
| `generateOrderInvoice($orderId, $template)` | Construye el PDF de un pedido y lo guarda; devuelve el id de la nueva factura. |
| `getOrderInvoiceList($orderId, $start, $limit, $order)` | Lista las facturas de un pedido. |
| `getOrderLatestInvoiceId($orderId)` | Id de la última factura de un pedido, o `0` si no hay ninguna. |
| `getInvoice($invoiceId)` | La fila de la factura por id. |
| `getOrderInvoice($invoiceId)` | El blob PDF en bruto (`ordin_invoice_pdf`) de una factura. |
| `generateFileName($dateGenerated, $orderId, $invoiceId)` | Construye el nombre de archivo de descarga (`Y/m/d-order-invoice[-suffix].pdf`). |

Cada método dispara los eventos `meliscommerce_order_invoice_*_start` / `_end`. La construcción del PDF también dispara
`meliscommerceorderinvoice_pdf_view`, lo que te permite sobrescribir el `ViewModel` antes del renderizado. El
sufijo del nombre de archivo procede de `plugins.meliscommerceorderinvoice.data.custom-pdf-file-name` (por defecto
`invoice`) en `config/app.interface.php`.

## Listeners (integración)

El módulo se integra mediante tres listeners (registrados en `src/Module.php`) en lugar de plugins de
templating de front propios:

| Listener | Escucha | Efecto |
| --- | --- | --- |
| `MelisCommerceOrderInvoiceGenerateInvoiceListener` | `meliscommerce_service_checkout_step2_postpayment_proccess_end` | En un pedido correcto con estado `1`, genera automáticamente la factura a partir de `orderinvoicetemplate/default`. |
| `MelisCommerceOrderDetailsInvoiceDataListener` | `MelisCommerceOrderPlugin_melistemplating_plugin_generate_view` | Inyecta la última factura (+ URL de descarga) en la vista del plugin de detalles del pedido. |
| `MelisCommerceOrderHistoryInvoiceDataListener` | `MelisCommerceOrderHistoryPlugin_melistemplating_plugin_generate_view` | Añade `invoiceId` a cada fila del plugin de historial de pedidos. |

Así es como el módulo alimenta los plugins de front de cuenta/pedido de MelisCommerce; no incluye ningún
`MelisTemplatingPlugin` propio (ver [Plugins](/es/guide/plugins)).

## Tablas de base de datos

| Tabla | Rol |
| --- | --- |
| `melis_ecom_order_invoice` | Una fila por factura generada. Columnas: `ordin_id` (PK), `ordin_user_id`, `ordin_order_id`, `ordin_date_generated`, `ordin_invoice_pdf` (el PDF almacenado como `longblob`). |

## Ejemplo

Generar (o regenerar) y descargar la última factura de un pedido desde un controlador/servicio:

```php
$invoiceSvc = $serviceManager->get('MelisCommerceOrderInvoiceService');

// Generar una factura nueva a partir de la plantilla por defecto
$invoiceId = $invoiceSvc->generateOrderInvoice($orderId, 'orderinvoicetemplate/default');

// Obtener la última factura y su PDF en bruto
$latestId = $invoiceSvc->getOrderLatestInvoiceId($orderId);
$pdf      = $invoiceSvc->getOrderInvoice($latestId);   // contenido binario del PDF
```

## Archivos clave

| Aspecto | Ruta |
| --- | --- |
| Fuente del brick React | `ui-react/src/{brick.tsx, OrderRowButton.tsx, InvoicesTab.tsx, invoiceApi.ts}` |
| Compilación + manifiesto del brick | `public/ui-react/{brick.js, brick.manifest.json}` |
| Servicio de facturas | `src/Service/MelisCommerceOrderInvoiceService.php` |
| Table gateway | `src/Model/Tables/MelisCommerceOrderInvoiceTable.php` |
| Controlador | `src/Controller/MelisCommerceOrderInvoiceController.php` |
| Listeners | `src/Listener/` |
| Módulo / configuración | `src/Module.php`, `config/module.config.php`, `config/app.interface.php`, `config/app.tools.php` |
| Plantilla de factura | `view/melis-commerce-order-invoice/melis-commerce-order-invoice/default-order-invoice-template.phtml` |
| Estructura de BD | `install/dbdeploy/021419_melis_commerce_order_invoice_structure.sql` |
