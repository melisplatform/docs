# MelisCmsNews

> Sistema de notícias / blogue para os sites Melis, com uma ferramenta de edição em React no back-office e três plugins de apresentação no front-office. Pacote `melisplatform/melis-cms-news`.

## Objetivo

O MelisCmsNews disponibiliza uma ferramenta **News** no back-office onde os editores escrevem e gerem
artigos de notícias multilingues (títulos, parágrafos em texto rico, imagens, documentos, agendamento
de publicação/despublicação e SEO). Os artigos são apresentados no front-office através de três plugins
de templating prontos a usar: um destaque das últimas notícias, uma lista de notícias paginada e uma
página de detalhe de artigo único. Os URLs otimizados para SEO e as meta tags por artigo são tratados
automaticamente através de listeners dedicados.

No Melis v6 a ferramenta é fornecida como um **brick nativo totalmente em React** no novo back-office
(`/melis-react`): uma verdadeira interface React para listar e editar artigos, que invoca uma camada
JSON `react-api`, com um seletor **New / Old** que permite recuar para a ferramenta clássica num iframe.
A framework, os serviços, os eventos, as tabelas e os plugins de front-office mantêm-se inalterados face
à v5 — apenas a camada de apresentação é nova.

## Como ativar

Adicione a `config/melis.module.load.php`:

```php
return [
    'MelisCmsNews',
];
```

Requer `melis-core`, `melis-engine`, `melis-front` e `melis-cms` (`^5.2`), bem como
`laminas/laminas-paginator`. As integrações opcionais ativam-se quando o `MelisCmsSlider`, o módulo de
categorias Melis, o `MelisCmsTags`, o `MelisCmsUserAccount` (autores) ou o `MelisCmsComments` também
estão instalados. O brick React só aparece enquanto o módulo estiver em `melis.module.load.php`
(descoberta modular de bricks via `GET /melis/react-api/react-modules`).

## Back-office React

Barra lateral esquerda → **Site Tools** → **News** (`Actualités`). Abre como um separador de topo chamado
**News** que aloja tudo através de **sub-separadores** internos: a lista de artigos e um sub-separador por
cada artigo aberto/novo com o editor completo. Cada sub-separador permanece montado, pelo que alternar
entre artigos é instantâneo. A rota da árvore é `/melis-cms/news` (com `/melis-cms/news/:id` para
ligações diretas, por exemplo o olho do Workflow).

### A lista de artigos

![A lista de notícias em React — cartões de KPI (Total de artigos / Publicados / Não publicados), uma caixa de pesquisa com filtros All / Active / Inactive, um gestor de Colunas, um botão Export, o seletor New/Old e o botão "+ New article", com ações de edição e eliminação por linha](/screenshots/react/melis-cms-news/meliscmsnews-tool-news-list.png)

A lista mostra todos os artigos da plataforma, com:

- **Cartões de KPI** — Total de artigos, Publicados, Não publicados.
- **Pesquisa** com filtros de estado **All / Active / Inactive**, colunas ordenáveis, um gestor de
  **Colunas** (ocultar/reordenar), uma **Exportação** (xlsx) e **Reset filters**.
- **Edição** por linha (abre o artigo como sub-separador) e **eliminação**; **+ New article** abre um
  editor em branco.
- Um seletor **New / Old** (canto superior direito) que alterna a lista entre a interface React e a
  ferramenta legada num iframe (`/melis/react-tool-page?key=meliscmsnews_left_menu`).

### O editor de artigos

Um único formulário com deslocamento: uma coluna de conteúdo larga à esquerda, uma barra lateral de
definições à direita e um **seletor de idioma** (English / Français) no topo — todas as traduções são
mantidas em simultâneo e guardadas em conjunto numa única chamada.

![O editor de novo artigo — um seletor de idioma, os campos Title e Subtitle, o BODY com um editor de parágrafos WYSIWYG e "Generate with AI", uma área MEDIA bloqueada e a barra lateral de definições (Status, Publication, Site, Author, SEO, Categories, Tags, Slider)](/screenshots/react/melis-cms-news/meliscmsnews-tool-news-new.png)

