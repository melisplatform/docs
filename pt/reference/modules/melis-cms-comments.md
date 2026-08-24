# MelisCmsComments

> Sistema de comentários para artigos de News e Blog — moderação, um fluxo de aprovação opcional por publicação, um plugin de front-office "Post comments" e um widget de painel. Na v6 a interface de moderação é um separador **Comments** no editor React de News/Blog. Pacote `melisplatform/melis-cms-comments`.

## Objetivo

O MelisCmsComments associa um sistema de comentários às publicações do **MelisCmsNews** e do **MelisCmsBlog**. Fornece
o backend de comentários (tabela `melis_cms_comments` + `MelisCmsCommentsService`), um plugin de
templating de front-office (lista de comentários + formulário "deixar um comentário"), um fluxo de **validação**
por publicação que mantém os comentários do front-office pendentes até um administrador os aprovar, e um widget de painel
**Latest comments**. Combinado com o **MelisCmsUserAccount**, os comentários podem exigir uma conta de site autenticada.

No back-office React (`/melis-react`) este módulo **não fornece qualquer brick próprio** — sem `ui-react/`,
sem `react-api.php`, sem `react.capabilities.php`. É um módulo de **backend + contribuição** com três
superfícies pertencentes ao host:

1. um **separador de moderação de comentários** dentro do editor de News/Blog — a interface do separador React e os seus endpoints `/comments…`
   são **propriedade dos bricks de News e Blog**, que delegam ao serviço deste módulo;
2. um **plugin de página de front "Post comments"** colocado e configurado no editor de páginas CMS React;
3. um **widget de painel "Latest comments"** — um plugin de painel **PHP/phtml legado** renderizado dentro
   do host de widgets do painel React (sem reescrita em React).

## Como ativá-lo

Adicione a `config/melis.module.load.php`:

```php
return [
    'MelisCmsComments',
];
```

Dependências Composer: `melis-core ^6.0` e `melis-cms ^6.0`. Funcionalmente requer pelo menos um módulo de
publicações — **MelisCmsNews** ou **MelisCmsBlog** — para ser útil. O **MelisCmsUserAccount** é uma integração opcional
para comentários restritos a contas. Todas as superfícies dependem da ativação: quando o módulo está ausente,
os endpoints de comentários de News/Blog devolvem **404** e o painel de moderação oculta-se.

## Serviços principais

| Alias do serviço | Função |
| --- | --- |
| `MelisCmsCommentsService` | Serviço principal de CRUD/moderação (estende `MelisEngineGeneralService`). Dispara pares de eventos `*_start`/`*_end` em cada método. Chamado pelos controladores react-api de News/Blog. |

Métodos principais em `MelisCmsCommentsService`:

```php
$svc = $sm->get('MelisCmsCommentsService');

// Create or update a comment (BO comments are approved immediately)
$id = $svc->saveComment($text, $postId, $commentId, 'NEWS', $name, $authorId, 'front');

// Fetch a single comment
$comment = $svc->getCommentById($id);

// Front-office list for a post (ordered)
$list = $svc->getCommentsByPostId($postId, 'BLOG', 'mccom_date_creation', 'DESC');

// Back-office query — omit 'validated' to return pending + approved + refused
$rows = $svc->getComments([
    'postType'     => 'NEWS',
    'postId'       => $postId,
    'withUserInfo' => true,
    'limit'        => 10,
]);

// Moderation
$svc->approveComment($id);          // mccom_validated=1, status=1 (shown)
$svc->refuseComment($id);           // mccom_validated=2, status=0 (hidden)
$svc->deleteCommentById($id);

// Cascade-delete when a post is removed
$svc->deletePostComments('NEWS', $postId);
```

O `saveComment()` lê a flag `c{type}_validate_comments` da publicação: quando ativada e o comentário provém
do front-office, é armazenado como pendente (`validated=0`); os comentários de back-office são armazenados como
aprovados de imediato. Todo o texto guardado passa pelo **HTMLPurifier 4.12** para sanitização contra XSS.

## Separador de moderação de comentários (React, propriedade de News/Blog)

Abra um artigo de News ou uma publicação de Blog no editor e mude para o separador **Comments**. Este lista os
comentários desta publicação com um **ponto de estado** por linha (azul = pendente, verde = mostrado, vermelho = recusado), o
autor, o texto do comentário e a hora, uma caixa inline **Name + write-a-comment + Add a comment** para
publicar um diretamente, e ações **approve / refuse / delete** por linha (approve/refuse só aparecem quando
a publicação tem a validação ativada).

![O separador Comments do editor de News React: um painel COMMENTS com um campo Name inline, uma caixa "Write a comment…" e um botão vermelho + Add a comment, seguido de uma linha de comentário com um ponto de estado, o texto do comentário e ícones de ação refuse/delete](/screenshots/react/melis-cms-comments/meliscmscomments-tooloverride-news-edit-tab-comments.png)

