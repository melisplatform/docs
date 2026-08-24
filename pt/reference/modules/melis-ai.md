# MelisAI

> Back-office em React para a suite MelisAI — ligue fornecedores, desenhe agentes, implemente instâncias, monitorize a utilização, inspeccione servidores MCP e converse a partir de qualquer lugar. Pacote `melisplatform/melis-ai`.

## Objetivo

O MelisAI é a **camada de gestão do back-office** da suite MelisAI. Não executa modelos de IA por si próprio — esse é o papel do `melis-ai-engine` e dos seus módulos de fornecedor. Fornece a interface e os serviços para interligar todo o sistema de IA: ligar um fornecedor (**Platform AI**), construir comportamentos (**AI Agents** com cenários e listas de permissões de ferramentas), implementá-los como **Instances** com nome, monitorizar a **Usage**, depurar com um chat de payload em bruto (**Chat Dev Tool**) e inspeccionar os **servidores MCP** ligados.

No **back-office em React** (`/melis-react`), o MelisAI é distribuído como um **único bundle multi-brick** que expõe três ferramentas de menu nativas em React — **Admin**, **AI Agents**, **MCP Inspector** — cada uma com um interruptor **New / Old** para a sua ferramenta legada num iframe, **além de uma sobreposição global de AI Assistant** (um botão flutuante de chat presente em todos os ecrãs, sem entrada de menu). A lógica de IA permanece do lado do servidor, no `melis-ai-engine`.

## Ativá-lo

Adicione a `config/melis.module.load.php` (os módulos de fornecedor têm de ser listados antes do `MelisAI`):

```php
return [
    'MelisAIEngine',
    'MelisAIEngineClaude',   // Anthropic provider
    'MelisAIEngineGemini',   // Google provider
    'MelisAI',
];
```

O `MelisAI` requer o `melisplatform/melis-ai-engine`, que detém todas as tabelas de base de dados `melis_ai_*` e o runtime de agentes/cenários. Os módulos de fornecedor (`melis-ai-engine-claude`, `melis-ai-engine-gemini`, `-ollama`, `-oci`) implementam o contrato de fornecedor e têm de estar instalados para as respetivas empresas.

## Os quatro conceitos centrais

| Conceito | Tabela | Coluna-chave | Descrição |
| --- | --- | --- | --- |
| **model** | `melis_ai_models` (`mam_*`) | `mam_generative_model` | Uma linha de modelo de fornecedor: empresa (Anthropic / Google), string do modelo, ligação à chave de API, indicador de predefinição, definições de upload de ficheiros. |
| **agent** | `melis_ai_agents` (`maa_*`) | `maa_agent_tools` (lista de permissões JSON) | Um comportamento: nome, código do agente, substituição opcional do modelo, passos de cenário ordenados, lista de permissões de ferramentas. |
| **instance** | `melis_ai_instances` (`mai_*`) | `mai_instance_id` | Uma implementação nomeada de um agente. A string `mai_instance_id` é a chave estável que todas as interfaces referenciam (por exemplo, `mainchatassistantgeneral`, `aitoolcreator`). |
| **tool** | `melis_ai_tools` (`mat_*`) | — | Uma função invocável que o modelo pode chamar. Pode ser **MCP** (servidor MCP externo, `mcp: true`) ou **Local** (PHP integrado). |

**Modelo mental numa frase:** uma instância aponta para um agente, um agente aponta para um modelo, um modelo nomeia uma empresa — o que escolhe o fornecedor; um chat na instância executa o cenário do agente, chamando as ferramentas permitidas do agente.

## Onde reside no back-office em React

O MelisAI distribui **um** bundle de bricks (`public/ui-react/brick.js`) cujo manifesto declara um array `bricks: [...]` — quatro registos que se auto-registam em `brick.tsx`:

| ID do brick | Rota | melisKey | Tipo |
| --- | --- | --- | --- |
| `ai-admin` | `/melis-ai/admin` | `melisadmin_tool` | shell de separadores nativo em React (Usage / Platform AI / Instances / MCP Server / Chat dev tool) |
| `ai-agents` | `/melis-ai/ai-agents` | `melisagent_tool` | lista + editor nativos em React (sub-separadores) |
| `mcp-inspector` | `/melis-ai/mcp-inspector` | `melis_mcp_inspector_tool` | nativo em React (função única) |
| `ai-assistant` | *(nenhuma)* | — | **Sobreposição** — o FAB global de chat flutuante, sem rota, sem entrada de menu |

