# MelisTemplatingPluginCreator

> Um assistente de back-office que gera a estrutura completa de um **plugin de templating** de
> front-office — configuração, controlador, vista, formulário modal, recursos e traduções — para um
> módulo novo ou existente. Na v6 é distribuído como um brick React nativo que invoca uma
> `react-api` em JSON, com um seletor Novo/Antigo para a ferramenta antiga.
> Pacote `melisplatform/melis-templating-plugin-creator`.

## Objetivo

O MelisTemplatingPluginCreator é um gerador de código, não uma funcionalidade de tempo de execução.
Conduz o utilizador por um **assistente de 6 passos** — nome do plugin, módulo de destino, textos de
menu localizados, propriedades (campos), traduções — e depois escreve um plugin de templating pronto
a utilizar no módulo de destino. O plugin gerado estende
`MelisEngine\Controller\Plugin\MelisTemplatingPlugin`, pelo que, uma vez criado, comporta-se como
qualquer plugin de templating escrito à mão — leia [Plugins](/pt/guide/plugins) para compreender e
personalizar o resultado.

## Ativação

É um módulo Laminas padrão. Adicione-o a `config/melis.module.load.php`:

```php
return [
    // …
    'MelisTemplatingPluginCreator',
];
```

Dependências do Composer (`composer.json`): `melis-core`, `melis-tool-creator`, `melis-cms`. Quando o
destino é um módulo **novo**, a ferramenta delega em `MelisToolCreatorService::createTool()` para gerar
primeiro a estrutura do módulo. Não é necessária qualquer base de dados, mas o diretório `module/` e uma
pasta `tpc/temp-thumbnail/` sob a raiz de documentos pública têm de ter permissões de escrita (a extensão
GD também é necessária para a validação das miniaturas). O brick React apresenta estes requisitos como
avisos de verificação prévia **bloqueantes** quando o sistema de ficheiros não permite escrita ou o GD
está em falta.

## O back-office React

O assistente é um **brick totalmente React nativo** (não um iframe) montado em `/melis-react`. Abre como
um separador superior denominado **Templating Plugin Creator** com uma barra de 6 passos e um seletor
**New / Old** (canto superior direito, junto a **Restart**). *Old* recorre à ferramenta jQuery antiga num
iframe; *New* (predefinição) é o assistente React. O brick é `persistent`: sair do separador da ferramenta
e voltar não perde o rascunho nem o passo atual. Os 6 passos são painéis mostrados/ocultados por CSS numa
única página montada.

![Passo 1 (Plugin) do assistente React: Nome do plugin, Destino do plugin (Módulo novo / Módulo de site existente) com um campo de nome de módulo novo, a barra de 6 passos e o botão Seguinte](/screenshots/react/melis-templating-plugin-creator/melistemplatingplugincreator-tool-step1.png)

Toda a lógica de negócio permanece do lado do servidor: a validação reconstrói os formulários Laminas
antigos (os mesmos validadores, mensagens e regras) e a geração invoca
`MelisTemplatingPluginCreatorService`. O React é apresentação + chamadas à API.

### Os 6 passos

| Passo | Nome | O que faz |
| --- | --- | --- |
| 1 | Plugin | Nome do plugin + destino: **Módulo novo** (revela um campo de nome de módulo novo) ou **Módulo de site existente** (lista pendente de módulos). |
| 2 | Menu Texts & Display | Título/descrição por idioma apresentados na lista de plugins do editor de páginas (≥1 idioma) + carregamento obrigatório de miniatura (GIF/JPG/PNG, ~190×100, ≤500 kB). |
| 3 | Main Properties | Número de propriedades (1–25, `template_path` incluído); por campo, um nome técnico, tipo de apresentação, indicador de obrigatoriedade e valor predefinido. A propriedade 1 é o `template_path`, imposto e só de leitura. |
| 4 | Properties' Translation | Rótulo + dica por idioma para cada campo (mais um rótulo por opção de Dropdown); um idioma completo é suficiente. |
| 5 | Summary | Recapitulação só de leitura dos passos 1→4, módulo de destino e caminho de template calculado. Nada é escrito aqui. |
| 6 | Finalization | Opcionalmente, escolha um **Site** onde ativar e ative **Activate plugin after creation**, depois **Finish and create the plugin**. |

