# MelisDashboardPluginCreator

> Um assistente passo a passo que gera a estrutura de um novo **plugin de dashboard** (widget) do back-office num módulo novo ou existente, agora entregue como um brick React nativo. Pacote `melisplatform/melis-dashboard-plugin-creator`.

## Objetivo

O MelisDashboardPluginCreator é um **assistente de geração de código**: um assistente de 5 passos que gera um widget de dashboard pronto a usar — o seu controlador, vista, configuração, assets e traduções — e integra-o no módulo de destino. Escolhe um widget de **separador único** ou de **múltiplos separadores**, um destino (criar um módulo totalmente novo ou estender um existente), títulos/descrições por idioma, um ícone e uma miniatura; a ferramenta escreve então os ficheiros e (opcionalmente) ativa o plugin.

O widget gerado estende `MelisCore\Controller\DashboardPlugins\MelisCoreDashboardTemplatingPlugin` e é declarado sob a interface `melis_dashboardplugin`, pelo que aparece no dashboard do back-office. O módulo depende de `melis-core` e de `melis-tool-creator` (este último é reutilizado para gerar a estrutura do novo módulo). Para os conceitos por detrás dos plugins de dashboard, consulte [Plugins](/legacy/guide/plugins); para as ferramentas de back-office em geral, consulte [Criar uma ferramenta](/legacy/guide/create-a-tool).

## Ativá-lo

É um módulo Laminas padrão. Adicione-o a `config/melis.module.load.php`:

```php
return [
    // …
    'MelisDashboardPluginCreator',
];
```

Instale via Composer (`composer require melisplatform/melis-dashboard-plugin-creator`); `melis-core` e `melis-tool-creator` são incluídos automaticamente. Não é necessária base de dados.

A ferramenta escreve ficheiros no disco, pelo que os seguintes têm de ser **graváveis** pelo servidor web (verificado em tempo de execução, apresentado ao assistente como `context.blocking[]`): `config/melis.module.load.php`, o diretório `module/` e o caminho da miniatura temporária `<DOCUMENT_ROOT>/dpc/temp-thumbnail/` (configurado em `config/app.tools.php` sob `melisdashboardplugincreator/datas/plugin_thumbnail/path`).

## Back-office React

No back-office React (`/melis-react`), a ferramenta é entregue como um **brick full-React nativo** — um verdadeiro assistente React que invoca uma `react-api` JSON, com um interruptor **New / Old** que recorre à ferramenta jQuery legada num iframe. Todo o trabalho real permanece do lado do servidor: a validação reutiliza os formulários Laminas legados e a geração invoca o `MelisDashboardPluginCreatorService`. O React é apresentação mais chamadas à API.

| Item | Valor |
| --- | --- |
| Tipo de brick | Full-React nativo (assistente de 5 passos, com recurso a iframe legado New/Old) |
| ID do brick | `dashboard-plugin-creator` |
| `route` do manifesto | `/melis-core/dashboard-plugin-creator` (montagem de recurso) |
| `label` | `Dashboard Plugin Creator` |
| `forwardKey` | `MelisDashboardPluginCreator/DashboardPluginCreator` |
| `melisKey` | `melisdashboardplugincreator_tool` |
| `subTabs` / `persistent` | `false` / `true` |
| Base da API | `/melis/react-api/dpc` |

O brick é descoberto por `GET /melis/react-api/react-modules` e aparece **apenas se o módulo estiver ativo** em `config/melis.module.load.php`. É `persistent`: o assistente é montado uma vez e os seus 5 passos são painéis mostrados/ocultados por CSS, pelo que sair do separador da ferramenta e voltar não perde nem o rascunho nem o passo atual. Um botão **Restart** (barra de ferramentas superior) limpa o rascunho da sessão e a miniatura temporária. Mudar o interruptor **New / Old** para *Old* renderiza o controlador legado num iframe (`/melis/react-tool-page?key=melisdashboardplugincreator_tool`) e repõe o rascunho de sessão partilhado; o assistente avisa primeiro se existir um rascunho.

## O assistente de 5 passos

| Passo | Componente React | O que faz |
| --- | --- | --- |
| 1 — Plugin | `Step1Plugin` | **Nome do plugin**, **Tipo de vista** (Único / Múltiplos separadores, 2–25 separadores), **Destino do plugin** (Novo módulo + nome, ou lista pendente de módulo existente). |
| 2 — Textos e Apresentação do Menu | `Step2Menu` | **Título do plugin** + **Descrição** por idioma (barra de separadores de idiomas, pelo menos um obrigatório); carregar a **miniatura do plugin** obrigatória (GIF/JPG/PNG, ~190×100, ≤500 kB). |
| 3 — Textos e Apresentação do Dashboard | `Step3Dashboard` | **Título do cartão** por idioma, escolher o **ícone do plugin** a partir de uma grelha; os plugins de múltiplos separadores escolhem **um ícone por separador**. |
| 4 — Resumo | `Step4Summary` | Recapitulação só de leitura dos passos 1→3 + módulo de destino (obtida de `/dpc/summary`); nada é escrito. |
| 5 — Finalização | `Step5Finalize` | Interruptor **Ativar plugin após a criação** (ativo por predefinição) + **Concluir e criar o plugin** → geração; na ativação, uma contagem decrescente recarrega a plataforma. |

