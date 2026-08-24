# MelisMarketPlace

> Loja de módulos no back-office para descobrir, transferir, atualizar e remover módulos da Melis Platform,
> agora disponibilizada como um catálogo nativo em React. Pacote `melisplatform/melis-marketplace`.

## Objetivo

O MelisMarketPlace é a loja de módulos do back-office: lista todos os pacotes publicados no servidor
Packagist da Melis, compara cada versão instalada com a versão mais recente publicada e permite a um
administrador transferir, atualizar ou remover módulos — e instalar produtos de site completos — sem sair
do back-office. Recorre ao `MelisComposerService` (melis-composerdeploy) para o trabalho efetivo do
Composer e lê/alterna o estado dos módulos através do `MelisAssetManagerModulesService` (melis-asset-manager).

Seis módulos base — **MelisCore, MelisEngine, MelisFront, MelisAssetManager,
MelisComposerDeploy, MelisDbDeploy** — estão listados como exceções (isentos) e nunca são disponibilizados
para transferência, atualização ou remoção a partir da loja.

No back-office React da v6 (`/melis-react`), a ferramenta disponibiliza um **bloco totalmente nativo em
React**: a lista do catálogo e o detalhe por pacote são desenvolvidos em React e leem um `react-api` JSON
próprio do módulo. O mecanismo de instalação / atualização / remoção (Composer, dbdeploy, plug/unplug)
mantém-se inalterado e continua a ser executado do lado do servidor através do controlador legado.

## Ativação

Adicione ao `config/melis.module.load.php`:

```php
return [
    'MelisMarketPlace',
];
```

Requer `melisplatform/melis-core: ^5.1` e PHP `^8.1|^8.3`. O módulo regista uma flag
`dbdeploy: true` para que qualquer delta de BD que disponibilize seja aplicado no primeiro carregamento. O
bloco React só aparece enquanto o `MelisMarketPlace` estiver presente no `config/melis.module.load.php`.

O endpoint remoto do Packagist é configurado em `config/app.interface.php`, em
`melismarketplace_toolstree_section/datas/melis_packagist_server`
(por predefinição `http://marketplace.melisplatform.com/melis-packagist`).

## Back-office React

**Onde.** Barra lateral esquerda → **Market Place** (ícone de carrinho de compras); abre como um separador de
topo denominado *Market Place*. A `route` do manifesto é `/melis-marketplace` e a `forwardKey`
`MelisMarketPlace/MelisMarketPlace` associa-lhe o nó de menu legado.

**Catálogo (lista).** Uma grelha pesquisável de cartões de módulo (imagem de capa, logótipo do grupo, título,
chip de versão, contagem de transferências e emblemas de Instalado / Atualização disponível ou um botão de
Transferir). Acima da grelha situam-se três **cartões de KPI** (Pacotes / Instalados / Atualizações
disponíveis), uma caixa de pesquisa, um seletor de ordenação (Transferências / Data de adição / Nome), um botão
*Repor filtros*, o **filtro de grupo** (Todos os grupos · Core · Cms · Marketing · Commerce · Sites), um
seletor **Bundles**, um botão de atualização (↻) e o seletor **New / Old**. A grelha carrega mais itens à
medida que percorre a página (scroll infinito). Uma barra lateral direita apresenta "Want your module
listed?" e "Most downloaded packages".

![Catálogo do Market Place em React: cartões de KPI, pesquisa, ordenação, filtros de grupo e a grelha de cartões de módulo com uma barra lateral "Most downloaded packages"](/screenshots/react/melis-marketplace/melismarketplace-tool-list.png)

**Vista de produto (detalhe).** Clicar num cartão abre um detalhe totalmente em React (sem recarregar a
página): um banner de destaque (logótipo do grupo, título, emblemas de estado, botões de ação), uma galeria de
imagens (slider + lightbox em ecrã inteiro), a descrição e um painel de *Additional information* (versão mais
recente, versão atual se instalada, GitHub, Packagist, nome do pacote, transferências). Um botão **← back**
regressa à lista, que permanece montada, pelo que a pesquisa / os filtros / o scroll são preservados. **Não
existem sub-separadores do anfitrião** — a transição lista ⇄ detalhe é um estado interno, pelo que um bloco usa
exatamente um separador do anfitrião.

![Vista de produto em React para um módulo: banner de destaque com emblemas de estado e botões de ação, uma galeria de imagens, descrição e o painel Additional information](/screenshots/react/melis-marketplace/melismarketplace-tool-module-detail.png)

