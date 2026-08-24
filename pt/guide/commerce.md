# Comércio

O `melis-commerce` adiciona ao Melis um domínio completo de **comércio eletrónico**: catálogo, clientes, carrinho, checkout e
encomendas — expostos tanto como **ferramentas de backoffice** como **plugins de front-office**. Esta página serve de mapa para
o orientar; leia o `src/Service/` do módulo para conhecer a API exata e atual.

No **Melis v6** a framework, o módulo e os seus serviços permanecem inalterados — o que mudou foi a
**interface de back-office**: as ferramentas de comércio correm agora como **"bricks" React** nativas dentro de `/melis-react`
(consulte [Criar uma ferramenta](/pt/guide/create-a-tool)). Cada ferramenta mantém um seletor **Novo / Antigo** por ferramenta, para que possa
recuar para o ecrã clássico num iframe, e o [Assistente de IA](/pt/guide/ai) flutuante global está
disponível em todas as ferramentas.

## Modelo de domínio

Os principais conceitos (entidades em `melis-commerce/src/Entity/`, tabelas prefixadas com `melis_ecom_*`):

| Área | Conceitos | Tabelas (exemplos) |
| --- | --- | --- |
| **Catálogo** | Produto, Variante (SKU vendável), Categoria, Atributo e valores | `melis_ecom_product`, `melis_ecom_variant`, `melis_ecom_category`, `melis_ecom_attribute` |
| **Preços** | Preço por variante/produto × país × moeda × grupo de clientes | `melis_ecom_price`, `melis_ecom_client_groups` |
| **Clientes** | Cliente (conta), Pessoa do cliente, moradas | `melis_ecom_client`, `melis_ecom_client_person` |
| **Carrinho** | Cestos anónimos e persistentes | `melis_ecom_basket_anonymous`, `melis_ecom_basket_persistent` |
| **Encomendas** | Encomenda + moradas, pagamento, envio; devoluções | `melis_ecom_order`, `melis_ecom_order_address`, `melis_ecom_order_payment` |
| **Promoções** | Cupões (restritos a produto/cliente) | `melis_ecom_coupon`, `melis_ecom_coupon_product` |
| **Localização** | País, Moeda | `melis_ecom_country`, `melis_ecom_currency` |
| **Multimédia** | Documentos (imagens/PDF) | `melis_ecom_document` |

## Serviços que irá utilizar

Todos registados em `melis-commerce/config/module.config.php` (`service_manager.aliases`). Os
principais:

- **Catálogo**: `MelisComProductService`, `MelisComVariantService`, `MelisComCategoryService`,
  `MelisComAttributeService`, `MelisComPriceService`, `MelisComProductSearchService`,
  `MelisComDocumentService`.
- **Carrinho e checkout**: `MelisComBasketService`, `MelisComOrderCheckoutService`,
  `MelisComOrderService`, `MelisComShipmentCostService`, `MelisComPostPaymentService`,
  `MelisComOrderProductReturnService`.
- **Clientes**: `MelisComClientService`, `MelisComAuthenticationService`, `MelisComContactService`,
  `MelisComClientGroupsService`.
- **Configuração**: `MelisComCouponService`, `MelisComCurrencyService`, `MelisComSeoService`.

```php
$products = $sm->get('MelisComProductService');
$orders   = $sm->get('MelisComOrderService');
```

Cada serviço assenta sobre uma camada de dados `MelisEcom*Table` (por exemplo, `MelisEcomProductTable` →
`melis_ecom_product`). O back-office React **não** reimplementa nada disto: os seus
endpoints `/melis/react-api/…` limitam-se a validar a entrada e a formatar JSON, chamando depois esses mesmos serviços.

## No backoffice

O MelisCommerce regista uma secção **MelisCommerce** na barra lateral do `/melis-react` com **13 ferramentas
React** que cobrem todo o domínio: **Accounts**, **Contacts**, **Catalogs**, **Products**,
**Orders**, **Coupons**, **Attributes**, **Countries**, **Commerce languages**, **Currencies**,
**Order status**, **Client's groups** e **Commerce settings**. Cada uma é uma página React real (sem
iframe na vista "New" predefinida) que abre na sua própria rota; as ferramentas de "entidade" abrem um registo como
**sub-separador** persistente, para que possa regressar à lista sem perder o seu lugar. Cada ferramenta possui
um seletor **New / Old** — "Old" mostra a ferramenta clássica num iframe para que possa comparar.

![A secção MelisCommerce na barra lateral do /melis-react — o seletor de ferramentas.](/screenshots/react/melis-commerce/meliscommerce-menu-tools-selector.png)

