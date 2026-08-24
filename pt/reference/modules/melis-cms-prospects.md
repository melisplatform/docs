# MelisCmsProspects

> Gestão de leads / contactos: um formulário de contacto de front-office capta as mensagens dos visitantes como prospects e um back-office em React permite navegar, filtrar, editar, exportar e eliminá-los, além de classificar os pedidos por temas. Pacote `melisplatform/melis-cms-prospects`.

## Objetivo

O `MelisCmsProspects` capta as submissões do formulário de contacto dos visitantes como **prospects** (leads) armazenados na
base de dados. Os utilizadores do back-office navegam, filtram, editam, exportam (CSV/Excel) e eliminam esses leads,
e classificam-nos por **temas**. O módulo inclui um widget de estatísticas para o dashboard e integra-se com
as ferramentas de RGPD da plataforma (informação do utilizador / extração / eliminação + ciclo de eliminação automática).

No Melis v6, as duas ferramentas de back-office — **Prospects** e **Themes** — são **interfaces nativas totalmente em React**
servidas em `/melis-react`, cada uma comunicando com uma camada JSON `react-api`. O modelo de dados subjacente,
os serviços, o plugin front Show Form e a integração com o RGPD permanecem inalterados face à v5.

## Ativação

Adicione a `config/melis.module.load.php`:

```php
return [
    'MelisCmsProspects',
];
```

Dependências: `melis-core`, `melis-engine`, `melis-front`, `melis-cms` e
`laminas/laminas-mvc-plugin-flashmessenger`. O módulo é `dbdeploy: true` — as suas tabelas são
criadas/atualizadas através do mecanismo dbdeploy. Ambas as ferramentas React aparecem no back-office apenas
enquanto o módulo estiver ativo (são descobertas a partir do seu `brick.manifest.json`).

## Back-office React

**Onde:** barra lateral esquerda → **MelisMarketing** → **Prospects** → **Prospects** / **Themes**. Cada uma
abre no seu próprio separador de topo. Todas as ferramentas mantêm um alternador **New / Old**: *New* é a interface React
(predefinição), *Old* apresenta a ferramenta legada num iframe (`/melis/react-tool-page?key=<melisKey>`).

Dois bricks são fornecidos num único bundle (`public/ui-react/brick.manifest.json`):

| Item | Prospects | Themes |
| --- | --- | --- |
| ID do brick / rota | `prospects` — `/prospects` | `prospect-themes` — `/prospect-themes` |
| `forwardKey` (menu → rota) | `MelisCmsProspects/ToolProspects` | `MelisCmsProspects/ProspectThemes` |
| `melisKey` do iframe da vista Old (zona) | `MelisCmsProspects_tool_prospects` | `MelisCmsProspects_tool_themes` |
| melisKey de direitos / capacidades | `melisprospects_tool_prospects_section` | `melisprospects_tool_themes_section` |
| Base da API | `/melis/react-api/prospects` | `/melis/react-api/prospect-themes` |
| Controlador | `MelisReactApiProspectController` | `MelisReactApiProspectThemeController` |

> Nota: o `melisKey` do manifesto é a chave da **zona** renderizável usada para o iframe da vista Old —
> os direitos **não** dependem dela. A proteção de acesso e as capacidades assentam no nó de menu
> `melisprospects_tool_..._section` (declarado em `config/app.interface.php`).

### Ferramenta Prospects

![A ferramenta Prospects em React: cartões de KPI (Total / Este mês / Média por mês / Anonimizados), pesquisa, filtros All-sites e All-types, um seletor de intervalo de datas, Reset filters, um gestor de Columns, Export, o alternador New/Old e um botão de atualização — cada linha tem ações de editar e eliminar](/screenshots/react/melis-cms-prospects/meliscmsprospects-tool-prospects-list.png)

Vê **todos os prospects da plataforma**. A lista tem **quatro cartões de KPI** (Total, Este mês,
Média por mês, Anonimizados), uma caixa de **pesquisa** (nome / email / telefone / empresa), um filtro de **site**,
um filtro de **tipo**, um seletor de intervalo de **datas** (Hoje / Ontem / Últimos 7 / Últimos 30 / Este
mês / Mês passado / Personalizado), **Reset filters**, um gestor de **Columns** persistido, **Export** e
um botão de atualização. Clique num cabeçalho para **ordenar** (todas as colunas exceto *Message*). Cada linha tem **editar**
e **eliminar**.

