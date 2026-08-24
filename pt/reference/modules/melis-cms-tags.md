# MelisCmsTags

> Sistema partilhado de etiquetas/taxonomia para o CMS — as "etiquetas" às quais os módulos de conteúdo (por exemplo, Notícias) associam os seus itens, agora com um back-office nativo em React. Pacote `melisplatform/melis-cms-tags`.

## Objetivo

O MelisCmsTags disponibiliza o **sistema de etiquetas (taxonomia)** da plataforma: etiquetas multilingues (um título por
idioma) às quais outros módulos associam o seu conteúdo. Os editores criam e traduzem etiquetas, veem quantos
itens utilizam cada etiqueta e eliminam as que não são utilizadas. Outros módulos (por exemplo, o MelisCmsNews) integram-se na
camada de associação através de uma declaração de configuração e de uma única chamada de serviço, tornando os seus itens etiquetáveis
sem qualquer alteração de esquema ao módulo de etiquetas. Um plugin de templating frontal **List Tags** apresenta as
etiquetas de um site no front office.

No **Melis v6**, o back-office é um **brick full-React nativo** renderizado dentro de `/melis-react`, que invoca
uma camada JSON `react-api` pertencente ao módulo. O modelo de dados do lado do servidor, o serviço, as tabelas, a configuração de associações
e o plugin frontal permanecem inalterados relativamente ao v5 — apenas a camada de apresentação e de navegação transitou para React.

## Ativação

Adicione a `config/melis.module.load.php`:

```php
return [
    'MelisCmsTags',
];
```

Requer `melis-core` e `melis-cms`. O módulo é fornecido com `dbdeploy: true` — as suas três tabelas são
criadas automaticamente no primeiro deploy. O brick React aparece no back-office **apenas se o módulo
estiver ativado** (deteção modular de bricks).

## Onde se encontra no back-office React

Barra lateral esquerda → grupo **Site Tools** → **Tags** (`fa-tag`). Abre-se como um separador de topo denominado **Tags**. O
`forwardKey` do menu `MelisCmsTags/TagsList` mapeia para a rota de árvore `/melis-cms/tags` (`/melis-cms/tags/:id`
para o editor), onde o componente `TagsPage` é renderizado.

O brick é uma interface **full-React nativa** com um **alternador New / Old** (canto superior direito): *New* é a interface React
(predefinida), *Old* renderiza a ferramenta legada num iframe (`/melis/react-tool-page?key=tags_left_menu`).

## Back-office — lista e editor

**Um único separador de shell (`Tags`) com subseparadores internos.** A lista é a vista principal; abrir ou criar uma etiqueta
adiciona um **subseparador de edição** (`subTabs: true`), pelo que alternar entre etiquetas abertas é instantâneo.

**A lista** apresenta todas as etiquetas da plataforma, com:

- **Cartões de KPI** — Total · Com associações · Sem associação (a partir do endpoint `stats`).
- **Pesquisa** ("Search a tag…", corresponde ao id ou a um título em qualquer idioma), **Reset filters**, um gestor de **Columns**
  (ocultar/reordenar) e um botão **Export** (`.xlsx` através do `window.MelisXLSX` do host, com CSV como alternativa).
- Colunas ordenáveis **ID / Title / Nb associations**, com ações de **edição** e **eliminação** por linha.
- Um botão **+ New tag** que abre um editor em branco.

![Lista de etiquetas em React — cartões de KPI (Total / Com associações / Sem associação), pesquisa, Reset filters, gestor de Columns, Export, o alternador New/Old, "+ New tag" e linhas que mostram ID / Title / Nb associations com ações de edição e eliminação](/screenshots/react/melis-cms-tags/meliscmstags-tool-tags-list.png)

