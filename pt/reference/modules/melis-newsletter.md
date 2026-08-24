# MelisNewsletter

> Transforma uma página CMS numa newsletter de e-mail personalizada e entrega-a a grupos de subscritores, agora gerida a partir de um back-office React nativo. Pacote `melisplatform/melis-newsletter`.

## Objetivo

O MelisNewsletter reutiliza o sistema de páginas do CMS como modelo da newsletter: uma página assinalada com o tipo
**NEWSLETTER** é renderizada em HTML, personalizada por destinatário através de códigos BB (`[NAME]`,
`[FIRSTNAME]`, `[EMAIL]`, `[UNSUBSCRIBELINK]`), e enviada aos subscritores e/ou grupos selecionados
através de um transporte de correio configurável. Os subscritores estão organizados numa lista por site e podem ser
segmentados em grupos. Cada envio é arquivado com uma cópia HTML completa e um registo por destinatário;
um plugin de front de anulação de subscrição e uma integração RGPD completa estão incluídos de origem.

Na v6, a ferramenta é disponibilizada como um **brick React nativo e completo** no back-office `/melis-react`. A lógica
de negócio (serviços, mecanismo de envio, RGPD, tabelas) permanece inalterada; apenas a camada de apresentação passou para React,
servida através de uma camada JSON `react-api` exposta pelo módulo.

## Ativação

Adicione a `config/melis.module.load.php`:

```php
return [
    'MelisNewsletter',
];
```

Requer `melis-core` e `melis-cms`; funcionalmente depende também de `melis-engine` e `melis-front`
para a renderização de páginas e para o plugin de anulação de subscrição. A ferramenta React aparece no menu **apenas quando o
módulo está ativado** (deteção modular de bricks via `GET /melis/react-api/react-modules`). Remover
`MelisNewsletter` de `melis.module.load.php` faz o brick desaparecer.

## Back-office (React)

Barra lateral esquerda → **MelisMarketing → Newsletter** (`fa fa-newspaper-o`), rota de montagem
`/melis-marketing/melis-newsletter-tool-config`. Abre como uma ferramenta única cujo cabeçalho apresenta o
título *Newsletters*, o subtítulo *"Subscribers, groups, history and send configuration"* e um
seletor **New / Old** (canto superior direito). *New* é a interface React (predefinição); *Old* renderiza a ferramenta antiga num
iframe (`/melis/react-tool-page?key=melis_newsletter_tool_display`).

Ao contrário de uma ferramenta de tipo host-sub-tab, a Newsletter renderiza os seus quatro ecrãs como **os seus próprios separadores React**:

| Separador | Conteúdo |
| --- | --- |
| Subscribers | Cartões de KPI (Total / Active / Inactive), pesquisa, filtros de estado + site, gestor de colunas, **Import** CSV, **Export**, **Add selection to group(s)**, **+ New subscriber**. Tabela: Status / Email / First name / Last name / Site / Groups com edição/eliminação por linha |
| Groups | Cartões de KPI, pesquisa, filtro de estado, Export, **+ New group**. Tabela: Status / Name / Created / Members (contagem) com edição/eliminação |
| History | Arquivo só de leitura. Cartões de KPI (Sends / Sites / Today), pesquisa, filtro de site, Export. Tabela: Page / Site / Version / Sent on com um **olho** por linha para visualizar o HTML arquivado exato |
| Configuration | A **configuração de transporte** SMTP global única: Host / Username / Password (+ confirmação). Vazio = o transporte predefinido do Melis |

![O separador Subscribers na ferramenta React Newsletter](/screenshots/react/melis-newsletter/melisnewsletter-tool-newsletter-tab-subscribers.png)

Abrir ou criar um **subscritor** ou **grupo** não abre um novo separador principal — abre o
editor de registo (SubscriberForm / GroupForm) num **sub-separador de host** nativo (drill-down, com chave `s-<id>` /
`g-<id>`). O formulário de subscritor contém o nome próprio/apelido, o e-mail, o site, um seletor Active e as
associações a grupos; o formulário de grupo contém o nome, um seletor Active e os membros do grupo (adicionar/remover +
seletor de subscritores).

![O separador Groups na ferramenta React Newsletter](/screenshots/react/melis-newsletter/melisnewsletter-tool-newsletter-tab-groups.png)

![O separador History na ferramenta React Newsletter](/screenshots/react/melis-newsletter/melisnewsletter-tool-newsletter-tab-history.png)

![O separador Configuration na ferramenta React Newsletter](/screenshots/react/melis-newsletter/melisnewsletter-tool-newsletter-tab-config.png)

Por razões de segurança, a palavra-passe SMTP armazenada **nunca é devolvida ao navegador** — os campos mostram um
marcador de posição mascarado e deixá-los vazios ao guardar mantém a palavra-passe atual.

### Enviar uma newsletter

