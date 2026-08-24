# MelisCore

> A base do back-office sobre a qual todos os outros módulos assentam — autenticação, utilizadores/perfis/permissões, a estrutura de menus e
> ferramentas, o dashboard, a configuração, o email, o RGPD e a camada base de serviços + eventos — agora renderizada
> pelo back-office em **React** em `/melis-react`. Pacote `melisplatform/melis-core`.

## Objetivo

`MelisCore` é o coração do back-office da Melis Platform. Fornece a estrutura da aplicação (cabeçalho,
menu à esquerda, árvore de ferramentas, dashboard, rodapé), a árvore de configuração `MelisCoreConfig` que agrega
os ficheiros `app.*.php` de cada módulo, a autenticação e as permissões por ferramenta, a gestão de utilizadores,
o tratamento de plataformas/ambientes, os emails transacionais, as ferramentas de RGPD, um ponto de autenticação por micro-serviço,
e a camada partilhada de serviços/eventos que todos os outros módulos estendem. Todos os módulos `melisplatform/*`
dependem dele.

Na v6, o MelisCore também **é a aplicação de back-office em React**. A mesma estrutura é servida como uma aplicação de página única (SPA) em React 19 +
TypeScript + Tailwind em `/melis-react`, funcionando em paralelo com o back-office legado em `.phtml`
em `/melis`. O MelisCore inclui a estrutura (layout, encaminhamento, o cliente genérico `react-api`,
o carregador de módulos/bricks, o resolvedor de capacidades, o seletor Novo/Antigo) **e** as suas próprias ferramentas nativas em React
(Utilizadores, Dashboard, Anúncios, Emails, RGPD, Idiomas, Registos, Módulos, Outras configurações,
Plataformas, Tema da plataforma, A minha conta, autenticação/2FA). Todos os outros módulos ligam-se **a** esta estrutura.

## Como ativar

Adicione a `config/modules.config.php` — o MelisCore tem de carregar cedo, porque quase todos os outros módulos
invocam os seus serviços:

```php
return [
    'MelisCore',
    // … other modules …
];
```

O back-office em React é entregue por três módulos que cooperam entre si:

| Módulo | Papel |
| --- | --- |
| `MelisCore` | O código-fonte/build da aplicação React + as rotas e controladores `react-api` das ferramentas nativas. |
| [`MelisReactApi`](/pt/reference/modules/melis-react-api) | A ponte genérica `react-api` (`me`, `menu`, `assets`, `langs`, `react-modules`, `rights`, `i18n`, `dashboard`). |
| [`MelisReactOverride`](/pt/reference/modules/melis-react-override) | Serve a estrutura da SPA em `/melis-react` e o mecanismo de iframe legado (`/melis/react-tool-page`). |

Os seus módulos de infraestrutura complementares continuam a ser o [MelisAssetManager](/pt/reference/modules) (que serve os
recursos React com hash a partir de `/MelisCore/ui-react/`), o [MelisDbDeploy](/pt/reference/modules),
o [MelisComposerDeploy](/pt/reference/modules) e o [MelisInstaller](/pt/reference/modules).

## A arquitetura do back-office em React

O código-fonte da aplicação Vite + React encontra-se em `vendor/melisplatform/melis-core/ui-react/` e é compilado para o
diretório versionado `vendor/melisplatform/melis-core/public/ui-react/`. Em tempo de execução:

- A **estrutura (SPA)** é servida em **`/melis-react`** pelo `MelisReactOverride`; o back-office legado
  em `/melis` permanece intacto.
- Os **recursos com hash** carregam a partir de **`/MelisCore/ui-react/`** (o `base` do Vite, servido pelo MelisAssetManager).
- A **API JSON** está disponível em **`/melis/react-api/…`** com o contrato `{ success, data, error }`.

Cada ferramenta que o utilizador vê chega ao ecrã através de **um de três mecanismos**:

1. **Ferramenta React nativa** — uma verdadeira página React suportada por um `MelisReactApi*Controller` no MelisCore
   (Utilizadores, Idiomas, Emails, RGPD…). Listada no registo de módulos (`ui-react/src/lib/module-registry.ts`).
