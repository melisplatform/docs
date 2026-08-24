# MelisCmsMcqEngine

> Dados, serviços, instantâneos XML, pontuação e renderizador de questionários de front-office para o sistema de MCQ (questionários) — o backend por trás da ferramenta MCQ em React. Pacote `melisplatform/melis-cms-mcq-engine`.

## Objetivo

O MelisCmsMcqEngine é a **camada de dados e de serviços** do sistema de MCQ: detém as tabelas da base de dados,
os serviços de perguntas, respostas, MCQs, grupos e categorias, o **instantâneo XML** que congela
cada teste montado, o seletor de perguntas por **modelo aleatório**, a avaliação de **pontuação de respostas / taxa de aprovação**,
e o **renderizador de questionários de front-office**. Pense em MelisEngine ↔ MelisCms, mas para questionários.

O teste montado é armazenado como `mcq_xml`, para que a renderização e a pontuação leiam um instantâneo autossuficiente,
e não uma junção em tempo real, garantindo que o MCQ exato que um utilizador montou seja preservado mesmo que as perguntas
subjacentes venham a ser editadas mais tarde.

## Sem brick React — exposto através do MelisCmsMcq

Este motor **não tem interface de back-office própria** — nem legada nem React. Não inclui **nenhum**
`brick.manifest.json`, **nenhum** projeto `ui-react/`, **nenhum** `config/react-api.php` e **nenhum**
`config/react.capabilities.php`. **Não** é listado por `GET /melis/react-api/react-modules`,
não aparece em nenhum menu React e não contribui com nenhum nó de capacidade.

Em `/melis-react` a funcionalidade MCQ vive inteiramente na ferramenta **MelisCmsMcq** (barra lateral →
**MelisCms → MCQ**; brick `cms-mcq`, rota `/melis-cms/mcq`, `melisKey` `meliscmsmcq_tool`). Os
controladores `react-api` dessa ferramenta resolvem **os serviços deste motor** e delegam-lhes toda a lógica de negócio
— os mesmos serviços que a ferramenta legada usava. O caminho React → `react-api` → **serviço do motor**
simplesmente substitui o caminho legado jQuery/AJAX → controlador → **serviço do motor**; não existe código
de motor específico do React. Os direitos de acesso e as capacidades de direitos avançados vivem todos no nó
**MelisCmsMcq** (`meliscmsmcq_tool`), e não aqui — o `rightsDisplay` do motor é `'none'`.

## Ativá-lo

Adicione a `config/melis.module.load.php`:

```php
return [
    // …
    'MelisCmsMcqEngine',
];
```

Requer: `melisplatform/melis-cms` (`^5.3`), `melisplatform/melis-cms-tags` (`^5.3`),
`laminas/laminas-paginator`, PHP `^8.1|^8.3`. O módulo inclui `dbdeploy: true`, pelo que as suas tabelas são
criadas/atualizadas automaticamente. Cadeia de instalação: `melis-cms-mcq` → **`melis-cms-mcq-engine`** →
`melis-cms` + `melis-cms-tags`.

## Serviços principais

Todos os serviços estendem o serviço geral do MelisCore e disparam eventos `*_start` / `*_end`. Os aliases são
registados em `config/module.config.php` e são exatamente os pontos de entrada que os controladores React do MelisCmsMcq resolvem.

| Alias de serviço | Função | Consumido por (controlador React do MelisCmsMcq) |
| --- | --- | --- |
| `MelisCmsMcqService` | MCQs: guardar, eliminar, listar, gerar/obter XML de MCQ, baralhar ordem, avaliar respostas (pontuação). | `MelisReactApiMcqController` |
| `MelisCmsMcqQuestionsService` | Perguntas: CRUD, geração de XML, cesto, seletor por modelo aleatório. | `MelisReactApiMcqQuestionController` |
| `MelisCmsMcqAnswersService` | Respostas: CRUD, verificação de resposta correta, contagem de respostas por pergunta. | `MelisReactApiMcqQuestionController` |
| `MelisCmsMcqGroupsService` | Grupos de MCQ: CRUD, montar grupos+perguntas para um MCQ, desativar MCQs relacionados. | `MelisReactApiMcqGroupController` |
| `MelisCmsMcqQuestionCategoryService` | Categorias de perguntas (tabela `melis_cms_mcq_question_groups`): CRUD. | `MelisReactApiMcqCategoryController` |

### Métodos selecionados

**`MelisCmsMcqService`**

