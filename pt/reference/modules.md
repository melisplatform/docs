# Referência dos módulos

A Melis Platform é um conjunto de pacotes Composer `melisplatform/*`. Este é um mapa dos **50
módulos** que acompanham o skeleton v6, agrupados por área. Cada um é um módulo Laminas padrão
em `vendor/melisplatform/`.

A Melis v6 mantém a mesma framework e os mesmos módulos que a v5, mas **substitui o back-office por
uma interface React** servida em `/melis-react`. As ferramentas são agora **"bricks"** nativos em
React — interfaces React autónomas que um módulo disponibiliza e que a shell descobre no arranque —
com um seletor **New (React) / Old (iframe)** para que qualquer ferramenta ainda não reescrita
continue a funcionar como a sua página legada em jQuery/AJAX dentro da shell. Um overlay global de
**Assistente de IA** está disponível em qualquer lado. Esta camada é servida através de dois módulos
de infraestrutura: [`melis-react-api`](/pt/reference/modules/melis-react-api) (a espinha dorsal da
API JSON — utilizador, menu, assets, descoberta de bricks, dados do dashboard, resolver de
capacidades) e [`melis-react-override`](/pt/reference/modules/melis-react-override) (a rota da shell
SPA mais o mecanismo de iframe das ferramentas legadas). Consulte o [guia de
Arquitetura](/pt/guide/architecture) para ver como tudo se articula.

::: tip Uma página por módulo
Cada módulo tem também uma **página de referência dedicada** (finalidade, serviços principais,
ferramentas, plugins, tabelas, ficheiros-chave) — abra a secção **Modules** na barra lateral, por
exemplo [MelisCms](/pt/reference/modules/melis-cms),
[MelisCommerce](/pt/reference/modules/melis-commerce),
[MelisAIEngine](/pt/reference/modules/melis-ai-engine).
:::

## Núcleo e plataforma

| Módulo | Função |
| --- | --- |
| [`melis-core`](/pt/reference/modules/melis-core) | O núcleo da plataforma: shell do back-office, árvore de configuração (`MelisCoreConfig`), autenticação, permissões, utilizadores, serviços e eventos. Inalterado na v6 — apenas a shell que ele alimenta é agora renderizada por React. |
| [`melis-asset-manager`](/pt/reference/modules/melis-asset-manager) | Serve os assets `public/` (CSS/JS/imagens) de cada módulo através de URLs limpos e entrega os bundles compilados. |
| [`melis-cache-internal`](/pt/reference/modules/melis-cache-internal) | Cache HTTP de página completa para o front-office do CMS, com cache parcial (por zona) e exclusões por página. |
| [`melis-composerdeploy`](/pt/reference/modules/melis-composerdeploy) | Integra o Composer para instalar, atualizar e remover módulos programaticamente. |
| [`melis-dbdeploy`](/pt/reference/modules/melis-dbdeploy) | Executor headless de migrações de base de dados — aplica os deltas SQL de cada módulo por ordem. |
| [`melis-marketplace`](/pt/reference/modules/melis-marketplace) | Loja de módulos no back-office para descobrir, transferir, atualizar e remover módulos. |
| [`melis-phpinfo`](/pt/reference/modules/melis-phpinfo) | Ferramenta de diagnóstico só de leitura que apresenta o `phpinfo()` nativo do PHP dentro do back-office React. |
| [`melis-sql`](/pt/reference/modules/melis-sql) | Executor de consultas SQL só de leitura nas Dev Tools, disponibilizado como um brick nativo full-React. |
| [`melis-react-api`](/pt/reference/modules/melis-react-api) | Espinha dorsal da API JSON do back-office React — arranca a shell e aloja o resolver de capacidades. |
| [`melis-react-override`](/pt/reference/modules/melis-react-override) | Infraestrutura React — renderiza as ferramentas legadas dentro da shell `/melis-react` e serve a SPA React. |

## CMS e front

