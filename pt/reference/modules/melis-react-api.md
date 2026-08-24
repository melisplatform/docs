# MelisReactApi

> Espinha dorsal da API JSON do back-office React (`/melis-react`): arranca a shell, serve dados de menu/utilizador/assets/discovery/dashboard e aloja o resolvedor de capacidades. Pacote `melisplatform/melis-react-api`.

## Objetivo

O MelisReactApi é **infraestrutura, não uma ferramenta**. Não desenha qualquer interface, não distribui nenhum brick e não acrescenta nenhuma entrada na barra lateral. Expõe os endpoints JSON genéricos `/melis/react-api/…` que a shell React (servida pelo MelisReactOverride em `/melis-react`) invoca no arranque e na navegação, e aloja o **resolvedor de capacidades** (`Capabilities` + `CapabilityGuardTrait`) que os controladores de ferramentas de cada módulo reutilizam para condicionar os seus "direitos avançados".

Tudo o que a shell mostra e que não seja o ecrã próprio de uma ferramenta específica provém daqui: o menu esquerdo (filtrado por direitos), o utilizador/avatar do cabeçalho e o seletor de idioma, os mosaicos e KPIs do dashboard, a descoberta modular de bricks e a matriz de direitos avançados em Utilizadores → Direitos. Os endpoints próprios de cada ferramenta, as rotas e as declarações de capacidades residem nos **seus próprios** módulos (por exemplo, `/users`, `/roles` são declarados em MelisCore / MelisSmallBusiness), não aqui.

**Não existem ecrãs React nem capturas de ecrã** para este módulo — as secções abaixo descrevem o contrato da API a utilizar ao comunicar com o back-office React.

## Ativá-lo

O MelisReactApi é um módulo central do back-office React. **Não** é instalado via composer no volume vendor do Docker; é carregado através de `config/application.config.php` `module_paths` (branch `melis-react`), e `src/Module.php` faz o autoload das suas classes via `StandardAutoloader`. Emparelha com o **MelisReactOverride** (o mecanismo de iframe/ferramenta + a rota da shell SPA) e com o **melis-core/ui-react** (a aplicação React que consome esta API — ver os seus clientes `src/lib/*-api.ts`).

Declara as suas rotas diretamente em `config/module.config.php` (sem `config/react-api.php`) e não declara nenhuma capacidade própria (é o motor que *lê* as declarações dos outros módulos).

## Presença React num relance

| Propriedade | Valor |
| --- | --- |
| Brick / manifesto | **nenhum** — não distribui `public/ui-react/brick.manifest.json` |
| Fonte `ui-react/` | **nenhuma** — sem projeto Vite, sem componentes React |
| Controlador | `MelisReactApi\Controller\MelisReactApiController` (alias invocável `MelisReactApi\Controller\MelisReactApi`) |
| Rota base | `melis-backoffice` → `react-api` (ou seja, `/melis/react-api/…`) |
| Autenticação | `isAuthenticated()` (MelisCoreAuth) por ação, **exceto** `/langs` (público, carregado no ecrã de login) |
| Contrato de resposta | `{ success: bool, data: T, error?: string }` (JSON puro, sem layout) |

Cada ação devolve uma `Response` JSON pura através do `jsonResponse()` herdado, pelo que o Laminas nunca envolve nenhum layout à volta dela. As ações de leitura chamam `releaseSessionLock()` cedo para que os pedidos de arranque concorrentes que partilham o cookie de sessão não sejam serializados.

## Endpoints genéricos

Todos sob `/melis/react-api/…`. Doze endpoints genéricos, todos mapeados para `MelisReactApiController`. Cada resposta é `{ success, data, error? }` (401 quando a verificação `isAuthenticated()` falha, exceto `/langs`).

