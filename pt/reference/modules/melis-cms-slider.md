# MelisCmsSlider

> Gestor de sliders / carrosséis do back-office — agora um bloco React nativo do back-office — com um plugin de templating no front-office para exibir sliders nas páginas. Pacote `melisplatform/melis-cms-slider`.

## Propósito

O MelisCmsSlider disponibiliza uma ferramenta de back-office para construir **sliders** (carrosséis nomeados de slides ordenados —
imagem, título, subtítulos, ligação) e um bloco de conteúdo `MelisCmsSliderShowSliderPlugin` que apresenta um
slider escolhido em qualquer página do front-office. Também fornece um **seletor de slider** reutilizável, sob a forma de elemento de formulário, que
outros módulos (News, Blog) incorporam para associar um slider a um item de conteúdo.

No Melis v6 a ferramenta fornece um **bloco totalmente nativo em React** para o back-office `/melis-react`, com um
comutador **Novo / Antigo** que recorre à ferramenta clássica dentro de um iframe. A framework, os serviços, as tabelas de BD
e o plugin de front-office mantêm-se inalterados relativamente ao v5.

## Ativação

Adicione a `config/melis.module.load.php`:

```php
return [
    // …
    'MelisCmsSlider',
];
```

Requer: `melis-core`, `melis-engine`, `melis-front`, `melis-cms`. O módulo fornece
`dbdeploy: true`, pelo que as suas tabelas são criadas/atualizadas pelo melis-dbdeploy. O bloco React é
**condicionado à ativação**: apenas aparece no back-office enquanto o módulo estiver em
`melis.module.load.php` (deteção modular de blocos, ver abaixo).

## Back-office React

**Onde:** barra lateral esquerda → grupo **MelisCms** → **Slider** (rota da árvore `/melis-cms/slider`). Abre
como um separador de topo denominado **Slider**. Um comutador **Novo / Antigo** (canto superior direito) alterna entre a interface React
(*Novo*, predefinição) e a ferramenta legada num iframe (*Antigo*).

A ferramenta é uma **navegação em três níveis**, apresentada como **subseparadores** nativos do host: lista de sliders → os
slides de um slider → o formulário de um slide.

![Lista de sliders em React com cartões KPI, pesquisa, gestor de colunas, Export e o comutador Novo/Antigo](/screenshots/react/melis-cms-slider/meliscmsslider-tool-slider-list.png)

### Nível 1 — a lista de sliders

Lista todos os sliders da plataforma (os sliders são globais; um slider pode, opcionalmente, ser associado a uma página).
A lista tem **cartões KPI** (total de sliders, total de slides, slides ativos), uma caixa de **pesquisa**, um
gestor de **Colunas**, um botão **Export** e **Repor filtros**; clique num cabeçalho para ordenar. Cada linha
oferece **abrir** (os seus slides), **renomear** e **eliminar**.

**+ New slider** abre uma janela modal para o **nome** e uma **página associada** opcional escolhida a partir da árvore de
páginas do site; a mesma janela modal renomeia um slider existente.

![Janela modal de novo slider — nome mais página associada opcional a partir da árvore de páginas](/screenshots/react/melis-cms-slider/meliscmsslider-tool-slider-new.png)

### Nível 2 — os slides de um slider

Abrir um slider adiciona um subseparador (com **← Back**) que mostra os slides desse slider: ordem, estado
(verde = ativo), miniatura da imagem, título, subtítulo e ligação. **Arraste uma linha para reordenar**; **+ Add a
slide** cria um slide; edite/elimine por linha.

![Os slides de um slider — lista com reordenação por arrasto e edição e eliminação por linha](/screenshots/react/melis-cms-slider/meliscmsslider-tool-slider-edit-slidelist-tab-properties.png)

### Nível 3 — editar um slide

Editar (ou adicionar) um slide abre um subseparador aninhado com um formulário React: **Title**, **Subtitle 1**, dois
campos **Description (HTML)**, **Link**, um comutador **Active** e um painel **Image** (pré-visualização,
**Choose an image** / **Remove image**; JPG, PNG, GIF ou WebP). **Save** persiste o slide. Title e
Subtitle 1 são texto simples; os dois campos Description são HTML em bruto e mapeiam para `sub2`/`sub3`.

