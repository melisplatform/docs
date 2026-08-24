# Referência de configuração

Tudo o que pode configurar no Melis, num único local: variáveis de ambiente, o ficheiro de
plataforma, a família de configuração `app.*.php`, chaves melis, traduções, assets e caches.

## Variáveis de ambiente

Duas variáveis regem cada instalação (definidas em `docker-compose.yml`, ou através de `SetEnv` do
Apache):

| Variável | Finalidade |
| --- | --- |
| **`MELIS_PLATFORM`** | Seleciona a configuração de plataforma `config/autoload/platforms/<MELIS_PLATFORM>.php` (a ligação à BD). Por exemplo, `local`, `dev1`. |
| **`MELIS_MODULE`** | O **módulo de site** servido como front office para este domínio (por exemplo, `MelisDemoCms`). |
| `MYSQL_HOSTNAME` / `MYSQL_DATABASE` / `MYSQL_USER` / `MYSQL_PASSWORD` | Ligação à BD, normalmente lida pelo ficheiro de plataforma através de `getenv()`. |

## O ficheiro de plataforma

`config/autoload/platforms/<MELIS_PLATFORM>.php` contém a **ligação à base de dados** (e algumas
definições de host). É fundido em último lugar, pelo que sobrepõe as predefinições por ambiente:

```php
return [
    'db' => [
        'driver'   => 'Mysqli',
        'hostname' => getenv('MYSQL_HOSTNAME') ?: 'localhost',
        'database' => getenv('MYSQL_DATABASE'),
        'username' => getenv('MYSQL_USER'),
        'password' => getenv('MYSQL_PASSWORD'),
        'port'     => '3306',
        'charset'  => 'utf8mb4',
    ],
    'melis_platform'       => getenv('MELIS_PLATFORM'),
    'melis_http_host'      => 'localhost',
    'melis_request_scheme' => 'http',
];
```

O ficheiro carregado é escolhido em `config/application.config.php` (`config_glob_paths`) a partir de
`getenv('MELIS_PLATFORM')`.

## Ficheiros de configuração do projeto

| Ficheiro | Função |
| --- | --- |
| `config/melis.module.load.php` | A lista ordenada de **módulos de backoffice** a carregar. |
| `config/melis.modules.path.php` | Mapa gerado: nome do módulo → caminho no sistema de ficheiros (construído por `MelisAssetManager`). |
| `config/application.config.php` | Ponto de entrada da aplicação: montagem de módulos, caminhos glob, flags de cache. |
| `config/autoload/{global,local}.php` | Configuração de autoload padrão do Laminas. |
| `config/autoload/platforms/<env>.php` | Configuração de BD/plataforma por ambiente (acima). |
| `config/development.config.php` | Sobreposições de desenvolvimento (criado por `laminas-development-mode enable`). |

## A família de configuração `app.*.php`

