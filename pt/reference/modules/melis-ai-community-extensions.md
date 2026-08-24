# MelisAICommunityExtensions

> Injeta geração por IA nas superfícies de edição existentes do CMS — criador de mini-templates, criador de conteúdo de notícias e botões de IA nas zonas de arrastar e largar. No back-office React fornece um brick de extensão (injeção no host) sem página própria. Pacote `melisplatform/melis-ai-community-extensions`.

## Objetivo

O MelisAICommunityExtensions é uma camada aplicacional sobre a suite MelisAI que integra a geração por IA diretamente nas superfícies de edição existentes. Regista duas instâncias pré-configuradas (`minitemplatecreator` e `newscontentcreator`), um conjunto de ferramentas MCP e um conjunto de listeners de eventos que gerem o ciclo de vida dos recursos de front-end gerados por IA (CSS, JS, imagens). **Não tem ecrã de ferramenta autónomo**; em vez disso, injeta botões **Generate with AI** e modais de chat no Gestor de Mini-Templates, no editor de Notícias e nas zonas de arrastar e largar das páginas. O chat de IA em si é servido pelo MelisAI / MelisAIEngine — este módulo fornece apenas a interface envolvente e a ligação de entrada/saída.

## Como ativar

Adicione a `config/melis.module.load.php`:

```php
return [
    'MelisAICommunityExtensions',
];
```

Requer `melisplatform/melis-ai`. Execute o dbdeploy após a ativação — o módulo insere as linhas de agente/instância `minitemplatecreator` e `newscontentcreator` nas tabelas do motor MelisAI (`dbdeploy: true`). Integra-se com o MelisCms e o MelisCmsNews.

## Onde reside no back-office React

O brick React é um **brick de extensão / injeção no host**: não desenha nenhuma página e não adiciona nenhuma entrada na barra lateral. Ao carregar, regista **dois pontos de extensão do host** em `window` que as páginas React de outros módulos invocam para renderizar o botão *Generate with AI* inline, além de um widget `Header` sempre montado (`MiniTemplateAiDialogHost`) que ancora o diálogo de edição de página acima dos frames de edição legados.

Como não tem rota, não há nada para onde navegar — encontra-o *dentro de outras ferramentas*:

- **Editor de Notícias** (MelisCmsNews) → separador **Texts** → botão por parágrafo.
- **Gestor de Mini-Templates** (MelisCms) → campo *Template's HTML* → botão.
- **Edição de página** (arrastar e largar do MelisCms) → botão da zona / do plugin de tag HTML.

**Condicionado pela ativação de dois módulos.** Os botões só aparecem se **ambos** o `MelisAICommunityExtensions` e o `MelisAI` estiverem ativos (verificado em tempo real através do `__melisIsModuleActive` do host, suportado por `GET /melis/react-api/react-modules`). O MelisAI é obrigatório porque serve o chat; se qualquer um dos módulos for desativado a meio da sessão, os botões desaparecem sem recarregar. O brick não contribui com **nenhum nó de capacidade** — a visibilidade é puramente esta verificação de dois módulos.

## Superfícies de edição do back-office

São estendidas três superfícies de edição. Em cada uma, um botão de IA abre um chat com âmbito definido e o resultado é escrito de volta no campo correto.

### AI Mini-Template Creator

No Gestor de Mini-Templates, o campo *Template's HTML* apresenta um botão **Generate with AI** renderizado pelo ponto de extensão `renderHtmlActions()`. Abre um diálogo em janela completa: **chat de IA + lista de templates existentes à esquerda, pré-visualização em tempo real à direita** (os dois painéis colapsam em separadores segmentados *AI & Templates / Preview* em larguras reduzidas). O chat usa a instância `minitemplatecreator`, começa do zero a cada abertura (`clearSession`) e volta a buscar o shell real do site a cada resultado da IA, para que o CSS/JS recém-escrito seja refletido.

![O Gestor de Mini-Templates, lista por site com o ponto de entrada Generate with AI](/screenshots/react/melis-ai-community-extensions/melisaicomext-tooloverride-minitplmanager-list.png)

