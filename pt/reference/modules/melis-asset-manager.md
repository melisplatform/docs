# MelisAssetManager

> Serve os recursos públicos de cada módulo (CSS, JS, imagens) através de URLs limpos, entrega o
> bundle compilado do back-office React e é a fonte canónica para a descoberta de módulos ativos.
> Pacote `melisplatform/melis-asset-manager`.

## Objetivo

O MelisAssetManager interceta pedidos a `/<ModuleName>/…` no momento do carregamento e transmite o
ficheiro correspondente a partir do diretório `public/` desse módulo, sem lógica de controlador no
caminho crítico. No primeiro arranque, escreve um mapa de módulo para caminho em
`config/melis.modules.path.php` (exigindo que a pasta `config/` tenha permissões de escrita).
Fornece também os serviços à escala da plataforma para consultar quais os módulos que estão
instalados ou ativos, e para compilar o CSS/JS de todos os módulos em bundles de produção legados
através do webpack.

Faz parte da **base da plataforma MelisCore** e é exigido por praticamente todos os outros módulos.

## Papel no back-office React

O módulo **não possui ferramenta React nem interface própria** — não tem brick, nem
`config/react-api.php`, nem `config/react.capabilities.php`, e nunca surge como ferramenta em
`/melis-react`. A sua relevância para a v6 é puramente de infraestrutura: é a camada de entrega HTTP
que serve o **bundle compilado da SPA React** ao navegador.

O back-office React é uma aplicação de página única (SPA) em Vite cujo resultado da compilação (JS,
CSS, tipos de letra, ícones, `index.html`) é submetido em `melis-core/public/ui-react/`. Os pedidos
a esses ficheiros chegam a URLs que começam por **`/MelisCore/ui-react/`** — exatamente o `base`
contra o qual a compilação Vite é feita — e são servidos pelo mesmo resolvedor genérico
`/<Module>/…` → `<module>/public/…` usado para os recursos de todos os módulos. A divisão é:

| Camada | Servido por | URL |
| --- | --- | --- |
| Estrutura HTML do React | MelisReactOverride | `/melis-react` |
| Bundle JS/CSS com hash do React | **MelisAssetManager** | `/MelisCore/ui-react/…` |

