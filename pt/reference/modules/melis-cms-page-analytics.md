# MelisCmsPageAnalytics

> Análise básica de visitas a páginas para sites CMS — regista visualizações de páginas e permite a um
> site integrar um fornecedor de análise externo (por exemplo, o Google Analytics), agora conduzido a
> partir de um back-office React nativo.
> Pacote `melisplatform/melis-cms-page-analytics`.

## Objetivo

`MelisCmsPageAnalytics` é o rastreador de visualizações de páginas integrado na plataforma. Em cada
renderização de página no front-office regista uma visita sem duplicados (uma vez por sessão, por
página, por dia) em `melis_cms_page_analytics`, e disponibiliza os dados no back-office sob a forma de
uma ferramenta de site **Page Analytics** e de um separador **Page Analytics** em cada página CMS. Por
site pode ainda guardar uma chave de fornecedor de análise e um trecho JavaScript que o módulo injeta
no `<head>` da página no momento da renderização — o gancho utilizado por fornecedores adicionais como
o Google Analytics.

Na v6, o back-office é um **brick totalmente React nativo**: uma tabela de visitas só de leitura mais um
painel de definições, que invoca uma camada JSON `react-api`. O rastreio, o contrato do fornecedor e a
persistência das definições permanecem inalterados — a v6 substitui apenas a camada de apresentação.

## Ativá-lo

Adicione a `config/melis.module.load.php`:

```php
return [
    'MelisCmsPageAnalytics',
];
```

Dependências Composer obrigatórias: `melisplatform/melis-core` e `melisplatform/melis-cms`. O módulo
também depende dos serviços `melis-engine` e `melis-front` em tempo de execução (árvore, tabelas de
páginas, eventos de despacho do front). As tabelas de base de dados são instaladas através do
`MelisSetupController` a partir de `install/sql/`. O brick React só aparece no menu enquanto o módulo
estiver listado em `melis.module.load.php` (descoberta modular de bricks).

## Serviços principais

Registados como aliases de `service_manager` em `config/module.config.php`:

| Alias de serviço | Papel |
| --- | --- |
| `MelisCmsPageAnalyticsService` | Serviço principal que implementa o contrato do fornecedor. `getAnalytics($siteId)` lê a chave do fornecedor ativo de `melis_cms_page_analytics_data` e a linha de definições correspondente de `melis_cms_page_analytics_data_settings`. |
| `MelisCmsDefaultPageAnalyticsService` | Registador integrado. `saveAnalyticsData($pageId)` resolve o site, confirma que a página está ativa/publicada e insere uma linha sem duplicados em `melis_cms_page_analytics` — a menos que estejam configurados um view id e um token do Google Analytics, caso em que o contador integrado se retira. |
| `MelisCmsPageAnalyticsTable` | Gateway de tabela para o registo de visitas. |
| `MelisCmsPageAnalyticsDataTable` | Gateway de tabela para a seleção de fornecedor por site. |
| `MelisCmsPageAnalyticsDataSettingsTable` | Gateway de tabela para as definições por (site, fornecedor). |

Ambos os serviços principais disparam eventos de início/fim: `melis_cms_default_page_analytics_save_start` /
`melis_cms_default_page_analytics_save_end`.

## Front-office

Não existe nenhum view helper nem plugin de templating. O rastreio e a injeção de script são geridos
pelo `MelisCmsPageAnalyticsListener` (registado em `Module.php`), que se liga a dois eventos no pipeline
de renderização do front:

| Evento | Prioridade | Ação |
| --- | --- | --- |
| `melisfront_site_dispatch_ready` | `-10000` | Apenas renderizações do front — invoca `MelisCmsDefaultPageAnalyticsService::saveAnalyticsData($pageId)` para registar a visita sem duplicados. |
| `melis_front_layout` | por omissão | Lê o trecho `pads_js_analytics` configurado para o site e injeta-o antes de `</head>` no HTML renderizado. |

## Tabelas de base de dados

| Tabela | PK | Contém |
| --- | --- | --- |
| `melis_cms_page_analytics` | `ph_id` | Registo de visitas (visitas sem duplicados): `ph_page_id`, `ph_session_id`, `ph_date_visit`, `ph_site_id`. Nenhum endereço IP é armazenado. |
| `melis_cms_page_analytics_data` | `pad_id` | Seleção de fornecedor por site: `pad_site_id`, `pad_analytics_key`. |
| `melis_cms_page_analytics_data_settings` | `pads_id` | Definições por (site, fornecedor): `pads_site_id`, `pads_analytics_key`, `pads_js_analytics`, `pads_settings` (por exemplo, `google_analytics_view_id`). |

