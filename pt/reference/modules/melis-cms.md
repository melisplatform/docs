# MelisCms

> O back-office do CMS — sites, árvore de páginas, editor de páginas, templates, estilos e SEO, disponibilizado como um back-office React. Pacote `melisplatform/melis-cms`.

## Objetivo

O `MelisCms` é o back-office onde constrói e opera os seus sites na plataforma Melis. Disponibiliza
a árvore de páginas do site, o editor de páginas (separadores Edição, Propriedades, SEO, Idiomas),
as zonas de plugins arrastar e largar para compor conteúdos, e as ferramentas de administração de
sites, templates, estilos, idiomas, IDs de plataforma, domínios e redireccionamentos. **Não possui
tabelas de base de dados próprias** — lê e escreve tudo através do
[melis-engine](/legacy/reference/modules/melis-engine), e a renderização das páginas (incluindo a
pré-visualização de edição ao vivo) é assegurada pelo
[melis-front](/legacy/reference/modules/melis-front).

No Melis v6 a lógica de negócio mantém-se inalterada; a **camada de apresentação** é um **back-office
React** (`/melis-react`). O MelisCms fornece **um único bundle multi-brick** que expõe **nove
ferramentas**: o editor de páginas (um anfitrião de barra lateral: árvore de páginas + editor com
separadores) e **oito ferramentas laterais React nativas**. A única parte que continua a ser a UI
clássica é o separador **Edição** do editor de páginas, carregado num iframe.

## O trio MelisCms / MelisFront / MelisEngine

Estes três módulos formam um sistema fortemente acoplado; uma pergunta sobre um deles envolve
normalmente os outros.

- **MelisEngine** — possui todo o modelo de base de dados do CMS (páginas, árvore, sites, templates,
  idiomas, SEO, estilos) e expõe-no através de table gateways e serviços. Define
  `MelisTemplatingPlugin`, a classe base que todos os blocos de conteúdo estendem.
- **MelisFront** — pipeline de renderização do front-office; transforma um URL numa página finalizada
  e alimenta a pré-visualização editável ao vivo dentro do back-office (`renderMode/melis`).
- **MelisCms** *(este módulo)* — a camada de UI do back-office; conduz o ciclo de vida da página
  disparando eventos que os listeners do engine e do front tratam.

**Ordem de carregamento:** `melis-core` → `melis-front` → `melis-engine` → `melis-cms`.

## Activá-lo

Adicione a `config/melis.module.load.php`:

```php
return [
    'MelisCms',
];
```

Requer `melisplatform/melis-core`, `melisplatform/melis-engine` e `melisplatform/melis-front`.
Não tem SQL de instalação próprio; o esquema do CMS faz parte do melis-engine. Os bricks aparecem no
back-office React apenas quando o MelisCms está activo (descoberta via
`GET /melis/react-api/react-modules`).

## O back-office React — um bundle, nove bricks

O bundle (`public/ui-react/brick.js` + `brick.manifest.json`) declara nove bricks que se
auto-registam em `brick.tsx`. Todos são React nativo completo, excepto o separador Edição do editor
de páginas.

| ID do brick | Rota | melisKey | Tipo |
| --- | --- | --- | --- |
| `cms` | `/melis-cms/page` | `meliscms_page` | Editor de páginas (anfitrião de barra lateral: árvore + editor com separadores) |
| `cms-sites` | `/melis-cms/sites` | `meliscms_tool_sites` | React nativo (lista + editor + assistente de 5 passos) |
| `cms-templates` | `/melis-cms/templates` | `meliscms_tool_templates` | React nativo (lista + formulário) |
| `cms-styles` | `/melis-cms/styles` | `meliscms_tool_styles` | React nativo |
| `cms-languages` | `/melis-cms/languages` | `meliscms_tool_language` | React nativo |
| `cms-platform-ids` | `/melis-cms/platform-ids` | `meliscms_tool_platform_ids` | React nativo |
| `cms-site-301` | `/melis-cms/site-301` | `meliscms_tool_site_301` | React nativo |
| `cms-mini-templates` | `/melis-cms/mini-templates` | `meliscms_mini_template_manager_tool` | React nativo |
| `cms-menu-manager` | `/melis-cms/menu-manager` | `meliscms_mini_template_menu_manager_tool` | React nativo |

