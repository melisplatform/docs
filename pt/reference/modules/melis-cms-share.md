# MelisCmsShare

> Injeta meta tags de partilha nas redes sociais / Open Graph no `<head>` do front-office de uma página CMS, geridas a partir de um back-office React nativo. Pacote `melisplatform/melis-cms-share`.

## Objetivo

O `MelisCmsShare` permite a um editor definir cinco valores por página — **título, descrição, imagem, tipo e URL** —
e escreve-os no `<head>` da página renderizada sob a forma de três famílias de meta tags: **Twitter Card**
(`twitter:title/description/image/card`), **schema.org / Google** (atributos `itemprop`) e
**Facebook / Open Graph** (`og:title/description/image/type/url`). É armazenada uma linha de dados por
página; uma tag já presente no template é substituída, caso contrário é inserida logo após
`<head>`. As páginas sem uma linha de partilha permanecem inalteradas.

Na v6 o módulo inclui um **brick nativo totalmente em React** (não um brick em iframe) que expõe estes dados em duas
superfícies — uma ferramenta **Open Graph** autónoma e um **separador Open Graph dentro do editor de páginas CMS** —
lendo e escrevendo ambos através de uma camada JSON `/melis/react-api/cms-share…`. O injetor do
`<head>` no front-office, o modelo de dados e os serviços permanecem inalterados desde a v5.

## Ativá-lo

Adicione ao `config/melis.module.load.php`:

```php
return [
    'MelisCmsShare',
];
```

Dependências: `melisplatform/melis-core`, `melisplatform/melis-engine`, `melisplatform/melis-front`
e `melisplatform/melis-cms`. O módulo necessita do editor de páginas CMS (para o separador Open Graph e os
eventos de ciclo de vida da página) e do pipeline de renderização do front (para o hook `MvcEvent::EVENT_FINISH`). Ambas as
superfícies React aparecem **apenas enquanto o módulo estiver listado aqui** (descoberta modular de bricks via
`GET /melis/react-api/react-modules`).

## O back-office React

O brick é uma interface **nativa totalmente em React** com um **interruptor Novo / Antigo**: *Novo* é a interface React
(predefinição), *Antigo* renderiza a ferramenta legada num iframe
(`/melis/react-tool-page?key=melis_cms_share_tool_display`).

| Item | Valor |
| --- | --- |
| ID do brick | `cms-share` (rota `/melis-cms-share/share`, etiqueta `Partage`) |
| `forwardKey` | `MelisCmsShare/MelisCmsShareTool` |
| `melisKey` (direitos / iframe da vista Antiga) | `melis_cms_share_tool_display` |
| Chave do separador do editor de páginas | `melis_cms_share_page_edition_tab` (registada em `meliscms_page`) |
| Base da API | `/melis/react-api/cms-share` |

**Ferramenta Open Graph** — Barra lateral → **Site Tools** → **Open Graph**. Lista a linha de partilha de cada página com
**cartões KPI** (Total de partilhas, Páginas abrangidas, Tipos distintos), uma caixa de **pesquisa** (título, URL, tipo,
descrição, ID da página), um filtro **All types**, **Reset filters**, um gestor de **Columns**,
**Export**, uma atualização e o interruptor Novo/Antigo. Clique num cabeçalho de coluna (Página / Título / Tipo / URL /
Adicionada em) para ordenar; cada linha tem editar (lápis) e eliminar (caixote do lixo).

![A ferramenta React Open Graph: cartões KPI (Total / Páginas abrangidas / Tipos distintos), pesquisa, um filtro de tipo, Reset filters, gestor de Columns, Export, o interruptor Novo/Antigo e uma atualização — cada linha mostra Página, Título, Tipo, URL, Adicionada em com ações de editar e eliminar por linha](/screenshots/react/melis-cms-share/meliscmsshare-tool-opengraph-list.png)

**Formulário de edição** — ID da página (obrigatório), Tipo (`article`, `website`…), Título (`og:title`), URL
(`og:url`), um painel de Imagem (pré-visualização + Substituir / Remover; JPG, PNG, GIF, WEBP — máx. 15 MB) e uma
Descrição (`og:description`). A imagem é carregada primeiro (multipart) para
`/media/melisCmsShare/<pageId>/…`, sendo depois o seu caminho armazenado ao **Guardar**.

![O formulário de partilha React — ID da página, Tipo, Título, URL, um painel de imagem com o caminho armazenado (`/media/melisCmsShare/<pageId>/…`) mais Substituir/Remover, e uma área de texto de Descrição](/screenshots/react/melis-cms-share/meliscmsshare-tool-opengraph-edit.png)