**O editor** é um formulário compacto (uma etiqueta é apenas um título por idioma): um **alternador de idioma**
(English / Français…) alimentado pelo endpoint `languages` e um campo **Label** para o idioma selecionado.
Todas as traduções são mantidas em simultâneo e guardadas em conjunto — **é obrigatório pelo menos um título não vazio**.
A eliminação de uma etiqueta é **recusada enquanto esta ainda tiver associações**, protegendo o conteúdo etiquetado.

![O editor de etiquetas em React — um alternador de idioma (English / Français) e o campo "LABEL" por idioma com a indicação "At least one title is required"](/screenshots/react/melis-cms-tags/meliscmstags-tool-tags-edit-texts.png)

## Etiquetar conteúdo — o seletor de etiquetas

As etiquetas destinam-se a ser *utilizadas* por outros módulos. No **editor de Notícias em React** (Site Tools → News → abrir um
artigo), a barra lateral de definições apresenta um painel **TAGS**: uma lista de verificação das etiquetas disponíveis. Selecionar etiquetas
e guardar o artigo armazena as associações, que passam então a contar para o valor **Nb associations** de cada etiqueta.

![O painel TAGS dentro do editor de artigos de Notícias em React — uma lista de verificação de etiquetas (Art, Business, Design, Development, Education…) que etiquetam o artigo](/screenshots/react/melis-cms-tags/meliscmstags-tooloverride-news-tags.png)

Esse seletor e a sua gravação pertencem ao brick **News** (que lê `GET /melis/react-api/news/tags`
e escreve na tabela de ligação partilhada com `entity_type = 'NEWS'`); o MelisCmsTags é apenas dono dos dados das etiquetas
e da tabela partilhada `melis_cms_tag_entity`. O painel só aparece quando o MelisCmsTags está ativo.

## React API — endpoints

**Não existe `config/react-api.php`**: as rotas são declaradas **inline em `config/module.config.php`**
como o nó filho `react-api-cms-tags` sob `melis-backoffice`, pelo que os URLs residem em
**`/melis/react-api-cms-tags`** (pertencentes ao módulo, *não* no namespace partilhado `/melis/react-api/…`).
Controlador: `MelisCmsTags\Controller\MelisCmsTagsReactApiController`. Todas as respostas usam o
contrato `{ success, data, error }`; os pedidos enviam `X-Requested-With: XMLHttpRequest` e
`credentials: 'include'`.

| Método e URL | Ação | Objetivo |
| --- | --- | --- |
| `GET /melis/react-api-cms-tags` | `list` | Listar etiquetas (keyset: `search`, `limit`, `sort`, `dir`, `after`, `lang` opcional) → `{items,total,nextCursor}`; cada item tem `id`, `title`, `associationsCount` |
| `GET /melis/react-api-cms-tags/stats` | `stats` | KPI `{total, withAssociations, orphan}` |
| `GET /melis/react-api-cms-tags/languages` | `languages` | Idiomas do CMS `{languages:[{id,locale,name}]}` (alimenta o alternador de idioma do editor) |
| `GET /melis/react-api-cms-tags/:id` | `get` | Uma etiqueta `{id, creationDate, titles:{langId:title}, associationsCount}` |
| `POST /melis/react-api-cms-tags/save` | `save` | Criar / atualizar (`{id?, titles:{langId:title}}`) → `{id}` |
| `DELETE /melis/react-api-cms-tags/delete/:id` | `delete` | Eliminar uma etiqueta (recusado se ainda tiver associações) |

> A ordem das rotas é importante: `stats` / `languages` / `save` são declaradas **antes** do catch-all `:id`, para que
> resolvam para as suas próprias ações em vez de `get`.

O controlador combina SQL keyset direto e parametrizado (list, stats) com as tabelas e o serviço do módulo
(`TagTable`, `TagTextsTable`, `TagEntityTable` para `get`/`save`; `MelisCmsTagsService` para `delete` —
`getAssociationsByTagId()` bloqueia a eliminação, depois `deleteTagById()` + `TagTextsTable::deleteByField()`
fazem a limpeza). `save` reproduz as regras legadas (≥1 título não vazio, ≤255 carateres, unicidade por idioma)
e dispara os mesmos eventos (`meliscmstags_save_tag_end`, `meliscmstags_delete_tag_end`).

