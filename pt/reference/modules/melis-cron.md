# MelisCron

> Gestor de tarefas agendadas do back-office: defina tarefas CLI ou HTTP com agendamentos flexíveis, execute-as a pedido ou através de um executor CLI a cada minuto, e inspecione o histórico completo de execuções — agora impulsionado por uma ferramenta React nativa. Pacote `melisplatform/melis-cron`.

## Objetivo

O MelisCron substitui as linhas de crontab escritas à mão por uma lista gerida de tarefas. Cada tarefa aponta para um **comando CLI** ou um **URL HTTP** e declara quando deve ser executada (a cada N minutos/horas/dias, de hora a hora, diariamente, semanalmente ou mensalmente). Cada execução é registada numa tabela de histórico com o estado, a duração e a saída capturada. A execução agendada continua a exigir uma entrada de crontab ao nível do sistema operativo que chame o executor `melis:cronexec` a cada minuto; a ferramenta React apenas define, regista e (a pedido) despoleta tarefas.

## Ativação

Adicione a `config/melis.module.load.php`:

```php
return [
    'MelisCron',
];
```

Requer o **MelisCore** (fornecido pela plataforma). Dependências do Composer: PHP `^8.1|^8.3`, `ext-curl`, `composer/composer ^2.9.6`, `laminas/laminas-cli ^1.5`. A ferramenta React só aparece se o módulo estiver ativado (deteção modular de blocos).

## Back-office (React)

**Barra lateral → MelisCore → Dev Tools → Scheduled Tasks**, junto ao Melis Phpinfo e à SQL Tool. Abre-se como um separador de topo denominado **Scheduled Tasks** e é fornecida como um **bloco totalmente React nativo** (id do bloco `cron`, melisKey `cron_tool`), com um interruptor **New / Old**: *New* é a interface React (predefinição); *Old* apresenta a ferramenta jQuery legada num iframe.

Uma vez que uma tarefa cron executa comandos CLI arbitrários e chamadas HTTP, as ações de **criar / editar / executar** estão restritas aos **administradores** da plataforma do lado do servidor, para além das verificações de capacidades.

### Lista de tarefas

A lista mostra todas as tarefas agendadas com **cartões KPI** (Total / Ativas / Inativas), uma caixa de **pesquisa** (nome e alvo), filtros de **estado** (Todas / Ativas / Inativas) e **tipo** (CLI / HTTP), **Repor filtros**, um gestor de **Colunas** (persistido), um botão de **Exportar** e um botão de **atualizar**. Clique num cabeçalho de coluna para ordenar. Cada linha tem três ações por linha: **Executar agora** (▶), **editar** e **eliminar** (a eliminação remove também o histórico da tarefa). Botões no canto superior direito: **History**, o interruptor **New / Old** e **+ New task**. As páginas de formulário e de History abrem-se como **subseparadores** nativos dentro do separador Scheduled Tasks, mantendo cada um o seu estado.

![A ferramenta Cron em React: cartões KPI, pesquisa, filtros de estado e tipo, Colunas, Exportar, o interruptor New/Old, History e + New task, com as ações Executar/editar/eliminar por linha](/screenshots/react/melis-cron/meliscron-tool-cron-list.png)

### Criar / editar uma tarefa

**+ New task** (ou o lápis de edição de uma linha) abre um formulário React de dois painéis num subseparador:

- **Identidade + alvo** — **Name**, **Type** (interruptor segmentado CLI / HTTP) e **Target** (o comando CLI como `cache:clear`, ou o URL HTTP), com uma sugestão adaptada ao tipo.
- **Opções** — um interruptor **Active** e o seletor de **Schedule**. Ao escolher um agendamento, revela-se o respetivo editor: *Interval* = valor + unidade (minutos/horas/dias); *Hourly* = minuto da hora; *Daily* = hora + minuto; *Weekly* = botões de dia da semana + hora + minuto; *Monthly* = dia do mês + hora + minuto.

![O formulário React de nova tarefa — Name, Type (CLI/HTTP), Target com uma sugestão adaptada ao tipo, e o painel de Opções com o interruptor Active e o editor de Schedule (Interval — a cada 15 minutos)](/screenshots/react/melis-cron/meliscron-tool-cron-new.png)

**Save** persiste a tarefa. A validação (espelhada do lado do cliente e do servidor): nome obrigatório (≤ 100 carateres), alvo obrigatório (≤ 255 carateres), o tipo tem de ser CLI/HTTP, e as opções de agendamento válidas para o tipo escolhido.

![Edição de "CRON 1" (uma tarefa HTTP com alvo /my-url, a cada 15 minutos) — o mesmo formulário de dois painéis, pré-preenchido a partir da tarefa](/screenshots/react/melis-cron/meliscron-tool-cron-edit.png)

### Executar agora e histórico

O botão **Executar** (▶) por linha pede confirmação e, em seguida, **executa a tarefa imediatamente** (de forma síncrona, no âmbito do pedido) e reporta o resultado — estado, código HTTP para tarefas HTTP, duração — como uma notificação, e escreve uma entrada de histórico. Isto contorna o agendamento.

![A caixa de diálogo de confirmação "Run task" — "Are you sure you want to perform 'CRON 1' now?" com Cancel / Run](/screenshots/react/melis-cron/meliscron-tool-cron-run.png)

O botão **History** abre a página de **Execution history** num subseparador: cartões KPI (Executions / Succeeded / Failed / Running), filtros (pesquisa por nome e registos, menu pendente de tarefa, menu pendente de estado, intervalo de datas De/Até), e uma tabela de execuções (tarefa, tipo, estado, duração, data de execução, distintivo de reexecução). Um pop-up de **Logs** por linha mostra o detalhe da execução (alvo, datas de fila/execução, duração, código HTTP) e os registos capturados em bruto.

