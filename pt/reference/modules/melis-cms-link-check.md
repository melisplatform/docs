# MelisCmsLinkCheck

> Testador de ligações que percorre uma página (e, opcionalmente, as suas subpáginas ou ligações
> internas) e regista todas as ligações e imagens quebradas, mantendo um registo de análise por página.
> Pacote `melisplatform/melis-cms-link-check`.

## Objetivo

O MelisCmsLinkCheck é o testador de ligações do Melis. Percorre uma página — opcionalmente seguindo
as suas subpáginas ou as suas ligações internas — e regista todas as ligações e imagens quebradas que
encontra, guardando um registo de análise por página analisada. A própria análise (curl, validação,
inserção de registos, traduções) reside do lado do servidor no serviço Laminas
`MelisCmsLinkCheckService::executeTest()`; o back-office React é uma camada de apresentação que lê e
lança análises através dos endpoints react-api do módulo.

No back-office React v6 (`/melis-react`), o módulo fornece um brick nativo totalmente em React com
duas superfícies:

- Uma ferramenta **Testador de ligações** no menu esquerdo — um visualizador só de leitura dos
  resultados de análises anteriores, uma janela modal **Lançar uma análise** e um relatório de erros
  por linha, com um alternador **Novo / Antigo** que recorre à ferramenta clássica numa iframe.
- Um separador **Link Checker** no editor de páginas CMS React que lança e reporta uma análise
  circunscrita à página que está a ser editada.

## Ativá-lo

Adicione a `config/melis.module.load.php`:

```php
return [
    'MelisCmsLinkCheck',
];
```

Ambas as superfícies estão condicionadas à ativação: só aparecem se o módulo estiver ativo, sendo
descobertas pelo host através de `GET /melis/react-api/react-modules` (que lista os módulos ativos que
fornecem um `brick.manifest.json`). Desativar o módulo remove tanto a ferramenta do menu como o
separador do editor de páginas.

## O back-office React num relance

| Item | Valor |
| --- | --- |
| Tipo de brick | Nativo totalmente em React (com um recurso Novo/Antigo em iframe legada) + um separador de editor de páginas |
| ID do brick | `cms-link-check` |
| `route` do manifesto | `/melis-cms-link-check/results` |
| `label` | `Testeur de liens` (Testador de ligações) |
| `forwardKey` | `MelisCmsLinkCheck/MelisCmsLinkCheckList` |
| `melisKey` (menu / iframe da vista Antiga / nó de permissões) | `meliscmslinkcheck_tool` |
| Chave do separador de página (= a sua capacidade) | `meliscmslinkcheck_page_link_check_tab` |
| Base da API | `/melis/react-api/cms-link-check` |
| Controlador react-api | `MelisReactApiLinkCheckController` (invocável `MelisReactApiLinkCheck`) |
| Tabela (própria) | `melis_cms_link_check_logs` |
| Serviço de análise | `MelisCmsLinkCheckService::executeTest(...)` |

## A ferramenta Testador de ligações

Barra lateral esquerda → o nó **Testador de ligações** (*Testeur de liens*) abre a ferramenta como
separador de topo. A vista Nova lista todos os registos de análise da plataforma, uma linha por página
analisada.

![Ferramenta React Testador de ligações a mostrar cartões de KPI, filtros e a lista de resultados](/screenshots/react/melis-cms-link-check/meliscmslinkcheck-tool-linkchecker-list.png)

A lista tem cartões de KPI (Páginas analisadas, Total de erros, Sites), uma caixa de pesquisa
(corresponde ao URL da página, ao id da página, ao nome/rótulo do site), um filtro de site (apenas
sites que têm registos), Repor filtros, um gestor de Colunas (mostrar/ocultar/reordenar colunas,
guardado localmente) e uma Exportação. Clique num cabeçalho de coluna para ordenar (predefinição:
análise mais recente primeiro). As contagens de erros são apresentadas como emblemas — verde quando é
0, vermelho caso contrário (Erros = total, Ligações, Imagens).

Cada linha tem quatro ações:

| Ação | Ícone | Objetivo |
| --- | --- | --- |
| Ver front | olho | Abre o URL da página analisada num novo separador. |
| Editar página | lápis | Abre a página no editor de páginas CMS React e muda para ela. |
| Relatório | documento | Abre a janela modal do relatório de erros por página. |
| Eliminar | lixo | Remove esse registo de análise (necessita da capacidade `delete`). |

O alternador **Novo / Antigo** no canto superior direito alterna toda a ferramenta entre o
visualizador React (predefinição) e a ferramenta clássica renderizada numa iframe
(`/melis/react-tool-page?key=meliscmslinkcheck_tool`), que também pode ser usada para lançar análises
à maneira legada.

## Lançar uma análise

O botão vermelho **Lançar uma análise** (mostrado se tiver a capacidade `launch`) abre uma janela
modal.

![Janela modal Lançar uma análise com seletor de páginas, botões de âmbito e caixas de verificação](/screenshots/react/melis-cms-link-check/meliscmslinkcheck-tool-linkchecker-launchscan.png)

Escolha a página inicial na árvore de páginas CMS de carregamento diferido, escolha um **âmbito** e o
que **verificar**, depois **Executar**. A análise percorre a(s) página(s), regista os resultados,
atualiza a lista e publica uma notificação.

- **Âmbito** — Apenas esta página / Esta página e as suas subpáginas / Esta página e as suas ligações
  internas (enviado como `follow: '1' | '2' | '3'`).
- **Verificar** — Ligações e/ou Imagens (enviado como `options: ['LINK', 'IMG']`).

## Ler o relatório de uma página

A ação **Relatório** numa linha abre os erros detalhados desse registo de análise.

![Janela modal do relatório de erros por página no seu estado limpo](/screenshots/react/melis-cms-link-check/meliscmslinkcheck-tool-linkchecker-report.png)

Uma página limpa mostra "✓ No error recorded for this page." Uma página com erros mostra uma tabela:
**Tipo** (emblema LINK / IMG) · **URL** · **Detalhes** (a falha). O detalhe provém da coluna XML
analisada `lcl_errors`, descodificada numa `errorList` de `{ url, type, details }`.

## Verificar uma página a partir do seu editor

Abra uma página no editor de páginas CMS React e clique no separador **Link Checker**. Mostra a última
análise dessa página (data, emblemas Erros / Ligações / Imagens e a tabela de erros detalhada ou uma
mensagem limpa) com um botão **Reanalisar** — ou **Lançar uma análise** se a página nunca tiver sido
analisada — que executa uma análise apenas para essa página.

![Separador Link Checker no editor de páginas CMS React a mostrar uma análise circunscrita à página](/screenshots/react/melis-cms-link-check/meliscmslinkcheck-pageedition-tab-linkchecker-launchandreport.png)

O separador é contribuído para o editor de páginas CMS através da ponte do host
`window.__melisRegisterPageTab` (propriedade do brick CmsPage), com a chave
`meliscmslinkcheck_page_link_check_tab`; o CmsPage renderiza-o com `{ idPage }`.

## API React — endpoints

As rotas residem em `config/react-api.php`, servidas por
`MelisCmsLinkCheck\Controller\MelisReactApiLinkCheckController`. Todas sob
`/melis/react-api/cms-link-check`, com o contrato `{ success, data, error }`. Cada fetch envia
`X-Requested-With: XMLHttpRequest` e `credentials: 'include'`.

| Método e URL | Ação | Objetivo |
| --- | --- | --- |
| `GET /cms-link-check` | `list` | Registos de análise (keyset: `limit`, `search`, `site`, `sort`, `dir`, `after`) → `{items,total,nextCursor}` |
| `GET /cms-link-check/stats` | `stats` | KPI `{total, errors, sites}` |
| `GET /cms-link-check/sites` | `sites` | Opções do filtro de site (apenas sites presentes nos registos) |
| `POST /cms-link-check/launch` | `launch` | Executar uma análise (`{pageId, follow, options}`) → `{status,message,logIds,pagesVisited}` |
| `GET /cms-link-check/by-page/:idPage` | `byPage` | Última análise de UMA página (separador do editor de páginas); `data: null` se nunca foi analisada |
| `DELETE /cms-link-check/delete/:id` | `delete` | Eliminar um registo de análise |
| `GET /cms-link-check/:id` | `get` | Um registo + a sua `errorList:[{url,type,details}]` analisada |

