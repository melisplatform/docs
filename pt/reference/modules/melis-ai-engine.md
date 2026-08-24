# MelisAIEngine

> O motor de IA abstrato — contrato do fornecedor, runtime de agentes/cenários, armazenamento de conversas, ponte MCP/ferramentas, todas as tabelas de base de dados de IA e os componentes React de chat partilhados que dão vida ao back-office v6. Pacote `melisplatform/melis-ai-engine`.

## Objetivo

MelisAIEngine é a peça-chave da suite MelisAI. Define o contrato de fornecedor abstrato (`MelisAIEngineModelService`) que o Claude e o Gemini implementam, executa agentes através de fluxos de trabalho de cenários multi-etapa, gere a ponte MCP/chamada de ferramentas e é o proprietário de todas as tabelas de base de dados `melis_ai_*`. Não tem **nenhuma ferramenta autónoma** própria — é o motor de chat invisível do back-office. Na v6 (React) fornece também o componente React **`AiChatContainer`** partilhado e o backend de chat `/melis/react-api/ai-engine/*` que o módulo `MelisAI` monta nas suas ferramentas visíveis.

## Ativá-lo

Adicione a `config/melis.module.load.php`:

```php
return [
    'MelisAIEngine',
];
```

Dependências Composer obrigatórias: `melisplatform/melis-core` e `melisplatform/melis-document-upload`. Pelo menos um módulo de fornecedor (`MelisAIEngineClaude` ou `MelisAIEngineGemini`) tem de estar instalado para chamadas reais ao modelo; sem um fornecedor ativo para a empresa do modelo, o chat reporta *"The AI company module is not active."*

## Serviços principais

| Alias do serviço | Função |
| --- | --- |
| `MelisAIEngineModelService` | Contrato de fornecedor abstrato. Estenda-o para adicionar um novo fornecedor de IA (§ Contrato do fornecedor). |
| `MelisAIEngineService` | Registo/fábrica: `getActiveInstance()`, `getActiveAgent()`, `getActiveModel()`, `getActiveModelClass()` (seleção do fornecedor), `getActiveAITools()`, `saveDailyUsage()`. |
| `MelisAIEngineAgentService` | Runtime de cenários: `runAgent($postValues, $files)` percorre as etapas do agente e conduz `MelisAIEngineModelService::send()`. |
| `MelisAIEngineMcpService` | Ponte MCP/chamada de ferramentas: gestão de servidores, comunicação JSON-RPC, disjuntor (circuit breaker), `getAvailableTools()`, `isMcpTool()`, `invokeTool()`, `formatToolsForAI()`, `getToolSchema()`. |
| `MelisAIEngineConversationStore` | Estado persistente de conversas multi-turno em `melis_ai_conversation_state`: `get()`, `has()`, `set()`, `delete()`. GC automático após 48 horas. |
| `MelisAIEngineFunctionService` | Implementações de ferramentas integradas (não-MCP), por exemplo `get_table_structure`, `create_database_table`. |
| `MelisAIEngineFileService` | Limpeza por retenção de documentos carregados pela IA: `deleteAIDocUploads()`. |
| `MelisAIEngineGeneralService` | Base orientada a eventos: `sendEvent()`, `makeArrayFromParameters()`. |

## Contrato do fornecedor

`MelisAIEngineModelService` (`src/Service/MelisAIEngineModelService.php`) é a classe abstrata que todos os fornecedores têm de estender. Construtor: `(ServiceManager $serviceManager, int $modelId, int $agentId)`.

**Métodos abstratos que um fornecedor tem de implementar:**

```php
abstract public function setClient();
abstract public function addToolsToPayload($payload);
abstract public function addContentToPayload($payload, $role, $prompt, $files=[], $content=[]);
abstract public function constructContent($role, $prompt, $files=[]);
abstract public function getMessageKey(): string;            // 'messages' (Claude) | 'contents' (Gemini)
abstract public function sendCustomAI(?array $payload = []): array;
abstract public function getAllowedMimetypes(): array;
abstract public function setPromptTokenCount($responseData);
abstract public function setResponseTokenCount($responseData);
abstract public function setTotalTokenCount($responseData);
abstract public function processFiles($filesArr): array;
abstract public function processContextFiles($filesArr): array;
```

O ciclo de vida base `send(array $contextArr): array` é fixo: `addToolsToPayload()` → `addContentToPayload()` por cada entrada de contexto → `sendCustomAI()` → contagens de tokens → devolve `['request','responseData','result','errors','needs_continuation','session_id','continuation_context','tool_results']`.

