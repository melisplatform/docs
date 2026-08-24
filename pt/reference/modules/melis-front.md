# MelisFront

> O sistema de renderização de front-office que transforma um URL numa página pública finalizada e disponibiliza os blocos de conteúdo (plugins de página) que os autores colocam nas páginas a partir do back-office React. Pacote `melisplatform/melis-front`.

## Objetivo

O MelisFront é o runtime que resolve um endereço web para uma página Melis, executa o pipeline de renderização (encaminhamento, SEO, plugins de templating, layout, cache, minificação de assets) e entrega a resposta HTML ao visitante. Alimenta também a **pré-visualização ao vivo e editável**, ao voltar a renderizar qualquer página no modo `melis`. O MelisFront não possui tabelas de base de dados próprias — todos os dados de página/site/template/SEO são lidos a partir do [melis-engine](/pt/reference/modules/melis-engine), a única fonte de verdade.

O MelisFront faz parte de um trio fortemente acoplado: [melis-engine](/pt/reference/modules/melis-engine) (camada de dados), **melis-front** (renderização de front) e [melis-cms](/pt/reference/modules/melis-cms) (editor de back-office). Alterações a qualquer um deles envolvem, com frequência, os outros dois.

## No back-office React

O MelisFront **não tem uma ferramenta React autónoma**: sem brick `ui-react/`, sem `brick.manifest.json`, sem `react-api.php` — nunca aparece na barra lateral esquerda do `/melis-react`. Toda a sua presença no back-office é o conjunto de **plugins de página (blocos de conteúdo)** que se configuram dentro do **editor de páginas do MelisCms**.

O MelisFront surge quando se edita uma página: **MelisCms → abrir uma página → separador Edition**. Esse separador Edition é o clássico editor de páginas de arrastar e largar **renderizado num iframe dentro da shell React** (`/melis/react-tool-page?key=meliscms_page`). Nele, arrasta-se os blocos do MelisFront para as zonas e abre-se o respetivo modal de **Properties**. O React limita-se a *alojar* esse editor legado; o MelisFront não contribui com nenhum componente React próprio.

Existem dois tipos de bloco:

- **Blocos de tag** editados **no local** na própria página — **HTML** (texto rico) e **Media** (imagem/ficheiro). Sem modal.
- **Blocos de configuração** definidos através de um modal de **Properties** — **Menu**, **Breadcrumb**, **List-from-folder**, **banner RGPD**. Geram conteúdo a partir da árvore de páginas / configuração do site.

## Ativá-lo

Adicione a `config/melis.module.load.php`:

```php
return [
    'MelisFront',
];
```

Dependência Melis declarada: `melisplatform/melis-core`. Em runtime consome também serviços do MelisEngine. Ordem de carregamento: `melis-core` → **melis-front** → `melis-engine` → `melis-cms`.

## Blocos de tag — editar no local

### HTML (Text)

O bloco de referência: uma **área de texto rico** (TinyMCE) para títulos, parágrafos, links e conteúdo formatado. Editado **diretamente na página**, sem modal de Properties. Classe de plugin `MelisFrontTagHtmlPlugin`.

![Bloco HTML/Text no editor de páginas com a barra de ferramentas completa do TinyMCE](/screenshots/react/melis-front/melisfront-page-plugin-html-tag.png)

### Media

Coloca uma **imagem ou ficheiro** da biblioteca de media. Também editado no local através de uma barra de ferramentas compacta com um marcador "Add media content here". Classe de plugin `MelisFrontTagMediaPlugin`.

![Bloco Media no local com o marcador Add media content here](/screenshots/react/melis-front/melisfront-page-plugin-media-tag.png)

## Blocos de configuração — modal de Properties

