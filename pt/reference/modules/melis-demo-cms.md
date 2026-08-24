# MelisDemoCms

> O website oficial de referência/demonstração da Melis Platform — um **módulo de site** pronto a
> instalar que ensina os programadores a compreender como está construído um site de front-office
> Melis. Pacote `melisplatform/melis-demo-cms`.

## Objetivo

O `MelisDemoCms` é um website de front-office completo e instalável (`melis-site: true`,
`type: melisplatform-module`, categoria `cms`). **Não é uma ferramenta de back-office**: as suas
páginas, controladores e templates de plugins demonstram as três técnicas de composição de conteúdos
— **colocação manual de plugins**, **zonas de arrastar-e-largar** e **tags editáveis inline** —
utilizando o MelisFront, o MelisEngine e os módulos de conteúdos do CMS (slider, notícias,
prospects). Utilize-o como implementação de referência ao [construir um site](/pt/guide/build-a-site).

![A página inicial de front-office do MelisDemoCms em funcionamento — navegação superior (News / Team / Our Services / Our Process / FAQ / Contact), o hero "Melis Demo Cms" com uma chamada à ação "Try to Free" sobre um gráfico de hero de dashboard. Este é o website de demonstração renderizado no servidor, não um ecrã de back-office React.](/screenshots/react/melis-demo-cms/melisdemocms-site.png)

## Não tem back-office React

O Melis v6 introduziu um back-office React, mas o `MelisDemoCms` é um **site de front-office**, e não
uma ferramenta de back-office, pelo que **não é deliberadamente migrado para React**:

- não tem projeto de brick `ui-react/`, nem `public/ui-react/brick.manifest.json`;
- não tem endpoints em `config/react-api.php` nem capacidades em `config/react.capabilities.php`;
- não tem entrada na barra lateral nem nó de menu em `/melis-react`.

Nunca procura uma ferramenta "MelisDemoCms" na shell React. O site de demonstração é **conteúdo sobre
o qual as ferramentas genéricas de CMS React operam**, e o site em funcionamento é **renderizado no
servidor** pelo MelisFront/MelisEngine sempre que um visitante navega no domínio.

### Como trabalhar com ele em `/melis-react`

Como o módulo não tem ferramenta própria, edita-o com as ferramentas genéricas de CMS React:

| Ferramenta React | O que faz com ela aqui |
| --- | --- |
| **Editor de páginas CMS** | Abra qualquer página de demonstração (Home, News, Team, FAQ, Contact…) a partir da árvore **CMS Pages** e edite os seus blocos inline, zonas de arrastar-e-largar e plugins. Superfície de edição principal. |
| **Media** | Faça a gestão das imagens/ficheiros referenciados pelas páginas. |
| **Sites** | As definições de domínio / idioma do site de demonstração. |
| **Templates** | Os templates de página que as páginas do CMS utilizam. |

> **Onde:** barra lateral → **CMS Pages** → abra uma página do site de demonstração no editor. Não há
> nenhuma entrada "MelisDemoCms" na barra lateral — o módulo é o *conteúdo*, não uma ferramenta.

## Ativá-lo

O `MelisDemoCms` é um módulo de site Laminas instalado em `module/MelisSites/MelisDemoCms/` pelos
`installer-paths` do Composer. O seu próprio `config/module.load.php` declara os módulos que espera
que sejam carregados em conjunto com ele:

```php
// vendor/melisplatform/melis-demo-cms/config/module.load.php
'MelisAssetManager', 'MelisEngine', 'MelisFront',
'MelisCmsNews', 'MelisCmsSlider', 'MelisCmsProspects',
'MelisDemoCms', 'MelisCmsPageScriptEditor'
```

Dependências Composer obrigatórias: `melis-cms`, `melis-cms-slider`, `melis-cms-prospects`,
`melis-cms-news`, `melis-cms-page-script-editor` (`^6.0`). O `melis-engine` e o `melis-front` são
sugeridos (e obrigatórios em tempo de execução). O site é ativado para um domínio definindo a
variável de ambiente do vhost `MELIS_MODULE "MelisDemoCms"`.

## Serviços principais

| Alias do serviço | Função |
| --- | --- |
| `DemoCmsService` | Auxiliares específicos do site utilizados pelos controladores de front e pelos listeners de instalação. |
| `MelisPlatformTable` | Gateway de tabela genérico sobre a tabela central da plataforma (`MelisEngine\Model\Tables\MelisGenericTable`, chave primária `plf_id`). |

## Instalação do site (instalador, não React)

Este módulo não adiciona entradas na árvore de ferramentas do back-office. A sua única superfície de
back-office é o **assistente de instalação do site** utilizado pelo marketplace/instalador:
controladores `MelisDemoCms\Controller\MelisSetupController` (rota `/MelisDemoCms/setup`),
`MelisSetupPostDownloadController` e `MelisSetupPostUpdateController`. A configuração de instalação
encontra-se em `config/setup/download.config.php` e `config/setup/update.config.php`. Isto é uma
questão de back-end / CLI, sem superfície React.

## Front office

O site é conduzido por controladores de site MelisFront simples, um por cada tipo de página:

| Controlador | Página |
| --- | --- |
| `MelisDemoCms\Controller\Home` | Home (carrossel + slider secundário, testemunhos, banner RGPD) |
| `MelisDemoCms\Controller\News` | Lista de notícias / detalhe de notícia |
| `MelisDemoCms\Controller\Team` | Team |
| `MelisDemoCms\Controller\Services` | Lista de serviços / detalhe |
| `MelisDemoCms\Controller\Faq` | Listagem de FAQ e blocos de categoria |
| `MelisDemoCms\Controller\Contact` | Formulário de contacto / prospects |
| `MelisDemoCms\Controller\Testimonial` | Testemunho |
| `MelisDemoCms\Controller\Template` / `DragDrop` | Demonstrações de templates (estático / drag-drop / misto) |
| `MelisDemoCms\Controller\Search` | Resultados de pesquisa no site (Lucene; desativado na demonstração) |
| `MelisDemoCms\Controller\Page404` | Página de erro 404 |