Cada módulo de backoffice funde estes ficheiros específicos do Melis em `Module::getConfig()`. Todos
constroem uma única árvore sob uma raiz `plugins`, consultável através de [`MelisCoreConfig`](/pt/guide/concepts#_2-the-config-tree-melis-keys):

| Ficheiro | Declara |
| --- | --- |
| `app.interface.php` | **Zonas** da UI e o respetivo `forward` (módulo/controlador/ação). Cada nó: `conf` (id, name, icon, `melisKey`, `rightsDisplay`), `forward`, `interface` aninhado. |
| `app.toolstree.php` | Onde uma ferramenta se liga no **menu esquerdo** (`*_toolstree_section`). |
| `app.tools.php` | **Ferramentas**: tabelas de dados (colunas, filtros, botões de ação), formulários. |
| `app.forms.php` | Definições de **formulário** reutilizáveis (spec de formulário Laminas + `input_filter`). |
| `app.emails.php` | Configurações de modelos de email. |
| `app.microservice.php` | APIs de métodos de serviço invocáveis (formulários de entrada/saída). |
| `excluded.routes.php` | Rotas que ignoram a verificação de autenticação. |

### Convenções

- **Chaves de tradução**: `tr_<module>_<section>_<item>` (por exemplo, `tr_meliscore_tool_users`).
- **Ids de configuração**: `id_<module>_<item>`.
- **Chaves melis**: aliases curtos declarados como `'conf' => ['melisKey' => '…']` → resolvidos para
  caminhos de configuração completos por `MelisCoreConfig::getMelisKeys()`.
- **Tabelas**: `melis_<area>_<entity>` (por exemplo, `melis_core_user`, `melis_cms_page_published`,
  `melis_ecom_product`).
- **Rotas**: `<module-slug>/<name>` (por exemplo, `melis-backoffice/login`).

## Traduções

Arrays PHP por locale sob a pasta `language/` de cada módulo:

```
language/en_EN.interface.php
language/fr_FR.interface.php   // 'tr_key' => 'Texte'
```

Carregados por `Module::createTranslations()` para o locale ativo (sessão `melis-lang-locale`), com
`en_EN` como recurso alternativo. Os tipos incluem `interface`, `forms`, `install`, `setup`.

## Assets

O `MelisAssetManager` serve a pasta `public/` de cada módulo em `/<ModuleName>/…` e gera
`config/melis.modules.path.php`. Um **módulo de site** lista o seu CSS/JS de front office em
`config/assets.config.php`. O bundling com Webpack está disponível (ferramenta de build / ação de
backoffice).

## Caches

O comportamento da cache é configurado no `module.config.php` do `melis-core` (a secção `caches`) e
utilizado através de `MelisCoreCacheSystemService`. Cada cache tem uma flag `active`, um `cache_dir`
sob `cache/` e TTLs por chave. A **cache de configuração** do Laminas é regida por
`config_cache_enabled` em `application.config.php` (desativada por predefinição neste esqueleto).
Consulte [Resolução de problemas](/pt/guide/troubleshooting#cache) para limpar caches.

## Configuração do back-office React

O back-office React da v6 (`/melis-react`) corre na **mesma framework e na mesma árvore de
configuração** que o back-office clássico (`/melis`) — tudo o que foi descrito acima continua a
aplicar-se. Dois módulos de infraestrutura adicionais fazem a ligação. Ambos são carregados através
de `config/application.config.php` (`module_paths` / `modules`, não pelo autoload do composer) e
nenhum deles tem qualquer configuração ao nível do projeto para editar: ativar o BO React é uma
questão de carregar estes módulos.

| Módulo | Função |
| --- | --- |
| `MelisReactApi` | A espinha dorsal da API JSON. Declara os endpoints genéricos `/melis/react-api/…` (no seu próprio `config/module.config.php`) e aloja o resolvedor de capacidades. Não desenha qualquer UI. |
| `MelisReactOverride` | Serve o shell React e renderiza as ferramentas legadas como iframes. Sobrepõe o controlador `PluginView` do MelisCore e declara as rotas do shell/ferramentas. |

### Servir o shell

A SPA React é servida pelo `SpaController` do `MelisReactOverride` em **`/melis-react`** e em
todas as ligações profundas sob ela (rota regex `meliscore-melis-react-spa`, `priority => 1000`). O
`index.html` do shell é lido a partir do `public/ui-react/index.html` do **melis-core**, servido em
`/MelisCore/ui-react/` — pelo que o build React reside com o `melis-core`, não nestes módulos.

Como a aplicação React trata da sua própria autenticação, o `MelisReactOverride` acrescenta algumas
rotas ao `plugins.meliscore.datas.excluded_routes` do MelisCore (públicas, sem redirecionamento de
login): a própria rota da SPA, `melis-backoffice/react-platform-bundle` e os dois endpoints de
arranque só de leitura `melis-backoffice/melis-react-api/platformscheme-react-get` e
`melis-backoffice/melis-react-api/langs`.

### Descoberta de bricks / módulos

O shell descobre as ferramentas no arranque através de **`GET /melis/react-api/react-modules`**, que
verifica os módulos **ativos** em busca de um `public/ui-react/brick.manifest.json` (um único objeto
ou um array `bricks: [...]`) e devolve as definições de brick, bem como um único URL de bundle
concatenado (`GET /melis/react-api/bricks-bundle.js`). Um brick aparece, portanto, **se e só se o seu
módulo estiver ativo** — essa é a regra de modularidade; não existe nenhum registo separado a manter.
Um módulo que fornece uma ferramenta React disponibiliza-a como um brick sob o seu próprio
`public/ui-react/`.

### Chaves de configuração React por módulo

Os módulos de ferramenta individuais (não estes dois módulos de infraestrutura) podem declarar
configuração React, fundida na árvore de configuração através do seu `Module::getConfig()`:

| Ficheiro / chave | Declara |
| --- | --- |
| `config/react-api.php` | As próprias rotas de dados `/melis/react-api/…` de um módulo de ferramenta (por exemplo, `users`, `roles` residem em MelisCore / MelisSmallBusiness — **não** em MelisReactApi). |
| `config/react.capabilities.php` (`melisReactToolCapabilities`) | Os "direitos avançados" de granularidade fina (`list` / `create` / `edit` / `delete`, ou uma árvore aninhada `{ actions, tabs }`) que existem por `melisKey` de ferramenta. A predefinição é **permitir**; as negações são armazenadas numa secção dedicada `<meliscore_tool_capabilities>` do XML de direitos do utilizador/função. |
| `melis_react_override.toolpage_extensions[]` | Nomes de serviços que implementam `PluginViewToolPageExtensionInterface` — as particularidades por ferramenta de um módulo (ajustes de HTML/assets) para ferramentas legadas apresentadas no shell React. As contribuições acumulam-se independentemente da ordem de carregamento. |

Os próprios módulos de infraestrutura **não** declaram nenhuma destas chaves: o `MelisReactApi` é o
motor que *lê* as declarações de capacidades de outros módulos, e o `MelisReactOverride` não fornece
qualquer brick, nenhum `react-api.php` e nenhum `react.capabilities.php`.

## Onde procurar

| Assunto | Caminho |
| --- | --- |
| Lista de módulos | `config/melis.module.load.php` |
| BD da plataforma | `config/autoload/platforms/<MELIS_PLATFORM>.php` |
| Serviço de configuração | `vendor/melisplatform/melis-core/src/Service/MelisCoreConfigService.php` |
| Configuração de cache | `vendor/melisplatform/melis-core/config/module.config.php` (`caches`) |
| Gestor de assets | `vendor/melisplatform/melis-asset-manager/` |
| Rotas da API React / resolvedor de capacidades | `vendor/melisplatform/melis-react-api/` |
| Shell React + iframe de ferramenta legada / rota SPA | `vendor/melisplatform/melis-react-override/` |
| Build do shell React (`index.html`, bricks) | `vendor/melisplatform/melis-core/public/ui-react/` |