## Back-office React

A ferramenta é um **brick totalmente React nativo** com um alternador **New / Old** que pode recuar para
a ferramenta legada num iframe. Reside na barra lateral em **Marketing / Site Tools → Page Analytics** e
abre com dois separadores internos, **Analytics** e **Settings**.

| Propriedade do brick | Valor |
| --- | --- |
| Id do brick | `pageanalytics` |
| `route` do manifesto | `/melis-marketing/meliscms-page-analytics` |
| `forwardKey` | `MelisCmsPageAnalytics/MelisCmsPageAnalyticsTool` |
| `melisKey` (alvo do iframe da vista Old) | `meliscms_page_analytics_display` |
| Nó de guarda de acesso (controlador) | `meliscms_page_analytics_tools_section` |
| Base da API | `/melis/react-api/page-analytics` |

- **Separador Analytics** — uma tabela só de leitura de visitas **agregadas por página** (id da página,
  nome da página, contagem de visitas, última visita) com cartões de KPI (visitas / páginas / sites /
  última visita), um filtro por site, pesquisa, um gestor de colunas, deslocamento infinito, ordenação
  do lado do servidor e **Export**. As páginas eliminadas mostram uma etiqueta em itálico *(deleted)*.
  Se o site selecionado tiver atribuído um fornecedor de terceiros que inclua a sua própria apresentação
  React, o separador aloja o **painel desse módulo** em vez da tabela integrada.
