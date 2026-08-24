# MelisAI

> Back-office React para la suite MelisAI: conecta proveedores, diseña agentes, despliega instancias, supervisa el uso, inspecciona servidores MCP y chatea desde cualquier lugar. Paquete `melisplatform/melis-ai`.

## Propósito

MelisAI es la **capa de gestión back-office** de la suite MelisAI. No ejecuta modelos de IA por sí mismo: esa es la función de `melis-ai-engine` y sus módulos de proveedor. Proporciona la interfaz y los servicios para cablear todo el sistema de IA: conectar un proveedor (**Platform AI**), construir comportamientos (**AI Agents** con escenarios y listas de herramientas permitidas), desplegarlos como **Instancias** con nombre, monitorizar el **Uso**, depurar con un chat de carga bruta (**Chat Dev Tool**) e inspeccionar los **servidores MCP** conectados.

En el **back-office React** (`/melis-react`) MelisAI se distribuye como un **único bundle multi-brick** que expone tres herramientas de menú nativas de React (**Admin**, **AI Agents**, **MCP Inspector**), cada una con un conmutador **New / Old** hacia su herramienta legacy en un iframe, **más una superposición global de AI Assistant** (un botón de chat flotante en cada pantalla, sin entrada de menú). La lógica de IA permanece en el lado servidor en `melis-ai-engine`.

## Activarlo

Añádelo a `config/melis.module.load.php` (los módulos de proveedor deben aparecer antes de `MelisAI`):

```php
return [
    'MelisAIEngine',
    'MelisAIEngineClaude',   // Anthropic provider
    'MelisAIEngineGemini',   // Google provider
    'MelisAI',
];
```

`MelisAI` requiere `melisplatform/melis-ai-engine`, que es propietario de todas las tablas de base de datos `melis_ai_*` y del runtime de agentes/escenarios. Los módulos de proveedor (`melis-ai-engine-claude`, `melis-ai-engine-gemini`, `-ollama`, `-oci`) implementan el contrato de proveedor y deben instalarse para sus respectivas compañías.

## Los cuatro sustantivos fundamentales

| Sustantivo | Tabla | Columna clave | Descripción |
| --- | --- | --- | --- |
| **model** | `melis_ai_models` (`mam_*`) | `mam_generative_model` | Una fila de modelo de proveedor: compañía (Anthropic / Google), cadena de modelo, enlace de clave API, indicador por defecto, ajustes de carga de archivos. |
| **agent** | `melis_ai_agents` (`maa_*`) | `maa_agent_tools` (lista permitida JSON) | Un comportamiento: nombre, código de agente, override opcional de modelo, pasos de escenario ordenados, lista permitida de herramientas. |
| **instance** | `melis_ai_instances` (`mai_*`) | `mai_instance_id` | Un despliegue con nombre de un agente. La cadena `mai_instance_id` es la clave estable a la que hace referencia cada UI (p. ej. `mainchatassistantgeneral`, `aitoolcreator`). |
| **tool** | `melis_ai_tools` (`mat_*`) | — | Una función invocable que el modelo puede llamar. Puede ser **MCP** (servidor MCP externo, `mcp: true`) o **Local** (PHP integrado). |

**Modelo mental en una frase:** una instancia apunta a un agente, un agente apunta a un modelo, un modelo nombra una compañía —eso selecciona el proveedor—; un chat sobre la instancia ejecuta el escenario del agente, llamando a las herramientas permitidas del agente.

## Dónde reside en el back-office React

MelisAI distribuye **un** bundle de bricks (`public/ui-react/brick.js`) cuyo manifiesto declara un array `bricks: [...]`: cuatro registros que se auto-registran en `brick.tsx`:

| Brick id | Ruta | melisKey | Tipo |
| --- | --- | --- | --- |
| `ai-admin` | `/melis-ai/admin` | `melisadmin_tool` | shell de pestañas React nativo (Usage / Platform AI / Instances / MCP Server / Chat dev tool) |
| `ai-agents` | `/melis-ai/ai-agents` | `melisagent_tool` | lista + editor React nativo (sub-pestañas) |
| `mcp-inspector` | `/melis-ai/mcp-inspector` | `melis_mcp_inspector_tool` | React nativo (función única) |
| `ai-assistant` | *(ninguna)* | — | **Superposición**: el FAB de chat flotante global, sin ruta ni entrada de menú |

