# MelisSql

> Executor de consultas SQL só de leitura nas Ferramentas de Programação (Dev Tools) do back-office React, fornecido como brick nativo totalmente em React. Pacote `melisplatform/melis-sql`.

## Objetivo

MelisSql é uma pequena ferramenta para programadores: um **executor de consultas SQL só de leitura**. Escreve uma
instrução `SELECT`, carrega em **Run** e as linhas correspondentes são devolvidas numa tabela dinâmica — sem sair do
back-office nem abrir um cliente de base de dados externo. Liga-se usando as credenciais
`config['db']` configuradas na plataforma, pelo que não é necessário introduzir quaisquer detalhes de ligação.

No Melis v6, a ferramenta é fornecida como **brick nativo totalmente em React** em `/melis-react`: uma verdadeira página React que
chama um único endpoint JSON `react-api`, com um seletor **New / Old** que pode recorrer à
ferramenta legada dentro de uma iframe. É uma ferramenta de diagnóstico e inspeção exclusiva para administradores, não uma funcionalidade para o utilizador final.

## Ativá-la

Adicione a `config/melis.module.load.php`:

```php
return [
    'MelisSql',
];
```

A ferramenta aparece no back-office React **apenas se o módulo estiver ativado** (deteção modular de
bricks). Requer `melisplatform/melis-core` e PHP `^8.1|^8.3|^8.4`.

## Onde se encontra em /melis-react

Barra lateral esquerda → grupo **Dev Tools** → **SQL**. Abre-se como um separador superior denominado **SQL**. O manifesto do brick
declara a rota `/melis-core/sql` e associa-lhe a `forwardKey` de menu `MelisSql/List`.

É uma **ferramenta de ecrã único**: uma página com uma caixa de consulta, um botão **Run** e uma tabela dinâmica de
resultados. Sem sub-separadores, sem detalhe aprofundado.

![A ferramenta SQL em React: cabeçalho com título/subtítulo, o seletor New/Old (canto superior direito), uma área de texto de consulta com o marcador de posição `SELECT * FROM my_table LIMIT 10;`, a dica "One SELECT statement only, ending with « ; »", um botão Run vermelho e um cartão de resultados vazio.](/screenshots/react/melis-sql/melissql-tool-sql.png)

## Utilizar a ferramenta React

1. Escreva **uma** instrução `SELECT` na área de texto de consulta.
2. Termine-a com um ponto e vírgula `;`.
3. Clique em **Run** (ou carregue em **Ctrl/Cmd + Enter**).

Assim que uma consulta devolve resultados, aparece um cartão de resultados com:

- Uma **contagem de linhas** (por exemplo, `12 row(s)`; ao pesquisar, `matches / total`).
- Uma caixa de **pesquisa** que filtra as linhas devolvidas em **todas** as colunas (mesmo as ocultas).
- Um botão **Columns** que abre um gestor de colunas: duas listas (**Visible** / **Hidden**), arraste para
  ocultar/reordenar, **Reset** para as mostrar todas. A disposição é memorizada por navegador
  (`localStorage`, chave `melis-sql-cols-v1`).
- A própria **tabela**: clique num cabeçalho para **ordenar** (ascendente → descendente); blobs de imagem reconhecidos
  (por exemplo, um avatar de utilizador) são apresentados inline como miniaturas.

### Seletor New / Old

Um seletor **New / Old** no canto superior direito alterna toda a ferramenta entre vistas. **New** (predefinição) é a
interface React; **Old** apresenta a ferramenta legada numa iframe única
(`/melis/react-tool-page?key=melissql_tool`), posicionada sobre uma âncora através de um `ResizeObserver`.

## Regras das consultas

A ferramenta recusa tudo o que não seja uma única instrução só de leitura, mostrando o motivo num
banner vermelho:

| Situação | O que acontece |
| --- | --- |
| A instrução não começa por `SELECT` | Rejeitada — *only SELECT queries are allowed*. |
| Sem ponto e vírgula no final | Rejeitada — *a query should end with ';'*. |
| Mais do que uma instrução (vários `;`) | Rejeitada — *only one query is allowed*. |
| **Não** é administrador da plataforma | Rejeitada — **403 Forbidden** (exclusivo para administradores). |
| A consulta não pode ser preparada / falha | O erro da base de dados é mostrado no banner. |

## Endpoint da API React

**Não** existe qualquer `config/react-api.php` para este módulo. O único endpoint é alcançado através da
rota catch-all de back-office do módulo (`config/module.config.php`,
`/melis/MelisSql[/:controller[/:action]]`), que resolve o alias
`MelisSql\Controller\MelisSqlReactApi` → `MelisSqlReactApiController` (declarado sob
`controllers.invokables`). Contrato: `{ success, data, error }`.

