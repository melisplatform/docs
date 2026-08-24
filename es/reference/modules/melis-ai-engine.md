# MelisAIEngine

> El motor de IA abstracto — contrato de proveedor, runtime de agentes/escenarios, almacén de conversaciones, puente MCP/herramientas, todas las tablas de base de datos de IA y los componentes React de chat compartidos que impulsan el back-office v6. Paquete `melisplatform/melis-ai-engine`.

## Propósito

MelisAIEngine es la pieza clave de la suite MelisAI. Define el contrato abstracto de proveedor (`MelisAIEngineModelService`) que implementan Claude y Gemini, ejecuta agentes a través de flujos de trabajo de escenarios multipaso, gestiona el puente MCP/llamada a herramientas y es propietario de todas las tablas de base de datos `melis_ai_*`. **No tiene ninguna herramienta autónoma** propia — es el motor de chat invisible del back-office. En v6 (React) también incluye el componente React compartido **`AiChatContainer`** y el backend de chat `/melis/react-api/ai-engine/*` que el módulo `MelisAI` monta en sus herramientas visibles.

## Activación

Añádalo a `config/melis.module.load.php`:

```php
return [
    'MelisAIEngine',
];
```

Dependencias de Composer requeridas: `melisplatform/melis-core` y `melisplatform/melis-document-upload`. Debe instalarse al menos un módulo proveedor (`MelisAIEngineClaude` o `MelisAIEngineGemini`) para realizar llamadas reales al modelo; sin un proveedor activo para la empresa del modelo, el chat informa *"The AI company module is not active."*

## Servicios clave

| Alias de servicio | Función |
| --- | --- |
| `MelisAIEngineModelService` | Contrato abstracto de proveedor. Extienda esta clase para añadir un nuevo proveedor de IA (§ Contrato de proveedor). |
| `MelisAIEngineService` | Registro/factoría: `getActiveInstance()`, `getActiveAgent()`, `getActiveModel()`, `getActiveModelClass()` (selección de proveedor), `getActiveAITools()`, `saveDailyUsage()`. |
| `MelisAIEngineAgentService` | Runtime de escenarios: `runAgent($postValues, $files)` recorre los pasos del agente e impulsa `MelisAIEngineModelService::send()`. |
| `MelisAIEngineMcpService` | Puente MCP/llamada a herramientas: gestión de servidores, comunicación JSON-RPC, disyuntor (circuit breaker), `getAvailableTools()`, `isMcpTool()`, `invokeTool()`, `formatToolsForAI()`, `getToolSchema()`. |
| `MelisAIEngineConversationStore` | Estado persistente de conversación multipaso en `melis_ai_conversation_state`: `get()`, `has()`, `set()`, `delete()`. Recolección automática de basura tras 48 horas. |
| `MelisAIEngineFunctionService` | Implementaciones de herramientas integradas (no MCP), p. ej. `get_table_structure`, `create_database_table`. |
| `MelisAIEngineFileService` | Limpieza por retención de los documentos subidos a la IA: `deleteAIDocUploads()`. |
| `MelisAIEngineGeneralService` | Base con conocimiento de eventos: `sendEvent()`, `makeArrayFromParameters()`. |

## Contrato de proveedor

`MelisAIEngineModelService` (`src/Service/MelisAIEngineModelService.php`) es la clase abstracta que todo proveedor debe extender. Constructor: `(ServiceManager $serviceManager, int $modelId, int $agentId)`.

**Métodos abstractos que un proveedor debe implementar:**

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

El ciclo de vida base `send(array $contextArr): array` es fijo: `addToolsToPayload()` → `addContentToPayload()` por cada entrada de contexto → `sendCustomAI()` → recuento de tokens → devuelve `['request','responseData','result','errors','needs_continuation','session_id','continuation_context','tool_results']`.

**Ayudantes proporcionados por la clase base:** `getModel()`, `getAgentFunctions()`, `getToolDeclarationByName()`, getters de tokens, `uploadDocument()`, `extractTextFromDocx()`, `extractTextFromXlsx()`, `getMimeType()`.

## Selección de proveedor

`MelisAIEngineService::getActiveModelClass($company, $modelId, $agentId)` elige el proveedor según el nombre de la empresa del modelo:

```php
if (strpos($company, 'Google') !== false) {
    // builds MelisAIEngineModelGeminiService — requires MelisAIEngineGemini module
} elseif (strpos($company, 'Anthropic') !== false) {
    // builds MelisAIEngineModelClaudeService — requires MelisAIEngineClaude module
}
```

Para añadir un nuevo proveedor (p. ej. OpenAI): extienda `MelisAIEngineModelService`, implemente los métodos abstractos, regístrelo como servicio y añada aquí una rama basada en el nombre de la empresa. Los proveedores Ollama y OCI siguen el mismo contrato.

## Sistema MCP / llamada a herramientas

Las herramientas se declaran en dos lugares: `config['plugins']['melisaiengine']['datas']['function_declarations']` (nombre, descripción, esquema JSON, booleano `mcp`) y la tabla `melis_ai_tools`. Un agente se adhiere a las herramientas mediante `maa_agent_tools`.