2. **Brick de módulo** — outro módulo ativo fornece a sua própria interface React na forma de um *brick*, carregado em tempo de execução
   (presente apenas se o módulo estiver ativo). Descoberto através de `GET /melis/react-api/react-modules`.
3. **Conjunto de iframes** — qualquer ferramenta legada sem rota React dedicada é renderizada dentro da estrutura num
   iframe do conjunto, através de `/melis/react-tool-page?key=<melisKey>`.

O **menu é dinâmico** (`GET /melis/react-api/menu` devolve a árvore de ferramentas filtrada por permissões), as rotas
das ferramentas são **derivadas dessa árvore** (`/[section]/[tool]`, por exemplo `/melis-core/user`) e nada está
codificado de forma fixa por módulo. Uma ferramenta nativa pode ainda incluir um seletor **Novo (React) / Antigo (iframe)** para comparar
a sua vista React com a ferramenta clássica.

## Estrutura do back-office

A estrutura (`ui-react/src/components/layout/Shell.tsx`) compõe a barra lateral, a barra superior, os subseparadores, a
barra de separadores das ferramentas legadas e a área de conteúdo. Cada montagem de ferramenta é envolvida por um
`ToolErrorBoundary` por ferramenta, para que uma falha de renderização de uma ferramenta nunca deixe todo o back-office em branco.

### Barra superior

O lado direito da barra superior contém um interruptor de **tema** (claro/escuro), o seletor de **idioma**, um ícone do
**Messenger** (quando esse módulo está ativo), um sino de **notificações** e o seu **avatar de utilizador**
(abre *A minha conta* e contém *Terminar sessão*). Um botão para ocultar a barra lateral situa-se na extremidade esquerda.

![Os ícones do lado direito da barra superior — interruptor de tema, idioma, messenger, notificações, avatar](/screenshots/react/melis-core/meliscore-header-righticons.png)

### Barra lateral esquerda e rodapé

A barra lateral mostra a ligação para o **Dashboard** e a **árvore de ferramentas**, agrupada por secção (MelisCore,
MelisCms, MelisMarketing, MelisCommerce, Marketplace, Melis AI…). **O que vê depende das suas
permissões** — apenas aparecem as ferramentas que pode utilizar. O rodapé mostra a **versão** da plataforma / MelisCore.

![O rodapé — versão do MelisCore / da plataforma](/screenshots/react/melis-core/meliscore-footer-version-meliscore.png)

### Dashboard

A página inicial após a autenticação. Mostra **bolhas** no topo (contagens de Melis News / Atualizações / Notificações /
Mensagens) e uma grelha de **widgets** (plugins de dashboard). Os widgets são adicionados a partir da
paleta **"Add a widget"** e organizados por arrastar e largar; a disponibilidade depende das suas permissões.

![O Dashboard React — bolhas no topo, uma grelha de widgets vazia e a paleta "Add a widget"](/screenshots/react/melis-core/meliscore-dashboard-empty.png)

![A paleta "Add a widget" — escolha um widget (agrupado por módulo) para largar no dashboard](/screenshots/react/melis-core/meliscore-dashboardplugins-menu.png)

## Autenticação

A autenticação encontra-se em `/melis-react/login` (React) — nome de utilizador + palavra-passe, **Remember me** opcional, e um
seletor de idioma. Em caso de êxito, é encaminhado para o Dashboard. As contas com **2FA** são encaminhadas para
`/verify-2fa` (é possível pedir novamente um código quando enviado por email). A ligação **Lost password**
(`/forgot-password`) envia por email uma ligação de reposição que abre `/reset-password/:hash`. A identidade visual do painel de autenticação é
configurável através da ferramenta **Tema da plataforma**.

Internamente, a camada PHP permanece inalterada: a autenticação envia um pedido para o `POST /melis/authenticate` legado,
a sondagem de sessão utiliza `GET /melis/islogin` e as permissões provêm de `MelisCoreAuth` / `MelisCoreRights`.

## Utilizadores, perfis e permissões

