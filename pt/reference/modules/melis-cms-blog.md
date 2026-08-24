# MelisCmsBlog

> Sistema de blogue para sites Melis, com um back-office React nativo para a gestão de artigos e três
> plugins de apresentação no front-office. Pacote `melisplatform/melis-cms-blog`.

## Objetivo

O MelisCmsBlog disponibiliza uma ferramenta **Blog** no back-office, onde os editores criam e gerem artigos
de blogue multilingues (títulos, subtítulo, até quatro parágrafos de texto formatado, imagens, documentos,
agendamento de publicação/despublicação, um slider opcional e URL SEO + meta). Os artigos são apresentados no
front-office através de três plugins de templating prontos a usar: um destaque dos artigos mais recentes, uma
lista de artigos paginada e filtrável e uma vista de detalhe de um único artigo. Os URLs otimizados para SEO,
as meta tags por artigo e os redirecionamentos 301 automáticos para o URL canónico são geridos através de
listeners de eventos dedicados.

No back-office React da v6 (`/melis-react`), o módulo inclui um **brick React nativo** — uma verdadeira
interface React para listar e editar artigos, suportada por uma camada JSON `react-api` — com um alternador
**New / Old** que permite recuar para a ferramenta legada num iframe. É o gémeo arquitetónico do
MelisCmsNews. A framework, os serviços, o modelo de dados, o encaminhamento SEO e os plugins de front
permanecem inalterados face à v5; apenas a camada de apresentação do back-office é nova.

## Ativá-lo

Adicione a `config/melis.module.load.php`:

```php
return [
    'MelisCmsBlog',
];
```

Requer `melis-core` e `melis-cms`, PHP `^8.1|^8.3|^8.4`. As integrações opcionais ativam-se quando
`MelisCmsComments`, `MelisCmsSlider`, `MelisSmallBusiness` ou `MelisCmsUserAccount` também estão
instalados. O brick só aparece na barra lateral React se o módulo estiver presente (deteção modular de
bricks via `GET /melis/react-api/react-modules`).

## Serviços principais

Registados como aliases de `service_manager` em `config/module.config.php`. O controlador React reutiliza
estas mesmas regras de negócio no lado do servidor, mantendo a paridade com a ferramenta legada.

| Alias de serviço | Função |
| --- | --- |
| `MelisCmsBlogService` | Serviço principal de CRUD/consulta. Ler, criar, atualizar e eliminar artigos; consultar por site, idioma, intervalo de datas, estado e autor. Cada método dispara eventos `*_start` / `*_end` através do `MelisEngineGeneralService`. |

Aliases de table gateway: `MelisCmsBlogTable`, `MelisCmsBlogTextsTable`.

## Tabelas de base de dados

Estrutura base em `install/sql/setup_structure.sql`; migrações em `install/dbdeploy/`.

| Tabela | Contém |
| --- | --- |
| `melis_cms_blog` | Linha principal do artigo: estado, datas de publicação/despublicação, id do site, image1-3, documents1-3, id do slider |
| `melis_cms_blog_texts` | Textos por idioma: título, subtítulo, parágrafos 1-4, id do idioma, URL SEO, meta título/descrição SEO, conta do autor |

> Ao contrário do MelisCmsNews, o blogue **não tem categorias nem tags** — não há tabela de ligação nem
> suporte para `melis_cms_tag*`.

## Back-office React

Barra lateral → grupo **MelisCms** → **Blog** (`fa-rss`). O brick abre como um separador de topo chamado
**Blog** e desenha a sua própria barra de subseparadores interna: um subseparador por cada artigo aberto,
mais um Back to the list. Cada artigo aberto mantém-se montado, pelo que alternar entre artigos é instantâneo.

### A lista de artigos

A lista React mostra todos os artigos da plataforma, com **cartões de KPI** (Total posts, Published,
Unpublished), uma caixa de **pesquisa** com filtros **All / Active / Inactive**, um gestor de **Colunas**
(ocultar/reordenar), um botão de **Exportação** (xlsx/csv), paginação por keyset e **editar** / **eliminar**
por linha. Clique num cabeçalho de coluna para ordenar. **+ New post** inicia um editor em branco.

