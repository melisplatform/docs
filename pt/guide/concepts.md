# Arquitetura e conceitos

O Melis Platform é uma **aplicação MVC Laminas (de linhagem ZF2)**. Por cima do Laminas padrão, acrescenta
um punhado de convenções que dão vida ao backoffice. Compreender estes cinco conceitos é suficiente para
ler — e estender — praticamente qualquer parte da plataforma.

Na **v6**, a framework e os módulos permanecem inalterados: os mesmos módulos Laminas, a mesma árvore de
configuração, os mesmos serviços e eventos. O que mudou foi a **interface do back-office**: a v6 traz um novo
**back-office React em `/melis-react`** por cima dessa base inalterada (ver §6). Os cinco
conceitos abaixo continuam a descrever como tudo funciona por baixo.

## 1. Módulos

Tudo no Melis é um **módulo** (um módulo Laminas padrão). A lista de módulos de backoffice
carregados pela aplicação encontra-se em:

```
config/melis.module.load.php
```

```php
return [
  'MelisAssetManager',
  'MelisDbDeploy',
  'MelisCore',
  'MelisCms',
  'MelisFront',
  // … os seus próprios módulos vão aqui
];
```

No arranque, `config/application.config.php` monta a lista final de módulos através do
`MelisCore\MelisModuleManager` (que combina estes módulos com os módulos de componentes e o
módulo de site selecionado por `MELIS_MODULE`).

Um módulo agrupa os seus próprios controladores, serviços, vistas, traduções **e** um conjunto de
ficheiros de configuração específicos do Melis (ver abaixo). O seu `Module::getConfig()` combina-os todos. Na v6, um
módulo pode **também** fornecer um "brick" React (uma pequena interface React) e os seus próprios endpoints `react-api` —
que continuam a ser apenas configuração e código-fonte adicionais dentro do mesmo módulo (ver §6).

## 2. A árvore de configuração e as "melis keys"

Para além do habitual `module.config.php`, cada módulo de backoffice publica **ficheiros de configuração da aplicação** que
são combinados numa única árvore consultável sob uma raiz `plugins`:

| Ficheiro              | Declara                                                    |
| --------------------- | --------------------------------------------------------- |
| `app.interface.php`   | Zonas/secções da UI e os seus **forwards** (ver §3)       |
| `app.tools.php`       | Ferramentas: tabelas de dados, colunas, filtros, botões de ação |
| `app.toolstree.php`   | Onde uma ferramenta se liga no **menu à esquerda**        |
| `app.forms.php`       | Definições de formulários                                 |

Consulta-se esta árvore através do serviço **`MelisCoreConfig`**
(`vendor/melisplatform/melis-core/src/Service/MelisCoreConfigService.php`):

```php
$config = $sm->get('MelisCoreConfig');

// Obter um nó por caminho:
$node = $config->getItem('meliscore_leftmenu');

// Resolver todas as "melis keys" → caminhos de configuração completos:
$keys = $config->getMelisKeys();
```

Uma **melis key** é um alias estável e legível para um caminho de configuração profundamente aninhado, declarado num
nó através de `'conf' => ['melisKey' => 'my_key']`. Permite que os módulos referenciem a UI uns dos outros sem
um acoplamento rígido a um caminho. Esta mesma **melisKey** é o que o back-office React usa para identificar uma
ferramenta — tanto para lhe encaminhar como para a filtrar por permissões (ver §6).

## 3. Zonas e forwards (como o backoffice é renderizado)

A interface do backoffice é **orientada por configuração**. Uma página é uma árvore de **zonas**; cada zona pode declarar um
**forward** — um trio `module / controller / action` que renderiza essa zona:

```php
'forward' => [
  'module'     => 'MelisCms',
  'controller' => 'PageTree',
  'action'     => 'render-page-tree',
],
```