O passo 5 é a **única operação que altera dados**. As regras de negócio (palavra-chave PHP reservada, módulo já existente, nome/título do plugin já em uso) são validadas do lado do servidor face aos formulários Laminas legados; os componentes React apenas renderizam as mensagens por campo devolvidas.

![Passo 1 — Plugin: nome, Tipo de vista (Único / Múltiplos separadores) e Destino do plugin (Novo / módulo Existente)](/screenshots/react/melis-dashboard-plugin-creator/melisdashboardcreator-tool-step1.png)

![Passo 2 — Textos e Apresentação do Menu: título/descrição por idioma (English / Français) mais a miniatura do plugin obrigatória com pré-visualização e Remove](/screenshots/react/melis-dashboard-plugin-creator/melisdashboardcreator-tool-step2.png)

![Passo 3 — Textos e Apresentação do Dashboard: título do cartão por idioma e a grelha de ícones do plugin (Calendar selecionado); os plugins de múltiplos separadores acrescentam uma grelha de ícones por separador](/screenshots/react/melis-dashboard-plugin-creator/melisdashboardcreator-tool-step3.png)

![Passo 4 — Resumo: recapitulação só de leitura de Plugin / Módulo de destino / Tipo, a miniatura, os textos do Menu, os títulos do Dashboard e o Ícone antes de gerar](/screenshots/react/melis-dashboard-plugin-creator/melisdashboardcreator-tool-step4.png)

![Passo 5 — Finalização: o interruptor "Activate plugin after creation" e o botão "Finish and create the plugin" que executa a geração](/screenshots/react/melis-dashboard-plugin-creator/melisdashboardcreator-tool-step5.png)

## API React

As rotas residem em `config/react-api.php`, servidas por `MelisReactApiDashboardPluginCreatorController`. Todas sob `/melis/react-api/dpc`, contrato `{ success, data, error }`. Uma falha de validação **não** é um erro HTTP — `POST /dpc/step/:step` devolve `{ success:true, data:{ valid:false, errors:{…} } }` para que a UI possa mostrar as mensagens por campo.

| Método e URL | Objetivo |
| --- | --- |
| `GET /dpc/context` | Verificação prévia (FS gravável → `blocking[]`), metadados dos passos, idiomas, módulos existentes, ícones, mín./máx. de separadores, limites da miniatura |
| `GET /dpc/state` | Estado atual do assistente a partir da sessão partilhada (restaura a UI) |
| `POST /dpc/reset` | Reiniciar: limpa o rascunho da sessão + a miniatura temporária |
| `POST /dpc/step/:step` (`1`–`3`) | Validar + persistir um passo → `{ valid, errors }` |
| `POST /dpc/thumbnail` | Carregamento multipart da miniatura do plugin |
| `POST /dpc/thumbnail/remove` | Remover a miniatura |
| `GET /dpc/summary` | Recapitulação só de leitura dos passos 1→3 + módulo de destino |
| `POST /dpc/generate` | **Gerar o plugin** → `{ generated, module, plugin, restartRequired, notices }` |

```ts
const BASE = '/melis/react-api/dpc'

// validate + save step 1
await postJson('/step/1', {
  dpc_plugin_name: 'SalesOverview', dpc_plugin_type: 'single',
  dpc_plugin_destination: 'new_module', dpc_new_module_name: 'MyDashboards',
}) // → { valid: true, errors: {} }

// generate (step 5) — the ONLY mutating call
await postJson('/generate', { dpc_activate_plugin: true })
// → { generated:true, module:'MyDashboards', plugin:'SalesOverview', restartRequired:true }
```

O controlador não reimplementa a lógica da ferramenta: a validação reconstrói os formulários Laminas legados a partir de `config/app.tools.php` (`getFormMergedAndOrdered`), e o estado é escrito no **mesmo contentor de sessão** que a ferramenta legada (`dashboardplugincreator`), que o serviço lê no seu construtor.

## Capacidades

Declaradas em `config/react.capabilities.php` sob o nó portador de direitos `melisdashboardplugincreator_tool`. A semântica é **permitir por predefinição** (uma capacidade não declarada é permitida, pelo que os papéis legados continuam a funcionar). Cadeias de capacidades aplanadas:

| Separador | Ações | Restrições |
| --- | --- | --- |
| `wizard` | `edit` | Configurar/guardar os passos 1→3 (sem `wizard.edit` todo o assistente é só de leitura) |
| `thumbnail` | `create`, `delete` | Carregar / remover a miniatura (passo 2) |
| `summary` | `list` | Ler o resumo (passo 4) |
| `finalization` | `create` | **Gerar** o plugin (passo 5) — a capacidade sensível |

Cada ação do controlador é protegida duas vezes — primeiro o acesso (`denyUnlessAccess`), depois a capacidade relevante (`denyUnlessCan('finalization.create')`). Ocultar controlos no React é apenas UX; o servidor recusa de qualquer forma.