![A lista Blog em React: cartões de KPI (Total posts / Published / Unpublished), uma caixa de pesquisa com filtros All / Active / Inactive, um gestor de Colunas, um botão de Exportação, o alternador New/Old e o botão "+ New post", com ações de editar e eliminar por linha](/screenshots/react/melis-cms-blog/meliscmsblog-tool-blog-list.png)

Um alternador **New / Old** (no canto superior direito) troca a lista — e apenas a lista — entre a interface
React e a ferramenta legada renderizada num iframe (`/melis/react-tool-page?key=meliscmsblog_left_menu`),
para que as duas interfaces possam ser comparadas lado a lado.

### O editor de artigos

Onde a ferramenta legada usava separadores de topo distintos (Properties / Texts / Medias), o editor React é
uma única página com deslocamento: uma **coluna de conteúdo** larga à esquerda e uma **barra lateral de
definições** recolhível à direita. Um **seletor de idioma** no topo contém todas as traduções em simultâneo —
todos os idiomas são guardados em conjunto numa única chamada.

**Coluna de conteúdo**

- **Title / Subtitle** — texto simples, por idioma.

![O seletor de idioma do editor de artigos (English / Français / Español), os campos Title e Subtitle e o BODY com até 4 parágrafos de texto formatado (TinyMCE) — cada um no seu cartão reordenável por arrasto, com um contador de parágrafos](/screenshots/react/melis-cms-blog/meliscmsblog-tool-blog-edit-tab-texts.png)

- **Body** — até **4 parágrafos de texto formatado (TinyMCE)** (`cblog_paragraph1..4`), reordenáveis por
  arrasto, com **+ Add paragraph (max. 4)**.
- **Media** — até **3 imagens** (Replace / Remove por espaço) e até **3 anexos de ficheiro**.
  Aparece apenas **após a primeira gravação**, uma vez que os carregamentos necessitam de que o artigo já exista.

![A área Media — Images (máx. 3, com Replace/Remove por espaço) e File attachments (máx. 3, "Click to attach a file")](/screenshots/react/melis-cms-blog/meliscmsblog-tool-blog-edit-tab-medias.png)

- **Comments** — um painel de moderação nativo (adicionar/editar, aprovar/recusar/eliminar, paginado),
  apresentado apenas quando o **MelisCmsComments** está instalado.

**Barra lateral de definições** (secções recolhíveis)

- **Status** — um alternador Published / Unpublished, mais um botão **Workflow** (validação) quando o
  **MelisSmallBusiness** está ativo.

![O topo da barra lateral de definições — o alternador Published com um botão Workflow, os seletores de data-hora Publish on / Unpublish on e o seletor de Site](/screenshots/react/melis-cms-blog/meliscmsblog-tool-blog-edit-tab-properties.png)
- **Publication** — seletores de data-hora **Publish on** / **Unpublish on**.
- **Site** — o site a que o artigo pertence (obrigatório).
- **Author** — um seletor de autor, apresentado apenas quando o **MelisCmsUserAccount** fornece a coluna
  `cblog_author_account`.
- **Comments validation** — um alternador "os comentários do front-office permanecem ocultos até serem
  aprovados", mais um interruptor exclusivo do blogue "Account required to comment", apresentado quando o
  **MelisCmsComments** está ativo.
- **SEO** — Meta title, Meta description e **URL** amigável, por idioma (armazenados na tabela de textos,
  não numa tabela SEO dedicada).
- **Slider** — um slider para apresentar com o artigo, apresentado apenas quando o **MelisCmsSlider** está ativo.

As secções opcionais são detetadas por funcionalidade em tempo de execução (os endpoints associados devolvem
404 de forma graciosa; o estado do módulo é lido a partir de `/melis/react-api/react-modules`), pelo que a
ausência de um módulo associado nunca impede uma gravação. **Save** (canto superior direito) persiste todas as
traduções, SEO, datas, ligações de media, slider e autor numa única chamada. Uma área de **Preview** renderiza
depois o artigo guardado na sua página de detalhe num iframe.