O `MelisCore\Controller\PluginViewController` percorre a árvore de configuração, despacha cada forward e
monta o HTML resultante. É por isto que o menu à esquerda, os cabeçalhos e as ferramentas são todos declarados em
configuração em vez de estarem codificados de forma rígida — e por que razão adicionar uma ferramenta é sobretudo uma questão de **declarar a configuração
correta** e fornecer um controlador + uma vista.

Na v6, esta maquinaria de zonas/forwards continua a ser a fonte de verdade e alimenta o shell React de
duas formas: qualquer ferramenta clássica que não tenha um ecrã React nativo é renderizada como uma **zona autónoma**
e apresentada dentro do shell num iframe, e o menu à esquerda que o shell mostra é construído a partir da
mesma configuração de interface, filtrado por permissões (ver §6).

## 4. Serviços e fábricas

O Melis assenta no **service manager do Laminas**. Os serviços são registados no
`module.config.php` de cada módulo (`service_manager` → `aliases` / `factories`) e resolvidos por nome:

```php
$svc = $this->getServiceManager()->get('MelisCoreConfig');
```

Os serviços centrais comuns incluem `MelisCoreConfig`, `MelisCoreAuth`, `MelisCoreRights`,
`MelisCoreUser`, `MelisCoreTool`. Os serviços de negócio estendem normalmente `MelisGeneralService`
(que acrescenta o despacho de eventos); o acesso à base de dados passa por invólucros `TableGateway` do Laminas.
Os ecrãs React da v6 não alteram isto: um brick React é apenas apresentação — cada ação que executa
invoca de volta esses **mesmos serviços do lado do servidor** através de endpoints `react-api` (ver §6).

## 5. Eventos

Os módulos ligam-se ao ciclo de vida do pedido em `Module::onBootstrap()` e através de listeners no
**gestor de eventos partilhado**. O comportamento central (autenticação, verificações de permissões, mensagens flash,
cache…) é ligado desta forma, e pode publicar/subscrever eventos Melis personalizados — por exemplo,
`melis_core_auth_login_ok` é disparado após uma autenticação bem-sucedida.

## 6. O back-office React (v6)

A v6 mantém a framework e os módulos, mas **substitui a interface do back-office** por uma aplicação de página única (SPA)
React servida em **`/melis-react`** (a interface clássica `/melis` continua a existir por baixo). Duas ideias
bastam para o imaginar:

- **Bricks** — uma ferramenta nativa em React. Um módulo fornece um `public/ui-react/brick.manifest.json` e um
  bundle compilado; o shell **descobre** os bricks de cada módulo ativo e monta-os. Um brick
  aparece **se e apenas se** o seu módulo estiver ativado — a mesma regra de modularidade que existe em todo o lado.
- **Alternância Novo / Antigo** — a maioria das ferramentas tem um botão no canto superior direito: **Novo** = o ecrã React nativo,
  **Antigo** = a ferramenta clássica renderizada dentro de um iframe. Assim, nada se perde enquanto os módulos são
  progressivamente reescritos em React.

Tudo aquilo que o shell mostra à volta das suas ferramentas — quem é, o **menu à esquerda** (já filtrado pelas
suas permissões), o seletor de idioma, os mosaicos do **dashboard**, a descoberta de ferramentas — é montado no
arranque a partir de um pequeno conjunto de **endpoints JSON** genéricos sob `/melis/react-api/…`, cada um devolvendo um
payload `{ success, data, error? }`. Um **Assistente de IA** flutuante e global está disponível em
todos os ecrãs.

![A sobreposição do Assistente de IA React](/screenshots/react/melis-ai/melisai-footer-icon-generalassistant-deployed.png)
*O Assistente de IA flutuante está disponível a partir de qualquer ecrã do back-office React.*

Três módulos fazem isto funcionar, e nenhum deles é uma ferramenta a que se navegue:

- **MelisReactApi** — a espinha dorsal da API JSON. Não desenha qualquer UI; serve o conjunto de arranque
  (`/me`, `/menu`, `/langs`, `/assets`, `/react-modules`) mais os endpoints do dashboard e das permissões,
  e aloja o motor de **capacidades** (ver abaixo). Os endpoints de dados *próprios* de uma ferramenta vivem no
  módulo dessa ferramenta, não aqui.
- **MelisReactOverride** — a canalização que (a) serve o shell React para `/melis-react` e as suas
  ligações diretas, e (b) renderiza qualquer ferramenta clássica como uma página autónoma
  (`/melis/react-tool-page?key=<melisKey>`) para que a alternância **Antigo** e qualquer ferramenta ainda não reescrita
  continuem a funcionar dentro do shell.
- Cada **módulo de funcionalidade** (por exemplo, `MelisCms`) fornece os seus próprios bricks, rotas `react-api` e
  capacidades.

As **capacidades** são as "permissões avançadas" de granularidade fina da v6: *dentro* de uma ferramenta já autorizada,
ações individuais (`list`, `create`, `edit`, `delete`, ou um separador aninhado) podem ser negadas por
utilizador/perfil. São **permitidas por omissão** e **subordinadas** à verificação clássica de acesso à ferramenta
(`MelisCoreRights::canAccess`, inalterada) — uma ferramenta sem declaração de capacidades mantém o CRUD completo.
Um módulo declara as capacidades que existem para a `melisKey` da sua ferramenta em
`config/react.capabilities.php`; os seus controladores restringem cada ação com `denyUnlessCan($cap)`.

> Regra prática: se o shell React o mostra (menu, cabeçalho, dashboard, lista de ferramentas, matriz de permissões)
> mas não é o ecrã próprio de uma ferramenta específica, veio de um endpoint MelisReactApi. Se estiver a
> olhar para uma ferramenta clássica ao estilo Bootstrap dentro de `/melis-react`, está a ver o MelisReactOverride
> a renderizar essa ferramenta num iframe.

Para o contrato completo e os pormenores internos, consulte as referências dos módulos:
[MelisReactApi](/pt/reference/modules/melis-react-api) e
[MelisReactOverride](/pt/reference/modules/melis-react-override); para um exemplo prático de um
módulo com múltiplos bricks, [MelisCms](/pt/reference/modules/melis-cms).

## Bónus: alterações à base de dados (dbdeploy e flyway)

As alterações de esquema e de dados iniciais são versionadas:

- **dbdeploy** (`MelisDbDeploy`): cada módulo fornece deltas SQL numerados; os deltas aplicados são
  registados numa tabela `changelog` para que sejam executados apenas uma vez. Os deltas dos módulos são publicados em `dbdeploy/`.
- **flyway** (`flyway/sql/`): migrações ao nível do projeto (por exemplo, `V3__add_melisai_rights.sql`),
  aplicadas com `flyway migrate`.

## Onde procurar no código

| Aspeto              | Caminho |
| ------------------- | ------- |
| Lista de módulos    | `config/melis.module.load.php` |
| Arranque da aplicação | `config/application.config.php` |
| Configuração da BD da plataforma | `config/autoload/platforms/<MELIS_PLATFORM>.php` |
| Serviço de configuração | `vendor/melisplatform/melis-core/src/Service/MelisCoreConfigService.php` |
| Renderização de zonas/forwards | `vendor/melisplatform/melis-core/src/Controller/PluginViewController.php` |
| Gestor de módulos   | `vendor/melisplatform/melis-core/src/MelisModuleManager.php` |
| Shell React (SPA)   | `vendor/melisplatform/melis-core/public/ui-react/` |
| API React + capacidades | `vendor/melisplatform/melis-react-api/` |
| Canalização do shell React e do iframe | `vendor/melisplatform/melis-react-override/` |

A seguir: junte tudo ao [criar a sua primeira ferramenta](./create-a-tool).