**Onde:** MelisCore → Administração → **Gestão de utilizadores** (`/melis-core/user`). Faça a gestão de todas as
contas de back-office. A lista tem cartões de KPI (Total / Ativos / Inativos / Administradores), pesquisa, filtros de estado e
de perfil, um gestor de Colunas, Exportar, o seletor Novo/Antigo e **+ Novo utilizador**.

![A ferramenta Utilizadores — cartões de KPI, filtros, gestor de colunas, Exportar, seletor Novo/Antigo, "+ Novo utilizador"](/screenshots/react/melis-core/meliscore-tool-users-list.png)

Ao abrir um utilizador surgem quatro separadores:

- **Perfil** — identidade, etiquetas, interruptor de estado, perfil, um indicador de **Administrador** e uma secção de palavra-passe
  com feedback de complexidade em tempo real.

  ![O separador Perfil — identidade, etiquetas, cartões de Estado/Perfil/Permissões e um campo de palavra-passe com requisitos em tempo real](/screenshots/react/melis-core/meliscore-tool-users-edit-tab-profile.png)

- **Permissões** — a **árvore de acessos** (marque quais as ferramentas/secções que o utilizador pode utilizar), mais um painel de **Dashboard
  Plugins** e um painel de **Páginas**. Tudo o que não for concedido fica oculto no menu do utilizador. As ferramentas
  que declaram **capacidades** expõem subcaixas de verificação (Listar / Criar / Editar / Eliminar / Exportar).

  ![A árvore de permissões — totais por secção e caixas de verificação de capacidades por ferramenta](/screenshots/react/melis-core/meliscore-tool-users-edit-tab-rights-1.png)

  ![Mais abaixo no separador Permissões — o painel de Dashboard Plugins e o painel de Páginas](/screenshots/react/melis-core/meliscore-tool-users-edit-tab-rights-2.png)

- **Ligações** — o histórico de sessões do utilizador (data, hora de entrada/saída, duração).
- **Micro-serviços** — gere uma **chave de API** para que terceiros se possam autenticar como este utilizador nos
  pontos de acesso dos micro-serviços.

  ![Uma chave de API gerada — interruptor ativar/desativar, chave mascarada com mostrar/copiar/regenerar, e o URL do micro-serviço](/screenshots/react/melis-core/meliscore-tool-users-edit-tab-microservices-generated.png)

Os **perfis** definem um conjunto de permissões uma única vez e atribuem-nas a vários utilizadores; a ferramenta de Perfis é fornecida pelo
**MelisSmallBusiness**, pelo que o seletor de *Perfil* do separador Perfil só aparece quando esse módulo está ativo.

> Regra prática: se alguém "não consegue ver uma ferramenta", a sua árvore de **Permissões** não a concede — edite o utilizador
> (ou o seu perfil) → Permissões → marque a ferramenta.

## A minha conta

**Onde:** avatar da barra superior → **A minha conta** (`/melis-core/account`). Edite o seu próprio email, altere a sua
palavra-passe, defina o idioma da interface e carregue uma foto de perfil. Os módulos podem acrescentar separadores aqui (por exemplo,
o Melis Messenger). Esta é a única ferramenta nativa sem proteção por capacidade — está aberta a qualquer
utilizador autenticado.

![A página "A minha conta" — avatar, resumo de identidade e um separador Perfil (email / palavra-passe / idioma)](/screenshots/react/melis-core/meliscore-tool-profile-tab-profile.png)

## Anúncios

**Onde:** MelisCore → Administração → **Anúncio** (`/melis-core/announcement`). Anúncios da plataforma
apresentados no dashboard, com cartões de KPI, pesquisa, um filtro de estado e **+ Novo
anúncio**. O editor é um título + um corpo em **texto formatado (TinyMCE)**, um interruptor **Ativo** e uma **Data**.

![A lista de Anúncios — cartões de KPI, filtro Ativo/Inativo, editar/eliminar por linha](/screenshots/react/melis-core/meliscore-tool-announcement-list.png)