![A barra lateral de definições ampliada — um alternador Comments validation, o alternador exclusivo do blogue "Account required to comment", e depois as secções recolhíveis SEO e Slider](/screenshots/react/melis-cms-blog/meliscmsblog-tool-blog-edit-tab-properties-with-overrides.png)

## API React

As rotas residem em `config/react-api.php` (fundidas via `MelisCmsBlog\Module::getConfig()`), montadas sob
`/melis/react-api/…`. Controlador: `MelisCmsBlog\Controller\MelisCmsBlogReactApiController`. Contrato
`{ success, data, error }`; cada fetch envia `X-Requested-With: XMLHttpRequest` e
`credentials:'include'`.

| Método e URL | Objetivo |
| --- | --- |
| `GET /blog` | Listar artigos (keyset: `limit`, `search`, `status`, `siteId`, `sort`, `dir`, `after`) → `{items,total,nextCursor}` |
| `GET /blog/stats` | KPI `{total, published, draft}` |
| `GET /blog/:id` | Um artigo (`?langId=` → essa tradução; campos base + parágrafos + media + SEO + slider/autor) |
| `POST /blog/save` | Criar / atualizar (todas as traduções, estado, siteId, datas, sliderId, authorId, flags de comentário, seo) |
| `DELETE /blog/delete/:id` | Eliminar um artigo e os seus textos |
| `GET /blog/preview/:id` | URL de pré-visualização + lista de páginas BLOG_DETAIL para o site do artigo |
| `GET /blog/users` | Utilizadores do front-office como autores (`MelisCmsUserAccount`) |
| `GET /blog/:id/comments` | Comentários de um artigo (404 se `MelisCmsComments` estiver desativado) |
| `POST /blog/comments/save` | Adicionar/editar um comentário |
| `POST /blog/comments/approve/:cid` · `/refuse/:cid` | Moderar um comentário |
| `DELETE /blog/comments/delete/:cid` | Eliminar um comentário |
| `GET /blog-sites` | Lista de sites |
| `GET /blog-languages` | Idiomas do CMS (`melis_cms_lang`) |

**Não existem rotas `/blog/categories` nem `/blog/tags`**. Os sliders provêm da própria rota
`GET /melis/react-api/sliders` do brick MelisCmsSlider. O carregamento/remoção de media e a pesquisa de autor de
comentário reutilizam os endpoints **legados** (sem alteração no backend):

- `POST /melis/MelisCmsBlog/MelisCmsBlog/saveFileForm` — carregamento multipart de imagem/ficheiro
- `POST /melis/MelisCmsBlog/MelisCmsBlog/removeAttachFile` — limpa a coluna e elimina o ficheiro

### Capacidades

Declaradas em `config/react.capabilities.php` sob o nó portador de direitos `meliscmsblog_left_menu`:

```
meliscmsblog_left_menu
└─ actions: list · create · edit · delete · export
```

O React controla o acesso à interface via `window.__melisUseCaps('meliscmsblog_left_menu').can(cap)`
(New post → `create`, Export → `export`, ações de linha → `edit`/`delete`, corpo da lista → `list`). No lado
do servidor, cada ação do controlador é protegida por `denyUnlessAccess()` (autenticação + `canAccess`) e
depois por `denyUnlessCan(cap)`.

## Manifesto do brick

`public/ui-react/brick.manifest.json` (bundle IIFE do Vite, React/ReactDOM externalizados para variáveis
globais do host):

```json
{ "id": "blog", "route": "/melis-cms/blog", "label": "Blog",
  "forwardKey": "MelisCmsBlog/MelisCmsBlogList", "melisKey": "meliscmsblog_left_menu",
  "entry": "brick.js", "persistent": true, "subTabs": true }
```

`forwardKey` mapeia o nó de menu esquerdo legado para a rota da árvore `/melis-cms/blog` (deep-linkable como
`/melis-cms/blog/:id`, usado pelo ícone de olho do Workflow). `subTabs: true` significa que o brick desenha a
sua própria barra de subseparadores interna. Quando o MelisSmallBusiness está ativo, a secção Status renderiza
o `window.__melisWorkflowModal` mutualizado com `ctx.wfType = 'BLOG'`. Um módulo opcional pode adicionar ações
por parágrafo via `window.__melisBlogExtensions.renderParagraphActions(...)`.