Las tres herramientas con ruta aparecen en el menú izquierdo bajo **Melis AI** (junto a **AI Tool Creator**, aportada por el módulo independiente `melis-ai-tool-creator`). El assistant se renderiza una sola vez en la raíz del shell para que el chat flotante sobreviva a la navegación. Todas aparecen solo cuando MelisAI está activo (descubrimiento de bricks vía `GET /melis/react-api/react-modules`). Cada herramienta de menú lleva un conmutador **New / Old**: **New** = la UI React, **Old** = la herramienta clásica en un iframe.

![La sección Melis AI en la barra lateral React — Admin, AI Agents, MCP Inspector, AI Tool Creator](/screenshots/react/melis-ai/melisai-menu-section-melisai.png)

## Admin — configurar la IA

Ruta `/melis-ai/admin`. Un shell de pestañas React nativo —**Usage · Platform AI · Instances · MCP Server · Chat dev tool**— con un único Guardar (guarda la pestaña activa) y un conmutador New/Old para toda la herramienta.

- **Usage** — filtra por Company/Model sobre un rango; cuatro gráficos: Total Queries, Queries per Instance, Total Tokens, Tokens per Instance (las series por instancia son tus instancias desplegadas). Respaldado por `melis_ai_daily_usage`.

![Admin → pestaña Usage — filtros Company/Model y cuatro gráficos (consultas y tokens, totales y por instancia) sobre un rango seleccionable](/screenshots/react/melis-ai/melisai-tool-admin-tab-usage.png)

- **Platform AI** — activa la IA: elige Company + Model, selecciona *Same key for all platforms* o *One key per platform*, pega la(s) clave(s), fija **Status: Active** + **Default model: Yes**. Además **Upload management** — conmutadores de archivos de usuario/contexto y **Upload mode: File API vs Embed in request** (el `mam_file_upload_mode` que leen los proveedores; Gemini usa File API por defecto, Claude embed) y tamaño máximo de archivo.

![Admin → pestaña Platform AI — compañía/modelo/claves a la izquierda, conmutadores Status + Default y File Upload Management (File API vs Embed in request, tamaño máximo) a la derecha](/screenshots/react/melis-ai/melisai-tool-admin-tab-platformai.png)

- **Instances** — tarjetas KPI (Total / Active / Inactive), búsqueda, filtros y **+ New instance**. Seis vienen listas de serie: tres instancias **de sistema** (solo edición, sin eliminación: `admintool`, `agenttool`, `mainchatassistantgeneral`) y tres instancias **de aplicación** (eliminables: `aitoolcreator`, `minitemplatecreator`, `newscontentcreator`). La edición abre un formulario en sub-pestaña: **Name**, **Instance ID** (el `mai_instance_id`), **Status**, **Agent** (opcional) y una **Label** por idioma.

![Admin → pestaña Instances — tarjetas KPI, búsqueda + filtros y las seis instancias distribuidas (sistema + aplicación) con su Name ID y agente vinculado](/screenshots/react/melis-ai/melisai-tool-admin-tab-instances.png)

![Admin → Instances — formulario de edición: Name, Instance ID, Status, Agent y traducciones por idioma](/screenshots/react/melis-ai/melisai-tool-admin-tab-instances-edit.png)

- **MCP Server** — dos sub-pestañas: **MCP Exposition** (marca qué funciones MCP expone el servidor MCP a los clientes) y una pestaña **DB / sensitive tables**; cada una tiene su propio Guardar.
- **Chat Dev Tool** — un chat de depuración: elige un agente, chatea y lee el exacto **raw AI PAYLOAD** (`tools` / `functionDeclarations`, contexto) y el JSON de **AI RESPONSE** en paralelo.

![Admin → Chat Dev Tool — elige un agente, chatea a la izquierda y lee la carga bruta de IA (functionDeclarations, tools, context) a la derecha](/screenshots/react/melis-ai/melisai-tool-admin-tab-chatdevtool.png)

## AI Agents — diseñar el comportamiento

Ruta `/melis-ai/ai-agents`. La lista muestra **ID / Status / Name / Entries / Call number** (Entries = pasos de escenario, Call number = llamadas de IA de por vida) con tarjetas KPI, búsqueda, filtros y Export. Al abrir un agente se añade una sub-pestaña con un editor de cinco pestañas y un único Guardar.