![O editor de anúncios — Título, texto HTML (TinyMCE), interruptor Ativo e Data](/screenshots/react/melis-core/meliscore-tool-announcement-edit.png)

## Idiomas do back-office

**Onde:** MelisCore → Configuração do sistema → **Idiomas do back-office** (`/melis-core/language`). Os
locales (locale + nome) disponíveis para os utilizadores do back-office. `en_EN` é o **predefinido protegido** (não pode
ser renomeado nem eliminado). Ao guardar, os ficheiros de tradução são regenerados através do `MelisCoreTranslation`.

![A lista de Idiomas — locale + nome, o predefinido (en_EN) assinalado, editar por linha](/screenshots/react/melis-core/meliscore-tool-bolanguages-list.png)

## Gestão de emails

**Onde:** MelisCore → Configuração do sistema → **Gestão de emails** (`/melis-core/emails`). Os
**emails transacionais** da plataforma (criação de conta, palavra-passe perdida, fluxo de trabalho…). A lista mostra o nome,
o código, o remetente/email do remetente e um distintivo de **Origem** (Predefinido vs Personalizado).

![A lista de Gestão de emails — modelos transacionais com código, remetente e origem Predefinido/Personalizado](/screenshots/react/melis-core/meliscore-tool-emailsmanagement-list.png)

O editor tem **Propriedades gerais** (nome, código, remetente, responder-a, etiquetas de substituição, caminho do layout)
e uma secção **Conteúdo por idioma** (assunto + corpo HTML/texto por idioma) com etiquetas substituíveis
como `[NAME]`, `[EMAIL]`, `[LOGIN]`. A gravação delega em `MelisCoreBOEmailService::saveBoEmailByCode`.

![As propriedades do email — nome, código, remetente, responder-a, etiquetas de substituição e caminho do layout](/screenshots/react/melis-core/meliscore-tool-emailsmanagement-edit-properties.png)

![O conteúdo por idioma — assunto, um corpo HTML em TinyMCE com etiquetas `[NAME]`/`[EMAIL]`/`[LOGIN]`, e uma versão em texto simples](/screenshots/react/melis-core/meliscore-tool-emailsmanagement-edit-language.png)

## RGPD

**Onde:** MelisCore → Administração → **RGPD** (`/melis-core/gdpr`). Quatro separadores:

- **Dados** — pesquise uma pessoa por nome/email; em todos os módulos, veja os dados que possui sobre ela e, em seguida,
  **extraia** (exportar XML) ou **elimine** os registos selecionados.

  ![O separador Dados do RGPD — pesquise uma pessoa; os módulos devolvem dados correspondentes para extrair ou eliminar](/screenshots/react/melis-core/meliscore-tool-gdpr-tab-data.png)

- **Banners** — configure os textos do banner de cookies/consentimento do RGPD por site + idioma.
- **Anonimização** — as configurações agendadas de **eliminação automática / retenção de dados** (uma por site + módulo),
  com **Executar** e **Registos**.

  ![O separador Anonimização — configurações de eliminação automática, com Registos, Executar e "+ Nova configuração"](/screenshots/react/melis-core/meliscore-tool-gdpr-tab-anonymization.png)

- **SMTP** — o servidor de correio utilizado para enviar os emails de alerta de anonimização.

  ![O separador SMTP — host / nome de utilizador / palavra-passe para os emails de alerta de anonimização](/screenshots/react/melis-core/meliscore-tool-gdpr-tab-smtp.png)

## Registos

**Onde:** MelisCore → Configuração do sistema → **Registos** (`/melis-core/logs`). Um **registo de atividade**
apenas de leitura e pesquisável — filtre por tipo, título, utilizador e intervalo de datas, com cartões de KPI (Total / Hoje / Tipos).
Os não administradores veem apenas as suas próprias ações.

![O visualizador de Registos — cartões de KPI, filtros de tipo/título/utilizador/data e linhas de atividade](/screenshots/react/melis-core/meliscore-tool-logs-list.png)

## Módulos