O brick `cms` é especial: regista **tanto** um `Component` com rota (o editor com separadores)
**como** uma `Sidebar` (a árvore de páginas), de modo que a árvore permaneça visível na barra lateral
esquerda enquanto trabalha. Cada ferramenta lateral traz um selector **New / Old** — *New* é a UI
React, *Old* é a ferramenta clássica num iframe (`/melis/react-tool-page?key=<melisKey>`).

![A secção MelisCms na barra lateral React — o painel PAGE TREE e o grupo Site Tools](/screenshots/react/melis-cms/meliscms-menu-entry.png)

## Árvore de páginas (barra lateral esquerda)

A árvore de páginas é o mapa dos seus sites e de cada página dentro deles. Clique numa página para a
abrir como separador de topo no editor; a pesquisa encontra páginas ainda não carregadas e expande a
árvore até elas; o menu de contexto (botão direito) de um nó adiciona uma página filha, mostra
detalhes, duplica uma página ou um ramo inteiro, ou elimina. Mova uma página por arrastar e largar
(as permissões do lado do servidor decidem o que pode mover).

![A árvore de páginas React — sites e páginas, com indicadores de rascunho, bloqueio e raiz de site](/screenshots/react/melis-cms/meliscms-menu-site-treeview.png)

A árvore reutiliza os endpoints legados do CMS (sem alteração no backend) através de
`cms-tree-api.ts`:

| Objetivo | Endpoint |
| --- | --- |
| Filhos de um nó (lazy) | `GET /melis/MelisCms/TreeSites/get-tree-pages-by-page-id?nodeId=<id>` (`-1` = raízes de site) |
| Pesquisar páginas por nome | `POST /melis/MelisCms/Page/searchTreePages` |
| Mover / reparentar | `GET /melis/MelisCms/Page/movePage` |
| Duplicar uma árvore | `POST /melis/MelisCms/TreeSites/duplicateTreePage` |
| Eliminar uma página | `GET /melis/MelisCms/Page/deletePage?idPage=<id>` |

A árvore escuta o evento `melis:cms-tree-refresh` para se actualizar e revelar uma página após
Guardar/Publicar/Eliminar.

## Editor de páginas

Abra uma página a partir da árvore, ou aceda directamente via `/melis-cms/page/:idPage`. O editor tem
uma **moldura React nativa** (título + estado, botões de ação, barra de separadores) em torno do
conteúdo dos separadores. A moldura é montada a partir de uma estrutura fundida no servidor
(`GET /melis/react-api/cms-page/structure?idPage=<id>` → `{ header, tabs[], buttons[] }`), de modo
que **outros módulos podem adicionar separadores e botões fundindo configuração do lado do
servidor**.

Primeiro os separadores nativos, depois os que forem contribuídos por outros módulos: **Edição ·
Propriedades · SEO · Idiomas · Histórico · Page Analytics · Scripts · Open Graph · Link Checker ·
Google Analytics · Versionamento · Comentários**. Botões de ação: **Nova página · Duplicar · Apagar
rascunho · Eliminar página · Ver · Mostrar · Guardar · Publicar** (mais um interruptor de estado
Publicar/Online e botões modulares como Workflow).

### Separador Propriedades (React nativo)

Defina o **nome**, o **tipo** (Página / Pasta / Site…), o **template** (layout), o **idioma**
(bloqueado após a criação), a **exibição no menu**, o **estilo** e as palavras-chave de taxonomia da
página.

![O separador Propriedades em React — nome, tipo, template, idioma, exibição no menu, estilo e taxonomia](/screenshots/react/melis-cms/meliscms-page-tab-properties.png)

### Separador Edição (arrastar e largar legado num iframe)