O componente de separador React pertence aos **bricks de News/Blog**, não a este módulo. **Não existe
`react-api.php` no MelisCmsComments** — os comentários são expostos através da react-api dos próprios módulos
de News e Blog, que delegam cada operação ao `MelisCmsCommentsService`:

| Método e URL | Controlador / ação proprietária | Objetivo |
| --- | --- | --- |
| `GET /melis/react-api/news/:id/comments` | `MelisCmsNewsReactApiController::commentsAction` | Todos os comentários (todos os estados) de um artigo de news |
| `POST /melis/react-api/news/comments/save` | `commentSaveAction` | Criar/editar um comentário (BO → aprovado) |
| `POST /melis/react-api/news/comments/approve/:cid` | `commentApproveAction` | Aprovar (`mccom_validated=1`, status=1) |
| `POST /melis/react-api/news/comments/refuse/:cid` | `commentRefuseAction` | Recusar (`mccom_validated=2`, status=0) |
| `POST /melis/react-api/news/comments/delete/:cid` | `commentDeleteAction` | Eliminar o comentário |
| `GET /melis/react-api/blog/:id/comments` | `MelisCmsBlog…ReactApiController::commentsAction` | Todos os comentários de uma publicação de blog |
| `POST /melis/react-api/blog/comments/{save,approve,refuse,delete}[/:cid]` | Ações de comentários de Blog | As mesmas operações para o Blog |

O `commentsAction` constrói uma consulta `getComments(['postId' => …, 'postType' => 'NEWS'])` sem chave
`validated`, pelo que devolve comentários **pendentes + aprovados + recusados**. Cada ação devolve **404
quando o módulo não está disponível**; o contrato é `{ success, data|error }`.

```ts
// list a post's comments (all statuses)
const res = await fetch(`/melis/react-api/news/${idNews}/comments`, {
  credentials: 'include',
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
}).then(r => r.json());          // → { success: true, data: [ { …comment… } ] }

// approve one
await fetch(`/melis/react-api/news/comments/approve/${commentId}`, {
  method: 'POST', credentials: 'include',
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
});
```

O legado `MelisCmsCommentsTabController` (getComments / save / approve / refuse / delete, protegido por
`hasAccess('meliscms_page')`) continua a ser usado pelo caminho clássico/iframe — consulte a
[documentação legada](/legacy/reference/modules/melis-cms-comments).

## Plugin de página de front "Post comments"

O `Controller\Plugin\MelisCmsCommentsPlugin` é um `MelisTemplatingPlugin` (chave de config `meliscmscomments`,
secção **MelisCms**, config em `config/plugins/MelisCmsCommentsPlugin.config.php`). No painel **PLUGINS** do editor
de páginas CMS React, em **Melis Cms Comments**, arraste **Post comments** para uma zona de drop
num template de página de News/Blog.

![O editor de páginas CMS com o painel PLUGINS: o grupo Melis Cms Comments expandido a mostrar o plugin Post comments arrastado para uma DRAG & DROP ZONE; o formulário de front renderizado mostra um campo Name, uma caixa "Add a comment:" e um botão vermelho Submit](/screenshots/react/melis-cms-comments/meliscmscomments-page-plugin-postcomments-menu-selector.png)

- A **janela modal de definições** escolhe o **Template** (predefinição `MelisCmsComments/comments`) e o **Post Type**
  (NEWS / BLOG), persistidos no XML do plugin da página como `template_path`, `mccplugin_post_type` e
  `registration_page_page_id` (para comentários restritos a contas via MelisCmsUserAccount).

![A janela modal de definições do plugin Post comments: um seletor Template (MelisCmsComments/comments) e um seletor Post Type (News / Blog), com botões Cancel / Apply; estas definições são persistidas no XML do plugin da página](/screenshots/react/melis-cms-comments/meliscmscomments-page-plugin-postcomments-config-settings.png)

- A **renderização de front** (`front()`) resolve a publicação a partir do parâmetro de consulta `newsId` / `blogId`, carrega
  os comentários via `getCommentsByPostId()` e constrói o formulário de adicionar comentário (Name + comentário + Submit).
  Quando a publicação requer uma conta, dispara `melis_cms_user_account_login_form` para incorporar um plugin
  de login.
- Vista predefinida `MelisCmsComments/comments`; recursos `plugins/css/commentsPlugin.css`,
  `plugins/js/commentsPlugin.js`.

## Widget de painel "Latest comments" (legado)

O `Controller\DashboardPlugins\MelisCmsCommentsLatestCommentsPlugin` estende
`MelisCoreDashboardTemplatingPlugin`; o seu `latestCommentsAction()` devolve um `ViewModel` do Laminas
(template `melis-cms-comments/dashboard/latest-comments`, um `.phtml`), registado em
`config/dashboard-plugins/dashboard.config.php` (id de plugin `MelisCmsCommentsLatest`). O **host de widgets**
do painel React renderiza este plugin legado tal como está — **não há reescrita em React**. Lista
os comentários mais recentes por tipo de publicação (separadores Blog / News) com filtros **All sites / All users / limite**,
e por comentário mostra o autor, um crachá de estado, o título da publicação e a data. Os filtros de site/utilizador
e o recarregamento da zona são servidos por `MelisCmsCommentsViewHelperController::listAction`
(`melis-cms-comments/dashboard/list`, zona `dashboard_latest_comments_list`).