Os blocos de configuração são definidos através de um pequeno modal de **Properties** renderizado pela plataforma. Os dois campos recorrentes são a lista pendente **Template** (`MelisEnginePluginTemplateSelect`, campo `template_path`) que escolhe a view `.phtml`, e um **seletor de página** (`MelisText` com um botão `fa fa-sitemap`) que define a página inicial/pai na árvore. Cada bloco de configuração declara o seu modal como um `melis.modal_form` (especificação de formulário Laminas) em `config/plugins/<Plugin>.config.php`; não existe um componente React por plugin.

### Menu

Constrói um **menu de navegação automaticamente a partir da árvore de páginas**. Campos do modal: **Template** e **Starting page**. Plugin `MelisFrontMenuPlugin` (campo `pageIdRootMenu`).

![Modal Properties do bloco Menu com os campos Template e Starting page](/screenshots/react/melis-front/melisfront-page-plugin-menu-config-properties.png)

### Breadcrumb

Renderiza o rasto "está aqui" (Home › Section › Page). Campos do modal: **Template** (predefinição `MelisFront/breadcrumb`) e **Starting page**. Plugin `MelisFrontBreadcrumbPlugin` (campo `pageIdRootBreadcrumb`).

![Modal Properties do bloco Breadcrumb com os campos Template e Starting page](/screenshots/react/melis-front/melisfront-page-plugin-breadcrumb-config-properties.png)

### List-from-folder

Pega numa **pasta na árvore de páginas e lista as suas páginas-filhas** automaticamente. Campos do modal: **Template** (como cada item é renderizado) e **Parent page** (a pasta de origem). Plugin `MelisFrontShowListFromFolderPlugin` (campo `pageIdFolder`).

![Modal Properties do List-from-folder com os campos Template e Parent page](/screenshots/react/melis-front/melisfront-page-plugin-folderlisting-config-properties.png)

### Banner RGPD

O **banner de cookies/consentimento** apresentado no site público. O seu modal apenas precisa do **Template**; o texto provém dos textos RGPD do site. Plugin `MelisFrontGdprBannerPlugin`.

![Modal Properties do banner RGPD com um único campo Template](/screenshots/react/melis-front/melisfront-page-plugin-gdprbanner-config-properties.png)

### Campos dos modais de configuração

| Plugin | Campos do modal (nome / tipo) | Template predefinido |
| --- | --- | --- |
| Breadcrumb | `template_path` (`MelisEnginePluginTemplateSelect`) · `pageIdRootBreadcrumb` (`MelisText`, sitemap) | `MelisFront/breadcrumb` |
| Menu | `template_path` · `pageIdRootMenu` (`MelisText`, sitemap) | `MelisFront/menu` |
| List-from-folder | `template_path` · `pageIdFolder` (`MelisText`, sitemap) | `MelisFront/show-list-from-folder` |
| Banner RGPD | apenas `template_path` | `MelisFront/gdpr-banner` |

**Apply** envia os valores de volta através da camada de arrastar e largar, que os persiste no XML de sessão da página. O React não participa nesse ciclo; a interface do plugin é inteiramente PHP/JS legado dentro do iframe Edition.

## Serviços principais

| Alias do serviço | Papel |
| --- | --- |
| `MelisFrontHead` | Gere o `<title>` da página, a meta description, o canonical e injeta os assets CSS/JS dos plugins. |
| `MelisSiteConfigService` | Lê a configuração por site por chave, página ou idioma — fusão de ficheiro + BD. |
| `MelisSiteTranslationService` | Pesquisa e CRUD de chaves/textos de tradução por site, com cache por site. |
| `MelisTranslationService` | Traduções de módulo/locale (strings do back-office), com cache. |
| `MinifyAssets` | Constrói `bundle.css` / `bundle.js` por site usando `matthiasmullie/minify`. |
| `MelisFrontNavigation` | Fábrica de navegação que constrói uma árvore `Laminas\Navigation` a partir da árvore de páginas do engine. |

## Renderização de front

### Encaminhamento