## Front-office

Três plugins de templating estendem o `MelisTemplatingPlugin`, cada um com um controller plugin e um ficheiro
de configuração sob `config/plugins/`. Todos leem o id do artigo ativo a partir do parâmetro de query
`?blogId`. No editor de páginas React, são arrastados a partir do grupo **Melis Cms Blog** no painel de
plugins, e cada um abre a modal de configuração clássica com separadores.

![O editor de páginas React com o painel de plugins aberto — o grupo "Melis Cms Blog": Latest blog posts, Blog post list, Blog post details](/screenshots/react/melis-cms-blog/meliscmsblog-page-plugins-menu.png)

| Classe do plugin | Chave de config | Vista | Separadores de config |
| --- | --- | --- | --- |
| `MelisCmsBlogLatestBlogPlugin` | `MelisCmsBlogLatestBlog` | `MelisCmsBlog/latest-blog` | Properties, Filters |
| `MelisCmsBlogListBlogPlugin` | `MelisCmsBlogListBlog` | `MelisCmsBlog/blog-list` | Properties, Pagination, Filters |
| `MelisCmsBlogShowBlogPlugin` | `MelisCmsBlogShowBlog` | `MelisCmsBlog/blog-details` | Properties |

Parâmetros de config do plugin: `template_path`, `site_id`, `pageIdBlog` (ligação à página de detalhe),
`column`, `order`, `limit`, `date_min`, `date_max`, `search`; mais `nbPerPage` / `nbPageBeforeAfter`
(apenas Blog list). O plugin Blog list também filtra por `?authorId`. O plugin Blog details recua para o
artigo publicado mais recente quando não existe `blogId` no pedido, e suporta o modo de pré-visualização
(`renderMode === 'previewtab'`).

Colunas de ordenação disponíveis: `cblog_id`, `cblog_title`, `cblog_publish_date`, `cblog_creation_date`.

![Plugin Blog list → Properties — Template MelisCmsBlog/blog-list, Site e página de detalhe do Blog](/screenshots/react/melis-cms-blog/meliscmsblog-page-plugin-bloglist-config-properties.png)

![Plugin Latest blog → Filters — Sort (Blog publish date), Order, Limit, data From/To e Default search](/screenshots/react/melis-cms-blog/meliscmsblog-page-plugin-latestblog-config-filters.png)

![Plugin Blog details → Properties — Template MelisCmsBlog/blog-details e um seletor Default post](/screenshots/react/melis-cms-blog/meliscmsblog-page-plugin-blogdetails-config-properties.png)

### Encaminhamento SEO

Os artigos são servidos através de uma página do tipo **`BLOG_DETAIL`** que contém o plugin Blog details, no
`cblog_seo_url` do artigo. Quatro listeners implementam o pipeline SEO completo:

| Listener | Evento | Função |
| --- | --- | --- |
| `MelisCmsBlogSEOReformatToRoutePageUrlListener` | `EVENT_ROUTE` | Corresponde ao URL SEO e constrói uma rota para a página BLOG_DETAIL |
| `MelisBlogSEODispatchRouterRegularUrlListener` | `EVENT_DISPATCH` | Redireciona (301) um URL não canónico para o `cblog_seo_url` do artigo |
| `MelisCmsBlogRedirect301Listener` | `meliscmsblog_redirect_page` | Define o meta SEO da página a partir dos campos meta do artigo |
| `MelisCmsBlogSEOMetaPageListener` | `EVENT_FINISH` | Reescreve o `<title>` / `<meta description>` renderizado com o meta SEO do artigo |

O `MelisCmsBlogPreviewTypeListener` regista o tipo de página **BLOG_DETAIL** no formulário de propriedades da
página (evento `modify_page_properties_form_config`).

## Exemplo

