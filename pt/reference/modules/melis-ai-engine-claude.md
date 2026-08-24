# MelisAIEngineClaude

> Fornecedor Anthropic Claude para o motor de IA da Melis — um motor de backend sem interface React própria. Pacote `melisplatform/melis-ai-engine-claude`.

## Objetivo

`MelisAIEngineClaude` é o fornecedor Anthropic Claude concreto para o conjunto MelisAI. Estende o contrato `MelisAIEngineModelService` do motor e disponibiliza a configuração do cliente HTTP específica do Claude, o formato de payload da API Anthropic Messages, o tratamento de ficheiros, o mapeamento de ferramentas/funções e a análise das respostas. O módulo é sem estado — não possui tabelas de base de dados próprias; todo o estado de execução reside nas tabelas do próprio motor.

O motor seleciona este fornecedor automaticamente em tempo de execução quando a empresa do modelo ativo contém `Anthropic` (e este módulo está instalado).

## Papel no back-office React

Este módulo **não tem ferramenta de back-office React nem interface própria**: sem brick `ui-react/`, sem `config/react-api.php`, sem capabilities e sem controlador. Nunca aparece como ferramenta, nó de menu ou entrada na barra lateral em `/melis-react`. É pura infraestrutura — o caminho de código que permite à Melis comunicar com o Claude.

O seu único efeito visível no back-office React é **transitivo, através do [MelisAI](/pt/reference/modules/melis-ai)**:

- Os seus scripts `install/dbdeploy/*.sql` semeiam a empresa **`Anthropic`** e vários **modelos Claude** no catálogo de modelos do motor.
- Esses modelos passam então a surgir como opções na administração MelisAI (Platform AI / definições de modelo), sob a empresa **Anthropic**.
- Para usar um deles, guarda a sua **chave de API Anthropic** nessa linha de modelo (`mapk_*`) e depois aponta uma **instância / agente** para o modelo Claude.
- A partir daí, todas as conversas nesse agente — incluindo o **Assistente de IA** React — são encaminhadas através deste fornecedor.

> Nunca abre este módulo. Em `/melis-react` é apenas uma linha numa lista pendente de modelos exposta pelo MelisAI, mais o motor por trás das conversas de IA que o utilizam. Se as conversas com o Claude falharem, a causa é normalmente uma **chave de API** em falta na linha do modelo ou um modelo **inativo** — ambos configurados no MelisAI, não aqui.

## Ativação

Adicione a `config/melis.module.load.php` após o motor de IA:

```php
return [
    'MelisAIEngine',
    'MelisAIEngineClaude',
];
```

Dependência: `melisplatform/melis-ai-engine` `^6.0`. A chave de API Anthropic é guardada por modelo no back-office da Melis AI (a linha de chave `mapk_*` do modelo) — não num ficheiro de configuração nem numa variável de ambiente.

## Serviços principais

| Alias do serviço | Papel |
| --- | --- |
| `MelisAIEngineModelClaudeService` | O fornecedor Claude. Estende `MelisAIEngineModelService` e implementa o contrato da API Anthropic Messages. Construído pelo gestor de serviços com as opções de fábrica `['modelId' => …, 'agentId' => …]`. |

Métodos notáveis em `MelisAIEngineModelClaudeService`:

| Método | Papel |
| --- | --- |
| `setClient()` | Constrói um `Laminas\Http\Client` que faz POST para o URL configurado da API Claude Messages. Define os cabeçalhos `Content-Type/Accept: application/json`, `x-api-key` (a partir da chave de API do modelo), `anthropic-version: 2023-06-01` e um cabeçalho `anthropic-beta` que ativa as betas de prompt-caching e web-fetch. Usa um timeout longo para acomodar os ciclos de utilização de ferramentas. |
| `getMessageKey()` | Devolve `'messages'`. |
| `addToolsToPayload()` | Lê as funções do agente através de `getAgentFunctions()`, remove chaves internas do motor (`mcp`, `type`, `server`, `module`, `max_silence`, `operation_timeout`) através de `sanitizeToolForClaudeAPI()`, acrescenta as ferramentas no formato Anthropic (`name`, `description`, `input_schema`), acrescenta a ferramenta incorporada `web_fetch` e elimina duplicados por nome. |
| `constructContent()` / `addContentToPayload()` | Mapeia o papel `model` para `assistant`; constrói blocos de conteúdo Anthropic (`{type:text}`, `{type:image, source:{url\|base64,…}}`, `{type:document, source:{…, media_type:application/pdf}}`); acrescenta a `payload['messages']`. |
| `sendCustomAI()` | Injeta `model` (`mam_generative_model`) e `max_tokens`; faz POST de JSON com tentativas de repetição em respostas 5xx; analisa `content[]` em blocos de texto e `tool_use`; despacha cada ferramenta (MCP via `MelisAIEngineMcpService::invokeTool`, caso contrário incorporada); acrescenta os resultados como `{type:tool_result, tool_use_id, content}` numa mensagem `user`; repete o ciclo até `stop_reason === 'end_turn'` ou até ser atingido um limite de segurança de saltos. Ativa o prompt caching. |
| `processFiles()` / `processContextFiles()` | Converte os carregamentos conforme o `mam_file_upload_mode` do modelo (predefinição: `embed`): DOCX/XLSX → texto extraído, imagens/PDF → base64, ou via `uploadDocument()` quando o carregamento interno está ativado. |
| `setPromptTokenCount()` / `setResponseTokenCount()` / `setTotalTokenCount()` | Leem os campos de `responseData['usage']` (`input_tokens`, `output_tokens`, mais os contadores de leitura/criação de cache); total = input + output. |
| `getAllowedMimetypes()` | Devolve os tipos MIME de carregamento permitidos a partir do bloco de configuração do Claude. |
| `continueConversation()` | Re-hidrata o histórico de mensagens a partir do estado guardado e chama novamente `sendCustomAI()` para a continuação da utilização de ferramentas em múltiplos saltos. |