| Módulo | Função |
| --- | --- |
| [`melis-cms`](/pt/reference/modules/melis-cms) | O back-office do CMS — sites, árvore de páginas, editor de páginas, templates, estilos e SEO, como um back-office React. |
| [`melis-engine`](/pt/reference/modules/melis-engine) | Fundação partilhada de dados do CMS — modelo de página, sites, idiomas, classe base dos templating plugins e cache de renderização. |
| [`melis-front`](/pt/reference/modules/melis-front) | Sistema de renderização do front-office — transforma um URL numa página finalizada e disponibiliza os blocos de conteúdo (page plugins). |
| [`melis-demo-cms`](/pt/reference/modules/melis-demo-cms) | O site oficial de referência/demonstração — um **módulo de site** pronto a instalar. |
| [`melis-cms-blog`](/pt/reference/modules/melis-cms-blog) | Sistema de blog com um back-office nativo em React e três plugins de apresentação no front-office. |
| [`melis-cms-comments`](/pt/reference/modules/melis-cms-comments) | Sistema de comentários para Notícias e Blog — moderação, fluxo de aprovação e um plugin de front; um separador Comments no editor. |
| [`melis-cms-news`](/pt/reference/modules/melis-cms-news) | Sistema de notícias/blog com uma ferramenta de autoria em React e três plugins de apresentação no front-office. |
| [`melis-cms-prospects`](/pt/reference/modules/melis-cms-prospects) | Gestão de leads/contactos — um formulário no front captura mensagens; uma ferramenta React permite navegar, filtrar, exportar e classificá-las. |
| [`melis-cms-slider`](/pt/reference/modules/melis-cms-slider) | Gestor de slider/carrossel (brick nativo em React) com um templating plugin no front-office. |
| [`melis-cms-category2`](/pt/reference/modules/melis-cms-category2) | Categorias de conteúdo multi-site e multilingues, com um back-office nativo em React. |
| [`melis-cms-mcq`](/pt/reference/modules/melis-cms-mcq) | Construtor de MCQ (questionários) no back-office, agora uma ferramenta nativa full-React. |
| [`melis-cms-mcq-engine`](/pt/reference/modules/melis-cms-mcq-engine) | Dados, pontuação e renderizador de front-office por detrás da ferramenta MCQ em React. |
| [`melis-cms-page-historic`](/pt/reference/modules/melis-cms-page-historic) | Registo de auditoria para a edição de páginas — um separador Historic no editor de páginas React mais um widget de dashboard. |
| [`melis-cms-page-analytics`](/pt/reference/modules/melis-cms-page-analytics) | Analítica básica de visitas de página, extensível com um fornecedor (por exemplo, Google Analytics). |
| [`melis-cms-page-script-editor`](/pt/reference/modules/melis-cms-page-script-editor) | Injeta `<script>`/`<style>`/HTML personalizado por página ou por site (analítica, pixels, widgets). |
| [`melis-cms-share`](/pt/reference/modules/melis-cms-share) | Injeta meta tags de partilha nas redes sociais / Open Graph, geridas a partir de um back-office nativo em React. |
| [`melis-cms-site-robot`](/pt/reference/modules/melis-cms-site-robot) | Edição de `robots.txt` por domínio e serviço dinâmico, com um back-office nativo full-React. |
| [`melis-cms-tags`](/pt/reference/modules/melis-cms-tags) | Sistema partilhado de tags/taxonomia ao qual os módulos de conteúdo associam itens, agora com um back-office nativo em React. |
| [`melis-cms-user-account`](/pt/reference/modules/melis-cms-user-account) | Sistema de contas de visitantes no front-office — registo, início de sessão e perfis por site, administrado a partir de uma ferramenta React. |
| [`melis-cms-google-analytics`](/pt/reference/modules/melis-cms-google-analytics) | Fornecedor GA4 que apresenta curvas de sessões, totais de KPI e dados demográficos no back-office React. |
| [`melis-cms-link-check`](/pt/reference/modules/melis-cms-link-check) | Testador de ligações que percorre uma página (e opcionalmente sub-páginas) e regista todas as ligações quebradas. |

## Comércio

| Módulo | Função |
| --- | --- |
| [`melis-commerce`](/pt/reference/modules/melis-commerce) | Framework completa de e-commerce — catálogo, clientes, carrinho/checkout/encomendas, cupões, envio e SEO — com um back-office React. |
| [`melis-commerce-order-invoice`](/pt/reference/modules/melis-commerce-order-invoice) | Adiciona a geração de faturas de encomenda em PDF, disponibilizada dentro da ferramenta Orders em React. |
| [`melis-commerce-group-discount-per-category`](/pt/reference/modules/melis-commerce-group-discount-per-category) | Desconto de preço por categoria (por país e grupo de clientes) como um separador na ferramenta Catalogs em React. |