- **Separador Settings** — escolha um **Site** e depois um **Analytics module** (a opção integrada "no
  analytics" mais todos os fornecedores ativos). Os campos próprios do módulo escolhido são renderizados
  de forma orientada por dados (text / textarea / select / password / file, por exemplo uma chave privada
  do Google Analytics). Os administradores da plataforma também podem editar o trecho JS `<head>`
  personalizado; os não administradores veem-no só de leitura.

> Ainda não estão disponíveis capturas de ecrã React destes ecrãs.

## API React

As rotas são definidas em `config/react-api.php` e fundidas na configuração do módulo. O contrato é
`{ success, data, error }`; cada pedido envia `X-Requested-With: XMLHttpRequest` e
`credentials: 'include'`. Dois controladores suportam a interface: `MelisReactApiPageAnalyticsController` (a
ferramenta) e `MelisReactApiPageAnalyticsTabController` (o separador do editor de páginas CMS).

| Método e URL | Objetivo |
| --- | --- |
| `GET /melis/react-api/page-analytics` | Visitas agregadas por página (keyset: `limit`, `search`, `site`, `sort`, `dir`, `after`) → `{items,total,nextCursor}`, cada item `{pageId,pageName,count,lastVisit}`. |
| `GET /melis/react-api/page-analytics/stats` | KPI `{hits, pages, sites, lastVisit}` (respeita `search`/`site`). |
| `GET /melis/react-api/page-analytics/sites` | Opções de site `{sites:[{id,name}]}` para o seletor. |
| `GET /melis/react-api/page-analytics/settings` | Estado do separador Settings (lista de módulos + esquema de formulário orientado por dados + valores atuais). |
| `GET /melis/react-api/cms-page/analytics` | Visitas de uma página (`idPage`, `page`, `perPage`) → `{visits, sessions, lastVisit, recent, page, perPage, recentTotal}`. |

O controlador da ferramenta lê as tabelas diretamente através de SQL parametrizado
(`melis_cms_page_analytics` unida a `melis_cms_page_published` para os nomes e a `melis_cms_site` para o
seletor, cursor keyset opaco). Guarda o acesso no nó portador de direitos
`meliscms_page_analytics_tools_section` — **não** no `melisKey` do manifesto
(`meliscms_page_analytics_display`), que é apenas a chave de zona do iframe da vista Old.

**A gravação de definições não é uma rota react-api** — o painel Settings envia por POST um payload
`FormData` para a ação da ferramenta legada, de modo a reutilizar textualmente toda a lógica do lado do
servidor (validação Laminas, carregamento da chave GA, serialização de `pads_settings`, guarda de admin
sobre o JS em bruto, flash messenger):

```ts
const LEGACY_SAVE_URL = '/melis/MelisCmsPageAnalytics/MelisCmsPageAnalyticsTool/save'
await fetch(LEGACY_SAVE_URL, {
  method: 'POST',
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
  credentials: 'include',
  body: formData,
}) // → { success, textTitle, textMessage, errors }
```

## Separador de página CMS e capacidades

O módulo contribui com um separador **Page Analytics** ao editor de páginas CMS, suportado por
`GET /melis/react-api/cms-page/analytics` (total de visitas, sessões distintas, última visita e uma lista
paginada de datas de visitas recentes para essa página). O separador é declarado em
`config/react.capabilities.php` sob o nó partilhado `meliscms_page`, e a chave
`meliscms_page_analytics_tab` **é** a string de capacidade utilizada para o controlar em Users → Rights:

```php
'melisReactToolCapabilities' => [
  'meliscms_page' => [
    'tabs' => [
      ['key' => 'meliscms_page_analytics_tab', 'label' => 'tr_melis_cms_page_analytics_title'],
    ],
  ],
],
```

## Apresentação modular ao nível do site

Quando um site tem atribuído um módulo de análise de terceiros que declara uma apresentação React (por
exemplo, o **MelisCmsGoogleAnalytics** via `react_display_key`), o separador Analytics aloja a
apresentação React própria desse módulo em vez da tabela de visitas nativa. O brick consome um registo
global, `window.__melisAnalyticsSiteDisplays[<analyticsKey>]`; volta a verificar no evento de janela
`melis:analytics-site-display-registered` (os bundles carregam de forma assíncrona) e, se nada estiver
registado, recua para um iframe `/melis/react-tool-page?key=<displayKey>&siteId=<site>`.

## Exemplo

```php
// Lê a configuração do fornecedor de análise ativo para um site
$analytics = $serviceManager->get('MelisCmsPageAnalyticsService')->getAnalytics($siteId);

// Lê as visitas registadas para uma página específica (usado pelo separador Page Analytics)
$visits = $serviceManager->get('MelisCmsPageAnalyticsTable')->getDataByPageId($pageId);
```

O registo de visitas acontece automaticamente na renderização do front através do listener; normalmente
não é necessário invocar `saveAnalyticsData()` diretamente.

## Ficheiros principais

| Aspeto | Caminho |
| --- | --- |
| Bootstrap do módulo / registo do listener | `vendor/melisplatform/melis-cms-page-analytics/src/Module.php` |
| Rotas, serviços, aliases de tabelas, controladores | `vendor/melisplatform/melis-cms-page-analytics/config/module.config.php` |
| Rotas da API React | `vendor/melisplatform/melis-cms-page-analytics/config/react-api.php` |
| Capacidade do separador React | `vendor/melisplatform/melis-cms-page-analytics/config/react.capabilities.php` |
| Brick React + manifesto | `vendor/melisplatform/melis-cms-page-analytics/public/ui-react/` |
| Fontes React | `vendor/melisplatform/melis-cms-page-analytics/ui-react/src/` |
| Controladores da API React | `vendor/melisplatform/melis-cms-page-analytics/src/Controller/MelisReactApiPageAnalyticsController.php`, `MelisReactApiPageAnalyticsTabController.php` |
| Contrato do fornecedor | `vendor/melisplatform/melis-cms-page-analytics/src/Service/MelisCmsPageAnalyticsServiceInterface.php` |
| Serviço de análise principal | `vendor/melisplatform/melis-cms-page-analytics/src/Service/MelisCmsPageAnalyticsService.php` |
| Registador integrado | `vendor/melisplatform/melis-cms-page-analytics/src/Service/MelisCmsDefaultPageAnalyticsService.php` |
| Listener do front (rastrear + injetar) | `vendor/melisplatform/melis-cms-page-analytics/src/Listener/MelisCmsPageAnalyticsListener.php` |
| Gateways de tabelas | `vendor/melisplatform/melis-cms-page-analytics/src/Model/Tables/` |
| SQL de instalação da BD | `vendor/melisplatform/melis-cms-page-analytics/install/sql/` |

Ver também: [melis-cms](/pt/reference/modules/melis-cms), [melis-core](/pt/reference/modules/melis-core)
