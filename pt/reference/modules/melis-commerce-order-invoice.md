# MelisCommerceOrderInvoice

> Adiciona a geração de faturas de encomenda em PDF ao MelisCommerce, apresentada dentro da ferramenta React Orders. Pacote `melisplatform/melis-commerce-order-invoice`.

## Objetivo

O `MelisCommerceOrderInvoice` estende o [MelisCommerce](/pt/guide/commerce) com a faturação de encomendas. Quando uma
encomenda é validada, gera automaticamente uma fatura em PDF (através do `spipu/html2pdf`) e armazena-a na
base de dados. Não fornece **nenhuma ferramenta própria**: no back-office React (`/melis-react`) injeta dois
elementos na ferramenta **MelisCommerce → Orders** — um separador **Invoices** no editor de encomendas (listar,
regenerar, transferir) e um pequeno botão de **transferência** em cada linha da lista de encomendas. O modelo de fatura é
uma vista `.phtml`, totalmente substituível por localidade.

## Ativá-lo

É um módulo Laminas padrão. Adicione-o a `config/melis.module.load.php` (após `MelisCommerce`,
do qual depende):

```php
'MelisCommerce',
'MelisCommerceOrderInvoice',
```

Dependências (de `composer.json`): `melisplatform/melis-commerce` e `spipu/html2pdf`. O módulo
tem `dbdeploy` ativado, pelo que a sua tabela é criada através do delta dbdeploy na instalação.

## Back-office React

O brick deste módulo é um **brick de extensão / injeção no host**: não desenha nenhuma página, nenhuma rota nem
nenhuma entrada na barra lateral. O seu `brick.manifest.json` define `route`, `label`, `forwardKey` e `melisKey` todos como
`null` (apenas `entry: "brick.js"` é real; id do brick `commerce-order-invoice`). No carregamento, o `brick.tsx`
publica dois componentes React numa global do `window` em vez de chamar `__melisRegisterBrick`:

```ts
window.MelisCommerceOrderInvoiceBrick = { OrderRowButton, InvoicesTab }
```

A ferramenta MelisCommerce Orders consome-os **apenas se este módulo estiver ativo** — sonda
`window.MelisCommerceOrderInvoiceBrick` através do seu hook `useExternalBrickComponent(globalName, key)` e
não renderiza nada se a global nunca for definida. Ambos os componentes recebem uma única prop `{ orderId: number }`
e leem `document.documentElement.lang` para as etiquetas FR/EN.

| Componente (`ui-react/src/`) | Onde aparece | Comportamento |
| --- | --- | --- |
| `OrderRowButton` | Lista de encomendas — por linha de encomenda | Obtém o id da fatura mais recente da encomenda; transfere o respetivo PDF ou apresenta um alerta *"No invoice available"* se não existir nenhuma. |
| `InvoicesTab` | Editor de encomendas — separador **Invoices** (apenas encomenda existente) | Lista as faturas (**ID**, **Date**), oferece **Regenerate Invoice** e uma **transferência** por linha. |

O brick é um bundle Vite IIFE (`ui-react/vite.config.ts`, nome `MelisCommerceOrderInvoiceBrickBundle`)
compilado para `public/ui-react/brick.js`; o React e o react-router são externalizados para as globais do host, pelo que o
brick reutiliza a instância React do host.

## Endpoints que o brick invoca

O brick **não tem `config/react-api.php`** — o seu cliente (`invoiceApi.ts`) reproduz as próprias
ações **MVC legadas** do módulo com `credentials: 'same-origin'`, todas sob uma única base:

```ts
export const INVOICE_BASE = '/melis/MelisCommerceOrderInvoice/MelisCommerceOrderInvoice'
```

| Chamada | Ação do controlador | Retorna |
| --- | --- | --- |
| `POST {INVOICE_BASE}/getOrderLatestInvoiceId` (`orderId`) | `getOrderLatestInvoiceIdAction` | JSON `{ latestInvoiceId }` (0 se não existir) |
| `POST {INVOICE_BASE}/getOrderInvoice` (`invoiceId`) | `getOrderInvoiceAction` | Bytes do PDF + um cabeçalho de resposta `fileName` |
| `POST {INVOICE_BASE}/getOrderInvoiceList` (`draw,start,length,orderId`) | `getOrderInvoiceListAction` | JSON de DataTables `{ data: [{ ordin_id, ordin_date_generated }] }` |
| `POST {INVOICE_BASE}/generateOrderInvoice` (`orderId`) | `generateOrderInvoiceAction` | JSON `{ id }` (o id da nova fatura) |

Estes retornam JSON/binário legado em bruto, **não** o envelope react-api `{ success, data, error }`, pelo que o
cliente os normaliza (`fetchOrderInvoiceList` mapeia `ordin_id`/`ordin_date_generated`;
`downloadInvoiceFile` lê o cabeçalho `fileName`). Do lado do servidor, as ações delegam no
`MelisCommerceOrderInvoiceService`, chamando `generateOrderInvoice($orderId, 'orderinvoicetemplate/default')`
para uma regeneração. O módulo também declara duas rotas literais adicionais
(`/CommerceOrderInvoice/getOrderLatestInvoiceId`, `/CommerceOrderInvoice/getInvoice`), mas o brick React
usa a rota de segmento acima.

## Capacidades e controlo de acesso

**Não existe `config/react.capabilities.php`** neste módulo. O controlo de acesso tem duas camadas:

- **Visibilidade da UI** — o host renderiza o botão de linha e o separador apenas se o brick estiver carregado; o
  separador **Invoices** é adicionalmente filtrado pela própria capacidade `invoices` do MelisCommerce, sob a sua
  árvore de capacidades `meliscommerce_order_list_page`.
- **Acesso à API** — apenas a ação de transferência do PDF impõe um direito do lado do servidor:
  `getOrderInvoiceAction` verifica `canAccess('meliscommerce_orders_content_tab_order_invoice')` e
  retorna 403 caso contrário. As ações de listagem/mais-recente/geração exigem apenas uma sessão de BO, pelo que deve tratar a
  visibilidade do separador/botão como sugestões de UI e não como uma fronteira de autorização rígida.

## Serviços principais

Registados como aliases do `service_manager` em `config/module.config.php`:

| Alias do serviço | Função |
| --- | --- |
| `MelisCommerceOrderInvoiceService` | O serviço de faturas (estende `MelisComGeneralService`). Gera, obtém e lista faturas. |
| `MelisCommerceOrderInvoiceTable` | Gateway de tabela sobre `melis_ecom_order_invoice` (estende `MelisEcomGenericTable`). |

Métodos notáveis do `MelisCommerceOrderInvoiceService`:

| Método | Função |
| --- | --- |
| `generateOrderInvoice($orderId, $template)` | Constrói o PDF de uma encomenda e guarda-o; retorna o id da nova fatura. |
| `getOrderInvoiceList($orderId, $start, $limit, $order)` | Lista as faturas de uma encomenda. |
| `getOrderLatestInvoiceId($orderId)` | Id da fatura mais recente de uma encomenda, ou `0` se não existir nenhuma. |
| `getInvoice($invoiceId)` | A linha da fatura pelo id. |
| `getOrderInvoice($invoiceId)` | O blob de PDF em bruto (`ordin_invoice_pdf`) de uma fatura. |
| `generateFileName($dateGenerated, $orderId, $invoiceId)` | Constrói o nome do ficheiro de transferência (`Y/m/d-order-invoice[-suffix].pdf`). |

Cada método dispara os eventos `meliscommerce_order_invoice_*_start` / `_end`. A construção do PDF também dispara
`meliscommerceorderinvoice_pdf_view`, permitindo-lhe substituir o `ViewModel` antes da renderização. O
sufixo do nome do ficheiro vem de `plugins.meliscommerceorderinvoice.data.custom-pdf-file-name` (predefinição
`invoice`) em `config/app.interface.php`.

## Listeners (integração)

O módulo integra-se através de três listeners (anexados em `src/Module.php`) em vez de
plugins de templating front próprios:

| Listener | Escuta | Efeito |
| --- | --- | --- |
| `MelisCommerceOrderInvoiceGenerateInvoiceListener` | `meliscommerce_service_checkout_step2_postpayment_proccess_end` | Numa encomenda bem-sucedida com estado `1`, gera automaticamente a fatura a partir de `orderinvoicetemplate/default`. |
| `MelisCommerceOrderDetailsInvoiceDataListener` | `MelisCommerceOrderPlugin_melistemplating_plugin_generate_view` | Injeta a fatura mais recente (+ URL de transferência) na vista do plugin de detalhes da encomenda. |
| `MelisCommerceOrderHistoryInvoiceDataListener` | `MelisCommerceOrderHistoryPlugin_melistemplating_plugin_generate_view` | Adiciona `invoiceId` a cada linha do plugin de histórico de encomendas. |

É assim que o módulo alimenta os plugins front de conta/encomenda do MelisCommerce; não fornece nenhum
`MelisTemplatingPlugin` próprio (ver [Plugins](/pt/guide/plugins)).

## Tabelas da base de dados

| Tabela | Função |
| --- | --- |
| `melis_ecom_order_invoice` | Uma linha por fatura gerada. Colunas: `ordin_id` (PK), `ordin_user_id`, `ordin_order_id`, `ordin_date_generated`, `ordin_invoice_pdf` (o PDF armazenado como `longblob`). |

## Exemplo

Gerar (ou regenerar) e transferir a fatura mais recente de uma encomenda a partir de um controlador/serviço:

```php
$invoiceSvc = $serviceManager->get('MelisCommerceOrderInvoiceService');

// Generate a fresh invoice from the default template
$invoiceId = $invoiceSvc->generateOrderInvoice($orderId, 'orderinvoicetemplate/default');

// Fetch the latest invoice and its raw PDF
$latestId = $invoiceSvc->getOrderLatestInvoiceId($orderId);
$pdf      = $invoiceSvc->getOrderInvoice($latestId);   // binary PDF contents
```

## Ficheiros principais

| Aspeto | Caminho |
| --- | --- |
| Código-fonte do brick React | `ui-react/src/{brick.tsx, OrderRowButton.tsx, InvoicesTab.tsx, invoiceApi.ts}` |
| Build + manifesto do brick | `public/ui-react/{brick.js, brick.manifest.json}` |
| Serviço de faturas | `src/Service/MelisCommerceOrderInvoiceService.php` |
| Gateway de tabela | `src/Model/Tables/MelisCommerceOrderInvoiceTable.php` |
| Controlador | `src/Controller/MelisCommerceOrderInvoiceController.php` |
| Listeners | `src/Listener/` |
| Módulo / config | `src/Module.php`, `config/module.config.php`, `config/app.interface.php`, `config/app.tools.php` |
| Modelo de fatura | `view/melis-commerce-order-invoice/melis-commerce-order-invoice/default-order-invoice-template.phtml` |
| Estrutura da BD | `install/dbdeploy/021419_melis_commerce_order_invoice_structure.sql` |
