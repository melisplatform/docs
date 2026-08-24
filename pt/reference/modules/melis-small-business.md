# MelisSmallBusiness

> Complemento para equipas editoriais destinado ao CMS — **perfis de utilizador**, um **fluxo de validação**, **controlo de versões** de páginas, **comentários** e **bloqueio de páginas**, além de uma **biblioteca de multimédia** TinyMCE, disponibilizados através do back-office React. Pacote `melisplatform/melis-small-business`.

## Objetivo

`MelisSmallBusiness` acrescenta ferramentas de colaboração para pequenas equipas por cima do editor de
páginas do CMS. Mantém **versões** das páginas publicadas (restaurar/pré-visualizar um estado
anterior), gere um **fluxo** de conteúdo em que um editor pede a validação e um revisor a valida ou
recusa, associa **comentários** às páginas, impede que dois utilizadores editem a mesma página em
simultâneo através de um **bloqueio de página**, gere uma ferramenta personalizada de **perfis de
utilizador** e inclui uma **biblioteca de multimédia** baseada em TinyMCE (MoxieManager). A lógica de
negócio permanece no servidor (serviços Laminas, eventos do editor do CMS); na v6, toda a superfície
voltada para o utilizador é um conjunto de bricks React e contribuições modulares.

## Ativação

Trata-se de um módulo Laminas padrão. Adicione-o a `config/melis.module.load.php`:

```php
return [
    // …
    'MelisSmallBusiness',
];
```

Depende de `melis-core`, `melis-engine`, `melis-front` e `melis-cms`, e as suas tabelas são criadas
via dbdeploy (`extra.dbdeploy = true`). Cada superfície React abaixo aparece **apenas quando o módulo
está ativo** (deteção de bricks via `GET /melis/react-api/react-modules`).

## Superfícies React

No back-office React (`/melis-react`), o módulo inclui **dois bricks** e **duas contribuições
modulares** que não têm uma rota própria.

| Superfície | Tipo | Rota / anfitrião |
| --- | --- | --- |
| **User Roles** (`smallbusiness`) | full-React nativo (alternância New/Old) | `/melis-core/user-roles` |
| **Media library** (`smallbusiness-medialib`) | brick iframe (MoxieManager) | `/melis-cms/media-library` |
| **Modal de fluxo** | modal partilhado (`window.__melisWorkflowModal`) | renderizado por News / Blog / editor de páginas do CMS / Newsletter + widget do painel |
| **Versões / Comentários / Bloqueio** | separadores + faixa no editor de páginas do CMS | contribuído para o nó de capacidade `meliscms_page` |
| **Perfil nos Utilizadores** | coluna/filtro/seletor de perfil | ferramenta anfitriã Users, condicionada por `useModuleActive('MelisSmallBusiness')` |

`public/ui-react/brick.manifest.json` declara ambos os bricks; `ui-react/src/brick.tsx` regista-os e
publica o modal de fluxo como uma variável global do `window`, para que outros bricks possam renderizar
uma única implementação partilhada.

## Ferramenta User Roles

**Onde:** barra lateral → **MelisCore → User Roles** (`/melis-core/user-roles`).

Um **perfil** é um conjunto de direitos com nome, armazenado uma única vez (`melis_core_user_role`) e
atribuído a vários utilizadores. A lista mostra todos os perfis com cartões de KPI (Roles / Assigned),
pesquisa, um gestor de Colunas, Exportação e uma alternância **New / Old** (Old = a ferramenta clássica
num iframe). Cada linha (ID, Nome, Criado, Nº de utilizadores) tem ações de editar/eliminar; um perfil
atribuído a utilizadores **não pode ser eliminado**.

![Lista de perfis no back-office React](/screenshots/react/melis-small-business/melissmallbusiness-tool-roles-list.png)

Editar um perfil abre um subseparador com um campo **Role name** e uma árvore de **Access rights** que
reflete a árvore de direitos dos Utilizadores (TOOLS agrupadas por secção, List/Create/Edit/Delete/Export
por ferramenta, mais as secções Pages e Dashboard-plugins). **Save** persiste o nome e o XML
`urole_rights`.

![Editor de perfis e a sua árvore de direitos](/screenshots/react/melis-small-business/melissmallbusiness-tool-roles-edit-and-rights.png)

::: warning
Escrever o XML de **direitos** de um perfil requer um administrador da plataforma (`usr_admin`); um
não-administrador que edite um perfil recebe um 403 na escrita dos direitos. Isto bloqueia um caminho de
escalonamento de privilégios (forjar um perfil com todos os direitos e depois autoatribuí-lo). O **nome**
do perfil pode ser alterado por qualquer pessoa com o direito `edit` da ferramenta.
:::

