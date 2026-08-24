# MelisDbDeploy

> Executor de migrações de base de dados sem interface para a plataforma Melis — aplica os deltas SQL de cada módulo por ordem. Pacote `melisplatform/melis-dbdeploy`.

## Objetivo

O `MelisDbDeploy` mantém o esquema da base de dados de cada módulo sincronizado com o código instalado. Cada módulo
que opta por participar disponibiliza as suas alterações de esquema como ficheiros SQL ordenados (**deltas**) em
`install/dbdeploy/`. O MelisDbDeploy deteta esses deltas em todos os módulos, aplica os que ainda
não foram executados e regista cada um numa tabela de changelog, para que seja aplicado exatamente uma vez — construído
sobre a `DbDeployTask` do [Phing](https://www.phing.info/).

Não tem **qualquer interface exposta ao utilizador**.

## Relação com o back-office React

O MelisDbDeploy **não tem ferramenta React, página, entrada de menu nem rota**. Nunca aparece em lado algum em
`/melis-react`. Não existe brick `ui-react/`, `config/react-api.php`,
`config/react.capabilities.php` nem `src/Controller/` — é um módulo sem interface, apenas de serviços.

A sua ligação ao back-office React é totalmente **indireta**, através de dois factos:

- **Cria as tabelas e colunas que as ferramentas React leem e escrevem.** Todas as ferramentas React (Utilizadores,
  Pages CMS, Sites, Media, …) consultam tabelas da base de dados. Essas tabelas — e as colunas que as
  funcionalidades React mais recentes adicionam — são criadas pelos deltas `install/dbdeploy/*.sql` do módulo
  proprietário, que o MelisDbDeploy aplica. Se uma ferramenta React apresentar um erro de "table/column not found" logo
  após uma instalação ou atualização, a causa habitual é uma migração por executar.
- **É executado no pipeline de deploy que disponibiliza a build React.** A build React submetida
  (`melis-core/public/ui-react/`, aplicação em `/melis-react`) é disponibilizada pelo mesmo deployment que
  executa as migrações de esquema. O MelisDbDeploy trata dos deltas SQL **disponibilizados pelos módulos**; o **Flyway**
  trata das migrações versionadas da plataforma (`V*.sql`). São mecanismos complementares no
  mesmo passo de deploy.

## Ativá-lo

Adicione a `config/melis.module.load.php`:

```php
return [
    'MelisDbDeploy',
];
```

O `MelisDbDeploy` depende apenas de `phing/phing`. **Não** tem dependência de `melis-core` — é uma
ferramenta autónoma invocada pelo MelisInstaller e pelos fluxos de instalação/atualização de módulos, nunca chamada
a partir do React.

## Fazer um módulo participar

Um módulo passa a participar no sistema de migração declarando o seguinte no seu `composer.json`:

```json
"extra": {
    "dbdeploy": true
}
```

Os seus deltas SQL são colocados em `install/dbdeploy/*.sql`. Cada nome de ficheiro começa com um prefixo numérico
que define a ordem de execução (por exemplo, `23051701_create_my_table.sql`).

## Serviços principais

| Alias do serviço | Função |
| --- | --- |
| `MelisDbDeployDiscoveryService` | Localiza os deltas de todos os pacotes `melisplatform/*` participantes e copia-os para a cache de trabalho (`dbdeploy/data/`), delegando depois no serviço de deploy. |
| `MelisDbDeployDeployService` | Liga-se à base de dados, garante que a tabela de changelog existe e aplica os deltas pendentes através da `DbDeployTask` + `PDOSQLExecTask` do Phing. |

## A tabela de changelog

Cada delta aplicado é registado numa tabela `changelog` fixa (o nome é exigido pela tarefa
do Phing), que funciona como o registo de "aplicado uma única vez":

```sql
CREATE TABLE IF NOT EXISTS changelog (
  `change_number` BIGINT NOT NULL,
  `delta_set`     VARCHAR(10) NOT NULL,
  `start_dt`      TIMESTAMP NOT NULL,
  `complete_dt`   TIMESTAMP NULL,
  `applied_by`    VARCHAR(100) NOT NULL,
  `description`   VARCHAR(500) NOT NULL,
  PRIMARY KEY `Pkchangelog` (`change_number`, `delta_set`)
);
```

O acesso ao modelo faz-se através de `MelisDbDeploy\Model\Table\ChangelogTable` (com o alias `ChangelogTable`).

## Exemplo

```php
// Discovery — gather deltas from all dbdeploy modules
$discovery = $sm->get(\MelisDbDeploy\Service\MelisDbDeployDiscoveryService::class);
$discovery->setComposer($composer);
$discovery->processing();   // discovers modules and copies their *.sql deltas

// Deploy — apply pending deltas
$deploy = new \MelisDbDeploy\Service\MelisDbDeployDeployService(/* db params */);
if (!$deploy->isInstalled()) {
    $deploy->install();                  // creates the changelog table on first run
}
$count = $deploy->changeLogCount();      // number of deltas applied so far
$deploy->applyDeltaPath($pathToDeltas);  // run any not-yet-applied deltas
```

## Quando é executado

O MelisDbDeploy é invocado automaticamente em dois cenários, nenhum dos quais envolve a interface React:

- **Primeira instalação** — pelo **MelisInstaller** durante o assistente de configuração da plataforma.
- **Instalação / atualização de módulos** — através da ferramenta de Módulos / marketplace do back-office e do hook
  post-update do Composer (`DbDeployOnComposerUpdate::postUpdate()`), que copia os deltas de cada módulo e
  reaplica-os até a contagem do changelog corresponder ao número de ficheiros de delta (convergência idempotente).

Não expõe quaisquer controladores.

## Resolução de problemas

Se uma ferramenta React apresentar dados vazios ou um erro 500 / "table doesn't exist" logo a seguir a uma instalação de módulo,
atualização ou deploy, a causa raiz típica é um **delta dbdeploy por executar** (ou uma migração Flyway
em falta) — não o código React. Voltar a executar o fluxo de migração resolve o problema.

## Ficheiros principais

| Aspeto | Caminho |
| --- | --- |
| Serviço de discovery | `vendor/melisplatform/melis-dbdeploy/src/Service/MelisDbDeployDiscoveryService.php` |
| Serviço de deploy | `vendor/melisplatform/melis-dbdeploy/src/Service/MelisDbDeployDeployService.php` |
| Hook post-update do Composer | `vendor/melisplatform/melis-dbdeploy/src/DbDeployOnComposerUpdate.php` |
| DDL do changelog | `vendor/melisplatform/melis-dbdeploy/data/changelog.sql` |
| Modelos | `vendor/melisplatform/melis-dbdeploy/src/Model/` |
| Deltas de módulo (qualquer módulo) | `vendor/melisplatform/<module>/install/dbdeploy/*.sql` |

Ver também: [MelisCore](/pt/reference/modules/melis-core) · [MelisInstaller](/pt/reference/modules/melis-installer) · [MelisComposerDeploy](/pt/reference/modules/melis-composerdeploy) · [Conceitos da plataforma](/pt/guide/concepts)
