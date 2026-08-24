# MelisCmsCategory2

> Categorias de conteúdo multi-site e multilingues para o CMS, com um back-office React nativo — pacote `melisplatform/melis-cms-category2`.

## Objetivo

O MelisCmsCategory2 disponibiliza um sistema de categorias hierárquico no back-office do Melis. As categorias formam
uma árvore (cada nó aponta para um pai), transportam traduções por idioma (nome e descrição), podem
ser associadas a um ou mais sites, têm uma janela de validade e um estado, e podem conter ficheiros multimédia. O
módulo inclui um plugin de templating para o front-office que renderiza uma árvore de categorias numa página, bem como um
seletor de categorias reutilizável, incorporado por outros módulos (por exemplo, News, Commerce) para classificar os seus registos.

No back-office React da v6 (`/melis-react`), a ferramenta é fornecida como um **bloco totalmente React nativo**: uma
verdadeira interface master-detail — árvore de categorias à esquerda, editor com separadores à direita — que lê e escreve
através da sua própria camada JSON `react-api`. Um alternador **New / Old** permite recorrer à ferramenta legada numa
iframe. O modelo de dados subjacente, os serviços e o plugin de front-office permanecem inalterados face à v5.

## Ativação

Adicione ao `config/melis.module.load.php`:

```php
return [
    'MelisCmsCategory2',
];
```

Requer `melis-core` e `melis-cms`. O módulo está preparado para `dbdeploy`, pelo que as suas tabelas são criadas
no deploy. O `melis-engine` é necessário para a renderização no front-office. O bloco React aparece na barra lateral
apenas enquanto o módulo estiver listado aqui (deteção modular de blocos).

## Back-office (React)

**Onde:** barra lateral esquerda → grupo **MelisCms** → **Categories** (`Catégories`). Abre como uma única
página master-detail — não o slider multi-separador — na rota `/melis-cms/category-v2`. O alternador **New / Old**
no canto superior direito alterna entre a interface React (predefinição) e a ferramenta clássica numa iframe.

![A ferramenta Categories em React — master-detail: árvore de categorias à esquerda, editor com separadores à direita, alternador New/Old no canto superior direito](/screenshots/react/melis-cms-category2/meliscmscategory2-tool-categories-accordionsystem.png)

### Árvore de categorias (painel esquerdo)

A coluna da esquerda mostra toda a árvore. A sua barra de ferramentas tem um **menu de idiomas** (bandeiras — escolhe em que
idioma são apresentados os nomes dos nós), um **filtro de sites**, um botão de **atualização**, uma **caixa de pesquisa**
(remove ramos mas mantém os ascendentes) e **+ New category** (cria uma raiz/catálogo). Cada linha mostra um
**ponto de estado** (verde = ativo, vermelho = inativo), o nome do nó e — ao passar o rato — um **+** (adicionar uma
subcategoria) e um **caixote do lixo** (eliminar). Arraste a pega de um nó para o reordenar ou reatribuir a outro pai: junto ao
limite superior = largar antes, limite inferior = largar depois (irmão), ao centro = largar dentro (último filho). O arrastar
só é disponibilizado na vista completa sem filtros. Um nó com subcategorias não pode ser eliminado.

![O painel da árvore em React — menu de idiomas, filtro de sites, atualização, pesquisa, + New category, árvore com pontos de estado e adição/eliminação por nó](/screenshots/react/melis-cms-category2/meliscmscategory2-page-plugin-categories-config-properties-search-category.png)

### Editor (painel direito)

Selecionar um nó — ou clicar em **+ New category** / no **+** de uma linha — carrega o editor. O cabeçalho
mostra o título, o seu contexto ("at the root" ou "under «parent»") e **Cancel** / **Save**.

- **Separador Properties** — Nome e Descrição por idioma (separadores de idioma com um ponto preenchido/vazio por
  idioma), um alternador **Status**, datas de **Validity** (Start / End) e os **Sites** a que a categoria
  pertence. O Nome (em pelo menos um idioma) e pelo menos um Site são obrigatórios; se ambas as datas estiverem
  definidas, Start tem de preceder End.
- **Separador Media** — anexe **Images** e **Files** (duas colunas, cada uma com **+ Add** e eliminação por item).
  Guarde a categoria antes de adicionar multimédia.

![Nova categoria — separador Properties: separadores de idioma, Name, Description, alternador Status, datas de Validity, Sites](/screenshots/react/melis-cms-category2/meliscmscategory2-tool-categories-new-tab-properties.png)

![Editor de categorias — separador Media: grelha de Images (+ Add an image) e lista de Files (+ Add a file)](/screenshots/react/melis-cms-category2/meliscmscategory2-tool-categories-new-tab-media.png)