| Área | Conteúdo |
| --- | --- |
| Title / Subtitle | Texto simples, por idioma |
| Body | Até **10 parágrafos em texto rico (WYSIWYG)**, reordenáveis por arrastar, cada um com um auxiliar **Generate with AI** |
| Media | Até **3 imagens** e **3 ficheiros de documento** — bloqueado até à primeira gravação do artigo |
| Status | Seletor **Published / Unpublished**, mais um botão **Workflow** quando o MelisSmallBusiness está ativo |
| Publication | Seletores de data-hora **Publish on** / **Unpublish on** |
| Site | O site a que o artigo pertence |
| Author | Seletor de autor — apenas quando o `MelisCmsUserAccount` fornece a coluna `cnews_author_account` |
| SEO | **URL** amigável, **URL redirect**, **URL 301**, **Meta title**, **Meta description**, **Canonical URL** (por idioma) |
| Categories / Tags / Slider | Secções opcionais mostradas apenas quando o módulo correspondente está ativo |
| Comments | Painel de moderação nativo (adicionar / aprovar / recusar / eliminar) mostrado apenas quando o `MelisCmsComments` está ativo |

![Edição dos textos de um artigo — título, subtítulo e um editor de parágrafos em texto rico (estilo TinyMCE); é possível adicionar e reordenar parágrafos](/screenshots/react/melis-cms-news/meliscmsnews-tool-news-edit-texts.png)

![O topo da barra lateral de definições — o seletor Published com Workflow, as datas Publish on / Unpublish on e o seletor de Site](/screenshots/react/melis-cms-news/meliscmsnews-tool-news-edit-properties.png)

![A área Media — Images (máx. 3, com Replace/Remove) e File attachments (máx. 3), mais o painel nativo de moderação Comments quando o MelisCmsComments está ativo](/screenshots/react/melis-cms-news/meliscmsnews-tool-news-edit-medias.png)

![A secção SEO — Meta title, Meta description, URL, URL redirect, URL 301 e Canonical URL, por idioma](/screenshots/react/melis-cms-news/meliscmsnews-tool-news-edit-seo.png)

Depois de guardado, uma área de **Preview** renderiza o artigo dentro da respetiva página NEWS_DETAIL
num iframe, com a opção **Display in new tab** e um seletor de página quando o site tem várias páginas
de detalhe.

![A área Preview — o artigo guardado renderizado dentro da respetiva página NEWS_DETAIL, com um botão "Display in new tab"](/screenshots/react/melis-cms-news/meliscmsnews-tool-news-edit-preview.png)

### Mostrar notícias numa página