## API React

Rotas em `config/react-api.php`, controlador `MelisCron\Controller\MelisReactApiCronController`. Todas sob `/melis/react-api/crons`, contrato `{ success, data, error }`.

| Método e URL | Ação | Objetivo |
| --- | --- | --- |
| `GET /crons` | `list` | Listar tarefas (keyset: `limit`, `search`, `active`, `type`, `sort`, `dir`, `after`) |
| `GET /crons/stats` | `stats` | KPI `{total, active, inactive}` |
| `GET /crons/:id` | `get` | Uma tarefa |
| `POST /crons/save` | `save` | Criar / atualizar uma tarefa (validada) — **apenas administradores** |
| `DELETE /crons/delete/:id` | `delete` | Eliminar uma tarefa e o seu histórico |
| `POST /crons/run/:id` | `run` | Executar uma tarefa **agora** (síncrona) — **apenas administradores** |
| `GET /crons/history` | `history` | Histórico de execuções (filtros `cronId`, `state`, `search`, `startDate`, `endDate`, `page`, `limit`) |
| `GET /crons/history/:id` | `historyDetail` | Uma execução + registos completos |

Cada ação chama primeiro `denyUnlessAccess()` (autenticação + `MelisCoreRights::canAccess('cron_tool')`). As ações de mutação adicionam `denyUnlessAdmin()` (bloqueia não-`usr_admin`) e `denyUnlessCan(cap)`. As leituras e o CRUD comunicam com as duas tabelas através de SQL parametrizado; `run` delega em `MelisCronService::runTaskNow($id)`.

### Capacidades

Declaradas em `config/react.capabilities.php` sob o nó `cron_tool` — uma lista CRUD simples:

```php
'melisReactToolCapabilities' => [
    'cron_tool' => ['list', 'create', 'edit', 'delete', 'export', 'run'],
],
```

Em React, `useCaps('cron_tool').can(cap)` controla o acesso à interface (oculta **+ New task**, as ações por linha, Exportar). O modelo é **permitir por predefinição** com **contorno de administrador**; para além disso, criar/editar/executar estão rigidamente restritas aos administradores.

## Serviço-chave — `MelisCronService`

```php
$cron = $sm->get('MelisCronService');

$cron->getActiveTasks();
$cron->saveItem($data, $id);   // fires events
$cron->deleteItem($id);

// Job queue
$cron->addJob($cronId, $forceRun);       // inserts a 'pending' row in melis_cron_history
$cron->getPendingJobs();
$cron->updateProcessingJob($jobId);      // claims job: pending → processing
$cron->finishJob($jobId, $data);         // writes state/duration/logs/status
$cron->runTaskNow($id);                  // synchronous execution used by the React Run action

// Helpers
$cron->getDateLastRunByCron($cronId);
$cron->getWordingScheduleType($type, $optionsJson);
```

**Eventos despoletados:** `cron_service_get_list_start`, `meliscron_service_get_list_end`, `meliscron_service_get_listhistory_end`, `meliscron_service_save_item_start`/`_end`, `meliscron_service_delete_item_start`/`_end`.

## Tabelas da base de dados

| Tabela | Conteúdo |
| --- | --- |
| `melis_cron` | Definições de tarefas: `cron_id`, `cron_name`, `cron_active`, `cron_target`, `cron_type` (ENUM `CLI\|HTTP`), `cron_schedule_type` (ENUM `every\|hourly\|daily\|weekly\|monthly`), `cron_schedule_options` (JSON) |
| `melis_cron_history` | Registos de execução: `id`, `cron_id`, `state` (ENUM `pending\|processing\|success\|error`), `date_add`, `rerun`, `date_run`, `duration`, `logs`, `status` |

### Formatos JSON de `cron_schedule_options`

| `cron_schedule_type` | Estrutura JSON |
| --- | --- |
| `every` | `{ "everyItem": "minutes\|hours\|days", "everyValue": N }` |
| `hourly` | `{ "hourlyValue": MM }` |
| `daily` | `{ "dailyHour": HH, "dailyMinute": MM }` |
| `weekly` | `{ "weeklyDays": [1..7], "atHour": HH, "atMinute": MM }` (dia da semana ISO, Seg=1) |
| `monthly` | `{ "monthlyDay": D, "atHour": HH, "atMinute": MM }` |

## Configuração do executor

A execução agendada é impulsionada por `MelisCron\Command\ExecCommand`, registado no laminas-cli como **`melis:cronexec`**. Adicione uma linha ao crontab do servidor:

```cron
* * * * * cd /path/to/project && php vendor/bin/laminas melis:cronexec --env=production >/dev/null 2>&1
```

Cada tique executa duas fases:

1. **`scheduleTasks()`** — avalia o agendamento de cada tarefa ativa em relação à hora atual; chama `addJob()` para qualquer tarefa cuja execução esteja devida.
2. **`runJobs()`** — reclama cada tarefa pendente (`pending → processing`) e depois executa-a dentro de uma **PHP Fiber** para concorrência:
   - **HTTP** — GET via `curl` de `cron_target`; regista o código HTTP e o corpo da resposta.
   - **CLI** — `exec()` de `cron_target`; um código de saída diferente de zero define o estado como `error`.

Está disponível um gatilho de recurso HTTP em `/melis/MelisCron/Cron/execute` para ambientes onde não existe um crontab CLI.

> A resolução do agendamento é de um minuto (a cadência do tique). Sem a linha de crontab, as tarefas ficam definidas mas só são despoletadas manualmente através de **Executar agora**.

Ver também: [MelisCore](/pt/reference/modules/melis-core)