As três ferramentas com rota aparecem no menu esquerdo em **Melis AI** (a par de **AI Tool Creator**, contribuído pelo módulo separado `melis-ai-tool-creator`). O assistente é renderizado uma única vez na raiz do shell, para que o chat flutuante sobreviva à navegação. Todas aparecem apenas quando o MelisAI está ativo (descoberta de bricks via `GET /melis/react-api/react-modules`). Cada ferramenta de menu inclui um interruptor **New / Old**: **New** = a interface em React, **Old** = a ferramenta clássica num iframe.

![A secção Melis AI na barra lateral em React — Admin, AI Agents, MCP Inspector, AI Tool Creator](/screenshots/react/melis-ai/melisai-menu-section-melisai.png)

## Admin — configurar a IA

Rota `/melis-ai/admin`. Um shell de separadores nativo em React — **Usage · Platform AI · Instances · MCP Server · Chat dev tool** — com um único Save (guarda o separador ativo) e um interruptor New/Old ao nível de toda a ferramenta.

- **Usage** — filtrar por Company/Model num intervalo; quatro gráficos: Total Queries, Queries per Instance, Total Tokens, Tokens per Instance (as séries por instância são as suas instâncias implementadas). Suportado por `melis_ai_daily_usage`.

![Admin → separador Usage — filtros Company/Model e quatro gráficos (consultas e tokens, total e por instância) num intervalo selecionável](/screenshots/react/melis-ai/melisai-tool-admin-tab-usage.png)

- **Platform AI** — ativar a IA: escolha Company + Model, opte por *Same key for all platforms* ou *One key per platform*, cole a(s) chave(s), defina **Status: Active** + **Default model: Yes**. Além disso, **Upload management** — interruptores de ficheiros de utilizador/contexto e **Upload mode: File API vs Embed in request** (o `mam_file_upload_mode` que os fornecedores leem; o Gemini usa por predefinição File API, o Claude usa embed) e o tamanho máximo de ficheiro.

![Admin → separador Platform AI — empresa/modelo/chaves à esquerda, interruptores Status + Default e File Upload Management (File API vs Embed in request, tamanho máximo) à direita](/screenshots/react/melis-ai/melisai-tool-admin-tab-platformai.png)

- **Instances** — cartões de KPI (Total / Active / Inactive), pesquisa, filtros e **+ New instance**. Seis são fornecidas por predefinição: três instâncias **system** (apenas edição, sem eliminação: `admintool`, `agenttool`, `mainchatassistantgeneral`) e três instâncias **app** (elimináveis: `aitoolcreator`, `minitemplatecreator`, `newscontentcreator`). Editar abre um formulário em sub-separador: **Name**, **Instance ID** (o `mai_instance_id`), **Status**, **Agent** (opcional) e um **Label** por idioma.

![Admin → separador Instances — cartões de KPI, pesquisa + filtros, e as seis instâncias fornecidas (system + app) com o respetivo Name ID e agente associado](/screenshots/react/melis-ai/melisai-tool-admin-tab-instances.png)

![Admin → Instances — formulário de edição: Name, Instance ID, Status, Agent e traduções por idioma](/screenshots/react/melis-ai/melisai-tool-admin-tab-instances-edit.png)

- **MCP Server** — dois sub-separadores: **MCP Exposition** (assinalar que funções MCP o servidor MCP expõe aos clientes) e um separador **DB / sensitive tables**; cada um tem o seu próprio Save.
- **Chat Dev Tool** — um chat de depuração: escolha um agente, converse e leia lado a lado o **raw AI PAYLOAD** exato (`tools` / `functionDeclarations`, contexto) e o JSON de **AI RESPONSE**.

![Admin → Chat Dev Tool — escolha um agente, converse à esquerda e leia o payload de IA em bruto (functionDeclarations, tools, contexto) à direita](/screenshots/react/melis-ai/melisai-tool-admin-tab-chatdevtool.png)

## AI Agents — desenhar o comportamento

Rota `/melis-ai/ai-agents`. A lista mostra **ID / Status / Name / Entries / Call number** (Entries = passos de cenário, Call number = chamadas de IA ao longo da vida) com cartões de KPI, pesquisa, filtros e Export. Abrir um agente adiciona um sub-separador com um editor de cinco separadores e um único Save.