![Lista de AI Agents — tarjetas KPI, búsqueda/filtros y los agentes distribuidos (Tool Builder, Mini-template Creator, News Content Creator, Main Chat Assistant) con recuento de pasos y número de llamadas](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents.png)

| Pestaña | Propósito |
| --- | --- |
| **Config** | Nombre del agente, código de agente (slug estable), descripción, **Override default AI model** (Company + Model), conmutadores de carga de archivos, interruptor Active. |
| **AI Tools** | La lista permitida de capacidades: marca las herramientas que este agente puede llamar, agrupadas en **MCP tools** (servidas por servidores MCP) y **Local tools** (PHP integrado). El motor ofrece al modelo exactamente las herramientas marcadas. |
| **DB Rights** | Casillas **read / write / delete row / drop** por tabla agrupadas por módulo, un interruptor global **Allow table creation**, gestión de tablas sensibles, búsqueda y Expand/Collapse all. |
| **Scenario** | Pasos tipados ordenados con reordenamiento por arrastre y edición/eliminación por fila: `ENTRY PARAMS` → `AI CONTEXT` (silencioso) → `AI CHAT` (visible) → `EXIT PARAMS`, además de pasos `CODE` opcionales. Cada paso tiene un **Code** que referencias con `[CODE]` para extraer la respuesta de un paso anterior. Editar un paso abre un modal (Code, Return type, Type of entry, AI Prompt con un editor General + overrides por idioma). |
| **Run** | Un chat de prueba in-place contra el agente (con un *Custom step end prompt* opcional), ejecutando el mismo chat nativo que el assistant. |

![Editor de agente → pestaña Config — Status, nombre/código/descripción del agente, override de modelo (compañía + modelo) y conmutadores de carga de archivos](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-config.png)

![Editor de agente → pestaña AI Tools — una lista de verificación de MCP tools y Local tools; el encabezado muestra cuántas del catálogo están marcadas](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-aitools.png)

![Editor de agente → pestaña DB Rights — casillas read/write/delete/drop por tabla agrupadas por módulo, el conmutador global "Allow table creation" y la gestión de tablas sensibles](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-dbrights.png)

![Editor de agente → pestaña Scenario — pasos tipados ordenados (ENTRY PARAMS, AI CONTEXT, CODE, AI CHAT, EXIT PARAMS) con reordenamiento por arrastre y edición/eliminación por fila](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-scenario.png)

![Editor de agente → modal de edición de paso — Code, Return type, Type of entry y el AI Prompt con pestañas General + por idioma](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-scenario-editstep.png)

![Editor de agente → pestaña Run — un chat de prueba in-place con un cuadro "Custom step end prompt" y Relaunch, ejecutando el agente en vivo](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-run.png)

### Catálogo de herramientas distribuidas

| Grupo | Herramientas |
| --- | --- |
| **MCP — esquema/datos de BD** | `getTableStructure`, `createDatabaseTable`, `addDBTableColumns`, `updateDBTableColumns`, `dropDBTableColumns`, `selectData`, `insertData`, `updateData`, `deleteData`, `bulkInsertData` |
| **MCP — sistema de archivos** | `createFile`, `createDirectory`, `pathExists`, `readFile`, `updateFiles`, `deleteFile`, `deleteDirectory` |
| **MCP — sitio/mini-template** (CommunityExtensions) | `readSiteAssets`, `getSitePublicUrl`, `uploadMinitemplateImages`, `renderMinitemplatePreview` |
| **MCP — constructor de módulos** (ToolCreator) | `createModule`, `activateModule`, `deactivateModule`, `generateBundle` |
| **Local** | `activate_module` |

## MCP Inspector

Ruta `/melis-ai/mcp-inspector`. Una página React nativa (con conmutador New/Old) que lista los **servidores MCP** conectados y te permite lanzar / comprobar el estado / leer los logs, para confirmar que un servidor está activo y sus herramientas son detectables antes de permitirlas en un agente. Respaldado por el `MelisAIEngineMcpService` del motor.

## AI Assistant — chatear desde cualquier lugar

