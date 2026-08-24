# MelisComposerDeploy

> Integra o Composer dentro da plataforma para instalar, atualizar e remover módulos programaticamente. Pacote `melisplatform/melis-composerdeploy`.

## Objetivo

O MelisComposerDeploy permite à plataforma **executar o Composer a partir do interior da aplicação** — instalando, atualizando ou removendo módulos sem acesso ao terminal. É o motor headless por detrás da ferramenta **Modules / marketplace** do back-office e do assistente de primeira execução do MelisInstaller. Situa-se na camada de fundação do MelisCore, a par do MelisAssetManager, do MelisDbDeploy e do MelisInstaller, e depende apenas do `composer/composer` (sem acoplamento ao MelisCore).

## Sem back-office React

O MelisComposerDeploy **não tem interface React nem ferramenta de back-office** — nem no back-office legado nem no back-office React (`/melis-react`). Não fornece qualquer brick `ui-react/`, `brick.manifest.json`, `config/react-api.php` ou controlador. Nunca aparece na barra lateral e não há nada em que clicar.

A sua relação com o back-office React é **indireta**: quando instala um módulo através do marketplace, o MelisComposerDeploy descarrega o pacote Composer. Se esse pacote incluir um brick React compilado, a shell React descobre o brick **assim que o módulo estiver ativo** — mas a descoberta de bricks é tratada pelo `melis-react-api`, não por este módulo. O MelisComposerDeploy nunca toca, compila nem serve ativos React.

> Em ambientes implantados onde toda a pasta `vendor/` é submetida ao repositório (sem `composer install` do lado do servidor), o MelisComposerDeploy é o motor de *marketplace em tempo de execução* — não o mecanismo que entrega a aplicação React pré-compilada.

## Ativá-lo

Adicione a `config/melis.module.load.php`:

```php
return [
    'MelisComposerDeploy',
];
```

## Serviço principal

Todo o módulo é essencialmente um único serviço, com o alias `MelisComposerService` (`config/module.config.php` → `service_manager.aliases`), classe `MelisComposerDeploy\Service\MelisComposerService`. Constrói um comando de consola do Composer e executa-o em processo através da Symfony Console, controlando a biblioteca Composer embutida disponibilizada em `bin/extracted-composer/`.

| Alias do serviço | Papel |
| --- | --- |
| `MelisComposerService` | Executor do Composer em processo. Expõe `download()`, `update()`, `remove()`, `dumpAutoload()`, além de `setDocumentRoot()` e `setDryRun()`. |

```php
$composer = $sm->get('MelisComposerService');

$composer->setDocumentRoot($projectRoot);            // composer working-dir (defaults to DOCUMENT_ROOT/../)
$composer->setDryRun(true);                           // simulate without writing (--dry-run)

$composer->download('melisplatform/melis-cms-news');  // composer require <pkg>[:version]
$composer->update('melisplatform/melis-cms-news');    // composer update --root-reqs
$composer->remove('melisplatform/melis-cms-news');    // composer remove --no-scripts
$composer->dumpAutoload();                             // composer dump-autoload
```

Notas a partir do código-fonte:

- **Apenas comandos permitidos**: `install`, `update`, `dump-autoload`, `require`, `remove`. Qualquer outro devolve uma resposta de "comando desconhecido".
- **Reforço dos argumentos**: a string `package[:version]` é validada contra uma expressão regular estrita `vendor/name` + estilo semver e rejeita espaços em branco, prevenindo a injeção de argumentos na linha de comando do Composer.
- Os comandos são executados com `--ignore-platform-reqs --no-progress --no-scripts --prefer-dist` e `--working-dir=<docRoot>`.
- Sem rotas, sem controlador, sem eventos, sem vista — é um serviço invocado por outros módulos.

## Pipeline de implantação

Os invocadores controlam o serviço; um fluxo típico de instalação em tempo de execução:

```text
MelisComposerService::download(pkg)   →  composer require (package downloaded into vendor/)
        ↓
MelisComposerService::dumpAutoload()  →  autoloader regenerated (new classes visible)
        ↓
MelisDbDeploy                          →  applies the new module's SQL deltas (extra.dbdeploy: true)
        ↓
module active                          →  MelisAssetManager serves its assets; if the module ships
                                          a React brick, the React shell discovers it (via
                                          melis-react-api /react-modules)
```

A última seta é o único ponto de contacto, passivo, com o back-office React: este módulo torna o módulo presente e ativo; a descoberta de bricks React pertence inteiramente ao `melis-react-api`.

Ver também: [MelisDbDeploy](/pt/reference/modules/melis-dbdeploy), [MelisInstaller](/pt/reference/modules/melis-installer), [MelisAssetManager](/pt/reference/modules/melis-asset-manager)
