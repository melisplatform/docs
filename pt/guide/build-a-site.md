# Construir um site (CMS)

O Melis é, antes de mais, um **CMS**. Esta página explica o modelo de conteúdo — **sites**,
**páginas**, **modelos (templates)** e **plugins** — e como uma página é apresentada no front office. É
o modelo mental de que necessita antes de editar modelos ou de construir um módulo de site.

::: tip v6 — Back-office em React
O Melis v6 mantém a mesma framework, os mesmos módulos e o mesmo modelo de dados aqui descritos. O que mudou foi a
**interface do back-office**: passa agora a correr como uma **aplicação React em `/melis-react`**. O CMS é fornecido como
ferramentas "brick" nativas em React — uma **barra lateral com a árvore de páginas**, além de um **editor de páginas com separadores** e um conjunto de
ferramentas laterais (Sites, Templates, Styles, Languages…). A única exceção é o separador **Edition** da página,
que continua a carregar o clássico editor de arrastar e largar **num iframe**. Cada ferramenta lateral tem um
comutador **New / Old**, para que possa alternar para a ferramenta clássica caso precise. Os conceitos abaixo mantêm-se
inalterados; só *o sítio onde clica* é novo.
:::

## O modelo de conteúdo

| Conceito     | O que é | Tabela(s) principal(is) |
| ------------ | ---------- | ------------- |
| **Site**     | Um website. Tem uma página inicial, idiomas e um ou mais domínios por ambiente. | `melis_cms_site`, `melis_cms_site_domain` |
| **Página**   | Um nó na árvore de páginas do site. Tem um tipo (site/pasta/página), um modelo e conteúdo. | `melis_cms_page_tree`, `melis_cms_page_published`, `melis_cms_page_saved` |
| **Modelo**   | O layout que uma página utiliza — aponta para um controlador/ação/vista de um módulo de site. | `melis_cms_template` |
| **SEO**      | Slug do URL e meta tags por página. | `melis_cms_page_seo` |
| **Idioma**   | Uma página pode ter traduções ligadas entre si. | `melis_cms_lang`, `melis_cms_page_lang` |

Estas tabelas pertencem ao **MelisEngine**, o motor do CMS — a única fonte de verdade para o
modelo de páginas/sites. O back-office em React lê e escreve nelas apenas através dos serviços e
table gateways do motor; nunca acede diretamente ao esquema. Consulte
[MelisEngine](/pt/reference/modules/melis-engine).

### As páginas têm versões

Cada página existe em duas versões:

- **Guardada** (`melis_cms_page_saved`) — o rascunho de trabalho que edita no back-office.
- **Publicada** (`melis_cms_page_published`) — a versão em produção servida no front office.

Edita o rascunho e depois **publica** quando estiver pronto. O conteúdo editável da página (ver *zonas* e
*plugins* abaixo) é guardado no registo da página.

## Modelos (templates)

Um **modelo** (`melis_cms_template`) é a ponte entre uma página e o código que a apresenta.
Para o tipo de modelo comum `ZF2`, armazena:

- `tpl_zf2_website_folder` — o **módulo de site** (por exemplo, `MelisDemoCms`),
- `tpl_zf2_controller`, `tpl_zf2_action` — que controlador/ação apresenta a página,
- `tpl_zf2_layout` — o layout que a envolve.

Assim, uma página → referencia um modelo → que encaminha para uma vista `.phtml` dentro de um módulo de site.

No back-office em React, gere os modelos na ferramenta lateral **Templates** (§ *Criar um novo
site*) — uma lista e um formulário nativos em React para o nome, tipo, site, layout, controlador e ação.

## Conteúdo editável: zonas e plugins

Os modelos expõem dois tipos de áreas editáveis, através de **view helpers**:

### `MelisTag` — zonas editáveis simples

Uma zona de HTML/texto/media com nome, que um editor edita inline (TinyMCE) no back-office:

```php
<?= $this->MelisTag($this->idPage, 'home-html-1', 'html', '<h1>Default heading</h1>') ?>
```

O conteúdo predefinido é apresentado até que um editor o substitua; o valor guardado fica armazenado na página.
Helper: `vendor/melisplatform/melis-front/src/View/Helper/MelisTagsHelper.php`.

### `MelisDragDropZone` — plugins de templating

Uma zona de largar (drop zone) onde os editores arrastam **plugins de templating** — blocos de conteúdo reutilizáveis (um slider, uma
lista de notícias, um formulário de contacto):

```php
<?= $this->MelisDragDropZone($this->idPage, 'dragdropzone_home_1') ?>
```

Helper: `vendor/melisplatform/melis-front/src/View/Helper/MelisDragDropZoneHelper.php`.