![O chat minitemplatecreator a gerar um template, pré-visualizado contra o shell real do site](/screenshots/react/melis-ai-community-extensions/melisaicomext-tooloverride-minitplmanager-createwithai.png)

Cada linha na lista de templates apresenta um **ícone Melis-AI**: clique nele para gerar um novo template usando esse como referência de base (o chat volta a correr semeado com a marcação do template selecionado). **Insert** captura uma miniatura PNG da pré-visualização (html2canvas) e preenche o formulário; o próprio submit do formulário guarda-o.

![O ícone Melis-AI numa linha de template — variar ou duplicar um template existente com IA](/screenshots/react/melis-ai-community-extensions/melisaicomext-tooloverride-minitplmanager-duplicatewithai.png)

![O formulário Add mini-template — Generate with AI junto ao campo HTML](/screenshots/react/melis-ai-community-extensions/melisaicomext-tooloverride-minitplmanager-addminitpl.png)

### News Content Creator

No separador **Texts** do editor de **Notícias**, cada **Paragraph** recebe um botão **Generate with AI** (por idioma) renderizado pelo ponto de extensão `renderParagraphActions()`. Abre um modal compacto com o chat `newscontentcreator`, **com âmbito no artigo** (semeado com o título, o subtítulo, os restantes parágrafos e as imagens do artigo). A resposta substitui o texto desse parágrafo e marca-o como validado. As sessões são isoladas por artigo através de um id de instância `newscontentcreator|<newsId>`.

![O separador Texts das Notícias — a barra de cabeçalho de cada parágrafo apresenta a ação Generate with AI](/screenshots/react/melis-ai-community-extensions/melisaicomext-tooloverride-news-edit-tab-texts.png)

![O chat newscontentcreator, consciente do contexto do artigo](/screenshots/react/melis-ai-community-extensions/melisaicomext-tooloverride-news-edit-tab-texts-aicreator.png)

### Generate with AI nas zonas de arrastar e largar

Ao editar uma página CMS, as **zonas de arrastar e largar** vazias (e os plugins de tag HTML) recebem um botão **Generate with AI** injetado. Como a edição de página é um iframe legado abaixo do shell React, o botão pede ao host React que abra o *mesmo* diálogo de Mini-Template descrito acima. Ao aceitar, são oferecidas três opções de confirmação: **Close**, **Insert** (largar apenas nesta zona) ou **Save & Insert** (largar e também promover o bloco a mini-template reutilizável permanente).

![Uma zona de arrastar e largar vazia com o botão Generate with AI injetado](/screenshots/react/melis-ai-community-extensions/melisaicomext-pageoverride-dragdropzone-generateaibutton-1.png)

![Um bloco totalmente estilizado gerado diretamente na zona da página](/screenshots/react/melis-ai-community-extensions/melisaicomext-pageoverride-dragdropzone-generateaibutton-2.png)

![A escolha de confirmação Close / Insert / Save & Insert para um bloco gerado](/screenshots/react/melis-ai-community-extensions/melisaicomext-pageoverride-dragdropzone-generateaibutton-differentinserts.png)

## O brick

`ui-react/` é uma biblioteca IIFE Vite (nome `MelisAiCommunityExtensionsBrick`, saída `public/ui-react/brick.js`). O React, o react-dom e o react-router-dom são externalizados para as variáveis globais do host; um alias `@melis-ai-engine` importa o componente de chat partilhado `AiChatContainer`.

| Ficheiro | Papel |
| --- | --- |
| `src/brick.tsx` | Regista os dois pontos de extensão + o `Header`; injeta o Tailwind uma vez. |
| `src/NewsAiExtension.tsx` | `renderParagraphActions()` → botão por parágrafo + modal (instância `newscontentcreator`). |
| `src/MiniTemplateAiExtension.tsx` | `renderHtmlActions()` → o `MiniTemplateAiDialog` em janela completa (chat + lista + pré-visualização; Insert / Save & Insert; miniatura html2canvas). |
| `src/MiniTemplateAiDialogHost.tsx` | A âncora `Header` para a **edição de página**; escuta `melis-ai-minitemplate-open` e monta o diálogo. |