A rota de front principal é um padrão Regex que corresponde a `.../id/{idpage}`, despachado para `MelisFront\Controller\Index::index`. Rotas-filhas: `/renderMode/melis` (modo de edição do back-office usado pelo MelisCms) e `/preview` (pré-visualização da versão guardada). Rotas especiais: `sitemap(.xml)`, `/css/plugin-width.css`, `/melissearchindex/…`, `/melispluginrenderer` (renderização AJAX de um único plugin), `/minify-assets`.

### Pipeline de renderização (listeners)

Ligado em `src/Module.php` ao longo de `EVENT_DISPATCH` e `EVENT_FINISH` (~19 listeners no total):

| Fase | Listeners |
| --- | --- |
| `EVENT_LOAD_MODULES_POST` | `MelisFrontSEORouteListener`, `MelisFrontSiteConfigListener`, `MelisFrontMiniTemplateConfigListener` |
| `EVENT_DISPATCH` | `MelisFrontXSSParameterListener`, `MelisFrontHomePageRoutingListener` / `…HomePageIdOverrideListener`, `MelisFrontSEODispatchRouterRegularUrlListener` (validação de página, 404/301, dispara `melisfront_site_dispatch_ready`), `MelisFront404To301Listener`, `MelisFront404CatcherListener` |
| `EVENT_FINISH` | `MelisFrontPluginsToLayoutListener` (CSS/JS dos plugins), `MelisFrontSEOMetaPageListener` (title/description/canonical), `MelisFrontAttachCssListener` (CSS da página), `MelisFrontLayoutListener` (layout de front ou layout de BO + TinyMCE no modo `melis`), `MelisFrontPageCacheListener`, `MelisFrontMinifiedAssetsCheckerListener` |

### Plugins de templating (plugins de controlador)

Todos estendem `MelisEngine\Controller\Plugin\MelisTemplatingPlugin`, registados sob `controller_plugins`. Os blocos expostos no editor React são um subconjunto destes:

| Alias do plugin | Bloco |
| --- | --- |
| `MelisFrontTagHtmlPlugin` | Zona HTML / texto rico editável inline. |
| `MelisFrontTagTextareaPlugin` | Zona de texto simples. |
| `MelisFrontTagMediaPlugin` | Imagem / ficheiro da biblioteca de media. |
| `MelisFrontMenuPlugin` | Menu de navegação construído a partir da árvore de páginas. |
| `MelisFrontBreadcrumbPlugin` | Rasto de breadcrumb (Home › … › Página atual). |
| `MelisFrontShowListFromFolderPlugin` | Lista subpáginas de uma pasta escolhida automaticamente. |
| `MelisFrontDragDropZonePlugin` | Contentor de layout (zona de destino para outros plugins). |
| `MelisFrontBlockSectionPlugin` | Contentor de bloco/secção reutilizável. |
| `MelisFrontGenericContentPlugin` | Bloco de conteúdo de uso geral. |
| `MelisFrontGdprBannerPlugin` | Banner de consentimento de cookies / RGPD. |
| `MelisFrontGdprRevalidationPlugin` | Volta a pedir consentimento quando a política RGPD muda. |
| `MelisFrontSearchResultsPlugin` | Renderiza os resultados da pesquisa interna do site. |
| `MiniTemplatePlugin` | Insere um mini-template pré-construído num só clique. |

### O controlador de renderização de plugins

`MelisFront\Controller\MelisPluginRendererController` volta a renderizar um único plugin a pedido — é o que o iframe Edition invoca quando se larga ou edita um bloco:

- `getPluginAction()` (rota `/melispluginrenderer`) — renderização AJAX de um plugin.
- `editPluginAction`, `dndLayoutAction`, `dndUpdateOrderAction`, `dndRemoveAction` — os fluxos de arrastar e largar e de edição de plugins.

### View helpers

Usados dentro dos templates `.phtml` de um site (registados sob `view_helpers`):