## Extensão e utilitários

| Módulo | Função |
| --- | --- |
| [`melis-templating-plugin-creator`](/pt/reference/modules/melis-templating-plugin-creator) | Assistente do back-office que gera a estrutura de um **templating plugin** completo do front-office. |
| [`melis-dashboard-plugin-creator`](/pt/reference/modules/melis-dashboard-plugin-creator) | Assistente que gera a estrutura de um novo **dashboard plugin** (widget) do back-office, como um brick nativo em React. |
| [`melis-calendar`](/pt/reference/modules/melis-calendar) | Ferramenta de agendamento com um calendário mensal nativo em React, eventos com arrastar e largar e um widget de dashboard. |
| [`melis-cron`](/pt/reference/modules/melis-cron) | Gestor de tarefas agendadas — defina tarefas CLI/HTTP, execute-as e inspecione o histórico de execuções, através de uma ferramenta nativa em React. |
| [`melis-document-upload`](/pt/reference/modules/melis-document-upload) | Gestão de carregamento de documentos como ferramenta nativa em React — defina tipos, recolha e sirva ficheiros. |
| [`melis-messenger`](/pt/reference/modules/melis-messenger) | Mensagens internas entre utilizadores — um ícone de notificação na barra superior e um separador em My Account. |
| [`melis-small-business`](/pt/reference/modules/melis-small-business) | Add-on editorial — papéis, fluxo de validação, versionamento de páginas, comentários, bloqueio e uma biblioteca de media. |

## Autenticação

| Módulo | Função |
| --- | --- |
| [`melis-login-2fa`](/pt/reference/modules/melis-login-2fa) | Núcleo da autenticação de dois fatores — exige um código de utilização única e delega a entrega aos módulos de canal. |
| [`melis-login-2fa-email`](/pt/reference/modules/melis-login-2fa-email) | Canal de entrega por email — envia o código de início de sessão de utilização única por email. |
| [`melis-login-2fa-primotexto`](/pt/reference/modules/melis-login-2fa-primotexto) | Canal de entrega por SMS através do gateway Primotexto. |

## Notificações

| Módulo | Função |
| --- | --- |
| [`melis-newsletter`](/pt/reference/modules/melis-newsletter) | Transforma uma página do CMS numa newsletter de email personalizada e entrega-a a grupos de subscritores, a partir de um back-office React. |

## IA

| Módulo | Função |
| --- | --- |
| [`melis-ai`](/pt/reference/modules/melis-ai) | Back-office React para a suite de IA — ligue fornecedores, desenhe agentes, implemente instâncias, monitorize a utilização, converse em qualquer lado. |
| [`melis-ai-engine`](/pt/reference/modules/melis-ai-engine) | O motor de IA abstrato — contrato de fornecedor, runtime de agentes/cenários, armazenamento de conversas, ponte MCP/ferramentas e componentes de chat React partilhados. |
| [`melis-ai-engine-claude`](/pt/reference/modules/melis-ai-engine-claude) | Fornecedor Anthropic Claude para o motor de IA (backend, sem interface React própria). |
| [`melis-ai-engine-gemini`](/pt/reference/modules/melis-ai-engine-gemini) | Fornecedor Google Gemini para o motor de IA (backend, sem back-office próprio). |
| [`melis-ai-community-extensions`](/pt/reference/modules/melis-ai-community-extensions) | Injeta geração por IA nas superfícies de edição existentes do CMS (mini-templates, notícias, zonas de arrastar e largar). |

::: tip Módulos exclusivos da v5 estão em /legacy
Alguns módulos do back-office da v5 ainda não têm uma página dedicada na v6 — por exemplo,
[`melis-tool-creator`](/legacy/reference/modules/melis-tool-creator),
[`melis-installer`](/legacy/reference/modules/melis-installer) e os módulos `form-*`.
A sua documentação está congelada em `/legacy/reference/modules/`.
:::

::: tip Explore o código-fonte
Cada módulo reside em `vendor/melisplatform/<module-name>/`. Ler o `config/` e o `src/` de um
módulo é a forma mais rápida de conhecer os seus serviços públicos e convenções.
:::