Em vez de fornecer os seus próprios plugins, o `MelisDemoCms` disponibiliza **overrides de templates
de plugins** (`view/plugins/*.phtml`) configurados em `config/melis.plugins.config.php`:

| Plugin de templating (módulo proprietário) | Templates fornecidos por este site |
| --- | --- |
| `MelisFrontMenuPlugin` (MelisFront) | `menu`, `white-menu`, `footer-menu` |
| `MelisFrontShowListFromFolderPlugin` (MelisFront) | `faq-listing`, `faq-values`, `home-testimonial-slider` |
| `MelisFrontGdprBannerPlugin` (MelisFront) | `gdpr-banner` |
| `MelisCmsSliderShowSliderPlugin` (MelisCmsSlider) | `home-carousel-slider`, `home-slider2`, `team-slider` |
| `MelisCmsNewsListNewsPlugin` / `…ShowNewsPlugin` / `…LatestNewsPlugin` (MelisCmsNews) | `news-list`, `news-details`, `latest-news-vertical`, `latest-news-horizontal` |
| `MelisCmsProspectsShowFormPlugin` (MelisCmsProspects) | `prospect-form` |

### As três técnicas de composição

| Técnica | Como funciona | Páginas de exemplo |
| --- | --- | --- |
| **Colocação manual** | O plugin é instanciado no controlador, renderizado com parâmetros e adicionado como filho da vista — a vista imprime-o. | Home, Team (slider), News, FAQ, Contact |
| **Zona de arrastar-e-largar** | O `.phtml` declara uma zona nomeada; o editor de páginas CMS React coloca qualquer plugin lá dentro; sem código no controlador. | DragDrop, showcases de Template |
| **Tags editáveis inline** | O `MelisTag` envolve um valor por omissão na vista; o autor edita o texto/imagens no local a partir do editor de páginas React. | Services, Testimonial, 404 |

### Listeners

O `SetupDemoCmsListener` conduz o processo de instalação do site.
O `MelisDemoCmsCreateConfigListener` escreve o `MelisDemoCms.config.php` a partir do `.config.stub`
após uma instalação pelo marketplace. O `SiteMenuCustomizationListener` personaliza o menu de front.
O `LatestNewsHorizontalListener` ajusta o output do plugin de últimas notícias.

## Base de dados

O `MelisDemoCms` não define quaisquer tabelas `melis_*` próprias. O `MelisPlatformTable` lê a tabela
central `melis_core_platform`. Todo o conteúdo da demonstração (páginas, templates, sliders,
notícias, chaves de configuração) é criado no momento da instalação pelos listeners de setup, com
base nos valores de `config/MelisDemoCms.config.php` tais como `home_page_id`, `news_page_id` e
`home_page_slider_1_id`.

## Exemplo

Um controlador de front renderiza um plugin de templating injetando um caminho de template específico
do site e um ID conduzido pela configuração — o padrão utilizado em todo o site (`HomeController`):

```php
$cfg = $this->getServiceManager()->get('MelisSiteConfigService');

$slider = $this->MelisCmsSliderShowSliderPlugin();
$homeSlider1 = $slider->render([
    'template_path' => 'MelisDemoCms/plugins/home-carousel-slider',
    'id'            => 'homeSlider1',
    'pageId'        => $this->idPage,
    'sliderId'      => $cfg->getSiteConfigByKey('home_page_slider_1_id', $this->idPage),
]);
$this->view->addChild($homeSlider1, 'homeSlider1');
// view: <?= $this->homeSlider1 ?>
```

Uma zona de arrastar-e-largar exige uma única chamada na vista — sem código no controlador (o bloco é
preenchido a partir do editor de páginas CMS React):

```php
<?= $this->MelisDragDropZone($this->idPage, 'dragdropzone_home_1') ?>
```

Uma tag editável inline com um valor por omissão (editada no local a partir do editor de páginas
React):

```php
<?= $this->MelisTag($this->idPage, 'static-html-1', 'html', '<h1>Accessible…</h1>') ?>
```

## Ficheiros principais

| Assunto | Caminho (dentro de `vendor/melisplatform/melis-demo-cms/`) |
| --- | --- |
| Rotas, controladores, mapa de templates | `config/module.config.php` |
| Módulos carregados com o site | `config/module.load.php` |
| Configuração dos overrides de templates de plugins | `config/melis.plugins.config.php` |
| Chaves de configuração por site (IDs de página / slider / pasta) | `config/MelisDemoCms.config.php`, `…config.stub` |
| Fluxo de instalação do site | `config/setup/download.config.php`, `config/setup/update.config.php` |
| Bootstrap e registo de listeners | `src/Module.php` |
| Serviço auxiliar do site | `src/Service/DemoCmsService.php` |
| Controladores de instalação e pós-instalação | `src/Controller/MelisSetupController.php`, `…PostDownloadController.php`, `…PostUpdateController.php` |
| Listeners de instalação / menu / notícias | `src/Listener/` |
| Templates de plugins | `view/plugins/*.phtml` |
| Vistas de páginas | `view/melis-demo-cms/*/*.phtml` |
| Demonstrações de templates | `view/melis-demo-cms/template/` |

Ver também: [Referência de módulos](/pt/reference/modules), [Construir um site](/pt/guide/build-a-site),
[Plugins](/pt/guide/plugins).