Exemplo (`tags-api.ts`):

```ts
const BASE = '/melis/react-api-cms-tags'
await apiFetch<TagListResult>(`${BASE}?search=art&limit=25&sort=id&dir=desc`) // list
await apiFetch<TagDetail>(`${BASE}/42`)                                       // one tag
await apiFetch<{ id: number }>(`${BASE}/save`, {                              // save all translations
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: null, titles: { 1: 'Art', 2: 'Art' } }),        // langId → title
})
await apiFetch<null>(`${BASE}/delete/42`, { method: 'DELETE' })              // delete
```

## Capacidades

Declaradas em `config/react.capabilities.php` sob o nó de menu **`tags_left_menu`** (o nó de ferramenta renderizável;
`MelisCmsTags\Module::getConfig()` faz o merge do ficheiro). Ações: `list` · `create` · `edit` · `delete`
· `export`. Em React, o `can(cap)` do `TagsPage` lê `window.MelisCan('tags_left_menu', cap)` para condicionar o
botão **+ New tag**, a edição/eliminação por linha e o Export. No lado do servidor, cada ação invoca `denyUnlessAccess()`
(auth + `MelisCoreRights::canAccess('tags_left_menu')` → 401/403); aqui, a chave de capacidades e a
`MELIS_KEY` de proteção de acesso coincidem (`tags_left_menu`).

## Serviços principais

| Alias de serviço | Função |
| --- | --- |
| `MelisCmsTagsService` | CRUD completo de etiquetas mais a API de associação. Cada método dispara eventos `*_start` / `*_end` através do `MelisGeneralService`. |

Aliases de table gateway: `TagTable`, `TagTextsTable`, `TagEntityTable` (registados em `module.config.php`).

## Front office

`ListTagsPlugin` (`Controller\Plugin\ListPublicationsPlugin.php`) estende `MelisTemplatingPlugin`.

| Definição | Detalhe |
| --- | --- |
| Chave de configuração do plugin | `tags` · chave XML DB `TagsList` |
| Ficheiro de configuração | `config/plugins/ListPublicationsPlugin.config.php` |
| Vista frontal | `MelisCmsTags/listtags` |
| Separadores de definições | **Template** (template + seleção de site) · **Filters** (coluna / ordem / data-mín / data-máx / pesquisa) |

> **Divergência de nomes.** A classe do plugin encontra-se em `ListPublicationsPlugin.php` e as vistas Phtml fornecidas
> são `listpublications.phtml` / `showpublication.phtml` — um artefacto histórico; a funcionalidade ativa é
> o plugin **List Tags** acima.

## Tabelas da base de dados

Estrutura base em `install/sql/setup_structure.sql`; migrações em `install/dbdeploy/`.

| Tabela | Contém |
| --- | --- |
| `melis_cms_tag` | Linha principal da etiqueta: `tag_id`, `tag_creation_date`, `tag_site_id`, `tag_type` |
| `melis_cms_tag_texts` | Textos por idioma: `tag_text_id`, `tag_id`, `tag_title`, `tag_lang_id` |
| `melis_cms_tag_entity` | Ligação etiqueta ↔ item de conteúdo: `id`, `tag_id`, `entity_id`, `entity_type` (por exemplo, `NEWS`) |

## Exemplo de serviço

