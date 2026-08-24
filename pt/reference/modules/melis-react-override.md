# MelisReactOverride

> Infraestrutura de back-office React: apresenta as ferramentas legacy dentro da shell `/melis-react` e serve a SPA React. Pacote `melisplatform/melis-react-override`.

## Objetivo

O MelisReactOverride é um **módulo de infraestrutura de back-office React** — não é uma ferramenta. Não fornece qualquer
brick, qualquer página React, quaisquer endpoints `react-api` nem um ecrã próprio. Fornece os dois
mecanismos de ligação que permitem ao back-office React (`/melis-react`) funcionar em paralelo com o
`/melis` legacy:

1. **Mecanismo de iframe para ferramentas legacy** — qualquer ferramenta legacy jQuery/AJAX que não tenha uma página React
   dedicada é apresentada como uma página HTML autónoma (`/melis/react-tool-page?key=<melisKey>`) e mostrada
   dentro da shell React num `<iframe>`. A ferramenta dentro da frame tem o aspeto e o comportamento exatamente
   iguais ao acesso direto a `/melis` — as suas próprias DataTables, formulários, modais, separadores, botões de gravação e notificações nativas
   (toasts gritter, modais de validação por campo).
2. **Rota de fallback da SPA** — serve a shell React `index.html` para `/melis-react` e para todas as
   deep links do lado do cliente por baixo dela, e torna essa rota (além de alguns endpoints de arranque só de leitura)
   públicas.

Nunca se navega *para* este módulo. Regra prática: se estiver dentro de `/melis-react` a olhar para
um ecrã de ferramenta ao estilo antigo (Bootstrap clássico), está a olhar para uma página produzida pelo
MelisReactOverride.

## Como ativá-lo

É um módulo Laminas MVC puramente do lado do servidor, carregado através de `application.config.php` (`module_paths` +
`modules`) — `src/Module.php` faz o autoload de `MelisReactOverride\*` a partir de `src/` através do
`StandardAutoloader`. Categoria `core`.

Ele **substitui o controlador `PluginView` do MelisCore** por uma versão com consciência de React através de um
alias em `controllers.invokables`. Como este módulo carrega *depois* do melis-core, o alias vence a
fusão de configuração do Laminas:

```php
'controllers' => [
    'invokables' => [
        'MelisCore\Controller\PluginView'   => \MelisReactOverride\Controller\PluginViewController::class,
        'MelisReactOverride\Controller\Spa' => \MelisReactOverride\Controller\SpaController::class,
    ],
],
```

## Em resumo

| Propriedade | Valor |
| --- | --- |
| Nome do módulo | `MelisReactOverride` |
| Pacote | `melisplatform/melis-react-override` |
| Categoria | `core` |
| Brick / `ui-react/` / `react-api.php` | **nenhum** (apenas infraestrutura) |
| Controladores | `PluginViewController` (com alias sobre `MelisCore\Controller\PluginView`), `SpaController` |
| Serviços | `PlatformAssetsService`, `LegacyWidgetCssService` |
| Ponto de extensão | `PluginViewToolPageExtensionInterface` (hook `toolpage_extensions`) |

## Rotas

Todas as rotas de ferramenta/iframe são rotas-filhas de `melis-backoffice`, pelo que ficam por baixo de `/melis`. A
rota da SPA é uma rota regex de topo.

| Nome da rota | URL | Ação | Objetivo |
| --- | --- | --- | --- |
| `melis-backoffice/react-tool-page` | `/melis/react-tool-page` | `toolPage` | **Mecanismo central.** Apresenta uma zona de ferramenta legacy como uma página HTML autónoma para um iframe. Recebe `?key=<melisKey>` (e `?idPage=<id>` para o editor de páginas do CMS). |
| `melis-backoffice/react-dashboard-plugin` | `/melis/react-dashboard-plugin` | `dashboardPluginPage` | Um único plugin de dashboard legacy como página autónoma mínima. |
| `melis-backoffice/react-dashboard-plugin-config` | `/melis/react-dashboard-plugin-config` | `dashboardPluginConfigPage` | O formulário de configuração de um plugin de dashboard (botão da engrenagem) como HTML autónomo. |
| `melis-backoffice/react-dashboard-plugin-config-data` | `/melis/react-dashboard-plugin-config-data` | `dashboardPluginConfigData` | JSON: o formulário de configuração como dados (separadores + campos tipados + valores) para que o React o apresente de forma nativa. |
| `melis-backoffice/react-dashboard-plugin-config-save` | `/melis/react-dashboard-plugin-config-save` | `dashboardPluginConfigSave` | POST: validar + persistir a configuração de um plugin de dashboard. |
| `melis-backoffice/react-dashboard-plugin-content` | `/melis/react-dashboard-plugin-content` | `dashboardPluginContent` | JSON: HTML + scripts + jsCallbacks para injeção direta no DOM (sem iframe). |
| `melis-backoffice/react-platform-bundle` | `/melis/react-platform-bundle` | `platformBundle` | Serve o bundle de assets concatenado com o tipo MIME correto (substitui o `/melis/get-{css,js}-bundles` do MelisCore, que responde com um `text/html` vazio quando o bundle está em falta). |
| `melis-backoffice/react-legacy-widget-css` | `/melis/react-legacy-widget-css` | `legacyWidgetCss` | Folhas de estilo do back-office legacy, com todas as regras delimitadas por `.melis-legacy-widget`. |
| `meliscore-melis-react-spa` | `/melis-react`, `/melis-react/*` | `spa` | **Fallback da SPA.** Serve a shell React `index.html`. Rota regex, `priority => 1000`. |

