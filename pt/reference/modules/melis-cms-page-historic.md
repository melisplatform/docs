# MelisCmsPageHistoric

> Registo de auditoria para a edição de páginas do CMS — regista quem fez o quê a uma página e quando, apresentado como um separador Histórico no editor de páginas React e como um widget do painel. Pacote `melisplatform/melis-cms-page-historic`.

## Objetivo

O `MelisCmsPageHistoric` captura automaticamente cada ação sobre uma página (guardar, publicar, despublicar, eliminar)
com a identidade do autor e a data/hora. O histórico é escrito através de ouvintes de eventos ligados ao ciclo
de vida das páginas do CMS — não é preciso configurar nada por página. O registo é exposto **apenas para leitura**: num
**separador Histórico** dentro do editor de páginas e num widget do painel **Atividade recente das páginas**. Serve
para responsabilização, não para restaurar páginas.

## Ativá-lo

Adicione ao `config/melis.module.load.php`:

```php
return [
    'MelisCmsPageHistoric',
];
```

Execute os deltas incluídos em `install/dbdeploy/` para criar a tabela de histórico (`extra.dbdeploy: true`).
Requer `melis-core`, `melis-engine`, `melis-front` e `melis-cms`.

## Um módulo sem brick

Este é um módulo React invulgar: **não inclui nenhum brick próprio** (sem `ui-react/`, sem
`public/ui-react/brick.manifest.json`, sem bundle Vite). A sua presença React resume-se a três ficheiros de configuração
PHP fundidos pelo `Module::getConfig()`, além de um controlador e de um plugin de painel legado. Ambas as
superfícies React aparecem **apenas enquanto o módulo estiver ativo**.

| Ficheiro de configuração | Contribuição |
| --- | --- |
| `config/react-api.php` | O endpoint `GET /melis/react-api/cms-page/historic` + o controlador invocável |
| `config/react.capabilities.php` | A capacidade do separador Histórico sob o nó partilhado `meliscms_page` |
| `config/app.interface.php` | O **botão** do separador Histórico no editor de páginas do CMS (ícone `history`) |

O componente React que é renderizado dentro do separador Histórico **não é fornecido por este módulo** — é
disponibilizado do lado do host pela shell do melis-core e ligado através do registo de separadores de página
(`window.__melisRegisterPageTab('melispagehistoric_historic', Component)`). Este módulo contribui
apenas com o endpoint de dados, a capacidade e a declaração do botão de separador; o editor de páginas do CMS
(MelisCms) aloja o separador.

## Separador Histórico (editor de páginas React)

Barra lateral esquerda → **MelisCms** → abra uma **página** → o separador **Histórico** na linha de separadores do editor.
Mostra uma tabela apenas de leitura das ações **desta página**, das mais recentes para as mais antigas, com as colunas
**Data**, **Ação** (badges coloridos Publish / Save / Unpublish) e **Utilizador**. Um menu pendente
**Filter (All actions)** restringe a um único tipo de ação. A lista é **paginada no servidor** — nunca carrega
todo o histórico de uma vez.

![Separador Histórico no editor de páginas React do CMS a mostrar a tabela de histórico da página com as colunas Data, badges de Ação e Utilizador, além de um filtro de ações](/screenshots/react/melis-cms-page-historic/meliscmspagehistoric-page-tab-historic.png)

O separador mostra apenas o histórico da página atual. Para a atividade de *todas* as páginas, utilize o widget
do painel abaixo.

## Widget do painel Atividade recente das páginas

No **Painel** do back-office, o widget **Recent page activity** lista as ações mais recentes sobre páginas
de todos os utilizadores (data/hora · ponto de estado · nome da página + id · ação · utilizador). É
adicionado/removido do painel "Add a widget" como qualquer outro widget do painel, sob o grupo **MELIS CMS
PAGE HISTORIC**.

![Widget do painel Atividade recente das páginas a listar ações recentes sobre páginas, com o painel Add a widget a mostrá-lo sob Melis Cms Page Historic](/screenshots/react/melis-cms-page-historic/meliscmspagehistoric-dashboard-plugin-recentactivity.png)

Este widget continua a ser um **plugin de painel PHP legado**
(`MelisCmsPageHistoricRecentUserActivityPlugin`, ação `recentActivityPages`) renderizado dentro do
host de widgets do painel React — não existe uma reescrita em React. Lê através de
`MelisPageHistoricTable->getPagesHistoricForDashboard()` e condiciona-se a que o MelisCms esteja ativo e ao
direito de acesso ao plugin do painel.

## API React — o endpoint Histórico

Declarado em `config/react-api.php`, controlador
`MelisCmsPageHistoric\Controller\MelisReactApiPageHistoricController` (alias invocável
`MelisReactApiPageHistoric`). Uma ação, contrato `{ success, data, error }`.