```php
$tags = $this->getServiceManager()->get('MelisCmsTagsService');

// Tag CRUD
$list = $tags->getTagsList($status, $langId, $start, $limit, $orderCol, $order, $siteId, $search);
$tag  = $tags->getTagById($tagId, $langId);
$id   = $tags->saveTag(['tag_site_id' => $siteId, ...], $tagId); // $tagId null → create
$tags->deleteTagById($tagId);

// Associations — the integration surface for other modules
$tags->saveTagEntity([$tagId1, $tagId2], $entityId, 'NEWS'); // (re)attach a tag set to an item
$set   = $tags->loadTagByEntityIdType($entityId, 'NEWS');    // tags of one item
$items = $tags->loadEntityByTagsId($tagIds, 'NEWS');         // items carrying given tags
$tags->deleteEntities($entityId, 'NEWS');                    // clear an item's tags
$assoc = $tags->getAssociationsByTagId($tagId, $langId);     // items associated to a tag
```

`saveTagEntity()` elimina as ligações existentes da entidade e depois volta a guardar o conjunto fornecido — invoque-o a partir do
fluxo de gravação de um módulo de conteúdo para manter as respetivas etiquetas sincronizadas.

## Tornar um módulo etiquetável (associações orientadas por configuração)

Declare o mapeamento sob `plugins.melis_cms_tag.datas.associations` em `config/associations.config.php`.
O exemplo fornecido do MelisCmsNews:

```php
'associations' => [
    'meliscmsnews' => [
        'module'           => 'MelisCmsNews',       // skipped if module not loaded
        'entity_type'      => 'NEWS',               // stored in melis_cms_tag_entity.entity_type
        'entity_table'     => 'melis_cms_news',
        'entity_primary_id'=> 'cnews_id',
        'trans' => [
            'trans_table'      => 'melis_cms_news_texts',
            'trans_foreign_id' => 'cnews_id',
            'trans_lang_key'   => 'cnews_lang_id',
        ],
        'association_title_key' => 'cnews_title',   // shown in the Associations grid "Title" column
    ],
],
```

Depois, invoque `saveTagEntity()` na ação de gravação do módulo de conteúdo. No brick de Notícias em React, isto é ligado
através da sua própria superfície `/melis/react-api/news/tags`; o MelisCmsTags apenas é dono dos dados das etiquetas e da tabela
de ligação partilhada.

## Ficheiros principais

| Aspeto | Caminho |
| --- | --- |
| Configuração do módulo (rotas, rotas react-api inline, serviços, elementos de formulário) | `vendor/melisplatform/melis-cms-tags/config/module.config.php` |
| Capacidades React | `vendor/melisplatform/melis-cms-tags/config/react.capabilities.php` |
| Mapeamento de associações | `vendor/melisplatform/melis-cms-tags/config/associations.config.php` |
| Configuração do plugin List Tags | `vendor/melisplatform/melis-cms-tags/config/plugins/ListPublicationsPlugin.config.php` |
| Controlador da React API | `vendor/melisplatform/melis-cms-tags/src/Controller/MelisCmsTagsReactApiController.php` |
| Serviço principal | `vendor/melisplatform/melis-cms-tags/src/Service/MelisCmsTagsService.php` |
| Plugin frontal | `vendor/melisplatform/melis-cms-tags/src/Controller/Plugin/ListPublicationsPlugin.php` |
| Table gateways | `vendor/melisplatform/melis-cms-tags/src/Model/Tables/` |
| Código-fonte do brick React | `vendor/melisplatform/melis-cms-tags/ui-react/src/` (`TagsPage`, `tags-api.ts`, `ViewToggle`, `ExportModal`) |
| Build + manifest do brick React | `vendor/melisplatform/melis-cms-tags/public/ui-react/brick.js` · `brick.manifest.json` |
| SQL de instalação | `vendor/melisplatform/melis-cms-tags/install/sql/setup_structure.sql` |
| Migrações da BD | `vendor/melisplatform/melis-cms-tags/install/dbdeploy/` |

Ver também: [melis-cms](/pt/reference/modules/melis-cms),
[melis-cms-news](/pt/reference/modules/melis-cms-news),
[melis-front](/pt/reference/modules/melis-front),
[melis-engine](/pt/reference/modules/melis-engine),
[melis-core](/pt/reference/modules/melis-core)