### Rotas públicas (`excluded_routes`)

O módulo acrescenta a `plugins.meliscore.datas.excluded_routes` do MelisCore (arrays numéricos fundem-se
por acréscimo) para que `MelisCore\Module::checkIdentity()` deixe estas passar sem redirecionar para
`/melis/login`:

- `meliscore-melis-react-spa` — a shell é pública porque a aplicação React trata da sua própria
  autenticação (ecrã de login próprio).
- `melis-backoffice/react-platform-bundle` — para que uma sessão expirada não redirecione uma folha de estilo
  para uma página HTML de login (o erro exato de MIME que esta rota corrige).
- `melis-backoffice/melis-react-api/platformscheme-react-get` — branding do painel de login, lido antes
  da autenticação (apenas GET).
- `melis-backoffice/melis-react-api/langs` — a lista de idiomas do back-office que a SPA carrega no arranque,
  incluindo no ecrã de login (apenas leitura).

> As duas últimas são rotas `melis-react-api` (pertencentes ao **MelisReactApi**); o MelisReactOverride apenas
> as torna públicas, não as define.

## O mecanismo de iframe — `toolPageAction()` → `buildToolPage()`

`PluginViewController::toolPageAction()` resolve uma melisKey, apresenta a sua zona e entrega o HTML
ao `buildToolPage()` para montar um documento autónomo. Fluxo:

1. **Guarda de autenticação** — `denyIfUnauthenticated()` corre primeiro (esta página *não* é pública).
2. **Resolver melisKey → caminho de appConfig** — `MelisCoreConfig->getMelisKeys()` mapeia o `?key=` para um
   caminho de app-config; o último segmento é a chave da vista.
3. **Forçar o modo XHR** — adiciona `X-Requested-With: XMLHttpRequest` para que `generateRec()` apresente as zonas
   com `follow_regular_rendering:false` da mesma forma que o caminho AJAX clássico faz (caso contrário essas
   ferramentas caem para o front e apresentam um "404 MelisDemoCms").
4. **Fixar o id de sessão do PHP** — captura um instantâneo antes da apresentação e restaura-o depois (algumas ferramentas legacy rodam
   o id de sessão durante a apresentação — inofensivo em `/melis`, fatal aqui).
5. **Apresentar a zona** com `generateRec()` + `renderViewRec()`, capturando qualquer saída perdida que uma
   zona faça `echo` para o stream (mantida fora da marcação como comentário HTML para diagnóstico).
6. **Executar as extensões `adjustToolHtml()`** (`toolpage_extensions`) sobre o HTML apresentado.
7. **Construir os assets da plataforma** através de `PlatformAssetsService::build()` e injetar os `ressources`
   JS/CSS do próprio módulo.
8. **Executar as extensões `adjustToolAssets()`** (podem mover algum JS de módulo para o balde do `<head>` e
   devolver `skipJsRoots` para que o ciclo genérico não o carregue em duplicado).
9. **Montar** `buildToolPage($html, $jsCallBacks, $assets, $zoneId, $key)` e devolver como
   `text/html` com `X-Frame-Options: SAMEORIGIN`.

### Armadilhas que o `buildToolPage()` resolve

- **Neutralizar a guarda "Remove Envato Frame" do bundle.js** — dentro de um iframe em sandbox a guarda
  lança um `SecurityError` que mata o bundle.js. A página captura o verdadeiro parent
  (`window.__melisRealParent`) e depois redefine `window.parent`/`window.top` para devolverem `window`.
