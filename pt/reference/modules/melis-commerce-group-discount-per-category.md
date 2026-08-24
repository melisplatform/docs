# MelisCommerceGroupDiscountPerCategory

> Adiciona um desconto de preço por categoria, delimitado por país e por grupo de clientes, sob a forma de um separador "Price Discount" injetado na ferramenta Catalogs do MelisCommerce no back-office React. Pacote `melisplatform/melis-commerce-group-discount-per-category`.

## Objetivo

O MelisCommerceGroupDiscountPerCategory permite definir uma **percentagem de desconto sobre os produtos de uma categoria, por país e por grupo de clientes**. O desconto é delimitado por *(categoria × país × grupo de clientes)*, pelo que dois clientes que comprem o mesmo produto podem ver dois preços diferentes consoante o grupo a que pertencem, e o desconto pode variar de país para país (com um pseudopaís **General**, id `-1`, que se aplica a todas as zonas).

O módulo **não tem ferramenta própria**. É um **bloco de extensão / injeção no host**: não desenha qualquer página nem acrescenta qualquer entrada de menu. Em vez disso, publica um componente React em `window`, que a página Catalogs do MelisCommerce recolhe — quando o módulo está ativo — para adicionar um separador **Price Discount** ao editor de categorias. A persistência real permanece no serviço Laminas do módulo, inalterada em relação à ferramenta legada.

## Ativá-lo

Adicione a `config/melis.module.load.php`:

```php
return [
    'MelisCommerceGroupDiscountPerCategory',
];
```

Por se tratar de um bloco de extensão, o separador aparece **apenas quando ambas** estas condições se verificam:

- **O módulo está ativo** — só um bloco ativo publica o seu global em `window` para o host o recolher.
- **O utilizador detém o direito `price_discount`** sobre a ferramenta Catalogs.

Não existe qualquer **`config/react.capabilities.php`** neste módulo: a capacidade `price_discount` é declarada no **MelisCommerce**, sob a melisKey portadora de direitos da ferramenta Catalogs, `meliscommerce_categories_page`.

## Onde reside no back-office React

Não existe ecrã dedicado. A funcionalidade é um separador dentro da ferramenta Catalogs:

- Barra lateral → **Commerce → Catalogs**.
- Abra/edite uma **categoria** existente.
- Clique no separador **Price Discount** (rotulado *"Discount Per Client's Group"* / *"Réduction par groupe de client"*).

O separador é **apenas de edição**: liga-se a uma categoria existente, pelo que está desativado ao *criar* uma — grave a categoria primeiro. Também **não tem botão Save próprio**; os descontos são gravados pelo botão **"Save category"** do formulário do host.

O separador tem duas áreas:

- uma lista de **Country** à esquerda (**General** primeiro, seguido de cada país com a respetiva bandeira); um crachá indica quantos descontos estão preenchidos para esse país;
- um conjunto de **separadores de grupos de clientes** à direita — escolha um grupo e depois introduza a respetiva **percentagem de desconto** para o país selecionado. Um ponto assinala um separador de grupo que já contém um valor (vermelho se inválido).

## Regras de desconto

- **Percentagem** — `0 < value ≤ 100`, no máximo **2 casas decimais**. Deixar um campo **vazio** remove (elimina) essa linha de desconto.
- Só são oferecidos os grupos de clientes **ativos**.
- O campo valida à medida que escreve; um valor inválido é mostrado sob o próprio campo e marca o separador do grupo a vermelho. Ao **Save category**, uma percentagem inválida **bloqueia** a gravação e muda o separador para o primeiro par país + grupo em falta. Caso contrário, a categoria grava primeiro, e depois os descontos gravam com ela.

## Anatomia do bloco

A fonte do bloco é uma biblioteca **IIFE** Vite em `ui-react/`, que compila para `public/ui-react/brick.js` (+ `brick.manifest.json`). O React é externalizado para os globais do host, de modo que o componente é renderizado dentro da página Catalogs. O manifest não declara **rota, label, forwardKey nem melisKey** (todos `null`), e a entrada **não** chama `__melisRegisterBrick` — ao carregar, limita-se a publicar um global:

```ts
window.MelisCommerceGroupDiscountPerCategoryBrick = {
  CategoryDiscountTab,
  tabLabel: { fr: 'Réduction par groupe de client', en: "Discount Per Client's Group" },
}
```

| Ficheiro | Função |
| --- | --- |
| `src/brick.tsx` | Publica o global `window.MelisCommerceGroupDiscountPerCategoryBrick`. Sem rota, sem registo. |
| `src/CategoryDiscountTab.tsx` | A interface do separador (props `{ categoryId }`): lista de países + separadores de grupos de clientes + campo de percentagem, dicionário fr/en autónomo, validação do lado do cliente e os ouvintes de evento de gravação-com-formulário. |
| `src/discountApi.ts` | Cliente JSON para os endpoints `react-api` do módulo, usando o contrato `{ success, data, error }`. |