**Auxiliares fornecidos pela classe base:** `getModel()`, `getAgentFunctions()`, `getToolDeclarationByName()`, getters de tokens, `uploadDocument()`, `extractTextFromDocx()`, `extractTextFromXlsx()`, `getMimeType()`.

## Seleção do fornecedor

`MelisAIEngineService::getActiveModelClass($company, $modelId, $agentId)` escolhe o fornecedor pelo nome da empresa do modelo:

```php
if (strpos($company, 'Google') !== false) {
    // builds MelisAIEngineModelGeminiService — requires MelisAIEngineGemini module
} elseif (strpos($company, 'Anthropic') !== false) {
    // builds MelisAIEngineModelClaudeService — requires MelisAIEngineClaude module
}
```

Para adicionar um novo fornecedor (por exemplo, OpenAI): estenda `MelisAIEngineModelService`, implemente os métodos abstratos, registe-o como serviço e adicione aqui um ramo indexado pelo nome da empresa. Os fornecedores Ollama e OCI seguem o mesmo contrato.

## Sistema MCP / chamada de ferramentas

As ferramentas são declaradas em dois locais: `config['plugins']['melisaiengine']['datas']['function_declarations']` (nome, descrição, esquema JSON, booleano `mcp`) e a tabela `melis_ai_tools`. Um agente adere às ferramentas através de `maa_agent_tools`.

No momento da chamada: `getAgentFunctions()` devolve as declarações permitidas → `addToolsToPayload()` injeta-as → numa chamada de ferramenta, o fornecedor encaminha através de `MelisAIEngineMcpService::isMcpTool($name)`: as ferramentas MCP vão para `invokeTool()` (JSON-RPC sobre stdio, protegido por disjuntor); as ferramentas integradas vão para `MelisAIEngineFunctionService`. Os resultados são reinjetados e a conversa continua até o modelo sinalizar a conclusão ou até um limite de segurança.

Os servidores MCP são configurados em `config['mcp']['servers'][<name>]` = `{enabled, command, args, tools, timeout}`; `MelisAIEngineMcpService` inicia-os via `proc_open` e comunica em JSON-RPC 2.0 (`tools/list`, invocação de ferramentas).

## Tabelas de base de dados

Todas as tabelas `melis_ai_*` pertencem a este módulo (`dbdeploy: true`):

| Tabela | Contém |
| --- | --- |
| `melis_ai_models` | Modelos de fornecedor (empresa, `mam_generative_model`, ligação à chave de API). |
| `melis_ai_companies` | Empresas de IA (Google, Anthropic…). |
| `melis_ai_platform_keys` | Chaves de API por plataforma. |
| `melis_ai_agents` | Agentes (`maa_name`, ligação ao modelo, `maa_agent_tools` JSON, ativação de ficheiros). |
| `melis_ai_agents_tools` | Atribuição agente ↔ ferramenta. |
| `melis_ai_tools` | Catálogo de ferramentas (`mat_name`, `mat_desc`, `mat_config` JSON). |
| `melis_ai_instances` / `melis_ai_instance_trans` | Implementações nomeadas (instâncias) e traduções. |
| `melis_ai_scenario_steps` / `…_datas` / `…_datas_entryexit` | Etapas de cenário, os seus dados e parâmetros de entrada/saída. |
| `melis_ai_return_types` | Definições de tipos de retorno das etapas. |
| `melis_ai_files` | Ficheiros anexados a etapas/contexto. |
| `melis_ai_daily_usage` | Contagens de tokens e de chamadas por modelo/agente/instância/dia. |
| `melis_ai_conversation_state` | Estado persistente de conversas (`macs_key`, JSON, GC automático). |

## Componentes React de chat

O MelisAIEngine **não tem brick** nem entrada de menu `/melis-react`. Para o back-office React, expõe uma biblioteca de componentes **só de código-fonte** em `ui-react/src/`, importada pelos consumidores através do alias Vite **`@melis-ai-engine`** (mapeado para `melis-ai-engine/ui-react/src`). Renderiza toda a superfície de chat; o LLM propriamente dito é sempre fornecido por um módulo de fornecedor.