El botón flotante **AI Assistant** (abajo a la derecha, en cada pantalla) abre un panel de chat que ejecuta el **Main Chat Assistant** general (agent id `1`, instancia `mainchatassistantgeneral`). Puede pilotar el back-office (abrir una herramienta, abrir una página) desde la conversación, despachado en el lado host vía `window.melisReactActionMap`. Minimizar conserva la sesión, New session inicia una nueva, Close la finaliza.

![El botón flotante global de AI Assistant (abajo a la derecha del shell) — un icono de robot con el logo degradado "M" de MelisAi](/screenshots/react/melis-ai/melisai-footer-icon-generalassistant.png)

![El panel de AI Assistant desplegado — el "Main Chat Assistant" general ejecutando la instancia `mainchatassistantgeneral`, con Minimise / New session / Close en el encabezado](/screenshots/react/melis-ai/melisai-footer-icon-generalassistant-deployed.png)

## React API — endpoints

**No hay `config/react-api.php`**: las rutas react-api se declaran **inline en `config/module.config.php`**, injertadas en la ruta padre `melis-react-api` (prefijo `/melis/react-api`). Los controladores residen en `src/Controller/React/MelisReactApiAi*Controller.php`. Contrato en todas partes: `{ success, data }` en OK, `{ success:false, error }` en caso de fallo; cada fetch envía `X-Requested-With: XMLHttpRequest` + credentials.

Cada controlador implementa su propia guarda de acceso (no el trait genérico):

```php
private const MELIS_KEY = 'melisadmin_tool'; // or melisagent_tool / melis_mcp_inspector_tool
if ($deny = $this->denyUnlessAccess()) { return $deny; }
//   → 401 if !isAuthenticated() ; else 403 unless MelisCoreRights::canAccess(self::MELIS_KEY)
```

| Superficie (guarda) | Endpoints representativos (`/melis/react-api/…`) |
| --- | --- |
| **Admin** (`melisadmin_tool`) | `ai-usage/bootstrap` · `ai-usage/charts` · `ai-platform/data` · `ai-instances/{bootstrap,stats,list,save,:id,delete/:id}` · `ai-mcp-server/{data,save-tools,save-sensitive}` · `ai-chat-dev/{agents,run,continue}` |
| **AI Agents** (`melisagent_tool`) | `agents` (list) · `agents/{stats,options,:id,save,delete/:id,db-rights/:id}` · `agents/scenario/{list,options,step/:id,…}` |
| **MCP Inspector** (`melis_mcp_inspector_tool`) | `mcp-inspector/{servers,launch,status,log}` |

Las **escrituras** de escenario reutilizan los endpoints legacy `/melis/MelisAI/AgentProperties/*` (delete / reorder / save) para que toda la validación, el manejo de archivos y la unicidad de código permanezcan en el lado servidor. Ejemplo (de `agent-api.ts`):

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

## Capacidades (derechos avanzados)

Declaradas en `config/react.capabilities.php` bajo `melisReactToolCapabilities`, indexadas por el `melisKey` portador de derechos de cada herramienta. **Permitir por defecto, solo declarativas**: alimentan las casillas en **Users → Rights** y controlan qué pestañas/acciones React se muestran (`useCaps(melisKey).can(cap)`); **no** se aplican en el lado servidor (los controladores controlan solo el acceso a la herramienta vía `canAccess`).

- `melisadmin_tool` — granularidad por **pestaña** (`usage`, `platform_ai.edit`, `instances` + `create/edit/delete`, `chat_dev`, `mcp_server` con `tools.edit` / `db.edit` anidados).
- `melisagent_tool` — CRUD a nivel de herramienta (`list/create/edit/delete`) más pestañas del editor (`general`, `tools`, `dbrights`, `scenario` + CRUD, `run`).
- `melis_mcp_inspector_tool` — no declara nada; el acceso es la única casilla de acceso a la herramienta de menú.

## La dependencia de la UI de chat

Cada superficie de chat (la superposición del assistant, la pestaña **Run** del agente, el **Chat Dev Tool** de Admin) renderiza `<AiChatContainer>` importado desde **`@melis-ai-engine`** — un alias de Vite hacia `../../melis-ai-engine/ui-react/src`, de modo que el componente de chat se **empaqueta desde las fuentes de melis-ai-engine** dentro de este brick (no externalizado). Props clave: `maiInstanceId`, `agentId`, `autoRun`, `showHeader`, `clearSession`, `extraEntryParams`.