| Método | Função |
| --- | --- |
| `getMcq($mcqId)` | Devolve o XML do MCQ montado; baralha a ordem das perguntas se `mcq_random_order` estiver definido. |
| `generateMcqXml($mcqProperties, $mcqTrans, $groupsData)` | Constrói o XML completo do teste a partir dos grupos + perguntas e armazena-o em `mcq_xml`. |
| `evaluateAnswers($mcqXml, $userAnswers, $passingPercentage)` | Pontua uma submissão do tipo MCQ; ignora as de resposta aberta (Open Ended); devolve a pontuação + aprovado/reprovado. |
| `xmlToArray($mcqXml)` | Analisa o instantâneo congelado `mcq_xml` para um array (usado pela Pré-visualização em React). |
| `getMcqList` / `saveMcqItem` / `deleteMcqById` | Listagem/gravação/eliminação padrão. |

**`MelisCmsMcqQuestionsService`**

| Método | Função |
| --- | --- |
| `generateQuestionXml()` | Constrói o instantâneo XML por pergunta ao guardar. |
| `updateMcqQuestionDataXml()` | Atualiza o instantâneo da pergunta dentro de cada MCQ que a utiliza. |
| `getRandomQuestionIds($difficultyId, $categoryId, $tagId, $numberOfQuestions, $excludedIds)` | Seleciona automaticamente N IDs de perguntas por dificuldade / categoria / etiqueta. |
| `generateRandomQuestions($userId, $difficultyId, $categoryId, $tags, $numberOfQuestions, $langId, $alreadySelected)` | Seletor aleatório de nível superior com lista de exclusão. |
| `getQuestionsBasketList` / `processBasketQuestions` | Gere o cesto de perguntas por utilizador (carrinho). |

## Como a ferramenta MCQ em React usa este motor

Os controladores React do MCQ tratam do JSON de entrada/saída e delegam toda a lógica ao motor. Os principais
pontos de contacto do lado do servidor (de `melis-cms-mcq/src/Controller/MelisReactApi*Controller.php`):

```php
// POST /melis/react-api/mcq/save  → MelisReactApiMcqController::saveAction()
$mcqService = $this->getServiceManager()->get('MelisCmsMcqService');
$mcqXml = $mcqService->generateMcqXml($mcqProperties, $mcqTrans, $groupsData); // engine assembles snapshot

// POST /melis/react-api/mcq/evaluate  → evaluateAction()
$result = $mcqService->evaluateAnswers($xml, $answers, $passing);              // engine scores; React displays

// GET  /melis/react-api/mcq/:id/preview  → previewAction()
$xml    = $mcqService->getMcq($id);            // frozen test XML (shuffled if mcq_random_order)
$parsed = (array) $mcqService->xmlToArray($xml);

// POST /melis/react-api/mcq-questions/random  → MelisReactApiMcqQuestionController::randomAction()
$ids = $questionService->getRandomQuestionIds($difficulty, $category, $tagId, $count, $exclude);
```

A **Pré-visualização** em React renderiza diretamente o `mcq_xml` já analisado (`getMcq` + `xmlToArray`); **não**
invoca o view helper `renderMcqQuestions` do motor — esse helper é apenas o renderizador de front-office /
website, e não é alterado pelo back-office em React.

## Front office

| Item | Função |
| --- | --- |
| View helper `renderMcqQuestions` (`McqQuestionRendererHelper`) | Converte `mcq_xml` num array e renderiza o questionário através do modelo escolhido. Sem MelisTemplatingPlugin — o modelo anfitrião decide a colocação. |
| Modelo predefinido | `view/templates/default-preview-template.phtml` |
| Fábrica de elemento de formulário `McqPreviewTemplatesSelect` | Preenche um select com os modelos registados em `mcq_preview_templates` no `app.interface.php`. |

Fábricas de elementos de formulário adicionais que o motor regista: `McqQuestionCategoriesSelect`,
`McqQuestionsDifficultySelect`, `QuestionsTypesSelect`. A ferramenta React constrói as suas próprias referências JSON
(tipos, dificuldades, categorias) em vez de renderizar estes elementos select do Laminas, mas os
dados subjacentes do motor (tipos 1=MCQ / 2=Open Ended, dificuldades Easy/Medium/Hard, categorias) são
os mesmos. O `app.interface.php` do motor continua a registar o plugin `meliscmsmcqengine` com
`datas` (`mcq_groups.default_group_lists`, `mcq_preview_templates`) — predefinições que a ferramenta MCQ respeita
independentemente do front-end.

## Tabelas da base de dados

> **Nota sobre a nomenclatura.** As "Categorias de perguntas" do back-office correspondem a `melis_cms_mcq_question_groups`
> (serviço `MelisCmsMcqQuestionCategoryService`). Os "Grupos de MCQ" do back-office correspondem a
> `melis_cms_mcq_groups` (serviço `MelisCmsMcqGroupsService`). Duas tabelas de "grupo" distintas —
> não as confunda.

