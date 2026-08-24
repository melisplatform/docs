# MelisCmsGoogleAnalytics

> Fornecedor de Google Analytics 4 (GA4) que transforma a propriedade GA4 configurada de um site em curvas de sessões, totais de KPI e dados demográficos dentro do back-office React da Melis. Pacote `melisplatform/melis-cms-google-analytics`.

## Objetivo

O MelisCmsGoogleAnalytics lê a propriedade GA4 de um site do lado do servidor (através de `google/apiclient` +
`google/analytics-data`) e apresenta-a como gráficos no back-office React. É um fornecedor
**apenas de apresentação**: ativar o GA para um site — escolher o fornecedor, introduzir o **Property ID** e
carregar o **JSON da chave privada** da conta de serviço — é feito na ferramenta **Site analytics**, propriedade de
`melis-cms-page-analytics`, e não por este módulo.

O módulo disponibiliza **duas superfícies suportadas por um único componente de dashboard**:

- Um **separador Google Analytics** no editor de páginas do CMS em React, mostrando estatísticas do GA **para a página aberta**
  (filtradas pelo caminho da página).
- Uma **apresentação nativa em React ao nível do site** injetada na ferramenta **Site analytics**, mostrando estatísticas do GA
  **para todo o site** quando o *módulo de Analytics* desse site está definido como Google Analytics.

![Separador Google Analytics no editor de páginas do CMS em React — curva de sessões, cartões de KPI e dados demográficos de Idioma/País/Cidade para a página aberta](/screenshots/react/melis-cms-google-analytics/meliscmsgoogleanalytics-pageedition-tab-googleanalytics.png)

![Apresentação do Google Analytics ao nível do site na ferramenta Site analytics — o mesmo dashboard GA4 delimitado a todo o site](/screenshots/react/melis-cms-google-analytics/meliscmsgoogleanalytics-tool-tab-analytics.png)

## Ativação

O módulo é descoberto pelo host React no arranque através de `GET /melis/react-api/react-modules`, que
lista os módulos ativos que disponibilizam um `brick.manifest.json`. Desativar o módulo remove ambas as superfícies.

Dependências Composer: `google/apiclient ^2.15`, `google/analytics-data ^0.16.0`, `melis-core`,
`melis-cms`, `melis-cms-page-analytics`.

## O brick React

Este é um **brick de SEPARADOR do editor de páginas** (apenas widget): não tem **ferramenta no menu esquerdo**, **não tem rota** e
**não tem `react-api.php`**. O manifesto tem a forma multi-brick com uma única entrada só com id, pelo que o
host carrega o bundle no arranque e o brick regista-se cedo por si próprio.

```json
{ "entry": "brick.js", "bricks": [ { "id": "cms-google-analytics" } ] }
```

O `brick.tsx` não chama `__melisRegisterBrick`; em vez disso, efetua dois registos em
tempo de avaliação do módulo:

```tsx
// 1) Contribute a tab to the CMS page editor (owned by the CmsPage brick).
registerPageTab('melis_cms_google_analytics_page_tab', GoogleAnalyticsPageTab)

// 2) Register the native site-level display for the PageAnalytics host to mount by key.
;(window.__melisAnalyticsSiteDisplays ||= {})['melis_cms_google_analytics'] = GoogleAnalyticsSiteDisplay
window.dispatchEvent(new CustomEvent('melis:analytics-site-display-registered'))
```

| Componente | Função |
| --- | --- |
| `brick.tsx` | Apenas registo — adiciona o separador da página e a apresentação do site; sem brick com rota. |
| `GoogleAnalyticsPage.tsx` (`GoogleAnalyticsPageTab`) | Separador do editor de páginas. Recebe `{ idPage }`, resolve o site + caminho da página via `getPageContext` e depois monta o dashboard com `siteId` + `pagePath`. |
| `GoogleAnalyticsSiteDisplay.tsx` | O dashboard: seletor de intervalo de datas, gráfico de sessões SVG inline, cartões de KPI, três tabelas de dados demográficos. Reutilizado por ambas as superfícies (`pagePath` presente ⇒ delimitado à página, ausente ⇒ todo o site). |

