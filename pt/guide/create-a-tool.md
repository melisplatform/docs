# Crie a sua primeira ferramenta

Uma **ferramenta** é um ecrã de backoffice (uma lista, um formulário, um painel…) empacotado dentro de um módulo e
associado ao menu do lado esquerdo. Esta página mostra como criar uma no **Melis v6** e explica a
anatomia de uma ferramenta para que a possa estender com confiança.

::: tip Leia isto primeiro
Certifique-se de que já leu, ainda que superficialmente, [Arquitetura e conceitos](./concepts) — as ferramentas assentam em **módulos**,
na **árvore de configuração**, nos **forwards** e nos **direitos**. Esses fundamentos permanecem inalterados no v6.
:::

::: info O v6 manteve a framework e substituiu a interface
O Melis v6 corre a **mesma** framework Laminas, os mesmos módulos e a mesma árvore de configuração que o v5. O que mudou foi o
back-office: a interface clássica `/melis` foi substituída por uma **shell React em `/melis-react`**.
As ferramentas surgem agora aí como "bricks" nativos em React, e qualquer ferramenta que ainda não tenha sido reescrita em React
continua a funcionar, sem alterações, dentro de um iframe. Ou seja, a forma como *constrói* uma ferramenta abaixo é a mesma; apenas a
forma como a *usa* no back-office é nova. Consulte
[MelisReactApi](/pt/reference/modules/melis-react-api) e
[MelisReactOverride](/pt/reference/modules/melis-react-override) para os detalhes de bastidores.
:::

## O caminho rápido: os assistentes de geração de código

O Melis inclui geradores gráficos que criam por si uma ferramenta completa e funcional. No v6, os dois mais
usados são **assistentes nativos em React** na shell `/melis-react`:

- **[Dashboard Plugin Creator](/pt/reference/modules/melis-dashboard-plugin-creator)** — cria um
  widget que aparece no painel inicial do back-office.
- **[Templating Plugin Creator](/pt/reference/modules/melis-templating-plugin-creator)** — cria um
  bloco CMS de front-end que coloca nas páginas através do editor de páginas.

Ambos abrem a partir da respetiva entrada no menu esquerdo, como um separador de topo com uma **barra de passos** no cimo e um
alternador **New / Old** (canto superior direito, junto a **Restart**): *New* é o assistente React (por omissão), *Old*
abre a ferramenta clássica num iframe. Cada passo é validado **no servidor** (reutilizando os formulários Laminas legados), pelo que as regras
de negócio — palavras-chave PHP reservadas, nomes de módulo/plugin duplicados — são
exatamente as mesmas de antes.

![Dashboard Plugin Creator — Passo 1 (Plugin)](/screenshots/react/melis-dashboard-plugin-creator/melisdashboardcreator-tool-step1.png)
*Passo 1 do Dashboard Plugin Creator: **Plugin name**, **View type** (Single / Multi-tabs) e
**Plugin destination** (New module / Existing module), com **Next** no fundo.*

Percorra o assistente: dê um nome ao seu plugin, escolha um módulo **novo** ou **existente**, localize os títulos por
idioma, carregue uma miniatura, escolha ícones e depois reveja um **Summary** só de leitura. O passo de **Finalization**
é a única ação que altera dados — escreve no disco os ficheiros PHP/vista/configuração/idioma e, no caminho de
*novo módulo*, cria a estrutura do módulo (através do serviço subjacente
[MelisToolCreator](/pt/reference/modules/melis-tool-creator)), regista-o, **ativa-o**
e recarrega a plataforma.

![Templating Plugin Creator — Passo 6 (Finalization)](/screenshots/react/melis-templating-plugin-creator/melistemplatingplugincreator-tool-step6.png)
*O passo de **Finalization** do Templating Plugin Creator: escolha um **Site** onde ativar, mantenha
**Activate plugin after creation** ligado e depois **Finish and create the plugin** — o assistente faz a contagem
decrescente e recarrega a plataforma.*

::: tip Restart / New vs Old
**Restart** (barra de ferramentas de topo) limpa o rascunho e regressa ao passo 1. Ao mudar para **Old**, abre-se a
ferramenta clássica num iframe e **repõe-se o rascunho partilhado** — o assistente avisa-o primeiro.
:::

Para uma ferramenta de back-office simples (um ecrã de lista/formulário, não um painel ou bloco CMS), o
**MelisToolCreator** subjacente continua a criar o esqueleto completo de um módulo (configuração, controladores, serviço, modelo
de tabela e vistas). O resto desta página explica **o que estes geradores produzem** — para que também consiga
ler, ajustar e escrever ferramentas à mão.

## Anatomia de uma ferramenta (o que é gerado)

Esta parte é igual à do v5: uma ferramenta continua a ser um módulo Laminas. Uma típica tem este aspeto:

```
module/MyTool/
├── src/Module.php                 # merges the config files below
├── config/
│   ├── module.config.php          # routes, services, controllers, view paths
│   ├── app.interface.php          # the tool's internal UI zones + forwards
│   ├── app.tools.php              # table columns, filters, action buttons
│   └── app.toolstree.php          # where the tool sits in the left menu
├── src/MyTool/
│   ├── Controller/                # *Controller.php (extend MelisAbstractActionController)
│   ├── Service/                   # *Service.php   (extend MelisGeneralService)
│   └── Model/Tables/              # *Table.php      (Laminas TableGateway wrappers)
├── view/melis-my-tool/            # .phtml templates
└── language/{en_EN,fr_FR}.interface.php
```

> 📎 As melhores implementações de referência para copiar são os módulos reais
> `vendor/melisplatform/melis-cms-news/` e `vendor/melisplatform/melis-cms-prospects/`.
> Abra-os lado a lado enquanto constrói.

