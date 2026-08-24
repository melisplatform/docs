# MelisCmsMcq

> Construtor de questionários de escolha múltipla (MCQ / quiz) no back-office do Melis CMS, agora uma ferramenta nativa totalmente em React no back-office da v6. Pacote `melisplatform/melis-cms-mcq`.

## Objetivo

O MelisCmsMcq é a **metade da interface** do sistema MCQ. Fornece a bancada de trabalho onde cria
**perguntas** (com respostas, tipo, dificuldade, categoria e etiquetas), as organiza em **categorias
de perguntas** e **grupos MCQ**, e monta **MCQ** (testes) quer manualmente através de um **cesto**
por utilizador, quer automaticamente através de um **modelo aleatório**. Não possui camada de dados
própria: toda a persistência (tabelas, serviços, pontuação, capturas XML e renderização no
front-office) é delegada ao módulo companheiro **MelisCmsMcqEngine**.

Na v6 a ferramenta é um **componente nativo totalmente em React**: páginas React reais que chamam os
próprios endpoints JSON `/melis/react-api/mcq*` do módulo, sem iframe na vista predefinida. A
ferramenta PHP legada permanece intacta e acessível apenas através de um interruptor Novo / Antigo
por ferramenta.

## Ativação

Adicione a `config/melis.module.load.php`:

```php
return [
    'MelisCmsMcq',
];
```

Requer `melisplatform/melis-cms-mcq-engine` (`^5.3`) e `laminas/laminas-paginator`. Requer também que
**MelisCms**, **MelisCore** (backoffice) e **MelisCmsTags** (etiquetagem de perguntas) estejam
carregados. Cadeia de instalação: `MelisCmsMcq` → `melis-cms-mcq-engine` → `melis-cms` +
`melis-cms-tags`.

O componente React é descoberto via `GET /melis/react-api/react-modules` e só aparece quando o
módulo está ativo. O `src/Module.php` funde `config/react-api.php` (os endpoints JSON) e
`config/react.capabilities.php` (o mapa de direitos avançados) na configuração da aplicação.

## Onde se situa no back-office React

**Barra lateral → MelisCms → MCQ**, rota **`/melis-cms/mcq`** (derivada do encaminhamento de menu
`MelisCmsMcq/MelisCmsMcq`). O componente está registado sob o id **`cms-mcq`** e desenha toda a
ferramenta em React — sem barra lateral/cabeçalho próprios.

![O separador MCQ (React): a lista de testes com cartões de KPI, filtros, o interruptor Novo/Antigo e o cesto de Favoritos de Perguntas.](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-mcq-list.png)

O manifesto (`public/ui-react/brick.manifest.json`) define `persistent: true` e `subTabs: true`,
pelo que o componente possui a **sua própria** barra de subseparadores interna e permanece montado
ao longo da navegação do anfitrião: abrir um MCQ ou uma pergunta acrescenta um subseparador, e os
filtros, a ordenação e os formulários preenchidos a meio sobrevivem quando volta a uma lista. O URL
é apenas um reflexo cosmético (`history.replaceState`) do registo ativo.

| Propriedade | Valor |
| --- | --- |
| Id do componente | `cms-mcq` |
| Rota | `/melis-cms/mcq` |
| Rótulo | `MCQ` |
| forwardKey | `MelisCmsMcq/MelisCmsMcq` |
| melisKey | `meliscmsmcq_tool` (chave de controlo de acesso **e** portadora de direitos) |

> **Interruptor Novo / Antigo.** Na vista de lista, um utilizador sem restrições dispõe de um
> interruptor **New (React) / Old (iframe legado)**; a vista "Old" é a ferramenta clássica servida em
> `/melis/react-tool-page?key=meliscmsmcq_tool`. Os utilizadores com restrições veem sempre apenas a
> vista React.

## Bancada de trabalho do back-office

Uma bancada de trabalho React com quatro separadores, mais um cesto de **Questions Favorites** (uma
lista curta de marcadores por utilizador) no cabeçalho da ferramenta. Regra prática: criar
**perguntas** → agrupá-las (**grupos MCQ** / **categorias**) → montar um **MCQ** → **Preview** para o
realizar e ler a correção.