Como o React é externalizado para globais do host, o bundle não pode importar módulos do host, daí os
**estilos inline**, a **i18n `{fr,en}` no próprio ficheiro** (a partir de `document.documentElement.lang`) e um
**gráfico SVG desenhado à mão** (sem biblioteca de gráficos). O SDK da Google nunca é usado do lado do cliente.

## O dashboard

Ambas as superfícies apresentam o mesmo dashboard:

- **Controlo de intervalo de datas** — **7 days** / **30 days** / **Custom** (seletores de data inicial e final +
  **Apply**) e um botão **refresh**. A data final assume por predefinição o dia de hoje (dados intraday do GA4 incluídos).
- **Sessões ao longo do período** — um gráfico de linhas/área das sessões por dia.
- **Cartões de KPI** — Sessões, Utilizadores, Visualizações de página, Páginas/Sessão, Duração Média da Sessão, Taxa de Rejeição.
- **Dados demográficos** — três tabelas (Idioma, País, Cidade), cada uma ordenada por sessões com uma % de quota.

Se o GA não estiver configurado para o site ou se a API falhar, é mostrada uma caixa de erro vermelha com a mensagem do backend
(por exemplo, "GA settings incomplete") em vez dos gráficos.

**Como encontrá-lo:** por página → **MelisCms** → abrir uma página → separador **Google Analytics**. Por site →
**MelisMarketing** → **Site analytics** → escolher o site → sub-separador **Analytics**. O GA é ativado para
um site em **Site analytics → Settings** (módulo de Analytics = Google Analytics, Property ID, carregamento do JSON da chave
privada, script de analytics personalizado opcional).

![Sub-separador Settings do Site analytics — módulo de Analytics definido como Google Analytics, Property ID, carregamento do JSON da chave privada e script de analytics personalizado](/screenshots/react/melis-cms-google-analytics/meliscmsgoogleanalytics-tool-tab-settings.png)

## Endpoints de dados

O módulo **não tem `config/react-api.php`**. A UI React chama o já existente
`GoogleAnalyticsController` (rota `application-MelisCmsGoogleAnalytics/default`, `ViewJsonStrategy`).

| Método e URL | Ação | Objetivo |
| --- | --- | --- |
| `GET /melis/MelisCmsGoogleAnalytics/GoogleAnalytics/getPageContext?idPage=<id>` | `getPageContextAction` | Resolve o site proprietário de uma página + caminho → `{ success, siteId, pagePath, pageURL }`. |
| `POST /melis/MelisCmsGoogleAnalytics/GoogleAnalytics/getChartData` | `getChartDataAction` | Obtém dados GA4 para um site (opcionalmente um caminho de página) → `{ success, chartData, errors }`. |

O corpo de `getChartData` é codificado como formulário:

```ts
const body = new URLSearchParams()
body.set('siteId', String(siteId))
body.set('dateRange[option]', option)          // '7days' | '30days' | 'custom'
body.set('dateRange[startDate]', startDate)    // '7daysAgo' | '30daysAgo' | 'YYYY-MM-DD'
body.set('dateRange[endDate]', endDate)        // 'today' | 'YYYY-MM-DD'
body.set('dateRange[clientTimestamp]', String(Date.now()))
if (pagePath) body.set('pagePath', pagePath)   // page tab only → GA4 dimensionFilter on pagePath
```

Forma de `chartData` consumida pela UI:

- `chartData.date.totals{}` → valores de KPI (`sessions`, `activeUsers`, `screenPageViews`,
  `screenPageViewsPerSession`, `averageSessionDuration`, `bounceRate`).
