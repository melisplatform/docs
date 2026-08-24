# Análise aprofundada da arquitetura

Esta página segue um pedido **de ponta a ponta** e nomeia as classes, os eventos e os serviços reais
envolvidos. Complementa os [Conceitos](./concepts): leia-os primeiro para o vocabulário, leia esta
página para compreender a *mecânica*. É também a página a ler se você (ou um assistente de IA) precisar
de um modelo mental completo do funcionamento do Melis.

O Melis **v6** mantém a mesma framework, os mesmos módulos e o mesmo ciclo de vida do pedido que a v5 — o
que mudou foi a **interface do back-office**. As ferramentas clássicas, renderizadas no servidor, em
`/melis` continuam disponíveis, mas a experiência predefinida é agora uma **aplicação de página única em
React em `/melis-react`** que carrega ferramentas nativas em React ("bricks") e recorre às ferramentas
clássicas dentro de um iframe. As secções abaixo mantêm toda a mecânica inalterada e acrescentam a shell
React no local devido.

## Bootstrap

O `public/index.php` carrega o autoloader do Composer, funde o
`config/application.config.php` com o `config/development.config.php` (quando presente) e, em seguida,
executa a aplicação MVC do Laminas.

O `config/application.config.php` constrói a lista de módulos dinamicamente:

```php
'modules' => array_merge(
    MelisCore\MelisModuleManager::getModuleComponents(), // framework components first
    MelisCore\MelisModuleManager::getModules()           // then Melis modules
),
'module_listener_options' => [
    'module_paths'      => ['./module', './module/MelisSites'],
    'config_glob_paths' => [
        realpath(__DIR__) . '/autoload/{{,*.}global,{,*.}local}.php',
        realpath(__DIR__) . '/autoload/platforms/' . getenv('MELIS_PLATFORM') . '.php',
    ],
],
```

O `MelisCore\MelisModuleManager` (`vendor/melisplatform/melis-core/src/MelisModuleManager.php`)
reúne três tipos de módulos consoante o pedido:

- **Componentes** — dependências da framework, declaradas por módulo em `config/module.load.php`.
- **Módulos** — os módulos do back-office de `config/melis.module.load.php`.
- **Módulos de site** — para um URL de front-office, o site selecionado por `MELIS_MODULE`
  (a partir de `module/MelisSites/<name>` ou de um site de vendor como o `MelisDemoCms`).

O back-office React acrescenta dois **módulos de infraestrutura** a esta lista —
[`melis-react-api`](/pt/reference/modules/melis-react-api) (a espinha dorsal da API JSON) e
[`melis-react-override`](/pt/reference/modules/melis-react-override) (a rota da SPA + o mecanismo de
iframe para ferramentas legadas). Ambos são carregados através de `module_paths` no
`application.config.php` (não são autocarregados pelo Composer) e registam-se através do
`StandardAutoloader`.

Por fim, o ficheiro de plataforma `config/autoload/platforms/<MELIS_PLATFORM>.php` injeta a **ligação à
base de dados** e as definições da plataforma na configuração fundida.

## Ciclo de vida do pedido no back-office

Existem agora **duas formas de entrada** no back-office, ambas conduzidas pelo routing e pela
verificação de identidade do MelisCore:

- **`/melis-react…`** — a shell React (a interface predefinida). Uma rota por expressão regular serve um
  único documento HTML; tudo o resto é JSON obtido através de `/melis/react-api/…` e ferramentas
  renderizadas como bricks ou iframes (ver abaixo).
- **`/melis…`** — o back-office clássico, renderizado no servidor, ainda totalmente funcional e usado como
  alvo do iframe para as ferramentas legadas.

Para um URL **`/melis…`**, o MelisCore conduz o fluxo clássico. Os hooks principais são anexados em
`MelisCore\Module::onBootstrap()`:

1. **Routing** — a rota `melis-backoffice` (e as suas filhas: `login`, `authenticate`,
   `logout`, `zoneview`, `react-tool-page`, …) faz correspondência.
2. **`MvcEvent::EVENT_ROUTE` → verificação de identidade** — executa-se `Module::checkIdentity()`. Se a
   rota correspondida não estiver na lista de exclusões (`login`, `authenticate`, `change-language`, a
   SPA React e os seus endpoints de arranque…) e o utilizador não estiver autenticado, **redireciona para
   `/melis/login`** (ou devolve 404 para pedidos não-GET).
3. **Sessão e idioma** — o contentor de sessão `meliscore` é inicializado; o locale
   (`melis-lang-locale`) conduz `Module::createTranslations()`, que carrega
   `language/<locale>.{interface,forms,…}.php`.