![Lista de AI Agents — cartões de KPI, pesquisa/filtros e os agentes fornecidos (Tool Builder, Mini-template Creator, News Content Creator, Main Chat Assistant) com contagem de passos e número de chamadas](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents.png)

| Separador | Objetivo |
| --- | --- |
| **Config** | Nome do agente, código do agente (slug estável), descrição, **Override default AI model** (Company + Model), interruptores de upload de ficheiros, interruptor Active. |
| **AI Tools** | A lista de permissões de capacidades — assinale as ferramentas que este agente pode chamar, agrupadas em **MCP tools** (servidas por servidores MCP) e **Local tools** (PHP integrado). O motor oferece ao modelo exatamente as ferramentas assinaladas. |
| **DB Rights** | Caixas de seleção por tabela **read / write / delete row / drop** agrupadas por módulo, um interruptor global **Allow table creation**, tratamento de tabelas sensíveis, pesquisa e Expand/Collapse all. |
| **Scenario** | Passos tipados e ordenados, com arrastar-para-reordenar e edição/eliminação por linha: `ENTRY PARAMS` → `AI CONTEXT` (silencioso) → `AI CHAT` (visível) → `EXIT PARAMS`, além de passos `CODE` opcionais. Cada passo tem um **Code** que referencia com `[CODE]` para obter a resposta de um passo anterior. Editar um passo abre uma janela modal (Code, Return type, Type of entry, AI Prompt com um editor General + substituições por idioma). |
| **Run** | Um chat de teste no local contra o agente (com um *Custom step end prompt* opcional), a executar o mesmo chat nativo que o assistente. |

![Editor de agente → separador Config — Status, nome/código/descrição do agente, substituição de modelo (company + model) e interruptores de upload de ficheiros](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-config.png)

![Editor de agente → separador AI Tools — uma lista de verificação de MCP tools e Local tools; o cabeçalho mostra quantas do catálogo estão assinaladas](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-aitools.png)

![Editor de agente → separador DB Rights — caixas de seleção read/write/delete/drop por tabela agrupadas por módulo, o interruptor global "Allow table creation" e o tratamento de tabelas sensíveis](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-dbrights.png)

![Editor de agente → separador Scenario — passos ordenados e tipados (ENTRY PARAMS, AI CONTEXT, CODE, AI CHAT, EXIT PARAMS) com arrastar-para-reordenar e edição/eliminação por linha](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-scenario.png)

![Editor de agente → janela modal de edição de passo — Code, Return type, Type of entry e o AI Prompt com separadores General + por idioma](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-scenario-editstep.png)

![Editor de agente → separador Run — um chat de teste no local com uma caixa "Custom step end prompt" e Relaunch, a executar o agente ao vivo](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-run.png)

### Catálogo de ferramentas fornecidas

| Grupo | Ferramentas |
| --- | --- |
| **MCP — esquema/dados de BD** | `getTableStructure`, `createDatabaseTable`, `addDBTableColumns`, `updateDBTableColumns`, `dropDBTableColumns`, `selectData`, `insertData`, `updateData`, `deleteData`, `bulkInsertData` |
| **MCP — sistema de ficheiros** | `createFile`, `createDirectory`, `pathExists`, `readFile`, `updateFiles`, `deleteFile`, `deleteDirectory` |
| **MCP — site/mini-template** (CommunityExtensions) | `readSiteAssets`, `getSitePublicUrl`, `uploadMinitemplateImages`, `renderMinitemplatePreview` |
| **MCP — construtor de módulos** (ToolCreator) | `createModule`, `activateModule`, `deactivateModule`, `generateBundle` |
| **Local** | `activate_module` |

## MCP Inspector

Rota `/melis-ai/mcp-inspector`. Uma página nativa em React (com interruptor New/Old) que lista os **servidores MCP** ligados e permite iniciar / verificar o estado / ler registos — para confirmar que um servidor está ativo e que as suas ferramentas são detetáveis antes de as permitir num agente. Suportado pelo `MelisAIEngineMcpService` do motor.

## AI Assistant — conversar a partir de qualquer lugar

O botão flutuante **AI Assistant** (canto inferior direito, em todos os ecrãs) abre um painel de chat que executa o **Main Chat Assistant** geral (agente com id `1`, instância `mainchatassistantgeneral`). Pode conduzir o back-office (abrir uma ferramenta, abrir uma página) a partir da conversa, despachado do lado do host via `window.melisReactActionMap`. Minimize mantém a sessão, New session começa de novo, Close termina-a.