O separador Edição preenche a página: renderiza ao vivo e **arrasta blocos de conteúdo (plugins)**
para as zonas do template. É o **editor clássico carregado num iframe** dentro da moldura React
(`/melis/react-tool-page?key=meliscms_page&idPage=<id>`); o arrastar e largar, o menu de plugins, o
gestor de mini-templates e os editores de texto formatado são os mesmos que no back-office clássico.
O seu conteúdo é guardado automaticamente na sessão PHP e escrito quando Guarda ou Publica.

![O separador Edição — a página ao vivo com a sobreposição de arrastar e largar, dentro da moldura do editor React](/screenshots/react/melis-cms/meliscms-page-tab-edition.png)

![O painel de plugins — os blocos de conteúdo que pode largar na página; a lista depende dos módulos activos do site](/screenshots/react/melis-cms/meliscms-page-tab-edition-menu-templating-plugins.png)

![Layouts de zonas de arrastar e largar — escolha como dividir uma zona para colocar os seus blocos](/screenshots/react/melis-cms/meliscms-page-tab-edition-dragdropzone-layouts.png)

### Separadores SEO e Idiomas (React nativo)

O separador **SEO** contém o URL amigável, o meta título/descrição, os URLs canónico e de
redireccionamento. O separador **Idiomas** gere as versões linguísticas da página (cada uma com o seu
próprio conteúdo e SEO).

![O separador SEO em React — URL, meta título/descrição e campos de redireccionamento](/screenshots/react/melis-cms/meliscms-page-tab-seo.png)

### Guardar vs publicar

- **Guardar** escreve o rascunho (Propriedades + SEO + o XML de Edição em conjunto, numa só ação).
- **Ver → Pré-visualizar / Ver online** mostra o rascunho ou a página ao vivo.
- **Publicar** torna o rascunho actual ao vivo; o interruptor de estado publica / despublica.
- **Apagar rascunho** descarta o rascunho, revertendo para a versão publicada.

Guardar/Publicar envia para os endpoints **legados** com os nomes de campo legados:
`POST /melis/MelisCms/Page/savePage?idPage=` e `.../publishPage?idPage=` (mais `unpublishPage`,
`clearSavedPage`, `deletePage`); o XML de Edição é lido da sessão PHP.

## Ferramentas laterais

### Sites — criar e gerir sites

`/melis-cms/sites`. Cada linha é um site inteiro (ID, nome, módulo, idiomas). **+ New site** executa
um **assistente de 5 passos**: Multilingue → Idiomas → Domínios → Módulo → Resumo. Um site existente é
gerido através de separadores React nativos: **Propriedades · Carregamento de Módulos · Domínios ·
Idiomas · Configuração do Site · Traduções · Scripts**.

![A ferramenta Sites em React — pesquisa, Columns, Export, selector New/Old e + New site](/screenshots/react/melis-cms/meliscms-tool-sites-list.png)

![Edição de site — separador Module Loading: interruptores por módulo com reordenação por arrastar da ordem de carregamento](/screenshots/react/melis-cms/meliscms-tool-sites-edit-tab-moduleloading.png)

![Edição de site — separador Site Config: definições Gerais mais definições chave/valor por idioma](/screenshots/react/melis-cms/meliscms-tool-sites-edit-tab-siteconfig.png)

### Templates — layouts de página

`/melis-cms/templates`. Lista nativa e formulário nativo: Nome / Tipo / Site, e Layout / Controller /
Action (o layout `.phtml` a que o template está mapeado).

![A lista Templates em React — cartões de KPI, controller/action, layout e site por linha](/screenshots/react/melis-cms/meliscms-tool-templatemanager-list.png)

### Styles — CSS aplicado às páginas

`/melis-cms/styles`. Gere folhas de estilo CSS (nome, caminho/fonte CSS, site); associe um estilo a
uma página a partir do separador Propriedades da página.

![A lista Styles em React — estado, nome, caminho CSS e site por linha](/screenshots/react/melis-cms/meliscms-tool-stylemanager-list.png)

### Idiomas do front-office

`/melis-cms/languages`. A lista mestre de locales que a plataforma conhece (locale + nome com
bandeira).

### Platforms IDs — intervalos de IDs de página por ambiente