Para desarrolladores que incrustan un chatbox en una vista **legacy / renderizada en el servidor**, `melis-ai-engine` todavía proporciona el view helper `AIChatViewHelper($maiInstanceId, …)` — consulta la [página MelisAI legacy](/legacy/reference/modules/melis-ai) y [melis-ai-engine](/legacy/reference/modules/melis-ai-engine).

## Flujo de chat (qué ocurre al enviar)

1. Una superficie de chat envía los turnos del usuario al motor para el `mai_instance_id` dado.
2. `MelisAIEngineAgentService::runAgent()` resuelve **instancia → agente → modelo**, luego selecciona el proveedor vía `getActiveModelClass($company, $modelId, $agentId)` (compañía `Google` → Gemini, `Anthropic` → Claude).
3. El motor recorre los **pasos de escenario** del agente en orden; `MelisAIEngineModelService::send()` llama a la API de IA; las llamadas a herramientas se enrutan vía `MelisAIEngineMcpService` (JSON-RPC para herramientas MCP, llamada PHP directa para herramientas Local).
4. El estado se persiste en `melis_ai_conversation_state`; los recuentos de tokens/llamadas en `melis_ai_daily_usage`.

**MelisAI nunca llama a las API de IA por sí mismo — lo hacen el motor y los módulos de proveedor.**

## Patrón de extensión (cómo se conectan los módulos de aplicación)

1. **dbdeploy** inserta un **agente** (con escenario + lista permitida de herramientas) y una **instancia** con un `mai_instance_id` fijo.
2. Registra un **servidor MCP** bajo `config['mcp']['servers']` y declara sus herramientas en `function_declarations` con `mcp: true`.
3. Añade una entrada de UI que abra un chat sobre `<mai_instance_id>` con los parámetros de entrada/salida adecuados.

## Tablas de base de datos

MelisAI no es propietario de ningún esquema propio — todas las tablas las instala `melis-ai-engine`. El prefijo es `melis_ai_*`.

| Tabla | Contiene |
| --- | --- |
| `melis_ai_models` (`mam_*`) | Filas de modelo de proveedor (compañía, cadena de modelo, enlace de clave API, ajustes de carga de archivos). |
| `melis_ai_companies` (`macp_*`) | Definiciones de compañía (Google, Anthropic, …). |
| `melis_ai_platform_keys` (`mapk_*`) | Claves API de proveedor. |
| `melis_ai_agents` (`maa_*`) | Definiciones de agente (código, override de modelo, lista permitida JSON `maa_agent_tools`). |
| `melis_ai_agents_tools` (`maat_*`) | Unión agente-a-herramienta. |
| `melis_ai_tools` (`mat_*`) | Catálogo de herramientas (MCP / Local). |
| `melis_ai_instances` (`mai_*`) | Despliegues con nombre (`mai_instance_id` estable). |
| `melis_ai_instance_trans` (`mait_*`) | Etiquetas de instancia por idioma. |
| `melis_ai_scenario_steps` (`mas_*`) | Pasos de escenario ordenados por agente. |
| `melis_ai_scenario_steps_datas` (`massd_*`) | Datos de paso (texto de contexto, ruta de formulario, …). |
| `melis_ai_scenario_steps_datas_entryexit` (`masse_*`) | Definiciones de parámetros de entrada/salida por paso. |
| `melis_ai_return_types` (`mart_*`) | Definiciones de tipo de retorno de salida. |
| `melis_ai_files` (`maf_*`) | Archivos adjuntos a pasos de escenario. |
| `melis_ai_daily_usage` (`mau_*`) | Contadores de uso de tokens y consultas. |
| `melis_ai_conversation_state` (`macs_*`) | Estado de conversación por usuario. |

Véase también: [melis-ai-engine](/legacy/reference/modules/melis-ai-engine) · [melis-ai-engine-claude](/legacy/reference/modules/melis-ai-engine-claude) · [melis-ai-engine-gemini](/legacy/reference/modules/melis-ai-engine-gemini) · [melis-ai-tool-creator](/legacy/reference/modules/melis-ai-tool-creator) · [melis-ai-community-extensions](/legacy/reference/modules/melis-ai-community-extensions)