O brick regista-se com **nenhum `Component`** e **nenhuma `Sidebar`** — apenas pontos de extensão protegidos e a âncora `Header`:

```ts
window.__melisNewsExtensions.renderParagraphActions = /* guarded by isModuleActive() */
window.__melisMiniTemplateExtensions.renderHtmlActions = /* guarded by isModuleActive() */
window.__melisRegisterBrick?.({ id: 'melis-ai-community-extensions', Header: MiniTemplateAiDialogHost })
```

## Endpoints que o brick invoca

O brick **não tem `config/react-api.php`**. Consome endpoints pertencentes a outros módulos, além de uma ação MVC legada própria:

| Chamada | Proprietário |
| --- | --- |
| `GET /melis/react-api/cms-mini-templates?site=<m>&limit=9999` | MelisCms (lista de templates) |
| `GET /melis/react-api/cms-mini-templates/item?site=<m>&name=<n>` | MelisCms (HTML de um template) |
| `GET /melis/MelisAICommunityExtensions/MiniTemplate/getMiniTemplatePreviewShell?siteModule=<m>` | este módulo (MVC legado; devolve o HTML do shell do site) |
| Tráfego de execução/saída do `AiChatContainer` | MelisAI / MelisAIEngine |

A resposta do chat regressa ao campo do host através de um callback de `window` declarado nos parâmetros de saída (`masse_exit_js_callback`): `__melisNewsAiCallback_<paraIdx>` para as notícias, `__melisMiniTemplateAiCallback` para os mini-templates.

## Integração com o host (ponte de edição de página)

A edição de página corre vários frames abaixo do shell React, pelo que o `MiniTemplateAiDialogHost` define `window.__melisAiMiniTemplateDialogReady = true` e escuta um evento `melis-ai-minitemplate-open`. A página editada executa `public/js/minitemplate/react-bridge.js`, que percorre **a cadeia de frames para cima** à procura de `__melisAiMiniTemplateDialogReady`; quando encontrado, despacha o evento de abertura com callbacks `onInsert` / `onSaveInsert` de mesma origem. Se não for encontrado nenhum host React (`/melis` legado), a ponte recua para o modal Bootstrap histórico — nada muda aí.

Para ferramentas legadas exibidas na vista React **"Old"**, o `config/module.config.php` regista `melis_react_override.toolpage_extensions` → `PluginViewToolPageExtension`, que injeta o `tool.js` / `style.css` deste módulo para que os jsCallbacks enxertados nas ferramentas MelisCms / MelisCmsNews encontrem as suas variáveis globais.

## Listeners de eventos

| Listener | Evento | Efeito |
| --- | --- | --- |
| `…TinyMCEConfigurationListener` | `meliscore_tinymce_config` | Aponta o plugin `minitemplate` do TinyMCE para o JS deste módulo. |
| `…CreateMiniTemplateListener` | `meliscms_mini_template_manager_create_end` | Move o CSS/JS/imagens temporários para armazenamento permanente; renomeia o JS de inicialização por template. |
| `…PublishPageListener` | `meliscms_page_publish_start` | Promove os recursos temporários referenciados por uma página publicada; atualiza `page_content`. |
| `…SanitizeSavedPluginHtmlListener` | `meliscms_page_savesession_plugin_start` | Limpa a marcação de runtime de carrossel/slider (artefactos Owl/Slick/Swiper) antes de guardar. |
| `…DeleteMiniTemplateAssetsListener` | `meliscms_mini_template_manager_delete_end` | Elimina o CSS/JS/imagens do template. |
| `…AttachAIGeneratedCssListener` | `MvcEvent::EVENT_FINISH` (front + back) | Injeta o CSS/JS de IA nas páginas renderizadas. |
| `…InjectDndAiButtonListener` | `MvcEvent::EVENT_FINISH` | Injeta o botão **Generate with AI** nas zonas de arrastar e largar legadas. |

O módulo também regista um `MelisPluginRendererOverride` para que os recursos de IA sejam injetados corretamente durante a renderização de plugins.

## Servidor MCP

Um servidor MCP stdio `minitemplate_creator` (ponto de entrada `mcp/minitemplatecreator/bin/server.php`) está registado em `config['mcp']['servers']`. As ferramentas abaixo são declaradas com `mcp: true`:

| Ferramenta | Parâmetros | Objetivo |
| --- | --- | --- |
| `readSiteAssets` | `siteModule`, `templateRequest` | Devolve os ficheiros CSS/JS/vista relevantes do site para que a IA corresponda ao design real. |
| `getSitePublicUrl` | `siteModule` | Devolve o URL/domínio público do site para inspeção visual antes de gerar. |
| `uploadMinitemplateImages` | `siteModule`, `image`, `filename` | Guarda uma imagem (base64/data-URL/HTTP) no diretório temporário de IA e devolve um caminho web para `<img src>`. |
| `renderMinitemplatePreview` | `siteModule` | Aciona a pré-visualização do template gerado no editor. |

O agente `minitemplatecreator` também tem as ferramentas de sistema de ficheiros do motor (`createFile` / `readFile` / `updateFiles` / …) na sua allow-list. A meio da conversa, o diálogo React regista `window.melisReactActionMap.preview_minitemplate` para que o motor possa enviar o bloco `html` gerado para a pré-visualização em tempo real quando `render_minitemplate_preview` retorna.

## Tabelas da base de dados

Este módulo não cria tabelas próprias. Os seus deltas de dbdeploy inserem linhas em tabelas pertencentes ao `melis-ai`:

| Tabela | Contém |
| --- | --- |
| `melis_ai_instances` | As instâncias semeadas `minitemplatecreator` e `newscontentcreator`. |
| `melis_ai_agents` | Os agentes semeados para as duas instâncias. |

Em tempo de execução, os dados de notícias são acedidos através de `NewsTable` (`getNewsData($newsId)`), que faz o join com a tabela do site para resolver o `siteModule` necessário para colocar as imagens geradas.

## Ficheiros-chave

| Assunto | Caminho |
| --- | --- |
| Configuração do módulo (rota MVC, toolpage_extensions) | `vendor/melisplatform/melis-ai-community-extensions/config/module.config.php` |
| Código-fonte do brick | `vendor/melisplatform/melis-ai-community-extensions/ui-react/src/` |
| Brick compilado | `vendor/melisplatform/melis-ai-community-extensions/public/ui-react/{brick.js, brick.manifest.json}` |
| Ponte de frames da edição de página | `vendor/melisplatform/melis-ai-community-extensions/public/js/minitemplate/react-bridge.js` |
| Declaração das ferramentas MCP | `vendor/melisplatform/melis-ai-community-extensions/config/mcp.tools.php` |
| Controlador de mini-templates | `vendor/melisplatform/melis-ai-community-extensions/src/Controller/MiniTemplateController.php` |
| Controlador de notícias | `vendor/melisplatform/melis-ai-community-extensions/src/Controller/NewsController.php` |
| Injetor da vista "Old" | `vendor/melisplatform/melis-ai-community-extensions/src/Controller/React/PluginViewToolPageExtension.php` |
| Listeners | `vendor/melisplatform/melis-ai-community-extensions/src/Listener/` |
| Helper do botão Generate-with-AI | `vendor/melisplatform/melis-ai-community-extensions/src/View/Helper/MelisGenerateWithAIBtnHelper.php` |
| Gateway da tabela de notícias | `vendor/melisplatform/melis-ai-community-extensions/src/Model/Tables/NewsTable.php` |
| Ponto de entrada do servidor MCP | `vendor/melisplatform/melis-ai-community-extensions/mcp/minitemplatecreator/bin/server.php` |
| Diretório de recursos de IA | `public/miniTemplatesTinyMce/AI/{siteModule}/{temp\|css\|js\|images}/` |
| Deltas de instalação (agentes semeados) | `vendor/melisplatform/melis-ai-community-extensions/install/dbdeploy/` |

Ver também: [MelisAIEngine](/pt/reference/modules/melis-ai-engine), [MelisAI](/pt/reference/modules/melis-ai), [MelisAIToolCreator](/pt/reference/modules/melis-ai-tool-creator), [MelisCms](/pt/reference/modules/melis-cms), [MelisCmsNews](/pt/reference/modules/melis-cms-news)