### Perfil na ferramenta Users

Quando o módulo está ativo, a ferramenta **Users** do MelisCore ganha uma coluna + filtro **Role** na
lista e um seletor **Role** no formulário de utilizador (a par de Status e Rights). A lista pendente é
alimentada por `GET /melis/react-api/roles` (a lista de seletor do MelisCore); ao guardar, um listener
reinjeta as capacidades do perfil para que não se percam.

![Formulário de utilizador com o seletor Role](/screenshots/react/melis-small-business/melissmallbusiness-tooloverride-users-edit-withrole.png)

## Biblioteca de multimédia

**Onde:** barra lateral → **MelisCms → Media library** (`/melis-cms/media-library`).

O navegador de ficheiros avançado do TinyMCE / **MoxieManager**: pastas à esquerda, ficheiros à direita
(nome, tamanho, tipo, data), com Create, Upload, vista de lista/grelha, Sort, Filter e atalhos
Favorites/History/Uploaded. A página React é um invólucro leve que renderiza um iframe de separador
completo para o moxiemanager legado
(`/melis/MelisSmallBusiness/js/tinyMCE/moxiemanager/index.php?lang=xx`), pelo que o comportamento é
idêntico ao da ferramenta clássica — sem react-api própria.

![Biblioteca de multimédia — navegador MoxieManager num separador React](/screenshots/react/melis-small-business/melissmallbusiness-tool-medialibrary.png)

## Fluxo (validação de páginas)

O Fluxo permite que um editor **peça** a validação e que um validador **responda**. O **mesmo modal**
abre a partir do editor de páginas do CMS (botão **Workflow**), dos editores de News e Blog e do widget
do painel. É genérico quanto ao tipo de item — `PAGE`, `NEWS`, `BLOG`.

Em **Ask for validation**, escolha um **Role** para notificar todas as pessoas com esse perfil, ou
**"1 person only"** para revelar uma lista pendente **User** e visar uma única pessoa, e depois
**Send request**.

![Modal de fluxo — pedir a uma única pessoa](/screenshots/react/melis-small-business/melissmallbusiness-pageoverride-workflow-demand-1person.png)

O separador **History** do modal lista todos os pedidos e respostas (Date, Status, To/Role, From,
Action). Quem recebe um pedido em aberto obtém botões **Validate** / **Refuse** e pode anexar uma nota.

![Modal de fluxo — histórico com Validate/Refuse](/screenshots/react/melis-small-business/melissmallbusiness-pageoverride-workflow-demand-to-validated.png)

O **Painel** do back-office mostra um widget **Workflow** que lista pedidos, dividido em *Users' demands*
/ *My demands* com subseparadores PAGE / NEWS; cada linha mostra uma etiqueta de estado (VALIDATED /
REFUSED / Demand) e oferece validação inline (✓) / recusa (✗) e ações de pré-visualização nos pedidos
que lhe são dirigidos.

![Widget Workflow do painel](/screenshots/react/melis-small-business/melissmallbusiness-dashboardplugins-workflow.png)

## Versões e Comentários (editor de páginas do CMS)

Abrir uma página no editor do CMS acrescenta dois separadores SmallBusiness a seguir aos nativos:

- **Versioning** — uma lista paginada dos instantâneos da página (No., Name, Modified on, By) com
  View / Restore / Rename por linha. É criado um instantâneo em cada publicação.

  ![Editor de páginas — separador Versioning](/screenshots/react/melis-small-business/melissmallbusiness-pageoverride-edit-tab-versionning.png)

- **Comments** — a cronologia de atividade da página, misturando comentários de utilizadores e eventos
  de fluxo (do mais recente para o mais antigo), com uma caixa "Add a comment".

  ![Editor de páginas — separador Comments](/screenshots/react/melis-small-business/melissmallbusiness-pageoverride-tab-comments.png)

Uma faixa de **bloqueio de página** + botão **Unlock** aparecem quando outro utilizador detém o bloqueio
da página.

## Endpoints da react-api

Todos sob `/melis/react-api/…`, contrato `{ success, data, error }`. Os controladores residem neste
módulo (`config/react-api.php` + `src/Controller/MelisReactApi*Controller.php`).

