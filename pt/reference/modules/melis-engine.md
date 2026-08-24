# MelisEngine

> Fundação de dados partilhada do CMS — modelo de páginas, sites, idiomas, classe base para plugins de templating e a cache de renderização. Pacote `melisplatform/melis-engine`.

## Propósito

O MelisEngine é o proprietário de todo o modelo de base de dados do CMS (páginas, árvore de
páginas, sites, templates, idiomas, domínios, SEO, estilos) e expõe-o através de gateways de
tabela, serviços e uma cache multicamada. Tanto o
[MelisFront](/pt/reference/modules/melis-front) (renderização de front-end) como o
[MelisCms](/pt/reference/modules/melis-cms) (edição de back-office) leem e escrevem
exclusivamente através do MelisEngine — nenhum dos módulos irmãos é proprietário de tabelas.
Define também `MelisTemplatingPlugin`, a classe base abstrata que todos os plugins de conteúdo
da plataforma estendem.

## Papel no back-office React

O MelisEngine **não tem ferramenta de back-office React nem interface própria** — sem brick,
sem `config/react-api.php`, sem capacidades, sem entrada na barra lateral em `/melis-react`.
**Não está migrado para React nem se destina a estar**: é infraestrutura de plataforma, não uma
ferramenta de back-office. A sua relação com a shell React é totalmente feita nos bastidores,
por dois caminhos:

- **Caminho de dados** — os controladores CMS React (`MelisReactApi*`, que residem nos módulos
  CMS e não aqui) leem e escrevem páginas, sites, idiomas, templates e SEO **apenas** através
  dos gateways `MelisEngineTable*` e dos serviços do MelisEngine (`MelisEnginePage`,
  `MelisEngineTree`, `MelisEngineLang`, …). A camada React nunca toca diretamente no esquema
  do CMS.
- **Caminho de renderização** — o conteúdo CMS apresentado no editor de páginas React e nas
  ferramentas legacy em iframe é renderizado **do lado do servidor** (páginas → templates →
  zonas → plugins). O engine resolve o modelo de páginas e define a classe base dos plugins;
  o MelisFront executa a renderização propriamente dita. O React incorpora o resultado
  renderizado no servidor em vez de voltar a renderizar o conteúdo CMS no lado do cliente.

Por ser invisível mas estruturante, os problemas do engine manifestam-se *dentro das
ferramentas CMS React* — uma árvore de páginas vazia, uma lista pendente de idiomas que
permanece vazia, um editor de páginas que dá erro ao carregar — normalmente causados por uma
tabela CMS em falta/desatualizada ou por um serviço do engine com falha, nunca por um ecrã do
engine (não existe nenhum).

## Ativação

O MelisEngine é carregado automaticamente como dependência. A ordem de carregamento em
`config/melis.module.load.php` é:

```php
// config/melis.module.load.php
return [
    'MelisCore',
    'MelisFront',
    'MelisEngine',   // requires melis-core + melis-front
    'MelisCms',
];
```

Dependências do Composer: `melisplatform/melis-core` `^6.0`, `melisplatform/melis-front` `^6.0`,
`laminas/laminas-cache` (adaptadores de sistema de ficheiros + memória). Corre em PHP `^8.3 | ^8.5`.

## Serviços principais

Registados como aliases de `service_manager` em `config/module.config.php`:

| Alias de serviço | Papel |
| --- | --- |
| `MelisEnginePage` / `MelisPageService` | Resolve uma página por id e modo (`published` / `saved`): `getDatasPage($idPage, $mode)` — devolve a árvore de páginas hidratada, os dados da página, o SEO, o template e os objetos de estilo |
| `MelisEngineTree` / `MelisTreeService` | Navegação na árvore de páginas: `getPageChildren()`, `getPageFather()`, `getPageBreadcrumb()`, `getPageLink()`, pesquisa |
| `MelisEngineTemplateService` | Consulta de templates: `getTemplate($tplId)` |
| `MelisEngineSiteService` | Catálogo de sites |
| `MelisEngineSiteDomainService` | Resolução domínio → site: `getSiteByDomain()` |
| `MelisEngineLang` / `MelisEngineLangService` | Idiomas: idiomas disponíveis, locale ↔ id, idioma do site |
| `MelisEngineSEOService` | Dados de SEO por página: `getSEOById()` |
| `MelisEnginePageDefaultUrlsService` | Consultas de URLs de página pré-calculados / canónicos |
| `MelisEngineStyle` / `MelisEngineStyleService` | Estilos do site e CSS por página |
| `MelisEngineCacheSystem` | Orquestrador de cache: `getCacheByKey()`, `setCacheByKey()`, `deleteCacheByPrefix()` |
| `MelisSearch` | Índice de páginas de texto integral (estilo Lucene) usado pela pesquisa de front-end |
| `MelisEngineSendMail` | Utilitário de e-mail |
| `MelisGdprService` / `MelisGdprAutoDeleteService` | Textos do banner de RGPD e framework de eliminação automática |
| `MelisEngineComposer` | Operações de Composer / dependências |