| Separador | O que gere |
| --- | --- |
| **MCQ** | Lista de testes montados (Id, Estado, Código, nome, data de criação, grupos, perguntas) com cartões de KPI, pesquisa, filtros de estado/data, gestor de colunas e exportação. **Add** abre o construtor de MCQ como subseparador. |
| **Questions** | Lista de perguntas com filtros por categoria / tipo / estado / dificuldade / etiquetas e pesquisa; uma ação de **marcador** alterna a pergunta em Questions Favorites. |
| **MCQ groups** | Pacotes de perguntas reutilizáveis (Id, Estado, Código, Nome). Cartões de KPI, exportação, **modal** de adicionar/editar. |
| **Question categories** | Agrupamentos nomeados de perguntas (Id, Estado, Código, Nome). Cartões de KPI, exportação, **modal** de adicionar/editar. |

![O separador Questions (React): lista de perguntas filtrável, com a ação de marcador do cesto.](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-questions.png)

### Editor de perguntas

**Add / edit** no separador Questions abre o editor como subseparador, com dois separadores:

| Separador do editor | Conteúdo |
| --- | --- |
| **Properties** | Código, **Type** (MCQ / Open Ended), **Category**, **Tags**, **Difficulty**, Estado |
| **Texts / Answers** | Texto da pergunta por idioma mais cada **answer** com o seu indicador **Correct answer (Yes/No)**, um código e um estado; arraste a pega para reordenar as respostas |

![Editor de perguntas — Properties (Type, Category, Tags, Difficulty, Status).](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-questions-edit-properties.png)

![Editor de perguntas — textos por idioma e a lista de respostas (alternador de resposta correta).](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-questions-edit-texts.png)

![Pega de arrastar-para-reordenar numa linha de resposta.](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-questions-edit-dragdroporderingicon.png)

### Construtor de MCQ

Separador **MCQ** → **Add** (ou editar uma linha) abre o construtor como subseparador, com três
separadores:

| Separador do construtor | Conteúdo |
| --- | --- |
| **Properties** | Nome, código, estado, **Minimum score required (%)** (taxa de aprovação) e um alternador de baralhamento aleatório **"change questions order at every MCQ creation"** |
| **Composition (Questions)** | Adicione **grupos**, depois preencha cada grupo arrastando perguntas dos painéis laterais **Questions Favorites** / **Search Questions**, ou clique em **Configure a random MCQ** para uma seleção automática por grupo |
| **Preview** | Realize o quiz montado, depois submeta para ver a **Correction** calculada pelo motor (pontuação, aprovado/reprovado, respostas do utilizador vs. corretas por pergunta). A interface React apenas a apresenta |

![Properties do construtor de MCQ — nome, pontuação mínima exigida (%), alternador de ordem aleatória.](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-mcq-edit-tab-properties.png)

![Composição do construtor de MCQ — grupos com as suas perguntas, mais os painéis Favorites / Search.](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-mcq-edit-tab-questions.png)

![Preview do construtor de MCQ — o quiz montado, pronto a ser realizado.](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-mcq-edit-tab-preview.png)

![Correção do Preview — pontuação, aprovado/reprovado e respostas do utilizador vs. corretas por pergunta.](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-mcq-edit-tab-preview-corrected.png)

O modal **Random Model** define linhas de critérios por grupo (Difficulty / Category / Tag / Number);
ao guardar, os IDs das perguntas correspondentes são resolvidos no servidor através do
`getRandomQuestionIds` do motor.

![O modal Random Model — seleção automática de perguntas por grupo segundo critérios.](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-mcq-edit-tab-questions-randommcq-modal.png)

> Uma gravação falha se não houver nome, nem grupo, ou se houver **qualquer grupo vazio** — as mesmas
> regras da ferramenta legada. A captura XML do MCQ (`mcq_xml`) é regenerada pelo motor a cada
> gravação, nunca escrita à mão. Criar ou eliminar uma categoria atualiza os dados de referência
> partilhados, de modo que apareça imediatamente no seletor de categorias do editor de perguntas.

## API React — endpoints

Todas as rotas são rotas-filhas de `melis-react-api` (fundidas a partir de `config/react-api.php`),
servidas por quatro controladores invocáveis. Contrato de resposta em toda a parte:
`{ success: bool, data: T, error?: string, fields?: string[] }`. Cada ação chama
`denyUnlessAccess()` (autenticação + `MelisCoreRights::canAccess('meliscmsmcq_tool')`) e depois uma
proteção de capacidade `denyUnlessCan(<cap>)`.

**MCQ** — `MelisReactApiMcqController`:

| Método · URL | Ação · cap | Objetivo |
| --- | --- | --- |
| `GET /melis/react-api/mcq` | `list` · `mcq` | lista por keyset |
| `GET /melis/react-api/mcq/stats` | `stats` · `mcq` | cartões de KPI |
| `GET /melis/react-api/mcq/groups` | `groups` · `mcq` | grupos selecionáveis no construtor |
| `GET /melis/react-api/mcq/:id` | `get` · `mcq` | detalhe completo (propriedades, nomes, grupos ordenados + perguntas) |
| `POST /melis/react-api/mcq/save` | `save` · `mcq.create` \| `mcq.edit` | criar/atualizar (regenera `mcq_xml`) |
| `POST /melis/react-api/mcq/evaluate` | `evaluate` · `mcq.preview.test` | pontuar um conjunto de respostas |
| `GET /melis/react-api/mcq/:id/preview` | `preview` · `mcq.preview` | o MCQ tal como é jogado (a partir do XML) |
| `DELETE /melis/react-api/mcq/delete/:id` | `delete` · `mcq.delete` | eliminar (em cascata) |

**Questions** (+ respostas, cesto, sorteio aleatório) — `MelisReactApiMcqQuestionController`, em
`/melis/react-api/mcq-questions[…]`: `list`/`stats`/`refs`/`get`/`save` (cap `questions`),
`delete` (`questions.delete`), e os endpoints de composição `basket`, `basket/toggle`,
`basket/clear`, `search`, `random`, `random-model` (todos cap `mcq.composition`). `refs` devolve os
dados de referência partilhados — tipos, dificuldades, categorias, etiquetas, idiomas, `nextCode`.

**MCQ groups** — `MelisReactApiMcqGroupController`: `list`/`stats`/`save`/`delete`/`related`/`get`
em `/melis/react-api/mcq-groups[…]` (caps `groups`, `groups.delete`).

**Question categories** — `MelisReactApiMcqCategoryController`:
`list`/`stats`/`save`/`delete`/`related`/`get` em `/melis/react-api/mcq-categories[…]`
(caps `categories`, `categories.delete`).

> ⚠ A ordem das rotas importa: os segmentos literais (`/stats`, `/save`, `/groups`, `/basket`,
> `/random`, `/evaluate`, `/refs`) são declarados **antes** da rota abrangente `/:id`, e todos os
> nomes têm o prefixo `mcq-*` para evitar colisões com as rotas genéricas de `melis-react-api`.

**A lógica de negócio permanece no servidor.** Estes controladores apenas validam a entrada, executam
uma transação e moldam o JSON; o trabalho real está nos serviços do motor que resolvem.

## Capacidades (direitos avançados)

O `config/react.capabilities.php` está indexado sob o nó de menu portador de direitos
**`meliscmsmcq_tool`** — a mesma melisKey que os controladores protegem. O acesso à própria
ferramenta continua a ser `MelisCoreRights::canAccess('meliscmsmcq_tool')`; estas capacidades
controlam o acesso a **componentes dentro** de uma ferramenta já autorizada. Permissão por
predefinição: um utilizador/função sem a secção de capacidades mantém tudo.

Cadeias de capacidade achatadas:

- **`mcq`**, `mcq.create`, `mcq.edit`, `mcq.delete`, `mcq.export`; `mcq.composition` (página de
  composição — controla também os endpoints do cesto + pesquisa/aleatório), `mcq.properties`,
  `mcq.preview`, `mcq.preview.test`
- **`questions`**, `questions.create`, `questions.edit`, `questions.delete`, `questions.export`;
  `questions.properties`, `questions.answers`
- **`groups`**, `groups.create`, `groups.edit`, `groups.delete`, `groups.export`
- **`categories`**, `categories.create`, `categories.edit`, `categories.delete`, `categories.export`

As quatro chaves de topo (`mcq`, `questions`, `groups`, `categories`) são os quatro separadores de
lista. O React lê-as via `useCaps(MELIS_KEY)` e oculta separadores/botões em conformidade; o
`denyUnlessCan()` do lado do servidor é a verdadeira aplicação.

## Serviços do motor utilizados

O MelisCmsMcq não regista serviços próprios — os seus controladores React resolvem aliases do
**MelisCmsMcqEngine** em tempo de execução:

| Alias do serviço do motor | Usado por este módulo para |
| --- | --- |
| `MelisCmsMcqQuestionsService` | CRUD de perguntas, lista do cesto, seleção aleatória (`getRandomQuestionIds`) |
| `MelisCmsMcqAnswersService` | CRUD de respostas (editor de perguntas) |
| `MelisCmsMcqQuestionCategoryService` | CRUD de categorias de perguntas |
| `MelisCmsMcqGroupsService` | CRUD de grupos MCQ |
| `MelisCmsMcqService` | CRUD de MCQ, geração de XML (`generateMcqXml`), obtenção (`getMcq`), pontuação (`evaluateAnswers`), eliminação (`deleteMcqById`) |

## Tabelas da base de dados

Todas as tabelas pertencem ao **MelisCmsMcqEngine**. As superfícies de back-office deste módulo
correspondem-lhes da seguinte forma:

| Tabela do motor | Superfície de BO que escreve nela |
| --- | --- |
| `melis_cms_mcq_questions` + `_trans` | Separador Questions + editor de perguntas |
| `melis_cms_mcq_answers` + `_trans` | Editor de respostas (dentro do editor de perguntas) |
| `melis_cms_mcq_question_groups` + `_trans` | Separador Question categories |
| `melis_cms_mcq_groups` + `_trans` | Separador MCQ groups (associado a um MCQ via `mcqg_mcq_id`) |
| `melis_cms_mcq` + `_trans` | Separador MCQ; teste montado armazenado como XML em `mcq_xml` |
| `melis_cms_mcq_questions_list` | Associação pergunta-a-grupo-MCQ |
| `melis_cms_mcq_baskets` | Questions Favorites por utilizador |

> **Cuidado com a nomenclatura.** As "Question categories" da interface correspondem a
> `melis_cms_mcq_question_groups`; os "MCQ groups" da interface correspondem a `melis_cms_mcq_groups`.
> Duas tabelas de "grupo" distintas com finalidades diferentes — consulte a documentação do
> MelisCmsMcqEngine.

## Integração com Tags

O `config/app.interface.php` regista uma associação **MelisCmsTags** para que as perguntas sejam
etiquetáveis (tipo de associação `MCQ_QUESTION`, tabela de entidade `melis_cms_mcq_questions`,
primária `mcqq_id`). A lista de Questions expõe uma coluna de **etiquetas** e um **filtro de
etiquetas** conduzidos por este registo; na ferramenta React as etiquetas fazem também parte do
payload `refs` da pergunta.

## Front office

O MelisCmsMcq não tem qualquer saída própria no front-office. O renderizador do quiz é um view helper
(`renderMcqQuestions`) registado no **MelisCmsMcqEngine**; o separador Preview usa-o através do motor.
Consulte a [referência do MelisCmsMcqEngine](/legacy/reference/modules/melis-cms-mcq-engine) para
detalhes de renderização no front-office.

## Ficheiros principais

| Área | Caminho |
| --- | --- |
| Rotas da API React + 4 controladores invocáveis | `config/react-api.php` |
| Mapa de capacidades de direitos avançados | `config/react.capabilities.php` |
| Arranque do módulo (funde as duas configurações acima) | `src/Module.php` |
| Trait de controlador partilhado (MELIS_KEY, denyUnlessAccess, json/error/tr) | `src/Controller/McqReactApiTrait.php` |
| MCQ list/get/save/preview/evaluate/delete | `src/Controller/MelisReactApiMcqController.php` |
| Perguntas + respostas + cesto + sorteio aleatório | `src/Controller/MelisReactApiMcqQuestionController.php` |
| Grupos MCQ | `src/Controller/MelisReactApiMcqGroupController.php` |
| Categorias de perguntas | `src/Controller/MelisReactApiMcqCategoryController.php` |
| Código-fonte do componente React (Vite IIFE) | `ui-react/src/` (`brick.tsx`, `McqPage.tsx`, `McqBuilder.tsx`, `QuestionEditor.tsx`, `mcq-api.ts`, …) |
| Pacote do componente compilado + manifesto | `public/ui-react/{brick.js, brick.manifest.json}` |
| Ferramenta legada (árvore, separadores, DataTables, vistas, JS) | `config/app.interface.php`, `config/app.tools.php`, `src/Controller/`, `view/`, `public/js/` |

Ver também: [melis-cms-mcq-engine](/legacy/reference/modules/melis-cms-mcq-engine),
[melis-cms-tags](/legacy/reference/modules/melis-cms-tags),
[melis-cms](/legacy/reference/modules/melis-cms),
[melis-core](/legacy/reference/modules/melis-core)
