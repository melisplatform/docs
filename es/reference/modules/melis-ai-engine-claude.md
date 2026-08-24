# MelisAIEngineClaude

> Proveedor Anthropic Claude para el motor de IA de Melis — un motor de backend sin interfaz React propia. Paquete `melisplatform/melis-ai-engine-claude`.

## Propósito

`MelisAIEngineClaude` es el proveedor concreto de Anthropic Claude para el conjunto MelisAI. Extiende el contrato `MelisAIEngineModelService` del motor y aporta la configuración del cliente HTTP específica de Claude, la forma del payload de la Anthropic Messages API, la gestión de archivos, el mapeo de herramientas/funciones y el análisis de las respuestas. El módulo no tiene estado — no posee tablas de base de datos; todo el estado de ejecución reside en las propias tablas del motor.

El motor selecciona este proveedor automáticamente en tiempo de ejecución cuando la compañía del modelo activo contiene `Anthropic` (y este módulo está instalado).

## Rol en el back-office React

Este módulo **no tiene ninguna herramienta de back-office React ni interfaz propia**: no hay brick `ui-react/`, ni `config/react-api.php`, ni capacidades, ni controlador. Nunca aparece como herramienta, nodo de menú o entrada de barra lateral en `/melis-react`. Es pura fontanería — el camino de código que permite a Melis comunicarse con Claude.

Su único efecto visible en el back-office React es **transitivo, a través de [MelisAI](/es/reference/modules/melis-ai)**:

- Sus scripts `install/dbdeploy/*.sql` siembran la compañía **`Anthropic`** y varios **modelos Claude** en el catálogo de modelos del motor.
- Esos modelos aparecen entonces como opciones en la administración de MelisAI (Platform AI / configuración de modelos), bajo la compañía **Anthropic**.
- Para usar uno, almacenas tu **clave de API de Anthropic** en esa fila de modelo (`mapk_*`) y luego apuntas una **instancia / agente** al modelo Claude.
- A partir de ahí, cada chat en ese agente — incluido el **Asistente de IA** de React — se enruta a través de este proveedor.

> Nunca abres este módulo. En `/melis-react` solo es una línea en un desplegable de modelos expuesto por MelisAI, además del motor detrás de los chats de IA que lo utilizan. Si los chats de Claude fallan, la causa suele ser una **clave de API** faltante en la fila del modelo o un modelo **inactivo** — ambos configurados en MelisAI, no aquí.

## Habilitarlo

Añade a `config/melis.module.load.php` después del motor de IA:

```php
return [
    'MelisAIEngine',
    'MelisAIEngineClaude',
];
```

Dependencia: `melisplatform/melis-ai-engine` `^6.0`. La clave de API de Anthropic se almacena por modelo en el back-office de Melis AI (la fila de clave `mapk_*` del modelo) — no en un archivo de configuración ni en una variable de entorno.

## Servicios clave

| Alias del servicio | Rol |
| --- | --- |
| `MelisAIEngineModelClaudeService` | El proveedor de Claude. Extiende `MelisAIEngineModelService` e implementa el contrato de la Anthropic Messages API. Construido por el service manager con las opciones de fábrica `['modelId' => …, 'agentId' => …]`. |

Métodos destacados en `MelisAIEngineModelClaudeService`:

| Método | Rol |
| --- | --- |
| `setClient()` | Construye un `Laminas\Http\Client` que hace POST a la URL configurada de Claude Messages. Establece las cabeceras `Content-Type/Accept: application/json`, `x-api-key` (a partir de la clave de API del modelo), `anthropic-version: 2023-06-01`, y una cabecera `anthropic-beta` que habilita las betas de prompt-caching y web-fetch. Usa un timeout largo para acomodar los bucles de uso de herramientas. |
| `getMessageKey()` | Devuelve `'messages'`. |
| `addToolsToPayload()` | Lee las funciones del agente mediante `getAgentFunctions()`, elimina las claves internas del motor (`mcp`, `type`, `server`, `module`, `max_silence`, `operation_timeout`) mediante `sanitizeToolForClaudeAPI()`, añade las herramientas con la forma de Anthropic (`name`, `description`, `input_schema`), añade la herramienta integrada `web_fetch` y elimina duplicados por nombre. |
| `constructContent()` / `addContentToPayload()` | Mapea el rol `model` a `assistant`; construye bloques de contenido de Anthropic (`{type:text}`, `{type:image, source:{url\|base64,…}}`, `{type:document, source:{…, media_type:application/pdf}}`); los añade a `payload['messages']`. |
| `sendCustomAI()` | Inyecta `model` (`mam_generative_model`) y `max_tokens`; hace POST del JSON con reintentos en errores 5xx; analiza `content[]` en bloques de texto y `tool_use`; despacha cada herramienta (MCP mediante `MelisAIEngineMcpService::invokeTool`, o integrada en caso contrario); añade los resultados como `{type:tool_result, tool_use_id, content}` en un mensaje `user`; itera hasta que `stop_reason === 'end_turn'` o se alcanza un límite de saltos de seguridad. Habilita el prompt caching. |
| `processFiles()` / `processContextFiles()` | Convierte las cargas según el `mam_file_upload_mode` del modelo (por defecto: `embed`): DOCX/XLSX → texto extraído, imágenes/PDF → base64, o mediante `uploadDocument()` cuando la carga interna está habilitada. |
| `setPromptTokenCount()` / `setResponseTokenCount()` / `setTotalTokenCount()` | Leen los campos de `responseData['usage']` (`input_tokens`, `output_tokens`, más los contadores de lectura/creación de caché); total = input + output. |
| `getAllowedMimetypes()` | Devuelve los tipos MIME de carga permitidos desde el bloque de configuración de Claude. |
| `continueConversation()` | Rehidrata el historial de mensajes a partir del estado guardado y vuelve a llamar a `sendCustomAI()` para la continuación del uso de herramientas en múltiples saltos. |

