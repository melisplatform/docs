# IA: agentes e motor

O Melis inclui um **motor de IA** que lhe permite construir **agentes** — fluxos de trabalho de IA programados e com múltiplos passos —
e disponibilizá-los em qualquer parte do back-office ou nos seus próprios módulos. Diferentes fornecedores (Anthropic
Claude, Google Gemini, Ollama, OCI) integram-se por trás de um único motor.

Os módulos envolvidos: `melis-ai` (ferramentas React no back-office + o Assistente de IA global),
`melis-ai-engine` (o motor e a interface de chat partilhada),
`melis-ai-engine-claude` / `melis-ai-engine-gemini` (fornecedores) e
`melis-ai-community-extensions` (agentes de exemplo prontos a usar).

Na v6 a framework e os módulos permanecem inalterados; o que mudou foi o **back-office**, agora uma interface React
em `/melis-react`. A lógica de IA continua no lado do servidor — o React é apresentação mais chamadas de API.

## Conceitos essenciais

| Conceito | O que é | Tabela |
| --- | --- | --- |
| **Empresa / fornecedor** | O fornecedor de IA (Anthropic, Google…). | `melis_ai_companies` |
| **Modelo** | Um modelo concreto de uma empresa (por exemplo, um modelo Claude ou Gemini). | `melis_ai_models` (`mam_generative_model`) |
| **Chave de plataforma** | A chave de API usada para chamar um fornecedor. | `melis_ai_platform_keys` |
| **Agente** | Um fluxo de trabalho = uma lista ordenada de **passos de cenário**. | `melis_ai_agents`, `melis_ai_scenario_steps` |
| **Instância** | Um identificador reutilizável e nomeado para executar um agente (usado como o id da sessão de chat). | `melis_ai_instances` (`mai_instance_id`) |
| **Utilização diária** | Contabilização de tokens/utilização por modelo/agente/instância. | `melis_ai_daily_usage` |

Um **agente** é um *cenário*: uma sequência de passos como `ENTRY PARAMS`, `AI CONTEXT`,
`AI CHAT`, `CODE`, `EXIT PARAMS`. O motor percorre os passos, chama o modelo quando necessário e
produz uma resposta final — opcionalmente escrevendo-a de volta na página que o iniciou (através de *parâmetros
de saída*).

## Fornecedores

O motor escolhe um fornecedor a partir do nome da **empresa** do modelo
(`MelisAIEngine\Service\MelisAIEngineService::getActiveModelClass()`):

- a empresa contém **"Anthropic"** → `MelisAIEngineModelClaudeService` (módulo `melis-ai-engine-claude`)
- a empresa contém **"Google"** → `MelisAIEngineModelGeminiService` (módulo `melis-ai-engine-gemini`)
- além de módulos de fornecedor **Ollama** (local) e **OCI** (OCI GenAI) que seguem o mesmo contrato

Cada fornecedor estende o `MelisAIEngineModelService` do `melis-ai-engine` e implementa o mesmo
contrato (`setClient()`, formatação de payload/mensagens, chamadas de ferramentas). Adicionar um novo fornecedor significa
adicionar um módulo com o seu próprio serviço de modelo — sem alterações ao motor. Os fornecedores **não têm interface
própria**: instalar um alimenta o catálogo com a sua empresa + modelos, que depois aparecem como
opções na administração do MelisAI.

## Onde reside no back-office React

Em `/melis-react`, o MelisAI inclui **um pacote de bricks** que expõe **três ferramentas nativas em React** na
barra lateral esquerda, na secção **Melis AI** — **Admin**, **AI Agents**, **MCP Inspector** — **além
de uma sobreposição global do Assistente de IA**. Cada ferramenta de menu tem um alternador **New / Old**: *New* é a interface
React, *Old* abre a ferramenta clássica num iframe.

![A secção de menu do Melis AI](/screenshots/react/melis-ai/melisai-menu-section-melisai.png)