**Onde:** MelisCore → Configuração do sistema → **Módulos** (`/melis-core/modules`). Ative/desative e
**reordene** (arrastar e largar) os módulos da plataforma; cada linha mostra o módulo, o seu pacote, a versão e
as dependências. **Guardar** reescreve `config/melis.module.load.php` e dispara
`meliscore_module_management_save_end`.

![A ferramenta Módulos — pesquisa, contagem de ativos, arrastar para reordenar a ordem de carregamento, interruptor por módulo, distintivos de requisitos/versão](/screenshots/react/melis-core/meliscore-tool-modules-list.png)

## Outras configurações (política de autenticação e palavra-passe)

**Onde:** MelisCore → Configuração do sistema → **Outras configurações** (`/melis-core/other-config`). A
política de segurança: **bloqueio de conta após falhas**, **duração de validade da palavra-passe**, **reutilização de
palavra-passe** e **complexidade da palavra-passe** (comprimento mínimo + requisitos de minúscula/maiúscula/dígito/especial). Gravada em
`app.login.php` através do `MelisPasswordSettingsService`.

![A página Outras configurações — bloqueio, validade da palavra-passe, reutilização e interruptores de complexidade](/screenshots/react/melis-core/meliscore-tool-other-config.png)

## Plataformas

**Onde:** MelisCore → Configuração do sistema → **Plataformas** (`/melis-core/platforms`). Faça a gestão dos
**ambientes** (dev/staging/prod), com cartões de KPI, pesquisa e **+ Nova plataforma**. A plataforma **atual**
está assinalada e o seu nome não pode ser alterado.

![A lista de Plataformas — a plataforma "atual" assinalada, colunas Marketplace/Cache, editar/eliminar por linha](/screenshots/react/melis-core/meliscore-tool-platforms-list.png)

![O editor de plataforma — nome (bloqueado para a plataforma atual), atualizações do Marketplace e interruptores de Cache](/screenshots/react/melis-core/meliscore-tool-platforms-edit.png)

## Tema da plataforma

**Onde:** MelisCore → Configuração do sistema → **Esquema da plataforma** (`/melis-core/platform-scheme`).
Configure a **identidade visual** do back-office: o logótipo do cabeçalho, o **painel esquerdo de autenticação** (logótipo, fundo,
título/subtítulo por idioma) e o favicon. **Repor predefinição** faz a reposição.

![A página Tema da plataforma — logótipo do cabeçalho do back-office e a identidade visual do painel esquerdo de autenticação](/screenshots/react/melis-core/meliscore-tool-platformscheme.png)

> Em React existem dois controladores de tema associados ao mesmo nó de permissões
> `meliscore_tool_platform_scheme`: esta página **Tema da plataforma** (identidade visual React — logótipos, autenticação,
> favicon) e o **esquema de cores** legado (cores do back-office, regenera `schemes.css`).

## Ferramentas nativas → controladores e capacidades

Cada ferramenta React nativa corresponde a um `MelisReactApi*Controller` (em `src/Controller/`) declarado em
`config/react-api.php`, protegido por uma `melisKey` que carrega permissões. As **capacidades** avançadas por ação
são declaradas em `config/react.capabilities.php` e aplicadas no servidor (permissão por omissão na interface).

| Ferramenta (rota) | Controlador | melisKey / proteção | Capacidades |
| --- | --- | --- | --- |
| Utilizadores (`/melis-core/user`) | `MelisReactApiUserController` | `meliscore_tool_user` | list, create, edit, delete, export |
| A minha conta (`/melis-core/account`) | `MelisReactApiUserProfileController` | `meliscore_user_profile` (apenas autenticação) | — |
| Anúncio | `MelisReactApiAnnouncementController` | `melis_core_announcement_tool` | list, create, edit, delete, export |
| Emails | `MelisReactApiEmailsController` | `meliscore_tool_emails_mngt` | list, create, edit, delete |
| RGPD | `MelisReactApiGdprController` | `melis_core_gdpr` | aplicada, não declarada → permissão por omissão |
| Idiomas | `MelisReactApiLanguageController` | `meliscore_tool_language` | list, create, edit, delete |
| Registos | `MelisReactApiLogController` | `meliscore_logs_tool` (apenas leitura) | list |
| Módulos | `MelisReactApiModulesController` | `meliscore_tool_user_module_management` | list, edit |
| Outras configurações | `MelisReactApiOtherConfigController` | `meliscore_tool_other_config` | list, edit |
| Plataformas | `MelisReactApiPlatformController` | `meliscore_tool_platform` | list, create, edit, delete |
| Tema da plataforma | `MelisReactApiPlatformScheme(React)Controller` | `meliscore_tool_platform_scheme` | list, edit |
| Autenticação (pública) | `MelisReactApiAuthController` | nenhuma (forgot/reset/i18n) | — |