**Separador Open Graph no editor de páginas CMS** — abra uma página CMS e escolha o separador **Open Graph** para editar
inline os metadados de partilha dessa única página (Título, Tipo, URL, Imagem, Descrição); o ID da página é
implícito. O separador **não tem botão Guardar próprio** — os valores são persistidos pelo
Guardar / Publicar do editor de páginas através de um hook de gravação, exatamente como o separador Share legado.

![O editor de páginas CMS com o separador Open Graph ativo (ao lado de Edition, Properties, SEO, Languages, Historic, Page Analytics e mais) — Título, Tipo, URL, painel de imagem e Descrição, guardados através dos botões Save/Publish no topo da página](/screenshots/react/melis-cms-share/meliscmsshare-pageedition-tab-opengraph.png)

## API React

As rotas residem em `config/react-api.php` (mescladas via `MelisCmsShare\Module::getConfig()`); controlador
`MelisCmsShare\Controller\MelisReactApiShareController`. Todas sob `/melis/react-api/cms-share` com
o contrato `{ success, data, error }`.

| Método e URL | Guarda | Objetivo |
| --- | --- | --- |
| `GET /cms-share` | access + `list` | Lista por keyset (`limit`, `search`, `type`, `page`, `sort`, `dir`, `after`) → `{items,total,nextCursor}` |
| `GET /cms-share/stats` | access + `list` | KPI `{total, pages, types}` |
| `GET /cms-share/types` | access + `list` | Valores distintos de `mcs_type` (opções de filtro) |
| `GET /cms-share/:id` | access + `edit` | Uma linha de partilha |
| `GET /cms-share/by-page/:idPage` | apenas auth | A partilha da página (para o separador do editor de páginas); `data:null` se não existir |
| `POST /cms-share/save` | access + `create`/`edit` | Criar / atualizar (`{id?, pageId, title, type, url, img, description}`); autor forçado no servidor; cache da página invalidada |
| `POST /cms-share/upload-image` | access + `edit` | Carregamento multipart (`pageId`, `image`) → `{path}` sob `/media/melisCmsShare/<pageId>/…` |
| `DELETE /cms-share/delete/:id` | access + `delete` | Eliminar uma linha; cache da página invalidada |

O controlador comunica com `melis_cms_share` **diretamente via SQL parametrizado**, reproduzindo as regras de
negócio legadas (ID da página obrigatório, autor forçado ao utilizador atual na criação, lista de permissões de imagem
jpg/jpeg/png/gif/webp/ico/bmp ≤ 15 MB mantida como o único ficheiro sob `/media/melisCmsShare/<pageId>/`,
invalidação da cache de páginas do front para que as tags do `<head>` sejam atualizadas). O `MelisCmsShareService` de mais alto nível
não é utilizado por este controlador. Cada fetch envia `X-Requested-With: XMLHttpRequest` e
`credentials:'include'`.

## Capacidades

Declaradas em `config/react.capabilities.php` sob o nó portador de direitos
`melis_cms_share_tool_display` (o mesmo nó usado pela guarda de acesso do controlador):

```
melis_cms_share_tool_display → list · create · edit · delete · export
```

`MelisCan('melis_cms_share_tool_display', cap)` controla os botões da interface; no lado do servidor cada ação chama
`denyUnlessAccess()` (auth + `MelisCoreRights::canAccess(...)` → 401/403) e depois `denyUnlessCan(cap)`.
O separador do editor de páginas é uma contribuição **modular** separada: o mesmo ficheiro mescla uma entrada `tabs`
sob `meliscms_page` (chave `melis_cms_share_page_edition_tab`, correspondente à chamada `registerPageTab(...)`
no brick), pelo que o MelisCms mostra o botão do separador.

## Serviços principais

| Alias do serviço | Função |
| --- | --- |
| `MelisCmsShareService` | CRUD completo para registos de partilha: `saveShare($data)`, `deleteShare()`, `getShareById()`, `getShareByPageId($idPage)`, `getAllShare()`, `searchShare()`, `countAllShare()`, `countFilteredShare()`. |
| `melisCmsShareTable` | Table gateway para `melis_cms_share` (`MelisCmsShareTable`). Obtenha a linha de uma página com `getEntryByField('mcs_page_id', $idPage)`. |

## Front office

Não é exposto qualquer view helper ou plugin de templating. As tags de partilha são injetadas por
`MelisCmsShare\Listener\MelisCmsShareMetaPageListener`, ligado em `src/Module.php` e acionado em
**`MvcEvent::EVENT_FINISH`** com prioridade **110**:

1. Ignora pedidos não-PHP/de assets (regex no URI) e pedidos sem um `idpage`.
2. Carrega a linha de partilha da página via `melisCmsShareTable->getEntryByField('mcs_page_id', $idPage)`.
3. Para cada campo não vazio, ou aplica `preg_replace` à tag existente ou insere-a após `<head>` —
   em todas as três famílias (Twitter Card, `itemprop`, `og:`).
4. Aplica escape com `addslashes` aos valores, antepõe `scheme://host` aos URLs de imagem, escreve de volta via
   `$response->setContent()`.

Como opera sobre a string HTML já renderizada no final do ciclo de vida MVC, pode
substituir tags que um template já tenha emitido.

> **Ressalva sobre o tipo:** o campo único `mcs_type` alimenta tanto `twitter:card` como `og:type`, que esperam
> vocabulários diferentes (`summary`/`summary_large_image` vs `website`/`article`). Utilize um valor
> aceitável para ambos, ou aceite que um deles seja não canónico.

## Listeners de ciclo de vida da página

| Listener | Evento(s) | Objetivo |
| --- | --- | --- |
| `MelisCmsSavePageListener` | `meliscms_page_save_start`, `meliscms_page_publish_start` | Mantém o registo de partilha consistente quando uma página CMS é guardada ou publicada. |
| `MelisCmsShareDeletePageListener` | `meliscms_page_delete_end` | Elimina a linha `melis_cms_share` quando a sua página é eliminada (sem dados de partilha órfãos). |
| `MelisCmsShareFlashMessengerListener` | Eventos de gravação/eliminação do BO | Feedback flash no back-office após guardar ou eliminar. |

## Tabelas da base de dados

| Tabela | Contém |
| --- | --- |
| `melis_cms_share` | Uma configuração de partilha por página. PK `mcs_id`. Colunas: `mcs_page_id`, `mcs_title`, `mcs_description`, `mcs_img`, `mcs_type`, `mcs_url`, `mcs_add_user_id`, `mcs_date_added`. A tabela junta-se ao utilizador do BO para expor `mcs_share_added_by` (nome completo). |

## Exemplo

```php
// Ler a configuração de partilha de uma dada página
$share = $serviceManager->get('MelisCmsShareService')->getShareByPageId($pageId);

// Persistir uma configuração de partilha para uma página (criar ou atualizar)
$serviceManager->get('MelisCmsShareService')->saveShare([
    'mcs_page_id'      => $pageId,
    'mcs_title'        => 'My page title for social',
    'mcs_description'  => 'A short description shown in link previews.',
    'mcs_img'          => '/path/to/preview-image.jpg',
    'mcs_type'         => 'summary_large_image',
    'mcs_url'          => 'https://example.com/my-page',
    'mcs_add_user_id'  => $currentUserId,
]);
```

## Ficheiros principais

| Aspeto | Caminho |
| --- | --- |
| Módulo / bootstrap | `vendor/melisplatform/melis-cms-share/src/Module.php` |
| Rotas da API React + invokable | `vendor/melisplatform/melis-cms-share/config/react-api.php` |
| Capacidades React + separador de página | `vendor/melisplatform/melis-cms-share/config/react.capabilities.php` |
| Controlador da API React | `vendor/melisplatform/melis-cms-share/src/Controller/MelisReactApiShareController.php` |
| Controlador BO legado (vista Antiga) | `vendor/melisplatform/melis-cms-share/src/Controller/MelisCmsShareToolController.php` |
| Fonte do brick React | `vendor/melisplatform/melis-cms-share/ui-react/src/` (`brick.tsx`, `SharePage.tsx`, …) |
| Brick compilado + manifesto | `vendor/melisplatform/melis-cms-share/public/ui-react/` (`brick.js`, `brick.manifest.json`) |
| Injetor do `<head>` no front | `vendor/melisplatform/melis-cms-share/src/Listener/MelisCmsShareMetaPageListener.php` |
| Serviço | `vendor/melisplatform/melis-cms-share/src/Service/MelisCmsShareService.php` |
| Tabela | `vendor/melisplatform/melis-cms-share/src/Model/Tables/MelisCmsShareTable.php` |

Ver também: [MelisCms](/pt/reference/modules/melis-cms) · [MelisCmsPageAnalytics](/pt/reference/modules/melis-cms-page-analytics) · [Referência de módulos](/pt/reference/modules)