Um plugin de templating estende `MelisEngine\Controller\Plugin\MelisTemplatingPlugin` e implementa:

- **`front()`** — devolve os dados/vista apresentados no site em produção,
- **`back()`** — o formulário de configuração mostrado no editor do back-office.

`MelisCmsSlider` e `MelisCmsNews` são bons plugins de referência; utilize o **MelisTemplatingPluginCreator**
para gerar o esqueleto do seu. Os editores largam estes blocos no separador **Edition** do editor de páginas — ver abaixo.

## Como uma página é apresentada no front office

O front office é servido pelo **MelisFront** (o motor que apresenta os sites) sobre o
**MelisEngine** (serviços de páginas/dados). Esta apresentação é inteiramente do lado do servidor e mantém-se inalterada na v6 —
o back-office em React apenas *aloja* a pré-visualização editável, não volta a apresentar a página no
browser. Em traços gerais:

1. O vhost define **`MELIS_MODULE`** → seleciona o **módulo de site** a servir.
2. Um URL como `…/id/5` resolve para a **página com id 5** (rota em
   `vendor/melisplatform/melis-front/config/module.config.php`). Os URLs de SEO também mapeiam para ids de página.
3. O **MelisEngine** carrega a página + o respetivo modelo
   (`vendor/melisplatform/melis-engine/src/Service/MelisPageService.php`).
4. O controlador/ação `ZF2` do modelo apresenta a vista `.phtml` do módulo de site.
5. As zonas `MelisTag` e os plugins `MelisDragDropZone` são preenchidos a partir do conteúdo publicado da página.
6. O resultado é envolvido no layout do site.

::: tip Modos de edição / pré-visualização
A mesma página pode ser pedida em diferentes modos: `…/id/5` (em produção), `…/id/5/preview` (rascunho
guardado), `…/id/5/renderMode/melis` (edição no back-office — é isto que o iframe de Edition mostra).
:::

## Anatomia de um módulo de site

Um **módulo de site** é um módulo Laminas normal que contém os modelos, vistas e recursos (assets) de um website.
A referência é `vendor/melisplatform/melis-demo-cms/` (ver
[MelisDemoCms](/pt/reference/modules/melis-demo-cms)); os sites personalizados residem normalmente em
`module/MelisSites/<YourSite>/`:

```
MelisDemoCms/
├── config/
│   ├── module.load.php           # modules this site needs (MelisEngine, MelisFront, plugins…)
│   ├── module.config.php         # routes / controllers / services
│   ├── assets.config.php         # front-office CSS & JS
│   └── melis.plugins.config.php  # templating plugins available to templates
├── src/Controller/               # Home, Contact… (render the template views)
├── view/
│   ├── layout/                   # site layouts
│   └── melis-demo-cms/home/index.phtml   # a page template (uses MelisTag / MelisDragDropZone)
└── public/                       # css / js / images
```

## Trabalhar no back-office em React

Na v6, constrói os sites a partir do **back-office em React** em `/melis-react`. Abra a secção **MelisCms**
na barra lateral esquerda: mostra o painel da **árvore de páginas** (os seus sites e as respetivas páginas), além de um
grupo **Site Tools**.

![A secção MelisCms na barra lateral em React — árvore de páginas mais Site Tools.](/screenshots/react/melis-cms/meliscms-menu-entry.png)

### A árvore de páginas

A árvore de páginas é o mapa dos seus sites e de todas as páginas que contêm. Reside na **barra lateral esquerda**,
pelo que se mantém visível enquanto trabalha. Clique numa página para a abrir no editor; escreva um nome para pesquisar;
clique com o botão direito num nó para adicionar uma página filha, ver detalhes, duplicar, mover ou eliminar. Também pode mover
uma página por arrastar e largar (as permissões do lado do servidor decidem o que pode mover).

![A árvore de páginas em React — sites e páginas; clique para abrir, botão direito para ações.](/screenshots/react/melis-cms/meliscms-menu-site-treeview.png)

### O editor de páginas — colocar conteúdo numa página

Ao abrir uma página, surge o editor: um **chrome nativo em React** (título da página + estado, botões de ação,
barra de separadores) em torno do conteúdo do separador atual. Os separadores são **Properties · Edition · SEO · Languages**
(mais separadores contribuídos por outros módulos — Historic, Analytics, Scripts…). Os botões de ação incluem
**Save**, **Publish**, **See** (Preview / See online), **Duplicate**, **Erase draft** e **Delete**.

- **Properties** *(nativo em React)* — o nome da página, o tipo (Page / Folder / Site), o modelo (layout),
  o idioma, a apresentação no menu, o estilo e a taxonomia.

  ![O separador Properties em React.](/screenshots/react/melis-cms/meliscms-page-tab-properties.png)

