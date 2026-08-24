# MelisCmsSiteRobot

> Edição do `robots.txt` por domínio e distribuição dinâmica, com um back-office nativo em full-React. Pacote `melisplatform/melis-cms-site-robot`.

## Objetivo

O `MelisCmsSiteRobot` permite gerir o `robots.txt` de cada domínio de site a partir do back-office e
distribui-o dinamicamente em `https://<domain>/robots.txt` — diretamente a partir da base de dados, sem qualquer ficheiro
estático a manter. As alterações produzem efeito imediatamente após guardar. O texto do robots é armazenado numa linha
por domínio numa tabela dedicada; não existe variante por página nem por idioma.

No back-office React da v6 (`/melis-react`), a ferramenta é entregue como um **brick nativo em full-React** — uma verdadeira
lista + editor em React que invoca uma camada JSON `react-api` — com um alternador **New / Old** que recorre à
ferramenta legada num iframe. O modelo de dados subjacente, os table gateways do engine e a rota
front dinâmica `/robots.txt` mantêm-se inalterados face à v5.

## Ativá-lo

Adicione a `config/melis.module.load.php`:

```php
return [
    'MelisCmsSiteRobot',
];
```

Dependências: `melis-core` e `melis-cms`. O módulo tem `dbdeploy: true`, pelo que a sua tabela é criada
automaticamente, e reutiliza os table gateways fornecidos pelo `melis-engine` em tempo de execução. O brick React
aparece **apenas se o módulo estiver ativado** — o host descobre-o através do `brick.manifest.json`
(`GET /melis/react-api/react-modules`); remover o módulo de `melis.module.load.php` fá-lo
desaparecer do menu.

## Back-office (React)

**Onde:** barra lateral esquerda → grupo **MelisCms** → **Robots.txt** (rota da árvore `/melis-cms/site-robot`).
Abre como um separador de topo denominado **Robots.txt**, com dois níveis apresentados como sub-separadores nativos do host:
**lista de domínios de sites → o editor do robots.txt de um domínio**.

![Lista Robots.txt em React — cartões KPI (Domains / With robots.txt / Without robots.txt), uma caixa "Search a domain…", um filtro "All sites", Reset filters / Columns / Export, o alternador New/Old e um refresh, com Domain / Site / Env. por linha e um badge Set/None, mais uma ação de edição](/screenshots/react/melis-cms-site-robot/meliscmssiterobot-tool-robots-list.png)

### Nível 1 — a lista de domínios

A lista mostra **todos os domínios de sites da plataforma** (uma linha por domínio, alimentada pela ferramenta
**Sites**). Oferece **cartões KPI** (Domains / With robots.txt / Without robots.txt), uma caixa de **pesquisa**
(corresponde ao nome do domínio ou do site), um filtro **All sites**, um gestor de **Columns**, um botão **Export**
e **Reset filters**. A lista faz scroll infinito (keyset) com ordenação do lado do servidor. Colunas: **ID**,
**Domain**, **Site**, **Env.**, **robots.txt** (um badge **Set / None** por linha). Cada linha tem uma
ação de **edição** (lápis) e, quando existe conteúdo, uma ação de **eliminação** (limpar).

Não existe **"+ New" nem eliminação de domínio** — os domínios provêm da ferramenta Sites; apenas edita ou
limpa o robots.txt de cada domínio.

### Nível 2 — editar o robots.txt de um domínio

Abrir um domínio adiciona um **sub-separador** (com um botão **← Back**). O editor mostra o **Domain** e o
**Site** em modo apenas de leitura, mais uma grande área de texto monospace **robots.txt content** para o corpo. **Save**
(canto superior direito) persiste-o, e é distribuído em direto no `/robots.txt` desse domínio. Deixá-lo vazio
não distribui nada.

![Editor de robots.txt em React — campos Domain e Site apenas de leitura, uma área de texto monospace "robots.txt content", o sub-separador ← Back e um botão Save no canto superior direito](/screenshots/react/melis-cms-site-robot/meliscmssiterobot-tool-robots-edit.png)

### Alternador New / Old

O alternador **New / Old** no canto superior direito comuta toda a ferramenta entre a interface React (**New**, predefinição)
e a ferramenta clássica renderizada num iframe (**Old**, em
`/melis/react-tool-page?key=site_robot_tool_display`).

## Brick React

| Item | Valor |
| --- | --- |
| Tipo de brick | Nativo full-React (com fallback New/Old para iframe legado) |
| Id do brick | `siterobot` (`brick.tsx` ⇄ `brick.manifest.json`) |
| `route` do manifest | `/melis-cms/site-robot` |
| `label` | `Robots.txt` |
| `forwardKey` | `MelisCmsSiteRobot/ToolSiteRobot` |
| `melisKey` (iframe / zona renderável) | `site_robot_tool_display` |
| `subTabs` / `persistent` | `true` / `true` |
| melisKey de capacidades | `meliscms_site_robot_tools_section` |
| Base da API | `/melis/react-api/site-robots` |

O brick é um bundle Vite IIFE (React externalizado para os globals do host). `SiteRobotPage.tsx` é o
contentor: faz o parse de `/[section]/site-robot[/:id]` e alterna entre `DomainList` (sem id) e
`RobotForm` (id presente), mantendo o `mode` New/Old, os cartões KPI, os filtros, o gestor de colunas, o Export e
o modal de confirmação de eliminação. Os sub-separadores são acionados através da ponte da window
(`window.__melisOpenSubTab` / `__melisUpdateSubTabLabel`).