- **Carregar `melisDataTable.js` separadamente** — declarado em `app.interface.php` mas ausente do
  `bundle.js`; adicionado à fila de JS (expõe `window.melisDataTable`).
- **Shim global de `Proxy`** — para objetos definidos apenas dentro do `$(function(){…})` do bundle.js e ainda não
  disponíveis quando os scripts do corpo síncrono de uma ferramenta são analisados, um `Proxy` sem operação evita erros precoces.
- **Envolver os jsCallbacks em try/catch** — um callback cuja dependência não esteja carregada em modo autónomo não
  quebra a página.
- **Injetar os `ressources` JS/CSS do módulo** — o `bundle.js` central contém apenas ferramentas do MelisCore;
  as ferramentas de módulo trazem os seus próprios ficheiros (por exemplo, `news.tool.js` → `window.initNewsList`). O
  controlador recolhe todas as raízes de que a ferramenta necessita — a sua própria raiz de plugin, as raízes alcançadas via ligações
  `type` (percorridas recursivamente, com proteção contra ciclos) e os nós de módulo `forward`, além de algumas raízes extra para
  editores compostos conhecidos (por exemplo, `meliscms_page`), tudo condicionado para que os módulos inativos não carreguem nada.
- **Ordenação de JS no head vs. fim do body** — o JS da plataforma carrega no `<head>`; os `ressources` de módulo carregam
  dentro do `<body>` a seguir à faixa de separadores mas antes do HTML da ferramenta, espelhando o BO clássico.
- **Shell dos separadores do editor** — inclui as âncoras de separador clássicas (`#melis-id-nav-bar-tabs` oculta,
  `#melis-id-body-content-load`, `activeTabId` global) para que os fluxos de edição clássicos funcionem.
- **`<base href="/">`** para que os URLs AJAX relativos da ferramenta se resolvam a partir da raiz do site.
- **Ponto de montagem de modais `#melis-modals-container`** além de um watcher de autorreparação para backdrops perdidos.
- **Correção de exportação** — reassocia `melisCoreTool.exportData()` ao clique de uma âncora dentro da frame (o
  popup `window.open` legacy nunca conclui a transferência num iframe em sandbox).
- **Ponte de separadores de ferramenta & postMessage de resultado da ferramenta** — a faixa de separadores oculta é espelhada para o host através de
  `postMessage({ __melisToolTabs, … })`; uma mensagem `{ __melisToolResult, url, data }` é publicada
  após uma gravação JSON para que o host possa reagir estruturalmente. Nenhuma notificação visível é encaminhada — as ferramentas
  legacy mantêm o seu próprio feedback nativo.

## Assets da plataforma — `PlatformAssetsService`

`PlatformAssetsService::build($sm)` devolve `['css' => …, 'js' => …, 'inline' => …]`, a lista de assets
da plataforma com que cada iframe de ferramenta arranca:

- **CSS** — todos os ficheiros `bundle.css` de módulo (carregados em paralelo), precedidos das Google Fonts e de
  `/assets/css/schemes.css`, filtrados para os ficheiros que existem em disco.
- **Fila de JS** (a ordem importa) — `get-translations?locale=…`, `MelisCore/build/js/bundle.js` e depois
  os extras não incluídos no bundle: `melisDataTable.js`, `loader.js`, `findpage.tool.js`,
  `bootstrap-tagsinput.js`, `typeahead.bundle.js`, `moment/fr.js`, `melis_tinymce.js`.
- **Globais inline** — `basePath`, `primaryColor`, … lidos do esquema de plataforma ativo
  (`MelisCorePlatformSchemeService`), com as cores predefinidas do Melis como recurso alternativo.
- **Cache de bundle / autorreparação** — a dispendiosa chamada a `MelisAssetManagerWebPack->getAssets(true)`
  é colocada em cache (ficheiro temporário, TTL de 600s + memoização em processo); se `etc/bundles/` tiver sido apagado pela
  ferramenta Modules, é regenerado sob um lock de escritor único, ou a rota concatenada é trocada
  por `/melis/react-platform-bundle`.
- **`bust($url)`** acrescenta `?v=<mtime>` aos URLs de assets locais.

`LegacyWidgetCssService` suporta a rota `react-legacy-widget-css` — CSS do BO legacy delimitado por
`.melis-legacy-widget` para que não possa vazar para a shell React (usado por widgets legacy sem iframe
injetados diretamente no DOM do React, por exemplo o conteúdo de plugins de dashboard).