| Alias do helper | Utilização |
| --- | --- |
| `MelisTag` | Declara uma zona editável (HTML ou media) que os editores preenchem no local. |
| `MelisLink` | Produz o URL SEO-friendly de uma página (mantém-se correto se a página for movida). |
| `MelisMenu` | Renderiza um menu de navegação a partir da árvore de páginas. |
| `MelisDragDropZone` | Renderiza uma zona de arrastar e largar que aloja outros plugins. |
| `siteTranslate` | Produz uma string de tradução do site por chave. |
| `SiteConfig` | Lê um valor de configuração do site. |

Estão também disponíveis helpers de idioma/home para links de versões de idioma e para o link da página inicial.

### Navegação

`MelisFrontNavigation` (`src/Navigation/Factory/`) estende a fábrica de navegação Laminas para construir um objeto `Laminas\Navigation` a partir da árvore de páginas do engine (`MelisEnginePage` / `MelisEngineTree`), que os helpers Menu e Breadcrumb renderizam.

### Minificação de assets

`MinifyAssetsService` (suportado por `matthiasmullie/minify`) constrói `bundle.css` / `bundle.js` por site. `MelisFrontMinifiedAssetsCheckerListener` injeta-os (com cache-busting) quando presentes. Acione uma build através da rota `/minify-assets`.

## Tabelas de base de dados

O MelisFront **não possui tabelas de base de dados**. Todos os dados de página, site, idioma, SEO e tradução pertencem ao [melis-engine](/pt/reference/modules/melis-engine) e ao [melis-cms](/pt/reference/modules/melis-cms).

## Exemplo

Utilização típica num template `.phtml` de site e chamadas a serviços PHP:

```php
// Inside a site page template (.phtml)
<?= $this->MelisMenu($idPage); ?>                         // navigation menu from the page tree
<a href="<?= $this->MelisLink($targetPageId); ?>">…</a>  // SEO-friendly page link
<?= $this->MelisTag($idPage, 'zone_main', 'html'); ?>    // editable HTML zone
<?= $this->siteTranslate('btn_send'); ?>                  // site translation string
<?= $this->SiteConfig('contact_email'); ?>               // site config value
```

```php
// Reading site config and translations in PHP
$siteConfig = $serviceManager->get('MelisSiteConfigService');
$email = $siteConfig->getSiteConfigByKey('contact_email', $siteId);

$tr = $serviceManager->get('MelisSiteTranslationService')
        ->getEntryByTextAndSiteId('btn_send', $siteId, $langId);
```

```php
// Hooking the render pipeline (after page validation, before render)
$sharedEvents->attach('MelisFront', 'melisfront_site_dispatch_ready', function ($e) {
    $params = $e->getParams(); // page id, site, renderMode…
    // e.g. force a redirect, add data to the layout, A/B-test…
}, 50);
```

## Ficheiros principais

| Aspeto | Caminho |
| --- | --- |
| Bootstrap do módulo + ligação dos listeners | `vendor/melisplatform/melis-front/src/Module.php` |
| Rotas, serviços, plugins, helpers, caches | `vendor/melisplatform/melis-front/config/module.config.php` |
| Configuração dos plugins (predefinições de front + `melis.modal_form`) | `vendor/melisplatform/melis-front/config/plugins/` |
| Listeners do pipeline de renderização | `vendor/melisplatform/melis-front/src/Listener/` |
| Serviços (Head, SiteConfig, Translations, Minify) | `vendor/melisplatform/melis-front/src/Service/` |
| Plugins de templating (blocos de conteúdo) | `vendor/melisplatform/melis-front/src/Controller/Plugin/` |
| Controlador de renderização de plugins | `vendor/melisplatform/melis-front/src/Controller/MelisPluginRendererController.php` |
| View helpers | `vendor/melisplatform/melis-front/src/View/Helper/` |
| Fábrica de navegação | `vendor/melisplatform/melis-front/src/Navigation/Factory/` |

Ver também: [melis-engine](/pt/reference/modules/melis-engine), [melis-cms](/pt/reference/modules/melis-cms), [melis-core](/pt/reference/modules/melis-core)