**Seletor New / Old.** A lista pode alternar entre a interface React (*New*, predefinição) e a ferramenta
clássica renderizada num iframe (*Old*, `/melis/react-tool-page?key=melis_market_place_tool_display`). Em
janelas de visualização estreitas, o seletor passa a apenas ícones.

**Os botões de ação** dependem do estado do pacote e das capacidades de quem chama:

| Botão | Apresentado quando | Efeito |
| --- | --- | --- |
| Download | módulo não instalado | obtenção via Composer → dbdeploy → ativação |
| Update | instalado e `need_update` | mesma operação do Composer sobre uma versão em atraso |
| Remove | instalado, não isento | desinstalação (bloqueada se outros módulos dependerem dele) |
| Private | pacote privado/bloqueado | painel de contacto; tem de ser adquirido |

Cada ação abre um modal **Manage** com uma consola de progresso ao vivo que transmite em fluxo a saída do
Composer / dbdeploy e, em seguida, oferece *Activate module* / *Reload*. Se o servidor Packagist estiver
inacessível (`marketAccessible = false`), a interface React desativa a navegação mas mantém a estrutura ativa.

## Bloco React

Bloco totalmente nativo em React construído com Vite (IIFE; React / ReactDOM / react-router-dom externalizados
para as variáveis globais do anfitrião). Fontes em `ui-react/src/`, compiladas para `public/ui-react/brick.js`
ao lado de `brick.manifest.json`.

| Campo do manifesto | Valor |
| --- | --- |
| `id` | `marketplace` (tem de corresponder ao id registado em `brick.tsx`) |
| `route` | `/melis-marketplace` |
| `label` | `Market Place` |
| `forwardKey` | `MelisMarketPlace/MelisMarketPlace` |
| `melisKey` | `melis_market_place_tool_display` |
| `entry` | `brick.js` |
| `persistent` | `true` |
| `subTabs` | *ausente* — lista ⇄ detalhe é um estado interno `openId` |

Como a secção de menu Market Place é um nó diretamente clicável / `is_parent_tool`, a chave portadora de
direitos e a chave de zona do manifesto são a **mesma** (`melis_market_place_tool_display`). O bloco não pode
importar módulos do anfitrião, pelo que utiliza estilos inline + variáveis CSS de tema e um dicionário
`{fr,en}` no próprio ficheiro, comandado pelo idioma do anfitrião (`melis-ui-lang` / `melis-ui-locale` no
`localStorage`). Os cartões e a galeria solicitam primeiro as capturas de ecrã React, com o URL de imagem legado
em `data-legacy`, recorrendo a este em caso de erro.

Ficheiros-chave (`ui-react/src/`): `brick.tsx` (regista `id: 'marketplace'`), `MarketPlacePage.tsx`
(lista + detalhe + modal de gestão), `ViewToggle.tsx` (seletor New/Old), `marketplace-api.ts` (cliente de API
só de leitura) e `shared/useCaps.ts` / `shared/useDebounce.ts` / `shared/useIsNarrow.ts`.

## API React

As rotas **só de leitura** do catálogo são declaradas em `config/module.config.php`, aninhadas sob a rota
`application-MelisMarketPlace` (base `/melis/MelisMarketPlace/react-api`) — **próprias do módulo**, e não sob o
nó partilhado `melis-react-api`. Controlador:
`MelisMarketPlace\Controller\MelisMarketPlaceReactApiController` (alias invocável
`MelisMarketPlace\Controller\MelisMarketPlaceReactApi`). Contrato `{ success, data, error }`; cada
pedido envia `X-Requested-With: XMLHttpRequest` e `credentials: 'include'`.

| Método e URL | Ação | Objetivo |
| --- | --- | --- |
| `GET …/react-api/packages` | `packages` | Lista (`page`, `limit`, `search`, `group`, `orderBy`, `order`, `bundle`) → `{items, page, pageCount, limit, marketAccessible}` |
| `GET …/react-api/packages/:id` | `get` | Detalhe de um pacote (`images`, `currentVersion`, `isExempted`, versionStatus…) |
| `GET …/react-api/groups` | `groups` | Grupos de pacotes → `{groups, marketAccessible}` |
| `GET …/react-api/stats` | `stats` | KPI `{total, installed, needUpdate, marketAccessible}` |
| `GET …/react-api/status` | `status` | Estado de versão por módulo (`need_update` / `up_to_date` / `in_advance`) |

