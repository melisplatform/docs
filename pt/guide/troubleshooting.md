# Resolução de problemas e operações

Um guia prático para os problemas que irá realmente encontrar, com a causa e a solução. Quando algo
"não aparece", a resposta é quase sempre **módulos / permissões / cache**.

Na v6 o back-office é a **shell React em `/melis-react`**, mas a framework, os módulos e a
configuração subjacentes permanecem inalterados — por isso a maioria das correções aqui continua a ser
do lado do servidor. Quando uma ferramenta não tem uma página React nativa, a shell renderiza a
ferramenta clássica dentro de um iframe
(`/melis/react-tool-page?key=<melisKey>`), e as ferramentas "brick" em React nativo dispõem de um
alternador **New (React) / Old (iframe)** para esse mesmo ecrã clássico. Saber que camada está a
observar é, muitas vezes, o primeiro passo de diagnóstico.

## Active os erros primeiro

Por predefinição, o Melis é discreto quanto aos erros. Ative o **modo de desenvolvimento** para os ver:

```bash
vendor/bin/laminas-development-mode enable     # status | enable | disable
```

Isto carrega `config/development.config.php`, desativa as caches de configuração/módulos e define
`error_reporting(E_ALL)`. Os avisos do PHP também são expostos pelo
`MelisCorePhpWarningListener`. O reporte/apresentação de erros pode adicionalmente ser controlado pela
configuração do Melis em `/meliscore/datas/errors`.

Tenha em conta que os endpoints da API React respondem em JSON, não em HTML: uma chamada de boot com
falha devolve `{ success: false, error: … }` (por exemplo `{ success:false, error:'Unauthenticated' }`
com HTTP 401), pelo que deve consultar o separador de rede e não apenas a página. Uma ferramenta
legacy dentro do iframe continua a mostrar os seus próprios erros nativos (toasts do gritter, modais
de validação por campo) exatamente como em `/melis`.

::: warning Página em branco, HTTP 200, sem erro?
O Melis utiliza buffering de saída; um erro fatal durante o bootstrap/render pode produzir um
**200 vazio**. Para ver a exceção engolida, anexe temporariamente um listener a
`MvcEvent::EVENT_DISPATCH_ERROR` / `EVENT_RENDER_ERROR` em `public/index.php` (envolva
`Application::init()` num try/catch e imprima o parâmetro `exception`), ou ative o modo de
desenvolvimento.
:::

## Cache

A cache desatualizada é a causa nº 1 de "alterei a configuração mas nada mudou". As caches encontram-se
em `cache/`:

```
cache/meliscore_platform_cache-*   # zonas do backoffice / configuração da plataforma
cache/meliscms_page-*              # páginas CMS renderizadas
cache/config/                      # configuração Laminas fundida (se ativada)
```

Limpe-as apagando as pastas relevantes, ou através da API
`MelisCoreCacheSystemService::deleteCacheByPrefix('*', 'meliscore_platform_cache')`. O Melis também
limpa as caches automaticamente em alterações de gestão de módulos e de permissões. Depois de editar
`config/melis.module.load.php` ou qualquer `app.*.php`, **limpe `cache/melis*` e recarregue**.

A partir do back-office pode limpar as caches na ferramenta **Cache** (o seu ecrã React contém os
mesmos separadores que a ferramenta clássica). Consulte [MelisCacheInternal](/pt/reference/modules/melis-cache-internal).

A shell React tem a sua própria camada de cache a ter em conta quando as coisas parecem desatualizadas:

- O **bundle de bricks** concatenado (`/melis/react-api/bricks-bundle.js?v=<sig>`) é servido como
  imutável durante 1 ano; a sua assinatura `?v=` (nome+mtime+tamanho de cada brick) muda
  automaticamente quando os ficheiros de um brick mudam, pelo que uma **atualização forçada (hard
  refresh)** obtém o novo bundle.
- A **shell SPA** (`index.html`) é servida com `no-cache`, mas os recursos JS/CSS com hash que
  referencia têm hash de conteúdo e são colocados em cache — mais uma vez, uma atualização forçada é a
  cura.
- Se um iframe de ferramenta carregar com estilos quebrados ou uma DataTable vazia após uma alteração
  em **Modules**, os bundles de recursos da plataforma em `etc/bundles/` podem ter sido apagados;
  regeneram-se por si próprios (na próxima renderização da página de ferramenta), mas pode forçá-lo
  recarregando a ferramenta.

## Armadilhas comuns

### Um módulo não aparece
| Causa | Solução |
| --- | --- |
| Não está na lista de carregamento | Adicione-o a `config/melis.module.load.php`. |
| Cache desatualizada | Limpe `cache/melis*` e recarregue. |
| Caminho não mapeado | Garanta que consta no `config/melis.modules.path.php` gerado (regenerado pelo `MelisAssetManager`). |

### Uma ferramenta existe mas não está no menu esquerdo / "You don't have access to this tool"
O menu esquerdo do React (`GET /melis/react-api/menu`) é a árvore de navegação **filtrada por
permissões** — a mesma allow-list XML `melis_core_user.usr_rights` de antes, apenas consumida pela
shell.

| Causa | Solução |
| --- | --- |
| O utilizador não tem permissões | Conceda a `*_toolstree_section` da ferramenta em **Users → Rights**, ou através de uma migração (ver `flyway/sql/V3__add_melisai_rights.sql`). |
| Permissões em cache na sessão | As permissões são carregadas no login e atualizadas periodicamente pelo `MelisCoreCheckUserRightsListener` — **termine a sessão / volte a entrar** depois de as alterar. |
| Utilizador inativo | `usr_status` tem de ser `1`. |
| Módulo do brick inativo | Uma ferramenta em React nativo (brick) aparece **se e só se** o seu módulo estiver ativo — a shell descobre os bricks via `GET /melis/react-api/react-modules`. Ative o módulo. |