- **Edition** *(editor clássico num iframe)* — preencha a página. É apresentada em direto e **arrasta
  blocos de conteúdo (plugins)** para as zonas do modelo (as áreas `MelisDragDropZone`). Este separador é
  o clássico editor de arrastar e largar, carregado dentro do chrome em React, pelo que o painel de plugins, os layouts das drop-zones
  e os editores de texto formatado são exatamente como antes.

  ![O separador Edition — página em direto com a sobreposição de arrastar e largar, dentro do chrome em React.](/screenshots/react/melis-cms/meliscms-page-tab-edition.png)

  ![O painel de plugins — os blocos de conteúdo que pode largar na página.](/screenshots/react/melis-cms/meliscms-page-tab-edition-menu-templating-plugins.png)

- **SEO** *(nativo em React)* — o URL amigável, o meta title/description e os campos de redirecionamento.
- **Languages** *(nativo em React)* — criar e gerir as versões linguísticas da página.

**Save vs Publish.** *Save* escreve o rascunho (Properties + SEO + o conteúdo de arrastar e largar, tudo numa só
ação); *See → Preview* mostra o rascunho; *Publish* coloca o rascunho atual em produção; *Erase draft*
reverte para a versão publicada. Regra prática: edite à vontade, **Save** à medida que avança, **Preview** para
verificar e depois **Publish**.

### Os blocos de conteúdo padrão

Os blocos que larga na página no separador Edition provêm do **MelisFront**. Os mais comuns:
um bloco **HTML (Text)** e um bloco **Media** (ambos editados **no local**), além de blocos de configuração definidos
através de um pequeno modal **Properties** — **Menu**, **Breadcrumb**, **List-from-folder** e o
**banner de RGPD**. Consulte [MelisFront](/pt/reference/modules/melis-front) para o catálogo completo.

![Um bloco HTML (Text) editado no local, com a barra de ferramentas WYSIWYG na página.](/screenshots/react/melis-front/melisfront-page-plugin-html-tag.png)

## Criar um novo site (visão geral)

De forma resumida:

1. **Crie o site** no back-office — barra lateral → **Site Tools → Sites → + New site**, seguindo depois o
   **assistente de 5 passos** (Multilingual → Languages → Domains → Module → Summary), que cria o site
   e a respetiva página inicial.

   ![A ferramenta Sites em React — cada linha é um website completo, com "+ New site".](/screenshots/react/melis-cms/meliscms-tool-sites-list.png)

2. **Disponibilize um módulo de site** em `module/MelisSites/<YourSite>/` (controladores + modelos
   `.phtml` + recursos).
3. **Declare modelos** (`melis_cms_template`) que apontem para o controlador/ação do seu módulo — Site
   Tools → **Templates**.
4. **Construa a árvore de páginas** e atribua modelos; adicione `MelisTag`/`MelisDragDropZone` às suas vistas.
5. **Aponte um vhost** para `public/` com `SetEnv MELIS_MODULE "<YourSite>"` (ver
   [Instalação](/pt/guide/getting-started)).
6. **Publique** e navegue pelo front office.

Assim que um site existir, abra-o a partir da ferramenta Sites para o gerir através de separadores nativos em React: **Properties
· Module Loading · Domains · Languages · Site Config · Translations · Scripts**. O separador **Module
Loading** é onde ativa uma funcionalidade para um determinado site (com reordenação por arrastar da ordem de carregamento).

> Comece por ler `vendor/melisplatform/melis-demo-cms/` de ponta a ponta — é o exemplo canónico
> e funcional de todos os conceitos desta página.

## Ficheiros-chave

| Assunto | Caminho |
| --- | --- |
| Serviços do CMS (páginas/sites) | `vendor/melisplatform/melis-cms/src/Service/` |
| Bricks do CMS em React (editor de páginas + ferramentas laterais) | `vendor/melisplatform/melis-cms/ui-react/src/` |
| Serviço de páginas (motor) | `vendor/melisplatform/melis-engine/src/Service/MelisPageService.php` |
| Apresentação do front | `vendor/melisplatform/melis-front/` |
| Helpers de zonas editáveis | `vendor/melisplatform/melis-front/src/View/Helper/` |
| Base dos plugins de templating | `vendor/melisplatform/melis-engine/src/Controller/Plugin/MelisTemplatingPlugin.php` |
| Site demo de referência | `vendor/melisplatform/melis-demo-cms/` |

> Os módulos em React que detêm a interface — [MelisCms](/pt/reference/modules/melis-cms),
> [MelisFront](/pt/reference/modules/melis-front) e [MelisEngine](/pt/reference/modules/melis-engine) —
> documentam por completo as ferramentas, os plugins e o modelo de dados.