## Fallback da SPA — `SpaController`

`SpaController::spaAction()` serve a shell React para `/melis-react` e para todas as deep links do lado do
cliente:

- Resolve `index.html` via `$_SERVER['DOCUMENT_ROOT']`, lendo
  `…/vendor/melisplatform/melis-core/public/ui-react/index.html` (a build React reside no
  `public/` do melis-core, servida em `/MelisCore/ui-react/`). Funciona independentemente do local onde este módulo
  se encontra em disco.
- Devolve `404` se a shell estiver em falta; caso contrário, devolve o ficheiro como
  `text/html; charset=utf-8` com `Cache-Control: no-cache, no-store, must-revalidate` (a shell
  nunca é colocada em cache; os assets referenciados têm hash de conteúdo).
- Os ficheiros reais (o `index.html` da raiz, os assets com hash) são transmitidos mais cedo pelo MelisAssetManager no
  bootstrap, pelo que só as rotas virtuais do lado do cliente (por exemplo, `/melis-react/news/5`) caem aqui.

A rota regex `meliscore-melis-react-spa` (`priority => 1000`) vence a rota catch-all do front do MelisFront.
A sua regex `'/melis-react(?<spa>/[a-zA-Z0-9_\-/~.]*)?'` inclui `~` (separador de id composto) e `.`
para que essas deep links se resolvam para a SPA num recarregamento de página completo.

## Ponto de extensão — o hook `toolpage_extensions`

As particularidades específicas de cada ferramenta residem no módulo **proprietário**, não codificadas de forma rígida aqui. Um módulo regista um
nome de serviço em `config('melis_react_override')['toolpage_extensions'][]` e implementa
`MelisReactOverride\Controller\PluginViewToolPageExtensionInterface`:

```php
interface PluginViewToolPageExtensionInterface
{
    // Adjust the rendered zone HTML for a melisKey before assembly (return $html unchanged
    // for keys the extension doesn't care about).
    public function adjustToolHtml(string $key, string $html, array $jsCallBacks, PluginViewController $controller): string;

    // Adjust the platform asset bundle. Return ['assets' => array, 'skipJsRoots' => array<string, true>];
    // 'skipJsRoots' lists roots the extension already injected so the generic loop must NOT re-add them.
    public function adjustToolAssets(string $key, string $html, array $assets, PluginViewController $controller): array;
}
```

`PluginViewController::toolPageExtensions()` resolve os nomes registados, **ignora silenciosamente**
os nomes que não são serviços registados ou que não implementam a interface (por isso uma extensão é totalmente
opcional — módulo não instalado → sem operação), coloca a lista em cache e chama `adjustToolHtml()` (passo 6)
e `adjustToolAssets()` (passo 8) para cada uma.

> **Porquê um array de configuração e não uma substituição de controlador:** as contribuições de módulos diferentes simplesmente
> acumulam-se independentemente da ordem de carregamento (ao contrário de um alias de controlador, onde só vence o
> último módulo fundido).

**Exemplo de consumidor.** O MelisAICommunityExtensions regista
`MelisAICommunityExtensions\Controller\React\PluginViewToolPageExtension` em
`melis_react_override.toolpage_extensions` para injetar o seu `tool.js` / `style.css` nas páginas de ferramenta legacy
servidas na vista "Old" do React.

## Ficheiros principais

| Aspeto | Caminho |
| --- | --- |
| Rotas, substituição de controlador, `excluded_routes` | `config/module.config.php` |
| Bootstrap do módulo + autoloader | `src/Module.php` |
| Mecanismo de iframe, ações de dashboard, extensões | `src/Controller/PluginViewController.php` |
| Serviço da shell da SPA | `src/Controller/SpaController.php` |
| Contrato de `toolpage_extensions` | `src/Controller/PluginViewToolPageExtensionInterface.php` |
| Construção de assets da plataforma + cache de bundle | `src/Service/PlatformAssetsService.php` |
| CSS do BO legacy delimitado | `src/Service/LegacyWidgetCssService.php` |

Ver também: [melis-core](/legacy/reference/modules/melis-core)

> **Sem interface, sem capturas de ecrã.** O MelisReactOverride é infraestrutura sem interface própria —
> o que aparece no ecrã é a *ferramenta legacy* que ele apresenta ou a *shell React* que ele serve, ambas
> documentadas nos seus próprios módulos.
