# IA: agentes y motor

Melis incluye un **motor de IA** que le permite crear **agentes** — flujos de trabajo de IA
programados y de varios pasos — y exponerlos en cualquier parte del back-office o en sus propios
módulos. Distintos proveedores (Anthropic Claude, Google Gemini, Ollama, OCI) se conectan detrás de
un único motor.

Los módulos implicados: `melis-ai` (herramientas React del back-office + el Asistente de IA global),
`melis-ai-engine` (el motor y la interfaz de chat compartida),
`melis-ai-engine-claude` / `melis-ai-engine-gemini` (proveedores), y
`melis-ai-community-extensions` (agentes de ejemplo listos para usar).

En v6, el framework y los módulos no cambian; lo que ha cambiado es el **back-office**, ahora una
interfaz React en `/melis-react`. La lógica de IA permanece en el servidor — React es presentación
más llamadas a la API.

## Conceptos fundamentales

| Concepto | Qué es | Tabla |
| --- | --- | --- |
| **Compañía / proveedor** | El proveedor de IA (Anthropic, Google…). | `melis_ai_companies` |
| **Modelo** | Un modelo concreto de una compañía (p. ej. un modelo Claude o Gemini). | `melis_ai_models` (`mam_generative_model`) |
| **Clave de plataforma** | La clave de API usada para llamar a un proveedor. | `melis_ai_platform_keys` |
| **Agente** | Un flujo de trabajo = una lista ordenada de **pasos de escenario**. | `melis_ai_agents`, `melis_ai_scenario_steps` |
| **Instancia** | Un identificador reutilizable y con nombre para ejecutar un agente (se usa como id de sesión de chat). | `melis_ai_instances` (`mai_instance_id`) |
| **Uso diario** | Contabilidad de tokens/uso por modelo/agente/instancia. | `melis_ai_daily_usage` |

Un **agente** es un *escenario*: una secuencia de pasos como `ENTRY PARAMS`, `AI CONTEXT`,
`AI CHAT`, `CODE`, `EXIT PARAMS`. El motor recorre los pasos, llama al modelo cuando es necesario y
produce una respuesta final — que opcionalmente se vuelve a escribir en la página que la lanzó
(mediante *parámetros de salida*).

## Proveedores

El motor elige un proveedor a partir del nombre de la **compañía** del modelo
(`MelisAIEngine\Service\MelisAIEngineService::getActiveModelClass()`):

- la compañía contiene **"Anthropic"** → `MelisAIEngineModelClaudeService` (módulo `melis-ai-engine-claude`)
- la compañía contiene **"Google"** → `MelisAIEngineModelGeminiService` (módulo `melis-ai-engine-gemini`)
- además de los módulos de proveedor **Ollama** (local) y **OCI** (OCI GenAI), que siguen el mismo contrato

Cada proveedor extiende el `MelisAIEngineModelService` de `melis-ai-engine` e implementa el mismo
contrato (`setClient()`, formateo de payload/mensajes, llamadas a herramientas). Añadir un nuevo
proveedor significa añadir un módulo con su propio servicio de modelo — sin cambios en el motor. Los
proveedores **no tienen interfaz propia**: instalar uno siembra su compañía + modelos en el catálogo,
que luego aparecen como opciones en la administración de MelisAI.

## Dónde reside en el back-office React

En `/melis-react`, MelisAI incluye **un paquete de bricks** que expone **tres herramientas nativas de
React** en la barra lateral izquierda, bajo la sección **Melis AI** — **Admin**, **AI Agents**, **MCP
Inspector** — **más una capa superpuesta con el Asistente de IA global**. Cada herramienta del menú
lleva un conmutador **New / Old**: *New* es la interfaz React, *Old* abre la herramienta clásica en
un iframe.

![La sección de menú de Melis AI](/screenshots/react/melis-ai/melisai-menu-section-melisai.png)

Las herramientas aparecen solo cuando MelisAI está activo. Una cuarta entrada — **AI Tool Creator** —
la aporta un módulo diferente (`melis-ai-tool-creator`).