A partir do editor de páginas React (abra uma página → Edition), abra o painel de plugins e arraste
**Latest News**, **News List** ou **News Detail** para a página; cada um abre a janela modal clássica de
configuração de plugins Melis (renderizada dentro do editor React) com os mesmos separadores da v5 —
consulte [Front office](#front-office).

![O editor de páginas React com o painel de plugins aberto — os blocos de conteúdo News prontos a arrastar para a página](/screenshots/react/melis-cms-news/meliscmsnews-page-menu-plugins-selector.png)

![Plugin Latest News → Properties — Template, Site e News detail page (com um seletor de árvore de páginas)](/screenshots/react/melis-cms-news/meliscmsnews-page-plugin-latestnews-config-tab-properties.png)

![Plugin News List → Pagination — News per page e o número de ligações de página a mostrar](/screenshots/react/melis-cms-news/meliscmsnews-page-plugin-newslist-tab-pagination.png)

![Plugin News Detail → Properties — Template (news-details) e um seletor Default news com um atalho para a ferramenta News](/screenshots/react/melis-cms-news/meliscmsnews-page-plugin-newsdetail-config-tab-properties.png)

## API React

Não existe **`config/react-api.php`**: as rotas são declaradas **inline em
`config/module.config.php`**, aninhadas sob o nó partilhado `melis-react-api` de forma a montarem em
`/melis/react-api/…`. Controlador:
`MelisCmsNews\Controller\MelisCmsNewsReactApiController` (alias invocável
`MelisCmsNews\Controller\MelisCmsNewsReactApi`). Contrato `{ success, data, error }`.

| Método & URL | Objetivo |
| --- | --- |
| `GET /news` | Listar artigos (keyset: `limit`, `search`, `status`, `siteId`, `sort`, `dir`, `after`, `langId`) |
| `GET /news/stats` | KPI `{total, published, draft}` |
| `GET /news/:id` | Um artigo (`?langId=` → essa tradução; base + parágrafos + media + SEO + ids de categoria/tag) |
| `POST /news/save` | Criar / atualizar (todas as traduções, SEO, categorias, tags numa única chamada) |
| `DELETE /news/delete/:id` | Eliminar um artigo (+ os seus textos + SEO) |
| `GET /news/categories` | Categorias disponíveis (`?langId=&siteId=`) |
| `GET /news/tags` | Tags disponíveis (`MelisCmsTags`; vazio se ausente) |
| `GET /news/users` | Utilizadores do front-office como autores (`MelisCmsUserAccount`; vazio se ausente) |
| `GET /news/preview/:id` | URL de pré-visualização + páginas NEWS_DETAIL para o site do artigo |
| `GET /news/:id/comments` | Comentários de um artigo (404 se o `MelisCmsComments` estiver desativado) |
| `POST /news/comments/save` | Adicionar / editar um comentário (BO → aprovado) |
| `POST /news/comments/approve/:cid` · `/refuse/:cid` | Moderar um comentário |
| `DELETE /news/comments/delete/:cid` | Eliminar um comentário |
| `GET /news-sites` · `GET /news-languages` | Lista de sites · idiomas do CMS |

O carregamento/remoção de media reutiliza os endpoints **legados** (sem alteração no backend):
`POST /melis/MelisCmsNews/MelisCmsNews/saveFileForm` e `.../removeAttachFile`.

O controlador combina o `MelisCmsNewsService` do módulo (`getNewsById`, `saveNews`,
`deleteNewsById`, `getNewsDetailsPagesBySite`) com SQL parametrizado direto (keyset da lista,
estatísticas, SEO, tabelas de ligação de categoria/tag) e o `MelisCmsCategory2Service` partilhado; as
colunas/tabelas opcionais são detetadas por funcionalidade, de modo a que um módulo opcional em falta
nunca quebre uma gravação.

### Capacidades

Declaradas em `config/react.capabilities.php` sob o nó portador de direitos
`meliscmsnews_tools_section` (não a chave de manifesto/zona `meliscmsnews_left_menu` usada pelo iframe
da vista Old):

```
meliscmsnews_tools_section
└─ actions: list · create · edit · delete · export
```

Cada ação do controlador é protegida duas vezes — `denyUnlessAccess()` (autenticação +
`MelisCoreRights::canAccess`) e depois `denyUnlessCan(<cap>)`. O `saveAction` escolhe `create` ou `edit`
consoante a presença de um id. O React condiciona o botão **+ New article** a `create` e a lista a
`list` via `window.__melisUseCaps(melisKey)`.

## Serviços principais

Registados como aliases do `service_manager` em `config/module.config.php`.

| Alias do serviço | Função |
| --- | --- |
| `MelisCmsNewsService` | Serviço principal de CRUD/consulta. Ler, criar, atualizar e eliminar artigos; consultar por site, idioma, intervalo de datas, estado. Cada método dispara eventos `*_start` / `*_end` via `MelisGeneralService`. |

Aliases de table gateway: `MelisCmsNewsTable`, `MelisCmsNewsTextsTable`, `MelisCmsNewsSeoTable`,
`MelisCmsNewsCategoryTable`, `MelisCmsNewsTagsTable`.

## Front office

Três plugins de templating estendem o `MelisTemplatingPlugin`; cada um tem um controller plugin, um view
helper e um ficheiro de configuração em `config/plugins/`.

| Plugin | Controller plugin | View helper | Separadores de configuração |
| --- | --- | --- | --- |
| Latest News | `MelisCmsNewsLatestNewsPlugin` | `MelisCmsNewsLatestPlugin` | Properties, Filters |
| News List | `MelisCmsNewsListNewsPlugin` | `MelisCmsNewsListPlugin` | Properties, Pagination, Filters |
| News Detail | `MelisCmsNewsShowNewsPlugin` | `MelisCmsNewsShowNewsPlugin` | Properties |

Parâmetros de configuração dos plugins: `template_path`, `site_id`, `pageIdNews` (ligação da página de
detalhe), `column`, `order`, `limit`, `date_min`, `date_max`, `search`, mais `nbPerPage` /
`nbPageBeforeAfter` (apenas News List). A configuração é persistida no XML da página via
`loadDbXmlToPluginConfig()` / `savePluginConfigToXml()`.

O encaminhamento SEO e as meta tags por artigo são ligados em `src/Module.php` via:
`MelisCmsNewsSEORouteListener`, `MelisCmsNewsRenderPageListener`, `MelisCmsNewsMetaPageListener`,
`MelisCmsNewsSeoRedirectUrlListener`.

## Tabelas da base de dados

Estrutura base em `install/sql/setup_structure.sql`; migrações em `install/dbdeploy/`.

| Tabela | Guarda |
| --- | --- |
| `melis_cms_news` | Linha principal do artigo: estado, datas de publicação/despublicação, site, image1-3, documents1-3, id do slider |
| `melis_cms_news_texts` | Textos por idioma: título, subtítulo, parágrafos 1-10, ordem dos parágrafos, idioma |
| `melis_cms_news_seo` | SEO por idioma: URL, redirecionamento, flag 301, meta title/description, canónico |
| `melis_cms_news_category` | Ligação artigo ↔ categoria (funcionalidade de categoria opcional) |

## Exemplo

```php
$news = $this->getServiceManager()->get('MelisCmsNewsService');

// Latest 10 published articles for site 1, French, newest first:
$list = $news->getNewsList(
    status: 1, langId: 1, start: 0, limit: 10,
    orderColumn: 'cnews_publish_date', order: 'DESC', siteId: 1
);

// Fetch one article (all languages, or one language):
$all = $news->getNewsById(42);
$fr  = $news->getNewsById(42, 1);

// Create / update / delete:
$id = $news->saveNews($data, $newsId);   // $newsId null → create
$ok = $news->deleteNewsById(42);         // also removes texts + SEO rows

// Utility:
$txt  = $news->getPostText(42);
$pages = $news->getNewsDetailsPagesBySite(1);  // NEWS_DETAIL-type pages for a site
```

Ligue-se a um evento de serviço para estender o comportamento (por exemplo, notificar um índice de
pesquisa após a gravação):

```php
$sharedEvents->attach('MelisCmsNews', 'melis_cms_news_save_news_end', function ($e) {
    $params = $e->getParams(); // includes 'news', 'newsId', 'results'
}, 50);
```

Os restantes identificadores de eventos seguem o mesmo padrão `melis_cms_news_[method]_start/end`:
`melis_cms_news_get_news_list_*`, `melis_cms_news_get_news_by_id_*`,
`melis_cms_news_get_news_by_id_array_*`, `melis_cms_news__delete_news_by_id_*` (duplo
sublinhado), `melis_cms_news_get_post_text_*`, `melis_cms_news_get_news_details_pages_*`.

## Microsserviços

O `config/app.microservice.php` expõe `getNewsList` e `getNewsById` no bus de microsserviços Melis com
formulários e filtros de entrada gerados automaticamente. As form factories `MelisCmsNewsSelect` e
`MelisCmsNewsBOSelect` encontram-se em `src/Form/Factory/`.

## Ficheiros principais

| Assunto | Caminho |
| --- | --- |
| Configuração do módulo + rotas react-api inline | `vendor/melisplatform/melis-cms-news/config/module.config.php` |
| Capacidades React | `vendor/melisplatform/melis-cms-news/config/react.capabilities.php` |
| Árvore de ferramentas do backoffice | `vendor/melisplatform/melis-cms-news/config/app.interface.php` |
| Configuração da tabela de listagem | `vendor/melisplatform/melis-cms-news/config/app.tools.php` |
| Configuração de microsserviços | `vendor/melisplatform/melis-cms-news/config/app.microservice.php` |
| Controlador da API React | `vendor/melisplatform/melis-cms-news/src/Controller/MelisCmsNewsReactApiController.php` |
| Brick React (fonte Vite IIFE) | `vendor/melisplatform/melis-cms-news/ui-react/src/` |
| Brick compilado + manifesto | `vendor/melisplatform/melis-cms-news/public/ui-react/brick.js` · `brick.manifest.json` |
| Serviço principal | `vendor/melisplatform/melis-cms-news/src/Service/MelisCmsNewsService.php` |
| Plugins de front | `vendor/melisplatform/melis-cms-news/src/Controller/Plugin/` |
| View helpers | `vendor/melisplatform/melis-cms-news/src/View/Helper/` |
| Listeners (SEO, RGPD, limpeza de slider) | `vendor/melisplatform/melis-cms-news/src/Listener/` |
| Table gateways | `vendor/melisplatform/melis-cms-news/src/Model/Tables/` |
| SQL de instalação | `vendor/melisplatform/melis-cms-news/install/sql/setup_structure.sql` |
| Migrações da BD | `vendor/melisplatform/melis-cms-news/install/dbdeploy/` |

Consulte também: [melis-cms](/pt/reference/modules/melis-cms), [melis-front](/pt/reference/modules/melis-front),
[melis-engine](/pt/reference/modules/melis-engine), [melis-core](/pt/reference/modules/melis-core)