## API React

As rotas residem em `config/react-api.php`; controlador
`MelisCmsSiteRobot\Controller\MelisReactApiSiteRobotController`. Todas sob
`/melis/react-api/site-robots`, contrato JSON `{ success, data, error }`. O controlador comunica com
as tabelas **diretamente via SQL parametrizado** (sem serviço de módulo — em conformidade com a ferramenta legada).

| Método e URL | Ação | Objetivo |
| --- | --- | --- |
| `GET /site-robots` | `list` | Lista os domínios de sites (keyset: `limit`, `search`, `site`, `sort`, `dir`, `after`); cada item transporta `hasRobots` |
| `GET /site-robots/stats` | `stats` | KPI `{ total, withRobots, withoutRobots }` |
| `GET /site-robots/sites` | `sites` | Opções de site para o filtro |
| `GET /site-robots/:id` | `get` | Um domínio (`sdom_id`) + o seu `robotText` |
| `POST /site-robots/save` | `save` | Upsert do robots.txt de um domínio (`{ id, robotText }`) |
| `DELETE /site-robots/delete/:id` | `delete` | Limpa o robots.txt de um domínio (o domínio mantém-se) |

`list` faz LEFT-JOIN de `melis_cms_site_domain` com `melis_cms_site` e `melis_cms_domain_robots` (unidos pelo
nome do domínio, `robot_site_domain = sdom_domain`). `save` faz upsert da linha do robots com chave no nome
do domínio e limita o corpo armazenado a **65535 caracteres**. A ordem das rotas importa: `/stats`, `/sites`,
`/save`, `/delete/:id` são declaradas **antes** da catch-all `/:id` (restrita a `[0-9]+`).

### Capacidades

Declaradas em `config/react.capabilities.php` sob o nó portador de direitos
`meliscms_site_robot_tools_section`:

```php
return [
    'melisReactToolCapabilities' => [
        'meliscms_site_robot_tools_section' => ['list', 'edit', 'delete', 'export'],
    ],
];
```

- **`list`** — ver a lista de domínios (também controla `stats` + `sites`).
- **`edit`** — abrir (`get`) e guardar (`save`) o robots.txt de um domínio.
- **`delete`** — limpar o robots.txt de um domínio.
- **`export`** — o botão Export (controlo de UI, reutiliza a lista).

Não existe capacidade **`create`** — não é possível adicionar um domínio a partir desta ferramenta. Cada ação do controlador
é protegida duas vezes: `denyUnlessAccess()` (autenticação + `MelisCoreRights::canAccess`) e depois `denyUnlessCan(cap)`
(default-allow; o servidor mantém-se como ponto de aplicação).

## Serviços principais

O módulo não regista qualquer serviço próprio. A ferramenta legada e a API React partilham o mesmo modelo de
dados; os gateways do engine mantêm-se disponíveis:

| Alias do serviço | Função |
| --- | --- |
| `MelisEngineTableRobot` | Table gateway sobre `melis_cms_domain_robots` — lê e escreve `robot_text` por domínio. |
| `MelisEngineTableSiteDomain` | Alimenta a lista de domínios de sites (`sdom_id`, `site_label`, `sdom_domain`). |

## Front office

Uma rota pública em `config/module.config.php` (`melis-cms-site-robot-special-urls`) mapeia `/robots.txt`
para `ToolSiteRobotController::toolRobotsTxtAction`. A ação procura em `melis_cms_domain_robots` pelo
host solicitante e devolve o `robot_text` armazenado. Inalterada na v6.

| Rota | Handler | Resultado |
| --- | --- | --- |
| `/robots.txt` | `ToolSiteRobotController::toolRobotsTxtAction` | Distribui o `robot_text` armazenado para o domínio solicitante. |

## Tabelas da base de dados

| Tabela | Contém |
| --- | --- |
| `melis_cms_domain_robots` | Uma entrada robots.txt por domínio: `robot_id` (PK), `robot_site_domain`, `robot_text`. |

## Ficheiros principais

| Assunto | Caminho |
| --- | --- |
| Rotas da API React | `vendor/melisplatform/melis-cms-site-robot/config/react-api.php` |
| Capacidades React | `vendor/melisplatform/melis-cms-site-robot/config/react.capabilities.php` |
| Manifest do brick React | `vendor/melisplatform/melis-cms-site-robot/public/ui-react/brick.manifest.json` |
| Controlador da API React | `vendor/melisplatform/melis-cms-site-robot/src/Controller/MelisReactApiSiteRobotController.php` |
| Ferramenta legada + rota `/robots.txt` | `vendor/melisplatform/melis-cms-site-robot/src/Controller/ToolSiteRobotController.php` |
| Rotas (back-office + `/robots.txt`) | `vendor/melisplatform/melis-cms-site-robot/config/module.config.php` |
| SQL de instalação | `vendor/melisplatform/melis-cms-site-robot/install/` |

Ver também: [Referência de módulos](/pt/reference/modules), [melis-cms](/pt/reference/modules/melis-cms), [melis-core](/pt/reference/modules/melis-core)