## Configurarlo (Admin)

Abra **Melis AI → Admin**. Un único conmutador **New/Old** se aplica a toda la herramienta; la vista
React es un contenedor de pestañas — **Usage · Platform AI · Instances · MCP Server · Chat dev
tool** — con un único **Save** para la pestaña activa.

- **Platform AI** — elija una **Company + Model**, pegue las **claves de API**
  (`melis_ai_platform_keys`) y marque la plataforma como **Active** + **Default**. Un modelo debe
  tener una clave para estar activo. El panel derecho gestiona las cargas de archivos — incluido
  **Upload mode: File API vs Embed in request** (Gemini usa File API por defecto, Claude usa embed).

  ![Admin → Platform AI](/screenshots/react/melis-ai/melisai-tool-admin-tab-platformai.png)

- **Instances** — gestione las instancias con nombre usadas para lanzar agentes. La tabla enumera el
  **Name ID** de cada instancia (el `mai_instance_id`) y su agente vinculado; **+ New instance** abre
  un formulario React (Name, Instance ID, Status, Agent, etiqueta por idioma).

  ![Admin → Instances](/screenshots/react/melis-ai/melisai-tool-admin-tab-instances.png)

- **Usage** — consumo de tokens/consultas, total y por instancia, en un intervalo seleccionable.
- **MCP Server** — elija qué funciones MCP expone el servidor y marque las tablas sensibles.
- **Chat dev tool** — una consola de chat para desarrolladores que muestra el payload de IA en bruto
  y la respuesta lado a lado; la forma más rápida de ver qué recibió y respondió realmente el modelo.

## Crear un agente (AI Agents)

En **Melis AI → AI Agents** construye el **escenario** de un agente. La lista muestra los agentes
incluidos con su número de pasos y su número de llamadas acumuladas; al abrir uno se añade una
subpestaña con un editor de cinco pestañas — **Config · AI Tools · DB Rights · Scenario · Run**.

![Lista de AI Agents](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents.png)

- **Config** — nombre, código, descripción, una sustitución de modelo opcional y conmutadores de
  carga de archivos.
- **AI Tools** — marque las herramientas que este agente puede invocar, agrupadas en **MCP tools** y
  **Local tools**; el motor ofrece entonces exactamente esas al modelo.
- **DB Rights** — lectura / escritura / eliminación / borrado por tabla, más un conmutador global
  *Allow table creation*. La escritura, la eliminación de filas y el borrado de tablas son
  irreversibles.
- **Scenario** — los pasos ordenados y tipados: **ENTRY PARAMS** → uno o varios **AI CONTEXT**
  (sistema/conocimiento silencioso) → **AI CHAT** (el turno visible) → **EXIT PARAMS**, con pasos
  **CODE** opcionales. Arrastre para reordenar; cada paso tiene un **Code** que se referencia con
  `[CODE]` para traer la respuesta de un paso anterior a un prompt posterior.

  ![Agente → Scenario](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-scenario.png)

- **Run** — un chat de prueba en vivo contra el agente (la instancia `agenttool`), para que pueda
  iterar sobre el escenario y las herramientas sin salir del editor.

## El Asistente de IA

El **Asistente de IA** global es un botón flotante en la esquina inferior derecha de cada pantalla
(no tiene entrada de menú). Abre un panel de chat que ejecuta el **Main Chat Assistant** general
(instancia `mainchatassistantgeneral`), y puede controlar el back-office — abrir una herramienta,
abrir una página — directamente desde la conversación. Permanece montado durante las navegaciones,
por lo que una sesión abierta sobrevive al cambio de herramienta.

![Panel del Asistente de IA abierto](/screenshots/react/melis-ai/melisai-footer-icon-generalassistant-deployed.png)

## Usar un agente desde su código