- `chartData.date.plot{ <tsSeconds>: { sessions } }` → a curva de sessões (as chaves são segundos).
- `chartData.language / .country / .city` → as tabelas de dados demográficos (`{ value: { sessions } }`).

Do lado do servidor, `getChartDataAction` chama os serviços GA4 (`GoogleAnalytics4APIService` /
`MelisCmsGoogleAnalyticsService`, com alias em `module.config.php`), que usam o Property ID do site
e o JSON da chave privada e normalizam as linhas GA4 em `chartData`. Numa falha da API, a ação devolve um
`{ success:false, errors }` limpo em vez de um 500.

## Capacidades

Declaradas em `config/react.capabilities.php` e fundidas por `Module::getConfig()`. Como o módulo
contribui com um separador para a ferramenta de páginas do CMS, declara a sua capacidade sob o nó partilhado
portador de direitos **`meliscms_page`** (um `ArrayUtils::merge` integra os `tabs[]` nas capacidades da ferramenta de páginas do CMS):

```php
return [
  'melisReactToolCapabilities' => [
    'meliscms_page' => [
      'tabs' => [
        ['key' => 'melis_cms_google_analytics_page_tab', 'label' => 'tr_melis_cms_google_analytics'],
      ],
    ],
  ],
];
```

- A `key` **deve ser igual** à chave passada a `window.__melisRegisterPageTab` no `brick.tsx` — *é* a
  capacidade do separador. Sem ela, a whitelist de capacidades da página do CMS oculta o botão do separador, mesmo para um administrador.
- **Não há capacidade de backend** a declarar: o módulo não expõe nenhuma ação `react-api`. O acesso é
  controlado pelo acesso ao editor de páginas do CMS (separador da página) e à ferramenta Site analytics (apresentação do site).

## Integração com o host

- **Ponte do separador de página (`__melisRegisterPageTab`)** — fornecida pelo brick CmsPage. Ambos os bricks partilham
  uma proteção idempotente: quem carregar primeiro cria `window.__melisPageTabRegistry` e define o
  registador. O CmsPage lê `tabs['melis_cms_google_analytics_page_tab']` e apresenta o componente
  com `{ idPage }`; o botão só aparece se a capacidade estiver concedida.
- **Ponte de apresentação do site (`__melisAnalyticsSiteDisplays`)** — fornecida/consumida pela
  ferramenta *Site analytics* do `melis-cms-page-analytics`. O brick regista o seu componente sob a chave
  `melis_cms_google_analytics` (correspondente ao `pad_analytics_key` armazenado do site) e dispara
  `melis:analytics-site-display-registered`. O host monta-o (com `{ siteId }`) no sub-separador Analytics
  quando o *módulo de Analytics* do site = Google Analytics — substituindo o antigo iframe por
  React nativo.
- **Os componentes genéricos permanecem no host.** A estrutura do separador do editor de páginas, a ferramenta Site analytics, o seletor
  de site e o formulário Settings pertencem ao MelisCms / MelisCmsPageAnalytics; este módulo apenas preenche
  a apresentação *Google Analytics*.

## Ficheiros-chave

| Área | Caminho |
| --- | --- |
| Rotas / aliases dos serviços GA | `config/module.config.php` |
| Capacidades React (`meliscms_page.tabs[]`) | `config/react.capabilities.php` |
| Controlador (`getPageContextAction`, `getChartDataAction`) | `src/Controller/GoogleAnalyticsController.php` |
| Fonte do brick React (Vite IIFE) | `ui-react/src/brick.tsx`, `GoogleAnalyticsPage.tsx`, `GoogleAnalyticsSiteDisplay.tsx` |
| Brick compilado + manifesto | `public/ui-react/brick.js`, `public/ui-react/brick.manifest.json` |

Ver também: [melis-cms-page-analytics](/pt/reference/modules/melis-cms-page-analytics) ·
[melis-cms](/legacy/reference/modules/melis-cms) ·
[melis-core](/legacy/reference/modules/melis-core)
