# MelisCmsUserAccount

> Sistema de contas para visitantes do site em front-office — registo, início de sessão e perfis por site para membros do website, administrado a partir de uma ferramenta de back-office React nativa. Pacote `melisplatform/melis-cms-user-account`.

## Objetivo

O MelisCmsUserAccount gere as contas de **visitantes do site** (front-office) — as pessoas que se registam e iniciam
sessão nos seus sites CMS. Estas são distintas das contas de pessoal de back-office geridas pelo MelisCore. As contas
têm âmbito **por site** (uma pessoa pode ter contas em vários sites). O módulo disponibiliza dois plugins de página
arrastáveis (formulário de início de sessão e formulário de registo), uma ferramenta de administração de back-office e um pipeline
completo de RGPD que abrange informação de dados, exportação de dados, eliminação anonimizada e um fluxo de trabalho automático de
expurgo de contas inativas. No arranque, adiciona também colunas de chave estrangeira às tabelas de blog/notícias/comentários para que uma
única passagem de RGPD possa revelar, exportar ou apagar tudo o que um utilizador possui nesses módulos.

Na v6, a ferramenta de administração de back-office (**Users FO**) é um **brick totalmente React nativo** — uma verdadeira
interface CRUD React que invoca uma camada JSON `react-api` — com um comutador **New / Old** que recorre à
ferramenta legada num iframe. A framework, os serviços, as tabelas, o mecanismo de RGPD e os plugins de front-office
permanecem inalterados; apenas a interface de administração migrou para React.

## Ativá-lo

Adicione a `config/melis.module.load.php`:

```php
return [
    'MelisCmsUserAccount',
];
```

Dependências do Composer: `melisplatform/melis-core` (framework de RGPD, sessões, ferramentas de BO) e
`melisplatform/melis-cms` (host de página/plugin). `melis-engine` e `melis-front` são incluídos
transitivamente para a renderização de front-office. A ferramenta React é descoberta automaticamente assim que o módulo está
ativo (disponibiliza um `brick.manifest.json`); remover o módulo de `melis.module.load.php` faz a
ferramenta desaparecer do back-office React.

## Serviços principais

| Alias do serviço | Função |
| --- | --- |
| `MelisCmsUserAccountService` | Serviço principal — também com o alias **`FrontUserAccountService`**. CRUD para utilizadores do site mais autenticação. |
| `MelisCmsUserAccountGdprAutoDeleteService` | Lógica do pipeline de eliminação automática de contas inativas (avisos + anonimização). |
| `FrontUserAccountTable` | Table gateway para `melis_cms_user_account`. |
| `MelisCmsUserSitesTable` | Table gateway para `melis_cms_user_account_sites`. |
| `MelisPasswordValidator` | Validador de política de palavra-passe (mín. 8 caracteres, uma minúscula, um dígito) aplicado no registo e ao guardar o perfil. |

Métodos principais em `MelisCmsUserAccountService` (com o alias `FrontUserAccountService`):

```php
$svc = $sm->get('FrontUserAccountService');

// Authenticate a site visitor
$result = $svc->siteUserAuthenticate($login, $password, $siteId);

// Create a new account
$id = $svc->createUser($data);

// Fetch by various keys
$user = $svc->getUserById($id);
$user = $svc->getUserByLogin($login);
$user = $svc->getUserByEmailAndPassword($email, $password);

// Persist profile changes
$svc->saveUserAccountData($id, $data);

// Site memberships for a user
$sites = $svc->getUsersSitesByUserId($id);

// Record a login timestamp (used by the auto-delete pipeline)
$svc->updateUserConnectionDate($id);
```

Em alternativa, dispare o evento `site_user_account_authentication` e deixe o
`MelisCmsUserAccountSiteUserAuthenticationListener` encaminhar a chamada para `siteUserAuthenticate()`; o
utilizador autenticado é então armazenado num `Laminas\Session\Container` indexado por site.

## Back-office (React) — Users FO

A ferramenta **Users FO** reside no back-office React (`/melis-react`), sob o grupo **MelisCms** da
barra lateral → **Utilisateurs FO** ("FO Users"). É um **brick totalmente React nativo** (não um iframe) montado
na rota de árvore `/melis-cms/user-account`; a chave de menu `melis_cms_user_account_tool_display` controla
o acesso, as capacidades e o iframe da vista Old. A ferramenta administra apenas **utilizadores do site** — nunca
pessoal de back-office (esses pertencem à ferramenta **Users** do MelisCore).