![O botão flutuante global de AI Assistant (canto inferior direito do shell) — um ícone de robô com o logótipo em gradiente "M" do MelisAi](/screenshots/react/melis-ai/melisai-footer-icon-generalassistant.png)

![O painel do AI Assistant expandido — o "Main Chat Assistant" geral a executar a instância `mainchatassistantgeneral`, com Minimise / New session / Close no cabeçalho](/screenshots/react/melis-ai/melisai-footer-icon-generalassistant-deployed.png)

## React API — endpoints

Não existe **nenhum `config/react-api.php`**: as rotas da react-api são declaradas **inline em `config/module.config.php`**, enxertadas na rota-pai `melis-react-api` (prefixo `/melis/react-api`). Os controladores residem em `src/Controller/React/MelisReactApiAi*Controller.php`. Contrato em todo o lado: `{ success, data }` em caso de OK, `{ success:false, error }` em caso de falha; cada fetch envia `X-Requested-With: XMLHttpRequest` + credenciais.

Cada controlador implementa a sua própria guarda de acesso (não o trait genérico):

```php
private const MELIS_KEY = 'melisadmin_tool'; // or melisagent_tool / melis_mcp_inspector_tool
if ($deny = $this->denyUnlessAccess()) { return $deny; }
//   → 401 if !isAuthenticated() ; else 403 unless MelisCoreRights::canAccess(self::MELIS_KEY)
```

| Superfície (guarda) | Endpoints representativos (`/melis/react-api/…`) |
| --- | --- |
| **Admin** (`melisadmin_tool`) | `ai-usage/bootstrap` · `ai-usage/charts` · `ai-platform/data` · `ai-instances/{bootstrap,stats,list,save,:id,delete/:id}` · `ai-mcp-server/{data,save-tools,save-sensitive}` · `ai-chat-dev/{agents,run,continue}` |
| **AI Agents** (`melisagent_tool`) | `agents` (lista) · `agents/{stats,options,:id,save,delete/:id,db-rights/:id}` · `agents/scenario/{list,options,step/:id,…}` |
| **MCP Inspector** (`melis_mcp_inspector_tool`) | `mcp-inspector/{servers,launch,status,log}` |

As **escritas** de cenário reutilizam os endpoints legados `/melis/MelisAI/AgentProperties/*` (delete / reorder / save), para que toda a validação, tratamento de ficheiros e unicidade de código permaneça do lado do servidor. Exemplo (de `agent-api.ts`):

```ts
const BASE = '/melis/react-api/agents'
await apiFetch<{ id: number }>(`${BASE}/save`, {
  method: 'POST',
  headers: { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json' },
  credentials: 'same-origin',
  body: JSON.stringify({
    id: 4, name: 'Tool Builder', code: 'aitoolcreator', modelId: null, status: 1,
    dbCanCreateTable: 1, tools: ['createModule', 'activateModule'],
    dbRights: { melis_cms_page: { read: true, write: false, delete_row: false, drop: false } },
  }),
})
```

## Capacidades (direitos avançados)

Declaradas em `config/react.capabilities.php` sob `melisReactToolCapabilities`, indexadas pelo `melisKey` portador de direitos de cada ferramenta. **Por predefinição permissivas, apenas declarativas**: alimentam as caixas de seleção em **Users → Rights** e controlam que separadores/ações do React são exibidos (`useCaps(melisKey).can(cap)`); **não** são aplicadas do lado do servidor (os controladores controlam apenas o acesso à ferramenta via `canAccess`).

- `melisadmin_tool` — granularidade por **separador** (`usage`, `platform_ai.edit`, `instances` + `create/edit/delete`, `chat_dev`, `mcp_server` com `tools.edit` / `db.edit` aninhados).
- `melisagent_tool` — CRUD ao nível da ferramenta (`list/create/edit/delete`) além dos separadores do editor (`general`, `tools`, `dbrights`, `scenario` + CRUD, `run`).
- `melis_mcp_inspector_tool` — não declara nada; o acesso é a única caixa de seleção de acesso à ferramenta de menu.

## A dependência da interface de chat

Cada superfície de chat (a sobreposição do assistente, o separador **Run** do agente, o **Chat Dev Tool** do Admin) renderiza `<AiChatContainer>` importado de **`@melis-ai-engine`** — um alias de Vite para `../../melis-ai-engine/ui-react/src`, pelo que o componente de chat é **empacotado a partir das fontes do melis-ai-engine** para dentro deste brick (não externalizado). Props principais: `maiInstanceId`, `agentId`, `autoRun`, `showHeader`, `clearSession`, `extraEntryParams`.