| Tabela | Contém |
| --- | --- |
| `melis_cms_mcq` | Um MCQ/teste: `mcq_status`, `mcq_code`, `mcq_random_order`, **`mcq_xml`** (instantâneo do teste montado), `mcq_passing_rate`, datas/utilizadores. |
| `melis_cms_mcq_trans` | Nome do MCQ por idioma (`mcqt_name`). |
| `melis_cms_mcq_questions` | Uma pergunta: `mcqq_status`, `mcqq_code`, `mcqq_type`, `mcqq_group_id`, `mcqq_difficulty_id`, **`mcqq_xml`** (instantâneo da pergunta+respostas). |
| `melis_cms_mcq_questions_trans` | Texto da pergunta, `mcqqt_candidate_note`, `mcqqt_corrector_note` por idioma. |
| `melis_cms_mcq_answers` | Uma resposta: `mcqa_question_id`, `mcqa_status`, `mcqa_correct_answer`, `mcqa_code`. |
| `melis_cms_mcq_answers_trans` | Texto da resposta por idioma (`mcqat_answer_text`). |
| `melis_cms_mcq_question_types` | Tipos de pergunta: 1 = MCQ, 2 = Open Ended. |
| `melis_cms_mcq_questions_difficulty` (+`_trans`) | Dificuldades: 1 = Easy, 2 = Medium, 3 = Hard. |
| `melis_cms_mcq_question_groups` (+`_trans`) | Categorias de perguntas (`mcqqg_id`, `mcqqg_code`, `mcqqgt_name`). |
| `melis_cms_mcq_groups` (+`_trans`) | Grupos de MCQ (`mcqg_id`, `mcqg_mcq_id`, `mcqg_code`, `mcqgt_name`), associados a um MCQ específico. |
| `melis_cms_mcq_questions_list` | Liga perguntas ↔ um MCQ (`mcmql_mcq_id`, `mcmql_question_id`). |
| `melis_cms_mcq_groups_list` | Liga grupos dentro de um MCQ (adicionada por migração). |
| `melis_cms_mcq_questions_tags_list` | Ligações pergunta ↔ etiqueta (MelisCmsTags). |
| `melis_cms_mcq_baskets` | Cesto de perguntas por utilizador (carrinho). |

## Exemplo

```php
$sm = $this->getServiceLocator();

// --- Fetch and render a quiz on a website ---
$mcqSvc = $sm->get('MelisCmsMcqService');
$mcqXml = $mcqSvc->getMcq($mcqId); // shuffles if mcq_random_order is set

// In a phtml template:
echo $this->renderMcqQuestions(
    'MelisCmsMcqEngine/default-template',
    $mcqXml,
    $langId
);

// --- Score a submission ---
$result = $mcqSvc->evaluateAnswers($mcqXml, $userAnswers, 50);
// $result['global']  => ['score', 'pass', 'total', 'checked', 'skipped']
// $result['details'] => per-question outcome

// --- Random model: auto-select N questions ---
$qSvc = $sm->get('MelisCmsMcqQuestionsService');
$ids  = $qSvc->getRandomQuestionIds($difficultyId, $categoryId, $tagId, $numberOfQuestions, $excludedIds);
```

## Ficheiros-chave

| Aspeto | Caminho |
| --- | --- |
| Ligação do módulo + aliases de serviço | `vendor/melisplatform/melis-cms-mcq-engine/config/module.config.php` |
| Configuração do plugin (grupos predefinidos, modelos de pré-visualização) | `vendor/melisplatform/melis-cms-mcq-engine/config/app.interface.php` |
| Serviço de MCQ (XML, pontuação) | `vendor/melisplatform/melis-cms-mcq-engine/src/Service/MelisCmsMcqService.php` |
| Serviço de perguntas (cesto, modelo aleatório) | `vendor/melisplatform/melis-cms-mcq-engine/src/Service/MelisCmsMcqQuestionsService.php` |
| Serviço de respostas | `vendor/melisplatform/melis-cms-mcq-engine/src/Service/MelisCmsMcqAnswersService.php` |
| Serviço de grupos | `vendor/melisplatform/melis-cms-mcq-engine/src/Service/MelisCmsMcqGroupsService.php` |
| Serviço de categorias de perguntas | `vendor/melisplatform/melis-cms-mcq-engine/src/Service/MelisCmsMcqQuestionCategoryService.php` |
| Gateways de tabela | `vendor/melisplatform/melis-cms-mcq-engine/src/Model/Tables/` |
| Fábricas de elementos de formulário | `vendor/melisplatform/melis-cms-mcq-engine/src/Form/Factory/` |
| View helper | `vendor/melisplatform/melis-cms-mcq-engine/src/View/Helper/McqQuestionRendererHelper.php` |
| Modelo de front predefinido | `vendor/melisplatform/melis-cms-mcq-engine/view/templates/default-preview-template.phtml` |
| Instalação da BD + migrações | `vendor/melisplatform/melis-cms-mcq-engine/install/dbdeploy/` |

Ver também: [Referência de módulos](/pt/reference/modules) · [MelisCmsMcq](/pt/reference/modules/melis-cms-mcq) ·
[MelisCms](/pt/reference/modules/melis-cms)