```php
$blog = $this->getServiceManager()->get('MelisCmsBlogService');

// Latest 10 published posts for site 1, newest first:
$list = $blog->getBlogList([
    'siteId'   => 1,
    'langId'   => 1,
    'limit'    => 10,
    'orderBy'  => 'cblog_publish_date',
    'orderDir' => 'DESC',
]);

// Fetch one post (with its texts for a given language):
$post = $blog->getBlogById($blogId, $langId);
$txt  = $blog->getPostText($blogId);

// Create / update / delete:
$id = $blog->saveBlog(['cblog_site_id' => 1, 'cblog_status' => 1, ...], $blogId); // null → create
$blog->deleteBlogById($blogId);  // also removes its texts

// Utility:
$pages  = $blog->getBlogDetailsPagesBySite($siteId);       // BLOG_DETAIL-type pages for a site
$isDupe = $blog->checkSeoUrlDuplication($seoUrl, $blogId); // SEO URL uniqueness check
$slug   = $blog->cleanURL($title);                         // slugify (handles accents)

// Posts by a front-account author:
$posts  = $blog->getBlogListByAuthorId($authorId);
```

## Outros listeners

| Listener | Evento | Objetivo |
| --- | --- | --- |
| `MelisCmsBlogSliderDeletedListener` | `meliscmsslider_delete_slider_end` | Remove dos artigos um slider eliminado (`cblog_slider_id`) |
| `MelisCmsBlogGdprAutoDeleteActionDeleteListener` | `melis_cms_user_account_gdpr_auto_delete_action_delete` | RGPD: coloca a `null` o `cblog_author_account` de uma conta de utilizador eliminada |
| `MelisCmsBlogServiceMicroServiceListener` | `melis_core_microservice_amend_data` | Converte caminhos de imagem em URLs absolutos nos resultados de `getBlogList` para saída de API/microsserviço |
| `SiteMenuBlogDataListener` | `MelisFrontMenuPlugin_melistemplating_plugin_end` | Fornece os artigos (agrupados por mês/ano) ao plugin de menu do front |
| `MelisCmsBlogFlashMessengerListener` | `meliscmsblog_delete_blog_end`, `meliscmsblog_save_blog_*_end` | Feedback via flash-messenger para as ações do blogue |

## Ficheiros principais

| Área | Caminho |
| --- | --- |
| Config do módulo (serviços, gateways, plugins) | `vendor/melisplatform/melis-cms-blog/config/module.config.php` |
| Rotas da API React | `vendor/melisplatform/melis-cms-blog/config/react-api.php` |
| Capacidades React | `vendor/melisplatform/melis-cms-blog/config/react.capabilities.php` |
| Árvore da ferramenta de back-office (legada / vista Old) | `vendor/melisplatform/melis-cms-blog/config/app.interface.php` |
| Injeção do separador de comentários | `vendor/melisplatform/melis-cms-blog/config/comments.config.php` |
| Configs dos plugins | `vendor/melisplatform/melis-cms-blog/config/plugins/` |
| Serviço principal | `vendor/melisplatform/melis-cms-blog/src/Service/MelisCmsBlogService.php` |
| Controlador da API React | `vendor/melisplatform/melis-cms-blog/src/Controller/MelisCmsBlogReactApiController.php` |
| Plugins de front | `vendor/melisplatform/melis-cms-blog/src/Controller/Plugin/` |
| Listeners (SEO, RGPD, slider, menu, flash) | `vendor/melisplatform/melis-cms-blog/src/Listener/` |
| Código-fonte do brick React | `vendor/melisplatform/melis-cms-blog/ui-react/src/` |
| Brick compilado + manifesto | `vendor/melisplatform/melis-cms-blog/public/ui-react/` |
| SQL de instalação | `vendor/melisplatform/melis-cms-blog/install/sql/setup_structure.sql` |

Ver também: [melis-cms](/pt/reference/modules/melis-cms), [melis-front](/pt/reference/modules/melis-front),
[melis-engine](/pt/reference/modules/melis-engine), [melis-core](/pt/reference/modules/melis-core),
[melis-cms-slider](/pt/reference/modules/melis-cms-slider),
[melis-small-business](/pt/reference/modules/melis-small-business)