| Método e URL | Ação | Objetivo |
| --- | --- | --- |
| `GET /melis/react-api/cms-page/historic?idPage=<id>&page=<n>&perPage=<25>&action=<type>` | `listAction` | As linhas de auditoria da página atual, paginadas no servidor, mais os tipos de ação distintos para o menu de filtro |

Forma de `data` na resposta:

```jsonc
{ "success": true, "data": {
  "idPage": 1,
  "items": [ { "id": 123, "date": "2026-08-18 10:10:25", "action": "Publish",
               "user": "John Doe", "userId": 1 } ],   // newest first (ORDER BY hist_id DESC)
  "page": 1, "perPage": 25, "total": 87,               // total = indexed COUNT → drives paging
  "action": "",                                        // active action filter ('' = all)
  "actionTypes": ["Publish", "Save", "Unpublish"]      // DISTINCT hist_action for the filter select
} }
```

Notas de implementação:

- **Proteção:** a ação verifica apenas `MelisCoreAuth->hasIdentity()` (devolve `401` se
  não autenticado). **Não** impõe uma capacidade do lado do servidor — trate a capacidade abaixo como
  um sinal de **restrição de UI**, não como uma verificação de autorização do backend.
- **Dados:** SQL parametrizado direto sobre `melis_hist_page_historic` (LEFT JOIN `melis_core_user` para
  o nome do utilizador; um utilizador eliminado é rotulado como `"Utilisateur supprimé (<id>)"`).
- **Paginação:** `perPage` limitado a `1..200` (por omissão 25); `total` é uma contagem indexada
  `COUNT(*)` separada, que respeita o mesmo `WHERE`. O filtro opcional `action` aplica-se tanto à contagem como à
  página.

## Capacidades

Como o módulo contribui com um separador para a ferramenta de páginas do CMS, a sua capacidade é declarada sob o
nó de direitos **partilhado** `meliscms_page` (um `ArrayUtils::merge` acrescenta ao `tabs[]` dessa ferramenta):

```php
return [
  'melisReactToolCapabilities' => [
    'meliscms_page' => [
      'tabs' => [
        ['key' => 'melispagehistoric_historic', 'label' => 'tr_melispagehistoric_page_tab_historic_Historic'],
      ],
    ],
  ],
];
```

- A `key` (`melispagehistoric_historic`) é a capacidade do separador; corresponde à chave que o host usa
  para registar o componente do separador e à `melisKey` da interface em `app.interface.php`.
- Está indexada sob `meliscms_page` ("Edition de page" em Users → Rights), **não** sob o invólucro
  `meliscms` e **não** sob o nó do botão de separador.
- Sem esta declaração, a lista de permissões de capacidades das páginas do CMS oculta o botão do separador — mesmo
  para um administrador.

## Como o histórico é escrito (padrão de ouvinte)

Dois ouvintes ligados em `src/Module.php` (apenas no arranque do back-office) registam as linhas; o React apenas
as lê.

| Ouvinte | Evento(s) | O que regista |
| --- | --- | --- |
| `MelisPageHistoricPageEventListener` | `meliscms_page_save_end`, `meliscms_page_publish_end`, `meliscms_page_unpublish_end`, … | Save / Publish / Unpublish |
| `MelisPageHistoricDeletePageListener` | `meliscms_page_delete_end` | Delete (também faz limpeza) |

Não escreve as linhas de histórico manualmente — guardar, publicar ou eliminar uma página através do CMS
aciona os ouvintes automaticamente.

## Tabela da base de dados

| Tabela | Guarda |
| --- | --- |
| `melis_hist_page_historic` | Uma linha por ação registada: `hist_id` (PK), `hist_page_id`, `hist_action`, `hist_date`, `hist_user_id`, `hist_description`. |

## Ficheiros principais

| Área | Caminho |
| --- | --- |
| Controlador da react-api | `vendor/melisplatform/melis-cms-page-historic/src/Controller/MelisReactApiPageHistoricController.php` |
| Rota da react-api | `vendor/melisplatform/melis-cms-page-historic/config/react-api.php` |
| Capacidade do separador Histórico | `vendor/melisplatform/melis-cms-page-historic/config/react.capabilities.php` |
| Botão / interface do separador Histórico | `vendor/melisplatform/melis-cms-page-historic/config/app.interface.php` |
| Arranque do módulo (ouvintes) | `vendor/melisplatform/melis-cms-page-historic/src/Module.php` |
| Table gateway | `vendor/melisplatform/melis-cms-page-historic/src/Model/Tables/MelisPageHistoricTable.php` |
| Plugin do painel (legado) | `vendor/melisplatform/melis-cms-page-historic/src/Controller/DashboardPlugins/MelisCmsPageHistoricRecentUserActivityPlugin.php` |
| SQL de instalação / dbdeploy | `vendor/melisplatform/melis-cms-page-historic/install/` |

Ver também: [MelisCms](/pt/reference/modules/melis-cms), [Referência de módulos](/pt/reference/modules)