En el momento de la llamada: `getAgentFunctions()` devuelve las declaraciones permitidas → `addToolsToPayload()` las inyecta → ante una llamada a herramienta, el proveedor enruta mediante `MelisAIEngineMcpService::isMcpTool($name)`: las herramientas MCP van a `invokeTool()` (JSON-RPC sobre stdio, protegido por disyuntor); las herramientas integradas van a `MelisAIEngineFunctionService`. Los resultados se retroalimentan y la conversación continúa hasta que el modelo señala su finalización o se alcanza un límite de seguridad.

Los servidores MCP se configuran en `config['mcp']['servers'][<name>]` = `{enabled, command, args, tools, timeout}`; `MelisAIEngineMcpService` los lanza mediante `proc_open` y habla JSON-RPC 2.0 (`tools/list`, invocación de herramientas).

## Tablas de base de datos

Todas las tablas `melis_ai_*` pertenecen a este módulo (`dbdeploy: true`):

| Tabla | Contiene |
| --- | --- |
| `melis_ai_models` | Modelos de proveedor (empresa, `mam_generative_model`, vínculo de clave API). |
| `melis_ai_companies` | Empresas de IA (Google, Anthropic…). |
| `melis_ai_platform_keys` | Claves API por plataforma. |
| `melis_ai_agents` | Agentes (`maa_name`, vínculo de modelo, `maa_agent_tools` JSON, conmutadores de archivos). |
| `melis_ai_agents_tools` | Asignación agente ↔ herramienta. |
| `melis_ai_tools` | Catálogo de herramientas (`mat_name`, `mat_desc`, `mat_config` JSON). |
| `melis_ai_instances` / `melis_ai_instance_trans` | Despliegues con nombre (instancias) y traducciones. |
| `melis_ai_scenario_steps` / `…_datas` / `…_datas_entryexit` | Pasos del escenario, sus datos y parámetros de entrada/salida. |
| `melis_ai_return_types` | Definiciones de tipo de retorno de los pasos. |
| `melis_ai_files` | Archivos adjuntos a pasos/contexto. |
| `melis_ai_daily_usage` | Recuento de tokens y llamadas por modelo/agente/instancia/día. |
| `melis_ai_conversation_state` | Estado persistente de conversación (`macs_key`, JSON, recolección automática de basura). |

## Componentes React de chat

MelisAIEngine **no tiene ningún brick** ni entrada de menú `/melis-react`. Para el back-office React expone una biblioteca de componentes **solo de código fuente** en `ui-react/src/`, importada por los consumidores a través del alias de Vite **`@melis-ai-engine`** (mapeado a `melis-ai-engine/ui-react/src`). Renderiza toda la superficie de chat; el LLM real siempre lo suministra un módulo proveedor.

| Exportación | Función |
| --- | --- |
| `AiChatContainer` (por defecto) | Componente orquestador: ejecuta todo el bucle `init → run → (continue×N) → validate`, mantiene el estado del chat, conecta los subcomponentes. **Monte este.** |
| `ChatHistory`, `TypingIndicator`, `StepInterface` | Lista de mensajes con desplazamiento (markdown mediante `window.marked` cuando está presente), indicador de "pensando", tarjetas de interfaz por paso. |
| `ChatFormBox` | Barra de entrada inferior: área de texto, enviar/validar, menú `+` → subida de archivos (`user_file_upload[]`) o Biblioteca de Medios (`userMediaFiles[]`, MoxieManager), superposición de arrastrar y soltar. |
| `ChatDebugPanel`, `DebugEntry` | Vista de depuración: carga útil de la petición (→) y respuesta cruda del modelo (←) como bloques JSON (solo cuando `debugMode`). |
| `MelisPlanPanel`, `extractMelisPlan`, `looksLikeMelisPlan` | Renderiza un "plan Melis" estructurado propuesto por la IA (p. ej. una lista de campos de formulario) como una tabla. |
| `aiEngineInit/Run/Continue/Validate/Restart` | Cliente tipado para los endpoints de `ai-engine` (§ Backend de chat). |
| `parseResultActionString`, `dispatchResultAction`, `dispatchToolResults` | Despachador de navegación `JS_ACTION` en bucle cerrado (§ Navegación en bucle cerrado). |

**Contrato de montaje — `AiChatContainerProps`:**

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

El contenedor limita la continuación a `MAX_CONTINUATION_HOPS = 20`. Para añadir un chat de IA a una herramienta React, importe `AiChatContainer` y móntelo con un `maiInstanceId` — no se necesita trabajo en el backend, los endpoints ya existen. Los consumidores incrementan una `key` en el elemento montado para forzar una nueva sesión de servidor al relanzar.

## Dónde aparece

Nunca verá MelisAIEngine como un elemento de menú; su chat se muestra dentro del módulo **MelisAI**, que monta el mismo `AiChatContainer` en tres lugares (solo difieren `maiInstanceId` / `agentId`):