As ferramentas aparecem apenas quando o MelisAI está ativo. Uma quarta entrada — **AI Tool Creator** — é fornecida
por um módulo diferente (`melis-ai-tool-creator`).

## Configurá-lo (Admin)

Abra **Melis AI → Admin**. Um único alternador **New/Old** aplica-se a toda a ferramenta; a vista React é
uma estrutura de separadores — **Usage · Platform AI · Instances · MCP Server · Chat dev tool** — com um único **Save**
para o separador ativo.

- **Platform AI** — escolha uma **Company + Model**, cole a(s) **chave(s) de API**
  (`melis_ai_platform_keys`) e defina a plataforma como **Active** + **Default**. Um modelo tem de ter uma chave
  para estar ativo. O painel à direita gere os carregamentos de ficheiros — incluindo **Upload mode: File API vs Embed in
  request** (o Gemini usa por predefinição a File API, o Claude o embed).

  ![Admin → Platform AI](/screenshots/react/melis-ai/melisai-tool-admin-tab-platformai.png)

- **Instances** — gira as instâncias nomeadas usadas para iniciar agentes. A tabela lista o
  **Name ID** de cada instância (o `mai_instance_id`) e o agente associado; **+ New instance** abre um
  formulário React (Name, Instance ID, Status, Agent, rótulo por idioma).

  ![Admin → Instances](/screenshots/react/melis-ai/melisai-tool-admin-tab-instances.png)

- **Usage** — consumo de tokens/consultas, total e por instância, ao longo de um intervalo selecionável.
- **MCP Server** — escolha que funções MCP o servidor expõe e marque as tabelas sensíveis.
- **Chat dev tool** — uma consola de chat para programadores que mostra o payload de IA em bruto e a resposta lado a
  lado; a forma mais rápida de ver o que o modelo realmente recebeu e respondeu.

## Construir um agente (AI Agents)

Em **Melis AI → AI Agents** constrói o **cenário** de um agente. A lista mostra os agentes fornecidos
com a respetiva contagem de passos e número de chamadas ao longo do tempo; abrir um adiciona um sub-separador com um editor de cinco separadores —
**Config · AI Tools · DB Rights · Scenario · Run**.

![Lista de AI Agents](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents.png)

- **Config** — nome, código, descrição, uma substituição opcional de modelo e alternadores de carregamento de ficheiros.
- **AI Tools** — assinale as ferramentas que este agente pode chamar, agrupadas em **MCP tools** e **Local tools**; o
  motor oferece então exatamente essas ao modelo.
- **DB Rights** — leitura / escrita / eliminação / drop por tabela, além de um interruptor global *Allow table creation*.
  A escrita, a eliminação de linhas e o drop são irreversíveis.
- **Scenario** — os passos ordenados e tipados: **ENTRY PARAMS** → um ou mais **AI CONTEXT** (sistema/conhecimento
  silencioso) → **AI CHAT** (o turno visível) → **EXIT PARAMS**, com passos **CODE** opcionais. Arraste para reordenar; cada passo tem um **Code** que referencia com `[CODE]` para trazer a resposta de um
  passo anterior para um prompt posterior.

  ![Agente → Scenario](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-scenario.png)

- **Run** — um chat de teste em direto contra o agente (a instância `agenttool`), para que possa iterar sobre o
  cenário e as ferramentas sem sair do editor.

## O Assistente de IA

O **Assistente de IA** global é um botão flutuante no canto inferior direito de todos os ecrãs (não tem entrada de menu). Abre um painel de chat que executa o **Main Chat Assistant** geral (instância
`mainchatassistantgeneral`) e pode conduzir o back-office — abrir uma ferramenta, abrir uma página — diretamente a partir
da conversa. Mantém-se montado ao longo das navegações, pelo que uma sessão aberta sobrevive à mudança de ferramenta.

![Painel do Assistente de IA aberto](/screenshots/react/melis-ai/melisai-footer-icon-generalassistant-deployed.png)

## Usar um agente a partir do seu código