É um detalhamento de dois níveis exposto através dos **sub-separadores nativos** do host (`subTabs: true`): uma
**lista** plana de utilizadores do site e um único formulário **User** aberto por sub-separador.

![Lista Users FO em React — cartões de KPI (Total / Ativos / Inativos / Administradores), pesquisa, filtros de estado/administrador/site, Repor filtros, gestor de Colunas, Exportar, o comutador New / Old e + Novo utilizador; cada linha expõe as ações Ver sites, Editar e Eliminar](/screenshots/react/melis-cms-user-account/meliscmsuseraccount-tool-usersfo-list.png)

**Lista (nível 1)** — uma tabela pesquisável, ordenável e filtrável de todas as contas de front-office da
plataforma, com **cartões de KPI** (Total / Ativos / Inativos / Administradores). Controlos:

- **Pesquisa** (corresponde a login, email, primeiro nome, apelido)
- Filtro de **Estado** (Todos / Ativos / Inativos) e filtro de **Administrador** (Todos / Administrador / Não administrador)
- Seletor de **Site** (Todos os sites) e **Repor filtros**
- Gestor de **Colunas** (ocultar / reordenar colunas por arrastar e largar)
- **Exportação** para Excel ou CSV (executa do lado do cliente no brick através de SheetJS)
- Comutador **New / Old** (canto superior direito) e botão **+ Novo utilizador**

Colunas: **Id · Estado · Administrador · Imagem · Email · Login · Nome completo · Data de criação · Ação** (a
coluna Imagem é apenas de apresentação; clique em qualquer outro cabeçalho para ordenar). Cada linha expõe três ações:

| Ação | Descrição |
| --- | --- |
| Ver sites (🔍) | Modal que lista, por cada site a que o utilizador pertence, a data de registo, a hora do último início de sessão, se a adesão está **anonimizada** (RGPD) e os domínios do site. |
| Editar (✏️) | Abre o utilizador num sub-separador (ver abaixo). |
| Eliminar (🗑) | Remove a conta (irreversível). |

**Formulário de utilizador (nível 2)** — abrir uma linha ou **+ Novo utilizador** adiciona um sub-separador com um único formulário **User**:
**Login** (só de leitura ao editar), **Email**, **Primeiro nome**, **Apelido**, **Data de nascimento** (um
calendário no idioma da sessão), **Idioma**, uma **Data de criação** só de leitura, um painel **Imagem**
(pré-visualização + Escolher uma imagem / Remover imagem) e **Palavra-passe** / **Confirmar palavra-passe**. À direita,
os comutadores **Ativo** e **Administrador** e a lista de caixas de verificação **Sites** obrigatória. **Guardar** persiste
a conta.

![Formulário React de edição de utilizador — Login (só de leitura ao editar), Email, Primeiro nome/Apelido, Data de nascimento, Idioma, Data de criação só de leitura, painel Imagem, Palavra-passe / Confirmar palavra-passe, mais os comutadores Ativo e Administrador e a lista de caixas de verificação Sites obrigatória](/screenshots/react/melis-cms-user-account/meliscmsuseraccount-tool-usersfo-edit-tab-user.png)

> Os campos de palavra-passe incluem a dica *"Leave empty to keep unchanged"* — editar um perfil nunca força uma
> alteração de palavra-passe. Quando uma palavra-passe **é** introduzida, tem de satisfazer o `MelisPasswordValidator` (mín. 8 caracteres,
> uma minúscula, um dígito). **É obrigatório pelo menos um site**; um site já **anonimizado** (RGPD)
> para esse utilizador é silenciosamente descartado da submissão.

**Comutador New / Old** — toda a ferramenta alterna entre a interface React (**New**, predefinição) e a
ferramenta clássica renderizada num iframe (**Old**, `/melis/react-tool-page?key=melis_cms_user_account_tool_display`).
A ferramenta de BO legada continua a ser servida pelo **`MelisCmsUserAccountToolController`**, inalterado.

## Endpoints da API React