> Um `usr_rights` **vazio** significa acesso total (`isAccessible()` devolve true quando vazio) — mas
> para um utilizador normal com uma allow-list explícita, uma secção em falta fica oculta.

### O botão/separador de uma ferramenta está proibido mesmo podendo abrir a ferramenta (HTTP 403)
A v6 acrescenta **permissões avançadas** ("capabilities") *dentro* de uma ferramenta já autorizada — as
checkboxes granulares de List / Create / Edit / Delete / por separador em **Users → Rights**.

| Causa | Solução |
| --- | --- |
| Capability negada | O controlador da ferramenta chamou `denyUnlessCan(<cap>)` e o seu XML de permissões nega essa capability. Retire a negação em **Users → Rights** (matriz de permissões avançadas). |
| Em cache na sessão | As capabilities chegam na chamada de boot `GET /melis/react-api/me` (`data.capabilities`) — **termine a sessão / volte a entrar** depois de editar as permissões. |

> As capabilities são **permitidas por predefinição**: uma ferramenta sem declaração, ou uma cap que
> não seja negada, permanece totalmente utilizável; os **administradores contornam-nas** por completo.
> As negações vivem numa secção dedicada `<meliscore_tool_capabilities>` do XML de permissões, pelo que
> não afetam o BO clássico.

### Uma ferramenta legacy carrega vazia / os seus botões não fazem nada dentro da shell React
Quando uma ferramenta não tem uma página React nativa, renderiza num iframe via
`/melis/react-tool-page?key=<melisKey>`. Uma DataTable vazia ou um botão inerte aí é quase sempre um
**recurso de módulo em falta** (o seu próprio `*.tool.js`/CSS não injetado).

| Causa | Solução |
| --- | --- |
| Recurso do módulo não carregado | A página de ferramenta injeta os `ressources` de cada módulo; um separador/botão recém-contribuído que traga JS que a página desconhece precisa que a raiz do seu plugin seja registada (ou um hook `toolpage_extensions` — ver [Criar uma ferramenta](/pt/guide/create-a-tool)). |
| Comparar com `/melis` | Abra a mesma ferramenta diretamente em `/melis` (ou através do alternador **Old** da ferramenta). Se também estiver quebrada aí, o problema está na própria ferramenta e não no frame React. |

### Erros de ligação à base de dados
| Causa | Solução |
| --- | --- |
| Ficheiro de plataforma em falta | `config/autoload/platforms/<MELIS_PLATFORM>.php` tem de existir e corresponder à variável de ambiente `MELIS_PLATFORM`. |
| Credenciais erradas | Verifique as variáveis de ambiente `MYSQL_*` consumidas pelo ficheiro de plataforma. |

### Recursos (CSS/JS) devolvem 404
| Causa | Solução |
| --- | --- |
| Módulo não mapeado | Verifique `config/melis.modules.path.php`. |
| Bundles não construídos | Reconstrua os recursos (build Webpack / `vendor/bin/phing`). |
| Folha de estilos respondida como HTML | Uma sessão expirada costumava redirecionar um pedido de bundle para a página de login HTML (o browser rejeita o MIME); a v6 serve o bundle da plataforma em `/melis/react-platform-bundle` com o tipo correto e mantém-no público — uma atualização forçada limpa a rejeição desatualizada. |

### As traduções mostram a chave `tr_…` em bruto
| Causa | Solução |
| --- | --- |
| Locale não definido | O locale ativo vem da sessão (`melis-lang-locale`); o seletor de idioma do cabeçalho React escreve-o (`GET /melis/react-api/langs`). |
| Ficheiro em falta | Adicione `language/<locale>.interface.php`; `en_EN` é o fallback. |

## Esquema da base de dados (dbdeploy & flyway)

- O **dbdeploy** ([MelisDbDeploy](/pt/reference/modules/melis-dbdeploy)) corre no `composer update`
  (hook post-update) para aplicar os deltas SQL numerados de cada módulo, registados na tabela `changelog`.
- O **flyway** ([MelisFlyway](/pt/reference/modules/melis-flyway)) aplica as migrações do projeto em
  `flyway/sql/` (`flyway -configFiles=flyway/conf/flyway.conf migrate`).

## Ferramentas de CLI e de build

```bash
vendor/bin/laminas-development-mode {status|enable|disable}   # modo dev
flyway -configFiles=flyway/conf/flyway.conf {migrate|info|repair}   # migrações da BD
vendor/bin/phing                                             # construir recursos/bundles
```

O `composer update` aciona os hooks do Melis (deploy de módulos + dbdeploy) através do
`post-update-cmd` do `composer.json`.

## Onde procurar

| Assunto | Caminho |
| --- | --- |
| Template do modo dev | `config/development.config.php.dist` |
| API de cache | `vendor/melisplatform/melis-core/src/Service/MelisCoreCacheSystemService.php` |
| Atualização de permissões | `vendor/melisplatform/melis-core/src/Listener/MelisCoreCheckUserRightsListener.php` |
| Avisos do PHP | `vendor/melisplatform/melis-core/src/Listener/MelisCorePhpWarningListener.php` |
| Assemblagem de módulos | `vendor/melisplatform/melis-core/src/MelisModuleManager.php` |
| API React (menu / me / capabilities) | `vendor/melisplatform/melis-react-api/src/Controller/MelisReactApiController.php` |
| Shell React / páginas de ferramenta em iframe | `vendor/melisplatform/melis-react-override/src/Controller/PluginViewController.php` |
| Configuração do Flyway | `flyway/conf/flyway.conf`, migrações em `flyway/sql/` |