`/melis-cms/platform-ids`. Reserva uma faixa distinta de IDs de página e de template por ambiente,
para que os IDs nunca colidam ao mover conteúdos entre dev / staging / produção.

![A lista Platforms IDs em React — intervalos de IDs de página e de template por plataforma](/screenshots/react/melis-cms/meliscms-tool-platformids-list.png)

### 301 Redirects — manter as ligações antigas a funcionar

`/melis-cms/site-301`. Quando um URL público muda, adicione um redireccionamento (URL antigo → URL
novo, único por site) para que o endereço antigo continue a resolver.

![A lista 301 Redirects em React — URL antigo para URL novo por site](/screenshots/react/melis-cms/meliscms-tool-siteredirect-list.png)

### Mini-Templates e gestor de Menu

Os Mini-Templates (`/melis-cms/mini-templates`) são blocos de conteúdo pré-construídos que os editores
podem largar numa página com um clique; o gestor de Menu (`/melis-cms/menu-manager`) organiza-os em
categorias para que sejam fáceis de encontrar no gestor de mini-templates do editor de páginas.

![O gestor de Menu em React — uma árvore reordenável por arrastar de categorias e dos seus mini-templates](/screenshots/react/melis-cms/meliscms-tool-minitemplate-menu-manager.png)

## Endpoints da API React

As rotas são declaradas em `config/react-api.php` sob `/melis/react-api/…`; os controllers estão em
`src/Controller/MelisReactApi*Controller.php`. Cada ação é protegida por `CapabilityGuardTrait`
(`denyUnlessAccess()` para `MelisCoreRights::canAccess(MELIS_KEY)`, depois `denyUnlessCan('<action>')`).
O contrato em todo o lado é `{ success, data }` em caso de sucesso e `{ success:false, error }` em
caso de falha; cada fetch envia `X-Requested-With: XMLHttpRequest` com credenciais.

| Controller | Guard (melisKey) | Base | Ações |
| --- | --- | --- | --- |
| `MelisReactApiPageController` | `meliscms_page` | `/cms-page` | `structure`, `properties`, `seo`, `refs`, `languages`, `ancestors`, `save-properties`, `save-seo` |
| `MelisReactApiCmsSitesController` | `meliscms_tool_sites` | `/cms-sites` | `list`, `meta`, `get`, `config`, `modules`, `create` |
| `MelisReactApiSiteRedirectController` | `meliscms_tool_site_301` | `/site-redirects` | `list`, `stats`, `sites`, `get`, `save`, `delete` |
| `MelisReactApiTemplateController` | `meliscms_tool_templates` | `/templates` | `list`, `stats`, `sites`, `get`, `save`, `delete` |
| `MelisReactApiCmsLanguageController` | `meliscms_tool_language` | `/cms-languages` | `list`, `stats`, `get`, `save`, `delete` |
| `MelisReactApiCmsPlatformIdController` | `meliscms_tool_platform_ids` | `/cms-platform-ids` | `list`, `stats`, `get`, `save`, `delete` |
| `MelisReactApiCmsStyleController` | `meliscms_tool_styles` | `/cms-styles` | `list`, `stats`, `sites`, `get`, `save`, `delete` |
| `MelisReactApiCmsMiniTemplateController` | `meliscms_mini_template_manager_tool` | `/cms-mini-templates` | `list`, `stats`, `sites`, `item`, `save`, `delete` |
| `MelisReactApiCmsMenuManagerController` | `meliscms_mini_template_menu_manager_tool` | `/menu-manager` | `sites`, `languages`, `tree`, `saveTree`, `category`, `saveCategory`, `deleteCategory` |

```ts
// GET the styles list (keyset), then POST a 301 redirect
const r = await fetch('/melis/react-api/cms-styles?limit=25', {
  headers: { 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'include',
})
const { success, data } = await r.json()   // { success, data: { items, total, nextCursor } }

await fetch('/melis/react-api/site-redirects/save', {
  method: 'POST',
  headers: { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ id: null, siteId: 1, oldUrl: 'old', newUrl: 'new' }),
})
```

## Capacidades