As rotas residem em `config/react-api.php`, servidas pelo controlador
`MelisReactApiUserAccountController` (alias invocável
`MelisCmsUserAccount\Controller\MelisReactApiUserAccount`). Todas sob `/melis/react-api/user-account`,
devolvendo o contrato `{ success, data, error }`.

| Método e URL | Objetivo |
| --- | --- |
| `GET /user-account` | Lista utilizadores (keyset: `limit`, `search`, `siteId`, `admin`, `status`, `sort`, `dir`, `after`) → `{items,total,nextCursor}`; cada item carrega `hasPicture` |
| `GET /user-account/stats` | KPI `{total, active, inactive, admins}` |
| `GET /user-account/sites` | Lista de sites da plataforma (filtro + caixas de verificação do formulário) → `[{id,label}]` |
| `GET /user-account/langs` | Lista de idiomas (seletor do formulário) → `[{id,label}]` |
| `GET /user-account/:id` | Um utilizador (adiciona `siteIds[]` + `pictureDataUrl`) — para edição |
| `GET /user-account/:id/picture` | Imagem da linha como `image/jpeg` (recorre ao avatar predefinido) |
| `GET /user-account/:id/sites` | Detalhe "Ver sites" por site: etiqueta, datas de registo/último início de sessão, `anonymized`, domínios |
| `POST /user-account/save` | Cria / atualiza a conta |
| `DELETE /user-account/delete/:id` | Elimina a conta |

`list`/`stats` consultam `melis_cms_user_account` diretamente com SQL parametrizado; `get`/`save`/`delete`/
`userSites` **delegam nos serviços legados** (`FrontUserAccountTable`, `FrontUserAccountService`) —
os mesmos serviços que a ferramenta legada utiliza, pelo que todas as regras de negócio (login/email único, hash de palavra-passe, ligações
de site, salvaguarda de site anonimizado do RGPD) e os eventos de registo de atividade
(`meliscms_user_account_tooluser_save` / `_delete`) são preservados.

## Capacidades

Declaradas em `config/react.capabilities.php` sob o nó de direitos
`melis_cms_user_account_tool_display`. A ferramenta é um CRUD plano, pelo que a declaração é uma lista plana:

```php
return [
  'melisReactToolCapabilities' => [
    'melis_cms_user_account_tool_display' => ['list', 'create', 'edit', 'delete', 'export'],
  ],
];
```

Cada ação da API chama primeiro `denyUnlessAccess()` (autenticação +
`MelisCoreRights::canAccess('melis_cms_user_account_tool_display')` → 401/403) e, em seguida, uma verificação de capacidade:

| Capacidade | Imposta em |
| --- | --- |
| `list` | `list`, `stats`, `picture` |
| `edit` | `get`, `userSites` e `save` quando existe um `id` (atualização) |
| `create` | `save` quando não há `id` (criação) |
| `delete` | `delete` |
| `export` | apenas declarativa — a exportação executa do lado do cliente no brick |

## Front office

Dois plugins de templating estão registados sob `config/plugins/` (inalterados na v6 — servidos pelo
renderizador de front-office, não pela ferramenta React):

| Plugin | Renderiza | Opções principais |
| --- | --- | --- |
| `MelisCmsUserAccountLoginPlugin` | Formulário de início de sessão (e controlo de fim de sessão quando já autenticado). | `template_path`, `page_id_registration_page` |
| `MelisCmsUserAccountUserRegisterPlugin` | Formulário de registo (nome de utilizador, email, palavra-passe ×2, primeiro nome/apelido, imagem, idioma). | `template_path`, `page_id_login_page`, `force_joint_accounts` |

`force_joint_accounts` no plugin de registo reutiliza uma conta existente entre sites; a adesão a um site
é armazenada em `melis_cms_user_account_sites`.

Ambos os plugins são servidos pelo **`MelisCmsUserAccountPluginController`**:

| Ação | Função |
| --- | --- |
| `authenticateUserAction()` | Autentica `login`/`password`/`siteId` e abre a sessão. |
| `logoutUserAction()` | Fecha a sessão do utilizador do site. |
| `createUserAction()` | Valida e cria um utilizador (inclui carregamento de imagem). |
| `getRegistrationFormAction()` | Devolve o formulário de registo (para alternância login↔registo). |
| `getTranslationsAction()` | Cadeias de tradução do lado do front. |

