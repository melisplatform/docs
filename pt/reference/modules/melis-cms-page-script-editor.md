# MelisCmsPageScriptEditor

> Injete `<script>`/`<style>`/HTML personalizado (analítica, pixels de rastreio, widgets de terceiros) no
> `<head>` e no `<body>` das páginas de front-office, por página e por site, sem editar templates.
> Pacote `melisplatform/melis-cms-page-script-editor`.

## Objetivo

O MelisCmsPageScriptEditor permite adicionar marcação bruta e injetá-la automaticamente no
HTML renderizado das suas páginas. Estão disponíveis três posições de injeção: **topo do head** (logo a seguir a
`<head>`), **fundo do head** (imediatamente antes de `</head>`) e **fundo do body** (imediatamente antes de `</body>`).
Os scripts podem ser aplicados a todo um site ou a uma única página; uma página pode ser marcada como **exceção**
para não receber os scripts de âmbito de site.

No back-office React da v6, o módulo é distribuído como um **brick apenas de contribuição** — não tem
uma ferramenta própria no menu esquerdo. Em vez disso, acrescenta um **separador Scripts em dois locais**: o **editor de páginas
do CMS** (scripts por página) e a **edição da ferramenta Sites** (scripts de âmbito de site + exceções). O modelo de dados, o serviço
e os listeners de injeção mantêm-se inalterados relativamente à v5; apenas a interface do back-office passou para React.

## Ativar

Adicione a `config/melis.module.load.php`:

```php
return [
    'MelisCmsPageScriptEditor',
];
```

Requer `melis-core ^6.0` e `melis-cms ^6.0` (PHP `^8.3|^8.5`). O módulo está marcado como
`dbdeploy: true`, pelo que as suas tabelas são criadas automaticamente pelo melis-dbdeploy.

> **Ativação por site:** a injeção só entra em vigor num site depois de o módulo ser carregado para esse
> site em MelisCms → Sites → Module loading. Os scripts podem ser editados no back-office antes disso,
> mas nada é injetado no front até o módulo estar ativado no site.

## Back-office em React

**Não existe uma ferramenta dedicada no menu esquerdo** — o separador Scripts reside dentro de duas ferramentas existentes, ambas
nativas em React. Ambos os separadores só aparecem quando o módulo está ativo (descoberto através de
`GET /melis/react-api/react-modules`, sendo depois o bundle do brick pré-carregado no arranque).

| Superfície | Onde | Conteúdo | Guardar |
| --- | --- | --- | --- |
| **Editor de páginas → separador Scripts** | MelisCms → abrir uma **página** → *Scripts* | Três editores de código por página (Head top / Head bottom / Body bottom) apenas para **esta página**. | Botão **Save scripts** próprio. |
| **Ferramenta Sites → separador Scripts** | MelisCms → **Sites** → abrir um site → *Scripts* | Três editores de âmbito de site + lista **Current Exceptions** + **Add an exception** (campo de page-id ou seletor na árvore de páginas). | Guardado pelo botão global **Save** do editor de sites; adicionar/remover exceções persiste imediatamente. |

![Editor de páginas do CMS em React, separador Scripts: os três editores de código por página (Head top / Head bottom / Body bottom) com um botão Save scripts](/screenshots/react/melis-cms-page-script-editor/meliscmspagescripteditor-page-tab-scripts.png)

![Edição de Sites em React, separador Scripts: os três editores de âmbito de site, a lista Current Exceptions e o bloco Add an exception, guardados pelo botão global Save do editor de sites](/screenshots/react/melis-cms-page-script-editor/meliscmspagescripteditor-tooloverride-sites-edit-tab-scripts.png)

Numa página servida, cada posição recebe **primeiro os scripts do site, depois os scripts da própria página** — a menos que a
página seja uma exceção, caso em que apenas os seus próprios scripts de página são injetados.

O **componente do separador do editor de páginas** reside em MelisCms (`PageTabs.tsx`, chave
`meliscms_page_script_editor`); o **componente do separador de site** (`ScriptsTab.tsx`) reside neste módulo
e regista-se automaticamente através do registo genérico `window.__melisSiteTabs` (ordem `55`). Este módulo é o proprietário
dos endpoints e da capacidade por trás de ambos os separadores.

## Capacidades (direitos avançados)