## Llamada a herramientas / funciones

Las herramientas del motor ya usan la forma `input_schema` de Anthropic, por lo que `addToolsToPayload()` principalmente las sanea y reenvía. Una llamada a herramienta del modelo llega como `{type:'tool_use', name, id, input}`; el servicio extrae `name` / `input` / `id`, enruta mediante `MelisAIEngineMcpService::isMcpTool()` (`invokeTool` de MCP frente a función integrada), y devuelve el resultado como `{type:'tool_result', tool_use_id:<id>, content:<json>}` dentro de un mensaje `user`, y luego continúa el bucle. El campo `id` correlaciona llamada↔resultado tal como lo requiere la Anthropic API.

## Configuración

Los ajustes del proveedor residen en:

```
config['plugins']['melisaiengine']['datas']['AI']['Claude']
```

| Clave | Propósito |
| --- | --- |
| `api_url` | La URL del endpoint de la Anthropic Messages API (`https://api.anthropic.com/v1/messages`). |
| `allowed_mimetypes` | Tipos MIME aceptados para las cargas de archivos. |

Un bloque hermano `['AI']['Anthropic']` declara los modos de carga de archivos (`embed`) y el soporte de carga interna. La clave de API **no** se lee de la configuración ni del entorno — proviene exclusivamente de la fila de clave de BD del modelo (`mapk_*`), introducida por un administrador en la administración de MelisAI.

## Modelos sembrados

Instalados mediante `install/dbdeploy/*.sql` bajo la compañía `Anthropic`; el flag `mam_status` decide cuáles se ofrecen:

| `mam_generative_model` | Modelo |
| --- | --- |
| `claude-opus-4-8` | Claude Opus 4.8 |
| `claude-sonnet-4-6` | Claude Sonnet 4.6 |
| `claude-haiku-4-5-20251001` | Claude Haiku 4.5 |
| `claude-sonnet-4-5-20250929` | Claude Sonnet 4.5 |
| `claude-sonnet-4-20250514` | Claude Sonnet 4 |
| `claude-opus-4-1-20250805` | Claude Opus 4.1 |

## Tablas de base de datos

Este módulo no posee tablas. Todo el estado de conversación y de uso se almacena en las tablas del motor (`melis_ai_conversation_state`, `melis_ai_daily_usage`).

## Archivos clave

| Aspecto | Ruta |
| --- | --- |
| Servicio del proveedor | `vendor/melisplatform/melis-ai-engine-claude/src/Service/MelisAIEngineModelClaudeService.php` |
| Fábrica del servicio | `vendor/melisplatform/melis-ai-engine-claude/src/Service/Factory/MelisAIEngineModelClaudeServiceFactory.php` |
| Bloque de configuración | `vendor/melisplatform/melis-ai-engine-claude/config/app.interface.php` |

## Véase también

- [MelisAIEngine](/es/reference/modules/melis-ai-engine) — el motor abstracto, las tablas compartidas y el puente MCP; contiene el enrutamiento que selecciona este proveedor por nombre de compañía.
- [MelisAIEngineGemini](/es/reference/modules/melis-ai-engine-gemini) — el proveedor de Google Gemini.
- [MelisAI](/es/reference/modules/melis-ai) — back-office React para gestionar instancias, agentes, herramientas, modelos y claves de API; la única interfaz donde Claude aparece.
- [Referencia de módulos](/es/reference/modules) — el mapa completo de módulos.
