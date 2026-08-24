# Plugins: templating e dashboard

O Melis tem dois tipos de plugins, e são coisas diferentes:

- **Plugins de templating** — **blocos de conteúdo** reutilizáveis colocados numa `MelisDragDropZone`
  de uma página no **front office** (um slider, uma lista de produtos, um formulário de contacto).
- **Plugins de dashboard** — **widgets** apresentados no dashboard do **back office**.

Ambos dispõem de um assistente gráfico de scaffolding (`melis-templating-plugin-creator`, `melis-dashboard-plugin-creator`)
— use-o para gerar o código base e, em seguida, continue a leitura para o compreender e personalizar. No Melis v6
estes assistentes de scaffolding são **wizards nativos em React** no back office `/melis-react` (cada um mantém
um botão **New / Old** para alternar para a ferramenta clássica numa iframe). A framework, o conjunto de módulos e o
PHP gerado não sofreram alterações — apenas a interface com que os controla é agora React.

## Plugins de templating (front office)

Um plugin de templating estende
`MelisEngine\Controller\Plugin\MelisTemplatingPlugin` e implementa:

| Método | Função |
| --- | --- |
| `front()` *(obrigatório)* | Devolve o **array de variáveis** passado ao `.phtml` do front do plugin. |
| `back()` | Renderiza a pré-visualização + editor do back office (é fornecido um valor por omissão adequado). |
| `createOptionsForms()` | Constrói os **separadores** do formulário do back office a partir da configuração do plugin. |
| `loadDbXmlToPluginConfig()` / `savePluginConfigToXml($params)` | Descodifica/codifica os parâmetros guardados do plugin (armazenados como XML dentro do conteúdo da página). |

O construtor liga o plugin à sua configuração:

```php
use MelisEngine\Controller\Plugin\MelisTemplatingPlugin;

class MyBlockPlugin extends MelisTemplatingPlugin
{
    public function __construct($updatesPluginConfig = [])
    {
        $this->configPluginKey = 'mymodule';      // key in the plugin config file
        $this->pluginXmlDbKey  = 'myBlock';       // XML element name saved in the page
        parent::__construct($updatesPluginConfig);
    }

    public function front()
    {
        $id = $this->pluginFrontConfig['someParam'] ?? null;
        // … fetch data via a service …
        return ['pluginId' => $this->pluginFrontConfig['id'], 'items' => $items];
    }
}
```

### O ficheiro de configuração do plugin

Cada plugin inclui um `config/plugins/<Name>.config.php` com uma secção **`front`** (configuração de
renderização: `template_path`, um `id`, parâmetros personalizados, css/js) e uma secção **`melis`** (interface
do back office: nome, miniatura e os separadores/campos de `modal_form`). Referência:
`vendor/melisplatform/melis-cms-slider/config/plugins/MelisCmsSliderShowSliderPlugin.config.php`.

Registe o plugin como um controller plugin no `module.config.php`:

```php
'controller_plugins' => ['invokables' => [
    'MyBlockPlugin' => \MyModule\Controller\Plugin\MyBlockPlugin::class,
]],
```

### Como chega a uma página

Um editor arrasta o plugin para uma `MelisDragDropZone` (consulte [Criar um site](./build-a-site)). Os
parâmetros configurados são serializados como XML no conteúdo da página; ao renderizar, o front engine
invoca o `front()` do plugin e renderiza o seu `.phtml`. `MelisCmsSlider` e `MelisCmsNews` são os
exemplos canónicos.

### Estrutura mínima

```
MyModule/
├── config/plugins/MyBlockPlugin.config.php
├── src/Controller/Plugin/MyBlockPlugin.php
└── view/my-module/my-block.phtml             # front template
    view/my-module/my-block/melis/form.phtml  # back-office form
```

### Fazer o scaffolding em /melis-react

Abra o **Templating Plugin Creator** a partir da respetiva entrada no menu à esquerda — abre como um separador
superior com uma **barra de 6 passos** e o botão **New / Old** no canto superior direito (junto a **Restart**). A
vista New é um verdadeiro wizard React; todo o conjunto é `persistent`, pelo que pode sair do separador e voltar
sem perder o passo ou os dados introduzidos. (Todo o trabalho efetivo permanece do lado do servidor — a validação
reutiliza os formulários Laminas legados e a geração invoca o `MelisTemplatingPluginCreatorService`, que escreve os
mesmos ficheiros PHP/view/config/idioma que anteriormente.)

![Templating Plugin Creator — Passo 1 (Nome do plugin + destino)](/screenshots/react/melis-templating-plugin-creator/melistemplatingplugincreator-tool-step1.png)

Os seis passos:

1. **Plugin** — nome do plugin + destino (**New module**, ou um **Existing site module** que escolhe
   a partir de um dropdown). O servidor calcula o `template_path` imposto a partir daqui.
2. **Menu Texts & Display** — título/descrição por idioma apresentados na lista de plugins do editor de páginas,
   além da miniatura obrigatória (GIF/JPG/PNG, ~190×100, ≤500 kB).
3. **Main Properties** — os campos editáveis do plugin (1–25, incluindo `template_path`). O campo 1 é
   o `template_path` bloqueado; os campos 2..N recebem, cada um, um nome técnico, um tipo de apresentação (text, Dropdown,
   DatePicker, NumericInput, Switch, Textarea, texto formatado…), uma indicação de obrigatoriedade e um valor por omissão.
4. **Properties' Translation** — um rótulo + tooltip por propriedade, por idioma (além de um rótulo por
   opção de Dropdown).