Um fluxo de trabalho típico: construir o **catálogo** (Attributes → Catalogs → Products/Variants), gerir os
**clientes** (Accounts + Contacts) e, depois, executar o pipeline de **encomendas** (Orders + cupões), tudo apoiado
pelas listas de referência do comércio (Countries, Currencies, Order status, Client's groups, Settings).

- **Catálogo** — a ferramenta **Catalogs** é uma **árvore** de categorias (arraste para reordenar; Properties / SEO /
  Products por nó). **Products** lista os produtos (pesquisa, duplicação, exportação); o editor tem
  os separadores **Properties**, **Text**, **Variants**, **SEO** e **Prices**, com um editor rico por variante
  (preços, stocks, SEO, associações, multimédia). **Attributes** gere características tipadas
  (Properties / Labels / Values).

  ![A lista de Products (React).](/screenshots/react/melis-commerce/meliscommerce-tools-products-list.png)

  ![Editor de produto — separador Variants.](/screenshots/react/melis-commerce/meliscommerce-tools-products-edit-tab-variants.png)

- **Clientes** — os **Accounts** são clientes B2B (Properties, Company, Contacts, Addresses, Orders,
  Files), com pesquisa, filtros, gestor de colunas, exportação e **importação** por CSV. Os **Contacts** são as
  pessoas individuais (Information / Address / Association), associadas a uma ou mais contas.

  ![A lista de Accounts (React).](/screenshots/react/melis-commerce/meliscommerce-tools-accounts-list.png)

- **Encomendas** — a ferramenta **Orders** lista as encomendas (filtros, filtros de estado, exportação). O editor
  por encomenda tem os separadores **Properties**, **Basket**, **Addresses**, **Payment**, **Shipping**, **Messages** e
  **Returns** (mais **Invoices** quando a faturação está ativa — ver abaixo). **New Order** abre um
  **assistente de checkout guiado em 7 passos** (contacto → conta → produtos → moradas → resumo → pagamento →
  confirmação) apoiado por uma sessão do lado do servidor que retoma onde ficou.

  ![A lista de Orders (React).](/screenshots/react/melis-commerce/meliscommerce-tools-order-list.png)

  ![Assistente de checkout New Order.](/screenshots/react/melis-commerce/meliscommerce-tools-order-newordertunnel-1.png)

- **Referência e configuração** — **Coupons** (Properties, Assign account, Assign product, Orders de utilização),
  **Countries**, **Commerce languages**, **Currencies** (com uma ação *set default*), **Order
  status** (estado + cor + rótulos por idioma), **Client's groups** e uma única página **Commerce
  settings** (Properties + Accounts).

Para a referência completa, separador a separador, de cada ferramenta (rotas, capacidades, endpoints `react-api`), consulte a
[referência do módulo melis-commerce](/pt/reference/modules/melis-commerce).

## No front office

O comércio disponibiliza um vasto conjunto de **plugins de templating** (basta colocá-los nas páginas — consulte
[Plugins](/pt/guide/plugins)) que cobrem toda a montra de loja:

- **Catálogo**: `MelisCommerceProductShowPlugin`, `MelisCommerceProductListPlugin`,
  `MelisCommerceProductSearchPlugin`, `MelisCommerceCategoryProductListPlugin`,
  `MelisCommerceRelatedProductsPlugin`.
- **Conta**: `MelisCommerceLoginPlugin`, `MelisCommerceRegisterPlugin`,
  `MelisCommerceAccountPlugin`, `MelisCommerceProfilePlugin`, plugins de morada de entrega/faturação.
- **Carrinho e checkout**: `MelisCommerceAddToCartPlugin`, `MelisCommerceCartPlugin`,
  `MelisCommerceCheckoutPlugin` (+ passos de carrinho / cupão / moradas / resumo / confirmação).
- **Encomendas**: `MelisCommerceOrderHistoryPlugin`, `MelisCommerceOrderPlugin`,
  `MelisCommerceOrderReturnProductPlugin`.

…além de widgets de dashboard (contagem de encomendas, receita de vendas, mensagens de encomendas).

Uma montra de loja é, portanto, montada sobretudo **colocando estes plugins** em páginas do CMS e estilizando-os
nas vistas do módulo do seu site. A mudança para o back-office React **não** afeta o front office:
os plugins da montra de loja e as suas vistas permanecem inalterados.

## Faturação

O `melis-commerce-order-invoice` estende o comércio com **geração de faturas em PDF** (através do
Spipu/Html2Pdf): um serviço de faturas + tabela (`melis_ecom_order_invoice`) e listeners que geram
faturas a partir dos dados da encomenda. No back-office React **não tem ferramenta própria** — é uma
**brick de extensão** que injeta duas peças na ferramenta **Orders** quando o módulo está ativo:

- um separador **Invoices** no editor de encomenda — listar faturas, **Regenerate Invoice** e transferir qualquer
  fatura listada;
- um botão de **download** por linha na lista de Orders que obtém o PDF da fatura mais recente da encomenda.

Se não os vir, verifique se o `melis-commerce-order-invoice` está ativo e se o seu papel tem o
direito **Invoices** de Orders. Consulte a
[referência do módulo melis-commerce-order-invoice](/pt/reference/modules/melis-commerce-order-invoice).

## Ficheiros-chave

| Assunto | Caminho |
| --- | --- |
| Serviços | `vendor/melisplatform/melis-commerce/src/Service/` |
| Entidades | `vendor/melisplatform/melis-commerce/src/Entity/` |
| Esquema | `vendor/melisplatform/melis-commerce/install/sql/setup_structure.sql` |
| Plugins de front | `vendor/melisplatform/melis-commerce/src/Controller/Plugin/` |
| Bricks e API React | `vendor/melisplatform/melis-commerce/ui-react/`, `config/react-api.php`, `src/Controller/ReactApi/` |
| Faturação | `vendor/melisplatform/melis-commerce-order-invoice/` |