### 1. Registar o módulo

`config/melis.module.load.php`:

```php
return [
  // … core modules …
  'MyTool',
];
```

### 2. `Module.php` — montar a configuração

```php
namespace MyTool;

use Laminas\ModuleManager\Feature\ConfigProviderInterface;
use Laminas\Stdlib\ArrayUtils;

class Module implements ConfigProviderInterface
{
    public function getConfig()
    {
        $config = [];
        foreach ([
            __DIR__ . '/../config/module.config.php',
            __DIR__ . '/../config/app.interface.php',
            __DIR__ . '/../config/app.tools.php',
            __DIR__ . '/../config/app.toolstree.php',
        ] as $file) {
            $config = ArrayUtils::merge($config, include $file);
        }
        return $config;
    }
}
```

### 3. `app.toolstree.php` — mostrá-la no menu esquerdo

Isto associa a sua ferramenta a uma secção do menu esquerdo e faz o forward para o respetivo controlador. O `melisKey`
é o identificador estável; o `forward` aponta para a ação que renderiza a ferramenta. A shell React
lê esta mesma árvore (via `GET /melis/react-api/menu`), **filtrada por direitos**, para construir a sua barra lateral —
por isso, declarar aqui a sua ferramenta é o que faz com que ela apareça em `/melis-react`.

```php
return ['plugins' => ['meliscore' => ['interface' => ['meliscore_leftmenu' => ['interface' => [
  'meliscustom_toolstree_section' => ['interface' => [
    'mytool_tool' => [
      'conf' => [
        'id'       => 'id_mytool_tool',
        'melisKey' => 'mytool_tool',
        'name'     => 'tr_mytool_title',   // translation key
        'icon'     => 'fa fa-puzzle-piece',
      ],
      'forward' => [
        'module'     => 'MyTool',
        'controller' => 'MyTool',
        'action'     => 'render-mytool',
      ],
    ],
  ]],
]]]]]];
```

### 4. Controlador + serviço

```php
// src/MyTool/Controller/MyToolController.php
namespace MyTool\Controller;

use Laminas\View\Model\ViewModel;
use Laminas\View\Model\JsonModel;
use MelisCore\Controller\MelisAbstractActionController;

class MyToolController extends MelisAbstractActionController
{
    public function renderMytoolAction()
    {
        $view = new ViewModel();
        $view->melisKey = $this->params()->fromRoute('melisKey', '');
        return $view; // renders view/melis-my-tool/my-tool/render-mytool.phtml
    }

    public function getListAction()
    {
        $items = $this->getServiceManager()->get('MyToolService')->getList();
        return new JsonModel(['data' => $items]);
    }
}
```

Os serviços estendem `MelisGeneralService` e acedem à base de dados através de um wrapper `TableGateway`
registado em `module.config.php`.

::: info Como a sua ferramenta é renderizada em /melis-react
Uma ferramenta declarada desta forma não necessita de **nenhum código React** para aparecer no v6. A shell React simplesmente mostra a sua
interface `.phtml` existente dentro de um iframe servido em `/melis/react-tool-page?key=<melisKey>` — com as suas
próprias DataTables, formulários, modais e botões de gravação a comportarem-se exatamente como no `/melis` clássico. Isto é
tratado inteiramente por [MelisReactOverride](/pt/reference/modules/melis-react-override); não lhe toca.
Reescrever uma ferramenta como um **brick nativo em React** (com um `brick.manifest.json` e
endpoints `/melis/react-api/…`) é uma evolução opcional — os dois assistentes criadores acima são exemplos
disso — não uma obrigação.
:::

### 5. Torná-la visível — direitos

Mesmo quando uma ferramenta está corretamente declarada, a secção do menu esquerdo só aparece para os utilizadores cujos
**direitos** a incluam. Os direitos são guardados como uma lista de permissões XML em `melis_core_user.usr_rights`:
uma secção fica visível quando o respetivo `*_toolstree_section` aí consta. O menu de `/melis-react` é
filtrado exatamente por estes direitos, pelo que uma secção não listada também fica oculta na shell React.

Conceda acesso a partir do editor **Users → Rights** do back-office (marque a sua ferramenta para o perfil/utilizador e
grave). Para automatizar, também pode injetar a secção no XML de direitos com uma migração — veja
como a plataforma o faz para o menu de IA em `flyway/sql/V3__add_melisai_rights.sql`.

::: tip O v6 também tem "direitos avançados" (capabilities)
Além do *acesso* à ferramenta, o v6 acrescenta **capabilities** granulares (`list` / `create` / `edit` /
`delete`, ou separadores aninhados) que controlam as partes internas de uma ferramenta já autorizada. São
**permitidas por omissão** — uma ferramenta que não declare nenhuma mantém o CRUD completo, pelo que isto é opcional. Se o pretender,
declare um `config/react.capabilities.php` no seu módulo e proteja as suas ações da React-API com
`denyUnlessCan('edit')`. O contrato completo está em
[MelisReactApi](/pt/reference/modules/melis-react-api).
:::

## Resumo

1. Gere com um **assistente** (Dashboard / Templating Plugin Creator) ou copie `melis-cms-news`.
2. **Registe** o módulo em `config/melis.module.load.php`.
3. Declare-o em **`app.toolstree.php`** (menu) e em **`app.interface.php`** (zonas internas).
4. Implemente **controlador + serviço + vista**.
5. Conceda **direitos** para que apareça no menu.

Passa a ter uma ferramenta funcional que aparece no back-office `/melis-react` — como um iframe para uma
ferramenta `.phtml` clássica, ou como um brick nativo se a reescreveu em React. A partir daqui, explore o
`app.tools.php` para ligar uma tabela de dados completa (colunas, filtros, botões de ação) como fazem os módulos
CMS.