5. **Summary** — um resumo só de leitura de tudo o que consta acima; aqui não é escrito nada.
6. **Finalization** — escolha um **Site** onde ativar (opcional), mantenha **Activate plugin after
   creation** ligado e, em seguida, **Finish and create the plugin**. A ativação despoleta um recarregamento da
   plataforma (o wizard faz uma contagem decrescente e recarrega).

![Templating Plugin Creator — Passo 6 (Finalization)](/screenshots/react/melis-templating-plugin-creator/melistemplatingplugincreator-tool-step6.png)

> **Botão New / Old.** *New* é o wizard React (por omissão); *Old* renderiza a ferramenta jQuery clássica
> numa iframe. Alternar para *Old* reinicia o rascunho de sessão partilhado, pelo que o wizard o avisa primeiro.

## Plugins de dashboard (back office)

Um widget de dashboard estende
`MelisCore\Controller\DashboardPlugins\MelisCoreDashboardTemplatingPlugin`. Define o seu módulo no
construtor e expõe um método de ação que devolve um `ViewModel` com `setTemplate()`:

```php
use MelisCore\Controller\DashboardPlugins\MelisCoreDashboardTemplatingPlugin;
use Laminas\View\Model\ViewModel;

class MyWidgetPlugin extends MelisCoreDashboardTemplatingPlugin
{
    public function __construct()
    {
        $this->pluginModule = 'mymodule';
        parent::__construct();
    }

    public function mywidget()   // the action referenced by the plugin config
    {
        $view = new ViewModel();
        $view->setTemplate('my-module/dashboard-plugin/my-widget');
        return $view;
    }
}
```

O widget é declarado sob a interface `melis_dashboardplugin` (nome, ícone, miniatura, `width`/`height` da
grelha e um `forward` para `module` / `plugin` / `function`), e registado no
`module.config.php` sob `controller_plugins`. Referência:
`vendor/melisplatform/melis-core/src/Controller/DashboardPlugins/MelisCoreDashboardBubbleNewsMelisPlugin.php`.

### Estrutura mínima

```
MyModule/
├── config/module.config.php                 # declares the dashboard plugin + registers it
├── src/Controller/DashboardPlugins/MyWidgetPlugin.php
└── view/my-module/dashboard-plugin/my-widget.phtml
```

### Fazer o scaffolding em /melis-react

Abra o **Dashboard Plugin Creator** a partir da respetiva entrada no menu à esquerda — um separador superior com uma
**barra de 5 passos** e o mesmo botão **New / Old**. À semelhança do seu equivalente de templating, é um wizard React
`persistent` suportado pelo `MelisDashboardPluginCreatorService`, pelo que o PHP gerado é idêntico ao resultado da ferramenta clássica.

![Dashboard Plugin Creator — Passo 1 (nome, tipo de vista, destino)](/screenshots/react/melis-dashboard-plugin-creator/melisdashboardcreator-tool-step1.png)

Os cinco passos:

1. **Plugin** — nome, **View type** (cartão **Single** ou **Multi-tabs**, 2–25 separadores) e destino
   (**New module** ou um dropdown **Existing module**).
2. **Menu Texts & Display** — título/descrição de menu por idioma + a miniatura obrigatória.
3. **Dashboard Texts & Display** — o título do cartão por idioma e o **ícone do plugin** (e, para
   plugins multi-separador, um ícone por separador).
4. **Summary** — resumo só de leitura.
5. **Finalization** — mantenha **Activate plugin after creation** ligado e, em seguida, **Finish and create the
   plugin**; a ativação recarrega a plataforma.

![Dashboard Plugin Creator — Passo 3 (título do cartão + ícones)](/screenshots/react/melis-dashboard-plugin-creator/melisdashboardcreator-tool-step3.png)

## Templating vs dashboard — num relance

| | Plugin de templating | Plugin de dashboard |
| --- | --- | --- |
| Classe base | `MelisTemplatingPlugin` | `MelisCoreDashboardTemplatingPlugin` |
| Reside em | `src/Controller/Plugin/` | `src/Controller/DashboardPlugins/` |
| Método principal | `front()` → array de variáveis | uma ação → `ViewModel` |
| Apresentado em | páginas do front office (zonas de drag-drop) | dashboard do back office |
| Configuração guardada | XML no conteúdo da página | configuração da interface de dashboard |
| Wizard de scaffolding | 6 passos (`melis-templating-plugin-creator`) | 5 passos (`melis-dashboard-plugin-creator`) |

## Ficheiros principais

| Área | Caminho |
| --- | --- |
| Classe base de templating | `vendor/melisplatform/melis-engine/src/Controller/Plugin/MelisTemplatingPlugin.php` |
| Exemplo de templating | `vendor/melisplatform/melis-cms-slider/src/Controller/Plugin/MelisCmsSliderShowSliderPlugin.php` |
| Classe base de dashboard | `vendor/melisplatform/melis-core/src/Controller/DashboardPlugins/MelisCoreDashboardTemplatingPlugin.php` |
| Exemplo de dashboard | `vendor/melisplatform/melis-core/src/Controller/DashboardPlugins/MelisCoreDashboardBubbleNewsMelisPlugin.php` |
| Assistentes de scaffolding | `vendor/melisplatform/melis-templating-plugin-creator/`, `vendor/melisplatform/melis-dashboard-plugin-creator/` |

Para as páginas de referência dos módulos, consulte
[melis-templating-plugin-creator](/pt/reference/modules/melis-templating-plugin-creator) e
[melis-dashboard-plugin-creator](/pt/reference/modules/melis-dashboard-plugin-creator).