- **AI Assistant** — la superposición flotante del asistente (chat de propósito general que puede actuar sobre el back-office, lanzado con `autoRun`).
- **Chat Dev Tool** — un entorno de pruebas para desarrolladores que permite lanzar cualquier agente/instancia y conversar con él.
- **Pestaña "Run" del agente** — probar un agente desde la herramienta de agentes de MelisAI (`maiInstanceId="agenttool"`).

## Backend de chat — los endpoints de `ai-engine`

Las rutas se declaran en `config/module.config.php` (no en un `react-api.php`), alias de controlador `MelisAIEngine\Controller\React\MelisReactApiAiEngine` → `MelisReactApiAiEngineController`. Cada acción se protege con `denyUnlessAuthenticated()` (401 sin una identidad MelisCore — sin control de capacidad por herramienta, ya que se trata de un motor compartido). Envoltorio de respuesta uniforme: `{ success, data, error? }`. Estos endpoints reflejan el `AIController` heredado (`/melis/MelisAIEngine/AI/*`) y llaman al mismo `MelisAIEngineAgentService`.

| Método y URL | Función cliente | Propósito |
| --- | --- | --- |
| `GET /melis/react-api/ai-engine/init` | `aiEngineInit` | Validar instancia→agente→modelo→proveedor; devuelve `label`, `finalInstanceId`, `agentId`, `isFileUploadActivated`, `isMediaLibraryActivated`, `hasExitParameter` (o `errorType`/`errorMessage`). |
| `POST /melis/react-api/ai-engine/run` | `aiEngineRun` | Iniciar/avanzar un turno. JSON para texto, multipart/form-data cuando se adjuntan archivos → `runAgent()`. |
| `POST /melis/react-api/ai-engine/continue` | `aiEngineContinue` | Reanudar un turno multipaso (`needs_continuation=true`) → `continueConversation(sessionId, continuationContext)`. |
| `POST /melis/react-api/ai-engine/validate` | `aiEngineValidate` | Aceptar la respuesta de la IA, avanzar al paso de parámetro de salida, devolver `exitParams` para el callback del host → `validateAnswer()`. |
| `POST /melis/react-api/ai-engine/restart` | `aiEngineRestart` | Limpiar la sesión, devolver el mismo `finalInstanceId` listo para reutilizarse. |

El `RunResult` incluye `chatHist`, `needs_continuation`, `session_id`, `continuation_context`, `payload`/`response` (depuración), `exitParams`, `tool_results`.

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

## Navegación en bucle cerrado

El motor solo **despacha**: `nav-actions.ts` analiza las cadenas de callback `JS_ACTION::action::k=v&…` del `tool_results` de una respuesta y llama a `window.melisReactActionMap[action](args)`. El **shell anfitrión (melis-core)** *registra* esos manejadores y es propietario de la navegación de React-Router y de la percepción del DOM. Un manejador puede devolver una observación `Promise<string>`, que `dispatchToolResults` espera y retroalimenta como `continuationContext.clientObservation` — fundamentando el siguiente turno del modelo. Esto mantiene desacoplados los dos bundles construidos de forma independiente: solo los acopla el contrato de `window`.

## Ejemplo (ayudante de vista heredado)

El ayudante clásico renderizado en el servidor sigue funcionando para contextos no React (`.phtml`):

```php
// Render the chat box for a named instance
echo $this->AIChatViewHelper($maiInstanceId);
```

Registre un servidor MCP personalizado y declare sus herramientas para que un agente pueda llamarlas:

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

## Archivos clave

| Aspecto | Ruta |
| --- | --- |
| Contrato de proveedor (abstracto) | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineModelService.php` |
| Registro + selección de proveedor | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineService.php` |
| Runtime de agentes/escenarios | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineAgentService.php` |
| Puente MCP/herramientas | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineMcpService.php` |
| Almacén persistente de conversaciones | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineConversationStore.php` |
| Funciones integradas | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineFunctionService.php` |
| Controlador de chat heredado | `vendor/melisplatform/melis-ai-engine/src/Controller/AIController.php` |
| Backend de chat React | `vendor/melisplatform/melis-ai-engine/src/Controller/React/MelisReactApiAiEngineController.php` |
| Biblioteca React de chat compartida | `vendor/melisplatform/melis-ai-engine/ui-react/src/` (`AiChatContainer.tsx`, `api.ts`, `nav-actions.ts`…) |
| Modelos de tablas de base de datos | `vendor/melisplatform/melis-ai-engine/src/Model/Tables/` |
| Configuración del módulo | `vendor/melisplatform/melis-ai-engine/config/module.config.php` |

Véase también: [MelisAI](/es/reference/modules/melis-ai), [MelisAIEngineClaude](/es/reference/modules/melis-ai-engine-claude), [MelisAIEngineGemini](/es/reference/modules/melis-ai-engine-gemini), [MelisAIToolCreator](/es/reference/modules/melis-ai-tool-creator).