> Se este módulo (ou a sua cache com permissões de escrita) falhar, a estrutura HTML pode ainda
> carregar, mas o JS/CSS com hash devolve **404** ou o **tipo MIME** errado, pelo que o navegador
> recusa executar o script — o sintoma clássico é uma **`/melis-react` em branco**. A causa raiz
> habitual é a pasta `config/` (e o seu `melis.modules.path.php` gerado) não ter permissões de
> escrita para o utilizador web (por exemplo, `www-data`). Ativar um novo módulo força a
> reconstrução dessa cache; uma falha de permissões aí degrada a entrega de recursos. Consulte
> [Ativá-lo](#ativa-lo).

## Ativá-lo

Adicione a `config/melis.module.load.php`:

```php
return [
    'MelisAssetManager',
];
```

Dependência: `melisplatform/melis-core` (`^6.0`), PHP `^8.3 | ^8.5`. A pasta `config/` tem de ter
permissões de escrita para que o módulo possa persistir `melis.modules.path.php` no arranque.

## Mecanismo de entrega

**Não existe controlador** para o caminho comum de recursos — a entrega é um resolvedor executado no
momento do carregamento, ligado em `src/Module.php`:

- **`onBootstrap()`** invoca **`displayFile($sm)`** em cada pedido.
- **`displayFile()`** resolve o URI do pedido num ficheiro: primeiro tenta a pasta pública principal
  do projeto (`$_SERVER['DOCUMENT_ROOT'] . $uri`); caso contrário, trata o primeiro segmento do URI
  como um nome de módulo, procura-o no mapa em cache e constrói
  `<modulePath>/public/<resto-do-URI>`.
- **`sendDocument()`** define o `Content-Type` correto (através de `getMimeType()` +
  `config/mime.config.php`), acrescenta um cabeçalho de cache de 24 h para ficheiros estáticos,
  imprime os bytes e termina. Uma salvaguarda (`isRequestAuthenticated()`) exige uma sessão válida
  antes de sequer fazer `eval` a um ficheiro `.php` servido; os recursos estáticos permanecem
  públicos.
- **`checkFileInFolder()`** garante que o caminho resolvido permanece dentro do diretório `public/`
  do módulo (salvaguarda contra travessia de caminhos).

Um pedido a `/MelisCore/ui-react/assets/index-<hash>.js` resolve, portanto, o módulo `MelisCore` e
transmite `melis-core/public/ui-react/assets/index-<hash>.js` — sem qualquer código específico de
React envolvido.

## Cache de caminhos de módulos

O mapa `<ModuleName> → caminho` usado por `displayFile()` é um ficheiro PHP gerado em
`config/melis.modules.path.php`. É (re)construído pelo ouvinte de carregamento de módulos em
`src/Module.php`:

- **`init()`** associa **`onLoadModulesPost()`** a `ModuleEvent::EVENT_LOAD_MODULES_POST`.
- **`onLoadModulesPost()`** escreve o ficheiro quando este está em falta ou quando um módulo
  recém-ativado ainda não consta dele, usando `MelisModulesService` para calcular o caminho de cada
  módulo, e em seguida aplica `chmod` `0777`.

Fora isso, o módulo é **sem estado** — este ficheiro gerado é o seu único estado persistido.

## Serviços principais

Registados em `config/module.config.php` sob `service_manager`.

| Alias do serviço | Papel |
| --- | --- |
| `ModulesService` | Descobrir e consultar módulos instalados/ativos (`MelisModulesService`). |
| `MelisWebPackService` | Construir bundles webpack legados e resolver listas de recursos de módulos. |
| `MelisConfig` | Fundir e ler a árvore de configuração da aplicação da plataforma (`MelisConfigService`). |

### `MelisModulesService`

O serviço canónico para saber "que módulos existem / estão ativos". Usado pela ferramenta Modules,
pelo marketplace, pelo carregamento de módulos de sites e pelo instalador.

```php
$modules = $sm->get('ModulesService'); // MelisAssetManager\Service\MelisModulesService

$active   = $modules->getMelisActiveModules();        // modules currently enabled
$all      = $modules->getAllModules();                // every discoverable module
$vendor   = $modules->getVendorModules();             // modules under vendor/
$versions = $modules->getModulesAndVersions();        // module => version
$deps     = $modules->getChildDependencies($moduleName);
$sites    = $modules->getSitesModules();              // template/site modules
```

Lista completa de métodos: `getMelisActiveModules`, `getModulesAndVersions`,
`getComposer`/`setComposer`, `getUserModules`, `getSitesModules`, `getMelisModules`,
`getAllModules`, `getVendorModules`, `getChildDependencies`.

### `MelisWebPackService`

```php
$webpack = $sm->get('MelisWebPackService');

$assets  = $webpack->getAssets($moduleName);           // a module's declared assets
$merged  = $webpack->getMergedAssets();                // platform-wide merged set
$webpack->buildWebPack();                               // compile bundles
$file    = $webpack->getWebPackMixStaticFile($asset);  // resolve a hashed/mixed asset
```

Lista completa de métodos: `getAssets`, `getWebPackMixStaticFile`, `getMergedAssets`,
`buildWebPack`, `setCachedFile`, `getCachedFiles`.

A chave de configuração `ressources.build` por módulo (no `app.interface.php` de um módulo) declara
o `bundle.css` / `bundle.js` que este serviço produz e serve. O `WebPackController`
(rotas `melis-backoffice/build-webpack` e `melis-backoffice/view-assets`) comanda-o.

> Esta pipeline webpack constrói apenas o bundle **legado** do back-office — não tem nada que ver
> com a compilação React. A SPA React é compilada pelo **Vite** dentro de `melis-core/ui-react/`
> (`npm run build`) e submetida em `melis-core/public/ui-react/`; o MelisAssetManager apenas *serve*
> esses ficheiros já compilados, não os compila.

### `MelisConfigService`

Um auxiliar de fusão de configuração e tradução para as necessidades próprias do asset-manager.
Métodos principais: `getItem`, `getMelisKeys`, `getFormMergedAndOrdered`, `translateAppConfig`.

## URLs de recursos

Os recursos de qualquer módulo estão acessíveis em:

```
/<ModuleName>/css/<file>.css
/<ModuleName>/js/<file>.js
/<ModuleName>/images/<file>.jpg
/MelisCore/ui-react/assets/<file>          # the committed React bundle
```

Estes correspondem à pasta `public/` de cada módulo. O recurso alternativo é a pasta `public/`
principal do projeto.

## Tabelas da base de dados

Nenhuma. O módulo é sem estado — o seu único estado persistido é o ficheiro gerado
`config/melis.modules.path.php`.

## Ficheiros principais

| Assunto | Caminho |
| --- | --- |
| Aliases de serviços e ligação da entrega de recursos | `vendor/melisplatform/melis-asset-manager/config/module.config.php` |
| Mapa extensão → MIME para `sendDocument()` | `vendor/melisplatform/melis-asset-manager/config/mime.config.php` |
| Entrega de recursos + cache de caminhos de módulos | `vendor/melisplatform/melis-asset-manager/src/Module.php` |
| Serviço de descoberta de módulos | `vendor/melisplatform/melis-asset-manager/src/Service/MelisModulesService.php` |
| Serviço webpack/bundle (legado) | `vendor/melisplatform/melis-asset-manager/src/Service/MelisWebPackService.php` |
| Leitor de configuração da aplicação | `vendor/melisplatform/melis-asset-manager/src/Service/MelisConfigService.php` |
| Controladores de recursos/webpack | `vendor/melisplatform/melis-asset-manager/src/Controller/` |
| Mapa de caminhos de módulos (gerado) | `config/melis.modules.path.php` |
| Compilação React submetida (servida, não compilada aqui) | `vendor/melisplatform/melis-core/public/ui-react/` |

Ver também: [MelisCore](/pt/reference/modules/melis-core) · [MelisReactApi](/pt/reference/modules/melis-react-api) · [MelisDbDeploy](/pt/reference/modules/melis-dbdeploy) · [MelisComposerDeploy](/pt/reference/modules/melis-composerdeploy) · [MelisInstaller](/pt/reference/modules/melis-installer) · [Referência de módulos](/pt/reference/modules)