Os prospects **não são criados** aqui — chegam apenas a partir do formulário de contacto do front. Ao clicar em
**editar** abre-se o prospect como um **sub-separador** anfitrião (← Back) que mostra um formulário React: um cartão de **Informação de
contacto** (Nome, Email, Telefone, Empresa, País), um cartão de **Mensagem** e um cartão lateral de **Detalhes** (seletor de **Site**,
seletor de **Theme**, **Data de contacto** só de leitura). Nenhum campo é obrigatório
(o email só é validado quanto ao formato se estiver preenchido); a **Data de contacto** e o **tipo** são imutáveis — são
definidos no momento da captação pelo formulário front.

![O formulário de edição de prospect em React — um cartão de Informação de contacto (Nome, Email, Telefone, Empresa, País), uma caixa de Mensagem e um cartão lateral de Detalhes (Site, Theme, Data de contacto só de leitura); a barra de sub-separadores mostra o drill-down (← Back · Paul Martin)](/screenshots/react/melis-cms-prospects/meliscmsprospects-tool-prospects-edit.png)

### Ferramenta Themes

A lista de Themes mostra **dois cartões de KPI** (Total de temas, total de Items), uma caixa de **pesquisa**, **Reset
filters**, um gestor de **Columns**, **Export**, o alternador **New/Old** e **+ New theme**. Cada linha
mostra o **nome** do tema e a sua **contagem de itens**, com três ações: **renomear** (modal de um só campo),
**editar** (abre o sub-separador **Items** do tema) e **eliminar**.

![A ferramenta Themes em React: cartões de KPI Total / Items, pesquisa, Reset filters, Columns, Export, alternador New/Old e "+ New theme" — cada linha expõe renomear, editar (abrir itens) e eliminar](/screenshots/react/melis-cms-prospects/meliscmsprospects-tool-themes-list.png)

![O modal "New theme" — um único campo Name (o código é preservado pelo back-end, não é introduzido aqui)](/screenshots/react/melis-cms-prospects/meliscmsprospects-tool-themes-new-modal.png)

A edição de um tema abre o seu painel **Items** como sub-separador (← Back + nome do tema): uma lista pesquisável de
itens (id + nome) com editar/eliminar por linha e **+ New item**. Adicionar ou editar um item abre um
modal que capta um **nome por idioma do CMS** — uma fila de separadores de idioma (bandeira + ponto verde "preenchido")
mais o campo **Name** para o idioma ativo. É necessário preencher pelo menos um idioma.

![O painel Items de um tema (sub-separador) para "My Billing" — uma lista pesquisável de itens com editar/eliminar por linha e um botão "+ New item", apresentado como sub-separador de drill-down](/screenshots/react/melis-cms-prospects/meliscmsprospects-tool-themes-edit-themecategorylist.png)

![O modal "New item" — separadores "Content per language" (English / Français) e o campo Name para o idioma ativo](/screenshots/react/melis-cms-prospects/meliscmsprospects-tool-themes-edit-themecategorylist-new-modal.png)

## API React

As rotas residem em `config/react-api.php` (mescladas via `Module::getConfig()`). Todas sob
`/melis/react-api/`, contrato `{ success, data, error }`; cada fetch envia
`X-Requested-With: XMLHttpRequest` e `credentials: 'include'`.

**Prospects** — `MelisReactApiProspectController`:

| Método e URL | Objetivo |
| --- | --- |
| `GET /prospects` | Lista por keyset (`limit,search,site,type,dateFrom,dateTo,sort,dir,after`) → `{items,total,nextCursor}` |
| `GET /prospects/stats` | KPIs `{total, thisMonth, avgPerMonth, anonymized}` |
| `GET /prospects/sites` | Opções do filtro de site |
| `GET /prospects/types` | Valores distintos de `pros_type` |
| `GET /prospects/themes` | Opções de itens de tema para o seletor Theme do formulário |
| `GET /prospects/:id` | Um prospect (formatado) |
| `POST /prospects/save` | **Apenas atualização** (sem criação); data de contacto e tipo imutáveis no servidor |
| `DELETE /prospects/delete/:id` | Eliminar um prospect |

**Themes & items** — `MelisReactApiProspectThemeController`:

| Método e URL | Objetivo |
| --- | --- |
| `GET /prospect-themes` | Lista de temas por keyset → `{items,total,nextCursor}` com `itemCount` |
| `GET /prospect-themes/stats` | KPIs `{total, withCode, items}` |
| `GET /prospect-themes/:id` | Um tema `{id,name,code,itemCount}` |
| `POST /prospect-themes/save` | Criar (id=0) / atualizar (name obrigatório ≤45, único; code preservado se ausente) |
| `DELETE /prospect-themes/delete/:id` | Eliminar um tema + itens + traduções (cascata) |
| `GET /prospect-themes/languages` | Idiomas do CMS `{languages:[{id,name,locale}]}` |
| `GET /prospect-themes/items?themeId=X` | Os itens de um tema (nome no idioma da sessão) |
| `GET /prospect-themes/items/:id` | Um item `{id,themeId,translations:{langId:text}}` |
| `POST /prospect-themes/items/save` | Criar/atualizar um item (≥1 tradução não vazia; upsert/eliminação por idioma) |
| `DELETE /prospect-themes/items/delete/:id` | Eliminar um item + as suas traduções |