Cada ação de leitura é protegida por `denyUnlessAccess()` — autenticação (`MelisCoreAuth::hasIdentity`) **e**
`MelisCoreRights::canAccess('melis_market_place_tool_display')`, devolvendo **401 / 403** — pelo que a API
JSON não é uma porta das traseiras. O controlador reutiliza o `MelisMarketPlaceService`
(`compareLocalVersionFromRepo`, pré-carregamento da versão mais recente) e o `MelisAssetManagerModulesService`
(versões instaladas / lista de módulos) e lê os endpoints JSON do Packagist, exatamente como a ferramenta
legada.

> **As ações de escrita não têm rota react-api.** Download / Update / Remove são executados nativamente pelo
> `ManageModal`, que reproduz a orquestração JS legada chamando diretamente o controlador **legado** do módulo
> (`/melis/MelisMarketPlace/MelisMarketPlace/…`): `melisMarketPlaceProductDo`
> (consola em fluxo), `reDumpAutoload`, `execDbDeploy`, `plugModule` / `unplugModule`,
> `executeComposerScripts`, `getSetupModuleForm`, `activateModule`, `isPackageDirectoryRemovable`,
> `changePackageDirectoryPermission`, `getModuleTables`, `exportTables`, além de
> `/melis/MelisCore/Modules/getDependents` para a verificação de dependências na remoção.

## Capacidades

Declaradas em `config/react.capabilities.php`, agregadas sob `melisReactToolCapabilities` pelo
`MelisMarketPlace\Module::getConfig()`. Indexadas pela mesma melisKey usada pelo manifesto e pela guarda de
acesso (`melis_market_place_tool_display`), uma vez que a secção é diretamente clicável:

```
melis_market_place_tool_display
└─ actions: list · download · remove
```

`list` = percorrer a grelha; `download` = a obtenção via Composer que tanto instala (Download) como atualiza
(Update); `remove` = desinstalar. Trata-se de **controlo apenas do lado do React** (permitir por predefinição,
declarativo): o controlador impõe apenas o **acesso** (`denyUnlessAccess`), não chama `denyUnlessCan`. No
React, o bloco lê-as através de `useCaps('melis_market_place_tool_display')` — `can('list')` controla a grelha,
`can('download')` os botões Download / Update e `can('remove')` o botão Remove (também oculto para os módulos
isentos).

## Serviços principais

| Alias do serviço | Função |
| --- | --- |
| `MelisMarketPlaceService` | Comparação de versões, plug/unplug e despacho do formulário de pós-configuração por módulo. |
| `MelisMarketPlaceSiteService` | Cria a estrutura de um site completo a partir de um pacote `melisplatform-site`. |

### `MelisMarketPlaceService`

Estende `MelisGeneralService`.

```php
$mp = $serviceManager->get('MelisMarketPlaceService');

// Compare installed vs latest — returns one of the constants below.
$status = $mp->compareLocalVersionFromRepo('MelisCmsSlider', 'v5.1.3');
// MelisMarketPlaceService::NEED_UPDATE  (-1)
// MelisMarketPlaceService::UP_TO_DATE   (1)
// MelisMarketPlaceService::IN_ADVANCE   (2)  — running a dev-… build

// Toggle a module on/off (rewrites the active-module loader via asset-manager).
$mp->plugModule('MelisCmsSlider');
$mp->unplugModule('MelisCmsSlider');
```

O `compareLocalVersionFromRepo()` dispara o par de eventos
`melismarketplace_compare_local_version_from_repo_start` / `…_end` para que os ouvintes possam substituir o
estado calculado.