Todos os serviços que estendem `MelisGeneralService` disparam eventos `*_start` / `*_end` (por
exemplo, `melisengine_service_get_available_languages_start` / `_end`) que outros módulos podem
interceptar.

### Consumidores React (verificados)

Estes são os pontos de entrada sancionados do caminho de dados através dos quais as ferramentas
CMS React acedem ao engine:

| Serviço / gateway do engine (alias) | Usado por (BO React) |
| --- | --- |
| `MelisEnginePage` (`MelisPageService`) | melis-cms `MelisReactApiPageController` — dados de página para o editor de páginas React |
| `MelisEngineTree` (`MelisTreeService`) | melis-cms `MelisReactApiPageController` — navegação na árvore de páginas |
| `MelisEngineLang` (`MelisEngineLangService`) | melis-cms `MelisReactApiCmsSitesController`, `MelisReactApiCmsMenuManagerController` — idiomas CMS disponíveis |
| `MelisEngineTableCmsLang` (`MelisCmsLangTable`) | melis-cms-tags, melis-cms-user-account, melis-core (RGPD) — listas pendentes de idiomas React |

O alias `MelisEngineTableCmsLang => MelisCmsLangTable::class` está registado em
`config/module.config.php`.

## Back-office

O MelisEngine não tem ferramenta própria para o utilizador final, nem no back-office legacy nem
em `/melis-react`. Regista duas fábricas de elementos de formulário usadas em todo o back-office:

| Fábrica | Propósito |
| --- | --- |
| `MelisEnginePluginTemplateSelect` | Elemento de seleção de template para formulários de plugins |
| `MelisEngineSiteSelect` | Elemento de seleção de site para formulários de plugins |

Também estão presentes controladores de configuração e manutenção (`MelisSetup*`), mas são
invocados pelo instalador e não pelos editores.

## Front office

A classe base de todos os plugins de conteúdo reside aqui:

| Item | Descrição |
| --- | --- |
| `MelisEngine\Controller\Plugin\MelisTemplatingPlugin` | Base abstrata de todos os plugins de conteúdo. Define `front()` (renderização em direto, abstrato), `back()` (vista de contentor/edição do back-office), persistência de configuração em XML (`loadDbXmlToPluginConfig()` / `savePluginConfigToXml()`), carregamento de GET/POST, modo de pré-visualização e largura responsiva. |

Todos os plugins de conteúdo da plataforma (News, Slider, Menu, Breadcrumb, …) derivam desta
classe. Implemente `front()` para a saída em direto; a base trata do `back()` automaticamente. O
mesmo pipeline de plugins alimenta o editor de páginas React: o MelisFront renderiza os plugins
de cada zona do lado do servidor e o React apresenta o resultado.

Dois listeners de microsserviço interceptam `melis_core_microservice_amend_data` para expor
métodos de árvore e de página (`getPageChildren`, `getPageFather`, `getDomainByPageId`,
`getDatasPage`) através da camada de microsserviços da plataforma.

## Tabelas de base de dados

O MelisEngine é a fonte única da verdade para o esquema do CMS
(`install/sql/setup_structure.sql` + deltas em `install/dbdeploy/`):

| Tabela | Contém |
| --- | --- |
| `melis_cms_page_tree` | Hierarquia de páginas (`tree_father_page_id`, ordem) |
| `melis_cms_page_published` | Versão publicada (em direto) de cada página |
| `melis_cms_page_saved` | Versão guardada / rascunho (editada no back-office) |
| `melis_cms_page_lang` | Ligações página ↔ idioma |
| `melis_cms_lang` | Idiomas / locales do CMS |
| `melis_cms_site` | Sites (raiz da árvore de páginas) |
| `melis_cms_template` | Templates (layout / controlador / ação ou caminho PHP) |
| `melis_cms_page_seo` | SEO por página (URL, redirecionamento 301, meta title/description, canónico) |
| `melis_cms_site_domain` | Domínios do site por ambiente |
| `melis_cms_site_301` / `melis_cms_site_404` | Redirecionamentos 301 / mapeamento 404 a nível do site |
| `melis_cms_page_default_urls` | URLs de página pré-calculados (tabela de cache) |
| `melis_cms_style` / `melis_cms_page_style` | Estilos CSS e ligações página ↔ estilo |
| `melis_cms_platform_ids` | Intervalos de atribuição de ids de página por ambiente |
| `melis_cms_site_config` / `_home` / `_langs` | Configuração do site, página inicial por idioma, idiomas ativos |
| `melis_cms_site_robot` | robots.txt por domínio |
| `melis_cms_mini_tpl_*` | Categorias, templates e flags de mini-templates |
| `melis_cms_gdpr_texts` | Textos do banner de RGPD por site / idioma |
| `melis_site_translation` / `_text` | Cadeias de tradução a nível do site |