> A ordem das rotas é importante: `/stats`, `/sites`, `/launch`, `/by-page/:idPage` e `/delete/:id`
> são declaradas antes da rota abrangente `/:id`.

As ações `list`, `stats`, `sites`, `get`, `by-page` e `delete` leem `melis_cms_link_check_logs`
diretamente através de SQL parametrizado (`Laminas\Db\Adapter\AdapterInterface`). Apenas `launch`
delega em `MelisCmsLinkCheckService::executeTest([...])` — a análise real — envolvida em `ob_start()` /
`ob_end_clean()` para que os avisos legados não corrompam o JSON. O seletor de páginas de Lançar uma
análise reutiliza um endpoint legado existente (sem novo backend):
`GET /melis/MelisCms/TreeSites/get-tree-pages-by-page-id?nodeId=<id>` (`nodeId=-1` → sites raiz).

## Capacidades

Declaradas em `config/react.capabilities.php` sob dois nós portadores de permissões:

```php
return [
  'melisReactToolCapabilities' => [
    'meliscmslinkcheck_tool' => ['list', 'launch', 'delete', 'export'],
    'meliscms_page' => [
      'tabs' => [
        ['key' => 'meliscmslinkcheck_page_link_check_tab', 'label' => 'tr_meliscmslinkcheck_page_link_check_tab'],
      ],
    ],
  ],
];
```

- **Capacidades da ferramenta** — `list` (todo o visualizador só de leitura: list/stats/sites/report),
  `launch` (executar uma análise), `delete` (eliminar um registo), `export` (o botão Exportar; a
  exportação reutiliza o endpoint `list`). Em React, condicionam a UI através de
  `MelisCan('meliscmslinkcheck_tool', cap)`; do lado do servidor, cada ação é protegida por
  `denyUnlessAccess()` e depois `denyUnlessCan('list'|'launch'|'delete')`.
- **Capacidade do separador de página** — a `key` `meliscmslinkcheck_page_link_check_tab` deve ser
  igual à chave passada a `window.__melisRegisterPageTab`; ela *é* a capacidade do separador. Sem esta
  declaração, a whitelist de capacidades da página CMS oculta o botão do separador mesmo para um
  administrador. O endpoint `by-page` do separador é protegido apenas pela autenticação de sessão (é
  uma subfuncionalidade do editor de páginas); o botão é-o por esta capacidade.

## Tabelas da base de dados

| Tabela | Papel |
| --- | --- |
| `melis_cms_link_check_logs` | Um registo de análise por página analisada: contagens de ligações/imagens quebradas mais a lista detalhada de erros armazenada como XML na coluna `lcl_errors`. |

## Controladores legados (vista Antiga)

Usados pelo recurso Novo/Antigo em iframe e pela ferramenta clássica, não pelo visualizador React:

| Controlador | Papel |
| --- | --- |
| `MelisCmsLinkCheckListController` | Página da ferramenta clássica + as suas DataTables de resultados. |
| `MelisCmsLinkCheckLaunchController` | Janela modal / formulário de lançamento clássico (página + âmbito + verificação). |
| `MelisCmsLinkCheckPageLinkCheckController` | Separador Link Check clássico da edição de páginas (`renderPageLinkCheckAction`, `{ idPage }`). |

## Ficheiros-chave

| Aspeto | Caminho |
| --- | --- |
| Rotas react-api + invocável | `config/react-api.php` |
| Capacidades | `config/react.capabilities.php` |
| Configuração da ferramenta legada | `config/app.*.php` |
| Controlador react-api | `src/Controller/MelisReactApiLinkCheckController.php` |
| Serviço de análise | `src/Service/MelisCmsLinkCheckService.php` |
| Fonte do brick React | `ui-react/src/` (`brick.tsx`, `LinkCheckPage.tsx`, `linkcheck-api.ts`, …) |
| Brick construído + manifesto | `public/ui-react/brick.js`, `public/ui-react/brick.manifest.json` |