## API React

As rotas encontram-se em `config/react-api.php`, servidas por
`MelisCmsCategory2\Controller\MelisCmsCategoryReactApiController`, aninhadas sob a base de back-office do módulo,
pelo que o prefixo efetivo é `/melis/MelisCmsCategory2/react-api`. Todas as respostas
seguem o contrato `{ success, data, error }`. O controlador comunica diretamente com as tabelas através de
SQL parametrizado, reproduzindo as regras de negócio legadas (nome em ≥1 idioma, ≥1 site, start ≤ end,
ordem automática = max+1, `-1` = pai raiz, sem eliminação de um nó com filhos, eliminação em cascata de
trans/sites/media, upload de multimédia reforçado).

| Método e URL (relativo à base) | Objetivo |
| --- | --- |
| `GET /tree?lang=` | Árvore de categorias completa → `{langId, nodes:[TreeNode]}` (nome resolvido no idioma, fallback sinalizado) |
| `GET /langs` | Idiomas do CMS → `{langs:[{id,locale,name}]}` |
| `GET /sites` | Sites (filtro + formulário) → `{sites:[{id,name}]}` |
| `GET /category/:id` | Uma categoria → `{id,parentId,status,dateStart,dateEnd,sites,translations}` |
| `POST /save` | Criar / atualizar uma categoria → `{id}` |
| `DELETE /delete/:id` | Eliminar uma categoria (bloqueado se tiver filhos) + reordenar irmãos |
| `POST /reorder` | Reordenar os irmãos de um pai (`{parentId, orderedIds:[…]}`) — também reatribui o pai |
| `GET /category/:id/media` | Multimédia da categoria → `{images:[MediaItem], files:[MediaItem]}` |
| `POST /media/upload` | Upload multipart (`catId`, `type` image\|file, `file`) → `{id,type,path,name}` |
| `DELETE /media/delete/:id` | Eliminar um registo de multimédia + o respetivo ficheiro em disco |

## Capacidades

Declaradas em `config/react.capabilities.php` sob o nó **portador de direitos**
`melis_cms_category_v2_tools_section` (que é também a `MELIS_KEY` do controlador — e não a chave de zona do manifesto
`melis_cms_categories_v2`, que visa apenas a iframe *Old*). Todas as ações do controlador protegem
o acesso com `canAccess(MELIS_KEY)`. `Capabilities::flatten()` transforma a árvore em cadeias com pontos
passadas a `makeCan(...)` em React:

| Capacidade | Controla |
| --- | --- |
| `tree.create` | Botões "+ New category" e "+" por nó |
| `tree.order` | Pega de reordenação por arrastar (requer também a vista sem filtros) |
| `tree.delete` | Caixote do lixo por nó |
| `edition` | Carregamento do editor para uma categoria existente (a criação permanece permitida) |
| `edition.properties` | Separador Properties |
| `edition.media` | Separador Media |

## O bloco

A interface é escrita em `ui-react/` (Vite IIFE, React / ReactRouter externalizados para variáveis globais do host,
com saída para `public/ui-react/brick.js`, ao lado de `brick.manifest.json`). O `brick.tsx` regista um
componente encaminhado sob o id de bloco `category2`.

```json
{
  "id": "category2",
  "route": "/melis-cms/category-v2",
  "label": "Catégories",
  "forwardKey": "MelisCmsCategory2/MelisCmsCategoryList",
  "melisKey": "melis_cms_categories_v2",
  "entry": "brick.js",
  "persistent": true
}
```

| Componente | Papel |
| --- | --- |
| `CategoryPage.tsx` | Contentor: carrega langs + sites, (re)carrega a árvore por idioma, é dono do nó selecionado e do `mode` New/Old, renderiza o layout master-detail + a iframe *Old* |
| `CategoryTree.tsx` | Painel esquerdo — árvore, menu de idiomas, filtro de sites, pesquisa, adição/eliminação por nó, reordenação / reatribuição de pai por arrastar |
| `CategoryEditor.tsx` | Painel direito — separadores Properties + Media, validação no cliente, erros inline/em banner |
| `ViewToggle.tsx` | Alternador New (React) / Old (iframe) |
| `category-api.ts` | Cliente de API tipado para os endpoints acima |

O host descobre o bloco através de `GET /melis/react-api/react-modules` e monta-o; o `useNavMenu`
mapeia a `forwardKey` para a rota da árvore. O bloco lê o idioma ativo a partir de
`document.documentElement.lang` e inclui um dicionário `{fr,en}` no próprio ficheiro. A lógica de negócio permanece
no servidor (paridade com a ferramenta legada); o React é apresentação + chamadas à API.

## Serviços principais