A ação **Send** não é um separador. É uma janela modal (`NewsletterSendModal`) exposta via
`window.__melisNewsletterSendModal`, que o **editor de páginas React renderiza** para páginas do tipo
**NEWSLETTER**. Defina um assunto, escolha grupos e/ou subscritores, faça primeiro um **Test** para um subscritor escolhido ou um
endereço de e-mail livre e, em seguida, **Send**. Em caso de sucesso, dispara um evento `melis:newsletter-sent` para que
o separador persistente History seja atualizado. Variáveis de personalização no conteúdo: `[NAME]`, `[FIRSTNAME]`,
`[EMAIL]`, `[UNSUBSCRIBELINK]`. Publique a página antes de enviar.

## API React

As rotas residem em `config/react-api.php` (integradas via `MelisNewsletter\Module::getConfig()`), servidas como
rotas-filho da ponte genérica `melis-react-api` sob `/melis/react-api/newsletter`. Controlador
`MelisNewsletter\Controller\MelisReactApiNewsletterController`; contrato JSON `{ success, data, error }`;
cada pedido transporta `X-Requested-With: XMLHttpRequest` + credenciais. Endpoints selecionados:

| Método & URL (relativos a `/melis/react-api/newsletter`) | Objetivo |
| --- | --- |
| `GET /subscribers` · `/subscribers/stats` · `/subscribers/:id` | Lista por keyset (`search`, `active`, `site`, `group`, `sort`, `dir`, `after`), KPI, um registo |
| `POST /subscribers/save` · `/subscribers/import` | Criar/atualizar; importação CSV em massa → `{imported,skipped,errors}` |
| `DELETE /subscribers/delete/:id` | Eliminar |
| `GET /groups` · `/groups/stats` · `/groups/:id` · `/groups/:id/members` | Lista de grupos, KPI, registo, membros |
| `POST /groups/save` · `/groups/:id/members/add` · `/groups/members/bulk-add` | Guardar; adicionar membro; atribuição em massa de `subscriberIds[]` a `groupIds[]` |
| `DELETE /groups/delete/:id` · `/groups/members/remove/:mid` | Eliminar grupo; remover associação (`mid` = `nlgu_id`) |
| `GET /history` · `/history/stats` · `/history/:id` | Lista do arquivo de envios, KPI, HTML arquivado de um envio |
| `GET /config` · `POST /config/save` | Configuração SMTP (palavra-passe não devolvida; apenas `hasPassword`) / guardar |
| `GET /send-options` · `POST /send` · `POST /test` | Opções da janela modal de envio; enviar; envio de teste |

O controlador React **reutiliza o serviço Laminas do módulo** (`MelisNewsletterService`) para o trabalho
pesado — o envio/teste passa por `sendNewsletter()` / `testNewsletter()` / `testNewsletterCustomMail()`,
e as validações espelham `saveSubscriber` / `importFileValidator` / `saveConfig` — pelo que o caminho React
reproduz exatamente as regras de negócio antigas.

## Capacidades (direitos avançados)

Declaradas em `config/react.capabilities.php` sob o nó portador de direitos
**`melis_newsletter_tools_section`** (não a chave de manifesto/zona `melis_newsletter_tool_display`). Uma
árvore por separador mais uma ação `send` transversal, achatadas em cadeias com pontos:

```
melis_newsletter_tools_section
├─ action: send                              (Send / Test — a janela modal do editor de páginas)
├─ tab subscribers: list · create · edit · delete · export
├─ tab groups:      list · create · edit · delete · export
├─ tab history:     list                     (só de leitura)
└─ tab config:      edit                     (transporte SMTP)
```

O React lê-as via `useCaps('melis_newsletter_tools_section').can('…')` e condiciona os seus botões de
ação; do lado do servidor, cada ação de mutação é protegida (`denyUnlessAccess()` e depois `denyUnlessCan()`).
`react.capabilities.php` também integra uma ação `newsletter` sob o nó partilhado `meliscms_page`, para que
o botão Send do editor de páginas seja condicionável em Users → Rights.

## Serviços principais

| Alias do serviço | Papel |
| --- | --- |
| `MelisNewsletterService` | Serviço central para subscritores, grupos, envio/teste, arquivo e configuração. Dispara eventos `*_start` / `*_end`. |
| `MelisNewsletterGdprAutoDeleteService` | Implementa `MelisCoreGdprAutoDeleteInterface`; conduz o fluxo agendado de aviso/eliminação RGPD para subscritores inativos há muito tempo. |

Aliases dos gateways de tabela: `MelisNewsletterSubscribersTable`, `MelisNewsletterGroupsTable`,
`MelisNewsletterGroupsPeopleTable`, `MelisNewsletterArchiveTable`,
`MelisNewsletterRecipientsTable`, `MelisNewsletterConfigTable`.

## Mecanismo de envio

`MelisNewsletterService::sendNewsletter($pageId, $subscribers, $groups, $mailSubject)`:

1. **Resolver destinatários** — subscritores explícitos + membros de grupos via `getSubscribersInGroup()`,
   filtrados apenas para os ativos, desduplicados.
2. **Renderizar conteúdo** — página CMS obtida como HTML; `href`/`src` relativos reescritos para URLs absolutos.
3. **Personalizar** — códigos BB substituídos por destinatário; `[UNSUBSCRIBELINK]` transporta o token com hash.
4. **Enviar** — através do transporte SMTP configurado ou do predefinido da plataforma.
5. **Arquivar** — uma linha `nlan_*` por envio (site, página, versão, HTML completo, data de envio) e uma
   linha `nlus_*` por destinatário.

