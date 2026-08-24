# MelisCalendar

> Ferramenta de agendamento de back-office com um calendário mensal React nativo, eventos por arrastar e largar e um widget de dashboard. Pacote `melisplatform/melis-calendar`.

## Objetivo

O MelisCalendar é a ferramenta de calendário / agendamento de eventos da plataforma: eventos datados numa grelha mensal interativa, arrastar para agendar e arrastar para reagendar. No back-office React v6 (`/melis-react`), é disponibilizado como um **bloco totalmente React nativo** — uma grelha mensal personalizada com arrastar e largar nativo (e por toque) — que lê e escreve através de uma camada JSON `react-api`. Um seletor **New / Old** permite aos utilizadores recorrerem à ferramenta FullCalendar legada num iframe. Os eventos são **globais à plataforma** (uma agenda de equipa partilhada, não associada a um site).

## Ativação

Adicione a `config/melis.module.load.php`:

```php
return [
    'MelisCalendar',
];
```

A única dependência obrigatória é `melisplatform/melis-core`. A ferramenta só aparece no back-office React enquanto o módulo estiver ativo (deteção modular de blocos através de `GET /melis/react-api/react-modules`).

## Back-office (React)

Barra lateral esquerda → **MelisMarketing** → **Calendar** (ícone de calendário). Abre como um separador de topo persistente denominado **Calendar**. É uma ferramenta de nível único (sem sub-separadores) com um modal de criação/edição.

![A ferramenta Calendar em React: seletor New/Old e "+ New event" (canto superior direito), cartões KPI (Total / Upcoming), o bloco de arrastar "New event" e a lista "This month's events" (à esquerda), e uma grelha mensal personalizada com o dia de hoje destacado](/screenshots/react/melis-calendar/meliscalendar-tool-calandar-display.png)

| Área | Descrição |
| --- | --- |
| Grelha mensal personalizada | Grelha de 6 semanas (segunda→domingo), `‹ / ›` para mudar de mês, **Today** para regressar, dia atual destacado. Os eventos são apresentados como chips no(s) seu(s) dia(s); os eventos de vários dias abrangem várias células. |
| Bloco de arrastar "New event" | Bloco tracejado no painel esquerdo: escreva um título e arraste-o para um dia para criar aí o evento (toque para ativar em dispositivos táteis). |
| "+ New event" | Botão no canto superior direito que abre o modal com seletores de data **Title / Start / End** explícitos. |
| Cartões KPI | Contagens **Total** e **Upcoming** (upcoming = data de início hoje ou posterior). |
| Lista "This month's events" | Lista dos eventos do mês atual no painel esquerdo; clique num deles para editar. |
| Reagendar | Arraste o chip de um evento para outro dia; a sua duração é preservada. |
| Seletor New / Old | Seletor no canto superior direito que alterna toda a ferramenta entre a interface React (**New**, predefinido) e a ferramenta FullCalendar legada num iframe (**Old**). |

![O painel esquerdo "New event": um campo de título e o bloco de arrastar tracejado com a indicação "Drag this block onto a calendar day"](/screenshots/react/melis-calendar/meliscalendar-tool-calandar-new-event.png)

![O modal de evento — seletores de data Title, Start e End, Cancel / Save; ao abrir um evento existente, o mesmo modal apresenta um botão Delete](/screenshots/react/melis-calendar/meliscalendar-tool-calandar-event-edition.png)

Regras aplicadas ao guardar: o título é obrigatório (≤ 255 caracteres); se **End** for anterior a **Start**, é fixado em **Start**, pelo que o fim de um evento é sempre ≥ o seu início.

## API React

As rotas residem em `config/react-api.php` (fundidas via `MelisCalendar\Module::getConfig()`), servidas por `MelisCalendar\Controller\MelisReactApiCalendarController`. Todas sob `/melis/react-api/calendar-events`, com o contrato de resposta `{ success, data, error }`, datas como `YYYY-MM-DD` (sem hora). Cada pedido envia `X-Requested-With: XMLHttpRequest` com `credentials: 'include'`.