O label do separador é fornecido por **este** módulo (no global), e não pelo dicionário do MelisCommerce. O separador lê o idioma ativo a partir de `document.documentElement.lang`.

## API React

As rotas são definidas em `config/react-api.php` e integradas nas `child_routes` do `melis-react-api`. Controlador: `MelisReactApiCategoryDiscountController` (`optionsAction` / `getAction` / `saveAction`). Forma da resposta `{ success, data, error? }`.

| Método + URL | Ação | Devolve (`data`) |
| --- | --- | --- |
| `GET /melis/react-api/category-discounts/options` | `optionsAction` | `{ countries, groups }` — países com **General** (id `-1`) primeiro + bandeiras em base64; grupos de clientes **ativos**. |
| `GET /melis/react-api/category-discounts/:id` | `getAction` | `{ items }` — descontos guardados para a categoria `:id`. |
| `POST /melis/react-api/category-discounts/save` | `saveAction` | `{ items }` — descontos relidos após a gravação (ids atualizados). |

Formas TS (`discountApi.ts`):

```ts
interface CountryOpt  { id: number; name: string; flag: string | null; general: boolean }
interface GroupOpt    { id: number; name: string }
interface DiscountRow { id: number; countryId: number; groupId: number; percentage: number }
```

**Proteção de acesso (nas três ações):** `denyUnlessAccess()` exige uma identidade autenticada (`MelisCoreAuth`, caso contrário 401) e `MelisCoreRights->canAccess('meliscommerce_categories_page')` — a melisKey da ferramenta Catalogs do **host** (caso contrário 403). O separador nunca pode ser mais permissivo do que a ferramenta em que reside.

**Contrato de gravação.** O cliente envia **todas** as células (incluindo as vazias — uma `percentage` vazia elimina essa linha). O `saveAction` revalida (numérico, ≤ 2 casas decimais, ≤ 100, > 0), reconstrói a estrutura legada `[countryId][groupId] => ['gdc_id' => …, 'gdc_discount_percent' => …]` e delega no serviço — sem lógica de negócio no controlador:

```php
$this->getServiceManager()
     ->get('MelisCommerceGroupDiscountPerCategoryService')
     ->saveCategoryGroupDiscount($categoryId, $datas);   // same service + events as the legacy tool
```

O `options`/`get` leem a partir de `MelisCommerceGroupDiscountPerCategoryService->getCategoryDiscountsByCategoryId()`, `MelisEcomCountryTable->getCountries()` e `MelisComClientGroupsService->getClientsGroupList()`.

## Integração com o host

- **Descoberta / carregamento:** fluxo padrão de bloco — `GET /melis/react-api/react-modules` lista-o, o host carrega `brick.js` em segundo plano, e `brick.tsx` publica o global.
- **Recolha do componente:** o `CatalogPage.tsx` do MelisCommerce resolve o componente e o label através dos auxiliares genéricos, e adiciona o separador **apenas se ambos resolverem** e somente em modo de **edição**:

  ```ts
  const DiscountTabComp  = useExternalBrickComponent<{ categoryId: number }>(
    'MelisCommerceGroupDiscountPerCategoryBrick', 'CategoryDiscountTab')
  const DiscountTabLabel = useExternalBrickValue<{ fr: string; en: string }>(
    'MelisCommerceGroupDiscountPerCategoryBrick', 'tabLabel')
  ```

  O conteúdo do separador é **montado permanentemente** (oculto com `display:none` quando inativo) para conservar os seus campos e ouvintes.

- **Ponte de gravação-com-formulário** (dois `CustomEvent`s em `window`):
  - `melis:commerce-category-validate` — despoletado antes de gravar; o separador valida e, no primeiro valor inválido, define `detail.blocked = true` e `detail.tab = 'price_discount'`, abortando a gravação da categoria.
  - `melis:commerce-category-saved` — despoletado depois de a categoria ser gravada; o separador coloca a sua promessa `submit({ silent: true })` em `detail.pending`, que o `CatalogPage` aguarda antes de concluir.

## Ficheiros-chave

| Aspeto | Caminho |
| --- | --- |
| Fonte do bloco (componente, cliente de api) | `ui-react/src/{brick.tsx, CategoryDiscountTab.tsx, discountApi.ts}` |
| Bloco compilado + manifest | `public/ui-react/{brick.js, brick.manifest.json}` (id `commerce-group-discount-per-category`) |
| Rotas da API React | `config/react-api.php` |
| Ligação do módulo | `config/module.config.php` |
| Controlador da API React | `src/Controller/ReactApi/MelisReactApiCategoryDiscountController.php` |

Ver também: [melis-commerce](/legacy/reference/modules/melis-commerce)