**Envio de teste** (`testNewsletter()` / `testNewsletterCustomMail()`) entrega a um subscritor ou a um
e-mail arbitrário sem arquivar, e é obrigatório antes de um envio real ser desbloqueado.

## Front office

| Plugin | Chave de configuração | Descrição |
| --- | --- | --- |
| `MelisNewsletterUnsubscribePlugin` | `melisnewsletter` / `MelisNewsletterUnsubscribePlugin` | Coloque-o numa página `unsubscribe`. Lê o token `?s={hashed_id}` incorporado em `[UNSUBSCRIBELINK]`, chama `deactivateSubscriberById()`, mostra uma mensagem de sucesso/falha. Expõe uma definição `unsubscribe_data_salt` usada no hashing do token. |

Vistas: `plugins/unsubscribe.phtml` + `unsubscribe-modal-form.phtml`.

## Integração RGPD

Liga-se à estrutura RGPD do MelisCore tanto para fluxos a pedido como agendados:

- **A pedido:** `MelisNewsletterGdprUserInfoListener`, `…UserExtractListener`, `…UserDeleteListener`
  encontram, exportam e eliminam os dados de subscritor de uma pessoa mediante pedido. Colunas: `nlu_firstname`, `nlu_name`,
  `nlu_email`, `nlu_date_creation` (declaradas em `config/app.gdpr.php`).
- **Eliminação automática agendada:** `MelisNewsletterGdprAutoDeleteService` com nove listeners que cobrem o registo
  do módulo, a declaração de tags RGPD, a construção da lista de avisos, os e-mails de aviso e a eliminação final de
  subscritores inativos que não respondem.

## Tabelas da base de dados

| Tabela (alias → prefixo das colunas) | Contém |
| --- | --- |
| `MelisNewsletterSubscribersTable` (`nlu_*`) | Linhas de subscritores por site: e-mail, nome próprio/apelido, estado, data de criação |
| `MelisNewsletterGroupsTable` (`nlg_*`) | Definições de grupos: nome, estado, data de criação |
| `MelisNewsletterGroupsPeopleTable` (`nlgu_*`) | Ligação de associação subscritor ↔ grupo |
| `MelisNewsletterArchiveTable` (`nlan_*`) | Arquivo por envio: site, página, versão, corpo HTML completo, data de envio |
| `MelisNewsletterRecipientsTable` (`nlus_*`) | Registo de envio por destinatário: cópia de nome/nome próprio/e-mail, FK do arquivo |
| `MelisNewsletterConfigTable` (`nlc_*`) | Configuração de transporte SMTP por site: host, username, palavra-passe |

## Exemplo

```php
$nl = $serviceManager->get('MelisNewsletterService');

// Subscriber / group management (same service the react-api reuses)
$nl->saveSubscriber($data, $id);           // $id null → create
$nl->deactivateSubscriberById($id);
$nl->saveGroup($data, $id);
$nl->getSubscribersInGroup($grpId);

// Send flow
$nl->testNewsletter($pageId, $subId, $subject);
$nl->sendNewsletter($pageId, $subscribers, $groups, $subject);

// History & config
$nl->getNewsletterRecipients($archiveId);
$nl->saveNewsletterConfig($cfg);
```

## Ficheiros principais

| Aspeto | Caminho |
| --- | --- |
| Rotas da API React + controlador invocável | `vendor/melisplatform/melis-newsletter/config/react-api.php` |
| Capacidades React (com chave `melis_newsletter_tools_section`) | `vendor/melisplatform/melis-newsletter/config/react.capabilities.php` |
| Controlador da API React (reutiliza `MelisNewsletterService`) | `vendor/melisplatform/melis-newsletter/src/Controller/MelisReactApiNewsletterController.php` |
| Brick React (build Vite) + manifesto | `vendor/melisplatform/melis-newsletter/public/ui-react/brick.js` · `brick.manifest.json` |
| Configuração do módulo (serviços, gateways de tabela, controladores, plugin) | `vendor/melisplatform/melis-newsletter/config/module.config.php` |
| Serviço principal | `vendor/melisplatform/melis-newsletter/src/Service/MelisNewsletterService.php` |
| Serviço de eliminação automática RGPD | `vendor/melisplatform/melis-newsletter/src/Service/MelisNewsletterGdprAutoDeleteService.php` |
| Plugin de front de anulação de subscrição | `vendor/melisplatform/melis-newsletter/src/Controller/Plugin/MelisNewsletterUnsubscribePlugin.php` |
| Gateways de tabela | `vendor/melisplatform/melis-newsletter/src/Model/Tables/` |
| Instalação da BD + migrações | `vendor/melisplatform/melis-newsletter/install/dbdeploy/` |

Ver também: [melis-core](/legacy/reference/modules/melis-core), [melis-cms](/legacy/reference/modules/melis-cms),
[melis-front](/legacy/reference/modules/melis-front), [melis-engine](/legacy/reference/modules/melis-engine)