O separador de página é uma **capacidade da ferramenta de páginas do CMS**, declarada em `config/react.capabilities.php`
sob o nó partilhado `meliscms_page`:

```php
return [
  'melisReactToolCapabilities' => [
    'meliscms_page' => [
      'tabs' => [
        ['key' => 'meliscms_page_script_editor', 'label' => 'tr_meliscmspagescripteditor_title'],
      ],
    ],
  ],
];
```

Sem esta declaração, a whitelist de capacidades das páginas do CMS oculta o botão do separador **Scripts** no editor de
páginas, mesmo para um administrador. O separador Scripts da **ferramenta Sites** não tem uma capacidade própria: é controlado
pelo acesso à ferramenta Sites (`meliscms_tool_sites`).

## API React

Dois controladores pertencentes a este módulo, ambos delegando em `MelisCmsPageScriptEditorService`. Contrato
`{ success, data, error }`, com `X-Requested-With: XMLHttpRequest` e `credentials: 'include'`.

**Separador de página** — `MelisReactApiPageScriptEditorController`, rotas em `config/react-api.php`. Protegido
por autenticação + `MelisCoreRights::canAccess('meliscms_page_script_editor')`:

| Método e URL | Objetivo |
| --- | --- |
| `GET /melis/react-api/cms-page/scripts?idPage=<id>` | Ler os scripts de uma página → `{ idPage, headTop, headBottom, bodyBottom, editDate }`. |
| `POST /melis/react-api/cms-page/scripts/save` | Guardar os scripts de uma página (`{ idPage, headTop, headBottom, bodyBottom }`). |

**Separador de site** — `MelisCmsPageScriptEditorReactController`, rota genérica
`/melis/MelisCmsPageScriptEditor/:controller/:action` em `config/module.config.php`. Protegido por autenticação
+ `MelisCoreRights::canAccess('meliscms_tool_sites')`:

| Método e URL (relativos a `.../MelisCmsPageScriptEditorReact`) | Objetivo |
| --- | --- |
| `GET /site-script?siteId=<id>` | Scripts do site + contagem de exceções → `{ siteId, script, exceptionCount }`. |
| `POST /save-site-script` | Guardar os scripts do site (tudo vazio ⇒ elimina a entrada). |
| `GET /exceptions?siteId=<id>` | As exceções do site → `{ items:[{id,pageId,pageName}], total }`. |
| `POST /add-exception` | Adicionar uma exceção (`{ siteId, pageId }`; garante o mesmo site + sem duplicados). |
| `POST /delete-exception` | Remover uma exceção (`{ id }`). |

> **Nota de segurança.** Os endpoints de página injetam `<script>`/HTML personalizado na renderização **pública**
> de uma página, pelo que tanto o `get` como o `save` exigem o direito da ferramenta page-script-editor (e não apenas uma
> sessão), impedindo que um utilizador de BO sem direitos plante XSS persistente. As escritas usam
> SQL parametrizado diretamente em `melis_cms_scripts`.

## Serviços principais

| Alias | Função |
| --- | --- |
| `MelisCmsPageScriptEditorService` | Toda a lógica de negócio dos scripts: guardar, ler, combinar e injetar scripts. Reutilizado por ambos os controladores React. |
| `MelisCmsScriptTable` | Table gateway para `melis_cms_scripts`. |
| `MelisCmsScriptExceptionTable` | Table gateway para `melis_cms_scripts_exceptions`. |

O `MelisCmsPageScriptEditorService` expõe:

| Método | Função |
| --- | --- |
| `addScript($siteId, $pageId, $headTop, $headBottom, $bodyBottom, $mcsId)` | Inserir ou atualizar uma linha de script para um site ou página. |
| `addScriptException($siteId, $pageId)` | Marcar uma página como excluindo os scripts de âmbito de site. |
| `getScriptExceptions($siteId, $sortCol, $sortOrder)` | Listar as páginas que não recebem os scripts do site. |
| `getScriptsPerSite($siteId)` / `getScriptsPerPage($pageId)` | Obter a(s) linha(s) de script de um site / página. |
| `getScriptsExceptionPerPage($pageId)` | Obter a(s) linha(s) de exceção de uma página. |
| `getMixedScriptsPerPage($pageId)` | Resolver os scripts finais de uma página — site + página combinados, ou apenas a página quando esta é uma exceção. Usado pelo listener de renderização do front. |
| `updatePageScripts($pageId, $html)` | Injeta os scripts combinados no HTML renderizado (depois de `<head>`, antes de `</head>`, antes de `</body>`). |
| `getSiteId($pageId)` | Resolver o id do site para uma dada página. |

