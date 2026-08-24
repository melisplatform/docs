# MelisCommerce

> Framework de e-commerce completa para a MelisPlatform — catálogo, clientes, carrinho/checkout/encomendas, cupões, expedição e SEO — com um back-office React. Pacote `melisplatform/melis-commerce`.

## Objetivo

O MelisCommerce adiciona uma camada de comércio completa a um site Melis: um catálogo (produtos, variantes,
atributos, categorias, preços, stock), um modelo de cliente B2B (contas + contactos), o
pipeline carrinho/checkout/encomenda, cupões, moedas, expedição, devoluções, documentos e SEO. Inclui uma
suite de gestão back-office e uma loja front-office construída a partir de plugins de templating arrastáveis. A
camada de dados usa **59 tabelas `melis_ecom_*`**, **26 serviços**, **10 entidades ricas** e **33
listeners**; o acesso aos dados usa o Eloquent (`illuminate/database` incluído), envolvido por serviços orientados a eventos ao estilo Melis.

No Melis v6 a lógica de negócio mantém-se inalterada; a **camada de apresentação** é um **back-office React**
(`/melis-react`). O MelisCommerce inclui **um único bundle multi-brick** que expõe **13 ferramentas React nativas**,
cada uma suportada por endpoints JSON em `/melis/react-api/…`. Cada ferramenta mantém um seletor **New / Old** por ferramenta
para que possa recuar para o ecrã legacy clássico num iframe.

## Ativação

Adicione a `config/melis.module.load.php`:

```php
return [
    'MelisCommerce',
];
```

Requer o `melisplatform/melis-core`. As tabelas da base de dados são criadas automaticamente pelo MelisDbDeploy
(deltas em `install/dbdeploy/`); o módulo é proposto pelo instalador Melis como componente opcional. As ferramentas React aparecem no back-office apenas quando o MelisCommerce está ativo (descoberta via
`GET /melis/react-api/react-modules`).

## O back-office React — um bundle, treze ferramentas

O bundle (`public/ui-react/brick.js` + `brick.manifest.json`) declara 13 ferramentas que se autorregistam
em `brick.tsx`. Todas são nativamente full-React; cada uma renderiza um `ViewModeToggle` + `LegacyFrame` partilhados, pelo que
*Old* monta a ferramenta clássica num iframe (`/melis/react-tool-page?key=<melisKey>`). As sete
ferramentas de "entidade" definem `subTabs: true` (abrir um registo adiciona um sub-separador); todas as 13 são `persistent`.

![A secção MelisCommerce na barra lateral React — as 13 ferramentas de comércio](/screenshots/react/melis-commerce/meliscommerce-menu-tools-selector.png)

| ID do brick | Rota | Etiqueta | melisKey |
| --- | --- | --- | --- |
| `commerce-accounts` | `/melis-commerce/clients-list` | Accounts | `meliscommerce_clients_list_page` |
| `commerce-contacts` | `/melis-commerce/contact-list` | Contacts | `meliscommerce_contact_list_page` |
| `commerce-catalog` | `/melis-commerce/categories` | Catalogs | `meliscommerce_categories_page` |
| `commerce-products` | `/melis-commerce/product-list` | Products | `meliscommerce_product_list_container` |
| `commerce-orders` | `/melis-commerce/order-list` | Orders | `meliscommerce_order_list_page` |
| `commerce-coupons` | `/melis-commerce/coupon-list` | Coupons | `meliscommerce_coupon_list_page` |
| `commerce-attributes` | `/melis-commerce/attribute-list` | Attributes | `meliscommerce_attribute_list_page` |
| `commerce-countries` | `/melis-commerce/country-list` | Countries | `meliscommerce_country_list_container` |
| `commerce-languages` | `/melis-commerce/language-list` | Commerce languages | `meliscommerce_language_list_container` |
| `commerce-currencies` | `/melis-commerce/currency-lists` | Currencies | `meliscommerce_currency_conf` |
| `commerce-order-status` | `/melis-commerce/order-status-lists` | Order status | `meliscommerce_order_status_tool_page` |
| `commerce-clients-groups` | `/melis-commerce/clients-group-list` | Client's groups | `meliscommerce_clients_group_tool_container` |
| `commerce-settings` | `/melis-commerce/settings` | Commerce settings | `meliscommerce_settings_page` |

