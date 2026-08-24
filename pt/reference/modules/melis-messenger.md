# MelisMessenger

> Sistema de mensagens interno, de utilizador para utilizador, dentro do back-office Melis, apresentado no back-office React como um ícone de notificação na barra superior e um separador "Melis Messenger" em A Minha Conta. Pacote `melisplatform/melis-messenger`.

## Objetivo

O MelisMessenger acrescenta um sistema leve de mensagens privadas para que os colaboradores do back-office
possam comunicar entre si. Um utilizador inicia uma conversa com um ou mais outros utilizadores, as mensagens são trocadas e
atualizadas num intervalo de sondagem, e um selo de mensagens não lidas assinala novas mensagens a partir de qualquer ecrã. É uma
ferramenta exclusiva do back-office — não existe qualquer componente de front-office.

No back-office React (`/melis-react`) trata-se de um **brick nativo-React especial, não uma ferramenta
do menu esquerdo**. Não tem **qualquer entrada na barra lateral nem rota** (`route`, `forwardKey`, `melisKey` são todos `null`)
e, em vez disso, liga **dois widgets** a pontos de extensão do anfitrião:

1. um **ícone de messenger na barra superior** com um selo de contagem de não lidas (`MessengerHeader.tsx`), e
2. um **separador "Melis Messenger" dentro de A Minha Conta** (`MessengerTab.tsx`), um painel de conversação React nativo.

Os componentes React não incluem **qualquer `react-api` nem capacidades** — reutilizam os endpoints JSON
legacy existentes do módulo. A lógica de negócio permanece do lado do servidor em `MelisMessengerService`.

## Ativá-lo

Adicione a `config/melis.module.load.php`:

```php
return [
    'MelisMessenger',
];
```

Requer `melisplatform/melis-core`. A categoria do módulo é `core` com `dbdeploy` ativado, pelo que as suas
tabelas são instaladas através do mecanismo dbdeploy. Ambas as superfícies React aparecem **apenas quando o módulo está
ativo** — o separador de conta é protegido por `window.__melisIsModuleActive('MelisMessenger')`, e o
widget do cabeçalho é registado através do brick, que o anfitrião carrega apenas para módulos ativos.

## No back-office React

**Não existe qualquer entrada na barra lateral** para o Messenger. Acede-lhe de duas formas:

- **O ícone da barra superior** — um balão de conversação no cabeçalho do back-office, junto ao seletor de idioma.
  Um selo vermelho mostra a sua contagem de não lidas (`99+` acima de 99). Ao clicar nele abre-se **A Minha Conta** com o
  separador **Melis Messenger** pré-selecionado.

![O ícone de messenger da barra superior (destacado) situado junto ao seletor de idioma e aos outros widgets do cabeçalho; aparece nele um selo vermelho quando tem mensagens não lidas.](/screenshots/react/melis-messenger/melismessenger-platformheader-iconmessenger.png)

- **O separador Melis Messenger** — dentro de A Minha Conta (ícone de balão de conversação, junto a Perfil). Um painel
  React nativo que mostra os seus **Contactos** (conversas, mais recentes primeiro) ao lado do tópico da
  **conversa** selecionada (os seus balões à direita). Um botão **+** abre uma pesquisa de utilizadores para iniciar
  uma nova conversa, e um compositor no fundo permite-lhe escrever e **Enviar**. Ao abrir uma
  conversa esta é marcada como lida, pelo que o selo do cabeçalho desaparece de imediato.

![O separador React "Melis Messenger" dentro de A Minha Conta — a lista de Contactos (com "+" para iniciar uma nova conversa), o tópico de balões de mensagens da conversa selecionada e o compositor "Write a message… / Send". O interruptor New/Old (canto superior direito) pode recuar para o perfil legacy.](/screenshots/react/melis-messenger/melismessenger-tool-profile-tab-messenger.png)

O selo e o tópico aberto atualizam-se num temporizador, quando o separador do navegador recupera o foco, e assim
que abre uma conversa. Num ecrã estreito (~abaixo de 560px) o separador colapsa para uma coluna de cada
vez (Contactos *ou* conversa) com um botão de retrocesso, como uma aplicação de conversação móvel. Um interruptor **New / Old**
na página de conta recua para o perfil legacy num iframe; nesse caso o ícone do cabeçalho
comanda o DOM do iframe para abrir antes o separador Messenger legacy.

## O brick