La integración del lado del servidor más sencilla sigue siendo el **view helper `AIChatViewHelper`**
(`melis-ai-engine/src/View/Helper/MelisAIChatViewHelper.php`). Colóquelo en una vista `.phtml` para
renderizar un chat listo para usar vinculado a una instancia:

```php
<?= $this->AIChatViewHelper(
    $maiInstanceId,        // instance id from melis_ai_instances.mai_instance_id
    $agentId = null,       // optional explicit agent id
    $extraEntryParams = [],// custom_text / custom_files / custom_data
    $debugMode = false,
    $exitParamArr = []     // where to write the result back (fields, js/route callbacks)
) ?>
```

Un patrón habitual es **acotar la sesión por objeto** añadiendo un id como sufijo al id de instancia,
p. ej. `"newscontentcreator|".$newsId` — de modo que cada noticia mantenga su propia conversación.

En el back-office React, el equivalente es el componente **`AiChatContainer`** exportado por
`melis-ai-engine` (mediante el alias de Vite `@melis-ai-engine`). Móntelo con un `maiInstanceId` y
ejecuta todo el bucle `init → run → (continue×N) → validate` contra los endpoints
`/melis/react-api/ai-engine/*` — sin necesidad de trabajo en el backend:

```tsx
import { AiChatContainer } from '@melis-ai-engine'

<AiChatContainer maiInstanceId="newscontentcreator|42" clearSession autoRun />
```

::: tip Ejemplo real
`melis-ai-community-extensions` incluye agentes funcionales — p. ej. un *news content creator* que
toma un prompt + imágenes y vuelve a escribir el texto generado en el formulario de noticias mediante
un callback de salida. Lea
`vendor/melisplatform/melis-ai-community-extensions/src/Controller/NewsController.php` para ver el
helper usado de principio a fin.
:::

De forma programática, el motor se controla a través de
`MelisAIEngine\Service\MelisAIEngineAgentService` (`runAgent()`, `validateAnswer()`,
`continueConversation()`, `restartAgent()`, `getFinalAnswer()`), construido por agente + instancia,
con el estado de la conversación persistido en un almacén respaldado por base de datos
(`MelisAIEngineConversationStore`) en lugar de en sesiones PHP. Tanto el view helper clásico como el
contenedor de chat React llaman a este mismo servicio.

## Herramientas

Los agentes pueden invocar **herramientas** (funciones) durante una ejecución — incluidas
**herramientas MCP** para operaciones de archivos y de base de datos. Use el **MCP Inspector**
(Melis AI → MCP Inspector) para confirmar que un servidor está activo y que sus herramientas son
detectables antes de permitirlas en un agente. Consulte la página dedicada de [MCP](./mcp).

## Archivos clave

| Aspecto | Ruta |
| --- | --- |
| Servicio del motor | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineService.php` |
| Ejecución de agentes | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineAgentService.php` |
| View helper de chat | `vendor/melisplatform/melis-ai-engine/src/View/Helper/MelisAIChatViewHelper.php` |
| Contenedor de chat React | `vendor/melisplatform/melis-ai-engine/ui-react/src/AiChatContainer.tsx` |
| Backend del chat React | `vendor/melisplatform/melis-ai-engine/src/Controller/React/MelisReactApiAiEngineController.php` |
| Proveedor Claude | `vendor/melisplatform/melis-ai-engine-claude/src/Service/MelisAIEngineModelClaudeService.php` |
| Proveedor Gemini | `vendor/melisplatform/melis-ai-engine-gemini/src/Service/MelisAIEngineModelGeminiService.php` |
| Bricks React del back-office | `vendor/melisplatform/melis-ai/ui-react/src/` |
| Agentes de ejemplo | `vendor/melisplatform/melis-ai-community-extensions/` |

> Para el back-office clásico (iframe) de cualquiera de estas herramientas, use el conmutador **Old**
> de cada herramienta — el comportamiento legado está documentado en [/legacy](/legacy/guide/ai).
> Lea el código de los módulos para conocer la API exacta y actual — consulte la
> [Referencia de módulos](../reference/modules).