`template_path` é sempre a primeira propriedade imposta, calculada do lado do servidor como
`<Module>/plugins/<plugin-view-name>` e nunca enviada pelo cliente. **O passo 6 é a única operação de
escrita**: escreve os ficheiros do plugin e — no ramo de módulo novo — gera a estrutura do módulo,
regista-o opcionalmente no `module.load.php` do site escolhido, ativa-o e invalida a cache de caminhos de
módulos (a ativação requer um recarregamento da plataforma, apresentado como uma contagem decrescente). Os
tipos de apresentação disponíveis incluem `MelisText`, `Dropdown`, `DatePicker`, `DateTimePicker`,
`PageInput`, `NumericInput`, `Switch`, `Textarea`, `MelisCoreTinyMCE`.

![Passo 2 (Menu Texts & Display): título e descrição por idioma (English / Français) mais o cartão obrigatório da miniatura do plugin com pré-visualização e Remove thumbnail](/screenshots/react/melis-templating-plugin-creator/melistemplatingplugincreator-tool-step2.png)

![Passo 3 (Main Properties): Número de propriedades (1–25) e a Propriedade 1, o template_path imposto e só de leitura com o seu valor predefinido calculado no servidor](/screenshots/react/melis-templating-plugin-creator/melistemplatingplugincreator-tool-step3.png)

![Passo 6 (Finalization): a lista pendente Site, o seletor Activate plugin after creation e o botão Finish and create the plugin](/screenshots/react/melis-templating-plugin-creator/melistemplatingplugincreator-tool-step6.png)

## API React

As rotas encontram-se em `config/react-api.php`, servidas por
`MelisReactApiTemplatingPluginCreatorController`, todas sob `/melis/react-api/tpc`, com o contrato
`{ success, data, error }`. A falha de validação **não** é um erro HTTP: `POST /tpc/step/:step` devolve
`{ valid:false, errors:{…} }` para que a interface possa mostrar mensagens por campo.

| Método & URL | Objetivo |
| --- | --- |
| `GET /tpc/context` | Verificação prévia (verificações de escrita no FS + GD → `blocking[]`), metadados dos passos, idiomas, módulos de site, sites, tipos de apresentação, `maxFields` (25), limites da miniatura. |
| `GET /tpc/state` | Restaura o assistente a partir da sessão partilhada. |
| `POST /tpc/reset` | Reiniciar: limpa o rascunho da sessão + a miniatura temporária. |
| `POST /tpc/step/:step` (`1–4`) | Valida + persiste um passo → `{ valid, errors }`. |
| `POST /tpc/thumbnail` · `POST /tpc/thumbnail/remove` | Carrega / remove a miniatura do plugin. |
| `GET /tpc/translation-fields` | Campos a traduzir (derivados do passo 3). |
| `GET /tpc/summary` | Recapitulação só de leitura dos passos 1→4 + módulo de destino + caminho de template. |
| `POST /tpc/generate` | **Gera o plugin** (escreve ficheiros, opcionalmente gera a estrutura + ativa um módulo). |

## Capacidades (direitos avançados)

Declaradas em `config/react.capabilities.php` sob a melisKey portadora de direitos
`melistemplatingplugincreator_tool` (a mesma chave usada pelo manifesto e pela guarda de acesso do
controlador). A semântica é **permitir por predefinição**. Cadeias de capacidade achatadas:

| Capacidade | Controla |
| --- | --- |
| `wizard` · `wizard.edit` | Configurar/validar os passos 1→4 (sem `wizard.edit` todo o assistente é só de leitura). |
| `thumbnail` · `thumbnail.create` · `thumbnail.delete` | Carregar / remover a miniatura (passo 2). |
| `summary` · `summary.list` | Ler a recapitulação (passo 5). |
| `finalization` · `finalization.create` | **Gerar o plugin** (passo 6) — a capacidade sensível. |

Todas as ações do controlador são protegidas duas vezes — `denyUnlessAccess()` (autenticação +
`canAccess`) e depois `denyUnlessCan(cap)`. Ocultar controlos na interface é apenas UX; o servidor recusa
de qualquer forma.

## Serviços principais

Registados como um alias de `service_manager` em `config/module.config.php`.

| Alias | Função |
| --- | --- |
| `MelisTemplatingPluginCreatorService` | Gera (e reverte) o plugin de templating a partir dos dados do assistente guardados na sessão. |

O `MelisTemplatingPluginCreatorService` (estende `MelisCore\Service\MelisGeneralService`) expõe
nomeadamente:

| Método | Função |
| --- | --- |
| `generateTemplatingPlugin()` | Ponto de entrada: lê os passos da sessão e escreve todos os ficheiros do plugin; reverte em caso de falha. Devolve um booleano. |
| `getSiteTemplatingPluginNames($siteModule)` | Lista os nomes de plugins de templating existentes de um módulo de site (usado para rejeitar nomes de plugin duplicados). |
| `generateModuleNameCase($str)` / `convertToViewName($string)` | Normalizam um nome para um nome de módulo válido / nome de diretório de vista. |
| `getTempThumbnail()` | Resolve o caminho temporário da miniatura do plugin carregada para a sessão atual. |

Internamente, `generateTemplatingPlugin()` executa `performGeneration()`, que escreve a configuração do
plugin (`config/plugins/<Module><Plugin>Plugin.config.php`), atualiza o `module.config.php` de destino
(`template_map` + `controller_plugins`), acrescenta traduções por idioma, gera recursos (css/js +
miniatura), o controlador (`src/<Module>/Controller/Plugin/<Module><Plugin>Plugin.php`), a vista de front
e o formulário modal, e inclui a nova configuração a partir do `Module.php` do módulo. O controlador React
escreve o estado do seu assistente no **mesmo contentor de sessão** que a ferramenta antiga
(`templatingplugincreator`), porque o serviço captura o seu estado no construtor.

## Front office

Este módulo não adiciona **nenhum** plugin de front-office nem view helper próprio em tempo de execução.
Em vez disso, **gera** um plugin de templating no módulo de destino: uma classe de controller-plugin que
estende `MelisEngine\Controller\Plugin\MelisTemplatingPlugin` com `loadDbXmlToPluginConfig()` /
`savePluginConfigToXml()` ligados aos campos configurados, um `config/plugins/*.config.php` (secções
`front` + `melis`, um separador **Properties**), um `.phtml` de front, um `.phtml` de formulário modal e
recursos css/js. O plugin gerado passa então a aparecer no menu de plugins do editor de páginas do CMS e é
largado numa `MelisDragDropZone` como qualquer outro plugin de templating — veja [Plugins](/pt/guide/plugins)
e [Construir um site](/pt/guide/build-a-site).

## Tabelas de base de dados

Nenhuma. Esta ferramenta gera apenas ficheiros de código-fonte e armazena o estado em curso do seu
assistente num contentor de sessão Laminas (`templatingplugincreator`); não são instaladas tabelas
`melis_*`.

## Exemplo

O plugin gerado é consumido como qualquer plugin de templating. Do lado do serviço, o passo final do
assistente invoca:

```php
$tpcService = $serviceManager->get('MelisTemplatingPluginCreatorService');
$result = $tpcService->generateTemplatingPlugin(); // true on success, files written to the target module
```

## Ficheiros principais

| Assunto | Caminho |
| --- | --- |
| Carregamento do módulo / configuração | `vendor/melisplatform/melis-templating-plugin-creator/src/Module.php` |
| Ligações (serviço, elementos de formulário, vistas) | `vendor/melisplatform/melis-templating-plugin-creator/config/module.config.php` |
| Rotas da API React + invocável | `vendor/melisplatform/melis-templating-plugin-creator/config/react-api.php` |
| Capacidades React | `vendor/melisplatform/melis-templating-plugin-creator/config/react.capabilities.php` |
| Formulários do assistente + configuração dos passos (reutilizados para validação) | `vendor/melisplatform/melis-templating-plugin-creator/config/app.tools.php` |
| Controlador da API React | `vendor/melisplatform/melis-templating-plugin-creator/src/Controller/MelisReactApiTemplatingPluginCreatorController.php` |
| Controlador do assistente antigo (iframe da vista Old) | `vendor/melisplatform/melis-templating-plugin-creator/src/Controller/TemplatingPluginCreatorController.php` |
| Serviço gerador | `vendor/melisplatform/melis-templating-plugin-creator/src/Service/MelisTemplatingPluginCreatorService.php` |
| Brick React (fonte + compilado) | `vendor/melisplatform/melis-templating-plugin-creator/ui-react/` · `public/ui-react/` |

Consulte também: [Referência de módulos](/pt/reference/modules) · [Plugins](/pt/guide/plugins) ·
[Criar uma ferramenta](/pt/guide/create-a-tool) · [Construir um site](/pt/guide/build-a-site).