A integração mais simples no lado do servidor continua a ser o **view helper `AIChatViewHelper`**
(`melis-ai-engine/src/View/Helper/MelisAIChatViewHelper.php`). Coloque-o numa vista `.phtml` para
apresentar um chat pronto a usar associado a uma instância:

```php
<?= $this->AIChatViewHelper(
    $maiInstanceId,        // instance id from melis_ai_instances.mai_instance_id
    $agentId = null,       // optional explicit agent id
    $extraEntryParams = [],// custom_text / custom_files / custom_data
    $debugMode = false,
    $exitParamArr = []     // where to write the result back (fields, js/route callbacks)
) ?>
```

Um padrão comum é **delimitar a sessão por objeto** acrescentando um id ao sufixo do id da instância,
por exemplo `"newscontentcreator|".$newsId` — para que cada notícia mantenha a sua própria conversa.

No back-office React, o equivalente é o componente **`AiChatContainer`** exportado pelo
`melis-ai-engine` (através do alias Vite `@melis-ai-engine`). Monte-o com um `maiInstanceId` e ele
executa todo o ciclo `init → run → (continue×N) → validate` contra os
endpoints `/melis/react-api/ai-engine/*` — sem necessidade de trabalho no backend:

```tsx
import { AiChatContainer } from '@melis-ai-engine'

<AiChatContainer maiInstanceId="newscontentcreator|42" clearSession autoRun />
```

::: tip Exemplo real
O `melis-ai-community-extensions` inclui agentes funcionais — por exemplo, um *news content creator* que recebe um
prompt + imagens e escreve o texto gerado de volta no formulário de notícias através de um callback de saída. Leia
`vendor/melisplatform/melis-ai-community-extensions/src/Controller/NewsController.php` para ver o
helper usado de ponta a ponta.
:::

Programaticamente, o motor é conduzido através do
`MelisAIEngine\Service\MelisAIEngineAgentService` (`runAgent()`, `validateAnswer()`,
`continueConversation()`, `restartAgent()`, `getFinalAnswer()`), construído por agente + instância, com
o estado da conversa persistido num armazenamento suportado por base de dados (`MelisAIEngineConversationStore`) em vez de sessões
PHP. Tanto o view helper clássico como o contentor de chat React chamam este mesmo serviço.

## Ferramentas

Os agentes podem chamar **ferramentas** (funções) durante uma execução — incluindo **ferramentas MCP** para operações de ficheiros e base de dados. Use o **MCP Inspector** (Melis AI → MCP Inspector) para confirmar que um servidor está a funcionar e que as suas ferramentas
são detetáveis antes de as permitir num agente. Consulte a página dedicada [MCP](./mcp).

## Ficheiros essenciais

| Assunto | Caminho |
| --- | --- |
| Serviço do motor | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineService.php` |
| Execução de agentes | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineAgentService.php` |
| View helper de chat | `vendor/melisplatform/melis-ai-engine/src/View/Helper/MelisAIChatViewHelper.php` |
| Contentor de chat React | `vendor/melisplatform/melis-ai-engine/ui-react/src/AiChatContainer.tsx` |
| Backend de chat React | `vendor/melisplatform/melis-ai-engine/src/Controller/React/MelisReactApiAiEngineController.php` |
| Fornecedor Claude | `vendor/melisplatform/melis-ai-engine-claude/src/Service/MelisAIEngineModelClaudeService.php` |
| Fornecedor Gemini | `vendor/melisplatform/melis-ai-engine-gemini/src/Service/MelisAIEngineModelGeminiService.php` |
| Bricks do back-office React | `vendor/melisplatform/melis-ai/ui-react/src/` |
| Agentes de exemplo | `vendor/melisplatform/melis-ai-community-extensions/` |

> Para o back-office clássico (iframe) de qualquer uma destas ferramentas, use o alternador **Old** de cada ferramenta — o
> comportamento legado está documentado em [/legacy](/legacy/guide/ai). Leia o código dos módulos para a
> API exata e atual — consulte a [Referência de módulos](../reference/modules).