## Serviços principais

Registados em `config/module.config.php` e com alias:

| Alias do serviço | Papel |
| --- | --- |
| `MelisDashboardPluginCreatorService` | Gera o plugin de dashboard a partir dos dados guardados na sessão do assistente. |

O `MelisDashboardPluginCreatorService` estende `MelisCore\Service\MelisGeneralService`. Métodos notáveis:

- `generateDashboardPlugin()` — o ponto de entrada: lê os passos da sessão, resolve o nome do módulo/plugin de destino e depois executa `performGeneration()`, revertendo em caso de falha (`rollbackPluginGeneration()`). Dispara os eventos `melisdashboard_plugin_creator_service_generate_dashboard_plugin_start/end`.
- Passos internos de geração: `generateDashboardPluginConfig()` (escreve `config/dashboard-plugins/<Plugin>Plugin.config.php`), `generateDashboardPluginController()`, `generateDashboardPluginView()` (template de separador único ou de múltiplos separadores), `generateDashboardPluginAssets()` (CSS/JS + copia a miniatura), `setTranslations()` (chaves de menu/título por idioma), `updateModuleConfig()` (injeta `template_map` + `controller_plugins`) e `updateModuleFile()` (adiciona o `include` da configuração ao `Module.php`).
- Auxiliares: `getModuleExistingPlugins()` / `getExistingTranslatedPluginTitle()` (verificações de nome duplicado), `getTempThumbnail()`, `generateFile()`, `generateModuleNameCase()`, `removeDir()`.

Quando o destino é um **módulo novo**, a geração delega a criação do módulo ao `melis-tool-creator` (`MelisToolCreatorService::createTool()` com uma ferramenta `blank`), depois ativa-o (`ModulesService::activateModule()`) e invalida as caches de caminhos de módulos e do menu do dashboard. A ativação requer um reinício da plataforma.

## Front office

Este módulo não tem plugins de templating de front-office nem view helpers — é uma ferramenta exclusiva do back-office. (Os widgets que *gera*, no entanto, são plugins de dashboard do back-office.)

## Tabelas da base de dados

O MelisDashboardPluginCreator define **nenhuma tabela própria** — não é fornecido SQL de instalação nem delta dbdeploy. Todo o estado é mantido na sessão do assistente; o resultado é escrito diretamente nos ficheiros do módulo de destino.

## Exemplo

Acionar a geração a partir dos dados já armazenados na sessão do assistente (é o que o passo 5 / `POST /dpc/generate` faz nos bastidores):

```php
/** @var \MelisDashboardPluginCreator\Service\MelisDashboardPluginCreatorService $dpc */
$dpc = $serviceManager->get('MelisDashboardPluginCreatorService');

$success = $dpc->generateDashboardPlugin(); // true on success, false (and rolled back) on failure
```

O widget gerado segue o template em `template/DashboardPluginController.php` — uma classe que estende `MelisCoreDashboardTemplatingPlugin` com uma ação que devolve um `ViewModel`:

```php
class MyModuleMyWidgetPlugin extends MelisCoreDashboardTemplatingPlugin
{
    public function __construct()
    {
        $this->pluginModule = 'mymodule';
        parent::__construct();
    }

    public function myWidget()
    {
        $view = new ViewModel();
        $view->setTemplate('my-module/dashboard-plugins/my-widget');
        return $view;
    }
}
```

## Ficheiros principais

| Aspeto | Caminho |
| --- | --- |
| Manifesto do módulo | `vendor/melisplatform/melis-dashboard-plugin-creator/composer.json` |
| Rotas / serviço / controlador / formulário | `vendor/melisplatform/melis-dashboard-plugin-creator/config/module.config.php` |
| Rotas da API React | `vendor/melisplatform/melis-dashboard-plugin-creator/config/react-api.php` |
| Capacidades React | `vendor/melisplatform/melis-dashboard-plugin-creator/config/react.capabilities.php` |
| Passos do assistente, formulários, ícones, configuração da miniatura | `vendor/melisplatform/melis-dashboard-plugin-creator/config/app.tools.php` |
| Serviço de geração | `vendor/melisplatform/melis-dashboard-plugin-creator/src/Service/MelisDashboardPluginCreatorService.php` |
| Controlador da API React | `vendor/melisplatform/melis-dashboard-plugin-creator/src/Controller/MelisReactApiDashboardPluginCreatorController.php` |
| Controlador do assistente legado (vista Old) | `vendor/melisplatform/melis-dashboard-plugin-creator/src/Controller/DashboardPluginCreatorController.php` |
| Código-fonte do brick React | `vendor/melisplatform/melis-dashboard-plugin-creator/ui-react/src/` |
| Brick compilado + manifesto | `vendor/melisplatform/melis-dashboard-plugin-creator/public/ui-react/` |
| Templates do plugin gerado | `vendor/melisplatform/melis-dashboard-plugin-creator/template/` |

::: tip Relacionado
Este é o equivalente para dashboard do `melis-templating-plugin-creator` (plugins de templating de front-office). Para compreender os artefactos que gera, leia [Plugins](/legacy/guide/plugins).
:::