> Não existe nenhuma ação incorporada de esquecimento/reposição de palavra-passe ou de ativação por email no controlador do plugin.
> Construa essas funcionalidades sobre `FrontUserAccountService` se necessário.

## Tabelas da base de dados

| Tabela | PK | Contém |
| --- | --- | --- |
| `melis_cms_user_account` | `uac_id` | Utilizador do site: `uac_login`, `uac_email`, `uac_password`, `uac_firstname`, `uac_lastname`, `uac_picture`, `uac_status`, `uac_admin`, `uac_birthday`, `uac_lang_id`, `uac_date_creation`. |
| `melis_cms_user_account_sites` | `uacs_id` | Junção utilizador ↔ site: `uacs_uac_id`, id do site, `uacs_anonymized` (flag de RGPD por site). |

O `MelisCmsUserAccountAddCustomFieldsTableListener` (disparado no arranque) adiciona colunas de FK `*_author_account`
às tabelas de blog/notícias/comentários, cria `melis_cms_user_account_sites` e migra a
coluna legada `uac_site_id`. A operação é idempotente (protege-se com base na existência das colunas).

## RGPD

### Informação / extração / eliminação manuais (conjunto 1+2)

Nove listeners respondem a três eventos do MelisCore:

| Evento | Listener de conta | Listener de blog | Listener de comentários |
| --- | --- | --- | --- |
| `melis_core_gdpr_user_info_event` | `…GdprUserInfoListener` | `…BlogGdprUserInfoListener` | `…CommentsGdprUserInfoListener` |
| `melis_core_gdpr_user_extract_event` | `…GdprUserExtractListener` | `…BlogGdprUserExtractListener` | `…CommentsGdprUserExtractListener` |
| `melis_core_gdpr_user_delete_event` | `…GdprUserDeleteListener` | `…BlogGdprUserDeleteListener` | `…CommentsGdprUserDeleteListener` |

Os listeners de Blog e Comentários só estão ativos quando `MelisCmsBlog` / `MelisCmsComments` estão instalados.
A eliminação anonimiza a linha da conta e define `uacs_anonymized`. Os mapeamentos de campos e os limiares de retenção
residem em `config/app.gdpr.php`.

### Pipeline automático de contas inativas (conjunto 3)

Seis listeners integram-se no agendador de eliminação automática do MelisCore:

| Passo | Listener | Evento | Efeito |
| --- | --- | --- | --- |
| 1. Registar | `…GdprAutoDeleteModuleListListener` | `melis_core_gdpr_auto_delete_modules_list` | Declara o módulo ao agendador. |
| 2. Tags | `…GdprAutoDeleteTagsListListener` | `MelisCoreGdprAutoDeleteService::TAGS_EVENT` | Regista tags/categorias de inatividade. |
| 3. Primeiro aviso | `…GdprAutoDeleteWarningListUsersListener` | `MelisCoreGdprAutoDeleteService::WARNING_EVENT` | Envia o primeiro email de aviso a utilizadores dormentes. |
| 4. Segundo aviso | `…GdprAutoDeleteSecondWarningListUsersListener` | `MelisCoreGdprAutoDeleteService::SECOND_WARNING_EVENT` | Envia o segundo email de aviso a utilizadores ainda dormentes. |
| 5. Eliminar | `…GdprAutoDeleteActionDeleteUserListener` | `MelisCoreGdprAutoDeleteService::DELETE_ACTION_EVENT` | Anonimiza as contas sem resposta. |
| (registo) | `…GdprAutoDeleteGetEmailListener` | `melis_core_gdpr_auto_delete_log_get_user_email` | Resolve o email para o registo de auditoria (ignora os já anonimizados). |

A "última atividade" é registada por `updateUserConnectionDate()`.

## Listeners entre módulos

Registados em `Module.php` no arranque:

| Listener | Evento | Objetivo |
| --- | --- | --- |
| `MelisCmsUserAccountSiteUserAuthenticationListener` | `site_user_account_authentication` | Ponto de entrada de autenticação FO → `siteUserAuthenticate()`; armazena o utilizador num `Laminas\Session\Container` indexado por site. (prioridade `-1001`) |
| `MelisCmsUserAccountLoginFormListener` | `melis_cms_user_account_login_form` | Injeta o membro com sessão iniciada no formulário de comentários (campos ocultos `mccom_user_acct`/`mccom_site_id`, botão de fim de sessão, nome a partir da conta); remove os campos de nome/email para utilizadores anónimos. |
| `MelisCmsUserAccountCommentsFormModificationListener` | `meliscmsuseraccount_comments_form_modification_listener` | Reordena os elementos do formulário de comentários para a ordem solicitada. |
| `MelisCmsUserAccountAddAuthorPicture` | `melis_cms_user_account_add_user_picture` | Renderiza o `uac_picture` do membro junto ao seu comentário (data URI em base64). |
| `MelisCmsUserAccountSaveUserAccountListenter` | `meliscmsnews_get_postvalues` | Persiste `cnews_author_account` / `cnews_comments_require_account` ao guardar notícias. |
| `MelisCmsUserAccountAddCustomFieldsTableListener` | `meliscms_user_account_add_custom_fields_table` | Migração de arranque: adiciona colunas de FK às tabelas de blog/notícias/comentários, cria a tabela de junção de sites, migra dados legados. |
| `MelisCmsUserAccountFlashMessengerListener` | `meliscms_user_account_tooluser_save`, `meliscms_user_account_tooluser_delete` | Mensagens flash de BO ao guardar/eliminar (ferramenta legada). |

## Ficheiros principais

| Área | Caminho |
| --- | --- |
| Manifesto do brick React | `vendor/melisplatform/melis-cms-user-account/public/ui-react/brick.manifest.json` |
| Rotas da API React + invocável | `vendor/melisplatform/melis-cms-user-account/config/react-api.php` |
| Capacidades React | `vendor/melisplatform/melis-cms-user-account/config/react.capabilities.php` |
| Controlador da API React | `vendor/melisplatform/melis-cms-user-account/src/Controller/MelisReactApiUserAccountController.php` |
| Controlador da ferramenta de BO legada (vista Old) | `vendor/melisplatform/melis-cms-user-account/src/Controller/MelisCmsUserAccountToolController.php` |
| Controlador do plugin de FO | `vendor/melisplatform/melis-cms-user-account/src/Controller/MelisCmsUserAccountPluginController.php` |
| Entrada de menu de BO | `vendor/melisplatform/melis-cms-user-account/config/app.interface.php` |
| Datatable de BO legada (colunas, filtros, modais) | `vendor/melisplatform/melis-cms-user-account/config/app.tools.php` |
| Todos os formulários (FO + BO legado) | `vendor/melisplatform/melis-cms-user-account/config/app.forms.php` |
| Mapeamentos de campos de RGPD + limiares de retenção | `vendor/melisplatform/melis-cms-user-account/config/app.gdpr.php` |
| Pontos de integração de comentários | `vendor/melisplatform/melis-cms-user-account/config/comments.php` |
| Rotas, aliases de serviços, plugins, validadores | `vendor/melisplatform/melis-cms-user-account/config/module.config.php` |
| Configuração do plugin de início de sessão | `vendor/melisplatform/melis-cms-user-account/config/plugins/MelisCmsUserAccountLoginPlugin.config.php` |
| Configuração do plugin de registo | `vendor/melisplatform/melis-cms-user-account/config/plugins/MelisCmsUserAccountUserRegisterPlugin.config.php` |
| Serviço principal | `vendor/melisplatform/melis-cms-user-account/src/Service/MelisCmsUserAccountService.php` |
| Serviço de eliminação automática | `vendor/melisplatform/melis-cms-user-account/src/Service/MelisCmsUserAccountGdprAutoDeleteService.php` |
| Validador de palavra-passe | `vendor/melisplatform/melis-cms-user-account/src/Validator/MelisPasswordValidator.php` |
| Table gateways da BD | `vendor/melisplatform/melis-cms-user-account/src/Model/Tables/` |
| Listeners | `vendor/melisplatform/melis-cms-user-account/src/Listener/` |
| Arranque / injeção de colunas | `vendor/melisplatform/melis-cms-user-account/src/Module.php` |

Ver também: [MelisCore](/pt/reference/modules/melis-core) · [MelisCms](/pt/reference/modules/melis-cms) · [MelisCmsComments](/pt/reference/modules/melis-cms-comments) · [MelisCmsBlog](/pt/reference/modules/melis-cms-blog) · [MelisCmsNews](/pt/reference/modules/melis-cms-news)