> **Regra prática:** construa o **catálogo** (atributos → catálogos → produtos/variantes), faça a gestão dos
> **clientes** (contas + contactos) e depois execute o pipeline de **encomendas** (encomendas + assistente de checkout +
> cupões), tudo suportado pelas listas de referência de comércio.

## Modelo de objetos

| Conceito | O que é |
| --- | --- |
| **Product** | Um contentor para variantes — não é, ele próprio, uma unidade vendável. |
| **Variant** | A unidade vendável: tem o seu próprio SKU, stock e preço. Um produto sem opções reais tem, ainda assim, uma variante principal. |
| **Attribute** | Uma propriedade filtrável/definidora de variante (por exemplo, Cor, Tamanho) com valores tipados e traduzíveis. Os produtos declaram que atributos usam; cada variante escolhe um valor por atributo. |
| **Price** | Resolvido para um par `(countryId, groupId)` com IVA; recua de forma graciosa (ver [Resolução de preços](#resolucao-de-precos--stock)). |
| **Account** | Uma organização B2B (`melis_ecom_client`); tem um registo de empresa, grupo e moradas. |
| **Contact / Person** | Um indivíduo (`melis_ecom_client_person`) que inicia sessão; pode pertencer a várias contas. |
| **Basket** | Anónimo (indexado por `clientKey`) ou persistente (associado a uma conta); funde-se ao iniciar sessão. |
| **Order** | Criada com o estado `-1` (temporário) durante o checkout; passa a `1` (Nova encomenda) após o pagamento. |

## Contas e contactos

O **Accounts** (`/melis-commerce/clients-list`) faz a gestão de clientes B2B: a lista tem pesquisa,
filtros de estado/grupo, um gestor de colunas, exportação e **importação** CSV. Abrir uma conta é um sub-separador
com os separadores **Properties**, **Company**, **Contacts** (associar/desassociar, definir predefinido), **Addresses**, **Orders**
(histórico) e **Files**.

![A lista Accounts — filtros, gestor de colunas e importação CSV](/screenshots/react/melis-commerce/meliscommerce-tools-accounts-list.png)

![Editor de conta — separador Properties (estado, estratégia de nome, grupo, país, etiquetas)](/screenshots/react/melis-commerce/meliscommerce-tools-accounts-new-tab-properties.png)

![Editor de conta — separador Contacts (associar / desassociar / predefinido)](/screenshots/react/melis-commerce/meliscommerce-tools-accounts-new-tab-contacts.png)

O **Contacts** (`/melis-commerce/contact-list`) faz a gestão de pessoas individuais. O editor tem os separadores
**Information**, **Address** e **Association** (associar/desassociar um contacto a contas, definir o
predefinido). Os contactos são suportados pelo `MelisComContactService`; as contas pelo `MelisComClientService`.

![Editor de contacto — separador Association (associar / desassociar contas)](/screenshots/react/melis-commerce/meliscommerce-tools-contacts-edit-tab-association.png)

## Catálogos, produtos e variantes

O **Catalogs** (`/melis-commerce/categories`) é uma **árvore** de categorias reordenável por arrastar; uma categoria
tem os separadores **Properties**, **SEO** e **Products** (reordenável).

![A árvore de categorias do catálogo (React)](/screenshots/react/melis-commerce/meliscommerce-tools-catalogs-treeview.png)

O **Products** (`/melis-commerce/product-list`) lista os produtos com filtros, duplicação e exportação. O
editor de produto tem os separadores **Properties**, **Text** (por idioma), **Variants**, **SEO** e **Prices**. O separador **Variants** é o mais rico: cada variante tem as suas próprias Properties, SEO, Prices, Stocks
e Associations, além de multimédia.

![A lista Products (React)](/screenshots/react/melis-commerce/meliscommerce-tools-products-list.png)

![Editor de produto — separador Variants (preços, stocks, SEO e associações por variante)](/screenshots/react/melis-commerce/meliscommerce-tools-products-edit-tab-variants.png)

![Editor de produto — separador Prices](/screenshots/react/melis-commerce/meliscommerce-tools-products-edit-tab-prices.png)

O **Attributes** (`/melis-commerce/attribute-list`) faz a gestão de características de produto tipadas: separadores do editor
**Properties** (referência, tipo, estado, visível, pesquisável), **Labels** (por idioma) e
**Values** (valores com traduções tipadas).

![Editor de atributo — separador Values (valores com traduções tipadas)](/screenshots/react/melis-commerce/meliscommerce-tools-attributes-edit-tab-values.png)

## Encomendas e o assistente de checkout

O **Orders** (`/melis-commerce/order-list`) tem filtros de estado e exportação. Os separadores do editor por encomenda
são **Properties**, **Basket** (só leitura), **Addresses**, **Payment** (só leitura), **Shipping**,
**Messages** e **Returns** — mais **Invoices** quando o
[MelisCommerceOrderInvoice](/pt/reference/modules/melis-commerce-order-invoice) está ativo.

![A lista Orders (React)](/screenshots/react/melis-commerce/meliscommerce-tools-order-list.png)

![Editor de encomenda — separador Properties](/screenshots/react/melis-commerce/meliscommerce-tools-order-edit-tab-properties.png)

O **New Order** abre um **assistente de checkout guiado de 7 passos**
(`contact → account → products → addresses → summary → payment → confirmation`), suportado por uma
sessão de checkout do lado do servidor (endpoints em `/orders/checkout/*`) que retoma onde ficou.

![O assistente de checkout New Order — passos de contacto / conta / produtos](/screenshots/react/melis-commerce/meliscommerce-tools-order-newordertunnel-1.png)

![O assistente de checkout — passo de moradas / resumo](/screenshots/react/melis-commerce/meliscommerce-tools-order-newordertunnel-2.png)

## Cupões

O **Coupons** (`/melis-commerce/coupon-list`) faz a gestão de códigos de desconto (% ou valor). Separadores do editor:
**Properties**, **Assign account** (clientes), **Assign product** e **Orders** (histórico de utilização).
Suportado pelo `MelisComCouponService`; o desconto incorporado é, ele próprio, um listener em
`meliscommerce_service_get_item_price_end`.

![Editor de cupão — separador Assign account](/screenshots/react/melis-commerce/meliscommerce-tools-coupons-edit-tab-assignedclients.png)

## Ferramentas de referência de comércio

Pequenas ferramentas ao "estilo de definições" — listas de página única com modais de adicionar/editar ou um único formulário:

| Ferramenta | Rota | Gere |
| --- | --- | --- |
| Countries | `/melis-commerce/country-list` | Lista de países de comércio (adicionar/editar) |
| Commerce languages | `/melis-commerce/language-list` | Idiomas de comércio (lista + modal) |
| Currencies | `/melis-commerce/currency-lists` | Moedas (lista + modal, **definir predefinida**) |
| Order status | `/melis-commerce/order-status-lists` | Estados; o editor tem Properties (cor) + Labels |
| Client's groups | `/melis-commerce/clients-group-list` | Grupos de clientes (lista + modal) |
| Commerce settings | `/melis-commerce/settings` | Página de configuração única — separadores Properties + Accounts |

![A lista Order status (React)](/screenshots/react/melis-commerce/meliscommerce-tools-orderstatus-list.png)

![Commerce settings — separador Properties (limiar de alerta de stock, estratégia de nome de conta)](/screenshots/react/melis-commerce/meliscommerce-tools-settings-tab-properties.png)

As definições de comércio guardam o limiar global de alerta de stock e a estratégia de nome de conta (`sa_type`).

## Serviços principais

Todos os serviços estendem o `MelisComGeneralService` e estão registados em `config/module.config.php`. Cada
método público é envolvido em eventos `meliscommerce_service_*_start` / `*_end` (ver
[Eventos e listeners](#eventos--listeners)). Os controladores React apenas validam a entrada e formatam JSON — o
trabalho real permanece nestes serviços.

| Alias do serviço | Papel |
| --- | --- |
| `MelisComProductService` | `getProductById`, `getProductList` → `MelisProduct` |
| `MelisComVariantService` | `getVariantById`, `getVariantListByProductId`, `getVariantBySKU`, `getMainVariantByProductId` → `MelisVariant` |
| `MelisComCategoryService` | `getCategoryById`, `getCategoryListById(Recursive)` → `MelisCategory` |
| `MelisComAttributeService` | `getAttributeById`, `getAttributes` → `MelisAttribute` |
| `MelisComPriceService` | `getItemPrice($itemId, $countryId, $groupId, $type)` — preço com hierarquia de fallback |
| `MelisComProductSearchService` | Pesquisa de produtos no front-office |
| `MelisComSeoService` | SEO de comércio (URLs / meta para produtos e categorias) |
| `MelisComClientService` | `getClientById`, `getClientList`, `getClientByIdAndClientPerson` → `MelisClient` |
| `MelisComContactService` | Gestão de contactos (pessoas) |
| `MelisComClientGroupsService` | Grupos de clientes (usados para preços específicos por grupo) |
| `MelisComAuthenticationService` | Início de sessão no front-office: `login`, `getClientId`, `getPersonId`, `getClientGroup`, `setClientId`, `logout`, `hasIdentity` |
| `MelisComBasketService` | `getBasket`, `getPersistentBasket`, `getAnonymousBasket`, `addVariantToBasket`, `transferAnonymousBasketToPersistentBasket` → `MelisBasket` |
| `MelisComOrderService` | `getOrderById`, `getOrderList` → `MelisOrder` |
| `MelisComOrderCheckoutService` | Checkout em duas fases: `checkoutStep1_prePayment`, `checkoutStep2_postPayment` |
| `MelisComPostPaymentService` | Registo de transação pós-pagamento |
| `MelisComOrderProductReturnService` | Devoluções de produtos / RMA |
| `MelisComCouponService` | `getCouponById`, `getCouponList` → `MelisCoupon` |
| `MelisComCurrencyService` | Moedas |
| `MelisComShipmentCostService` | Cálculo de custos de expedição |
| `MelisComStockEmailAlertService` | Alertas por e-mail de stock baixo (`VARIANTSLOWSTOCK`) |
| `MelisComDocumentService` | `getDocumentById`, `getDocumentsByRelation` → `MelisDocument` |
| `MelisComDuplicationService` | Duplicar produtos / variantes |
| `MelisComLinksService` | Construtor de links de comércio no front-office |
| `MelisComCacheService` | Cache de comércio (`commerce_big_services`) |
| `MelisComHead` | Helper de head de SEO (`updateTitleAndDescription`) |
| `MelisComGeneralService` | Classe base; helpers: `getTableColumns`, `getEcomLang`, `getFrontPluginLangId` |

## Resolução de preços e stock

O `MelisComPriceService::getItemPrice($itemId, $countryId, $groupId, $type)` percorre uma cadeia de fallback:

1. país específico + grupo específico
2. país específico + grupo geral
3. país geral (`price_country_id = 0`) + grupo específico
4. país geral + grupo geral
5. (para uma variante) recuar para o preço do **produto**

O stock é por **variante e por país** (`melis_ecom_variant_stock`). Quando uma encomenda faz descer o stock abaixo
do limiar, o e-mail `VARIANTSLOWSTOCK` é enviado aos destinatários configurados.

## Pipeline de checkout

Duas fases no `MelisComOrderCheckoutService` (o assistente React aciona a mesma lógica de servidor):

**Fase 1 — `checkoutStep1_prePayment($clientId)`** valida o carrinho e as moradas, calcula todos os
custos e a expedição, gera a referência da encomenda e depois chama o `MelisComOrderService::saveOrder()`.
A encomenda é guardada com `ord_status = -1` (temporário). Dispara
`meliscommerce_service_checkout_step1_prepayment_start/_end` e `…_save_success` (transporta o novo
`orderId`).

**Fase 2 — `checkoutStep2_postPayment()`** é chamada depois de a gateway responder.
O `MelisComPostPaymentService::processPostPayment()` regista a transação em
`melis_ecom_order_payment` e move a encomenda do estado `-1` para um estado real. Dispara
`meliscommerce_service_checkout_step2_postpayment_start/_end`.

**Estados de encomenda:** `-1` temporário · `1` Nova encomenda · `2` Em espera · `3` Expedida · `4` Entregue ·
`5` Cancelada · `6` Erro de pagamento.

## Eventos e listeners

Cada método de serviço emite eventos `meliscommerce_service_*_start` e `*_end`. Os argumentos nomeados
(criados por `makeArrayFromParameters` via reflexão) e a chave `results` viajam com o evento.

- Listener `_start`: alterar as entradas antes de o trabalho ser executado.
- Listener `_end`: alterar `$params['results']` antes de o chamador o ver.

Este é o principal mecanismo de extensão — sem necessidade de subclasses. Os 33 listeners incorporados dividem-se em
quatro famílias:

| Família | Exemplos |
| --- | --- |
| Guardar / validar | `…SaveProductListener`, `…SaveOrderListener`, `…SaveClientListener`, `…ValidateVariantListener` |
| Limpeza em cascata (país/idioma removido) | `…ProductPriceCountryDeletedListener`, `…CategoryCountryLink…`, `…SEOLanguageDeletedListener` |
| Checkout / preços / stock | `…CheckoutCouponListener`, `…CouponProductPriceListener`, `…ShipmentCostListener`, `…PostPaymentListener`, `…VariantCheckLowStockListener` |
| Encaminhamento SEO no front-office | `…SEOReformatToRoutePageUrlListener`, `…SEODispatchRouterCommerceUrlListener`, `…SEOMetaPageListener` |

## API React e capacidades

Todas as rotas são rotas-filhas de `melis-react-api` (fundidas a partir de `config/react-api.php`): **13
controladores invocáveis** em `src/Controller/ReactApi/`, **184 rotas** em `/melis/react-api/…`.
O contrato de resposta em todo o lado é `{ success, data, error? }`; cada ação chama primeiro
`denyUnlessAccess()` (autenticação + `MelisCoreRights::canAccess(<melisKey>)`, 401/403). Cada ferramenta de entidade
expõe grosso modo `GET /<tool>` (lista keyset), `/<tool>/stats`, `/<tool>/options`,
`POST /<tool>/save`, `DELETE /<tool>/delete/:id`, `GET /<tool>/:id`, além de
sub-recursos específicos da ferramenta (por exemplo, o Orders adiciona o assistente completo `/orders/checkout/*`).

> ⚠ Os idiomas de comércio têm o namespace `/commerce-languages` (não `/languages`) porque a ferramenta
> Languages do core já detém `/languages` sob o pai partilhado `melis-react-api`.

O `config/react.capabilities.php` declara uma entrada `melisReactToolCapabilities` por ferramenta, indexada sob
a sua melisKey. Estas são **sugestões de UI declarativas com permissão por omissão** — orientam a árvore de checkboxes de Users → Rights
e permitem ao React mascarar separadores/botões via `useCaps(...)` — mas **ainda não existe um
`denyUnlessCan()` do lado do servidor**; apenas o `denyUnlessAccess()` na melisKey da ferramenta protege a API. Trate as
capacidades como sugestões de UI, não como segurança.

## Front-office

Os plugins de templating estão registados em `config/plugins/{products,categories,clients,orders}/` e
como `controller_plugins` em `module.config.php`. Arraste-os para uma zona de arrastar e largar de uma página CMS.

| Área | Plugins |
| --- | --- |
| Catálogo | `ProductShowPlugin`, `ProductListPlugin`, `ProductSearchPlugin`, `CategoryTreePlugin`, `CategoryProductListPlugin`, `RelatedProductsPlugin`, `AttributesShowPlugin`, `ProductAttributePlugin`, `ProductPriceRangePlugin` |
| Carrinho e checkout | `AddToCartPlugin`, `CartPlugin`, `CheckoutPlugin`, `CheckoutCartPlugin`, `CheckoutAddressesPlugin`, `CheckoutCouponPlugin`, `CheckoutSummaryPlugin`, `CheckoutConfirmSummaryPlugin`, `CheckoutConfirmPlugin` |
| Conta | `LoginPlugin`, `RegisterPlugin`, `AccountPlugin`, `ProfilePlugin`, `BillingAddressPlugin`, `DeliveryAddressPlugin`, `LostPasswordGetEmailPlugin`, `LostPasswordResetPlugin` |
| Encomendas (cliente) | `OrderPlugin`, `OrderHistoryPlugin`, `OrderMessagesPlugin`, `OrderShippingDetailsPlugin`, `OrderReturnProductPlugin`, `OrderAddressPlugin` |

## Tabelas da base de dados

59 tabelas com o prefixo `melis_ecom_*`, agrupadas por subsistema:

| Grupo | Tabelas principais |
| --- | --- |
| Produtos e variantes | `melis_ecom_product`, `melis_ecom_product_text` + `_text_type`, `melis_ecom_product_attribute`, `melis_ecom_product_category`, `melis_ecom_variant`, `melis_ecom_variant_attribute_value`, `melis_ecom_variant_stock`, `melis_ecom_assoc_variant` + `_type` |
| Atributos | `melis_ecom_attribute` + `_trans`, `melis_ecom_attribute_type`, `melis_ecom_attribute_value` + `_value_trans` |
| Categorias e geografia | `melis_ecom_category` + `_trans`, `melis_ecom_country_category`, `melis_ecom_country`, `melis_ecom_lang` |
| Preços e moeda | `melis_ecom_price`, `melis_ecom_currency` |
| Clientes (B2B) | `melis_ecom_client`, `melis_ecom_client_person` + `_person_emails`, `melis_ecom_client_company`, `melis_ecom_client_account_rel`, `melis_ecom_client_person_rel`, `melis_ecom_client_address` + `_address_type`, `melis_ecom_client_groups`, `melis_ecom_civility`, `melis_ecom_settings_account` |
| Carrinhos e encomendas | `melis_ecom_basket_anonymous`, `melis_ecom_basket_persistent`, `melis_ecom_order`, `melis_ecom_order_basket`, `melis_ecom_order_address`, `melis_ecom_order_payment` + `_type`, `melis_ecom_order_shipping`, `melis_ecom_order_message`, `melis_ecom_order_status` + `_trans`, `melis_ecom_order_product_return` + `_details` |
| Cupões | `melis_ecom_coupon` + `_coupon_client` / `_coupon_order` / `_coupon_product` |
| Documentos e SEO | `melis_ecom_document` + `_doc_type` + `_doc_relations`, `melis_ecom_seo`, `melis_ecom_stock_email_alert` |

## Exemplos

**Ler um produto, a sua variante principal e um preço resolvido**

```php
$prdSrv   = $sm->get('MelisComProductService');
$varSrv   = $sm->get('MelisComVariantService');
$priceSrv = $sm->get('MelisComPriceService');

$product = $prdSrv->getProductById($prdId, $langId, $countryId);  // → MelisProduct
$variant = $varSrv->getMainVariantByProductId($prdId, $langId, $countryId);  // → MelisVariant
$price   = $priceSrv->getItemPrice($variant->getId(), $countryId, $groupId, 'variant');
// $price['price'] (net), $price['price_currency'], $price['price_details']
```

**Adicionar ao carrinho e executar o checkout em duas fases**

```php
$basketSrv   = $sm->get('MelisComBasketService');
$checkoutSrv = $sm->get('MelisComOrderCheckoutService');

$basketSrv->addVariantToBasket($variantId, 1, $clientId);
$basketSrv->transferAnonymousBasketToPersistentBasket($clientKey, $clientId);

$step1 = $checkoutSrv->checkoutStep1_prePayment($clientId);  // order at status -1
// $step1['orderId'] — hand to payment gateway
$step2 = $checkoutSrv->checkoutStep2_postPayment();          // records payment, moves off -1
```

**Ligar-se à loja sem subclasses**

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

## Ficheiros principais

| Assunto | Caminho |
| --- | --- |
| Configuração do módulo (serviços, controladores, plugins) | `vendor/melisplatform/melis-commerce/config/module.config.php` |
| Rotas / capacidades da API React | `vendor/melisplatform/melis-commerce/config/react-api.php`, `config/react.capabilities.php` |
| Brick React (fonte / build) | `vendor/melisplatform/melis-commerce/ui-react/src/`, `public/ui-react/{brick.js, brick.manifest.json}` |
| Controladores da API React (13) | `vendor/melisplatform/melis-commerce/src/Controller/ReactApi/` |
| Configuração de plugins do front-office | `vendor/melisplatform/melis-commerce/config/plugins/` |
| Serviços / Entidades (10) / Table gateways (59) | `vendor/melisplatform/melis-commerce/src/Service/`, `src/Entity/`, `src/Model/Tables/` |
| Listeners (33) | `vendor/melisplatform/melis-commerce/src/Listener/` |
| Deltas de BD | `vendor/melisplatform/melis-commerce/install/dbdeploy/` |

Ver também: [Referência de módulos](/pt/reference/modules) · [melis-react-api](/pt/reference/modules/melis-react-api) · [melis-commerce-order-invoice](/pt/reference/modules/melis-commerce-order-invoice) · [melis-core](/legacy/reference/modules/melis-core) · [melis-cms](/pt/reference/modules/melis-cms).