## Chamada de ferramentas / funções

As ferramentas do motor já usam o formato `input_schema` da Anthropic, pelo que `addToolsToPayload()` sobretudo as sanea e reencaminha. Uma chamada de ferramenta do modelo chega como `{type:'tool_use', name, id, input}`; o serviço extrai `name` / `input` / `id`, encaminha via `MelisAIEngineMcpService::isMcpTool()` (`invokeTool` MCP vs. função incorporada) e devolve o resultado como `{type:'tool_result', tool_use_id:<id>, content:<json>}` dentro de uma mensagem `user`, prosseguindo depois o ciclo. O campo `id` correlaciona chamada↔resultado, conforme exigido pela API Anthropic.

## Configuração

As definições do fornecedor residem em:

```
config['plugins']['melisaiengine']['datas']['AI']['Claude']
```

| Chave | Finalidade |
| --- | --- |
| `api_url` | O URL do endpoint da API Anthropic Messages (`https://api.anthropic.com/v1/messages`). |
| `allowed_mimetypes` | Tipos MIME aceites para carregamentos de ficheiros. |

Um bloco irmão `['AI']['Anthropic']` declara os modos de carregamento de ficheiros (`embed`) e o suporte a carregamento interno. A chave de API **não** é lida da configuração nem do ambiente — provém exclusivamente da linha de chave do modelo na base de dados (`mapk_*`), introduzida por um administrador na administração MelisAI.

## Modelos semeados

Instalados via `install/dbdeploy/*.sql` sob a empresa `Anthropic`; a flag `mam_status` decide quais são disponibilizados:

| `mam_generative_model` | Modelo |
| --- | --- |
| `claude-opus-4-8` | Claude Opus 4.8 |
| `claude-sonnet-4-6` | Claude Sonnet 4.6 |
| `claude-haiku-4-5-20251001` | Claude Haiku 4.5 |
| `claude-sonnet-4-5-20250929` | Claude Sonnet 4.5 |
| `claude-sonnet-4-20250514` | Claude Sonnet 4 |
| `claude-opus-4-1-20250805` | Claude Opus 4.1 |

## Tabelas de base de dados

Este módulo não possui tabelas. Todo o estado de conversas e de utilização é armazenado nas tabelas do motor (`melis_ai_conversation_state`, `melis_ai_daily_usage`).

## Ficheiros principais

| Área | Caminho |
| --- | --- |
| Serviço do fornecedor | `vendor/melisplatform/melis-ai-engine-claude/src/Service/MelisAIEngineModelClaudeService.php` |
| Fábrica do serviço | `vendor/melisplatform/melis-ai-engine-claude/src/Service/Factory/MelisAIEngineModelClaudeServiceFactory.php` |
| Bloco de configuração | `vendor/melisplatform/melis-ai-engine-claude/config/app.interface.php` |

## Ver também

- [MelisAIEngine](/pt/reference/modules/melis-ai-engine) — o motor abstrato, as tabelas partilhadas e a ponte MCP; contém o encaminhamento que seleciona este fornecedor pelo nome da empresa.
- [MelisAIEngineGemini](/pt/reference/modules/melis-ai-engine-gemini) — o fornecedor Google Gemini.
- [MelisAI](/pt/reference/modules/melis-ai) — back-office React para gerir instâncias, agentes, ferramentas, modelos e chaves de API; a única interface onde o Claude surge.
- [Referência de módulos](/pt/reference/modules) — o mapa completo de módulos.