![Formulário de slide em React — título, subtítulo, duas descrições HTML, ligação, comutador Active e painel de imagem](/screenshots/react/melis-cms-slider/meliscmsslider-tool-slider-edit-properties-slide-edit.png)

## API React

O bloco lê/escreve através de uma camada JSON em `/melis/react-api/sliders` (rotas em
`config/react-api.php`, controlador `MelisReactApiCmsSliderController`). Todas as respostas seguem o
contrato `{ success, data, error }`; cada pedido envia `X-Requested-With: XMLHttpRequest` com
`credentials: 'include'`.

| Método e URL | Propósito |
| --- | --- |
| `GET /sliders` | Lista sliders (keyset: `limit`, `search`, `sort`, `dir`, `after`) com `slideCount`. |
| `GET /sliders/stats` | Contagens KPI `{sliders, slides, active}`. |
| `GET /sliders/:id` | Um slider `{id, name, pageId, slideCount}`. |
| `POST /sliders/save` | Criar / renomear um slider (`{id?, name, pageId?}`). |
| `DELETE /sliders/delete/:id` | Elimina um slider, os seus slides e os ficheiros de imagem. |
| `GET /sliders/:id/slides` | Os slides ordenados de um slider. |
| `POST /sliders/slides/reorder` | Reordenar (`{sliderId, ids:[…]}`). |
| `POST /sliders/slide/upload` | Envio de imagem multipart (campo `image`, `?sliderId=`) → `{path}`. |
| `GET /sliders/slide/:id` | Um slide. |
| `POST /sliders/slide/save` | Criar / atualizar um slide. |
| `DELETE /sliders/slide/delete/:id` | Elimina um slide, reordena a sequência e remove a sua imagem. |

O controlador comunica diretamente com as tabelas via SQL parametrizado, reproduzindo as regras de negócio
legadas (nome obrigatório ≤255, ordem do slide automática = max+1, imagens em `/media/sliders/<sliderId>/…` com
extensões jpg/jpeg/gif/png/webp, verificação de URL segura na ligação, eliminação em cascata dos ficheiros). O
`MelisCmsSliderService` de nível superior continua a suportar a ferramenta legada e o plugin de front-office.

## Capacidades

Os direitos avançados são declarados em `config/react.capabilities.php`, sob o nó portador de direitos
`meliscms_slider_tools_section`, refletindo os três níveis. As strings de capacidade achatadas (por exemplo,
`list`, `create`, `rename`, `export`, `slides`, `slides.create`, `slides.image.create`) são verificadas em
React via `MelisCan(melisKey, cap)` e no lado do servidor via `denyUnlessCan(cap)`. Cada ação do controlador
está protegida duas vezes — um guarda de acesso (`denyUnlessAccess()` → 401/403) seguido de uma verificação de capacidade;
o resolvedor de capacidades é **permitir por predefinição** para capacidades não declaradas.

## Integração com o host

| Aspeto | Como |
| --- | --- |
| Deteção / condicionamento | `GET /melis/react-api/react-modules` lista os módulos ativos que fornecem um `brick.manifest.json`; o host carrega o `brick.js` e monta o bloco. Remover o módulo oculta a ferramenta. |
| Menu → rota | `useNavMenu` mapeia o `forwardKey` `MelisCmsSlider/MelisCmsSliderList` para `/melis-cms/slider`. |
| Subseparadores | `subTabs: true` — o bloco controla a barra de subseparadores nativa do host via `window.__melisOpenSubTab` / `__melisCloseSubTab` / `__melisUpdateSubTabLabel`; cada ecrã permanece montado (oculto) para o estado subsistir. |
| Comutador Novo / Antigo | `window.__melisSetToolView(MELIS_KEY, mode)`; *Antigo* apresenta `/melis/react-tool-page?key=MelisCmsSlider_left_menu` num iframe. |
| i18n | O bloco lê `document.documentElement.lang` e fornece um dicionário `{fr, en}` incorporado no ficheiro. |