Cada ação protegida executa a mesma barreira de duas linhas:

```php
private const MELIS_KEY = 'meliscore_tool_user';
if ($deny    = $this->denyUnlessAccess())    { return $deny; }    // 401 unauth / 403 canAccess(MELIS_KEY)
if ($denyCap = $this->denyUnlessCan('list')) { return $denyCap; } // capability (CapabilityGuardTrait)
```

## A react-api

A estrutura consome uma `react-api` **genérica** (do módulo `MelisReactApi`) mais as rotas das ferramentas
**nativas** (do MelisCore). Base `/melis/react-api`, contrato `{ success, data, error }`; cada
chamada envia `X-Requested-With: XMLHttpRequest` e `credentials: 'include'`.

| Método e URL | Objetivo |
| --- | --- |
| `GET /melis/react-api/me` | Utilizador atual (id, name, login, email, picture, isAdmin, capabilities). |
| `GET /melis/react-api/menu[?full=1]` | Árvore de ferramentas filtrada por permissões (`full=1` = sem filtro, apenas editor de permissões). |
| `GET /melis/react-api/react-modules` | Módulos ativos que fornecem um brick + o URL do pacote concatenado. |
| `GET /melis/react-api/langs` · `/assets` · `/i18n?locale=…` | Idiomas do BO, recursos da plataforma, traduções públicas. |
| `GET /melis/react-api/dashboard/{bubbles,stats,layout}` · `POST …/layout` | Dados do dashboard + layout partilhado. |
| `GET/POST /melis/react-api/{users\|languages\|platforms\|emails\|…}` | CRUD das ferramentas nativas (por controlador acima). |

Exemplo — uma listagem por keyset nativa e uma gravação:

```ts
// GET a keyset page of platforms
const r = await fetch('/melis/react-api/platforms?limit=25&sort=plf_id&dir=desc', {
  headers: { 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'include',
})
const { success, data } = await r.json()   // { success, data: { items, total, nextCursor } }

// POST save a language
await fetch('/melis/react-api/languages/save', {
  method: 'POST',
  headers: { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ id: null, locale: 'de_DE', name: 'Deutsch' }),
})
```

## Serviços principais (inalterados)

Registados como aliases de `service_manager` em `config/module.config.php` — a espinha dorsal PHP que as ferramentas
React invocam:

| Alias de serviço | Papel |
| --- | --- |
| `MelisCoreConfig` | Árvore de configuração em tempo de execução sobre os ficheiros `app.*` agregados: `getItem('/meliscore/interface/…')`, `getItemPerPlatform('/meliscore/datas/')`, `getFormMergedAndOrdered(…)`. |
| `MelisCoreAuth` | Autenticação do back-office: `hasIdentity()`, `getIdentity()`, `getAuthRights()`, `encryptPassword()`, `isPasswordCorrect()`. |
| `MelisCoreRights` | Controlo de acesso por ferramenta: `canAccess($melisKey)`, `getRightsValues($id, $isRole)`, `createXmlRightsValues(…)`. |
| `MelisCoreTool` | Auxiliar de ferramentas do back-office (colunas, formulários, configuração de DataTable) para ferramentas legadas/iframe. |
| `MelisCoreBOEmailService` | Modelos transacionais: `sendBoEmailByCode()`, `getBoEmailByCode()`, `saveBoEmailByCode()`, `deleteEmail()`. |
| `MelisCoreGdprService` / `MelisCoreGdprAutoDeleteService` | Acesso/apagamento de dados de titulares no âmbito do RGPD e o motor de retenção agendada. |
| `MelisCoreTranslation` | Carrega e combina as traduções `tr_*` por locale (regeneradas ao guardar um idioma). |
| `MelisGeneralService` | Classe base que a maioria dos serviços estende — `sendEvent()`, `makeArrayFromParameters()`, `getServiceManager()`. |