### Gateways de tabela

Cada tabela é encapsulada por um gateway `MelisEngineTable*` registado no service manager
(por exemplo, `MelisEngineTablePageTree`, `MelisEngineTablePagePublished`,
`MelisEngineTablePageSeo`). Os outros módulos — legacy ou React — devem usar sempre estes
gateways, nunca SQL em bruto. O gateway base fornece `getEntryById()`, `getEntryByField()`,
`save()`, `deleteById()`, `fetchAll()`.

## Exemplo

**Ler uma página e navegar na árvore:**

```php
$pageSvc = $sm->get('MelisEnginePage');
$page    = $pageSvc->getDatasPage($idPage);            // 'published' (live) by default
$draft   = $pageSvc->getDatasPage($idPage, 'saved');   // draft shown in the React page editor

$tree       = $sm->get('MelisEngineTree');
$children   = $tree->getPageChildren($idPage, 1);       // 1 = published only
$breadcrumb = $tree->getPageBreadcrumb($idPage);
$url        = $tree->getPageLink($idPage, true);        // true = absolute URL
```

**Preencher uma lista pendente de idiomas React a partir de um controlador CMS (do lado do servidor, delegando no engine):**

```php
// Inside a MelisReactApi* controller of a CMS module — the React JSON layer
// delegates to the engine; MelisEngine exposes no react-api of its own.
$langTable = $sm->get('MelisEngineTableCmsLang');
$langs     = $langTable->fetchAll()->toArray();   // fills a React language dropdown
```

**Ler/escrever através de um gateway de tabela (nunca SQL em bruto):**

```php
$seoTable = $sm->get('MelisEngineTablePageSeo');
$seo      = $seoTable->getEntryByField('plang_page_id', $idPage)->current();
$seoTable->save(['seo_meta_title' => 'New title'], $existingSeoId);  // upsert
```

**Guardar em cache um resultado calculado:**

```php
$cache = $sm->get('MelisEngineCacheSystem');
$cache->setCacheByKey('mykey', 'my_cache_config', $value);
$value = $cache->getCacheByKey('mykey', 'my_cache_config');
$cache->deleteCacheByPrefix('page_' . $idPage, 'meliscms_page');   // invalidate a page
```

**Escutar um evento de serviço:**

```php
$sharedEvents->attach('MelisEngine', 'melisengine_page_getdatas_end', function ($e) {
    $p = $e->getParams();   // includes page id and 'results'
    // alter $p['results'] before it is returned
}, 50);
```

**Construir um plugin de conteúdo:**

```php
// Subclass MelisTemplatingPlugin, implement front() for live render.
// The base class handles back() (BO container), config XML persistence and preview.
class MyPlugin extends MelisEngine\Controller\Plugin\MelisTemplatingPlugin
{
    public function front(): string
    {
        return $this->getView()->render('my-module/plugin/my-plugin', $this->pluginConfig);
    }
}
```

## O trio Core / Engine / Front

O back-office React não altera o trio; assenta sobre ele:

- **MelisEngine** *(este módulo)* — é proprietário de todo o modelo de BD do CMS e expõe-o
  através de gateways de tabela + serviços + cache; define `MelisTemplatingPlugin`.
- **MelisFront** — renderiza páginas a partir dos dados do engine (executa os plugins de
  conteúdo) e alimenta a pré-visualização editável usada dentro do back-office (legacy *e* o
  editor de páginas React / ferramentas em iframe).
- **MelisCms** — o back-office do CMS; **não é proprietário de tabelas** e edita tudo através do
  engine. As suas ferramentas CMS React (`MelisReactApiPage`, `MelisReactApiCmsSites`,
  `MelisReactApiCmsMenuManager`, …) são os consumidores React listados acima.

## Ficheiros principais

| Aspeto | Caminho |
| --- | --- |
| Aliases de serviços e gateways, caches | `vendor/melisplatform/melis-engine/config/module.config.php` |
| Serviço de dados de página | `vendor/melisplatform/melis-engine/src/Service/MelisPageService.php` |
| Serviço de árvore / links | `vendor/melisplatform/melis-engine/src/Service/MelisTreeService.php` |
| Orquestrador de cache | `vendor/melisplatform/melis-engine/src/Service/` (`MelisEngineCacheSystem*`) |
| Classe base do plugin de templating | `vendor/melisplatform/melis-engine/src/Controller/Plugin/MelisTemplatingPlugin.php` |
| Gateways de tabela | `vendor/melisplatform/melis-engine/src/Model/Tables/` |
| Esquema + migrações delta | `vendor/melisplatform/melis-engine/install/sql/` |

Ver também: [MelisFront](/pt/reference/modules/melis-front) · [MelisCms](/pt/reference/modules/melis-cms) · [MelisCore](/pt/reference/modules/melis-core)
