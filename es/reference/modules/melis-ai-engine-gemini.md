# MelisAIEngineGemini

> Proveedor Google Gemini para el motor de IA de Melis — un motor de backend sin back-office propio. Paquete `melisplatform/melis-ai-engine-gemini`.

## Propósito

`MelisAIEngineGemini` es la implementación concreta para Google Gemini del contrato
`MelisAIEngineModelService` de `MelisAIEngine`. Proporciona la configuración del cliente HTTP
específica de Gemini, la forma del payload de `generateContent` (el esquema `contents` / `parts`),
el mapeo de tools/llamadas a funciones, el manejo de archivos mediante la File API o la incrustación
en línea, y el análisis del uso de tokens. El módulo no tiene estado (sin tablas propias) y no
incluye **ninguna interfaz de usuario** — todas las pantallas de IA las proporcionan `melis-ai` /
`melis-ai-engine`.

## Sin back-office React

Este módulo **no tiene ninguna herramienta React** y no está pensado para tenerla — es una capa de
proveedor de backend, no una pantalla. No incluye ningún brick `ui-react/`, ni `config/react-api.php`,
ni `config/react.capabilities.php`, ni controlador, y no muestra **ninguna entrada en la barra
lateral ni nodo de menú** en `/melis-react`. No hay capturas de pantalla.

En el back-office React, Gemini aparece únicamente de forma **indirecta**, como un motor/modelo
seleccionable dentro del administrador de **MelisAI** (Platform AI / Instances / Models & keys).
Cuando un administrador crea un modelo cuya empresa es **Google** y este módulo está instalado,
`MelisAIEngine` enruta el chat y los agentes de ese modelo a través del motor Gemini implementado
aquí — sin ninguna página dedicada a Gemini.

## Activarlo

Añádelo a `config/melis.module.load.php`:

```php
return [
    'MelisAIEngineGemini',
];
```

Requiere `melisplatform/melis-ai-engine` `^6.0`. El motor selecciona este proveedor automáticamente
en tiempo de ejecución cuando el nombre de la empresa del modelo activo contiene **`Google`** y este
módulo está instalado; construye `MelisAIEngineModelGeminiService` mediante
`$serviceManager->build(MelisAIEngineModelGeminiService::class, ['modelId' => …, 'agentId' => …])`.

## Servicios clave

| Alias de servicio | Función |
| --- | --- |
| `MelisAIEngineModelGeminiService` | El proveedor Gemini — subclase de `MelisAIEngineModelService`, construido por petición con `modelId` + `agentId` (a través de `MelisAIEngineModelGeminiServiceFactory`). |

Métodos destacados de `MelisAIEngineModelGeminiService`:

| Método | Implementación Gemini |
| --- | --- |
| `setClient()` | Construye un `Laminas\Http\Client` que hace POST a `{api_url}/models/{mam_generative_model}:generateContent`. La clave de API se envía en la cabecera de petición **`x-goog-api-key`** (fuera de la URL). Timeout largo. |
| `getMessageKey()` | Devuelve `'contents'`. |
| `addToolsToPayload()` | Obtiene las tools mediante `getAgentFunctions()`, sanea cada una, renombra `input_schema` → `parameters` y las envuelve como `tools:[{functionDeclarations:[…]}]` con `toolConfig.functionCallingConfig.mode='AUTO'`. Recurre a una tool `url_context` cuando no hay funciones presentes. |
| `constructContent()` / `addContentToPayload()` | Mapea el rol `assistant` → `model`; construye arrays `parts` que contienen `{text}`, `{fileData:{fileUri,mimeType}}` (File API) o `{inlineData:{mimeType,data}}` (base64). |
| `sendCustomAI()` | Hace POST del payload JSON (reintentos en 5xx / 429); analiza `candidates[].content.parts[]` en busca de texto y entradas `functionCall`; despacha cada llamada a tool (MCP o integrada); añade los resultados como `{functionResponse:{name,response:{result}}}` y repite en bucle hasta que no haya más llamadas a tools, un `finishReason` o un límite de seguridad. |
| `processFiles()` / `processContextFiles()` | Gestiona las subidas de archivos según `mam_file_upload_mode` (ver [Modos de subida de archivos](#modos-de-subida-de-archivos)); también almacena una copia mediante `uploadDocument()` para su visualización en la sesión. |
| `setPromptTokenCount()` / `setResponseTokenCount()` / `setTotalTokenCount()` | Leen `usageMetadata.promptTokenCount`, `candidatesTokenCount`, `totalTokenCount`. |
| `getAllowedMimetypes()` | Devuelve los tipos MIME permitidos del bloque de configuración de Gemini. |

## Modos de subida de archivos

El `mam_file_upload_mode` del modelo controla cómo llegan los archivos a Gemini:

- **`fileapi`** (por defecto) — sube a la **File API** de Gemini mediante un POST multipart, luego
  consulta repetidamente hasta que el estado del archivo sea `ACTIVE`, y referencia el `fileApiUri`
  devuelto.
- **`embed`** — envía los bytes del archivo en línea como base64 (`inlineData`), con extracción de
  texto para los formatos compatibles.

## Configuración

La configuración fija del proveedor reside en `config['plugins']['melisaiengine']['datas']['AI']['Gemini']`
(en `config/app.interface.php`, sin UI):

| Clave | Propósito |
| --- | --- |
| `api_url` | URL base para las peticiones `generateContent` (`https://generativelanguage.googleapis.com/v1beta`). |
| `upload_url` | Endpoint de subida de la File API de Gemini (`https://generativelanguage.googleapis.com/upload/v1beta/files`). |
| `allowed_mimetypes` | Tipos MIME aceptados (devueltos por `getAllowedMimetypes()`). |

Los valores por modelo provienen de la **fila del modelo** configurada en MelisAI, no de este módulo:

- **`mam_generative_model`** — el id del modelo Gemini (p. ej. `gemini-…`), usado en la URL de la petición.
- **`mapk_keys`** — la **clave de API de Google**, enviada en la cabecera `x-goog-api-key`. Proviene
  del registro de clave de plataforma del modelo, no se almacena en archivos de configuración y **no
  tiene alternativa mediante variable de entorno**.
- **`mam_file_upload_mode`** (`fileapi` por defecto, o `embed`) y `mam_internal_upload` — determinan
  cómo se suben los archivos.

::: tip Clave de API en la cabecera
A diferencia de versiones anteriores que añadían la clave como parámetro de consulta `?key=…`, el
código fuente actual envía la clave de API de Google en la cabecera de petición **`x-goog-api-key`**,
manteniéndola fuera de las URLs y de los registros del proxy.
:::

## Mapeo de tools / llamadas a funciones

Gemini usa `parameters` donde el contrato del motor usa `input_schema`; `addToolsToPayload()`
realiza este renombrado antes de enviar. Las llamadas a tools llegan como `{functionCall:{name,args}}`
**sin id** (posicional, a diferencia del `tool_use_id` de Claude). El servicio enruta por `name`
mediante `MelisAIEngineMcpService::isMcpTool()` y devuelve
`{functionResponse:{name,response:{result:…}}}`.

## Diferencias frente al proveedor Claude

| Aspecto | Gemini | Claude |
| --- | --- | --- |
| Clave de mensaje | `contents` | `messages` |
| Etiqueta de rol del asistente | `model` | `assistant` |
| Clave del esquema de tool | `parameters` | `input_schema` |
| Id de llamada a tool | ninguno (posicional) | `tool_use_id` |
| Método de autenticación | cabecera `x-goog-api-key` | cabecera `x-api-key` |
| Modo de archivo por defecto | `fileapi` | `embed` |

## Archivos clave

| Aspecto | Ruta |
| --- | --- |
| Servicio del proveedor | `vendor/melisplatform/melis-ai-engine-gemini/src/Service/MelisAIEngineModelGeminiService.php` |
| Fábrica del servicio | `vendor/melisplatform/melis-ai-engine-gemini/src/Service/Factory/MelisAIEngineModelGeminiServiceFactory.php` |
| Configuración fija | `vendor/melisplatform/melis-ai-engine-gemini/config/app.interface.php` |

## Ver también

- [MelisAIEngine](/es/reference/modules/melis-ai-engine) — el contrato abstracto y el runtime compartido.
- [MelisAIEngineClaude](/es/reference/modules/melis-ai-engine-claude) — el proveedor Anthropic.
- [MelisAI](/es/reference/modules/melis-ai) — back-office para agentes, instancias y modelos.