**Convenção de pós-configuração por módulo.** Um módulo pode disponibilizar um
`MelisSetupPostDownloadController` e/ou um `MelisSetupPostUpdateController` no seu próprio namespace
`Controller\`, expondo `$showOnMarketplacePostSetup = true` e as ações `getFormAction`, `validateFormAction`,
`submitAction`. O MarketPlace encaminha para elas para renderizar e processar o formulário de configuração.

### `MelisMarketPlaceSiteService`

Estende `MelisGeneralService`. Cria a estrutura de um site inteiro a partir de um pacote `melisplatform-site`:
cria as linhas `melis_cms_site` / home / langs, aloca novos intervalos de page-id, platform-id e template-id, e
cria as tabelas CMS do módulo através de `Support\MelisMarketPlaceCmsTables` /
`Support\MelisMarketPlaceSiteInstall`.

```php
$site = $serviceManager->get('MelisMarketPlaceSiteService');
$site->marketplaceInstallSite($request);   // reads POST: name, scheme, domain, module, action
```

Exceções tipadas (em `src/Exception/`): `EmptySiteException`,
`PlatformIdMaxRangeReachedException`, `TemplateIdMaxRangeReachedException`,
`ArrayKeyNotFoundException`, `FileNotFoundException`.

## Ferramenta legada (vista Old)

A ferramenta clássica mantém-se disponível através do seletor New/Old e continua a ser dona do fluxo de
escrita. O `melisMarketPlaceProductDoAction()` é o único endpoint para as ações do catálogo: dispara
`melis_marketplace_product_do_start`, comuta consoante a ação
(`MelisComposerService::DOWNLOAD / UPDATE / REMOVE`) e, em seguida, dispara `melis_marketplace_product_do_finish`
para acionar o feedback do flash-messenger. Antes de remover, percorre as dependências do módulo alvo, as de
todos os outros módulos ativos e o bloco `require` do `composer.json` da raiz do projeto, para impedir a
remoção de uma dependência partilhada.

Duas verificações controlam a usabilidade da loja (ambas no `MelisMarketPlaceController`):

- `isMarketplaceAccessible()` — se o servidor Packagist está acessível e a funcionalidade está ativa.
- `allowUpdate()` — lê `melis_core_platform.plf_update_marketplace` para a plataforma atual
  (variável de ambiente `MELIS_PLATFORM`); uma plataforma com `plf_update_marketplace = 0` pode navegar mas não
  transferir nem atualizar.

O `MelisSetupController` trata da rota autónoma `/MelisMarketPlace/setup` (configuração por módulo fora da
árvore da interface do back-office).

## Eventos

| Evento | Disparado por | Objetivo |
| --- | --- | --- |
| `melismarketplace_compare_local_version_from_repo_start` / `_end` | `compareLocalVersionFromRepo` | Interceta ou substitui o resultado calculado do estado de versão. |
| `melis_marketplace_product_do_start` | `melisMarketPlaceProductDo` | Antes de uma ação de download, atualização ou remoção. |
| `melis_marketplace_product_do_finish` | `melisMarketPlaceProductDo` | Após a ação — aciona o feedback do flash-messenger. |

## Tabelas da base de dados

O MelisMarketPlace não define tabelas próprias. Quando um módulo transferido disponibiliza deltas de base de
dados, estes são aplicados através do `execDbDeployAction()` (melis-dbdeploy). As instalações de produtos de
site escrevem nas tabelas CMS já existentes da plataforma (alocadas através do `MelisMarketPlaceSiteService`).

## Ficheiros-chave

| Área | Caminho |
| --- | --- |
| Manifesto do módulo | `vendor/melisplatform/melis-marketplace/composer.json` |
| Rotas / serviços / react-api / controladores | `vendor/melisplatform/melis-marketplace/config/module.config.php` |
| Capacidades React | `vendor/melisplatform/melis-marketplace/config/react.capabilities.php` |
| Árvore de ferramentas, ícone de cabeçalho, config do Packagist | `vendor/melisplatform/melis-marketplace/config/app.interface.php` |
| Controlador da API React | `vendor/melisplatform/melis-marketplace/src/Controller/MelisMarketPlaceReactApiController.php` |
| Controlador principal (legado) | `vendor/melisplatform/melis-marketplace/src/Controller/MelisMarketPlaceController.php` |
| Serviço de instalação/atualização/plug | `vendor/melisplatform/melis-marketplace/src/Service/MelisMarketPlaceService.php` |
| Serviço de instalação de site | `vendor/melisplatform/melis-marketplace/src/Service/MelisMarketPlaceSiteService.php` |
| Fontes do bloco React | `vendor/melisplatform/melis-marketplace/ui-react/src/` |
| Bloco compilado + manifesto | `vendor/melisplatform/melis-marketplace/public/ui-react/` |
| Exceções | `vendor/melisplatform/melis-marketplace/src/Exception/` |

Ver também: [melis-composerdeploy](/pt/reference/modules/melis-composerdeploy) ·
[melis-asset-manager](/pt/reference/modules/melis-asset-manager) ·
[melis-dbdeploy](/pt/reference/modules/melis-dbdeploy) ·
[melis-core](/pt/reference/modules/melis-core)