| Método e URL | Ação | Objetivo |
| --- | --- | --- |
| `GET /calendar-events[?from=&to=]` | `list` | Eventos que se sobrepõem à janela → `{ items: [{id,title,start,end}] }` |
| `GET /calendar-events/stats` | `stats` | KPI `{ total, ongoing, upcoming }` |
| `GET /calendar-events/:id` | `get` | Um evento `{id,title,start,end}` |
| `POST /calendar-events/save` | `save` | Criar (sem `id`) / atualizar (com `id`); também usado para reagendar |
| `DELETE /calendar-events/delete/:id` | `delete` | Eliminar um evento |

A ordem das rotas é importante: `/stats`, `/save` e `/delete/:id` são declaradas antes da rota genérica `/:id`.

```ts
// create OR reschedule/edit (omit id = create, include id = update)
await fetch('/melis/react-api/calendar-events/save', {
  method: 'POST', credentials: 'include',
  headers: { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: null, title: 'Kickoff', start: '2026-08-19', end: '2026-08-19' }),
})
```

> O controlador comunica diretamente com `melis_calendar` através de SQL parametrizado (`Laminas\Db\Adapter\AdapterInterface`), reproduzindo as regras legadas e os campos de auditoria (`cal_created_by` / `cal_last_update_by` de `MelisCoreAuth`). **Não** chama `MelisCalendarService`.

## Capacidades (direitos avançados)

Declaradas em `config/react.capabilities.php` sob o nó folha da ferramenta `meliscalendar_tool` (a mesma chave é a melisKey de proteção de acesso do controlador e a chave `can()` do front):

```php
return [
    'melisReactToolCapabilities' => [
        'meliscalendar_tool' => ['create', 'edit'],
    ],
];
```

Existem apenas duas capacidades:

- **`create`** — criar um evento (arrastar um novo título para um dia / "+ New event").
- **`edit`** — mover / reagendar (arrastar), editar **ou** eliminar um evento existente.

A visualização do calendário requer `create` **OU** `edit` (qualquer uma é suficiente): `list` / `stats` são protegidas no lado do servidor por `denyUnlessCanAny(['create','edit'])`, e na interface por `can('create') || can('edit')`. `save` requer `create` quando não há id e `edit` quando existe um id; `delete` requer `edit`. As proteções são de permissão por predefinição (capacidade não declarada é permitida) e com bypass para administradores.

## Serviços e eventos (estrutura legada)

O módulo continua a expor `MelisCalendarService` para acesso programático — usado pela ferramenta legada e por outros módulos, mas não pelo controlador React:

| Método | Função |
| --- | --- |
| `addCalendarEvent()` | Cria um novo evento. |
| `reschedCalendarEvent()` | Atualiza as datas de um evento existente. |
| `deleteCalendarEvent()` | Remove um evento. |

Um evento `meliscalendar_save_event_end` é despoletado após cada gravação. Outros módulos podem associar-se a ele para notificações ou sincronização com calendários externos:

```php
$sharedEvents->attach('MelisCalendar', 'meliscalendar_save_event_end', function ($e) {
    $params = $e->getParams();
    // custom notification or sync logic
}, 10);
```

## Widget de dashboard

Um widget de dashboard **Calendar** mostra os mesmos eventos no Dashboard do back-office sem abrir a ferramenta. É adicionado a partir do seletor de plugins do dashboard (secção MELIS CALENDAR) e é servido pelo `MelisCalendarEventsPlugin` legado.

![O widget Calendar no Dashboard React — uma grelha mensal compacta com o dia de hoje destacado, além dos seus controlos de engrenagem / atualizar / fechar](/screenshots/react/melis-calendar/meliscalendar-dashboardplugins-calandar.png)

![O painel "Add a widget" do dashboard — o widget Calendar na secção MELIS CALENDAR](/screenshots/react/melis-calendar/meliscalendar-dashboardplugins-menu-selector.png)

## Tabelas de base de dados

| Tabela | Contém |
| --- | --- |
| `melis_calendar` | Uma linha por evento; inclui campos de auditoria que registam a criação e a última modificação. |

Ver também: [melis-core](/pt/reference/modules/melis-core)