| Método + caminho | Ação | Forma de `data` |
| --- | --- | --- |
| `GET /me` | `meAction` | `{ id, name, login, email, picture, isAdmin, capabilities }` — `capabilities` = mapa `melisKey → string[]` das capacidades permitidas (admin ⇒ tudo). |
| `GET /menu` | `menuAction` | `NavNode[]` — a árvore de navegação filtrada por direitos. `?full=1` devolve a árvore **não filtrada** (apenas o editor de direitos; requer `canAccess('meliscore_tool_user')`). |
| `GET /langs` | `langsAction` | `{ current: { id, locale }, langs: [{ id, locale, short, label }] }` — **público**. |
| `GET /assets` | `assetsAction` | URLs de CSS/JS + globais JS inline para o bootstrap dos iframes de ferramentas (delega em `MelisReactOverride\Service\PlatformAssetsService::build()`). |
| `GET /react-modules` | `reactModulesAction` | `{ data: BrickDef[], bundle: { url } }` — bricks dos módulos ativos; `bundle.url` = o JS concatenado. |
| `GET /bricks-bundle.js` | `bricksBundleAction` | **não é JSON** — a IIFE de cada brick ativo concatenada numa única resposta JavaScript com cache imutável. |
| `GET /dashboard/bubbles` | `dashboardBubblesAction` | contagens `{ news, updates, notifications:{count,items}, messages }` (degradam para 0, nunca 404). |
| `GET /dashboard/stats` | `dashboardStatsAction` | `{ kpis:{ users, sites, pages, languages }, activity:[{ id, name, loginDate }] }`. |
| `GET /dashboard/legacy-plugins` | `legacyDashboardPluginsAction` | `[{ pluginName, title, icon, section, w, h }]` — plugins de dashboard legados como widgets em iframe. |
| `GET \| POST /dashboard/layout` | `dashboardLayoutAction` | GET → mosaicos guardados `[{ pluginName, pluginId, x, y, w, h }]`; POST → o mesmo JSON, guardado em `melis_core_dashboards`. |
| `GET /rights/dashboard-plugins` | `rightsDashboardPluginsAction` | `[{ key, title, module }]` — lista autoritativa de plugins de dashboard para o editor de direitos (`?userId=`). |
| `GET /rights/capabilities` | `rightsCapabilitiesAction` | mapa `melisKey → árvore de capacidades` **declarada** pelos módulos, com as etiquetas `tr_*` traduzidas para o locale da sessão. |

**Conjunto de arranque:** `/me`, `/menu`, `/langs`, `/assets`, `/react-modules` (+ `/bricks-bundle.js`). Os endpoints `/dashboard/*` e `/rights/*` suportam o dashboard e o editor de Utilizadores → Direitos.

Os endpoints de dados próprios de uma ferramenta **não** estão aqui: `/melis/react-api/users…`, `/users/stats`, `/roles` são declarados em **MelisCore**; `/roles-list`, `/roles/save|stats|:id`, `/workflow/roles` em **MelisSmallBusiness**; as rotas de IA em **MelisAI**. Os clientes que invocam este conjunto genérico residem em `melis-core/ui-react/src/lib/melis-api.ts`.

Exemplo real de fetch — a chamada de arranque `/me` da shell:

```ts
// mirrors melis-core/ui-react/src/lib/melis-api.ts
const res = await fetch('/melis/react-api/me', {
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
  credentials: 'include',
})
const json = await res.json()                    // { success, data, error? }
if (!json.success) throw new Error(json.error)   // 401 → { success:false, error:'Unauthenticated' }
const { name, isAdmin, capabilities } = json.data
// capabilities: Record<melisKey, string[]>
// e.g. { melis_core_announcement_tool: ['list','create','edit'] }
```

## Capabilities — o resolvedor

Esta é a substância que o MelisReactApi fornece aos *outros* módulos: o sistema de "direitos avançados" que condiciona os **componentes internos** de uma ferramenta já autorizada (list / create / edit / delete / separadores aninhados), *subordinado à* verificação de acesso à ferramenta (`MelisCoreRights::canAccess`, inalterada).

**Declaração (em cada módulo, não aqui).** Um módulo declara, por `melisKey` de ferramenta, as capacidades existentes através da chave de configuração fundida `melisReactToolCapabilities` (`config/react.capabilities.php`, fundida no seu `Module::getConfig()`):

```php
// <module>/config/react.capabilities.php  (declared BY the tool's module)
return [
  'melisReactToolCapabilities' => [
    'melis_core_announcement_tool' => ['list', 'create', 'edit', 'delete'],
    // or a TREE for nested tabs with their own actions:
    // 'some_tool' => ['actions' => ['list'], 'tabs' => [['key' => 'variants', 'actions' => ['list','create']]]],
  ],
];
```

**Resolvedor — `MelisReactApi\Service\Capabilities`** (tudo estático; `const CONFIG_KEY = 'melisReactToolCapabilities'`, `const SECTION = 'meliscore_tool_capabilities'`):

| Método | Papel |
| --- | --- |
| `declared($appConfig)` | O mapa declarado em bruto (que o editor de direitos renderiza). |
| `flatten($node)` | Achata uma lista plana OU uma árvore `{ actions, tabs }` em strings com pontos (por exemplo, `variants.list`). |
| `deniedFor($rightsXml, $toolKey)` | A lista de negação lida do XML de direitos do utilizador/papel. |
| `isAllowed($appConfig, $rightsXml, $toolKey, $cap)` | **Permitir por omissão** — permitido a menos que a capacidade esteja simultaneamente declarada *e* na lista de negação. |
| `allowedForUser($appConfig, $rightsXml)` | O mapa `melisKey → allowedCaps[]` devolvido em `/me` (`$rightsXml = null`, por exemplo admin ⇒ tudo). |

