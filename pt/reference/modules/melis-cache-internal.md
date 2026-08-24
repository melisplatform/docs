# MelisCacheInternal

> Cache HTTP de página completa para o front-office do CMS, com cache parcial (por zona) e exclusões por página.
> Pacote `melisplatform/melis-cache-internal`.

## Objetivo

O `MelisCacheInternal` é uma camada de desempenho que se coloca à frente da pipeline de renderização do MelisFront. Armazena o HTML totalmente renderizado (sob a forma de uma Response HTTP serializada) de uma página publicada e serve-o nas visitas subsequentes, ignorando toda a renderização. Plugins individuais de uma página podem ser configurados para se atualizarem com um TTL mais curto (cache parcial/por zona), enquanto o resto da página permanece em cache. As páginas são invalidadas automaticamente ao publicar, despublicar ou eliminar, e é mantido durante três meses um registo de auditoria das limpezas manuais de cache. Este módulo é distinto do cache geral de objetos chave/valor do MelisEngine — trata-se especificamente de um cache HTTP de página completa.

## Ativá-lo

Adicione a `config/melis.module.load.php`:

```php
return [
    'MelisCacheInternal',
];
```

Requer `melisplatform/melis-cms`. O módulo inclui migrações de base de dados (`dbdeploy: true`) que têm de ser aplicadas na primeira instalação. No back-office v6, a ferramenta só aparece quando o módulo está ativado — o host React descobre-a através do respetivo `brick.manifest.json` (ver [Back-office React](#back-office-react)).

## Serviços principais

Registados sob `service_manager` em `config/module.config.php`. Resolva-os com `$sm->get('<alias>')`.

| Alias do serviço | Função |
| --- | --- |
| `MelisCacheInternalService` | Operações de cache de página completa: `getCacheConfig()`, `getPageCacheByPageIdAndType($pageId, $uri, $methodType)`, `getPageCacheByUrl()`, `saveItem()`, `deleteCacheByPageId()`, `deleteCacheByUrl()`, `deleteCacheByPageIdOrByUrl()`, `deleteAllCache()`, `getMelisCacheSize()`, `hasCache()`. Dispara os eventos `melis_cache_internal_*_start`/`_end`. |
| `PartialCachingService` | Gestão do cache parcial/por zona: `getLists()`, `savePartialCaching()`, `deletePartialCaching()`, `getPartialCachingByCode()`, `searchPartialCachingByCode()` e `processedZoneCaching($uri, $response, $pageId, $type)` — o motor de atualização por zona que volta a renderizar apenas as zonas expiradas quando ocorre um acerto de cache. |

O back-office React reutiliza estes mesmos serviços e tabelas, pelo que o percurso React reproduz exatamente o comportamento legacy (a configuração é um upsert singleton, as exclusões são substituídas em bloco, `deleteCacheByUrl` trata do carácter universal `*`/REGEXP).

## Mecanismo do ciclo de pedido

Os listeners são associados por modo de renderização em `Module.php`:

| Listener | Evento | Função |
| --- | --- | --- |
| `MelisCacheInternalPageGetCacheListener` | `MvcEvent::EVENT_DISPATCH` (prioridade 10) | **Servir** — num acerto de cache, devolve a resposta armazenada e interrompe a renderização (adiciona o cabeçalho `Melis-Cache: Hit`). |
| `MelisCacheInternalPageSaveCacheListener` | `MvcEvent::EVENT_FINISH` (prioridade -1001) | **Armazenar** — após a renderização, guarda uma resposta 200 em cache. |
| `MelisCacheInternalViewResultListener` | `melisengine_melistemplating_view_result_plugin_end` | Envolve a saída de cada plugin com metadados de cache parcial (`data-pcache-code`, `data-pcache-gendate`, nome/id/dbkey do plugin). |
| `MelisCacheInternalCmsPageListener` | `meliscms_page_publish_end` / `…_unpublish_end` / `…_delete_end` | **Invalida** o cache da página e persiste a configuração dos plugins parciais na página. |
| `MelisCacheInternalDeleteCacheListener` | `melis_cache_delete_cache` | Invalida a pedido por `pageId` ou `pageUrl`. |
| `MelisCacheInternalSaveEditionSessionListener` | `meliscms_page_savesession_plugin_start` | Guarda na sessão a configuração de cache parcial de um plugin para a publicação. |
| `MelisCacheInternalGetPluginParametersListener` | `melistemplating_plugin_update_parameters` | Injeta as definições de cache parcial no formulário de edição de back-office de um plugin. |
| `MelisCacheInternalPartialCachingFormConfigListener` | `ModuleEvent::EVENT_LOAD_MODULES_POST` | Adiciona o separador do formulário de cache parcial ao modal de cada plugin de front. |
| `MelisCacheInternalFlashMessengerListener` | `meliscacheinternal_save_cache_end` | Flash-messenger e registo de atividade. |

**Chave de cache** = `id da página + URL normalizado + método do pedido` (1 = GET, 2 = POST). URL normalizado significa que os parâmetros de URL listados em `melis_cache_url_parameters` são removidos antes de gerar a chave, de forma a que parâmetros de rastreio como `utm_source` não fragmentem o cache. O valor em cache (`mc_cache_content`) é uma Response HTTP serializada (corpo + cabeçalhos), não um bloco de HTML em bruto. Todos os dispositivos partilham a mesma resposta em cache (assume-se um layout responsivo).

## Cache parcial (por zona)

Uma página totalmente em cache pode manter plugins individuais atualizados com um TTL mais curto:

- O `MelisCacheInternalViewResultListener` envolve a saída de cada plugin com metadados `data-pcache-*` (código de cache e data de geração) no momento da renderização.
- Num **acerto** de cache, o `PartialCachingService::processedZoneCaching()` analisa esses marcadores e, para cada zona cujo TTL tenha expirado, volta a renderizar apenas essa zona. O tipo `PLUGIN` volta a renderizar o plugin de templating; o tipo `MANUAL` reencaminha para um `module/controller/action` configurado.
- Um **código de cache parcial** (`melis_cache_partial_codes`) define o tipo da zona, o código, o TTL (`mcpc_time`) e o alvo MANUAL.
- Uma configuração de **plugin principal** (`melis_cache_partial_general_site_plugins`) é uma base à escala do site que se propaga a todas as páginas; as linhas `_exclusion` excluem um plugin do cache numa dada página.

## Back-office React

Na v6, a ferramenta é fornecida como um **brick nativo totalmente em React** — uma única ferramenta do menu à esquerda (**Melis Cache**) cujos ecrãs são **separadores internos da ferramenta**, e não sub-separadores do host. Encontra-a em **Sidebar → MelisCms → Melis Cache** (`fa fa-bookmark`), montada em `/melis-cms/cache-internal`. O cabeçalho apresenta o subtítulo *"Platform cache management"*, um botão de **atualização** que acompanha o separador ativo, um botão global **Save** e um seletor **New / Old**: *New* é a interface React (predefinição); *Old* apresenta a ferramenta clássica num iframe persistente (`/melis/react-tool-page?key=MelisCacheInternal_tool`).

Os quatro separadores:

| Separador | Conteúdo |
| --- | --- |
| **Properties** | Tamanho total do cache na BD, o seletor *Activate the cache system*, o *cache time in seconds* (TTL), as caixas de verificação de tipo de pedido GET/POST e a árvore de exclusão de páginas (alternar GET/POST por página). Persistido pelo botão global **Save** do cabeçalho. |
| **Partial Caching** | Lista CRUD de códigos de cache parcial com cartões de KPI (Total / Manual / Plugin), pesquisa, gestor de colunas, Export e **+ Add**. Colunas: Id, Partial Caching Code, Type, Module, Controller, Action, Cache lifetime in seconds, Methods. |
| **URL Parameters** | Lista CRUD de nomes de parâmetros de query ignorados na geração da chave de cache (KPI Total, pesquisa, Export, **+ Add**). Adicione, por exemplo, `utm_source` para que as variantes de uma ligação partilhem uma única entrada de cache. |
| **Cache Clearing** | Formulário de limpeza por URL (URL começando por `/`, `*` como carácter universal) mais a tabela de auditoria dos registos de limpeza (cartões de KPI Total / Today / Users; colunas Id, URL Cleared, Date, User; paginação por offset). Mantido durante 3 meses. |

![Separador Properties — tamanho total do cache na BD, o seletor Activate the cache system, cache time in seconds, caixas de verificação de tipo de pedido GET/POST e a árvore de exclusão por página com pills GET/POST](/screenshots/react/melis-cache-internal/meliscacheinternal-tool-cache-tab-properties.png)

![Separador Partial Caching — cartões de KPI (Total / Manual / Plugin), pesquisa, gestor de Colunas, Export e + Add acima da tabela de códigos (Id, Partial Caching Code, Type, Module, Controller, Action, Cache lifetime in seconds, Methods)](/screenshots/react/melis-cache-internal/meliscacheinternal-tool-cache-tab-partialcaching.png)

![Separador URL Parameters — o KPI Total, pesquisa, Export e + Add acima da tabela de parâmetros de query ignorados (Id, Parameter), usada para impedir que os parâmetros de rastreio fragmentem o cache](/screenshots/react/melis-cache-internal/meliscacheinternal-tool-cache-tab-urlparameters.png)

![Separador Cache Clearing — o formulário de limpeza por URL (URL começando por /, * como carácter universal) com cartões de KPI (Total / Today / Users) e a tabela de auditoria dos registos de limpeza (Id, URL Cleared, Date, User) com paginação](/screenshots/react/melis-cache-internal/meliscacheinternal-tool-cache-tab-cacheclearing.png)

Tarefas comuns: ativar o cache / definir o TTL → *Properties → Activate → cache time → marcar GET/POST → Save*; impedir que uma página seja colocada em cache → *Properties → marcar GET/POST para essa página na árvore → Save*; adicionar uma regra parcial → *Partial Caching → + Add*; ignorar um parâmetro de rastreio → *URL Parameters → + Add*; limpar um URL agora → *Cache Clearing → escrever o URL → Clear cache*.

## API React

A interface React comunica com uma API JSON servida pelos **controllers do próprio módulo** (subespaço de nomes `MelisCacheInternal\Controller\React`, registado em `config/module.config.php`) — e **não** por `melis-react-api`. Caminho base `/melis/MelisCacheInternal/react-api`. Cada ação estende `MelisAbstractActionController`, está indexada em `MELIS_KEY = 'MelisCacheInternal_tool'`, protege o acesso através de `denyUnlessAccess()` + `denyUnlessCan()` e devolve `{ success, data, error }`.

| Método e URL (relativo à base) | Objetivo |
| --- | --- |
| `GET /config` | Definições + tamanho do cache + exclusões de páginas |
| `POST /config/save` | Guardar definições (upsert singleton) + substituir em bloco as exclusões de páginas |
| `POST /config/empty-cache` | Esvaziar todo o cache |
| `POST /config/clear-cache` | Limpar por padrão de URL (sem registo) |
| `GET /page-tree?nodeId=` | Árvore de páginas com carregamento diferido para as exclusões (`nodeId=-1` = raiz) |
| `GET /partial-caching` · `/stats` · `/:id` | Lista por keyset · KPI · um código |
| `POST /partial-caching/save` · `/delete/:id` | Criar / atualizar · eliminar um código |
| `GET /url-parameters` · `/stats` · `/:id` | Lista por keyset · KPI · um parâmetro |
| `POST /url-parameters/save` · `/delete/:id` | Criar / atualizar · eliminar |
| `GET /clearing-logs` · `/stats` | Registos paginados por offset · KPI (total / hoje / utilizadores) |
| `POST /clearing-logs/clear-cache` | Limpar por URL **e registá-lo** |

```ts
const BASE = '/melis/MelisCacheInternal/react-api'
// save config + page exclusions (bulk replace)
await apiFetch<null>('/config/save', {
  method: 'POST',
  body: JSON.stringify({ active: true, time: 3600, requestType: ['GET'],
    pageExclusions: [{ pageId: 42, excludeGet: true, excludePost: false }] }),
})
// create a partial-caching code
await apiFetch<{ id: number }>('/partial-caching/save', {
  method: 'POST',
  body: JSON.stringify({ type: 'PLUGIN', code: 'NEWS_LATEST', time: 60,
    module: '', controller: '', action: '', requestGet: true, requestPost: false }),
})
```

Cada fetch envia `X-Requested-With: XMLHttpRequest`; os POST com corpo adicionam `Content-Type: application/json`. Os controllers React reutilizam os serviços e tabelas Laminas do módulo; os controllers legacy continuam a suportar a vista *Old*.

## Capacidades

Os direitos avançados são declarados em `config/react.capabilities.php` sob o nó portador de direitos `MelisCacheInternal_tool` (a mesma `melisKey` do manifesto, do iframe da vista *Old* e do guarda de acesso). É uma árvore por separador; `Capabilities::flatten()` transforma-a em strings com pontos que o React lê através de `useCaps('MelisCacheInternal_tool').can('…')`:

```
MelisCacheInternal_tool
├─ tab "config"   actions: edit                                  (Properties — save settings)
├─ tab "partial"  actions: list · create · edit · delete · export   (Partial Caching CRUD)
├─ tab "params"   actions: list · create · edit · delete · export   (URL Parameters CRUD)
└─ tab "logs"     actions: list · clear · export                 (Cache Clearing — logs + clear by URL)
```

A visibilidade dos separadores é filtrada por `can('config'|'partial'|'params'|'logs')`; as ações são controladas por folha (por exemplo, o botão Save do config por `can('config.edit')`). Cada ação do servidor é protegida duas vezes — `denyUnlessAccess()` (autenticação + `MelisCoreRights::canAccess`) e depois `denyUnlessCan('<leaf>')` — e `Capabilities` é permissivo por predefinição para uma ferramenta/capacidade não declarada.

## Tabelas de base de dados

| Tabela | Contém |
| --- | --- |
| `melis_cache` | Entradas de cache: `mc_page_id`, `mc_cache_url` (normalizado), `mc_cache_content` (Response serializada), `mc_cache_date`, `mc_cache_method_type` (1 GET / 2 POST). |
| `melis_cache_config` | Configuração global: `mcc_active`, `mcc_time` (TTL em segundos), `mcc_request_type` (GET, POST). |
| `melis_cache_exclusions` | Exclusões por página: `mce_page_id`, `mce_request_get`, `mce_request_post`. |
| `melis_cache_partial_codes` | Regras de zona de cache parcial: `mcpc_type` (MANUAL/PLUGIN), `mcpc_code`, `mcpc_time` (TTL), `mcpc_module/controller/action`. |
| `melis_cache_partial_general_site_plugins` | Configurações de plugin principal à escala do site: `mcpg_site_id`, `mcpg_page_id`, `mcpg_plugin_*`, `mcpg_cache_code`. |
| `melis_cache_partial_general_site_plugins_exclusion` | Exclusões de plugin do cache por página. |
| `melis_cache_url_parameters` | Nomes de parâmetros de query ignorados (`mcup_name`). |
| `melis_cache_clearing_logs` | Registo de auditoria: `mccl_cache_url`, `mccl_user_id`, `mccl_clearing_date`. |

## Exemplo

Eliminar o cache de uma página específica por programação:

```php
// In a controller or service with the service manager available
$cacheSrv = $sm->get('MelisCacheInternalService');

// Invalidate by page ID
$cacheSrv->deleteCacheByPageId($pageId);

// Invalidate by URL
$cacheSrv->deleteCacheByUrl('/my-page');

// Check whether a cached entry exists
$hasCache = $cacheSrv->hasCache($pageId, $normalisedUrl, $methodType); // 1=GET, 2=POST
```

## Ficheiros principais

| Assunto | Caminho |
| --- | --- |
| Bootstrap do módulo (ligação dos listeners) | `vendor/melisplatform/melis-cache-internal/src/Module.php` |
| Configuração do módulo (serviços, controllers, aliases de tabela, rotas React) | `vendor/melisplatform/melis-cache-internal/config/module.config.php` |
| Árvore de capacidades React | `vendor/melisplatform/melis-cache-internal/config/react.capabilities.php` |
| Controllers da API React | `vendor/melisplatform/melis-cache-internal/src/Controller/React/` |
| Fonte / build do brick React | `vendor/melisplatform/melis-cache-internal/ui-react/` → `public/ui-react/brick.js` + `brick.manifest.json` |
| Serviço de cache de página completa | `vendor/melisplatform/melis-cache-internal/src/Service/MelisCacheInternalService.php` |
| Serviço de cache parcial/por zona | `vendor/melisplatform/melis-cache-internal/src/Service/PartialCachingService.php` |
| Listener de serviço (acerto de cache) | `vendor/melisplatform/melis-cache-internal/src/Listener/MelisCacheInternalPageGetCacheListener.php` |
| Listener de armazenamento (guardar cache) | `vendor/melisplatform/melis-cache-internal/src/Listener/MelisCacheInternalPageSaveCacheListener.php` |
| Listener de invalidação de página do CMS | `vendor/melisplatform/melis-cache-internal/src/Listener/MelisCacheInternalCmsPageListener.php` |
| Migrações de base de dados | `vendor/melisplatform/melis-cache-internal/install/dbdeploy/` |

## Ver também

- [melis-cms](/pt/reference/modules/melis-cms) — o CMS cujos eventos de publicação desencadeiam a invalidação do cache.
- [melis-front](/pt/reference/modules/melis-front) — a pipeline de renderização que o MelisCacheInternal envolve.
- [melis-engine](/pt/reference/modules/melis-engine) — o cache geral de objetos da plataforma (distinto deste módulo).
- [Referência de módulos](/pt/reference/modules) — todos os módulos da plataforma.
