# MelisAIEngineGemini

> Fornecedor Google Gemini para o motor de IA Melis — um motor de backend sem back-office próprio. Pacote `melisplatform/melis-ai-engine-gemini`.

## Objetivo

`MelisAIEngineGemini` é a implementação concreta Google Gemini do contrato
`MelisAIEngineModelService` de `MelisAIEngine`. Fornece a configuração do cliente HTTP específica do Gemini, o
formato de payload `generateContent` (o esquema `contents` / `parts`), o mapeamento de chamadas de ferramentas/funções,
o tratamento de ficheiros através da File API ou de incorporação inline, e a análise da utilização de tokens. O módulo é sem estado
(não tem tabelas próprias) e **não inclui interface** — todos os ecrãs de IA são fornecidos por `melis-ai` /
`melis-ai-engine`.

## Sem back-office React

Este módulo **não tem ferramenta React** e não se destina a ter uma — é uma camada de fornecedor de backend,
não um ecrã. Não inclui qualquer brick `ui-react/`, nem `config/react-api.php`, nem
`config/react.capabilities.php`, nem controlador, e não apresenta **qualquer entrada na barra lateral ou nó de menu** em
`/melis-react`. Não existem capturas de ecrã.

No back-office React, o Gemini surge apenas de forma **indireta**, como um motor/modelo selecionável dentro
da administração **MelisAI** (Platform AI / Instances / Models & keys). Quando um administrador cria um modelo
cuja empresa é **Google** e este módulo está instalado, `MelisAIEngine` encaminha o chat e os agentes desse modelo
através do motor Gemini aqui implementado — sem qualquer página Gemini dedicada.

## Ativá-lo

Adicione a `config/melis.module.load.php`:

```php
return [
    'MelisAIEngineGemini',
];
```

Requer `melisplatform/melis-ai-engine` `^6.0`. O motor seleciona este fornecedor automaticamente
em tempo de execução quando o nome da empresa do modelo ativo contém **`Google`** e este módulo está
instalado; constrói `MelisAIEngineModelGeminiService` através de
`$serviceManager->build(MelisAIEngineModelGeminiService::class, ['modelId' => …, 'agentId' => …])`.

## Serviços principais

| Alias do serviço | Função |
| --- | --- |
| `MelisAIEngineModelGeminiService` | O fornecedor Gemini — subclasse de `MelisAIEngineModelService`, construído por pedido com `modelId` + `agentId` (via `MelisAIEngineModelGeminiServiceFactory`). |

Métodos notáveis de `MelisAIEngineModelGeminiService`:

| Método | Implementação Gemini |
| --- | --- |
| `setClient()` | Constrói um `Laminas\Http\Client` que faz POST para `{api_url}/models/{mam_generative_model}:generateContent`. A chave de API é enviada no cabeçalho de pedido **`x-goog-api-key`** (mantida fora do URL). Timeout longo. |
| `getMessageKey()` | Devolve `'contents'`. |
| `addToolsToPayload()` | Obtém as ferramentas através de `getAgentFunctions()`, saneia cada uma, renomeia `input_schema` → `parameters` e encapsula como `tools:[{functionDeclarations:[…]}]` com `toolConfig.functionCallingConfig.mode='AUTO'`. Recorre a uma ferramenta `url_context` quando não há funções presentes. |
| `constructContent()` / `addContentToPayload()` | Mapeia o papel `assistant` → `model`; constrói arrays `parts` que contêm `{text}`, `{fileData:{fileUri,mimeType}}` (File API) ou `{inlineData:{mimeType,data}}` (base64). |
| `sendCustomAI()` | Faz POST do payload JSON (repete em 5xx / 429); analisa `candidates[].content.parts[]` em busca de texto e de entradas `functionCall`; despacha cada chamada de ferramenta (MCP ou incorporada); acrescenta os resultados como `{functionResponse:{name,response:{result}}}` e itera até deixar de haver chamadas de ferramentas, um `finishReason` ou um limite de segurança. |
| `processFiles()` / `processContextFiles()` | Trata os carregamentos de ficheiros conforme `mam_file_upload_mode` (ver [Modos de carregamento de ficheiros](#modos-de-carregamento-de-ficheiros)); armazena também uma cópia através de `uploadDocument()` para apresentação na sessão. |
| `setPromptTokenCount()` / `setResponseTokenCount()` / `setTotalTokenCount()` | Leem `usageMetadata.promptTokenCount`, `candidatesTokenCount`, `totalTokenCount`. |
| `getAllowedMimetypes()` | Devolve os tipos MIME permitidos a partir do bloco de configuração Gemini. |

## Modos de carregamento de ficheiros

O `mam_file_upload_mode` do modelo controla como os ficheiros chegam ao Gemini:

- **`fileapi`** (predefinição) — carrega para a **File API** do Gemini através de um POST multipart, depois faz polling
  até o estado do ficheiro ser `ACTIVE` e referencia o `fileApiUri` devolvido.
- **`embed`** — envia os bytes do ficheiro inline como base64 (`inlineData`), com extração de texto para
  os formatos suportados.

## Configuração

A configuração fixa do fornecedor reside em `config['plugins']['melisaiengine']['datas']['AI']['Gemini']`
(em `config/app.interface.php`, sem interface):

| Chave | Objetivo |
| --- | --- |
| `api_url` | URL base para os pedidos `generateContent` (`https://generativelanguage.googleapis.com/v1beta`). |
| `upload_url` | Endpoint de carregamento da File API do Gemini (`https://generativelanguage.googleapis.com/upload/v1beta/files`). |
| `allowed_mimetypes` | Tipos MIME aceites (devolvidos por `getAllowedMimetypes()`). |

Os valores por modelo provêm da **linha do modelo** configurada em MelisAI, não deste módulo:

- **`mam_generative_model`** — o id do modelo Gemini (por exemplo, `gemini-…`), usado no URL do pedido.
- **`mapk_keys`** — a **chave de API Google**, enviada no cabeçalho `x-goog-api-key`. Provém do
  registo de chave de plataforma do modelo, não é armazenada em ficheiros de configuração e **não tem alternativa por
  variável de ambiente**.
- **`mam_file_upload_mode`** (`fileapi` por predefinição, ou `embed`) e `mam_internal_upload` — regem
  a forma como os ficheiros são carregados.

::: tip Chave de API no cabeçalho
Ao contrário de versões anteriores que anexavam a chave como parâmetro de consulta `?key=…`, a fonte atual
envia a chave de API Google no cabeçalho de pedido **`x-goog-api-key`**, mantendo-a fora dos URLs e
dos registos de proxy.
:::

## Mapeamento de chamadas de ferramentas/funções

O Gemini usa `parameters` onde o contrato do motor usa `input_schema`; `addToolsToPayload()`
efetua esta renomeação antes de enviar. As chamadas de ferramentas chegam como `{functionCall:{name,args}}` com
**sem id** (posicionais, ao contrário do `tool_use_id` do Claude). O serviço encaminha por `name` através de
`MelisAIEngineMcpService::isMcpTool()` e devolve
`{functionResponse:{name,response:{result:…}}}`.

## Diferenças face ao fornecedor Claude

| Aspeto | Gemini | Claude |
| --- | --- | --- |
| Chave da mensagem | `contents` | `messages` |
| Rótulo do papel de assistente | `model` | `assistant` |
| Chave do esquema da ferramenta | `parameters` | `input_schema` |
| Id da chamada de ferramenta | nenhum (posicional) | `tool_use_id` |
| Método de autenticação | cabeçalho `x-goog-api-key` | cabeçalho `x-api-key` |
| Modo de ficheiro predefinido | `fileapi` | `embed` |

## Ficheiros principais

| Aspeto | Caminho |
| --- | --- |
| Serviço do fornecedor | `vendor/melisplatform/melis-ai-engine-gemini/src/Service/MelisAIEngineModelGeminiService.php` |
| Fábrica do serviço | `vendor/melisplatform/melis-ai-engine-gemini/src/Service/Factory/MelisAIEngineModelGeminiServiceFactory.php` |
| Configuração fixa | `vendor/melisplatform/melis-ai-engine-gemini/config/app.interface.php` |

## Ver também

- [MelisAIEngine](/pt/reference/modules/melis-ai-engine) — o contrato abstrato e o runtime partilhado.
- [MelisAIEngineClaude](/pt/reference/modules/melis-ai-engine-claude) — o fornecedor Anthropic.
- [MelisAI](/pt/reference/modules/melis-ai) — back-office para agentes, instâncias e modelos.