Id do bloco `slider` (corresponde a `brick.tsx` ⇄ `brick.manifest.json`); o bundle é um IIFE Vite com
React externalizado para os globais do host, pelo que a interface usa estilos inline e i18n incorporado no ficheiro em vez de
importar módulos do host.

## Serviços principais

Estes continuam a alimentar a ferramenta legada, os micro-serviços e o plugin de front-office.

| Alias | Função |
| --- | --- |
| `MelisCmsSliderService` | Lógica de negócio para sliders e slides; dispara eventos `meliscmsslider_*`. |
| `MelisCmsSliderTable` | Gateway de tabela para `melis_cms_slider`. |
| `MelisCmsSliderDetailTable` | Gateway de tabela para `melis_cms_slider_details`. |

O `MelisCmsSliderService` estende `MelisGeneralService` e expõe:

| Método | Função |
| --- | --- |
| `getSlider($sliderId, $status)` | Um slider com os seus slides; passe `1` apenas para os slides ativos. |
| `getSliderByPageId($pageId, $status)` | Slider associado ao id de uma página, com os seus slides. |
| `getSliderList($start, $limit, $order, $search)` | Lista de sliders paginada/pesquisável. |
| `getSliderDetails($sliderDetailId)` | Uma única linha de slide. |
| `saveSlider($data, $sliderId)` | Criar ou atualizar um slider; devolve o id do slider. |
| `saveSliderDetails($slideData, $detailId)` | Criar ou atualizar um slide. |
| `updateSliderDetailsOrdering($detailId, $newOrder)` | Reordenar um slide. |
| `deleteSlider($sliderId)` | Elimina um slider e todos os seus slides. |
| `deleteSliderDetails($sliderDetailId)` | Elimina um único slide. |

`getSlider()` / `getSliderByPageId()` devolvem uma entidade `MelisCmsSlider\Entity\MelisCmsSlider` cujo
`getSlider()` fornece a linha do contentor e cujo `getSliderDetails()` fornece os slides.

**Nota sobre a nomenclatura de eventos:** cada método dispara eventos `meliscmsslider_service_*_start` / `_end`, mas vários
métodos de escrita reutilizam os nomes de eventos de outro método na fonte atual. O `saveSlider` dispara os
eventos `get_slider_details`, e `deleteSliderDetails` / `updateSliderDetailsOrdering` reutilizam
os eventos `delete_details` do `deleteSlider` — pelo que um listener em
`meliscmsslider_service_delete_details_end` também dispara nas reordenações.

**Micro-serviços** (`config/app.microservice.php`) expõem `getSliderList`, `getSlider`,
`getSliderDetails`, `getSliderByPageId`.

## Front-office

A partir do **editor de páginas React** (MelisCms → abrir uma página → Edition), abra o painel de plugins e largue o
bloco **Show Slider** na página; as respetivas **Properties** permitem escolher o template de renderização e o
slider a exibir.

![Bloco Show Slider no seletor de plugins do editor de páginas React](/screenshots/react/melis-cms-slider/meliscmsslider-page-menu-plugins-selector.png)

![Definições do plugin Show Slider — escolha o template e o slider a exibir](/screenshots/react/melis-cms-slider/meliscmsslider-page-plugin-slider-config-properties-tab.png)

| Item | Função |
| --- | --- |
| `MelisCmsSliderShowSliderPlugin` (plugin de controlador) | Obtém o slider configurado via `MelisCmsSliderService` e apresenta-o através do template escolhido. Configuração: `config/plugins/MelisCmsSliderShowSliderPlugin.config.php` — um separador **Properties** com `template_path` e `sliderId`. Template predefinido: `view/melis-cms-slider/plugins/showslider.phtml`. |
| `MelisCmsSliderPlugin` (view helper) | `MelisCmsSliderHelper` — apresenta o plugin a partir de um template phtml. |
| `CmsSliderSelect` (elemento de formulário) | Select preenchido com os sliders disponíveis; fábrica `src/Form/Factory/CmsSliderSelectFactory.php`. Usado no formulário de opções do plugin e incorporado por News / Blog. |