4. **`EVENT_DISPATCH`** — o layout é definido como `layout/layoutCore` e executam-se os listeners do
   núcleo: `MelisCoreCheckUserRightsListener` (relê os direitos periodicamente),
   `MelisCoreFlashMessengerListener`, `MelisCorePhpWarningListener` e outros.
5. **Renderização de zonas** — a interface do back-office é uma árvore de **zonas**; o
   `PluginViewController` resolve o `forward` de cada zona (módulo/controlador/ação) e renderiza-a,
   montando o HTML final
   (ver [Conceitos → zonas e forwards](./concepts#_3-zones-forwards-how-the-backoffice-renders)).

```
GET /melis
  → route: melis-backoffice
  → EVENT_ROUTE: checkIdentity() → redirect to /melis/login if not logged in
  → EVENT_DISPATCH: layout = layout/layoutCore; rights/flash/warning listeners
  → PluginViewController renders zones (header, left menu, center, footer) via forwards
  → response
```

## Ciclo de vida do back-office React

Para um URL **`/melis-react…`**, o fluxo divide-se entre um carregamento único da shell e chamadas JSON
subsequentes:

1. **Rota da SPA** — o `MelisReactOverride\Controller\SpaController` serve a shell React
   `index.html` (compilada em `melis-core/public/ui-react/`) para `/melis-react` e para cada deep link
   por baixo dele (`/melis-react/news/5`, …). A rota é **pública** — a aplicação React executa o seu
   **próprio ecrã de login** — e prevalece sobre o catch-all do MelisFront através de uma rota por
   expressão regular de alta prioridade.
2. **Fetches de arranque** — a shell chama os endpoints genéricos do
   [`melis-react-api`](/pt/reference/modules/melis-react-api):
   `GET /me` (utilizador atual + capacidades), `GET /menu` (a árvore de navegação filtrada por direitos),
   `GET /langs` (idiomas do back-office), `GET /assets` (CSS/JS para os iframes das ferramentas) e
   `GET /react-modules` + `/bricks-bundle.js` (descoberta de bricks). Cada resposta segue o contrato
   `{ success, data, error? }`.
3. **Renderização de ferramentas** — clicar numa entrada de menu abre um **brick** (uma ferramenta nativa
   em React) se o seu módulo incluir um, caso contrário abre uma **ferramenta legada num iframe** servida
   por `/melis/react-tool-page?key=<melisKey>` (ver [Bricks e o mecanismo de iframe](#bricks-the-iframe-mechanism)).
4. **Sobreposição do Assistente de IA** — um botão de chat flutuante, renderizado uma única vez na raiz da
   shell (a partir de [`melis-ai`](/pt/reference/modules/melis-ai)), sobrevive à navegação e pode conduzir
   o back-office (abrir uma ferramenta, abrir uma página) a partir da conversa. Ver o
   [guia de IA](./ai).

```
GET /melis-react
  → SpaController serves ui-react/index.html (public route)
  → shell boot: GET /me, /menu, /langs, /assets, /react-modules (+ /bricks-bundle.js)
  → click a tool → React brick, or iframe → /melis/react-tool-page?key=<melisKey>
  → AI Assistant overlay mounted at the shell root
```

## Bricks e o mecanismo de iframe

A shell React é **modular**: uma ferramenta aparece **se e só se** o seu módulo estiver ativo.

- **Descoberta de bricks** — `GET /melis/react-api/react-modules` percorre os módulos ativos à procura de
  `public/ui-react/brick.manifest.json` e devolve os respetivos `BrickDef` (`{ id, module, route, label,
  forwardKey, melisKey, subTabs, … }`), além de um único `/bricks-bundle.js` concatenado. Cada brick é
  uma IIFE que se autorregista em `window.__MELIS_BRICK_COMPONENTS__`; a assinatura `?v=<sig>` torna o
  bundle armazenável em cache com segurança durante um ano.
- **Alternância Novo / Antigo** — a maioria dos bricks traz uma alternância **Novo (React) / Antigo
  (iframe)**. *Novo* é o ecrã React nativo; *Antigo* carrega a ferramenta clássica através do mecanismo de
  iframe abaixo, de modo a que nada se perca durante a migração.
- **Iframe legado** — o `PluginViewController::toolPageAction()` do
  [`melis-react-override`](/pt/reference/modules/melis-react-override) renderiza exatamente uma zona
  (resolvida a partir de `?key=<melisKey>`) como uma **página HTML autónoma** e devolve-a com
  `X-Frame-Options: SAMEORIGIN`. Força `X-Requested-With: XMLHttpRequest` para que as zonas com
  `follow_regular_rendering:false` sejam renderizadas à maneira AJAX, fixa o id de sessão PHP ao longo da
  renderização, injeta os `ressources` JS/CSS do próprio módulo da ferramenta (o `bundle.js` do núcleo
  transporta apenas as ferramentas do MelisCore) e contorna uma longa lista de particularidades legadas
  para que a ferramenta dentro do frame tenha o mesmo aspeto e comportamento que um acesso direto a
  `/melis` (as suas próprias DataTables, modais, toasts do gritter e validação por campo).

A shell serve os assets da plataforma a esses iframes através de
`MelisReactOverride\Service\PlatformAssetsService::build()` — o mesmo CSS/JS que o
`layoutCore.phtml` clássico carrega — para que uma ferramenta legada faça o seu bootstrap de forma
idêntica dentro da shell React.

## Autenticação e direitos

O **login** é tratado pelo `MelisCoreAuth` (`MelisCoreAuthService`), um serviço de autenticação do
Laminas sobre a tabela `melis_core_user` (`usr_login` / `usr_password`, bcrypt via
`password_hash`). A identidade autenticada — incluindo os `usr_rights` do utilizador — é armazenada na
sessão. A shell React conduz a **mesma** autenticação (renderiza o seu próprio ecrã de login, mas envia o
pedido ao mesmo serviço); `GET /me` devolve a identidade quando autenticado, e `GET /langs` e a leitura do
branding do painel de login são os únicos endpoints públicos antes do login.

Os **direitos** controlam o acesso ao back-office. O `MelisCoreRights` (`MelisCoreRightsService`) lê os
`usr_rights` do utilizador — uma **lista de permissões em XML** — para decidir o que é visível e
executável:

- As **secções do menu à esquerda** que um utilizador vê são os nós `*_toolstree_section` listados nos
  seus direitos (`isAccessible()`); um **XML de direitos vazio significa acesso total**. Na shell React, a
  mesma filtragem acontece no servidor em `GET /menu`, que emite apenas os nós que o utilizador pode
  `canAccess`.
- Uma ferramenta para a qual o utilizador não tem direitos produz *"You don't have access to this tool"*.
- Os direitos residem em `melis_core_user.usr_rights`; para utilizadores baseados em papéis podem provir
  do papel (`melis_core_user_role`). O `MelisCoreCheckUserRightsListener` atualiza-os periodicamente e
  termina a sessão do utilizador se `usr_status` se tornar inativo.

**Direitos avançados (capacidades).** O back-office React acrescenta uma camada mais fina *subordinada à*
verificação de acesso à ferramenta: as **capacidades** por ferramenta (`list` / `create` / `edit` /
`delete`, ou separadores aninhados). Os módulos declaram que capacidades existem através de
`config/react.capabilities.php`; o resolver `MelisReactApi\Service\Capabilities` é **de permissão por
predefinição** — uma capacidade só é negada se estiver simultaneamente declarada e presente numa secção
dedicada `<meliscore_tool_capabilities>` do XML de direitos. Os controladores das ferramentas controlam as
suas ações com `CapabilityGuardTrait::denyUnlessCan($cap)` (os administradores são dispensados), e o mesmo
mapa de permissões chega ao cliente em `GET /me` para ocultar a interface. Isto reside no
[`melis-react-api`](/pt/reference/modules/melis-react-api); a lista de negações é editada em
**Users → Rights**.

::: tip Conceder uma nova ferramenta
Depois de adicionar uma ferramenta, conceda acesso através de **Users → Rights** no back-office React (a
sua matriz de direitos avançados é alimentada por `GET /rights/capabilities`), ou injete a secção no XML
de direitos com uma migração — ver `flyway/sql/V3__add_melisai_rights.sql`.
:::

## Ciclo de vida do pedido no front-office

Para um URL público, o **MelisFront** + o **MelisEngine** renderizam uma página do CMS (inalterado na v6):

1. **Routing** — `melis-front` faz correspondência a `…/id/{idpage}`. Os URLs de SEO (`/about-us`) são
   resolvidos para um id de página pelo `MelisFrontSEORouteListener` (que consulta a tabela de SEO das
   páginas e regista uma rota dinâmica no momento do carregamento do módulo).
2. **Dispatch** — os listeners do front selecionam o layout do front e consultam a cache da página.
3. **Carregamento da página** — `MelisEngine\Service\MelisPageService::getDatasPage($idPage, $type)`
   devolve uma `MelisPage` (dados da árvore de páginas + template), em cache sob
   `getDatasPage_{id}_{type}`.
4. **Renderização do template** — o controlador/ação `ZF2` do template renderiza o `.phtml` do módulo de
   site; as zonas `MelisTag` e os plugins `MelisDragDropZone` são preenchidos a partir do conteúdo
   **publicado**.

```
GET /about-us
  → MelisFrontSEORouteListener maps /about-us → idpage=5
  → MelisFront\Controller\Index::index(idpage=5)
  → MelisPageService::getDatasPage(5, 'published')  (cached)
  → template ZF2 controller/action → site .phtml → MelisTag / MelisDragDropZone
  → response
```

> A rota por expressão regular de alta prioridade `/melis-react` prevalece deliberadamente sobre este
> catch-all, para que uma recarga de página completa num deep link React resolva para a SPA em vez de uma
> "404 page not found".

## Caching

O Melis usa cache de forma agressiva através de caches do sistema de ficheiros em `cache/`:

| Cache | Contém |
| --- | --- |
| `meliscore_platform_cache-*` | zonas do back-office renderizadas / configuração da plataforma |
| `meliscms_page-*`, `melisfront_pages_file_cache-*` | páginas do CMS renderizadas |
| `cache/config/` | configuração Laminas fundida (apenas se `config_cache_enabled`) |
| `datasource-*`, `melistoolcreator-*` | caches específicas de módulos |

O `MelisCoreCacheSystemService` é a API de cache (`getCacheByKey`/`setCacheByKey`/
`deleteCacheByPrefix`). As caches são invalidadas em eventos-chave (alterações de módulos, publicação de
páginas, atualizações de direitos) e podem ser limpas manualmente eliminando as pastas `cache/*`
relevantes — ver [Resolução de problemas](./troubleshooting). A camada React acrescenta as suas próprias
caches económicas: o bundle de descoberta é servido como imutável com uma assinatura de conteúdo, e o
`PlatformAssetsService` memoiza o CSS/JS concatenado dos módulos (regenerando `etc/bundles/` se a
ferramenta Modules o tiver apagado).

## Eventos

O Melis é fortemente **orientado por eventos**. Os módulos anexam listeners em `Module::onBootstrap()` (e
através do gestor de eventos partilhado) ao ciclo de vida MVC (`EVENT_ROUTE`, `EVENT_DISPATCH`,
`EVENT_RENDER`, `EVENT_FINISH`) e aos **eventos de domínio do Melis** (por exemplo,
`melis_core_auth_login_ok`, eventos de gravação de páginas). Os serviços de domínio estendem
`MelisGeneralService`, que adiciona `sendEvent()` para que qualquer serviço possa publicar eventos aos
quais outros módulos subscrevem. Este é o mecanismo de extensão principal e desacoplado — prefira um
listener a modificar outro módulo.

A camada React segue a mesma filosofia de "acumular, não sobrepor": em vez de codificar rigidamente as
particularidades por ferramenta, o `melis-react-override` expõe um hook `toolpage_extensions` que qualquer
módulo pode implementar para ajustar o HTML ou os assets de uma ferramenta legada dentro do frame (usado,
por exemplo, pelo [`melis-ai-community-extensions`](/pt/reference/modules/melis-ai-community-extensions)).

## O pedido, numa única imagem

```
public/index.php
  → application.config.php  (MelisModuleManager assembles modules + platform DB config)
  → Laminas MVC run
     ├── /melis-react → SpaController serves the React shell (public)
     │                    → boot JSON: /me /menu /langs /assets /react-modules
     │                    → brick, or iframe → /melis/react-tool-page?key=<melisKey>
     ├── /melis…      → auth (checkIdentity) → rights → PluginViewController zones (forwards)
     └── public URL   → MelisFront route (id/SEO) → MelisEngine page load → site template
  → caching at every expensive step (MelisCoreCacheSystemService)
  → response
```

## Ficheiros-chave

| Aspeto | Caminho |
| --- | --- |
| Configuração da app / bootstrap | `config/application.config.php` |
| Montagem de módulos | `vendor/melisplatform/melis-core/src/MelisModuleManager.php` |
| Bootstrap / listeners do núcleo | `vendor/melisplatform/melis-core/src/Module.php` |
| Autenticação | `vendor/melisplatform/melis-core/src/Service/MelisCoreAuthService.php` |
| Direitos | `vendor/melisplatform/melis-core/src/Service/MelisCoreRightsService.php` |
| Árvore de configuração | `vendor/melisplatform/melis-core/src/Service/MelisCoreConfigService.php` |
| Renderização de zonas | `vendor/melisplatform/melis-core/src/Controller/PluginViewController.php` |
| API de cache | `vendor/melisplatform/melis-core/src/Service/MelisCoreCacheSystemService.php` |
| Routing/SEO do front | `vendor/melisplatform/melis-front/src/Listener/MelisFrontSEORouteListener.php` |
| Serviço de páginas | `vendor/melisplatform/melis-engine/src/Service/MelisPageService.php` |
| API JSON do React | `vendor/melisplatform/melis-react-api/src/Controller/MelisReactApiController.php` |
| Resolver de capacidades | `vendor/melisplatform/melis-react-api/src/Service/Capabilities.php` |
| SPA + iframe legado | `vendor/melisplatform/melis-react-override/src/Controller/` |
| Shell React (fonte da SPA) | `vendor/melisplatform/melis-core/ui-react/` |