A UI React reside em `ui-react/` e compila (Vite IIFE, React/ReactRouter externalizados para os
globais do anfitrião) para `public/ui-react/brick.js` juntamente com `brick.manifest.json`. O manifesto declara
que isto não é uma ferramenta — repare nos nulos:

```json
{ "id": "messenger", "route": null, "label": "Messenger",
  "forwardKey": null, "melisKey": null, "entry": "brick.js" }
```

`ui-react/src/brick.tsx` regista **duas superfícies do anfitrião** para o id `messenger`, ambas condicionadas à
ativação do módulo:

```tsx
// 1) My-Account tab — modular extension point
window.__melisAccountTabs.push({
  id: 'messenger', label: 'Melis Messenger', icon: <ChatIcon />, order: 10,
  render: () => <MessengerTab />,
})
window.dispatchEvent(new CustomEvent('melis-account-tabs-changed'))

// 2) Topbar icon — the brick's Header widget
window.__melisRegisterBrick?.({ id: 'messenger', Header: MessengerHeader })
```

| Componente | Papel |
| --- | --- |
| `brick.tsx` | Ponto de entrada. Regista o widget Header e adiciona o separador A Minha Conta. |
| `MessengerHeader.tsx` | Ícone da barra superior + selo de não lidas. Sonda `getNewMessage` para obter a contagem, guarda a última contagem em `sessionStorage` para pintura instantânea, recontabiliza em foco/visibilidade e no evento `melis-messenger-unread-changed`. Ao clicar abre A Minha Conta e pré-seleciona o separador Messenger. |
| `MessengerTab.tsx` | O painel de conversação React nativo: lista de Contactos, tópico da conversa, compositor, pesquisa de utilizadores para "nova conversa". Lê/escreve nos endpoints JSON legacy; responsivo; despacha `melis-messenger-unread-changed` quando marca uma conversa como lida. |

Como o bundle externaliza apenas `react` / `react-dom` / `react-router-dom` para os globais do anfitrião
(não pode importar Tailwind/shadcn/lucide/i18n), os componentes usam estilos inline com variáveis CSS do anfitrião
e um dicionário `{fr,en}` no próprio ficheiro indexado por `document.documentElement.lang`.

## Endpoints reutilizados

O módulo não inclui **qualquer `config/react-api.php`**. Ambos os componentes React chamam os endpoints JSON legacy
existentes de `MelisMessenger\Controller\MelisMessengerController` sob
`/melis/MelisMessenger/MelisMessenger/…`, enviando `X-Requested-With: XMLHttpRequest` e
`credentials: 'include'`.

**Header (`MessengerHeader.tsx`) — o sondador do selo:**

| Método e URL | Objetivo |
| --- | --- |
| `GET …/getNewMessage` | Mensagens não lidas → `{ messages: [...] }`; contagem do selo = `messages.length`. |
| `GET …/getMsgTimeInterval` | Intervalo de sondagem da plataforma `{ interval }` (predefinição 60 000 ms). |

O cabeçalho limita a sondagem a `min(interval, 10 000 ms)` para que o selo, sempre visível, se mantenha reativo.

**Separador A Minha Conta (`MessengerTab.tsx`) — o painel de conversação:**

| Método e URL | Objetivo |
| --- | --- |
| `GET …/getContactListByDate` | Conversas ordenadas pela data da última mensagem → `{ data: ContactRow[] }`. |
| `GET …/getConversation/:id?limit=&offset=` | Mensagens de uma conversa → `{ data: Message[], user_id }`. |
| `GET …/getUserListForConversation?search=` | Pesquisa de utilizadores para "nova conversa" → `{ data: UserRow[] }`. |
| `POST …/createConversation` | Iniciar uma conversa (`mbrids=<userId>`) → `{ conversationId }`. |
| `POST …/saveMessage` | Enviar uma mensagem (`msgr_msg_id`, `msgr_msg_cont_message`) → `{ success }`. |
| `POST …/updateMessageStatus` | Marcar a conversa aberta como lida (`id=<convoId>`) — disparado ao abrir/responder. |
| `GET …/getMsgTimeInterval` | Intervalo de sondagem para a atualização do tópico. |

`getContactListByDate` e `getUserListForConversation` são usados especificamente pelo separador React
(lista ordenada por data + pesquisa de utilizadores do lado do servidor); as ações mais antigas `getContactList` / `renderMessenger*`
continuam a alimentar a ferramenta legacy e mantêm-se inalteradas.

## Serviços principais