Declaradas em `config/react.capabilities.php` sob `melisReactToolCapabilities`, indexadas pelo
`melisKey` portador de direitos de cada ferramenta (`export` apenas onde a ferramenta tem um botão
Export):

```php
'meliscms_tool_site_301'                    => ['list','create','edit','delete','export','test'],
'meliscms_tool_templates'                   => ['list','create','edit','delete','export'],
'meliscms_tool_styles'                      => ['list','create','edit','delete','export'],
'meliscms_tool_language'                    => ['list','create','edit','delete'],
'meliscms_tool_platform_ids'                => ['list','create','edit','delete','export'],
'meliscms_tool_sites'                       => ['list','create','edit','delete','export'],
'meliscms_mini_template_manager_tool'       => ['list','create','edit','delete','export'],
'meliscms_mini_template_menu_manager_tool'  => ['list','create','edit','delete'],
```

O editor de páginas é indexado sob `meliscms_page` como uma árvore estruturada, de modo que os seus
botões e separadores se tornam cada um numa capacidade:

```php
'meliscms_page' => [
  'actions' => ['create','save','clear','publish','status','delete','duplicate','view','display'],
  'tabs'    => ['edition','properties','seo','languages'],
],
```

Cada módulo contribuinte adiciona **os seus** separadores/botões de página sob esta mesma chave
`meliscms_page` (fusão Laminas), e o `CmsPage.tsx` filtra-os via `useCaps('meliscms_page').can(cap)`.
Duas chaves relacionadas no mesmo ficheiro expõem os direitos do editor: `melisReactRightsTools`
injecta um nó `meliscms_page` apenas de direitos ("Page edition") em Users → Rights, e
`melisReactSidebarHostSections` mantém a secção MelisCms visível para que a árvore de páginas seja
acessível mesmo a um utilizador com apenas direitos de página.

## Pontos de extensão modular

Outros módulos contribuem separadores do editor de páginas e gravações entre separadores sem tocar no
MelisCms:

```ts
// Register a page-edit tab (link-check, Open Graph, GA, historic, script-editor…)
window.__melisRegisterPageTab(key, ({ idPage }) => <MyTab idPage={idPage} />)
// Register a cross-cutting save hook, run by the global Save/Publish
window.__melisRegisterPageSaveHook(key, async (idPage) => { /* persist my tab */ })
```

Do lado do servidor, os mesmos pontos de extensão permanecem disponíveis:

- **`melis_cms_page_tabs_alter`** — adicionar ou remover separadores no editor de páginas.
- **`modify_page_properties_form_config`** — alterar o formulário de Propriedades para adicionar campos
  personalizados.

## Serviços principais

Resolva com `$sm->get('<alias>')`. A lógica de negócio permanece do lado do servidor (serviços
Laminas); o React é apresentação mais chamadas à API.

| Alias do serviço | Papel |
| --- | --- |
| `MelisCmsPageService` | Escreve o modelo da página: `savePage()`, `savePagePublished()`, `savePageSaved()`, `savePageSeo()`, `savePageLang()`, `savePageStyle()`, `savePageTree()`, `saveProperties()`. |
| `MelisCmsSiteService` | CRUD de sites e consultas de páginas por site. |
| `MelisCmsPageGetterService` | `getPageContent($pageId)` — devolve o HTML renderizado em cache de uma página. |
| `MelisCmsRights` | Verificações de permissões do back-office: `isAccessible()`, `isActionButtonActive()`. |
| `MelisCmsSitesDomainsService` | Gestão de domínios por ambiente. |
| `MelisCmsSitesPropertiesService` | Definições chave/valor de todo o site (separador Site Config). |
| `MelisCmsSiteModuleLoadService` | Carregamento de módulos por site (separador Module Loading). |
| `MelisCmsMiniTemplateService` / `MelisCmsMiniTemplateGetterService` | Biblioteca de mini-templates e gestão de categorias. |
| `MelisCmsPageExportService` / `MelisCmsPageImportService` | Exportar/importar uma árvore de páginas como ficheiro. |

## Tabelas da base de dados