| Exportação | Função |
| --- | --- |
| `AiChatContainer` (predefinido) | Componente orquestrador: executa todo o ciclo `init → run → (continue×N) → validate`, mantém o estado do chat, liga os subcomponentes. **Monte este.** |
| `ChatHistory`, `TypingIndicator`, `StepInterface` | Lista de mensagens com scroll (markdown via `window.marked` quando presente), indicador de "a pensar", cartões de interface por etapa. |
| `ChatFormBox` | Barra de entrada inferior: textarea, enviar/validar, menu `+` → carregamento de ficheiros (`user_file_upload[]`) ou Biblioteca de Média (`userMediaFiles[]`, MoxieManager), sobreposição de arrastar e largar. |
| `ChatDebugPanel`, `DebugEntry` | Vista de depuração: payload do pedido (→) e resposta bruta do modelo (←) como blocos JSON (apenas quando `debugMode`). |
| `MelisPlanPanel`, `extractMelisPlan`, `looksLikeMelisPlan` | Renderiza um "plano Melis" estruturado proposto pela IA (por exemplo, uma lista de campos de formulário) sob a forma de tabela. |
| `aiEngineInit/Run/Continue/Validate/Restart` | Cliente tipado para os endpoints `ai-engine` (§ Backend de chat). |
| `parseResultActionString`, `dispatchResultAction`, `dispatchToolResults` | Despachante de navegação `JS_ACTION` em ciclo fechado (§ Navegação em ciclo fechado). |

**Contrato de montagem — `AiChatContainerProps`:**

```tsx
type AiChatContainerProps = {
  maiInstanceId: string                        // required — e.g. "agenttool" or "newscontentcreator|42"
  agentId?: number | null                      // override the instance's default agent
  extraEntryParams?: Record<string, unknown>   // → extra_entry_param[key] context
  entryParamForm?: Record<string, string>      // → entry_param_form[key]
  debugMode?: boolean
  exitParamArr?: ExitParamArr
  showCloseButton?: boolean
  needExitParam?: boolean
  showHideButton?: boolean
  showHeader?: boolean
  clearSession?: boolean                        // clear the server session on init (fresh conversation)
  autoRun?: boolean                             // start the agent immediately after init
  initialMessage?: string                       // first user_chat when autoRun
  onClose?: () => void
  onHide?: () => void
  className?: string
  style?: React.CSSProperties
}
```

O container limita a continuação a `MAX_CONTINUATION_HOPS = 20`. Para adicionar um chat de IA a uma ferramenta React, importe `AiChatContainer` e monte-o com um `maiInstanceId` — não é necessário trabalho de backend, os endpoints já existem. Os consumidores incrementam uma `key` no elemento montado para forçar uma nova sessão de servidor ao relançar.

## Onde aparece

Nunca verá o MelisAIEngine como item de menu; o seu chat surge dentro do módulo **MelisAI**, que monta o mesmo `AiChatContainer` em três locais (apenas `maiInstanceId` / `agentId` diferem):

- **AI Assistant** — a sobreposição do assistente flutuante (chat de uso geral capaz de atuar sobre o back-office, lançado com `autoRun`).
- **Chat Dev Tool** — um playground de programador para lançar qualquer agente/instância e conversar com ele.
- **Separador "Run" do agente** — testar um agente a partir da ferramenta de agentes do MelisAI (`maiInstanceId="agenttool"`).

## Backend de chat — os endpoints `ai-engine`

As rotas são declaradas em `config/module.config.php` (não num `react-api.php`), com o alias de controlador `MelisAIEngine\Controller\React\MelisReactApiAiEngine` → `MelisReactApiAiEngineController`. Cada ação protege-se com `denyUnlessAuthenticated()` (401 sem uma identidade MelisCore — sem barreira de capacidade por ferramenta, uma vez que este é um motor partilhado). Envelope de resposta uniforme: `{ success, data, error? }`. Estes endpoints espelham o `AIController` legado (`/melis/MelisAIEngine/AI/*`) e chamam o mesmo `MelisAIEngineAgentService`.

| Método e URL | Função do cliente | Objetivo |
| --- | --- | --- |
| `GET /melis/react-api/ai-engine/init` | `aiEngineInit` | Valida instância→agente→modelo→fornecedor; devolve `label`, `finalInstanceId`, `agentId`, `isFileUploadActivated`, `isMediaLibraryActivated`, `hasExitParameter` (ou `errorType`/`errorMessage`). |
| `POST /melis/react-api/ai-engine/run` | `aiEngineRun` | Inicia/avança um turno. JSON para texto, multipart/form-data quando há ficheiros anexados → `runAgent()`. |
| `POST /melis/react-api/ai-engine/continue` | `aiEngineContinue` | Retoma um turno multi-salto (`needs_continuation=true`) → `continueConversation(sessionId, continuationContext)`. |
| `POST /melis/react-api/ai-engine/validate` | `aiEngineValidate` | Aceita a resposta da IA, avança para a etapa de parâmetro de saída, devolve `exitParams` para o callback do host → `validateAnswer()`. |
| `POST /melis/react-api/ai-engine/restart` | `aiEngineRestart` | Limpa a sessão, devolve o mesmo `finalInstanceId` pronto para reutilização. |