**Interfaces do seletor reutilizável:** `meliscmsslider_select_slider` (`renderSelectSliderAction`) para News,
`meliscmsslider_select_slider_blog` para Blog.

**Consumidores:** o MelisCmsNews persiste o slider escolhido em `cnews_slider_id` e fornece um listener que
desassocia um slider eliminado de qualquer notícia que o utilize; o Blog usa `cblog_slider_id`.

## Tabelas da base de dados

| Tabela | Contém |
| --- | --- |
| `melis_cms_slider` | Um slider: `mcslide_id`, `mcslide_name`, `mcslide_page_id`, `mcslide_date`. |
| `melis_cms_slider_details` | Um slide: `mcsdetail_id`, FK `mcsdetail_mcslider_id`, `mcsdetail_status`, `mcsdetail_title`, `mcsdetail_sub1`–`sub3`, `mcsdetail_link`, `mcsdetail_img`, `mcsdetail_order`. |

## Exemplo

```php
$slider = $this->getServiceManager()->get('MelisCmsSliderService');

// Fetch one slider with active slides only
$one    = $slider->getSlider($sliderId, 1);

// Fetch the slider tied to a page
$byPage = $slider->getSliderByPageId($pageId, 1);

// Paginated list
$list   = $slider->getSliderList(0, 10, 'mcslide_id', null);

// Create / update
$id     = $slider->saveSlider($data, $sliderId);
$did    = $slider->saveSliderDetails($slideData, $detailId);

// Reorder
$slider->updateSliderDetailsOrdering($detailId, $newOrder);

// Delete slider + all its slides
$slider->deleteSlider($sliderId);
```

A escutar um evento do serviço:

```php
$sharedEvents->attach(
    'MelisCmsSlider',
    'meliscmsslider_service_delete_details_end',
    $fn,
    50
);
```

## Ficheiros principais

| Aspeto | Caminho |
| --- | --- |
| Ligação do módulo | `vendor/melisplatform/melis-cms-slider/config/module.config.php` |
| Rotas da API React | `vendor/melisplatform/melis-cms-slider/config/react-api.php` |
| Capacidades React | `vendor/melisplatform/melis-cms-slider/config/react.capabilities.php` |
| Controlador da API React | `vendor/melisplatform/melis-cms-slider/src/Controller/MelisReactApiCmsSliderController.php` |
| Bloco React | `vendor/melisplatform/melis-cms-slider/ui-react/src/` · `public/ui-react/brick.manifest.json` |
| Interface / ferramentas do back-office | `vendor/melisplatform/melis-cms-slider/config/app.interface.php` · `app.tools.php` |
| Formulário de slide | `vendor/melisplatform/melis-cms-slider/config/app.forms.php` |
| Configuração do micro-serviço | `vendor/melisplatform/melis-cms-slider/config/app.microservice.php` |
| Configuração do plugin de templating | `vendor/melisplatform/melis-cms-slider/config/plugins/MelisCmsSliderShowSliderPlugin.config.php` |
| Serviço | `vendor/melisplatform/melis-cms-slider/src/Service/MelisCmsSliderService.php` |
| Entidade | `vendor/melisplatform/melis-cms-slider/src/Entity/MelisCmsSlider.php` |
| Gateways de tabela | `vendor/melisplatform/melis-cms-slider/src/Model/Tables/` |
| Fábrica do seletor de slider | `vendor/melisplatform/melis-cms-slider/src/Form/Factory/CmsSliderSelectFactory.php` |
| View helper | `vendor/melisplatform/melis-cms-slider/src/View/Helper/MelisCmsSliderHelper.php` |
| Template de front-office predefinido | `vendor/melisplatform/melis-cms-slider/view/melis-cms-slider/plugins/showslider.phtml` |

Ver também: [Referência de módulos](/pt/reference/modules) · [Página legada v5](/legacy/reference/modules/melis-cms-slider)