O `MelisCms` não possui tabelas. O esquema do CMS é definido no melis-engine e acedido através dos
seus gateways e serviços. Nunca consulte directamente as tabelas do CMS — use os gateways/serviços do
engine para que a cache e o resto do ecossistema permaneçam consistentes.

## Eventos do ciclo de vida da página

O ciclo de vida da página é implementado através de 19 listeners ligados em
`Module.php::onBootstrap`. Estes eventos são o principal ponto de extensão — ligue-se a eles em vez de
chamar directamente o `MelisCmsPageService`, para que o histórico, as caches e outros módulos
permaneçam sincronizados.

| Ação | Eventos |
| --- | --- |
| Guardar rascunho | `meliscms_page_save_start` / `_end` (+ `…savetree_*`, `…saveproperties_*`, `…saveedition_*`, `…saveseo_*`) |
| Publicar | `meliscms_page_publish_start` / `_end` |
| Despublicar | `meliscms_page_unpublish_start` / `_end` |
| Eliminar | `meliscms_page_delete_start` / `_end` (+ `…deleteseo_*`, `…delete_page_*`) |
| Mover | `meliscms_page_move_start` / `_end` |
| Duplicar | `meliscms_page_duplicate_start` / `_end` |
| Sessão de plugin | `meliscms_page_savesession_plugin_*`, `meliscms_page_removesession_plugin_*` |

```php
// React to a page being published — in Module.php::onBootstrap or a listener's attach()
$eventManager->getSharedManager()->attach(
    'MelisCms',
    'meliscms_page_publish_end',
    function (\Laminas\EventManager\EventInterface $e) {
        $idPage = $e->getParams()['idPage'] ?? null;
        // log, sync, clear a custom cache, notify…
    },
    50
);
```

## Adicionar um novo bloco de conteúdo

Cada bloco de conteúdo estende `MelisTemplatingPlugin` (definido no melis-engine). Implemente
`front()` para renderizar no site ao vivo e `back()` para renderizar o contentor de edição, depois
registe o plugin. Os módulos News, Slider e Category2 são implementações de referência.

## Widget de dashboard

O `MelisCmsPagesIndicatorsPlugin` mostra contagens de sites e de páginas (publicadas vs não
publicadas) no Dashboard do back-office.

![O widget de dashboard Indicators — sites, páginas e páginas publicadas vs não publicadas](/screenshots/react/melis-cms/meliscms-dashboardplugins-indicators.png)

## Ficheiros principais

| Aspecto | Caminho |
| --- | --- |
| Bootstrap do módulo + ligação de listeners | `vendor/melisplatform/melis-cms/src/Module.php` |
| Rotas + controllers da API React | `vendor/melisplatform/melis-cms/config/react-api.php` |
| Capacidades React | `vendor/melisplatform/melis-cms/config/react.capabilities.php` |
| Código-fonte dos bricks (todas as 9 ferramentas) | `vendor/melisplatform/melis-cms/ui-react/src/` |
| Bundle compilado (versionado) | `vendor/melisplatform/melis-cms/public/ui-react/brick.js` + `brick.manifest.json` |
| Serviço de página | `vendor/melisplatform/melis-cms/src/Service/MelisCmsPageService.php` |
| Serviço de site | `vendor/melisplatform/melis-cms/src/Service/MelisCmsSiteService.php` |
| Serviço de direitos | `vendor/melisplatform/melis-cms/src/Service/MelisCmsRightsService.php` |
| Todos os listeners (19) | `vendor/melisplatform/melis-cms/src/Listener/` |
| Widget de dashboard | `vendor/melisplatform/melis-cms/src/Controller/DashboardPlugins/MelisCmsPagesIndicatorsPlugin.php` |

## Ver também

- [melis-engine](/legacy/reference/modules/melis-engine) — possui o modelo de dados do CMS e todos os table gateways.
- [melis-front](/legacy/reference/modules/melis-front) — renderização do front-office e pré-visualização ao vivo.
- [melis-core](/legacy/reference/modules/melis-core) — autenticação, direitos, eventos e configuração base.