![O widget Latest comments do Painel React: um separador "Blog comments" com seletores All sites, All users e limite, seguido de uma lista de comentários recentes (autor + crachá de user id + crachá verde de olho "shown", o título da publicação entre parênteses, o texto do comentário e "on: date")](/screenshots/react/melis-cms-comments/meliscmscomments-dashboardplugins-latestcomments.png)

## Tabelas da base de dados

| Tabela | Contém |
| --- | --- |
| `melis_cms_comments` | Todos os comentários: `mccom_id`, `mccom_post_id`, `mccom_type` (NEWS/BLOG), `mccom_comment_text`, `mccom_name`, `mccom_validated`, `mccom_status`, `mccom_date_creation`, `mccom_author_account`. |

Duas colunas são adicionadas automaticamente às tabelas dos módulos de publicações no arranque (não é necessária qualquer alteração de esquema aí):

| Coluna | Tabela | Objetivo |
| --- | --- | --- |
| `cnews_validate_comments` | `melis_cms_news` | Flag "Validate comments" por publicação para News. |
| `cblog_validate_comments` | `melis_cms_blog` | Flag "Validate comments" por publicação para Blog. |

**Modelo de estado.** `mccom_validated`: `0` = novo/pendente (azul), `1` = aprovado/mostrado (verde),
`2` = recusado/oculto (vermelho). `mccom_status` reflete a visibilidade no site (`1` mostrado / `0` oculto).

## Listeners e ligação entre módulos

Registados no `Module.php` no arranque:

| Listener | Evento | Objetivo |
| --- | --- | --- |
| `MelisCmsCommentsFlashMessengerListener` | `melis_cms_comments_flash_messenger` | Feedback do flash-messenger e registo de atividade (`CMS_COMMENT_ADD / UPDATE / DELETE`). |
| `MelisCmsCommentsSaveValidateCommentListener` | `meliscmsnews_get_postvalues` | Persiste `cnews_validate_comments` quando uma publicação de news é guardada. |
| `MelisCmsCommentsGdprAutoDeleteActionDeleteListener` | `melis_cms_user_account_gdpr_auto_delete_action_delete` | RGPD: anula `mccom_author_account` para uma conta eliminada e volta a disparar o evento RGPD do módulo. |

O `Module::addValidateCommentsField()` (arranque do back-office) verifica quais os módulos de publicações ativos e
adiciona a coluna `c{news,blog}_validate_comments` às respetivas tabelas se estiver em falta.

## Ficheiros principais

| Aspeto | Caminho |
| --- | --- |
| Config do módulo (serviços, controladores, plugins) | `vendor/melisplatform/melis-cms-comments/config/module.config.php` |
| Config do plugin de front | `vendor/melisplatform/melis-cms-comments/config/plugins/MelisCmsCommentsPlugin.config.php` |
| Config do plugin de painel | `vendor/melisplatform/melis-cms-comments/config/dashboard-plugins/dashboard.config.php` |
| Serviço principal | `vendor/melisplatform/melis-cms-comments/src/Service/MelisCmsCommentsService.php` |
| Controlador de separador legado | `vendor/melisplatform/melis-cms-comments/src/Controller/MelisCmsCommentsTabController.php` |
| Plugin de templating de front | `vendor/melisplatform/melis-cms-comments/src/Controller/Plugin/MelisCmsCommentsPlugin.php` |
| Widget de painel | `vendor/melisplatform/melis-cms-comments/src/Controller/DashboardPlugins/MelisCmsCommentsLatestCommentsPlugin.php` |
| Listeners | `vendor/melisplatform/melis-cms-comments/src/Listener/` |
| Modelo de BD / table gateway | `vendor/melisplatform/melis-cms-comments/src/Model/Tables/MelisCmsCommentsTable.php` |
| Arranque / injeção de coluna | `vendor/melisplatform/melis-cms-comments/src/Module.php` |
| HTMLPurifier (incluído) | `vendor/melisplatform/melis-cms-comments/library/htmlpurifier-4.12.0/` |

> A interface do separador Comments em React e os seus endpoints `/comments…` residem nos bricks de News/Blog
> (`MelisCmsNewsReactApiController`, `MelisCmsBlog…ReactApiController`); ambos delegam ao
> `MelisCmsCommentsService`. Modelo de dados, serviço e a ferramenta clássica:
> [documentação legada](/legacy/reference/modules/melis-cms-comments).

Ver também: [MelisCmsNews](/pt/reference/modules/melis-cms-news) · [MelisCmsBlog](/pt/reference/modules/melis-cms-blog) · [MelisCms](/pt/reference/modules/melis-cms) · [MelisEngine](/pt/reference/modules/melis-engine) · [MelisCore](/pt/reference/modules/melis-core)