## Sistema de eventos

O `MelisGeneralService` continua a disparar eventos `*_start` / `*_end` em torno de cada método de serviço, para que qualquer módulo
possa intercetá-los. Ligue-se através do gestor de eventos partilhado:

```php
$sm->get('SharedEventManager')->attach(
    'MelisCore',
    'meliscore_tooluser_savenew_end',
    function ($e) { $p = $e->getParams(); /* react */ },
    100
);
```

Eventos comuns do core: `meliscore_tooluser_savenew_start/end`, `…delete_start/end`, `…save_start/end`,
`melis_core_check_user_rights`, `meliscore_install_create_new_user`, `melis_core_new_platform`,
`meliscore_module_management_save_end`, e os eventos de RGPD (`melis_core_gdpr_user_info_event`,
`…_extract_event`, `…_delete_event`, `melis_core_gdpr_auto_delete*`).

## Tabelas da base de dados

| Tabela | Contém |
| --- | --- |
| `melis_core_user` | Utilizadores do back-office (login, hash da palavra-passe, XML `usr_rights`, indicador de admin, idioma, perfil). |
| `melis_core_user_role` | Perfis e o respetivo XML `urole_rights`. |
| `melis_core_user_connection_date` | Histórico de sessões. |
| `melis_core_lang` | Idiomas do back-office. |
| `melis_core_platform` | Ambientes/plataformas. |
| `melis_core_bo_emails` / `_details` | Modelos de email transacional e corpos por idioma. |
| `melis_core_log` / `_log_type` / `_log_type_trans` | Registo de ações, tipos e traduções. |
| `melis_core_lost_password` | Tokens de reposição de palavra-passe. |
| `melis_core_microservice_auth` | Chaves de API para os pontos de acesso dos micro-serviços. |
| `melis_core_dashboards` / `_dashboard_schema` | Layout do dashboard por utilizador. |
| `melis_core_plugins` | Plugins registados. |
| `melis_core_gdpr_delete_config` / `_delete_emails_logs` | Regras de eliminação automática do RGPD e trilho de auditoria. |
| `melis_user_password_history` | Histórico de palavras-passe (prevenção de reutilização). |
| `melis_announcement` | Anúncios do back-office. |

## Ficheiros principais

| Assunto | Caminho |
| --- | --- |
| Arranque do módulo | `vendor/melisplatform/melis-core/src/Module.php` |
| Rotas, serviços, controladores, auxiliares de vista | `vendor/melisplatform/melis-core/config/module.config.php` |
| Estrutura e árvore de ferramentas do back-office legado (interface) | `vendor/melisplatform/melis-core/config/app.interface.php` |
| Declarações de ferramentas DataTable | `vendor/melisplatform/melis-core/config/app.tools.php` |
| Pontos de acesso dos micro-serviços | `vendor/melisplatform/melis-core/config/app.microservice.php` |
| Rotas react-api nativas + controladores | `config/react-api.php` + `src/Controller/MelisReactApi*Controller.php` |
| Capacidades das ferramentas nativas | `config/react.capabilities.php` |
| Código-fonte da aplicação React | `vendor/melisplatform/melis-core/ui-react/src/` |
| Aplicação React compilada (versionada) | `vendor/melisplatform/melis-core/public/ui-react/` |
| Serviços · Controladores · Gateways de tabelas | `src/Service/` · `src/Controller/` · `src/Model/Tables/` |
| SQL de instalação e migrações · Traduções | `install/` · `language/` |

Ver também: [Referência de módulos](/pt/reference/modules), [Criar uma ferramenta](/pt/guide/create-a-tool),
[Plugins](/pt/guide/plugins)