## Front office

A injeção acontece através de um listener MVC, não de um plugin de template:

| Listener | Gatilho | Função |
| --- | --- | --- |
| `MelisCmsPageScriptEditorScriptTagListener` | Renderização de página (front) | Chama `getMixedScriptsPerPage()` e injeta os scripts resolvidos: head-top depois de `<head>`, head-bottom antes de `</head>`, body-bottom antes de `</body>`. |

Guardar e duplicar mantêm-se orientados a eventos (`Module.php::onBootstrap`): os listeners de save-page, save-site-script
e duplicate-page persistem os scripts e a exceção de exclusão do site quando as páginas/sites são
guardados ou duplicados no back-office. O view helper `melisCmsPageScriptEditorAddScript`
(`src/View/Helper/MelisCmsPageScriptEditorAddScriptHelper.php`) disponibiliza acesso programático para guardar
uma linha de script através do serviço.

## Tabelas da base de dados

| Tabela | Contém |
| --- | --- |
| `melis_cms_scripts` | Um conjunto de scripts por site ou por página: `mcs_id`, `mcs_site_id`, `mcs_page_id`, `mcs_head_top`, `mcs_head_bottom`, `mcs_body_bottom`, `mcs_date_edition`, `mcs_user_id`. |
| `melis_cms_scripts_exceptions` | Páginas que ignoram os scripts do site: `mcse_id`, `mcse_site_id`, `mcse_page_id`, `mcse_date_creation`, `mcse_user_id`. |

## Exemplo

```php
$scripts = $this->getServiceManager()->get('MelisCmsPageScriptEditorService');

// Resolve the final scripts for a page (site + page merged, or page-only if exception)
$resolved = $scripts->getMixedScriptsPerPage($pageId);
// $resolved contains headTopScript, headBottomScript, bodyBottomScript

// Save scripts for a site or page
$scripts->addScript($siteId, $pageId, $headTop, $headBottom, $bodyBottom, $mcsId);

// Mark a page as an exception (it will no longer receive site-wide scripts)
$scripts->addScriptException($siteId, $pageId);

// List all pages that opted out of the site scripts
$exceptions = $scripts->getScriptExceptions($siteId, $sortCol, $sortOrder);
```

## Ficheiros principais

| Assunto | Caminho |
| --- | --- |
| Bootstrap do módulo e ligação dos listeners | `vendor/melisplatform/melis-cms-page-script-editor/src/Module.php` |
| Ligação do serviço e das rotas | `vendor/melisplatform/melis-cms-page-script-editor/config/module.config.php` |
| Rotas da API React do separador de página | `vendor/melisplatform/melis-cms-page-script-editor/config/react-api.php` |
| Declaração da capacidade do separador de página | `vendor/melisplatform/melis-cms-page-script-editor/config/react.capabilities.php` |
| Controladores React (página / site) | `vendor/melisplatform/melis-cms-page-script-editor/src/Controller/` |
| Brick do separador de site (Vite IIFE) | `vendor/melisplatform/melis-cms-page-script-editor/ui-react/src/` (`brick.tsx`, `ScriptsTab.tsx`, `site-scripts-api.ts`) |
| Serviço | `vendor/melisplatform/melis-cms-page-script-editor/src/Service/MelisCmsPageScriptEditorService.php` |
| Listener de injeção no front | `vendor/melisplatform/melis-cms-page-script-editor/src/Listener/MelisCmsPageScriptEditorScriptTagListener.php` |
| View helper | `vendor/melisplatform/melis-cms-page-script-editor/src/View/Helper/MelisCmsPageScriptEditorAddScriptHelper.php` |
| Table gateways | `vendor/melisplatform/melis-cms-page-script-editor/src/Model/Tables/` |
| SQL de instalação | `vendor/melisplatform/melis-cms-page-script-editor/install/dbdeploy/` |

Ver também: [Referência de módulos](/pt/reference/modules) · [melis-cms](/pt/reference/modules/melis-cms) ·
[melis-core](/pt/reference/modules/melis-core)