Para programadores que incorporam uma caixa de chat numa vista **legada / renderizada do lado do servidor**, o `melis-ai-engine` continua a fornecer o view helper `AIChatViewHelper($maiInstanceId, …)` — consulte a [página legada do MelisAI](/legacy/reference/modules/melis-ai) e [melis-ai-engine](/legacy/reference/modules/melis-ai-engine).

## Fluxo do chat (o que acontece ao enviar)

1. Uma superfície de chat publica os turnos do utilizador no motor para o `mai_instance_id` fornecido.
2. `MelisAIEngineAgentService::runAgent()` resolve **instance → agent → model**, e depois escolhe o fornecedor via `getActiveModelClass($company, $modelId, $agentId)` (empresa `Google` → Gemini, `Anthropic` → Claude).
3. O motor percorre os **passos de cenário** do agente por ordem; `MelisAIEngineModelService::send()` chama a API de IA; as chamadas de ferramentas são encaminhadas via `MelisAIEngineMcpService` (JSON-RPC para ferramentas MCP, chamada PHP direta para ferramentas Local).
4. O estado persiste em `melis_ai_conversation_state`; as contagens de tokens/chamadas em `melis_ai_daily_usage`.

**O MelisAI nunca chama as APIs de IA por si próprio — o motor e os módulos de fornecedor é que o fazem.**

## Padrão de extensão (como os módulos de aplicação se ligam)

1. O **dbdeploy** insere um **agente** (com cenário + lista de permissões de ferramentas) e uma **instância** com um `mai_instance_id` fixo.
2. Registe um **servidor MCP** sob `config['mcp']['servers']` e declare as suas ferramentas em `function_declarations` com `mcp: true`.
3. Adicione uma entrada de interface que abra um chat em `<mai_instance_id>` com os parâmetros de entrada/saída corretos.

## Tabelas da base de dados

O MelisAI não detém qualquer esquema próprio — todas as tabelas são instaladas pelo `melis-ai-engine`. O prefixo é `melis_ai_*`.

| Tabela | Contém |
| --- | --- |
| `melis_ai_models` (`mam_*`) | Linhas de modelo de fornecedor (empresa, string do modelo, ligação à chave de API, definições de upload de ficheiros). |
| `melis_ai_companies` (`macp_*`) | Definições de empresa (Google, Anthropic, …). |
| `melis_ai_platform_keys` (`mapk_*`) | Chaves de API de fornecedor. |
| `melis_ai_agents` (`maa_*`) | Definições de agente (código, substituição de modelo, lista de permissões JSON `maa_agent_tools`). |
| `melis_ai_agents_tools` (`maat_*`) | Junção agente-para-ferramenta. |
| `melis_ai_tools` (`mat_*`) | Catálogo de ferramentas (MCP / Local). |
| `melis_ai_instances` (`mai_*`) | Implementações nomeadas (`mai_instance_id` estável). |
| `melis_ai_instance_trans` (`mait_*`) | Etiquetas de instância por idioma. |
| `melis_ai_scenario_steps` (`mas_*`) | Passos de cenário ordenados por agente. |
| `melis_ai_scenario_steps_datas` (`massd_*`) | Dados de passo (texto de contexto, caminho de formulário, …). |
| `melis_ai_scenario_steps_datas_entryexit` (`masse_*`) | Definições de parâmetros de entrada/saída por passo. |
| `melis_ai_return_types` (`mart_*`) | Definições de tipo de retorno de saída. |
| `melis_ai_files` (`maf_*`) | Ficheiros anexados a passos de cenário. |
| `melis_ai_daily_usage` (`mau_*`) | Contadores de utilização de tokens e consultas. |
| `melis_ai_conversation_state` (`macs_*`) | Estado de conversa por utilizador. |

Consulte também: [melis-ai-engine](/legacy/reference/modules/melis-ai-engine) · [melis-ai-engine-claude](/legacy/reference/modules/melis-ai-engine-claude) · [melis-ai-engine-gemini](/legacy/reference/modules/melis-ai-engine-gemini) · [melis-ai-tool-creator](/legacy/reference/modules/melis-ai-tool-creator) · [melis-ai-community-extensions](/legacy/reference/modules/melis-ai-community-extensions)