| Controlador | Rotas base | Guarda |
| --- | --- | --- |
| `MelisReactApiRoleController` | `GET /user-roles`, `/user-roles/stats`, `/user-roles/:id`; `POST /user-roles/save`; `DELETE /user-roles/delete/:id` | acesso a `melissb_tool_userrole` + capacidade (escrita do XML de direitos = apenas admin) |
| `MelisReactApiWorkflowController` | `GET /workflow/roles`, `/workflow/users`, `/workflow/history`; `POST /workflow/ask` | apenas autenticação |
| `MelisReactApiPageVersioningController` | `GET /cms-page/versioning` | apenas autenticação |
| `MelisReactApiPageCommentsController` | `GET /cms-page/comments`, `/cms-page/timeline`; `POST /cms-page/comments/save` | apenas autenticação |
| `MelisReactApiPageLockController` | `GET /cms-page/lock`; `POST /cms-page/unlock` | apenas autenticação |

As **mutações** de fluxo reutilizam os endpoints legados já comprovados em vez da react-api:
`GET /melis/MelisSmallBusiness/MelisWorkflow/saveWorkflowActions` (validar / recusar) e
`POST /melis/MelisSmallBusiness/MelisWorkflow/addWorkflowComments` (adicionar uma nota). O texto dos
comentários é sanitizado com HTMLPurifier ao guardar.

## Capacidades

`config/react.capabilities.php` **contribui** com o botão do editor de páginas + separadores sob a chave
partilhada `meliscms_page` pertencente ao MelisCms (integrados, pelo que o MelisCms não precisa de
conhecer o SB):

| Tipo | Chave | Rótulo |
| --- | --- | --- |
| action | `workflow` | Botão Workflow |
| action | `unlock` | Botão Unlock |
| tab | `melissb_page_versioning` | Separador Versioning |
| tab | `melissb_page_comments` | Separador Comments |

`CmsPage.tsx` filtra esses separadores / oculta esses botões via `useCaps('meliscms_page').can(cap)`. A
própria ferramenta Roles tem a chave `melissb_tool_userrole` e a biblioteca de multimédia a chave
`melissb_medialib`.

## Tabelas da base de dados

Criadas por `install/dbdeploy/126618_melis_sb_install.sql`.

| Tabela | Função |
| --- | --- |
| `melis_sb_page_versioning` | Cópias arquivadas de páginas publicadas (suporta o separador Versioning). |
| `melis_sb_workflow` | Registos de fluxo por item. |
| `melis_sb_workflow_events` | Eventos de fluxo (ask / validate / refuse). |
| `melis_sb_page_comment` | Comentários associados a uma página (tipo de comentário 1 = PAGE, 2 = WORKFLOW). |
| `melis_sb_page_comment_type` | Tipos de comentário. |
| `melis_sb_page_locked` | Bloqueios de página ativos (qual utilizador está a editar qual página). |
| `melis_core_user_role` | Perfis com nome (`urole_id`, `urole_name`, `urole_creation_date`, XML `urole_rights`). |

## Serviços principais

| Alias do serviço | Função |
| --- | --- |
| `MelisEnginePage` | O módulo **substitui** o serviço de páginas do engine por `MelisSBPageService`; na rota de pré-visualização de versão devolve a árvore versionada de `melis_sb_page_versioning`, caso contrário comporta-se como o serviço original. |
| `MelisSBPageCommentService` | Comentários de páginas: `getPageComments()` / `setPageComments()`. |

::: warning
Ao atribuir o alias `MelisEnginePage` à sua própria classe, este módulo substitui o serviço de páginas do
núcleo para toda a aplicação enquanto estiver ativo. Tenha isto em conta ao ordenar os módulos.
:::

O fluxo envia três emails de back-office (`app.emails.php`): `WF_DEMAND`, `WF_VALIDATED`, `WF_REFUSED`
(tags `USER_TO`, `USER_FROM`, `TYPE`, `DETAILS`).

## Ficheiros principais

| Assunto | Caminho |
| --- | --- |
| Bootstrap e listeners do módulo | `src/Module.php`, `src/Listener/` |
| Rotas da react-api + invokables | `config/react-api.php` |
| Controladores da react-api | `src/Controller/MelisReactApi{Role,Workflow,PageVersioning,PageComments,PageLock}Controller.php` |
| Contribuição de capacidades | `config/react.capabilities.php` |
| Serviço de páginas (substituição do engine) | `src/Service/MelisSBPageService.php` |
| Serviço de comentários | `src/Service/MelisSBPageCommentService.php` |
| Bricks React (fonte) | `ui-react/src/` (`brick.tsx`, `UserRolePage.tsx`, `MediaLibraryPage.tsx`, `WorkflowModal.tsx`, `RolesRightsTree.tsx`) |
| Bundle compilado | `public/ui-react/brick.js` + `brick.manifest.json` |
| SQL de instalação | `install/dbdeploy/126618_melis_sb_install.sql` |