```ts
// update a prospect (no create)
await apiFetch<{id:number}>('/melis/react-api/prospects/save', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: 3, siteId: 1, name: 'Paul Martin',
    email: 'paul.martin@example.com', message: '…', theme: null }),
})
// save a theme item (name per language)
await apiFetch<{id:number}>('/melis/react-api/prospect-themes/items/save', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: 0, themeId: 2, translations: { '1': 'My invoices', '2': 'Mes factures' } }),
})
```

> Ambos os controladores comunicam diretamente com as tabelas via SQL parametrizado (`AdapterInterface`, listas
> por keyset através de `MelisReactKeysetListTrait`), reproduzindo as regras de negócio legadas. Continuam a disparar
> os eventos de log legados (`meliscmsprospects_toolprospects_save_end` / `_delete_end`,
> `meliscmsprospects_theme_save_end` / `_delete_end`, `meliscmsprospects_theme_item_save_end`) para que
> os listeners de flash/log do módulo continuem a funcionar.

## Capacidades

Declaradas em `config/react.capabilities.php` (`melisReactToolCapabilities`), indexadas pelo
melisKey do nó de menu portador dos direitos. `Capabilities::flatten()` produz strings com pontos passadas a
`MelisCan(melisKey, cap)` em React e `denyUnlessCan(cap)` no servidor (permite por defeito uma
capacidade não declarada).

```php
'melisprospects_tool_prospects_section' => ['list', 'edit', 'delete', 'export'], // NO create
'melisprospects_tool_themes_section' => [
    'actions' => ['create', 'list', 'edit', 'delete', 'export'],
    'tabs' => [
        ['key' => 'items', 'label' => 'tr_melis_cms_prospects_theme_items',
         'actions' => ['list', 'create', 'edit', 'delete']],
    ],
],
```

- **Prospects**: `list`, `edit`, `delete`, `export` (sem `create` — um prospect só nasce a partir do
  formulário de contacto público).
- **Themes**: `create`, `list`, `edit`, `delete`, `export`, além do sub-separador `items`
  (`items`, `items.list`, `items.create`, `items.edit`, `items.delete`).

Cada ação do controlador protege duas vezes: `denyUnlessAccess()` (autenticação + `MelisCoreRights::canAccess`)
seguido de `denyUnlessCan('list')` etc. `save` escolhe `edit` vs `create` pelo id.

## Serviços principais

| Alias do serviço | Função |
| --- | --- |
| `MelisCmsProspectsService` / `MelisProspectsService` | Serviço principal. `saveProspectsDatas($datas, $prosId = null)` cria ou atualiza um prospect; `getProspectsDataForWidgets($widgetId = '')` devolve as contagens total / este mês / média; `getProspectsDataByDate($type, $date)` conta os registos por data; `getWidgetProspects($identifier)` obtém dados para um widget. |
| `MelisProspectsGdprAutoDeleteService` | Gere o ciclo de eliminação automática do RGPD (lista de módulos, lista de tags, listas de utilizadores de aviso / segundo aviso, eliminação de conta). |

Table gateways: `MelisProspects`, `MelisCmsProspectsThemeTable`,
`MelisCmsProspectsThemeItemTable`, `MelisCmsProspectsThemeItemTransTable`.

> Os controladores React **não** usam o `MelisCmsProspectsService` (consultam as tabelas
> diretamente); as ferramentas clássicas (vista Old), o plugin Show Form, o widget do dashboard e os
> listeners de RGPD continuam a depender dele.

## Front office

O plugin de controlador `MelisCmsProspectsShowFormPlugin` renderiza o formulário de contacto no front
end. Arraste o bloco **Show Form** para uma página a partir do painel de plugins do editor de páginas React (em
**Melis Cms Prospects**). O seu modal de definições mantém três separadores:

![O editor de páginas React com o painel de plugins aberto — o bloco "Contact Form" está no grupo "Melis Cms Prospects", pronto a arrastar para a página](/screenshots/react/melis-cms-prospects/meliscmsprospects-page-menu-plugins-selector.png)

![Show Form — separador Field list: o construtor de campos — por campo um interruptor Show/Hide e uma caixa Mandatory; as linhas são ordenáveis por arrastar, pelo que a sua ordem é a ordem do formulário](/screenshots/react/melis-cms-prospects/meliscmsprospects-page-plugins-showform-config-tab-fieldlist.png)