| Alias | Papel |
| --- | --- |
| `MelisMessengerService` | Serviço público de mensagens: enviar e ler mensagens/conversas. |
| `MelisMessengerMsgTable` | Table gateway para `melis_messenger_msg`. |
| `MelisMessengerMsgContentTable` | Table gateway para `melis_messenger_msg_content`. |
| `MelisMessengerMsgMembersTable` | Table gateway para `melis_messenger_msg_members`. |

Os métodos de `MelisMessengerService` disparam eventos `melismessenger_*_start` / `*_end` para cada chamada de leitura/listagem
(por exemplo, `melismessenger_get_conversation_start` / `_end`):

| Método | Papel |
| --- | --- |
| `saveMsg($data)` | Cria/atualiza uma conversa; devolve o id da conversa. |
| `saveMsgMembers($data)` | Associa um utilizador a uma conversa. |
| `saveMsgContent($data)` | Guarda uma mensagem dentro de uma conversa. |
| `getConversation($id)` | Obtém uma conversa completa pelo id. |
| `getConversationWithLimit($id, $limit, $offset)` | Obtenção paginada de uma conversa. |
| `getNewMessage($id)` | Obtém mensagens novas/não lidas desde a última sondagem. |
| `updateMessageStatus($data, $msg_id, $user_id)` | Marca mensagens como lidas para um utilizador. |
| `getContactList($convo_id, $user_id)` | Resolve os contactos de uma conversa. |
| `prepareConversationId($userId)` | Lista os ids das conversas a que um utilizador pertence. |
| `getUserRightsForMessenger()` | Verifica os direitos de acesso do utilizador atual ao módulo. |

## Tabelas da base de dados

| Tabela | Contém |
| --- | --- |
| `melis_messenger_msg` | Uma linha por conversa (`msgr_msg_id`, `msgr_msg_creator_id`, `msgr_msg_date_created`). |
| `melis_messenger_msg_members` | Utilizadores que participam numa conversa (`msgr_msg_mbr_id`, `msgr_msg_id`, `msgr_msg_mbr_usr_id`). |
| `melis_messenger_msg_content` | Mensagens individuais (`msgr_msg_cont_id`, remetente, texto da mensagem, data, estado). |

## Capacidades

**Nenhuma.** O módulo não tem `config/react.capabilities.php` nem nó de menu portador de direitos — não é
uma ferramenta de menu. O acesso é protegido pelos endpoints legacy, que exigem uma sessão de back-office
autenticada, e as superfícies são condicionadas à ativação do módulo. Não existem strings de capacidade
`MelisCan(...)` a declarar ou verificar para o Messenger.

## Exemplo

```php
$messenger = $this->getServiceManager()->get('MelisMessengerService');

// Create a conversation, add a member, then post a message
$convoId = $messenger->saveMsg($data);
$messenger->saveMsgMembers(['msgr_msg_id' => $convoId, 'msgr_msg_mbr_usr_id' => $userId]);
$messenger->saveMsgContent(['msgr_msg_id' => $convoId, 'msgr_msg_cont_message' => 'Hi']);

// Read messages
$thread = $messenger->getConversation($convoId);
$page   = $messenger->getConversationWithLimit($convoId, 10, 0);
$new    = $messenger->getNewMessage($convoId);

// Mark read
$messenger->updateMessageStatus($data, $msgId, $userId);
```

## Ficheiros principais

| Assunto | Caminho |
| --- | --- |
| Configuração do módulo (rotas, serviços, controladores) | `vendor/melisplatform/melis-messenger/config/module.config.php` |
| Declaração de interface (separador Profile legacy + ícone do cabeçalho) | `vendor/melisplatform/melis-messenger/config/app.interface.php` |
| Configuração de formulários | `vendor/melisplatform/melis-messenger/config/app.forms.php` |
| Configuração de ferramentas | `vendor/melisplatform/melis-messenger/config/app.tools.php` |
| Serviço público | `vendor/melisplatform/melis-messenger/src/Service/MelisMessengerService.php` |
| Controlador principal (endpoints JSON reutilizados pelo React) | `vendor/melisplatform/melis-messenger/src/Controller/MelisMessengerController.php` |
| Table gateways | `vendor/melisplatform/melis-messenger/src/Model/Tables/` |
| Brick React (widget Header + separador A Minha Conta) | `vendor/melisplatform/melis-messenger/ui-react/src/` |
| Brick compilado + manifesto | `vendor/melisplatform/melis-messenger/public/ui-react/brick.js`, `brick.manifest.json` |
| Delta de instalação da BD | `vendor/melisplatform/melis-messenger/install/` |

Ver também: [melis-core](/pt/reference/modules/melis-core)