O `RunResult` inclui `chatHist`, `needs_continuation`, `session_id`, `continuation_context`, `payload`/`response` (depuração), `exitParams`, `tool_results`.

**Turno de texto mínimo:**

```ts
import { aiEngineInit, aiEngineRun } from '@melis-ai-engine'

const cfg = await aiEngineInit({ maiInstanceId: 'agenttool', clearSession: true })
if (cfg.errorType) throw new Error(cfg.errorMessage)   // instance/agent/model/companyModule/exitParam

const res = await aiEngineRun({
  agentId:    cfg.agentId,
  instanceId: cfg.finalInstanceId,
  userText:   'Create a news article about our new store',
})
// res.chatHist, res.needs_continuation, res.session_id, res.tool_results …
```

## Navegação em ciclo fechado

O motor apenas **despacha**: `nav-actions.ts` analisa strings de callback `JS_ACTION::action::k=v&…` a partir dos `tool_results` de uma resposta e chama `window.melisReactActionMap[action](args)`. A **shell do host (melis-core)** *regista* esses handlers e é responsável pela navegação com React-Router e pela perceção do DOM. Um handler pode devolver uma observação `Promise<string>`, que `dispatchToolResults` aguarda e reinjeta como `continuationContext.clientObservation` — fundamentando o próximo turno do modelo. Isto mantém os dois bundles, construídos de forma independente, desacoplados: apenas o contrato `window` os liga.

## Exemplo (auxiliar de vista legado)

O clássico auxiliar renderizado no servidor continua a funcionar para contextos não-React (`.phtml`):

```php
// Render the chat box for a named instance
echo $this->AIChatViewHelper($maiInstanceId);
```

Registe um servidor MCP personalizado e declare as suas ferramentas para que um agente as possa chamar:

```php
// In a module's config — register the MCP server
'mcp' => [
    'servers' => [
        'my-mcp-server' => [
            'enabled' => true,
            'command' => 'node',
            'args'    => ['/path/to/server.js'],
            'tools'   => ['my_tool'],
            'timeout' => 30,
        ],
    ],
],
// Declare the tool with mcp: true
'plugins' => [
    'melisaiengine' => [
        'datas' => [
            'function_declarations' => [
                [
                    'name'        => 'my_tool',
                    'description' => 'Does something useful',
                    'mcp'         => true,
                    // JSON schema for parameters…
                ],
            ],
        ],
    ],
],
```

## Ficheiros principais

| Assunto | Caminho |
| --- | --- |
| Contrato do fornecedor (abstrato) | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineModelService.php` |
| Registo + seleção do fornecedor | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineService.php` |
| Runtime de agentes/cenários | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineAgentService.php` |
| Ponte MCP/ferramentas | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineMcpService.php` |
| Armazenamento persistente de conversas | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineConversationStore.php` |
| Funções integradas | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineFunctionService.php` |
| Controlador de chat legado | `vendor/melisplatform/melis-ai-engine/src/Controller/AIController.php` |
| Backend de chat React | `vendor/melisplatform/melis-ai-engine/src/Controller/React/MelisReactApiAiEngineController.php` |
| Biblioteca React de chat partilhada | `vendor/melisplatform/melis-ai-engine/ui-react/src/` (`AiChatContainer.tsx`, `api.ts`, `nav-actions.ts`…) |
| Modelos de tabelas de base de dados | `vendor/melisplatform/melis-ai-engine/src/Model/Tables/` |
| Configuração do módulo | `vendor/melisplatform/melis-ai-engine/config/module.config.php` |

Ver também: [MelisAI](/pt/reference/modules/melis-ai), [MelisAIEngineClaude](/pt/reference/modules/melis-ai-engine-claude), [MelisAIEngineGemini](/pt/reference/modules/melis-ai-engine-gemini), [MelisAIToolCreator](/pt/reference/modules/melis-ai-tool-creator).