| Separador | Controlos |
| --- | --- |
| Properties | Template de renderização (`template_path`) e site de origem (`pros_site_id`). |
| Field list | Construtor de campos — por campo um interruptor Show/Hide e uma caixa Mandatory (ativa apenas quando Show está ligado); arraste as linhas para definir a ordem do formulário. Campos: `pros_name`, `pros_company`, `pros_country`, `pros_email`, `pros_telephone`, `pros_message`. |
| Themes | O tema que preenche a dropdown de assunto do formulário. |

Ficheiro de configuração: `config/plugins/MelisCmsProspectsShowFormPlugin.config.php`. Template do front:
`view/.../plugins/prospects-form.phtml`. No Dashboard do back-office, o widget **Prospects
Statistics** (`MelisCmsProspectsStatisticsPlugin`, secção `MelisMarketing`) traça os
registos ao longo do tempo.

![O widget de dashboard "Prospects statistics" — um gráfico de registos Diários/Mensais/Anuais mais uma tabela dos prospects mais recentes](/screenshots/react/melis-cms-prospects/meliscmsprospects-dashboard-plugin-prospectsstatistics.png)

## Tabelas da base de dados

| Tabela | Contém |
| --- | --- |
| `melis_cms_prospects` | Um lead captado: site, tipo, tema, nome, email, telefone, mensagem, empresa, país, data de contacto, última data de RGPD. PK: `pros_id`. |
| `melis_cms_prospects_themes` | Temas de assunto (`pros_theme_name`, `pros_theme_code`). PK: `pros_theme_id`. |
| `melis_cms_prospects_theme_items` | Itens pertencentes a um tema. PK: `pros_theme_item_id`. |
| `melis_cms_prospects_theme_items_trans` | Traduções por idioma dos itens de tema. PK: `item_trans_id`. |

## Event hooks

Ligue com `MelisCmsProspects` como identificador de destino:

| Nome do evento | Disparado por |
| --- | --- |
| `meliscmsprospects_toolprospects_save_start` / `_end` | Ferramenta Prospects (controlador clássico + React) |
| `meliscmsprospects_toolprospects_delete_start` / `_end` | Ferramenta Prospects (controlador clássico + React) |
| `meliscmsprospects_theme_save_end` / `_delete_end` | Ferramenta Themes (controlador clássico + React) |
| `meliscmsprospects_theme_item_save_end` | Itens de tema (controlador clássico + React) |

```php
$sharedEvents->attach(
    'MelisCmsProspects',
    'meliscmsprospects_toolprospects_save_end',
    $fn,
    50
);
```

Os listeners de RGPD (informação do utilizador, extração, eliminação, eliminação automática) estão ligados em `src/Module.php`. Os mapeamentos
de campos de RGPD residem em `config/app.gdpr.php`.

## Ficheiros principais

| Aspeto | Caminho (sob `vendor/melisplatform/melis-cms-prospects/`) |
| --- | --- |
| Configuração do módulo / rotas / serviços | `config/module.config.php` |
| Rotas da react-api + invokables | `config/react-api.php` |
| Capacidades React | `config/react.capabilities.php` |
| Árvore de interface do back-office | `config/app.interface.php` |
| Tabelas e formulários da ferramenta clássica | `config/app.tools.php` |
| Configuração do plugin de templating | `config/plugins/MelisCmsProspectsShowFormPlugin.config.php` |
| Configuração do widget do dashboard | `config/dashboard-plugins/` |
| Mapeamento de campos de RGPD | `config/app.gdpr.php` |
| Controladores da API React | `src/Controller/MelisReactApiProspectController.php`, `MelisReactApiProspectThemeController.php` |
| Controladores clássicos | `src/Controller/ToolProspectsController.php`, `MelisCmsProspectsThemesController.php`, `MelisCmsProspectsThemeItemsController.php` |
| Serviço principal | `src/Service/MelisCmsProspectsService.php` |
| Serviço de eliminação automática de RGPD | `src/Service/` |
| Plugin do formulário front | `src/Controller/Plugin/MelisCmsProspectsShowFormPlugin.php` |
| Widget do dashboard | `src/Controller/DashboardPlugins/MelisCmsProspectsStatisticsPlugin.php` |
| Bricks React (fonte / build) | `ui-react/src/` → `public/ui-react/brick.js` + `brick.manifest.json` |
| Table gateways | `src/Model/Tables/` |
| Listeners de RGPD e bootstrap | `src/Module.php`, `src/Listener/` |

Ver também: [Referência de módulos](/pt/reference/modules) · [melis-cms](/pt/reference/modules/melis-cms) · [melis-core](/pt/reference/modules/melis-core)