| Alias de serviço | Papel |
| --- | --- |
| `MelisCmsCategory2Service` | Serviço principal de categorias: criar/ler nós de categoria, obtenção da árvore, traduções e ligações a sites. |
| `MelisCmsCategory2MediaService` | Armazenamento de ficheiros por categoria em disco e na base de dados. |

Métodos notáveis em `MelisCmsCategory2Service`:

- `getCategoryTreeview($fatherId, $langId, $onlyValid, $siteId)` — árvore recursiva.
- `getCategoryById($categoryId, $langId, $onlyValid)` — nó de categoria completo.
- `getCategoryNameById($categoryId, $langId)` — pesquisa de nome.
- `getCategoriesPerSite($siteId, $langId)`, `getFirstLevelCategoriesPerSite($siteId, $langId)`.
- `saveCategory(...)`, `saveCategoryTexts(...)`, `saveCategorySites(...)` — persistir nó/tradução/site.
- `reOrderCategories($parentId, $currentOrder)` — persistir a reordenação por arrastar.
- `validateDates($dateStart, $dateEnd)`.

O `MelisCmsCategory2MediaService` trata da parte do sistema de ficheiros: `uploadFile`, `deleteFile`,
`getMediaFilesByCategoryId`, `getFilesInDir`, `removeCategoryDir`.

> O controlador `react-api` de React usa SQL direto em vez destes serviços, mas o plugin de front-office
> e o seletor de categorias reutilizável continuam a chamar o `MelisCmsCategory2Service`.

## Front-office

- **Plugin de templating** `MelisCmsCategoryDisplayCategoriesPlugin` — renderiza uma árvore de categorias numa
  página. A sua configuração expõe um separador Properties com três campos: `template_path`, `site_id`,
  `category_start`. Template predefinido: `MelisCmsCategory2/default`. No editor de páginas React, largue
  o bloco **Display Categories** e defina o template, a categoria inicial (seletor de árvore) e o site.
- **View helper** `renderTreeRec` — renderiza recursivamente um array de árvore de categorias dentro de uma vista.

![Definições do plugin Display Categories — Template, Category start (seletor de árvore), Site](/screenshots/react/melis-cms-category2/meliscmscategory2-page-plugin-categories-config-properties.png)

Utilização em código:

```php
$display = $this->MelisCmsCategoryDisplayCategoriesPlugin();
echo $display->render([
    'template_path' => ['MelisCmsCategory2/default'],
    'site_id'        => 1,
    'category_start' => 1,
]);
```

## Tabelas da base de dados

| Tabela | Contém |
| --- | --- |
| `melis_cms_category2` | Nó de categoria: `cat2_id`, `cat2_father_cat_id`, ordem, estado, referência, datas de validade, auditoria. |
| `melis_cms_category2_trans` | Tradução por idioma: nome e descrição, indexada por `catt2_id`. |
| `melis_cms_category2_sites` | Ligação categoria-a-site, indexada por `cats2_id`. |
| `melis_cms_category2_media` | Multimédia anexada a uma categoria: `catm2_type`, `catm2_path`, `catm2_cat_id`. |

Um nó raiz de seed (`cat2_id = 1`, "My catalog" / "Mon catalogue") é inserido na instalação.

## Ficheiros principais

| Aspeto | Caminho |
| --- | --- |
| Rotas da API React + controlador invocável | `vendor/melisplatform/melis-cms-category2/config/react-api.php` |
| Declaração de capacidades React | `vendor/melisplatform/melis-cms-category2/config/react.capabilities.php` |
| Controlador da API React (10 ações, SQL direto, reforço de upload) | `vendor/melisplatform/melis-cms-category2/src/Controller/MelisCmsCategoryReactApiController.php` |
| Bloco React (Vite IIFE) | `vendor/melisplatform/melis-cms-category2/ui-react/` e o `public/ui-react/` compilado |
| Manifesto do bloco | `vendor/melisplatform/melis-cms-category2/public/ui-react/brick.manifest.json` |
| Serviço principal | `vendor/melisplatform/melis-cms-category2/src/Service/MelisCmsCategoryService.php` |
| Serviço de multimédia | `vendor/melisplatform/melis-cms-category2/src/Service/MelisCmsCategoryMediaService.php` |
| Plugin de templating | `vendor/melisplatform/melis-cms-category2/src/Controller/Plugin/MelisCmsCategoryDisplayCategoriesPlugin.php` |
| SQL de instalação | `vendor/melisplatform/melis-cms-category2/install/sql/` |

Ver também: [melis-cms](/pt/reference/modules/melis-cms), [melis-core](/pt/reference/modules/melis-core), [melis-cms-news](/pt/reference/modules/melis-cms-news)