**Armazenamento.** As negações residem numa secção dedicada do XML de direitos do utilizador/papel, separada da lista de negação legada para que o BO clássico a ignore:

```xml
<meliscore_tool_capabilities>
  <tool key="melis_core_announcement_tool"><deny>delete</deny></tool>
</meliscore_tool_capabilities>
```

A preservação desta secção numa gravação **legada** é feita pelos módulos em causa (MelisCore para o UTILIZADOR, MelisSmallBusiness para o PAPEL).

**Guarda — `MelisReactApi\Controller\CapabilityGuardTrait`.** Um controlador de ferramenta de um módulo faz `use` deste trait, define `const MELIS_KEY = '<the tool's melisKey>'` e chama `denyUnlessCan($cap)` **depois** da sua verificação de acesso à ferramenta:

```php
use MelisReactApi\Controller\CapabilityGuardTrait;

class MelisReactApiFooController extends MelisAbstractActionController
{
    use CapabilityGuardTrait;
    const MELIS_KEY = 'melis_core_announcement_tool'; // the rights-bearing tool node

    public function saveAction()
    {
        if ($resp = $this->denyUnlessCan('edit')) return $resp;   // 403 JSON if denied
        // …call the module's Laminas service…
    }
}
```

`denyUnlessCan` lê os direitos **efetivos** (`MelisCoreAuth::getAuthRights()` → utilizador OU papel), os **admins são ignorados** e opera em modo **permitir por omissão** — uma ferramenta sem declaração mantém o CRUD completo. Do lado do cliente, o mesmo mapa de permissões chega em `/me` `data.capabilities` e condiciona a interface (`melis-core/ui-react/src/lib/caps.ts`).

## Integração com o host

- **Descoberta / bricks** — `GET /react-modules` varre os módulos **ativos** em busca de `public/ui-react/brick.manifest.json` (um único objeto ou um array `bricks: [...]`) e devolve `BrickDef = { id, module, route, label, forwardKey, melisKey, subTabs, persistent, bundleUrl }`, além de `bundle.url = /melis/react-api/bricks-bundle.js?v=<sig>`. A shell carrega o bundle único concatenado (cada brick é uma IIFE que se autorregista pelo id em `window.__MELIS_BRICK_COMPONENTS__` via `window.__melisRegisterBrick`, dentro de um try/catch). A assinatura `?v=` (nome+mtime+tamanho de cada bundle) torna segura uma cache imutável de 1 ano. Um brick existe **se e só se** o seu módulo estiver ativo — a regra da modularidade.
- **Construtor do menu (`GET /menu`)** — percorre a interface do menu esquerdo, aplica a ordenação de secções/ferramentas e emite `NavNode[]`, onde cada nó é `{ key, name, icon, melisKey, isTool, forward, hasNavChild, configChildCount, children }`. Uma **secção** de topo é um contentor (podado apenas se estiver vazio); uma secção clicável `is_parent_tool` é condicionada por `canAccess(target)`; secções desconhecidas recém-instaladas usam direitos permissivos para permanecerem visíveis. Dois hooks estendem-no: `melisReactSidebarHostSections` (manter uma secção vazia como um mero contentor host da barra lateral que transporta `sidebarModule`) e `melisReactRightsTools` (injetar nós de ferramenta sintéticos apenas de direitos, só com `?full=1`).
- **Ponte de autenticação / assets** — `/assets` devolve o mesmo CSS/JS que o `layoutCore.phtml` legado carrega (delegado em `MelisReactOverride\Service\PlatformAssetsService`), para que os iframes das ferramentas façam bootstrap de forma idêntica dentro da shell React.
- **i18n** — as etiquetas `tr_*` (nomes de secção do menu, etiquetas de separador de capacidades) são traduzidas para o locale da sessão atual (contentor `meliscore` `melis-lang-locale`) via `MelisCoreTranslation`; os módulos declaram **chaves**, nunca texto hard-coded.

## Ficheiros-chave

| Assunto | Caminho |
| --- | --- |
| Manifesto do módulo / autoloader | `melis-react-api/src/Module.php` |
| Rotas + controlador invocável | `melis-react-api/config/module.config.php` |
| Ações genéricas (12) | `melis-react-api/src/Controller/MelisReactApiController.php` |
| Trait de guarda de capacidades | `melis-react-api/src/Controller/CapabilityGuardTrait.php` |
| Resolvedor de capacidades | `melis-react-api/src/Service/Capabilities.php` |

Ver também: [melis-core](/pt/reference/modules/melis-core) ·
[melis-small-business](/pt/reference/modules/melis-small-business) ·
[melis-ai](/pt/reference/modules/melis-ai)