| Método e URL | Ação do controlador | Objetivo |
| --- | --- | --- |
| `POST /melis/MelisSql/MelisSqlReactApi/run` | `runAction` | Validar + executar uma única `SELECT` só de leitura, devolver `{ columns, rows, rowCount }` |

Corpo do pedido: `{ "query": "SELECT … ;" }`.

```ts
// runSqlQuery(query) — the only call the brick makes (ui-react/src/sql-api.ts)
const res = await fetch('/melis/MelisSql/MelisSqlReactApi/run', {
  method: 'POST',
  headers: { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: 'SELECT * FROM melis_cms_page_tree;' }),
})
// → { success: true, data: { columns: string[], rows: Record<string,unknown>[], rowCount: number } }
```

O `MelisSqlReactApiController` **estende o `ListController` legado** para reutilizar tal e qual a sua salvaguarda `runQuery()`
(a mesma ligação `mysqli` a partir de `config['db']`, a mesma validação de instrução única / só `SELECT`,
as mesmas mensagens de erro traduzidas). Acrescenta apenas a reformatação em JSON, além das salvaguardas abaixo.
Os erros de validação/BD devolvem HTTP **200** com `{ success:false, error }`; as falhas de autenticação devolvem
401/403; um método diferente de `POST` devolve 405.

## Capacidades

Declaradas em `config/react.capabilities.php` (mescladas através de `MelisSql\Module::getConfig()`), indexadas sob
a melisKey `melissql_tool` da ferramenta:

```php
return ['melisReactToolCapabilities' => [
    'melissql_tool' => ['run'],   // one internal cap: the Run (execute-query) action
]];
```

- **`run`** é uma capacidade personalizada (não uma das capacidades padrão `list/create/edit/delete/export`).
  Permite a um administrador *ver/consultar* a ferramenta sem necessariamente ter permissão para **executar** consultas.
- **Controlo no front-end.** `SqlPage` chama `useCaps('melissql_tool')` → `can('run')` e só então apresenta
  o botão **Run** e ativa o atalho Ctrl/Cmd + Enter.
- Este ficheiro é **apenas declarativo** (controla as caixas de verificação em Users → Rights); a **verdadeira aplicação**
  é a guarda de acesso + a barreira `usr_admin` no controlador.

## Notas de segurança

- **Exclusivo para administradores.** O controlador executa `denyUnlessAccess()` (401 se não autenticado, 403 se
  `MelisCoreRights::canAccess('melissql_tool')` falhar) e, adicionalmente, exige `usr_admin`. O
  direito `melissql_tool` é delegável, pelo que **os direitos por si só não bastam** — um não-administrador recebe
  **403 Forbidden**.
- **Só de leitura por construção.** `runQuery()` rejeita tudo o que não seja exatamente uma única instrução
  terminada em `;` e começada por `SELECT` — sem caminho para `INSERT`/`UPDATE`/`DELETE`/DDL. Trate qualquer
  alteração a `runAction`/`runQuery` como sensível em termos de segurança.
- **Mascaramento de colunas sensíveis.** `maskSensitiveColumns()` mascara os *valores* das colunas cujo nome
  corresponda a `password|passwd|pwd|mot_de_passe|secret|token|api_key` com `••••••••`, do lado do servidor, para que um
  hash nunca chegue ao navegador num `SELECT *`. É uma salvaguarda, não uma fronteira.
- **JSON seguro para binários.** `sanitizeForJson()` codifica em base64 os binários não-UTF-8 e emite os blobs de imagem
  reconhecidos (por exemplo, `melis_core_user.usr_image`) como URIs `data:<mime>;base64,…` para apresentação inline.
- Evite `SELECT *` sem limites em tabelas muito grandes: não existe paginação do lado do servidor.

## Ficheiros-chave

| Assunto | Caminho |
| --- | --- |
| Rota catch-all, invokable do controlador, extensão do toolpage da vista Old | `config/module.config.php` |
| Capacidades (`melisReactToolCapabilities` → `melissql_tool` → `run`) | `config/react.capabilities.php` |
| Ferramenta legada + salvaguarda `runQuery()` (reutilizada pelo controlador da API) | `src/Controller/ListController.php` |
| Controlador da API React (barreira de administrador + reutilização de `runQuery` + mascaramento + JSON seguro) | `src/Controller/MelisSqlReactApiController.php` |
| Particularidade de `toolPageAction()` da iframe da vista Old | `src/Controller/React/PluginViewToolPageExtension.php` |
| Código-fonte do brick React (Vite IIFE) | `ui-react/src/` — `brick.tsx`, `SqlPage.tsx`, `ViewToggle.tsx`, `sql-api.ts` |
| Brick compilado + manifesto | `public/ui-react/brick.js`, `public/ui-react/brick.manifest.json` |

Ver também: [MelisCore](/pt/reference/modules/melis-core)
